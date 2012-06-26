{
	"translatorID": "e04e4bab-64c2-4b9a-b6c2-7fb186281969",
	"label": "L'Annee Philologique",
	"creator": "Sebsatian Karcher",
	"target": "^https?://www\\.annee-philologique\\.com/index\\.php",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "g",
	"lastUpdated": "2012-06-25 12:12:43"
}

/*
	***** BEGIN LICENSE BLOCK *****
	
	LAP translator Copyright © 2012 Sebastian Karcher 
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


/*
	TODO: LAP provides book chapters as to separate RIS files - the chapter and the book
	the former doesn't have the editors or the book title. Ideally we should merge those,
	but that requires a rather elaborate hack, so it'll have to wait for another day

	Test may fail - not sure if it's tied to a session
*/


function detectWeb(doc, url) {
	if (url.match(/index\.php\?do=liste/)) {
		return "multiple";
	} else if (url.match(/index\.php\?do=notice/)) {
		//nothing on the page indicates item type, so we go with the generic book
		return "book";
	}
}

function doWeb(doc, url) {
	var arts = new Array();
	if (detectWeb(doc, url) == "multiple") {
		var items = new Object();
		var titles = doc.evaluate('//tbody/tr/td[@class="td3"]/a', doc, null, XPathResult.ANY_TYPE, null);
		var title;
		while (title = titles.iterateNext()) {
			items[title.href] = title.textContent;
		}
		Zotero.selectItems(items, function (items) {
			if (!items) {
				return true;
			}
			for (var i in items) {
				arts.push(i);
			}
			Zotero.Utilities.processDocuments(arts, scrape, function () {
				Zotero.done();
			});
		});
	} else {
		scrape(doc, url);
	}
}

function scrape(doc, url) {
	var num = url.match(/&num=\d+/)[0].replace(/^&/, "");
	var critere = encodeURIComponent(ZU.xpathText(doc, '//input[@id="critere"]/@value'));
	var get = 'http://www.annee-philologique.com/index.php?do=export_ris&' + num;
	var post = num + '&js_actif=1&critere=' + critere + '&noticesformat=noticesformat3&mailExport=&inputnbselect=0&inputnbnotselect=4&inputumcourant=1';
	//Z.debug(post);
	Zotero.Utilities.HTTP.doPost(get, post, function (text) {
		//Z.debug(text)
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
		translator.setString(text);
		translator.setHandler("itemDone", function (obj, item) {
			// Author names are in the form "lastName firstName" - this is the best I could do
			// suggestions to do this better are welcome
			for (i in item.creators) {
				//sometimes there _is_ a comma delimiter
				if (!item.creators[i].firstName) {
					var author;
					//Assume the first word is the last Name - that's the best we can do here
					var author = item.creators[i].lastName.match(/(\S+)(\s.+)/)
					if (author[2]) {
						item.creators[i].firstName = author[2]
						item.creators[i].lastName = author[1]
					}
				}
			}
			item.title = item.title.replace(/\.$/, '');
			item.attachments = [{
				url: url,
				title: "L'Année Philologique Snapshot",
				mimeType: "text/html"
			}];
			item.complete();
		});
		translator.translate();
	});
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.annee-philologique.com/index.php?do=notice&num=5",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"lastName": "Diderot",
						"creatorType": "author",
						"firstName": " Denis"
					},
					{
						"lastName": "Carpanetto",
						"creatorType": "author",
						"firstName": " Secondo"
					},
					{
						"lastName": "Guerci",
						"creatorType": "author",
						"firstName": " Luciano"
					},
					{
						"lastName": "Canfora",
						"creatorType": "author",
						"firstName": " Luciano"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "L'Année Philologique Snapshot",
						"mimeType": "text/html"
					}
				],
				"itemID": "59-11596",
				"title": "Saggio sui regni di Claudio e Nerone, e sui costumi e gli scritti di Seneca / trad. di Carpanetto Secondo& Guerci Luciano ;con una nota di Canfora Luciano",
				"date": "1987",
				"publisher": "Sellerio",
				"place": "Palermo",
				"libraryCatalog": "L'Année Philologique"
			}
		]
	}
]
/** END TEST CASES **/