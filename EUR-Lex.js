{
	"translatorID": "bf053edc-a8c3-458c-93db-6d04ead2e636",
	"label": "EUR-Lex",
	"creator": "Philipp Zumstein",
	"target": "^https?://(www\\.)?eur-lex\\.europa\\.eu/(legal-content/[A-Z][A-Z]/(TXT|ALL)/|search.html\\?)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2020-07-12 15:19:24"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2017 Philipp Zumstein
	
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


// attr()/text() v2
// eslint-disable-next-line
function attr(docOrElem, selector, attr, index) {var elem = index ? docOrElem.querySelectorAll(selector).item(index) : docOrElem.querySelector(selector); return elem ? elem.getAttribute(attr) : null;}

function getQueryParam(url, param) {
	const queryString = url.split("?")[1];
	const vars = queryString.split("&");
	for (let i = 0; i < vars.length; i++) {
		const pair = vars[i].split("=");
		if (pair[0] == param) {
			return pair[1];
		}
	}
	return (false);
}

// the eli resource types are described at:
// http://publications.europa.eu/mdr/resource/authority/resource-type/html/resourcetypes-eng.html
const typeMapping = {
	DIR: 'bill', // directive
	REG: 'statute', // regulation
	DEC: 'statute', // decision
	RECO: 'report', // recommendation
	OPI: 'report', // opinion
	CASE: 'case', // case
	CASE_LAW: 'case', // case law
	OPIN_AG: 'case', // advocate general's opinion
	OPIN_CASE: 'case', // advocate general's opinion
	VIEW_AG: 'case', // advocate general's opinion
};


function detectWeb(doc, url) {
	const celex = getQueryParam(url, 'uri');
	if (celex && celex.slice(6, 7) === '6') {
		// if celex type is caselaw
		return 'case';
	}


	const eliTypeURI = attr(doc, 'meta[property="eli:type_document"]', 'resource');
	if (eliTypeURI) {
		const eliType = eliTypeURI.split('/').pop();
		const eliCategory = eliType.split('_')[0];
		const type = typeMapping[eliCategory];
		if (type) {
			return type;
		}
		else {
			Z.debug("Unknown eliType: " + eliType);
			return false;
		}
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}

	return false;
}


function getSearchResults(doc, checkOnly) {
	let items = {};
	let found = false;
	const rows = doc.querySelectorAll('a.title');
	for (let i = 0; i < rows.length; i++) {
		const href = rows[i].href;
		const title = ZU.trimInternal(rows[i].textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}


// we need to remember the language in search page to use the same for
// individual entry page
let autoLanguage;


function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		const m = url.match(/\blocale=([a-z][a-z])/);
		if (m) {
			autoLanguage = m[1];
		}
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (!items) {
				return;
			}
			const articles = [];
			for (const i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, scrape);
		});
	}
	else if (detectWeb(doc, url) === "case") {
		scrape(doc, url);
	}
	scrape(doc, url);
}


// this maps language codes from ISO 639-1 to 639-3
const languageMapping = {
	BG: 'bul',
	CS: 'ces',
	DA: 'dan',
	DE: 'deu',
	EL: 'ell',
	EN: 'eng',
	ES: 'spa',
	ET: 'est',
	FI: 'fin',
	FR: 'fra',
	GA: 'gle',
	HR: 'hrv',
	HU: 'hun',
	IT: 'ita',
	LV: 'lav',
	LT: 'lit',
	MT: 'mlt',
	NL: 'nld',
	PL: 'pol',
	PT: 'por',
	RO: 'ron',
	SK: 'slk',
	SL: 'slv',
	SV: 'swe'
};


