{
	"translatorID": "68a25f37-cd23-4ad3-acc3-74160e3f0beb",
	"label": "ElPais",
	"creator": "febrezo",
	"target": "^https?://[a-z]+.elpais.com/[a-z]+/[0-9]{4}/[0-9]{2}/[0-9]{2}/[a-z]+/[0-9]+_[0-9]+.html",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2016-09-18 11:53:45"
}

/*
	ElPais.com Translator
	Copyright (C) 2016 Félix Brezo, felixbrezo@gmail.com
	
	This program is free software: you can redistribute it and/or modify
	it under the terms of the Affero GNU General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.
	
	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU General Public License for more details.
	
	You should have received a copy of the Affero GNU General Public License
	along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/


function detectWeb(doc, url) {
	return "newspaperArticle";
}

function doWeb(doc, url) {
	var resourceType = detectWeb(doc, url);

	// Creating the item
	var newItem = new Zotero.Item(resourceType);

	//Setting common data:
	newItem.url = url;
	newItem.title = ZU.xpathText(doc, '//meta[@name="DC.title"]/@content');
	newItem.date = ZU.xpathText(doc, '//meta[@name="DC.date"]/@content');
	newItem.language = ZU.xpathText(doc, '//meta[@name="DC.language"]/@content');	
	newItem.publication = ZU.xpathText(doc, '//meta[@name="DC.publisher"]/@content');
	newItem.place = ZU.xpathText(doc, '//span[@class="articulo-localizacion"]');	
	newItem.abstractNote = ZU.xpathText(doc, '//meta[@name="DC.description"]/@content');	
	newItem.tags = ZU.xpathText(doc, '//meta[@name="keywords"]/@content').split(","); 	
	// Getting the Author
	newItem.creators = [Zotero.Utilities.cleanAuthor(ZU.xpathText(doc, '//meta[@name="author"]/@content'), "author", false)];	
	
	// Adding the attachment
	newItem.attachments.push({
		title: "ElPaís.com Snapshot",
		mimeType: "text/html",
		url: url
	});	
	
	newItem.complete();
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://deportes.elpais.com/deportes/2016/09/14/actualidad/1473877178_617549.html",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "El doctor que recupera las manos de los pilotos operará a Bruno Hortelano",
				"creators": [
					{
						"firstName": "Nadia",
						"lastName": "Tronchoni",
						"creatorType": "author"
					}
				],
				"date": "2016-09-14",
				"abstractNote": "El velocista será intervenido de nuevo este jueves en el Hospital Universitari Dexeus por Xavier Mir",
				"language": "es",
				"libraryCatalog": "ElPais",
				"url": "http://deportes.elpais.com/deportes/2016/09/14/actualidad/1473877178_617549.html",
				"attachments": [
					{
						"title": "ElPaís.com Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/