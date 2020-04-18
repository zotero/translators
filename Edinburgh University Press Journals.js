{
	"translatorID": "b7bd798d-e518-46d1-aa13-a69f2864fa91",
	"label": "Edinburgh University Press Journals",
	"creator": "Sebastian Karcher",
	"target": "^https?://www\\.euppublishing\\.com/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2016-09-13 21:55:09"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Edinburg University Press Journals Translator
	(Closely based on the ESA journals translator)
	Copyright © 2013 Sebastian Karcher

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
	if (url.match(/\/doi\/abs\/10\.|\/doi\/full\/10\./)) return "journalArticle";
	else if (url.match(/\/action\/doSearch|\/toc\//) && getSearchResults(doc).length) return "multiple";
}

function getSearchResults(doc) {
	return ZU.xpath(doc,
		'//div[@class="articleInfo"]/p[@class="title"]/a[contains(@href, "/doi/abs/")][1]|\
		//div[contains(@class, "art_title")]/a[contains(@href, "/doi/abs/")][1]');
}

function doWeb(doc, url) {
	var arts = new Array();
	if (detectWeb(doc, url) == "multiple") {
		var items = new Object();
		var rows = getSearchResults(doc);
		for (var i=0, n=rows.length; i<n; i++) {
			items[rows[i].href] = rows[i].textContent;
		}
		Zotero.selectItems(items, function (items) {
			if (!items) {
				return true;
			}
			urls = new Array();
			for (var itemurl in items) {
				//some search results have some "baggage" at the end - remove
				urls.push(itemurl.replace(/\?prev.+/, ""));
			}
			ZU.processDocuments(urls, scrape)
		});

	} else {
		scrape(doc, url)
	}
}

function scrape(doc, url) {
	url = url.replace(/[?#].+/, "");
	var doi = url.match(/10\.[^?#]+/)[0];
	var exportUrl = '/action/downloadCitation';
	var post = 'downloadFileName=export.ris&format=ris&direct=true&include=cit&doi=' + doi;
	Zotero.Utilities.HTTP.doPost(exportUrl, post, function (text) {
		var translator = Zotero.loadTranslator("import");
		// Calling the RIS translator
		translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
		translator.setString(text);
		translator.setHandler("itemDone", function (obj, item) {
			item.url = url;
			item.notes = [];
			
			var tagentry = ZU.xpathText(doc, '//meta[@name="keywords"]/@content');

			if (tagentry){
				var tags = tagentry.split(/\s*,\s*/);
				for (var i in tags){
					item.tags.push(tags[i].replace(/^\w/gi,function(m){return m.toUpperCase();}));
					
				}
			}
			item.abstractNote = ZU.xpathText(doc, '//meta[@name="dc.Description"]/@content');
			let abstractFromDOM = ZU.xpathText(doc, '//div[contains(@class, "abstractInFull")]//p[not(@class="summary-title")]');
			if (abstractFromDOM && item.abstractNote.length < abstractFromDOM.length)
				item.abstractNote = abstractFromDOM.replace(/^Abstract/,'');

			item.attachments = [{
				document: doc,
				title: "EUP Snapshot",
				mimeType: "text/html"
			}];
			
			let docType = ZU.xpathText(doc, '//meta[@name="dc.Type"]/@content');
			if (docType === "book-review" || docType === "review-article")
				item.tags.push("Book Reviews");
			
			var pdfurl = ZU.xpath(doc, '//div[@class="article_link"]/a')[0];
			if (pdfurl) {
				pdfurl = pdfurl.href;
				item.attachments.push({
					url: pdfurl,
					title: "EUP PDF fulltext",
					mimeType: "application/pdf"
				});
			}

			item.complete();
		});
		translator.translate();
	});
}


/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.euppublishing.com/toc/jqs/14/1",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.euppublishing.com/doi/abs/10.3366/jqs.2012.0036",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "The Influence of Western Qur'anic Scholarship in Turkey",
				"creators": [
					{
						"lastName": "Koç",
						"firstName": "Mehmet Akif",
						"creatorType": "author"
					}
				],
				"date": "April 1, 2012",
				"DOI": "10.3366/jqs.2012.0036",
				"ISSN": "1465-3591",
				"abstractNote": "After first surveying the development of academic studies of Islam within the modern Turkish higher education system, this essay provides an inventory of material that has been translated from Western languages into Turkish. It is inevitable that orientalist studies will have a place of tremendous importance in this analysis. However, approaches to the Qur'an and its exegesis which have been developed under the influence of the Western scientific and cultural world encompass a larger range of literature that includes not only the orientalist studies themselves but also the criticisms directed against these studies. Particular attention is paid to the work of Fazlur Rahman and Arab scholars influenced by Western methods, and an assessment of the various issues related to the critique of orientalist works is provided.",
				"issue": "1",
				"journalAbbreviation": "J Qur'anic Studies",
				"libraryCatalog": "Edinburgh University Press Journals",
				"pages": "9-44",
				"publicationTitle": "Journal of Qur'anic Studies",
				"url": "http://www.euppublishing.com/doi/abs/10.3366/jqs.2012.0036",
				"volume": "14",
				"attachments": [
					{
						"title": "EUP Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					"Divinity Faculties in Turkey",
					"Exegesis",
					"Orientalist studies",
					"Tafsir",
					"Turkish higher education"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.euppublishing.com/action/doSearch?AllField=labour",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.euppublishing.com/doi/abs/10.3366/swc.2020.0280",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Protestant ‘Indian Mission’ Work in Guatemala from a Woman Missionary's Perspective: Dora Burgess (1887–1962)",
				"creators": [
					{
						"lastName": "Lee",
						"firstName": "Sun Yong",
						"creatorType": "author"
					}
				],
				"date": "February 20, 2020",
				"DOI": "10.3366/swc.2020.0280",
				"ISSN": "1354-9901",
				"abstractNote": "Dora Belle McLaughlin Burgess was an American Presbyterian missionary, devoted to the mission to the Quiché tribe in Guatemala from 1913 to 1962. During her service, she translated the New Testament from Greek into the Quiché language. She also published a hymnal in Quiché and an ethnographic writing on Quiché culture. This paper attempts to shed light on the life of Dora Burgess, whose work was unknown, and to trace the formation of her identity as a missionary and her mission approach to the native inhabitants. In doing so, the paper argues that her interaction with the native tribes in the mission field shaped her identity as a missionary and her understanding of mission in ways in which the indigenous people's agency and subjectivity were recognised and respected. In the earlier period of her service in Guatemala, Dora Burgess conceived of mission work as a rescue project to transform the native tribes into Christians who would denounce their ‘superstitious’ traditions; however, her later focus in mission work, especially in her bible translation project, lay in acknowledging the native traditions and cultures and giving the indigenous tribe opportunities to be Christians in their own ways.",
				"issue": "1",
				"journalAbbreviation": "Studies in World Christianity",
				"libraryCatalog": "Edinburgh University Press Journals",
				"pages": "21-41",
				"publicationTitle": "Studies in World Christianity",
				"shortTitle": "Protestant ‘Indian Mission’ Work in Guatemala from a Woman Missionary's Perspective",
				"url": "https://www.euppublishing.com/doi/abs/10.3366/swc.2020.0280",
				"volume": "26",
				"attachments": [
					{
						"title": "EUP Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Bible translation"
					},
					{
						"tag": "Christianity"
					},
					{
						"tag": "Conversion of missionaries"
					},
					{
						"tag": "Dora Burgess"
					},
					{
						"tag": "Guatemala"
					},
					{
						"tag": "Protestant Indian missions"
					},
					{
						"tag": "Quiché (K'iche)"
					},
					{
						"tag": "US woman missionary"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.euppublishing.com/toc/swc/26/1",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.euppublishing.com/doi/abs/10.3366/swc.2020.0280",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Protestant ‘Indian Mission’ Work in Guatemala from a Woman Missionary's Perspective: Dora Burgess (1887–1962)",
				"creators": [
					{
						"lastName": "Lee",
						"firstName": "Sun Yong",
						"creatorType": "author"
					}
				],
				"date": "February 20, 2020",
				"DOI": "10.3366/swc.2020.0280",
				"ISSN": "1354-9901",
				"abstractNote": "Dora Belle McLaughlin Burgess was an American Presbyterian missionary, devoted to the mission to the Quiché tribe in Guatemala from 1913 to 1962. During her service, she translated the New Testament from Greek into the Quiché language. She also published a hymnal in Quiché and an ethnographic writing on Quiché culture. This paper attempts to shed light on the life of Dora Burgess, whose work was unknown, and to trace the formation of her identity as a missionary and her mission approach to the native inhabitants. In doing so, the paper argues that her interaction with the native tribes in the mission field shaped her identity as a missionary and her understanding of mission in ways in which the indigenous people's agency and subjectivity were recognised and respected. In the earlier period of her service in Guatemala, Dora Burgess conceived of mission work as a rescue project to transform the native tribes into Christians who would denounce their ‘superstitious’ traditions; however, her later focus in mission work, especially in her bible translation project, lay in acknowledging the native traditions and cultures and giving the indigenous tribe opportunities to be Christians in their own ways.",
				"issue": "1",
				"journalAbbreviation": "Studies in World Christianity",
				"libraryCatalog": "Edinburgh University Press Journals",
				"pages": "21-41",
				"publicationTitle": "Studies in World Christianity",
				"shortTitle": "Protestant ‘Indian Mission’ Work in Guatemala from a Woman Missionary's Perspective",
				"url": "https://www.euppublishing.com/doi/abs/10.3366/swc.2020.0280",
				"volume": "26",
				"attachments": [
					{
						"title": "EUP Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Bible translation"
					},
					{
						"tag": "Christianity"
					},
					{
						"tag": "Conversion of missionaries"
					},
					{
						"tag": "Dora Burgess"
					},
					{
						"tag": "Guatemala"
					},
					{
						"tag": "Protestant Indian missions"
					},
					{
						"tag": "Quiché (K'iche)"
					},
					{
						"tag": "US woman missionary"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
