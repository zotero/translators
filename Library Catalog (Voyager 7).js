{
	"translatorID": "a81243b5-a9fd-4921-8441-3142a518fdb7",
	"label": "Library Catalog (Voyager 7)",
	"creator": "Sean Takats",
	"target": "/vwebv/(holdingsInfo|search)",
	"minVersion": "1.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "g",
	"lastUpdated": "2011-11-08 14:59:00"
}

function detectWeb(doc, url){
	var bibIdRe = new RegExp("bibId=[0-9]+");
	if (bibIdRe.test(url)){
		return "book";
	}
	
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
		if (prefix == 'x') return namespace; else return null;
	} : null;	
	
	var titles = doc.evaluate('//div[@class="resultListTextCell"]//a', doc, nsResolver, XPathResult.ANY_TYPE, null);
	if (titles.iterateNext()){
		return "multiple";
	}
}

function doWeb(doc, url){
	var bibIdRe = new RegExp("bibId=([0-9]+)");
	var m = bibIdRe.exec(url);
	var hostRegexp = new RegExp("^(https?://[^/]+)/");
	var hMatch = hostRegexp.exec(url);
	var host = hMatch[1];
	
	var urlPrefix = url.match("https?://[^/]*(/[^/]*/)?/?vwebv/")[1] ? host + url.match("https?://[^/]*(/[^/]*/)?/?vwebv/")[1] + "/vwebv/exportRecord.do?bibId=" : host + "/vwebv/exportRecord.do?bibId=";

	
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
		if (prefix == 'x') return namespace; else return null;
	} : null;
	
	var newUris = new Array();

	if (m){ //single item
		newUris.push(urlPrefix + m[1] + "&format=utf-8");
	}
	else { //search results
		var items = new Object();
		var titles = doc.evaluate('//div[@class="resultListTextCell"]//a', doc, nsResolver, XPathResult.ANY_TYPE, null);
		var title;
		
		while (title = titles.iterateNext()) {
			var bibId = title.href.match(/bibId=([0-9]+)/)[1];
			items[bibId] = title.textContent;
		}
		items = Zotero.selectItems(items);
		for (var i in items) {
			newUris.push(urlPrefix + i + "&format=utf-8");
		}
	}

	Zotero.Utilities.HTTP.doGet(newUris, function(text) {
		// load translator for MARC
		var marc = Zotero.loadTranslator("import");
		marc.setTranslator("a6ee60df-1ddc-4aae-bb25-45e0537be973");
		marc.setString(text);
		
		var domain = url.match(/https?:\/\/([^/]+)/);
		marc.setHandler("itemDone", function(obj, item) {
			item.repository = domain[1]+" Library Catalog";
			item.complete();
		});

		marc.translate();
		}, function() { Zotero.done() })
	
	Zotero.wait();
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://groucho.lib.rochester.edu/vwebv/search?searchArg=argentina&searchCode=GKEY%5E*&limitTo=none&recCount=50&searchType=1&page.search.search.button=Search",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://groucho.lib.rochester.edu/vwebv/holdingsInfo?searchId=3544&recCount=50&recPointer=1&bibId=78520",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"firstName": "Mildred Anna",
						"lastName": "Phoebus",
						"creatorType": "author"
					},
					{
						"lastName": "United States",
						"fieldMode": true
					}
				],
				"notes": [
					{
						"note": "Supplement to Commerce reports. Published by the Bureau of foreign and domestic commerce. October 29, 1923"
					}
				],
				"tags": [
					"Argentina",
					"Economic conditions"
				],
				"seeAlso": [],
				"attachments": [],
				"title": "Economic development in Argentina since 1921",
				"place": "Washington",
				"publisher": "Govt. print. off",
				"date": "1923",
				"numPages": "14",
				"series": "U. S. Bureau of foreign and domestic commerce (Dept. of commerce) Trade information bulletin",
				"seriesNumber": "no. 156",
				"callNumber": "HF105 .F71tr no.156",
				"libraryCatalog": "groucho.lib.rochester.edu Library Catalog"
			}
		]
	}
]
/** END TEST CASES **/