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
	"lastUpdated": "2012-03-09 23:47:03"
}

// #################################
// #### Local utility functions ####
// #################################

var itemRe = new RegExp('.*/([0-9]{8})[a-z]{1}[0-9]{1}[a-z]{1}[0-9]{2}[a-z]{1}[0-9]{1}[a-z]{2}[0-9]{6}c\.html');


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
	var type, availableItems, xpath, found, nodes, headline, pos, myurl, m, items, title;
	type = detectWeb(doc, url);
	if (type === "multiple") {
		availableItems = {};
		if (url.match(/^http:\/\/search\.mdn\.mainichi\.jp\/result\?/)){
			xpath = '//div[@class="ResultTitle"]/a[contains(@href, "mdn.mainichi.jp")]';
		} else {
			xpath = '//h2[@class="NewsTitle"]/a[@href]|//ul[@class="Mark"]/li/a[@href]';
		}
		nodes = doc.evaluate(xpath, doc, null, XPathResult.ANY_TYPE, null);
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
			items = Zotero.selectItems(availableItems);
			for (myurl in items) {
				if (items.hasOwnProperty(myurl)) {
					scrapeAndParse(myurl, availableItems[myurl]);
				}
			}
		}
	} else if (type === "newspaperArticle") {
		xpath = '//h2[@class="NewsTitle"]';
		nodes = doc.evaluate(xpath, doc, null, XPathResult.ANY_TYPE, null);
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
		"url": "http://search.mdn.mainichi.jp/result?p=kyoto&st=s",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://mdn.mainichi.jp/mdnnews/news/20120225p2a00m0na015000c.html",
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
						"url": "http://mdn.mainichi.jp/mdnnews/news/20120225p2a00m0na015000c.html"
					}
				],
				"title": "Japan's food self-sufficiency: mixture of pessimism and optimism",
				"publicationTitle": "Mainichi Daily News",
				"edition": "online edition",
				"url": "http://mdn.mainichi.jp/mdnnews/news/20120225p2a00m0na015000c.html",
				"date": "2012-02-25",
				"libraryCatalog": "Mainichi Daily News",
				"accessDate": "CURRENT_TIMESTAMP",
				"shortTitle": "Japan's food self-sufficiency"
			}
		]
	}
]
/** END TEST CASES **/