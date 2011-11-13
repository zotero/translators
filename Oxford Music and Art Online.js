{
	"translatorID": "f203db7f-7b7b-4dc4-b018-115b7885fe3b",
	"label": "Oxford Music and Art Online",
	"creator": "Michael Berkowitz",
	"target": "http://[^/]*www.oxford(music|art)online.com[^/]*/",
	"minVersion": "1.0.0b4.r5",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "g",
	"lastUpdated": "2011-11-10 18:23:34"
}

function detectWeb(doc, url) {
	if (url.match(/search_results/)) {
		return "multiple";
	} else if (url.match(/\/article\//)) {
		return "journalArticle";
	}
}

function doWeb(doc, url) {
	var host = doc.location.host;
	var site = host.match(/oxford(.*)online/)[1];
	var ids = new Array();
	if (detectWeb(doc, url) == "multiple") {
		var items = new Object();
		var links = doc.evaluate('//ul[@class="search_result_list"]/li/p/a', doc, null, XPathResult.ANY_TYPE, null);
		var link;
		while (link = links.iterateNext()) {
			items[link.href] = link.textContent;
		}
		items = Zotero.selectItems(items);
		for (var i in items) {
			ids.push(i.match(/(music|art)\/([^?]+)/)[2]);
		}
	} else {
		ids = [url.match(/(music|art)\/([^?]+)/)[2]];
	}
	Zotero.debug(ids);
	for each (var id in ids) {
		var get = 'http://' + host + '/subscriber/article_export_citation/grove/' + site + '/' + id;
		Zotero.Utilities.HTTP.doGet(get, function(text) {
			var translator = Zotero.loadTranslator("import");
			translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
			translator.setString(text);
			translator.setHandler("itemDone", function(obj, item) {
				var authors = new Array();
				for (var i in item.creators) {
					names = item.creators[i].lastName.match(/(.*)\s([^\s]+)$/);
					authors.push({firstName:names[1], lastName:names[2], creatorType:"author"});
				}
				item.creators = authors;
				item.complete();
			});
			translator.translate();
		});
	}
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.oxfordmusiconline.com/subscriber/search_results?q=Bach&hbutton_search.x=0&hbutton_search.y=0&source=omo_epm&source=omo_t237&source=omo_gmo&source=omo_t114&search=quick",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.oxfordmusiconline.com/subscriber/article/grove/music/40023?q=Bach&hbutton_search.x=0&hbutton_search.y=0&source=omo_epm&source=omo_t237&source=omo_gmo&source=omo_t114&search=quick&pos=1&_start=1#firsthit",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Christoph",
						"lastName": "Wolff",
						"creatorType": "author"
					},
					{
						"firstName": "Walter",
						"lastName": "Emery",
						"creatorType": "author"
					},
					{
						"firstName": "Peter",
						"lastName": "Wollny",
						"creatorType": "author"
					},
					{
						"firstName": "Ulrich",
						"lastName": "Leisinger",
						"creatorType": "author"
					},
					{
						"firstName": "Stephen",
						"lastName": "Roe",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"title": "Bach",
				"publicationTitle": "Grove Music Online",
				"libraryCatalog": "Oxford Music and Art Online"
			}
		]
	}
]
/** END TEST CASES **/