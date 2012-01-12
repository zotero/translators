{
	"translatorID": "c73a4a8c-3ef1-4ec8-8229-7531ee384cc4",
	"label": "Open WorldCat",
	"creator": "Simon Kornblith, Sebastian Karcher",
	"target": "^https?://(.+)\\.worldcat\\.org/",
	"minVersion": "1.0.0b3.r1",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 12,
	"browserSupport": "g",
	"lastUpdated": "2012-01-12 15:26:54"
}

/**
 * Gets Zotero item from a WorldCat icon src
 */
function getZoteroType(iconSrc) {
	// only specify types not specified in COinS
	if (iconSrc.indexOf("icon-rec") != -1) {
		return "audioRecording";
	}
	if (iconSrc.indexOf("icon-com") != -1) {
		return "computerProgram";
	}
	if (iconSrc.indexOf("icon-map") != -1) {
		return "map";
	}
	return false;
}


/**
 * RIS Scraper Function
 *
 */

function scrape(doc, url) {
	var newurl = url.replace(/\&.+/, "?client=worldcat.org-detailed_record&page=endnote");
	//Z.debug(newurl)
	Zotero.Utilities.HTTP.doGet(newurl, function (text) {
		//Zotero.debug("RIS: " + text)
		//LA is not an actual RIS tag, but we like to get that information where we can
		if (text.match(/LA  -/)) {
			var language = text.match(/LA  -.+/)[0].replace(/LA  - /, "");
		}
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
		translator.setString(text);
		translator.setHandler("itemDone", function (obj, item) {
			item.extra = "";
			if (language) item.language = language;
			//We want ebooks to be treated like books, not webpages (is ISBN the best choice here?)
			if (item.itemType == "webpage" && item.ISBN) {
				item.itemType = "book";
			}
			item.complete();
		});
		translator.translate();
	});
}


/**
 * Generates a Zotero item from a single item WorldCat page, or the first item on a multiple item
 * page
 */
function generateItem(doc, node) {
	var item = new Zotero.Item();
	Zotero.Utilities.parseContextObject(node.nodeValue, item);

	// if only one, first check for special types (audio & video recording)
	var type = false;
	try {
		type = doc.evaluate('//img[@class="icn"][contains(@src, "icon-")]/@src', doc, null, XPathResult.ANY_TYPE, null).iterateNext().nodeValue;
	} catch (e) {}
	if (type) {
		type = getZoteroType(type);
		if (type) item.itemType = type;
	}
	return item;
}

function detectWeb(doc) {
	var xpath = doc.evaluate('//span[@class="Z3988"]/@title', doc, null, XPathResult.ANY_TYPE, null);
	var node = xpath.iterateNext();
	if (!node) return false;
	// see if there is more than one
	if (xpath.iterateNext()) {
		multiple = true;
		return "multiple";
	}

	// generate item and return type
	return generateItem(doc, node).itemType;
}

function detectSearch(item) {
	return !!item.ISBN;
}

function doWeb(doc, url) {
	var articles = [];
	if (doc.evaluate('//div[@class="name"]/a', doc, null, XPathResult.ANY_TYPE, null).iterateNext()) { //search results view
		if (detectWeb(doc) == "multiple") {
			var titles = doc.evaluate('//div[@class="name"]/a', doc, null, XPathResult.ANY_TYPE, null);
			var items = {};
			var title;
			while (title = titles.iterateNext()) {
				items[title.href] = title.textContent;
			}
			Zotero.selectItems(items, function (items) {
				if (!items) {
					return true;
				}
				for (var i in items) {
					articles.push(i);
				}
				//Z.debug(articles)
				Zotero.Utilities.processDocuments(articles, scrape, function () {
					Zotero.done();
				});
			});
		} else { //single item in search results, don't display a select dialog
			var title = doc.evaluate('//div[@class="name"]/a[1]', doc, null, XPathResult.ANY_TYPE, null).iterateNext();
			if (!title) Zotero.done(false);
			article = title.href;
			Zotero.Utilities.processDocuments(article, scrape, function () {
				Zotero.done();
			});
		}
	} else { // regular single item	view
		scrape(doc, url);
		Zotero.done();
	}
}

function doSearch(item) {
	Zotero.Utilities.loadDocument("http://www.worldcat.org/search?q=isbn%3A" + item.ISBN + "&=Search&qt=results_page", function (doc) {
		//we take the first search result and run scrape on it
		var title = doc.evaluate('//div[@class="name"]/a[1]', doc, null, XPathResult.ANY_TYPE, null).iterateNext();
		if (!title) Zotero.done(false);
		article = title.href;
		Zotero.Utilities.processDocuments(article, scrape, function () {
			Zotero.done();
		});
	}, null);

	Zotero.wait();
}

