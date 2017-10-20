{
	"translatorID": "a354331-981b-43de-a61-bc26dd1be3a9",
	"label": "AMS MathSciNet",
	"creator": "Simon Kornblith",
	"target": "^https?://(mathscinet\\.)?ams\\.[^/]*/mathscinet(\\-getitem\\?|/search/(publications\\.html|publdoc\\.html))",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2017-10-20 16:08:00"
}

function detectWeb(doc, url) {
	
	var itemType;
	if(getSearchResults(doc, true)) {
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


function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	//TODO: adjust the xpath
	var rows = ZU.xpath(doc, '//div[@class="headlineText"]');
	for (var i=0; i<rows.length; i++) {
		//TODO: check and maybe adjust
		var href = ZU.xpathText(rows[i], './a[@class="mrnum"]/@href')
		//TODO: check and maybe adjust
		var title = ZU.xpathText(rows[i], './span[@class="title"]')
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

function scrape(doc, url) {
	var host = url.match(/^(.+)\/mathscinet/)
	var pub = host[0] + "/search/publications.html?fmt=bibtex";
	var MR = ZU.xpathText(doc, '//div[@id="content"]/div[@class="doc"]/div[@class="headline"]/strong[1]');
	pub += "&pg1=MR&s1="+MR.replace(/^MR0*/, "");

	ZU.doGet(pub, function(text) {
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
				url = 'https://mathscinet.ams.org/mathscinet-getitem?mr=' + mrnumber;
			}
			item.attachments.push({title: "MathSciNet Snapshot", document: doc});
			item.url = url;
			item.complete();
		});
		translator.translate();
	});
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://mathscinet.ams.org/mathscinet/search/publications.html?pg4=AUCN&s4=Karcher&co4=AND&pg5=TI&s5=&co5=AND&pg6=PC&s6=&co6=AND&pg7=ALLF&s7=&co7=AND&Submit=Search&dr=all&yrop=eq&arg3=&yearRangeFirst=&yearRangeSecond=&pg8=ET&s8=All&review_format=html",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://mathscinet.ams.org/mathscinet-getitem?mr=3004573",
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
				"url": "https://mathscinet.ams.org/mathscinet-getitem?mr=3004573",
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
		"url": "https://mathscinet.ams.org/mathscinet/search/publications.html?pg1=ISSI&s1=308850",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://mathscinet.ams.org/mathscinet-getitem?mr=1346201",
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
				"url": "https://mathscinet.ams.org/mathscinet-getitem?mr=1346201",
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
