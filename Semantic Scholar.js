{
	"translatorID": "276cb34c-6861-4de7-a11d-c2e46fb8af28",
	"label": "Semantic Scholar",
	"creator": "Guy Aglionby",
	"target": "^https?://(www\\.semanticscholar\\.org/(paper/.+|search\\?)|pdfs\\.semanticscholar\\.org/)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-08-08 18:14:55"
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
	article: "journalArticle",
	inproceedings: "conferencePaper",
	conference: "conferencePaper",
};

function getItemTypeFromBibtex(doc) {
	const bibtex = ZU.xpathText(doc, '//pre[@class="bibtex-citation"]');
	const bibtexType = bibtex.split('{')[0].replace('@', '');
	return bibtex2zoteroTypeMap[bibtexType] || 'journalArticle';
}

function getSearchResults(doc, checkOnly) {
	let searchResults = doc.querySelectorAll('.result-page .cl-paper-row > a');
	if (checkOnly) {
		return searchResults.length > 0;
	}

	let items = {};
	for (let row of searchResults) {
		let href = row.href;
		let title = ZU.trimInternal(row.textContent);

		if (href && title) {
			items[href] = title;
		}
	}

	return items;
}

function detectWeb(doc, url) {
	if (doc.querySelector('#app')) {
		Z.monitorDOMChanges(
			doc.querySelector('#app'),
			{ childList: true, subtree: true }
		);
	}

	if (url.includes('semanticscholar.org/search?')) {
		const hasSearchResults = getSearchResults(doc, true);
		if (hasSearchResults) {
			return 'multiple';
		}
	}

	return getItemTypeFromBibtex(doc);
}

function doWeb(doc, url) {
	const docType = detectWeb(doc, url)
	if (docType == 'multiple') {
		Zotero.selectItems(getSearchResults(doc, false), (items) => {
			if (items) {
				ZU.processDocuments(Object.keys(items), scrape);
			}
		});
		return;
	}

	scrape(doc, url);
}

function scrape(doc, url) {
	const itemType = getItemTypeFromBibtex(doc);
	const item = new Zotero.Item(itemType);

	const schemaTag = doc.querySelector('script.schema-data');
	const schemaObject = JSON.parse(schemaTag.innerHTML);
	const article = schemaObject['@graph'][1][0];
	
	item.title = article.name;
	item.abstractNote = article.abstract;
	item.date = article.datePublished;
	item.url = url;
	item.attachments.push({
		url: url,
		title: url.includes('semanticscholar.org/reader') ? 'Semantic Reader Link' : 'Semantic Scholar Link',
		mimeType: 'text/html',
	});

	if (article.about) {
		item.abstractNote = article.abstract.substring(article.about.length + 1);
		item.notes.push('[TLDR] ' + article.about);
	}

	if (itemType == 'conferencePaper' && article.publisher) {
		item.publisher = article.publisher.name;
	}

	if (itemType == 'journalArticle' && article.publication) {
		item.publicationTitle = article.publication;
	}

	if (article.author) {
		article.author.forEach(author => {
			item.creators.push(ZU.cleanAuthor(author.name, 'author'));
		});
	}
	
	if (article.sameAs) {
		item.DOI = article.sameAs;
	}

	if (article.mainEntity && (article.mainEntity.includes('pdfs.semanticscholar.org') || article.mainEntity.includes('.pdf'))) {
		item.attachments.push({
			title: 'Fulltext PDF',
			mimeType: 'application/pdf',
			url: article.mainEntity
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
					}
				],
				"notes": [],
				"seeAlso": [],
				"tags": [],
				"DOI": "10.1007/978-3-642-14770-8_33"
			}
		]
	}
]
/** END TEST CASES **/
