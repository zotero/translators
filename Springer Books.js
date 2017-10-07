{
	"translatorID": "da908009-53f2-431f-bd0f-b13340391b89",
	"label": "Springer Books",
	"creator": "Jonathan Schulz",
	"target": "^https?://www\\.springer\\.com/\\w\\w/(book)/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsbv",
	"lastUpdated": "2017-10-07 20:39:30"
}

function detectWeb(doc, url) {
	var action = url.match(/^https?:\/\/[^\/]+\/[^\/]+\/([^\/?#]+)/);
	if(!action) return;
	//Z.debug(action);
	switch(action[1]) {
		case "book":
			if(ZU.xpathText(doc, '//meta[@property="og:title"]/@content')) return "book";
//	add other types in the future
	}
}

function doWeb(doc, url) {
	scrape(doc, url);
}

function scrape(doc, url) {
	//check for metadata
	if(ZU.xpathText(doc, '//meta[@property="og:title"]/@content')) {
		Z.debug("title found");
		//use Embeded Metadata translator
		var translator = Zotero.loadTranslator("web");
		translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
		translator.setDocument(doc);
		translator.setHandler("itemDone", function(obj, item) {
			//extract information from the title field:
			// <book title> | <first author> | Springer
			entries = item.title.split(/\s\|\s/);
			item.title = entries[0];
			item.creators.push(ZU.cleanAuthor(entries[1], "author", entries[1].indexOf(',') != -1));
			item.complete();
		});
		translator.translate();
	} else {
		Z.debug("Couldn't find embedded metadata");
	}
}
