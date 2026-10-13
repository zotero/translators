{
	"translatorID": "0b9bd217-49e3-48e6-9759-62651692b1a8",
	"label": "O Foundation",
	"creator": "Subhashish Panigrahi",
	"target": "^https://theofdn\\.org/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 7,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-10-13 17:28:09"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2026 Subhashish Panigrahi

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

// theofdn.org pages carry Highwire Press and Dublin Core tags, which
// Embedded Metadata reads. Language resource pages are saved as reports and
// tools as software. The page's ARK (Archival Resource Key) goes in Library
// Catalog, or in Extra for item types without that field.

function detectWeb(doc, url) {
	if (!doc.querySelector('meta[name="citation_title"]')) {
		return false;
	}
	if (/\/tools\/[^/]+\//.test(url)) {
		return 'computerProgram';
	}
	if (doc.querySelector('meta[name="citation_technical_report_institution"]')) {
		return 'report';
	}
	if (url.includes('/blogs/')) {
		return 'blogPost';
	}
	return 'webpage';
}

function getARK(doc) {
	for (let meta of doc.querySelectorAll('meta[name="DC.identifier"]')) {
		let ark = meta.content.match(/ark:\/?(\d+\/[\w.-]+(?:\/[\w.-]+)?)/);
		if (ark) {
			return 'ark:' + ark[1];
		}
	}
	return null;
}

async function doWeb(doc, url) {
	await scrape(doc, url);
}

async function scrape(doc, url = doc.location.href) {
	let translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);

	translator.setHandler('itemDone', (_obj, item) => {
		if (item.itemType == 'computerProgram') {
			for (let creator of item.creators) {
				creator.creatorType = 'programmer';
			}
		}
		let ark = getARK(doc);
		if (ark) {
			if (['report', 'computerProgram'].includes(item.itemType)) {
				item.libraryCatalog = ark;
			}
			else {
				item.extra = (item.extra ? item.extra + '\n' : '') + 'ARK: ' + ark;
			}
		}
		item.complete();
	});

	let em = await translator.getTranslatorObject();
	em.itemType = detectWeb(doc, url);
	await em.doWeb(doc, url);
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://theofdn.org/tools/sat/unicode-converter/",
		"items": [
			{
				"itemType": "computerProgram",
				"title": "Santali (Ol Chiki) Unicode converter",
				"creators": [
					{
						"firstName": "Jnanaranjan",
						"lastName": "Sahu",
						"creatorType": "programmer"
					}
				],
				"date": "2018/09/12",
				"abstractNote": "Converts Santali text typed in older Ol Chiki fonts into Unicode, so that it shows correctly on any phone or computer.",
				"company": "O Foundation",
				"libraryCatalog": "ark:15056/ofdn-t-000001",
				"place": "Bhubaneswar",
				"rights": "MIT",
				"url": "https://theofdn.org/tools/sat/unicode-converter/",
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
		"url": "https://theofdn.org/resources/hoc/",
		"items": [
			{
				"itemType": "report",
				"title": "Ho language resources",
				"creators": [
					{
						"firstName": "Subhashish",
						"lastName": "Panigrahi",
						"creatorType": "author"
					},
					{
						"firstName": "Mangu",
						"lastName": "Purty",
						"creatorType": "author"
					}
				],
				"date": "2019/07/23",
				"abstractNote": "Free fonts, keyboards, converters, textbooks, dictionaries and video tutorials for reading and writing the Ho language in the Warang Citi script.",
				"institution": "O Foundation",
				"language": "en",
				"libraryCatalog": "ark:15056/ofdn-r-000003",
				"place": "Bhubaneswar",
				"rights": "CC BY-SA 4.0",
				"url": "https://theofdn.org/resources/hoc/",
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
		"url": "https://theofdn.org/blogs/santali-unicode-converter-release/",
		"items": [
			{
				"itemType": "blogPost",
				"title": "Converting Santali text typed in ASCII to Unicode",
				"creators": [
					{
						"firstName": "Jnanaranjan",
						"lastName": "Sahu",
						"creatorType": "author"
					},
					{
						"firstName": "Subhashish",
						"lastName": "Panigrahi",
						"creatorType": "author"
					}
				],
				"date": "2018/09/12",
				"abstractNote": "Santali-language text typed in Ol chiki using ASCII and other legacy encoding systems can now be converted to Unicode so that the text can be used universally, online content will be easily searchable and users can reuse…",
				"blogTitle": "O Foundation",
				"language": "en",
				"rights": "CC BY-SA 4.0",
				"url": "https://theofdn.org/blogs/santali-unicode-converter-release/",
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
