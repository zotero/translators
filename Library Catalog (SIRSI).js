{
	"translatorID": "add7c71c-21f3-ee14-d188-caf9da12728b",
	"label": "Library Catalog (SIRSI)",
	"creator": "Sean Takats,  Hicham El Kasmi",
	"target": "/uhtbin/(?:cgisirsi|quick_keyword)",
	"minVersion": "2.1",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsib",
	"lastUpdated": "2012-08-14 19:51:41"
}

function detectWeb(doc, url) {

	var xpath = '//tr[th[@class="viewmarctags"]][td[@class="viewmarctags"]]';
	if(doc.evaluate(xpath, doc, null, XPathResult.ANY_TYPE, null).iterateNext()) {
		Zotero.debug("SIRSI detectWeb: viewmarctags");
		return "book";
	}
	var xpath = '//input[@name="VOPTIONS"]';
	if(doc.evaluate(xpath, doc, null, XPathResult.ANY_TYPE, null).iterateNext()) {
		Zotero.debug("SIRSI detectWeb: VOPTIONS");
		return "book";
	}
	var elmts = doc.evaluate('/html/body/form//text()', doc, null,
					 XPathResult.ANY_TYPE, null);
	while(elmt = elmts.iterateNext()) {
		if(Zotero.Utilities.superCleanString(elmt.nodeValue) == "Viewing record") {
			Zotero.debug("SIRSI detectWeb: Viewing record");
			return "book";
		}
	}
	
	var xpath = '//td[@class="searchsum"]/table';
	if(doc.evaluate(xpath, doc, null, XPathResult.ANY_TYPE, null).iterateNext()) {
		Zotero.debug("SIRSI detectWeb: searchsum");
		return "multiple";
	}
	var xpath = '//form[@name="hitlist"]/table/tbody/tr';
	if(doc.evaluate(xpath, doc, null, XPathResult.ANY_TYPE, null).iterateNext()) {
		Zotero.debug("SIRSI detectWeb: hitlist");
		return "multiple";
	}
}

