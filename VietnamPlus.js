{
	"translatorID": "291158d5-151e-48de-911e-8d231489671c",
	"label": "VietnamPlus",
	"creator": "letrinhandn",
	"target": "^https?://(www\\.)?vietnamplus\\.vn/",
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
	if (/post\d+\.vnp/i.test(url)
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
	var rows = doc.querySelectorAll('a[href*="post"][href$=".vnp"]');
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
		item.publicationTitle = 'VietnamPlus';
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
			item.url = ogUrl.split('#')[0];
		}
		else {
			item.url = url.split('#')[0];
		}

		item.creators = item.creators.filter(c => !/Vietnam\+/i.test(c.lastName));

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
		"url": "https://www.vietnamplus.vn/giai-quyet-kho-khan-vuong-mac-trong-linh-vuc-thue-va-hai-quan-post1128969.vnp",
		"items": [
			{
				"itemType": "newspaperArticle",
				"creators": [
					{
						"lastName": "Tuân-Tùng",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"notes": [],
				"tags": [
					{
						"tag": "Thủ tục hải quan"
					},
					{
						"tag": "doanh nghiệp siêu nhỏ"
					},
					{
						"tag": "hộ kinh doanh"
					}
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"title": "Giải quyết khó khăn, vướng mắc trong lĩnh vực thuế và hải quan",
				"publicationTitle": "VietnamPlus",
				"section": "Kinh tế",
				"date": "2026-08-08",
				"url": "https://www.vietnamplus.vn/giai-quyet-kho-khan-vuong-mac-trong-linh-vuc-thue-va-hai-quan-post1128969.vnp",
				"abstractNote": "Ngày 8/8, tại trụ sở Chính phủ, Phó Thủ tướng Nguyễn Văn Thắng đã có buổi làm việc với các bộ, ngành, địa phương và doanh nghiệp để giải quyết khó khăn, vướng mắc trong lĩnh vực thuế và hải quan.",
				"language": "vi",
				"libraryCatalog": "www.vietnamplus.vn"
			}
		]
	}
]
/** END TEST CASES **/
