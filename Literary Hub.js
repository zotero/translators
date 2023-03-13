{
	"translatorID": "f1aaf4bf-f344-41ee-b960-905255d40d53",
	"label": "Literary Hub",
	"creator": "Zoë C. Ma",
	"target": "^https?://lithub\\.com/(?!(?:category|tag|masthead|about-literary-hub|privacy-policy-for-literary-hub-crimereads-and-book-marks)/).+",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-03-12 13:21:48"
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
	const searchValue = urlObj.searchParams.get("s");
	if (urlObj.pathname === "/") { // On search page (i.e. site base URL).
		if (!searchValue) {
			// Empty search (searchValue is empty string) or a page
			// on the expected path but without the required
			// search-query parameter; skip content check and
			// reject directly.
			return false;
		}
		if (getSearchResults(doc, true)) {
			return "multiple";
		}
		else {
			return false;
		}
	}
	// Not on search page.
	if (doc.querySelector("div.post_wrapper")) {
		const tags = getTags(doc);
		if (tags && tags.includes("podcasts")) {
			return "podcast";
		}
		return "blogPost";
	}
	return false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) === "multiple") {
		Zotero.selectItems(getSearchResults(doc, false), (items) => {
			if (items) {
				ZU.processDocuments(Object.keys(items), scrape);
			}
		});
	}
	else {
		scrape(doc, url);
	}
}

function getSearchResults(doc, checkOnly) {
	const resultElems = doc.querySelectorAll("div.search .post_header a");
	const rawResultLength = resultElems.length;
	if (!rawResultLength) return false;

	const items = {};
	let isNonEmpty = false;
	for (let i = 0; i < rawResultLength; i++) {
		const anchor = resultElems[i];
		const href = anchor.href;
		const title = ZU.trimInternal(anchor.textContent);

		// Currently, external hyperlinks in search results
		// will not work correctly, because they are passed to
		// the same scrape() function that is not designed for
		// them. Therefore, they are skipped.
		const hrefURL = new URL(href);
		if (hrefURL.origin === doc.location.origin
			&& !(href in items) && title) {
			if (checkOnly) {
				return true;
			}
			items[href] = title;
			isNonEmpty = true;
		} // Otherwise skip duplicate or external result.
	}
	return isNonEmpty && items;
}

function scrape(doc, url) {
	const translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	
	translator.setHandler('itemDone', function (tobj, item) {
		handleItem(doc, item);
	});

	translator.getTranslatorObject(function (trans) {
		trans.doWeb(doc, url);
	});
}

// Detect the LitHub article type (plain, Lit Hub Excerpts, ...).
// NOTE: Must be called after the item's tags have been populated, because some
// detection routines require tag data.
function detectType(doc) {
	if (doc.querySelector("div.excerptpage")) {
		return "excerpt";
	}
	// Other types of posts, if needed, may be add here.
	return false;
}

// Dispatch the handler based on the document's type.
function handleItem(doc, item) {
	item.publicationTitle = "Literary Hub";

	const tags = getTags(doc);
	item.tags = tags.map(t => ({ tag: t }));

	const articleType = tags.includes("podcasts") ? "podcast" : detectType(doc);

	// Populate the fields (especially authorship info) based on the type
	// of the article.
	switch (articleType) {
		case "excerpt":
			handleExcerpt(doc, item);
			break;
		case "podcast":
			handlePodcast(doc, item);
			break;
		default:
			handleDefault(doc, item);
	}

	item.complete();
}

function handlePodcast(doc, item) {
	item.itemType = "podcast";
	item.seriesTitle = getByline(doc);
	item.creators = getPodcastAuthors(doc);
	// XXX: get other contributors to the episode.
}

function getPodcastAuthors(doc) {
	const textLine = ZU.trimInternal(text(doc, ".post_header_wrapper h3"));
	if (!textLine) return [];

	let rawAuth = textLine.match(/(?:conversation with\s+)(.+)(?:\s+on\s+)/i);
	if (!rawAuth) {
		rawAuth = textLine.match(/(?:Hosted by\s+)(.+)/i);
	}
	if (rawAuth) {
		return splitNames(rawAuth[1])
			.map(n => ZU.cleanAuthor(n, "author"));
	}
	return [];
}

function handleDefault(doc, item) {
	item.creators = getDefaultAuthors(doc, item);
}

