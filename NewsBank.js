{
	"translatorID": "7fc76bfc-3a1a-47e7-93cc-4deed69bee5f",
	"label": "NewsBank",
	"creator": "Reuben Peterkin",
	"target": "^https?://infoweb\\.newsbank\\.com/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-12-12 02:50:32"
}

/*
	***** BEGIN LICENSE BLOCK *****

	NewsBank translator Copyright © 2021 Reuben Peterkin

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
	if (getRISElement(doc)) return "newspaperArticle";
	if (getSearchResults(doc, true)) return "multiple";
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {}, found = false;
	var rows = doc.querySelectorAll('article');
	if (!rows.length) rows = doc.querySelectorAll('.hit');
	if (!rows.length) return false;

	for (let row of rows) {
		var title = row.querySelector('.search-hits__hit__title')
			|| row.querySelector('.article-title');
		var link = row.querySelector('a');
		var prefix = text(link, '.element-invisible');
		if (!title || !link) continue;
		found = true;
		if (checkOnly) return true;

		items[link.href] = ZU.trimInternal(title.textContent.replace(prefix, ''));
	}

	return found ? items : false;
}

function getRISElement(doc) {
	return doc.getElementById('nbplatform-noodletools-export-risdatabyformpost')
		|| doc.querySelector('.action-link--exportcitation');
}

function getItem(doc, url) {
	var risElem = getRISElement(doc);
	if (risElem.href) {
		ZU.doGet(risElem.href, risText => itemFromRIS(doc, url, risText));
	}
	else {
		itemFromRIS(doc, url, risElem.textContent.trim());
	}
}

function itemFromRIS(doc, url, risText) {
	//	Z.debug(risText);
	var trans = Zotero.loadTranslator('import');
	// RIS
	trans.setTranslator('32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7');
	trans.setString(risText);
	trans.setHandler('itemDone', function (obj, item) {
		if (item.pages) {
			item.pages = item.pages
				.replace(/\bpage\b\s*/gi, '')
				.replace(/,(\S)/g, ', $1');
		}
		
		let openURL = attr(doc, '.action-link--bookmark', 'onclick')
			.match(/f_openurl=([^&'"]+)/);
		item.url = text(doc, '.actions-bar__urltext')
			|| (openURL && decodeURIComponent(openURL[1]))
			|| url;
		
		let pdfURL = attr(doc, '.action-link--pdf', 'href');
		if (pdfURL) {
			item.attachments.push({
				title: 'Full Text PDF',
				mimeType: 'application/pdf',
				url: pdfURL
			});
		}
		else {
			item.attachments.push({
				title: 'Snapshot',
				document: doc
			});
		}

		item.complete();
	});
	trans.translate();
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		var items = getSearchResults(doc);
		//	Zotero.debug(items);

		Zotero.selectItems(items, function (items) {
			if (!items) return;
			ZU.processDocuments(Object.keys(items), getItem);
		});
	}
	else {
		getItem(doc, url);
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://infoweb.newsbank.com/apps/news/openurl?ctx_ver=z39.88-2004&rft_id=info%3Asid/infoweb.newsbank.com&svc_dat=AWNB&req_dat=3AD092142963457FA426C327101D0723&rft_val_format=info%3Aofi/fmt%3Akev%3Amtx%3Actx&rft_dat=document_id%3Anews%252F16579C8CD2790100",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Rare animals among body count at Scottish zoos",
				"creators": [
					{
						"lastName": "Macaskill",
						"firstName": "Mark",
						"creatorType": "author"
					}
				],
				"date": "July 2, 2017",
				"archive": "Access World News",
				"libraryCatalog": "NewsBank",
				"pages": "3",
				"publicationTitle": "Sunday Times, The (London, England)",
				"url": "https://infoweb.newsbank.com/apps/news/openurl?ctx_ver=z39.88-2004&rft_id=info%3Asid/infoweb.newsbank.com&svc_dat=AWNB&req_dat=3AD092142963457FA426C327101D0723&rft_val_format=info%3Aofi/fmt%3Akev%3Amtx%3Actx&rft_dat=document_id%3Anews%252F16579C8CD2790100",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "<p>SQN: 127147919</p>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://docs.newsbank.com/openurl?ctx_ver=z39.88-2004&rft_id=info:sid/iw.newsbank.com:FBISX&rft_val_format=info:ofi/fmt:kev:mtx:ctx&rft_dat=11E3F3AD6E1A9CC0&svc_dat=HistArchive:fbisdoc&req_dat=0D0CB57AB53DF815",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Airport Closed to Night Traffic",
				"creators": [],
				"date": "May 29, 1975",
				"libraryCatalog": "NewsBank",
				"pages": "B1, B2",
				"publicationTitle": "Djibouti Domestic Service",
				"url": "https://docs.newsbank.com/openurl?ctx_ver=z39.88-2004&rft_id=info:sid/iw.newsbank.com:FBISX&rft_val_format=info:ofi/fmt:kev:mtx:ctx&rft_dat=11E3F3AD6E1A9CC0&svc_dat=HistArchive:fbisdoc&req_dat=0D0CB57AB53DF815",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "<p>Provider: NewsBank/Readex, Database: Foreign Broadcast Information Service (FBIS) Daily Reports, SQN: 11E3F3AC1DC571D8</p>"
					}
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
