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
	"lastUpdated": "2025-08-07 10:44:43"
}

function detectWeb(doc, url) {
  // Check for article type
  const isArticle =
	doc.querySelector('meta[property="og:type"][content="article"]');

  if (isArticle && url !== "https://forward.com/yiddish/") {
	return "newspaperArticle";
  } // The main page in yiddish is an "article" for some reason

  return false;
}


function doWeb(doc, url) {
	const item = new Zotero.Item("newspaperArticle");

	// Hardcoded values
	item.publicationTitle = "The Forward";
	item.ISSN = "1051-340X";

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
				"ISSN": "1051-340X",
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
				"ISSN": "1051-340X",
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
