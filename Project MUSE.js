{
	"translatorID": "c54d1932-73ce-dfd4-a943-109380e06574",
	"label": "Project MUSE",
	"creator": "Simon Kornblith, Avram Lyon, Sean Takats",
	"target": "^https?://[^/]*muse\\.jhu\\.edu[^/]*/(login\\?uri=/)?(?:journals/[^/]+/(summary/)?[^/]+/[^/]+\\.html|search/results)",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcs",
	"lastUpdated": "2012-01-16 10:55:46"
}

function detectWeb(doc, url) {
	var searchRe = new RegExp("(^https?://[^/]+/search/results|/search/save|/toc/|/results$)");
	if(searchRe.test(url)) {
	//some old TOCs just display links to pdfs - don't detect those
	if(ZU.xpath(doc, '//div[@class="article"]/h4/a|//div[@class="result_info"]/h1/a|//ul/li/a[text() = "[Access article in HTML]"]').length != 0){
		return "multiple";}
	} else {
		return "journalArticle";
	}
}

function doWeb(doc, url) {

	var searchRe = new RegExp("^https?://[^/]+/search/results|/search/save|/results$");
	if(detectWeb(doc, url) == "multiple") {
		var items = {};
		var attachments = new Array();
			if (doc.evaluate('//div[@class="article"]/h4/a|//div[@class="result_info"]/h1/a',doc, null, XPathResult.ANY_TYPE, null).iterateNext()){
			var results = doc.evaluate('//div[@class="article"]/h4/a|//div[@class="result_info"]/h1/a',
									 doc, null, XPathResult.ANY_TYPE, null);
			var result; 
			while(result =  results.iterateNext()) {
				items[result.href] = result.textContent;
			}
									 }
									 else {
			// Some journals have old-style TOCs for back issues
			// Ex. http://muse.jhu.edu/journals/eighteenth-century_studies/toc/ecs33.4.html
				var articles = doc.evaluate('//ul', doc, null, XPathResult.ANY_TYPE, null);
				var article;
				while (article = articles.iterateNext()) {
					var link = doc.evaluate('./li/a[contains(@href,".html")]', article, null, XPathResult.ANY_TYPE, null).iterateNext();
					var title = doc.evaluate('./li/i', article, null, XPathResult.ANY_TYPE, null).iterateNext();
					if(link && link.href && title && title.textContent) {
						items[link.href] = title.textContent;
					}
				}
			
									 }
		Zotero.selectItems(items, function(items) {
			if(!items) {
				return true;
			}	
			var i;
			var urls = [];
			for (i in items) {urls.push(i);};
			Zotero.Utilities.processDocuments(urls, scrapeOne, function() {Zotero.done();}, null);		
		});
	} else scrapeOne(doc);
	Zotero.wait();
}

// Given an article page, get the RIS and open it
function scrapeOne(doc) {
	var url = doc.location.href;

	var hostRe = new RegExp("^(http://[^/]+)/");
		var m = hostRe.exec(url);
		var host = m[1];

		var getPDF = doc.evaluate('//a[text() = "PDF Version" or text() = "[Access article in PDF]" or text() = "Download PDF"]', doc,
								  null, XPathResult.ANY_TYPE, null).iterateNext();		
		var DOI = doc.evaluate('//meta[@name="citation_doi"]/@content', doc,
								  null, XPathResult.ANY_TYPE, null).iterateNext();		
		var abstract = doc.evaluate('//div[@class="abstract"]', doc,
								  null, XPathResult.ANY_TYPE, null).iterateNext();
		var author = ZU.xpathText(doc, '//meta[@name="citation_author"]/@content');


		var newUrl = url.replace(host, host+"/metadata/zotero").replace("/summary/","/").replace("/login?uri=","");
		Zotero.Utilities.HTTP.doGet(newUrl, function(text) {
			var translator = Zotero.loadTranslator("import");
			//set RIS translator
			translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
			translator.setString(text);
			translator.setHandler("itemDone", function(obj, item) {
				if(item.notes && item.notes[0]) {
					item.extra = item.notes[0].note;						
					delete item.notes;
					item.notes = undefined;
				}
				//Muse has authors wrong in the RIS - we get the names from google metadata and use them
				if(author){
				author=	author.split(",")
					for (i in author){
					item.creators.push(ZU.cleanAuthor(author[i], "author"));
					}
				}
				item.attachments.splice(0);
				item.attachments.push({document:doc, title:"Project MUSE Snapshot"});
				if(getPDF) {
					item.attachments.push({title:"Project MUSE Full Text PDF", mimeType:"application/pdf",
					url:getPDF.href});
				}
				if(DOI) {
					item.DOI = DOI.textContent.replace(/^DOI: /,"");
				}
				if(abstract) {
					item.abstract = abstract.textContent;
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
		"url": "http://muse.jhu.edu/journals/past_and_present/summary/v191/191.1higonnet.html",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"lastName": "Higonnet",
						"firstName": "Patrice L. R.",
						"creatorType": "author"
					}
				],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"document": {
							"location": {}
						},
						"title": "Project MUSE Snapshot"
					}
				],
				"title": "Terror, Trauma and the 'Young Marx' Explanation of Jacobin Politics",
				"publicationTitle": "Past & Present",
				"volume": "191",
				"issue": "1",
				"pages": "121-164",
				"date": "2006",
				"publisher": "Oxford University Press",
				"ISBN": "1477-464X",
				"ISSN": "1477-464X",
				"url": "http://muse.jhu.edu/journals/past_and_present/v191/191.1higonnet.html",
				"extra": "<p>Number 191, May 2006</p>",
				"libraryCatalog": "Project MUSE",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://muse.jhu.edu/journals/journal_of_social_history/toc/jsh.44.4.html",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://muse.jhu.edu/journals/eighteenth-century_studies/toc/ecs33.4.html",
		"items": "multiple"
	}
]
/** END TEST CASES **/