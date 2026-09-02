{
	"translatorID": "6ad14dfd-19a2-4891-a460-7b10a8571e30",
	"label": "Dai Bieu Nhan Dan",
	"creator": "letrinhandn",
	"target": "^https?://(www\\.)?daibieunhandan\\.vn/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-08-08 10:50:29"
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
	if (/\d{7,}\.html/i.test(url)
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
	var rows = doc.querySelectorAll('a[href*=".html"]');
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(row.textContent);
		if (!href || !title || title.length < 20) continue;
		if (!/daibieunhandan\.vn\/.+\d{7,}\.html/i.test(href)) continue;
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

function personName(author) {
	if (!author) return null;
	if (Array.isArray(author)) {
		author = author[0];
	}
	return author.name || null;
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
		item.publicationTitle = 'Đại biểu Nhân dân';
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
		}

		if (!item.date) {
			let published = attr(doc, 'meta[property="article:published_time"]', 'content');
			if (published) {
				item.date = ZU.strToISO(published);
			}
		}

		item.creators = [];
		let authorName = personName(ld && ld.author)
			|| attr(doc, 'meta[property="article:author"]', 'content')
			|| text(doc, '.block-sc-author, .sc-longform-header-author');
		if (authorName && authorName !== 'Báo Đại biểu Nhân dân') {
			item.creators.push({
				lastName: authorName,
				creatorType: 'author',
				fieldMode: 1
			});
		}

		let ogUrl = attr(doc, 'meta[property="og:url"]', 'content');
		if (ogUrl) {
			item.url = ogUrl;
		}

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
		"url": "https://daibieunhandan.vn/xay-dung-khu-vuc-phong-thu-cap-xa-phuong-vung-manh-toan-dien-10426675.html",
		"items": [
			{
				"itemType": "newspaperArticle",
				"creators": [
					{
						"lastName": "Thanh Hải",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"notes": [],
				"tags": [
					{
						"tag": "Khu vực phòng thủ"
					}
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"title": "Xây dựng khu vực phòng thủ cấp xã, phường vững mạnh toàn diện",
				"publicationTitle": "Đại biểu Nhân dân",
				"section": "Thời sự Quốc hội",
				"date": "2026-08-08",
				"url": "https://daibieunhandan.vn/xay-dung-khu-vuc-phong-thu-cap-xa-phuong-vung-manh-toan-dien-10426675.html",
				"abstractNote": "Sáng 8/8, dưới sự chủ trì của Chủ tịch Quốc hội Trần Thanh Mẫn và điều hành của Phó Chủ tịch Quốc hội, Thượng tướng Nguyễn Doãn Anh, Quốc hội làm việc tại Hội trường, thảo luận về dự án Luật sửa đổi, bổ sung một số điều của 9 luật về quân sự, quốc phòng.",
				"language": "vi",
				"libraryCatalog": "daibieunhandan.vn"
			}
		]
	}
]
/** END TEST CASES **/
