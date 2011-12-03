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
	"lastUpdated": "2011-12-03 00:04:20"
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
		//tested for:
		//search: http://www.flickr.com/search/?q=test
		//galleries: http://www.flickr.com/photos/lomokev/galleries/72157623433999749/
		//archives: http://www.flickr.com/photos/lomokev/archives/date-taken/2003/12/04/
		//favorites: http://www.flickr.com/photos/lomokev/favorites/
		//photostream: http://www.flickr.com/photos/lomokev/with/4952001059/
		//set: http://www.flickr.com/photos/lomokev/sets/502509/
		//tag: http://www.flickr.com/photos/tags/bmw/
		if (doc.evaluate('//span[contains(@class, "photo_container")]', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext()){
			
			//some search results are hidden ("display: none")
			//videos have a second <a/> element ("a[1]")
			elmts = doc.evaluate('//div[not(contains(@style, "display: none"))]/*/span[contains(@class, "photo_container")]/a[1]', doc, nsResolver, XPathResult.ANY_TYPE, null);
			while (elmt = elmts.iterateNext()){
				var title = elmt.title;
				//in photostreams, the <a/> element doesn't have a title attribute
				if (title == "") {
					title = elmt.getElementsByTagName("img")[0].alt;
				}
				title = ZU.trimInternal(title);
				var link = elmt.href;
				var photo_id = link.match(photoRe)[1];
				items[photo_id] = title;
			}
		}
		Zotero.selectItems(items, function(items) {
			if(!items) return true;
			for(var i in items) {
				photo_ids.push(i);
			}
		});
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
			title = ZU.trimInternal(title);
			newItem.title = title;
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
			newItem.abstractNote = description;
		}
		
		// get attachment code
		var uri = "http://api.flickr.com/services/rest/?method=flickr.photos.getSizes&api_key="+key+"&photo_id="+photo_id;
		Zotero.Utilities.HTTP.doGet(uri, function(text) {
			var parser = new DOMParser();
			var doc = parser.parseFromString(text, "text/xml");
			var attachmentUri = ZU.xpathText(doc, '//size[last()]/@source');
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