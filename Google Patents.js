{
	"translatorID": "d71e9b6d-2baa-44ed-acb4-13fe2fe592c0",
	"label": "Google Patents",
	"creator": "Adam Crymble, Avram Lyon",
	"target": "^http://www\\.google\\.[^/]*/(?:patents|search[^/]*[&?]tbm=pts)",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcs",
	"lastUpdated": "2012-03-13 13:41:40"
}

function detectWeb(doc, url) {
	if (!doc.getElementsByTagName("body")[0].hasChildNodes()) return;
	if (doc.location.href.match(/search.*[?&]q=/)) {
		return "multiple";
	} else if (doc.location.href.match(/[?&]id=|patents\/US/)) {
		return "patent";
	}
}

function associateData(newItem, dataTags, field, zoteroField) {
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
	while (heading = xPathHeadings.iterateNext(), content = xPathContents.iterateNext()) {
		if (heading.textContent == 'Publication number') {
			content = doc.evaluate('//div[@class="patent_bibdata"]//b[text()="Publication number"]/following::nobr[1]', doc, null, XPathResult.ANY_TYPE, null).iterateNext();
		}
		if (heading.textContent == 'Inventors') {
			content = ZU.xpathText(doc, '//div[@class="patent_bibdata"]//b[text()="Inventors"]/following::a[contains(@href,"inventor")]');
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
			if (dataTags[fieldTitle] && dataTags[fieldTitle].toUpperCase() == dataTags[fieldTitle]) {
				dataTags[fieldTitle] = Zotero.Utilities.capitalizeTitle(dataTags[fieldTitle].toLowerCase(), true);
				//deal with the quirk that a single "a" remains lowercase with capitalizeTitle
				dataTags[fieldTitle] = dataTags[fieldTitle].replace(/\sa.?\s/, " A. ");
			}
			var authors = dataTags[fieldTitle].split(", ");
			for (var j = 0; j < authors.length; j++) {

				newItem.creators.push(Zotero.Utilities.cleanAuthor(authors[j], "inventor"));
			}
		} else if (fieldTitle == "Inventor") {

			if (dataTags[fieldTitle] && dataTags[fieldTitle].toUpperCase() == dataTags[fieldTitle]) {
				dataTags[fieldTitle] = Zotero.Utilities.capitalizeTitle(dataTags[fieldTitle].toLowerCase(), true);
				//deal with the quirk that a single "a" remains lowercase with capitalizeTitle
				dataTags[fieldTitle] = dataTags[fieldTitle].replace(/\sa.?\s/, " A. ");
			}
			newItem.creators.push(Zotero.Utilities.cleanAuthor(dataTags["Inventor"], "inventor"));
		}

		if (fieldTitle == "Current U.S. Classification") {
			newItem.extra += "U.S. Classification: " + dataTags["Current U.S. Classification"] + "\n";
		} else if (fieldTitle == "International Classification") {
			newItem.extra += "International Classification: " + dataTags["International Classification"] + "\n";
		} else if (fieldTitle == "Publication number") {
			newItem.extra += "Publication number: " + dataTags["Publication number"] + "\n";
		}
	}

	associateData(newItem, dataTags, "Patent number", "patentNumber");
	associateData(newItem, dataTags, "Issue date", "date");
	associateData(newItem, dataTags, "Filing date", "filingDate");
	associateData(newItem, dataTags, "Assignees", "assignee");
	associateData(newItem, dataTags, "Assignee", "assignee");
	associateData(newItem, dataTags, "Original Assignee", "assignee");
	associateData(newItem, dataTags, "Abstract", "abstractNote");
	associateData(newItem, dataTags, "Application number", "applicationNumber");

	newItem.title = ZU.xpathText(doc, '//h1[@class="gb-volume-title"]');
	newItem.url = doc.location.href.replace(/(^[^\?]*\?id=[a-zA-Z0-9\-\_]+).*/, "$1");

	// Fix things in uppercase
	var toFix = ["title", "shortTitle", "assignee"];
	for each(var i in toFix) {
		if (newItem[i] && newItem[i].toUpperCase() == newItem[i]) newItem[i] = Zotero.Utilities.capitalizeTitle(newItem[i].toLowerCase(), true);
	}

	var pdf = doc.evaluate('//a[@id="appbar-download-pdf-link"]', doc, null, XPathResult.ANY_TYPE, null).iterateNext();
	if (pdf) newItem.attachments.push({
		url: pdf.href,
		title: "Google Patents PDF",
		mimeType: "application/pdf"
	});

	newItem.complete();
}

