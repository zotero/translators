{
	"translatorID": "ce7a3727-d184-407f-ac12-52837f3361ff",
	"label": "NYTimes.com",
	"creator": "Simon Kornblith",
	"target": "^https?://(?:query\\.nytimes\\.com/(?:search|gst)/(?:alternate/)?|(?:select\\.|www\\.)?nytimes\\.com/.)",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsv",
	"lastUpdated": "2012-07-12 23:21:02"
}

function detectWeb(doc, url) {
	// Check for search results
	var searchResults = doc.evaluate('//div[@id="search_results"] |//div[@id="searchResults"] |//div[@id="srchContent"]', doc, null, XPathResult.ANY_TYPE, null).iterateNext();
	if (searchResults) return "multiple";

	// Check for article meta tags
	var metaTags = doc.getElementsByTagName("meta");
	var haveHdl = false;
	var haveByl = false;
	for (var i in metaTags) {
		if (metaTags[i].name === "hdl") {
			haveHdl = true;
		} else if (metaTags[i].name == "byl") {
			haveByl = true;
		}
		if (haveHdl && haveByl) return "newspaperArticle";
	}
	return false;
}

function associateMeta(newItem, metaTags, field, zoteroField) {
	if (metaTags[field]) {
		newItem[zoteroField] = metaTags[field];
	}
}

