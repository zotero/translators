{
	"translatorID": "dc879929-ae39-45b3-b49b-dab2c80815ab",
	"label": "Encyclopedia of Korean Culture",
	"creator": "jacoblee36251",
	"target": "^https?://(www\\.)?encykorea\\.aks\\.ac\\.kr/Article/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-09-15 20:07:33"
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


function detectWeb(doc, url) {
	if (/^https?:\/\/[^/]+\/Article\/E\d+/.test(url)) {
		return 'encyclopediaArticle';
	}
	else if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('li.item > a[href^="/Article/E"]');
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(row.querySelector('div.title').textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

async function doWeb(doc, url) {
	if (detectWeb(doc, url) == 'multiple') {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (!items) return;
		for (let url of Object.keys(items)) {
			await scrape(await requestDocument(url));
		}
	}
	else {
		await scrape(doc, url);
	}
}

async function scrape(doc, url = doc.location.href) {
	var item = new Zotero.Item('encyclopediaArticle');

	item.title = ZU.trimInternal(text(doc, ".content-head-title"));
	item.encyclopediaTitle = "한국민족문화대백과사전 [Encyclopedia of Korean Culture]";
	item.publisher = "Academy of Korean Studies";
	item.language = "ko";
	// Clean url by removing # terms
	item.url = url.replace(/#.*/, "");

	// Author processing; may be 0 or more names, would be in Korean
	var authors = doc.querySelector('div.author-wrap > span');

	if (authors) {
		authors = authors.textContent;
		// For simplicity, assume one character surnames for everybody (there are rare exceptions)
		for (let author of authors.split('·')) {
			item.creators.push({
				lastName: author[0],
				firstName: author.slice(1),
				creatorType: "author"
			});
		}
	}
	item.attachments.push({ title: "Snapshot", document: doc, mimeType: "text/html" });
	item.complete();
}

/** BEGIN TEST CASES **/
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
				"encyclopediaTitle": "한국민족문화대백과사전 [Encyclopedia of Korean Culture]",
				"language": "ko",
				"libraryCatalog": "Encyclopedia of Korean Culture",
				"publisher": "Academy of Korean Studies",
				"url": "https://encykorea.aks.ac.kr/Article/E0013414",
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
		"url": "https://encykorea.aks.ac.kr/Article/E0002855",
		"detectedItemType": "encyclopediaArticle",
		"items": [
			{
				"itemType": "encyclopediaArticle",
				"title": "경주 남산 탑곡 마애불상군 (慶州 南山 塔谷 磨崖佛像群)",
				"creators": [],
				"encyclopediaTitle": "한국민족문화대백과사전 [Encyclopedia of Korean Culture]",
				"language": "ko",
				"libraryCatalog": "Encyclopedia of Korean Culture",
				"publisher": "Academy of Korean Studies",
				"url": "https://encykorea.aks.ac.kr/Article/E0002855",
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
		"url": "https://encykorea.aks.ac.kr/Article/E0025488",
		"detectedItemType": "encyclopediaArticle",
		"items": [
			{
				"itemType": "encyclopediaArticle",
				"title": "사랑 (舍廊)",
				"creators": [
					{
						"lastName": "김",
						"firstName": "동욱",
						"creatorType": "author"
					}
				],
				"encyclopediaTitle": "한국민족문화대백과사전 [Encyclopedia of Korean Culture]",
				"language": "ko",
				"libraryCatalog": "Encyclopedia of Korean Culture",
				"publisher": "Academy of Korean Studies",
				"url": "https://encykorea.aks.ac.kr/Article/E0025488",
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
		"url": "https://encykorea.aks.ac.kr/Article/Search/%ED%95%99%EC%9B%90?field=&type=&alias=false&body=false&containdesc=false&keyword=%ED%95%99%EC%9B%90",
		"detectedItemType": "multiple",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://encykorea.aks.ac.kr/Article/List/Field/%EC%98%88%EC%88%A0%C2%B7%EC%B2%B4%EC%9C%A1%3E%EC%A1%B0%EA%B0%81",
		"detectedItemType": "multiple",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://encykorea.aks.ac.kr/Article/List/Type/%EC%9C%A0%EC%A0%81",
		"detectedItemType": "multiple",
		"items": "multiple"
	}
]
/** END TEST CASES **/
