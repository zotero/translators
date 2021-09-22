{
	"translatorID": "68a54283-67e0-4e1c-ad3d-5b699868b194",
	"label": "Antikvarium.hu",
	"creator": "Velősy Péter Kristóf",
	"target": "^https?://(www\\.)?antikvarium\\.hu/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-09-22 19:39:49"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2017-2021 Velősy Péter Kristóf
	
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
	if (url.includes('konyv')) {
		return "book";
	}
	else if (url.includes('index.php?type=search') && getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}


function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.src-result-book');
	for (let row of rows) {
		var href = attr(row, '#searchResultKonyv-csempes', 'href');
		var title = ZU.trimInternal(text(row, '.book-title-src'));
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}


function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (items) ZU.processDocuments(Object.keys(items), scrape);
		});
	}
	else {
		scrape(doc, url);
	}
}


function scrape(doc, _url) {
	var newItem = new Zotero.Item('book');

	newItem.title = text(doc, '[itemprop=name]', 0).trim();

	var subtitle = text(doc, '[itemprop=alternateName]', 0) ? text(doc, '[itemprop=alternateName]', 0).trim() : null;
	if (subtitle) {
		newItem.title = newItem.title + ': ' + capitalizeHungarianTitle(subtitle, true);
	}

	var authors = Array.from(doc.querySelectorAll('[itemprop=author]')).map(x => cleanHungarianAuthor(x.innerText));
	authors.forEach(x => newItem.creators.push(x));

	var abstract = text(doc, 'fulszovegFull', 0) || text(doc, 'eloszoFull', 0);
	if (abstract) {
		newItem.abstractNote = abstract.replace(' Vissza', '').trim();
	}

	var seriesElement = doc.getElementById('konyvAdatlapSorozatLink');
	if (seriesElement && seriesElement.length) {
		newItem.series = seriesElement.innerText;
		newItem.seriesNumber = getElementByInnerText('th', 'Kötetszám:').parentElement.children[1].innerText;
		newItem.volume = newItem.seriesNumber;
	}

	var publisherName = text(doc, '#konyvAdatlapKiadoLink [itemprop=name]')
		|| text(doc, '[itemprop=name]', 1);
	if (publisherName) {
		newItem.publisher = publisherName;
	}

	var publisherPlace = firstText(doc, '[itemprop=address]');
	if (publisherPlace) {
		newItem.place = publisherPlace.replace('(', '').replace(')', '');
	}
		
	newItem.date = firstText(doc, '[itemprop=datePublished]');

	newItem.numPages = firstText(doc, '[itemprop=numberOfPages]');
	
	newItem.language = firstText(doc, '[itemprop=inLanguage]');

	var isbnElement = getElementByInnerText(doc, 'th', 'ISBN:');
	if (isbnElement) {
		newItem.ISBN = isbnElement.parentElement.children[1].innerText;
	}

	var contentsElement = doc.getElementById('tartalomFull');
	if (contentsElement) {
		newItem.notes.push({ note: contentsElement.innerText });
	}

	newItem.attachments.push({ document: doc, title: "Antikvarium.hu Snapshot", mimeType: "text/html" });

	newItem.complete();
}

/**
 * Return the first element matching the selector with non-empty text.
 */
function firstText(docOrElem, selector) {
	for (let elem of docOrElem.querySelectorAll(selector)) {
		let elemText = elem.textContent.trim();
		if (elemText) return elemText;
	}
	
	return '';
}

function getElementByInnerText(doc, elementType, innerText) {
	var tags = doc.getElementsByTagName(elementType);

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
	}
	else {
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
	words.forEach((w) => {
		if (isRomanNumeral(w)) {
			title = title.replace(w, w.toUpperCase());
		}
	});
	return title;
}

