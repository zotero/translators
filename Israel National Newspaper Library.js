{
	"translatorID": "9d8099b7-1c50-4159-9a67-f9fc1fb3b463",
	"label": "Israel National Newspaper Library",
	"creator": "Anonymus",
	"target": "^https:\\/\\/www\\.nli\\.org\\.il\\/(en|he|ar)\\/newspapers\\/.*",
	"minVersion": "6.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-10-17 21:22:49"
}

/*
	***** BEGIN LICENSE BLOCK *****
 	This code is in the public domain
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
	if (url.includes("/article/") || url.includes("/page/")) {
		return "newspaperArticle";
	}
	return false;
}

async function doWeb(doc, url) {
	await scrape(doc, url);
}

function detectLanguageFromText(text) {
	if (/[\u0590-\u05FF]/.test(text)) return "he"; // Hebrew range
	if (/[\u0600-\u06FF]/.test(text)) return "ar"; // Arabic range
	if (/[a-zA-Z]/.test(text)) return "en"; // Basic Latin letters
	return null;
}

async function scrape(doc, url) {
	const item = new Zotero.Item("newspaperArticle");

	// Get JSON-LD data
	let jsonLDData = null;
	const jsonLD = doc.querySelector('script[type="application/ld+json"]');
	if (jsonLD) {
		try {
			jsonLDData = JSON.parse(jsonLD.textContent);
			const headline = ZU.trimInternal(jsonLDData.headline);
			if (headline) item.title = headline;
		} catch (e) {
			ZU.debug("Error parsing JSON-LD for newspaper: " + e);
		}
	}

	// Persistent link
	const linkNode = doc.querySelector("#sectionleveltabpersistentlinkarea .persistentlinkurl");
	item.url = linkNode ? ZU.trimInternal(linkNode.textContent) : url;

	// Abstract + Full Text
	const paragraphs = Array.from(doc.querySelectorAll("#pagesectionstextcontainer p"))
		.map(p => ZU.trimInternal(p.textContent))
		.filter(Boolean);

	if (paragraphs.length) {
		item.abstractNote = paragraphs[0];
		
		// Language detection
		const sampleText = paragraphs.join(" ").slice(0, 1000);
		const detectedLang = detectLanguageFromText(sampleText);
		if (detectedLang) {
			const langMap = { he: "heb", ar: "ara", en: "eng" };
			item.language = langMap[detectedLang] || detectedLang;
		}
	}

	// Date from breadcrumb
	const dateNode = doc.querySelector('li.breadcrumb-item:nth-child(3)');
	if (dateNode) {
		item.date = ZU.trimInternal(dateNode.textContent);
	}

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
			} catch (e) {
				ZU.debug("Failed to parse data-nli-data-json: " + e);
			}
		}
	}

	// Page number handling
	if (url.includes("/page/")) {
		const match = url.match(/\/page\/(\d+)(?:\/|$)/);
		if (match) {
			item.pages = match[1];
		}
		// Clean URL for citation
		item.url = url.split('?')[0].split('#')[0];
	} else {
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
