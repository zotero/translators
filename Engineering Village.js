{
	"translatorID": "1f40baef-eece-43e4-a1cc-27d20c0ce086",
	"label": "Engineering Village",
	"creator": "Ben Parr, Sebastian Karcher",
	"target": "^https?://(?:www\\.)?engineeringvillage(2)?\\.(?:com|org)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcs",
	"lastUpdated": "2013-08-04 18:21:11"
}

function detectWeb(doc, url)
{
	var xpath='//span/a[@id="downloadlink"][@href]';
	if(doc.evaluate(xpath, doc,
		null,XPathResult.ANY_TYPE,null).iterateNext())
		{  return "journalArticle";}
		
	xpath='//div[@id="resultslist"]';
	if(doc.evaluate(xpath, doc,
		null,XPathResult.ANY_TYPE,null).iterateNext())
		{  return "multiple";}		
	return null; 
}

function parseRIS(uris)
{	
	 Zotero.Utilities.HTTP.doGet(uris, function(text){
	 	//Z.debug(text)
			 // load translator for RIS
			 var translator = Zotero.loadTranslator("import");
			 translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
			 translator.setString(text);
			 translator.translate();
			 Zotero.done();
	 }, function() {});
	 Zotero.wait();
}

//creates the link to the RIS file
function createURL(EISESSION,docidlist,curURL)
{
	var milli = (new Date()).getTime();
	var temp = curURL.split('/');		
	var url = 'http://www.engineeringvillage.com/delivery/download/submit.url?downloadformat=ris&displayformat=abstract&timestamp=' + milli  + docidlist + '&handlelist=1'
	//Z.debug("risurl: " + url)
	return url;
}

function doWeb(doc, url) {
		var url;
		var xpath='//span/a[@id="downloadlink"][@href]';
	if(doc.evaluate(xpath, doc,
		null,XPathResult.ANY_TYPE,null).iterateNext())
	{
		xpath='//span/a[@id="downloadlink"]/@href';
		var temp=ZU.xpathText(doc, xpath);
		Z.debug(temp)
		var docidlist=temp.match(/\&docidlist=[^&]+/)[0];
		//Session ID can have a question mark or an ampersand at beginning. If the latter, 
		//change to question mark
		var EISESSION;
		if (temp.match(/(\?|\&)EISESSION=[^&]+/)) var EISESSION=temp.match(/(\?|\&)EISESSION=[^&]+/)[0].replace(/^\&/, "?");
		url=createURL(EISESSION,docidlist,doc.location.href);
		parseRIS(url);
	}
	else
	{
		xpath='//input[@NAME="sessionid"]';
		var EISESSION=ZU.xpathText(doc, xpath);
		EISESSION = "?EISESSION=" + EISESSION;
		xpath='//div[@class="result"]|//div[@class="result odd"]';
		var articles = new Array();
		var items=new Object();
		var rows=doc.evaluate(xpath, doc, null,XPathResult.ANY_TYPE,null);
		var xpath2='//p[@class="resulttitle"]';
		xpath2=doc.evaluate(xpath2, doc, null,XPathResult.ANY_TYPE,null);
		var title;
		var docidlist;
		while(row=rows.iterateNext())
		{
			docidlist=ZU.xpathText(row, './div/input[@type="checkbox"]/@docid')
			docidlist= "&docidlist="+ docidlist;
			
			url=createURL(EISESSION,docidlist,doc.location.href);
			
			title=xpath2.iterateNext();
			title=title.textContent;
			
			items[url]=title;			
		}

		Zotero.selectItems(items, function (items) {
			if (!items) {
				return true;
			}
			for (var i in items) {
				articles.push(i);
			}
			parseRIS(articles, function () {
				Zotero.done();
			});
		});
	}
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.engineeringvillage.com/search/doc/detailed.url?SEARCHID=Mff218bf140487b2273M28a4prod3con1&pageType=quickSearch&CID=quickSearchDetailedFormat&DOCINDEX=1&database=1&format=quickSearchDetailedFormat&tagscope=&displayPagination=yes",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"lastName": "Johnson",
						"firstName": "Kent C.",
						"creatorType": "author"
					},
					{
						"lastName": "Durbin",
						"firstName": "Thomas D.",
						"creatorType": "author"
					},
					{
						"lastName": "Jung",
						"firstName": "Heejung",
						"creatorType": "author"
					},
					{
						"lastName": "Cocker",
						"firstName": "David R.",
						"creatorType": "author"
					},
					{
						"lastName": "Bishnu",
						"firstName": "Dipak",
						"creatorType": "author"
					},
					{
						"lastName": "Giannelli",
						"firstName": "Robert",
						"creatorType": "author"
					}
				],
				"notes": [
					{
						"note": "<p>Compilation and indexing terms, Copyright 2012 Elsevier Inc.</p>"
					}
				],
				"tags": [
					"Air pollution control equipment",
					"Automobiles",
					"Engines",
					"Organic carbon",
					"Particulate emissions",
					"Sea level"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Full Text (HTML)",
						"mimeType": "text/html",
						"downloadable": true
					}
				],
				"title": "Quantifying in-use PM measurements for heavy duty diesel vehicles",
				"journalAbbreviation": "Environmental Science and Technology",
				"volume": "45",
				"issue": "14",
				"pages": "6073-6079",
				"ISSN": "0013936X",
				"place": "2540 Olentangy River Road, P.O. Box 3337, Columbus, OH 43210-3337, United States",
				"publisher": "American Chemical Society",
				"abstractNote": "Heavy duty emissions regulations have recently expanded from the laboratory to include in-use requirements. This paradigm shift to in-use testing has forced the development of portable emissions measurement systems (PEMS) for particulate matter (PM). These PM measurements are not trivial for laboratory work, and are even more complex for in-use testing. This study evaluates five PM PEMS in comparison to UCR's mobile reference laboratory under in-use conditions. Three on-highway, heavy-duty trucks were selected to provide PM emissions levels from 0.1 to 0.0003 g/hp-h, with varying compositions of elemental carbon (EC), organic carbon (OC), and sulfate. The on-road driving courses included segments near sea level, at elevations up to 1500 m, and coastal and desert regions. The photoacoustic measurement PEMS performed best for the non-aftertreatment system (ATS)-equipped engine, where the PM was mostly EC, with a linear regression slope of 0.91 and an R2 of 0.95. The PEMS did not perform as well for the 2007 modified ATS equipped engines. The best performing PEMS showed a slope of 0.16 for the ATS-equipped engine with predominantly sulfate emissions and 0.89 for the ATS-equipped engine with predominantly OC emissions, with the next best slope at 0.45 for the predominantly OC engine.  2011 American Chemical Society.",
				"DOI": "10.1021/es104151v",
				"date": "2011",
				"publicationTitle": "Environmental Science and Technology",
				"libraryCatalog": "Engineering Village"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.engineeringvillage.com/search/results/quick.url?CID=quickSearchCitationFormat&database=3&SEARCHID=13b46935140494bffd5M256fprod3con2&intialSearch=true&showpatentshelp=false",
		"items": "multiple"
	}
]
/** END TEST CASES **/