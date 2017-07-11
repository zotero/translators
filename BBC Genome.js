{
	"translatorID": "777e5ce0-0b16-4a12-8e6c-5a1a2cb33189",
	"label": "BBC Genome",
	"creator": "Philipp Zumstein",
	"target": "^https?://genome\\.ch\\.bbc\\.co\\.uk/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2017-07-11 22:28:49"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2017 Philipp Zumstein
	
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


// attr()/text() v2
function attr(docOrElem,selector,attr,index){var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);return elem?elem.getAttribute(attr):null}function text(docOrElem,selector,index){var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);return elem?elem.textContent:null}


function detectWeb(doc, url) {
	if (url.indexOf('/search/')>-1 && getSearchResults(doc, true)) {
		return "multiple";
	} else if (text(doc, 'div.programme-details')) {
		return "magazineArticle";
	}
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('h2>a.title');
	for (var i=0; i<rows.length; i++) {
		var href = rows[i].href;
		var title = ZU.trimInternal(rows[i].textContent);
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


function scrape(doc, url) {
	var item = new Zotero.Item("magazineArticle");
	item.title = text(doc, 'h1');
	
	var aside = text(doc, 'aside.issue p');
	//e.g.    Issue 2384\n   7 July 1969\n   Page 16
	var parts = aside.trim().split('\n');
	item.issue = parts[0].replace('Issue', '').trim();
	item.date = ZU.strToISO(parts[1]);
	item.pages = parts[2].replace('Page', '').trim();
	
	item.abstractNote = text(doc, '.primary-content a');
	
	item.publicationTitle = 'The Radio Times';
	item.ISSN = '0033-8060';
	item.language = 'en-GB';
	item.url = url;
	item.attachments.push({
		document: doc,
		title: "Snapshot"
	});
	item.complete();
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://genome.ch.bbc.co.uk/09d732e273ae49e490d35ff1b69bf5f9",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "ST. HILDA'S BAND",
				"creators": [],
				"date": "1933-10-20",
				"ISSN": "0033-8060",
				"abstractNote": "Regional Programme Midland, 28 October 1933 20.00",
				"issue": "525",
				"language": "en-GB",
				"libraryCatalog": "BBC Genome",
				"pages": "68",
				"publicationTitle": "The Radio Times",
				"url": "http://genome.ch.bbc.co.uk/09d732e273ae49e490d35ff1b69bf5f9",
				"attachments": [
					{
						"title": "Snapshot"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://genome.ch.bbc.co.uk/4bad6bdda36645d7be09f44bf51eff18",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "Apollo 11",
				"creators": [],
				"date": "1969-07-17",
				"ISSN": "0033-8060",
				"abstractNote": "BBC One London, 21 July 1969 6.00",
				"issue": "2384",
				"language": "en-GB",
				"libraryCatalog": "BBC Genome",
				"pages": "16",
				"publicationTitle": "The Radio Times",
				"url": "http://genome.ch.bbc.co.uk/4bad6bdda36645d7be09f44bf51eff18",
				"attachments": [
					{
						"title": "Snapshot"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://genome.ch.bbc.co.uk/search/0/20?adv=0&q=apollo+&media=all&yf=1923&yt=2009&mf=1&mt=12&tf=00%3A00&tt=00%3A00#search",
		"items": "multiple"
	}
]
/** END TEST CASES **/