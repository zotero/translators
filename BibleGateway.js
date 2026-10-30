{
	"translatorID": "eca3c08a-252b-4030-9df2-d25026e1e69d",
	"label": "BibleGateway",
	"creator": "",
	"target": "^https?://www\\.biblegateway\\.com/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 200,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-10-30 07:27:09"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2026 YOUR_NAME <- TODO

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


function isPassageUrl(url) {
	// ToDo already covered in regex
	return url.includes('/passage/');
}


function detectWeb(doc, url) {
	Zotero.debug("!!! DETECTWEB TRACE TRIGGERED FOR: " + url);
	
	if (!url.includes('biblegateway.com')) {
		Zotero.debug(`BibleGateway detectWeb quick return ${url}`);
		return false;
	}
	Zotero.debug(`in BibleGateway detectWeb for ${url}`);
	if (isPassageUrl(url)) {
		return "bookSection";
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
	Zotero.debug(`scraping ${url}`);
	let item = new Zotero.Item('bookSection');
	let langEl = doc.querySelector("html");

	if (langEl) {
		item.language = langEl.getAttribute("lang");
	}
	// let itemElement = doc.querySelector('[property~="og:type"]');
	let descEl = doc.querySelector('[property~="og:description"]');
	if (descEl) {
		item.abstractNote = descEl.getAttribute("content");
	}
	const titleEl = doc.querySelector('meta[property="og:title"]');
	let title = doc.title;
	if (titleEl) {
		Zotero.debug(`found TitleTag: ${titleEl}`);
		let titleText = titleEl.getAttribute('content');
		if (titleText) {
			title = titleText;
		}
	}

	let parts = title.split('passage:');
	if (parts[1]) {
		title = parts[1];
	}
	item.title = title.trim();

	let printEl = doc.querySelector("a.print");
	if (printEl) {
		let printLink = printEl.getAttribute("href");
		Zotero.debug(`found printlink: ${printLink}`);
		let attURL = new URL(printLink, url).href;
		let attachedDoc = await Zotero.Utilities.HTTP.requestDocument(attURL);
		Zotero.debug(`got snapshot: ${attachedDoc}`);
		let attachment = {
			title: "Snapshot",
			url: attURL,
			mimeType: "text/html",
			document: attachedDoc
		};
		Zotero.debug(`created attachment: ${attachment}`);
		item.attachments.push(attachment);
	}
	else {
		Zotero.debug(`did not find printlink for ${doc}`);
	}
	
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.biblegateway.com/passage/?search=Joshua%2013&version=NRSVUE",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Joshua 13 - New Revised Standard Version Updated Edition",
				"creators": [],
				"abstractNote": "The Parts of Canaan Still Unconquered - Now Joshua was old and advanced in years, and the LORD said to him, “You are old and advanced in years, and very much of the land still remains to be possessed. This is the land that still remains: all the regions of the Philistines, and all those of the Geshurites (from the Shihor, which is near Egypt, northward to the boundary of Ekron, it is reckoned as Canaanite; there are five rulers of the Philistines, those of Gaza, Ashdod, Ashkelon, Gath, and Ekron), and those of the Avvim in the south; all the land of the Canaanites, and Mearah that belongs to the Sidonians, to Aphek, to the boundary of the Amorites, and the land of the Gebalites, and all Lebanon, toward the east, from Baal-gad below Mount Hermon to Lebo-hamath,",
				"language": "en",
				"libraryCatalog": "BibleGateway",
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
