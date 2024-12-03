{
	"translatorID": "dac476e4-401d-430a-8571-a97c31c3b65e",
	"label": "Taylor and Francis+NEJM",
	"creator": "Sebastian Karcher",
	"target": "^https?://(www\\.)?(tandfonline\\.com|nejm\\.org)/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-12-03 15:37:21"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Taylor and Francis Translator
	Copyright © 2024 Sebastian Karcher and Abe Jellinek

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
	if (url.match(/\/doi(\/(abs|full|figure|epdf|epub))?\/10\./)) {
		return "journalArticle";
	}
	else if ((url.includes('/action/doSearch?') || url.includes('/toc/')) && getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}


function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	// multiples in search results:
	var rows = ZU.xpath(doc, '//article[contains(@class, "searchResultItem")]//a[contains(@href, "/doi/") and contains(@class, "ref")]');
	if (!rows.length) {
		// multiples in toc view:
		rows = ZU.xpath(doc, '//div[contains(@class, "articleLink") or contains(@class, "art_title")]/a[contains(@href, "/doi/") and contains(@class, "ref")]');
	}
	if (!rows.length) {
		rows = doc.querySelectorAll('.o-results li > a[href*="/doi/"]');
	}
	// https://www.nejm.org/toc/nejm/current
	if (!rows.length) {
		rows = doc.querySelectorAll('ul.toc_list .issue-item_title > a');
	}
	for (var i = 0; i < rows.length; i++) {
		var href = rows[i].href;
		var title = ZU.trimInternal(rows[i].textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}


async function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (!items) {
			return;
		}
		for (let url of Object.keys(items)) {
			await scrape(await requestDocument(url));
		}
	}
	else {
		await scrape(doc, url);
	}
}


