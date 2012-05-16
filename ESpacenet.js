{
	"translatorID": "176948f7-9df8-4afc-ace7-4c1c7318d426",
	"label": "ESpacenet",
	"creator": "Sebastian Karcher",
	"target": "^https?://worldwide\\.espacenet\\.com/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2012-05-02 18:57:58"
}

/*
	***** BEGIN LICENSE BLOCK *****
	
	ESpacenet translator - Copyright © 2011 Sebastian Karcher
	
	This file is part of Zotero.
	
	Zotero is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.
	
	Zotero is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU Affero General Public License for more details.
	
	You should have received a copy of the GNU Affero General Public License
	along with Zotero.  If not, see <http://www.gnu.org/licenses/>.
	
	***** END LICENSE BLOCK *****
*/

function detectWeb(doc, url) {
	if(url.match("searchResults\?")) {
			return "multiple";
		} else if (doc.location.href.match("biblio")) {
			return "patent";
		}
  }

function associateData(newItem, dataTags, field, zoteroField) {
	if (dataTags[field]) {
		newItem[zoteroField] = dataTags[field];
	}
}

function scrape(doc, url) {
	var dataTags = new Object();
	var newItem = new Zotero.Item("patent");
	var fields = ZU.xpath(doc, '//table[contains(@class, "tableType")]/tbody/tr/th[contains(@class, "Table")]');
	var contents = ZU.xpath(doc, '//table[contains(@class, "tableType")]/tbody/tr/td[contains(@class, "Table")]');
	var count = fields.length;

	newItem.title = ZU.xpathText(doc, '//div[@id="pagebody"]/h3');

		// In the very common case of all-caps, fix them!
		if (newItem.title == newItem.title.toUpperCase()) {
			newItem.title = Zotero.Utilities.capitalizeTitle(newItem.title.toLowerCase(), true);
		}
	newItem.attachments = [{url:doc.location.href, title:"Espacenet patent record"}];	
	newItem.date = ZU.xpathText(doc, '//h1').match(/(?:―)(.+)/)[1];
	newItem.abstractNote = ZU.xpathText(doc, '//p[@class="printAbstract"]');
	for (i=0; i<count; i++){
		var field = fields[i].textContent.trim();
		var content = contents[i].textContent.trim();
		//Z.debug("field: " + field + " content: " + content)
		dataTags[field] = content;
		if (field == "Inventor(s):"){
		  var inventors= ZU.xpathText(contents[i], './span').replace(/\(|\)/g, "").trim();
		  	if (inventors == inventors.toUpperCase()) {
				inventors = Zotero.Utilities.capitalizeTitle(inventors.toLowerCase(), true);
			}
		  	if (inventors){
		  		var inventor = inventors.split(/\s*;\s*/);
				for (i in inventor)	{
					inventor[i] = inventor[i].replace(/,$/, "");
					newItem.creators[i] = ZU.cleanAuthor(inventor[i], "inventor", inventor[i].match(/,/));
				}	  
		  	}
		}
		
		if (field == "Applicant(s):"){
			newItem.assignee = ZU.trimInternal(ZU.xpathText(contents[i], './text()[1]').trim());		
			if (newItem.assignee == newItem.assignee.toUpperCase()) {
				newItem.assignee = Zotero.Utilities.capitalizeTitle(newItem.assignee.toLowerCase(), true);
			}		
		}
		
		if (field =="Classification:"){
			var	CIB = ZU.trimInternal(content).match(/(?:international:)(.*?)\-/)[1];
			var ECLA = ZU.trimInternal(content).match(/(?:European:)(.*)/)[1];    
		}
		//Z.debug("field: " + field + " content: " + dataTags[field])
	}
	newItem.extra= "CIB: " + CIB + "\nECLA: " + ECLA;
   //these might not be complete - it's pretty straightforward to add more
	associateData(newItem, dataTags, "Application number:", "applicationNumber");
	associateData(newItem, dataTags, "Priority number(s):", "priorityNumbers");
	newItem.complete();
}

