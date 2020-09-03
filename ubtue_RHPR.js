{
	"translatorID": "f5e796cb-0d76-475c-b9b0-f657a39d8ff0",
	"label": "ubtue_RHPR",
	"creator": "Timotheus Kim",
	"target": "^https?://classiques-garnier\\.com",
	"minVersion": "2.1",
	"maxVersion": "",
	"priority": 100,
	"inRepository": false,
	"translatorType": 4,
	"browserSupport": "gcsbv",
	"lastUpdated": "2020-08-19 16:17:54"
}

/*
	***** BEGIN LICENSE BLOCK *****
	Copyright © 2020 Universitätsbibliothek Tübingen.  All rights reserved.
	This program is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.
	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU Affero General Public License for more details.
	You should have received a copy of the GNU Affero General Public License
	along with this program.  If not, see <http://www.gnu.org/licenses/>.
	***** END LICENSE BLOCK *****
*/

function detectWeb(doc, url) {
	if (url.match(/revue/)) return "journalArticle";
}

function getSearchResults(doc) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//*[contains(concat( " ", @class, " " ), concat( " ", "titleInfo", " " ))]');
	for (let row of rows) {
		let href = row.innerHTML.match(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/)[0];
		let title = ZU.trimInternal(row.textContent);
		if (!href || !title) continue;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function invokeEMTranslator(doc) {
	var translator = Zotero.loadTranslator("web");
	translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
	translator.setDocument(doc);
	translator.setHandler("itemDone", function (t, i) {
		let firstandlastpages = i.pages.split('-');
		if (firstandlastpages[0] === firstandlastpages[1]) i.pages = firstandlastpages[0];
		var issue = i.issue.split('n°');
		i.volume = issue[0].match(/\d+/);
		i.issue = issue[1];
		i.complete();
	});
	translator.translate();
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) === "multiple") {
		Zotero.selectItems(getSearchResults(doc), function (items) {
			if (!items) {
				return true;
			}
			var articles = [];
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, invokeEMTranslator);
		});
	} else {
		invokeEMTranslator(doc, url);
        }
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://classiques-garnier.com/revue-d-histoire-et-de-philosophie-religieuses-2020-2-100e-annee-n-2-varia.html",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://classiques-garnier.com/revue-d-histoire-et-de-philosophie-religieuses-2020-2-100e-annee-n-2-varia-sigmund-mowinckel-et-la-question-de-l-aniconisme-dans-la-religion-yahwiste.html",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Sigmund Mowinckel et la question de l’aniconisme dans la religion yahwiste",
				"creators": [
					{
						"firstName": "Thomas",
						"lastName": "Römer",
						"creatorType": "author"
					}
				],
				"date": "2020/07/08",
				"DOI": "10.15122/isbn.978-2-406-10673-9.p.0005",
				"ISSN": "2269-479X",
				"abstractNote": "Cet article évalue l’importance de l’étude de S. Mowinckel, parue en 1929 dans la Revue d’Histoire et de Philosophie Religieuses, dans laquelle il émet des hypothèses sur les origines de l’aniconisme biblique. Ses études sur la forme bovine des représentations de Yhwh dont l’une se trouvait dans l’arche sont importantes mais doivent être modifiées à la lumière des recherches récentes qui ont montré que l’aniconisme ne naît qu’après la destruction de Jérusalem en 587 avant l’ère chrétienne.",
				"issue": "2",
				"language": "fr_FR",
				"libraryCatalog": "classiques-garnier.com",
				"pages": "5-19",
				"publicationTitle": "Revue d'Histoire et de Philosophie religieuses",
				"url": "https://classiques-garnier.com/revue-d-histoire-et-de-philosophie-religieuses-2020-2-100e-annee-n-2-varia-sigmund-mowinckel-et-la-question-de-l-aniconisme-dans-la-religion-yahwiste.html",
				"volume": "2",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Josias"
					},
					{
						"tag": "Jéroboam"
					},
					{
						"tag": "Mowinckel"
					},
					{
						"tag": "aniconisme"
					},
					{
						"tag": "arche"
					},
					{
						"tag": "monothéisme"
					},
					{
						"tag": "représentations de Yhwh"
					},
					{
						"tag": "statues"
					},
					{
						"tag": "stèles"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://classiques-garnier.com/revue-d-histoire-et-de-philosophie-religieuses-2020-2-100e-annee-n-2-varia-sommaire.html",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Sommaire",
				"creators": [],
				"date": "2020/07/08",
				"DOI": "10.15122/isbn.978-2-406-10673-9.p.0003",
				"ISSN": "2269-479X",
				"issue": "2",
				"language": "fr_FR",
				"libraryCatalog": "classiques-garnier.com",
				"pages": "3",
				"publicationTitle": "Revue d'Histoire et de Philosophie religieuses",
				"url": "https://classiques-garnier.com/revue-d-histoire-et-de-philosophie-religieuses-2020-2-100e-annee-n-2-varia-sommaire.html",
				"volume": "100",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
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
		"url": "https://classiques-garnier.com/revue-d-histoire-et-de-philosophie-religieuses-2020-2-100e-annee-n-2-varia-sommaire.html",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Sommaire",
				"creators": [],
				"date": "2020/07/08",
				"DOI": "10.15122/isbn.978-2-406-10673-9.p.0003",
				"ISSN": "2269-479X",
				"issue": "2",
				"language": "fr_FR",
				"libraryCatalog": "classiques-garnier.com",
				"pages": "3",
				"publicationTitle": "Revue d'Histoire et de Philosophie religieuses",
				"url": "https://classiques-garnier.com/revue-d-histoire-et-de-philosophie-religieuses-2020-2-100e-annee-n-2-varia-sommaire.html",
				"volume": "100",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
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
		"url": "https://classiques-garnier.com/revue-d-histoire-et-de-philosophie-religieuses-2019-4-99e-annee-n-4-varia-trois-hymnes-du-corpus-hermetique.html",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Trois hymnes du Corpus hermétique - Leurs structures, leurs rythmes et leur double public",
				"creators": [
					{
						"firstName": "Michèle",
						"lastName": "Biraud",
						"creatorType": "author"
					}
				],
				"date": "2019/12/18",
				"DOI": "10.15122/isbn.978-2-406-09894-2.p.0005",
				"ISSN": "0035-2403",
				"abstractNote": "L’étude des clausules (métriques et accentuelles) en réseaux d’échos dans les trois parties de l’Hymnodie secrète (Corpus hermeticum, XIII, 17-20) montre que c’est une prose eurythmique dans les deux prononciations, ce qui n’est pas exceptionnel à l’époque de la Seconde Sophistique, tandis que l’hymne du Poimandrès (I, 31-32) et la prière de V, 10-11 ne présentent un réel intérêt rythmique qu’en lecture orale moderne. Autant de lectures, autant de fidèles aux compétences culturelles différentes.",
				"issue": "4",
				"language": "fr_FR",
				"libraryCatalog": "classiques-garnier.com",
				"pages": "5-26",
				"publicationTitle": "Revue d'Histoire et de Philosophie religieuses",
				"url": "https://classiques-garnier.com/revue-d-histoire-et-de-philosophie-religieuses-2019-4-99e-annee-n-4-varia-trois-hymnes-du-corpus-hermetique.html",
				"volume": "99",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Accent"
					},
					{
						"tag": "Hymnes hermétiques"
					},
					{
						"tag": "charnière textuelle"
					},
					{
						"tag": "clausule accentuelle"
					},
					{
						"tag": "clausule métrique"
					},
					{
						"tag": "composition en anneau"
					},
					{
						"tag": "eurythmie"
					},
					{
						"tag": "gnose"
					},
					{
						"tag": "écho rythmique"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://classiques-garnier.com/revue-d-histoire-et-de-philosophie-religieuses-2019-4-99e-annee-n-4-varia-trois-hymnes-du-corpus-hermetique.html",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Trois hymnes du Corpus hermétique - Leurs structures, leurs rythmes et leur double public",
				"creators": [
					{
						"firstName": "Michèle",
						"lastName": "Biraud",
						"creatorType": "author"
					}
				],
				"date": "2019/12/18",
				"DOI": "10.15122/isbn.978-2-406-09894-2.p.0005",
				"ISSN": "0035-2403",
				"abstractNote": "L’étude des clausules (métriques et accentuelles) en réseaux d’échos dans les trois parties de l’Hymnodie secrète (Corpus hermeticum, XIII, 17-20) montre que c’est une prose eurythmique dans les deux prononciations, ce qui n’est pas exceptionnel à l’époque de la Seconde Sophistique, tandis que l’hymne du Poimandrès (I, 31-32) et la prière de V, 10-11 ne présentent un réel intérêt rythmique qu’en lecture orale moderne. Autant de lectures, autant de fidèles aux compétences culturelles différentes.",
				"issue": "4",
				"language": "fr_FR",
				"libraryCatalog": "classiques-garnier.com",
				"pages": "5-26",
				"publicationTitle": "Revue d'Histoire et de Philosophie religieuses",
				"url": "https://classiques-garnier.com/revue-d-histoire-et-de-philosophie-religieuses-2019-4-99e-annee-n-4-varia-trois-hymnes-du-corpus-hermetique.html",
				"volume": "99",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Accent"
					},
					{
						"tag": "Hymnes hermétiques"
					},
					{
						"tag": "charnière textuelle"
					},
					{
						"tag": "clausule accentuelle"
					},
					{
						"tag": "clausule métrique"
					},
					{
						"tag": "composition en anneau"
					},
					{
						"tag": "eurythmie"
					},
					{
						"tag": "gnose"
					},
					{
						"tag": "écho rythmique"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