function scrape(doc, url) {
	var namespace = null;
	var nsResolver = namespace ?
	function (prefix) {
		if (prefix == 'x') return namespace;
		else return null;
	} : null;

	var newItem = new Zotero.Item("newspaperArticle");
	newItem.publicationTitle = "The New York Times";
	newItem.ISSN = "0362-4331";

	var metaTags = new Object();
	if (url != undefined) {

		newItem.url = url;
		var metaTagRe = /<meta[^>]*>/gi;
		var nameRe = /name="([^"]+)"/i;
		var contentRe = /content="([^"]+)"/i;
		var m = doc.match(metaTagRe);

		if (!m) {
			return;
		}

		for (var i = 0; i < m.length; i++) {
			var name = nameRe.exec(m[i]);
			var content = contentRe.exec(m[i]);
			if (name && content) {
				metaTags[name[1]] = content[1];
			}
		}

		if (!metaTags["hdl"]) {
			return;
		}
		// We want to get everything on one page
		newItem.attachments.push({
			url: url.replace(/\.html\??([^/]*)(pagewanted=[^&]*)?([^/]*)$/, ".html?pagewanted=all&$1$2"),
			title: "New York Times Snapshot",
			mimeType: "text/html"
		});
	} else {
		newItem.url = doc.location.href;
		var metaTagHTML = doc.getElementsByTagName("meta");
		for (var i = 0; i < metaTagHTML.length; i++) {
			var key = metaTagHTML[i].getAttribute("name");
			var value = metaTagHTML[i].getAttribute("content");
			if (key && value) {
				metaTags[key] = value;
			}
		}
		// Get everything on one page is possible
		var singlePage = false;
		if (!newItem.url.match(/\?pagewanted=all/) && (singlePage = doc.evaluate('//ul[@id="toolsList"]/li[@class="singlePage"]/a', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext())) {
			newItem.attachments.push({
				url: singlePage.href,
				title: "New York Times Snapshot",
				mimeType: "text/html"
			});
		} else {
			newItem.attachments.push({
				document: doc,
				title: "New York Times Snapshot"
			});
		}

	}

	associateMeta(newItem, metaTags, "dat", "date");
	associateMeta(newItem, metaTags, "hdl", "title");
	associateMeta(newItem, metaTags, "dsk", "section");
	associateMeta(newItem, metaTags, "articleid", "accessionNumber");

	if (metaTags["pdate"]) {
		newItem.date = metaTags["pdate"].replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3");
	}

	if (metaTags["byl"]) {
		var author = Zotero.Utilities.trimInternal(metaTags["byl"]);
		if (author.substr(0, 3).toLowerCase() == "by ") {
			author = author.substr(3);
		}

		var authors = author.split(" and ");
		for each(var author in authors) {
			// fix capitalization
			var words = author.split(" ");
			for (var i in words) {
				words[i] = words[i][0].toUpperCase() + words[i].substr(1).toLowerCase();
			}
			author = words.join(" ");

			if (words[0] == "The") {
				newItem.creators.push({
					lastName: author,
					creatorType: "author",
					fieldMode: true
				});
			} else {
				newItem.creators.push(Zotero.Utilities.cleanAuthor(author, "author"));
			}
		}
	}

	if (metaTags["keywords"]) {
		var keywords = metaTags["keywords"];
		newItem.tags = keywords.split(",");
		for (var i in newItem.tags) {
			newItem.tags[i] = newItem.tags[i].replace("  ", ", ");
		}
	}

	// Remove everything after .html from the URL - we want the canonical version
	//but not for historical abstracts, where it's needed
	if (!newItem.url.match(/abstract\.html/)) {
		newItem.url = newItem.url.replace(/\?.+/, '');
	}

	//	get pdf for archive articles - make sure we don't go here if we're getting multiples or regular items
	var pdfxpath = '//div[@class="articleAccess"]/p[@class="button"]/a[contains(@href, "/pdf")]/@href'
	if (!m && ZU.xpathText(doc, pdfxpath) != null) {
		var pdflink = ZU.xpathText(doc, pdfxpath)
		Zotero.Utilities.doGet(pdflink, function (text) {
			var realpdf = text.match(/http\:\/\/article\.archive\.nytimes.+\"/);
			Z.debug("pdflink: " + realpdf)
			if (realpdf) {
				newItem.attachments.push({
					url: realpdf[0].replace(/\"/, ""),
					title: "NY Times Archive PDF",
					mimeType: "application/pdf"
				});
			}
		}, function () {
			newItem.complete();
		});
	} else {
		newItem.complete();
	}

}

function doWeb(doc, url) {
	var searchResults = doc.evaluate('//div[@id="search_results"] |//div[@id="searchResults"]| //div[@id="srchContent"]', doc, null, XPathResult.ANY_TYPE, null).iterateNext();
	if (searchResults) {
		var items = Zotero.Utilities.getItemArray(doc, searchResults, '^http://(?:select\.|www\.)nytimes.com/.*\.html(\\?|$)');

		Zotero.selectItems(items, function (items) {
			if (!items) return true;

			var urls = [];
			for (var i in items) urls.push(i);

			Zotero.Utilities.HTTP.doGet(urls, function (text, response, url) {
				scrape(text, url)
			}, function () {
				Zotero.done();
			}, null);
			Zotero.wait();
		});
	} else {
		scrape(doc);
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://query.nytimes.com/gst/abstract.html?res=F30D15FD3F5813738DDDAC0894DB405B828DF1D3",
		"items": [
			{
				"itemType": "newspaperArticle",
				"creators": [
					{
						"firstName": "Special To The New York",
						"lastName": "Times",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"document": {
							"location": {}
						},
						"title": "New York Times Snapshot"
					},
					{
						"url": "http://article.archive.nytimes.com/1912/03/05/100523320.pdf?AWSAccessKeyId=AKIAJBTN455PTTBQQNRQ&Expires=1327279930&Signature=AmK21Cp20qcYualg%2FLvaT4t7Ypw%3D",
						"title": "NY Times Archive PDF",
						"mimeType": "application/pdf"
					}
				],
				"publicationTitle": "The New York Times",
				"ISSN": "0362-4331",
				"url": "http://query.nytimes.com/gst/abstract.html?res=F30D15FD3F5813738DDDAC0894DB405B828DF1D3",
				"date": "1912-03-05",
				"title": "TWO MONEY INQUIRIES.; Hearings of Trust Charges and Aldrich Plan at the Same Time.",
				"accessionNumber": "100523320",
				"libraryCatalog": "NYTimes.com",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.nytimes.com/2010/08/21/education/21harvard.html?_r=1&scp=1&sq=marc%20hauser&st=cse",
		"items": [
			{
				"itemType": "newspaperArticle",
				"creators": [
					{
						"firstName": "Nicholas",
						"lastName": "Wade",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"Science and Technology",
					"Research",
					"Ethics",
					"Hauser, Marc D",
					"Harvard University"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "New York Times Snapshot"
					}
				],
				"publicationTitle": "The New York Times",
				"ISSN": "0362-4331",
				"url": "http://www.nytimes.com/2010/08/21/education/21harvard.html",
				"date": "2010-08-20",
				"title": "Harvard Finds Marc Hauser Guilty of Scientific Misconduct",
				"section": "Education",
				"accessionNumber": "1248068890906",
				"libraryCatalog": "NYTimes.com",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"defer": true,
		"url": "http://query.nytimes.com/search/sitesearch/#/marc+hauser",
		"items": "multiple"
	}
]
/** END TEST CASES **/