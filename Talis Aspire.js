{
	"translatorID": "f16931f0-372e-4197-8927-05d2ba7599d8",
	"label": "Talis Aspire",
	"creator": "Sebastian Karcher and Abe Jellinek",
	"target": "^https?://([^/]+\\.)?(((my)?reading|resource|lib|cyprus|)lists|aspire\\.surrey|rl\\.talis)\\..+/(lists|items)/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 270,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-07-08 16:59:21"
}

/*
	***** BEGIN LICENSE BLOCK *****
	
	Copyright © 2013-2021 Sebastian Karcher and Abe Jellinek
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
	if (url.includes('/lists/') && getSearchResults(doc, true)) return "multiple";
	
	if (url.includes('/items/')) {
		var type = ZU.xpathText(doc, '//dd/span[@class="label"]');
		if (!type) type = text(doc, 'rl-bibliographic-resource-type');
		if (type == "Book")	return "book";
		if (type == "Webpage" || type == "Website") return "webpage";
		return "journalArticle";
	}

	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {}, found = false;
	var bibData = doc.querySelectorAll('article[id]');
	for (let article of bibData) {
		let title = text(article, 'cite');
		let slug = 'items/' + article.id.split('_')[1];
		if (!title || !slug) continue;
		if (checkOnly) return true;
		found = true;
		items[slug] = ZU.trimInternal(title);
	}
	
	return found ? items : false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		Zotero.selectItems(getSearchResults(doc), function (items) {
			if (!items) return;
			scrape(url, Object.keys(items));
		});
	}
	else {
		scrape(url, [extractSlug(url)]);
	}
}

function scrape(url, slugs) {
	let siteID = url.match(/\/\d+\/([^/]+)/);
	if (!siteID) siteID = url.match(/([^.]+)\.rl\.talis\.com/);
	siteID = siteID[1];
	let urls = slugs.map(slug => `https://${siteID}.rl.talis.com/${slug}.ris`);
	
	ZU.doGet(urls, function (text) {
		var translator = Zotero.loadTranslator("import");
		// RIS
		translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
		translator.setString(text);
		translator.translate();
	});
}

function extractSlug(url) {
	return (url.match(/([^/]+\/[^/]+)\.html/) || [])[1];
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://rl.talis.com/3/lincoln/items/FEB50B30-652C-55B2-08F8-F2D399BF308A.html",
		"defer": true,
		"items": [
			{
				"itemType": "book",
				"title": "American cultural studies: an introduction to American culture",
				"creators": [
					{
						"lastName": "Campbell",
						"firstName": "Neil",
						"creatorType": "author"
					},
					{
						"lastName": "Kean",
						"firstName": "Alasdair",
						"creatorType": "author"
					}
				],
				"date": "2006",
				"ISBN": "9780415346665",
				"edition": "2nd ed",
				"libraryCatalog": "Talis Aspire",
				"place": "London",
				"publisher": "Routledge",
				"shortTitle": "American cultural studies",
				"attachments": [],
				"tags": [],
				"notes": [
					{
						"note": "<p>Ebook version of first edition also available</p>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://lists.library.lincoln.ac.uk/lists/625177C4-A268-8971-E3C9-ACEA91A83585.html",
		"defer": true,
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://rl.talis.com/3/qmul/items/66C2A847-80C3-8259-46AB-0DB8C0779068.html",
		"defer": true,
		"items": [
			{
				"itemType": "journalArticle",
				"title": "The Struggle against Sweatshops: Moving toward Responsible Global Business",
				"creators": [
					{
						"lastName": "Tara J. Radin and Martin Calkins",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "Jul., 2006",
				"ISSN": "01674544",
				"issue": "No. 2",
				"libraryCatalog": "Talis Aspire",
				"pages": "261-272",
				"publicationTitle": "Journal of Business Ethics",
				"shortTitle": "The Struggle against Sweatshops",
				"url": "http://www.jstor.org/stable/25123831",
				"volume": "Vol. 66",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://rl.talis.com/3/bournemouth/items/AF2E5676-6A86-DCDC-FC7B-8CC554EFD9BF.html",
		"defer": true,
		"items": [
			{
				"itemType": "book",
				"title": "The Unified Modeling Language reference manual",
				"creators": [
					{
						"lastName": "Rumbaugh",
						"firstName": "James",
						"creatorType": "author"
					},
					{
						"lastName": "Jacobson",
						"firstName": "Ivar",
						"creatorType": "author"
					},
					{
						"lastName": "Booch",
						"firstName": "Grady",
						"creatorType": "author"
					}
				],
				"date": "0000 c",
				"ISBN": "9780201309980",
				"libraryCatalog": "Talis Aspire",
				"place": "Harlow",
				"publisher": "Addison Wesley",
				"volume": "The Addison-Wesley object technology series",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://rl.talis.com/3/coventry/items/1CC2D394-7EDE-8DE5-4FF0-868C1C6E6BE5.html",
		"defer": true,
		"items": [
			{
				"itemType": "book",
				"title": "Decision making in midwifery practice",
				"creators": [
					{
						"lastName": "Marshall",
						"firstName": "Jayne E",
						"creatorType": "author"
					},
					{
						"lastName": "Raynor",
						"firstName": "Maureen D",
						"creatorType": "author"
					},
					{
						"lastName": "Sullivan",
						"firstName": "Amanda",
						"creatorType": "author"
					}
				],
				"date": "2005",
				"ISBN": "9780443073847",
				"libraryCatalog": "Talis Aspire",
				"place": "Edinburgh",
				"publisher": "Elsevier/Churchill Livingstone",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://rl.talis.com/3/cyprus_uclan/items/57E6E313-82BF-0AF6-C0E5-940A3760507C.html",
		"defer": true,
		"items": [
			{
				"itemType": "book",
				"title": "Neocleous's introduction to Cyprus law",
				"creators": [
					{
						"lastName": "Neocleous",
						"firstName": "Andreas",
						"creatorType": "author"
					},
					{
						"lastName": "Andreas Neocleous & Co",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "2010",
				"ISBN": "9789963935918",
				"edition": "3rd ed",
				"libraryCatalog": "Talis Aspire",
				"place": "Limassol, Cyprus",
				"publisher": "A. Neocleous & Co. LLC",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://rl.talis.com/3/derby/items/F9F66F67-142C-B05D-7401-22037C676876.html",
		"defer": true,
		"items": [
			{
				"itemType": "book",
				"title": "Preparing to teach in the lifelong learning sector: the new award",
				"creators": [
					{
						"lastName": "Gravells",
						"firstName": "Ann",
						"creatorType": "author"
					}
				],
				"date": "2012",
				"ISBN": "9780857257734",
				"edition": "5th ed",
				"libraryCatalog": "Talis Aspire",
				"place": "London",
				"publisher": "Learning Matters",
				"shortTitle": "Preparing to teach in the lifelong learning sector",
				"attachments": [],
				"tags": [],
				"notes": [
					{
						"note": "<p>Earlier editions are available in the Library.</p>"
					}
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
