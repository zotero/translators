{
	"translatorID": "a571680e-6338-46c2-a740-3cd9eb80fc7f",
	"label": "Beobachter",
	"creator": "Sebastian Karcher",
	"target": "^https?://((www\\.)?beobachter\\.ch/.)",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-02-05 20:11:36"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2022 Sebastian Karcher
	
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
	if (doc.getElementsByClassName('article-header').length > 0) {
		return "magazineArticle";
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}


function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;

	var rows = doc.querySelectorAll('a[class*="teaser"]');
	for (let row of rows) {
		let href = row.href;
		let title = text(row, 'span');
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
	var authors = doc.querySelectorAll('meta[name="parsely-author"]');
	var date = attr(doc, 'meta[name="published_at"]', 'content');
	var translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	// translator.setDocument(doc);
	
	translator.setHandler('itemDone', function (obj, item) {
		for (let author of authors) {
			item.creators.push(ZU.cleanAuthor(author.content, "author"));
		}
		item.title = item.title.replace(/\s*\|\s*Beobachter/, "");
		item.date = date;
		item.ISSN = "1661-7444";
		item.complete();
	});

	translator.getTranslatorObject(function (trans) {
		trans.itemType = "magazineArticle";
		trans.doWeb(doc, url);
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.beobachter.ch/natur/forschung-wissen/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.beobachter.ch/umwelt/blitze-suche-nicht-die-buche",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "Blitze: Suche nicht die Buche!",
				"creators": [
					{
						"firstName": "Tanja",
						"lastName": "Polli",
						"creatorType": "author"
					}
				],
				"date": "2013-08-16T16:28:50+02:00",
				"ISSN": "1661-7444",
				"abstractNote": "Acht Tipps, was man tun und lassen soll, wenn man von Blitz und Donner überrascht wird.",
				"language": "de-CH",
				"libraryCatalog": "www.beobachter.ch",
				"shortTitle": "Blitze",
				"url": "https://www.beobachter.ch/umwelt/blitze-suche-nicht-die-buche",
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
		"url": "https://www.beobachter.ch/gesundheit/medizin-krankheit/immer-schlapp-wieso-fuhlen-wir-uns-standig-mude",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "Immer schlapp: Wieso fühlen wir uns ständig müde?",
				"creators": [
					{
						"firstName": "Andreas",
						"lastName": "Grote",
						"creatorType": "author"
					}
				],
				"date": "2022-01-11T09:30:00+01:00",
				"ISSN": "1661-7444",
				"abstractNote": "Wer andauernd schläfrig und erschöpft ist, leidet – und nervt andere. Ein kurzer Selbsttest zeigt, ob Ihre Müdigkeit normal ist und was dagegen helfen kann.",
				"language": "de-CH",
				"libraryCatalog": "www.beobachter.ch",
				"shortTitle": "Immer schlapp",
				"url": "https://www.beobachter.ch/gesundheit/medizin-krankheit/immer-schlapp-wieso-fuhlen-wir-uns-standig-mude",
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
	}
]
/** END TEST CASES **/
