{
	"translatorID": "abc89357-6185-4ddd-8583-80034b754832",
	"label": "Google Play",
	"creator": "Avram Lyon",
	"target": "^https?://play\\.google\\.[^/]+/",
	"minVersion": "2.1.8",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsib",
	"lastUpdated": "2014-02-24 01:50:34"
}

/*
   Google Play Translator
   Copyright (C) 2014 Avram Lyon, ajlyon@gmail.com

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

function detectWeb(doc, url) {
	if (url.indexOf('/apps/details?id=') !== -1) {
		return "computerProgram";
	}

	if (url.indexOf('/store/apps') !== -1
			|| url.indexOf('&c=apps') !== -1) {
		return "multiple";
	}

	return false;
}

function doWeb(doc, url) {

	var detectedType = detectWeb(doc, url);

	if (detectedType !== "multiple") {
		saveIndividual(doc, url);
		return;
	}

	var cells = ZU.xpath(doc, '//div[contains(@class,"card-list")]/div[contains(@class, "card")]//h2/a[contains(@class, "title")]');

	var items = new Object();

	for (var index in cells) {
		items[cells[index].href] = cells[index].textContent;
	}

	Z.selectItems(items, function(items) {
		if (!items) {
			return true;
		}
		var articles = new Array();
		for (var i in items) {
			articles.push(i);
		}

		ZU.processDocuments(articles, saveIndividual);
	});
}

function findProperty(doc, propertyKey) {
	return ZU.xpathText(doc, '//div[contains(@itemprop, "' + propertyKey + '")]');
}

function saveIndividual(doc, url) {
	Z.debug(url);
	var title = findProperty(doc, "name");
	var author = ZU.xpathText(doc, '//div[contains(@itemtype, "http://schema.org/Organization")]//span[contains(@itemprop, "name")]');

	var date = ZU.xpathText(doc, '//div[contains(@itemtype, "http://schema.org/Organization")]//div[contains(@class, "document-subtitle")]');
	date = date.replace(/\s*-\s*/, '');

	var description = findProperty(doc, "description");

	var screenshots = ZU.xpath(doc, '//img[contains(@itemprop, "screenshot")]');

	var item = new Zotero.Item("computerProgram");
	item.title = title;
	item.url = url;
	item.date = date;
	item.abstractNote = description;

	for (var screenshot in screenshots) {
		item.attachments.push({
			url: screenshots[screenshot].src,
			mimeType: "image/jpeg",
			title: "App Screenshot"
		})
	}

	item.system = "Android " + findProperty(doc, "operatingSystems").trim();
	item.version = findProperty(doc, "version");
	item.company = author;
	item.creators.push(ZU.cleanAuthor(author, "author"))
	
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://play.google.com/store/apps/details?id=com.gimranov.zandy.app",
		"items": [
			{
				"itemType": "computerProgram",
				"creators": [
					{
						"firstName": "Avram",
						"lastName": "Lyon",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"New"
				],
				"seeAlso": [],
				"attachments": [
					{
						"mimeType": "image/jpeg",
						"title": "App Screenshot"
					},
					{
						"mimeType": "image/jpeg",
						"title": "App Screenshot"
					},
					{
						"mimeType": "image/jpeg",
						"title": "App Screenshot"
					},
					{
						"mimeType": "image/jpeg",
						"title": "App Screenshot"
					},
					{
						"mimeType": "image/jpeg",
						"title": "App Screenshot"
					}
				],
				"multi": {
					"main": {},
					"_lsts": {},
					"_keys": {}
				},
				"title": "Zandy",
				"url": "https://play.google.com/store/apps/details?id=com.gimranov.zandy.app",
				"date": "January 25, 2014",
				"abstractNote": "Access your Zotero library from your mobile device! Edit and view your library, sync, and work offline. Zandy provides a simple interface to all your research. Browse and modify the items in your library, add new items, view attachments, take and edit item notes, search your library, and add webpages from the Android browser, with more features coming soon!See http://www.gimranov.com/avram/w/zandy-user-guide for a complete guide to using Zandy. If you have Zandy 1.0 already, see the update note, http://wp.me/p1i2jM-2UFor more information on the Zotero project, the premier system for managing research and bibliographic data, see the project site at http://www.zotero.org/. Zandy is a free software project, licensed under the Affero GPL v3. By buying the paid application on Google Play, you support the future development of this app and ensure its further improvement. All future releases of the software will be free updates bringing new capabilities and bugfixes.To file bug reports or feature requests, please see the project repository at https://github.com/ajlyon/zandy/. The full source code is also available at that address.If you find that Zandy doesn't fit your needs, satisfaction is guaranteed: just send me an email at zandy@gimranov.com, and I'll refund the purchase price.Please note that Zandy has no official connection to the Zotero project and its home institution at the Center for History and New Media at George Mason University.",
				"system": "Android 2.1 and up",
				"company": "Avram Lyon",
				"libraryCatalog": "Google Play",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "https://play.google.com/store/search?q=research&c=apps",
		"items": "multiple"
	}
]
/** END TEST CASES **/