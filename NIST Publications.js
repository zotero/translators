{
	"translatorID": "9bba4c1b-7189-49c5-845f-ca20026d9e51",
	"label": "NIST Publications",
	"creator": "Abe Jellinek",
	"target": "^https?://www\\.nist\\.gov/publications(/|\\?|$)",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-05-26 17:56:29"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2026 Abe Jellinek

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


const PUB_TYPE_MAP = {
	'NIST Pubs': 'report',
	Journals: 'journalArticle',
	Conferences: 'conferencePaper',
	'Book Chapters': 'bookSection',
	Books: 'book',
	Magazines: 'magazineArticle',
	Patents: 'patent'
};

function detectWeb(doc, url) {
	if (/\/publications\/[^/?#]+$/.test(url) && doc.querySelector('meta[name="citation_title"]')) {
		return PUB_TYPE_MAP[getFieldText(doc, 'Pub Type')] || 'report';
	}
	if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	let items = {};
	let found = false;
	let rows = doc.querySelectorAll('h3 > a[href*="/publications/"]');
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(row.textContent);
		if (!href || !title) continue;
		if (!/\/publications\/[^/?#]+$/.test(href)) continue;
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
	let translator = Zotero.loadTranslator('web');
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48'); // Embedded Metadata
	translator.setDocument(doc);

	let itemType = PUB_TYPE_MAP[getFieldText(doc, 'Pub Type')] || 'report';

	translator.setHandler('itemDone', (_obj, item) => {
		patchItem(item, doc, url, itemType);
		item.complete();
	});

	let em = await translator.getTranslatorObject();
	em.itemType = itemType;
	await em.doWeb(doc, url);
}

function patchItem(item, doc, url, itemType) {
	// citation_pdf_url is a DOI URL on NIST; EM may put it in attachments
	let citationPDFURL = attr(doc, 'meta[name="citation_pdf_url"]', 'content');
	let doi = citationPDFURL && citationPDFURL.match(/10\.\d{4,}\/\S+/);
	if (doi) {
		doi = decodeURIComponent(doi[0]).replace(/[).,]+$/, '');
		if (ZU.fieldIsValidForType('DOI', itemType)) {
			item.DOI = doi;
		}
		else {
			item.extra = (item.extra ? item.extra + '\n' : '') + 'DOI: ' + doi;
		}
	}

	let pdfLink = doc.querySelector('a[href*="get_pdf.cfm"], a[href$=".pdf"]');
	if (pdfLink) {
		item.attachments = [{
			title: 'Full Text PDF',
			url: pdfLink.href,
			mimeType: 'application/pdf'
		}];
	}

	item.url = url.replace(/[#?].*$/, '');

	// NIST puts the author list in dcterms.publisher, causing EM to mis-fill item.publisher
	let dctermsPublisher = attr(doc, 'meta[name="dcterms.publisher"]', 'content');
	if (item.publisher && item.publisher === dctermsPublisher) {
		item.publisher = '';
	}

	let pubSeries = getFieldText(doc, 'NIST Pub Series');
	let reportNumber = getFieldText(doc, 'Report Number');
	let citationField = getFieldText(doc, 'Citation');
	let publisherInfo = getFieldText(doc, 'Publisher Info');
	let volume = getFieldText(doc, 'Volume');
	let issue = getFieldText(doc, 'Issue');
	let proceedingsTitle = getFieldText(doc, 'Proceedings Title');
	let conferenceDates = getFieldText(doc, 'Conference Dates');
	let conferenceLocation = getFieldText(doc, 'Conference Location');

	switch (itemType) {
		case 'report':
			item.seriesTitle = pubSeries;
			item.reportNumber = reportNumber;
			item.reportType = pubSeries;
			item.institution = item.publisher = 'National Institute of Standards and Technology';
			item.place = 'Gaithersburg, MD';
			break;
		case 'journalArticle':
		case 'magazineArticle':
			if (citationField) {
				item.publicationTitle = citationField;
			}
			item.volume = volume;
			item.issue = issue;
			break;
		case 'conferencePaper':
			item.proceedingsTitle = proceedingsTitle;
			item.conferenceName = [proceedingsTitle, conferenceDates, conferenceLocation]
				.filter(Boolean).join(', ');
			break;
		case 'bookSection':
			if (citationField) {
				item.bookTitle = citationField;
			}
			if (publisherInfo) {
				let parts = publisherInfo.split(',').map(p => p.trim());
				item.publisher = parts.shift();
				item.place = parts.join(', ');
			}
			break;
		case 'book':
			if (publisherInfo) {
				let parts = publisherInfo.split(',').map(p => p.trim());
				item.publisher = parts.shift();
				item.place = parts.join(', ');
			}
			break;
	}

	// the abstract in meta tags is truncated, so prefer the full text from the page
	let abstractContainer = doc.querySelector('#abstract')?.parentElement;
	if (abstractContainer) {
		let fullAbstract = ZU.trimInternal(abstractContainer.textContent
			.replace(/^\s*Abstract\s*(permalink)?\s*/i, ''));
		if (fullAbstract
				&& (!item.abstractNote || fullAbstract.length > item.abstractNote.length)) {
			item.abstractNote = fullAbstract;
		}
	}

	// EM mis-fills publicationTitle from og:site_name for reports/etc
	if (itemType !== 'journalArticle' && itemType !== 'magazineArticle'
			&& item.publicationTitle === 'NIST') {
		item.publicationTitle = '';
	}

	// clean the date — EM picks up a datetime with timezone garbage
	if (item.date) {
		let dt = doc.querySelector('time[datetime]')?.getAttribute('datetime');
		item.date = ZU.strToISO(dt || item.date);
	}

	item.tags = [];
	let keywords = getFieldText(doc, 'Keywords');
	if (keywords) {
		item.tags = keywords.split(/[,;]/)
			.map(t => t.trim().replace(/\.$/, ''))
			.filter(Boolean);
	}
}

function getFieldText(doc, label) {
	for (let field of doc.querySelectorAll('.nist-field')) {
		let labelEl = field.querySelector('.nist-field__label');
		let itemEl = field.querySelector('.nist-field__item');
		if (!labelEl || !itemEl) continue;
		if (ZU.trimInternal(labelEl.textContent).replace(/\s*permalink$/i, '').trim() === label) {
			return ZU.trimInternal(itemEl.textContent);
		}
	}
	return '';
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.nist.gov/publications/nist-definition-cloud-computing",
		"items": [
			{
				"itemType": "report",
				"creators": [
					{
						"firstName": "Peter",
						"lastName": "Mell",
						"creatorType": "author"
					},
					{
						"firstName": "Timothy",
						"lastName": "Grance",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					{
						"tag": "Cloud Computing"
					},
					{
						"tag": "IaaS"
					},
					{
						"tag": "Infrastructure as a Service"
					},
					{
						"tag": "Measured Service"
					},
					{
						"tag": "On-demand Self Service"
					},
					{
						"tag": "PaaS"
					},
					{
						"tag": "Platform as a Service"
					},
					{
						"tag": "Rapid Elasticity"
					},
					{
						"tag": "Reserve Pooling"
					},
					{
						"tag": "SaaS"
					},
					{
						"tag": "Software as a Service"
					}
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"title": "The NIST Definition of Cloud Computing",
				"institution": "National Institute of Standards and Technology",
				"date": "2011-09-28",
				"url": "https://www.nist.gov/publications/nist-definition-cloud-computing",
				"abstractNote": "Cloud computing is a model for enabling ubiquitous, convenient, on-demand network access to a shared pool of configurable computing resources (e.g., networks, servers, storage, applications, and services) that can be rapidly provisioned and released with minimal management effort or service provider interaction. This cloud model is composed of five essential characteristics, three service models, and four deployment models.",
				"reportType": "Special Publication (NIST SP)",
				"language": "en",
				"libraryCatalog": "www.nist.gov",
				"extra": "DOI: 10.6028/NIST.SP.800-145",
				"seriesTitle": "Special Publication (NIST SP)",
				"reportNumber": "800-145",
				"place": "Gaithersburg, MD"
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.nist.gov/publications/leveraging-potential-cloud-security-service-level-agreements-through-standards",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Jesus",
						"lastName": "Luna",
						"creatorType": "author"
					},
					{
						"firstName": "Neeraj",
						"lastName": "Suri",
						"creatorType": "author"
					},
					{
						"firstName": "Michaela",
						"lastName": "Iorga",
						"creatorType": "author"
					},
					{
						"firstName": "Anil",
						"lastName": "Karmel",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					{
						"tag": "SLA"
					},
					{
						"tag": "cloud"
					},
					{
						"tag": "cloud security"
					},
					{
						"tag": "security"
					}
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"title": "Leveraging the Potential of Cloud Security Service-Level Agreements through Standards",
				"publicationTitle": "IEEE Cloud Computing Magazine",
				"date": "2015-07-15",
				"url": "https://www.nist.gov/publications/leveraging-potential-cloud-security-service-level-agreements-through-standards",
				"abstractNote": "This article takes a fresh view on cloud security by analyzing, from the risk management perspective, the specification of security in Cloud Service Level Agreements (secSLA), which forms a promising approach to empower customers in assessing and understanding Cloud security. Furthermore, we analyze the standardization landscape and present a real-world scenario to support our advocacy in the creation and adoption of secSLA's as enablers for negotiating, assessing and monitoring the achieved security levels in the Cloud supply chain.",
				"volume": "2",
				"issue": "3",
				"pages": "32-40",
				"language": "en",
				"libraryCatalog": "www.nist.gov",
				"DOI": "10.1109/MCC.2015.52"
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.nist.gov/publications/systemic-risks-cloud-computing-model-complex-systems-perspective",
		"items": [
			{
				"itemType": "conferencePaper",
				"creators": [
					{
						"firstName": "Vladimir V.",
						"lastName": "Marbukh",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					{
						"tag": "cloud computing model"
					},
					{
						"tag": "dynamic resource sharing"
					},
					{
						"tag": "overload"
					},
					{
						"tag": "systemic risk"
					}
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"title": "Systemic Risks in the Cloud Computing Model: Complex Systems Perspective",
				"date": "2017-01-19",
				"url": "https://www.nist.gov/publications/systemic-risks-cloud-computing-model-complex-systems-perspective",
				"abstractNote": "This paper reports on quantification and management of inherent systemic risk/performance tradeoff in the cloud computing model. We view Cloud as a Complex System and associate the systemic risks with a possibility of system phase transition to the undesirable persistent state. Our analysis under mean-field and fluid approximations suggests a shift in cloud architecture design and operation paradigm from maximizing the economic benefits to management and optimization of the inherent systemic risk/benefit tradeoffs. We argue that economics makes this tradeoff more pronounced by driving Cloud service providers towards the boundary of the operational regime, and thus increasing risk of overload when the system does not have sufficient capacity for sustaining the exogenous demand.",
				"language": "en",
				"libraryCatalog": "www.nist.gov",
				"DOI": "10.1109/CLOUD.2016.0124",
				"proceedingsTitle": "9th IEEE International Conference on Cloud Computing",
				"conferenceName": "9th IEEE International Conference on Cloud Computing, June 27-July 2, 2016, San Francisco, CA",
				"shortTitle": "Systemic Risks in the Cloud Computing Model"
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.nist.gov/publications/cloud-computing-security-foundations-and-challenges-chapter-7-managing-risk-cloud",
		"items": [
			{
				"itemType": "bookSection",
				"creators": [
					{
						"firstName": "Michaela",
						"lastName": "Iorga",
						"creatorType": "author"
					},
					{
						"firstName": "Anil",
						"lastName": "Karmel",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					{
						"tag": "cloud"
					},
					{
						"tag": "cloud architecture"
					},
					{
						"tag": "cloud computing"
					},
					{
						"tag": "cloud security"
					},
					{
						"tag": "security"
					}
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"title": "Cloud Computing Security: Foundations and Challenges - Chapter 7: Managing Risk in the Cloud",
				"publisher": "CRC Press",
				"date": "2016-09-08",
				"url": "https://www.nist.gov/publications/cloud-computing-security-foundations-and-challenges-chapter-7-managing-risk-cloud",
				"abstractNote": "The document, a chapter of the \"Cloud Computing Security: Foundations and Challenges\" (CRC Press) discusses the risk management for a cloud-based information system viewed from the cloud consumer perspective.",
				"pages": "79-86",
				"language": "en",
				"libraryCatalog": "www.nist.gov",
				"extra": "DOI: 10.1201/9781315372112",
				"bookTitle": "Cloud Computing Security: Foundations and Challenges",
				"place": "Boca Raton, FL",
				"shortTitle": "Cloud Computing Security"
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.nist.gov/publications/search?k=cloud+computing&page=1",
		"items": "multiple"
	}
]
/** END TEST CASES **/
