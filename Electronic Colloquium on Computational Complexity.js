{
	"translatorID": "09a9599e-c20e-a405-d10d-35ad4130a426",
	"label": "Electronic Colloquium on Computational Complexity",
	"creator": "Jonas Schrieb and Morgan Shirley",
	"target": "^https?://eccc\\.weizmann\\.ac\\.il/(title|year|keyword|report)",
	"minVersion": "1.0.0b3.r1",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-05-31 16:38:35"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2023 Jonas Schrieb and Morgan Shirley

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
	var multipleRe = /^https?:\/\/eccc\.weizmann\.ac\.il\/(title|year|keyword)\//;
	if (multipleRe.test(url)) {
		return "multiple";
	}
	else if (ZU.fieldIsValidForType('title', 'preprint')) {
		return "preprint";
	}
	else {
		return "report";
	}
}

// Get a meta tag from the header
function metaXPath(name) {
	return `/html/head/meta[contains(@name,'citation_${name}')]/@content`;
}

function scrape(doc) {
	var hasPreprint;
	if (ZU.fieldIsValidForType('title', 'preprint')) {
		hasPreprint = true;
	}
	var newItem;
	if (hasPreprint) {
		newItem = new Zotero.Item("preprint");
	}
	else {
		newItem = new Zotero.Item("report");
	}

	var url = doc.location.href;

	newItem.url = url;
	newItem.title = ZU.xpathText(doc, metaXPath("title"));
	newItem.date = ZU.xpathText(doc, metaXPath("publication_date"));
	
	if (hasPreprint) {
		newItem.archiveID = ZU.xpathText(doc, metaXPath("technical_report_number"));
	}
	else {
		newItem.reportNumber = ZU.xpathText(doc, metaXPath("technical_report_number"));
	}
	
	var authors = ZU.xpath(doc, metaXPath("author"));
	for (let i = 0; i < authors.length; i++) {
		newItem.creators.push(ZU.cleanAuthor(authors[i].textContent, "author"));
	}
	
	// Keywords and abstract are not in the metadata; scrape from webpage
	var keywords = ZU.xpath(doc, "id('box')//a[contains(@href,'keyword')]");
	for (let i = 0; i < keywords.length; i++) {
		newItem.tags[i] = keywords[i].textContent;
	}

	var abstractLines = ZU.xpath(doc, "id('box')/p");
	newItem.abstractNote = "";
	for (let i = 0; i < abstractLines.length; i++) {
		newItem.abstractNote += abstractLines[i].textContent;
	}

	newItem.attachments = [
		{ url: url, title: "ECCC Snapshot", mimeType: "text/html" },
		{ url: url + "download", title: "ECCC Full Text PDF", mimeType: "application/pdf" }
	];

	newItem.complete();
}

