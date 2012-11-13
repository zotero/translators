{
	"translatorID": "5af42734-7cd5-4c69-97fc-bc406999bdba",
	"label": "ESA Journals",
	"creator": "Sebastian Karcher",
	"target": "^http://www\\.esajournals\\.org/",
	"minVersion": "2.1",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2012-11-12 20:51:45"
}

/*
ESA Journals Translator
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


function detectWeb(doc, url) {
	if (url.match(/\/doi\/abs\/10\.|\/doi\/full\/10\./)) return "journalArticle";
	else if (url.match(/\/action\/doSearch|\/toc\//)) return "multiple";
}


function doWeb(doc, url) {
	var arts = new Array();
	if (detectWeb(doc, url) == "multiple") {
		var items = new Object();
		var rows = ZU.xpath(doc, '//table[@class="articleEntry"]');
		for (var i in rows) {
			var title = ZU.xpathText(rows[i], './/div[@class="art_title"]');
			//Z.debug(title)
			var id = ZU.xpathText(rows[i], './/a[contains(@href, "/doi/abs/")][1]/@href');
			//	Z.debug(id)
			items[id] = title;
		}
		Zotero.selectItems(items, function (items) {
			if (!items) {
				return true;
			}
			urls = new Array();
			for (var itemurl in items) {
				//Z.debug(itemurl)
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
	url = url.replace(/\?.+/, "")
	var pdfurl = url.replace(/\/doi\/abs\/|\/doi\/full\//, "/doi/pdf/");
	var doi = url.match(/10\.[^?]+/)[0]
	var citationurl = url.replace(/\/doi\/abs\/|\/doi\/full\//, "/action/showCitFormats?doi=");
	var abstract = ZU.xpathText(doc, '//div[@class="abstractSection"]')
	var tags = ZU.xpath(doc, '//p[@class="fulltext"]//a[contains(@href, "keywordsfield")]')
	//Z.debug(citationurl)	
	ZU.processDocuments(citationurl, function(doc){
	var filename = doc.evaluate('//form[@target="_self"]/input[@name="downloadFileName"]', doc, null, XPathResult.ANY_TYPE, null).iterateNext().value;
	//Z.debug(filename);
	var get = '/action/downloadCitation';
	var post = 'doi=' + doi + '&downloadFileName=' + filename + '&format=ris&direct=true&include=cit';
	Zotero.Utilities.HTTP.doPost(get, post, function (text) {
		var translator = Zotero.loadTranslator("import");
		// Calling the RIS translator
		translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
		translator.setString(text);
		translator.setHandler("itemDone", function (obj, item) {
			item.url = url;
			item.notes = [];
			for (var i in tags){
				item.tags.push(tags[i].textContent)
			}
			item.abstractNote = abstract;
			item.attachments = [{
				url: pdfurl,
				title: "ESA PDF fulltext",
				mimeType: "application/pdf"
			}, {
				document: doc,
				title: "ESA Snapshot",
				mimeType: "text/html"
			}];
			item.complete();
		});
		translator.translate();
	});
	})
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.esajournals.org/doi/abs/10.1890/09-1234.1",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"lastName": "Gao",
						"firstName": "Chao",
						"creatorType": "author"
					},
					{
						"lastName": "Wang",
						"firstName": "Han",
						"creatorType": "author"
					},
					{
						"lastName": "Weng",
						"firstName": "Ensheng",
						"creatorType": "author"
					},
					{
						"lastName": "Lakshmivarahan",
						"firstName": "S.",
						"creatorType": "author"
					},
					{
						"lastName": "Zhang",
						"firstName": "Yanfen",
						"creatorType": "author"
					},
					{
						"lastName": "Luo",
						"firstName": "Yiqi",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"carbon cycle",
					"data assimilation",
					"ecological forecast",
					"ensemble Kalman filter (EnKF)",
					"parameter estimation",
					"uncertainty analysis"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "ESA PDF fulltext",
						"mimeType": "application/pdf"
					},
					{
						"title": "ESA Snapshot",
						"mimeType": "text/html"
					}
				],
				"title": "Assimilation of multiple data sets with the ensemble Kalman filter to improve forecasts of forest carbon dynamics",
				"date": "February 22, 2011",
				"DOI": "10.1890/09-1234.1",
				"publicationTitle": "Ecological Applications",
				"journalAbbreviation": "Ecological Applications",
				"pages": "1461-1473",
				"volume": "21",
				"issue": "5",
				"publisher": "Ecological Society of America",
				"ISSN": "1051-0761",
				"url": "http://www.esajournals.org/doi/abs/10.1890/09-1234.1",
				"abstractNote": "The ensemble Kalman filter (EnKF) has been used in weather forecasting to assimilate observations into weather models. In this study, we examine how effectively forecasts of a forest carbon cycle can be improved by assimilating observations with the EnKF. We used the EnKF to assimilate into the terrestrial ecosystem (TECO) model eight data sets collected at the Duke Forest between 1996 and 2004 (foliage biomass, fine root biomass, woody biomass, litterfall, microbial biomass, forest floor carbon, soil carbon, and soil respiration). We then used the trained model to forecast changes in carbon pools from 2004 to 2012. Our daily analysis of parameters indicated that all the exit rates were well constrained by the EnKF, with the exception of the exit rates controlling the loss of metabolic litter and passive soil organic matter. The poor constraint of these two parameters resulted from the low sensitivity of TECO predictions to their values and the poor correlation between these parameters and the observed variables. Using the estimated parameters, the model predictions and observations were in agreement. Model forecasts indicate 15 380–15 660 g C/m2 stored in Duke Forest by 2012 (a 27% increase since 2004). Parameter uncertainties decreased as data were sequentially assimilated into the model using the EnKF. Uncertainties in forecast carbon sinks increased over time for the long-term carbon pools (woody biomass, structure litter, slow and passive SOM) but remained constant over time for the short-term carbon pools (foliage, fine root, metabolic litter, and microbial carbon). Overall, EnKF can effectively assimilate multiple data sets into an ecosystem model to constrain parameters, forecast dynamics of state variables, and evaluate uncertainty.",
				"libraryCatalog": "ESA Journals",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.esajournals.org/toc/ecap/21/5",
		"items": "multiple"
	}
]
/** END TEST CASES **/