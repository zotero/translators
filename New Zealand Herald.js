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
	"lastUpdated": "2026-10-15 14:21:00"
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
	if (/\/[A-Z0-9]{20,}\/?$/.test(new URL(url).pathname)) {
		return "newspaperArticle";
	}
	// Listing pages (including the homepage) have story cards but may also
	// carry NewsArticle JSON-LD for their lead story.
	if (getSearchResults(doc, true)) {
		return "multiple";
	}
	if (getJSONLD(doc)) {
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
// ("Herald Reporters", "Staff Reporter", "Reporters, Herald") and press-agency
// credits ("RNZ", "AFP", "AP", "Reuters") that are not people.
var COLLECTIVE_AUTHOR = /herald\s+reporters?|reporters?\s*,?\s*herald|staff\s+(?:reporters?|writers?)|(?:reporters?|writers?)\s+(?:team|staff)|\b(?:rnz|afp|ap|reuters|bloomberg|nz\s+herald|the\s+country|bang\s+showbiz|daily\s+telegraph(?:\s+uk)?|getty\s+images|associated\s+press|press\s+association|pa\s+media)\b/i;

function getSearchResults(doc, checkOnly) {
	var items = {};
	var rows = doc.querySelectorAll('a[data-test-ui="story-card--link--title"]');
	for (var i = 0; i < rows.length; i++) {
		var href = rows[i].href;
		var title = ZU.trimInternal(rows[i].textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		items[href] = title;
	}
	return Object.keys(items).length ? items : false;
}


async function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (!items) return;
		for (let articleURL of Object.keys(items)) {
			await scrape(await requestDocument(articleURL), articleURL);
		}
	}
	else {
		await scrape(doc, url);
	}
}


async function scrape(doc, url = doc.location.href) {
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
			// JSON-LD marks real people as @type Person and syndication/agency
			// credits ("RNZ", "AFP", "NZ Herald") as @type Organization.
			let authors = data.author;
			if (typeof authors == 'object' && !Array.isArray(authors)) {
				authors = [authors];
			}
			authors.forEach((a) => {
				let name = (typeof a == 'string' ? a : a.name) || '';
				name = name.trim();
				if (!name || COLLECTIVE_AUTHOR.test(name)) return;
				// Wire/agency credits (RNZ, AFP, AP, Reuters, Bang Showbiz) and
				// the paper's own staff byline ("NZ Herald") are not authors.
				if (typeof a == 'object' && a['@type'] == 'Organization') return;
				// @type Person is authoritative here, so "Amy B Wang" stays a
				// person rather than becoming a corporate author.
				item.creators.push(ZU.cleanAuthor(name, "author"));
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

	let em = await translator.getTranslatorObject();
	em.itemType = "newspaperArticle";
	em.addCustomFields({
		language: 'language',
		'article:section': 'section'
	});
	await em.doWeb(doc, url);
}

/** BEGIN TEST CASES **/
var testCases = [
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
				"creators": [],
				"date": "2026-10-14T07:13:39.413Z",
				"ISSN": "1170-0777",
				"abstractNote": "MetService says the watch has a moderate chance of becoming a warning.",
				"language": "en-NZ",
				"libraryCatalog": "www.nzherald.co.nz",
				"publicationTitle": "NZ Herald",
				"section": "New Zealand",
				"shortTitle": "Severe wind watch",
				"url": "https://www.nzherald.co.nz/nz/metservice-wind-watch-for-wellington-as-100kmh-gusts-approach/RTZVNJHPSZDAJJT3GGHXGC7274/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
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
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
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
				"creators": [],
				"date": "2026-10-13T17:28:00.586Z",
				"ISSN": "1170-0777",
				"abstractNote": "The worm could run on cheap, poorly secured gadgets, researchers say.",
				"language": "en-NZ",
				"libraryCatalog": "www.nzherald.co.nz",
				"publicationTitle": "NZ Herald",
				"section": "World",
				"url": "https://www.nzherald.co.nz/world/anthropic-warns-of-ai-worms-spreading-across-smart-gadgets/BF34TKTMY5ASHHAGXKTIZZRDAI/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
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
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
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
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.nzherald.co.nz/",
		"items": "multiple"
	}
]
/** END TEST CASES **/
