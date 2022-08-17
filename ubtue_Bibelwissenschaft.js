{
	"translatorID": "b66ff0ec-822f-410d-bc2f-bea9360c93ba",
	"label": "ubtue_Bibelwissenschaft",
	"creator": "Johannes Riedl",
	"target": "https://www.bibelwissenschaft.de/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-08-16 14:54:10"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2020 Universitätsbibliothek Tübingen.  All rights reserved.

	This program is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public License
	along with this program.  If not, see <http://www.gnu.org/licenses/>.


	***** END LICENSE BLOCK *****
*/


const entryXPath = '//meta[@property="og:title"]/@content';
const journalInfoXPath = '//p[@class="MsoNormal"]//span/text()';


function detectWeb(doc, url) {
	if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}


function getSearchResults(doc, checkOnly) {
	let items = {};
	let found = false;
	let rows = ZU.xpath(doc, entryXPath);
	for (let row of rows) {
		let title = row.value;
		//Z.debug(title);
		//let title = ZU.trimInternal(row.textContent);
		//let anchor = row.querySelector('a');
		//let href = anchor ? anchor.getAttribute("href") : null;
		//if (!href || !title) continue;
		//if (checkOnly) return true;
		found = true;
		items[doc.baseURI] = title;
	}
	return found ? items : false;
}


function extractAuthors(doc) {
	let author_entries = ZU.xpath(doc, "//div[@class='authors']");
	authors = [];
	for (let author_entry of author_entries) {
		let authors_raw = author_entry.textContent;
		for (let author of authors_raw.split(","))
		    authors.push(ZU.cleanAuthor(author));
	}
	return authors;
}


function extractTitle(doc) {
	let title_entry = ZU.xpath(doc, entryXPath);
	//Z.debug("EXTRACT TITLE: " + title_entry[0].value);
	return title_entry[0].value;	

}


function extractURL(doc) {
	let anchor = ZU.xpath(doc, "//div[@class='permalink']//a")
	let href = anchor ? anchor[0].href : null;
	if (href) {
		return href;
	}
}


function extractSeeAlso(doc, item) {
	Z.debug("Entering SEEALSO");
	let anchors = ZU.xpath(doc, "//div[@class='markdown']//a[@class='sachwort']");
	for (let anchor of anchors) {
		if (anchor.textContent)
		item.tags.push(anchor.textContent);
	}
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		let rows = ZU.xpath(doc, entryXPath);
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			Object.keys(items).forEach(function (key) {
				let item = new Zotero.Item("journalArticle");
				item.title = extractTitle(doc);
				for (let author of extractAuthors(doc))
					 item.creators.push(author);
				item.url = extractURL(doc);
				if (item.creators.length === 0) 
					extractSeeAlso(doc, item);
				item.complete();
			});
		});
	}
}
