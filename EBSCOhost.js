{
	"translatorID": "d0b1914a-11f1-4dd7-8557-b32fe8a3dd47",
	"label": "EBSCOhost",
	"creator": "Simon Kornblith, Michael Berkowitz, Josh Geller",
	"target": "^https?://[^/]+/(?:eds|bsi|ehost)/(?:results|detail|folder)",
	"minVersion": "2.1",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsib",
	"lastUpdated": "2013-04-06 10:59:04"
}

function detectWeb(doc, url) {
	// See if this is a search results or folder results page
	var multiple = getResultList(doc, {}, {});	//we don't care about actual data at this point
	if(multiple) {
		return "multiple";
	}

	var persistentLink = ZU.xpath(doc, '//a[@class="permalink-link"]');
	if(persistentLink.length) {
		return "journalArticle";
	}
}

/*
 * given the text of the delivery page, downloads an item
 */
function downloadFunction(text, url, prefs) {
	if (text.search(/^TY\s\s?-/m) == -1) {
		text = "\nTY  - JOUR\n" + text;	//this is probably not going to work if there is garbage text in the begining
	}

	//fix DOI
	text = text.replace(/^L3(\s\s?-)/gm, 'DO$1');

	// There are cases where the RIS type isn't good--
	// there is sometimes better data in M3
	// This list should be augmented over time
	var m, m3Data;
	var itemType = prefs.itemType;

	if (!itemType && (m = text.match(/^M3\s+-\s*(.*)$/m))) {
		m3Data = m[1];	//used later
		switch(m3Data) {
			case "Literary Criticism":
			case "Case Study":
				itemType = "journalArticle";
			break;
		}
	}
	//remove M3 so it does not interfere with DOI.
	//hopefully EBCSOhost doesn't use this for anything useful
	text = text.replace(/^M3\s\s?-.*/gm, '');
	
	// load translator for RIS
	var translator = Zotero.loadTranslator("import");
	translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
	translator.setString(text);
	translator.setHandler("itemDone", function(obj, item) {
		/* Fix capitalization issues */
		//title
		if(item.title && item.title.toUpperCase() == item.title) {
			item.title = ZU.capitalizeTitle(item.title, true);
		}

		//authors
		var fn, ln;
		for(var i=0, n=item.creators.length; i<n; i++) {
			fn = item.creators[i].firstName;
			if(fn && fn.toUpperCase() == fn) {
				item.creators[i].firstName = ZU.capitalizeTitle(fn, true);
			}

			ln = item.creators[i].lastName;
			if(ln && ln.toUpperCase() == ln) {
				item.creators[i].lastName = ZU.capitalizeTitle(ln, true);
			}
		}

		//The non-DOI values in M3 should never pass RIS translator,
		// but, just in case, if we know it's not DOI, let's remove it
		if (item.DOI && item.DOI == m3Data) {
			item.DOI = undefined;
		}

		// Strip final period from title if present
		if(item.title) item.title = item.title.replace(/([^\.])\.\s*$/,'$1');

		// Strip EBSCOhost tags from the end of abstract
		if(item.abstractNote) {
			item.abstractNote = item.abstractNote
								.replace(/\s*\[[^\]\.]+\]$/, '');	//to be safe, don't strip sentences
		}

		// Get the accession number from URL if not in RIS
		var an = url.match(/_(\d+)_AN/);
		if (!item.callNumber) {
			if(an) {
				an = an[1];
				item.callNumber = an;
			}
		} else if(!an) {	//we'll need this later
			an = item.callNumber;
		}
/** Not sure what the original test case for this was where the import was improved,
 * but it breaks import from
 * http://search.ebscohost.com/login.aspx?direct=true&db=bth&AN=39564295&site=ehost-live
		if (m = text.match(/^Y1\s+-(.*)$/m)) {
			var year = m[1].match(/\d{4}/);
			var extra = m[1].match(/\/([^\/]+)$/);
			// If we have a double year in risDate, use last section
			if (year && extra && extra[1].indexOf(year[0]) !== -1) {
				item.date = extra[1];
			}
		}

		// Frequently have dates like "Spring2009";
		// need to insert space to keep Zotero happy
		if(item.date) item.date = item.date.replace(/([a-z])([0-9]{4})$/,"$1 $2");
*/
		// Keep the stable link as a link attachment
		if(item.url) {
			// Trim the ⟨=cs suffix -- EBSCO can't find the record with it!
			item.url = item.url.replace(/(AN=[0-9]+)⟨=[a-z]{2}/,"$1")
								.replace(/#.*$/,'');

			item.attachments.push({
				url: item.url+"&scope=cite",
				title: "EBSCO Record",
				mimeType: "text/html",
				snapshot: false
			});

			item.url = undefined;
		}

		// A lot of extra info is jammed into notes
		item.notes = [];
		
		//the archive field is pretty useless:
		item.archive = "";


		if(prefs.fetchPDF) {
			var arguments = urlToArgs(url);
			var pdf = "/ehost/pdfviewer/pdfviewer?"
				+ "sid=" + arguments["sid"]
				+ "&vid=" + arguments["vid"];
			Z.debug("Fetching PDF from " + pdf);

			ZU.doGet(pdf, function (text) {
					var realpdf = text.match(/<iframe\s+id="pdfIframe"[^>]+\bsrc="([^"]+)"/i)
						|| text.match(/<embed\s+id="pdfEmbed"[^>]+\bsrc="([^"]+)"/i);	//this is probably no longer used
					if(realpdf) {
						realpdf = realpdf[1].replace(/&amp;/g, "&")	//that's & amp; (Scaffold parses it)
											.replace(/#.*$/,'');
		
						if(an) {
							realpdf = realpdf.replace(/K=\d+/,"K="+an);
						} else {
							Z.debug("Don't have an accession number. PDF might fail.");
						}

						item.attachments.push({
								url:realpdf,
								title: "EBSCO Full Text",
								mimeType:"application/pdf"
						});
					} else {
						Z.debug("Could not detect embedded pdf.");
						var m = text.match(/<iframe[^>]+>/i) || text.match(/<embed[^>]+>/i);
						if(m) Z.debug(m[0]);
					}
				},
				function () {
					Z.debug("PDF retrieval done.");
					item.complete(); }
			);
		} else {
			Z.debug("Not attempting to retrieve PDF.");
			item.complete();
		}
	});

	translator.getTranslatorObject(function(trans) {
		trans.options.itemType = itemType;
		trans.doImport();
	});
}

