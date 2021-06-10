{
	"translatorID": "dc098d90-7a52-4938-89ee-bc027d2f70df",
	"label": "ubtue_vandenhoeck_ruprecht",
	"creator": "Timotheus Kim",
	"target": "https://www.vr-elibrary.de/(toc|doi)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-05-27 07:57:56"
}

/*
	***** BEGIN LICENSE BLOCK *****
	Copyright © 2021 Universitätsbibliothek Tübingen.  All rights reserved.
	T
	his program is free software: you can redistribute it and/or modify
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
	if (url.includes('/doi/')) return "journalArticle";
	else if (url.includes('/toc/') && getSearchResults(doc)) return "multiple";
	else return false;
}

function getSearchResults(doc) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//*[@class="issue-item__title"]/a');
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(row.textContent);
		if (!href || !title) continue;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
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
			ZU.processDocuments(articles, scrape);
		});
	} else {
		scrape(doc, url);
	}
}

function fixCase(str, titleCase) {
	if (str.toUpperCase() != str) return str;
	if (titleCase) {
		return ZU.capitalizeTitle(str, true);
	}
	return str.charAt(0) + str.substr(1).toLowerCase();
}

// Keep this in line with target regexp
var replURLRegExp = /\/doi\/((?:abs|abstract|full|figure|ref|citedby|book)\/)?/;

function scrape(doc, url) {
	url = url.replace(/[?#].*/, "");
	var doi = url.match(/10\.[^?#]+/)[0];
	var citationurl = url.replace(replURLRegExp, "/action/showCitFormats?doi=");
	
	ZU.processDocuments(citationurl, function(citationDoc){
		var filename = citationDoc.evaluate('//form//input[@name="downloadFileName"]', citationDoc, null, XPathResult.ANY_TYPE, null).iterateNext().value;
		var get = '/action/downloadCitation';
		//to dwonload also abstract in RIS "&include=abs"	
		var post = 'doi=' + doi + '&downloadFileName=' + filename + '&format=ris&direct=true&include=abs&include=cit';
		ZU.doPost(get, post, function (text) {
			var translator = Zotero.loadTranslator("import");
			// Calling the RIS translator
			translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
			translator.setString(text);
			translator.setHandler("itemDone", function (obj, item) {
				
				//subtitle
				let subtitle = ZU.xpathText(doc, '//*[contains(concat( " ", @class, " " ), concat( " ", "citation__subtitle", " " ))]');
				if (subtitle) {
					item.shortTitle = fixCase(item.title);
					item.title = fixCase(item.title) + ': ' + subtitle;
				}
				else item.title = fixCase(item.title);
				for (var i=0; i<item.creators.length; i++) {
					item.creators[i].lastName = fixCase(item.creators[i].lastName, true);
					if (item.creators[i].firstName) {
						item.creators[i].firstName = fixCase(item.creators[i].firstName, true);
					}
				}
				
				item.url = url;
				
				//book review
				let docType = ZU.xpathText(doc, '//meta[@name="dc.Type"]/@content');
				if (docType === "book-review")
					item.tags.push("Book Review");
				if (!item.language) {
					var metaLang = doc.querySelector("meta[name='dc.Language']");
					if (metaLang && metaLang.getAttribute("content"))
						item.language = metaLang.getAttribute("content")
				}
				//
				let switchToDE = "https://www.vr-elibrary.de/action/doLocaleChange?locale=de&requestUri=/doi/"+ doi;
					ZU.processDocuments(switchToDE, function (url) {
						let scrapeAbstractsDE = ZU.xpathText(url, '//*[contains(concat( " ", @class, " " ), concat( " ", "abstractInFull", " " ))]');
						if (scrapeAbstractsDE) {
							item.abstractNote = ZU.trimInternal(scrapeAbstractsDE.replace(/^(abstract|summary|zusammenfassung)/gi, '')); //+= '\\n4207 ' + ZU.trimInternal(scrapeAbstractsDE.replace(/^(abstract|zusammenfassung)/gi, ''));
						}
						item.complete();
					});
			});
			translator.translate();
		});
	});
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.vr-elibrary.de/doi/10.13109/kedo.2021.67.2.148",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Partizipation als Geben und Nehmen im Horizont der \t\t\t\t\tGnade: Zur diakoniewissenschaftlichen Begründung von Teilhabe",
				"creators": [
					{
						"lastName": "Schmidt",
						"firstName": "Markus",
						"creatorType": "author"
					}
				],
				"date": "May 21, 2021",
				"DOI": "10.13109/kedo.2021.67.2.148",
				"ISSN": "0023-0707",
				"abstractNote": "In diaconal studies a paradigm shift from “care” to “participation” has taken place. The omnipresent use of “participation” derives from the socio-political progress perspectives based on human rights approaches, e.g. in diaconal practical work. However, a specific theological approach is missing. The article illustrates “participation” as a central theological term and argues for defining it as a mutual process of giving and taking. Participation is fundamentally active and should not be misunderstood as a passive product. A specific diaconal way of talking about “participation” is founded in God’s gift of Christ.",
				"issue": "2",
				"language": "de",
				"libraryCatalog": "ubtue_vandenhoeck_ruprecht",
				"pages": "148-166",
				"publicationTitle": "Kerygma und Dogma",
				"shortTitle": "Partizipation als Geben und Nehmen im Horizont der \t\t\t\t\tGnade",
				"url": "https://www.vr-elibrary.de/doi/10.13109/kedo.2021.67.2.148",
				"volume": "67",
				"attachments": [],
				"tags": [],
				"notes": [
					{
						"note": "<p>doi: 10.13109/kedo.2021.67.2.148</p>"
					}
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
