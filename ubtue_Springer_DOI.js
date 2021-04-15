{
	"translatorID": "95e0f3ba-ed5b-4ab2-9aa5-0ae1b8ec6eb3",
	"label": "ubtue_Springer_DOI",
	"creator": "Sebastian Karcher, Johannes Riedl",
	"target": "",
	"minVersion": "4.0.29.11",
	"maxVersion": "",
	"priority": 50,
	"inRepository": false,
	"translatorType": 8,
	"browserSupport": "gcs",
	"lastUpdated": "2019-01-26 18:00:00"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2019 Sebastian Karcher
	Copyright © 2019 University Library of Tuebingen

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
	return (filterQuery(items).length > 0);
}

// return an array of DOIs from the query (items or text)
function filterQuery(items) {
	if (!items) return [];

	if (typeof items == 'string' || !items.length) items = [items];

	// filter out invalid queries
	let dois = [], doi;
	for (let i = 0, n = items.length; i < n; i++) {
		if (items[i].DOI && (doi = ZU.cleanDOI(items[i].DOI))) {
			dois.push(doi);
		}
		else if (typeof items[i] == 'string' && (doi = ZU.cleanDOI(items[i]))) {
			dois.push(doi);
		}
	}
	return dois;
}

function doSearch(items) {
	let dois = filterQuery(items);
	if (!dois.length) return;
	processDOIs(dois);
}

function processDOIs(dois) {
	let doi = dois.pop();
    // Make sure we have a Springer DOI
    if (!doi.match(/^10\.1007\//))
        return;

    let springer_api_key=process.env.SPRINGER_API_KEY;
    if (!springer_api_key || springer_api_key.startsWith('$')) {
        Z.debug("Api key apparently unset")
        return;
    }

    ZU.doGet('https://api.springernature.com/meta/v2/json?q=doi:' + encodeURIComponent(doi) + '&api_key=' + springer_api_key,
        function (text) {
            if (!text)
                return;
            Z.debug(text);
            let trans = Zotero.loadTranslator('import');
            trans.setString(text);
            trans.setTranslator('5665af6e-d9a3-4658-b92e-8c0dcd326f72')
            trans.setHandler('itemDone', function (obj, item) {
                 item.complete();
            });
            trans.translate();
        }, function () {
	    	if (dois.length) processDOIs(dois);
	    });
}

/** BEGIN TEST CASES **/
/** END TEST CASES **/
