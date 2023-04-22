{
	"translatorID": "f1aaf4bf-f344-41ee-b960-905255d40d53",
	"label": "Literary Hub",
	"creator": "Zoë C. Ma",
	"target": "^https?://lithub\\.com/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-04-22 01:23:39"
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

	// Reject "non-processable" pages, i.e. pages for site-structural
	// purposes, including legal notices, about pages, taxonomy, etc.
	// Not incorporating this logic into the "target" field of translator
	// metadata, to keep the RegExp there simple.
	const skipPath = /\/(category|tag|masthead|about-literary-hub|privacy-policy-for-.+)\//;
	if (urlObj.pathname.match(skipPath)) {
		return false;
	}

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

async function doWeb(doc, url) {
	if (detectWeb(doc, url) === "multiple") {
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

function getSearchResults(doc, checkOnly) {
	const resultElems = doc.querySelectorAll("div.search .post_header a");
	if (!resultElems.length) return false;

	const items = {};
	let isNonEmpty = false;
	for (const anchorElem of resultElems) {
		const href = anchorElem.href;
		const title = ZU.trimInternal(anchorElem.textContent.trim());

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

async function scrape(doc, url) { // eslint-disable-line no-unused-vars
	const translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	translator.setHandler('itemDone', function (tobj, item) {
		handleItem(doc, item);
	});
	translator.translate();
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

// Handle generic item by populating the tags and publicationTitle fields and
// dispatch the handler based on the document's type.
function handleItem(doc, item) {
	item.publicationTitle = "Literary Hub";

	const tags = getTags(doc);
	item.tags = tags;

	const articleType = tags.map(t => t.toLowerCase()).includes("podcasts")
		? "podcast"
		: detectType(doc);

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

// Type-specific handlers.

// Podcasts hosted by LitHub.
function handlePodcast(doc, item) {
	item.itemType = "podcast";
	item.seriesTitle = getByline(doc);
	item.creators = getPodcastAuthors(doc);
	item.creators.push(...inferPodcastGuests(doc, item.title));
}

function getPodcastAuthors(doc) {
	const textLine = getSubheading(doc);
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

// Infer the podcast guests from the body paragraphs. The opening bold text of
// paragraphs are where the names can usually be found. To filter out noise,
// notice that the guest's name is also most likely part of the title.
// NOTE: an alternative idea is to look for the guest's name in the tags.
function inferPodcastGuests(doc, title) {
	const podBody = doc.querySelector("[itemprop='articleBody']");
	if (!podBody) return false;

	const normTitle = title.toLowerCase();

	const boldFrags = [];
	for (const elem of podBody.querySelectorAll(":scope p b, :scope p strong")) {
		const txtMatch = ZU.trimInternal(elem.textContent).match(/\b.+\b/);
		if (txtMatch) {
			const txt = txtMatch[0];
			if (txt === txt.toUpperCase()) {
				// Skip all-caps, which are relatively noisy.
				continue;
			}
			if (!boldFrags.includes(txt)
				&& normTitle.includes(txt.toLowerCase())) {
				boldFrags.push(txt);
			}
		}
	}
	return boldFrags.map(name => ZU.cleanAuthor(name, "guest"));
}

// Default, or "plain" blog post.
function handleDefault(doc, item) {
	const creators = [];
	const rawAuthors = getByline(doc);
	// Skip "institutional author" when it is the same as publisher.
	if (rawAuthors && rawAuthors.toLowerCase() !== "literary hub") {
		const authorInfo = parseAuthorTransFromDefault(rawAuthors, doc, item);
		if (authorInfo) {
			for (const [type, names] of Object.entries(authorInfo)) {
				creators.push(...names.map(n => ZU.cleanAuthor(n, type)));
			}
		}
	}
	item.creators = creators;
}

// Given the document of the article of the "default" type, determine author
// and possible translator information as an object with properties "author"
// and "translator", or false if not found.
function parseAuthorTransFromDefault(bylineText, doc, item) {
	// Attempt to parse the raw-byline as "...[,] translated by [...]" or
	// similar.
	const bylineMatch = bylineText.match(/(.+?)[,;\s([]+trans(?:lated\s+by\s+|\.\s+)(.+)\b/i);
	if (bylineMatch) {
		return {
			author: splitNames(bylineMatch[1]),
			translator: splitNames(bylineMatch[2])
		};
	}

	// Attempt to parse the byline without any "translated by" or "trans."
	// hints in it. To check for any translator(s), check for any that is
	// included in the title or subtitle after "translated by ...".
	const transHeadingRE = /\btranslated by\s+(.+)/i;
	// Check title.
	let transHeadingMatch = item.title.match(transHeadingRE);
	if (!transHeadingMatch) {
		// Check subtitle h3.
		const subheading = getSubheading(doc);
		transHeadingMatch = subheading.match(transHeadingRE);
	}
	if (transHeadingMatch) {
		const translators = splitNames(transHeadingMatch[1]);
		// Dedup any byline names.
		const authors = [];
		for (const name of splitNames(bylineText)) {
			if (!translators.includes(name)) {
				authors.push(name);
			}
		}
		return {
			author: authors,
			translator: translators
		};
	}

	// Just author names, without translators.
	return {
		author: splitNames(bylineText),
		translator: []
	};
}

// Handle the page that belongs to the "Lit Hub Excerpts" type.
function handleExcerpt(doc, item) {
	const rawAuthorText = ZU.trimInternal(text(doc, "div.excerptpage>h2"));
	// Split into possible main author(s)/translator(s) parts.
	const authTransMatch = rawAuthorText.match(/(.+)\s*\(trans\.\s(.+)\)/);

	const creators = [];
	let nameText;
	if (authTransMatch) {
		// Translated work.
		nameText = authTransMatch[2]; // translator(s)
		for (const name of splitNames(nameText)) {
			creators.push(ZU.cleanAuthor(name, "translator"));
		}
		nameText = authTransMatch[1]; // original author(s)
	}
	else {
		nameText = rawAuthorText;
	}

	// Handle original author name(s).
	for (const name of splitNames(nameText)) {
		creators.push(ZU.cleanAuthor(name, "author"));
	}

	item.creators = creators;
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
	let byline = text(doc, ".author_name span[itemprop='name']");
	if (!byline) {
		// Only for certain pre-2022 posts without more
		// semantically-clear byline info.
		byline = text(doc, ".post_detail > a[href*='author']");
	}
	return ZU.trimInternal(byline);
}

// Returns the h3 subheading in the post heading block, which can be rich in
// information.
function getSubheading(doc) {
	return ZU.trimInternal(text(doc, ".post_header_wrapper h3"));
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://lithub.com/?s=wonder+AND+lelio",
		"detectedItemType": "multiple",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://lithub.com/lydia-conklin-on-letting-their-personality-into-their-work/",
		"detectedItemType": "podcast",
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
					},
					{
						"firstName": "Lydia",
						"lastName": "Conklin",
						"creatorType": "guest"
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
		"detectedItemType": "blogPost",
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
		"detectedItemType": "blogPost",
		"items": [
			{
				"itemType": "blogPost",
				"title": "Read the Winners of American Short Fiction’s 2022 Insider Prize, Selected by Lauren Hough",
				"creators": [],
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
		"detectedItemType": "podcast",
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
					},
					{
						"firstName": "Eden",
						"lastName": "Boudreau",
						"creatorType": "guest"
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
		"detectedItemType": "blogPost",
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
		"detectedItemType": "blogPost",
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
	},
	{
		"type": "web",
		"url": "https://lithub.com/a-girl-and-the-moon/",
		"detectedItemType": "blogPost",
		"items": [
			{
				"itemType": "blogPost",
				"title": "“A Girl and the Moon”",
				"creators": [
					{
						"firstName": "Lee",
						"lastName": "Young-Ju",
						"creatorType": "author"
					},
					{
						"firstName": "Jae",
						"lastName": "Kim",
						"creatorType": "translator"
					}
				],
				"date": "2021-12-17T09:48:57+00:00",
				"abstractNote": "Mid-night, swinging upside down on a pull-up bar, the girl says, Mother, this bone growing on my back, white in the night, protruding out of my skin, long and endlessly this bone, like a ladder it …",
				"blogTitle": "Literary Hub",
				"language": "en-US",
				"url": "https://lithub.com/a-girl-and-the-moon/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "A Girl and the Moon"
					},
					{
						"tag": "Black Ocean"
					},
					{
						"tag": "Cold Candies"
					},
					{
						"tag": "Jae Kim"
					},
					{
						"tag": "Lee Young-Ju"
					},
					{
						"tag": "translated poetry"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://lithub.com/the-calling-of-st-mattew/",
		"detectedItemType": "blogPost",
		"items": [
			{
				"itemType": "blogPost",
				"title": "“The Calling of St. Matthew”",
				"creators": [
					{
						"firstName": "Adam",
						"lastName": "Zagajewski",
						"creatorType": "author"
					},
					{
						"firstName": "Clare",
						"lastName": "Cavanagh",
						"creatorType": "translator"
					}
				],
				"date": "2021-12-09T09:49:32+00:00",
				"abstractNote": "that priest looks just like Belmondo –Wislawa  Szymborska, Funeral (II) —Look at his hand, his palm. Like a pianist’s —But that old guy can’t see a thing —What next, paying in a church —Mom, my hea…",
				"blogTitle": "Literary Hub",
				"language": "en-US",
				"url": "https://lithub.com/the-calling-of-st-mattew/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Adam Zagajewski"
					},
					{
						"tag": "Clare Cavanagh"
					},
					{
						"tag": "Farrar Straus and Giroux"
					},
					{
						"tag": "Jonathan Galassi"
					},
					{
						"tag": "Robyn Creswell"
					},
					{
						"tag": "The FSG Poetry Anthology"
					},
					{
						"tag": "a poem"
					},
					{
						"tag": "poetry"
					},
					{
						"tag": "translated poetry"
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
		"url": "https://lithub.com/small-wonder-the-challenge-of-parenting-through-climate-collapse/",
		"detectedItemType": "blogPost",
		"items": [
			{
				"itemType": "blogPost",
				"title": "Small Wonder: The Challenge of Parenting Through Climate Collapse",
				"creators": [
					{
						"firstName": "Eiren",
						"lastName": "Caffall",
						"creatorType": "author"
					}
				],
				"date": "2019-11-18T09:55:49+00:00",
				"abstractNote": "We come to Monhegan Island—twelve miles off the coast of Maine, perched in the fastest-warming saltwater ecosystem on the planet—to avoid darkness. We come for wonder. We walk across the island onc…",
				"blogTitle": "Literary Hub",
				"language": "en-US",
				"shortTitle": "Small Wonder",
				"url": "https://lithub.com/small-wonder-the-challenge-of-parenting-through-climate-collapse/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Coast"
					},
					{
						"tag": "Environment"
					},
					{
						"tag": "Maine"
					},
					{
						"tag": "Monhegan Island"
					},
					{
						"tag": "Periwinkles"
					},
					{
						"tag": "Rachel Carson"
					},
					{
						"tag": "Southport"
					},
					{
						"tag": "The Sense of Wonder"
					},
					{
						"tag": "climate change"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://lithub.com/letters-to-a-writer-of-color-deepa-anappara-and-taymour-soomro-on-finding-community-with-each-other/",
		"detectedItemType": "podcast",
		"items": [
			{
				"itemType": "podcast",
				"title": "Letters to a Writer of Color: Deepa Anappara and Taymour Soomro on Finding Community With Each Other",
				"creators": [
					{
						"firstName": "Whitney",
						"lastName": "Terrell",
						"creatorType": "author"
					},
					{
						"firstName": "V. V.",
						"lastName": "Ganeshananthan",
						"creatorType": "author"
					},
					{
						"firstName": "Deepa",
						"lastName": "Anappara",
						"creatorType": "guest"
					},
					{
						"firstName": "Taymour",
						"lastName": "Soomro",
						"creatorType": "guest"
					}
				],
				"abstractNote": "Fiction writers Deepa Anappara and Taymour Soomro join co-hosts V.V. Ganeshananthan and Whitney Terrell to discuss the newly published essay collection Letters to a Writer of Color, which they co-e…",
				"language": "en-US",
				"seriesTitle": "Fiction Non Fiction",
				"shortTitle": "Letters to a Writer of Color",
				"url": "https://lithub.com/letters-to-a-writer-of-color-deepa-anappara-and-taymour-soomro-on-finding-community-with-each-other/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Deepa Anappara"
					},
					{
						"tag": "Fiction/Non/Fiction"
					},
					{
						"tag": "Letters to a Writer of Color"
					},
					{
						"tag": "Lit Hub Radio"
					},
					{
						"tag": "Taymour Soomro"
					},
					{
						"tag": "podcasts"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
