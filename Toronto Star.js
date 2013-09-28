{
	"translatorID": "6b0b11a6-9b77-4b49-b768-6b715792aa37",
	"label": "Toronto Star",
	"creator": "Adam Crymble, Avram Lyon",
	"target": "^http://www\\.thestar\\.com",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2013-09-27 23:48:52"
}

function detectWeb(doc, url) {
	if (url.indexOf("search") != -1 && url.indexOf("classifieds") == -1) {
		return "multiple";
	} else if (ZU.xpathText(doc, '//div[@class="article-headline"]/h2|//div[@class="article-headline"]/h1')) {
		return "newspaperArticle";
	}
}

//Toronto Star translator. code by Adam Crymble

function scrape(doc, url) {
	var newItem = new Zotero.Item("newspaperArticle");

	var date = ZU.xpathText(doc, '//span[@class="published-date"]');
	if(date) {
		newItem.date = date.replace(/Published on/,'').replace(/[,\n\t\s]*$/, "").trim();
	}
	
	newItem.abstractNote = ZU.xpathText(doc, '//meta[@name="description"]/@content');
	var comma = false;
	var authorNode = ZU.xpathText(doc, '//div[@class="article-authors"]/span[@class="credit"]');
	if (authorNode) authorNode = authorNode.split(/\s*,\s*/);
	var authorNode2 =ZU.xpathText(doc, '//span[@class="columnistLabel"]/a');
	if (authorNode2) {
		authorNode = authorNode2.split(/\s*[;,]\s*/);
		 comma = false;}
	var author;
	if (authorNode){
			for(var i=0, n=authorNode.length; i<n; i++) {
			author = authorNode[i];
			newItem.creators.push(ZU.cleanAuthor(author, "author", comma));
		}
	}
	newItem.title = ZU.xpathText(doc, '//div[@class="article-headline"]/h2');
	if (!newItem.title) newItem.title = ZU.xpathText(doc, '//div[@class="article-headline"]/h1');

	// The section is the first listed keyword
	var keywords = ZU.xpath(doc, '//meta[@name="Keywords"][@content]')[0];
	if (keywords) newItem.section = keywords.textContent.split(',')[0];

	newItem.attachments.push({document:doc, title:"Toronto Star Snapshot", mimeType:'text/html'});

	newItem.url = url;
	newItem.publicationTitle = "The Toronto Star";
	newItem.ISSN = "0319-0781";

	newItem.complete();
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		var items = ZU.getItemArray(doc, ZU.xpath(doc, '//div[contains(@class, "article-list")]'), /thestar\.com/);
		Zotero.selectItems(items, function(selectedItems) {
			if(!selectedItems) return true;
			var articles = new Array();
			for (var i in selectedItems) {
				articles.push(i);
			}
			ZU.processDocuments(articles, scrape);
		});
	} else {
		scrape(doc, url);
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.thestar.com/news/world/2010/01/26/france_should_ban_muslim_veils_commission_says.html",
		"items": [
			{
				"itemType": "newspaperArticle",
				"creators": [],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Toronto Star Snapshot",
						"mimeType": "text/html"
					}
				],
				"date": "Tue Jan 26 2010",
				"abstractNote": "France's National Assembly should pass a resolution denouncing full Muslim face veils and then vote the strictest law possible to ban women from wearing them, a parliamentary commission proposed on Tuesday.",
				"title": "France's National Assembly should pass a resolution denouncing full Muslim face veils and then vote the strictest law possible to ban women from wearing them, a parliamentary commission proposed on Tuesday.",
				"url": "http://www.thestar.com/news/world/2010/01/26/france_should_ban_muslim_veils_commission_says.html",
				"publicationTitle": "The Toronto Star",
				"ISSN": "0319-0781",
				"libraryCatalog": "Toronto Star",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.thestar.com/business/tech_news/2011/07/29/hamilton_ontario_should_reconsider_offshore_wind.html",
		"items": [
			{
				"itemType": "newspaperArticle",
				"creators": [
					{
						"firstName": "Tyler",
						"lastName": "Hamilton",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Toronto Star Snapshot",
						"mimeType": "text/html"
					}
				],
				"date": "Fri Jul 29 2011",
				"abstractNote": "There&rsquo;s no reason why Ontario can&rsquo;t regain the momentum it once had.",
				"title": "There’s no reason why Ontario can’t regain the momentum it once had.",
				"url": "http://www.thestar.com/business/tech_news/2011/07/29/hamilton_ontario_should_reconsider_offshore_wind.html",
				"publicationTitle": "The Toronto Star",
				"ISSN": "0319-0781",
				"libraryCatalog": "Toronto Star",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.thestar.com/news/canada/2012/07/03/bev_oda_resigns_as_international_cooperation_minister_conservative_mp_for_durham.html",
		"items": [
			{
				"itemType": "newspaperArticle",
				"creators": [
					{
						"firstName": "Joanna",
						"lastName": "Smith",
						"creatorType": "author"
					},
					{
						"firstName": "Allan",
						"lastName": "Woods",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Toronto Star Snapshot",
						"mimeType": "text/html"
					}
				],
				"date": "Tue Jul 03 2012",
				"abstractNote": "Bev Oda will leave politics later this month following a series of scandals over her travel expenses and funding decisions.",
				"title": "Bev Oda will leave politics later this month following a series of scandals over her travel expenses and funding decisions.",
				"url": "http://www.thestar.com/news/canada/2012/07/03/bev_oda_resigns_as_international_cooperation_minister_conservative_mp_for_durham.html",
				"publicationTitle": "The Toronto Star",
				"ISSN": "0319-0781",
				"libraryCatalog": "Toronto Star",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.thestar.com/search.html?q=labor&contenttype=articles%2Cvideos%2Cslideshows",
		"items": "multiple"
	}
]
/** END TEST CASES **/