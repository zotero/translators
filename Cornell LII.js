{
	"translatorID": "930d49bc-44a1-4c22-9dde-aa6f72fb11e5",
	"label": "Cornell LII",
	"creator": "Bill McKinney",
	"target": "^http://www\\.law\\.cornell\\.edu/supct/html/.+",
	"minVersion": "1.0.0b4.r1",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "g",
	"lastUpdated": "2011-10-27 23:57:31"
}

function detectWeb(doc, url) {
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
		if (prefix == 'x') return namespace; else return null;
	} : null;
	
	var liiRegexp = /http:\/\/www\.law\.cornell\.edu\/supct\/html\/.+/
	if(liiRegexp.test(url)) {
		return "case";
	} else {
		var aTags = doc.getElementsByTagName("a");
		for(var i=0; i<aTags.length; i++) {
			if(articleRegexp.test(aTags[i].href)) {
				return "multiple";
			}
		}
	}
}

function associateMeta(newItem, metaTags, field, zoteroField) {
	var field = metaTags.namedItem(field);
	if(field) {
		newItem[zoteroField] = field.getAttribute("content");
	}
}

function scrape(doc) {

	var caselawCourt = "U.S. Supreme Court";
	var caselawJurisdiction = "Federal";
	var caselawSourceReporter = "U.S.";
	var caselawSourceVolume = "___";
	var caselawSourceStartPage = "___";
	var caselawParallelSourceVolume = "___";
	var caselawParallelSourceStartPage = "___";
	var caselawParallelSourceReporter = "___";
	var caselawDecisionYear = "";
	
	var newItem = new Zotero.Item("case");
	newItem.url = doc.location.href;
	newItem.language = "en-us";
	newItem.court = "U.S. Supreme Court";
	newItem.reporter = "U.S.";
	
	// LII provides a bunch of meta tags to harvest
	var metaTags = doc.getElementsByTagName("meta");
	associateMeta(newItem, metaTags, "CASENAME", "title");
	associateMeta(newItem, metaTags, "CASENAME", "caseName");
	//associateMeta(newItem, metaTags, "DOCKET", "caselawDocket");
	//associateMeta(newItem, metaTags, "PARTY1", "caselawParty1");
	//associateMeta(newItem, metaTags, "PARTY2", "caselawParty2");
	//associateMeta(newItem, metaTags, "ARGDATE", "caselawArguedDate");
	//associateMeta(newItem, metaTags, "DECDATE", "dateDecided");
	associateMeta(newItem, metaTags, "COURTBELOW", "history");
	//associateMeta(newItem, metaTags, "ACTION", "caselawCourtAction");


	var tmpCasename = newItem.caseName;
	tmpCasename = Zotero.Utilities.capitalizeTitle(tmpCasename.toLowerCase());
	tmpCasename = tmpCasename.replace("V.", "v.");
	newItem.caseName = tmpCasename;
	newItem.shortTitle = tmpCasename;
	
	// judge
	var j = metaTags.namedItem("AUTHOR");
	if(j) {
		// Some entries the AUTHOR meta tag content is empty, this makes zotero unhappy, adding a default
		newItem.creators.push({lastName:j.getAttribute("content") ? j.getAttribute("content") : "Author Not Provided", creatorType:"judge", fieldMode:true});
	}

	// group meta tags
	for(var i=0; i<metaTags.length; i++) {
		var key = metaTags[i].getAttribute("name");
		var value = metaTags[i].getAttribute("content");
		if (key == "GROUP") {
			newItem.tags.push(value);		
		}
	}
	
	// parse year out of decision date
	var decdateField = metaTags.namedItem("DECDATE");
	if(decdateField ) {
		var decisionYearRegex = /(\w+)\s+(\d+),\s+(\d+)/
		var decisionDateMatch = decisionYearRegex.exec(decdateField.getAttribute("content"));
		var dy;
		var dm;
		var dd;
		if (decisionDateMatch ) {
			dm = decisionDateMatch[1];
			dd = decisionDateMatch[2];
			dy = decisionDateMatch [3];
			caselawDecisionYear = dy;
			newItem.dateDecided = dy + " " + dm + " " + dd;
		}
	}

	// create attachment to pdf
	var dyRegex = /^(.+)\/html\/(.+)(\.Z\w+)\.html$/;
	var dyMatch = dyRegex.exec(newItem.url);
	if (dyMatch) {
		var pdfUrl = dyMatch[1]+"/pdf/"+dyMatch[2]+"P"+dyMatch[3];
		newItem.attachments.push({url:pdfUrl, title:"PDF version", mimeType:"application/pdf", downloadable:true});
	}

	// parse disposition
	var dis = doc.getElementsByTagName("DISPOSITION");
	if (dis.length > 0) {
		var tmpDis = dis[0].innerHTML;
		tmpDis = tmpDis.replace(/\s+/g, " ");
		newItem.title = newItem.title + " (" +	tmpDis + ")";	
		newItem.caseName= newItem.caseName + " (" +	tmpDis + ")";	
		
	}
	
	
	// parse citation into parts so that bluebook can be constructed
	var cite = doc.getElementsByTagName("CASENUMBER");
	if (cite.length > 0) {
			var citeRegex = /([0-9]+)\s+U\.S\.\s+([0-9]+)/;
			var citeMatch = citeRegex.exec(cite[0].innerHTML);
			if (citeMatch) {
				caselawSourceVolume = citeMatch[1];
				newItem.reporterVolume = citeMatch[1];
				caselawSourceStartPage = citeMatch[2];
				newItem.firstPage = citeMatch[2];
			}
	}
	
	// look for offcite span element
	var spanTags = doc.getElementsByTagName("span");
	if (spanTags.length > 0) {
		for(var i=0; i<spanTags.length; i++) {
			if(spanTags[i].className == "offcite") {
				var citeRegex = /([0-9]+)\s+U\.S\.\s+([0-9]+)/;
				var citeMatch = citeRegex.exec(spanTags[i].innerHTML);
				if (citeMatch) {
					caselawSourceVolume = citeMatch[1];
					newItem.reporterVolume = citeMatch[1];
					caselawSourceStartPage = citeMatch[2];
					newItem.firstPage = citeMatch[2];
				}
				break;	
			}
		}
	}
	
	// bluebook citation	
	var bbCite = newItem.shortTitle + ", " + 
		caselawSourceVolume + " " + 
		caselawSourceReporter + " " + 
		caselawSourceStartPage;
	// paralell cite	
	if (caselawParallelSourceVolume != "___") {
		bbCite = bbCite + ", " + caselawParallelSourceVolume +
		" " + caselawParallelSourceReporter + " " +
		caselawParallelSourceStartPage;
	}	
	// jurisdiction and year
	bbCite = bbCite + " (" + caselawDecisionYear + ")";
	// closing period
	bbCite = "Bluebook citation: " + bbCite + ".";
	newItem.notes.push({note:bbCite});
	
	// parse out publication notice
	var notice = doc.getElementsByTagName("NOTICE");
	if (notice .length > 0) {
		var tmpNotice= notice [0].innerHTML;
		tmpNotice= tmpNotice.replace(/\s+/g, " ");
		newItem.notes.push({note:tmpNotice});		
	}
	
	newItem.complete();
}

