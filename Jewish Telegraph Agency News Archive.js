{
	"translatorID": "a3954ee5-ee4e-44d5-8a4e-d6662473e133",
	"label": "Jewish Telegraph Agency News Archive",
	"creator": "Anonymus",
	"target": "^https:\\/\\/www\\.jta\\.org\\/archive\\/.*",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-07-18 10:59:49"
}

function detectWeb(doc, url) {
	// This function determines if the translator should be active on the current page.
	// It checks if the URL matches the JTA archive pattern and if a main article title
	// element (h1 with class "entry-title") is present, indicating an article page.
	if (url.match(/^https?:\/\/www\.jta\.org\/archive\//) && ZU.xpathText(doc, '//h1[@class="entry-title"]')) {
		return "newspaperArticle"; // Returns the Zotero item type
	}
	return false; // Translator should not be active
}

async function doWeb(doc, url) {
	await scrape(doc, url)
}

async function scrape(doc, url) {
	// This function performs the actual scraping and creates a Zotero item.
	const item = new Zotero.Item("newspaperArticle");

	// 1. Extract Title: Scrapes the main headline of the article.
	const titleNode = doc.querySelector('h1.entry-title');
	if (titleNode) {
		item.title = titleNode.textContent.trim();
	}

	// 2. Set Publication Title: The publication is consistently "Jewish Telegraphic Agency" for this archive.
	item.publicationTitle = "Jewish Telegraphic Agency";

	// 3. Set URL: Prefers the canonical URL found in the HTML head for consistency,
	//    falling back to the current page URL if the canonical link is not found.
	item.url = url.split('?')[0].split('#')[0];

	// 4. Extract Date:
	//    First, attempts to extract the date from the JSON-LD schema embedded in the HTML.
	//    This is generally the most reliable method as it provides a standardized date format.
	const dateElem = doc.querySelector('.post-pdf__date');
	item.date = dateElem.textContent.trim();

	item.attachments.push({
	title: "Snapshot",
	document: doc
	})

	item.libraryCatalog = "Jewish Telegraphic Agency Archive"; // Specific catalog for JTA
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.jta.org/archive/palestine-must-be-built-in-cooperation-with-arabs-and-christians-says-dr-weizmann",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Palestine Must Be Built in Cooperation with Arabs and Christians Says Dr. Weizmann",
				"creators": [],
				"date": "January 10, 1924",
				"libraryCatalog": "Jewish Telegraphic Agency Archive",
				"publicationTitle": "Jewish Telegraphic Agency",
				"url": "https://www.jta.org/archive/palestine-must-be-built-in-cooperation-with-arabs-and-christians-says-dr-weizmann",
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
