{
	"translatorID": "55d28a64-e56e-4d3c-93db-a5fc584776de",
	"label": "Boston Review",
	"creator": "Sebastian Karcher",
	"target": "^https?://(www\\.)?bostonreview\\.net/",
	"minVersion": "6.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-08-18 06:17:49"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2012/2013 Sebastian Karcher, Zoë C. Ma, and contributors

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
	let pageURL = new URL(url);
	// Some content may not be in the print edition, but the web publication
	// is a magazine nonetheless
	if (/^\/(articles|forum(_response)?|us)\/.+/.test(pageURL.pathname)) {
		return 'magazineArticle';
	}
	else if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	let outerSelectors = [
		"[data-elementor-type='search-results']", // search page
		"[data-elementor-post-type='issue']", // issue TOC
		"[data-elementor-post-type='special-project']", // special project
	];
	// Titles are in an "h3 a" inside the outer container element
	// The computed selector looks like "container1 h3 a, container2 h3 a ..."
	let selectors = outerSelectors.map(s => s + " h3 a").join(", ");
	// Legacy issue pages; although many of the links are broken
	selectors += ", [data-elementor-post-type='elementor_library'] h6 a";
	var rows = doc.querySelectorAll(selectors);
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(row.textContent);
		if (!href || !title) continue;
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
	let translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	
	translator.setHandler('itemDone', (_obj, item) => {
		item.publicationTitle = item.libraryCatalog = "Boston Review";
		let ldInfo = text(doc, "script[type='application/ld+json']");
		let date;
		if (ldInfo) {
			// Get schema.org metadata for the web page from JSON-LD
			let pageInfo
				= (JSON.parse(ldInfo)["@graph"] || [])
					.filter(x => x["@type"] === "WebPage")[0];
			date = pageInfo && pageInfo.datePublished;
		}
		if (!date) {
			// Only as fallback; despite the itemprop value, this doesn't
			// always appear to be "date modified"; rather, it's the original
			// publication date
			date = text(doc, ".elementor-post-info [itemprop='dateModified']");
		}
		if (date) {
			item.date = ZU.strToISO(date);
		}

		// Remove suffix " - Boston Review" in title
		item.title = item.title.replace(/\s+-\s+Boston Review\s*$/, "");

		// NOTE: the href property match takes care of both /author and
		// /author-custom paths
		let authors = doc.querySelectorAll("h2 a[href^='https://www.bostonreview.net/author']");
		for (let author of authors) {
			let authorName = ZU.trimInternal(author.textContent.trim());
			item.creators.push(ZU.cleanAuthor(authorName, "author"));
		}

		for (let tag of doc.querySelectorAll("a[href^='https://www.bostonreview.net/tag/']")) {
			item.tags.push(ZU.trimInternal(tag.textContent));
		}

		// NOTE that in general there's no sure way to determine whether an
		// article belongs to a print issue (hence no volume/issue numbers and
		// no ISSN which is for the print publication). If you can help, please
		// contribute!

		item.complete();
	});

	let em = await translator.getTranslatorObject();
	em.itemType = 'magazineArticle';
	await em.doWeb(doc, url);
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.bostonreview.net/forum_response/rethinking-family-life-robin-west/",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "Rethinking Family Life",
				"creators": [
					{
						"firstName": "Robin",
						"lastName": "West",
						"creatorType": "author"
					}
				],
				"date": "2012-11-09",
				"abstractNote": "Rethinking Family Life James Heckman provides an economic argument for a claim that is often thought to be supported at most by moral considerations:",
				"language": "en-US",
				"libraryCatalog": "Boston Review",
				"publicationTitle": "Boston Review",
				"url": "https://www.bostonreview.net/forum_response/rethinking-family-life-robin-west/",
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
		"url": "https://www.bostonreview.net/forum/can-global-brands-create-just-supply-chains-richard-locke",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "Can Global Brands Create Just Supply Chains?",
				"creators": [
					{
						"firstName": "Richard M.",
						"lastName": "Locke",
						"creatorType": "author"
					}
				],
				"date": "2013-05-21",
				"abstractNote": "When Jia Jingchuan, a 27-year-old electronics worker in Suzhou, China, sought compensation for the chemical poisoning he suffered at work, he appealed",
				"language": "en-US",
				"libraryCatalog": "Boston Review",
				"publicationTitle": "Boston Review",
				"url": "https://www.bostonreview.net/forum/can-global-brands-create-just-supply-chains-richard-locke/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Global"
					},
					{
						"tag": "Human Rights"
					},
					{
						"tag": "Labor"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.bostonreview.net/articles/government-loansharking/",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "Government Loansharking",
				"creators": [
					{
						"firstName": "Malcolm",
						"lastName": "Harris",
						"creatorType": "author"
					}
				],
				"date": "2013-06-07",
				"abstractNote": "Last November when I first wrote about student loans for Boston Review, the Department of Education estimated it would be pulling in around $25 billion in",
				"language": "en-US",
				"libraryCatalog": "Boston Review",
				"publicationTitle": "Boston Review",
				"url": "https://www.bostonreview.net/articles/government-loansharking/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Economy"
					},
					{
						"tag": "Education"
					},
					{
						"tag": "Politics"
					},
					{
						"tag": "U.S."
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://bostonreview.net/issue/september-october-2012/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.bostonreview.net/?s=labor",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.bostonreview.net/articles/astra-taylor-wolson-interview/",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "Beyond the Neoliberal University",
				"creators": [
					{
						"firstName": "Astra",
						"lastName": "Taylor",
						"creatorType": "author"
					},
					{
						"firstName": "Todd",
						"lastName": "Wolfson",
						"creatorType": "author"
					}
				],
				"date": "2020-08-04",
				"abstractNote": "Astra Taylor talks with Rutgers faculty union president Todd Wolfson about organizing academic communities in the age of COVID-19.",
				"language": "en-US",
				"libraryCatalog": "Boston Review",
				"publicationTitle": "Boston Review",
				"url": "https://www.bostonreview.net/articles/astra-taylor-wolson-interview/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "COVID-19"
					},
					{
						"tag": "Education"
					},
					{
						"tag": "Interview"
					},
					{
						"tag": "Labor"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.bostonreview.net/special_project/opportunity-after-neoliberalism/",
		"items": "multiple"
	}
]
/** END TEST CASES **/
