{
	"translatorID": "271ee1a5-da86-465b-b3a5-eafe7bd3c156",
	"label": "Idref",
	"creator": "Sylvain Machefert",
	"target": "^https?://www\\.idref\\.fr/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2019-11-16 21:34:33"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2018 Sylvain Machefert
	
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
	if (getSearchResults(doc, true)) {
		return "multiple";
	}
	Z.monitorDOMChanges(doc.getElementById("ref-liees-p"));
	return false;
}

function getSearchResults(doc, checkOnly) {
	var resultsTitle = ZU.xpath(doc, '//div[@id="perenne-references-docs"]/span[contains(@class, "detail_value")]');
	var resultsHref = ZU.xpath(doc, '//div[@id="perenne-references-docs"]/span[contains(@class, "detail_label")]/a/@href');
	var found = false;
	var items = {};
	for (let i = 0; i < resultsTitle.length; i++) {
		var href = resultsHref[i].textContent;
		// We need to replace the http://www.sudoc.fr/XXXXXX links are they are redirects and aren't handled correctly from subtranslator
		href = href.replace(/http:\/\/www\.sudoc\.fr\/(.*)$/, "http://www.sudoc.abes.fr/xslt/DB=2.1//SRCH?IKT=12&TRM=$1");

		if ((href.includes("www.sudoc.abes.fr")) || (href.includes("archives-ouvertes")) || (href.includes("catalogue.bnf.fr")) || (href.includes("www.theses.fr")) || (href.includes("pub.orcid.org")) || (href.includes("www.persee.fr")) || (href.includes("oatao.univ-toulouse.fr"))) {
			if (checkOnly) return true;
			found = true;
			items[href] = resultsTitle[i].textContent;
		}
	}
	return found ? items : false;
}

function doWeb(doc, _url) {
	Zotero.selectItems(getSearchResults(doc, false), function (selectedItems) {
		if (!selectedItems) {
			return;
		}
		var articles = [];
		for (var i in selectedItems) {
			articles.push(i);
		}
		ZU.processDocuments(articles, scrape);
	});
}

function scrape(doc, url) {
	var translator = Zotero.loadTranslator('web');
	
	if (url.includes("archives-ouvertes")) {
		translator.setTranslator('58ab2618-4a25-4b9b-83a7-80cd0259f896');
	}
	else if (url.includes("sudoc.abes.fr")) {
		translator.setTranslator('1b9ed730-69c7-40b0-8a06-517a89a3a278');
	}
	else if (url.includes("catalogue.bnf.fr")) {
		translator.setTranslator('47533cd7-ccaa-47a7-81bb-71c45e68a74d');
	}
	else if (url.includes("www.theses.fr")) {
		translator.setTranslator('3f73f0aa-f91c-4192-b0d5-907312876cb9');
	}
	else if (url.includes("www.persee.fr") || url.includes("oatao.univ-toulouse.fr")) {
		translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48'); // Embedded metadata
	}
	else {
		// Orcid is the only case where we need to use an import translator, different behvior from previous ones
		if (url.includes("pub.orcid.org")) {
			// Idrefs contains orcid links with /works/ for which the content negotiation
			// does not allow to get CSL results. Each link describes only one reference
			// so we can safely replace /works/ by /work/. The last one allows content negotiation
			url = url.replace("/works/", "/work/");

			ZU.doGet(url, function (text) {
				var translator = Zotero.loadTranslator("import");
				translator.setTranslator("bc03b4fe-436d-4a1f-ba59-de4d2d7a63f7");// CSL JSON
				translator.setString(text);
				translator.translate();
			}, undefined, undefined, { Accept: "application/vnd.citationstyles.csl+json" });
	
			return;
		}
		Z.debug("Undefined website");
		return;
	}

	translator.setHandler('itemDone', function (obj, item) {
		item.complete();
	});
	
	translator.getTranslatorObject(function (trans) {
		trans.doWeb(doc, url);
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.idref.fr/199676100",
		"items": "multiple"
	}
]
/** END TEST CASES **/
