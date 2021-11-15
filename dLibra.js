{
	"translatorID": "915e3ae2-afa9-4b1d-9780-28ed3defe0ab",
	"label": "dLibra",
	"creator": "Pawel Kolodziej <p.kolodziej@gmail.com> and Kamil Gronowski <kgronowski@man.poznan.pl>",
	"target": "/.*dlibra/(doccontent|docmetadata|collectiondescription|results)|/dlibra/?",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-10-21 04:23:31"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2021 Pawel Kolodziej, Kamil Gronowski

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

let POLISH_TYPE_MAPPINGS = {
	"dokument dźwiękowy": "audioRecording",
	książka: "book",
	rozdział: "bookSection",
	artykuł: "journalArticle",
	czasopismo: "journalArticle",
	Article: "journalArticle", // not Polish, but also present sometimes
	manuskrypt: "manuscript",
	rękopis: "manuscript",
	mapa: "map",
	raport: "report",
	"praca dyplomowa": "thesis",
	"rozprawa doktorska": "thesis"
};

function detectWeb(doc, url) {
	let singleRe = /dlibra\/(doccontent|docmetadata|publication)/;
	if (singleRe.test(url)) {
		let types = Array.from(doc.querySelectorAll('meta[name="DC.type"]')).map(meta => meta.content);
		let type;
		for (let possibleType of types) {
			if (POLISH_TYPE_MAPPINGS[possibleType]) {
				type = POLISH_TYPE_MAPPINGS[possibleType];
				break;
			}
			type = possibleType;
		}
		return (type && ZU.itemTypeExists(type)) ? type : "document";
	}
	if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (!items) {
				return true;
			}
			ZU.processDocuments(Object.keys(items), scrape);
			return false;
		});
	}
	else {
		scrape(doc, url);
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	let items = {};
	let found = false;
	// dLibra 5
	let rows = doc.querySelectorAll('.dLSearchResultTitle');
	if (rows.length) {
		for (let row of rows) {
			let href = row.href;
			let title = ZU.trimInternal(text(row, '#src_titleLink_fullTitle > span.src_titleLink_title'));
			if (!href || !title) continue;
			if (checkOnly) return true;
			found = true;
			items[href] = title;
		}
	}
	else {
		// dLibra 6
		rows = doc.querySelectorAll('.objectbox__text--title');
		if (!rows.length) rows = doc.querySelectorAll('.item__link--title');
		for (let row of rows) {
			// skip 'Similar in FBC'
			if (row.getAttribute('title')) {
				let href = attr(row, 'a', 'href') || row.href;
				let title = ZU.trimInternal(
					row.classList.contains('item__link--title')
						? row.textContent
						: row.getAttribute('title'));
				if (!href || !title) continue;
				if (checkOnly) return true;
				found = true;
				items[href] = title;
			}
		}
	}
	return found ? items : false;
}

function scrape(doc, url) {
	let reDlibra5Single = new RegExp("((.*/dlibra)/(?:doccontent|docmetadata|publication).*[?&]id=([0-9]*)).*");
	let m = reDlibra5Single.exec(url);
	if (m) {
		dlibraScrape(doc, m[1], m[2], "e", m[3]);
	}
	else {
		let reDlibra6Single = new RegExp("((.*/dlibra)/publication/([0-9]*)(/edition/([0-9]*))?).*");
		let m = reDlibra6Single.exec(url);
		if (m) {
			if (m[4]) {
				dlibraScrape(doc, m[1], m[2], "e", m[5]);
			}
			else {
				dlibraScrape(doc, m[1], m[2], "p", m[3]);
			}
		}
	}
}

function dlibraScrape(doc, objUrl, baseUrl, objType, id) {
	ZU.HTTP.doGet(baseUrl + "/rdf.xml?type=" + objType + "&id=" + id, function (rdf) {
		rdf = rdf.replace(/<\?xml[^>]*\?>/, "");
		let dcTypeRegex = /<dc:type[^>]*>([^<]+)<\/dc:type>/gi;
		let m, type;
		while ((m = dcTypeRegex.exec(rdf))) {
			if (POLISH_TYPE_MAPPINGS[m[1]]) {
				type = POLISH_TYPE_MAPPINGS[m[1]];
				break;
			}
		}
		let translator = Zotero.loadTranslator("import");
		// RDF importer
		translator.setTranslator("5e3ad958-ac79-463d-812b-a86a9235c28f");
		translator.setString(rdf);
		translator.setHandler("itemDone", function (obj, item) {
			item.url = objUrl;
			item.itemID = "";
			addAttachments(doc, item);
			item.complete();
		});
		translator.getTranslatorObject(function (trans) {
			if (type) {
				trans.defaultUnknownType = type;
			}
			trans.doImport();
		});
	});
}

