{
	"translatorID": "46291dc3-5cbd-47b7-8af4-d009078186f6",
	"label": "CiNii Research",
	"creator": "Michael Berkowitz, Mitsuo Yoshida and Satoshi Ando",
	"target": "^https?://cir\\.nii\\.ac\\.jp/",
	"minVersion": "1.0.0b4.r5",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-09-26 14:22:20"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2024 Michael Berkowitz, Mitsuo Yoshida and Satoshi Ando

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
	if (url.includes("/crid/")) {
		return "journalArticle";
	}
	else if (doc.evaluate('//a[contains(@href, "/crid/")]', doc, null, XPathResult.ANY_TYPE, null).iterateNext()) {
		return "multiple";
	}
	return false;
}

function doWeb(doc, url) {
	var arts = [];
	if (detectWeb(doc, url) == "multiple") {
		var items = {};
		var links = doc.evaluate('//a[contains(@href, "/crid/")]', doc, null, XPathResult.ANY_TYPE, null);
		var link;
		while ((link = links.iterateNext())) {
			items[link.href] = Zotero.Utilities.trimInternal(link.textContent);
		}
		Zotero.selectItems(items, function (items) {
			if (!items) {
				return;
			}
			for (var i in items) {
				arts.push(i);
			}
			Zotero.Utilities.processDocuments(arts, scrape);
		});
	}
	else {
		scrape(doc, url);
	}
}

function scrape(doc, _url) {
	var newurl = doc.location.href;
	var biblink = ZU.xpathText(doc, '//li/div/a[contains(text(), "BibTeX")]/@href');
	//Z.debug(biblink)
	var tags = [];
	if (doc.evaluate('//a[@rel="tag"]', doc, null, XPathResult.ANY_TYPE, null).iterateNext()) {
		var kws = doc.evaluate('//a[@rel="tag"]', doc, null, XPathResult.ANY_TYPE, null);
		var kw;
		while ((kw = kws.iterateNext())) {
			tags.push(Zotero.Utilities.trimInternal(kw.textContent));
		}
	}
	//var abstractPath = '//div[@class="abstract"]/p[@class="entry-content"]';
	var abstractPath = '//div[contains(@class, "abstract")]/p[contains(@class, "entry-content")]';
	var abstractNote;
	if (doc.evaluate(abstractPath, doc, null, XPathResult.ANY_TYPE, null).iterateNext()) {
		abstractNote = doc.evaluate(abstractPath, doc, null, XPathResult.ANY_TYPE, null).iterateNext().textContent;
	}
	Zotero.Utilities.HTTP.doGet(biblink, function (text) {
		var trans = Zotero.loadTranslator("import");
		trans.setTranslator("9cb70025-a888-4a29-a210-93ec52da40d4");
		trans.setString(text);
		trans.setHandler("itemDone", function (obj, item) {
			item.url = newurl;
			item.attachments = [{ url: item.url, title: item.title + " Snapshot", mimeType: "text/html" }];
			item.tags = tags;
			item.abstractNote = abstractNote;
			if (item.ISSN) {
				item.ISSN = ZU.cleanISSN(item.ISSN);
			}
			item.complete();
		});
		trans.translate();
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://cir.nii.ac.jp/all?q=test&range=0&count=20&sortorder=1&type=0",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://cir.nii.ac.jp/crid/1390001204062164736",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "観測用既存鉄骨造モデル構造物を用いたオンライン応答実験",
				"creators": [
					{
						"firstName": "謙一",
						"lastName": "大井",
						"creatorType": "author"
					},
					{
						"firstName": "與助",
						"lastName": "嶋脇",
						"creatorType": "author"
					},
					{
						"firstName": "拓海",
						"lastName": "伊藤",
						"creatorType": "author"
					},
					{
						"firstName": "玉順",
						"lastName": "李",
						"creatorType": "author"
					}
				],
				"date": "2002",
				"DOI": "10.11188/seisankenkyu.54.384",
				"ISSN": "1881-2058",
				"abstractNote": "特集 ERS(耐震構造学)",
				"issue": "6",
				"itemID": "1390001204062164736",
				"libraryCatalog": "CiNii Research",
				"pages": "384-387",
				"publicationTitle": "生産研究",
				"url": "https://cir.nii.ac.jp/crid/1390001204062164736",
				"volume": "54",
				"attachments": [
					{
						"title": "観測用既存鉄骨造モデル構造物を用いたオンライン応答実験 Snapshot",
						"mimeType": "text/html"
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
