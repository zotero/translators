{
	"translatorID": "1d84c107-9dbb-4b87-8208-e3632b87889f",
	"label": "zbMATH",
	"creator": "Philipp Zumstein and contributors",
	"target": "^https?://(www\\.)?zbmath\\.org/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-06-15 14:43:38"
}

/*
	***** BEGIN LICENSE BLOCK *****
	
	zbMATH Translator, Copyright © 2014 Philipp Zumstein and contributors.
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


function detectWeb(doc) {
	if (doc.querySelector(".content-result")) { // search results present
		return "multiple";
	}
	else if (doc.querySelector(".bib")) {
		// it is a single entry --> generic fallback = journalArticle
		return "journalArticle";
	}
	return false;
}

function getSearchResults(doc) {
	let items = {};
	let found = false;
	let rows = doc.querySelectorAll(".content-result .list > article");
	for (let row of rows) {
		let href = attr(row, ".title a", "href");
		let title = ZU.trimInternal(text(row, ".title"));
		if (!href || !title) continue;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

async function doWeb(doc, url) {
	if (detectWeb(doc, url) == 'multiple') {
		let items = await Zotero.selectItems(getSearchResults(doc));
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
	let bibURL = attr(doc, ".bib", "href");
	if (!bibURL) {
		Z.debug(`Error: document at ${url} does not contain bibTeX link`);
		return;
	}
	let bibTeXDoc = await requestText(bibURL);
	if (!bibTeXDoc) {
		Z.debug(`Error: failed to request BibTeX content at ${bibURL}`);
		return;
	}

	let trans = Zotero.loadTranslator('import');
	trans.setTranslator('9cb70025-a888-4a29-a210-93ec52da40d4'); // BibTeX
	trans.setString(bibTeXDoc);

	trans.setHandler('itemDone', function (obj, item) {
		item.title = item.title.replace(/\.$/, '');

		if (item.publisher) {
			let splitPublisher = item.publisher.split(":");
			if (splitPublisher[1]) {
				item.place = splitPublisher[0];
				item.publisher = splitPublisher[1].trim();
			}
		}

		// The BibTeX contains MSC as keywords. Scrape the textual labels to
		// MSC as well as the words under "Keywords".
		function cleanText(element) {
			return ZU.trimInternal(element.textContent.trim());
		}

		function pushWord(element) {
			let word = cleanText(element);
			if (word) {
				item.tags.push(word);
			}
		}

		// Keywords
		doc.querySelectorAll(".keywords a").forEach(pushWord);
		// Labels to MSC identifiers. Don't put the replaced MathJax/MathML
		// in $ $, because this isn't very useful in tags.
		doc.querySelectorAll(".classification td.space")
			.forEach(node => pushWord(cleanupMath(node, false/* laTeXify */)));

		// add abstract but not review
		let abstractOrReview = doc.querySelector(".abstract");
		if (abstractOrReview.innerText.trim().indexOf('Summary') == 0) {
			// Strip the MathJax/MathML, put in the LaTeX math text, and
			// surround them with $ $.
			item.abstractNote = cleanupMath(abstractOrReview)
				.innerText.trim().replace(/^Summary:\s*/i, "");
		}

		// The title from BibTeX uses the \( \) syntax for math text. Math in
		// title is not well-parsed by the import translator; falling back to
		// scraping.
		let titleNode = doc.querySelector("article .title strong");
		if (titleNode && titleNode.innerText) {
			item.title = cleanupMath(titleNode).innerText.replace(/\.$/, "");
		}

		item.attachments = [{
			title: "Snapshot",
			document: doc
		}];

		let zbIDElem = doc.querySelector(".label");
		if (zbIDElem) {
			let zbID = cleanText(zbIDElem); // Zbl number (see also URL).

			if (zbID) {
				zbID = zbID.replace(/^Zbl\s*/i, "Zbl: ");
				if (!item.extra) {
					item.extra = zbID;
				}
				else {
					item.extra += `\n${zbID}`;
				}

				// zb permalink, cleaner than document URL
				item.url = zbIDElem.href;
			}
		}

		item.complete();
	});

	trans.translate();
}

