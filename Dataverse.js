{
	"translatorID": "aedf3fb0-9a50-47b3-ba2f-3206552b82a9",
	"label": "Dataverse",
	"creator": "Abe Jellinek, Sebastian Karcher",
	"target": "^https?://(www\\.)?((open|research-?|hei|planetary-|osna|in|bonn|borealis|lida\\.|archaeology\\.|entrepot\\.recherche\\.|archive\\.|redape\\.)?(data|e?da[td]os)|dvn|sodha\\.be|repositorio(\\.|dedados|pesquisas)|abacus\\.library\\.ubc\\.ca|dorel\\.univ-lorraine\\.fr|darus\\.uni-stuttgart\\.de|dunas\\.ua\\.pt|edmond\\.mpdl\\.mpg\\.de|keen\\.zih\\.tu-dresden\\.de|rdr\\.kuleuven\\.be|portal\\.odissei\\.nl)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-05-01 12:09:04"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2023 Abe Jellinek & Sebastian Karcher
	
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

const datasetType = ZU.fieldIsValidForType('title', 'dataset')
	? 'dataset'
	: 'document';

function detectWeb(doc, url) {
	if (!doc.querySelector('#dataverseHeader')) {
		return false;
	}
	
	if (url.includes('/dataset.xhtml')) {
		return datasetType;
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.datasetResult a[href*="/dataset.xhtml"]');
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
		await scrape(doc, url);
	}
}

async function scrape(doc, url = doc.location.href) {
	let jsonLD = text(doc, 'script[type="application/ld+json"]');
	// Z.debug(jsonLD)
	let schema = JSON.parse(jsonLD);
	let license = schema.license;
	let abstract = schema.description;
	// License can be stored as a string or an object (should be a string)
	if (typeof (license) == "object") {
		license = schema.license.text;
	}
	let version = schema.version;
	let translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	
	translator.setHandler('itemDone', (_obj, item) => {
		item.libraryCatalog = text(doc, '#breadcrumbLnk0');
		// we commonly have two colons in titles. The first one just labels the data as data
		if (/^(Replication )?[Dd]ata for:/.test(item.title)) {
			item.shortTitle = item.title.match(/(^(Replication )?[Dd]ata for:.*?)(:|$)/)[1];
		}
		if (license) {
			item.rights = ZU.cleanTags(license).trim();
		}
		if (abstract) {
			item.abstractNote = abstract;
		}
		if (version && version > 1) item.versionNumber = version;
		item.complete();
	});

	let em = await translator.getTranslatorObject();
	em.itemType = datasetType;
	await em.doWeb(doc, url);
}



/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/3OUPKS",
		"items": [
			{
				"itemType": "dataset",
				"title": "Survey seed production and seed contract",
				"creators": [
					{
						"firstName": "Prakashan",
						"lastName": "Veettil",
						"creatorType": "author"
					}
				],
				"date": "2021-08-04",
				"DOI": "10.7910/DVN/3OUPKS",
				"abstractNote": "The data is collected as part of a seed contract experiment conducted in Telengana state, India",
				"language": "en",
				"libraryCatalog": "Harvard Dataverse",
				"repository": "Harvard Dataverse",
				"rights": "CC0",
				"url": "https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/3OUPKS",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Agricultural Sciences"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://dataverse.harvard.edu/dataverse/harvard?q=chocolate",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://datos.uchile.cl/dataset.xhtml?persistentId=doi:10.34691/FK2/UMWJDU",
		"detectedItemType": "dataset",
		"items": [
			{
				"itemType": "dataset",
				"title": "Replicar los datos para: Genetic diversity in a restricted-dispersal kissing bug: The Center-Periphery Hypothesis halfway",
				"creators": [
					{
						"firstName": "Esteban",
						"lastName": "San Juan",
						"creatorType": "author"
					},
					{
						"firstName": "Raul",
						"lastName": "Araya-Donoso",
						"creatorType": "author"
					},
					{
						"firstName": "David",
						"lastName": "Veliz",
						"creatorType": "author"
					},
					{
						"firstName": "Nicol",
						"lastName": "Quiroga",
						"creatorType": "author"
					},
					{
						"firstName": "Carezza",
						"lastName": "Botto-Mahan",
						"creatorType": "author"
					}
				],
				"date": "2021-07-19",
				"DOI": "10.34691/FK2/UMWJDU",
				"abstractNote": "The center-periphery hypothesis (CPH) postulates that populations close to the center of a species’ distribution will exhibit higher genetic diversity and lower genetic differentiation than populations located at the edge of the distribution. The center of a species distribution might represent an optimum for the environmental factors influencing the species absolute fitness and therefore, genetic diversity. In species with wide distribution, the geographical variation of biotic and abiotic variables is crucial to understand the underlying mechanisms of the CPH. We evaluated the CPH and specifically tested which environmental variables better explained the patterns of genetic diversity in the kissing-bug Mepraia spinolai, one of the main wild vectors of Chagas disease in southern South America, distributing across three Mediterranean climatic ecoregions in Chile. We analyzed 2380 neutral Single Nucleotide Polymorphisms (SNP) to estimate genetic diversity. The mean winter temperature, the mean summer temperature, vegetation cover, population abundance, proportion of winged individuals and female abdomen area were measured for each kissing bug population to construct a model. Lower genetic diversity was detected in populations at the edge of the distribution compared to those in the center. However, genetic differentiation was not higher in the periphery. Genetic diversity was related to climatic and biological variables; there was a positive relationship with mean winter temperature and a negative association with mean summer temperature and body size. These results partially support the CPH and identify biotic (abdomen area) and abiotic (winter/summer temperatures) factors that would affect genetic diversity in this restricted-dispersal species of epidemiological relevance.",
				"extra": "Type: dataset",
				"language": "en",
				"libraryCatalog": "Repositorio de datos de investigación de la Universidad de Chile",
				"repository": "Repositorio de datos de investigación de la Universidad de Chile",
				"rights": "CC0",
				"shortTitle": "Replicar los datos para",
				"url": "https://datos.uchile.cl/dataset.xhtml?persistentId=doi:10.34691/FK2/UMWJDU",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Ciencias de la Tierra y Medioambiente"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://datos.uchile.cl/dataverse/uchile?q=santiago",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.sodha.be/dataset.xhtml?persistentId=doi:10.34934/DVN/HEABHJ",
		"items": [
			{
				"itemType": "dataset",
				"title": "World Value Surveys 1981",
				"creators": [
					{
						"firstName": "Ronald",
						"lastName": "Inglehart",
						"creatorType": "author"
					}
				],
				"date": "2021-07-30",
				"DOI": "10.34934/DVN/HEABHJ",
				"abstractNote": "The series is designed to enable a crossnational comparison of values and norms on a wide variety of topics and to monitor changes in values and attitudes across the world in 1981.",
				"extra": "Type: dataset",
				"language": "en",
				"libraryCatalog": "Social Sciences and Digital Humanities Archive – SODHA",
				"repository": "Social Sciences and Digital Humanities Archive – SODHA",
				"rights": "This work is licensed under a Creative Commons Attribution 4.0 International License (CC-BY).",
				"url": "https://www.sodha.be/dataset.xhtml?persistentId=doi:10.34934/DVN/HEABHJ",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Social Sciences"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://data.worldagroforestry.org/dataset.xhtml?persistentId=doi:10.34725/DVN/NGGXCZ",
		"items": [
			{
				"itemType": "dataset",
				"title": "Replication Data for: Agroforestry governance for operationalising the landscape approach: connecting conservation and farming actors",
				"creators": [
					{
						"firstName": "Yves",
						"lastName": "Zinngrebe",
						"creatorType": "author"
					},
					{
						"firstName": "Elena",
						"lastName": "Borasino",
						"creatorType": "author"
					},
					{
						"firstName": "Brian",
						"lastName": "Chiputwa",
						"creatorType": "author"
					},
					{
						"firstName": "Philip",
						"lastName": "Dobie",
						"creatorType": "author"
					},
					{
						"firstName": "Edwin",
						"lastName": "Garcia",
						"creatorType": "author"
					},
					{
						"firstName": "Anja",
						"lastName": "Gassner",
						"creatorType": "author"
					},
					{
						"firstName": "Heru",
						"lastName": "Komarudin",
						"creatorType": "author"
					},
					{
						"firstName": "Nining",
						"lastName": "Liswanti",
						"creatorType": "author"
					},
					{
						"firstName": "Parmutia",
						"lastName": "Makui",
						"creatorType": "author"
					},
					{
						"firstName": "Tobias",
						"lastName": "Plieninger",
						"creatorType": "author"
					},
					{
						"firstName": "Ettie",
						"lastName": "Winter",
						"creatorType": "author"
					},
					{
						"firstName": "Jennifer",
						"lastName": "Hauck",
						"creatorType": "author"
					}
				],
				"date": "2021-08-05",
				"DOI": "10.34725/DVN/NGGXCZ",
				"abstractNote": "The expansion and intensifcation of agriculture as well as the associated land clearing are threatening both biodiversity and human wellbeing in tr...",
				"language": "en",
				"libraryCatalog": "World Agroforestry - Research Data Repository",
				"repository": "World Agroforestry - Research Data Repository",
				"rights": "This dataset is made available under the Creative Commons Attribution 4.0 International (CC-BY-4.0). The license allows you, the user, to copy and redistribute the material in any medium or format and/or transform, and build upon the material\r\nfor any purpose, even commercially.",
				"shortTitle": "Replication Data for",
				"url": "https://data.worldagroforestry.org/dataset.xhtml?persistentId=doi:10.34725/DVN/NGGXCZ",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Agricultural Sciences"
					},
					{
						"tag": "Social Sciences"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://dataverse.no/dataset.xhtml?persistentId=doi:10.18710/GUX2O8",
		"detectedItemType": "dataset",
		"items": [
			{
				"itemType": "dataset",
				"title": "Replication Data for: Spatial changes in gas transport and sediment stiffness influenced by regional stress: observations from piezometer data along the Vestnesa Ridge, eastern Fram Strait",
				"creators": [
					{
						"firstName": "Andreia",
						"lastName": "Plaza-Faverola",
						"creatorType": "author"
					},
					{
						"firstName": "Nabil",
						"lastName": "Sultan",
						"creatorType": "author"
					}
				],
				"date": "2023-04-11",
				"DOI": "10.18710/GUX2O8",
				"abstractNote": "This database comprises piezometer pore-pressure and temperature data, analyses from Calypso sediment cores (grain sizes and logs) and results from...",
				"extra": "Type: dataset",
				"language": "en",
				"libraryCatalog": "DataverseNO",
				"repository": "DataverseNO",
				"rights": "http://creativecommons.org/publicdomain/zero/1.0",
				"shortTitle": "Replication Data for",
				"url": "https://dataverse.no/dataset.xhtml?persistentId=doi:10.18710/GUX2O8",
				"versionNumber": "2",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Earth and Environmental Sciences"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
