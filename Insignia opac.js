{
	"translatorID": "c159dcfe-8a53-4301-a499-30f6549c340d",
	"label": "Insignia opac",
	"creator": "Niko",
	"target": "http://www.insigniasoftware.com/library",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcs",
	"lastUpdated": "2012-09-27 12:38:28"
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
		item.itemType ="book";		
		item.title = title;
		item.ISBN = ZU.xpathText(doc, xpathISBN);
		item.series = ZU.xpathText(doc, xpathSeries);
		item.callNumber = ZU.xpathText(doc, xpathCallNumber);
		item.edition = ZU.xpathText(doc, xpathEdition);
		item.publisher = ZU.xpathText(doc, xpathPublisher);
		tem.notes = ZU.xpathText(doc, xpathDescription);
		
		
		//112 p. : col. ill. ; 15 cm..
		var textContent = ZU.xpathText(doc, xpathPageNumber);
		
		if(textContent.match(/\w/) && textContent.match(" p.")){
			item.numPages= textContent.split("p.")[0]+"p";
		}
		saveAuthor(item,xpathAuthor,doc);
		item.complete();
		
	}
	

	
}


function saveAuthor(item,xpathAuthor,doc)
{
	var contents = doc.evaluate(xpathAuthor, doc, null, XPathResult.ANY_TYPE, null);

	var j = 0;
	var n = 0;
	var Authors = new Array();
	var author;
	
	while (author = contents.iterateNext()) {
		// author like :Howe, James, 1946-    Donner, Andrea K., 1967-   Grant, Joan, 1931-curtis neitl, 1950-
		var newAuthor = Zotero.Utilities.cleanAuthor(author.textContent, "author");
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