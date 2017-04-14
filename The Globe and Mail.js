{
	"translatorID": "e0234bcf-bc56-4577-aa94-fe86a27f6fd6",
	"label": "The Globe and Mail",
	"creator": "Adam Crymble",
	"target": "^https?://www\\.theglobeandmail\\.com/",
	"minVersion": "1.0.0b4.r5",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2017-04-14 08:24:05"
}

function detectWeb(doc, url) {
	if (url.indexOf("/search/") != -1 && getSearchResults(doc, true)) {
		return "multiple";
	}
	else if (ZU.xpathText(doc, '//article')) {
		return "newspaperArticle";
	}
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//article/h3/a');
	for (var i=0; i<rows.length; i++) {
		var href = rows[i].href;
		var title = ZU.trimInternal(rows[i].textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}


function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (!items) {
				return true;
			}
			var articles = [];
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, scrape);
		});
	} else {
		scrape(doc, url);
	}
}

function scrape(doc, url) {
	
	newItem = new Zotero.Item("newspaperArticle");
	newItem.url = url;

	//get headline
	var title = ZU.xpathText(doc, '//article/h1');
	if (!title) title = ZU.xpathText(doc, '//meta[@property="og:title"]/@content');
	newItem.title = title;

	//get abstract
	newItem.abstractNote = ZU.xpathText(doc, '//meta[@property="og:description"]/@content');
	
	//get date
	var xpathdate_author = '//time[@itemprop="datePublished"]';
	var date = ZU.xpathText(doc, xpathdate_author);
	if (date) {
		newItem.date = ZU.strToISO(date);
	}

	//get author or organization
	var authors = ZU.xpath(doc, '//meta[@itemprop="author"]/@content');
	for (var i in authors){
		newItem.creators.push(ZU.cleanAuthor(authors[i].textContent, "author"));
	}
	if(!authors.length){//need to change
		authors = ZU.xpathText(doc, xpathdate_author);
		if(authors){
			authors_org=authors.substring(0,authors.lastIndexOf("|")-1);
			var regex = /(.*By\s+)(.*)/;
			authors = authors_org.replace(regex, "$2");
			newItem.creators.push({lastName:authors, creatorType: "author", fieldMode: 1})
		}
	}
	
	newItem.language = ZU.xpathText(doc, '//meta[@http-equiv="Content-Language"]/@content');
	
	newItem.section = ZU.xpathText(doc, '//meta[@name="article:type"]/@content');
	
	newItem.attachments = ({
		url: url,
		title: "The Globe and Mail Snapshot",
		mimeType: "text/html"
	});
	newItem.complete();
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.theglobeandmail.com/news/national/sharp-differences-in-career-paths-of-phd-grads-across-fields-ubc-study-finds/article34694435/?reqid=443820d7-b187-4ede-a28a-2d075ac4bd80",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Sharp differences in career paths of PhD grads across fields, UBC study finds",
				"creators": [
					{
						"firstName": "SIMONA",
						"lastName": "CHIOSE",
						"creatorType": "author"
					}
				],
				"date": "2017-04-13",
				"abstractNote": "Multiple studies over the past two years have found that a minority of PhDs become professors",
				"language": "en-ca",
				"libraryCatalog": "The Globe and Mail",
				"section": "news",
				"url": "http://www.theglobeandmail.com/news/national/sharp-differences-in-career-paths-of-phd-grads-across-fields-ubc-study-finds/article34694435/?reqid=443820d7-b187-4ede-a28a-2d075ac4bd80",
				"attachments": {
					"url": "http://www.theglobeandmail.com/news/national/sharp-differences-in-career-paths-of-phd-grads-across-fields-ubc-study-finds/article34694435/?reqid=443820d7-b187-4ede-a28a-2d075ac4bd80",
					"title": "The Globe and Mail Snapshot",
					"mimeType": "text/html"
				},
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.theglobeandmail.com/search/?q=nuclear",
		"items": "multiple"
	}
]
/** END TEST CASES **/