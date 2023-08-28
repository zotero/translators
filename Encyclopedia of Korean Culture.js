{
	"translatorID": "dc879929-ae39-45b3-b49b-dab2c80815ab",
	"label": "Encyclopedia of Korean Culture",
	"creator": "jacoblee36251",
	"target": "^https?://(www.)?encykorea.aks.ac.kr/Article/E\\d{7}(#.*)?",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-08-28 00:04:42"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2023 jacoblee36251
	
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

function text(docOrElem, selector, index) {
	var elem = index ? docOrElem.querySelectorAll(selector).item(index) : docOrElem.querySelector(selector);
	return elem ? elem.textContent : null;
}

function detectWeb(doc, url) {
	return 'encyclopediaArticle';
}

function doWeb(doc, url) {
	scrape(doc, url);
}

function scrape(doc, url) {
	item = new Zotero.Item('encyclopediaArticle');

	// Title initially formatted: hangulName(hanjaName); adding space between
	item.title = doc.title.split(' - ')[0].replace('(', ' (');
	item.encyclopediaTitle = "Encyclopedia of Korean Culture";
	item.publisher = "Academy of Korean Studies";
	item.language = "ko";
	item.url = url;

	// Author processing; may be 0 or more names, would be in Korean
	var authors = doc.querySelector('div[class="author-wrap"] > span');

	if (authors) {
		authors = authors.textContent;
		// For simplicity, assume one character surnames for everybody (there are rare exceptions)
		for (let author of authors.split('·')) {
			item.creators.push({
				"lastName": author[0],
				"firstName": author.slice(1),
				"creatorType": "author"
			});
		} 
	}
	item.complete();
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://encykorea.aks.ac.kr/Article/E0013414#cm_multimedia",
		"detectedItemType": "encyclopediaArticle",
		"items": [
			{
				"itemType": "encyclopediaArticle",
				"title": "다대포 (多大浦)",
				"creators": [
					{
						"lastName": "오",
						"firstName": "건환",
						"creatorType": "author"
					},
					{
						"lastName": "김",
						"firstName": "건유",
						"creatorType": "author"
					}
				],
				"encyclopediaTitle": "Encyclopedia of Korean Culture",
				"language": "ko",
				"libraryCatalog": "Encyclopedia of Korean Culture",
				"publisher": "Academy of Korean Studies",
				"url": "https://encykorea.aks.ac.kr/Article/E0013414#cm_multimedia",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://encykorea.aks.ac.kr/Article/E0002855",
		"detectedItemType": "encyclopediaArticle",
		"items": [
			{
				"itemType": "encyclopediaArticle",
				"title": "경주 남산 탑곡 마애불상군 (慶州 南山 塔谷 磨崖佛像群)",
				"creators": [],
				"encyclopediaTitle": "Encyclopedia of Korean Culture",
				"language": "ko",
				"libraryCatalog": "Encyclopedia of Korean Culture",
				"publisher": "Academy of Korean Studies",
				"url": "https://encykorea.aks.ac.kr/Article/E0002855",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://encykorea.aks.ac.kr/Article/E0025488",
		"detectedItemType": "encyclopediaArticle",
		"items": [{
				"itemType": "encyclopediaArticle",
				"title": "사랑 (舍廊)",
				"creators": [{
						"lastName": "김",
						"firstName": "동욱",
						"creatorType": "author"
					}],
				"encyclopediaTitle": "Encyclopedia of Korean Culture",
				"language": "ko",
				"libraryCatalog": "Encyclopedia of Korean Culture",
				"publisher": "Academy of Korean Studies",
				"url": "https://encykorea.aks.ac.kr/Article/E0025488",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
		}]
	}
]
/** END TEST CASES **/
