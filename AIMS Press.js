{
	"translatorID": "e456e5f4-7ec4-49fe-a208-673ef9f71e6f",
	"label": "AIMS Press",
	"creator": "nagoriyuki",
	"target": "^https?://(?:www\\.)?aimspress\\.com/article/doi/10\\.",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-06-22 02:59:41"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2026 nagoriyuki

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
	if (getDOI(doc, url)) {
		return "journalArticle";
	}
	return false;
}

function doWeb(doc, url) {
	scrape(doc, url);
}

function scrape(doc, url) {
	let doi = getDOI(doc, url);
	let pdfURL = getPDFURL(doc, url);
	let item = new Zotero.Item("journalArticle");
	let citation = getCitationParts(doc);

	item.title = getText(doc, "h1") || getAttr(doc, 'meta[property="og:title"]', "content");
	item.DOI = doi;
	item.url = url.replace(/#.*$/, "");
	item.publicationTitle = citation.publicationTitle || getJournalTitle(doc);
	item.date = citation.date || getPublishedDate(doc);
	item.volume = citation.volume;
	item.issue = citation.issue;
	item.pages = citation.pages;
	item.libraryCatalog = "AIMS Press";

	for (let author of getAuthors(doc, citation)) {
		item.creators.push(ZU.cleanAuthor(author, "author"));
	}

	if (pdfURL) {
		item.attachments.push({
			title: "Full Text PDF",
			url: pdfURL,
			mimeType: "application/pdf"
		});
	}

	item.complete();
}

function getDOI(doc, url) {
	let doi = ZU.cleanDOI(url.replace(/#.*$/, ""));
	if (doi) return doi;

	doi = ZU.cleanDOI(getText(doc, "body"));
	return doi || false;
}

function getPDFURL(doc, url) {
	let selectors = [
		'a[href$=".pdf"]',
		'a[href*="/PDF/"]',
		'a[href*="/pdf/"]',
		'a[href*=".pdf?"]'
	];

	for (let selector of selectors) {
		let href = getAttr(doc, selector, "href");
		if (href) return absoluteURL(href, url);
	}

	for (let link of doc.querySelectorAll("a")) {
		let label = ZU.trimInternal(link.textContent || "");
		let href = link.getAttribute("href");
		if (href && /download pdf|preview pdf|pdf/i.test(label)) {
			return absoluteURL(href, url);
		}
	}

	return false;
}

function getCitationParts(doc) {
	let bodyText = ZU.trimInternal(getText(doc, "body") || "");
	let match = bodyText.match(/Citation:\s+(.+?)\[J\]\.\s+(.+?),\s+(\d{4}),\s+(\d+)\((\d+)\):\s+([0-9]+(?:[-–][0-9]+)?)/);
	if (!match) {
		return {};
	}

	return {
		authors: getCitationAuthors(match[1], doc),
		publicationTitle: match[2],
		date: match[3],
		volume: match[4],
		issue: match[5],
		pages: match[6].replace("–", "-")
	};
}

function getCitationAuthors(citationTitleAndAuthors, doc) {
	let title = ZU.trimInternal(getText(doc, "h1") || "");
	let titleIndex = title ? citationTitleAndAuthors.indexOf(title) : -1;
	if (titleIndex == -1) {
		return [];
	}

	let authors = citationTitleAndAuthors.slice(0, titleIndex).replace(/\.\s*$/, "");
	return authors ? authors.split(/\s*,\s*/) : [];
}

function getAuthors(doc, citation) {
	if (citation.authors && citation.authors.length) {
		return citation.authors;
	}

	let authors = [];
	for (let selector of [
		'[class*="author"] a',
		'[class*="author"] span',
		'a[href*="author"]'
	]) {
		for (let elem of doc.querySelectorAll(selector)) {
			let author = ZU.trimInternal(elem.textContent || "");
			if (isAuthorName(author) && !authors.includes(author)) {
				authors.push(author);
			}
		}
		if (authors.length) break;
	}
	return authors;
}

function isAuthorName(author) {
	return author
		&& !/^(?:\d+(?:,\d+)*|本站搜索|百度学术搜索|万方数据库搜索|CNKI搜索)$/i.test(author)
		&& !/correspond|email|department|university|institute|school|college|laboratory/i.test(author);
}

function getJournalTitle(doc) {
	let journal = getText(doc, 'a[href*="/journal/"]')
		|| getText(doc, '[class*="journal"] a')
		|| getText(doc, '[class*="journal"]');
	return journal ? ZU.trimInternal(journal) : undefined;
}

function getPublishedDate(doc) {
	let bodyText = ZU.trimInternal(getText(doc, "body") || "");
	let match = bodyText.match(/Published:\s+([0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4})/);
	return match ? match[1] : undefined;
}


function getAttr(docOrElem, selector, attrName) {
	let elem = docOrElem.querySelector(selector);
	return elem ? elem.getAttribute(attrName) : null;
}

function getText(docOrElem, selector) {
	let elem = docOrElem.querySelector(selector);
	return elem ? elem.textContent : null;
}

function absoluteURL(href, baseURL) {
	try {
		return new URL(href, baseURL).href;
	}
	catch (e) {
		return href;
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.aimspress.com/article/doi/10.3934/matersci.2024041#FullTextWrap",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Influence of infill patterns and densities on the fatigue performance and fracture behavior of 3D-printed carbon fiber-reinforced PLA composites",
				"creators": [
					{
						"firstName": "Lubna Layth",
						"lastName": "Dawood",
						"creatorType": "author"
					},
					{
						"firstName": "Ehsan Sabah",
						"lastName": "AlAmeen",
						"creatorType": "author"
					}
				],
				"date": "2024",
				"DOI": "10.3934/matersci.2024041",
				"issue": "5",
				"libraryCatalog": "AIMS Press",
				"pages": "833-857",
				"publicationTitle": "AIMS Materials Science",
				"url": "https://www.aimspress.com/article/doi/10.3934/matersci.2024041",
				"volume": "11",
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
		"url": "https://www.aimspress.com/article/doi/10.3934/bioeng.2024025",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Optimization of laccase production by Pleurotus ostreatus (Jacq.) P. Kumm. using agro-industrial residues: a comparative study on peels of tucumã (Astrocaryum aculeatum G. Mey.) and pupunha (Bactris gasipaes Kunth) fruits",
				"creators": [
					{
						"firstName": "Kevyn Melo",
						"lastName": "Lotas",
						"creatorType": "author"
					},
					{
						"firstName": "Raissa Sayumy Kataki",
						"lastName": "Fonseca",
						"creatorType": "author"
					},
					{
						"firstName": "Joice Camila Martins da",
						"lastName": "Costa",
						"creatorType": "author"
					},
					{
						"firstName": "Ana Claudia Alves",
						"lastName": "Cortez",
						"creatorType": "author"
					},
					{
						"firstName": "Francisca das Chagas do Amaral",
						"lastName": "Souza",
						"creatorType": "author"
					},
					{
						"firstName": "Márcio Rodrigues",
						"lastName": "Barreto",
						"creatorType": "author"
					},
					{
						"firstName": "Lívia Melo",
						"lastName": "Carneiro",
						"creatorType": "author"
					},
					{
						"firstName": "João Paulo Alves",
						"lastName": "Silva",
						"creatorType": "author"
					},
					{
						"firstName": "Eveleise Samira Martins",
						"lastName": "Canto",
						"creatorType": "author"
					},
					{
						"firstName": "Flávia da Silva",
						"lastName": "Fernandes",
						"creatorType": "author"
					},
					{
						"firstName": "João Vicente Braga de",
						"lastName": "Souza",
						"creatorType": "author"
					},
					{
						"firstName": "Érica Simplício de",
						"lastName": "Souza",
						"creatorType": "author"
					}
				],
				"date": "2024",
				"DOI": "10.3934/bioeng.2024025",
				"issue": "4",
				"libraryCatalog": "AIMS Press",
				"pages": "561-573",
				"publicationTitle": "AIMS Bioengineering",
				"shortTitle": "Optimization of laccase production by Pleurotus ostreatus (Jacq.) P. Kumm. using agro-industrial residues",
				"url": "https://www.aimspress.com/article/doi/10.3934/bioeng.2024025",
				"volume": "11",
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
		"url": "https://www.aimspress.com/article/doi/10.3934/energy.2024047",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Production of biogas from co-substrates using cow dung, pig dung, and vegetable waste: A case study in Cambodia",
				"creators": [
					{
						"firstName": "Sokna",
						"lastName": "San",
						"creatorType": "author"
					},
					{
						"firstName": "Seyla",
						"lastName": "Heng",
						"creatorType": "author"
					},
					{
						"firstName": "Vanna",
						"lastName": "Torn",
						"creatorType": "author"
					},
					{
						"firstName": "Chivon",
						"lastName": "Choeung",
						"creatorType": "author"
					},
					{
						"firstName": "Horchhong",
						"lastName": "Cheng",
						"creatorType": "author"
					},
					{
						"firstName": "Seiha",
						"lastName": "Hun",
						"creatorType": "author"
					},
					{
						"firstName": "Chanmoly",
						"lastName": "Or",
						"creatorType": "author"
					}
				],
				"date": "2024",
				"DOI": "10.3934/energy.2024047",
				"issue": "5",
				"libraryCatalog": "AIMS Press",
				"pages": "1010-1024",
				"publicationTitle": "AIMS Energy",
				"shortTitle": "Production of biogas from co-substrates using cow dung, pig dung, and vegetable waste",
				"url": "https://www.aimspress.com/article/doi/10.3934/energy.2024047",
				"volume": "12",
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
		"url": "https://www.aimspress.com/article/doi/10.3934/environsci.2021028",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Valorization of second cheese whey through cultivation of extremophile microalga Galdieria sulphuraria",
				"creators": [
					{
						"firstName": "Giovanni L.",
						"lastName": "Russo",
						"creatorType": "author"
					},
					{
						"firstName": "Antonio L.",
						"lastName": "Langellotti",
						"creatorType": "author"
					},
					{
						"firstName": "Maria",
						"lastName": "Oliviero",
						"creatorType": "author"
					},
					{
						"firstName": "Marco",
						"lastName": "Baselice",
						"creatorType": "author"
					},
					{
						"firstName": "Raffaele",
						"lastName": "Sacchi",
						"creatorType": "author"
					},
					{
						"firstName": "Paolo",
						"lastName": "Masi",
						"creatorType": "author"
					}
				],
				"date": "2021",
				"DOI": "10.3934/environsci.2021028",
				"issue": "5",
				"libraryCatalog": "AIMS Press",
				"pages": "435-448",
				"publicationTitle": "AIMS Environmental Science",
				"url": "https://www.aimspress.com/article/doi/10.3934/environsci.2021028",
				"volume": "8",
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
		"url": "https://www.aimspress.com/article/doi/10.3934/environsci.2023047",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Advancing circular economy principles through wild black soldier flies",
				"creators": [
					{
						"firstName": "Atinuke",
						"lastName": "Chineme",
						"creatorType": "author"
					},
					{
						"firstName": "Getachew",
						"lastName": "Assefa",
						"creatorType": "author"
					},
					{
						"firstName": "Irene M.",
						"lastName": "Herremans",
						"creatorType": "author"
					},
					{
						"firstName": "Barry",
						"lastName": "Wylant",
						"creatorType": "author"
					},
					{
						"firstName": "Marwa",
						"lastName": "Shumo",
						"creatorType": "author"
					},
					{
						"firstName": "Aliceanna",
						"lastName": "Shoo",
						"creatorType": "author"
					},
					{
						"firstName": "Mturi",
						"lastName": "James",
						"creatorType": "author"
					},
					{
						"firstName": "Frida",
						"lastName": "Ngalesoni",
						"creatorType": "author"
					},
					{
						"firstName": "Anthony",
						"lastName": "Ndjovu",
						"creatorType": "author"
					},
					{
						"firstName": "Steve",
						"lastName": "Mbuligwe",
						"creatorType": "author"
					},
					{
						"firstName": "Mike",
						"lastName": "Yhedgo",
						"creatorType": "author"
					}
				],
				"date": "2023",
				"DOI": "10.3934/environsci.2023047",
				"issue": "6",
				"libraryCatalog": "AIMS Press",
				"pages": "868-893",
				"publicationTitle": "AIMS Environmental Science",
				"url": "https://www.aimspress.com/article/doi/10.3934/environsci.2023047",
				"volume": "10",
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
