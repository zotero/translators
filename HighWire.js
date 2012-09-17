{
	"translatorID": "5eacdb93-20b9-4c46-a89b-523f62935ae4",
	"label": "HighWire",
	"creator": "Simon Kornblith",
	"target": "^http://[^/]+/(?:cgi/searchresults|cgi/search|cgi/content/(?:abstract|full|short|summary)|current.dtl$|content/vol[0-9]+/issue[0-9]+/(?:index.dtl)?$)",
	"minVersion": "2.1",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsbv",
	"lastUpdated": "2012-09-04 23:12:25"
}

function detectWeb(doc, url) {
	if(doc.title.indexOf(" -- Search Result") !== -1) {
		if(doc.evaluate('//table/tbody/tr[td/input[@type="checkbox"][@name="gca"]]', doc,
			null, XPathResult.ANY_TYPE, null).iterateNext()) return "multiple";
	} else if(doc.title.indexOf(" -- Table of Contents") != -1) {
		if(doc.evaluate('//form/dl', doc, null, XPathResult.ANY_TYPE,null).iterateNext()) return "multiple";
	} else {
		if(doc.evaluate('//a[substring(@href, 1, 16) = "/cgi/citmgr?gca="]', doc, null,
			XPathResult.ANY_TYPE, null).iterateNext()) return "journalArticle";
	}
	
	return false;
}

function handleRequests(requests) {
	if(requests.length == 0) {
		Zotero.done();
		return;
	}
	
	var request = requests.shift();
	var URL = request.baseURL+request.args;
	
	Zotero.Utilities.HTTP.doGet(URL, function(text) {
		// load translator for RIS
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
		translator.setString(text);
		translator.setHandler("itemDone", function(obj, item) {
			if(item.notes[0]) {
				item.DOI = Zotero.Utilities.unescapeHTML(item.notes[0].note);
				item.notes = new Array();
			}
			//remove all caps from titles and authors.
			for (i in item.creators){
				if (item.creators[i].lastName && item.creators[i].lastName == item.creators[i].lastName.toUpperCase()) {
					item.creators[i].lastName = Zotero.Utilities.capitalizeTitle(item.creators[i].lastName.toLowerCase(),true);
				}
				if (item.creators[i].firstName && item.creators[i].firstName == item.creators[i].firstName.toUpperCase()) {
					item.creators[i].firstName = Zotero.Utilities.capitalizeTitle(item.creators[i].firstName.toLowerCase(),true);
				}
			}
			if (item.title == item.title.toUpperCase()) {
				item.title = Zotero.Utilities.capitalizeTitle(item.title.toLowerCase(),true);
			}
			item.attachments = new Array();
			var snapshot = request.snapshots.shift();
			var pdf = request.pdfs.shift();
			if(snapshot) {
				if(typeof(snapshot) == "string") {
					// string snapshot (from search)
					item.attachments.push({title:"HighWire Snapshot", mimeType:"text/html", url:snapshot});
				} else {
					// document object
					item.attachments.push({title:"HighWire Snapshot", document:snapshot});
				}
			}
			if(pdf) {
				var m = pdf.match(/^[^?]+/);
				item.attachments.push({title:"HighWire Full Text PDF", mimeType:"application/pdf", url:m[0]+".pdf"});
			}
			
			item.complete();
		});
		translator.translate();
		
		handleRequests(requests);
	});
}

