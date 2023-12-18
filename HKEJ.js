{
	"translatorID": "960b9a06-5be3-43ee-a15b-6e8bc3d80062",
	"label": "HKEJ",
	"creator": "Andy Kwok",
	"target": "\\.hkej\\.com",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-12-18 01:11:27"
}

function detectWeb(doc, url) {
			return "newspaperArticle";
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//a[@data-resource-id or @data-tracker-label="headline"]');
	for (var i=0; i<rows.length; i++) {
		var href = rows[i].href;
		var title = ZU.trimInternal(rows[i].textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}


function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (!items) {
				return true;
			}
			var articles = [];
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, scrape);
		});
	} else {
		scrape(doc, url);
	}
}

function scrape(doc, url) {
	var translator = Zotero.loadTranslator('web');
	var type = detectWeb(doc, url);
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setHandler('itemDone', function (obj, item) {
		//add date from microdata if not in header	
			if (!item.date) item.date = ZU.xpathText(doc, '//main//time[@itemprop="date"]/@datetime');
			
			item.publicationTitle = "信報";
			item.place = "Hong Kong";
			item.edition = "online";
			
			
			item.complete();
	});
	translator.getTranslatorObject(function(trans) {
		trans.itemType = type;
		trans.doWeb(doc, url);
	});
}
/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
