{
	"translatorID": "bc2ec385-e60a-4899-96ae-d4f0d6574ad7",
	"label": "Juris (German legal database)",
	"creator": "rm2342",
	"target": "^http?://(?:www\\.)?juris.de",
	"minVersion": "1.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "g",
	"lastUpdated": "2014-10-29 15:54:37"
}

/*
Translator for Juris (German legal database) for Zotero

***** BEGIN LICENSE BLOCK *****

v1.0 rm2342

	
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


// Array mit unterschiedlichen - erkannten - Typen
var mappingClassNameToItemType = {
	'AUFSATZ' : 'journalArticle',
	'ANMERKUNG' : 'journalArticle',
	'RECHTSPRECHUNGSÜBERSICHT' : 'journalArticle',
	'RECHTSPRECHUNGSÜBERSICHT, AUFSATZ' : 'journalArticle',
	'AUFSATZ, KONGRESSVORTRAG' : 'journalArticle'
}

// XPath zur Angabe des Beitragstyps
	
function detectWeb(doc, url) { 

	var xpathtype = "//table[@class='TableRahmenkpl']/tbody/tr/td[1]/table/tbody/tr[2]/td[2]";
	var elements = Zotero.Utilities.gatherElementsOnXPath(doc, doc, xpathtype);
	var myType = Zotero.Utilities.xpathText(elements, xpathtype);
	//Zotero.debug(myType);	

	if (myType == null) return false;
		myType = Zotero.Utilities.trimInternal(myType);
	
	// is the type we got from the XPath one we recognized? then return this type, otherwise return false
	if (mappingClassNameToItemType[myType.toUpperCase()])
		return (mappingClassNameToItemType[myType.toUpperCase()]);
	else return false;	
}


function doWeb(doc, url) { 
	// is the detected type one we recognize?
	if (detectWeb(doc, url) == 'journalArticle') {
	
		scrape(doc, url);
	}
	else return ; 
}

function getXPathContent(doc, xpath) {
	var elements = Zotero.Utilities.gatherElementsOnXPath(doc, doc, xpath);
	var content = Zotero.Utilities.xpathText(elements, xpath);
	return content;
}

// does the actual scraping
function scrape (doc, url) {
//	Zotero.debug("--scrape--");
	var newItem = new Zotero.Item("journalArticle");
	
	// scrape authors
	var xpathauthors = "//table[@class='TableRahmenkpl']/tbody/tr/td[1]/table/tbody/tr[1]/td[2]";
	var myAuthorsString = getXPathContent(doc, xpathauthors);

	if (myAuthorsString == null) return false;
	myAuthorsString = Zotero.Utilities.trimInternal(myAuthorsString);
	var myAuthors = myAuthorsString.split(",");
	var myAuthorsItems = new Array();

	for (index = 0; index < myAuthors.length; ++index) {
		var author = Zotero.Utilities.trimInternal(myAuthors[index]);
		myAuthorsItems.push ( Zotero.Utilities.cleanAuthor(author, 'author', false) );
	}
	newItem.creators = myAuthorsItems;
	
	//scrape title
	var xpathtitle = "//div[@class='docLayoutTitel']";
	var myTitle = getXPathContent(doc, xpathtitle);	
	newItem.title = myTitle;
	
	//scrape src
	var xpathsrc = "//table[@class='TableRahmenkpl']/tbody/tr/td[2]/table/tbody/tr[2]/td[2]";
	var mySrcString = getXPathContent(doc, xpathsrc);

	// find four digits in src (=date)
	var myDate = mySrcString.match(/\d\d\d\d+/g);
	if (myDate) newItem.date = myDate[0];

	//journal
	var myJournal = mySrcString.substr(0, mySrcString.indexOf(myDate)-1);
	
	//pages	
	var pages = ZU.trimInternal(mySrcString.substr(mySrcString.lastIndexOf(",")+1));
	newItem.pages = pages;	
	
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
		"url": "http://www.juris.de/jportal/portal/t/18dq/page/jurisw.psml?doc.hl=1&doc.id=SBLU000100514&documentnumber=16&numberofresults=15000&showdoccase=1&doc.part=S&paramfromHL=true#focuspoint",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Jochen",
						"lastName": "Glöckner",
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
				"title": "Die Folgen der Verbraucherrechterichtlinie und ihrer Umsetzung für Bauverträge",
				"date": "2014",
				"pages": "411-431",
				"libraryCatalog": "Juris (German legal database)"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.juris.de/jportal/portal/t/18dq/page/jurisw.psml?doc.hl=1&doc.id=SBLU000467214&documentnumber=17&numberofresults=15000&showdoccase=1&doc.part=S&paramfromHL=true#focuspoint",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Jens",
						"lastName": "Joseph",
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
				"title": "Bring Your Own Device: Motivation oder Risiko für Geheimnis- und Datenverlust?",
				"date": "2014",
				"pages": "136-137",
				"libraryCatalog": "Juris (German legal database)",
				"shortTitle": "Bring Your Own Device"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.juris.de/jportal/portal/t/18dq/page/jurisw.psml?doc.hl=1&doc.id=SBLU000132014&documentnumber=22&numberofresults=15000&showdoccase=1&doc.part=S&paramfromHL=true#focuspoint",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Christian",
						"lastName": "Bommarius",
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
				"title": "Dank an Talleyrand",
				"date": "2014",
				"pages": "60",
				"libraryCatalog": "Juris (German legal database)"
			}
		]
	}
]
/** END TEST CASES **/
