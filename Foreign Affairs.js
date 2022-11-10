{
	"translatorID": "4ab6d49c-d94e-4a9c-ae9a-3310c44ba612",
	"label": "Foreign Affairs",
	"creator": "Sebastian Karcher, Philipp Zumstein",
	"target": "^https?://www\\.foreignaffairs\\.com",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-11-10 02:39:57"
}

/*
	***** BEGIN LICENSE BLOCK *****
	
	Copyright © 2016-2022 Sebastian Karcher & Philipp Zumstein
	
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


function detectWeb(doc, _url) {
	if (doc.getElementsByClassName('article-body-text').length) {
		return "magazineArticle";
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('article.article-card > a, div.article-data > h2.title > a');
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(row.textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

async function doWeb(doc, url) {
	if (detectWeb(doc, url) == 'multiple') {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (items) {
			await Promise.all(
				Object.keys(items)
					.map(url => requestDocument(url).then(scrape))
			);
		}
	}
	else {
		await scrape(doc, url);
	}
}

async function scrape(doc, url = doc.location.href) {
	var item = new Zotero.Item("magazineArticle");
	var author = text(doc, '.article-byline-author');
	var tags = doc.querySelectorAll('.article-footer--tag-item');
	var issue = text(doc, 'span.article-header--metadata-date>a');
	item.issue = issue.replace('Issue', '');

	// the date published can be unreliable. If the issue is earlier than than the
	// publication date, use the former
	// e.g. https://www.foreignaffairs.com/articles/middle-east/2012-01-01/time-attack-iran
	item.date = attr(doc, 'meta[property="article:published_time"]', 'content');
	item.title = attr(doc, 'meta[property="og:title"]', 'content');
	item.abstractNote = attr(doc, 'meta[name="abstract"]', 'content');
	if (item.issue) {
		var issueYear = item.issue.match(/\d{4}/);
	}
	if (item.date) {
		var dateYear = item.date.match(/\d{4}/);
	}
	if (issueYear && (!item.date || dateYear > issueYear)) {
		item.date = issueYear[0];
	}

	let authors = author.split(/, and|and |, /);
	for (let aut of authors) {
		item.creators.push(ZU.cleanAuthor(aut, "author"));
	}

	for (let tag of tags) {
		item.tags.push(tag.textContent);
	}
	item.url = url;
	item.attachments.push({ document: doc, title: "Snapshot" });
	item.publicationTitle = "Foreign Affairs";
	item.ISSN = "0015-7120";
	item.language = "en-US";
	item.complete();
}


/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.foreignaffairs.com/issues/2012/91/01",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.foreignaffairs.com/reviews/capsule-review/2003-05-01/history-argentina-twentieth-century",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "A History of Argentina in the Twentieth Century",
				"creators": [
					{
						"firstName": "Kenneth",
						"lastName": "Maxwell",
						"creatorType": "author"
					}
				],
				"date": "2003",
				"ISSN": "0015-7120",
				"abstractNote": "A fascinating and well-translated account of Argentina's misadventures over the last century by one of that country's brightest historians. Absorbing vast amounts of British capital and tens of thousands of European immigrants, Argentina began the century with great promise. In 1914, with half of its population still foreign, a dynamic society had emerged that was both open and mobile.",
				"issue": "May/June 2003",
				"language": "en-US",
				"libraryCatalog": "Foreign Affairs",
				"publicationTitle": "Foreign Affairs",
				"url": "https://www.foreignaffairs.com/reviews/capsule-review/2003-05-01/history-argentina-twentieth-century",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Argentina"
					},
					{
						"tag": "Western Hemisphere"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.foreignaffairs.com/articles/middle-east/2012-01-01/time-attack-iran",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "Time to Attack Iran",
				"creators": [
					{
						"firstName": "Matthew",
						"lastName": "Kroenig",
						"creatorType": "author"
					}
				],
				"date": "2012",
				"ISSN": "0015-7120",
				"abstractNote": "Opponents of military action against Iran assume a U.S. strike would be far more dangerous than simply letting Tehran build a bomb. Not so, argues this former Pentagon defense planner. With a carefully designed attack, Washington could mitigate the costs and spare the region and the world from an unacceptable threat.",
				"issue": "January/February 2012",
				"language": "en-US",
				"libraryCatalog": "Foreign Affairs",
				"publicationTitle": "Foreign Affairs",
				"url": "https://www.foreignaffairs.com/articles/middle-east/2012-01-01/time-attack-iran",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Arms Control & Disarmament"
					},
					{
						"tag": "Defense & Military"
					},
					{
						"tag": "Foreign Policy"
					},
					{
						"tag": "Iran"
					},
					{
						"tag": "Middle East"
					},
					{
						"tag": "Nuclear Weapons & Proliferation"
					},
					{
						"tag": "Obama Administration"
					},
					{
						"tag": "Persian Gulf"
					},
					{
						"tag": "Security"
					},
					{
						"tag": "Strategy & Conflict"
					},
					{
						"tag": "U.S. Foreign Policy"
					},
					{
						"tag": "War & Military Strategy"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.foreignaffairs.com/articles/united-states/2014-08-11/print-less-transfer-more",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "Print Less but Transfer More",
				"creators": [
					{
						"firstName": "Mark",
						"lastName": "Blyth",
						"creatorType": "author"
					},
					{
						"firstName": "Eric",
						"lastName": "Lonergan",
						"creatorType": "author"
					}
				],
				"date": "2014-09-04T21:23:08-04:00",
				"ISSN": "0015-7120",
				"abstractNote": "Most economists agree that the global economy is stagnating and that governments need to stimulate growth, but lowering interest rates still further could spur a damaging cycle of booms and busts. Instead, central banks should hand consumers cash directly.",
				"issue": "September/October 2014",
				"language": "en-US",
				"libraryCatalog": "Foreign Affairs",
				"publicationTitle": "Foreign Affairs",
				"url": "https://www.foreignaffairs.com/articles/united-states/2014-08-11/print-less-transfer-more",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Asia"
					},
					{
						"tag": "Economic Development"
					},
					{
						"tag": "Europe"
					},
					{
						"tag": "United States"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.foreignaffairs.com/articles/india/2014-09-08/modi-misses-mark",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "Modi Misses the Mark",
				"creators": [
					{
						"firstName": "Derek",
						"lastName": "Scissors",
						"creatorType": "author"
					}
				],
				"date": "2014-09-08T22:34:01-04:00",
				"ISSN": "0015-7120",
				"abstractNote": "India needs fundamental change: its rural land rights system is a mess, its manufacturing sector has been strangled by labor market restrictions, and its states are poorly integrated. But, so far, Modi has squandered major opportunities to establish his economic vision.",
				"language": "en-US",
				"libraryCatalog": "Foreign Affairs",
				"publicationTitle": "Foreign Affairs",
				"url": "https://www.foreignaffairs.com/articles/india/2014-09-08/modi-misses-mark",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Economics"
					},
					{
						"tag": "India"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.foreignaffairs.com/world/spirals-delusion-artificial-intelligence-decision-making",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "Spirals of Delusion",
				"creators": [
					{
						"firstName": "Henry",
						"lastName": "Farrell",
						"creatorType": "author"
					},
					{
						"firstName": "Abraham",
						"lastName": "Newman",
						"creatorType": "author"
					},
					{
						"firstName": "Jeremy",
						"lastName": "Wallace",
						"creatorType": "author"
					}
				],
				"date": "2022-09-07T21:41:06-04:00",
				"ISSN": "0015-7120",
				"abstractNote": "How AI distorts decision-making and makes dictators more dangerous.",
				"issue": "September/October 2022",
				"language": "en-US",
				"libraryCatalog": "Foreign Affairs",
				"publicationTitle": "Foreign Affairs",
				"url": "https://www.foreignaffairs.com/world/spirals-delusion-artificial-intelligence-decision-making",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Authoritarianism"
					},
					{
						"tag": "Disinformation"
					},
					{
						"tag": "Foreign Affairs: 100 Years"
					},
					{
						"tag": "Intelligence"
					},
					{
						"tag": "Science & Technology"
					},
					{
						"tag": "World"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.foreignaffairs.com/search/argentina",
		"items": "multiple"
	}
]
/** END TEST CASES **/
