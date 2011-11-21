{
	"translatorID": "f8b5501a-1acc-4ffa-a0a5-594add5e6bd3",
	"label": "US National Archives Research Catalog",
	"creator": "Adam Crymble",
	"target": "^https?://arcweb\\.archives\\.gov",
	"minVersion": "1.0.0b4.r5",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "g",
	"lastUpdated": "2011-11-18 15:37:00"
}

function detectWeb(doc, url) {
	if (doc.location.href.match("ShowArchivalDescriptions") || doc.location.href.match("ShowDODescriptions")) {
		return "multiple";
	} else if (doc.location.href.match("ShowFullRecord") && doc.location.href.match("showFullDescriptionTabs/details")) {
		return "book";
	}
}

//US National Archives. Code by Adam Crymble

function associateData (newItem, dataTags, field, zoteroField) {
	if (dataTags[field]) {
		newItem[zoteroField] = dataTags[field];
	}
}

function scrape(doc, url) {

	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
		if (prefix == 'x') return namespace; else return null;
	} : null;	
	
	var dataTags = new Object();
	var fieldTitle;
	
	var newItem = new Zotero.Item("book");
	
	var contents2 = doc.evaluate('//td[1]/div[@class="sT"]/p', doc, nsResolver, XPathResult.ANY_TYPE, null);

	for (var i = 0; i < 3; i++) {
		if (i == 0) {
			newItem.title = contents2.iterateNext().textContent.replace(/^\s*|\s+$/g, '');
		} else if (i == 1) {
			newItem.extra = contents2.iterateNext().textContent.replace(/^\s*|\s+$/g, '');
		} else if (i == 2) {
			newItem.locInArchive= contents2.iterateNext().textContent.replace(/^\s*|\s+$/g, '');
		}				
	}
	
	var headers = doc.evaluate('//tbody/tr/th', doc, nsResolver, XPathResult.ANY_TYPE, null);
	var contents = doc.evaluate('//body/div[@class="genPad"]', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext().textContent;

	var xPathCount = doc.evaluate('count (//tbody/tr/th)', doc, nsResolver, XPathResult.ANY_TYPE, null);
	
	var headersArray = new Array();
	var oneHeader = '';

	if (xPathCount.numberValue > 1) {
		for (var i = 0; i < xPathCount.numberValue; i++) {
			fieldTitle = headers.iterateNext().textContent;
			headersArray.push(fieldTitle);
		}
	} else {
		oneHeader = (headers.iterateNext().textContent);
	}
	
	var contentsArray = new Array();
	var j = 0;
	
	if (oneHeader.length<1) {
	
		for (var i = headersArray.length-1; i> -1; i--) {	 	
		
			var fieldIndex = contents.lastIndexOf(headersArray[i]);
			var fieldIndexLength = headersArray[i].length;
			
			contentsArray.push(contents.substr(fieldIndex));
			contents = contents.substr(0, fieldIndex);
			fieldTitle = headersArray[i].replace(/\s+/g, '');
			
			dataTags[fieldTitle] = contentsArray[j].substr(fieldIndexLength).replace(/^\s*|\s+$/g, '');
			
			j++;
		}
	}
	j = 0;
	var k = 0;
	var tagsContent = new Array();
	
	if (dataTags["IndexTerms:"]) {
		if (dataTags["IndexTerms:"].match(/\n/)){
			var tagsContent = dataTags["IndexTerms:"].split(/\n/);
		} else {
			if (!dataTags["IndexTerms:"].match("Subjects Represented in the Archival Material")) {
				newItem.tags = dataTags["IndexTerms:"];
			}
		}
		if (tagsContent.length > 1) {
			for (var i = 0; i < tagsContent.length; i++) {
		 			if (tagsContent[i].match(/\w/)) {
			 			if (k == 1) {
				 			newItem.tags[j] = tagsContent[i];
			 				j++;
			 			}
			 			k = 1;
		 			}
	 			}
		}
	}

	associateData (newItem, dataTags, "ProductionDate(s):", "date");
	associateData (newItem, dataTags, "PartOf:", "series");
	associateData (newItem, dataTags, "VariantControlNumber(s):", "callNumber");
	
	if (dataTags["Creator(s):"]) {
		var author = dataTags["Creator(s):"];
		if (author.match(", ")) {
			var authors = author.split(", ");
			author = authors[1] + " " + authors[0];
			newItem.creators.push(Zotero.Utilities.cleanAuthor(author, "author"));	
		} else {
			newItem.creators.push({lastName: author, creatorType: "creator"});			
		}
	}
	
	newItem.url = doc.location.href;
	newItem.complete();
}

