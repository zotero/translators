{
	"translatorID": "575ba37f-c871-4ee8-8bdb-3e7f954e4e6a",
	"label": "The Atlantic",
	"creator": "Sebastian Karcher",
	"target": "^https://www\\.theatlantic\\.com/.+",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-09-16 01:54:13"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2011 Sebastian Karcher and contributors

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

// path at /[type]/archive/yyyy/mm/...
const SINGLE_ITEM_URL_RE = /^https:\/\/[^/]+\/(.+)\/archive\/\d{4}\/\d{2}\/.+/;

function detectWeb(doc, url) {
	let singleItemMatch = url.match(SINGLE_ITEM_URL_RE);

	if (!singleItemMatch) {
		return getSearchResults(doc, true) && "multiple";
	}

	switch (singleItemMatch[1]) {
		// articles from print issues
		case "magazine":
			return "magazineArticle";
		case "podcasts":
			return "podcast";
		default:
			// see, e.g. https://www.theatlantic.com/category/fiction/
			// and look at the class list of the li elements; the
			// non-magazineArticle items have "blog-article" as one of its
			// classes
			return "blogPost"; // TODO: consider this
	}
}

function getSearchResults(doc, checkOnly) {
	let items = {};
	let found = false;
	// "li.article" selector: see https://www.theatlantic.com/category/fiction/
	let rows = doc.querySelectorAll("li.article > a, a[data-action~='title']");
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(row.textContent);
		if (!title || !SINGLE_ITEM_URL_RE.test(href)) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

async function doWeb(doc, url) {
	if (detectWeb(doc, url) == 'multiple') {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (!items) return;
		for (let url of Object.keys(items)) {
			await scrape(await requestDocument(url));
		}
	}
	else {
		await scrape(doc, url);
	}
}

async function scrape(doc, url = doc.location.href) {
	let type = detectWeb(doc, url);
	let translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);

	translator.setHandler('itemDone', (_obj, item) => {
		item.publicationTitle = "The Atlantic";
		item.libraryCatalog = "The Atlantic";

		// get rid of trailing "- The Atlantic" in some titles
		item.title = item.title.replace(/\s+-\s+The Atlantic$/i, "");

		// tags from EM is rarely helpful for The Atlantic; they're from the
		// meta[name='keywords'] tags, and are either redundant with "Section"
		// (in the extra) or spam.
		item.tags = [];

		// fix multiple authors; metadata give us one comma-separated string
		item.creators = [];
		// latter selector for legacy layout
		for (let element of doc.querySelectorAll('#byline a[href*="/author/"], .byline span[itemprop="author"]')) {
			item.creators.push(
				ZU.cleanAuthor(
					ZU.trimInternal(element.textContent),
					"author"
				)
			);
		}

		// keep only the date part of the datetime
		if (item.date) {
			item.date = ZU.strToISO(item.date);
		}

		if (type === "magazineArticle") {
			let issueTitle = text(doc, 'div[class*="ArticleMagazineIssueNav_title"]')
				.replace(/\s+Issue$/i, "");
			if (issueTitle) {
				if (!item.extra) {
					item.extra = "";
				}
				else {
					item.extra += "\n";
				}
				item.extra += `Volume Title: ${issueTitle}`;
			}

			item.ISSN = "2151-9463";
		}
		else if (type === "podcast") {
			item.seriesTitle = text(doc, "#rubric");
			let podcasters = []; // plain name strings, "First Last"
			for (let creator of item.creators) {
				creator.creatorType = "podcaster";
				podcasters.push([creator.firstName, creator.lastName].join(" "));
			}
			for (let creator of getPodcastCreators(doc)) {
				if (!podcasters.includes(creator)) {
					item.creators.push(ZU.cleanAuthor(creator, "guest"));
				}
			}
		}

		item.complete();
	});

	let em = await translator.getTranslatorObject();
	em.itemType = type || "webpage";
	await em.doWeb(doc, url);
}

// Get podcast participants from the transcript (paragraph-leading text in
// <strong>). The assumption is that the first mention of anyone is the
// person's full name, and that the further mentions of any particular person
// is a substring of the full name, and they're used consistently in the
// transcripts.
function getPodcastCreators(doc) {
	// transcript paragraphs
	let containers = doc.querySelectorAll('p[class*="ArticleParagraph_root"], div[class*="ArticleLegacyHtml_root"]');

	let namesInQuotes = new Set();
	let creatorNames = [];
	let skip = new Set();
	Z.debug(`total paragraphs: ${containers.length}`);
	let i = 0; // NOTE: debug only
	for (let containerElement of containers) {
		// Contributor name in bold (<strong> tag), leading a paragraph in the
		// transcript
		let element = containerElement.querySelector("strong");

		// if no <strong> tag, or if the first <strong> tag contains all the
		// text of the paragraph or div, it's not a name string.
		if (!element) continue;

		let elementText = element.textContent;
		let nameString = ZU.trimInternal(elementText).replace(/\s*:$/, "");
		if (skip.has(nameString) || !nameString) continue;
		if (elementText === containerElement.textContent) continue;

		// Quotes may contain participant's first mentions but also irrelevant
		// names (e.g. from newsreels) for context. Stash these names for
		// further processing.
		if (element.querySelector("em")) {
			namesInQuotes.add(nameString);
			continue;
		}

		i++; // NOTE: debug only
		// only if a name string is a not a substring of any other name we've
		// kept, add it to the array of name we keep (creatorNames)
		// NOTE: nested substring test
		if (!creatorNames.filter(keptName => keptName.includes(nameString)).length) {
			creatorNames.push(nameString); // keep this string
		}
		skip.add(nameString); // skip further appearances
	}

	Z.debug(`names contributing to substring test cost ${i}`);
	// Process names in quoted content (text lines in <em> tags). Take a string
	// X from quotes, and check 1) if no kept creator name is a substring of X,
	// X is discarded because it's irrelevant; 2) if a string Y from the kept
	// names is a substring of X, Y is discarded, X is kept.
	Z.debug(`kept names from main paragraphs ${creatorNames.length}`);
	creatorNames = new Set(creatorNames);
	i = 0; // NOTE: debug only
	Z.debug(`names from quotation paragraphs ${namesInQuotes.size}`);
	for (let str of namesInQuotes) {
		if (skip.has(str)) continue;
		i++; // NOTE: debug only

		let keepStr = false;
		for (let keptName of creatorNames) { // NOTE: nested substring test
			if (str.includes(keptName)) {
				creatorNames.delete(keptName);
				skip.add(keptName);
				keepStr = true;
			}
		}
		if (keepStr) {
			creatorNames.add(str);
		}
		skip.add(str);
	}
	Z.debug(`names from quotation contributing to substring test cost ${i}`);

	return creatorNames;
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.theatlantic.com/author/ta-nehisi-coates/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.theatlantic.com/politics/archive/2011/06/jon-stewart-challenges-fox-news-to-correct-its-errors/240900/",
		"items": [
			{
				"itemType": "blogPost",
				"title": "Jon Stewart Challenges Fox News to Correct Its Errors",
				"creators": [
					{
						"firstName": "Conor",
						"lastName": "Friedersdorf",
						"creatorType": "author"
					}
				],
				"date": "2011-06-23",
				"abstractNote": "In the same segment, the comedian apologized for saying its viewers are always found to be the most misinformed",
				"blogTitle": "The Atlantic",
				"language": "en",
				"url": "https://www.theatlantic.com/politics/archive/2011/06/jon-stewart-challenges-fox-news-to-correct-its-errors/240900/",
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
		"url": "https://www.theatlantic.com/magazine/archive/2011/07/the-worlds-schoolmaster/308532/",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "The World’s Schoolmaster",
				"creators": [
					{
						"firstName": "Amanda",
						"lastName": "Ripley",
						"creatorType": "author"
					}
				],
				"date": "2011-06-07",
				"ISSN": "2151-9463",
				"abstractNote": "How a German scientist is using test data to revolutionize global learning",
				"extra": "Volume Title: July/August 2011",
				"language": "en",
				"libraryCatalog": "The Atlantic",
				"publicationTitle": "The Atlantic",
				"url": "https://www.theatlantic.com/magazine/archive/2011/07/the-worlds-schoolmaster/308532/",
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
		"url": "https://www.theatlantic.com/search/?q=europe",
		"defer": true,
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.theatlantic.com/health/archive/2014/03/the-toxins-that-threaten-our-brains/284466/",
		"items": [
			{
				"itemType": "blogPost",
				"title": "The Toxins That Threaten Our Brains",
				"creators": [
					{
						"firstName": "James",
						"lastName": "Hamblin",
						"creatorType": "author"
					}
				],
				"date": "2014-03-18",
				"abstractNote": "Leading scientists recently identified a dozen chemicals as being responsible for widespread behavioral and cognitive problems. But the scope of the chemical dangers in our environment is likely even greater. Why children and the poor are most susceptible to neurotoxic exposure that may be costing the U.S. billions of dollars and immeasurable peace of mind.",
				"blogTitle": "The Atlantic",
				"language": "en",
				"url": "https://www.theatlantic.com/health/archive/2014/03/the-toxins-that-threaten-our-brains/284466/",
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
		"url": "https://www.theatlantic.com/podcasts/archive/2023/09/ba-286-covid-variant-future/675248/",
		"items": [
			{
				"itemType": "podcast",
				"title": "Our First ‘Nonemergency’ COVID Season",
				"creators": [
					{
						"firstName": "Hanna",
						"lastName": "Rosin",
						"creatorType": "podcaster"
					},
					{
						"firstName": "Katie",
						"lastName": "Wu",
						"creatorType": "guest"
					},
					{
						"firstName": "Sarah",
						"lastName": "Zhang",
						"creatorType": "guest"
					}
				],
				"abstractNote": "A new wave. A new variant. A new vaccine. Do we know COVID’s annual pattern yet?",
				"language": "en",
				"seriesTitle": "Radio Atlantic",
				"url": "https://www.theatlantic.com/podcasts/archive/2023/09/ba-286-covid-variant-future/675248/",
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
		"url": "https://www.theatlantic.com/podcasts/archive/2023/08/trans-texas/675188/",
		"items": [
			{
				"itemType": "podcast",
				"title": "When the State Has a Problem With Your Identity",
				"creators": [
					{
						"firstName": "Hanna",
						"lastName": "Rosin",
						"creatorType": "podcaster"
					},
					{
						"firstName": "Ethan",
						"lastName": "Brooks",
						"creatorType": "podcaster"
					},
					{
						"firstName": "",
						"lastName": "Teenager",
						"creatorType": "guest"
					},
					{
						"firstName": "",
						"lastName": "Mom",
						"creatorType": "guest"
					},
					{
						"firstName": "",
						"lastName": "Dad",
						"creatorType": "guest"
					}
				],
				"abstractNote": "Inside one family’s decision to move from Texas to California to protect their transgender teenager",
				"language": "en",
				"seriesTitle": "Radio Atlantic",
				"url": "https://www.theatlantic.com/podcasts/archive/2023/08/trans-texas/675188/",
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
		"url": "https://www.theatlantic.com/podcasts/archive/2023/06/buying-house-with-friends-family/674343/",
		"items": [
			{
				"itemType": "podcast",
				"title": "How to Talk to People: What Makes a House a Home",
				"creators": [
					{
						"firstName": "Julie",
						"lastName": "Beck",
						"creatorType": "podcaster"
					},
					{
						"firstName": "Rebecca",
						"lastName": "Rashid",
						"creatorType": "podcaster"
					},
					{
						"firstName": "Deborah",
						"lastName": "Tepley",
						"creatorType": "guest"
					},
					{
						"firstName": "Bethany",
						"lastName": "Fleming",
						"creatorType": "guest"
					},
					{
						"firstName": "Luke",
						"lastName": "Jackson",
						"creatorType": "guest"
					},
					{
						"firstName": "T. J.",
						"lastName": "Fleming",
						"creatorType": "guest"
					}
				],
				"abstractNote": "Two married couples who bought a home together have found that expanding their household led to a deeper sense of community.",
				"language": "en",
				"seriesTitle": "Podcasts",
				"shortTitle": "How to Talk to People",
				"url": "https://www.theatlantic.com/podcasts/archive/2023/06/buying-house-with-friends-family/674343/",
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
		"url": "https://www.theatlantic.com/projects/new-rules/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.theatlantic.com/projects/ideas-2010/archive/2010/06/reading-writing-and-thinking-online-an-interview-with-alan-jacobs/57807/",
		"items": [
			{
				"itemType": "blogPost",
				"title": "Reading, Writing, and Thinking Online: An Interview With Alan Jacobs",
				"creators": [
					{
						"firstName": "Conor",
						"lastName": "Friedersdorf",
						"creatorType": "author"
					}
				],
				"date": "2010-06-08",
				"abstractNote": "An accomplished author, essayist and academic on how he successfully navigates the Web, why English students should be forced to recite poems from memory, and why it's a bad idea to read your child Goodnight Moon on a Kindle.",
				"blogTitle": "The Atlantic",
				"language": "en",
				"shortTitle": "Reading, Writing, and Thinking Online",
				"url": "https://www.theatlantic.com/projects/ideas-2010/archive/2010/06/reading-writing-and-thinking-online-an-interview-with-alan-jacobs/57807/",
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
	}
]
/** END TEST CASES **/
