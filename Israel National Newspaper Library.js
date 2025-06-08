{
	"translatorID": "af178ee7-0feb-485d-9cba-3312daf7ebad",
	"label": "Israel National Newspaper Library",
	"creator": "Anonymus",
	"target": "^https:\\/\\/www\\.nli\\.org\\.il\\/(en|he|ar)\\/newspapers\\/[a-z]+\\/\\d{4}\\/\\d{2}\\/\\d{2}\\/\\d{2}\\/article\\/\\d{1,3}\\/?(\\?.*)?$",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-06-08 07:51:10"
}

function detectWeb(doc, url) {
	if (url.includes("/article/")) {
		return "newspaperArticle";
	}
	return false;
}

async function doWeb(doc, url) {
	await scrape(doc, url);
}

async function scrape(doc, url) {
	try {
		let item = new Zotero.Item("newspaperArticle");

		item.url = url;
		item.language = "en";

		// Fallback values
		item.title = "Untitled";
		item.publicationTitle = "Unknown";
		item.date = "Unknown";

		// Extract from document title
		let rawTitle = doc.title;
		let parts = rawTitle.split("|").map(p => p.trim());
		if (parts.length >= 3) {
			item.title = parts[0].replace(/[\u200E\u2068\u2069]/g, "");
			item.publicationTitle = parts[1].replace(/[\u200E\u2068\u2069]/g, "");
			let parsed = Zotero.Utilities.strToDate(parts[2]);
			item.date = parsed.date || parts[2];
		} else {
			Zotero.debug(" Unexpected title format: " + rawTitle);
			item.title = rawTitle;
		}

		// Extract article body
		let bodyElement = doc.querySelector("#pagesectionstextcontainer");
		if (bodyElement) {
			item.abstractNote = Zotero.Utilities.trimInternal(bodyElement.textContent);
		}

		// Page number (optional)
		let scripts = doc.querySelectorAll("script");
		for (let script of scripts) {
			let text = script.textContent || "";
			let match = text.match(/sectionPageBlockAreas\['\d+\.(\d+)'\]\s*=\s*\[\{pageID:'\d+\.(\d+)'/);
			if (match) {
				item.pages = match[2];
				break;
			}
		}

		Zotero.debug(" Finished scraping, calling item.complete()");
		item.complete();
	} catch (e) {
		Zotero.debug(" Error in scrape(): " + e);
		throw e;
	}
}

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
