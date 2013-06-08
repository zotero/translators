{
	"translatorID": "fc08c878-ac92-40dc-9105-ca36ca20665d",
	"label": "NRC Research Press",
	"creator": "Sebastian Karcher",
	"target": "^https?://www\\.nrcresearchpress\\.com",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "g",
	"lastUpdated": "2013-06-08 16:53:42"
}

/*
NRC Research Press
Closely based on the ESA journals translator
Copyright (C) 2013 Sebastian Karcher

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program. If not, see <http://www.gnu.org/licenses/>.
*/


function detectWeb(doc, url) {
	if (url.match(/\/doi\/abs\/10\.|\/doi\/full\/10\./)) return "journalArticle";
	else if (url.match(/\/action\/doSearch|\/toc\//) && getSearchResults(doc).length) return "multiple";
}

function getSearchResults(doc) {
	return ZU.xpath(doc,
		'//div[@class="item-details clearfix" and div[p[a[contains(@href, "/doi/abs/")]]]]|\
		//div[@class="art_title"]/a[contains(@href, "/doi/abs/")][1]');
}

function doWeb(doc, url) {
	var arts = new Array();
	if (detectWeb(doc, url) == "multiple") {
		var items = new Object();
		var rows = getSearchResults(doc);
		for (var i=0, n=rows.length; i<n; i++) {
			//Z.debug(ZU.xpathText(rows[i], './/a[contains(@href, "/doi/abs/")][1]/@href'))
			items[ZU.xpathText(rows[i], './/a[contains(@href, "/doi/abs/")][1]/@href')] = ZU.xpathText(rows[i], './h3');
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
	var pdfurl = url.replace(/\/(abs|full)\//, "/pdfplus/");
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
			item.abstractNote = ZU.xpathText(doc, '//meta[@name="dc.Description"]/@content');
			if (item.title === item.title.toUpperCase()){
				item.title = ZU.capitalizeTitle(item.title.toLowerCase(), true);
			}
			item.attachments = [{
				document: doc,
				title: "NRC Research Press Snapshot",
				mimeType: "text/html"
			}];

			if(pdfurl) {
				item.attachments.push({
					url: pdfurl,
					title: "NRC Research Press PDF fulltext",
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
				"creators": [
					{
						"lastName": "Koç",
						"firstName": "Mehmet Akif",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"Tafsir",
					"Exegesis",
					"Orientalist studies",
					"Turkish higher education",
					"Divinity Faculties in Turkey"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "EUP Snapshot",
						"mimeType": "text/html"
					},
					{
						"title": "EUP PDF fulltext",
						"mimeType": "application/pdf"
					}
				],
				"title": "The Influence of Western Qur'anic Scholarship in Turkey",
				"date": "April 1, 2012",
				"DOI": "10.3366/jqs.2012.0036",
				"publicationTitle": "Journal of Qur'anic Studies",
				"journalAbbreviation": "J Qur'anic Studies",
				"pages": "9-44",
				"volume": "14",
				"issue": "1",
				"publisher": "Edinburgh University Press",
				"ISSN": "1465-3591",
				"url": "http://www.euppublishing.com/doi/abs/10.3366/jqs.2012.0036",
				"abstractNote": "After first surveying the development of academic studies of Islam within the modern Turkish higher education system, this essay provides an inventory of material that has been translated from Western languages into Turkish. It is inevitable that orientalist studies will have a place of tremendous importance in this analysis. However, approaches to the Qur'an and its exegesis which have been developed under the influence of the Western scientific and cultural world encompass a larger range of literature that includes not only the orientalist studies themselves but also the criticisms directed against these studies. Particular attention is paid to the work of Fazlur Rahman and Arab scholars influenced by Western methods, and an assessment of the various issues related to the critique of orientalist works is provided.",
				"libraryCatalog": "Edinburgh University Press Journals",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.euppublishing.com/action/doSearch?allowEmptyTermQuery=true&title=labour&author=&pubidspan=&pubType=journal&fulltext=labour&pageSize=10&sortBy=false&AfterMonth=&AfterYear=&BeforeMonth=&BeforeYear=&categoryId=all",
		"items": "multiple"
	}
]
/** END TEST CASES **/