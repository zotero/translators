{
	"translatorID": "5e1f3e08-ca5f-4196-a662-6cf46b3cdaa7",
	"label": "ypfs",
	"creator": "Corey Runkel",
	"target": "https://ypfs.som.yale.edu",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-03-13 20:27:18"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2021 Corey Runkel
	
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
	if (url.includes('/library/')) {
		return "document";
/*
	} else if ((url.includes('admin/content') || url.endsWith('.edu'))) {
		return "multiple";
*/
	}
}


/* function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('tr>td>a[href*="/web/packages/"]');
	for (let i=0; i<rows.length; i++) {
		let href = rows[i].href;
		let title = ZU.trimInternal(rows[i].textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}
*/


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


function scrape(doc, url) {
	var item = new Zotero.Item('document');
	item.title = ZU.xpathText(doc, '//div[@id="block-ypfs-theme-page-title"]/h1/span');
	item.date = ZU.xpathText(doc, '//dl[@class="ypfs-case__details"]/dt[contains(., "Date")]/following-sibling::dd[1]');
	item.abstractNote = ZU.xpathText(doc, '//dl[@class="ypfs-case__details"]/dt[contains(., "Information")]/following-sibling::dd[1]');
	item.publisher = ZU.xpathText(doc, '//dl[@class="ypfs-case__details"]/dt[contains(., "Publisher")]/following-sibling::dd[1]');
	item.creators = ZU.cleanAuthor(ZU.xpathText(doc, '//dl[@class="ypfs-case__details"]/dt[contains(., "Author")]/following-sibling::dd[1]'), "author", true);
	item.language = ZU.xpathText(doc, '//dl[@class="ypfs-case__details"]/dt[contains(., "Language")]/following-sibling::dd[1]');
	item.url = url;
	item.attachments = [{
		url: ZU.xpath(doc, '//a[@class="button no-icon"]', '@href').toString(),
		mimeType: "application/pdf",
		title: "Full Text PDF"
	}];

	item.complete();
}
