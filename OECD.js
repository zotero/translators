{
	"translatorID": "8cf74360-e772-4818-8cf1-eda0481c7dfb",
	"label": "OECD",
	"creator": "Sebastian Karcher and Abe Jellinek",
	"target": "^https?://(www\\.)?oecd-ilibrary\\.org/",
	"minVersion": "2.1",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcs",
	"lastUpdated": "2021-10-08 04:15:50"
}

/*
	***** BEGIN LICENSE BLOCK *****
	
	Copyright © 2012-2021 Sebastian Karcher and Abe Jellinek
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

function detectWeb(doc, _url) {
	var bodyId = doc.body.getAttribute("id");
	if (doc.querySelector('.sidebar-buttons form[action*="/citation"]')) {
		if (ZU.xpathText(doc, '//li[@class="editorial-board"]')) {
			return "journalArticle";
		}
		else if (bodyId == "book") {
			return "book";
		}
		else {
			return "report";
		}
	}
	return false;
	// no search results for the time being - many results link to pages we
	// can't scrape
}

function doWeb(doc, url) {
	var translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	
	translator.setHandler('itemDone', function (obj, item) {
		item.attachments = [];
		
		let pdfURL = attr(doc, '.action-pdf', 'href');
		if (pdfURL) {
			item.attachments.push({
				title: 'Full Text PDF',
				mimeType: 'application/pdf',
				url: pdfURL
			});
		}
		
		if (!item.place) {
			item.place = 'Paris';
		}
		
		if (!item.creators.length) {
			item.creators.push({
				lastName: 'OECD',
				creatorType: 'author',
				fieldMode: 1
			});
		}
		
		if (!item.tags.length) {
			item.tags = text(doc, '.keyword')
				.replace(/^Keywords:/, '')
				.split(', ')
				.map(tag => ({ tag }));
		}
		
		if (item.reportType == 'Text') {
			item.reportType = '';
		}
		
		if (!item.publisher || item.publisher == 'OECD') {
			item.publisher = 'Organisation for Economic Co-operation and Development';
		}
		
		if (item.itemType == 'book') {
			item.ISBN = ZU.cleanISBN(text(doc, '.block-infos-sidebar .mg-t-zero'));
		}
		
		item.libraryCatalog = 'OECD iLibrary';
		
		item.date = ZU.strToISO(item.date);
		
		if (item.date) {
			item.complete();
		}
		else {
			ZU.doGet(url.replace(/[?#].*$/, '') + '/cite/endnote', function (enwText) {
				item.date = (enwText.match(/^%D (.+)$/m) || [])[1];
				item.complete();
			});
		}
	});

	translator.getTranslatorObject(function (trans) {
		trans.itemType = detectWeb(doc, url);
		trans.doWeb(doc, url);
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.oecd-ilibrary.org/economics/current-account-benchmarks-for-turkey_5k92smtqp9vk-en",
		"items": [
			{
				"itemType": "report",
				"title": "Current Account Benchmarks for Turkey",
				"creators": [
					{
						"firstName": "Oliver",
						"lastName": "Röhn",
						"creatorType": "author"
					}
				],
				"date": "2012-09-14",
				"abstractNote": "Turkey’s current account deficit widened to almost 10% of GDP in 2011 and has been narrowing only gradually since. An important question is to what extent Turkey’s current account deficit is excessive. To explore this issue, one needs to establish benchmarks. In this paper current account benchmarks are derived using the external sustainability as well as the macroeconomic balance approach. However, the standard macroeconomic balance approach ignores the uncertainty inherent in the model selection process given the relatively large number of possible determinants of current account balances. This paper therefore extends the macroeconomic balance approach to account for model uncertainty by using Bayesian Model Averaging techniques. Results from both approaches suggest that current account benchmarks for the current account deficit lie in the range of 3% to 5½ per cent of GDP, which is broadly in line with previous estimates but substantially below recent current account deficit levels. This Working Paper relates to the 2012 OECD Economic Survey of Turkey (www.oecd.org/eco/surveys/turkey).",
				"extra": "DOI: 10.1787/5k92smtqp9vk-en",
				"institution": "Organisation for Economic Co-operation and Development",
				"language": "en",
				"libraryCatalog": "OECD iLibrary",
				"place": "Paris",
				"url": "https://www.oecd-ilibrary.org/economics/current-account-benchmarks-for-turkey_5k92smtqp9vk-en",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": " external sustainability"
					},
					{
						"tag": "Bayesian model averaging"
					},
					{
						"tag": "Turkey"
					},
					{
						"tag": "current account"
					},
					{
						"tag": "current account benchmarks"
					},
					{
						"tag": "model uncertainty"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.oecd-ilibrary.org/governance/better-regulation-in-europe-france-2010_9789264086968-en",
		"items": [
			{
				"itemType": "book",
				"title": "Better Regulation in Europe: France 2010",
				"creators": [
					{
						"lastName": "OECD",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "2010",
				"ISBN": "9789264086968",
				"abstractNote": "This report maps and analyses the core issues which together make up effective regulatory management for France, laying down a framework of what should be driving regulatory policy and reform in the future. Issues examined include: strategy and policies for improving regulatory management; institutional capacities for effective regulation and the broader policy making context; transparency and processes for effective public consultation and communication; processes for the development of new regulations, including impact assessment and for the management of the regulatory stock, including administrative burdens; compliance rates, enforcement policy and appeal processes; and the multilevel dimension: interface between different levels of government and interface between national processes and those of the EU. This book is part of a project examining better regulation, being carried out in partnership with the European Commission.",
				"language": "en",
				"libraryCatalog": "OECD iLibrary",
				"place": "Paris",
				"publisher": "Organisation for Economic Co-operation and Development",
				"shortTitle": "Better Regulation in Europe",
				"url": "https://www.oecd-ilibrary.org/governance/better-regulation-in-europe-france-2010_9789264086968-en",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
