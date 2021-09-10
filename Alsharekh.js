{
	"translatorID": "70fbaf2f-ba02-426c-8beb-4ddfbbefd14b",
	"label": "Alsharekh",
	"creator": "Abe Jellinek",
	"target": "^https://archive\\.alsharekh\\.org/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-08-04 18:27:28"
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


let apiBase = 'https://archiveapi.alsharekh.org';
let urlRe = /\/Articles\/([^/]+)\/([^/]+)\/([^/?#]+)/;

function detectWeb(doc, url) {
	if (urlRe.test(url)) {
		return "magazineArticle";
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('td > a[href*="/Articles/"]');
	for (let row of rows) {
		// TODO: check and maybe adjust
		let href = row.href;
		// TODO: check and maybe adjust
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
	let item = new Zotero.Item('magazineArticle');
	
	let [, MID, IID, AID] = url.match(urlRe);
	ZU.doGet(`${apiBase}/Search/IssueHInfo?MID=${MID}&IID=${IID}`, function (respText) {
		let issue = JSON.parse(respText);
		ZU.doGet(`${apiBase}/Search/ArticleHInfo?AID=${AID}`, function (respText) {
			let article = JSON.parse(respText);
			
			item.title = article.articleTitle.replace(' : ', ": ");
			item.pages = article.pageNo;
			item.creators.push(ZU.cleanAuthor(article.articleAuthor, 'author'));
			
			item.publicationTitle = issue.magazineArabicName;
			item.place = issue.countryName;
			item.issue = issue.issuenumber || issue.issueName;
			item.date = ZU.strToISO(arabicToEnglishDate(issue.newIssueDate));
			
			item.url = url;
			
			item.attachments.push({
				title: 'Snapshot',
				document: doc
			});
			
			item.complete();
		});
	});
}

// just so we get months on non-Arabic locales
function arabicToEnglishDate(date) {
	return date
		.replace('يناير', 'January')
		.replace('فبراير', 'February')
		.replace('مارس', 'March')
		.replace('أبريل', 'April')
		.replace('إبريل', 'April')
		.replace('مايو', 'May')
		.replace('يونيو', 'June')
		.replace('يونية', 'June')
		.replace('يوليو', 'July')
		.replace('يوليو', 'July')
		.replace('أغسطس', 'August')
		.replace('سبتمبر', 'September')
		.replace('أكتوبر', 'October')
		.replace('نوفمبر', 'November')
		.replace('ديسمبر', 'December');
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://archive.alsharekh.org/Articles/290/20647/469598",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "الخط العربي: فلسفة التأصيل الجمالي والتفريع الفني",
				"creators": [
					{
						"firstName": "بركات محمد",
						"lastName": "مراد",
						"creatorType": "author"
					}
				],
				"date": "2004-04-01",
				"issue": "11",
				"libraryCatalog": "Alsharekh",
				"publicationTitle": "حروف عربية",
				"shortTitle": "الخط العربي",
				"url": "https://archive.alsharekh.org/Articles/290/20647/469598",
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
		"url": "https://archive.alsharekh.org/Articles/312/21129/479105",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "الرحالة والباحثون الروس في تاريخ الجزيرة العربية وآثارها \"دراسة تقويمية\"",
				"creators": [
					{
						"firstName": "عبد الرحمن الطيب",
						"lastName": "الأنصاري",
						"creatorType": "author"
					}
				],
				"date": "2005-01-01",
				"issue": "11",
				"libraryCatalog": "Alsharekh",
				"publicationTitle": "أدوماتو",
				"url": "https://archive.alsharekh.org/Articles/312/21129/479105",
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
		"url": "https://archive.alsharekh.org/Articles/174/16356/368236",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "أسلوب النقض في كتابات الرحالة الأوربيين",
				"creators": [
					{
						"firstName": "حسن",
						"lastName": "غزالة",
						"creatorType": "author"
					}
				],
				"date": "2005-06-01",
				"issue": "20",
				"libraryCatalog": "Alsharekh",
				"publicationTitle": "جذور",
				"url": "https://archive.alsharekh.org/Articles/174/16356/368236",
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
		"url": "https://archive.alsharekh.org/contents/174/19785",
		"items": "multiple"
	}
]
/** END TEST CASES **/