function doWeb(doc, url) {
	var host = 'http://' + doc.location.host + "/";

	if (detectWeb(doc, url) == "multiple") {
		var items = Zotero.Utilities.getItemArray(doc, doc, /\/patents\?id=/);
		var trimmed = {};
		var hit;
		for (i in items) {
			hit = i.match(/^https?:\/\/(?:www\.)?google\.[^/]+\/patents\?id=[0-9A-Za-z\-\_]+/);
			if (hit && !trimmed[hit[0]]) {
				trimmed[hit[0]] = items[i];
			}
		}
		Zotero.selectItems(trimmed, function (items) {
			var articles = new Array();
			for (var i in items) {
				articles.push(i);
			}
			Zotero.Utilities.processDocuments(articles, scrape, function () {
				Zotero.done();
			});
			Zotero.wait();
		});
	} else {
		//make sure we always get the overview page - but only reload the page when necessary
		var newurl;
		if (url.match(/printsec=|v=onepage|v=thumbnail/)) {
			//patent pages directly naviageted to from search results have the id somewhere in the URL
			if (url.match(/[\&\?]id=[0-9A-Za-z\-]+/)) {
				var id = url.match(/[\&\?]id=[0-9A-Za-z\-\_]+/)[0].replace(/\&/, "?");
				newurl = host + "patents" + id;
			} else {
				//these URLs are navigated to from the patent page - they usually have the form patents/US12345
				newurl = url.replace(/\?.*/, "");
			}
			ZU.processDocuments(newurl, scrape, function () {
				Zotero.done();
			})
		} else scrape(doc, url);
	}
}


