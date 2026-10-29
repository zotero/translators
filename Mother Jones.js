{
	"translatorID": "6b0e4b7d-3c2a-4f18-9d55-8a1c2e4f7b90",
	"label": "Mother Jones",
	"creator": "Vera de Kok",
	"target": "^https?://(www\\.)?motherjones\\.com/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-10-27 10:00:00"
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
	if (/\/(19|20)\d{2}\/\d{2}\//.test(url)) {
		return 'magazineArticle';
	}
	else if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('ul.articles-list li.article-item a[rel="bookmark"]');
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(row.textContent || row.title);
		if (!href || !title || !/\/(19|20)\d{2}\//.test(href)) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

async function doWeb(doc, url) {
	if (detectWeb(doc, url) == 'multiple') {
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

function getCreators(doc) {
	// Each author gets their own h3.byline block (newer theme) or sits inside
	// p.byline-dateline (print-issue pages); 'Follow' links are not rel=author.
	var names = [];
	for (let a of doc.querySelectorAll('h3.byline a[rel="author"], p.byline-dateline a[rel="author"]')) {
		let name = ZU.trimInternal(a.textContent);
		if (name && !names.includes(name)) names.push(name);
	}
	return names;
}

async function scrape(doc, url = doc.location.href) {
	let translator = Zotero.loadTranslator('web');
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48'); // Embedded Metadata
	translator.setDocument(doc);

	translator.setHandler('itemDone', (_obj, item) => {
		item.publicationTitle = 'Mother Jones';
		item.libraryCatalog = 'Mother Jones';
		item.itemType = 'magazineArticle';

		// EM has no date to work with: there is no JSON-LD and no
		// article:published_time. The site uses article:published (with
		// timezone offset) and parsely-pub-date (UTC).
		if (!item.date) {
			let date = ZU.xpathText(doc, '//meta[@property="article:published"]/@content')
				|| ZU.xpathText(doc, '//meta[@name="parsely-pub-date"]/@content');
			if (date) {
				item.date = ZU.strToISO(date);
			}
		}

		// Bylines: the DOM byline beats article:author, which on multi-author
		// pieces sometimes only lists the first writer.
		let names = getCreators(doc);
		if (!names.length) {
			let metaAuthor = ZU.xpathText(doc, '//meta[@property="article:author"]/@content')
				|| ZU.xpathText(doc, '//meta[@name="parsely-author"]/@content');
			if (metaAuthor) {
				names = metaAuthor.split(/\s*[,;]\s*|\s+and\s+/).map(s => s.trim()).filter(s => s);
			}
		}
		if (names.length) {
			item.creators = [];
			for (let name of names) {
				if (/^(mother jones|staff|unknown)$/i.test(name)) {
					// corporate byline: this is the publication, not a person
					continue;
				}
				item.creators.push(ZU.cleanAuthor(name, 'author'));
			}
		}

		item.complete();
	});

	let em = await translator.getTranslatorObject();
	em.itemType = 'magazineArticle';
	await em.doWeb(doc, url);
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.motherjones.com/politics/2013/02/5-female-vocalists-to-watch-2013/",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "5 Female Vocalists to Watch in 2013",
				"creators": [
					{
						"firstName": "Maddie",
						"lastName": "Oatman",
						"creatorType": "author"
					}
				],
				"date": "2013-02-18",
				"abstractNote": "From blues to electronica to mariachi sounds, these talented voices could be the next big thing.",
				"language": "en-US",
				"libraryCatalog": "Mother Jones",
				"publicationTitle": "Mother Jones",
				"url": "https://www.motherjones.com/politics/2013/02/5-female-vocalists-to-watch-2013/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Music"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.motherjones.com/politics/2026/06/alaska-foster-youth-reform-legislation-hb-36-mother-jones-investigation/",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "A Mother Jones investigation helped spur a new Alaska law protecting vulnerable kids",
				"creators": [
					{
						"firstName": "Julia",
						"lastName": "Lurie",
						"creatorType": "author"
					}
				],
				"date": "2026-06-23",
				"abstractNote": "HB 36 will require a review of foster kids' placements in psychiatric hospitals.",
				"language": "en-US",
				"libraryCatalog": "Mother Jones",
				"publicationTitle": "Mother Jones",
				"url": "https://www.motherjones.com/politics/2026/06/alaska-foster-youth-reform-legislation-hb-36-mother-jones-investigation/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Children"
					},
					{
						"tag": "Health"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.motherjones.com/?s=climate",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.motherjones.com/politics/2026/06/trump-resurrected-the-statue-of-a-slave-owner-its-pedestal-cost-taxpayers-527k/",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "Trump resurrected the statue of a slave owner. Its pedestal cost taxpayers $527K.",
				"creators": [
					{
						"firstName": "Dan",
						"lastName": "Friedman",
						"creatorType": "author"
					},
					{
						"firstName": "Abby",
						"lastName": "Vesoulis",
						"creatorType": "author"
					}
				],
				"date": "2026-06-18",
				"abstractNote": "Contracting documents obtained by Mother Jones indicate the price was nearly double the government's estimate.",
				"language": "en-US",
				"libraryCatalog": "Mother Jones",
				"publicationTitle": "Mother Jones",
				"url": "https://www.motherjones.com/politics/2026/06/trump-resurrected-the-statue-of-a-slave-owner-its-pedestal-cost-taxpayers-527k/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "America 250"
					},
					{
						"tag": "Donald Trump"
					},
					{
						"tag": "Race"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
