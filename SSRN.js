{
	"translatorID": "b61c224b-34b6-4bfd-8a76-a476e7092d43",
	"label": "SSRN",
	"creator": "Michael Berkowitz",
	"target": "http://papers\\.ssrn\\.com/",
	"minVersion": "1.0.0b4.r5",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "g",
	"lastUpdated": "2011-11-15 16:56:43"
}

function detectWeb(doc, url)	{
	var namespace=doc.documentElement.namespaceURI;
	var nsResolver=namespace?function(prefix)	{
		return (prefix=="x")?namespace:null;
	}:null;
	if (doc.evaluate('//font/strong/a[substring(@class, 1, 4) = "text"]', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext()) {
		return "multiple";
	} else if (url.indexOf("abstract_id") != -1) {
		return "journalArticle";
	}
}

function doWeb(doc, url) {
	var namespace=doc.documentElement.namespaceURI;
	var nsResolver=namespace?function(prefix)	{
		return (prefix=="x")?namespace:null;
	}:null;
	
	var uris = new Array();
	
	if (doc.evaluate('//font/strong/a[substring(@class, 1, 4) = "text"]', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext()) {
		var items = new Object();
		var xpath = '//font/strong/a[substring(@class, 1, 4) = "text"]';
		var titles = doc.evaluate(xpath, doc, nsResolver, XPathResult.ANY_TYPE, null);
		var next_title = titles.iterateNext();
		while (next_title) {
			items[next_title.href] = next_title.textContent;
			next_title = titles.iterateNext();
		}
		items = Zotero.selectItems(items);
		for (var i in items) {
			uris.push(i);
		}
	} else {
		uris.push(url);
	}
	
	Zotero.Utilities.processDocuments(uris, function(doc) {
		if (doc.evaluate('//span[@id="knownuser"]', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext()) {
			var id = doc.location.href.match(/abstract_id=(\d+)/)[1];
			if (doc.evaluate('//a[@title="Download from Social Science Research Network"]', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext()) {
				var pdfurl = doc.evaluate('//a[@title="Download from Social Science Research Network"]', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext().href;
			}
			var newURL = 'http://papers.ssrn.com/sol3/RefExport.cfm?abstract_id=' + id + '&format=3';
			Zotero.Utilities.HTTP.doGet(newURL, function(text) {
				var ris=text.match(/<input type=\"Hidden\"\s+name=\"hdnContent\"\s+value=\"([^"]*)\">/)[1];
				var trans=Zotero.loadTranslator("import");
				trans.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
				trans.setString(ris);
				trans.setHandler("itemDone", function(obj, item) {
					item.itemType = "journalArticle";
					var tags = new Array();
					for each (var tag in item.tags) {
						var newtags = tag.split(/,|;/);
						for each (var newtag in newtags) tags.push(newtag);
					}
					item.tags = tags;
					item.attachments = [{url:item.url, title:"SSRN Snapshot", mimeType:"text/html"}];
					if (pdfurl) item.attachments.push({url:pdfurl, title:"SSRN Full Text PDF", mimeType:"application/pdf"});
					item.complete();
				});
				trans.translate();
			});
		} else {
			var item = new Zotero.Item("journalArticle");
			item.title = Zotero.Utilities.capitalizeTitle(Zotero.Utilities.trimInternal(doc.evaluate('//div[@id="abstractTitle"]', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext().textContent));
			var authors = doc.evaluate('//center/font/a[@class="textlink"]', doc, nsResolver, XPathResult.ANY_TYPE, null);
			var author;
			while (author = authors.iterateNext()) {
				var aut = Zotero.Utilities.capitalizeTitle(Zotero.Utilities.trimInternal(author.textContent));
				item.creators.push(Zotero.Utilities.cleanAuthor(aut, "author"));
			}
			item.abstractNote = Zotero.Utilities.trimInternal(doc.evaluate('//div[@id="innerWhite"]/font[1]', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext().textContent).replace(/^abstract/i,'');
			var tags = doc.evaluate('//font[contains(./b/text(), "Key")]', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext();
			if (tags) {
					item.tags = Zotero.Utilities.trimInternal(tags.textContent).substr(10).split(/;|,/);
			}
			item.publicationTitle = "SSRN eLibrary";
			
			var date = doc.evaluate('id("innerWhite")/center/font[2]', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext();			
			if (date && date.textContent.match(/\d{4}/)) {
				item.date = Zotero.Utilities.trimInternal(date.textContent);
			}
			item.url = doc.location.href;
			/* Commenting out PDF downloading until we add referer capability
			var pdfurl = doc.evaluate('//a[contains(@href,"pdf")]', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext();
			if (pdfurl) {
				pdfurl = pdfurl.href;
			}
			*/
			item.attachments = [{url:item.url, title:"SSRN Snapshot", mimeType:"text/html"}];
			if (pdfurl) {
				item.attachments.push({url:pdfurl, title:"SSRN Full Text PDF", mimeType:"application/pdf"});
			}
			item.complete();
		}
	}, function() {Zotero.done();});
	Zotero.wait();
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://papers.ssrn.com/sol3/papers.cfm?abstract_id=1450589",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Brian D.",
						"lastName": "Greenhill",
						"creatorType": "author"
					},
					{
						"firstName": "Michael",
						"lastName": "Ward",
						"creatorType": "author"
					},
					{
						"firstName": "Audrey E.",
						"lastName": "Sacks",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"Visual Evidence",
					" Logistic Regression",
					" Fit"
				],
				"seeAlso": [],
				"attachments": [
					{
						"url": "http://papers.ssrn.com/sol3/papers.cfm?abstract_id=1450589",
						"title": "SSRN Snapshot",
						"mimeType": "text/html"
					}
				],
				"title": "The 'Separation Plot': A New Visual Method for Evaluating the Predictive Power of Logit/Probit Models",
				"abstractNote": "We present a new visual method for assessing the predictive power of models with binary outcomes. This technique allows the analyst to quickly and easily choose among alternative model specifications based upon the models' ability to consistently match high-probability predictions to actual occurrences of the event of interest, and low-probability predictions to non-occurrences of the event of interest. Unlike existing methods for assessing predictive power for logit and probit models such as the use of \"percent correctly predicted\" statistics, Brier scores and the ROC plot, our \"separation plot\" has the advantage of producing a visual display that is more informative and easier to explain to a general audience than a ROC plot, while also remaining insensitive to the user's often arbitrary choice of threshold for distinguishing between events and non-events. We show how to implement this technique in R and demonstrate its effectiveness in building predictive models in four different areas of political research.",
				"publicationTitle": "SSRN eLibrary",
				"date": "2009",
				"url": "http://papers.ssrn.com/sol3/papers.cfm?abstract_id=1450589",
				"libraryCatalog": "SSRN",
				"accessDate": "CURRENT_TIMESTAMP",
				"shortTitle": "The 'Separation Plot'"
			}
		]
	}
]
/** END TEST CASES **/