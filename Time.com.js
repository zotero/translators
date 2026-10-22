{
	"translatorID": "d9be934c-edb9-490c-a88d-34e2ee106cd7",
	"label": "Time.com",
	"creator": "Michael Berkowitz, Vera de Kok",
	"target": "^https?://([^/]*\\.)?time\\.com/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsv",
	"lastUpdated": "2026-10-22 15:40:00"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2008 Michael Berkowitz
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
	if (/\/article\/|\d{4}\/\d{2}\/\d{2}\//.test(url)) {
		return "magazineArticle";
	}
	// Legacy URLs (/3533556/title/, /5691641/title/) carry no date in the path;
	// the NewsArticle JSON-LD is what identifies them as articles now.
	if (getJSONLD(doc)['@type'] == 'NewsArticle') {
		return "magazineArticle";
	}
	return false;
}


function getJSONLD(doc) {
	for (let script of doc.querySelectorAll('script[type="application/ld+json"]')) {
		let data;
		try {
			data = JSON.parse(script.textContent);
		}
		catch (e) {
			continue;
		}
		if (data instanceof Array) {
			data = data[0];
		}
		if (data && data['@type'] == 'NewsArticle') return data;
	}
	return {};
}


// Legacy articles put a dateline in the author name ("Haley Sweetland Edwards /
// Cupertino, Calif.") and some bylines lead with the agency ("AP / Jane Doe").
function cleanBylineName(name) {
	var matches = name.match(/^\s*([^/]+?)\s*\/\s*(.+?)\s*$/);
	if (matches) {
		name = (matches[1] == 'AP' || matches[1] == 'Fortune') ? matches[2] : matches[1];
	}
	return ZU.trimInternal(name);
}


// The DOM carries no byline markup anymore - the complete author list only
// exists as Person nodes in the NewsArticle JSON-LD.
function getJSONLDAuthors(doc) {
	var data = getJSONLD(doc);
	if (!data.author) return [];
	var authors = data.author instanceof Array ? data.author : [data.author];
	var names = [];
	for (var i = 0, n = authors.length; i < n; i++) {
		var name = authors[i] && authors[i].name;
		if (name) names.push(cleanBylineName(name));
	}
	return names;
}


function addExtra(item, line) {
	item.extra = item.extra ? item.extra + '\n' + line : line;
}


async function scrape(doc, url = doc.location.href) {
	var article = getJSONLD(doc);

	var translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	translator.setHandler('itemDone', function (obj, item) {
		item.itemType = "magazineArticle";
		item.publicationTitle = "Time";
		item.url = url;
		item.ISSN = "0040-781X";
		item.language = "en-US";

		item.creators = getJSONLDAuthors(doc).map(function (name) {
			return ZU.cleanAuthor(name, 'author');
		});

		var date = article.datePublished
			|| ZU.xpathText(doc, '//meta[@property="article:published_time"]/@content');
		if (date) item.date = ZU.strToISO(date);

		// magazineArticle has no section field, so keep it in extra.
		// time.com serves it as <meta name="article:section">, not property=.
		var section = ZU.xpathText(doc, '//meta[@name="article:section"]/@content')
			|| ZU.xpathText(doc, '//meta[@property="article:section"]/@content');
		if (section) addExtra(item, 'Section: ' + section.trim());

		// keywords only exist as a JSON-LD array, not as meta keywords
		if (!item.tags.length && article.keywords) {
			var keywords = article.keywords instanceof Array ? article.keywords : [article.keywords];
			for (var i = 0, n = keywords.length; i < n; i++) {
				var keyword = ZU.trimInternal(String(keywords[i] || ''));
				if (keyword) item.tags.push({ tag: keyword });
			}
		}

		item.complete();
	});

	var em = await translator.getTranslatorObject();
	em.addCustomFields({
		date: 'date'
	});

	await translator.translate();
}


async function doWeb(doc, url) {
	await scrape(doc, url);
}


/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://time.com/article/2026/10/16/katie-zacharia-out-as-trump-s-press-secretary-after-1-briefing/",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "Katie Zacharia Out as Trump's Press Secretary After 5 Days",
				"creators": [
					{
						"firstName": "Connor",
						"lastName": "Greene",
						"creatorType": "author"
					},
					{
						"firstName": "Nik",
						"lastName": "Popli",
						"creatorType": "author"
					}
				],
				"date": "2026-10-16",
				"ISSN": "0040-781X",
				"abstractNote": "Trump on Friday said to reporters that he had told Zacharia to \"reconsider\" her role.",
				"extra": "Section: Politics",
				"language": "en-US",
				"libraryCatalog": "time.com",
				"publicationTitle": "Time",
				"url": "https://time.com/article/2026/10/16/katie-zacharia-out-as-trump-s-press-secretary-after-1-briefing/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "News Desk"
					},
					{
						"tag": "Trump Administration"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://time.com/article/2026/10/20/how-to-take-a-color-walk/",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "Why You Should Turn Your Walk Into a Color Hunt",
				"creators": [
					{
						"firstName": "Angela",
						"lastName": "Haupt",
						"creatorType": "author"
					}
				],
				"date": "2026-10-20",
				"ISSN": "0040-781X",
				"abstractNote": "Searching for a single color can help you tune in and notice more.",
				"extra": "Section: Health",
				"language": "en-US",
				"libraryCatalog": "time.com",
				"publicationTitle": "Time",
				"url": "https://time.com/article/2026/10/20/how-to-take-a-color-walk/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Exercise & Fitness"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://time.com/3533556/the-war-on-teacher-tenure/",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "War on Teacher Tenure: How Silicon Valley Wants to Fire Bad Teachers",
				"creators": [
					{
						"firstName": "Haley Sweetland",
						"lastName": "Edwards",
						"creatorType": "author"
					}
				],
				"date": "2014-10-30",
				"ISSN": "0040-781X",
				"abstractNote": "It’s really difficult to fire a bad teacher. A group of Silicon Valley investors wants to change that",
				"extra": "Section: U.S.",
				"language": "en-US",
				"libraryCatalog": "time.com",
				"publicationTitle": "Time",
				"shortTitle": "War on Teacher Tenure",
				"url": "https://time.com/3533556/the-war-on-teacher-tenure/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Cover Story"
					},
					{
						"tag": "Education"
					},
					{
						"tag": "Silicon Valley"
					},
					{
						"tag": "Tech"
					},
					{
						"tag": "nation"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
