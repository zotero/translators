{
	"translatorID": "8efcb7cb-4180-4555-969a-08e8b34066c4",
	"label": "Trove",
	"creator": "Tim Sherratt",
	"target": "^https?://trove\\.nla\\.gov\\.au/(?:newspaper|gazette|work|book|article|picture|music|map|collection)/",
	"minVersion": "2.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsbv",
	"lastUpdated": "2016-05-14 03:57:41"
}

/*
   Trove Translator
   Copyright (C) 2016 Tim Sherratt (tim@discontents.com.au, @wragge)

   This program is free software: you can redistribute it and/or modify
   it under the terms of the GNU Affero General Public License as published by
   the Free Software Foundation, either version 3 of the License, or
   (at your option) any later version.

   This program is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU Affero General Public License for more details.

   You should have received a copy of the GNU Affero General Public License
   along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

function detectWeb(doc, url) {
	if (url.indexOf('/result?') != -1 || url.indexOf('/newspaper/page') != -1) {
		return getSearchResults(doc, url, true) ? 'multiple' : false;
	} else if (url.indexOf('/newspaper/article') != -1) {
		return "newspaperArticle";
	} else if (url.indexOf('/work/') != -1) {
		return "book";
	}
}

function getSearchResults(doc, url, checkOnly) {
	var items = {};
	var results;
	var found = false;
	if (url.indexOf('/result?') != -1) {
		results = ZU.xpath(doc, "//div[@id='mainresults']//li/dl/dt/a");
	} else if (url.indexOf('/newspaper/page') != -1) {
		results = ZU.xpath(doc, "//ol[@class='list-unstyled articles']/li/h4/a");
	}
	for (var i=0; i<results.length; i++) {
		var link = results[i].href;
		var title = ZU.trimInternal(results[i].textContent);
		if (!title || !link) continue;
		if (checkOnly) return true;
		found = true;
		items[link] = title;
	}
	return found ? items : false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		Zotero.selectItems(getSearchResults(doc, url), function (items) {
			if (!items) {
				return true;
			}
			var urls = [];
			for (var i in items) {
				urls.push(i);
			}
			ZU.processDocuments(urls, scrape);
		});
	} else {
		scrape(doc, url);
	}

}

function scrape(doc, url) {
	if (url.indexOf('/newspaper/article/') != -1) {
		scrapeNewspaper(doc, url);
	} else {
		scrapeWork(doc, url);
	}
}

function scrapeNewspaper(doc, url) {

	var articleID = url.match(/newspaper\/article\/(\d+)/)[1];
	var bibtexURL = "http://trove.nla.gov.au/newspaper/citations/bibtex-article-" + articleID + ".bibtex";

	ZU.HTTP.doGet(bibtexURL, function(bibtex) {
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("9cb70025-a888-4a29-a210-93ec52da40d4");
		translator.setString(bibtex);

		// Clean up the BibTex results and add some extra stuff.
		translator.setHandler("itemDone", function (obj, item) {
			item.itemType = 'newspaperArticle';
			item.abstractNote = ZU.xpathText(doc, "//meta[@property='og:description']/@content");
			item.pages = item.numPages;
			delete item.numPages;
			delete item.type;
			delete item.itemID;

			// Add tags
			var tags = ZU.xpath(doc, "//ul[contains(@class,'nlaTagContainer')]/li");
			for (var i = 0; i < tags.length; i++) {
				tag = ZU.xpathText(tags[i], "a");
				item.tags.push(tag);
			}

			// I've created a proxy server to generate the PDF and return the URL without locking up the browser.
			var proxyURL = "http://trove-proxy.herokuapp.com/pdf/" + articleID;
			ZU.HTTP.doGet(proxyURL, function(pdfURL) {
				item.attachments.push({
					url: pdfURL, 
					title: 'Trove newspaper PDF', 
					mimeType:'application/pdf'});

				// Get the OCRd text and save in a note.
				var textURL = "http://trove.nla.gov.au/newspaper/rendition/nla.news-article" + articleID + ".txt";
				ZU.HTTP.doGet(textURL, function(text) {
					item.notes.push({
						note: text.trim()
					});
					item.complete();
				});

			});
		});
	translator.translate();	
	});
}

var troveTypes = {
	"Book": "book",
	"Article Article/Book chapter": "bookSection",
	"Thesis": "thesis",
	"Archived website": "webpage",
	"Conference Proceedings": "book",
	"Audio book": "book",
	"Article": "journalArticle",
	"Article Article/Journal or magazine article": "journalArticle",
	"Article Article/Conference paper": "conferencePaper",
	"Article Article/Report": "report",
	"Photograph": "artwork",
	"Poster, chart, other": "artwork",
	"Art work": "artwork",
	"Object": "artwork",
	"Microform Photograph": "artwork",
	"Microform Object": "artwork",
	"Sound": "audioRecording",
	"Video": "videoRecording",
	"Printed music": "book",
	"Map": "map",
	"Unpublished": "manuscript",
	"Published": "document"
};
	

function checkType(string) {
	var types = string.split("; ");
	var newString = types.join(" ");
	if (troveTypes.hasOwnProperty(newString)) {
		return troveTypes[newString];
	} else {
		while (types.length > 0) {
			types.pop();
			newString = types.join(" ");
			if (troveTypes.hasOwnProperty(newString)) {
				return troveTypes[newString];
			}

		}
	}
	return "book";
}

function cleanCreators(creators) {
	newCreators = [];
	for (var i = 0; i < creators.length; i++) {
		var creator = creators[i];
		creator.firstName = creator.firstName.replace(/\(?\d{4}-\d{0,4}\)?,?/, "").trim();
		newCreators.push(creator);
	}
	return newCreators;
}

function scrapeWork(doc, url) {
	var thumbnailURL;

	// Remove all params from url
	var workURL = url.replace(/[?#].*/, '');
	var bibtexURL = workURL + '?citationFormat=BibTeX';

	// Need to get version identifier for the BibText url
	var versionID = doc.body.innerHTML.match(/displayCiteDialog\(\'(.+?)\'/);
	if (versionID !== null) {
		bibtexURL += '&selectedversion=' + versionID[1];
		thumbnailURL = ZU.xpathText(doc, "//a/img[@class='mosaic ui-shdw']/@src");
	} else {
		// It's a work -- so thumbnails are different
		thumbnailURL = ZU.xpathText(doc, "//li[@class='imgfirst']//img/@src");
	}

	// Get the BibTex and feed it to the translator.
	ZU.HTTP.doGet(bibtexURL, function(bibtex) {
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("9cb70025-a888-4a29-a210-93ec52da40d4");
		translator.setString(bibtex);
		translator.setHandler("itemDone", function (obj, item) {
			item.itemType = checkType(item.type);
			item.creators = cleanCreators(item.creators);

			// Attach a link to the contributing repository if available
			if (item.hasOwnProperty('url')) {
				item.attachments.push({
					title: "Record from contributing repository",
					url: item.url,
					mimeType: 'text/html',
					snapshot: false
				})
			}

			// This gives a better version-aware url.
			item.url = ZU.xpathText(doc, "//meta[@property='og:url']/@content");
			item.abstractNote = ZU.xpathText(doc, "//meta[@property='og:description']/@content");
			delete item.itemID;
			delete item.type;

			// Add tags
			tags = ZU.xpath(doc, "//div[@id='tagswork']/ul/li");
			for (var i = 0; i < tags.length; i++) {
				tag = ZU.xpathText(tags[i], "a");
				item.tags.push(tag);
			}

			if (thumbnailURL !== null) {
				item.attachments.push({
					url: thumbnailURL, 
					title: 'Trove thumbnail image', 
					mimeType:'image/jpeg'
				});
			}
			item.complete();
		});
		translator.translate();
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://trove.nla.gov.au/version/11567057",
		"items": [
			{
				"itemType": "book",
				"title": "Experiences of a meteorologist in South Australia",
				"creators": [
					{
						"firstName": "Clement L. (Clement Lindley)",
						"lastName": "Wragge",
						"creatorType": "author"
					}
				],
				"date": "1980",
				"ISBN": "9780908065073",
				"abstractNote": "In 14 libraries. 24 p. : ill. ; 22 cm. Wragge, Clement L. (Clement Lindley), 1852-1922. South Australia. Climate, 1883-1884. Meteorologists -- South Australia -- Biography. South Australia -- Climate -- History.",
				"extra": "Reprinted from Good words for 1887/ edited by Donald Macleod, published: London: Isbister and Co",
				"language": "English",
				"libraryCatalog": "Trove",
				"publisher": "Warradale, S.Aust. : Pioneer Books",
				"url": "http://trove.nla.gov.au/version/11567057",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://trove.nla.gov.au/newspaper/article/70068753",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "'WRAGGE.'",
				"creators": [],
				"date": "7 Feb 1903",
				"abstractNote": "We have received a copy of the above which is a journal devoted chiefly to the science of meteorology. It is owned and conducted by Mr. Clement ...",
				"libraryCatalog": "Trove",
				"pages": "4",
				"place": "Vic.",
				"publicationTitle": "Sunbury News (Vic. : 1900 - 1910)",
				"url": "http://nla.gov.au/nla.news-article70068753",
				"attachments": [
					{
						"title": "Trove newspaper PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					"Meteorology Journal - Clement Wragge"
				],
				"notes": [
					{
						"note": "'WRAGGE' - we have received a copy of the above, which is a journal devoted chiefly to the science of meteorology. It is owned and conducted by Mr. Clement Wragge."
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://trove.nla.gov.au/newspaper/result?l-australian=y&q=wragge",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://trove.nla.gov.au/book/result?l-australian=y&q=wragge",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://trove.nla.gov.au/newspaper/page/7013947",
		"items": "multiple"
	}
]
/** END TEST CASES **/