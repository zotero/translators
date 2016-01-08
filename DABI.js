{
    "translatorID": "5cf8bb21-e350-444f-b9b4-f46d9fab7827",
    "label": "DABI",
    "creator": "Jens Mittelbach",
    "target": "^https?://dabi\\.ib\\.hu-berlin\\.de/",
    "minVersion": "1.0",
    "maxVersion": "",
    "priority": 100,
    "inRepository": true,
    "translatorType": 4,
    "browserSupport": "gcsvbi",
    "lastUpdated": "2015-12-15 18:59:56"
}

function detectWeb(doc, url) {
    if (doc.title.trim().indexOf("DABI. Datensatz Vollanzeige") == 0) {
        return "journalArticle";
    } else if (doc.title.trim().indexOf("DABI: Rechercheergebnis") == 0) {
        var keinTreffer = doc.getElementsByTagName("br")[7].nextSibling.data.indexOf("Keine Treffer für die Suche nach:")
        if (keinTreffer == -1) {
            return "multiple";
        }
    }
}

function doWeb(doc, url) {
    var ids = [];

    //If Statement checks if page is a Search Result, then saves requested Items
    if (detectWeb(doc, url) == "multiple") {
        Z.selectItems(getSearchResults(doc), function(items) {
            if (!items) return true;
            for (var i in items) {
                ids.push(i);
            }
        });
    } else if (detectWeb(doc, url) == "journalArticle") {
        //saves single page items
        ids = [url];
    }
    ZU.processDocuments(ids, scrape);
}


function getSearchResults(doc) {
    var trs = doc.getElementsByTagName("tr"),
        tds = null,
        items = {};

    for (var i = 1; i < trs.length; i++) {
        tds = trs[i].getElementsByTagName("td");
        for (var n = 0; n < tds.length; n++) {
            var url = doc.location.origin + "/cgi-bin/dabi/" + tds[0].firstChild.getAttribute("href"),
                author = tds[1].innerHTML,
                title = tds[2].innerHTML.replace(/<br>/g, '. ');

            if (!author == '') {
                var item = author.replace(/; <br>.*/, ' et al.') + ": " + title;
            } else {
                var item = title;
            }
            if (!item || !url) continue;

            items[url] = item;
        }
    }
    return items;
}

