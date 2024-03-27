{
	"translatorID": "5aabfa6e-79e6-4791-a9d2-46c9cb137561",
	"label": "Stanford Encyclopedia of Philosophy",
	"creator": "Sebastian Karcher",
	"target": "^https?://plato\\.stanford\\.edu/(archives/[a-z]{3}\\d{4}/)?(entries|search)",
	"minVersion": "2.1",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-05-04 15:33:21"
}

/*
	***** BEGIN LICENSE BLOCK *****
	
	Copyright © 2011-2023 Sebastian Karcher and Zotero
	
	This file is part of Zotero.
	
	Zotero is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.
	
	Zotero is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU Affero General Public License for more details.
	
	You should have received a copy of the GNU Affero General Public License
	along with Zotero.  If not, see <http://www.gnu.org/licenses/>.
	
	***** END LICENSE BLOCK *****
*/

function detectWeb(doc, url) {
	if (url.includes("/search/") && getSearchResults(doc, true)) return "multiple";
	else if (url.includes("/entries/")) return "bookSection";
	return false;
}
	

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('div.result_title > a');
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
	//get abstract and tags from article plage
	var abs = text(doc, 'div#preamble>p').replace(/\n/g, "");
	var tags = text(doc, 'div#related-entries >p');
	// Z.debug(tags);
	if (tags) tags = tags.replace(/\n/g, "").split(/\|/);
	for (let i = 0; i < tags.length; i++) {
		tags[i] = ZU.trimInternal(tags[i]);
	}
	//get BibTex Link
	var bibtexUrl = url.replace(/entries\//, "cgi-bin/encyclopedia/archinfo.cgi?entry=").replace(/\/(index\.html)?(#.+)?$/, "");
	if (bibtexUrl.includes("/archives/")) {
		// we're on archive page
		let archive = bibtexUrl.match(/\/(archives\/[a-z]{3}\d{4})/)[1];
		bibtexUrl = bibtexUrl.replace(archive, "/") + "&" + archive.replace("s/", "=");
		// Z.debug(bibtexUrl);
	}
	
	// Z.debug(bibtexUrl)
	let bibtex = await requestText(bibtexUrl);
	// remove line breaks, then match match the bibtex, then remove the odd /t in it.
	bibtex = bibtex.replace(/\n/g, "").match(/<pre>.+<\/pre>/)[0].replace(/\/t/g, "");
	// Zotero.debug(bibtex)
	var translator = Zotero.loadTranslator("import");
	translator.setTranslator("9cb70025-a888-4a29-a210-93ec52da40d4");
	translator.setString(bibtex);
	translator.setHandler("itemDone", (_obj, item) => {
		if (abs) item.abstractNote = abs;
		if (tags) item.tags = tags;
		item.attachments = [{ document: doc, title: "SEP - Snapshot", mimeType: "text/html" }];
		item.complete();
	});
	await translator.translate();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://plato.stanford.edu/search/searcher.py?query=epistemology",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://plato.stanford.edu/entries/plato/",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Plato",
				"creators": [
					{
						"firstName": "Richard",
						"lastName": "Kraut",
						"creatorType": "author"
					},
					{
						"firstName": "Edward N.",
						"lastName": "Zalta",
						"creatorType": "editor"
					}
				],
				"date": "2022",
				"abstractNote": "Plato (429?–347 B.C.E.) is, by any reckoning, one of the mostdazzling writers in the Western literary tradition and one of the mostpenetrating, wide-ranging, and influential authors in the history ofphilosophy. An Athenian citizen of high status, he displays in hisworks his absorption in the political events and intellectualmovements of his time, but the questions he raises are so profound andthe strategies he uses for tackling them so richly suggestive andprovocative that educated readers of nearly every period have in someway been influenced by him, and in practically every age there havebeen philosophers who count themselves Platonists in some importantrespects. He was not the first thinker or writer to whom the word“philosopher” should be applied. But he was soself-conscious about how philosophy should be conceived, and what itsscope and ambitions properly are, and he so transformed theintellectual currents with which he grappled, that the subject ofphilosophy, as it is often conceived—a rigorous and systematicexamination of ethical, political, metaphysical, and epistemologicalissues, armed with a distinctive method—can be called hisinvention. Few other authors in the history of Western philosophyapproximate him in depth and range: perhaps only Aristotle (whostudied with him), Aquinas, and Kant would be generally agreed to beof the same rank.",
				"bookTitle": "The Stanford Encyclopedia of Philosophy",
				"edition": "Spring 2022",
				"itemID": "sep-plato",
				"libraryCatalog": "Stanford Encyclopedia of Philosophy",
				"publisher": "Metaphysics Research Lab, Stanford University",
				"url": "https://plato.stanford.edu/archives/spr2022/entries/plato/",
				"attachments": [
					{
						"title": "SEP - Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Aristotle"
					},
					{
						"tag": "Plato: ethics and politics in The Republic"
					},
					{
						"tag": "Socrates"
					},
					{
						"tag": "Socratic Dialogues"
					},
					{
						"tag": "abstract objects"
					},
					{
						"tag": "education, philosophy of"
					},
					{
						"tag": "epistemology"
					},
					{
						"tag": "metaphysics"
					},
					{
						"tag": "religion: and morality"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://plato.stanford.edu/archives/win2022/entries/logic-classical/",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Classical Logic",
				"creators": [
					{
						"firstName": "Stewart",
						"lastName": "Shapiro",
						"creatorType": "author"
					},
					{
						"firstName": "Teresa",
						"lastName": "Kouri Kissel",
						"creatorType": "author"
					},
					{
						"firstName": "Edward N.",
						"lastName": "Zalta",
						"creatorType": "editor"
					},
					{
						"firstName": "Uri",
						"lastName": "Nodelman",
						"creatorType": "editor"
					}
				],
				"date": "2022",
				"abstractNote": "Typically, a logic consists of a formal or informal languagetogether with a deductive system and/or a model-theoretic semantics.The language has components that correspond to a part of a naturallanguage like English or Greek. The deductive system is to capture,codify, or simply record arguments that are validfor the given language, and the semantics is to capture, codify, orrecord the meanings, or truth-conditions for at least part of thelanguage.",
				"bookTitle": "The Stanford Encyclopedia of Philosophy",
				"edition": "Winter 2022",
				"itemID": "sep-logic-classical",
				"libraryCatalog": "Stanford Encyclopedia of Philosophy",
				"publisher": "Metaphysics Research Lab, Stanford University",
				"url": "https://plato.stanford.edu/archives/win2022/entries/logic-classical/",
				"attachments": [
					{
						"title": "SEP - Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "logic: free"
					},
					{
						"tag": "logic: infinitary"
					},
					{
						"tag": "logic: intuitionistic"
					},
					{
						"tag": "logic: linear"
					},
					{
						"tag": "logic: modal"
					},
					{
						"tag": "logic: paraconsistent"
					},
					{
						"tag": "logic: relevance"
					},
					{
						"tag": "logic: second-order and higher-order"
					},
					{
						"tag": "logic: substructural"
					},
					{
						"tag": "logic: temporal"
					},
					{
						"tag": "logical consequence"
					},
					{
						"tag": "logical form"
					},
					{
						"tag": "logical truth"
					},
					{
						"tag": "model theory"
					},
					{
						"tag": "model theory: first-order"
					},
					{
						"tag": "paradox: Skolem’s"
					},
					{
						"tag": "proof theory: development of"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
