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
	"lastUpdated": "2023-03-11 01:35:15"
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
	var translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	
	translator.setHandler('itemDone', function (obj, item) {
		let maybeTrans = item.title.match(/translated by .+$/i);
		maybeTrans = maybeTrans && maybeTrans.length > 0
			? maybeTrans[0]
			: "";

		item.creators = [];
		const rawAuthors
			= text(doc, ".author_name span[itemprop='name']");
		const normRawAuthors = ZU.trimInternal(rawAuthors);
		let sponsor = text(doc, ".sponsored>a");
		sponsor = ZU.trimInternal(sponsor).toLowerCase();

		const authorIsNotPerson
			= (normRawAuthors.startsWith("Lit Hub")
				|| normRawAuthors === "Literary Hub"
				|| normRawAuthors === "Book Marks"
				|| normRawAuthors === "Fiction Non Fiction"
				// XXX: Missing the "with" pattern of podcast
				// contributors and other minor patterns.
				|| sponsor.includes(normRawAuthors.toLowerCase()));
		if (authorIsNotPerson) {
			item.creators.push({ fieldMode: 1, lastName: normRawAuthors, creatorType: "author" });
		}
		else { // Author(s) is/are likely person(s)
			for (let auth of rawAuthors.split(/(?:,|\s+and\s+)/)) {
				auth = auth.trim();
				if (auth) {
					const t = maybeTrans.includes(auth)
						? "translator"
						: "author";
					item.creators.push(ZU.cleanAuthor(auth, t));
				}
			}
		}

		item.publicationTitle = "Literary Hub";

		item.tags = Array
			.from(doc.querySelectorAll(".post_tag a[rel='tag']"))
			.map((t) => ({ tag: t.textContent.trim() }));

		item.complete();
	});

	translator.getTranslatorObject(function (trans) {
		trans.doWeb(doc, url);
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://lithub.com/lydia-conklin-on-letting-their-personality-into-their-work/",
		"items": [
			{
				"itemType": "blogPost",
				"title": "Lydia Conklin on Letting Their Personality Into Their Work",
				"creators": [
					{
						"fieldMode": 1,
						"lastName": "I'm a Writer But",
						"creatorType": "author"
					}
				],
				"date": "2023-03-07T09:52:02+00:00",
				"abstractNote": "Welcome to I’m a Writer But, where two writers-and talk to other writers-and about their work, their lives, their other work, the stuff that takes up any free time they have, all the stuff th…",
				"blogTitle": "Literary Hub",
				"language": "en-US",
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
				"itemType": "blogPost",
				"title": "Eden Boudreau on Memoirs That Risk Everything",
				"creators": [
					{
						"fieldMode": 1,
						"lastName": "Write-minded",
						"creatorType": "author"
					}
				],
				"date": "2023-02-28T09:52:51+00:00",
				"abstractNote": "Write-minded: Weekly Inspiration for Writers is currently in its fourth year. We are a weekly podcast for writers craving a unique blend of inspiration and real talk about the ups and downs of the …",
				"blogTitle": "Literary Hub",
				"language": "en-US",
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
		"url": "https://lithub.com/?s=wonder+AND+lelio",
		"items": "multiple"
	}
]
/** END TEST CASES **/
