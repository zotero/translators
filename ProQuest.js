{
	"translatorID": "fce388a6-a847-4777-87fb-6595e710b7e7",
	"label": "ProQuest",
	"creator": "Avram Lyon",
	"target": "^https?://search\\.proquest\\.com[^/]*(/abi[a-z]*|/pqrl|/pqdt|/pqdtft|/hnp[a-z]*|dissertations)?/(docview|publication|publicationissue|results)",
	"minVersion": "2.1",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcs",
	"lastUpdated": "2012-01-11 09:09:04"
}

/*
   ProQuest Translator
   Copyright (C) 2011 Avram Lyon, ajlyon@gmail.com

   This program is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 3 of the License, or
   (at your option) any later version.

   This program is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/


function detectWeb(doc, url) {
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
		if (prefix == 'x') return namespace; else return null;
	} : null;
	
	var record_rows = doc.evaluate('//div[@class="display_record_indexing_row"]', doc, nsResolver, XPathResult.ANY_TYPE, null);
	if (record_rows.iterateNext()) {
		type = doc.evaluate('//div[@class="display_record_indexing_fieldname" and contains(text(),"Document Type")]/following-sibling::div[@class="display_record_indexing_data"]',
							doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext();
		if (type) {
			type = type.textContent.trim();
			type = mapToZotero(type);
			if (type) return type;
		} else if (url.match(/\/dissertations\//)) {
			return "thesis";
		}
		// Fall back on journalArticle-- even if we couldn't guess the type
		return "journalArticle";
	}
	
	if (url.indexOf("/results/") === -1) {
		var abstract_link = doc.evaluate('//a[@class="formats_base_sprite format_abstract"]', doc, nsResolver, XPathResult.ANY_TYPE, null);
		if (abstract_link.iterateNext()) {
			return "journalArticle";	
		}
	}
	var resultitem = doc.evaluate('//li[@class="resultItem" or contains(@class, "resultItem ")]', doc, nsResolver, XPathResult.ANY_TYPE, null);
	if (resultitem.iterateNext()) {
		return "multiple";
	}
	return false;
}

function doWeb(doc, url) {
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
		if (prefix == 'x') return namespace; else return null;
	} : null;
	
	var detected = detectWeb(doc,url);
	if (detected && detected != "multiple") {
		scrape(doc,url);
	} else if (detected) {
		var articles = new Array();
		var results = doc.evaluate('//li[@class="resultItem" or contains(@class, "resultItem ")]', doc, nsResolver, XPathResult.ANY_TYPE, null);
		var items = new Array();
		var result;
		while(result = results.iterateNext()) {
			var link = doc.evaluate('.//a[contains(@class,"previewTitle") or contains(@class,"resultTitle")]', result, nsResolver, XPathResult.ANY_TYPE, null).iterateNext();
			var title = link.textContent;
			var url = link.href;
			items[url] = title;
		}
		Zotero.selectItems(items, function (items) {
			if(!items) return true;
			for (var i in items) {
				articles.push(i);
			}
			Zotero.Utilities.processDocuments(articles, scrape, function () {Zotero.done();});
		});
		Zotero.wait();
	}
}

function scrape (doc) {
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
		if (prefix == 'x') return namespace; else return null;
	} : null;
	
	var record_rows = doc.evaluate('//div[@class="display_record_indexing_row"]', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext();
	var abstract_link = doc.evaluate('//a[@class="formats_base_sprite format_abstract"]', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext();
	if (!record_rows && abstract_link) {
		Zotero.Utilities.processDocuments(abstract_link.href, scrape, function() {Zotero.done();});
		return true;
	}
	var url = doc.location.href;
	
	// ProQuest provides us with two different data sources; we can pull the RIS
	// (which is nicely embedded in each page!), or we can scrape the Display Record section
	// We're going to prefer the latter, since it gives us richer data.
	// But since we have it without an additional request, we'll see about falling back on RIS for missing data
	
	var item = new Zotero.Item();
	var record_rows = doc.evaluate('//div[@class="display_record_indexing_row"]', doc, nsResolver, XPathResult.ANY_TYPE, null);
	var record_row;
	item.place = [];
	item.thesisType = [];
	var account_id;
	while (record_row = record_rows.iterateNext()) {
		var field = doc.evaluate('./div[@class="display_record_indexing_fieldname"]', record_row, nsResolver, XPathResult.ANY_TYPE, null).iterateNext()
		if (!field) continue;
		field = field.textContent.trim();
		var value = doc.evaluate('./div[@class="display_record_indexing_data"]', record_row, nsResolver, XPathResult.ANY_TYPE, null).iterateNext().textContent.trim();
		// Separate values in a single field are generally wrapped in <a> nodes; pull a list of them
		var valueAResult = doc.evaluate('./div[@class="display_record_indexing_data"]/a', record_row, nsResolver, XPathResult.ANY_TYPE, null);
		var valueA;
		var valueAArray = [];
		// We would like to get an array of the text for each <a> node
		if (valueAResult) {
			while(valueA = valueAResult.iterateNext()) {
				valueAArray.push(valueA.textContent);
			}
		}
		switch (field) {
			case "Title":
					item.title = ZU.capitalizeTitle(value); 
					if (item.title == item.title.toUpperCase()) {
		item.title = Zotero.Utilities.capitalizeTitle(item.title.toLowerCase(),true);
	  }
					break;
			case "Author":
					item.creators = valueAArray.map(
							function(author) {
								return Zotero.Utilities.cleanAuthor(author,
									"author",
									author.indexOf(',') !== -1); // useComma
							});
					break;
					
					//for me the tag is always "Author" but let's keep "Authors" to be safe.
			case "Authors":
					item.creators = valueAArray.map(
							function(author) {
								return Zotero.Utilities.cleanAuthor(author,
									"author",
									author.indexOf(',') !== -1); // useComma
							});
					break;		
			case "Publication title":
					item.publicationTitle = value; break;
			case "Volume":
					item.volume = value; break;
			case "Issue":
					item.issue = value; break;
			case "Pages":
			case "First Page":
					item.pages = value; break;
			case "Number of pages":
					item.numPages = value; break;
			case "Publication year": 
			case "Year":
					item.date = (item.date) ? item.date : value; break;
			case "Publication date":
					item.date = value; break;
			case "Publisher":
					item.publisher = value; break;
			case "Place of publication": // TODO Change to publisher-place when schema changes
					item.place[0] = value; break;
			case "Dateline":	// TODO Change to event-place when schema changes
					item.place[0] = value; break;
			case "School location":	// TODO Change to publisher-place when schema changes
					item.place[0] = value; break;
			// blacklisting country-- ProQuest regularly gives us Moscow, United States
			//case "Country of publication":
			//		item.place[1] = value; break;
			case "ISSN":
					item.ISSN = value; break;
			case "ISBN":
					item.ISBN = value; break;
			case "DOI":
					item.DOI = value; break;
			case "School":
					item.university = value; break;
			case "Degree":
					item.thesisType[0] = value; break;
			case "Department":
					item.thesisType[1] = value; break;
			case "Advisor":		// TODO Map when exists in Zotero
					break;
			case "Source type":
			case "Document type":
					item.itemType = (mapToZotero(value)) ? mapToZotero(value) : item.itemType; break;
			case "Copyright":
					item.rights = value; break;
			case "Database":
					value = value.replace(/^\d\s+databasesView list\s+Hide list/,'');
					value = value.replace(/(ProQuest.*)(ProQuest.*)/,'$1; $2');
					item.libraryCatalog = value; break;
			case "Document URL":
					item.attachments.push({url:value.replace(/\?accountid=[0-9]+$/,'')+"/abstract",
								title: "ProQuest Record",
								mimeType: "text/html"}); break;
			case "ProQuest document ID":
					item.callNumber = value; break;
			case "Language of publication":
					item.language = value; break;
			case "Section":
					item.section = value; break;
			case "Identifiers / Keywords":
					item.tags = value.split(', '); break;
			case "Subjects":
					item.tags = valueAArray; break;
			default: Zotero.debug("Discarding unknown field '"+field+"' => '" +value+ "'");
		}
	}
	
	var abs = ZU.xpathText(doc, '//div[contains(@id, "abstract_field") or contains(@id, "abstractSummary")]/p');
	if (abs) {
		//Z.debug(abs);
		item.abstractNote = abs
					.replace(/\[\s*[Ss]how all\s*\].*/,"")
					.replace(/\[\s*[Ss]how less\s*\].*/,"")
					.replace(/\[\s*PUBLICATION ABSTRACT\s*\]/,"")
					.replace(/^\s*,/, "")  //remove commas at beginning and end
					.replace(/[\s*,\s*]*$/, "")
					.trim();
	}
	
	item.place = item.place.join(', ');
	item.thesisType = item.thesisType.join(', ');
	item.URL= doc.location.href;
	item.proceedingsTitle = item.publicationTitle;
	
	// On historical newspapers, we see:
	// Rights: Copyright New York Times Company Dec 1, 1852
	// Date: 1852
	// We can improve on this, so we do, but if there's no full-text there's no item.rights, so first test for that.
	if(item.rights)	{
		var fullerDate = item.rights.match(/([A-Z][a-z]{2} \d{1,2}, \d{4}$)/);
	}
	if ((!item.date || item.date.match(/^\d{4}$/)) && fullerDate) {
		item.date = fullerDate[1];
	}
	
	if (!item.itemType && item.libraryCatalog && item.libraryCatalog.match(/Historical Newspapers/))
		item.itemType = "newspaperArticle";
	
	if(!item.itemType) item.itemType="journalArticle";
	
	// Ok, now we'll pull the RIS and run it through the translator. And merge with the temporary item.
	// RIS LOGIC GOES HERE
	
	// Sometimes the PDF is right on this page
	var realLink = doc.evaluate('//div[@id="pdffailure"]/div[@class="body"]/a', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext();
	if (realLink) {
		item.attachments.push({url:realLink.href,
								title:"ProQuest PDF",
								mimeType:"application/pdf"});
		item.complete();
	} else {
		// The PDF link requires two requests-- we fetch the PDF full text page
		var pdfNodes = doc.evaluate('//a[@class="formats_base_sprite format_pdf"]', doc, nsResolver, XPathResult.ANY_TYPE, null);
		var pdfs = [];
		var pdf;
		var full = false;
		while (pdf = pdfNodes.iterateNext()) {
			pdfs.push(pdf.href);
		}
		
		if (pdfs.length == 0) {
			item.complete();
			return;
		}
		
		Zotero.Utilities.processDocuments(pdfs, function(pdfDoc){
				// This page gives a beautiful link directly to the PDF, right in the HTML
				realLink = pdfDoc.evaluate('//div[@id="pdffailure"]/div[@class="body"]/a', pdfDoc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext();
				if (realLink) {
					item.attachments.push({url:realLink.href,
											title:"ProQuest PDF",
											mimeType:"application/pdf"});
				}
			}, function () { item.complete() });
	}
}

// This map is not complete. See debug output to catch unassigned types
function mapToZotero (type) {
	var map = {
	"Scholarly Journals" : "journalArticle",
	"Book Review-Mixed" : false, // FIX AS NECESSARY
	"Reports" : "report",
	"REPORT" : "report",
	"Historical Newspapers" : "newspaperArticle",
	"Newspapers" : "newspaperArticle",
	//"News" : "newspaperArticle",	// Otherwise Foreign Policy is treated as a newspaper http://search.proquest.com/docview/840433348
	"Magazines" : "magazineArticle",
	"Dissertations & Theses" : "thesis",
	"Dissertation/Thesis" : "thesis",
	"Conference Papers & Proceedings" : "conferencePaper",
	"Wire Feeds": "newspaperArticle", // Good enough?
	"WIRE FEED": "newspaperArticle" // Good enough?
	}
	if (map[type]) return map[type];
	Zotero.debug("No mapping for type: "+type);
	return false;
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://search.proquest.com/docview/213445241",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Gerald F",
						"lastName": "Powers",
						"creatorType": "author"
					},
					{
						"firstName": "Drew",
						"lastName": "Christiansen",
						"creatorType": "author"
					},
					{
						"firstName": "Robert T",
						"lastName": "Hennemeyer",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"Peace",
					"Book reviews"
				],
				"seeAlso": [],
				"attachments": [
					{
						"url": false,
						"title": "ProQuest Record",
						"mimeType": "text/html"
					}
				],
				"place": "Winnipeg",
				"title": "Peacemaking: moral & policy challenges for a new world // Review",
				"publicationTitle": "Peace Research",
				"volume": "27",
				"issue": "2",
				"pages": "90-100",
				"numPages": "0",
				"date": "May 1995",
				"publisher": "Menno Simons College",
				"ISSN": "00084697",
				"language": "English",
				"callNumber": "213445241",
				"rights": "Copyright Peace Research May 1995",
				"proceedingsTitle": "Peace Research",
				"libraryCatalog": "ProQuest",
				"shortTitle": "Peacemaking"
			}
		]
	},
	{
		"type": "web",
		"url": "http://search.proquest.com/dissertations/docview/251755786/abstract/132B8A749B71E82DBA1/1?accountid=14512",
		"items": [
			{
				"itemType": "thesis",
				"creators": [
					{
						"firstName": "Valleri Jane",
						"lastName": "Robinson",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"Communication and the arts",
					"Stanislavsky",
					"Konstantin",
					"Konstantin Stanislavsky",
					"Russian",
					"Modernism",
					"Theater"
				],
				"seeAlso": [],
				"attachments": [
					{
						"url": "http://search.proquest.com/docview/251755786/abstract",
						"title": "ProQuest Record",
						"mimeType": "text/html"
					},
					{
						"url": "http://media.proquest.com/media/pq/classic/doc/726077491/fmt/prv/rep/300PDF?hl=&cit%3Aauth=Robinson%2C+Valleri+Jane&cit%3Atitle=Beyond+Stanislavsky%3A+The+influence+of+Russian+modernism+on+the+American+theatre&cit%3Apub=ProQuest+Dissertations+and+Theses&cit%3Avol=&cit%3Aiss=&cit%3Apg=n%2Fa&cit%3Adate=2001&ic=true&cit%3Aprod=ProQuest&_a=20111030044405336%253A322793-96095-ONE_SEARCH-128.97.245.28-18750-251755786-FullTextPreview-null-null-Online-FT-PRW-2001%252F01%252F01-2001%252F12%252F31---Online--------Dissertations%2B%2526%2BTheses---------PrePaid--%257BP-1007586-7267-CUSTOMER-10000115-1046531%257D&_s=jELbJkrJmfETEPQ6uj02mXndC%2B0%3D",
						"title": "ProQuest PDF",
						"mimeType": "application/pdf"
					},
					{
						"url": "http://media.proquest.com/media/pq/classic/doc/726077491/fmt/ai/rep/300PDF?hl=&cit%3Aauth=Robinson%2C+Valleri+Jane&cit%3Atitle=Beyond+Stanislavsky%3A+The+influence+of+Russian+modernism+on+the+American+theatre&cit%3Apub=ProQuest+Dissertations+and+Theses&cit%3Avol=&cit%3Aiss=&cit%3Apg=n%2Fa&cit%3Adate=2001&ic=true&cit%3Aprod=ProQuest&_a=20111030044405336%253A322793-96095-ONE_SEARCH-128.97.245.28-18750-251755786-DocumentImage-null-null-Online-FT-PFT-2001%252F01%252F01-2001%252F12%252F31---Online--------Dissertations%2B%2526%2BTheses---------PrePaid--%257BP-1007586-7267-CUSTOMER-10000115-1046531%257D&_s=%2F9Vl6GgF%2BJA5ZMsfgCM006g67Ws%3D",
						"title": "ProQuest PDF",
						"mimeType": "application/pdf"
					}
				],
				"place": "United States -- Ohio",
				"thesisType": "Ph.D.",
				"title": "Beyond Stanislavsky: The influence of Russian modernism on the American theatre",
				"pages": "233 p.",
				"date": "2001",
				"section": "0168",
				"ISBN": "9780493440408, 0493440402",
				"university": "The Ohio State University",
				"callNumber": "251755786",
				"rights": "Copyright UMI - Dissertations Publishing 2001",
				"libraryCatalog": "ProQuest Dissertations & Theses (PQDT); ProQuest Dissertations & Theses A&I",
				"shortTitle": "Beyond Stanislavsky",
				"checkFields": "title"
			}
		]
	}
]
/** END TEST CASES **/
