{
	"translatorID": "d71e9b6d-2baa-44ed-acb4-13fe2fe592c0",
	"label": "Google Patents",
	"creator": "Adam Crymble, Avram Lyon",
	"target": "^http://www\\.google\\.[^/]*/patents",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcs",
	"lastUpdated": "2011-10-16 13:19:29"
}

function detectWeb(doc, url) {
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
		if (prefix == 'x') return namespace; else return null;
	} : null;
	
	if(doc.location.href.match(/[?&]q=/)) {
		return "multiple";
	} else if(doc.location.href.match(/[?&]id=/)) {
		return "patent";
	}
}

//Google Patents Translator. Code by Adam Crymble

function associateData (newItem, dataTags, field, zoteroField) {
	if (dataTags[field]) {
		newItem[zoteroField] = dataTags[field];
	}
}

function scrape(doc, url) {
	var dataTags = new Object();
	var newItem = new Zotero.Item("patent");


	newItem.abstractNote = ZU.xpathText(doc, '//p[@class="patent_abstract_text"]');
	// XXX This is temporary, but Google Patents currently covers only US patents
	newItem.country = "United States";

	//Grab the patent_bibdata items and the text node directly next to them 
	var xPathHeadings = doc.evaluate('//div[@class="patent_bibdata"]//b', doc, null, XPathResult.ANY_TYPE, null);
	// We avoid the next node containing only :\u00A0 (colon followed by a non-breaking space),
	// since it is a separate node when the field's value is linked (authors, assignees).
	var xPathContents = doc.evaluate('//div[@class="patent_bibdata"]//b/following::text()[not(.=":\u00A0")][1]', doc, null, XPathResult.ANY_TYPE, null);
	
	// create an associative array of the items and their contents
	var heading, content;
	while( heading = xPathHeadings.iterateNext(), content = xPathContents.iterateNext()){
		if(heading.textContent == 'Publication number'){
			content = doc.evaluate('//div[@class="patent_bibdata"]//b[text()="Publication number"]/following::nobr[1]', doc, null, XPathResult.ANY_TYPE, null).iterateNext();
		}
		if(heading.textContent == 'Inventors'){
			content = ZU.xpathText(doc,'//div[@class="patent_bibdata"]//b[text()="Inventors"]/following::a[contains(@href,"inventor")]');
			dataTags["Inventors"] = content;
		} else {
			dataTags[heading.textContent] = content.textContent.replace(": ", '');;
		}
		//Zotero.debug(dataTags);
	}
	
	if (doc.evaluate('//td[3]/p', doc, null, XPathResult.ANY_TYPE, null).iterateNext()) {
		newItem.abstractNote = (doc.evaluate('//td[3]/p', doc, null, XPathResult.ANY_TYPE, null).iterateNext().textContent.replace("Abstract", ''));
	}	
	
	
	/*
	for (var i =0; i < xPathCount.numberValue; i++) {
		
		headings.push(xPathHeadings.iterateNext().textContent);	
		contents = contents.replace(headings[i], "xxx");	
	}
	
	
	var splitContent = new Array();
	splitContent = contents.split(/xxx/);
	*/
	//associate headings with contents.
	
	//extra field
	newItem.extra = '';

	for (fieldTitle in dataTags) {
		//fieldTitle = item.replace(/\s+|\W*/g, '');
		/*
		if (fieldTitle == "US Classification" | fieldTitle == "International Classification" | fieldTitle == "Abstract") {
			dataTags[fieldTitle] = splitContent[i+1];
		} else {
			dataTags[fieldTitle] = splitContent[i+1].replace(": ", '');
		}
		*/
		if (dataTags[fieldTitle].match("About this patent")) {
			dataTags[fieldTitle] = dataTags[fieldTitle].replace("About this patent", '');
		}
		
	//author(s)
		if (fieldTitle == "Inventors") {
			if (dataTags[fieldTitle] && dataTags[fieldTitle].toUpperCase() == dataTags[fieldTitle])
				dataTags[fieldTitle] = Zotero.Utilities.capitalizeTitle(dataTags[fieldTitle].toLowerCase(), true);
			var authors = dataTags[fieldTitle].split(", ");
			for (var j = 0; j < authors.length; j++) {
				newItem.creators.push(Zotero.Utilities.cleanAuthor(authors[j], "inventor"));
			}
		} else if (fieldTitle == "Inventor") {
			if (dataTags[fieldTitle] && dataTags[fieldTitle].toUpperCase() == dataTags[fieldTitle])
				dataTags[fieldTitle] = Zotero.Utilities.capitalizeTitle(dataTags[fieldTitle].toLowerCase(), true);
			newItem.creators.push(Zotero.Utilities.cleanAuthor(dataTags["Inventor"], "inventor"));
		}
		
		if (fieldTitle == "Current U.S. Classification"  ) {
			newItem.extra += "U.S. Classification: " + dataTags["Current U.S. Classification"]+"\n";
		} else if (fieldTitle == "International Classification" ) {
			newItem.extra += "International Classification: " + dataTags["International Classification"]+"\n";
		}	else if (fieldTitle == "Publication number" ) {
			newItem.extra += "Publication number: " +dataTags["Publication number"]+"\n";
		}
	}

	associateData (newItem, dataTags, "Patent number", "patentNumber");
	associateData (newItem, dataTags, "Issue date", "date");
	associateData (newItem, dataTags, "Filing date", "filingDate");
	associateData (newItem, dataTags, "Assignees", "assignee");
	associateData (newItem, dataTags, "Assignee", "assignee");
	associateData (newItem, dataTags, "Original Assignee", "assignee");
	associateData (newItem, dataTags, "Abstract", "abstractNote");
	associateData (newItem, dataTags, "Application number", "applicationNumber");
	
	newItem.title = doc.evaluate('//h1[@class="gb-volume-title"]', doc, null, XPathResult.ANY_TYPE, null).iterateNext().textContent;
	newItem.url = doc.location.href.replace(/(^[^\?]*\?id=[a-zA-Z0-9]+).*/,"$1");

	// Fix things in uppercase
	var toFix = [ "title", "shortTitle", "assignee" ];
	for each (var i in toFix) {
		if (newItem[i] && newItem[i].toUpperCase() == newItem[i])
		newItem[i] = Zotero.Utilities.capitalizeTitle(newItem[i].toLowerCase(), true);
	}

	var pdf = doc.evaluate('//div[@class="g-button-basic"]//a[contains(@href,"/download/")]', doc, null, XPathResult.ANY_TYPE, null).iterateNext();
	if (pdf) newItem.attachments.push({url:pdf.href, title:"Google Patents PDF", mimeType:"application/pdf"});

	newItem.complete();
}

