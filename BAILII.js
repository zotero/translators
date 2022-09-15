{
	"translatorID": "5ae63913-669a-4792-9f45-e089a37de9ab",
	"label": "BAILII",
	"creator": "Bill McKinney",
	"target": "^https?://www\\.bailii\\.org(/cgi\\-bin/markup\\.cgi\\?doc\\=)?/\\w+/cases/.+",
	"minVersion": "1.0.0b4.r1",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-09-16 20:57:17"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2021 Bill McKinney

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

var liiRegexp = /^https?:\/\/www\.bailii\.org(?:\/cgi-bin\/markup\.cgi\?doc=)?\/\w+\/cases\/.+\.html/;

function detectWeb(doc, url) {
	if (liiRegexp.test(url)) {
		return "case";
	}
	else {
		var aTags = doc.getElementsByTagName("a");
		for (var i = 0; i < aTags.length; i++) {
			if (liiRegexp.test(aTags[i].href)) {
				return "multiple";
			}
		}
	}
	return false;
}

function scrape(doc, url) {
	var newItem = new Zotero.Item("case");
	newItem.title = doc.title;
	newItem.url = doc.location.href;
	var titleRegexp = /^(.+)\s+\[(\d+)\]\s+(.+)\s+\((\d+)\s+(\w+)\s+(\d+)\)/;
	var titleMatch = titleRegexp.exec(doc.title);
	if (titleMatch) {
		newItem.caseName = titleMatch[1] + " [" + titleMatch[2] + "] " + titleMatch[3];
		newItem.dateDecided = titleMatch[4] + " " + titleMatch[5] + " " + titleMatch[6];
	}
	else {
		newItem.caseName = doc.title;
		newItem.dateDecided = "not found";
	}

	var courtRegexp = /cases\/([^/]+)\/([^/]+)\//;
	var courtMatch = courtRegexp.exec(doc.location.href);
	if (courtMatch) {
		var divRegexp = /\w+/;
		var divMatch = divRegexp.exec(courtMatch[2]);
		if (divMatch) {
			newItem.court = courtMatch[1] + " (" + courtMatch[2] + ")";
		}
		else {
			newItem.court = courtMatch[1];
		}
	}
	else {
		newItem.court = "not found";
	}
	
	// judge
	var panel = doc.getElementsByTagName("PANEL");
	if (panel.length > 0) {
		let name = panel[0].innerHTML;
		newItem.creators.push({ lastName: name, creatorType: "author", fieldMode: 1 });
	}
	// citation
	var cite = doc.getElementsByTagName("CITATION");
	if (cite.length > 0) {
		let note = cite[0].childNodes[0].innerHTML;
		newItem.notes.push({ note });
	}
	newItem.attachments = [{ url: url, title: "Snapshot", mimeType: "text/html" }];
	newItem.complete();
}

function doWeb(doc, url) {
	if (liiRegexp.test(url)) {
		scrape(doc);
	}
	else {
		var items = Zotero.Utilities.getItemArray(doc, doc, liiRegexp);
		Zotero.selectItems(items, function (items) {
			if (items) ZU.processDocuments(Object.keys(items), scrape);
		});
	}
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.bailii.org/cgi-bin/markup.cgi?doc=/eu/cases/EUECJ/2011/C40308.html&query=copyright&method=boolean",
		"items": [
			{
				"itemType": "case",
				"caseName": "Football Association Premier League & Ors (Freedom to provide services) [2011] EUECJ C-403/08",
				"creators": [],
				"dateDecided": "04 October 2011",
				"court": "EUECJ (2011)",
				"url": "https://www.bailii.org/cgi-bin/markup.cgi?doc=/eu/cases/EUECJ/2011/C40308.html&query=copyright&method=boolean",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
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
		"url": "http://www.bailii.org/eu/cases/EUECJ/2007/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.bailii.org/ew/cases/EWHC/Comm/2020/170.html",
		"items": [
			{
				"itemType": "case",
				"caseName": "Forum Services International Ltd & Anor v OOS International BV [2020] EWHC 170 (Comm)",
				"creators": [
					{
						"lastName": "MR JUSTICE ROBIN KNOWLES CBE",
						"creatorType": "author",
						"fieldMode": true
					}
				],
				"dateDecided": "31 January 2020",
				"court": "EWHC (Comm)",
				"url": "https://www.bailii.org/ew/cases/EWHC/Comm/2020/170.html",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "Neutral Citation Number: [2020] EWHC 170 (Comm)"
					}
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
