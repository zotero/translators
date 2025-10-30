{
	"translatorID": "c1cb8d2f-22f1-436c-9d17-2281ac288070",
	"label": "Benchling",
	"creator": "Ken Robbins",
	"target": "^https?://[^/]*\\.benchling\\.com/.*etr_.*/edit",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-10-30 01:00:22"
}

/**
	Copyright (c) 2025 Ken Robbins
	
	This program is free software: you can redistribute it and/or
	modify it under the terms of the GNU Affero General Public License
	as published by the Free Software Foundation, either version 3 of
	the License, or (at your option) any later version.
	
	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
	Affero General Public License for more details.
	
	You should have received a copy of the GNU Affero General Public
	License along with this program. If not, see
	<http://www.gnu.org/licenses/>.
*/

function detectWeb(doc, url) {
	// Always return document for now to test
	return "document";
	
	// This is already part of the URL target match, but we'll check it anyway.
	// Update if we change the target regex to be more generic.
	// if (url.includes("/edit")) {
	// 	return "document";
	// }
	
	// return false;
}

function doWeb(doc, url) {
	scrape(doc, url);
}

function scrape(doc, url) {
	var item = new Zotero.Item('document');
	
	// Get title from page title tag as fallback
	var pageTitle = doc.querySelector('title');
	var title = pageTitle ? pageTitle.textContent.split('·')[0].trim() : 'Untitled Document';
	
	// Find the title from the TitleEditor
	var titleEditable = doc.querySelector('.mediocre-titleEditor-titleEditable');
	if (titleEditable) {
		title = titleEditable.textContent.trim();
	}
	
	// Find the EXP ID from the human-id span
	var expId = '';
	var humanId = doc.querySelector('#human-id');
	if (humanId) {
		expId = humanId.textContent.trim();
	}
	
	// If we found an EXP ID, add it to the title
	if (expId) {
		item.title = title + ' (' + expId + ')';
	} else {
		item.title = title;
	}
	
	item.libraryCatalog = 'Benchling';
	item.url = url;
	
	item.complete();
}
