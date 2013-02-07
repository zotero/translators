{
	"translatorID": "a354331-981b-43de-a61-bc26dd1be3a9",
	"label": "AMS MathSciNet",
	"creator": "Simon Kornblith",
	"target": "^https?://(www\\.)?ams\\.[^/]*/mathscinet(\\-getitem\\?|/search/(?:publications\\.html|publdoc\\.html))",
	"minVersion": "1.0.0b3.r1",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2013-02-03 23:35:37"
}

function detectWeb(doc, url) {
	
	var tableRows = doc.evaluate('//form/div[contains(@class,"headline")]', doc, null,
			XPathResult.ANY_TYPE, null);
	if(tableRows.iterateNext()) {
		return "multiple"
	} else if(doc.evaluate('//div[@id="titleSeparator"]/div[@class="navbar"]/span[@class="PageLink"]/a[text() = "Up"]',
		doc, null, XPathResult.ANY_TYPE, null)) {
		return "journalArticle";
	}
	
	return false;
}

function doWeb(doc, url) {
	//for some reason proxy redirection is sometimes "too slow" - so construct the initial part of the URL
	var host = url.match(/^(.+)\/mathscinet/)
	var pub = host[0] + "/search/publications.html?fmt=bibtex";
	var tableRows = doc.evaluate('//form/div[contains(@class,"headline")]', doc, null,
			XPathResult.ANY_TYPE, null);
	var tableRow = tableRows.iterateNext();
	var docLinks = new Array();
	if(tableRow) {
		// search page
		var items = new Object();
		var links = new Object();
		
		do {
			var id = doc.evaluate('.//input[@type="checkbox"]', tableRow, null,
				XPathResult.ANY_TYPE, null).iterateNext().value;
			items[id] = doc.evaluate('./div[@class="headlineText"]/span[@class="title"]', tableRow, null,
				XPathResult.ANY_TYPE, null).iterateNext().textContent;
			links[id] = doc.evaluate('.//a', tableRow, null, XPathResult.ANY_TYPE,
				null).iterateNext().href;
		} while(tableRow = tableRows.iterateNext())
		
		
		Zotero.selectItems(items, function (items) {
			if (!items) {
				return true;
			}
			
			for(var id in items) {
				pub += "&b="+id;
				docLinks.push(links[id]);
			}
			scrape(pub, docLinks)
		});
		
	} else {
		var MR = doc.evaluate('//div[@id="content"]/div[@class="doc"]/div[@class="headline"]/strong',
			doc, null, XPathResult.ANY_TYPE, null).iterateNext().textContent;
		pub += "&b="+MR.replace(/^MR0*/, "");
	scrape(pub, docLinks, doc)	
	}
}

function scrape(pub, docLinks, doc){
	Zotero.Utilities.HTTP.doGet(pub, function(text) {
		var m = text.match(/<pre>(?:.|[\r\n])*?<\/pre>/g);
		//for search results we don't have the MR yet - we need that to create a clean URL below
		if (!MR) {var MR = String(text.match(/MR\d+/));
			}
		var bibTeXString = "";
		for each(var citation in m) {
			// kill pre tags
			citation = citation.substring(5, citation.length-6);
			bibTeXString += citation;
		}
		
		// import using BibTeX
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("9cb70025-a888-4a29-a210-93ec52da40d4");
		translator.setString(bibTeXString);
		translator.setHandler("itemDone", function(obj, item) {
			if(docLinks) {
				item.attachments.push({title:"MathSciNet Snapshot", url:docLinks.shift(), mimeType:"text/html"});
			} else {
				item.attachments.push({title:"MathSciNet Snapshot", document:doc});
			}
		
		if(MR)	item.url = "http://www.ams.org/mathscinet-getitem?mr=" + MR.replace(/MR/, "");
			item.complete();
		});
		translator.translate();
	});
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.ams.org/mathscinet/search/publications.html?pg4=AUCN&s4=Karcher&co4=AND&pg5=TI&s5=&co5=AND&pg6=PC&s6=&co6=AND&pg7=ALLF&s7=&co7=AND&Submit=Search&dr=all&yrop=eq&arg3=&yearRangeFirst=&yearRangeSecond=&pg8=ET&s8=All&review_format=html",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.ams.org/mathscinet-getitem?mr=3004573",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Wolfgang",
						"lastName": "Karcher",
						"creatorType": "author"
					},
					{
						"firstName": "Elena",
						"lastName": "Shmileva",
						"creatorType": "author"
					},
					{
						"firstName": "Evgeny",
						"lastName": "Spodarev",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "MathSciNet Snapshot",
						"mimeType": "text/html"
					}
				],
				"title": "Extrapolation of stable random fields",
				"publicationTitle": "Journal of Multivariate Analysis",
				"journalAbbreviation": "Journal of Multivariate Analysis",
				"volume": "115",
				"date": "2013",
				"pages": "516–536",
				"ISSN": "0047-259X",
				"DOI": "10.1016/j.jmva.2012.11.004",
				"url": "http://www.ams.org/mathscinet-getitem?mr=3004573",
				"libraryCatalog": "AMS MathSciNet",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.ams.org/mathscinet/search/publications.html?pg1=ISSI&s1=308850",
		"items": "multiple"
	}
]
/** END TEST CASES **/