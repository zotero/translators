{
	"translatorID": "a2d2e629-f6a3-4740-a999-a89f36e0c3d1",
	"label": "Officiele Bekendmakingen",
	"creator": "Ewout ter Hoeven",
	"target": "^https?://zoek\\.officielebekendmakingen\\.nl/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-11-09 14:12:01"
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
// Abbreviations as used in the Leidraad voor juridische auteurs, e.g. "Stb. 2020, 123"
const GAZETTES = {
	stb: 'Stb.',
	stcrt: 'Stcrt.',
	trb: 'Trb.',
	gmb: 'Gmb.',
	prb: 'Prb.',
	wsb: 'Wsb.',
	bgr: 'Bgr.'
};

// Parliamentary papers, cited as e.g. "Kamerstukken II 2025/26, 21501-33, nr. 1248"
const PARLIAMENTARY = {
	kst: 'Kamerstukken',
	h: 'Handelingen',
	ah: 'Aanhangsel Handelingen',
	kv: 'Kamervragen'
};

function detectWeb(doc, url) {
	let id = getMeta(doc, 'DC.identifier');
	if (id) {
		return getType(id.split('-')[0]);
	}
	if (url.includes('/resultaten') && getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

function getType(prefix) {
	if (PARLIAMENTARY[prefix]) return 'bill';
	if (GAZETTES[prefix]) return 'statute';
	if (prefix == 'blg') return 'report';
	return 'document';
}

function getSearchResults(doc, checkOnly) {
	let items = {};
	let found = false;
	let rows = doc.querySelectorAll('li > h2.result--title > a[href]');
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(row.closest('li').querySelector('.result--subtitle')?.textContent || row.textContent);
		if (!href || !title) continue;
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

function getMeta(doc, name) {
	return getMetas(doc, name)[0] || '';
}

function getMetas(doc, name) {
	return Array.from(doc.querySelectorAll(`meta[name="${name}"]`), m => m.content.trim()).filter(Boolean);
}

// "2019-2020" -> "2019/20"
function formatSession(vergaderjaar) {
	let m = vergaderjaar.match(/^(\d{4})-\d{2}(\d{2})$/);
	return m ? `${m[1]}/${m[2]}` : vergaderjaar;
}

// "I" for the Eerste Kamer, "II" for the Tweede Kamer
function getChamber(body) {
	if (/Eerste Kamer/i.test(body)) return 'I';
	if (/Tweede Kamer/i.test(body)) return 'II';
	return '';
}

// Dutch names come as initials + surname, with the particle belonging to the surname: "R. van der Berg"
function parseName(name, creatorType) {
	let m = name.match(/^((?:[A-Z][a-z]{0,2}\.\s*)+)(.+)$/);
	if (m) return { firstName: m[1].trim(), lastName: m[2].trim(), creatorType };
	return ZU.cleanAuthor(name, creatorType);
}

async function scrape(doc) {
	let id = getMeta(doc, 'DC.identifier');
	let prefix = id.split('-')[0];
	let item = new Zotero.Item(getType(prefix));

	let body = getMeta(doc, 'DC.creator');
	let chamber = getChamber(body);
	let session = formatSession(getMeta(doc, 'OVERHEIDop.vergaderjaar'));
	let issue = getMeta(doc, 'OVERHEIDop.publicationIssue');

	item.title = getMeta(doc, 'DC.title');
	item.date = getMeta(doc, 'DCTERMS.issued') || getMeta(doc, 'DCTERMS.available');

	if (item.itemType == 'bill') {
		item.code = ZU.trimInternal(`${PARLIAMENTARY[prefix]} ${chamber}`);
		item.session = session;
		item.legislativeBody = body;
		// DC.title prefixes the dossier title and document type; styles like APA cite by short title
		let docTitle = getMeta(doc, 'OVERHEIDop.documenttitel');
		if (docTitle && docTitle != item.title) item.shortTitle = docTitle;
		if (prefix == 'kst') {
			let dossier = getMeta(doc, 'OVERHEIDop.dossiernummer');
			let nr = getMeta(doc, 'OVERHEIDop.ondernummer');
			item.billNumber = nr ? `${dossier}, nr. ${nr}` : dossier;
		}
		else if (prefix == 'h') {
			let handelingenItem = getMeta(doc, 'OVERHEIDop.handelingenItemNummer');
			item.billNumber = `nr. ${issue}` + (handelingenItem ? `, item ${handelingenItem}` : '');
			item.date = getMeta(doc, 'OVERHEIDop.datumVergadering') || item.date;
		}
		else if (prefix == 'ah') {
			item.billNumber = `nr. ${getMeta(doc, 'OVERHEIDop.aanhangselNummer')}`;
		}
		else {
			item.billNumber = getMeta(doc, 'OVERHEIDop.vraagnummer');
		}
		for (let name of getMetas(doc, 'OVERHEIDop.indiener')) {
			item.creators.push(parseName(name, 'sponsor'));
		}
	}
	else if (item.itemType == 'statute') {
		item.nameOfAct = item.title;
		item.code = GAZETTES[prefix];
		item.codeNumber = getMeta(doc, 'OVERHEIDop.jaargang');
		item.publicLawNumber = issue;
		item.date = getMeta(doc, 'OVERHEIDop.datumOndertekening')
			|| getMeta(doc, 'OVERHEIDop.datumTotstandkoming')
			|| item.date;
		// In the Staatsblad, this is the act's citation title (citeertitel)
		if (prefix == 'stb') {
			item.shortTitle = getMeta(doc, 'DCTERMS.alternative');
		}
	}
	else if (item.itemType == 'report') {
		item.institution = body;
		let dossier = getMeta(doc, 'OVERHEIDop.dossiernummer');
		let nr = getMeta(doc, 'OVERHEIDop.ondernummer');
		item.reportType = 'Bijlage';
		if (dossier && nr) {
			item.reportType = ZU.trimInternal(`Bijlage bij Kamerstukken ${chamber} ${session}, ${dossier}, nr. ${nr}`);
		}
	}
	else {
		item.publisher = body;
	}

	for (let category of getMetas(doc, 'OVERHEID.category')) {
		for (let tag of category.split('|')) {
			tag = tag.trim();
			if (tag && !item.tags.some(t => t.tag == tag)) item.tags.push({ tag });
		}
	}

	item.language = getMeta(doc, 'DCTERMS.language') || 'nl';
	item.url = `https://zoek.officielebekendmakingen.nl/${id}`;
	item.attachments.push({
		url: `https://zoek.officielebekendmakingen.nl/${id}.pdf`,
		title: 'Full Text PDF',
		mimeType: 'application/pdf'
	});
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://zoek.officielebekendmakingen.nl/kst-21501-33-1248.html",
		"items": [
			{
				"itemType": "bill",
				"title": "Raad voor Vervoer, Telecommunicatie en Energie; Verslag van een schriftelijk overleg; Verslag van schriftelijk overleg over o.a. de geannoteerde agenda informele bijeenkomst van EU-transportministers van 20-21 september 2026 in Dublin, Ierland (Kamerstuk 21501-33-1239)",
				"creators": [
					{
						"firstName": "V.P.G.",
						"lastName": "Karremans",
						"creatorType": "sponsor"
					},
					{
						"firstName": "A.W.H.",
						"lastName": "Bertram",
						"creatorType": "sponsor"
					}
				],
				"date": "2026-09-14",
				"billNumber": "21501-33, nr. 1248",
				"code": "Kamerstukken II",
				"language": "nl",
				"legislativeBody": "Tweede Kamer der Staten-Generaal",
				"session": "2025/26",
				"shortTitle": "Verslag van schriftelijk overleg over o.a. de geannoteerde agenda informele bijeenkomst van EU-transportministers van 20-21 september 2026 in Dublin, Ierland (Kamerstuk 21501-33-1239)",
				"url": "https://zoek.officielebekendmakingen.nl/kst-21501-33-1248",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Economie"
					},
					{
						"tag": "Energie"
					},
					{
						"tag": "Europese zaken"
					},
					{
						"tag": "ICT"
					},
					{
						"tag": "Internationaal"
					},
					{
						"tag": "Natuur en milieu"
					},
					{
						"tag": "Organisatie en beleid"
					},
					{
						"tag": "Verkeer"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://zoek.officielebekendmakingen.nl/stb-2020-123.html",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Wet van 22 april 2020, houdende tijdelijke regels omtrent het kunnen verlengen van huurovereenkomsten voor bepaalde tijd (Tijdelijke wet verlenging tijdelijke huurovereenkomsten)",
				"creators": [],
				"dateEnacted": "2020-04-22",
				"code": "Stb.",
				"codeNumber": "2020",
				"language": "nl",
				"publicLawNumber": "123",
				"shortTitle": "Tijdelijke wet verlenging tijdelijke huurovereenkomsten",
				"url": "https://zoek.officielebekendmakingen.nl/stb-2020-123",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Huisvesting"
					},
					{
						"tag": "Huren en verhuren"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://zoek.officielebekendmakingen.nl/h-tk-20192020-42-7.html",
		"items": [
			{
				"itemType": "bill",
				"title": "Mededelingen",
				"creators": [],
				"date": "2020-01-16",
				"billNumber": "nr. 42, item 7",
				"code": "Handelingen II",
				"language": "nl",
				"legislativeBody": "Tweede Kamer der Staten-Generaal",
				"session": "2019/20",
				"url": "https://zoek.officielebekendmakingen.nl/h-tk-20192020-42-7",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Bestuur"
					},
					{
						"tag": "Parlement"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://zoek.officielebekendmakingen.nl/ah-tk-20192020-1234.html",
		"items": [
			{
				"itemType": "bill",
				"title": "Uitstel beantwoording vragen van de leden Beckerman en Futselaar over het bericht dat de overheid nog steeds miljarden aan investeringen in de fossiele industrie dekt",
				"creators": [
					{
						"firstName": "S.M.",
						"lastName": "Beckerman",
						"creatorType": "sponsor"
					},
					{
						"firstName": "F.W.",
						"lastName": "Futselaar",
						"creatorType": "sponsor"
					}
				],
				"date": "2019-12-23",
				"billNumber": "nr. 1234",
				"code": "Aanhangsel Handelingen II",
				"language": "nl",
				"legislativeBody": "Tweede Kamer der Staten-Generaal",
				"session": "2019/20",
				"url": "https://zoek.officielebekendmakingen.nl/ah-tk-20192020-1234",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Energie"
					},
					{
						"tag": "Natuur en milieu"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://zoek.officielebekendmakingen.nl/trb-2020-12.html",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Internationaal Verdrag voor de controle en het beheer van ballastwater en sedimenten van schepen, 2004 (met Bijlage, Aanhangsels en Resoluties); Londen, 13 februari 2004",
				"creators": [],
				"dateEnacted": "2004-02-13",
				"code": "Trb.",
				"codeNumber": "2020",
				"language": "nl",
				"publicLawNumber": "12",
				"url": "https://zoek.officielebekendmakingen.nl/trb-2020-12",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Internationaal"
					},
					{
						"tag": "Internationale samenwerking"
					},
					{
						"tag": "Milieu"
					},
					{
						"tag": "Scheepvaart"
					},
					{
						"tag": "Verkeer"
					},
					{
						"tag": "Water"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://zoek.officielebekendmakingen.nl/gmb-2020-1234.html",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Verleende omgevingsvergunning Verlengde Engweg 3, 1251 CM, het vellen van 1 boom",
				"creators": [],
				"dateEnacted": "2020-01-03",
				"code": "Gmb.",
				"codeNumber": "2020",
				"language": "nl",
				"publicLawNumber": "1234",
				"url": "https://zoek.officielebekendmakingen.nl/gmb-2020-1234",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Bestuur"
					},
					{
						"tag": "Organisatie en beleid"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://zoek.officielebekendmakingen.nl/blg-1270849",
		"items": [
			{
				"itemType": "report",
				"title": "Beslisnota bij verslag van schriftelijk overleg over o.a. de geannoteerde agenda informele bijeenkomst van EU-transportministers van 20-21 september 2026 in Dublin, Ierland (Kamerstuk 21501-33-1239)",
				"creators": [],
				"date": "2026-09-28",
				"institution": "Tweede Kamer der Staten-Generaal",
				"language": "nl",
				"libraryCatalog": "Officiele Bekendmakingen",
				"reportType": "Bijlage bij Kamerstukken II 2025/26, 21501-33, nr. 1248",
				"url": "https://zoek.officielebekendmakingen.nl/blg-1270849",
				"attachments": [
					{
						"title": "Full Text PDF",
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
		"url": "https://zoek.officielebekendmakingen.nl/resultaten?q=(c.product-area==%22officielepublicaties%22)and(cql.textAndIndexes=%22ballastwater%22)&zv=ballastwater",
		"items": "multiple"
	}
]
/** END TEST CASES **/
