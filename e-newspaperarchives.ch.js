{
	"translatorID": "014aeefe-3bd6-4a23-8ab0-b5033e822779",
	"label": "e-newspaperarchives.ch",
	"creator": "stantheman0128",
	"target": "^https?://(www\\.)?e-newspaperarchives\\.ch/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-09-29 04:13:25"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2026 stantheman0128

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


function detectWeb(doc, url) {
	try {
		let parsed = new URL(url);
		if (parsed.searchParams.get("a") === "d" && parsed.searchParams.get("d")) {
			return "newspaperArticle";
		}
	}
	catch (e) {}
	if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll(".vlistentrymaincell a[href*='a=d']");
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(row.textContent);
		// Veridian search labels append type tags like [ARTICLE]
		title = title.replace(/\s*\[[A-Z ]+\]\s*$/, "");
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

async function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (!items) return;
		for (let resultUrl of Object.keys(items)) {
			await scrape(resultUrl);
		}
	}
	else {
		await scrape(url);
	}
}

async function scrape(url) {
	let articleURL = new URL(url);
	let documentID = articleURL.searchParams.get("d");
	if (!documentID) return;

	// Site citation export (same payload as the [Artikel zitieren] RIS link)
	let risURL = articleURL.origin + "/?a=d&d=" + encodeURIComponent(documentID) + "&f=RIS";
	let risText = await requestText(risURL);
	await processRIS(risText, articleURL.origin + "/?a=d&d=" + encodeURIComponent(documentID));
}

async function processRIS(risText, canonicalURL) {
	let translator = Zotero.loadTranslator("import");
	translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7"); // RIS
	translator.setString(risText);
	translator.setHandler("itemDone", (_obj, item) => {
		item.itemType = "newspaperArticle";
		item.attachments = [];
		if (item.title) {
			item.title = item.title.replace(/\s+/g, " ").trim();
			if (item.title === item.title.toUpperCase()) {
				item.title = ZU.capitalizeTitle(item.title.toLowerCase(), true);
			}
		}
		if (item.publicationTitle) {
			item.publicationTitle = item.publicationTitle.replace(/\s+/g, " ").trim();
		}
		item.url = canonicalURL;
		item.libraryCatalog = "e-newspaperarchives.ch";
		item.complete();
	});
	await translator.translate();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.e-newspaperarchives.ch/?a=d&d=NZZ19180215-03.2.4&",
		"defer": true,
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Kantone.",
				"creators": [],
				"date": "1918-02-15",
				"libraryCatalog": "e-newspaperarchives.ch",
				"pages": "1-2",
				"publicationTitle": "Neue Zürcher Zeitung",
				"url": "https://www.e-newspaperarchives.ch/?a=d&d=NZZ19180215-03.2.4",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.e-newspaperarchives.ch/?a=d&d=DBB18680726-01.2.6.1&",
		"defer": true,
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Nationalrath",
				"creators": [],
				"date": "1868-07-26",
				"libraryCatalog": "e-newspaperarchives.ch",
				"pages": "3-4",
				"publicationTitle": "Der Bund",
				"url": "https://www.e-newspaperarchives.ch/?a=d&d=DBB18680726-01.2.6.1",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.e-newspaperarchives.ch/?a=q&hs=1&r=1&results=1&txq=Z%C3%BCrich&dafyq=1918&datyq=1918&laq=&puq=NZZ&txf=txIN&ssnip=img&ccq=&l=en",
		"defer": true,
		"items": "multiple"
	}
]
/** END TEST CASES **/
