{
	"translatorID": "96b9f483-c44d-5784-cdad-ce21b984fe01",
	"label": "Amazon.com",
	"creator": "Sean Takats, Michael Berkowitz, and Simon Kornblith",
	"target": "^https?://(?:www\\.)?amazon",
	"minVersion": "2.1",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsbv",
	"lastUpdated": "2014-02-21 18:21:33"
}

var searchRe = new RegExp('^https?://(?:www\.)?amazon\.([^/]+)/(gp/search/|(gp/)?registry/(wishlist|registry)|exec/obidos/search-handle-url/|s/|s\\?|[^/]+/lm/|gp/richpub/)');
function detectWeb(doc, url) {
	if(searchRe.test(doc.location.href)) {
		return (Zotero.isBookmarklet ? "server" : "multiple");
	} else {
		var xpath = '//input[contains(@name, "ASIN")]';
		if(doc.evaluate(xpath, doc, null, XPathResult.ANY_TYPE, null).iterateNext()) {
			if(Zotero.isBookmarklet) return "server";
			
			var elmt = doc.evaluate('//input[@name="storeID"]', doc, null, XPathResult.ANY_TYPE, null).iterateNext();
			if(elmt) {
				var storeID = elmt.value;
				if (storeID=="books"){
					return "book";
				}
				else if (storeID=="music"){
					return "audioRecording";
				}
				else if (storeID=="dvd"|storeID=="video"|storeID=="movies-tv"){
					return "videoRecording";
				}
				else {
					return "book";
				}
			}
			else {
				return "book";
			}
		}
	}
}

