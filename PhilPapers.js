{
	"translatorID": "8df4f61b-0881-4c85-9186-05f457edb4d3",
	"label": "PhilPapers",
	"creator": "Sebastian Karcher",
	"target": "^https?://phil(papers|archive)\\.org/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-08-13 23:13:58"
}

/*
	***** BEGIN LICENSE BLOCK *****
	
	Copyright © 2012 Sebastian Karcher
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
	if (/\/s|pub\//.test(url)) return "multiple";
	if (url.includes("/browse/") && ZU.xpathText(doc, '//ol[@class="entryList"]/li/@id') !== null) return "multiple";
	if (url.includes("/rec/")) return "journalArticle";
	return false;
}
	

function doWeb(doc, url) {
	let isPhilArchive = /^https?:\/\/philarchive\.org\//.test(url);

	var ids = [];
	if (detectWeb(doc, url) == "multiple") {
		var items = {};
		var titles = ZU.xpath(doc, '//li/span[@class="citation"]//span[contains (@class, "articleTitle")]');
		var identifiers = ZU.xpath(doc, '//ol[@class="entryList"]/li/@id');
		for (var i in titles) {
			items[identifiers[i].textContent] = titles[i].textContent;
		}
		Zotero.selectItems(items, function (items) {
			if (!items) {
				return;
			}
			for (var i in items) {
				ids.push(i.replace(/^e/, ""));
			}
			scrape(ids, isPhilArchive);
		});
	}
	else {
		var identifier = url.match(/(\/rec\/)([A-Z-\d]+)/)[2];
		// Z.debug(identifier)
		scrape([identifier], isPhilArchive);
	}
}

function scrape(identifiers, isPhilArchive) {
	for (let id of identifiers) {
		let bibtexURL = "/export.html?__format=bib&eId=" + id + "&formatName=BibTeX";
		Zotero.Utilities.HTTP.doGet(bibtexURL, function (text) {
			// remove line breaks, then match match the bibtex.
			var bibtex = text.replace(/\n/g, "").match(/<pre class='export'>.+<\/pre>/)[0];
			var url = "/rec/" + id;
			var translator = Zotero.loadTranslator("import");
			translator.setTranslator("9cb70025-a888-4a29-a210-93ec52da40d4");
			translator.setString(bibtex);
			translator.setHandler("itemDone", function (obj, item) {
				if (isPhilArchive) {
					item.libraryCatalog = 'PhilArchive';
					item.url = `https://philarchive.org/rec/${id}`; // full-text
					item.attachments.push({
						title: 'Full Text PDF',
						mimeType: 'application/pdf',
						url: `/archive/${id}`
					});
				}
				
				item.attachments.push({ url, title: "Snapshot", mimeType: "text/html" });
				item.complete();
			});
			translator.translate();
		});
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://philpapers.org/rec/COROCA-4",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Observation, Character, and A Purely First-Person Point of View",
				"creators": [
					{
						"firstName": "Josep E.",
						"lastName": "Corbí",
						"creatorType": "author"
					}
				],
				"date": "2011",
				"DOI": "10.1007/s12136-011-0124-2",
				"issue": "4",
				"itemID": "Corbi2011-COROCA-4",
				"libraryCatalog": "PhilPapers",
				"pages": "311–328",
				"publicationTitle": "Acta Analytica",
				"volume": "26",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://philpapers.org/browse/causal-realism",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://philpapers.org/pub/6",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://philpapers.org/s/solipsism",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://philarchive.org/rec/RAYNGF",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Norm-Based Governance for a New Era: Collective Action in the Face of Hyper-Politicization",
				"creators": [
					{
						"firstName": "Leigh",
						"lastName": "Raymond",
						"creatorType": "author"
					},
					{
						"firstName": "Daniel",
						"lastName": "Kelly",
						"creatorType": "author"
					},
					{
						"firstName": "Erin",
						"lastName": "Hennes",
						"creatorType": "author"
					}
				],
				"itemID": "RaymondForthcoming-RAYNGF",
				"libraryCatalog": "PhilArchive",
				"publicationTitle": "Perspectives on Politics",
				"shortTitle": "Norm-Based Governance for a New Era",
				"url": "https://philarchive.org/rec/RAYNGF",
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
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://philarchive.org/rec/LANTEO-39",
		"items": [
			{
				"itemType": "manuscript",
				"title": "The Ethics of Partiality",
				"creators": [
					{
						"firstName": "Benjamin",
						"lastName": "Lange",
						"creatorType": "author"
					}
				],
				"itemID": "LangeManuscript-LANTEO-39",
				"libraryCatalog": "PhilArchive",
				"url": "https://philarchive.org/rec/LANTEO-39",
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
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
