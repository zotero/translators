{
	"translatorID": "f520b141-9ce8-42f4-93ec-a39e375a9516",
	"label": "Pubget",
	"creator": "Matt Burton",
	"target": "https?://pubget\\.com/(search|journal|site/search)",
	"minVersion": "1.0.0b4.r5",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "g",
	"lastUpdated": "2011-11-13 19:18:52"
}

function detectWeb (doc, url) {
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
  	if (prefix == 'x') return namespace; else return null;
  } : null;

	var results = doc.evaluate("//ul[@class = 'resultlist']", doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext();
	if (results){
		if (doc.evaluate("//ul[@class = 'resultlist']//a[@class='title']", doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext()){
				return "multiple";
		}
	
	}
}

function doWeb( doc, url) {
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
  	if (prefix == 'x') return namespace; else return null;
  } : null;
	
	var items = {};
	var titles = doc.evaluate("//a[@class='title']", doc, nsResolver, XPathResult.ANY_TYPE, null);
	var elmnt;
	while(elmnt = titles.iterateNext()){
		items[elmnt.href] = elmnt.textContent;
	}
	
	items = Zotero.selectItems(items);
	var urls = [];
	for (item in items) {
		item = "http://pubget.com/site/send_medline/"+item.match(/paper\/(pgtmp_[a-z0-9]+|[0-9]+)/)[1];
		urls.push(item);
		
		
	}
	Zotero.Utilities.doGet(urls, function(text){
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
		translator.setString(text);
		translator.setHandler("itemDone", function(obj, item){
			// do anything needing done to the item
			item.complete();
		});
		translator.translate();
	}, function(){Zotero.done();});
	
}