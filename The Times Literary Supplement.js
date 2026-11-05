{
	"translatorID": "efc2de52-389a-490a-a620-60cb73fe0081",
	"label": "The Times Literary Supplement",
	"creator": "Vera de Kok",
	"target": "^https?://(?:www\\.)?the-tls\\.com/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-11-05 11:56:53"
}

/*
	***** BEGIN LICENSE BLOCK *****

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


function detectWeb(doc) {
	if (doc.querySelector('.tls-article-intro-primary h1')) return 'newspaperArticle';
	if (getSearchResults(doc, true)) return 'multiple';
	return false;
}

function getSearchResults(doc, checkOnly) {
	let items = {};
	for (let link of doc.querySelectorAll('a.tls-card-headline[href]')) {
		if (!/^https?:\/\/(?:www\.)?the-tls\.com\/(?!categories\/)[^/]+\/[^/]+\/[^/?#]+/.test(link.href)) continue;
		let heading = link.querySelector('h2, h3');
		if (!heading) continue;
		let title = cleanText(heading.textContent);
		if (!title) continue;
		if (checkOnly) return true;
		items[link.href] = title;
	}
	return Object.keys(items).length ? items : false;
}

async function doWeb(doc, url) {
	if (detectWeb(doc) == 'multiple') {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (!items) return;
		for (let link of Object.keys(items)) {
			await scrape(await requestDocument(link), link);
		}
	}
	else {
		await scrape(doc, url);
	}
}

async function scrape(doc, url) {
	let intro = doc.querySelector('.tls-article-intro-primary');
	if (!intro) throw new Error('TLS article markup is unavailable in the fetched document');
	let data = getPageData(doc);
	let translator = Zotero.loadTranslator('web');
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	translator.setHandler('itemDone', (_obj, item) => {
		item.itemType = 'newspaperArticle';
		let headline = intro.querySelector('h1');
		if (headline) item.title = cleanText(headline.textContent);
		if (data.datePublished) item.date = data.datePublished.slice(0, 10);
		let canonical = doc.querySelector('link[rel="canonical"]');
		item.url = canonical ? canonical.href : url;
		item.publicationTitle = 'The Times Literary Supplement';
		item.creators = getCreators(intro);
		let language = data.inLanguage || doc.documentElement.lang;
		if (language) item.language = language.replace('_', '-');
		let section = getSection(doc);
		if (section) item.section = section;
		item.complete();
	});
	await translator.translate();
}

function getPageData(doc) {
	for (let script of doc.querySelectorAll('script[type="application/ld+json"]')) {
		try {
			let data = JSON.parse(script.textContent);
			let page = data['@graph']?.find(node => node['@type'] == 'WebPage');
			if (page) return page;
		}
		catch (e) { /* Ignore malformed metadata blocks. */ }
	}
	return {};
}

function getCreators(intro) {
	let creators = [];
	let seen = new Set();
	// Related-article cards have their own bylines outside this container.
	for (let author of intro.querySelectorAll('.tls-byline__name')) {
		let name = cleanText(author.textContent);
		if (!name || seen.has(name.toLowerCase())) continue;
		seen.add(name.toLowerCase());
		creators.push(ZU.cleanAuthor(name, 'author'));
	}
	return creators;
}

function getSection(doc) {
	let crumbs = doc.querySelectorAll('[class*="breadcrumb"] a');
	return crumbs.length ? cleanText(crumbs[crumbs.length - 1].textContent) : '';
}

function cleanText(value) {
	return ZU.trimInternal(ZU.unescapeHTML(value || ''));
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.the-tls.com/science-technology/technology/how-progress-ends-carl-benedikt-frey-ai-for-good-josh-tyrangiel-book-review-philip-zelikow",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Letting go",
				"creators": [
					{
						"firstName": "Philip",
						"lastName": "Zelikow",
						"creatorType": "author"
					}
				],
				"date": "2026-09-02",
				"abstractNote": "Why nations win or lose the technological race",
				"language": "en-US",
				"libraryCatalog": "www.the-tls.com",
				"publicationTitle": "The Times Literary Supplement",
				"section": "Technology",
				"url": "https://www.the-tls.com/science-technology/technology/how-progress-ends-carl-benedikt-frey-ai-for-good-josh-tyrangiel-book-review-philip-zelikow",
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
		"url": "https://www.the-tls.com/",
		"items": "multiple"
	}
]
/** END TEST CASES **/
