{
	"translatorID": "dac476e4-401d-430a-8571-a97c31c3b65e",
	"label": "Taylor and Francis",
	"creator": "Sebastian Karcher",
	"target": "^http://www\\.tandfonline\\.com",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2012-06-02 21:43:12"
}

/*
Taylor and Francis Translator
Copyright (C) 2011 Sebastian Karcher

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

function getTitles(doc) {
	return ZU.xpath(doc, '//label[@class="resultTitle"]/a\
						|//a[@class="entryTitle"]');
}

function detectWeb(doc, url) {
	if (url.match(/\/doi\/abs\/10\.|\/doi\/full\/10\./)) {
		return "journalArticle";
	} else if(url.match(/\/action\/doSearch\?|\/toc\//) &&
		getTitles(doc).length) {
		return "multiple";
	}
}


function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		var items = new Object();
		var titles = getTitles(doc);
		var doi;
		for(var i=0, n=titles.length; i<n; i++) {
			doi = titles[i].href.match(/\/doi\/(?:abs|full)\/(10\.[^?#]+)/);
			if(doi) {
				items[doi[1]] = titles[i].textContent;
			}
		}

		Zotero.selectItems(items, function(selectedItems){
			if(!selectedItems) return true;
			
			var dois = new Array();
			for (var i in selectedItems) {
				dois.push(i);
			}
			scrape(null, url,dois);
		});
	} else {
		var doi = url.match(/\/doi\/(?:abs|full)\/(10\.[^?#]+)/);
		scrape(doc, url,[doi[1]]);
	}
}

function finalizeItem(item, doc, doi, baseUrl) {
	var pdfurl = baseUrl + '/doi/pdf/';
	var absurl = baseUrl + '/doi/abs/';

	//add attachments
	item.attachments = [{
		title: 'Full Text PDF',
		url: pdfurl + doi,
		mimeType: 'application/pdf'
	}];
	if(doc) {
		item.attachments.push({
			title: 'Snapshot',
			document: doc
		});
	} else {
		item.attachments.push({
			title: 'Snapshot',
			url: item.url || absurl + doi,
			mimeType: 'text/html'
		});
	}

	item.complete();
}

function scrape(doc, url, dois) {
	var baseUrl = url.match(/https?:\/\/[^\/]+/)[0]
	var postUrl = baseUrl + '/action/downloadCitation';
	var postBody = 	'downloadFileName=citation&' +
					'direct=true&' +
					'include=abs&' +
					'doi=';
	var risFormat = '&format=ris';
	var bibtexFormat = '&format=bibtex';

	for(var i=0, n=dois.length; i<n; i++) {
		(function(doi) {
			ZU.doPost(postUrl, postBody + doi + bibtexFormat, function(text) {
				var translator = Zotero.loadTranslator("import");
				// Use BibTeX translator
				translator.setTranslator("9cb70025-a888-4a29-a210-93ec52da40d4");
				translator.setString(text);
				translator.setHandler("itemDone", function(obj, item) {
					item.bookTitle = item.publicationTitle;

					//unfortunately, bibtex is missing some data
					//publisher, ISSN/ISBN
					ZU.doPost(postUrl, postBody + doi + risFormat, function(text) {
						risTrans = Zotero.loadTranslator("import");
						risTrans.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
						risTrans.setString(text);
						risTrans.setHandler("itemDone", function(obj, risItem) {
							item.publisher = risItem.publisher;
							item.ISSN = risItem.ISSN;
							item.ISBN = risItem.ISBN;
							finalizeItem(item, doc, doi, baseUrl);
						});
						risTrans.translate();
					});
				});
				translator.translate();
			});
		})(dois[i]);
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.tandfonline.com/action/doSearch?type=simple&filter=multiple&stemming=yes&searchText=labor+market&x=0&y=0&publication=",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.tandfonline.com/doi/abs/10.1080/17487870802543480",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Alberto",
						"lastName": "Chong",
						"creatorType": "author"
					},
					{
						"firstName": "Jose",
						"lastName": "Galdo",
						"creatorType": "author"
					},
					{
						"firstName": "Jaime",
						"lastName": "Saavedra",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
					}
				],
				"title": "Informality and productivity in the labor market in Peru",
				"publicationTitle": "Journal of Economic Policy Reform",
				"volume": "11",
				"issue": "4",
				"pages": "229-245",
				"date": "2008",
				"DOI": "10.1080/17487870802543480",
				"url": "http://www.tandfonline.com/doi/abs/10.1080/17487870802543480",
				"abstractNote": "This article analyzes the evolution of informal employment in Peru from 1986 to 2001. Contrary to what one would expect, the informality rates increased steadily during the 1990s despite the introduction of flexible contracting mechanisms, a healthy macroeconomic recovery, and tighter tax codes and regulation. We explore different factors that may explain this upward trend including the role of labor legislation and labor allocation between/within sectors of economic activity. Finally, we illustrate the negative correlation between productivity and informality by evaluating the impacts of the Youth Training PROJOVEN Program that offers vocational training to disadvantaged young individuals. We find significant training impacts on the probability of formal employment for both males and females.",
				"bookTitle": "Journal of Economic Policy Reform",
				"publisher": "Routledge",
				"ISSN": "1748-7870",
				"ISBN": "1748-7870",
				"libraryCatalog": "Taylor and Francis",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.tandfonline.com/toc/clah20/22/4",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.tandfonline.com/doi/full/10.1080/17487870802543480",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Alberto",
						"lastName": "Chong",
						"creatorType": "author"
					},
					{
						"firstName": "Jose",
						"lastName": "Galdo",
						"creatorType": "author"
					},
					{
						"firstName": "Jaime",
						"lastName": "Saavedra",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
					}
				],
				"title": "Informality and productivity in the labor market in Peru",
				"publicationTitle": "Journal of Economic Policy Reform",
				"volume": "11",
				"issue": "4",
				"pages": "229-245",
				"date": "2008",
				"DOI": "10.1080/17487870802543480",
				"url": "http://www.tandfonline.com/doi/abs/10.1080/17487870802543480",
				"abstractNote": "This article analyzes the evolution of informal employment in Peru from 1986 to 2001. Contrary to what one would expect, the informality rates increased steadily during the 1990s despite the introduction of flexible contracting mechanisms, a healthy macroeconomic recovery, and tighter tax codes and regulation. We explore different factors that may explain this upward trend including the role of labor legislation and labor allocation between/within sectors of economic activity. Finally, we illustrate the negative correlation between productivity and informality by evaluating the impacts of the Youth Training PROJOVEN Program that offers vocational training to disadvantaged young individuals. We find significant training impacts on the probability of formal employment for both males and females.",
				"bookTitle": "Journal of Economic Policy Reform",
				"publisher": "Routledge",
				"ISSN": "1748-7870",
				"ISBN": "1748-7870",
				"libraryCatalog": "Taylor and Francis",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.tandfonline.com/doi/abs/10.1080/00036846.2011.568404",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Joo Heon",
						"lastName": "Park",
						"creatorType": "author"
					},
					{
						"firstName": "Douglas L.",
						"lastName": "MacLachlan",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
					}
				],
				"title": "Estimating willingness to pay by risk adjustment mechanism",
				"publicationTitle": "Applied Economics",
				"volume": "45",
				"issue": "1",
				"pages": "37-46",
				"date": "2013",
				"DOI": "10.1080/00036846.2011.568404",
				"url": "http://www.tandfonline.com/doi/abs/10.1080/00036846.2011.568404",
				"abstractNote": "Measuring consumers’ Willingness To Pay (WTP) without considering the level of uncertainty in valuation and the consequent risk premiums will result in estimates that are biased toward lower values. This research proposes a model and method for correctly assessing WTP in cases involving valuation uncertainty. The new method, called Risk Adjustment Mechanism (RAM), is presented theoretically and demonstrated empirically. It is shown that the RAM outperforms the traditional method for assessing WTP, especially in a context of a nonmarket good such as a totally new product.",
				"bookTitle": "Applied Economics",
				"publisher": "Routledge",
				"ISSN": "0003-6846",
				"ISBN": "0003-6846",
				"libraryCatalog": "Taylor and Francis",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	}
]
/** END TEST CASES **/