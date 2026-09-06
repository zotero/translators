{
	"translatorID": "dd6a9009-cfd0-430f-90b3-61db962a1c4b",
	"label": "Bao Chinh Phu",
	"creator": "letrinhandn",
	"target": "^https?://(www\\.)?baochinhphu\\.vn/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-08-08 10:50:28"
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
	if (/\d{10,}\.htm/i.test(url)
			|| attr(doc, 'meta[property="article:published_time"]', 'content')) {
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
	var rows = doc.querySelectorAll('a[href*=".htm"]');
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(row.textContent);
		if (!href || !title || title.length < 20) continue;
		if (!/baochinhphu\.vn\/.+\.htm/i.test(href)) continue;
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
		item.publicationTitle = 'Báo Điện tử Chính phủ';
		item.language = 'vi';

		// Prefer h1 / og:title over HTML-entity-encoded JSON-LD headline
		let title = text(doc, 'h1')
			|| attr(doc, 'meta[property="og:title"]', 'content');
		if (title) {
			item.title = title;
		}

		let ld = getJSONLD(doc);
		let published = (ld && ld.datePublished)
			|| attr(doc, 'meta[property="article:published_time"]', 'content');
		if (published) {
			item.date = ZU.strToISO(published);
		}

		item.creators = [];
		let authorName = null;
		if (ld && ld.author && ld.author.name
				&& !/^baochinhphu\.vn$/i.test(ld.author.name)) {
			authorName = ld.author.name;
		}
		if (authorName) {
			item.creators.push({
				lastName: authorName,
				creatorType: 'author',
				fieldMode: 1
			});
		}

		if (item.abstractNote) {
			item.abstractNote = item.abstractNote.replace(/^\(Chinhphu\.vn\)\s*-\s*/i, '');
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
		"url": "https://baochinhphu.vn/pho-thu-tuong-nguyen-van-thang-xu-ly-den-cung-cac-vuong-mac-khong-day-doanh-nghiep-di-vong-10226080815310734.htm",
		"items": [
			{
				"itemType": "newspaperArticle",
				"creators": [
					{
						"lastName": "Ban biên tập",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"title": "Phó Thủ tướng Nguyễn Văn Thắng: Xử lý đến cùng các vướng mắc, không đẩy doanh nghiệp đi vòng",
				"publicationTitle": "Báo Điện tử Chính phủ",
				"date": "2026-08-08",
				"url": "https://baochinhphu.vn/pho-thu-tuong-nguyen-van-thang-xu-ly-den-cung-cac-vuong-mac-khong-day-doanh-nghiep-di-vong-10226080815310734.htm",
				"abstractNote": "Hôm nay, 8/8, tại trụ sở Chính phủ, Phó Thủ tướng Nguyễn Văn Thắng đã có buổi làm việc với các bộ, ngành, địa phương và doanh nghiệp để giải quyết khó khăn, vướng mắc trong lĩnh vực thuế và hải quan.",
				"language": "vi",
				"libraryCatalog": "baochinhphu.vn",
				"shortTitle": "Phó Thủ tướng Nguyễn Văn Thắng"
			}
		]
	}
]
/** END TEST CASES **/
