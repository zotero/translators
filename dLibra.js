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
	"lastUpdated": "2021-07-21 11:39:27"
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
	"dokument dźwiękowy":"audioRecording",
	"książka":"book",
	"rozdział": "bookSection",
	"artykuł":"journalArticle",
	"czasopismo":"journalArticle",
	"manuskrypt":"manuscript",
	"rękopis":"manuscript",
	"mapa": "map",
	"raport":"report",
	"praca dyplomowa":"thesis",
	"rozprawa doktorska":"thesis"
};

function detectWeb(doc, url) {
	let singleRe = /.*dlibra\/(doccontent|docmetadata|publication).*/;
	let multipleRe = /.*dlibra\/(collectiondescription|results|planned).*|.*\/dlibra\/?/;
	if (singleRe.test(url)) {
		let types = doc.evaluate('//meta[@name="DC.type"]/@content', doc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
		let type;
		for (let i = 0, length = types.snapshotLength; i < length; ++i) {
			let item = types.snapshotItem(i).textContent;
			if(POLISH_TYPE_MAPPINGS[item]) {
				type = POLISH_TYPE_MAPPINGS[item];
				break;
			}
			type = item;
		}
		return type ? type : "document";
	}
	if (multipleRe.test(url)) {
		return "multiple";
	}
	return false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		let items = {};

		let dlibra5ItemsXPath = '//ol[@class="itemlist"]/li/a | //td[@class="searchhit"]/b/a | //p[@class="resultTitle"]/b/a[@class="dLSearchResultTitle"]';
		let titles = doc.evaluate(dlibra5ItemsXPath, doc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
		if (titles.snapshotLength > 0) {
			for (let i = 0, length = titles.snapshotLength; i < length; ++i) {
				let item = titles.snapshotItem(i);
				items[item.href] = item.textContent;
			}
		}
		else {
			let dlibra6ItemsXPath = '//h2[@class="objectbox__text--title"]';
			titles = doc.evaluate(dlibra6ItemsXPath, doc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
			for (let i = 0, length = titles.snapshotLength; i < length; ++i) {
				let item = titles.snapshotItem(i);
				// skip 'Similar in FBC'
				if (item.getAttribute('title')) {
					items[item.firstElementChild.getAttribute('href')] = item.getAttribute('title');
				}
			}
		}

		Zotero.selectItems(items, function (items) {
			if (!items) {
				return true;
			}
			let objects = [];
			for (let i in items) {
				objects.push(i);
			}
			ZU.processDocuments(objects, scrape);
			return false;
		});
	}
	else {
		scrape(doc, url);
	}
	return false;
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
		let dcTypeRegex = new RegExp("<dc:type .*>(.*)</dc:type>", "gi");
		let m, type;
		while (m = dcTypeRegex.exec(rdf)) {
			if(POLISH_TYPE_MAPPINGS[m[1]]) {
				type = POLISH_TYPE_MAPPINGS[m[1]];
				break;
			}
		}
		let translator = Zotero.loadTranslator("import");
		// RDF importer
		translator.setTranslator("5e3ad958-ac79-463d-812b-a86a9235c28f");
		translator.setString(rdf);
		translator.setHandler("itemDone", function (obj, item) {
			if (item.extra) item.notes.push(item.extra);
			item.url = objUrl;
			item.extra = "";
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
	if(pdfURL.length) {
		pdfURL = pdfURL[0].textContent;
		item.attachments.push({title:"Full Text PDF", url:pdfURL, mimeType:"application/pdf"});
	}
	item.attachments.push({document:doc, title:"Snapshot"});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://cyfrowa.bibliotekakolbuszowa.pl/dlibra/docmetadata?id=945&from=&dirids=1&ver_id=&lp=4&QI=",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Gazeta Świerczowska. Nr 5 (2020)",
				"creators": [
					{
						"firstName": "Janusz",
						"lastName": "Tokarz",
						"creatorType": "author"
					}
				],
				"date": "2020",
				"language": "pol",
				"libraryCatalog": "dLibra",
				"publisher": "Sołectwo Świerczów",
				"rights": "Prawa zastrzeżone - dostęp nieograniczony / Rights Reserved - Free Access",
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
						"tag": "Rada sołecka"
					},
					{
						"tag": "Świerczów"
					}
				],
				"notes": [],
				"seeAlso": [],
				"url": "http://cyfrowa.bibliotekakolbuszowa.pl/dlibra/docmetadata?id=945"
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
				"url": "https://demo.dl.psnc.pl/dlibra/publication/1502/edition/1243",
				"language": "pol",
				"libraryCatalog": "dLibra",
				"publisher": "Lwów, Nakładem Księgarni F. H. Richtera. (H. Altbenberg)",
				"rights": "Open Access",
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
	}
]
/** END TEST CASES **/