async function scrape(doc, url = doc.location.href) {
	var match = url.match(/\/doi(?:\/(?:abs|full|figure|epdf|epub))?\/(10\.[^?#]+)/);
	var doi = match[1];

	var baseUrl = url.match(/https?:\/\/[^/]+/)[0];
	var postUrl = baseUrl + '/action/downloadCitation';
	var postBody = 	'downloadFileName=citation&'
					+ 'direct=true&'
					+ 'include=abs&'
					+ 'doi=';
	var bibtexFormat = '&format=bibtex';
	var risFormat = '&format=ris';

	let bibtexText = await requestText(postUrl, { method: 'POST', body: postBody + doi + bibtexFormat });
	let risText = await requestText(postUrl, { method: 'POST', body: postBody + doi + risFormat });

	// Z.debug(bibtexText)
	// Y1 is online publication date
	if (/^DA\s+-\s+/m.test(risText)) {
		risText = risText.replace(/^Y1(\s+-.*)/gm, '');
	}
	// Fix broken BibTeX as in https://github.com/zotero/translators/issues/3398
	if (/@article\{[^,]+\}/.test(bibtexText)) {
		Z.debug("Fixing BibTeX");
		bibtexText = bibtexText.replace(/(@article\{[^,]+)\}/, '$1');
		// Z.debug(bibtexText);
	}

	var item;
	var risItem;
	
	var bibtexTrans = Zotero.loadTranslator("import");
	bibtexTrans.setTranslator("9cb70025-a888-4a29-a210-93ec52da40d4"); // BibTeX
	bibtexTrans.setString(bibtexText);
	bibtexTrans.setHandler("itemDone", function (obj, partialItem) {
		item = partialItem;
	});
	await bibtexTrans.translate();

	var risTrans = Zotero.loadTranslator("import");
	risTrans.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7"); // RIS
	risTrans.setString(risText);
	risTrans.setHandler("itemDone", function (obj, partialItem) {
		risItem = partialItem;
	});
	await risTrans.translate();

	// BibTeX content can have HTML entities (e.g. &amp;) in various fields
	// We'll just try to unescape the most likely fields to contain these entities
	// Note that RIS data is not always correct, so we avoid using it
	var unescapeFields = ['title', 'publicationTitle', 'abstractNote'];
	for (var i = 0; i < unescapeFields.length; i++) {
		if (item[unescapeFields[i]]) {
			item[unescapeFields[i]] = ZU.unescapeHTML(item[unescapeFields[i]]);
		}
	}
	
	item.bookTitle = item.publicationTitle;
	if (!item.title) item.title = "<no title>";	// RIS title can be even worse, it actually says "null"
	if (risItem.date) item.date = risItem.date; // More complete
	if (item.date && /^\d{4}$/.test(item.date)) {
		// Use full date from HTML
		item.date = ZU.strToISO(text(doc, 'span[property="datePublished"]'));
	}
	if (item.pages) {
		item.pages = item.pages.replace('–', '-');
	}

	item.publisher = risItem.publisher;
	item.ISSN = risItem.ISSN;
	if (!item.ISSN && item.publicationTitle == 'New England Journal of Medicine') {
		item.ISSN = '0028-4793';
	}

	item.ISBN = risItem.ISBN;
	// clean up abstract removing Abstract:, Summary: or Abstract Summary:
	if (item.abstractNote) item.abstractNote = item.abstractNote.replace(/^(Abstract)?\s*(Summary)?:?\s*/i, "");
	if (item.title.toUpperCase() == item.title) {
		item.title = ZU.capitalizeTitle(item.title, true);
	}
	if (risItem.creators
			&& risItem.creators.length
			&& !risItem.creators.every(c => c.fieldMode === 1)) {
		item.creators = risItem.creators;
	}

	var subtitle = text(doc, 'h1 + .sub-title > h2');
	if (subtitle && !item.title.toLowerCase().includes(subtitle.toLowerCase())) {
		item.title = item.title.replace(/:$/, '') + ': ' + subtitle;
	}

	// add keywords
	var keywords = ZU.xpath(doc, '//div[contains(@class, "abstractKeywords")]//a');
	for (let keyword of keywords) {
		item.tags.push(keyword.textContent.replace(/[;\s]+$/, ''));
	}
	
	// add attachments
	if (url.includes('/doi/epub')) {
		item.attachments = [{
			title: 'Full Text EPUB',
			url: baseUrl + '/doi/epub/' + doi + '?download=true',
			mimeType: 'application/epub+zip'
		}];
	}
	else {
		item.attachments = [{
			title: 'Full Text PDF',
			url: baseUrl + '/doi/pdf/' + doi,
			mimeType: 'application/pdf'
		}];
	}

	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.tandfonline.com/doi/full/10.1080/17487870802543480",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Informality and productivity in the labor market in Peru",
				"creators": [
					{
						"lastName": "Chong",
						"firstName": "Alberto",
						"creatorType": "author"
					},
					{
						"lastName": "Galdo",
						"firstName": "Jose",
						"creatorType": "author"
					},
					{
						"lastName": "Saavedra",
						"firstName": "Jaime",
						"creatorType": "author"
					}
				],
				"date": "2008-12-01",
				"DOI": "10.1080/17487870802543480",
				"ISSN": "1748-7870",
				"abstractNote": "This article analyzes the evolution of informal employment in Peru from 1986 to 2001. Contrary to what one would expect, the informality rates increased steadily during the 1990s despite the introduction of flexible contracting mechanisms, a healthy macroeconomic recovery, and tighter tax codes and regulation. We explore different factors that may explain this upward trend including the role of labor legislation and labor allocation between/within sectors of economic activity. Finally, we illustrate the negative correlation between productivity and informality by evaluating the impacts of the Youth Training PROJOVEN Program that offers vocational training to disadvantaged young individuals. We find significant training impacts on the probability of formal employment for both males and females.",
				"issue": "4",
				"itemID": "doi:10.1080/17487870802543480",
				"libraryCatalog": "Taylor and Francis+NEJM",
				"pages": "229-245",
				"publicationTitle": "Journal of Economic Policy Reform",
				"url": "https://doi.org/10.1080/17487870802543480",
				"volume": "11",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Peru"
					},
					{
						"tag": "employment"
					},
					{
						"tag": "informality"
					},
					{
						"tag": "labor costs"
					},
					{
						"tag": "training"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.tandfonline.com/toc/clah20/22/4",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.tandfonline.com/doi/full/10.1080/17487870802543480",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Informality and productivity in the labor market in Peru",
				"creators": [
					{
						"lastName": "Chong",
						"firstName": "Alberto",
						"creatorType": "author"
					},
					{
						"lastName": "Galdo",
						"firstName": "Jose",
						"creatorType": "author"
					},
					{
						"lastName": "Saavedra",
						"firstName": "Jaime",
						"creatorType": "author"
					}
				],
				"date": "2008-12-01",
				"DOI": "10.1080/17487870802543480",
				"ISSN": "1748-7870",
				"abstractNote": "This article analyzes the evolution of informal employment in Peru from 1986 to 2001. Contrary to what one would expect, the informality rates increased steadily during the 1990s despite the introduction of flexible contracting mechanisms, a healthy macroeconomic recovery, and tighter tax codes and regulation. We explore different factors that may explain this upward trend including the role of labor legislation and labor allocation between/within sectors of economic activity. Finally, we illustrate the negative correlation between productivity and informality by evaluating the impacts of the Youth Training PROJOVEN Program that offers vocational training to disadvantaged young individuals. We find significant training impacts on the probability of formal employment for both males and females.",
				"issue": "4",
				"itemID": "doi:10.1080/17487870802543480",
				"libraryCatalog": "Taylor and Francis+NEJM",
				"pages": "229-245",
				"publicationTitle": "Journal of Economic Policy Reform",
				"url": "https://doi.org/10.1080/17487870802543480",
				"volume": "11",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Peru"
					},
					{
						"tag": "employment"
					},
					{
						"tag": "informality"
					},
					{
						"tag": "labor costs"
					},
					{
						"tag": "training"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.tandfonline.com/doi/full/10.1080/00036846.2011.568404",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Estimating willingness to pay by risk adjustment mechanism",
				"creators": [
					{
						"lastName": "Park",
						"firstName": "Joo Heon",
						"creatorType": "author"
					},
					{
						"lastName": "MacLachlan",
						"firstName": "Douglas L.",
						"creatorType": "author"
					}
				],
				"date": "2013-01-01",
				"DOI": "10.1080/00036846.2011.568404",
				"ISSN": "0003-6846",
				"abstractNote": "Measuring consumers’ Willingness To Pay (WTP) without considering the level of uncertainty in valuation and the consequent risk premiums will result in estimates that are biased toward lower values. This research proposes a model and method for correctly assessing WTP in cases involving valuation uncertainty. The new method, called Risk Adjustment Mechanism (RAM), is presented theoretically and demonstrated empirically. It is shown that the RAM outperforms the traditional method for assessing WTP, especially in a context of a nonmarket good such as a totally new product.",
				"issue": "1",
				"itemID": "doi:10.1080/00036846.2011.568404",
				"libraryCatalog": "Taylor and Francis+NEJM",
				"pages": "37-46",
				"publicationTitle": "Applied Economics",
				"url": "https://doi.org/10.1080/00036846.2011.568404",
				"volume": "45",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "D12"
					},
					{
						"tag": "D81"
					},
					{
						"tag": "M31"
					},
					{
						"tag": "adjustment mechanism"
					},
					{
						"tag": "contigent valuation method"
					},
					{
						"tag": "purchase decisions"
					},
					{
						"tag": "willingness to pay"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.nejm.org/toc/nejm/current",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.nejm.org/doi/full/10.1056/NEJMp1207920",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Cutting Family Planning in Texas",
				"creators": [
					{
						"firstName": "Kari",
						"lastName": "White",
						"creatorType": "author"
					},
					{
						"firstName": "Daniel",
						"lastName": "Grossman",
						"creatorType": "author"
					},
					{
						"firstName": "Kristine",
						"lastName": "Hopkins",
						"creatorType": "author"
					},
					{
						"firstName": "Joseph E.",
						"lastName": "Potter",
						"creatorType": "author"
					}
				],
				"date": "2012-09-27",
				"DOI": "10.1056/NEJMp1207920",
				"ISSN": "0028-4793",
				"abstractNote": "In 2011, Texas slashed funding for family planning services and imposed new restrictions on abortion care, affecting the health care of many low-income women. For demographically similar states, Texas's experience may be a harbinger of public health effects to come. Four fundamental principles drive public funding for family planning. First, unintended pregnancy is associated with negative health consequences, including reduced use of prenatal care, lower breast-feeding rates, and poor maternal and neonatal outcomes.1,2 Second, governments realize substantial cost savings by investing in family planning, which reduces the rate of unintended pregnancies and the costs of prenatal, delivery, postpartum, and infant care.3 Third, all Americans have the right to choose the timing and number of their children. And fourth, family planning enables women to attain their educational and career goals and families to provide for their children. These principles led . . .",
				"issue": "13",
				"itemID": "doi:10.1056/NEJMp1207920",
				"libraryCatalog": "Taylor and Francis+NEJM",
				"pages": "1179-1181",
				"publicationTitle": "New England Journal of Medicine",
				"url": "https://www.nejm.org/doi/full/10.1056/NEJMp1207920",
				"volume": "367",
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
		"url": "https://www.tandfonline.com/doi/abs/10.1080/0308106032000167373",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Multicriteria Evaluation of High-speed Rail, Transrapid Maglev and Air Passenger Transport in Europe",
				"creators": [
					{
						"lastName": "Janic",
						"firstName": "Milan",
						"creatorType": "author"
					}
				],
				"date": "2003-12-01",
				"DOI": "10.1080/0308106032000167373",
				"ISSN": "0308-1060",
				"abstractNote": "This article deals with a multicriteria evaluation of High-Speed Rail, Transrapid Maglev and Air Passenger Transport in Europe. Operational, socio-economic and environmental performance indicators of the specific high-speed transport systems are adopted as the evaluation criteria. By using the entropy method, weights are assigned to particular criteria in order to indicate their relative importance in decision-making. The TOPSIS method is applied to carry out the multicriteria evaluation and selection of the preferable alternative (high-speed system) under given circumstances.",
				"issue": "6",
				"itemID": "doi:10.1080/0308106032000167373",
				"libraryCatalog": "Taylor and Francis+NEJM",
				"pages": "491-512",
				"publicationTitle": "Transportation Planning and Technology",
				"url": "https://doi.org/10.1080/0308106032000167373",
				"volume": "26",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Entropy method"
					},
					{
						"tag": "Europe"
					},
					{
						"tag": "High-speed transport systems"
					},
					{
						"tag": "Interest groups"
					},
					{
						"tag": "Multicriteria analysis"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.tandfonline.com/action/doSearch?AllField=labor+market",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.tandfonline.com/doi/abs/10.1080/00380768.1991.10415050#.U_vX3WPATVE",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Concentration dependence of CO2 evolution from soil in chamber with low CO2 concentration (< 2,000 ppm), and CO2 diffusion/sorption model in soil",
				"creators": [
					{
						"lastName": "Naganawa",
						"firstName": "Takahiko",
						"creatorType": "author"
					},
					{
						"lastName": "Kyuma",
						"firstName": "Kazutake",
						"creatorType": "author"
					}
				],
				"date": "1991-09-01",
				"DOI": "10.1080/00380768.1991.10415050",
				"ISSN": "0038-0768",
				"abstractNote": "Concentration dependence of CO2 evolution from soil was studied under field and laboratory conditions. Under field conditions, when the CO2 concentration was measured with an infrared gas analyzer (IRGA) in a small and column-shaped chamber placed on the ground, the relationship among the CO2 concentration c (m3 m-3), time t (h), height of the chamber h, a constant rate of CO2 evolution from the soil v (m3 m-2 h-1), and an appropriate constant k, was expressed by the following equation, d c/d t = v/ h—k(c— a) (c=a at t = 0). Although most of the data of measured CO2 evolution fitted to this equation, the applicability of the equation was limited to the data to which a linear equation could not be fitted, because the estimated value of v had a larger error than that estimated by linear regression analysis, as observed by computer simulation. The concentration dependence shown above and some other variations were analyzed based on a sorption/diffusion model, i.e. they were associated with CO2-sorption by the soil and modified by the conditions of CO2 diffusion in the soil.",
				"issue": "3",
				"itemID": "doi:10.1080/00380768.1991.10415050",
				"libraryCatalog": "Taylor and Francis+NEJM",
				"pages": "381-386",
				"publicationTitle": "Soil Science and Plant Nutrition",
				"url": "https://doi.org/10.1080/00380768.1991.10415050",
				"volume": "37",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "CO2 diffusion"
					},
					{
						"tag": "CO2 evolution"
					},
					{
						"tag": "CO2 sorption"
					},
					{
						"tag": "concentration dependence"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.tandfonline.com/doi/figure/10.1080/00014788.2016.1157680?scroll=top&needAccess=true&",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Stakeholder perceptions of performance audit credibility",
				"creators": [
					{
						"lastName": "Funnell",
						"firstName": "Warwick",
						"creatorType": "author"
					},
					{
						"lastName": "Wade",
						"firstName": "Margaret",
						"creatorType": "author"
					},
					{
						"lastName": "Jupe",
						"firstName": "Robert",
						"creatorType": "author"
					}
				],
				"date": "2016-09-18",
				"DOI": "10.1080/00014788.2016.1157680",
				"ISSN": "0001-4788",
				"abstractNote": "This paper examines the credibility of performance audit at the micro-level of practice using the general framework of Birnbaum and Stegner's theory of source credibility in which credibility is dependent upon perceptions of the independence of the auditors, their technical competence and the usefulness of audit findings. It reports the results of a field study of a performance audit by the Australian National Audit Office conducted in a major government department. The paper establishes that problems of auditor independence, technical competence and perceived audit usefulness continue to limit the credibility of performance auditing.",
				"issue": "6",
				"itemID": "doi:10.1080/00014788.2016.1157680",
				"libraryCatalog": "Taylor and Francis+NEJM",
				"pages": "601-619",
				"publicationTitle": "Accounting and Business Research",
				"url": "https://doi.org/10.1080/00014788.2016.1157680",
				"volume": "46",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Australian National Audit Office"
					},
					{
						"tag": "credibility"
					},
					{
						"tag": "performance auditing"
					},
					{
						"tag": "source"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.nejm.org/doi/10.1056/NEJMcibr2307735",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "A Holy Grail — The Prediction of Protein Structure",
				"creators": [
					{
						"firstName": "Russ B.",
						"lastName": "Altman",
						"creatorType": "author"
					}
				],
				"date": "2023-10-11",
				"DOI": "10.1056/NEJMcibr2307735",
				"ISSN": "0028-4793",
				"abstractNote": "The 2023 Lasker Award for Basic Medical Research underscores the value of an AI system that predicts the three-dimensional structure of proteins from the one-dimensional sequence of their amino acids.",
				"issue": "15",
				"itemID": "doi:10.1056/NEJMcibr2307735",
				"libraryCatalog": "Taylor and Francis+NEJM",
				"pages": "1431-1434",
				"publicationTitle": "New England Journal of Medicine",
				"url": "https://www.nejm.org/doi/full/10.1056/NEJMcibr2307735",
				"volume": "389",
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
		"url": "https://www.tandfonline.com/doi/abs/10.1300/J150v03n04_02",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Service Value Determination: An Integrative Perspective",
				"creators": [
					{
						"lastName": "Jayanti",
						"firstName": "Rama K.",
						"creatorType": "author"
					},
					{
						"lastName": "Ghosh",
						"firstName": "Amit K.",
						"creatorType": "author"
					}
				],
				"date": "1996-05-10",
				"DOI": "10.1300/J150v03n04_02",
				"ISSN": "1050-7051",
				"abstractNote": "The authors investigate the efficacy of an integrated perspective on perceived service value, derived out of bringing together two consumer behavior research streams, those of utilitarian and behavioral theories. Theoretical, arguments and empirical evidence are used to show that the integrative perspective provides a better representation of perceived value than either the utilitarian or the behavioral perspective alone. Additionally, acquisition utility is shown to be similar to perceived quality, suggesting that a more parsimonious representation of perceived value entails the use of transaction utility and perceived quality as predictor variables. Finally, the authors argue that within a service encounter context, perceived quality of the service assumes more importance than price perceptions in explaining perceived value. Managerial implications and future research directions are discussed.",
				"issue": "4",
				"itemID": "doi:10.1300/J150v03n04\\_02",
				"libraryCatalog": "Taylor and Francis+NEJM",
				"pages": "5-25",
				"publicationTitle": "Journal of Hospitality & Leisure Marketing",
				"shortTitle": "Service Value Determination",
				"url": "https://doi.org/10.1300/J150v03n04_02",
				"volume": "3",
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
		"url": "https://www.tandfonline.com/doi/epdf/10.1080/01457632.2023.2255811?needAccess=true",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Investigation of Icephobic Coatings for Supercooling Heat Exchangers under Submerged Conditions Using Ice Detection Equipment",
				"creators": [
					{
						"lastName": "Frandsen",
						"firstName": "Jens R.",
						"creatorType": "author"
					},
					{
						"lastName": "Losada",
						"firstName": "Ricardo",
						"creatorType": "author"
					},
					{
						"lastName": "Carbonell",
						"firstName": "Daniel",
						"creatorType": "author"
					}
				],
				"date": "2024-08-21",
				"DOI": "10.1080/01457632.2023.2255811",
				"ISSN": "0145-7632",
				"abstractNote": "By using ice slurry generated through a supercooler as storage, it is possible to reduce energy consumption due to high energy density and heat transfer rate along with the phase change. The supercooled water will then be disturbed to create ice crystals in a crystallizer. The main challenge is to prevent the formation of ice in the supercooler since this leads to its blockage. One aim of the European H2020 TRI-HP project is to develop icephobic coatings for supercoolers, that promote high-water supercooling and avoid the formation of ice. In this study, three coatings to prevent or depress freezing in supercoolers are investigated. Specialized equipment for testing freezing on submerged surfaces has been developed, and the results have been correlated to standard surface properties like roughness and contact angle. It was found that the submerged surfaces do not necessarily follow normal icing theory, where freeze depression is related to contact angle. Instead, it is believed that the mobility of surface additives in amphiphilic coatings has an important role.",
				"issue": "15",
				"itemID": "doi:10.1080/01457632.2023.2255811",
				"libraryCatalog": "Taylor and Francis+NEJM",
				"pages": "1286-1293",
				"publicationTitle": "Heat Transfer Engineering",
				"url": "https://doi.org/10.1080/01457632.2023.2255811",
				"volume": "45",
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
		"url": "https://www.tandfonline.com/doi/epub/10.1080/01457632.2023.2255811?needAccess=true",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Investigation of Icephobic Coatings for Supercooling Heat Exchangers under Submerged Conditions Using Ice Detection Equipment",
				"creators": [
					{
						"lastName": "Frandsen",
						"firstName": "Jens R.",
						"creatorType": "author"
					},
					{
						"lastName": "Losada",
						"firstName": "Ricardo",
						"creatorType": "author"
					},
					{
						"lastName": "Carbonell",
						"firstName": "Daniel",
						"creatorType": "author"
					}
				],
				"date": "2024-08-21",
				"DOI": "10.1080/01457632.2023.2255811",
				"ISSN": "0145-7632",
				"abstractNote": "By using ice slurry generated through a supercooler as storage, it is possible to reduce energy consumption due to high energy density and heat transfer rate along with the phase change. The supercooled water will then be disturbed to create ice crystals in a crystallizer. The main challenge is to prevent the formation of ice in the supercooler since this leads to its blockage. One aim of the European H2020 TRI-HP project is to develop icephobic coatings for supercoolers, that promote high-water supercooling and avoid the formation of ice. In this study, three coatings to prevent or depress freezing in supercoolers are investigated. Specialized equipment for testing freezing on submerged surfaces has been developed, and the results have been correlated to standard surface properties like roughness and contact angle. It was found that the submerged surfaces do not necessarily follow normal icing theory, where freeze depression is related to contact angle. Instead, it is believed that the mobility of surface additives in amphiphilic coatings has an important role.",
				"issue": "15",
				"itemID": "doi:10.1080/01457632.2023.2255811",
				"libraryCatalog": "Taylor and Francis+NEJM",
				"pages": "1286-1293",
				"publicationTitle": "Heat Transfer Engineering",
				"url": "https://doi.org/10.1080/01457632.2023.2255811",
				"volume": "45",
				"attachments": [
					{
						"title": "Full Text EPUB",
						"mimeType": "application/epub+zip"
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
