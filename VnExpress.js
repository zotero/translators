{
	"translatorID": "6df3da29-3f6e-42d4-b99c-1ca1bc3709bb",
	"label": "VnExpress",
	"creator": "letrinhandn",
	"target": "^https?://(www\\.)?vnexpress\\.net/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-08-08 11:09:57"
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
	if (/\/\d{6,}\.html/.test(url)
			|| attr(doc, 'meta[name="tt_page_type"]', 'content') === 'article'
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
	var rows = doc.querySelectorAll('h3.title-news a[href*=".html"], h2.title-news a[href*=".html"], .title-news a[href*=".html"]');
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(row.textContent);
		if (!href || !title || href.includes('#')) continue;
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
		item.publicationTitle = 'VnExpress';
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
			// Organization byline is the site name, not a person
			if (ld.author && ld.author['@type'] === 'Organization') {
				item.creators = [];
			}
		}
		else {
			item.title = item.title.replace(/\s*-\s*Báo VnExpress\s*$/i, '');
			let pubdate = attr(doc, 'meta[name="pubdate"]', 'content')
				|| attr(doc, 'meta[itemprop="datePublished"]', 'content');
			if (pubdate) {
				item.date = ZU.strToISO(pubdate);
			}
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
		"url": "https://vnexpress.net/ha-noi-xem-xet-gia-han-thu-tuc-6-du-an-lon-5106755.html",
		"items": [
			{
				"itemType": "newspaperArticle",
				"creators": [],
				"notes": [],
				"tags": [
					{
						"tag": "Hà Nội"
					},
					{
						"tag": "Nghị quyết 258 của Quốc hội"
					},
					{
						"tag": "Tin nóng"
					},
					{
						"tag": "đại dự án ở Hà Nội"
					}
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"title": "Hà Nội xem xét gia hạn thủ tục 6 dự án lớn",
				"publicationTitle": "VnExpress",
				"url": "https://vnexpress.net/ha-noi-xem-xet-gia-han-thu-tuc-6-du-an-lon-5106755.html",
				"abstractNote": "Hà Nội- Sáu dự án đã khởi công nhưng chưa hoàn tất quy hoạch, hồ sơ đầu tư hoặc giải phóng mặt bằng, được đề xuất thêm 6 tháng để đáp ứng đủ điều kiện.",
				"language": "vi",
				"libraryCatalog": "vnexpress.net",
				"date": "2026-08-08"
			}
		]
	}
]
/** END TEST CASES **/
