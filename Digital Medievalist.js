{
	"translatorID": "5e684d82-73a3-9a34-095f-19b112d77bbe",
	"label": "Digital Medievalist",
	"creator": "Fred Gibbs, Sebastian Karcher",
	"target": "digitalmedievalist\\.org/(index\\.html)?($|journal/?$|(journal/[3-9]))",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2013-04-15 18:04:37"
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
	else if (doc.evaluate('//div[@class="issue"]/div/ul/li/a', doc, null, XPathResult.ANY_TYPE, null).iterateNext()) {

		var titles = doc.evaluate('//div[@class="issue"]/div/ul/li/a', doc, null, XPathResult.ANY_TYPE, null);
		 
		while (title = titles.iterateNext()) { 
			links[title.href] = Zotero.Utilities.trimInternal(title.textContent);
		}

	Zotero.selectItems(links, function (items) {
				if (!items) {
					return true;
				}
				for (var i in items) {
					articles.push(i);
				}
				Zotero.Utilities.processDocuments(articles, doWeb);
			});

	}
}

	
function parseXML(text, itemUrlBase, doc) {
	// Remove xml parse instruction and doctype
	text = text.replace(/<\?oxygen[^>]*\?>/, "").replace(/<\?xml[^>]*\?>/, "").replace(/<TEI[^>]*>/, "<TEI>");
	//Z.debug(text)
	
	var parser = new DOMParser();
	var doc = parser.parseFromString(text, "text/xml");
	var newItem = new Zotero.Item("journalArticle");
	var header = ZU.xpath(doc, '//teiHeader')	
	newItem.title = ZU.xpathText(header, './/titleStmt/title');
	if (ZU.xpathText(header, './/textClass/keywords/term[@type="DMType"]') == "Review") {
		newItem.title = "Review of " + newItem.title;
	}
	var authors = ZU.xpath(header, './/titleStmt/author/name')
	for (var i in authors) {
		newItem.creators.push(Zotero.Utilities.cleanAuthor(authors[i].textContent, "author"));
	}
	newItem.publicationTitle = "Digital Medievalist";
	newItem.ISSN = " 1715-0736";
	newItem.volume = ZU.xpathText(header, './/seriesStmt/idno[@type="volume"]');
	newItem.issue = ZU.xpathText(header, './/seriesStmt/idno[@type="issue"]');
	newItem.date = ZU.xpathText(header, './/seriesStmt/idno[@type="date"]');
	newItem.language = ZU.xpathText(header, './/language');
	newItem.rights = ZU.xpathText(header, './/availability');
	newItem.url = itemUrlBase;
	
	newItem.attachments.push({url:itemUrlBase, title: "Digital Medievalist Snapshot", mimeType:"text/html"});
	var keywords = ZU.xpath(header, './/textClass/keywords/term[@type="keyword"]');
	for (var i in keywords){
		newItem.tags[i] = keywords[i].textContent;
	}
	var abstract = ZU.xpathText(doc, '//text/front/argument[@n="abstract"]');
	if (abstract) newItem.abstractNote = ZU.trimInternal(abstract);
	
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
				"tags": [
					"Image Acquisition",
					"Processing",
					"Manuscripts",
					"Codicology",
					"Palaeography",
					"Multi-Spectral Imaging",
					"Foreground-Background Separation",
					"Graphemic Character Segmentation",
					"Damaged Manuscripts",
					"Palimpsests",
					"Digital Palaeography"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Digital Medievalist Snapshot",
						"mimeType": "text/html"
					}
				],
				"title": "Image Acquisition & Processing Routines for Damaged Manuscripts",
				"publicationTitle": "Digital Medievalist",
				"ISSN": "1715-0736",
				"issue": "6",
				"date": "2010",
				"language": "en-GB",
				"rights": "© Melanie Gau, Heinz Miklas, Martin Lettner, and Robert Sablatnig, 2010. Creative\n                  Commons Attribution-NonCommercial licence",
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