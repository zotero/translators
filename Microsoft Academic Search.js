{
	"translatorID": "91c7b393-af05-476c-ae72-ae244d2347f4",
	"label": "Microsoft Academic Search",
	"creator": "Aurimas Vinckevicius",
	"target": "https?://[^/]*academic\\.research\\.microsoft\\.com",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsbv",
	"lastUpdated": "2012-04-11 00:40:43"
}

/**
	Copyright (c) 2012 Aurimas Vinckevicius
	
	This program is free software: you can redistribute it and/or
	modify it under the terms of the GNU Affero General Public License
	as published by the Free Software Foundation, either version 3 of
	the License, or (at your option) any later version.
	
	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
	Affero General Public License for more details.
	
	You should have received a copy of the GNU Affero General Public
	License along with this program. If not, see
	<http://www.gnu.org/licenses/>.
*/

function getSearchResults(doc) {
	if(!getSearchResults.results) {
		getSearchResults.results = ZU.xpath(doc,
			'//div[@id="ctl00_divCenter"]//li[@class="paper-item"]\
			//a[substring(@id, string-length(@id)-5)="_Title"]');
	}

	return getSearchResults.results;
}

function scrape(doc, url) {
	var pubID = url.match(/\/Publication\/(\d+)/)[1];
	var exportUrl = 'http://academic.research.microsoft.com/' + pubID +
			'.bib?type=2&format=0';

	//fetch attachments
	var attachments = ZU.xpath(doc, '//ul[@id="downloadList"]//li');
	var type, location, link, att = new Array();
	var pdffound = false;
	for(var i=0, n=attachments.length; i<n; i++) {
		type = attachments[i].getElementsByTagName('img');
		if(type.length) {
			type = type[0].src;
		} else {
			type = '';
		}
		type = type.match(/\/([a-z]+)_small\.png$/i);
		if(!type) continue;

		location = attachments[i].getElementsByTagName('a');
		if(!location.length) continue;
		link = location[1].href;
		location = location[1].textContent.trim();

		switch(type[1].toLowerCase()) {
			case 'pdf':
				if(!pdffound) {
					att.push({
						title: 'PDF from ' + location,
						url: link,
						mimeType: 'application/pdf'
					});
					pdffound = true;
				} else {
					att.push({
						title: 'Link to PDF at ' + location,
						url: link,
						mimeType: 'text/html',
						snapshot: false
					});
				}
			break;
		/*	case 'downloadpage':
				att.push({
					title: 'Snapshot',
					url: attachments[i].href,
					mimeType: 'text/html',
					snapshot: true
				});
			break;
		*/	default:
				att.push({
					title: 'Link to page at ' + location,
					url: link,
					mimeType: 'text/html',
					snapshot: false
				});
		}
	}

	//grab keywords
	var keywords = ZU.xpath(doc, '//div[@class="section-wrapper"]\
			[.//span[@id="ctl00_LeftPanel_RelatedKeywords_spHeader"]]/ul/li');
	var tags = new Array();
	for(var i=0, n=keywords.length; i<n; i++) {
		tags.push(keywords[i].textContent.trim());
	}

	ZU.doGet(exportUrl, function(text) {
		var translator = Zotero.loadTranslator('import');
		//BibTeX
		translator.setTranslator('9cb70025-a888-4a29-a210-93ec52da40d4');
		translator.setString(text);

		translator.setHandler('itemDone', function(obj, item) {
			item.attachments = att;
			item.tags = tags;
			item.complete();
		})

		translator.translate();
	});
}

function detectWeb(doc, url) {
	if(url.indexOf('/Search?') != -1 &&
		url.match(/[&?]query=[^&]+/) &&
		getSearchResults(doc).length) {
		return 'multiple';
	}

	if(url.match(/\/Publication\/(\d+)/)) {
		return 'journalArticle';
	}
}

function doWeb(doc, url) {
	if(detectWeb(doc, url) == 'multiple') {
		var results = getSearchResults(doc);
		var items = new Object();
		for(var i=0, n=results.length; i<n; i++) {
			items[results[i].href] = results[i].textContent;
		}
		Zotero.selectItems(items, function(selectedItems) {
			if(!selectedItems) return true;

			var urls = new Array();
			for(var i in selectedItems) {
				urls.push(i);
			}
			ZU.processDocuments(urls, function(doc) {
				scrape(doc, doc.location.href);
			});
		});
	} else {
		scrape(doc, url);
	}
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://academic.research.microsoft.com/Publication/13366371/out-of-cite-how-reference-managers-are-taking-research-to-the-next-level",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Jason",
						"lastName": "Muldrow",
						"creatorType": "author"
					},
					{
						"firstName": "Stephen",
						"lastName": "Yoder",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"Indexation",
					"Research Method",
					"Time Change"
				],
				"seeAlso": [],
				"attachments": false,
				"issue": "01",
				"DOI": "10.1017/S1049096509090337",
				"libraryCatalog": "Microsoft Academic Search",
				"title": "Out of Cite! How Reference Managers Are Taking Research to the Next Level",
				"publicationTitle": "Ps-political Science & Politics",
				"volume": "42",
				"date": "2009"
			}
		]
	},
	{
		"type": "web",
		"url": "http://academic.research.microsoft.com/Search?query=zotero",
		"items": "multiple"
	}
]
/** END TEST CASES **/