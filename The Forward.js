{
	"translatorID": "9a1e7d1b-478c-494f-ad56-f4cc58872af1",
	"label": "The Forward",
	"creator": "Anonymous",
	"target": "^https?:\\/\\/(www\\.)?forward\\.com\\/.*",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-08-07 11:17:46",
	"skipTest": true
}

/*
	***** BEGIN LICENSE BLOCK *****

	Free license for any purpose

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
	// Check for article type
	const isArticle =
		doc.querySelector('meta[property="og:type"][content="article"]');

	if (isArticle) {
	return "newspaperArticle";
  }

  return false;
}

function doWeb(doc, url) {
	const item = new Zotero.Item("newspaperArticle");

	// Hardcoded values
	item.publicationTitle = "The Forward";

	// Set language based on URL
	if (url.includes("/yiddish/")) {
		item.language = "yi"; // ISO 639-1 code for Yiddish
	}
	else {
		item.language = "en";
	}

	// Dynamic metadata
	item.title = doc.querySelector('meta[property="og:title"]')?.content || doc.title;
	item.abstractNote = doc.querySelector('meta[property="og:description"]')?.content || "";
	item.url = url;

	// Date
	const dateMeta = doc.querySelector('meta[property="article:published_time"]');
	if (dateMeta) {
		item.date = dateMeta.content.slice(0, 10); // format YYYY-MM-DD
	}

	// Author
	const authorMeta = doc.querySelector('meta[name="author"]');
	if (authorMeta && authorMeta.content) {
		item.creators.push(Zotero.Utilities.cleanAuthor(authorMeta.content, "author"));
	}

	// Attachments
	item.attachments.push({
		document: doc,
		title: "Snapshot",
		mimeType: "text/html"
	});

	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://forward.com/yiddish/759280/can-an-observant-jew-be-politically-left-this-organization-says-yes/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Can an observant Jew be politically left? This organization says yes",
				"creators": [
					{
						"firstName": "שלום",
						"lastName": "בערגער",
						"creatorType": "author"
					}
				],
				"date": "2025-07-30",
				"abstractNote": "זונטיק, דעם 20סטן יולי, האָבן זיך פֿאַרזאַמלט מיטגלידער פֿון „די הלכהשע לינקע“ — אַ גרופּע פֿרומע פֿון לינקן פּאָליטישן פֿליגל, כּדי זיך צוצוהערן צו תּורה־ און פֿאָרשונג־רעפֿעראַטן מיט אַ שײַכות צו דער ברענענדיקער טעמע װאָס האָט די גרופּע אױספֿאָרמירט: די מאַסן־הריגות פֿון דער ציװילער באַפֿעלקערונג אין עזה. די גרופּע, װאָס איז געגרינדעט געװאָרן אין 2024,...",
				"language": "yi",
				"libraryCatalog": "The Forward",
				"publicationTitle": "The Forward",
				"shortTitle": "Can an observant Jew be politically left?",
				"url": "https://forward.com/yiddish/759280/can-an-observant-jew-be-politically-left-this-organization-says-yes/",
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
		"url": "https://forward.com/fast-forward/761011/star-of-david-israeli-flag-antisemitism-trevor-mcfadden/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "What does the Star of David represent? A new ruling offers a legal answer",
				"creators": [
					{
						"firstName": "Hannah",
						"lastName": "Feuer",
						"creatorType": "author"
					}
				],
				"date": "2025-08-06",
				"abstractNote": "Judge Trevor McFadden rejected arguments that the Israeli flag represents the state of Israel, rather than “the Jewish race.”",
				"language": "en",
				"libraryCatalog": "The Forward",
				"publicationTitle": "The Forward",
				"shortTitle": "What does the Star of David represent?",
				"url": "https://forward.com/fast-forward/761011/star-of-david-israeli-flag-antisemitism-trevor-mcfadden/",
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

