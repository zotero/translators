{
	"translatorID": "c54d1932-73ce-dfd4-a943-109380e06574",
	"label": "Project MUSE",
	"creator": "Simon Kornblith, Avram Lyon, Sean Takats",
	"target": "^https?://[^/]*muse\\.jhu\\.edu[^/]*/(login\\?uri=/)?(?:journals/[^/]+/(summary/)?[^/]+/[^/]+\\.html|search/results)",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2012-04-02 03:49:44"
}

function detectWeb(doc, url) {
	var searchRe = new RegExp("(^https?://[^/]+/search/results|/search/save|/toc/|/results$)");
	if(searchRe.test(url)) {
	//some old TOCs just display links to pdfs - don't detect those
	if(ZU.xpath(doc, '//div[@class="article"]/h4/a|//div[@class="result_info"]/h1/a|//ul/li/a[text() = "[Access article in HTML]"]').length != 0){
		return "multiple";}
	} else {
		return "journalArticle";
	}
}

function doWeb(doc, url) {

	var searchRe = new RegExp("^https?://[^/]+/search/results|/search/save|/results$");
	if(detectWeb(doc, url) == "multiple") {
		var items = {};
		var attachments = new Array();
		var results = ZU.xpath(doc,
			'//div[@class="article"]/h4/a|//div[@class="result_info"]/h1/a');
		if (results.length){
			for(var i=0, n=results.length; i<n; i++) {
				items[results[i].href] = results[i].textContent;
			}
		} else {
			// Some journals have old-style TOCs for back issues
			// Ex. http://muse.jhu.edu/journals/eighteenth-century_studies/toc/ecs33.4.html
			var articles = doc.evaluate('//ul', doc, null, XPathResult.ANY_TYPE, null);
			var article;
			while (article = articles.iterateNext()) {
				var link = doc.evaluate('./li/a[contains(@href,".html")]', article, null, XPathResult.ANY_TYPE, null).iterateNext();
				var title = doc.evaluate('./li/i', article, null, XPathResult.ANY_TYPE, null).iterateNext();
				if(link && link.href && title && title.textContent) {
					items[link.href] = title.textContent;
				}
			}
		}

		Zotero.selectItems(items, function(items) {
			if(!items) {
				return true;
			}	
			var i;
			var urls = [];
			for (i in items) {urls.push(i);};
			Zotero.Utilities.processDocuments(urls, scrapeOne, function() {Zotero.done();}, null);		
		});
	} else scrapeOne(doc);
	Zotero.wait();
}

