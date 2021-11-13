{
	"translatorID": "9e898223-938c-4c8f-8b5c-d118b6e44aae",
	"label": "Schweizerisches Bundesgericht",
	"creator": "Hans-Peter Oeri",
	"target": "^https://www\\.bger\\.ch/ext/eurospider/live/(de|fr|it)/php/(clir|aza)/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-11-13 20:55:11"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2020 Hans-Peter Oeri

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

/**
 * read query parameters from url
 *
 * @param   {String} url
 * @returns {{}}
 */
function parseURLParameters(url) {
	let parts = require('url').parse(url, true);
	if (parts.pathname === "/ext/eurospider/live/de/php/aza/http/index.php") {
		parts.query._collection = "BGer";
	}
	else if (parts.pathname === "/ext/eurospider/live/de/php/clir/http/index.php") {
		parts.query._collection = "BGE";
	}
	else if (parts.pathname === "/ext/eurospider/live/de/php/aza/http/index_aza.php") {
		parts.query._collection = "news";
	}
	return parts.query;
}

/**
 * internal detectWeb interpreting prepared query parameters
 *
 * @param   {{}} parameters
 * @returns {string|boolean}
 * @private
 */
function _detectWeb(parameters) {
	switch (parameters.type) {
		case "simple_query":
		case "simple_similar_documents":
			return "multiple";

		case "show_document":
		case "highlight_simple_query":
		case "highlight_simple_similar_documents":
			return "case";
	}
	if (parameters.mode === "news") {
		return "multiple";
	}
	return false;
}

/**
 * collect items from a new rulings page
 *
 * Those pages are found at:
 * /ext/eurospider/live/de/php/aza/http/index_aza.php?...mode=news
 *
 * @param {Document} doc
 * @param {{}}       parameters
 * @returns {{}}
 */
function getSearchResultsNews(doc, parameters) {
	let domRows = doc.querySelectorAll("div.eit>table:nth-of-type(2)>tbody>tr");
	let items = {};

	for (let i = 1; i < domRows.length; i += 2) {
		let date = domRows[i].children[1].innerText;
		let url  = domRows[i].children[2].children[0];
		let number = domRows[i].children[2].children[0].innerText;
		let subject = domRows[i].children[4].innerText;
		items[url] = number + " (" + date + "; " + subject + ")";
	}

	return items;
}

/**
 * collect items from a search result page of all rulings
 *
 * Those pages are found at:
 * /ext/eurospider/live/de/php/aza/http/index.php?l...type=simple_query|simple_similar_documents
 *
 * @param {Document} doc
 * @param {{}}       parameters
 * @returns {{}}
 */
function getSearchResultsBGer(doc, parameters) {
	let domRows = doc.querySelectorAll("div.ranklist_content>ol>li");
	let items = {};

	for (let i = 1; i < domRows.length; i++ ) {
		let meta = domRows[i].children[0].children[0].innerText;
		let date = meta.substring(0, meta.indexOf(' '));
		let number = meta.substring(date.length + 1);
		number = number.substring(0, 2) + "_" + number.substring(3);
		let url  = domRows[i].children[0].children[0];
		let subject = domRows[i].children[2].children[1].innerText;
		let subject2 = domRows[i].children[2].children[2].innerText;
		items[url] = number + " (" + date + "; " + subject + ": " + subject2 + ")";
	}
	return items;
}

/**
 * collect items from a search result page of formally published rulings
 *
 * Those pages are found at:
 * /ext/eurospider/live/de/php/clir/http/index.php?...type=highlight_simple_query|highlight_simple_similar_documents
 *
 * @param {Document} doc
 * @param {{}}       parameters
 * @returns {{}}
 */
function getSearchResultsBGE(doc, parameters) {
	let dom_rows = doc.querySelectorAll("div.ranklist_content>ol>li");
	let items = {};

	for (let i = 1; i < dom_rows.length; i++ ) {
		let url = dom_rows[i].children[0].children[0];
		let number = "BGE " + url.innerText;
		let subject = dom_rows[i].children[2].children[1].innerText;
		subject = subject.substring(subject.indexOf(']') + 2);
		items[url] = number + " (" + subject + ")";
	}
	return items;
}

function _scrape(doc, url, parameters) {
		let item = new Zotero.Item("case");

		item.url = url;
		item.court = "Schweizerisches Bundesgericht";
		item.attachments.push({
			title: "Snapshot",
			document: doc
		});
		if (parameters._collection === "BGE") {
			let docket = parameters.highlight_docid;
			docket = docket.substring(6, docket.length - 3).replace(/-/g, ' ');
			item.title = "BGE " + docket;
			item.number = item.title;
			item.date = parseInt(docket.split(' ')[0]) + 1874;
			item.abstractNote = ZU.trimInternal(doc.querySelector("div#regeste>div.paraatf").innerText);
		}
		else if (parameters._collection === "BGer") {
			item.date = parameters.highlight_docid.substring(12,22).replace(/-/g, '.');
			item.number = parameters.highlight_docid.substring(23).replace('-', '/');
			item.title = "BGer " + item.number;
		}
		else {
			Z.debug( "unknown collection '" + parameters._collection + "'");
		}

		item.complete();
}

function getSearchResults(doc, parameters) {
	switch (parameters._collection) {
		case "news":
			return getSearchResultsNews(doc, parameters);
		case "BGer":
			return getSearchResultsBGer(doc, parameters);
		case "BGE":
			return getSearchResultsBGE(doc, parameters);
		default:
			Z.debug( "unknown collection '" + parameters._collection + "'");
	}
}

function scrape(doc, url) {
	let parameters = parseURLParameters(url);
	_scrape(doc, url, parameters);
}

function detectWeb(doc, url) {
	let parameters = parseURLParameters(url);
	return _detectWeb(parameters);
}

function doWeb(doc, url) {
	let parameters = parseURLParameters(url);

	if (_detectWeb(parameters) === "multiple") {
		Zotero.selectItems(getSearchResults(doc, parameters), function (items) {
			if (items) ZU.processDocuments(Object.keys(items), scrape);
		});
	}
	else {
		_scrape(doc, url, parameters);
	}
}
