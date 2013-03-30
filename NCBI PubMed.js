{
	"translatorID": "fcf41bed-0cbc-3704-85c7-8062a0068a7a",
	"label": "NCBI PubMed",
	"creator": "Simon Kornblith, Michael Berkowitz, Avram Lyon, and Rintze Zelle",
	"target": "https?://[^/]*(www|preview)[\\.\\-]ncbi[\\.\\-]nlm[\\.\\-]nih[\\.\\-]gov[^/]*/(books|pubmed|sites/pubmed|sites/entrez|entrez/query\\.fcgi\\?.*db=PubMed)",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 100,
	"configOptions": {
		"dataMode": "block"
	},
	"inRepository": true,
	"translatorType": 13,
	"browserSupport": "gcsbv",
	"lastUpdated": "2013-03-12 00:36:04"
}

/*****************************
 * General utility functions *
 *****************************/
function lookupPMIDs(ids, next) {
	var newUri = "http://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?" +
		"db=PubMed&tool=Zotero&retmode=xml&rettype=citation&id="+ids.join(",");
	Zotero.debug(newUri);
	Zotero.Utilities.HTTP.doGet(newUri, function(text) {
		doImportFromText(text, next);
	});	//call the import translator
}

/****************************
 * Web translator functions *
 ****************************/
 //retrieves the UID from an item page. Returns false if there is more than one.
function getUID(doc) {
	var uid = ZU.xpath(doc, 'html/head/meta[@name="ncbi_uidlist"]/@content');
	if(!uid.length) {
		uid = ZU.xpath(doc, '//input[@id="absid"]/@value');
	}

	if(uid.length == 1 && uid[0].textContent.search(/^\d+$/) != -1) {
		return uid[0].textContent;
	}

	uid = ZU.xpath(doc, 'html/head/link[@media="handheld"]/@href');
	if(uid.length == 1) {
		uid = uid[0].textContent.match(/\/(\d+)(?:\/|$)/);
		if(uid) return uid[1];
	}
	
	//PMID from a bookshelf entry
	var maincontent = doc.getElementById('maincontent');
	if(maincontent) {
		uid = ZU.xpath(maincontent,
			'.//a[@title="PubMed record of this title" or @title="PubMed record of this page"]');
		if(uid.length == 1 && uid[0].textContent.search(/^\d+$/) != -1) return uid;
	}

	return false;
}

//retrieves a list of result nodes from a search results page (perhaps others too)
function getResultList(doc) {
	return ZU.xpath(doc, '//div[@class="rprt"][.//p[@class="title"]]');
}

function detectWeb(doc, url) {
	var items = getResultList(doc);
	if (items.length > 0 && url.indexOf("/books/") == -1) {
		return "multiple";
	}

	if(!getUID(doc)) {
		return;
	}
	
	//try to determine if this is a book
	//"Sections" heading only seems to show up for books
	var maincontent = doc.getElementById('maincontent');
	if(ZU.xpath(maincontent, './/div[@class="sections"]').length)
	{
		var inBook = ZU.xpath(maincontent, './/div[contains(@class, "aff_inline_book")]').length;
		return inBook ? "bookSection" : "book";
	}
	
	
	//from bookshelf page
	var pdid = ZU.xpathText(doc, 'html/head/meta[@name="ncbi_pdid"]/@content');
	if(pdid == "book-part") return 'bookSection';
	if(pdid == "book-toc") return 'book';
	
	return "journalArticle";
}

