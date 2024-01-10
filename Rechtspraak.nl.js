{
	"translatorID": "aede3fda-1894-4dfc-8bca-1c3463f11076",
	"label": "Rechtspraak.nl",
	"creator": "Pieter van der Wees",
	"target": "^https?://(uitspraken\\.rechtspraak|linkeddata\\.overheid)\\.nl/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-01-09 03:25:57"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2021 Pieter van der Wees
	
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

var courtAbbrevs = {
	"hoge raad": "HR",
	"raad van state": "ABRvS",
	"centrale raad van beroep": "CRvB",
	"college van beroep voor het bedrijfsleven": "CBb",
	gerechtshof: "Hof",
	rechtbank: "Rb.",
	"raad van beroep": "RvB",
	"gerecht in eerste aanleg van": "GiEA",
	"gemeenschappelijk hof van justitie": "Gem. Hof",
	"van ": ""
};

// ReplaceAll solution from https://stackoverflow.com/questions/15604140/replace-multiple-strings-with-multiple-other-strings
// All keys should be lowercase.
function replaceAll(str, mapObj) {
	var re = new RegExp(Object.keys(mapObj).join("|"), "gi");

	return str.replace(re, function (matched) {
		return mapObj[matched.toLowerCase()];
	});
}

var esc = ZU.unescapeHTML;


// Custom cleaning function for scraping, adapted from utilities.js
function cleanTags(x) {
	if (x === null) { // account for cases without abstractNote
		return undefined;
	}
	else if (typeof (x) != "string") {
		throw new Error("cleanTags: argument must be a string");
	}
	x = x.replace(/<(\/para|br)[^>]*>/gi, "\n"); // account for abstract newlines
	x = x.replace(/<[^>]+>/g, "");
	return esc(x);
}

function detectWeb(doc, url) {
	if (url.includes('.nl/details') || url.includes('/front/portal/document-viewer')) {
		return "case";
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	else if (url.includes('/resultaat') && doc.querySelector('app-results')) {
		Z.monitorDOMChanges(doc.querySelector('app-results'), { childList: true, subtree: true });
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.rnl-listresults-item-title > a[href*="/details"]');
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(row.textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

async function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (items) {
			await Promise.all(
				Object.keys(items).map(scrape)
			);
		}
	}
	else {
		await scrape(url);
	}
}

async function scrape(url) {
	let apiURL = url.includes('/details')
		? url.replace('/details', '/api/document/')
		: `https://uitspraken.rechtspraak.nl/api/document/?id=${url.match(/ext-id=([^&#]+)/)[1]}`;
	let json = await requestJSON(apiURL);
	let item = new Zotero.Item("case");

	// First, scrape easy properties
	item.title = esc(json.Titel); // no party names, unfortunately
	item.docketNumber = esc(json.Identifier);
	item.dateDecided = ZU.strToISO(json.DatumUitspraak);
	item.extra = "Soort: " + json.Type;
	item.abstractNote = cleanTags(json.InhoudsindicatieTekst);
	item.url = json.DeepLink;
	item.shortTitle = '';

	// Pursuant to most citation styles (including Leidraad voor juridische auteurs), we abbreviate the court names
	var fullCourtName = cleanTags(json.InstantieNaam);
	item.court = replaceAll(fullCourtName, courtAbbrevs);

	// Because we do not know which reporter the user wants to cite, add them all to abstractNote
	item.abstractNote = item.abstractNote.concat("\nVindplaatsen: ", cleanTags(json.Vindplaatsen.join('\n')));

	// References go in the History field
	item.history = json.FormeleRelatie.map(fr => fr.Tekst).join('; ');

	// Add fields of law as tags
	for (let { Naam } of json.Rechtsgebieden) {
		for (let tag of Naam.split('; ')) {
			item.tags.push({ tag });
		}
	}

	// Attachments
	item.attachments = [{
		url: 'https://uitspraken.rechtspraak.nl/api/pdfdownload/' + item.docketNumber.replace(/:/g, '_'),
		title: "Full Text PDF",
		mimeType: "application/pdf",
	}];

	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://uitspraken.rechtspraak.nl/details?id=ECLI:NL:GHDHA:2018:2591",
		"items": [
			{
				"itemType": "case",
				"caseName": "ECLI:NL:GHDHA:2018:2591, Gerechtshof Den Haag, 200.178.245/01",
				"creators": [],
				"dateDecided": "2018-10-09",
				"abstractNote": "Klimaatzaak Urgenda. Onrechtmatige daad. Schending zorgplicht ex artikelen 2 en 8 EVRM. Staat moet broeikasgassen nu verder terugdringen. Vonnis bekrachtigd\nVindplaatsen: Rechtspraak.nl\nJM 2018/128 met annotatie van W.Th. Douma\nAB 2018/417 met annotatie van G.A. van der Veen, Ch.W. Backes\nO&A 2018/66\nO&A 2018/51 met annotatie van G.A. van der Veen, T.G. Oztürk\nSEW 2019, afl. 1, p. 35\nJB 2019/10 met annotatie van Sanderink, D.G.J.\nOGR-Updates.nl 2018-0234\nPS-Updates.nl 2018-0814\nJOM 2018/1182\nJOM 2018/1154\nJA 2019/37\nJIN 2019/78 met annotatie van Sanderink, D.G.J.",
				"court": "Hof Den Haag",
				"docketNumber": "ECLI:NL:GHDHA:2018:2591",
				"extra": "Soort: Uitspraak",
				"history": "Eerste aanleg: ECLI:NL:RBDHA:2015:7145, Bekrachtiging/bevestiging; Cassatie: ECLI:NL:HR:2019:2006, Bekrachtiging/bevestiging",
				"url": "https://deeplink.rechtspraak.nl/uitspraak?id=ECLI:NL:GHDHA:2018:2591",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Civiel recht"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://uitspraken.rechtspraak.nl/details?id=ECLI:NL:PHR:2019:1016",
		"items": [
			{
				"itemType": "case",
				"caseName": "ECLI:NL:PHR:2019:1016, Parket bij de Hoge Raad, 18/01333",
				"creators": [],
				"dateDecided": "2019-10-08",
				"abstractNote": "Conclusie P-G: Bedreiging. Voldoende bepaald vreesobject. Conclusie strekt tot verwerping.\nVindplaatsen: Rechtspraak.nl",
				"court": "Parket bij de HR",
				"docketNumber": "ECLI:NL:PHR:2019:1016",
				"extra": "Soort: Conclusie",
				"history": "Arrest Hoge Raad: ECLI:NL:HR:2020:44",
				"url": "https://deeplink.rechtspraak.nl/uitspraak?id=ECLI:NL:PHR:2019:1016",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Strafrecht"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://uitspraken.rechtspraak.nl/details?id=ECLI:NL:ORBAACM:2020:30&showbutton=true",
		"items": [
			{
				"itemType": "case",
				"caseName": "ECLI:NL:ORBAACM:2020:30, Raad van Beroep in Ambtenarenzaken van Aruba, Curaçao, Sint Maarten en van Bonaire, Sint Eustatius en Saba, CUR2019H00160",
				"creators": [],
				"dateDecided": "2020-12-16",
				"abstractNote": "Ontslag wegens strafrechtelijke veroordeling. Geen procesbelang bij het opschuiven van de datum van ontslag. Bevestiging aangevallen uitspraak.\nVindplaatsen: Rechtspraak.nl",
				"court": "RvB in Ambtenarenzaken Aruba, Curaçao, Sint Maarten en Bonaire, Sint Eustatius en Saba",
				"docketNumber": "ECLI:NL:ORBAACM:2020:30",
				"extra": "Soort: Uitspraak",
				"url": "https://deeplink.rechtspraak.nl/uitspraak?id=ECLI:NL:ORBAACM:2020:30",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Ambtenarenrecht"
					},
					{
						"tag": "Bestuursrecht"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://uitspraken.rechtspraak.nl/resultaat?zoekterm=test&inhoudsindicatie=zt0&publicatiestatus=ps1&sort=Relevance",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://linkeddata.overheid.nl/front/portal/document-viewer?ext-id=ECLI:NL:OGEAA:2015:150",
		"items": [
			{
				"itemType": "case",
				"caseName": "ECLI:NL:OGEAA:2015:150, Gerecht in Eerste Aanleg van Aruba, A.R. no. 3385 van 2012",
				"creators": [],
				"dateDecided": "2015-07-01",
				"abstractNote": "civiel recht\nVindplaatsen: Rechtspraak.nl",
				"court": "GiEA Aruba",
				"docketNumber": "ECLI:NL:OGEAA:2015:150",
				"extra": "Soort: Uitspraak",
				"url": "https://deeplink.rechtspraak.nl/uitspraak?id=ECLI:NL:OGEAA:2015:150",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Civiel recht"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
