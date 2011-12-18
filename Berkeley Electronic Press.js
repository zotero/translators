{
	"translatorID": "2a5dc3ed-ee5e-4bfb-baad-36ae007e40ce",
	"label": "Berkeley Electronic Press",
	"creator": "Michael Berkowitz, Sebastian Karcher",
	"target": "^https?://www\\.bepress\\.com/",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "g",
	"lastUpdated": "2011-12-14 19:48:14"
}

function detectWeb(doc, url) {
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
	if (prefix == 'x') return namespace; else return null;
	} : null;
	
	
	if (url.match("/do/search/")) {
		return "multiple";
	} else if (doc.evaluate('//div[@class="article-list"]', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext()){
		return "multiple";
	} else if (url.match(/vol[\d+]\/iss[\d]+\/art/)) {
		return "journalArticle";
	}

	return false;
}

var tagMap = {
	journal_title:"publicationTitle",
	title:"title",
	date:"date",
	volume:"volume",
	issue:"issue",
	abstract_html_url:"url",
	doi:"DOI"
}

function doWeb(doc, url) {
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
	if (prefix == 'x') return namespace; else return null;
	} : null;

	var articles = new Array();
	if (detectWeb(doc, url) == "multiple") {
		var items = new Object();
		var titles = doc.evaluate('//span[@class="title"]/a[contains(@href, "/art")]|//p[2]/a[contains(@href, "/art")]', doc, nsResolver, XPathResult.ANY_TYPE, null);
		var next_title;
		while (next_title = titles.iterateNext()) {
			items[next_title.href] = next_title.textContent;
		}
		Zotero.selectItems(items, function (selected) {
			for (var i in selected) {
				articles.push(i);
			}
			Zotero.Utilities.processDocuments(articles, scrape, 
				function() { Zotero.done(); } );
		});
		Zotero.wait();
	} else {
		scrape(doc);
	}
}

function scrape(newDoc) {
	var metatags = new Object();
	var metas = newDoc.evaluate('//meta[contains(@name, "bepress_citation")]', newDoc, null, XPathResult.ANY_TYPE, null);
	var next_meta;
	var name;
	while (next_meta = metas.iterateNext()) {
		name = next_meta.name.replace("bepress_citation_", "");
		if (metatags[name]) metatags[name] += "|" + next_meta.content;
		else metatags[name] = next_meta.content;
	}
	var item = new Zotero.Item("journalArticle");

	//regularly mapped tags
	for (var tag in tagMap) {
		if (metatags[tag]) {
			item[tagMap[tag]] = metatags[tag];
		}
	}

	//authors
	if (metatags['author']) {
		var authors = metatags['author'].split('|');
		for each (var author in authors) {
			item.creators.push(Zotero.Utilities.cleanAuthor(author, "author", useComma=true));
		}
	}
	//they use mark-up in titles, but we want <i> and note <em> for italics
	item.title =item.title.replace(/\<(\/)?em\>/g, "<$1i>");
	//attachments
	item.attachments = [
		{url:item.url, title:item.title, mimeType:"text/html"},
		{url:metatags['pdf_url'], title:"Berkeley Electronic Press Full Text PDF", mimeType:"application/pdf"}
	];
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.bepress.com/forum/vol9/iss2/art6/",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Stephanie",
						"lastName": "Slade",
						"creatorType": "author"
					},
					{
						"firstName": "Daniel A",
						"lastName": "Smith",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"url": "http://www.bepress.com/forum/vol9/iss2/art6",
						"title": "Obama to Blame? African American Surge Voters and the Ban on Same-Sex Marriage in Florida",
						"mimeType": "text/html"
					},
					{
						"url": "http://www.bepress.com/cgi/viewcontent.cgi?article=1376&context=forum",
						"title": "Berkeley Electronic Press Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"publicationTitle": "The Forum",
				"title": "Obama to Blame? African American Surge Voters and the Ban on Same-Sex Marriage in Florida",
				"date": "2011",
				"volume": "9",
				"issue": "2",
				"url": "http://www.bepress.com/forum/vol9/iss2/art6",
				"DOI": "10.2202/1540-8884.1376",
				"libraryCatalog": "Berkeley Electronic Press",
				"accessDate": "CURRENT_TIMESTAMP",
				"shortTitle": "Obama to Blame?",
				"checkFields": "title"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.bepress.com/forum/vol9/iss2/",
		"items": "multiple"
	}
]
/** END TEST CASES **/