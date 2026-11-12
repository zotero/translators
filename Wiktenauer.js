{
	"translatorID": "53db1961-6464-4503-8e8f-e0861bab7d42",
	"label": "Wiktenauer",
	"creator": "Dandelion Good",
	"target": "^https?://(www\\.)?wiktenauer\\.com/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-11-12 02:50:54"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2026 Dandelion Good

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
	if (url.includes('/wiki/')) {
		return 'webpage';
	}
	else if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	
	var rows = doc.querySelectorAll('ul > li.mw-search-result > div > a');
	for (let row of rows) {
		let href = row.href;
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
		for (let itemUrl of Object.keys(items)) {
			await scrape(await requestDocument(itemUrl), itemUrl);
		}
	}
	else {
		await scrape(doc, url);
	}
}

// ToDo add specific scarape for page image pages.

async function scrape(doc, url=doc.url) {
	let translator = Zotero.loadTranslator('web');
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48'); // Embedded Metadata
	translator.setDocument(doc);

	let scrapedItems = [];
	translator.setHandler('itemDone', function(obj, item) {
		scrapedItems.push(item);
	});
	await translator.translate();

	for (let item of scrapedItems) {
		item.websiteTitle = 'Wiktenauer';
		// creators grabs a lot of junk so just overwrite it.
		item.creators = [{ lastName: 'Wiktenauer', creatorType: 'author', fieldMode: 1 }];
		item.publisher = 'Wiktenauer';
		//item.accessDate = accessed;
		enrichFromPageDOM(doc, url, item);
		await getAllContributors(url, item);
		item.complete();
	}
}

async function getAllContributors(url, item) {
	const parsedUrl = new URL(url);
	const apiUrl = new URL('/api.php', parsedUrl.origin);
	try {
	// Extract page title from /wiki/Page_Title
		apiUrl.searchParams.set('action', 'query');
		apiUrl.searchParams.set('prop', 'contributors');
		apiUrl.searchParams.set('titles', item.title);
		apiUrl.searchParams.set('format', 'json');
		let options = {
			method: 'GET',
			headers: {
				"User-Agent": "ZoteroTranslatorContributorFetcher/0.1"
			}
		};
		let json = await requestJSON(apiUrl.toString(), options);
		for (let page of Object.values(json.query.pages)) {
			for (let contributor of page.contributors) {
				item.creators.push((ZU.cleanAuthor(contributor.name, 'contributor')));
			}
		}
	} catch (e) {
		Zotero.debug(`Error fetching contributors: ${e.message}`);
	}
}

function enrichFromPageDOM(doc, url, item) {
	let heading = doc.querySelector('#firstHeading');
	if (heading) {
		item.title = ZU.trimInternal(heading.textContent);
	}
	else if (item.title) {
		item.title = item.title.split(' ~ ')[0].trim();
	}


	// 3. Last modified date from #footer-info-lastmod
	let lastModEl = doc.querySelector('#footer-info-lastmod');
	if (lastModEl) {
		// Matches e.g. "28 January 2026"
		let dateMatch = lastModEl.textContent.match(/(\d{1,2}\s+[A-Za-z]+\s+\d{4})/);
		if (dateMatch) {
			item.date = dateMatch[1];
		}
	}

	// 4. Permanent URL (matching Special:CiteThisPage's permalink)
	let permalink = doc.querySelector('#t-permalink a');
	if (permalink && permalink.getAttribute('href')) {
		item.url = new URL(permalink.getAttribute('href'), url).href;
	}
	else {
		item.url = url;
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://wiktenauer.com/index.php?search=Scythe&title=Special%3ASearch&profile=advanced&fulltext=1&ns0=1",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://wiktenauer.com/wiki/Paulus_Hector_Mair",
		"items": [
			{
				"itemType": "webpage",
				"title": "Paulus Hector Mair",
				"creators": [
					{
						"lastName": "Wiktenauer",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"firstName": "Michael",
						"lastName": "Chidester",
						"creatorType": "contributor"
					},
					{
						"firstName": "Per Magnus",
						"lastName": "Haaland",
						"creatorType": "contributor"
					},
					{
						"firstName": "James",
						"lastName": "Reilly",
						"creatorType": "contributor"
					},
					{
						"firstName": "",
						"lastName": "Robinverhoef",
						"creatorType": "contributor"
					},
					{
						"firstName": "",
						"lastName": "Rlrgarber",
						"creatorType": "contributor"
					},
					{
						"firstName": "Panagiotis N.",
						"lastName": "Klonos",
						"creatorType": "contributor"
					}
				],
				"date": "16 June 2026",
				"abstractNote": "Paulus Hector Mair (Paul Hektor Mayr, Meyer; 1517 – 1579) was a 16th century German aristocrat, civil servant, and fencer. He was born in 1517 to a wealthy and influential Augsburg patrician family. In his youth, he likely received training in fencing and grappling from the masters of Augsburg fencing...",
				"language": "en",
				"publisher": "Wiktenauer",
				"url": "https://wiktenauer.com/index.php?title=Paulus_Hector_Mair&oldid=165708",
				"websiteTitle": "Wiktenauer",
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
		"url": "https://wiktenauer.com/wiki/Page:Cgm_1507_06r.jpg",
		"items": [
			{
				"itemType": "webpage",
				"title": "Page:Cgm 1507 06r.jpg",
				"creators": [
					{
						"lastName": "Wiktenauer",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"firstName": "Michael",
						"lastName": "Chidester",
						"creatorType": "contributor"
					}
				],
				"date": "30 December 2019",
				"abstractNote": "Ich hab augen als ein falk das man mich nit beschalk Ich hab hercz als ein leb das ich hin czü streb Ich hab fües als ein hind das ich hin czü vnd dar von spring",
				"language": "en",
				"publisher": "Wiktenauer",
				"shortTitle": "Page",
				"url": "https://wiktenauer.com/index.php?title=Page:Cgm_1507_06r.jpg&oldid=104861",
				"websiteTitle": "Wiktenauer",
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
