{
	"translatorID": "a5cb4b58-9a7a-478d-92a9-bf51d6ea4772",
	"label": "Bible Gateway",
	"creator": "Dandelion Good",
	"target": "^https?://www\\.biblegateway\\.com/passage/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-10-22 20:08:33"
}


/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2026 Dandelion Good and the righteous Anti Toil Theologians at Iliff
	This file is part of Zotero.

	Zotero is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	Zotero is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public License
	along with Zotero.  If not, see <http://www.gnu.org/licenses/>.

	***** END LICENSE BLOCK *****
*/

/*
***** BEGIN ATTRIBUTION BLOCK *****
This translator was developed by Dandelion Good.

If you do any work on this translator, please add yourself here <3.
*/

function isPassageUrl(url) {
	// ToDo already covered in regex
	return url.includes('/passage/');
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	return found ? items: false;
}

async function scrape(doc, url=doc.location.href) {
	let item =  new Zotero.Item("bookSection");
	item.url = url;
	item.language = attr(doc, "html", "lang");

	item.complete();
}


function detectWeb(doc, url) {
	if (isPassageUrl(url)) {
		return "bookSection";
	}
	return false;
}

async function doWeb(doc, url) {
	let detected = detectWeb(doc, url)
	if (detected == 'multiple') {
		// ToDo
		Zotero.debug("found multiple, not yet supported!")
	} else {
		scrape(doc, url)
	}
}

function scrape(doc, url) {
	let item = new Zotero.Item('bookSection');
	item.language = attr(doc, "html", "lang");

	let itemType = attr(doc, '[property~="og:type"]', 'content');
	let tagNodeList = doc.querySelectorAll(`[property~="og:${itemType}:tag"]`);
	let description = attr(doc, '[property~="og:description"]', 'content');
	const titleTag = document.querySelector('meta[property="og:title"]');
	let title = document.title
	if (titleTag) {
		titleText = titleTag.getAttribute('content').split('passage:')[1]?.trim();
		if (titleText) {
			title=titleText
		}
	}
	item.title = title
	//Zotero.HTTP.request({
    //method: 'GET',
    //url: url,
    //success: function(transport) {
    //    let text = transport.responseText;
    //    // Handle the response text here
    //}
	//});
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
