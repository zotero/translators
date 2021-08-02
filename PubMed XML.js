{
	"translatorID": "fcf41bed-0cbc-3704-85c7-8062a0068a7a",
	"label": "PubMed XML",
	"creator": "Simon Kornblith, Michael Berkowitz, Avram Lyon, and Rintze Zelle",
	"target": "xml",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 100,
	"configOptions": {
		"dataMode": "xml/dom"
	},
	"inRepository": true,
	"translatorType": 1,
	"lastUpdated": "2021-07-21 03:05:39"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2017-2020 Simon Kornblith, Michael Berkowitz, Avram Lyon, Sebastian Karcher, and Rintze Zelle

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

/*******************************
 * Import translator functions *
 *******************************/

function detectImport() {
	var text = Zotero.read(1000);
	return text.includes("<PubmedArticleSet>");
}

function processAuthors(newItem, authorsLists) {
	for (var j = 0, m = authorsLists.length; j < m; j++) {
		// default to 'author' unless it's 'editor'
		var type = "author";
		if (authorsLists[j].hasAttribute('Type')
			&& authorsLists[j].getAttribute('Type') === "editors") {
			type = "editor";
		}

		var authors = ZU.xpath(authorsLists[j], 'Author');

		for (var k = 0, l = authors.length; k < l; k++) {
			var author = authors[k];
			var lastName = ZU.xpathText(author, 'LastName');
			var firstName = ZU.xpathText(author, 'FirstName');
			if (!firstName) {
				firstName = ZU.xpathText(author, 'ForeName');
			}

			var suffix = ZU.xpathText(author, 'Suffix');
			if (suffix && firstName) {
				firstName += ", " + suffix;
			}

			if (firstName || lastName) {
				var creator = ZU.cleanAuthor(lastName + ', ' + firstName, type, true);
				if (creator.lastName.toUpperCase() == creator.lastName) {
					creator.lastName = ZU.capitalizeTitle(creator.lastName, true);
				}
				if (creator.firstName.toUpperCase() == creator.firstName) {
					creator.firstName = ZU.capitalizeTitle(creator.firstName, true);
				}
				newItem.creators.push(creator);
			}
			else if ((lastName = ZU.xpathText(author, 'CollectiveName'))) {
				// corporate author
				newItem.creators.push({
					creatorType: type,
					lastName: lastName,
					fieldMode: 1
				});
			}
		}
	}
}

function doImport() {
	var doc = Zotero.getXML();

	var pageRangeRE = /(\d+)-(\d+)/g;

	// handle journal articles
	var articles = ZU.xpath(doc, '/PubmedArticleSet/PubmedArticle');
	for (let i = 0, n = articles.length; i < n; i++) {
		var newItem = new Zotero.Item("journalArticle");

		var citation = ZU.xpath(articles[i], 'MedlineCitation')[0];

		var article = ZU.xpath(citation, 'Article')[0];

		let title = ZU.xpathText(article, 'ArticleTitle');
		if (!title) title = ZU.xpathText(article, 'VernacularTitle');
		if (title) {
			if (title.charAt(title.length - 1) == ".") {
				title = title.substring(0, title.length - 1);
			}
			newItem.title = title;
		}

		var fullPageRange = ZU.xpathText(article, 'Pagination/MedlinePgn');
		if (fullPageRange) {
			// where page ranges are given in an abbreviated format, convert to full
			pageRangeRE.lastIndex = 0;
			var range;
			while ((range = pageRangeRE.exec(fullPageRange))) {
				var pageRangeStart = range[1];
				var pageRangeEnd = range[2];
				var diff = pageRangeStart.length - pageRangeEnd.length;
				if (diff > 0) {
					pageRangeEnd = pageRangeStart.substring(0, diff) + pageRangeEnd;
					var newRange = pageRangeStart + "-" + pageRangeEnd;
					fullPageRange = fullPageRange.substring(0, range.index) // everything before current range
						+ newRange	// insert the new range
						+ fullPageRange.substring(range.index + range[0].length);	// everything after the old range
					// adjust RE index
					pageRangeRE.lastIndex += newRange.length - range[0].length;
				}
			}
			newItem.pages = fullPageRange;
		}
		// use elocation pii when there's no page range
		if (!newItem.pages) {
			newItem.pages = ZU.xpathText(article, 'ELocationID[@EIdType="pii"]');
		}

		var journal = ZU.xpath(article, 'Journal')[0];
		if (journal) {
			newItem.ISSN = ZU.xpathText(journal, 'ISSN');

			var abbreviation;
			if ((abbreviation = ZU.xpathText(journal, 'ISOAbbreviation'))) {
				newItem.journalAbbreviation = abbreviation;
			}
			else if ((abbreviation = ZU.xpathText(article, '//MedlineTA'))) {
				newItem.journalAbbreviation = abbreviation;
			}

			let title = ZU.xpathText(journal, 'Title');
			if (title) {
				title = ZU.trimInternal(title);
				// Fix sentence-cased titles, but be careful...
				if (!( // of accronyms that could get messed up if we fix case
					/\b[A-Z]{2}/.test(title) // this could mean that there's an accronym in the title
					&& (title.toUpperCase() != title // the whole title isn't in upper case, so bail
						|| !(/\s/.test(title))) // it's all in upper case and there's only one word, so we can't be sure
				)) {
					title = ZU.capitalizeTitle(title, true);
				}
				newItem.publicationTitle = title;
			}
			else if (newItem.journalAbbreviation) {
				newItem.publicationTitle = newItem.journalAbbreviation;
			}
			// (do we want this?)
			if (newItem.publicationTitle) {
				newItem.publicationTitle = ZU.capitalizeTitle(newItem.publicationTitle);
			}

			var journalIssue = ZU.xpath(journal, 'JournalIssue')[0];
			if (journalIssue) {
				newItem.volume = ZU.xpathText(journalIssue, 'Volume');
				newItem.issue = ZU.xpathText(journalIssue, 'Issue');
				var pubDate = ZU.xpath(journalIssue, 'PubDate')[0];
				if (pubDate) {	// try to get the date
					var day = ZU.xpathText(pubDate, 'Day');
					var month = ZU.xpathText(pubDate, 'Month');
					var year = ZU.xpathText(pubDate, 'Year');

					if (day) {
						// month appears in two different formats:
						// 1. numeric, e.g. "07", see 4th test
						if (month && /\d+/.test(month)) {
							newItem.date = ZU.strToISO(year + "-" + month + "-" + day);
						}
						// 2. English acronym, e.g. "Aug", see 3rd test
						else {
							newItem.date = ZU.strToISO(month + " " + day + ", " + year);
						}
					}
					else if (month) {
						newItem.date = ZU.strToISO(month + "/" + year);
					}
					else if (year) {
						newItem.date = year;
					}
					else {
						newItem.date = ZU.xpathText(pubDate, 'MedlineDate');
					}
				}
			}
		}

		var authorLists = ZU.xpath(article, 'AuthorList');
		processAuthors(newItem, authorLists);

		newItem.language = ZU.xpathText(article, 'Language');

		var keywords = ZU.xpath(citation, 'MeshHeadingList/MeshHeading');
		for (let j = 0, m = keywords.length; j < m; j++) {
			newItem.tags.push(ZU.xpathText(keywords[j], 'DescriptorName'));
		}
		// OT Terms
		var otherKeywords = ZU.xpath(citation, 'KeywordList/Keyword');
		for (let j = 0, m = otherKeywords.length; j < m; j++) {
			newItem.tags.push(otherKeywords[j].textContent);
		}
		var abstractSections = ZU.xpath(article, 'Abstract/AbstractText');
		var abstractNote = [];
		for (let j = 0, m = abstractSections.length; j < m; j++) {
			var abstractSection = abstractSections[j];
			var paragraph = abstractSection.textContent.trim();
			if (paragraph) paragraph += '\n';

			var label = abstractSection.hasAttribute("Label") && abstractSection.getAttribute("Label");
			if (label && label != "UNLABELLED") {
				paragraph = label + ": " + paragraph;
			}
			abstractNote.push(paragraph);
		}
		newItem.abstractNote = abstractNote.join('');

		newItem.DOI = ZU.xpathText(articles[i], 'PubmedData/ArticleIdList/ArticleId[@IdType="doi"]');

		var PMID = ZU.xpathText(citation, 'PMID');
		var PMCID = ZU.xpathText(articles[i], 'PubmedData/ArticleIdList/ArticleId[@IdType="pmc"]');
		if (PMID) {
			newItem.extra = "PMID: " + PMID;
			// this is a catalog, so we should store links as attachments
			newItem.attachments.push({
				title: "PubMed entry",
				url: "http://www.ncbi.nlm.nih.gov/pubmed/" + PMID,
				mimeType: "text/html",
				snapshot: false
			});
		}

		if (PMCID) {
			newItem.extra = (newItem.extra ? newItem.extra + "\n" : "")
				+ "PMCID: " + PMCID;
		}

		newItem.complete();
	}

	// handle books and chapters
	var books = ZU.xpath(doc, '/PubmedArticleSet/PubmedBookArticle');
	for (let i = 0, n = books.length; i < n; i++) {
		let citation = ZU.xpath(books[i], 'BookDocument')[0];

		// check if this is a section
		var sectionTitle = ZU.xpathText(citation, 'ArticleTitle');
		var isBookSection = !!sectionTitle;
		// eslint-disable-next-line
		var newItem = new Zotero.Item(isBookSection ? 'bookSection' : 'book');

		if (isBookSection) {
			newItem.title = sectionTitle;
		}

		var book = ZU.xpath(citation, 'Book')[0];

		// title
		let title = ZU.xpathText(book, 'BookTitle');
		if (title) {
			if (title.charAt(title.length - 1) == ".") {
				title = title.substring(0, title.length - 1);
			}
			if (isBookSection) {
				newItem.publicationTitle = title;
			}
			else {
				newItem.title = title;
			}
		}

		// date
		// should only need year for books
		newItem.date = ZU.xpathText(book, 'PubDate/Year');

		// edition
		newItem.edition = ZU.xpathText(book, 'Edition');

		// series
		newItem.series = ZU.xpathText(book, 'CollectionTitle');

		// volume
		newItem.volume = ZU.xpathText(book, 'Volume');

		// place
		newItem.place = ZU.xpathText(book, 'Publisher/PublisherLocation');

		// publisher
		newItem.publisher = ZU.xpathText(book, 'Publisher/PublisherName');

		// chapter authors
		if (isBookSection) {
			let authorsLists = ZU.xpath(citation, 'AuthorList');
			processAuthors(newItem, authorsLists);
		}

		// book creators
		let authorsLists = ZU.xpath(book, 'AuthorList');
		processAuthors(newItem, authorsLists);

		// language
		newItem.language = ZU.xpathText(citation, 'Language');

		// abstractNote
		newItem.abstractNote = ZU.xpathText(citation, 'Abstract/AbstractText');

		// rights
		newItem.rights = ZU.xpathText(citation, 'Abstract/CopyrightInformation');

		// seriesNumber, numPages, numberOfVolumes
		// not available

		// ISBN
		newItem.ISBN = ZU.xpathText(book, 'Isbn');

		let PMID = ZU.xpathText(citation, 'PMID');
		if (PMID) {
			newItem.extra = "PMID: " + PMID;

			// this is a catalog, so we should store links as attachments
			newItem.attachments.push({
				title: "PubMed entry",
				url: "http://www.ncbi.nlm.nih.gov/pubmed/" + PMID,
				mimeType: "text/html",
				snapshot: false
			});
		}

		newItem.callNumber = ZU.xpathText(citation,
			'ArticleIdList/ArticleId[@IdType="bookaccession"]');
		// attach link to the bookshelf page
		if (newItem.callNumber) {
			var url = "http://www.ncbi.nlm.nih.gov/books/" + newItem.callNumber + "/";
			if (PMID) {	// books with PMIDs appear to be hosted at NCBI
				newItem.url = url;
				// book sections have printable views, which can stand in for full text PDFs
				if (newItem.itemType == 'bookSection') {
					newItem.attachments.push({
						title: "Printable HTML",
						url: 'http://www.ncbi.nlm.nih.gov/books/'
							+ newItem.callNumber + '/?report=printable',
						mimeType: 'text/html',
						snapshot: true
					});
				}
			}
			else {	// currently this should not trigger, since we only import books with PMIDs
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
		"input": "<?xml version=\"1.0\"?>\n<!DOCTYPE PubmedArticleSet PUBLIC \"-//NLM//DTD PubMedArticle, 1st January 2015//EN\" \"http://www.ncbi.nlm.nih.gov/corehtml/query/DTD/pubmed_150101.dtd\">\n<PubmedArticleSet>\n<PubmedArticle>\n    <MedlineCitation Owner=\"NLM\" Status=\"MEDLINE\">\n        <PMID Version=\"1\">18157122</PMID>\n        <DateCreated>\n            <Year>2008</Year>\n            <Month>01</Month>\n            <Day>18</Day>\n        </DateCreated>\n        <DateCompleted>\n            <Year>2008</Year>\n            <Month>02</Month>\n            <Day>08</Day>\n        </DateCompleted>\n        <DateRevised>\n            <Year>2014</Year>\n            <Month>07</Month>\n            <Day>25</Day>\n        </DateRevised>\n        <Article PubModel=\"Print-Electronic\">\n            <Journal>\n                <ISSN IssnType=\"Electronic\">1552-4469</ISSN>\n                <JournalIssue CitedMedium=\"Internet\">\n                    <Volume>4</Volume>\n                    <Issue>2</Issue>\n                    <PubDate>\n                        <Year>2008</Year>\n                        <Month>Feb</Month>\n                    </PubDate>\n                </JournalIssue>\n                <Title>Nature chemical biology</Title>\n                <ISOAbbreviation>Nat. Chem. Biol.</ISOAbbreviation>\n            </Journal>\n            <ArticleTitle>High-content single-cell drug screening with phosphospecific flow cytometry.</ArticleTitle>\n            <Pagination>\n                <MedlinePgn>132-42</MedlinePgn>\n            </Pagination>\n            <Abstract>\n                <AbstractText>Drug screening is often limited to cell-free assays involving purified enzymes, but it is arguably best applied against systems that represent disease states or complex physiological cellular networks. Here, we describe a high-content, cell-based drug discovery platform based on phosphospecific flow cytometry, or phosphoflow, that enabled screening for inhibitors against multiple endogenous kinase signaling pathways in heterogeneous primary cell populations at the single-cell level. From a library of small-molecule natural products, we identified pathway-selective inhibitors of Jak-Stat and MAP kinase signaling. Dose-response experiments in primary cells confirmed pathway selectivity, but importantly also revealed differential inhibition of cell types and new druggability trends across multiple compounds. Lead compound selectivity was confirmed in vivo in mice. Phosphoflow therefore provides a unique platform that can be applied throughout the drug discovery process, from early compound screening to in vivo testing and clinical monitoring of drug efficacy.</AbstractText>\n            </Abstract>\n            <AuthorList CompleteYN=\"Y\">\n                <Author ValidYN=\"Y\">\n                    <LastName>Krutzik</LastName>\n                    <ForeName>Peter O</ForeName>\n                    <Initials>PO</Initials>\n                    <AffiliationInfo>\n                        <Affiliation>Department of Microbiology and Immunology, Baxter Laboratory in Genetic Pharmacology, Stanford University, 269 Campus Drive, Stanford, California 94305, USA.</Affiliation>\n                    </AffiliationInfo>\n                </Author>\n                <Author ValidYN=\"Y\">\n                    <LastName>Crane</LastName>\n                    <ForeName>Janelle M</ForeName>\n                    <Initials>JM</Initials>\n                </Author>\n                <Author ValidYN=\"Y\">\n                    <LastName>Clutter</LastName>\n                    <ForeName>Matthew R</ForeName>\n                    <Initials>MR</Initials>\n                </Author>\n                <Author ValidYN=\"Y\">\n                    <LastName>Nolan</LastName>\n                    <ForeName>Garry P</ForeName>\n                    <Initials>GP</Initials>\n                </Author>\n            </AuthorList>\n            <Language>eng</Language>\n            <DataBankList CompleteYN=\"Y\">\n                <DataBank>\n                    <DataBankName>PubChem-Substance</DataBankName>\n                    <AccessionNumberList>\n                        <AccessionNumber>46391334</AccessionNumber>\n                        <AccessionNumber>46391335</AccessionNumber>\n                        <AccessionNumber>46391336</AccessionNumber>\n                        <AccessionNumber>46391337</AccessionNumber>\n                        <AccessionNumber>46391338</AccessionNumber>\n                        <AccessionNumber>46391339</AccessionNumber>\n                        <AccessionNumber>46391340</AccessionNumber>\n                        <AccessionNumber>46391341</AccessionNumber>\n                        <AccessionNumber>46391342</AccessionNumber>\n                        <AccessionNumber>46391343</AccessionNumber>\n                        <AccessionNumber>46391344</AccessionNumber>\n                        <AccessionNumber>46391345</AccessionNumber>\n                        <AccessionNumber>46391346</AccessionNumber>\n                        <AccessionNumber>46391347</AccessionNumber>\n                        <AccessionNumber>46391348</AccessionNumber>\n                        <AccessionNumber>46391349</AccessionNumber>\n                        <AccessionNumber>46391350</AccessionNumber>\n                        <AccessionNumber>46391351</AccessionNumber>\n                        <AccessionNumber>46391352</AccessionNumber>\n                        <AccessionNumber>46391353</AccessionNumber>\n                        <AccessionNumber>46391354</AccessionNumber>\n                        <AccessionNumber>46391355</AccessionNumber>\n                        <AccessionNumber>46391356</AccessionNumber>\n                        <AccessionNumber>46391357</AccessionNumber>\n                    </AccessionNumberList>\n                </DataBank>\n            </DataBankList>\n            <GrantList CompleteYN=\"Y\">\n                <Grant>\n                    <GrantID>AI35304</GrantID>\n                    <Acronym>AI</Acronym>\n                    <Agency>NIAID NIH HHS</Agency>\n                    <Country>United States</Country>\n                </Grant>\n                <Grant>\n                    <GrantID>N01-HV-28183</GrantID>\n                    <Acronym>HV</Acronym>\n                    <Agency>NHLBI NIH HHS</Agency>\n                    <Country>United States</Country>\n                </Grant>\n                <Grant>\n                    <GrantID>T32 AI007290</GrantID>\n                    <Acronym>AI</Acronym>\n                    <Agency>NIAID NIH HHS</Agency>\n                    <Country>United States</Country>\n                </Grant>\n            </GrantList>\n            <PublicationTypeList>\n                <PublicationType UI=\"D016428\">Journal Article</PublicationType>\n                <PublicationType UI=\"D052061\">Research Support, N.I.H., Extramural</PublicationType>\n                <PublicationType UI=\"D013485\">Research Support, Non-U.S. Gov't</PublicationType>\n            </PublicationTypeList>\n            <ArticleDate DateType=\"Electronic\">\n                <Year>2007</Year>\n                <Month>12</Month>\n                <Day>23</Day>\n            </ArticleDate>\n        </Article>\n        <MedlineJournalInfo>\n            <Country>United States</Country>\n            <MedlineTA>Nat Chem Biol</MedlineTA>\n            <NlmUniqueID>101231976</NlmUniqueID>\n            <ISSNLinking>1552-4450</ISSNLinking>\n        </MedlineJournalInfo>\n        <ChemicalList>\n            <Chemical>\n                <RegistryNumber>0</RegistryNumber>\n                <NameOfSubstance UI=\"D050791\">STAT Transcription Factors</NameOfSubstance>\n            </Chemical>\n            <Chemical>\n                <RegistryNumber>27YLU75U4W</RegistryNumber>\n                <NameOfSubstance UI=\"D010758\">Phosphorus</NameOfSubstance>\n            </Chemical>\n            <Chemical>\n                <RegistryNumber>EC 2.7.10.2</RegistryNumber>\n                <NameOfSubstance UI=\"D053612\">Janus Kinases</NameOfSubstance>\n            </Chemical>\n            <Chemical>\n                <RegistryNumber>EC 2.7.11.24</RegistryNumber>\n                <NameOfSubstance UI=\"D020928\">Mitogen-Activated Protein Kinases</NameOfSubstance>\n            </Chemical>\n        </ChemicalList>\n        <CitationSubset>IM</CitationSubset>\n        <MeshHeadingList>\n            <MeshHeading>\n                <DescriptorName MajorTopicYN=\"N\" UI=\"D000818\">Animals</DescriptorName>\n            </MeshHeading>\n            <MeshHeading>\n                <DescriptorName MajorTopicYN=\"N\" UI=\"D045744\">Cell Line, Tumor</DescriptorName>\n            </MeshHeading>\n            <MeshHeading>\n                <DescriptorName MajorTopicYN=\"N\" UI=\"D004353\">Drug Evaluation, Preclinical</DescriptorName>\n            </MeshHeading>\n            <MeshHeading>\n                <DescriptorName MajorTopicYN=\"N\" UI=\"D005434\">Flow Cytometry</DescriptorName>\n                <QualifierName MajorTopicYN=\"Y\" UI=\"Q000379\">methods</QualifierName>\n            </MeshHeading>\n            <MeshHeading>\n                <DescriptorName MajorTopicYN=\"N\" UI=\"D006801\">Humans</DescriptorName>\n            </MeshHeading>\n            <MeshHeading>\n                <DescriptorName MajorTopicYN=\"N\" UI=\"D053612\">Janus Kinases</DescriptorName>\n                <QualifierName MajorTopicYN=\"N\" UI=\"Q000378\">metabolism</QualifierName>\n            </MeshHeading>\n            <MeshHeading>\n                <DescriptorName MajorTopicYN=\"N\" UI=\"D051379\">Mice</DescriptorName>\n            </MeshHeading>\n            <MeshHeading>\n                <DescriptorName MajorTopicYN=\"N\" UI=\"D008807\">Mice, Inbred BALB C</DescriptorName>\n            </MeshHeading>\n            <MeshHeading>\n                <DescriptorName MajorTopicYN=\"N\" UI=\"D020928\">Mitogen-Activated Protein Kinases</DescriptorName>\n                <QualifierName MajorTopicYN=\"N\" UI=\"Q000378\">metabolism</QualifierName>\n            </MeshHeading>\n            <MeshHeading>\n                <DescriptorName MajorTopicYN=\"N\" UI=\"D010758\">Phosphorus</DescriptorName>\n                <QualifierName MajorTopicYN=\"Y\" UI=\"Q000032\">analysis</QualifierName>\n            </MeshHeading>\n            <MeshHeading>\n                <DescriptorName MajorTopicYN=\"N\" UI=\"D050791\">STAT Transcription Factors</DescriptorName>\n                <QualifierName MajorTopicYN=\"N\" UI=\"Q000378\">metabolism</QualifierName>\n            </MeshHeading>\n            <MeshHeading>\n                <DescriptorName MajorTopicYN=\"N\" UI=\"D012680\">Sensitivity and Specificity</DescriptorName>\n            </MeshHeading>\n            <MeshHeading>\n                <DescriptorName MajorTopicYN=\"N\" UI=\"D015398\">Signal Transduction</DescriptorName>\n            </MeshHeading>\n        </MeshHeadingList>\n    </MedlineCitation>\n    <PubmedData>\n        <History>\n            <PubMedPubDate PubStatus=\"received\">\n                <Year>2007</Year>\n                <Month>6</Month>\n                <Day>15</Day>\n            </PubMedPubDate>\n            <PubMedPubDate PubStatus=\"accepted\">\n                <Year>2007</Year>\n                <Month>10</Month>\n                <Day>30</Day>\n            </PubMedPubDate>\n            <PubMedPubDate PubStatus=\"aheadofprint\">\n                <Year>2007</Year>\n                <Month>12</Month>\n                <Day>23</Day>\n            </PubMedPubDate>\n            <PubMedPubDate PubStatus=\"pubmed\">\n                <Year>2007</Year>\n                <Month>12</Month>\n                <Day>25</Day>\n                <Hour>9</Hour>\n                <Minute>0</Minute>\n            </PubMedPubDate>\n            <PubMedPubDate PubStatus=\"medline\">\n                <Year>2008</Year>\n                <Month>2</Month>\n                <Day>9</Day>\n                <Hour>9</Hour>\n                <Minute>0</Minute>\n            </PubMedPubDate>\n            <PubMedPubDate PubStatus=\"entrez\">\n                <Year>2007</Year>\n                <Month>12</Month>\n                <Day>25</Day>\n                <Hour>9</Hour>\n                <Minute>0</Minute>\n            </PubMedPubDate>\n        </History>\n        <PublicationStatus>ppublish</PublicationStatus>\n        <ArticleIdList>\n            <ArticleId IdType=\"pii\">nchembio.2007.59</ArticleId>\n            <ArticleId IdType=\"doi\">10.1038/nchembio.2007.59</ArticleId>\n            <ArticleId IdType=\"pubmed\">18157122</ArticleId>\n        </ArticleIdList>\n    </PubmedData>\n</PubmedArticle>\n<PubmedArticle>\n    <MedlineCitation Owner=\"NLM\" Status=\"MEDLINE\">\n        <PMID Version=\"1\">18157123</PMID>\n        <DateCreated>\n            <Year>2008</Year>\n            <Month>01</Month>\n            <Day>18</Day>\n        </DateCreated>\n        <DateCompleted>\n            <Year>2008</Year>\n            <Month>02</Month>\n            <Day>08</Day>\n        </DateCompleted>\n        <DateRevised>\n            <Year>2013</Year>\n            <Month>11</Month>\n            <Day>21</Day>\n        </DateRevised>\n        <Article PubModel=\"Print-Electronic\">\n            <Journal>\n                <ISSN IssnType=\"Electronic\">1552-4469</ISSN>\n                <JournalIssue CitedMedium=\"Internet\">\n                    <Volume>4</Volume>\n                    <Issue>2</Issue>\n                    <PubDate>\n                        <Year>2008</Year>\n                        <Month>Feb</Month>\n                    </PubDate>\n                </JournalIssue>\n                <Title>Nature chemical biology</Title>\n                <ISOAbbreviation>Nat. Chem. Biol.</ISOAbbreviation>\n            </Journal>\n            <ArticleTitle>Site selectivity of platinum anticancer therapeutics.</ArticleTitle>\n            <Pagination>\n                <MedlinePgn>110-2</MedlinePgn>\n            </Pagination>\n            <Abstract>\n                <AbstractText>X-ray crystallographic and biochemical investigation of the reaction of cisplatin and oxaliplatin with nucleosome core particle and naked DNA reveals that histone octamer association can modulate DNA platination. Adduct formation also occurs at specific histone methionine residues, which could serve as a nuclear platinum reservoir influencing adduct transfer to DNA. Our findings suggest that the nucleosome center may provide a favorable target for the design of improved platinum anticancer drugs.</AbstractText>\n            </Abstract>\n            <AuthorList CompleteYN=\"Y\">\n                <Author ValidYN=\"Y\">\n                    <LastName>Wu</LastName>\n                    <ForeName>Bin</ForeName>\n                    <Initials>B</Initials>\n                    <AffiliationInfo>\n                        <Affiliation>Division of Structural and Computational Biology, School of Biological Sciences, Nanyang Technological University, 60 Nanyang Drive, Singapore 637551, Singapore.</Affiliation>\n                    </AffiliationInfo>\n                </Author>\n                <Author ValidYN=\"Y\">\n                    <LastName>Dröge</LastName>\n                    <ForeName>Peter</ForeName>\n                    <Initials>P</Initials>\n                </Author>\n                <Author ValidYN=\"Y\">\n                    <LastName>Davey</LastName>\n                    <ForeName>Curt A</ForeName>\n                    <Initials>CA</Initials>\n                </Author>\n            </AuthorList>\n            <Language>eng</Language>\n            <DataBankList CompleteYN=\"Y\">\n                <DataBank>\n                    <DataBankName>PubChem-Substance</DataBankName>\n                    <AccessionNumberList>\n                        <AccessionNumber>46095911</AccessionNumber>\n                        <AccessionNumber>46095912</AccessionNumber>\n                    </AccessionNumberList>\n                </DataBank>\n            </DataBankList>\n            <PublicationTypeList>\n                <PublicationType UI=\"D016428\">Journal Article</PublicationType>\n                <PublicationType UI=\"D013485\">Research Support, Non-U.S. Gov't</PublicationType>\n            </PublicationTypeList>\n            <ArticleDate DateType=\"Electronic\">\n                <Year>2007</Year>\n                <Month>12</Month>\n                <Day>23</Day>\n            </ArticleDate>\n        </Article>\n        <MedlineJournalInfo>\n            <Country>United States</Country>\n            <MedlineTA>Nat Chem Biol</MedlineTA>\n            <NlmUniqueID>101231976</NlmUniqueID>\n            <ISSNLinking>1552-4450</ISSNLinking>\n        </MedlineJournalInfo>\n        <ChemicalList>\n            <Chemical>\n                <RegistryNumber>0</RegistryNumber>\n                <NameOfSubstance UI=\"D000970\">Antineoplastic Agents</NameOfSubstance>\n            </Chemical>\n            <Chemical>\n                <RegistryNumber>0</RegistryNumber>\n                <NameOfSubstance UI=\"D018736\">DNA Adducts</NameOfSubstance>\n            </Chemical>\n            <Chemical>\n                <RegistryNumber>0</RegistryNumber>\n                <NameOfSubstance UI=\"D006657\">Histones</NameOfSubstance>\n            </Chemical>\n            <Chemical>\n                <RegistryNumber>0</RegistryNumber>\n                <NameOfSubstance UI=\"D009707\">Nucleosomes</NameOfSubstance>\n            </Chemical>\n            <Chemical>\n                <RegistryNumber>49DFR088MY</RegistryNumber>\n                <NameOfSubstance UI=\"D010984\">Platinum</NameOfSubstance>\n            </Chemical>\n        </ChemicalList>\n        <CitationSubset>IM</CitationSubset>\n        <MeshHeadingList>\n            <MeshHeading>\n                <DescriptorName MajorTopicYN=\"N\" UI=\"D000595\">Amino Acid Sequence</DescriptorName>\n            </MeshHeading>\n            <MeshHeading>\n                <DescriptorName MajorTopicYN=\"N\" UI=\"D000970\">Antineoplastic Agents</DescriptorName>\n                <QualifierName MajorTopicYN=\"Y\" UI=\"Q000737\">chemistry</QualifierName>\n            </MeshHeading>\n            <MeshHeading>\n                <DescriptorName MajorTopicYN=\"N\" UI=\"D001483\">Base Sequence</DescriptorName>\n            </MeshHeading>\n            <MeshHeading>\n                <DescriptorName MajorTopicYN=\"N\" UI=\"D018360\">Crystallography, X-Ray</DescriptorName>\n            </MeshHeading>\n            <MeshHeading>\n                <DescriptorName MajorTopicYN=\"N\" UI=\"D018736\">DNA Adducts</DescriptorName>\n                <QualifierName MajorTopicYN=\"N\" UI=\"Q000737\">chemistry</QualifierName>\n            </MeshHeading>\n            <MeshHeading>\n                <DescriptorName MajorTopicYN=\"N\" UI=\"D006657\">Histones</DescriptorName>\n                <QualifierName MajorTopicYN=\"N\" UI=\"Q000737\">chemistry</QualifierName>\n                <QualifierName MajorTopicYN=\"N\" UI=\"Q000378\">metabolism</QualifierName>\n            </MeshHeading>\n            <MeshHeading>\n                <DescriptorName MajorTopicYN=\"N\" UI=\"D008958\">Models, Molecular</DescriptorName>\n            </MeshHeading>\n            <MeshHeading>\n                <DescriptorName MajorTopicYN=\"N\" UI=\"D008969\">Molecular Sequence Data</DescriptorName>\n            </MeshHeading>\n            <MeshHeading>\n                <DescriptorName MajorTopicYN=\"N\" UI=\"D009707\">Nucleosomes</DescriptorName>\n                <QualifierName MajorTopicYN=\"N\" UI=\"Q000737\">chemistry</QualifierName>\n                <QualifierName MajorTopicYN=\"N\" UI=\"Q000378\">metabolism</QualifierName>\n            </MeshHeading>\n            <MeshHeading>\n                <DescriptorName MajorTopicYN=\"N\" UI=\"D010984\">Platinum</DescriptorName>\n                <QualifierName MajorTopicYN=\"Y\" UI=\"Q000737\">chemistry</QualifierName>\n            </MeshHeading>\n            <MeshHeading>\n                <DescriptorName MajorTopicYN=\"N\" UI=\"D017434\">Protein Structure, Tertiary</DescriptorName>\n            </MeshHeading>\n            <MeshHeading>\n                <DescriptorName MajorTopicYN=\"N\" UI=\"D012680\">Sensitivity and Specificity</DescriptorName>\n            </MeshHeading>\n        </MeshHeadingList>\n    </MedlineCitation>\n    <PubmedData>\n        <History>\n            <PubMedPubDate PubStatus=\"received\">\n                <Year>2007</Year>\n                <Month>6</Month>\n                <Day>07</Day>\n            </PubMedPubDate>\n            <PubMedPubDate PubStatus=\"accepted\">\n                <Year>2007</Year>\n                <Month>10</Month>\n                <Day>26</Day>\n            </PubMedPubDate>\n            <PubMedPubDate PubStatus=\"aheadofprint\">\n                <Year>2007</Year>\n                <Month>12</Month>\n                <Day>23</Day>\n            </PubMedPubDate>\n            <PubMedPubDate PubStatus=\"pubmed\">\n                <Year>2007</Year>\n                <Month>12</Month>\n                <Day>25</Day>\n                <Hour>9</Hour>\n                <Minute>0</Minute>\n            </PubMedPubDate>\n            <PubMedPubDate PubStatus=\"medline\">\n                <Year>2008</Year>\n                <Month>2</Month>\n                <Day>9</Day>\n                <Hour>9</Hour>\n                <Minute>0</Minute>\n            </PubMedPubDate>\n            <PubMedPubDate PubStatus=\"entrez\">\n                <Year>2007</Year>\n                <Month>12</Month>\n                <Day>25</Day>\n                <Hour>9</Hour>\n                <Minute>0</Minute>\n            </PubMedPubDate>\n        </History>\n        <PublicationStatus>ppublish</PublicationStatus>\n        <ArticleIdList>\n            <ArticleId IdType=\"pii\">nchembio.2007.58</ArticleId>\n            <ArticleId IdType=\"doi\">10.1038/nchembio.2007.58</ArticleId>\n            <ArticleId IdType=\"pubmed\">18157123</ArticleId>\n        </ArticleIdList>\n    </PubmedData>\n</PubmedArticle>\n\n</PubmedArticleSet>\n",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "High-content single-cell drug screening with phosphospecific flow cytometry",
				"creators": [
					{
						"firstName": "Peter O.",
						"lastName": "Krutzik",
						"creatorType": "author"
					},
					{
						"firstName": "Janelle M.",
						"lastName": "Crane",
						"creatorType": "author"
					},
					{
						"firstName": "Matthew R.",
						"lastName": "Clutter",
						"creatorType": "author"
					},
					{
						"firstName": "Garry P.",
						"lastName": "Nolan",
						"creatorType": "author"
					}
				],
				"date": "2008-02",
				"DOI": "10.1038/nchembio.2007.59",
				"ISSN": "1552-4469",
				"abstractNote": "Drug screening is often limited to cell-free assays involving purified enzymes, but it is arguably best applied against systems that represent disease states or complex physiological cellular networks. Here, we describe a high-content, cell-based drug discovery platform based on phosphospecific flow cytometry, or phosphoflow, that enabled screening for inhibitors against multiple endogenous kinase signaling pathways in heterogeneous primary cell populations at the single-cell level. From a library of small-molecule natural products, we identified pathway-selective inhibitors of Jak-Stat and MAP kinase signaling. Dose-response experiments in primary cells confirmed pathway selectivity, but importantly also revealed differential inhibition of cell types and new druggability trends across multiple compounds. Lead compound selectivity was confirmed in vivo in mice. Phosphoflow therefore provides a unique platform that can be applied throughout the drug discovery process, from early compound screening to in vivo testing and clinical monitoring of drug efficacy.",
				"extra": "PMID: 18157122",
				"issue": "2",
				"journalAbbreviation": "Nat. Chem. Biol.",
				"language": "eng",
				"pages": "132-142",
				"publicationTitle": "Nature Chemical Biology",
				"volume": "4",
				"attachments": [
					{
						"title": "PubMed entry",
						"mimeType": "text/html",
						"snapshot": false
					}
				],
				"tags": [
					{
						"tag": "Animals"
					},
					{
						"tag": "Cell Line, Tumor"
					},
					{
						"tag": "Drug Evaluation, Preclinical"
					},
					{
						"tag": "Flow Cytometry"
					},
					{
						"tag": "Humans"
					},
					{
						"tag": "Janus Kinases"
					},
					{
						"tag": "Mice"
					},
					{
						"tag": "Mice, Inbred BALB C"
					},
					{
						"tag": "Mitogen-Activated Protein Kinases"
					},
					{
						"tag": "Phosphorus"
					},
					{
						"tag": "STAT Transcription Factors"
					},
					{
						"tag": "Sensitivity and Specificity"
					},
					{
						"tag": "Signal Transduction"
					}
				],
				"notes": [],
				"seeAlso": []
			},
			{
				"itemType": "journalArticle",
				"title": "Site selectivity of platinum anticancer therapeutics",
				"creators": [
					{
						"firstName": "Bin",
						"lastName": "Wu",
						"creatorType": "author"
					},
					{
						"firstName": "Peter",
						"lastName": "Dröge",
						"creatorType": "author"
					},
					{
						"firstName": "Curt A.",
						"lastName": "Davey",
						"creatorType": "author"
					}
				],
				"date": "2008-02",
				"DOI": "10.1038/nchembio.2007.58",
				"ISSN": "1552-4469",
				"abstractNote": "X-ray crystallographic and biochemical investigation of the reaction of cisplatin and oxaliplatin with nucleosome core particle and naked DNA reveals that histone octamer association can modulate DNA platination. Adduct formation also occurs at specific histone methionine residues, which could serve as a nuclear platinum reservoir influencing adduct transfer to DNA. Our findings suggest that the nucleosome center may provide a favorable target for the design of improved platinum anticancer drugs.",
				"extra": "PMID: 18157123",
				"issue": "2",
				"journalAbbreviation": "Nat. Chem. Biol.",
				"language": "eng",
				"pages": "110-112",
				"publicationTitle": "Nature Chemical Biology",
				"volume": "4",
				"attachments": [
					{
						"title": "PubMed entry",
						"mimeType": "text/html",
						"snapshot": false
					}
				],
				"tags": [
					{
						"tag": "Amino Acid Sequence"
					},
					{
						"tag": "Antineoplastic Agents"
					},
					{
						"tag": "Base Sequence"
					},
					{
						"tag": "Crystallography, X-Ray"
					},
					{
						"tag": "DNA Adducts"
					},
					{
						"tag": "Histones"
					},
					{
						"tag": "Models, Molecular"
					},
					{
						"tag": "Molecular Sequence Data"
					},
					{
						"tag": "Nucleosomes"
					},
					{
						"tag": "Platinum"
					},
					{
						"tag": "Protein Structure, Tertiary"
					},
					{
						"tag": "Sensitivity and Specificity"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "import",
		"input": "<?xml version=\"1.0\"?>\n<!DOCTYPE PubmedArticleSet PUBLIC \"-//NLM//DTD PubMedArticle, 1st January 2015//EN\" \"http://www.ncbi.nlm.nih.gov/corehtml/query/DTD/pubmed_150101.dtd\">\n<PubmedArticleSet>\n<PubmedBookArticle>\n    <BookDocument>\n        <PMID>20821847</PMID>\n        <ArticleIdList>\n            <ArticleId IdType=\"bookaccession\">NBK22</ArticleId>\n        </ArticleIdList>\n        <Book>\n            <Publisher>\n                <PublisherName>BIOS Scientific Publishers</PublisherName>\n                <PublisherLocation>Oxford</PublisherLocation>\n            </Publisher>\n            <BookTitle book=\"endocrin\">Endocrinology: An Integrated Approach</BookTitle>\n            <PubDate>\n                <Year>2001</Year>\n            </PubDate>\n            <AuthorList Type=\"authors\">\n                <Author>\n                    <LastName>Nussey</LastName>\n                    <ForeName>Stephen</ForeName>\n                    <Initials>S</Initials>\n                </Author>\n                <Author>\n                    <LastName>Whitehead</LastName>\n                    <ForeName>Saffron</ForeName>\n                    <Initials>S</Initials>\n                </Author>\n            </AuthorList>\n            <Isbn>1859962521</Isbn>\n        </Book>\n        <Language>eng</Language>\n        <Abstract>\n            <AbstractText>Endocrinology has been written to meet the requirements of today's trainee doctors and the demands of an increasing number of degree courses in health and biomedical sciences, and allied subjects. It is a truly integrated text using large numbers of real clinical cases to introduce the basic biochemistry, physiology and pathophysiology underlying endocrine disorders and also the principles of clinical diagnosis and treatment. The increasing importance of the molecular and genetic aspects of endocrinology in relation to clinical medicine is explained.</AbstractText>\n            <CopyrightInformation>Copyright © 2001, BIOS Scientific Publishers Limited</CopyrightInformation>\n        </Abstract>\n        <Sections>\n            <Section>\n                <SectionTitle book=\"endocrin\" part=\"A2\">Preface</SectionTitle>\n            </Section>\n            <Section>\n                <LocationLabel Type=\"chapter\">Chapter 1</LocationLabel>\n                <SectionTitle book=\"endocrin\" part=\"A3\">Principles of endocrinology</SectionTitle>\n            </Section>\n            <Section>\n                <LocationLabel Type=\"chapter\">Chapter 2</LocationLabel>\n                <SectionTitle book=\"endocrin\" part=\"A43\">The endocrine pancreas</SectionTitle>\n            </Section>\n            <Section>\n                <LocationLabel Type=\"chapter\">Chapter 3</LocationLabel>\n                <SectionTitle book=\"endocrin\" part=\"A235\">The thyroid gland</SectionTitle>\n            </Section>\n            <Section>\n                <LocationLabel Type=\"chapter\">Chapter 4</LocationLabel>\n                <SectionTitle book=\"endocrin\" part=\"A442\">The adrenal gland</SectionTitle>\n            </Section>\n            <Section>\n                <LocationLabel Type=\"chapter\">Chapter 5</LocationLabel>\n                <SectionTitle book=\"endocrin\" part=\"A742\">The parathyroid glands and vitamin D</SectionTitle>\n            </Section>\n            <Section>\n                <LocationLabel Type=\"chapter\">Chapter 6</LocationLabel>\n                <SectionTitle book=\"endocrin\" part=\"A972\">The gonad</SectionTitle>\n            </Section>\n            <Section>\n                <LocationLabel Type=\"chapter\">Chapter 7</LocationLabel>\n                <SectionTitle book=\"endocrin\" part=\"A1257\">The pituitary gland</SectionTitle>\n            </Section>\n            <Section>\n                <LocationLabel Type=\"chapter\">Chapter 8</LocationLabel>\n                <SectionTitle book=\"endocrin\" part=\"A1527\">Cardiovascular and renal endocrinology</SectionTitle>\n            </Section>\n        </Sections>\n    </BookDocument>\n    <PubmedBookData>\n        <History>\n            <PubMedPubDate PubStatus=\"pubmed\">\n                <Year>2010</Year>\n                <Month>9</Month>\n                <Day>8</Day>\n                <Hour>6</Hour>\n                <Minute>0</Minute>\n            </PubMedPubDate>\n            <PubMedPubDate PubStatus=\"medline\">\n                <Year>2010</Year>\n                <Month>9</Month>\n                <Day>8</Day>\n                <Hour>6</Hour>\n                <Minute>0</Minute>\n            </PubMedPubDate>\n            <PubMedPubDate PubStatus=\"entrez\">\n                <Year>2010</Year>\n                <Month>9</Month>\n                <Day>8</Day>\n                <Hour>6</Hour>\n                <Minute>0</Minute>\n            </PubMedPubDate>\n        </History>\n        <PublicationStatus>ppublish</PublicationStatus>\n        <ArticleIdList>\n            <ArticleId IdType=\"pubmed\">20821847</ArticleId>\n        </ArticleIdList>\n    </PubmedBookData>\n</PubmedBookArticle>\n\n</PubmedArticleSet>\n",
		"items": [
			{
				"itemType": "book",
				"title": "Endocrinology: An Integrated Approach",
				"creators": [
					{
						"firstName": "Stephen",
						"lastName": "Nussey",
						"creatorType": "author"
					},
					{
						"firstName": "Saffron",
						"lastName": "Whitehead",
						"creatorType": "author"
					}
				],
				"date": "2001",
				"ISBN": "1859962521",
				"abstractNote": "Endocrinology has been written to meet the requirements of today's trainee doctors and the demands of an increasing number of degree courses in health and biomedical sciences, and allied subjects. It is a truly integrated text using large numbers of real clinical cases to introduce the basic biochemistry, physiology and pathophysiology underlying endocrine disorders and also the principles of clinical diagnosis and treatment. The increasing importance of the molecular and genetic aspects of endocrinology in relation to clinical medicine is explained.",
				"callNumber": "NBK22",
				"extra": "PMID: 20821847",
				"language": "eng",
				"place": "Oxford",
				"publisher": "BIOS Scientific Publishers",
				"rights": "Copyright © 2001, BIOS Scientific Publishers Limited",
				"url": "http://www.ncbi.nlm.nih.gov/books/NBK22/",
				"attachments": [
					{
						"title": "PubMed entry",
						"mimeType": "text/html",
						"snapshot": false
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "import",
		"input": "<?xml version=\"1.0\"?>\n<!DOCTYPE PubmedArticleSet PUBLIC \"-//NLM//DTD PubMedArticle, 1st January 2015//EN\" \"http://www.ncbi.nlm.nih.gov/corehtml/query/DTD/pubmed_150101.dtd\">\n<PubmedArticleSet>\n\n<PubmedArticle>\n    <MedlineCitation Owner=\"NLM\" Status=\"In-Process\">\n        <PMID Version=\"1\">26074225</PMID>\n        <DateCreated>\n            <Year>2015</Year>\n            <Month>07</Month>\n            <Day>20</Day>\n        </DateCreated>\n        <Article PubModel=\"Print-Electronic\">\n            <Journal>\n                <ISSN IssnType=\"Electronic\">1525-3198</ISSN>\n                <JournalIssue CitedMedium=\"Internet\">\n                    <Volume>98</Volume>\n                    <Issue>8</Issue>\n                    <PubDate>\n                        <Year>2015</Year>\n                        <Month>Aug</Month>\n                    </PubDate>\n                </JournalIssue>\n                <Title>Journal of dairy science</Title>\n                <ISOAbbreviation>J. Dairy Sci.</ISOAbbreviation>\n            </Journal>\n            <ArticleTitle>Evaluation of testing strategies to identify infected animals at a single round of testing within dairy herds known to be infected with Mycobacterium avium ssp. paratuberculosis.</ArticleTitle>\n            <Pagination>\n                <MedlinePgn>5194-210</MedlinePgn>\n            </Pagination>\n            <ELocationID EIdType=\"doi\" ValidYN=\"Y\">10.3168/jds.2014-8211</ELocationID>\n            <ELocationID EIdType=\"pii\" ValidYN=\"Y\">S0022-0302(15)00395-1</ELocationID>\n            <Abstract>\n                <AbstractText>As part of a broader control strategy within herds known to be infected with Mycobacterium avium ssp. paratuberculosis (MAP), individual animal testing is generally conducted to identify infected animals for action, usually culling. Opportunities are now available to quantitatively compare different testing strategies (combinations of tests) in known infected herds. This study evaluates the effectiveness, cost, and cost-effectiveness of different testing strategies to identify infected animals at a single round of testing within dairy herds known to be MAP infected. A model was developed, taking account of both within-herd infection dynamics and test performance, to simulate the use of different tests at a single round of testing in a known infected herd. Model inputs included the number of animals at different stages of infection, the sensitivity and specificity of each test, and the costs of testing and culling. Testing strategies included either milk or serum ELISA alone or with fecal culture in series. Model outputs included effectiveness (detection fraction, the proportion of truly infected animals in the herd that are successfully detected by the testing strategy), cost, and cost-effectiveness (testing cost per true positive detected, total cost per true positive detected). Several assumptions were made: MAP was introduced with a single animal and no management interventions were implemented to limit within-herd transmission of MAP before this test. In medium herds, between 7 and 26% of infected animals are detected at a single round of testing, the former using the milk ELISA and fecal culture in series 5 yr after MAP introduction and the latter using fecal culture alone 15 yr after MAP introduction. The combined costs of testing and culling at a single round of testing increases with time since introduction of MAP infection, with culling costs being much greater than testing costs. The cost-effectiveness of testing varied by testing strategy. It was also greater at 5 yr, compared with 10 or 15 yr, since MAP introduction, highlighting the importance of early detection. Future work is needed to evaluate these testing strategies in subsequent rounds of testing as well as accounting for different herd dynamics and different levels of herd biocontainment.</AbstractText>\n                <CopyrightInformation>Copyright © 2015 American Dairy Science Association. Published by Elsevier Inc. All rights reserved.</CopyrightInformation>\n            </Abstract>\n            <AuthorList CompleteYN=\"Y\">\n                <Author ValidYN=\"Y\">\n                    <LastName>More</LastName>\n                    <ForeName>S J</ForeName>\n                    <Initials>SJ</Initials>\n                    <AffiliationInfo>\n                        <Affiliation>Centre for Veterinary Epidemiology and Risk Analysis, UCD School of Veterinary Medicine, University College Dublin, Belfield, Dublin 4, Ireland. Electronic address: simon.more@ucd.ie.</Affiliation>\n                    </AffiliationInfo>\n                </Author>\n                <Author ValidYN=\"Y\">\n                    <LastName>Cameron</LastName>\n                    <ForeName>A R</ForeName>\n                    <Initials>AR</Initials>\n                    <AffiliationInfo>\n                        <Affiliation>AusVet Animal Health Services Pty Ltd., 69001 Lyon, France.</Affiliation>\n                    </AffiliationInfo>\n                </Author>\n                <Author ValidYN=\"Y\">\n                    <LastName>Strain</LastName>\n                    <ForeName>S</ForeName>\n                    <Initials>S</Initials>\n                    <AffiliationInfo>\n                        <Affiliation>Animal Health &amp; Welfare Northern Ireland, Dungannon BT71 7DX, Northern Ireland.</Affiliation>\n                    </AffiliationInfo>\n                </Author>\n                <Author ValidYN=\"Y\">\n                    <LastName>Cashman</LastName>\n                    <ForeName>W</ForeName>\n                    <Initials>W</Initials>\n                    <AffiliationInfo>\n                        <Affiliation>Riverstown Cross, Glanmire, Co. Cork, Ireland.</Affiliation>\n                    </AffiliationInfo>\n                </Author>\n                <Author ValidYN=\"Y\">\n                    <LastName>Ezanno</LastName>\n                    <ForeName>P</ForeName>\n                    <Initials>P</Initials>\n                    <AffiliationInfo>\n                        <Affiliation>INRA, Oniris, LUNAM Université, UMR1300 Biologie, Epidémiologie et Analyse de Risque en Santé Animale, CS 40706, F-44307 Nantes, France.</Affiliation>\n                    </AffiliationInfo>\n                </Author>\n                <Author ValidYN=\"Y\">\n                    <LastName>Kenny</LastName>\n                    <ForeName>K</ForeName>\n                    <Initials>K</Initials>\n                    <AffiliationInfo>\n                        <Affiliation>Central Veterinary Research Laboratory, Department of Agriculture, Food and the Marine, Backweston, Cellbridge, Co. Kildare, Ireland.</Affiliation>\n                    </AffiliationInfo>\n                </Author>\n                <Author ValidYN=\"Y\">\n                    <LastName>Fourichon</LastName>\n                    <ForeName>C</ForeName>\n                    <Initials>C</Initials>\n                    <AffiliationInfo>\n                        <Affiliation>INRA, Oniris, LUNAM Université, UMR1300 Biologie, Epidémiologie et Analyse de Risque en Santé Animale, CS 40706, F-44307 Nantes, France.</Affiliation>\n                    </AffiliationInfo>\n                </Author>\n                <Author ValidYN=\"Y\">\n                    <LastName>Graham</LastName>\n                    <ForeName>D</ForeName>\n                    <Initials>D</Initials>\n                    <AffiliationInfo>\n                        <Affiliation>Animal Health Ireland, Main Street, Carrick-on-Shannon, Co. Leitrim, Ireland.</Affiliation>\n                    </AffiliationInfo>\n                </Author>\n            </AuthorList>\n            <Language>eng</Language>\n            <PublicationTypeList>\n                <PublicationType UI=\"D016428\">Journal Article</PublicationType>\n                <PublicationType UI=\"D013485\">Research Support, Non-U.S. Gov't</PublicationType>\n            </PublicationTypeList>\n            <ArticleDate DateType=\"Electronic\">\n                <Year>2015</Year>\n                <Month>07</Month>\n                <Day>07</Day>\n            </ArticleDate>\n        </Article>\n        <MedlineJournalInfo>\n            <Country>United States</Country>\n            <MedlineTA>J Dairy Sci</MedlineTA>\n            <NlmUniqueID>2985126R</NlmUniqueID>\n            <ISSNLinking>0022-0302</ISSNLinking>\n        </MedlineJournalInfo>\n        <CitationSubset>IM</CitationSubset>\n        <KeywordList Owner=\"NOTNLM\">\n            <Keyword MajorTopicYN=\"N\">Johne’s disease</Keyword>\n            <Keyword MajorTopicYN=\"N\">control</Keyword>\n            <Keyword MajorTopicYN=\"N\">evaluation</Keyword>\n            <Keyword MajorTopicYN=\"N\">infected herd</Keyword>\n            <Keyword MajorTopicYN=\"N\">testing strategies</Keyword>\n        </KeywordList>\n    </MedlineCitation>\n    <PubmedData>\n        <History>\n            <PubMedPubDate PubStatus=\"received\">\n                <Year>2014</Year>\n                <Month>4</Month>\n                <Day>7</Day>\n            </PubMedPubDate>\n            <PubMedPubDate PubStatus=\"accepted\">\n                <Year>2015</Year>\n                <Month>4</Month>\n                <Day>24</Day>\n            </PubMedPubDate>\n            <PubMedPubDate PubStatus=\"aheadofprint\">\n                <Year>2015</Year>\n                <Month>7</Month>\n                <Day>7</Day>\n            </PubMedPubDate>\n            <PubMedPubDate PubStatus=\"entrez\">\n                <Year>2015</Year>\n                <Month>6</Month>\n                <Day>16</Day>\n                <Hour>6</Hour>\n                <Minute>0</Minute>\n            </PubMedPubDate>\n            <PubMedPubDate PubStatus=\"pubmed\">\n                <Year>2015</Year>\n                <Month>6</Month>\n                <Day>16</Day>\n                <Hour>6</Hour>\n                <Minute>0</Minute>\n            </PubMedPubDate>\n            <PubMedPubDate PubStatus=\"medline\">\n                <Year>2015</Year>\n                <Month>6</Month>\n                <Day>16</Day>\n                <Hour>6</Hour>\n                <Minute>0</Minute>\n            </PubMedPubDate>\n        </History>\n        <PublicationStatus>ppublish</PublicationStatus>\n        <ArticleIdList>\n            <ArticleId IdType=\"pubmed\">26074225</ArticleId>\n            <ArticleId IdType=\"pii\">S0022-0302(15)00395-1</ArticleId>\n            <ArticleId IdType=\"doi\">10.3168/jds.2014-8211</ArticleId>\n        </ArticleIdList>\n    </PubmedData>\n</PubmedArticle>\n\n\n<PubmedArticle>\n    <MedlineCitation Status=\"Publisher\" Owner=\"NLM\">\n        <PMID Version=\"1\">26166904</PMID>\n        <DateCreated>\n            <Year>2015</Year>\n            <Month>7</Month>\n            <Day>13</Day>\n        </DateCreated>\n        <DateRevised>\n            <Year>2015</Year>\n            <Month>7</Month>\n            <Day>19</Day>\n        </DateRevised>\n        <Article PubModel=\"Print\">\n            <Journal>\n                <ISSN IssnType=\"Print\">0035-9254</ISSN>\n                <JournalIssue CitedMedium=\"Print\">\n                    <Volume>64</Volume>\n                    <Issue>4</Issue>\n                    <PubDate>\n                        <Year>2015</Year>\n                        <Month>Aug</Month>\n                        <Day>1</Day>\n                    </PubDate>\n                </JournalIssue>\n                <Title>Journal of the Royal Statistical Society. Series C, Applied statistics</Title>\n                <ISOAbbreviation>J R Stat Soc Ser C Appl Stat</ISOAbbreviation>\n            </Journal>\n            <ArticleTitle>Optimal retesting configurations for hierarchical group testing.</ArticleTitle>\n            <Pagination>\n                <MedlinePgn>693-710</MedlinePgn>\n            </Pagination>\n            <Abstract>\n                <AbstractText NlmCategory=\"UNASSIGNED\">Hierarchical group testing is widely used to test individuals for diseases. This testing procedure works by first amalgamating individual specimens into groups for testing. Groups testing negatively have their members declared negative. Groups testing positively are subsequently divided into smaller subgroups and are then retested to search for positive individuals. In our paper, we propose a new class of informative retesting procedures for hierarchical group testing that acknowledges heterogeneity among individuals. These procedures identify the optimal number of groups and their sizes at each testing stage in order to minimize the expected number of tests. We apply our proposals in two settings: 1) HIV testing programs that currently use three-stage hierarchical testing and 2) chlamydia and gonorrhea screening practices that currently use individual testing. For both applications, we show that substantial savings can be realized by our new procedures.</AbstractText>\n            </Abstract>\n            <AuthorList>\n                <Author>\n                    <LastName>Black</LastName>\n                    <ForeName>Michael S</ForeName>\n                    <Initials>MS</Initials>\n                    <AffiliationInfo>\n                        <Affiliation>Department of Mathematics, University of Wisconsin-Platteville, Platteville, WI 53818, USA, blackmi@uwplatt.edu.</Affiliation>\n                    </AffiliationInfo>\n                </Author>\n                <Author>\n                    <LastName>Bilder</LastName>\n                    <ForeName>Christopher R</ForeName>\n                    <Initials>CR</Initials>\n                    <AffiliationInfo>\n                        <Affiliation>Department of Statistics, University of Nebraska-Lincoln, Lincoln, NE 68583, USA.</Affiliation>\n                    </AffiliationInfo>\n                </Author>\n                <Author>\n                    <LastName>Tebbs</LastName>\n                    <ForeName>Joshua M</ForeName>\n                    <Initials>JM</Initials>\n                    <AffiliationInfo>\n                        <Affiliation>Department of Statistics, University of South Carolina, Columbia, SC 29208, USA, tebbs@stat.sc.edu.</Affiliation>\n                    </AffiliationInfo>\n                </Author>\n            </AuthorList>\n            <Language>ENG</Language>\n            <GrantList>\n                <Grant>\n                    <GrantID>R01 AI067373</GrantID>\n                    <Acronym>AI</Acronym>\n                    <Agency>NIAID NIH HHS</Agency>\n                    <Country>United States</Country>\n                </Grant>\n            </GrantList>\n            <PublicationTypeList>\n                <PublicationType UI=\"\">JOURNAL ARTICLE</PublicationType>\n            </PublicationTypeList>\n        </Article>\n        <MedlineJournalInfo>\n            <MedlineTA>J R Stat Soc Ser C Appl Stat</MedlineTA>\n            <NlmUniqueID>101086541</NlmUniqueID>\n            <ISSNLinking>0035-9254</ISSNLinking>\n        </MedlineJournalInfo>\n        <KeywordList Owner=\"NOTNLM\">\n            <Keyword MajorTopicYN=\"N\">Classification</Keyword>\n            <Keyword MajorTopicYN=\"N\">HIV</Keyword>\n            <Keyword MajorTopicYN=\"N\">Infertility Prevention Project</Keyword>\n            <Keyword MajorTopicYN=\"N\">Informative retesting</Keyword>\n            <Keyword MajorTopicYN=\"N\">Pooled testing</Keyword>\n            <Keyword MajorTopicYN=\"N\">Retesting</Keyword>\n        </KeywordList>\n    </MedlineCitation>\n    <PubmedData>\n        <History>\n            <PubMedPubDate PubStatus=\"entrez\">\n                <Year>2015</Year>\n                <Month>7</Month>\n                <Day>14</Day>\n                <Hour>6</Hour>\n                <Minute>0</Minute>\n            </PubMedPubDate>\n            <PubMedPubDate PubStatus=\"pubmed\">\n                <Year>2015</Year>\n                <Month>7</Month>\n                <Day>15</Day>\n                <Hour>6</Hour>\n                <Minute>0</Minute>\n            </PubMedPubDate>\n            <PubMedPubDate PubStatus=\"medline\">\n                <Year>2015</Year>\n                <Month>7</Month>\n                <Day>15</Day>\n                <Hour>6</Hour>\n                <Minute>0</Minute>\n            </PubMedPubDate>\n            <PubMedPubDate PubStatus=\"pmc-release\">\n                <Year>2016</Year>\n                <Month>8</Month>\n                <Day>1</Day>\n                <Hour>0</Hour>\n                <Minute>0</Minute>\n            </PubMedPubDate>\n        </History>\n        <PublicationStatus>ppublish</PublicationStatus>\n        <ArticleIdList>\n            <ArticleId IdType=\"doi\">10.1111/rssc.12097</ArticleId>\n            <ArticleId IdType=\"pubmed\">26166904</ArticleId>\n            <ArticleId IdType=\"pmc\">PMC4495770</ArticleId>\n            <ArticleId IdType=\"mid\">NIHMS641826</ArticleId>\n        </ArticleIdList>\n        <?nihms?>\n    </PubmedData>\n</PubmedArticle>\n\n</PubmedArticleSet>",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Evaluation of testing strategies to identify infected animals at a single round of testing within dairy herds known to be infected with Mycobacterium avium ssp. paratuberculosis",
				"creators": [
					{
						"firstName": "S. J.",
						"lastName": "More",
						"creatorType": "author"
					},
					{
						"firstName": "A. R.",
						"lastName": "Cameron",
						"creatorType": "author"
					},
					{
						"firstName": "S.",
						"lastName": "Strain",
						"creatorType": "author"
					},
					{
						"firstName": "W.",
						"lastName": "Cashman",
						"creatorType": "author"
					},
					{
						"firstName": "P.",
						"lastName": "Ezanno",
						"creatorType": "author"
					},
					{
						"firstName": "K.",
						"lastName": "Kenny",
						"creatorType": "author"
					},
					{
						"firstName": "C.",
						"lastName": "Fourichon",
						"creatorType": "author"
					},
					{
						"firstName": "D.",
						"lastName": "Graham",
						"creatorType": "author"
					}
				],
				"date": "2015-08",
				"DOI": "10.3168/jds.2014-8211",
				"ISSN": "1525-3198",
				"abstractNote": "As part of a broader control strategy within herds known to be infected with Mycobacterium avium ssp. paratuberculosis (MAP), individual animal testing is generally conducted to identify infected animals for action, usually culling. Opportunities are now available to quantitatively compare different testing strategies (combinations of tests) in known infected herds. This study evaluates the effectiveness, cost, and cost-effectiveness of different testing strategies to identify infected animals at a single round of testing within dairy herds known to be MAP infected. A model was developed, taking account of both within-herd infection dynamics and test performance, to simulate the use of different tests at a single round of testing in a known infected herd. Model inputs included the number of animals at different stages of infection, the sensitivity and specificity of each test, and the costs of testing and culling. Testing strategies included either milk or serum ELISA alone or with fecal culture in series. Model outputs included effectiveness (detection fraction, the proportion of truly infected animals in the herd that are successfully detected by the testing strategy), cost, and cost-effectiveness (testing cost per true positive detected, total cost per true positive detected). Several assumptions were made: MAP was introduced with a single animal and no management interventions were implemented to limit within-herd transmission of MAP before this test. In medium herds, between 7 and 26% of infected animals are detected at a single round of testing, the former using the milk ELISA and fecal culture in series 5 yr after MAP introduction and the latter using fecal culture alone 15 yr after MAP introduction. The combined costs of testing and culling at a single round of testing increases with time since introduction of MAP infection, with culling costs being much greater than testing costs. The cost-effectiveness of testing varied by testing strategy. It was also greater at 5 yr, compared with 10 or 15 yr, since MAP introduction, highlighting the importance of early detection. Future work is needed to evaluate these testing strategies in subsequent rounds of testing as well as accounting for different herd dynamics and different levels of herd biocontainment.",
				"extra": "PMID: 26074225",
				"issue": "8",
				"journalAbbreviation": "J. Dairy Sci.",
				"language": "eng",
				"pages": "5194-5210",
				"publicationTitle": "Journal of Dairy Science",
				"volume": "98",
				"attachments": [
					{
						"title": "PubMed entry",
						"mimeType": "text/html",
						"snapshot": false
					}
				],
				"tags": [
					{
						"tag": "Johne’s disease"
					},
					{
						"tag": "control"
					},
					{
						"tag": "evaluation"
					},
					{
						"tag": "infected herd"
					},
					{
						"tag": "testing strategies"
					}
				],
				"notes": [],
				"seeAlso": []
			},
			{
				"itemType": "journalArticle",
				"title": "Optimal retesting configurations for hierarchical group testing",
				"creators": [
					{
						"firstName": "Michael S.",
						"lastName": "Black",
						"creatorType": "author"
					},
					{
						"firstName": "Christopher R.",
						"lastName": "Bilder",
						"creatorType": "author"
					},
					{
						"firstName": "Joshua M.",
						"lastName": "Tebbs",
						"creatorType": "author"
					}
				],
				"date": "2015-08-01",
				"DOI": "10.1111/rssc.12097",
				"ISSN": "0035-9254",
				"abstractNote": "Hierarchical group testing is widely used to test individuals for diseases. This testing procedure works by first amalgamating individual specimens into groups for testing. Groups testing negatively have their members declared negative. Groups testing positively are subsequently divided into smaller subgroups and are then retested to search for positive individuals. In our paper, we propose a new class of informative retesting procedures for hierarchical group testing that acknowledges heterogeneity among individuals. These procedures identify the optimal number of groups and their sizes at each testing stage in order to minimize the expected number of tests. We apply our proposals in two settings: 1) HIV testing programs that currently use three-stage hierarchical testing and 2) chlamydia and gonorrhea screening practices that currently use individual testing. For both applications, we show that substantial savings can be realized by our new procedures.",
				"extra": "PMID: 26166904\nPMCID: PMC4495770",
				"issue": "4",
				"journalAbbreviation": "J R Stat Soc Ser C Appl Stat",
				"language": "ENG",
				"pages": "693-710",
				"publicationTitle": "Journal of the Royal Statistical Society. Series C, Applied Statistics",
				"volume": "64",
				"attachments": [
					{
						"title": "PubMed entry",
						"mimeType": "text/html",
						"snapshot": false
					}
				],
				"tags": [
					{
						"tag": "Classification"
					},
					{
						"tag": "HIV"
					},
					{
						"tag": "Infertility Prevention Project"
					},
					{
						"tag": "Informative retesting"
					},
					{
						"tag": "Pooled testing"
					},
					{
						"tag": "Retesting"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "import",
		"input": "<?xml version=\"1.0\" ?>\n         <!DOCTYPE PubmedArticleSet PUBLIC \"-//NLM//DTD PubMedArticle, 1st January 2019//EN\" \"https://dtd.nlm.nih.gov/ncbi/pubmed/out/pubmed_190101.dtd\">\n         <PubmedArticleSet>\n         <PubmedArticle>\n             <MedlineCitation Status=\"MEDLINE\" Owner=\"NLM\">\n                 <PMID Version=\"1\">20729678</PMID>\n                 <DateCompleted>\n                     <Year>2010</Year>\n                     <Month>12</Month>\n                     <Day>21</Day>\n                 </DateCompleted>\n                 <DateRevised>\n                     <Year>2019</Year>\n                     <Month>12</Month>\n                     <Day>10</Day>\n                 </DateRevised>\n                 <Article PubModel=\"Print\">\n                     <Journal>\n                         <ISSN IssnType=\"Electronic\">1538-9855</ISSN>\n                         <JournalIssue CitedMedium=\"Internet\">\n                             <Volume>35</Volume>\n                             <Issue>5</Issue>\n                             <PubDate>\n                                 <MedlineDate>2010 Sep-Oct</MedlineDate>\n                             </PubDate>\n                         </JournalIssue>\n                         <Title>Nurse educator</Title>\n                     </Journal>\n                     <ArticleTitle>Zotero: harnessing the power of a personal bibliographic manager.</ArticleTitle>\n                     <Pagination>\n                         <MedlinePgn>205-7</MedlinePgn>\n                     </Pagination>\n                     <ELocationID EIdType=\"doi\" ValidYN=\"Y\">10.1097/NNE.0b013e3181ed81e4</ELocationID>\n                     <Abstract>\n                         <AbstractText>Zotero is a powerful free personal bibliographic manager (PBM) for writers. Use of a PBM allows the writer to focus on content, rather than the tedious details of formatting citations and references. Zotero 2.0 (http://www.zotero.org) has new features including the ability to synchronize citations with the off-site Zotero server and the ability to collaborate and share with others. An overview on how to use the software and discussion about the strengths and limitations are included.</AbstractText>\n                     </Abstract>\n                     <AuthorList CompleteYN=\"Y\">\n                         <Author ValidYN=\"Y\">\n                             <LastName>Coar</LastName>\n                             <ForeName>Jaekea T</ForeName>\n                             <Initials>JT</Initials>\n                             <AffiliationInfo>\n                                 <Affiliation>School of Nursing, Georgia College &amp; State University, Milledgeville, Georgia 61061, USA.</Affiliation>\n                             </AffiliationInfo>\n                         </Author>\n                         <Author ValidYN=\"Y\">\n                             <LastName>Sewell</LastName>\n                             <ForeName>Jeanne P</ForeName>\n                             <Initials>JP</Initials>\n                         </Author>\n                     </AuthorList>\n                     <Language>eng</Language>\n                     <PublicationTypeList>\n                         <PublicationType UI=\"D016428\">Journal Article</PublicationType>\n                     </PublicationTypeList>\n                 </Article>\n                 <MedlineJournalInfo>\n                     <Country>United States</Country>\n                     <MedlineTA>Nurse Educ</MedlineTA>\n                     <NlmUniqueID>7701902</NlmUniqueID>\n                     <ISSNLinking>0363-3624</ISSNLinking>\n                 </MedlineJournalInfo>\n                 <CitationSubset>N</CitationSubset>\n                 <MeshHeadingList>\n                     <MeshHeading>\n                         <DescriptorName UI=\"D001634\" MajorTopicYN=\"Y\">Bibliographies as Topic</DescriptorName>\n                     </MeshHeading>\n                     <MeshHeading>\n                         <DescriptorName UI=\"D003628\" MajorTopicYN=\"Y\">Database Management Systems</DescriptorName>\n                     </MeshHeading>\n                     <MeshHeading>\n                         <DescriptorName UI=\"D006801\" MajorTopicYN=\"N\">Humans</DescriptorName>\n                     </MeshHeading>\n                 </MeshHeadingList>\n             </MedlineCitation>\n             <PubmedData>\n                 <History>\n                     <PubMedPubDate PubStatus=\"entrez\">\n                         <Year>2010</Year>\n                         <Month>8</Month>\n                         <Day>24</Day>\n                         <Hour>6</Hour>\n                         <Minute>0</Minute>\n                     </PubMedPubDate>\n                     <PubMedPubDate PubStatus=\"pubmed\">\n                         <Year>2010</Year>\n                         <Month>8</Month>\n                         <Day>24</Day>\n                         <Hour>6</Hour>\n                         <Minute>0</Minute>\n                     </PubMedPubDate>\n                     <PubMedPubDate PubStatus=\"medline\">\n                         <Year>2010</Year>\n                         <Month>12</Month>\n                         <Day>22</Day>\n                         <Hour>6</Hour>\n                         <Minute>0</Minute>\n                     </PubMedPubDate>\n                 </History>\n                 <PublicationStatus>ppublish</PublicationStatus>\n                 <ArticleIdList>\n                     <ArticleId IdType=\"pubmed\">20729678</ArticleId>\n                     <ArticleId IdType=\"doi\">10.1097/NNE.0b013e3181ed81e4</ArticleId>\n                     <ArticleId IdType=\"pii\">00006223-201009000-00011</ArticleId>\n                 </ArticleIdList>\n             </PubmedData>\n         </PubmedArticle>\n         \n         </PubmedArticleSet>",
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
					{
						"tag": "Bibliographies as Topic"
					},
					{
						"tag": "Database Management Systems"
					},
					{
						"tag": "Humans"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "import",
		"input": "<?xml version=\"1.0\" ?>\n         <!DOCTYPE PubmedArticleSet PUBLIC \"-//NLM//DTD PubMedArticle, 1st January 2019//EN\" \"https://dtd.nlm.nih.gov/ncbi/pubmed/out/pubmed_190101.dtd\">\n         <PubmedArticleSet>\n         <PubmedArticle>\n             <MedlineCitation Status=\"MEDLINE\" Owner=\"NLM\">\n                 <PMID Version=\"1\">30133126</PMID>\n                 <DateCompleted>\n                     <Year>2019</Year>\n                     <Month>01</Month>\n                     <Day>29</Day>\n                 </DateCompleted>\n                 <DateRevised>\n                     <Year>2019</Year>\n                     <Month>01</Month>\n                     <Day>29</Day>\n                 </DateRevised>\n                 <Article PubModel=\"Print-Electronic\">\n                     <Journal>\n                         <ISSN IssnType=\"Electronic\">1601-183X</ISSN>\n                         <JournalIssue CitedMedium=\"Internet\">\n                             <Volume>17</Volume>\n                             <Issue>8</Issue>\n                             <PubDate>\n                                 <Year>2018</Year>\n                                 <Month>11</Month>\n                             </PubDate>\n                         </JournalIssue>\n                         <Title>Genes, brain, and behavior</Title>\n                         <ISOAbbreviation>Genes Brain Behav</ISOAbbreviation>\n                     </Journal>\n                     <ArticleTitle>Neph2/Kirrel3 regulates sensory input, motor coordination, and home-cage activity in rodents.</ArticleTitle>\n                     <Pagination>\n                         <MedlinePgn>e12516</MedlinePgn>\n                     </Pagination>\n                     <ELocationID EIdType=\"doi\" ValidYN=\"Y\">10.1111/gbb.12516</ELocationID>\n                     <Abstract>\n                         <AbstractText>Adhesion molecules of the immunoglobulin superfamily (IgSF) are essential for neuronal synapse development across evolution and control various aspects of synapse formation and maturation. Neph2, also known as Kirrel3, is an IgSF adhesion molecule implicated in synapse formation, synaptic transmission and ultrastructure. In humans, defects in the NEPH2 gene have been associated with neurodevelopmental disorders such as Jacobsen syndrome, intellectual disability, and autism-spectrum disorders. However, the precise role in development and function of the nervous system is still unclear. Here, we present the histomorphological and phenotypical analysis of a constitutive Neph2-knockout mouse line. Knockout mice display defects in auditory sensory processing, motor skills, and hyperactivity in the home-cage analysis. Olfactory, memory and metabolic testing did not differ from controls. Despite the wide-spread expression of Neph2 in various brain areas, no gross anatomic defects could be observed. Neph2 protein could be located at the cerebellar pinceaux. It interacted with the pinceau core component neurofascin and other synaptic proteins thus suggesting a possible role in cerebellar synapse formation and circuit assembly. Our results suggest that Neph2/Kirrel3 acts on the synaptic ultrastructural level and neuronal wiring rather than on ontogenetic events affecting macroscopic structure. Neph2-knockout mice may provide a valuable rodent model for research on autism spectrum diseases and neurodevelopmental disorders.</AbstractText>\n                         <CopyrightInformation>© 2018 John Wiley &amp; Sons Ltd and International Behavioural and Neural Genetics Society.</CopyrightInformation>\n                     </Abstract>\n                     <AuthorList CompleteYN=\"Y\">\n                         <Author ValidYN=\"Y\">\n                             <LastName>Völker</LastName>\n                             <ForeName>Linus A</ForeName>\n                             <Initials>LA</Initials>\n                             <Identifier Source=\"ORCID\">0000-0002-4461-6128</Identifier>\n                             <AffiliationInfo>\n                                 <Affiliation>Department II of Internal Medicine and Center for Molecular Medicine Cologne, University of Cologne, Cologne, Germany.</Affiliation>\n                             </AffiliationInfo>\n                         </Author>\n                         <Author ValidYN=\"Y\">\n                             <LastName>Maar</LastName>\n                             <ForeName>Barbara A</ForeName>\n                             <Initials>BA</Initials>\n                             <AffiliationInfo>\n                                 <Affiliation>Department II of Internal Medicine and Center for Molecular Medicine Cologne, University of Cologne, Cologne, Germany.</Affiliation>\n                             </AffiliationInfo>\n                         </Author>\n                         <Author ValidYN=\"Y\">\n                             <LastName>Pulido Guevara</LastName>\n                             <ForeName>Barbara A</ForeName>\n                             <Initials>BA</Initials>\n                             <AffiliationInfo>\n                                 <Affiliation>Department II of Internal Medicine and Center for Molecular Medicine Cologne, University of Cologne, Cologne, Germany.</Affiliation>\n                             </AffiliationInfo>\n                         </Author>\n                         <Author ValidYN=\"Y\">\n                             <LastName>Bilkei-Gorzo</LastName>\n                             <ForeName>Andras</ForeName>\n                             <Initials>A</Initials>\n                             <AffiliationInfo>\n                                 <Affiliation>Institute of Molecular Psychiatry, Medical Faculty of the University of Bonn, Bonn, Germany.</Affiliation>\n                             </AffiliationInfo>\n                         </Author>\n                         <Author ValidYN=\"Y\">\n                             <LastName>Zimmer</LastName>\n                             <ForeName>Andreas</ForeName>\n                             <Initials>A</Initials>\n                             <AffiliationInfo>\n                                 <Affiliation>Institute of Molecular Psychiatry, Medical Faculty of the University of Bonn, Bonn, Germany.</Affiliation>\n                             </AffiliationInfo>\n                         </Author>\n                         <Author ValidYN=\"Y\">\n                             <LastName>Brönneke</LastName>\n                             <ForeName>Hella</ForeName>\n                             <Initials>H</Initials>\n                             <AffiliationInfo>\n                                 <Affiliation>Mouse Phenotyping Core Facility, Cologne Excellence Cluster on Cellular Stress Responses (CECAD), 50931 Cologne, Germany.</Affiliation>\n                             </AffiliationInfo>\n                         </Author>\n                         <Author ValidYN=\"Y\">\n                             <LastName>Dafinger</LastName>\n                             <ForeName>Claudia</ForeName>\n                             <Initials>C</Initials>\n                             <AffiliationInfo>\n                                 <Affiliation>Department II of Internal Medicine and Center for Molecular Medicine Cologne, University of Cologne, Cologne, Germany.</Affiliation>\n                             </AffiliationInfo>\n                         </Author>\n                         <Author ValidYN=\"Y\">\n                             <LastName>Bertsch</LastName>\n                             <ForeName>Sabine</ForeName>\n                             <Initials>S</Initials>\n                             <AffiliationInfo>\n                                 <Affiliation>Department II of Internal Medicine and Center for Molecular Medicine Cologne, University of Cologne, Cologne, Germany.</Affiliation>\n                             </AffiliationInfo>\n                         </Author>\n                         <Author ValidYN=\"Y\">\n                             <LastName>Wagener</LastName>\n                             <ForeName>Jan-Robin</ForeName>\n                             <Initials>JR</Initials>\n                             <AffiliationInfo>\n                                 <Affiliation>Institute for Neuroanatomy, Universitätsmedizin Göttingen, Georg-August-University Göttingen, Göttingen, Germany.</Affiliation>\n                             </AffiliationInfo>\n                         </Author>\n                         <Author ValidYN=\"Y\">\n                             <LastName>Schweizer</LastName>\n                             <ForeName>Heiko</ForeName>\n                             <Initials>H</Initials>\n                             <AffiliationInfo>\n                                 <Affiliation>Renal Division, University Hospital Freiburg, Freiburg, Germany.</Affiliation>\n                             </AffiliationInfo>\n                         </Author>\n                         <Author ValidYN=\"Y\">\n                             <LastName>Schermer</LastName>\n                             <ForeName>Bernhard</ForeName>\n                             <Initials>B</Initials>\n                             <AffiliationInfo>\n                                 <Affiliation>Department II of Internal Medicine and Center for Molecular Medicine Cologne, University of Cologne, Cologne, Germany.</Affiliation>\n                             </AffiliationInfo>\n                             <AffiliationInfo>\n                                 <Affiliation>Cologne Excellence Cluster on Cellular Stress Responses in Aging-Associated Diseases (CECAD), University of Cologne, Cologne, Germany.</Affiliation>\n                             </AffiliationInfo>\n                             <AffiliationInfo>\n                                 <Affiliation>Systems Biology of Ageing Cologne (Sybacol), University of Cologne, Cologne, Germany.</Affiliation>\n                             </AffiliationInfo>\n                         </Author>\n                         <Author ValidYN=\"Y\">\n                             <LastName>Benzing</LastName>\n                             <ForeName>Thomas</ForeName>\n                             <Initials>T</Initials>\n                             <AffiliationInfo>\n                                 <Affiliation>Department II of Internal Medicine and Center for Molecular Medicine Cologne, University of Cologne, Cologne, Germany.</Affiliation>\n                             </AffiliationInfo>\n                             <AffiliationInfo>\n                                 <Affiliation>Cologne Excellence Cluster on Cellular Stress Responses in Aging-Associated Diseases (CECAD), University of Cologne, Cologne, Germany.</Affiliation>\n                             </AffiliationInfo>\n                             <AffiliationInfo>\n                                 <Affiliation>Systems Biology of Ageing Cologne (Sybacol), University of Cologne, Cologne, Germany.</Affiliation>\n                             </AffiliationInfo>\n                         </Author>\n                         <Author ValidYN=\"Y\">\n                             <LastName>Hoehne</LastName>\n                             <ForeName>Martin</ForeName>\n                             <Initials>M</Initials>\n                             <AffiliationInfo>\n                                 <Affiliation>Department II of Internal Medicine and Center for Molecular Medicine Cologne, University of Cologne, Cologne, Germany.</Affiliation>\n                             </AffiliationInfo>\n                             <AffiliationInfo>\n                                 <Affiliation>Cologne Excellence Cluster on Cellular Stress Responses in Aging-Associated Diseases (CECAD), University of Cologne, Cologne, Germany.</Affiliation>\n                             </AffiliationInfo>\n                             <AffiliationInfo>\n                                 <Affiliation>Systems Biology of Ageing Cologne (Sybacol), University of Cologne, Cologne, Germany.</Affiliation>\n                             </AffiliationInfo>\n                         </Author>\n                     </AuthorList>\n                     <Language>eng</Language>\n                     <PublicationTypeList>\n                         <PublicationType UI=\"D016428\">Journal Article</PublicationType>\n                     </PublicationTypeList>\n                     <ArticleDate DateType=\"Electronic\">\n                         <Year>2018</Year>\n                         <Month>09</Month>\n                         <Day>14</Day>\n                     </ArticleDate>\n                 </Article>\n                 <MedlineJournalInfo>\n                     <Country>England</Country>\n                     <MedlineTA>Genes Brain Behav</MedlineTA>\n                     <NlmUniqueID>101129617</NlmUniqueID>\n                     <ISSNLinking>1601-183X</ISSNLinking>\n                 </MedlineJournalInfo>\n                 <ChemicalList>\n                     <Chemical>\n                         <RegistryNumber>0</RegistryNumber>\n                         <NameOfSubstance UI=\"D002352\">Carrier Proteins</NameOfSubstance>\n                     </Chemical>\n                     <Chemical>\n                         <RegistryNumber>0</RegistryNumber>\n                         <NameOfSubstance UI=\"D007136\">Immunoglobulins</NameOfSubstance>\n                     </Chemical>\n                     <Chemical>\n                         <RegistryNumber>0</RegistryNumber>\n                         <NameOfSubstance UI=\"C474214\">Kirrel3 protein, mouse</NameOfSubstance>\n                     </Chemical>\n                     <Chemical>\n                         <RegistryNumber>0</RegistryNumber>\n                         <NameOfSubstance UI=\"D008565\">Membrane Proteins</NameOfSubstance>\n                     </Chemical>\n                 </ChemicalList>\n                 <CitationSubset>IM</CitationSubset>\n                 <MeshHeadingList>\n                     <MeshHeading>\n                         <DescriptorName UI=\"D000818\" MajorTopicYN=\"N\">Animals</DescriptorName>\n                     </MeshHeading>\n                     <MeshHeading>\n                         <DescriptorName UI=\"D002352\" MajorTopicYN=\"N\">Carrier Proteins</DescriptorName>\n                         <QualifierName UI=\"Q000235\" MajorTopicYN=\"N\">genetics</QualifierName>\n                     </MeshHeading>\n                     <MeshHeading>\n                         <DescriptorName UI=\"D002448\" MajorTopicYN=\"N\">Cell Adhesion</DescriptorName>\n                         <QualifierName UI=\"Q000502\" MajorTopicYN=\"N\">physiology</QualifierName>\n                     </MeshHeading>\n                     <MeshHeading>\n                         <DescriptorName UI=\"D007136\" MajorTopicYN=\"N\">Immunoglobulins</DescriptorName>\n                         <QualifierName UI=\"Q000502\" MajorTopicYN=\"N\">physiology</QualifierName>\n                     </MeshHeading>\n                     <MeshHeading>\n                         <DescriptorName UI=\"D008565\" MajorTopicYN=\"N\">Membrane Proteins</DescriptorName>\n                         <QualifierName UI=\"Q000235\" MajorTopicYN=\"Y\">genetics</QualifierName>\n                         <QualifierName UI=\"Q000502\" MajorTopicYN=\"Y\">physiology</QualifierName>\n                     </MeshHeading>\n                     <MeshHeading>\n                         <DescriptorName UI=\"D051379\" MajorTopicYN=\"N\">Mice</DescriptorName>\n                     </MeshHeading>\n                     <MeshHeading>\n                         <DescriptorName UI=\"D018345\" MajorTopicYN=\"N\">Mice, Knockout</DescriptorName>\n                     </MeshHeading>\n                     <MeshHeading>\n                         <DescriptorName UI=\"D055495\" MajorTopicYN=\"N\">Neurogenesis</DescriptorName>\n                     </MeshHeading>\n                     <MeshHeading>\n                         <DescriptorName UI=\"D009474\" MajorTopicYN=\"N\">Neurons</DescriptorName>\n                         <QualifierName UI=\"Q000378\" MajorTopicYN=\"N\">metabolism</QualifierName>\n                     </MeshHeading>\n                     <MeshHeading>\n                         <DescriptorName UI=\"D013569\" MajorTopicYN=\"N\">Synapses</DescriptorName>\n                         <QualifierName UI=\"Q000378\" MajorTopicYN=\"N\">metabolism</QualifierName>\n                     </MeshHeading>\n                 </MeshHeadingList>\n                 <KeywordList Owner=\"NOTNLM\">\n                     <Keyword MajorTopicYN=\"Y\">Jacobsen syndrome</Keyword>\n                     <Keyword MajorTopicYN=\"Y\">Kirrel3</Keyword>\n                     <Keyword MajorTopicYN=\"Y\">Neph2</Keyword>\n                     <Keyword MajorTopicYN=\"Y\">attention-deficit hyperactivity disorder</Keyword>\n                     <Keyword MajorTopicYN=\"Y\">autism-spectrum disorder</Keyword>\n                     <Keyword MajorTopicYN=\"Y\">behavior</Keyword>\n                     <Keyword MajorTopicYN=\"Y\">cerebellum</Keyword>\n                     <Keyword MajorTopicYN=\"Y\">intellectual disability</Keyword>\n                     <Keyword MajorTopicYN=\"Y\">knockout</Keyword>\n                     <Keyword MajorTopicYN=\"Y\">neurodevelopmental disorders</Keyword>\n                     <Keyword MajorTopicYN=\"Y\">neurofascin</Keyword>\n                     <Keyword MajorTopicYN=\"Y\">olfaction</Keyword>\n                     <Keyword MajorTopicYN=\"Y\">phenotyping</Keyword>\n                 </KeywordList>\n             </MedlineCitation>\n             <PubmedData>\n                 <History>\n                     <PubMedPubDate PubStatus=\"received\">\n                         <Year>2018</Year>\n                         <Month>04</Month>\n                         <Day>07</Day>\n                     </PubMedPubDate>\n                     <PubMedPubDate PubStatus=\"revised\">\n                         <Year>2018</Year>\n                         <Month>07</Month>\n                         <Day>22</Day>\n                     </PubMedPubDate>\n                     <PubMedPubDate PubStatus=\"accepted\">\n                         <Year>2018</Year>\n                         <Month>08</Month>\n                         <Day>17</Day>\n                     </PubMedPubDate>\n                     <PubMedPubDate PubStatus=\"pubmed\">\n                         <Year>2018</Year>\n                         <Month>8</Month>\n                         <Day>23</Day>\n                         <Hour>6</Hour>\n                         <Minute>0</Minute>\n                     </PubMedPubDate>\n                     <PubMedPubDate PubStatus=\"medline\">\n                         <Year>2019</Year>\n                         <Month>1</Month>\n                         <Day>30</Day>\n                         <Hour>6</Hour>\n                         <Minute>0</Minute>\n                     </PubMedPubDate>\n                     <PubMedPubDate PubStatus=\"entrez\">\n                         <Year>2018</Year>\n                         <Month>8</Month>\n                         <Day>23</Day>\n                         <Hour>6</Hour>\n                         <Minute>0</Minute>\n                     </PubMedPubDate>\n                 </History>\n                 <PublicationStatus>ppublish</PublicationStatus>\n                 <ArticleIdList>\n                     <ArticleId IdType=\"pubmed\">30133126</ArticleId>\n                     <ArticleId IdType=\"doi\">10.1111/gbb.12516</ArticleId>\n                 </ArticleIdList>\n             </PubmedData>\n         </PubmedArticle>\n         \n         </PubmedArticleSet>",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Neph2/Kirrel3 regulates sensory input, motor coordination, and home-cage activity in rodents",
				"creators": [
					{
						"firstName": "Linus A.",
						"lastName": "Völker",
						"creatorType": "author"
					},
					{
						"firstName": "Barbara A.",
						"lastName": "Maar",
						"creatorType": "author"
					},
					{
						"firstName": "Barbara A.",
						"lastName": "Pulido Guevara",
						"creatorType": "author"
					},
					{
						"firstName": "Andras",
						"lastName": "Bilkei-Gorzo",
						"creatorType": "author"
					},
					{
						"firstName": "Andreas",
						"lastName": "Zimmer",
						"creatorType": "author"
					},
					{
						"firstName": "Hella",
						"lastName": "Brönneke",
						"creatorType": "author"
					},
					{
						"firstName": "Claudia",
						"lastName": "Dafinger",
						"creatorType": "author"
					},
					{
						"firstName": "Sabine",
						"lastName": "Bertsch",
						"creatorType": "author"
					},
					{
						"firstName": "Jan-Robin",
						"lastName": "Wagener",
						"creatorType": "author"
					},
					{
						"firstName": "Heiko",
						"lastName": "Schweizer",
						"creatorType": "author"
					},
					{
						"firstName": "Bernhard",
						"lastName": "Schermer",
						"creatorType": "author"
					},
					{
						"firstName": "Thomas",
						"lastName": "Benzing",
						"creatorType": "author"
					},
					{
						"firstName": "Martin",
						"lastName": "Hoehne",
						"creatorType": "author"
					}
				],
				"date": "2018-11",
				"DOI": "10.1111/gbb.12516",
				"ISSN": "1601-183X",
				"abstractNote": "Adhesion molecules of the immunoglobulin superfamily (IgSF) are essential for neuronal synapse development across evolution and control various aspects of synapse formation and maturation. Neph2, also known as Kirrel3, is an IgSF adhesion molecule implicated in synapse formation, synaptic transmission and ultrastructure. In humans, defects in the NEPH2 gene have been associated with neurodevelopmental disorders such as Jacobsen syndrome, intellectual disability, and autism-spectrum disorders. However, the precise role in development and function of the nervous system is still unclear. Here, we present the histomorphological and phenotypical analysis of a constitutive Neph2-knockout mouse line. Knockout mice display defects in auditory sensory processing, motor skills, and hyperactivity in the home-cage analysis. Olfactory, memory and metabolic testing did not differ from controls. Despite the wide-spread expression of Neph2 in various brain areas, no gross anatomic defects could be observed. Neph2 protein could be located at the cerebellar pinceaux. It interacted with the pinceau core component neurofascin and other synaptic proteins thus suggesting a possible role in cerebellar synapse formation and circuit assembly. Our results suggest that Neph2/Kirrel3 acts on the synaptic ultrastructural level and neuronal wiring rather than on ontogenetic events affecting macroscopic structure. Neph2-knockout mice may provide a valuable rodent model for research on autism spectrum diseases and neurodevelopmental disorders.",
				"extra": "PMID: 30133126",
				"issue": "8",
				"journalAbbreviation": "Genes Brain Behav",
				"language": "eng",
				"pages": "e12516",
				"publicationTitle": "Genes, Brain, and Behavior",
				"volume": "17",
				"attachments": [
					{
						"title": "PubMed entry",
						"mimeType": "text/html",
						"snapshot": false
					}
				],
				"tags": [
					{
						"tag": "Animals"
					},
					{
						"tag": "Carrier Proteins"
					},
					{
						"tag": "Cell Adhesion"
					},
					{
						"tag": "Immunoglobulins"
					},
					{
						"tag": "Jacobsen syndrome"
					},
					{
						"tag": "Kirrel3"
					},
					{
						"tag": "Membrane Proteins"
					},
					{
						"tag": "Mice"
					},
					{
						"tag": "Mice, Knockout"
					},
					{
						"tag": "Neph2"
					},
					{
						"tag": "Neurogenesis"
					},
					{
						"tag": "Neurons"
					},
					{
						"tag": "Synapses"
					},
					{
						"tag": "attention-deficit hyperactivity disorder"
					},
					{
						"tag": "autism-spectrum disorder"
					},
					{
						"tag": "behavior"
					},
					{
						"tag": "cerebellum"
					},
					{
						"tag": "intellectual disability"
					},
					{
						"tag": "knockout"
					},
					{
						"tag": "neurodevelopmental disorders"
					},
					{
						"tag": "neurofascin"
					},
					{
						"tag": "olfaction"
					},
					{
						"tag": "phenotyping"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "import",
		"input": "<?xml version=\"1.0\" ?>\n         <!DOCTYPE PubmedArticleSet PUBLIC \"-//NLM//DTD PubMedArticle, 1st January 2019//EN\" \"https://dtd.nlm.nih.gov/ncbi/pubmed/out/pubmed_190101.dtd\">\n         <PubmedArticleSet>\n         <PubmedArticle>\n             <MedlineCitation Status=\"MEDLINE\" Owner=\"NLM\">\n                 <PMID Version=\"1\">30714901</PMID>\n                 <DateCompleted>\n                     <Year>2020</Year>\n                     <Month>04</Month>\n                     <Day>10</Day>\n                 </DateCompleted>\n                 <DateRevised>\n                     <Year>2020</Year>\n                     <Month>04</Month>\n                     <Day>10</Day>\n                 </DateRevised>\n                 <Article PubModel=\"Electronic\">\n                     <Journal>\n                         <ISSN IssnType=\"Electronic\">2050-084X</ISSN>\n                         <JournalIssue CitedMedium=\"Internet\">\n                             <Volume>8</Volume>\n                             <PubDate>\n                                 <Year>2019</Year>\n                                 <Month>02</Month>\n                                 <Day>04</Day>\n                             </PubDate>\n                         </JournalIssue>\n                         <Title>eLife</Title>\n                         <ISOAbbreviation>Elife</ISOAbbreviation>\n                     </Journal>\n                     <ArticleTitle>Stereotyped terminal axon branching of leg motor neurons mediated by IgSF proteins DIP-α and Dpr10.</ArticleTitle>\n                     <ELocationID EIdType=\"doi\" ValidYN=\"Y\">10.7554/eLife.42692</ELocationID>\n                     <ELocationID EIdType=\"pii\" ValidYN=\"Y\">e42692</ELocationID>\n                     <Abstract>\n                         <AbstractText>For animals to perform coordinated movements requires the precise organization of neural circuits controlling motor function. Motor neurons (MNs), key components of these circuits, project their axons from the central nervous system and form precise terminal branching patterns at specific muscles. Focusing on the <i>Drosophila</i> leg neuromuscular system, we show that the stereotyped terminal branching of a subset of MNs is mediated by interacting transmembrane Ig superfamily proteins DIP-α and Dpr10, present in MNs and target muscles, respectively. The DIP-α/Dpr10 interaction is needed only after MN axons reach the vicinity of their muscle targets. Live imaging suggests that precise terminal branching patterns are gradually established by DIP-α/Dpr10-dependent interactions between fine axon filopodia and developing muscles. Further, different leg MNs depend on the DIP-α and Dpr10 interaction to varying degrees that correlate with the morphological complexity of the MNs and their muscle targets.</AbstractText>\n                         <CopyrightInformation>© 2019, Venkatasubramanian et al.</CopyrightInformation>\n                     </Abstract>\n                     <AuthorList CompleteYN=\"Y\">\n                         <Author ValidYN=\"Y\">\n                             <LastName>Venkatasubramanian</LastName>\n                             <ForeName>Lalanti</ForeName>\n                             <Initials>L</Initials>\n                             <Identifier Source=\"ORCID\">0000-0002-9280-8335</Identifier>\n                             <AffiliationInfo>\n                                 <Affiliation>Department of Biological Sciences, Columbia University, New York, United States.</Affiliation>\n                             </AffiliationInfo>\n                             <AffiliationInfo>\n                                 <Affiliation>Department of Neuroscience, Mortimer B. Zuckerman Mind Brain Behavior Institute, New York, United States.</Affiliation>\n                             </AffiliationInfo>\n                         </Author>\n                         <Author ValidYN=\"Y\">\n                             <LastName>Guo</LastName>\n                             <ForeName>Zhenhao</ForeName>\n                             <Initials>Z</Initials>\n                             <AffiliationInfo>\n                                 <Affiliation>Department of Biological Sciences, Columbia University, New York, United States.</Affiliation>\n                             </AffiliationInfo>\n                         </Author>\n                         <Author ValidYN=\"Y\">\n                             <LastName>Xu</LastName>\n                             <ForeName>Shuwa</ForeName>\n                             <Initials>S</Initials>\n                             <AffiliationInfo>\n                                 <Affiliation>Department of Biological Chemistry, University of California, Los Angeles, Los Angeles, United States.</Affiliation>\n                             </AffiliationInfo>\n                         </Author>\n                         <Author ValidYN=\"Y\">\n                             <LastName>Tan</LastName>\n                             <ForeName>Liming</ForeName>\n                             <Initials>L</Initials>\n                             <AffiliationInfo>\n                                 <Affiliation>Department of Biological Chemistry, University of California, Los Angeles, Los Angeles, United States.</Affiliation>\n                             </AffiliationInfo>\n                         </Author>\n                         <Author ValidYN=\"Y\">\n                             <LastName>Xiao</LastName>\n                             <ForeName>Qi</ForeName>\n                             <Initials>Q</Initials>\n                             <AffiliationInfo>\n                                 <Affiliation>Department of Biological Chemistry, University of California, Los Angeles, Los Angeles, United States.</Affiliation>\n                             </AffiliationInfo>\n                         </Author>\n                         <Author ValidYN=\"Y\">\n                             <LastName>Nagarkar-Jaiswal</LastName>\n                             <ForeName>Sonal</ForeName>\n                             <Initials>S</Initials>\n                             <AffiliationInfo>\n                                 <Affiliation>Department of Molecular and Human Genetics, Baylor College of Medicine, Houston, United States.</Affiliation>\n                             </AffiliationInfo>\n                         </Author>\n                         <Author ValidYN=\"Y\">\n                             <LastName>Mann</LastName>\n                             <ForeName>Richard S</ForeName>\n                             <Initials>RS</Initials>\n                             <Identifier Source=\"ORCID\">0000-0002-4749-2765</Identifier>\n                             <AffiliationInfo>\n                                 <Affiliation>Department of Neuroscience, Mortimer B. Zuckerman Mind Brain Behavior Institute, New York, United States.</Affiliation>\n                             </AffiliationInfo>\n                             <AffiliationInfo>\n                                 <Affiliation>Department of Biochemistry and Molecular Biophysics, Columbia University, New York, United States.</Affiliation>\n                             </AffiliationInfo>\n                         </Author>\n                     </AuthorList>\n                     <Language>eng</Language>\n                     <GrantList CompleteYN=\"Y\">\n                         <Grant>\n                             <GrantID>U19NS104655</GrantID>\n                             <Acronym>NH</Acronym>\n                             <Agency>NIH HHS</Agency>\n                             <Country>United States</Country>\n                         </Grant>\n                         <Grant>\n                             <GrantID>R01NS070644</GrantID>\n                             <Acronym>NH</Acronym>\n                             <Agency>NIH HHS</Agency>\n                             <Country>United States</Country>\n                         </Grant>\n                         <Grant>\n                             <GrantID>R01 GM067858</GrantID>\n                             <Acronym>GM</Acronym>\n                             <Agency>NIGMS NIH HHS</Agency>\n                             <Country>United States</Country>\n                         </Grant>\n                         <Grant>\n                             <GrantID>R01 NS070644</GrantID>\n                             <Acronym>NS</Acronym>\n                             <Agency>NINDS NIH HHS</Agency>\n                             <Country>United States</Country>\n                         </Grant>\n                         <Grant>\n                             <GrantID>U19 NS104655</GrantID>\n                             <Acronym>NS</Acronym>\n                             <Agency>NINDS NIH HHS</Agency>\n                             <Country>United States</Country>\n                         </Grant>\n                     </GrantList>\n                     <PublicationTypeList>\n                         <PublicationType UI=\"D016428\">Journal Article</PublicationType>\n                         <PublicationType UI=\"D052061\">Research Support, N.I.H., Extramural</PublicationType>\n                     </PublicationTypeList>\n                     <ArticleDate DateType=\"Electronic\">\n                         <Year>2019</Year>\n                         <Month>02</Month>\n                         <Day>04</Day>\n                     </ArticleDate>\n                 </Article>\n                 <MedlineJournalInfo>\n                     <Country>England</Country>\n                     <MedlineTA>Elife</MedlineTA>\n                     <NlmUniqueID>101579614</NlmUniqueID>\n                     <ISSNLinking>2050-084X</ISSNLinking>\n                 </MedlineJournalInfo>\n                 <ChemicalList>\n                     <Chemical>\n                         <RegistryNumber>0</RegistryNumber>\n                         <NameOfSubstance UI=\"C410062\">DISCO Interacting Protein 1, Drosophila</NameOfSubstance>\n                     </Chemical>\n                     <Chemical>\n                         <RegistryNumber>0</RegistryNumber>\n                         <NameOfSubstance UI=\"C083246\">DSIP-immunoreactive peptide</NameOfSubstance>\n                     </Chemical>\n                     <Chemical>\n                         <RegistryNumber>0</RegistryNumber>\n                         <NameOfSubstance UI=\"D029721\">Drosophila Proteins</NameOfSubstance>\n                     </Chemical>\n                     <Chemical>\n                         <RegistryNumber>0</RegistryNumber>\n                         <NameOfSubstance UI=\"D009479\">Neuropeptides</NameOfSubstance>\n                     </Chemical>\n                     <Chemical>\n                         <RegistryNumber>0</RegistryNumber>\n                         <NameOfSubstance UI=\"D014157\">Transcription Factors</NameOfSubstance>\n                     </Chemical>\n                 </ChemicalList>\n                 <CitationSubset>IM</CitationSubset>\n                 <MeshHeadingList>\n                     <MeshHeading>\n                         <DescriptorName UI=\"D000818\" MajorTopicYN=\"N\">Animals</DescriptorName>\n                     </MeshHeading>\n                     <MeshHeading>\n                         <DescriptorName UI=\"D001369\" MajorTopicYN=\"N\">Axons</DescriptorName>\n                         <QualifierName UI=\"Q000378\" MajorTopicYN=\"N\">metabolism</QualifierName>\n                     </MeshHeading>\n                     <MeshHeading>\n                         <DescriptorName UI=\"D029721\" MajorTopicYN=\"N\">Drosophila Proteins</DescriptorName>\n                         <QualifierName UI=\"Q000235\" MajorTopicYN=\"Y\">genetics</QualifierName>\n                         <QualifierName UI=\"Q000378\" MajorTopicYN=\"N\">metabolism</QualifierName>\n                     </MeshHeading>\n                     <MeshHeading>\n                         <DescriptorName UI=\"D004331\" MajorTopicYN=\"N\">Drosophila melanogaster</DescriptorName>\n                         <QualifierName UI=\"Q000235\" MajorTopicYN=\"N\">genetics</QualifierName>\n                         <QualifierName UI=\"Q000502\" MajorTopicYN=\"N\">physiology</QualifierName>\n                     </MeshHeading>\n                     <MeshHeading>\n                         <DescriptorName UI=\"D009046\" MajorTopicYN=\"N\">Motor Neurons</DescriptorName>\n                         <QualifierName UI=\"Q000378\" MajorTopicYN=\"N\">metabolism</QualifierName>\n                         <QualifierName UI=\"Q000502\" MajorTopicYN=\"Y\">physiology</QualifierName>\n                     </MeshHeading>\n                     <MeshHeading>\n                         <DescriptorName UI=\"D055495\" MajorTopicYN=\"N\">Neurogenesis</DescriptorName>\n                         <QualifierName UI=\"Q000235\" MajorTopicYN=\"Y\">genetics</QualifierName>\n                     </MeshHeading>\n                     <MeshHeading>\n                         <DescriptorName UI=\"D009476\" MajorTopicYN=\"N\">Neurons, Efferent</DescriptorName>\n                         <QualifierName UI=\"Q000378\" MajorTopicYN=\"N\">metabolism</QualifierName>\n                     </MeshHeading>\n                     <MeshHeading>\n                         <DescriptorName UI=\"D009479\" MajorTopicYN=\"N\">Neuropeptides</DescriptorName>\n                         <QualifierName UI=\"Q000235\" MajorTopicYN=\"N\">genetics</QualifierName>\n                         <QualifierName UI=\"Q000378\" MajorTopicYN=\"N\">metabolism</QualifierName>\n                     </MeshHeading>\n                     <MeshHeading>\n                         <DescriptorName UI=\"D014157\" MajorTopicYN=\"N\">Transcription Factors</DescriptorName>\n                         <QualifierName UI=\"Q000235\" MajorTopicYN=\"Y\">genetics</QualifierName>\n                         <QualifierName UI=\"Q000378\" MajorTopicYN=\"N\">metabolism</QualifierName>\n                     </MeshHeading>\n                 </MeshHeadingList>\n                 <KeywordList Owner=\"NOTNLM\">\n                     <Keyword MajorTopicYN=\"Y\">D. melanogaster</Keyword>\n                     <Keyword MajorTopicYN=\"Y\">DIP</Keyword>\n                     <Keyword MajorTopicYN=\"Y\">Dpr</Keyword>\n                     <Keyword MajorTopicYN=\"Y\">Ig domain proteins</Keyword>\n                     <Keyword MajorTopicYN=\"Y\">developmental biology</Keyword>\n                     <Keyword MajorTopicYN=\"Y\">leg development</Keyword>\n                     <Keyword MajorTopicYN=\"Y\">motor neuron</Keyword>\n                     <Keyword MajorTopicYN=\"Y\">neuroscience</Keyword>\n                     <Keyword MajorTopicYN=\"Y\">synapse formation</Keyword>\n                 </KeywordList>\n                 <CoiStatement>LV, ZG, SX, LT, QX, SN, RM No competing interests declared</CoiStatement>\n             </MedlineCitation>\n             <PubmedData>\n                 <History>\n                     <PubMedPubDate PubStatus=\"received\">\n                         <Year>2018</Year>\n                         <Month>10</Month>\n                         <Day>09</Day>\n                     </PubMedPubDate>\n                     <PubMedPubDate PubStatus=\"accepted\">\n                         <Year>2019</Year>\n                         <Month>01</Month>\n                         <Day>31</Day>\n                     </PubMedPubDate>\n                     <PubMedPubDate PubStatus=\"pubmed\">\n                         <Year>2019</Year>\n                         <Month>2</Month>\n                         <Day>5</Day>\n                         <Hour>6</Hour>\n                         <Minute>0</Minute>\n                     </PubMedPubDate>\n                     <PubMedPubDate PubStatus=\"medline\">\n                         <Year>2020</Year>\n                         <Month>4</Month>\n                         <Day>11</Day>\n                         <Hour>6</Hour>\n                         <Minute>0</Minute>\n                     </PubMedPubDate>\n                     <PubMedPubDate PubStatus=\"entrez\">\n                         <Year>2019</Year>\n                         <Month>2</Month>\n                         <Day>5</Day>\n                         <Hour>6</Hour>\n                         <Minute>0</Minute>\n                     </PubMedPubDate>\n                 </History>\n                 <PublicationStatus>epublish</PublicationStatus>\n                 <ArticleIdList>\n                     <ArticleId IdType=\"pubmed\">30714901</ArticleId>\n                     <ArticleId IdType=\"doi\">10.7554/eLife.42692</ArticleId>\n                     <ArticleId IdType=\"pii\">42692</ArticleId>\n                     <ArticleId IdType=\"pmc\">PMC6391070</ArticleId>\n                 </ArticleIdList>\n                 <ReferenceList>\n                     <Reference>\n                         <Citation>Annu Rev Cell Dev Biol. 2015;31:669-98</Citation>\n                         <ArticleIdList>\n                             <ArticleId IdType=\"pubmed\">26393773</ArticleId>\n                         </ArticleIdList>\n                     </Reference>\n                     <Reference>\n                         <Citation>Elife. 2019 Feb 04;8:</Citation>\n                         <ArticleIdList>\n                             <ArticleId IdType=\"pubmed\">30714906</ArticleId>\n                         </ArticleIdList>\n                     </Reference>\n                     <Reference>\n                         <Citation>Cell. 2013 Jul 3;154(1):228-39</Citation>\n                         <ArticleIdList>\n                             <ArticleId IdType=\"pubmed\">23827685</ArticleId>\n                         </ArticleIdList>\n                     </Reference>\n                     <Reference>\n                         <Citation>Development. 2004 Dec;131(24):6041-51</Citation>\n                         <ArticleIdList>\n                             <ArticleId IdType=\"pubmed\">15537687</ArticleId>\n                         </ArticleIdList>\n                     </Reference>\n                     <Reference>\n                         <Citation>Genetics. 2000 Oct;156(2):723-31</Citation>\n                         <ArticleIdList>\n                             <ArticleId IdType=\"pubmed\">11014819</ArticleId>\n                         </ArticleIdList>\n                     </Reference>\n                     <Reference>\n                         <Citation>Neuron. 2005 Dec 22;48(6):949-64</Citation>\n                         <ArticleIdList>\n                             <ArticleId IdType=\"pubmed\">16364899</ArticleId>\n                         </ArticleIdList>\n                     </Reference>\n                     <Reference>\n                         <Citation>J Cachexia Sarcopenia Muscle. 2012 Mar;3(1):13-23</Citation>\n                         <ArticleIdList>\n                             <ArticleId IdType=\"pubmed\">22450265</ArticleId>\n                         </ArticleIdList>\n                     </Reference>\n                     <Reference>\n                         <Citation>Neuron. 1994 Aug;13(2):405-14</Citation>\n                         <ArticleIdList>\n                             <ArticleId IdType=\"pubmed\">8060618</ArticleId>\n                         </ArticleIdList>\n                     </Reference>\n                     <Reference>\n                         <Citation>Development. 2014 Dec;141(24):4667-80</Citation>\n                         <ArticleIdList>\n                             <ArticleId IdType=\"pubmed\">25468936</ArticleId>\n                         </ArticleIdList>\n                     </Reference>\n                     <Reference>\n                         <Citation>Adv Exp Med Biol. 2014;800:133-48</Citation>\n                         <ArticleIdList>\n                             <ArticleId IdType=\"pubmed\">24243104</ArticleId>\n                         </ArticleIdList>\n                     </Reference>\n                     <Reference>\n                         <Citation>PLoS One. 2006 Dec 27;1:e122</Citation>\n                         <ArticleIdList>\n                             <ArticleId IdType=\"pubmed\">17205126</ArticleId>\n                         </ArticleIdList>\n                     </Reference>\n                     <Reference>\n                         <Citation>J Neurosci. 1998 May 1;18(9):3297-313</Citation>\n                         <ArticleIdList>\n                             <ArticleId IdType=\"pubmed\">9547238</ArticleId>\n                         </ArticleIdList>\n                     </Reference>\n                     <Reference>\n                         <Citation>PLoS Genet. 2018 Aug 13;14(8):e1007560</Citation>\n                         <ArticleIdList>\n                             <ArticleId IdType=\"pubmed\">30102700</ArticleId>\n                         </ArticleIdList>\n                     </Reference>\n                     <Reference>\n                         <Citation>J Vis Exp. 2018 Oct 30;(140):</Citation>\n                         <ArticleIdList>\n                             <ArticleId IdType=\"pubmed\">30451217</ArticleId>\n                         </ArticleIdList>\n                     </Reference>\n                     <Reference>\n                         <Citation>Dev Biol. 2001 Jan 1;229(1):55-70</Citation>\n                         <ArticleIdList>\n                             <ArticleId IdType=\"pubmed\">11133154</ArticleId>\n                         </ArticleIdList>\n                     </Reference>\n                     <Reference>\n                         <Citation>Neuron. 2018 Feb 7;97(3):538-554.e5</Citation>\n                         <ArticleIdList>\n                             <ArticleId IdType=\"pubmed\">29395908</ArticleId>\n                         </ArticleIdList>\n                     </Reference>\n                     <Reference>\n                         <Citation>Curr Biol. 2016 Oct 24;26(20):R1022-R1038</Citation>\n                         <ArticleIdList>\n                             <ArticleId IdType=\"pubmed\">27780045</ArticleId>\n                         </ArticleIdList>\n                     </Reference>\n                     <Reference>\n                         <Citation>Nat Biotechnol. 2010 Apr;28(4):348-53</Citation>\n                         <ArticleIdList>\n                             <ArticleId IdType=\"pubmed\">20231818</ArticleId>\n                         </ArticleIdList>\n                     </Reference>\n                     <Reference>\n                         <Citation>Annu Rev Cell Dev Biol. 2009;25:161-95</Citation>\n                         <ArticleIdList>\n                             <ArticleId IdType=\"pubmed\">19575668</ArticleId>\n                         </ArticleIdList>\n                     </Reference>\n                     <Reference>\n                         <Citation>Nat Methods. 2011 Sep;8(9):737-43</Citation>\n                         <ArticleIdList>\n                             <ArticleId IdType=\"pubmed\">21985007</ArticleId>\n                         </ArticleIdList>\n                     </Reference>\n                     <Reference>\n                         <Citation>Cell. 2015 Dec 17;163(7):1756-69</Citation>\n                         <ArticleIdList>\n                             <ArticleId IdType=\"pubmed\">26687360</ArticleId>\n                         </ArticleIdList>\n                     </Reference>\n                     <Reference>\n                         <Citation>Cell Mol Life Sci. 2017 Nov;74(22):4133-4157</Citation>\n                         <ArticleIdList>\n                             <ArticleId IdType=\"pubmed\">28631008</ArticleId>\n                         </ArticleIdList>\n                     </Reference>\n                     <Reference>\n                         <Citation>Nat Commun. 2014 Jul 11;5:4342</Citation>\n                         <ArticleIdList>\n                             <ArticleId IdType=\"pubmed\">25014658</ArticleId>\n                         </ArticleIdList>\n                     </Reference>\n                     <Reference>\n                         <Citation>Elife. 2016 Feb 29;5:e11572</Citation>\n                         <ArticleIdList>\n                             <ArticleId IdType=\"pubmed\">26926907</ArticleId>\n                         </ArticleIdList>\n                     </Reference>\n                     <Reference>\n                         <Citation>J Neurosci. 2009 May 27;29(21):6904-16</Citation>\n                         <ArticleIdList>\n                             <ArticleId IdType=\"pubmed\">19474317</ArticleId>\n                         </ArticleIdList>\n                     </Reference>\n                     <Reference>\n                         <Citation>Gene Expr Patterns. 2006 Mar;6(3):299-309</Citation>\n                         <ArticleIdList>\n                             <ArticleId IdType=\"pubmed\">16378756</ArticleId>\n                         </ArticleIdList>\n                     </Reference>\n                     <Reference>\n                         <Citation>Neuron. 2008 Dec 26;60(6):1039-53</Citation>\n                         <ArticleIdList>\n                             <ArticleId IdType=\"pubmed\">19109910</ArticleId>\n                         </ArticleIdList>\n                     </Reference>\n                     <Reference>\n                         <Citation>Neural Dev. 2018 Apr 19;13(1):6</Citation>\n                         <ArticleIdList>\n                             <ArticleId IdType=\"pubmed\">29673388</ArticleId>\n                         </ArticleIdList>\n                     </Reference>\n                     <Reference>\n                         <Citation>Cell. 2015 Dec 17;163(7):1770-1782</Citation>\n                         <ArticleIdList>\n                             <ArticleId IdType=\"pubmed\">26687361</ArticleId>\n                         </ArticleIdList>\n                     </Reference>\n                     <Reference>\n                         <Citation>Curr Opin Neurobiol. 2014 Aug;27:1-7</Citation>\n                         <ArticleIdList>\n                             <ArticleId IdType=\"pubmed\">24598309</ArticleId>\n                         </ArticleIdList>\n                     </Reference>\n                     <Reference>\n                         <Citation>Curr Opin Neurobiol. 2007 Feb;17(1):35-42</Citation>\n                         <ArticleIdList>\n                             <ArticleId IdType=\"pubmed\">17229568</ArticleId>\n                         </ArticleIdList>\n                     </Reference>\n                     <Reference>\n                         <Citation>Nat Methods. 2012 Jun 28;9(7):676-82</Citation>\n                         <ArticleIdList>\n                             <ArticleId IdType=\"pubmed\">22743772</ArticleId>\n                         </ArticleIdList>\n                     </Reference>\n                     <Reference>\n                         <Citation>Genetics. 2014 Jan;196(1):17-29</Citation>\n                         <ArticleIdList>\n                             <ArticleId IdType=\"pubmed\">24395823</ArticleId>\n                         </ArticleIdList>\n                     </Reference>\n                     <Reference>\n                         <Citation>Cell. 1993 Jun 18;73(6):1137-53</Citation>\n                         <ArticleIdList>\n                             <ArticleId IdType=\"pubmed\">8513498</ArticleId>\n                         </ArticleIdList>\n                     </Reference>\n                     <Reference>\n                         <Citation>Dev Biol. 1988 Dec;130(2):645-70</Citation>\n                         <ArticleIdList>\n                             <ArticleId IdType=\"pubmed\">3058545</ArticleId>\n                         </ArticleIdList>\n                     </Reference>\n                     <Reference>\n                         <Citation>Elife. 2018 Mar 05;7:</Citation>\n                         <ArticleIdList>\n                             <ArticleId IdType=\"pubmed\">29504935</ArticleId>\n                         </ArticleIdList>\n                     </Reference>\n                     <Reference>\n                         <Citation>Science. 1995 Feb 3;267(5198):688-93</Citation>\n                         <ArticleIdList>\n                             <ArticleId IdType=\"pubmed\">7839146</ArticleId>\n                         </ArticleIdList>\n                     </Reference>\n                     <Reference>\n                         <Citation>Annu Rev Cell Dev Biol. 2008;24:597-620</Citation>\n                         <ArticleIdList>\n                             <ArticleId IdType=\"pubmed\">18837673</ArticleId>\n                         </ArticleIdList>\n                     </Reference>\n                     <Reference>\n                         <Citation>Cold Spring Harb Perspect Biol. 2010 Mar;2(3):a001735</Citation>\n                         <ArticleIdList>\n                             <ArticleId IdType=\"pubmed\">20300210</ArticleId>\n                         </ArticleIdList>\n                     </Reference>\n                     <Reference>\n                         <Citation>Cell Rep. 2017 Oct 24;21(4):867-877</Citation>\n                         <ArticleIdList>\n                             <ArticleId IdType=\"pubmed\">29069594</ArticleId>\n                         </ArticleIdList>\n                     </Reference>\n                     <Reference>\n                         <Citation>J Neurosci. 1989 Feb;9(2):710-25</Citation>\n                         <ArticleIdList>\n                             <ArticleId IdType=\"pubmed\">2563766</ArticleId>\n                         </ArticleIdList>\n                     </Reference>\n                     <Reference>\n                         <Citation>Neuron. 2015 May 20;86(4):955-970</Citation>\n                         <ArticleIdList>\n                             <ArticleId IdType=\"pubmed\">25959734</ArticleId>\n                         </ArticleIdList>\n                     </Reference>\n                     <Reference>\n                         <Citation>Elife. 2018 Mar 22;7:</Citation>\n                         <ArticleIdList>\n                             <ArticleId IdType=\"pubmed\">29565247</ArticleId>\n                         </ArticleIdList>\n                     </Reference>\n                     <Reference>\n                         <Citation>Brain Res. 1977 Aug 26;132(2):197-208</Citation>\n                         <ArticleIdList>\n                             <ArticleId IdType=\"pubmed\">890480</ArticleId>\n                         </ArticleIdList>\n                     </Reference>\n                     <Reference>\n                         <Citation>Neuron. 2017 Mar 22;93(6):1388-1404.e10</Citation>\n                         <ArticleIdList>\n                             <ArticleId IdType=\"pubmed\">28285823</ArticleId>\n                         </ArticleIdList>\n                     </Reference>\n                     <Reference>\n                         <Citation>Neuron. 2013 Oct 2;80(1):12-34</Citation>\n                         <ArticleIdList>\n                             <ArticleId IdType=\"pubmed\">24094100</ArticleId>\n                         </ArticleIdList>\n                     </Reference>\n                     <Reference>\n                         <Citation>Trends Neurosci. 2001 May;24(5):251-4</Citation>\n                         <ArticleIdList>\n                             <ArticleId IdType=\"pubmed\">11311363</ArticleId>\n                         </ArticleIdList>\n                     </Reference>\n                     <Reference>\n                         <Citation>Curr Opin Neurobiol. 2013 Dec;23(6):1018-26</Citation>\n                         <ArticleIdList>\n                             <ArticleId IdType=\"pubmed\">23932598</ArticleId>\n                         </ArticleIdList>\n                     </Reference>\n                     <Reference>\n                         <Citation>Genetics. 2016 Aug;203(4):1613-28</Citation>\n                         <ArticleIdList>\n                             <ArticleId IdType=\"pubmed\">27334272</ArticleId>\n                         </ArticleIdList>\n                     </Reference>\n                     <Reference>\n                         <Citation>Curr Opin Neurobiol. 2006 Feb;16(1):74-82</Citation>\n                         <ArticleIdList>\n                             <ArticleId IdType=\"pubmed\">16386415</ArticleId>\n                         </ArticleIdList>\n                     </Reference>\n                     <Reference>\n                         <Citation>Cell Rep. 2015 Mar 3;10(8):1410-21</Citation>\n                         <ArticleIdList>\n                             <ArticleId IdType=\"pubmed\">25732830</ArticleId>\n                         </ArticleIdList>\n                     </Reference>\n                     <Reference>\n                         <Citation>Cell. 1998 May 15;93(4):581-91</Citation>\n                         <ArticleIdList>\n                             <ArticleId IdType=\"pubmed\">9604933</ArticleId>\n                         </ArticleIdList>\n                     </Reference>\n                     <Reference>\n                         <Citation>J Comp Neurol. 2012 Jun 1;520(8):1629-49</Citation>\n                         <ArticleIdList>\n                             <ArticleId IdType=\"pubmed\">22120935</ArticleId>\n                         </ArticleIdList>\n                     </Reference>\n                     <Reference>\n                         <Citation>Neuron. 2018 Dec 19;100(6):1385-1400.e6</Citation>\n                         <ArticleIdList>\n                             <ArticleId IdType=\"pubmed\">30467080</ArticleId>\n                         </ArticleIdList>\n                     </Reference>\n                     <Reference>\n                         <Citation>PLoS Biol. 2003 Nov;1(2):E41</Citation>\n                         <ArticleIdList>\n                             <ArticleId IdType=\"pubmed\">14624243</ArticleId>\n                         </ArticleIdList>\n                     </Reference>\n                     <Reference>\n                         <Citation>Int J Dev Neurosci. 2001 Apr;19(2):175-82</Citation>\n                         <ArticleIdList>\n                             <ArticleId IdType=\"pubmed\">11255031</ArticleId>\n                         </ArticleIdList>\n                     </Reference>\n                     <Reference>\n                         <Citation>Nat Methods. 2012 Jul;9(7):671-5</Citation>\n                         <ArticleIdList>\n                             <ArticleId IdType=\"pubmed\">22930834</ArticleId>\n                         </ArticleIdList>\n                     </Reference>\n                     <Reference>\n                         <Citation>J Neurophysiol. 2004 May;91(5):2353-65</Citation>\n                         <ArticleIdList>\n                             <ArticleId IdType=\"pubmed\">14695352</ArticleId>\n                         </ArticleIdList>\n                     </Reference>\n                     <Reference>\n                         <Citation>Neuron. 2018 Dec 19;100(6):1369-1384.e6</Citation>\n                         <ArticleIdList>\n                             <ArticleId IdType=\"pubmed\">30467079</ArticleId>\n                         </ArticleIdList>\n                     </Reference>\n                     <Reference>\n                         <Citation>Elife. 2015 Mar 31;4:</Citation>\n                         <ArticleIdList>\n                             <ArticleId IdType=\"pubmed\">25824290</ArticleId>\n                         </ArticleIdList>\n                     </Reference>\n                 </ReferenceList>\n             </PubmedData>\n         </PubmedArticle>\n         \n         </PubmedArticleSet>",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Stereotyped terminal axon branching of leg motor neurons mediated by IgSF proteins DIP-α and Dpr10",
				"creators": [
					{
						"firstName": "Lalanti",
						"lastName": "Venkatasubramanian",
						"creatorType": "author"
					},
					{
						"firstName": "Zhenhao",
						"lastName": "Guo",
						"creatorType": "author"
					},
					{
						"firstName": "Shuwa",
						"lastName": "Xu",
						"creatorType": "author"
					},
					{
						"firstName": "Liming",
						"lastName": "Tan",
						"creatorType": "author"
					},
					{
						"firstName": "Qi",
						"lastName": "Xiao",
						"creatorType": "author"
					},
					{
						"firstName": "Sonal",
						"lastName": "Nagarkar-Jaiswal",
						"creatorType": "author"
					},
					{
						"firstName": "Richard S.",
						"lastName": "Mann",
						"creatorType": "author"
					}
				],
				"date": "2019-02-04",
				"DOI": "10.7554/eLife.42692",
				"ISSN": "2050-084X",
				"abstractNote": "For animals to perform coordinated movements requires the precise organization of neural circuits controlling motor function. Motor neurons (MNs), key components of these circuits, project their axons from the central nervous system and form precise terminal branching patterns at specific muscles. Focusing on the Drosophila leg neuromuscular system, we show that the stereotyped terminal branching of a subset of MNs is mediated by interacting transmembrane Ig superfamily proteins DIP-α and Dpr10, present in MNs and target muscles, respectively. The DIP-α/Dpr10 interaction is needed only after MN axons reach the vicinity of their muscle targets. Live imaging suggests that precise terminal branching patterns are gradually established by DIP-α/Dpr10-dependent interactions between fine axon filopodia and developing muscles. Further, different leg MNs depend on the DIP-α and Dpr10 interaction to varying degrees that correlate with the morphological complexity of the MNs and their muscle targets.",
				"extra": "PMID: 30714901\nPMCID: PMC6391070",
				"journalAbbreviation": "Elife",
				"language": "eng",
				"pages": "e42692",
				"publicationTitle": "eLife",
				"volume": "8",
				"attachments": [
					{
						"title": "PubMed entry",
						"mimeType": "text/html",
						"snapshot": false
					}
				],
				"tags": [
					{
						"tag": "Animals"
					},
					{
						"tag": "Axons"
					},
					{
						"tag": "D. melanogaster"
					},
					{
						"tag": "DIP"
					},
					{
						"tag": "Dpr"
					},
					{
						"tag": "Drosophila Proteins"
					},
					{
						"tag": "Drosophila melanogaster"
					},
					{
						"tag": "Ig domain proteins"
					},
					{
						"tag": "Motor Neurons"
					},
					{
						"tag": "Neurogenesis"
					},
					{
						"tag": "Neurons, Efferent"
					},
					{
						"tag": "Neuropeptides"
					},
					{
						"tag": "Transcription Factors"
					},
					{
						"tag": "developmental biology"
					},
					{
						"tag": "leg development"
					},
					{
						"tag": "motor neuron"
					},
					{
						"tag": "neuroscience"
					},
					{
						"tag": "synapse formation"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "import",
		"input": "<?xml version=\"1.0\"?>\n<!DOCTYPE PubmedArticleSet PUBLIC \"-//NLM//DTD PubMedArticle, 1st January 2015//EN\" \"http://www.ncbi.nlm.nih.gov/corehtml/query/DTD/pubmed_150101.dtd\">\n<PubmedArticleSet>\n<PubmedArticle>\n    <MedlineCitation Status=\"In-Process\" Owner=\"NLM\">\n        <PMID Version=\"1\">29292925</PMID>\n        <DateRevised>\n            <Year>2018</Year>\n            <Month>01</Month>\n            <Day>02</Day>\n        </DateRevised>\n        <Article PubModel=\"Electronic\">\n            <Journal>\n                <ISSN IssnType=\"Electronic\">1652-7518</ISSN>\n                <JournalIssue CitedMedium=\"Internet\">\n                    <Volume>114</Volume>\n                    <PubDate>\n                        <Year>2017</Year>\n                        <Month>Nov</Month>\n                        <Day>09</Day>\n                    </PubDate>\n                </JournalIssue>\n                <Title>Lakartidningen</Title>\n                <ISOAbbreviation>Lakartidningen</ISOAbbreviation>\n            </Journal>\n            <ArticleTitle/>\n            <ELocationID EIdType=\"pii\" ValidYN=\"Y\">EWLS</ELocationID>\n            <Abstract>\n                <AbstractText>Mental illness and terrorism There is little evidence supporting the concept of mental illness as a part of, or reason behind radicalization towards violent extremism and terrorism. There is weak evidence that lone gunmen, particularly those involved in school shootings, may suffer from mental illness to a larger degree than the general population, whereas organized terrorist groups such as jihadists and right-wing extremists seem to avoid mentally unstable individuals. Clinical use of the instruments developed for screening and risk assessment of individuals suspected of radicalization towards violent extremism will compromise the trust placed in the Swedish health care system by the citizens it is there to serve. The usage of empirically grounded risk assessment instruments should be restricted to forensic psychiatric clinics. Individuals at risk of radicalization towards violent extremism who present signs and symptoms of mental illness should be offered psychiatric treatment.</AbstractText>\n            </Abstract>\n            <AuthorList CompleteYN=\"Y\">\n                <Author ValidYN=\"Y\">\n                    <LastName>Köhler</LastName>\n                    <ForeName>Per</ForeName>\n                    <Initials>P</Initials>\n                    <AffiliationInfo>\n                        <Affiliation>n/a - Vuxenpsykiatrin Malmö Malmö, Sweden n/a - Vuxenpsykiatrin Malmö Malmö, Sweden.</Affiliation>\n                    </AffiliationInfo>\n                </Author>\n                <Author ValidYN=\"Y\">\n                    <LastName>Krona</LastName>\n                    <ForeName>Hedvig</ForeName>\n                    <Initials>H</Initials>\n                    <AffiliationInfo>\n                        <Affiliation>Lunds Universitet - Medicinska fakulteten Lund, Sweden Lunds Universitet - Medicinska fakulteten Lund, Sweden.</Affiliation>\n                    </AffiliationInfo>\n                </Author>\n                <Author ValidYN=\"Y\">\n                    <LastName>Josefsson</LastName>\n                    <ForeName>Johanna</ForeName>\n                    <Initials>J</Initials>\n                    <AffiliationInfo>\n                        <Affiliation>Psykiatri Skåne - Vuxenpsykiatriska kliniken Malmö Malmö, Sweden Psykiatri Skåne - Vuxenpsykiatriska kliniken Malmö Malmö, Sweden.</Affiliation>\n                    </AffiliationInfo>\n                </Author>\n            </AuthorList>\n            <Language>swe</Language>\n            <PublicationTypeList>\n                <PublicationType UI=\"D004740\">English Abstract</PublicationType>\n                <PublicationType UI=\"D016428\">Journal Article</PublicationType>\n            </PublicationTypeList>\n            <VernacularTitle>Psykisk ohälsa, radikalisering och terrorism - Inget säkert samband har kunnat påvisas.</VernacularTitle>\n            <ArticleDate DateType=\"Electronic\">\n                <Year>2017</Year>\n                <Month>11</Month>\n                <Day>09</Day>\n            </ArticleDate>\n        </Article>\n        <MedlineJournalInfo>\n            <Country>Sweden</Country>\n            <MedlineTA>Lakartidningen</MedlineTA>\n            <NlmUniqueID>0027707</NlmUniqueID>\n            <ISSNLinking>0023-7205</ISSNLinking>\n        </MedlineJournalInfo>\n    </MedlineCitation>\n</PubmedArticle>\n\n</PubmedArticleSet>\n",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Psykisk ohälsa, radikalisering och terrorism - Inget säkert samband har kunnat påvisas",
				"creators": [
					{
						"firstName": "Per",
						"lastName": "Köhler",
						"creatorType": "author"
					},
					{
						"firstName": "Hedvig",
						"lastName": "Krona",
						"creatorType": "author"
					},
					{
						"firstName": "Johanna",
						"lastName": "Josefsson",
						"creatorType": "author"
					}
				],
				"date": "2017-11-09",
				"ISSN": "1652-7518",
				"abstractNote": "Mental illness and terrorism There is little evidence supporting the concept of mental illness as a part of, or reason behind radicalization towards violent extremism and terrorism. There is weak evidence that lone gunmen, particularly those involved in school shootings, may suffer from mental illness to a larger degree than the general population, whereas organized terrorist groups such as jihadists and right-wing extremists seem to avoid mentally unstable individuals. Clinical use of the instruments developed for screening and risk assessment of individuals suspected of radicalization towards violent extremism will compromise the trust placed in the Swedish health care system by the citizens it is there to serve. The usage of empirically grounded risk assessment instruments should be restricted to forensic psychiatric clinics. Individuals at risk of radicalization towards violent extremism who present signs and symptoms of mental illness should be offered psychiatric treatment.",
				"extra": "PMID: 29292925",
				"journalAbbreviation": "Lakartidningen",
				"language": "swe",
				"pages": "EWLS",
				"publicationTitle": "Lakartidningen",
				"volume": "114",
				"attachments": [
					{
						"title": "PubMed entry",
						"mimeType": "text/html",
						"snapshot": false
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
