{
	"translatorID": "eef50507-c756-4081-86fd-700ae4ebf22e",
	"label": "Der Spiegel",
	"creator": "Martin Meyerhoff and Abe Jellinek",
	"target": "^https?://www\\.spiegel\\.de/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-07-05 17:55:21"
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
	if (doc.querySelector('script[type="application/ld+json"]') &&
		JSON.parse(text(doc, 'script[type="application/ld+json"]'))[0]['@type'] == 'NewsArticle') {
		return "newspaperArticle";
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('[data-search-results] article h2 > a, [data-area="article-teaser-list"] article h2 > a');
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
	let json = JSON.parse(text(doc, 'script[type="application/ld+json"]'))[0];
	
	var translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);

	translator.setHandler('itemDone', function (obj, item) {
		if (!Array.isArray(json.author)) {
			json.author = [json.author];
		}
		item.creators = [];
		item.creators.push(...cleanAuthorObjects(json.author));

		item.url = json.url;
		item.section = json.articleSection;
		item.date = ZU.strToISO(json.dateModified || json.dateCreated);
		item.ISSN = '2195-1349';
		item.publicationTitle = 'Der Spiegel';

		item.tags = [];
		item.tags.push(...attr(doc, 'meta[name="news_keywords"]', 'content')
			.split(', ').map(tag => ({ tag })));

		item.complete();
	});

	translator.getTranslatorObject(function (trans) {
		trans.itemType = "newspaperArticle";
		trans.doWeb(doc, url);
	});
}

