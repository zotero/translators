{
	"translatorID": "d0b1914a-11f1-4dd7-8557-b32fe8a3dd47",
	"label": "EBSCOhost",
	"creator": "Simon Kornblith, Michael Berkowitz, Josh Geller",
	"target": "^https?://[^/]+/(?:eds|bsi|ehost)/(?:results|detail|folder|pdfviewer)",
	"minVersion": "2.1",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsib",
	"lastUpdated": "2013-09-17 23:34:17"
}

function detectWeb(doc, url) {
	// See if this is a search results or folder results page
	var multiple = getResultList(doc, {}, {});	//we don't care about actual data at this point
	if(multiple) {
		return "multiple";
	}

	var persistentLink = doc.getElementsByClassName("permalink-link");
	if(persistentLink.length && persistentLink[0].nodeName.toUpperCase() == 'A') {
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
	
	//Let's try to keep season info
	// Y1  - 1993///Winter93
	// Y1  - 2009///Spring2009
	// maybe also Y1  - 1993///93Winter
	var season = text.match(
		/^(Y1\s+-\s+(\d{2})(\d{2})\/\/\/)(?:\2?\3(.+)|(.+?)\2?\3)\s*$/m);
	season = season && (season[4] || season[5]);
	
	// load translator for RIS
	var translator = Zotero.loadTranslator("import");
	translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
	translator.setString(text);
	translator.setHandler("itemDone", function(obj, item) {
		/* Fix capitalization issues */
		//title
		if(!item.title && prefs.itemTitle) {
			item.title = prefs.itemTitle;
		}
		if(item.title) {
			// Strip final period from title if present
			item.title = item.title.replace(/([^\.])\.\s*$/,'$1');
			
			if(item.title.toUpperCase() == item.title) {
				item.title = ZU.capitalizeTitle(item.title, true);
			}
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
		
		//Sometimes EBSCOhost gives us year and season
		if(season) {
			item.date = season + ' ' + item.date;
		}
		
		//The non-DOI values in M3 should never pass RIS translator,
		// but, just in case, if we know it's not DOI, let's remove it
		if (item.DOI && item.DOI == m3Data) {
			item.DOI = undefined;
		}
		
		// Strip EBSCOhost tags from the end of abstract
		if(item.abstractNote) {
			item.abstractNote = item.abstractNote
				.replace(/\s*\[[^\]\.]+\]$/, ''); //to be safe, don't strip sentences
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
		
		// A lot of extra info is jammed into notes
		item.notes = [];
		
		//the archive field is pretty useless:
		item.archive = "";
		
		if(item.url) {	
			// Trim the ⟨=cs suffix -- EBSCO can't find the record with it!
			item.url = item.url.replace(/(AN=[0-9]+)⟨=[a-z]{2}/,"$1")
				.replace(/#.*$/,'');
			if(!prefs.hasFulltext) {	
				// For items without full text,
				// move the stable link to a link attachment
				item.attachments.push({
					url: item.url+"&scope=cite",
					title: "EBSCO Record",
					mimeType: "text/html",
					snapshot: false
				});
				item.url = undefined;
			}
		}
		
		if(prefs.pdfURL) {
			item.attachments.push({
					url: prefs.pdfURL,
					title: "EBSCO Full Text",
					mimeType:"application/pdf"
			});
			item.complete();
		} else if(prefs.fetchPDF) {
			var arguments = urlToArgs(url);
			var pdf = "/ehost/pdfviewer/pdfviewer?"
				+ "sid=" + arguments["sid"]
				+ "&vid=" + arguments["vid"];
			Z.debug("Fetching PDF from " + pdf);

			ZU.processDocuments(pdf,
				function(pdfDoc) {
					var realpdf = findPdfUrl(pdfDoc);
					if(realpdf) {
						/* Not sure if this is still necessary. Doesn't seem to be.
						realpdf = realpdf[1].replace(/&amp;/g, "&")	//that's & amp; (Scaffold parses it)
											.replace(/#.*$/,'');
						if(an) {
							realpdf = realpdf.replace(/K=\d+/,"K="+an);
						} else {
							Z.debug("Don't have an accession number. PDF might fail.");
						}*/

						item.attachments.push({
								url:realpdf,
								title: "EBSCO Full Text",
								mimeType:"application/pdf"
						});
					} else {
						Z.debug("Could not find a reference to PDF.");
					}
				},
				function () {
					Z.debug("PDF retrieval done.");
					item.complete();
				}
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
	//make search results work if you can't add to folder, e.g. for EBSCO used as discovery service of library such as
  	//http://search.ebscohost.com/login.aspx?direct=true&site=eds-live&scope=site&type=0&custid=s4895734&groupid=main&profid=eds&mode=and&lang=en&authtype=ip,guest,athens

	var folder = ZU.xpathText(doc, '//span[@class = "item add-to-folder"]/input/@value|.//span[@class = "item add-to-folder"]/a[1]/@data-folder')
	var title, folderData, count = 0;
	for(var i=0, n=results.length; i<n; i++) {
		//we're extra cautious here: When there's not folder, good chance user isn't logged in and import will fail where 
		//there is no preview icon. We might be able to just rely on the 2nd xpath, but why take the risk
		if (folder) title = ZU.xpath(results[i], './/a[@class = "title-link color-p4"]');
		else title = ZU.xpath(results[i], './/a[@class = "title-link color-p4" and following-sibling::span[contains(@id, "hoverPreview")]]');
		if(!title.length) continue;
		if (folder) {
		folderData = ZU.xpath(results[i],
			'.//span[@class = "item add-to-folder"]/input/@value|.//span[@class = "item add-to-folder"]/a[1]/@data-folder');
		//I'm not sure if the input/@value format still exists somewhere, but leaving this in to be safe
		//skip if we're missing something

		itemInfo[title[0].href] = {
			folderData: folderData[0].textContent,
			//let's also store item type
			itemType: ZU.xpathText(results[i],
				'.//div[@class="pubtype"]/span/@class'),
			itemTitle: ZU.xpathText(results[i], './/span[@class="title-link-wrapper"]/a'),
			//check if PDF is available
			fetchPDF: ZU.xpath(results[i], './/span[@class="record-formats"]\
				/a[contains(@class,"pdf-ft")]').length,
			hasFulltext: ZU.xpath(results[i], './/span[@class="record-formats"]\
				/a[contains(@class,"pdf-ft") or contains(@class, "html-ft")]').length
		} 
		};
		count++;
		items[title[0].href] = title[0].textContent;
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

//given a pdfviewer page, extracts the PDF url
function findPdfUrl(pdfDoc) {
	var el;
	var realpdf = (el = pdfDoc.getElementById('downloadLink')) && el.href; //link
	if(!realpdf) {
		//input
		realpdf = (el = pdfDoc.getElementById('pdfUrl')) && el.value;
	}
	if(!realpdf) {
		realpdf = (el = pdfDoc.getElementById('pdfIframe') //iframe
				|| pdfDoc.getElementById('pdfEmbed')) //embed
			&& el.src;
	}
	
	return realpdf;
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
	if(!itemInfo||!itemInfo.folderData)	{
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
	var prefs = {};
	//figure out if there's a PDF available
	//if PDFs stop downloading, might want to remove this
	if(!itemInfo)	{
		if(doc.location.href.indexOf('/pdfviewer/') != -1) {
			prefs.pdfURL = findPdfUrl(doc);
			prefs.fetchPDF = !!prefs.pdfURL;
		} else {
			prefs.fetchPDF = !(ZU.xpath(doc, '//div[@id="column1"]//ul[1]/li').length	//check for left-side column
					&& !ZU.xpath(doc, '//a[contains(@class,"pdf-ft")]').length);	//check if there's a PDF there
		}
		prefs.hasFulltext = !(ZU.xpath(doc, '//div[@id="column1"]//ul[1]/li').length	//check for left-side column
			&& !ZU.xpath(doc, '//a[contains(@class,"pdf-ft") or contains(@class, "html-ft")]').length);
		prefs.itemTitle = ZU.xpathText(doc, '//dd[contains(@class, "citation-title")]/a/span')
			|| ZU.xpathText(doc, '//h2[@id="selectionTitle"]');
	} else {
		prefs.fetchPDF = itemInfo.fetchPDF;
		prefs.hasFulltext = itemInfo.hasFulltext;
		prefs.itemType = ebscoToZoteroItemType(itemInfo.itemType);
		prefs.itemTitle = itemInfo.itemTitle;
	}
	
	if(prefs.itemTitle) {
		prefs.itemTitle = ZU.trimInternal(prefs.itemTitle).replace(/([^.])\.$/, '$1');
	}
	//Z.debug(prefs);

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
		"url": "http://web.ebscohost.com/ehost/detail?sid=4bcfec05-db01-4d69-9028-c40ff1331e56%40sessionmgr15&vid=1&hid=28&bdata=JnNpdGU9ZWhvc3QtbGl2ZQ%3d%3d#db=aph&AN=9606204477",
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
				"attachments": [],
				"title": "Zbigniew Herbert",
				"journalAbbreviation": "Wilson Quarterly",
				"publicationTitle": "Wilson Quarterly",
				"volume": "17",
				"issue": "1",
				"pages": "112",
				"publisher": "Woodrow Wilson International Center for Scholars",
				"ISSN": "03633276",
				"abstractNote": "Introduces the poetry of Polish poet Zbigniew Herbert. Impression of difficulty in modern poetry; Polish poet Czeslaw Milosz; Herbert's 1980 Nobel Prize; Translations into English; Use of vers libre; Sample poems.",
				"url": "http://search.ebscohost.com/login.aspx?direct=true&db=aph&AN=9606204477&site=ehost-live",
				"libraryCatalog": "EBSCOhost",
				"callNumber": "9606204477",
				"accessDate": "CURRENT_TIMESTAMP",
				"date": "Winter 1993"
			}
		]
	}
]
/** END TEST CASES **/