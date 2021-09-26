{
	"translatorID": "d8337e3a-434c-457a-a35b-b17e6a7fdccd",
	"label": "Homeland Security Digital Library",
	"creator": "Abe Jellinek",
	"target": "^https?://www\\.hsdl\\.org/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-09-26 20:12:30"
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


const sourceRe = /([^(]+).*v\.([^\s,]+).*no\.([^\s,]+).*/;
const pagesRe = /p\.(\S+)/;

function detectWeb(doc, url) {
	if (url.includes('?abstract')) {
		for (let tr of doc.querySelectorAll('.hsdl-content tr')) {
			if (text(tr, '.label').includes('Report Number:')) {
				return "report";
			}
			if (text(tr, '.label').includes('Source:')
				&& sourceRe.test(text(tr, 'td:not(.label)'))) {
				return "journalArticle";
			}
			if (text(tr, '.label').includes('Series:')
				&& text(tr, 'td:not(.label)').toLowerCase().includes('theses')) {
				return "thesis";
			}
		}
		return "document";
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.new_result');
	for (let row of rows) {
		let href = attr(row, 'a[href^="?abstract"]', 'href');
		let title = ZU.trimInternal(text(row, '.results_title'));
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
	let item = new Zotero.Item('document');
	
	item.title = text(doc, 'h2 > a').replace(/\[.*$/, '');
	item.abstractNote = text(doc, '.hsdl-content > p').replace(/^"|"$/g, '');
	
	let mimeType = 'application/pdf';
	
	for (let row of doc.querySelectorAll('.hsdl-content > table tr')) {
		let label = text(row, '.label');
		if (label == 'Author:') {
			item.creators = [...row.querySelectorAll('a')]
				.map(link => ZU.cleanAuthor(link.textContent, 'author', true));
		}
		else {
			let value = text(row, 'td:not(.label)');
			switch (label) {
				case 'Publisher:':
					item.publisher = value;
					break;
				case 'Date:':
					item.date = value;
					break;
				case 'Copyright:':
					item.rights = value;
					break;
				case 'Media Type:':
					mimeType = value;
					break;
				case 'Source:': {
					let matches = value.match(sourceRe);
					if (matches) {
						item.itemType = 'journalArticle';
						[, item.publicationTitle, item.volume, item.issue] = matches;
					}
					else {
						item.extra = (item.extra || '') + `\nHSDL Source: ${value}`;
					}
					item.pages = (value.match(pagesRe) || [])[1] || item.pages;
					break;
				}
				case 'URL:':
					item.DOI = ZU.cleanDOI(value);
					break;
				case 'Report Number:':
					item.itemType = 'report';
					item.reportNumber = value;
					break;
				case 'Series:':
					if (value.toLowerCase().includes('theses')) {
						item.itemType = 'thesis';
					}
			}
		}
	}
	
	item.url = url.replace(/#.*$/, '');
	
	item.attachments.push({
		title: 'Full Text PDF',
		mimeType,
		url: attr(doc, 'h2 > a', 'href')
	});
	
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.hsdl.org/?abstract&did=453776",
		"items": [
			{
				"itemType": "document",
				"title": "Insider Threat Study: Computer System Sabotage in Critical Infrastructure Sectors",
				"creators": [
					{
						"firstName": "Michelle M.",
						"lastName": "Keeney",
						"creatorType": "author"
					},
					{
						"firstName": "Dawn M.",
						"lastName": "Cappelli",
						"creatorType": "author"
					},
					{
						"firstName": "Eileen",
						"lastName": "Kowalski",
						"creatorType": "author"
					}
				],
				"date": "2005-05",
				"abstractNote": "Since 2001, the Secret Service and CERT have collaborated on multiple efforts to identify, assess, and manage potential threats to, and vulnerabilities of, data and critical systems. The collaboration represents an effort to augment security and protective practices through two components: Finding ways to identify, assess, and mitigate cyber security threats to data and critical systems that impact physical security or threaten the mission of the organization; Finding ways to identify, assess, and manage individuals who may pose a threat to those data or critical systems. The overall goal of the collaborative effort is to develop information and tools that can help private industry, government, and law enforcement identify cyber security issues that can impact physical or operational security and to assess potential threats to, and vulnerabilities in, data and critical systems.",
				"libraryCatalog": "Homeland Security Digital Library",
				"publisher": "Carnegie-Mellon University. CERT Coordination Center",
				"rights": "2004 Carnegie Mellon University. Posted here with permission. Documents are for personal use only and not for commercial profit.",
				"shortTitle": "Insider Threat Study",
				"url": "https://www.hsdl.org/?abstract&did=453776",
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
		"url": "https://www.hsdl.org/?abstract&did=460696",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Keeping Reactors Safe from Sabotage",
				"creators": [
					{
						"firstName": "Donald G.",
						"lastName": "Rose",
						"creatorType": "author"
					},
					{
						"firstName": "Roy A.",
						"lastName": "Haarman",
						"creatorType": "author"
					},
					{
						"firstName": "William A.",
						"lastName": "Bradley",
						"creatorType": "author"
					}
				],
				"date": "1981",
				"abstractNote": "Protecting American nuclear power plants from internal sabotage and external attack has long been a major concern of the United States Nuclear Regulatory Commission. Studies performed in the early seventies indicated that nuclear power plants were not attractive targets for terrorism and that their construction was highly resistant to damage, yet there were conditions under which the radioactive containment features could be sabotaged. This conclusion prompted the Nuclear Regulatory Commission, in February 1977, to publish a revised section to the Code of Federal Regulations, Title 10 Part 73.55. The new requirements were aimed specifically at countering any form of sabotage that could release radioactive material and thereby create a hazard for the general public. But implementation of the new law required reviewing and upgrading the security plans for more than 70 nuclear power plants each with unique nuclear and secondary systems and unique geographic and demographic environments. (There is no standard nuclear plant in the United States. Although a single manufacturer may provide the basic reactor system for a group of plants, the remainder of each plant is a composite provided by various contractors.)...Altogether the review process has had a profound effect upon the planning for security at nuclear power plants, especially in defining what we are trying to protect, what kinds of threats we face, and how we can realize the largest return for our investment in nuclear plant security. The review process also has implications for nuclear plant safety.",
				"issue": "2",
				"libraryCatalog": "Homeland Security Digital Library",
				"pages": "121-131",
				"publicationTitle": "Los Alamos Science",
				"rights": "Public Domain",
				"url": "https://www.hsdl.org/?abstract&did=460696",
				"volume": "2",
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
		"url": "https://www.hsdl.org/?abstract&did=16871",
		"items": [
			{
				"itemType": "document",
				"title": "Proceedings of a Workshop on Deterring CyberAttacks: Informing Strategies and Developing Options for U.S. Policy",
				"creators": [
					{
						"lastName": "National Research Council (U. S.). Computer Science and Telecommunications Board",
						"creatorType": "author"
					},
					{
						"lastName": "National Research Council (U. S.). Division on Engineering and Physical Sciences",
						"creatorType": "author"
					},
					{
						"lastName": "National Research Council (U. S.). Policy and Global Affairs",
						"creatorType": "author"
					}
				],
				"date": "2010",
				"abstractNote": "At the request of the Office of the Director of National Intelligence, the National Research Council \"undertook a two-phase project aimed to foster a broad, multidisciplinary examination of strategies for deterring cyberattacks on the United States and of the possible utility of these strategies for the U.S. government.\" The first phase provided basic information needed to understand the problem and shape questions regarding cyber attacks, while the second phase selected experts to write papers on the questions raised in the first phase. At June 10-11, 2010 workshop in Washington, D.C., the authors discussed and revised their papers.",
				"extra": "HSDL Source: Workshop on Deterring CyberAttacks: Informing Strategies and Developing Options for U.S. Policy. Washington, DC. June 10-11, 2010",
				"libraryCatalog": "Homeland Security Digital Library",
				"publisher": "National Academies Press (U.S.)",
				"rights": "2010 National Academy of Sciences",
				"shortTitle": "Proceedings of a Workshop on Deterring CyberAttacks",
				"url": "https://www.hsdl.org/?abstract&did=16871",
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
		"url": "https://www.hsdl.org/?abstract&did=463569",
		"items": [
			{
				"itemType": "report",
				"title": "Land Mobile Radio Channel Usage Measurements at the 1996 Summer Olympic Games",
				"creators": [
					{
						"firstName": "Frank H.",
						"lastName": "Sanders",
						"creatorType": "author"
					},
					{
						"firstName": "G. R. (Gregory R. )",
						"lastName": "Hand",
						"creatorType": "author"
					},
					{
						"firstName": "Vince S.",
						"lastName": "Lawrence",
						"creatorType": "author"
					}
				],
				"date": "1998-02",
				"abstractNote": "The National Telecommunications and Information Administration (NTIA) is responsible for managing the Federal Government's use of the radio spectrum. In discharging this responsibility, NTIA uses the ITS radio spectrum measurement system and portable measurement systems to collect data for spectrum utilization assessments. This report details an NTIA project to measure and analyze land mobile radio channel usage statistics in the metropolitan area of Atlanta, Georgia, before, during, and after the 1996 Summer Olympic Games. [...] In summary, the results of the 1996 Summer Olympic Games channel usage measurements indicate that, in the event of natural or man-made public emergencies, a land mobile radio spectrum capacity capable of accommodating two to three times ordinary channel usage levels may be required to meet emergency needs.",
				"institution": "United States. Department of Commerce",
				"libraryCatalog": "Homeland Security Digital Library",
				"reportNumber": "NTIA Report 98-357",
				"rights": "Public Domain",
				"url": "https://www.hsdl.org/?abstract&did=463569",
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
		"url": "https://www.hsdl.org/?abstract&did=829336",
		"items": [
			{
				"itemType": "thesis",
				"title": "Employment of Operational Art: 'Daesh's' Offense into Iraq During the Summer of 2014",
				"creators": [
					{
						"firstName": "Moises",
						"lastName": "Jimenez",
						"creatorType": "author"
					}
				],
				"date": "2019-05-23",
				"abstractNote": "From the Thesis Abstract: \"In the Summer of 2014, the world learned of a new horror as the Islamic State of Iraq and the Levant (ISIL) stormed its way into the sovereign state of Iraq. Fueled by a religious fervor and united through Salafist dogma, ISIL overwhelmed Iraqi Security Forces (ISF) through use of tempo and deliberate lines of operation to achieve strategic aims. Within a two-month period, ISIL advanced hundreds of kilometers, secured multiple population clusters, and established a governmental regime to replace the Iraqi government. With the withdrawal of US combat power from Iraq, and the lucrative investment of Iraqi forces, multiple questions remain unanswered. How could a group of jihadists, with limited training, armed with technical vehicles and various small arms weapons overwhelm the security forces of the Iraqi government? [...] This monograph examines the presence of lines of operation, tempo, center of gravity, lines of effort, phasing and transitions during ISIL's offensive and consolidation activities. The monograph discusses ISIL's adherence to Salafist ideologies and the unique requirements to maintain a global caliphate. United by their interpretations of pure Sunni Islam, members of ISIL can converge both lethal and non-lethal action against belligerents. The monograph concludes with the understanding of ISIL's deliberate arrangement of lethal and non-lethal activity to accomplish strategic objectives.",
				"libraryCatalog": "Homeland Security Digital Library",
				"rights": "Public Domain",
				"shortTitle": "Employment of Operational Art",
				"university": "U.S. Army Command and General Staff College. School of Advanced Military Studies",
				"url": "https://www.hsdl.org/?abstract&did=829336",
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
		"url": "https://www.hsdl.org/?abstract&did=750070",
		"items": [
			{
				"itemType": "document",
				"title": "Simple Sabotage Field Manual",
				"creators": [],
				"date": "1944-01-17",
				"abstractNote": "This historical document was originally published by the United States Office of Strategic Services (OSS; now the Central Intelligence Agency) in 1944, for use by OSS agents in motivating or recruiting potential foreign saboteurs. Agents were granted permission to print and disseminate portions of the document as needed. The since-declassified booklet describes ways for civilians to inflict sabotage through ordinary means, so as to minimize undue attention. According to the document, saboteur-recruits were most often U.S. sympathizers keen to disrupt war efforts against the U.S. during World War Two. The booklet contains instructions for destabilizing or reducing progress and productivity by non-violent means. The booklet is separated into headings that correspond to specific audiences, including: \"Managers and Supervisors\"; \"Employees\"; \"Organizations and Conferences\"; \"Communications\"; \"Transportation\" (Railways, Automotive, and Water); \"General Devices for Lowering Morale and Creating Confusion\"; and \"Electric Power.",
				"libraryCatalog": "Homeland Security Digital Library",
				"publisher": "United States. War Department. Strategic Services Unit",
				"rights": "Public Domain",
				"url": "https://www.hsdl.org/?abstract&did=750070",
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
		"url": "https://www.hsdl.org/?search=&searchfield=&all=drought&collection=documents&submitted=Search",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.hsdl.org/?abstract&did=810249",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "MMWR: Morbidity and Mortality Weekly Report: Surveillance Summaries, September 8, 2017",
				"creators": [],
				"date": "2017-09-08",
				"abstractNote": "Alternate Title: BRCA Genetic Testing and Receipt of Preventive Interventions Among Women Aged 18-64 Years with Employer-Sponsored Health Insurance in Nonmetropolitan and Metropolitan Areas - United States, 2009-2014",
				"issue": "15",
				"libraryCatalog": "Homeland Security Digital Library",
				"publicationTitle": "MMWR: Morbidity and Mortality Weekly Report",
				"rights": "Public Domain",
				"shortTitle": "MMWR",
				"url": "https://www.hsdl.org/?abstract&did=810249",
				"volume": "66",
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
