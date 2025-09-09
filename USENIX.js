{
	"translatorID": "b97462fa-f20b-4a1e-8a73-3a434a81518b",
	"label": "USENIX",
	"creator": "Tim Leonhard Storm",
	"target": "^https://www\\.usenix\\.org/conference/.*/presentation",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-07-29 16:45:18"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2025 Tim Leonhard Storm

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
/* Remove pairs of unescaped braces (note that braces in title are quite unlikely anyway) */

function stripAllUnescapedBraces(s) {
	let prev;
	do {
		prev = s;
		s = s.replace(/(^|[^\\])(\{(.*?)\})/g, (_, before, full, content) => before + content);
	} while (s !== prev);
	// Unescape \{ and \} to { and }
	return s.replace(/\\([{}])/g, '$1');
}


async function scrape(doc) {
	let translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	translator.setHandler('itemDone', (_obj, item) => {
		item.title = stripAllUnescapedBraces(item.title);
		item.complete();
	});
	translator.translate();
}

function detectWeb(doc, url) {
	if (url.includes('/presentation/')) {
		return 'conferencePaper';
	}
	return false;
}

async function doWeb(doc, url) {
	await scrape(await requestDocument(url));
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.usenix.org/conference/pepr25/presentation/sharma",
		"detectedItemType": "conferencePaper",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Verifying Humanness: Personhood Credentials for the Digital Identity Crisis",
				"creators": [
					{
						"firstName": "Tanusree",
						"lastName": "Sharma",
						"creatorType": "author"
					}
				],
				"date": "2025",
				"language": "en",
				"libraryCatalog": "www.usenix.org",
				"shortTitle": "Verifying Humanness",
				"url": "https://www.usenix.org/conference/pepr25/presentation/sharma",
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
		"url": "https://www.usenix.org/conference/usenixsecurity18/presentation/bock",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "Return Of Bleichenbacher’s Oracle Threat (ROBOT)",
				"creators": [
					{
						"firstName": "Hanno",
						"lastName": "Böck",
						"creatorType": "author"
					},
					{
						"firstName": "Juraj",
						"lastName": "Somorovsky",
						"creatorType": "author"
					},
					{
						"firstName": "Craig",
						"lastName": "Young",
						"creatorType": "author"
					}
				],
				"date": "2018",
				"ISBN": "9781939133045",
				"conferenceName": "27th USENIX Security Symposium (USENIX Security 18)",
				"language": "en",
				"libraryCatalog": "www.usenix.org",
				"pages": "817-849",
				"url": "https://www.usenix.org/conference/usenixsecurity18/presentation/bock",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
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
