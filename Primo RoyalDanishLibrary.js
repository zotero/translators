{
	"translatorID": "56975263-4b26-4b94-8173-d6a47bf98df8",
	"label": "Primo RoyalDanishLibrary",
	"creator": "Hasse Feldthaus",
	"target": "rex.kb.dk/primo_library",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 90,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcs",
	"lastUpdated": "2013-11-19 16:49:59"
}

/*
Royal Danish Library Translator
Copyright (C) 2013 The Royal Danish Library

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program. If not, see <http://www.gnu.org/licenses/>.
*/

/*
This translator is based on the Primo translator made by Matt Burton, Avram Lyon, Etienne Cavalié, Rintze Zelle, Philipp Zumstein, Sebastian Karcher, Aurimas Vinckevicius
The Royal Danish Library is using Primo, but with a responsive bootstrap frontend thus the need for a new translator.
Notice that this translator needs a lower priority than 100, since the vanilla Primo translator has 100, and its regexp also catches our page.

Try it out here:
http://www.kb.dk/rex
*/

function getSearchResults(doc) {
	var linkXPaths = [ //order dictates preference
		'.//li[starts-with(@id,"exlidResult") and substring(@id,string-length(@id)-10)="-DetailsTab"]/a[@href]', //details link
		'.//h3[@class="EXLResultTitle"]/a[@href]' //title link
	];
	var resultsXPath = '//div[starts-with(@id, "exlidResult")][' + linkXPaths.join('|') + ']';
	var results = ZU.xpath(doc, resultsXPath);
	results.titleXPath = './/h3[@class="EXLResultTitle"]';
	results.linkXPaths = linkXPaths;
	return results;
}

function detectWeb(doc, url) {
	Zotero.debug('---<[ This is the primo responsive flavour translator ]>----', 2);
	var titles = doc.getElementsByClassName('EXLResultTitle');
	if (titles.length === 1) {
		return 'book';
	}
	if (titles.length > 1) {
		return 'multiple';
	}
}

function doWeb(doc, url) {
	var searchResults = getSearchResults(doc);
Zotero.debug(searchResults.length,2);

	if(searchResults.length) {
		var items = {};
		var itemIDs = {};
		var title, link;
		var linkXPaths = searchResults.linkXPaths;
		for(var i=0, n=searchResults.length; i<n; i++) {
			title = ZU.xpathText(searchResults[i], searchResults.titleXPath);
			for(var j=0, m=linkXPaths.length; j<m; j++) {
				link = ZU.xpath(searchResults[i], linkXPaths[j])[0];
				if(link) {
					break;
				}
			}
			
			if(!link || !title || !(title = ZU.trimInternal(title))) continue;
			
			items[link.href] = title;
			itemIDs[link.href] = i;
		}
		
		Z.selectItems(items, function(selectedItems) {
			if(!selectedItems) return true;
			
			var urls = [];
			for(var i in selectedItems) {
				urls.push({url: i, id: itemIDs[i]});
			}
			fetchPNX(urls);
		})
	} else {
		fetchPNX([{url: url, id: 0}]);
	}
}

