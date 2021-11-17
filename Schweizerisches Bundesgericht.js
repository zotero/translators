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
	"lastUpdated": "2021-11-17 09:47:43"
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

const abbrevPublished = {
	de: "BGE ",
	fr: "ATF ",
	it: "ATF "
};

const abbrevUnpublished = {
	de: "BGer ",
	fr: "TF ",
	it: "TF "
};

const courtName = {
	de: "Schweizerisches Bundesgericht",
	fr: "Tribunal Fédéral Suisse",
	it: "Tribunale Federale Svizzero"
}

/**
 * read query parameters from url
 *
 * @param   {String} url
 * @returns {{}}
 */
function parseURLParameters(url) {
	let parts = require('url').parse(url, true);
	parts.query._lang = parts.pathname.split('/')[4];

	let subpath = parts.pathname.substring(23);
	if (subpath === "/php/aza/http/index.php") {
		parts.query._collection = "BGer";
	}
	else if (subpath === "/php/clir/http/index.php") {
		parts.query._collection = "BGE";
	}
	else if (subpath === "/php/aza/http/index_aza.php") {
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
	let domRows = doc.querySelectorAll(".eit > table:nth-of-type(2) tr");
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
	let domRows = doc.querySelectorAll(".ranklist_content ol > li");
	let items = {};

	for (row of domRows) {
		let meta = text(row, ".rank_title", 0);
		let date = meta.substring(0, meta.indexOf(' '));
		let number = meta.substring(date.length + 1);
		number = number.substring(0, 2) + "_" + number.substring(3);
		let url  = attr(row, ".rank_title a", "href");
		let subject = text(row, ".rank_data > .subject", 0);
		let subject2 = text(row, ".rank_data > .object", 0);
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
		let number = abbrevPublished[parameters._lang] + url.innerText;
		let subject = dom_rows[i].children[2].children[1].innerText;
		subject = subject.substring(subject.indexOf(']') + 2);
		items[url] = number + " (" + subject + ")";
	}
	return items;
}

function _scrape(doc, url, parameters) {
		let item = new Zotero.Item("case");

		item.url = url;
		item.court = courtName[parameters._lang];
		item.attachments.push({
			title: "Snapshot",
			document: doc
		});
		if (parameters._collection === "BGE") {
			let docket = parameters.highlight_docid;
			docket = docket.substring(6, docket.length - 3).replace(/-/g, ' ');
			item.title = abbrevPublished[parameters._lang] + docket;
			item.number = item.title;
			item.date = parseInt(docket.split(' ')[0]) + 1874;
			item.abstractNote = ZU.trimInternal(doc.querySelector("div#regeste>div.paraatf").innerText);
		}
		else if (parameters._collection === "BGer") {
			item.date = parameters.highlight_docid.substring(12,22).replace(/-/g, '.');
			item.number = parameters.highlight_docid.substring(23).replace('-', '/');
			item.title = abbrevUnpublished[parameters._lang] + item.number;
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
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.bger.ch/ext/eurospider/live/de/php/clir/http/index.php?lang=de&type=simple_query&query_words=UNterhalt&lang=de&top_subcollection_clir=bge&from_year=1954&to_year=2021",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.bger.ch/ext/eurospider/live/de/php/clir/http/index.php?lang=de&type=highlight_simple_query&page=1&from_date=&to_date=&from_year=1954&to_year=2021&sort=relevance&insertion_date=&from_date_push=&top_subcollection_clir=bge&query_words=UNterhalt&part=all&de_fr=&de_it=&fr_de=&fr_it=&it_de=&it_fr=&orig=&translation=&rank=1&highlight_docid=atf%3A%2F%2F81-I-63%3Ade&number_of_ranks=714&azaclir=clir",
		"items": [
			{
				"itemType": "case",
				"caseName": "BGE 81 I 63",
				"creators": [],
				"dateDecided": 1955,
				"abstractNote": "Militärpflichtersatz: Besteuerung eines Evangelisten, für dessen Unterhalt seine Glaubensfreunde sorgen.",
				"court": "Schweizerisches Bundesgericht",
				"docketNumber": "BGE 81 I 63",
				"url": "https://www.bger.ch/ext/eurospider/live/de/php/clir/http/index.php?lang=de&type=highlight_simple_query&page=1&from_date=&to_date=&from_year=1954&to_year=2021&sort=relevance&insertion_date=&from_date_push=&top_subcollection_clir=bge&query_words=UNterhalt&part=all&de_fr=&de_it=&fr_de=&fr_it=&it_de=&it_fr=&orig=&translation=&rank=1&highlight_docid=atf%3A%2F%2F81-I-63%3Ade&number_of_ranks=714&azaclir=clir",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.bger.ch/ext/eurospider/live/de/php/aza/http/index_aza.php?date=20211116&lang=de&mode=news",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.bger.ch/ext/eurospider/live/de/php/aza/http/index.php?highlight_docid=aza%3A%2F%2Faza://27-10-2021-8C_329-2021&lang=de&zoom=&type=show_document",
		"items": [
			{
				"itemType": "case",
				"caseName": "BGer 8C_329/2021",
				"creators": [],
				"dateDecided": "27.10.2021",
				"court": "Schweizerisches Bundesgericht",
				"docketNumber": "8C_329/2021",
				"url": "https://www.bger.ch/ext/eurospider/live/de/php/aza/http/index.php?highlight_docid=aza%3A%2F%2Faza://27-10-2021-8C_329-2021&lang=de&zoom=&type=show_document",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.bger.ch/ext/eurospider/live/de/php/aza/http/index.php?lang=de&type=simple_query&query_words=Unterhalt&lang=de&top_subcollection_aza=all&from_date=&to_date=",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.bger.ch/ext/eurospider/live/fr/php/clir/http/index.php?lang=fr&type=highlight_simple_query&page=1&from_date=&to_date=&from_year=1954&to_year=2021&sort=relevance&insertion_date=&from_date_push=&top_subcollection_clir=bge&query_words=UNterhalt&part=all&de_fr=&de_it=&fr_de=&fr_it=&it_de=&it_fr=&orig=&translation=&rank=1&highlight_docid=atf%3A%2F%2F81-I-63%3Ade&number_of_ranks=714&azaclir=clir",
		"items": [
			{
				"itemType": "case",
				"caseName": "ATF 81 I 63",
				"creators": [],
				"dateDecided": 1955,
				"abstractNote": "Militärpflichtersatz: Besteuerung eines Evangelisten, für dessen Unterhalt seine Glaubensfreunde sorgen.",
				"court": "Tribunal Fédéral Suisse",
				"docketNumber": "ATF 81 I 63",
				"url": "https://www.bger.ch/ext/eurospider/live/fr/php/clir/http/index.php?lang=fr&type=highlight_simple_query&page=1&from_date=&to_date=&from_year=1954&to_year=2021&sort=relevance&insertion_date=&from_date_push=&top_subcollection_clir=bge&query_words=UNterhalt&part=all&de_fr=&de_it=&fr_de=&fr_it=&it_de=&it_fr=&orig=&translation=&rank=1&highlight_docid=atf%3A%2F%2F81-I-63%3Ade&number_of_ranks=714&azaclir=clir",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.bger.ch/ext/eurospider/live/fr/php/aza/http/index.php?highlight_docid=aza%3A%2F%2Faza://27-10-2021-8C_329-2021&lang=fr&zoom=&type=show_document",
		"items": [
			{
				"itemType": "case",
				"caseName": "TF 8C_329/2021",
				"creators": [],
				"dateDecided": "27.10.2021",
				"court": "Tribunal Fédéral Suisse",
				"docketNumber": "8C_329/2021",
				"url": "https://www.bger.ch/ext/eurospider/live/fr/php/aza/http/index.php?highlight_docid=aza%3A%2F%2Faza://27-10-2021-8C_329-2021&lang=fr&zoom=&type=show_document",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.bger.ch/ext/eurospider/live/it/php/aza/http/index.php?highlight_docid=aza%3A%2F%2Faza://27-10-2021-8C_329-2021&lang=it&zoom=&type=show_document",
		"items": [
			{
				"itemType": "case",
				"caseName": "TF 8C_329/2021",
				"creators": [],
				"dateDecided": "27.10.2021",
				"court": "Tribunale Federale Svizzero",
				"docketNumber": "8C_329/2021",
				"url": "https://www.bger.ch/ext/eurospider/live/it/php/aza/http/index.php?highlight_docid=aza%3A%2F%2Faza://27-10-2021-8C_329-2021&lang=it&zoom=&type=show_document",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.bger.ch/ext/eurospider/live/it/php/clir/http/index.php?lang=it&type=highlight_simple_query&page=1&from_date=&to_date=&from_year=1954&to_year=2021&sort=relevance&insertion_date=&from_date_push=&top_subcollection_clir=bge&query_words=UNterhalt&part=all&de_fr=&de_it=&fr_de=&fr_it=&it_de=&it_fr=&orig=&translation=&rank=1&highlight_docid=atf%3A%2F%2F81-I-63%3Ade&number_of_ranks=714&azaclir=clir",
		"items": [
			{
				"itemType": "case",
				"caseName": "ATF 81 I 63",
				"creators": [],
				"dateDecided": 1955,
				"abstractNote": "Militärpflichtersatz: Besteuerung eines Evangelisten, für dessen Unterhalt seine Glaubensfreunde sorgen.",
				"court": "Tribunale Federale Svizzero",
				"docketNumber": "ATF 81 I 63",
				"url": "https://www.bger.ch/ext/eurospider/live/it/php/clir/http/index.php?lang=it&type=highlight_simple_query&page=1&from_date=&to_date=&from_year=1954&to_year=2021&sort=relevance&insertion_date=&from_date_push=&top_subcollection_clir=bge&query_words=UNterhalt&part=all&de_fr=&de_it=&fr_de=&fr_it=&it_de=&it_fr=&orig=&translation=&rank=1&highlight_docid=atf%3A%2F%2F81-I-63%3Ade&number_of_ranks=714&azaclir=clir",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
