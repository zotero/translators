{
	"translatorID": "43a53465-0354-42fd-aba9-dc1af8be7061",
	"label": "Isidore",
	"creator": "Abe Jellinek",
	"target": "^https?://(www\\.)?isidore\\.science/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-06-29 03:29:14"
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
	if (doc.querySelector('meta[name="citation_title"]')
		&& doc.querySelector('meta[property="dc:type"]')) {
		return attr(doc, 'meta[property="dc:type"]', 'content', 0);
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.list-result a.font-bold');
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
		if (item.abstractNote.startsWith('ISIDORE is')) {
			delete item.abstractNote;
		}
		
		item.url = attr(
			doc,
			'a[title*="Access the document"], a[data-original-title*="Access the document"]',
			'href'
		);
		item.attachments = [];
		item.tags = [];
		delete item.websiteType;
		
		item.complete();
	});

	translator.getTranslatorObject(function (trans) {
		trans.addCustomFields({
			'DC.relation.ispartof': 'publicationTitle'
		});
		trans.doWeb(doc, url);
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://isidore.science/document/10670/1.v00h5m",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Sur la géométrie anallagmatique (addition à l'article précédent)",
				"creators": [
					{
						"firstName": "J.",
						"lastName": "Hadamard",
						"creatorType": "author"
					}
				],
				"date": "1927",
				"language": "fr",
				"libraryCatalog": "isidore.science",
				"publicationTitle": "Nouvelles annales de mathématiques : journal des candidats aux écoles polytechnique et normale",
				"url": "http://www.numdam.org/item/NAM_1927_6_2__314_0/",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://isidore.science/document/10670/1.ys05aw",
		"items": [
			{
				"itemType": "blogPost",
				"title": "Séminaire - Quand la santé questionne le couple. Correspondances Sud et Nord",
				"creators": [
					{
						"firstName": "",
						"lastName": "corpsetmedecine",
						"creatorType": "author"
					}
				],
				"date": "2010-07-06",
				"abstractNote": "L'équipe \"Genre et santé\" du CEPED organise un séminaire le jeudi 21 octobre 2010, à l'Université Paris Descartes : \"Quand la santé questionne le couple. Correspondances Sud et Nord\" Voir la présentation et le bulletin d'inscription en pièces jointes (pdf).",
				"blogTitle": "Corps et Médecine",
				"language": "fr",
				"url": "http://corpsetmedecine.hypotheses.org/995",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://isidore.science/document/10670/1.5tkdos",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "LES CHERCHEURS ALGERIENS ET LA PUBLICATION ELECTRONIQUE DANS LES ARCHIVES OUVERTES : CAS D'ARCHIVALG",
				"creators": [
					{
						"firstName": "Karima Ben",
						"lastName": "Allal",
						"creatorType": "author"
					},
					{
						"firstName": "Madjid",
						"lastName": "Dahmane",
						"creatorType": "author"
					},
					{
						"firstName": "Rahima",
						"lastName": "Slimani",
						"creatorType": "author"
					}
				],
				"date": "2008-05-29",
				"abstractNote": "Au cours de la dernière décennie, le monde de la communication scientifique a subi des mutations majeures engendrées principalement par la généralisation de l'utilisation des Technologies de l'Information et de la Communication. Ces mutations se distinguent par le développement de nouvelles tendances dont le mouvement des Archives ouvertes. En effet, l'initiative en faveur des archives ouvertes a émergé dans les milieux de la recherche dans le but de prôner un Accès Libre et gratuit à la littérature scientifique mondiale. Afin d'accompagner ce mouvement et de maîtriser ses principes et ses techniques, un prototype d'archive ouverte institutionnelle (CERIST d'Alger) et multidisciplinaire a été mis en place pour les communautés scientifiques algériennes. Ce prototype d'archive nommé ‘ArchivAlg' permet aux chercheurs de diffuser librement sur Internet leurs travaux de recherche. L'expérimentation de ce dispositif a montré que les chercheurs algériens sont peu familiarisés au dépôt dans les bases d'archives. Aujourd'hui, la question des archives ouvertes est stratégique pour le contexte algérien, elle est même indispensable pour valoriser et offrir une meilleure visibilité aux publications scientifiques et enrichir le patrimoine scientifique national d'où la nécessité de sensibiliser les chercheurs algériens et leurs institutions aux intérêts et retombées positifs de l'adoption de ces systèmes ouverts d'accès à l'Information Scientifique et Technique.",
				"language": "fr",
				"libraryCatalog": "isidore.science",
				"proceedingsTitle": "Hyper Article en Ligne - Sciences de l'Homme et de la Société",
				"publisher": "Hyper Article en Ligne - Sciences de l'Homme et de la Société",
				"shortTitle": "LES CHERCHEURS ALGERIENS ET LA PUBLICATION ELECTRONIQUE DANS LES ARCHIVES OUVERTES",
				"url": "https://archivesic.ccsd.cnrs.fr/sic_00284311",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://isidore.science/document/10670/1.gmcezm",
		"items": [
			{
				"itemType": "thesis",
				"title": "Théories pré-keynésiennes de l’instabilité financière : Marx, Veblen, Hawtrey",
				"creators": [
					{
						"firstName": "Julien",
						"lastName": "Mendez",
						"creatorType": "author"
					}
				],
				"date": "2012-05-02",
				"abstractNote": "Cette thèse montre que l’on peut trouver chez Marx, Veblen et Hawtrey trois théories pré-keynésiennes de l’instabilité financière. Elle dégage, pour chacun d’eux, le cadre théorique qu’il met en place et qui lui permet de poser la question du rôle de la finance dans la dynamique économique. Elle analyse ensuite leurs écrits pour montrer que l’on peut en déduire des théories (incomplètes) de l’instabilité financière, c’est-à-dire que les perturbations économiques sont dues à la manière dont les entreprises se financent. Le chapitre I reconstruit la théorie marxienne des marchés financiers, ce qui permet, dans le chapitre II, de montrer le rôle central joué par la finance dans l’explication du cycle économique chez Marx. Le chapitre III dégage les éléments qui font de la théorie de Veblen une théorie du capitalisme financier, puis, dans le chapitre IV, discute cette dernière pour montrer qu’il s’agit d’une théorie de l’instabilité financière. Le chapitre V propose une représentation du modèle macroéconomique de Hawtrey, à partir de laquelle le chapitre VI dégage les conditions dans lesquelles le crédit est instable dans sa théorie. Le chapitre VII fait le lien entre les théories de ces auteurs et les faits économiques dont la connaissance a nourri leur réflexion : les théories de l’instabilité financière sont à la fois une explication, une représentation et un projet de régulation du capitalisme financier",
				"language": "fr",
				"libraryCatalog": "isidore.science",
				"shortTitle": "Théories pré-keynésiennes de l’instabilité financière",
				"thesisType": "thesis",
				"university": "Theses.fr",
				"url": "http://www.theses.fr/2012PA100060/document",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://isidore.science/subject/http://ark.frantiq.fr/ark:/26678/pcrtP2Dd8lnOmB",
		"items": "multiple"
	}
]
/** END TEST CASES **/
