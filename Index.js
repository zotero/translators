{
	"translatorID": "",
	"label": "Index.hu",
	"creator": "Tacsipacsi",
	"target": "(index|velvet|divany|totalcar|travelo)\\.hu",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 150,
	"inRepository": false,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2016-03-21 08:00:00"
}

function detectWeb(doc, url) {
	if ($("article").length > 1) {
		return "multiple";
	} else if ($("meta[property='og:type']").attr("content") == "article") {
		return "newspaperArticle";
	} else {
		return false;
	}
}

function scrape(doc, url) {
	var newItem = new Zotero.Item("newspaperArticle");
	var metaTags = doc.getElementsByTagName("meta");
	var metaLength = metaTags.length;
	for (var i=0; i<metaLength; i++) {
		var attr = metaTags[i].attributes;
		var name;
		if (attr.name) {
			name = attr.name.value;
		} else if (attr.property) {
			name = attr.property.value;
		} else {
			continue;
		}
		var content = attr.content.value;
		switch (name) {
			case 'og:url':
				newItem.url = content;
				break;
			case 'og:title':
				newItem.title = content;
				break;
			case 'og:description':
				newItem.abstract = content;
				break;
			case 'i:publication':
				newItem.date = content;
				break;
			case 'author':
				newItem.creators.push({
					"lastName": content,
					"creatorType": "author"
				});
				break;
		}
		newItem.language = 'hu-HU';
		newItem.publisher = 'Index.hu';
	}
}

function scrapeMulti(tag, doc) {
	var newItem = new Zotero.Item("newspaperArticle");
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		var articleTags = doc.getElementsByTagName("article");
		var articleCount = articleTags.length;
		var articles = [];
		for (var i=0; i<articleCount; i++) {
			var tag = articleTags[i];
			var a = tag.getElementsByTagName("a");
			if (!a) continue;
			var a0 = a[0]; // there are 1 or more links, all with the same target
			if (!a0) continue;
			var href = a0.href;
			if (!href) continue;
			href = href.replace("http://dex.hu/x.php?id=inxcl&url=", ""); // some redirect site
			href = href.replace(/%3A/g, ":"); // if using the redirect site, real URL is encoded
			href = href.replace(/%2F/g, "/"); // fortunately it uses only base ASCII characters
			articles.push(href);
		}
		Zotero.Utilities.processDocuments(articles, scrape, function () {});
	} else {
		scrapeSingle(doc, url);
	}
}
