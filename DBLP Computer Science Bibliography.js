{
	"translatorID": "625c6435-e235-4402-a48f-3095a9c1a09c",
	"label": "DBLP Computer Science Bibliography",
	"creator": "Adam Crymble, Sebastian Karcher, Philipp Zumstein",
	"target": "^https?://(www\\.)?(dblp(\\.org|\\.uni-trier\\.de/|\\.dagstuhl\\.de/)|informatik\\.uni-trier\\.de/\\~ley//)",
	"minVersion": "1.0.0b4.r5",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsv",
	"lastUpdated": "2013-12-22 14:00:00"
}

function detectWeb(doc, url) {
        if (url.match(/rec\/bibtex/)) {
			if (url.match(/journals/)) {
				return "journalArticle";
			} else if (url.match(/conf/)) {
				return "conferencePaper";
			} else if (url.match(/series|reference/)) {
				return "bookSection";
			} else if (url.match(/books/)) {
				return "book";
			} else if (url.match(/phd/)) {
				return "thesis";
			} else {
				return "bibtex";
			}
        } 
        else if ( ( url.match(/\/db\/(journals|conf|series|reference)/) || url.match(/\/pers\/(hd|ht|hy)/) ) && !url.match(/index[\w-]*\.html/)){
                return "multiple"
        }
}


function scrape(doc, url) {
	var dataTags = new Object();
	var mediaType = detectWeb(doc, url);
	
	var xPathAllData = doc.evaluate('//pre', doc, null, XPathResult.ANY_TYPE, null);
	var allData = xPathAllData.iterateNext(); //only if exists
	var allDataText = allData.textContent.replace(/ ee  /, " url ");//e.g. ee = {http://dx.doi.org/10.1007/978-3-319-00035-0_37},
	Zotero.debug(allDataText);
	
	//conferencePapers and bookSections are linked in DBLP
	//with the crossref field to the second BibTeX entry
	//for the proceeding or book. In these cases the following
	//lines are proceeding the second entry and extracting
	//relevant fields and save it (later) to the main entry.
	var secondData;
	var secondDataTitle, secondDataEditors, secondDataPublisher, secondDataSeries, secondDataVolume, secondDataISBN;
	if (secondData = xPathAllData.iterateNext()) {
		var secondDataText = secondData.textContent;
		Zotero.debug(secondDataText);
		
		var trans = Zotero.loadTranslator('import');
		trans.setTranslator('9cb70025-a888-4a29-a210-93ec52da40d4');
		trans.setString(secondDataText);

		trans.setHandler('itemDone', function(obj, item) {
			secondDataTitle = item.title;
			secondDataEditors = item.creators;//array object; all or only editors? Are there other roles occuring in reality??
			secondDataPublisher = item.publisher;
			secondDataSeries = item.series;
			secondDataVolume = item.volume;
			secondDataISBN = item.ISBN;
			//item.complete(); //No, don't save this crossref object
		});

		trans.translate();
	}
	
	
	var trans = Zotero.loadTranslator('import');
	trans.setTranslator('9cb70025-a888-4a29-a210-93ec52da40d4'); //  https://github.com/zotero/translators/blob/master/BibTeX.js
	trans.setString(allDataText);
	
	trans.setHandler('itemDone', function(obj, item) {
		Zotero.debug("item.itemType = "+item.itemType);
		if (secondDataTitle && item.itemType == "conferencePaper") item.proceedingsTitle = secondDataTitle;
		if (secondDataTitle && item.itemType == "bookSection") item.booktitle = secondDataTitle;
		if (secondDataEditors && secondDataEditors.length > 0) item.creators = item.creators.concat(secondDataEditors);
		if (secondDataPublisher && !item.publisher) item.publisher = secondDataPublisher;
		if (secondDataSeries && !item.series) item.series = secondDataSeries;
		if (secondDataVolume && !item.volume) item.volume = secondDataVolume;
		if (secondDataISBN && !item.ISBN) item.ISBN = secondDataISBN;

		item.complete();
	});
	
	trans.translate();

}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		var items = new Object();
		var articles = new Array();
		var rows  = ZU.xpath(doc, '//body/ul/li|//li[contains(@class, "entry")]')
		for (i in rows){
			 var title = ZU.xpathText(rows[i], './b|./div/span[@class="title"]');
			 var link = ZU.xpathText(rows[i], './a[contains(@href, "rec/bibtex") and not(contains(@href, ".xml"))]/@href|./nav//div/a[contains(@href, "rec/bibtex") and not(contains(@href, ".xml"))]/@href');
			items[link] = title;
		}
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
	} else {
		scrape(doc, url);
	}
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.dblp.org/rec/bibtex/journals/cssc/XuY12",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Jianwen",
						"lastName": "Xu",
						"creatorType": "author"
					},
					{
						"firstName": "Hu",
						"lastName": "Yang",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"url": "http://www.dblp.org/rec/bibtex/journals/cssc/XuY12",
				"date": "2012",
				"pages": "327-341",
				"title": "On the Preliminary Test Backfitting and Speckman Estimators\n               in Partially Linear Models and Numerical Comparisons",
				"volume": "41",
				"publicationTitle": "Communications in Statistics - Simulation and Computation",
				"issue": "3",
				"libraryCatalog": "DBLP Computer Science Bibliography",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.dblp.org/rec/bibtex/conf/ats/KochteZBIWHCP10",
		"items": [
			{
				"itemType": "conferencePaper",
				"creators": [
					{
						"firstName": "Michael A.",
						"lastName": "Kochte",
						"creatorType": "author"
					},
					{
						"firstName": "Christian G.",
						"lastName": "Zoellin",
						"creatorType": "author"
					},
					{
						"firstName": "Rafal",
						"lastName": "Baranowski",
						"creatorType": "author"
					},
					{
						"firstName": "Michael E.",
						"lastName": "Imhof",
						"creatorType": "author"
					},
					{
						"firstName": "Hans-Joachim",
						"lastName": "Wunderlich",
						"creatorType": "author"
					},
					{
						"firstName": "Nadereh",
						"lastName": "Hatami",
						"creatorType": "author"
					},
					{
						"firstName": "Stefano Di",
						"lastName": "Carlo",
						"creatorType": "author"
					},
					{
						"firstName": "Paolo",
						"lastName": "Prinetto",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"conferenceName": "Asian Test Symposium",
				"url": "http://www.dblp.org/rec/bibtex/conf/ats/KochteZBIWHCP10",
				"date": "2010",
				"pages": "3-8",
				"title": "Efficient Simulation of Structural Faults for the Reliability\n               Evaluation at System-Level",
				"libraryCatalog": "DBLP Computer Science Bibliography",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://dblp.uni-trier.de/db/journals/tois/tois25.html",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://dblp.uni-trier.de/db/journals/tods/tods31.html",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://dblp.dagstuhl.de/pers/hd/k/Knuth:Donald_E=.html",
		"items": "multiple"
	}
]
/** END TEST CASES **/
