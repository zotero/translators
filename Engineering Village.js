{
	"translatorID": "1f40baef-eece-43e4-a1cc-27d20c0ce086",
	"label": "Engineering Village",
	"creator": "Ben Parr",
	"target": "^https?://(?:www\\.)?engineeringvillage(2)?\\.(?:com|org)",
	"minVersion": "1.0.0b4.r1",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "g",
	"lastUpdated": "2012-05-10 13:07:42"
}

function detectWeb(doc, url)
{
	var xpath='//a[img/@style="vertical-align: middle;"][@href]';
	if(doc.evaluate(xpath, doc,
		null,XPathResult.ANY_TYPE,null).iterateNext())
		{  return "journalArticle";}
		
	xpath='//input[@name="cbresult"]/@onclick';
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
	var url = temp.slice(0,temp.length-1).join('/') + "/Controller?EISESSION="+EISESSION;
	url+="&CID=downloadSelectedRecordsris&format=ris&displayformat=fullDoc&timestamp="
	url+=milli;
	url+="&docidlist=";
	url+=docidlist;
	url+="&handlelist=1";
	return url;
}

function doWeb(doc, url) {
		var url;
		var xpath='//a[img/@style="vertical-align: middle;"][@href]';
	if(doc.evaluate(xpath, doc,
		null,XPathResult.ANY_TYPE,null).iterateNext())
	{
		xpath='//a[@class="MedBlueLink"][img]/@onclick';
		var temp=doc.evaluate(xpath, doc,
			null,XPathResult.ANY_TYPE,null).iterateNext();
		var docidlist=temp.value;
	
		docidlist=docidlist.split("MID=")[1];
		docidlist=docidlist.split("&")[0];
	
		xpath='//a[img/@style="vertical-align: middle;"][@href]';
		temp=doc.evaluate(xpath, doc,
			null,XPathResult.ANY_TYPE,null).iterateNext();

		var EISESSION =temp.href;
		EISESSION=EISESSION.split("('")[1];
		EISESSION=EISESSION.split("'")[0];
		url=createURL(EISESSION,docidlist,doc.location.href);
		parseRIS(url);
	}
	else
	{
		xpath='//input[@NAME="sessionid"]';
		var EISESSION=doc.evaluate(xpath, doc,
			null,XPathResult.ANY_TYPE,null).iterateNext().value;
		
		xpath='//input[@name="cbresult"]/@onclick';
		var articles = new Array();
		var items=new Array();
		var rows=doc.evaluate(xpath, doc, null,XPathResult.ANY_TYPE,null);
		var xpath2='//a[@class="MedBlackText"]/b';
		xpath2=doc.evaluate(xpath2, doc, null,XPathResult.ANY_TYPE,null);
		var title;
		var docidlist;
		while(row=rows.iterateNext())
		{
			docidlist=row.value;
			docidlist=docidlist.split("'")[1];
			
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