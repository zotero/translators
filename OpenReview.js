{
	"translatorID": "b1988f2e-e080-42be-8464-38a327100952",
	"label": "OpenReview",
	"creator": "Tuo Chen",
	"target": "^https?://openreview\\.net/forum\\?id=",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-07-16 14:54:14"
}

/*
	SPDX-License-Identifier: MIT
	Copyright (c) 2026 Tuo Chen
*/

const bibTeXTranslatorID = '9cb70025-a888-4a29-a210-93ec52da40d4';
const preprintType = ZU.fieldIsValidForType('repository', 'preprint')
	? 'preprint'
	: 'manuscript';

function detectWeb(doc, url) {
	if (!getForumID(url)) return false;
	if (!getBibTeX(doc) && !meta(doc, 'citation_title')) return false;
	return detectItemType(doc);
}

async function doWeb(doc, url) {
	await scrape(doc, url);
}

async function scrape(doc, url = doc.location.href) {
	let bibtex = getBibTeX(doc);
	if (bibtex) {
		await importBibTeX(doc, url, bibtex);
	}
	else {
		scrapeMetadata(doc, url);
	}
}

function getBibTeX(doc) {
	let encoded = attr(doc, '[data-bibtex]', 'data-bibtex');
	if (!encoded) return null;

	try {
		return decodeURIComponent(encoded);
	}
	catch (e) {
		Zotero.debug(`OpenReview: could not URL-decode BibTeX: ${e}`);
		return encoded;
	}
}

function detectItemType(doc) {
	let bibtex = getBibTeX(doc) || '';
	let bibtexType = (bibtex.match(/^\s*@([a-z]+)/i) || [])[1];
	if (bibtexType) bibtexType = bibtexType.toLowerCase();

	if (bibtexType == 'article' || meta(doc, 'citation_journal_title')) {
		return 'journalArticle';
	}
	if (bibtexType == 'inproceedings'
		|| bibtexType == 'conference'
		|| meta(doc, 'citation_conference_title')) {
		return 'conferencePaper';
	}
	return preprintType;
}

async function importBibTeX(doc, url, bibtex) {
	let translator = Zotero.loadTranslator('import');
	translator.setTranslator(bibTeXTranslatorID);
	translator.setString(bibtex);
	translator.setHandler('itemDone', (_obj, item) => {
		delete item.itemID;
		finishItem(item, doc, url);
	});
	await translator.translate();
}

function scrapeMetadata(doc, url) {
	let itemType = detectItemType(doc);
	let item = new Zotero.Item(itemType);
	item.title = meta(doc, 'citation_title');
	item.abstractNote = meta(doc, 'citation_abstract');
	item.date = meta(doc, 'citation_publication_date')
		|| meta(doc, 'citation_online_date');
	item.DOI = meta(doc, 'citation_doi');

	for (let author of metas(doc, 'citation_author')) {
		item.creators.push(ZU.cleanAuthor(author, 'author', false));
	}

	let journal = meta(doc, 'citation_journal_title');
	let conference = meta(doc, 'citation_conference_title');
	if (itemType == 'journalArticle') {
		item.publicationTitle = journal;
		item.ISSN = meta(doc, 'citation_issn');
	}
	else if (itemType == 'conferencePaper') {
		item.proceedingsTitle = conference;
		item.conferenceName = conference;
	}
	else {
		item.repository = 'OpenReview';
	}

	finishItem(item, doc, url);
}

function finishItem(item, doc, url) {
	item.url = getCanonicalURL(url);
	item.libraryCatalog = 'OpenReview';

	// The BibTeX record is authoritative. The meta tags fill gaps on older
	// records and venue configurations.
	if (!item.abstractNote) item.abstractNote = meta(doc, 'citation_abstract');
	if (!item.DOI) item.DOI = meta(doc, 'citation_doi');
	if (item.itemType == 'journalArticle') {
		if (!item.publicationTitle) {
			item.publicationTitle = meta(doc, 'citation_journal_title');
		}
		if (!item.ISSN) item.ISSN = meta(doc, 'citation_issn');
	}

	let pdfURL = meta(doc, 'citation_pdf_url')
		|| `https://openreview.net/pdf?id=${getForumID(url)}`;
	item.attachments.push({
		title: 'Full Text PDF',
		url: pdfURL,
		mimeType: 'application/pdf',
		proxy: false
	});
	item.complete();
}

function getForumID(url) {
	let match = url.match(/[?&]id=([^&#]+)/);
	return match ? decodeURIComponent(match[1]) : null;
}

function getCanonicalURL(url) {
	return `https://openreview.net/forum?id=${getForumID(url)}`;
}

function meta(doc, name) {
	return attr(doc, `meta[name="${name}"]`, 'content');
}

function metas(doc, name) {
	return Array.from(doc.querySelectorAll(`meta[name="${name}"]`))
		.map(element => element.getAttribute('content'))
		.filter(Boolean);
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://openreview.net/forum?id=P6r9OxZ1vm",
		"defer": true,
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Bigger Isn’t Always Memorizing: Early Stopping Overparameterized Diffusion Models",
				"creators": [
					{
						"firstName": "Alessandro",
						"lastName": "Favero",
						"creatorType": "author"
					},
					{
						"firstName": "Antonio",
						"lastName": "Sclocchi",
						"creatorType": "author"
					},
					{
						"firstName": "Matthieu",
						"lastName": "Wyart",
						"creatorType": "author"
					}
				],
				"date": "2026",
				"ISSN": "2835-8856",
				"libraryCatalog": "OpenReview",
				"publicationTitle": "Transactions on Machine Learning Research",
				"url": "https://openreview.net/forum?id=P6r9OxZ1vm",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "<p>J2C Certification</p>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://openreview.net/forum?id=sBnaFSIuGR",
		"defer": true,
		"items": [
			{
				"itemType": "journalArticle",
				"title": "A quantitative analysis of semantic information in deep representations of text and images",
				"creators": [
					{
						"firstName": "Santiago",
						"lastName": "Acevedo",
						"creatorType": "author"
					},
					{
						"firstName": "Andrea",
						"lastName": "Mascaretti",
						"creatorType": "author"
					},
					{
						"firstName": "Riccardo",
						"lastName": "Rende",
						"creatorType": "author"
					},
					{
						"firstName": "Matéo",
						"lastName": "Mahaut",
						"creatorType": "author"
					},
					{
						"firstName": "Marco",
						"lastName": "Baroni",
						"creatorType": "author"
					},
					{
						"firstName": "Alessandro",
						"lastName": "Laio",
						"creatorType": "author"
					}
				],
				"date": "2026",
				"ISSN": "2835-8856",
				"libraryCatalog": "OpenReview",
				"publicationTitle": "Transactions on Machine Learning Research",
				"url": "https://openreview.net/forum?id=sBnaFSIuGR",
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
