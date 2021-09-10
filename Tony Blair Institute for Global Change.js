{
	"translatorID": "0b79daa9-96c3-4c75-9e5b-359d02e8f07d",
	"label": "Tony Blair Institute for Global Change",
	"creator": "Abe Jellinek",
	"target": "^https://institute\\.global/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-08-02 22:24:49"
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


const excludeRe = /\b(commentary|statement)\b/i;

function detectWeb(doc, _url) {
	if (doc.querySelector('.tbi-article')
		&& !excludeRe.test(attr(doc, 'meta[name="keywords"]', 'content'))) {
		// the site calls some articles "reports" and some "papers," but in
		// Zotero terms they're really all reports (freestanding short-form works)
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
	var rows = doc.querySelectorAll('.search-result');
	for (let row of rows) {
		if (excludeRe.test(text(row, '.type-date'))) continue;
		let href = attr(row, 'a', 'href');
		let title = ZU.trimInternal(text(row, 'a'));
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
		item.abstractNote = text(doc, '.text-block p');
		// this won't stick around...
		item.date = ZU.strToISO(text('.tbi-article__hero-text__meta-type__date span'));
		item.institution = 'Tony Blair Institute for Global Change';
		
		item.creators = [];
		for (let author of doc.querySelectorAll('.article-info h6')) {
			let name = ZU.trimInternal(author.textContent);
			item.creators.push(ZU.cleanAuthor(name, 'author'));
		}
		
		item.attachments = [];
		item.attachments.push({
			title: 'Full Text PDF',
			mimeType: 'application/pdf',
			url: attr(doc, 'a[href$=".pdf"]', 'href')
		});
		
		item.tags = [];
		item.complete();
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
		"url": "https://institute.global/policy/violent-extremism-sub-saharan-africa-lessons-rise-boko-haram",
		"items": [
			{
				"itemType": "report",
				"title": "Violent Extremism in Sub-Saharan Africa: Lessons From the Rise of Boko Haram",
				"creators": [
					{
						"firstName": "Audu Bulama",
						"lastName": "Bukarti",
						"creatorType": "author"
					}
				],
				"date": "2021-07-23",
				"abstractNote": "On 26 July 2009, Boko Haram launched its first series of attacks on several police stations across northern Nigeria, culminating in a four-day standoff with security forces that ended with the death of hundreds of its members including founder and first leader, Muhammed Yusuf. As surviving members went underground to plan a deadly insurgency, Nigerian authorities expressed confidence that the group had been defeated. The following summer, Boko Haram returned under new leadership with an official name and a fresh mode of operation that would prove to be far more sophisticated and lethal than the original.",
				"institution": "Tony Blair Institute for Global Change",
				"language": "en",
				"libraryCatalog": "institute.global",
				"shortTitle": "Violent Extremism in Sub-Saharan Africa",
				"url": "https://institute.global/policy/violent-extremism-sub-saharan-africa-lessons-rise-boko-haram",
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
		"url": "https://institute.global/policy/mind-gap-success-cop26",
		"items": [
			{
				"itemType": "report",
				"title": "Mind the Gap: Success at COP26",
				"creators": [
					{
						"firstName": "Phil",
						"lastName": "McNally",
						"creatorType": "author"
					},
					{
						"firstName": "Tim",
						"lastName": "Lord",
						"creatorType": "author"
					}
				],
				"date": "2021-07-29",
				"abstractNote": "COP26, to be held this November in Glasgow, is the most important meeting on climate since the Paris Agreement of 2015. Indeed, some – including Alok Sharma, the man charged with delivering a successful summit outcome – argue that it is the world’s last chance to keep climate change in check.1 https://www.gov.uk/government/news/cop26-president-designate-alok-sharma-pick-the-planet And while that may be too stark an assessment, there is no doubt that success at COP26 will put the world in a much better position to tackle the increasingly urgent threat of climate change. Failure, on the other hand, could be a disastrous setback, from both a global and UK perspective.",
				"institution": "Tony Blair Institute for Global Change",
				"language": "en",
				"libraryCatalog": "institute.global",
				"shortTitle": "Mind the Gap",
				"url": "https://institute.global/policy/mind-gap-success-cop26",
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
		"url": "https://institute.global/search?term=iraq+weapons+of+mass+destruction&section=All",
		"items": "multiple"
	}
]
/** END TEST CASES **/
