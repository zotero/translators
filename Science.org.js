{
	"translatorID": "8c4f1e2a-6b97-4d3c-9a51-2f7d0b6e4c18",
	"label": "Science.org",
	"creator": "Vera de Kok",
	"target": "^https?://(www\\.)?science\\.org/(content/article/|news/)",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-10-29 13:00:00"
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

/*
	Science news and feature pages ("/content/article/", "/news/") ship no JSON-LD, no
	article:published_time and no citation_* meta tags, so Embedded Metadata returns a
	title and nothing else. The byline and date do exist, but only in AAAS's own
	analytics object and in one hero element:

	<script> AAASdataLayer = {"page":{"pageInfo":{
		"author":"Jocelyn Kaiser|David Malakoff", "articleType":"ScienceInsider"
	}}} </script>
	<div class="news-article__hero__bottom-meta">...
		<span class="news-article__hero__date">12 Feb 2014</span>

	Traps this translator avoids:
	- A DOI is a bonus, not the lookup key: the pages print it as plain text in the content
	  footer, sometimes as a real DOI ("doi: 10.1126/science.abj6980") and sometimes as the
	  article id AAAS assigned it ("doi: 10.1126/article.23565", which does not resolve at
	  doi.org at the time of writing). Whatever the footer prints is copied over; nothing is
	  looked up by it.
	- A page with a DOI is a journal record, so the item type is journalArticle; the markup is
	  a news template either way.
	- pageInfo.pubDate is unreliable: it carries the page-creation date (a March 2026
	  article reports "2021-08-15"). The visible hero date is the article's own date.
*/

// the analytics object is a one-line literal followed by an "if (AAASdataLayer ...)"
// guard, so the whole script cannot go through JSON.parse
function getPageInfo(doc) {
	for (let script of doc.querySelectorAll('script')) {
		let src = script.textContent;
		if (!src || !src.includes('AAASdataLayer')) continue;
		let assign = src.match(/AAASdataLayer\s*=\s*\{/);
		if (!assign) continue;
		let start = src.indexOf('{', assign.index);
		if (start === -1) continue;

		let depth = 0;
		let quote = null;
		for (let i = start; i < src.length; i++) {
			let ch = src[i];
			if (quote) {
				if (ch === '\\') i++;
				else if (ch === quote) quote = null;
				continue;
			}
			if (ch === '"' || ch === "'") {
				quote = ch;
			}
			else if (ch === '{') {
				depth++;
			}
			else if (ch === '}') {
				depth--;
				if (depth !== 0) continue;
				try {
					let data = JSON.parse(src.slice(start, i + 1));
					if (data.page && data.page.pageInfo) return data.page.pageInfo;
				}
				catch (e) {
					Z.debug('Science.org: unparseable AAASdataLayer: ' + e);
				}
				break;
			}
		}
	}
	return null;
}

/*
	pageInfo.author is pipe-separated and holds ALL authors in one field, which is what
	makes multi-author stories work; the DOM has one link per author as a fallback.

	The name arrives HTML-encoded inside the JSON (O\u0026#8217;Grady) and script content is
	not entity-decoded by the parser, so it must go through unescapeHTML before cleaning.
*/
function getBylineNames(doc) {
	let pageInfo = getPageInfo(doc);
	let names = pageInfo && pageInfo.author ? pageInfo.author.split('|') : [];
	if (!names.filter(n => n && n.trim()).length) {
		names = [];
		for (let el of doc.querySelectorAll('.news-article__about-author__title')) {
			names.push(el.textContent);
		}
	}
	return names.filter(n => n && n.trim()).map(n => ZU.unescapeHTML(ZU.trimInternal(n)));
}

function cleanText(doc, selector) {
	let el = doc.querySelector(selector);
	return el ? ZU.trimInternal(el.textContent) : '';
}

const MONTHS = [
	'jan',
	'feb',
	'mar',
	'apr',
	'may',
	'jun',
	'jul',
	'aug',
	'sep',
	'oct',
	'nov',
	'dec'
];

// the hero date reads "26 May 2021" / "12 Feb 2014"
function parseHeroDate(str) {
	let m = ZU.trimInternal(str || '').match(/^(\d{1,2}) ([A-Za-z]{3,})\.? (\d{4})$/);
	if (!m) return ZU.strToISO(str || '');
	let month = MONTHS.indexOf(m[2].slice(0, 3).toLowerCase());
	if (month === -1) return '';
	return m[3] + '-' + String(month + 1).padStart(2, '0') + '-' + m[1].padStart(2, '0');
}

function getDate(doc) {
	return parseHeroDate(
		cleanText(doc, '.news-article__hero__bottom-meta .news-article__hero__date')
		|| cleanText(doc, '.news-article__hero__date')
	);
}

// The DOI is plain text in the content footer -- not a citation_doi meta tag, not a link.
// Older pages print the article id instead of the science.* form ("10.1126/article.23565"),
// which is what the page says its DOI is, so it is kept as printed.
function getDOI(doc) {
	let match = cleanText(doc, '.news-article-content-footer')
		.match(/\bdoi:\s*(10\.1126\/[^\s;]+)/i);
	return match ? match[1].replace(/[.,]+$/, '') : '';
}

// "Relevant tags" in the same footer, e.g.
// <a href="/topic/category/biology" title="Biology">Biology</a>
function getTags(doc) {
	let tags = [];
	for (let link of doc.querySelectorAll('.news-article__tags a')) {
		let name = ZU.trimInternal(link.textContent);
		if (name && !tags.some(t => t.tag === name)) tags.push({ tag: name });
	}
	return tags;
}

function detectWeb(doc, url) {
	url = url || '';
	// /doi/ pages resolve through DOI metadata into a journalArticle; leave them alone
	if (url.includes('/doi/')) return false;
	if (doc.querySelector('.news-article__hero__title')) return 'journalArticle';
	// section pages and search results list articles without the hero block
	if (/\/news\/(all-news|features)|\/action\/doSearch/.test(url)) {
		return getSearchResults(doc) ? 'multiple' : false;
	}
	return false;
}

// Every card on a section page or in a result list links /content/article/...
function getSearchResults(doc) {
	let items = {};
	for (let link of doc.querySelectorAll('a[href*="/content/article/"]')) {
		let url = link.href || link.getAttribute('href');
		if (!url || items[url]) continue;
		let title = ZU.trimInternal(link.textContent)
			|| ZU.trimInternal(link.getAttribute('title') || '');
		if (title) items[url] = title;
	}
	return Object.keys(items).length ? items : false;
}

async function doWeb(doc, url) {
	if (detectWeb(doc, url) === 'multiple') {
		let selected = await Zotero.selectItems(getSearchResults(doc));
		if (!selected) return;
		for (let pageURL of Object.keys(selected)) {
			await scrape(await requestDocument(pageURL), pageURL);
		}
		return;
	}
	await scrape(doc, url);
}

function scrape(doc, url) {
	let translator = Zotero.loadTranslator('web');
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	translator.setHandler('itemDone', (_obj, item) => {
		item.itemType = 'journalArticle';

		let seen = {};
		item.creators = [];
		for (let name of getBylineNames(doc)) {
			if (seen[name.toLowerCase()]) continue;
			seen[name.toLowerCase()] = true;
			// a single-token name like O'Grady would be split into first "O'" / last "Grady";
			// keep it in one field. Multi-token names (D'Angelo Smith) go through cleanAuthor.
			if (!/\s/.test(name) && /^[A-Z]['\u2019][A-Za-z]/.test(name)) {
				item.creators.push({ lastName: name, creatorType: 'author', fieldMode: 1 });
			}
			else {
				item.creators.push(ZU.cleanAuthor(name, 'author', false));
			}
		}

		let date = getDate(doc);
		if (date) item.date = date;

		let doi = getDOI(doc);
		if (doi) item.DOI = doi;

		let tags = getTags(doc);
		if (tags.length) item.tags = tags;

		item.publicationTitle = 'Science';
		if (!item.language) item.language = 'en';
		if (!item.url) item.url = url;

		item.complete();
	});
	return translator.translate();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.science.org/content/article/cities-have-their-own-distinct-microbial-fingerprints",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Cities have their own distinct microbial fingerprints",
				"creators": [
					{
						"firstName": "Cathleen",
						"lastName": "O\u2019Grady",
						"creatorType": "author"
					}
				],
				"date": "2021-05-26",
				"DOI": "10.1126/science.abj6980",
				"abstractNote": "Transit systems in 60 cities show unique microbiomes",
				"language": "en",
				"libraryCatalog": "www.science.org",
				"publicationTitle": "Science",
				"url": "https://www.science.org/content/article/cities-have-their-own-distinct-microbial-fingerprints",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Biology"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.science.org/content/article/aaas-launches-open-access-journal",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "AAAS Launches Open-Access Journal",
				"creators": [
					{
						"firstName": "Jocelyn",
						"lastName": "Kaiser",
						"creatorType": "author"
					},
					{
						"firstName": "David",
						"lastName": "Malakoff",
						"creatorType": "author"
					}
				],
				"date": "2014-02-12",
				"DOI": "10.1126/article.23565",
				"abstractNote": "Publisher joins many other societies by launching an online-only journal that will be free to read",
				"language": "en",
				"libraryCatalog": "www.science.org",
				"publicationTitle": "Science",
				"url": "https://www.science.org/content/article/aaas-launches-open-access-journal",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "People & Events"
					},
					{
						"tag": "Scientific Community"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
