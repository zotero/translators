{
	"translatorID": "c77ae4fd-f6c9-4e0f-8bf1-862d3d7ccf51",
	"label": "Seer Huang",
	"creator": "Andy Kwok",
	"target": "https?://seerhuang\\\\.blog",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-11-03 14:14:20"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2022 YOUR_NAME <- TODO

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
	// TODO: adjust the logic here
	if (url.includes('/article/')) {
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
	// TODO: adjust the CSS selector
	var rows = doc.querySelectorAll('h2 > a.title[href*="/article/"]');
	for (let row of rows) {
		// TODO: check and maybe adjust
		let href = row.href;
		// TODO: check and maybe adjust
		let title = ZU.trimInternal(row.textContent);
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
		if (items) {
			await Promise.all(
				Object.keys(items)
					.map(url => requestDocument(url).then(scrape))
			);
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
		// TODO adjust if needed:
		item.creators.push(ZU.cleanAuthor("荒人巫思手抄", "author"));
		item.blogTitle = "-----荒人巫思-----手抄　spiritual, evolution, enlightenment, rituals, power"
		item.complete();
	});

	let em = await translator.getTranslatorObject();
	em.itemType = 'blogPost';
	// TODO map additional meta tags here, or delete completely
	// em.addCustomFields({
	//	'twitter:description': 'abstractNote'
	// });
	await em.doWeb(doc, url);
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://seerhuang.blog/2022/10/29/%e3%80%90%e5%a5%b3%e7%a5%9e%e7%a5%9d%e7%a6%8f%e5%84%80%e5%bc%8f%ef%bc%8e%e4%b8%83%e6%97%a5%e3%80%912022-%e5%8d%81%e4%ba%8c%e6%9c%88%ef%bc%8e%e5%93%88%e6%89%98%e7%88%be%e5%a5%b3%e7%a5%9e%e7%a5%9d/",
		"items": [
			{
				"itemType": "blogPost",
				"title": "【女神祝福儀式．七日】2022 十二月．哈托爾女神祝福儀式",
				"creators": [
					{
						"firstName": "",
						"lastName": "荒人巫思手抄",
						"creatorType": "author"
					}
				],
				"date": "2022-10-29T01:47:39+00:00",
				"abstractNote": "2022年共有哪些女神祝福儀式？請見這裡 2022 十二月．哈托爾女神祝福儀式 這次的女神七日祝福儀式，我們竟...",
				"blogTitle": "-----荒人巫思-----手抄　spiritual, evolution, enlightenment, rituals, power",
				"language": "zh-TW",
				"url": "https://seerhuang.blog/2022/10/29/%e3%80%90%e5%a5%b3%e7%a5%9e%e7%a5%9d%e7%a6%8f%e5%84%80%e5%bc%8f%ef%bc%8e%e4%b8%83%e6%97%a5%e3%80%912022-%e5%8d%81%e4%ba%8c%e6%9c%88%ef%bc%8e%e5%93%88%e6%89%98%e7%88%be%e5%a5%b3%e7%a5%9e%e7%a5%9d/",
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
		"url": "https://seerhuang.blog/2022/10/29/%e3%80%90%e5%a5%b3%e7%a5%9e%e7%a5%9d%e7%a6%8f%e5%84%80%e5%bc%8f%ef%bc%8e%e4%b8%83%e6%97%a5%e3%80%912022-%e5%8d%81%e4%ba%8c%e6%9c%88%ef%bc%8e%e5%93%88%e6%89%98%e7%88%be%e5%a5%b3%e7%a5%9e%e7%a5%9d/",
		"items": [
			{
				"itemType": "blogPost",
				"title": "【女神祝福儀式．七日】2022 十二月．哈托爾女神祝福儀式",
				"creators": [
					{
						"firstName": "",
						"lastName": "荒人巫思手抄",
						"creatorType": "author"
					}
				],
				"date": "2022-10-29T01:47:39+00:00",
				"abstractNote": "2022年共有哪些女神祝福儀式？請見這裡 2022 十二月．哈托爾女神祝福儀式 這次的女神七日祝福儀式，我們竟...",
				"blogTitle": "-----荒人巫思-----手抄　spiritual, evolution, enlightenment, rituals, power",
				"language": "zh-TW",
				"url": "https://seerhuang.blog/2022/10/29/%e3%80%90%e5%a5%b3%e7%a5%9e%e7%a5%9d%e7%a6%8f%e5%84%80%e5%bc%8f%ef%bc%8e%e4%b8%83%e6%97%a5%e3%80%912022-%e5%8d%81%e4%ba%8c%e6%9c%88%ef%bc%8e%e5%93%88%e6%89%98%e7%88%be%e5%a5%b3%e7%a5%9e%e7%a5%9d/",
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
		"url": "https://seerhuang.blog/2022/10/29/%e3%80%90%e5%a5%b3%e7%a5%9e%e7%a5%9d%e7%a6%8f%e5%84%80%e5%bc%8f%ef%bc%8e%e4%b8%83%e6%97%a5%e3%80%912022-%e5%8d%81%e4%ba%8c%e6%9c%88%ef%bc%8e%e5%93%88%e6%89%98%e7%88%be%e5%a5%b3%e7%a5%9e%e7%a5%9d/",
		"items": [
			{
				"itemType": "blogPost",
				"title": "【女神祝福儀式．七日】2022 十二月．哈托爾女神祝福儀式",
				"creators": [
					{
						"firstName": "",
						"lastName": "荒人巫思手抄",
						"creatorType": "author"
					}
				],
				"date": "2022-10-29T01:47:39+00:00",
				"abstractNote": "2022年共有哪些女神祝福儀式？請見這裡 2022 十二月．哈托爾女神祝福儀式 這次的女神七日祝福儀式，我們竟...",
				"blogTitle": "-----荒人巫思-----手抄　spiritual, evolution, enlightenment, rituals, power",
				"language": "zh-TW",
				"url": "https://seerhuang.blog/2022/10/29/%e3%80%90%e5%a5%b3%e7%a5%9e%e7%a5%9d%e7%a6%8f%e5%84%80%e5%bc%8f%ef%bc%8e%e4%b8%83%e6%97%a5%e3%80%912022-%e5%8d%81%e4%ba%8c%e6%9c%88%ef%bc%8e%e5%93%88%e6%89%98%e7%88%be%e5%a5%b3%e7%a5%9e%e7%a5%9d/",
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
		"url": "https://seerhuang.blog/2022/10/29/%e3%80%90%e5%a5%b3%e7%a5%9e%e7%a5%9d%e7%a6%8f%e5%84%80%e5%bc%8f%ef%bc%8e%e4%b8%83%e6%97%a5%e3%80%912022-%e5%8d%81%e4%ba%8c%e6%9c%88%ef%bc%8e%e5%93%88%e6%89%98%e7%88%be%e5%a5%b3%e7%a5%9e%e7%a5%9d/",
		"items": [
			{
				"itemType": "blogPost",
				"title": "【女神祝福儀式．七日】2022 十二月．哈托爾女神祝福儀式",
				"creators": [
					{
						"firstName": "",
						"lastName": "荒人巫思手抄",
						"creatorType": "author"
					}
				],
				"date": "2022-10-29T01:47:39+00:00",
				"abstractNote": "2022年共有哪些女神祝福儀式？請見這裡 2022 十二月．哈托爾女神祝福儀式 這次的女神七日祝福儀式，我們竟...",
				"blogTitle": "-----荒人巫思-----手抄　spiritual, evolution, enlightenment, rituals, power",
				"language": "zh-TW",
				"url": "https://seerhuang.blog/2022/10/29/%e3%80%90%e5%a5%b3%e7%a5%9e%e7%a5%9d%e7%a6%8f%e5%84%80%e5%bc%8f%ef%bc%8e%e4%b8%83%e6%97%a5%e3%80%912022-%e5%8d%81%e4%ba%8c%e6%9c%88%ef%bc%8e%e5%93%88%e6%89%98%e7%88%be%e5%a5%b3%e7%a5%9e%e7%a5%9d/",
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
	}
]
/** END TEST CASES **/
