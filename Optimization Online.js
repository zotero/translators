{
	"translatorID": "0ee623f9-0a5c-4f6a-a5e1-10e2feaa16a7",
	"label": "Optimization Online",
	"creator": "Pascal Quach",
	"target": "^https?://optimization-online\\.org/",
	"minVersion": "6.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-07-15 13:50:06"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2023 Pascal Quach <pascal.quach@centralesupelec.fr>

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

function detectWeb(doc, url) { // eslint-disable-line no-unused-vars
	if (doc.body.classList.contains('single-post')) {
		return 'preprint';
	}
	else if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.entry-title > a');
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

async function scrape(doc, url) {
	let translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);

	translator.setHandler('itemDone', (_obj, item) => {
		// Item
		item.itemType = 'preprint';
		// Use innerText instead of textContent (duplicated LaTeX)
		let title = innerText(doc, 'h1.entry-title');
		if (title) {
			item.title = ZU.capitalizeTitle(title);
		}
		let tags = doc.querySelectorAll('div.entry-meta > span.tags-links > a[rel="tag"]');
		for (let tag of tags) {
			item.tags.push(ZU.cleanTags(tag.text));
		}
		// Use innerText instead of textContent (duplicated LaTeX)
		let abstractNote = innerText(doc, 'div.entry-content > div > p');
		if (abstractNote) {
			item.abstractNote = ZU.trimInternal(abstractNote);
		}

		// Attachment
		let attachmentUrl = attr(doc, '.entry-content a[href*="/wp-content/uploads/"]', 'href');
		item.attachments = [];
		if (attachmentUrl.length) {
			item.attachments.push({
				title: 'Full Text PDF',
				mimeType: 'application/pdf',
				url: attachmentUrl,
			});
		}

		// Archive
		item.publisher = 'Optimization Online'; // repository
		item.libraryCatalog = 'optimization-online.org';
		let archiveID = attr(doc, 'article', 'id');
		if (archiveID) {
			item.archiveID = archiveID.split('-')[1];
		}
		let shortUrl = doc.querySelector('span.shorturl > a').href;
		if (shortUrl) {
			item.url = shortUrl;
		}

		item.complete();
	});

	let em = await translator.getTranslatorObject();
	await em.doWeb(doc, url);
}


/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://optimization-online.org/2023/05/political-districting-to-optimize-the-polsby-popper-compactness-score/",
		"detectedItemType": "preprint",
		"items": [
			{
				"itemType": "preprint",
				"title": "Political districting to optimize the Polsby-Popper compactness score",
				"creators": [
					{
						"firstName": "Pietro",
						"lastName": "Belotti",
						"creatorType": "author"
					},
					{
						"firstName": "Austin",
						"lastName": "Buchanan",
						"creatorType": "author"
					},
					{
						"firstName": "Soraya",
						"lastName": "Ezazipour",
						"creatorType": "author"
					}
				],
				"date": "2023-05-19",
				"abstractNote": "In the academic literature and in expert testimony, the Polsby-Popper score is the most popular way to measure the compactness of a political district. Given a district with area A and perimeter P, its Polsby-Popper score is given by (4 \\pi A)/P^2. This score takes values between zero and one, with circular districts achieving a perfect score of one. In this paper, we propose the first mathematical optimization models to draw districts with optimum Polsby-Popper score. Specifically, we propose new mixed-integer second-order cone programs (MISOCPs), which can be solved with existing optimization software. We investigate their tractability by applying them to real-life districting instances in the USA. Experiments show that they are able to: (i) identify the most compact majority-minority districts at the tract level; (ii) identify the most compact districting plans at the county level; and (iii) refine existing tract-level plans to make them substantially more compact. Our techniques could be used by plaintiffs when seeking to overturn maps that dilute the voting strength of minority groups. Our python code and results are publicly available on GitHub.",
				"archiveID": "23021",
				"language": "en-US",
				"libraryCatalog": "optimization-online.org",
				"repository": "Optimization Online",
				"url": "https://optimization-online.org/?p=23021",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "MINLP"
					},
					{
						"tag": "districting"
					},
					{
						"tag": "misocp"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://optimization-online.org/2023/06/mind-the-tildeo-asymptotically-better-but-still-impractical-quantum-distributed-algorithms/",
		"detectedItemType": "preprint",
		"items": [
			{
				"itemType": "preprint",
				"title": "Mind the \\tilde{O}: asymptotically better, but still impractical, quantum distributed algorithms",
				"creators": [
					{
						"firstName": "David E. Bernal",
						"lastName": "Neira",
						"creatorType": "author"
					}
				],
				"date": "2023-06-22",
				"archiveID": "23283",
				"language": "en-US",
				"libraryCatalog": "optimization-online.org",
				"repository": "Optimization Online",
				"shortTitle": "Mind the \\tilde{O}",
				"url": "https://optimization-online.org/?p=23283",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Directed Minimum Spanning Tree"
					},
					{
						"tag": "complexity"
					},
					{
						"tag": "distributed computing"
					},
					{
						"tag": "quantum computing"
					},
					{
						"tag": "steiner tree"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://optimization-online.org/2023/05/maximum-likelihood-probability-measures-over-sets-and-applications-to-data-driven-optimization/",
		"detectedItemType": "preprint",
		"items": [
			{
				"itemType": "preprint",
				"title": "Maximum Likelihood Probability Measures over Sets and Applications to Data-Driven Optimization",
				"creators": [
					{
						"firstName": "Juan",
						"lastName": "Borrero",
						"creatorType": "author"
					},
					{
						"firstName": "Denis",
						"lastName": "Saure",
						"creatorType": "author"
					}
				],
				"date": "2023-05-15",
				"archiveID": "22948",
				"language": "en-US",
				"libraryCatalog": "optimization-online.org",
				"repository": "Optimization Online",
				"url": "https://optimization-online.org/?p=22948",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "data-driven decision making"
					},
					{
						"tag": "distributionally robust optimization"
					},
					{
						"tag": "maximum likelihood estimation"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://optimization-online.org/2023/05/modeling-risk-for-cvar-based-decisions-in-risk-aggregation/",
		"detectedItemType": "preprint",
		"items": [
			{
				"itemType": "preprint",
				"title": "Modeling risk for CVaR-based decisions in risk aggregation",
				"creators": [
					{
						"firstName": "Yuriy",
						"lastName": "Zinchenko",
						"creatorType": "author"
					}
				],
				"date": "2023-05-08",
				"abstractNote": "Download",
				"archiveID": "22890",
				"language": "en-US",
				"libraryCatalog": "optimization-online.org",
				"repository": "Optimization Online",
				"url": "https://optimization-online.org/?p=22890",
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
		"url": "https://optimization-online.org/2018/03/6538/",
		"detectedItemType": "preprint",
		"items": [
			{
				"itemType": "preprint",
				"title": "Discretization-based algorithms for generalized semi-infinite and bilevel programs with coupling equality constraints",
				"creators": [
					{
						"firstName": "Hatim",
						"lastName": "Djelassi",
						"creatorType": "author"
					},
					{
						"firstName": "Alexander",
						"lastName": "Mitsos",
						"creatorType": "author"
					},
					{
						"firstName": "Moll",
						"lastName": "Glass",
						"creatorType": "author"
					}
				],
				"date": "2018-03-22",
				"archiveID": "15107",
				"language": "en-US",
				"libraryCatalog": "optimization-online.org",
				"repository": "Optimization Online",
				"url": "https://optimization-online.org/?p=15107",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://optimization-online.org/tag/affine-recourse-adaptation/",
		"detectedItemType": "multiple",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://optimization-online.org/author/melvynsim/",
		"detectedItemType": "multiple",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://optimization-online.org/category/robust-optimization/",
		"detectedItemType": "multiple",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://optimization-online.org/2022/",
		"detectedItemType": "multiple",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://optimization-online.org/2022/07/",
		"detectedItemType": "multiple",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://optimization-online.org/2022/7/",
		"detectedItemType": "multiple",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://optimization-online.org/2022/07/1/",
		"detectedItemType": "multiple",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://optimization-online.org/2022/7/01/",
		"detectedItemType": "multiple",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://optimization-online.org/2022/7/1/",
		"detectedItemType": "multiple",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://optimization-online.org/2022/07/01/",
		"detectedItemType": "multiple",
		"items": "multiple"
	}
]
/** END TEST CASES **/
