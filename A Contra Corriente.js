{
	"translatorID": "bbf1617b-d836-4665-9aae-45f223264460",
	"label": "A Contra Corriente",
	"creator": "Sebastian Karcher",
	"target": "^https?://tools\\.chass\\.ncsu\\.edu/open_journal/index\\.php/acontracorriente/",
	"minVersion": "1.0.0b4.r5",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2012-03-23 04:26:44"
}

/*
   A Contra Corriente Translator
   Copyright (C) 2012 Sebastian Karcher and Avram Lyon
   
   This program is free software: you can redistribute it and/or modify
   it under the terms of the GNU Affer General Public License as published by
   the Free Software Foundation, either version 3 of the License, or
   (at your option) any later version.

   This program is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU Affero General Public License for more details.

   You should have received a copy of the GNU Affer General Public License
   along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/


function detectWeb(doc, url) {
	var xpath = '//meta[@name="citation_journal_title"]';

	if (ZU.xpath(doc, xpath).length > 0) {
		return "journalArticle";
	}

	if (url.match(/issue\/view|search\/results/)) {
		return "multiple";
	}

	return false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		var hits = {};
		var urls = [];

		//distinguish between search results and ToCs, which require different logic
		if (url.match(/search\/results/)) {
			var rows = ZU.xpath(doc, "//table[@class='listing']//tr[@valign='top']");
			if (!rows || rows.length == 0) results = ZU.xpath(doc, "//form[@name='search']/table[3]/tbody/tr/td[2]/a[@class='hiddenlink']");

			for (var i in rows) {
				var titles = ZU.xpathText(rows[i], './td[2]');
				var URL = ZU.xpathText(rows[i], './td[3]/a/@href');
				hits[URL] = titles;
			}
		} else {
			var results = ZU.xpath(doc, "//td[@class='tocTitle']/a");
			for (var i in results) {
				hits[results[i].href] = results[i].textContent;
			}
		}

		//Z.debug(hits);
		Z.selectItems(hits, function (items) {
			if (items == null) return true;
			for (var j in items) {
				urls.push(j);
			}
			ZU.processDocuments(urls, function (myDoc) {
				doWeb(myDoc, myDoc.location.href)
			}, function () {
				Z.done()
			});

			Z.wait();
		});
	} else {
		// We call the Embedded Metadata translator to do the actual work
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
		translator.setHandler("itemDone", function (obj, item) {
			item.abstractNote = item.extra;
			item.extra = '';
			item.rights = '';
			item.complete();
		});
		translator.getTranslatorObject(function (obj) {
			obj.doWeb(doc, url);
		});
	}
}
/** BEGIN TEST CASES **/
var testCases = [{
	"type": "web",
	"url": "http://tools.chass.ncsu.edu/open_journal/index.php/acontracorriente/article/view/102",
	"items": [{
		"itemType": "journalArticle",
		"creators": [{
			"firstName": "José Luis",
			"lastName": "Rénique",
			"creatorType": "author"
		}],
		"notes": [],
		"tags": ["Carlos Iván degregori", "historia", "Perú"],
		"seeAlso": [],
		"attachments": [{
			"title": "Full Text PDF",
			"mimeType": "application/pdf"
		}, {
			"title": "Snapshot"
		}],
		"itemID": "http://tools.chass.ncsu.edu/open_journal/index.php/acontracorriente/article/view/102",
		"title": "Carlos Iván Degregori: antropólogo del alma",
		"publicationTitle": "A Contracorriente",
		"date": "02/06/2011",
		"reportType": "Text.Serial.Journal",
		"letterType": "Text.Serial.Journal",
		"manuscriptType": "Text.Serial.Journal",
		"mapType": "Text.Serial.Journal",
		"thesisType": "Text.Serial.Journal",
		"websiteType": "Text.Serial.Journal",
		"presentationType": "Text.Serial.Journal",
		"postType": "Text.Serial.Journal",
		"audioFileType": "Text.Serial.Journal",
		"language": "en",
		"volume": "8",
		"issue": "3",
		"pages": "i-vii",
		"ISSN": "1548-7083",
		"url": "http://tools.chass.ncsu.edu/open_journal/index.php/acontracorriente/article/view/102",
		"accessDate": "CURRENT_TIMESTAMP",
		"libraryCatalog": "tools.chass.ncsu.edu",
		"abstractNote": "Remembranza de la reciente muerte (18 de Mayo de 2011) en Lima de Carlos&nbsp;Iv&aacute;n Degregori, uno de los intelectuales peruanos m&aacute;s&nbsp;importantes de las &uacute;ltimas d&eacute;cadas y uno de los estudiosos&nbsp;internacionales m&aacute;s destacados de la violencia pol&iacute;tica. A&nbsp;Contracorriente se suma a los innumerables homenajes que se&nbsp;tributan a su memoria. Su colega y amigo a lo largo de muchos&nbsp;a&ntilde;os, el historiador Jos&eacute; Luis R&eacute;nique, traza en esta nota el perfil&nbsp;humano, intelectual y pol&iacute;tico de Degregori. Al final incluimos&nbsp;tambi&eacute;n una lista de sus principales publicaciones.",
		"shortTitle": "Carlos Iván Degregori"
	}]
}, {
	"type": "web",
	"url": "http://tools.chass.ncsu.edu/open_journal/index.php/acontracorriente/issue/view/16/showToc",
	"items": "multiple"
}]
/** END TEST CASES **/
