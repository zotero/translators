{
	"translatorID": "44552245-d911-4613-8b4f-19f41a5e5b0d",
	"label": "Ariana News",
	"creator": "Abe Jellinek",
	"target": "^https://ariananews\\.af/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-08-16 15:20:38"
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


function detectWeb(doc, _url) {
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
	var rows = doc.querySelectorAll('ul.mvp-blog-story-list li a');
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(text(row, 'h2'));
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
		item.tags = item.tags.filter(tag => tag != 'featured' && tag != 'acci');
		
		if (item.abstractNote) {
			item.abstractNote = item.abstractNote.replace(/^\([^)]+\)/, '');
		}
		
		if (item.creators.length == 1 && item.creators[0].lastName == 'News') {
			item.creators = [];
		}
		
		item.date = attr(doc, '[itemprop="datePublished"]', 'datetime');
		item.publicationTitle = 'Ariana News';
		
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
		"url": "https://ariananews.af/afghan-carpet-industry-facing-major-challenges-acci/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Afghan carpet industry facing major challenges: ACCI",
				"creators": [],
				"date": "2021-07-26",
				"abstractNote": "Afghanistan’s Chamber of Commerce and Investment (ACCI) said on Sunday that the Afghan carpet industry is facing numerous challenges despite the foreign aid that has been injected into the industry. The ACCI said that the lack of a dedicated industrial park and a suitable place to produce carpets are a […]",
				"language": "en-US",
				"libraryCatalog": "ariananews.af",
				"publicationTitle": "Ariana News",
				"shortTitle": "Afghan carpet industry facing major challenges",
				"url": "https://ariananews.af/afghan-carpet-industry-facing-major-challenges-acci/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "carpet"
					},
					{
						"tag": "export"
					},
					{
						"tag": "kabul"
					},
					{
						"tag": "production"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://ariananews.af/us-troops-arrive-in-kabul-to-assist-with-evacuations/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "US troops arrive in Kabul to assist with evacuations",
				"creators": [],
				"date": "2021-08-14",
				"abstractNote": "American troops have flown into Kabul to help evacuate embassy personnel and other civilians in the Afghan capital, a U.S. official said on Saturday, a day after Taliban insurgents seized the country’s second- and third-biggest cities. The Pentagon has said two battalions of Marines and one infantry battalion will arrive […]",
				"language": "en-US",
				"libraryCatalog": "ariananews.af",
				"publicationTitle": "Ariana News",
				"url": "https://ariananews.af/us-troops-arrive-in-kabul-to-assist-with-evacuations/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "attacsk"
					},
					{
						"tag": "doha"
					},
					{
						"tag": "embassy"
					},
					{
						"tag": "peace"
					},
					{
						"tag": "taliban"
					},
					{
						"tag": "troops"
					},
					{
						"tag": "us"
					},
					{
						"tag": "violence"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://ariananews.af/?s=covid",
		"items": "multiple"
	}
]
/** END TEST CASES **/
