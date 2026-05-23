{
	"translatorID": "513a53f5-b95e-4df6-a03e-3348d9ec9f44",
	"label": "Internet Archive Wayback Machine",
	"creator": "Sean Takats, Philipp Zumstein",
	"target": "^https?://web\\.archive\\.org/web/",
	"minVersion": "1.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-06-09 19:05:33"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2008 Sean Takats

	This file is part of Zotero.

	Zotero is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	Zotero is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
	GNU Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public License
	along with Zotero. If not, see <http://www.gnu.org/licenses/>.

	***** END LICENSE BLOCK *****
*/


function detectWeb(doc, url) {
	if (url.match(/\/web\/\d{14}\/http/)) {
		return "webpage";
	}
	if (getSearchResults(doc, true)) {
		return "multiple";
	}
	else if (url.includes('/web/*/')) {
		Z.monitorDOMChanges(doc.querySelector('#react-wayback-search'));
	}
	return false;
}


function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.result-item-heading>a');
	for (let i = 0; i < rows.length; i++) {
		var href = rows[i].href;
		var title = ZU.trimInternal(rows[i].textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}


function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (!items) {
				return;
			}
			var articles = [];
			for (let i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, scrape);
		});
	}
	else {
		scrape(doc, url);
	}
}


function scrape(doc, url) {
	var translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);

	translator.setHandler('itemDone', function (obj, item) {
		try {
			// Set access date to the date the website was archived
			var urlRegEx = url.match(/\/web\/(\d{4})(\d{2})(\d{2})\d{6}\/(http.*)$/);
			if (urlRegEx) {
				item.accessDate = [urlRegEx[1], urlRegEx[2], urlRegEx[3]].join('-');
			}
			// Set url to original url, not the archived one
			if (urlRegEx[4]) {
				item.url = urlRegEx[4];
			}

			var pdfUrl = attr('#playback', 'src');
			// if snapshot is pdf, attach it
			// e.g. https://web.archive.org/web/20180316005456/https://www.foxtel.com.au/content/dam/foxtel/support/pdf/channel-packs.pdf
			if (url.endsWith(".pdf") && pdfUrl) {
				item.attachments = [{
					mimeType: "application/pdf",
					title: "PDF Snapshot",
					url: pdfUrl
				}];
			}
			else {
				// create snapshot
				item.attachments = [{
					url: doc.location.href,
					title: "Snapshot",
					mimeType: "text/html"
				}];
			}
		}
		catch (e) {
			Z.debug(e);
		}

		item.complete();
	});

	translator.getTranslatorObject(function (trans) {
		trans.doWeb(doc, url);
	});
}


/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://web.archive.org/web/20110310073553/http://www.taz.de/",
		"items": [
			{
				"creators": [
					{
						"firstName": "taz, die",
						"lastName": "tageszeitung",
						"creatorType": "author"
					}
				],
				"tags": [
					{
						"tag": "taz.de",
						"type": 1
					},
					{
						"tag": "taz",
						"type": 1
					},
					{
						"tag": "tageszeitung",
						"type": 1
					},
					{
						"tag": "Nachrichten",
						"type": 1
					},
					{
						"tag": "Schlagzeilen",
						"type": 1
					}
				],
				"url": "http://www.taz.de/",
				"title": "taz.de",
				"abstractNote": "Das große linke Nachrichten-Portal der \"tageszeitung\" aus Berlin: Unabhängig dank mehr als 10.000 Genossen.",
				"language": "de",
				"accessDate": "2011-03-10",
				"itemType": "webpage",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				]
			}
		]
	},
	{
		"type": "web",
		"url": "https://web.archive.org/web/20160325112502/http://www.nytimes.com/2015/12/18/upshot/rich-children-and-poor-ones-are-raised-very-differently.html",
		"items": [
			{
				"itemType": "webpage",
				"creators": [
					{
						"firstName": "Claire Cain",
						"lastName": "Miller",
						"creatorType": "author"
					}
				],
				"tags": [
					{
						"tag": "Pew Research Center",
						"type": 1
					},
					{
						"tag": "Children and Childhood",
						"type": 1
					},
					{
						"tag": "United States",
						"type": 1
					},
					{
						"tag": "Income Inequality",
						"type": 1
					},
					{
						"tag": "Parenting",
						"type": 1
					},
					{
						"tag": "Polls and Public Opinion",
						"type": 1
					},
					{
						"tag": "Research",
						"type": 1
					},
					{
						"tag": "Education (K-12)",
						"type": 1
					}
				],
				"title": "Class Differences in Child-Rearing Are on the Rise",
				"url": "https://www.nytimes.com/2015/12/18/upshot/rich-children-and-poor-ones-are-raised-very-differently.html",
				"abstractNote": "Children grow up learning the skills to succeed in their socioeconomic stratum, but not necessarily others, which can deepen class divisions.",
				"date": "2015-12-17",
				"language": "en",
				"accessDate": "2016-03-25",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				]
			}
		]
	},
	{
		"type": "web",
		"url": "https://web.archive.org/web/*/zotero",
		"defer": true,
		"items": "multiple"
	}
]
/** END TEST CASES **/
