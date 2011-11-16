{
	"translatorID": "b56f856e-934e-4b46-bc58-d61dccc9f32f",
	"label": "Mainichi Daily News",
	"creator": "Frank Bennett",
	"target": "^http://(?:search\\.)*mdn\\.mainichi\\.jp/(?:$|result\\?|mdnnews/|perspectives/|features/|arts/|travel/)",
	"minVersion": "2.0b7",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "g",
	"lastUpdated": "2011-11-08 21:08:22"
}

// #################################
// #### Local utility functions ####
// #################################

var itemRe = new RegExp('.*/([0-9]{8})[a-z]{1}[0-9]{1}[a-z]{1}[0-9]{2}[a-z]{1}[0-9]{1}[a-z]{2}[0-9]{6}c\.html');

var getResolver = function (doc) {
	var namespace, resolver;
	namespace = doc.documentElement.namespaceURI;
	if (namespace) {
		resolver = function(prefix) {
			if (prefix == 'x') {
				return namespace;
			} else {
				return null;
			}
		};
	} else {
		resolver = null;
	}
	return resolver;
};

var cleanUp = function (str) {
	var ret;
	ret = str.replace("\u00a0", " ", "g").replace("\n", " ", "g");
	ret = ret.replace(/^\s+/, "").replace(/\s+$/, "").replace(/\s+/g, " ");
	ret = ret.replace(/\|.*/, "").replace(/<[^>]+>/g, "");;
	ret = Zotero.Utilities.unescapeHTML(ret);
	return ret;
}


// #########################
// ##### API functions #####
// #########################

var detectWeb = function (doc, url) {
	if (itemRe.test(doc.location.href)) {
		return "newspaperArticle";
	} else {
		return "multiple";
	}
}

var doWeb = function (doc, url) {
	var type, nsResolver, availableItems, xpath, found, nodes, headline, pos, myurl, m, items, title;
	nsResolver = getResolver(doc);
	type = detectWeb(doc, url);
	if (type === "multiple") {
		availableItems = {};
		if (url.match(/^http:\/\/search\.mdn\.mainichi\.jp\/result\?/)){
			xpath = '//div[@class="ResultTitle"]/a[contains(@href, "mdn.mainichi.jp")]';
		} else {
			xpath = '//h2[@class="NewsTitle"]/a[@href]|//ul[@class="Mark"]/li/a[@href]';
		}
		nodes = doc.evaluate(xpath, doc, nsResolver, XPathResult.ANY_TYPE, null);
		found = nodes.iterateNext();
		while (found) {
			if (!itemRe.test(found.href)) {
				found = nodes.iterateNext();
				continue;
			}
			headline = found.textContent;
			headline = cleanUp(headline);
			availableItems[found.href] = headline;
			found = nodes.iterateNext();
		}
		if (availableItems!=null) {
			Zotero.debug("test")
			items = Zotero.selectItems(availableItems);
			for (myurl in items) {
				if (items.hasOwnProperty(myurl)) {
					scrapeAndParse(myurl, availableItems[myurl]);
				}
			}
		}
	} else if (type === "newspaperArticle") {
		xpath = '//h2[@class="NewsTitle"]';
		nodes = doc.evaluate(xpath, doc, nsResolver, XPathResult.ANY_TYPE, null);
		title = nodes.iterateNext();
		if (title) {
			title = cleanUp(title.textContent);
			scrapeAndParse(url, title);
		}
	}
};

// ############################
// ##### Scraper function #####
// ############################

var scrapeAndParse = function (url, title) {
	var item, mytxt, m, val;
	item = new Zotero.Item("newspaperArticle");
	item.title = title;
	item.publicationTitle = "Mainichi Daily News";
	item.edition = "online edition";
	item.url = url;
	m = itemRe.exec(url);
	if (m) {
		var year = m[1].slice(0,4);
		var month = m[1].slice(4,6);
		var day = m[1].slice(6,8);
		item.date = [year, month, day].join("-");
	}
	item.attachments.push({title:"Mainichi Daily News snapshot", mimeType:"text/html", url:url});
	item.complete();
};
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://mdn.mainichi.jp/mdnnews/national/news/20111108p2g00m0dm122000c.html",
		"items": [
			{
				"itemType": "newspaperArticle",
				"creators": [],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Mainichi Daily News snapshot",
						"mimeType": "text/html",
						"url": "http://mdn.mainichi.jp/mdnnews/national/news/20111108p2g00m0dm122000c.html"
					}
				],
				"title": "Principals, vice principals, senior teachers seek demotion",
				"publicationTitle": "Mainichi Daily News",
				"edition": "online edition",
				"url": "http://mdn.mainichi.jp/mdnnews/national/news/20111108p2g00m0dm122000c.html",
				"date": "2011-11-08",
				"libraryCatalog": "Mainichi Daily News",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://search.mdn.mainichi.jp/result?p=kyoto&st=s",
		"items": "multiple"
	}
]
/** END TEST CASES **/