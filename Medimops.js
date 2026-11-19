{
	"translatorID": "b3d86cd9-f052-4a42-8822-476280dce244",
	"label": "Medimops",
	"creator": "Florent Dufour",
	"target": "^https?://www\\.medimops\\.de/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-11-19 23:09:11"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2026 Florent Dufour

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
	if (/-M\d+\.html$/.test(url) && doc.querySelector('[data-testid="productAttributes-container"]')) {
		return getItemType(doc);
	}
	else if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('a[href*="-M"][href$=".html"]');
	for (let row of rows) {
		let href = row.href;
		if (!href || !/-M\d+\.html$/.test(href)) continue;
		let title = ZU.trimInternal(
			(row.querySelector('[class*="productTitle"]') || row.querySelector('img[alt]') || row).textContent
		);
		if (!title) continue;
		if (checkOnly) return true;
		if (!items[href]) found = true;
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

// schema.org additionalType seen on product pages -> Zotero item type
const SCHEMA_TO_ZOTERO = {
	book: 'book',
	album: 'audioRecording',
	musicalbum: 'audioRecording',
	musicrecording: 'audioRecording',
	movie: 'videoRecording',
	videoobject: 'videoRecording',
	tvseries: 'videoRecording',
	videogame: 'videoRecording',
	videogameseries: 'videoRecording',
	softwareapplication: 'computerProgram'
};

function getItemType(doc) {
	let product = getProductJSONLD(doc);
	if (product && product.additionalType) {
		let schemaType = product.additionalType.replace(/.*\//, '').toLowerCase();
		if (SCHEMA_TO_ZOTERO[schemaType]) return SCHEMA_TO_ZOTERO[schemaType];
	}
	// fall back to the "Medium" row of the product details
	let attrs = getProductAttributes(doc);
	let medium = attrs.Medium || '';
	if (/audio|vinyl|schallplatte|kassette/i.test(medium)) return 'audioRecording';
	if (/dvd|blu.?ray|vhs|4k|uhd/i.test(medium)) return 'videoRecording';
	if (/software/i.test(medium)) return 'computerProgram';
	if (/playstation|xbox|nintendo|konsole/i.test(medium)) return 'videoRecording';
	return 'book';
}

function getProductJSONLD(doc) {
	for (let script of doc.querySelectorAll('script[type="application/ld+json"]')) {
		try {
			let json = JSON.parse(script.textContent);
			for (let obj of (Array.isArray(json) ? json : [json])) {
				if (obj['@type'] == 'Product' && obj.productID) return obj;
			}
		}
		catch (e) {
			// malformed JSON-LD
		}
	}
	return null;
}

function getProductAttributes(doc) {
	let attrs = {};
	let rows = doc.querySelectorAll('[data-testid="productAttributes-container"] dl > div');
	for (let row of rows) {
		let label = row.querySelector('dt');
		let value = row.querySelector('dd');
		if (label && value) {
			attrs[label.textContent.replace(/:\s*$/, '').trim()] = ZU.trimInternal(value.textContent);
		}
	}
	return attrs;
}

// the "Von <a>Mary Smith</a>, <a>John Miller</a>" line above the title
function getCreators(doc, creatorType) {
	let headline = doc.querySelector('h1');
	let container = headline && headline.closest('div');
	while (container && container.parentElement && container.querySelectorAll('a[href^="/,"]').length == 0 && container.tagName != 'BODY') {
		container = container.parentElement;
	}
	let names = new Set();
	if (container && container != doc.body) {
		for (let a of container.querySelectorAll('a[href^="/,"]')) {
			let name = ZU.trimInternal(a.textContent);
			if (name) names.add(name);
		}
	}
	if (!names.size) return [];
	return [...names].map(name => ZU.cleanAuthor(name, creatorType, /,/.test(name)));
}

function creatorTypeFor(itemType) {
	if (itemType == 'audioRecording') return 'performer';
	if (itemType == 'videoRecording') return 'director';
	if (itemType == 'computerProgram') return 'programmer';
	return 'author';
}

async function scrape(doc, url = doc.location.href) {
	let itemType = getItemType(doc);
	let item = new Zotero.Item(itemType);
	let attrs = getProductAttributes(doc);
	let product = getProductJSONLD(doc);

	item.title = doc.querySelector('h1') && ZU.trimInternal(doc.querySelector('h1').textContent);
	if (!item.title && product) item.title = product.name;
	item.creators = getCreators(doc, creatorTypeFor(itemType));

	let date = attrs['Erscheinungsdatum'];
	if (!date && product) date = product.releaseDate;
	if (date) item.date = date;

	let identifier = attrs['ISBN / EAN'] || (product && product.productID);
	if (identifier && itemType == 'book') {
		item.ISBN = identifier;
	}
	else if (identifier) {
		item.extra = 'EAN: ' + identifier;
	}

	let publisher = attrs['Herausgeber'] || attrs['Label'] || (product && product.brand && product.brand.name);
	if (publisher) {
		if (itemType == 'audioRecording') {
			item.label = publisher;
		}
		else if (itemType == 'computerProgram') {
			item.company = publisher;
		}
		else if (itemType == 'videoRecording') {
			item.distributor = publisher;
		}
		else {
			item.publisher = publisher;
		}
	}

	if (itemType == 'book' && attrs['Seitenanzahl']) {
		item.pages = attrs['Seitenanzahl'];
	}
	if (itemType == 'audioRecording' && attrs['Anzahl der Discs']) {
		item.numberOfVolumes = attrs['Anzahl der Discs'];
	}
	let medium = attrs['Medium'] || attrs['Bindung'];
	if (medium) {
		if (itemType == 'audioRecording') item.audioRecordingFormat = medium;
		else if (itemType == 'videoRecording' && /dvd|blu.?ray|vhs|4k|uhd/i.test(medium)) item.videoRecordingFormat = medium;
	}

	item.url = url;
	item.libraryCatalog = 'medimops';

	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.medimops.de/victor-hugo-les-miserables-tome-1-folio-gallimard-taschenbuch-M02070409228.html",
		"items": [
			{
				"itemType": "book",
				"title": "Les misérables. Vol. 1",
				"creators": [
					{
						"firstName": "Victor",
						"lastName": "Hugo",
						"creatorType": "author"
					}
				],
				"date": "2000-03-01",
				"ISBN": "9782070409228",
				"libraryCatalog": "medimops",
				"publisher": "Gallimard",
				"url": "https://www.medimops.de/victor-hugo-les-miserables-tome-1-folio-gallimard-taschenbuch-M02070409228.html",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.medimops.de/buecher-C0186606/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.medimops.de/adler-mortimer-j-how-to-read-a-book-taschenbuch-M00671212095.html",
		"items": [
			{
				"itemType": "book",
				"title": "How to Read a Book",
				"creators": [
					{
						"firstName": "Mortimer J.",
						"lastName": "Adler",
						"creatorType": "author"
					}
				],
				"date": "1972-08-15",
				"ISBN": "9780671212094",
				"libraryCatalog": "medimops",
				"publisher": "Touchstone",
				"url": "https://www.medimops.de/adler-mortimer-j-how-to-read-a-book-taschenbuch-M00671212095.html",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.medimops.de/rolf-zuckowski-winterkinder-auf-der-suche-nach-weihnachten-audio-cd-M03829195400.html",
		"items": [
			{
				"itemType": "audioRecording",
				"title": "Winterkinder... auf der Suche nach Weihnachten",
				"creators": [
					{
						"firstName": "Rolf",
						"lastName": "Zuckowski",
						"creatorType": "performer"
					}
				],
				"date": "1989-01-01",
				"audioRecordingFormat": "Audio CD",
				"extra": "EAN: 0042283373921",
				"label": "Polydor (Universal)",
				"libraryCatalog": "medimops",
				"numberOfVolumes": "1",
				"url": "https://www.medimops.de/rolf-zuckowski-winterkinder-auf-der-suche-nach-weihnachten-audio-cd-M03829195400.html",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
