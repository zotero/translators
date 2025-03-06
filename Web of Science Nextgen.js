{
	"translatorID": "4a3820a3-a7bd-44a1-8711-acf7b57d2c37",
	"label": "Web of Science Nextgen",
	"creator": "Abe Jellinek",
	"target": "^https://(www\\.webofscience\\.com|webofscience\\.clarivate\\.cn)/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-03-06 18:40:32"
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


function detectWeb(doc, url) {
	if (url.includes('/full-record/') && getItemID(url)) {
		let docType = text(doc, '#FullRTa-doctype-0').trim().toLowerCase();
		if (docType == 'proceedings paper') {
			return "conferencePaper";
		}
		else if (docType == "book") {
			return "book";
		}
		else if (docType == "data set") {
			return "document"; //change to dataset
		}
		else if (text(doc, '#FullRTa-patentNumber-0')) {
			return "patent";
		}
		else {
			return "journalArticle";
		}
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	Z.monitorDOMChanges(doc.querySelector('app-wos'));
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('app-article-metadata a[href*="/WOS:"], app-summary-title a[href*="/WOS:"]');
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
	function processTaggedData(text) {
		let importer = Zotero.loadTranslator("import");
		// Web of Science Tagged
		importer.setTranslator("594ebe3c-90a0-4830-83bc-9502825a6810");
		importer.setString(text);
		importer.setHandler('itemDone', function (obj, item) {
			if (item.title.toUpperCase() == item.title) {
				item.title = ZU.capitalizeTitle(item.title, true);
			}
			
			for (let creator of item.creators) {
				if (creator.firstName && creator.firstName.toUpperCase() == creator.firstName) {
					creator.firstName = ZU.capitalizeTitle(creator.firstName, true);
				}
				if (creator.lastName && creator.lastName.toUpperCase() == creator.lastName) {
					creator.lastName = ZU.capitalizeTitle(creator.lastName, true);
				}
			}
			
			if (item.url) {
				item.complete();
				return;
			}
			
			let gatewayURL = attr(doc, 'a#FRLinkTa-link-1', 'href');
			resolveGateway(gatewayURL, (url) => {
				item.url = url;
				item.complete();
			});
		});
		importer.translate();
	}
	
	let id = getItemID(url);
	getSessionID(doc, (sessionID) => {
		let postData = {
			action: 'saveToFieldTagged',
			colName: 'WOS',
			displayCitedRefs: 'true',
			displayTimesCited: 'true',
			displayUsageInfo: 'true',
			fileOpt: 'othersoftware',
			filters: 'fullRecord',
			product: 'UA',
			view: 'fullrec',
			ids: [id]
		};
		
		ZU.doPost(
			'/api/wosnx/indic/export/saveToFile',
			JSON.stringify(postData),
			processTaggedData,
			{ 'X-1P-WOS-SID': sessionID }
		);
	});
}


function getItemID(url) {
	let idInURL = url.match(/((?:WOS|RSCI|KJD|DIIDW|MEDLINE|DRCI|BCI|SCIELO|ZOOREC|CCC):[^/?&(]+)/);
	// Z.debug(idInURL)
	return idInURL && idInURL[1];
}

function getSessionID(doc, callback) {
	const sidRegex = /(?:sid=|"SID":")([a-zA-Z0-9]+)/i;
	
	// session ID is embedded in the static page inside an inline <script>
	// if you have the right HttpOnly cookie set. if we can't find it, we
	// initialize our session as the web app does
	for (let scriptTag of doc.querySelectorAll('script')) {
		let sid = scriptTag.textContent.match(sidRegex);
		if (sid) {
			callback(sid[1]);
			return;
		}
	}
	
	resolveGateway('https://www.webofknowledge.com/?mode=Nextgen&action=transfer&path=%2F',
		function (url) {
			let sid = url.match(sidRegex);
			if (sid) {
				callback(sid[1]);
			}
			else {
				callback(null);
			}
		});
}

function resolveGateway(gatewayURL, callback) {
	ZU.doGet(gatewayURL, function (_, xhr) {
		callback(xhr.responseURL || gatewayURL);
	}, null, null, null, false);
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.webofscience.com/wos/woscc/full-record/WOS:000454372400003",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Histopathology of Alcohol-Related Liver Diseases",
				"creators": [
					{
						"firstName": "Nitzan C.",
						"lastName": "Roth",
						"creatorType": "author"
					},
					{
						"firstName": "Jia",
						"lastName": "Qin",
						"creatorType": "author"
					}
				],
				"date": "FEB 2019",
				"DOI": "10.1016/j.cld.2018.09.001",
				"ISSN": "1089-3261",
				"abstractNote": "Excessive alcohol consumption can lead to a spectrum of liver histopathology, including steatosis, steatohepatitis, foamy degeneration, fatty liver with cholestasis, and cirrhosis. Although variability in sampling and pathologist interpretation are of some concern, liver biopsy remains the gold standard for distinguishing between steatohepatitis and noninflammatory histologic patterns of injury that can also cause the clinical syndrome of alcohol-related hepatitis. Liver biopsy is not routinely recommended to ascertain a diagnosis of alcohol-related liver disease in patients with an uncertain alcohol history, because the histologic features of alcohol-related liver diseases can be found in other diseases, including nonalcoholic steatohepatitis and drug-induced liver injury.",
				"extra": "WOS:000454372400003",
				"issue": "1",
				"journalAbbreviation": "Clin. Liver Dis.",
				"language": "English",
				"libraryCatalog": "Web of Science Nextgen",
				"pages": "11-+",
				"publicationTitle": "Clinics in Liver Disease",
				"url": "https://www.webofscience.com/wos/woscc/full-record/WOS:000454372400003",
				"volume": "23",
				"attachments": [],
				"tags": [
					{
						"tag": "Alcohol-related liver disease"
					},
					{
						"tag": "Alcoholic   steatohepatitis"
					},
					{
						"tag": "Alcoholic fatty liver   with cholestasis"
					},
					{
						"tag": "Alcoholic foamy degeneration"
					},
					{
						"tag": "Alcoholic hepatitis"
					},
					{
						"tag": "Histology"
					},
					{
						"tag": "Liver biopsy"
					},
					{
						"tag": "biopsy"
					},
					{
						"tag": "clinical-trials"
					},
					{
						"tag": "diagnosis"
					},
					{
						"tag": "failure"
					},
					{
						"tag": "fatty liver"
					},
					{
						"tag": "foamy degeneration"
					},
					{
						"tag": "prognosis"
					},
					{
						"tag": "sampling variability"
					},
					{
						"tag": "scoring system"
					},
					{
						"tag": "steatohepatitis"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.webofscience.com/wos/woscc/full-record/WOS:A1957WH65000008",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Superfluidity and Superconductivity",
				"creators": [
					{
						"firstName": "Rp",
						"lastName": "Feynman",
						"creatorType": "author"
					}
				],
				"date": "1957",
				"DOI": "10.1103/RevModPhys.29.205",
				"ISSN": "0034-6861",
				"extra": "WOS:A1957WH65000008",
				"issue": "2",
				"journalAbbreviation": "Rev. Mod. Phys.",
				"language": "English",
				"libraryCatalog": "Web of Science Nextgen",
				"pages": "205-212",
				"publicationTitle": "Reviews of Modern Physics",
				"url": "https://journals.aps.org/rmp/abstract/10.1103/RevModPhys.29.205",
				"volume": "29",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.webofscience.com/wos/author/record/483204",
		"defer": true,
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.webofscience.com/wos/woscc/full-record/WOS:000230445900101",
		"defer": true,
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "A conference control protocol for small scale video conferencing system",
				"creators": [
					{
						"firstName": "L.",
						"lastName": "Chen",
						"creatorType": "author"
					}
				],
				"date": "2005",
				"DOI": "10.1109/ICACT.2005.245926",
				"abstractNote": "Increased speeds of PCs and networks have made video conferencing systems possible in Internet. The proposed conference control protocol suits small scale video conferencing systems which employ full mesh conferencing architecture and loosely coupled conferencing mode. The protocol can ensure the number of conference member is less than the maximum value. Instant message services are used to do member authentication and notification. The protocol is verified in 32 concurrent conferencing scenarios and implemented in DigiParty which is a small scale video conferencing add-in application for MSN Messenger.",
				"extra": "WOS:000230445900101",
				"language": "English",
				"libraryCatalog": "Web of Science Nextgen",
				"pages": "532-537",
				"place": "New York",
				"proceedingsTitle": "7th International Conference on Advanced Communication Technology, Vols 1 and 2, Proceedings",
				"publisher": "Ieee",
				"url": "https://ieeexplore.ieee.org/document/1461931/",
				"attachments": [],
				"tags": [
					{
						"tag": "conference control   protocol"
					},
					{
						"tag": "full mesh"
					},
					{
						"tag": "loosely coupled"
					},
					{
						"tag": "video conferencing"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.webofscience.com/wos/alldb/full-record/DIIDW:202205717D",
		"items": [
			{
				"itemType": "patent",
				"title": "Preparing fibrous distillation membrane useful for anti-scaling pleated membrane distillation comprises preparing super-hydrophobic layer casting film liquid and base film by electrostatic spinning, spraying, cutting, and heating",
				"creators": [],
				"language": "English",
				"url": "https://www.webofscience.com/wos/alldb/full-record/DIIDW:202205717D",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://webofscience.clarivate.cn/wos/alldb/full-record/WOS:000454372400003",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Histopathology of Alcohol-Related Liver Diseases",
				"creators": [
					{
						"firstName": "Nitzan C.",
						"lastName": "Roth",
						"creatorType": "author"
					},
					{
						"firstName": "Jia",
						"lastName": "Qin",
						"creatorType": "author"
					}
				],
				"date": "FEB 2019",
				"DOI": "10.1016/j.cld.2018.09.001",
				"ISSN": "1089-3261, 1557-8224",
				"abstractNote": "Excessive alcohol consumption can lead to a spectrum of liver histopathology, including steatosis, steatohepatitis, foamy degeneration, fatty liver with cholestasis, and cirrhosis. Although variability in sampling and pathologist interpretation are of some concern, liver biopsy remains the gold standard for distinguishing between steatohepatitis and noninflammatory histologic patterns of injury that can also cause the clinical syndrome of alcohol-related hepatitis. Liver biopsy is not routinely recommended to ascertain a diagnosis of alcohol-related liver disease in patients with an uncertain alcohol history, because the histologic features of alcohol-related liver diseases can be found in other diseases, including nonalcoholic steatohepatitis and drug-induced liver injury.",
				"extra": "Web of Science ID: WOS:000454372400003",
				"issue": "1",
				"journalAbbreviation": "Clin. Liver Dis.",
				"language": "English",
				"libraryCatalog": "Clarivate Analytics Web of Science",
				"pages": "11-+",
				"publicationTitle": "CLINICS IN LIVER DISEASE",
				"url": "https://linkinghub.elsevier.com/retrieve/pii/S1089326118300771",
				"volume": "23",
				"attachments": [],
				"tags": [
					{
						"tag": "Alcohol-related liver disease"
					},
					{
						"tag": "Alcoholic fatty liver with cholestasis"
					},
					{
						"tag": "Alcoholic foamy degeneration"
					},
					{
						"tag": "Alcoholic hepatitis"
					},
					{
						"tag": "Alcoholic steatohepatitis"
					},
					{
						"tag": "BIOPSY"
					},
					{
						"tag": "CLINICAL-TRIALS"
					},
					{
						"tag": "DIAGNOSIS"
					},
					{
						"tag": "FAILURE"
					},
					{
						"tag": "FATTY LIVER"
					},
					{
						"tag": "FOAMY DEGENERATION"
					},
					{
						"tag": "Histology"
					},
					{
						"tag": "Liver biopsy"
					},
					{
						"tag": "PROGNOSIS"
					},
					{
						"tag": "SAMPLING VARIABILITY"
					},
					{
						"tag": "SCORING SYSTEM"
					},
					{
						"tag": "STEATOHEPATITIS"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.webofscience.com/wos/woscc/full-record/WOS:001308642000003",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Determinants of working poverty in Indonesia",
				"creators": [
					{
						"lastName": "Faharuddin",
						"creatorType": "author"
					},
					{
						"firstName": "Darma",
						"lastName": "Endrawati",
						"creatorType": "author"
					}
				],
				"date": "AUG 15 2022",
				"DOI": "10.1108/JED-09-2021-0151",
				"ISSN": "1859-0020, 2632-5330",
				"abstractNote": "PurposeThe study's first aim is to estimate the scale of working poverty using a nationwide household survey. The second aim is to answer the following research questions: is working enough to escape poverty, and what are the determinants of working poverty?Design/methodology/approachThe focus is on working people in Indonesia who have per capita household expenditure below the provincial poverty line. The determinant analysis used logistic regression on the first quarter of 2013 Susenas microdata.FindingsThe study found that the scale of the working poverty problem is equivalent to the scale of the poverty, although the in-work poverty rate is lower than the poverty rate in all provinces. The logistic regression results conclude that the three factors, namely individual-level, employment-related and household-level variables, have significant contributions to the incidence of the working poor in Indonesia.Practical implicationsSome practical implications for reducing the incidence of working poverty are increasing labor earnings through productivity growth and improving workers' skills, encouraging the labor participation of the poor and reducing precarious work. This study also suggests the need to continue assisting the working poor, particularly by increasing access to financial credit.Originality/valueResearch aimed at studying working poverty in Indonesia in the peer-reviewed literature is rare until now based on the authors' search. This study will fill the gap and provoke further research on working poverty in Indonesia.",
				"extra": "Web of Science ID: WOS:001308642000003",
				"issue": "3",
				"journalAbbreviation": "J. Econ. Dev.",
				"language": "English",
				"libraryCatalog": "Clarivate Analytics Web of Science",
				"pages": "230-246",
				"publicationTitle": "JOURNAL OF ECONOMICS AND DEVELOPMENT",
				"url": "https://www.webofscience.com/wos/woscc/full-record/WOS:001308642000003",
				"volume": "24",
				"attachments": [],
				"tags": [
					{
						"tag": "EMPLOYMENT"
					},
					{
						"tag": "Employment"
					},
					{
						"tag": "Indonesia"
					},
					{
						"tag": "LABOR-MARKET INSTITUTIONS"
					},
					{
						"tag": "MICROCREDIT"
					},
					{
						"tag": "POOR"
					},
					{
						"tag": "Poverty"
					},
					{
						"tag": "WAGE"
					},
					{
						"tag": "WELFARE"
					},
					{
						"tag": "Working poverty"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
