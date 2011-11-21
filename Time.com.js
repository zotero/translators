{
	"translatorID": "d9be934c-edb9-490c-a88d-34e2ee106cd7",
	"label": "Time.com",
	"creator": "Michael Berkowitz",
	"target": "^https?://www\\.time\\.com/time/",
	"minVersion": "1.0.0b4.r5",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "g",
	"lastUpdated": "2011-11-17 15:34:32"
}

function detectWeb(doc, url) {
	if (url.match(/results\.html/)) {
		return "multiple";
	} else {
		var namespace = doc.documentElement.namespaceURI;
		var nsResolver = namespace ? function(prefix) {
			if (prefix == "x") return namespace; else return null;
		} : null;
		
		var xpath = '//meta[@name="byline"]';
		var xpath2 = '//div[@class="byline"]';
		var xpath3 = '//div[@class="copy"]/div[@class="byline"]';
		if ((doc.evaluate(xpath, doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext() || doc.evaluate(xpath2, doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext() || doc.evaluate(xpath3, doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext()) ) {
			if (url.substr(-4,4) == "html") {
				return "magazineArticle";
			}
		}
	}
}


function associateMeta(newItem, metaTags, field, zoteroField) {
	if (metaTags[field]) {
		newItem[zoteroField] = Zotero.Utilities.trimInternal(metaTags[field]);
	}
}

function scrape(doc, url) {
	var newItem = new Zotero.Item("magazineArticle");
	newItem.publicationTitle = "Time";
	newItem.ISSN = "0040-718X";
	newItem.url = doc.location.href;
	var metaTags = new Object();
	
	var metaTagHTML = doc.getElementsByTagName("meta")
	for (var i = 0 ; i < metaTagHTML.length ; i++) {
		metaTags[metaTagHTML[i].getAttribute("name")] = metaTagHTML[i].getAttribute("content");
	}
	
	if (metaTags["head"]) {
		associateMeta(newItem, metaTags, "head", "title");
	} else  if (doc.title.length > 7) {
		newItem.title = doc.title.substr(0, doc.title.length - 7); 
	} else {
		newItem.title = "No Title";
	}
	
	if (metaTags["description"]) {
		associateMeta(newItem, metaTags, "description", "abstractNote");
	}
	
	 if (metaTags["date"]) {
		 var date = metaTags["date"];
		 var months = new Object();
		 	months["jan"] = "January";
		 	months["feb"] = "February";
		 	months["mar"] = "March";
		 	months["apr"] = "April";
		 	months["may"] = "May";
		 	months["jun"] = "June";
		 	months["jul"] = "July";
		 	months["aug"] = "August";
		 	months["sep"] = "September";
		 	months["oct"] = "October";
		 	months["nov"] = "November";
		 	months["dec"] = "December";
		 date = date.split(".").join("").split(", ").slice(1);
		 date[0] = months[date[0].split(" ")[0].toLowerCase()] + " " + date[0].split(" ")[1];
		 newItem.date = date.join(", ");
	 }
	if (metaTags["keywords"]) {
		newItem.tags = Zotero.Utilities.trimInternal(metaTags["keywords"]).split(", ");
		for (var i in newItem.tags) {
			if (newItem.tags[i] == "" || newItem.tags[i] == " ") {
				break;
			} else {
				var words = newItem.tags[i].split(" ");
				for (var j = 0 ; j < words.length ; j++) {
					Zotero.debug(words[j]);
					if (words[j][0] == words[j][0].toLowerCase() && words[j][0]) {
						words[j] = words[j][0].toUpperCase() + words[j].substr(1).toLowerCase();
					}
				}
			} 
			newItem.tags[i] = words.join(" ");
		}
	}
	
	if (metaTags["byline"]) {
		var byline = Zotero.Utilities.trimInternal(metaTags["byline"]);
		var byline1 = byline.split(" and ");
		for (var i = 0 ; i < byline1.length ; i++) {
			var byline2 = byline1[i].split("/");
			for (var j = 0 ; j < byline2.length ; j++) {
				byline2[j] = Zotero.Utilities.trimInternal(byline2[j]);
				if (byline2[j].indexOf(" ") == -1) {
					if (byline2[j].length == 2) {
						newItem.extra = byline2[j];
					} else {
						newItem.extra = byline2[j][0].toUpperCase() + byline2[j].substr(1).toLowerCase();
					}
				} else {
					byline3 = byline2[j].split(" ");
					for (var x = 0 ; x < byline3.length ; x++) {
						byline3[x] = byline3[x][0].toUpperCase() + byline3[x].substr(1).toLowerCase();
					}
					byline3 = byline3.join(" ");
					newItem.creators.push(Zotero.Utilities.cleanAuthor(byline3, "author"));
				}
			}
		}
	}
	newItem.attachments.push({document:doc, title:doc.title});
	newItem.complete();
}


function doWeb(doc, url) {
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
		if (prefix == "x") return namespace; else return null;
	} : null;
	
	var urls = new Array();
	if (url.match(/results\.html/)) {
		var items = new Array();
		var items = Zotero.Utilities.getItemArray(doc, doc.getElementsByTagName("h3"), '^http://www.time.com/time/.*\.html$');

		items = Zotero.selectItems(items);
	
		if (!items) {
			return true;
		}
		
		for (var i in items) {
			if (i.match("covers") == null) {
				urls.push(i);
			}
		}
	} else if (doc.evaluate('//meta[@name="byline"]', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext() || doc.evaluate('//div[@class="byline"]', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext() || doc.evaluate('//div[@class="copy"]/div[@class="byline"]', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext() ) {
		urls.push(doc.location.href);
	}
	Zotero.Utilities.processDocuments(urls, function(newDoc) {
		scrape(newDoc);
	}, function() { Zotero.done(); } );
	Zotero.wait();
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.time.com/time/nation/article/0,8599,2099187,00.html",
		"items": [
			{
				"itemType": "magazineArticle",
				"creators": [
					{
						"firstName": "Josh",
						"lastName": "Sanburn",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"Post Offices",
					"Postal Service",
					"USPS",
					"United States Postal Service"
				],
				"seeAlso": [],
				"attachments": [
					{
						"document": {
							"location": {}
						},
						"title": "Death of U.S. Postal Service: Many Jobs, Locations at Risk - TIME"
					}
				],
				"publicationTitle": "Time",
				"ISSN": "0040-718X",
				"url": "http://www.time.com/time/nation/article/0,8599,2099187,00.html",
				"title": "How the U.S. Postal Service Fell Apart",
				"abstractNote": "Battling debilitating congressional mandates and competition online, the USPS is closing thousands of post offices and struggling to find a place in the modern world. But there are people behind the scenes trying to save this American institution",
				"date": "November 17, 2011",
				"libraryCatalog": "Time.com",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://search.time.com/results.html?N=0&Nty=1&p=0&cmd=tags&srchCat=Full+Archive&Ntt=labor+union&x=0&y=0",
		"items": "multiple"
	}
]
/** END TEST CASES **/