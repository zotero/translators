{
	"translatorID": "04e63564-b92b-41cd-a9d5-366a02056d10",
	"label": "GaleGDC",
	"creator": "GaleGDC",
	"target": "/gdc/ncco/|/gdc/xsearch/",
	"minVersion": "1.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcs",
	"lastUpdated": "2013-03-13 23:51:41"
}

/*
 * Gale GDC Copyright (C) 2011 Gale GDC
 *
 * This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free
 * Software Foundation, either version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

function detectWeb(doc, url) {
	if (url.indexOf('CitationsFullList') !== -1) return false;
	else if (url.indexOf('MonographsDetails') !== -1) return "bookSection";
	else if (url.indexOf('ManuscriptsDetails') !== -1) return "manuscript";
	else if (url.indexOf('MapsDetails') !== -1) return "map";
	else if (url.indexOf('NewspapersDetails') !== -1) return "newspaperArticle";
	else if (url.indexOf('searchResults') !== -1) return "multiple";
	else if (url.indexOf('FullList') !== -1) return "multiple";
	else if (url.indexOf('savedDocuments') !== -1) return "multiple";
	else if (url.indexOf('PhotographsDetails') !== -1) return "artwork";
	else if (url.indexOf('Details') !== -1) return "document";
	else return false;
}

function doWeb(doc, url) {
	var risImporter = Zotero.loadTranslator("import");
	risImporter.setHandler("itemDone", function (obj, item) {
		item.attachments = [];
		item.complete();
	});

	risImporter.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");

	var resultsLocator = '//div[@regionid="searchResults"] | //table[@id="searchResult"] | //table[@id="markedDocuments"] | //div[@class="search_results_center"]';
	var searchResults = doc.evaluate(resultsLocator, doc, null, XPathResult.ANY_TYPE, null).iterateNext();

	if (searchResults) {
		var items = Zotero.Utilities.getItemArray(doc, searchResults, /\&zid=/);
		Zotero.selectItems(items, function (selectedItems) {
			if (!selectedItems) return true;
			for (var item in selectedItems) {
				var start = item.indexOf('documentId=');
				var end = item.indexOf('&', start);
				var docid = item.substring(start + 11, end > -1 ? end : item.length);
				var urlForPosting = doc.getElementById("zotero_form").action + '&citation_document_id=' + docid + '&citation_document_url=' + encodeURIComponent(item.replace('|', '%7C'));
				importSingleDocument(risImporter, urlForPosting);
			}
		});
	} else {
		processSingleDocument(risImporter, doc);
	}
}

function processSingleDocument(risImporter, doc) {
	var citationForm = doc.getElementById("citation_form");
	var otherUrl, docId;
	for (var i = 0; i < citationForm.length; i++) {
		if (citationForm.elements[i].name === 'citation_document_url') {
			otherUrl = citationForm.elements[i].value;
		}
		if (citationForm.elements[i].name === 'citation_document_id') {
			docId = citationForm.elements[i].value;
		}
	}
	var urlForPosting = citationForm.action + "&citation_format=ris" + "&citation_document_url=" + encodeURIComponent(otherUrl) + "&citation_document_id=" + encodeURIComponent(docId);
	importSingleDocument(risImporter, urlForPosting);
}

function importSingleDocument(risImporter, urlForPosting) {
	Zotero.Utilities.doPost(urlForPosting, '', function (text, obj) {
		risImporter.setString(text);
		risImporter.translate();
	});
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://ncco.galegroup.com/gdc/ncco/MonographsDetailsPage/MonographsDetailsWindow?failOverType=&query=&prodId=NCCO&windowstate=normal&contentModules=&mode=view&displayGroupName=DVI-Monographs&dviSelectedPage=1&limiter=&currPage=&disableHighlighting=false&source=&sortBy=&displayGroups=&search_within_results=&action=e&catId=&activityType=&scanId=&documentId=GALE%7CQLILNN865873889&userGroupName=viva_gmu",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"lastName": "Davis",
						"firstName": "J. E.",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"Labor law"
				],
				"seeAlso": [],
				"attachments": [],
				"title": "Labour and labour laws",
				"place": "London",
				"date": "1883",
				"archive": "Nineteenth Century Collections Online",
				"libraryCatalog": "Gale",
				"language": "English",
				"publisher": "[s. n.]"
			}
		]
	},
	{
		"type": "web",
		"url": "http://ncco.galegroup.com/gdc/ncco/ManuscriptsDetailsPage/ManuscriptsDetailsWindow?failOverType=&query=&prodId=NCCO&windowstate=normal&contentModules=&mode=view&displayGroupName=DVI-Manuscripts&dviSelectedPage=1&limiter=&currPage=&disableHighlighting=false&source=&sortBy=&displayGroups=&search_within_results=&action=e&catId=&activityType=&scanId=&documentId=GALE%7CAEAVLN130466301&userGroupName=viva_gmu",
		"items": [
			{
				"itemType": "manuscript",
				"creators": [
					{
						"lastName": "Andrews",
						"firstName": "R. F.",
						"creatorType": "author"
					},
					{
						"lastName": "Zetkin",
						"firstName": "Clara",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"title": "Working Class Movement Card Catalogue: Pamphlets: Alphabetical Index. Author/Title",
				"date": "0000 n",
				"archive": "Nineteenth Century Collections Online",
				"libraryCatalog": "Gale",
				"language": "English",
				"manuscriptType": "MS",
				"publisher": "Working Class Movement Library",
				"shortTitle": "Working Class Movement Card Catalogue"
			}
		]
	},
	{
		"type": "web",
		"url": "http://ncco.galegroup.com/gdc/ncco/ManuscriptsFullListPage/ManuscriptsFullListWindow?result_type=DVI-Manuscripts&failOverType=&query=&prodId=NCCO&windowstate=normal&contentModules=&display-query=&mode=view&displayGroupName=DVI-Manuscripts&limiter=F_CMC+%22British+Labour+History+Ephemera%22&currPage=1&source=fullList&displayGroups=&totalSearchResultCount=&action=e&catId=&activityType=&scanId=&userGroupName=viva_gmu",
		"items": "multiple"
	}
]
/** END TEST CASES **/