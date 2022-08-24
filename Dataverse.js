{
	"translatorID": "aedf3fb0-9a50-47b3-ba2f-3206552b82a9",
	"label": "Dataverse",
	"creator": "Abe Jellinek",
	"target": "^https?://(www\\.)?((open|research-|hei)?data|dvn|e?da[td]os|sodha\\.be|repositoriodedados|archive\\.data\\.jhu\\.edu|repositoriopesquisas|darus)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-08-11 18:10:33"
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
	if (!doc.querySelector('#dataverseHeader')) {
		return false;
	}
	
	if (url.includes('/dataset.xhtml')) {
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
		item.libraryCatalog = text(doc, '#breadcrumbLnk0');
		item.complete();
	});

	translator.getTranslatorObject(function (trans) {
		trans.itemType = 'document';
		trans.doWeb(doc, url);
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/3OUPKS",
		"items": [
			{
				"itemType": "document",
				"title": "Survey seed production and seed contract",
				"creators": [
					{
						"firstName": "Prakashan",
						"lastName": "Veettil",
						"creatorType": "author"
					}
				],
				"date": "2021-08-04",
				"abstractNote": "The data is collected as part of a seed contract experiment conducted in Telengana state, India",
				"extra": "Type: dataset\nDOI: 10.7910/DVN/3OUPKS",
				"language": "en",
				"libraryCatalog": "Harvard Dataverse",
				"publisher": "Harvard Dataverse",
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
		"items": [
			{
				"itemType": "document",
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
				"abstractNote": "The center-periphery hypothesis (CPH) postulates that populations close to the center of a species’ distribution will exhibit higher genetic diversity and lower genetic differentiation than populations located at the edge of the distribution. The center of a species distribution might represent an optimum for the environmental factors influencing the species absolute fitness and therefore, genetic diversity. In species with wide distribution, the geographical variation of biotic and abiotic variables is crucial to understand the underlying mechanisms of the CPH. We evaluated the CPH and specifically tested which environmental variables better explained the patterns of genetic diversity in the kissing-bug Mepraia spinolai, one of the main wild vectors of Chagas disease in southern South America, distributing across three Mediterranean climatic ecoregions in Chile. We analyzed 2380 neutral Single Nucleotide Polymorphisms (SNP) to estimate genetic diversity. The mean winter temperature, the mean summer temperature, vegetation cover, population abundance, proportion of winged individuals and female abdomen area were measured for each kissing bug population to construct a model. Lower genetic diversity was detected in populations at the edge of the distribution compared to those in the center. However, genetic differentiation was not higher in the periphery. Genetic diversity was related to climatic and biological variables; there was a positive relationship with mean winter temperature and a negative association with mean summer temperature and body size. These results partially support the CPH and identify biotic (abdomen area) and abiotic (winter/summer temperatures) factors that would affect genetic diversity in this restricted-dispersal species of epidemiological relevance.",
				"extra": "Type: dataset\nDOI: 10.34691/FK2/UMWJDU",
				"language": "en",
				"libraryCatalog": "Universidad de Chile",
				"publisher": "Universidad de Chile",
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
				"itemType": "document",
				"title": "World Value Surveys 1981",
				"creators": [
					{
						"firstName": "Ronald",
						"lastName": "Inglehart",
						"creatorType": "author"
					}
				],
				"date": "2021-07-30",
				"abstractNote": "The series is designed to enable a crossnational comparison of values and norms on a wide variety of topics and to monitor changes in values and at...",
				"extra": "Type: dataset\nDOI: 10.34934/DVN/HEABHJ",
				"language": "en",
				"libraryCatalog": "Social Sciences and Digital Humanities Archive – SODHA",
				"publisher": "Social Sciences and Digital Humanities Archive – SODHA",
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
				"itemType": "document",
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
				"abstractNote": "The expansion and intensifcation of agriculture as well as the associated land clearing are threatening both biodiversity and human wellbeing in tr...",
				"extra": "Type: dataset\nDOI: 10.34725/DVN/NGGXCZ",
				"language": "en",
				"libraryCatalog": "World Agroforestry - Research Data Repository",
				"publisher": "World Agroforestry - Research Data Repository",
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
	}
]
/** END TEST CASES **/
