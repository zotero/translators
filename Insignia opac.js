{
	"translatorID": "c159dcfe-8a53-4301-a499-30f6549c340d",
	"label": "Insignia opac",
	"creator": "Niko",
	"target": "http://localhost:11977/Webopac2010/",
	"minVersion": "1.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcs",
	"lastUpdated": "2012-09-19 12:38:28"
}




function detectWeb(doc, url) {
	var type =  ZU.xpathText(doc, '//input[@id="__ZoteroType"]/@value');
	
	if(type=="book")
	{
		return "book";
	}
	return false;
}


function doWeb(doc, url) {
	if(detectWeb(doc,url)!="book"){
		return;
	}
var xPathTitle = '//table[@id="tbDetailInfo_Basic"]/tbody/tr/td/label[@name="Title"]';
var xpathSeries = '//table[@id="tbDetailInfo_Basic"]/tbody/tr/td/label[@name="Series"]';
var xpathCallNumber = '//table[@id="tbDetailInfo_Basic"]/tbody/tr/td/label[@name="CallNo"]';
var xpathEdition = '//table[@id="tbDetailInfo_Basic"]/tbody/tr/td/label[@name="Edition"]';
var xpathAuthor = '//table[@id="tbDetailInfo_Basic"]/tbody/tr/td/label[@name="Author"]/a';

var xpathISBN = '//table[@id="tbDetailInfo_Publication"]/tbody/tr/td/label[@name="ISBN"]';
var xpathPublisher = '//table[@id="tbDetailInfo_Publication"]/tbody/tr/td/label[@name="Publication"]';
var xpathDescription = '//table[@id="tbDetailInfo_Summary"]/tbody/tr/td/label[@name="Summary"]';

var xpathPageNumber = '//table[@id="tbDetailInfo_Publication"]/tbody/tr/td/label[@name="Collation"]';

	var title = ZU.xpathText(doc, xPathTitle);
	if(title!=null && title.length>0){
		
		var item  = new Zotero.Item();
				
		var ISBN = ZU.xpathText(doc, xpathISBN);
		

		
		var Series = ZU.xpathText(doc, xpathSeries);
		
		
		var CallNumber = ZU.xpathText(doc, xpathCallNumber);
		
		var Edition = ZU.xpathText(doc, xpathEdition);

		SaveAuthor(item,xpathAuthor,doc);
		
		var ISBN = ZU.xpathText(doc, xpathISBN);
		
		var Publisher = ZU.xpathText(doc, xpathPublisher);
		
		var Description = ZU.xpathText(doc, xpathDescription);
		

		item.itemType ="book";
		item.title = title;
		item.ISBN = ISBN==null?"":ISBN;
		item.series = Series==null?"":Series;
		item.callNumber = CallNumber==null?"":CallNumber;
		item.publisher = Publisher==null?"":Publisher;
		item.edition= Edition==null?"":Edition;
		item.notes=Description;
		var textContent = ZU.xpathText(doc, xpathPageNumber);
		if(textContent.match(/\w/) && textContent.match(" p.")){
			item.numPages= textContent.split("p.")[0]+"p";
		}

		item.complete();
		
	}
	

	
}


function SaveAuthor(item,xpathAuthor,doc)
{
	var contents = doc.evaluate(xpathAuthor, doc, null, XPathResult.ANY_TYPE, null);

	var j = 0;
	var n = 0;
	var Authors = new Array();
	var author;
	
	while (author = contents.iterateNext()) {
		
		var newAuthor =Zotero.Utilities.cleanAuthor(author.textContent, "author");
		if(newAuthor.lastName.match(/^[0-9]/))
		{
			item.creators.push(Zotero.Utilities.cleanAuthor(newAuthor.firstName, "author"));
		}
		else
		{
			item.creators.push(Zotero.Utilities.cleanAuthor(author.textContent, "author"));
		}
	}     	
	 	
 
}
/** BEGIN TEST CASES **/
var testCases = []
/** END TEST CASES **/