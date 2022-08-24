{
	"translatorID": "374ac2a5-dd45-461e-bf1f-bf90c2eb7085",
	"label": "Tagesspiegel",
	"creator": "Martin Meyerhoff, Sebastian Karcher, Jaco Lüken",
	"target": "^https?://www\\.tagesspiegel\\.de",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-08-18 12:46:30"
}

/*
Tagesspiegel Translator
Copyright (C) 2011 Martin Meyerhoff

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program. If not, see <http://www.gnu.org/licenses/>.
*/


function detectWeb(doc, url) {
	if (ZU.xpathText(doc, "//meta[@property='og:type']/@content") == "article") {
		return "newspaperArticle";
	}
	else if (url.includes('/suchergebnis/')) {
		return "multiple";
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}


function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//h2/a[span[contains(@class, "hcf-headline")]]');
	for (var i = 0; i < rows.length; i++) {
		var href = rows[i].href;
		var title = ZU.xpathText(rows[i], './span[contains(@class, "hcf-headline")]');
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


function scrape(doc, url) {
	var newItem = new Zotero.Item("newspaperArticle");

	newItem.title = ZU.xpathText(doc, "//meta[@property='og:title']/@content");
	newItem.date = ZU.xpathText(doc, "//time[@itemprop='datePublished']/@datetime");
	newItem.abstractNote = ZU.xpathText(doc, '//meta[@name="description"]/@content');
	// Note: it only grabs the top-level section
	newItem.section = ZU.xpathText(doc, '//ul[contains(@class, "ts-main-nav-items")]/li[contains(@class, "ts-active")]/a');

	// Authors
	var author = ZU.xpathText(doc, "//header[contains(@class, 'ts-article-header')]//a[@rel='author']");
	// Zotero.debug(author);
	if (author) {
		author = author.replace(/^[Vv]on\s|Kommentar\svon\s/g, '');
		author = author.split(/,\s|\sund\s/);
		for (var i = 0; i < author.length; i++) {
			newItem.creators.push(ZU.cleanAuthor(author[i], "author"));
		}
	}
	
	newItem.url = ZU.xpathText(doc, '//link[@rel="canonical"]/@href') || url;
	newItem.attachments.push({
		url: newItem.url,
		title: "Snapshot",
		mimeType: "text/html"
	});
	
	// Tags
	/* We read the tags from the initialisation of variable cmsObject.
	 * This object and the keywords are defined in a head script tag.
	 */
	let tags = [];
	let scriptItems = doc.querySelectorAll('head > script');
	if (scriptItems) {
		for (let i = 0; i < scriptItems.length; i++) {
			let scriptItemText = scriptItems[i].textContent;
			// search for script tag that declares the variable
			if (!scriptItemText.match(/var\s+cmsObject\s*=/)) {
				continue;
			}
			// the pid seems to be added at the end of the keywords, so we remove it
			let matches = scriptItemText.match(/keywords:\s*"(.+?)(,pid\d+)?",/);
			if (!matches) {
				continue;
			}
			tags = matches[1].split(',');
			break;
		}
	}
	for (let tag of tags) {
		if (tag.match(/^\s*_/)) {
			continue;
		}
		newItem.tags.push(tag.replace(/_/g, ' ').trim());
	}
	newItem.publicationTitle = "Der Tagesspiegel Online";
	newItem.language = "de-DE";
	newItem.ISSN = "1865-2263";
	newItem.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.tagesspiegel.de/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.tagesspiegel.de/meinung/ddr-drama-der-turm-ich-leb-mein-leben/7216226.html",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Ich leb’ mein Leben",
				"creators": [
					{
						"firstName": "Robert",
						"lastName": "Ide",
						"creatorType": "author"
					}
				],
				"date": "2012-10-05T00:00:00+02:00",
				"ISSN": "1865-2263",
				"language": "de-DE",
				"libraryCatalog": "Tagesspiegel",
				"publicationTitle": "Der Tagesspiegel Online",
				"url": "https://www.tagesspiegel.de/meinung/ddr-drama-der-turm-ich-leb-mein-leben/7216226.html",
				"abstractNote": "Das DDR-Familiendrama \"Der Turm\" hat zwei Abende lang Deutschlands Fernsehzuschauer bewegt, die Gedanken flogen zurück in die gemeinsam geteilte Vergangenheit. 17 Millionen Menschen sind irgendwann einmal mit der Frage konfrontiert worden: Dafür oder dagegen? Verrat an Freunden oder der eigenen Karriere?",
				"section": "Meinung",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					"ARD",
					"DDR",
					"Der Turm"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.tagesspiegel.de/berlin/queerspiegel/bundestagsabstimmung-ohne-fraktionszwang-ehe-fuer-alle-noch-diese-woche/19984104.html",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Ehe für alle – noch diese Woche",
				"creators": [
					{
						"firstName": "Andrea",
						"lastName": "Dernbach",
						"creatorType": "author"
					},
					{
						"firstName": "Maria",
						"lastName": "Fiedler",
						"creatorType": "author"
					},
					{
						"firstName": "Carsten",
						"lastName": "Werner",
						"creatorType": "author"
					}
				],
				"date": "2017-06-27T18:20:46+02:00",
				"ISSN": "1865-2263",
				"language": "de-DE",
				"libraryCatalog": "Tagesspiegel",
				"publicationTitle": "Der Tagesspiegel Online",
				"url": "https://www.tagesspiegel.de/gesellschaft/queerspiegel/bundestagsabstimmung-ohne-fraktionszwang-ehe-fuer-alle-noch-diese-woche/19984104.html",
				"abstractNote": "Erst gestern hat Angela Merkel ihre Position zur \"Ehe für alle\" geändert - nun soll der Bundestag wohl schon am Freitag darüber abstimmen.",
				"section": "Gesellschaft",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					"Angela Merkel",
					"Bundestagswahl 2017",
					"CDU",
					"CSU",
					"Ehe fuer alle",
					"Grosse Boehmer",
					"Queerspiegel",
					"Renate Kuenast",
					"SPD"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.tagesspiegel.de/suchergebnis/?sw=plagiarismus&search-ressort=all&search-period=empty&search-fromday=1&search-frommonth=1&search-fromyear=1996&search-today=27&search-tomonth=6&search-toyear=2017&submit-search=anzeigen",
		"items": "multiple"
	}
]
/** END TEST CASES **/
