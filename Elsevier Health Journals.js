{
	"translatorID": "b043e7ed-b921-4444-88af-2fcc39881ee2",
	"label": "Elsevier Health Journals",
	"creator": "Sebastian Karcher",
	"target": "/action/doSearch\\?|/article/[^/]+/(abstract|fulltext|references|images)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 250,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsbv",
	"lastUpdated": "2021-11-24 23:10:20"
}

/*
   Copyright (C) 2013-2021 Sebastian Karcher

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


function detectWeb(doc, _url) {
	let copyright = text(doc, '.copy-right');
	if (!copyright.includes('Elsevier')) {
		return false;
	}
	
	if (doc.querySelector('meta[name="citation_journal_title"]')) {
		return "journalArticle";
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('h4.meta__title > a');
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(row.textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (items) ZU.processDocuments(Object.keys(items), scrape);
		});
	}
	else {
		scrape(doc, url);
	}
}

function scrape(doc, url) {
	var abstract = ZU.xpathText(doc, '//div[@class="abstract"]/div[contains(@class, "content")]/section/*', null, '\n');
	if (!abstract) abstract = ZU.xpathText(doc, '//div[@class="tContent"]/div[contains(@class, "content")]/section/*', null, '\n');
	var keywords = ZU.xpath(doc, '//div[@class="keywords"]/a');
	if (!keywords.length) keywords = ZU.xpath(doc, '//div[@class="tContent"]/p/span[contains(@class, "keyword")]');
	// We call the Embedded Metadata translator to do the actual work
	var translator = Zotero.loadTranslator('web');
	// use Embedded Metadata
	translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
	translator.setDocument(doc);
	translator.setHandler('itemDone', function (obj, item) {
		var m;
		if (item.publicationTitle && (m = item.publicationTitle.match(/^(.+), (the)$/i))) {
			item.publicationTitle = m[2] + ' ' + m[1];
		}
		if (item.date) {
			item.date = ZU.strToISO(item.date);
		}
		item.url = url;
		
		if (item.tags.length == 0) {
			for (var i in keywords) {
				var kw = keywords[i].textContent.trim();
				if (kw) item.tags.push(kw);
			}
		}
		// remove duplicate PMIDs
		if (item.extra) {
			item.extra = item.extra.replace(/(^PMID: \d+),.+/, "$1");
		}
		item.abstractNote = abstract;
		item.complete();
	});
	translator.translate();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.amjmed.com/article/S0002-9343(12)00352-X/fulltext",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Risk of Falls and Major Bleeds in Patients on Oral Anticoagulation Therapy",
				"creators": [
					{
						"firstName": "Jacques",
						"lastName": "Donzé",
						"creatorType": "author"
					},
					{
						"firstName": "Carole",
						"lastName": "Clair",
						"creatorType": "author"
					},
					{
						"firstName": "Balthasar",
						"lastName": "Hug",
						"creatorType": "author"
					},
					{
						"firstName": "Nicolas",
						"lastName": "Rodondi",
						"creatorType": "author"
					},
					{
						"firstName": "Gérard",
						"lastName": "Waeber",
						"creatorType": "author"
					},
					{
						"firstName": "Jacques",
						"lastName": "Cornuz",
						"creatorType": "author"
					},
					{
						"firstName": "Drahomir",
						"lastName": "Aujesky",
						"creatorType": "author"
					}
				],
				"date": "2012-08-01",
				"DOI": "10.1016/j.amjmed.2012.01.033",
				"ISSN": "0002-9343, 1555-7162",
				"issue": "8",
				"journalAbbreviation": "The American Journal of Medicine",
				"language": "English",
				"libraryCatalog": "www.amjmed.com",
				"pages": "773-778",
				"publicationTitle": "The American Journal of Medicine",
				"url": "https://www.amjmed.com/article/S0002-9343(12)00352-X/fulltext",
				"volume": "125",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Accidental falls"
					},
					{
						"tag": "Adverse drug events"
					},
					{
						"tag": "Anticoagulants"
					},
					{
						"tag": "Hemorrhage"
					},
					{
						"tag": "Risk factor"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.isct-cytotherapy.org/article/S1465-3249(12)70632-1/fulltext",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Initial cord blood unit volume affects mononuclear cell and CD34+ cell-processing efficiency in a non-linear fashion",
				"creators": [
					{
						"firstName": "Sandrine",
						"lastName": "Meyer-Monard",
						"creatorType": "author"
					},
					{
						"firstName": "André",
						"lastName": "Tichelli",
						"creatorType": "author"
					},
					{
						"firstName": "Carolyn",
						"lastName": "Troeger",
						"creatorType": "author"
					},
					{
						"firstName": "Caroline",
						"lastName": "Arber",
						"creatorType": "author"
					},
					{
						"firstName": "Grazia Nicoloso de",
						"lastName": "Faveri",
						"creatorType": "author"
					},
					{
						"firstName": "Alois",
						"lastName": "Gratwohl",
						"creatorType": "author"
					},
					{
						"firstName": "Eddy",
						"lastName": "Roosnek",
						"creatorType": "author"
					},
					{
						"firstName": "Daniel",
						"lastName": "Surbek",
						"creatorType": "author"
					},
					{
						"firstName": "Yves",
						"lastName": "Chalandon",
						"creatorType": "author"
					},
					{
						"firstName": "Olivier",
						"lastName": "Irion",
						"creatorType": "author"
					},
					{
						"firstName": "Damiano",
						"lastName": "Castelli",
						"creatorType": "author"
					},
					{
						"firstName": "Jakob",
						"lastName": "Passweg",
						"creatorType": "author"
					},
					{
						"firstName": "Vincent",
						"lastName": "Kindler",
						"creatorType": "author"
					}
				],
				"date": "2012-02-01",
				"DOI": "10.3109/14653249.2011.634404",
				"ISSN": "1465-3249",
				"extra": "PMID: 22136296",
				"issue": "2",
				"journalAbbreviation": "Cytotherapy",
				"language": "English",
				"libraryCatalog": "www.isct-cytotherapy.org",
				"pages": "215-222",
				"publicationTitle": "Cytotherapy",
				"url": "https://www.isct-cytotherapy.org/article/S1465-3249(12)70632-1/fulltext",
				"volume": "14",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					},
					{
						"title": "PubMed entry",
						"mimeType": "text/html",
						"snapshot": false
					}
				],
				"tags": [
					{
						"tag": "cell banking"
					},
					{
						"tag": "hematopoietic stem cell"
					},
					{
						"tag": "hydroxyethyl starch"
					},
					{
						"tag": "processing efficiency"
					},
					{
						"tag": "umbilical cord blood"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.isct-cytotherapy.org/action/doSearch?text1=test&field1=AllField",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.thelancet.com/journals/lancet/article/PIIS0140-6736(21)01431-8/fulltext?hss_channel=tw-27013292",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Antibiotics for lower respiratory tract infection in children presenting in primary care in England (ARTIC PC): a double-blind, randomised, placebo-controlled trial",
				"creators": [
					{
						"firstName": "Paul",
						"lastName": "Little",
						"creatorType": "author"
					},
					{
						"firstName": "Nick A.",
						"lastName": "Francis",
						"creatorType": "author"
					},
					{
						"firstName": "Beth",
						"lastName": "Stuart",
						"creatorType": "author"
					},
					{
						"firstName": "Gilly",
						"lastName": "O'Reilly",
						"creatorType": "author"
					},
					{
						"firstName": "Natalie",
						"lastName": "Thompson",
						"creatorType": "author"
					},
					{
						"firstName": "Taeko",
						"lastName": "Becque",
						"creatorType": "author"
					},
					{
						"firstName": "Alastair D.",
						"lastName": "Hay",
						"creatorType": "author"
					},
					{
						"firstName": "Kay",
						"lastName": "Wang",
						"creatorType": "author"
					},
					{
						"firstName": "Michael",
						"lastName": "Sharland",
						"creatorType": "author"
					},
					{
						"firstName": "Anthony",
						"lastName": "Harnden",
						"creatorType": "author"
					},
					{
						"firstName": "Guiqing",
						"lastName": "Yao",
						"creatorType": "author"
					},
					{
						"firstName": "James",
						"lastName": "Raftery",
						"creatorType": "author"
					},
					{
						"firstName": "Shihua",
						"lastName": "Zhu",
						"creatorType": "author"
					},
					{
						"firstName": "Joseph",
						"lastName": "Little",
						"creatorType": "author"
					},
					{
						"firstName": "Charlotte",
						"lastName": "Hookham",
						"creatorType": "author"
					},
					{
						"firstName": "Kate",
						"lastName": "Rowley",
						"creatorType": "author"
					},
					{
						"firstName": "Joanne",
						"lastName": "Euden",
						"creatorType": "author"
					},
					{
						"firstName": "Kim",
						"lastName": "Harman",
						"creatorType": "author"
					},
					{
						"firstName": "Samuel",
						"lastName": "Coenen",
						"creatorType": "author"
					},
					{
						"firstName": "Robert C.",
						"lastName": "Read",
						"creatorType": "author"
					},
					{
						"firstName": "Catherine",
						"lastName": "Woods",
						"creatorType": "author"
					},
					{
						"firstName": "Christopher C.",
						"lastName": "Butler",
						"creatorType": "author"
					},
					{
						"firstName": "Saul N.",
						"lastName": "Faust",
						"creatorType": "author"
					},
					{
						"firstName": "Geraldine",
						"lastName": "Leydon",
						"creatorType": "author"
					},
					{
						"firstName": "Mandy",
						"lastName": "Wan",
						"creatorType": "author"
					},
					{
						"firstName": "Kerenza",
						"lastName": "Hood",
						"creatorType": "author"
					},
					{
						"firstName": "Jane",
						"lastName": "Whitehurst",
						"creatorType": "author"
					},
					{
						"firstName": "Samantha",
						"lastName": "Richards-Hall",
						"creatorType": "author"
					},
					{
						"firstName": "Peter",
						"lastName": "Smith",
						"creatorType": "author"
					},
					{
						"firstName": "Michael",
						"lastName": "Thomas",
						"creatorType": "author"
					},
					{
						"firstName": "Michael",
						"lastName": "Moore",
						"creatorType": "author"
					},
					{
						"firstName": "Theo",
						"lastName": "Verheij",
						"creatorType": "author"
					}
				],
				"date": "2021-10-16",
				"DOI": "10.1016/S0140-6736(21)01431-8",
				"ISSN": "0140-6736, 1474-547X",
				"extra": "PMID: 34562391",
				"issue": "10309",
				"journalAbbreviation": "The Lancet",
				"language": "English",
				"libraryCatalog": "www.thelancet.com",
				"pages": "1417-1426",
				"publicationTitle": "The Lancet",
				"shortTitle": "Antibiotics for lower respiratory tract infection in children presenting in primary care in England (ARTIC PC)",
				"url": "https://www.thelancet.com/journals/lancet/article/PIIS0140-6736(21)01431-8/fulltext?hss_channel=tw-27013292",
				"volume": "398",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					},
					{
						"title": "PubMed entry",
						"mimeType": "text/html",
						"snapshot": false
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
