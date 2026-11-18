{
	"translatorID": "6198023c-cab9-47eb-866f-1d7adffc0d0e",
	"label": "Overheid.nl Regelgeving",
	"creator": "Ewout ter Hoeven",
	"target": "^https?://(wetten|lokaleregelgeving)\\.overheid\\.nl/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-11-09 14:09:04"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2026 Ewout ter Hoeven

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

// Covers national legislation (wetten.overheid.nl, BWB) and local regulations
// (lokaleregelgeving.overheid.nl, CVDR). Both sites embed only basic dcterms tags.

// Gazette abbreviations as used in the Leidraad voor juridische auteurs, e.g. "Gmb. 2026, 460678"
const GAZETTES = {
	gmb: 'Gmb.',
	prb: 'Prb.',
	wsb: 'Wsb.',
	bgr: 'Bgr.',
	stcrt: 'Stcrt.',
	stb: 'Stb.'
};

const MONTHS = 'januari februari maart april mei juni juli augustus september oktober november december'.split(' ');

function detectWeb(doc, url) {
	if (/\/(BWB[RV]|CVDR)\d+/.test(url) && getMeta(doc, 'identifier')) {
		return 'statute';
	}
	if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	let items = {};
	let found = false;
	// wetten.overheid.nl: a.result--title; lokaleregelgeving: h2.result--title > a
	let rows = doc.querySelectorAll('a.result--title[href], .result--title > a[href]');
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(row.textContent);
		if (!href || !title || !/\/(BWB[RV]|CVDR)\d+/.test(href)) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

async function doWeb(doc, url) {
	if (detectWeb(doc, url) == 'multiple') {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (!items) return;
		for (let url of Object.keys(items)) {
			await scrape(await requestDocument(url));
		}
	}
	else {
		await scrape(doc);
	}
}

// wetten.overheid.nl uses "dcterms:title", lokaleregelgeving "DCTERMS.title"
function getMeta(doc, name) {
	let meta = doc.querySelector(`meta[name="dcterms:${name}"], meta[name="DCTERMS.${name}"]`);
	return meta ? meta.content.trim() : '';
}

// "Wet van 3 maart 1881, houdende ..." -> "1881-03-03"
function parseDutchDate(text) {
	let m = text.match(/\b(\d{1,2})\s+(januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december)\s+(\d{4})\b/i);
	if (!m) return '';
	let month = MONTHS.indexOf(m[2].toLowerCase()) + 1;
	return `${m[3]}-${String(month).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

// "24-09-2026" -> "2026-09-24"
function parseNumericDate(text) {
	let m = text.match(/\b(\d{2})-(\d{2})-(\d{4})\b/);
	return m ? `${m[3]}-${m[2]}-${m[1]}` : '';
}

async function scrape(doc, url = doc.location.href) {
	let item = new Zotero.Item('statute');
	item.nameOfAct = getMeta(doc, 'title');
	item.language = 'nl';

	if (/\/CVDR\d+/.test(url)) {
		await scrapeLocal(doc, item, url);
	}
	else {
		scrapeNational(doc, item);
	}

	item.url = doc.querySelector('link[rel="canonical"]')?.href || url.replace(/[?#].*/, '');
	item.attachments.push({ document: doc, title: 'Snapshot' });
	item.complete();
}

function scrapeNational(doc, item) {
	// Laws and decrees: the original title starts with the signing date, e.g.
	// "Besluit van 25 maart 2010, houdende ...". Treaties have the signing place
	// and date in the heading: "Verdrag ..., Rome, 04-11-1950".
	let opschrift = text(doc, '#Opschrift');
	if (opschrift) {
		item.date = parseDutchDate(opschrift);
	}
	else if (getMeta(doc, 'type') == 'verdrag') {
		item.date = parseNumericDate(text(doc, '#regeling > h1'));
	}
}

async function scrapeLocal(doc, item, url) {
	// The technical info (signing date, issuing body, publication) is on a separate view
	let wtiURL = url.replace(/[?#].*/, '') + '?show-wti=true';
	let wti = await requestDocument(wtiURL);
	let info = {};
	for (let row of wti.querySelectorAll('#wti-table tr')) {
		info[text(row, 'th')] = text(row, 'td');
	}

	let org = info.Overheidsorganisatie || getMeta(doc, 'creator');
	let orgType = info.Organisatietype;
	if (org) {
		// "Leusden" + "Gemeente" -> "Gemeente Leusden"
		if (orgType && !org.toLowerCase().includes(orgType.toLowerCase())) {
			org = `${orgType} ${org}`;
		}
		item.creators.push({ lastName: org, creatorType: 'author', fieldMode: 1 });
	}
	if (info.Citeertitel && info.Citeertitel != item.nameOfAct) {
		item.shortTitle = info.Citeertitel;
	}
	if (info.Onderwerp) {
		item.tags.push({ tag: info.Onderwerp });
	}

	// The row for the version being viewed: signing date and publication, e.g. "gmb-2026-460678"
	let current = wti.querySelector('#wti-wijzigingen-table tr.current');
	if (current) {
		let cells = current.querySelectorAll('td');
		let source = cells[4];
		if (source) {
			item.date = parseNumericDate(source.textContent);
			let pub = ZU.trimInternal(source.querySelectorAll('p')[1]?.textContent || '');
			let m = pub.match(/^([a-z]+)-(\d{4})-(\d+)$/);
			if (m && GAZETTES[m[1]]) {
				item.code = GAZETTES[m[1]];
				item.codeNumber = m[2];
				item.publicLawNumber = m[3];
			}
			else if (pub) {
				// Before 2014, e.g. "Gemeenteblad 2011-19a": a local gazette, keep as is
				item.history = pub;
			}
		}
	}
	if (!item.date) {
		item.date = getMeta(doc, 'issued');
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://wetten.overheid.nl/BWBR0001854/2024-01-01",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Wetboek van Strafrecht",
				"creators": [],
				"dateEnacted": "1881-03-03",
				"language": "nl",
				"url": "https://wetten.overheid.nl/BWBR0001854/2024-01-01/0",
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
		"url": "https://wetten.overheid.nl/BWBR0027471/2023-07-01",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Regeling omgevingsrecht",
				"creators": [],
				"dateEnacted": "2010-03-30",
				"language": "nl",
				"url": "https://wetten.overheid.nl/BWBR0027471/2023-07-01/0",
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
		"url": "https://wetten.overheid.nl/BWBV0001000/2021-08-01",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Verdrag tot bescherming van de rechten van de mens en de fundamentele vrijheden",
				"creators": [],
				"dateEnacted": "1950-11-04",
				"language": "nl",
				"url": "https://wetten.overheid.nl/BWBV0001000/2021-08-01/0",
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
		"url": "https://lokaleregelgeving.overheid.nl/CVDR767240/1",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Afvalstoffenverordening gemeente Leusden 2026",
				"creators": [
					{
						"lastName": "Gemeente Leusden",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"dateEnacted": "2026-09-24",
				"code": "Gmb.",
				"codeNumber": "2026",
				"language": "nl",
				"publicLawNumber": "460678",
				"url": "https://lokaleregelgeving.overheid.nl/CVDR767240/1",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "milieu"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://lokaleregelgeving.overheid.nl/CVDR100000/1",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Reglement Regionale Urgentiecommissie Huisvesting Westfriesland 2011",
				"creators": [
					{
						"lastName": "Gemeente Hoorn",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"dateEnacted": "2011-04-12",
				"history": "Gemeenteblad 2011-19a",
				"language": "nl",
				"url": "https://lokaleregelgeving.overheid.nl/CVDR100000/1",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "volkshuisvesting en woningbouw"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://wetten.overheid.nl/zoeken/zoekresultaat/rs/2,3,4/titel/strafrecht/titelf/1/tekstf/1/d/09-11-2026/dx/0",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://lokaleregelgeving.overheid.nl/ZoekResultaat?titel=afvalstoffenverordening",
		"items": "multiple"
	}
]
/** END TEST CASES **/
