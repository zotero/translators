{
	"translatorID": "5e684d82-73a3-9a34-095f-19b112d77bbe",
	"label": "Digital Medievalist",
	"creator": "Fred Gibbs",
	"target": "digitalmedievalist\\.org/(index\\.html)?($|journal/?$|(journal/[3-9]))",
	"minVersion": "2.0b7",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "g",
	"lastUpdated": "2011-10-29 14:28:27"
}

function detectWeb(doc, url) {

	if(doc.title == "Digital Medievalist: Journal" || doc.title == "Digital Medievalist" || doc.title == "Digital Medievalist Journal") {
		return "multiple";
	} else {
		return "journalArticle";
	}
}


function doWeb(doc, url) {
	var links =[];
	var articles = [];
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
		if (prefix == 'x') return namespace; else return null;
		} : null;
	
	// if on single article
	if (detectWeb(doc, url) == "journalArticle") {

		// insert 'xml' into URI for location of XML file.
		var uri = doc.location.href;
		var xmlUri = uri.replace("journal","journal/xml");
		Zotero.debug(xmlUri)
		Zotero.Utilities.HTTP.doGet(xmlUri, function(d){;
		parseXML(d, uri, doc);})
	}

	// if multiple, collect article titles 
	else if (doc.evaluate('//div[@class="issue"]/div/ul/li/a', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext()) {

		var titles = doc.evaluate('//div[@class="issue"]/div/ul/li/a', doc, nsResolver, XPathResult.ANY_TYPE, null);
		 
		while (title = titles.iterateNext()) { 
			links[title.href] = Zotero.Utilities.trimInternal(title.textContent);
		}

		var items = Zotero.selectItems(links);
		for (var i in items) {
			articles.push(i);
		}

		Zotero.Utilities.processDocuments(articles, doWeb, function() {Zotero.done();});
		Zotero.wait();	
	}
}

	
function parseXML(text, itemUrlBase, doc) {
	// Remove xml parse instruction and doctype
	text = text.replace(/<\?oxygen[^>]*\?>/, "").replace(/<\?xml[^>]*\?>/, "").replace(/<TEI[^>]*>/, "<TEI>");
	var xml = new XML(text);
	var newItem = new Zotero.Item("journalArticle");
	var fullTitle = '';
	var title = xml..titleStmt.title;
	var len = title.children().length();
	for (i=0; i < len; i++) { 
		fullTitle += title.children()[i]; 
	}
	
	// modify title if review article
	if (xml..textClass.keywords.term.(@type == "DMType").text() == "Review") {
		fullTitle = "Review of " + fullTitle;
	}
	
	newItem.title = Zotero.Utilities.trimInternal(fullTitle);
	
	var authors = xml..titleStmt.author.name;
	for (var i in authors) {
		newItem.creators.push(Zotero.Utilities.cleanAuthor(authors[i].toString(), "author"));
	}
	
	newItem.publicationTitle = "Digital Medievalist";
	newItem.volume = xml..seriesStmt.idno.(@type == "volume").toString();
	newItem.issue = xml..seriesStmt.idno.(@type == "issue").toString();
	newItem.date = xml..seriesStmt.idno.(@type == "date").toString();
	newItem.url = itemUrlBase;

	/** save keywords - this doesn't work & breaks translator
	kwords = xml..textClass.keywords.term.(@type == "keyword");
	Zotero.debug(kwords)
	for (var i = 0; i < kwords.length(); i++) {
	//	Zotero.debug(kwords[i].text());
	//	newItem.tags[i] = kwords[i]; 
	} */

	newItem.abstractNote = Zotero.Utilities.trimInternal(xml..text.front.argument.(@n == "abstract").p.text().toString());
	newItem.attachments.push({url:itemUrlBase, title:doc.title, mimeType:"text/html"});
	
	newItem.complete();
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://digitalmedievalist.org/journal/6/gau/",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Melanie",
						"lastName": "Gau",
						"creatorType": "author"
					},
					{
						"firstName": "Heinz",
						"lastName": "Miklas",
						"creatorType": "author"
					},
					{
						"firstName": "Martin",
						"lastName": "Lettner",
						"creatorType": "author"
					},
					{
						"firstName": "Robert",
						"lastName": "Sablatnig",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"url": "http://digitalmedievalist.org/journal/6/gau/",
						"title": "DM 6 (2010) Image Acquisition & Processing Routines for Damaged Manuscripts",
						"mimeType": "text/html"
					}
				],
				"title": "Image Acquisition & Processing Routines for Damaged Manuscripts",
				"publicationTitle": "Digital Medievalist",
				"issue": "6",
				"date": "2010",
				"url": "http://digitalmedievalist.org/journal/6/gau/",
				"abstractNote": "This paper presents an overview of data acquisition and processing procedures of an interdisciplinary project of philologists and image processing experts aiming at the decipherment and reconstruction of damaged manuscripts. The digital raw image data was acquired via multi-spectral imaging. As a preparatory step we developed a method of foreground-background separation (binarisation) especially designed for multi-spectral images of degraded documents. On the basis of the binarised images further applications were developed: an automatic character decomposition and primitive extraction dissects the scriptural elements into analysable pieces that are necessary for palaeographic and graphemic analyses, writing tool recognition, text restoration, and optical character recognition. The results of the relevant procedures can be stored and interrogated in a database application. Furthermore, a semi-automatic page layout analysis provides codicological information on latent page contents (script, ruling, decorations).",
				"libraryCatalog": "Digital Medievalist",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://digitalmedievalist.org/journal/6/",
		"items": "multiple"
	}
]
/** END TEST CASES **/