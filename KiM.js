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
	"lastUpdated": "2026-01-02 16:28:12"
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

	// Title from the page heading
	item.title = text(doc, 'h1.nav-bar__page-title');

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

	// Language tag
	item.language = doc.documentElement.lang || (isEnglish ? 'en' : 'nl');

	// Process downloads to get metadata and attachments
	var downloads = doc.querySelectorAll('.download-list__item');

	for (let download of downloads) {
		let metadata = download.querySelector('.meta-data');
		if (!metadata) continue;

		let metaParts = Array.from(metadata.querySelectorAll('span')).map(s => s.textContent.trim());

		// Extract date (format: DD-MM-YYYY)
		let dateStr = metaParts.find(p => /^\d{2}-\d{2}-\d{4}$/.test(p));
		if (dateStr && !item.date) {
			// Convert from DD-MM-YYYY to YYYY-MM-DD
			let parts = dateStr.split('-');
			item.date = `${parts[2]}-${parts[1]}-${parts[0]}`;
		}

		// Extract authors - look for entries with commas that aren't file sizes or page counts
		let authors = metaParts.find(p => p.includes(',')
			&& !/\d/.test(p.split(',')[0]) // First part shouldn't contain numbers
			&& !p.includes('pagina')
			&& !p.includes('pages')
			&& !p.includes('KB')
			&& !p.includes('MB')
		);

		if (authors && !item.creators.length) {
			// Split on comma and add each author
			let authorList = authors.split(',').map(a => a.trim());
			for (let author of authorList) {
				if (!author) continue;
				item.creators.push(ZU.cleanAuthor(author, 'author', false));
			}
		}

		// Get PDF attachment
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
	}
]
/** END TEST CASES **/
