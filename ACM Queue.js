{
	"translatorID": "212ffcc8-927c-4e84-a097-bd24fd4a44b6",
	"label": "ACM Queue",
	"creator": "Bogdan Lynn",
	"target": "^https://queue\\.acm\\.org/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-12-04 18:10:19"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2025 Bogdan Lynn

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
	if (url.includes('detail.cfm?id=')) {
		return 'journalArticle';
	}
	else if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('a[href*="detail.cfm?id="]');
	for (let row of rows) {
		let href = row.href;
		// Skip links to specific parts of the article, like #comments,
		// since those normally appear below the actual top-level link
		if (href.includes("#")) continue;
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
	// DOI can be found in the URL of the PDF link
	let pdfUrl = doc.querySelector('a[href*="/doi/pdf"]');
	let doi = pdfUrl.href.split("/pdf/")[1];
	let translate = Zotero.loadTranslator("search");
	// DOI Content Negotiation translator
	translate.setTranslator("b28d0d42-8549-4c6d-83fc-8382874a5cb9");
	translate.setSearch({ itemType: "journalArticle", DOI: doi });

	// Do nothing on error
	translate.setHandler("error", () => {});
	translate.setHandler("itemDone", (obj, item) => {
		item.publicationTitle = "ACM Queue";
		item.publisher = "Association for Computing Machinery";

		// 'DOI Content Negotiation' translator does not add attachments
		let pdfUrl = doc.querySelector('a[href*="/doi/pdf"]');
		item.attachments.push({
			url: pdfUrl.href,
			title: 'Full Text PDF',
			mimeType: 'application/pdf'
		});
		item.complete();
	});

	// Try to resolve the DOI, and if it does not work, scrape the DOM.
	try {
		await translate.translate();
		return;
	}
	catch (e) {
		Zotero.debug(`Failed to resolve DOI. Scrape the page.`);
	}
	await scrapeDocument(doc, url);
}


async function scrapeDocument(doc, url) {
	let item = new Zotero.Item("journalArticle");
	item.title = text(doc, "h1");
	item.publicationTitle = "ACM Queue";
	item.publisher = "Association for Computing Machinery";
	item.journalAbbreviation = "Queue";
	item.language = "en";
	item.ISSN = "1542-7730";
	item.url = url;
	
	// Extract volume and issue from "Volume X, issue Y" at the top
	let descriptor = text(doc, ".descriptor").toLowerCase();
	let re = /^volume\s+(\d+),\s*issue\s+(\d+)\s*$/i;
	let matches = descriptor.match(re) || [];
	item.volume = matches[1];
	item.issue = matches[2];

	// Add PDF attachment and DOI
	let pdfUrl = doc.querySelector('a[href*="/doi/pdf"]');
	let doi = pdfUrl.href.split("/pdf/")[1];
	item.DOI = doi;
	item.attachments.push({
		url: pdfUrl.href,
		title: 'Full Text PDF',
		mimeType: 'application/pdf'
	});

	// Some info needs to be fetched from the page of the entire issue
	// because it appears in difference places on the article page
	let issueDoc = await requestDocument(attr(doc, ".descriptor", "href"));

	// Fetch date
	let dateContainer = text(issueDoc, "#lead p");
	let date = dateContainer.split(" ").slice(-2).join(" ");
	if (date.includes("/")) {
		date = date.split("/")[1];
	}
	item.date = date;

	// Find link to the article on the page of the issue
	let searchParams = new URLSearchParams(url.split("?")[1]);
	let id = searchParams.get("id");
	let articleLinkOnissueDoc = issueDoc.querySelector(`a[href*="detail.cfm?id=${id}"]`);
	// Fetch abstract below the link
	item.abstractNote = articleLinkOnissueDoc.parentNode.nextElementSibling.textContent;
	// Fetch creators below the abstract
	let potentialAuthors = articleLinkOnissueDoc.parentNode.nextElementSibling.nextElementSibling;
	if (potentialAuthors?.classList.contains("meta")) {
		let creators = potentialAuthors.textContent.split(",");
		for (let creator of creators) {
			item.creators.push(ZU.cleanAuthor(creator, "author"));
		}
	}

	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://queue.acm.org/detail.cfm?id=3664275",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Make Two Trips: Larry David's New Year's resolution works for IT too.",
				"creators": [
					{
						"creatorType": "author",
						"firstName": "Thomas A.",
						"lastName": "Limoncelli"
					}
				],
				"date": "2024-04-30",
				"DOI": "10.1145/3664275",
				"ISSN": "1542-7730, 1542-7749",
				"abstractNote": "Whether your project is as simple as carrying groceries into the house or as complex as a multiyear engineering project, \"make two trips\" can simplify the project, reduce the chance of error, improve the probability of success, and lead to easier explanations.",
				"issue": "2",
				"journalAbbreviation": "Queue",
				"language": "en",
				"libraryCatalog": "DOI.org (Crossref)",
				"pages": "5-14",
				"publicationTitle": "ACM Queue",
				"shortTitle": "Make Two Trips",
				"url": "https://dl.acm.org/doi/10.1145/3664275",
				"volume": "22",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
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
		"url": "https://queue.acm.org/detail.cfm?id=3762991",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Understanding the Harm Teens Experience on Social Media",
				"creators": [
					{
						"firstName": "Arturo",
						"lastName": "Béjar",
						"creatorType": "author"
					}
				],
				"date": "August 2025",
				"DOI": "10.1145/3762991",
				"ISSN": "1542-7730",
				"abstractNote": "The current approach to online safety, focusing on objectively harmful content and deletion or downranking, is necessary but not sufficient, as it addresses only a small fraction of the harm that teens experience. In order to understand harm, it is essential to understand it from their perspective by surveying and creating safety tools and reporting that make it easy to capture what happens and provide immediate help. Many of the recommendations in this article come from what you learn when you analyze behavioral correlates: that you need approaches that rely on conduct in context, better personalization, and providing feedback to actors.",
				"issue": "4",
				"journalAbbreviation": "Queue",
				"language": "en",
				"libraryCatalog": "ACM Queue",
				"publicationTitle": "ACM Queue",
				"url": "https://queue.acm.org/detail.cfm?id=3762991",
				"volume": "23",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
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
		"url": "https://queue.acm.org/detail.cfm?id=3546935",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "I'm Probably Less Deterministic Than I Used to Be: Embracing randomness is necessary in cloud environments.",
				"creators": [
					{
						"creatorType": "author",
						"firstName": "Pat",
						"lastName": "Helland"
					}
				],
				"date": "2022-06-30",
				"DOI": "10.1145/3546935",
				"ISSN": "1542-7730, 1542-7749",
				"abstractNote": "In my youth, I thought the universe was ruled by cause and effect like a big clock. In this light, computing made sense. Now I see that both life and computing can be a crapshoot, and that has given me a new peace.",
				"issue": "3",
				"journalAbbreviation": "Queue",
				"language": "en",
				"libraryCatalog": "DOI.org (Crossref)",
				"pages": "5-13",
				"publicationTitle": "ACM Queue",
				"shortTitle": "I'm Probably Less Deterministic Than I Used to Be",
				"url": "https://dl.acm.org/doi/10.1145/3546935",
				"volume": "20",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
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
		"url": "https://queue.acm.org/detail.cfm?id=3501293",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Federated Learning and Privacy",
				"creators": [
					{
						"firstName": "Kallista",
						"lastName": "Bonawitz",
						"creatorType": "author"
					},
					{
						"firstName": "Peter",
						"lastName": "Kairouz",
						"creatorType": "author"
					},
					{
						"firstName": "Brendan",
						"lastName": "McMahan",
						"creatorType": "author"
					},
					{
						"firstName": "Daniel",
						"lastName": "Ramage",
						"creatorType": "author"
					}
				],
				"date": "September-October 2021",
				"DOI": "10.1145/3494834.3501293",
				"ISSN": "1542-7730",
				"abstractNote": "Centralized data collection can expose individuals to privacy risks and organizations to legal risks if data is not properly managed. Federated learning is a machine learning setting where multiple entities collaborate in solving a machine learning problem, under the coordination of a central server or service provider. Each client's raw data is stored locally and not exchanged or transferred; instead, focused updates intended for immediate aggregation are used to achieve the learning objective. This article provides a brief introduction to key concepts in federated learning and analytics with an emphasis on how privacy technologies may be combined in real-world systems and how their use charts a path toward societal benefit from aggregate statistics in new domains and with minimized risk to individuals and to the organizations who are custodians of the data.",
				"issue": "5",
				"journalAbbreviation": "Queue",
				"language": "en",
				"libraryCatalog": "ACM Queue",
				"publicationTitle": "ACM Queue",
				"url": "https://queue.acm.org/detail.cfm?id=3501293",
				"volume": "19",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
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
		"url": "https://queue.acm.org/detail.cfm?id=3773095",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Memory Safety for Skeptics",
				"creators": [
					{
						"firstName": "Andrew Lilley",
						"lastName": "Brinker",
						"creatorType": "author"
					}
				],
				"date": "October 2025",
				"DOI": "10.1145/3773095",
				"ISSN": "1542-7730",
				"abstractNote": "The state of possibility with memory safety today is similar to the state of automobile safety just prior to the widespread adoption of mandatory seat-belt laws. As car manufacturers began to integrate seat belts as a standard feature across their model lines and states began to require that drivers wear seat belts while driving, the rate of traffic fatalities and severity of traffic-related injuries dropped drastically. Seat belts did not solve automobile safety, but they credibly improved it, and at remarkably low cost.",
				"issue": "5",
				"journalAbbreviation": "Queue",
				"language": "en",
				"libraryCatalog": "ACM Queue",
				"publicationTitle": "ACM Queue",
				"url": "https://queue.acm.org/detail.cfm?id=3773095",
				"volume": "23",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
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
		"url": "https://queue.acm.org/issuedetail.cfm?issue=2838344",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://queue.acm.org/listing.cfm?item_topic=Blockchain&qc_type=theme_list&filter=Blockchain&page_title=Blockchain&order=desc",
		"items": "multiple"
	}
]
/** END TEST CASES **/
