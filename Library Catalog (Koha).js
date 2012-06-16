{
	"translatorID": "8e66aa6d-5b2a-4b44-b384-a838e23b8538",
	"label": "Library Catalog (Koha)",
	"creator": "Sebastian Karcher",
	"target": "cgi-bin/koha/opac-(detail|search)",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "g",
	"lastUpdated": "2012-06-14 19:02:36"
}

/*
	***** BEGIN LICENSE BLOCK *****
	
	KOHA Translator, Copyright © 2012 Sebastian Karcher 
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
	if (url.match(/\/opac-search\.pl\?/)) return "multiple";
	else if (url.match(/\/opac-detail\.pl\?/)) return "book";
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		var articles = [];
		var items = {};
		var titles = doc.evaluate('//span[@class="results_summary"]/span[@class="label"]/a|//span[@class="results_summary"]/preceding-sibling::a', doc, null, XPathResult.ANY_TYPE, null);
		var title;
		while (title = titles.iterateNext()) {
			items[title.href] = title.textContent;
		}
		Zotero.selectItems(items, function (items) {
			if (!items) {
				return true;
			}
			for (var i in items) {
				marcurl = marcURL(i);
				articles.push(marcurl);
			}
			scrape(articles, function () {
				Zotero.done();
			});
		});
	} else {
		var marcurl = marcURL(url);
		scrape(marcurl);
	}
}

function scrape(marcurl) {
	Zotero.Utilities.HTTP.doGet(marcurl, function (text) {
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("a6ee60df-1ddc-4aae-bb25-45e0537be973");
		translator.setString(text);
		translator.setHandler("itemDone", function (obj, item) {
		//editors get mapped as contributors - but so do many others who should be
		// --> for books that don't have an author, turn contributors into editors.
		if (newItem.itemType=="book"){
		    var hasAuthor = false;
		    for (var i in newItem.creators) {
			if (newItem.creators[i].creatorType=="author") {
				hasAuthor = true;
			}
		    }
		    if (!hasAuthor) {
			for (var i in newItem.creators) {
			    if (newItem.creators[i].creatorType=="contributor") {
				newItem.creators[i].creatorType="editor";
			    }
			}
		    }
		}
			item.complete();
		});
		translator.translate();
	});
}

function marcURL(url) {
	var bibnumber = url.match(/(biblionumber=)(\d+)/)[2];
	var host = url.match(/^.+cgi-bin\/koha\//)[0];
	var marcURL = host + "opac-export.pl?format=utf8&op=export&bib=" + bibnumber + "save=Go";
	return marcURL;
}
/** BEGIN TEST CASES **/
var testCases = [{
	"type": "web",
	"url": "https://ahuntsic.koha.ccsr.qc.ca/cgi-bin/koha/opac-detail.pl?biblionumber=145770",
	"items": [{
		"itemType": "book",
		"creators": [{
			"lastName": "Collège Ahuntsic",
			"fieldMode": true
		}],
		"notes": [{
			"note": "Les finissants et finissantes du Collège Ahuntsic soulignent les connaissances acquises au sein du profil Cinéma et médias en faisant découvrir leurs coups de coeur, « des films qui, à leur façon, les ont marqués par une recherche formelle, une originalité thématique, une authenticité sociologique et/ou une valeur historique. » -- P. 5"
		}],
		"tags": ["Cinéma"],
		"seeAlso": [],
		"attachments": [],
		"title": "Synopsis: revue de cinéma",
		"place": "Montréal",
		"publisher": "Collège Ahuntsic",
		"date": "2011",
		"libraryCatalog": "KOHA",
		"shortTitle": "Synopsis"
	}]
}, {
	"type": "web",
	"url": "https://catalogue.univ-lyon3.fr/cgi-bin/koha/opac-search.pl?q=thelen",
	"items": "multiple"
}, {
	"type": "web",
	"url": "http://nmwa.kohalibrary.com/cgi-bin/koha/opac-search.pl?q=image&idx=&submit=Search+Catalog",
	"items": "multiple"
}]
/** END TEST CASES **/
