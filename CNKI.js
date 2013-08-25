{
	"translatorID": "5c95b67b-41c5-4f55-b71a-48d5d7183063",
	"label": "CNKI",
	"creator": "Aurimas Vinckevicius",
	"target": "^https?://(?:[^/]+\\.)?cnki.net",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcs",
	"lastUpdated": "2013-08-25 02:58:03"
}

/*
   CNKI(China National Knowledge Infrastructure) Translator
   Copyright (C) 2013 Aurimas Vinckevicius

   This program is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 3 of the License, or
   (at your option) any later version.

   This program is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

// fetches Refworks record for provided IDs and calls next with resulting text
// ids should be in the form [{dbname: "CDFDLAST2013", filename: "1013102302.nh"}]
function getRefworksByID(ids, next) {
	var postData = "";
	for(var i=0, n=ids.length; i<n; i++) {
		postData += ids[i].dbname + "!" + ids[i].filename + "!0!0,";
	}
	postData = "formfilenames=" + encodeURIComponent(postData);
	
	ZU.doPost('http://epub.cnki.net/kns/ViewPage/viewsave.aspx?TablePre=SCDB', postData, function() {
		ZU.doPost(
			'http://epub.cnki.net/KNS/ViewPage/SaveSelectedNoteFormat.aspx?type=txt',
			'CurSaveModeType=REFWORKS',
			next
		);
	});
}

function getIDFromURL(url) {
	if(!url) return;
	
	var dbname = url.match(/[?&]dbname=([^&#]*)/i);
	var filename = url.match(/[?&]filename=([^&#]*)/i);
	if(!dbname || !dbname[1] || !filename || !filename[1]) return;
	
	return {dbname: dbname[1], filename: filename[1], url: url};
}

function getTypeFromDBName(dbname) {
	switch(dbname.substr(0,4).toUpperCase()) {
		case "CJFQ":
		case "CJFD":
			return "journalArticle";
		case "CDFD":
		case "CMFD":
		case "CLKM":
			return "thesis";
		case "CPFD":
			return "conferencePaper";
		case "CCND":
			return "newspaperArticle";
		default:
			return;
	}
}

function getItemsFromSearchResults(doc, url) {
	var links = doc.getElementsByClassName('fz14');
	if(!links.length) return;
	
	var items = {};
	var count = 0;
	for(var i=0, n=links.length; i<n; i++) {
		var title = ZU.xpathText(links[i], './node()[not(name()="SCRIPT")]', null, '');
		if(title) title = ZU.trimInternal(title);
		var id = getIDFromURL(links[i].href);
		if(!title || !id) continue;
		
		count++;
		items[links[i].href] = title;
	}
	
	if(count) return items;
}

function detectWeb(doc, url) {
	var id = getIDFromURL(url);
	if(id) {
		return getTypeFromDBName(id.dbname);
	}
	
	var items = getItemsFromSearchResults(doc, url);
	if(items) return "multiple";
}

function doWeb(doc, url) {
	if(detectWeb(doc, url) == "multiple") {
		var items = getItemsFromSearchResults(doc, url);
		Z.selectItems(items, function(selectedItems) {
			if(!selectedItems) return true;
			
			var ids = [];
			for(var url in selectedItems) {
				ids.push(getIDFromURL(url));
			}
			scrape(ids);
		});
	} else {
		scrape([getIDFromURL(url)]);
	}
}

function scrape(ids) {
	getRefworksByID(ids, function(text) {
Z.debug(text);
		//fix item types
		text = text.replace(/RT\s+Dissertation\/Thesis/mi, 'RT Dissertation')
		//split authors
			.replace(/^(A[1-4]|U2)\s*([^\r\n]+)/m, function(m, tag, authors) {
				var authors = authors.split(';');
				if(!authors[authors.length-1].trim()) authors.pop();
				
				return tag + ' ' + authors.join('\n' + tag + ' ');
			})

		var translator = Z.loadTranslator('import');
		translator.setTranslator('1a3506da-a303-4b0a-a1cd-f216e6138d86'); //Refworks
		translator.setString(text);
		
		var i = 0;		
		translator.setHandler('itemDone', function(obj, newItem) {
			newItem.url = ids[i].url;
			
			i++;
			newItem.complete();
		});
		
		translator.translate();
	})
}