function doWeb(doc, url) {
	var asinRe = new RegExp('/(dp|product)/([^/]+)/');
	if(searchRe.test(doc.location.href)) {
		if(doc.location.href.match(/gp\/richpub\//)){ // Show selector for Guides
			var xpath = '//a[(contains(@href, "ref=cm_syf_dtl_pl") or contains(@href, "ref=cm_syf_dtl_top")) and preceding-sibling::b]';
		} else if (doc.location.href.match(/\/lm\//)) { // Show selector for Lists
			var xpath = '//span[@id="lm_asinlink95"]//a'
		} else { // Show selector for Search results
			var xpath = '//div[@class="productTitle"]/a |//div[@id="init-container"]//span[@class="small productTitle"]//a | //div[@class="wedding" or @class="list-items"]//span[@class="small productTitle"]//a |//a[span[@class="srTitle"]] | //div[@class="title"]/a[@class="title"]| //h3[@class="title"]/a[@class="title"] | //h3[@class="newaps"]/a|//div[@class="a-fixed-right-grid-inner"]//a';
		}
		var availableItems = {};
		var links = ZU.xpath(doc, xpath);
		for(var i=0; i<links.length; i++) {
			var elmt = links[i];
			if(asinRe.test(elmt.href)) {
				availableItems[elmt.href] = elmt.textContent.trim();
			}
		}
		
		Zotero.selectItems(availableItems, function(items) {
			var links = [];
			for(var i in items) links.push(i);
			Zotero.Utilities.processDocuments(links, getItem);
		});

	} else {
		getItem(doc);
	}
}

function addLink(doc, item) {
	item.attachments.push({title:"Amazon.com Link", snapshot:false, mimeType:"text/html", url:doc.location.href});
}

function getItem(doc) {
	// First look for ISBN and use it for search if possible. We do this instead of using
	// the API because it will give us the place published, and because it's less likely to
	// be broken by site changes.
	var isbns = ZU.xpath(doc, '//li[b/text() = "ISBN-13:" or b/text() = "ISBN-10:" or b/text() = "Page Numbers Source ISBN:" or b/text()="ISBN:"]/text() | \
							   //tr[td[1]/span/text() = "ISBN-13" or td[1]/span/text() = "ISBN-10"]/td[2]/span/text()');
	if(isbns.length) {
		Zotero.debug("Retrieving by ISBN search")
		var isbn = isbns[0].nodeValue.trim(),
			translate = Zotero.loadTranslator("search");
					Z.debug(isbn)
		// Use Open WorldCat for now to get around issues with failing search translators
		// in current connector release.
		translate.setTranslator("c73a4a8c-3ef1-4ec8-8229-7531ee384cc4");
		translate.setSearch({"itemType":"book", "ISBN":isbn});
		//translate.setHandler("translators", function(obj, translators) {
		//	translate.setTranslator(translators);
		//	translate.translate();
		//});
		translate.setHandler("itemDone", function(obj, item) {
			addLink(doc, item);
			//remove URL and Extra which only make sense for Worldcat
			item.url = "";
			item.extra = "";
			item.complete();
		});
		translate.setHandler("error", function() {
			scrape(doc);
		});
		translate.translate();
		//translate.getTranslators();
	} else {
		scrape(doc);
	}
}

var DEPARTMENT_TO_TYPE = {
	"Books":"book",
	"Kindle Store":"book",
	"Music":"audioRecording",
	"Amazon MP3 Store":"audioRecording",
	"Movies & TV":"videoRecording",
	"Amazon Instant Video":"videoRecording",
	"Appstore for Android":"computerProgram",
	"Video Games":"computerProgram"
};

var CREATOR = {
	"Actors":"castMember",
	"Directors":"director",
	"Producers":"producer"
};

var DATE = [
	"Original Release Date",
	"DVD Release Date"
];

function scrape(doc) {
	// Scrape HTML for items without ISBNs, because Amazon doesn't provide an easy way for
	// open source projects like us to use their API
	// TODO localize
	Z.debug("ISBN lookup failed. Scraping from Page")		
	var department = ZU.xpathText(doc, '//li[contains(@class, "nav-category-button")]/a').trim(),
		item = new Zotero.Item(DEPARTMENT_TO_TYPE[department] || "book"),
		authors = ZU.xpath(doc, '//span[@class="byLinePipe"]/../span/a | //span[@class="byLinePipe"]/../a \
			| //span[contains(@class, "author")]/span/a[1] | //span[contains(@class, "author")]/a[1]');
	for(var i=0; i<authors.length; i++) {
		var author = authors[i].textContent.trim();
		if(author) item.creators.push(ZU.cleanAuthor(author));
	}
	
	// Old design
	var titleNode = ZU.xpath(doc, '//span[@id="btAsinTitle"]/text()')[0] ||
	// New design encountered 06/30/2013					
		ZU.xpath(doc, '//h1[@id="title"]/span/text()')[0]||
		ZU.xpath(doc, '//h1[@id="title"]/text()')[0]

	item.title = titleNode.nodeValue.replace(/(?: \([^)]*\))+$/, "");

	// Extract info into an array
	var info = {},
		els = ZU.xpath(doc, '//div[@class="content"]/ul/li[b]');
	if(els.length) {
		for(var i=0; i<els.length; i++) {
			var el = els[i],
				key = ZU.xpathText(el, 'b[1]').trim()
			if(key) {
				info[key.replace(/:$/, "")] = el.textContent.substr(key.length+1).trim();
			}
		}
	} else {
		// New design encountered 06/30/2013
		els = ZU.xpath(doc, '//tr[td[@class="a-span3"]][td[@class="a-span9"]]');
		for(var i=0; i<els.length; i++) {
			var el = els[i],
				key = ZU.xpathText(el, 'td[@class="a-span3"]'),
				value = ZU.xpathText(el, 'td[@class="a-span9"]');
			if(key && value) info[key.trim()] = value.trim();
		}
	}
	
	// Date
	for(var i=0; i<DATE.length; i++) {
		item.date = info[DATE[i]];
		if(item.date) break;
	}
	if(!item.date) {
		for(var i in info) {
			var m = /\(([^)]+ [0-9]{4})\)/.exec(info[i]);
			if(m) item.date = m[1];
		}
	}
	
	// Books
	var publisher = info["Publisher"];
	if(publisher) {
		var m = /([^;(]+)(?:; *([^(]*))?( \([^)]*\))?/.exec(publisher);
		item.publisher = m[1];
		item.edition = m[2];
	}
	var pages = info["Print Length"];
	item.ISBN = info["ISBN-10"] || info["ISBN-13"];
	if(pages) item.numPages = parseInt(pages, 10);
	
	// Video
	var clearedCreators = false;
	for(var i in CREATOR) {
		if(info[i]) {
			if(!clearedCreators) {
				item.creators = [];
				clearedCreators = true;
			}
			var creators = info[i].split(/ *, */);
			for(var j=0; j<creators.length; j++) {
				item.creators.push(ZU.cleanAuthor(creators[j], CREATOR[i]));
			}
		}
	}
	item.studio = info["Studio"];
	item.runningTime = info["Run Time"];
	item.language = info["Language"];
	
	// Music
	item.label = info["Label"];
	if(info["Audio CD"]) {
		item.audioRecordingType = "Audio CD";
	} else if(department == "Amazon MP3 Store") {
		item.audioRecordingType = "MP3";
	}
	item.recordingTime = info["Total Length"];
	
	addLink(doc, item);
	
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.amazon.com/Test-William-Sleator/dp/0810989891/ref=sr_1_1?ie=UTF8&qid=1308010556&sr=8-1",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"lastName": "Sleator",
						"firstName": "William",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Amazon.com Link",
						"snapshot": false,
						"mimeType": "text/html"
					}
				],
				"libraryCatalog": "Open WorldCat",
				"language": "English",
				"title": "Test",
				"publisher": "Amulet Books",
				"place": "New York",
				"date": "2010",
				"ISBN": "9780810989894  0810989891",
				"abstractNote": "In the security-obsessed, elitist United States of the near future, where a standardized test determines each person's entire life, a powerful man runs a corrupt empire until seventeen-year-old Ann and other students take the lead in boycotting the test."
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.amazon.com/s/ref=nb_sb_noss?url=search-alias%3Dstripbooks&field-keywords=foot&x=0&y=0",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.amazon.com/Loveless-My-Bloody-Valentine/dp/B000002LRJ/ref=ntt_mus_ep_dpi_1",
		"items": [
			{
				"itemType": "audioRecording",
				"creators": [
					{
						"firstName": "My Bloody",
						"lastName": "Valentine"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Amazon.com Link",
						"snapshot": false,
						"mimeType": "text/html"
					}
				],
				"title": "Loveless",
				"date": "November 5, 1991",
				"label": "Sire / London/Rhino",
				"audioRecordingType": "Audio CD",
				"libraryCatalog": "Amazon.com"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.amazon.com/s?ie=UTF8&keywords=The%20Harvard%20Concise%20Dictionary%20of%20Music%20and%20Musicians&index=blended&Go=o",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.amazon.com/Adaptation-Superbit-Collection-Nicholas-Cage/dp/B00005JLRE/ref=sr_1_1?ie=UTF8&qid=1309683150&sr=8-1",
		"items": [
			{
				"itemType": "videoRecording",
				"creators": [
					{
						"firstName": "Nicolas",
						"lastName": "Cage",
						"creatorType": "castMember"
					},
					{
						"firstName": "Meryl",
						"lastName": "Streep",
						"creatorType": "castMember"
					},
					{
						"firstName": "Chris",
						"lastName": "Cooper",
						"creatorType": "castMember"
					},
					{
						"firstName": "Tilda",
						"lastName": "Swinton",
						"creatorType": "castMember"
					},
					{
						"firstName": "Jay",
						"lastName": "Tavare",
						"creatorType": "castMember"
					},
					{
						"firstName": "Spike",
						"lastName": "Jonze",
						"creatorType": "director"
					},
					{
						"firstName": "Charlie",
						"lastName": "Kaufman",
						"creatorType": "producer"
					},
					{
						"firstName": "Edward",
						"lastName": "Saxon",
						"creatorType": "producer"
					},
					{
						"firstName": "Jonathan",
						"lastName": "Demme",
						"creatorType": "producer"
					},
					{
						"firstName": "Peter",
						"lastName": "Saraf",
						"creatorType": "producer"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Amazon.com Link",
						"snapshot": false,
						"mimeType": "text/html"
					}
				],
				"title": "Adaptation",
				"date": "May 20, 2003",
				"studio": "Sony Pictures Home Entertainment",
				"runningTime": "114 minutes",
				"language": "English (Dolby Digital 2.0 Surround), English (Dolby Digital 5.1), English (DTS 5.1), French (Dolby Digital 5.1)",
				"libraryCatalog": "Amazon.com"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.amazon.com/gp/registry/registry.html?ie=UTF8&id=1Q7ELHV59D7N&type=wishlist",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.amazon.fr/Candide-Fran%C3%A7ois-Marie-Voltaire-Arouet-dit/dp/2035866014/ref=sr_1_2?s=books&ie=UTF8&qid=1362329827&sr=1-2",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"lastName": "Voltaire",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Amazon.com Link",
						"snapshot": false,
						"mimeType": "text/html"
					}
				],
				"libraryCatalog": "Open WorldCat",
				"language": "French",
				"title": "Candide ou l'Optimisme",
				"publisher": "Larousse",
				"place": "[Paris]",
				"date": "2007",
				"ISBN": "9782035866011 2035866014"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.amazon.de/Fiktionen-Erz%C3%A4hlungen-Jorge-Luis-Borges/dp/3596105811/ref=sr_1_1?ie=UTF8&qid=1362329791&sr=8-1",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"lastName": "Borges",
						"firstName": "Jorge Luis",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Amazon.com Link",
						"snapshot": false,
						"mimeType": "text/html"
					}
				],
				"libraryCatalog": "Open WorldCat",
				"language": "German",
				"title": "Fiktionen: Erzählungen 1939 - 1944",
				"publisher": "Fischer-Taschenbuch-Verl.",
				"place": "Frankfurt am Main",
				"date": "1992",
				"ISBN": "3596105811 9783596105816",
				"shortTitle": "Fiktionen"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.amazon.co.uk/Tale-Two-Cities-ebook/dp/B004EHZXVQ/ref=sr_1_1?s=books&ie=UTF8&qid=1362329884&sr=1-1",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"lastName": "Dickens",
						"firstName": "Charles",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Amazon.com Link",
						"snapshot": false,
						"mimeType": "text/html"
					}
				],
				"libraryCatalog": "Open WorldCat",
				"language": "English",
				"title": "A tale of two cities",
				"publisher": "Cassia Press",
				"place": "[Lexington, KY]",
				"date": "2010",
				"ISBN": "9781448625024  1448625025"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.amazon.it/Emil-Astrid-Lindgren/dp/888203867X/ref=sr_1_1?s=books&ie=UTF8&qid=1362324961&sr=1-1",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"lastName": "Lindgren",
						"firstName": "Astrid",
						"creatorType": "author"
					},
					{
						"lastName": "Berg",
						"firstName": "Björn",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Amazon.com Link",
						"snapshot": false,
						"mimeType": "text/html"
					}
				],
				"libraryCatalog": "Open WorldCat",
				"language": "Italian",
				"title": "Emil",
				"publisher": "Salani",
				"place": "Milano",
				"date": "2008",
				"ISBN": "9788882038670 888203867X"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.amazon.cn/%E5%9B%BE%E4%B9%A6/dp/B007CUSP3A",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"lastName": "吕士楠",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Amazon.com Link",
						"snapshot": false,
						"mimeType": "text/html"
					}
				],
				"libraryCatalog": "Open WorldCat",
				"language": "Chinese",
				"title": "汉语语音合成: 原理和技术",
				"publisher": "科学出版社",
				"place": "北京",
				"date": "2012",
				"ISBN": "9787030329202 7030329201",
				"shortTitle": "汉语语音合成"
			}
		]
	}
]
/** END TEST CASES **/