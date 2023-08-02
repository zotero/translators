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
	"lastUpdated": "2023-08-02 15:46:17"
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

const preprintType = ZU.fieldIsValidForType('title', 'preprint')
	? 'preprint'
	: 'report';

function detectWeb(doc, url) {
	var multipleRe = /^https?:\/\/eccc\.weizmann\.ac\.il\/(title|year|keyword)\//;
	var singleRe = /^https?:\/\/eccc\.weizmann\.ac\.il\/report\//;
	if (multipleRe.test(url)) {
		return "multiple";
	}
	else if (singleRe.test(url)) {
		return preprintType;
	}
	else return false;
}

async function scrape(doc, url = doc.location.href) {
	let translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	
	translator.setHandler('itemDone', (_obj, item) => {
		item.publisher = "Electronic Colloquium on Computational Complexity";

		// Keywords and abstract are not in the metadata; scrape from webpage
		var keywords = ZU.xpath(doc, "id('box')//a[contains(@href,'keyword')]");
		for (let i = 0; i < keywords.length; i++) {
			item.tags[i] = keywords[i].textContent;
		}

		var abstractLines = ZU.xpath(doc, "id('box')/p");
		item.abstractNote = "";
		for (let i = 0; i < abstractLines.length; i++) {
			item.abstractNote += abstractLines[i].textContent;
		}
		item.complete();
	});

	await translator.getTranslatorObject(function (trans) {
		trans.itemType = preprintType;
		trans.doWeb(doc, url);
	});
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
		"detectedItemType": "preprint",
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
				"language": "en",
				"libraryCatalog": "eccc.weizmann.ac.il",
				"repository": "Electronic Colloquium on Computational Complexity",
				"url": "https://eccc.weizmann.ac.il/report/2006/067/",
				"attachments": [
					{
						"title": "Full Text PDF",
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
		"detectedItemType": "multiple",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://eccc.weizmann.ac.il/report/2007/112/",
		"detectedItemType": "preprint",
		"items": [
			{
				"itemType": "preprint",
				"title": "Unbounded-Error Communication Complexity of Symmetric Functions",
				"creators": [
					{
						"firstName": "Alexander A.",
						"lastName": "Sherstov",
						"creatorType": "author"
					}
				],
				"date": "2007/11/12",
				"abstractNote": "The sign-rank of a real matrix M is the least rankof a matrix R in which every entry has the same sign as thecorresponding entry of M. We determine the sign-rank of everymatrix of the form M=[ D(|x AND y|) ]_{x,y}, whereD:{0,1,...,n}->{-1,+1} is given and x and y range over {0,1}^n.Specifically, we prove that the sign-rank of M equals 2^{\\tilde Theta(k)}, where k is the number of times D changessign in {0,1,...,n}.\n         Put differently, we prove an optimal lower boundon the unbounded-error communication complexity of everysymmetric function, i.e., a function of the form f(x,y)=D(|x AND y|) for some D. The unbounded-error model isessentially the most powerful of all models of communication(both classical and quantum), and proving lower bounds in itis a substantial challenge. The only previous nontrivial lowerbounds for this model appear in the groundbreaking work ofForster (2001) and its extensions.  As corollaries to ourresult, we give new lower bounds for PAC learning and forthreshold-of-majority circuits.\n         The technical content of our proof is diverse andfeatures random walks on (Z_2)^n, discrete approximation theory,the Fourier transform on (Z_2)^n, linear-programming duality,and matrix analysis.",
				"archiveID": "TR07-112",
				"language": "en",
				"libraryCatalog": "eccc.weizmann.ac.il",
				"repository": "Electronic Colloquium on Computational Complexity",
				"url": "https://eccc.weizmann.ac.il/report/2007/112/",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Communication complexity"
					},
					{
						"tag": "Sign-rank"
					},
					{
						"tag": "Unbounded-error communication complexity"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
