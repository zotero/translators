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
	"lastUpdated": "2023-04-11 10:35:51"
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

	// Also skip the individual issue pages. This can only be done by
	// inspecting the document.
	if (doc.querySelector("body.node-type-issue")) {
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
		// exclude based on URL/title alone.
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

	if (doc.querySelector("body.node-type-voices-in-time")) {
		// Voices in Time
		let tmp = ZU.trimInternal(text(doc, ".title .date")); // Original date
		if (tmp) {
			item.originalDate = tmp;
		}

		tmp = getVITRightsTrans(doc); // Rights and translators
		if (tmp) {
			if (tmp.rights) {
				item.rights = tmp.rights;
			}
			if (tmp.translators) { // could be undefined
				item.creators.push(...tmp.translators);
			}
		}

		tmp = getVITAboutText(doc); // "About the text" or brief bio of author
		if (tmp) {
			item.notes = [tmp];
		}
	}

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

// Get the rights and translator info for Voices in Time if any.
function getVITRightsTrans(doc) {
	const paragraphs = doc.querySelectorAll(".content-wrapper > p");
	if (!paragraphs.length) {
		return false;
	}

	const str
		= ZU.trimInternal(paragraphs.item(paragraphs.length - 1).textContent);

	if (str) {
		const infoObj = {};

		// . [optional words ](C) yyyy[ by name] ... (full stop)
		let match = str.match(/(?:^|\.\s+)((?:\w+\s+)*©\s+\d+.+?\.)/im);
		if (match) {
			infoObj.rights = match[1];
		}

		// Translator. "Translated by ... [stop or semicolon]"
		match = str.match(/(?:^|\.\s+)translated by (.+?)[.;]/i);
		if (match) {
			const transArray = parseAuthors(match[1], "translator");
			if (transArray.length) {
				infoObj.translators = transArray;
			}
		}

		return infoObj;
	}

	return false;
}

// Get the text block under "About this text" for Voices in Time. The block is
// present even if the text has no identifiable author.
function getVITAboutText(doc) {
	const paragraphs = doc.querySelectorAll(".bio-block > p");
	if (!paragraphs.length) {
		return "";
	}

	const output = [];
	for (const paragraph of paragraphs.values()) {
		output.push(ZU.trimInternal(paragraph.textContent.trim()));
	}
	// Re-inserting paragraph-ending line breaks and add extra line break
	// between paragraphs.
	return output.join("\n\n");
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
	// Take the author's byline from the "Contributor" block, which is more
	// cumbersome but also more reliable than the byline at ".title .author".
	let byline = text(doc,
		'.banner-block a[href^="/contributors/"]' // usual place
		+ ', .bio-heading a[href^="/contributors/"]' // "voices in time"
	);

	if (!byline) {
		// Just in case the above didn't work, try this more obvious but less
		// generic one.
		byline = text(doc, ".title .author"); // Could be p or h2 element.

		// NOTE: failure mode: None of the selectors can locate the element.
		if (!byline) return "";

		// Remove any initial "By ..."
		byline = byline.replace(/^(By\s+)?/i, "");
	}

	const authorText = ZU.trimInternal(byline);

	if (authorText === "Lapham’s Quarterly") {
		// Skip adding author info when the "author" is the same as the
		// publisher.
		return "";
	}

	return authorText;
}

// Podcasts
function applyPodcast(doc, item) {
	const podPublication = text(doc, ".title > h1");
	item.seriesTitle = podPublication;
	// Date text uses the same DOM element as it is on blog articles.
	item.date = getBlogPostDate(doc);
	let t = getPodDuration(doc);
	if (!Number.isNaN(t)) {
		item.runningTime = t;
	}

	const mainAudioSelector = ".top-image-block audio > source";
	const epURL = attr(doc, mainAudioSelector, "src");
	item.audioFileType = attr(doc, mainAudioSelector, "type");

	item.abstractNote = attr(doc, "meta[name='description']", "content");

	const headingText = text(doc, ".title > h2");
	if (podPublication.toLowerCase() === "the world in time") {
		// The EiC's own podcast.
		item.creators = [ZU.cleanAuthor("Lewis H. Lapham", "author")];
		item.title = headingText;
		// Extract episode number
		const epMatch = epURL.match(/episode-(\d+)-/i);
		if (epMatch) {
			item.episodeNumber = parseInt(epMatch[1]);
		}

		const guestName = inferEiCPodGuest(doc, headingText, epURL);
		if (guestName) {
			item.creators.push(ZU.cleanAuthor(guestName, "guest"));
		}
	}
	else if (podPublication.toLowerCase() === "lq podcast") {
		// The metadata for "LQ Podcast" is more difficult to obtain. The
		// naming scheme is more diverse, and even if we're tempted to parse
		// the audio filename for author info, see this for how it may not
		// work: https://www.laphamsquarterly.org/content/poes-terror-soul
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

// Get the duration of episode as a string. This can return NaN if the duration
// cannot be scraped from the doc.
function getPodDuration(doc) {
	const currTime = text(doc, ".jp-current-time");
	const remainTime = text(doc, ".jp-duration"); // Negative value.
	return timeToDuration(parseTime(currTime) - parseTime(remainTime));
}

// Parse mm:ss time duration string as number of seconds. Returns NaN if the
// input string does not match the expected format.
function parseTime(str) {
	const strTimeMatch = str.match(/(-?\d+):(\d+)/);
	if (!strTimeMatch) {
		return NaN;
	}
	let [, m, s] = strTimeMatch;
	s = parseInt(s);
	let t = parseInt(m) * 60;
	t += t > 0 ? s : -s;
	return t;
}

// Convert number of seconds to duration string in h:mm:ss format.
function timeToDuration(s) {
	let h = 0;
	let m = Math.floor(s / 60);
	s %= 60;
	if (m > 59) {
		h = Math.floor(m / 60);
		m %= 60;
	}
	m = zeroPad(m, 2);
	s = zeroPad(s, 2);
	return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
}

// Zero-pad an integer up to length.
function zeroPad(num, length) {
	return ZU.lpad(`${num}`, "0", length);
}

// Find the name of the guest in Lewis Lapham's podcast episode.
// NOTE: Usually the title is the guest's name, but not always.
// See: https://www.laphamsquarterly.org/content/vicars-christ, where the title
// is "Vicars of Christ".
// Therefore we try to infer the name using heuristics:
// 1. "The name often appears in the main-content paragraphs containing the
// words '[Lewis H.] Lapham (verb, speaks/talks) with [title] NAME [punct or
// 'about', but also possibly more noisy words]"
// 2. "It is very likely to be in the title."
// 3. "But if not 2, the name may also appear in the audio source file's name
// in the URL."
function inferEiCPodGuest(doc, headingText, epURL) {
	// Take the basename of the episode audio without the last file extension.
	// .../url/path/to/(basename).ext?query#frag
	let [, epSource] = epURL.match(/^(?:.+\/)(.+)(?:\..+)$/);

	// Try to find name candidate by parsing the paragraph text.
	const paragraphs = doc.querySelectorAll(".jp-jplayer ~ p");

	let nameCandidate;
	if (paragraphs) {
		const textString = Array.from(paragraphs)
			.map(x => ZU.trimInternal(x.textContent.trim()))
			.join(" ");
		// [Lewis[ H.] ]Lapham [verb] with (noisy name candidate)[, or about ]
		// Note here "noisy name candidate" matches leniently, but
		// non-greedily. Otherwise the group will match all the way to the last
		// comma punct or "about".
		const nameMatch = textString
			.match(/(?:Lewis(?: H\.)? )Lapham \S+ with ([\S ]+?)(?:,| about)/);
		if (nameMatch) {
			nameCandidate = nameMatch[1];
		}
	}

	// If no useful name candidate is extracted, here's our last ditch effort:
	// fall back to using the episode file name alone (this is the case for
	// some old episodes).
	if (!nameCandidate) {
		return epSource.replace(/_/g, " ");
	}

	if (nameCandidate.toLowerCase().includes(headingText.toLowerCase())) {
		// Name candidate (possibly surrounded by noise) is in title: This
		// means the title can be taken to be the guest's name with high
		// confidence.
		return headingText;
	}
	else {
		// Name candidate found but not in title. In this case, use to the
		// audio file's name as a filter to clean up name candidate.
		// So we need to case-normalize the episode filename.
		epSource = epSource.toLowerCase();

		// Generate "token stream" from name candidate, e.g.
		// "Johann Sebastian Bach" -> ["Johann", "Sebastian", "Bach"]
		// "Vita Sackerville-West" -> ["Vita", "Sackerville-West"]
		const tokens = nameCandidate.split(" ");
		const filteredTokens = []; // output
		for (const token of tokens) {
			// Token may contain punct such as period or comma as "noise"
			// around the word, and apostrophe as internal "noise", but careful
			// not to overgeneralize (TODO: replace any dash with one single
			// minus-sign-hyphen (0x2D)?). Also, need to normalize and remove
			// the diacritics.
			const cleanToken
				= token
				.normalize("NFD")
				.replace(/[\u0300-\u036F]/g, "") // Most of diacritics
				.toLowerCase()
				.split("") // to remove noisy puncts
				.filter(x => !(x === "." || x === ","
					|| x === "'" || x === "’"))
				.join("");

			// Note that we use clean token for logic but original token
			// for output.
			if (epSource.includes(cleanToken)) {
				filteredTokens.push(token);
			}
		}
		return filteredTokens.join(" ");
	}
}

// Utility functions

// Process author. Parse it as "[possibly Oxford] comma-separated, possibly
// with the word 'and'".
function parseAuthors(str, authorType = "author") {
	return str.split(/(?:,|\s+and\s+)/)
		.map(s => s.trim())
		.filter(Boolean)
		.map(s => ZU.cleanAuthor(s, authorType));
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
	},
	{
		"type": "web",
		"url": "https://www.laphamsquarterly.org/content/paradise-city",
		"items": [
			{
				"itemType": "podcast",
				"title": "To the Paradise City",
				"creators": [
					{
						"firstName": "Lewis H.",
						"lastName": "Lapham",
						"creatorType": "author"
					},
					{
						"firstName": "Brook",
						"lastName": "Wilensky-Lanford",
						"creatorType": "guest"
					}
				],
				"abstractNote": "Lewis Lapham talks with author Brook Wilensky-Lanford about the search for Adam and Eve’s hometown.",
				"audioFileType": "audio/mpeg",
				"language": "en",
				"runningTime": "16:27",
				"seriesTitle": "The World in Time",
				"url": "https://www.laphamsquarterly.org/content/paradise-city",
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
		"url": "https://www.laphamsquarterly.org/content/death-nothing-us",
		"items": [
			{
				"itemType": "podcast",
				"title": "Death Is Nothing to Us",
				"creators": [
					{
						"firstName": "Lewis H.",
						"lastName": "Lapham",
						"creatorType": "author"
					},
					{
						"firstName": "Stephen",
						"lastName": "Greenblatt",
						"creatorType": "guest"
					}
				],
				"abstractNote": "Historian Stephen Greenblatt writes of “the concentrated force of the buried past” in The Swerve, his 2011 National Book Award winner in nonfiction.",
				"audioFileType": "audio/mpeg",
				"language": "en",
				"runningTime": "20:05",
				"seriesTitle": "The World in Time",
				"url": "https://www.laphamsquarterly.org/content/death-nothing-us",
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
		"url": "https://www.laphamsquarterly.org/content/roosevelt-montas",
		"items": [
			{
				"itemType": "podcast",
				"title": "Roosevelt Montás",
				"creators": [
					{
						"firstName": "Lewis H.",
						"lastName": "Lapham",
						"creatorType": "author"
					},
					{
						"firstName": "Roosevelt",
						"lastName": "Montás",
						"creatorType": "guest"
					}
				],
				"abstractNote": "“In my sophomore year of high school, I came upon a remarkable book in a garbage pile next to the house where we rented an apartment in Queens,” scholar Roosevelt Montás writes at the beginning of Rescuing Socrates: How the Great Books Changed My Life and Why They Matter for a New Generation. “It was the second volume of the pretentiously bound Harvard Classics series, and it",
				"audioFileType": "audio/mpeg",
				"episodeNumber": 85,
				"language": "en",
				"runningTime": "32:19",
				"seriesTitle": "The World in Time",
				"url": "https://www.laphamsquarterly.org/content/roosevelt-montas",
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
		"url": "https://www.laphamsquarterly.org/content/andrew-j-oshaughnessy",
		"items": [
			{
				"itemType": "podcast",
				"title": "Andrew J. O’Shaughnessy",
				"creators": [
					{
						"firstName": "Lewis H.",
						"lastName": "Lapham",
						"creatorType": "author"
					},
					{
						"firstName": "Andrew J.",
						"lastName": "O’Shaughnessy",
						"creatorType": "guest"
					}
				],
				"abstractNote": "“Existing biographies of Thomas Jefferson,” the historian Andrew J. O’Shaughnessy writes in The Illimitable Freedom of the Human Mind: Thomas Jefferson’s Idea of a University, treat the retired president’s singular founding of a university “as merely an epilogue, while institutional histories give little consideration to the biographical context…Beginning at the age of",
				"audioFileType": "audio/mpeg",
				"episodeNumber": 84,
				"language": "en",
				"runningTime": "32:41",
				"seriesTitle": "The World in Time",
				"url": "https://www.laphamsquarterly.org/content/andrew-j-oshaughnessy",
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
		"url": "https://www.laphamsquarterly.org/freedom/andrey-kurkov-picks-his-pen",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "Andrey Kurkov Picks Up His Pen",
				"creators": [
					{
						"firstName": "Andrey",
						"lastName": "Kurkov",
						"creatorType": "author"
					}
				],
				"date": 2023,
				"ISSN": "1935-7494",
				"abstractNote": "On the freedom to write in Ukraine.",
				"issue": 1,
				"language": "en",
				"libraryCatalog": "Lapham's Quarterly",
				"publicationTitle": "Lapham’s Quarterly",
				"rights": "Copyright © 2022 by Andrey Kurkov.",
				"url": "https://www.laphamsquarterly.org/freedom/andrey-kurkov-picks-his-pen",
				"volume": 15,
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [
					"From a speech delivered at the PEN World Voices Festival. The son of a doctor and a pilot, Kurkov trained as a Japanese translator and began writing novels while serving as a prison guard in Odesa. His novel Grey Bees, which he wrote after meeting refugees in Kyiv who made regular trips to the Donbas to deliver medicine, depicts the 2014 war through the perspective of a beekeeper. “For Ukrainians, freedom is more important than stability,” Kurkov said in a March 2022 interview. “For Russians, it is the opposite. Ukrainians change their presidents at each election, Russians keep their tsar until the tsar is dead.”"
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.laphamsquarterly.org/freedom/we-refuse-logic",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "We Refuse This Logic",
				"creators": [
					{
						"firstName": "Arlen",
						"lastName": "Austin",
						"creatorType": "translator"
					}
				],
				"date": 2023,
				"ISSN": "1935-7494",
				"abstractNote": "The problem is not abortion.",
				"issue": 1,
				"language": "en",
				"libraryCatalog": "Lapham's Quarterly",
				"publicationTitle": "Lapham’s Quarterly",
				"rights": "Translation copyright © 2022 by Arlen Austin.",
				"url": "https://www.laphamsquarterly.org/freedom/we-refuse-logic",
				"volume": 15,
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [
					"Movimento di Lotta Femminile di Padova, from “Pregnancy and Abortion.” In June 1971 Mariarosa Dalla Costa, who had been active in the Italian workers’ movement, convened a meeting in Padua to discuss demanding wages for housework. The meeting led to the formation of what came to be called Lotta Femminista, which produced pamphlets, conducted studies, and documented its militant activity. This manifesto was later published in Dalla Costa and Selma James’ book The Power of Women and the Subversion of the Community."
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.laphamsquarterly.org/youth/sweet-and-cold",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "Sweet and Cold",
				"creators": [
					{
						"firstName": "Xu",
						"lastName": "Wei",
						"creatorType": "author"
					},
					{
						"firstName": "Jonathan",
						"lastName": "Chaves",
						"creatorType": "translator"
					}
				],
				"date": 2014,
				"ISSN": "1935-7494",
				"abstractNote": "What a shame that I have carried a boy, as he ate some candy, to his death.",
				"issue": 3,
				"language": "en",
				"libraryCatalog": "Lapham's Quarterly",
				"publicationTitle": "Lapham’s Quarterly",
				"rights": "© 1986, Columbia University Press.",
				"url": "https://www.laphamsquarterly.org/youth/sweet-and-cold",
				"volume": 7,
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [
					"“A Kite.” After failing the civil-service examination on eight occasions, Xu became the personal secretary to a military commander in 1558 and assisted in defending his hometown from the attacks of Japanese pirates. After his patron’s downfall and death, he was faced with serious professional difficulties and, either insane or faking it effectively, attempted suicide by pushing an awl through his ear and pounding his testicles with a hammer. Later, he killed his third wife and went to prison but won release after seven years."
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
