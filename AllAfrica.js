{
	"translatorID": "34B1E0EA-FD02-4069-BAE4-ED4D98674A5E",
	"label": "AllAfrica",
	"creator": "Sebastian Karcher and Abe Jellinek",
	"target": "^https?://(fr\\.)?allafrica\\.com/(stories|search)/",
	"minVersion": "1.0.0b4.r5",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsv",
	"lastUpdated": "2021-10-22 19:33:08"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2021 Sebastian Karcher and Abe Jellinek
	
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
	if (url.includes('/stories/')) {
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
	var rows = doc.querySelectorAll('ul.stories li > a');
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
		let publication = text(doc, '.publisher-name');
		if (publication) {
			item.publicationTitle = publication.match(/[^(]+/)[0];
			item.place = (publication.match(/\((.*)\)/) || [])[1];
		}
		
		item.libraryCatalog = 'AllAfrica';
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
		"url": "https://allafrica.com/stories/201110180002.html",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Angola: Political Upheaval Ahead of 2012 Polls",
				"creators": [
					{
						"firstName": "Lisa",
						"lastName": "Otto",
						"creatorType": "author"
					}
				],
				"date": "2011-10-18T02:24:01+0000",
				"abstractNote": "Analysis - Angola is due to hold presidential and parliamentary elections next year, and all indications are that tensions are mounting amidst varied incidents of political upheaval ahead of the polls.",
				"language": "en",
				"libraryCatalog": "AllAfrica",
				"place": "Tshwane/Pretoria",
				"publicationTitle": "Institute for Security Studies",
				"section": "News",
				"shortTitle": "Angola",
				"url": "https://allafrica.com/stories/201110180002.html",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Angola"
					},
					{
						"tag": "Central Africa"
					},
					{
						"tag": "Governance"
					},
					{
						"tag": "Human Rights"
					},
					{
						"tag": "Southern Africa"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://allafrica.com/stories/201110040606.html",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Angola: Justice Minister On Voter's Registration Update",
				"creators": [],
				"date": "2011-10-04T09:49:38+0000",
				"abstractNote": "The updating of the electoral registration means the fulfillment of an obligation of each citizens so the process is well organised with regard to voting stations, Angop has learnt.",
				"language": "en",
				"libraryCatalog": "AllAfrica",
				"place": "Luanda",
				"publicationTitle": "Angola Press Agency",
				"section": "News",
				"shortTitle": "Angola",
				"url": "https://allafrica.com/stories/201110040606.html",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Angola"
					},
					{
						"tag": "Central Africa"
					},
					{
						"tag": "Governance"
					},
					{
						"tag": "Southern Africa"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://allafrica.com/search/?search_string=microcredits",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://allafrica.com/stories/202110220312.html",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Kenya Surpasses Global Average of Female Board Directors",
				"creators": [
					{
						"firstName": "Kamau",
						"lastName": "Maichuhie",
						"creatorType": "author"
					}
				],
				"date": "2021-10-22T08:59:56+0000",
				"abstractNote": "Kenya has outperformed the global average of female board directors after witnessing significant progress in board diversity and inclusion in the last nine years, a new report shows.",
				"language": "en",
				"libraryCatalog": "AllAfrica",
				"place": "Nairobi",
				"publicationTitle": "The Nation",
				"section": "News",
				"url": "https://allafrica.com/stories/202110220312.html",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "East Africa"
					},
					{
						"tag": "Kenya"
					},
					{
						"tag": "Women and Gender"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://fr.allafrica.com/stories/202110210703.html",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Afrique: Le Parlement européen adopte la résolution sur la Tunisie",
				"creators": [],
				"date": "2021-10-21T16:15:11+0000",
				"abstractNote": "Le Parlement européen a adopté, jeudi après-midi, la résolution sur la situation en Tunisie par 534 voix pour, 45 contre et 106 abstentions.",
				"language": "fr",
				"libraryCatalog": "AllAfrica",
				"place": "Tunis",
				"publicationTitle": "Tunis Afrique Presse",
				"section": "News",
				"shortTitle": "Afrique",
				"url": "https://fr.allafrica.com/stories/202110210703.html",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Africa"
					},
					{
						"tag": "Europe and Africa"
					},
					{
						"tag": "External Relations"
					},
					{
						"tag": "Governance"
					},
					{
						"tag": "North Africa"
					},
					{
						"tag": "Tunisia"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
