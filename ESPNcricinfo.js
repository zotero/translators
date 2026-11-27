{
	"translatorID": "47049d67-5a0a-40d1-8137-d3b23b6f501b",
	"label": "ESPNcricinfo",
	"creator": "Vera de Kok",
	"target": "^https?://([^/]+\\.)?espncricinfo\\.com/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-11-06 16:01:04"
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

function getSchema(doc) {
	let nodes = [];
	for (let script of doc.querySelectorAll('script[type="application/ld+json"]')) {
		let data;
		try {
			data = JSON.parse(script.textContent);
		}
		catch (e) {
			continue;
		}
		for (let block of Array.isArray(data) ? data : [data]) {
			if (!block || typeof block != 'object') continue;
			nodes.push(...(block['@graph'] || [block]));
		}
	}
	return {
		find(types) {
			return nodes.find(node => node && [node['@type']].flat().some(type => types.includes(type)));
		}
	};
}

function isProfile(url) {
	return /\/(?:cricketers\/|content\/player\/\d+\.html)/.test(url);
}

function isScorecard(url) {
	return /\/(?:full-scorecard|live-cricket-score)(?:[/?#]|$)/.test(url)
		|| /\/(?:engine\/(?:current\/)?match\/|content\/match\/)\d+\.html/.test(url);
}

function isArticle(url) {
	return /\/story\/(?:[^/?#]+-\d+(?:[/?#]|$)|_\/id\/\d+(?:[/?#]|$))/.test(url)
		|| /\/(?:match-report(?:[/?#-]|$)|content\/story\/\d+\.html)/.test(url);
}

function detectWeb(doc, url) {
	let schema = getSchema(doc);
	if (isArticle(url) && schema.find(['NewsArticle', 'Article'])) return 'newspaperArticle';
	if (isScorecard(url) && schema.find(['SportsEvent'])) return 'webpage';
	if (isProfile(url) && schema.find(['Person'])) return 'webpage';
	if (getSearchResults(doc, true)) return 'multiple';
	return false;
}

function getSearchResults(doc, checkOnly) {
	let items = {};
	for (let link of doc.querySelectorAll('a[href]')) {
		if (link.closest('nav, header, footer')) continue;
		if (!/(^|\.)espncricinfo\.com$/i.test(link.hostname)) continue;
		let href = link.href.replace(/#.*$/, '');
		if (!isArticle(href) && !isScorecard(href) && !isProfile(href)) continue;
		let heading = link.querySelector('h2, h3, h4, .MobileSearchResult__Name, p');
		if (!heading) continue;
		let title = ZU.trimInternal(heading.textContent);
		if (!title) continue;
		if (checkOnly) return true;
		items[href] = title;
	}
	return Object.keys(items).length ? items : false;
}

async function doWeb(doc, url) {
	if (detectWeb(doc, url) == 'multiple') {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (!items) return;
		for (let url of Object.keys(items)) {
			scrape(await requestDocument(url), url);
		}
	}
	else {
		scrape(doc, url);
	}
}

function cleanText(value) {
	return ZU.trimInternal(value || '').replace(/[\s|]+ESPNcricinfo$/i, '');
}

function getArticleTags(doc, section) {
	// The visible topic pills include players, teams and matches absent from JSON-LD.
	let labels = Array.from(doc.querySelectorAll('article.ci-story a > span.ds-rounded-3xl'),
		pill => pill.textContent);
	if (section) labels.push(section);
	let seen = new Set();
	let tags = [];
	for (let label of labels) {
		let tag = ZU.trimInternal(label);
		let key = tag.toLowerCase();
		if (!tag || seen.has(key)) continue;
		seen.add(key);
		tags.push({ tag });
	}
	return tags;
}

function scrape(doc, url) {
	let schema = getSchema(doc);
	let article = schema.find(['NewsArticle', 'Article']);
	let event = schema.find(['SportsEvent']);
	let person = isProfile(url) && schema.find(['Person']);
	if (!article && !event && !person) return;

	let item = new Zotero.Item(article ? 'newspaperArticle' : 'webpage');
	let source = article || event || person;
	let heading = doc.querySelector('h1');
	let metaDescription = doc.querySelector('meta[name="description"]');
	let canonical = doc.querySelector('link[rel="canonical"]');
	item.title = cleanText(source.headline || source.name
		|| (heading && heading.textContent) || doc.title);
	item.url = canonical ? canonical.href : url;
	item.abstractNote = source.description
		|| (metaDescription && metaDescription.content) || '';
	item.language = doc.documentElement.lang || 'en';
	if (!article) item.websiteTitle = 'ESPNcricinfo';

	if (article) {
		item.publicationTitle = 'ESPNcricinfo';
		item.date = article.datePublished ? article.datePublished.slice(0, 10) : '';
		let authors = Array.isArray(article.author) ? article.author : [article.author];
		for (let author of authors) {
			let name = typeof author == 'string' ? author : author && author.name;
			if (name) item.creators.push(ZU.cleanAuthor(name, 'author'));
		}
		item.tags = getArticleTags(doc, article.articleSection);
	}
	else if (event) {
		item.date = event.startDate ? event.startDate.slice(0, 10) : '';
		if (event.endDate && event.endDate.slice(0, 10) != item.date) {
			item.date += '/' + event.endDate.slice(0, 10);
		}
	}
	// A profile's Person.birthDate is biographical data, not a page date.

	item.attachments.push({ document: doc, title: 'Snapshot', mimeType: 'text/html' });
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.espncricinfo.com/series/indian-premier-league-2024-1410320/kolkata-knight-riders-vs-sunrisers-hyderabad-final-1426312/full-scorecard",
		"items": [
			{
				"itemType": "webpage",
				"title": "KKR vs SRH Cricket Scorecard, Final at Chennai, May 26, 2024",
				"creators": [],
				"date": "2024-05-26",
				"abstractNote": "Live Cricket Scoreboard: Get Kolkata Knight Riders vs Sunrisers Hyderabad Final,  cricket scorecard, Indian Premier League 2024 dated May 26, 2024.",
				"language": "en",
				"libraryCatalog": "ESPNcricinfo",
				"url": "https://www.espncricinfo.com/series/indian-premier-league-2024-1410320/kolkata-knight-riders-vs-sunrisers-hyderabad-final-1426312/full-scorecard",
				"websiteTitle": "ESPNcricinfo",
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
		"url": "https://www.espncricinfo.com/series/india-tour-of-sri-lanka-2010-455238/sri-lanka-vs-india-1st-test-456669/full-scorecard",
		"items": [
			{
				"itemType": "webpage",
				"title": "SL vs IND Cricket Scorecard, 1st Test at Galle, July 18 - 22, 2010",
				"creators": [],
				"date": "2010-07-18/2010-07-22",
				"abstractNote": "Get cricket scorecard of 1st Test,  SL vs IND, India tour of Sri Lanka 2010 at Galle International Stadium dated July 18 - 22, 2010.",
				"language": "en",
				"libraryCatalog": "ESPNcricinfo",
				"url": "https://www.espncricinfo.com/series/india-tour-of-sri-lanka-2010-455238/sri-lanka-vs-india-1st-test-456669/full-scorecard",
				"websiteTitle": "ESPNcricinfo",
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
		"url": "https://www.espncricinfo.com/cricketers/virat-kohli-253802",
		"items": [
			{
				"itemType": "webpage",
				"title": "Virat Kohli",
				"creators": [],
				"abstractNote": "Read about Virat Kohli cricket player from India profile, stats, rankings, records, videos, photos at ESPNcricinfo",
				"language": "en",
				"libraryCatalog": "ESPNcricinfo",
				"url": "https://www.espncricinfo.com/cricketers/virat-kohli-253802",
				"websiteTitle": "ESPNcricinfo",
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
		"url": "https://www.espncricinfo.com/story/monga-virat-kohli-s-weakness-grows-wider-765485",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Kohli's weakness grows wider",
				"creators": [
					{
						"firstName": "Sidharth",
						"lastName": "Monga",
						"creatorType": "author"
					}
				],
				"date": "2014-07-29",
				"abstractNote": "Virat Kohli's is a game without any other glaring weakness but England have clearly tried to play on the attacking batsman's ego a bit but starving him outside off stump",
				"language": "en",
				"libraryCatalog": "ESPNcricinfo",
				"publicationTitle": "ESPNcricinfo",
				"url": "https://www.espncricinfo.com/story/monga-virat-kohli-s-weakness-grows-wider-765485",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Virat Kohli"
					},
					{
						"tag": "India"
					},
					{
						"tag": "England"
					},
					{
						"tag": "England vs India"
					},
					{
						"tag": "India tour of England"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.espncricinfo.com/series/indian-premier-league-2024-1410320/kolkata-knight-riders-vs-sunrisers-hyderabad-final-1426312/match-report",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "KKR's bowlers rip through SRH to win third IPL title",
				"creators": [
					{
						"firstName": "Sidharth",
						"lastName": "Monga",
						"creatorType": "author"
					}
				],
				"date": "2024-05-26",
				"abstractNote": "Mitchell Starc bowled Abhishek Sharma in the first over, and there was no way back for SRH",
				"language": "en",
				"libraryCatalog": "ESPNcricinfo",
				"publicationTitle": "ESPNcricinfo",
				"url": "https://www.espncricinfo.com/series/indian-premier-league-2024-1410320/kolkata-knight-riders-vs-sunrisers-hyderabad-final-1426312/match-report",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Mitchell Starc"
					},
					{
						"tag": "Venkatesh Iyer"
					},
					{
						"tag": "Sunrisers Hyderabad"
					},
					{
						"tag": "Kolkata Knight Riders"
					},
					{
						"tag": "SRH vs KKR"
					},
					{
						"tag": "Indian Premier League"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.espncricinfo.com/cricket-news",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.espncricinfo.com/cricket-features",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.espncricinfo.com/search/_/q/kohli",
		"items": "multiple"
	}
]
/** END TEST CASES **/
