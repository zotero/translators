{
	"translatorID": "5dd22e9a-5124-4942-9b9e-6ee779f1023e",
	"label": "Flickr",
	"creator": "Sean Takats and Rintze Zelle",
	"target": "^http://(?:www\\.)?flickr\\.com/",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "g",
	"lastUpdated": "2011-12-01 23:09:39"
}

function detectWeb(doc, url) {
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
			if (prefix == 'x') return namespace; else return null;
		} : null;

	if (elmt = doc.evaluate('//h1[@property="dc:title" and starts-with(@id, "title_div")]', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext()){		                       
		return "artwork";
	} else if (doc.evaluate('//span[contains(@class, "photo_container")]', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext()){
		return "multiple";
	} else if (doc.evaluate('//div[contains(@class, "StreamView")]', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext()){
		return "multiple";
	} else if (doc.evaluate('//div[@id="setThumbs"]', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext()){
		if (!doc.URL.match('/comments/')) {
			return "multiple";
		}
	} else if (doc.evaluate('//p[@class="StreamList" or @class="UserTagList"]/span/a', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext()){
		return "multiple";
	}
}

function doWeb(doc, url) {
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
			if (prefix == 'x') return namespace; else return null;
		} : null;
		
	var items = new Object();
	var photo_ids = new Array();
	var uris = new Array();
	var key = "3cde2fca0879089abf827c1ec70268b5";

	var elmts;
	var elmt;

// single result
	if (elmt = doc.evaluate('//h1[@property="dc:title" and starts-with(@id, "title_div")]', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext()){		                       
		var photo_id = elmt.id;
		photo_id = photo_id.substr(9);
		photo_ids.push(photo_id);
	} else { //multiple results
		var photoRe = /\/photos\/[^\/]*\/([0-9]+)\//;
//search results
		if (doc.evaluate('//span[contains(@class, "photo_container")]', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext()){
			elmts = doc.evaluate('//div[contains(@style, "display: block")]//span[contains(@class, "photo_container")]/a[1]', doc, nsResolver, XPathResult.ANY_TYPE, null);
			while (elmt = elmts.iterateNext()){
				var title = elmt.title;
				title = ZU.trimInternal(title);
				var link = elmt.href;
				var photo_id = link.match(photoRe)[1];
				items[photo_id] = title;
			}
// photo stream
		} else if (doc.evaluate('//div[contains(@class, "StreamView")]', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext()){
			if (doc.evaluate('//div[contains(@class, "StreamView") and starts-with(@id, "sv_title_")]', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext()) {
				elmts = doc.evaluate('//div[contains(@class, "StreamView") and starts-with(@id, "sv_title_")]', doc, nsResolver, XPathResult.ANY_TYPE, null);
			} else {
				elmts = doc.evaluate('//div[contains(@class, "StreamView") and starts-with(@id, "sv_body_")]', doc, nsResolver, XPathResult.ANY_TYPE, null);
			}
			while (elmt = elmts.iterateNext()){
				//var title = Zotero.Utilities.trimInternal(elmt.textContent);
				var title = elmt.getElementsByTagName("h4")[0].textContent
				var photo_id = elmt.id;
				photo_id = photo_id.replace(/(sv_body_|sv_title_)/,''); 
				Zotero.debug("id="+photo_id)
				items[photo_id] = title;
			}
// photo set
		} else if (doc.evaluate('//div[@class="setThumbs-indv"]/span', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext()){
			elmts = doc.evaluate('//div[@class="setThumbs-indv"]/span', doc, nsResolver, XPathResult.ANY_TYPE, null);
			while (elmt = elmts.iterateNext()){
				var title = doc.evaluate('./a/@title', elmt, nsResolver, XPathResult.ANY_TYPE, null).iterateNext().textContent;
				var photo_id = elmt.id.substr(11);
				items[photo_id] = title;
			}
// tagged with
		} else if (doc.evaluate('//p[@class="StreamList" or @class="UserTagList"]/span/a', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext()){
			var elmts = doc.evaluate('//p[@class="StreamList" or @class="UserTagList"]//a[img]', doc, nsResolver, XPathResult.ANY_TYPE, null);
			while (elmt = elmts.iterateNext()){
				var title = Zotero.Utilities.trimInternal(elmt.title);
				var link = elmt.href;
				var m = photoRe(link);
				var photo_id = m[1];
				items[photo_id] = title;
			}
		}
		items = Zotero.selectItems(items);
		if(!items) return true;
		for(var i in items) {
			photo_ids.push(i);
		}
	}
	for each(var photo_id in photo_ids){
		uris.push("http://api.flickr.com/services/rest/?method=flickr.photos.getInfo&api_key="+key+"&photo_id="+photo_id);
	}
	Zotero.Utilities.HTTP.doGet(uris, function(text) {
		var parser = new DOMParser();
		var doc = parser.parseFromString(text, "text/xml");

		var newItem = new Zotero.Item("artwork");
		
		var title;
		if ((title = ZU.xpathText(doc, '//photo/title'))) {
			newItem.title = ZU.trimInternal(title);
		} else {
			newItem.title = " ";
		}
		var tags;
		if ((tags = ZU.xpath(doc, '//photo//tag'))) {
			for(var i in tags) {
			newItem.tags.push(tags[i].textContent);
			}
		}
		var date;
		if ((date = ZU.xpathText(doc, '//photo/dates/@taken'))) {
			newItem.date = date.substr(0, 10);
		}
		var owner;
		if ((owner = ZU.xpathText(doc, '//photo/owner/@realname') || (owner = ZU.xpathText(doc, '//photo/owner/@username')))) {
			newItem.creators.push(ZU.cleanAuthor(owner, "artist"));
		}
		var url;
		if ((url = ZU.xpathText(doc, '//photo//url'))) {
			newItem.url = url;
		}
		var description;
		if ((description = ZU.xpathText(doc, '//photo/description'))) {
			newItem.url = description;
		}
		
		// get attachment code
		var uri = "http://api.flickr.com/services/rest/?method=flickr.photos.getSizes&api_key="+key+"&photo_id="+photo_id;
		Zotero.Utilities.HTTP.doGet(uri, function(text) {
			var parser = new DOMParser();
			var doc = parser.parseFromString(text, "text/xml");
			var last = ZU.xpath(doc, '//size').length - 1;
			var attachmentUri = ZU.xpathText(doc, '//size['+last+']/@source');
			newItem.attachments = [{title:title, url:attachmentUri}];
			newItem.complete();
		}, function(){Zotero.done();});	
	});
	Zotero.wait();
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.flickr.com/photos/doug88888/3122503680/in/set-72157624194059533",
		"items": [
			{
				"itemType": "artwork",
				"creators": [
					{
						"firstName": "",
						"lastName": "doug88888",
						"creatorType": "artist"
					}
				],
				"notes": [],
				"tags": [
					"nature",
					"plant",
					"living",
					"green",
					"frosty",
					"blue",
					"bokeh",
					"canon",
					"eos",
					"400d",
					"18mm",
					"55mm",
					"gimp",
					"pretty",
					"beautiful",
					"tones",
					"ham",
					"house",
					"richmond",
					"south",
					"west",
					"bloom",
					"flower",
					"grass",
					"strand",
					"lone",
					"isolated",
					"isolation",
					"uk",
					"england",
					"doug88888",
					"southwest",
					"leaf",
					"fall",
					"bright",
					"blossom",
					"fresh",
					"december",
					"dec07",
					"buy",
					"purchase",
					"picture",
					"pictures",
					"image",
					"images",
					"creative",
					"commons"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "The blues and the greens EXPLORED",
						"url": "http://farm4.static.flickr.com/3123/3122503680_739103322d_o.jpg"
					}
				],
				"title": "The blues and the greens EXPLORED",
				"date": "2008-12-07",
				"url": "http://www.flickr.com/photos/doug88888/3122503680/",
				"abstractNote": "More xmas shopping today - gulp.\n\nCheck out my  <a href=\"http://doug88888.blogspot.com/\">blog</a> if you like.",
				"libraryCatalog": "Flickr",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	}
]
/** END TEST CASES **/