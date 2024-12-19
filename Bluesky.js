{
	"translatorID": "66324f58-ee35-4c57-95c5-f2182592e335",
	"label": "Bluesky",
	"creator": "Rintze Zelle",
	"target": "^https?:\\/\\/bsky\\.app\\/profile\\/.*\\/post\\/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-12-09 04:46:24"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2024 Rintze Zelle

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
	var a = doc.querySelector('meta[property="og:type"][content="article"]');
	if (a) {
		return 'forumPost';
	}
	return false;
}

async function doWeb(doc, url) {
	await scrape(doc);
}

function scrape(doc, url) {
	var item = new Zotero.Item("forumPost");

	var originalTitle = doc.querySelector('meta[name="description"]').getAttribute('content');
	
	item.abstractNote = originalTitle;

	// Remove newlines from title
	processedTitle = originalTitle.replace(/\s+/g, ' ');

	// Truncate title to 140 chars
    processedTitle = ZU.ellipsize(originalTitle, 140, true);
	item.title = processedTitle;

	item.shortTitle = false;

	var originalURL = doc.querySelector('meta[property="og:url"]').getAttribute('content');
	item.url = originalURL;

	var author = doc.querySelector('meta[property="og:title"]').getAttribute('content');
	item.creators.push({
		lastName: author,
		fieldMode: 1,
		creatorType: 'author'
	});

	item.forumTitle = "Bluesky";
	item.postType = "Post";

 	var date = doc.querySelector('meta[name="article:published_time"]').getAttribute('content');
	item.date = ZU.strToISO(date);

	item.complete();
}
