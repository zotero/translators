{
	"translatorID": "e0234bcf-bc56-4577-aa94-fe86a27f6fd6",
	"label": "The Globe and Mail",
	"creator": "Sonali Gupta, Abe Jellinek, and Vera de Kok",
	"target": "^https?://www\\.theglobeandmail\\.com/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-10-15 16:15:47"
}


/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2017-2021 Sonali Gupta and Abe Jellinek
	
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
	if (url.includes("/search/") && getSearchResults(doc, true)) {
		return "multiple";
	}
	else if (ZU.xpathText(doc, '//article')) {
		return "newspaperArticle";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	// Current search results are rendered client-side by Queryly into #resultdata.
	var rows = doc.querySelectorAll('#resultdata a.c-card__link, .c-search-results-news a');
	for (let row of rows) {
		var href = row.href;
		var title = ZU.trimInternal(text(row, '.queryly_item_title, .c-card__hed-text'));
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
			if (!items) {
				return;
			}
			ZU.processDocuments(Object.keys(items), scrape);
		});
	}
	else {
		scrape(doc, url);
	}
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

function getTgamMeta(doc) {
	var script = doc.querySelector('script#tgam-window');
	if (!script) return null;
	try {
		var json = script.textContent.trim()
			.replace(/^window\.tgam\s*=\s*/, '')
			.replace(/;\s*$/, '');
		var data = JSON.parse(json);
		return data.meta || null;
	}
	catch (e) {
		return null;
	}
}

// The site's "placeline" is where the story was reported from ("Ottawa"), not
// the publication's place (Zotero's item.place = publication city). Save it as
// a tag instead. Some older articles put the byline's role there ("Ottawa
// bureau chief") — that is not a place and must not become a tag.
const placeRoleRe = /\b(?:bureau chief|chief|c?orrespondent|reporter|editor|columnist|writer|anchor|host)\b/i;

function placelineFromDoc(doc) {
	var place = ZU.trimInternal(text(doc, '.c-article-meta__placelines, .placeline'));
	if (!place) {
		// Fall back to the page-level metadata blob (script#tgam-window),
		// which carries meta.placeline even when the DOM element is absent.
		let tgam = getTgamMeta(doc);
		if (tgam && tgam.placeline) {
			place = ZU.trimInternal(tgam.placeline);
		}
	}
	if (!place || placeRoleRe.test(place)) return '';
	return ZU.capitalizeTitle(place, true);
}

const PUBLICATION_PLACE = 'Toronto';

