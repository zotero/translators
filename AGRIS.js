{
	"translatorID": "48a67d12-1bcf-44ac-a4f4-11457ebfc0bb",
	"label": "AGRIS",
	"creator": "Abe Jellinek",
	"target": "^https?://agris\\.fao\\.org/agris-search/search",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-08-12 21:34:16"
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
	if (doc.querySelector('.docType_ico img[title*="Dataset"]')) {
		return "document";
	}
	else if (doc.querySelector('meta[name="citation_journal_title"]')) {
		return "journalArticle";
	}
	else if (doc.querySelector('meta[name="citation_title"]')) {
		return "report";
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('h3 > a[href*="search.do"]');
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
		// item.url will be empty if there's no full-text link; we don't want
		// to use the catalog page as the URL in that case.
		item.url = attr(doc, '.link-full-text a', 'href');
		item.attachments = [];
		
		if (item.itemType == 'document') {
			item.extra = (item.extra || '') + '\nType: dataset';
		}
		
		item.complete();
	});

	translator.getTranslatorObject(function (trans) {
		trans.itemType = detectWeb(doc, url);
		trans.doWeb(doc, url);
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://agris.fao.org/agris-search/search.do?recordID=IR2012044101",
		"items": [
			{
				"itemType": "report",
				"title": "Possibility of artificial propagation in farmed great sturgeon (Huso huso)",
				"creators": [
					{
						"firstName": "Mahmoud",
						"lastName": "Bahmani",
						"creatorType": "author"
					},
					{
						"firstName": "M.",
						"lastName": "Porkazemi",
						"creatorType": "author"
					},
					{
						"firstName": "H.",
						"lastName": "Khara",
						"creatorType": "author"
					},
					{
						"firstName": "M.",
						"lastName": "Rahimidanesh",
						"creatorType": "author"
					},
					{
						"firstName": "M. A.",
						"lastName": "Tolooei",
						"creatorType": "author"
					},
					{
						"firstName": "A.",
						"lastName": "Abasalizadeh",
						"creatorType": "author"
					},
					{
						"firstName": "M.",
						"lastName": "Hassanzadehsaber",
						"creatorType": "author"
					},
					{
						"firstName": "H.",
						"lastName": "Mohamadiparashkohi",
						"creatorType": "author"
					},
					{
						"firstName": "O.",
						"lastName": "Asghari",
						"creatorType": "author"
					},
					{
						"firstName": "R.",
						"lastName": "Kazemi",
						"creatorType": "author"
					},
					{
						"firstName": "S.",
						"lastName": "Dezhandian",
						"creatorType": "author"
					},
					{
						"firstName": "A.",
						"lastName": "Yousefi Jourdehi",
						"creatorType": "author"
					},
					{
						"firstName": "M.",
						"lastName": "Mohseni",
						"creatorType": "author"
					},
					{
						"firstName": "M. A.",
						"lastName": "Yazdani",
						"creatorType": "author"
					},
					{
						"firstName": "A.",
						"lastName": "Hallajian",
						"creatorType": "author"
					},
					{
						"firstName": "M.",
						"lastName": "Shakourian",
						"creatorType": "author"
					},
					{
						"firstName": "M.",
						"lastName": "Pourdehghani",
						"creatorType": "author"
					}
				],
				"date": "2011",
				"abstractNote": "In this research, morphometrical and physiological indicators of farmed great sturgeon, Huso huso in the Dr.Dadman International Sturgeon Research Institute studied. After biopsy of male and female gonads, two groups in terms of sexual maturity stage were observed. According to the histological observations, gonad development of male fish in the test group 1, stage II to III and in the test group 2 stage II to IV and in female fish in the test group 1 from stage II to stage II-III and in the test group 2 in stage III of sexual development and maturity stage was determined Maximum average weight and total length in a group of male fish in the summer (39/07±5/79 kg and 170 ± 6/48cm) and minimum average weight and total length in the two test groups of male fish in the autumn (26/25±3/65 kg and 155/5±4/40 cm) were measured. In the female test groups, the maximum average of weight and total length of the test group 2 in the summer (40/32±3/09 kg 170/12±1/96 cm), and the minimum of the test group 1 in the fall (25/8±1/30 kg and 160/6± 1/97 cm) were determined. The results of measuring the cortisol hormone in male test group, maximum and minimum average in the test group 1, respectively, in the summer (41/25±6/34 ng/ml) and fall (24/62±13/96 ng/ml) showed a significant difference between groups (p0.05). While the results of female group tests in test groups in relation with cortisol hormone had suggested that the maximum in group 2 in winter (58±25/92 ng/ml) and minimum in group 1 in the autumn (9/32±5/6 ng/ml) were observed and there were significant difference between groups (p0.05). Male, the results had suggested that the maximum average testosterone in the test group 2 in winter (71/25±15/52 ng / ml) and minimum in group 1 and in winter (27±6/60 ng/ml), respectively. So that showed significant difference between groups (P0.05). progesterone hormone were in the test group 2 and in summer (1/52±0/18 ng/ml) and its minimum in winter (0/14± 0/10 ng/ml) in test group 1 (p0.05), respectively. Maximum hormone levels 17-beta estradiol in the test group 2 in the autumn (16/42±6/36 ng/ml) and its minimum in the test group 1 in the winter (3/1±0/74 ng/ml) was observed and showed no statistical difference between groups (p 0.05). Based on the results, levels of female sex hormones in the test group showed that maximum testosterone (19/87±10/72 ng/ml) in the test group 2 in summer and minimum16/0±0/02 ng/ml) in the test group 1, were determined and had significant difference in all seasons (p0.05 (0/03±0/01 ng/ml) in the test group 1 was observed in winter that a significant difference between groups showed at fall (P0.05). Maximum and minimum levels of the hormone 17-beta estradiol in the test group 2 was observed in autumn (12/37±7/23 ng/ml), respectively (p0.05). The results of plasma metabolites (glucose, cholesterol, triglycerides and total lipid in the male test groups had suggested that the maximum and minimum of glucose in the test group 1 was (75/25±8/71 mg/dl) in winter and (39/5±6/71 mg / dl) summer, respectively. Maximum and minimum levels of cholesterol in group 1 was observed in autumn (128/75±54/34 mg/dl) and in winter (74/5±8/19 mg/dl), respectively. Maximum and minimum amount of triglycerides in the test group 2 observed in winter (384/75±50/93 mg/dl) and (156/25±16/34 mg / dl) in spring, so that in the spring between the groups showed significant difference (p0.05). Maximum total lipid in the test group 2 was observed in summer (686/25 ± 83/27 mg/dl) and minimum in the test group 1 in spring (410±62/03 mg/dl). Maximum and minimum glucose levels in a female group was observed in winter (82/7±11/55 mg/dl) and autumn (27/6±6 /41 mg/dl), respectively. The maximum cholesterol amount of the test group 1 was observed in winter (87±3/66 mg/dl) and minimum in the test group 2 in autumn (63/5±5/23 mg/dl). Maximum and minimum amount of triglycerides in the test group 2 was in the spring (281±33/67 mg/dl) and its minimum in autumn (213/75 ± 32/44 mg/dl), respectively, so that in the spring showed significant difference between the groups (p0.05).Maximum total lipid amount was in the test group 2 in spring (554/7±31/59 mg/dl) and minimum in the test group 1 in winter (367±21/22 mg/dl) and in summer between groups significant difference was observed (p0.05). The results of calcium and sodium cations and osmolarity in males suggested that calcium in females and sodium in males showed significant difference related to sexual maturation stage (P0.05). But osmolarity didn t show significant difference in both sex (p0.05).",
				"institution": "Iranian Fisheries Research Organization",
				"language": "Farsi",
				"libraryCatalog": "agris.fao.org",
				"url": "https://agris.fao.org/agris-search/search.do?recordID=IR2012044101",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
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
		"url": "https://agris.fao.org/agris-search/search.do?recordID=TH2005000236",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Efficiency of antimicrobial residue screening test kit for meat CM-Test",
				"creators": [
					{
						"firstName": "Thongchai",
						"lastName": "Chalermchaikit",
						"creatorType": "author"
					},
					{
						"firstName": "Kriengsak",
						"lastName": "Poonsook",
						"creatorType": "author"
					},
					{
						"firstName": "Kriengsuk",
						"lastName": "Dangprom",
						"creatorType": "author"
					},
					{
						"firstName": "Monthon",
						"lastName": "Lertworapreecha",
						"creatorType": "author"
					},
					{
						"firstName": "Kittikorn",
						"lastName": "Jotisakulratana",
						"creatorType": "author"
					}
				],
				"date": "2002",
				"ISSN": "0125-0369",
				"abstractNote": "Concerns of antimicrobial residues in food of animal origins are not only the adverse health effect to consumers but also the impact on exportation. The conventional methods for detecting antimicrobial residues in meat are European Four Pate Test (EDPR) method which use Bacillus subtilis and Micrococcus luteus in Test agar or Microbial Inhibition Disk Assay (MIDA) which use Bacillus mycoides, Bacillus subtilis and Micrococcus luteus in Antibiotic medium as indicators. However, EFPT and MIDA are required incubating time at least 18 hours for reading the results. Besides, EFPT and MIDA have been showed low specificity, which lead to false negative results. Therefore, antimicrobial screening test kit for meat has been developed by the full support from Thai Research Fund (TRF). The concept of new developed antimicrobial screening test kit (CM-Test) is tube diffusion method. There are consisted of Bacillus stearothermophilus in appropriated medium, which contained in polypropylene tube (1*4 cm). The tested results can be read after the meat extract supernatant of 0.1 ml is put into the test kit and incubated at 65+-1 deg C for 3 1/2-4 1/2 hours. The color of test kit will not be changed if the sample is positive (contain antimicrobial residue). If the sample is negative, test kit color will be changed to yellow. The prevalence of antimicrobial residues in 300 chicken meat samples and 300 pork samples, randomly purchased from markets and supermarkets in Bangkok during July 2001 to February 2002, had been studied. The results of chicken meat samples were found positive 12.3, 0 and 1.7 percent by using CM-Test, EFPT and MIDA methods, respectively. The results of pork samples were found positive 8.3, 2 and 2.7 percent by using CM-Test, EFPT and MIDA methods, respectively. Positive samples were confirmed by Charm II Test method. These results reveal that the detection limits developed antimicrobial residue screening test kit are better than conventional methods, EFPT and MIDA.",
				"language": "Thai",
				"libraryCatalog": "agris.fao.org",
				"publicationTitle": "Warasan Witthayasat Kaset",
				"url": "https://agris.fao.org/agris-search/search.do?recordID=TH2005000236",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
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
		"url": "https://agris.fao.org/agris-search/search.do?request_locale=ar&recordID=AV20120164931&query=&sourceQuery=&sortField=&sortOrder=&countryResource=&agrovocString=&advQuery=&centerString=&enableField=",
		"items": [
			{
				"itemType": "report",
				"title": "Petroleum Hydrocarbons in Saudi Red Sea Coastal Waters الهيدروكربونات البترولية في المياه السطحية لساحل البحر الاحمر السعودية (منطقة بترومين)",
				"creators": [
					{
						"firstName": "Sultan",
						"lastName": "Al-Lihaibi",
						"creatorType": "author"
					},
					{
						"firstName": "Turki",
						"lastName": "Al-Ghamdy",
						"creatorType": "author"
					}
				],
				"date": "1997",
				"abstractNote": "Total petroleum hydrocarbons in surface water samples collected from the Red Sea coast al area of Jeddah (Saudi Arabia), have been measured using ultraviolet fluorescence spectroscopy (UVF). Concentration level ranged between 1.79 and 17.9 J..I.g 1,1 light Arabian oil equivalents . Samples taken near the oil terminal (Petromin) showed relatively high concentrations (2.8-17.9 J..I.g I\" 1). whereas in the relatively clean Obhur Creek concentrations wer~ low (2 J..I.g 1- I). Perfect agreement has been obtained between concentrations calculated as chrysene and light Arabian equivalents. However, the light Arabian equivalent concentration is almost 6 times the chrysene equivalent concentration . تم قياس الهيدروكربونات البترولية في المياه السطحية للمنطقة الساحلية لمدينة جدة باستخدام مطياف الفلورة فوق البنفسجية . وجد أن مستوى التركيز في العينات تراوح بين 1.8 و 17.9 مايكروجرام / لتر وحدات زيت عربي خفيف مكافئة . وقد لوحظ أن العينات القريبة من مصرف مصفاة الزيت (بترومين) أعطت تراكيز عالية ( 2.8-17.9 مايكروجرام/ لتر ) بينما أعطت العينات المأخوذة من شرم أبحر ، والذي يعتبر الأنظف نسبيا ، قراءات منخفضة ( 2.0 مايكروجرام / لتر أو أقل ) . كما لوحظ وجود علاقة بين التركيزات المحسوبة على أساس وحدات كرايسين مكافئة وتلك المحسوبة على أساس وحدات زيت عربي خفيف مكافئة بحيث يكون الأخير مساويا لما يقارب 6 أضعاف الأول.",
				"institution": "KAU - Scientific Publishing Center",
				"language": "English",
				"libraryCatalog": "agris.fao.org",
				"url": "http://www.kau.edu.sa/centers/spc/jkau/Doc/Mar/8/Petroleum%20Hydrocarbons%20in%20Saudi%20Red%20Sea%20Coastal%20Waters.pdf",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://agris.fao.org/agris-search/searchIndex.do?query=soil+water",
		"items": "multiple"
	}
]
/** END TEST CASES **/
