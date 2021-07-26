{
	"translatorID": "c5abbc55-98a1-4557-a295-841c7ae7dfea",
	"label": "Journal of Machine Learning Research",
	"creator": "Abe Jellinek",
	"target": "^https?://((www\\.)?(jmlr\\.(org|csail\\.mit\\.edu))/(papers/v|mloss/)|proceedings\\.mlr\\.press/v)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-07-23 05:16:02"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2021 Abe Jellinek
	
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
	if (doc.querySelector('meta[name="citation_title"]')) {
		if (doc.querySelector('meta[name="citation_conference_title"]')) {
			return "conferencePaper";
		}
		else {
			return "journalArticle";
		}
	}
	else if (url.endsWith('.pdf')) {
		// not as good of a heuristic as when we can look at the <meta> tags,
		// but it'll do
		return url.includes('//proceedings.mlr.press')
			? "conferencePaper"
			: "journalArticle";
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('dl');
	if (!rows.length) rows = doc.querySelectorAll('.paper');
	for (let row of rows) {
		let href = attr(row, 'a[href$=".html"]', 'href');
		let title = ZU.trimInternal(text(row, 'dt, .title'));
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (items) ZU.processDocuments(Object.keys(items), scrape);
		});
	}
	else {
		if (url.endsWith('.pdf')) {
			ZU.processDocuments(url.replace(/v(?:olume)?([^/]+\/[^/]+)\/.*/, 'v$1'), scrape);
		}
		else {
			scrape(doc, url);
		}
	}
}

