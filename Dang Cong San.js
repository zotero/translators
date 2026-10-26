{
	"translatorID": "e750b12f-2d54-47a9-9671-5d0b4ed8c798",
	"label": "Dang Cong San",
	"creator": "letrinhandn",
	"target": "^https?://(www\\.)?dangcongsan\\.vn/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-08-08 10:50:27"
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
	if (/\.html(?:\?|$)/.test(url)
			&& (attr(doc, 'meta[property="og:type"]', 'content') === 'article'
				|| doc.querySelector('h1'))) {
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
		if (!/dangcongsan\.vn\/.+\.html/i.test(href)) continue;
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
	let translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);

	translator.setHandler('itemDone', (_obj, item) => {
		item.itemType = 'newspaperArticle';
		item.publicationTitle = 'Đảng Cộng sản Việt Nam';
		item.language = 'vi';

		// og:title is often truncated with "..."
		let h1 = text(doc, 'h1');
		if (h1) {
			item.title = h1;
		}
		else if (item.title) {
			item.title = item.title.replace(/\s*\.\.\.\s*$/, '');
		}

		let published = attr(doc, 'meta[property="article:published_time"]', 'content');
		if (published) {
			item.date = ZU.strToISO(published);
		}

		let ogUrl = attr(doc, 'meta[property="og:url"]', 'content');
		if (ogUrl) {
			item.url = ogUrl;
		}
		else {
			item.url = url.replace(/\?.*$/, '');
		}

		// Prefer a real byline over generic staff initials / site name
		item.creators = [];
		let byline = text(doc, '.author');
		let dcCreator = attr(doc, 'meta[name="DC.Creator"]', 'content');
		let authorName = null;
		if (byline && !/^(PV|BTV|ĐCSVN)$/i.test(byline)) {
			authorName = byline;
		}
		else if (dcCreator
				&& dcCreator !== 'Cổng thông tin điện tử Đảng Cộng sản Việt Nam'
				&& !/^(PV|BTV)$/i.test(dcCreator)) {
			authorName = dcCreator;
		}
		if (authorName) {
			item.creators.push({
				lastName: authorName,
				creatorType: 'author',
				fieldMode: 1
			});
		}

		if (item.abstractNote) {
			item.abstractNote = item.abstractNote.replace(/^\(ĐCSVN\)\s*-\s*/, '');
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
		"url": "https://dangcongsan.vn/tin-hoat-dong/dua-khuon-kho-quan-he-doi-tac-chien-luoc-toan-dien-viet-nam-australia-di-vao-chieu-sau-thuc-chat-hieu-qua.html?categoryId=1902448,1902446",
		"items": [
			{
				"itemType": "newspaperArticle",
				"creators": [
					{
						"lastName": "Lan Anh",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"notes": [],
				"tags": [
					{
						"tag": "Tin tức"
					},
					{
						"tag": "Vấn đề quan tâm"
					},
					{
						"tag": "hiệu quả"
					},
					{
						"tag": "thực chất"
					},
					{
						"tag": "Đưa khuôn khổ quan hệ Đối tác Chiến lược Toàn diện Việt Nam - Australia đi vào chiều sâu"
					}
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"title": "Đưa khuôn khổ quan hệ Đối tác Chiến lược Toàn diện Việt Nam - Australia đi vào chiều sâu, thực chất, hiệu quả",
				"publicationTitle": "Đảng Cộng sản Việt Nam",
				"section": "Vấn đề quan tâm, Tin tức",
				"date": "2026-08-07",
				"url": "https://dangcongsan.vn/tin-hoat-dong/dua-khuon-kho-quan-he-doi-tac-chien-luoc-toan-dien-viet-nam-australia-di-vao-chieu-sau-thuc-chat-hieu-qua.html",
				"abstractNote": "Nhận lời mời của Toàn quyền Australia Sam Mostyn, Tổng Bí thư Ban Chấp hành Trung ương Đảng Cộng sản Việt Nam, Chủ tịch nước Cộng hòa xã hội chủ nghĩa Việt Nam Tô Lâm cùng Đoàn đại biểu cấp cao Việt Nam sẽ thăm cấp Nhà nước tới Australia.",
				"language": "vi",
				"libraryCatalog": "dangcongsan.vn"
			}
		]
	}
]
/** END TEST CASES **/