function doWeb(doc, url) {
	var articles = [];
	var items = {};

	if (detectWeb(doc, url) == "multiple") {
		var titleXPath = "//a[starts-with(@href,'/report/')]/h4";
		var linkXPath = "//a[starts-with(@href,'/report/')][h4]";

		var titles = ZU.xpath(doc, titleXPath);
		var links = ZU.xpath(doc, linkXPath);
		for (let i = 0; i < titles.length; i++) {
			items[links[i].href] = titles[i].textContent;
		}
		Zotero.selectItems(items, function (items) {
			if (!items) {
				Zotero.done();
			}
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, scrape);
		});
	}
	else {
		scrape(doc, url);
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://eccc.weizmann.ac.il/report/2006/067/",
		"items": [
			{
				"itemType": "preprint",
				"title": "On the Impact of Combinatorial Structure on Congestion Games",
				"creators": [
					{
						"firstName": "Heiner",
						"lastName": "Ackermann",
						"creatorType": "author"
					},
					{
						"firstName": "Heiko",
						"lastName": "Röglin",
						"creatorType": "author"
					},
					{
						"firstName": "Berthold",
						"lastName": "Vöcking",
						"creatorType": "author"
					}
				],
				"date": "2006/5/28",
				"abstractNote": "We study the impact of combinatorial structure in congestion games on the complexity of computing pure Nash equilibria and the convergence time of best response sequences.  In particular, we investigate which properties of the strategy spaces of individual players ensure a polynomial convergence time. We show, if the strategy space of each player consists of the bases of a matroid over the set of resources, then the lengths of all best response sequences are polynomially bounded in the number of players and resources. We can also prove that this result is tight, that is, the matroid property is a necessary and sufficient condition on the players' strategy spaces for guaranteeing polynomial time convergence to a Nash equilibrium. In addition, we present an approach that enables us to devise hardness proofs for various kinds of combinatorial games, including first results about the hardness of market sharing games and congestion games for overlay network design. Our approach also yields a short proof for the PLS-completeness of network congestion games.",
				"archiveID": "TR06-067",
				"libraryCatalog": "Electronic Colloquium on Computational Complexity",
				"url": "https://eccc.weizmann.ac.il/report/2006/067/",
				"attachments": [
					{
						"title": "ECCC Snapshot",
						"mimeType": "text/html"
					},
					{
						"title": "ECCC Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Combinatorial Structure"
					},
					{
						"tag": "Congestion Games"
					},
					{
						"tag": "Convergence Time"
					},
					{
						"tag": "PLS-Completeness"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://eccc.weizmann.ac.il/keyword/13486/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://eccc.weizmann.ac.il/report/2023/078/",
		"items": [
			{
				"itemType": "preprint",
				"title": "Toward Better Depth Lower Bounds: A KRW-like theorem for Strong Composition",
				"creators": [
					{
						"firstName": "Or",
						"lastName": "Meir",
						"creatorType": "author"
					}
				],
				"date": "2023/5/30",
				"abstractNote": "One of the major open problems in complexity theory is proving super-logarithmic lower bounds on the depth of circuits (i.e., $\\mathbf{P}\\not\\subseteq \\mathbf{NC}^{1}$). Karchmer, Raz, and Wigderson (Computational Complexity 5(3/4), 1995) suggested to approach this problem by proving that depth complexity of a composition of functions $f \\diamond g$ is roughly the sum of the depth complexities of $f$ and $g$. They showed that the validity of this conjecture would imply that $\\mathbf{P}\\not\\subseteq\\mathbf{NC}^{1}$.The intuition that underlies the KRW conjecture is that the composition $f \\diamond g$ should behave like a \"direct-sum problem\", in a certain sense, and therefore the depth complexity of $f \\diamond g$ should be the sum of the individual depth complexities. Nevertheless, there are two obstacles toward turning this intuition into a proof: first, we do not know how to prove that $f \\diamond g$ must behave like a direct-sum problem; second, we do not know how to prove that the complexity of the latter direct-sum problem is indeed the sum of the individual complexities.In this work, we focus on the second obstacle. To this end, we study a notion called ``strong composition'', which is the same as $f \\diamond g$ except that it is forced to behave like a direct-sum problem. We prove a variant of the KRW conjecture for strong composition, thus overcoming the above second obstacle. This result demonstrates that the first obstacle above is the crucial barrier toward resolving the KRW conjecture. Along the way, we develop some general techniques that might be of independent interest.",
				"archiveID": "TR23-078",
				"libraryCatalog": "Electronic Colloquium on Computational Complexity",
				"shortTitle": "Toward Better Depth Lower Bounds",
				"url": "https://eccc.weizmann.ac.il/report/2023/078/",
				"attachments": [
					{
						"title": "ECCC Snapshot",
						"mimeType": "text/html"
					},
					{
						"title": "ECCC Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Circuit Complexity Lower Bounds"
					},
					{
						"tag": "Depth Lower bounds"
					},
					{
						"tag": "KRW"
					},
					{
						"tag": "KRW composition conjecture"
					},
					{
						"tag": "KRW conjecture"
					},
					{
						"tag": "KW games"
					},
					{
						"tag": "KW relation"
					},
					{
						"tag": "Karchmer Wigderson game"
					},
					{
						"tag": "Karchmer-Raz-Wigderson conjecture"
					},
					{
						"tag": "Karchmer-Wigderson games"
					},
					{
						"tag": "circuit lower bounds"
					},
					{
						"tag": "formula complexity"
					},
					{
						"tag": "formula lower bound"
					},
					{
						"tag": "formula lower bounds"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