function cleanAuthorObjects(authors) {
	let creators = [];
	for (let author of authors) {
		if (author['@type'] == 'Organization') continue;
		creators.push(ZU.cleanAuthor(author.name, 'author'));
	}
	return creators;
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.spiegel.de/politik/deutschland/cdu-parteitag-partei-im-koma-a-797954.html",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "CDU-Parteitag: Partei im Koma",
				"creators": [
					{
						"firstName": "Peter",
						"lastName": "Müller",
						"creatorType": "author"
					}
				],
				"date": "2011-11-15",
				"ISSN": "2195-1349",
				"abstractNote": "Die CDU feiert sich in Leipzig selbst, doch in Wahrheit befindet sie sich in einem traurigen Zustand: Die Partei ist in ein kollektives Koma gefallen, politische Debatten finden kaum noch statt. Hauptverantwortlich dafür ist Angela Merkel.",
				"language": "de",
				"libraryCatalog": "www.spiegel.de",
				"publicationTitle": "Der Spiegel",
				"section": "Politik",
				"shortTitle": "CDU-Parteitag",
				"url": "https://www.spiegel.de/politik/deutschland/cdu-parteitag-partei-im-koma-a-797954.html",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Angela Merkel"
					},
					{
						"tag": "Betreuungsgeld"
					},
					{
						"tag": "CDU"
					},
					{
						"tag": "Deutschland"
					},
					{
						"tag": "Eurokrise"
					},
					{
						"tag": "Merkels schwarz-gelbe Regierung 2009-2013"
					},
					{
						"tag": "Mindestlohn"
					},
					{
						"tag": "Politik"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.spiegel.de/politik/veb-energiewende-a-335a79ef-0002-0001-0000-000084789653?context=issue",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "VEB Energiewende",
				"creators": [
					{
						"firstName": "Alexander",
						"lastName": "Neubacher",
						"creatorType": "author"
					},
					{
						"firstName": "Conny",
						"lastName": "Neumann",
						"creatorType": "author"
					},
					{
						"firstName": "Steffen",
						"lastName": "Winter",
						"creatorType": "author"
					}
				],
				"date": "2012-04-06",
				"ISSN": "2195-1349",
				"abstractNote": "Der Atomausstieg wird zur Subventionsmaschine für Industriebosse, Elektrokonzerne und findige Geschäftemacher. Die Kosten und Risiken sollen andere tragen - die Bürger.",
				"language": "de",
				"libraryCatalog": "www.spiegel.de",
				"publicationTitle": "Der Spiegel",
				"section": "Politik",
				"url": "https://www.spiegel.de/politik/veb-energiewende-a-335a79ef-0002-0001-0000-000084789653",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Bosch"
					},
					{
						"tag": "Politik"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.spiegel.de/thema/atomkraftwerke/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.spiegel.de/international/europe/madame-non-and-monsieur-duracell-german-french-relations-on-the-rocks-a-700530.html",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Madame Non and Monsieur Duracell: German-French Relations On the Rocks",
				"creators": [],
				"date": "2010-06-14",
				"ISSN": "2195-1349",
				"abstractNote": "For decades, the German-French relationship has been the most important one in the European Union. These days, however, Chancellor Angela Merkel and President Nicolas Sarkozy can hardly stand each other. Why can't they just get along?",
				"language": "en",
				"libraryCatalog": "www.spiegel.de",
				"publicationTitle": "Der Spiegel",
				"section": "International",
				"shortTitle": "Madame Non and Monsieur Duracell",
				"url": "https://www.spiegel.de/international/europe/madame-non-and-monsieur-duracell-german-french-relations-on-the-rocks-a-700530.html",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Europe"
					},
					{
						"tag": "German-French Relations"
					},
					{
						"tag": "International"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.spiegel.de/geschichte/kinder-vom-kamper-see-grab-unter-wasser-a-1021273.html",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Kinder vom Kamper See: Grab unter Wasser",
				"creators": [
					{
						"firstName": "Matthias",
						"lastName": "Kneip",
						"creatorType": "author"
					}
				],
				"date": "2015-03-03",
				"ISSN": "2195-1349",
				"abstractNote": "Am 5. März 1945 stürzte ein Flugzeug in den Kamper See. An Bord: fast 80 deutsche Kinder auf der Flucht vor der Roten Armee. Eine Initiative will nun ihre Leichen vom Grund des Sees bergen.",
				"language": "de",
				"libraryCatalog": "www.spiegel.de",
				"publicationTitle": "Der Spiegel",
				"section": "Geschichte",
				"shortTitle": "Kinder vom Kamper See",
				"url": "https://www.spiegel.de/geschichte/kinder-vom-kamper-see-grab-unter-wasser-a-1021273.html",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Flucht und Vertreibung"
					},
					{
						"tag": "Flugzeugunglücke"
					},
					{
						"tag": "Geschichte"
					},
					{
						"tag": "Weltkriege"
					},
					{
						"tag": "Zweiter Weltkrieg"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.spiegel.de/kultur/musik/rolling-stones-mit-living-in-a-ghost-town-nummer-1-der-deutschen-charts-a-e0c06156-106c-4fc2-a0a7-8b5b794b7fe2",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Rolling Stones Nummer eins der deutschen Singlecharts - erstmals seit 1968",
				"creators": [],
				"date": "2020-07-03",
				"ISSN": "2195-1349",
				"abstractNote": "Sie sind die ältesten Künstler, die es jemals an die Spitze der deutschen Singlecharts geschafft haben: Mit \"Living In A Ghost Town\" sind die Rolling Stones nach 52 Jahren wieder die Nummer eins.",
				"language": "de",
				"libraryCatalog": "www.spiegel.de",
				"publicationTitle": "Der Spiegel",
				"section": "Kultur",
				"url": "https://www.spiegel.de/kultur/musik/rolling-stones-mit-living-in-a-ghost-town-nummer-1-der-deutschen-charts-a-e0c06156-106c-4fc2-a0a7-8b5b794b7fe2",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Kultur"
					},
					{
						"tag": "Musik"
					},
					{
						"tag": "The Rolling Stones"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.spiegel.de/politik/deutschland/hans-georg-maassen-armin-laschets-riskante-abstandsregel-a-45f6b77f-f2d7-4c68-8210-2ec1571068be",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Hans-Georg Maaßen: Laschets riskante Abstandsregel",
				"creators": [
					{
						"firstName": "Veit",
						"lastName": "Medick",
						"creatorType": "author"
					}
				],
				"date": "2021-07-05",
				"ISSN": "2195-1349",
				"abstractNote": "Die Causa Maaßen liegt wie ein Fluch auf dem Wahlkampf des Unionskanzlerkandidaten. Wie viel Kritik ist nötig, wie viel womöglich schädlich? Armin Laschet wird dabei auch an seine Vorgängerin denken – und an die SPD.",
				"language": "de",
				"libraryCatalog": "www.spiegel.de",
				"publicationTitle": "Der Spiegel",
				"section": "Politik",
				"shortTitle": "Hans-Georg Maaßen",
				"url": "https://www.spiegel.de/politik/deutschland/hans-georg-maassen-armin-laschets-riskante-abstandsregel-a-45f6b77f-f2d7-4c68-8210-2ec1571068be",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Armin Laschet"
					},
					{
						"tag": "Bundestagswahl 2021"
					},
					{
						"tag": "CDU"
					},
					{
						"tag": "Deutschland"
					},
					{
						"tag": "Hans-Georg Maaßen"
					},
					{
						"tag": "Politik"
					},
					{
						"tag": "SPD"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.spiegel.de/karriere/meeting-beim-chef-zu-hause-wie-verhalte-ich-mich-richtig-tipps-von-den-karrierecoaches-a-a73e665e-a74e-46b7-8e6e-ae053d8b6f83",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Meeting beim Chef zu Hause: Wie verhalte ich mich richtig? - Tipps von den Karrierecoaches",
				"creators": [
					{
						"firstName": "Dorothea",
						"lastName": "Assig",
						"creatorType": "author"
					},
					{
						"firstName": "Dorothee",
						"lastName": "Echter",
						"creatorType": "author"
					}
				],
				"date": "2021-07-05",
				"ISSN": "2195-1349",
				"abstractNote": "Die Chefin hat das Meeting mit dem Führungsteam auf ihre eigene Terrasse verlegt. Rebecca ist zum ersten Mal dabei und fragt sich: Welche Stolpersteine lauern hier? Und sollte ich ein Gastgeschenk mitbringen?",
				"language": "de",
				"libraryCatalog": "www.spiegel.de",
				"publicationTitle": "Der Spiegel",
				"section": "Job & Karriere",
				"shortTitle": "Meeting beim Chef zu Hause",
				"url": "https://www.spiegel.de/karriere/meeting-beim-chef-zu-hause-wie-verhalte-ich-mich-richtig-tipps-von-den-karrierecoaches-a-a73e665e-a74e-46b7-8e6e-ae053d8b6f83",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Büroalltag"
					},
					{
						"tag": "Frauen und Karriere"
					},
					{
						"tag": "Job & Karriere"
					},
					{
						"tag": "Manager"
					},
					{
						"tag": "Tipps vom Karrierecoach"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
