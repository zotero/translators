{
	"translatorID": "ec0628ad-e508-444e-9e4c-e1819766a1ae",
	"label": "ATS International Journal",
	"creator": "Philipp Zumstein",
	"target": "^https?://(www\\.)?atsinternationaljournal\\.com/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2019-09-08 15:38:13"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2019 Philipp Zumstein
	
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
// eslint-disable-next-line
function attr(docOrElem,selector,attr,index){var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);return elem?elem.getAttribute(attr):null;}function text(docOrElem,selector,index){var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);return elem?elem.textContent:null;}


function detectWeb(doc, url) {
	// TODO: can wo do this better?
	if (url.split('/').length == 7) {
		return "journalArticle";
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.article-title a, .search-results a, .category li a');
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
	var item = new Zotero.Item('journalArticle');
	item.title = text(doc, 'h1.article-title');
	item.issue = text(doc, 'h1.page-title');
	if (item.issue) {
		item.date = ZU.strToISO(item.issue);
	}
	var authors = text(doc, 'section.article-content em');
	if (authors) {
		item.creators = authors.split(',').map(name => ZU.cleanAuthor(name, "author"));
	}
	var tags = doc.querySelectorAll('.tags *[itemprop=keywords]');
	item.tags = [];
	for (let tag of tags) {
		item.tags.push(tag.textContent.trim());
	}
	item.pages = ZU.xpathText(doc, '//section[contains(@class, "article-content")]//strong[contains(., "Pages")]/following-sibling::text()[1]');
	item.abstractNote = ZU.xpathText(doc, '//section[contains(@class, "article-content")]//strong[contains(., "Abstract")]/following-sibling::text()[1]');
	var keywords = ZU.xpathText(doc, '//section[contains(@class, "article-content")]//strong[contains(., "Keywords")]/following-sibling::text()[1]');
	// TODO anything else we should do with these keywords?
	if (keywords && item.tags.length === 0) {
		item.tags = keywords.split(';');
	}
	
	item.url = url;
	item.ISSN = '1824-5463';
	item.publicationTitle = 'Advances in Transportation Studies';
	item.journalAbbreviation = 'ATS';
	item.extra = 'pusblisher:Aracne Editrice\nplace:Roma';
	item.complete();
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.atsinternationaljournal.com/index.php/2019-issues/xlviii-july-2019/1056-do-drivers-have-a-good-understanding-of-distraction-by-wrap-advertisements-investigating-the-impact-of-wrap-advertisement-on-distraction-related-driver-s-accidents",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Do drivers have a good understanding of distraction by wrap advertisements? Investigating the impact of wrap advertisement on distraction-related driver’s accidents",
				"creators": [
					{
						"firstName": "A. R.",
						"lastName": "Mahpour",
						"creatorType": "author"
					},
					{
						"firstName": "A. Mohammadian",
						"lastName": "Amiri",
						"creatorType": "author"
					},
					{
						"firstName": "E. Shah",
						"lastName": "Ebrahimi",
						"creatorType": "author"
					}
				],
				"date": "2019-07",
				"ISSN": "1824-5463",
				"abstractNote": "Drivers encounter a variety of outdoor advertising including fixed and wrap advertisement and large amounts of information and data in different locations, which can sometimes confuse the audience due to congestion, accumulation, and non-compliance with the standards and diversity of concepts. Fully understanding how small distractions can influence the ability to drive could prevent a serious accident. Despite the enormous amount of effort has been devoted to evaluating the impact of fix advertising on traffic safety, the importance of investing wrap advertisements seems to be disregarded. Therefore, the present study seeks firstly to compare the importance of distraction caused by wrap advertisement with other parameters affecting drivers’ awareness, then to find out which aspects of wrap advertisement may distract drivers while driving. To address this objective, at first, a questionnaire-based accidents database was prepared regarding those occurred because of distraction, and then the weight of distraction caused by wrap advertisement was identified using AHP. Subsequently, accidents that occurred because of this specific issue were modeled using the discrete choice technique. The results showed that in contrast with the prevailing opinion of drivers, the probability of distraction while driving caused by wrap advertisement is relatively high which can be considered as an alarming issue. Moreover, according to the results of discrete choice modeling, drivers with different characteristics, such as age or gender can be affected by wrap advertisement in different ways.",
				"extra": "pusblisher:Aracne Editrice\nplace:Roma",
				"issue": "XLVIII - July 2019",
				"journalAbbreviation": "ATS",
				"libraryCatalog": "ATS International Journal",
				"pages": "19-30",
				"publicationTitle": "Advances in Transportation Studies",
				"shortTitle": "Do drivers have a good understanding of distraction by wrap advertisements?",
				"url": "http://www.atsinternationaljournal.com/index.php/2019-issues/xlviii-july-2019/1056-do-drivers-have-a-good-understanding-of-distraction-by-wrap-advertisements-investigating-the-impact-of-wrap-advertisement-on-distraction-related-driver-s-accidents",
				"attachments": [],
				"tags": [
					{
						"tag": "Analysis"
					},
					{
						"tag": "Crashes"
					},
					{
						"tag": "Driver"
					},
					{
						"tag": "Driver Behaviour"
					},
					{
						"tag": "Models"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.atsinternationaljournal.com/index.php/2004-issues/special-issue-2004",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.atsinternationaljournal.com/index.php/paper-search?q=reference+management",
		"items": "multiple"
	}
]
/** END TEST CASES **/
