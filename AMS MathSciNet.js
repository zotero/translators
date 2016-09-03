{
	"translatorID": "a354331-981b-43de-a61-bc26dd1be3a9",
	"label": "AMS MathSciNet",
	"creator": "Simon Kornblith",
	"target": "^https?://(www\\.)?ams\\.[^/]*/mathscinet(\\-getitem\\?|/search/(?:publications\\.html|publdoc\\.html))",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2014-06-06 18:23:10"
}

function detectWeb(doc, url) {
	
	var tableRows = doc.evaluate('//form/div[contains(@class,"headline")]', doc, null,
			XPathResult.ANY_TYPE, null);
	var itemType;
	if(tableRows.iterateNext()) {
		return "multiple"
	} else if(itemType = ZU.xpathText(doc, '//div[@class="headlineMenu"]/*[last()-1]')) {
		switch(itemType.trim().toLowerCase()) {
			case 'article':
				return "journalArticle";
			case 'book':
				return "book";
			case 'chapter':
				return "bookSection";
		}	
	}
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
			links[id] = tableRow.getElementsByTagName('a')[0].href;
		} while(tableRow = tableRows.iterateNext())
		
		
		Zotero.selectItems(items, function (items) {
			if (!items) {
				return true;
			}
			
			for(var id in items) {
				pub += "&b="+id;
				docLinks.push(links[id]);
			}
			scrape(pub, docLinks);
		});
		
	} else {
		var MR = ZU.xpathText(doc, '//div[@id="content"]/div[@class="doc"]/div[@class="headline"]/strong[1]');
		pub += "&b="+MR.replace(/^MR0*/, "");
		scrape(pub, docLinks, doc);
	}
}

function scrape(pub, docLinks, doc) {
	Zotero.Utilities.HTTP.doGet(pub, function(text) {
		var preRE = /<pre>\s*([\s\S]*?)\s*<\/pre>/g;
		var bibTeXString = "";
		
		var m;
		while(m = preRE.exec(text)) {
			bibTeXString += m[1] + '\n';
		}
		
		// import using BibTeX
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("9cb70025-a888-4a29-a210-93ec52da40d4");
		translator.setString(bibTeXString);
		translator.setHandler("itemDone", function(obj, item) {
			// Fix/fetch MR number
			var mrnumber;
			if(item.extra) {
				item.extra = item.extra.replace(/^MR:\s*(?:MR)?(\d+).*/gm,
					function(m, mr) {
						mrnumber = mr;
						return 'MR: ' + mr;
					});
			}
			
			if(mrnumber) {
				url = 'http://www.ams.org/mathscinet-getitem?mr=' + mrnumber;
				docLinks.shift();
			} else {
				url = docLinks.shift();
			}
			
			item.url = url;
			
			if(doc) {
				item.attachments.push({title: "MathSciNet Snapshot", document: doc});
			} else {
				item.attachments.push({title: "MathSciNet Snapshot", url: url, mimeType: "text/html"});
			}
			
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
				"title": "Extrapolation of stable random fields",
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
				"date": "2013",
				"DOI": "10.1016/j.jmva.2012.11.004",
				"ISSN": "0047-259X",
				"extra": "MR: 3004573",
				"itemID": "MR3004573",
				"journalAbbreviation": "J. Multivariate Anal.",
				"libraryCatalog": "AMS MathSciNet",
				"pages": "516–536",
				"publicationTitle": "Journal of Multivariate Analysis",
				"url": "http://www.ams.org/mathscinet-getitem?mr=3004573",
				"volume": "115",
				"attachments": [
					{
						"title": "MathSciNet Snapshot"
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
		"url": "http://www.ams.org/mathscinet/search/publications.html?pg1=ISSI&s1=308850",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.ams.org/mathscinet-getitem?mr=2767535",
		"items": [
			{
				"itemType": "bookSection",
				"title": "On implementation of the Markov chain Monte Carlo stochastic approximation algorithm",
				"creators": [
					{
						"firstName": "Yihua",
						"lastName": "Jiang",
						"creatorType": "author"
					},
					{
						"firstName": "Peter",
						"lastName": "Karcher",
						"creatorType": "author"
					},
					{
						"firstName": "Yuedong",
						"lastName": "Wang",
						"creatorType": "author"
					}
				],
				"date": "2011",
				"bookTitle": "Advances in directional and linear statistics",
				"extra": "MR: 2767535",
				"itemID": "MR2767535",
				"libraryCatalog": "AMS MathSciNet",
				"pages": "97–111",
				"publisher": "Physica-Verlag/Springer, Heidelberg",
				"url": "http://www.ams.org/mathscinet-getitem?mr=2767535",
				"attachments": [
					{
						"title": "MathSciNet Snapshot"
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
		"url": "http://www.ams.org/mathscinet-getitem?mr=2663710",
		"items": [
			{
				"itemType": "book",
				"title": "Advances in directional and linear statistics",
				"creators": [
					{
						"firstName": "Martin T.",
						"lastName": "Wells",
						"creatorType": "editor"
					},
					{
						"firstName": "Ashis",
						"lastName": "SenGupta",
						"creatorType": "editor"
					}
				],
				"date": "2011",
				"ISBN": "9783790826272",
				"extra": "A Festschrift for Sreenivasa Rao Jammalamadaka\nMR: 2663710",
				"itemID": "MR2663710",
				"libraryCatalog": "AMS MathSciNet",
				"numPages": "xiv+321",
				"publisher": "Physica-Verlag/Springer, Heidelberg",
				"url": "http://www.ams.org/mathscinet-getitem?mr=2663710",
				"attachments": [
					{
						"title": "MathSciNet Snapshot"
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
		"url": "http://www.ams.org/mathscinet-getitem?mr=1346201",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Sommation des séries divergentes",
				"creators": [
					{
						"firstName": "Bernard",
						"lastName": "Malgrange",
						"creatorType": "author"
					}
				],
				"date": "1995",
				"ISSN": "0723-0869",
				"extra": "MR: 1346201",
				"issue": "2-3",
				"itemID": "MR1346201",
				"journalAbbreviation": "Exposition. Math.",
				"libraryCatalog": "AMS MathSciNet",
				"pages": "163–222",
				"publicationTitle": "Expositiones Mathematicae. International Journal",
				"url": "http://www.ams.org/mathscinet-getitem?mr=1346201",
				"volume": "13",
				"attachments": [
					{
						"title": "MathSciNet Snapshot"
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