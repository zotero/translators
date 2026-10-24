{
	"translatorID": "c4008cc5-9243-4d13-8b35-562cdd184558",
	"label": "Delpher",
	"creator": "Philipp Zumstein",
	"target": "^https?:\\/\\/(resolver\\.kb\\.nl\\/resolve\\?urn=[^&]+|[^\\/]+\\.delpher\\.nl)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-10-24 14:40:12"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright Â© 2016 Philipp Zumstein

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


const API_URL = 'https://www.delpher.nl/nl/api/resource';

// KB permalinks (https://resolver.kb.nl/resolve?urn=...) are used outside
// Delpher as well, so accept them as input. The first block of the URN
// identifies the KB collection; map the ones Delpher serves to the Delpher
// collection code.
const RESOLVER_RE = /^https?:\/\/resolver\.kb\.nl\/resolve\?urn=([^&]+)/;

// KB collection code in the URN -> Delpher collection code
const RESOLVER_COLLECTIONS = {
	ddd: 'ddd',
	MMHCO01: 'ddd',
	dts: 'dts',
	dpo: 'boeken',
	MMKB02: 'boeken',
	anp: 'anp'
};

// Delpher collection code -> site section of the viewer
const VIEWER_PATHS = {
	ddd: 'kranten',
	dts: 'tijdschriften',
	boeken: 'boeken',
	anp: 'radiobulletins'
};

// Delpher collection code -> Zotero item type
const ITEM_TYPES = {
	ddd: 'newspaperArticle',
	dts: 'magazineArticle',
	boeken: 'book',
	anp: 'radioBroadcast'
};

// Delpher reports languages both as Dutch names and as ISO 639-2 codes
const LANGUAGES = {
	nederlands: 'nl',
	dut: 'nl',
	nld: 'nl',
	frans: 'fr',
	fra: 'fr',
	fre: 'fr',
	duits: 'de',
	deu: 'de',
	ger: 'de',
	engels: 'en',
	eng: 'en',
	spaans: 'es',
	spa: 'es',
	italiaans: 'it',
	ita: 'it'
};

function detectWeb(doc, url) {
	let resolverUrn = url.match(RESOLVER_RE);
	if (resolverUrn) {
		let collection = resolverCollection(decodeURIComponent(resolverUrn[1]));
		return collection ? ITEM_TYPES[collection] : false;
	}
	if (url.includes('/view')) {
		if (url.includes('/boeken/')) return 'book';
		if (url.includes('/tijdschriften/')) return 'magazineArticle';
		if (url.includes('/kranten/')) return 'newspaperArticle';
		if (url.includes('/radiobulletins/')) return 'radioBroadcast';
	}
	else if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//article//a[contains(@class, "search-result__link") and starts-with(@href, "/")]');
	for (var i = 0; i < rows.length; i++) {
		var href = rows[i].href;
		var title = ZU.trimInternal(rows[i].textContent);
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
		for (let itemUrl of Object.keys(items)) {
			await scrape(await requestDocument(itemUrl), itemUrl);
		}
	}
	else {
		await scrape(doc, url);
	}
}

async function scrape(doc, url = doc.location.href) {
	let resolverUrn = url.match(RESOLVER_RE);
	if (resolverUrn) {
		await scrapePermalink(doc, resolverUrn[1]);
		return;
	}
	let params = parseQuery(url);
	let collection = params.coll || collectionFromUrl(url);
	let identifier = params.identifier || objectId(doc);
	let item = new Zotero.Item(itemType(collection, doc, url));

	// The page itself is rendered from this API, so prefer it over the visible metadata
	let data;
	if (identifier && collection) {
		let apiUrl = `${API_URL}?identifier=${encodeURIComponent(identifier)}&coll=${encodeURIComponent(collection)}&type=dc`;
		try {
			data = await requestJSON(apiUrl);
		}
		catch (e) {
			Z.debug(`Delpher API request failed, falling back to the page metadata: ${e}`);
		}
	}

	if (data && data.title) {
		addApiData(item, data, collection, identifier);
	}
	else {
		addPageData(item, doc);
	}

	// The share menu lists the KB permalinks of the current object, from the
	// publication down to the page and, for newspaper articles, the article,
	// so the last one is the most specific. Prefer those over a constructed URL.
	let permalinks = pagePermalinks(doc);
	if (permalinks.length) {
		item.url = permalinks[permalinks.length - 1].url;
	}
	if (collection == 'ddd' || collection == 'dts') {
		// The API resolves a page or issue identifier to the first article on
		// that page, so its page number can be off; the permalink is exact.
		let page = permalinkPage(permalinks);
		if (page) item.pages = page;
	}

	addAttachments(item, doc, data);

	item.complete();
}

// A KB permalink redirects to the metadata of the object (for newspapers) or
// to the Delpher viewer (for most other collections), so fetch the viewer
// page of the object and scrape it like a regular Delpher page.
async function scrapePermalink(doc, urnParameter) {
	let urn = decodeURIComponent(urnParameter).replace(/:(pdf|image|ocr)$/, '');
	let collection = resolverCollection(urn);
	if (!collection) return;
	let viewerUrl = `https://www.delpher.nl/nl/${VIEWER_PATHS[collection]}/view?coll=${collection}&identifier=${encodeURIComponent(urn)}`;
	if (!doc.querySelector('div.js-object-viewer-wrapper')) {
		doc = await requestDocument(viewerUrl);
	}
	await scrape(doc, viewerUrl);
}

// The first block of the URN identifies the KB collection
function resolverCollection(urn) {
	return RESOLVER_COLLECTIONS[String(urn).split(':')[0]] || '';
}

function itemType(collection, doc, url) {
	if (ITEM_TYPES[collection]) return ITEM_TYPES[collection];
	let detected = detectWeb(doc, url);
	return detected && detected != 'multiple' ? detected : 'webpage';
}

// The URL of the object the viewer is showing, e.g. ddd:110578678:mpeg21:a0106
function objectId(doc) {
	let wrapper = doc.querySelector('div.js-object-viewer-wrapper');
	if (!wrapper) return '';
	try {
		return JSON.parse(wrapper.dataset.metadata).objectlevelId || '';
	}
	catch (e) {
		Z.debug(`Could not parse Delpher object metadata: ${e}`);
		return '';
	}
}

// The share menu holds the KB permalinks of the current object: the
// publication, the page and (for newspaper articles) the article. They are
// in that order in the document, so the last non-empty one is the most specific.
function pagePermalinks(doc) {
	let permalinks = [];
	for (let input of doc.querySelectorAll('input[id*="sharelinks__perm__input--"]')) {
		if (!input.value) continue;
		permalinks.push({
			level: input.id.replace(/^.*--/, ''),
			url: input.value
		});
	}
	return permalinks;
}

function permalinkPage(permalinks) {
	let page = permalinks.find(permalink => permalink.level == 'pageurl');
	if (!page) return '';
	let match = page.url.match(/0*(\d+)$/);
	return match ? match[1] : '';
}

function addApiData(item, data, collection, identifier) {
	item.title = cleanText(data.title);
	if (data.subtitle) {
		item.title += `: ${cleanText(data.subtitle)}`;
	}
	item.date = cleanDate(data.date);
	if (data.language) {
		item.language = LANGUAGES[String(data.language).toLowerCase()] || data.language;
	}
	item.url = resolverUrl(data, identifier);
	if (data.ppn) item.callNumber = data.ppn;

	if (collection == 'ddd') {
		item.publicationTitle = cleanText(data.papertitle);
		item.place = cleanText(data.spatialCreation || data.spatial);
		item.edition = cleanText(data.edition);
		item.pages = data.page;
		item.libraryCatalog = 'Delpher';
	}
	else if (collection == 'dts') {
		item.title = cleanText(stripDateFromTitle(data.title, data.date)) || item.title;
		item.publicationTitle = cleanText(magazineTitle(data));
		item.volume = data.volumeNumber || volumeFromTitle(data.title);
		item.issue = data.issuenumber || data.sequenceNumber;
		item.pages = pageFromIdentifier(identifier);
		item.libraryCatalog = cleanText(data.source) || 'Delpher';
	}
	else if (collection == 'boeken') {
		item.publisher = cleanText(firstValue(data.publisherString) || firstValue(data.publisher));
		let place = cleanText(firstValue(data.publisherSpatial));
		if (place && place != item.publisher) item.place = place;
		item.numPages = cleanText(firstValue(data.extent));
		item.series = cleanText(firstValue(data.isPartOf));
		item.libraryCatalog = cleanText(data.source) || 'Delpher';
	}
	else {
		item.libraryCatalog = cleanText(data.source) || 'Delpher';
	}

	addCreators(item, data.creator);
	addCreators(item, data.contributor);
	addTags(item, data.subject);
}

// Fallback for when the API is unavailable: read the visible metadata list
function addPageData(item, doc) {
	let details = pageDetails(doc);
	let detail = function () {
		for (let label of arguments) {
			if (details[label]) return details[label];
		}
		return '';
	};

	item.title = detail('Kop', 'Titel', 'Krantentitel');
	item.date = cleanDate(detail('Publicatiedatum', 'Datum', 'Jaar van uitgave'));
	item.publicationTitle = detail('Krantentitel');
	item.place = detail('Plaats van uitgave');
	item.publisher = detail('Drukker/Uitgever', 'Uitgever');
	item.volume = detail('Jaargang');
	item.issue = detail('Aflevering');
	item.edition = detail('Editie');
	item.pages = detail('Pagina');
	item.numPages = detail('Omvang');
	item.callNumber = detail('PPN');
	let language = detail('Taal');
	if (language) item.language = LANGUAGES[language.toLowerCase()] || language;
	item.libraryCatalog = detail('Herkomst') || 'Delpher';
	item.url = ZU.xpathText(doc, '(//input[contains(@class, "object-view-menu__share-links-details-input")])[last()]/@value') || item.url;

	let authors = ZU.xpath(doc, '//dt[contains(@class, "metadata__details-text") and (normalize-space(text())="Auteur" or normalize-space(text())="Coauteur")]/following-sibling::dd[1]');
	for (let author of authors) {
		item.creators.push(ZU.cleanAuthor(ZU.trimInternal(author.textContent), 'author', true));
	}
}

function pageDetails(doc) {
	let details = {};
	let terms = doc.querySelectorAll('dl.metadata__details-description-list dt');
	for (let term of terms) {
		let label = ZU.trimInternal(term.textContent);
		let description = term.nextElementSibling;
		if (label && description && !details[label]) {
			details[label] = ZU.trimInternal(description.textContent);
		}
	}
	return details;
}

function addCreators(item, names) {
	for (let name of asArray(names)) {
		if (!name) continue;
		name = cleanText(name);
		if (name.includes(',')) {
			item.creators.push(ZU.cleanAuthor(name, 'author', true));
		}
		else {
			item.creators.push({ lastName: name, creatorType: 'author' });
		}
	}
}

function addTags(item, subjects) {
	for (let subject of asArray(subjects)) {
		if (subject) item.tags.push(cleanText(subject));
	}
}

// The API returns decomposed diacritics (e.g. "e" + combining diaeresis), so compose them
function cleanText(value) {
	if (typeof value != 'string') return value;
	return value.normalize('NFC');
}

function addAttachments(item, doc, data) {
	item.attachments.push({ title: 'Snapshot', document: doc });

	let pdfLink, imageLink;
	let links = doc.querySelectorAll('a.object-view-menu__downloads-link');
	for (let link of links) {
		let label = ZU.trimInternal(link.textContent).toLowerCase();
		let href = link.href || link.getAttribute('href') || '';
		if (!href) continue;
		if (label.includes('pdf') || href.includes(':pdf')) {
			pdfLink = pdfLink || href;
		}
		else if (label.includes('jpg') || label.includes('image') || href.includes(':image')) {
			imageLink = imageLink || href;
		}
	}
	if (!pdfLink && data && data.pdfUrl) pdfLink = data.pdfUrl;

	if (pdfLink) {
		item.attachments.push({ title: 'Full Text PDF', mimeType: 'application/pdf', url: pdfLink });
	}
	if (imageLink) {
		item.attachments.push({ title: 'Image', mimeType: 'image/jpeg', url: imageLink });
	}
}

function parseQuery(url) {
	let params = {};
	try {
		for (let [key, value] of new URL(url).searchParams) {
			params[key] = value;
		}
	}
	catch (e) {
		Z.debug(`Could not parse URL: ${e}`);
	}
	return params;
}

function collectionFromUrl(url) {
	if (url.includes('/kranten/')) return 'ddd';
	if (url.includes('/tijdschriften/')) return 'dts';
	if (url.includes('/boeken/')) return 'boeken';
	if (url.includes('/radiobulletins/')) return 'anp';
	return '';
}

function resolverUrl(data, identifier) {
	let urn = identifier || data.metadataKey || data.recordIdentifier || data.identifier || '';
	urn = String(urn).replace(/^https?:\/\/resolver\.kb\.nl\/resolve\?urn=/, '').replace(/:(ocr|image|pdf)$/, '');
	return urn ? `https://resolver.kb.nl/resolve?urn=${urn}` : undefined;
}

function cleanDate(value) {
	if (!value) return undefined;
	value = String(value).replace(/\s*\(schatting\)$/, '').trim();
	let match = value.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})(?:\s|$)/);
	if (match) return `${match[1]}-${pad(match[2])}-${pad(match[3])}`;
	match = value.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
	if (match) return `${match[3]}-${pad(match[2])}-${pad(match[1])}`;
	return value;
}

