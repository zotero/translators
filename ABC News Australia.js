{
	"translatorID": "92d45016-5f7b-4bcf-bb63-193033f02f2b",
	"label": "ABC News Australia",
	"creator": "Joyce Chia",
	"target": "https?://(www\\.)?abc\\.net\\.au/news/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-07-23 00:29:10"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2020-2021 Joyce Chia
	
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


function detectWeb(doc, _url) {
	let contentType = attr(doc, 'meta[property="ABC.ContentType"]', 'content');
	if (contentType == 'CMChannel' && getSearchResults(doc, true)) {
		return 'multiple';
	}
	else if (contentType == 'Video') {
		return 'videoRecording';
	}
	else if (contentType == 'Article') {
		return 'newspaperArticle';
	}
	return false;
}


function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('h3 a');
	for (var i = 0; i < rows.length; i++) {
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
			if (!items) return;
			ZU.processDocuments(Object.keys(items), scrape);
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
		item.language = "en-AU";
		// og:url does not preserve https prefixes, so use canonical link until fixed
		var canonical = doc.querySelector('link[rel="canonical"]');
		if (canonical) {
			item.url = canonical.href;
		}
		
		if (item.itemType == 'videoRecording') {
			item.studio = "ABC News"; // i guess this is correct...
		}
		else {
			item.publicationTitle = "ABC News";
		}
		
		item.language = "en-AU";
		
		if (item.date) {
			item.date = ZU.strToISO(item.date);
		}
		else {
			item.date = ZU.strToISO(attr(doc, 'time', 'datetime'));
		}
		
		var authors = text(doc, '[data-component="Byline"] p');
		if (authors && item.creators.length <= 1) {
			authors = authors.replace(/^By /, '');
			if (authors == authors.toUpperCase()) { // convert to title case if all caps
				authors = ZU.capitalizeTitle(authors, true);
			}
			item.creators = [];
			var authorsList = authors.split(/,|\band\b/);
			for (let i = 0; i < authorsList.length; i++) {
				item.creators.push(ZU.cleanAuthor(authorsList[i], "author"));
			}
		}
		
		item.complete();
	});

	translator.getTranslatorObject(function (trans) {
		trans.itemType = detectWeb(doc, url);
		trans.doWeb(doc, url);
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.abc.net.au/news/2020-05-22/nt-government-coronavirus-recovery-commission-michael-gunner/12276832?section=politics",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "NT 'uniquely positioned' to solve Australia's economic woes post-COVID-19, says Chief Minister",
				"creators": [
					{
						"firstName": "Lauren",
						"lastName": "Roberts",
						"creatorType": "author"
					}
				],
				"date": "2020-05-22",
				"abstractNote": "The NT Labor Government establishes a new commission to help it financially recover from the coronavirus pandemic, with the former opposition leader and a former chief minister in key roles.",
				"language": "en-AU",
				"libraryCatalog": "www.abc.net.au",
				"publicationTitle": "ABC News",
				"url": "https://www.abc.net.au/news/2020-05-22/nt-government-coronavirus-recovery-commission-michael-gunner/12276832",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "chief minister michael gunner"
					},
					{
						"tag": "coronavirus budget"
					},
					{
						"tag": "nt budget"
					},
					{
						"tag": "parliament house"
					},
					{
						"tag": "territory economic reconstruction commission"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.abc.net.au/news/2021-07-23/tracey-holmes-on-the-ground-in-tokyo/13467310",
		"items": [
			{
				"itemType": "videoRecording",
				"title": "Tracey Holmes on the ground in Tokyo",
				"creators": [
					{
						"firstName": "Tracey",
						"lastName": "Holmes",
						"creatorType": "author"
					}
				],
				"date": "2021-07-22",
				"abstractNote": "Brisbane is named the host of the 2032 Olympics, Tracey speaks with Federal Sports Minister Richard Colbeck to get his reaction. Plus we look at the COVID safety measures athletes, officials and the media are subjected to as they land in the Japanese capital.",
				"language": "en-AU",
				"libraryCatalog": "www.abc.net.au",
				"studio": "ABC News",
				"url": "https://www.abc.net.au/news/2021-07-23/tracey-holmes-on-the-ground-in-tokyo/13467310",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "olympics"
					},
					{
						"tag": "tokyo olympics 2021"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
