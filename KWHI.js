{
	"translatorID": "f9901524-c2b5-499d-87b5-5facdd54f069",
	"label": "KWHI",
	"creator": "Piper McCorkle",
	"target": "https?://(www\\.)?kwhi.com",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-06-02 01:42:35"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2022 Piper McCorkle
	
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
	if (url.match(/\/[0-9]{4}\/[0-9]{2}\/[0-9]{2}\//)) {
		return 'newspaperArticle';
	}
	return false;
}

function metaContent(doc, name) {
	return (
		doc.querySelector(`meta[name="${name}"]`)
		|| doc.querySelector(`meta[property="${name}"]`)
	).content;
}

function linkHref(doc, rel) {
	return doc.querySelector(`link[rel="${rel}"]`).href;
}

function elementTextContents(doc, selector) {
	return doc.querySelector(selector).textContent;
}

function doWeb(doc, url) {
	item = new Zotero.Item(detectWeb(doc, url));
	item.title = ZU.trimInternal(elementTextContents(doc, '.post-title'));
	item.abstract = metaContent(doc, 'description');
	item.publication = 'KWHI';
	item.date = metaContent(doc, 'article:published_time');
	item.language = 'en-US';
	item.url = linkHref(doc, 'canonical');
	item.creators = [
		ZU.cleanAuthor(elementTextContents(doc, '.author-name'), 'author')
	];
	for (const image of Array.from(doc.querySelectorAll('.entry-content img'))) {
		item.attachments.push({
			url: image.src,
			title: image.alt || image.src
		});
	}
	for (const audio of Array.from(doc.querySelectorAll('.entry-content audio'))) {
		item.attachments.push({
			url: audio.src,
			title: audio.alt || audio.src
		});
	}
	item.complete();
}/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