// Clean up the MathJaX-rendered text in elements. Returns a clone of the node
// with the duplicate-causing elements removed and the LaTeX math text
// converted to text nodes (surrounded with $ $ if laTeXify = true).
function cleanupMath(element, laTeXify = true) {
	let dup = element.cloneNode(true/* deep */);
	let doc = dup.ownerDocument;

	// Delete the rendered MathML whose innert text tends to cause dupes
	dup.querySelectorAll(":scope span[id^='MathJax-Element']")
		.forEach(node => node.remove());

	// Keep "math/tex" "script" tags and convert them to text.
	dup.querySelectorAll(":scope script[type='math/tex']")
		.forEach((node) => {
			let content = node.textContent.trim();
			if (laTeXify) {
				content = `$${content}$`;
			}

			let textNode = doc.createTextNode(content);
			let parentNode = node.parentNode;

			parentNode.replaceChild(textNode, node);
		});
	return dup;
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://zbmath.org/?q=an:06115874",
		"detectedItemType": "journalArticle",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Sharp threshold for the appearance of certain spanning trees in random graphs",
				"creators": [
					{
						"firstName": "Dan",
						"lastName": "Hefetz",
						"creatorType": "author"
					},
					{
						"firstName": "Michael",
						"lastName": "Krivelevich",
						"creatorType": "author"
					},
					{
						"firstName": "Tibor",
						"lastName": "Szabó",
						"creatorType": "author"
					}
				],
				"date": "2012",
				"DOI": "10.1002/rsa.20472",
				"ISSN": "1042-9832",
				"abstractNote": "We prove that a given tree $T$ on n vertices with bounded maximum degree is contained asymptotically almost surely in the binomial random graph $G\\left(n,\\frac {(1+\\varepsilon)\\log n}{n}\\right)$ provided that $T$ belongs to one of the following two classes: \n\n(1)$T$ has linearly many leaves; (2)$T$ has a path of linear length all of whose vertices have degree two in $T$.",
				"extra": "Zbl: 1255.05045",
				"issue": "4",
				"itemID": "zbMATH06115874",
				"journalAbbreviation": "Random Struct. Algorithms",
				"language": "English",
				"libraryCatalog": "zbMATH",
				"pages": "391–412",
				"publicationTitle": "Random Structures & Algorithms",
				"url": "https://zbmath.org/1255.05045",
				"volume": "41",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "05C05"
					},
					{
						"tag": "05C80"
					},
					{
						"tag": "Random graphs (graph-theoretic aspects)"
					},
					{
						"tag": "Trees"
					},
					{
						"tag": "random graphs"
					},
					{
						"tag": "sharp thresholds"
					},
					{
						"tag": "spanning trees"
					},
					{
						"tag": "tree-universality"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://zbmath.org/?q=se:00001331+ai:bollobas.bela",
		"detectedItemType": "multiple",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://zbmath.org/?q=an:06212000",
		"detectedItemType": "journalArticle",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Basic network creation games",
				"creators": [
					{
						"firstName": "Noga",
						"lastName": "Alon",
						"creatorType": "author"
					},
					{
						"firstName": "Erik D.",
						"lastName": "Demaine",
						"creatorType": "author"
					},
					{
						"firstName": "Mohammad T.",
						"lastName": "Hajiaghayi",
						"creatorType": "author"
					},
					{
						"firstName": "Tom",
						"lastName": "Leighton",
						"creatorType": "author"
					}
				],
				"date": "2013",
				"DOI": "10.1137/090771478",
				"ISSN": "0895-4801",
				"abstractNote": "We study a natural network creation game, in which each node locally tries to minimize its local diameter or its local average distance to other nodes by swapping one incident edge at a time. The central question is what structure the resulting equilibrium graphs have, in particular, how well they globally minimize diameter. For the local-average-distance version, we prove an upper bound of $2^{O(\\sqrt{\\lg n})}$, a lower bound of 3, and a tight bound of exactly 2 for trees, and give evidence of a general polylogarithmic upper bound. For the local-diameter version, we prove a lower bound of $\\Omega(\\sqrt{n})$ and a tight upper bound of 3 for trees. The same bounds apply, up to constant factors, to the price of anarchy. Our network creation games are closely related to the previously studied unilateral network creation game. The main difference is that our model has no parameter $\\alpha$ for the link creation cost, so our results effectively apply for all values of $\\alpha$ without additional effort; furthermore, equilibrium can be checked in polynomial time in our model, unlike in previous models. Our perspective enables simpler proofs that get at the heart of network creation games.",
				"extra": "Zbl: 1273.90167",
				"issue": "2",
				"itemID": "zbMATH06212000",
				"journalAbbreviation": "SIAM J. Discrete Math.",
				"language": "English",
				"libraryCatalog": "zbMATH",
				"pages": "656–668",
				"publicationTitle": "SIAM Journal on Discrete Mathematics",
				"url": "https://zbmath.org/1273.90167",
				"volume": "27",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "05C85"
					},
					{
						"tag": "90C27"
					},
					{
						"tag": "91A06"
					},
					{
						"tag": "Combinatorial optimization"
					},
					{
						"tag": "Graph algorithms (graph-theoretic aspects)"
					},
					{
						"tag": "equilibrium"
					},
					{
						"tag": "low diameter"
					},
					{
						"tag": "n-person games, n>2"
					},
					{
						"tag": "network creation"
					},
					{
						"tag": "network design"
					},
					{
						"tag": "price of anarchy"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://zbmath.org/?q=cc:35",
		"detectedItemType": "multiple",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://zbmath.org/7694014",
		"detectedItemType": "journalArticle",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Soft and collinear limits in $\\mathcal{N} = 8$ supergravity using double copy formalism",
				"creators": [
					{
						"firstName": "Nabamita",
						"lastName": "Banerjee",
						"creatorType": "author"
					},
					{
						"firstName": "Tabasum",
						"lastName": "Rahnuma",
						"creatorType": "author"
					},
					{
						"firstName": "Ranveer Kumar",
						"lastName": "Singh",
						"creatorType": "author"
					}
				],
				"date": "2023",
				"DOI": "10.1007/JHEP04(2023)126",
				"ISSN": "1126-6708",
				"abstractNote": "It is known that $\\mathcal{N} = 8$ supergravity is dual to $\\mathcal{N} = 4$ super Yang-Mills (SYM) via the double copy relation. Using the explicit relation between scattering amplitudes in the two theories, we calculate the soft and collinear limits in $\\mathcal{N} = 8$ supergravity from know results in $\\mathcal{N} = 4$ SYM. In our application of double copy, a particular self-duality condition is chosen for scalars that allows us to constrain and determine the R-symmetry indices of the supergravity states in the collinear limit.",
				"extra": "Zbl: 07694014",
				"issue": "4",
				"itemID": "zbMATH07694014",
				"journalAbbreviation": "J. High Energy Phys.",
				"language": "English",
				"libraryCatalog": "zbMATH",
				"pages": "45",
				"publicationTitle": "Journal of High Energy Physics",
				"url": "https://zbmath.org/7694014",
				"volume": "2023",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "81-XX"
					},
					{
						"tag": "Quantum theory"
					},
					{
						"tag": "extended supersymmetry"
					},
					{
						"tag": "scattering amplitudes"
					},
					{
						"tag": "supergravity models"
					}
				],
				"notes": [
					{
						"note": "<p>Id/No 126</p>"
					}
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
