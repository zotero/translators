{
	"translatorID": "429936dd-ad60-4e23-b346-569c85d17e0b",
	"label": "KiM",
	"creator": "Ewout ter Hoeven",
	"target": "^https?://[^/]*kimnet\\.nl/document",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-07-15 13:55:27"
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


function detectWeb(doc, url) {
	// Match both Dutch and English sites
	// Individual document pages have date pattern: /YYYY/MM/DD/
	if (/\/(documenten|documents)\/\d{4}\/\d{2}\/\d{2}\//.test(url)) {
		return 'report';
	}
	// Listing pages
	else if (/(documenten|documents)/.test(url) && getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	// Documents are listed in cards with links
	// Works for both /documenten and /documents
	var rows = doc.querySelectorAll('a.card[href*="/document"]');
	for (let row of rows) {
		let href = row.href;
		// Title is in the heading within the card
		let title = text(row, 'h2, h3');
		if (!href || !title) continue;
		// Only include individual document pages with date pattern
		if (!/\/\d{4}\/\d{2}\/\d{2}\//.test(href)) continue;
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
		await scrape(doc, url);
	}
}

async function scrape(doc, url = doc.location.href) {
	var item = new Zotero.Item('report');

	// Detect language from URL for proper institution name
	var isEnglish = url.includes('english.kimnet.nl');

	// Parse #elastic-content (title, author, date)
	let elastic = {};
	let elasticEl = doc.querySelector('#elastic-content');
	if (elasticEl) {
		try {
			elastic = JSON.parse(elasticEl.textContent);
		}
		catch (e) {
			Zotero.debug('Failed to parse elastic-content: ' + e);
		}
	}

	// Parse JSON-LD, selecting the WebPage node specifically
	// (the page contains multiple ld+json blocks in unspecified order)
	let webPage = {};
	for (let script of doc.querySelectorAll('script[type="application/ld+json"]')) {
		try {
			let data = JSON.parse(script.textContent);
			let graph = data['@graph'] || [data];
			let page = graph.find(n => n['@type'] === 'WebPage');
			if (page) {
				webPage = page;
				break;
			}
		}
		catch (e) {
			Zotero.debug('Failed to parse JSON-LD: ' + e);
		}
	}

	// Title: prefer JSON-LD, fall back to elastic, then to page heading
	item.title = webPage.name || elastic.pageTitle || text(doc, 'h1.nav-bar__page-title');

	// Date: prefer datePublished, fall back to publicationDate; keep date only
	let rawDate = webPage.datePublished || elastic.publicationDate;
	if (rawDate) {
		item.date = ZU.strToISO(rawDate);
	}

	// Abstract from the intro section
	item.abstractNote = text(doc, '.intro .rich-text');

	// URL
	item.url = url;

	// Institution (English or Dutch version)
	if (isEnglish) {
		item.institution = 'Netherlands Institute for Transport Policy Analysis';
	}
	else {
		item.institution = 'Kennisinstituut voor Mobiliteitsbeleid';
	}
	item.place = 'Den Haag';

	// Language
	item.language = webPage.inLanguage || doc.documentElement.lang || (isEnglish ? 'en' : 'nl');

	// Authors from elastic-content (English pages have this; Dutch typically don't)
	// Assumes "Firstname Lastname, Firstname Lastname" — a comma separates
	// distinct authors, NOT a single "Lastname, Firstname" entry.
	if (elastic.author) {
		for (let name of elastic.author.split(',')) {
			name = name.trim();
			if (name) {
				item.creators.push(ZU.cleanAuthor(name, 'author', false));
			}
		}
	}

	// PDF attachments from the download list
	var downloads = doc.querySelectorAll('.download-list__item');
	for (let download of downloads) {
		let pdfLink = download.querySelector('a[href$=".pdf"]');
		if (pdfLink) {
			let pdfTitle = text(download, '.title');
			item.attachments.push({
				url: pdfLink.href,
				title: pdfTitle || 'Full Text PDF',
				mimeType: 'application/pdf'
			});
		}
	}

	// Add snapshot
	item.attachments.push({
		title: 'Snapshot',
		document: doc
	});

	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.kimnet.nl/documenten/2025/12/18/nieuwe-vormen-van-autobeschikbaarheid",
		"items": [
			{
				"itemType": "report",
				"title": "Nieuwe vormen van autobeschikbaarheid",
				"creators": [
					{
						"firstName": "Jan-Jelle",
						"lastName": "Witte",
						"creatorType": "author"
					},
					{
						"firstName": "Amelia",
						"lastName": "Huang",
						"creatorType": "author"
					}
				],
				"date": "2025-12-18",
				"abstractNote": "Van de Nederlanders heeft 4,5% minstens 1 private leaseauto in het huishouden, terwijl autoabonnementen met een aandeel van 0,1% nog zeldzaam zijn. Zo blijkt uit het onderzoek 'Nieuwe vormen van autobeschikbaarheid' van het Kennisinstituut voor Mobiliteitsbeleid (KiM). Bij private lease gaat het opvallend vaak om mensen ouder dan 65 jaar, wonend in stedelijk gebied, meerpersoonshuishoudens en werkenden. 60% van de mensen die privé in een leaseauto rijdt, heeft geen andere soort auto in het huishouden, terwijl 31% het combineert met een privéauto en 9% met een zakelijke leaseauto of andere auto van de werkgever.",
				"institution": "Kennisinstituut voor Mobiliteitsbeleid",
				"language": "nl",
				"libraryCatalog": "KiM",
				"place": "Den Haag",
				"url": "https://www.kimnet.nl/documenten/2025/12/18/nieuwe-vormen-van-autobeschikbaarheid",
				"attachments": [
					{
						"title": "Brochure - Nieuwe vormen van autobeschikbaarheid",
						"mimeType": "application/pdf"
					},
					{
						"title": "Achtergrondrapport - Nieuwe vormen van autobeschikbaarheid",
						"mimeType": "application/pdf"
					},
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
		"url": "https://english.kimnet.nl/documents/2025/10/01/renewable-fuels-in-high-blends-in-road-freight-transport",
		"items": [
			{
				"itemType": "report",
				"title": "Renewable fuels in high blends in road freight transport",
				"creators": [
					{
						"firstName": "Stefan",
						"lastName": "Bakker",
						"creatorType": "author"
					},
					{
						"firstName": "Saeda",
						"lastName": "Moorman",
						"creatorType": "author"
					}
				],
				"date": "2025-10-01",
				"abstractNote": "If the electrification of road transport takes longer than expected, road freight transport can also be made more sustainable in the short to medium term through the (greater) use of (more) renewable fuels. If demand for renewable fuels that are already widely used increases, this could lead to a shortage of biofeedstock, possibly resulting in price increases. Using other renewable fuels means that, depending on the type of fuel, truck engines will have to be modified or new engine types developed. This is one of the findings of the publication 'Renewable fuels in high blends in road freight transport’ by the Netherlands Institute for Transport Policy Analysis (KiM) in collaboration with studio GearUp.",
				"institution": "Netherlands Institute for Transport Policy Analysis",
				"language": "en",
				"libraryCatalog": "KiM",
				"place": "Den Haag",
				"url": "https://english.kimnet.nl/documents/2025/10/01/renewable-fuels-in-high-blends-in-road-freight-transport",
				"attachments": [
					{
						"title": "Renewable fuels in high blends in road freight transport",
						"mimeType": "application/pdf"
					},
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
		"url": "https://english.kimnet.nl/documents/2026/05/21/energy-saving-in-transport-through-avoid-shift-policy-measures",
		"items": [
			{
				"itemType": "report",
				"title": "Energy saving in transport through avoid/shift policy measures",
				"creators": [
					{
						"firstName": "Stefan",
						"lastName": "Bakker",
						"creatorType": "author"
					},
					{
						"firstName": "Saeda",
						"lastName": "Moorman",
						"creatorType": "author"
					}
				],
				"date": "2026-05-21",
				"abstractNote": "Energy demand reduction in the transport sector can be achieved by reducing transport demand (avoid), encouraging the use of alternative modes of transport (shift), and improving vehicle energy efficiency (improve). Research by the KiM Netherlands Institute for Transport Policy Analysis shows that, from a policy perspective, it is difficult to achieve substantial energy savings using the first two strategies (avoid and shift). The importance of energy savings has increased due to geopolitical developments and in light of energy supply security.",
				"institution": "Netherlands Institute for Transport Policy Analysis",
				"language": "en",
				"libraryCatalog": "KiM",
				"place": "Den Haag",
				"url": "https://english.kimnet.nl/documents/2026/05/21/energy-saving-in-transport-through-avoid-shift-policy-measures",
				"attachments": [
					{
						"title": "Brochure - Energy saving in transport through avoid/shift policy measures",
						"mimeType": "application/pdf"
					},
					{
						"title": "Background report - Energy saving in transport through avoid/shift policy measures: an exploratory study into dealing with scarcity",
						"mimeType": "application/pdf"
					},
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
		"url": "https://www.kimnet.nl/documenten/2026/05/28/bedrijfseconomische-kostenkengetallen-voor-het-goederenvervoer-update-2026",
		"items": [
			{
				"itemType": "report",
				"title": "Bedrijfseconomische kostenkengetallen voor het goederenvervoer, update 2026",
				"creators": [],
				"date": "2026-05-28",
				"abstractNote": "Om vraagstukken waarvoor bedrijfseconomische kostenkengetallen van het goederenvervoer nodig zijn te kunnen beantwoorden - bijvoorbeeld over de impact van stijgende brandstofkosten op de totale vervoerskosten - is het noodzakelijk om actuele kostengegevens te hebben. Vanuit eerdere edities van dit onderzoek waren kostenkengetallen beschikbaar voor de jaren 2016-2021. Het Kennisinstituut voor Mobiliteitsbeleid (KiM) heeft de kostenkengetallen voor het goederenvervoer nu geactualiseerd tot en met 2024. De kostenkengetallen zijn beschikbaar voor de vervoerwijzen weg, spoor, binnenvaart, zeevaart, luchtvaart, en buisleiding. Kostenkengetallen voor buisleidingen zijn voor het eerst ontwikkeld in deze editie. Het KiM heeft de kostenkengetallen laten verzamelen door de onderzoeksbureaus Panteia en Ecorys.",
				"institution": "Kennisinstituut voor Mobiliteitsbeleid",
				"language": "nl",
				"libraryCatalog": "KiM",
				"place": "Den Haag",
				"url": "https://www.kimnet.nl/documenten/2026/05/28/bedrijfseconomische-kostenkengetallen-voor-het-goederenvervoer-update-2026",
				"attachments": [
					{
						"title": "Notitie - Bedrijfseconomische kostenkengetallen voor het goederenvervoer, update 2026",
						"mimeType": "application/pdf"
					},
					{
						"title": "Achtergrondrapport Panteia - Bedrijfseconomische kostenkengetallen voor het goederenvervoer",
						"mimeType": "application/pdf"
					},
					{
						"title": "Achtergrondrapport Ecorys - Verkenning bedrijfseconomische kosten van transport via buisleidingen",
						"mimeType": "application/pdf"
					},
					{
						"title": "Tabel 1 - Kostenkengetallen van de binnenvaart",
						"mimeType": "application/pdf"
					},
					{
						"title": "Tabel 2 - Kostenkengetallen van de binnenvaart verschijningsvorm",
						"mimeType": "application/pdf"
					},
					{
						"title": "Tabel 3 - Kostenkengetallen buisleiding",
						"mimeType": "application/pdf"
					},
					{
						"title": "Tabel 4 - Kostenkengetallen van de luchtvaart",
						"mimeType": "application/pdf"
					},
					{
						"title": "Tabel 5 - Kostenkengetallen van de luchtvaart verschijningsvorm",
						"mimeType": "application/pdf"
					},
					{
						"title": "Tabel 6 - Kostenkengetallen overslag containers",
						"mimeType": "application/pdf"
					},
					{
						"title": "Tabel 7 - Kostenkengetallen van het spoorvervoer",
						"mimeType": "application/pdf"
					},
					{
						"title": "Tabel 8 - Kostenkengetallen van het spoorvervoer verschijningsvorm",
						"mimeType": "application/pdf"
					},
					{
						"title": "Tabel 9 - Kostenkengetallen van het wegvervoer",
						"mimeType": "application/pdf"
					},
					{
						"title": "Tabel 10 - Kostenkengetallen van het wegvervoer verschijningsvorm",
						"mimeType": "application/pdf"
					},
					{
						"title": "Tabel 11 - Kostenkengetallen van de zeevaart",
						"mimeType": "application/pdf"
					},
					{
						"title": "Tabel 12 - Kostenkengetallen van de zeevaart verschijningsvorm",
						"mimeType": "application/pdf"
					},
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
