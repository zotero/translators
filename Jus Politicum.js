{
	"translatorID": "aeb7f19b-0907-4117-bef4-08e36af4d31f",
	"label": "Jus Politicum",
	"creator": "Alexandre Mimms",
	"target": "https?://(www\\.)?juspoliticum\\.com",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-04-23 10:45:20"
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
	if (url.includes('/article/')) {
		return 'journalArticle';
	}
	else if (url.includes('/searches') && getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('#search-section h2 a');
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
	const abstract = ZU.trimInternal(text(doc, "#content"));
	const titre = ZU.trimInternal(text(doc, "h2"));
	const numero = text(doc, ".release-title .num").replace("N°", "");
	const linkURL = doc.querySelectorAll(".documentsAssocies a")[0].href;
	const auteurs = text(doc, ".article-author").split(", ");

	let newItem = new Zotero.Item("journalArticle");

	for (let auteur of auteurs) {
		newItem.creators.push(ZU.cleanAuthor(auteur, "author"));
	}

	newItem.title = titre;
	newItem.issue = numero;
	newItem.abstractNote = abstract;
	newItem.url = url;

	newItem.attachments = [{
		url: linkURL,
		title: "Full text PDF",
		mimeType: "application/pdf",
	}];

	newItem.complete();
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://juspoliticum.com/searches?expression=constitution&release=&author=&theme=",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://juspoliticum.com/article/Situation-presente-du-constitutionnalisme-Quelques-reflexions-sur-l-idee-de-democratie-par-le-droit-25.html",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Situation présente du constitutionnalisme. Quelques réflexions sur l’idée de démocratie par le droit",
				"creators": [
					{
						"firstName": "Jean-Marie",
						"lastName": "Denquin",
						"creatorType": "author",
						"fieldMode": true
					}
				],
				"abstractNote": "Le constitutionnalisme est aujourd’hui identifié, à tort ou à raison, à l’idée d’une « démocratie par le droit », laquelle recouvre souvent un projet d’accomplissement des droits fondamentaux par des moyens juridiques. L’article analyse le déplacement que cela implique du point de vue du sens du mot « démocratie », mais aussi l’effet de survalorisation du droit qui en résulte. Ce phénomène de sacralisation du droit explique aussi comment on en est venu à confondre constitutionnalisme et droit constitutionnel. Plusieurs idées centrales du premier sont devenues, dans le second, des techniques dont on présume le caractère non problématique et la neutralité. Cela est démontré par une étude de l’évolution récente des notions de séparation des pouvoirs et de hiérarchie des normes, notamment dans la jurisprudence du Conseil constitutionnel. The present Situation of Constitutionalism. Some Thoughts about the Idea of Democracy by LawConstitutionalism is, more often than not, equated with a notion of “achieving democracy through the law”. This entails the notion that, in a democracy, the law is expected to ensure the development of fundamental rights. The purpose of the article is to analyse the shift thus involved in the concept of democracy, as well as the high expectations law has to meet in order to achieve these goals. It is suggested that this involves a collapse of “constitutionalism” into “constitutional law”. Several important aspects of constitutionalism, such as the separation of powers or the existence of a hierarchy of norms, are transformed into technical words of art which courts use as if they were neutral and uncontroversial. Die aktuelle Lage des Konstitutionalismus’. Ansichten über die Frage der Demokratie durch RechtDer Konstitutionalismus (Verfassungsstaat) ist heute oft mit der Idee einer „Demokratie durch Recht“ identifiziert. In diesem Sinne wird meistens Demokratie als Verwirklichung der Grundrechte durch juristische Mitteln angesehen. Dadurch erfährt der Begriff Demokratie eine Verschiebung. Zudem erfährt der Begriff des Rechts eine Aufwertung ja sogar eine Überbewertung, die zu einer Verwechslung von Konstitutionalismus und Verfassungsrecht führt. Mehrere zentrale Elemente des Konstitutionalismus sind im Verfassungsrecht zu blossen Techniken geworden, die man als unproblematisch und neutral postuliert. Dies wird im vorliegenden Aufsatz am Beispiel der neuesten Entwicklungen der Gewaltenteilung und der Normenhierarchie verdeutlicht.",
				"issue": "1",
				"libraryCatalog": "Jus Politicum",
				"url": "https://juspoliticum.com/article/Situation-presente-du-constitutionnalisme-Quelques-reflexions-sur-l-idee-de-democratie-par-le-droit-25.html",
				"attachments": [
					{
						"title": "Full text PDF",
						"mimeType": "application/pdf"
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
