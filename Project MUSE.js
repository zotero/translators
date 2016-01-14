{
	"translatorID": "c54d1932-73ce-dfd4-a943-109380e06574",
	"label": "Project MUSE",
	"creator": "Simon Kornblith, Avram Lyon, Sean Takats",
	"target": "^https?://[^/]*muse\\.jhu\\.edu[^/]*/(login\\?.+ur[il]=/)?(?:journals/[^/]+/(summary/)?[^/]+/[^/]+\\.html|search/results|results|books/\\d+)",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2015-04-12 16:54:33"
}

function detectWeb(doc, url) {
	var searchRe = new RegExp("(^https?://[^/]+/search/results|/search/save|/toc/|/results(#.+)?$)");
	if(searchRe.test(url)) {
	//some old TOCs just display links to pdfs - don't detect those
	if(ZU.xpath(doc, '//div[@class="article"]/h4/a|//div[@class="result_info"]/h1/a|//ul/li/a[text() = "[Access article in HTML]"]').length != 0){
		return "multiple";}
	} else if (url.match(/\/books\//)){
		return "book";
	}
	else {
		return "journalArticle";
	}
}

function doWeb(doc, url) {

	var searchRe = new RegExp("^https?://[^/]+/search/results|/search/save|/results(#.+)?$");
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
	var hostRe = new RegExp("^(https?://[^/]+)/");
		var m = hostRe.exec(url);
		var host = m[1];

	if (url.match(/\/books\//)){
		var abstract = ZU.xpathText(doc, '//div[@class="book_info"]/div[@class="description"]')
		var citurl = ZU.xpathText(doc, '//li[@class="view_citation"]/a/@href');
		var newUrl = host + citurl;
			Zotero.Utilities.HTTP.doGet(newUrl, function(text) {
			text=text.match(/TY  -(.+\n)+ER  -/)[0]
				var translator = Zotero.loadTranslator("import");
			//set RIS translator
			translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
			translator.setString(text);
			translator.setHandler("itemDone", function(obj, item) {
			item.attachments.push({document:doc, title:"Project MUSE Snapshot"});
			if (abstract){
				item.abstractNote=abstract.replace(/\n/g, " ").replace(/\s\s+/g, " ");
			}
			item.complete();
			});
			translator.translate();
			})
	}
	
	else{
	
		var getPDF = doc.evaluate('//a[text() = "PDF Version" or text() = "[Access article in PDF]" or text() = "Download PDF"]', doc,
								  null, XPathResult.ANY_TYPE, null).iterateNext();		
		var DOI = doc.evaluate('//meta[@name="citation_doi"]/@content', doc,
								  null, XPathResult.ANY_TYPE, null).iterateNext();
		//test for two different abstract formats						  
		var abstract = ZU.xpathText(doc, '//abstract/p[1]');
		if (!abstract) abstract = ZU.xpathText(doc, '//div[@class="abstract"][1]/p[1]');
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
				else{
					//apparently Muse is inconsistent with google data
					//assume single field names are personal authors with wrong RIS. Not perfect
					//but by far the most likely scenario.
					for(var i in item.creators){
						if(!item.creators[i].firstName){
							item.creators[i] = ZU.cleanAuthor(item.creators[i].lastName, item.creators[i].creatorType, false);
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
					item.abstractNote = abstract.replace(/\n/g, " ").replace(/\s\s+/g, " ");
				}
				item.complete();
			});
			translator.translate();
		});
	}
}
	/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://muse.jhu.edu/journals/past_and_present/summary/v191/191.1higonnet.html",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Terror, Trauma and the 'Young Marx' Explanation of Jacobin Politics",
				"creators": [
					{
						"firstName": "Patrice L. R.",
						"lastName": "Higonnet",
						"creatorType": "author"
					}
				],
				"date": "2006",
				"ISSN": "1477-464X",
				"abstractNote": "Past & Present 191.1 (2006) 121-164",
				"extra": "<p>Number 191, May 2006</p>",
				"issue": "1",
				"libraryCatalog": "Project MUSE",
				"pages": "121-164",
				"publicationTitle": "Past & Present",
				"url": "https://muse.jhu.edu/journals/past_and_present/v191/191.1higonnet.html",
				"volume": "191",
				"attachments": [
					{
						"title": "Project MUSE Snapshot"
					},
					{
						"title": "Project MUSE Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"seeAlso": []
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
	},
	{
		"type": "web",
		"url": "http://muse.jhu.edu/books/9780820705057",
		"items": [
			{
				"itemType": "book",
				"title": "Writing the Forest in Early Modern England: A Sylvan Pastoral Nation",
				"creators": [
					{
						"lastName": "Theis",
						"firstName": "Jeffrey S.",
						"creatorType": "author"
					}
				],
				"date": "2009",
				"ISBN": "9780820705057",
				"abstractNote": "In Writing the Forest in Early Modern England: A Sylvan Pastoral Nation, Jeffrey S. Theis focuses on pastoral literature in early modern England as an emerging form of nature writing. In particular, Theis analyzes what happens when pastoral writing is set in forests — what he terms “sylvan pastoral.” During the sixteenth and seventeenth centuries, forests and woodlands played an instrumental role in the formation of individual and national identities in England. Although environmentalism as we know it did not yet exist, persistent fears of timber shortages led to a larger anxiety about the status of forests. Perhaps more important, forests were dynamic and contested sites of largely undeveloped spaces where the poor would migrate in a time of rising population when land became scarce. And in addition to being a place where the poor would go, the forest also was a playground for monarchs and aristocrats where they indulged in the symbolically rich sport of hunting. Conventional pastoral literature, then, transforms when writers use it to represent and define forests and the multiple ways in which English society saw these places. In exploring these themes, authors expose national concerns regarding deforestation and forest law and present views relating to land ownership, nationhood, and the individual’s relationship to nature. Of particular interest are the ways in which cultures turn confusing spaces into known places and how this process is shaped by nature, history, gender, and class. Theis examines the playing out of these issues in familiar works by Shakespeare, such as A Midsummer Night’s Dream, The Merry Wives of Windsor, and As You Like It, Andrew Marvell’s “Upon Appleton House,” John Milton’s Mask and Paradise Lost, as well as in lesser known prose works of the English Revolution, such as James Howell’s Dendrologia>/i> and John Evelyn’s Sylva. As a unique ecocritical study of forests in early modern English literature, Writing the Forest makes an important contribution to the growing field of the history of environmentalism, and will be of interest to those working in literary and cultural history as well as philosophers concerned with nature and space theory. show less, In Writing the Forest in Early Modern England: A Sylvan Pastoral Nation, Jeffrey S. Theis focuses on pastoral literature in early modern England as an emerging form of nature writing. In particular, Theis analyzes what happens when pastoral writing is set in forests — what he terms “sylvan pastoral.” During the sixteenth and seventeenth centuries, forests and woodlands played an instrumental role in the formation of individual and national identities in England. Although environmentalism as we know it did not yet exist, persistent fears of timber shortages led to a larger anxiety about the status of forests. Perhaps more important . . . show more",
				"libraryCatalog": "Project MUSE",
				"place": "Pittsburgh",
				"publisher": "Duquesne University Press",
				"shortTitle": "Writing the Forest in Early Modern England",
				"attachments": [
					{
						"title": "Project MUSE Snapshot"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://muse.jhu.edu/login?auth=0&type=summary&url=/journals/technology_and_culture/v054/54.4.prescott.html",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "The Pill at Fifty: Scientific Commemoration and the Politics of American Memory",
				"creators": [
					{
						"firstName": "Heather",
						"lastName": "Prescott",
						"creatorType": "author"
					}
				],
				"date": "2013",
				"DOI": "10.1353/tech.2013.0137",
				"ISSN": "1097-3729",
				"abstractNote": "This article uses coverage of the fiftieth anniversary of the Pill as an example of what Richard Hirsh describes as the “real world” role of historians of technology. It explores how the presentation of historical topics on the world wide web has complicated how the history of technology is conveyed to the public. The article shows that that the Pill is especially suited to demonstrating the public role of historians of technology because, as the most popular form of reversible birth control, it has touched the lives of millions of Americans. Thus, an exploration of how the Pill’s fiftieth anniversary was covered illustrates how historians can use their expertise to provide a nuanced interpretation of a controversial topic in the history of technology.",
				"extra": "<p>Volume 54, Number 4, October 2013</p>",
				"issue": "4",
				"libraryCatalog": "Project MUSE",
				"pages": "735-745",
				"publicationTitle": "Technology and Culture",
				"shortTitle": "The Pill at Fifty",
				"url": "https://muse.jhu.edu/journals/technology_and_culture/v054/54.4.prescott.html",
				"volume": "54",
				"attachments": [
					{
						"title": "Project MUSE Snapshot"
					}
				],
				"tags": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://muse.jhu.edu/journals/latin_american_research_review/v049/49.2.manzetti.html",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Accountability and Corruption in Argentina During the Kirchners’ Era",
				"creators": [
					{
						"firstName": "Luigi",
						"lastName": "Manzetti",
						"creatorType": "author"
					}
				],
				"date": "2014",
				"ISSN": "1542-4278",
				"abstractNote": "This article highlights an important paradox: in Argentina between 2003 and 2013 the center-left Peronist government’s approach to governance mirrors that of the center-right Peronist administration of the 1990s. While the latter centralized authority to pursue neoliberal reforms, the former have centralized authority in the name of expanding government intervention in the economy. In both cases, corruption has tended to go unchecked due to insufficient government accountability. Therefore, although economic policies and political rhetoric have changed dramatically, government corruption remains a constant of the Argentine political system due to the executive branch’s ability to emasculate constitutional checks and balances.",
				"accessDate": "CURRENT_TIMESTAMP",
				"extra": "<p>Volume 49, Number 2, 2014</p>",
				"issue": "2",
				"libraryCatalog": "Project MUSE",
				"pages": "173-195",
				"publicationTitle": "Latin American Research Review",
				"publisher": "Latin American Studies Association",
				"url": "http://muse.jhu.edu.turing.library.northwestern.edu/journals/latin_american_research_review/v049/49.2.manzetti.html",
				"volume": "49",
				"attachments": [
					{
						"title": "Project MUSE Snapshot"
					},
					{
						"title": "Project MUSE Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/