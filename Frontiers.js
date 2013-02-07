{
	"translatorID": "cb9e794e-7a65-47cd-90f6-58cdd191e8b0",
	"label": "Frontiers",
	"creator": "Jason Friedman and Simon Kornblith",
	"target": "^https?://www\\.frontiersin\\.org.*/",
	"minVersion": "2.1.10",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsib",
	"lastUpdated": "2013-02-07 00:06:31"
}

/*
   Frontiers translator 
   Copyright (C) 2009-2011 Jason Friedman, write.to.jason@gmail.com
						   Simon Kornblith, simon@simonster.com

   This program is free software: you can redistribute it and/or modify
   it under the terms of the GNU Affero General Public License as published by
   the Free Software Foundation, either version 3 of the License, or
   (at your option) any later version.

   This program is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU Affero General Public License for more details.

   You should have received a copy of the Affero GNU General Public License
   along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

function detectWeb(doc, url) {

	if (url.indexOf("abstract") != -1) {
		return "journalArticle";
	} else if (url.indexOf("full") != -1) {
		return "journalArticle";
	} else if (!ZU.isEmpty(getItems(doc, url))) {
		return "multiple";
	}
}

function getItems(doc, url) {
	var items = {};
	var links = doc.evaluate('//*[@class="AS55"]/a[contains(@title, " ")]', doc, null, XPathResult.ANY_TYPE, null);
	while (link = links.iterateNext()) {
		if (link.href.indexOf("/abstract") === -1) continue;
		items[link.href] = link.textContent;
	}
	return items;
}

function doWeb(doc, url) {
	var articles = new Array();

	// individual article
	if (detectWeb(doc, url) === "journalArticle") {
		scrape(doc, url);
		// search results / other page
	} else {
		var items = getItems(doc, url);
		Zotero.selectItems(items, function (items) {
			if (!items) {
				return true;
			}
			for (var i in items) {
				articles.push(i);
			}
			Zotero.Utilities.processDocuments(articles, scrape, function () {
				Zotero.done();
			});
			Zotero.wait();
		});
	}
}

function scrape(doc, url) {
	var newItem = new Zotero.Item("journalArticle");

	// save the url
	newItem.url = doc.location.href;

	//title
	var title1 = doc.evaluate('//div[@class="JournalAbstract"]/h1', doc, null, XPathResult.ANY_TYPE, null).iterateNext();

	if (title1 == null) title1 = doc.evaluate('//div[@class="JournalAbstract"]/div/h1', doc, null, XPathResult.ANY_TYPE, null).iterateNext();

	newItem.title = Zotero.Utilities.trim(title1.textContent);

	// journal name
	var docTitle = doc.evaluate('//head/title', doc, null, XPathResult.ANY_TYPE, null).iterateNext().textContent;
	newItem.publicationTitle = Zotero.Utilities.trimInternal(docTitle.split('|')[2]);

	//authors - can be in two ways, depending on which page
	var authors = doc.evaluate('//div[@class="authors"]/a', doc, null, XPathResult.ANY_TYPE, null);
	while (author = authors.iterateNext()) {
		newItem.creators.push(Zotero.Utilities.cleanAuthor(Zotero.Utilities.trimInternal(author.textContent), "author"));
	}

	authors = doc.evaluate('//div[@class="paperauthor"]/a', doc, null, XPathResult.ANY_TYPE, null);

	while (author = authors.iterateNext()) {
		newItem.creators.push(Zotero.Utilities.cleanAuthor(Zotero.Utilities.trimInternal(author.textContent), "author"));
	}

	// abstract
	var abstract1;
	abstract1 = doc.evaluate('//div[@class="JournalAbstract"]/p', doc, null, XPathResult.ANY_TYPE, null).iterateNext();

	if (abstract1 == null) abstract1 = doc.evaluate('//div[@class="JournalAbstract"]/div[@class="abstracttext"]', doc, null, XPathResult.ANY_TYPE, null).iterateNext();

	if (!(abstract1 == null)) newItem.abstractNote = Zotero.Utilities.trim(abstract1.textContent);

	// Get volume, DOI, pages and year from the citation. It can appear in various places
	var citation1 = doc.evaluate('//div[@class="AbstractSummary"]/p[2]', doc, null, XPathResult.ANY_TYPE, null).iterateNext(2);
	if (citation1 != null) {
		if (!citation1.textContent.match(/Citation:/)) citation1 = null;
	}

	if (citation1 == null) {
		citation1 = doc.evaluate('//div[@class="AbstractSummary"]/p[1]', doc, null, XPathResult.ANY_TYPE, null).iterateNext();
		if (citation1 != null) {
			if (!citation1.textContent.match(/Citation:/)) citation1 = null;
		}
	}

	if (citation1 == null) {
		citation1 = doc.evaluate('//div[@class="metacontainer"]/div[@class="metavalue"][2]', doc, null, XPathResult.ANY_TYPE, null).iterateNext(2);
		if (citation1 != null) {
			if (!doc.evaluate('//div[@class="metacontainer"]/div[@class="metakey"][2]', doc, null, XPathResult.ANY_TYPE, null).iterateNext(2).textContent.match(/Citation:/)) citation1 = null;
		}
	}

	if (citation1 == null) citation1 = doc.evaluate('//div[@class="AbstractSummary"]/p', doc, null, XPathResult.ANY_TYPE, null).iterateNext(2);

	if (citation1.textContent.match(/Received/)) citation1 = doc.evaluate('//div[@class="metacontainer"]/div[@class="metavalue"]', doc, null, XPathResult.ANY_TYPE, null).iterateNext();

	var citation = citation1.textContent;

	if (!(citation == null)) {
		// DOI
		var doipart = citation.split('doi:')[1];
		if (doipart != null) newItem.DOI = Zotero.Utilities.trim(doipart);
		var citation2 = citation.match(/:([0-9]*)\./);
		// If it has been recently released, there may be no page number
		if (citation2 != null) newItem.pages = citation2[1];
		var citation3 = citation.match(/\((20[0-9][0-9])\)/);
		if (citation3 != null) newItem.date = citation3[1];
	}

	// Look for keywords
	var keywords1 = doc.evaluate('//div[@class="AbstractSummary"]/p[1]', doc, null, XPathResult.ANY_TYPE, null).iterateNext();
	if (keywords1 != null) {
		if (!(keywords1.textContent.match(/Keywords/))) keywords1 = null;
	}
	var withoutKeywordsColon = 0;

	if (keywords1 == null) {
		// In these articles, "Keyword:" appears inside  a separate div
		keywords1 = doc.evaluate('//div[@class="metacontainer"]/div[@class="metavalue"][1]', doc, null, XPathResult.ANY_TYPE, null).iterateNext();
		withoutKeywordsColon = 1;
	}

	if (keywords1 != null) {

		var keywords = keywords1.textContent;

		if (!(keywords == null)) {
			var keywordspart = "a,b";
			if (withoutKeywordsColon) keywordspart = keywords;
			else keywordspart = Zotero.Utilities.trim(keywords.split('Keywords:')[1]);
			var keywordsall = keywordspart.split(',');
			for (i = 0; i < keywordsall.length; i++) {
				newItem.tags[i] = Zotero.Utilities.cleanTags(Zotero.Utilities.trim(keywordsall[i]), "");
			}
		}
	}

	var abbrev = doc.evaluate('//div[@class="AbstractSummary"]/p[2]/i', doc, null, XPathResult.ANY_TYPE, null).iterateNext();

	if (abbrev == null) abbrev = doc.evaluate('//div[@class="metacontainer"]/div[@class="metavalue"]/i', doc, null, XPathResult.ANY_TYPE, null).iterateNext();

	if (!(abbrev == null)) newItem.journalAbbreviation = Zotero.Utilities.trim(abbrev.textContent);

	var vol = doc.evaluate('//div[@class="AbstractSummary"]/p[2]/b', doc, null, XPathResult.ANY_TYPE, null).iterateNext();
	if (vol == null) vol = doc.evaluate('//div[@class="metacontainer"]/div[@class="metavalue"]/b', doc, null, XPathResult.ANY_TYPE, null).iterateNext();

	if (!(vol == null)) newItem.volume = vol.textContent;

	var pdf = doc.getElementById("lnkPDFFis");
	if (pdf && pdf.href) {
		newItem.attachments = [{
			url: pdf.href,
			title: "Full Text PDF",
			mimeType: "application/pdf"
		}];
	}
	newItem.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.frontiersin.org/neuropharmacology/10.3389/fnins.2010.00191/abstract",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Thomas A. van",
						"lastName": "Essen",
						"creatorType": "author"
					},
					{
						"firstName": "Ruben S. van der",
						"lastName": "Giessen",
						"creatorType": "author"
					},
					{
						"firstName": "Sebastiaan K. E.",
						"lastName": "Koekkoek",
						"creatorType": "author"
					},
					{
						"firstName": "Frans",
						"lastName": "VanderWerf",
						"creatorType": "author"
					},
					{
						"firstName": "Chris I. De",
						"lastName": "Zeeuw",
						"creatorType": "author"
					},
					{
						"firstName": "Perry J. J. van",
						"lastName": "Genderen",
						"creatorType": "author"
					},
					{
						"firstName": "David",
						"lastName": "Overbosch",
						"creatorType": "author"
					},
					{
						"firstName": "Marcel T. G. de",
						"lastName": "Jeu",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"mefloquine",
					"gap junctions",
					"motor behavior",
					"eye-blink conditioning",
					"cerebellum"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"url": "http://www.frontiersin.org/neuropharmacology/10.3389/fnins.2010.00191/abstract",
				"title": "Anti-malaria drug mefloquine induces motor learning deficits in humans",
				"publicationTitle": "Frontiers in Neuropharmacology",
				"abstractNote": "Mefloquine (a marketed anti-malaria drug) prophylaxis has a high risk of causing adverse events. Interestingly, animal studies have shown that mefloquine imposes a major deficit in motor learning skills by affecting the connexin 36 gap junctions of the inferior olive. We were therefore interested in assessing whether mefloquine might induce similar effects in humans. The main aim of this study was to investigate the effect of mefloquine on olivary-related motor performance and motor learning tasks in humans. We subjected nine participants to voluntary motor timing (dart throwing task), perceptual timing (rhythm perceptual task) and reflex timing tasks (eye-blink task) before and 24 h after the intake of mefloquine. The influence of mefloquine on motor learning was assessed by subjecting participants with and without mefloquine intake (controls: n = 11 vs mefloquine: n = 8) to an eye-blink conditioning task. Voluntary motor performance, perceptual timing, and reflex blinking were not affected by mefloquine use. However, the influence of mefloquine on motor learning was substantial; both learning speed as well as learning capacity was impaired by mefloquine use. Our data suggest that mefloquine disturbs motor learning skills. This adverse effect can have clinical as well as social clinical implications for mefloquine users. Therefore, this side-effect of mefloquine should be further investigated and recognized by clinicians.",
				"DOI": "10.3389/fnins.2010.00191",
				"pages": "191",
				"date": "2010",
				"journalAbbreviation": "Front. Neurosci",
				"volume": "4",
				"libraryCatalog": "Frontiers",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.frontiersin.org/SearchData.aspx?sq=key+visual+features",
		"items": "multiple"
	}
]
/** END TEST CASES **/