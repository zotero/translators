{
	"translatorID": "e4fe1596-a8c4-4d09-945f-120c4d83e580",
	"label": "LA Times",
	"creator": "Sebastian Karcher",
	"target": "^https?://(www\\.|travel\\.|articles\\.|latimesblogs\\.)?latimes\\.com",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-10-12 21:55:00"
}

/*
   LA Times Translator
   Copyright (C) 2012 Sebastian Karcher

   This program is free software: you can redistribute it and/or modify
   it under the terms of the GNU Affero General Public License as published by
   the Free Software Foundation, either version 3 of the License, or
   (at your option) any later version.

   This program is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU Affero General Public License for more details.

   You should have received a copy of the GNU Affero General Public License
   along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/


function detectWeb(doc, url) {
	if (/\/search\//.test(url) && getSearchResults(doc, true)) {
		return "multiple";
	}
	if (ZU.xpathText(doc, '//meta[@property="og:type"]/@content') == 'article'
		|| getJSONLD(doc)) {
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
				if (node['@type'] == 'NewsArticle'
					|| (node['@type'] == 'Article' && node.headline)) {
					return node;
				}
			}
		}
	}
	return null;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	for (let a of doc.querySelectorAll('a[data-element="search-result-title"]')) {
		let href = a.href;
		let title = ZU.trimInternal(a.textContent);
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
			ZU.processDocuments(Object.keys(items), scrape);
		});
	}
	else {
		scrape(doc, url);
	}
}

function scrape(doc, url) {
	var item = new Zotero.Item("newspaperArticle");
	var data = getJSONLD(doc);
	if (!data) {
		return;
	}
	item.title = data.headline || ZU.xpathText(doc, '//meta[@property="og:title"]/@content');
	item.abstractNote = data.description
		|| ZU.xpathText(doc, '//meta[@property="og:description"]/@content');
	item.date = data.datePublished
		|| ZU.xpathText(doc, '//meta[@property="article:published_time"]/@content');
	item.section = ZU.xpathText(doc, '//meta[@property="article:section"]/@content');
	item.language = (ZU.xpathText(doc, '//meta[@property="og:locale"]/@content') || 'en_US').replace('_', '-');
	item.ISSN = "0458-3035";
	item.publicationTitle = "Los Angeles Times";
	item.url = ZU.xpathText(doc, '//link[@rel="canonical"]/@href') || url;
	item.libraryCatalog = "www.latimes.com";

	let authors = data.author || [];
	if (typeof authors == 'object' && !Array.isArray(authors)) {
		authors = [authors];
	}
	for (let author of authors) {
		let name = typeof author == 'string' ? author : author.name;
		if (!name) continue;
		name = ZU.trimInternal(name).replace(/,$/, '');
		// OCR-style and agency attributions ("By <name>, Staff Writer") may keep
		// the role in the name; split it off before parsing.
		let role = name.match(/\s*[-,]\s*(Staff Writer|Staff|Columnist|Contributing Writer)$/);
		if (role) {
			name = name.slice(0, role.index);
		}
		if (!name) continue;
		if (name.split(/\s+/).length > 3) {
			item.creators.push({ lastName: name, creatorType: "author", fieldMode: 1 });
		}
		else {
			item.creators.push(ZU.cleanAuthor(name, "author"));
		}
	}

	item.attachments.push({
		title: "LA Times Snapshot",
		url: url,
		mimeType: "text/html"
	});

	item.complete();
}
