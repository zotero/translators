{
	"translatorID": "80bc4fd3-747c-4dc2-86e9-da7b251e1407",
	"label": "Journal of Machine Learning Research",
	"creator": "Fei Qi",
	"target": "^http://jmlr\\.csail\\.mit\\.edu/papers",
	"minVersion": "1.0.0b4.r5",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcs",
	"lastUpdated": "2012-01-30 22:47:47"
}

function detectWeb(doc, url) {
	var contRe = /(v\d+|topic|special)/;
	var m = contRe.exec( url );
	if (m) {
		if( doc.title.match( "JMLR" ) )
			return "multiple";
		else
			return "journalArticle";
	}
	return false;
}

function scrape( doc, url ) {
	var n = doc.documentElement.namespaceURI;
	var ns = n ? function(prefix) {} : null;

	var item = new Zotero.Item( "journalArticle" );
	item.url = doc.location.href;
	item.publicationTitle = "Journal of Machine Learning Research";

	// Zotero.debug( 'retrieving title' );
	var title = doc.evaluate( '//div[@id="content"]/h2', doc, ns,
							  XPathResult.ANY_TYPE, null ).iterateNext();
	if( title ){
		var titlecontent = title.textContent.replace( /^\s+/, '' );
		item.title = titlecontent.replace( /\s+$/, '' );
	}

	var refline = doc.evaluate( '//div[@id="content"]/p', doc, ns,
								XPathResult.ANY_TYPE, null ).iterateNext();
	if( refline ) {
		var info = refline.textContent.split( ';' );
		var authors = info[0].split( ',' );
		for ( var j = 0; j < authors.length; j++ ){
			item.creators.push( Zotero.Utilities.cleanAuthor( authors[j], "author" ) );
		}
		// Zotero.debug( 'retrieving publication info' );
		var volissRe = /\s*(\d+)\(\s*(\w+)\s*\):\s*(\d+\s*--\s*\d+),\s*(\d+)./;
		var voliss = info[1].match( volissRe );
		item.volume = voliss[1];
		item.date = voliss[2] + ', ' + voliss[4];
		item.pages = voliss[3];
	}

	var text = doc.evaluate( '//div[@id="content"]', doc, ns,
							 XPathResult.ANY_TYPE, null ).iterateNext();
	// Zotero.debug( doc.textContent );
	var full = text.textContent.split( 'Abstract' );
	var absatt = full[1].split( '[abs]' );
	var abs =absatt[0].replace( /^\s+/, '' );
	item.abstractNote = abs.replace( /\s+$/, '' );
	//Zotero.debug(  item.abstractNote );
	
	var atts = doc.evaluate( '//div[@id="content"]//a', doc, ns,
							 XPathResult.ANY_TYPE, null );
	var att = atts.iterateNext();
	while( att ){
		// Zotero.debug( att.textContent + ' VS ' + att.href );
		if( 0 <= att.textContent.search( 'pdf' ) ) {
			item.attachments = [ {url:att.href,
								  title:item.title,
								  mimeType:"application/pdf"} ];
			break;
		}
		att = atts.iterateNext();
	}
	item.complete();
}

function doWeb( doc, url ) {
	var arts = new Array();
	if (detectWeb(doc, url) == "multiple") {
		var n = doc.documentElement.namespaceURI;
		var ns = n ? function(prefix) {} : null;
		// Search page
		var items = new Object();
		var titles =  doc.evaluate( '//div[@id="content"]//dt', doc, ns,
									XPathResult.ANY_TYPE, null );
		var urls = doc.evaluate( '//div[@id="content"]//dd/a', doc, ns, 
								 XPathResult.ANY_TYPE, null );
		if( titles && urls ) {
			var title = titles.iterateNext();
			var url = urls.iterateNext();
			while( title ) {
				while( 0 > url.textContent.search( 'abs' ) )
					url = urls.iterateNext();
				// Zotero.debug( title.textContent + ' AT ' + url.href );
				items[url.href] = title.textContent;
				title = titles.iterateNext();
				url = urls.iterateNext();
			}
		}
		items = Zotero.selectItems(items);
		for (var item in items) {
			arts.push(item);
		}
	} else {
		arts.push(url);
	}

	Zotero.Utilities.processDocuments( arts, scrape, function() {Zotero.done();});
	Zotero.wait();
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://jmlr.csail.mit.edu/papers/v10/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://jmlr.csail.mit.edu/papers/v10/kang09a.html",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Changsung",
						"lastName": "Kang",
						"creatorType": "author"
					},
					{
						"firstName": "Jin",
						"lastName": "Tian",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"url": "http://www.jmlr.org/papers/volume10/kang09a/kang09a.pdf",
						"title": "Markov Properties for Linear Causal Models with Correlated Errors",
						"mimeType": "application/pdf"
					}
				],
				"url": "http://jmlr.csail.mit.edu/papers/v10/kang09a.html",
				"publicationTitle": "Journal of Machine Learning Research",
				"title": "Markov Properties for Linear Causal Models with Correlated Errors",
				"volume": "10",
				"date": "Jan, 2009",
				"pages": "41--70",
				"abstractNote": "A linear causal model with correlated errors, represented by a DAG\nwith bi-directed edges, can be tested by the set of conditional\nindependence relations implied by the model. A global Markov property\nspecifies, by the d-separation criterion, the set of all conditional\nindependence relations holding in any model associated with a graph. A\nlocal Markov property specifies a much smaller set of conditional\nindependence relations which will imply all other conditional\nindependence relations which hold under the global Markov\nproperty. For DAGs with bi-directed edges associated with arbitrary\nprobability distributions, a local Markov property is given in\nRichardson (2003) which may invoke an exponential number of\nconditional independencies. In this paper, we show that for a class of\nlinear structural equation models with correlated errors, there is a\nlocal Markov property which will invoke only a linear number of\nconditional independence relations. For general linear models, we\nprovide a local Markov property that often invokes far fewer\nconditional independencies than that in Richardson (2003). The\nresults have applications in testing linear structural equation models\nwith correlated errors.",
				"libraryCatalog": "Journal of Machine Learning Research",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	}
]
/** END TEST CASES **/