{
	"translatorID": "d8873d23-d874-4b62-b081-1db12ff5a5de",
	"label": "ILO Labordoc",
	"creator": "Sebastian Karcher",
	"target": "^https?://labordoc\\.ilo\\.org",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2013-02-18 13:08:49"
}

/*
	***** BEGIN LICENSE BLOCK *****
	
	Copyright © 2011 Sebastian Karcher and the Center for History and New Media
					 George Mason University, Fairfax, Virginia, USA
					 http://zotero.org
	
	This file is part of Zotero.
	
	Zotero is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.
	
	Zotero is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU Affero General Public License for more details.
	
	You should have received a copy of the GNU Affero General Public License
	along with Zotero.  If not, see <http://www.gnu.org/licenses/>.
	
	***** END LICENSE BLOCK *****
*/

function detectWeb(doc, url) {
	if (url.match(/\/search\?/)) return "multiple";
	else if (url.match(/\/record\//)) return "book";
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		var articles = [];
		var items = {};
		var titles = doc.evaluate('//tr[contains(@class, "tablesearchresults")]/td/a[@class="detailsTitle"]', doc, null, XPathResult.ANY_TYPE, null);
		var title;
		while (title = titles.iterateNext()) {
			items[title.href] = title.textContent;
		}
		Zotero.selectItems(items, function (items) {
			if (!items) {
				return true;
			}
			for (var i in items) {
				articles.push(i.replace(/\?/, "/export/xm?"));
			}
			Zotero.Utilities.HTTP.doGet(articles, scrape);
		});


	} else {
		Zotero.Utilities.HTTP.doGet(url.replace(/\?/, "/export/xm?"), scrape);
	}
}

function scrape(text) {
	var docxml = (new DOMParser()).parseFromString(text, "text/xml");
	ns = {"marc": "http://www.loc.gov/MARC21/slim"};
	var xpath = '//marc:datafield[@tag="856"]/marc:subfield[contains(text(),".pdf")]/text()';
	var pdflink = ZU.xpath(docxml, xpath, ns);
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("edd87d07-9194-42f8-b2ad-997c4c7deefd");
		translator.setString(text);
		translator.setHandler("itemDone", function (obj, item) {
				for (i in pdflink) {
					item.attachments[i] = ({
						url: pdflink[i].textContent,
						title: "ILO Labordoc Full Text PDF",
						mimeType: "application/pdf"
					});
				}
			item.complete();
		});
		translator.translate();
} 
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://labordoc.ilo.org/record/440523?ln=en",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"lastName": "International Labour Organization",
						"fieldMode": true
					},
					{
						"lastName": "International Labour Organization",
						"fieldMode": true
					}
				],
				"notes": [
					{
						"note": "Second item on the agenda"
					},
					{
						"note": "The following items are proposed for the agenda of the 103rd Session (2014) of the International Labour Conference: a recurrent discussion on the strategic objective of employment, the consolidation of three Recommendations on the right to information and consultation (as a follow-up to the conclusions of the Cartier Working Party), as well as the proposals for the agenda of the International Labour Conference contained in GB.312/INS/2/1 not selected for the agenda of the 102nd Session (2013) of the Conference"
					}
				],
				"tags": [
					"International Labour Conference",
					"agenda",
					"Conférence internationale du Travail",
					"ordre du jour",
					"Conferencia Internacional del Trabajo",
					"agenda",
					"ILO pub",
					"pub OIT",
					"pub OIT"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "ILO Labordoc Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "ILO Labordoc Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "ILO Labordoc Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "ILO Labordoc Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"title": "Agenda of the International Labour Conference: Proposals for the agenda of the 103rd Session (2014) of the Conference",
				"place": "Geneva",
				"publisher": "ILO",
				"date": "2011",
				"numPages": "9",
				"callNumber": "GB.312/INS/2/2",
				"libraryCatalog": "ILO Labordoc",
				"shortTitle": "Agenda of the International Labour Conference"
			}
		]
	},
	{
		"type": "web",
		"url": "http://labordoc.ilo.org/record/441828?ln=en",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"lastName": "Statistical Office of the European Communities",
						"fieldMode": true
					}
				],
				"notes": [
					{
						"note": "Theme: Population and social conditions"
					},
					{
						"note": "Provides details in relation to population ageing and setting the scene as regards the dynamics of demographic change, and details the past, present and projected future structure of the EU's population. Presents information in relation to the demand for healthcare services, as well as the budgetary implications facing governments as their populations continue to age. Contains information relating to the active participation of older generations within society, with a particular focus on inter-generational issues and also includes information on the leisure pursuits and social activities undertaken by older persons"
					}
				],
				"tags": [
					"older people",
					"older worker",
					"retired worker",
					"ageing population",
					"employment opportunity",
					"social security",
					"quality of life",
					"EU countries",
					"personnes âgées",
					"travailleur âgé",
					"travailleur retraité",
					"vieillissement de la population",
					"possibilités d'emploi",
					"sécurité sociale",
					"qualité de la vie",
					"pays de l'UE",
					"personas de edad avanzada",
					"trabajador de edad avanzada",
					"jubilado",
					"envejecimiento de la población",
					"oportunidades de empleo",
					"seguridad social",
					"calidad de la vida",
					"países de la UE",
					"statistical table",
					"EU pub",
					"tableau statistique",
					"pub UE",
					"cuadros estadísticos",
					"pub UE"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "ILO Labordoc Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"ISBN": "9789279215070",
				"title": "Active ageing and solidarity between generations: a statistical portrait of the European Union 2012",
				"edition": "2012 ed",
				"place": "Luxembourg",
				"publisher": "Publications Office of the European Union",
				"date": "2012",
				"numPages": "141",
				"series": "Statistical books",
				"callNumber": "112B26/3 engl",
				"libraryCatalog": "ILO Labordoc",
				"shortTitle": "Active ageing and solidarity between generations"
			}
		]
	}
]
/** END TEST CASES **/