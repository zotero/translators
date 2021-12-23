{
	"translatorID": "0aea3026-a246-4201-a4b5-265f75b9a6a7",
	"label": "Australian Dictionary of Biography",
	"creator": "Sebastian Karcher",
	"target": "^https?://adb\\.anu\\.edu\\.au/biograph(y|ies)/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-07-14 04:18:08"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2012-2021 Sebastian Karcher and Abe Jellinek
	
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
	if (url.includes('/biography/')) {
		return "bookSection";
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('a.name');
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(row.textContent);
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
			if (items) ZU.processDocuments(Object.keys(items), scrape);
		});
	}
	else {
		scrape(doc, url);
	}
}

function scrape(doc, url) {
	let item = new Zotero.Item('bookSection');
	let main = doc.querySelector('#pageColumnMain');
	
	item.title = text(main, 'h2');
	item.abstractNote = text(main, '.biographyContent p');
	item.bookTitle = 'Australian Dictionary of Biography';
	
	let noticeMatches = text(main, '.textNotice')
		.match(/([^,]+), \(MUP\), ([^,]+)/);
	if (noticeMatches) {
		item.volume = noticeMatches[1].replace(/^\s*volume/i, '');
		item.date = ZU.strToISO(noticeMatches[2]);
	}
	else {
		item.date = ZU.strToISO(text(main, '.textNotice'));
	}
	
	item.numberOfVolumes = '18';
	item.publisher = 'National Centre of Biography, Australian National University';
	item.place = 'Canberra';
	item.language = 'en';
	item.url = url;
	
	for (let author of main.querySelectorAll('.authorName a')) {
		item.creators.push(ZU.cleanAuthor(author.textContent, 'author'));
	}
	
	item.attachments.push({
		title: 'Snapshot',
		document: doc
	});
	
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://adb.anu.edu.au/biographies/search/?scope=all&query=Smith&x=0&y=0&rs=",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://adb.anu.edu.au/biography/smith-robert-burdett-4613",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Smith, Robert Burdett (1837–1895)",
				"creators": [
					{
						"firstName": "Chris",
						"lastName": "Cunneen",
						"creatorType": "author"
					}
				],
				"date": "1976",
				"abstractNote": "Robert Burdett Smith (1837-1895), solicitor and politician, was born on 25 August 1837 in Sydney, baptized Robert Lloyd, twin son of John Lloyd Smith and his wife Mary Ann, née Salmon. John, a native of Northumberland, had been convicted of horse-stealing at Edinburgh on 8 January 1830 and sentenced to be transported for seven years, arriving in Sydney in the York on 7 February 1831. Mary Ann, whom he had married with the governor's permission on 2 February 1835, had come free to the colony in the Princess Victoria on 4 February 1834. With his brother-in-law Thomas Armitage Salmon and later on his own, John traded as a carcass butcher in 1838-43; but on 11 April, bankrupt, he was convicted in Port Phillip of forgery and sentenced to transportation for the term of his natural life.",
				"bookTitle": "Australian Dictionary of Biography",
				"language": "en",
				"libraryCatalog": "Australian Dictionary of Biography",
				"numberOfVolumes": "18",
				"place": "Canberra",
				"publisher": "National Centre of Biography, Australian National University",
				"url": "https://adb.anu.edu.au/biography/smith-robert-burdett-4613",
				"volume": "6",
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
		"url": "https://adb.anu.edu.au/biography/bjelkepetersen-hans-christian-5247/text8839",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Bjelke-Petersen, Hans Christian (1872–1964)",
				"creators": [
					{
						"firstName": "Chris",
						"lastName": "Cunneen",
						"creatorType": "author"
					},
					{
						"firstName": "E. A.",
						"lastName": "McLeod",
						"creatorType": "author"
					}
				],
				"date": "1979",
				"abstractNote": "Hans Christian Bjelke-Petersen (1872-1964), physical culture teacher, was born on 14 April 1872 in Copenhagen, Denmark, son of Georg Peter Bjelke-Petersen, gardener, later master-builder, and his wife Caroline Vilhelmine, née Hansen. His sister was Marie Caroline Bjelke-Petersen. At first educated by his father at home, acquiring a thorough grounding in gymnastics, swimming and the Bible, he later attended schools at Dresden, Germany, and at Copenhagen, graduating from Copenhagen Teachers' College in 1890. The family then went to London and in October 1891 arrived in Tasmania in the Doric.",
				"bookTitle": "Australian Dictionary of Biography",
				"language": "en",
				"libraryCatalog": "Australian Dictionary of Biography",
				"numberOfVolumes": "18",
				"place": "Canberra",
				"publisher": "National Centre of Biography, Australian National University",
				"url": "https://adb.anu.edu.au/biography/bjelkepetersen-hans-christian-5247/text8839",
				"volume": "7",
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
	}
]
/** END TEST CASES **/
