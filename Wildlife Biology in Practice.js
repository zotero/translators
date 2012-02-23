{
	"translatorID": "b33af0e1-d122-45b2-b144-4b4eedd12d5d",
	"label": "Wildlife Biology in Practice",
	"creator": "Michael Berkowitz",
	"target": "http://[^/]*socpvs\\.org/journals/index\\.php/wbp",
	"minVersion": "1.0.0b4.r5",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "g",
	"lastUpdated": "2012-02-23 04:57:18"
}

function detectWeb(doc, url) {
	//Google adsense first loads an empty page, and then reloads the page properly
	//discard the empty page
	if ( !Zotero.Utilities.xpath(doc,'//body/*[not(self::iframe) and not(self::script)]').length ) return null;

	if (url.indexOf('/showToc/') != -1 || 
		( url.indexOf('/search/results') != -1 && Zotero.Utilities.xpath(doc, '//tr[td/a[2]]').length ) ) {
		return "multiple";
	} else if (url.indexOf('/article/viewArticle/') != -1) {
		return "journalArticle";
	}
}

function doWeb(doc, url) {
	var n = doc.documentElement.namespaceURI;
	var ns = n ? function(prefix) {
		if (prefix == 'x') return n; else return null;
	} : null;
	
	var arts = new Array();
	if (detectWeb(doc, url) == "multiple") {
		var items = new Object();
		var xpath = '//tr[td/a[2]]';
		if ( url.indexOf('/issue/') != -1 ) {
			var linkx = './td[2]/a[1]';
			var titlex = './td[1]/em';
		} else if (url.indexOf('/search/') != -1) {
			var linkx = './td[3]/a[1]';
			var titlex = './td[2]';
		}

		var results = doc.evaluate(xpath, doc, ns, XPathResult.ANY_TYPE, null);
		var result;
		while (result = results.iterateNext()) {
			var title = doc.evaluate(titlex, result, ns, XPathResult.ANY_TYPE, null).iterateNext().textContent;
			var link = doc.evaluate(linkx, result, ns, XPathResult.ANY_TYPE, null).iterateNext().href;
			items[link] = Zotero.Utilities.trimInternal(title);
		}
		items = Zotero.selectItems(items);
		for (var i in items) {
			arts.push(i.replace(/view/, "viewArticle"));
		}
	} else {
		arts = [url];
	}
	Zotero.Utilities.processDocuments(arts, function(doc) {
		var item = new Zotero.Item("journalArticle");
		var voliss = Zotero.Utilities.trimInternal(doc.evaluate('//div[@id="main"]/h2', doc, ns, XPathResult.ANY_TYPE, null).iterateNext().textContent);
		voliss = voliss.match(/^([^,]+),\s+([^;]+);\s+(\d+)\((\d+)\);\s+([^;]+)/);
		item.journalAbbreviation = voliss[1];
		item.date = voliss[2];
		item.issue = voliss[3];
		item.volume = voliss[4];
		item.pages = voliss[5];
		var authors = doc.evaluate('//div[@id="authorDetails"]/ul[@class="lista"]/li/strong/a', doc, ns, XPathResult.ANY_TYPE, null);
		var author;
		while (author = authors.iterateNext()) {
			item.creators.push(Zotero.Utilities.cleanAuthor(author.title.match(/^\w+\b\s+(.*)\s+\b\w+$/)[1], "author"));
		}
		item.publicationTitle = "Wildlife Biology in Practice";
		item.ISSN = "1646-2742";
		item.DOI = doc.evaluate('//div[@id="copyArticle"]/a[1]', doc, ns, XPathResult.ANY_TYPE, null).iterateNext().textContent.match(/doi:\s+([^\s]+)/)[1];
		item.url = doc.location.href;
		item.title = Zotero.Utilities.trimInternal(doc.evaluate('//div[@id="content"]/h3', doc, ns, XPathResult.ANY_TYPE, null).iterateNext().textContent);
		item.abstractNote = Zotero.Utilities.trimInternal(doc.evaluate('//div[@id="abstract"]/blockquote/p', doc, ns, XPathResult.ANY_TYPE, null).iterateNext().textContent);

		var tags = Zotero.Utilities.xpathText(doc, '//div[@id="abstract"]/h3[contains(text(),"Keywords")]/following-sibling::node()[not(self::div)]', null, '');
		if(tags) {
			item.tags = tags.replace(/\.\s*$/,'').split(/[,;]\s+/);
		}

		var pdfurl = doc.evaluate('//div[@id="rt"]/a[@class="action noarrow"]', doc, ns, XPathResult.ANY_TYPE, null).iterateNext().href.replace(/\/view\//,'/download/');
		item.attachments = [
			{url:item.url, title:item.publicationTitle + " Snapshot", mimeType:"text/html"},
			{url:pdfurl, title:item.publicationTitle + " PDF", mimeType:"application/pdf"}
		];
		item.complete();
	}, function() {Zotero.done();});
	Zotero.wait();
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://socpvs.org/journals/index.php/wbp/article/viewArticle/10.2461-wbp.2005.1.12",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "D.",
						"lastName": "Kaplan",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"\nacorn",
					"wild boar (Sus scrofa)",
					"cattle grazing",
					"fire",
					"Golan",
					"Quercus ithaburensis",
					"seedlings survival"
				],
				"seeAlso": [],
				"attachments": [
					{
						"url": "http://socpvs.org/journals/index.php/wbp/article/viewArticle/10.2461-wbp.2005.1.12",
						"title": "Wildlife Biology in Practice Snapshot",
						"mimeType": "text/html"
					},
					{
						"url": "http://socpvs.org/journals/index.php/wbp/article/download/10.2461-wbp.2005.1.12/14",
						"title": "Wildlife Biology in Practice PDF",
						"mimeType": "application/pdf"
					}
				],
				"journalAbbreviation": "Wildl. Biol. Pract.",
				"date": "2005",
				"issue": "2",
				"volume": "1",
				"pages": "95-107",
				"publicationTitle": "Wildlife Biology in Practice",
				"ISSN": "1646-2742",
				"DOI": "10.2461/wbp.2005.1.12",
				"url": "http://socpvs.org/journals/index.php/wbp/article/viewArticle/10.2461-wbp.2005.1.12",
				"title": "The Enigma of the Establishment of Quercus ithaburensis Park Forest in Northern Israel: Co-Evolution of Wild Boar and Men?",
				"abstractNote": "Yahudia Forest Nature Reserve covers an area of 6620 ha, and is situated northeast of the Sea of Galilee. The vegetation is a park forest of Quercus ithaburensis, over rich herbaceous vegetation. This woodland is a remnant of a vast park forest that covered the Golan up to the middle of the 19th Century. Most of the oaks are girded by cairns, which are tumuli from the Calcolithic Era (4000-3150 B.C.), or dolmens from the Middle Bronze (2200-2000 B.C.). The following factors, affecting the germination and establishment of Q. ithaburensis, were assessed: Acorns: Productivity and consumption (by wild boar, Sus scrofa, and rodents). Habitat: Competition with herbaceous vegetation, lack of water and microclimate. Management: Fire and grazing by cattle. A high yield of acorns per tree was found. Even though 70% of acorns were eaten by wild boar, cows and rodents, many were left to germinate. Acorns buried by wild boar, and others, which have fallen behind the cairn stones, are unreachable. Rodents eat acorns and store many more in the cairns. Some of these germinate, even though partly eaten. Wild boar consumes acorns, but also buries them, providing a better chance of germination. Competition with herbaceous vegetation for water is dominant. Thus, water added in May led to a significantly higher establishment of seedlings. Irrigation, during the late spring period, increased survival from 35.5% to 61.5%. Grazing by cattle and wild boar contributes positively to the establishment of seedlings, mainly through fire prevention. The effect of fire on seedling survival was important. Only 23.7% of the seedlings not affected by fire desiccated in their first summer, whereas the proportion of those affected by fire was three times higher (69.3%). Ecological niche: seedlings growing in cairns had a better chance of survival than those growing in open places. The cairns play a decisive role in the establishment of the oaks by protecting them from fire, from browsing and from wild boars, by serving as a place for rodents to hide acorns, and by providing a more humid habitat, protected from competition and desiccation. Prior to the man-made cairns, establishment took place mainly on slopes and on the frontier of basalt flows. Thus, the anthropogenic factor has played a dominant role in forming the landscape, affecting the distribution and density of the Q. ithaburensis trees, but wildlife has also played an important role in their establishment.",
				"libraryCatalog": "Wildlife Biology in Practice",
				"accessDate": "CURRENT_TIMESTAMP",
				"shortTitle": "The Enigma of the Establishment of Quercus ithaburensis Park Forest in Northern Israel"
			}
		]
	},
	{
		"type": "web",
		"url": "http://socpvs.org/journals/index.php/wbp/issue/view/1646-2742.12/showToc",
		"items": "multiple"
	}
]
/** END TEST CASES **/