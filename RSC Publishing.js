{
	"translatorID": "ca0e7488-ef20-4485-8499-9c47e60dcfa7",
	"label": "RSC Publishing",
	"creator": "Sebastian Karcher",
	"target": "^https?://(:?www\\.|google\\.)?pubs\\.rsc\\.org/",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsb",
	"lastUpdated": "2013-06-08 14:11:40"
}

/*
RSC Publishing Translator
Copyright (C) 2011 Aurimas Vinckevicius

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

function getResults(doc) {
	/**Both search result and book ToC pages use javascript to load content, so
	 * this actually doesn't work as intended. Search results will work, but
	 * will also trigger on empty result set. detectWeb for book ToC does not
	 * work, but doWeb does,
	 */
	return ZU.xpath(doc, '//div[@id="all" or @id="chapterList"]\
						//div[contains(@class,"title_text")]\
						//a[not(contains(@href,"/database/"))]');
}

function detectWeb(doc, url) {
	if(url.search(/\/results[?\/]/i) != -1 || url.indexOf('/ebook/') != -1  &&
		getResults(doc).length) {
		return 'multiple';
	}
	//apparently URLs sometimes have upper case as in /Content/ArticleLanding/
	if(url.search(/\/content\/articlelanding\//i) != -1) {
		return 'journalArticle';
	}

	if(url.search(/\/content\/chapter\//i) != -1) {
		return 'bookSection';
	}
}

function scrape(doc, type) {
	var translator = Zotero.loadTranslator('web');
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);

	translator.setHandler('itemDone', function(obj, item) {
		item.itemType = type;

		if(type == 'bookSection') {
			//fix title for book chapters
			var title = ZU.xpathText(doc, '//label[@id="lblTitle"]/node()',
				null, ' ');
			if(title) item.title = ZU.trimInternal(title);

			//add bookTitle
			item.bookTitle = ZU.xpathText(doc, '//h2[@class="sub_title"]');
		} else if(type == 'journalArticle') {
			//journal title is abbreviated. We can fetch full title from the page
			item.publicationTitle = ZU.xpathText(doc, '//div[contains(@class, "hg_title")]//h1');
		}

		//keywords is frequently an empty string
		if(item.tags.length == 1 && !item.tags[0]) {
			item.tags = [];
		}

		item.complete();
	});
	translator.translate();
}

function doWeb(doc, url) {
	var type = detectWeb(doc, url);
	if(type == 'multiple') {
		var results = getResults(doc);
		var items = new Object();
		for(var i=0, n=results.length; i<n; i++) {
			items[results[i].href] = ZU.trimInternal(
				ZU.xpathText(results[i], './node()', null, ' '));
		}

		Zotero.selectItems(items, function(selectedItems) {
				if(!selectedItems) return true;

				var urls = new Array();
				for(var i in selectedItems) {
					urls.push(i);
				}
				ZU.processDocuments(urls,doWeb);
			});
	} else {
		scrape(doc, type);
	}
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://pubs.rsc.org/en/content/articlelanding/2012/ee/c1ee02148f",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Wei",
						"lastName": "Guo",
						"creatorType": "author"
					},
					{
						"firstName": "Ya-Xia",
						"lastName": "Yin",
						"creatorType": "author"
					},
					{
						"firstName": "Sen",
						"lastName": "Xin",
						"creatorType": "author"
					},
					{
						"firstName": "Yu-Guo",
						"lastName": "Guo",
						"creatorType": "author"
					},
					{
						"firstName": "Li-Jun",
						"lastName": "Wan",
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
				"itemID": "http://pubs.rsc.org/en/content/articlelanding/2012/ee/c1ee02148f",
				"title": "Superior radical polymer cathode material with a two-electron process redox reaction promoted by graphene",
				"publisher": "The Royal Society of Chemistry",
				"institution": "The Royal Society of Chemistry",
				"company": "The Royal Society of Chemistry",
				"label": "The Royal Society of Chemistry",
				"distributor": "The Royal Society of Chemistry",
				"date": "2012-01-01",
				"DOI": "10.1039/C1EE02148F",
				"language": "en",
				"publicationTitle": "Energy & Environmental Science",
				"journalAbbreviation": "Energy Environ. Sci.",
				"volume": "5",
				"issue": "1",
				"abstractNote": "Poly(2,2,6,6-tetramethyl-1-piperidinyloxy-4-yl methacrylate) (PTMA) displays a two–electron process redox reaction, high capacity of up to 222 mA h g−1, good rate performance and long cycle life, which is promoted by graphene as cathode material for lithium rechargeable batteries.",
				"pages": "5221-5225",
				"ISSN": "1754-5706",
				"url": "http://pubs.rsc.org/en/content/articlelanding/2012/ee/c1ee02148f",
				"accessDate": "CURRENT_TIMESTAMP",
				"libraryCatalog": "pubs.rsc.org"
			}
		]
	},
	{
		"type": "web",
		"url": "http://pubs.rsc.org/en/content/chapter/bk9781849730518-00330/978-1-84973-051-8",
		"items": [
			{
				"itemType": "bookSection",
				"creators": [
					{
						"firstName": "Michael T.",
						"lastName": "Simonich",
						"creatorType": "author"
					},
					{
						"firstName": "Jill A.",
						"lastName": "Franzosa",
						"creatorType": "author"
					},
					{
						"firstName": "Robert L.",
						"lastName": "Tanguay*",
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
				"itemID": "http://pubs.rsc.org/en/content/chapter/bk9781849730518-00330/978-1-84973-051-8",
				"title": "Chapter 14 In Vivo Approaches to Predictive Toxicology Using Zebrafish",
				"DOI": "10.1039/9781849733045-00330",
				"language": "en",
				"date": "2011/11/15",
				"url": "http://pubs.rsc.org/en/content/chapter/bk9781849730518-00330/978-1-84973-051-8",
				"accessDate": "CURRENT_TIMESTAMP",
				"libraryCatalog": "pubs.rsc.org",
				"bookTitle": "New Horizons in Predictive Toxicology"
			}
		]
	},
	{
		"type": "web",
		"url": "http://pubs.rsc.org/en/results?searchtext=open%20source",
		"items": "multiple",
		"defer": true
	}
]
/** END TEST CASES **/