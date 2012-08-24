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
	"browserSupport": "g",
	"lastUpdated": "2012-08-23 18:10:33"
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
	var url = temp.slice(0,temp.length-1).join('/') + "/Controller"+EISESSION;
	url+="&CID=downloadSelectedRecordsris&format=ris&displayformat=fullDoc&timestamp="
	url+=milli;
	url+=docidlist;
	url+="&handlelist=1";
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
		var docidlist=temp.match(/\&docidlist=[^&]+/)[0];
	    var EISESSION=temp.match(/\?EISESSION=[^&]+/)[0];
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
		var items=new Array();
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
var testCases = []
/** END TEST CASES **/