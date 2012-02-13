{
	"translatorID": "ba10b5bc-562f-11e1-b20d-a3084924019b",
	"label": "Nuclear Receptor Signaling",
	"creator": "Aurimas Vinckevicius",
	"target": "^https?://[^/]*nursa.org/(article|nrs|abstract)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcs",
	"lastUpdated": "2012-02-13 18:13:31"
}

/*
 Translator for Nuclear Receptor Signaling journal. Example URLs:
 	Multiple:
 		http://www.nursa.org/nrs.cfm?detail=Perspectives&journalVolume=9
 		http://www.nursa.org/nrs.cfm?detail=Reviews&journalVolume=9
 		http://www.nursa.org/nrs.cfm?detail=Most%20Viewed&journalVolume=9
 		http://www.nursa.org/nrs.cfm?detail=Methods&journalVolume=9
 	Journal Article:
 		http://www.nursa.org/abstract.cfm?doi=10.1621/nrs.07008
 		http://www.nursa.org/article.cfm?doi=10.1621/nrs.09001
*/

function relativeToAbsolute(doc, url) {
	if( typeof(url) == 'undefined' || url.length < 1 ) {
		return doc.location.toString();
	}

	//check whether it's not already absolute
	if(url.match(/^\w+:\/\//)) {
		return url;
	}

	if(url.indexOf('/') == 0) {
	//relative to root
		return doc.location.protocol + '//' + doc.location.host +
			( (doc.location.port.length)?':' + doc.location.port:'' ) +
			url;
	} else {
	//relative to current directory
		var location = doc.location.toString();
		if( location.indexOf('?') > -1 ) {
			location = location.slice(0, location.indexOf('?'));
		}
		return location.replace(/([^\/]\/)[^\/]+$/,'$1') + url;
	}
}

function detectWeb(doc, url) {
	if( url.match('nrs.cfm') &&
	    url.match(/detail=(perspectives|reviews|most%20viewed|methods)(&|$)/i) ) {
		return 'multiple';
	} else if( !doc.title.match(/^Error/i) &&
		   doc.title.trim().toLowerCase() != 'nursa |' ) {
		return 'journalArticle';
	}
}

function doWeb(doc, url) {
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
		if (prefix == 'x') return namespace; else return null;
	} : null;

	if( detectWeb(doc, url) == 'multiple' ) {
		var items = Zotero.Utilities.xpath(doc, '//div[@class="articleItemFull"]');
		var title, itemUrl;
		var selectFrom = new Object();
		for( var i in items ) {
			title = Zotero.Utilities.xpathText(items[i], './i[text()="Nucl Recept Signal"]/preceding-sibling::node()', null, ' ');
			itemUrl = Zotero.Utilities.xpath(items[i], './a[text()="Full Text"]').shift();
			if(title && itemUrl) {
				title = Zotero.Utilities.trimInternal( title.slice(title.indexOf(')')+1).trim() );
				selectFrom[relativeToAbsolute(doc, itemUrl.href)] = title;
			}
		}

		Zotero.selectItems(selectFrom,
			function(selectedItems) {
				if( selectedItems == null ) return true;

				var urls = new Array();
				for( var item in selectedItems ) {
					urls.push(item);
				}

				Zotero.Utilities.processDocuments(urls,
					function(newDoc) {
						doWeb(newDoc, newDoc.location.href)
					},
					function() { Zotero.done(); });
			});
	} else {
		//load full text instead of abstract to get the full auhor names
		if( url.match('abstract.cfm') ) {
			Zotero.Utilities.processDocuments(url.replace(/abstract.cfm/,'article.cfm'),
				function(newDoc) {
					doWeb(newDoc, newDoc.location.href)
				},
				function() { Zotero.done(); });
			return null;
		}

		var item = new Zotero.Item('journalArticle');

		item.title = Zotero.Utilities.xpathText(doc, '//div[contains(@class,"articleTitle")]').trim();

		var authors = doc.evaluate('//div[@class="topAuthors"]//span', doc, nsResolver, XPathResult.ANY_TYPE, null);
		var author;
		while( author = authors.iterateNext() ) {
			author = author.textContent.trim().replace(/\s+and$/,'');
			item.creators.push( Zotero.Utilities.cleanAuthor(author, 'author', false) );
		}

		item.publicationTitle = 'Nuclear Receptor Signaling';
		item.journalAbbreviation = 'Nucl. Recept. Signaling';

		var published = Zotero.Utilities.xpathText(doc, '//div[contains(@class,"bottomHeader")]/p[1]').trim();
		var pubDelim = 'Published:';
		if( published && published.indexOf(pubDelim) != -1 ) {
			item.date = published.slice( published.lastIndexOf(pubDelim) + pubDelim.length ).trim();
		}

		item.volume = Zotero.Utilities.xpathText(doc, '//div[contains(@class,"volumeCiteInfo")][2]/b');

		var page = Zotero.Utilities.xpathText(doc, '//div[contains(@class,"volumeCiteInfo")][2]/text()[2]');
		if(page) {
			item.pages = page.replace(/\W/g,'');
		}

		item.abstractNote = Zotero.Utilities.xpathText(doc, '//div[contains(@class,"abstract")]/p', null, "\n");

		var doi = Zotero.Utilities.xpathText(doc, '//div[contains(@class,"bottomHeader")]/p[3]/text()[normalize-space()]');
		if(doi) {
			item.DOI = doi.trim();
		}

		item.url = url;

		var issn = Zotero.Utilities.xpathText(doc, '//div[@class="issn"]');
		if(issn) {
			item.ISSN = issn.trim().replace(/ISSN#\s*/,'');
		}

		var rights = Zotero.Utilities.xpathText(doc, '//div[contains(@class,"bottomHeader")]/p[2]');
		if(rights) {
			item.rights = rights;
		}

		item.accessDate = 'CURRENT_TIMESTAMP';

		var pdfURL = Zotero.Utilities.xpath(doc, '//div[span/text() = "Download PDF"]/a').shift();
		if(pdfURL) {
			item.attachments = [{
				url: relativeToAbsolute(doc, pdfURL.href),
				title: 'Full Text PDF',
				mimeType: 'application/pdf'}];
		}

		item.complete();
	}
}