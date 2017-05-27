{
	"translatorID": "51e5355d-9974-484f-80b9-f84d2b55782e",
	"label": "Wikidata QuickStatements",
	"creator": "Philipp Zumstein",
	"target": "txt",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 2,
	"browserSupport": "gcs",
	"lastUpdated": "2017-05-27 18:00:00"
}


/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2017 Philipp Zumstein

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


var typeMapping = {
	"book" : "Q571",
	"journalArticle" : "Q13442814"
};

//simple properties with string values can be simply mapped here
var propertyMapping = {
	"P356" : "doi",
	"P953" : "url",
	"P478" : "volume",
	"P433" : "issue",
	"P304" : "pages"
};

var languageMapping = {
	"en" : "Q1860",
	"it" : "Q652",
	"de" : "Q188",
	"ger" : "Q188",
	"fr" : "Q150"
};

var identifierMapping = {
	"PMID" : "P698",
	"PMCID" : "P932",
	"JSTOR ID" : "P888",
	"arXiv" : "P818",
	"Open Library ID" : "P648",
	"OCLC" : "P243"
};


function doExport() {
	var item;
	while ((item = Zotero.nextItem())) {
		
		Zotero.write('CREATE\n');
		if (typeMapping[item.itemType]) {
			Zotero.write('LAST	P31	' + typeMapping[item.itemType] + '\n');
		}
		Zotero.write('LAST	Len	"' + item.title + '"\n');
		
		for (var pnumber in propertyMapping) {
			var zfield = propertyMapping[pnumber];
			if (item[zfield]) {
				Zotero.write('LAST	' + pnumber + '	"' + item[zfield] + '"\n');
			}
		}
		
		for (var i=0; i<item.creators.length; i++) {
			var creatorValue = item.creators[i].lastName;
			var creatorType = item.creators[i].creatorType;
			if (item.creators[i].firstName) {
				creatorValue = item.creators[i].firstName + ' ' + creatorValue;
			}
			if (creatorType=="author") {
				Zotero.write('LAST	P2093	"' + creatorValue + '"\n');
			}
			//other creatorTypes are ignored, because they would need to point an item, rather than just writing the string value
		}
		
		if (item.date) {
			//e.g. +1967-01-17T00:00:00Z/11
			var formatedDate = ZU.strToISO(item.date);
			switch(formatedDate.length) {
				case 4:
					formatedDate = formatedDate + "-00-00T00:00:00Z/9";
					break;
				case 7:
					formatedDate = formatedDate + "-00T00:00:00Z/10";
					break;
				case 10:
					formatedDate = formatedDate + "T00:00:00Z/11";
					break;
				default:
					formatedDate = formatedDate + "/11";
			}
			Zotero.write('LAST	P577	+' + formatedDate + '\n');
		}
		
		if (item.ISBN) {
			var isbnDigits = item.ISBN.replace(/\-/g, '');
			if (isbnDigits.length==13) {
				Zotero.write('LAST	P212	"' + item.ISBN + '"\n');
			}
			if (isbnDigits.length==10) {
				Zotero.write('LAST	P957	"' + item.ISBN + '"\n');
			}
		}
		
		if (item.language) {
			item.language = item.language.toLowerCase();
			if (languageMapping[item.language]) {
				Zotero.write('LAST	P407	' + languageMapping[item.language] + '\n');
				Zotero.write('LAST	P1476	' + item.language + ':"' + item.title + '"\n');
			}
		}
		
		if (item.extra) {
			var extraLines = item.extra.split('\n');
			for (var i=0; i<extraLines.length; i++) {
				var colon = extraLines[i].indexOf(':');
				if (colon>-1) {
					var label = extraLines[i].substr(0,colon);
					var value = extraLines[i].substr(colon+1);
					if (identifierMapping[label]) {
						Zotero.write('LAST	' + identifierMapping[label] + '	"' + value.trim() + '"\n');
					}
				}
			}
		}
	}
}
