{
	"translatorID": "31da33ad-b4d9-4e99-b9ea-3e1ddad284d8",
	"label": "Hathi Trust",
	"creator": "Sebastian Karcher",
	"target": "^https?://catalog\\.hathitrust\\.org",
	"minVersion": "1.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "g",
	"lastUpdated": "2011-10-30 11:36:51"
}

function detectWeb(doc, url) {
	
	var nsResolver = getNsResolver(doc)
	if (url.match(/\Search\//)) return "multiple"
	if (url.match(/\Record\//))return "book"}
	

function doWeb(doc, url){
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = getNsResolver(doc)
	var articles = new Array();
	if(detectWeb(doc, url) == "multiple") { 
	var items = new Object();
		var xpath = '//div[@class="resultitem"]'
		var rows = doc.evaluate(xpath, doc, null, XPathResult.ANY_TYPE, null);
		var row;
		while (row = rows.iterateNext()) {
			var title = doc.evaluate('.//span[@class="title"]', row, null, XPathResult.ANY_TYPE, null).iterateNext().textContent;
			var id = doc.evaluate('.//a[@class="cataloglinkhref"]', row, null, XPathResult.ANY_TYPE, null).iterateNext().href;
	//	Zotero.debug(id)
			items[id] = title;
		}
		
	Zotero.selectItems(items, function (items) {
      if (!items) {
        Zotero.done();
        return true;
      }
      for (var i in items) {
        articles.push(i);
      }
      Zotero.Utilities.processDocuments(articles, scrape, function () {
        Zotero.done();
      });
    });}
else {
    articles.push(url);
    Zotero.Utilities.processDocuments(articles, scrape, function () {
      Zotero.done();
    });}
}
		



// help function
function scrape(Newdoc, url, items){
//get Endnote Link
var baseurl = url.match(/^.*?(\/Record\/)/)[0].replace(/\/Record\//, "")
Zotero.debug(baseurl)
var itemid = String(url.match(/\/[0-9]+/)).replace(/\//, "")
var risurl = baseurl + "/Search/SearchExport?handpicked=" + itemid + "&method=ris"
Zotero.debug(risurl)
Zotero.Utilities.HTTP.doGet(risurl, function (text) {
text = text.replace(/N1  -/g, "N2  -");
Zotero.debug("RIS: " + text)

	
	var translator = Zotero.loadTranslator("import");
	translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
			translator.setString(text);
			translator.setHandler("itemDone", function(obj, item) {
	item.extra="";
if(item.place)	item.place = item.place.replace(/\[/, "").replace(/\]/, "");
	if (item.tags) item.tags = String(item.tags).split("/")
	item.attachments = [{url:item.url, title: "Hathi Trust Record",
		mimeType: "text/html"
	  }];
	item.complete();
			});	
			translator.translate();
})
}


/**
 * Get the text from the first node defined by the given xPathString
 * @param pathString the XPath indicating which node to get the text from
 * @param doc The XML document describing the page
 * @param nsResolver the namespace resolver function
 * @return the text in the defined node or "Unable to scrape text" if the node was not found or if there was no text content
 */

function getText(pathString, doc, nsResolver) {
  var path = doc.evaluate(pathString, doc, nsResolver, XPathResult.ANY_TYPE, null);
  var node = path.iterateNext();

  if (node == null || node.textContent == undefined || node.textContent == null) {
	Zotero.debug("Unable to retrieve text for XPath: " + pathString);
	return "";
  }

  return node.textContent;
}

/**
 * Get a function for returning the namespace of a given document given its prefix
 * @param nsResolver the namespace resolver function
 */

function getNsResolver(doc) {
  var namespace = doc.documentElement.namespaceURI;
  var nsResolver = namespace ?
  function (prefix) {
	if (prefix == 'x') return namespace;
	else return null;
  } : null;

  return nsResolver;
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://catalog.hathitrust.org/Search/Home?checkspelling=true&lookfor=Cervantes&type=all&sethtftonly=true&submit=Find",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://catalog.hathitrust.org/Record/001050654",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"lastName": "Entwistle",
						"firstName": "William J.",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					""
				],
				"seeAlso": [],
				"attachments": [
					{
						"url": "http://catalog.hathitrust.org/Record/001050654",
						"title": "Hathi Trust Record",
						"mimeType": "text/html"
					}
				],
				"itemID": "001050654",
				"title": "Cervantes",
				"date": "1940",
				"pages": "3 p.l., 192 p.",
				"numPages": "3 p.l., 192 p.",
				"place": "Oxford",
				"publisher": "The Clarendon press",
				"url": "http://catalog.hathitrust.org/Record/001050654",
				"libraryCatalog": "Hathi Trust",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	}
]
/** END TEST CASES **/