function doWeb(doc, url) {
	if (detectWeb(doc, url)=="multiple"){
		var hits = {};
		var urls = [];
		var results = ZU.xpath(doc,"//span[@class='resNumber']/a");
		for (var i in results) {
			hits[results[i].href] = results[i].textContent.trim();
		}
		Z.selectItems(hits, function(items) {
			if (items == null) return true;
			for (var j in items) {
				urls.push(j);
			}
			Zotero.Utilities.processDocuments(urls, scrape, function () {
				Zotero.done();
			});
		});
	}
	else{
	scrape(doc, url);	
	}
}   
  /** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://worldwide.espacenet.com/searchResults?DB=worldwide.espacenet.com&locale=en_EP&query=cell+phone&ST=singleline&compact=false",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://worldwide.espacenet.com/publicationDetails/biblio?DB=worldwide.espacenet.com&II=2&ND=3&adjacent=true&locale=en_EP&FT=D&date=20120426&CC=WO&NR=2012054443A1&KC=A1",
		"items": [
			{
				"itemType": "patent",
				"creators": [
					{
						"firstName": "Willie",
						"lastName": "Blount",
						"creatorType": "inventor"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Espacenet patent record"
					}
				],
				"title": "Electronic Control Glove",
				"date": "2012-04-26",
				"abstractNote": "Many people active and inactive can't readily control their audio experience without reaching into a pocket or some other location to change a setting or answer the phone. The problem is the lack of convenience and the inaccessibility when the user is riding his motorcycle, skiing, bicycling, jogging, or even walking with winter gloves on, etc. The electronic control glove described here enables enhanced control over electronic devices wirelessly at all times from the user's fingertips. The glove is manufactured with electrical conducive materials along the fingers and the thumb, where contact with the thumb and finger conductive materials creates a closed circuit which is transmitted to a control device on the glove that can then wirelessly transmit messages to remote electronic devices such as cell phones, audio players, garage door openers, military hardware and software, in work environments, and so forth.",
				"assignee": "Blue Infusion Technologies Llc [us]; Blount Willie Lee Jr [us]",
				"extra": "CIB:  G06F3/033; G09G5/08 \nECLA:",
				"applicationNumber": "WO2011US56657 20111018",
				"priorityNumbers": "US20100394879P 20101020;\n                \n                    US20100394013P 20101018",
				"libraryCatalog": "ESpacenet"
			}
		]
	},
	{
		"type": "web",
		"url": "http://worldwide.espacenet.com/publicationDetails/biblio?DB=worldwide.espacenet.com&II=4&ND=3&adjacent=true&locale=en_EP&FT=D&date=20120426&CC=US&NR=2012101951A1&KC=A1#",
		"items": [
			{
				"itemType": "patent",
				"creators": [
					{
						"firstName": "Li",
						"lastName": "Michael",
						"creatorType": "inventor"
					},
					{
						"firstName": "Shakula",
						"lastName": "Yuri",
						"creatorType": "inventor"
					},
					{
						"firstName": "Rodriguez",
						"lastName": "Martin",
						"creatorType": "inventor"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Espacenet patent record"
					}
				],
				"title": "Method and System for Secure Financial Transactions Using Mobile Communications Devices",
				"date": "2012-04-26",
				"abstractNote": "The present invention employs public key infrastructure to electronically sign and encrypt important personal information on a mobile communications device (MCD), without disclosing private, personal information to the transaction counterparts and middleman, thus preserving highly elevated and enhanced security and fraud protection. In one embodiment, the present invention can use a mobile device identifier, such as a cell phone number or email address, for example, as an index/reference during the entire transaction, so that only the account holder and the account issuer know the underlying account number and other private information.",
				"extra": "CIB: undefined\nECLA: undefined",
				"applicationNumber": "US201113172170 20110629",
				"priorityNumbers": "US201113172170 20110629;\n                \n                    US20100406097P 20101022",
				"libraryCatalog": "ESpacenet"
			}
		]
	}
]
/** END TEST CASES **/