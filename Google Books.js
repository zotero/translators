{
	"translatorID": "3e684d82-73a3-9a34-095f-19b112d88bbf",
	"label": "Google Books",
	"creator": "Simon Kornblith, Michael Berkowitz and Rintze Zelle",
	"target": "^https?://(books|www)\\.google\\.[a-z]+(\\.[a-z]+)?/(books(?:\\/.*)?\\?(.*id=.*|.*q=.*)|search\\?.*?btnG=Search\\+Books)",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsbv",
	"lastUpdated": "2012-09-05 00:49:07"
}

/*
The various types of Google Books URLs are:

Search results - List view
http://books.google.com/books?q=asimov&btnG=Search+Books

Search results - Cover view
http://books.google.com/books?q=asimov&btnG=Search%20Books&rview=1

Single item - URL with "id"
http://books.google.com/books?id=skf3LSyV_kEC&source=gbs_navlinks_s
http://books.google.com/books?hl=en&lr=&id=Ct6FKwHhBSQC&oi=fnd&pg=PP9&dq=%22Peggy+Eaton%22&ots=KN-Z0-HAcv&sig=snBNf7bilHi9GFH4-6-3s1ySI9Q#v=onepage&q=%22Peggy%20Eaton%22&f=false

Single item - URL with "vid" (see http://code.google.com/apis/books/docs/static-links.html)
http://books.google.com/books?printsec=frontcover&vid=ISBN0684181355&vid=ISBN0684183951&vid=LCCN84026715#v=onepage&q&f=false

*/

var singleRe = /^http:\/\/(?:books|www)\.google\.[a-z]+(?:\.[a-z]+)?\/books(?:\/.*)?\?(?:.*&)?(id|vid)=([^&]+)/i;

function detectWeb(doc, url) {
	if(singleRe.test(url)) {
		return "book";
	} else {
		return "multiple";
	}
}

var itemUrlBase;
function doWeb(doc, url) {
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
		if (prefix == 'x') return namespace; else return null;
		} : null;
	
	// get local domain suffix
	var psRe = new RegExp("https?://(books|www)\.google\.([^/]+)/");
	var psMatch = psRe.exec(url);
	var suffix = psMatch[2];
	var prefix = "books"; //Where is it not books? psMatch[1];
	itemUrlBase = "http://"+prefix+".google."+suffix+"/books?id=";
	
	var m = singleRe.exec(url);
	if(m && m[1] == "id") {
		ZU.doGet("http://books.google.com/books/feeds/volumes/"+m[2], parseXML, function() { Z.done() });
	} else if (m && m[1] == "vid") {
		var itemLinkWithID = ZU.xpath(doc, '/html/head/link[@rel="canonical"]')[0].href;
		var m = singleRe.exec(itemLinkWithID);
		ZU.doGet("http://books.google.com/books/feeds/volumes/"+m[2], parseXML, function() { Z.done() });
	} else {
		var items = getItemArrayGB(doc, doc, 'google\\.' + suffix + '/books\\?id=([^&]+)', '^(?:All matching pages|About this Book|Table of Contents|Index)');
		// Drop " - Page" thing
		//Zotero.debug(items);
		for(var i in items) {
			items[i] = items[i].replace(/- Page [0-9]+\s*$/, "");
		}
		Zotero.selectItems(items, function(items) {
			if(!items) Z.done();
			
			var newUris = [];
			for(var i in items) {
				var m = singleRe.exec(i);
				newUris.push("http://books.google.com/books/feeds/volumes/"+m[2]);
			}
			ZU.doGet(newUris, parseXML, function() { Z.done() });
		});
	}
	
	Z.wait();
}
	