//keeps track of which URL format works for retrieving PNX record
//and applies the correct transformation function
function getPNXUrl(url, id) {
	var fun = getPNXUrl.convertUrl[getPNXUrl.currentFunction];
	if(!fun) return;

	return fun(url, id);
}
getPNXUrl.convertUrl = [
	//showPNX.js
	//from: http://primo.bib.uni-mannheim.de/primo_library/libweb/action/search.do?...
	//to:   http://primo.bib.uni-mannheim.de/primo_library/libweb/showPNX.jsp?id=
	function(url, id) {
		url = url.match(/(https?:\/\/[^?#]+\/)[^?#]+\/[^\/]*(?:[?#]|$)/);
		if(!url) return;
		return url[1] + 'showPNX.jsp?id=' + id;
	},
	//simply add &showPnx=true
	function(url) {
		url = url.split('#');
		if(url[0].indexOf('?') == -1) {
			url[0] += '?';
		} else {
			url[0] += '&';
		}
		return url[0] + 'showPnx=true';
	}
];
getPNXUrl.currentFunction = 0;
getPNXUrl.confirmed = false;
getPNXUrl.nextFunction = function() {
	if(!getPNXUrl.confirmed && getPNXUrl.currentFunction < getPNXUrl.convertUrl.length) {
		Z.debug("Function " + getPNXUrl.currentFunction + " did not work.");
		getPNXUrl.currentFunction++;
		return true;
	}
}

//retrieve PNX records for given items sequentially
function fetchPNX(itemData) {
	if(!itemData.length) return; //do this until we run out of URLs
	
	var data = itemData.shift();
	var url = getPNXUrl(data.url, data.id); //format URL if still possible
	
	if(!url) {
		if(getPNXUrl.nextFunction()) {
			itemData.unshift(data);
		} else if(!getPNXUrl.confirmed){
			//in case we can't find PNX for a particular item,
			//go to the next and start looking from begining
			Z.debug("Could not determine PNX url from " + data.url);
			getPNXUrl.currentFunction = 0;
		}
		
		fetchPNX(itemData);
		return;
	}
	
	var gotPNX = false;
	ZU.doGet(url,
		function(text) {
			text = text.trim();
			if(text.substr(0,5) != '<?xml') {
				//try a different PNX url
				gotPNX = false;
				return;
			} else {
				gotPNX = true;
				getPNXUrl.confirmed = true;
			}
			
			importPNX(text);
		},
		function() {
			if(!gotPNX && getPNXUrl.nextFunction()) {
				//if url function not confirmed, try another one on the same URL
				//otherwise, we move on
				itemData.unshift(data);
			}
			
			fetchPNX(itemData);
		}
	);
}

//import PNX record
function importPNX(text) {
	//Note that if the session times out, PNX record will just contain a "null" entry
	//Z.debug(text);
	//a lot of these apply only to prim records, mainly (but no exclusively) served by the jsp file
	text = text.replace(/\<\/?xml-fragment[^\>]*\>/g, "")
			.replace(/(<\/?)\w+:([^\>]*)/g, "$1$2") //remove namespaces
			//remove ns declarations - we don't need them and they break this
			.replace(/<[^>]+/g, function(m) {
				return m.replace(/\s+xmlns(?::\w+)?\s*=\s*(['"]).*?\1/ig, '');
			});
	//Z.debug(text);
	
	var parser = new DOMParser();
	var doc = parser.parseFromString(text, "text/xml");
	
	var item = new Zotero.Item();
	
	var itemType = ZU.xpathText(doc, '//display/type');
	if(!itemType) {
		throw new Error('Could not locate item type');
	}
	
	switch(itemType.toLowerCase()) {
		case 'book':
		case 'books':
			item.itemType = "book";
		break;
		case 'audio':
			item.itemType = "audioRecording";
		break;
		case 'video':
			item.itemType = "videoRecording";
		break;
		case 'report':
			item.itemType = "report";
		break;
		case 'webpage':
			item.itemType = "webpage";
		break;
		case 'article':
			item.itemType = "journalArticle";
		break;
		case 'thesis':
			item.itemType = "thesis";
		break;
		case 'map':
			item.itemType = "map";
		break;
		default:
			item.itemType = "document";
	}
	
	item.title = ZU.xpathText(doc, '//display/title');
	if(item.title) item.title = ZU.unescapeHTML(item.title);
	
	var creators;
	var contributors;
	if(ZU.xpathText(doc, '//display/creator')) {
		creators = ZU.xpath(doc, '//display/creator'); 
	}
	
	if(ZU.xpathText(doc, '//display/contributor')) {
		contributors = ZU.xpath(doc, '//display/contributor'); 
	}
	
	if(!creators && contributors) { // <creator> not available using <contributor> as author instead
		creators = contributors;
		contributors = null;
	}
	
	if(!creators && ! contributors){
		creators = ZU.xpath(doc, '//addata/addau')
	}
	
	for(i in creators) {
		if(creators[i]) {
			var creator  = ZU.unescapeHTML(creators[i].textContent).split(/\s*;\s*/);
			for(j in creator){
				creator[j] = creator[j].replace(/\d{4}-(\d{4})?/g, '');
				item.creators.push(Zotero.Utilities.cleanAuthor(creator[j], "author", true));
			}			
		}
	}
	
	for(i in contributors) {
		if(contributors[i]) {
			var contributor = ZU.unescapeHTML(contributors[i].textContent).split(/\s*;\s*/);
			for(j in contributor){
			contributor[j] = contributor[j].replace(/\d{4}-(\d{4})?/g, '');
			item.creators.push(Zotero.Utilities.cleanAuthor(contributor[j], "contributor", true));
			}			
		}
	}
	//PNX doesn't do well with institutional authors; This isn't perfect, but it helps:
	for(i in item.creators){
		if(!item.creators[i].firstName){
			item.creators[i].fieldMode=1;
		}
	}
	
	var publisher = ZU.xpathText(doc, '//display/publisher');
	if(publisher) var pubplace = ZU.unescapeHTML(publisher).split(" : ");
	if(pubplace && pubplace[1]) {
		item.place = pubplace[0].replace(/,\s*c?\d+|[\(\)\[\]]|(\.\s*)?/g, "");
		item.publisher = pubplace[1].replace(/,\s*c?\d+|[\(\)\[\]]|(\.\s*)?/g, "")
			.replace(/^\s*"|,?"\s*$/g, '');
	} else if(pubplace) {
		item.publisher = pubplace[0].replace(/,\s*c?\d+|[\(\)\[\]]|(\.\s*)?/g, "")
			.replace(/^\s*"|,?"\s*$/g, '');
	}
	
	var date = ZU.xpathText(doc, '//display/creationdate|//search/creationdate');
	var m;
	if(date && (m = date.match(/\d+/))) {
		item.date = m[0];
	}
	
	// the three letter ISO codes that should be in the language field work well:
	item.language = ZU.xpathText(doc, '//display/language');
	
	var pages = ZU.xpathText(doc, '//display/format');
	if(pages && pages.search(/[0-9]+/) != -1) {
		pages = pages.replace(/[\(\)\[\]]/g, "").match(/[0-9]+/);
		item.pages = item.numPages = pages[0];
	}

	// The identifier field is supposed to have standardized format, but
	// the super-tolerant idCheck should be better than a regex.
	// (although note that it will reject invalid ISBNs)
	var locators = ZU.xpathText(doc, '//display/identifier');
	if(locators) {
		item.ISBN = ZU.cleanISBN(locators);
		item.ISSN = ZU.cleanISSN(locators);
	}
	
	item.edition = ZU.xpathText(doc, '//display/edition');
	
	var subjects = ZU.xpath(doc, '//search/subject');
	for(var i=0, n=subjects.length; i<n; i++) {
		item.tags.push(ZU.trimInternal(subjects[i].textContent));
	}
	
	item.abstractNote = ZU.xpathText(doc, '//addata/abstract')
		|| ZU.xpathText(doc, '//display/description');
	
	item.DOI = ZU.xpathText(doc, '//addata/doi');
	item.issue = ZU.xpathText(doc, '//addata/issue');
	item.volume = ZU.xpathText(doc, '//addata/volume');
	item.publicationTitle = ZU.xpathText(doc, '//addata/jtitle');
	item.pages = ZU.xpathText(doc, '//addata/pages');
	
	// does callNumber get stored anywhere else in the xml?
	item.callNumber = ZU.xpathText(doc, '//enrichment/classificationlcc');
	
	item.complete();
}
/** BEGIN TEST CASES **/
var testCases = []
/** END TEST CASES **/
