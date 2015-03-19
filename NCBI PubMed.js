{
	"translatorID": "fcf41bed-0cbc-3704-85c7-8062a0068a7a",
	"label": "NCBI PubMed",
	"creator": "Simon Kornblith, Michael Berkowitz, Avram Lyon, and Rintze Zelle",
	"target": "xml",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 1,
	"browserSupport": "gcsibv",
	"lastUpdated": "2015-03-19 19:21:46"
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
				var creator = ZU.cleanAuthor(lastName + ', ' + firstName, type, true);
				if(creator.lastName.toUpperCase() == creator.lastName) {
					creator.lastName = ZU.capitalizeTitle(creator.lastName, true);
				}
				if(creator.firstName.toUpperCase() == creator.firstName) {
					creator.firstName = ZU.capitalizeTitle(creator.firstName, true);
				}
				newItem.creators.push(creator);
			} else if(lastName = ZU.xpathText(author, 'CollectiveName')) {
				//corporate author
				newItem.creators.push({
					creatorType: type,
					lastName: lastName,
					fieldMode: 1
				});
			}
		}
	}
}

function doImportFromText(text, next) {
	if (text.length<300){
		throw("No Pubmed Data found - Most likely eutils is temporarily down")
	}
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
				title = ZU.trimInternal(title);
				// Fix sentence-cased titles, but be careful...
				if(!( // of accronyms that could get messed up if we fix case
					/\b[A-Z]{2}/.test(title) // this could mean that there's an accronym in the title
					&& (title.toUpperCase() != title // the whole title isn't in upper case, so bail
						|| !(/\s/.test(title))) // it's all in upper case and there's only one word, so we can't be sure
				)) {
					title = ZU.capitalizeTitle(title, true);
				}
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

		var authorLists = ZU.xpath(article, 'AuthorList');
		processAuthors(newItem, authorLists);
		
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
		var PMCID = ZU.xpathText(articles[i], 'PubmedData/ArticleIdList/ArticleId[@IdType="pmc"]');
		if(PMID) {
			newItem.extra = "PMID: "+PMID;
			if (PMCID) newItem.extra += " \nPMCID: " + PMCID;
			//this is a catalog, so we should store links as attachments
			newItem.attachments.push({
				title: "PubMed entry",
				url: "http://www.ncbi.nlm.nih.gov/pubmed/" + PMID,
				mimeType: "text/html",
				snapshot: false
			});
		}
		else if (PMCID) newItem.extra += "PMCID: " + PMCID;
		
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
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "import",
		"input": "<?xml version=\"1.0\"?>\n<!DOCTYPE PubmedArticleSet PUBLIC \"-//NLM//DTD PubMedArticle, 1st January 2015//EN\" \"http://www.ncbi.nlm.nih.gov/corehtml/query/DTD/pubmed_150101.dtd\">\n<PubmedArticleSet>\n<PubmedArticle>\n    <MedlineCitation Owner=\"NLM\" Status=\"MEDLINE\">\n        <PMID Version=\"1\">20729678</PMID>\n        <DateCreated>\n            <Year>2010</Year>\n            <Month>08</Month>\n            <Day>23</Day>\n        </DateCreated>\n        <DateCompleted>\n            <Year>2010</Year>\n            <Month>12</Month>\n            <Day>21</Day>\n        </DateCompleted>\n        <Article PubModel=\"Print\">\n            <Journal>\n                <ISSN IssnType=\"Electronic\">1538-9855</ISSN>\n                <JournalIssue CitedMedium=\"Internet\">\n                    <Volume>35</Volume>\n                    <Issue>5</Issue>\n                    <PubDate>\n                        <MedlineDate>2010 Sep-Oct</MedlineDate>\n                    </PubDate>\n                </JournalIssue>\n                <Title>Nurse educator</Title>\n                <ISOAbbreviation>Nurse Educ</ISOAbbreviation>\n            </Journal>\n            <ArticleTitle>Zotero: harnessing the power of a personal bibliographic manager.</ArticleTitle>\n            <Pagination>\n                <MedlinePgn>205-7</MedlinePgn>\n            </Pagination>\n            <ELocationID EIdType=\"doi\" ValidYN=\"Y\">10.1097/NNE.0b013e3181ed81e4</ELocationID>\n            <Abstract>\n                <AbstractText>Zotero is a powerful free personal bibliographic manager (PBM) for writers. Use of a PBM allows the writer to focus on content, rather than the tedious details of formatting citations and references. Zotero 2.0 (http://www.zotero.org) has new features including the ability to synchronize citations with the off-site Zotero server and the ability to collaborate and share with others. An overview on how to use the software and discussion about the strengths and limitations are included.</AbstractText>\n            </Abstract>\n            <AuthorList CompleteYN=\"Y\">\n                <Author ValidYN=\"Y\">\n                    <LastName>Coar</LastName>\n                    <ForeName>Jaekea T</ForeName>\n                    <Initials>JT</Initials>\n                    <AffiliationInfo>\n                        <Affiliation>School of Nursing, Georgia College &amp; State University, Milledgeville, Georgia 61061, USA.</Affiliation>\n                    </AffiliationInfo>\n                </Author>\n                <Author ValidYN=\"Y\">\n                    <LastName>Sewell</LastName>\n                    <ForeName>Jeanne P</ForeName>\n                    <Initials>JP</Initials>\n                </Author>\n            </AuthorList>\n            <Language>eng</Language>\n            <PublicationTypeList>\n                <PublicationType UI=\"D016428\">Journal Article</PublicationType>\n            </PublicationTypeList>\n        </Article>\n        <MedlineJournalInfo>\n            <Country>United States</Country>\n            <MedlineTA>Nurse Educ</MedlineTA>\n            <NlmUniqueID>7701902</NlmUniqueID>\n            <ISSNLinking>0363-3624</ISSNLinking>\n        </MedlineJournalInfo>\n        <CitationSubset>N</CitationSubset>\n        <MeshHeadingList>\n            <MeshHeading>\n                <DescriptorName MajorTopicYN=\"Y\" UI=\"D001634\">Bibliography as Topic</DescriptorName>\n            </MeshHeading>\n            <MeshHeading>\n                <DescriptorName MajorTopicYN=\"Y\" UI=\"D003628\">Database Management Systems</DescriptorName>\n            </MeshHeading>\n            <MeshHeading>\n                <DescriptorName MajorTopicYN=\"N\" UI=\"D006801\">Humans</DescriptorName>\n            </MeshHeading>\n        </MeshHeadingList>\n    </MedlineCitation>\n    <PubmedData>\n        <History>\n            <PubMedPubDate PubStatus=\"entrez\">\n                <Year>2010</Year>\n                <Month>8</Month>\n                <Day>24</Day>\n                <Hour>6</Hour>\n                <Minute>0</Minute>\n            </PubMedPubDate>\n            <PubMedPubDate PubStatus=\"pubmed\">\n                <Year>2010</Year>\n                <Month>8</Month>\n                <Day>24</Day>\n                <Hour>6</Hour>\n                <Minute>0</Minute>\n            </PubMedPubDate>\n            <PubMedPubDate PubStatus=\"medline\">\n                <Year>2010</Year>\n                <Month>12</Month>\n                <Day>22</Day>\n                <Hour>6</Hour>\n                <Minute>0</Minute>\n            </PubMedPubDate>\n        </History>\n        <PublicationStatus>ppublish</PublicationStatus>\n        <ArticleIdList>\n            <ArticleId IdType=\"doi\">10.1097/NNE.0b013e3181ed81e4</ArticleId>\n            <ArticleId IdType=\"pii\">00006223-201009000-00011</ArticleId>\n            <ArticleId IdType=\"pubmed\">20729678</ArticleId>\n        </ArticleIdList>\n    </PubmedData>\n</PubmedArticle>\n\n</PubmedArticleSet>\n",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Zotero: harnessing the power of a personal bibliographic manager",
				"creators": [
					{
						"firstName": "Jaekea T.",
						"lastName": "Coar",
						"creatorType": "author"
					},
					{
						"firstName": "Jeanne P.",
						"lastName": "Sewell",
						"creatorType": "author"
					}
				],
				"date": "2010 Sep-Oct",
				"DOI": "10.1097/NNE.0b013e3181ed81e4",
				"ISSN": "1538-9855",
				"abstractNote": "Zotero is a powerful free personal bibliographic manager (PBM) for writers. Use of a PBM allows the writer to focus on content, rather than the tedious details of formatting citations and references. Zotero 2.0 (http://www.zotero.org) has new features including the ability to synchronize citations with the off-site Zotero server and the ability to collaborate and share with others. An overview on how to use the software and discussion about the strengths and limitations are included.",
				"extra": "PMID: 20729678",
				"issue": "5",
				"journalAbbreviation": "Nurse Educ",
				"language": "eng",
				"pages": "205-207",
				"publicationTitle": "Nurse Educator",
				"volume": "35",
				"attachments": [
					{
						"title": "PubMed entry",
						"mimeType": "text/html",
						"snapshot": false
					}
				],
				"tags": [
					"Bibliography as Topic",
					"Database Management Systems",
					"Humans"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/