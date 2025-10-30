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
	
	item.libraryCatalog = 'Benchling';
	item.url = url;
	
	// Placeholder fields for document type - all optional
	
	// item.abstractNote = '';  // Maps to CSL 'abstract': Summary or abstract of the document
	// item.accessDate = '';  // Maps to CSL 'accessed': Date when the document was accessed
	// item.archive = '';  // Maps to CSL 'archive': Archive where the document is stored
	// item.archiveLocation = '';  // Maps to CSL 'archiveLocation': Location within the archive
	// item.callNumber = '';  // Maps to CSL 'callNumber': Call number for library documents
	// item.creators = [];  // Maps to CSL 'author': Authors, contributors, editors, translators, or reviewed authors
	// item.date = '';  // Maps to CSL 'issued': Date of publication or issuance
	// item.extra = '';  // Maps to CSL 'note': Additional notes or information
	// item.language = '';  // Maps to CSL 'language': Language in which the document is written
	// item.publisher = '';  // Maps to CSL 'publisher': Name of the publisher
	// item.rights = '';  // Maps to CSL 'license': Information about rights or licensing

	
	item.complete();
}