{
	"translatorID": "b047a13c-fe5c-6604-c997-bef15e502b09",
	"label": "LexisNexis",
	"creator": "Sean Takats, Philipp Zumstein",
	"target": "https?://[^/]*lexis-?nexis\\.com",
	"minVersion": "3",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsv",
	"lastUpdated": "2014-03-16 14:20:57"
}

function detectWeb(doc, url) {
	//besides deciding whether it is a single item or multiple items
	//it is also important here to select the correct frame! Zotero
	//will only focus on one frame and it is possible to work with that
	//frame further.

	//let's go for the navigation bar (2nd frame from top) to call new urls with hidden variables
	//(this is maybe not the natural choice, but it seems to work)
	if (url.indexOf("parent=docview") != -1 && url.indexOf("target=results_listview_resultsNav") != -1 ) {
		Z.debug("1s url = "+url);
		return "newspaperArticle";
	}
	
	//uk/nexis/contentRenderer.do?rand=0.6035261066437975&resultFormatId=NewsRslt
	//uk/nexis/frame.do?tokenKey=rsh-14.764477.4893349548&target=results_ResultsList&returnToKey=20_T19440205643&parent=ptframeset&rand=1394919788099&reloadEntirePage=true
	if (url.indexOf("contentRenderer.do?") != -1 || url.indexOf("target=results_ResultsList") != -1) {
		Z.debug("1m url = "+url);
		return "multiple";
	}
}

function scrape(doc, url) {
	//base is url containing the host and the first two subdirectories
	//e.g. http://www.lexisnexis.com/uk/nexis/
	//or   http://www.lexisnexis.com/us/lnacademic/
	//or   http://www.lexisnexis.com/lnacui2api/
	var baseRegExp = new RegExp("^http(?:s)?://[^/]+/[^/]+/[^/]+/");
	var m = baseRegExp.exec(doc.location.href);//or simply url ??
	var base;
	if (m) {
		base = m[0];
	} else {
		baseRegExp = new RegExp("^http(?:s)?://[^/]+/[^/]+/");
		m = baseRegExp.exec(doc.location.href);
		base = m[0];
	}

	var permaLink = ZU.xpathText(doc,'//input[@name="bookmarkUrl"]/@value');
	
	var risb = ZU.xpathText(doc,'//input[@name="risb"]/@value');//or @name="risbId"
	
	var cisb = ZU.xpathText(doc,'//input[@name="cisb"]/@value');//or @name="cisbId"
	if (cisb.length==0) {
		/* legacy code ?
		var cisbTemp = ZU.xpath(doc,'//a[@target="_parent"]');
		if (cisbTemp.length>0) {
			cisb = cisbTemp[0].href.match(/cisb=([^&]+)/)[1];
		} else {*/
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
	
	poststring += "&focusTerms=&nextSteps=0";//seems still be missing
	
	ZU.doPost(urlIntermediateSite, poststring, function(text) {
		
		var urlRis = base+"delivery/rwBibiographicDelegate.do";
		var disb = /<input type="hidden" name="disb" value="([^"]+)">/.exec(text);
		var initializationPage = /<input type="hidden" name="initializationPage" value="([^"]+)">/.exec(text);
		
		var poststring2 = "screenReaderSupported=false&delRange=cur&selDocs=&exportType=dnldBiblio&disb="+disb[1]+"&initializationPage="+initializationPage[1];
		Z.debug(poststring2);

		ZU.doPost(urlRis, poststring2, function(text) {
			var risData = text;
			//most authors are saved in N1 tag, correct that:
			text = text.replace(/^N1\s+-\s+(\w.*)$/mg, "AU - $1" );
			Z.debug(text);
			
			var trans = Zotero.loadTranslator('import');
			trans.setTranslator('32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7');//https://github.com/zotero/translators/blob/master/RIS.js
			trans.setString(text);

			trans.setHandler('itemDone', function (obj, item) {
				//correct date format in RIS e.g. PY - 2013/05/09/
				if (item.date) {
					item.date = item.date.replace(/\/$/,'').replace(/\//g,'-');
				}
				
				item.url = permaLink;
				
				//for debugging TODO: delete later
				item.notes.push({note:risData});
				
				//TODO: make it better than just this frame
				item.attachments.push( { title: "Snapshot", document:doc } );
				
				//TODO: permalink --> problem with redirection, cookies?
				item.attachments.push( {
					url: permaLink,
					title: "LexisNexis Entry",
					mimeType: "text/html",
					snapshot: true
				} );
				
				
				item.complete();
			});
		
			trans.translate();
			
		});
	});

}


function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {//TODO: not properly working...because of iframes
		//iframes are problematic for the xpath-expressions and they do not contain anything useful
		//--> tried to delete them BUT couldn't get a grip at them
		//neither an xpath-expression, getElementsByTagName, nor getElementById could get a handle on them :-(
		//it seems that with these functions we only have access to the content of the first iframe (and nothing around/besides it)
		
		var items = new Object();
		var articles = new Array();
		
		/* Attemp to grab the elements from pure text --> did not work!
		var docHTML = doc.documentElement.outerHTML;
		Z.debug(docHTML);// --> not the whole document only the google-translate iframe !!
		var searchString = 'name="frm_tagged_documents"';
		var startIndex = 0;
		var linkBegin; var linkEnd; var titleBegin; var titleEnd; var link; var title;
		var test = docHTML.indexOf(searchString,startIndex);
		while (test != -1) {
			Z.debug("found one");
			linkBegin = docHTML.indexOf('<a href="',test)+10;
			linkEnd = docHTML.indexOf('"',linkBegin)-1;
			titleBegin = docHTML.indexOf('>',linkEnd)+1;
			titleEnd = docHTML.indexOf('</a>',titleBegin)-1;
			link = docHTML.substring(linkBegin, linkEnd);
			title = docHTML.substring(titleBegin, titleEnd);
			items[link] = title;
			test = docHTML.indexOf(searchString,titleEnd);
		}
		*/
		
		//should work in theory, but not in practice
		var rows = ZU.xpath(doc, '//tr[td/input[@name="frm_tagged_documents"]]');
		Z.debug("rows.length = " + rows.length);
		for(var i=0; i<rows.length; i++) {
			if (ZU.xpath(rows[i], './td/a').length>0 ) {//exclude weblinks
				var title = ZU.xpathText(rows[i], './td/a');
				var link = ZU.xpathText(rows[i], './td/a/@href');
				items[link] = title;
			}
		}
		Zotero.selectItems(items, function (items) {
			if (!items) {
				return true;
			}
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, scrape);
		});
	} else {
		scrape(doc, url);
	}
	
}