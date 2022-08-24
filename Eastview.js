{
	"translatorID": "c59896bc-4beb-43ed-8109-a73a13251828",
	"label": "Eastview",
	"creator": "Sebastian Karcher and Abe Jellinek",
	"target": "^https?://dlib\\.eastview\\.com/(search/(advanced|simple)/|browse/(doc|favorites|issue))",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-10-21 04:57:23"
}

/*
	***** BEGIN LICENSE BLOCK *****
	
	Copyright © 2014-2021 Sebastian Karcher and Abe Jellinek
	
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
function detectWeb(doc, url) {
	if (url.includes("/search/simple/articles") || url.includes("/search/advanced/articles") || url.search(/browse\/(favorites|issue)/) != -1) {
		Z.monitorDOMChanges(doc.getElementById("articleSearchContainer"), {
			childList: true
		});
		if (getSearchResults(doc, true)) return "multiple";
	}
	else {
		return "newspaperArticle";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//div[@id="articleSearchContainer"]//a[@class="Link" and contains(@href, "doc?")]');

	for (var i = 0; i < rows.length; i++) {
		var href = rows[i].href;
		var title = ZU.trimInternal(rows[i].textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

var typeMap = {
	"Argumenty i fakty": "magazineArticle",
	"Argumenty nedeli": "magazineArticle",
	"Ekonomika i zhizn'": "magazineArticle",
	Ekspert: "magazineArticle",
	Izvestiia: "newspaperArticle",
	"Kommersant. Daily": "newspaperArticle",
	"Komsomol'skaia pravda": "newspaperArticle",
	"Kul'tura": "magazineArticle",
	"Literaturnaia gazeta": "magazineArticle",
	"Moscow Times, The": "newspaperArticle",
	"Moskovskaia pravda": "newspaperArticle",
	"Moskovskii komsomolets": "newspaperArticle",
	"New Times, The": "magazineArticle",
	"Nezavisimaia gazeta": "newspaperArticle",
	"Novaia gazeta": "newspaperArticle",
	"Novye izvestiia": "newspaperArticle",
	Ogonek: "magazineArticle",
	Pravda: "newspaperArticle",
	President: "magazineArticle",
	"Profil'": "magazineArticle",
	"RBK Daily": "newspaperArticle",
	"Rossiiskaia gazeta": "newspaperArticle",
	"Rossiiskie vesti": "newspaperArticle",
	"Russkii reporter": "magazineArticle",
	"Sankt-Peterburgskie vedomosti": "newspaperArticle",
	Slovo: "magazineArticle",
	"Sovetskaia Rossiia": "newspaperArticle",
	Trud: "newspaperArticle",
	"Vecherniaia Moskva": "newspaperArticle",
	Vedomosti: "newspaperArticle",
	Zavtra: "newspaperArticle"
};

function pdfLink(URL) {
	var id = URL.match(/id=(\d+)/) || URL.match(/\/browse\/doc\/([^/?#]+)/);
	if (id) return "/browse/pdf-download?articleid=" + id[1];
	else return URL;
}

function scrape(doc, url) {
	// Z.debug(url);
	var item = new Zotero.Item("newspaperArticle");
	var publication = ZU.xpathText(doc, '//a[@class="path" and contains(@href, "browse/publication")]');
	item.publicationTitle = publication;
	var voliss = text(doc, 'a.path[href*="browse/issue/"]') || text(doc, 'h3 > a[href*="browse/issue/"]');
	if (voliss) {
		var issue = voliss.match(/No\. (\d+)/);
		if (issue) item.issue = issue[1];
		var volume = voliss.match(/Vol\. (\d+)/);
		if (volume) item.volume = volume[1];
	}
	var database = ZU.xpathText(doc, '//a[@class="Link" and contains(@href, "browse/udb")]');
	if (database) item.libraryCatalog = database.replace(/\(.+\)/, "") + "(Eastview)";
	if (ZU.xpathText(doc, '//table[@class="table table-condensed Table Table-noTopBorder"]//td[contains(text(), "Article")]')) {
		// we have the metadata in a table
		var metatable = ZU.xpath(doc, '//table[tbody/tr/td[contains(text(), "Article")]]');
		var title = ZU.xpathText(metatable, './/td[contains(text(), "Article")]/following-sibling::td');
		var source = ZU.xpathText(metatable, './/td[contains(text(), "Source")]/following-sibling::td');
		if (source) {
			var date = source.match(/(January|February|March|April|May|Juni|July|August|September|October|November|December)\s+(\d{1,2},\s+)?\d{4}/);
			if (date) item.date = ZU.trimInternal(date[0]);
			var pages = source.match(/page\(s\): (\d+(?:-\d+)?)/);
			if (pages) item.page = pages[1];
			if (!item.publicationTitle) {
				publication = source.match(/^(.+?),/);
				if (publication) item.publicationTitle = publication[1];
			}
		}
		if (!item.publicationTitle) {
			item.publicationTitle = ZU.xpathText(metatable, './/td[text()="Title"]/following-sibling::td');
		}
		if (!item.pages) {
			var pagesOnly = ZU.xpathText(metatable, './/td[contains(text(), "Page(s)")]/following-sibling::td');
			item.pages = pagesOnly;
		}
		var author = ZU.xpathText(metatable, './/td[contains(text(), "Author(s)")]/following-sibling::td');
		if (author) {
			// Z.debug(author)
			var authors = author.trim().split(/\s*,\s*/);
			for (var i = 0; i < authors.length; i++) {
				item.creators.push(ZU.cleanAuthor(authors[i], "author"));
			}
		}
		var place = ZU.xpathText(metatable, './/td[contains(text(), "Place of Publication")]/following-sibling::td');
		if (place) item.place = ZU.trimInternal(place);
	}
	else {
		title = text(doc, '.ArticleTitle');
		// the "old" page format. We have very little structure here, doing the best we can.
		var header = text(doc, 'div.table-responsive ul');
		// Z.debug(header);
		date = header.match(/Date:\s*(\d{2}-\d{2}-\d{2,4})/);
		if (date) item.date = date[1];
		if (!item.publicationTitle) {
			// most of the time the publication title is in quotation marks
			publication = header.match(/"(.+?)"/);
			if (publication) item.publicationTitle = publication[1];
			// if all else fails we just take the top of the file
			else {
				item.publicationTitle = header.trim().match(/^.+/);
			}
		}
	}
	// see if we have a match for item type; default to newspaper otherwise.
	var itemType = typeMap[item.publicationTitle];
	if (itemType) item.itemType = itemType;
	// Attach real PDF for PDFs:
	if (doc.querySelectorAll('#pdfjsContainer, #document-viewer-app').length) {
		item.attachments.push({
			url: pdfLink(url),
			title: "Full Text PDF",
			mimeType: "application/pdf"
		});
	}
	else {
		item.attachments.push({
			document: doc,
			title: "Full Text Snapshot",
			mimeType: "text/html"
		});
	}

	if (title && title == title.toUpperCase()) {
		title = ZU.capitalizeTitle(title, true);
	}
	item.title = title;
	// Z.debug(item)
	// sometimes items actually don't have a title: use the publication title instead.
	if (!item.title) item.title = item.publicationTitle;
	item.complete();
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (!items) {
				return;
			}
			var articles = [];
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, scrape);
		});
	}
	else {
		scrape(doc, url);
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://dlib.eastview.com/browse/doc/2945904",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Moscow",
				"creators": [],
				"date": "02-11-98",
				"libraryCatalog": "Russian Central Newspapers (Eastview)",
				"publicationTitle": "Itar-Tass Weekly News",
				"attachments": [
					{
						"title": "Full Text Snapshot",
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
		"url": "https://dlib.eastview.com/browse/doc/39272962",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Занитный ракетный комплекс С-300Ф \"Форт\"",
				"creators": [
					{
						"firstName": "Ростислав",
						"lastName": "Ангельский",
						"creatorType": "author"
					},
					{
						"firstName": "Владимир",
						"lastName": "Коровин",
						"creatorType": "author"
					}
				],
				"date": "March 2014",
				"libraryCatalog": "Russian Military and Security Periodicals (Eastview)",
				"place": "Moskva, Russia",
				"publicationTitle": "Tekhnika i vooruzhenie",
				"attachments": [
					{
						"title": "Full Text Snapshot",
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
		"url": "https://dlib.eastview.com/browse/doc/42109039",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Page 13",
				"creators": [],
				"date": "March 20, 2014",
				"libraryCatalog": "Standalone Serials (Eastview)",
				"place": "Минск, Беларусь",
				"publicationTitle": "Народная газета",
				"attachments": [
					{
						"title": "Full Text Snapshot",
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
		"url": "https://dlib.eastview.com/browse/doc/70313490",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Динамика Взаимосвязи Уровня Тревожности И Адаптационных Способностей Студентов К Обучению В Вузе",
				"creators": [
					{
						"firstName": "Т. В.",
						"lastName": "Ледовская",
						"creatorType": "author"
					},
					{
						"firstName": "А. В.",
						"lastName": "Афанасов",
						"creatorType": "author"
					}
				],
				"libraryCatalog": "Russian Social Sciences and Humanities Periodicals (Eastview)",
				"pages": "28-32",
				"publicationTitle": "Alma Mater",
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
	}
]
/** END TEST CASES **/
