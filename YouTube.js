{
	"translatorID": "d3b1d34c-f8a1-43bb-9dd6-27aa6403b217",
	"label": "YouTube",
	"creator": "Sean Takats, Michael Berkowitz, Matt Burton and Rintze Zelle",
	"target": "https?://[^/]*youtube\\.com\\/",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "g",
	"lastUpdated": "2011-11-21 19:25:19"
}

function detectWeb(doc, url){
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
			if (prefix == 'x') return namespace; else return null;
		} : null;
	
	
	/*var xpath = '//input[@type="hidden" and @name="video_id"]';
	if(doc.evaluate(xpath, doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext()) {
		return "videoRecording";
	}*/
	if (url.match(/\/watch\?(?:.*)v=([0-9a-zA-Z]+)/)) {
		return "videoRecording";
	}
	//Search results
	if (doc.evaluate('//div[@class="result-item-main-content"]//a[contains(@href, "/watch?v=")]', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext()){
		return "multiple";
	}
	//playlists
	if (doc.evaluate('//div[starts-with(@class, "title")]/a[contains(@href, "/watch?v=")]', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext()){	
		return "multiple";
	}
	// still used?
	if (doc.evaluate('//div[@class="vltitle"]/div[@class="vlshortTitle"]/a[contains(@href, "/watch?v=")]', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext()){	
		return "multiple";
	}
	
}

function doWeb(doc, url){
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
			if (prefix == 'x') return namespace; else return null;
		} : null;
	var host = doc.location.host;
	var video_ids = new Array();
	var elmt, video_id;
	var videoRe = /\/watch\?(?:.*)v=([0-9a-zA-Z_-]+)/;
	if(video_id = videoRe.exec(url)) {
		//single video
		video_ids.push(video_id[1]);
		getData(video_ids, host);
	} else {
		// multiple videos
		var items = new Object();
		// search results and community/user pages
		if (elmt = doc.evaluate('//div[@class="result-item-main-content"]//a[contains(@href, "/watch?v=")]', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext()){
			elmts = doc.evaluate('//div[@class="result-item-main-content"]//a[contains(@href, "/watch?v=")]', doc, nsResolver, XPathResult.ANY_TYPE, null);
		} 
		// playlists
		else if (doc.evaluate('//div[starts-with(@class, "title")]/a[contains(@href, "/watch?v=")]', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext()){
			elmts = doc.evaluate('//div[starts-with(@class, "title")]/a[contains(@href, "/watch?v=")]', doc, nsResolver, XPathResult.ANY_TYPE, null);
		} 
		// still used?
		else if (doc.evaluate('//div[@class="vltitle"]/div[@class="vlshortTitle"]/a[contains(@href, "/watch?v=")]', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext()){
			elmts = doc.evaluate('//div[@class="vltitle"]/div[@class="vlshortTitle"]/a[contains(@href, "/watch?v=")]', doc, nsResolver, XPathResult.ANY_TYPE, null);
		}
		while (elmt = elmts.iterateNext()){
			var title = elmt.textContent;
			title = Zotero.Utilities.trimInternal(title);
			var link = elmt.href;
			//Zotero.debug(link);
			var video_id = videoRe.exec(link)[1];
			items[video_id] = title;
		}
		
		Zotero.selectItems(items, function (items) {
			if (!items) {
				return true;
			}
			for (var i in items) {
				video_ids.push(i);
			}
			getData(video_ids, host);
		});
	}			
}

function getData(ids, host){
	var uris = new Array();	
	var url = "http://gdata.youtube.com/feeds/videos/";
	for each(var id in ids){
		uris.push(url+id);
	}
	Zotero.Utilities.HTTP.doGet(uris, function(text) {	
		var ns = {"default":"http://www.w3.org/2005/Atom", "media":"http://search.yahoo.com/mrss/", "yt":"http://gdata.youtube.com/schemas/2007"};
		
		var parser = new DOMParser();
		var doc = parser.parseFromString(text, "text/xml");

		var newItem = new Zotero.Item("videoRecording");
		
		var title;
		if ((title = ZU.xpathText(doc, '//media:group/media:title', ns))) {
			newItem.title = ZU.trimInternal(title);
		} else {
			newItem.title = " ";
		}
		var keywords;
		if ((keywords = ZU.xpathText(doc, '//media:group/media:keywords', ns))) {
			keywords = keywords.split(",");
			for each(var tag in keywords){
				newItem.tags.push(Zotero.Utilities.trimInternal(tag));
			}
		}
		var date;
		if ((date = ZU.xpathText(doc, '//default:published', ns))) {
			newItem.date = date.substr(0, 10);
		}
		var author;
		if ((author = ZU.xpathText(doc, '//default:author/default:name', ns))) {
			author = ZU.cleanAuthor(author, "contributor", true);
			if (!author.firstName) {
				author.fieldMode = 1;
			}
			newItem.creators.push(author);
		}
		var url;
		if ((url = ZU.xpathText(doc, '//media:group/media:player/@url', ns))) {
			newItem.url = url;
		}
		var runningTime;
		if ((runningTime = ZU.xpathText(doc, '//media:group/yt:duration/@seconds', ns))) {
			newItem.runningTime = runningTime + " seconds";
		}
		var description;
		if ((description = ZU.xpathText(doc, '//media:group/media:description', ns))) {
			newItem.abstractNote = description;
		}
		newItem.complete();
		Zotero.done();
	});
	Zotero.wait();
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.youtube.com/watch?v=ggFKLxAQBbc&feature=feedrec_grec_index",
		"items": [
			{
				"itemType": "videoRecording",
				"creators": [
					{
						"lastName": "carrieannefan1",
						"creatorType": "contributor",
						"fieldMode": 1
					}
				],
				"notes": [],
				"tags": [
					"the",
					"matrix",
					"keanu",
					"reeves",
					"carrie",
					"anne",
					"moss",
					"bullet",
					"time",
					"neo",
					"trinity",
					"help",
					"agent",
					"rooftop",
					"scene",
					"hd",
					"hq",
					"high",
					"definition",
					"quality"
				],
				"seeAlso": [],
				"attachments": [],
				"title": "The Matrix: Dodge this (HD)",
				"date": "2010-04-12",
				"url": "http://www.youtube.com/watch?v=ggFKLxAQBbc&feature=youtube_gdata_player",
				"runningTime": "70 seconds",
				"abstractNote": "Famous Matrix scene.",
				"libraryCatalog": "YouTube",
				"shortTitle": "The Matrix"
			}
		]
	}
]
/** END TEST CASES **/