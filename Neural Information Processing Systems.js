{
	"translatorID": "c816f8ad-4c73-4f6d-914e-a6e7212746cf",
	"label": "Neural Information Processing Systems",
	"creator": "Fei Qi, Sebastian Karcher, Guy Aglionby, and Abe Jellinek",
	"target": "^https?://(papers|proceedings)\\.n(eur)?ips\\.cc/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-08-02 17:19:02"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2014-2021 Fei Qi, Sebastian Karcher, Guy Aglionby, and Abe Jellinek
	
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
	if (getSearchResults(doc, true)) {
		return "multiple";
	}
	else if (url.includes('/paper/') && /-Paper\.pdf$|-Abstract\.html$/.test(url)) {
		return "conferencePaper";
	}
	return false;
}

function scrape(doc, url) {
	let pdfURL = attr(doc, 'a[href$="-Paper.pdf"]', 'href');
	let bibURL = attr(doc, 'a[href$="-Bibtex.bib"]', 'href');
	ZU.doGet(bibURL, function (text) {
		let translator = Zotero.loadTranslator("import");
		// BibTeX
		translator.setTranslator("9cb70025-a888-4a29-a210-93ec52da40d4");
		translator.setString(text);
		translator.setHandler("itemDone", function (obj, item) {
			// NeurIPS puts journal/proceedings editors in the BibTeX,
			// but we don't really want them.
			item.creators = item.creators.filter(c => c.creatorType != 'editor');
			
			item.url = url;
			
			item.attachments.push({
				url: pdfURL,
				title: "Full Text PDF",
				mimeType: "application/pdf"
			});
			
			item.complete();
		});
		translator.translate();
	});
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		let items = getSearchResults(doc, false);
		Zotero.selectItems(items, function (items) {
			if (!items) {
				return;
			}
			ZU.processDocuments(Object.keys(items), scrape);
		});
	}
	else if (url.endsWith('-Paper.pdf')) {
		let abstractURL = url
			.replace('/file/', '/hash/')
			.replace('-Paper.pdf', '-Abstract.html');
		ZU.processDocuments(abstractURL, scrape);
	}
	else {
		scrape(doc, url);
	}
}

function getSearchResults(doc, checkOnly) {
	let items = {};
	let found = false;
	let rows = doc.querySelectorAll('li a[href*="/paper/"]');
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

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://proceedings.neurips.cc/paper/2009/hash/2387337ba1e0b0249ba90f55b2ba2521-Abstract.html",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "Information-theoretic lower bounds on the oracle complexity of convex optimization",
				"creators": [
					{
						"firstName": "Alekh",
						"lastName": "Agarwal",
						"creatorType": "author"
					},
					{
						"firstName": "Martin J",
						"lastName": "Wainwright",
						"creatorType": "author"
					},
					{
						"firstName": "Peter",
						"lastName": "Bartlett",
						"creatorType": "author"
					},
					{
						"firstName": "Pradeep",
						"lastName": "Ravikumar",
						"creatorType": "author"
					}
				],
				"date": "2009",
				"itemID": "NIPS2009_2387337b",
				"libraryCatalog": "Neural Information Processing Systems",
				"proceedingsTitle": "Advances in Neural Information Processing Systems",
				"publisher": "Curran Associates, Inc.",
				"url": "https://proceedings.neurips.cc/paper/2009/hash/2387337ba1e0b0249ba90f55b2ba2521-Abstract.html",
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
		"url": "https://proceedings.neurips.cc/paper/2009",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://proceedings.neurips.cc/papers/search?q=richard+zemel",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://proceedings.neurips.cc/paper/2019/hash/d0921d442ee91b896ad95059d13df618-Abstract.html",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "Efficient Graph Generation with Graph Recurrent Attention Networks",
				"creators": [
					{
						"firstName": "Renjie",
						"lastName": "Liao",
						"creatorType": "author"
					},
					{
						"firstName": "Yujia",
						"lastName": "Li",
						"creatorType": "author"
					},
					{
						"firstName": "Yang",
						"lastName": "Song",
						"creatorType": "author"
					},
					{
						"firstName": "Shenlong",
						"lastName": "Wang",
						"creatorType": "author"
					},
					{
						"firstName": "Will",
						"lastName": "Hamilton",
						"creatorType": "author"
					},
					{
						"firstName": "David K",
						"lastName": "Duvenaud",
						"creatorType": "author"
					},
					{
						"firstName": "Raquel",
						"lastName": "Urtasun",
						"creatorType": "author"
					},
					{
						"firstName": "Richard",
						"lastName": "Zemel",
						"creatorType": "author"
					}
				],
				"date": "2019",
				"itemID": "NEURIPS2019_d0921d44",
				"libraryCatalog": "Neural Information Processing Systems",
				"proceedingsTitle": "Advances in Neural Information Processing Systems",
				"publisher": "Curran Associates, Inc.",
				"url": "https://proceedings.neurips.cc/paper/2019/hash/d0921d442ee91b896ad95059d13df618-Abstract.html",
				"volume": "32",
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
	}
]
/** END TEST CASES **/
