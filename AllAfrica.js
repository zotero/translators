{
	"translatorID": "34B1E0EA-FD02-4069-BAE4-ED4D98674A5E",
	"label": "allAfrica.com",
	"creator": "Matt Bachtell",
	"target": "^https?://allafrica\\.com/stories/*",
	"minVersion": "1.0.0b4.r5",
	"maxVersion": "",
	"priority": 100,
	"browserSupport": "gcs",
	"inRepository": true,
	"translatorType": 4,
	"lastUpdated": "2012-01-01 01:42:16"
}

function detectWeb (doc, url) {
	
		return "newspaperArticle";
	
}

function doWeb (doc, url){
	scrape(doc,url);
}	

function scrape(doc, url) {
	var title = doc.evaluate("//h1[@class='headline']", doc, null, XPathResult.ANY_TYPE, null).iterateNext().textContent;
	var date = doc.evaluate("//p[@class='date']", doc, null, XPathResult.ANY_TYPE, null).iterateNext().textContent;	
				
// zotero entry creation code
	var newItem = new Zotero.Item('newspaperArticle');
	newItem.title = title;
	newItem.date = date;
	newItem.url = url;

	//AUTHORS
			try{
				var authors = doc.evaluate("//p[@class='reporter']", doc, null, XPathResult.ANY_TYPE,null).iterateNext().textContent;
				if (authors.match(/ &| And/)){
					var aus = authors.split(" And");
					for (var i=0; i < aus.length ; i++){
						newItem.creators.push(Zotero.Utilities.cleanAuthor(aus[i], "author"));
					}
				}
				else if(authors.match(", ")){
					var aus = authors.split(/[,| And| & ]/);
					for (var i=0; i < aus.length; i++){
						newItem.creators.push(Zotero.Utilities.cleanAuthor(aus[i], "author"));
					}				
				}
				else{
					var author = authors;
					newItem.creators.push(Zotero.Utilities.cleanAuthor(author, "author"));				
				}
			}
			catch(e){
				// DO NOTHING
			}
		
	//SOURCE
	try{
		var newspaper_source = doc.evaluate("/html/body/div[3]/div/p/a/img/@alt", doc, null, XPathResult.ANY_TYPE, null).iterateNext().textContent;
		newItem.publicationTitle = newspaper_source;				
	}
	catch(e){
		var newspaper_source = doc.evaluate("//p[@class='publisher']/a/img/@alt|//p[@class='publisher text']/a", doc, null, XPathResult.ANY_TYPE, null).iterateNext().textContent;
		newItem.publicationTitle = newspaper_source;				
	}
	newItem.complete();

} // end scrape/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://allafrica.com/stories/201110180002.html",
		"items": [
			{
				"itemType": "newspaperArticle",
				"creators": [
					{
						"firstName": "Lisa",
						"lastName": "Otto",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"title": "Angola: Political Upheaval Ahead of 2012 Polls",
				"date": "17 October 2011",
				"url": "http://allafrica.com/stories/201110180002.html",
				"publicationTitle": "Institute for Security Studies",
				"libraryCatalog": "allAfrica.com",
				"accessDate": "CURRENT_TIMESTAMP",
				"shortTitle": "Angola"
			}
		]
	},
	{
		"type": "web",
		"url": "http://allafrica.com/stories/201110040606.html",
		"items": [
			{
				"itemType": "newspaperArticle",
				"creators": [],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"title": "Angola: Justice Minister On Voter's Registration Update",
				"date": "3 October 2011",
				"url": "http://allafrica.com/stories/201110040606.html",
				"publicationTitle": "Angola Press Agency (Luanda)",
				"libraryCatalog": "allAfrica.com",
				"accessDate": "CURRENT_TIMESTAMP",
				"shortTitle": "Angola"
			}
		]
	}
]
/** END TEST CASES **/