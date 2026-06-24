{
	"translatorID": "41aab426-640f-4768-a6ce-3a26ad923069",
	"label": "lexfind Swiss Laws",
	"creator": "Hans-Peter Oeri",
	"target": "^https://www\\.lexfind\\.ch/fe/(de|fr|it)/(tol|search)/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-11-23 19:58:31"
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

const baseURL = {
	regex: "^https://www\\.lexfind\\.ch/fe/(de|fr|it)/(tol|search)/",
	lang: 1,
	type: 2
};

const numberLabel = {
	CH: {
		de: "SR ",
		fr: "RS ",
		it: "RS "
	},
	ZH: "LS ",
	BE: "BSG ",
	LU: "SRL ",
	UR: "RB ",
	SZ: "SRSZ ",
	OW: "GDB ",
	NW: "NG ",
	GL: "GS ",
	ZG: "BGS ",
	FR: {
		de: "SGF ",
		fr: "RSF ",
	},
	SO: "BGS ",
	BS: "SG ",
	BL: "SGS ",
	SH: "SHR ",
	AR: "bGS ",
	AI: "GS ",
	SG: "sGS ",
	GR: {
		de: "BR ",
		it: "CSC ",
		rm: "DG ",
	},
	AG: "AGS ",
	TG: "RB ",
	TI: "CAN ",
	VD: {
		de: "SGS ",
		fr: "RS ",
	},
	VS: {
		de: "SGS ",
		fr: "RS "
	},
	NE: "RSN ",
	GE: "rs/GE ",
	JU: "RSJU "
};

/**
 * get the abbreviation of the systematic statute compilation by jurisdiction
 *
 * @param {string} jurisdiction
 * @param {string} language
 * @returns {string}
 */
function getNumberPrefix(jurisdiction, language) {
	Z.debug( [ jurisdiction, language]);
	let abbreviation = numberLabel[jurisdiction];
	if (typeof abbreviation === "string") {
		return abbreviation;
	}
	if (abbreviation[language] !== undefined) {
		return abbreviation[language];
	}
	return abbreviation.de;
}

function getSearchResults(doc) {
	let res = {};
	let rows = doc.querySelectorAll('ul.list-group > li');
	for (let row of rows) {
		let jurisdiction = attr(row, "img.entity-image", "alt");
		let linker = row.querySelector(".title > a");
		res[linker.href] = jurisdiction + " - " + ZU.cleanTags(linker.innerHTML);
	}
	return res;
}

function scrape(doc, url) {
	let item = new Zotero.Item("statute");

	let titleLine = text(doc, "h1.small-title", 0).split(" – ", 2);
	let subtitleLine = text(doc, "app-page-header + div:first-of-type span.keywords", 0);
	let shortTitle;
	let abbreviation;
	if (subtitleLine) {
		let parts = subtitleLine.match(/^\(([^,)]+)(?:[,;] ([^)]+))*\)/);
		shortTitle = parts[1];
		abbreviation = parts[2];
		if (shortTitle.length < 12 && abbreviation === undefined) {
			abbreviation = shortTitle;
			shortTitle = undefined;
		}
	}
	let jurisdiction = attr(doc, "img.entity-image", "alt");
	item.title = titleLine[1];
	item.shortTitle = shortTitle;
	// identify UI language
	// NB: the text language defaults to UI language but may differ (ul.nav > li > span.active)
	item.language = url.match(baseURL.regex)[baseURL.lang]
	item.code = (jurisdiction === "CH" ? "" : jurisdiction);
	item.codeNumber = abbreviation;
	item.number = getNumberPrefix(jurisdiction, item.language) + titleLine[0];
	item.date = doc.querySelector("input#versionSelector").value.split(/\s+|,\s*/)[1].split('.').reverse().join('-');
	item.url = url;

	item.attachments.push({
		title: "Official Link",
		url: doc.querySelector("div.links > a").href,
		snapshot: false
	});
	item.attachments.push({
		title: "Official PDF",
		mimeType: "application/pdf",
		url: doc.querySelector("div.links > div.btn-group:first-of-type > a.btn:first-of-type").href
	});

	item.complete();
}

function detectWeb(doc, url) {
	let parts = url.match(baseURL.regex);
	return (parts[baseURL.type] === "search") ? "multiple" : "statute";
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) === "multiple") {
		Zotero.selectItems(getSearchResults(doc), function (items) {
			if (items) ZU.processDocuments(Object.keys(items), scrape);
		});
	}
	else {
		scrape(doc, url);
	}
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.lexfind.ch/fe/de/tol/24719/versions/209621/de",
		"defer": true,
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Schweizerische Strafprozessordnung",
				"creators": [],
				"dateEnacted": "2021-07-01",
				"codeNumber": "StPO",
				"language": "de",
				"publicLawNumber": "SR 312.0",
				"shortTitle": "Strafprozessordnung",
				"url": "https://www.lexfind.ch/fe/de/tol/24719/versions/209621/de",
				"attachments": [
					{
						"title": "Official Link",
						"snapshot": false
					},
					{
						"title": "Official PDF",
						"mimeType": "application/pdf"
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
		"url": "https://www.lexfind.ch/fe/fr/tol/24719/versions/209621/fr",
		"defer": true,
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Code de procédure pénale suisse",
				"creators": [],
				"dateEnacted": "2021-07-01",
				"codeNumber": "CPP",
				"language": "fr",
				"publicLawNumber": "RS 312.0",
				"shortTitle": "Code de procédure pénale",
				"url": "https://www.lexfind.ch/fe/fr/tol/24719/versions/209621/fr",
				"attachments": [
					{
						"title": "Official Link",
						"snapshot": false
					},
					{
						"title": "Official PDF",
						"mimeType": "application/pdf"
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
		"url": "https://www.lexfind.ch/fe/it/tol/24719/versions/209621/it",
		"defer": true,
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Codice di diritto processuale penale svizzero",
				"creators": [],
				"dateEnacted": "2021-07-01",
				"codeNumber": "CPP",
				"language": "it",
				"publicLawNumber": "RS 312.0",
				"shortTitle": "Codice di procedura penale",
				"url": "https://www.lexfind.ch/fe/it/tol/24719/versions/209621/it",
				"attachments": [
					{
						"title": "Official Link",
						"snapshot": false
					},
					{
						"title": "Official PDF",
						"mimeType": "application/pdf"
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
		"url": "https://www.lexfind.ch/fe/de/tol/33636/versions/210169/de",
		"defer": true,
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Regierungsbeschluss über den Beitritt zur Interkantonalen Universitätsvereinbarung aus dem Jahr 2019",
				"creators": [],
				"dateEnacted": "2021-04-13",
				"code": "SG",
				"language": "de",
				"publicLawNumber": "sGS 217.80",
				"url": "https://www.lexfind.ch/fe/de/tol/33636/versions/210169/de",
				"attachments": [
					{
						"title": "Official Link",
						"snapshot": false
					},
					{
						"title": "Official PDF",
						"mimeType": "application/pdf"
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
