{
	"translatorID": "04e63564-b92b-41cd-a9d5-366a02056d10",
	"label": "GaleGDC",
	"creator": "Jim Miazek (Gale Cengage), Rui Wang (Gale Cengage), Gale Online Product Development",
	"target": "gale.com|galegroup.com|ggtest.com",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 300,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2019-03-12 12:00:00"
}

/*
 * Gale GDC Copyright (C) 2019 Gale GDC
 *
 * This program is free software: you can redistribute it and/or modify it under the terms of the
 * GNU General Public License as published by the Free
 * Software Foundation, either version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <http://www.gnu.org/licenses/>.
 */

var GaleZotero = (function () {

	var TRANSLATOR_ID = '32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7';
	var OMNI_DOCUMENT_TAB_SELECTOR = 'input[name="tabIDForDocDisplay"]';
	var OMNI_RESULTS_TYPE_SELECTOR = 'input[name="searchResultsType"]';
	var OMNI_RESULTS_TAB_SELECTOR = 'input[id="currentDisplayGroupId"]';
	var OMNI_ENTRY_LOCATORS = [
		'//section[@id="searchResults"]'
	];
	var PANGEA_ENTRY_LOCATORS = [
		'//div[@regionid="searchResults"]',
		'//table[@id="searchResult"]',
		'//table[@id="markedDocuments"]',
		'//div[@class="search_results_center"]'
	];
	var PANGEA_PAGE_TO_ICON_MAP = {
		'AudioDetailsPage': 'audioReporting',
		'AudioFullListPage': 'audioReporting',
		'ArchivalNewspapersDetailsPage': 'newspaperArticle',
		'ArchivalNewspapersFullListPage': 'newspaperArticle',
		'ImagesDetailsPage': 'film',
		'ImagesFullListPage': 'film',
		'MagazinesDetailsPage': 'magazineArticle',
		'MagazinesFullListPage': 'magazineArticle',
		'ManuscriptsDetailsPage': 'manuscript',
		'ManuscriptsFullListPage': 'manuscript',
		'MapsDetailsPage': 'map',
		'MapsFullListPage': 'map',
		'MonographsDetailsPage': 'bookSection',
		'MonographsFullListPage': 'bookSection',
		'NewspapersDetailsPage': 'newspaperArticle',
		'NewspapersFullListPage': 'newspaperArticle',
		'PhotographsDetailsPage': 'bookSection',
		'PhotographsFullListPage': 'bookSection',
		'VideosDetailsPage': 'videoRecording',
		'VideosFullListPage': 'videoRecording',
		'searchResults': 'multiple',
		'savedDocuments': 'multiple'
	};
	var OMNI_DISPLAY_GROUP_TO_ICON_MAP = {
		'Audios': 'audioReporting',   // doc display (yes, it's plural)
		'Audio': 'audioReporting',  // results
		'ArchivalNewspapers': 'newspaperArticle',  // doc display
		'Gdsc_Microfilmcoll': 'newspaperArticle',  // results
		'Images': 'film',
		'Magazines': 'magazineArticle',  // doc display
		'DVI-Magazines': 'magazineArticle',  // results
		'Manuscripts': 'manuscript',  // doc display
		'DVI-Manuscripts': 'manuscript',  // results
		'Maps': 'map',  // doc display
		'DVI-Maps': 'map',  // results
		'Monographs': 'bookSection',  // doc display
		'DVI-Monographs': 'bookSection',  // results
		'Newspapers': 'newspaperArticle',  // doc display
		'DVI-Newspapers': 'newspaperArticle',  // results
		'Photographs': 'bookSection',  // doc display
		'DVI-Photographs': 'bookSection',  // results
		'Videos': 'videoRecording'
	};

	function detect(doc, url) {
		return isOmni(url) ? detectOmni(doc) : detectPangea(url);
	}

	function process(doc, url) {
		return isOmni(url) ? processOmni(doc) : processPangea(doc, url);
	}

	function parseValue(name, item) {
		var regExp = new RegExp('[?&]' + name + '=([^&#]+)');
		var matchingGroups = regExp.exec(item);
		return matchingGroups ? matchingGroups[1] : '';
	}

	function isOmni(url) {
		return getUriField(url, 3) === 'ps';
	}

	function getUriField(url, index) {
		var urlFields = url.split('/');
		return urlFields.length < index ? undefined : urlFields[index]; // eslint-disable-line no-undefined
	}

	function detectPangea(url) {
		var page = getUriField(url, 5);
		var icon = PANGEA_PAGE_TO_ICON_MAP[page];
		return typeof icon === 'undefined' ? false : icon;
	}

	function detectOmni(doc) { // eslint-disable-line consistent-return
		var element = doc.querySelector(OMNI_DOCUMENT_TAB_SELECTOR);
		if (element && element.getAttribute('value')) {
			return getOmniLabel(element.getAttribute('value'));
		} else if (isSingleTabResults(doc)) {
			return getOmniLabel(doc.querySelector(OMNI_RESULTS_TAB_SELECTOR).getAttribute('value'));
		}
		return isMultiTabResults(doc) ? 'multiple' : false;
	}

	function isSingleTabResults(doc) {
		return doc.querySelector(OMNI_RESULTS_TYPE_SELECTOR).getAttribute('value') === 'SingleTab';
	}

	function isMultiTabResults(doc) {
		return doc.querySelector(OMNI_RESULTS_TYPE_SELECTOR).getAttribute('value') === 'MultiTab';
	}

	function getOmniLabel(index) {
		var icon = OMNI_DISPLAY_GROUP_TO_ICON_MAP[index];
		return typeof icon === 'undefined' ? false : icon;
	}

	function processOmni(doc) {
		var risImporter = initializeRisImporter();
		var searchResults = getSearchResults(doc, OMNI_ENTRY_LOCATORS);
		if (searchResults) {
			processResults(risImporter, doc, searchResults, /dataForZotero?/, processOmniResult);
		} else {
			processOmniSingleDocument(risImporter, doc);
		}
	}

	function processPangea(doc) {
		var risImporter = initializeRisImporter();
		var searchResults = getSearchResults(doc, PANGEA_ENTRY_LOCATORS);
		if (searchResults) {
			processResults(risImporter, doc, searchResults, /&zid=/, processPangeaResult);
		} else {
			processPangeaSingleDocument(risImporter, doc);
		}
	}

	function getSearchResults(doc, searchResultsLocators) {
		return doc.evaluate(searchResultsLocators.join(' | '), doc, null, XPathResult.ANY_TYPE, null).iterateNext();
	}

	function initializeRisImporter() {
		var importer = Zotero.loadTranslator('import');
		importer.setHandler('itemDone', function (obj, item) { // eslint-disable-line no-unused-vars
			item.attachments = [];
			item.complete();
		});
		importer.setTranslator(TRANSLATOR_ID);
		return importer;
	}

	function processOmniSingleDocument(risImporter, doc) {
		var citationData = doc.getElementById('dviTools').querySelector('input[class="citationToolsData"]');
		var productName = citationData.getAttribute('data-productname');
		var docId = citationData.getAttribute('data-docid');
		var docDirectLink = citationData.getAttribute('data-url');
		var documentData = '{"docId":"' + docId + '","documentUrl":"' + docDirectLink + '","productName":"' + productName + '"}';
		var postFormData = 'citationFormat=RIS&documentData=' + postFormData + encodeURIComponent(documentData);
		importDocument(risImporter, 'citationtools/rest/cite/download', postFormData);
	}

	function processPangeaSingleDocument(risImporter, doc) {
		var citationForm = doc.getElementById('citation_form');
		var otherUrl = citationForm.citation_document_url.value;
		var docId = citationForm.citation_document_id.value;
		var productName = citationForm.product_name.value;
		var urlForPosting = citationForm.action +
			'&citation_format=ris' +
			'&citation_document_url=' + encodeURIComponent(otherUrl) +
			'&citation_document_id=' + encodeURIComponent(docId) +
			'&product_name=' + productName;
		importDocument(risImporter, urlForPosting, '');
	}

	function importDocument(risImporter, urlForPosting, postFormData) {
		Zotero.Utilities.doPost(urlForPosting, postFormData, function (text) {
			risImporter.setString(text);
			risImporter.translate();
		});
	}

	function processResults(risImporter, doc, searchResults, locator, processFunction) {
		var items = Zotero.Utilities.getItemArray(doc, searchResults, locator);
		var item;
		Zotero.selectItems(items, function (selectedItems) {
			if (!selectedItems) {
				return true;
			}
			for (item in selectedItems) {
				if (selectedItems.hasOwnProperty(item)) {
					processFunction(risImporter, item, doc);
				}
			}
			return false;
		});
	}

	function processOmniResult(risImporter, item) {
		var docDirectLink = parseValue('docUrl', item);
		var docId = parseValue('docId', item);
		var productName = parseValue('productname', item);
		var urlForPosting = 'citationtools/rest/cite/download';
		var documentData = '{"docId":"' + docId + '","documentUrl":"' + docDirectLink + '","productName":"' + productName + '"}';
		var postFormData = 'citationFormat=RIS&documentData=' + encodeURIComponent(documentData);
		importDocument(risImporter, urlForPosting, postFormData);
	}

	function processPangeaResult(risImporter, item, doc) {
		var docid = parseValue('documentId', item);
		var productName = parseValue('product_name', item);
		var urlForPosting = doc.getElementById('zotero_form').action +
			'&citation_document_id=' + docid +
			'&citation_document_url=' + encodeURIComponent(item.replace('|', '%7C')) +
			'&product_name=' + productName;
		importDocument(risImporter, urlForPosting, '');
	}

	return {
		detect: detect,
		process: process,
		_privateData: {
			parseValue: parseValue,
			importDocument: importDocument,
			processPangeaSingleDocument: processPangeaSingleDocument,
			processOmniSingleDocument: processOmniSingleDocument
		}
	};

}());

function detectWeb(doc, url) { // eslint-disable-line no-unused-vars
	return GaleZotero.detect(doc, url);
}

function doWeb(doc, url) { // eslint-disable-line no-unused-vars
	return GaleZotero.process(doc, url);
}

