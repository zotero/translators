{
	"translatorID": "d45c50cb-6dee-4cfb-974d-797991f8385b",
	"label": "Digital Spy",
	"creator": "czar, Vera de Kok",
	"target": "^https?://(www\\.)?digitalspy\\.com/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-10-18 21:55:00"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2018 czar and Vera de Kok
	http://en.wikipedia.org/wiki/User_talk:Czar

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

// The 2021 translator keyed detection on .content-hed and the byline on
// a[rel=author]. Neither exists any more, so detectWeb never fired and Citoid
// fell back to its generic extractor with an empty item. The current template
// is a Hearst "custom-item" layout that publishes a NewsArticle block.

const SITE_NAME = 'Digital Spy';
const SITE_LANG = 'en-GB';

// Hearst credits some hub pages with the site name as the headline ("Digital Spy").
function isSiteName(text) {
	return !text || ZU.trimInternal(text).toLowerCase() == SITE_NAME.toLowerCase();
}

function getJSONLD(doc) {
	for (let script of doc.querySelectorAll('script[type="application/ld+json"]')) {
		let data;
		try {
			data = JSON.parse(script.textContent);
		}
		catch (e) {
			continue;
		}
		for (let block of (Array.isArray(data) ? data : [data])) {
			if (!block || typeof block != 'object') continue;
			for (let node of (block['@graph'] ? block['@graph'] : [block])) {
				if (!node || typeof node != 'object') continue;
				if (/^(?:News|Blog|Analysis)?Article$/.test(node['@type']) && node.headline) {
					return node;
				}
			}
		}
	}
	return null;
}

function getMeta(doc, prop) {
	return ZU.xpathText(doc, `//meta[@property="${prop}"]/@content`)
		|| ZU.xpathText(doc, `//meta[@name="${prop}"]/@content`);
}

// sailthru.tags is a comma-separated list in which every tag appears twice: once
// as a slug and once as its display form ("soaps,Soaps,coronation-street,Coronation
// Street"). The display form can be longer than the slug implies ("news,Latest
// News", "features,Digital Spy Features", "great-british-bake-off,The Great
// British Bake Off"), so a pair is recognised by the display form's slug
// containing the slug's. The list also carries the content type ("news,Latest
// News") and the site edition ("Digital Spy-GB"), neither of which is a subject.
const SITE_TAG_MARKER = `${SITE_NAME}-${SITE_LANG.split('-')[1]}`;
const NOT_TAGS = new Set(['news', 'latestnews', SITE_TAG_MARKER, slugify(SITE_TAG_MARKER)]);

// Lowercasing and stripping punctuation is what makes "coronation-street" and
// "Coronation Street" compare equal.
function slugify(tag) {
	return tag.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function displayForm(slug, next) {
	return next && slugify(next).includes(slugify(slug)) ? next : null;
}

function getTags(doc) {
	let raw = getMeta(doc, 'sailthru.tags');
	if (!raw) return [];
	let tokens = raw.split(',').map(tag => ZU.trimInternal(tag)).filter(tag => tag);
	let seen = new Set();
	let tags = [];
	for (let i = 0; i < tokens.length; i++) {
		let display = displayForm(tokens[i], tokens[i + 1]);
		if (display) i++;
		let tag = display || tokens[i];
		let key = slugify(tag);
		if (!key || NOT_TAGS.has(key) || seen.has(key)) continue;
		seen.add(key);
		tags.push(tag);
	}
	return tags;
}

// og:type="article" also appears on migrated pages without a usable Article
// node (e.g. the About page), so accept those too, but never a hub page whose
// only title is the site name.
function detectWeb(doc, url) {
	if (/\/search\/?(?:[?#]|$)/.test(url) && getSearchResults(doc, true)) {
		return 'multiple';
	}
	let ld = getJSONLD(doc);
	if (ld && !isSiteName(ld.headline)) {
		return 'newspaperArticle';
	}
	if (getMeta(doc, 'og:type') == 'article') {
		let heading = ZU.trimInternal(text(doc, 'h1')) || getMeta(doc, 'og:title');
		if (!isSiteName(heading)) {
			return 'newspaperArticle';
		}
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	let items = {};
	let found = false;
	for (let a of doc.querySelectorAll('a[data-theme-key="custom-item"]')) {
		let title = ZU.trimInternal(text(a, '[data-theme-key="custom-item-title"]'))
			|| ZU.trimInternal(ZU.xpathText(a, './@data-vars-ga-call-to-action'));
		if (!a.href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[a.href] = title;
	}
	return found ? items : false;
}

async function doWeb(doc, url) {
	if (detectWeb(doc, url) == 'multiple') {
		let items = await Z.selectItems(getSearchResults(doc, false));
		if (!items) return;
		await ZU.processDocuments(Object.keys(items), scrape);
	}
	else {
		scrape(doc, url);
	}
}

// Zotero keeps only "YYYY-MM-DD hh:mm", but the site publishes microseconds
// (2021-05-12T15:14:19.934192Z), which Zotero would otherwise reject.
function normalizeDate(value) {
	if (!value) return undefined;
	let m = String(value).trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/);
	if (!m) return value;
	let iso = `${m[1]}-${m[2]}-${m[3]}`;
	if (m[4]) {
		iso += ` ${m[4]}:${m[5]}`;
		if (m[6]) iso += `:${m[6]}`;
	}
	return iso;
}

// The site itself is credited as an author on some sponsored pages.
const NOT_A_PERSON = /^(?:digital spy|hearst(?: uk)?|staff)$/i;
// The header byline is "By Amy West"; related-story cards reuse the same
// data-theme-key but sit inside a custom-item link.
const DOM_BYLINE = '[data-theme-key="by-line-name"]';

function authorsFromJSONLD(ld) {
	let out = [];
	if (!ld || !ld.author) return out;
	let authors = Array.isArray(ld.author) ? ld.author : [ld.author];
	for (let author of authors) {
		let name = typeof author == 'string' ? author : author && author.name;
		if (!name) continue;
		name = ZU.trimInternal(name).replace(/^by\s+/i, '');
		if (name && !NOT_A_PERSON.test(name)) out.push(name);
	}
	return out;
}

function authorsFromDOM(doc) {
	for (let node of doc.querySelectorAll(DOM_BYLINE)) {
		if (node.closest('[data-theme-key="custom-item"]')) continue;
		let name = ZU.trimInternal(node.textContent).replace(/^by\s+/i, '');
		if (!name) continue;
		return name.split(/\s*(?:,|&|\band\b)\s*/)
			.map(s => ZU.trimInternal(s))
			.filter(s => s && !NOT_A_PERSON.test(s));
	}
	return [];
}

function addCreators(item, names) {
	for (let name of names) {
		if (name.split(/\s+/).length > 3) {
			item.creators.push({ lastName: name, creatorType: 'author', fieldMode: 1 });
		}
		else {
			item.creators.push(ZU.cleanAuthor(name, 'author'));
		}
	}
}

function scrape(doc, url) {
	let item = new Zotero.Item('newspaperArticle');
	let ld = getJSONLD(doc) || {};

	item.title = isSiteName(ld.headline)
		? ZU.trimInternal(text(doc, 'h1')) || getMeta(doc, 'og:title')
		: ld.headline;
	item.abstractNote = ld.description || getMeta(doc, 'og:description');
	item.date = normalizeDate(ld.datePublished || getMeta(doc, 'article:published_time'));
	item.section = ld.articleSection;
	item.language = (getMeta(doc, 'og:locale') || SITE_LANG).replace('_', '-');
	item.publicationTitle = SITE_NAME;
	item.url = ZU.xpathText(doc, '//link[@rel="canonical"]/@href') || url;
	item.tags = getTags(doc).map(tag => ({ tag }));

	let creators = authorsFromJSONLD(ld);
	addCreators(item, creators.length ? creators : authorsFromDOM(doc));

	item.attachments.push({
		title: 'Digital Spy Snapshot',
		url: url,
		mimeType: 'text/html',
	});

	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.digitalspy.com/soaps/coronation-street/a36407166/coronation-street-sharon-bentley-tricks-dev-alahan-leanne-search/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Coronation Street's Sharon Bentley tricks Dev Alahan in her search for Leanne",
				"creators": [
					{
						"firstName": "Amy",
						"lastName": "West",
						"creatorType": "author"
					}
				],
				"date": "2021-05-12 15:14:19",
				"abstractNote": "Coronation Street spoilers as Sharon Bentley tricks Dev Alahan in her search for Simon, Nick and Leanne.",
				"language": "en-GB",
				"libraryCatalog": "Digital Spy",
				"publicationTitle": "Digital Spy",
				"section": "Soaps",
				"url": "https://www.digitalspy.com/soaps/coronation-street/a36407166/coronation-street-sharon-bentley-tricks-dev-alahan-leanne-search/",
				"attachments": [
					{
						"title": "Digital Spy Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [

					{
						"tag": "Soaps"
					},
					{
						"tag": "Coronation Street"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.digitalspy.com/videogames/xbox-one/a661615/rare-replay-review-roundup-one-of-the-best-collections-in-gaming-history/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Rare Replay review roundup: \"One of the best collections in gaming history\"",
				"creators": [
					{
						"firstName": "Albaraa",
						"lastName": "Fahmy",
						"creatorType": "author"
					}
				],
				"date": "2015-08-04 00:47:00",
				"abstractNote": "Early reviews applaud the compilation for comprising countless hours of content.",
				"language": "en-GB",
				"libraryCatalog": "Digital Spy",
				"publicationTitle": "Digital Spy",
				"section": "Video Games",
				"shortTitle": "Rare Replay review roundup",
				"url": "https://www.digitalspy.com/videogames/xbox-one/a661615/rare-replay-review-roundup-one-of-the-best-collections-in-gaming-history/",
				"attachments": [
					{
						"title": "Digital Spy Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [

					{
						"tag": "Video Games"
					},
					{
						"tag": "Xbox One"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.digitalspy.com/tv/a74167077/ghosts-simon-farnaby-taskmaster-problem/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Ghosts cast want to see Simon Farnaby on Taskmaster – but he admits \"problem\" with that",
				"creators": [
					{
						"firstName": "Joe",
						"lastName": "Anderton",
						"creatorType": "author"
					},
					{
						"firstName": "Erin",
						"lastName": "Zammitt",
						"creatorType": "author"
					}
				],
				"date": "2026-10-17 17:10:05",
				"abstractNote": "Ghosts cast want to see Simon Farnaby on Taskmaster – but he admits \"problem\" with that.",
				"language": "en-GB",
				"libraryCatalog": "Digital Spy",
				"publicationTitle": "Digital Spy",
				"section": "TV",
				"url": "https://www.digitalspy.com/tv/a74167077/ghosts-simon-farnaby-taskmaster-problem/",
				"attachments": [
					{
						"title": "Digital Spy Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [

					{
						"tag": "TV"
					},
					{
						"tag": "Exclusives"
					},
					{
						"tag": "Taskmaster"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.digitalspy.com/search/?q=xbox",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.digitalspy.com/tv/a46683450/alison-hammond-outfits-buy/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "This Morning and Bake Off – Where to buy Alison Hammond's outfits",
				"creators": [],
				"date": "2024-02-08 17:23:07",
				"abstractNote": "This Morning and Bake Off star Alison Hammond models some stunning plus-sized fashion looks on our screens. Here's where you can buy some of her best outfits.",
				"language": "en-GB",
				"libraryCatalog": "Digital Spy",
				"publicationTitle": "Digital Spy",
				"section": "TV",
				"url": "https://www.digitalspy.com/tv/a46683450/alison-hammond-outfits-buy/",
				"attachments": [
					{
						"title": "Digital Spy Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [

					{
						"tag": "TV"
					},
					{
						"tag": "This Morning"
					},
					{
						"tag": "Deals"
					},
					{
						"tag": "Digital Spy Features"
					},
					{
						"tag": "The Great British Bake Off"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.digitalspy.com/tv/a70049607/streaming-guide/",
		"items": []
	}
]
/** END TEST CASES **/
