{
	"translatorID": "7987b420-e8cb-4bea-8ef7-61c2377cd686",
	"label": "NASA ADS",
	"creator": "Asa Kusuma and Ramesh Srigiriraju",
	"target": "^https?://(ukads|cdsads|ads|adsabs|esoads|adswww|www\\.ads)\\.(inasan|iucaa\\.ernet|nottingham\\.ac|harvard|eso|u-strasbg|nao\\.ac|astro\\.puc|bao\\.ac|on|kasi\\.re|grangenet|lipi\\.go|mao\\.kiev)\\.(edu|org|net|fr|jp|cl|id|uk|cn|ua|in|ru|br|kr)/(?:cgi-bin|abs)/",
	"minVersion": "1.0.0b4.r1",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "g",
	"lastUpdated": "2011-11-09 11:17:58"
}

function detectWeb(doc, url) {
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
		if (prefix == 'x') return namespace; else return null;
	} : null;
	
	var singXpath = '//input[@name="bibcode"][@type="hidden"]';
	var multXpath = '//input[@name="bibcode"][@type="checkbox"]';

	if (doc.evaluate(multXpath, doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext()) {
		return "multiple";
	} else if (doc.evaluate(singXpath, doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext()){
		return "journalArticle";
	}
}

function parseRIS(bibcodes, hostname){
	var getURL = "http://" + hostname + "/cgi-bin/nph-bib_query?"
		+ bibcodes + "data_type=REFMAN&nocookieset=1";
	Zotero.Utilities.HTTP.doGet(getURL, function(text){	
		// load translator for RIS
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
		translator.setString(text);
		translator.translate();
		Zotero.done();
	}, function() {});
	Zotero.wait();
}

function doWeb(doc, url) {
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
		if (prefix == 'x') return namespace; else return null;
	} : null;

	var singXpath = '//input[@name="bibcode"][@type="hidden"]';
	var multXpath = '//input[@name="bibcode"][@type="checkbox"]';
	var titleXpath = '//table/tbody/tr/td[4]'; //will find scores and titles
	var hostname = doc.location.host
	var bibElmts = doc.evaluate(multXpath, doc, nsResolver, XPathResult.ANY_TYPE, null);
	var titleElmts = doc.evaluate(titleXpath, doc, nsResolver, XPathResult.ANY_TYPE, null);
	var titleElmt;
	var bibElmt;

	if ((bibElmt = bibElmts.iterateNext()) && (titleElmt = titleElmts.iterateNext())) {

		var items = new Array();

		do {
			titleElmt = titleElmts.iterateNext(); //iterate a second time to avoid score
			items[bibElmt.value] = Zotero.Utilities.trimInternal(titleElmt.textContent);
		} while((bibElmt = bibElmts.iterateNext()) && (titleElmt = titleElmts.iterateNext()));
		items = Zotero.selectItems(items);
		if(!items) return true;

		var bibcodes="";
		for(var bibcode in items) {
			bibcodes = bibcodes + "bibcode="+encodeURIComponent(bibcode) + "&";
		}
		parseRIS(bibcodes, hostname);		
				
	} else if (bibElmt = doc.evaluate(singXpath, doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext()){
		var bibcode = bibElmt.value;
		var bibcodes = "bibcode="+encodeURIComponent(bibcode) + "&";
		parseRIS(bibcodes, hostname);
	}
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://adsabs.harvard.edu/cgi-bin/basic_connect?qsearch=star&version=1",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://adsabs.harvard.edu/abs/1955ApJ...121..161S",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"lastName": "Salpeter",
						"firstName": "Edwin E.",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"url": "http://adsabs.harvard.edu/abs/1955ApJ...121..161S"
					}
				],
				"title": "The Luminosity Function and Stellar Evolution.",
				"publicationTitle": "The Astrophysical Journal",
				"volume": "121",
				"date": "January 1, 1955",
				"pages": "161",
				"url": "http://adsabs.harvard.edu/abs/1955ApJ...121..161S",
				"abstractNote": "Abstract image available at: \nhttp://adsabs.harvard.edu/abs/1955ApJ...121..161S",
				"libraryCatalog": "NASA ADS",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	}
]
/** END TEST CASES **/