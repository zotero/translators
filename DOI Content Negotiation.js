{
	"translatorID": "b28d0d42-8549-4c6d-83fc-8382874a5cb9",
	"label": "DOI Content Negotiation",
	"creator": "Sebastian Karcher",
	"target": "",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 8,
	"lastUpdated": "2025-07-27 04:51:26"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2019 Sebastian Karcher

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

function detectSearch(items) {
	return (filterQuery(items).length > 0);
}

// return an array of DOIs from the query (items or text)
function filterQuery(items) {
	if (!items) return [];

	if (typeof items == 'string' || !items.length) items = [items];

	// filter out invalid queries
	var dois = [], doi;
	for (var i = 0, n = items.length; i < n; i++) {
		if (items[i].DOI && (doi = ZU.cleanDOI(items[i].DOI))) {
			dois.push(doi);
		}
		else if (typeof items[i] == 'string' && (doi = ZU.cleanDOI(items[i]))) {
			dois.push(doi);
		}
	}
	return dois;
}

async function doSearch(items) {
	for (let doi of filterQuery(items)) {
		await processDOI(doi);
	}
}

async function processDOI(doi) {
	// TEMP: Use Crossref REST for Crossref DOIs during Crossref outage
	let currentDate = new Date();
	// Outage: 17 May 2025, 14:00–15:00 UTC
	// Start 1 hour before (13:00 UTC) and end 2 hours after (17:00 UTC)
	// TEMP for May 22 outage
	let startDate = new Date(Date.UTC(2025, 4, 22, 00, 0, 0));
	let endDate   = new Date(Date.UTC(2025, 4, 24, 0, 0, 0));

	// At least for now, always use REST API for Crossref DOIs
	// due to better reliability
	// TEMP: Except don't, because some REST API requests are really slow
	// https://forums.zotero.org/discussion/comment/496121/#Comment_496121
	//if (currentDate >= startDate && currentDate <= endDate) {
	if (false) {
		try {
			let raJSON = await requestJSON(
				`https://doi.org/ra/${encodeURIComponent(doi)}`
			);
			if (raJSON.length) {
				let ra = raJSON[0].RA;
				if (ra == 'Crossref') {
					let translate = Zotero.loadTranslator('search');
					// Crossref REST
					translate.setTranslator("0a61e167-de9a-4f93-a68a-628b48855909");
					let item = { itemType: "journalArticle", DOI: doi };
					translate.setSearch(item);
					translate.translate();
					return;
				}
			}
		}
		catch (e) {
			Z.debug(e);
		}
	}

	let response = await requestText(
		`https://doi.org/${encodeURIComponent(doi)}`,
		{ headers: { Accept: "application/vnd.datacite.datacite+json, application/vnd.crossref.unixref+xml, application/vnd.citationstyles.csl+json" } }
	);
	// by content negotiation we asked for datacite or crossref format, or CSL JSON
	if (!response) return;
	Z.debug(response);

	let trans = Zotero.loadTranslator('import');
	trans.setString(response);

	if (response.includes("<crossref")) {
		// Crossref Unixref
		trans.setTranslator('93514073-b541-4e02-9180-c36d2f3bb401');
		trans.setHandler('itemDone', function (obj, item) {
			item.libraryCatalog = "DOI.org (Crossref)";
			item.complete();
		});
	}
	else if (response.includes("http://datacite.org/schema")
		// TEMP
		// https://github.com/zotero/translators/issues/2018#issuecomment-616491407
		|| response.includes('"agency": "DataCite"')
		|| response.includes('"providerId": ')) {
		// Datacite JSON
		trans.setTranslator('b5b5808b-1c61-473d-9a02-e1f5ba7b8eef');
		trans.setHandler('itemDone', function (obj, item) {
			item.libraryCatalog = "DOI.org (Datacite)";
			item.complete();
		});
	}
	else {
		// use CSL JSON translator
		trans.setTranslator('bc03b4fe-436d-4a1f-ba59-de4d2d7a63f7');
		trans.setHandler('itemDone', function (obj, item) {
			item.libraryCatalog = "DOI.org (CSL JSON)";
			// check if there are potential issues with character encoding and try to fix it
			// e.g. 10.1057/9780230391116.0016 (en dash in title is presented as escaped unicode)
			for (var field in item) {
				if (typeof item[field] != 'string') continue;
				// check for control characters that should never be in strings from CrossRef
				if (/[\u007F-\u009F]/.test(item[field])) {
					var escaped = item[field].replace(/[^0-9A-Za-z ]/g, function (c) {
						return "%" + c.charCodeAt(0).toString(16);
					});
					item[field] = decodeURIComponent(escaped);
				}
			}
			item.complete();
		});
	}

	await trans.translate();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "search",
		"input": {
			"DOI": "10.12763/ONA1045"
		},
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Code criminel de l'empereur Charles V vulgairement appellé la Caroline contenant les loix qui sont suivies dans les jurisdictions criminelles de l'Empire et à l'usage des conseils de guerre des troupes suisses.",
				"creators": [
					{
						"lastName": "Heiliges Römisches Reich Deutscher Nation",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"lastName": "Vogel",
						"firstName": "Franz Adam. Éditeur Scientifique",
						"creatorType": "contributor"
					},
					{
						"firstName": "Simon, Claude (167 ?-1752) Éditeur",
						"lastName": "Commercial",
						"creatorType": "contributor"
					},
					{
						"lastName": "Université De Lorraine-Direction De La Documentation Et De L'Edition",
						"creatorType": "contributor",
						"fieldMode": 1
					}
				],
				"date": "1734",
				"DOI": "10.12763/ONA1045",
				"language": "fr",
				"libraryCatalog": "DOI.org (Datacite)",
				"pages": "39.79 MB, 402 pages",
				"url": "http://docnum.univ-lorraine.fr/pulsar/RCR_543952102_NA1045.pdf",
				"attachments": [],
				"tags": [
					{
						"tag": "Droit"
					}
				],
				"notes": [
					{
						"note": "<h2>Other</h2>\nLe code est accompagné de commentaires de F. A. Vogel, qui signe l'épitre dédicatoire<h2>Other</h2>\nReliure 18è siècle<h2>Other</h2>\nEx-libris manuscrit \"Ex libris Dufour\""
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "search",
		"input": {
			"DOI": "10.7336/academicus.2014.09.05"
		},
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Second world war, communism and post-communism in Albania, an equilateral triangle of a tragic trans-Adriatic story. The Eftimiadi’s Saga",
				"creators": [
					{
						"creatorType": "author",
						"firstName": "Paolo",
						"lastName": "Muner"
					}
				],
				"date": "01/2014",
				"DOI": "10.7336/academicus.2014.09.05",
				"ISSN": "20793715, 23091088",
				"abstractNote": "The complicated, troubled and tragic events of a wealthy family from Vlorë, Albania, which a century ago expanded its business to Italy, in Brindisi and Trieste, and whose grand land tenures and financial properties in Albania were nationalized by Communism after the Second World War. Hence the life-long solitary and hopeless fight of the last heir of the family to reconquer his patrimony that had been nationalized by Communism. Such properties would have been endowed to a planned foundation, which aims at perpetuating the memory of his brother, who was active in the resistance movement during the war and therefore hung by the Germans. His main institutional purpose is to help students from the Vlorë area to attend the University of Trieste. The paper is a travel in time through history, sociology and the consolidation of a state’s fundamentals, by trying to read the past aiming to understand the presence and save the future. The paper highlights the need to consider past models of social solidarity meanwhile renewing the actual one. This as a re-establishment of rule and understanding, a strategy to cope with pressures to renegotiate the social contract, as a universal need, by considering the past’s experiences as a firm base for successful social interaction. All this, inside a story which in the first look seems to be too personal and narrow, meanwhile it highlights the present and the past in a natural organic connection, dedicated to a nation in continuous struggle for its social reconstruction.",
				"libraryCatalog": "DOI.org (Crossref)",
				"pages": "69-78",
				"publicationTitle": "Academicus International Scientific Journal",
				"rights": "https://creativecommons.org/licenses/by-nc-nd/4.0/",
				"url": "https://www.medra.org/servlet/MREngine?hdl=10.7336/academicus.2014.09.05",
				"volume": "9",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "search",
		"input": [
			{
				"DOI": "10.5555/12345678"
			},
			{
				"DOI": "10.1109/TPS.1987.4316723"
			},
			{
				"DOI": "10.5555/666655554444"
			}
		],
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Toward a Unified Theory of High-Energy Metaphysics: Silly String Theory",
				"creators": [
					{
						"creatorType": "author",
						"firstName": "Josiah",
						"lastName": "Carberry"
					},
					{
						"creatorType": "contributor",
						"fieldMode": 1,
						"lastName": "Friends of Josiah Carberry"
					}
				],
				"date": "2008-08-14",
				"DOI": "10.5555/12345678",
				"ISSN": "0264-3561",
				"abstractNote": "The characteristic theme of the works of Stone is the bridge between culture and society. Several narratives concerning the fatal !aw, and subsequent dialectic, of semioticist class may be found. Thus, Debord uses the term ‘the subtextual paradigm of consensus’ to denote a cultural paradox. The subject is interpolated into a neocultural discourse that includes sexuality as a totality. But Marx’s critique of prepatriarchialist nihilism states that consciousness is capable of signi\"cance. The main theme of Dietrich’s[1]model of cultural discourse is not construction, but neoconstruction. Thus, any number of narratives concerning the textual paradigm of narrative exist. Pretextual cultural theory suggests that context must come from the collective unconscious.",
				"issue": "11",
				"journalAbbreviation": "Journal of Psychoceramics",
				"language": "en",
				"libraryCatalog": "DOI.org (Crossref)",
				"pages": "1-3",
				"publicationTitle": "Journal of Psychoceramics",
				"shortTitle": "Toward a Unified Theory of High-Energy Metaphysics",
				"url": "https://ojs33.crossref.publicknowledgeproject.org/index.php/test/article/view/2",
				"volume": "5",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			},
			{
				"itemType": "journalArticle",
				"title": "Bulk and Surface Plasmons in Artificially Structured Materials",
				"creators": [
					{
						"creatorType": "author",
						"firstName": "John J.",
						"lastName": "Quinn"
					},
					{
						"creatorType": "author",
						"firstName": "Josiah S.",
						"lastName": "Carberry"
					}
				],
				"date": "1987",
				"DOI": "10.1109/TPS.1987.4316723",
				"ISSN": "0093-3813",
				"issue": "4",
				"journalAbbreviation": "IEEE Trans. Plasma Sci.",
				"libraryCatalog": "DOI.org (Crossref)",
				"pages": "394-410",
				"publicationTitle": "IEEE Transactions on Plasma Science",
				"rights": "https://ieeexplore.ieee.org/Xplorehelp/downloads/license-information/IEEE.html",
				"url": "http://ieeexplore.ieee.org/document/4316723/",
				"volume": "15",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			},
			{
				"itemType": "journalArticle",
				"title": "The Memory Bus Considered Harmful",
				"creators": [
					{
						"creatorType": "author",
						"firstName": "Josiah",
						"lastName": "Carberry"
					}
				],
				"date": "2012-10-11",
				"DOI": "10.5555/666655554444",
				"ISSN": "0264-3561",
				"issue": "11",
				"journalAbbreviation": "Journal of Psychoceramics",
				"language": "en",
				"libraryCatalog": "DOI.org (Crossref)",
				"pages": "1-3",
				"publicationTitle": "Journal of Psychoceramics",
				"url": "https://ojs33.crossref.publicknowledgeproject.org/index.php/test/article/view/8",
				"volume": "9",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
