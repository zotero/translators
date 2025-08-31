{
	"translatorID": "411f9a8b-64f3-4465-b7df-a3c988b602f3",
	"label": "RePEc - Econpapers",
	"creator": "Sebastian Karcher",
	"target": "^https?://econpapers\\.repec\\.org/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-04-29 03:02:00"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2011 Sebastian Karcher and contributors.

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

// NOTE: EconPapers now implements mostly acceptable metadata, and their own
// citation export is implemented as entirely client-side JS code that scrapes
// the metadata.

function detectWeb(doc, url) {
	let path = new URL(url).pathname;

	if (isSearch(path) && getSearchResults(doc, true)) {
		return 'multiple';
	}

	if (isListing(path) && getListing(doc, true)) {
		return 'multiple';
	}

	let pathMatch = path.match(/\/(\w+)\/.+\/.+/);
	if (pathMatch) {
		switch (pathMatch[1]) {
			case "article":
				return "journalArticle";
			case "software":
				return "computerProgram";
			case "paper":
				return "report"; // working papers
			case "bookchap":
				return getBookChapType(doc);
		}
	}

	return false;
}

// determine whether the type of the item under the path "/bookchap" is a book
// or bookSection (chapter)
function getBookChapType(doc) {
	let type = attr(doc, "meta[name='redif-type']", "content");
	// fallback when metadata is missing
	if (!type) {
		let accessStatisticsLine = ZU.xpathText(doc,
			'//div[@class = "bodytext"]/p[.//a[contains(@href, "/paperstat.pf")]][1]');
		if (accessStatisticsLine) {
			accessStatisticsLine = ZU.trimInternal(accessStatisticsLine);
			// take last word
			let components = accessStatisticsLine.split(" ");
			type = components[components.length - 1];
		}
	}

	switch (type) {
		case "book":
			return "book";
		case "chapter":
			return "bookSection";
		default:
			Z.debug(`Unknown book or book-section type ${type}`);
	}

	return false;
}

function isSearch(path) {
	return path.startsWith("/scripts/search.pf");
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.reflist > a');
	if (!rows.length) rows = doc.querySelectorAll('ol b > a');
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

function isListing(path) {
	return /\/(article|paper|software|bookchap)\/.+\/(default\d+\.htm)?$/.test(path);
}

function getListing(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.bodytext dt a');
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
		let path = new URL(url).pathname;
		let listFunction = isSearch(path) ? getSearchResults : getListing;
		let items = await Zotero.selectItems(listFunction(doc, false));
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
	let type = detectWeb(doc, url);
	let translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);

	translator.setHandler('itemDone', (_obj, item) => {
		cleanItem(item);

		switch (type) {
			case "report":
				item.reportType = "Working paper";
				break;
			case "journalArticle":
				handleJournalArticle(item);
				break;
			case "book":
				handleBook(item, doc);
				break;
			case "computerProgram":
				handleComputerProgram(item, doc);
				break;
		}

		finalize(item, doc);
	});

	let em = await translator.getTranslatorObject();
	em.itemType = type;
	em.addCustomFields({
		book_title: 'bookTitle', // eslint-disable-line camelcase
		series: 'seriesTitle'
	});
	await em.doWeb(doc, url);
}

function handleJournalArticle(item) {
	// clean up the seriesTitle that we've EM translator to produce, because
	// it's redundant with the publicationTitle
	if (item.publicationTitle && item.publicationTitle === item.seriesTitle) {
		delete item.seriesTitle;
	}
}

function handleBook(item, doc) {
	let pages = getBoldHeadLineContent(doc, "Pages:");
	if (pages && !isNaN(parseInt(pages))) {
		item.numPages = pages;
	}
}

function handleComputerProgram(item, doc) {
	let lang = getBoldHeadLineContent(doc, "Language:");
	if (lang) {
		item.programmingLanguage = lang;
	}

	let date = getBoldHeadLineContent(doc, "Date:");
	if (date.includes(",")) {
		let origDate = date.split(",")[0];
		if (origDate) {
			addExtraLine(item, `Original Date: ${origDate}`);
		}
	}
	// TODO: "See Also" article for code from article?
}

function finalize(item, doc) {
	let jelCodes = ZU.trimInternal(attr(doc, "meta[name='JEL-Codes']", "content"));
	if (jelCodes) {
		for (let code of jelCodes.split("; ")) {
			item.tags.push(code);
		}
	}

	let doiElem = paragraphHeadedBy(doc, "DOI:");
	if (doiElem) {
		let doi = text(doiElem, "a[href^='/scripts/redir.pf']").trim();
		Z.debug(`Possible DOI string: ${doi}`, 4);
		if (/10\.\d{4,}\/.+/.test(doi)) {
			item.DOI = doi;
		}
	}

	let downloadParagraph = paragraphHeadedBy(doc, "Downloads:");
	if (downloadParagraph) {
		creatAttachments(
			downloadParagraph.querySelectorAll("a[href^='/scripts/redir.pf']"),
			item,
			item.itemType !== "computerProgram" // don't save links to source code; there can be too many
		);
	}

	item.libraryCatalog = "EconPapers"; // their own self-appellation and styling

	item.complete();
}

// Find paragraph (<p> element) by the text content of the bold heading in it
// (<b> element)
function paragraphHeadedBy(doc, heading) {
	let container = doc.querySelector(".bodytext");
	if (!container) return null;

	let quotedStr = JSON.stringify(heading);
	let elem = ZU.xpath(container,
		`//p[.//b[starts-with(text(), ${quotedStr})][1]]`)[0];
	return elem || null;
}

// For a single line (part of the inner html of a <p> element) that starts with
// a <b> heading, retrieve the text that appears after the heading before the
// next element
function getBoldHeadLineContent(doc, heading) {
	let container = doc.querySelector(".bodytext");
	if (!container) return null;

	let quotedStr = JSON.stringify(heading);
	let node = ZU.xpath(container,
		`//p//b[starts-with(text(), ${quotedStr})]`)[0];
	if (!node) return null;

	let acc = [];
	while ((node = node.nextSibling) && node.nodeType === 3/* text node */) {
		acc.push(node.textContent);
	}
	return ZU.trimInternal(acc.join(""));
}

// Create attachments from the <a> elements
function creatAttachments(elements, item, keepNonPDF) {
	for (let elem of elements) {
		// the site's own redirect facility; we will work around it to save a
		// redirect
		if (!elem.href) continue;
		let redirectURLObj = new URL(elem.href);
		let targetURL = redirectURLObj.searchParams.get("u") || "";
		// Remove the redirect script's handle parameter
		targetURL = targetURL.replace(/;h=repec:.+$/i, "");
		if (!targetURL) continue;
		let targetURLObj;
		try {
			targetURLObj = new URL(targetURL);
		}
		catch (err) {
			continue;
		}

		Z.debug(`External link: ${targetURL}`, 4);
		let doi;
		if (!item.DOI && (doi = doiFromExtLink(targetURLObj))) {
			Z.debug(`DOI (from external link): ${doi}`, 4);
			item.DOI = doi;
		}
		// Best-effort try for PDF link; NOTE that even if the page may say
		// "application/pdf" beside a link, that link could point to a landing
		// page rather than the PDF file.
		if (maybePDF(targetURLObj)) {
			item.attachments.push({
				title: "RePEc PDF",
				url: targetURL,
				mimeType: "application/pdf"
			});
		}
		else if (keepNonPDF) {
			item.attachments.push({
				title: "RePEc External Link",
				url: targetURL,
				snapshot: false // don't download
			});
		}
	}
}

// A conservative DOI-extractor that works on the "Downloads" section. Only try
// to extract if the link's domain is a well-known resolver.
function doiFromExtLink(urlObj) {
	if (/^((dx\.)?doi\.org|hdl\.handle\.net)$/.test(urlObj.hostname)) {
		let m = decodeURIComponent(urlObj.pathname).match(/^\/(10\.\d{4,}\/.+)/);
		if (m) {
			return m[1];
		}
	}
	return false;
}

function maybePDF(urlObj) {
	return /(\.|\/)pdf$/.test(urlObj.pathname);
}

// add a string line to the item's extra field
function addExtraLine(item, line) {
	if (!item.extra) {
		item.extra = line;
	}
	else {
		item.extra += item.extra.endsWith("\n") ? line : `\n${line}`;
	}
}

// Remove unnecessary and non-informative fields from embedded metadata,
// especially the DC fields
var FIELDS_TO_CLEAN = ["label", "distributor", "letterType", "manuscriptType", "mapType", "thesisType", "websiteType", "presentationType", "postType", "audioFileType", "reportType"];

function cleanItem(item) {
	for (let field of FIELDS_TO_CLEAN) {
		if (Object.hasOwn(item, field)) {
			delete item[field];
		}
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://econpapers.repec.org/paper/nbrnberwo/11309.htm",
		"items": [
			{
				"itemType": "report",
				"title": "Does Voting Technology Affect Election Outcomes? Touch-screen Voting and the 2004 Presidential Election",
				"creators": [
					{
						"firstName": "David",
						"lastName": "Card",
						"creatorType": "author"
					},
					{
						"firstName": "Enrico",
						"lastName": "Moretti",
						"creatorType": "author"
					}
				],
				"date": "2005/05",
				"abstractNote": "Supporters of touch-screen voting claim it is a highly reliable voting technology, while a growing number of critics argue that paperless electronic voting systems are vulnerable to fraud. In this paper we use county-level data on voting technologies in the 2000 and 2004 presidential elections to test whether voting technology affects electoral outcomes. We first show that there is a positive correlation between use of touch-screen voting and the level of electoral support for George Bush. This is true in models that compare the 2000-2004 changes in vote shares between adopting and non-adopting counties within a state, after controlling for income, demographic composition, and other factors. Although small, the effect could have been large enough to influence the final results in some closely contested states. While on the surface this pattern would appear to be consistent with allegations of voting irregularities, a closer examination suggests this interpretation is incorrect. If irregularities did take place, they would be most likely in counties that could potentially affect statewide election totals, or in counties where election officials had incentives to affect the results. Contrary to this prediction, we find no evidence that touch-screen voting had a larger effect in swing states, or in states with a Republican Secretary of State. Touch-screen voting could also indirectly affect vote shares by influencing the relative turnout of different groups. We find that the adoption of touch-screen voting has a negative effect on estimated turnout rates, controlling for state effects and a variety of county-level controls. This effect is larger in counties with a higher fraction of Hispanic residents (who tend to favor Democrats) but not in counties with more African Americans (who are overwhelmingly Democrat voters). Models for the adoption of touch-screen voting suggest it was more likely to be used in counties with a higher fraction of Hispanic and Black residents, especially in swing states. Nevertheless, the impact of non-random adoption patterns on vote shares is small.",
				"institution": "National Bureau of Economic Research, Inc",
				"libraryCatalog": "EconPapers",
				"reportNumber": "11309",
				"reportType": "Working paper",
				"seriesTitle": "NBER Working Papers",
				"shortTitle": "Does Voting Technology Affect Election Outcomes?",
				"url": "https://EconPapers.repec.org/RePEc:nbr:nberwo:11309",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					},
					{
						"title": "RePEc PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "H0"
					},
					{
						"tag": "J0"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://econpapers.repec.org/software/bocbocode/s439301.htm",
		"items": [
			{
				"itemType": "computerProgram",
				"title": "ESTOUT: Stata module to make regression tables",
				"creators": [
					{
						"firstName": "Ben",
						"lastName": "Jann",
						"creatorType": "author"
					}
				],
				"date": "2023/02/12",
				"abstractNote": "estout produces a table of regression results from one or several models for use with spreadsheets, LaTeX, HTML, or a word-processor table. eststo stores a quick copy of the active estimation results for later tabulation. esttab is a wrapper for estout. It displays a pretty looking publication-style regression table without much typing. estadd adds additional results to the e()-returns for one or several models previously fitted and stored. This package subsumes the previously circulated esto, esta, estadd, and estadd_plus. An earlier version of estout is available as estout1.",
				"company": "Boston College Department of Economics",
				"extra": "Original Date: 2004-07-22",
				"libraryCatalog": "EconPapers",
				"programmingLanguage": "Stata",
				"seriesTitle": "Statistical Software Components",
				"shortTitle": "ESTOUT",
				"url": "https://EconPapers.repec.org/RePEc:boc:bocode:s439301",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "HTML"
					},
					{
						"tag": "LaTeX"
					},
					{
						"tag": "estimates"
					},
					{
						"tag": "output"
					},
					{
						"tag": "word processor"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://econpapers.repec.org/article/emerafpps/v_3a9_3ay_3a2010_3ai_3a3_3ap_3a244-263.htm",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "The impact of changes in firm performance and risk on director turnover",
				"creators": [
					{
						"firstName": "Sharad",
						"lastName": "Asthana",
						"creatorType": "author"
					},
					{
						"firstName": "Steven",
						"lastName": "Balsam",
						"creatorType": "author"
					}
				],
				"date": "2010",
				"DOI": "10.1108/14757701011068057",
				"ISSN": "1475-7702",
				"abstractNote": "Purpose - The purpose of this paper is to show that director turnover varies in predictable and intuitive ways with director incentives. Design/methodology/approach - The paper uses a sample of 51,388 observations pertaining to 13,084 directors who served 1,065 firms during the period 1997‐2004. The data are obtained from RiskMetrics, Compustat, Execu‐Comp, CRSP, IBES, and the Corporate Library databases. Portfolio analysis, logit, and GLIMMIX regression analysis are used for the tests. Findings - The paper provides evidence that directors are more likely to leave when firm performance deteriorates and the firm becomes riskier. While turnover increasing as firm performance deteriorates is consistent with involuntary turnover, directors are also more likely to leave in advance of deteriorating performance. The latter is consistent with directors having inside information and acting on that information to protect their wealth and reputation. When inside and outside director turnover is contrasted, the association between turnover and performance is stronger for inside directors. Research limitations - Since data are obtained from multiple databases, the sample may be biased in favor of larger firms. The results may, therefore, not be applicable to smaller firms. To the extent that the story is unable to differentiate between voluntary and involuntary director turnover, the results should be interpreted with caution. Originality/value - Even though extant research has looked extensively at the determinants of CEO turnover, little has been written on director turnover. Director turnover is an important topic to study, since directors, especially outside directors, possess a significant oversight role in the corporation.",
				"issue": "3",
				"libraryCatalog": "EconPapers",
				"pages": "244-263",
				"publicationTitle": "Review of Accounting and Finance",
				"url": "https://EconPapers.repec.org/RePEc:eme:rafpps:v:9:y:2010:i:3:p:244-263",
				"volume": "9",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					},
					{
						"title": "RePEc External Link",
						"snapshot": false
					},
					{
						"title": "RePEc PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Company performance"
					},
					{
						"tag": "Directors"
					},
					{
						"tag": "Employee turnover"
					},
					{
						"tag": "Risk analysis"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://econpapers.repec.org/bookchap/agshnhavl/207771.htm",
		"items": [
			{
				"itemType": "book",
				"title": "Lecture notes in econometric methods and analysis",
				"creators": [
					{
						"firstName": "Joseph",
						"lastName": "Havlicek",
						"creatorType": "author"
					}
				],
				"date": "1980",
				"abstractNote": "The late Professor Havlicek's Econometrics notes are often cited. But until now they have been very difficult to obtain. Here, you have the complete notes as published in Fall 1976 and in Fall 1980. They are identical in content. However, neither PDF reproduction is perfect. If there is a passage that seems difficult to read in one version, then please try the other!",
				"libraryCatalog": "EconPapers",
				"publisher": "AgEcon Search",
				"url": "https://EconPapers.repec.org/RePEc:ags:hnhavl:207771",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					},
					{
						"title": "RePEc PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Teaching/Communication/Extension/Profession"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://econpapers.repec.org/bookchap/bisbisifc/58-24.htm",
		"items": [
			{
				"itemType": "bookSection",
				"title": "A characterisation of financial assets based on their cash-flow structure",
				"creators": [
					{
						"firstName": "Celestino",
						"lastName": "Girón",
						"creatorType": "author"
					}
				],
				"date": "2023",
				"abstractNote": "By Celestino Girón; A characterisation of financial assets based on their cash-flow structure",
				"bookTitle": "Post-pandemic landscape for central bank statistics",
				"libraryCatalog": "EconPapers",
				"publisher": "Bank for International Settlements",
				"url": "https://EconPapers.repec.org/RePEc:bis:bisifc:58-24",
				"volume": "58",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					},
					{
						"title": "RePEc PDF",
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
		"url": "https://econpapers.repec.org/scripts/search.pf?ft=&adv=true&wp=on&art=on&bkchp=on&pl=&auth=on&online=on&sort=rank&lgc=AND&aus=&ar=on&kw=second+hand+car&jel=&nep=&ni=&nit=epdate",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://econpapers.repec.org/scripts/search.pf?jel=C81",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://econpapers.repec.org/software/bocbocode/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://econpapers.repec.org/bookchap/fipfednmo/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://econpapers.repec.org/article/eeemoneco/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://econpapers.repec.org/paper/ehllserod/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://econpapers.repec.org/article/oupcopoec/v_3a39_3ay_3a2020_3ai_3a1_3ap_3a91-94..htm",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Gresham’s Law: The Life and World of Queen Elizabeth I’s Banker",
				"creators": [
					{
						"firstName": "Mohamed A.",
						"lastName": "El-Erian",
						"creatorType": "author"
					}
				],
				"date": "2020",
				"DOI": "10.1093/cpe/bzaa009",
				"ISSN": "0277-5921",
				"abstractNote": "By Mohamed A El-Erian; Gresham’s Law: The Life and World of Queen Elizabeth I’s Banker",
				"issue": "1",
				"libraryCatalog": "EconPapers",
				"pages": "91-94",
				"publicationTitle": "Contributions to Political Economy",
				"shortTitle": "Gresham’s Law",
				"url": "https://EconPapers.repec.org/RePEc:oup:copoec:v:39:y:2020:i:1:p:91-94.",
				"volume": "39",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					},
					{
						"title": "RePEc External Link",
						"snapshot": false
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
		"url": "https://econpapers.repec.org/article/oupcopoec/v_3a39_3ay_3a2020_3ai_3a1_3ap_3a91-94..htm",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Gresham’s Law: The Life and World of Queen Elizabeth I’s Banker",
				"creators": [
					{
						"firstName": "Mohamed A.",
						"lastName": "El-Erian",
						"creatorType": "author"
					}
				],
				"date": "2020",
				"DOI": "10.1093/cpe/bzaa009",
				"ISSN": "0277-5921",
				"abstractNote": "By Mohamed A El-Erian; Gresham’s Law: The Life and World of Queen Elizabeth I’s Banker",
				"issue": "1",
				"libraryCatalog": "EconPapers",
				"pages": "91-94",
				"publicationTitle": "Contributions to Political Economy",
				"shortTitle": "Gresham’s Law",
				"url": "https://EconPapers.repec.org/RePEc:oup:copoec:v:39:y:2020:i:1:p:91-94.",
				"volume": "39",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					},
					{
						"title": "RePEc External Link",
						"snapshot": false
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
		"url": "https://econpapers.repec.org/paper/bisbiswps/default8.htm",
		"items": "multiple"
	}
]
/** END TEST CASES **/
