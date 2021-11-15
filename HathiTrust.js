{
	"translatorID": "31da33ad-b4d9-4e99-b9ea-3e1ddad284d8",
	"label": "HathiTrust",
	"creator": "Sebastian Karcher and Abe Jellinek",
	"target": "^https?://(catalog|babel)\\.hathitrust\\.org/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-07-01 23:43:42"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2011-2021 Sebastian Karcher, Abe Jellinek,
					      and the Center for History and New Media
					      George Mason University, Fairfax, Virginia, USA
					      http://zotero.org

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
	if (url.match(/\/Record\/\d+/)) {
		return "book";
	}

	if (url.includes('/cgi/pt')) {
		// viewer page; more handling might be needed here
		return "book";
	}

	if ((url.includes("/Search/") || url.includes("a=listis;"))
		&& getSearchResults(doc, true)) {
		return "multiple";
	}

	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.record-container');
	for (let row of rows) {
		let href = attr(row, 'a[href*="/Record/"]', 'href');
		let id = (href.match(/\/([0-9]+)/) || [])[1];
		let title = ZU.trimInternal(row.textContent);
		if (!id || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[id] = title;
	}
	return found ? items : false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (items) scrape(Object.keys(items));
		});
	}
	else {
		let id = extractID(url);
		if (!id) id = extractID(attr(doc, '.bibLinks a[href*="/Record/"]', 'href'));
		if (!id) throw new Error('Couldn\'t extract ID from URL: ' + url);
		scrape([id]);
	}
}

function extractID(url) {
	return (url.match(/\/Record\/([0-9]+)/) || [])[1];
}

function scrape(ids) {
	var risURL = "http://catalog.hathitrust.org/Search/SearchExport?handpicked="
		+ ids.join(',') + "&method=ris";
	ZU.doGet(risURL, function (text) {
		// M1 has only garbage like repeated page number info
		text = text.replace(/^M1 {2}- .+/m, "");
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
		translator.setString(text);
		translator.setHandler("itemDone", function (obj, item) {
			item.extra = "";

			if (item.place) {
				item.place = item.place.replace(/[[\]]/g, "");
			}

			if (item.publisher) {
				item.publisher = item.publisher.replace(/[[\]]/g, "");
			}

			if (item.numPages) {
				// "3 p.l., 192 p." -> 192
				let cleanedPages = item.numPages.match(/(\d+)\s*p\.($|[^a-z])/i);
				if (cleanedPages) {
					item.numPages = cleanedPages[1];
				}
			}

			if (item.tags.length) {
				item.tags = item.tags.join("/").split("/")
					.map(s => ZU.trimInternal(s).replace(/\.$/, ''));
			}

			for (let creator of item.creators) {
				if (creator.firstName) {
					creator.firstName = creator.firstName.replace(/(\w{2,})\./, '$1');
				}

				if (creator.lastName) {
					creator.lastName = creator.lastName.replace(/\.$/, '');
				}
			}

			if (item.url.startsWith("//")) {
				item.url = "https:" + item.url;
			}

			// there's no reason to have a snapshot of the record page, but
			// HathiTrust metadata is pretty bare and it's likely that users
			// will want to come back
			item.attachments.push({
				title: 'Record Page',
				url: item.url,
				mimeType: 'text/html',
				snapshot: false
			});

			item.complete();
		});
		translator.translate();
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://catalog.hathitrust.org/Search/Home?checkspelling=true&lookfor=Cervantes&type=all&sethtftonly=true&submit=Find",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://catalog.hathitrust.org/Record/001050654",
		"items": [
			{
				"itemType": "book",
				"title": "Cervantes",
				"creators": [
					{
						"lastName": "Entwistle",
						"firstName": "William J.",
						"creatorType": "author"
					}
				],
				"date": "1940",
				"libraryCatalog": "HathiTrust",
				"numPages": "192",
				"place": "Oxford",
				"publisher": "The Clarendon press",
				"url": "https://catalog.hathitrust.org/Record/001050654",
				"attachments": [
					{
						"title": "Record Page",
						"mimeType": "text/html",
						"snapshot": false
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
		"url": "http://babel.hathitrust.org/cgi/mb?a=listis;c=421846824",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://babel.hathitrust.org/cgi/pt?id=uiuo.ark:/13960/t70w4tz8j&view=1up&seq=1",
		"items": [
			{
				"itemType": "book",
				"title": "Articles of association and by-laws of the Jewish Farmers' Cooperative Credit Unions.",
				"creators": [
					{
						"lastName": "Jewish Farmers' Cooperative Credit Unions",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"lastName": "Jewish Agricultural and Industrial Aid Society",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "1911",
				"libraryCatalog": "HathiTrust",
				"numPages": "19",
				"place": "New York City",
				"publisher": "Jewish Agricultural and Industrial Aid Society",
				"url": "https://catalog.hathitrust.org/Record/102407867",
				"attachments": [
					{
						"title": "Record Page",
						"mimeType": "text/html",
						"snapshot": false
					}
				],
				"tags": [
					{
						"tag": "Credit unions"
					},
					{
						"tag": "Jewish farmers"
					},
					{
						"tag": "United States"
					},
					{
						"tag": "United States"
					}
				],
				"notes": [
					{
						"note": "<p>English and Yiddish text.</p>"
					}
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
