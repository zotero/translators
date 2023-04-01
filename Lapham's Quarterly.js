{
	"translatorID": "e329ec79-397e-4aa5-a06e-1aa32f10a138",
	"label": "Lapham's Quarterly",
	"creator": "Zoë C. Ma",
	"target": "^https?://www\\.laphamsquarterly\\.org/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-04-01 05:26:35"
}

/*
	***** BEGIN LICENSE BLOCK *****
	Copyright © 2023 Zoë C. Ma

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
	const urlObj = new URL(url);
	// About pages, legal notes, content listings, event notices... or
	// content pages without identifiable author, or fragmentary quotations of
	// historical materials.
	const skipPath = /^\/(about|legal|issues|archive|contributors|conversations|lq-interactives|outreach|programs|events|world-in-time|deja-vu)/;
	if (urlObj.pathname.match(skipPath)) {
		return false;
	}

	// Also skip pages from magazine sections that has no usable author
	// info. (Maps, Miscellany, charts and graphs, etc.).
	const skipSection = /^\/.+\/(maps|miscellany|charts-graphs)\/.+/;
	if (urlObj.pathname.match(skipSection)) {
		return false;
	}

	// Also skip "voices in time" (excerpts of historical materials) and
	// the individual issue pages. This can only be done by inspecting the
	// document.
	if (doc.querySelector("body.node-type-voices-in-time, body.node-type-issue")) {
		return false;
	}

	if (urlObj.pathname.match(/^\/search\/node\/.+/)) {
		// Search results.
		if (getSearchResults(doc, true)) {
			return "multiple";
		}
		else {
			return false;
		}
	}

	if (doc.querySelector("body.node-type-podcast")) {
		return "podcast";
	}

	if (doc.querySelector("body.section-roundtable")) {
		return "blogPost";
	}

	return "magazineArticle";
}

async function doWeb(doc, url) {
	if (detectWeb(doc, url) == 'multiple') {
		const items = await Z.selectItems(getSearchResults(doc, false));
		if (!items) return;
		for (const url of Object.keys(items)) {
			await scrape(await requestDocument(url));
		}
	}
	else {
		await scrape(doc, url);
	}
}

function getSearchResults(doc, checkOnly = false) {
	const resultElems = doc.querySelectorAll(".search-results .search-result"); // Lovely semantics!
	if (!resultElems.length) return false;

	// Title string -> array of URLs.
	const titleMap = new Map();
	// While collecting title -> URL mapping for possible duplicate titles,
	// check for duplicate URLs too, though this is unlikely. If it does
	// happen, the first one in the document order takes precedence.
	const hrefsSeen = new Set();
	for (const elem of resultElems) {
		const href = attr(elem, "h3 > a", "href");
		const title = text(elem, "h3 > a");

		if (href && !hrefsSeen.has(href) && title) {
			if (checkOnly) return true;

			hrefsSeen.add(href);
			// Title may contain duplicates even if the links are
			// unique. In other words, one title may be associated with
			// multiple (i.e. an array of) URLs.
			if (!titleMap.has(title)) {
				titleMap.set(title, []);
			}
			titleMap.get(title).push(href);
		}
	}

	// If the same title text is associated with multiple URLs, add a
	// parenthesized number showing the order of the title's appearance in the
	// search results.
	const items = {};
	// Map conveniently maintains insertion order.
	for (const [title, hrefArray] of titleMap) {
		const hasDup = hrefArray.length > 1;
		for (const [i, href] of hrefArray.entries()) {
			items[href] = !hasDup
				? title
				: `${title} (${i + 1}, URL: ${(new URL(href)).pathname})`;
		}
	}

	return hrefsSeen.size && items;
}

async function scrape(doc, url = doc.location.href) {
	const type = detectWeb(doc, url);
	if (!type) {
		// This could happen if the user selects an item from the
		// multiple, but that item happens to be something we cannot
		// exclude based on URL/title alone (such as the Voices in Time
		// pages).
		Z.debug(`scrape function encountered mismatched type ${type} for ${url}`);
		return;
	}

	const item = new Z.Item(type);
	item.url = url;
	item.language = attr(doc, "html", "lang");
	item.attachments = [];

	switch (type) {
		case "magazineArticle":
			await applyMagazine(doc, item);
			break;
		case "blogPost":
			applyBlog(doc, item);
			break;
		case "podcast":
			applyPodcast(doc, item);
			break;
	}

	item.attachments.push({
		document: doc,
		title: "Snapshot",
		mimeType: "text/html"
	});

	item.complete();
}

// Magazine articles. This will always be async even if the async task is not
// performed, in the (unlikely) case when the issue-info URL to be scraped is
// not found on the article page.
async function applyMagazine(doc, item) {
	item.ISSN = "1935-7494";
	item.publicationTitle = "Lapham’s Quarterly";
	item.title = text(doc, "#page-title");

	item.creators = parseAuthors(getArticleAuthorText(doc));

	const excerpt = text(doc, ".excerpt");
	if (excerpt) item.abstractNote = excerpt;

	const issueRelURL = attr(doc, ".sticky-content > a", "href");
	if (!issueRelURL) {
		Z.debug(`Article at ${item.url} missing the link to its issue.`);
		return undefined;
	}

	const issueURL = (new URL(issueRelURL, doc.location)).href;
	return setIssueDate(issueURL, item);
}

// Cache for the issue info. Keys are the permalinks to the issue-page URLs,
// and values are the corresponding issue info returned by
// fetchIssueDateInfo().  This is to avoid repeated network requests for the
// same document when saving multiple items.
const _issueCache = new Map();

async function setIssueDate(url, item) {
	let value;
	if (_issueCache.has(url)) {
		value = _issueCache.get(url);
	}
	else {
		value = await fetchIssueDateInfo(url);
		if (value) {
			_issueCache.set(url, value);
		}
	}
	Object.assign(item, value);
}

async function fetchIssueDateInfo(url) {
	let doc;
	try {
		doc = await requestDocument(url);
	}
	catch (err) {
		Z.debug(`Failed to request ${url} for issue/date info.`);
		return null;
	}

	let dateText = text(doc, "p.date");
	if (!dateText) {
		Z.debug(`Issue/date info unexpectedly missing at ${url}`);
		return null;
	}

	dateText = ZU.trimInternal(dateText);

	// dateText should look like the following:
	// "Volume XIV, Number 4 | [season/month-range] 2022".
	// Convert it into array like ["XIV", "4", "2022"]
	const [volume, number, year] = dateText.split(/[,|]/)
		.map(x => x.trim().split(" ")[1]);
	return {
		volume: romanToInt(volume),
		issue: parseInt(number),
		date: parseInt(year)
	};
}

// Blog articles.
function applyBlog(doc, item) {
	// Blog-article title proper
	item.title = text(doc, ".title > h2");
	item.creators = parseAuthors(getArticleAuthorText(doc));
	item.date = getBlogPostDate(doc);
	// blogTitle refers to the name of the blog hosted by Lapham's.
	item.blogTitle = text(doc, "#page-title");
}

function getBlogPostDate(doc) {
	const dateText = text(doc, ".pub-date");
	return !!dateText && (new Date(dateText)).toISOString();
}

// Returns the author string (for magazine article or blog post).
function getArticleAuthorText(doc) {
	const byline = text(doc, ".author"); // Could be p or h2 element.
	if (!byline) return "";
	return ZU.trimInternal(byline).replace(/^By\s+/i, "");
}

// Podcasts
function applyPodcast(doc, item) {
	const podPublication = text(doc, ".title > h1");
	item.seriesTitle = podPublication;
	// Date text uses the same DOM element as it is on blog articles.
	item.date = getBlogPostDate(doc);
	item.runningTime = getPodDuration(doc);

	const mainAudioSelector = ".top-image-block audio > source";
	const epURL = attr(doc, mainAudioSelector, "src");
	item.audioFileType = attr(doc, mainAudioSelector, "type");
	item.abstractNote = attr(doc, "meta[name='description']", "content");

	const headingText = text(doc, ".title > h2");
	if (podPublication.toLowerCase() === "the world in time") {
		// The EiC's own podcast.
		item.creators = [ZU.cleanAuthor("Lewis H. Lapham", "author")];
		// The page heading text is the guest's name.
		item.creators.push(ZU.cleanAuthor(headingText, "guest"));
		item.title = headingText;
		// Extract episode number
		const ep = epURL.match(/episode-(\d+)-/i)[1];
		item.episodeNumber = parseInt(ep);
	}
	else if (podPublication.toLowerCase() === "lq podcast") {
		// The metadata for "LQ Podcast" is more difficult to obtain.
		const [, ep, title] = headingText.match(/#(\d+)\s+(.+)/i);
		item.episodeNumber = parseInt(ep);
		item.title = title;
	}

	item.attachments.push({
		title: "Audio",
		mimeType: item.audioFileType,
		url: epURL,
	});
}

// Get the duration of episode as a string.
function getPodDuration(doc) {
	const currTime = text(doc, ".jp-current-time");
	const remainTime = text(doc, ".jp-duration"); // Negative value.
	return timeToDuration(parseTime(currTime) - parseTime(remainTime));
}

// Parse mm:ss time duration string as number of seconds.
function parseTime(str) {
	const [, mm, ss] = str.match(/(-?\d+):(\d+)/);
	const s = parseInt(ss);
	let t = parseInt(mm) * 60;
	t += t > 0 ? s : -s;
	return t;
}

// Convert number of seconds to duration string in h:m:s format.
function timeToDuration(s) {
	let h = 0;
	let m = Math.floor(s / 60);
	s %= 60;
	if (m > 59) {
		h = Math.floor(m / 60);
		m %= 60;
	}
	return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
}

// Utility functions

// Process author. Parse it as "[possibly Oxford] comma-separated, possibly
// with the word 'and'".
function parseAuthors(str) {
	return str.split(/(?:,|\s+and\s+)/)
		.map(s => s.trim())
		.filter(Boolean)
		.map(s => ZU.cleanAuthor(s, "author"));
}

// Convert from Roman numeral to integer. Note that the function assumes a
// correctly formed Roman numeral using letters up to C.
const ROMAN_NUMERAL = {
	I: 1,
	V: 5,
	X: 10,
	L: 50,
	C: 100 // "D" and "M" unlikely to be encountered any time soon.
};

function romanToInt(str) {
	return str.split("")
		.map(i => ROMAN_NUMERAL[i.toUpperCase()])
		.reduce((sum, curValue, cur, arr) => {
			const prev = cur - 1;
			const trySum = sum + curValue;
			if (cur > 0 && arr[prev] < curValue) {
				// Should subtract instead of add.
				return trySum - arr[prev] * 2;
			}
			return trySum;
		}, 0);
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.laphamsquarterly.org/search/node/mesopotamian",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.laphamsquarterly.org/education/schoolboy-where-are-you-going",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "Schoolboy, Where Are You Going?",
				"creators": [
					{
						"firstName": "Moudhy",
						"lastName": "Al-Rashid",
						"creatorType": "author"
					}
				],
				"date": 2022,
				"ISSN": "1935-7494",
				"abstractNote": "Scribal education in the ancient Mesopotamian tablet house.",
				"issue": 4,
				"language": "en",
				"libraryCatalog": "Lapham's Quarterly",
				"publicationTitle": "Lapham’s Quarterly",
				"url": "https://www.laphamsquarterly.org/education/schoolboy-where-are-you-going",
				"volume": 14,
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
		"url": "https://www.laphamsquarterly.org/roundtable/double-vision",
		"items": [
			{
				"itemType": "blogPost",
				"title": "Double Vision",
				"creators": [
					{
						"firstName": "Frank",
						"lastName": "Gonzalez-Crussi",
						"creatorType": "author"
					}
				],
				"date": "2023-03-14T16:00:00.000Z",
				"blogTitle": "Roundtable",
				"language": "en",
				"url": "https://www.laphamsquarterly.org/roundtable/double-vision",
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
		"url": "https://www.laphamsquarterly.org/roundtable/ancient-mesopotamian-tablet-cookbook",
		"items": [
			{
				"itemType": "blogPost",
				"title": "The Ancient Mesopotamian Tablet as Cookbook",
				"creators": [
					{
						"firstName": "Gojko",
						"lastName": "Barjamovic",
						"creatorType": "author"
					},
					{
						"firstName": "Patricia Jurado",
						"lastName": "Gonzalez",
						"creatorType": "author"
					},
					{
						"firstName": "Chelsea A.",
						"lastName": "Graham",
						"creatorType": "author"
					},
					{
						"firstName": "Agnete W.",
						"lastName": "Lassen",
						"creatorType": "author"
					},
					{
						"firstName": "Nawal",
						"lastName": "Nasrallah",
						"creatorType": "author"
					},
					{
						"firstName": "Pia M.",
						"lastName": "Sörensen",
						"creatorType": "author"
					}
				],
				"date": "2019-06-10T16:00:00.000Z",
				"blogTitle": "Roundtable",
				"language": "en",
				"url": "https://www.laphamsquarterly.org/roundtable/ancient-mesopotamian-tablet-cookbook",
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
		"url": "https://www.laphamsquarterly.org/content/peter-s-goodman",
		"items": [
			{
				"itemType": "podcast",
				"title": "Peter S. Goodman",
				"creators": [
					{
						"firstName": "Lewis H.",
						"lastName": "Lapham",
						"creatorType": "author"
					},
					{
						"firstName": "Peter S.",
						"lastName": "Goodman",
						"creatorType": "guest"
					}
				],
				"abstractNote": "“Davos Man’s domination of the gains of globalization,” journalist Peter S. Goodman writes in Davos Man: How the Billionaires Devoured the World, “is how the United States found itself led by a patently unqualified casino developer as it grappled with a public health emergency that killed more Americans than those who died in World War I, World War II, and the Vietnam War",
				"audioFileType": "audio/mpeg",
				"episodeNumber": 87,
				"language": "en",
				"runningTime": "35:51",
				"seriesTitle": "The World in Time",
				"url": "https://www.laphamsquarterly.org/content/peter-s-goodman",
				"attachments": [
					{
						"title": "Audio",
						"mimeType": "audio/mpeg"
					},
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
		"url": "https://www.laphamsquarterly.org/content/soviets-spies",
		"items": [
			{
				"itemType": "podcast",
				"title": "Soviets & Spies",
				"creators": [],
				"abstractNote": "Did an Englishman assist in the murder of Rasputin? Did a man knowns as the “Ace of Spies” almost carry off the assassination of the entire Bolshevik power structure? Did British agents really use semen as an invisible ink? Giles Milton, author of Russian Roulette: How British Spies Thwarted Lenin's Plot for Global Revolution, has the answers.",
				"audioFileType": "audio/mpeg",
				"episodeNumber": 61,
				"language": "en",
				"runningTime": "43:42",
				"seriesTitle": "LQ Podcast",
				"url": "https://www.laphamsquarterly.org/content/soviets-spies",
				"attachments": [
					{
						"title": "Audio",
						"mimeType": "audio/mpeg"
					},
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
