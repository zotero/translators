{
	"translatorID": "3f50f41c-0a07-49f7-af14-7fcf2ed5887a",
	"label": "Library Catalog (TIND ILS)",
	"creator": "Abe Jellinek",
	"target": "/search.+p=|record/[0-9]+",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 260,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-05-30 08:40:02"
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

/**
 * @type {Map<string, keyof Z.ItemTypes>}
 */
const SCHEMA_ORG_TO_ZOTERO = new Map([
	["Thing", "document"],
	["CreativeWork", "document"],
	["Article", "journalArticle"],
	["ScholarlyArticle", "journalArticle"],
	["Report", "report"],
	["Thesis", "thesis"],
	["Manuscript", "manuscript"],
	["Dataset", "dataset"],
]);

/**
 * @param {Document} doc The page document
 */
function detectWeb(doc, url) {
	if (!doc.querySelector("#tind-shibboleth")) {
		return false;
	}

	if (url.includes('/record/')) {
		const schemaOrg = getSchemaOrg(doc);

		if (schemaOrg) {
			const zoteroType = getZoteroTypeFromSchemaOrg(schemaOrg);

			if (zoteroType) {
				return zoteroType;
			}
		}
		return "book";
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	else if (url.includes('/search')) {
		Z.monitorDOMChanges(doc.querySelector('.pagebody'), {});
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.result-title a');
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
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (!items) return;
		for (let url of Object.keys(items)) {
			await scrape(await requestDocument(url));
		}
	}
	else {
		await scrape(doc);
	}
}

/**
 *
 * @param {Document} doc The page document
 */
async function scrape(doc) {
	let translator = Zotero.loadTranslator("import");
	// MARCXML
	translator.setTranslator("edd87d07-9194-42f8-b2ad-997c4c7deefd");

	const schemaOrg = getSchemaOrg(doc);

	let marcXMLURL = attr(doc, 'a[href$="/export/xm"], a[download$=".xml"]', 'href');
	if (!marcXMLURL) marcXMLURL = attr(doc, 'form[action$="/export/xm"]', 'action');
	if (!marcXMLURL) {
		throw new Error('Unable to find MARCXML URL');
	}

	let xml = new DOMParser().parseFromString(await requestText(marcXMLURL), "text/xml");
	let marcxml = await translator.getTranslatorObject();
	let fileInformation = await getFileInformation(doc);
	for (let record of await marcxml.parseDocument(xml)) {
		let item = new Zotero.Item();

		// Set the right item type if schemaorg exists
		if (schemaOrg) {
			enrichItemWithSchemaOrgItemType(item, schemaOrg);
		}

		record.translate(item);
		//// Enhance the item with TIND-specific information
		// Catalog name
		item.libraryCatalog = text(doc, '#headerlogo')
			|| attr(doc, 'meta[property="og:site_name"]', 'content');

		// URL
		item.url = attr(doc, 'meta[property="og:url"]', 'content') || item.url;

		// Attachments
		if (fileInformation) {
			enrichItemWithAttachments(item, fileInformation);
		}

		// Tind-specific date field 269. Assume there's only one.
		let tindDate = record.getFieldSubfields("269")[0];
		if (tindDate && tindDate.a && !item.date) {
			// Assign the date if it doesn't already exist.
			item.date = tindDate.a;
		}

		if (item.abstractNote === 'No abstract') {
			delete item.abstractNote;
		}

		item.complete();
	}
}

/**
 * @param {Document} doc The page document
 * @returns {?Promise<Array<Object>>} The file information object
 */
async function getFileInformation(doc) {
	let fileApiArgs;

	try {
		fileApiArgs = JSON.parse(text(doc, "#detailed-file-api-args"));
	}
	catch (e) {
		return null;
	}

	// eslint camelcase is disabled because the API requires snake case.
	let urlParams = new URLSearchParams({
		recid: fileApiArgs.recid,
		file_types: fileApiArgs.file_types, // eslint-disable-line camelcase
		hidden_types: fileApiArgs.hidden_types, // eslint-disable-line camelcase
		ln: fileApiArgs.ln,
		hr: fileApiArgs.hr,
		hide_transcripts: fileApiArgs.hide_transcripts, // eslint-disable-line camelcase
	});

	try {
		return await requestJSON(`/api/v1/file?${urlParams}`);
	}
	catch (e) {
		Zotero.debug(e);
		return null;
	}
}

/**
 * @param {Z.Item} item The Zotero item
 * @param {Array<Object>} fileInformation The file information
 */
function enrichItemWithAttachments(item, fileInformation) {
	for (let file of fileInformation) {
		if (file.restricted) {
			continue;
		}

		item.attachments.push({
			title: file.name + file.format,
			mimeType: file.mime,
			url: file.url,
		});
	}
}

/**
 * @param {Object} schemaOrg
 * @returns {keyof Z.ItemTypes | null}
 */
function getZoteroTypeFromSchemaOrg(schemaOrg) {
	const schemaOrgType = schemaOrg["@type"];

	if (SCHEMA_ORG_TO_ZOTERO.has(schemaOrgType)) {
		return SCHEMA_ORG_TO_ZOTERO.get(schemaOrgType);
	}

	return null;
}

/**
 * Enriches the Zotero item with item type found in the Schema.org data.
 *
 * @param {Z.Item} item The Zotero item
 * @param {Object} schemaOrg The parsed Schema.org data
 */
function enrichItemWithSchemaOrgItemType(item, schemaOrg) {
	const zoteroType = getZoteroTypeFromSchemaOrg(schemaOrg);

	if (zoteroType) {
		item.itemType = zoteroType;
	}
}

/**
 * Obtains the parsed Schema.org data from the page.
 *
 * @param {Document} doc The page document
 * @returns {?Object} The schema.org JSON-LD object
 */
function getSchemaOrg(doc) {
	let schemaOrg;
	try {
		schemaOrg = JSON.parse(text(doc, '#detailed-schema-org'));
	}
	catch (e) {
		return null;
	}

	if (schemaOrg["@context"] !== "https://schema.org") {
		return null;
	}

	return schemaOrg;
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://socialmediaarchive.org/record/60",
		"items": [
			{
				"itemType": "dataset",
				"title": "Not With a Bang But a Tweet: Democracy, Culture Wars, and the Memeification of T.S. Eliot",
				"creators": [
					{
						"firstName": "Melanie",
						"lastName": "Walsh",
						"creatorType": "contributor"
					},
					{
						"firstName": "Anna",
						"lastName": "Preus",
						"creatorType": "contributor"
					}
				],
				"date": "2024-10-04",
				"abstractNote": "This dataset includes posts from Twitter (now X) from 2006 to early 2022 that mentioned a variation of T.S. Eliot's famous lines \"This is the way the world ends / Not with a bang but a whimper\" (see \"Design\" for specific search terms used).\n<br><br>\nModernist poet T.S. Eliot concluded his 1925 poem \"The Hollow Men\" with the iconic lines: \"This is the way the world ends / Not with a bang but a whimper.\" When Eliot died in 1965, the New York Times claimed in his obituary that these lines were “probably the most quoted lines of any 20th-century poet writing in English.” They may be among the most memed lines, as well. Through a computational analysis of Twitter data, we have found that at least 350,000 tweets have referenced or remixed Eliot’s lines since the beginning of Twitter’s history in 2006. While references to the poem vary widely, we focus on two prominent political usages of the phrase — cases where Twitter users invoke it to warn about the state of modern democracy, often from the left side of the political spectrum, and cases where they use the phrase to critique political correctness and “cancel culture” or to mock people for non-normatized aspects of their identities, often from the right side of the political spectrum. Though some of the tweets cite Eliot directly, most do not, and in many cases the phrase almost seems to be moving from an authored quotation into a common idiom or turn-of-phrase. Linguistics experts increasingly refer to this kind of construction as a “snowclone” —a fixed phrasal template, often with a culturally salient source (e.g., a quotation from a book, TV show, or movie), that has “one or more variable slots” into which users insert various “lexical substitutions\" (Hartmann and Ungerer). This data thus enables researchers to study both the circulation of literature and the evolution of linguistic forms",
				"libraryCatalog": "Social Media Archive at ICPSR - SOMAR",
				"shortTitle": "Not With a Bang But a Tweet",
				"url": "https://socialmediaarchive.org/record/60",
				"attachments": [],
				"tags": [
					{
						"tag": "literature"
					},
					{
						"tag": "presidential election"
					},
					{
						"tag": "social media"
					},
					{
						"tag": "web platform data"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://lawcat.berkeley.edu/record/1234692",
		"items": [
			{
				"itemType": "book",
				"title": "International maritime dictionary: an encyclopedic dictionary of useful maritime terms and phrases: together with equivalents in French and German",
				"creators": [
					{
						"firstName": "René de",
						"lastName": "Kerchove",
						"creatorType": "author"
					}
				],
				"date": "1961",
				"callNumber": "K4150 .K47 1961",
				"edition": "2nd ed",
				"extra": "OCLC: 8350214",
				"language": "eng fre ger",
				"libraryCatalog": "Berkeley Law",
				"numPages": "1018",
				"place": "Princeton, N.J",
				"publisher": "D. Van Nostrand Co",
				"shortTitle": "International maritime dictionary",
				"url": "https://lawcat.berkeley.edu/record/1234692",
				"attachments": [],
				"tags": [
					{
						"tag": "Dictionaries"
					},
					{
						"tag": "Dictionaries"
					},
					{
						"tag": "Dictionaries"
					},
					{
						"tag": "Dictionaries, Polyglot"
					},
					{
						"tag": "Naval art and science"
					},
					{
						"tag": "Naval art and science"
					},
					{
						"tag": "Polyglot"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://library.usi.edu/record/312809",
		"items": [
			{
				"itemType": "book",
				"title": "Harry Potter and the deathly hallows",
				"creators": [
					{
						"firstName": "J. K.",
						"lastName": "Rowling",
						"creatorType": "author"
					},
					{
						"firstName": "Mary",
						"lastName": "GrandPré",
						"creatorType": "author"
					}
				],
				"date": "2007",
				"ISBN": "9780545010221",
				"abstractNote": "Burdened with the dark, dangerous, and seemingly impossible task of locating and destroying Voldemort's remaining Horcruxes, Harry, feeling alone and uncertain about his future, struggles to find the inner strength he needs to follow the path set out before him",
				"callNumber": "PZ7.R79835 Hak 2007",
				"edition": "First edition",
				"extra": "OCLC: ocm85443494",
				"libraryCatalog": "University of Southern Indiana",
				"numPages": "759",
				"place": "New York",
				"publisher": "Arthur A. Levine Books",
				"url": "https://library.usi.edu/record/312809",
				"attachments": [],
				"tags": [
					{
						"tag": "Bildungsromans"
					},
					{
						"tag": "England"
					},
					{
						"tag": "Hogwarts School of Witchcraft and Wizardry (Imaginary organization)"
					},
					{
						"tag": "Juvenile fiction"
					},
					{
						"tag": "Juvenile fiction"
					},
					{
						"tag": "Juvenile fiction"
					},
					{
						"tag": "Juvenile fiction"
					},
					{
						"tag": "Juvenile fiction"
					},
					{
						"tag": "Juvenile fiction"
					},
					{
						"tag": "Magic"
					},
					{
						"tag": "Potter, Harry"
					},
					{
						"tag": "Schools"
					},
					{
						"tag": "Wizards"
					}
				],
				"notes": [
					{
						"note": "Sequel to: Harry Potter and the Half-Blood Prince"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://lawcat.berkeley.edu/record/1301185",
		"items": [
			{
				"itemType": "book",
				"title": "Constitution of the United States of Brazil, 1946 (as amended)",
				"creators": [
					{
						"lastName": "Brazil",
						"creatorType": "editor",
						"fieldMode": 1
					},
					{
						"lastName": "Pan American Union",
						"creatorType": "editor",
						"fieldMode": 1
					}
				],
				"date": "1963",
				"callNumber": "KHD2914 1946 .A6 1963",
				"libraryCatalog": "Berkeley Law",
				"numPages": "1",
				"place": "Washington, D.C",
				"publisher": "Pan American Union",
				"url": "https://lawcat.berkeley.edu/record/1301185",
				"attachments": [],
				"tags": [
					{
						"tag": "Brazil"
					},
					{
						"tag": "Brazil"
					},
					{
						"tag": "Constitutional law"
					},
					{
						"tag": "Constitutions"
					}
				],
				"notes": [
					{
						"note": "\"Published under the direction of the General Legal Division, Department of Legal Affairs, Pan American Union.\" Title page verso"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://library.usi.edu/record/1416599?v=pdf",
		"items": [
			{
				"itemType": "thesis",
				"title": "Let's talk: a common-sense approach to public speaking",
				"creators": [
					{
						"firstName": "Sherry",
						"lastName": "Crawford",
						"creatorType": "author"
					},
					{
						"firstName": "Thomas A.",
						"lastName": "Wilhelmus",
						"creatorType": "contributor"
					},
					{
						"firstName": "Helen R.",
						"lastName": "Sands",
						"creatorType": "contributor"
					},
					{
						"firstName": "Laurence E.",
						"lastName": "Musgrove",
						"creatorType": "contributor"
					}
				],
				"date": "1996",
				"language": "eng",
				"libraryCatalog": "University of Southern Indiana",
				"shortTitle": "Let's talk",
				"url": "https://library.usi.edu/record/1416599",
				"attachments": [
					{
						"title": "Crawford, Sherry_Lets Talk.pdf",
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
		"url": "https://library.usi.edu/search?p=test AND 336%3AThesis&fct__3=2017",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://pegasus.law.columbia.edu/record/511151",
		"items": [
			{
				"itemType": "book",
				"title": "Sex and race differences on standardized tests: oversight hearings before the Subcommittee on Civil and Constitutional Rights of the Committee on the Judiciary, House of Representatives, One Hundredth Congress, first session ... April 23, 1987",
				"creators": [
					{
						"lastName": "United States",
						"creatorType": "editor",
						"fieldMode": 1
					}
				],
				"date": "1989",
				"callNumber": "KF27 .J847 1987e",
				"extra": "OCLC: 19420020",
				"libraryCatalog": "CLS Pegasus Library Catalog",
				"numPages": "305",
				"place": "Washington",
				"publisher": "U.S. G.P.O",
				"shortTitle": "Sex and race differences on standardized tests",
				"url": "https://pegasus.law.columbia.edu/record/511151",
				"attachments": [],
				"tags": [
					{
						"tag": "Educational tests and measurements"
					},
					{
						"tag": "SAT (Educational test)"
					},
					{
						"tag": "Sexism in educational tests"
					},
					{
						"tag": "Test bias"
					},
					{
						"tag": "United States"
					},
					{
						"tag": "United States"
					},
					{
						"tag": "United States"
					}
				],
				"notes": [
					{
						"note": "Distributed to some depository libraries in microfiche Shipping list number: 89-175-P \"Serial number 93.\" Item 1020-A, 1020-B (microfiche)"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://socialmediaarchive.org/record/70?v=pdf",
		"items": [
			{
				"itemType": "dataset",
				"title": "Diffusion Time Metrics for Facebook Posts with 100 or More Reshares",
				"creators": [
					{
						"firstName": "Inc",
						"lastName": "Meta Platforms",
						"creatorType": "contributor"
					}
				],
				"date": "2024-12-10",
				"abstractNote": "This dataset contains aggregated information about all content reshared 100 or more times from July 1, 2020 through February 1, 2021. Each row of the dataset corresponds to an individual tree and its size and depth at specific hours and days from initial posting",
				"libraryCatalog": "Social Media Archive at ICPSR - SOMAR",
				"url": "https://socialmediaarchive.org/record/70",
				"attachments": [
					{
						"title": "US2020_FB&IG_Elections_External_Codebook_v3.pdf",
						"mimeType": "application/pdf"
					},
					{
						"title": "US2020_Glossary_v1.csv",
						"mimeType": "text/csv"
					},
					{
						"title": "data_dictionary_diffusion_time_metrics_facebook_posts_with_100_or_more_reshares.csv",
						"mimeType": "text/csv"
					}
				],
				"tags": [
					{
						"tag": "United States"
					},
					{
						"tag": "elections"
					},
					{
						"tag": "political attitudes"
					},
					{
						"tag": "political behavior"
					},
					{
						"tag": "social media"
					},
					{
						"tag": "web platform data"
					}
				],
				"notes": [
					{
						"note": "The U.S. 2020 Facebook and Instagram Election Study (US 2020 FIES) is a partnership between Meta and academic researchers to understand the impact of Facebook and Instagram on key political attitudes and behaviors during the US 2020 election"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://digitallibrary.un.org/record/4079320?v=pdf",
		"items": [
			{
				"itemType": "document",
				"title": "United Nations Organization Stabilization Mission in the Democratic Republic of the Congo: report of the Secretary-General",
				"creators": [
					{
						"lastName": "UN. Secretary-General",
						"creatorType": "contributor",
						"fieldMode": 1
					}
				],
				"date": "20",
				"callNumber": "UNH",
				"language": "eng",
				"libraryCatalog": "United Nations Digital Library System",
				"publisher": "UN",
				"shortTitle": "United Nations Organization Stabilization Mission in the Democratic Republic of the Congo",
				"url": "https://digitallibrary.un.org/record/4079320",
				"attachments": [
					{
						"title": "S_2025_176-AR.pdf",
						"mimeType": "application/pdf"
					},
					{
						"title": "S_2025_176-ZH.pdf",
						"mimeType": "application/pdf"
					},
					{
						"title": "S_2025_176-EN.pdf",
						"mimeType": "application/pdf"
					},
					{
						"title": "S_2025_176-FR.pdf",
						"mimeType": "application/pdf"
					},
					{
						"title": "S_2025_176-RU.pdf",
						"mimeType": "application/pdf"
					},
					{
						"title": "S_2025_176-ES.pdf",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "DEMOCRATIC REPUBLIC OF THE CONGO"
					},
					{
						"tag": "DEMOCRATIC REPUBLIC OF THE CONGO SITUATION"
					},
					{
						"tag": "DISSOLUTION"
					},
					{
						"tag": "Forces démocratiques de libération du Rwanda"
					},
					{
						"tag": "HUMAN RIGHTS IN ARMED CONFLICTS"
					},
					{
						"tag": "HUMANITARIAN ASSISTANCE"
					},
					{
						"tag": "INTERNAL SECURITY"
					},
					{
						"tag": "MAPS"
					},
					{
						"tag": "Mouvement du 23 mars (Democratic Republic of the Congo)"
					},
					{
						"tag": "PEACEKEEPING OPERATIONS"
					},
					{
						"tag": "POLITICAL CONDITIONS"
					},
					{
						"tag": "PROTECTION OF CIVILIANS IN PEACEKEEPING OPERATIONS"
					},
					{
						"tag": "RULE OF LAW"
					},
					{
						"tag": "RWANDA"
					},
					{
						"tag": "STAFF SECURITY"
					},
					{
						"tag": "UN Organization Stabilization Mission in the Democratic Republic of the Congo"
					}
				],
				"notes": [
					{
						"note": "Includes UN map no. 4412 Rev. 59: MONUSCO March 2025 (Mar. 2025) Submitted pursuant to para. 47 of Security Council resolution 2765 (2024); covers major developments since the previous report of 29 Nov. 2024"
					}
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
