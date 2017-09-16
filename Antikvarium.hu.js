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
	"lastUpdated": "2017-09-15 00:00:00"
}

function detectWeb(doc, url) {
	if (url.includes('konyv')) {
		return "book";
	} else {
		return null;
	}
}

function doWeb(doc, url) {
	var newItem = new Zotero.Item('book');

	newItem.title = document.querySelector('[itemprop=name]').innerText;

	var subtitle = document.querySelector('[itemprop=alternateName]') ? document.querySelector('[itemprop=alternateName]').innerText : null;
	if (subtitle) {
		newItem.title = newItem.title + ': ' + capitalizeHungarianTitle(subtitle, true);
	}

	var authors = Array.from(document.querySelectorAll('[itemprop=author]')).map(x => cleanHungarianAuthor(x.innerText));
	authors.forEach(x => newItem.creators.push(x));

	var abstractElement = document.getElementById('fulszovegFull') || document.getElementById('eloszoFull');
	if (abstractElement) {
		newItem.abstractNote = abstractElement.innerText.replace(' Vissza', '').trim();
	}

	var seriesElement = document.getElementById('konyvAdatlapSorozatLink');
	if (seriesElement) {
		newItem.series = seriesElement.innerText;
		newItem.seriesNumber = getElementByInnerText('th', 'Kötetszám:').parentElement.children[1].innerText;
		newItem.volume = newItem.seriesNumber;
	}

	var publisherElement = document.querySelector('[itemprop=publisher]');
	if (publisherElement) {
		newItem.publisher = publisherElement.querySelector('[itemprop=name]').innerText;
		newItem.place = publisherElement.querySelector('[itemprop=address]').innerText.replace('(', '').replace(')', '');
	}

	var dateElement = document.querySelector('[itemprop=datePublished]');
	if (dateElement) {
		newItem.date = dateElement.innerText;
	}

	var numPagesElement = document.querySelector('[itemprop=numberOfPages]');
	if (numPagesElement) {
		newItem.numPages = numPagesElement.innerText;
	}

	var lngElement = document.querySelector('[itemprop=inLanguage]');
	if (lngElement) {
		newItem.language = lngElement.innerText;
	}

	var isbnElement = getElementByInnerText('th', 'ISBN:');
	if (isbnElement) {
		newItem.isbn = isbnElement.parentElement.children[1].innerText;
	}

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