function doWeb(doc, url) {
	var type = detectWeb(doc, url);
	if(type == "multiple") {
		var results = getResultList(doc);
		var items = {};
		var title, uid;
		for(var i=0, n=results.length; i<n; i++) {
			title = ZU.xpathText(results[i], './/p[@class="title"]');
			uid = ZU.xpathText(results[i], './/input[starts-with(@id,"UidCheckBox")]/@value')
				|| ZU.xpathText(results[i], './/dl[@class="rprtid"]/dd[preceding-sibling::*[1][text()="PMID:"]]');
			if(!uid) {
				uid = ZU.xpathText(results[i], './/p[@class="title"]/a/@href');
				if(uid) uid = uid.match(/\/(\d+)/);
				if(uid) uid = uid[1];
			}

			if(uid && title) {
				// Keys must be strings. Otherwise, Chrome sorts numerically instead of by insertion order.
				items["u"+uid] = title;
			}
		}

		Zotero.selectItems(items, function(selectedItems) {
			if(!selectedItems) return true;

			var uids = [];
			for(var i in selectedItems) {
				uids.push(i.substr(1));
			}
			lookupPMIDs(uids);
		});
	} else {
		lookupPMIDs([getUID(doc)]);
	}
/*
		} else {
			// Here, account for some articles and search results using spans for PMID
			var uids= doc.evaluate('//p[@class="pmid"]', doc,
					nsResolver, XPathResult.ANY_TYPE, null);
			var uid = uids.iterateNext();
			if (!uid) {
				// Fall back on span 
				uids = doc.evaluate('//span[@class="pmid"]', doc,
						nsResolver, XPathResult.ANY_TYPE, null);
				uid = uids.iterateNext();
			}
			if (!uid) {
				// Fall back on <dl class="rprtid"> 
				// See http://www.ncbi.nlm.nih.gov/pubmed?term=1173[page]+AND+1995[pdat]+AND+Morton[author]&cmd=detailssearch
				// Discussed http://forums.zotero.org/discussion/17662
				uids = doc.evaluate('//dl[@class="rprtid"]/dd[1]', doc,
						nsResolver, XPathResult.ANY_TYPE, null);
				uid = uids.iterateNext();
			}
			if (uid) {
				ids.push(uid.textContent.match(/\d+/)[0]);
				Zotero.debug("Found PMID: " + ids[ids.length - 1]);
				lookupPMIDs(ids, doc);
			} else {
				var uids= doc.evaluate('//meta[@name="ncbi_uidlist"]', doc,
						nsResolver, XPathResult.ANY_TYPE, null);
				var uid = uids.iterateNext()["content"].split(' ');
				if (uid) {
					ids.push(uid);
					Zotero.debug("Found PMID: " + ids[ids.length - 1]);
					lookupPMIDs(ids, doc);
				}
			}
		}
*/
}

/*******************************
 * Search translator functions *
 *******************************/
//extract PMID from a context object
function getPMID(co) {
	var coParts = co.split("&");
	for each(part in coParts) {
		if(part.substr(0, 7) == "rft_id=") {
			var value = unescape(part.substr(7));
			if(value.substr(0, 10) == "info:pmid/") {
				return value.substr(10);
			}
		}
	}
}

function detectSearch(item) {
	if(item.contextObject) {
		if(getPMID(item.contextObject)) {
			return true;
		}
	}
	
	//supply PMID as a string or array
	if(item.PMID
		&& (typeof item.PMID == 'string' || item.PMID.length > 0) )  {
		return true;
	}
	
	return false;
}

function doSearch(item) {
	var pmid;
	if(item.contextObject) {
		pmid = getPMID(item.contextObject);
	}
	if(!pmid) pmid = item.PMID;
	
	if(typeof pmid == "string") pmid = [pmid];
	
	lookupPMIDs(pmid);
}

/*******************************
 * Import translator functions *
 *******************************/

function detectImport() {
	Zotero.debug("Detecting Pubmed content....");
	// Look for the PubmedArticle tag in the first 1000 characters
	var text = Zotero.read(1000);
	if (text.indexOf("<PubmedArticle>") != -1) return "journalArticle";
	return false;
}

function doImport() {
	var text = "";
	var line;
	while((line = Zotero.read(4096)) !== false) {
		text += line;
	}
	return doImportFromText(text);
}

function processAuthors(newItem, authorsLists) {
	for(var j=0, m=authorsLists.length; j<m; j++) {
		//default to 'author' unless it's 'editor'
		var type = "author";
		if(authorsLists[j].hasAttribute('Type')
			&& authorsLists[j].getAttribute('Type') === "editors") {
			type = "editor";
		}
	
		var authors = ZU.xpath(authorsLists[j], 'Author');
	
		for(var k=0, l=authors.length; k<l; k++) {
			var author = authors[k];
			var lastName = ZU.xpathText(author, 'LastName');
			var firstName = ZU.xpathText(author, 'FirstName');
			if(!firstName) {
				firstName = ZU.xpathText(author, 'ForeName');
			}
	
			var suffix = ZU.xpathText(author, 'Suffix');
			if(suffix && firstName) {
				firstName += ", " + suffix
			}
	
			if(firstName || lastName) {
				newItem.creators.push({
					creatorType:type,
					lastName:lastName,
					firstName:firstName
				});
			}
		}
	}
}

