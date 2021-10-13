{
	"translatorID": "5cf8bb21-e350-444f-b9b4-f46d9fab7827",
	"label": "DABI",
	"creator": "Jens Mittelbach",
	"target": "^https?://dabi\\.ib\\.hu-berlin\\.de/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-09-10 18:58:10"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2018 Jens Mittelbach
	Contact: mail@jensmittelbach.de
	
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
	if (url.includes("/vollanzeige.pl?")) {
		return "journalArticle";
	}
	else if (url.includes("/suche.pl?") && getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}


function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		Z.selectItems(getSearchResults(doc, false), function (data) {
			if (!data) return;
			ZU.processDocuments(Object.keys(data), scrape);
		});
	}
	else if (detectWeb(doc, url) == "journalArticle") {
		scrape(doc, url);
	}
}


function getSearchResults(doc, checkOnly) {
	var trs = doc.getElementsByTagName("tr"),
		data = {},
		found = false;

	for (var i = 1; i < trs.length; i++) {
		var tds = trs[i].getElementsByTagName("td");
		var url = ZU.xpathText(tds, './a/@href'),
			author = tds[1].textContent,
			title = tds[2].textContent.replace(/<br>/g, '. ');
		var item;
		if (author) {
			item = title + " (" + author.replace(/;.*/, ' et al.') + ")";
		}
		else {
			item = title;
		}
		if (!item || !url) continue;
		
		if (checkOnly) return true;
		found = true;

		data[url] = item;
	}
	return found ? data : false;
}

