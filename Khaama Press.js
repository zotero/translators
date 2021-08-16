{
	"translatorID": "dfb58faa-d501-4de8-8e03-ea84ef8986cd",
	"label": "Khaama Press",
	"creator": "Abe Jellinek",
	"target": "^https?://www\\.khaama\\.com/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-08-16 03:29:02"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2021 Abe Jellinek
	
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
	if (doc.body.classList.contains('single')) {
		return "newspaperArticle";
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.blog-posts .blog-title a');
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(row.textContent);
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
			if (items) ZU.processDocuments(Object.keys(items), scrape);
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
		let author = text(doc, '.author-single a');
		if (author != 'Khaama Press' && author != 'خامه پرس'
			&& author != 'khaama') {
			item.creators.push(ZU.cleanAuthor(author, 'author'));
		}
		
		item.abstractNote = '';
		item.tags = [];
		
		item.complete();
	});

	translator.getTranslatorObject(function (trans) {
		trans.itemType = "newspaperArticle";
		trans.doWeb(doc, url);
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.khaama.com/afghan-president-leaves-country-taliban-directed-to-enter-kabul-5645646/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Afghan President leaves country, Taliban directed to enter Kabul",
				"creators": [
					{
						"firstName": "Najibullah",
						"lastName": "Lalzoy",
						"creatorType": "author"
					}
				],
				"date": "2021-08-15T14:18:09+00:00",
				"language": "en-US",
				"libraryCatalog": "www.khaama.com",
				"publicationTitle": "The Khaama Press News Agency",
				"section": "Afghanistan",
				"url": "https://www.khaama.com/afghan-president-leaves-country-taliban-directed-to-enter-kabul-5645646/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
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
		"url": "https://www.khaama.com/pashto-singer-abdullah-muquri-dies-of-covid-19-89798/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Pashto singer Abdullah Muquri is alive, his death news is false",
				"creators": [],
				"date": "2021-06-14T06:10:43+00:00",
				"language": "en-US",
				"libraryCatalog": "www.khaama.com",
				"publicationTitle": "The Khaama Press News Agency",
				"section": "Afghanistan",
				"url": "https://www.khaama.com/pashto-singer-abdullah-muquri-dies-of-covid-19-89798/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
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
		"url": "https://www.khaama.com/pashto/archives/39632",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "اردوغان وايي، د افغان سولې لپاره به خپلې هڅې چټکې کړي",
				"creators": [],
				"date": "2021-08-12T04:22:02+00:00",
				"language": "ps",
				"libraryCatalog": "www.khaama.com",
				"publicationTitle": "خامه پرس پښتو",
				"section": "افغانستان",
				"url": "https://www.khaama.com/pashto/archives/39632",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
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
		"url": "https://www.khaama.com/persian/archives/92013",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "همبستگی در کابل آشفته‌گی در اسلام‌آباد؛ عمران خان در نقش سخن‌گوی طالبان از غنی خواست کنار برود",
				"creators": [],
				"date": "2021-08-12T04:18+00:00",
				"language": "fa-IR",
				"libraryCatalog": "www.khaama.com",
				"publicationTitle": "خبرگزاری خامه پرس – فارسی",
				"url": "https://www.khaama.com/persian/archives/92013",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
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
		"url": "https://www.khaama.com/compromise-on-the-supremacy-of-afghan-constitution-and-creation-of-the-national-unity-government-in-afghanistan-in-2014/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Compromise on the Supremacy of Constitution in Afghanistan and Creation the Post of Chief Executive after 2014 Presidential Election",
				"creators": [
					{
						"firstName": "Mohammad Tahir Khan",
						"lastName": "Nasiri",
						"creatorType": "author"
					}
				],
				"date": "2021-06-19T02:22:15+00:00",
				"language": "en-US",
				"libraryCatalog": "www.khaama.com",
				"publicationTitle": "The Khaama Press News Agency",
				"section": "Afghanistan",
				"url": "https://www.khaama.com/compromise-on-the-supremacy-of-afghan-constitution-and-creation-of-the-national-unity-government-in-afghanistan-in-2014/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
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
		"url": "https://www.khaama.com/category/elections/",
		"items": "multiple"
	}
]
/** END TEST CASES **/
