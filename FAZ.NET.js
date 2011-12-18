{
	"translatorID": "4f0d0c90-5da0-11df-a08a-0800200c9a66",
	"label": "FAZ.NET",
	"creator": "ibex, Sebastian Karcher",
	"target": "^http://((www\\.)?faz\\.net/.)",
	"minVersion": "2.1",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcs",
	"lastUpdated": "2011-12-10 18:30:42"
}

/*
	FAZ Translator - Parses FAZ articles and creates Zotero-based metadata.
	Copyright (C) 2010-2011 ibex

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



function getXPath(xpath, doc) {
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ?
	function (prefix) {
		if (prefix == "x") return namespace;
		else return null;
	} : null;

	return doc.evaluate(xpath, doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext();
}

/* Zotero API */

function detectWeb(doc, url) {
	//Zotero.debug("ibex detectWeb URL= "+ url);
	if (doc.title == "Suche und Suchergebnisse - FAZ" && getXPath('//div[@class = "SuchergebnisListe"]', doc)) {
		return "multiple";
	} else if (getXPath('//div[@class = "FAZArtikelEinleitung"]', doc)) {
		return "newspaperArticle";
	}
}


function doWeb(doc, url) {
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ?
	function (prefix) {
		if (prefix == 'x') return namespace;
		else return null;
	} : null;
	var arts = new Array();
	if (detectWeb(doc, url) == "multiple") {
		var items = new Object();
		var titles = doc.evaluate('//a[@class="TeaserHeadLink"]', doc, nsResolver, XPathResult.ANY_TYPE, null);
		var title;
		while (title = titles.iterateNext()) {
			items[title.href] = title.textContent.trim();
		}
		Zotero.selectItems(items, function (items) {
			if (!items) {
				return true;
			}
			for (var itemurl in items) {
				arts.push(itemurl);
			}
			ZU.processDocuments(arts, scrape, function () {
				Zotero.done();
			});
			Zotero.wait();
		});
	} else {
		scrape(doc);
	}
}




function scrape(doc) {
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ?
	function (prefix) {
		if (prefix == "x") return namespace;
		else return null;
	} : null;

	var newArticle = new Zotero.Item('newspaperArticle');
	newArticle.url = doc.location.href;
	newArticle.title = ZU.trimInternal(ZU.xpathText(doc, '//div[@class = "FAZArtikelEinleitung"]/h1/text()')).replace(/^,/, "");
	var date = getXPath('//span[@class = "Datum"]', doc).textContent;
	newArticle.date = Zotero.Utilities.trimInternal(date.replace(/ .*$/, ""));


	var teaser = ZU.xpathText(doc, '//div[@class="FAZArtikelEinleitung"]/p[@class = "Copy"]/text()');
	if (teaser != null) {
		newArticle.abstractNote = Zotero.Utilities.trimInternal(teaser).replace(/^,\s*/, "");
	}

	//some authors are in /a, some aren't we need to distinguish to get this right
	if (getXPath('//div[@class="FAZArtikelEinleitung"]/span[@class = "Autor"]/span[@class="caps"]/a', doc)) {
		var xpath = '//div[@class="FAZArtikelEinleitung"]/span[@class = "Autor"]/span[@class="caps"]/a';
	} else {
		var xpath = '//div[@class="FAZArtikelEinleitung"]/span[@class = "Autor"]/span[@class="caps"]';
	};
	var authors = ZU.xpath(doc, xpath);
	if (authors != null) {
		for (i in authors) {
			newArticle.creators.push(Zotero.Utilities.cleanAuthor(authors[i].textContent, "author"));
		}
	}

	newArticle.publicationTitle = "FAZ.NET";

	var section = getXPath('//ul[@id="nav"]/li/span[@class = "Selected"]', doc);
	if (section != null) {
		newArticle.section = Zotero.Utilities.trimInternal(section.textContent);
	}

	var source = getXPath('//div[@id="MainColumn"]/div[@class = "Article"]/p[@class = "ArticleSrc"]', doc);
	if (source != null) {
		newArticle.extra = Zotero.Utilities.trimInternal(Zotero.Utilities.cleanTags(source.innerHTML));
	}
	newArticle.ISSN = "0174-4909";
	newArticle.attachments.push({
		title: "FAZ.NET Article Snapshot",
		mimeType: "text/html",
		url: doc.location.href,
		snapshot: true
	});

	newArticle.complete();
}

/* There is no built-in function to count object properties which often are used as associative arrays.*/

function countObjectProperties(obj) {
	var size = 0;
	for (var key in obj) {
		if (obj.hasOwnProperty(key)) size++;
	}
	return size;
}


/** BEGIN TEST CASES **/
var testCases = [{
	"type": "web",
	"url": "http://www.faz.net/artikel/C30783/wissenschaftsphilosophie-krumme-wege-der-vernunft-30436005.html",
	"items": [{
		"itemType": "newspaperArticle",
		"creators": [{
			"firstName": "Fynn Ole",
			"lastName": "Engler",
			"creatorType": "author"
		}, {
			"firstName": "Jürgen",
			"lastName": "Renn",
			"creatorType": "author"
		}],
		"notes": [],
		"tags": [],
		"seeAlso": [],
		"attachments": [{
			"title": "FAZ.NET Article Snapshot",
			"mimeType": "text/html",
			"url": false,
			"snapshot": true
		}],
		"url": "http://www.faz.net/artikel/C30783/wissenschaftsphilosophie-krumme-wege-der-vernunft-30436005.html",
		"title": "Wissenschaftsphilosophie: Krumme Wege der Vernunft",
		"date": "2011-06-13",
		"shortTitle": "Krumme Wege der Vernunft",
		"abstractNote": "Wissenschaft hat eine Geschichte, wie kann sie dann aber rational sein? Im Briefwechsel zwischen Ludwik Fleck und Moritz Schlick deuteten sich bereits Antworten an.",
		"publicationTitle": "FAZ.NET",
		"extra": "Fynn Ole Engler ist Mitherausgeber der als Langzeitvorhaben der Akademie der Wissenschaften in Hamburg erscheinenden Moritz-Schlick-Gesamtausgabe. Jürgen Renn ist Direktor am Max-Planck-Institut für Wissenschaftsgeschichte in Berlin. Text: F.A.S. Bildmaterial: Foto ETH Zürich, ÖNB Bildarchiv Austria",
		"libraryCatalog": "FAZ.NET"
	}]
}, {
	"type": "web",
	"url": "http://www.faz.net/f30/common/Suchergebnis.aspx?term=philosophie&x=0&y=0&allchk=1",
	"items": "multiple"
}]; /** END TEST CASES **/