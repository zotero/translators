{
	"translatorID": "ccc23d0e-77ac-42b4-ac54-c606bfb218b8",
	"label": "Elsevier Pure",
	"creator": "Abe Jellinek",
	"target": "/[a-z]{2}/(publications|persons|searchAll)/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 270,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-08-31 04:08:43"
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
	if (!doc.querySelector('#page-footer a[href$="/admin/workspace.xhtml"]')) {
		return false;
	}
	
	if (doc.querySelector('#cite-RIS')) {
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
	var rows = doc.querySelectorAll('h3.title > a[href*="/publications/"]');
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

function scrape(doc, _url) {
	let risText = '';
	for (let p of doc.querySelectorAll('#cite-RIS p')) {
		risText += p.textContent + '\n';
	}
	
	let subtitleRe = /^\s*T2\s*-\s*(.+)$/m;
	let subtitle = risText.match(subtitleRe);
	if (subtitle) {
		risText = risText.replace(subtitleRe, '');
	}
	
	risText = risText.replace(/^\s*J[OF]\s*-/m, 'T2 -');

	var translator = Zotero.loadTranslator("import");
	translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7"); // RIS
	translator.setString(risText);
	translator.setHandler("itemDone", function (obj, item) {
		if (subtitle) {
			item.title += ': ' + subtitle[1];
		}
		
		if (item.date) {
			item.date = ZU.strToISO(item.date);
		}
		
		item.libraryCatalog = attr(doc, 'meta[property="og:site_name"]', 'content');
		item.archiveLocation = '';
		
		item.complete();
	});
	translator.translate();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://researchers.cdu.edu.au/en/publications/3p-sake-privacy-preserving-and-physically-secured-authenticated-k",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "3P-SAKE: Privacy-preserving and physically secured authenticated key establishment protocol for wireless industrial networks",
				"creators": [
					{
						"lastName": "Masud",
						"firstName": "Mehedi",
						"creatorType": "author"
					},
					{
						"lastName": "Alazab",
						"firstName": "Mamoun",
						"creatorType": "author"
					},
					{
						"lastName": "Choudhary",
						"firstName": "Karanjeet",
						"creatorType": "author"
					},
					{
						"lastName": "Gaba",
						"firstName": "Gurjot Singh",
						"creatorType": "author"
					}
				],
				"date": "2021-07-01",
				"DOI": "10.1016/j.comcom.2021.04.021",
				"ISSN": "0140-3664",
				"abstractNote": "A new industrial revolution is emerging with the Internet of Things (IoT) growing use in enabling the machine to machine communication between the devices, sensors, actuators, and gateways. IoT lets the communication across devices and the network happen in real-time and helps make technologically smart homes, smart hospitals, and smart industrial applications. The authentication schemes in IoT have to be robust and lightweight to be useful for resource-constrained real-time applications where user privacy and physical security are the priority concerns. The IoT devices are prone to physical attacks due to their installation in hostile environments. The intruders want to physically capture the IoT nodes for cloning and accessing the stored confidential information, thus necessitating IoT nodes’ physical protection. This article proposes a less expensive and physically secured user authentication and secure key exchange protocol for industry 4.0 applications. Physically unclonable functions (PUF), hash, and XOR operations are used in the proposed method to attain robustness and efficiency. The scheme's other benefits include low computational cost, retaining the device's confidentiality, safety from major security threats, low communication, and storage overhead.",
				"libraryCatalog": "Charles Darwin University's Research Webportal",
				"pages": "82-90",
				"publicationTitle": "Computer Communications",
				"shortTitle": "3P-SAKE",
				"url": "http://www.scopus.com/inward/record.url?scp=85105520478&partnerID=8YFLogxK",
				"volume": "175",
				"attachments": [],
				"tags": [
					{
						"tag": "Hardware security"
					},
					{
						"tag": "Industrial IoT"
					},
					{
						"tag": "Industry 4.0"
					},
					{
						"tag": "Internet of Things"
					},
					{
						"tag": "Key agreement"
					},
					{
						"tag": "Lightweight authentication"
					}
				],
				"notes": [
					{
						"note": "<p>Funding Information:<br/>All authors approved the version of the manuscript to be published.</p><p>Publisher Copyright:<br/>© 2021 Elsevier B.V.</p><p>Copyright:<br/>Copyright 2021 Elsevier B.V., All rights reserved.</p>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://orbit.dtu.dk/en/publications/authentication-of-vanillin-ex-glucose-a-first-study-on-the-influe",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Authentication of vanillin ex glucose – A first study on the influence of the glucose-source on the δ13C and δ2H value",
				"creators": [
					{
						"lastName": "Wilde",
						"firstName": "Amelie Sina",
						"creatorType": "author"
					},
					{
						"lastName": "Strucko",
						"firstName": "Tomas",
						"creatorType": "author"
					},
					{
						"lastName": "Veje",
						"firstName": "Casper Rastgoie",
						"creatorType": "author"
					},
					{
						"lastName": "Mortensen",
						"firstName": "Uffe Hasbro",
						"creatorType": "author"
					},
					{
						"lastName": "Duedahl-Olesen",
						"firstName": "Lene",
						"creatorType": "author"
					}
				],
				"date": "2022",
				"DOI": "10.1016/j.foodcont.2021.108389",
				"ISSN": "0956-7135",
				"abstractNote": "Vanillin is the most characteristic compound in vanilla flavour. Since vanilla pods are very expensive, vanillin is mainly produced by synthetic and sometimes biosynthetic methods. Biosynthetic vanillin is called ‘biovanillin’ and can -by law-be labelled as ‘natural’. The isotopic carbon ratio (expressed as δ13C) is a widely established and valuable authentication parameter for vanillin. Furthermore, currently available data about δ2H values indicate, that the isotopic hydrogen ratio can make a decisive contribution to the authentication of vanillin. One of the most recent developments is the bio-production of vanillin derived from glucose. However, very little is known about its isotopic composition. Here, we present the δ13C and δ2H values of glucose from corn and wheat and the vanillin that was derived from these. The isotopic composition of the glucose is clearly reflected in the resulting vanillin molecule. All ‘glucose-vanillin’ samples could be distinguished from vanillin originating from other sources when combining the δ13C and δ2H value.",
				"issue": "108389",
				"libraryCatalog": "Welcome to DTU Research Database",
				"publicationTitle": "Food Control",
				"volume": "131",
				"attachments": [],
				"tags": [
					{
						"tag": "13C/12C and 2H/1H ratio"
					},
					{
						"tag": "Authenticity"
					},
					{
						"tag": "Biovanillin"
					},
					{
						"tag": "Glucose"
					},
					{
						"tag": "Isotope ratio mass spectrometry"
					},
					{
						"tag": "Natural flavor"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://snucm.elsevierpure.com/en/publications/surgical-management-of-sigmoid-volvulus-a-multicenter-observation",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Surgical management of sigmoid volvulus: A multicenter observational study",
				"creators": [
					{
						"lastName": "Lee",
						"firstName": "Keunchul",
						"creatorType": "author"
					},
					{
						"lastName": "Oh",
						"firstName": "Heung Kwon",
						"creatorType": "author"
					},
					{
						"lastName": "Cho",
						"firstName": "Jung Rae",
						"creatorType": "author"
					},
					{
						"lastName": "Kim",
						"firstName": "Minhyun",
						"creatorType": "author"
					},
					{
						"lastName": "Kim",
						"firstName": "Duck Woo",
						"creatorType": "author"
					},
					{
						"lastName": "Kang",
						"firstName": "Sung Bum",
						"creatorType": "author"
					},
					{
						"lastName": "Kim",
						"firstName": "Hyung Jin",
						"creatorType": "author"
					},
					{
						"lastName": "Park",
						"firstName": "Hyoung Chul",
						"creatorType": "author"
					},
					{
						"lastName": "Shin",
						"firstName": "Rumi",
						"creatorType": "author"
					},
					{
						"lastName": "Heo",
						"firstName": "Seung Chul",
						"creatorType": "author"
					},
					{
						"lastName": "Ryoo",
						"firstName": "Seung Bum",
						"creatorType": "author"
					},
					{
						"lastName": "Park",
						"firstName": "Kyu Joo",
						"creatorType": "author"
					}
				],
				"date": "2021-12-31",
				"DOI": "10.3393/AC.2020.03.23",
				"ISSN": "2287-9714",
				"abstractNote": "Purpose: This study aimed to evaluate real-world clinical outcomes from surgically treated patients for sigmoid volvulus. Methods: Five tertiary centers participated in this retrospective study with data collected from October 2003 through September 2018, including demographic information, preoperative clinical data, and information on laparoscopic/open and elective/emergency procedures. Outcome measurements included operation time, postoperative hospitalization, and postoperative morbidity. Results: Among 74 patients, sigmoidectomy was the most common procedure (n=46), followed by Hartmann's procedure (n=23), and subtotal colectomy (n=5). Emergency surgery was performed in 35 cases (47.3%). Of the 35 emergency pa-tients, 34 cases (97.1%) underwent open surgery, and a stoma was established for 26 patients (74.3%). Elective surgery was performed in 39 cases (52.7%), including 21 open procedures (53.8%), and 18 laparoscopic surgeries (46.2%). Median laparoscopic operation time was 180 minutes, while median open surgery time was 130 minutes (P<0.001). Median postoperative hospitalization was 11 days for laparoscopy and 12 days for open surgery. There were 20 postoperative complications (27.0%), and all were resolved with conservative management. Emergency surgery cases had a higher complication rate than elective surgery cases (40.0% vs. 15.4%, P=0.034). Conclusion: Relative to elective surgery, emergency surgery had a higher rate of postoperative complications, open surgery, and stoma formation. As such, elective laparoscopic surgery after successful sigmoidoscopic decompression may be the optimal clinical option.",
				"issue": "6",
				"libraryCatalog": "Seoul National University College of Medicine",
				"pages": "403-408",
				"publicationTitle": "Annals of Coloproctology",
				"shortTitle": "Surgical management of sigmoid volvulus",
				"url": "http://www.scopus.com/inward/record.url?scp=85100123885&partnerID=8YFLogxK",
				"volume": "36",
				"attachments": [],
				"tags": [
					{
						"tag": "Elective surgery"
					},
					{
						"tag": "Laparoscopy"
					},
					{
						"tag": "Sigmoid volvulus"
					}
				],
				"notes": [
					{
						"note": "<p>Publisher Copyright:<br/>© 2020 The Korean Society of Coloproctology.</p>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://koreauniv.pure.elsevier.com/en/publications/the-effect-of-uncoated-paper-application-on-skin-moisture-risk-of",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "The effect of uncoated paper application on skin moisture, risk of pressure injury and incidence of pressure injury in neurologic intensive care unit patients: A randomized controlled trial",
				"creators": [
					{
						"lastName": "Choi",
						"firstName": "Yoo Hyung",
						"creatorType": "author"
					},
					{
						"lastName": "Kim",
						"firstName": "Sung Reul",
						"creatorType": "author"
					}
				],
				"date": "2021-08",
				"DOI": "10.1111/ijn.12919",
				"ISSN": "1322-7114",
				"abstractNote": "Aim: This study aimed to evaluate the effects of uncoated paper on skin moisture, pressure injury risk and pressure injury incidence in neurological intensive care unit patients. Methods: A randomized controlled design was used. The experimental group (n = 68) received usual care (repositioning every 2 h and use of an air mattress) and application of uncoated paper on the sacral area for 5 days, whereas the control group (n = 67) received only usual care. A repeated measures analysis of variance was used to determine changes in the skin moisture and risk of pressure injury between the groups. A chi-squared test was used to determine the change in the incidence of pressure injuries for sacral area. Data were collected from 20 October 2017 to 6 March 2018. Results: There were statistically significant differences in the skin moisture and risk of pressure injuries between the experimental and control groups. However, a significant difference was not observed in the incidence of pressure injuries between the groups. Conclusion: The use of uncoated paper may be a valid nursing intervention for the prevention of pressure injuries in neurological intensive care unit patients.",
				"issue": "4",
				"libraryCatalog": "Korea University",
				"publicationTitle": "International Journal of Nursing Practice",
				"shortTitle": "The effect of uncoated paper application on skin moisture, risk of pressure injury and incidence of pressure injury in neurologic intensive care unit patients",
				"url": "http://www.scopus.com/inward/record.url?scp=85099453696&partnerID=8YFLogxK",
				"volume": "27",
				"attachments": [],
				"tags": [
					{
						"tag": "nervous system diseases"
					},
					{
						"tag": "nursing care"
					},
					{
						"tag": "pressure ulcer"
					},
					{
						"tag": "pressure ulcer/prevention and control"
					},
					{
						"tag": "skin"
					}
				],
				"notes": [
					{
						"note": "<p>Funding Information:<br/>This research did not receive any specific grant from funding agencies in the public, commercial, or not-for-profit sectors.</p><p>Publisher Copyright:<br/>© 2021 John Wiley & Sons Australia, Ltd</p>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://researchers.cdu.edu.au/en/searchAll/index/?search=test&pageSize=25&showAdvanced=false&searchFacet=orConceptIds&orConceptIds=af5f2285-4118-4d98-839a-6dc624527704&orConceptIds=f43e663c-2a47-4694-a9da-0c1a66116c28&orConceptIds=d65ecb3a-f841-4f08-9c3d-7debf3199669&orConceptIds=030e99c1-94a2-41a1-913a-c57c9b35a4fd&orConceptIds=6f00d88d-e0a3-47d8-b448-6c0a81a27502&allConcepts=false&conceptsContentFamilies=Person&conceptsContentFamilies=ResearchOutput&conceptsContentFamilies=Organisation&conceptsContentFamilies=Project&inferConcepts=false&checkedConcepts=af5f2285-4118-4d98-839a-6dc624527704%2Cf43e663c-2a47-4694-a9da-0c1a66116c28%2Cd65ecb3a-f841-4f08-9c3d-7debf3199669%2C030e99c1-94a2-41a1-913a-c57c9b35a4fd%2C6f00d88d-e0a3-47d8-b448-6c0a81a27502&searchBy=RelatedConcepts",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://researchers.cdu.edu.au/en/persons/benedikt-ley/publications/",
		"items": "multiple"
	}
]
/** END TEST CASES **/
