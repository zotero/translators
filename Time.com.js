{
	"translatorID": "d9be934c-edb9-490c-a88d-34e2ee106cd7",
	"label": "Time.com",
	"creator": "Michael Berkowitz",
	"target": "^https?://www\\.time\\.com/time/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcs",
	"lastUpdated": "2012-03-04 14:51:13"
}

function detectWeb(doc, url) {
	if (url.indexOf('results.html') != -1) {
		return "multiple";
	} else if ( ZU.xpath(doc, '//meta[@name="byline"]').length ||
				ZU.xpath(doc, '//div[@class="byline"]').length ||
				ZU.xpath(doc, '//div[@class="copy"]/div[@class="byline"]').length ) {
		if (url.substr(-4,4) == "html") {
			return "magazineArticle";
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
	newItem.url = url;

	var translator = Zotero.loadTranslator('web');
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);

	translator.getTranslatorObject(function(em) {
		em.addCustomFields({
			'description': 'abstractNote',
			'head': 'title',
			'date': 'date'
		});
	});

	translator.setHandler('itemDone', function(obj, item) {
		//authors
		var authors = ZU.xpathText(doc, '/html/head/meta[@name="byline"]/@content');
		if(authors && authors.trim()) {
			var end = authors.indexOf('/');
			if(end != -1) {
				authors = authors.slice(0,end).trim();
			}

			authors = authors.split(/ and /i);
			var authArr = new Array();
			for(var i=0, n=authors.length; i<n; i++) {
				authArr.push(ZU.cleanAuthor(authors[i], 'author'));
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

	translator.translate();
}


function doWeb(doc, url) {
	var urls = new Array();
	if (detectWeb(doc, url) == 'multiple') {
		var items = ZU.getItemArray(doc, doc.getElementsByTagName("h3"), '^http://www.time.com/time/.*\.html$', 'covers');

		Zotero.selectItems(items, function(selectedItems) {
			if (!items) return true;
		
			var urls = new Array();
			for (var i in items) {
					urls.push(i);
			}
			Zotero.Utilities.processDocuments(urls, function(newDoc) {
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