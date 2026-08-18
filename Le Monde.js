{
	"translatorID": "6bc635a4-6823-4f95-acaf-b43e8a158144",
	"label": "Le Monde",
	"creator": "Philipp Zumstein",
	"target": "^https?://(www\\.)?(abonnes\\.)?lemonde\\.fr/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-11-06 22:47:06"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2015 Philipp Zumstein

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
	if (url.includes('/article/')) {
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
	var rows = doc.querySelectorAll('a.teaser__link[href*="/article/"]');
	for (var i = 0; i < rows.length; i++) {
		var href = rows[i].href;
		var title = ZU.trimInternal(rows[i].textContent);
		if (!href || !title) continue;
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
			await scrape(await requestDocument(url));
		}
	}
	else {
		await scrape(doc, url);
	}
}

function scrape(doc, _) {
	let jsonLD = text(doc, 'script[type="application/ld+json"]');
	let schema = JSON.parse(jsonLD);

	let item = new Zotero.Item("newspaperArticle");
	item.title = schema.headline;
	item.date = ZU.strToISO(schema.dateModified || schema.datePublished);
	item.url = schema.mainEntityOfPage["@id"];
	item.section = schema.articleSection;
	item.publicationTitle = schema.publisher.name;
	item.abstractNote = schema.description;
	item.ISSN = "1950-6244";
	item.language = "fr";

	for (let author of (schema.author || [])) {
		if (author["@type"] !== "Person") continue;
		item.creators.push(ZU.cleanAuthor(author.name, 'author'));
	}

	item.attachments.push({
		title: "Snapshot",
		document: doc
	});

	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.lemonde.fr/elections-departementales-2015/article/2015/03/13/apres-grenoble-les-ecologistes-visent-l-isere_4592922_4572524.html",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Après Grenoble, les écologistes visent l’Isère",
				"creators": [
					{
						"firstName": "Olivier",
						"lastName": "Faye",
						"creatorType": "author"
					}
				],
				"date": "2019-08-19",
				"ISSN": "1950-6244",
				"abstractNote": "Victorieuse dans la préfecture aux municipales de 2014, l’alliance Verts-Parti de gauche menace la majorité socialiste dans les cantons.",
				"language": "fr",
				"libraryCatalog": "Le Monde",
				"publicationTitle": "Le Monde",
				"section": "Elections départementales 2015",
				"url": "https://www.lemonde.fr/elections-departementales-2015/article/2015/03/13/apres-grenoble-les-ecologistes-visent-l-isere_4592922_4572524.html",
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
	},
	{
		"type": "web",
		"url": "http://www.lemonde.fr/politique/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.lemonde.fr/idees/article/2015/03/13/syrie-un-desastre-sans-precedent_4593097_3232.html",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Syrie : un désastre sans précédent",
				"creators": [],
				"date": "2019-08-19",
				"ISSN": "1950-6244",
				"abstractNote": "Après quatre ans de conflit et plus de 220 000 morts, le pays s’enfonce toujours plus dans une guerre aux fronts multiples à laquelle les puissances occidentales ne trouvent pas de réponse",
				"language": "fr",
				"libraryCatalog": "Le Monde",
				"publicationTitle": "Le Monde",
				"section": "Débats",
				"shortTitle": "Syrie",
				"url": "https://www.lemonde.fr/idees/article/2015/03/13/syrie-un-desastre-sans-precedent_4593097_3232.html",
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
	},
	{
		"type": "web",
		"url": "https://www.lemonde.fr/campus/article/2015/03/13/classement-international-les-universites-francaises-en-manque-de-prestige_4593287_4401467.html",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Les universités françaises peinent à soigner leur réputation internationale",
				"creators": [
					{
						"firstName": "Matteo",
						"lastName": "Maillard",
						"creatorType": "author"
					}
				],
				"date": "2015-03-13",
				"ISSN": "1950-6244",
				"abstractNote": "Selon le dernier classement du magazine « Times Higher Education », les universités françaises peinent à obtenir la reconnaissance internationale de leurs pairs.",
				"language": "fr",
				"libraryCatalog": "Le Monde",
				"publicationTitle": "Le Monde",
				"section": "M Campus",
				"url": "https://www.lemonde.fr/campus/article/2015/03/13/classement-international-les-universites-francaises-en-manque-de-prestige_4593287_4401467.html",
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
	},
	{
		"type": "web",
		"url": "https://www.lemonde.fr/culture/article/2013/09/28/arturo-brachetti-dans-son-repaire-a-turin_3486315_3246.html#meter_toaster",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Dans le repaire turinois d'Arturo Brachetti",
				"creators": [
					{
						"firstName": "Sandrine",
						"lastName": "Blanchard",
						"creatorType": "author"
					}
				],
				"date": "2013-09-29",
				"ISSN": "1950-6244",
				"abstractNote": "Visiter la maison de l'artiste, en spectacle à Paris à partir du 3 octobre, c'est entrer dans un monde empli de magie.",
				"language": "fr",
				"libraryCatalog": "Le Monde",
				"publicationTitle": "Le Monde",
				"section": "Culture",
				"url": "https://www.lemonde.fr/culture/article/2013/09/28/arturo-brachetti-dans-son-repaire-a-turin_3486315_3246.html",
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
