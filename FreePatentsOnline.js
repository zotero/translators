{
	"translatorID": "879d738c-bbdd-4fa0-afce-63295764d3b7",
	"label": "FreePatentsOnline",
	"creator": "Adam Crymble",
	"target": "^https?://www\\.freepatentsonline\\.com",
	"minVersion": "2.1",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "g",
	"lastUpdated": "2012-01-11 09:33:52"
}

function detectWeb(doc, url) {
	if (doc.location.href.match("result.html")) {
		return "multiple";
	} else if (doc.evaluate('//div[@class="disp_doc2"]/div', doc, null, XPathResult.ANY_TYPE, null).iterateNext()) {
		return "patent";
	}
}

function associateData (newItem, dataTags, field, zoteroField) {
	if (dataTags[field]) {
		newItem[zoteroField] = dataTags[field];
	}
}

function scrape(doc, url) {

	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
		if (prefix == 'x') return namespace; else return null;
	} : null;	
	
	var dataTags = new Object();
	var fieldTitle;
	var contents;
	
	var newItem = new Zotero.Item("patent");

	var pageContent = doc.evaluate('//div[@class="disp_doc2"]/div', doc, null, XPathResult.ANY_TYPE, null);
	var xPathCount = doc.evaluate('count (//div[@class="disp_doc2"]/div)', doc, null, XPathResult.ANY_TYPE, null);
	

	for (i=0; i<xPathCount.numberValue/2; i++) {	 	
	 			
	 		fieldTitle = pageContent.iterateNext().textContent.replace(/\s+/g, '');
	 		content = pageContent.iterateNext().textContent.replace(/^\s*|\s*$/g, '');
	 		dataTags[fieldTitle] = (content);
	 	}
	
	var inventors = new Array();
	var parenthesis;
	
	if (dataTags["Inventors:"]) {
		inventors = dataTags["Inventors:"].split(/\n/);
		if (inventors.length>1) {
			for (var i = 0; i < inventors.length; i++) {
					parenthesis = inventors[i].indexOf("(");
					inventors[i] = inventors[i].substr(0, parenthesis).replace(/^\s*|\s*$/g, '');			
				if (inventors[i].match(", ")) {
					var inventors1 = inventors[i].split(", ");
					inventors[i] = inventors1[1] + " " + inventors1[0];
					newItem.creators.push(Zotero.Utilities.cleanAuthor(inventors[i], "inventor"));
				} else {
					newItem.creators.push(Zotero.Utilities.cleanAuthor(inventors[i], "inventor"));
				}
			}
			
		} else {
			//Zotero.debug(doc.title);
			parenthesis = dataTags["Inventors:"].indexOf("(");
			dataTags["Inventors:"] = dataTags["Inventors:"].substr(0, parenthesis).replace(/^\s*|\s*$/g, '');
			
			if (dataTags["Inventors:"].match(", ")) {
				var inventors1 = dataTags["Inventors:"].split(", ");
				dataTags["Inventors:"] = inventors1[1] + " " + inventors1[0];
				newItem.creators.push(Zotero.Utilities.cleanAuthor(dataTags["Inventors:"], "inventor"));
			} else {
				newItem.creators.push(Zotero.Utilities.cleanAuthor(dataTags["Inventors:"], "inventor"));
			}
		}
	}

	associateData (newItem, dataTags, "Title:", "title");
	associateData (newItem, dataTags, "Abstract:", "abstractNote");
	associateData (newItem, dataTags, "DocumentTypeandNumber:", "patentNumber");
	associateData (newItem, dataTags, "ApplicationNumber:", "applicationNumber");
	associateData (newItem, dataTags, "PublicationDate:", "issueDate");
	associateData (newItem, dataTags, "FilingDate:", "filingDate");
	associateData (newItem, dataTags, "Assignee:", "assignee");
	
	if (!newItem.patentNumber) {
		newItem.patentNumber = ZU.xpathText(doc, "//input[@type='hidden' and @name='number']/@value");
	}
	
	if (!newItem.country) {
		newItem.country = ZU.xpathText(doc, "//input[@type='hidden' and @name='country']/@value");
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
				
		var titles = doc.evaluate('//table[@class="listing_table"]/tbody/tr/td[3]/a', doc, nsResolver, XPathResult.ANY_TYPE, null);
		
		var next_title;
		while (next_title = titles.iterateNext()) {
			items[next_title.href] = next_title.textContent;
		}
		items = Zotero.selectItems(items);
		for (var i in items) {
			articles.push(i);
		}
	} else {
		articles = [url];
	}
	Zotero.Utilities.processDocuments(articles, scrape, function() {Zotero.done();});
	Zotero.wait();
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.freepatentsonline.com/result.html?query_txt=encryption&sort=relevance&srch=top&search=",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.freepatentsonline.com/7751561.html",
		"items": [
			{
				"itemType": "patent",
				"creators": [
					{
						"firstName": "Brant L.",
						"lastName": "Candelore",
						"creatorType": "inventor"
					},
					{
						"firstName": "Robert Allan",
						"lastName": "Unger",
						"creatorType": "inventor"
					},
					{
						"firstName": "Leo M. Pedlow",
						"lastName": "Jr",
						"creatorType": "inventor"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"title": "Partial encryption",
				"abstractNote": "A multiple partial encryption device consistent with certain embodiments has an input for receiving a unencrypted video signal. An encryption arrangement produces a partially multiple encrypted video signal from the unencrypted video signal. An output provides the partially multiple encrypted video signal. This abstract is not to be considered limiting, since other embodiments may deviate from the features described in this abstract.",
				"applicationNumber": "12/001561",
				"issueDate": "07/06/2010",
				"assignee": "Sony Corporation (Tokyo, JP)\t\t\t\t\n\t\t\t\t\t\t\t\t\tSony Electronics Inc. (Park Ridge, NJ, US)",
				"patentNumber": "7751561",
				"country": "United States",
				"url": "http://www.freepatentsonline.com/7751561.html",
				"libraryCatalog": "FreePatentsOnline",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	}
]
/** END TEST CASES **/
