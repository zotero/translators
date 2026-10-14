{
	"translatorID": "c7830593-807e-48cb-99f2-c3bed2b148c2",
	"label": "New Zealand Herald",
	"creator": "Philipp Zumstein",
	"target": "^https?://www\\.nzherald\\.co\\.nz",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-10-14 21:15:00"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2017 Philipp Zumstein
	
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
	if (url.includes("/search") && getSearchResults(doc, true)) {
		return "multiple";
	}
	else if (url.includes("/news/article.cfm")) {
		return "newspaperArticle";
	}
	// Modern article URLs are /<section>/<slug>/<hash>/ (and premium ones
	// /premium/<section>/...); they carry an Article/NewsArticle JSON-LD block.
	else if (/\/(nz|premium|world|business|sport|lifestyle|entertainment|technology)\//
		&& getJSONLD(doc)) {
		return "newspaperArticle";
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
		for (let block of (Array.isArray(data) ? data : [data])) {
			if (!block || typeof block !== 'object') continue;
			for (let node of (block['@graph'] ? block['@graph'] : [block])) {
				let type = node['@type'];
				if ((type == 'NewsArticle' || type == 'Article' || type == 'ReportageNewsArticle')
					&& node.headline) {
					return node;
				}
			}
		}
	}
	return null;
}


// Staff bylines and agency names are not individual authors
// ("Herald Reporters", "Staff Reporter", "Reporters, Herald").
var COLLECTIVE_AUTHOR = /herald\s+reporters?|reporters?\s*,?\s*herald|staff\s+(?:reporters?|writers?)|(?:reporters?|writers?)\s+(?:team|staff)/i;

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('article.result-item a[href*="/news/article.cfm"]');
	for (var i = 0; i < rows.length; i++) {
		var href = rows[i].href;
		var title = ZU.trimInternal(rows[i].textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}


function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (!items) return;

			var articles = [];
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, scrape);
		});
	}
	else {
		scrape(doc, url);
	}
}


