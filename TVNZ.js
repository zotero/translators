{
	"translatorID": "649c2836-a94d-4bbe-8e28-6771f283702f",
	"label": "TVNZ",
	"creator": "Philipp Zumstein",
	"target": "^https?://(www\\.)?tvnz\\.co\\.nz/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-10-12 23:45:00"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2017 Philipp Zumstein
	
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
	if (url.includes("/search?") && getSearchResults(doc, true)) {
		return "multiple";
	}
	// The player pages (/player/newsclip/...) are news videos.
	if (/\/player\//.test(url)) {
		return "videoRecording";
	}
	if (ZU.xpathText(doc, '//meta[@property="og:type"]/@content')) {
		return "newspaperArticle";
	}
	return false;
}


function getJSONLD(doc, type) {
	for (let script of doc.querySelectorAll('script[type="application/ld+json"]')) {
		let data;
		try {
			data = JSON.parse(script.textContent);
		}
		catch (e) {
			continue;
		}
		for (let block of (Array.isArray(data) ? data : [data])) {
			if (!block || typeof block !== 'object') continue;
			for (let node of (block['@graph'] ? block['@graph'] : [block])) {
				if (node['@type'] == type) {
					return node;
				}
			}
		}
	}
	return null;
}

function scrape(doc, url) {
	if (/\/player\//.test(url)) {
		scrapeVideo(doc, url);
		return;
	}
	var item = new Zotero.Item("newspaperArticle");
	item.title = ZU.xpathText(doc, '//meta[@property="og:title"]/@content');
	item.date = ZU.xpathText(doc, '(//div[contains(@class, "storyPage") and h1]//time)[1]');
	if (item.date) {
		if (item.date.match(/\d\d?:\d\d[pa]m/)) {
			item.date = "Today";
		}
		else if (!item.date.match(/\d\d\d\d/)) {
			item.date += " 2017";
		}
		item.date = ZU.strToISO(item.date);
	}
	if (!item.date) {
		// Newer pages publish the date only in the JSON-LD VideoObject
		let video = getJSONLD(doc, 'VideoObject');
		if (video && video.uploadDate) {
			item.date = video.uploadDate;
		}
	}
	item.abstractNote = ZU.xpathText(doc, '//meta[@property="og:description"]/@content');
	var tagString = ZU.xpathText(doc, '//meta[@name="news_keywords"]/@content');
	if (tagString) {
		item.tags = tagString.split(', ');
	}
	item.section = ZU.xpathText(doc, '//div[@class="colStorySectionHeader"]/div[@class="tagItem"]/h2');
	item.url = ZU.xpathText(doc, '//link[@rel="canonical"]/@href') || url;
	item.publicationTitle = "TVNZ";
	item.language = "en-NZ";
	item.complete();
}

function scrapeVideo(doc, url) {
	var item = new Zotero.Item("videoRecording");
	var video = getJSONLD(doc, 'VideoObject');
	if (!video) {
		return;
	}
	item.title = video.name || ZU.xpathText(doc, '//meta[@property="og:title"]/@content');
	item.abstractNote = video.description
		|| ZU.xpathText(doc, '//meta[@property="og:description"]/@content');
	item.date = video.uploadDate;
	if (video.duration) {
		// PT3M / PT1M30S / PT2H -> 3:00 / 1:30 / 2:00:00
		let h = video.duration.match(/(\d+)H/);
		let mnt = video.duration.match(/(\d+)M/);
		let sec = video.duration.match(/(\d+)S/);
		item.runningTime = [
			(h ? h[1].padStart(2, '0') : null),
			(mnt || h ? (mnt ? mnt[1] : '0').padStart(2, '0') : null),
			(sec ? sec[1].padStart(2, '0') : null)
		].filter(p => p !== null).join(':');
	}
	if (Array.isArray(video.keywords)) {
		item.tags = video.keywords;
	}
	else if (video.keywords) {
		item.tags = video.keywords.split(', ');
	}
	item.studio = "TVNZ";
	let canonical = ZU.xpathText(doc, '//link[@rel="canonical"]/@href') || url;
	item.url = (video.url && video.url != url) ? video.url : canonical;
	item.libraryCatalog = "www.tvnz.co.nz";
	item.language = "en-NZ";
	item.complete();
}


function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//div[@class="tileContent"]/a[h3]');
	for (var i = 0; i < rows.length; i++) {
		var href = rows[i].href;
		var title = ZU.trimInternal(rows[i].textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}


async function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (!items) return;
		for (let itemUrl of Object.keys(items)) {
			// ZU.processDocuments() is deprecated since Zotero 6; requestDocument() is the
			// supported replacement and returns the loaded document directly.
			let itemDoc = await requestDocument(itemUrl);
			await scrape(itemDoc, itemDoc.location ? itemDoc.location.href : itemUrl);
		}
	}
	else {
		await scrape(doc, url);
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.tvnz.co.nz/player/newsclip/winston-peters-fires-up-over-poll-abortion-questions",
		"items": [
			{
				"itemType": "videoRecording",
				"title": "Winston Peters fires up over poll, abortion questions",
				"creators": [],
				"date": "2026-10-11T18:48:30.802Z",
				"abstractNote": "New Zealand First's leader was adamant one party would not make it into Parliament, so he wouldn't answer a \"silly question\".",
				"language": "en-NZ",
				"libraryCatalog": "www.tvnz.co.nz",
				"runningTime": "03",
				"studio": "TVNZ",
				"url": "https://www.tvnz.co.nz/player/newsclip/winston-peters-fires-up-over-poll-abortion-questions",
				"attachments": [],
				"tags": [
					{
						"tag": "new-zealand-first"
					},
					{
						"tag": "politics"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.tvnz.co.nz/player/newsclip/watch-senior-mp-admits-luxon-was-wrong-on-minimum-wage-detail",
		"items": [
			{
				"itemType": "videoRecording",
				"title": "Watch: Senior MP admits Luxon was wrong on minimum wage detail",
				"creators": [],
				"date": "2026-10-14T19:41:19.764Z",
				"abstractNote": "National's Paul Goldsmith and Labour's Kieran McAnulty went head-to-head on Breakfast following last night's debate, with one of Luxon's claims coming under scrutiny.",
				"language": "en-NZ",
				"libraryCatalog": "www.tvnz.co.nz",
				"runningTime": "06",
				"shortTitle": "Watch",
				"studio": "TVNZ",
				"url": "https://www.tvnz.co.nz/player/newsclip/watch-senior-mp-admits-luxon-was-wrong-on-minimum-wage-detail",
				"attachments": [],
				"tags": [
					{
						"tag": "labour-party"
					},
					{
						"tag": "national-party"
					},
					{
						"tag": "politics"
					},
					{
						"tag": "vote-2026"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