function doWeb(doc, url) {
	var liiRegexp = /http:\/\/www\.law\.cornell\.edu\/supct\/html\/.+/
	if(liiRegexp.test(url)) {
		scrape(doc);
	} else {
		
		var items = Zotero.Utilities.getItemArray(doc, doc, liiRegexp);
		items = Zotero.selectItems(items);
		
		if(!items) {
			return true;
		}
		
		var urls = new Array();
		for(var i in items) {
			urls.push(i);
		}
		
		Zotero.Utilities.processDocuments(urls, scrape, function() { Zotero.done(); });
		Zotero.wait();
	}
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.law.cornell.edu/supct/html/01-618.ZD1.html",
		"items": [
			{
				"itemType": "case",
				"creators": [
					{
						"lastName": "Breyer",
						"creatorType": "judge",
						"fieldMode": true
					}
				],
				"notes": [
					{
						"note": "Bluebook citation: eldred v. ashcroft, 537 U.S. 186 (2003)."
					}
				],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"url": "http://www.law.cornell.edu/supct/pdf/01-618P.ZD1",
						"title": "PDF version",
						"mimeType": "application/pdf",
						"downloadable": true
					}
				],
				"url": "http://www.law.cornell.edu/supct/html/01-618.ZD1.html",
				"language": "en-us",
				"court": "U.S. Supreme Court",
				"reporter": "U.S.",
				"title": "ELDRED V. ASHCROFT (Breyer, J., dissenting)",
				"caseName": "eldred v. ashcroft (Breyer, J., dissenting)",
				"history": "ON WRIT OF CERTIORARI TO THE UNITED STATES COURT OF APPEALS FOR THE DISTRICT OF COLUMBIA CIRCUIT",
				"shortTitle": "eldred v. ashcroft",
				"dateDecided": "2003 January 15",
				"reporterVolume": "537",
				"firstPage": "186",
				"libraryCatalog": "Cornell LII",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	}
]
/** END TEST CASES **/