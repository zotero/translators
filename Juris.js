{
	"translatorID": "bc2ec385-e60a-4899-96ae-d4f0d6574ad7",
	"label": "Juris",
	"creator": "Reto Mantz",
	"target": "^https?://(www\\.)?juris\\.de/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsv",
	"lastUpdated": "2014-11-02 12:57:22"
}

/*
***** BEGIN LICENSE BLOCK *****

	Juris Translator, Copyright © 2014 Reto Mantz
	
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

Disclaimer:
This is a translator written mainly for articles in the database of Juris (a German legal database).
*/


// Array with the different - recognized - types
var mappingClassNameToItemType = {
	'AUFSATZ' : 'journalArticle',
	'ANMERKUNG' : 'journalArticle',
	'RECHTSPRECHUNGSÜBERSICHT' : 'journalArticle',
	'RECHTSPRECHUNGSÜBERSICHT, AUFSATZ' : 'journalArticle',
	'AUFSATZ, KONGRESSVORTRAG' : 'journalArticle',
	'AUFSATZ, ANMERKUNG' : 'journalArticle',
	'ENTSCHEIDUNGSBESPRECHUNG, AUFSATZ' : 'journalArticle'
}
	
function detectWeb(doc, url) { 
	
	var myType = ZU.xpathText(doc, "//table[@class='TableRahmenkpl']/tbody/tr/td[1]/table/tbody/tr[2]/td[2]");

	if (myType == null) return false;
	myType = Zotero.Utilities.trimInternal(myType);
	
	// is the type we got from the XPath one we recognized? then return this type, otherwise return false
	var mappingtype = mappingClassNameToItemType[myType.toUpperCase()];
	// does the article have an author? 
	var myAuthorsString = scrapeAuthor(doc, url);
	
	if (mappingtype && myAuthorsString) {
		return mappingtype;
	}
}

function scrapeAuthor(doc, url) {
	return ZU.xpathText(doc, "//table[@class='TableRahmenkpl']/tbody/tr/td[1]/table/tbody/tr[1]/td[2]");
}


function doWeb (doc, url) {
	var newItem = new Zotero.Item("journalArticle");
	
	// scrape authors
	var myAuthorsString = scrapeAuthor(doc, url);
	
	// example: "Michael Fricke, Martin Gerecke"
	myAuthorsString = Zotero.Utilities.trimInternal(myAuthorsString);
	var myAuthors = myAuthorsString.split(",");

	for (var index = 0; index < myAuthors.length; ++index) {
		var author = Zotero.Utilities.trimInternal(myAuthors[index]);
		newItem.creators.push ( Zotero.Utilities.cleanAuthor(author, 'author', false) );
	}
	
	//scrape title
	var myTitle = ZU.xpathText(doc, "//div[@class='docLayoutTitel']");	
	newItem.title = myTitle;
	
	//scrape src
	//example 1: "AfP 2014, 293-299"
	//example 2: "ZStW 125, 259-298 (2013)"
	var mySrcString = ZU.xpathText(doc, "//table[@class='TableRahmenkpl']/tbody/tr/td[2]/table/tbody/tr[2]/td[2]");

	// find four digits in src (=date)
	var myDate = mySrcString.match(/\d\d\d\d/g);
	if (myDate) {
		newItem.date = myDate[0];
	}		

	// check whether srcString has format of example 1. If so, parse the string accordingly
	if (mySrcString[mySrcString.indexOf(myDate)+4] == ',') {
		
		//journal
		var journal = mySrcString.substr(0, mySrcString.indexOf(myDate)-1);
		newItem.publicationTitle = journal;
		newItem.journalAbbreviation = journal;
		
		//pages	
		newItem.pages = ZU.trimInternal(mySrcString.substr(mySrcString.lastIndexOf(",")+1));	
	}
	else {	// format is that of example 2 => different parsing mechanism
		// journal
		newItem.publicationTitle = mySrcString.substr(0,mySrcString.indexOf(" "));
		
		// find first digits in srcString (=issue no.)
		var firstDigits = mySrcString.match(/\d+/);
		if (firstDigits) {
			newItem.issue = firstDigits[0];
		}
		
		// find pages in srcString = ", abc-def "
		var pagesWithComma = mySrcString.match(/, \d+-\d+ /);
		// now copy the pages from the string  = "abc-def");
		if (pagesWithComma) {
			var pages = pagesWithComma[0].match(/\d+-\d+/);
			if (pages) {
				newItem.pages = pages[0];
			}
		}		
	}
	
	newItem.attachments = [{
		title: "Snapshot",
		document:doc
	}];
	
//	Zotero.debug(newItem);
	newItem.complete();
}