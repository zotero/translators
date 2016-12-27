{
	"translatorID": "a55463ba-e403-415b-80d4-284d5f9b4b15",
	"label": "Clinical Key",
	"creator": "Jaret M. Karnuta",
	"target": "^https://(www\\.|www-)clinicalkey(\\.|-)com",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2016-12-26 21:15:27"
}

/*
This translator is designed specifically for use on book section portions of
ClinicalKey. It will not work on journal articles and book overview pages.

NB: url and doc.location.href are different. I think it is because of the way clinicalkey redirects.
Replicate by going to a content page (/content/book/...) and then going to a broswing page (/browse/book/...).
URL remains the page of the previous page (content page) and doc.location.href is the current page (as it should be).

Hence, I never use url and change its content to doc.location.href in detectWeb, the only function that uses the url
*/

function detectWeb(doc, url) {
	//see NB above for explanation
	url = doc.location.href;

	//contentType depends on url, which is present, but rest of site is loaded via ajax (I think)
	//monitor dom and reset if changes
	var jsession = doc.getElementById('jsessionid');
	Z.debug(jsession.value);
	if(jsession){
		Zotero.monitorDOMChanges(jsession, {attributes:true});
		if(!jsession.value){
			return;
		}
	}

	var contentType;
	if(url.includes("/content/book/") && !url.includes("login?")){
		contentType = "bookSection";
	}
	else if (url.includes('/browse/book/') && !url.includes("login?")){
		contentType = "book";
	}

	//contentType not set
	if(!contentType){
		return;
	}
	return contentType;
}

function doWeb(doc, url){
	var contentType = detectWeb(doc, url);
	//if contentType null or not equal to bookSection or book
	if(!contentType || !(contentType == 'bookSection' || contentType == 'book')){
		return;
	}

	//if book section
	if (contentType == 'bookSection'){
		var newItem = new Zotero.Item(contentType);
		newItem = scrapeBookSection(doc, newItem);
		//pdf (if present)
		var pdfUrl = doc.getElementsByClassName('x-pdf')[0].href;
		if(pdfUrl){
			newItem.attachments.push({
				url:pdfUrl,
				title:"Book Section PDF",
				mimeType:"application/pdf"
			});
		}
		//populate common attributes
		//url, see NB above for explanation as to why url is NOT used
		newItem.url = doc.location.href;
		newItem.complete();
	}
	//if book, use ISBN translator
	//borrowed from amazon translator
	else if (contentType == 'book'){
		var isbn = getElementsByAttr(doc, "data-metadata-isbn", "")[0].getAttribute('data-metadata-isbn');
		isbn = ZU.cleanISBN(isbn);
		//use search translator to get metadata from isbn
		var search = Zotero.loadTranslator("search");
		//set translators and search
		search.setHandler("translators", function(obj, translators) {
			search.setTranslator(translators);
			search.setHandler("itemDone", function(obj, lookupItem) {
				newItem=lookupItem;
				//update ISBN
				newItem.ISBN = ZU.cleanISBN(isbn);
				//update url, see NB for rationale why url not used
				newItem.url = doc.location.href;
			});
			search.translate();
		});
		//no need to override error handler
		//save item
		search.setHandler("done", function() {
			newItem.complete();
		});
		search.setSearch({ ISBN: isbn });
		search.getTranslators();
	}
}

function scrapeBookSection(doc, item){
	//book title
	var bookTitle = getElementsByAttr(doc, 'data-once-text','XocsCtrl.title')[0].innerHTML;
	item.bookTitle = bookTitle;
	//section title
	var title  = getElementsByAttr(doc, 'ng-bind-html','ContentCtrl.title')[0].innerHTML;
	item.title = title;
	//authors
	var authorsList  = getElementsByAttr(doc, 'ng-bind-html','XocsCtrl.authorsHtml')[0].getElementsByTagName("a");
	for (var i = 0;i<authorsList.length;i++){
		var author = authorsList[i].innerHTML;
		if(author.includes("<")){
			author = author.split("<")[0];
		}
		item.creators.push(Zotero.Utilities.cleanAuthor(author, 'author'));
	}

	//page metadata
	var chapterAndPages = doc.getElementsByClassName("source ng-binding")[0].innerHTML.split("</a>,")[1].trim();
	//includes both chapter and pages
	if(chapterAndPages.includes(",")){
		var chapter = chapterAndPages.split(",")[0].trim();
		//remove word "chapter"
		chapter = chapter.toLowerCase();
		if(chapter.includes("chapter")){
			chapter = chapter.replace("chapter","").trim();
		}
		item.notes.push("Chapter: "+chapter);
		item.pages = chapterAndPages.split(",")[1].trim();
	}
	//only includes pages
	else{
		item.pages = chapterAndPages.trim();
	}


	//ISBN metadata
	var isbn = getElementsByAttr(doc, "data-metadata-isbn", "")[0].getAttribute('data-metadata-isbn');
	item.ISBN = isbn;

	//edition metadata
	var edition = getElementsByAttr(doc, 'data-once-text','XocsCtrl.edition')[0].innerHTML.split("Edition")[0].trim();
	item.edition = edition;

	//publisher metadata
	var datePub = getElementsByAttr(doc, 'data-once-text','XocsCtrl.copyright')[0].innerHTML;
	var splitDate = datePub.split(',')[0];
	var date = splitDate.replace(/\D/g, '');
	var pub;
	if (datePub.includes("imprint")){
		var imprint = datePub.split("by")[1].split(", an")[0].trim();
		var parent = datePub.split("imprint of")[1].split("Inc.")[0].trim();
		pub = parent+"/"+imprint;
	}
	else{
		pub = datePub.split("by")[1].split(", Inc")[0].trim();
	}
	item.date = date;
	item.publisher = pub;
	if(pub.includes("Elsevier")){
		item.place = "Philadelphia, PA";
	}

	return item;
}

/**
* Return list of elements that have attr containing content
*/
function getElementsByAttr(doc, attr, content){
	var matching = [];
	var allElements = doc.getElementsByTagName("*");
	for (var i =0; i<allElements.length;i++){
		if(allElements[i].hasAttribute(attr)){
			if(allElements[i].getAttribute(attr).includes(content)){
				matching.push(allElements[i]);
			}
		}
	}
	return matching;
}