function doWeb(doc, url) {
	var requests = new Array();
	var hostRe = /https?:\/\/[^\/]+/;
	
	var isSearch = doc.title.indexOf("Search Result") != -1
	var isTOC = doc.title.indexOf(" -- Table of Contents") != -1;
	var isScience = doc.title.indexOf("Science Magazine Search Results") != -1;
	if(isSearch || isTOC) {
		// search page
		var items = new Object();
		var snapshots = new Object();
		var pdfs = new Object();
		
		if(isTOC) {
			var gcaRe = /^https?:\/\/[^\/]+\/cgi\/reprint\/([0-9]+\/[0-9]+\/[0-9]+)/;
			var tableRows = doc.evaluate('//form/dl', doc, null, XPathResult.ANY_TYPE, null);
		} else if(isScience) {
			var tableRows = doc.evaluate('//form/dl/dd', doc, null, XPathResult.ANY_TYPE, null);
			var tableDTs = doc.evaluate('//form/dl/dt', doc, null, XPathResult.ANY_TYPE, null);
		} else {
			var tableRows = doc.evaluate('//table/tbody/tr[td/input[@type="checkbox"]][td/font/strong]', doc,
				null, XPathResult.ANY_TYPE, null);
		}
		
		var tableRow, link;
		while(tableRow = tableRows.iterateNext()) {
			var snapshot = undefined;
			var pdf = undefined;
			
			if(isTOC) {
				var title = doc.evaluate('.//strong', tableRow, null, XPathResult.ANY_TYPE, null).iterateNext().textContent;
				
				var links = doc.evaluate('.//a', tableRow, null, XPathResult.ANY_TYPE, null);
				while(link = links.iterateNext()) {
					// prefer Full Text snapshots, but take abstracts
					if(link.textContent == "[Abstract]") {
						if(!snapshot) snapshot = link.href;
					} else if (link.textContent == "[Full Text]") {
						snapshot = link.href;
					} else if(link.textContent == "[PDF]") {
						pdf = link.href;
						var m = gcaRe.exec(link.href);
						var gca = m[1];
					}
				}
			} else {
				if(isScience) {
					var tableDT = tableDTs.iterateNext();
					var gca = doc.evaluate('./input[@type="checkbox"]', tableDT, null, XPathResult.ANY_TYPE, null).iterateNext().value;
					var title = doc.evaluate('./label', tableDT, null, XPathResult.ANY_TYPE, null).iterateNext().textContent;
				} else {
					var gca = doc.evaluate('./td/input[@type="checkbox"]', tableRow, null, XPathResult.ANY_TYPE, null).iterateNext().value;
					var title = doc.evaluate('./td/font/strong', tableRow, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
					if(title.snapshotItem(0).textContent.toUpperCase() == title.snapshotItem(0).textContent) {
						title = title.snapshotItem(1).textContent;
					} else {
						title = title.snapshotItem(0).textContent;
					}
				}
				
				var links = doc.evaluate('.//a', tableRow, null, XPathResult.ANY_TYPE, null);
				while(link = links.iterateNext()) {
					// prefer Full Text snapshots, but take abstracts
					var textContent = Zotero.Utilities.trimInternal(link.textContent);
					if((textContent.substr(0, 8) == "Abstract" && !snapshot) || textContent.substr(0, 9) == "Full Text") {
						snapshot = link.href;
					} else if(textContent.substr(0, 3) == "PDF") {
						pdf = link.href;
					}
				}
			}
			
			snapshots[gca] = snapshot;
			pdfs[gca] = pdf;
			
			items[gca] = Zotero.Utilities.trimInternal(title);
		}
		
		Zotero.selectItems(items, function(items) {
			if(!items) return true;
			
			var requests = new Array();
			for(var gca in items) {
				var m = hostRe.exec(pdfs[gca]);
				var baseURL = 'http://' + doc.location.host + '/cgi/citmgr?type=refman';
				
				var thisRequest = null;
				for each(var request in requests) {
					if(request.baseURL == baseURL) {
						thisRequest = request;
						break;
					}
				}
				
				if(!thisRequest) {
					thisRequest = new Object();
					thisRequest.snapshots = new Array();
					thisRequest.pdfs = new Array();
					thisRequest.args = "";
					thisRequest.baseURL = baseURL;
					requests.push(thisRequest);
				}
				
				thisRequest.snapshots.push(snapshots[gca]);
				thisRequest.pdfs.push(pdfs[gca]);
				thisRequest.args += "&gca="+gca;
			}
			handleRequests(requests);
		});
	} else {
		var baseURL = doc.evaluate('//a[substring(@href, 1, 16) = "/cgi/citmgr?gca="]', doc, null,
			XPathResult.ANY_TYPE, null).iterateNext().href;
		var pdf = doc.location.href.replace(/\/content\/[^\/]+\//, "/reprint/");
		Zotero.debug(pdf);
		var requests = [{baseURL:baseURL, args:"&type=refman", snapshots:[doc], pdfs:[pdf]}];
		handleRequests(requests);
	}
		
	Zotero.wait();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://rphr.endojournals.org/cgi/content/full/59/1/1",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"lastName": "Negro",
						"firstName": "Alejandra",
						"creatorType": "author"
					},
					{
						"lastName": "Brar",
						"firstName": "Bhawanjit K.",
						"creatorType": "author"
					},
					{
						"lastName": "Lee",
						"firstName": "Kuo-Fen",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "HighWire Snapshot"
					},
					{
						"title": "HighWire Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"title": "Essential Roles of Her2/erbB2 in Cardiac Development and Function",
				"date": "January 1, 2004",
				"publicationTitle": "Recent Progress in Hormone Research",
				"journalAbbreviation": "Recent Prog Horm Res",
				"pages": "1-12",
				"volume": "59",
				"issue": "1",
				"url": "http://rphr.endojournals.org/cgi/content/abstract/59/1/1",
				"abstractNote": "The tyrosine kinase receptor erbB2, also known in humans as Her2, is a member of the epidermal growth factor receptor (EGFR or erbB1) family, which also includes erbB3 and erbB4. The erbBs were discovered in an avian erythroblastosis tumor virus and exhibited similarities to human EGFR (Yarden and Sliwkowski, 2001). Her2/erbB2 is highly expressed in many cancer types. Its overexpression is correlated with a poor prognosis for breast and ovarian cancer patients. ErbB receptors bind to a family of growth factors, termed neuregulins/heregulin (NRG/HRG), which comprise NRG-1, -2, -3, and -4 and include multiple isoforms. ErbB2/Her2 is an orphan receptor that does not bind ligand alone but heterodimerizes with the other erbB receptors for NRG signaling. ErbB2 is expressed in multiple neuronal and non-neuronal tissues in embryos and adult animals, including the heart. Genetic data demonstrated that erbB2 is required for normal embryonic development of neural crest-derived cranial sensory neurons. ErbB2/Her2-null mutant embryos of a trabeculation defect die before embryonic day (E) 11. To study its role at later stages of development, we generated a transgenic mouse line that specifically expresses the rat erbB2 cDNA in the heart under the control of the cardiac-specific {alpha}-myosin heavy chain promoter. When crossed into the null background, the expression of the rat erbB2 cDNA rescued the cardiac phenotype in the erbB2-null mutant mice that survive until birth but display an absence of Schwann cells and a severe loss of both motor and spinal sensory neurons. To study the role of erbB2 in the adult heart, we generated conditional mutant mice carrying a cardiac-restricted deletion of erbB2. These erbB2 conditional mutants exhibited multiple independent parameters of dilated cardiomyopathy, including chamber dilation, wall thinning, and decreased contractility. Interestingly, treatment of breast cancers overexpressing erbB2 with Herceptin (Trastuzumab), a humanized monoclonal antibody specific to the extracellular domain of erbB2, results in some patients developing cardiac dysfunction. The adverse effect is increased significantly in those patients who also receive the chemotherapeutical agent anthracycline. We found that erbB2-deficient cardiac myocytes are more susceptible to anthracycline-induced cytotoxicity. These results suggest that erbB2 signaling in the heart is essential for the prevention of dilated cardiomyopathy. These lines of mice provide models with which to elucidate the molecular and cellular mechanisms by which erbB2 signaling regulates cardiac functions. These mice also will provide important information for devising strategies to mitigate the cardiotoxic effects of Herceptin treatment, allowing for the potential expanded use of this drug to treat all cancers overexpressing erbB2.",
				"DOI": "10.1210/rp.59.1.1",
				"libraryCatalog": "HighWire",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://rphr.endojournals.org/cgi/search?sendit=Search&pubdate_year=&volume=&firstpage=&author1=&author2=&title=oxytocin+vasopressin&andorexacttitle=and&titleabstract=&andorexacttitleabs=and&fulltext=&andorexactfulltext=and&journalcode=endo&fmonth=Jan&fyear=2001&tmonth=Jan&tyear=2004&fdatedef=1+January+2001&tdatedef=1+January+2004&flag=&RESULTFORMAT=1&hits=10&hitsbrief=25&sortspec=relevance&sortspecbrief=relevance",
		"items": "multiple"
	}
]
/** END TEST CASES **/