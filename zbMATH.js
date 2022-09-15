{
	"translatorID": "1d84c107-9dbb-4b87-8208-e3632b87889f",
	"label": "zbMATH",
	"creator": "Philipp Zumstein",
	"target": "^https?://(www\\.)?zbmath\\.org/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-09-10 18:47:46"
}

/*
	***** BEGIN LICENSE BLOCK *****
	
	zbMATH Translator, Copyright © 2014 Philipp Zumstein
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


function detectWeb(doc, _url) {
	if (ZU.xpath(doc, '//div[@class="list"]/article').length > 0) {
		return "multiple";
	}
	else if (ZU.xpath(doc, '//a[contains(@class, "bib")]').length > 0) { // contains
		// it is a single entry --> generic fallback = journalArticle
		return "journalArticle";
	}
	return false;
}

function scrape(doc, _url) {
	var bibArray = doc.getElementsByClassName("bib");
	var bibUrl = bibArray[0].getAttribute('href');// e.g. "bibtex/06115874.bib"

	ZU.doGet(bibUrl, function (text) {
		// Z.debug(text);
		
		var trans = Zotero.loadTranslator('import');
		trans.setTranslator('9cb70025-a888-4a29-a210-93ec52da40d4');// https://github.com/zotero/translators/blob/master/BibTeX.js
		trans.setString(text);

		trans.setHandler('itemDone', function (obj, item) {
			item.title = item.title.replace(/\.$/, '');
			
			if (item.publisher) {
				var publisherSeparation = item.publisher.indexOf(":");
				if (publisherSeparation != -1) {
					item.place = item.publisher.substr(0, publisherSeparation);
					item.publisher = item.publisher.substr(publisherSeparation + 1);
				}
			}
			
			// keywords are normally not in the bib file, so we take them from the page
			// moreover, the meaning of the MSC classification is also only given on the page
			if (item.tags.length == 0) {
				var keywords = ZU.xpath(doc, '//div[@class="keywords"]/a');
				for (var i = 0; i < keywords.length; i++) {
					item.tags.push(keywords[i].textContent);
				}
				var classifications = ZU.xpath(doc, '//div[@class="classification"]//tr');
				for (let classification of classifications) {
					item.extra = (item.extra ? item.extra + "\n" : '') + 'MSC2010: ' + ZU.trimInternal(ZU.xpathText(classification, './td', null, " = "));
				}
			}
			
			// add abstract but not review
			var abstractOrReview = ZU.xpathText(doc, '//div[@class="abstract"]');
			if (abstractOrReview.indexOf('Summary') == 0) {
				item.abstractNote = abstractOrReview.replace(/^Summary:?\s*/, '');
			}
			
			item.attachments = [{
				title: "Snapshot",
				document: doc
			}];

			var id = ZU.xpath(doc, '//div[@class="title"]/a[@class="label"]')[0];
			if (id) {
				if (!item.extra) item.extra = '';
				else item.extra += "\n";
				
				item.extra += 'Zbl: ' + ZU.trimInternal(id.textContent)
					.replace(/^\s*Zbl\s+/i, ''); // e.g. Zbl 1255.05045
				item.url = id.href;
			}
			
			item.complete();
			// Z.debug(item);
		});
		
		trans.translate();
	});
}


function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		var items = {};
		var rows = ZU.xpath(doc, '//div[@class="list"]/article');
		for (let row of rows) {
			var title = ZU.xpathText(row, './div[@class="title"]/a[1]');
			var link = ZU.xpathText(row, './div[@class="title"]/a[1]/@href');
			items[link] = title;
		}
		Zotero.selectItems(items, function (items) {
			if (items) ZU.processDocuments(Object.keys(items), scrape);
		});
	}
	else {
		scrape(doc, url);
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.zbmath.org/?q=an:06115874",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Sharp threshold for the appearance of certain spanning trees in random graphs",
				"creators": [
					{
						"firstName": "Dan",
						"lastName": "Hefetz",
						"creatorType": "author"
					},
					{
						"firstName": "Michael",
						"lastName": "Krivelevich",
						"creatorType": "author"
					},
					{
						"firstName": "Tibor",
						"lastName": "Szabó",
						"creatorType": "author"
					}
				],
				"date": "2012",
				"DOI": "10.1002/rsa.20472",
				"ISSN": "1042-9832",
				"abstractNote": "We prove that a given tree TT on n vertices with bounded maximum degree is contained asymptotically almost surely in the binomial random graph G(n,(1+ε)lognn)G\\left(n,\\frac {(1+\\varepsilon)\\log n}{n}\\right) provided that TT belongs to one of the following two classes: \n\n(1)TT has linearly many leaves; (2)TT has a path of linear length all of whose vertices have degree two in TT.",
				"extra": "MSC2010: 05C05 = Trees\nMSC2010: 05C80 = Random graphs (graph-theoretic aspects)\nZbl: 1255.05045",
				"issue": "4",
				"itemID": "zbMATH06115874",
				"journalAbbreviation": "Random Struct. Algorithms",
				"language": "English",
				"libraryCatalog": "zbMATH",
				"pages": "391–412",
				"publicationTitle": "Random Structures & Algorithms",
				"url": "https://www.zbmath.org/?q=an%3A1255.05045",
				"volume": "41",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "random graphs"
					},
					{
						"tag": "sharp thresholds"
					},
					{
						"tag": "spanning trees"
					},
					{
						"tag": "tree-universality"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.zbmath.org/?q=se:00001331+ai:bollobas.bela",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://zbmath.org/?q=an:06212000",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Basic network creation games",
				"creators": [
					{
						"firstName": "Noga",
						"lastName": "Alon",
						"creatorType": "author"
					},
					{
						"firstName": "Erik D.",
						"lastName": "Demaine",
						"creatorType": "author"
					},
					{
						"firstName": "Mohammad T.",
						"lastName": "Hajiaghayi",
						"creatorType": "author"
					},
					{
						"firstName": "Tom",
						"lastName": "Leighton",
						"creatorType": "author"
					}
				],
				"date": "2013",
				"DOI": "10.1137/090771478",
				"ISSN": "0895-4801",
				"extra": "MSC2010: 90C27 = Combinatorial optimization\nMSC2010: 05C85 = Graph algorithms (graph-theoretic aspects)\nMSC2010: 91A06 = nn-person games, n>2n>2\nZbl: 1273.90167",
				"issue": "2",
				"itemID": "zbMATH06212000",
				"journalAbbreviation": "SIAM J. Discrete Math.",
				"language": "English",
				"libraryCatalog": "zbMATH",
				"pages": "656–668",
				"publicationTitle": "SIAM Journal on Discrete Mathematics",
				"url": "https://zbmath.org/?q=an%3A1273.90167",
				"volume": "27",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "equilibrium"
					},
					{
						"tag": "low diameter"
					},
					{
						"tag": "network creation"
					},
					{
						"tag": "network design"
					},
					{
						"tag": "price of anarchy"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://zbmath.org/?q=cc:35",
		"items": "multiple"
	}
]
/** END TEST CASES **/