function parseXML(text) {
	// Remove xml parse instruction and doctype
	var parser = new DOMParser();
	var xml = parser.parseFromString(text, "text/xml").documentElement;
	
	var ns = {"dc":"http://purl.org/dc/terms",
		"atom":"http://www.w3.org/2005/Atom"};
		
	var newItem = new Zotero.Item("book");
	
	var authors = ZU.xpath(xml, "dc:creator", ns);
	for (var i in authors) {
		newItem.creators.push(Zotero.Utilities.cleanAuthor(authors[i].textContent, "author"));
	}
	
	var pages = ZU.xpathText(xml, "dc:format", ns);
	const pagesRe = /(\d+)( pages)/;
	var pagesMatch = pagesRe.exec(pages);
	if (pagesMatch!=null) {
		newItem.numPages = pagesMatch[1];
	} else {
		newItem.numPages = pages;
	}
	
	var ISBN;
	const ISBN10Re = /(ISBN:)(\w{10})$/;
	const ISBN13Re = /(ISBN:)(\w{13})$/;
	var identifiers = ZU.xpath(xml, "dc:identifier", ns);
	for (var i in identifiers) {
		var ISBN10Match = ISBN10Re.exec(identifiers[i].textContent);
		var ISBN13Match = ISBN13Re.exec(identifiers[i].textContent);
		if (ISBN10Match != null) {
			ISBN = ISBN10Match[2];
		}
		if (ISBN13Match != null) {
			ISBN = ISBN13Match[2];
		}
	}
	newItem.ISBN = ISBN;
	
	newItem.publisher = ZU.xpathText(xml, "dc:publisher", ns);
	newItem.title = ZU.xpathText(xml, "dc:title", ns, ": ");
	newItem.language = ZU.xpathText(xml, 'dc:language', ns);
	newItem.abstractNote = ZU.xpathText(xml, 'dc:description', ns);
	newItem.date = ZU.xpathText(xml, "dc:date", ns);

	var url = itemUrlBase + identifiers[0].textContent;
	newItem.attachments = [{title:"Google Books Link", snapshot:false, mimeType:"text/html", url:url}];
	
	var subjects = ZU.xpath(xml, 'dc:subject', ns);
	for(var i in subjects) {
		newItem.tags.push(subjects[i].textContent);
	}
	
	newItem.complete();
}

/**
 * Grabs items based on URLs, modified for Google Books
 *
 * @param {Document} doc DOM document object
 * @param {Element|Element[]} inHere DOM element(s) to process
 * @param {RegExp} [urlRe] Regexp of URLs to add to list
 * @param {RegExp} [urlRe] Regexp of URLs to reject
 * @return {Object} Associative array of link => textContent pairs, suitable for passing to
 *	Zotero.selectItems from within a translator
 */
