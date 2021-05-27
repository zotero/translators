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


async function detectSearchMultiple(item) {
    if (!item.ISSN.match(/\d{4}-\d{4}/)) {
        Z.debug("item contains no valid issn %o", item);
        return false;
    }
    if (!getApiKey())
        return false;

    let totalItems = await getTotalItems(item, getApiKey()).then(totalItems => { return totalItems;});
    if (totalItems)
        return "multiple";
    return
        false;
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
    for (let iteration = 0; iteration < iterations; ++iteration) {
        let startOffset = (iteration == 0) ? 1 : Math.floor(iteration) * RESULTS_PER_REQUEST + 1;
        url = url.replace(/&s=\d+/, "&s=" + startOffset);
        promises.push(promiseStep(url));
    }
    return Promise.all(promises).then(chunks => { return chunks }).catch( e => { Z.debug(e) });
}


async function getSearchResults(queryISSN) {
    let springer_api_key = getApiKey();
    let doi_url = SPRINGER_API_ENDPOINT_URL + queryISSN + "&s=1&p=" + RESULTS_PER_REQUEST+ "&api_key=" + springer_api_key;
    let chunks = await getTotalItems(queryISSN, springer_api_key).then( totalItems => { return getDOIS(doi_url, totalItems);}).catch( e => { Z.debug(e) });
    let items = {};
    let i = 0;
    let allChunks = [].concat.apply([], chunks);
    for (doi of allChunks) {
        items[doi] = ++i;
    }
    console.log("ITEMS %o", items);
    return items;
}


async function doSearchMultiple(item) {
    if (await detectSearchMultiple(item) !== "multiple")
        return false;

    let springer_api_key = getApiKey();
    if (!springer_api_key) {
        Z.debug("No API key in doSearch");
        return;
    }

	if (!item.ISSN) {
        Z.debug("no item.ISSN");
        return;
    }

    let issn = ZU.cleanISSN(item.ISSN);
    let doiItems = await getSearchResults(issn).then(doiItems => {return doiItems});
    Zotero.selectItems(doiItems, function (items) {
        Object.keys(items).forEach(function (doi) {
            let translator = Zotero.loadTranslator("search");
            translator.setTranslator("95e0f3ba-ed5b-4ab2-9aa5-0ae1b8ec6eb3");
            translator.setSearch(doi);
            translator.setHandler("itemDone", function (t, i) {
                i.complete();
            });
            translator.translate();
        });
    });
}


/** BEGIN TEST CASES **/
/** END TEST CASES **/
