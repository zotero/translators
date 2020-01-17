{
	"translatorID": "276cb34c-6861-4de7-a11d-c2e46fb8af28",
	"label": "Semantic Scholar",
	"creator": "Guy Aglionby",
	"target": "^https?://(www\\.semanticscholar\\.org/paper/.+|pdfs\\.semanticscholar\\.org/)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2019-07-07 21:59:05"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2017 Guy Aglionby
	
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

// See also https://github.com/zotero/translators/blob/master/BibTeX.js
var bibtex2zoteroTypeMap = {
	inproceedings: "conferencePaper",
	conference: "conferencePaper",
	article: "journalArticle"
};

function detectWeb(doc, url) {
	let citation = ZU.xpathText(doc, '//pre[@class="bibtex-citation"]');
	let type = citation.split('{')[0].replace('@', '');
	return bibtex2zoteroTypeMap[type];
}

function doWeb(doc, url) {
	if (url.includes('pdfs.semanticscholar.org')) {
		let urlComponents = url.split('/');
		let paperId = urlComponents[3] + urlComponents[4].replace('.pdf', '');
		const API_URL = 'https://api.semanticscholar.org/';
		ZU.processDocuments(API_URL + paperId, parseDocument);
	}
	else {
		parseDocument(doc, url);
	}
}

function parseDocument(doc, url) {
	let citation = ZU.xpathText(doc, '//pre[@class="bibtex-citation"]');
	let type = citation.split('{')[0].replace('@', '');
	const itemType = bibtex2zoteroTypeMap[type];

	var item = new Zotero.Item(itemType);

	// load structured schema data 
	const schemaTag = doc.querySelector("script.schema-data");
	const schemaObject = JSON.parse(schemaTag.innerHTML);
	const article = schemaObject["@graph"][1][0];

	item.title = article["name"];
	item.abstractNote = article["description"];

	if (article["author"]) {
		article["author"].forEach(author => {
			item.creators.push(ZU.cleanAuthor(author["name"], 'author'));
		});
	}
	item.publicationTitle = article["publication"];
	item.date = article["datePublished"];

	// attachments
	item.attachments.push({
		url: url,
		title: "Semantic Scholar Link",
		mimeType: "text/html",
		snapshot: false
	});

	const paperLink = article["about"]["url"];
	if (paperLink.includes("pdfs.semanticscholar.org") || paperLink.includes("arxiv.org")) {
		item.attachments.push({
			url: paperLink,
			title: "Full Text PDF",
			mimeType: 'application/pdf'
		});
	} else {
		item.attachments.push({
			url: paperLink,
			title: "Publisher Link",
			mimeType: "text/html",
			snapshot: false
		});
	}

	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.semanticscholar.org/paper/TectoMT%3A-Modular-NLP-Framework-Popel-Zabokrtsk%C3%BD/e1ea10a288632a4003a4221759bc7f7a2df36208",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "TectoMT: Modular NLP Framework",
				"creators": [
					{
						"firstName": "Martin",
						"lastName": "Popel",
						"creatorType": "author"
					},
					{
						"firstName": "Zdenek",
						"lastName": "Zabokrtský",
						"creatorType": "author"
					}
				],
				"date": "2010",
				"abstractNote": "In the present paper we describe TectoMT, a multi-purpose open-source NLP framework. It allows for fast and efficient development of NLP applications by exploiting a wide range of software modules already integrated in TectoMT, such as tools for sentence segmentation, tokenization, morphological analysis, POS tagging, shallow and deep syntax parsing, named entity recognition, anaphora resolution, tree-to-tree translation, natural language generation, word-level alignment of parallel corpora, and other tasks. One of the most complex applications of TectoMT is the English-Czech machine translation system with transfer on deep syntactic (tectogrammatical) layer. Several modules are available also for other languages (German, Russian, Arabic).Where possible, modules are implemented in a language-independent way, so they can be reused in many applications.",
				"libraryCatalog": "Semantic Scholar",
				"proceedingsTitle": "IceTAL",
				"shortTitle": "TectoMT",
				"attachments": [
					{
						"title": "Semantic Scholar Link",
						"mimeType": "text/html",
						"snapshot": false
					},
					{
						"title": "Publisher Link",
						"mimeType": "text/html",
						"snapshot": false
					}
				],
				"notes": [],
				"seeAlso": [],
				"tags": []
			}
		]
	}
]
/** END TEST CASES **/
