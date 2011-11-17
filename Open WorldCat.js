{
	"translatorID": "c73a4a8c-3ef1-4ec8-8229-7531ee384cc4",
	"label": "Open WorldCat",
	"creator": "Simon Kornblith",
	"target": "^http://www\\.worldcat\\.org/",
	"minVersion": "1.0.0b3.r1",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "g",
	"lastUpdated": "2011-11-10 16:21:56"
}

/**
 * Gets Zotero item from a WorldCat icon src
 */
function getZoteroType(iconSrc) {
	// only specify types not specified in COinS
	if(iconSrc.indexOf("icon-rec") != -1) {
		return "audioRecording";
	} if(iconSrc.indexOf("icon-com") != -1) {
		return "computerProgram";
	} if(iconSrc.indexOf("icon-map") != -1) {
		return "map";
	}
	return false;
}

/**
 * Generates a Zotero item from a single item WorldCat page, or the first item on a multiple item
 * page
 */
function generateItem(doc, node) {
	var item = new Zotero.Item();
	Zotero.Utilities.parseContextObject(node.nodeValue, item);
	
	// if only one, first check for special types (audio & video recording)
	var type = false;
	try {
		type = doc.evaluate('//img[@class="icn"][contains(@src, "icon-")]/@src', doc, null, XPathResult.ANY_TYPE, null).iterateNext().nodeValue;
	} catch(e) {}
	
	if(type) {
		type = getZoteroType(type);
		if(type) item.itemType = type;
	}
	
	return item;
}

function detectWeb(doc) {
	var xpath = doc.evaluate('//span[@class="Z3988"]/@title', doc, null, XPathResult.ANY_TYPE, null);
	var node = xpath.iterateNext();
	if(!node) return false;
	
	// see if there is more than one
	if(xpath.iterateNext()) {
		multiple = true;
		return "multiple";
	}
	
	// generate item and return type
	return generateItem(doc, node).itemType;
}

function detectSearch(item) {
	return !!item.ISBN;
}

function doWeb(doc) {
	// otherwise, we need to get context objects and display select items dialog
	var elems = [];
	
	// accumulate OpenURL contextObject nodes
	var xpath = doc.evaluate('//span[@class="Z3988"]/@title', doc, null, XPathResult.ANY_TYPE, null);
	while(elem = xpath.iterateNext()) {
		elems.push(elem);
	}
	
	if(elems.length > 1) {		// multiple items
		var items = [];
		var titles = [];
		for(var i in elems) {
			var item = new Zotero.Item();
			Zotero.Utilities.parseContextObject(elems[i].nodeValue, item);
			items.push(item);
			titles.push(item.title);
		}
		
		titles = Zotero.selectItems(titles);
		if(!titles) return true;
		
		// accumulate appropriate types
		var i = 0;
		try {
			var xpath = doc.evaluate('//div/img[@class="icn"][contains(@src, "icon-")][1]/@src', doc, null, XPathResult.ANY_TYPE, null);
			while(elem = xpath.iterateNext()) {
				var type = getZoteroType(elem.nodeValue);
				if(type) items[i].itemType = type;
				i++;
			}
		} catch(e) {}
		
		// complete items
		for(var i in titles) {
			items[i].complete();
		}
	} else {					// single item
		generateItem(doc, elems[0]).complete();
	}
}

function doSearch(item) {
	if(item.contextObject) {
		var co = item.contextObject;
	} else {
		var co = Zotero.Utilities.createContextObject(item);
	}
	
	Zotero.Utilities.loadDocument("http://www.worldcat.org/search?q=isbn%3A"+item.ISBN+"&=Search&qt=results_page", function(doc) {
		var node = doc.evaluate('//span[@class="Z3988"]/@title', doc, null, XPathResult.ANY_TYPE, null).iterateNext();
		if(!node) Zotero.done(false);
		
		var item = generateItem(doc, node);
		item.complete();
		
		Zotero.done();
	}, null);
	
	Zotero.wait();
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.worldcat.org/search?qt=worldcat_org_bks&q=argentina&fq=dt%3Abks",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.worldcat.org/title/zotero-a-guide-for-librarians-researchers-and-educators/oclc/723141626&referer=brief_results",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"lastName": "Puckett",
						"creatorType": "author",
						"firstName": "Jason"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"ISBN": "9780838985892",
				"title": "Zotero : a guide for librarians, researchers, and educators",
				"date": "2011",
				"place": "Chicago",
				"publisher": "Association of College and Research Libraries",
				"libraryCatalog": "Open WorldCat",
				"shortTitle": "Zotero"
			}
		]
	}
]
/** END TEST CASES **/