function getItemArrayGB (doc, inHere, urlRe, rejectRe) {
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
		if (prefix == 'x') return namespace; else return null;
		} : null;
	
	var availableItems = new Object();	// Technically, associative arrays are objects

	//quick check for new format
	var bookList = ZU.xpath(doc, '//ol[@id="rso"]/li');
	if(bookList.length) {
		for(var i=0, n=bookList.length; i<n; i++) {
			var link = ZU.xpathText(bookList[i], './/h3[@class="r"]/a/@href');
			var title = ZU.xpathText(bookList[i], './/h3[@class="r"]/a');
			if(link && title) {
				availableItems[link] = title;
			}
		}
		return availableItems;
	}
	
	// Require link to match this
	if(urlRe) {
		if(urlRe.exec) {
			var urlRegexp = urlRe;
		} else {
			var urlRegexp = new RegExp();
			urlRegexp.compile(urlRe, "i");
		}
	}
	// Do not allow text to match this
	if(rejectRe) {
		if(rejectRe.exec) {
			var rejectRegexp = rejectRe;
		} else {
			var rejectRegexp = new RegExp();
			rejectRegexp.compile(rejectRe, "i");
		}
	}
	
	if(!inHere.length) {
		inHere = new Array(inHere);
	}
	
	for(var j=0; j<inHere.length; j++) {
		var coverView = doc.evaluate('//div[@class="thumbotron"]', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext();//Detect Cover view
		if(coverView){
			var links = inHere[j].getElementsByTagName("a");
			for(var i=0; i<links.length; i++) {
				if(!urlRe || urlRegexp.test(links[i].href)) {
					var text = links[i].textContent;
					if(!text) {
						var text = links[i].firstChild.alt;
					}
					if(text) {
						text = Zotero.Utilities.trimInternal(text);
						if(!rejectRe || !rejectRegexp.test(text)) {
							if(availableItems[links[i].href]) {
								if(text != availableItems[links[i].href]) {
									availableItems[links[i].href] += " "+text;
								}
							} else {
								availableItems[links[i].href] = text;
							}
						}
					}
				}
			}
		}
		else {
			var links = inHere[j].getElementsByTagName("img");//search for <img>-elements, scrape title from alt-attribute, href-link from parent <a>-element
			for(var i=0; i<links.length; i++) {
				if(!urlRe || urlRegexp.test(links[i].parentNode.href)) {
					var text = links[i].alt;
					if(text) {
						text = Zotero.Utilities.trimInternal(text);
						if(!rejectRe || !rejectRegexp.test(text)) {
							if(availableItems[links[i].href]) {
								if(text != availableItems[links[i].href]) {
									availableItems[links[i].href] += " "+text;
								}
							} else {
								availableItems[links[i].parentNode.href] = text;
							}
						}
					}
				}
			}
		}
	}
	
	return availableItems;
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://books.google.com/books?q=asimov&btnG=Search+Books",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://books.google.com/books?q=asimov&btnG=Search%20Books&rview=1",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://books.google.de/books/about/The_Cambridge_companion_to_electronic_mu.html?id=AJbdPZv1DjgC&redir_esc=y",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"firstName": "Julio",
						"lastName": "d'Escrivan",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"Music / General",
					"Music / Genres & Styles / Electronic",
					"Music / Instruction & Study / Techniques"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Google Books Link",
						"snapshot": false,
						"mimeType": "text/html"
					}
				],
				"numPages": "246",
				"ISBN": "9780521868617",
				"language": "en",
				"abstractNote": "Musicians are always quick to adopt and explore new technologies. The fast-paced changes wrought by electrification, from the microphone via the analogue synthesiser to the laptop computer, have led to a wide diversity of new musical styles and techniques. Electronic music has grown to a broad field of investigation, taking in historical movements such as musique concrète and elektronische musik, and contemporary trends such as electronic dance music and electronica. A fascinating array of composers and inventors have contributed to a diverse set of technologies, practices and music. This book brings together some novel threads through this scene, from the viewpoint of researchers at the forefront of the sonic explorations empowered by electronic technology. The chapters provide accessible and insightful overviews of core topic areas and uncover some hitherto less publicised corners of worldwide movements. Recent areas of intense activity such as audiovisuals, live electronic music, interactivity and network music are actively promoted.",
				"libraryCatalog": "Google Books",
				"publisher": "Cambridge University Press",
				"title": "The Cambridge Companion to Electronic Music",
				"date": "2007-12-13"
			}
		]
	},
	{
		"type": "web",
		"url": "http://books.google.de/books?id=skf3LSyV_kEC&source=gbs_navlinks_s&redir_esc=y",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"firstName": "Rubén",
						"lastName": "Pelayo",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"Garcia Marquez, Gabriel - Criticism and interpretation",
					"Literary Criticism / Caribbean & Latin American",
					"Literary Criticism / European / Spanish & Portuguese"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Google Books Link",
						"snapshot": false,
						"mimeType": "text/html"
					}
				],
				"numPages": "208",
				"ISBN": "9780313312601",
				"language": "en",
				"abstractNote": "Winner of the Nobel Prize for Literature in 1982 for his masterpiece One Hundred Years of Solitude, Gabriel Garc^D'ia M^D'arquez had already earned tremendous respect and popularity in the years leading up to that honor, and remains, to date, an active and prolific writer. Readers are introduced to Garc^D'ia M^D'arquez with a vivid account of his fascinating life; from his friendships with poets and presidents, to his distinguished career as a journalist, novelist, and chronicler of the quintessential Latin American experience. This companion also helps students situate Garc^D'ia M^D'arquez within the canon of Western literature, exploring his contributions to the modern novel in general, and his forging of literary techniques, particularly magic realism, that have come to distinguish Latin American fiction. Full literary analysis is given for One Hundred Years of Solitude, as well as Chronicle of a Death Foretold (1981), Love in the Time of Cholera (1985), two additional novels, and five of Garc^D'ia M^D'arquez's best short stories. Students are given guidance in understanding the historical contexts, as well as the characters and themes that recur in these interrelated works. Narrative technique and alternative critical perspectives are also explored for each work, helping readers fully appreciate the literary accomplishments of Gabriel Garc^D'ia M^D'arquez.",
				"libraryCatalog": "Google Books",
				"shortTitle": "Gabriel García Márquez",
				"publisher": "Greenwood Publishing Group",
				"title": "Gabriel García Márquez: A Critical Companion",
				"date": "2001"
			}
		]
	},
	{
		"type": "web",
		"url": "http://books.google.de/books?hl=en&lr=&id=Ct6FKwHhBSQC&oi=fnd&pg=PP9&dq=%22Peggy+Eaton%22&ots=KN-Z0-HAcv&sig=snBNf7bilHi9GFH4-6-3s1ySI9Q&redir_esc=y#v=onepage&q=%22Peggy%20Eaton%22&f=false",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"firstName": "Meade",
						"lastName": "Minnigerode",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"Adams, Abigail",
					"Adams, Louisa Catherine",
					"Biography & Autobiography / General",
					"Biography & Autobiography / Women",
					"Eaton, Peggy",
					"Jackson, Rachel",
					"Madison, Dolley",
					"Monroe, Elizabeth",
					"Presidents' spouses",
					"Washington, Martha"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Google Books Link",
						"snapshot": false,
						"mimeType": "text/html"
					}
				],
				"numPages": "332",
				"ISBN": "9780836913620",
				"language": "en",
				"libraryCatalog": "Google Books",
				"shortTitle": "Some American Ladies",
				"publisher": "Ayer Publishing",
				"title": "Some American Ladies: Seven Informal Biographies ...",
				"date": "1926"
			}
		]
	},
	{
		"type": "web",
		"url": "http://books.google.de/books?printsec=frontcover&vid=LCCN84026715&redir_esc=y#v=onepage&q&f=false",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"firstName": "Thomas B.",
						"lastName": "Holmes",
						"creatorType": "author"
					},
					{
						"firstName": "Thom",
						"lastName": "Holmes",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"Avant-garde (Music)",
					"Electronic books",
					"Electronic music",
					"Electronic music History and criticism",
					"Music / General",
					"Music / Genres & Styles / New Age",
					"Music / History & Criticism"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Google Books Link",
						"snapshot": false,
						"mimeType": "text/html"
					}
				],
				"numPages": "332",
				"ISBN": "9780415936446",
				"language": "en",
				"abstractNote": "Electronic and Experimental Music details the history of electronic music throughout the world, and the people who created it. From the theory of sound production to key composers and instrument designers, this is a complete introduction to the genre from its early roots to the present technological explosion. This new edition, includes a thoroughgly updated and enlarged theoretical and historical sections and includes new material on using home computers (PCs) and the many resources now available in software and the Internet.",
				"libraryCatalog": "Google Books",
				"shortTitle": "Electronic and Experimental Music",
				"publisher": "Psychology Press",
				"title": "Electronic and Experimental Music: Pioneers in Technology and Composition",
				"date": "2002"
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.google.com/search?q=asimov&btnG=Search+Books&tbm=bks&tbo=1#q=asimov&hl=en&tbo=1&tbm=bks&ei=guBGUIDOCJP8qQG7u4DYCg&start=10&sa=N&fp=1&biw=1352&bih=588&bav=on.2,or.r_gc.r_pw.r_qf.&cad=b&sei=guBGUIDOCJP8qQG7u4DYCg",
		"items": "multiple"
	}
]
/** END TEST CASES **/