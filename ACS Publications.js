{
	"translatorID": "938ebe32-2b2e-4349-a5b3-b3a05d3de627",
	"label": "ACS Publications",
	"creator": "Sean Takats and Michael Berkowitz and Santawort",
	"target": "^https?://[^/]*pubs3?\\.acs\\.org[^/]*/(?:wls/journals/query/(?:subscriberResults|query)\\.html|acs/journals/toc\\.page|cgi-bin/(?:article|abstract|sample|asap)\\.cgi)?",
	"minVersion": "1.0.0b3.r1",
	"maxVersion": "",
	"priority": 100,
	"browserSupport": "gcs",
	"inRepository": true,
	"translatorType": 4,
	"lastUpdated": "2012-01-01 01:42:16"
}

function detectWeb(doc, url) {
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
		if (prefix == 'x') return namespace; else return null;
	} : null;

	if(doc.evaluate('//input[@id="articleListHeader_selectAllToc"]', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext()) {
		Zotero.debug("multiple");
		return "multiple";
	} else if (doc.evaluate('//div[@id="articleHead"]', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext()) {
		return "journalArticle";
	}
	return false;
}

function doWeb(doc, url){
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
		if (prefix == 'x') return namespace; else return null;
	} : null;
	var host = 'http://' + doc.location.host + "/";
	Zotero.debug(host);
	var m = url.match(/https?:\/\/[^\/]*\/doi\/(abs|full)\/([^\?]+)/);
	var dois = new Array();
	if(detectWeb(doc, url) == "multiple") { //search
		var doi;
		var title;
		var availableItems = new Array();
		var xpath = '//div[@class="articleBox" or @class="articleBox "]';
		if (doc.evaluate(xpath, doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext()) {
			elmts = doc.evaluate(xpath, doc, nsResolver, XPathResult.ANY_TYPE, null);
			var elmt = elmts.iterateNext();
			do {
				title = doc.evaluate('.//div[@class="titleAndAuthor"]/h2/a', elmt, nsResolver, XPathResult.ANY_TYPE, null).iterateNext().textContent;
				doi = doc.evaluate('.//div[@class="titleAndAuthor"]/h2/a/@href', elmt, nsResolver, XPathResult.ANY_TYPE, null).iterateNext().textContent.replace("/doi/abs/","");
				if (doi.indexOf("prevSearch") != -1){
					doi = doi.substring(0,doi.indexOf("?"));
				}
				availableItems[doi] = title;
			} while (elmt = elmts.iterateNext())
		}
		var items = Zotero.selectItems(availableItems);
		if(!items) {
			return true;
		}
		for(var i in items) {
			dois.push(i);
		}
	} else if (m){ //single article
		var doi = m[2];
		Zotero.debug('DOI: ' + doi);
		if (doi.match("prevSearch")) {
			doi = doi.substring(0,doi.indexOf("?"));
		}
		Zotero.debug("DOI= "+doi);
		dois.push(doi);
	}

	var setupSets = [];
	for each (doi in dois) {
		var citUrl = host + 'action/showCitFormats?doi=' + doi;
		Zotero.debug("citUrl= " + citUrl);
		setupSets.push({ doi: doi, citUrl: citUrl });
	}

	var setupCallback = function () {
		//get citation export page's source code;
		if (setupSets.length) {
			var set = setupSets.shift();
			Zotero.Utilities.HTTP.doGet(set.citUrl, function(text){
				//get the exported RIS file name;
				var downloadFileName = text.match(/name=\"downloadFileName\" value=\"([A-Za-z0-9_]+)\"/)[1];
				Zotero.debug("downloadfilename= "+downloadFileName);
				processCallback(set.doi,downloadFileName);
			});
		}
		else {
			Zotero.done();
		}
	}
	var processCallback = function (doi,downloadFileName) {
		var baseurl = "http://pubs.acs.org/action/downloadCitation";
		var post = "doi=" + doi + "&downloadFileName=" + downloadFileName + "&include=abs&format=refman&direct=on&submit=Download+article+citation+data";
		Zotero.Utilities.HTTP.doPost(baseurl, post,function(text){
			// Fix the RIS doi mapping
			text = text.replace("N1  - doi:","M3  - ");
			Zotero.debug("ris= "+ text);
			var translator = Zotero.loadTranslator("import");
			translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
			translator.setString(text);
			translator.setHandler("itemDone", function(obj, item) {
				var pdfUrl = host + 'doi/pdf/' + doi;
				var fullTextUrl = host + 'doi/full/' + doi;
				item.attachments.push(
					{title:"ACS Full Text PDF",url:pdfUrl, mimeType:"application/pdf"},
					{title:"ACS Full Text Snapshot",url:fullTextUrl, mimeType:"text/html"}
				);
				item.complete();
			});
			translator.translate();
			setupCallback();
		});
	}
	setupCallback();
	Zotero.wait();
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
						"url": "http://dx.doi.org/10.1021/es103607c"
					},
					{
						"title": "ACS Full Text PDF",
						"url": "http://pubs.acs.org/doi/pdf/10.1021/es103607c",
						"mimeType": "application/pdf"
					},
					{
						"title": "ACS Full Text Snapshot",
						"url": "http://pubs.acs.org/doi/full/10.1021/es103607c",
						"mimeType": "text/html"
					}
				],
				"title": "Life Cycle Environmental Assessment of Lithium-Ion and Nickel Metal Hydride Batteries for Plug-In Hybrid and Battery Electric Vehicles",
				"date": "2011",
				"DOI": "10.1021/es103607c",
				"publicationTitle": "Environ. Sci. Technol.",
				"pages": "4548-4554",
				"volume": "45",
				"issue": "10",
				"publisher": "American Chemical Society",
				"abstractNote": "This study presents the life cycle assessment (LCA) of three batteries for plug-in hybrid and full performance battery electric vehicles. A transparent life cycle inventory (LCI) was compiled in a component-wise manner for nickel metal hydride (NiMH), nickel cobalt manganese lithium-ion (NCM), and iron phosphate lithium-ion (LFP) batteries. The battery systems were investigated with a functional unit based on energy storage, and environmental impacts were analyzed using midpoint indicators. On a per-storage basis, the NiMH technology was found to have the highest environmental impact, followed by NCM and then LFP, for all categories considered except ozone depletion potential. We found higher life cycle global warming emissions than have been previously reported. Detailed contribution and structural path analyses allowed for the identification of the different processes and value-chains most directly responsible for these emissions. This article contributes a public and detailed inventory, which can be easily be adapted to any powertrain, along with readily usable environmental performance assessments.\nThis study presents the life cycle assessment (LCA) of three batteries for plug-in hybrid and full performance battery electric vehicles. A transparent life cycle inventory (LCI) was compiled in a component-wise manner for nickel metal hydride (NiMH), nickel cobalt manganese lithium-ion (NCM), and iron phosphate lithium-ion (LFP) batteries. The battery systems were investigated with a functional unit based on energy storage, and environmental impacts were analyzed using midpoint indicators. On a per-storage basis, the NiMH technology was found to have the highest environmental impact, followed by NCM and then LFP, for all categories considered except ozone depletion potential. We found higher life cycle global warming emissions than have been previously reported. Detailed contribution and structural path analyses allowed for the identification of the different processes and value-chains most directly responsible for these emissions. This article contributes a public and detailed inventory, which can be easily be adapted to any powertrain, along with readily usable environmental performance assessments.",
				"ISBN": "0013-936X",
				"ISSN": "0013-936X",
				"url": "http://dx.doi.org/10.1021/es103607c",
				"accessDate": "2011/10/19",
				"libraryCatalog": "ACS Publications"
			}
		]
	}
]
/** END TEST CASES **/
