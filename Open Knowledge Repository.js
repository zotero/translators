{
	"translatorID": "010e68d1-2794-4e73-b182-40f36768951b",
	"label": "Open Knowledge Repository",
	"creator": "Abe Jellinek",
	"target": "^https?://openknowledge\\.worldbank\\.org/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-09-20 19:05:06"
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
	if (url.includes('/handle/') && doc.querySelector('.ds-div-head')) {
		switch (text(doc, '.document-type')) {
			case 'Book':
				return 'book';
			case 'Journal Article':
				return 'journalArticle';
			case 'Speech':
				return 'presentation';
			default:
				return 'report';
		}
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.item-metadata h4 > a');
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
		if (!item.title.includes(': ') && text(doc, '.ds-div-head').includes(': ')) {
			item.title = text(doc, '.ds-div-head').replace(' : ', ': ');
		}
		
		if (item.abstractNote) {
			item.abstractNote = item.abstractNote
				.replace(/\r\n\s*/g, ' ');
		}
		
		for (let creator of item.creators) {
			if ((creator.firstName && creator.firstName.startsWith('World'))
				|| (creator.lastName && creator.lastName.includes('Group'))) {
				creator.lastName = creator.firstName + ' ' + (creator.lastName || '');
				delete creator.firstName;
				creator.fieldMode = 1;
			}
		}
		
		item.tags = item.tags.map(tag => ZU.capitalizeTitle(tag, true));
		item.attachments = item.attachments.filter(at => at.title != 'Snapshot');
		
		if (item.reportType == 'Report') {
			delete item.reportType;
		}
		
		item.publisher = 'World Bank';
		item.place = 'Washington, DC';

		// let item.publisher take precedence
		delete item.institution;
		delete item.company;
		delete item.label;
		delete item.distributor;
		
		// not a real DOI
		if (item.DOI && item.DOI.endsWith('/null')) {
			delete item.DOI;
			if (item.extra) {
				item.extra = item.extra.replace(/^DOI:.*$/m, '');
			}
		}
		
		if (item.itemType == 'journalArticle' && !item.volume && !item.issue) {
			for (let col of doc.querySelectorAll('.metadata-col')) {
				if (text(col, 'h5').trim() == 'Journal') {
					let rest = col.querySelector('h5').nextSibling;
					if (rest) {
						rest = rest.textContent;
						[, item.volume, item.issue, item.pages]
							= rest.match(/([^(\s]+)\(([^)]+)\):(\S+)/) || [];
					}
					
					break;
				}
			}
		}
		
		item.complete();
	});

	translator.getTranslatorObject(function (trans) {
		trans.itemType = detectWeb(doc, url);
		trans.addCustomFields({
			'DCTERMS.bibliographicCitation': 'publicationTitle'
		});
		trans.doWeb(doc, url);
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://openknowledge.worldbank.org/handle/10986/36015",
		"items": [
			{
				"itemType": "report",
				"title": "At the Front Line: Reflections on the Bank’s Work with China over Forty Years, 1980-2020",
				"creators": [
					{
						"lastName": "World Bank",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "2021-07-23",
				"abstractNote": "This volume contains written contributions from some of the key actors involved on both the Chinese and the World Bank sides in the past four decades of partnership. It is clear that the World Bank from the very beginning provided honest and evidence-based advice to China, but China was always in the driver’s seat in structuring the relationship and in determining what to do (and what not to do). Periodically, the World Bank engaged in national policy debates, during the Bashan Boat Conference, at Dalian, then with the China 2020 and China 2030 reports, and the subsequent series of flagships produced jointly with the Development Research Center under the State Council. For much of the time, however, World Bank’s impact was at the local level through demonstration projects and reform pilots that China studied, adapted, and later scaled. Finally, an increasingly important theme of the partnership in the last decade concerns World Bank’s cooperation with China globally, through International Development Association (IDA), South-South learning, and ongoing discussions over good practices in international development finance. As China’s global economic and financial heft continues to grow, this theme is likely to become increasingly important and require further adaptation on both sides. The first part contains the contributions of World Bank Country Directors in chronological order by decade: Caio Koch-Weser, Edwin Lim for the 1980s; Javed Burki, Pieter Bottelier, and Nick Hope for the 1990s; Yukon Huang and David Dollar for the 2000s; and Klaus Rohland and Bert Hofman for the 2010s. The second part contains the contributions of the Chinese authors, which are organized by themes. The third essay speaks to the shift in World Bank’s program to support China’s climate action following the Paris Agreement, with lessons that are highly relevant for the future evolution of the partnership. The fourth contribution is from Yang Yingming, former Executive Director for China at the World Bank, and now back with the Ministry of Finance, and reflects on the interaction between World Bank’s knowledge and financial cooperation with China, drawing lessons for other countries and for the future of the partnership.",
				"institution": "World Bank",
				"language": "English",
				"libraryCatalog": "openknowledge.worldbank.org",
				"place": "Washington, DC",
				"rights": "http://creativecommons.org/licenses/by/3.0/igo",
				"shortTitle": "At the Front Line",
				"url": "https://openknowledge.worldbank.org/handle/10986/36015",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Country Partnership"
					},
					{
						"tag": "Development Cooperation"
					},
					{
						"tag": "Economic Reform"
					},
					{
						"tag": "Environmental Sustainability"
					},
					{
						"tag": "Greenhouse Gas Emissions"
					},
					{
						"tag": "Integrated Rural Development"
					},
					{
						"tag": "Paris Agreement"
					},
					{
						"tag": "Poverty Alleviation"
					},
					{
						"tag": "World Bank Group Knowledge"
					},
					{
						"tag": "World Bank Group Lending"
					},
					{
						"tag": "World Bank Group Portfolio"
					},
					{
						"tag": "World Bank Group Strategy"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://openknowledge.worldbank.org/handle/10986/21531",
		"items": [
			{
				"itemType": "report",
				"title": "Serbia Judicial Functional Review",
				"creators": [
					{
						"lastName": "World Bank Group",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "2014-10-01",
				"abstractNote": "This functional review presents a comprehensive assessment of the current functioning of Serbia's judicial system, along with options and recommendations to inform Serbia's justice reform initiatives in view of the requirements of Chapter 23 of the Acquis Communautaire. The review comprises an external performance assessment and an internal performance assessment. The external performance assessment (Part 1) examines how well the Serbian judicial system serves its citizens in terms of efficiency, quality, and access to justice services. The internal performance assessment (Part 2) examines the inner workings of the system, and how governance and management, financial and human resources, ICT, and infrastructure are managed for service delivery. A distinct feature of this Review is its emphasis on data and analysis. The data collection was undertaken in the first half of 2014, and the preliminary findings were discussed with stakeholders and international partners through July, August and September of 2014. Overall, Serbia's judicial system performs at a lower standard than that of EU Member States. Of the many findings and recommendations outlined in the Report, the Functional Review team suggests that leaders focus on the following seven priorities which can set the Serbian judiciary on a critical path to performance improvement: 1) Develop a performance framework that tracks the performance of courts and PPOs against a targeted list of key performance indicators; 2) Ensure that courts use the full functionality of their case management systems to improve consistency of practice and support evidence-based decision-making; 3) Develop a comprehensive continuing training program for judges, prosecutors and court staff; 4) Reform procedural laws to simplify the service of process, and start simplifying business processes; 5) Eliminate the backlog of old utility bill enforcement cases; 6) Develop a more realistic budget within the existing resource envelope; and 7) Adjust the resource mix over time by gradually reducing the wage bill and increasing investments in productivity and innovation. This report was funded by the Multi-Donor Trust Fund for Justice Sector Support in Serbia (MDTF-JSS).",
				"institution": "World Bank",
				"language": "en_US",
				"libraryCatalog": "openknowledge.worldbank.org",
				"place": "Washington, DC",
				"rights": "http://creativecommons.org/licenses/by/3.0/igo/",
				"url": "https://openknowledge.worldbank.org/handle/10986/21531",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Access to Justice"
					},
					{
						"tag": "Access to Justice"
					},
					{
						"tag": "Access to Justice"
					},
					{
						"tag": "Access to Justice"
					},
					{
						"tag": "Administrative Law"
					},
					{
						"tag": "Adoption"
					},
					{
						"tag": "Alimony"
					},
					{
						"tag": "Bailiff"
					},
					{
						"tag": "Bailiffs"
					},
					{
						"tag": "Benefit"
					},
					{
						"tag": "Benefits"
					},
					{
						"tag": "Biased Laws"
					},
					{
						"tag": "Case Law"
					},
					{
						"tag": "Child"
					},
					{
						"tag": "Child Custody"
					},
					{
						"tag": "Children"
					},
					{
						"tag": "Civil Law"
					},
					{
						"tag": "Civil Rights"
					},
					{
						"tag": "Compensation"
					},
					{
						"tag": "Compensations"
					},
					{
						"tag": "Constitutional Court"
					},
					{
						"tag": "Corruption"
					},
					{
						"tag": "Court"
					},
					{
						"tag": "Courts"
					},
					{
						"tag": "Crime"
					},
					{
						"tag": "Crimes"
					},
					{
						"tag": "Criminal"
					},
					{
						"tag": "Criminal Laws"
					},
					{
						"tag": "Custody"
					},
					{
						"tag": "Damage"
					},
					{
						"tag": "Damages"
					},
					{
						"tag": "Detainees"
					},
					{
						"tag": "Disabilities"
					},
					{
						"tag": "Disability"
					},
					{
						"tag": "Discrimination"
					},
					{
						"tag": "Dismissal"
					},
					{
						"tag": "Dismissals"
					},
					{
						"tag": "Divorce"
					},
					{
						"tag": "Domestic Violence"
					},
					{
						"tag": "Equality"
					},
					{
						"tag": "Eu"
					},
					{
						"tag": "Family"
					},
					{
						"tag": "Family Law"
					},
					{
						"tag": "Family Violence"
					},
					{
						"tag": "Family Violence"
					},
					{
						"tag": "Fundamental Rights"
					},
					{
						"tag": "Gender"
					},
					{
						"tag": "Gender Differences"
					},
					{
						"tag": "Gender Equity"
					},
					{
						"tag": "Home"
					},
					{
						"tag": "House"
					},
					{
						"tag": "Human Rights"
					},
					{
						"tag": "Implementation of Law"
					},
					{
						"tag": "Implementation of Laws"
					},
					{
						"tag": "Imprisonment"
					},
					{
						"tag": "Institutional Capacity"
					},
					{
						"tag": "Judge"
					},
					{
						"tag": "Judges"
					},
					{
						"tag": "Judicial Reform"
					},
					{
						"tag": "Justice"
					},
					{
						"tag": "Labor Law"
					},
					{
						"tag": "Law"
					},
					{
						"tag": "Laws"
					},
					{
						"tag": "Layoffs"
					},
					{
						"tag": "Legal Aid"
					},
					{
						"tag": "Legal Challenge"
					},
					{
						"tag": "Legal Changes"
					},
					{
						"tag": "Legal Reform"
					},
					{
						"tag": "Legal Reforms"
					},
					{
						"tag": "Legal Services"
					},
					{
						"tag": "Legislation"
					},
					{
						"tag": "Liberty"
					},
					{
						"tag": "Literacy"
					},
					{
						"tag": "Notaries"
					},
					{
						"tag": "Notary"
					},
					{
						"tag": "Offence"
					},
					{
						"tag": "Offences"
					},
					{
						"tag": "Offender"
					},
					{
						"tag": "Offense"
					},
					{
						"tag": "Offenses"
					},
					{
						"tag": "Partners"
					},
					{
						"tag": "Pensions"
					},
					{
						"tag": "Prison"
					},
					{
						"tag": "Prisoner"
					},
					{
						"tag": "Prisoners"
					},
					{
						"tag": "Prisons"
					},
					{
						"tag": "Privacy"
					},
					{
						"tag": "Property"
					},
					{
						"tag": "Refugees"
					},
					{
						"tag": "Residence"
					},
					{
						"tag": "Rule of Law"
					},
					{
						"tag": "Sanction"
					},
					{
						"tag": "Sanctions"
					},
					{
						"tag": "Victim"
					},
					{
						"tag": "Victims"
					},
					{
						"tag": "War Crime"
					},
					{
						"tag": "War Crimes"
					},
					{
						"tag": "Will"
					},
					{
						"tag": "Woman"
					},
					{
						"tag": "Women"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://openknowledge.worldbank.org/handle/10986/35599",
		"items": [
			{
				"itemType": "book",
				"title": "At Your Service?: The Promise of Services-Led Development",
				"creators": [
					{
						"firstName": "Gaurav",
						"lastName": "Nayyar",
						"creatorType": "author"
					},
					{
						"firstName": "Mary",
						"lastName": "Hallward-Driemeier",
						"creatorType": "author"
					},
					{
						"firstName": "Elwyn",
						"lastName": "Davies",
						"creatorType": "author"
					}
				],
				"date": "2021-09-15",
				"ISBN": "9781464816710",
				"abstractNote": "Throughout history, industrialization has been synonymous with development. However, the trend of premature deindustrialization and the spread of automation technologies associated with Industry 4.0 has raised concerns that the development model based on export-led manufacturing seen in East Asia will be harder for hitherto less industrialized countries to replicate in the future. Can services-led development be an alternative?  Contrary to conventional wisdom, the features of manufacturing that were considered uniquely conducive for productivity growth - such as international trade, scale economies, inter-sectoral linkages, and innovation - are increasingly shared by the services sector.  But services are not monolithic. The twin gains of productivity growth and large-scale job creation for relatively low-skilled workers are less likely to come together in any given services subsector. The promise of services-led development in the future will be strengthened to the extent that technological change reduces the trade-off between productivity and jobs, and growth opportunities in services with potential for high productivity do not depend on a manufacturing base. Considering technological change and linkages between sectors while differentiating across types of services, this book assesses the scope of a services-driven development model and policy directions that maximize its potential.",
				"extra": "DOI: 10.1596/978-1-4648-1671-0",
				"language": "en",
				"libraryCatalog": "openknowledge.worldbank.org",
				"place": "Washington, DC",
				"publisher": "World Bank",
				"rights": "http://creativecommons.org/licenses/by/3.0/igo",
				"shortTitle": "At Your Service?",
				"url": "https://openknowledge.worldbank.org/handle/10986/35599",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Deindustrialization"
					},
					{
						"tag": "Digital Technology"
					},
					{
						"tag": "Industrialization"
					},
					{
						"tag": "Job Creation"
					},
					{
						"tag": "Services Industry"
					},
					{
						"tag": "Services Trade"
					},
					{
						"tag": "Technology Adoption"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://openknowledge.worldbank.org/handle/10986/36154",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Understanding Nonresponse Rates: Insights from 600,000 Opinion Surveys",
				"creators": [
					{
						"firstName": "Germán",
						"lastName": "Reyes",
						"creatorType": "author"
					}
				],
				"date": "2020-02",
				"DOI": "10.1093/wber/lhz040",
				"ISSN": "1564-698X",
				"abstractNote": "Despite the central role of surveys in empirical research, academics have not paid enough attention to the factors that affect response rates. This is especially concerning since survey response rates—of both household and opinion surveys—have been declining over time (Meyer, Mok, and Sullivan, 2015), which might lead to distorted survey results. This paper explores how the underlying design of each survey—such as its length and the day of the week in which the survey was conducted—affects the response rates of the survey.",
				"language": "en",
				"libraryCatalog": "openknowledge.worldbank.org",
				"publicationTitle": "World Bank Economic Review",
				"rights": "http://creativecommons.org/licenses/by-nc-nd/3.0/igo",
				"shortTitle": "Understanding Nonresponse Rates",
				"url": "https://openknowledge.worldbank.org/handle/10986/36154",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Biased Estimation"
					},
					{
						"tag": "Household Survey"
					},
					{
						"tag": "Nonrandom Nonresponse"
					},
					{
						"tag": "Nonresponse Rate"
					},
					{
						"tag": "Response Rate"
					},
					{
						"tag": "Survey Methods"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://openknowledge.worldbank.org/handle/10986/36175",
		"items": [
			{
				"itemType": "presentation",
				"title": "Remarks to the Heads of State of the Central African Economic and Monetary Community",
				"creators": [
					{
						"firstName": "David",
						"lastName": "Malpass",
						"creatorType": "author"
					}
				],
				"date": "2021-08-18",
				"abstractNote": "Bank Group President David Malpass said that deep structural reforms are needed now more than ever to secure social cohesion and put the region on a sustainable and more inclusive development path. The World Bank Group has maintained a long-standing partnership with Central African Economic and Monetary Community (CEMAC) and its individual members, providing a range of support including investment programs, budget support, advisory services, and technical assistance. The World Bank is partnering with the African Union to support the Africa Vaccine Acquisition Trust (AVAT) with resources to purchase and deploy single-dose vaccines for up to four hundred million people across Africa. Debt transparency and sustainability will be vital to a sustained recovery and attracting new investment. He spoke about two critical paths to help strengthen implementation of reforms and policies going forward. He concluded by saying that this day's summit and its strong political endorsement for the next phase of regional structural reforms is thus critical for the emergence of a more sustainable and more inclusive growth path for CEMAC in the future.",
				"language": "English",
				"place": "Washington, DC",
				"presentationType": "Speech",
				"rights": "http://creativecommons.org/licenses/by/3.0/igo",
				"url": "https://openknowledge.worldbank.org/handle/10986/36175",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Covid-19 Vaccination"
					},
					{
						"tag": "Debt Sustainability"
					},
					{
						"tag": "Debt Transparency"
					},
					{
						"tag": "Investment Climate"
					},
					{
						"tag": "Monetary Union"
					},
					{
						"tag": "Social Cohesion"
					},
					{
						"tag": "Structural Reform"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://openknowledge.worldbank.org/handle/10986/36008",
		"items": [
			{
				"itemType": "report",
				"title": "Addressing Country-Level Fiscal and Financial Sector Vulnerabilities: An Evaluation of the World Bank Group’s Contributions",
				"creators": [
					{
						"lastName": "Independent Evaluation Group",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "2021-07-21",
				"abstractNote": "More than a decade has passed since the global economic and financial crisis rocked the world. A clear lesson that emerged from it was the importance of identifying and addressing country-specific vulnerabilities ex ante to build resilience when a shock occurs.  The 2020 global economic and health crisis caused by COVID-19 serves as a yet another stark reminder of the importance of proactively managing vulnerabilities to shocks. The purpose of this evaluation is to assess World Bank Group support to client countries to build resilience to exogenous shocks through the systematic identification of fiscal and financial sector vulnerabilities and through efforts to support the reduction of these vulnerabilities. Given the importance of protecting the most vulnerable from shocks, this evaluation also looks at the extent to which the Bank Group has helped client countries adapt their social safety nets so that they can be effectively scaled up in a crisis. It aims to inform the design of future Bank Group strategies, operations, diagnostics, and knowledge products that can help reduce country-level fiscal and financial sector vulnerabilities. Its lessons may also help the effort to “build back better” after the COVID-19 pandemic through contributions to increasing resilience by strengthening fiscal and financial buffers and institutions.",
				"institution": "World Bank",
				"language": "English",
				"libraryCatalog": "openknowledge.worldbank.org",
				"place": "Washington, DC",
				"reportType": "Evaluation",
				"rights": "http://creativecommons.org/licenses/by/3.0/igo",
				"shortTitle": "Addressing Country-Level Fiscal and Financial Sector Vulnerabilities",
				"url": "https://openknowledge.worldbank.org/handle/10986/36008",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Financial Sector"
					},
					{
						"tag": "Fiscal Trends"
					},
					{
						"tag": "Safety Nets"
					},
					{
						"tag": "World Bank Group Operations"
					},
					{
						"tag": "World Bank-Imf Collaboration"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://openknowledge.worldbank.org/handle/10986/1",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://openknowledge.worldbank.org/discover?query=somalia",
		"items": "multiple"
	}
]
/** END TEST CASES **/
