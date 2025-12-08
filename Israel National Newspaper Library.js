{
	"translatorID": "9d8099b7-1c50-4159-9a67-f9fc1fb3b463",
	"label": "Israel National Newspaper Library",
	"creator": "Anonymus",
	"target": "^https://www\\.nli\\.org\\.il/",
	"minVersion": "6.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-10-27 11:48:08"
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

	// Get JSON-LD data (preferred source)
	const jsonLD = doc.querySelector('script[type="application/ld+json"]');
	if (jsonLD) {
		try {
			const jsonLDData = JSON.parse(jsonLD.textContent);
			if (jsonLDData.headline) {
				item.title = ZU.trimInternal(jsonLDData.headline);
			}
			if (jsonLDData.description) {
				item.abstractNote = ZU.trimInternal(jsonLDData.description);
			}
			if (jsonLDData.datePublished) {
				item.date = ZU.trimInternal(jsonLDData.datePublished);
			}
		}
		catch (e) {
			Z.debug("Error parsing JSON-LD: " + e);
		}
	}
	else {
		// Fallbacks
		item.title = text(doc, '#sectionleveltabtitlearea') || item.title;
		item.abstractNote = text(doc, 'meta[name="description"]') || item.abstractNote;
		const dateStr = text(doc, 'li.breadcrumb-item:nth-child(3)');
		if (dateStr) {
			item.date = dateStr;  // Already trimmed by text()
		}
	}

	// Canonical URL (persistent link preferred)
	item.url = text(doc, "#sectionleveltabpersistentlinkarea .persistentlinkurl") || url;

	// Get publication from NLI script data
	const rawJSON = attr(doc, 'script#nlijs', 'data-nli-data-json');
	if (rawJSON) {
		try {
			const json = JSON.parse(rawJSON.replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
			if (json.publicationTitle) {
				item.publicationTitle = ZU.trimInternal(json.publicationTitle);
			}
		}
		catch (e) {
		Z.debug("Failed to parse data-nli-data-json: " + e);
	}
	}

	// Page number handling
	if (url.includes("/page/")) {
		const match = url.match(/\/page\/(\d+)\//);
		if (match) {
			item.pages = match[1];
		}
		// Clean the chosen URL (persistent or fallback)
		item.url = (item.url || url).split('?')[0].split('#')[0];
	}
	else {
		const pageStr = text(doc, 'span.pagelabel.current b');
		if (pageStr) {
			const parts = pageStr.split(/\s+/);
			if (parts[1]) {
				item.pages = parts[1];  // Already trimmed
		}
		}
	}

	// Fallback title if still missing
	if (!item.title && item.publicationTitle && item.date) {
		item.title = `${item.publicationTitle}, ${item.date}`;
	}

	item.libraryCatalog = "National Library of Israel";
	item.complete();
}
