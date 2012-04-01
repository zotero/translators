{
	"translatorID": "a29d22b3-c2e4-4cc0-ace4-6c2326144332",
	"label": "CABI - CAB Abstracts",
	"creator": "Sebastian Karcher",
	"target": "^https?://www\\.cabidirect\\.org/",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "g",
	"lastUpdated": "2012-03-31 11:21:08"
}

/*
	Translator for CABI/CABIDIRECT
   Copyright (C) 2012 Sebastian Karcher

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
	var shortTag = ZU.xpath(doc, '//meta/@name')
	var hwType;
	for (i in shortTag) {
		switch (shortTag[i].textContent) {
		case "citation_journal_title":
			hwType = "journalArticle";
			break;
		case "citation_technical_report_institution":
			hwType = "report";
			break;
		case "citation_conference_title":
		case "citation_conference":
			hwType = "conferencePaper";
			break;
		case "citation_book_title":
			hwType = "bookSection";
			break;
		case "citation_dissertation_institution":
		case "citation_dissertation_name":
			hwType = "thesis";
			break;
		case "citation_title":
			//fall back to journalArticle, since this is quite common
		case "citation_series_title":
			//possibly journal article, though it could be book
			hwType = "journalArticle";
			break;
		}
	};
	if (hwType) return hwType;
	else if (url.match(/\/search\.html\?/)) {
		return "multiple";
	}
	return false;
}


function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		var hits = {};
		var urls = [];
		var results = ZU.xpath(doc, "//dt/a[@class='resultLink'][1]");

		for (var i in results) {
			hits[results[i].href] = results[i].textContent;
		}
		Z.selectItems(hits, function (items) {
			if (items == null) return true;
			for (var j in items) {
				urls.push(j);
			}
			Zotero.Utilities.processDocuments(urls, scrape, function () {
				Zotero.done();
			});
			Zotero.wait();
		});
	} else {
		scrape(doc, url)
	}
}

function scrape(doc, url) {
	var type = detectWeb(doc, url);
	var pdfurl = ZU.xpathText(doc, '//a[@class="viewFullText"]/@href');
	var id = url.match(/\/[^\/]+\.html/)[0].replace(/[\/(\.html)]/g, "");
	Z.debug(id);
	var get = url.replace(/\/abstract.+/, "/citation.ris?pa") + id;
	var post = 'pa=' + id + '&full=citation_abstract&ris=Export+Endnote+%28RIS%29+format';
	Zotero.Utilities.HTTP.doPost(get, post, function (text) {
		var translator = Zotero.loadTranslator("import");
		// Calling the RIS translator
		translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
		translator.setString(text);
		translator.setHandler("itemDone", function (obj, item) {
			//their RIS uses some whacky item types - if the RIS translators falls back to docuemnt
			//use the detected type (if any) instead.
			if (item.itemType == "document" && type) item.itemType = type;
			item.attachments = [{
				url: url,
				title: "Cabidirect Snapshot",
				mimeType: "text/html"
			},
			//I don't have access to those PDFs, so no idea if this will work, but trying can't hurt;
			{
				url: pdfurl,
				title: "Cabidirect Full Text PDF",
				mimeType: "application/pdf"
			}];
			item.complete();
		});
		translator.translate();
	});
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.cabdirect.org/abstracts/20123011177.html",
		"items": [
			{
				"itemType": "thesis",
				"creators": [
					{
						"lastName": "Komorowski",
						"firstName": "C.",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Cabidirect Snapshot",
						"mimeType": "text/html"
					},
					{
						"url": null,
						"title": "Cabidirect Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"itemID": "20123011177",
				"title": "Longitudinal study on the practicality and efficacy of defined measures to control Johnes disease in four large dairy farms in Mecklenburg-Vorpommern.",
				"date": "2011",
				"pages": "95 pp.",
				"publisher": "Freie Universität Berlin",
				"place": "Berlin",
				"abstractNote": "Inclusion of paratuberculosis by OIE as a transmissible disease that is considered to be of socio-economic and/or public health importance and that is of significance in the international trade of animals and animal products, contributed towards intensified research on Map. The combination of a commonly prolonged subclinical course, inadequate diagnostic tools and absence of any cure is unique. Despite high Map-sero-prevalence levels and reports of substantial losses due to paratuberculosis in the dairy industry in industrialized countries, comparable and systematic studies at the national and regional level are rather scarce. For this, a longitudinal study involving implementation of distinct practical and cost-efficient hygiene and management measures and regular on farm visits, in order to reduce the within herd prevalence in four large dairy farms in Mecklenburg Western-Pomerania, was initiated. Diagnostic and clinical screening as well as an analysis of individual animal performance was undertaken. Between January 2003 and December 2009 14.222 dairy cows out of a total of 21.000 cattle were monitored at four large dairy farms in Meckelenburg-Westem Pomerania. Multiple individual tests on Map were targeted and resulted in optional Map-status classes (V1-V4ök) for each individual for analysis purposes, taking diagnostic test uncertainty of Map into account. Given this, 4.959 cows with two and more individual tests were included into the final analysis. Uni-and multivariate techniques were applied for data analysis. Within-herd prevalence rates for all study farms clearly showed declining Map-infection rates by age group, as did the proportion of Map-positive offspring from Map-positive dams as well as the absolute number of clinical cases. Data analysis showed significant associations between Map-status and lactation performance across all farms. Moreover, in the final mixed linear model, animal age and farm management showed significant interactions with Map-status. However, parameters partially showed conflicting results that were caused by the Map-test characteristics and a commonly large variation of data. Therefore, the economic analysis did not prove a significantly better average performance by Map-negative dams compared to positive individuals. In this context a generally low productive life span of dams of less than three lactations has to be taken into account. Givens this in conjunction with low milk market prices, farmers are hesitant to consistently remove apparently healthy but Map-positive dams from their herds. Overall, the results provide clear evidence that a farm-specific Map-control strategy, following defined hygiene measures will succeed. For this, affected dairy farmers have to take a minimum of two cow generations and the costs for a concurrent diagnostic herd screening into account. Everyone at the farm has to comply with a range of strict hygiene measures. For such a scheme, specific veterinary expertise at the very farm is needed.",
				"libraryCatalog": "CABI - CAB Abstracts"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.cabdirect.org/abstracts/20123087839.html",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"lastName": "Paterson",
						"firstName": "D. G.",
						"creatorType": "author"
					},
					{
						"lastName": "Barnard",
						"firstName": "R. O.",
						"creatorType": "author"
					}
				],
				"notes": [
					{
						"note": "<p>Author Affiliation: Department of Plant Production and Soil Science, University of Pretoria, Pretoria, South Africa.</p>"
					},
					{
						"note": "<p>Author Email: garry@arc.agric.za</p>"
					}
				],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Cabidirect Snapshot",
						"mimeType": "text/html"
					},
					{
						"url": null,
						"title": "Cabidirect Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"itemID": "20123087839",
				"title": "Beneficial effect of palm geotextiles on inter-rill erosion in South African soils: field trials.",
				"publicationTitle": "South African Journal of Plant and Soil",
				"date": "2011",
				"volume": "28",
				"issue": "3",
				"pages": "190-197",
				"publisher": "Forum Press",
				"place": "Boordfontein",
				"abstractNote": "Geotextile mats made of woven palm leaves showed potential using a rainfall simulator for their effectiveness in reducing surface runoff and sediment load from a range of South African soils and mine tailings. This paper advances that research by using field plots to evaluate and quantify the palm mats on a larger scale. Plots at four localities (Bergville, Ladybrand, Roodeplaat and Mabula) were used. Results showed that average runoff under the palm mats decreased by between 45% and 70% at Bergville, and by between 38% and 41% at Ladybrand, compared to bare soil. Sediment load under the mats decreased by between 54% and 75% at Ladybrand, and by between 38% and 89% at Roodeplaat, for three different combinations of slope, mat density and mat mesh size. At Roodeplaat, splash erosion decreased by between 62% and 68%, while at Ladybrand and Mabula, re-vegetation increased by between 38% and 58%. Organic carbon content and topsoil surface levels also increased under the mats. Organic, bio-degradable, easy to manufacture geotextiles, such as palm leaf mats, show much potential, especially in combining employment opportunities with enhanced environmental protection in many susceptible areas of South Africa.",
				"libraryCatalog": "CABI - CAB Abstracts",
				"shortTitle": "Beneficial effect of palm geotextiles on inter-rill erosion in South African soils"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.cabdirect.org/search.html?q=test",
		"items": "multiple"
	}
]
/** END TEST CASES **/