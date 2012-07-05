{
	"translatorID": "0863b8ec-e717-4b6d-9e35-0b2db2ac6b0f",
	"label": "Institute of Pure and Applied Physics",
	"creator": "Sebastian Karcher",
	"target": "^https?://[a-z]+\\.(ipap|jsap)\\.jp/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2012-07-05 15:25:17"
}

/*
	***** BEGIN LICENSE BLOCK *****
	
	Copyright © 2011-2012 Sebastian Karcher and the Center for History and New Media
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
	if (url.match(/\/journal\/|\/findarticle\d?$/)) return "multiple";
	if (url.match(/\link\?|cgi-bin\/getarticle\?/)) return "journalArticle";
}
	
function makeURL(url){
	//creates the bibtex URL
	// http://ptp.ipap.jp/cgi-bin/dumparticle?mode=bibtex&journal=PTP&volume=127&page=209
	var journal = url.match (/([a-z]+)\.(ipap|jsap)\.jp/)[1];
	var institute = url.match (/([a-z]+)\.(ipap|jsap)\.jp/)[2];
	var volume = url.match(/([A-Za-z]+\/)(\d+)/)[2];
	var page = url.match(/([A-Za-z]+\/\d+\/)([\dA-Za-z]+)/)[2];
	//In some cases the abbreviations in the domain and further down are not the same...
	var journal2 = url.match(/(link\?)([A-Z]+)/)[2];
	var bibtexurl = "http://" + journal + "." + institute + ".jp/cgi-bin/dumparticle?mode=bibtex&journal=" +journal2 + "&volume=" + volume + "&page=" + page;
	Z.debug(bibtexurl)
	return bibtexurl;
}

function doWeb(doc, url){
	var articles = new Array();
	if(detectWeb(doc, url) == "multiple") { 
		var items = {};
		//we have to deal with some different search pages. This should capture most of them and avoid false positives
		var titles = doc.evaluate('//td/div/a[1][contains(@href, "/link?")]|//ul/li/a[contains(@href, "/link?")]|//ol/li/a[contains(@href, "/link?")]', doc, null, XPathResult.ANY_TYPE, null);
		var title;
		while (title = titles.iterateNext()) {
			items[title.href] = title.textContent;
		}
		Zotero.selectItems(items, function (items) {
			if (!items) {
				return true;
			}
			for (var i in items) {
				articles.push(i);
			}
			Zotero.Utilities.processDocuments(articles, scrape, function () {
				Zotero.done();
			});
		});
	} else {
		scrape(doc, url);
	}
}

function scrape(doc, url){
	//get the canonical URL from getarticles links
	if (!url.match(/\/link\?/)){
		url = ZU.xpathText(doc, '//meta[@name="DC.identifier"]/@content');
	}
	//Z.debug(url);
	//get abstract, pdflink and issn from article page
	var abs = ZU.xpathText(doc,'//p[@class="abstract"]');
	var pdfurl = url.replace(/\/$/, "") + "/pdf";
	var issn = ZU.xpathText(doc, '//meta[@name="PRISM.issn"]'); 
	//get BibTex Link
	var bibtexurl = makeURL(url);
	Zotero.Utilities.HTTP.doGet(bibtexurl, function (bibtex) {
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("9cb70025-a888-4a29-a210-93ec52da40d4");
		translator.setString(bibtex);
		translator.setHandler("itemDone", function(obj, item) {
			if (abs) item.abstractNote = abs.replace(/\n/g, "");
			item.attachments = [{url:item.url, title: "IPAP - Snapshot", mimeType: "text/html"}, {url:pdfurl, title: "IPAP - Full Text PDF", mimeType: "application/pdf"}];
			if (issn) item.ISSN = issn;
			item.complete();
		});	
		translator.translate();
	});
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://jjap.jsap.jp/link?JJAP/50/01AA01/",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Hyunho",
						"lastName": "Park",
						"creatorType": "author"
					},
					{
						"firstName": "Kong-soo",
						"lastName": "Lee",
						"creatorType": "author"
					},
					{
						"firstName": "Dohuyn",
						"lastName": "Baek",
						"creatorType": "author"
					},
					{
						"firstName": "Juseong",
						"lastName": "Kang",
						"creatorType": "author"
					},
					{
						"firstName": "Byungse",
						"lastName": "So",
						"creatorType": "author"
					},
					{
						"firstName": "Seok Il",
						"lastName": "Kwon",
						"creatorType": "author"
					},
					{
						"firstName": "Byoungdeok",
						"lastName": "Choi",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"url": "http://jjap.jsap.jp/link?JJAP/50/01AA01/",
						"title": "IPAP Snapshot",
						"mimeType": "text/html"
					},
					{
						"url": "http://jjap.jsap.jp/link?JJAP/50/01AA01/pdf",
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"url": "http://jjap.jsap.jp/link?JJAP/50/01AA01/",
				"publicationTitle": "Japanese Journal of Applied Physics",
				"ISSN": "0021-4922",
				"title": "Electrical Extractions of One Dimensional Doping Profile and Effective Mobility for Metal–Oxide–Semiconductor Field-Effect Transistors",
				"journalAbbreviation": "Jpn. J. Appl. Phys.",
				"volume": "50",
				"date": "2011",
				"pages": "01",
				"DOI": "10.1143/JJAP.50.01AA01",
				"abstractNote": "In this study, an attempt is made to provide a framework to assess and improve metal–oxide–semiconductor field-effect transistor (MOSFET) reliability from the early stage of the design to the completion of the product. A small gate area has very small capacitances that are difficult to measure, making capacitance–voltage (C–V) based techniques difficult or impossible. In view of these experimental difficulties, we tried electrical doping profiling measurement for MOSFET with short gate length, ultra thin oxide thickness and asymmetric source/drain structure and checked the agreement with simulation result. We could get the effective mobility by simple drain current versus drain bias voltage measurement. The calculated effective mobility was smaller than expected value and we explained some reasons. An accurate effective mobility for asymmetric source–drain junction transistor was successfully extracted by using the split C–V technique, with the capacitance measured between the gate and source–drain and between the gate and the substrate.",
				"libraryCatalog": "Institute of Pure and Applied Physics",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://jpsj.ipap.jp/link?JPSJ/80/053703/",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Ai",
						"lastName": "Yamakage",
						"creatorType": "author"
					},
					{
						"firstName": "Kentaro",
						"lastName": "Nomura",
						"creatorType": "author"
					},
					{
						"firstName": "Ken-Ichiro",
						"lastName": "Imura",
						"creatorType": "author"
					},
					{
						"firstName": "Yoshio",
						"lastName": "Kuramoto",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"url": "http://jpsj.ipap.jp/link?JPSJ/80/053703/",
						"title": "IPAP Snapshot",
						"mimeType": "text/html"
					},
					{
						"url": "http://jpsj.ipap.jp/link?JPSJ/80/053703/pdf",
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"url": "http://jpsj.ipap.jp/link?JPSJ/80/053703/",
				"publicationTitle": "Journal of the Physical Society of Japan",
				"ISSN": "0031-9015",
				"title": "Disorder-Induced Multiple Transition Involving Z2 Topological Insulator",
				"journalAbbreviation": "J. Phys. Soc. Jpn.",
				"volume": "80",
				"date": "2011",
				"pages": "053703",
				"DOI": "10.1143/JPSJ.80.053703",
				"abstractNote": "Effects of disorder on two-dimensional Z2 topological insulator are studied numerically by the transfer matrix method. Based on the scaling analysis, the phase diagram is derived for a model of HgTe quantum well as a function of disorder strength and magnitude of the energy gap. In the presence of sz non-conserving spin–orbit coupling, a finite metallic region is found that partitions the two topologically distinct insulating phases. As disorder increases, a narrow-gap topologically trivial insulator undergoes a series of transitions; first to metal, second to topological insulator, third to metal, and finally back to trivial insulator. We show that this multiple transition is a consequence of two disorder effects; renormalization of the band gap, and Anderson localization. The metallic region found in the scaling analysis corresponds roughly to the region of finite density of states at the Fermi level evaluated in the self-consistent Born approximation. ©2011 The Physical Society of Japan",
				"libraryCatalog": "Institute of Pure and Applied Physics",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	}
]
/** END TEST CASES **/