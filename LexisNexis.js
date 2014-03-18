{
	"translatorID": "b047a13c-fe5c-6604-c997-bef15e502b09",
	"label": "LexisNexis",
	"creator": "Philipp Zumstein",
	"target": "https?://[^/]*lexis-?nexis\\.com",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsv",
	"lastUpdated": "2014-03-18 16:33:57"
}

/*
	***** BEGIN LICENSE BLOCK *****

	LexisNexis Translator, Copyright © 2014 Philipp Zumstein
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


function detectWeb(doc, url) {
	//besides deciding whether it is a single item or multiple items
	//it is also important here to select the correct frame! Zotero
	//will only focus on one frame and it is possible to work with that
	//frame further.

	//let's go for the navigation bar (2nd frame from top) to call new urls with hidden variables
	//(this is maybe not the natural choice, but it seems to work)
	if (url.indexOf("parent=docview") != -1 && url.indexOf("target=results_listview_resultsNav") != -1 ) {
		return "newspaperArticle";
	}
	
	if (url.indexOf("contentRenderer.do?") != -1 || url.indexOf("target=results_ResultsList") != -1) {
		return "multiple";
	}
}

function selectFrame(doc, url) {
    if (url.indexOf("target=results_listview_resultsNav") == -1 ) {
        var frames = doc.getElementsByTagName("frame");
        var gotoUrl;
        for (var i=0; i<frames.length; i++) {
            if (frames[i].src.indexOf("target=results_listview_resultsNav") != -1) gotoUrl=frames[i].src;
        }
        ZU.processDocuments(gotoUrl, scrape);
    } else {
        scrape(doc,url);
    }
}

function scrape(doc, url) {
	//base is url containing the host and the first two (or one) subdirectories
	//e.g. http://www.lexisnexis.com/uk/nexis/
	//or   http://www.lexisnexis.com/us/lnacademic/
	//or   http://www.lexisnexis.com/lnacui2api/
	var urlParts = url.split('/');
	var base = urlParts.slice(0,Math.min(5, urlParts.length-1)).join('/') + '/';

	var permaLink = ZU.xpathText(doc,'//input[@name="bookmarkUrl"]/@value');
	
	var risb = ZU.xpathText(doc,'//input[@name="risb"]/@value');
	
	var cisb = ZU.xpathText(doc,'//input[@name="cisb"]/@value');
	if (!cisb) {
		cisb = "";
	}

	var urlIntermediateSite = base+"results/listview/delPrep.do?cisb="+cisb+"&risb="+risb+"&mode=delivery_refworks";

	var hiddenInputs = ZU.xpath(doc, '//form[@name="results_docview_DocumentForm"]//input[@type="hidden" and not(@name="tagData")]');
	if (hiddenInputs.length==0) {
		hiddenInputs = ZU.xpath(doc, '//input[@type="hidden" and not(@name="tagData")]');
	}
	var poststring="";
	for (var i=0; i<hiddenInputs.length; i++) {
		poststring = poststring+"&"+hiddenInputs[i].name+"="+encodeURIComponent(hiddenInputs[i].value);
	};
	
	poststring += "&focusTerms=&nextSteps=0";
	
	ZU.doPost(urlIntermediateSite, poststring, function(text) {
		
		var urlRis = base+"delivery/rwBibiographicDelegate.do";
		var disb = /<input type="hidden" name="disb" value="([^"]+)">/.exec(text);
		var initializationPage = /<input type="hidden" name="initializationPage" value="([^"]+)">/.exec(text);
		
		var poststring2 = "screenReaderSupported=false&delRange=cur&selDocs=&exportType=dnldBiblio&disb="+disb[1]+"&initializationPage="+initializationPage[1];
		Z.debug(poststring2);

		ZU.doPost(urlRis, poststring2, function(text) {
			var risData = text;
			//most authors are saved in N1 tag, correct that:
			text = text.replace(/^N1\s+-\s+(\w.*)$/mg, cleanAuthorFields );
			//correct date format in RIS e.g. PY - 2013/05/09/
			text = text.replace(/^PY\s+-\s+/mg, 'DA - ');
			Z.debug(text);
			
			var trans = Zotero.loadTranslator('import');
			trans.setTranslator('32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7');//https://github.com/zotero/translators/blob/master/RIS.js
			trans.setString(text);

			trans.setHandler('itemDone', function (obj, item) {
				
				item.url = permaLink;
				
				//for debugging TODO: delete later
				item.notes.push({note:risData});
				
				item.attachments.push( {
					url: url.replace(/target=results_listview_resultsNav/,"target=results_DocumentContent"),
					title: "LexisNexis Entry",
					mimeType: "text/html",
				} );
				item.complete();
			});
		
			trans.translate();
			
		});
	});
}

function cleanAuthorFields(m, authorStr) {
	//m = matched string (everything)
	//authorStr = second parenthesized submatch
	var authors = authorStr.split(';');
	if(authors.length == 1)  {
		//no semicolon
		authors = authorStr.split(',');
		if(authors.length < 3) {
			//at most single comma, don't mess with it
			return 'AU  - ' + authorStr;
		} else if (authors.length == 3) {
			//we have to distinguish the correct cases where the third part is
			//just a suffix as "Jr." and wrong cases where this is a list of
			//three authors ==> easiest is maybe to check for a space
			if (ZU.trim(authors[2]).indexOf(' ') == -1) {
				return 'AU  - ' + authorStr;
			}
		}
	}
	
	//here: One of the following two cases holds:
	//(i) authorStr contains semicolon(s), authors is the array of its different parts, fixName = false
	//(ii) authorStr contains no semicolon but more than one comma, authors is the array of its different parts, fixName = true	
	var str = '';
	for(var i=0; i<authors.length; i++) {
		var author = ZU.trim(authors[i]);
		if(author.indexOf(',') == -1 && author.indexOf(' ') != -1) {
			//best guess: split at the last space
			var splitAt = author.lastIndexOf(' ');
			author = author.substring(splitAt+1) + ', ' + author.substring(0, splitAt);
		}
		if(author) str += '\nAU  - ' + author;
	}
	return str.substr(1);
}


function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		
		var items = new Object();
		var articles = new Array();
		
		//because the page contains iframe, we cannot use doc itself for xpath, etc.
		//but the following construction seems to work:
		var tempDoc = doc.defaultView.parent.document;
		
		var rows = ZU.xpath(tempDoc, '//tr[./td/input[@name="frm_tagged_documents"]]/td/a');//exclude weblinks
		Z.debug("rows.length = " + rows.length);
		for(var i=0; i<rows.length; i++) {
			var title = ZU.trimInternal(rows[i].textContent);
			var link = rows[i].href;
			items[link] = title;
		}
		Zotero.selectItems(items, function (items) {
			if (!items) {
				return true;
			}
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, selectFrame);
		});
	} else {
		scrape(doc, url);
	}
	
}