/** BEGIN TEST CASES **/
var testCases = [{
	"type": "web",
	"url": "http://www.google.com/search?tbm=pts&tbo=1&hl=en&q=book&btnG=Search+Patents",
	"items": "multiple"
}, {
	"type": "web",
	"url": "http://www.google.com/patents/about?id=j5NSAAAAEBAJ",
	"items": [{
		"itemType": "patent",
		"creators": [{
			"firstName": "T.",
			"lastName": "Shook",
			"creatorType": "inventor"
		}],
		"notes": [],
		"tags": [],
		"seeAlso": [],
		"attachments": [{
			"url": "http://www.google.com/patents/US1065211.pdf",
			"title": "Google Patents PDF",
			"mimeType": "application/pdf"
		}],
		"country": "United States",
		"extra": "U.S. Classification: 215/273",
		"patentNumber": "1065211",
		"date": "Jun 17, 1913",
		"filingDate": "Aug 3, 1912",
		"title": "Bottle-Stopper",
		"url": "http://www.google.com/patents/about?id=j5NSAAAAEBAJ",
		"libraryCatalog": "Google Patents",
		"accessDate": "CURRENT_TIMESTAMP"
	}]
}, {
	"type": "web",
	"url": "http://www.google.com/patents/about?id=KchEAAAAEBAJ",
	"items": [{
		"itemType": "patent",
		"creators": [{
			"firstName": "Jonathan A.",
			"lastName": "Hunt",
			"creatorType": "inventor"
		}],
		"notes": [],
		"tags": [],
		"seeAlso": [],
		"attachments": [{
			"title": "Google Patents PDF",
			"mimeType": "application/pdf"
		}],
		"country": "United States",
		"extra": "U.S. Classification: 411/477",
		"patentNumber": "1120656",
		"date": "Dec 8, 1914",
		"filingDate": "Jan 14, 1914",
		"assignee": "Hunt Specialty Manufacturing Company",
		"title": "A Corpobation Of",
		"url": "http://www.google.com/patents/about?id=KchEAAAAEBAJ",
		"libraryCatalog": "Google Patents",
		"accessDate": "CURRENT_TIMESTAMP"
	}]
}, {
	"type": "web",
	"url": "http://www.google.fr/patents?id=Nh17AAAAEBAJ",
	"items": [{
		"itemType": "patent",
		"creators": [{
			"firstName": "Hisatada",
			"lastName": "Miyatake",
			"creatorType": "inventor"
		}, {
			"firstName": "Kohki",
			"lastName": "Noda",
			"creatorType": "inventor"
		}, {
			"firstName": "Toshio",
			"lastName": "Sunaga",
			"creatorType": "inventor"
		}, {
			"firstName": "Hiroshi",
			"lastName": "Umezaki",
			"creatorType": "inventor"
		}, {
			"firstName": "Hideo",
			"lastName": "Asano",
			"creatorType": "inventor"
		}, {
			"firstName": "Koji",
			"lastName": "Kitamura",
			"creatorType": "inventor"
		}],
		"notes": [],
		"tags": [],
		"seeAlso": [],
		"attachments": [{
			"url": "http://www.google.fr/patents/US7123498.pdf",
			"title": "Google Patents PDF",
			"mimeType": "application/pdf"
		}],
		"abstractNote": "MRAM has read word lines WLR and write word line WLW extending in the y direction, write/read bit line BLW/R and write bit line BLW extending in the x direction, and the memory cells MC disposed at the points of the intersection of these lines. The memory MC includes sub-cells SC1 and SC2. The sub-cell SC1 includes magneto resistive elements MTJ1 and MTJ2 and a selection transistor Tr1, and the sub-cell SC2 includes magneto resistive elements MTJ3 and MTJ4 and a selection transistor Tr2. The magneto resistive elements MTJ1 and MTJ2 are connected in parallel, and the magneto resistive elements MTJ3 and MTJ4 are also connected in parallel. Further, the sub-cells SC1 and SC2 are connected in series between the write/read bit line BLW/R and the ground.",
		"country": "United States",
		"extra": "U.S. Classification: 365/63",
		"patentNumber": "7123498",
		"date": "17 Oct 2006",
		"filingDate": "12 Oct 2004",
		"assignee": "International Business Machines Corporation",
		"applicationNumber": "10/964,352",
		"title": "Non-volatile memory device",
		"url": "http://www.google.fr/patents?id=Nh17AAAAEBAJ",
		"libraryCatalog": "Google Patents",
		"accessDate": "CURRENT_TIMESTAMP"
	}]
}, {
	"type": "web",
	"url": "http://www.google.com/patents?id=PGk-AAAAEBAJ&printsec=abstract#v=onepage&q&f=false",
	"items": [{
		"itemType": "patent",
		"creators": [{
			"firstName": "O'Dean P.",
			"lastName": "Judd",
			"creatorType": "inventor"
		}],
		"notes": [],
		"tags": [],
		"seeAlso": [],
		"attachments": [{
			"url": "http://www.google.com/patents/US4390992.pdf",
			"title": "Google Patents PDF",
			"mimeType": "application/pdf"
		}],
		"abstractNote": "A device and method for optically pumping a gaseous laser using blackbody radiation produced by a plasma channel which is formed from an electrical discharge between two electrodes spaced at opposite longitudinal ends of the laser. A preionization device which can comprise a laser or electron beam accelerator produces a preionization beam which is sufficient to cause an electrical discharge between the electrodes to initiate the plasma channel along the preionization path. The optical pumping energy is supplied by a high voltage power supply rather than by the preionization beam. High output optical intensities are produced by the laser due to the high temperature blackbody radiation produced by the plasma channel, in the same manner as an exploding wire type laser. However, unlike the exploding wire type laser, the disclosed invention can be operated in a repetitive manner by utilizing a repetitive pulsed preionization device.",
		"country": "United States",
		"extra": "U.S. Classification: 372/70\nInternational Classification: : H01S  3091",
		"patentNumber": "4390992",
		"date": "Jun 28, 1983",
		"filingDate": "Jul 17, 1981",
		"assignee": "The United States of America as represented by the United States Department of Energy",
		"title": "Plasma channel optical pumping device and method",
		"url": "http://www.google.com/patents?id=PGk-AAAAEBAJ",
		"libraryCatalog": "Google Patents",
		"accessDate": "CURRENT_TIMESTAMP"
	}]
}]
/** END TEST CASES **/
