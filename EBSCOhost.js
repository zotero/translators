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
	"lastUpdated": "2011-08-02 01:59:25"
}

function detectWeb(doc, url) {
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
		if (prefix == 'x') { return namespace; } else { return null; }
	} : null;
		// The Scientific American Archive breaks this translator, disabling 
		try {
			var databases = doc.evaluate("//span[@class = 'selected-databases']", doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext().textContent;
			if(databases.indexOf("Scientific American Archive Online") != -1) {
				return false;
			}
		} catch(e) {
		}
	
	
	// See if this is a search results or folder results page
	var searchResult = doc.evaluate('//ul[@class="result-list" or @class="folder-list"]/li/div[@class="result-list-record" or @class="folder-item"]', doc, nsResolver,
					XPathResult.ANY_TYPE, null).iterateNext();         
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
		var pdf = false;
		var queryString = {};
		url.replace(
			new RegExp("([^?=&]+)(=([^&]*))?", "g"),
				function($0, $1, $2, $3) { queryString[$1] = $3; }
		);
		pdf = "/ehost/pdfviewer/pdfviewer?sid="+queryString["sid"]+"&vid="+queryString["vid"];

		if (!text.match(/^TY\s\s-/m)) { text = text+"\nTY  - JOUR\n"; }
		// load translator for RIS
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
		translator.setString(text);
		translator.setHandler("itemDone", function(obj, item) {
			if (text.match(/^L3\s+-\s*(.*)/m)) {
				item.DOI = text.match(/^L3\s+\-\s*(.*)/m)[1];
			}
			if (text.match(/^M3\s+-\s*(.*)/m)) {
				if (item.DOI == text.match(/^M3\s+\-\s*(.*)/m)[1]) { item.DOI = ""; }
			}
			if (text.match(/^DO\s+-\s*(.*)/m)) {
				item.DOI = text.match(/^DO\s+-\s*(.*)/m)[1];
			}
			if (text.match(/^T1\s+-/m)) {
				item.title = text.match(/^T1\s+-\s*(.*)/m)[1];
			}
			
			// If we have a double year, eliminate one
			var year = item.date.match(/\d{4}/);
			if (year && item.date.replace(year,"").indexOf(year) !== -1) {
				item.date = item.date.replace(year,"");
			}
			
			// RIS translator tries to download the link in "UR" this leads to unhappyness
			item.attachments = [];

			// But keep the stable link as a link attachment
			if(item.url) {
				item.attachments.push({url: item.url,
							title: "EBSCO Record",
							mimeType: "text/html",
							snapshot: false});
				item.url = "";
			}
			item.notes = [];
			Zotero.Utilities.doGet(pdf, function (text) {
				//Z.debug(text);
				var realpdf = text.match(/<embed id="pdfEmbed"[^>]*>/);
				if(realpdf) {
					realpdf = text.match(/<embed[^>]*src="([^"]+)"/);
					if (realpdf) {
						realpdf = realpdf[1];
						item.attachments.push({url:realpdf.replace(/&amp;/g, "&"),
								title: "EBSCO Full Text",
								mimeType:"application/pdf"});
					}
				}
			}, function () { item.complete(); });
		});
		translator.translate();
		
		Zotero.done();
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
			
			folderInfo = folderData.iterateNext();
			folderInfos[title.href] = folderInfo.textContent;
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
					if (urls.length == 0 || folderInfos.length == 0) {
						Zotero.done();
						return true;
					}
					url = urls.shift();
					info = infos.shift();
					Zotero.Utilities.processDocuments(url, 
						function (newDoc) { doDelivery(doc, nsResolver, info); },
						function () {run(urls, infos);
					});
				};

				run(urls, infos);

				Zotero.wait();
		});
	} else {
		/* Individual record. Record key exists in attribute for add to folder link in DOM */
		doDelivery(doc, nsResolver, null);
	}
}
function doDelivery(doc, nsResolver, folderData) {
	if(folderData === null)	{
		/* Get the db, AN, and tag from ep.clientData instead */
		var script;
		var scripts = doc.evaluate('//script[@type="text/javascript"]', doc, nsResolver, XPathResult.ANY_TYPE, null);
		while (script = scripts.iterateNext().textContent) {
			if (script.indexOf("var ep") > -1) { break; }
			script = "";
		}
	}

	if (script === "") { return; }
	/* We now have the script containing ep.clientData */

	/* Get just the ep var assignment to minimize the possibility of eval problems. */
	var startClientData = script.indexOf("var ep");
	var endClientData = script.indexOf("};", startClientData);
	var clientData = script.substr(startClientData, endClientData);
	eval(clientData);
	
	var postURL = doc.evaluate('//form[@id="aspnetForm"]/@action', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext().textContent;

	var queryString = {};
	postURL.replace(
		new RegExp("([^?=&]+)(=([^&]*))?", "g"),
			function($0, $1, $2, $3) { queryString[$1] = $3; }
	);
	
	/* ExportFormat = 1 for RIS file */
	postURL = host+"/ehost/delivery/ExportPanelSave/"+ep.clientData.currentRecord.Db+"_"+ep.clientData.currentRecord.Term+"_"+ep.clientData.currentRecord.Tag+"?sid="+queryString["sid"]+"&vid="+queryString["vid"]+"&bdata="+queryString["bdata"]+"&theExportFormat=1";
	
	Zotero.Utilities.HTTP.doGet(postURL, function (text) { downloadFunction(text, postURL); });
}