function getDefaultAuthors(doc, item) {
	let maybeTrans = item.title.match(/translated by .+$/i);
	maybeTrans = maybeTrans && maybeTrans.length > 0
		? maybeTrans[0]
		: "";

	const creators = [];
	const rawAuthors = getByline(doc);
	if (rawAuthors === "Literary Hub") {
		creators.push({ fieldMode: 1, lastName: rawAuthors, creatorType: "author" });
	}
	else { // Author(s) is/are likely person(s)
		for (let auth of splitNames(rawAuthors)) {
			const t = maybeTrans.includes(auth)
				? "translator"
				: "author";
			creators.push(ZU.cleanAuthor(auth, t));
		}
	}

	return creators;
}

// Handle the page that belongs to the "Lit Hub Excerpts" type.
function handleExcerpt(doc, item) {
	item.creators = getExcerptAuthors(doc);
}

// Parse the document as "Lit Hub Excerpts".
function getExcerptAuthors(doc) {
	const rawAuthorText = ZU.trimInternal(text(doc, "div.excerptpage>h2"));

	// Split into possible main author(s)/translator(s) parts.
	const authTransMatch = rawAuthorText.match(/(.+)\s*\(trans\.\s(.+)\)/);

	const creators = [];

	let nameText;
	if (authTransMatch) {
		// Translated work.
		nameText = authTransMatch[2]; // translator(s)
		for (let name of splitNames(nameText)) {
			creators.push(ZU.cleanAuthor(name, "translator"));
		}
		nameText = authTransMatch[1]; // original author(s)
	}
	else {
		nameText = rawAuthorText;
	}

	// Handle original author name(s).
	for (let name of splitNames(nameText)) {
		creators.push(ZU.cleanAuthor(name, "author"));
	}

	return creators;
}

// Convenience utility functions

// Split a string of personal names delimitered by the comma (,) and optionally
// with the word "and", no matter whether the Oxford comma style is used.
function splitNames(str) {
	return str.split(/(?:,|\s+and\s+)/)
		.map(s => s.trim())
		.filter(Boolean);
}

// Returns an array of tags on the article.
function getTags(doc) {
	return Array.from(doc.querySelectorAll(".post_tag a[rel='tag']"))
		.map(elem => ZU.trimInternal(elem.textContent.trim()));
}

