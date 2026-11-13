{
	"translatorID": "c4008cc5-9243-4d13-8b35-562cdd184558",
	"label": "Delpher",
	"creator": "Philipp Zumstein, Vera de Kok",
	"target": "^https?:\\/\\/(resolver\\.kb\\.nl\\/resolve\\?urn=[^&]+|[^\\/]+\\.delpher\\.nl|services\\.kb\\.nl\\/mdo\\/oai\\?verb=GetRecord&identifier=[^&]+&metadataPrefix=didl)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-10-27 11:58:32"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2016-2026 Philipp Zumstein, Vera de Kok

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
const RESULTS_API_URL = 'https://www.delpher.nl/nl/api/results';

// KB permalinks (https://resolver.kb.nl/resolve?urn=...) are used outside
// Delpher as well, so accept them as input. The first block of the URN
// identifies the KB collection; map the ones Delpher serves to the Delpher
// collection code.
const RESOLVER_RE = /^https?:\/\/resolver\.kb\.nl\/resolve\?urn=([^&]+)/;

// The resolver redirects permalinks of issue-level objects to the OAI-PMH
// interface (https://services.kb.nl/mdo/oai) instead of the Delpher viewer,
// which has no page for a whole issue, so accept its GetRecord URLs as input.
const OAI_RE = /^https?:\/\/services\.kb\.nl\/mdo\/oai\?/;

// Search and browse pages, e.g. /nl/kranten/results?query=buurman&coll=ddd
const RESULTS_RE = /^https?:\/\/[^/]+\.delpher\.nl\/nl\/[^/]+\/results(?:[?#]|$)/;

// KB collection codes in the URN (lowercased), grouped by the Delpher
// section they belong to. Sources: the Delpher site classification and
// the OAI-PMH sets of https://services.kb.nl/mdo/oai, whose hierarchical
// setSpecs (GGC:Kranten:X, BOEKEN:X, GGC:Tijdschriften:X) are how the
// resolver identifier urn=<collection>:<object-id>[:<part>] is built.
const RESOLVER_KRANTEN = [
	'abcddd ddd kbddd02 kbddd03 kbnrc01 kbpers01 mmarge01 mmba02 mmcc01 mmcc02 mmcoda01 mmcoda02 ',
	'mmcolo01 mmda03 mmddd02 mmecal02 mmgagm01 mmgahe01 mmgaro01 mmgasl01 mmgavl01 mmgazs01 mmgem01 ',
	'mmhco01 mmhco02 mmiisg05 mmiisg07 mmiisg18 mmkb04 mmkb08 mmkb09 mmkb12 mmkb15 mmkb19 mmkb23 ',
	'mmkb27 mmkb32 mmkb38 mmmaas01 mmmhw01 mmnha02 mmnha03 mmniod04 mmniod05 mmpm05 mmranm02 ',
	'mmranm03 mmranmg01 mmraz02 mmraz03 mmrhce01 mmrhce02 mmrhcg03 mmrhcg04 mmsaa06 mmsab03 mmsab04 ',
	'mmsab05 mmsadb01 mmsaen01 mmsaen02 mmsak01 mmsaro02 mmsavl02 mmsavl03 mmsfkb03 mmshcl03 ',
	'mmtele01 mmtres02 mmtres03 mmtres04 mmubge01 mmubl12 mmubtb04 mmubwa01 mmutra04 mmveen01 ',
	'mmveen02 mmwfa01 ',
];
const RESOLVER_BOEKEN = [
	'dejong dpo edbo gbr02 kbehc01 kbeu7475 kbita01 kbtres01 konb10 konb15 mmatr03 mmatr08 mmcmc01 ',
	'mmkb02 mmkb02a mmkb02b mmkb05 mmkb06 mmkb11 mmkb18 mmkb18a mmkb18b mmkb18c mmkb18d mmkb21 ',
	'mmkb22 mmkb24 mmkb25 mmkb28 mmkb29 mmkb31 mmkb33 mmkb35 mmkb36 mmkb39 mmkb45 mmkb46 mmkb47 ',
	'mmkb48 mmkb50 mmkb52 mmkb53 mmkit03 mmmvc01 mmniod07 mmsfkb02 mmsfuba02 mmsfubu02 mmtres06 ',
	'mmtsgg01 mmtua01 mmtuk01 mmuba08 mmuba09 mmubl07 mmubvu02 mmubvu05 mulm01 niod02 niod05 nom01 ',
	'prb01 ros01 sab01 ',
];
const RESOLVER_TIJDSCHRIFTEN = [
	'cbs_ext dts gmdh01 kbdbnl02 kbdbvl02 kbdc001 kbkwg02 kbna001 kbvrnl01 mmad01 mmalet01 mmalet02 ',
	'mmatr01 mmatr02 mmatr05 mmatr06 mmatr07 mmatr09 mmavb01 mmboy01 mmbph01 mmbzk02 mmcbs01 mmcbs02 ',
	'mmcbs03 mmcmc03 mmcmc05 mmcss01 mmda04 mmegg01 mmenlk02 mmenlk03 mmenlk04 mmeur03 mmeye01 ',
	'mmeye02 mmgams01 mmgams02 mmgazs02 mmhcc01 mmhfc01 mmhni01 mmhni03 mmiisg02 mmiisg06 mmiisg08 ',
	'mmiisg10 mmiisg13 mmiisg15 mmiisg17 mmiisg20 mmiisg21 mmiisg23 mmkb07 mmkb10 mmkb13 mmkb14 ',
	'mmkb16 mmkb26 mmkb30 mmkb34 mmkb37 mmkdc03 mmkdc04 mmkdc05 mmkdc07 mmkdc09 mmkdc10 mmkdc11 ',
	'mmkit04 mmkitlv3 mmknau01 mmkngu01 mmknmp01 mmknmp02 mmknrb01 mmkntb01 mmknvb01 mmkpsv01 ',
	'mmkvlo01 mmkvlo02 mmkwg01 mmlind01 mmmi02 mmna12 mmnat03 mmndr01 mmnfm01 mmnhv01 mmnibg01 ',
	'mmnimh02 mmniod08 mmnmm02 mmnmm03 mmnpz01 mmnvog01 mmnvog02 mmobdh01 mmohkt01 mmpm02 mmpm03 ',
	'mmpm04 mmraa02 mmrhcg01 mmrhcg02 mmrkd09 mmrmo02 mmsaro01 mmsaro03 mmsavl01 mmshcl02 mmshcl04 ',
	'mmspom01 mmtey01 mmtres05 mmtuk02 mmtuk03 mmuba10 mmuba13 mmuba15 mmuba16 mmuba17 mmubg01 ',
	'mmubl08 mmubl09 mmubl13 mmubma01 mmubma02 mmubn01 mmubtb01 mmubtb02 mmubtb03 mmubu02 mmubvu04 ',
	'mmubvu06 mmubvu07 mmubvu08 mmubwa02 mmubwa03 mmubwa04 mmubwa05 mmubwa06 mmutra01 mmutra03 ',
	'mmvred01 mmzah01 mmzah03 mmzb04 mmzend01 mmzend02 mmzou01 niod07 niod09 oba01 ',
];

const RESOLVER_COLLECTIONS = {};
for (let line of RESOLVER_KRANTEN) for (let code of line.trim().split(' ')) RESOLVER_COLLECTIONS[code] = 'ddd';
for (let line of RESOLVER_BOEKEN) for (let code of line.trim().split(' ')) RESOLVER_COLLECTIONS[code] = 'boeken';
for (let line of RESOLVER_TIJDSCHRIFTEN) for (let code of line.trim().split(' ')) RESOLVER_COLLECTIONS[code] = 'dts';
RESOLVER_COLLECTIONS.anp = 'anp';

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
	if (OAI_RE.test(url)) {
		let params = parseQuery(url);
		if (params.verb != 'GetRecord' || params.metadataPrefix != 'didl' || !params.identifier) return false;
		// The identifier is "<setSpec(s)>:<urn>", where only the collection-code
		// blocks identify Delpher content
		for (let block of params.identifier.split(':')) {
			let collection = RESOLVER_COLLECTIONS[block.toLowerCase()];
			if (collection) return ITEM_TYPES[collection];
		}
		return false;
	}
	if (url.includes('/view')) {
		if (url.includes('/boeken/')) return 'book';
		if (url.includes('/tijdschriften/')) return 'magazineArticle';
		if (url.includes('/kranten/')) return 'newspaperArticle';
		if (url.includes('/radiobulletins/')) return 'radioBroadcast';
	}
	// The results are rendered client-side, so the result list may still be
	// empty when detection runs right after page load
	else if (RESULTS_RE.test(url) || getSearchResults(doc, true)) {
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
		// The results are rendered client-side, so the freshly loaded page the
		// tester sees may not show any links yet; fall back to the results API
		let items = getSearchResults(doc, false);
		if (!items) items = await fetchResultsItems(url);
		if (!items) return;
		items = await Zotero.selectItems(items);
		if (!items) return;
		for (let itemUrl of Object.keys(items)) {
			await scrape(await requestDocument(itemUrl), itemUrl);
		}
	}
	else {
		await scrape(doc, url);
	}
}

// Query the results API the SPA itself uses and map its records to viewer
// URLs, e.g. https://www.delpher.nl/nl/kranten/view?coll=ddd&identifier=...
async function fetchResultsItems(url) {
	let params = parseQuery(url);
	let collection = params.coll || collectionFromUrl(url);
	if (!collection || !VIEWER_PATHS[collection]) return false;
	let query = new URLSearchParams();
	for (let [key, value] of new URL(url).searchParams) {
		if (key != 'coll') query.append(key, value);
	}
	let records;
	try {
		records = (await requestJSON(`${RESULTS_API_URL}?${query}&coll=${collection}`)).records;
	}
	catch (e) {
		Z.debug(`Could not fetch results API: ${e}`);
		return false;
	}
	let items = {};
	for (let record of records || []) {
		// the identifier is a resolver permalink, sometimes of just the OCR text
		let urn = (record.metadataKey
			|| String(record.identifier || '').match(/urn=([a-zA-Z0-9:%._-]+)/)?.[1] || '')
			.replace(/:(ocr|pdf|image)$/, '');
		if (!urn) continue;
		let viewerUrl = `https://www.delpher.nl/nl/${VIEWER_PATHS[collection]}/view?coll=${collection}&identifier=${encodeURIComponent(urn)}`;
		items[viewerUrl] = record.title;
	}
	return Object.keys(items).length ? items : false;
}

async function scrape(doc, url = doc.location.href) {
	let resolverUrn = url.match(RESOLVER_RE);
	if (resolverUrn) {
		await scrapePermalink(doc, resolverUrn[1]);
		return;
	}
	if (OAI_RE.test(url)) {
		await scrapeOaiRecord(doc, url);
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

// The OAI record lists the permalinks of the object and all its parts; the
// first one is the permalink of the object itself. The tab usually already
// shows the record, so try to read its identifiers from the document first.
// Fall back to the OAI identifier if no permalink can be found.
async function scrapeOaiRecord(doc, url) {
	let urns = permalinkUrns(doc);
	if (!urns.length) {
		try {
			let record = await requestText(url);
			urns = Array.from(record.matchAll(/resolver\.kb\.nl\/resolve\?urn=([a-zA-Z0-9:%._-]+)/g), match => match[1]);
		}
		catch (e) {
			Z.debug(`Could not fetch OAI record: ${e}`);
		}
	}
	for (let urn of urns) {
		if (/:(pdf|image|ocr|alto)$/.test(urn)) continue;
		await scrapePermalink(doc, urn);
		return;
	}
	let identifier = parseQuery(url).identifier || '';
	if (!identifier) return;
	// The identifier is "<setSpec(s)>:<urn>", e.g. "DDD:ddd:<object>:mpeg21" or
	// "KRANTEN:MMHCO01:MMHCO01:<object>:mpeg21"; drop the setSpec blocks before
	// and including the first collection code to get the URN
	let blocks = identifier.split(':');
	for (let i = 0; i < blocks.length - 2; i++) {
		if (RESOLVER_COLLECTIONS[blocks[i].toLowerCase()]) {
			await scrapePermalink(doc, blocks.slice(i + 1).join(':'));
			return;
		}
	}
}

// The permalinks of an OAI record as listed in its dc:identifier elements.
// The XML document is parsed as HTML in the sandbox, but the parser keeps
// the colon in tag names, so getElementsByTagName still finds them.
function permalinkUrns(doc) {
	let urns = [];
	for (let element of doc.getElementsByTagName('dc:identifier')) {
		let match = String(element.textContent || '').match(/resolver\.kb\.nl\/resolve\?urn=([a-zA-Z0-9:%._-]+)/);
		if (match) urns.push(match[1]);
	}
	return urns;
}

// The first block of the URN identifies the KB collection
function resolverCollection(urn) {
	// the resolver is case-insensitive (urn=DDD:... resolves like ddd)
	return RESOLVER_COLLECTIONS[String(urn).split(':')[0].toLowerCase()] || '';
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
	else if (collection == 'anp') {
		// Radio bulletins are numbered in sequence within the day (volgnummer),
		// not by broadcast time, so that number is their only distinct identifier
		item.episodeNumber = cleanText(data.volgnummer);
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
	let bulletinNumber = detail('Berichtnummer');
	if (bulletinNumber) item.episodeNumber = bulletinNumber;
	let language = detail('Taal');
	if (language) item.language = LANGUAGES[language.toLowerCase()] || language;
	item.libraryCatalog = detail('Herkomst') || 'Delpher';
	item.url = ZU.xpathText(doc, '(//input[contains(@class, "object-view-menu__share-links-details-input")])[last()]/@value') || item.url;

	let authors = ZU.xpath(doc, '//dt[contains(@class, "metadata__details-text") and (normalize-space(text())="Auteur" or normalize-space(text())="Coauteur")]/following-sibling::dd[1]');
	for (let author of authors) {
		item.creators.push(cleanAuthorName(ZU.trimInternal(author.textContent)));
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
			item.creators.push(cleanAuthorName(name));
		}
		else {
			item.creators.push({ lastName: name, creatorType: 'author' });
		}
	}
}

// Dutch surnames can carry a particle ("de Bruin", "van der Laan"). Delpher lists
// authors inverted ("Bruin, W. K. de"), which makes cleanAuthor leave the particle
// at the end of the first name - move it in front of the last name.
const DUTCH_PARTICLE = "(?:de|den|der|het|ter|tot|te|ten|op|aan|bij|in|onder|over|voor|van|['\u2019]t|['\u2019]s)";
const TRAILING_PARTICLES = new RegExp(" (" + DUTCH_PARTICLE + "(?: " + DUTCH_PARTICLE + ")*)$");

function cleanAuthorName(name) {
	let creator = ZU.cleanAuthor(name, 'author', true);
	if (!creator.firstName) return creator;
	let particles = creator.firstName.match(TRAILING_PARTICLES);
	if (particles) {
		creator.lastName = particles[1] + ' ' + creator.lastName;
		creator.firstName = creator.firstName.slice(0, particles.index).trim();
		if (!creator.firstName) delete creator.firstName;
	}
	return creator;
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
						"tag": "7 al Bibliografie; boek- en bibliotheekwetenschap → Bibliografie en bibliotheconomie → Inleiding en algemeen → Tijdschriften → Nederland"
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
						"tag": "bibliografieën"
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
				"title": "Neêrland weer vrij!",
				"creators": [
					{
						"firstName": "J.",
						"lastName": "Stamperius",
						"creatorType": "author"
					},
					{
						"firstName": "W. K.",
						"lastName": "de Bruin",
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
						"tag": "1505 bed Opvoeding en onderwijs; [Kinderlectuur] → Kinderlectuur → Kinderboeken → Nederlands"
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
				"episodeNumber": "19",
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
						"tag": "7 al Bibliografie; boek- en bibliotheekwetenschap → Bibliografie en bibliotheconomie → Inleiding en algemeen → Tijdschriften → Nederland"
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
						"tag": "bibliografieën"
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
				"title": "Neêrland weer vrij!",
				"creators": [
					{
						"firstName": "J.",
						"lastName": "Stamperius",
						"creatorType": "author"
					},
					{
						"firstName": "W. K.",
						"lastName": "de Bruin",
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
						"tag": "1505 bed Opvoeding en onderwijs; [Kinderlectuur] → Kinderlectuur → Kinderboeken → Nederlands"
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
