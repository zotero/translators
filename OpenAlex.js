{
	"translatorID": "432d79fe-79e1-4791-b3e1-baf700710163",
	"label": "OpenAlex",
	"creator": "Sebastian Karcher",
	"target": "^https://openalex\\.org/works",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 12,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-11-22 08:54:40"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2024 Sebastian Karcher

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
	if (/\/works\/w\d+/i.test(url) || /zoom=w\d+/.test(url)) {
		return 'journalArticle'; // we'll default to
	}
	else if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

function detectSearch(items) {
	return (filterQuery(items).length > 0);
}

// return an array of OpenAlex IDs from the query (items or text)
function filterQuery(items) {
	if (!items) return [];

	if (typeof items == 'string' || !items.length) items = [items];

	// filter out invalid queries
	var oaIDs = [], oaID;
	for (var i = 0, n = items.length; i < n; i++) {
		if (items[i].OpenAlex && (oaID = cleanOpenAlexID(items[i].OpenAlex))) {
			oaIDs.push(oaID);
		}
		else if (items[i].openAlex && (oaID = cleanOpenAlexID(items[i].openAlex))) {
			oaIDs.push(oaID);
		}
		else if (typeof items[i] == 'string' && (oaID = cleanOpenAlexID(items[i]))) {
			oaIDs.push(oaID);
		}
	}
	return oaIDs;
}

function cleanOpenAlexID(id) {
	let openAlex = id.trim();
	let _match;
	if (/^https?:/.test(openAlex) && (_match = openAlex.match(/w\d+/i))) openAlex = _match[0];
	openAlex = openAlex.toUpperCase();
	if (!openAlex.match(/^W\d+$/)) return null;
	return openAlex;
}

async function doSearch(items) {
	await scrape(filterQuery(items));
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('a.v-list-item--link');
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(text(row, 'div.v-list-item__title'));
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
		let ids = [];
		for (let url of Object.keys(items)) {
			ids.push(url.match(/zoom=(w\d+)/i)[1]);
		}
		await scrape(ids);
	}
	else {
		let id = url.match(/zoom=(w\d+)/i);
		if (!id) {
			id = url.match(/\/works\/(w\d+)/i);
		}
		await scrape([id[1]]);
	}
}

