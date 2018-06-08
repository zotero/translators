{
	"translatorID": "cf4c7715-dcd4-45a1-bbea-a6c387b3fabd",
	"label": "Andrews University Seminary Studies",
	"creator": "Madeesh Kannan",
	"target": "^https?://(\\\\w+\\\\.)*digitalcommons.andrews.edu/auss/vol[0-9]+/iss[0-9]+",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2018-06-08 14:05:50"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2018 Madeesh Kannan

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
	// limited support for the time being
	var type = ZU.xpathText(doc,'//div[@id="document_type"]/p');
	if (type == "Article")
		return "journalArticle";
}

function postProcess(doc, url, item) {
	item.abstractNote = ZU.xpathText(doc,'//div[@id="abstract"]/p');
	item.journalAbbreviation = "AUSS";
	item.attachments.push({
		title:"Full Text PDF",
		mimeType:"application/pdf",
		url:ZU.xpathText(doc,'//meta[@name="bepress_citation_pdf_url"]/@content'),
	});
	item.complete();
}

function doWeb(doc, url) {
	var type = detectWeb(doc, url);
	if (type == "journalArticle") {
		// use COinS for the basic data
		var translator = Zotero.loadTranslator("web");
		translator.setTranslator("05d07af9-105a-4572-99f6-a8e231c0daef");
		translator.setDocument(doc);
		translator.setHandler("itemDone", function (t, i) {
			postProcess(doc, url, i);
		});
		translator.translate();
	} else {
		Z.debug("Item type " + type + " not supported yet");
	}
}


/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://digitalcommons.andrews.edu/auss/vol55/iss2/3/",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Faithfulness to Christ as Covenant Fidelity: The Pastoral Purpose behind the Old Testament Allusions in the Seven Messages of Revelation 2–3",
				"creators": [
					{
						"firstName": "Timothy",
						"creatorType": "author",
						"lastName": "Decker"
					}
				],
				"date": "2017-01-01",
				"ISSN": "0003-2980",
				"abstractNote": "The multivalent symbols in the seven messages of Rev 2–3 come from three primary sources: (1) the socio-historical setting of Asia Minor, (2) the opening chapter of Revelation, and (3) Old Testament allusions. It is the last of these that is of interest in this essay. Specifically, the character of these allusions displays a covenantal quality akin to the Israelite pact initiated at Mt. Sinai. While many have sought to demonstrate the covenantal background of the seven messages through shared structure, none has considered the nature of the Old Testament allusions themselves, as well as the paraenetic function they have for the recipients of the message. This article seeks to demonstrate that the Old Testament allusions in Rev 2–3 convey a covenantal character for the pastoral purpose of encouraging the churches to remain faithful to Jesus, their covenant suzerain/king.",
				"issue": "2",
				"journalAbbreviation": "AUSS",
				"libraryCatalog": "Andrews University Seminary Studies",
				"pages": "165-193",
				"publicationTitle": "Andrews University Seminary Studies (AUSS)",
				"shortTitle": "Faithfulness to Christ as Covenant Fidelity",
				"url": "https://digitalcommons.andrews.edu/auss/vol55/iss2/3",
				"volume": "55",
				"attachments": [
					{},
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
