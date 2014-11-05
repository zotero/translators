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
	"lastUpdated": "2014-10-31 07:30:35"
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
		var author = Zotero.Utilities.trimInternal(authors[index]);
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
		item.journalTitle = ZU.trimInternal(m[1]);
		if (m[2]) item.date = m[2];
		item.pages = m[3];
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
			var authorString = authorNode[j].textContent.replace(/\/|Dr\. (h\. c\.)?|Professor|wiss\.? Mitarbeiter(in)?|RA,?|FAArbR|Fachanwalt für Insolvenzrecht|Rechtsanwalt|Rechtsanwältin|Rechtsanwälte|Richter am AG|Richter am BGH|zur Fussnote|\*|, LL.M.|^Von/g,"");
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
			//Z.debug(authorString);
			
			authorArray = authorString.split(/und|,/);
			for (var k=0; k<authorArray.length; k++) {
				item.creators.push(ZU.cleanAuthor(ZU.trimInternal(authorArray[k])));
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
		//Z.debug(courtLine);
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
				"date": "2014",
				"publicationTitle": "AfP",
				"journalAbbreviation": "AfP",
				"pages": "300",
				"libraryCatalog": "beck-online"
			}
		]
	}
]
/** END TEST CASES **/