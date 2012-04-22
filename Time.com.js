{
	"translatorID": "d9be934c-edb9-490c-a88d-34e2ee106cd7",
	"label": "Time.com",
	"creator": "Michael Berkowitz",
	"target": "^https?://[^/]*time\\.com/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcs",
	"lastUpdated": "2012-04-22 00:04:37"
}

function detectWeb(doc, url) {
	/* Disabled because Time.com searches use search.time.com, which means
		links are not accessible.
	if (url.indexOf('results.html') != -1) {
		return "multiple";
	} else */
	if ( ZU.xpathText(doc, '//meta[@name="og:type" or @property="og:type"]/@content') == 'article') {
		return "magazineArticle";
	}
}

function scrape(doc, url) {
	var translator = Zotero.loadTranslator('web');
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);

	translator.setHandler('itemDone', function(obj, item) {
		item.itemType = "magazineArticle";
		item.publicationTitle = "Time";
		item.url = url;
		item.ISSN = "0040-718X";

		//authors
		var authors = ZU.xpathText(doc, '/html/head/meta[@name="byline"]/@content');
		if(!authors) authors = ZU.xpathText(doc, '//span[@class="author vcard"]/a', null, ' and ');
		if(authors && authors.trim()) {
			var matches = authors.match(/^\s*([^\/]+?)\s*\/\s*(.+?)\s*$/);
			if(matches) {
				if(matches[1] == 'AP') {
					authors = matches[2];
				} else {
					authors = matches[1];
				}
			}

			authors = authors.split(/ and /i);
			var authArr = new Array();
			for(var i=0, n=authors.length; i<n; i++) {
				authArr.push(ZU.cleanAuthor(ZU.capitalizeTitle(authors[i]), 'author'));
			}
	
			if(authArr.length) {
				item.creators = authArr;
			}
		}

		//keywords
		var keywords = ZU.xpathText(doc, '/html/head/meta[@name="keywords"]/@content');
		if(keywords && keywords.trim()) {
			item.tags = ZU.capitalizeTitle(keywords).split(', ');
		}

		item.complete();
	});

	translator.getTranslatorObject(function(em) {
		em.addCustomFields({
			'description': 'abstractNote',
			'head': 'title',
			'date': 'date'
		});
	});

	translator.translate();
}


