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
	"lastUpdated": "2016-12-30 03:13:52"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2016 Jaret M. Karnuta

	This file is part of Zotero.

	Zotero is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	Zotero is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
	GNU Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public License
	along with Zotero. If not, see <http://www.gnu.org/licenses/>.

	***** END LICENSE BLOCK *****
*/

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
	if(jsession){
		Zotero.monitorDOMChanges(jsession, {attributes:true});
		if(!jsession.value){
			return;
		}
	}

	var contentType;
	//contains /content/book/ and does not contain login?
	if(url.indexOf("/content/book/") != -1 && url.indexOf("login?") == -1){
		contentType = "bookSection";
	}
	//similar structure to above
	else if (url.indexOf('/browse/book/') != -1 && url.indexOf("login?") == -1){
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
		var isbn = ZU.xpath(doc, "//button/@data-metadata-isbn");
		if(!isbn){
			return;
		}
		isbn = ZU.cleanISBN(isbn[0].value);
		//use search translator to get metadata from isbn
		var search = Zotero.loadTranslator("search");
		//set translators and search
		search.setHandler("translators", function(obj, translators) {
			search.setTranslator(translators);
			search.setHandler("itemDone", function(obj, lookupItem) {
				newItem=lookupItem;
				//update ISBN
				newItem.ISBN = ZU.cleanISBN(isbn);
				//Override library catalog
				newItem.libraryCatalog = "Clinical Key";
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
	var bookTitle = ZU.xpathText(doc, '//*[@data-once-text="XocsCtrl.title"]');
	item.bookTitle = bookTitle;
	//section title
	var title  = ZU.xpathText(doc, '//*[@ng-bind-html="ContentCtrl.title"]');
	item.title = title;
	//authors
	var authorsList  = ZU.xpath(doc, '//ul[@ng-bind-html="XocsCtrl.authorsHtml"]/li/a');
	for (var i = 0;i<authorsList.length;i++){
		var author = authorsList[i].innerHTML;
		if(author.indexOf("<") != -1){
			author = author.split("<")[0];
		}
		item.creators.push(Zotero.Utilities.cleanAuthor(author, 'author'));
	}

	//chapter and page metadata
	var chapterAndPages = ZU.xpathText(doc,'//p[@class="source ng-binding"]');
	//make pattern that should capter pages if present
	//matches both xxx-xxx (length of #s not important)
	//and xxx-xxx.eY
	var pagesPattern = /\s\d+-\d+(\.e\d+)?/;
	var pagesMatch = chapterAndPages.match(pagesPattern);
	if(pagesMatch){
		//get whole regex match
		item.pages = pagesMatch[0];
	}
	//make pattern that will match to the chapter number
	var chapterPattern = /chapter\s(\d+)/i
	var chapterMatch = chapterAndPages.match(chapterPattern);
	if(chapterMatch){
		//get match within first group
		var chapterNumber = chapterMatch[1];
		item.notes.push({note:"Chapter: "+chapterNumber});
	}


	//ISBN metadata
	var isbn = ZU.xpath(doc, "//button/@data-metadata-isbn");
	if(isbn){
		var isbnNo = isbn[0].value;
		item.ISBN = isbn;
	}
	//edition metadata
	var edition = ZU.xpathText(doc, '//*[@data-once-text="XocsCtrl.edition"]').split(/edition/i)[0].trim();
	//convert to number for correct zotero citation handling
	item.edition = textToNumber(edition);

	//publisher metadata
	var datePub = ZU.xpathText(doc, '//*[@data-once-text="XocsCtrl.copyright"]');
	var datePattern = /\d{4}/g;
	var dateMatch = datePub.match(datePattern);
	if(dateMatch){
		item.date = dateMatch[0];
	}

	if(datePub.indexOf("imprint") != -1){
		var imprintPattern = /by\s(.*),.*imprint\sof\s(.*)\sInc/i;
		var imprintMatch = datePub.match(imprintPattern);
		if(imprintMatch){
			//expected number of matches
			if(imprintMatch.length == 3){
				item.publisher = imprintMatch[2]+"/"+imprintMatch[1];
			}
			//added for robustness
			else{
				var imprintPublisher=imprintMatch[0].replace("by","").trim();
				item.publisher=imprintPublisher;
			}
		}
	}
	else{
		var publisherPattern = /by\s(.*?)(,)?\s/;
		var publisherMatch = datePub.match(publisherPattern);
		if(publisherMatch){
			//get first matched group, between by and , or whitespace
			item.publisher=publisherMatch[1];
		}
	}
	if(datePub.match(/elsevier/i)){
		item.place = "Philadelphia, PA";
	}

	return item;
}

//Converts ordinal text to number
//Only converting up to 31
//E.g., text=first -> 1
//E.g., Twenty-Second -> 22
function textToNumber(text){
	textarr = [
		"first",
		"second",
		"third",
		"fourth",
		"fifth",
		"sixth",
		"seventh",
		"eighth",
		"ninth",
		"tenth",
		"eleventh",
		"twelfth",
		"thirteenth",
		"fourteenth",
		"fifteenth",
		"sixteenth",
		"seventeenth",
		"eighteenth",
		"nineteenth",
		"twentieth",
		"twenty-first",
		"twenty-second",
		"twenty-third",
		"twenty-fourth",
		"twenty-fifth",
		"twenty-sixth",
		"twenty-seventh",
		"twenty-eighth",
		"twenty-ninth",
		"thirtieth",
		"thirty-first"
	];
	var number = textarr.indexOf(text.toLowerCase());
	//shift from 0 to 1 based indexing
	return (number != -1)? number + 1 : text;
}