function doImportFromText(text, next) {
	if (text.substr(0,1000).indexOf("<PubmedArticleSet>") == -1) {
		// Pubmed data in the wild, perhaps copied from the web site's search results,
		// can be missing the <PubmedArticleSet> root tag. Let's add a pair!
		Zotero.debug("No root <PubmedArticleSet> tag found, wrapping in a new root tag.");
		text = "<PubmedArticleSet>" + text + "</PubmedArticleSet>";
	}

	// parse XML with DOMParser
	var parser = new DOMParser();
	var doc = parser.parseFromString(text, "text/xml");
	
	var pageRangeRE = /(\d+)-(\d+)/g;

	//handle journal articles
	var articles = ZU.xpath(doc, '/PubmedArticleSet/PubmedArticle');
	for(var i=0, n=articles.length; i<n; i++) {
		var newItem = new Zotero.Item("journalArticle");

		var citation = ZU.xpath(articles[i], 'MedlineCitation')[0];

		var article = ZU.xpath(citation, 'Article')[0];
		
		var title = ZU.xpathText(article, 'ArticleTitle');
		if(title) {
			if(title.charAt(title.length-1) == ".") {
				title = title.substring(0, title.length-1);
			}
			newItem.title = title;
		}
		
		var fullPageRange = ZU.xpathText(article, 'Pagination/MedlinePgn');
		if(fullPageRange) {
			//where page ranges are given in an abbreviated format, convert to full
			pageRangeRE.lastIndex = 0;
			var range;
			while(range = pageRangeRE.exec(fullPageRange)) {
				var pageRangeStart = range[1];
				var pageRangeEnd = range[2];
				var diff = pageRangeStart.length - pageRangeEnd.length;
				if(diff > 0) {
					pageRangeEnd = pageRangeStart.substring(0,diff) + pageRangeEnd;
					var newRange = pageRangeStart + "-" + pageRangeEnd;
					fullPageRange = fullPageRange.substring(0, range.index) //everything before current range
						+ newRange	//insert the new range
						+ fullPageRange.substring(range.index + range[0].length);	//everything after the old range
					//adjust RE index
					pageRangeRE.lastIndex += newRange.length - range[0].length;
				}
			}
			newItem.pages = fullPageRange;
		}
		
		var journal = ZU.xpath(article, 'Journal')[0];
		if(journal) {
			newItem.ISSN = ZU.xpathText(journal, 'ISSN');
			
			var abbreviation;
			if((abbreviation = ZU.xpathText(journal, 'ISOAbbreviation'))) {
				newItem.journalAbbreviation = abbreviation;	
			} else if((abbreviation = ZU.xpathText(journal, 'MedlineTA'))) {
				newItem.journalAbbreviation = abbreviation;
			}
			
			var title = ZU.xpathText(journal, 'Title');
			if(title) {
				newItem.publicationTitle = title;
			} else if(newItem.journalAbbreviation) {
				newItem.publicationTitle = newItem.journalAbbreviation;
			}
			// (do we want this?)
			if(newItem.publicationTitle) {
				newItem.publicationTitle = ZU.capitalizeTitle(newItem.publicationTitle);
			}
			
			var journalIssue = ZU.xpath(journal, 'JournalIssue')[0];
			if(journalIssue) {
				newItem.volume = ZU.xpathText(journalIssue, 'Volume');
				newItem.issue = ZU.xpathText(journalIssue, 'Issue');
				var pubDate = ZU.xpath(journalIssue, 'PubDate')[0];
				if(pubDate) {	// try to get the date
					var day = ZU.xpathText(pubDate, 'Day');
					var month = ZU.xpathText(pubDate, 'Month');
					var year = ZU.xpathText(pubDate, 'Year');
					
					if(day) {
						newItem.date = month+" "+day+", "+year;
					} else if(month) {
						newItem.date = month+" "+year;
					} else if(year) {
						newItem.date = year;
					} else {
						newItem.date = ZU.xpathText(pubDate, 'MedlineDate');
					}
				}
			}
		}

		var authors = ZU.xpath(article, 'AuthorList/Author');
		for(var j=0, m=authors.length; j<m; j++) {
			var author = authors[j];
			
			var lastName = ZU.xpathText(author, 'LastName');
			var firstName = ZU.xpathText(author, 'FirstName');
			if(!firstName) {
				firstName = ZU.xpathText(author, 'ForeName');
			}
			var suffix = ZU.xpathText(author, 'Suffix');
			if(suffix && firstName) {
				firstName += ", " + suffix
			}
			if(firstName || lastName) {
				newItem.creators.push({lastName:lastName, firstName:firstName});
			}
		}
		
		newItem.language = ZU.xpathText(article, 'Language');
		
		var keywords = ZU.xpath(citation, 'MeshHeadingList/MeshHeading');
		for(var j=0, m=keywords.length; j<m; j++) {
			newItem.tags.push(ZU.xpathText(keywords[j], 'DescriptorName'));
		}
		
		var abstractSections = ZU.xpath(article, 'Abstract/AbstractText');
		var abstractNote = [];
		for(var j=0, m=abstractSections.length; j<m; j++) {
			var abstractSection = abstractSections[j];
			var paragraph = abstractSection.textContent.trim();
			if(paragraph) paragraph += '\n';
			
			var label = abstractSection.hasAttribute("Label") && abstractSection.getAttribute("Label");
			if(label && label != "UNLABELLED") {
				paragraph = label + ": " + paragraph;
			}
			abstractNote.push(paragraph);
		}
		newItem.abstractNote = abstractNote.join('');
		
		newItem.DOI = ZU.xpathText(articles[i], 'PubmedData/ArticleIdList/ArticleId[@IdType="doi"]');
		
		var PMID = ZU.xpathText(citation, 'PMID');
		if(PMID) {
			newItem.extra = "PMID: "+PMID;
			
			//this is a catalog, so we should store links as attachments
			newItem.attachments.push({
				title: "PubMed entry",
				url: "http://www.ncbi.nlm.nih.gov/pubmed/" + PMID,
				mimeType: "text/html",
				snapshot: false
			});
		}

		newItem.complete();
	}

	//handle books and chapters
	var books = ZU.xpath(doc, '/PubmedArticleSet/PubmedBookArticle');
	for(var i=0, n=books.length; i<n; i++) {
		var citation = ZU.xpath(books[i], 'BookDocument')[0];
		
		//check if this is a section
		var sectionTitle = ZU.xpathText(citation, 'ArticleTitle');
		var isBookSection = !!sectionTitle;
		var newItem = new Zotero.Item(isBookSection ? 'bookSection' : 'book');
		
		if(isBookSection) {
			newItem.title = sectionTitle;
		}

		var book = ZU.xpath(citation, 'Book')[0];

		//title
		var title = ZU.xpathText(book, 'BookTitle');
		if(title) {
			if(title.charAt(title.length-1) == ".") {
				title = title.substring(0, title.length-1);
			}
			if(isBookSection) {
				newItem.publicationTitle = title;
			} else {
				newItem.title = title;
			}
		}

		//date
		//should only need year for books
		newItem.date = ZU.xpathText(book, 'PubDate/Year');

		//edition
		newItem.edition = ZU.xpathText(book, 'Edition');
		
		//series
		newItem.series = ZU.xpathText(book, 'CollectionTitle');
		
		//volume
		newItem.volume = ZU.xpathText(book, 'Volume');

		//place
		newItem.place = ZU.xpathText(book, 'Publisher/PublisherLocation');

		//publisher
		newItem.publisher = ZU.xpathText(book, 'Publisher/PublisherName');

		//chapter authors
		if(isBookSection) {
			var authorsLists = ZU.xpath(citation, 'AuthorList');
			processAuthors(newItem, authorsLists);
		}
		
		//book creators
		var authorsLists = ZU.xpath(book, 'AuthorList');
		processAuthors(newItem, authorsLists);
	
		//language
		newItem.language = ZU.xpathText(citation, 'Language');

		//abstractNote
		newItem.abstractNote = ZU.xpathText(citation, 'Abstract/AbstractText');
		
		//rights
		newItem.rights = ZU.xpathText(citation, 'Abstract/CopyrightInformation');
		
		//seriesNumber, numPages, numberOfVolumes
		//not available
		
		//ISBN
		newItem.ISBN = ZU.xpathText(book, 'Isbn');
		
		var PMID = ZU.xpathText(citation, 'PMID');
		if(PMID) {
			newItem.extra = "PMID: "+PMID;
			
			//this is a catalog, so we should store links as attachments
			newItem.attachments.push({
				title: "PubMed entry",
				url: "http://www.ncbi.nlm.nih.gov/pubmed/" + PMID,
				mimeType: "text/html",
				snapshot: false
			});
		}
		
		newItem.callNumber = ZU.xpathText(citation,
			'ArticleIdList/ArticleId[@IdType="bookaccession"]');
		//attach link to the bookshelf page
		if(newItem.callNumber) {
			var url = "http://www.ncbi.nlm.nih.gov/books/" + newItem.callNumber + "/";
			if(PMID) {	//books with PMIDs appear to be hosted at NCBI
				newItem.url = url;
				//book sections have printable views, which can stand in for full text PDFs
				if(newItem.itemType == 'bookSection') {
					newItem.attachments.push({
						title: "Printable HTML",
						url: 'http://www.ncbi.nlm.nih.gov/books/'
							+ newItem.callNumber + '/?report=printable',
						mimeType: 'text/html',
						snapshot: true
					});
				}
			} else {	//currently this should not trigger, since we only import books with PMIDs
				newItem.attachments.push({
					title: "NCBI Bookshelf entry",
					url: "http://www.ncbi.nlm.nih.gov/books/" + newItem.callNumber + "/",
					mimeType: "text/html",
					snapshot: false
				});
			}
		}

		newItem.complete();
	}
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.ncbi.nlm.nih.gov/pubmed/20729678",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"lastName": "Coar",
						"firstName": "Jaekea T"
					},
					{
						"lastName": "Sewell",
						"firstName": "Jeanne P"
					}
				],
				"notes": [],
				"tags": [
					"Bibliography as Topic",
					"Database Management Systems",
					"Humans"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "PubMed entry",
						"mimeType": "text/html",
						"snapshot": false
					}
				],
				"title": "Zotero: harnessing the power of a personal bibliographic manager",
				"pages": "205-207",
				"ISSN": "1538-9855",
				"journalAbbreviation": "Nurse Educ",
				"publicationTitle": "Nurse educator",
				"volume": "35",
				"issue": "5",
				"date": "2010 Sep-Oct",
				"language": "eng",
				"abstractNote": "Zotero is a powerful free personal bibliographic manager (PBM) for writers. Use of a PBM allows the writer to focus on content, rather than the tedious details of formatting citations and references. Zotero 2.0 (http://www.zotero.org) has new features including the ability to synchronize citations with the off-site Zotero server and the ability to collaborate and share with others. An overview on how to use the software and discussion about the strengths and limitations are included.",
				"DOI": "10.1097/NNE.0b013e3181ed81e4",
				"extra": "PMID: 20729678",
				"libraryCatalog": "NCBI PubMed",
				"shortTitle": "Zotero"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.ncbi.nlm.nih.gov/pubmed?term=zotero",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.ncbi.nlm.nih.gov/pubmed/20821847",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"creatorType": "author",
						"lastName": "Nussey",
						"firstName": "Stephen"
					},
					{
						"creatorType": "author",
						"lastName": "Whitehead",
						"firstName": "Saffron"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "PubMed entry",
						"mimeType": "text/html",
						"snapshot": false
					}
				],
				"title": "Endocrinology: An Integrated Approach",
				"date": "2001",
				"place": "Oxford",
				"publisher": "BIOS Scientific Publishers",
				"language": "eng",
				"abstractNote": "Endocrinology has been written to meet the requirements of today's trainee doctors and the demands of an increasing number of degree courses in health and biomedical sciences, and allied subjects. It is a truly integrated text using large numbers of real clinical cases to introduce the basic biochemistry, physiology and pathophysiology underlying endocrine disorders and also the principles of clinical diagnosis and treatment. The increasing importance of the molecular and genetic aspects of endocrinology in relation to clinical medicine is explained.",
				"rights": "Copyright © 2001, BIOS Scientific Publishers Limited",
				"ISBN": "1859962521",
				"extra": "PMID: 20821847",
				"callNumber": "NBK22",
				"url": "http://www.ncbi.nlm.nih.gov/books/NBK22/",
				"libraryCatalog": "NCBI PubMed",
				"accessDate": "CURRENT_TIMESTAMP",
				"shortTitle": "Endocrinology"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.ncbi.nlm.nih.gov/pubmed?term=21249754",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"creatorType": "editor",
						"lastName": "Riegert-Johnson",
						"firstName": "Douglas L"
					},
					{
						"creatorType": "editor",
						"lastName": "Boardman",
						"firstName": "Lisa A"
					},
					{
						"creatorType": "editor",
						"lastName": "Hefferon",
						"firstName": "Timothy"
					},
					{
						"creatorType": "editor",
						"lastName": "Roberts",
						"firstName": "Maegan"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "PubMed entry",
						"mimeType": "text/html",
						"snapshot": false
					}
				],
				"title": "Cancer Syndromes",
				"date": "2009",
				"place": "Bethesda (MD)",
				"publisher": "National Center for Biotechnology Information (US)",
				"language": "eng",
				"abstractNote": "Cancer Syndromes is a comprehensive multimedia resource for selected single gene cancer syndromes. Syndromes currently included are Peutz-Jeghers syndrome, juvenile polyposis, Birt-Hogg-Dubé syndrome, multiple endocrine neoplasia type 1 and familial atypical multiple mole melanoma syndrome. For each syndrome the history, epidemiology, natural history and management are reviewed. If possible the initial report in the literature of each syndrome is included as an appendix. Chapters are extensively annotated with figures and movie clips. Mission Statement: Improving the care of cancer syndrome patients.",
				"rights": "Copyright © 2009-, Douglas L Riegert-Johnson",
				"extra": "PMID: 21249754",
				"callNumber": "NBK1825",
				"url": "http://www.ncbi.nlm.nih.gov/books/NBK1825/",
				"libraryCatalog": "NCBI PubMed",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.ncbi.nlm.nih.gov/pubmed/?term=11109029",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"lastName": "Marks",
						"firstName": "D"
					},
					{
						"lastName": "Wonderling",
						"firstName": "D"
					},
					{
						"lastName": "Thorogood",
						"firstName": "M"
					},
					{
						"lastName": "Lambert",
						"firstName": "H"
					},
					{
						"lastName": "Humphries",
						"firstName": "S E"
					},
					{
						"lastName": "Neil",
						"firstName": "H A"
					}
				],
				"notes": [],
				"tags": [
					"Adult",
					"Aged",
					"Algorithms",
					"Attitude to Health",
					"Child",
					"Cost-Benefit Analysis",
					"Decision Trees",
					"Female",
					"Great Britain",
					"Humans",
					"Hyperlipoproteinemia Type II",
					"Male",
					"Mass Screening",
					"Middle Aged",
					"Models, Econometric",
					"Morbidity",
					"Needs Assessment",
					"Practice Guidelines as Topic",
					"Research Design",
					"Technology Assessment, Biomedical"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "PubMed entry",
						"mimeType": "text/html",
						"snapshot": false
					}
				],
				"title": "Screening for hypercholesterolaemia versus case finding for familial hypercholesterolaemia: a systematic review and cost-effectiveness analysis",
				"pages": "1-123",
				"ISSN": "1366-5278",
				"journalAbbreviation": "Health Technol Assess",
				"publicationTitle": "Health technology assessment (Winchester, England)",
				"volume": "4",
				"issue": "29",
				"date": "2000",
				"language": "eng",
				"abstractNote": "BACKGROUND: In the majority of people with familial hypercholesterolaemia (FH) the disorder is caused by a mutation of the low-density lipoprotein receptor gene that impairs its proper function, resulting in very high levels of plasma cholesterol. Such levels result in early and severe atherosclerosis, and hence substantial excess mortality from coronary heart disease. Most people with FH are undiagnosed or only diagnosed after their first coronary event, but early detection and treatment with hydroxymethylglutaryl-coenzyme (HMG CoA) reductase inhibitors (statins) can reduce morbidity and mortality. The prevalence of FH in the UK population is estimated to be 1 in 500, which means that approximately 110,000 people are affected.\nOBJECTIVES: To evaluate whether screening for FH is appropriate. To determine which system of screening is most acceptable and cost-effective. To assess the deleterious psychosocial effects of genetic and clinical screening for an asymptomatic treatable inherited condition. To assess whether the risks of screening outweigh potential benefits.\nMETHODS: DATA SOURCES: Relevant papers were identified through a search of the electronic databases. Additional papers referenced in the search material were identified and collected. Known researchers in the field were contacted and asked to supply information on unpublished or ongoing studies. INCLUSION/EXCLUSION CRITERIA: SCREENING AND TREATMENT: The review included studies of the mortality and morbidity associated with FH, the effectiveness and cost of treatment (ignoring pre-statin therapies in adults), and of the effectiveness or cost of possible screening strategies for FH. PSYCHOSOCIAL EFFECTS OF SCREENING: The search for papers on the psychological and social effects of screening for a treatable inherited condition was limited to the last 5 years because recent developments in genetic testing have changed the nature and implications of such screening tests. Papers focusing on genetic testing for FH and breast cancer were included. Papers relating to the risk of coronary heart disease with similarly modifiable outcome (non-FH) were also included. DATA EXTRACTION AND ASSESSMENT OF VALIDITY: A data assessment tool was designed to assess the quality and validity of the papers which reported primary data for the social and psychological effects of screening. Available guidelines for systematically reviewing papers concentrated on quantitative methods, and were of limited relevance. An algorithm was developed which could be used for both the qualitative and quantitative literature. MODELLING METHODS: A model was constructed to investigate the relative cost and effectiveness of various forms of population screening (universal or opportunistic) and case-finding screening (screening relatives of known FH cases). All strategies involved a two-stage process: first, identifying those people with cholesterol levels sufficiently elevated to be compatible with a diagnosis of FH, and then either making the diagnosis based on clinical signs and a family history of coronary disease or carrying out genetic tests. Cost-effectiveness has been measured in terms of incremental cost per year of life gained.\nRESULTS: MODELLING COST-EFFECTIVENESS: FH is a life-threatening condition with a long presymptomatic state. Diagnostic tests are reasonably reliable and acceptable, and treatment with statins substantially improves prognosis. Therefore, it is appropriate to consider systematic screening for this condition. Case finding amongst relatives of FH cases was the most cost-effective strategy, and universal systematic screening the least cost-effective. However, when targeted at young people (16 year olds) universal screening was also cost-effective. Screening patients admitted to hospital with premature myocardial infarction was also relatively cost-effective. Screening is least cost-effective in men aged over 35 years, because the gains in life expectancy are small. (ABSTRACT TRUNCA",
				"extra": "PMID: 11109029",
				"libraryCatalog": "NCBI PubMed",
				"shortTitle": "Screening for hypercholesterolaemia versus case finding for familial hypercholesterolaemia"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.ncbi.nlm.nih.gov/pubmed/21249758",
		"items": [
			{
				"itemType": "bookSection",
				"creators": [
					{
						"creatorType": "author",
						"lastName": "Hyer",
						"firstName": "Warren"
					},
					{
						"creatorType": "editor",
						"lastName": "Riegert-Johnson",
						"firstName": "Douglas L"
					},
					{
						"creatorType": "editor",
						"lastName": "Boardman",
						"firstName": "Lisa A"
					},
					{
						"creatorType": "editor",
						"lastName": "Hefferon",
						"firstName": "Timothy"
					},
					{
						"creatorType": "editor",
						"lastName": "Roberts",
						"firstName": "Maegan"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "PubMed entry",
						"mimeType": "text/html",
						"snapshot": false
					},
					{
						"title": "Printable HTML",
						"mimeType": "text/html",
						"snapshot": true
					}
				],
				"place": "Bethesda (MD)",
				"language": "eng",
				"abstractNote": "Pigmentation tends to arise in infancy, occurring around the mouth, nostrils, perianal area, fingers and toes, and the dorsal and volar aspects of hands and feet (Figure 1). They may fade after puberty but tend to persist in the buccal mucosa. The primary concern to the paediatrician is the risk of small bowel intussusception causing intestinal obstruction, vomiting, and pain. In addition, intestinal bleeding leading to anaemia can occur. The management of a young child with mid-gut PJS polyps is controversial. In a retrospective review, 68% of children had undergone a laparotomy for bowel obstruction by the age of 18 years, and many of these proceeded to a second laparotomy within 5 years (1). There is a high re-operation rate after initial laparotomy for small bowel obstruction.",
				"rights": "Copyright © 2009-, Douglas L Riegert-Johnson",
				"extra": "PMID: 21249758",
				"callNumber": "NBK26374",
				"url": "http://www.ncbi.nlm.nih.gov/books/NBK26374/",
				"libraryCatalog": "NCBI PubMed",
				"title": "Implications of Peutz-Jeghers Syndrome in Children and Adolescents",
				"bookTitle": "Cancer Syndromes",
				"date": "2009",
				"publisher": "National Center for Biotechnology Information (US)"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.ncbi.nlm.nih.gov/books/NBK26374/",
		"items": [
			{
				"itemType": "bookSection",
				"creators": [
					{
						"creatorType": "author",
						"lastName": "Hyer",
						"firstName": "Warren"
					},
					{
						"creatorType": "editor",
						"lastName": "Riegert-Johnson",
						"firstName": "Douglas L"
					},
					{
						"creatorType": "editor",
						"lastName": "Boardman",
						"firstName": "Lisa A"
					},
					{
						"creatorType": "editor",
						"lastName": "Hefferon",
						"firstName": "Timothy"
					},
					{
						"creatorType": "editor",
						"lastName": "Roberts",
						"firstName": "Maegan"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "PubMed entry",
						"mimeType": "text/html",
						"snapshot": false
					},
					{
						"title": "Printable HTML",
						"mimeType": "text/html",
						"snapshot": true
					}
				],
				"title": "Implications of Peutz-Jeghers Syndrome in Children and Adolescents",
				"publicationTitle": "Cancer Syndromes",
				"date": "2009",
				"place": "Bethesda (MD)",
				"publisher": "National Center for Biotechnology Information (US)",
				"language": "eng",
				"abstractNote": "Pigmentation tends to arise in infancy, occurring around the mouth, nostrils, perianal area, fingers and toes, and the dorsal and volar aspects of hands and feet (Figure 1). They may fade after puberty but tend to persist in the buccal mucosa. The primary concern to the paediatrician is the risk of small bowel intussusception causing intestinal obstruction, vomiting, and pain. In addition, intestinal bleeding leading to anaemia can occur. The management of a young child with mid-gut PJS polyps is controversial. In a retrospective review, 68% of children had undergone a laparotomy for bowel obstruction by the age of 18 years, and many of these proceeded to a second laparotomy within 5 years (1). There is a high re-operation rate after initial laparotomy for small bowel obstruction.",
				"rights": "Copyright © 2009-, Douglas L Riegert-Johnson",
				"extra": "PMID: 21249758",
				"callNumber": "NBK26374",
				"url": "http://www.ncbi.nlm.nih.gov/books/NBK26374/",
				"libraryCatalog": "NCBI PubMed",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.ncbi.nlm.nih.gov/books/NBK1825/",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"creatorType": "editor",
						"lastName": "Riegert-Johnson",
						"firstName": "Douglas L"
					},
					{
						"creatorType": "editor",
						"lastName": "Boardman",
						"firstName": "Lisa A"
					},
					{
						"creatorType": "editor",
						"lastName": "Hefferon",
						"firstName": "Timothy"
					},
					{
						"creatorType": "editor",
						"lastName": "Roberts",
						"firstName": "Maegan"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "PubMed entry",
						"mimeType": "text/html",
						"snapshot": false
					}
				],
				"title": "Cancer Syndromes",
				"date": "2009",
				"place": "Bethesda (MD)",
				"publisher": "National Center for Biotechnology Information (US)",
				"language": "eng",
				"abstractNote": "Cancer Syndromes is a comprehensive multimedia resource for selected single gene cancer syndromes. Syndromes currently included are Peutz-Jeghers syndrome, juvenile polyposis, Birt-Hogg-Dubé syndrome, multiple endocrine neoplasia type 1 and familial atypical multiple mole melanoma syndrome. For each syndrome the history, epidemiology, natural history and management are reviewed. If possible the initial report in the literature of each syndrome is included as an appendix. Chapters are extensively annotated with figures and movie clips. Mission Statement: Improving the care of cancer syndrome patients.",
				"rights": "Copyright © 2009-, Douglas L Riegert-Johnson",
				"extra": "PMID: 21249754",
				"callNumber": "NBK1825",
				"url": "http://www.ncbi.nlm.nih.gov/books/NBK1825/",
				"libraryCatalog": "NCBI PubMed",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.ncbi.nlm.nih.gov/pubmed/21249755",
		"items": [
			{
				"itemType": "bookSection",
				"creators": [
					{
						"creatorType": "author",
						"lastName": "Riegert-Johnson",
						"firstName": "Douglas"
					},
					{
						"creatorType": "author",
						"lastName": "Gleeson",
						"firstName": "Ferga C."
					},
					{
						"creatorType": "author",
						"lastName": "Westra",
						"firstName": "Wytske"
					},
					{
						"creatorType": "author",
						"lastName": "Hefferon",
						"firstName": "Timothy"
					},
					{
						"creatorType": "author",
						"lastName": "Wong Kee Song",
						"firstName": "Louis M."
					},
					{
						"creatorType": "author",
						"lastName": "Spurck",
						"firstName": "Lauren"
					},
					{
						"creatorType": "author",
						"lastName": "Boardman",
						"firstName": "Lisa A."
					},
					{
						"creatorType": "editor",
						"lastName": "Riegert-Johnson",
						"firstName": "Douglas L"
					},
					{
						"creatorType": "editor",
						"lastName": "Boardman",
						"firstName": "Lisa A"
					},
					{
						"creatorType": "editor",
						"lastName": "Hefferon",
						"firstName": "Timothy"
					},
					{
						"creatorType": "editor",
						"lastName": "Roberts",
						"firstName": "Maegan"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "PubMed entry",
						"mimeType": "text/html",
						"snapshot": false
					},
					{
						"title": "Printable HTML",
						"mimeType": "text/html",
						"snapshot": true
					}
				],
				"place": "Bethesda (MD)",
				"language": "eng",
				"abstractNote": "PJS is a rare disease. (“Peutz-Jeghers syndrome is no frequent nosological unit”. (1)) There are no high-quality estimates of the prevalence or incidence of PJS. Estimates have included 1 in 8,500 to 23,000 live births (2), 1 in 50,000 to 1 in 100,000 in Finland (3), and 1 in 200,000 (4). A report on the incidence of PJS is available at www.peutz-jeghers.com. At Mayo Clinic from 1945 to 1996 the incidence of PJS was 0.9 PJS patients per 100,000 patients. PJS has been reported in Western Europeans (5), African Americans (5), Nigerians (6), Japanese (7), Chinese (8, 9), Indians (10, 11), and other populations (12-15). PJS occurs equally in males and females (7).",
				"rights": "Copyright © 2009-, Douglas L Riegert-Johnson",
				"extra": "PMID: 21249755",
				"callNumber": "NBK1826",
				"url": "http://www.ncbi.nlm.nih.gov/books/NBK1826/",
				"libraryCatalog": "NCBI PubMed",
				"title": "Peutz-Jeghers Syndrome",
				"bookTitle": "Cancer Syndromes",
				"date": "2009",
				"publisher": "National Center for Biotechnology Information (US)"
			}
		]
	}
]
/** END TEST CASES **/