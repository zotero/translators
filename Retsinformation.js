{
	"translatorID": "feef66bf-4b52-498f-a586-8e9a99dc07a0",
	"label": "Retsinformation",
	"creator": "Roald Frøsig and Abe Jellinek",
	"target": "^https?://(www\\.)?retsinformation\\.dk/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-06-01 19:31:46"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2021 Roald Frøsig and Abe Jellinek

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

// Retsinformation exposes two types of data: ELI metadata in the HTML and a
// custom XML schema via a separate GET request. ELI is standard and their XML
// is not, so it would be great to use the ELI... but unfortunately, it's
// inserted client-side by React. in order to make this translator work without
// a hidden browser, we'll use the XML.

function detectWeb(doc, url) {
	if (getSearchResults(doc, url, true)) {
		return "multiple";
	}
	else if (url.includes("/eli/")) {
		return getType(doc);
	}
	return false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		Z.selectItems(getSearchResults(doc, url), function (selectedItems) {
			if (!selectedItems) return;
			var urls = [];
			for (var i in selectedItems) {
				urls.push(i);
			}
			ZU.processDocuments(urls, scrape);
		});
	}
	else {
		scrape(doc, url);
	}
}

function getSearchResults(doc, url, checkOnly) {
	var titles = doc.querySelectorAll("a.document-title");

	if (checkOnly || !titles.length) return !!titles.length;

	var items = {};
	for (var i = 0; i < titles.length; i++) {
		items[titles[i].href] = ZU.trimInternal(titles[i].textContent);
	}
	
	return items;
}

function scrape(doc, url) {
	ZU.processDocuments(url + '/xml', function (xml) {
		let item = new Zotero.Item(getType(xml));
		item.title = text(xml, 'Meta DocumentTitle');
		item.shortTitle = text(xml, 'Meta PopularTitle');
		
		let number = text(xml, 'Meta Number');
		if (number) {
			let documentType = text(xml, 'Meta DocumentType');
			if (documentType.match(/BSF|Beslutningsforslag som fremsat/)) {
				// the HTML is more authoritative here
				number = text(doc, '.m-0');
			}
			else {
				number = documentType.substring(0, 3) + ' nr ' + number;
			}
		}
		
		let date = text(xml, 'Meta DiesSigni');
		// we could go with <DateOfSubmit>, but it sometimes seems wrong.
		// for example: https://www.retsinformation.dk/eli/lta/2015/167/xml
		// a 2015 bill with a 2021 <DateOfSubmit>.
		// for that bill, the old test wants the 2015 date.
		//
		// but then see this: https://www.retsinformation.dk/eli/ft/20091BB00193/xml
		// the old test for that page wants the <DateOfSubmit>, one day later
		// than the <DiesSigni>.
		//
		// this is confusing, so i'll stick with the <DiesSigni> for now and
		// update old tests.

		if (item.itemType == 'statute') {
			item.publicLawNumber = number;
			item.dateEnacted = date;
		}
		else if (item.itemType == 'case') {
			item.docketNumber = number;
			item.dateDecided = date;
		}
		else if (item.itemType == 'bill') {
			item.billNumber = number;
			item.date = date;
		}
		
		item.creators = [{
			creatorType: 'author',
			lastName: text(xml, 'Meta Ministry'),
			fieldMode: 1
		}];
		item.url = url;
		item.complete();
	});
}

function getType(doc) {
	// if this is called on the XML, we'll get the DocumentType element.
	// if called on the HTML, fall back on a (not very good) class selector.
	// it's alright if the HTML gives us junk - we'll figure out the real type
	// from the XML.
	var documentType = text(doc, 'Meta DocumentType, .m-0');
	if (/ADI|AND|BEK|BKI|BST|CIR|CIS|DSK|FIN|KON|LBK|LOV|LTB|PJE|SKR|VEJ|ÅBR/
		.test(documentType)) {
		return "statute";
	}

	if (/DOM|AFG|KEN|UDT/.test(documentType)) {
		return "case";
	}

	if (/\d{3}|BSF|Beslutningsforslag/.test(documentType)) {
		return "bill";
	}

	return "webpage";
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.retsinformation.dk/eli/lta/2015/167",
		"defer": true,
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Bekendtgørelse af lov om dag-, fritids- og klubtilbud m.v. til børn og unge (dagtilbudsloven)",
				"creators": [
					{
						"creatorType": "author",
						"lastName": "Børne- og Undervisningsministeriet",
						"fieldMode": 1
					}
				],
				"dateEnacted": "2015-02-20",
				"publicLawNumber": "LBK nr 167",
				"shortTitle": "Dagtilbudsloven",
				"url": "https://www.retsinformation.dk/eli/lta/2015/167",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.retsinformation.dk/eli/lta/2013/1490",
		"defer": true,
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Bekendtgørelse om regnskab for folkehøjskoler, efterskoler, husholdningsskoler og håndarbejdsskoler (frie kostskoler), frie grundskoler, private skoler for gymnasiale uddannelser m.v. og produktionsskoler",
				"creators": [
					{
						"creatorType": "author",
						"lastName": "Børne- og Undervisningsministeriet",
						"fieldMode": 1
					}
				],
				"dateEnacted": "2013-12-16",
				"publicLawNumber": "BEK nr 1490",
				"shortTitle": "Regnskabsbekendtgørelse",
				"url": "https://www.retsinformation.dk/eli/lta/2013/1490",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.retsinformation.dk/eli/lta/2015/599",
		"defer": true,
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Bekendtgørelse om dagtilbud",
				"creators": [
					{
						"creatorType": "author",
						"lastName": "Børne- og Undervisningsministeriet",
						"fieldMode": 1
					}
				],
				"dateEnacted": "2015-04-30",
				"publicLawNumber": "BEK nr 599",
				"url": "https://www.retsinformation.dk/eli/lta/2015/599",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.retsinformation.dk/eli/ft/20012BB00055",
		"defer": true,
		"items": [
			{
				"itemType": "bill",
				"title": "Forslag til folketingsbeslutning om bedre økonomiske forhold for skolefritidsordninger på friskoler og private grundskoler",
				"creators": [
					{
						"creatorType": "author",
						"lastName": "Folketinget",
						"fieldMode": 1
					}
				],
				"date": "2002-01-17",
				"billNumber": "2001/2 BSF 55",
				"url": "https://www.retsinformation.dk/eli/ft/20012BB00055",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.retsinformation.dk/eli/ft/20091BB00193",
		"defer": true,
		"items": [
			{
				"itemType": "bill",
				"title": "Forslag til folketingsbeslutning om harmonisering af regler om skolefritidsordninger og fritidshjem efter dagtilbudsloven",
				"creators": [
					{
						"creatorType": "author",
						"lastName": "Folketinget",
						"fieldMode": 1
					}
				],
				"date": "2010-03-26",
				"billNumber": "2009/1 BSF 193",
				"url": "https://www.retsinformation.dk/eli/ft/20091BB00193",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.retsinformation.dk/eli/lta/2012/956",
		"defer": true,
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Bekendtgørelse om mindre fartøjer der medtager op til 12 passagerer",
				"creators": [
					{
						"creatorType": "author",
						"lastName": "Erhvervsministeriet",
						"fieldMode": 1
					}
				],
				"dateEnacted": "2012-09-26",
				"publicLawNumber": "BEK nr 956",
				"url": "https://www.retsinformation.dk/eli/lta/2012/956",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.retsinformation.dk/documents?t=huse",
		"defer": true,
		"items": "multiple"
	}
]
/** END TEST CASES **/
