{
	"translatorID": "68643a57-3182-4e27-b34a-326347044d89",
	"label": "ubtue_Oxford Academic",
	"creator": "Madeesh Kannan",
	"target": "^https?://academic.oup.com",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-06-29 14:36:50"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2019 Universitätsbibliothek Tübingen.  All rights reserved.

	This program is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public License
	along with this program.  If not, see <http://www.gnu.org/licenses/>.

	***** END LICENSE BLOCK *****
*/


function detectWeb(doc, url) {
	if (url.match(/\/issue\/[0-9]+\/[0-9]+/)) {
		return "multiple";
	} else if (url.match(/\/article\/[0-9]+\/[0-9]+/)) {
		// placeholder, actual type determined by the embedded metadata translator
		return "journalArticle";
	}
}

function getSearchResults(doc) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, "//div[contains(@class, 'al-article-items')]/h5[contains(@class, 'item-title')]/a");
	for (let i = 0; i < rows.length; i++) {
		let href = rows[i].href;
		let title = ZU.trimInternal(rows[i].textContent);
		if (!href || !title) continue;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function invokeEmbeddedMetadataTranslator(doc, url) {
	var translator = Zotero.loadTranslator("web");
	translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
	translator.setDocument(doc);
	translator.setHandler("itemDone", function (t, i) {
		// update abstract from the webpage as the embedded data is often incomplete
		var abstractText = ZU.xpathText(doc, '//section[@class="abstract"]');
		if (abstractText) i.abstractNote = abstractText;
		
		let tagreview = ZU.xpathText(doc, '//*[(@id = "ContentTab")]//a');
		if (tagreview.match(/Reviews+|Book Reviews+/i)) i.tags.push('Book Review');
		// if the article are review article, then the full text extract is scraped from the HTML
		let extractText = ZU.xpathText(doc, '//p[@class="chapter-para"]');
		if (tagreview.match(/Reviews+|Book Reviews+/i) && extractText) i.abstractNote = extractText
		i.complete();
	});
	translator.translate();
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) === "multiple") {
		Zotero.selectItems(getSearchResults(doc), function (items) {
			if (!items) {
				return true;
			}
			var articles = [];
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, invokeEmbeddedMetadataTranslator);
		});
	} else {
		invokeEmbeddedMetadataTranslator(doc, url);
	}
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://academic.oup.com/jss/article-abstract/65/1/245/5738633?redirectedFrom=fulltext",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Nevada Levi Delapp, Theophanic “Type-Scenes” in the Pentateuch: Visions of YHWH",
				"creators": [
					{
						"firstName": "George",
						"lastName": "Savran",
						"creatorType": "author"
					}
				],
				"date": "2020/04/01",
				"DOI": "10.1093/jss/fgz049",
				"ISSN": "0022-4480",
				"issue": "1",
				"journalAbbreviation": "J Semit Stud",
				"language": "en",
				"libraryCatalog": "academic.oup.com",
				"pages": "245-246",
				"publicationTitle": "Journal of Semitic Studies",
				"shortTitle": "Nevada Levi Delapp, Theophanic “Type-Scenes” in the Pentateuch",
				"url": "https://academic.oup.com/jss/article/65/1/245/5738633",
				"volume": "65",
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
						"tag": "Book Review"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://academic.oup.com/litthe/article-abstract/34/1/122/5245305?redirectedFrom=fulltext",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Mariner: A Voyage with Samuel Taylor Coleridge. By Malcolm Guite",
				"creators": [
					{
						"firstName": "Robin",
						"lastName": "Schofield",
						"creatorType": "author"
					}
				],
				"date": "2020/03/01",
				"DOI": "10.1093/litthe/fry035",
				"ISSN": "0269-1205",
				"abstractNote": "This is an ambitious revisionary study. Malcolm Guite combines literary, theological, and ecological perspectives to shed new light on the ‘rich spirituality’ of Coleridge’s work, in the sacramental theology of his Rime of the Ancient Mariner (p. 8). Guite recounts Coleridge’s life story around a religious and ecological, ultimately polemical, reading of the Rime. Guite’s rationale for the biographical strand of his study is based on the poet’s retrospective self-identification with his protagonist. The book is divided into two sections. In Part One, Guite narrates Coleridge’s life up to the year of extraordinary creativity at Nether Stowey, which spanned summer 1797 to summer 1798. The seven chapters in Part Two...",
				"issue": "1",
				"journalAbbreviation": "Literature and Theology",
				"language": "en",
				"libraryCatalog": "academic.oup.com",
				"pages": "122-124",
				"publicationTitle": "Literature and Theology",
				"shortTitle": "Mariner",
				"url": "https://academic.oup.com/litthe/article/34/1/122/5245305",
				"volume": "34",
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
						"tag": "Book Review"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://academic.oup.com/litthe/issue/35/2",
		"items": "multiple"
	}
]
/** END TEST CASES **/