/** BEGIN TEST CASES **/
var testCases = [{
	"type": "web",
	"url": "http://www.worldcat.org/search?qt=worldcat_org_bks&q=argentina&fq=dt%3Abks",
	"items": "multiple"
}, {
	"type": "web",
	"url": "http://www.worldcat.org/title/argentina/oclc/489605&referer=brief_results",
	"items": [{
		"itemType": "book",
		"creators": [{
			"lastName": "Whitaker",
			"firstName": "Arthur Preston",
			"creatorType": "author"
		}],
		"notes": [],
		"tags": [],
		"seeAlso": [],
		"attachments": [],
		"itemID": "489605",
		"title": "Argentina",
		"publisher": "Prentice-Hall",
		"place": "Englewood Cliffs, N.J.",
		"date": "1964",
		"language": "English",
		"libraryCatalog": "Open WorldCat"
	}]
}, {
	"type": "web",
	"url": "http://www.worldcat.org/title/dynamic-systems-approach-to-the-development-of-cognition-and-action/oclc/42854423&referer=brief_results",
	"items": [{
		"itemType": "book",
		"creators": [{
			"lastName": "Thelen",
			"firstName": "Esther.",
			"creatorType": "author"
		}, {
			"lastName": "Smith",
			"firstName": "Linda B.",
			"creatorType": "author"
		}],
		"notes": [],
		"tags": [],
		"seeAlso": [],
		"attachments": [{
			"itemType": "webpage",
			"creators": [{
				"lastName": "Thelen",
				"firstName": "Esther.",
				"creatorType": "author"
			}, {
				"lastName": "Smith",
				"firstName": "Linda B.",
				"creatorType": "author"
			}],
			"notes": [],
			"tags": [],
			"seeAlso": [],
			"attachments": [],
			"itemID": "42854423",
			"url": "http://search.ebscohost.com/login.aspx?direct=true&scope=site&db=nlebk&db=nlabk&AN=1712",
			"title": "A dynamic systems approach to the development of cognition and action",
			"publisher": "MIT Press",
			"place": "Cambridge, Mass.",
			"date": "1996",
			"ISBN": "0585030154  9780585030159",
			"ISSN": "0585030154  9780585030159"
		}],
		"itemID": "42854423",
		"url": "http://search.ebscohost.com/login.aspx?direct=true&scope=site&db=nlebk&db=nlabk&AN=1712",
		"title": "A dynamic systems approach to the development of cognition and action",
		"publisher": "MIT Press",
		"place": "Cambridge, Mass.",
		"date": "1996",
		"ISBN": "0585030154  9780585030159",
		"ISSN": "0585030154  9780585030159",
		"language": "English",
		"libraryCatalog": "Open WorldCat",
		"accessDate": "CURRENT_TIMESTAMP"
	}]
}, {
	"type": "web",
	"url": "http://melvyl.worldcat.org/title/cambridge-companion-to-adam-smith/oclc/60321422&referer=brief_results",
	"items": [{
		"itemType": "book",
		"creators": [{
			"lastName": "Haakonssen",
			"firstName": "Knud",
			"creatorType": "author"
		}],
		"notes": [],
		"tags": [],
		"seeAlso": [],
		"attachments": [],
		"itemID": "60321422",
		"title": "The Cambridge companion to Adam Smith",
		"publisher": "Cambridge University Press",
		"place": "Cambridge; New York",
		"date": "2006",
		"ISBN": "0521770599 0521779243  9780521770590 9780521779241",
		"ISSN": "0521770599 0521779243  9780521770590 9780521779241",
		"abstractNote": "\"Adam Smith is best known as the founder of scientific economics and as an early proponent of the modern market economy. Political economy, however, was only one part of Smith's comprehensive intellectual system. Consisting of a theory of mind and its functions in language, arts, science, and social intercourse, Smith's system was a towering contribution to the Scottish Enlightenment. His ideas on social intercourse, in fact, also served as the basis for a moral theory that provided both historical and theoretical accounts of law, politics, and economics. This companion volume provides an up-to-date examination of all aspects of Smith's thought. Collectively, the essays take into account Smith's multiple contexts - Scottish, British, European, Atlantic, biographical, institutional, political, philosophical - and they draw on all his works, including student notes from his lectures. Pluralistic in approach, the volume provides a contextualist history of Smith, as well as direct philosophical engagement with his ideas.\"--Jacket.",
		"language": "English",
		"libraryCatalog": "Open WorldCat"
	}]
}];
/** END TEST CASES **/