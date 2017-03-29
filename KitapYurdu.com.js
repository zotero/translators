{
	"translatorID": "d3f35d5a-55da-4e07-be7d-b4d2a821279f",
	"label": "KitapYurdu.com",
	"creator": "Hasan Huseyin DER",
	"target": "^http?://www\\.kitapyurdu\\.com/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "g",
	"lastUpdated": "2017-03-29 09:56:31"
}
/*
****notes:****
- tested only with firefox

****known issues:****
- Turkish char problem: using ZU.capitalizeTitle with publisher names with "I" returns "i" instead of "ı".
*/

function detectWeb(doc, url) {
	if (url.indexOf('/kitap/')>-1||url.indexOf('product_id')>-1) {
		return 'book';
	} else if (getSearchResults(doc, true)) {
		return "multiple";
	}
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//a[contains(@href, "/kitap/")]|//a[contains(@href, "product_id")]');
	for (var i=0; i<rows.length; i++) {
		var href = rows[i].href;
		var title = ZU.trimInternal(rows[i].textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}


function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (!items) {
				return true;
			}
			var articles = [];
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, scrape);
		});
	} else {
		scrape(doc, url);
	}
}


/*
remove titles from creators
*/

function cleanCreatorTitles(str){
	return str.replace(/Prof.|Doç.|Yrd.|Dr.|Çevirmen:|Editor:|Derleyici:/g, '');
}

function scrape(doc, url) {
	var item = new Zotero.Item("book");
	
	item.title = ZU.trimInternal(doc.getElementsByClassName('product-heading')[0].textContent);
	
	var authors = ZU.trimInternal(doc.querySelector('[class=manufacturers]').textContent);
	authors = authors.split(',');
	for (var i=0; i<authors.length; i++) {
		var creator = cleanCreatorTitles(authors[i]);
		item.creators.push(ZU.cleanAuthor(creator, "author"));
	}
	
	var translators = ZU.xpath(doc, '//tr[contains(., "Çevirmen")]');
	for (var i=0; i<translators.length; i++) {
		var creator = cleanCreatorTitles(translators[i].textContent);
		item.creators.push(ZU.cleanAuthor(creator, "translator"));
	}
	
	var editors = ZU.xpath(doc, '//tr[contains(., "Editor")]|//tr[contains(., "Derleyici")]');
	for (var i=0; i<editors.length; i++) {
		var creator = cleanCreatorTitles(editors[i].textContent);
		item.creators.push(ZU.cleanAuthor(creator, "editor"));
	}
	
	var edition = ZU.trimInternal(doc.querySelector('[itemprop=bookEdition]').textContent);
	item.edition = edition.split('.')[0];
	
	var publisher = ZU.trimInternal(doc.querySelector('[itemprop=publisher]').textContent);
	item.publisher = ZU.capitalizeTitle(publisher,true);
	
	item.date = ZU.trimInternal(doc.querySelector('[itemprop=datePublished]').textContent);
	item.ISBN = ZU.trimInternal(doc.querySelector('[itemprop=isbn]').textContent);
	item.numPages = ZU.trimInternal(doc.querySelector('[itemprop=numberOfPages]').textContent);
	item.abstractNote = ZU.trimInternal(doc.querySelector('[id=description_text]').textContent);
	
	item.attachments.push({
		title: "Snapshot",
		document: doc
	});
		
	item.complete();
}