function scrape(doc) {

	var xpath = '//tr[th[@class="viewmarctags"]][td[@class="viewmarctags"]]';
	var elmts = doc.evaluate(xpath, doc, null, XPathResult.ANY_TYPE, null);
	var elmt = elmts.iterateNext();
	if(!elmt) {
		return false;
	}

	var newItem = new Zotero.Item("book");
	newItem.extra = "";
	
	authors = [];
	while(elmt) {
		try {
			var node = doc.evaluate('./TD[1]/A[1]/text()[1]', elmt, null, XPathResult.ANY_TYPE, null).iterateNext();
			if(!node) {
				var node = doc.evaluate('./TD[1]/text()[1]', elmt, null, XPathResult.ANY_TYPE, null).iterateNext();
			}
			
			if(node) {
				var casedField = Zotero.Utilities.superCleanString(doc.evaluate('./TH[1]/text()[1]', elmt, null, XPathResult.ANY_TYPE, null).iterateNext().nodeValue);
				field = casedField.toLowerCase();
 				field = field.replace(/:./,"");
				var value = Zotero.Utilities.superCleanString(node.nodeValue);
				if(field == "publisher" || field == "éditeur" ) {
					newItem.publisher = value;
				} else if(field == "physical descrip" || field == "description physique" ) {
					newItem.physicaldescription = value;
				} else if(field == "pub date" || field == "année") {
					var re = /[0-9]+/;
					var m = re.exec(value);
					newItem.date = m[0];
				} else if(field == "isbn") {
					var re = /^[0-9](?:[0-9X]+)/;
					var m = re.exec(value);
					newItem.ISBN = m[0];
				} else if(field == "issn") {
					newItem.ISSN = value;
				} else if(field == "title" || field == "titre") {
					var titleParts = value.split(" / ");
					newItem.title = Zotero.Utilities.capitalizeTitle(titleParts[0]);
				} else if(field == "series title" || field == "titre de série" || field == "collection") {
					newItem.seriestitle = value.substr(1, value.length-2);
				} else if(field == "publication info" || field == "publication") {
					var pubParts = value.split(" : ");
					newItem.place = pubParts[0];
					if (pubParts[1].match(/\d+/)) {
						newItem.date = pubParts[1].match(/\d+/)[0];
						newItem.publisher = pubParts[1].match(/(.*),/)[1];
					}
				} else if(field == "personal author" || field == "autor personal" || field == "auteur") {
					if(authors.indexOf(value) == -1) {
						value = value.replace(/(\(|\)|\d+|\-)/g, "");
						newItem.creators.push(Zotero.Utilities.cleanAuthor(value, "author", true));
						authors.push(value);
					}
				} else if(field == "author" || field == "auteur"){
					if(authors.indexOf(value) == -1) { 
						newItem.creators.push(Zotero.Utilities.cleanAuthor(value, "author", true));
						authors.push(value);
					}
				} else if(field == "added author" || field == "organisme") {
					if(authors.indexOf(value) == -1) {
						newItem.creators.push(Zotero.Utilities.cleanAuthor(value, "contributor", true));
						authors.push(value);
					}
				} else if(field == "corporate author") {
					if(authors.indexOf(value) == -1) {
						newItem.creators.push({lastName:value, fieldMode:true});
						authors.push(value);
					}
				} else if(field == "general note" || field == "note") {
					newItem.generalnote = value;
				} else if(field == "edition" || field == "édition") {
					newItem.edition = value;
				} else if(field == "additional formats" || field == "autres supports") {
					newItem.additionalformats = value;
				} else if(field == "continued by" || field == "devient") {
					newItem.continuedby = value;
				} else if(field == "subject term" || field == "corporate subject" || field == "geographic term" || field == "subject" || field == "sujet" || field == "sujet géographique") {
					var subjects = value.split("--");
					for(var i=0; i<subjects.length; i++) {
						if(newItem.tags.indexOf(subjects[i]) == -1) {
							newItem.tags.push(subjects[i]);
						}
					}
				} else if(field == "personal subject" || field == " personne sujet") {
					var subjects = value.split(", ");
					var tag = value[0]+", "+value[1];
					if(newItems.tag.indexOf(tag) == -1) {
						newItem.tags.push(tag);
					}
				} else if(field == "contents" || field == "contient") {
					var contents = value.split("--");
					for(var i=0; i<contents.length; i++) {
						if(newItem.tags.indexOf(contents[i]) == -1) {
							newItem.tags.push(contents[i]);
						}
					}
				} else if(value && field != "http") {
					newItem.extra += casedField+": "+value+"\n";
				}
			}
		} catch (e) {}
		
		elmt = elmts.iterateNext();
	}
	
	if(newItem.extra) {
		newItem.extra = newItem.extra.substr(0, newItem.extra.length-1);
	}

	var callNumber = doc.evaluate('//tr/td[1][@class="holdingslist"]/text()', doc, null, XPathResult.ANY_TYPE, null).iterateNext();
	if(callNumber && callNumber.nodeValue) {
		newItem.callNumber = callNumber.nodeValue.trim();
	}
	
	// UVA has the call number separately, in the next field
	// http://virgo.lib.virginia.edu
	callNumber = doc.evaluate('//tr/td[2][@class="holdingslist"]/text()', doc, null, XPathResult.ANY_TYPE, null).iterateNext();
	// The regex here is looking for something like an LOC call number
	if(callNumber && callNumber.nodeValue.trim().match(/^[A-Z]{1,2}[0-9]+/)) {
		newItem.callNumber += " " + callNumber.nodeValue.trim();
	}
	
	var domain = doc.location.href.match(/https?:\/\/([^/]+)/);
	newItem.repository = domain[1]+" Library Catalog";
	
	newItem.complete();
	return true;
}

