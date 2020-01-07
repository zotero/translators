{
	"translatorID": "a30274ac-d3d1-4977-80f4-5320613226ec",
	"label": "IMDb",
	"creator": "Philipp Zumstien",
	"target": "^https?://www\\.imdb\\.com/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2020-01-07 00:38:50"
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


function detectWeb(doc, url) {
	if (url.indexOf('/title/tt')>-1) {
		return "film";
	} else if (url.indexOf('/find?')>-1 && getSearchResults(doc, true)) {
		return "multiple";
	}
}


function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//td[contains(@class, "result_text")]');
	for (var i=0; i<rows.length; i++) {
		var href = ZU.xpathText(rows[i], './a/@href');
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

function scrape(doc, _url) {
	var item = new Zotero.Item("film");
	let json = JSON.parse(text(doc, 'script[type="application/ld+json"]'));
	item.title = json.name;// note that json only has the original title
	var transTitle = ZU.trimInternal(ZU.xpathText(doc, "//div[@class='title_wrapper']/h1/text()")).slice(0, -2);
	if (transTitle && transTitle !== item.title) addExtra(item, "Translated title: " + transTitle);
	item.date = json.datePublished;
	item.runningTime = "duration" in json ? json.duration.replace("PT", "").toLowerCase() : "";
	item.genre = Array.isArray(json.genre) ? json.genre.join(", ") : json.genre;
	item.abstractNote = json.description;
	var creatorsMapping = {
		director: "director",
		creator: "scriptwriter",
		actor: "contributor"
	};
	for (var role in creatorsMapping) {
		if (!json[role]) continue;
		var creators = json[role];
		if (!Array.isArray(creators)) {
			item.creators.push(ZU.cleanAuthor(creators.name, creatorsMapping[role]));
		}
		else {
			for (var i = 0; i < creators.length; i++) {
				if (creators[i]["@type"] == "Person") item.creators.push(ZU.cleanAuthor(creators[i].name, creatorsMapping[role]));
			}
		}
	}
	let companyNodes = doc.querySelectorAll('a[href*="/company/"]');
	let companies = [];
	for (let company of companyNodes) {
		companies.push(company.textContent);
	}
	item.distributor = companies.join(', ');
	var pageId = ZU.xpathText(doc, '//meta[@property="pageId"]/@content');
	if (pageId) {
		addExtra(item, "IMDb ID: " + pageId);
	}
	addExtra(item, "event-location: " + text(doc, 'a[href*="title?country_of_origin"]'));
	item.tags = "keywords" in json ? json.keywords.split(",") : [];
	item.complete();
}


function addExtra(item, value) {
	if (!item.extra) {
		item.extra = '';
	} else {
		item.extra += "\n";
	}
	item.extra += value;
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.imdb.com/title/tt0089276/",
		"items": [
			{
				"itemType": "film",
				"title": "The Official Story",
				"creators": [
					{
						"firstName": "Luis",
						"lastName": "Puenzo",
						"creatorType": "director"
					},
					{
						"firstName": "Aída",
						"lastName": "Bortnik",
						"creatorType": "scriptwriter"
					},
					{
						"firstName": "Luis",
						"lastName": "Puenzo",
						"creatorType": "scriptwriter"
					},
					{
						"firstName": "Norma",
						"lastName": "Aleandro",
						"creatorType": "contributor"
					},
					{
						"firstName": "Héctor",
						"lastName": "Alterio",
						"creatorType": "contributor"
					},
					{
						"firstName": "Chunchuna",
						"lastName": "Villafañe",
						"creatorType": "contributor"
					}
				],
				"date": "1985-11-08",
				"abstractNote": "Directed by Luis Puenzo.  With Norma Aleandro, Héctor Alterio, Chunchuna Villafañe, Hugo Arana. After the end of the Dirty War, a high school teacher sets out to find out who the mother of her adopted daughter is.",
				"extra": "original-title: La historia oficial\nIMDb ID: tt0089276",
				"genre": "Drama, History, War",
				"libraryCatalog": "www.imdb.com",
				"runningTime": "1h 52min",
				"url": "http://www.imdb.com/title/tt0089276/",
				"attachments": [
					{
						"title": "Snapshot"
					}
				],
				"tags": [
					" adopted daughter",
					" high school teacher",
					" lawyer",
					" professor",
					" school"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.imdb.com/find?q=shakespeare&s=tt",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.imdb.com/title/tt0060613/",
		"items": [
			{
				"itemType": "film",
				"title": "Skin, Skin",
				"creators": [
					{
						"firstName": "Mikko",
						"lastName": "Niskanen",
						"creatorType": "director"
					},
					{
						"firstName": "Robert",
						"lastName": "Alfthan",
						"creatorType": "scriptwriter"
					},
					{
						"firstName": "Marja-Leena",
						"lastName": "Mikkola",
						"creatorType": "scriptwriter"
					},
					{
						"firstName": "Eero",
						"lastName": "Melasniemi",
						"creatorType": "contributor"
					},
					{
						"firstName": "Kristiina",
						"lastName": "Halkola",
						"creatorType": "contributor"
					},
					{
						"firstName": "Pekka",
						"lastName": "Autiovuori",
						"creatorType": "contributor"
					}
				],
				"date": "1967-08-18",
				"abstractNote": "Directed by Mikko Niskanen.  With Eero Melasniemi, Kristiina Halkola, Pekka Autiovuori, Kirsti Wallasvaara. Depiction of four urban youths and their excursion to the countryside.",
				"extra": "original-title: Käpy selän alla\nIMDb ID: tt0060613",
				"genre": "Drama",
				"libraryCatalog": "www.imdb.com",
				"runningTime": "1h 29min",
				"url": "http://www.imdb.com/title/tt0060613/",
				"attachments": [
					{
						"title": "Snapshot"
					}
				],
				"tags": [
					" countryside",
					" dance",
					" drunk",
					" topless",
					" youth"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/