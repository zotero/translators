{
	"translatorID": "29051e64-8eba-4b26-bbf1-0c224bc59497",
	"label": "ISTC",
	"creator": "Maike Kittelmann",
	"target": "^https?://data\\.cerl\\.org/istc/(_search|i[a-z]\\d{8})",
	"minVersion": "",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcs",
	"lastUpdated": "2016-09-28 13:09:43"
}

/*
	***** BEGIN LICENSE BLOCK *****
	
	RKE Web translator Copyright © 2016 Maike Kittelmann
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
	if ( getSearchResults(doc, true, url) ) {
		if (url.match('_search?')){
			return "multiple";
		}
		else if (url.match(/i[a-z]\d{8}/)){
			return 'book';
		}
	}
}


function getSearchResults(doc, checkOnly, url) {
	var items = { };
	var found = false;
	if (url.match('_search?')){
		var rows = ZU.xpath(doc, '//p[contains(@class, "ample-shortlist-item-entry")]/a[contains(@href, "/istc/i")]' );
		for (i=0; i<rows.length; i++) {
			var title = ZU.trimInternal(rows[i].textContent);
			var href = rows[i].href + '?format=json';
			if (!href || !title) continue;
			if (checkOnly) return true;
			found = true;
			items[href] = title;
		}
	}
	else {
		var title = ZU.trimInternal( ZU.xpath(doc, '//div[contains(@class, "ample-record")]/h3' )[0].textContent );
		if (!title) return false;
		if (checkOnly) return true;
		items[url] = title;
	}
	return found ? items : false;
}


function doWeb(doc, url) {
	if ( detectWeb(doc, url) == "multiple" ) {
		Zotero.selectItems( getSearchResults(doc, false, url), function (items) {
			if (!items) {
				return true;
			}
			var books = [];
			for (var i in items) {
				books.push(i);
			}
		ZU.doGet(Object.keys(items), scrape);
		} );
	} 
	else if ( detectWeb(doc, url) == "book" ){
		ZU.doGet( url + '?format=json', scrape );
	}
}


function scrape( response, obj, url ) {
		var jsonObject = JSON.parse( response );
		var item = new Zotero.Item();
		var name =  jsonObject.data.author;
		var cleanNameObj = Zotero.Utilities.cleanAuthor(name, "author", true);
		item.creators[0] = cleanNameObj;
		item.title = jsonObject.data.title;
		item.url = url.replace('?format=json', '');
		item.place = jsonObject.data.imprint[0].imprint_place;
		item.publisher = jsonObject.data.imprint[0].imprint_name;
		item.date = jsonObject.data.imprint[0].imprint_date;
		item.notes = [ jsonObject.data.imprint[0].geo_info.geonames_id || '' ] ;
		item.callNumber = 'ISTC' + jsonObject._id;
		item.extra = jsonObject.data.notes[0];
		item.language = jsonObject.data.language_of_item;
		item.seeAlso = [ jsonObject.data.references[0].reference_name + ' ' + jsonObject.data.references[0].reference_location_in_source ];
		item.libraryCatalog = 'Incunabula Short Title Catalogue (ISTC)';
		item.tags = ['incunabula', 'istc'] ;
		item.accessed = new Date().toString();
		item.itemType = "book";
		// // Uncomment the following if you always want to save the page as attachment:
		// item.attachments = [{
		//	url: url.replace('?format=json', ''),
		//	title: "ISTC",
		//	mimeType: "text/html",
		//	snapshot: true
		// }];		
		item.complete();
}


function scrape_old( items ) {
	for each (url in Object.keys( items ) ){
		var response = httpGet( url );
		var jsonObject = JSON.parse(response);
		var item = new Zotero.Item();
		var name =  jsonObject.data.author;
		var cleanNameObj = Zotero.Utilities.cleanAuthor(name, "author", true);
		item.url = url.replace('?format=json', '');
		item.creators[0] = cleanNameObj;
		item.title = jsonObject.data.title;
		item.place = jsonObject.data.imprint[0].imprint_place;
		item.publisher = jsonObject.data.imprint[0].imprint_name;
		item.date = jsonObject.data.imprint[0].imprint_date;
		item.notes += [ jsonObject.data.imprint[0].geo_info.geonames_id || '' ] ;
		item.callNumber = 'ISTC' + jsonObject._id;
		item.extra = jsonObject.data.notes[0];
		item.language = jsonObject.data.language_of_item;
		item.seeAlso = [ jsonObject.data.references[0].reference_name + ' ' + jsonObject.data.references[0].reference_location_in_source ];
		item.libraryCatalog = 'Incunabula Short Title Catalogue (ISTC)';
		item.tags = ['incunabula', 'istc'] ;
		item.accessed = new Date().toString();
		item.itemType = "book";
		item.complete();
	}
}





/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://data.cerl.org/istc/if00117000",
		"items": [
			{
				"itemType": "book",
				"title": "Propositiones ex omnibus Aristotelis libris excerptae. Add: Benedictus Soncinas",
				"creators": [
					{
						"firstName": "Theophilus de",
						"lastName": "Ferrariis",
						"creatorType": "author"
					}
				],
				"date": "3 Aug. 1493",
				"callNumber": "ISTCif00117000",
				"extra": "Contains extracts from Latin translations of Aristotle by Leonardus Brunus Aretinus, etc. The translation of De mirabilibus auscultationibus by Antonius Beccaria is given entire (ff.113-128v)",
				"language": "lat",
				"libraryCatalog": "Incunabula Short Title Catalogue (ISTC)",
				"place": "Venice",
				"publisher": "Johannes and Gregorius de Gregoriis, de Forlivio, for Alexander Calcedonius",
				"shortTitle": "Propositiones ex omnibus Aristotelis libris excerptae. Add",
				"url": "http://data.cerl.org/istc/if00117000",
				"attachments": [],
				"tags": [
					"incunabula",
					"istc"
				],
				"notes": [
					""
				],
				"seeAlso": [
					"Goff F117"
				]
			}
		]
	},
	{
		"type": "web",
		"url": "http://data.cerl.org/istc/_search?query=aristotle",
		"items": "multiple"
	}
]
/** END TEST CASES **/