{
	"translatorID": "1f530308-ce67-4b87-a079-e4a8e2a9c623",
	"label": "Sud Ouest",
	"creator": "Sylvain Machefert",
	"target": "^https?://www\\.sudouest\\.fr/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-07-06 17:27:22"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2020 Sylvain Machefert
	
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

function detectWeb(doc, _url) {
	if (ZU.xpathText(doc, '//meta[@property="og:type"]/@content') == "article") {
		return 'newspaperArticle';
	}
	
	if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('article.article .article-wrapper');
	for (var i = 0; i < rows.length; i++) {
		var row = rows[i];
		var a = row.querySelector('a');
		
		var href = a.href;
		var title = ZU.trimInternal(a.textContent);

		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (items) ZU.processDocuments(Object.keys(items), scrape);
		});
	}
	else {
		scrape(doc, url);
	}
}

function scrape(doc, url) {
	var item = new Zotero.Item("newspaperArticle");
	item.language = "fr-FR";
	item.title = ZU.xpathText(doc, '//meta[@property="og:title"]/@content');
	item.publication = "Sud Ouest";
	item.ISSN = "1760-6454";
	item.url = url;
	item.abstract = ZU.xpathText(doc, '//meta[@property="og:description"]/@content');
	
	var publicationDate = ZU.xpathText(doc, "(//div[@class='publishing']/time)[1]");
	if (publicationDate) {
		item.date = ZU.strToISO(publicationDate);
	}

	var author = ZU.xpathText(doc, "//div[@class='publishing']/text()");
	author = author.replace("Par ", "");
	
	if (author != "SudOuest.fr avec AFP") {
		item.creators.push(ZU.cleanAuthor(author, "author", false));
	}

	item.attachments.push({
		title: "Snapshot",
		document: doc
	});
  
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.sudouest.fr/charente-maritime/echillais/agglomeration-rochefort-ocean-les-prets-de-livres-reprennent-1678268.php",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Agglomération Rochefort Océan : les prêts de livres reprennent",
				"creators": [
					{
						"firstName": "Jennyfer",
						"lastName": "Delrieux",
						"creatorType": "author"
					}
				],
				"date": "2020-11-03",
				"ISSN": "1760-6454",
				"language": "fr-FR",
				"libraryCatalog": "Sud Ouest",
				"shortTitle": "Agglomération Rochefort Océan",
				"url": "https://www.sudouest.fr/charente-maritime/echillais/agglomeration-rochefort-ocean-les-prets-de-livres-reprennent-1678268.php",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.sudouest.fr/charente-maritime/breuil-magne/estuaire-de-la-charente-et-arsenal-de-rochefort-le-label-grand-site-devient-officiel-1707458.php",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Estuaire de la Charente et Arsenal de Rochefort : le label Grand Site devient officiel",
				"creators": [
					{
						"firstName": "Nathalie",
						"lastName": "Daury-Pain",
						"creatorType": "author"
					}
				],
				"date": "2020-10-14",
				"ISSN": "1760-6454",
				"language": "fr-FR",
				"libraryCatalog": "Sud Ouest",
				"shortTitle": "Estuaire de la Charente et Arsenal de Rochefort",
				"url": "https://www.sudouest.fr/charente-maritime/breuil-magne/estuaire-de-la-charente-et-arsenal-de-rochefort-le-label-grand-site-devient-officiel-1707458.php",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.sudouest.fr/charente-maritime/royan/",
		"items": "multiple"
	}
]
/** END TEST CASES **/
