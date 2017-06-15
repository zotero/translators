{
	"translatorID": "62415874-b53c-4afd-86e8-814e18a986f6",
	"label": "Oxford Reference",
	"creator": "Sonali Gupta",
	"target": "^https?://www\\.oxfordreference\\.com/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2017-06-15 08:51:48"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2017 Sonali Gupta
	
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

function detectWeb(doc, url) {
	if (url.indexOf("/search") != -1)
		return "multiple";
	else
	{
		var body = doc.getElementsByTagName("body")[0];
		if ((body.className).indexOf('dctype-oxencycl-entry') != -1) {
   			return "bookSection";
		}
		else
   			return "book";
	}
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//span[@class="titlePart"]/a');
	var rowsExtendedTitle = ZU.xpath(doc, '//span[@class="title"]');
	for (var i=0; i<rows.length; i++) {
		var href = rows[i].href;
		var title = ZU.trimInternal(rows[i].textContent) + ',' + ZU.trimInternal(rowsExtendedTitle[i].textContent);
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
			if (!items) {
				return true;
			}
			var articles = [];
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, scrape);
		});
	} else {
		scrape(doc, url);
	}
}

function scrape(doc, url)
{
	if (detectWeb(doc, url) == "book")
		var item = new Zotero.Item("book");
	else
		var item = new Zotero.Item("bookSection");

	var edition = ZU.xpathText(doc, '//meta[@property="http://schema.org/bookEdition"]/@content');
	if(edition)
		item.edition = edition;

	var dateCreated = ZU.xpathText(doc, '//meta[@property="http://schema.org/dateCreated"]/@content');
	if(dateCreated)
		item.date = dateCreated;
	else
		item.date = ZU.xpathText(doc, '//dl[@class="metadata metadataPrintPublicationDate"]/dd');
	
	var isbn = ZU.xpathText(doc, '//meta[@property="http://schema.org/isbn"]/@content');
	if(isbn)
		item.ISBN = isbn;
	else
		item.ISBN = ZU.xpathText(doc, '//dl[@class="metadata metadataPrintIsbn13"]/dd');
	
	var publisher = ZU.xpathText(doc, '//meta[@property="http://schema.org/publisher"]/@content');
	if(publisher)
		item.publisher = publisher;
	else
		item.publisher = ZU.xpathText(doc, '//dl[@class="metadata metadataPublisher"]/dd');
	

	var title = ZU.xpathText(doc, '//meta[@property="og:title"]/@content');
	if(title)
		item.title = title;
	else
		item.title = ZU.xpathText(doc, '//h1[@id="pagetitle"]');
	
	var abstract = ZU.xpathText(doc, '//meta[@name="description"]/@content');
	if(abstract)
		item.abstractNote = abstract;
	else
		item.abstractNote = ZU.xpathText(doc, '//div[@class="abstract"]');
	
	var editors = ZU.xpath(doc, '//meta[@property="http://schema.org/editor"]/@content');
	if(editors)
	{
		for (var i in editors){
			item.creators.push(ZU.cleanAuthor(editors[i].textContent,"editor"));
		}
	}
	
	var authors = ZU.xpathText(doc,'//dl[@class="metaInfo"]/dd[@class="author"]');
	if(authors)
	{
		authors = authors.split(',');
		for (var i in authors){
			item.creators.push(ZU.cleanAuthor(authors[i], "author"));
		}
		
	}
	
	item.attachments = ({
		url: url,
		title: "Oxford Reference Snapshot",
		mimeType: "text/html"
	});
	
	item.complete();	
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.oxfordreference.com/view/10.1093/acref/9780199546572.001.0001/acref-9780199546572-e-0009",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Accutane - Oxford Reference",
				"creators": [
					{
						"firstName": "Andrew",
						"lastName": "Hodges",
						"creatorType": "author"
					}
				],
				"date": "2008",
				"ISBN": "9780199546572",
				"abstractNote": "Isotretinoin. The synthetic retinoid derivative 13-cis-retinoic acid (Accutane) used for severe Acne vulgaris. The dose is 1",
				"libraryCatalog": "Oxford Reference",
				"publisher": "Oxford University Press",
				"attachments": {
					"url": "http://www.oxfordreference.com/view/10.1093/acref/9780199546572.001.0001/acref-9780199546572-e-0009",
					"title": "Oxford Reference Snapshot",
					"mimeType": "text/html"
				},
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.oxfordreference.com/view/10.1093/acref/9780199608218.001.0001/acref-9780199608218",
		"items": [
			{
				"itemType": "book",
				"title": "Concise Oxford Companion to English Literature - Oxford Reference",
				"creators": [
					{
						"firstName": "Dinah",
						"lastName": "Birch",
						"creatorType": "editor"
					},
					{
						"firstName": "Katy",
						"lastName": "Hooper",
						"creatorType": "editor"
					}
				],
				"date": "2013-05-21",
				"ISBN": "9780199608218",
				"abstractNote": "Over 4,900 entriesBased on the bestselling Oxford Companion to English Literature, this is an indispensable guide to all aspects of English literature. Over 4,900 new and revised A to Z entries give unrivalled coverage of writers, works, historical context, literary theory, allusions, characters, and plot summaries.For this fourth edition, the dictionary has been fully revised and updated to include expanded coverage of postcolonial, African, black British, and children's literature, as well as improved representation in the areas of science fiction, biography, travel literature, women's writing, gay and lesbian writing, and American literature.The appendices listing literary prize winners, including the Nobel, Man Booker, and Pulitzer prizes, have all been updated and there is also a timeline, chronicling the development of English literature from c. 1000 to the present day.Written originally by a team of more than 140 distinguished authors and extensively updated for this new edition, this book provides an essential point of reference for English students, teachers, and all other readers of literature in English.",
				"edition": "4",
				"libraryCatalog": "Oxford Reference",
				"publisher": "Oxford University Press",
				"attachments": {
					"url": "http://www.oxfordreference.com/view/10.1093/acref/9780199608218.001.0001/acref-9780199608218",
					"title": "Oxford Reference Snapshot",
					"mimeType": "text/html"
				},
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.oxfordreference.com/search?q=shalimar+the+clown&searchBtn=Search&isQuickSearch=true",
		"items": "multiple"
	}
]
/** END TEST CASES **/