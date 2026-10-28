{
	"translatorID": "3ba96388-66f2-4bbe-9004-9b6290a20add",
	"label": "AAAS",
	"creator": "Vera de Kok",
	"target": "^https?://(www\\.)?aaas\\.org/news",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-10-28 00:18:00"
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
	AAAS news pages (aaas.org/news/<slug>) ship no JSON-LD, no citation_* meta tags and
	no <time>, so Embedded Metadata recovers only the title, the abstract (from
	og:description) and og:site_name. The date and byline exist only in AAAS's own
	analytics object and in one info block:

	<script> AAASdataLayer = {"page":{
		"pageInfo":{"author":"Travis York","pubDate":"2026-07-10 12:45:09",
		            "pageType":"news article"},
		"attributes":{"subject":"Scientific community/Science careers/Scientific workforce"}
	}} </script>
	<div class="aa-news-article-info">
		<div class="aa-news-article-info__date">10 July 2026</div>
		<div class="aa-news-article-info__name">by: Stephanie Rodriguez, Travis York</div>
		<div class="aa-news-article-info__organization"></div>

	Traps this translator avoids:

	- pageInfo.author does NOT hold the whole byline. It is a single string holding only
	  ONE author while the visible byline lists all of them: on
	  /news/america-has-talent-its-systems-need-better-connections the datalayer says
	  "Travis York" but the page credits "Stephanie Rodriguez, Travis York". The info
	  block wins and is comma-split; the datalayer is only a fallback.

	- og:title, twitter:title and <title> all carry a
	  " | American Association for the Advancement of Science (AAAS)" suffix, so the
	  title comes from the h1 instead.

	- A dead slug still answers HTTP 200 with the full site shell, but then pageType is
	  "other page" and there is no info block, so detection keys on the info block and
	  not on the h1 (every page on this site has one).

	- Some bylines are HTML-encoded ("Kathleen O&#039;Neil") and textContent does not
	  entity-decode, so names go through ZU.unescapeHTML.

	- attributes.subject is a COMMA-SEPARATED LIST of hierarchical paths and one article
	  can carry 15 of them, so only the first (primary) path is used for the tag;
	  taking the last segment of the whole string produced nonsense like "History of life".

	itemType is magazineArticle because these are news features under a magazine-style
	masthead, and magazineArticle keeps publicationTitle, which blogPost drops.
*/

// the analytics object is a one-line literal followed by an "if (AAASdataLayer ...)"
// guard, so the enclosing script cannot simply go through JSON.parse
function getDatalayer(doc) {
	for (let script of doc.querySelectorAll('script')) {
		let text = script.textContent;
		if (!text || !text.includes('AAASdataLayer')) continue;
		let start = findObjectStart(text);
		if (start === -1) continue;
		let obj = readObject(text, start);
		if (!obj) continue;
		try {
			let data = JSON.parse(obj);
			if (data.page) return data.page;
		}
		catch (e) {
			Z.debug('AAAS: unparseable AAASdataLayer: ' + e);
		}
	}
	return null;
}

function findObjectStart(src) {
	let assign = src.match(/AAASdataLayer\s*=\s*\{/);
	if (!assign) return -1;
	return src.indexOf('{', assign.index);
}

// the literal is followed by an "if (AAASdataLayer ...)" guard, so the whole <script>
// is not valid JSON; brace-count while skipping over string literals instead
function readObject(src, start) {
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
			if (depth === 0) return src.slice(start, i + 1);
		}
	}
	return null;
}

function cleanText(doc, selector) {
	let el = doc.querySelector(selector);
	return el ? ZU.unescapeHTML(ZU.trimInternal(el.textContent)) : '';
}

// organisational bylines ("AAAS", "AAAS Staff", "AAAS Office of Communications",
// "MemberCentral") must not go through cleanAuthor, which would split
// "AAAS Office of Communications" into a first and a last name.
const ORG_PATTERN = /\b(AAAS|Office|Communications|Staff|Department|Division|Program|Team|Committee|Board|Center|Centre|Institute|Association|MemberCentral|Editorial)\b/;

function isOrganization(name) {
	// a single token cannot be a "First Last" personal name
	if (!/\s/.test(name)) return true;
	return ORG_PATTERN.test(name);
}