async function scrape(ids) {
	let apiURL = `https://api.openalex.org/works?filter=openalex:${ids.join("|")}`;
	// Z.debug(apiURL);
	let apiJSON = await requestText(apiURL);
	let translator = Zotero.loadTranslator('import');
	translator.setTranslator('faa53754-fb55-4658-9094-ae8a7e0409a2'); // OpenAlex JSON
	translator.setString(apiJSON);
	translator.setHandler('itemDone', (_obj, item) => {
		item.complete();
	});

	await translator.translate();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://openalex.org/works?page=1&filter=default.search%3Alabor&sort=relevance_score%3Adesc",
		"defer": true,
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://openalex.org/works/w2029394297",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Male-Female Wage Differentials in Urban Labor Markets",
				"creators": [
					{
						"firstName": "Ronald L.",
						"lastName": "Oaxaca",
						"creatorType": "author"
					}
				],
				"date": "1973-10-01",
				"DOI": "10.2307/2525981",
				"ISSN": "0020-6598",
				"extra": "OpenAlex: W2029394297",
				"issue": "3",
				"language": "en",
				"libraryCatalog": "OpenAlex",
				"pages": "693",
				"publicationTitle": "International Economic Review",
				"url": "http://arks.princeton.edu/ark:/88435/dsp012514nk49s",
				"volume": "14",
				"attachments": [
					{
						"title": "Submitted Version PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Gender Pay Gap"
					},
					{
						"tag": "Generality"
					},
					{
						"tag": "Job Polarization"
					},
					{
						"tag": "Male female"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://openalex.org/works?page=1&filter=default.search%3Atest&sort=relevance_score%3Adesc&zoom=w2159306398",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Coefficient alpha and the internal structure of tests",
				"creators": [
					{
						"firstName": "Lee J.",
						"lastName": "Cronbach",
						"creatorType": "author"
					}
				],
				"date": "1951-09-01",
				"DOI": "10.1007/bf02310555",
				"ISSN": "0033-3123",
				"extra": "OpenAlex: W2159306398",
				"issue": "3",
				"language": "en",
				"libraryCatalog": "OpenAlex",
				"pages": "297-334",
				"publicationTitle": "Psychometrika",
				"url": "http://hdl.handle.net/10983/2196",
				"volume": "16",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Guttman scale"
					},
					{
						"tag": "Interpretability"
					},
					{
						"tag": "Reliability Estimation"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "search",
		"input": {
			"OpenAlex": "W2741809807"
		},
		"items": [
			{
				"itemType": "journalArticle",
				"title": "The state of OA: a large-scale analysis of the prevalence and impact of Open Access articles",
				"creators": [
					{
						"firstName": "Heather",
						"lastName": "Piwowar",
						"creatorType": "author"
					},
					{
						"firstName": "Jason",
						"lastName": "Priem",
						"creatorType": "author"
					},
					{
						"firstName": "Vincent",
						"lastName": "Larivière",
						"creatorType": "author"
					},
					{
						"firstName": "Juan Pablo",
						"lastName": "Alperín",
						"creatorType": "author"
					},
					{
						"firstName": "Lisa",
						"lastName": "Matthias",
						"creatorType": "author"
					},
					{
						"firstName": "Bree",
						"lastName": "Norlander",
						"creatorType": "author"
					},
					{
						"firstName": "Ashley",
						"lastName": "Farley",
						"creatorType": "author"
					},
					{
						"firstName": "Jevin D.",
						"lastName": "West",
						"creatorType": "author"
					},
					{
						"firstName": "Stefanie",
						"lastName": "Haustein",
						"creatorType": "author"
					}
				],
				"date": "2018-02-13",
				"DOI": "10.7717/peerj.4375",
				"ISSN": "2167-8359",
				"extra": "OpenAlex: W2741809807",
				"language": "en",
				"libraryCatalog": "OpenAlex",
				"pages": "e4375",
				"publicationTitle": "PeerJ",
				"shortTitle": "The state of OA",
				"volume": "6",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Citation analysis"
					},
					{
						"tag": "Open Access Publishing"
					},
					{
						"tag": "Open science"
					},
					{
						"tag": "Scholarly communication"
					},
					{
						"tag": "Web of science"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://openalex.org/works/w2964121744",
		"detectedItemType": "journalArticle",
		"items": [
			{
				"itemType": "preprint",
				"title": "Adam: A Method for Stochastic Optimization",
				"creators": [
					{
						"firstName": "Diederik P.",
						"lastName": "Kingma",
						"creatorType": "author"
					},
					{
						"firstName": "Jimmy",
						"lastName": "Ba",
						"creatorType": "author"
					}
				],
				"date": "2014-01-01",
				"DOI": "10.48550/arxiv.1412.6980",
				"extra": "OpenAlex: W2964121744",
				"language": "en",
				"libraryCatalog": "OpenAlex",
				"repository": "Cornell University",
				"shortTitle": "Adam",
				"url": "https://arxiv.org/abs/1412.6980",
				"attachments": [],
				"tags": [
					{
						"tag": "Approximation Algorithms"
					},
					{
						"tag": "Convex Optimization"
					},
					{
						"tag": "Global Optimization"
					},
					{
						"tag": "Optimization Software"
					},
					{
						"tag": "Stochastic Gradient Descent"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://openalex.org/works/W2962935454",
		"detectedItemType": "journalArticle",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "Generalizing to Unseen Domains via Adversarial Data Augmentation",
				"creators": [
					{
						"firstName": "Riccardo",
						"lastName": "Volpi",
						"creatorType": "author"
					},
					{
						"firstName": "Hongseok",
						"lastName": "Namkoong",
						"creatorType": "author"
					},
					{
						"firstName": "Ozan",
						"lastName": "Şener",
						"creatorType": "author"
					},
					{
						"firstName": "John C.",
						"lastName": "Duchi",
						"creatorType": "author"
					},
					{
						"firstName": "Vittorio",
						"lastName": "Murino",
						"creatorType": "author"
					},
					{
						"firstName": "Silvio",
						"lastName": "Savarese",
						"creatorType": "author"
					}
				],
				"date": "2018-05-01",
				"extra": "OpenAlex: W2962935454",
				"language": "en",
				"libraryCatalog": "OpenAlex",
				"pages": "5334-5344",
				"proceedingsTitle": "Neural Information Processing Systems",
				"url": "https://papers.nips.cc/paper/7779-generalizing-to-unseen-domains-via-adversarial-data-augmentation.pdf",
				"volume": "31",
				"attachments": [],
				"tags": [
					{
						"tag": "Adversarial Examples"
					},
					{
						"tag": "Domain Adaptation"
					},
					{
						"tag": "Feature (linguistics)"
					},
					{
						"tag": "Feature vector"
					},
					{
						"tag": "Regularization (linguistics)"
					},
					{
						"tag": "Representation Learning"
					},
					{
						"tag": "Softmax function"
					},
					{
						"tag": "Transfer Learning"
					},
					{
						"tag": "Unsupervised Learning"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://openalex.org/works/w2979586175",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Two-Way Fixed Effects Estimators with Heterogeneous Treatment Effects",
				"creators": [
					{
						"firstName": "Clément de",
						"lastName": "Chaisemartin",
						"creatorType": "author"
					},
					{
						"firstName": "Xavier",
						"lastName": "D’Haultfœuille",
						"creatorType": "author"
					}
				],
				"date": "2020-09-01",
				"DOI": "10.1257/aer.20181169",
				"ISSN": "0002-8282",
				"extra": "OpenAlex: W2979586175",
				"issue": "9",
				"language": "en",
				"libraryCatalog": "OpenAlex",
				"pages": "2964-2996",
				"publicationTitle": "American Economic Review",
				"url": "https://arxiv.org/abs/1803.08807",
				"volume": "110",
				"attachments": [
					{
						"title": "Submitted Version PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Average treatment effect"
					},
					{
						"tag": "Treatment Effects"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "search",
		"input": [
			{
				"OpenAlex": "https://openalex.org/works/W2741809807"
			},
			{
				"OpenAlex": "W2787905871"
			}
		],
		"items": [
			{
				"itemType": "journalArticle",
				"title": "The state of OA: a large-scale analysis of the prevalence and impact of Open Access articles",
				"creators": [
					{
						"firstName": "Heather",
						"lastName": "Piwowar",
						"creatorType": "author"
					},
					{
						"firstName": "Jason",
						"lastName": "Priem",
						"creatorType": "author"
					},
					{
						"firstName": "Vincent",
						"lastName": "Larivière",
						"creatorType": "author"
					},
					{
						"firstName": "Juan Pablo",
						"lastName": "Alperín",
						"creatorType": "author"
					},
					{
						"firstName": "Lisa",
						"lastName": "Matthias",
						"creatorType": "author"
					},
					{
						"firstName": "Bree",
						"lastName": "Norlander",
						"creatorType": "author"
					},
					{
						"firstName": "Ashley",
						"lastName": "Farley",
						"creatorType": "author"
					},
					{
						"firstName": "Jevin D.",
						"lastName": "West",
						"creatorType": "author"
					},
					{
						"firstName": "Stefanie",
						"lastName": "Haustein",
						"creatorType": "author"
					}
				],
				"date": "2018-02-13",
				"DOI": "10.7717/peerj.4375",
				"ISSN": "2167-8359",
				"extra": "OpenAlex: W2741809807",
				"language": "en",
				"libraryCatalog": "OpenAlex",
				"pages": "e4375",
				"publicationTitle": "PeerJ",
				"shortTitle": "The state of OA",
				"volume": "6",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Citation analysis"
					},
					{
						"tag": "Open Access Publishing"
					},
					{
						"tag": "Open science"
					},
					{
						"tag": "Scholarly communication"
					},
					{
						"tag": "Web of science"
					}
				],
				"notes": [],
				"seeAlso": []
			},
			{
				"itemType": "journalArticle",
				"title": "Content-Based Citation Recommendation",
				"creators": [
					{
						"firstName": "Chandra",
						"lastName": "Bhagavatula",
						"creatorType": "author"
					},
					{
						"firstName": "Sergey",
						"lastName": "Feldman",
						"creatorType": "author"
					},
					{
						"firstName": "Russell",
						"lastName": "Power",
						"creatorType": "author"
					},
					{
						"firstName": "Waleed",
						"lastName": "Ammar",
						"creatorType": "author"
					}
				],
				"date": "2018-01-01",
				"DOI": "10.18653/v1/n18-1022",
				"extra": "OpenAlex: W2787905871",
				"language": "en",
				"libraryCatalog": "OpenAlex",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Computational linguistics"
					},
					{
						"tag": "Corpus Linguistics"
					},
					{
						"tag": "Language Modeling"
					},
					{
						"tag": "Part-of-Speech Tagging"
					},
					{
						"tag": "Syntax-based Translation Models"
					},
					{
						"tag": "Textual Data"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
