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
	"lastUpdated": "2016-04-04 13:06:56"
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
		return "multiple";
	} else if (url.indexOf('/newspaper/article') != -1) {
		return "newspaperArticle";
	} else if (url.indexOf('/work/') != -1) {
		return "document";
	}
}

function getSearchResults(doc, url) {
	var items = {};
	var results;
	if (url.indexOf('/result?') != -1) {
		results = ZU.xpath(doc, "//div[@id='mainresults']//li/dl/dt/a");
	} else if (url.indexOf('/newspaper/page') != -1) {
		results = ZU.xpath(doc, "//ol[@class='list-unstyled articles']/li/h4/a");
	}
	for (var i=0; i<results.length; i++) {
		var url = results[i].href;
		var title = ZU.trimInternal(results[i].textContent);
		items[url] = title;
	}
	return items;
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
	// There's a BibTex citation embedded in the page, seems like the easiest way to get the details.

	var bibtex = ZU.xpathText(doc, "//textarea[@id='bibtex-citation']");

	var translator = Zotero.loadTranslator("import");
	translator.setTranslator("9cb70025-a888-4a29-a210-93ec52da40d4");
	translator.setString(bibtex);

	// Clean up the BibTex results and add some extra stuff.

	translator.setHandler("itemDone", function (obj, item) {
		var articleID = item.url.match(/nla\.news-article\d+/)[0];
		item.itemType = 'newspaperArticle';
		item.abstractNote = ZU.xpathText(doc, "//meta[@property='og:description']/@content");
		delete item.type;
		delete item.itemID;

		// Attaching a PDF is a 2 stage process.
		// First you need to tell the service to start generating the PDF.
		// You get back a hash id to include in the PDF url.

		var renditionURL = "/newspaper/rendition/"
		var prepURL = renditionURL + articleID + '/level/3/prep'

		ZU.HTTP.doGet(prepURL, function(hashID) {

			// It takes some time to generate the pdfs after the prep call.
			// You can ping the service to see if the PDF is ready,
			// but when I tried this I was denied permission to the statusText of the response object 
			// which is necessary because statusText == 'Locked' if the PDF isn't ready.
			// So I took out the ping call completely and just put in a 5 second pause which seems to work ok.
			// Note that the service itself uses a 5 second delay if the ping fails.

			var timeout = Date.now() + 5000;
			while (Date.now() < timeout){}
			item.attachments.push({url: renditionURL + articleID + '.3.pdf?followup=' + hashID, title: 'Trove newspaper PDF', mimeType:'application/pdf'});

			// Get the OCRd text and save in a note.
			var textURL = renditionURL + articleID + '.txt';
			ZU.HTTP.doGet(textURL, function(text) {
				item.notes.push({note: text.trim()});
				item.complete();
			});

		});
	});
	translator.translate();	
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
}
	

function checkType(string) {
	types = string.split("; ");
	newString = types.join(" ");
	if (newString in troveTypes) {
		return troveTypes[newString];
	} else {
		while (types.length > 0) {
			types.pop();
			newString = types.join(" ");
			if (newString in troveTypes) {
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
		creator.firstName = creator.firstName.replace(/\(?\d{4}-\d{0,4}\)?,?/, "").trim()
		newCreators.push(creator);
	}
	return newCreators
}

function scrapeWork(doc, url) {
	var thumbnailURL;

	// Remove all params from url
	var workURL = url.slice(0, url.indexOf('?'));
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

			// This gives a better version-aware url.
			item.url = ZU.xpathText(doc, "//meta[@property='og:url']/@content");
			item.abstractNote = ZU.xpathText(doc, "//meta[@property='og:description']/@content");
			delete item.itemID;
			delete item.type;
			if (thumbnailURL !== null) {
				item.attachments.push({url: thumbnailURL, title: 'Trove thumbnail image', mimeType:'image/jpeg'});
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
		"url": "http://trove.nla.gov.au/version/208674371",
		"items": [
			{
				"itemType": "artwork",
				"title": "THIRROUL - Hotels - Rex Hotel",
				"creators": [
					{
						"firstName": "William A. (William Alan)",
						"lastName": "Bayley",
						"creatorType": "author"
					}
				],
				"date": "1960",
				"abstractNote": "Thirroul Hotels REX HOTEL ca. 1956 1950-1960 Illawarra Region",
				"libraryCatalog": "Trove",
				"url": "http://trove.nla.gov.au/version/208674371",
				"attachments": [
					{
						"title": "Trove thumbnail image",
						"mimeType": "image/jpeg"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
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
		"url": "http://nla.gov.au/nla.news-article70068753",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "'WRAGGE.'",
				"creators": [],
				"date": "07 Feb 1903",
				"abstractNote": "We have received a copy of the above which is a journal devoted chiefly to the science of meteorology. It is owned and conducted by Mr. Clement ...",
				"libraryCatalog": "Trove",
				"pages": "4",
				"place": "Victoria, Australia",
				"publicationTitle": "Sunbury News",
				"url": "http://nla.gov.au/nla.news-article70068753",
				"attachments": [
					{
						"title": "Trove newspaper PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
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