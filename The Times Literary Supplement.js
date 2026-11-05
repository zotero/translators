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
	"lastUpdated": "2026-11-05 12:29:04"
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
	if (doc.querySelector('.tls-article-intro-primary h1') || getIntro(doc).headline) return 'newspaperArticle';
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
	let intro = getIntro(doc);
	let data = getPageData(doc);
	let translator = Zotero.loadTranslator('web');
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	translator.setHandler('itemDone', (_obj, item) => {
		item.itemType = 'newspaperArticle';
		let headline = doc.querySelector('.tls-article-intro-primary h1')?.textContent || intro.headline;
		if (headline) item.title = cleanText(headline);
		if (intro.standfirst) item.abstractNote = cleanText(intro.standfirst);
		if (data.datePublished) item.date = data.datePublished.slice(0, 10);
		let canonical = doc.querySelector('link[rel="canonical"]');
		item.url = canonical ? canonical.href : url;
		item.publicationTitle = 'The Times Literary Supplement';
		item.place = 'London';
		item.ISSN = '0307-661X';
		item.creators = getCreators(doc, intro);
		let language = data.inLanguage || doc.documentElement.lang;
		if (language) item.language = language.replace('_', '-');
		let section = getSection(doc, intro);
		if (section) item.section = section;
		item.complete();
	});
	await translator.translate();
}

function getIntro(doc) {
	let script = doc.querySelector('#tls-single-article-script-js-extra');
	let match = script?.textContent.match(/var tlsPageObject = (.+);/);
	if (match) {
		try {
			return JSON.parse(match[1]).articleIntroPrimary || {};
		}
		catch (e) { /* Ignore malformed article metadata. */ }
	}
	return {};
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

function getCreators(doc, intro) {
	if (intro.label?.category?.text == 'Poem of the week') {
		for (let book of intro.bookdetails || []) {
			let credits = cleanText(book.bookdetails).match(/^A poem by (.+?)(?:;\s*introduced by (.+))?$/i);
			if (!credits) continue;
			let creators = [ZU.cleanAuthor(credits[1], 'author')];
			if (credits[2]) creators.push(ZU.cleanAuthor(credits[2], 'contributor'));
			return creators;
		}
	}
	// Related-article cards have their own bylines outside this container.
	let names = Array.from(doc.querySelectorAll('.tls-article-intro-primary .tls-byline__name'), el => el.textContent);
	if (!names.length && intro.byline?.text) names.push(intro.byline.text);
	let creators = [];
	let seen = new Set();
	for (let name of names) {
		name = cleanText(name);
		if (!name || seen.has(name.toLowerCase())) continue;
		seen.add(name.toLowerCase());
		creators.push(ZU.cleanAuthor(name, 'author'));
	}
	return creators;
}

function getSection(doc, intro) {
	let section = intro.label?.category?.text;
	if (section) return cleanText(section);
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
				"ISSN": "0307-661X",
				"abstractNote": "Why nations win or lose the technological race",
				"language": "en-US",
				"libraryCatalog": "www.the-tls.com",
				"publicationTitle": "The Times Literary Supplement",
				"place": "London",
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
	},
	{
		"type": "web",
		"url": "https://www.the-tls.com/regular-features/poem-of-the-week/the-trees-in-love-ashley-dukes-andrew-mcculloch",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "‘The Trees in Love’",
				"creators": [
					{
						"firstName": "Ashley",
						"lastName": "Dukes",
						"creatorType": "author"
					},
					{
						"firstName": "Andrew",
						"lastName": "McCulloch",
						"creatorType": "contributor"
					}
				],
				"date": "2026-11-03",
				"ISSN": "0307-661X",
				"abstractNote": "‘There is begun / More dallying / Between the forest pair.’ – Ashley Dukes",
				"language": "en-US",
				"libraryCatalog": "www.the-tls.com",
				"publicationTitle": "The Times Literary Supplement",
				"place": "London",
				"section": "Poem of the week",
				"url": "https://www.the-tls.com/regular-features/poem-of-the-week/the-trees-in-love-ashley-dukes-andrew-mcculloch",
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
		"url": "https://www.the-tls.com/categories/history",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.the-tls.com/?s",
		"items": "multiple"
	}
]
/** END TEST CASES **/
