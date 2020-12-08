{
	"translatorID": "b2fcf7d9-e023-412e-a2bc-f06d6275da24",
	"label": "Brill",
	"creator": "Madeesh Kannan, Timotheus Kim",
	"target": "^https?://brill.com/view/journals/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 90,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2020-12-08 16:17:24"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2019 Universitätsbibliothek Tübingen.  All rights reserved.
	Modified 2020 Timotheus Kim
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
	if (url.match(/article-.+\.xml$/)) {
		return "journalArticle";
	} else if (url.match(/issue-\d+(-\d+)?\.xml$/)) {
		return "multiple";
 	}
}

function getSearchResults(doc) {
	let items = {};
	let found = false;
	var results = ZU.xpath(doc, '//a[contains(@class, "c-Typography--title")]');
	if (results.length<1) {
		results = ZU.xpath(doc, '//*[contains(concat( " ", @class, " " ), concat( " ", "flex-row", " " )) and contains(concat( " ", @class, " " ), concat( " ", "flex-nowrap", " " ))]//*[contains(concat( " ", @class, " " ), concat( " ", "c-Button--link", " " ))]');
	}
	for (var i in results) {
		let href = results[i].href;
		let title = ZU.trimInternal(results[i].textContent);
		if (!href || !title) continue;
		if (!href.match(/article-.+\.xml$/))
			continue;

		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function postProcess(doc, item) {
	if (!item.abstractNote) {
		var abstractEntry = ZU.xpath(doc, '//section[@class="abstract"]//p');
		if (abstractEntry && abstractEntry.length > 0)
			item.abstractNote = abstractEntry[0].textContent.trim();
	}
	item.tags = ZU.xpath(doc, '//dd[contains(@class, "keywords")]//a');
	if (item.tags)
		item.tags = item.tags.map(i => i.textContent.trim().replace(/^\w/gi,function(m){return m.toUpperCase();}));
	let reviewEntry = text(doc, '.articlecategory');
	if (reviewEntry && reviewEntry.match(/book\sreview/i)) item.tags.push('Book Review');
}

function invokeEmbeddedMetadataTranslator(doc, url) {
	var translator = Zotero.loadTranslator("web");
	translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
	translator.setDocument(doc);
	translator.setHandler("itemDone", function (t, i) {
		i.abstractNote = ZU.unescapeHTML(i.abstractNote).replace(/^abstract/i, '');
		postProcess(doc, i);
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
	} else
		invokeEmbeddedMetadataTranslator(doc, url);
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://brill.com/view/journals/bi/28/3/article-p273_1.xml",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Reflections on the Scholarly Imaginations of Good and Evil in the Book of Esther",
				"creators": [
					{
						"firstName": "Lydia",
						"lastName": "Lee",
						"creatorType": "author"
					}
				],
				"date": "2020/06/04",
				"DOI": "10.1163/15685152-00283P01",
				"ISSN": "1568-5152, 0927-2569",
				"abstractNote": "The present article seeks to describe, analyze, and evaluate the modern scholarly attempts to grapple with the moral issues about good and evil in the Hebrew Esther story. The first part of the article examines the anti-Semitic sentiments looming behind the pre-World War II European, especially the Protestant, commentators’ ethics assessments of the book of Esther and its Jewish characters, before pointing out a blind spot in these assessments. The second part of the article offers a systematic analysis of the gradual change of attitude induced mainly by the Jewish scholars in the aftermath of the Second World War. Lastly, the paper turns the spotlight on the Esther studies conducted by recent feminist and other marginalized biblical scholars. Attempts are made to demonstrate how their works, coming from different social contexts, enrich the academic discussions about good and evil in the book of Esther.",
				"issue": "3",
				"language": "en",
				"libraryCatalog": "brill.com",
				"pages": "273-302",
				"publicationTitle": "Biblical Interpretation",
				"url": "https://brill.com/view/journals/bi/28/3/article-p273_1.xml",
				"volume": "28",
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
						"tag": "Book of Esther"
					},
					{
						"tag": "Feminist"
					},
					{
						"tag": "Good and evil"
					},
					{
						"tag": "Jewish"
					},
					{
						"tag": "Marginalized"
					},
					{
						"tag": "Protestant"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
