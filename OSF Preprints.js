{
	"translatorID": "3b978207-5d5c-416f-b15e-2d9da4aa75e9",
	"label": "OSF Preprints",
	"creator": "Sebastian Karcher, Kun Chen",
	"target": "^https?://(osf\\.io|psyarxiv\\.com|arabixiv\\.org|biohackrxiv\\.org|eartharxiv\\.org|ecoevorxiv\\.org|ecsarxiv\\.org|edarxiv\\.org|engrxiv\\.org|frenxiv\\.org|indiarxiv\\.org|mediarxiv\\.org|paleorxiv\\.org)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-09-20 15:27:58"
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

function detectWeb(doc, url) {
	if (text(doc, "h1[data-test-preprint-title]")) {
		return "preprint";
	}
	else if (url.includes("search?") && getSearchResults(doc, true)) {
		return "multiple";
	}
	Z.monitorDOMChanges(doc.body);
	return false;
}


function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	// The Preprint search on OSF includes other preprints such as PeerJ and RePec
	var supportedSites = /^https?:\/\/(osf\.io|psyarxiv\.com|arabixiv\.org|biohackrxiv\.org|eartharxiv\.org|ecoevorxiv\.org|ecsarxiv\.org|edarxiv\.org|engrxiv\.org|frenxiv\.org|indiarxiv\.org|mediarxiv\.org|paleorxiv\.org)/;
	var rows = doc.querySelectorAll('div[class*="primary-metadata-container"] h4>a');
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(row.textContent);
		if (!href || !title || !supportedSites.test(href)) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

async function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		// only work for preprint type like previous code
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

async function getOSFJSON(url) {
	try {
		const osfID = (url.match(/\/([a-z0-9]+)$/) || [])[1];
		const osfAPIUrl = `https://api.osf.io/v2/preprints/${osfID}/?embed=contributors&embed=provider`;
		return await ZU.requestJSON(osfAPIUrl);
	} catch (e) {
		Z.debug("Error while fetching JSON: " + e);
		return null;
	}
}


function osfJSON2item(json) {
	// Z.debug(text);
	let attr = json.data.attributes;
	let embeds = json.data.embeds;
	var item = new Zotero.Item("preprint");
	// currently we're just doing preprints, but putting this here in case we'll want to handle different OSF
	// item types in the future
	// let type = json.data.type
	const textarea = document.createElement("textarea");
	textarea.innerHTML = attr.title;
	item.title = textarea.value;
	item.abstractNote = attr.description;
	item.date = attr.date_published.split("T")[0];
	item.publisher = embeds.provider.data.attributes.name;
	item.DOI = json.data.links.preprint_doi && ZU.cleanDOI(json.data.links.preprint_doi);
	item.url = json.data.links.html;
	for (let tag of attr.tags) {
		item.tags.push(tag);
	}

	for (let contributor of embeds.contributors.data) {
		let author = contributor.embeds.users.data.attributes;
		if (author.given_name && author.family_name) {
			// add middle names
			let givenNames = author.given_name + ' ' + author.middle_names;
			item.creators.push({ lastName: author.family_name, firstName: givenNames.trim(), creatorType: "author" });
		}
		else {
			item.creators.push({ lastName: author.full_name, creatorType: "author", fieldMode: 1 });
		}
	}
	if (json.data.relationships.primary_file) {
		let fileID = json.data.relationships.primary_file.links.related.href.replace("https://api.osf.io/v2/files/", "");
		item.attachments.push({ url: "https://osf.io/download/" + fileID, title: "OSF Preprint", mimeType: "application/pdf" });
	}
	item.complete();
}


async function scrape(url) {
	// fetch metadata from OSF API
	osfJSON2item(await getOSFJSON(url));
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://osf.io/preprints/psyarxiv/nx2b4",
		"defer": true,
		"items": [
			{
				"itemType": "preprint",
				"title": "The Dutch Auditory & Image Vocabulary Test (DAIVT): A New Dutch Receptive Vocabulary Test for Students",
				"creators": [
					{
						"lastName": "Bousard",
						"firstName": "Ibrich",
						"creatorType": "author"
					},
					{
						"lastName": "Brysbaert",
						"firstName": "Marc",
						"creatorType": "author"
					}
				],
				"date": "2020-05-05",
				"DOI": "10.31234/osf.io/nx2b4",
				"abstractNote": "We introduce a new Dutch receptive vocabulary test, the Dutch auditory &amp; image vocabulary test (DAIVT). The test is multiple choice and assesses vocabulary knowledge for spoken words. The measure has an online format, has free access, and allows easy data collection. The test was developed with the intent to enable testing for research purposes with university students. This paper describes the test construction. We cover three phases: 1) collecting stimulus materials and developing the test’s first version, 2) an exploratory item-analysis on the first draft (n= 93), and 3) validating the test (both the second and the final version) by comparing it to two existing tests (n= 270, n= 157). The results indicate that the test is reliable and correlates well with existing Dutch receptive vocabulary tests (convergent validity). The final version of the DAIVT comprises 90 test items and 1 practice item. It can be used freely for research purposes.",
				"libraryCatalog": "OSF Preprints",
				"repository": "PsyArXiv",
				"shortTitle": "The Dutch Auditory & Image Vocabulary Test (DAIVT)",
				"url": "https://osf.io/preprints/psyarxiv/nx2b4/",
				"attachments": [
					{
						"title": "OSF Preprint",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Dutch vocabulary"
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
		"url": "https://osf.io/preprints/osf/b2xmp",
		"defer": true,
		"items": [
			{
				"itemType": "preprint",
				"title": "‘All In’: A Pragmatic Framework for COVID-19 Testing and Action on a Global Scale",
				"creators": [
					{
						"lastName": "Pettit",
						"firstName": "Syril D",
						"creatorType": "author"
					},
					{
						"lastName": "Jerome",
						"firstName": "Keith",
						"creatorType": "author"
					},
					{
						"lastName": "Rouquie",
						"firstName": "David",
						"creatorType": "author"
					},
					{
						"lastName": "Hester",
						"firstName": "Susan",
						"creatorType": "author"
					},
					{
						"lastName": "Wehmas",
						"firstName": "Leah",
						"creatorType": "author"
					},
					{
						"lastName": "Mari",
						"firstName": "Bernard",
						"creatorType": "author"
					},
					{
						"lastName": "Barbry",
						"firstName": "Pascal",
						"creatorType": "author"
					},
					{
						"lastName": "Kanda",
						"firstName": "Yasunari",
						"creatorType": "author"
					},
					{
						"lastName": "Matsumoto",
						"firstName": "Mineo",
						"creatorType": "author"
					},
					{
						"lastName": "Botten",
						"firstName": "Jason",
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
						"title": "OSF Preprint",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "COVID-19"
					},
					{
						"tag": "Pandemic"
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
						"tag": "Virologic Testing"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://osf.io/preprints/socarxiv/j7qta",
		"defer": true,
		"items": [
			{
				"itemType": "preprint",
				"title": "The Reliability of Replications: A Study in Computational Reproductions",
				"creators": [
					{
						"lastName": "Breznau",
						"firstName": "Nate",
						"creatorType": "author"
					},
					{
						"lastName": "Rinke",
						"firstName": "Eike Mark",
						"creatorType": "author"
					},
					{
						"lastName": "Wuttke",
						"firstName": "Alexander",
						"creatorType": "author"
					},
					{
						"lastName": "Nguyen",
						"firstName": "Hung Hoang Viet",
						"creatorType": "author"
					},
					{
						"lastName": "Adem",
						"firstName": "Muna",
						"creatorType": "author"
					},
					{
						"lastName": "Adriaans",
						"firstName": "Jule",
						"creatorType": "author"
					},
					{
						"lastName": "Akdeniz",
						"firstName": "Esra",
						"creatorType": "author"
					},
					{
						"lastName": "Alvarez-Benjumea",
						"firstName": "Amalia",
						"creatorType": "author"
					},
					{
						"lastName": "Andersen",
						"firstName": "Henrik Kenneth",
						"creatorType": "author"
					},
					{
						"lastName": "Auer",
						"firstName": "Daniel",
						"creatorType": "author"
					}
				],
				"date": "2021-05-18",
				"DOI": "10.31235/osf.io/j7qta",
				"abstractNote": "This paper reports findings from a crowdsourced replication. Eighty-five independent teams attempted a computational replication of results reported in an original study of policy preferences and immigration by fitting the same statistical models to the same data. The replication involved an experimental condition. Random assignment put participating teams into either the transparent group that received the original study and code, or the opaque group receiving only a methods section, rough results description and no code. The transparent group mostly verified the numerical results of the original study with the same sign and p-value threshold (95.7%), while the opaque group had less success (89.3%). Exact numerical reproductions to the second decimal place were far less common (76.9% and 48.1%), and the number of teams who verified at least 95% of all effects in all models they ran was 79.5% and 65.2% respectively. Therefore, the reliability we quantify depends on how reliability is defined, but most definitions suggest it would take a minimum of three independent replications to achieve reliability. Qualitative investigation of the teams’ workflows reveals many causes of error including mistakes and procedural variations. Although minor error across researchers is not surprising, we show this occurs where it is least expected in the case of computational reproduction. Even when we curate the results to boost ecological validity, the error remains large enough to undermine reliability between researchers to some extent. The presence of inter-researcher variability may explain some of the current “reliability crisis” in the social sciences because it may be undetected in all forms of research involving data analysis. The obvious implication of our study is more transparency. Broader implications are that researcher variability adds an additional meta-source of error that may not derive from conscious measurement or modeling decisions, and that replications cannot alone resolve this type of uncertainty.",
				"libraryCatalog": "OSF Preprints",
				"repository": "SocArXiv",
				"shortTitle": "The Reliability of Replications",
				"url": "https://osf.io/preprints/socarxiv/j7qta/",
				"attachments": [
					{
						"title": "OSF Preprint",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Immigration"
					},
					{
						"tag": "Meta-Reliability"
					},
					{
						"tag": "Noise"
					},
					{
						"tag": "Policy Preferences"
					},
					{
						"tag": "Replication"
					},
					{
						"tag": "Researcher Variability"
					},
					{
						"tag": "Secondary Observer Effect"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://osf.io/search?activeFilters=%5B%5D&q=metascience&resourceType=Preprint&sort=-relevance&view_only=",
		"defer": true,
		"items": "multiple"
	}
]
/** END TEST CASES **/
