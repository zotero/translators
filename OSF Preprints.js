{
	"translatorID": "3b978207-5d5c-416f-b15e-2d9da4aa75e9",
	"label": "OSF Preprints",
	"creator": "Sebastian Karcher",
	"target": "^https?://(osf\\.io|psyarxiv\\.com|arabixiv\\.org|biohackrxiv\\.org|eartharxiv\\.org|ecoevorxiv\\.org|ecsarxiv\\.org|edarxiv\\.org|engrxiv\\.org|frenxiv\\.org|indiarxiv\\.org|mediarxiv\\.org|paleorxiv\\.org)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-11-07 22:14:23"
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
	if (text(doc, 'h1[data-test-preprint-title]')) {
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

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (items) ZU.doGet(constructAPIURL(Object.keys(items)), osfAPIImport);
		});
	}
	else {
		scrape(doc, url);
	}
}


// takes and array of preprint URLs, extracts the ID and constructs an API call to OSF
function constructAPIURL(urls) {
	var ids = [];
	for (let url of urls) {
		let id;
		if (url.match(/\.(io|com|org)\/([a-z0-9]+)/)) {
			id = url.match(/\.(?:io|com|org)\/([a-z0-9]+)/)[1];
		}
		if (id) {
			ids.push("https://api.osf.io/v2/preprints/" + id + "/?embed=contributors&embed=provider");
		}
	}
	return ids;
}

