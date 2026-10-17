{
	"translatorID": "9a539dde-611a-4f4c-b09d-f29ae763a7c5",
	"label": "Amnesty International",
	"creator": "Vera de Kok",
	"target": "^https?://(www\\.)?amnesty\\.org/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-10-16 20:26:52"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2026 Vera de Kok

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
	if (isArticleURL(url) || doc.querySelector('h1.article-title')) {
		return 'newspaperArticle';
	}
	if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}


function isArticleURL(url) {
	return /\/latest\/(?:news|research|impact|campaigns|stories)\/\d{4}\/\d{2}\//.test(url);
}


function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('h2.post-title a');
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(row.textContent);
		if (!href || !title || !isArticleURL(href)) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}


// "By Ousmane Diallo, Sahel researcher at Amnesty International"
//   -> naam = "Ousmane Diallo", functietitel = "Sahel researcher at Amnesty International"
// "Par"/"Por"/"بواسطة" zijn de Franse/Spaanse/Arabische varianten; zonder komma is er geen titel.
const BYLINE_RE = /^\s*(?:by|par|por|door|von|بواسطة|من)\s+(.+?)(?:\s*,\s*(.+?))?\s*$/i;
const ORG_RE = /^(?:amnesty international|amnesty|the secretariat|international secretariat)/i;


function parseByline(text) {
	let m = BYLINE_RE.exec(text);
	if (!m) return null;
	let name = ZU.trimInternal(m[1]);
	let role = m[2] ? ZU.trimInternal(m[2]) : '';
	if (!name) return null;
	// "Amnesty International" is geen auteur maar de organisatie: de functietitel is dan de
	// bron, en Zotero wil dat als uitgever - laat EM dat zelf zetten.
	if (ORG_RE.test(name) && !role) return null;
	return { name, role };
}


async function doWeb(doc, url) {
	if (getSearchResults(doc, true) && !isArticleURL(url)) {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (!items) return;
		for (let itemUrl of Object.keys(items)) {
			await scrape(await requestDocument(itemUrl));
		}
	}
	else {
		await scrape(doc, url);
	}
}


async function scrape(doc, url = doc.location.href) {
	let translator = Zotero.loadTranslator('web');
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48'); // Embedded Metadata
	translator.setDocument(doc);
	translator.setHandler('itemDone', (_obj, item) => {
		item.itemType = 'newspaperArticle';
		// EM laat de ISO-tijd staan; Zotero wil bij een krantenartikel alleen de dag.
		let m = /^(\d{4}-\d{2}-\d{2})/.exec(item.date || '');
		if (m) item.date = m[1];
		// door EM afgeleide korte titel ("Türkiye", "In Mali, ...") is geen echte ondertitel
		item.shortTitle = '';
		// EM zet de volledige bylinetekst als organisatie-auteur; vervangen door de persoon
		// (of weghalen als het echt de organisatie is).
		let byline = ZU.xpathText(doc, '//div[contains(@class, "bylineContainer")]//span[1]')
			|| ZU.xpathText(doc, '//div[contains(@class, "authorInfoContainer")]//span[1]');
		let parsed = byline ? parseByline(byline) : null;
		if (parsed) {
			item.creators = [Zotero.Utilities.cleanAuthor(parsed.name, 'author', false)];
			if (parsed.role) {
				item.extra = (item.extra ? item.extra + '\n' : '') + 'Byline role: ' + parsed.role;
			}
		}
		else if (!byline) {
			// geen byline op de pagina -> geen gefabriceerde organisatie-auteur
			item.creators = [];
		}
		item.publicationTitle = 'Amnesty International';
		// de site is meertalig: /en/, /fr/, /es/, /ar/ ... -> taal uit <html lang>
		item.language = attr(doc, 'html', 'lang') || 'en';
		item.url = attr(doc, 'link[rel="canonical"]', 'href') || url;
		item.complete();
	});
	await translator.translate();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.amnesty.org/en/latest/news/2026/10/mali-wagner-impunity/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"creators": [
					{
						"firstName": "Ousmane",
						"lastName": "Diallo",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"title": "In Mali, from the Wagner Group to Africa Corps: Will Impunity Continue?",
				"publicationTitle": "Amnesty International",
				"date": "2026-10-14",
				"url": "https://www.amnesty.org/en/latest/news/2026/10/mali-wagner-impunity/",
				"abstractNote": "Ousmane Diallo, Sahel researcher at Amnesty International, warns of the ongoing killings, torture, and possible war crimes in Mali.",
				"language": "en",
				"libraryCatalog": "www.amnesty.org",
				"extra": "Byline role: Sahel researcher at Amnesty International"
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.amnesty.org/fr/latest/news/2026/10/mali-wagner-impunity/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"creators": [
					{
						"firstName": "Ousmane",
						"lastName": "Diallo",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"title": "Tribune : du groupe Wagner à l’Africa Corps, la continuité de l’impunité ?",
				"publicationTitle": "Amnesty International",
				"date": "2026-10-14",
				"url": "https://www.amnesty.org/fr/latest/news/2026/10/mali-wagner-impunity/",
				"abstractNote": "Ousmane Diallo, chercheur, alerte sur la persistance des meurtres, tortures et possibles crimes de guerre commis au Mali.",
				"language": "fr",
				"libraryCatalog": "www.amnesty.org",
				"extra": "Byline role: Chercheur senior sur le Sahel à Amnesty International"
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.amnesty.org/en/latest/news/2026/10/turkiye-police-raid-and-state-takeover-of-opposition-tv-channel-a-brutal-blow-to-media-freedom/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"creators": [],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"title": "Türkiye: Police raid and state takeover of opposition TV channel ‘a brutal blow to media freedom’",
				"publicationTitle": "Amnesty International",
				"date": "2026-10-14",
				"url": "https://www.amnesty.org/en/latest/news/2026/10/turkiye-police-raid-and-state-takeover-of-opposition-tv-channel-a-brutal-blow-to-media-freedom/",
				"abstractNote": "Reacting to a police raid of the headquarters of Halk TV, one of Türkiye’s few broadcasters not aligned with the government, and the appointment of a trustee manager to oversee it as part of an investigation into alleged corruption, Esther Major, Amnesty International’s Deputy Regional Director for Europe, said:  “This alarming move is a brutal blow to […]",
				"language": "en",
				"libraryCatalog": "www.amnesty.org"
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.amnesty.org/en/latest/news/",
		"items": "multiple"
	}
]
/** END TEST CASES **/
