{
	"translatorID": "c1cb8d2f-22f1-436c-9d17-2281ac288070",
	"label": "Benchling",
	"creator": "Ken Robbins",
	"target": "^https?://[^/]*\\.benchling\\.com/.*etr_.*/edit",
	"minVersion": "2.1.9",  // Inherited from sample code. Developed and tested on Zotero 7.0.29.
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,  // 4 = Web translator
	"browserSupport": "gcsibv",  // I'm guessing this means Chrome, Firefox, Safari, Edge, bookmarklets, and standalone
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

/*
This is a Zotero Web Translator for capturing metadata from Benchling ELN entries.
It is a simple translator that captures the URL, title, experiment ID, authors, review status, and project folder.
Authors and Project Folder are only captured if the Metadata tab of the ELN entry is visible.

The date accessed is automatically added by Zotero.
No other Benchling dates such as created, updated, or reviewed are captured.
Notebook entry schema metadata is not captured either.
This is meant to provide handy references, not to duplicate Benchling metadata.
If additional metadata is required, click on the link and view directly in Benchling.

As with any scraper, this might break over time if Benchling changes their HTML structure.
If this happens, feel free to reach out to me on the Benchling Community Forum
https://community.benchling.com
*/

function detectWeb(doc, url) {
	// Always return document since the target already restricts to ELN entries
	return "document";
}

function doWeb(doc, url) {
	scrape(doc, url);
}

function scrape(doc, url) {
	var item = new Zotero.Item('document');
	
	// Get title from page title tag as fallback
	var pageTitle = doc.querySelector('title');
	var shortTitle = pageTitle ? pageTitle.textContent.split('·')[0].trim() : 'Untitled Benchling ELN Entry';
	
	// Find the title from the TitleEditor
	var titleEditable = doc.querySelector('.mediocre-titleEditor-titleEditable');
	if (titleEditable) {
		shortTitle = titleEditable.textContent.trim();
	}
	item.shortTitle = shortTitle;
	
	// Find the Display experiment ID from the human-id span
	var expId = '';
	var humanId = doc.querySelector('#human-id');
	if (humanId) {
		expId = humanId.textContent.trim();
	}
	
	// If we found an EXP ID, add it to the title
	if (expId) {
		item.title = shortTitle + ' [' + expId + ']';
	} else {
		item.title = shortTitle;
	}
	
	// Find authors from metadata field. Only works if the Metadata tab is visible.
	var authorField = doc.querySelector('.metadata-field--authorList');
	if (authorField) {
		var authorLinks = authorField.querySelectorAll('a[href]');
		for (var i = 0; i < authorLinks.length; i++) {
			var authorName = authorLinks[i].textContent.trim();
			if (authorName) {
				// Try to parse the name into first/last
				var lastSpaceIndex = authorName.lastIndexOf(' ');
				if (lastSpaceIndex > 0) {
					// Has a space, assume "First Last"
					item.creators.push({
						firstName: authorName.substring(0, lastSpaceIndex),
						lastName: authorName.substring(lastSpaceIndex + 1),
						creatorType: 'author'
					});
				} else {
					// No space, single field
					item.creators.push({
						lastName: authorName,
						creatorType: 'author',
						fieldMode: 1
					});
				}
			}
		}
	}
	
	// Find the review status badge
	var reviewBadge = doc.querySelector('#badge-button');
	var extraInfo = [];
	if (reviewBadge) {
		var reviewText = reviewBadge.textContent.trim();
		if (reviewText) {
			extraInfo.push('Review status: ' + reviewText);
		}
	}
	
	// Find the project folder. Only works if the Metadata tab is visible.
	var parentLink = doc.querySelector('[data-test-component="ParentLink"]');
	if (parentLink) {
		// Get the text content, which should be the folder name
		var folderText = parentLink.textContent.trim();
		// Remove any SVG icons or other elements by getting just the text node
		var folderName = folderText.split('\n')[0].trim();
		if (folderName) {
			item.archiveLocation = 'Project folder: ' + folderName;
		}
	}
	
	item.libraryCatalog = 'Benchling';
	item.url = url;
	
	if (extraInfo.length > 0) {
		item.extra = extraInfo.join('\n');
	}
	
	// item.accessDate = '';  // Maps to CSL 'accessed': Date when the document was accessed - Automatically added by Zotero
	
	item.complete();
}