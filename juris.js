{
	"translatorID": "bc2ec385-e60a-4899-96ae-d4f0d6574ad7",
	"label": "Juris",
	"creator": "rm2342",
	"target": "^(http|https)?://(?:www\\.)?juris.de",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsv",
	"lastUpdated": "2014-10-30 11:14:47"
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

	var xpathtype = "//table[@class='TableRahmenkpl']/tbody/tr/td[1]/table/tbody/tr[2]/td[2]";
	var myType = ZU.xpathText(doc, xpathtype);

	if (myType == null) return false;
	myType = Zotero.Utilities.trimInternal(myType);
	
	// is the type we got from the XPath one we recognized? then return this type, otherwise return false
	var mappingtype = mappingClassNameToItemType[myType.toUpperCase()];
	// does the article have an author? 
	var myAuthorsString = ZU.xpathText(doc, "//table[@class='TableRahmenkpl']/tbody/tr/td[1]/table/tbody/tr[1]/td[2]");
	
	if ((mappingClassNameToItemType[myType.toUpperCase()]) && (myAuthorsString != null))
		return (mappingtype);
	else return false;	
}

function doWeb(doc, url) { 
		scrape(doc, url);
}


// does the actual scraping
function scrape (doc, url) {
//	Zotero.debug("--scrape--");
	var newItem = new Zotero.Item("journalArticle");
	
	// scrape authors
	var xpathauthors = "//table[@class='TableRahmenkpl']/tbody/tr/td[1]/table/tbody/tr[1]/td[2]";
	var myAuthorsString = ZU.xpathText(doc, xpathauthors);

	myAuthorsString = Zotero.Utilities.trimInternal(myAuthorsString);
	var myAuthors = myAuthorsString.split(",");

	for (var index = 0; index < myAuthors.length; ++index) {
		var author = Zotero.Utilities.trimInternal(myAuthors[index]);
		newItem.creators.push ( Zotero.Utilities.cleanAuthor(author, 'author', false) );
	}
	
	//scrape title
	var xpathtitle = "//div[@class='docLayoutTitel']";
	var myTitle = ZU.xpathText(doc, xpathtitle);	
	newItem.title = myTitle;
	
	//scrape src
	var xpathsrc = "//table[@class='TableRahmenkpl']/tbody/tr/td[2]/table/tbody/tr[2]/td[2]";
	var mySrcString = ZU.xpathText(doc, xpathsrc);

	// find four digits in src (=date)
	var myDate = mySrcString.match(/\d\d\d\d+/g);
	if (myDate) {
		newItem.date = myDate[0];
	}
	else {
		myDate = "";
	}

	//journal
	var journal = mySrcString.substr(0, mySrcString.indexOf(myDate)-1);
	newItem.publicationTitle = journal;
	newItem.journalAbbreviation = journal;
	
	//pages	
	newItem.pages = ZU.trimInternal(mySrcString.substr(mySrcString.lastIndexOf(",")+1));	
	
	newItem.attachments = [{
		title: "Snapshot",
		document:doc
	}];
	
//	Zotero.debug(newItem);
	newItem.complete();
}
