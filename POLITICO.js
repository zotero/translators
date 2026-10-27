{
	"translatorID": "d4b0f8b4-6de6-4eb0-a7f1-1f7f2e0e3fd1",
	"label": "POLITICO",
	"creator": "Vera de Kok",
	"target": "^https?://([^/]*\\.)?politico\\.com/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-10-27 18:40:00"
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

// POLITICO has no <meta name="author">, no article:published_time and no
// citation_* tags, so Embedded Metadata only ever gets a title (and a date
// when a <time datetime> happens to be on the page). The byline and the
// publication date live in the NewsArticle JSON-LD block, which upstream EM
// does not read.

const PUBLICATION_TITLE = "POLITICO";

// Bylines that name an organisation rather than a person. The organisation is
// already the publisher, so it must not become a creator.
const ORG_BYLINES = new Set([
	"politico",
	"politico staff",
	"politico.com",
	"the associated press",
	"associated press",
	"ap",
	"reuters",
	"bloomberg",
	"agence france-presse",
	"afp"
]);

// Article paths always carry a date, either /YYYY/MM/DD/ (news) or the older
// /YYYY/MM/ (story) form, under one of several section prefixes:
// /news/, /news/magazine/, /story/, /states/<state>/story/, /magazine/story/,
// /blogs/<blog>/, /newsletters/<name>/, /tipsheets/<name>/.
const ARTICLE_PATH_RE = /\/(?:story|news|newsletters|tipsheets|blogs|interactives)(?:\/[^/]+)*\/\d{4}\/\d{2}(?:\/\d{2})?(?:\/|$)/;

// /interactives/ is a mixed bag of article-like and pure data pages, so it
// only counts when the page also ships article JSON-LD.
const DATA_ONLY_SECTION_RE = /\/interactives(?:\/[^/]+)*\/\d{4}\/\d{2}/;

function detectWeb(doc, url) {
	if (isArticle(doc, url)) {
		return "newspaperArticle";
	}
	if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function isArticle(doc, url) {
	if (DATA_ONLY_SECTION_RE.test(url)) {
		return !!getJSONLD(doc);
	}
	if (ARTICLE_PATH_RE.test(url)) {
		return true;
	}
	return !!getJSONLD(doc);
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	for (let anchor of doc.querySelectorAll('.search-results h3 a, article.story-frag h3 a')) {
		let href = anchor.href;
		let title = ZU.trimInternal(anchor.textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

/**
 * Returns the first Article-like node of the page's JSON-LD. Blocks can be
 * arrays, wrapped in @graph, or a single object.
 */
function getJSONLD(doc) {
	var scripts = doc.querySelectorAll('script[type="application/ld+json"]');
	for (let script of scripts) {
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
				let type = node['@type'];
				if ((type == 'NewsArticle' || type == 'ReportageNewsArticle'
						|| type == 'Article' || type == 'Report')
					&& (node.headline || node.name || node.datePublished || node.author)) {
					return node;
				}
			}
		}
	}
	return null;
}

/**
 * The Tealium analytics blob (`var utag_data = {...}`). It is a JS literal, not
 * a script[type=application/ld+json] block, so it has to be brace-matched out of
 * the script text. The only field used is `content_tag`, the article's keyword
 * list; the blob is read defensively because analytics markup carries no
 * stability guarantee.
 */
function getUtagData(doc) {
	if (!doc) return null;
	for (let script of doc.querySelectorAll('script')) {
		let text = script.textContent;
		let start = text.indexOf('utag_data');
		if (start == -1) continue;
		let brace = text.indexOf('{', start);
		if (brace == -1) continue;
		let depth = 0;
		let quote = null;
		let escaped = false;
		for (let i = brace; i < text.length; i++) {
			let ch = text[i];
			if (quote) {
				if (escaped) escaped = false;
				else if (ch == '\\') escaped = true;
				else if (ch == quote) quote = null;
				continue;
			}
			if (ch == '"' || ch == "'") {
				quote = ch;
			}
			else if (ch == '{') {
				depth++;
			}
			else if (ch == '}') {
				depth--;
				if (!depth) {
					try {
						return JSON.parse(text.slice(brace, i + 1));
					}
					catch (e) {
						return null;
					}
				}
			}
		}
	}
	return null;
}

function cleanBylineName(name) {
	return ZU.trimInternal(name || '')
		.replace(/^By\s+/i, '')
		.replace(/\s*,\s*$/, '');
}

/**
 * Names from JSON-LD author nodes. POLITICO mixes people ("Kyle Cheney") with
 * organisational bylines ("POLITICO Staff", "Associated Press"), which the
 * byline rule drops rather than turning the publisher into an author.
 */
function getJSONLDAuthors(doc) {
	var data = getJSONLD(doc);
	if (!data || !data.author) return [];
	var authors = Array.isArray(data.author) ? data.author : [data.author];
	var names = [];
	for (let author of authors) {
		if (!author) continue;
		let name = cleanBylineName(typeof author == 'string' ? author : author.name);
		if (!name || ORG_BYLINES.has(name.toLowerCase())) continue;
		names.push(name);
	}
	return names;
}

// The pre-2021 layout has no JSON-LD at all; the byline is either a list of
// vcards (articles) or a plain paragraph (newsletters/tipsheets, where the
// names are set in ALL CAPS). Recent pages render the byline client-side, so
// JSON-LD is the only source there.
function getDOMAuthors(doc) {
	var names = [];
	var nodes = doc.querySelectorAll(
		'p.story-meta__authors .vcard a,'
		+ ' p.story-meta__authors a[href*="/staff/"],'
		+ ' footer.meta p.byline a,'
		+ ' p.byline a[href*="/staff/"]'
	);
	for (let node of nodes) {
		let name = cleanBylineName(node.textContent);
		// "ANNA PALMER" is a byline, not an acronym.
		if (name && name == name.toUpperCase()) {
			name = ZU.capitalizeTitle(name.toLowerCase(), true);
		}
		if (name && !ORG_BYLINES.has(name.toLowerCase())) names.push(name);
	}
	return names;
}

/**
 * POLITICO emits a non-standard UTC offset without a colon ("2017-12-06T16:10-0500")
 * and, on some syndicated pages, milliseconds after the offset
 * ("2018-09-05T05:00:00+04:00:000"). ZU.parseDate cannot read either, so the
 * timestamp is cut to the date part (YYYY-MM-DD).
 */
function cleanDate(raw) {
	if (!raw) return '';
	return (ZU.trimInternal(raw).match(/^\d{4}-\d{2}-\d{2}/) || [''])[0];
}

function getDate(doc) {
	var data = getJSONLD(doc);
	if (data) {
		var date = cleanDate(data.datePublished);
		if (date) return date;
	}
	// The article header's own time. `p.timestamp` is the newsletter layout. The
	// later fallbacks stay inside the story text, because teaser cards further down
	// the page also carry <time> elements and would otherwise date the item to
	// whatever article is being promoted.
	return cleanDate(ZU.xpathText(doc, '//p[contains(@class, "story-meta__timestamp")]//time/@datetime')
		|| ZU.xpathText(doc, '//p[contains(@class, "timestamp")][not(ancestor::article[contains(@class, "story-frag")])]//time/@datetime')
		|| ZU.xpathText(doc, '//article[contains(@class, "story-main") or contains(@class, "story-text")]//time/@datetime')
		|| ZU.xpathText(doc, '//div[contains(@class, "story-text")]//time/@datetime'));
}

// <title> carries the outlet as a suffix ("… - POLITICO"; older pages use two
// spaces before the dash), and some JSON-LD headlines do as well.
function stripSiteSuffix(title) {
	return ZU.trimInternal(title || '')
		.replace(/\s+[-–—|:]\s*POLITICO(\s*(?:Magazine|Europe))?\s*$/i, '');
}

async function scrape(doc, url = doc.location.href) {
	var translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	translator.setHandler('itemDone', function (obj, item) {
		item.itemType = "newspaperArticle";
		item.publicationTitle = PUBLICATION_TITLE;
		// Canonical, because syndicated copies carry the original URL in
		// og:url while link[rel=canonical] still points at the POLITICO page.
		item.url = getAttr(doc, 'link[rel="canonical"]', 'href') || url;

		let data = getJSONLD(doc);
		let authors = getJSONLDAuthors(doc);
		if (!authors.length) authors = getDOMAuthors(doc);
		if (authors.length) {
			item.creators = authors.map(function (name) {
				if (name.split(/\s+/).length > 3) {
					return { lastName: name, creatorType: 'author', fieldMode: 1 };
				}
				return ZU.cleanAuthor(name, 'author');
			});
		}

		// EM has no citation_title or og:title source here, so it falls back to
		// document.title, which carries " - POLITICO". The JSON-LD headline is
		// the clean copy; og:title is next (but recent pages repeat the suffix).
		let title = stripSiteSuffix(data && data.headline)
			|| stripSiteSuffix(getAttr(doc, 'meta[property="og:title"]', 'content'))
			|| stripSiteSuffix(item.title);
		if (title) item.title = title;

		let date = getDate(doc);
		if (date) item.date = date;

		// Merged rather than assigned: on the pre-2021 layout Embedded Metadata
		// already supplies lowercase keyword tags, and those should survive.
		let tags = (item.tags || []).slice();
		let known = tags.map(function (entry) {
			return (entry.tag || '').toLowerCase();
		});
		for (let tag of getTags(doc)) {
			if (known.includes(tag.toLowerCase())) continue;
			known.push(tag.toLowerCase());
			tags.push({ tag: tag });
		}
		if (tags.length) item.tags = tags;

		item.complete();
	});

	await translator.translate();
}

async function doWeb(doc, url) {
	if (detectWeb(doc, url) == 'multiple') {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (!items) return;
		for (let link of Object.keys(items)) {
			await scrape(await requestDocument(link));
		}
	}
	else {
		await scrape(doc, url);
	}
}

/**
 * The article's keyword list. `content_tag` is pipe-separated
 * ("Energy|Texas|Greg Abbott") and is the only usable subject vocabulary on the
 * page: the JSON-LD block carries no keywords and there are no tag links.
 */
function getTags(doc) {
	let data = getUtagData(doc);
	if (!data || !data.content_tag) return [];
	let tags = [];
	for (let part of String(data.content_tag).split('|')) {
		let tag = ZU.trimInternal(part);
		if (tag && !tags.includes(tag)) tags.push(tag);
	}
	return tags;
}

function getAttr(doc, selector, attribute) {
	let element = doc.querySelector(selector);
	return element ? element.getAttribute(attribute) : null;
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.politico.com/story/2017/12/06/al-franken-tina-dupuy-sexual-harassment-282894",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Woman tells magazine about 2009 Franken groping incident",
				"creators": [
					{
						"firstName": "Cristiano",
						"lastName": "Lima",
						"creatorType": "author"
					}
				],
				"date": "2017-12-06",
				"abstractNote": "Dupuy said the event occurred after a recount had been called for in a Senate race that Franken would go on to win to gain his seat in Congress.",
				"libraryCatalog": "www.politico.com",
				"publicationTitle": "POLITICO",
				"url": "https://www.politico.com/story/2017/12/06/al-franken-tina-dupuy-sexual-harassment-282894",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Al Franken"
					},
					{
						"tag": "Sexual Harassment"
					},
					{
						"tag": "The Atlantic"
					},
					{
						"tag": "Kirsten Gillibrand"
					},
					{
						"tag": "Leeann Tweeden"
					},
					{
						"tag": "Senate Ethics Committee"
					},
					{
						"tag": "Ethics Investigations"
					},
					{
						"tag": "Senate Democrats"
					},
					{
						"tag": "Barack Obama"
					},
					{
						"tag": "Minnesota"
					},
					{
						"tag": "Media Matters"
					},
					{
						"tag": "Inauguration"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.politico.com/story/2009/02/alice-roosevelt-marries-in-the-white-house-feb-17-1906-018947",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Alice Roosevelt marries in the White House, Feb. 17, 1906",
				"creators": [
					{
						"firstName": "Andrew",
						"lastName": "Glass",
						"creatorType": "author"
					}
				],
				"date": "2009-02-17",
				"abstractNote": "On this day in 1906, President Theodore Roosevelt's daughter Alice married Rep. Nicholas Longworth (R-Ohio) in a glittering White House ceremony that captured international attention.",
				"language": "en",
				"libraryCatalog": "www.politico.com",
				"publicationTitle": "POLITICO",
				"url": "https://www.politico.com/story/2009/02/alice-roosevelt-marries-in-the-white-house-feb-17-1906-018947",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "alice roosevelt"
					},
					{
						"tag": "history"
					},
					{
						"tag": "this day"
					},
					{
						"tag": "this day in politics"
					},
					{
						"tag": "weddings"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.politico.com/states/california/story/2017/03/with-1-million-donation-wealthy-gop-businessman-john-cox-formally-enters-ca-governors-race-110150",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "GOP businessman John Cox enters CA governor's race, but stays mum on Trump",
				"creators": [
					{
						"firstName": "Carla",
						"lastName": "Marinucci",
						"creatorType": "author"
					}
				],
				"date": "2017-03-07",
				"abstractNote": "California businessman John Cox has become the first Republican to jump into the 2018 governor's race.",
				"language": "en",
				"libraryCatalog": "www.politico.com",
				"publicationTitle": "POLITICO",
				"url": "https://www.politico.com/states/california/story/2017/03/with-1-million-donation-wealthy-gop-businessman-john-cox-formally-enters-ca-governors-race-110150",
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
		"url": "https://www.politico.com/newsletters/playbook/2017/12/03/mcconnell-govt-wont-shut-down-trump-unleashes-on-twitter-potus-says-people-who-lost-money-in-stock-market-should-sue-abc-inside-the-gridiron-dinner-peter-baker-a1-trumps-whiplash-presidency-228525",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "MCCONNELL: Gov’t won’t shut down -- TRUMP unleashes on Twitter: POTUS says people who lost money in stock market should SUE ABC -- INSIDE the GRIDIRON DINNER -- PETER BAKER A1: TRUMP’s whiplash presidency",
				"creators": [
					{
						"firstName": "Anna",
						"lastName": "Palmer",
						"creatorType": "author"
					},
					{
						"firstName": "Jake",
						"lastName": "Sherman",
						"creatorType": "author"
					},
					{
						"firstName": "Daniel",
						"lastName": "Lippman",
						"creatorType": "author"
					}
				],
				"date": "2017-12-03",
				"language": "en",
				"libraryCatalog": "www.politico.com",
				"publicationTitle": "POLITICO",
				"shortTitle": "MCCONNELL",
				"url": "https://www.politico.com/newsletters/playbook/2017/12/03/mcconnell-govt-wont-shut-down-trump-unleashes-on-twitter-potus-says-people-who-lost-money-in-stock-market-should-sue-abc-inside-the-gridiron-dinner-peter-baker-a1-trumps-whiplash-presidency-228525",
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
		"url": "https://www.politico.com/news/2025/01/05/trump-adds-4-to-white-house-team-00196513",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Trump adds 4 to White House team",
				"creators": [
					{
						"firstName": "David",
						"lastName": "Cohen",
						"creatorType": "author"
					}
				],
				"date": "2025-01-05",
				"abstractNote": "All have previous connections to the president-elect.",
				"language": "en",
				"libraryCatalog": "www.politico.com",
				"publicationTitle": "POLITICO",
				"url": "https://www.politico.com/news/2025/01/05/trump-adds-4-to-white-house-team-00196513",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "2025 Presidential Transition"
					},
					{
						"tag": "White House"
					},
					{
						"tag": "Donald Trump"
					},
					{
						"tag": "David Warrington"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.politico.com/news/2025/01/09/cuomo-to-tap-longtime-ally-for-likely-new-york-city-mayoral-bid-against-eric-adams-00197235",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Cuomo to tap longtime ally for likely New York City mayoral bid against Adams",
				"creators": [
					{
						"firstName": "Nick",
						"lastName": "Reisman",
						"creatorType": "author"
					},
					{
						"firstName": "Jeff",
						"lastName": "Coltin",
						"creatorType": "author"
					},
					{
						"firstName": "Sally",
						"lastName": "Goldenberg",
						"creatorType": "author"
					}
				],
				"date": "2025-01-09",
				"abstractNote": "Former Gov. Andrew Cuomo is weighing a February launch date for his potential campaign.",
				"language": "en",
				"libraryCatalog": "www.politico.com",
				"publicationTitle": "POLITICO",
				"url": "https://www.politico.com/news/2025/01/09/cuomo-to-tap-longtime-ally-for-likely-new-york-city-mayoral-bid-against-eric-adams-00197235",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "New York"
					},
					{
						"tag": "New York City Hall"
					},
					{
						"tag": "New York Politics"
					},
					{
						"tag": "Andrew Cuomo"
					},
					{
						"tag": "Eric Adams"
					},
					{
						"tag": "Charlie King"
					},
					{
						"tag": "2025 New York City Elections"
					},
					{
						"tag": "Video"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.politico.com/news/2026/01/06/artificial-intelligence-prescribing-medications-utah-00709122",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Artificial intelligence begins prescribing medications in Utah",
				"creators": [
					{
						"firstName": "Yasmin",
						"lastName": "Khorram",
						"creatorType": "author"
					},
					{
						"firstName": "Ruth",
						"lastName": "Reader",
						"creatorType": "author"
					}
				],
				"date": "2026-01-06",
				"abstractNote": "Pilot program will test how far patients and regulators are willing to trust AI in medicine.",
				"language": "en",
				"libraryCatalog": "www.politico.com",
				"publicationTitle": "POLITICO",
				"url": "https://www.politico.com/news/2026/01/06/artificial-intelligence-prescribing-medications-utah-00709122",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Health Care"
					},
					{
						"tag": "Artificial Intelligence"
					},
					{
						"tag": "Prescription Drugs"
					},
					{
						"tag": "Utah"
					},
					{
						"tag": "Exclusive"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.politico.com/news/2026/10/27/how-big-tech-and-abbott-made-texas-the-epicenter-of-data-centers-01135261",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "How Big Tech and Abbott made Texas the ‘epicenter’ of data centers",
				"creators": [
					{
						"firstName": "Shelby",
						"lastName": "Webb",
						"creatorType": "author"
					}
				],
				"date": "2026-10-27",
				"abstractNote": "As Republican Gov. Greg Abbott talks tough on data centers, records and interviews show how his office and appointees worked closely with the tech and power industries.",
				"language": "en",
				"libraryCatalog": "www.politico.com",
				"publicationTitle": "POLITICO",
				"url": "https://www.politico.com/news/2026/10/27/how-big-tech-and-abbott-made-texas-the-epicenter-of-data-centers-01135261",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Energy"
					},
					{
						"tag": "Texas"
					},
					{
						"tag": "Greg Abbott"
					},
					{
						"tag": "Data"
					},
					{
						"tag": "data centers"
					},
					{
						"tag": "Technology"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.politico.com/search",
		"items": "multiple"
	}
]
/** END TEST CASES **/