function getBylineNames(doc) {
	let byline = cleanText(doc, '.aa-news-article-info__name');
	byline = byline.replace(/^by[:\s]+/i, '').trim();

	// "Stephanie Rodriguez, Travis York" -> two authors
	let names = byline ? byline.split(/\s*,\s*|\s+and\s+/) : [];
	if (!names.filter(n => n && n.trim()).length) {
		// the analytics field only ever holds one author, so it is a last resort
		let page = getDatalayer(doc);
		let author = page && page.pageInfo && page.pageInfo.author;
		if (author) names = author.split('|');
	}
	return names
		.map(n => ZU.unescapeHTML(ZU.trimInternal(n || '')))
		.filter(n => n);
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

// the info block reads "10 July 2026" / "3 June 2026" (day is not zero-padded)
function parseInfoDate(str) {
	let m = ZU.trimInternal(str || '').match(/^(\d{1,2}) ([A-Za-z]{3,})\.? (\d{4})$/);
	if (!m) return ZU.strToISO(str || '');
	let month = MONTHS.indexOf(m[2].slice(0, 3).toLowerCase());
	if (month === -1) return '';
	return m[3] + '-' + String(month + 1).padStart(2, '0') + '-' + m[1].padStart(2, '0');
}

function getDate(doc) {
	let date = parseInfoDate(cleanText(doc, '.aa-news-article-info__date'));
	if (date) return date;
	// pageInfo.pubDate is "2026-07-10 12:45:09"; it matched the visible date on every
	// page sampled (2007-2026), so it is a safe fallback when the block is empty
	let page = getDatalayer(doc);
	let pubDate = page && page.pageInfo && page.pageInfo.pubDate;
	return pubDate ? pubDate.slice(0, 10) : '';
}

// attributes.subject is a comma-separated list of paths, most specific first
function getSubjectTag(doc) {
	let page = getDatalayer(doc);
	let subject = page && page.attributes && page.attributes.subject;
	if (!subject) return '';
	let firstPath = subject.split(',')[0].trim();
	if (!firstPath) return '';
	let parts = firstPath.split('/').filter(p => p.trim());
	return parts.length ? ZU.trimInternal(parts[parts.length - 1]) : '';
}

function getSearchResults(doc, checkOnly) {
	let items = {};
	let found = false;
	for (let label of doc.querySelectorAll('.aa-teaser-block__title-label')) {
		let anchor = label.closest('a');
		if (!anchor || !anchor.href.includes('/news/')) continue;
		let title = ZU.trimInternal(label.textContent);
		if (!title) continue;
		if (checkOnly) return true;
		found = true;
		items[anchor.href] = title;
	}
	return found ? items : false;
}

function detectWeb(doc, _url) {
	// the info block exists only on an article page; the "/news" listing and the
	// "News" soft-404 shell do not have it
	if (doc.querySelector('.aa-news-article-info')) return 'magazineArticle';
	if (getSearchResults(doc, true)) return 'multiple';
	return false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) === 'multiple') {
		ZU.processDocuments(Object.keys(getSearchResults(doc, false)), doWeb);
		return;
	}
	scrape(doc, url);
}

