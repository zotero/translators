{
	"translatorID": "d0b1914a-11f1-4dd7-8557-b32fe8a3dd47",
	"label": "EBSCOhost",
	"creator": "Simon Kornblith, Michael Berkowitz, Josh Geller",
	"target": "^https?://[^/]+/(?:eds|bsi|ehost)/(?:results|detail|folder)",
	"minVersion": "2.1",
	"maxVersion": "",
	"priority": 100,
	"inRepository": "1",
	"translatorType": 4,
	"lastUpdated": "2011-03-24 23:30:00"
}

function detectWeb(doc, url) {
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
		if (prefix == 'x') return namespace; else return null;
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
function downloadFunction(text) {
	
		Zotero.debug(text);
		if (text.match(/^AB\s\s\-/m)) text = text.replace(/^AB\s\s\-/m, "N2  -");
		if (!text.match(/^TY\s\s-/m)) text = text+"\nTY  - JOUR\n"; 
		// load translator for RIS
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
		translator.setString(text);
		translator.setHandler("itemDone", function(obj, item) {
			if (text.match(/^L3\s+-\s*(.*)/m)) {
				item.DOI = text.match(/^L3\s+\-\s*(.*)/m)[1];
			}
			if (text.match(/^M3\s+-\s*(.*)/m)) {
				if (item.DOI == text.match(/^M3\s+\-\s*(.*)/m)[1]) item.DOI = "";
			}
			if (text.match(/^DO\s+-\s*(.*)/m)) {
				item.DOI = text.match(/^DO\s+-\s*(.*)/m)[1];
			}
			if (text.match(/^T1\s+-/m)) {
				item.title = text.match(/^T1\s+-\s*(.*)/m)[1];
			}
			//item.itemType = "journalArticle";
			item.url = false;
			// RIS translator tries to download the link in "UR" this leads to unhappyness
			item.attachments = [];
			item.complete();

		});
		translator.translate();
		
		Zotero.done();
}

var host;

function doWeb(doc, url) {
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
		if (prefix == 'x') return namespace; else return null;
	} : null;

	var hostRe = new RegExp("^(https?://[^/]+)/");
	var hostMatch = hostRe.exec(url);
	host = hostMatch[1];
	                                
	var searchResult = doc.evaluate('//ul[@class="result-list" or @class="folder-list"]/li/div[@class="result-list-record" or @class="folder-item"]', doc, nsResolver,
	                                XPathResult.ANY_TYPE, null).iterateNext();                              

	if(searchResult) {
		/* Get title links and text */
		var titlex = '//a[@class = "title-link color-p4"]';
		var titles = doc.evaluate(titlex, doc, nsResolver, XPathResult.ANY_TYPE, null);
		
		/* Get folder data for AN, DB, and tag */
		var folderx = '//span[@class = "item add-to-folder"]/input/@value';
		var folderData = doc.evaluate(folderx, doc, nsResolver, XPathResult.ANY_TYPE, null);
		
		var items = new Object();
		var folderInfos = new Object();
		var title, folderInfo;
		
		/* load up urls, title text and records keys (DB, AN, tag) */
		while (title = titles.iterateNext()) {
			items[title.href] = title.textContent;
			
			folderInfo = folderData.iterateNext();
			folderInfos[title.href] = folderInfo.textContent;
		}
		
		var items = Zotero.selectItems(items);
		if(!items) {
			return true;
		}

		/* Get each citation page and pass in record key (db, tag, an) since data does not exist in an easily digestable way on this page */
		for(var i in items) {
			Zotero.debug(i + folderInfos[i]);
			var newDoc = Zotero.Utilities.processDocuments(i, function (newDoc) {
				doDelivery(newDoc, nsResolver, folderInfos[i]);
			}, function() {Zotero.done()}); 
		}
	} else {
		/* Individual record. Record key exists in attribute for add to folder link in DOM */
		doDelivery(doc, nsResolver, null);
	}
	Zotero.wait();
}
function doDelivery(doc, nsResolver, folderData) {
	if(folderData === null)	{
		/* On page that has add to folder link and easily read db, tag, and an */
		folderData = doc.evaluate('//a[@class="folder-link"]/@data-folder', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext().textContent;
	}

	var jsonData = JSON.parse(folderData);
	
	var postURL = doc.evaluate('//form[@id="aspnetForm"]/@action', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext().textContent;

	var queryString = {};
	postURL.replace(
		new RegExp("([^?=&]+)(=([^&]*))?", "g"),
			function($0, $1, $2, $3) { queryString[$1] = $3; }
	);
	
	/* ExportFormat = 1 for RIS file */
	postURL = host+"/ehost/delivery/ExportPanelSave/"+jsonData.db+"_"+jsonData.uiTerm+"_"+jsonData.uiTag+"?sid="+queryString["sid"]+"&vid="+queryString["vid"]+"&bdata="+queryString["bdata"]+"&theExportFormat=1";
	
	Zotero.Utilities.HTTP.doGet(postURL, downloadFunction);
}
