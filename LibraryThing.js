{
	"translatorID": "5fee8b6c-8208-4be9-8d3e-dda9fe3c8671",
	"label": "LibraryThing",
	"creator": "Jan Baykara",
	"target": "^https?://(www\\.)?librarything\\.com/(catalog\\.php|catalog_bottom\\.php|catalog/)",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 1,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-08-30 17:52:52"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2026 Jan Baykara

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

/* eslint-disable camelcase */

const API_MAX_BOOKS = 20000;

function queryParam(url, name) {
	try {
		return new URL(url).searchParams.get(name) || '';
	}
	catch (e) {
		return '';
	}
}

function getUserId(url) {
	let view = queryParam(url, 'view');
	if (view) return view;
	try {
		let match = new URL(url).pathname.match(/\/catalog\/([^/]+)/i);
		if (match && match[1] && !/\.php$/i.test(match[1])) {
			return decodeURIComponent(match[1]);
		}
	}
	catch (e) {}
	return null;
}

function getCollectionFilter(url) {
	let fromQuery = queryParam(url, 'collection');
	if (fromQuery && fromQuery !== '-1') return fromQuery;
	try {
		let match = new URL(url).pathname.match(/\/catalog\/[^/]+\/([^/]+)\/?$/i);
		if (match && match[1] && !/\.php$/i.test(match[1])) {
			return decodeURIComponent(match[1]);
		}
	}
	catch (e) {}
	return '';
}

function originFromUrl(url) {
	try {
		return new URL(url).origin;
	}
	catch (e) {
		return 'https://www.librarything.com';
	}
}

function slugify(value) {
	return String(value || '')
		.toLowerCase()
		.replace(/['’]/g, '')
		.replace(/[^a-z0-9]+/g, '')
		.trim();
}

function widgetKeyFromDoc(doc) {
	if (!doc || !doc.documentElement) return '';
	let html = doc.documentElement.innerHTML || '';
	let match = html.match(/api_getdata\.php[^"'<\s]*[?&]key=(\d+)/i)
		|| html.match(/[?&]key=(\d{6,})/);
	return match ? match[1] : '';
}

function booksFromPayload(data) {
	let books = data && data.books;
	if (!books || typeof books !== 'object' || Array.isArray(books)) {
		return [];
	}
	return Object.keys(books)
		.map((id) => {
			let book = books[id];
			if (!book || typeof book !== 'object') return null;
			if (!book.book_id) book.book_id = id;
			return book;
		})
		.filter(Boolean)
		.sort((a, b) => String(a.title || '').localeCompare(String(b.title || ''), undefined, { sensitivity: 'base' }));
}

function bookCollections(book) {
	let cols = book && book.collections;
	if (!cols || typeof cols !== 'object') return [];
	return Object.keys(cols).map(id => ({ id, name: String(cols[id] || '').trim() }));
}

function bookMatchesCollection(book, filter) {
	if (!filter) return true;
	let wanted = slugify(filter);
	for (let row of bookCollections(book)) {
		if (row.id === filter) return true;
		if (slugify(row.name) === wanted) return true;
		if (row.name.toLowerCase() === String(filter).toLowerCase()) return true;
	}
	return false;
}

function addCreator(item, name, useComma) {
	name = ZU.trimInternal(name || '').replace(/,$/, '');
	if (!name) return;
	let creator = ZU.cleanAuthor(name, 'author', !!useComma);
	if (creator.lastName || creator.firstName) {
		item.creators.push(creator);
	}
}

function isbnForBook(book) {
	return String((book && (book.ISBN || book.ISBN_cleaned)) || '').trim();
}

function detectWeb(_doc, url) {
	if (getUserId(url)) {
		return 'multiple';
	}
	return false;
}

function itemLabel(book) {
	let title = ZU.trimInternal(book.title || '') || 'Untitled';
	let author = ZU.trimInternal(book.author_fl || book.author_lf || '');
	return author ? `${title} (${author})` : title;
}

// Public catalogs are available from /api_getdata.php without a widget key.
async function fetchCatalog(url, userid, doc) {
	let params = new URLSearchParams({
		userid,
		resultsets: 'books',
		max: String(API_MAX_BOOKS),
		booksort: 'title',
		responseType: 'json',
		showTags: '1',
		showCollections: '1',
	});
	let tag = queryParam(url, 'tag');
	if (tag) params.set('tagList', tag);
	let key = widgetKeyFromDoc(doc);
	if (key) params.set('key', key);

	let data = await requestJSON(`${originFromUrl(url)}/api_getdata.php?${params}`);
	let books = booksFromPayload(data);
	let collectionFilter = getCollectionFilter(url);
	if (collectionFilter) {
		books = books.filter(book => bookMatchesCollection(book, collectionFilter));
	}
	return books;
}

function scrape(book, pageUrl) {
	let item = new Zotero.Item('book');
	item.title = ZU.trimInternal(book.title || '') || 'Untitled';
	if (book.author_lf) {
		addCreator(item, book.author_lf, true);
	}
	else if (book.author_fl) {
		addCreator(item, book.author_fl, false);
	}
	if (book.publicationdate) {
		item.date = String(book.publicationdate).trim();
	}
	let isbn = isbnForBook(book);
	if (isbn) {
		item.ISBN = isbn;
	}
	if (book.language_main) {
		item.language = String(book.language_main).trim();
	}
	let origin = originFromUrl(pageUrl);
	if (isbn) {
		item.url = `${origin}/isbn/${isbn.replace(/-/g, '')}`;
	}
	else {
		item.url = String(pageUrl).split('#')[0];
	}
	if (Array.isArray(book.tags)) {
		for (let tag of book.tags) {
			tag = String(tag || '').trim();
			if (tag) item.tags.push(tag);
		}
	}
	item.libraryCatalog = 'LibraryThing';
	item.complete();
}

async function doWeb(doc, url) {
	let userid = getUserId(url);
	if (!userid) return;
	let books = await fetchCatalog(url, userid, doc);
	if (!books.length) {
		Z.debug(`LibraryThing: no books returned for ${userid}`);
		return;
	}
	let items = {};
	for (let book of books) {
		let id = book.book_id;
		if (id) {
			items[id] = itemLabel(book);
		}
	}
	let selected = await Zotero.selectItems(items);
	if (!selected) return;
	let byId = new Map(books.map(book => [String(book.book_id), book]));
	for (let id of Object.keys(selected)) {
		let book = byId.get(id);
		if (book) scrape(book, url);
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.librarything.com/catalog.php?view=HermesAmaraArchive&viewstyle=5",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.librarything.com/catalog/HermesAmaraArchive",
		"items": "multiple"
	}
]
/** END TEST CASES **/
