{
	"translatorID": "ed28758b-9c39-4e1c-af89-ce1c9202b70f",
	"label": "National Gallery of Art - U.S.A.",
	"creator": "Adam Crymble",
	"target": "^https?://www\\.nga\\.gov/cgi-bin",
	"minVersion": "1.0.0b4.r5",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2013-04-17 19:46:34"
}

function detectWeb(doc, url) {
	var single = 0;
	
	if (doc.evaluate('//div[@class="content"]/img', doc, null, XPathResult.ANY_TYPE, null).iterateNext()){
		var pageType = doc.evaluate('//div[@class="content"]/img', doc, null, XPathResult.ANY_TYPE, null).iterateNext().src;
	}
	
	if (doc.location.href.match("tinfo") || doc.title.match("timage")) {
		single = "1";
	}
	
	
	
	if (doc.title.match("Image") && doc.location.href.match("fcgi")) {
		return "artwork";
	}
	
	if (pageType.match("search_test")) {
		return "multiple";
	} else if (doc.location.href.match("artistid")) {
		return "multiple";
	} else if (single == "1" && pageType.match("collections_test")) {
		return "artwork";
	} 	
}

//National Gallery USA translator. Code by Adam Crymble

function scrape(doc, url) {
	var style = 0;
	var title1;
	var newItem = new Zotero.Item("artwork");
	
	//determines page layout type

	//single entry with thumbnail
	if (doc.evaluate('//div[@class="BodyText"]/table/tbody/tr/td[2]', doc, null, XPathResult.ANY_TYPE, null).iterateNext()) {

		var content = doc.evaluate('//div[@class="BodyText"]/table/tbody/tr/td[2]', doc, null, XPathResult.ANY_TYPE, null).iterateNext().textContent.split(/\n/);
		style = 1;
		
	//single entry without thumbnail (2 variations)		
	} else if  (doc.evaluate('//div[@class="BodyText"]/table/tbody/tr/td', doc, null, XPathResult.ANY_TYPE, null).iterateNext()) {
	
		var content = doc.evaluate('//div[@class="BodyText"]/table/tbody/tr/td', doc, null, XPathResult.ANY_TYPE, null).iterateNext().textContent.split(/\n/);
		
		if (content[1].match("Rendered")) {
			style = 3;
		} else {
			style = 1;
		}

	//single entry with large image.		
	} else if (doc.evaluate('//tr[2]/td[1]', doc, null, XPathResult.ANY_TYPE, null).iterateNext()) {
	
		var content = doc.evaluate('//tr[2]/td[1]', doc, null, XPathResult.ANY_TYPE, null).iterateNext().textContent.split(/\n/);
		style = 2;
	}

	if (style == 1) {
		var artist = content[1].replace(/\s*\(.+/, "");
		newItem.creators.push(Zotero.Utilities.cleanAuthor(artist, "artist"));
	
	
		var titleDate = content[3].split(", ");
		title1 = titleDate[0];
		
		if (titleDate.length>2) {
			for (var j = 1; j < titleDate.length-1; j++) {
				title1 = (title1 + ", " + titleDate[j]);
			}
		}
		newItem.title = title1;
		
		if (titleDate.length > 1) {
			newItem.date = titleDate[titleDate.length-1];	
		}
		
		newItem.extra = ("Aquisition: " + content[content.length-3]);
		newItem.callNumber = content[content.length-2];
		
	} else if (style == 2) {
		Z.debug("style2")
		newItem.creators.push(Zotero.Utilities.cleanAuthor(content[0], "artist"));
		
		var date = content[1].split(", ");
		
		title1 = date[0];
		
		if (date.length>2) {
			for (var j = 1; j < date.length-1; j++) {
				title1 = (title1 + ", " + date[j]);
			}
		}
		
		newItem.title = title1;
				
		newItem.date = date[date.length-1];
		
		var acquisition = content[2].split(/\d/);
		newItem.extra = ("Aquisition: " + acquisition[0]);
		
	} else if (style == 3) {
		
		var titleAuthor = content[1].split("Rendered by ");
		
		newItem.title = titleAuthor[0];
		newItem.creators.push(Zotero.Utilities.cleanAuthor(titleAuthor[1], "artist"));
		
		newItem.callNumber = content[content.length-2];
		
	}
	
	newItem.url = doc.location.href;
	newItem.complete();
}

function doWeb(doc, url) {

	
	var articles = new Array();
	
	if (detectWeb(doc, url) == "multiple") {
		var items = new Object();
		
		if (doc.location.href.match("artistid")) {
			var titles = doc.evaluate('//ul/li/b/a[contains(@href, "object=")]', doc, null, XPathResult.ANY_TYPE, null);
			
		} else {
			var titles = doc.evaluate('//ul/li/a[contains(@href, "object=")]', doc, null, XPathResult.ANY_TYPE, null);
		}
		
		var next_title;
		while (next_title = titles.iterateNext()) {
			if (next_title.textContent.match("image available")) {
				next_title = titles.iterateNext();
			}
			items[next_title.href] = next_title.textContent;
		}
		Zotero.selectItems(items, function (items) {
			if (!items) {
				return true;
			}
			for (var i in items) {
				articles.push(i);
			}
			Zotero.Utilities.processDocuments(articles, scrape, function () {
			});
		});
	} else {
		scrape(doc, url)
	}
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.nga.gov/fcgi-bin/tinfo_f?object=1237",
		"items": [
			{
				"itemType": "artwork",
				"creators": [
					{
						"firstName": "Attributed to Johannes",
						"lastName": "Vermeer",
						"creatorType": "artist"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"title": "Dutch",
				"date": "1632 - 1675",
				"extra": "Aquisition: 1942.9.98",
				"callNumber": "Not on View",
				"url": "http://www.nga.gov/fcgi-bin/tinfo_f?object=1237",
				"libraryCatalog": "National Gallery of Art - U.S.A.",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.nga.gov/cgi-bin/tsearch?artistid=1951",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.nga.gov/cgi-bin/tsearch?artist=&title=flower",
		"items": "multiple"
	}
]
/** END TEST CASES **/