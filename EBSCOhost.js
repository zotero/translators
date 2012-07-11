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
	"lastUpdated": "2012-07-11 13:49:31"
}

function detectWeb(doc, url) {
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
		if (prefix == 'x') { return namespace; } else { return null; }
	} : null;

	// See if this is a search results or folder results page
	var searchResult = doc.evaluate('//ul[@class="result-list" or @class="folder-list"]/li/div[@class="result-list-record" or @class="folder-item"]', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext();
	if(searchResult) {
		return "multiple";
	}

	var xpath = '//a[@class="permalink-link"]';
	var persistentLink = doc.evaluate(xpath, doc, nsResolver, XPathResult.ANY_TYPE, null);
	if(persistentLink) {
		return "journalArticle";
	}
}

/*
 * given the text of the delivery page, downloads an item
 */
function downloadFunction(text, url) {
		var an = url.match(/_(\d+)_AN/);
		var pdf = false;
		var risDate = false;
		var queryString = {};
		url.replace(
			new RegExp("([^?=&]+)(=([^&]*))?", "g"),
				function($0, $1, $2, $3) { queryString[$1] = $3; }
		);
		pdf = "/ehost/pdfviewer/pdfviewer?sid="+queryString["sid"]+"&vid="+queryString["vid"];

		if (text.match(/^Y1\s+-(.*)$/m)) {
			risDate = text.match(/^Y1\s+-(.*)$/m);
		}

		if (!text.match(/^TY\s\s-/m)) { text = text+"\nTY  - JOUR\n"; }
		// load translator for RIS
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
		translator.setString(text);
		//Zotero.debug(text);
		translator.setHandler("itemDone", function(obj, item) {
			if (text.match(/^L3\s+-\s*(.*)/m)) {
				item.DOI = text.match(/^L3\s+\-\s*(.*)/m)[1];
			}
			if (text.match(/^M3\s+-\s*(.*)/m)) {
				if (item.DOI == text.match(/^M3\s+\-\s*(.*)/m)[1]) { item.DOI = ""; }
			}
			
			// There are cases where the RIS type isn't good--
			// there is sometimes better data in M3
			// This list should be augmented over time
			if (item.itemType == "document") {
				var m3 = text.match(/^M3\s+-\s*(.*)$/m);
				if (m3 && m3[1] == "Literary Criticism")
					item.itemType = "journalArticle";
			}
			
			if (text.match(/^DO\s+-\s*(.*)/m)) {
				item.DOI = text.match(/^DO\s+-\s*(.*)/m)[1];
			}
			if (text.match(/^T1\s+-/m)) {
				item.title = text.match(/^T1\s+-\s*(.*)/m)[1];
			}

			// Strip final period from title if present
			item.title = item.title.replace(/\.$/,'');
			// Get the accession number from URL or elsewhere
			if (an) {
				an = an[1];
				item.callNumber = an;
					
			} else {
				an = item.url.match(/AN=([0-9]+)/);
				if (an) an = an[1];
			}

			if (risDate) {
				var year = risDate[1].match(/\d{4}/);
				var extra = risDate[1].match(/\/([^\/]+)$/);
				// If we have a double year in risDate, use last section
				if (year && extra && extra[1].indexOf(year[0]) !== -1) {
					item.date = extra[1];
				}
				// Frequently have dates like "Spring2009";
				// need to insert space to keep Zotero happy
				item.date = item.date.replace(/([a-z])([0-9]{4})$/,"$1 $2");
			}

			// RIS translator tries to download the link in "UR"
			item.attachments = [];

			// But keep the stable link as a link attachment
			if(item.url) {
				// Trim the ⟨=cs suffix -- EBSCO can't find the record with it!
				item.url = item.url.replace(/(AN=[0-9]+)⟨=[a-z]{2}/,"$1").replace(/#.*$/,'');
				item.attachments.push({url: item.url+"&scope=cite",
							title: "EBSCO Record",
							mimeType: "text/html",
							snapshot: false});
				item.url = "";
			}
	
			// A lot of extra info is jammed into notes by the RIS translator
			item.notes = [];
		
		//not all items have a permalink if they don't we use the temporary URL
		if (item.url) var stablelink= item.url;
		else stablelink = url;
		
		// Since order of requests might matter, let's grab the stable link, then the PDF
		Zotero.Utilities.doGet(stablelink, function (doc) { Zotero.Utilities.doGet(pdf, function (text) {
				var realpdf = text.match(/<embed id="pdfEmbed"[^>]*>/);
				if(realpdf) {
					realpdf = text.match(/<embed[^>]*src="([^"]+)"/);
					if (realpdf) {
						realpdf = realpdf[1].replace(/&amp;/g, "&").replace(/#.*$/,'')
								.replace(/K=\d+/,"K="+an);
						//Zotero.debug("PDF for "+item.title+": "+realpdf);
						item.attachments.push({url:realpdf,
								title: "EBSCO Full Text",
								mimeType:"application/pdf"});
					}
				}
			}, function () { item.complete(); }); }, function () { return true; });
		//	item.complete()
		}); 
		
		
		translator.translate();
}

var host;

function doWeb(doc, url) {
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
		if (prefix == 'x') { return namespace; } else { return null; }
	} : null;

	var hostRe = new RegExp("^(https?://[^/]+)/");
	var hostMatch = hostRe.exec(url);
	host = hostMatch[1];

	var searchResult = doc.evaluate('//ul[@class="result-list" or @class="folder-list"]/li/div[@class="result-list-record" or @class="folder-item"]', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext();

	if(searchResult) {
		/* Get title links and text */
		var titlex = '//a[@class = "title-link color-p4"]';
		var titles = doc.evaluate(titlex, doc, nsResolver, XPathResult.ANY_TYPE, null);

		/* Get folder data for AN, DB, and tag */
		var folderx = '//span[@class = "item add-to-folder"]/input/@value';
		var folderData = doc.evaluate(folderx, doc, nsResolver, XPathResult.ANY_TYPE, null);

		var items = {};
		var folderInfos = {};
		var title, folderInfo;

		/* load up urls, title text and records keys (DB, AN, tag) */
		while (title = titles.iterateNext()) {
			items[title.href] = title.textContent;
//Z.debug(items[title.href])
			folderInfo = folderData.iterateNext();
			folderInfos[title.href] = folderInfo.textContent;
			//Z.debug(folderInfos[title.href])
		}

		Zotero.selectItems(items, function (items) {
				if(!items) {
					return true;
				}

				/* Get each citation page and pass in record key (db, tag, an) since data does not exist in an easily digestable way on this page */
				var urls = [];
				var infos = [];
				var i;
				for(i in items) {
					urls.push(i);
					infos.push(folderInfos[i]);
				}

				var run = function(urls, infos) {
					var url, info;
					if (urls.length == 0 || infos.length == 0) {
						Zotero.done();
						return true;
					}
					url = urls.shift();
					info = infos.shift();
					Zotero.Utilities.processDocuments(url.replace(/#.*$/,''),
						function (newDoc) { doDelivery(doc, nsResolver, info, function () { run(urls, infos) }); },
						function () { return true; });
				};

				run(urls, infos);

				Zotero.wait();
		});
	} else {
		/* Individual record. Record key exists in attribute for add to folder link in DOM */
		doDelivery(doc, nsResolver, null, function () { Zotero.done(); return true; });
		Zotero.wait();
	}
}
function doDelivery(doc, nsResolver, folderData, onDone) {
	if(folderData === null)	{
		/* Get the db, AN, and tag from ep.clientData instead */
		var script;
		var scripts = doc.evaluate('//script[@type="text/javascript"]', doc, nsResolver, XPathResult.ANY_TYPE, null);
		while (script = scripts.iterateNext().textContent) {
			var clientData = script.match(/var ep\s*=\s*({[^;]*});/);
			if (clientData) break;
		}
		if (!clientData) {return false;}
			/* We now have the script containing ep.clientData */

		/* The JSON is technically invalid, since it doesn't quote the
		   attribute names-- we pull out the valid bit inside it. */
		var clientData = script.match(/var ep\s*=\s*({[^;]*});/);
		if (!clientData) { return false; }
		clientData = clientData[1].match(/"currentRecord"\s*:\s*({[^}]*})/);
		/* If this starts throwing exceptions, we should probably start try-elsing it */
		folderData = JSON.parse(clientData[1]);
	} else {
		/* Ditto for this. */
		// The attributes are a little different
		folderData = JSON.parse(folderData);
		folderData.Db = folderData.db;
		folderData.Term = folderData.uiTerm;
		folderData.Tag = folderData.uiTag;
	}

	var postURL = doc.evaluate('//form[@id="aspnetForm"]/@action', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext().textContent;

	var queryString = {};
	postURL.replace(
		new RegExp("([^?=&]+)(=([^&]*))?", "g"),
			function($0, $1, $2, $3) { queryString[$1] = $3; }
	);

	/* ExportFormat = 1 for RIS file */
	postURL = host+"/ehost/delivery/ExportPanelSave/"+folderData.Db+"_"+folderData.Term+"_"+folderData.Tag+"?sid="+queryString["sid"]+"&vid="+queryString["vid"]+"&bdata="+queryString["bdata"]+"&theExportFormat=1";
	Zotero.Utilities.HTTP.doGet(postURL, function (text) { downloadFunction(text, postURL); }, onDone);
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://web.ebscohost.com/ehost/detail?sid=3f8c768f-e9bd-4c06-874e-30075b5a2e43%40sessionmgr15&vid=1&hid=11&bdata=JnNpdGU9ZWhvc3QtbGl2ZQ%3d%3d#db=a9h&AN=9606204477",
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
						"url": "http://search.ebscohost.com/login.aspx?direct=true&db=a9h&AN=9606204477&site=ehost-live&scope=cite",
						"title": "EBSCO Record",
						"mimeType": "text/html",
						"snapshot": false
					},
					{
						"url": "http://content.ebscohost.com/ContentServer.asp?T=P&P=AN&K=9606204477&S=R&D=a9h&EbscoContent=dGJyMMvl7ESeqa84zdnyOLCmr0meprFSs664SLaWxWXS&ContentCustomer=dGJyMPGstk%2B0qbJPuePfgeyx44Dt6fIA",
						"title": "EBSCO Full Text",
						"mimeType": "application/pdf"
					}
				],
				"title": "Zbigniew Herbert",
				"publicationTitle": "Wilson Quarterly",
				"date": "Winter93 1993",
				"volume": "17",
				"issue": "1",
				"pages": "112",
				"publisher": "Woodrow Wilson International Center for Scholars",
				"ISBN": "03633276",
				"ISSN": "03633276",
				"abstractNote": "Introduces the poetry of Polish poet Zbigniew Herbert. Impression of difficulty in modern poetry; Polish poet Czeslaw Milosz; Herbert's 1980 Nobel Prize; Translations into English; Use of vers libre; Sample poems.",
				"callNumber": "9606204477",
				"libraryCatalog": "EBSCOhost",
				"checkFields": "title"
			}
		]
	}
]
/** END TEST CASES **/