function doWeb(doc, url) {
	var host = 'http://' + doc.location.host + "/";
	
	if (detectWeb(doc, url) == "multiple") {
		var items = Zotero.Utilities.getItemArray(doc, doc, /\/patents(?:\/about)?\?id=/);
		Zotero.selectItems(items, function (items) {
			var articles = new Array();
			for (var i in items) {
				articles.push(i);
			}
			Zotero.Utilities.processDocuments(articles, scrape, function() {Zotero.done();});
			Zotero.wait();
		});			
	} else {
		scrape(doc);
	}
}


/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.google.com/patents/about?id=j5NSAAAAEBAJ",
		"items": [
			{
				"itemType": "patent",
				"creators": [
					{
						"firstName": "T.",
						"lastName": "Shook",
						"creatorType": "inventor"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"url": "http://www.google.com/patents/download/1065211_BOTTLE_STOPPER.pdf?id=j5NSAAAAEBAJ&output=pdf&sig=ACfU3U1IW3o2y-wcE_CaWx3h-dlawJw3SQ&source=gbs_overview_r&cad=0",
						"title": "Google Patents PDF",
						"mimeType": "application/pdf"
					}
				],
				"extra": "U.S. Classification: 215/273",
				"patentNumber": "1065211",
				"date": "Jun 17, 1913",
				"filingDate": "Aug 3, 1912",
				"title": "Bottle-Stopper",
				"url": "http://www.google.com/patents/about?id=j5NSAAAAEBAJ",
				"libraryCatalog": "Google Patents",
				"accessDate": "CURRENT_TIMESTAMP",
				"checkFields": "title"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.google.com/search?tbm=pts&tbo=1&hl=en&q=book&btnG=Search+Patents",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.google.com/patents/about?id=KchEAAAAEBAJ",
		"items": [
			{
				"itemType": "patent",
				"creators": [
					{
						"firstName": "Jonathan a.",
						"lastName": "Hunt",
						"creatorType": "inventor"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"url": "http://www.google.com/patents/download/1120656_A_CORPOBATION_OF.pdf?id=KchEAAAAEBAJ&output=pdf&sig=ACfU3U0aFZjZxlKB8pW3J_BglwI49i6xig&source=gbs_overview_r&cad=0",
						"title": "Google Patents PDF",
						"mimeType": "application/pdf"
					}
				],
				"extra": "U.S. Classification: 411/477",
				"patentNumber": "1120656",
				"date": "Dec 8, 1914",
				"filingDate": "Jan 14, 1914",
				"assignee": "Hunt Specialty Manufacturing Company",
				"title": "A Corpobation Of",
				"url": "http://www.google.com/patents/about?id=KchEAAAAEBAJ",
				"libraryCatalog": "Google Patents",
				"accessDate": "CURRENT_TIMESTAMP",
				"checkFields": "title"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.google.fr/patents?id=Nh17AAAAEBAJ",
		"items": [
			{
				"itemType": "patent",
				"creators": [
					{
						"firstName": "Hisatada",
						"lastName": "Miyatake",
						"creatorType": "inventor"
					},
					{
						"firstName": "Kohki",
						"lastName": "Noda",
						"creatorType": "inventor"
					},
					{
						"firstName": "Toshio",
						"lastName": "Sunaga",
						"creatorType": "inventor"
					},
					{
						"firstName": "Hiroshi",
						"lastName": "Umezaki",
						"creatorType": "inventor"
					},
					{
						"firstName": "Hideo",
						"lastName": "Asano",
						"creatorType": "inventor"
					},
					{
						"firstName": "Koji",
						"lastName": "Kitamura",
						"creatorType": "inventor"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"url": "http://www.google.fr/patents/download/7123498_Non_volatile_memory_device.pdf?id=Nh17AAAAEBAJ&output=pdf&sig=ACfU3U04Tn3o-e6Qv6NxqD3Qg1PTcbCunQ&source=gbs_overview_r&cad=0",
						"title": "Google Patents PDF",
						"mimeType": "application/pdf"
					}
				],
				"extra": "U.S. Classification: 365/63",
				"patentNumber": "7123498",
				"date": "17 Oct 2006",
				"filingDate": "12 Oct 2004",
				"assignee": "International Business Machines Corporation",
				"applicationNumber": "10/964,352",
				"title": "Non-volatile memory device",
				"url": "http://www.google.fr/patents?id=Nh17AAAAEBAJ",
				"libraryCatalog": "Google Patents",
				"accessDate": "CURRENT_TIMESTAMP",
				"checkFields": "title"
			}
		]
	}
]
/** END TEST CASES **/
