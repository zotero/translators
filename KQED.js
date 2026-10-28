{
	"translatorID": "d322870e-1540-4024-9e6a-84a2501d7cb8",
	"label": "KQED",
	"creator": "Vera de Kok",
	"target": "^https?://(www\\.)?kqed\\.org/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-10-28 19:45:00"
}

/*
	***** BEGIN LICENSE BLOCK *****

	KQED Translator
	Copyright © 2026 Vera de Kok

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

/*
	KQED ships no JSON-LD and no meta author / article:published_time, which is why
	Embedded Metadata alone (and Citoid) returns items without creators. The page does
	mark up an article container, the byline and the publication date, so those are read
	here. Everything else (canonical URL, abstract, snapshot) comes from Embedded Metadata.
*/

const ARTICLE_PATH = /\/(?:arts|culture|education|health|news|politics|science)\/\d{5,}\//;

function detectWeb(doc, _url) {
	if (doc.querySelector('[class*="SinglePost__mpost"], [class*="mpost_Title"]')) {
		return 'newspaperArticle';
	}
	if (getSearchResults(doc, true)) return 'multiple';
	return false;
}

function getSearchResults(doc, checkOnly) {
	let items = {};
	let found = false;
	for (let link of doc.querySelectorAll('a[href*="/news/"], a[href*="/arts/"],'
		+ ' a[href*="/science/"], a[href*="/culture/"], a[href*="/education/"],'
		+ ' a[href*="/health/"], a[href*="/politics/"]')) {
		let href = link.getAttribute('href');
		if (!href || !ARTICLE_PATH.test(href)) continue;
		// card links wrap an image and carry the headline in the title attribute
		let title = ZU.trimInternal(link.getAttribute('title') || link.textContent);
		if (!title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == 'multiple') {
		Zotero.selectItems(getSearchResults(doc, false), (items) => {
			if (items) ZU.processDocuments(Object.keys(items), doWeb);
		});
		return;
	}
	scrape(doc, url);
}

function scrape(doc, url) {
	let translator = Zotero.loadTranslator('web');
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	translator.setHandler('itemDone', (_obj, item) => {
		item.itemType = 'newspaperArticle';

		// og:title carries a " | KQED" suffix, the h1 is the headline as published
		item.title = getText(doc, '[class*="Title__title"]') || item.title.replace(/\s*\|\s*KQED\s*$/, '');

		let creators = getCreators(doc);
		if (creators.length) item.creators = creators;

		// the first <time> is the publication date, the second one is the "Updated" stamp
		let published = getAttr(doc, '[class*="mpost_dateAndTime"] time[datetime]', 'datetime');
		if (published) item.date = ZU.strToISO(published) || published;

		item.section = getSection(doc, url);

		// the label links to a tag page on some posts ("Fall Guide 2026") and to the
		// home page on others, so it is only a tag when it points at /tag/
		let label = doc.querySelector('[class*="categoryLabel"]');
		let labelHref = label ? label.getAttribute('href') || '' : '';
		if (labelHref.includes('/tag/')) {
			let tag = ZU.trimInternal(label.textContent);
			if (tag) item.tags.push(tag);
		}

		item.abstractNote = getText(doc, '[class*="mpost_Excerpt"]') || item.abstractNote;

		item.publicationTitle = 'KQED';

		let language = doc.documentElement.getAttribute('lang');
		if (language) item.language = normalizeLanguage(language);

		item.complete();
	});
	translator.translate();
}

function getSection(doc, url) {
	// the section is the first path segment (/arts/13992952/... -> Arts); the visible
	// label is inconsistent (a series name on guide posts, "News" elsewhere)
	let segment = url.match(/kqed\.org\/([a-z]+)\//);
	if (segment) return segment[1][0].toUpperCase() + segment[1].slice(1);
	return getText(doc, '[class*="categoryLabel_Text"]');
}

function getCreators(doc) {
	let names = [];
	let seen = {};
	for (let link of doc.querySelectorAll('[class*="mpost_Authors"] a')) {
		let name = ZU.trimInternal(link.textContent);
		if (!name || seen[name.toLowerCase()]) continue;
		seen[name.toLowerCase()] = true;
		names.push(name);
	}
	return names.map(name => (name.includes(' ')
		? ZU.cleanAuthor(name, 'author', false)
		: { lastName: name, creatorType: 'author', fieldMode: 1 }));
}

function normalizeLanguage(value) {
	let parts = value.replace(/_/g, '-').split('-');
	let normalized = [parts[0].toLowerCase()];
	for (let part of parts.slice(1)) {
		if (part.length == 2) normalized.push(part.toUpperCase());
		else if (part.length == 4) normalized.push(part[0].toUpperCase() + part.slice(1).toLowerCase());
		else normalized.push(part.toLowerCase());
	}
	return normalized.join('-');
}

function getText(doc, selector) {
	let element = doc.querySelector(selector);
	return element ? ZU.trimInternal(element.textContent) : '';
}

function getAttr(doc, selector, attribute) {
	let element = doc.querySelector(selector);
	return element ? element.getAttribute(attribute) : '';
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.kqed.org/arts/13992952/best-outdoor-festivals-bay-area-fall-2026",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "15 of the Best Outdoor Festivals in the Bay Area This Fall",
				"creators": [
					{
						"firstName": "Pendarvis",
						"lastName": "Harshaw",
						"creatorType": "author"
					}
				],
				"date": "2026-08-25",
				"abstractNote": "There’s plenty of places to eat, drink, dance and celebrate outside this fall.",
				"language": "en",
				"libraryCatalog": "www.kqed.org",
				"publicationTitle": "KQED",
				"section": "Arts",
				"url": "https://www.kqed.org/arts/13992952/best-outdoor-festivals-bay-area-fall-2026",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Fall Guide 2026"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.kqed.org/news/12103028/should-you-use-usps-to-mail-your-midterm-ballot-heres-what-california-election-officials-say",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Should You Use USPS to Mail Your Midterm Ballot? Here’s What California Election Officials Say",
				"creators": [
					{
						"firstName": "Izzy",
						"lastName": "Bloom",
						"creatorType": "author"
					}
				],
				"date": "2026-10-06",
				"abstractNote": "With recent changes to how the U.S. Postal Service operates and President Trump’s attacks on mail voting, here’s what to know.",
				"language": "en",
				"libraryCatalog": "www.kqed.org",
				"publicationTitle": "KQED",
				"section": "News",
				"shortTitle": "Should You Use USPS to Mail Your Midterm Ballot?",
				"url": "https://www.kqed.org/news/12103028/should-you-use-usps-to-mail-your-midterm-ballot-heres-what-california-election-officials-say",
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
		"url": "https://www.kqed.org/arts",
		"items": "multiple"
	}
]
/** END TEST CASES **/