function addAttachments(doc, item) {
	let pdfURL = ZU.xpath(doc, '//meta[@name="citation_pdf_url"]/@content');
	if (pdfURL.length) {
		pdfURL = pdfURL[0].textContent;
		item.attachments.push({ title: "Full Text PDF", url: pdfURL, mimeType: "application/pdf" });
	}
	item.attachments.push({ document: doc, title: "Snapshot" });
}

function attr(docOrElem, selector, attr, index) {
	let elem = index ? docOrElem.querySelectorAll(selector).item(index) : docOrElem.querySelector(selector);
	return elem ? elem.getAttribute(attr) : null;
}

function text(docOrElem, selector, index) {
	let elem = index ? docOrElem.querySelectorAll(selector).item(index) : docOrElem.querySelector(selector);
	return elem ? elem.textContent : null;
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://mbc.cyfrowemazowsze.pl/dlibra/docmetadata?id=84344",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Przegląd Sportowy : tygodnik ilustrowany, poświęcony wszelkim gałęziom sportu : oficjalny organ Polskiego Związku Piłki Nożnej oraz Krakowskiego, Warszawskiego, Lwowskiego i Łódzkiego Związku Okręgowego Piłki Nożnej. R. 2, 1922 nr 6 (10 II)",
				"creators": [
					{
						"firstName": "Tadeusz (1889-1960) Red odpowiedzialny",
						"lastName": "Synowiec",
						"creatorType": "author"
					}
				],
				"date": "1922",
				"abstractNote": "16 s. : il. ; 31 cm",
				"language": "pol",
				"libraryCatalog": "dLibra",
				"publisher": "Dembiński, Aleksander",
				"rights": "Licencja udzielona Bibliotece Głównej im. Jędrzeja Śniadeckiego Akademii Wychowania Fizycznego Józefa Piłsudskiego w Warszawie",
				"shortTitle": "Przegląd Sportowy",
				"url": "http://mbc.cyfrowemazowsze.pl/dlibra/docmetadata?id=84344",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "wiadomości sportowe"
					},
					{
						"tag": "sport"
					},
					{
						"tag": "czasopismo sportowe"
					},
					{
						"tag": "prasa polska"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://demo.dl.psnc.pl/dlibra/planned?action=SimpleSearchAction&type=-6&p=0",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://demo.dl.psnc.pl/dlibra/collectiondescription/1",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://demo.dl.psnc.pl/dlibra/results?q=*&action=SimpleSearchAction&type=-6&p=0",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://demo.dl.psnc.pl/dlibra/publication/1502/edition/1243",
		"items": [
			{
				"itemType": "book",
				"title": "Pan Tadeusz",
				"creators": [
					{
						"firstName": "Adam",
						"lastName": "Mickiewicz",
						"creatorType": "author"
					}
				],
				"date": "1882",
				"abstractNote": "Epilog",
				"language": "pol",
				"libraryCatalog": "dLibra",
				"publisher": "Lwów, Nakładem Księgarni F. H. Richtera. (H. Altbenberg)",
				"rights": "Open Access",
				"url": "https://demo.dl.psnc.pl/dlibra/publication/1502/edition/1243",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "poezja"
					},
					{
						"tag": "poezja polska"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://journals.pan.pl/dlibra/publication/99314/edition/118913/content",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Test laboratoryjny dla oceny tunelowania metodą EPB: wyniki testów dla dwóch różnych gruntów ziarnistych",
				"creators": [
					{
						"firstName": "Daniele",
						"lastName": "Peila",
						"creatorType": "author"
					},
					{
						"firstName": "Luca",
						"lastName": "Borio",
						"creatorType": "author"
					}
				],
				"date": "2011",
				"ISSN": "0860-0953",
				"libraryCatalog": "dLibra",
				"publicationTitle": "Gospodarka Surowcami Mineralnymi - Mineral Resources Management; 2011; No 1; 85-100",
				"shortTitle": "Test laboratoryjny dla oceny tunelowania metodą EPB",
				"url": "https://journals.pan.pl/dlibra/publication/99314/edition/118913",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "EPB tunnelling"
					},
					{
						"tag": "Nauki Techniczne"
					},
					{
						"tag": "risk management"
					},
					{
						"tag": "soil conditioning"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://journals.pan.pl/dlibra/results?q=test&action=SimpleSearchAction&mdirids=&type=-6&startstr=_all&p=0",
		"items": "multiple"
	}
]
/** END TEST CASES **/
