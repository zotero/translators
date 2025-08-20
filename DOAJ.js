{
	"translatorID": "53734210-2284-437f-9896-8ad65917c343",
	"label": "DOAJ",
	"creator": "Abe Jellinek",
	"target": "^https?://(www\\.)?doaj\\.org/(article|search)/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-08-08 16:00:53"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2021 Abe Jellinek
	
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


function detectWeb(doc, _url) {
	if (doc.querySelector('meta[name="citation_title"]')) {
		return "journalArticle";
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('h3 > a[href*="/article/"]');
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
	var translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	
	translator.setHandler('itemDone', function (obj, item) {
		item.abstractNote = text(doc, '.article-details__abstract');
		item.attachments = [];
		
		for (let button of doc.querySelectorAll('.button')) {
			if (button.textContent.toLowerCase().includes('read online')) {
				item.url = button.href;
				break;
			}
		}
		
		item.complete();
	});

	translator.getTranslatorObject(function (trans) {
		trans.doWeb(doc, url);
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://doaj.org/article/0006d8f8ca3e4af1b3ec14a07e88bb12",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "MiRNA Profiles in Lymphoblastoid Cell Lines of Finnish Prostate Cancer Families.",
				"creators": [
					{
						"firstName": "Daniel",
						"lastName": "Fischer",
						"creatorType": "author"
					},
					{
						"firstName": "Tiina",
						"lastName": "Wahlfors",
						"creatorType": "author"
					},
					{
						"firstName": "Henna",
						"lastName": "Mattila",
						"creatorType": "author"
					},
					{
						"firstName": "Hannu",
						"lastName": "Oja",
						"creatorType": "author"
					},
					{
						"firstName": "Teuvo L. J.",
						"lastName": "Tammela",
						"creatorType": "author"
					},
					{
						"firstName": "Johanna",
						"lastName": "Schleutker",
						"creatorType": "author"
					}
				],
				"date": "2015/01/01",
				"DOI": "10.1371/journal.pone.0127427",
				"ISSN": "1932-6203",
				"abstractNote": "BACKGROUND:Heritable factors are evidently involved in prostate cancer (PrCa) carcinogenesis, but currently, genetic markers are not routinely used in screening or diagnostics of the disease. More precise information is needed for making treatment decisions to distinguish aggressive cases from indolent disease, for which heritable factors could be a useful tool. The genetic makeup of PrCa has only recently begun to be unravelled through large-scale genome-wide association studies (GWAS). The thus far identified Single Nucleotide Polymorphisms (SNPs) explain, however, only a fraction of familial clustering. Moreover, the known risk SNPs are not associated with the clinical outcome of the disease, such as aggressive or metastasised disease, and therefore cannot be used to predict the prognosis. Annotating the SNPs with deep clinical data together with miRNA expression profiles can improve the understanding of the underlying mechanisms of different phenotypes of prostate cancer. RESULTS:In this study microRNA (miRNA) profiles were studied as potential biomarkers to predict the disease outcome. The study subjects were from Finnish high risk prostate cancer families. To identify potential biomarkers we combined a novel non-parametrical test with an importance measure provided from a Random Forest classifier. This combination delivered a set of nine miRNAs that was able to separate cases from controls. The detected miRNA expression profiles could predict the development of the disease years before the actual PrCa diagnosis or detect the existence of other cancers in the studied individuals. Furthermore, using an expression Quantitative Trait Loci (eQTL) analysis, regulatory SNPs for miRNA miR-483-3p that were also directly associated with PrCa were found. CONCLUSION:Based on our findings, we suggest that blood-based miRNA expression profiling can be used in the diagnosis and maybe even prognosis of the disease. In the future, miRNA profiling could possibly be used in targeted screening, together with Prostate Specific Antigene (PSA) testing, to identify men with an elevated PrCa risk.",
				"issue": "5",
				"language": "en",
				"libraryCatalog": "doaj.org",
				"pages": "e0127427",
				"publicationTitle": "PLoS ONE",
				"url": "https://doi.org/10.1371/journal.pone.0127427",
				"volume": "10",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://doaj.org/article/f36918ccae3243548729f113f8920ba2",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Making every drop count: reducing wastage of a novel blood component for transfusion of trauma patients",
				"creators": [
					{
						"firstName": "Nathan",
						"lastName": "Proudlove",
						"creatorType": "author"
					},
					{
						"firstName": "Laura",
						"lastName": "Green",
						"creatorType": "author"
					},
					{
						"firstName": "Harriet",
						"lastName": "Tucker",
						"creatorType": "author"
					},
					{
						"firstName": "Anne",
						"lastName": "Weaver",
						"creatorType": "author"
					},
					{
						"firstName": "Ross",
						"lastName": "Davenport",
						"creatorType": "author"
					},
					{
						"firstName": "Jane",
						"lastName": "Davies",
						"creatorType": "author"
					},
					{
						"firstName": "Josephine",
						"lastName": "McCullagh",
						"creatorType": "author"
					},
					{
						"firstName": "Dave",
						"lastName": "Edmondson",
						"creatorType": "author"
					},
					{
						"firstName": "Julia",
						"lastName": "Lancut",
						"creatorType": "author"
					},
					{
						"firstName": "Angela",
						"lastName": "Maddison",
						"creatorType": "author"
					}
				],
				"date": "2021/09/01",
				"DOI": "10.1136/bmjoq-2021-001396",
				"ISSN": "2399-6641",
				"abstractNote": "Recent research demonstrates that transfusing whole blood (WB=red blood cells (RBC)+plasma+platelets) rather than just RBC (which is current National Health Service (NHS) practice) may improve outcomes for major trauma patients. As part of a programme to investigate provision of WB, NHS Blood and Transplant undertook a 2-year feasibility study to supply the Royal London Hospital (RLH) with (group O negative, ‘O neg’) leucodepleted red cell and plasma (LD-RCP) for transfusion of trauma patients with major haemorrhage in prehospital settings.Incidents requiring such prehospital transfusion occur randomly, with very high variation. Availability is critical, but O neg LD-RCP is a scarce resource and has a limited shelf life (14 days) after which it must be disposed of. The consequences of wastage are the opportunity cost of loss of overall treatment capacity across the NHS and reputational damage.The context was this feasibility study, set up to assess deliverability to RLH and subsequent wastage levels. Within this, we conducted a quality improvement project, which aimed to reduce the wastage of LD-RCP to no more than 8% (ie, 1 of the 12 units delivered per week).Over this 2-year period, we reduced wastage from a weekly average of 70%–27%. This was achieved over four improvement cycles. The largest improvement came from moving near-expiry LD-RCP to the emergency department (ED) for use with their trauma patients, with subsequent improvements from embedding use in ED as routine practice, introducing a dedicated LD-RCP delivery schedule (which increased the units ≤2 days old at delivery from 42% to 83%) and aligning this delivery schedule to cover two cycles of peak demand (Fridays and Saturdays).",
				"issue": "3",
				"language": "en",
				"libraryCatalog": "doaj.org",
				"publicationTitle": "BMJ Open Quality",
				"shortTitle": "Making every drop count",
				"url": "https://bmjopenquality.bmj.com/content/10/3/e001396.full",
				"volume": "10",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://doaj.org/search/articles?source=%7B%22query%22%3A%7B%22query_string%22%3A%7B%22query%22%3A%22test%22%2C%22default_operator%22%3A%22AND%22%7D%7D%2C%22size%22%3A50%2C%22sort%22%3A%5B%7B%22created_date%22%3A%7B%22order%22%3A%22desc%22%7D%7D%5D%7D",
		"defer": true,
		"items": "multiple"
	}
]
/** END TEST CASES **/
