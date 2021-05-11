{
	"translatorID": "de0eef58-cb39-4410-ada0-6b39543383f3",
	"label": "ubtue_Springer_ISSN",
	"creator": "Johannes Riedl",
	"target": "",
	"minVersion": "4.0",
	"maxVersion": "",
	"priority": 99,
	"inRepository": true,
	"translatorType": 16,
	"browserSupport": "gcsibv",
	"lastUpdated": "2018-04-13 13:41:00"
}

/*
***** BEGIN LICENSE BLOCK *****

Copyright © 2021 University Library of Tuebingen
Originally based on code by Philip Zumstein (2015)

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

const SPRINGER_API_ENDPOINT_URL = "https://api.springernature.com/meta/v2/dois?q=issn:";
const RESULTS_PER_REQUEST = 100;


function getApiKey() {
    let springer_api_key = process.env.SPRINGER_API_KEY;
    if (!springer_api_key || springer_api_key.startsWith('$')) {
        Z.debug("Api key apparently unset")
        return false;
    }
    return springer_api_key;
}


function detectSearchMultiple(item) {
    if (!item.ISSN.match(/\d{4}-\d{4}/)) {
        Z.debug("item contains no valid issn %o", item);
        return false;
    }
    if (!getApiKey())
        return false;

    let totalItems = (async () => { return await getTotalItems(item, getApiKey())})();
    if (totalItems)
        return "multiple";
    return false;
}



function getTotalItems(queryISSN, api_key) {
    let url = SPRINGER_API_ENDPOINT_URL + queryISSN + "&s=1&p=1&api_key=" + api_key;
    return new Promise((success, failure) => { ZU.doGet(url, function (text) {
         let parser = new DOMParser();
         let xmltree = parser.parseFromString(text, "application/xml");
         let totalItems = ZU.xpathText(xmltree, '//result/total');
         success(totalItems);
	})});
}


function getDOIS(url, totalItems) {
    let promises = [];
    const promiseStep = (url) => {
         return new Promise((success, failure) => { ZU.doGet(url, function (text) {
         let dois = [];
         let parser = new DOMParser();
         let xmltree = parser.parseFromString(text, "application/xml");
         let doiObjects = ZU.xpath(xmltree, '//dois/doi');
         for (let doi of doiObjects) {
             dois.push(doi.innerText);
         }
         success(dois);
    })});};

    let iterations = totalItems /  RESULTS_PER_REQUEST + 1;
    for (let iteration = 1; iteration <= iterations; ++iteration) {
        url = url.replace(/&s=\d+/, "&s=" + iteration);
        promises.push(promiseStep(url));
    }
    return Promise.all(promises);
}


async function doSearchMultiple(item) {
    let springer_api_key = getApiKey();
    if (!springer_api_key) {
        Z.debug("No API key in doSearch");
        return;
    }

	if (!item.ISSN) {
        Z.debug("no item.ISSN");
        return;
    }

    let queryISSN = ZU.cleanISSN(item.ISSN);
    let doi_url = SPRINGER_API_ENDPOINT_URL + queryISSN + "&s=1&p=" + RESULTS_PER_REQUEST+ "&api_key=" + springer_api_key;
    let chunks = await getTotalItems(queryISSN, springer_api_key).then( totalItems => { return getDOIS(doi_url, totalItems);}).catch( e => { Z.debug(e)});
    return [].concat.apply([], chunks); // Merge the result arrays
}


/** BEGIN TEST CASES **/
/** END TEST CASES **/
