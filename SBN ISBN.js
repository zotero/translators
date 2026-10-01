{
	"translatorID": "6e6440b4-853d-4963-bc0d-f54aada17972",
	"label": "SBN ISBN",
	"creator": "Lorenzo Bercelli",
	"target": "",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 98,
	"inRepository": true,
	"translatorType": 8,
	"lastUpdated": "2026-09-30 08:23:10"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2026 Lorenzo Bercelli

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


// SBN exposes Z39.50 and web MARC exports, but Zotero search translators
// cannot use the Z39.50 TCP service. Use the official mobile app JSON gateway.
const API = 'https://opac.sbn.it/opacmobilegw';

const LANGUAGES = {
	ITALIANO: 'it',
	INGLESE: 'en',
	FRANCESE: 'fr',
	TEDESCO: 'de',
	SPAGNOLO: 'es',
	PORTOGHESE: 'pt',
	LATINO: 'la',
	GRECO: 'el',
	RUSSO: 'ru',
	OLANDESE: 'nl',
	CATALANO: 'ca',
	ARABO: 'ar',
	CINESE: 'zh',
	GIAPPONESE: 'ja'
};

const ROLE_LABELS = {
	Autore: 'author',
	Curatore: 'editor',
	Traduttore: 'translator'
};

// Phrases introducing names in a statement of responsibility,
// e.g. "a cura di Gabriella Caramore"
const ROLE_PHRASES = [
	['editor', /\bcura\b|\bcurat[oaie]\b|\bedited\b|\bed\. by/gi],
	['translator', /\btradu|\btrad\.|\btranslat/gi],
	['contributor', /\bcon\b|\bcontribut|\billustra|\bprefazione|\bintroduzione|\bpostfazione/gi]
];

function detectSearch(items) {
	if (Array.isArray(items)) {
		return items.some(item => detectSearch(item));
	}
	let isbn = items.ISBN && ZU.cleanISBN(items.ISBN);
	// Italian registration groups (88, 979-12)
	return !!isbn && /^97(888|912)/.test(ZU.toISBN13(isbn));
}

async function doSearch(item) {
	let input = ZU.cleanISBN(item.ISBN);
	if (!input) return;
	let isbn = ZU.toISBN13(input);

	// SBN only matches the ISBN in the form it was catalogued with
	let forms = [isbn];
	if (isbn.startsWith('978')) forms.push(toISBN10(isbn));
	let bids = new Set();
	for (let form of forms) {
		let results = await requestJSON(`${API}/search.json?isbn=${form}`);
		for (let rec of results.briefRecords || []) {
			bids.add(rec.codiceIdentificativo);
		}
	}

	let records = [];
	for (let bid of [...bids].slice(0, 10)) {
		try {
			let record = await requestJSON(`${API}/full.json?bid=${encodeURIComponent(bid)}`);
			// Brief records show only the first ISBN, so check the full record
			let isbns = getISBNs(record).map(i => ZU.toISBN13(i));
			if (!isbns.length || isbns.includes(isbn)) records.push(record);
		}
		catch (e) {
			Z.debug(`Could not fetch ${bid}: ${e}`);
		}
	}
	if (!records.length) return;

	// Several records can share an ISBN (e.g. reprints). Prefer records that give
	// it in the same form as the input (10-digit ISBNs mostly predate 2007), then
	// the most complete, then the most widely held, then the earliest
	let sameForm = record => (getISBNs(record).includes(input) ? 1 : 0);
	records.sort((a, b) => sameForm(b) - sameForm(a)
		|| completeness(b) - completeness(a)
		|| (b.localizzazioni || []).length - (a.localizzazioni || []).length
		|| getYear(a) - getYear(b));
	scrape(records[0], isbn);
}

function toISBN10(isbn13) {
	let digits = isbn13.substr(3, 9);
	let sum = 0;
	for (let i = 0; i < 9; i++) sum += (10 - i) * digits[i];
	let check = (11 - sum % 11) % 11;
	return digits + (check == 10 ? 'X' : check);
}

function getISBNs(record) {
	return (record.numeri || [])
		.filter(num => num.startsWith('[ISBN]'))
		.map(num => ZU.cleanISBN(num))
		.filter(Boolean);
}

function completeness(record) {
	return (record.nomi || []).length * 4
		+ (record.classificazioneDewey ? 2 : 0)
		+ (record.collezione ? 1 : 0);
}

function getYear(record) {
	let year = (record.pubblicazione || '').match(/\d{4}/);
	return year ? parseInt(year[0]) : 9999;
}

// Remove sorting markers: "*" and the control characters wrapping
// non-filing articles, e.g. "\x88Il \x89nome della rosa"
function cleanText(text) {
	return ZU.trimInternal(text.replace(/[*\x88\x89\x98\x9c]/g, ''));
}

function scrape(record, searchedISBN) {
	let item = new Zotero.Item('book');

	let [title, ...responsibility] = cleanText(record.titolo || '').split(' / ');
	item.title = title
		.replace(/^\[(.*)\]$/, '$1')
		.replace(/ : /g, ': ');
	addCreators(item, record, responsibility.join(' / '));

	// SBN sometimes writes [...] as \...!
	let imprint = cleanText(record.pubblicazione || '').replace(/\\([^\\!]*)!/g, '[$1]');
	let publication = imprint.match(/^(.*?)\s*:\s*(.*?)(?:,\s*([^,]*\d{4}[^,]*))?$/);
	if (publication) {
		let place = publication[1].split(' ; ')[0].replace(/[[\]\\]/g, '').trim();
		if (!/^s\.\s*l\./i.test(place)) item.place = place;
		let publisher = publication[2].split(' ; ')[0]
			.replace(/\s*\([^)]*\)$/, '')
			.replace(/[[\]]/g, '')
			.trim();
		if (!/^s\.\s*n\./i.test(publisher)) item.publisher = publisher;
	}
	let year = imprint.match(/\d{4}/);
	if (year) item.date = year[0];

	let extent = (record.descrizioneFisica || '').split(' ; ')[0];
	let pages = extent.match(/(\d+)\s*p\b/);
	if (pages) item.numPages = pages[1];
	let volumes = extent.match(/(\d+)\s*v\./);
	if (volumes && volumes[1] > 1) item.numberOfVolumes = volumes[1];

	if (record.collezione) {
		let series = cleanText(record.collezione).match(/^(.*?)(?: ; ([^;]+))?$/);
		item.series = series[1];
		if (series[2]) item.seriesNumber = series[2];
	}

	let language = record.linguaPubblicazione;
	if (language) item.language = LANGUAGES[language] || language;

	let isbns = getISBNs(record);
	item.ISBN = isbns.length ? isbns.join(' ') : searchedISBN;

	let dewey = (record.classificazioneDewey || '').match(/^\d{3}(?:\.\d+)?/);
	if (dewey) item.callNumber = dewey[0];

	item.libraryCatalog = 'OPAC SBN';
	// IT\ICCU\RML\0171929 -> RML0171929, the form used in SBN permalinks
	let bid = (record.codiceIdentificativo || '').match(/^IT\\ICCU\\(\w{3})\\(\d{7})$/);
	if (bid) {
		// id.sbn.it redirects to the OPAC record; its https certificate is self-signed
		item.url = `http://id.sbn.it/bid/${bid[1]}${bid[2]}`;
		item.extra = `SBN: ${bid[1]}${bid[2]}`;
	}
	item.complete();
}

