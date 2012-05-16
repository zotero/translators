{
	"translatorID": "232903bc-7307-4058-bb1a-27cfe3e4e655",
	"label": "SPIRES",
	"creator": "Sean Takats",
	"target": "^http://www.slac.stanford.edu/spires/find/hep/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2012-03-08 04:14:35"
}

function detectWeb(doc, url) {
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
		if (prefix == 'x') return namespace; else return null;
	} : null;
		
	var citations = doc.evaluate('//dl/dd/a[text()="BibTeX"]', doc, nsResolver,
			XPathResult.ANY_TYPE, null);
	var citation = citations.iterateNext();
	var titles = doc.evaluate('//p/b[1]', doc, nsResolver,
			XPathResult.ANY_TYPE, null);
	var title = titles.iterateNext();
	if(citation && title) {
		// search page
		return "multiple";
	}
}

function scrape(text) {
	var m = text.match(/<pre>(?:.|[\r\n])*?<\/pre>/g);
	var bibTeXString = "";
	for (var i=0, n=m.length; i<n; i++) {
		// kill pre tags
		var citation = m[i];
		citation = citation.substring(5, citation.length-6);
		bibTeXString += citation;
	}

	// import using BibTeX
	var translator = Zotero.loadTranslator("import");
	translator.setTranslator("9cb70025-a888-4a29-a210-93ec52da40d4");
	translator.setString(bibTeXString);
	translator.setHandler("itemDone", function(obj, item) {			
		item.complete();
	});
	translator.translate();
}

function doWeb(doc, url) {
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
		if (prefix == 'x') return namespace; else return null;
	} : null;
		
	var citations = doc.evaluate('//dl/dd/a[text()="BibTeX"]', doc, nsResolver,
			XPathResult.ANY_TYPE, null);
	var citation = citations.iterateNext();
//	var titles = doc.evaluate('//p/b[1]', doc, nsResolver,
//			XPathResult.ANY_TYPE, null);
	var titles = doc.evaluate('//p/b[1]', doc, nsResolver,
			XPathResult.ANY_TYPE, null);
	var title = titles.iterateNext();
	if(citation && title) {
		// search page
		var items = new Object();		
		do {
			items[citation.href] = Zotero.Utilities.trimInternal(title.textContent);
		} while((citation=citations.iterateNext()) && (title=titles.iterateNext()))
		
		Zotero.selectItems(items, function(items) {
			if(!items) return true;
			
			var newUris = new Array();
			for(var id in items) {
				newUris.push(id);
			}
			Zotero.Utilities.HTTP.doGet(newUris, scrape);
		});
	} else {
		//single result page?
	}
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.slac.stanford.edu/spires/find/hep/www?rawcmd=find+k+microprocess",
		"items": "multiple"
	}
]
/** END TEST CASES **/