{
	"translatorID": "nl",
	"label": "Israel National Library",
	"creator": "Anonymus",
	"target": "^https://www\\.nli\\.org\\.il/.*",
	"minVersion": "6.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-05-04 08:27:06"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Made by Zotero contributors.
	
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
	if (url.includes("/newspapers/") && (url.includes("/article/") || url.includes("/page/"))) {
		return "newspaperArticle";
	}
	return false;
}

async function doWeb(doc, url) {
	await scrape(doc, url);
}

async function scrape(doc, url) {
	const item = new Zotero.Item("newspaperArticle");

	// 1. TITLE: Grab from the active section tab (Changes per article)
	const activeTitle = doc.querySelector('#sectionleveltabtitlearea h2');
	const activeTextP = doc.querySelector('#pagesectionstextcontainer p');
	
	if (activeTitle && activeTitle.textContent.trim()) {
		item.title = ZU.trimInternal(activeTitle.textContent);
	} else if (activeTextP && activeTextP.textContent.trim()) {
		item.title = ZU.trimInternal(activeTextP.textContent);
	}

	// 2. URL: Grab the persistent link for the active section (Changes per article)
	const activeLink = doc.querySelector("#documentdisplayleftpanesectionlevelpersistentlinkcontainer .persistentlinkurl");
	if (activeLink && activeLink.textContent.trim()) {
		item.url = ZU.trimInternal(activeLink.textContent);
	} else {
		item.url = url.split('?')[0].split('#')[0];
	}

	// 3. PUBLICATION: Grab from Breadcrumb
	const pubNode = doc.querySelector('li.breadcrumb-item:nth-child(2)');
	if (pubNode) {
		item.publicationTitle = ZU.trimInternal(pubNode.textContent);
	}

	// 4. DATE: Grab from Breadcrumb
	const dateNode = doc.querySelector('li.breadcrumb-item:nth-child(3)');
	if (dateNode) {
		item.date = ZU.trimInternal(dateNode.textContent);
	}

	// 5. PAGE: Grab the currently active highlighted page tab (Changes if you click across pages)
	const pageLabel = doc.querySelector('span.pagelabel.current b');
	if (pageLabel) {
		const parts = ZU.trimInternal(pageLabel.textContent).split(/\s+/);
		if (parts.length > 1) {
			item.pages = parts[1]; // Grabs "3" from "Page 3"
		} else {
			item.pages = parts[0];
		}
	} else if (url.includes("/page/")) {
		const match = url.match(/\/page\/(\d+)(?:\/|$)/);
		if (match) {
			item.pages = match[1];
		}
	}

	// Fallback if title is still totally blank
	if (!item.title && item.publicationTitle && item.date) {
		item.title = `${item.publicationTitle}, ${item.date}`;
	}

	item.libraryCatalog = "National Library of Israel";
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
