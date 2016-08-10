{
	"translatorID": "235c5c47-0c04-4d77-9afe-e22265a017a9",
	"label": "Aftonbladet",
	"creator": "Jonatan Svensson Glad",
	"target": "^https?://ww*\.aftonbladet\.se\/nyheter",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2016-08-10 02:42:00"
}

/*
	Aftonbladet Translator - Parses Atonbladet articles and creates Zotero-based metadata.
	Copyright (C) 2016 Jonatan Svensson Glad
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
---------------------
	With elements from FAZ Translator.
	(C) 2010-2012 ibex and Sebastian Karcher
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


/* Zotero API */

function detectWeb(doc, url) {
	return "newspaperArticle";
	}


function doWeb(doc, url) {
	var arts = new Array();
	if (detectWeb(doc, url) == "multiple") {
		var items = new Object;
		//make sure we don't get media objects
		var titles = doc.evaluate('//div[not(div[contains(@class, "MediaLink")])]/a[@class="TeaserHeadLink"]', doc, null, XPathResult.ANY_TYPE, null);
		var title;
		while (title = titles.iterateNext()) {
			items[title.href] = title.textContent.trim();
		}
		Zotero.selectItems(items, function (items) {
			if (!items) {
				return true;
			}
			for (var itemurl in items) {
				arts.push(itemurl);
			}
			ZU.processDocuments(arts, scrape);
		});
	} else {
		scrape(doc);
	}
}

function scrape(doc) {
	var newArticle = new Zotero.Item('newspaperArticle');
		newArticle.title = ZU.xpathText(doc, "//h1")
		newArticle.date = ZU.xpathText(doc, '//time[@pubdate]')
		var author = ZU.xpathText(doc, '//div[@class="abItem"]//div/a/text()').replace("\,", "").replace("\,", "").replace("\,", "").replace("\,", "").replace("\,", "").replace("\,", "").replace("\,", "").replace("\,", "").replace("\,", "").replace("\,", "").replace("\,", "").replace("\,", "").replace("\,", "").replace("\,", "").replace("\,", "")
		newArticle.creators.push(ZU.cleanAuthor(author, "author"));
		Z.debug(author);
		newArticle.language =  "Swedish"
		newArticle.publicationTitle = "Aftonbladet"
		newArticle.ISSN = "1103-9000"
		newArticle.AbstractNote = ZU.xpathText(doc, '//div[@class="abLeadText"]')
	newArticle.complete();
};	

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.aftonbladet.se/nyheter/article23305202.ab",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Coop ersätter inte Ingrid, 81, efter kortstölden",
				"creators": [
					{
						"firstName": "Julia",
						"lastName": "Wågenberg",
						"creatorType": "author"
					}
				],
				"date": "2016-08-09",
				"ISSN": "1103-9000",
				"language": "Swedish",
				"libraryCatalog": "Aftonbladet",
				"publicationTitle": "Aftonbladet",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.aftonbladet.se/nyheter/article23311903.ab",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Skottlossning i Göteborg",
				"creators": [
					{
						"firstName": "Linnea",
						"lastName": "Carlén",
						"creatorType": "author"
					}
				],
				"date": "2016-08-10",
				"ISSN": "1103-9000",
				"language": "Swedish",
				"libraryCatalog": "Aftonbladet",
				"publicationTitle": "Aftonbladet",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.aftonbladet.se/nyheter/article23310631.ab",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Putin och Erdogan i möte: ”Ännu starkare relationer”",
				"creators": [
					{
						"firstName": "Niklas",
						"lastName": "Eriksson",
						"creatorType": "author"
					}
				],
				"date": "2016-08-09",
				"ISSN": "1103-9000",
				"language": "Swedish",
				"libraryCatalog": "Aftonbladet",
				"publicationTitle": "Aftonbladet",
				"shortTitle": "Putin och Erdogan i möte",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