function scrape(doc, url) {
	var translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	
	translator.setHandler('itemDone', function (obj, item) {
		// it would be nice to use nextSibling here to fetch the text node next
		// to the "Abstract" heading, but that doesn't work in processDocuments.
		let content = innerText(doc, '#content');
		item.abstractNote = content.substring(
			content.indexOf('Abstract') + 8, content.indexOf('[abs]')
		);
		
		item.date = ZU.strToISO(item.date);
		
		item.attachments = item.attachments.filter(a => a.title != 'Snapshot');
		
		for (let link of doc.querySelectorAll('a')) {
			let text = link.textContent.trim();
			if (text == 'code') {
				item.attachments.push({
					title: 'Source Code',
					url: link.href,
					mimeType: 'text/html'
				});
			}
			else if (text == 'Supplementary PDF') {
				item.attachments.push({
					title: 'Supplementary PDF',
					url: link.href,
					mimeType: 'application/pdf'
				});
			}
		}
		
		item.complete();
	});

	translator.getTranslatorObject(function (trans) {
		trans.itemType = detectWeb(doc, url);
		trans.doWeb(doc, url);
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.jmlr.org/papers/v3/antos02a.html",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Data-dependent margin-based generalization bounds for classification",
				"creators": [
					{
						"firstName": "András",
						"lastName": "Antos",
						"creatorType": "author"
					},
					{
						"firstName": "Balázs",
						"lastName": "Kégl",
						"creatorType": "author"
					},
					{
						"firstName": "Tamás",
						"lastName": "Linder",
						"creatorType": "author"
					},
					{
						"firstName": "Gábor",
						"lastName": "Lugosi",
						"creatorType": "author"
					}
				],
				"date": "2002",
				"ISSN": "ISSN 1533-7928",
				"abstractNote": "We derive new margin-based inequalities for the probability of error of classifiers. The main feature of these bounds is that they can be calculated using the training data and therefore may be effectively used for model selection purposes. In particular, the bounds involve empirical complexities measured on the training data (such as the empirical fat-shattering dimension) as opposed to their worst-case counterparts traditionally used in such analyses. Also, our bounds appear to be sharper and more general than recent results involving empirical complexity measures. In addition, we develop an alternative data-based bound for the generalization error of classes of convex combinations of classifiers involving an empirical complexity measure that is easier to compute than the empirical covering number or fat-shattering dimension. We also show examples of efficient computation of the new bounds.",
				"issue": "Jul",
				"libraryCatalog": "www.jmlr.org",
				"pages": "73-98",
				"publicationTitle": "Journal of Machine Learning Research",
				"url": "https://www.jmlr.org/papers/v3/antos02a.html",
				"volume": "3",
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
		"url": "https://www.jmlr.org/papers/v22/20-1380.html",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "River: machine learning for streaming data in Python",
				"creators": [
					{
						"firstName": "Jacob",
						"lastName": "Montiel",
						"creatorType": "author"
					},
					{
						"firstName": "Max",
						"lastName": "Halford",
						"creatorType": "author"
					},
					{
						"firstName": "Saulo Martiello",
						"lastName": "Mastelini",
						"creatorType": "author"
					},
					{
						"firstName": "Geoffrey",
						"lastName": "Bolmier",
						"creatorType": "author"
					},
					{
						"firstName": "Raphael",
						"lastName": "Sourty",
						"creatorType": "author"
					},
					{
						"firstName": "Robin",
						"lastName": "Vaysse",
						"creatorType": "author"
					},
					{
						"firstName": "Adil",
						"lastName": "Zouitine",
						"creatorType": "author"
					},
					{
						"firstName": "Heitor Murilo",
						"lastName": "Gomes",
						"creatorType": "author"
					},
					{
						"firstName": "Jesse",
						"lastName": "Read",
						"creatorType": "author"
					},
					{
						"firstName": "Talel",
						"lastName": "Abdessalem",
						"creatorType": "author"
					},
					{
						"firstName": "Albert",
						"lastName": "Bifet",
						"creatorType": "author"
					}
				],
				"date": "2021",
				"ISSN": "1533-7928",
				"abstractNote": "River is a machine learning library for dynamic data streams and continual learning. It provides multiple state-of-the-art learning methods, data generators/transformers, performance metrics and evaluators for different stream learning problems. It is the result from the merger of two popular packages for stream learning in Python: Creme and scikit-multiflow. River introduces a revamped architecture based on the lessons learnt from the seminal packages. River's ambition is to be the go-to library for doing machine learning on streaming data. Additionally, this open source package brings under the same umbrella a large community of practitioners and researchers. The source code is available at https://github.com/online-ml/river.",
				"issue": "110",
				"libraryCatalog": "www.jmlr.org",
				"pages": "1-8",
				"publicationTitle": "Journal of Machine Learning Research",
				"shortTitle": "River",
				"url": "http://jmlr.org/papers/v22/20-1380.html",
				"volume": "22",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Source Code",
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
		"url": "https://www.jmlr.org/mloss/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.jmlr.org/papers/v3/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://proceedings.mlr.press/v137/frank20a.html",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "Problems using deep generative models for probabilistic audio source separation",
				"creators": [
					{
						"firstName": "Maurice",
						"lastName": "Frank",
						"creatorType": "author"
					},
					{
						"firstName": "Maximilian",
						"lastName": "Ilse",
						"creatorType": "author"
					}
				],
				"date": "2020-02-08",
				"language": "en",
				"libraryCatalog": "proceedings.mlr.press",
				"pages": "53-59",
				"publisher": "PMLR",
				"url": "http://proceedings.mlr.press/v137/frank20a.html",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Supplementary PDF",
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
		"url": "http://proceedings.mlr.press/v131/kommrusch20a.html",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "Self-Supervised Learning for Multi-Goal Grid World: Comparing Leela and Deep Q Network",
				"creators": [
					{
						"firstName": "Steve",
						"lastName": "Kommrusch",
						"creatorType": "author"
					}
				],
				"date": "2020-09-01",
				"conferenceName": "International Workshop on Self-Supervised Learning",
				"language": "en",
				"libraryCatalog": "proceedings.mlr.press",
				"pages": "72-88",
				"proceedingsTitle": "International Workshop on Self-Supervised Learning",
				"publisher": "PMLR",
				"shortTitle": "Self-Supervised Learning for Multi-Goal Grid World",
				"url": "http://proceedings.mlr.press/v131/kommrusch20a.html",
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
		"url": "http://proceedings.mlr.press/v130/",
		"items": "multiple"
	}
]
/** END TEST CASES **/