function scrape(doc, url) {
	var translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	
	translator.setHandler('itemDone', function (obj, item) {
		item.place = PUBLICATION_PLACE;
		
		if (!item.creators.length) {
			for (let authorLink of doc.querySelectorAll('a.byline')) {
				item.creators.push(ZU.cleanAuthor(authorLink.textContent, 'author'));
			}
		}
		if (!item.creators.length) {
			// Modern pages ship the byline only as author[].name in JSON-LD;
			// EM does not read those blocks.
			let data = getJSONLD(doc);
			if (data && data.author) {
				let authors = data.author;
				if (typeof authors == 'object' && !Array.isArray(authors)) {
					authors = [authors];
				}
				for (let a of authors) {
					let name = (typeof a == 'string' ? a : a.name) || '';
					name = ZU.trimInternal(name).replace(/^By\s*/i, '').replace(/,\s*$/, '');
					if (!name) continue;
					if (name.split(/\s+/).length > 2) {
						item.creators.push({ lastName: name, creatorType: "author", fieldMode: 1 });
					}
					else {
						item.creators.push(ZU.cleanAuthor(name, "author"));
					}
				}
			}
		}
		if (!item.date) {
			let data = getJSONLD(doc);
			if (data && data.datePublished) {
				item.date = data.datePublished;
			}
		}
		// EM fills tags from <meta property="article:tag">; the longer keyword list
		// in <meta name="keywords"> never reaches the item because article:tag
		// pre-populates tags, so EM's keywords fallback line is skipped. Append it,
		// skipping any keyword that already exists as a tag (case-insensitively, so
		// e.g. "Liberal" and "liberal" do not both land).
		var existingTags = new Set(item.tags.map(
			tag => (typeof tag == 'string' ? tag : tag.tag).toLowerCase()
		));
		for (let metaEl of doc.querySelectorAll('meta[name="keywords" i]')) {
			for (let kw of (metaEl.content || '').split(',')) {
				let tag = ZU.trimInternal(kw);
				let key = tag.toLowerCase();
				if (tag && !existingTags.has(key)) {
					item.tags.push(tag);
					existingTags.add(key);
				}
			}
		}

		let placeline = placelineFromDoc(doc);
		if (placeline) {
			let key = placeline.toLowerCase();
			if (!existingTags.has(key)) {
				item.tags.push(placeline);
				existingTags.add(key);
			}
		}

		item.complete();
	});

	translator.getTranslatorObject(function (trans) {
		trans.itemType = "newspaperArticle";
		// TODO map additional meta tags here, or delete completely
		trans.addCustomFields({
			'twitter:description': 'abstractNote'
		});
		trans.doWeb(doc, url);
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.theglobeandmail.com/news/politics/canadian-elite-special-forces-sniper-sets-record-breaking-kill-shot-in-iraq/article35415651",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Canadian elite special forces sniper makes record-breaking kill shot in Iraq",
				"creators": [
					{
						"firstName": "Robert",
						"lastName": "Fife",
						"creatorType": "author"
					}
				],
				"date": "2017-06-21T20:00:00-0400",
				"abstractNote": "Sources say the sniper killed an Islamic State insurgent from a distance of 3,540 metres in a feat one a military insider says may ‘never be equalled’",
				"language": "en-CA",
				"libraryCatalog": "www.theglobeandmail.com",
				"place": "Toronto",
				"publicationTitle": "The Globe and Mail",
				"url": "https://www.theglobeandmail.com/news/politics/canadian-elite-special-forces-sniper-sets-record-breaking-kill-shot-in-iraq/article35415651/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "CF-18 fighter jets"
					},
					{
						"tag": "Canada"
					},
					{
						"tag": "Canadian military"
					},
					{
						"tag": "Canadian sniper system"
					},
					{
						"tag": "Canadian special elite forces"
					},
					{
						"tag": "Iraq"
					},
					{
						"tag": "Islamic State"
					},
					{
						"tag": "Politics"
					},
					{
						"tag": "longest sniper kill shot"
					},
					{
						"tag": "sniper"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.theglobeandmail.com/news/toronto/doug-ford-says-hes-not-yet-sure-about-his-political-future/article21428180/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Doug Ford to decide provincial Tory leadership run in 'a couple weeks'",
				"creators": [
					{
						"firstName": "Ann",
						"lastName": "Hui",
						"creatorType": "author"
					}
				],
				"date": "2014-11-03T16:16:12-0500",
				"abstractNote": "He says he will decide soon about whether to run for Ontario Tory leadership and does not rule out another attempt at the Toronto mayoralty",
				"language": "en-CA",
				"libraryCatalog": "www.theglobeandmail.com",
				"place": "Toronto",
				"publicationTitle": "The Globe and Mail",
				"url": "https://www.theglobeandmail.com/news/toronto/doug-ford-says-hes-not-yet-sure-about-his-political-future/article21428180/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Christine Elliott"
					},
					{
						"tag": "Doug Ford"
					},
					{
						"tag": "Jim Flaherty"
					},
					{
						"tag": "John Tory"
					},
					{
						"tag": "Ontario Progressive Conservative"
					},
					{
						"tag": "Rob Ford"
					},
					{
						"tag": "Social Issues"
					},
					{
						"tag": "leadership"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.theglobeandmail.com/search/?q=nuclear",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.theglobeandmail.com/politics/article-liberals-filibuster-opposition-call-for-inquiry-into-parliamentary/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Liberals filibuster opposition call for inquiry into parliamentary funds paid to Trudeau’s close friend",
				"creators": [
					{
						"firstName": "Robert",
						"lastName": "Fife",
						"creatorType": "author"
					},
					{
						"firstName": "Steven",
						"lastName": "Chase",
						"creatorType": "author"
					}
				],
				"date": "2021-07-12T19:52:05-0400",
				"abstractNote": "Opposition wanted Tom Pitfield, the founder of Data Sciences, to appear before the ethics committee, but Liberal MPs prevented the motion from coming to a vote by talking out the clock",
				"language": "en-CA",
				"libraryCatalog": "www.theglobeandmail.com",
				"place": "Toronto",
				"publicationTitle": "The Globe and Mail",
				"url": "https://www.theglobeandmail.com/politics/article-liberals-filibuster-opposition-call-for-inquiry-into-parliamentary/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Michael Barrett"
					},
					{
						"tag": "NDP"
					},
					{
						"tag": "Ottawa"
					},
					{
						"tag": "Politics"
					},
					{
						"tag": "committee"
					},
					{
						"tag": "company"
					},
					{
						"tag": "data"
					},
					{
						"tag": "house"
					},
					{
						"tag": "liberal"
					},
					{
						"tag": "liberals"
					},
					{
						"tag": "mps"
					},
					{
						"tag": "party"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