function doWeb(doc, url){
	var sirsiNew = true; //toggle between SIRSI -2003 and SIRSI 2003+
	var xpath = '//td[@class="searchsum"]/table';
	if(doc.evaluate(xpath, doc, null, XPathResult.ANY_TYPE, null).iterateNext()) {
		Zotero.debug("SIRSI doWeb: searchsum");
		sirsiNew = true;	
	} else if (doc.evaluate('//form[@name="hitlist"]/table/tbody/tr', doc, null, XPathResult.ANY_TYPE, null).iterateNext()) {
		Zotero.debug("SIRSI doWeb: hitlist");
		sirsiNew = false;
	} else if (doc.evaluate('//tr[th[@class="viewmarctags"]][td[@class="viewmarctags"]]', doc, null, XPathResult.ANY_TYPE, null).iterateNext()) {
		Zotero.debug("SIRSI doWeb: viewmarctags");
		sirsiNew = true;
	} else if (doc.evaluate('//input[@name="VOPTIONS"]', doc, null, XPathResult.ANY_TYPE, null).iterateNext()) {
		Zotero.debug("SIRSI doWeb: VOPTIONS");
		sirsiNew = false;
	} else {
	var elmts = doc.evaluate('/html/body/form//text()', doc, null,
							 XPathResult.ANY_TYPE, null);
		while(elmt = elmts.iterateNext()) {
			if(Zotero.Utilities.superCleanString(elmt.nodeValue) == "Viewing record") {
				Zotero.debug("SIRSI doWeb: Viewing record");
				sirsiNew = false;
			}
		}
	}
	
	if (sirsiNew) { //executes Simon's SIRSI 2003+ scraper code
		Zotero.debug("Running SIRSI 2003+ code");
		if(!scrape(doc)) {
			
			var checkboxes = new Array();
			var urls = new Array();
			var availableItems = new Array();			
			//begin IUCAT fixes by Andrew Smith
			var iuRe = /^https?:\/\/www\.iucat\.iu\.edu/;
			var iu = iuRe.exec(url);
			//IUCAT fix 1 of 2
			if (iu){
				var tableRows = doc.evaluate('//td[@class="searchsum"]/table[//input[@class="submitLink"]]', doc, null, XPathResult.ANY_TYPE, null);
			} else{
				var tableRows = doc.evaluate('//td[@class="searchsum"]/table[//input[@value="Details"]]', doc, null, XPathResult.ANY_TYPE, null);
			}
			var tableRow = tableRows.iterateNext();		// skip first row
			// Go through table rows
			while(tableRow = tableRows.iterateNext()) {
				//IUCAT fix 2 of 2
				if (iu){
					var input = doc.evaluate('.//input[@class="submitLink"]', tableRow, null, XPathResult.ANY_TYPE, null).iterateNext();
					var text = doc.evaluate('.//label/span', tableRow, null, XPathResult.ANY_TYPE, null).iterateNext().textContent;
				} else {
					var input = doc.evaluate('.//input[@value="Details"]', tableRow, null, XPathResult.ANY_TYPE, null).iterateNext();					
					var text = doc.evaluate('.//label/strong', tableRow, null, XPathResult.ANY_TYPE, null).iterateNext().textContent;					
				}
			//end IUCAT fixes by Andrew Smith
				if(text) {
					availableItems[input.name] = text;
				}
			}		
			var items = Zotero.selectItems(availableItems);		
			if(!items) {
				return true;
			}
			var hostRe = new RegExp("^http(?:s)?://[^/]+");
			var m = hostRe.exec(doc.location.href);
			Zotero.debug("href: " + doc.location.href);
			var hitlist = doc.forms.namedItem("hitlist");
			var baseUrl = m[0]+hitlist.getAttribute("action")+"?first_hit="+hitlist.elements.namedItem("first_hit").value+"&last_hit="+hitlist.elements.namedItem("last_hit").value;
			var uris = new Array();
			for(var i in items) {
				uris.push(baseUrl+"&"+i+"=Details");
			}
			Zotero.Utilities.processDocuments(uris, function(doc) { scrape(doc); },
				function() { Zotero.done(); }, null);
			Zotero.wait();
		}	
	} else{  //executes Simon's SIRSI -2003 translator code
		Zotero.debug("Running SIRSI -2003 code");
		var uri = doc.location.href;
		var recNumbers = new Array();
		var xpath = '//form[@name="hitlist"]/table/tbody/tr';
		var elmts = doc.evaluate(xpath, doc, null, XPathResult.ANY_TYPE, null);
		var elmt = elmts.iterateNext();
		if(elmt) {	// Search results page
			var uriRegexp = /^http:\/\/[^\/]+/;
			var m = uriRegexp.exec(uri);
			var postAction = doc.forms.namedItem("hitlist").getAttribute("action");
			var newUri = m[0]+postAction.substr(0, postAction.length-1)+"40";
			var titleRe = /<br>\s*(.*[^\s])\s*<br>/i;
			var items = new Array();
			do {
				var checkbox = doc.evaluate('.//input[@type="checkbox"]', elmt, null,
											XPathResult.ANY_TYPE, null).iterateNext();
				// Collect title
				var title = doc.evaluate("./td[2]", elmt, null, XPathResult.ANY_TYPE, null).iterateNext().textContent;
				if(checkbox && title) {
					items[checkbox.name] = Zotero.Utilities.trimInternal(title);
				}
			} while(elmt = elmts.iterateNext());
			items = Zotero.selectItems(items);
			
			if(!items) {
				return true;
			}
			
			for(var i in items) {
				recNumbers.push(i);
			}
		} else {		// Normal page
			// this regex will fail about 1/100,000,000 tries
			var uriRegexp = /^((.*?)\/([0-9]+?))\//;
			var m = uriRegexp.exec(uri);
			var newUri = m[1]+"/40";
			
			var elmts = doc.evaluate('/html/body/form', doc, null,
									 XPathResult.ANY_TYPE, null);
			while(elmt = elmts.iterateNext()) {
				var initialText = doc.evaluate('.//text()[1]', elmt, null, XPathResult.ANY_TYPE, null).iterateNext();
				if(initialText && initialText.nodeValue && Zotero.Utilities.superCleanString(initialText.nodeValue) == "Viewing record") {
					recNumbers.push(doc.evaluate('./b[1]/text()[1]', elmt, null, XPathResult.ANY_TYPE, null).iterateNext().nodeValue);
					break;
				}
			}	
			// begin Emory compatibility
			var elmts = doc.evaluate('//input[@name="first_hit"]', doc, null,
									 XPathResult.ANY_TYPE, null);
			while (elmt = elmts.iterateNext()) {
				recNumbers.length = 0;
				var recNumber = elmt.value;
				recNumbers.push(recNumber);
				break;
			 }
			// end Emory compatibility	
		}
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("a6ee60df-1ddc-4aae-bb25-45e0537be973");
		translator.getTranslatorObject(function(marc) {
			Zotero.Utilities.loadDocument(newUri+'?marks='+recNumbers.join(",")+'&shadow=NO&format=FLAT+ASCII&sort=TITLE&vopt_elst=ALL&library=ALL&display_rule=ASCENDING&duedate_code=l&holdcount_code=t&DOWNLOAD_x=22&DOWNLOAD_y=12&address=&form_type=', function(doc) {
				var pre = doc.getElementsByTagName("pre");
				var text = pre[0].textContent;
				var documents = text.split("*** DOCUMENT BOUNDARY ***");
				for(var j=1; j<documents.length; j++) {
					var uri = newUri+"?marks="+recNumbers[j]+"&shadow=NO&format=FLAT+ASCII&sort=TITLE&vopt_elst=ALL&library=ALL&display_rule=ASCENDING&duedate_code=l&holdcount_code=t&DOWNLOAD_x=22&DOWNLOAD_y=12&address=&form_type=";
					var lines = documents[j].split("\n");
					var record = new marc.record();
					var tag, content;
					var ind = "";
					for(var i=0; i<lines.length; i++) {
						var line = lines[i];
						if(line[0] == "." && line.substr(4,2) == ". ") {
							if(tag) {
								content = content.replace(/\|([a-z])/g, marc.subfieldDelimiter+"$1");
								record.addField(tag, ind, content);
							}
						} else {
							content += " "+line.substr(6);
							continue;
						}
						tag = line.substr(1, 3);	
						if(tag[0] != "0" || tag[1] != "0") {
							ind = line.substr(6, 2);
							content = line.substr(8);
						} else {
							content = line.substr(7);
							if(tag == "000") {
								tag = undefined;
								record.leader = "00000"+content;
								Zotero.debug("the leader is: "+record.leader);
							}
						}
					}	
					var newItem = new Zotero.Item();
					record.translate(newItem);
					
					var domain = url.match(/https?:\/\/([^/]+)/);
					newItem.repository = domain[1]+" Library Catalog";
	
					newItem.complete();
				}
			});
		});
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.cible.ulb.ac.be/uhtbin/cgisirsi/x/S.HUMAINES/0/5?searchdata1=915050{ckey}",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"firstName": "Susan",
						"lastName": "Sellers",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"Bloomsbury / Andrew McNeillie ",
					" Virginia Woolf's early novels : finding a voice / Suzanne Raitt ",
					" From Mrs. Dalloway to The waves : new elegy and lyric experimentalism / Jane Goldman ",
					" The novels of the 1930s and the impact of history / Julia Briggs ",
					" Virginia Woolf's essays / Hermione Lee ",
					" Virginia Woolf, modernism and modernity / Michael H. Whitworth ",
					" The socio-political vision of the novels / David Bradshaw ",
					" Woolf's feminism and feminism's Woolf / Laura Marcus ",
					" Virginia Woolf and sexuality / Patricia Morgne Cramer ",
					" Virginia Woolf, empire and race / Helen Carr ",
					" Virginia Woolf and visual culture / Maggie Humm ",
					" Virginia Woolf and the public sphere / Melba Cuddy-Keane"
				],
				"seeAlso": [],
				"attachments": [],
				"extra": "Personne sujet: Woolf, Virginia, 1882-1941--Criticism and interpretation",
				"title": "The Cambridge companion to Virginia Woolf",
				"edition": "2nd ed",
				"place": "Cambridge, UK ; New York",
				"date": "2010",
				"publisher": "Cambridge University Press",
				"physicaldescription": "xxi, 272 p. ; 24 cm",
				"seriestitle": "Cambridge companions to literature",
				"generalnote": "Index",
				"ISBN": "0521896940",
				"libraryCatalog": "www.cible.ulb.ac.be Library Catalog"
			}
		]
	},
	{
		"type": "web",
		"url": "http://main.library.utoronto.ca/webcat/goto_catalogue_url.cfm?where=ckey&what=7990078",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"firstName": "Harry E.",
						"lastName": "Vanden",
						"creatorType": "author"
					},
					{
						"firstName": "Gary",
						"lastName": "Prevost",
						"creatorType": "contributor"
					}
				],
				"notes": [],
				"tags": [
					"1. An introduction to twenty-first century Latin America ",
					" 2. Early history ",
					" 3. Democracy and dictators: a historical overview from independence to the present day ",
					" 4. The other Americans ",
					" 5. Society, family, and gender ",
					" 6. Religion in Latin America ",
					" 7. The political economy of Latin America ",
					" 8. Democracy and authoritarianism: Latin American political culture ",
					" 9. Politics, power, institutions, and actors ",
					" 10. Struggling for change: revolution, social and political movements in Latin America ",
					" 11. U.S.-Latin American relations ",
					" 12. Guatemala / Susanne Jonas ",
					" 13. Mexico / Nora Hamilton ",
					" 14. Cuba / Gary Prevost ",
					" 15. Brazil / Wilber Albert Chaffee ",
					" 16. Argentina / Aldo C. Vacs ",
					" 17. Chile / Eduardo Silva ",
					" 18. Venezuela / Daniel Hellinger ",
					" 19. Colombia / John C. Dugas ",
					" 20. Nicaragua / Gary Prevost and Harry E. Vanden ",
					" 21. Bolivia / Waltraud Q. Morales ",
					" Appendix 1: Presidential elections ",
					" Appendix 2: Recent Legislative elections"
				],
				"seeAlso": [],
				"attachments": [],
				"extra": "Physical description: xxi, 633 p. : ill., maps ; 24 cm\nSubject, geographic: Latin America--Politics and government\nBibliography note: Includes bibliographical references and index\nkey: 7990078",
				"title": "Politics of Latin America: the power game",
				"edition": "4th ed",
				"place": "New York",
				"date": "2012",
				"publisher": "Oxford University Press",
				"ISBN": "0199797145",
				"callNumber": "JL960 .V36 2012X",
				"libraryCatalog": "toroprod.library.utoronto.ca Library Catalog",
				"shortTitle": "Politics of Latin America"
			}
		]
	}
]
/** END TEST CASES **/