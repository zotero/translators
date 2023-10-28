{
	"translatorID": "3b978207-5d5c-416f-b15e-2d9da4aa75e9",
	"label": "OSF Preprints",
	"creator": "Sebastian Karcher",
	"target": "^https://osf\\.io/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-10-28 11:03:06"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2020 Sebastian Karcher

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


const preprintType = ZU.fieldIsValidForType('title', 'preprint')
	? 'preprint'
	: 'report';

function detectWeb(doc, url) {
	if (doc.getElementById("preprintTitle")) {
		return preprintType;
	}
	if (url.includes("/discover?") || url.includes("/search?")) {
		Z.monitorDOMChanges(doc.body);
		return getSearchResults(doc, true) && "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	// The Preprint search on OSF includes other preprints such as PeerJ and RePec
	var rows = doc.querySelectorAll('div[class*="_result-card-container"] h4 > a');
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(row.textContent);
		if (!href || !title || !/^https:\/\/osf\.io\//.test(href)) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

async function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (!items) return;
		for (let url of Object.keys(items)) {
			await scrape(url);
		}
	}
	else {
		await scrape(url);
	}
}

// takes preprint URL, extracts the ID and constructs an API call to OSF
function constructAPIURL(url) {
	let urlObj = new URL(url);
	let last = urlObj.pathname.replace(/\/$/, "").split("/").slice(-1)[0];
	return last && /[a-z0-9]+/.test(last) && ("https://api.osf.io/v2/preprints/" + last + "/?embed=contributors&embed=provider");
}

function osfAPIImport(inputJSON) {
	let attributes = inputJSON.data.attributes;
	let embeds = inputJSON.data.embeds;
	var item = new Zotero.Item(preprintType);
	// currently we're just doing preprints, but putting this here in case we'll want to handle different OSF
	// item types in the future
	// let type = inputJSON.data.type
	item.title = ZU.unescapeHTML(attributes.title || "");
	item.abstractNote = ZU.unescapeHTML(attributes.description || "");
	item.date = ZU.strToISO(attributes.date_published);
	item.publisher = embeds.provider.data.attributes.name;
	item.DOI = inputJSON.data.links.preprint_doi && ZU.cleanDOI(inputJSON.data.links.preprint_doi);
	if (preprintType != 'preprint') {
		item.extra = "type: article";
	}
	item.url = inputJSON.data.links.html;
	for (let tag of attributes.tags) {
		item.tags.push(tag);
	}
	// Somehow the "subjects" field is a nested array; Array#flat() is not well
	// supported, so we just flatten one level.
	for (let subject of [].concat(...attributes.subjects)) {
		item.tags.push(subject.text);
	}

	for (let contributor of embeds.contributors.data) {
		let author = contributor.embeds.users.data.attributes;
		if (author.given_name && author.family_name) {
			// add middle names
			let givenNames = author.given_name + ' ' + author.middle_names;
			item.creators.push(ZU.cleanAuthor(`${author.family_name}, ${givenNames}`, "author", true/* useComma */));
		}
		else {
			item.creators.push({ lastName: author.full_name, creatorType: "author", fieldMode: 1 });
		}
	}
	if (inputJSON.data.relationships.primary_file) {
		let fileID = inputJSON.data.relationships.primary_file.links.related.href.replace("https://api.osf.io/v2/files/", "");
		item.attachments.push({
			url: "https://osf.io/download/" + fileID,
			title: "Preprint PDF",
			mimeType: "application/pdf",
		});
	}

	item.complete();
}

async function scrape(url) {
	let apiURL = constructAPIURL(url);
	if (!apiURL) {
		throw new Error(`Unexpected failure to extract API call URL for input URL ${url}`);
	}
	let metadata = await requestJSON(apiURL, { headers: { Accept: "application/json" } });
	osfAPIImport(metadata);
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://osf.io/preprints/psyarxiv/nx2b4/",
		"defer": true,
		"items": [
			{
				"itemType": "preprint",
				"title": "The Dutch Auditory & Image Vocabulary Test (DAIVT): A New Dutch Receptive Vocabulary Test for Students",
				"creators": [
					{
						"firstName": "Ibrich",
						"lastName": "Bousard",
						"creatorType": "author"
					},
					{
						"firstName": "Marc",
						"lastName": "Brysbaert",
						"creatorType": "author"
					}
				],
				"date": "2020-05-05",
				"DOI": "10.31234/osf.io/nx2b4",
				"abstractNote": "We introduce a new Dutch receptive vocabulary test, the Dutch auditory & image vocabulary test (DAIVT). The test is multiple choice and assesses vocabulary knowledge for spoken words. The measure has an online format, has free access, and allows easy data collection. The test was developed with the intent to enable testing for research purposes with university students. This paper describes the test construction. We cover three phases: 1) collecting stimulus materials and developing the test’s first version, 2) an exploratory item-analysis on the first draft (n= 93), and 3) validating the test (both the second and the final version) by comparing it to two existing tests (n= 270, n= 157). The results indicate that the test is reliable and correlates well with existing Dutch receptive vocabulary tests (convergent validity). The final version of the DAIVT comprises 90 test items and 1 practice item. It can be used freely for research purposes.",
				"libraryCatalog": "OSF Preprints",
				"repository": "PsyArXiv",
				"shortTitle": "The Dutch Auditory & Image Vocabulary Test (DAIVT)",
				"url": "https://osf.io/preprints/psyarxiv/nx2b4/",
				"attachments": [
					{
						"title": "Preprint PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Cognitive Psychology"
					},
					{
						"tag": "Dutch vocabulary"
					},
					{
						"tag": "Language"
					},
					{
						"tag": "Social and Behavioral Sciences"
					},
					{
						"tag": "individual differences"
					},
					{
						"tag": "receptive vocabulary"
					},
					{
						"tag": "spoken word comprehension"
					},
					{
						"tag": "vocabulary test"
					},
					{
						"tag": "word knowledge"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://osf.io/b2xmp/",
		"defer": true,
		"items": [
			{
				"itemType": "preprint",
				"title": "‘All In’: A Pragmatic Framework for COVID-19 Testing and Action on a Global Scale",
				"creators": [
					{
						"firstName": "Syril D.",
						"lastName": "Pettit",
						"creatorType": "author"
					},
					{
						"firstName": "Keith",
						"lastName": "Jerome",
						"creatorType": "author"
					},
					{
						"firstName": "David",
						"lastName": "Rouquie",
						"creatorType": "author"
					},
					{
						"firstName": "Susan",
						"lastName": "Hester",
						"creatorType": "author"
					},
					{
						"firstName": "Leah",
						"lastName": "Wehmas",
						"creatorType": "author"
					},
					{
						"firstName": "Bernard",
						"lastName": "Mari",
						"creatorType": "author"
					},
					{
						"firstName": "Pascal",
						"lastName": "Barbry",
						"creatorType": "author"
					},
					{
						"firstName": "Yasunari",
						"lastName": "Kanda",
						"creatorType": "author"
					},
					{
						"firstName": "Mineo",
						"lastName": "Matsumoto",
						"creatorType": "author"
					},
					{
						"firstName": "Jason",
						"lastName": "Botten",
						"creatorType": "author"
					}
				],
				"date": "2020-04-29",
				"DOI": "10.31219/osf.io/b2xmp",
				"abstractNote": "Current demand for SARS-CoV-2 testing is straining material resource and labor capacity around the globe.  As a result, the public health and clinical community are hindered in their ability to monitor and contain the spread of COVID-19.  Despite broad consensus that more testing is needed, pragmatic guidance towards realizing this objective has been limited.  This paper addresses this limitation by proposing a novel and geographically agnostic framework (‘the 4Ps Framework) to guide multidisciplinary, scalable, resource-efficient, and achievable efforts towards enhanced testing capacity.  The 4Ps (Prioritize, Propagate, Partition, and Provide) are described in terms of specific opportunities to enhance the volume, diversity, characterization, and implementation of SARS-CoV-2 testing to benefit public health.  Coordinated deployment of the strategic and tactical recommendations described in this framework have the potential to rapidly expand available testing capacity, improve public health decision-making in response to the COVID-19 pandemic, and/or to be applied in future emergent disease outbreaks.",
				"libraryCatalog": "OSF Preprints",
				"repository": "Open Science Framework",
				"shortTitle": "‘All In’",
				"url": "https://osf.io/b2xmp/",
				"attachments": [
					{
						"title": "Preprint PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "COVID-19"
					},
					{
						"tag": "Diseases"
					},
					{
						"tag": "Health Policy"
					},
					{
						"tag": "Life Sciences"
					},
					{
						"tag": "Medicine and Health Sciences"
					},
					{
						"tag": "Microbiology"
					},
					{
						"tag": "Pandemic"
					},
					{
						"tag": "Public Affairs, Public Policy and Public Administration"
					},
					{
						"tag": "Public Health"
					},
					{
						"tag": "RT-PCR"
					},
					{
						"tag": "SARS-CoV-2"
					},
					{
						"tag": "Social and Behavioral Sciences"
					},
					{
						"tag": "Virologic Testing"
					},
					{
						"tag": "Virology"
					},
					{
						"tag": "Virus Diseases"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://osf.io/search?q=testing&resourceType=Preprint",
		"defer": true,
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://osf.io/search?activeFilters=%5B%7B%22propertyVisibleLabel%22%3A%22Subject%22%2C%22propertyPathKey%22%3A%22subject%22%2C%22label%22%3A%22Race%20and%20Ethnicity%22%2C%22value%22%3A%22https%3A%2F%2Fapi.osf.io%2Fv2%2Fsubjects%2F584240d954be81056ceca9e9%2F%22%7D%5D&q=%22group%20threat%22&resourceType=Preprint",
		"defer": true,
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://osf.io/preprints/psyarxiv/discover?q=Perceived%20Muslim%20Population%20Growth",
		"defer": true,
		"items": "multiple"
	}
]
/** END TEST CASES **/
