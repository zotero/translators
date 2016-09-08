{
	"translatorID": "b28d0d42-8549-4c6d-83fc-8382874a5cb9",
	"label": "DOI Content Negotiation",
	"creator": "Sebastian Karcher",
	"target": "",
	"minVersion": "4.0.29.11",
	"maxVersion": "",
	"priority": 80,
	"inRepository": true,
	"translatorType": 8,
	"browserSupport": "gcs",
	"lastUpdated": "2014-05-29 07:46:16"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2016 Philipp Zumstein

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

function detectSearch(items) {
	if(!items) return false;

	if(typeof items == 'string' || !items.length) items = [items];

	for(var i=0, n=items.length; i<n; i++) {
		if(!items[i]) continue;

		if(items[i].DOI && ZU.cleanDOI(items[i].DOI)) return true;
		if(typeof items[i] == 'string' && ZU.cleanDOI(items[i])) return true;
	}

	return false;
}

function filterQuery(items) {
	if(!items) return [];

	if(typeof items == 'string' || !items.length) items = [items];

	//filter out invalid queries
	var dois = [], doi;
	for(var i=0, n=items.length; i<n; i++) {
		if(items[i].DOI && (doi = ZU.cleanDOI(items[i].DOI)) ) {
			dois.push(doi);
		} else if(typeof items[i] == 'string' && (doi = ZU.cleanDOI(items[i])) ) {
			dois.push(doi);
		}
	}
	return dois;
}

function doSearch(items) {
	var dois = filterQuery(items);
	if(!dois.length) return;
	processDOIs(dois);
}

var fixItemType = {
	"journal-article": "article-journal", //http://doi.org/10.1136%2Fbmj.2.5914.335-a and crossref generally
	"book-chapter": "chapter", //http://doi.org/10.1017/CBO9781316216453.176
	"reference-entry": "chapter", //http://doi.org/10.1002/14651858.CD002966.pub3
	"report-series": "report",
	"misc": "article-journal" //DataCite
}

function fixJSON(text) {
	try {
		var item = JSON.parse(text);
		//Z.debug("CSL_JSON" + text)
		Z.debug(item)
		if(fixItemType[item.type]) item.type = fixItemType[item.type];
		//	Z.debug(item.container-title)
		if (item.type == "report") {
			Z.debug("here")
			Z.debug(item['container-title'])
			item.genre = item['container-title']
		}
		if (item.type != "article-journal" && item.type != "paper-conference") {
			item.note = "DOI: " + item.DOI;
		}
		//Sometimes date is in created, not issued: 10.1017/CCOL0521858429.016
		if (!item.issued.length && item.created) {
			item.issued = item.created;
		}
		if(item.issued && item.issued.raw) item.issued.literal = item.issued.raw;
		if(item.accessed && item.accessed.raw) item.accessed.literal = item.accessed.raw;
		return JSON.stringify([item]);
	} catch(e) {
		return false;
	}
}

function processDOIs(dois) {
	var doi = dois.pop();
	ZU.doGet('http://doi.org/' + encodeURIComponent(doi), function(text) {
		text = fixJSON(text);
		if(!text) {
			return;
		}
		//Z.debug(text)
		// use CSL JSON translator
		var trans = Zotero.loadTranslator('import');
		trans.setTranslator('bc03b4fe-436d-4a1f-ba59-de4d2d7a63f7');
		trans.setString(text);
		trans.setHandler('itemDone', function(obj, item) {
			//if (!item.libraryCatalog)
			item.libraryCatalog = "DOI.org";
			//check if there are potential issues with character encoding and try to fix it
			//e.g. 10.1057/9780230391116.0016 (en dash in title is presented as escaped unicode)
			for(var field in item) {
				if(typeof item[field] != 'string') continue;
				//check for control characters that should never be in strings from CrossRef
				if(/[\u007F-\u009F]/.test(item[field])) {
					item[field] = decodeURIComponent(escape(item[field]));
				}
			}
			Z.debug(item)
			if (item.itemType == "report") {
				item.reportType = item.publicationTitle;
			}
			item.complete();
		});
		trans.translate();
	}, function() {
		if(dois.length) processDOIs(dois, queryTracker);
	}, undefined, {"Accept" : "application/vnd.citationstyles.csl+json"})
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "search",
		"input": {
			"DOI": "10.12763/ONA1045"
		},
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"lastName": "Heiliges römisches Reich deutscher Nation",
						"fieldMode": 1,
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"title": "Code criminel de l'empereur Charles V vulgairement appellé la Caroline contenant les loix qui sont suivies dans les jurisdictions criminelles de l'Empire et à l'usage des conseils de guerre des troupes suisses.",
				"url": "http://dx.doi.org/10.12763/ONA1045",
				"DOI": "10.12763/ONA1045",
				"date": "1734",
				"libraryCatalog": "DataCite"
			}
		]
	}
]
/** END TEST CASES **/
