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
	"lastUpdated": "2014-11-08 20:21:59"
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

	// match example 1
	var matchSrc = mySrcString.match(/^([^,]+)\s(\d{4})\s*,\s*(\d+(?:-\d+)?)\s*$/);
	if (matchSrc) {
		newItem.publicationTitle = ZU.trimInternal(matchSrc[1]);
		newItem.journalAbbreviation = newItem.publicationTitle;
		newItem.date = matchSrc[2];
		newItem.pages = matchSrc[3];
	}
	// match example 2
	else if (matchSrc = mySrcString.match(/^([^,]+)\s(\d+)\s*,\s*(\d+(?:-\d+)?)\s*\((\d{4})\)\s*$/)) {
			newItem.publicationTitle = ZU.trimInternal(matchSrc[1]);
			newItem.journalAbbreviation = newItem.publicationTitle;
			newItem.issue = matchSrc[2];
			newItem.pages = matchSrc[3];
			newItem.date = matchSrc[4];
	}
	
	newItem.attachments = [{
		title: "Snapshot",
		document:doc
	}];
	
//	Zotero.debug(newItem);
	newItem.complete();
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.juris.de/jportal/portal/t/e44/page/jurisw.psml?doc.hl=1&doc.id=SBLU000136614&documentnumber=1&numberofresults=1&showdoccase=1&doc.part=S&paramfromHL=true#focuspoint",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Nina",
						"lastName": "Nestler",
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
				"title": "Der Schutz der äußeren Sicherheit Deutschlands durch das Strafrecht",
				"publicationTitle": "ZStW",
				"journalAbbreviation": "ZStW",
				"issue": "125",
				"pages": "259-298",
				"date": "2013",
				"libraryCatalog": "Juris"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.juris.de/jportal/portal/t/e4k/page/jurisw.psml?doc.hl=1&doc.id=SILU000241514&documentnumber=1&numberofresults=1&showdoccase=1&doc.part=S&paramfromHL=true#focuspoint",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Michael",
						"lastName": "Fricke",
						"creatorType": "author"
					},
					{
						"firstName": "Martin",
						"lastName": "Gerecke",
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
				"title": "Informantenschutz und Informantenhaftung",
				"publicationTitle": "AfP",
				"journalAbbreviation": "AfP",
				"date": "2014",
				"pages": "293-299",
				"libraryCatalog": "Juris"
			}
		]
	}
]
/** END TEST CASES **/
