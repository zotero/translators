{
	"translatorID": "825f208c-eb96-4372-9d21-b879c3a910bb",
	"label": "FNAC",
	"creator": "César Lizurey",
	"target": "^https?://(www\\.)?fnac\\.com",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-10-21 19:30:59"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2024 César Lizurey

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
	// Check if the URL matches the desired format
	var match = url.match(/^https:\/\/www\.fnac\.com\/a(\d+)\/([\w-]+)$/);

	if (match) {
		Z.debug("URL OK");

		// Get the second <a> element in the breadcrumb to check the itemType
		var secondLink = doc.querySelector('nav.f-breadcrumb > ul.f-breadcrumb__list > li:nth-of-type(2)');
		if (secondLink) {
			Z.debug("Breadcrumb OK");
			switch (secondLink.textContent.trim()) {
				case 'Livre': {
					return 'book';
				}
				case 'Musique': {
					return 'audioRecording';
				}
				case 'DVD & Vidéo': {
					return 'videoRecording';
				}
				case 'Jeux vidéo': {
					return 'computerProgram';
				}
				default: {
					Z.debug("Unknown category '" + secondLink.textContent.trim() + "' will be ignored by Zotero");
					Z.debug("Items in this category will be ignored by Zotero: " + secondLink.textContent.trim());
					return false;
				}
			}
		}

		Z.debug("Breadcrumb KO");
		return false;
	}
	
	Z.debug("URL KO");
	return false;
}

function doWeb(doc, url) {
	Z.debug("Scraping from Page");
	var item = new Zotero.Item(detectWeb(doc, url) || "book");
	item.URL = url;
	item.title = doc.querySelector('h1.f-productHeader-Title').textContent.trim();

	var characteristicsSection = doc.querySelector('section#Characteristics');
	if (characteristicsSection) {
		var characteristics = characteristicsSection.querySelectorAll('dt.f-productProperties__term');

		// Loop through all the characteristics
		for (var i = 0; i < characteristics.length; i++) {
			var characteristic = characteristics[i];
			var value = characteristic.nextElementSibling;
			const category = characteristic.textContent.trim();

			Z.debug(`${category}: ${value.textContent.trim()}`);

			switch (category) {
				case 'Auteur': {
					// Extract the authors
					var creators = [];
					var authorElements = value.querySelectorAll('a');
					for (var j = 0; j < authorElements.length; j++) {
						creators.push({
							firstName: authorElements[j].textContent.trim(),
							lastName: "",
							creatorType: "author"
						});
					}
					item.creators = creators;
					break;
				}
				case 'Date de parution': {
					// Extract the date
					let dateParution = value.textContent.trim();
					// Define an object that maps French month names to month numbers
					var monthNames = {
						janvier: '01',
						février: '02',
						mars: '03',
						avril: '04',
						mai: '05',
						juin: '06',
						juillet: '07',
						août: '08',
						septembre: '09',
						octobre: '10',
						novembre: '11',
						décembre: '12'
					};
					// Loop through the keys in the monthNames object
					for (var monthName in monthNames) {
						// Replace any occurrence of the key with the value
						dateParution = dateParution.replace(new RegExp(monthName, 'g'), `${monthNames[monthName]}/`);
					}
					// Convert the date
					item.date = dateParution.split('/').reverse().join('-');
					break;
				}
				case 'Editeur': {
					// Extract the publisher, company of publisher depending on the itemType
					if (item.itemType === 'audioRecording') {
						item.label = value.textContent.trim();
					}
					else if (item.itemType === 'computerProgram') {
						item.company = value.textContent.trim();
					}
					else {
						item.publisher = value.textContent.trim();
					}
					break;
				}
				case 'ISBN': {
					// Extract the ISBN
					item.ISBN = value.textContent.trim();
					break;
				}
				case 'EAN': {
					// Extract the EAN as ISBN if ISBN is empty
					item.ISBN = item.ISBN || value.textContent.trim();
					break;
				}
				case 'Nombre de pages': {
					// Extract the number of pages
					item.numPages = +value.textContent.trim();
					break;
				}
				case 'Compositeur': {
					// Extract the composer
					item.composer = value.textContent.trim();
					break;
				}
			}
		}

		item.attachments = [
			{
				title: "Fnac.com Link",
				snapshot: false,
				mimeType: "text/html"
			}
		];
	}

	Z.debug("===== ITEM =====");
	Z.debug(item);
	Z.debug("===== END ITEM =====");
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.fnac.com/a20666672/Anne-Dauphine-Julliand-Ajouter-de-la-vie-aux-jours",
		"items": [
			{
				"itemType": "book",
				"title": "Ajouter de la vie aux jours",
				"URL": "https://www.fnac.com/a20666672/Anne-Dauphine-Julliand-Ajouter-de-la-vie-aux-jours",
				"creators": [
					{
						"firstName": "Anne-Dauphine Julliand",
						"lastName": "",
						"creatorType": "author"
					}
				],
				"date": "2024-10-10",
				"ISBN": "1037510917",
				"libraryCatalog": "FNAC",
				"numPages": 137,
				"publisher": "Les Arenes Eds",
				"attachments": [
					{
						"title": "Fnac.com Link",
						"snapshot": false,
						"mimeType": "text/html"
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
		"url": "https://www.fnac.com/a20601305/Auteur-A-Venir-Titre-a-venir",
		"items": [
			{
				"itemType": "book",
				"title": "Le Cours de Monsieur Paty",
				"URL": "https://www.fnac.com/a20601305/Auteur-A-Venir-Titre-a-venir",
				"creators": [
					{
						"firstName": "Mickaëlle Paty",
						"lastName": "",
						"creatorType": "author"
					},
					{
						"firstName": "Emilie Frèche",
						"lastName": "",
						"creatorType": "author"
					}
				],
				"date": "2024-10-16",
				"ISBN": "2226494855",
				"collection-title": "Temoignages",
				"libraryCatalog": "FNAC",
				"numPages": 208,
				"publisher": "Albin Michel",
				"attachments": [
					{
						"title": "Fnac.com Link",
						"snapshot": false,
						"mimeType": "text/html"
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
		"url": "https://www.fnac.com/a20617198/Jerome-Rebotier-Le-Comte-de-Monte-Cristo-Vinyle-album",
		"items": [
			{
				"itemType": "audioRecording",
				"title": "Le Comte de Monte Cristo",
				"URL": "https://www.fnac.com/a20617198/Jerome-Rebotier-Le-Comte-de-Monte-Cristo-Vinyle-album",
				"composer": "Jérôme Rebotier",
				"date": "2024-07",
				"ISBN": "0198028227711",
				"libraryCatalog": "FNAC",
				"label": "Masterworks",
				"attachments": [
					{
						"title": "Fnac.com Link",
						"snapshot": false,
						"mimeType": "text/html"
					}
				],
				"creators": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.fnac.com/a20917236/Horizon-Zero-Dawn-Remastered-PS5-Jeu-video-Playstation-5",
		"items": [
			{
				"itemType": "computerProgram",
				"title": "Horizon Zero Dawn Remastered PS5",
				"URL": "https://www.fnac.com/a20917236/Horizon-Zero-Dawn-Remastered-PS5-Jeu-video-Playstation-5",
				"ISBN": "0711719592785",
				"libraryCatalog": "FNAC",
				"company": "Sony",
				"attachments": [
					{
						"title": "Fnac.com Link",
						"snapshot": false,
						"mimeType": "text/html"
					}
				],
				"creators": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
