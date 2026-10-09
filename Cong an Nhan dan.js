{
	"translatorID": "a4de917b-ac4b-4251-9fc0-b3e1b153b232",
	"label": "Cong an Nhan dan",
	"creator": "letrinhandn",
	"target": "^https?://(www\\.)?cand\\.vn/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-08-08 10:50:31"
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
		item.publicationTitle = 'Công an Nhân dân';
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

		item.creators = item.creators.filter(
			c => !/Công an Nhân dân/i.test(c.lastName)
		);

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
		"url": "https://cand.vn/canh-sat-kinh-te-phai-chu-dong-phong-ngua-rui-ro-tu-som-tu-xa-post818972.html",
		"items": [
			{
				"itemType": "newspaperArticle",
				"creators": [
					{
						"lastName": "Khổng Hà",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"notes": [],
				"tags": [
					{
						"tag": "Cảnh sát kinh tế"
					},
					{
						"tag": "an ninh kinh tế"
					},
					{
						"tag": "bảo vệ tài sản"
					},
					{
						"tag": "phòng ngừa"
					},
					{
						"tag": "tội phạm kinh tế"
					},
					{
						"tag": "đấu tranh chống tham nhũng"
					}
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"title": "Cảnh sát kinh tế phải chủ động phòng ngừa rủi ro từ sớm, từ xa",
				"publicationTitle": "Công an Nhân dân",
				"section": "Lãnh đạo Bộ Công an,Tin hoạt động,Công an trong lòng dân,Thời sự,Bộ trưởng Bộ Công an",
				"date": "2026-08-08",
				"url": "https://cand.vn/canh-sat-kinh-te-phai-chu-dong-phong-ngua-rui-ro-tu-som-tu-xa-post818972.html",
				"abstractNote": "Chủ tịch Quốc hội Trần Thanh Mẫn đề nghị lực lượng Cảnh sát kinh tế chuyển mạnh từ tư duy phát hiện, xử lý vụ việc là chủ yếu sang kết hợp chặt chẽ giữa phòng ngừa, phát hiện, xử lý và tham mưu hoàn thiện thể chế; từ giải quyết hậu quả sang chủ động nhận diện, ngăn ngừa rủi ro từ sớm, từ xa; từ tư duy quản lý sang phục vụ, kiến tạo và hỗ trợ phát triển.",
				"language": "vi",
				"libraryCatalog": "cand.vn"
			}
		]
	}
]
/** END TEST CASES **/