function doWeb(doc, url) {
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
		if (prefix == 'x') return namespace; else return null;
	} : null;
	
	var articles = new Array();
	
	if (detectWeb(doc, url) == "multiple") {
		var items = new Object();
			
		if (doc.evaluate('//div[@class="sT"]/p/strong[@class="sFC"]/a', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext()) {
			var titles = doc.evaluate('//div[@class="sT"]/p/strong[@class="sFC"]/a', doc, nsResolver, XPathResult.ANY_TYPE, null);
			
		} else if (doc.evaluate('//td[3]/div[@class="sT"]/p/strong[@class="sFC"]/a', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext()) {
			var titles = doc.evaluate('//td[3]/div[@class="sT"]/p/strong[@class="sFC"]/a', doc, nsResolver, XPathResult.ANY_TYPE, null);
			
		}	
		
		

		var next_title;
		while (next_title = titles.iterateNext()) {
			items[next_title.href] = next_title.textContent;
		}
		items = Zotero.selectItems(items);
		for (var i in items) {
			articles.push(i);
		}
	} else {
		articles = [url];
	}
	Zotero.Utilities.processDocuments(articles, scrape, function() {Zotero.done();});
	Zotero.wait();
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://arcweb.archives.gov/arc/action/ShowFullRecord?tab=init/showFullDescriptionTabs/details&mn=resultsDetailPageModel&goto=4&%24searchId=1&%24showFullDescriptionTabs.selectedPaneId=&%24digiDetailPageModel.currentPage=0&%24resultsPartitionPageModel.targetModel=true&%24resultsSummaryPageModel.pageSize=10&%24partitionIndex=0&%24digiSummaryPageModel.targetModel=true&%24submitId=1&%24resultsDetailPageModel.search=true&%24digiDetailPageModel.resultPageModel=true&%24resultsDetailPageModel.currentPage=0&%24showArchivalDescriptionsTabs.selectedPaneId=&%24resultsDetailPageModel.pageSize=1&%24resultsSummaryPageModel.targetModel=true&%24sort=RELEVANCE_ASC&%24resultsPartitionPageModel.search=true&%24highlight=false",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"lastName": "Supreme Commander for the Allied Powers. Economic and Scientific Section. Director for Labor. Labor Division.\t (08/22/1949 - 04/28/1952)",
						"creatorType": "creator"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"title": "The Struggle for Trade Union Democracy, December 1947, 1945 - 1952",
				"extra": "ARC Identifier 486076",
				"locInArchive": "File Unit from Record Group 331: Records of Allied Operational and Occupation Headquarters, World War II, 1907 - 1966",
				"series": "Series: Topical File, compiled 1945 - 1952",
				"callNumber": "NAIL Control Number: NWCTM-331-UD1799-8483(20)",
				"url": "http://arcweb.archives.gov/arc/action/ShowFullRecord?tab=init/showFullDescriptionTabs/details&mn=resultsDetailPageModel&goto=4&%24searchId=1&%24showFullDescriptionTabs.selectedPaneId=&%24digiDetailPageModel.currentPage=0&%24resultsPartitionPageModel.targetModel=true&%24resultsSummaryPageModel.pageSize=10&%24partitionIndex=0&%24digiSummaryPageModel.targetModel=true&%24submitId=1&%24resultsDetailPageModel.search=true&%24digiDetailPageModel.resultPageModel=true&%24resultsDetailPageModel.currentPage=0&%24showArchivalDescriptionsTabs.selectedPaneId=&%24resultsDetailPageModel.pageSize=1&%24resultsSummaryPageModel.targetModel=true&%24sort=RELEVANCE_ASC&%24resultsPartitionPageModel.search=true&%24highlight=false",
				"libraryCatalog": "US National Archives Research Catalog",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://arcweb.archives.gov/arc/action/ShowArchivalDescriptions?%24searchId=1&%24showFullDescriptionTabs.selectedPaneId=&%24digiDetailPageModel.currentPage=0&%24resultsPartitionPageModel.targetModel=true&%24resultsSummaryPageModel.pageSize=10&%24partitionIndex=0&%24digiSummaryPageModel.targetModel=true&%24submitId=1&%24resultsDetailPageModel.search=true&%24digiDetailPageModel.resultPageModel=true&%24resultsDetailPageModel.currentPage=0&%24showArchivalDescriptionsTabs.selectedPaneId=&%24resultsDetailPageModel.pageSize=1&%24resultsSummaryPageModel.targetModel=true&%24sort=RELEVANCE_ASC&%24resultsPartitionPageModel.search=true&%24highlight=false",
		"items": "multiple"
	}
]
/** END TEST CASES **/