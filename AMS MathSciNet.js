{
	"translatorID": "a354331-981b-43de-a61-bc26dd1be3a9",
	"label": "AMS MathSciNet",
	"creator": "Simon Kornblith",
	"target": "^https?://www\\.ams\\.org[^/]*/mathscinet/search/(?:publications\\.html|publdoc\\.html)",
	"minVersion": "1.0.0b3.r1",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "g",
	"lastUpdated": "2011-10-21 00:45:40"
}

function detectWeb(doc, url) {
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
		if (prefix == 'x') return namespace; else return null;
	} : null;
	
	var tableRows = doc.evaluate('//form/div[contains(@class,"headline")]', doc, nsResolver,
			XPathResult.ANY_TYPE, null);
	if(tableRows.iterateNext()) {
		return "multiple"
	} else if(doc.evaluate('//div[@id="titleSeparator"]/div[@class="navbar"]/span[@class="PageLink"]/a[text() = "Up"]',
		doc, nsResolver, XPathResult.ANY_TYPE, null)) {
		return "journalArticle";
	}
	
	return false;
}

function doWeb(doc, url) {
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
		if (prefix == 'x') return namespace; else return null;
	} : null;
	
	//for some reason proxy redirection is sometimes "too slow" - so construct the initial part of the URL
	var host = url.match(/^(.+)\/mathscinet/)
	var pub = host[0] + "/search/publications.html?fmt=bibtex";
	var tableRows = doc.evaluate('//form/div[contains(@class,"headline")]', doc, nsResolver,
			XPathResult.ANY_TYPE, null);
	var tableRow = tableRows.iterateNext();
	if(tableRow) {
		// search page
		var items = new Object();
		var links = new Object();
		
		do {
			var id = doc.evaluate('.//input[@type="checkbox"]', tableRow, nsResolver,
				XPathResult.ANY_TYPE, null).iterateNext().value;
			items[id] = doc.evaluate('./div[@class="headlineText"]/span[@class="title"]', tableRow, nsResolver,
				XPathResult.ANY_TYPE, null).iterateNext().textContent;
			links[id] = doc.evaluate('.//a', tableRow, nsResolver, XPathResult.ANY_TYPE,
				null).iterateNext().href;
		} while(tableRow = tableRows.iterateNext())
		
		
		items = Zotero.selectItems(items);
		if(!items) return true;
		
		var docLinks = new Array();
		for(var id in items) {
			pub += "&b="+id;
			docLinks.push(links[id]);
		}
	} else {
		var MR = doc.evaluate('//div[@id="content"]/div[@class="doc"]/div[@class="headline"]/strong',
			doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext().textContent;
	pub += "&b="+MR.replace(/^MR0*/, "");
	}
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
		
		Zotero.done();
	});
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.ams.org.turing.library.northwestern.edu/mathscinet/search/publications.html?pg4=AUCN&s4=Karcher&co4=AND&pg5=TI&s5=&co5=AND&pg6=PC&s6=&co6=AND&pg7=ALLF&s7=&co7=AND&Submit=Search&dr=all&yrop=eq&arg3=&yearRangeFirst=&yearRangeSecond=&pg8=ET&s8=All&review_format=html",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.ams.org.turing.library.northwestern.edu/mathscinet/search/publdoc.html?arg3=&co4=AND&co5=AND&co6=AND&co7=AND&dr=all&pg4=AUCN&pg5=TI&pg6=PC&pg7=ALLF&pg8=ET&review_format=html&s4=Karcher&s5=&s6=&s7=&s8=All&vfpref=html&yearRangeFirst=&yearRangeSecond=&yrop=eq&r=19&mx-pid=1129800",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "David",
						"lastName": "Hoffman",
						"creatorType": "author"
					},
					{
						"firstName": "Hermann",
						"lastName": "Karcher",
						"creatorType": "author"
					},
					{
						"firstName": "Harold",
						"lastName": "Rosenberg",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "MathSciNet Snapshot",
						"document": {
							"location": {}
						}
					}
				],
				"title": "Embedded minimal annuli in $\\bf R^3$ bounded by a pair of straight lines",
				"publicationTitle": "Commentarii Mathematici Helvetici",
				"journalAbbreviation": "Commentarii Mathematici Helvetici",
				"volume": "66",
				"date": "1991",
				"issue": "4",
				"pages": "599–617",
				"ISSN": "0010-2571",
				"DOI": "10.1007/BF02566668",
				"url": "http://www.ams.org/mathscinet-getitem?mr=1129800",
				"libraryCatalog": "AMS MathSciNet",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	}
]
/** END TEST CASES **/