{
	"translatorID": "1a27b9e5-2368-470c-9fcd-42cc5093d895",
	"label": "Woocommerce",
	"creator": "Abe Jellinek",
	"target": "/product/[^/]+/([?#].*)?",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 270,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-07-08 20:31:58"
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
	if (doc.body.className.includes('woocommerce-page')) {
		let possibleISBN = findISBN(doc);
		if (possibleISBN) {
			return "book";
		}
	}
	return false;
}

function doWeb(doc, url) {
	let ISBN = findISBN(doc);
	let pageCreators = [...doc.querySelectorAll('.product_author_name')]
		.map(line => ZU.trimInternal(line.innerText));
	
	let search = Zotero.loadTranslator('search');
	search.setSearch({ ISBN });
	search.setHandler('translators', function (_, translators) {
		search.setHandler('itemDone', function (_, item) {
			item.libraryCatalog = doc.location.hostname;
			item.abstractNote = text(doc, '#tab-description p');
			
			for (let creator of item.creators) {
				let { firstName: first, lastName: last } = creator;
				let joinedName = (first ? `${first} ` : '') + (last || '');
				for (let pageCreator of pageCreators) {
					if (pageCreator.includes(joinedName)) {
						if (/\b(photograph|foreword|afterword|preface)/i.test(pageCreator)) {
							creator.creatorType = 'contributor';
						}
						else if (/\bseries editor/i.test(pageCreator)) {
							creator.creatorType = 'seriesEditor';
						}
						else if (/\bedit/i.test(pageCreator)) {
							creator.creatorType = 'editor';
						}
						break;
					}
				}
			}
			
			item.complete();
		});
		
		search.setTranslator(translators);
		search.translate();
	});
	search.getTranslators();
}

function findISBN(doc) {
	let possibleISBN = ZU.cleanISBN(text(doc, 'span[itemprop="sku"]'));
	if (!possibleISBN) {
		possibleISBN = ZU.cleanISBN(text(doc, '[class$="isbn13"] p'));
	}
	if (!possibleISBN) {
		possibleISBN = ZU.cleanISBN(text(doc, '[class$="isbn10"] p'));
	}
	if (!possibleISBN) {
		possibleISBN = ZU.cleanISBN(text(doc, '[class$="isbn"] p'));
	}
	
	return possibleISBN;
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://aucpress.com/product/the-pyramids/",
		"items": [
			{
				"itemType": "book",
				"title": "The pyramids - the archaeology and history of Egypt's iconic monuments",
				"creators": [
					{
						"firstName": "Miroslav",
						"lastName": "Verner",
						"creatorType": "author"
					}
				],
				"date": "2020",
				"ISBN": "9789774169885",
				"abstractNote": "A pyramid, as the posthumous residence of a king and the place of his eternal cult, was just a single, if dominant, part of a larger complex of structures with specific religious, economic, and administrative functions. The first royal pyramid in Egypt was built at the beginning of the Third Dynasty (ca. 2592–2544 BC) by Horus Netjerykhet, later called Djoser, while the last pyramid was the work of Ahmose I, the first king of the Eighteenth Dynasty (ca. 1539–1292 BC).\nNearly two decades have passed since distinguished Egyptologist Miroslav Verner’s seminal The Pyramids was first published. In that time, fresh explorations and new sophisticated technologies have contributed to ever more detailed and compelling discussions around Egypt’s enigmatic and most celebrated of ancient monuments. In this newly revised and updated edition, including color photographs for the first time, Verner brings his rich erudition and long years of site experience to bear on all the latest discoveries and archaeological and historical aspects of over 70 of Egypt’s and Sudan’s pyramids in the broader context of their more than one-thousand-year-long development.\nLucidly written, with 300 illustrations, and filled with gripping insights, this comprehensive study illuminates an era that is both millennia away and vividly immediate.",
				"edition": "New and updated edition",
				"language": "eng",
				"libraryCatalog": "aucpress.com",
				"numPages": "464",
				"place": "Cairo New York",
				"publisher": "The American University in Cairo Press",
				"series": "Dar el Kutub",
				"seriesNumber": "no. 26213",
				"attachments": [],
				"tags": [],
				"notes": [
					{
						"note": "Includes bibliographical references (pages 425-444) and index"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://aucpress.com/product/bilhana/",
		"items": [
			{
				"itemType": "book",
				"title": "Bilhana: wholefood recipes from Egypt, Lebanon, and Morocco",
				"creators": [
					{
						"lastName": "Elgharably",
						"firstName": "Yasmine",
						"creatorType": "author"
					},
					{
						"lastName": "Elgharably",
						"firstName": "Shewekar",
						"creatorType": "author"
					},
					{
						"lastName": "El-Alaily",
						"firstName": "Yehia",
						"creatorType": "contributor"
					}
				],
				"date": "2021",
				"ISBN": "9789774169076",
				"abstractNote": "Middle Eastern cuisine is renowned the world over for its sophistication, variety, and flavor. Bilhana (Egyptian for ‘bon appétit’) brings a contemporary twist to traditional Middle Eastern dishes with the use of healthy cooking methods and the freshest ingredients the region has to offer. Spanning the vast area south of the Mediterranean from the East (Lebanon and Egypt) to the West (Morocco), from simple mezze or breakfast dishes to elaborate stews and roasts, the recipes in this book showcase the vibrant colors and immense variety of Middle Eastern cooking as well as being easy to follow. Included are recipes for Roasted Eggplant with Tahini, Alexandrian Grilled Shrimp, Shakshuka, Moroccan Lamb Stew, Vegan Moussaka, Green Beans in Garlic and Caramelized Onions, Pomegranate and Guava Salad, and much more. Exquisitely illustrated with more than 130 full-color photographs.",
				"extra": "OCLC: 1252782223",
				"language": "English",
				"libraryCatalog": "aucpress.com",
				"shortTitle": "Bilhana",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.popularwoodworking.com/product/the-handcarved-bowl-design-create-custom-bowls-from-scratch/",
		"items": [
			{
				"itemType": "book",
				"title": "The handcarved bowl: design & create custom bowls from scratch",
				"creators": [
					{
						"firstName": "Danielle Rose",
						"lastName": "Byrd",
						"creatorType": "author"
					},
					{
						"firstName": "Peter",
						"lastName": "Galbert",
						"creatorType": "author"
					}
				],
				"date": "2021",
				"ISBN": "9781951217273",
				"abstractNote": "A Fresh Take on Traditional Bowl Carving",
				"edition": "1st",
				"libraryCatalog": "www.popularwoodworking.com",
				"place": "Whites Creek",
				"publisher": "Blue Hills Press",
				"shortTitle": "The handcarved bowl",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
