{
	"translatorID": "abd7c626-6913-42d4-a05f-acc6683c69da",
	"label": "Insignia opac",
	"creator": "Niko",
	"target": "https?://[^/]+/library/[^/?#]+\\.aspx",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcs",
	"lastUpdated": "2012-11-26 15:49:00"
}




function detectWeb(doc, url) {
	var type =  ZU.xpathText(doc, '//input[@id="__ZoteroType"]/@value');
	
	if(type=="book"){
		
		var xPathTitle = '//table[@id="tbDetailInfo_Basic"]/tbody/tr/td/label[@name="Title"]';
		var title = ZU.xpathText(doc, xPathTitle);
		if(title!=null && title.length>0){
			return "book";
		}
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
	var xpathDescription2 = '//table[@id="tbDetailInfo_Summary"]/tbody/tr/td/label[@name="Content"]';

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
		var note = ZU.xpathText(doc, xpathDescription);
		if(note)
			item.notes.push(note);
		note = ZU.xpathText(doc, xpathDescription2);
		if(note)
			item.notes.push(note);
		
		//112 p. : col. ill. ; 15 cm..
		var textContent = ZU.xpathText(doc, xpathPageNumber);
		
		if(textContent.match(/\w/) && textContent.indexOf(" p") != -1 ){
			item.numPages= textContent.split(" p")[0];
		}
		saveAuthor(item,xpathAuthor,doc);
		item.complete();
		
	}
	

	
}


function saveAuthor(item,xpathAuthor,doc) {
	var contents = doc.evaluate(xpathAuthor, doc, null, XPathResult.ANY_TYPE, null);
	var author;

	while (author = contents.iterateNext()) {
		item.creators.push(
			ZU.cleanAuthor(
				author.textContent.replace(/[\s\d-\.]+$/, ''),
				"author",
				true
			)
		);
	}
}
/** BEGIN TEST CASES **/
var testCases = []
/** END TEST CASES **/