// Given an article page, get the RIS and open it
function scrapeOne(doc) {
	var url = doc.location.href;

	var hostRe = new RegExp("^(http://[^/]+)/");
		var m = hostRe.exec(url);
		var host = m[1];

		var getPDF = doc.evaluate('//a[text() = "PDF Version" or text() = "[Access article in PDF]" or text() = "Download PDF"]', doc,
								  null, XPathResult.ANY_TYPE, null).iterateNext();		
		var DOI = doc.evaluate('//meta[@name="citation_doi"]/@content', doc,
								  null, XPathResult.ANY_TYPE, null).iterateNext();		
		var abstract = doc.evaluate('//div[@class="abstract"]', doc,
								  null, XPathResult.ANY_TYPE, null).iterateNext();
		var authorNodes = ZU.xpath(doc, '//meta[@name="citation_author"]/@content');

		if(url.indexOf('?') != -1) {
			var m = url.match(/[?&]ur[li]=([^&]+)/i);
			if(m) url = host + decodeURIComponent(m[1]);
		}

		var newUrl = url.replace(host, host+"/metadata/zotero").replace("/summary/","/");
		Zotero.Utilities.HTTP.doGet(newUrl, function(text) {
			var translator = Zotero.loadTranslator("import");
			//set RIS translator
			translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
			translator.setString(text);
			translator.setHandler("itemDone", function(obj, item) {
				if(item.notes && item.notes[0]) {
					item.extra = item.notes[0].note;						
					delete item.notes;
					item.notes = undefined;
				}
				//Muse has authors wrong in the RIS - we get the names from google/highwire metadata and use them
				// they're also inconsistent about comma use, so we're using the code from the Embedded Metadata translator to distinguish
				if(authorNodes.length){
					item.creators = [];
						for(var i=0, n=authorNodes.length; i<n; i++) {
							//make sure there are no empty authors
							var authors = authorNodes[i].nodeValue.replace(/(;[^A-Za-z0-9]*)$/, "").split(/\s*;\s/);
							if (authors.length == 1) {
								/* If we get nothing when splitting by semicolon, and at least two words on
								* either side of the comma when splitting by comma, we split by comma. */
								var authorsByComma = authors[0].split(/\s*,\s*/);
								if (authorsByComma.length > 1
									&& authorsByComma[0].indexOf(" ") !== -1
									&& authorsByComma[1].indexOf(" ") !== -1)
									authors = authorsByComma;
							}
							for(var j=0, m=authors.length; j<m; j++) {
								var author = authors[j];
								item.creators.push(ZU.cleanAuthor(author, "author", author.indexOf(",") !== -1));
							}
						}
				
				}
				item.attachments.splice(0);
				item.attachments.push({document:doc, title:"Project MUSE Snapshot"});
				if(getPDF) {
					item.attachments.push({title:"Project MUSE Full Text PDF", mimeType:"application/pdf",
					url:getPDF.href});
				}
				if(DOI) {
					item.DOI = DOI.textContent.replace(/^DOI: /,"");
				}
				if(abstract) {
					item.abstract = abstract.textContent;
				}
				item.complete();
			});
			translator.translate();
		});
}
	/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://muse.jhu.edu/journals/past_and_present/summary/v191/191.1higonnet.html",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Patrice L. R.",
						"lastName": "Higonnet",
						"creatorType": "author"
					}
				],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Project MUSE Snapshot"
					},
					{
						"title": "Project MUSE Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"title": "Terror, Trauma and the 'Young Marx' Explanation of Jacobin Politics",
				"publicationTitle": "Past & Present",
				"volume": "191",
				"issue": "1",
				"pages": "121-164",
				"date": "2006",
				"publisher": "Oxford University Press",
				"ISBN": "1477-464X",
				"ISSN": "1477-464X",
				"url": "http://muse.jhu.edu/journals/past_and_present/v191/191.1higonnet.html",
				"extra": "<p>Number 191, May 2006</p>",
				"abstract": "In lieu of an abstract, here is a brief excerpt of the content:\n        Patrice L. R. Higonnet - Terror, Trauma and the 'Young Marx' Explanation of Jacobin Politics - Past & Present 191:1 Past & Present 191.1 (2006) 121-164 Terror, Trauma and the 'Young Marx' Explanation of Jacobin Politics* Patrice Higonnet Harvard University Tocqueville in the 1850s wrote of France in the 1780s that never had tolerance been more accepted, authority been more mild, or benevolence been so widely practised. Nonetheless, he went on, 'from the bosom of such mild mores would spring the most inhuman of revolutions'. And even for those of us who deeply admire the French Revolution's message of civic equality, the Terror of the Year II (1793–4) seems not just ominous and horrendous, but also out of place. Auschwitz, Dresden and Hiroshima — after the Great War of 1914–18 and the Great Depression of the 1930s: we can see why these wartime tragedies happened, given the awful events that preceded them. But what of the Terror after the Enlightenment — after Voltaire, Boucher, and Madame de Pompadour? Isser Woloch has rightly described the 'sequence' from 1789 to 1793, from liberalism to terror, as an eternally fascinating 'enigma'. Why the French Revolution occurred is something of a mystery. And why it failed so dramatically is also deeply perplexing. Historians have pored over the cause and nature of the Terror of the Year II ever since it occurred. And yet the many valuable (though often conflicting) explanations which have been offered to...",
				"libraryCatalog": "Project MUSE",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://muse.jhu.edu/journals/journal_of_social_history/toc/jsh.44.4.html",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://muse.jhu.edu/journals/eighteenth-century_studies/toc/ecs33.4.html",
		"items": "multiple"
	}
]
/** END TEST CASES **/