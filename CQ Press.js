{
	"translatorID": "0de4cddf-be9d-4e1e-9b51-891b7a4bb136",
	"label": "CQ Press",
	"creator": "Abe Jellinek",
	"target": "^https?://library\\.cqpress\\.com/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-09-01 21:06:24"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2021 Abe Jellinek
	
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
	if (url.includes('/document.php?')) {
		if (url.includes('/cqresearcher/')) {
			// yes, these are "reports," but they have volume/issue numbers and
			// are published like journal articles
			return "journalArticle";
		}
		else if (url.includes('/congress/')
			|| url.includes('/cqalmanac/')
			|| url.includes('/pia/')
			|| url.includes('/scyb/')) {
			return "bookSection";
		}
		else if (url.includes('/cqmagazine/')) {
			return "magazineArticle";
		}
	}
	else if (getSearchResults(doc, url, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, url, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('a[href*="document.php?"]');
	if (!rows.length) {
		rows = doc.querySelectorAll('a[onclick*="popupDoc("]');
	}
	
	for (let row of rows) {
		let href = row.getAttribute('href'); // prevent automatic relative -> absolute
		let title = ZU.trimInternal(row.textContent);
		if (/^\d+$/.test(title)) {
			// sometimes the link is only on one part of the title:
			// Brown, Scott P., [[466]]
			title = ZU.trimInternal(row.parentNode.textContent);
		}
		
		if (href == '#') href = '';
		if (!href && row.hasAttribute('onclick')) {
			// pull out the query parameters and append them to
			// `/<current publication>/document.php?`
			href = url.replace(/\/[^/]*$/, '/document.php?')
				+ (row.getAttribute('onclick').match(/'(.+)'/) || [])[1];
		}

		if (!href || !title || title.includes('Read the Full Report')) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		Zotero.selectItems(getSearchResults(doc, url, false), function (items) {
			if (items) ZU.processDocuments(Object.keys(items), scrape);
		});
	}
	else {
		scrape(doc, url);
	}
}

function scrape(doc, url) {
	let id = url.match(/[?&]id=([^&#]+)/)[1];
	var risURL = url.replace(/document\.php.*$/, `/citenow.php?id=${id}&action=endnote`);
	
	ZU.doGet(risURL, function (risText) {
		risText = risText
			.replace(/^JO/m, 'T2')
			.replace(/^UR/gm, 'L1') // demote all existing URLs
			.replace(/^L2/m, 'UR'); // ...and replace them with L2, the correct one
		
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7"); // RIS
		translator.setString(risText);
		translator.setHandler("itemDone", function (obj, item) {
			if (url.includes('/cqmagazine/')) {
				item.itemType = 'magazineArticle';
			}
			
			// innerText to capture line breaks
			let date = innerText(doc, '#main .date, .time-info, .topheader');
			if (!item.date) item.date = ZU.strToISO(date);
			
			let volume = date.match(/Volume (\w+)/);
			if (volume) {
				item.volume = volume[1];
			}
			
			let issue = date.match(/Issue (\w+)/);
			if (issue) {
				item.issue = issue[1];
			}
			
			item.abstractNote = text(doc, '#abstract');

			item.attachments = [];
			
			let pdfURL = attr(doc, 'iframe[src*=".pdf"]', 'src');
			if (!pdfURL && url.includes('/cqresearcher/')) {
				pdfURL = `/cqresearcher/getpdf.php?id=${id}`;
			}
			
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
			
			item.notes = [];
			
			item.complete();
		});
		translator.translate();
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://library.cqpress.com/cqresearcher/document.php?id=cqresrre2021081300",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Hate Crimes",
				"creators": [
					{
						"lastName": "Ladika",
						"firstName": "Susan",
						"creatorType": "author"
					}
				],
				"date": "2021-08-13",
				"ISSN": "1942-5635",
				"abstractNote": "Hate crimes against Asian Americans have increased in the past year, a development that experts say is tied to the COVID-19 pandemic. From 2019 to 2020, bias-based crimes against Asians rose nearly 150 percent in major U.S. cities, and the trend has continued this year. Many blame the increase on the rhetoric of former President Donald Trump, who called COVID-19 the “China virus” and “kung flu.” While the pandemic has highlighted anti-Asian animus, hate crimes generally are on the rise against other racial, ethnic and religious groups and among people targeted due to their sexual orientation or gender identity. Researchers say these crimes are often significantly underreported and underprosecuted, and lawmakers hope new federal statutes designed to improve state and local hate crime reporting will better define the scope of the problem. Others say that merely gathering better statistics will not solve the problem and want more prosecutions of bias-based crimes. Critics of hate crime laws say they violate free speech rights and create special protections for certain groups based on political considerations.",
				"issue": "29",
				"libraryCatalog": "CQ Press",
				"pages": "1-29",
				"publicationTitle": "CQ Researcher",
				"url": "http://library.cqpress.com/cqresearcher/cqresrre2021081300",
				"volume": "31",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
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
		"url": "https://library.cqpress.com/congress/document.php?id=pia115-Barton-Joe-L#",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Barton, Joe L.",
				"creators": [
					{
						"lastName": "CQ-Roll Call",
						"creatorType": "editor",
						"fieldMode": 1
					}
				],
				"date": "2017",
				"bookTitle": "Politics in America 2018. The 115th Congress",
				"libraryCatalog": "CQ Press",
				"place": "Washington, D.C., United States",
				"publisher": "CQ-Roll Call, Inc.",
				"series": "CQ Congress Collection",
				"url": "http://library.cqpress.com/congress/pia115-Barton-Joe-L",
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
		"url": "https://library.cqpress.com/congress/document.php?id=rc1989-201-9316-574703&type=hitlist&num=0",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Minimum-Wage Increase/Social Security Earnings Test (in Sen.) S 4",
				"creators": [],
				"date": "1990",
				"ISBN": "9780871875488",
				"bookTitle": "Congressional Roll Call 1989",
				"libraryCatalog": "CQ Press",
				"place": "Washington, D.C., United States",
				"publisher": "CQ Press",
				"series": "CQ Congress Collection",
				"url": "http://library.cqpress.com/congress/rc1989-201-9316-574703",
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
		"url": "https://library.cqpress.com/cqalmanac/document.php?id=cqal12-1531-87293-2553227&type=toc&num=1",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Bill Normalizes Trade with Russia",
				"creators": [],
				"date": "2013",
				"ISBN": "9781452292601",
				"bookTitle": "CQ Almanac 2012",
				"libraryCatalog": "CQ Press",
				"place": "Washington, D.C., United States",
				"publisher": "CQ-Roll Call Group",
				"series": "CQ Almanac Online Edition",
				"url": "http://library.cqpress.com/cqalmanac/cqal12-1531-87293-2553227",
				"volume": "68",
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
		"url": "https://library.cqpress.com/cqmagazine/document.php?id=weeklyreport117-000006302112",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "With border adjustment plan, trade could be new carbon battleground",
				"creators": [],
				"date": "2021-08-02",
				"libraryCatalog": "CQ Press",
				"publicationTitle": "CQ Magazine",
				"url": "http://library.cqpress.com/cqmagazine/weeklyreport117-000006302112",
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
		"url": "https://library.cqpress.com/pia/document.php?id=OEpia112_1067",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Baldwin, Tammy, D-Wis.",
				"creators": [
					{
						"lastName": "Bicknell John",
						"creatorType": "editor",
						"fieldMode": 1
					},
					{
						"lastName": "Meyers David",
						"creatorType": "editor",
						"fieldMode": 1
					}
				],
				"date": "2011",
				"ISBN": "9781608717996",
				"bookTitle": "Politics in America 2012 (the 112th Congress)",
				"libraryCatalog": "CQ Press",
				"place": "Washington, D.C., United States",
				"publisher": "CQ-Roll Call, Inc.",
				"series": "Politics in America Online Edition",
				"url": "http://library.cqpress.com/pia/OEpia112_1067",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
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
		"url": "https://library.cqpress.com/scyb/document.php?id=scyb10-1270-70980-2380010&type=toc&num=1",
		"items": [
			{
				"itemType": "bookSection",
				"title": "American Electric Power Company, Inc. v. Connecticut",
				"creators": [
					{
						"lastName": "Jost",
						"firstName": "Kenneth",
						"creatorType": "author"
					}
				],
				"date": "2011",
				"bookTitle": "Supreme Court Yearbook, 2010-2011",
				"libraryCatalog": "CQ Press",
				"place": "Washington, D.C., United States",
				"publisher": "CQ Press",
				"series": "Supreme Court Yearbook Online Edition",
				"url": "http://library.cqpress.com/scyb/scyb10-1270-70980-2380010",
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
		"url": "https://library.cqpress.com/cqresearcher/search.php?fulltext=test&action=newsearch&sort=custom%3Asorthitsrank%2Cd&x=0&y=0",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://library.cqpress.com/cqresearcher/index.php",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://library.cqpress.com/scyb/toc.php?mode=scyb-topics&level=3&values=Environmental+Law%7EAir+Pollution",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://library.cqpress.com/pia/static.php?id=oepia112_index#b",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://library.cqpress.com/cqmagazine/",
		"items": "multiple"
	}
]
/** END TEST CASES **/