// TODO: Unify and use API or EM uniformly
function osfAPIImport(text) {
	// Z.debug(text);
	let json = JSON.parse(text);
	let attr = json.data.attributes;
	let embeds = json.data.embeds;
	var item = new Zotero.Item("preprint");
	// currently we're just doing preprints, but putting this here in case we'll want to handle different OSF
	// item types in the future
	// let type = json.data.type
	item.title = attr.title;
	item.abstractNote = attr.description;
	item.date = attr.date_published;
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

function scrape(doc, url) {
	var translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');

	translator.setHandler('itemDone', function (obj, item) {
		// remove Snapshot, which is useless for OSF preprints (plus we should always get a PDF)
		for (let i = item.attachments.length - 1; i >= 0; i--) {
			if (item.attachments[i].title == "Snapshot") {
				item.attachments.splice(i, 1);
			}
		}
		if (!item.attachments.length) {
			let pdfURL = attr(doc, 'div[class*="download-container"] a[href$="/download/"]', 'href');
			if (pdfURL) {
				item.attachments.push({
					title: 'OSF Preprint',
					mimeType: 'application/pdf',
					url: pdfURL
				});
			}
		}
		item.libraryCatalog = "OSF Preprints";
		item.complete();
	});

	translator.getTranslatorObject(function (trans) {
		trans.itemType = "preprint";
		trans.doWeb(doc, url);
	});
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
				"abstractNote": "We introduce a new Dutch receptive vocabulary test, the Dutch auditory &amp; image vocabulary test (DAIVT). The test is multiple choice and assesses vocabulary knowledge for spoken words. The measure has an online format, has free access, and allows easy data collection. The test was developed with the intent to enable testing for research purposes with university students. This paper describes the test construction. We cover three phases: 1) collecting stimulus materials and developing the test’s first version, 2) an exploratory item-analysis on the first draft (n= 93), and 3) validating the test (both the second and the final version) by comparing it to two existing tests (n= 270, n= 157). The results indicate that the test is reliable and correlates well with existing Dutch receptive vocabulary tests (convergent validity). The final version of the DAIVT comprises 90 test items and 1 practice item. It can be used freely for research purposes.",
				"language": "en-us",
				"libraryCatalog": "OSF Preprints",
				"repository": "OSF",
				"shortTitle": "The Dutch Auditory & Image Vocabulary Test (DAIVT)",
				"url": "https://osf.io/nx2b4",
				"attachments": [],
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
						"firstName": "Syril",
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
					},
					{
						"firstName": "Emily",
						"lastName": "Bruce",
						"creatorType": "author"
					}
				],
				"date": "2020-04-29",
				"DOI": "10.31219/osf.io/b2xmp",
				"abstractNote": "Current demand for SARS-CoV-2 testing is straining material resource and labor capacity around the globe.  As a result, the public health and clinical community are hindered in their ability to monitor and contain the spread of COVID-19.  Despite broad consensus that more testing is needed, pragmatic guidance towards realizing this objective has been limited.  This paper addresses this limitation by proposing a novel and geographically agnostic framework (‘the 4Ps Framework) to guide multidisciplinary, scalable, resource-efficient, and achievable efforts towards enhanced testing capacity.  The 4Ps (Prioritize, Propagate, Partition, and Provide) are described in terms of specific opportunities to enhance the volume, diversity, characterization, and implementation of SARS-CoV-2 testing to benefit public health.  Coordinated deployment of the strategic and tactical recommendations described in this framework have the potential to rapidly expand available testing capacity, improve public health decision-making in response to the COVID-19 pandemic, and/or to be applied in future emergent disease outbreaks.",
				"language": "en-us",
				"libraryCatalog": "OSF Preprints",
				"repository": "OSF",
				"shortTitle": "‘All In’",
				"url": "https://osf.io/b2xmp",
				"attachments": [],
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
				"title": "SocArXiv Papers | The Reliability of Replications: A Study in Computational Reproductions",
				"creators": [],
				"language": "en-us",
				"libraryCatalog": "OSF Preprints",
				"shortTitle": "SocArXiv Papers | The Reliability of Replications",
				"url": "https://osf.io/preprints/socarxiv/j7qta",
				"attachments": [],
				"tags": [],
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
	},
	{
		"type": "web",
		"url": "https://osf.io/preprints/psyarxiv/7eb4g",
		"items": [
			{
				"itemType": "preprint",
				"title": "Revisiting the Digital Jukebox: Applying Mood Management Theory to Algorithmically Curated Music Streaming Environments",
				"creators": [
					{
						"firstName": "Alicia",
						"lastName": "Ernst",
						"creatorType": "author"
					},
					{
						"firstName": "Felix",
						"lastName": "Dietrich",
						"creatorType": "author"
					},
					{
						"firstName": "Benedikt",
						"lastName": "Rohr",
						"creatorType": "author"
					},
					{
						"firstName": "Leonard",
						"lastName": "Reinecke",
						"creatorType": "author"
					},
					{
						"firstName": "Michael",
						"lastName": "Scharkow",
						"creatorType": "author"
					}
				],
				"date": "2024-09-30",
				"DOI": "10.31234/osf.io/7eb4g",
				"abstractNote": "Experimental evidence has profoundly contributed to our understanding of Mood Management Theory (MMT) in the context of music. Extant research, however, lacks insights into everyday mood regulation through music listening, especially on music streaming services where selections can be guided by algorithmic recommendations. Hence, we tested MMT in a naturalistic setting by combining experience sampling with logged music streaming data, while accounting for algorithmic curation as a boundary condition to users’ music choices. In a pre-registered study using T = 6,918 observations from N = 144 listeners, results showed that mood, music selection, and algorithmic curation varied substantially from situation to situation. However, we found no effects between mood and music choices that would confirm MMT’s selection hypotheses, yet small mood-congruent music effects on mood. Algorithmic curation did not establish novel MMT-related choice patterns. Our findings suggest re-specifying MMT and related media use theories for daily life.",
				"language": "en-us",
				"libraryCatalog": "OSF Preprints",
				"repository": "OSF",
				"shortTitle": "Revisiting the Digital Jukebox",
				"url": "https://osf.io/7eb4g",
				"attachments": [
					{
						"title": "OSF Preprint",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Mood Management Theory"
					},
					{
						"tag": "algorithmic curation"
					},
					{
						"tag": "digital behavioral data"
					},
					{
						"tag": "experience sampling method"
					},
					{
						"tag": "music use"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
