{
	"translatorID": "68a54283-67e0-4e1c-ad3d-5b699868b194",
	"translatorType": 4,
	"label": "Antikvarium.hu",
	"creator": "Velősy Péter Kristóf",
	"target": "^https?://(www\\.)?antikvarium\\.hu/",
	"minVersion": "3.0",
	"maxVersion": null,
	"priority": 200,
	"inRepository": true,
	"browserSupport": "gcsibv",
	"lastUpdated": "2017-09-30 00:00:00"
}
/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2017 Velősy Péter Kristóf
	
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


//Zotero attr() and text() functions:
function attr(docOrElem,selector,attr,index){var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);return elem?elem.getAttribute(attr):null}function text(docOrElem,selector,index){var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);return elem?elem.textContent:null}

function detectWeb(doc, url) {
	if (url.includes('konyv')) {
		return "book";
	} else {
		return null;
	}
}

function doWeb(doc, url) {
	var newItem = new Zotero.Item('book');

	newItem.title = text(document, '[itemprop=name]', 0).trim();

	var subtitle = text(document, '[itemprop=alternateName]', 0) ? text(document, '[itemprop=alternateName]', 0).trim() : null;
	if (subtitle) {
		newItem.title = newItem.title + ': ' + capitalizeHungarianTitle(subtitle, true);
	}

	var authors = Array.from(document.querySelectorAll('[itemprop=author]')).map(x => cleanHungarianAuthor(x.innerText));
	authors.forEach(x => newItem.creators.push(x));

	var abstract = text(document, 'fulszovegFull', 0) || text(document, 'eloszoFull', 0);
	if (abstract) {
		newItem.abstractNote = abstract.replace(' Vissza', '').trim();
	}

	var seriesElement = document.getElementById('konyvAdatlapSorozatLink');
	if (seriesElement) {
		newItem.series = seriesElement.innerText;
		newItem.seriesNumber = getElementByInnerText('th', 'Kötetszám:').parentElement.children[1].innerText;
		newItem.volume = newItem.seriesNumber;
	}

	var publisherElement = document.querySelector('[itemprop=publisher]');
	if (publisherElement) {

		var publisherName = text(publisherElement, '[itemprop=name]', 0);
		if (publisherName) {
			newItem.publisher = publisherName;
		}

		var publisherPlace = text(publisherElement, '[itemprop=address]', 0);
		if (publisherPlace) {
			newItem.place = publisherPlace.replace('(', '').replace(')', '');
		}
	}

	var date = text('[itemprop=datePublished]');
	if (date) {
		newItem.date = date;
	}

	var numPages = text(document, '[itemprop=numberOfPages]', 0);
	if (numPages) {
		newItem.numPages = numPages;
	}

	var lng = text(document, '[itemprop=inLanguage]', 0);
	if (lng) {
		newItem.language = lng;
	}

	var isbnElement = getElementByInnerText('th', 'ISBN:');
	if (isbnElement) {
		newItem.isbn = isbnElement.parentElement.children[1].innerText;
	}

	//TODO cannot refactor this by using text() because text() cuts newline characters
	var contentsElement = document.getElementById('tartalomFull');
	if (contentsElement) {
		newItem.extra = contentsElement.innerText;
	}

	newItem.attachments.push({ document: doc, title: "Antikvarium.hu Snapshot", mimeType: "text/html" });

	newItem.complete();
}

function getElementByInnerText(elementType, innerText) {
	var tags = document.getElementsByTagName(elementType);

	for (var i = 0; i < tags.length; i++) {
		if (tags[i].textContent == innerText) {
			return tags[i];
		}
	}

	return null;
}

function cleanHungarianAuthor(authorName) {
	if (authorName.includes(',')) {
		return Zotero.Utilities.cleanAuthor(authorName, 'author', true);
	} else {
		var author = Zotero.Utilities.cleanAuthor(authorName, 'author', false);
		var firstName = author.lastName;
		var lastName = author.firstName;
		author.firstName = firstName;
		author.lastName = lastName;
		return author;
	}
}

function capitalizeHungarianTitle(title) {
	title = title[0].toUpperCase() + title.substring(1).toLowerCase();
	var words = title.split(/[ !"#$%&'()*+,-./:;<=>?@[\]^_`{|}~]/);
	words.forEach(w => {
		if (isRomanNumeral(w)) {
			title = title.replace(w, w.toUpperCase());
		}
	});
	return title;
}

function isRomanNumeral(word) {
	var romanRegex = /^M{0,4}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/;
	return word.toUpperCase().match(romanRegex) ? true : false;
}
