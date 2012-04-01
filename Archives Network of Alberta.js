{
	"translatorID": "f39dbd1c-229e-4abb-8414-a09fdbda37b7",
	"label": "Archives Network of Alberta",
	"creator": "Adam Crymble",
	"target": "^https?://asalive\\.archivesalberta\\.org\\:8080",
	"minVersion": "1.0.0b4.r5",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "g",
	"lastUpdated": "2012-03-31 11:20:31"
}

function detectWeb(doc, url) {
	
	var xPathH3 = doc.evaluate('//h3', doc, null, XPathResult.ANY_TYPE, null).iterateNext().textContent;
	
	if (xPathH3.match("Search Results")) {
		return "multiple";
	} else if (xPathH3.match("Display")) {
		return "book";
	}
}

//Archives Network of Alberta translator. Code by Adam Crymble

function associateData (newItem, dataTags, field, zoteroField) {
	if (dataTags[field]) {
		newItem[zoteroField] = dataTags[field];
	}
}

function scrape(doc, url) {
	var newItem = new Zotero.Item("book");
	var dataTags = new Object();
	var manyAuthors = new Array();
	var tagsContent = new Array();
	var tagsContent1 = new Array();
	
	var xPathHeaders = doc.evaluate('//td[1][@class="datalabel"]', doc, null, XPathResult.ANY_TYPE, null);
	var xPathContent = doc.evaluate('//td[2][@class="datatext"]', doc, null, XPathResult.ANY_TYPE, null);
	var xPathCount = doc.evaluate('count (//td[1][@class="datalabel"])', doc, null, XPathResult.ANY_TYPE, null);
	
	for (var i = 0; i < xPathCount.numberValue; i++) {
		fieldTitle = xPathHeaders.iterateNext().textContent.replace(/\s+/g, '');
		
		if (fieldTitle =="Provenance:") {
		 		
		 		dataTags[fieldTitle] = (xPathContent.iterateNext().textContent.replace(/^\s*|\s*$/g, ''));
		 		
		 		if (dataTags[fieldTitle].match("; ")) {
			 		manyAuthors = dataTags[fieldTitle].split("; ");
		 		} else {
			 		manyAuthors.push(dataTags[fieldTitle]);
		 		}
		 		Zotero.debug(manyAuthors);
		 		
		 		for (var j = 0; j < manyAuthors.length; j++) {
		 			if (manyAuthors[j].match(", ")) {
			 			var authorName = manyAuthors[j].split(",");
			 			authorName[0] = authorName[0].replace(/^\s*|\s*$/g, '');
			 			authorName[1] = authorName[1].replace(/^\s*|\s*$/g, '');
			 			newItem.creators.push(Zotero.Utilities.cleanAuthor((authorName[1] + (" ") + authorName[0]), "author"));
		 			} else {
			 			newItem.creators.push({lastName: ZU.trim(manyAuthors[j]), creatorType: "author", fieldMode: 1}); 
		 			}
		 		}
		 		
		} else if (fieldTitle == "Partof:") {
			
			dataTags[fieldTitle] = ("Part of " + Zotero.Utilities.cleanTags(xPathContent.iterateNext().textContent.replace(/^\s*|\s*$/g, '')));

		} else if (fieldTitle == "OnlineFindingAid:") {
			dataTags[fieldTitle] = ("Online Finding Aid: " + xPathContent.iterateNext().textContent);	
			Zotero.debug(dataTags["OnlineFindingAid:"]);
			
		} else if (fieldTitle == "Names:")  { 
			dataTags[fieldTitle] = (xPathContent.iterateNext().textContent.replace(/^\s*|\s*$/g, ''));
			tagsContent = dataTags[fieldTitle].split(";");
			
		} else if (fieldTitle == "Topic:") {
			dataTags[fieldTitle] = (xPathContent.iterateNext().textContent.replace(/^\s*|\s*$/g, ''));
			tagsContent1 = dataTags[fieldTitle].split(/\s*\n*[,;]\s*\n*/);
			
		} else {
		
			dataTags[fieldTitle] = Zotero.Utilities.cleanTags(xPathContent.iterateNext().textContent.replace(/^\s*|\s*$/g, ''));
		}
	}
	
	for (i = 0; i < tagsContent.length; i++) {
	  	tagsContent[i] = tagsContent[i].replace(/^\s*|\s*$/g, '');
	  	newItem.tags[i] = tagsContent[i];
	 	}
	 	
	 	for (i = 0; i < tagsContent1.length; i++) {
	  	
	  	newItem.tags.push(tagsContent1[i]);
	 	}
	 		
	associateData (newItem, dataTags, "Title:", "title");
	associateData (newItem, dataTags, "Dates:", "date");
	associateData (newItem, dataTags, "Physicaldesc.:", "pages");
	associateData (newItem, dataTags, "Repository:", "archive");
	associateData (newItem, dataTags, "Scope/Content:", "abstractNote");
	associateData (newItem, dataTags, "Partof:", "series");
	associateData (newItem, dataTags, "OnlineFindingAid:", "extra");
	associateData (newItem, dataTags, "Language:", "language");
	associateData (newItem, dataTags, "RecordNo.:", "archiveLocation");
	
	newItem.url = doc.location.href;
	newItem.complete();
}

function doWeb(doc, url) {
	var articles = new Array();
	
	if (detectWeb(doc, url) == "multiple") {
		var items = new Object();
		
		var xPathTitles = doc.evaluate('//tr[1]/td[2][@class="datatext"]', doc, null, XPathResult.ANY_TYPE, null);
		var nextTitle;
		
		var xPathLinks = doc.evaluate('//td[1][@class="dataleft"]/a', doc, null, XPathResult.ANY_TYPE, null);
		
		while (nextTitle = xPathTitles.iterateNext()) {
			items[xPathLinks.iterateNext().href] = nextTitle.textContent;	
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
}
/** BEGIN TEST CASES **/
var testCases = []
/** END TEST CASES **/