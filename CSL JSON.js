{
	"translatorID": "bc03b4fe-436d-4a1f-ba59-de4d2d7a63f7",
	"label": "CSL JSON",
	"creator": "Simon Kornblith",
	"target": "json",
	"minVersion": "4.0.27",
	"maxVersion": "",
	"priority": 100,
	"configOptions": {
		"async": true
	},
	"inRepository": true,
	"translatorType": 3,
	"lastUpdated": "2022-09-20 13:32:25"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2022 Simon Kornblith and Sebastian Karcher

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

function parseInput() {
	var str, json = "";
	
	// Read in the whole file at once, since we can't easily parse a JSON stream. The
	// chunk size here is pretty arbitrary, although larger chunk sizes may be marginally
	// faster. We set it to 1MB.
	while ((str = Z.read(1048576)) !== false) json += str;
	
	try {
		return JSON.parse(json);
	}
	catch (e) {
		Zotero.debug(e);
	}
	return false;
}

function detectImport() {
	/* eslint-disable camelcase */
	const CSL_TYPES = { article: true, "article-journal": true, "article-magazine": true,
		"article-newspaper": true, bill: true, book: true, broadcast: true,
		chapter: true, classic: true, collection: true, dataset: true, document: true,
		entry: true, "entry-dictionary": true, "entry-encyclopedia": true, event: true,
		figure: true, graphic: true, hearing: true, interview: true, legal_case: true,
		legislation: true, manuscript: true, map: true, motion_picture: true,
		musical_score: true, pamphlet: true, "paper-conference": true, patent: true,
		performance: true, personal_communication: true, periodical: true, post: true,
		"post-weblog": true, regulation: true, report: true, review: true, "review-book": true,
		song: true, speech: true, standard: true, thesis: true, treaty: true, webpage: true };
	/* eslint-enable camelcase*/

		
	var parsedData = parseInput();
	if (!parsedData) return false;
	
	if (typeof parsedData !== "object") return false;
	if (!(parsedData instanceof Array)) parsedData = [parsedData];
	
	for (var i = 0; i < parsedData.length; i++) {
		var item = parsedData[i];
		if (typeof item !== "object" || !item.type || !(item.type in CSL_TYPES)) {
			return false;
		}
	}
	return true;
}

function doImport() {
	if (typeof Promise == 'undefined') {
		startImport(
			function () {},
			function (e) {
				throw e;
			}
		);
	}
	else {
		return new Promise(function (resolve, reject) {
			startImport(resolve, reject);
		});
	}
	return false;
}

function startImport(resolve, reject) {
	try {
		var parsedData = parseInput();
		if (!parsedData) resolve();
		if (!Array.isArray(parsedData)) parsedData = [parsedData];
		importNext(parsedData, resolve, reject);
	}
	catch (e) {
		reject(e);
	}
}

function importNext(data, resolve, reject) {
	try {
		var d;
		while (d = data.shift()) { // eslint-disable-line no-cond-assign
			var item = new Z.Item();
			
			// Default to 'article' (Document) if no type given. 'type' is required in CSL-JSON,
			// but some DOI registration agencies provide bad data, and this is better than failing.
			// (itemFromCSLJSON() will already default to 'article' for unknown 'type' values.)
			//
			// Technically this should go in the DOI Content Negotation translator, but it's easier
			// to do this here after the JSON has been parsed, and it might benefit other translators.
			//
			// This is just for imports from other translators. File/clipboard imports without
			// 'type' still won't work, because a valid 'type' is required in detectImport().
			//
			// https://forums.zotero.org/discussion/85273/error-importing-dois-via-add-item-by-identifier
			if (!d.type) {
				d.type = 'article';
			}
			
			ZU.itemFromCSLJSON(item, d);
			var maybePromise = item.complete();
			if (maybePromise) {
				maybePromise.then(function () {
					importNext(data, resolve, reject);
				});
				return;
			}
		}
	}
	catch (e) {
		reject(e);
	}
	
	resolve();
}

function doExport() {
	var item, data = [];
	while (item = Z.nextItem()) { // eslint-disable-line no-cond-assign
		if (item.extra) {
			item.extra = item.extra.replace(/(?:^|\n)citation key\s*:\s*([^\s]+)(?:\n|$)/i, (m, citationKey) => { // eslint-disable-line no-loop-func
				item.citationKey = citationKey;
				return '\n';
			}).trim();
		}
		var cslItem = ZU.itemToCSLJSON(item);
		if (item.citationKey) cslItem.id = item.citationKey;
		data.push(cslItem);
	}
	Z.write(JSON.stringify(data, null, "\t"));
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "import",
		"input": "[\n\t{\n\t\t\"id\": \"http://zotero.org/users/96641/items/BDQRTS3T\",\n\t\t\"type\": \"book\",\n\t\t\"title\": \"Stochastic biomathematical models: With applications to neuronal modeling\",\n\t\t\"collection-title\": \"Lecture notes in mathematics\",\n\t\t\"publisher\": \"Springer\",\n\t\t\"publisher-place\": \"Heidelberg\",\n\t\t\"volume\": \"2058\",\n\t\t\"number-of-pages\": \"206\",\n\t\t\"event-place\": \"Heidelberg\",\n\t\t\"ISBN\": \"978-3-642-32156-6\",\n\t\t\"language\": \"en\",\n\t\t\"author\": [\n\t\t\t{\n\t\t\t\t\"family\": \"Bachar\",\n\t\t\t\t\"given\": \"Mostafa\"\n\t\t\t}\n\t\t],\n\t\t\"issued\": {\n\t\t\t\"date-parts\": [\n\t\t\t\t[\n\t\t\t\t\t\"2013\",\n\t\t\t\t\t1,\n\t\t\t\t\t1\n\t\t\t\t]\n\t\t\t]\n\t\t}\n\t}\n]",
		"items": [
			{
				"itemType": "book",
				"title": "Stochastic biomathematical models: With applications to neuronal modeling",
				"creators": [
					{
						"lastName": "Bachar",
						"firstName": "Mostafa",
						"creatorType": "author"
					}
				],
				"date": "January 1, 2013",
				"ISBN": "978-3-642-32156-6",
				"itemID": "http://zotero.org/users/96641/items/BDQRTS3T",
				"language": "en",
				"numPages": "206",
				"place": "Heidelberg",
				"publisher": "Springer",
				"series": "Lecture notes in mathematics",
				"volume": "2058",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
