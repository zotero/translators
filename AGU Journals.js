{
	"translatorID": "9220fa99-b936-430e-a8ea-43ca6cb04145",
	"label": "AGU Journals",
	"creator": "Sebastian Karcher and Ben Parr",
	"target": "^https?://(?:www\\.|europa\\.)?agu\\.org",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsv",
	"lastUpdated": "2012-07-05 21:00:25"
}

/*
   AGU Translator
   Copyright (C) 2012 Sebastian Karcher and Ben Parr
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
*/

function detectWeb(doc, url) {
	var xpath = '//meta[@name="citation_journal_title"]';

	if (ZU.xpath(doc, xpath).length > 0) {
		return "journalArticle";
	}
	//for old frames display: http://www.agu.org/journals/gl/gl0420/2004GL020398/
	xpath = '//meta[@name="doi"]/@content';
	if (url.match(/journal/) && ZU.xpath(doc, xpath).length > 0) {
		return "journalArticle";
	}

	xpath = '//tr/td/p[@class="title"]';
	if (ZU.xpath(doc, xpath).length > 0) {
		return "multiple";
	}

	//Search  Page
	if (url.match(/\?view=results/)) {
		return "multiple";
	}

	return false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		var citerow;
		var linkrow;
		var items = {};
		var xpath;
		var urls = [];

		//issue page
		xpath = '//tr/td/p[@class="title"]';
		if (doc.evaluate(xpath, doc, null, XPathResult.ANY_TYPE, null).iterateNext()) {
			var titlerows = doc.evaluate(xpath, doc, null, XPathResult.ANY_TYPE, null);
			xpath = '//tr/td/p[@class="pubdate"]/a';
			var linkrows = doc.evaluate(xpath, doc, null, XPathResult.ANY_TYPE, null);
			while (titlerow = titlerows.iterateNext()) {
				linkrow = linkrows.iterateNext();
				while (linkrow.textContent.indexOf("Abstract") < 0) {
					linkrow = linkrows.iterateNext();
				}
				items[linkrow.href] = titlerow.textContent;
			}
		}
		//search results
		if (url.match(/\?view=results/)) {
			var results = ZU.xpath(doc, '//p[@class="citation"]/a[1]');
			for (var i in results) {
				items[results[i].href] = results[i].textContent;
			}
		}


		Z.selectItems(items, function (items) {
			if (items == null) return true;
			for (var j in items) {
				urls.push(j);
			}
			ZU.processDocuments(urls, function (myDoc) {
				doWeb(myDoc, myDoc.location.href)
			}, function () {});
		});

	} else {
		//detect and redirect the old frames display
		xpath = '//meta[@name="doi"]/@content';
		if (url.match(/agu\.org\/journals\//) && ZU.xpath(doc, xpath).length > 0) {
			var doi = ZU.xpathText(doc, xpath);
			var newurl = "http://dx.doi.org/" + doi;
			Z.debug(newurl)
			ZU.processDocuments(newurl, function (myDoc) {
				doWeb(myDoc, myDoc.location.href)
			}, function () {});
		} else {
		// We call the Embedded Metadata translator to do the actual work
		var year = ZU.xpathText(doc, '//meta[@name="citation_year"]/@content')
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
		translator.setHandler("itemDone", function (obj, item) {
			//for older translators AGU put NaN into the date fiel, but has the year
			if (item.title == item.title.toUpperCase()) {
				Z.debug("here")
				item.title = ZU.capitalizeTitle(item.title.toLowerCase(), true);
			}
			if (item.date.indexOf("NaN") != -1  && year) {
				item.date = year;
			}
			//the keywords are nonsense
			item.tags = [];
			item.complete();
		});
		translator.getTranslatorObject(function (obj) {
			obj.doWeb(doc, url);
		});
	}
	}
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.agu.org/journals/jz/v055/i003/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.agu.org/pubs/crossref/1950/JZ055i003p00235.shtml",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "David R.",
						"lastName": "Bates",
						"creatorType": "author"
					},
					{
						"firstName": "Marcel",
						"lastName": "Nicolet",
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
				"itemID": "http://www.agu.org/pubs/crossref/1950/JZ055i003p00235.shtml",
				"title": "Theoretical Considerations Regarding the Altitude of the Layer Responsible for the Nocturnal Emission of the Sodium D-Lines",
				"publicationTitle": "Journal of Geophysical Research",
				"rights": "© 2008 American Geophysical Union",
				"volume": "55",
				"issue": "3",
				"number": "3",
				"patentNumber": "3",
				"pages": "235-239",
				"publisher": "American Geophysical Union",
				"institution": "American Geophysical Union",
				"company": "American Geophysical Union",
				"label": "American Geophysical Union",
				"distributor": "American Geophysical Union",
				"date": "1950",
				"ISSN": "0148-0227",
				"language": "English",
				"abstractNote": "The altitude of the layer responsible for the nocturnal emission of the D-lines is discussed theoretically. General arguments are used to show that if the luminosity originates directly from atmospheric sodium, its location must be far lower than is indicated by the recent observations of Barbier and Roach. Should these prove to be even approximately correct, some other source would apparently have to be invoked.",
				"DOI": "10.1029/JZ055i003p00235",
				"url": "http://www.agu.org/pubs/crossref/1950/JZ055i003p00235.shtml",
				"accessDate": "CURRENT_TIMESTAMP",
				"libraryCatalog": "www.agu.org"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.agu.org/pubs/crossref/1997/97EO00127.shtml",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Garry",
						"lastName": "Clarke",
						"creatorType": "author"
					},
					{
						"firstName": "Mark F.",
						"lastName": "Meier",
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
				"itemID": "http://www.agu.org/pubs/crossref/1997/97EO00127.shtml",
				"title": "Meier receives the Horton Medal",
				"publicationTitle": "Eos, Transactions American Geophysical Union",
				"rights": "© 2008 American Geophysical Union",
				"volume": "78",
				"issue": "18",
				"number": "18",
				"patentNumber": "18",
				"pages": "188-189",
				"publisher": "American Geophysical Union",
				"institution": "American Geophysical Union",
				"company": "American Geophysical Union",
				"label": "American Geophysical Union",
				"distributor": "American Geophysical Union",
				"date": "1997",
				"ISSN": "0096-3941",
				"language": "English",
				"journalAbbreviation": "Eos Trans. AGU",
				"abstractNote": "Mark F. Meier received the Roger E. Horton Medal on December 17, 1996, at the AGU Fall Meeting Honor Ceremony in San Francisco, Calif. The Horton Medal acknowledges outstanding contributions to the geophysical aspects of hydrology. The award citation and Meier's response are given here.",
				"DOI": "10.1029/97EO00127",
				"url": "http://www.agu.org/pubs/crossref/1997/97EO00127.shtml",
				"accessDate": "CURRENT_TIMESTAMP",
				"libraryCatalog": "www.agu.org"
			}
		]
	},
	{
		"type": "web",
		"url": "http://europa.agu.org/?view=results&simp=1&q=test",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.agu.org/journals/gl/gl0420/2004GL020398/body.shtml",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "C. D.",
						"lastName": "Nevison",
						"creatorType": "author"
					},
					{
						"firstName": "D. E.",
						"lastName": "Kinnison",
						"creatorType": "author"
					},
					{
						"firstName": "R. F.",
						"lastName": "Weiss",
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
				"itemID": "http://www.agu.org/pubs/crossref/2004/2004GL020398.shtml",
				"rights": "© 2008 American Geophysical Union",
				"issue": "20",
				"ISSN": "0094-8276",
				"language": "English",
				"journalAbbreviation": "Geophys. Res. Lett.",
				"abstractNote": "The stratospheric influence on the tropospheric seasonal cycles of N2O, CFC-11 (CCl3F), CFC-12 (CCl2F2) and CFC-113 (CCl2FCClF2) is investigated using observations from the AGAGE global trace gas monitoring network and the results of the Whole Atmosphere Community Climate Model (WACCM). WACCM provides the basis for a number of predictions about the relative amplitudes of N2O and CFC seasonal cycles and about the relative magnitude and phasing of seasonal cycles in the northern and southern hemispheres. These predictions are generally consistent with observations, suggesting that the stratosphere exerts a coherent influence on the tropospheric seasonal cycles of trace gases whose primary sinks are in the stratosphere. This stratospheric influence may complicate efforts to validate estimated source distributions of N2O, an important greenhouse gas, in atmospheric transport model studies.",
				"DOI": "10.1029/2004GL020398",
				"url": "http://www.agu.org/pubs/crossref/2004/2004GL020398.shtml",
				"libraryCatalog": "www.agu.org",
				"title": "Stratospheric influences on the tropospheric seasonal cycles of nitrous oxide and chlorofluorocarbons",
				"publicationTitle": "Geophysical Research Letters",
				"volume": "31",
				"pages": "L20103",
				"date": "21 October 2004"
			}
		]
	}
]
/** END TEST CASES **/