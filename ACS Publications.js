{
	"translatorID": "938ebe32-2b2e-4349-a5b3-b3a05d3de627",
	"label": "ACS Publications",
	"creator": "Sean Takats and Michael Berkowitz and Santawort",
	"target": "^https?://[^/]*pubs3?\\.acs\\.org[^/]*/(?:wls/journals/query/(?:subscriberResults|query)\\.html|acs/journals/toc\\.page|cgi-bin/(?:article|abstract|sample|asap)\\.cgi)?",
	"minVersion": "1.0.0b3.r1",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2012-09-04 23:35:03"
}

function detectWeb(doc, url) {
	if(doc.evaluate('//input[@id="articleListHeader_selectAllToc"]', doc, null, XPathResult.ANY_TYPE, null).iterateNext()) {
		Zotero.debug("multiple");
		return "multiple";
	} else if (doc.evaluate('//div[@id="articleHead"]', doc, null, XPathResult.ANY_TYPE, null).iterateNext()) {
		return "journalArticle";
	}
	return false;
}

function doWeb(doc, url){
	var host = 'http://' + doc.location.host + "/";
	var m = url.match(/https?:\/\/[^\/]*\/doi\/(abs|full)\/([^\?#]+)/);
	var dois = new Array();
	if(detectWeb(doc, url) == "multiple") { //search
		var doi;
		var title;
		var items = new Array();
		var xpath = '//div[@class="articleBox" or @class="articleBox "]';
		if (doc.evaluate(xpath, doc, null, XPathResult.ANY_TYPE, null).iterateNext()) {
			elmts = doc.evaluate(xpath, doc, null, XPathResult.ANY_TYPE, null);
			var elmt = elmts.iterateNext();
			do {
				title = doc.evaluate('.//div[@class="titleAndAuthor"]/h2/a', elmt, null, XPathResult.ANY_TYPE, null).iterateNext().textContent;
				doi = doc.evaluate('.//div[@class="titleAndAuthor"]/h2/a/@href', elmt, null, XPathResult.ANY_TYPE, null).iterateNext().textContent.replace("/doi/abs/","");
				if (doi.indexOf("prevSearch") != -1){
					doi = doi.substring(0,doi.indexOf("?"));
				}
				items[doi] = title;
			} while (elmt = elmts.iterateNext())
		}
		Zotero.selectItems(items, function (items) {
			if (!items) {
				return true;
			}
			for (var i in items) {
				dois.push(i);
			}
			var setupSets = setup(dois, host);
			scrape(setupSets, function () {	});
		});		
	} else if (m){ //single article
		var doi = m[2];
		//Zotero.debug('DOI: ' + doi);
		if (doi.match("prevSearch")) {
			doi = doi.substring(0,doi.indexOf("?"));
		}
		Zotero.debug("DOI= "+doi);
		dois.push(doi);
	 var setupSets= setup(dois, host);
	scrape(setupSets)
	}
}

function setup(dois, host){
		var setupSets = [];
	for each (doi in dois) {
		var citUrl = host + 'action/showCitFormats?doi=' + doi;
		Zotero.debug("citUrl= " + citUrl);
		setupSets.push({ doi: doi, citUrl: citUrl });
	}
	return setupSets
}

function scrape(setupSets){
	//get citation export page's source code;
	for (var i in setupSets){
		var set = setupSets[i];
		Zotero.Utilities.HTTP.doGet(set.citUrl, function(text){
			//get the exported RIS file name;
			var downloadFileName = text.match(/name=\"downloadFileName\" value=\"([A-Za-z0-9_]+)\"/)[1];
			Zotero.debug("downloadfilename= "+downloadFileName);
			var host = set.citUrl.replace(/action\/showCitFormats\?doi=.+/, "")
			processCallback(set.doi, host, downloadFileName);
		});
	}
}

function processCallback(doi, host, downloadFileName) {
		var baseurl = "http://pubs.acs.org/action/downloadCitation";
		var post = "doi=" + doi + "&downloadFileName=" + downloadFileName + "&include=abs&format=refman&direct=on&submit=Download+article+citation+data";
		Zotero.Utilities.HTTP.doPost(baseurl, post,function(text){
			// Fix the RIS doi mapping
			text = text.replace("\nN1  - doi:", "\nM3  - ");
			// Fix the wrong mapping for journal abbreviations
			text = text.replace("\nJO  -", "\nJA  -");
			// Use publication date when available
			if(text.indexOf("\nDA  -") !== -1) {
				text = text.replace(/\nY1  - [^\n]*/, "").replace("\nDA  -", "\nY1  -");
			}
			Zotero.debug("ris= "+ text);
			var translator = Zotero.loadTranslator("import");
			translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
			translator.setString(text);
			translator.setHandler("itemDone", function(obj, item) {
				var pdfUrl = host + 'doi/pdf/' + doi;
				var fullTextUrl = host + 'doi/full/' + doi;
				item.attachments = [
					{title:"ACS Full Text PDF",url:pdfUrl, mimeType:"application/pdf"},
					{title:"ACS Full Text Snapshot",url:fullTextUrl, mimeType:"text/html"}
				]; 
				item.complete();
			});
			translator.translate();
		});
	}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://pubs.acs.org/doi/full/10.1021/es103607c",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"lastName": "Majeau-Bettez",
						"firstName": "Guillaume",
						"creatorType": "author"
					},
					{
						"lastName": "Hawkins",
						"firstName": "Troy R.",
						"creatorType": "author"
					},
					{
						"lastName": "Strømman",
						"firstName": "Anders Hammer",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "ACS Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "ACS Full Text Snapshot",
						"mimeType": "text/html"
					}
				],
				"title": "Life Cycle Environmental Assessment of Lithium-Ion and Nickel Metal Hydride Batteries for Plug-In Hybrid and Battery Electric Vehicles",
				"date": "May 15, 2011",
				"DOI": "10.1021/es103607c",
				"publicationTitle": "Environmental Science & Technology",
				"journalAbbreviation": "Environ. Sci. Technol.",
				"pages": "4548-4554",
				"volume": "45",
				"issue": "10",
				"publisher": "American Chemical Society",
				"abstractNote": "This study presents the life cycle assessment (LCA) of three batteries for plug-in hybrid and full performance battery electric vehicles. A transparent life cycle inventory (LCI) was compiled in a component-wise manner for nickel metal hydride (NiMH), nickel cobalt manganese lithium-ion (NCM), and iron phosphate lithium-ion (LFP) batteries. The battery systems were investigated with a functional unit based on energy storage, and environmental impacts were analyzed using midpoint indicators. On a per-storage basis, the NiMH technology was found to have the highest environmental impact, followed by NCM and then LFP, for all categories considered except ozone depletion potential. We found higher life cycle global warming emissions than have been previously reported. Detailed contribution and structural path analyses allowed for the identification of the different processes and value-chains most directly responsible for these emissions. This article contributes a public and detailed inventory, which can be easily be adapted to any powertrain, along with readily usable environmental performance assessments.",
				"ISSN": "0013-936X",
				"url": "http://dx.doi.org/10.1021/es103607c",
				"accessDate": "September 5, 2012",
				"libraryCatalog": "ACS Publications"
			}
		]
	},
	{
		"type": "web",
		"url": "http://pubs.acs.org/toc/nalefd/12/6",
		"items": "multiple"
	}
]
/** END TEST CASES **/