// The magazine issue title repeats the date; the cleanest alternative title is the magazine name
function magazineTitle(data) {
	let alternatives = asArray(data.alternative).filter(Boolean);
	if (alternatives.length) {
		return alternatives.reduce((a, b) => (countDigits(a) <= countDigits(b) ? a : b));
	}
	return stripDateFromTitle(data.title, data.date) || data.title;
}

function volumeFromTitle(title) {
	let match = String(title || '').match(/\bjrg\.?\s*(\d+)/i);
	return match ? match[1] : '';
}

function pageFromIdentifier(identifier) {
	let match = String(identifier || '').match(/:(\d+)$/);
	return match ? String(Number(match[1])) : '';
}

function stripDateFromTitle(title, date) {
	if (!title) return '';
	let dmy = dmyFromDate(date);
	if (dmy && title.includes(dmy)) {
		return title.replace(dmy, '').replace(/[\s,]+$/, '').trim();
	}
	return title;
}

function dmyFromDate(date) {
	let match = String(date || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
	return match ? `${match[3]}-${match[2]}-${match[1]}` : '';
}

function firstValue(value) {
	let values = asArray(value).filter(Boolean);
	return values.length ? values[0] : '';
}

function asArray(value) {
	if (value === undefined || value === null) return [];
	return Array.isArray(value) ? value : [value];
}

function countDigits(value) {
	return (String(value).match(/\d/g) || []).length;
}

function pad(value) {
	return String(value).padStart(2, '0');
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.delpher.nl/nl/kranten/view?query=Spaansche+Buurman&coll=ddd&identifier=ddd:110578678:mpeg21:a0106&resultsidentifier=ddd:110578678:mpeg21:a0106&rowid=1",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Spaansche buurman.",
				"creators": [],
				"date": "1941-02-01",
				"callNumber": "832675288",
				"edition": "Avond",
				"libraryCatalog": "Delpher",
				"pages": "2",
				"place": "Amsterdam",
				"publicationTitle": "De Telegraaf",
				"url": "https://resolver.kb.nl/resolve?urn=ddd:110578678:mpeg21:a0106",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					},
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Image",
						"mimeType": "image/jpeg"
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
		"url": "https://www.delpher.nl/nl/kranten/view?coll=ddd&identifier=ddd:110578678:mpeg21:p002",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Het Cechische volk in deze dagen. Aanpassing in gelatenheid aan den nieuwen toestand. Een bezoek aan Praag.",
				"creators": [],
				"date": "1941-02-01",
				"callNumber": "832675288",
				"edition": "Avond",
				"libraryCatalog": "Delpher",
				"pages": "2",
				"place": "Amsterdam",
				"publicationTitle": "De Telegraaf",
				"url": "https://resolver.kb.nl/resolve?urn=ddd:110578678:mpeg21:p002",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					},
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Image",
						"mimeType": "image/jpeg"
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
		"url": "https://www.delpher.nl/nl/kranten/view?coll=ddd&identifier=ddd:110578678:mpeg21",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Het Cechische volk in deze dagen. Aanpassing in gelatenheid aan den nieuwen toestand. Een bezoek aan Praag.",
				"creators": [],
				"date": "1941-02-01",
				"callNumber": "832675288",
				"edition": "Avond",
				"libraryCatalog": "Delpher",
				"pages": "1",
				"place": "Amsterdam",
				"publicationTitle": "De Telegraaf",
				"url": "https://resolver.kb.nl/resolve?urn=ddd:110578678:mpeg21:p001",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					},
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Image",
						"mimeType": "image/jpeg"
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
		"url": "https://www.delpher.nl/nl/tijdschriften/view/index?query=buurman&coll=dts&identifier=dts%3A2738036%3Ampeg21%3A0012&page=1&maxperpage=10",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "Nieuwsblad voor den boekhandel jrg 91, 1924, no 35",
				"creators": [],
				"date": "1924-05-02",
				"callNumber": "830637982",
				"issue": "35",
				"language": "nl",
				"libraryCatalog": "Koninklijke Bibliotheek",
				"pages": "12",
				"publicationTitle": "Nieuwsblad voor den boekhandel",
				"url": "https://resolver.kb.nl/resolve?urn=dts:2738036:mpeg21:0012",
				"volume": "91",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					},
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Image",
						"mimeType": "image/jpeg"
					}
				],
				"tags": [
					{
						"tag": "0007 al"
					},
					{
						"tag": "06.26 boekhandel, boekhandelscatalogi"
					},
					{
						"tag": "7 al Bibliografie; boek- en bibliotheekwetenschap â†’ Bibliografie en bibliotheconomie â†’ Inleiding en algemeen â†’ Tijdschriften â†’ Nederland"
					},
					{
						"tag": "Algemeen"
					},
					{
						"tag": "Boekhandel"
					},
					{
						"tag": "Boekwezen"
					},
					{
						"tag": "Boekwinkels"
					},
					{
						"tag": "bibliografieÃ«n"
					},
					{
						"tag": "boekhandel"
					},
					{
						"tag": "boekpromotie"
					},
					{
						"tag": "tijdschriften"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.delpher.nl/nl/boeken/view?identifier=dpo:2390:mpeg21:0003&query=Philippe+en+Georgette&page=1&coll=boeken&rowid=1",
		"items": [
			{
				"itemType": "book",
				"title": "Philippe en Georgette, zangspel.",
				"creators": [
					{
						"firstName": "Jacques Marie",
						"lastName": "Boutet de Monvel",
						"creatorType": "author"
					},
					{
						"firstName": "N. C. (wed C. van Streek)",
						"lastName": "Brinkman",
						"creatorType": "author"
					}
				],
				"date": "1796",
				"language": "nl",
				"libraryCatalog": "Universitaire Bibliotheken Leiden",
				"numPages": "72",
				"publisher": "Helders, Jan Amsterdam, 1779-1798",
				"url": "https://resolver.kb.nl/resolve?urn=dpo:2390:mpeg21:0003",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					},
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Image",
						"mimeType": "image/jpeg"
					}
				],
				"tags": [
					{
						"tag": "Drama"
					},
					{
						"tag": "French language and literature"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.delpher.nl/nl/boeken/view?coll=boeken&identifier=MMKB02:100006852",
		"items": [
			{
				"itemType": "book",
				"title": "NeÃªrland weer vrij!",
				"creators": [
					{
						"firstName": "J.",
						"lastName": "Stamperius",
						"creatorType": "author"
					},
					{
						"firstName": "W. K. de",
						"lastName": "Bruin",
						"creatorType": "author"
					}
				],
				"date": "[192-?]",
				"callNumber": "389117609",
				"language": "nl",
				"libraryCatalog": "Koninklijke Bibliotheek",
				"numPages": "95 p., [6] bl. pl",
				"place": "Alkmaar",
				"publisher": "Gebr. Kluitman",
				"series": "Ons genoegen. Serie A. Jongensboeken",
				"url": "https://resolver.kb.nl/resolve?urn=MMKB02:100006852:00009",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					},
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Image",
						"mimeType": "image/jpeg"
					}
				],
				"tags": [
					{
						"tag": "1505 bed"
					},
					{
						"tag": "1505 bed Opvoeding en onderwijs; [Kinderlectuur] â†’ Kinderlectuur â†’ Kinderboeken â†’ Nederlands"
					},
					{
						"tag": "Achttiende eeuw"
					},
					{
						"tag": "Historische verhalen"
					},
					{
						"tag": "Kinderboek"
					},
					{
						"tag": "Napoleontische oorlogen"
					},
					{
						"tag": "Negentiende eeuw"
					},
					{
						"tag": "Oorlogsverhalen"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.delpher.nl/nl/radiobulletins/view?coll=anp&page=2&identifier=anp:1950:02:20:19:mpeg21",
		"items": [
			{
				"itemType": "radioBroadcast",
				"title": "ANP Nieuwsbericht - 20-02-1950 - 19",
				"creators": [],
				"date": "1950-02-20",
				"language": "nl",
				"libraryCatalog": "Delpher",
				"url": "https://resolver.kb.nl/resolve?urn=anp:1950:02:20:19",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					},
					{
						"title": "Image",
						"mimeType": "image/jpeg"
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
		"url": "https://resolver.kb.nl/resolve?urn=ddd:110578678:mpeg21",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Het Cechische volk in deze dagen. Aanpassing in gelatenheid aan den nieuwen toestand. Een bezoek aan Praag.",
				"creators": [],
				"date": "1941-02-01",
				"callNumber": "832675288",
				"edition": "Avond",
				"libraryCatalog": "Delpher",
				"pages": "1",
				"place": "Amsterdam",
				"publicationTitle": "De Telegraaf",
				"url": "https://resolver.kb.nl/resolve?urn=ddd:110578678:mpeg21:p001",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					},
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Image",
						"mimeType": "image/jpeg"
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
		"url": "https://resolver.kb.nl/resolve?urn=MMHCO01:000079808:mpeg21",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Dit nommer bestaat uit twee bladen",
				"creators": [],
				"date": "1903-02-06",
				"callNumber": "398543062",
				"edition": "Dag",
				"libraryCatalog": "Delpher",
				"pages": "1",
				"place": "Zwolle",
				"publicationTitle": "Provinciale Overijsselsche en Zwolsche courant",
				"url": "https://resolver.kb.nl/resolve?urn=MMHCO01:000079808:mpeg21:p001",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					},
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Image",
						"mimeType": "image/jpeg"
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
		"url": "https://resolver.kb.nl/resolve?urn=dts:2738036:mpeg21",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "Nieuwsblad voor den boekhandel jrg 91, 1924, no 35",
				"creators": [],
				"date": "1924-05-02",
				"callNumber": "830637982",
				"issue": "35",
				"language": "nl",
				"libraryCatalog": "Koninklijke Bibliotheek",
				"pages": "1",
				"publicationTitle": "Nieuwsblad voor den boekhandel",
				"url": "https://resolver.kb.nl/resolve?urn=dts:2738036:mpeg21:0001",
				"volume": "91",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					},
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Image",
						"mimeType": "image/jpeg"
					}
				],
				"tags": [
					{
						"tag": "0007 al"
					},
					{
						"tag": "06.26 boekhandel, boekhandelscatalogi"
					},
					{
						"tag": "7 al Bibliografie; boek- en bibliotheekwetenschap â†’ Bibliografie en bibliotheconomie â†’ Inleiding en algemeen â†’ Tijdschriften â†’ Nederland"
					},
					{
						"tag": "Algemeen"
					},
					{
						"tag": "Boekhandel"
					},
					{
						"tag": "Boekwezen"
					},
					{
						"tag": "Boekwinkels"
					},
					{
						"tag": "bibliografieÃ«n"
					},
					{
						"tag": "boekhandel"
					},
					{
						"tag": "boekpromotie"
					},
					{
						"tag": "tijdschriften"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://resolver.kb.nl/resolve?urn=MMKB02:100006852",
		"items": [
			{
				"itemType": "book",
				"title": "NeÃªrland weer vrij!",
				"creators": [
					{
						"firstName": "J.",
						"lastName": "Stamperius",
						"creatorType": "author"
					},
					{
						"firstName": "W. K. de",
						"lastName": "Bruin",
						"creatorType": "author"
					}
				],
				"date": "[192-?]",
				"callNumber": "389117609",
				"language": "nl",
				"libraryCatalog": "Koninklijke Bibliotheek",
				"numPages": "95 p., [6] bl. pl",
				"place": "Alkmaar",
				"publisher": "Gebr. Kluitman",
				"series": "Ons genoegen. Serie A. Jongensboeken",
				"url": "https://resolver.kb.nl/resolve?urn=MMKB02:100006852:00009",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					},
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Image",
						"mimeType": "image/jpeg"
					}
				],
				"tags": [
					{
						"tag": "1505 bed"
					},
					{
						"tag": "1505 bed Opvoeding en onderwijs; [Kinderlectuur] â†’ Kinderlectuur â†’ Kinderboeken â†’ Nederlands"
					},
					{
						"tag": "Achttiende eeuw"
					},
					{
						"tag": "Historische verhalen"
					},
					{
						"tag": "Kinderboek"
					},
					{
						"tag": "Napoleontische oorlogen"
					},
					{
						"tag": "Negentiende eeuw"
					},
					{
						"tag": "Oorlogsverhalen"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.delpher.nl/nl/kranten/results?query=buurman&coll=ddd",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.delpher.nl/nl/boeken/results?query=buurman&coll=boeken",
		"items": "multiple"
	}
]
/** END TEST CASES **/