function scrape(doc, _url) {
	var newItem = new Zotero.Item('journalArticle');
	var trs = doc.getElementsByTagName("tr"),
		data = {};

	for (var i = 0; i < trs.length; i++) {
		var headers = trs[i].getElementsByTagName("th")[0].textContent;
		var contents = trs[i].getElementsByTagName("td")[0].innerHTML;

		data[headers.replace(/\s+/g, '')] = contents.trim();
	}

	// set url to fulltext resource, if present
	if (data.URL) {
		newItem.url = data.URL.replace(/<a.*?href="(.*?)".*/, "$1");

		if (/\.pdf(#.*)?$/.test(newItem.url)) {
			newItem.attachments = [{
				url: newItem.url,
				title: "DABI Full Text PDF",
				mimeType: "application/pdf"
			}];
			delete newItem.url;
		}
	}

	// Formatting and saving "title" fields
	// Sometimes titles are missing
	if (!data.Titel) {
		data.Titel = data.Untertitel;
		delete data.Untertitel;
	}
	
	if (data.Titel) {
		newItem.title = data.Titel.replace(/\*/g, '');
		
		if (data.Untertitel) {
			if (/(\?|!|\.)\W?$/.test(newItem.title)) {
				newItem.title += " " + data.Untertitel;
			}
			else {
				newItem.title += ": " + data.Untertitel;
			}
		}
	}

	// Formatting and saving "Author" field
	if (data.Autoren) {
		var authors = data.Autoren.split("; ");
		for (let author of authors) {
			newItem.creators.push(ZU.cleanAuthor(author, "author", true));
		}
	}

	// Formatting and saving "pages" field
	if (data.Anfangsseite > 0) {
		newItem.pages = data.Anfangsseite + (data.Endseite > data.Anfangsseite ? "-" + data.Endseite : "");
	}

	// Saving the tags to Zotero
	if (data["Schlagwörter"]) {
		newItem.tags = data["Schlagwörter"].split("; ");
	}

	// Making the publication title orthographic
	if (data.Zeitschrift) {
		newItem.publicationTitle = data.Zeitschrift.replace(/ : /g, ": ");
	}

	// Associating and saving the well formatted data to Zotero
	newItem.date = data.Jahr;
	newItem.issue = data.Heft;
	newItem.volume = data.Band;
	newItem.abstractNote = data.Abstract;
	
	// Scrape is COMPLETE!
	newItem.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://dabi.ib.hu-berlin.de/cgi-bin/dabi/vollanzeige.pl?artikel_id=13028&modus=html",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "\"Mich interessierten kostengünstige Alternativen zu Citavi\": Über den Fortbildungsworkshop \"Literaturverwaltung im Fokus\" im Rahmen der AGMB-Tagung 2012",
				"creators": [
					{
						"firstName": "Matti",
						"lastName": "Stöhr",
						"creatorType": "author"
					}
				],
				"date": "2012",
				"abstractNote": "Zum Programm der AGMB-Tagung 2012 in Aachen gehörte u.a. der zweistündige Fortbildungsworkshop \"Literaturverwaltung im Fokus - Softwaretypen, bibliothekarische Services und mehr\". Im Beitrag werden weniger die referierten Workshopinhalte beschrieben, als vielmehr die Perspektive der Teilnehmerinnen und Teilnehmer anhand einer eMail-basierten Umfrage vorgestellt. Die Kernfrage lautet hierbei: War der Workshop für sie gewinnbringend?",
				"issue": "3",
				"libraryCatalog": "DABI",
				"publicationTitle": "GMS Medizin, Bibliothek, Information",
				"shortTitle": "\"Mich interessierten kostengünstige Alternativen zu Citavi\"",
				"url": "http://www.egms.de/static/de/journals/mbi/2012-12/mbi000261.shtml",
				"volume": "12",
				"attachments": [],
				"tags": [
					{
						"tag": "Arbeitsgemeinschaft für Medizinisches Bibliothekswesen (AGMB)"
					},
					{
						"tag": "Citavi"
					},
					{
						"tag": "Literaturverwaltung"
					},
					{
						"tag": "Literaturverwaltungssoftware"
					},
					{
						"tag": "Tagung"
					},
					{
						"tag": "Teilnehmerumfrage"
					},
					{
						"tag": "Veranstaltungsbericht"
					},
					{
						"tag": "Workshop"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://dabi.ib.hu-berlin.de/cgi-bin/dabi/suche.pl?titel=&autor=st%F6hr&schlagwort=&styp=&notation=&zeitschrift=&jahr=&heft=&andor=AND&ordnung=titel&modus=html",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://dabi.ib.hu-berlin.de/cgi-bin/dabi/vollanzeige.pl?artikel_id=16013&modus=html",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "\"Frage stellen, Antwort bekommen, weiterarbeiten!\" - Umfrage zur Benutzung von UpToDate an den Universitäten Freiburg, Leipzig, Münster und Regensburg",
				"creators": [
					{
						"firstName": "Oliver",
						"lastName": "Obst",
						"creatorType": "author"
					},
					{
						"firstName": "Helge",
						"lastName": "Knüttel",
						"creatorType": "author"
					},
					{
						"firstName": "Christiane",
						"lastName": "Hofmann",
						"creatorType": "author"
					},
					{
						"firstName": "Petra",
						"lastName": "Zöller",
						"creatorType": "author"
					}
				],
				"date": "2013",
				"abstractNote": "UpToDate ist eine evidenzbasierte, von Ärzten erstellte Ressource zur Unterstützung der klinischen Entscheidungsfindung mit weitem Verbreitungsgrad in Deutschland. In einer Multicenter-Studie wurden Mediziner, Studierende, Wissenschaftler und sonstiges medizinisches Fachpersonal an vier deutschen Universitäten nach ihrer Nutzung und Beurteilung von UpToDate befragt. Insgesamt wurde die Umfrage 1.083-mal beantwortet, darunter von 540 Ärzten. 76% aller befragten Ärzte (aber nur 54% der Chefärzte) nutzten UpToDate. Die Unkenntnis über UpToDate betrug je nach Benutzergruppe zwischen 10 und 41%. 90 bis 95% aller klinisch tätigen Personen nannten als Hauptvorteil von UpToDate die schnelle, allgemeine Übersicht über Diagnose und Therapie von Erkrankungen. Jeder vierte Oberarzt wies auf verringerte Liegezeiten als Folge von UpToDate hin, (fast) jeder vierte Chefarzt gab an, dass UpToDate Kosten einspare. UpToDate ist eine wichtige, aber auch kostspielige Ressource in der Patientenbehandlung und sollte - angesichts der vorhandenen Unkenntnis über die Existenz dieser Ressource - stärker von den Bibliotheken beworben werden.",
				"issue": "3",
				"libraryCatalog": "DABI",
				"publicationTitle": "GMS Medizin, Bibliothek, Information",
				"url": "http://www.egms.de/static/de/journals/mbi/2013-13/mbi000290.shtml",
				"volume": "13",
				"attachments": [],
				"tags": [
					{
						"tag": "Freiburg"
					},
					{
						"tag": "Krankenversorgung"
					},
					{
						"tag": "Leipzig"
					},
					{
						"tag": "Medizin"
					},
					{
						"tag": "Medizinbibliothek"
					},
					{
						"tag": "Multicenter-Studie"
					},
					{
						"tag": "Münster"
					},
					{
						"tag": "Regensburg"
					},
					{
						"tag": "Umfrage"
					},
					{
						"tag": "Universität Freiburg"
					},
					{
						"tag": "Universität Leipzig"
					},
					{
						"tag": "Universität Münster"
					},
					{
						"tag": "Universität Regensburg"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://dabi.ib.hu-berlin.de/cgi-bin/dabi/vollanzeige.pl?artikel_id=21283&modus=html",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "\"Was ihr wollt!\" Nutzungsgesteuerter Einkauf von Medien an der Staatsbibliothek zu Berlin",
				"creators": [
					{
						"firstName": "Janin",
						"lastName": "Taubert",
						"creatorType": "author"
					}
				],
				"date": "2014",
				"issue": "3",
				"libraryCatalog": "DABI",
				"pages": "79-81",
				"publicationTitle": "Bibliotheks-Magazin",
				"volume": "9",
				"attachments": [
					{
						"title": "DABI Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Benutzerorientierter Bestandsaufbau"
					},
					{
						"tag": "Benutzerorientierung"
					},
					{
						"tag": "Berlin"
					},
					{
						"tag": "Bestand"
					},
					{
						"tag": "Bestandsaufbau"
					},
					{
						"tag": "Bibliothekswesen"
					},
					{
						"tag": "Demand Driven Acquisition (DDA)"
					},
					{
						"tag": "E-Book"
					},
					{
						"tag": "Evidence Based Selection (EBS)"
					},
					{
						"tag": "Kundenorientierter Bestandsaufbau"
					},
					{
						"tag": "Patron Driven Acquisition (PDA)"
					},
					{
						"tag": "Purchase On Demand (POD)"
					},
					{
						"tag": "Staatsbibliothek zu Berlin - Preußischer Kulturbesitz (SBB PK)"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://dabi.ib.hu-berlin.de/cgi-bin/dabi/vollanzeige.pl?artikel_id=5676&modus=html",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Anpassung der Personalstruktur der Fachhochschulbibliotheken in Nordrhein-Westfalen an die Erfordernisse der neunziger Jahre",
				"creators": [],
				"date": "1992",
				"issue": "1",
				"libraryCatalog": "DABI",
				"pages": "364-372",
				"publicationTitle": "Mitteilungsblatt des Verbandes der Bibliotheken des Landes Nordrhein-Westfalen",
				"volume": "4",
				"attachments": [],
				"tags": [
					{
						"tag": "Nordrhein-Westfalen"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://dabi.ib.hu-berlin.de/cgi-bin/dabi/vollanzeige.pl?artikel_id=9481&modus=html",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "\"Das bibliophile Flaggschiff Bayerns\": Auszug aus der Rede des damaligen Ministerpräsidenten Dr. Günther Beckstein",
				"creators": [
					{
						"firstName": "Günther",
						"lastName": "Beckstein",
						"creatorType": "author"
					}
				],
				"date": "2009",
				"issue": "1",
				"libraryCatalog": "DABI",
				"pages": "46",
				"publicationTitle": "Bibliotheksforum Bayern",
				"shortTitle": "\"Das bibliophile Flaggschiff Bayerns\"",
				"volume": "3",
				"attachments": [
					{
						"title": "DABI Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Altes Buch"
					},
					{
						"tag": "Ausstellung"
					},
					{
						"tag": "Bayerische Staatsbibliothek (BSB) München"
					},
					{
						"tag": "Bibel"
					},
					{
						"tag": "Buchkunst"
					},
					{
						"tag": "Buchmalerei"
					},
					{
						"tag": "Handschrift"
					},
					{
						"tag": "Illustration"
					},
					{
						"tag": "Neues Testament"
					},
					{
						"tag": "Ottheinrich-Bibel"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