function scrape(doc, url) {
	const type = detectWeb(doc, url);
	const item = new Zotero.Item(type);

	// determine the language we are currently looking the document at
	let languageUrl = url.split('/')[4];
	if (languageUrl === "AUTO" || typeof languageUrl === `undefined`) {
		languageUrl = autoLanguage || "EN";
	}
	const language = languageMapping[languageUrl] || "eng";

	item.language = languageUrl.toLowerCase();

	if (type === "case") {
		item.title = ZU.xpathText(doc, "//p[@id='translatedTitle']").split('.')[1].trim();
		
		const parsedDate = ZU.xpathText(doc, "//div[@id='PPDates_Contents']/div[1]/dl[1]/dd[1]").split('/');
		item.date = parsedDate[2] + '-' + parsedDate[1] + '-' + parsedDate[0];
		
		item.url = url;
	} else {
		item.title = attr(doc, 'meta[property="eli:title"][lang=' + item.language + ']', 'content');
		
		const uri = attr(doc, '#format_language_table_digital_sign_act_' + languageUrl.toUpperCase(), 'href');
		if (uri) {
			const uriParts = uri.split('/').pop().replace('?uri=', '')
				.split(':');
			// e.g. uriParts =  ["OJ", "L", "1995", "281", "TOC"]
			// e.g. uriParts = ["DD", "03", "061", "TOC", "FI"]
			if (uriParts.length >= 4) {
				if (/\d+/.test(uriParts[1])) {
					item.code = uriParts[0];
					item.codeNumber = uriParts[1] + ', ' + uriParts[2];
				}
				else {
					item.code = uriParts[0] + ' ' + uriParts[1];
					item.codeNumber = uriParts[3];
				}
				if (type == "bill") {
					item.codeVolume = item.code;
					item.code = item.codeNumber;
				}
			}
		}

		item.number = attr(doc, 'meta[property="eli:id_local"]', 'content');
		
		item.date = attr(doc, 'meta[property="eli:date_publication"]', 'content');
		// attr(doc, 'meta[property="eli:date_document"]', 'content');
	
		const passedBy = doc.querySelectorAll('meta[property="eli:passed_by"]');
		let passedByArray = [];
		for (let i = 0; i < passedBy.length; i++) {
			passedByArray.push(passedBy[i].getAttribute('resource').split('/').pop());
		}
		item.legislativeBody = passedByArray.join(', ');
	
		item.url = attr(doc, 'meta[typeOf="eli:LegalResource"]', 'about') + '/' + language;
	
		// eli:is_about -> eurovoc -> tags
	}
	
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:31995L0046",
		"items": [
			{
				"itemType": "bill",
				"title": "Directive 95/46/EC of the European Parliament and of the Council of 24 October 1995 on the protection of individuals with regard to the processing of personal data and on the free movement of such data",
				"creators": [],
				"date": "1995-11-23",
				"billNumber": "31995L0046",
				"code": "281",
				"codeVolume": "OJ L",
				"language": "en",
				"legislativeBody": "EP, CONSIL",
				"url": "http://data.europa.eu/eli/dir/1995/46/oj/eng",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://eur-lex.europa.eu/legal-content/CS/TXT/?uri=CELEX:31995L0046&from=DE",
		"items": [
			{
				"itemType": "bill",
				"title": "Směrnice Evropského parlamentu a Rady 95/46/ES ze dne 24. října 1995 o ochraně fyzických osob v souvislosti se zpracováním osobních údajů a o volném pohybu těchto údajů",
				"creators": [],
				"date": "1995-11-23",
				"billNumber": "31995L0046",
				"code": "13, 015",
				"codeVolume": "DD",
				"language": "cs",
				"legislativeBody": "EP, CONSIL",
				"url": "http://data.europa.eu/eli/dir/1995/46/oj/ces",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:31995L0046",
		"items": [
			{
				"itemType": "bill",
				"title": "Richtlinie 95/46/EG des Europäischen Parlaments und des Rates vom 24. Oktober 1995 zum Schutz natürlicher Personen bei der Verarbeitung personenbezogener Daten und zum freien Datenverkehr",
				"creators": [],
				"date": "1995-11-23",
				"billNumber": "31995L0046",
				"code": "281",
				"codeVolume": "OJ L",
				"language": "de",
				"legislativeBody": "EP, CONSIL",
				"url": "http://data.europa.eu/eli/dir/1995/46/oj/deu",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:31994R2257",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Règlement (CE) n° 2257/94 de la Commission, du 16 septembre 1994, fixant des normes de qualité pour les bananes (Texte présentant de l'intérêt pour l'EEE)",
				"creators": [],
				"dateEnacted": "1994-09-20",
				"code": "OJ L",
				"codeNumber": "245",
				"language": "fr",
				"publicLawNumber": "31994R2257",
				"url": "http://data.europa.eu/eli/reg/1994/2257/oj/fra",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:61962CJ0026",
		"items": [
			{
				"itemType": "case",
				"caseName": "NV Algemene Transport- en Expeditie Onderneming van Gend & Loos v Netherlands Inland Revenue Administration",
				"creators": [],
				"dateDecided": "1963-02-05",
				"language": "en",
				"url": "https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:61962CJ0026",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://eur-lex.europa.eu/search.html?lang=en&text=%22open+access%22&qid=1513887127793&type=quick&scope=EURLEX&locale=nl",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:62018CJ0621",
		"items": [
			{
				"itemType": "case",
				"caseName": "Andy Wightman and Others v Secretary of State for Exiting the European Union",
				"creators": [],
				"dateDecided": "2018-12-10",
				"language": "en",
				"url": "https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:62018CJ0621",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