//collects item url->title (in items) and item url->database info (in itemInfo)
function getResultList(doc, items, itemInfo) {
	var results = ZU.xpath(doc, '//li[@class="result-list-li"]');

	var title, folderData, count = 0;
	for(var i=0, n=results.length; i<n; i++) {
		title = ZU.xpath(results[i], './/a[@class = "title-link color-p4"]');
		folderData = ZU.xpath(results[i],
			'.//span[@class = "item add-to-folder"]/input/@value');

		//skip if we're missing something
		if(!title.length || !folderData.length) continue;

		count++;

		items[title[0].href] = title[0].textContent;
		itemInfo[title[0].href] = {
			folderData: folderData[0].textContent,
			//let's also store item type
			itemType: ZU.xpathText(results[i],
						'.//div[@class="pubtype"]/span/@class'),
			//check if PDF is available
			fetchPDF: ZU.xpath(results[i], './/span[@class="record-formats"]\
										/a[contains(@class,"pdf-ft")]').length
		};
	}

	return count;
}

//returns Zotero item type given a class name for the item icon in search list
function ebscoToZoteroItemType(ebscoType) {
	if(!ebscoType) return;

	var m = ebscoType.match(/\bpt-(\S+)/);
	if(m) {
		switch(m[1]) {
			case "review":
			case "academicJournal":
				return "journalArticle";
			break;
			case "serialPeriodical":
				return "magazineArticle";	//is this right?
			break;
			case "newspaperArticle":
				return "newspaperArticle";
			break;
		}
	}
}

