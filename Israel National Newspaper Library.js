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

function detectWeb(url) {
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

	// Get JSON-LD data
	const jsonLD = doc.querySelector('script[type="application/ld+json"]');
	if (jsonLD) {
		try {
			let jsonLDData = JSON.parse(jsonLD.textContent);
			const headline = ZU.trimInternal(jsonLDData.headline);
			if (headline) item.title = headline;
			const abstract = ZU.trimInternal(jsonLDData.description);
			if (abstract) item.abstractNote = abstract;
			const date = ZU.trimInternal(jsonLDData.dateModified);
			if (date) item.date = ZU.trimInternal(date);
		}
		catch (e) {
			ZU.debug("Error parsing JSON-LD for newspaper: " + e);
		}
	}
	else {
		// Headline
		const headline = ZU.trimInternal(doc.querySelector('#sectionleveltabtitlearea').getAttribute('content'));

		if (headline) item.title = headline;

		// Abstract note
		const abstract = ZU.trimInternal(doc.querySelector('meta[name="description"]').getAttribute('content'));

		if (abstract) item.abstractNote = abstract;

		// Date
		const dateNode = doc.querySelector('li.breadcrumb-item:nth-child(3)');
		if (dateNode) {
			item.date = ZU.trimInternal(dateNode.textContent);
		}
	}

	// Persistent link
	const linkNode = doc.querySelector(".persistentlinkurl");
	item.url = linkNode ? ZU.trimInternal(linkNode.textContent) : url;

	// Get publication from NLI script data
	const nliScript = doc.querySelector('script#nlijs');
	if (nliScript) {
		const rawJSON = nliScript.getAttribute('data-nli-data-json');
		if (rawJSON) {
			try {
				const json = JSON.parse(rawJSON.replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
				if (json.publicationTitle) {
					item.publicationTitle = ZU.trimInternal(json.publicationTitle);
				}
			}
			catch (e) {
				ZU.debug("Failed to parse data-nli-data-json: " + e);
			}
		}
	}

	// Page number handling
	if (url.includes("/page/")) {
		const match = url.match(/\/page\/(\d+)\//);
		if (match) {
			item.pages = match[1];
		}
		// Clean URL for citation
		item.url = url.split('?')[0].split('#')[0];
	}
	else {
		const pageLabel = doc.querySelector('span.pagelabel.current b');
		if (pageLabel) {
			const split = pageLabel.textContent.split(" ");
			if (split[1]) {
				item.pages = ZU.trimInternal(split[1]);
			}
		}
	}

	// Fallback title if no headline found
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