function scrape(doc, url) {
    var newItem = new Zotero.Item('journalArticle');
    var trs = doc.getElementsByTagName("tr"),
        headers,
        contents,
        items = {};

    //For Loop to populate "items" Object and save tags to an Array.
    for (var i = 0; i < trs.length; i++) {
        headers = trs[i].getElementsByTagName("th")[0].textContent;
        contents = trs[i].getElementsByTagName("td")[0].innerHTML;

        items[headers.replace(/\s+/g, '')] = contents.trim();
    }

    //set url to fulltext resource, if present; else to database item
    if (items["URL"] == '') {
        newItem.url = url;
    } else {
        var link = doc.createElement('a');
        link.innerHTML = items["URL"];
        newItem.url = link.firstChild.getAttribute("href");

        if (/\.pdf(#.*)?$/.test(newItem.url)) {
            newItem.attachments = [{
                url: newItem.url,
                title: "DABI Full Text PDF",
                mimeType: "application/pdf"
            }];
        }
    }


    //Formatting and saving "title" fields
    if (items["Titel"]) {
        newItem.title = items["Titel"].replace(/\*/g, '');
        var short = newItem.title.replace(/^\W?(?:Die |Der |Das |\.{3}\s?)/, '');
        short = short.replace(/(,|:|\?|!|\.|\").*$/, '').split(' ').slice(0, 6).join(' ');
        short = short.replace(/\W?$/, '');
        newItem.shortTitle = short.substring(0, 1).toUpperCase() + short.slice(1);
        if (items["Untertitel"]) {
        	if (/(\?|!|\.)\W?$/.test(newItem.title)) {
            	newItem.title += " " + items["Untertitel"];
        	} else {
        	    newItem.title += ": " + items["Untertitel"];
        	}
        }
    }

    //Sometimes titles are missing
    if (items["Untertitel"] && !items["Titel"]) {
        newItem.title = items["Untertitel"].replace(/\*/g, '');
        var short = newItem.title.replace(/^\W?(?:Die |Der |Das |\.{3}\s?)/, '');
        short = short.replace(/(,|:|\?|!|\.|\").*$/, '').split(' ').slice(0, 6).join(' ');
        short = short.replace(/\W?$/, '');
        newItem.shortTitle = short.substring(0, 1).toUpperCase() + short.slice(1);
    }

    //Formatting and saving "Author" field
    if (items["Autoren"]) {
        var authors = items["Autoren"].split("; ");
        for (var i = 0; i < authors.length; i++) {
            newItem.creators.push(ZU.cleanAuthor(authors[i], "author", true));
        }
    }

    //Formatting and saving "pages" field
    if (items["Anfangsseite"]) {
        newItem.pages = items["Anfangsseite"] + (items["Endseite"] ? "-" + items["Endseite"] : "");
    }

    //Saving the tags to Zotero
    if (items["Schlagwörter"]) {
        var tags = items["Schlagwörter"].split("; ");
        for (var i = 0; i < tags.length; i++) {
            newItem.tags.push(tags[i]);
        }
    }

    //Making the publication title orthographic
    if (items["Zeitschrift"]) {
        newItem.publicationTitle = items["Zeitschrift"].replace(/ : /g, ": ");
    }

    //Associating and saving the well formatted data to Zotero
    var fieldMap = {
        "date": items["Jahr"],
        "issue": items["Heft"],
        "volume": items["Band"],
        "abstractNote": items["Abstract"]
    };

    for (var key in fieldMap) {
        if (fieldMap.hasOwnProperty(key)) {
            newItem[key] = fieldMap[key];
        }
    };

    newItem.libraryCatalog = "DABI";

    //Scrape is COMPLETE!
    newItem.complete();
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://dabi.ib.hu-berlin.de/cgi-bin/dabi/vollanzeige.pl?artikel_id=13028&modus=html",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "\"Mich interessierten kostengünstige Alternativen zu Citavi\": Über den Fortbildungsworkshop \"Literaturverwaltung im Fokus\" im Rahmen der AGMB-Tagung 2012:",
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
				"pages": "0-0",
				"publicationTitle": "GMS Medizin, Bibliothek, Information",
				"shortTitle": "Mich interessierten kostengünstige Alternativen zu Citavi",
				"url": "http://www.egms.de/static/de/journals/mbi/2012-12/mbi000261.shtml",
				"volume": "12",
				"attachments": [],
				"tags": [
					"Arbeitsgemeinschaft für Medizinisches Bibliothekswesen (AGMB)",
					"Citavi",
					"Literaturverwaltung",
					"Literaturverwaltungssoftware",
					"Tagung",
					"Teilnehmerumfrage",
					"Veranstaltungsbericht",
					"Workshop"
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
				"title": "\"Frage stellen, Antwort bekommen, weiterarbeiten!\" - Umfrage zur Benutzung von UpToDate an den Universitäten Freiburg, Leipzig, Münster und Regensburg:",
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
				"pages": "0-0",
				"publicationTitle": "GMS Medizin, Bibliothek, Information",
				"shortTitle": "Frage stellen",
				"url": "http://www.egms.de/static/de/journals/mbi/2013-13/mbi000290.shtml",
				"volume": "13",
				"attachments": [],
				"tags": [
					"Freiburg",
					"Krankenversorgung",
					"Leipzig",
					"Medizin",
					"Medizinbibliothek",
					"Multicenter-Studie",
					"Münster",
					"Regensburg",
					"Umfrage",
					"Universität Freiburg",
					"Universität Leipzig",
					"Universität Münster",
					"Universität Regensburg"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://dabi.ib.hu-berlin.de/cgi-bin/dabi/vollanzeige.pl?artikel_id=18305&modus=html",
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
				"shortTitle": "Was ihr wollt",
				"url": "http://www.bsb-muenchen.de/fileadmin/imageswww/pdf-dateien/bibliotheksmagazin/BM2014-3.pdf",
				"volume": "9",
				"attachments": [
					{
						"title": "DABI Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					"Benutzerorientierter Bestandsaufbau",
					"Benutzerorientierung",
					"Berlin",
					"Bestand",
					"Bestandsaufbau",
					"Bibliothekswesen",
					"Demand Driven Acquisition (DDA)",
					"E-Book",
					"Evidence Based Selection (EBS)",
					"Kundenorientierter Bestandsaufbau",
					"Patron Driven Acquisition (PDA)",
					"Purchase On Demand (POD)",
					"Staatsbibliothek zu Berlin - Preußischer Kulturbesitz (SBB PK)"
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
				"shortTitle": "Anpassung der Personalstruktur der Fachhochschulbibliotheken in",
				"url": "http://dabi.ib.hu-berlin.de/cgi-bin/dabi/vollanzeige.pl?artikel_id=5676&modus=html",
				"volume": "4",
				"attachments": [],
				"tags": [
					"Nordrhein-Westfalen"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
