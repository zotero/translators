{
	"translatorID": "60888261-7f17-41bd-95be-6982f05c01b3",
	"label": "Dreier Neuerscheinungsdienst",
	"creator": "Denis Maier",
	"target": "https://www.dietmardreier.de/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-08-25 07:02:07"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2021 Denis Maier
	
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
	if (url.includes('/detail/ISBN')) {
		return "book";
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('h4 a');
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(row.textContent);
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
			if (items) ZU.processDocuments(Object.keys(items), scrape);
		});
	}
	else {
		scrape(doc, url);
	}
}

function scrape(doc) {
	var item = new Zotero.Item("book");
	// Set the title
	item.title = ZU.xpathText(doc, '//h1[@class="biblioTitle"]');
	if (ZU.xpathText(doc, '//div[@class="titles"]/div[@class="biblioSubTitle"]')) item.title += ": " + ZU.xpathText(doc, '//div[@class="titles"]/div[@class="biblioSubTitle"]');
	// ISBN
	item.ISBN = (doc.querySelector('.biblioId .value').textContent) ? doc.querySelector('.biblioId .value').textContent : "";
	// Publisher
	item.publisher = (doc.querySelector('.biblioPublisher .value').textContent) ? doc.querySelector('.biblioPublisher .value').textContent : "";
	// Publisher Location
	item.place = (doc.querySelector('.biblioPublicationTown .value').textContent) ? doc.querySelector('.biblioPublicationTown .value').textContent : "";
	// Publication Date
	item.date = (doc.querySelector('.biblioPublishingYear .value').textContent) ? doc.querySelector('.biblioPublishingYear .value').textContent : "";
	// Number of pages
	item.numPages = (doc.querySelector('.biblioPages .value').textContent) ? doc.querySelector('.biblioPages .value').textContent : "";
	// Abstract
	item.abstractNote = (doc.querySelector('.description .blurb .value').textContent) ? doc.querySelector('.description .blurb .value').textContent : "";
	// Get Creators
	var creators = doc.querySelectorAll('.authorMain .biblioAuthor');
	for (let creator of creators) {
		let creatorName = creator.querySelector('.value').textContent;
		let creatorRole;
		
		// currently, we only check for editors; everything else will be treated as authors
		if (creator.textContent.includes("Hrsg.")) {
			Z.debug(creatorName + " ist Herausgeber");
			creatorRole = "editor";
		}
		else if (creator.textContent.includes("Übersetzung")) {
			Z.debug(creatorName + " ist Übersetzer");
			creatorRole = "translator";
		}
		else {
			creatorRole = "author";
		}
		item.creators.push(Zotero.Utilities.cleanAuthor(creatorName, creatorRole, creatorName.includes(', ')));
	}
	item.complete();
}