function scrape(doc, url) {
	let translator = Zotero.loadTranslator('web');
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	translator.setHandler('itemDone', (_obj, item) => {
		item.itemType = 'magazineArticle';

		let h1 = cleanText(doc, 'h1');
		if (h1) item.title = h1;

		let seen = {};
		item.creators = [];
		for (let name of getBylineNames(doc)) {
			let key = name.toLowerCase();
			if (seen[key]) continue;
			seen[key] = true;
			if (isOrganization(name)) {
				item.creators.push({
					lastName: name,
					creatorType: 'author',
					fieldMode: 1
				});
			}
			else {
				item.creators.push(ZU.cleanAuthor(name, 'author', false));
			}
		}

		let date = getDate(doc);
		if (date) item.date = date;

		// Statement pages use this call to action as og:description.
		if (item.abstractNote && item.abstractNote.trim() === 'Click to read the full statement.') {
			item.abstractNote = '';
		}

		item.publicationTitle = 'American Association for the Advancement of Science';
		if (!item.language) item.language = 'en';

		let canonical = doc.querySelector('link[rel="canonical"]');
		item.url = canonical && canonical.href ? canonical.href : url;

		let subject = getSubjectTag(doc);
		if (subject && !item.tags.some(t => (t.tag || '').toLowerCase() === subject.toLowerCase())) {
			item.tags.push({ tag: subject });
		}

		item.complete();
	});
	translator.translate();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.aaas.org/news/america-has-talent-its-systems-need-better-connections",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "America Has the Talent. Its Systems Need Better Connections",
				"creators": [
					{
						"firstName": "Stephanie",
						"lastName": "Rodriguez",
						"creatorType": "author"
					},
					{
						"firstName": "Travis",
						"lastName": "York",
						"creatorType": "author"
					}
				],
				"date": "2026-07-10",
				"abstractNote": "We can take lessons from past instances of cross-system collaboration and engagement to create a more effective infrastructure for preparing the STEMM workforce needed to meet America’s future challenges.",
				"language": "en",
				"libraryCatalog": "www.aaas.org",
				"publicationTitle": "American Association for the Advancement of Science",
				"url": "https://www.aaas.org/news/america-has-talent-its-systems-need-better-connections",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Scientific workforce"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.aaas.org/news/aaas-comment-omb-proposed-rule",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "AAAS Comment on OMB Proposed Rule",
				"creators": [
					{
						"lastName": "AAAS",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "2026-07-14",
				"abstractNote": "AAAS submitted a public comment on July 13, 2026 to the U.S. Office of Management and Budget regarding the proposed rule: Regulation for Federal Financial Assistance.",
				"language": "en",
				"libraryCatalog": "www.aaas.org",
				"publicationTitle": "American Association for the Advancement of Science",
				"url": "https://www.aaas.org/news/aaas-comment-omb-proposed-rule",
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
		"url": "https://www.aaas.org/news/john-f-kennedy-and-race-moon-looking-back-fifty-years",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "John F. Kennedy and the Race to the Moon: Looking Back Fifty Years",
				"creators": [
					{
						"firstName": "Warren E.",
						"lastName": "Leary",
						"creatorType": "author"
					}
				],
				"date": "2011-05-03",
				"abstractNote": "President John F. Kennedy’s decision to establish the national goal of landing men on the moon 50 years ago was more that of a pragmatic politician than a futuristic space visionary, according to space experts and historians.",
				"language": "en",
				"libraryCatalog": "www.aaas.org",
				"publicationTitle": "American Association for the Advancement of Science",
				"shortTitle": "John F. Kennedy and the Race to the Moon",
				"url": "https://www.aaas.org/news/john-f-kennedy-and-race-moon-looking-back-fifty-years",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Space policy"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.aaas.org/news",
		"detectedItemType": "multiple",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "Golden Goose Award Honors Federally Funded Breakthroughs in Cancer Treatment, Disaster Response, and Everyday Physics",
				"creators": [
					{
						"lastName": "AAAS Office of Communications",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "2026-09-28",
				"abstractNote": "The Golden Goose Award, which spotlights obscure, silly sounding or odd fundamental discovery research that has led to outsized societal benefits, has announced awardees for the 15th annual season.",
				"language": "en",
				"libraryCatalog": "www.aaas.org",
				"publicationTitle": "American Association for the Advancement of Science",
				"url": "https://www.aaas.org/news/golden-goose-award-honors-federally-funded-breakthroughs-cancer-treatment-disaster-response",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			},
			{
				"itemType": "magazineArticle",
				"title": "Statement on Reports about Seizing Political Control of NIH Research",
				"creators": [
					{
						"firstName": "Sudip",
						"lastName": "Parikh",
						"creatorType": "author"
					}
				],
				"date": "2026-09-21",
				"language": "en",
				"libraryCatalog": "www.aaas.org",
				"publicationTitle": "American Association for the Advancement of Science",
				"url": "https://www.aaas.org/news/statement-reports-about-seizing-political-control-nih-research",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			},
			{
				"itemType": "magazineArticle",
				"title": "Science & PINS Prize recognizes work that could prevent blood pressure crises after spinal cord injury",
				"creators": [
					{
						"firstName": "Meagan",
						"lastName": "Phelan",
						"creatorType": "author"
					}
				],
				"date": "2026-07-30",
				"abstractNote": "Jan Elaine Soriano asked a question that researchers had struggled to answer for decades: What if the nervous system could be retrained to stop these dangerous blood pressure surges before they begin?",
				"language": "en",
				"libraryCatalog": "www.aaas.org",
				"publicationTitle": "American Association for the Advancement of Science",
				"url": "https://www.aaas.org/news/science-pins-prize-recognizes-work-could-prevent-blood-pressure-crises-after-spinal-cord",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Neuromodulation"
					}
				],
				"notes": [],
				"seeAlso": []
			},
			{
				"itemType": "magazineArticle",
				"title": "Winner of Chen Institute and Science Prize Uses AI to Rebuild Speech from Brain Signals",
				"creators": [
					{
						"firstName": "Meagan",
						"lastName": "Phelan",
						"creatorType": "author"
					}
				],
				"date": "2026-07-16",
				"abstractNote": "Sergey Stavisky's prize-winning research gave voice to a man living with amyotrophic lateral sclerosis.",
				"language": "en",
				"libraryCatalog": "www.aaas.org",
				"publicationTitle": "American Association for the Advancement of Science",
				"url": "https://www.aaas.org/news/winner-chen-institute-and-science-prize-uses-ai-rebuild-speech-brain-signals",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Artificial intelligence"
					}
				],
				"notes": [],
				"seeAlso": []
			},
			{
				"itemType": "magazineArticle",
				"title": "AAAS Comment on OMB Proposed Rule",
				"creators": [
					{
						"lastName": "AAAS",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "2026-07-14",
				"abstractNote": "AAAS submitted a public comment on July 13, 2026 to the U.S. Office of Management and Budget regarding the proposed rule: Regulation for Federal Financial Assistance.",
				"language": "en",
				"libraryCatalog": "www.aaas.org",
				"publicationTitle": "American Association for the Advancement of Science",
				"url": "https://www.aaas.org/news/aaas-comment-omb-proposed-rule",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			},
			{
				"itemType": "magazineArticle",
				"title": "America Has the Talent. Its Systems Need Better Connections",
				"creators": [
					{
						"firstName": "Stephanie",
						"lastName": "Rodriguez",
						"creatorType": "author"
					},
					{
						"firstName": "Travis",
						"lastName": "York",
						"creatorType": "author"
					}
				],
				"date": "2026-07-10",
				"abstractNote": "We can take lessons from past instances of cross-system collaboration and engagement to create a more effective infrastructure for preparing the STEMM workforce needed to meet America’s future challenges.",
				"language": "en",
				"libraryCatalog": "www.aaas.org",
				"publicationTitle": "American Association for the Advancement of Science",
				"url": "https://www.aaas.org/news/america-has-talent-its-systems-need-better-connections",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Scientific workforce"
					}
				],
				"notes": [],
				"seeAlso": []
			},
			{
				"itemType": "magazineArticle",
				"title": "American Science’s Role in Securing Life, Liberty, and the Pursuit of Happiness",
				"creators": [
					{
						"firstName": "Sudip",
						"lastName": "Parikh",
						"creatorType": "author"
					}
				],
				"date": "2026-07-02",
				"abstractNote": "Science and technology have been an essential component of the American political experiment since the beginning.",
				"language": "en",
				"libraryCatalog": "www.aaas.org",
				"publicationTitle": "American Association for the Advancement of Science",
				"url": "https://www.aaas.org/news/american-sciences-role-securing-life-liberty-and-pursuit-happiness",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			},
			{
				"itemType": "magazineArticle",
				"title": "Prize Winner’s Research Reveals Hidden Role of Microbiota in Mosquito-borne Disease",
				"creators": [
					{
						"firstName": "Walter",
						"lastName": "Beckwith",
						"creatorType": "author"
					}
				],
				"date": "2026-07-02",
				"abstractNote": "Yibin Zhu’s work highlights how microbiota from both the hosts and vectors can either promote or suppress virus transmission.",
				"language": "en",
				"libraryCatalog": "www.aaas.org",
				"publicationTitle": "American Association for the Advancement of Science",
				"url": "https://www.aaas.org/news/prize-winners-research-reveals-hidden-role-microbiota-mosquito-borne-disease",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Mosquitos"
					}
				],
				"notes": [],
				"seeAlso": []
			},
			{
				"itemType": "magazineArticle",
				"title": "A Bright, Sun-splashed Future for Renewable Energy",
				"creators": [
					{
						"firstName": "Matthew",
						"lastName": "Wright",
						"creatorType": "author"
					}
				],
				"date": "2026-06-03",
				"abstractNote": "Combined, this year’s winners have more than a century’s worth of experience fostering the advancement of renewable energy, in both government and private enterprise.",
				"language": "en",
				"libraryCatalog": "www.aaas.org",
				"publicationTitle": "American Association for the Advancement of Science",
				"url": "https://www.aaas.org/news/bright-sun-splashed-future-renewable-energy",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Solar energy"
					}
				],
				"notes": [],
				"seeAlso": []
			},
			{
				"itemType": "magazineArticle",
				"title": "AAAS Statement on OMB Rule Politicizing Federal Grantmaking",
				"creators": [
					{
						"firstName": "Sudip",
						"lastName": "Parikh",
						"creatorType": "author"
					}
				],
				"date": "2026-06-02",
				"language": "en",
				"libraryCatalog": "www.aaas.org",
				"publicationTitle": "American Association for the Advancement of Science",
				"url": "https://www.aaas.org/news/aaas-statement-omb-rule-politicizing-federal-grantmaking",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Science policy"
					}
				],
				"notes": [],
				"seeAlso": []
			},
			{
				"itemType": "magazineArticle",
				"title": "AAAS Letter: NSF Confirmation Hearing Overdue",
				"creators": [
					{
						"firstName": "Sudip",
						"lastName": "Parikh",
						"creatorType": "author"
					}
				],
				"date": "2026-05-21",
				"language": "en",
				"libraryCatalog": "www.aaas.org",
				"publicationTitle": "American Association for the Advancement of Science",
				"shortTitle": "AAAS Letter",
				"url": "https://www.aaas.org/news/aaas-letter-nsf-confirmation-hearing-overdue",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Science policy"
					}
				],
				"notes": [],
				"seeAlso": []
			},
			{
				"itemType": "magazineArticle",
				"title": "AAAS Statement on Dismissal of National Science Board",
				"creators": [
					{
						"firstName": "Sudip",
						"lastName": "Parikh",
						"creatorType": "author"
					}
				],
				"date": "2026-04-26",
				"language": "en",
				"libraryCatalog": "www.aaas.org",
				"publicationTitle": "American Association for the Advancement of Science",
				"url": "https://www.aaas.org/news/aaas-statement-dismissal-national-science-board",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Science policy"
					}
				],
				"notes": [],
				"seeAlso": []
			},
			{
				"itemType": "magazineArticle",
				"title": "Andrew Black named chief operating officer of AAAS",
				"creators": [
					{
						"firstName": "Becky",
						"lastName": "Ham",
						"creatorType": "author"
					}
				],
				"date": "2026-04-20",
				"abstractNote": "As COO, Black will be responsible for stewarding the day-to-day operations of the organization in close coordination with the executive leadership team.",
				"language": "en",
				"libraryCatalog": "www.aaas.org",
				"publicationTitle": "American Association for the Advancement of Science",
				"url": "https://www.aaas.org/news/andrew-black-named-chief-operating-officer-aaas",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Science policy"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://aaas.org/news/aaas-comment-omb-proposed-rule",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "AAAS Comment on OMB Proposed Rule",
				"creators": [
					{
						"lastName": "AAAS",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "2026-07-14",
				"abstractNote": "AAAS submitted a public comment on July 13, 2026 to the U.S. Office of Management and Budget regarding the proposed rule: Regulation for Federal Financial Assistance.",
				"language": "en",
				"libraryCatalog": "www.aaas.org",
				"publicationTitle": "American Association for the Advancement of Science",
				"url": "https://www.aaas.org/news/aaas-comment-omb-proposed-rule",
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
		"url": "https://www.aaas.org/news/2013-aaas/subaru-sbf-winners-announced",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "2013 AAAS/Subaru SB&F Winners Announced",
				"creators": [
					{
						"lastName": "AAAS Staff",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "2013-01-15",
				"abstractNote": "Four science books exploring the diversity of the ocean’s food chain, the life and work of autism expert Temple Grandin, four citizen science projects, and the memorable recounting of the struggle to save a Hawaiian monk seal pup named Ho’ailona (“KP2”) earned top honors in the 2013 AAAS/Subaru Science Books & Film (SB&F) competition.",
				"language": "en",
				"libraryCatalog": "www.aaas.org",
				"publicationTitle": "American Association for the Advancement of Science",
				"url": "https://www.aaas.org/news/2013-aaas/subaru-sbf-winners-announced",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Scientific literacy"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