function isRomanNumeral(word) {
	var romanRegex = /^M{0,4}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/;
	return !!word.toUpperCase().match(romanRegex);
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.antikvarium.hu/konyv/erdei-janos-atlasz-almai-82276",
		"items": [
			{
				"itemType": "book",
				"title": "Atlasz álmai: Borges a szovjetunióban/az öröklét előszobája és egyéb történetek",
				"creators": [
					{
						"firstName": "János",
						"lastName": "Erdei",
						"creatorType": "author"
					}
				],
				"date": "1991",
				"language": "Magyar",
				"libraryCatalog": "Antikvarium.hu",
				"numPages": "140",
				"place": "Budapest",
				"publisher": "Aero & Rádió Kft.",
				"shortTitle": "Atlasz álmai",
				"attachments": [
					{
						"title": "Antikvarium.hu Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "TARTALOM\nElőszó\t5\nMásodik ébredés\t7\nMegvilágosodás\t9\nSzemelvények Gusavson műveiből\t17\nHalvány kétkedés\t17\nMegjegyzés\t20\nJótékony hazugság\t21\nA föltámadt Krisztus dilemmája\t23\nÁbrahám\t24\nSzerelmes ébredés és álom\t27\nRáébredés: a rabszolga\t33\nDacos ébredés, avagy az ötödik evangélista\t35\nElalvás előtt I.\t40\nKét álmodó\t40\nElalvás előtt II.\t43\nA kivégzési jegy\t45\nGyújtópont\t53\nFelvillanás\t55\nAngyali üdvözlet\t63\nA fellendülés okai\t65\nFéreg által homályosan\t71\nBorges a Szovjetunióban\t81\nA nevetés köve\t89\nA Nagy Rendszer\t93\nTúl az álmokon: az igazhitű\t97\nAz öröklét előszobája\t101\nElragadottság\t109\nA legvidámabb eretnek\t113\nÚjabb fejlemények az Oidipusz-ügyben\t117\nVisszahívták a Szfinxet!\t121\nAz egyetlen lehetőség\t125\nZavaros álom: letisztulás\t127\nN. és a tenger\t135\nUtószó\t137"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.antikvarium.hu/index.php?type=search&ksz=atlasz&reszletes=0&newSearch=1&searchstart=ksz&interfaceid=101",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.antikvarium.hu/konyv/peter-harrison-mary-harrison-misztikus-erok-51027-0",
		"items": [
			{
				"itemType": "book",
				"title": "Misztikus erők: Mistic forces/testen túli tapasztalatok",
				"creators": [
					{
						"firstName": "Harrison",
						"lastName": "Peter",
						"creatorType": "author"
					},
					{
						"firstName": "Harrison",
						"lastName": "Mary",
						"creatorType": "author"
					},
					{
						"firstName": "Nóra",
						"lastName": "Rohonczi",
						"creatorType": "author"
					}
				],
				"ISBN": "9789637994043",
				"language": "Magyar",
				"libraryCatalog": "Antikvarium.hu",
				"numPages": "274",
				"place": "Budapest",
				"publisher": "Pesti Szalon Könyvkiadó",
				"shortTitle": "Misztikus erők",
				"attachments": [
					{
						"title": "Antikvarium.hu Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "TARTALOM\nKöszönetnyilvánítás\t3\nElőszó\t5\nBevezetés\t9\nMi a TTT?\t13\nA fény\t23\nA magaslati nézőpont\t35\nA mennyországban?\t49\nA gyógyító erő\t55\nKülönös hatóerők\t75\nÁllatok\t91\nZene\t105\nA határterület\t111\nIdőutazások\t121\nA döntés\t141\nAz ezüstzsinór\t151\nEgybeesések\t163\nA fátum\t173\nMenekülés\t193\nGyermekek\t201\nA halálfélelem legyőzése\t213\nMegérzések\t231\nAz okkultizmus veszélyei\t235\nA lélek illata\t247\nAngyalok\t257\nPozitív végkövetkeztetések\t273"
					}
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
