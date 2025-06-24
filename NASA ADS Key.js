{
	"translatorID": "0620079f-8ebb-4bb3-88bd-6f6903075201",
	"label": "NASA ADS Key",
	"creator": "Robert Glas",
	"target": "",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"configOptions": {
		"getCollections": false
	},
	"inRepository": true,
	"translatorType": 2,
	"lastUpdated": "2025-06-24 09:33:27"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2025 Robert Glas

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

/* NASA ADS Key
 *
 * Export NASA ADS keys from Zotero.
 *
 * This translator exports the NASA ADS keys for the given bibliography items.
 * We look for a NASA ADS key in the URL and extra fields of each item. If no key
 * is found, we look for an arXiv ID (in the URL, DOI, archiveID, and extra
 * fields) and convert it to a NASA ADS key.
 *
 * Obviously, this requires all items to have at least one of the aforementioned
 * properties, which should be guaranteed when retrieving data directly from
 * NASA ADS (https://ui.adsabs.harvard.edu/) or arXiv (https://arxiv.org/). If no
 * NASA ADS key could be obtained for an item, the exported string will be empty.
 *
 * This translator enables an efficient work flow based on latex + biblatex (with
 * NASA ADS keys as citation keys) and Zotero as reference manager.
 */

/* doExport
 * perform export (called by Zotero)
 */
function doExport() {
	let item;
	let i;
	let adsKeys = [];

	while ((item = Zotero.nextItem())) {
		// NASA ADS key from URL: https://ui.adsabs.harvard.edu/abs/2017ApJ...837...84J
		if (item.hasOwnProperty("url")) {
			if (item.url.includes("adsabs.harvard.edu")) {
				let urlElements = item.url.split("/");
				let key = urlElements[urlElements.length - 1];
				adsKeys.push(key);
				continue;
			}
		}

		// NASA ADS key from extra field: "ADS Bibcode: 2017ApJ...837...84J"
		if (item.hasOwnProperty("extra")) {
			let extraLines = item.extra.split("\n");
			let found = false;

			for (i = 0; i < extraLines.length; i++) {
				if (extraLines[i].startsWith("ADS Bibcode:")) {
					let lineElements = extraLines[i].split(":");
					let key = lineElements[1].trim();
					adsKeys.push(key);
					found = true;
					break;
				}
			}

			if (found) continue;
		}

		// arXiv ID from URL: http://arxiv.org/abs/1611.07562
		if (item.hasOwnProperty("url")) {
			if (item.url.includes("arxiv.org")) {
				let urlElements = item.url.split("/");
				let key = urlElements[urlElements.length - 1];
				let arxivKey = "arXiv:" + key;
				adsKeys.push(arxivToAds(arxivKey, item.creators[0], item.date));
				continue;
			}
		}

		// arXiv ID from DOI: 10.48550/arXiv.1611.07562
		if (item.hasOwnProperty("DOI")) {
			if (item.DOI.includes("arXiv")) {
				let doiElements = item.DOI.split("/");
				let arxivKey = doiElements[1].replace("arXiv.", "arXiv:");
				if (arxivKey.startsWith("arXiv:")) {
					adsKeys.push(arxivToAds(arxivKey, item.creators[0], item.date));
					continue;
				}
			}
		}

		// arXiv ID from ID entry: arXiv:1611.07562
		if (item.hasOwnProperty("archiveID")) {
			if (item.archiveID.startsWith("arXiv:")) {
				let arxivKey = item.archiveID;
				adsKeys.push(arxivToAds(arxivKey, item.creators[0], item.date));
				continue;
			}
		}

		// arXiv ID from extra field: "arXiv:1611.07562 [astro-ph]"
		if (item.hasOwnProperty("extra")) {
			let extraLines = item.extra.split("\n");
			let found = false;

			for (i = 0; i < extraLines.length; i++) {
				if (extraLines[i].startsWith("arXiv:")) {
					let lineElements = extraLines[i].split(" ");
					let arxivKey = lineElements[0];
					adsKeys(arxivToAds(arxivKey, item.creators[0], item.date));
					found = true;
					break;
				}
			}

			if (found) continue;
		}
	}

	Zotero.write(adsKeys.join(','));
}

/* arxivToAds
 * convert ArXiv ID to NASA ADS key
 * for example: convert "arXiv:1611.07562" to "2017arXiv161107562J"
 */
function arxivToAds(arxivKey, author, date) {
	let arxivId = arxivKey.split(":")[1];
	let year = date.slice(0, 4);
	let last = author.lastName[0];
	return year + "arXiv" + arxivId.replace(".", "") + last;
}

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
