{
	"translatorID": "c41c9c66-8540-4216-b138-7c00532748c9",
	"label": "Gulag: Many Days, Many Lives",
	"creator": "Adam Crymble",
	"target": "^https?://gulaghistory\\.org",
	"minVersion": "1.0.0b4.r5",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2012-01-30 22:49:27"
}

function detectWeb(doc, url) {
	if (doc.evaluate('//div[@class="field"][@id="citation"]/p', doc, null, XPathResult.ANY_TYPE, null).iterateNext()) {
		return "book";
	} else if (doc.evaluate('//h3/a', doc, null, XPathResult.ANY_TYPE, null).iterateNext()) {
		return "multiple";
	}
}

//Gulag: Many Days, Many  Lives translator; Code by Adam Crymble

function scrape(doc, url) {

	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
		if (prefix == 'x') return namespace; else return null;
	} : null;

	var newItem = new Zotero.Item("book");

	if (doc.evaluate('//div[@class="field"][@id="description"]/div', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext()) {
		var abstract1 = doc.evaluate('//div[@class="field"][@id="description"]/div', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext().textContent;
		newItem.abstractNote = abstract1.replace(/^\s+|\s*$/g, '');
	}

	if (doc.evaluate('//div[@class="field"][@id="source"]/p', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext()) {
		var rights1 = doc.evaluate('//div[@class="field"][@id="source"]/p', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext().textContent;
		newItem.rights = rights1.replace(/^\s+|\s*$/g, '');
	}

	var cite = doc.evaluate('//div[@class="field"][@id="citation"]/p', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext().textContent;

	var checkForAuthor = cite.indexOf('"');

	if (cite.match("Gulag: Many Days, Many Lives")) {

		var split1 = new Array();
		var split2 = new Array();
		var split3 = new Array();
		var split4 = new Array();
		var split5 = new Array();

		if (checkForAuthor == 0) {
			split1[1] = cite;
		} else {
		   	//author
			split1 = cite.split(', "');
			var authorWords = split1[0].split(/\b\s/);
			if (authorWords.length > 3) {
				newItem.creators.push({lastName: split1[0], creatorType: "creator"});
			} else {

				newItem.creators.push(Zotero.Utilities.cleanAuthor(split1[0], "author"));
			}
		}

		//title
		split2 = split1[1].split('." ');
		newItem.title = split2[0];

	  	 //repository
		split3 = split2[1].split("Lives, ");

	   	//object number
		split4 = split3[1].split(" (");
		newItem.callNumber = split4[0];

	   	//date posted and URL
		split5 = split4[1].split(")<");
		newItem.date = split5[0];

	} else {

		var split1 = cite.split(". ");
		//Zotero.debug(split1);

		//author
		var author = split1[0].split(/\, /);
		author = author[1] + ' ' + author[0];
		//Zotero.debug(author);
		newItem.creators.push(Zotero.Utilities.cleanAuthor(author, "author"));

		//title
		newItem.title = split1[1];

		//place
		var place1 = split1[2].split(":");
		newItem.place = place1[0];

		//date
		var date1 = split1[2].split (", ");
		newItem.date = date1[1];

		//publisher
		newItem.publisher = date1[0].replace(place1[0], '').substr(2);
	}

	newItem.url = doc.location.href;
	newItem.complete();
}

function doWeb(doc, url) {
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
		if (prefix == 'x') return namespace; else return null;
	} : null;

	var articles = new Array();

	if (detectWeb(doc, url) == "multiple") {
		var items = new Object();

		var titles = doc.evaluate('//h3/a', doc, nsResolver, XPathResult.ANY_TYPE, null);

		var next_title;

		while (next_title = titles.iterateNext()) {

			items[next_title.href] = next_title.textContent;
		}
		Zotero.selectItems(items, function (items) {
			ZU.processDocuments(Object.keys(items), scrape);
		});
	}
	else {
		scrape(doc, url);
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://gulaghistory.org/items/browse?search=Siberia&submit_search=Search",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://gulaghistory.org/items/show/47",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"firstName": "Thomas",
						"lastName": "Sgovio",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"abstractNote": "Map of Thomas Sgovio's two journeys. One journey took him from Moscow to Magadan, the other from Moscow beyond the Ural Mountains to Boguchani in Siberia.",
				"title": "Dear America! Why I Turned Against Communism",
				"place": "Kenmore, NY",
				"date": "NY: Partners' Press",
				"publisher": "nmore",
				"url": "http://gulaghistory.org/items/show/47",
				"libraryCatalog": "Gulag: Many Days, Many Lives",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	}
]
/** END TEST CASES **/