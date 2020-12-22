{
	"translatorID": "1f530308-ce67-4b87-a079-e4a8e2a9c623",
	"label": "Sud Ouest",
	"creator": "Sylvain Machefert",
	"target": "https://www.sudouest.fr/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2020-12-22 20:02:45"
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

function getDateFromUrl(url) {
	var parsedDate = url.match(/(\d{4})\/(\d{2})\/(\d{2})/);
	if (parsedDate) {
		return parsedDate[1] + "-" + parsedDate[2] + "-" + parsedDate[3];
	}
	return null;
}

function detectWeb(doc, url) {
	var publicationDate = getDateFromUrl(url);
	
	if (publicationDate) {
		return 'newspaperArticle';
	}
	
	if (ZU.xpath(doc, "//div[@class='articles-list']")) {
		return 'multiple';
	}
	
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('article.article .article-wrapper');
	for (var i = 0; i < rows.length; i++) {
		// Adjust if required, use Zotero.debug(rows) to check
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
	item.title = ZU.xpathText(doc, '//meta[@property="og:title"]/@content');
	item.publication = "Sud Ouest";
	item.ISSN = "1760-6454";
	item.url = url;
	item.abstract = ZU.xpathText(doc, '//meta[@property="og:description"]/@content');

	// There might be a better option to isolate the author but this one works
	var publishing = ZU.xpath(doc, "//div[@class='publishing']");
	var author = Array.prototype.filter.call(publishing[0].childNodes, function (element) {
		return element.nodeType === 3; /* Node.TEXT_NODE */
	}).map(function (element) {
		return element.textContent;
	}).join("");
	
	author = author.replace("Par ", "");
	item.creators.push({ lastName: author, fieldMode: 1, creatorType: "author" });
	
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.sudouest.fr/2020/11/03/agglomeration-rochefort-ocean-les-prets-de-livres-reprennent-8037128-1504.php",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Agglomération Rochefort Océan : les prêts de livres reprennent",
				"creators": [
					{
						"lastName": "Jennyfer Delrieux",
						"fieldMode": 1,
						"creatorType": "author"
					}
				],
				"ISSN": "1760-6454",
				"libraryCatalog": "Sud Ouest",
				"shortTitle": "Agglomération Rochefort Océan",
				"url": "https://www.sudouest.fr/2020/11/03/agglomeration-rochefort-ocean-les-prets-de-livres-reprennent-8037128-1504.php",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.sudouest.fr/2020/10/14/le-label-grand-site-devient-officielobtenir-le-label-ca-veut-dire-quoi-exactement-7960790-10413.php",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Estuaire de la Charente et Arsenal de Rochefort : le label Grand Site devient officiel",
				"creators": [
					{
						"lastName": "Nathalie Daury-Pain",
						"fieldMode": 1,
						"creatorType": "author"
					}
				],
				"ISSN": "1760-6454",
				"libraryCatalog": "Sud Ouest",
				"shortTitle": "Estuaire de la Charente et Arsenal de Rochefort",
				"url": "https://www.sudouest.fr/2020/10/14/le-label-grand-site-devient-officielobtenir-le-label-ca-veut-dire-quoi-exactement-7960790-10413.php",
				"attachments": [],
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
