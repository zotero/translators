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
	"lastUpdated": "2021-02-26 11:45:18"
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

function detectWeb(doc, url) {
	let singleRe = /.*dlibra\/(doccontent|docmetadata|publication).*/;
	let multipleRe = /.*dlibra\/(collectiondescription|results|planned).*|.*\/dlibra\/?/;
	if (singleRe.test(url)) {
		return "document";
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
	let reDlibra5Single = new RegExp("(.*/dlibra)/(?:doccontent|docmetadata|publication).*[?&]id=([0-9]*).*");
	let m = reDlibra5Single.exec(url);
	if (m) {
		dlibra5Scrape(m[1], m[2]);
	}
	else {
		dlibra6Scrape(doc, url);
	}
}

function dlibra5Scrape(baseUrl, id) {
	ZU.HTTP.doGet(baseUrl + "/rdf.xml?type=e&id=" + id, function (rdf) {
		rdf = rdf.replace(/<\?xml[^>]*\?>/, "");
		let translator = Zotero.loadTranslator("import");
		// RDF importer
		translator.setTranslator("5e3ad958-ac79-463d-812b-a86a9235c28f");
		translator.setString(rdf);
		translator.setHandler("itemDone", function (obj, item) {
			if (item.extra) item.notes.push(item.extra);
			item.extra = "";
			item.itemID = "";
			item.complete();
		});
		translator.getTranslatorObject(function (trans) {
			trans.defaultUnknownType = 'document';
			trans.doImport();
		});
	});
}

function dlibra6Scrape(doc, url) {
	let translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	translator.getTranslatorObject(function (trans) {
		trans.doWeb(doc, url);
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://cyfrowa.bibliotekakolbuszowa.pl/dlibra/docmetadata?id=945&from=&dirids=1&ver_id=&lp=4&QI=",
		"items": [
			{
				"itemType": "document",
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
				"attachments": [],
				"tags": [
					{
						"tag": "Rada sołecka"
					},
					{
						"tag": "Świerczów"
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
				"itemType": "document",
				"title": "Pan Tadeusz",
				"creators": [
					{
						"firstName": "Adam",
						"lastName": "Mickiewicz",
						"creatorType": "author"
					}
				],
				"date": "1882",
				"abstractNote": "Adam Mickiewicz, Pan Tadeusz, poezja polska, ilustracje: E. M. Andriolli. (Skan POLONA)",
				"url": "https://demo.dl.psnc.pl/dlibra/publication/1502/edition/1243",
				"language": "pol",
				"libraryCatalog": "demo.dl.psnc.pl",
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
