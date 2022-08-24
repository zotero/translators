{
	"translatorID": "06c372dc-f7e1-454d-b704-401efc78e6eb",
	"label": "Citizen Lab",
	"creator": "Abe Jellinek",
	"target": "^https?://citizenlab\\.ca/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-09-14 01:28:37"
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


function detectWeb(doc, _url) {
	// every page claims to be an article, so we have to do something a little
	// more specific
	if (doc.querySelector('[itemprop="headline"]')) {
		return "report";
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('article h1 > a');
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
	var translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	
	translator.setHandler('itemDone', function (obj, item) {
		item.title = item.title.replace(/\s*- The Citizen Lab\s*$/, '');
		
		item.creators = [];
		for (let author of doc.querySelectorAll('header [rel="author"]')) {
			item.creators.push(ZU.cleanAuthor(author.textContent, 'author'));
		}
		
		let pdfURL = attr(doc, '#other_version_of_post a', 'href');
		if (pdfURL) {
			item.attachments.push({
				title: 'Full Text PDF',
				mimeType: 'application/pdf',
				url: pdfURL
			});
		}
		
		delete item.language; // inaccurate for non-English reports
		
		// let's try to match their recommended citations for official publications
		// from https://citizenlab.ca/publications/
		item.libraryCatalog = '';
		item.institution = 'Citizen Lab, University of Toronto';
		
		ZU.processDocuments('/publications/', function (pubsDoc) {
			let pointer = pubsDoc.querySelector(`a[href="${item.url}"]`);
			if (pointer) {
				let cite = pointer.parentNode.textContent;
				let reportNumber = cite.match(/Citizen Lab Research Report No\. [^,]+/);
				if (reportNumber) {
					item.reportNumber = reportNumber[0];
					item.institution = 'University of Toronto';
				}
			}
			
			item.complete();
		});
	});

	translator.getTranslatorObject(function (trans) {
		trans.itemType = "report";
		trans.doWeb(doc, url);
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://citizenlab.ca/2021/09/forcedentry-nso-group-imessage-zero-click-exploit-captured-in-the-wild/",
		"items": [
			{
				"itemType": "report",
				"title": "FORCEDENTRY: NSO Group iMessage Zero-Click Exploit Captured in the Wild",
				"creators": [
					{
						"firstName": "Bill",
						"lastName": "Marczak",
						"creatorType": "author"
					},
					{
						"firstName": "John",
						"lastName": "Scott-Railton",
						"creatorType": "author"
					},
					{
						"firstName": "Bahr Abdul",
						"lastName": "Razzak",
						"creatorType": "author"
					},
					{
						"firstName": "Noura",
						"lastName": "Al-Jizawi",
						"creatorType": "author"
					},
					{
						"firstName": "Siena",
						"lastName": "Anstis",
						"creatorType": "author"
					},
					{
						"firstName": "Kristin",
						"lastName": "Berdan",
						"creatorType": "author"
					},
					{
						"firstName": "Ron",
						"lastName": "Deibert",
						"creatorType": "author"
					}
				],
				"date": "2021-09-13T19:26:12+00:00",
				"abstractNote": "While analyzing the phone of a Saudi activist infected with NSO Group’s Pegasus spyware, we discovered a zero-day zero-click exploit against iMessage. The exploit, which we call FORCEDENTRY, targets Apple’s image rendering library, and was effective against Apple iOS, MacOS and WatchOS devices.",
				"institution": "Citizen Lab, University of Toronto",
				"shortTitle": "FORCEDENTRY",
				"url": "https://citizenlab.ca/2021/09/forcedentry-nso-group-imessage-zero-click-exploit-captured-in-the-wild/",
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
		"url": "https://citizenlab.ca/2021/04/canadas-proposed-privacy-law-reforms-are-not-enough-improving-organizational-transparency-and-accountability-bill-c11/",
		"items": [
			{
				"itemType": "report",
				"title": "Canada’s Proposed Privacy Law Reforms Are Not Enough: A Path to Improving Organizational Transparency and Accountability",
				"creators": [
					{
						"firstName": "Christopher",
						"lastName": "Parsons",
						"creatorType": "author"
					}
				],
				"date": "2021-04-23T13:00:52+00:00",
				"abstractNote": "Given our experiences, we have specific recommendations for how any federal commercial privacy legislation must be amended to better protect individuals from the predations and power of private organizations. In making our recommendations we have chosen to focus almost exclusively on the Openness and Transparency, Access to and Amendment of Personal Information, and Whistleblower sections of Bill C-11.",
				"institution": "University of Toronto",
				"reportNumber": "Citizen Lab Research Report No. 138",
				"shortTitle": "Canada’s Proposed Privacy Law Reforms Are Not Enough",
				"url": "https://citizenlab.ca/2021/04/canadas-proposed-privacy-law-reforms-are-not-enough-improving-organizational-transparency-and-accountability-bill-c11/",
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
		"url": "https://citizenlab.ca/2021/03/tiktok-vs-douyin-security-privacy-analysis/",
		"items": [
			{
				"itemType": "report",
				"title": "TikTok vs Douyin: A Security and Privacy Analysis",
				"creators": [
					{
						"firstName": "Pellaeon",
						"lastName": "Lin",
						"creatorType": "author"
					}
				],
				"date": "2021-03-22T13:00:16+00:00",
				"abstractNote": "A comparative analysis of security, privacy, and censorship issues in TikTok and Douyin, both developed by ByteDance.",
				"institution": "University of Toronto",
				"reportNumber": "Citizen Lab Research Report No. 137",
				"shortTitle": "TikTok vs Douyin",
				"url": "https://citizenlab.ca/2021/03/tiktok-vs-douyin-security-privacy-analysis/",
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
		"url": "https://citizenlab.ca/2021/08/%d9%85%d9%86-%d8%a7%d9%84%d9%84%d8%a4%d9%84%d8%a4%d8%a9-%d8%a5%d9%84%d9%89-%d8%a8%d9%8a%d8%ba%d8%a7%d8%b3%d9%88%d8%b3-%d8%a7%d9%84%d8%ad%d9%83%d9%88%d9%85%d8%a9-%d8%a7%d9%84%d8%a8%d8%ad%d8%b1%d9%8a/",
		"items": [
			{
				"itemType": "report",
				"title": "من اللؤلؤة إلى بيغاسوس: الحكومة البحرينية تخترق نشطاء عبر استغلال ثغرة \"Zero-Click\" من \"NSO Group\"",
				"creators": [],
				"date": "2021-08-24T10:01:46+00:00",
				"abstractNote": "لقد حددنا تسعة نشطاء بحرينيين تم اختراق أجهزتهم الآيفون باستخدام برنامج تجسس \"Pegasus\" من NSO Group في الفترة ما بين يونيو 2020 و فبراير 2021. بعض النشطاء قد تم اختراقهم باستغلال ثغرتين zero-click في iMessage, كنا قد سمينا الثغرتين التي تم اكتشافها في 2020 ب KISMET، أما الثغرة المستخدمة في 2021 فنسميها FORCEDENTRY",
				"institution": "Citizen Lab, University of Toronto",
				"shortTitle": "من اللؤلؤة إلى بيغاسوس",
				"url": "https://citizenlab.ca/2021/08/من-اللؤلؤة-إلى-بيغاسوس-الحكومة-البحري/",
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
		"url": "https://citizenlab.ca/2019/05/burned-after-reading-endless-mayflys-ephemeral-disinformation-campaign/",
		"items": [
			{
				"itemType": "report",
				"title": "Burned After Reading: Endless Mayfly’s Ephemeral Disinformation Campaign",
				"creators": [
					{
						"firstName": "Gabrielle",
						"lastName": "Lim",
						"creatorType": "author"
					},
					{
						"firstName": "Etienne",
						"lastName": "Maynier",
						"creatorType": "author"
					},
					{
						"firstName": "John",
						"lastName": "Scott-Railton",
						"creatorType": "author"
					},
					{
						"firstName": "Alberto",
						"lastName": "Fittarelli",
						"creatorType": "author"
					},
					{
						"firstName": "Ned",
						"lastName": "Moran",
						"creatorType": "author"
					},
					{
						"firstName": "Ron",
						"lastName": "Deibert",
						"creatorType": "author"
					}
				],
				"date": "2019-05-14T04:01:02+00:00",
				"abstractNote": "Using Endless Mayfly as an illustration, this highlights the challenges of investigating & addressing disinformation from research & policy perspectives.",
				"institution": "University of Toronto",
				"reportNumber": "Citizen Lab Research Report No. 118",
				"shortTitle": "Burned After Reading",
				"url": "https://citizenlab.ca/2019/05/burned-after-reading-endless-mayflys-ephemeral-disinformation-campaign/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					},
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
		"url": "https://citizenlab.ca/?s=mayfly",
		"items": "multiple"
	}
]
/** END TEST CASES **/
