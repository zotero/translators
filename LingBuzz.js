{
	"translatorID": "e048e70e-8fea-43e9-ac8e-940bc3d71b0b",
	"label": "LingBuzz",
	"creator": "Göktuğ Kayaalp and Abe Jellinek",
	"target": "^https://(ling\\.auf|lingbuzz)\\.net/lingbuzz/(repo/semanticsArchive/article/)?(\\d+|_search)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-05-04 01:00:37"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2021 Göktuğ Kayaalp <self at gkayaalp dot com> and Abe Jellinek

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
	if (url.includes("/_search") && getSearchResults(doc, true)) {
		return "multiple";
	}
	return preprintType;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	// exclude author links
	var rows = doc.querySelectorAll('td a:not([href*="?_s="])');
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(
			row.textContent.replace(/\s+\[semanticsArchive\]$/, "")
		);
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
		scrape(doc, url);
	}
}

function scrape(doc, url) {
	if (url.match(/semanticsArchive/)) {
		scrapeSA(doc, url);
		return;
	}
	
	var newItem = new Zotero.Item(preprintType);
	if (preprintType == "report") {
		newItem.extra = "type: article\n";
	}

	// Collect information.
	var idBlock = doc.querySelector("center");
	var title = text(idBlock, "a[href*='.pdf']");
	var authors = idBlock.querySelectorAll("a[href*='_k=']");
	// These are unpleasant but they're the best we have.
	var date = idBlock.lastChild.textContent;
	var abstract = idBlock.nextElementSibling.nextSibling.textContent;

	var tableRows = doc.querySelectorAll("tbody tr");
	for (let row of tableRows) {
		let [left, right] = row.querySelectorAll("td");
		if (!left || !right) continue;
		let fieldName = left.innerText.toLowerCase();
		if (fieldName.includes("format")) {
			let pdfUrl = right.querySelector("a[href*='.pdf']").href;
			newItem.attachments.push({ url: pdfUrl, title: "LingBuzz Full Text PDF", mimeType: "application/pdf" });
		}
		else if (fieldName.includes("keywords")) {
			newItem.tags.push(...right.innerText.split(/[;,] /));
		}
		else if (fieldName.includes("published in")) {
			newItem.extra = (newItem.extra || '') + 'LingBuzz Published In: ' + right.innerText + '\n';
		}
	}

	newItem.title = title;
	for (let authorLink of authors) {
		newItem.creators.push(
			Zotero.Utilities.cleanAuthor(authorLink.innerText, "author"));
	}
	newItem.abstractNote = abstract;
	newItem.date = ZU.strToISO(date);
	newItem.url = url;
	newItem.attachments.push({ document: doc, title: "Snapshot" });
	newItem.publisher = "LingBuzz";

	newItem.complete();
}

