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
	"lastUpdated": "2011-11-20 22:58:48"
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
			Zotero.debug(link);
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
		// Strip XML header
		text = text.replace(/<\?xml[^>]*\?>/, "");
		
		default xml namespace = "http://www.w3.org/2005/Atom"; with({});
		var mediaNS = new Namespace("http://search.yahoo.com/mrss/");
		var ytNS = new Namespace("http://gdata.youtube.com/schemas/2007");
		
		// pad xml
		text = "<zotero>"+text+"</zotero>";
		var xml = new XML(text);
		var newItem = new Zotero.Item("videoRecording");
		var title = "";
		var title = xml..mediaNS::title[0].text().toString();
		if (xml..mediaNS::title.length()){
			var title = Zotero.Utilities.trimInternal(xml..mediaNS::title[0].text().toString());
			if (title == ""){
				title = " ";
			}
			newItem.title = title;
		}
		if (xml..mediaNS::keywords.length()){
			var keywords = xml..mediaNS::keywords[0].text().toString();
			keywords = keywords.split(",");
			for each(var tag in keywords){
				newItem.tags.push(Zotero.Utilities.trimInternal(tag));
			}
		}
		if (xml..published.length()){
			var date = xml..published[0].text().toString();
			newItem.date = date.substr(0, 10);
		}
		if (xml..author.name.length()){
			var author = xml..author.name[0].text().toString();
			var creator = Zotero.Utilities.cleanAuthor(author, "contributor", true);
			if (!creator.firstName) {
				creator.fieldMode = 1;
			}
			newItem.creators.push(creator);
		}
		if (xml..mediaNS::player.length()){
			var url = xml..mediaNS::player[0].@url.toString();
			newItem.url = url;
		}
		if (xml..ytNS::duration.length()){
			var runningTime = xml..ytNS::duration[0].@seconds.toString();
			newItem.runningTime = runningTime + " seconds";
		}
		if (xml..mediaNS::description.length()){
			newItem.abstractNote = xml..mediaNS::description[0].text().toString();
		}
		newItem.complete();
		Zotero.done();
	});
	Zotero.wait();
}
/** BEGIN TEST CASES **/
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