function scrape(doc, url) {
	var translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	// translator.setDocument(doc);
	
	translator.setHandler('itemDone', function (obj, item) {
		item.ISSN = "1170-0777";
		// EM looks at byline for author which does not work well here;
		// thus we delete this and do it here again properly
		item.creators = [];
		var data = getJSONLD(doc);
		var author = text(doc, '.byline.has-author .author');
		if (!author) {
			var firstElement = text(doc, '#article-content p.element');
			if (firstElement && firstElement.includes('By')) {
				author = firstElement;
			}
		}
		if (!author && data && data.author) {
			// Modern pages expose the byline as author[].name in JSON-LD;
			// JSON-LD marks real people as @type Person and syndication as
			// @type Organization ("RNZ", "NZ Herald").
			let authors = data.author;
			if (typeof authors == 'object' && !Array.isArray(authors)) {
				authors = [authors];
			}
			authors.forEach((a) => {
				let name = (typeof a == 'string' ? a : a.name) || '';
				name = name.trim();
				if (!name || COLLECTIVE_AUTHOR.test(name)) return;
				if (typeof a == 'object' && a['@type'] == 'Organization') {
					item.creators.push({ lastName: name, creatorType: "author", fieldMode: 1 });
				}
				else {
					// @type Person is authoritative here, so "Amy B Wang" stays a
					// person rather than becoming a corporate author.
					item.creators.push(ZU.cleanAuthor(name, "author"));
				}
			});
		}
		if (author && !item.creators.length) {
			author = author.replace(/^By\s*/i, '').replace(/,\s*$/, '').trim();
			if (!COLLECTIVE_AUTHOR.test(author)) {
				// Collective bylines ("Herald Reporters") are not person names
				if (author.split(/\s+/).length > 2) {
					item.creators.push({ lastName: author, creatorType: "author", fieldMode: 1 });
				}
				else {
					item.creators.push(ZU.cleanAuthor(author, "author"));
				}
			}
		}
		if (!item.date && data && data.datePublished) {
			item.date = data.datePublished;
		}
		item.url = attr(doc, 'link[rel=canonical]', 'href');
		if (item.language) {
			item.language = item.language.replace('_', '-');
		}
		item.complete();
	});

	translator.getTranslatorObject(function (trans) {
		trans.itemType = "newspaperArticle";
		trans.addCustomFields({
			language: 'language',
			'article:section': 'section'
		});
		trans.doWeb(doc, url);
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.nzherald.co.nz/world/news/article.cfm?c_id=2&objectid=11892211",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "China unveils its answer to US Reaper drone - how does it compare?",
				"creators": [
					{
						"firstName": "Stephen",
						"lastName": "Chen",
						"creatorType": "author"
					}
				],
				"date": "2017-07-18T02:45:22Z",
				"ISSN": "1170-0777",
				"abstractNote": "A production model of China's heavy military drone has made a successful flight.",
				"language": "en-NZ",
				"libraryCatalog": "www.nzherald.co.nz",
				"publicationTitle": "NZ Herald",
				"section": "World",
				"url": "http://www.nzherald.co.nz/world/news/article.cfm?c_id=2&objectid=11892211",
				"attachments": [
					{
						"title": "Snapshot"
					}
				],
				"tags": [
					"Asia",
					"China",
					"Front Page - Top Stories"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.nzherald.co.nz/technology/news/article.cfm?c_id=5&objectid=11891847",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Data drones a sign of the times",
				"creators": [
					{
						"firstName": "James",
						"lastName": "Penn",
						"creatorType": "author"
					}
				],
				"date": "2017-07-19T18:00:00Z",
				"ISSN": "1170-0777",
				"abstractNote": "New tech could have farmers checking the state of their farm before getting out of bed.",
				"language": "en-NZ",
				"libraryCatalog": "www.nzherald.co.nz",
				"publicationTitle": "NZ Herald",
				"section": "Business, Technology",
				"url": "http://www.nzherald.co.nz/business/news/article.cfm?c_id=3&objectid=11891847",
				"attachments": [
					{
						"title": "Snapshot"
					}
				],
				"tags": [
					"Agribusiness Report",
					"Agricultural Services",
					"The Country"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.nzherald.co.nz/technology/news/article.cfm?c_id=5&objectid=11892937",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Nanogirl Michelle Dickinson: Getaway without the long-haul flight",
				"creators": [
					{
						"firstName": "Michelle",
						"lastName": "Dickinson",
						"creatorType": "author"
					}
				],
				"date": "2017-07-21T17:00:00Z",
				"ISSN": "1170-0777",
				"abstractNote": "COMMENT: The future of air travel is faster and quieter.",
				"language": "en-NZ",
				"libraryCatalog": "www.nzherald.co.nz",
				"publicationTitle": "NZ Herald",
				"section": "Technology",
				"shortTitle": "Nanogirl Michelle Dickinson",
				"url": "http://www.nzherald.co.nz/technology/news/article.cfm?c_id=5&objectid=11892937",
				"attachments": [
					{
						"title": "Snapshot"
					}
				],
				"tags": [
					"Opinion",
					"Science"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.nzherald.co.nz/nz/news/article.cfm?c_id=1&objectid=11893407",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Steve Braunias: The Secret Diary of Todd Barclay",
				"creators": [
					{
						"firstName": "Steve",
						"lastName": "Braunias",
						"creatorType": "author"
					}
				],
				"date": "2017-07-21T17:00:00Z",
				"ISSN": "1170-0777",
				"abstractNote": "Steve Braunias takes a look at Todd Barclay's secret diary",
				"language": "en-NZ",
				"libraryCatalog": "www.nzherald.co.nz",
				"publicationTitle": "NZ Herald",
				"section": "New Zealand",
				"shortTitle": "Steve Braunias",
				"url": "http://www.nzherald.co.nz/nz/news/article.cfm?c_id=1&objectid=11893407",
				"attachments": [
					{
						"title": "Snapshot"
					}
				],
				"tags": [
					"Australasia",
					"Front Page - Top Stories",
					"New Zealand",
					"Opinion",
					"Politics",
					"WC - Opinion"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.nzherald.co.nz/search/hobbits/?type=article,image.gallery,video.other&c_id=2",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.nzherald.co.nz/nz/christchurch-double-homicide-58-year-old-man-appears-in-court-on-murder-charges/6IJP6LCJEBAUFDZVIIZTGKS3RA/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Christchurch double homicide: 58-year-old man appears in court on murder charges",
				"creators": [],
				"date": "2026-10-11T21:47:46.974Z",
				"ISSN": "1170-0777",
				"abstractNote": "He is accused of killing two men at the weekend, including a former motorcycle gang boss.",
				"language": "en-NZ",
				"libraryCatalog": "www.nzherald.co.nz",
				"publicationTitle": "NZ Herald",
				"section": "New Zealand, Crime, Christchurch",
				"shortTitle": "Christchurch double homicide",
				"url": "https://www.nzherald.co.nz/nz/christchurch-double-homicide-58-year-old-man-appears-in-court-on-murder-charges/6IJP6LCJEBAUFDZVIIZTGKS3RA/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Canterbury"
					},
					{
						"tag": "Christchurch"
					},
					{
						"tag": "Police"
					},
					{
						"tag": "South Island"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.nzherald.co.nz/nz/metservice-wind-watch-for-wellington-as-100kmh-gusts-approach/RTZVNJHPSZDAJJT3GGHXGC7274/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Severe wind watch: 100km/h gusts expected across Wellington",
				"creators": [
					{
						"lastName": "RNZ",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "2026-10-14T07:13:39.413Z",
				"ISSN": "1170-0777",
				"abstractNote": "MetService says the watch has a moderate chance of becoming a warning.",
				"language": "en-NZ",
				"libraryCatalog": "www.nzherald.co.nz",
				"publicationTitle": "NZ Herald",
				"section": "New Zealand",
				"shortTitle": "Severe wind watch",
				"url": "https://www.nzherald.co.nz/nz/metservice-wind-watch-for-wellington-as-100kmh-gusts-approach/RTZVNJHPSZDAJJT3GGHXGC7274/",
				"tags": [
					{
						"tag": "Cook Strait"
					},
					{
						"tag": "Kapiti"
					},
					{
						"tag": "Metservice"
					},
					{
						"tag": "Radio New Zealand"
					},
					{
						"tag": "Weather Watch"
					},
					{
						"tag": "Weather news"
					},
					{
						"tag": "Wellington Region"
					}
				],
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.nzherald.co.nz/nz/53-years-in-the-same-business-and-ive-never-been-so-short-of-work-the-front-page/JGZSLY6H7BDBLMOGXPIC3WI35Q/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "93% of infrastructure respondents rank cross-party agreement top priority",
				"creators": [
					{
						"firstName": "Katie",
						"lastName": "Bradford",
						"creatorType": "author"
					}
				],
				"date": "2026-10-14T04:00:00Z",
				"ISSN": "1170-0777",
				"abstractNote": "'The Pulse' survey shows one key message on repeat from the infrastructure sector.",
				"language": "en-NZ",
				"libraryCatalog": "www.nzherald.co.nz",
				"publicationTitle": "NZ Herald",
				"section": "New Zealand, Politics",
				"url": "https://www.nzherald.co.nz/nz/53-years-in-the-same-business-and-ive-never-been-so-short-of-work-the-front-page/JGZSLY6H7BDBLMOGXPIC3WI35Q/",
				"tags": [
					{
						"tag": "Election 2026"
					},
					{
						"tag": "Housing"
					},
					{
						"tag": "Infrastructure"
					},
					{
						"tag": "Podcast - The Front Page"
					},
					{
						"tag": "Podcasts"
					},
					{
						"tag": "Roads"
					}
				],
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.nzherald.co.nz/world/anthropic-warns-of-ai-worms-spreading-across-smart-gadgets/BF34TKTMY5ASHHAGXKTIZZRDAI/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Anthropic warns of AI ‘worms’ spreading across smart gadgets",
				"creators": [
					{
						"lastName": "AFP",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "2026-10-13T17:28:00.586Z",
				"ISSN": "1170-0777",
				"abstractNote": "The worm could run on cheap, poorly secured gadgets, researchers say.",
				"language": "en-NZ",
				"libraryCatalog": "www.nzherald.co.nz",
				"publicationTitle": "NZ Herald",
				"section": "World",
				"url": "https://www.nzherald.co.nz/world/anthropic-warns-of-ai-worms-spreading-across-smart-gadgets/BF34TKTMY5ASHHAGXKTIZZRDAI/",
				"tags": [
					{
						"tag": "Artificial Intelligence (AI)"
					},
					{
						"tag": "Computers"
					},
					{
						"tag": "Cyberattacks"
					},
					{
						"tag": "Cybersecurity"
					},
					{
						"tag": "Gadgets"
					},
					{
						"tag": "IT Security"
					},
					{
						"tag": "Internet"
					},
					{
						"tag": "hacking"
					}
				],
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.nzherald.co.nz/world/confusion-delayed-aid-to-christa-pike-after-botched-execution-911-calls-show/I7NVETKW3FHNDHXAGLNLT6SWMY/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Confusion delayed aid to Christa Pike after botched execution, 911 calls show",
				"creators": [
					{
						"firstName": "Amy B.",
						"lastName": "Wang",
						"creatorType": "author"
					},
					{
						"firstName": "Brady",
						"lastName": "Dennis",
						"creatorType": "author"
					}
				],
				"date": "2026-10-13T21:06:17.002Z",
				"ISSN": "1170-0777",
				"abstractNote": "Washington Post: Dispatchers were twice told calls for help from the prison were false.",
				"language": "en-NZ",
				"libraryCatalog": "www.nzherald.co.nz",
				"publicationTitle": "NZ Herald",
				"section": "World",
				"url": "https://www.washingtonpost.com/nation/2026/10/13/confusion-delayed-aid-christa-pike-after-botched-execution-911-calls-show/",
				"tags": [
					{
						"tag": "Department of Corrections"
					},
					{
						"tag": "Prisons"
					},
					{
						"tag": "Tennessee"
					},
					{
						"tag": "The Washington Post"
					},
					{
						"tag": "US Crime"
					},
					{
						"tag": "US News"
					}
				],
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
