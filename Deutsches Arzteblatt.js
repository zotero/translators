{
	"translatorID": "72543881-a05b-4a40-b891-de8726e29d77",
	"label": "Deutsches Ärzteblatt",
	"creator": "Sebastian Fleer",
	"target": "^https?://www\\.aerzteblatt\\.de/archiv/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2018-11-14 09:17:33"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2018 Sebastian Fleer

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
	if (url.match(/archiv\/\d+/) || url.match(/aid\=\d+/)) {
		return "journalArticle";
	}
}

function doWeb(doc, url) {
	var type = detectWeb(doc, url);
	if (type == "journalArticle") {
		scrape(doc, url);
	}
}

function scrape(doc, url) {
	var newItem = new Zotero.Item(detectWeb(doc, url));
	
	if (newItem.itemType == "journalArticle") {
		// detect article ID
		var tmp = "null";
		if (url.match(/archiv\/\d+/)) { // normal article page
			tmp = url.match(/archiv\/\d+/);
		} else if (url.match(/aid\=\d+/)) { // article page in search results
				tmp = url.match(/aid\=\d+/);
		}
		var articleID = String(tmp).match(/\d+/);

		// use BibTeX Translator
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("9cb70025-a888-4a29-a210-93ec52da40d4");
	
		translator.setHandler("itemDone", function(obj, item) {
			item.attachments.push({
				title:"Snapshot",
				document:doc
			});
	
			// PDFs are stored under https://www.aerzteblatt.de/pdf/<volume>/<issue>/pdfPageNum.pdf
			// pdfPageNum is in the form a<firstpage> or m<firstpage>, depending on the journal part
			// Don't fetch PDF by now
			
			item.complete();
		});
	
		// Fetch BibTex file for article ID and set encoding to ISO-8859-15
		var bibtexURL = "https://www.aerzteblatt.de/callback/citemgr.asp?fmt=bibtex&id=" + articleID;
		Zotero.Utilities.HTTP.doGet(bibtexURL, function(text) {
			translator.setString(text);
			translator.translate();
		}, null, "ISO-8859-15");
	}
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.aerzteblatt.de/archiv/202039/Oekonomisierung-der-Medizin-Zur-Pathogenese-der-Oekonomisierung",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Ökonomisierung der Medizin: Zur Pathogenese der Ökonomisierung",
				"creators": [
					{
						"firstName": "Christian",
						"lastName": "Thielscher",
						"creatorType": "author"
					}
				],
				"date": "2018",
				"issue": "43",
				"itemID": "DAE202039",
				"libraryCatalog": "Deutsches Ärzteblatt",
				"pages": "A-1946-",
				"publicationTitle": "Dtsch Arztebl International",
				"shortTitle": "Ökonomisierung der Medizin",
				"url": "http://www.aerzteblatt.de/int/article.asp?id=202039",
				"volume": "115",
				"attachments": [
					{
						"title": "Snapshot"
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
		"url": "https://www.aerzteblatt.de/archiv/202004/Einladung-zur-Vorsorgekoloskopie-bei-familiaerem-Darmkrebsrisiko",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Einladung zur Vorsorgekoloskopie bei familiärem Darmkrebsrisiko",
				"creators": [
					{
						"firstName": "Alexander",
						"lastName": "Bauer",
						"creatorType": "author"
					},
					{
						"firstName": "Jürgen F.",
						"lastName": "Riemann",
						"creatorType": "author"
					},
					{
						"firstName": "Thomas",
						"lastName": "Seufferlein",
						"creatorType": "author"
					},
					{
						"firstName": "Max",
						"lastName": "Reinshagen",
						"creatorType": "author"
					},
					{
						"firstName": "Stephan",
						"lastName": "Hollerbach",
						"creatorType": "author"
					},
					{
						"firstName": "Ulrike",
						"lastName": "Haug",
						"creatorType": "author"
					},
					{
						"firstName": "Susanne",
						"lastName": "Unverzagt",
						"creatorType": "author"
					},
					{
						"firstName": "Stephanie",
						"lastName": "Boese",
						"creatorType": "author"
					},
					{
						"firstName": "Madeleine",
						"lastName": "Ritter-Herschbach",
						"creatorType": "author"
					},
					{
						"firstName": "Patrick",
						"lastName": "Jahn",
						"creatorType": "author"
					},
					{
						"firstName": "Thomas",
						"lastName": "Frese",
						"creatorType": "author"
					},
					{
						"firstName": "Michael",
						"lastName": "Harris",
						"creatorType": "author"
					},
					{
						"firstName": "Margarete",
						"lastName": "Landenberger",
						"creatorType": "author"
					}
				],
				"date": "2018",
				"DOI": "10.3238/arztebl.2018.0715",
				"abstractNote": "Hintergrund: Die Vorsorgekoloskopie kann die Inzidenz des kolorektalen Karzinoms (KRK) reduzieren. Allerdings sind die Teilnahmeraten selbst in Risikogruppen niedrig. Ziel war es, die Teilnahmeraten an der Vorsorgekoloskopie bei Personen mit familiärem Darmkrebsrisiko zu verdoppeln und die Häufigkeit von Neoplasien in dieser Risikogruppe zu ermitteln.Methode: In einer deutschlandweiten clusterrandomisierten Multicenterstudie erhielten erstgradig Verwandte (EGV) von Patienten mit KRK schriftliche Informationen über das familiäre KRK-Risiko und eine Einladung zur Koloskopie. Teilnehmer der Interventionsgruppe erhielten zusätzlich eine telefonische Beratung durch Pflegekräfte. Primärer Endpunkt war die Koloskopieteilnahme innerhalb von 30 Tagen.Ergebnisse: Das Durchschnittsalter der Probanden betrug 50,8 Jahre. Die Koloskopieteilnahmeraten lagen bei 99/125 (79 %) in der Interventionsgruppe und 97/136 (71 %) in der Kontrollgruppe (RR = 1,11; 95-%-Konfidenzintervall: [0,97; 1,28]). Eine Polypektomie erfolgte bei 72 von insgesamt 196 asymptomatischen Personen (37 %). In 13 Fällen (7 %) wurde eine fortgeschrittene Neoplasie gefunden. Davon handelte es sich bei zwei Fällen um Darmkrebs der Stadien T0 und T1. Barrieren gegenüber der Darmspiegelung äußerten 42 % der Teilnehmer. Leichte Nebenwirkungen berichteten 22 Patienten. Schwere Nebenwirkungen traten nicht auf.Schlussfolgerung: Die zusätzliche telefonische Beratung durch Pflegekräfte erhöhte die Teilnahmerate nicht. Die Ansprache von Patienten mit KRK ist eine Möglichkeit, die Teilnahme von EGV an einer Screeningkoloskopie zu verbessern. Die ermittelte Häufigkeit von Neoplasien unterstreicht die Notwendigkeit eines Screenings von Verwandten, bevor sie die bisher geltenden Altersgrenze erreichen.",
				"issue": "43",
				"itemID": "DAE202004",
				"libraryCatalog": "Deutsches Ärzteblatt",
				"pages": "715-722",
				"publicationTitle": "Dtsch Arztebl International",
				"url": "http://www.aerzteblatt.de/int/article.asp?id=202004",
				"volume": "115",
				"attachments": [
					{
						"title": "Snapshot"
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
		"url": "https://www.aerzteblatt.de/archiv/treffer?mode=s&wo=1008&typ=16&aid=201948&s=test",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Bluttests: Abgeordnete wollen ethische Debatte zu Pränataldiagnostik anstoßen",
				"creators": [
					{
						"firstName": "Kathrin",
						"lastName": "Gießelmann",
						"creatorType": "author"
					}
				],
				"date": "2018",
				"issue": "42",
				"itemID": "DAE201948",
				"libraryCatalog": "Deutsches Ärzteblatt",
				"pages": "A-1840-A-1840",
				"publicationTitle": "Dtsch Arztebl International",
				"shortTitle": "Bluttests",
				"url": "http://www.aerzteblatt.de/int/article.asp?id=201948",
				"volume": "115",
				"attachments": [
					{
						"title": "Snapshot"
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
