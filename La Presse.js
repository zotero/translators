{
	"translatorID": "dbfcaa3e-082a-45a4-9619-9892f49399c1",
	"label": "La Presse",
	"creator": "Sebastian Karcher and Abe Jellinek",
	"target": "^https?://(www|recherche)\\.lapresse\\.ca/",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-08-27 05:05:03"
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
	if (doc.querySelector('header h1.headlines')) {
		return "newspaperArticle";
	}
	// search is Google in an iframe
	return false;
}

function doWeb(doc, url) {
	scrape(doc, url);
}

function scrape(doc, url) {
	var translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	
	translator.setHandler('itemDone', function (obj, item) {
		// La Presse doesn't add a space before a colon in titles
		item.title = item.title.replace(' | ', ': ');
		item.language = 'fr-CA';
		
		if (!item.abstractNote) {
			item.abstractNote = text(doc, '[itemprop="articleBody"] .lead');
		}
		
		if (!item.creators.length) {
			for (let author of doc.querySelectorAll('.author .name')) {
				item.creators.push(ZU.cleanAuthor(author.textContent, 'author'));
			}
		}
		
		item.complete();
	});

	translator.getTranslatorObject(function (trans) {
		trans.itemType = "newspaperArticle";
		trans.doWeb(doc, url);
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.lapresse.ca/international/dossiers/seisme-en-haiti/201204/25/01-4518986-haiti-sean-penn-recoit-un-prix-pour-son-engagement.php",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Haïti: Sean Penn reçoit un prix pour son engagement",
				"creators": [],
				"date": "2012-04-25T21:10:00-04:00",
				"abstractNote": "L'acteur américain Sean Penn a reçu mercredi un prix récompensant son engagement humanitaire en faveur d'Haïti, à l'occasion du Sommet mondial des Lauréats du Prix Nobel de la Paix qui se tient à Chicago.",
				"language": "fr-CA",
				"libraryCatalog": "www.lapresse.ca",
				"publicationTitle": "La Presse",
				"section": "International",
				"shortTitle": "Haïti",
				"url": "https://www.lapresse.ca/international/dossiers/seisme-en-haiti/201204/25/01-4518986-haiti-sean-penn-recoit-un-prix-pour-son-engagement.php",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Séisme Haïti catastrophe bilan"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.lapresse.ca/arts/musique/critiques-cd/201204/27/01-4519537-norah-jones-la-belle-et-la-souris-.php",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Norah Jones: la belle et la souris ****",
				"creators": [
					{
						"firstName": "Alain de",
						"lastName": "Repentigny",
						"creatorType": "author"
					}
				],
				"date": "2012-04-28T06:05:00-04:00",
				"abstractNote": "Ce nouvel album de Norah Jones, pertinemment intitulé ... Little Broken Hearts, étonnera même ceux qui croyaient tout savoir de la célèbre fille de Ravi Shankar.",
				"language": "fr-CA",
				"libraryCatalog": "www.lapresse.ca",
				"publicationTitle": "La Presse",
				"section": "Musique",
				"shortTitle": "Norah Jones",
				"url": "https://www.lapresse.ca/arts/musique/critiques-cd/201204/27/01-4519537-norah-jones-la-belle-et-la-souris-.php",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "CD"
					},
					{
						"tag": "Critiques"
					},
					{
						"tag": "album"
					},
					{
						"tag": "chansons"
					},
					{
						"tag": "compilation"
					},
					{
						"tag": "disque"
					},
					{
						"tag": "groupe"
					},
					{
						"tag": "lancement"
					},
					{
						"tag": "musique"
					},
					{
						"tag": "nouveautés"
					},
					{
						"tag": "studio"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.lapresse.ca/covid-19/2021-08-27/passeport-vaccinal/les-codes-qr-de-plusieurs-elus-compromis.php",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Passeport vaccinal: Les codes QR de plusieurs élus compromis",
				"creators": [
					{
						"firstName": "Tristan",
						"lastName": "Péloquin",
						"creatorType": "author"
					}
				],
				"date": "2021-08-27T00:15:00-04:00",
				"abstractNote": "Un pirate informatique non identifié proche de la communauté du Hackfest a réussi jeudi à obtenir de façon illicite les codes QR contenant les informations vaccinales de plusieurs élus de l’Assemblée nationale, dont celles du ministre responsable de la Protection des renseignements personnels, Éric Caire.",
				"language": "fr-CA",
				"libraryCatalog": "www.lapresse.ca",
				"publicationTitle": "La Presse",
				"section": "COVID-19",
				"shortTitle": "Passeport vaccinal",
				"url": "https://www.lapresse.ca/covid-19/2021-08-27/passeport-vaccinal/les-codes-qr-de-plusieurs-elus-compromis.php",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
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
