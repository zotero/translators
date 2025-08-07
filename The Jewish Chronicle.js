{
	"translatorID": "138c35a8-8a49-444e-bcf4-47152a3ef54d",
	"label": "The Jewish Chronicle",
	"creator": "Anonymous",
	"target": "^https?:\\/\\/(www\\.)?thejc\\.com\\/.*",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-08-07 19:28:32"
}

function detectWeb(doc) {
	if (doc.querySelector('meta[property="og:author"]')?.content !== null)
	return "newspaperArticle";
}

function doWeb(doc, url) {
	const item = new Zotero.Item("newspaperArticle");

	item.title = textContent(doc, 'meta[property="og:title"]') || doc.querySelector('title')?.textContent?.trim();

	item.abstractNote = textContent(doc, 'meta[name="description"]') || textContent(doc, 'meta[property="og:description"]');

	item.date = (textContent(doc, 'meta[property="article:published_time"]') || "").split("T")[0]; // removes the time

	item.creators = [{
		lastName: textContent(doc, 'meta[name="author"]') || "Unknown",
		creatorType: "author",
		fieldMode: 1
	}];

	item.publicationTitle = "The Jewish Chronicle";
	item.url = url;

	item.complete();
}

function textContent(doc, selector) {
	const el = doc.querySelector(selector);
	return el ? el.content || el.getAttribute("content") || el.textContent?.trim() : "";
}

/** BEGIN TEST CASES **/
var testCases = [
	
]
/** END TEST CASES **/