function scrapeSA(doc, url) {
	var newItem = new Zotero.Item(preprintType);
	if (preprintType == "report") {
		newItem.extra = "type: article\n";
	}

	// Collect information.
	var idBlock = doc.querySelector("center");
	// This is even worse than the usual LingBuzz pages.
	var title = text(idBlock, "a:first-child");
	var authors = idBlock.querySelectorAll("a:not(:first-child)");
	// These are unpleasant but they're the best we have.
	var date = idBlock.lastChild.textContent;

	let pdfUrl = idBlock.querySelector("a:first-child").href;
	newItem.attachments.push({ url: pdfUrl,
							   title: "LingBuzz (SemanticsArchive) Full Text PDF",
							   mimeType: "application/pdf" });

	var tableRows = doc.querySelectorAll("tbody tr");
	for (let row of tableRows) {
		let [left, right] = row.querySelectorAll("td");
		if (!left || !right) continue;
		let fieldName = left.innerText.toLowerCase();
		if (fieldName.includes("keywords")) {
			newItem.tags.push(...right.innerText.split(/[;,] /));
		}
	}

	newItem.title = title;
	for (let authorLink of authors) {
		newItem.creators.push(
			Zotero.Utilities.cleanAuthor(authorLink.innerText, "author"));
	}
	newItem.date = ZU.strToISO(date);
	newItem.url = url;
	newItem.attachments.push({ document: doc, title: "Snapshot" });
	newItem.publisher = "LingBuzz (SemanticsArchive)";

	newItem.complete();
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://ling.auf.net/lingbuzz/005988",
		"items": [
			{
				"itemType": "preprint",
				"title": "Verb height indeed determines prosodic phrasing: evidence from Iron Ossetic",
				"creators": [
					{
						"firstName": "Lena",
						"lastName": "Borise",
						"creatorType": "author"
					},
					{
						"firstName": "David",
						"lastName": "Erschler",
						"creatorType": "author"
					}
				],
				"date": "2021-05",
				"abstractNote": "We provide novel evidence in favor of the proposal by Hamlaoui and Szendrői (2015, 2017), who argue for a flexible mapping between an Intonational Phrase (ɩ) and syntactic constituents. According to them, ɩ corresponds to the highest projection that hosts verbal material, together with its specifier. The prediction is that the size of ɩ co-varies with the height of the verb, if the latter is variable. Our evidence comes from Iron Ossetic (East Iranian), a language with multiple projections available for verb raising, depending on context. The flexible ɩ-mapping approach – but not more rigid approaches to ɩ-formation – can account for the properties of ɩ-formation in Iron Ossetic. This applies to the prosody of utterances that contain negative indefinites, narrow foci, and single wh-phrases. More complex wh-questions (those with multiple wh-phrases and/or negative indefinites) provide evidence that syntax-based flexible ɩ-mapping approach interacts with language-specific eurhythmic constraints. The Iron Ossetic facts, therefore, provide support for the flexible ɩ-mapping approach, which has not been tested until now on languages of this type.",
				"extra": "LingBuzz Published In: Proceedings of NELS 51",
				"libraryCatalog": "LingBuzz",
				"repository": "LingBuzz",
				"shortTitle": "Verb height indeed determines prosodic phrasing",
				"url": "https://ling.auf.net/lingbuzz/005988",
				"attachments": [
					{
						"title": "LingBuzz Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "focus"
					},
					{
						"tag": "iranian"
					},
					{
						"tag": "iron ossetic"
					},
					{
						"tag": "phonology"
					},
					{
						"tag": "prosodic phrasing"
					},
					{
						"tag": "syntax"
					},
					{
						"tag": "syntax-prosody interface"
					},
					{
						"tag": "wh-questions"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://ling.auf.net/lingbuzz/repo/semanticsArchive/article/001471",
		"items": [
			{
				"itemType": "preprint",
				"title": "Review of Barker and Shan (2015) Continuations and Natural Language",
				"creators": [
					{
						"firstName": "Yusuke",
						"lastName": "Kubota",
						"creatorType": "author"
					}
				],
				"date": "2015-06",
				"libraryCatalog": "LingBuzz",
				"repository": "LingBuzz (SemanticsArchive)",
				"url": "https://ling.auf.net/lingbuzz/repo/semanticsArchive/article/001471",
				"attachments": [
					{
						"title": "LingBuzz (SemanticsArchive) Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "binding"
					},
					{
						"tag": "categorial grammar"
					},
					{
						"tag": "continuations"
					},
					{
						"tag": "crossover"
					},
					{
						"tag": "reconstruction"
					},
					{
						"tag": "scope"
					},
					{
						"tag": "semantics"
					},
					{
						"tag": "semanticsarchive"
					},
					{
						"tag": "syntax"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://ling.auf.net/lingbuzz/_search?q=svan",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://ling.auf.net/lingbuzz/_search?q=construction+grammar",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://ling.auf.net/lingbuzz/_search?q=semanticsarchive",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://lingbuzz.net/lingbuzz/006559",
		"items": [
			{
				"itemType": "preprint",
				"title": "Object drop in Spanish is not island-sensitive",
				"creators": [
					{
						"firstName": "Matías",
						"lastName": "Verdecchia",
						"creatorType": "author"
					}
				],
				"date": "2022-04",
				"abstractNote": "Campos (1986) argues that object drop in Spanish exhibits island effects. This claim has remained unchallenged up to date and is largely assumed in the literature. In this squib, I show that this characterization is not empirically correct: given a proper discourse context, null objects can easily appear within a syntactic island in Spanish. This observation constitutes a non-trivial problem for object drop analyses based on movement.",
				"extra": "LingBuzz Published In: To appear in Journal of Linguistics",
				"libraryCatalog": "LingBuzz",
				"repository": "LingBuzz",
				"url": "https://lingbuzz.net/lingbuzz/006559",
				"attachments": [
					{
						"title": "LingBuzz Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "object drop - islands - spanish - movement"
					},
					{
						"tag": "syntax"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
