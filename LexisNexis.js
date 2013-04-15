{
	"translatorID": "b047a13c-fe5c-6604-c997-bef15e502b09",
	"label": "LexisNexis",
	"creator": "Sean Takats",
	"target": "https?://[^/]*lexis-?nexis\\.com[^/]*/lnacui2api/(contentRenderer.do|.+results_DocumentContent)",
	"minVersion": "1.0.0b3.r1",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "g",
	"lastUpdated": "2013-04-08 21:34:52"
}

function detectWeb(doc, url) {
	if (ZU.xpathText(doc, '//span[@class="SS_L3"]')) return "newspaperArticle"	
}

function doWeb(doc, url) {	
	if (detectWeb(doc, url) == "multiple"){
		
	}
	else{
		scrape(doc, url)
	}
}

function scrape(doc, url){
	var item = new Zotero.Item("newspaperArticle")
	var title = ZU.xpathText(doc, '//span[@class="SS_L0"]');
	var date = ZU.xpathText(doc, '//center[contains(text(), " GMT")]');
	var author = ZU.xpathText(doc, '//center[contains(text(), " GMT")]');
	var text = ZU.xpathText(doc, '//span[@class="verdana"]');
	Z.debug(text)
	var author = text.match(/BYLINE:(.+),?.*SECTION/)
	if (author) Z.debug (author[1])
	item.date = date;
	item.title = title;
	
	item.complete();
}