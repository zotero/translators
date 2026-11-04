{
	"translatorID": "682264c8-1028-4a73-9a27-dc9a25722aa1",
	"label": "Nhan Dan",
	"creator": "letrinhandn",
	"target": "^https?://(www\\.)?nhandan\\.vn/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-08-08 10:50:26"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2026 letrinhandn

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
	if (/post\d+\.html/i.test(url)
			|| attr(doc, 'meta[property="og:type"]', 'content') === 'article') {
		return 'newspaperArticle';
	}
	else if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('a[href*="post"][href$=".html"]');
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(row.textContent);
		if (!href || !title || title.length < 10) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function getJSONLD(doc) {
	let nodes = doc.querySelectorAll('script[type="application/ld+json"]');
	for (let node of nodes) {
		try {
			let data = JSON.parse(node.textContent);
			if (Array.isArray(data)) {
				data = data.find(d => d['@type'] === 'NewsArticle') || data[0];
			}
			if (data && data['@type'] === 'NewsArticle') {
				return data;
			}
		}
		catch (e) {}
	}
	return null;
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
	let translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);

	translator.setHandler('itemDone', (_obj, item) => {
		item.itemType = 'newspaperArticle';
		item.publicationTitle = 'Nhân Dân';
		item.language = 'vi';

		let ld = getJSONLD(doc);
		if (ld) {
			if (ld.headline) {
				item.title = ld.headline;
			}
			if (ld.datePublished) {
				item.date = ZU.strToISO(ld.datePublished);
			}
			if (ld.description) {
				item.abstractNote = ld.description;
			}
			if (ld.author && ld.author['@type'] === 'Person' && ld.author.name) {
				item.creators = [{
					lastName: ld.author.name,
					creatorType: 'author',
					fieldMode: 1
				}];
			}
		}
		else {
			let published = attr(doc, 'meta[property="article:published_time"]', 'content');
			if (published) {
				item.date = ZU.strToISO(published);
			}
			let author = text(doc, '.article__author');
			if (author) {
				item.creators = [{
					lastName: author,
					creatorType: 'author',
					fieldMode: 1
				}];
			}
		}

		let ogUrl = attr(doc, 'meta[property="og:url"]', 'content');
		if (ogUrl) {
			item.url = ogUrl;
		}

		// Site meta author is the newspaper name
		item.creators = item.creators.filter(c => c.lastName !== 'Báo Nhân Dân điện tử');

		item.complete();
	});

	let em = await translator.getTranslatorObject();
	em.itemType = 'newspaperArticle';
	await em.doWeb(doc, url);
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://nhandan.vn/xung-dang-la-thanh-bao-kiem-sac-ben-trong-dau-tranh-phong-chong-toi-pham-post980623.html",
		"items": [
			{
				"itemType": "newspaperArticle",
				"creators": [
					{
						"lastName": "VĂN CHÚC",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"notes": [],
				"tags": [
					{
						"tag": "Bảo vệ Tổ quốc"
					},
					{
						"tag": "Chủ tịch Quốc hội"
					},
					{
						"tag": "Cảnh sát kinh tế"
					},
					{
						"tag": "Huân chương Hồ Chí Minh"
					},
					{
						"tag": "Lễ kỷ niệm"
					}
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"title": "Xứng đáng là “thanh bảo kiếm sắc bén” trong đấu tranh phòng, chống tội phạm",
				"publicationTitle": "Nhân Dân",
				"section": "Chính trị,Truyền thống vẻ vang",
				"date": "2026-08-08",
				"url": "https://nhandan.vn/xung-dang-la-thanh-bao-kiem-sac-ben-trong-dau-tranh-phong-chong-toi-pham-post980623.html",
				"abstractNote": "Sáng 8/8, tại Nhà hát Hồ Gươm, Hà Nội, Chủ tịch Quốc hội Trần Thanh Mẫn đến dự Lễ kỷ niệm 70 năm Ngày truyền thống lực lượng Cảnh sát kinh tế (10/8/1956-10/8/2026) và đón nhận Huân chương Hồ Chí Minh.",
				"language": "vi",
				"libraryCatalog": "nhandan.vn"
			}
		]
	}
]
/** END TEST CASES **/
