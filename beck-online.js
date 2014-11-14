{
	"translatorID": "e8544423-1515-4daf-bb5d-3202bf422b58",
	"label": "beck-online",
	"creator": "Philipp Zumstein",
	"target": "^https?://beck-online\\.beck\\.de",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsv",
	"lastUpdated": "2014-11-14 07:52:51"
}

/*
	***** BEGIN LICENSE BLOCK *****

	beck-online Translator, Copyright © 2014 Philipp Zumstein
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

//Disclaimer:
//This is written mainly for articles/cases in the journals in beck-online
//Probably, it might work further on other material (e.g. ebooks) in beck-online.


var mappingClassNameToItemType = {
	'ZAUFSATZ' : 'journalArticle',
	'ZRSPR' : 'case',//Rechtssprechung
	'ZENTB' : 'journalArticle',//Entscheidungsbesprechung
	'ZBUCHB' : 'journalArticle',//Buchbesprechung
	'ZSONST' : 'journalArticle',//Sonstiges, z.B. Vorwort,
	'LSK'	: 'journalArticle', // Artikel in Leitsatzkartei
	'ZINHALTVERZ' : 'multiple'//Inhaltsverzeichnis
}

// build a regular expression for author cleanup in authorRemoveTitlesEtc()
var authorTitlesEtc = ['\\/','Dr\\.', 'jur\\.', 'iur\\.','h\\. c\\.','Prof\\.',
		'Professor', 'wiss\\.', 'Mitarbeiter(in)?', 'RA,?', 'FAArbR',
		'Fachanwalt für Insolvenzrecht', 'Rechtsanw[aä]lt(?:e|in)?',
		'Richter am (?:AG|LG|OLG|BGH)',	'\\bzur Fussnote', 'LL\\.M\\.',
		'^Von', "\\*"];
var authorRegEx = new RegExp(authorTitlesEtc.join('|'), 'g');


function detectWeb(doc, url) {
	var documentClassName = doc.getElementById("dokument").className;
	//Z.debug(documentClassName);
	if (mappingClassNameToItemType[documentClassName.toUpperCase()]) {
		return mappingClassNameToItemType[documentClassName.toUpperCase()];
	}
}


function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		
		var items = new Object();
		var articles = new Array();
		
		var rows = ZU.xpath(doc, '//div[@class="inh"]//span[@class="inhdok"]//a | //div[@class="autotoc"]//a');
		for(var i=0; i<rows.length; i++) {
			//rows[i] contains an invisible span with some text, which we have to exclude, e.g.
			//   <span class="unsichtbar">BKR Jahr 2014 Seite </span>
			//   Dr. iur. habil. Christian Hofmann: Haftung im Zahlungsverkehr
			var title = ZU.trimInternal( ZU.xpathText(rows[i], './text()[1]') );
			var link = rows[i].href;
			items[link] = title;
		}
		Zotero.selectItems(items, function (items) {
			if (!items) {
				return true;
			}
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, scrape);
		});
	} else {
		scrape(doc, url);
	}
	
}

function authorRemoveTitlesEtc(authorStr) {
	// example 1: Dr. iur. Carsten Peter
	// example 2: Rechtsanwälte Christoph Abbott
	// example 3: Professor Dr. Klaus Messer
	return ZU.trimInternal(ZU.trimInternal(authorStr).replace(authorRegEx, ""));
}

// scrape documents that are only in the beck-online "Leitsatz-Kartei", i.e. 
// where only information about the article, not the article itself is in beck-online
function scrapeLSK(doc, url) {
	var item = new Zotero.Item(mappingClassNameToItemType['LSK']);
	
	// description example 1: "Marco Ganzhorn: Ist ein E-Book ein Buch?"
	// description example 2: "Michael Fricke/Dr. Martin Gerecke: Informantenschutz und Informantenhaftung"
	// description example 3: "Sara Sun Beale: Die Entwicklung des US-amerikanischen Rechts der strafrechtlichen Verantwortlichkeit von Unternehmen"
	var description = ZU.xpathText(doc, "//*[@id='dokument']/h1");
	var descriptionItems = description.split(':');

	//authors
	var authorsString = descriptionItems[0];
	
	var authors = authorsString.split("/");
	var authorsItems = new Array();

	for (var index = 0; index < authors.length; ++index) {
		var author = authorRemoveTitlesEtc(Zotero.Utilities.trimInternal(authors[index]));
		authorsItems.push ( Zotero.Utilities.cleanAuthor(author, 'author', false) );
	}
	item.creators = authorsItems;
	
	//title
	item.title = ZU.trimInternal(descriptionItems[1]);
	
	// src => journalTitle, date and pages
	// example 1: "Ganzhorn, CR 2014, 492"
	// example 2: "Fricke, Gerecke, AfP 2014, 293"
	// example 3 (no date provided): "Beale, ZStrW Bd. 126, 27"
	var src = ZU.xpathText(doc, "//div[@class='lsk-fundst']/ul/li");
	var m = src.trim().match(/([^,]+?)(\b\d{4})?,\s*(\d+)$/);
	if (m) {
		item.pages = m[3];
		if (m[2]) item.date = m[2];		
		item.journalTitle = ZU.trimInternal(m[1]);
		
		// if src is like example 3, then extract the volume
		var tmp = item.journalTitle.match(/(^[A-Za-z]+)\ Bd\. (\d+)/);
		if (tmp) {
			item.journalTitle = tmp[1];
			item.volume = tmp[2];
		}
	}

	item.attachments = [{
		title: "Snapshot",
		document:doc
	}];

	item.complete();
}


function scrape(doc, url) {
	var documentClassName = doc.getElementById("dokument").className.toUpperCase();

	// use different scraping function for documents in LSK
	if (documentClassName == 'LSK') {
			scrapeLSK(doc, url);
			return;
	}
	
	var item;
	if (mappingClassNameToItemType[documentClassName]) {
		item = new Zotero.Item(mappingClassNameToItemType[documentClassName]);
	}
	
	var titleNode = ZU.xpath(doc, '//div[@class="titel"]')[0] || ZU.xpath(doc, '//div[@class="dk2"]//span[@class="titel"]')[0];
	item.title = ZU.trimInternal(titleNode.textContent);
	
	// in some cases (e.g. NJW 2007, 3313) the title contains an asterisk with a footnote that is imported into the title
	// therefore, this part should be removed from the title
	var indexOfAdditionalText = item.title.indexOf("zur Fussnote");
	if (indexOfAdditionalText !=-1) {
		item.title = item.title.substr(0, indexOfAdditionalText);
	}
	
	var authorNode = ZU.xpath(doc, '//div[@class="autor"]');
	for (var i=0; i<authorNode.length; i++) {
		//normally several authors are under the same authorNode
		//and they occur in pairs with first and last names
		
		var authorFirstNames = ZU.xpath(authorNode[i], './/span[@class="vname"]');
		var authorLastNames = ZU.xpath(authorNode[i], './/span[@class="nname"]');
		for (var j=0; j<authorFirstNames.length; j++) {
			item.creators.push({
				lastName : authorLastNames[j].textContent , 
				firstName : authorFirstNames[j].textContent ,
				creatorType: "author"
			});
		}
	}
	
	if (item.creators.length == 0) {
		authorNode = ZU.xpath(doc, '//div[@class="autor"]/p | //p[@class="authorline"]/text() | //div[@class="authorline"]/p/text()');
		for (var j=0; j<authorNode.length; j++) {
			//first we delete some prefixes
			var authorString = authorRemoveTitlesEtc(authorNode[j].textContent);
			//authors can be seperated by "und" and "," if there are 3 or more authors
			//a comma can also mark the beginning of suffixes, which we want to delete
			//therefore we have to distinguish these two cases in the following
			var posUnd = authorString.indexOf("und");
			var posComma = authorString.indexOf(",");
			if (posUnd > posComma) {
				var posComma = authorString.indexOf(",",posUnd);
			}
			if (posComma > 0) {
				authorString = authorString.substr(0,posComma);
			}
			
			authorArray = authorString.split(/und|,/);
			for (var k=0; k<authorArray.length; k++) {
				var authorString = ZU.trimInternal(authorRemoveTitlesEtc(authorArray[k]));
				item.creators.push(ZU.cleanAuthor(authorString));
			}
			
			
		}
		
	}
	
	
	item.publicationTitle = ZU.xpathText(doc, '//li[@class="breadcurmbelemenfirst"]');
	item.journalAbbreviation = ZU.xpathText(doc, '//div[@id="doktoc"]/ul/li/a[2]');
	
	item.date = ZU.xpathText(doc, '//div[@id="doktoc"]/ul/li/ul/li/a[2]');
	
	//e.g. Heft 6 (Seite 141-162)
	item.issue = ZU.xpathText(doc, '//div[@id="doktoc"]/ul/li/ul/li/ul/li/a[2]').replace(/\([^\)]*\)/,"").match(/\d+/)[0];
	
	//e.g. ArbrAktuell 2014, 150
	var shortCitation = ZU.xpathText(doc, '//div[@class="dk2"]//span[@class="citation"]');
	var pagesStart = ZU.trimInternal(shortCitation.substr(shortCitation.lastIndexOf(",")+1));
	var pagesEnd = ZU.xpathText(doc, '(//span[@class="pg"])[last()]');
	if (pagesEnd) {
		item.pages = pagesStart + "-" + pagesEnd;
	} else {
		item.pages = pagesStart
	}
	
	item.abstractNote = ZU.xpathText(doc, '//div[@class="abstract"]') || ZU.xpathText(doc, '//div[@class="leitsatz"]');
	if (item.abstractNote){
		item.abstractNote = item.abstractNote.replace(/\n\s*\n/g, "\n");
	}
	
	if (item.itemType == "case") {
		var courtLine = ZU.xpath(doc, '//div[contains(@class, "gerzeile")]/p');
		item.court = ZU.xpathText(courtLine, './span[@class="gericht"]');
		item.dateDecided = ZU.xpathText(courtLine, './span[@class="edat"] | ./span[@class="datum"]');
		if (item.dateDecided){//e.g. 24. 9. 2001
			item.dateDecided = item.dateDecided.replace(/(\d\d?)\.\s*(\d\d?)\.\s*(\d\d\d\d)/, "$3-$2-$1");
		}
		//item.dateDecided.replace(/(\d\d?)\.\s*(\d\d?)\.\s(\d\d\d\d)/, "\3-\2-\1");
		item.docketNumber = ZU.xpathText(courtLine, './span[@class="az"]');
		item.history = ZU.xpathText(courtLine, './span[@class="vorinst"]');
		
		item.shortTitle = ZU.trimInternal(courtLine[0].textContent);
		
		item.reporter = item.journalAbbreviation;
		item.reporterVolume = item.date;
		
		var otherCitations = ZU.xpath(doc, '//li[contains(@id, "Parallelfundstellen")]');
		item.extra = "Parallelfundstellen: " + ZU.xpathText(otherCitations[0], './ul/li',  null, " ; ");
		
		var basedOnRegulations = ZU.xpathText(doc, '//div[contains(@class,"normenk")]');
		if (basedOnRegulations) {
			item.notes.push( ZU.trimInternal(basedOnRegulations) );
		}
		
	}
	
	if (documentClassName == "ZBUCHB") {
		item.extra = ZU.xpathText(doc, '//div[@class="biblio"]');
	}
		
	item.attachments = [{
		title: "Snapshot",
		document:doc
	}];

	item.complete();
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://beck-online.beck.de/default.aspx?vpath=bibdata%2Fzeits%2FDNOTZ-SONDERH%2F2012%2Fcont%2FDNOTZ-SONDERH.2012.88.1.htm",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"lastName": "Roth",
						"firstName": "Günter H.",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Snapshot"
					}
				],
				"title": "Best practice – Grundstrukturen des kontinentaleuropäischen Gesellschaftsrechts",
				"publicationTitle": "Sonderheft der Deutschen Notar-Zeitschrift",
				"journalAbbreviation": "DNotZ-Sonderheft",
				"date": "2012",
				"issue": "1",
				"pages": "88-95",
				"libraryCatalog": "beck-online"
			}
		]
	},
	{
		"type": "web",
		"url": "https://beck-online.beck.de/default.aspx?typ=reference&y=300&z=BKR&b=2001&s=99&n=1",
		"items": [
			{
				"itemType": "case",
				"creators": [],
				"notes": [
					"§ WPHG § 15 WpHG; § BOERSG § 88 BörsG; §§ BGB § 823, BGB § 826 BGB"
				],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Snapshot"
					}
				],
				"title": "Schadensersatz wegen fehlerhafter Ad-hoc-Mitteilungen („Infomatec”)",
				"publicationTitle": "Zeitschrift für Bank- und Kapitalmarktrecht",
				"journalAbbreviation": "BKR",
				"date": "2001",
				"issue": "2",
				"pages": "99-101",
				"abstractNote": "Leitsätze der Redaktion:\n    1. Ad-hoc-Mitteilungen richten sich nicht nur an ein bilanz- und fachkundiges Publikum, sondern an alle tatsächlichen oder potenziellen Anleger und Aktionäre.\n    2. \n    § BOERSG § 88 Abs. BOERSG § 88 Absatz 1 Nr. 1 BörsG dient neben dem Schutz der Allgemeinheit gerade auch dazu, das Vermögen des einzelnen Kapitalanlegers vor möglichen Schäden durch eine unredliche Beeinflussung der Preisbildung an Börsen und Märkten zu schützen.",
				"court": "LG Augsburg",
				"dateDecided": "2001-9-24",
				"docketNumber": "3 O 4995/00",
				"shortTitle": "LG Augsburg, Urteil vom 24. 9. 2001 - 3 O 4995/00 (nicht rechtskräftig)",
				"reporter": "BKR",
				"reporterVolume": "2001",
				"extra": "Parallelfundstellen: BB 2001 Heft 42, 2130 ; DB 2001, 2334 ; NJOZ 2001, 1878 ; NJW-RR 2001, 1705 ; NZG 2002, 429 ; WPM 2001, 1944 ; ZIP 2001, 1881 ; FHZivR 47 Nr. 2816 (Ls.) ; FHZivR 47 Nr. 6449 (Ls.) ; FHZivR 48 Nr. 2514 (Ls.) ; FHZivR 48 Nr. 6053 (Ls.) ; LSK 2001, 520032 (Ls.) ; NJW-RR 2003, 216 (Ls.)",
				"libraryCatalog": "beck-online"
			}
		]
	},
	{
		"type": "web",
		"url": "https://beck-online.beck.de/default.aspx?typ=reference&y=300&z=NJW&b=2014&s=898&n=1",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Boris",
						"lastName": "Scholtka"
					},
					{
						"firstName": "Antje",
						"lastName": "Baumbach"
					},
					{
						"firstName": "Marike",
						"lastName": "Pietrowicz"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Snapshot"
					}
				],
				"title": "Die Entwicklung des Energierechts im Jahr 2013",
				"publicationTitle": "Neue Juristische Wochenschrift",
				"journalAbbreviation": "NJW",
				"date": "2014",
				"issue": "13",
				"pages": "898-903",
				"abstractNote": "Der Bericht knüpft an die bisher in dieser Reihe erschienenen Beiträge zur Entwicklung des Energierechts (zuletzt NJW2013, NJW Jahr 2013 Seite 2724) an und zeigt die Schwerpunkte energierechtlicher Entwicklungen in Gesetzgebung und Rechtsanwendung im Jahr 2013 auf.",
				"libraryCatalog": "beck-online"
			}
		]
	},
	{
		"type": "web",
		"url": "https://beck-online.beck.de/?vpath=bibdata%2fzeits%2fGRUR%2f2003%2fcont%2fGRUR%2e2003%2eH09%2eNAMEINHALTSVERZEICHNIS%2ehtm",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://beck-online.beck.de/?words=njw+2014%2C+3329&btsearch.x=42&source=default&filter=spub1%3A%22Die+Leitsatzkartei+des+deutschen+Rechts+-+2014%22%7C&btsearch.x=0&btsearch.y=0",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Christoph",
						"lastName": "Basler"
					},
					{
						"firstName": "Klaus",
						"lastName": "Meßerschmidt"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Snapshot"
					}
				],
				"title": "Zumutbarkeit von Beweiserhebungen und Wohnungsbetroffenheit im Zivilprozess",
				"publicationTitle": "Neue Juristische Wochenschrift",
				"journalAbbreviation": "NJW",
				"date": "2014",
				"issue": "46",
				"pages": "3329-3334",
				"abstractNote": "Die Durchführung von Beweisverfahren ist mit Duldungs- und Mitwirkungspflichten von Beweisgegnern und Dritten verbunden, die nur über begrenzte Weigerungsrechte verfügen. Einen Sonderfall bildet der bei „Wohnungsbetroffenheit“ eingreifende letzte Halbsatz des § ZPO § 144 ZPO § 144 Absatz I 3 ZPO. Dessen Voraussetzungen und Reichweite bedürfen der Klärung. Ferner gibt die neuere Rechtsprechung Anlass zu untersuchen, inwieweit auch der Eigentumsschutz einer Beweisaufnahme entgegenstehen kann.",
				"libraryCatalog": "beck-online"
			}
		]
	},
	{
		"type": "web",
		"url": "https://beck-online.beck.de/Default.aspx?vpath=bibdata%2fzeits%2fGRUR%2f2014%2fcont%2fGRUR.2014.431.1.htm",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Stephanie",
						"lastName": "Zöllner"
					},
					{
						"firstName": "Philipp",
						"lastName": "Lehmann"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Snapshot"
					}
				],
				"title": "Kennzeichen- und lauterkeitsrechtlicher Schutz für Apps",
				"publicationTitle": "Gewerblicher Rechtsschutz und Urheberrecht",
				"journalAbbreviation": "GRUR",
				"date": "2014",
				"issue": "5",
				"pages": "431-437",
				"abstractNote": "Auf Grund der rasanten Entwicklung und der zunehmenden wirtschaftlichen Bedeutung von Apps kommen in diesem Zusammenhang immer neue rechtliche Probleme auf. Von den urheberrechtlichen Fragen bei der Entwicklung, über die vertragsrechtlichen Probleme beim Verkauf, bis hin zu Fragen der gewerblichen Schutzrechte haben sich Apps zu einem eigenen rechtlichen Themenfeld entwickelt. Insbesondere im Bereich des Kennzeichen- und Lauterkeitsrechts werden Rechtsprechung und Praxis vor neue Herausforderungen gestellt. Dieser Beitrag erörtert anhand von zwei Beispielsfällen die Frage nach den kennzeichen- und lauterkeitsrechtlichen Schutzmöglichkeiten von Apps, insbesondere der Übertragbarkeit bereits etablierter Grundsätze. Gleichzeitig werden die diesbezüglichen Besonderheiten herausgearbeitet.",
				"libraryCatalog": "beck-online"
			}
		]
	},
	{
		"type": "web",
		"url": "https://beck-online.beck.de/?typ=reference&y=300&b=2014&n=1&s=2261&z=DSTR",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Wolfgang",
						"lastName": "Joecks"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Snapshot"
					}
				],
				"title": "Der Regierungsentwurf eines Gesetzes zur Änderung der Abgaben- ordnung und des Einführungsgesetzes zur Abgabenordnung",
				"publicationTitle": "Deutsches Steuerrecht",
				"journalAbbreviation": "DStR",
				"date": "2014",
				"issue": "46",
				"pages": "2261-2267",
				"abstractNote": "Nachdem die Selbstanzeige nach § AO § 371 AO bereits im Frühjahr 2011 nur knapp einer Abschaffung entging und (lediglich) verschärft wurde, plant der Gesetzgeber nun eine weitere Einschränkung. Dabei unterscheiden sich der Referentenentwurf vom 27.8.2014 und der Regierungsentwurf vom 26.9.2014 scheinbar kaum; Details legen aber die Vermutung nahe, dass dort noch einmal jemand „gebremst“ hat. zur Fussnote 1",
				"libraryCatalog": "beck-online"
			}
		]
	},
	{
		"type": "web",
		"url": "https://beck-online.beck.de/default.aspx?vpath=bibdata%2Fzeits%2FDNOTZ-SONDERH%2F2012%2Fcont%2FDNOTZ-SONDERH.2012.88.1.htm",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"lastName": "Roth",
						"firstName": "Günter H.",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Snapshot"
					}
				],
				"title": "Best practice – Grundstrukturen des kontinentaleuropäischen Gesellschaftsrechts",
				"publicationTitle": "Sonderheft der Deutschen Notar-Zeitschrift",
				"journalAbbreviation": "DNotZ-Sonderheft",
				"date": "2012",
				"issue": "1",
				"pages": "88-95",
				"libraryCatalog": "beck-online"
			}
		]
	},
	{
		"type": "web",
		"url": "https://beck-online.beck.de/?words=njw+2014%2C+3329&btsearch.x=42&source=default&filter=spub1%3A%22Die+Leitsatzkartei+des+deutschen+Rechts+-+2014%22%7C&btsearch.x=0&btsearch.y=0",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Christoph",
						"lastName": "Basler"
					},
					{
						"firstName": "Klaus",
						"lastName": "Meßerschmidt"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Snapshot"
					}
				],
				"title": "Zumutbarkeit von Beweiserhebungen und Wohnungsbetroffenheit im Zivilprozess",
				"publicationTitle": "Neue Juristische Wochenschrift",
				"journalAbbreviation": "NJW",
				"date": "2014",
				"issue": "46",
				"pages": "3329-3334",
				"abstractNote": "Die Durchführung von Beweisverfahren ist mit Duldungs- und Mitwirkungspflichten von Beweisgegnern und Dritten verbunden, die nur über begrenzte Weigerungsrechte verfügen. Einen Sonderfall bildet der bei „Wohnungsbetroffenheit“ eingreifende letzte Halbsatz des § ZPO § 144 ZPO § 144 Absatz I 3 ZPO. Dessen Voraussetzungen und Reichweite bedürfen der Klärung. Ferner gibt die neuere Rechtsprechung Anlass zu untersuchen, inwieweit auch der Eigentumsschutz einer Beweisaufnahme entgegenstehen kann.",
				"libraryCatalog": "beck-online"
			}
		]
	},
	{
		"type": "web",
		"url": "https://beck-online.beck.de/default.aspx?vpath=bibdata/ents/lsk/2014/3500/lsk.2014.35.0537.htm&pos=1",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Daniel",
						"lastName": "Jipp",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Snapshot"
					}
				],
				"title": "Zum Folgenbeseitigungsanspruch bei Buchveröffentlichungen - Der Rückrufanspruch",
				"pages": "300",
				"date": "2014",
				"journalTitle": "AfP",
				"libraryCatalog": "beck-online"
			}
		]
	},
	{
		"type": "web",
		"url": "https://beck-online.beck.de/default.aspx?typ=reference&y=300&z=NJW&b=2014&s=898&n=1",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Boris",
						"lastName": "Scholtka"
					},
					{
						"firstName": "Antje",
						"lastName": "Baumbach"
					},
					{
						"firstName": "Marike",
						"lastName": "Pietrowicz"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Snapshot"
					}
				],
				"title": "Die Entwicklung des Energierechts im Jahr 2013",
				"publicationTitle": "Neue Juristische Wochenschrift",
				"journalAbbreviation": "NJW",
				"date": "2014",
				"issue": "13",
				"pages": "898-903",
				"abstractNote": "Der Bericht knüpft an die bisher in dieser Reihe erschienenen Beiträge zur Entwicklung des Energierechts (zuletzt NJW2013, NJW Jahr 2013 Seite 2724) an und zeigt die Schwerpunkte energierechtlicher Entwicklungen in Gesetzgebung und Rechtsanwendung im Jahr 2013 auf.",
				"libraryCatalog": "beck-online"
			}
		]
	}
]
/** END TEST CASES **/