// Returns the (whitespace-normalized) byline ("By ...") text.
function getByline(doc) {
	return ZU.trimInternal(text(doc, ".author_name span[itemprop='name']"));
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://lithub.com/?s=wonder+AND+lelio",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://lithub.com/lydia-conklin-on-letting-their-personality-into-their-work/",
		"items": [
			{
				"itemType": "podcast",
				"title": "Lydia Conklin on Letting Their Personality Into Their Work",
				"creators": [
					{
						"firstName": "Alex",
						"lastName": "Higley",
						"creatorType": "author"
					},
					{
						"firstName": "Lindsay",
						"lastName": "Hunter",
						"creatorType": "author"
					}
				],
				"abstractNote": "Welcome to I’m a Writer But, where two writers-and talk to other writers-and about their work, their lives, their other work, the stuff that takes up any free time they have, all the stuff th…",
				"language": "en-US",
				"seriesTitle": "I'm a Writer But",
				"url": "https://lithub.com/lydia-conklin-on-letting-their-personality-into-their-work/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Alex Higley"
					},
					{
						"tag": "I'm a Writer But"
					},
					{
						"tag": "Lindsay Hunter"
					},
					{
						"tag": "Lit Hub Radio"
					},
					{
						"tag": "Lydia Conklin"
					},
					{
						"tag": "Rainbow Rainbow"
					},
					{
						"tag": "podcasts"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://lithub.com/the-cat-thief-by-son-bo-mi-translated-by-janet-hong/",
		"items": [
			{
				"itemType": "blogPost",
				"title": "“The Cat Thief” by Son Bo-mi, Translated by Janet Hong",
				"creators": [
					{
						"firstName": "Son",
						"lastName": "Bo-mi",
						"creatorType": "author"
					},
					{
						"firstName": "Janet",
						"lastName": "Hong",
						"creatorType": "translator"
					}
				],
				"date": "2022-11-08T09:51:52+00:00",
				"abstractNote": "“I was away from Korea for a long time,” he said. We were having tea at a downtown café. I tried to recall the last time I’d seen him, but couldn’t. When I made some offhand comment about the tea t…",
				"blogTitle": "Literary Hub",
				"language": "en-US",
				"url": "https://lithub.com/the-cat-thief-by-son-bo-mi-translated-by-janet-hong/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Freeman's"
					},
					{
						"tag": "Janet Hong"
					},
					{
						"tag": "Korean literature"
					},
					{
						"tag": "Son Bo-mi"
					},
					{
						"tag": "The Cat Thief"
					},
					{
						"tag": "loss"
					},
					{
						"tag": "theft"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://lithub.com/read-the-winners-of-american-short-fictions-2022-insider-prize-selected-by-lauren-hough/",
		"items": [
			{
				"itemType": "blogPost",
				"title": "Read the Winners of American Short Fiction’s 2022 Insider Prize, Selected by Lauren Hough",
				"creators": [
					{
						"fieldMode": 1,
						"lastName": "Literary Hub",
						"creatorType": "author"
					}
				],
				"date": "2022-09-15T08:55:13+00:00",
				"abstractNote": "Lauren Hough may be known for her spar-ready online presence, but in real life she’s pure warmth: years ago, she overheard us talking about the Insider Prize—American Short Fiction’s annual contest…",
				"blogTitle": "Literary Hub",
				"language": "en-US",
				"url": "https://lithub.com/read-the-winners-of-american-short-fictions-2022-insider-prize-selected-by-lauren-hough/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "American Short Fiction"
					},
					{
						"tag": "David Antares"
					},
					{
						"tag": "Insider Prize"
					},
					{
						"tag": "Lauren Hough"
					},
					{
						"tag": "Michael John Wiese"
					},
					{
						"tag": "incarcerated writers"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://lithub.com/eden-boudreau-on-memoirs-that-risk-everything/",
		"items": [
			{
				"itemType": "podcast",
				"title": "Eden Boudreau on Memoirs That Risk Everything",
				"creators": [
					{
						"firstName": "Brooke",
						"lastName": "Warner",
						"creatorType": "author"
					},
					{
						"firstName": "Grant",
						"lastName": "Faulkner",
						"creatorType": "author"
					}
				],
				"abstractNote": "Write-minded: Weekly Inspiration for Writers is currently in its fourth year. We are a weekly podcast for writers craving a unique blend of inspiration and real talk about the ups and downs of the …",
				"language": "en-US",
				"seriesTitle": "Write-minded",
				"url": "https://lithub.com/eden-boudreau-on-memoirs-that-risk-everything/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Brooke Warner"
					},
					{
						"tag": "Crying Wolf"
					},
					{
						"tag": "Eden Boudreau"
					},
					{
						"tag": "Grant Faulkner"
					},
					{
						"tag": "Lit Hub Radio"
					},
					{
						"tag": "Write-minded"
					},
					{
						"tag": "podcasts"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://lithub.com/lesser-islands/",
		"items": [
			{
				"itemType": "blogPost",
				"title": "Lesser Islands",
				"creators": [
					{
						"firstName": "Peter",
						"lastName": "DiGiovanni",
						"creatorType": "translator"
					},
					{
						"firstName": "Donatella",
						"lastName": "Melucci",
						"creatorType": "translator"
					},
					{
						"firstName": "Lorenza",
						"lastName": "Pieri",
						"creatorType": "author"
					}
				],
				"date": "2023-02-24T09:52:10+00:00",
				"abstractNote": "We saw the dolphins in the morning. We trailed their shiny fins in the boat for a good half hour; then they went too far, and Papa had to turn back. For me, it was the first time. It was the end of…",
				"blogTitle": "Literary Hub",
				"language": "en-US",
				"url": "https://lithub.com/lesser-islands/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Donatella Melucci"
					},
					{
						"tag": "Europa"
					},
					{
						"tag": "Excerpt"
					},
					{
						"tag": "Fiction"
					},
					{
						"tag": "Italian"
					},
					{
						"tag": "Lesser Islands"
					},
					{
						"tag": "Peter DiGiovanni"
					},
					{
						"tag": "novel"
					},
					{
						"tag": "translation"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://lithub.com/the-forest-a-fable-of-america-in-the-1830s/",
		"items": [
			{
				"itemType": "blogPost",
				"title": "The Forest: A Fable of America in the 1830s",
				"creators": [
					{
						"firstName": "Alexander",
						"lastName": "Nemerov",
						"creatorType": "author"
					}
				],
				"date": "2023-03-10T09:08:09+00:00",
				"abstractNote": "“Smoke and Burnt Pine” Nat Turner saw hieroglyphic characters on the leaves. Written in blood, they portrayed men in different poses, the same he had seen in the sky when the Holy Ghost…",
				"blogTitle": "Literary Hub",
				"language": "en-US",
				"shortTitle": "The Forest",
				"url": "https://lithub.com/the-forest-a-fable-of-america-in-the-1830s/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Alexander Nemerov"
					},
					{
						"tag": "Excerpt"
					},
					{
						"tag": "Princeton University Press"
					},
					{
						"tag": "The Forest"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