//extracts arguments from a url and places them into an object
var argumentsRE = /([^?=&]+)(?:=([^&]*))?/g;
function urlToArgs(url) {
	//reset index
	argumentsRE.lastIndex = 0;

	var arguments = {};
	var arg;
	while(arg = argumentsRE.exec(url)) {
		arguments[arg[1]] = arg[2];
	}

	return arguments;
}
//var counter;
function doWeb(doc, url) {
//counter = 0;
	var items = {};
	var itemInfo = {};
	var multiple = getResultList(doc, items, itemInfo);

	if(multiple) {
		Zotero.selectItems(items, function (items) {
			if(!items) {
				return true;
			}

			//fetch each url assynchronously
			var i;
			for(i in items) {
				(function(itemInfo) {
					ZU.processDocuments(
							i.replace(/#.*$/,''),
							function(doc) { doDelivery(doc, itemInfo); }
					);
				})(itemInfo[i]);
			}
		});
	} else {
		/**Individual record.
		 * Record key exists in attribute for add to folder link in DOM
		 */
		doDelivery(doc);
	}
}
function doDelivery(doc, itemInfo) {
	var folderData;
	if(!itemInfo)	{
		/* Get the db, AN, and tag from ep.clientData instead */
		var script, clientData;
		var scripts = doc.getElementsByTagName("script");
		for(var i=0; i<scripts.length; i++) {
			clientData = scripts[i].textContent
				.match(/var ep\s*=\s*({[^;]*})(?:;|\s*$)/);
			if (clientData) break;
		}
		if (!clientData) { return false; }
		/* We now have the script containing ep.clientData */
		clientData = clientData[1].match(/"currentRecord"\s*:\s*({[^}]*})/);
		if (!clientData) { return false; }
		/* If this starts throwing exceptions, we should probably start try-elsing it */
		folderData = JSON.parse(clientData[1]);
	} else {
		/* Ditto for this. */
		// The attributes are a little different
		folderData = JSON.parse(itemInfo.folderData);
		folderData.Db = folderData.db;
		folderData.Term = folderData.uiTerm;
		folderData.Tag = folderData.uiTag;
	}

	//some preferences for later
	var prefs = {}
	//figure out if there's a PDF available
	//if PDFs stop downloading, might want to remove this
	if(!itemInfo)	{
		prefs.fetchPDF = !(ZU.xpath(doc, '//div[@id="column1"]//ul[1]/li').length	//check for left-side column
			&& !ZU.xpath(doc, '//a[contains(@class,"pdf-ft")]').length);	//check if there's a PDF there
	} else {
		prefs.fetchPDF = itemInfo.fetchPDF;
	}

	if(itemInfo) {
		prefs.itemType = ebscoToZoteroItemType(itemInfo.itemType);
	}

	var postURL = ZU.xpathText(doc, '//form[@id="aspnetForm"]/@action');
	var arguments = urlToArgs(postURL);

	postURL = "/ehost/delivery/ExportPanelSave/"
		+ folderData.Db + "_" + folderData.Term + "_" + folderData.Tag
		+ "?sid=" + arguments["sid"]
		+ "&vid=" + arguments["vid"]
		+ "&bdata="+arguments["bdata"]
		+ "&theExportFormat=1";	//RIS file

	ZU.doGet(postURL, function (text) {
		downloadFunction(text, postURL, prefs);
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://search.ebscohost.com/login.aspx?direct=true&db=aph&AN=9606204477&site=ehost-live",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"lastName": "Brodsky",
						"firstName": "Joseph",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"POETS, Polish",
					"HERBERT, Zbigniew, 1924-1998"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "EBSCO Record",
						"mimeType": "text/html",
						"snapshot": false
					}
				],
				"title": "Zbigniew Herbert",
				"journalAbbreviation": "Wilson Quarterly",
				"publicationTitle": "Wilson Quarterly",
				"date": "Winter93 1993",
				"volume": "17",
				"issue": "1",
				"pages": "112",
				"publisher": "Woodrow Wilson International Center for Scholars",
				"ISSN": "03633276",
				"abstractNote": "Introduces the poetry of Polish poet Zbigniew Herbert. Impression of difficulty in modern poetry; Polish poet Czeslaw Milosz; Herbert's 1980 Nobel Prize; Translations into English; Use of vers libre; Sample poems.",
				"libraryCatalog": "EBSCOhost",
				"callNumber": "9606204477"
			}
		]
	}
]
/** END TEST CASES **/