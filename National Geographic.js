{
	"translatorID": "0a8fdb7c-ec71-47eb-a9ac-7a6e09561ea6",
	"label": "National Geographic",
	"creator": "Vera de Kok",
	"target": "^https?://(www\\.)?nationalgeographic\\.com/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-10-18 14:40:00"
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

// National Geographic is a magazine, but its articles carry no magazine issue
// metadata, so magazineArticle leaves volume/issue empty. Wired, The Atlantic and
// The Economist are magazine publishers modelled the same way in this repository.
var ITEM_TYPE = 'magazineArticle';
var PUBLICATION_TITLE = 'National Geographic';
var PLACE = 'Washington, D.C.';
// The footer dates the two companies, "(c) 1996-2015 National Geographic
// Society" and "(c) 2015-2026 National Geographic Partners, LLC", and both
// notices name 2015, so the year alone cannot settle it: the partnership took
// over on 9 September 2015.
var PUBLISHER_SOCIETY = 'National Geographic Society';
var PUBLISHER_PARTNERS = 'National Geographic Partners, LLC';
var PARTNERS_FROM = '2015-09-09';
var ISSN = '0027-9358';
var LANGUAGE = 'en';

// The byline block labels every name with its role, which JSON-LD does not. A
// label naming photographs, video or illustrations credits someone who did not
// write the article, so those people are recorded in extra instead of becoming
// authors. "As told to" and "Interview by" are writing roles and stay authors.
var AUTHOR_LABELS = [
	'by',
	'story by',
	'words by',
	'text by',
	'written by',
	'as told to',
	'interview by',
	'captions written by',
	'story and video by',
	'story and photos by',
];


function detectWeb(doc, url) {
	if (/nationalgeographic\.com\/[a-z-]+\/article\//.test(url)) {
		// An article is never a listing, even when its own metadata is missing;
		// falling through would offer the "related articles" links instead.
		return isArticle(doc) ? ITEM_TYPE : false;
	}
	if (getListingResults(doc, true)) {
		return 'multiple';
	}
	return false;
}


function isArticle(doc) {
	return Boolean(getJSONLD(doc) || doc.querySelector('[data-testid="prism-byline"]'));
}


// The section front pages ("/animals/", "/history/"), topic hubs
// ("/animals/mammals/", "/science/phenomena/"), the podcast index and the search
// results all list articles, and each uses different tile markup. They do agree
// on two things: every card links to ".../article/<slug>", and its title is
// either a screen-reader span inside the link or the link's aria-label.
function getListingResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('a[href*="/article/"]');
	for (var row of rows) {
		var href = (row.getAttribute('href') || '').split('#')[0];
		// "/pages/article/masthead" is site chrome, not an article.
		if (!href || /\/pages\/article\//.test(href)) continue;
		// Skip the footer, navigation and breadcrumb links that also match.
		var cls = row.getAttribute('class') || '';
		if (/GlobalFooter|GlobalNav|Menu__List|Breadcrumb/.test(cls)) continue;

		var title = row.querySelector('span.sr-only');
		title = ZU.trimInternal(title ? title.textContent : '');
		if (!title) {
			title = ZU.trimInternal(row.getAttribute('aria-label') || '');
		}
		if (!title || items[href]) continue;

		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}


async function doWeb(doc, url) {
	if (detectWeb(doc, url) == 'multiple') {
		var items = getListingResults(doc, false);
		var selected = await Zotero.selectItems(items);
		if (!selected) return;
		for (url of Object.keys(selected)) {
			await scrape(await ZU.requestDocument(url));
		}
	}
	else {
		await scrape(doc);
	}
}


async function scrape(doc) {
	var translator = Zotero.loadTranslator('web');
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48'); // Embedded Metadata
	translator.setDocument(doc);
	translator.setHandler('itemDone', (_obj, item) => {
		var article = getJSONLD(doc) || {};

		item.itemType = ITEM_TYPE;

		// Embedded Metadata takes the publication from og:site_name, which on this
		// site is the section ("Animals", "History"). That section header is what
		// used to land in the publication title.
		item.publicationTitle = PUBLICATION_TITLE;
		item.place = PLACE;
		item.language = LANGUAGE;
		item.ISSN = ISSN;

		// article:published_time is "10-19-2026" here, which Embedded Metadata
		// stores verbatim; the JSON-LD datePublished is a real ISO timestamp.
		var iso = toISODate(article.datePublished);
		if (iso) item.date = iso;
		var publisher = getPublisher(iso);
		if (publisher) item.publisher = publisher;

		item.creators = getCreators(doc, article);

		// NatGeo pages carry <meta name="article:section" content="Animals">, but
		// the magazineArticle type has no section field (only journalArticle,
		// newspaperArticle, bookSection, statute and bill do), so the header
		// belongs in extra. Take the value from the meta tag, or from a "Section:"
		// line that the save chain already demoted into extra, and keep exactly
		// one line, above the Credits line.
		var sectionMeta = doc.querySelector('meta[name="article:section"]');
		var section = sectionMeta ? ZU.trimInternal(sectionMeta.getAttribute('content') || '') : '';
		if (item.extra) {
			var demoted = item.extra.match(/^Section: (.*)$/m);
			if (demoted && !section) section = ZU.trimInternal(demoted[1]);
			item.extra = item.extra.replace(/^Section: .*(?:\n|$)/gm, '').trim();
			// An empty extra must not be set at all, or the test comparison fails.
			if (!item.extra) delete item.extra;
		}
		if (section) addExtra(item, 'Section: ' + section);

		var credits = getCredits(doc);
		if (credits.length) addExtra(item, 'Credits: ' + credits.join('; '));

		var keywords = article.keywords;
		if (typeof keywords == 'string') keywords = keywords.split(',');
		addTags(item, keywords || []);

		item.complete();
	});
	await translator.translate();
}


// The byline block is the only place that says what each name did: the JSON-LD
// author list mixes writers with photographers ("Photographs by Steve Winter").
function getBylineRows(doc) {
	var rows = [];
	var block = doc.querySelector('[data-testid="prism-byline"]');
	if (!block) return rows;
	for (var row of block.querySelectorAll('div')) {
		var spans = row.children;
		if (!spans || spans.length < 2) continue;
		var labelled = true;
		for (var span of spans) {
			if (span.tagName != 'SPAN') labelled = false;
		}
		if (!labelled) continue;
		var label = ZU.trimInternal(spans[0].textContent || '');
		var names = [];
		for (var i = 1; i < spans.length; i++) {
			names = names.concat(splitNames(spans[i].textContent));
		}
		if (label && names.length) rows.push({ label: label, names: names });
	}
	return rows;
}


// One row can credit several people: "Paolo Verzone and Massimo Nicolaci" is
// three spans, the label plus one span per person.
function splitNames(text) {
	var names = [];
	for (var part of String(text || '').split(/\s+and\s+/i)) {
		part = ZU.trimInternal(part);
		if (part) names.push(part);
	}
	return names;
}


function getCreators(doc, article) {
	var creators = [];
	var seen = [];

	var rows = getBylineRows(doc);
	for (var row of rows) {
		if (!isAuthorLabel(row.label)) continue;
		for (var name of row.names) pushCreator(creators, seen, name);
	}

	if (creators.length) return creators;

	// No writing credit in the byline. JSON-LD lists everyone, writers and
	// photographers alike, without saying which is which, so the byline is used
	// to strike off the people it credits to another role. Doing it the other way
	// round - guessing from the JSON-LD entries themselves - cannot work, since a
	// photographer's name carries no trace of their job.
	var credited = [];
	for (var creditRow of rows) {
		if (isAuthorLabel(creditRow.label)) continue;
		credited = credited.concat(creditRow.names);
	}
	for (var listed of jsonldAuthors(doc, article)) {
		if (isCreditedName(credited, listed)) continue;
		pushCreator(creators, seen, listed);
	}
	return creators;
}


function isCreditedName(credited, name) {
	var key = ZU.trimInternal(name || '').toLowerCase();
	for (var other of credited) {
		if (other.toLowerCase() == key) return true;
	}
	return false;
}


function getCredits(doc) {
	var credits = [];
	for (var row of getBylineRows(doc)) {
		if (isAuthorLabel(row.label)) continue;
		credits.push(row.label + ' ' + row.names.join(' and '));
	}
	return credits;
}


function isAuthorLabel(label) {
	var lower = (label || '').toLowerCase().replace(/\s+/g, ' ');
	return AUTHOR_LABELS.includes(lower);
}


function pushCreator(creators, seen, name) {
	name = ZU.trimInternal(name || '');
	if (!name) return;
	// "National Geographic Staff" is the publisher's own byline, not a person.
	if (/^national geographic\b/i.test(name)) return;
	var key = name.toLowerCase();
	if (seen.includes(key)) return;
	seen.push(key);
	creators.push(ZU.cleanAuthor(name, 'author'));
}


function jsonldAuthors(doc, article) {
	var authors = article.author;
	if (!authors) return [];
	if (!Array.isArray(authors)) authors = [authors];
	var byId = {};
	for (var node of allJSONLDNodes(doc)) {
		if (node['@id']) byId[node['@id']] = node;
	}
	var names = [];
	for (var author of authors) {
		var name = author;
		if (author && typeof author == 'object') {
			name = author.name;
			if (!name && author['@id'] && byId[author['@id']]) {
				name = byId[author['@id']].name;
			}
		}
		if (name) names.push(name);
	}
	return names;
}


// Which of the two owning companies published the article, decided by its date.
// An ISO date compares correctly as a string, and a partial one ("2015" or
// "2015-09") sorts before the switch-over day, leaving it with the Society.
// Anything that is not a date, or no date at all, leaves the owner unknown, so
// no publisher is claimed.
function getPublisher(isoDate) {
	var date = String(isoDate || '');
	if (!/^\d{4}(?:-\d{2}(?:-\d{2})?)?$/.test(date)) return undefined;
	return date >= PARTNERS_FROM ? PUBLISHER_PARTNERS : PUBLISHER_SOCIETY;
}


function toISODate(value) {
	if (!value) return null;
	// Zotero renders the date from the leading Y-M-D, so the time part is dropped.
	var parts = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
	return parts ? parts[1] + '-' + parts[2] + '-' + parts[3] : ZU.strToISO(String(value));
}


function addTags(item, tags) {
	for (var tag of tags) {
		var value = ZU.trimInternal(String(tag || ''));
		if (!value) continue;
		let lower = value.toLowerCase();
		if (item.tags.some(existing => existing.tag.toLowerCase() == lower)) continue;
		item.tags.push({ tag: value });
	}
}


function addExtra(item, line) {
	item.extra = item.extra ? item.extra + '\n' + line : line;
}


function getJSONLD(doc) {
	for (var node of allJSONLDNodes(doc)) {
		if (node['@type'] == 'NewsArticle' || node['@type'] == 'Article') return node;
	}
	return null;
}


function allJSONLDNodes(doc) {
	var nodes = [];
	for (var script of doc.querySelectorAll('script[type="application/ld+json"]')) {
		var data;
		try {
			data = JSON.parse(script.textContent);
		}
		catch (e) {
			continue;
		}
		for (var block of (Array.isArray(data) ? data : [data])) {
			if (!block || typeof block != 'object') continue;
			if (Array.isArray(block['@graph'])) {
				for (var node of block['@graph']) nodes.push(node);
			}
			else {
				nodes.push(block);
			}
		}
	}
	return nodes;
}


/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.nationalgeographic.com/animals/article/beginner-bird-photography-tips",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "A Beginner’s Guide to Photographing Birds",
				"creators": [
					{
						"firstName": "Helen",
						"lastName": "Bradshaw",
						"creatorType": "author"
					}
				],
				"date": "2026-10-19",
				"ISSN": "0027-9358",
				"abstractNote": "Wildlife photographer and ornithologist Tim Laman shares his advice for getting started—right in your own backyard.",
				"extra": "Section: Animals\nCredits: Video by Russell Laman",
				"language": "en",
				"libraryCatalog": "www.nationalgeographic.com",
				"place": "Washington, D.C.",
				"publicationTitle": "National Geographic",
				"publisher": "National Geographic Partners, LLC",
				"url": "https://www.nationalgeographic.com/animals/article/beginner-bird-photography-tips",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "bird photography"
					},
					{
						"tag": "bird photography 101"
					},
					{
						"tag": "bird photography tips"
					},
					{
						"tag": "birding"
					},
					{
						"tag": "birding 101"
					},
					{
						"tag": "birding tips"
					},
					{
						"tag": "how to photograph birds"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.nationalgeographic.com/animals/article/saving-pangolins-endangered-africa",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "Fighting to Save the Pangolin, the World’s Most Wanted Animal",
				"creators": [
					{
						"firstName": "Henry",
						"lastName": "Wismayer",
						"creatorType": "author"
					}
				],
				"date": "2026-09-08",
				"ISSN": "0027-9358",
				"abstractNote": "Relentlessly hunted for its scales, the mysterious armored pangolin is vanishing throughout Africa. Now scientists are trying to unlock the secrets that could help save it.",
				"extra": "Section: Animals\nCredits: Photographs by Marcus Westberg",
				"language": "en",
				"libraryCatalog": "www.nationalgeographic.com",
				"place": "Washington, D.C.",
				"publicationTitle": "National Geographic",
				"publisher": "National Geographic Partners, LLC",
				"url": "https://www.nationalgeographic.com/animals/article/saving-pangolins-endangered-africa",
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
		"url": "https://www.nationalgeographic.com/environment/article/lake-powell-mudbergs",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "As Lake Powell Dries Up, Mud Threatens Its Future",
				"creators": [
					{
						"firstName": "Luke",
						"lastName": "Runyon",
						"creatorType": "author"
					}
				],
				"date": "2026-10-14",
				"ISSN": "0027-9358",
				"abstractNote": "Lake Powell’s retreat is revealing a lost world covered in deep piles of sedimentary sludge. A group of adventurers and scientists are teaming up to explore its resurrected canyons, and reveal the fate of this critical reservoir.",
				"language": "en",
				"libraryCatalog": "www.nationalgeographic.com",
				"place": "Washington, D.C.",
				"publicationTitle": "National Geographic",
				"publisher": "National Geographic Partners, LLC",
				"url": "https://www.nationalgeographic.com/environment/article/lake-powell-mudbergs",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": [],
				"extra": "Section: Environment"
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.nationalgeographic.com/photography/article/photo-of-the-day-september-2026-birds-bears-farmers-cows-cats",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "Take a Closer Look at Bears, Birds, and Blooms From Nat Geo’s Photo Editors",
				"creators": [
					{
						"firstName": "Domonique",
						"lastName": "Tolliver",
						"creatorType": "author"
					},
					{
						"firstName": "Yasmine",
						"lastName": "Maggio",
						"creatorType": "author"
					}
				],
				"date": "2026-10-09",
				"ISSN": "0027-9358",
				"abstractNote": "Snoozing bears, spinning mills, and birds of prey. Check out some of the pictures featured in our Photo of the Day.",
				"extra": "Section: Photography\nCredits: Photos curated by National Geographic's Photography Department",
				"language": "en",
				"libraryCatalog": "www.nationalgeographic.com",
				"place": "Washington, D.C.",
				"publicationTitle": "National Geographic",
				"publisher": "National Geographic Partners, LLC",
				"url": "https://www.nationalgeographic.com/photography/article/photo-of-the-day-september-2026-birds-bears-farmers-cows-cats",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "bear hibernation"
					},
					{
						"tag": "bird photography"
					},
					{
						"tag": "seagulls"
					},
					{
						"tag": "wildlife photography"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.nationalgeographic.com/search?q=everest",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.nationalgeographic.com/photography/article/mount-vesuvius-pompeii-behind-the-scenes",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "'The Entire World Is Glowing in Front of You': How Nat Geo Photographers Captured Pompeii",
				"creators": [
					{
						"firstName": "Halley",
						"lastName": "Brown",
						"creatorType": "author"
					}
				],
				"date": "2026-08-05",
				"ISSN": "0027-9358",
				"abstractNote": "Italian visual duo Paolo Verzone and Massimo Nicolaci experimented with movement and light to reveal the ancient Roman ruins as they've never been seen before.",
				"extra": "Section: Photography\nCredits: Photographs and video by Paolo Verzone and Massimo Nicolaci",
				"language": "en",
				"libraryCatalog": "www.nationalgeographic.com",
				"place": "Washington, D.C.",
				"publicationTitle": "National Geographic",
				"publisher": "National Geographic Partners, LLC",
				"shortTitle": "'The Entire World Is Glowing in Front of You'",
				"url": "https://www.nationalgeographic.com/photography/article/mount-vesuvius-pompeii-behind-the-scenes",
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
		"url": "https://www.nationalgeographic.com/animals/",
		"items": "multiple"
	}
]
/** END TEST CASES **/
