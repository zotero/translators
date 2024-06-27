{
	"translatorID": "2ea86ad9-71ca-410c-9126-9d7d98722acf",
	"label": "Dalloz Bibliothèque",
	"creator": "Alexandre Mimms",
	"target": "https?://(www\\.)?bibliotheque\\.lefebvre-dalloz\\.fr",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-04-23 10:41:20"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2024 Alexandre Mimms

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
	if (url.includes('/ouvrage/')) {
		return 'book';
	}
	else if (url.includes('/recherche') && getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.result-list-grid-item');

	for (let row of rows) {
		let href = row.querySelectorAll("a")[0].href;
		let title = ZU.trimInternal(row.querySelectorAll(".detail-title")[0].innerText);
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
	let edition, date, marque, collection, isbn, auteurs;
	const editions = doc.querySelectorAll(".editions-box");
	for (let ed of editions) {
		if (ed.querySelectorAll("a")[0].href == url) {
			edition = text(ed, ".editions-edition");
			date = text(ed, ".editions-date");
		 }
	}

	const infoGen = doc.querySelectorAll(".notice-header-grid-item");
	for (let infoBox of infoGen) {

		const value = ZU.trimInternal(infoBox.innerText);

		if (infoBox.querySelector(".auteurs")) { 
			auteurs = ZU.trimInternal(infoBox.querySelector(".auteurs").innerText).split(" • ");
			Z.debug(auteurs);
			}

		if (value.startsWith("Collection")) { collection = value.split(" : ")[1]; }
		else if (value.startsWith("Marque")) { marque = value.split(" : ")[1]; }
		else if (value.startsWith("ISBN")) { isbn = value.split(" : ")[1]; }
	}

	const titre = ZU.trimInternal(text(doc, ".title"));
	const abstract = ZU.trimInternal(text(doc, ".description")).replace("Description", "");

	let newItem = new Z.Item("book");

	for (let auteur of auteurs) {
		newItem.creators.push(ZU.cleanAuthor(auteur, "author"));
	}

	newItem.title = titre;
	newItem.date = date;
	newItem.abstractNote = abstract;
	newItem.ISBN = ZU.cleanISBN(isbn);
	newItem.edition = edition;
	newItem.publisher = marque;
	newItem.language = "fr";
	newItem.series = collection;

	newItem.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://bibliotheque.lefebvre-dalloz.fr/recherche?query=livre",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://bibliotheque.lefebvre-dalloz.fr/ouvrage/grands-arrets/grands-arrets-jurisprudence-civile-t1_9782247154579",
		"items": [
			{
				"itemType": "book",
				"title": "Les grands arrêts de la jurisprudence civile T1",
				"creators": [
					{
						"firstName": "Henri",
						"lastName": "Capitant",
						"creatorType": "author"
					},
					{
						"firstName": "Yves",
						"lastName": "Lequette",
						"creatorType": "author"
					},
					{
						"firstName": "François",
						"lastName": "Terré",
						"creatorType": "author"
					}
				],
				"date": "Avril 2015",
				"ISBN": "9782247154579",
				"abstractNote": "La 13e édition des Grands arrêts de la jurisprudence civile coïncide avec le quatre-vingtième anniversaire de leur parution sous la signature de Henri Capitant. C'est dire que cet ouvrage est le précurseur de tous les recueils de Grands arrêts actuellement existants. Jamais démenti, son succès vient de ce qu'il offre un accès direct aux grandes décisions qui ont permis au Code civil de s'adapter à la réalité sociale contemporaine.L'ouvrage est scindé en deux tomes.Le premier volume réunit la totalité des matières étudiées, d'une université à l'autre, en licence 1 : Introduction, mais aussi droit des personnes, droit de la famille et droit des biens.S'y ajoutent le droit des régimes matrimoniaux et celui des successions et des libéralités qui, situés au confluent du droit de la famille et du droit du patrimoine, sont le prolongement naturel des disciplines précédentes.Le second volume rassemble la théorie générale des obligations (acte juridique, responsabilité, quasi-contrats, régime général) ainsi que les disciplines qui évoluent dans son orbite : contrats spéciaux, sûretés. Il correspond aux matières généralement enseignées en licence 2 et en licence 3.À l'occasion de cette 13e édition, les auteurs ont procédé à une importante mise à jour : nombre de commentaires ont été partiellement ou totalement réécrits pour prendre en compte les évolutions survenues depuis la précédente édition, il y a huit ans.",
				"edition": "13e édition",
				"language": "fr",
				"libraryCatalog": "Dalloz Bibliothèque",
				"publisher": "DALLOZ",
				"series": "Grands arrêts",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
