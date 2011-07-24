{
	"translatorID": "850f4c5f-71fb-4669-b7da-7fb7a95500ef",
	"label": "Cambridge Journals Online",
	"creator": "Sean Takats, Michael Berkowitz and Avram Lyon",
	"target": "^https?://[^/]*journals.cambridge.org[^/]*//?action/(quickSearch|search|displayAbstract|displayFulltext|displayIssue)",
	"minVersion": "2.1",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"lastUpdated": "2011-07-24 23:08:37"
}

function detectWeb(doc, url)	{
	var namespace=doc.documentElement.namespaceURI;
	var nsResolver=namespace?function(prefix)	{
		return (prefix=="x")?namespace:null;
	}:null;
	var xpath = '//div[@class="tableofcontents-row"][div/input[@type="checkbox"][@name="toView"]]';
	if ((url.indexOf("/action/displayAbstract") != -1) || (url.indexOf("action/displayFulltext") != -1)){
		return "journalArticle";
	} else if (doc.evaluate(xpath, doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext()){
		return "multiple";			
	}
}

function doWeb(doc, url){
	var namespace=doc.documentElement.namespaceURI;
	var nsResolver=namespace?function(prefix)	{
		return (prefix=="x")?namespace:null;
	}:null;
	var host = doc.location.host;
	var urlstring="http://" + host + "/action/exportCitation";
	var datastring="format=RIS&emailId=&Download=Download&componentIds=";
	var links = new Array();
	if(detectWeb(doc, url) == "multiple"){
		var xpath = '//div[@class="tableofcontents-row"][div/input[@type="checkbox"][@name="toView"]]';
		var tableRows = doc.evaluate(xpath, doc, nsResolver, XPathResult.ANY_TYPE, null);
		var tableRow;
		var items=new Array();
		while (tableRow = tableRows.iterateNext()){
			var id = doc.evaluate('./div/input[@type="checkbox"][@name="toView"]/@value', tableRow, nsResolver, XPathResult.ANY_TYPE, null).iterateNext();
			var title = doc.evaluate('.//h3', tableRow, nsResolver, XPathResult.ANY_TYPE, null).iterateNext();
			items['http://' + host + '/action/displayAbstract?aid=' + id.nodeValue] = Zotero.Utilities.capitalizeTitle(title.textContent);
		}
		Zotero.selectItems(items, function(items) {
			for (var i in items) {
				links.push(i);
			}
			Zotero.Utilities.processDocuments(links, scrape,
						function() {Zotero.done();});
		});
	} else {
		scrape(doc);
	}
	Zotero.wait();
}

function scrape (doc) {
	var namespace=doc.documentElement.namespaceURI;
	var nsResolver=namespace?function(prefix)	{
		return (prefix=="x")?namespace:null;
	}:null;

	var host = doc.location.host;
	var urlstring="http://" + host + "/action/exportCitation";
	var datastring="format=RIS&emailId=&Download=Download&componentIds=";

		var locURL = doc.location.href;
		if (doc.evaluate('//p[@class="AbsType"]', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext()) {
			var abs = doc.evaluate('//p[@class="AbsType"]', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext().textContent;
		}
		if (doc.evaluate('//p[@class="KeyWords"]', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext()) {
			var kws = doc.evaluate('//p[@class="KeyWords"]', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext().textContent.substr(11).split('; ');
		}
		var pdfpath='//div/ul/li/a[contains(text(), "PDF")]';
		if (doc.evaluate(pdfpath, doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext()) {
			var pdflink = doc.evaluate(pdfpath, doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext().href;
		}
		idRe = /aid=([0-9]+)/
		var m = idRe.exec(locURL);
		var id = m[1];
		Zotero.Utilities.doGet(urlstring + "?" + datastring+id, function(text) {
			text = text.replace(/(^|\n)?([A-Z\d]{2})\s+\-\s+(\n)?/g, "\n$2  - $3");
			var translator = Zotero.loadTranslator("import");
			// Use RIS importer
			translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
			translator.setString(text);
			translator.setHandler("itemDone", function(obj, item) {
				item.attachments = 	[{url:locURL,
										title:"Cambridge Journals Snapshot",
										mimeType:"text/html"}];
				item.title = Zotero.Utilities.capitalizeTitle(item.title);
				var authors = item.creators;
				item.creators = new Array();
				for each (var aut in authors) {
					item.creators.push({firstName:aut.firstName,
										lastName:aut.lastName,
										creatorType:"author"});
				}
				if (kws) item.tags = kws;
				if (abs) item.abstractNote = Zotero.Utilities.trimInternal(abs);
				if (pdflink) {
					// We push twice, because one will fail
					// Some PDFs aren't paywalled, so they don't need the 2nd request
					item.attachments.push({
						url: pdflink,
						title: "Cambridge Journals PDF", 
						mimeType:"application/pdf"
					});
					Zotero.Utilities.doGet(pdflink, function(text) {
						var domain = pdflink.match(/^https?:\/\/[^\/]+\//);
						var realpdf = text.match(/<iframe src="\/(action\/displayFulltext[^"]+)"/);
						if (realpdf && domain) {
							item.attachments.push({
								url: (domain[0]+realpdf[1]).replace(/&amp;/g,"&"),
								title: "Cambridge Journals PDF", 
								mimeType:"application/pdf"
							});
						}
					}, function () {
						item.complete();
					});
				} else {
					item.complete();
				}
			});
			translator.translate();
		});
	}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://journals.cambridge.org/action/quickSearch?quickSearchType=search_combined&inputField1=tatar&fieldStartMonth=01&fieldStartYear=1800&fieldEndMonth=12&fieldEndYear=2011&searchType=ADVANCESEARCH&searchTypeFrom=quickSearch&fieldScjrnl=All&fieldSccats=All&selectField1=%23&jnlId=AMS&issId=02&volId=45&journalSearchType=all",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://journals.cambridge.org/action/displayAbstract?fromPage=online&aid=8267699&fulltextType=RA&fileId=S0021875810001738",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "LAURIE A.",
						"lastName": "RODRIGUES",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					""
				],
				"seeAlso": [],
				"attachments": [
					{
						"url": false,
						"title": "Cambridge Journals Snapshot",
						"mimeType": "text/html"
					},
					{
						"url": false,
						"title": "Cambridge Journals PDF",
						"mimeType": "application/pdf"
					}
				],
				"date": "2011",
				"title": "“SAMO© as an Escape Clause”: Jean-Michel Basquiat's Engagement with a Commodified American Africanism",
				"publicationTitle": "Journal of American Studies",
				"pages": "227-243",
				"volume": "45",
				"issue": "02",
				"DOI": "10.1017/S0021875810001738",
				"libraryCatalog": "Cambridge Journals Online",
				"shortTitle": "“SAMO© as an Escape Clause”"
			}
		]
	}
]
/** END TEST CASES **/