function doWeb(doc, url) {
	var urls = new Array();
	if (detectWeb(doc, url) == 'multiple') {
		var origin = doc.location.protocol + '//' + doc.location.host +
			( (doc.location.port) ? ':' + doc.location.port : '' ) + '/';

		var items = ZU.getItemArray(doc, doc.getElementsByTagName("h3"),
				//SOP checking
				'(?:^' + origin + '.*\.html$|^/)', 'covers');

		Zotero.selectItems(items, function(selectedItems) {
			if (!selectedItems) return true;
		
			var urls = new Array();
			for (var i in selectedItems) {
					urls.push(i);
			}
			ZU.processDocuments(urls, function(newDoc) {
				scrape(newDoc, newDoc.location.href);
			});
		});
	} else {
		scrape(doc, url);
	}
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
						"title": "Snapshot"
					}
				],
				"itemID": "http://www.time.com/time/nation/article/0,8599,2099187,00.html",
				"title": "How the U.S. Postal Service Fell Apart",
				"source": "TIME.com",
				"publicationTitle": "Time",
				"url": "http://www.time.com/time/nation/article/0,8599,2099187,00.html",
				"abstractNote": "Battling debilitating congressional mandates and competition online, the USPS is closing thousands of post offices and struggling to find a place in the modern world. But there are people behind the scenes trying to save this American institution",
				"date": "Thursday, Nov. 17, 2011",
				"accessDate": "CURRENT_TIMESTAMP",
				"libraryCatalog": "www.time.com",
				"ISSN": "0040-718X"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.time.com/time/nation/article/0,8599,2108263,00.html",
		"items": [
			{
				"itemType": "magazineArticle",
				"creators": [
					{
						"firstName": "Cary",
						"lastName": "Stemle",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"weather",
					"storm",
					"tornado",
					"henryville",
					"indiana",
					"kentucky",
					"destruction"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Snapshot"
					}
				],
				"itemID": "http://www.time.com/time/nation/article/0,8599,2108263,00.html",
				"title": "On Scene in Indiana and Kentucky: When the Tornadoes Came",
				"source": "TIME.com",
				"publicationTitle": "Time",
				"url": "http://www.time.com/time/nation/article/0,8599,2108263,00.html",
				"abstractNote": "The month of March isn't really the heart of the tornado season but they have come fast and with awesome destruction.",
				"date": "Sunday, Mar. 04, 2012",
				"accessDate": "CURRENT_TIMESTAMP",
				"libraryCatalog": "www.time.com",
				"shortTitle": "On Scene in Indiana and Kentucky",
				"ISSN": "0040-718X"
			}
		]
	},
	{
		"type": "web",
		"url": "http://swampland.time.com/2012/03/04/obama-courts-aipac-before-netanyahu-meeting/?iid=sl-main-lede",
		"items": [
			{
				"itemType": "magazineArticle",
				"creators": [
					{
						"firstName": "Jay",
						"lastName": "Newton-Small",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"barack obama",
					"aipac",
					"bibi",
					"iran",
					"israel",
					"mahmoud ahamadinejad",
					"netanyahu",
					"obama",
					"speech",
					"washington"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Snapshot"
					}
				],
				"itemID": "http://swampland.time.com/2012/03/04/obama-courts-aipac-before-netanyahu-meeting/?iid=sl-main-lede",
				"title": "Obama Courts AIPAC Before Netanyahu Meeting | Swampland | TIME.com",
				"source": "TIME.com",
				"publicationTitle": "Time",
				"url": "http://swampland.time.com/2012/03/04/obama-courts-aipac-before-netanyahu-meeting/?iid=sl-main-lede",
				"abstractNote": "Obama rejected any notion that his administration has not been in Israel's corner. “Over the last three years, as President of the United States, I have kept my commitments to the state of Israel.\" The President then ticked off the number of ways he has supported Israel in the last year.",
				"accessDate": "CURRENT_TIMESTAMP",
				"libraryCatalog": "swampland.time.com",
				"ISSN": "0040-718X"
			}
		]
	},
	{
		"type": "web",
		"url": "http://moneyland.time.com/2012/03/02/struggling-to-stay-afloat-number-of-underwater-homeowners-keeps-on-rising/?iid=pf-main-lede",
		"items": [
			{
				"itemType": "magazineArticle",
				"creators": [
					{
						"firstName": "Brad",
						"lastName": "Tuttle",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"california real estate",
					"economics & policy",
					"florida real estate",
					"mortgages",
					"real estate & homes",
					"real estate markets",
					"the economy",
					"georgia",
					"california",
					"arizona",
					"florida",
					"dallas",
					"baltimore",
					"underwater",
					"nevada",
					"upside-down",
					"sunbelt"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Snapshot"
					}
				],
				"itemID": "http://moneyland.time.com/2012/03/02/struggling-to-stay-afloat-number-of-underwater-homeowners-keeps-on-rising/?iid=pf-main-lede",
				"title": "Underwater Homeowner Numbers Keep on Rising | Moneyland | TIME.com",
				"source": "TIME.com",
				"publicationTitle": "Time",
				"url": "http://moneyland.time.com/2012/03/02/struggling-to-stay-afloat-number-of-underwater-homeowners-keeps-on-rising/?iid=pf-main-lede",
				"abstractNote": "Despite signs that some housing markets are improving, the overall trend is for home prices (and values) to keep dropping—and dropping. As values shrink, more and more homeowners find themselves underwater, the unfortunate scenario in which one owes more on the mortgage than the home is worth.",
				"accessDate": "CURRENT_TIMESTAMP",
				"libraryCatalog": "moneyland.time.com",
				"ISSN": "0040-718X"
			}
		]
	}
]
/** END TEST CASES **/