// Role from the nearest role phrase in the text preceding a name
function roleFromPhrase(phrase, fallback) {
	let role = fallback;
	let nearest = -1;
	for (let [phraseRole, regex] of ROLE_PHRASES) {
		for (let match of phrase.matchAll(regex)) {
			if (match.index > nearest) {
				nearest = match.index;
				role = phraseRole;
			}
		}
	}
	return role;
}

// Text preceding the surname in a segment, or null if the surname isn't there
function textBefore(segment, surname) {
	let escaped = surname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	let match = segment.match(new RegExp(`(?<!\\p{L})${escaped}(?!\\p{L})`, 'u'));
	return match ? segment.slice(0, match.index) : null;
}

function addCreators(item, record, responsibility) {
	let seen = new Set();
	let add = (creator) => {
		let key = (creator.lastName + ', ' + (creator.firstName || '')).toLowerCase();
		if (seen.has(key)) return;
		seen.add(key);
		item.creators.push(creator);
	};

	let segments = responsibility.split(' ; ');
	let notes = (record.note || []).map(cleanText);
	let mainAuthor = record.autorePrincipale && parseName(record.autorePrincipale).name;
	if (mainAuthor) add(makeCreator(mainAuthor, 'author'));

	for (let entry of record.nomi || []) {
		let { name, label } = parseName(entry);
		let role = ROLE_LABELS[label];
		if (!role && name == mainAuthor) role = 'author';
		if (!role) {
			let surname = name.split(',')[0].trim();
			// Unlabelled names in the statement of responsibility are authors;
			// names only in a note (or nowhere) are contributors
			for (let [texts, fallback] of [[segments, 'author'], [notes, 'contributor']]) {
				let before = texts.map(text => textBefore(text, surname)).find(text => text !== null);
				if (before !== undefined) {
					role = roleFromPhrase(before, fallback);
					break;
				}
			}
		}
		add(makeCreator(name, role || 'contributor'));
	}

	// Translators often appear only in a note, e.g. "Traduzione di Valentino Maraldi"
	for (let note of notes) {
		let translator = note.match(/^(?:[Tt]raduzione|[Tt]rad\.)(?: \S+){0,3}? di ((?:[A-ZÀ-Ý][\p{L}.'’-]*\s?){2,4})$/u);
		if (translator) add(ZU.cleanAuthor(translator[1].trim().replace(/\.$/, ''), 'translator'));
	}
}

// Qualifiers in <...> that are dropped; others (e.g. places) are kept in parentheses
const DROPPED_QUALIFIER = /\d|^(papa|sant[oa]|san|beat[oa]|re|regina|imperatore|imperatrice|principe|principessa|cardinale|vescovo|arcivescovo|pseudonimo|duca|duchessa|conte|contessa)\b/i;

function parseName(entry) {
	entry = cleanText(entry);
	let label = (entry.match(/^\[([^\]]+)\]/) || [])[1];
	let name = entry.replace(/^\[[^\]]*\]/, '')
		.replace(/\s*<([^>]*)>/g, (_, qualifier) => (DROPPED_QUALIFIER.test(qualifier.trim()) ? '' : ` (${qualifier.trim()})`))
		// Particles and epithets follow " : ", e.g. "Tommaso : d'Aquino"
		.replace(/ : (?=\p{Ll})/gu, ' ');
	return { name: ZU.trimInternal(name), label };
}

function makeCreator(name, creatorType) {
	if (name.includes(',')) {
		return ZU.cleanAuthor(name, creatorType, true);
	}
	return { lastName: name, creatorType, fieldMode: 1 };
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "search",
		"input": {
			"ISBN": "9788837222130"
		},
		"items": [
			{
				"itemType": "book",
				"title": "Teologia degli animali",
				"creators": [
					{
						"firstName": "Paolo",
						"lastName": "De Benedetti",
						"creatorType": "author"
					},
					{
						"firstName": "Gabriella",
						"lastName": "Caramore",
						"creatorType": "editor"
					}
				],
				"date": "2007",
				"ISBN": "9788837222130",
				"callNumber": "241.693",
				"extra": "SBN: TO01634606",
				"language": "it",
				"libraryCatalog": "OPAC SBN",
				"numPages": "85",
				"place": "Brescia",
				"publisher": "Morcelliana",
				"series": "Uomini e profeti",
				"seriesNumber": "20",
				"url": "http://id.sbn.it/bid/TO01634606",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "search",
		"input": {
			"ISBN": "9788839936011"
		},
		"items": [
			{
				"itemType": "book",
				"title": "Etica animale: una prospettiva cristiana",
				"creators": [
					{
						"firstName": "Martin M.",
						"lastName": "Lintner",
						"creatorType": "author"
					},
					{
						"firstName": "Christoph J.",
						"lastName": "Amor",
						"creatorType": "contributor"
					},
					{
						"firstName": "Markus",
						"lastName": "Moling",
						"creatorType": "contributor"
					},
					{
						"firstName": "Valentino",
						"lastName": "Maraldi",
						"creatorType": "translator"
					}
				],
				"date": "2020",
				"ISBN": "9788839936011",
				"callNumber": "231.7",
				"extra": "SBN: PBE0151650",
				"language": "it",
				"libraryCatalog": "OPAC SBN",
				"numPages": "304",
				"place": "Brescia",
				"publisher": "Queriniana",
				"series": "Biblioteca di teologia contemporanea",
				"seriesNumber": "201",
				"shortTitle": "Etica animale",
				"url": "http://id.sbn.it/bid/PBE0151650",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "search",
		"input": {
			"ISBN": "9788831113014"
		},
		"items": [
			{
				"itemType": "book",
				"title": "Uomo e donna lo creò: catechesi sull'amore umano",
				"creators": [
					{
						"lastName": "Ioannes Paulus II",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "2007",
				"ISBN": "9788831113014",
				"extra": "SBN: RML0171929",
				"language": "it",
				"libraryCatalog": "OPAC SBN",
				"numPages": "523",
				"place": "Roma",
				"publisher": "Città Nuova",
				"shortTitle": "Uomo e donna lo creò",
				"url": "http://id.sbn.it/bid/RML0171929",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "search",
		"input": {
			"ISBN": "8804357517"
		},
		"items": [
			{
				"itemType": "book",
				"title": "Via privata",
				"creators": [
					{
						"firstName": "Valentino",
						"lastName": "Bompiani",
						"creatorType": "author"
					}
				],
				"date": "1992",
				"ISBN": "9788804357513",
				"callNumber": "070.5092",
				"extra": "SBN: LO10079015",
				"language": "it",
				"libraryCatalog": "OPAC SBN",
				"numPages": "274",
				"place": "Milano",
				"publisher": "A. Mondadori",
				"series": "Oscar narrativa",
				"seriesNumber": "1219",
				"url": "http://id.sbn.it/bid/LO10079015",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "search",
		"input": {
			"ISBN": "9788845278655"
		},
		"items": [
			{
				"itemType": "book",
				"title": "Il nome della rosa",
				"creators": [
					{
						"firstName": "Umberto",
						"lastName": "Eco",
						"creatorType": "author"
					}
				],
				"date": "2016",
				"ISBN": "9788845278655",
				"callNumber": "853.914",
				"extra": "SBN: VIA0298633",
				"language": "it",
				"libraryCatalog": "OPAC SBN",
				"numPages": "618",
				"place": "Milano",
				"publisher": "Bompiani",
				"series": "I grandi tascabili",
				"url": "http://id.sbn.it/bid/VIA0298633",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
