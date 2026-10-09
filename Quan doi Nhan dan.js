{
	"translatorID": "ccfddc8a-bb67-44a3-9f05-7cb4e43c0763",
	"label": "Quan doi Nhan dan",
	"creator": "letrinhandn",
	"target": "^https?://(www\\.)?qdnd\\.vn/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-08-08 10:50:30"
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
	if (/\/\d{6,}(?:\/|$|\?)/.test(url)
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
	var rows = doc.querySelectorAll('a[href*="qdnd.vn/"]');
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(row.textContent);
		if (!href || !title || title.length < 20) continue;
		if (!/qdnd\.vn\/.+\/\d{6,}/i.test(href)) continue;
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
		item.publicationTitle = 'Quân đội nhân dân';
		item.language = 'vi';

		// og:title is often truncated; h1 is complete
		let h1 = text(doc, 'h1');
		if (h1) {
			item.title = h1;
		}

		let ld = getJSONLD(doc);
		if (ld && ld.datePublished) {
			item.date = ZU.strToISO(ld.datePublished);
		}

		item.creators = [];
		// Prefer DOM byline; JSON-LD author may append an office address
		let author = text(doc, '.author-top, .author');
		if (!author && ld && ld.author && ld.author.name) {
			author = ld.author.name.split(/\s+-\s+/)[0].trim();
		}
		// Skip photo/graphics credits mistaken for bylines
		if (author && !/^(Đồ họa|Ảnh|Video|Nguồn|Minh họa)\s*:/i.test(author)) {
			item.creators.push({
				lastName: author,
				creatorType: 'author',
				fieldMode: 1
			});
		}

		// Use non-truncated canonical path from the page URL
		item.url = url.split('?')[0];

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
		"url": "https://www.qdnd.vn/chinh-tri/tin-tuc/dai-tuong-phan-van-giang-tiep-thu-y-kien-dai-bieu-quoc-hoi-ve-du-an-luat-phong-chong-pho-bien-vu-khi-huy-diet-hang-loat-1052548",
		"items": [
			{
				"itemType": "newspaperArticle",
				"creators": [
					{
						"lastName": "VŨ DUNG",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"notes": [],
				"tags": [
					{
						"tag": "Kỳ họp không thường lệ"
					},
					{
						"tag": "Quốc hội"
					},
					{
						"tag": "Vũ khí"
					},
					{
						"tag": "hàng loạt"
					},
					{
						"tag": "hủy diệt"
					},
					{
						"tag": "Đại tướng Phan Văn Giang"
					}
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"title": "Đại tướng Phan Văn Giang tiếp thu ý kiến đại biểu Quốc hội về dự án Luật Phòng, chống phổ biến vũ khí hủy diệt hàng loạt",
				"publicationTitle": "Quân đội nhân dân",
				"url": "https://www.qdnd.vn/chinh-tri/tin-tuc/dai-tuong-phan-van-giang-tiep-thu-y-kien-dai-bieu-quoc-hoi-ve-du-an-luat-phong-chong-pho-bien-vu-khi-huy-diet-hang-loat-1052548",
				"abstractNote": "Đại tướng Phan Văn Giang tiếp thu ý kiến đại biểu Quốc hội về dự án Luật Phòng, chống phổ biến vũ khí hủy diệt hàng loạt",
				"language": "vi",
				"libraryCatalog": "www.qdnd.vn",
				"date": "2026-08-08"
			}
		]
	}
]
/** END TEST CASES **/
