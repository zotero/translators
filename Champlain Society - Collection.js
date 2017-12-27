{
	"translatorID": "50d3ca81-3c4c-406b-afb2-0fe8105b9b38",
	"label": "Champlain Society - Collection",
	"creator": "Adam Crymble",
	"target": "^https?://link\\.library\\.utoronto\\.ca",
	"minVersion": "1.0.0b4.r5",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2012-07-13 07:33:49"
}

function detectWeb(doc, url) {
	if (doc.location.href.match("search_results")) {
		return "multiple";
	} else if (doc.location.href.match("item_record")) {
		return "book";
	}
}

//Champlain Collection translator. Code by Adam Crymble

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
	var tagsContent = new Array();
	var fieldTitle;
	
	var newItem = new Zotero.Item("book");
	
	var headers = doc.evaluate('//table[1]/tbody/tr/td[1]/b/font', doc, nsResolver, XPathResult.ANY_TYPE, null);
	var contents = doc.evaluate('//td/table[1]/tbody/tr/td[2]/font', doc, nsResolver, XPathResult.ANY_TYPE, null);	
	var xPathCount = doc.evaluate('count (//table[1]/tbody/tr/td[1]/b/font)', doc, nsResolver, XPathResult.ANY_TYPE, null);

	for (i=0; i<xPathCount.numberValue; i++) {	 	
	 		fieldTitle = headers.iterateNext().textContent.replace(/\s+/g, '');
	 		if (fieldTitle == "Auteur:" ) {
		 		fieldTitle = "Author:";
	 		} else if (fieldTitle == "Titre:") {
		 		fieldTitle = "Title:";
	 		} else if (fieldTitle == "Description:") {
		 		fieldTitle = "Extent:";
	 		} else if (fieldTitle == "Éditeur:") {
		 		fieldTitle =  "Published:";
	 		} else if (fieldTitle == "Sujet:") {
		 		fieldTitle = "Subjects:";
	 		}
	 		
	 		 dataTags[fieldTitle] = (contents.iterateNext().textContent.replace(/^\s*|\s*$/g, ''));
	 	}
	 
//author
	var multiAuthors = 0;
	if (dataTags["Author:"]) {
		var author = dataTags["Author:"];
		if (author.match("; ")) {
			var authors = author.split("; ");
			multiAuthors = 1;
		}
		
		if (multiAuthors == 1) {
			for (var i = 0; i < authors.length; i++) {
				if (authors[i].match(", ")) {
					var author1 = authors[i].split(", ");
					author = author1[1] + " " + author1[0];
					newItem.creators.push(Zotero.Utilities.cleanAuthor(author, "author"));	
				} else {
					newItem.creators.push({lastName: author, creatorType: "creator"});
				}
			}
		} else {
			if (author.match(", ")) {
				var author1 = author.split(", ");
				author = author1[1] + " " + author1[0];
				newItem.creators.push(Zotero.Utilities.cleanAuthor(author, "author"));	
			} else {
				newItem.creators.push({lastName: author, creatorType: "creator"});
			}
		}
	}
	
	if (dataTags["Published:"]) {
		if (dataTags["Published:"].match(": ")) {
			var place1 = dataTags["Published:"].indexOf(": ");
			newItem.place = dataTags["Published:"].substr(0, place1);
			var publisher1 = dataTags["Published:"].substr(place1 + 2);
			
			if (publisher1.match(", ")) {
				var date1 = publisher1.lastIndexOf(", ");
				newItem.date = publisher1.substr(date1 +2);
				newItem.publisher = publisher1.substr(0, date1);
			} else {
				newItem.publisher = publisher1;
			}
		} else {
			newItem.publisher = publisher1;
		}
	}				
	
//for Tags
	if (dataTags["Subjects:"]) {
		tagsContent = dataTags["Subjects:"].split(/\n/);
	}

	var j = 0;
	for (var i = 0; i < tagsContent.length; i++) {
		if (tagsContent[i].match(/\w/)) {
			newItem.tags[j] = tagsContent[i].replace(/^\s*|\s+$/g, '');
			j++;
		}
	}
	
	associateData (newItem, dataTags, "Extent:", "pages");
	associateData (newItem, dataTags, "ID:", "callNumber");
	associateData (newItem, dataTags, "Notes:", "abstractNote");

	newItem.title = doc.title;	
	if (dataTags["Title:"]) {
		associateData (newItem, dataTags, "Title:", "title");
	} else {
		newItem.title = "No Title Found: Champlain Collection";
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
		
		var titles = doc.evaluate('//tr[1]/td[2]/font/a', doc, nsResolver, XPathResult.ANY_TYPE, null);
		
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
		"url": "https://champlain.library.utoronto.ca/search_results.cfm?lang=eng&query=test&searchtype=Fulltext&limit=All",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://champlain.library.utoronto.ca/item_record.cfm?Idno=9_96862&lang=eng&query=test&searchtype=Fulltext&startrow=1&Limit=All",
		"items": [
			{
				"itemType": "book",
				"title": "An historical journal of the campaigns in North America for the years 1757, 1758, 1759 and 1760, Vol. I",
				"creators": [
					{
						"firstName": "John",
						"lastName": "Knox",
						"creatorType": "author"
					},
					{
						"firstName": "Arthur G. (Arthur George)",
						"lastName": "Doughty",
						"creatorType": "author"
					}
				],
				"date": "1914-16.",
				"abstractNote": "• Original issued in series: The Publications of the Champlain Society. General series ; 8.\n              \n               • Title from title screen.\n              \n               • Includes bibliographical references and an index.",
				"callNumber": "9_96862",
				"libraryCatalog": "Champlain Society - Collection",
				"place": "Toronto",
				"publisher": "Champlain Society",
				"url": "https://champlain.library.utoronto.ca/item_record.cfm?Idno=9_96862&lang=eng&query=test&searchtype=Fulltext&startrow=1&Limit=All",
				"attachments": [],
				"tags": [
					"Amherst, Jeffrey Amherst, Baron, 1717-1797.",
					"Amherst, William, 1732-1781.",
					"Canada -- History -- Seven Years' War, 1755-1763.",
					"Doughty, Arthur G. (Arthur George), Sir, 1860-1936.",
					"Johnson, William, Sir, 1715-1774.",
					"Murray, James, 1721-1794.",
					"United States -- History -- French and Indian War, 1755-1763 -- Bibliography.",
					"United States -- History -- French and Indian War, 1755-1763 -- Registers.",
					"United States -- History -- French and Indian War, 1755-1763."
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/