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
	"lastUpdated": "2026-05-21 14:52:55"
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
		var citation = ZU.xpath(articles[i], 'MedlineCitation')[0];

		var article = ZU.xpath(citation, 'Article')[0];
		let isPreprint = !!ZU.xpath(article, 'PublicationTypeList/PublicationType[@UI="D000076942"]').length; // Preprint subject heading

		let newItem = new Zotero.Item(isPreprint ? "preprint" : "journalArticle");

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
		if (newItem.itemType == 'journalArticle') {
			if (!newItem.pages) {
				newItem.pages = ZU.xpathText(article, 'ELocationID[@EIdType="pii"]');
			}
		}
		else if (newItem.itemType == 'preprint') {
			newItem.archiveID = ZU.xpathText(article, 'ELocationID[@EIdType="pii"]');
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
				// Move parenthesized place name at end of journal title to place field
				title = title.replace(/ \(([^)]+)\)$/, (_, place) => {
					newItem.place = place;
					return '';
				});
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
			if (newItem.itemType == 'preprint') {
				newItem.repository = newItem.publicationTitle;
				delete newItem.publicationTitle;
				delete newItem.journalAbbreviation;
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
			newItem.PMID = PMID;
			// this is a catalog, so we should store links as attachments
			newItem.attachments.push({
				title: "PubMed entry",
				url: "http://www.ncbi.nlm.nih.gov/pubmed/" + PMID,
				mimeType: "text/html",
				snapshot: false
			});
		}

		if (PMCID) {
			newItem.PMCID = PMCID;
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
				"PMID": "18157122",
				"abstractNote": "Drug screening is often limited to cell-free assays involving purified enzymes, but it is arguably best applied against systems that represent disease states or complex physiological cellular networks. Here, we describe a high-content, cell-based drug discovery platform based on phosphospecific flow cytometry, or phosphoflow, that enabled screening for inhibitors against multiple endogenous kinase signaling pathways in heterogeneous primary cell populations at the single-cell level. From a library of small-molecule natural products, we identified pathway-selective inhibitors of Jak-Stat and MAP kinase signaling. Dose-response experiments in primary cells confirmed pathway selectivity, but importantly also revealed differential inhibition of cell types and new druggability trends across multiple compounds. Lead compound selectivity was confirmed in vivo in mice. Phosphoflow therefore provides a unique platform that can be applied throughout the drug discovery process, from early compound screening to in vivo testing and clinical monitoring of drug efficacy.",
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
				"PMID": "18157123",
				"abstractNote": "X-ray crystallographic and biochemical investigation of the reaction of cisplatin and oxaliplatin with nucleosome core particle and naked DNA reveals that histone octamer association can modulate DNA platination. Adduct formation also occurs at specific histone methionine residues, which could serve as a nuclear platinum reservoir influencing adduct transfer to DNA. Our findings suggest that the nucleosome center may provide a favorable target for the design of improved platinum anticancer drugs.",
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
				"PMID": "26074225",
				"abstractNote": "As part of a broader control strategy within herds known to be infected with Mycobacterium avium ssp. paratuberculosis (MAP), individual animal testing is generally conducted to identify infected animals for action, usually culling. Opportunities are now available to quantitatively compare different testing strategies (combinations of tests) in known infected herds. This study evaluates the effectiveness, cost, and cost-effectiveness of different testing strategies to identify infected animals at a single round of testing within dairy herds known to be MAP infected. A model was developed, taking account of both within-herd infection dynamics and test performance, to simulate the use of different tests at a single round of testing in a known infected herd. Model inputs included the number of animals at different stages of infection, the sensitivity and specificity of each test, and the costs of testing and culling. Testing strategies included either milk or serum ELISA alone or with fecal culture in series. Model outputs included effectiveness (detection fraction, the proportion of truly infected animals in the herd that are successfully detected by the testing strategy), cost, and cost-effectiveness (testing cost per true positive detected, total cost per true positive detected). Several assumptions were made: MAP was introduced with a single animal and no management interventions were implemented to limit within-herd transmission of MAP before this test. In medium herds, between 7 and 26% of infected animals are detected at a single round of testing, the former using the milk ELISA and fecal culture in series 5 yr after MAP introduction and the latter using fecal culture alone 15 yr after MAP introduction. The combined costs of testing and culling at a single round of testing increases with time since introduction of MAP infection, with culling costs being much greater than testing costs. The cost-effectiveness of testing varied by testing strategy. It was also greater at 5 yr, compared with 10 or 15 yr, since MAP introduction, highlighting the importance of early detection. Future work is needed to evaluate these testing strategies in subsequent rounds of testing as well as accounting for different herd dynamics and different levels of herd biocontainment.",
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
				"PMCID": "PMC4495770",
				"PMID": "26166904",
				"abstractNote": "Hierarchical group testing is widely used to test individuals for diseases. This testing procedure works by first amalgamating individual specimens into groups for testing. Groups testing negatively have their members declared negative. Groups testing positively are subsequently divided into smaller subgroups and are then retested to search for positive individuals. In our paper, we propose a new class of informative retesting procedures for hierarchical group testing that acknowledges heterogeneity among individuals. These procedures identify the optimal number of groups and their sizes at each testing stage in order to minimize the expected number of tests. We apply our proposals in two settings: 1) HIV testing programs that currently use three-stage hierarchical testing and 2) chlamydia and gonorrhea screening practices that currently use individual testing. For both applications, we show that substantial savings can be realized by our new procedures.",
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
				"PMID": "20729678",
				"abstractNote": "Zotero is a powerful free personal bibliographic manager (PBM) for writers. Use of a PBM allows the writer to focus on content, rather than the tedious details of formatting citations and references. Zotero 2.0 (http://www.zotero.org) has new features including the ability to synchronize citations with the off-site Zotero server and the ability to collaborate and share with others. An overview on how to use the software and discussion about the strengths and limitations are included.",
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
				"PMID": "30133126",
				"abstractNote": "Adhesion molecules of the immunoglobulin superfamily (IgSF) are essential for neuronal synapse development across evolution and control various aspects of synapse formation and maturation. Neph2, also known as Kirrel3, is an IgSF adhesion molecule implicated in synapse formation, synaptic transmission and ultrastructure. In humans, defects in the NEPH2 gene have been associated with neurodevelopmental disorders such as Jacobsen syndrome, intellectual disability, and autism-spectrum disorders. However, the precise role in development and function of the nervous system is still unclear. Here, we present the histomorphological and phenotypical analysis of a constitutive Neph2-knockout mouse line. Knockout mice display defects in auditory sensory processing, motor skills, and hyperactivity in the home-cage analysis. Olfactory, memory and metabolic testing did not differ from controls. Despite the wide-spread expression of Neph2 in various brain areas, no gross anatomic defects could be observed. Neph2 protein could be located at the cerebellar pinceaux. It interacted with the pinceau core component neurofascin and other synaptic proteins thus suggesting a possible role in cerebellar synapse formation and circuit assembly. Our results suggest that Neph2/Kirrel3 acts on the synaptic ultrastructural level and neuronal wiring rather than on ontogenetic events affecting macroscopic structure. Neph2-knockout mice may provide a valuable rodent model for research on autism spectrum diseases and neurodevelopmental disorders.",
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
				"PMCID": "PMC6391070",
				"PMID": "30714901",
				"abstractNote": "For animals to perform coordinated movements requires the precise organization of neural circuits controlling motor function. Motor neurons (MNs), key components of these circuits, project their axons from the central nervous system and form precise terminal branching patterns at specific muscles. Focusing on the Drosophila leg neuromuscular system, we show that the stereotyped terminal branching of a subset of MNs is mediated by interacting transmembrane Ig superfamily proteins DIP-α and Dpr10, present in MNs and target muscles, respectively. The DIP-α/Dpr10 interaction is needed only after MN axons reach the vicinity of their muscle targets. Live imaging suggests that precise terminal branching patterns are gradually established by DIP-α/Dpr10-dependent interactions between fine axon filopodia and developing muscles. Further, different leg MNs depend on the DIP-α and Dpr10 interaction to varying degrees that correlate with the morphological complexity of the MNs and their muscle targets.",
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
				"PMID": "29292925",
				"abstractNote": "Mental illness and terrorism There is little evidence supporting the concept of mental illness as a part of, or reason behind radicalization towards violent extremism and terrorism. There is weak evidence that lone gunmen, particularly those involved in school shootings, may suffer from mental illness to a larger degree than the general population, whereas organized terrorist groups such as jihadists and right-wing extremists seem to avoid mentally unstable individuals. Clinical use of the instruments developed for screening and risk assessment of individuals suspected of radicalization towards violent extremism will compromise the trust placed in the Swedish health care system by the citizens it is there to serve. The usage of empirically grounded risk assessment instruments should be restricted to forensic psychiatric clinics. Individuals at risk of radicalization towards violent extremism who present signs and symptoms of mental illness should be offered psychiatric treatment.",
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
	},
	{
		"type": "import",
		"input": "<?xml version=\"1.0\" ?>\n<!DOCTYPE PubmedArticleSet PUBLIC \"-//NLM//DTD PubMedArticle, 1st January 2025//EN\" \"https://dtd.nlm.nih.gov/ncbi/pubmed/out/pubmed_250101.dtd\">\n<PubmedArticleSet>\n<PubmedArticle><MedlineCitation Status=\"MEDLINE\" Owner=\"NLM\" IndexingMethod=\"Manual\"><PMID Version=\"1\">33760390</PMID><DateCompleted><Year>2021</Year><Month>09</Month><Day>20</Day></DateCompleted><DateRevised><Year>2021</Year><Month>09</Month><Day>20</Day></DateRevised><Article PubModel=\"Print-Electronic\"><Journal><ISSN IssnType=\"Electronic\">2326-5205</ISSN><JournalIssue CitedMedium=\"Internet\"><Volume>73</Volume><Issue>9</Issue><PubDate><Year>2021</Year><Month>Sep</Month></PubDate></JournalIssue><Title>Arthritis &amp; rheumatology (Hoboken, N.J.)</Title><ISOAbbreviation>Arthritis Rheumatol</ISOAbbreviation></Journal><ArticleTitle>Association of Machine Learning-Based Predictions of Medial Knee Contact Force With Cartilage Loss Over 2.5 Years in Knee Osteoarthritis.</ArticleTitle><Pagination><StartPage>1638</StartPage><EndPage>1645</EndPage><MedlinePgn>1638-1645</MedlinePgn></Pagination><ELocationID EIdType=\"doi\" ValidYN=\"Y\">10.1002/art.41735</ELocationID><Abstract><AbstractText Label=\"OBJECTIVE\">The relationship between in vivo knee load predictions and longitudinal cartilage changes has not been investigated. We undertook this study to develop an equation to predict the medial tibiofemoral contact force (MCF) peak during walking in persons with instrumented knee implants, and to apply this equation to determine the relationship between the predicted MCF peak and cartilage loss in patients with knee osteoarthritis (OA).</AbstractText><AbstractText Label=\"METHODS\">In adults with knee OA (39 women, 8 men; mean &#xb1; SD age 61.1 &#xb1; 6.8 years), baseline biomechanical gait analyses were performed, and annualized change in medial tibial cartilage volume (mm<sup>3</sup> /year) over 2.5 years was determined using magnetic resonance imaging. In a separate sample of patients with force-measuring tibial prostheses (3 women, 6 men; mean &#xb1; SD age 70.3 &#xb1; 5.2 years), gait data plus in vivo knee loads were used to develop an equation to predict the MCF peak using machine learning. This equation was then applied to the knee OA group, and the relationship between the predicted MCF peak and annualized cartilage volume change was determined.</AbstractText><AbstractText Label=\"RESULTS\">The MCF peak was best predicted using gait speed, the knee adduction moment peak, and the vertical knee reaction force peak (root mean square error 132.88N; R<sup>2</sup> = 0.81, P &lt; 0.001). In participants with knee OA, the predicted MCF peak was related to cartilage volume change (R<sup>2</sup> = 0.35, &#x3b2; = -0.119, P &lt; 0.001).</AbstractText><AbstractText Label=\"CONCLUSION\">Machine learning was used to develop a novel equation for predicting the MCF peak from external biomechanical parameters. The predicted MCF peak was positively related to medial tibial cartilage volume loss in patients with knee OA.</AbstractText><CopyrightInformation>&#xa9; 2021 The Authors. Arthritis &amp; Rheumatology published by Wiley Periodicals LLC on behalf of American College of Rheumatology.</CopyrightInformation></Abstract><AuthorList CompleteYN=\"Y\"><Author ValidYN=\"Y\"><LastName>Brisson</LastName><ForeName>Nicholas M</ForeName><Initials>NM</Initials><Identifier Source=\"ORCID\">0000-0001-8538-2834</Identifier><AffiliationInfo><Affiliation>Charit&#xe9;-Universit&#xe4;tsmedizin Berlin, Berlin, Germany, and McMaster University, Hamilton, Ontario, Canada.</Affiliation></AffiliationInfo></Author><Author ValidYN=\"Y\"><LastName>Gatti</LastName><ForeName>Anthony A</ForeName><Initials>AA</Initials><AffiliationInfo><Affiliation>McMaster University and NeuralSeg, Hamilton, Ontario, Canada.</Affiliation></AffiliationInfo></Author><Author ValidYN=\"Y\"><LastName>Damm</LastName><ForeName>Philipp</ForeName><Initials>P</Initials><AffiliationInfo><Affiliation>Charit&#xe9;-Universit&#xe4;tsmedizin Berlin, Berlin, Germany.</Affiliation></AffiliationInfo></Author><Author ValidYN=\"Y\"><LastName>Duda</LastName><ForeName>Georg N</ForeName><Initials>GN</Initials><AffiliationInfo><Affiliation>Charit&#xe9;-Universit&#xe4;tsmedizin Berlin, Berlin, Germany.</Affiliation></AffiliationInfo></Author><Author ValidYN=\"Y\"><LastName>Maly</LastName><ForeName>Monica R</ForeName><Initials>MR</Initials><AffiliationInfo><Affiliation>McMaster University, Hamilton, Ontario, Canada, and University of Waterloo, Waterloo, Ontario, Canada.</Affiliation></AffiliationInfo></Author></AuthorList><Language>eng</Language><GrantList CompleteYN=\"Y\"><Grant><GrantID>102643</GrantID><Agency>CIHR</Agency><Country>Canada</Country></Grant></GrantList><PublicationTypeList><PublicationType UI=\"D016428\">Journal Article</PublicationType><PublicationType UI=\"D013485\">Research Support, Non-U.S. Gov't</PublicationType></PublicationTypeList><ArticleDate DateType=\"Electronic\"><Year>2021</Year><Month>08</Month><Day>06</Day></ArticleDate></Article><MedlineJournalInfo><Country>United States</Country><MedlineTA>Arthritis Rheumatol</MedlineTA><NlmUniqueID>101623795</NlmUniqueID><ISSNLinking>2326-5191</ISSNLinking></MedlineJournalInfo><CitationSubset>IM</CitationSubset><MeshHeadingList><MeshHeading><DescriptorName UI=\"D000368\" MajorTopicYN=\"N\">Aged</DescriptorName></MeshHeading><MeshHeading><DescriptorName UI=\"D001696\" MajorTopicYN=\"N\">Biomechanical Phenomena</DescriptorName><QualifierName UI=\"Q000502\" MajorTopicYN=\"N\">physiology</QualifierName></MeshHeading><MeshHeading><DescriptorName UI=\"D002358\" MajorTopicYN=\"N\">Cartilage, Articular</DescriptorName><QualifierName UI=\"Q000000981\" MajorTopicYN=\"Y\">diagnostic imaging</QualifierName><QualifierName UI=\"Q000503\" MajorTopicYN=\"N\">physiopathology</QualifierName></MeshHeading><MeshHeading><DescriptorName UI=\"D005260\" MajorTopicYN=\"N\">Female</DescriptorName></MeshHeading><MeshHeading><DescriptorName UI=\"D005684\" MajorTopicYN=\"N\">Gait</DescriptorName><QualifierName UI=\"Q000502\" MajorTopicYN=\"Y\">physiology</QualifierName></MeshHeading><MeshHeading><DescriptorName UI=\"D006801\" MajorTopicYN=\"N\">Humans</DescriptorName></MeshHeading><MeshHeading><DescriptorName UI=\"D007719\" MajorTopicYN=\"N\">Knee Joint</DescriptorName><QualifierName UI=\"Q000000981\" MajorTopicYN=\"Y\">diagnostic imaging</QualifierName><QualifierName UI=\"Q000503\" MajorTopicYN=\"N\">physiopathology</QualifierName></MeshHeading><MeshHeading><DescriptorName UI=\"D000069550\" MajorTopicYN=\"Y\">Machine Learning</DescriptorName></MeshHeading><MeshHeading><DescriptorName UI=\"D008279\" MajorTopicYN=\"N\">Magnetic Resonance Imaging</DescriptorName></MeshHeading><MeshHeading><DescriptorName UI=\"D008297\" MajorTopicYN=\"N\">Male</DescriptorName></MeshHeading><MeshHeading><DescriptorName UI=\"D008875\" MajorTopicYN=\"N\">Middle Aged</DescriptorName></MeshHeading><MeshHeading><DescriptorName UI=\"D020370\" MajorTopicYN=\"N\">Osteoarthritis, Knee</DescriptorName><QualifierName UI=\"Q000000981\" MajorTopicYN=\"Y\">diagnostic imaging</QualifierName><QualifierName UI=\"Q000503\" MajorTopicYN=\"N\">physiopathology</QualifierName></MeshHeading></MeshHeadingList></MedlineCitation><PubmedData><History><PubMedPubDate PubStatus=\"received\"><Year>2020</Year><Month>7</Month><Day>9</Day></PubMedPubDate><PubMedPubDate PubStatus=\"accepted\"><Year>2021</Year><Month>3</Month><Day>11</Day></PubMedPubDate><PubMedPubDate PubStatus=\"pubmed\"><Year>2021</Year><Month>3</Month><Day>25</Day><Hour>6</Hour><Minute>0</Minute></PubMedPubDate><PubMedPubDate PubStatus=\"medline\"><Year>2021</Year><Month>9</Month><Day>21</Day><Hour>6</Hour><Minute>0</Minute></PubMedPubDate><PubMedPubDate PubStatus=\"entrez\"><Year>2021</Year><Month>3</Month><Day>24</Day><Hour>13</Hour><Minute>15</Minute></PubMedPubDate></History><PublicationStatus>ppublish</PublicationStatus><ArticleIdList><ArticleId IdType=\"pubmed\">33760390</ArticleId><ArticleId IdType=\"doi\">10.1002/art.41735</ArticleId></ArticleIdList><ReferenceList><Title>References</Title><Reference><Citation>Creaby MW. It&#x2019;s not all about the knee adduction moment: the role of the knee flexion moment in medial knee joint loading [editorial]. Osteoarthritis Cartilage 2015;23:1-3.</Citation></Reference><Reference><Citation>Erhart-Hledik JC, Favre J, Andriacchi TP. New insight in the relationship between regional patterns of knee cartilage thickness, osteoarthritis disease severity, and gait mechanics. J Biomech 2015;48:3868-75.</Citation></Reference><Reference><Citation>Chehab EF, Favre J, Erhart-Hledik JC, Andriacchi TP. Baseline knee adduction and flexion moments during walking are both associated with 5 year cartilage changes in patients with medial knee osteoarthritis. Osteoarthritis Cartilage 2014;22:1833-9.</Citation></Reference><Reference><Citation>Chang AH, Moisio KC, Chmiel JS, Eckstein F, Guermazi A, Prasad PV, et al. External knee adduction and flexion moments during gait and medial tibiofemoral disease progression in knee osteoarthritis. Osteoarthritis Cartilage 2015;23:1099-106.</Citation></Reference><Reference><Citation>Miyazaki T, Wada M, Kawahara H, Sato M, Baba H, Shimada S. Dynamic load at baseline can predict radiographic disease progression in medial compartment knee osteoarthritis. Ann Rheum Dis 2002;61:617-22.</Citation></Reference><Reference><Citation>Bennell KL, Bowles KA, Wang Y, Cicuttini F, Davies-Tuck M, Hinman RS. Higher dynamic medial knee load predicts greater cartilage loss over 12 months in medial knee osteoarthritis. Ann Rheum Dis 2011;70:1770-4.</Citation></Reference><Reference><Citation>Brisson NM, Wiebenga EG, Stratford PW, Beattie KA, Totterman S, Tamez-Pe&#xf1;a JG, et al. Baseline knee adduction moment interacts with body mass index to predict loss of medial tibial cartilage volume over 2.5 years in knee osteoarthritis. J Orthop Res 2017;35:2476-83.</Citation></Reference><Reference><Citation>Andriacchi TP, Mundermann A, Smith RL, Alexander EJ, Dyrby CO, Koo S. A framework for the in vivo pathomechanics of osteoarthritis at the knee. Ann Biomed Eng 2004;32:447-57.</Citation></Reference><Reference><Citation>Trepczynski A, Kutzner I, Bergmann G, Taylor WR, Heller MO. Modulation of the relationship between external knee adduction moments and medial joint contact forces across subjects and activities. Arthritis Rheumatol 2014;66:1218-27.</Citation></Reference><Reference><Citation>Meyer AJ, D&#x2019;Lima DD, Besier TF, Lloyd DG, Colwell CW, Fregly BJ. Are external knee load and EMG measures accurate indicators of internal knee contact forces during gait? J Orthop Res 2013;31:921-9.</Citation></Reference><Reference><Citation>Schipplein OD, Andriacchi TP. Interaction between active and passive knee stabilizers during level walking. J Orthop Res 1991;9:113-9.</Citation></Reference><Reference><Citation>Winter DA. Biomechanics and motor control of human movement. 4th ed. Hoboken (New Jersey): John Wiley &amp; Sons; 2009.</Citation></Reference><Reference><Citation>Frederick EC, Hagy JL. Factors affecting peak vertical ground reaction forces in running. Int J Sport Biomech 1986;2:41-9.</Citation></Reference><Reference><Citation>Hall M, Wrigley TV, Metcalf BR, Hinman RS, Cicuttini FM, Dempsey AR, et al. Mechanisms underpinning the peak knee flexion moment increase over 2-years following arthroscopic partial meniscectomy. Clin Biomech 2015;30:1060-5.</Citation></Reference><Reference><Citation>Hunt MA, Birmingham TB, Giffin JR, Jenkyn TR. Associations among knee adduction moment, frontal plane ground reaction force, and lever arm during walking in patients with knee osteoarthritis. J Biomech 2006;39:2213-20.</Citation></Reference><Reference><Citation>Metcalfe AJ, Le Andersson M, Goodfellow R, Thorstensson CA. Is knee osteoarthritis a symmetrical disease? Analysis of a 12 year prospective cohort study. BMC Musculoskelet Disord 2012;13:153.</Citation></Reference><Reference><Citation>Kutzner I, Trepczynski A, Heller MO, Bergmann G. Knee adduction moment and medial contact force: facts about their correlation during gait. PLoS One 2013;8:e81036.</Citation></Reference><Reference><Citation>Walter JP, D&#x2019;Lima DD, Colwell CW, Fregly BJ. Decreased knee adduction moment does not guarantee decreased medial contact force during gait. J Orthop Res 2010;28:1348-54.</Citation></Reference><Reference><Citation>Zhao D, Banks SA, Mitchell KH, D&#x2019;Lima DD, Colwell CW, Fregly BJ. Correlation between the knee adduction torque and medial contact force for a variety of gait patterns. J Orthop Res 2007;25:789-97.</Citation></Reference><Reference><Citation>Messier SP, Beavers DP, Loeser RF, Carr JJ, Khajanchi S, Legault C, et al. Knee-joint loading in knee osteoarthritis: influence of abdominal and thigh fat. Med Sci Sport Exerc 2014;46:1677-83.</Citation></Reference><Reference><Citation>Messier SP, Pater M, Beavers DP, Legault C, Loeser RF, Hunter DJ, et al. Influences of alignment and obesity on knee joint loading in osteoarthritic gait. Osteoarthritis Cartilage 2014;22:912-7.</Citation></Reference><Reference><Citation>Harding GT, Dunbar MJ, Hubley-Kozey CL, Stanish WD, Wilson JL. Obesity is associated with higher absolute tibiofemoral contact and muscle forces during gait with and without knee osteoarthritis. Clin Biomech (Bristol, Avon) 2016;31:79-86.</Citation></Reference><Reference><Citation>Pelletier JP, Raynauld JP, Berthiaume MJ, Abram F, Choquette D, Haraoui B, et al. Risk factors associated with the loss of cartilage volume on weight-bearing areas in knee osteoarthritis patients assessed by quantitative magnetic resonance imaging: a longitudinal study. Arthritis Res Ther 2007;9:R74.</Citation></Reference><Reference><Citation>Altman R, Asch E, Bloch D, Bole G, Borenstein D, Brandt K, et al. Development of criteria for the classification and reporting of osteoarthritis: classification of osteoarthritis of the knee. Arthritis Rheum 1986;29:1039-49.</Citation></Reference><Reference><Citation>Kellgren JH, Lawrence JS. Radiological assessment of osteo-arthrosis. Ann Rheum Dis 1957;16:494-502.</Citation></Reference><Reference><Citation>Kothari M, Guermazi A, von Ingersleben G, Sieffert M, Block JE, Stevens R, et al. Fixed-flexion radiography of the knee provides reproducible joint space width measurements in osteoarthritis. Eur Radiol 2004;14:1568-73.</Citation></Reference><Reference><Citation>Wright RW, Ross JR, Haas AK, Huston LJ, Garofoli EA, Harris D, et al. Osteoarthritis classification scales: interobserver reliability and arthroscopic correlation. J Bone Joint Surg Am 2014;96:1145-51.</Citation></Reference><Reference><Citation>Chang CB, Choi JY, Koh IJ, Seo ES, Seong SC, Kim TK. What should be considered in using standard knee radiographs to estimate mechanical alignment of the knee? Osteoarthritis Cartilage 2010;18:530-8.</Citation></Reference><Reference><Citation>Tamez-Pe&#xf1;a JG, Farber J, Gonz&#xe1;lez PC, Schreyer E, Schneider E, Totterman S. Unsupervised segmentation and quantification of anatomical knee features: data from the Osteoarthritis Initiative. IEEE Trans Biomed Eng 2012;59:1177-86.</Citation></Reference><Reference><Citation>Inglis D, Pui M, Ioannidis G, Beattie K, Boulos P, Adachi JD, et al. Accuracy and test-retest precision of quantitative cartilage morphology on a 1.0 T peripheral magnetic resonance imaging system. Osteoarthritis Cartilage 2007;15:110-5.</Citation></Reference><Reference><Citation>Brisson NM, Stratford PW, Maly MR. Relative and absolute test-retest reliabilities of biomechanical risk factors for knee osteoarthritis progression: benchmarks for meaningful change. Osteoarthritis Cartilage 2018;26:220-6.</Citation></Reference><Reference><Citation>Robertson DG, Dowling JJ. Design and responses of Butterworth and critically damped digital filters. J Electromyogr Kinesiol 2003;13:569-73.</Citation></Reference><Reference><Citation>Wu G, Cavanagh PR. ISB recommendations for standardization in the reporting of kinematic data. J Biomech 1995;28:1257-61.</Citation></Reference><Reference><Citation>Thorp LE, Sumner DR, Block JA, Moisio KC, Shott S, Wimmer MA. Knee joint loading differs in individuals with mild compared with moderate medial knee osteoarthritis. Arthritis Rheum 2006;54:3842-9.</Citation></Reference><Reference><Citation>Bergmann G, Bender A, Graichen F, Dymke J, Rohlmann A, Trepczynski A, et al. Standardized loads acting in knee implants. PLoS One 2014;9:e86035.</Citation></Reference><Reference><Citation>Heinlein B, Graichen F, Bender A, Rohlmann A, Bergmann G. Design, calibration and pre-clinical testing of an instrumented tibial tray. J Biomech 2007;40:S4-10.</Citation></Reference><Reference><Citation>Bergmann G, Graichen F, Rohlmann A, Westerhoff P, Heinlein B, Bender A, et al. Design and calibration of load sensing orthopaedic implants. J Biomech Eng 2008;130:021009.</Citation></Reference><Reference><Citation>Hastie T, Tibshirani R, Friedman J. The elements of statistical learning: data mining, inference, and prediction. 2nd ed. New York: Springer; 2009.</Citation></Reference><Reference><Citation>James G, Witten D, Hastie T, Tibshirani R. An introduction to statistical learning: with applications in R. New York: Springer; 2013.</Citation></Reference><Reference><Citation>Cameron AC, Miller D. A practitioner&#x2019;s guide to cluster-robust inference. J Hum Resour 2015;50:317-72.</Citation></Reference><Reference><Citation>Seabold S, Perktold J. Statsmodels: econometric and statistical modeling with Python [abstract]. Presented at the 9th Python for Scientific Computing Conference, Austin, TX, June 28-July 3, 2010.</Citation></Reference><Reference><Citation>Cohen J. A power primer. Psychol Bull 1992;112:155-9.</Citation></Reference><Reference><Citation>Hulley SB, Newman TB, Cummings SR. Planning the measurements: precision, accuracy, and validity. In: Hulley SB, Cummings SR, Browner WS, Grady DG, Newman TB, editors. Designing Clinical Research. 4th ed. Philadelphia: Lippincott Williams &amp; Wilkins; 2013. p. 32-42.</Citation></Reference><Reference><Citation>Steele KM, DeMers MS, Schwartz MS, Delp SL. Compressive tibiofemoral force during crouch gait. Gait Posture 2012;35:556-60.</Citation></Reference><Reference><Citation>Gerus P, Sartori M, Besier TF, Fregly BJ, Delp SL, Banks SA, et al. Subject-specific knee joint geometry improves predictions of medial tibiofemoral contact forces. J Biomech 2013;46:2778-86.</Citation></Reference><Reference><Citation>Walter JP, Kinney AL, Banks SA, D&#x2019;Lima DD, Besier TF, Lloyd DG, et al. Muscle synergies may improve optimization prediction of knee contact forces during walking. J Biomech Eng 2014;136:0210311-9.</Citation></Reference><Reference><Citation>DeMers MS, Pal S, Delp SL. Changes in tibiofemoral forces due to variations in muscle activity during walking. J Orthop Res 2014;32:769-76.</Citation></Reference></ReferenceList></PubmedData></PubmedArticle></PubmedArticleSet>",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Association of Machine Learning-Based Predictions of Medial Knee Contact Force With Cartilage Loss Over 2.5 Years in Knee Osteoarthritis",
				"creators": [
					{
						"firstName": "Nicholas M.",
						"lastName": "Brisson",
						"creatorType": "author"
					},
					{
						"firstName": "Anthony A.",
						"lastName": "Gatti",
						"creatorType": "author"
					},
					{
						"firstName": "Philipp",
						"lastName": "Damm",
						"creatorType": "author"
					},
					{
						"firstName": "Georg N.",
						"lastName": "Duda",
						"creatorType": "author"
					},
					{
						"firstName": "Monica R.",
						"lastName": "Maly",
						"creatorType": "author"
					}
				],
				"date": "2021-09",
				"DOI": "10.1002/art.41735",
				"ISSN": "2326-5205",
				"PMID": "33760390",
				"abstractNote": "OBJECTIVE: The relationship between in vivo knee load predictions and longitudinal cartilage changes has not been investigated. We undertook this study to develop an equation to predict the medial tibiofemoral contact force (MCF) peak during walking in persons with instrumented knee implants, and to apply this equation to determine the relationship between the predicted MCF peak and cartilage loss in patients with knee osteoarthritis (OA).\nMETHODS: In adults with knee OA (39 women, 8 men; mean ± SD age 61.1 ± 6.8 years), baseline biomechanical gait analyses were performed, and annualized change in medial tibial cartilage volume (mm3 /year) over 2.5 years was determined using magnetic resonance imaging. In a separate sample of patients with force-measuring tibial prostheses (3 women, 6 men; mean ± SD age 70.3 ± 5.2 years), gait data plus in vivo knee loads were used to develop an equation to predict the MCF peak using machine learning. This equation was then applied to the knee OA group, and the relationship between the predicted MCF peak and annualized cartilage volume change was determined.\nRESULTS: The MCF peak was best predicted using gait speed, the knee adduction moment peak, and the vertical knee reaction force peak (root mean square error 132.88N; R2 = 0.81, P < 0.001). In participants with knee OA, the predicted MCF peak was related to cartilage volume change (R2 = 0.35, β = -0.119, P < 0.001).\nCONCLUSION: Machine learning was used to develop a novel equation for predicting the MCF peak from external biomechanical parameters. The predicted MCF peak was positively related to medial tibial cartilage volume loss in patients with knee OA.",
				"issue": "9",
				"journalAbbreviation": "Arthritis Rheumatol",
				"language": "eng",
				"pages": "1638-1645",
				"place": "Hoboken, N.J.",
				"publicationTitle": "Arthritis & Rheumatology",
				"volume": "73",
				"attachments": [
					{
						"title": "PubMed entry",
						"mimeType": "text/html",
						"snapshot": false
					}
				],
				"tags": [
					{
						"tag": "Aged"
					},
					{
						"tag": "Biomechanical Phenomena"
					},
					{
						"tag": "Cartilage, Articular"
					},
					{
						"tag": "Female"
					},
					{
						"tag": "Gait"
					},
					{
						"tag": "Humans"
					},
					{
						"tag": "Knee Joint"
					},
					{
						"tag": "Machine Learning"
					},
					{
						"tag": "Magnetic Resonance Imaging"
					},
					{
						"tag": "Male"
					},
					{
						"tag": "Middle Aged"
					},
					{
						"tag": "Osteoarthritis, Knee"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "import",
		"input": "<?xml version=\"1.0\" ?>\n<!DOCTYPE PubmedArticleSet PUBLIC \"-//NLM//DTD PubMedArticle, 1st January 2025//EN\" \"https://dtd.nlm.nih.gov/ncbi/pubmed/out/pubmed_250101.dtd\">\n<PubmedArticleSet>\n<PubmedArticle><MedlineCitation Status=\"PubMed-not-MEDLINE\" Owner=\"NLM\"><PMID Version=\"1\">36798302</PMID><DateRevised><Year>2023</Year><Month>07</Month><Day>21</Day></DateRevised><Article PubModel=\"Electronic\"><Journal><ISSN IssnType=\"Electronic\">2692-8205</ISSN><JournalIssue CitedMedium=\"Internet\"><PubDate><Year>2023</Year><Month>Feb</Month><Day>08</Day></PubDate></JournalIssue><Title>bioRxiv : the preprint server for biology</Title><ISOAbbreviation>bioRxiv</ISOAbbreviation></Journal><ArticleTitle>Dynamic mapping of proteome trafficking within and between living cells by TransitID.</ArticleTitle><ELocationID EIdType=\"pii\" ValidYN=\"Y\">2023.02.07.527548</ELocationID><ELocationID EIdType=\"doi\" ValidYN=\"Y\">10.1101/2023.02.07.527548</ELocationID><Abstract><AbstractText>The ability to map trafficking for thousands of endogenous proteins at once in living cells would reveal biology currently invisible to both microscopy and mass spectrometry. Here we report TransitID, a method for unbiased mapping of endogenous proteome trafficking with nanometer spatial resolution in living cells. Two proximity labeling (PL) enzymes, TurboID and APEX, are targeted to source and destination compartments, and PL with each enzyme is performed in tandem via sequential addition of their small-molecule substrates. Mass spectrometry identifies the proteins tagged by both enzymes. Using TransitID, we mapped proteome trafficking between cytosol and mitochondria, cytosol and nucleus, and nucleolus and stress granules, uncovering a role for stress granules in protecting the transcription factor JUN from oxidative stress. TransitID also identifies proteins that signal intercellularly between macrophages and cancer cells. TransitID introduces a powerful approach for distinguishing protein populations based on compartment or cell type of origin.</AbstractText></Abstract><AuthorList CompleteYN=\"Y\"><Author ValidYN=\"Y\"><LastName>Xu</LastName><ForeName>Wei Qin</ForeName><Initials>WQ</Initials></Author><Author ValidYN=\"Y\"><LastName>Cheah</LastName><ForeName>Joleen S</ForeName><Initials>JS</Initials></Author><Author ValidYN=\"Y\"><LastName>Xu</LastName><ForeName>Charles</ForeName><Initials>C</Initials></Author><Author ValidYN=\"Y\"><LastName>Messing</LastName><ForeName>James</ForeName><Initials>J</Initials></Author><Author ValidYN=\"Y\"><LastName>Freibaum</LastName><ForeName>Brian D</ForeName><Initials>BD</Initials></Author><Author ValidYN=\"Y\"><LastName>Boeynaems</LastName><ForeName>Steven</ForeName><Initials>S</Initials></Author><Author ValidYN=\"Y\"><LastName>Taylor</LastName><ForeName>J Paul</ForeName><Initials>JP</Initials></Author><Author ValidYN=\"Y\"><LastName>Udeshi</LastName><ForeName>Namrata D</ForeName><Initials>ND</Initials></Author><Author ValidYN=\"Y\"><LastName>Carr</LastName><ForeName>Steven A</ForeName><Initials>SA</Initials></Author><Author ValidYN=\"Y\"><LastName>Ting</LastName><ForeName>Alice Y</ForeName><Initials>AY</Initials></Author></AuthorList><Language>eng</Language><PublicationTypeList><PublicationType UI=\"D000076942\">Preprint</PublicationType><PublicationType UI=\"D016428\">Journal Article</PublicationType></PublicationTypeList><ArticleDate DateType=\"Electronic\"><Year>2023</Year><Month>02</Month><Day>08</Day></ArticleDate></Article><MedlineJournalInfo><Country>United States</Country><MedlineTA>bioRxiv</MedlineTA><NlmUniqueID>101680187</NlmUniqueID><ISSNLinking>2692-8205</ISSNLinking></MedlineJournalInfo><CommentsCorrectionsList><CommentsCorrections RefType=\"UpdateIn\"><RefSource>Cell. 2023 Jul 20;186(15):3307-3324.e30. doi: 10.1016/j.cell.2023.05.044.</RefSource><PMID Version=\"1\">37385249</PMID></CommentsCorrections></CommentsCorrectionsList></MedlineCitation><PubmedData><History><PubMedPubDate PubStatus=\"entrez\"><Year>2023</Year><Month>2</Month><Day>17</Day><Hour>2</Hour><Minute>6</Minute></PubMedPubDate><PubMedPubDate PubStatus=\"pubmed\"><Year>2023</Year><Month>2</Month><Day>18</Day><Hour>6</Hour><Minute>0</Minute></PubMedPubDate><PubMedPubDate PubStatus=\"medline\"><Year>2023</Year><Month>2</Month><Day>18</Day><Hour>6</Hour><Minute>1</Minute></PubMedPubDate><PubMedPubDate PubStatus=\"pmc-release\"><Year>2023</Year><Month>2</Month><Day>16</Day></PubMedPubDate></History><PublicationStatus>epublish</PublicationStatus><ArticleIdList><ArticleId IdType=\"pubmed\">36798302</ArticleId><ArticleId IdType=\"pmc\">PMC9934598</ArticleId><ArticleId IdType=\"doi\">10.1101/2023.02.07.527548</ArticleId><ArticleId IdType=\"pii\">2023.02.07.527548</ArticleId></ArticleIdList></PubmedData></PubmedArticle></PubmedArticleSet>",
		"items": [
			{
				"itemType": "preprint",
				"title": "Dynamic mapping of proteome trafficking within and between living cells by TransitID",
				"creators": [
					{
						"firstName": "Wei Qin",
						"lastName": "Xu",
						"creatorType": "author"
					},
					{
						"firstName": "Joleen S.",
						"lastName": "Cheah",
						"creatorType": "author"
					},
					{
						"firstName": "Charles",
						"lastName": "Xu",
						"creatorType": "author"
					},
					{
						"firstName": "James",
						"lastName": "Messing",
						"creatorType": "author"
					},
					{
						"firstName": "Brian D.",
						"lastName": "Freibaum",
						"creatorType": "author"
					},
					{
						"firstName": "Steven",
						"lastName": "Boeynaems",
						"creatorType": "author"
					},
					{
						"firstName": "J. Paul",
						"lastName": "Taylor",
						"creatorType": "author"
					},
					{
						"firstName": "Namrata D.",
						"lastName": "Udeshi",
						"creatorType": "author"
					},
					{
						"firstName": "Steven A.",
						"lastName": "Carr",
						"creatorType": "author"
					},
					{
						"firstName": "Alice Y.",
						"lastName": "Ting",
						"creatorType": "author"
					}
				],
				"date": "2023-02-08",
				"DOI": "10.1101/2023.02.07.527548",
				"abstractNote": "The ability to map trafficking for thousands of endogenous proteins at once in living cells would reveal biology currently invisible to both microscopy and mass spectrometry. Here we report TransitID, a method for unbiased mapping of endogenous proteome trafficking with nanometer spatial resolution in living cells. Two proximity labeling (PL) enzymes, TurboID and APEX, are targeted to source and destination compartments, and PL with each enzyme is performed in tandem via sequential addition of their small-molecule substrates. Mass spectrometry identifies the proteins tagged by both enzymes. Using TransitID, we mapped proteome trafficking between cytosol and mitochondria, cytosol and nucleus, and nucleolus and stress granules, uncovering a role for stress granules in protecting the transcription factor JUN from oxidative stress. TransitID also identifies proteins that signal intercellularly between macrophages and cancer cells. TransitID introduces a powerful approach for distinguishing protein populations based on compartment or cell type of origin.",
				"archiveID": "2023.02.07.527548",
				"language": "eng",
				"repository": "bioRxiv: The Preprint Server for Biology",
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
		"input": "<?xml version=\"1.0\" ?>\n<!DOCTYPE PubmedArticleSet PUBLIC \"-//NLM//DTD PubMedArticle, 1st January 2025//EN\" \"https://dtd.nlm.nih.gov/ncbi/pubmed/out/pubmed_250101.dtd\">\n<PubmedArticleSet>\n<PubmedArticle><MedlineCitation Status=\"PubMed-not-MEDLINE\" Owner=\"NLM\"><PMID Version=\"1\">37064529</PMID><DateRevised><Year>2025</Year><Month>03</Month><Day>07</Day></DateRevised><Article PubModel=\"Electronic\"><Journal><ISSN IssnType=\"Electronic\">2331-8422</ISSN><JournalIssue CitedMedium=\"Internet\"><PubDate><Year>2023</Year><Month>Apr</Month><Day>06</Day></PubDate></JournalIssue><Title>ArXiv</Title><ISOAbbreviation>ArXiv</ISOAbbreviation></Journal><ArticleTitle>Self-organized intracellular twisters.</ArticleTitle><ELocationID EIdType=\"pii\" ValidYN=\"Y\">arXiv:2304.02112v2</ELocationID><Abstract><AbstractText>Life in complex systems, such as cities and organisms, comes to a standstill when global coordination of mass, energy, and information flows is disrupted. Global coordination is no less important in single cells, especially in large oocytes and newly formed embryos, which commonly use fast fluid flows for dynamic reorganization of their cytoplasm. Here, we combine theory, computing, and imaging to investigate such flows in the Drosophila oocyte, where streaming has been proposed to spontaneously arise from hydrodynamic interactions among cortically anchored microtubules loaded with cargo-carrying molecular motors. We use a fast, accurate, and scalable numerical approach to investigate fluid-structure interactions of 1000s of flexible fibers and demonstrate the robust emergence and evolution of cell-spanning vortices, or twisters. Dominated by a rigid body rotation and secondary toroidal components, these flows are likely involved in rapid mixing and transport of ooplasmic components.</AbstractText></Abstract><AuthorList CompleteYN=\"Y\"><Author ValidYN=\"Y\"><LastName>Dutta</LastName><ForeName>Sayantan</ForeName><Initials>S</Initials><AffiliationInfo><Affiliation>Department of Chemical and Biological Engineering, Princeton University, Princeton, NJ.</Affiliation></AffiliationInfo><AffiliationInfo><Affiliation>Center of Computational Biology, Flatiron Institute, New York, NY.</Affiliation></AffiliationInfo></Author><Author ValidYN=\"Y\"><LastName>Farhadifar</LastName><ForeName>Reza</ForeName><Initials>R</Initials><AffiliationInfo><Affiliation>Center of Computational Biology, Flatiron Institute, New York, NY.</Affiliation></AffiliationInfo></Author><Author ValidYN=\"Y\"><LastName>Lu</LastName><ForeName>Wen</ForeName><Initials>W</Initials><AffiliationInfo><Affiliation>Department of Cell and Developmental Biology, Feinberg School of Medicine, Northwestern University, Chicago, IL.</Affiliation></AffiliationInfo></Author><Author ValidYN=\"Y\"><LastName>Kabacao&#x11f;lu</LastName><ForeName>Gokberk</ForeName><Initials>G</Initials><AffiliationInfo><Affiliation>Center of Computational Biology, Flatiron Institute, New York, NY.</Affiliation></AffiliationInfo></Author><Author ValidYN=\"Y\"><LastName>Blackwell</LastName><ForeName>Robert</ForeName><Initials>R</Initials><AffiliationInfo><Affiliation>Center of Computational Biology, Flatiron Institute, New York, NY.</Affiliation></AffiliationInfo></Author><Author ValidYN=\"Y\"><LastName>Stein</LastName><ForeName>David B</ForeName><Initials>DB</Initials><AffiliationInfo><Affiliation>Center of Computational Biology, Flatiron Institute, New York, NY.</Affiliation></AffiliationInfo></Author><Author ValidYN=\"Y\"><LastName>Lakonishok</LastName><ForeName>Margot</ForeName><Initials>M</Initials><AffiliationInfo><Affiliation>Department of Cell and Developmental Biology, Feinberg School of Medicine, Northwestern University, Chicago, IL.</Affiliation></AffiliationInfo></Author><Author ValidYN=\"Y\"><LastName>Gelfand</LastName><ForeName>Vladimir I</ForeName><Initials>VI</Initials><AffiliationInfo><Affiliation>Department of Cell and Developmental Biology, Feinberg School of Medicine, Northwestern University, Chicago, IL.</Affiliation></AffiliationInfo></Author><Author ValidYN=\"Y\"><LastName>Shvartsman</LastName><ForeName>Stanislav Y</ForeName><Initials>SY</Initials><AffiliationInfo><Affiliation>Department of Chemical and Biological Engineering, Princeton University, Princeton, NJ.</Affiliation></AffiliationInfo><AffiliationInfo><Affiliation>Center of Computational Biology, Flatiron Institute, New York, NY.</Affiliation></AffiliationInfo><AffiliationInfo><Affiliation>Department of Molecular Biology and Lewis Sigler Institute of Integrative Genomics, Princeton University, Princeton, NJ.</Affiliation></AffiliationInfo></Author><Author ValidYN=\"Y\"><LastName>Shelley</LastName><ForeName>Michael J</ForeName><Initials>MJ</Initials><AffiliationInfo><Affiliation>Center of Computational Biology, Flatiron Institute, New York, NY.</Affiliation></AffiliationInfo><AffiliationInfo><Affiliation>Courant Institute of Mathematical Sciences, New York University, New York, NY.</Affiliation></AffiliationInfo></Author></AuthorList><Language>eng</Language><PublicationTypeList><PublicationType UI=\"D000076942\">Preprint</PublicationType><PublicationType UI=\"D016428\">Journal Article</PublicationType></PublicationTypeList><ArticleDate DateType=\"Electronic\"><Year>2023</Year><Month>04</Month><Day>06</Day></ArticleDate></Article><MedlineJournalInfo><Country>United States</Country><MedlineTA>ArXiv</MedlineTA><NlmUniqueID>101759493</NlmUniqueID><ISSNLinking>2331-8422</ISSNLinking></MedlineJournalInfo></MedlineCitation><PubmedData><History><PubMedPubDate PubStatus=\"pubmed\"><Year>2023</Year><Month>4</Month><Day>18</Day><Hour>6</Hour><Minute>0</Minute></PubMedPubDate><PubMedPubDate PubStatus=\"medline\"><Year>2023</Year><Month>4</Month><Day>18</Day><Hour>6</Hour><Minute>1</Minute></PubMedPubDate><PubMedPubDate PubStatus=\"entrez\"><Year>2023</Year><Month>4</Month><Day>17</Day><Hour>3</Hour><Minute>44</Minute></PubMedPubDate><PubMedPubDate PubStatus=\"pmc-release\"><Year>2023</Year><Month>4</Month><Day>6</Day></PubMedPubDate></History><PublicationStatus>epublish</PublicationStatus><ArticleIdList><ArticleId IdType=\"pubmed\">37064529</ArticleId><ArticleId IdType=\"pmc\">PMC10104197</ArticleId><ArticleId IdType=\"pii\">2304.02112</ArticleId></ArticleIdList><ReferenceList><Reference><Citation>Corti B. Osservazioni microscopiche sulla tremella e sulla circolazione del fluido in una pianta acquajuola (Rocchi, 1774).</Citation></Reference><Reference><Citation>Yi K. et al. Dynamic maintenance of asymmetric meiotic spindle position through arp2/3-complex-driven cytoplasmic streaming in mouse oocytes. Nature cell biology 13, 1252&#x2013;1258 (2011).</Citation><ArticleIdList><ArticleId IdType=\"pmc\">PMC3523671</ArticleId><ArticleId IdType=\"pubmed\">21874009</ArticleId></ArticleIdList></Reference><Reference><Citation>Almonacid M. et al. Active diffusion positions the nucleus in mouse oocytes. Nature cell biology 17, 470&#x2013;479 (2015).</Citation><ArticleIdList><ArticleId IdType=\"pubmed\">25774831</ArticleId></ArticleIdList></Reference><Reference><Citation>Deneke V. E.\net al. \nSelf-organized nuclear positioning synchronizes the cell cycle in <i>Drosophila</i> embryos. Cell\n177, 925&#x2013;941 (2019).</Citation><ArticleIdList><ArticleId IdType=\"pmc\">PMC6499673</ArticleId><ArticleId IdType=\"pubmed\">30982601</ArticleId></ArticleIdList></Reference><Reference><Citation>Glotzer J. B., Saffrich R., Glotzer M. &amp; Ephrussi A.\nCytoplasmic flows localize injected oskar rna in <i>Drosophila</i> oocytes. Current Biology\n7, 326&#x2013;337 (1997).</Citation><ArticleIdList><ArticleId IdType=\"pubmed\">9115398</ArticleId></ArticleIdList></Reference><Reference><Citation>van de Meent J.-W., Tuval I. &amp; Goldstein R. E. Nature&#x2019;s microfluidic transporter: rotational cytoplasmic streaming at high p&#xe9;clet numbers. Physical review letters 101, 178102 (2008).</Citation><ArticleIdList><ArticleId IdType=\"pubmed\">18999789</ArticleId></ArticleIdList></Reference><Reference><Citation>Hird S. N. &amp; White J. G.\nCortical and cytoplasmic flow polarity in early embryonic cells of <i>Caenorhabditis elegans</i>. The Journal of cell biology\n121, 1343&#x2013;1355 (1993).</Citation><ArticleIdList><ArticleId IdType=\"pmc\">PMC2119718</ArticleId><ArticleId IdType=\"pubmed\">8509454</ArticleId></ArticleIdList></Reference><Reference><Citation>Emmons S. et al. Cappuccino, a Drosophila maternal effect gene required for polarity of the egg and embryo, is related to the vertebrate limb deformity locus. Genes &amp; development 9, 2482&#x2013;2494 (1995).</Citation><ArticleIdList><ArticleId IdType=\"pubmed\">7590229</ArticleId></ArticleIdList></Reference><Reference><Citation>Trong P. K., Doerflinger H., Dunkel J., St Johnston D. &amp; Goldstein R. E.\nCortical microtubule nucleation can organise the cytoskeleton of <i>Drosophila</i> oocytes to define the anteroposterior axis. Elife\n4, e06088(2015)</Citation><ArticleIdList><ArticleId IdType=\"pmc\">PMC4580948</ArticleId><ArticleId IdType=\"pubmed\">26406117</ArticleId></ArticleIdList></Reference><Reference><Citation>Gross P. et al. Guiding self-organized pattern formation in cell polarity establishment. Nature Physics 15, 293&#x2013;300 (2019).</Citation><ArticleIdList><ArticleId IdType=\"pmc\">PMC6640039</ArticleId><ArticleId IdType=\"pubmed\">31327978</ArticleId></ArticleIdList></Reference><Reference><Citation>Goldstein R. E. &amp; van de Meent J.-W. A physical perspective on cytoplasmic streaming. Interface focus 5, 20150030(2015).</Citation><ArticleIdList><ArticleId IdType=\"pmc\">PMC4590424</ArticleId><ArticleId IdType=\"pubmed\">26464789</ArticleId></ArticleIdList></Reference><Reference><Citation>Lu W. &amp; Gelfand V. I. Go with the flow-bulk transport by molecular motors. Journal of cell science 136, jcs260300 (2023).</Citation><ArticleIdList><ArticleId IdType=\"pmc\">PMC10755412</ArticleId><ArticleId IdType=\"pubmed\">36250267</ArticleId></ArticleIdList></Reference><Reference><Citation>Shamipour S., Caballero-Mancebo S. &amp; Heisenberg C.-P.\nCytoplasm&#x2019;s got moves. Developmental <i>Cell</i>\n56, 213&#x2013;226 (2021).</Citation><ArticleIdList><ArticleId IdType=\"pubmed\">33321104</ArticleId></ArticleIdList></Reference><Reference><Citation>Woodhouse F. G. &amp; Goldstein R. E. Cytoplasmic streaming in plant cells emerges naturally by microfilament self-organization. Proceedings of the National Academy of Sciences 110, 14132&#x2013;14137 (2013)</Citation><ArticleIdList><ArticleId IdType=\"pmc\">PMC3761564</ArticleId><ArticleId IdType=\"pubmed\">23940314</ArticleId></ArticleIdList></Reference><Reference><Citation>Quinlan M. E.\nCytoplasmic streaming in the <i>Drosophila</i> oocyte. Annual review of cell and developmental biology\n32, 173&#x2013;195 (2016).</Citation><ArticleIdList><ArticleId IdType=\"pubmed\">27362645</ArticleId></ArticleIdList></Reference><Reference><Citation>Becalska A. N. &amp; Gavis E. R.\nLighting up mRNA localization in <i>Drosophila</i> oogenesis (2009).</Citation><ArticleIdList><ArticleId IdType=\"pmc\">PMC2709059</ArticleId><ArticleId IdType=\"pubmed\">19592573</ArticleId></ArticleIdList></Reference><Reference><Citation>Gutzeit H. &amp; Koppa R.\nTime-lapse film analysis of cytoplasmic streaming during late oogenesis of <i>Drosophila</i>. Development\n67, 101&#x2013;111 (1982).</Citation></Reference><Reference><Citation>Monteith C. E. et al. A mechanism for cytoplasmic streaming: Kinesin-driven alignment of microtubules and fast fluid flows. Biophysical journal 110, 2053&#x2013;2065 (2016).</Citation><ArticleIdList><ArticleId IdType=\"pmc\">PMC4939475</ArticleId><ArticleId IdType=\"pubmed\">27166813</ArticleId></ArticleIdList></Reference><Reference><Citation>Lu W., Winding M., Lakonishok M., Wildonger J. &amp; Gelfand V. I.\nMicrotubule&#x2013;microtubule sliding by kinesin-1 is essential for normal cytoplasmic streaming in <i>Drosophila</i> oocytes. Proceedings of the National Academy of Sciences\n113, E4995&#x2013;E5004 (2016).</Citation><ArticleIdList><ArticleId IdType=\"pmc\">PMC5003289</ArticleId><ArticleId IdType=\"pubmed\">27512034</ArticleId></ArticleIdList></Reference><Reference><Citation>Palacios I. M. &amp; Johnston D. S.\nKinesin light chain-independent function of the kinesin heavy chain in cytoplasmic streaming and posterior localization in the <i>Drosophila</i> oocyte. Development\n129, 5473&#x2013;5485(2002)</Citation><ArticleIdList><ArticleId IdType=\"pubmed\">12403717</ArticleId></ArticleIdList></Reference><Reference><Citation>Serbus L. R., Cha B. J., Theurkauf W. E. &amp; Saxton W. M.\nDynein and the actin cytoskeleton control kinesin-driven cytoplasmic streaming in <i>Drosophila</i> oocytes. Development\n132, 3743&#x2013;52 (2005).</Citation><ArticleIdList><ArticleId IdType=\"pmc\">PMC1534125</ArticleId><ArticleId IdType=\"pubmed\">16077093</ArticleId></ArticleIdList></Reference><Reference><Citation>Ganguly S., Williams L. S., Palacios I. M. &amp; Goldstein R. E.\nCytoplasmic streaming in <i>Drosophila</i> oocytes varies with kinesin activity and correlates with the microtubule cytoskeleton architecture. Proceedings of the National Academy of Sciences\n109, 15109&#x2013;15114 (2012).</Citation><ArticleIdList><ArticleId IdType=\"pmc\">PMC3458379</ArticleId><ArticleId IdType=\"pubmed\">22949706</ArticleId></ArticleIdList></Reference><Reference><Citation>Ravichandran A. et al. Chronology of motor-mediated microtubule streaming. Elife 8, e39694 (2019).</Citation><ArticleIdList><ArticleId IdType=\"pmc\">PMC6338466</ArticleId><ArticleId IdType=\"pubmed\">30601119</ArticleId></ArticleIdList></Reference><Reference><Citation>Stein D. B., De Canio G., Lauga E., Shelley M. J. &amp; Goldstein R. E. Swirling instability of the microtubule cytoskeleton. Physical Review Letters 126, 028103 (2021).</Citation><ArticleIdList><ArticleId IdType=\"pmc\">PMC7616086</ArticleId><ArticleId IdType=\"pubmed\">33512217</ArticleId></ArticleIdList></Reference><Reference><Citation>Gittes F., Mickey B., Nettleton J. &amp; Howard J. Flexural rigibecalskay of microtubules and actin filaments measured from thermal fluctuations in shape. The Journal of cell biology 120, 923&#x2013;934 (1993).</Citation><ArticleIdList><ArticleId IdType=\"pmc\">PMC2200075</ArticleId><ArticleId IdType=\"pubmed\">8432732</ArticleId></ArticleIdList></Reference><Reference><Citation>Shelley M. J. The dynamics of microtubule/motor-protein assemblies in biology and physics. Annual Review of Fluid Mechanics 48, 487&#x2013;506 (2016).</Citation></Reference><Reference><Citation>Keller J. B. &amp; Rubinow S. I. Slender-body theory for slow viscous flow. Journal of Fluid Mechanics 75,705&#x2013;714(1976)</Citation></Reference><Reference><Citation>Tornberg A.-K. &amp; Shelley M. J. Simulating the dynamics and interactions of flexible fibers in stokes flows. Journal of Computational Physics 196, 8&#x2013;40 (2004).</Citation></Reference><Reference><Citation>Nazockdast E., Rahimian A., Zorin D. &amp; Shelley M. A fast platform for simulating semi-flexible fiber suspensions applied to cell mechanics. Journal of Computational Physics 329, 173&#x2013;209 (2017).</Citation></Reference><Reference><Citation>Chakrabarti B., F&#xfc;rthauer S. &amp; Shelley M. J. A multiscale biophysical model gives quantized metachronal waves in a lattice of beating cilia. Proceedings of the National Academy of Sciences 119, e2113539119 (2022).</Citation><ArticleIdList><ArticleId IdType=\"pmc\">PMC8795537</ArticleId><ArticleId IdType=\"pubmed\">35046031</ArticleId></ArticleIdList></Reference><Reference><Citation>SkellySim cellular dynamics package. https://github.com/flatironinstitute/SkellySim(2022).</Citation></Reference><Reference><Citation>Theurkauf W. E. Premature microtubule-dependent cytoplasmic streaming in cappuccino and spire mutant oocytes. Science 265, 2093&#x2013;2096 (1994).</Citation><ArticleIdList><ArticleId IdType=\"pubmed\">8091233</ArticleId></ArticleIdList></Reference><Reference><Citation>Dahlgaard K., Raposo A. A., Niccoli T. &amp; St Johnston D.\nCapu and spire assemble a cytoplasmic actin mesh that maintains microtubule organization in the <i>Drosophila</i> oocyte. Developmental cell\n13, 539&#x2013;553(2007)</Citation><ArticleIdList><ArticleId IdType=\"pmc\">PMC2034408</ArticleId><ArticleId IdType=\"pubmed\">17925229</ArticleId></ArticleIdList></Reference><Reference><Citation>Stone H., Nadim A. &amp; Strogatz S. H. Chaotic streamlines inside drops immersed in steady stokes flows. Journal of Fluid Mechanics 232, 629&#x2013;646 (1991).</Citation></Reference><Reference><Citation>Williams L. S., Ganguly S., Loiseau P., Ng B. F. &amp; Palacios I. M.\nThe auto-inhibitory domain and atp-independent microtubule-binding region of kinesin heavy chain are major functional domains for transport in the <i>Drosophila</i> germline. Development\n141, 176&#x2013;186 (2014).</Citation><ArticleIdList><ArticleId IdType=\"pmc\">PMC3865757</ArticleId><ArticleId IdType=\"pubmed\">24257625</ArticleId></ArticleIdList></Reference><Reference><Citation>Brendza K. M., Rose D. J., Gilbert S. P. &amp; Saxton W. M. Lethal kinesin mutations reveal amino acids important for atpase activation and structural coupling. Journal of Biological Chemistry 274, 31506&#x2013;31514 (1999).</Citation><ArticleIdList><ArticleId IdType=\"pmc\">PMC3204605</ArticleId><ArticleId IdType=\"pubmed\">10531353</ArticleId></ArticleIdList></Reference><Reference><Citation>Loiseau P., Davies T., Williams L. S., Mishima M. &amp; Palacios I. M.\n<i>Drosophila</i> pat1 is required for kinesin-1 to transport cargo and to maximize its motility. Development\n137, 2763&#x2013;2772 (2010).</Citation><ArticleIdList><ArticleId IdType=\"pmc\">PMC2910386</ArticleId><ArticleId IdType=\"pubmed\">20630947</ArticleId></ArticleIdList></Reference><Reference><Citation>Manseau L. J. &amp; Sch&#xfc;pbach T. cappuccino and spire: two unique maternal-effect loci required for both the anteroposterior and dorsoventral patterns of the Drosophila embryo. Genes &amp; development 3, 1437&#x2013;1452(1989).</Citation><ArticleIdList><ArticleId IdType=\"pubmed\">2514120</ArticleId></ArticleIdList></Reference><Reference><Citation>Schonbaum C. P., Perrino J. J. &amp; Mahowald A. P.\nRegulation of the vitellogenin receptor during <i>Drosophila</i> melanogaster oogenesis. Molecular biology of the cell\n11, 511&#x2013;521 (2000).</Citation><ArticleIdList><ArticleId IdType=\"pmc\">PMC14789</ArticleId><ArticleId IdType=\"pubmed\">10679010</ArticleId></ArticleIdList></Reference><Reference><Citation>Nazockdast E., Rahimian A., Zorin D. &amp; Shelley M. A fast platform for simulating semi-flexible fiber suspensions applied to cell mechanics. Journal of Computational Physics 329, 173&#x2013;209 (2017).</Citation></Reference><Reference><Citation>SkellySim cellular dynamics package. https://github.com/flatironinstitute/SkellySim(2022) .</Citation></Reference><Reference><Citation>Greengard L. &amp; Rokhlin V. A fast algorithm for particle simulations. Journal of computational physics 73, 325&#x2013;348 (1987).</Citation></Reference><Reference><Citation>Gittes F., Mickey B., Nettleton J. &amp; Howard J. Flexural rigibecalskay of microtubules and actin filaments measured from thermal fluctuations in shape. The Journal of cell biology 120, 923&#x2013;934 (1993).</Citation><ArticleIdList><ArticleId IdType=\"pmc\">PMC2200075</ArticleId><ArticleId IdType=\"pubmed\">8432732</ArticleId></ArticleIdList></Reference><Reference><Citation>Ganguly S., Williams L. S., Palacios I. M. &amp; Goldstein R. E.\nCytoplasmic streaming in <i>Drosophila</i> oocytes varies with kinesin activity and correlates with the microtubule cytoskeleton architecture. Proceedings of the National Academy of Sciences\n109, 15109&#x2013;15114 (2012).</Citation><ArticleIdList><ArticleId IdType=\"pmc\">PMC3458379</ArticleId><ArticleId IdType=\"pubmed\">22949706</ArticleId></ArticleIdList></Reference><Reference><Citation>Stone H., Nadim A. &amp; Strogatz S. H. Chaotic streamlines inside drops immersed in steady stokes flows. Journal of Fluid Mechanics 232, 629&#x2013;646 (1991).</Citation></Reference><Reference><Citation>Stoddard M. C. et al. Avian egg shape: Form, function, and evolution. Science 356, 1249&#x2013;1254 (2017).</Citation><ArticleIdList><ArticleId IdType=\"pubmed\">28642430</ArticleId></ArticleIdList></Reference><Reference><Citation>Lu W.\net al. \nOoplasmic flow cooperates with transport and anchorage in <i>Drosophila</i> oocyte posterior determination. Journal of Cell Biology\n217, 3497&#x2013;3511 (2018).</Citation><ArticleIdList><ArticleId IdType=\"pmc\">PMC6168253</ArticleId><ArticleId IdType=\"pubmed\">30037924</ArticleId></ArticleIdList></Reference><Reference><Citation>Lu W., Winding M., Lakonishok M., Wildonger J. &amp; Gelfand V. I.\nMicrotubule-microtubule sliding by kinesin-1 is essential for normal cytoplasmic streaming in <i>Drosophila</i> oocytes. Proceedings of the National Academy of Sciences\n113, E4995&#x2013;E5004 (2016).</Citation><ArticleIdList><ArticleId IdType=\"pmc\">PMC5003289</ArticleId><ArticleId IdType=\"pubmed\">27512034</ArticleId></ArticleIdList></Reference><Reference><Citation>Lu W., Lakonishok M. &amp; Gelfand V. I.\nGatekeeper function for short stop at the ring canals of the <i>Drosophila</i> ovary. Current Biology\n31, 3207&#x2013;3220.e4 (2021).</Citation><ArticleIdList><ArticleId IdType=\"pmc\">PMC8355207</ArticleId><ArticleId IdType=\"pubmed\">34089646</ArticleId></ArticleIdList></Reference><Reference><Citation>Spracklen A. J., Fagan T. N., Lovander K. E. &amp; Tootle T. L.\nThe pros and cons of common actin labeling tools for visualizing actin dynamics during <i>Drosophila</i> oogenesis. Developmental biology\n393, 209&#x2013;226 (2014).</Citation><ArticleIdList><ArticleId IdType=\"pmc\">PMC4438707</ArticleId><ArticleId IdType=\"pubmed\">24995797</ArticleId></ArticleIdList></Reference><Reference><Citation>Grieder N. C., De Cuevas M. &amp; Spradling A. C.\nThe fusome organizes the microtubule network during oocyte differentiation in <i>Drosophila</i>. Development\n127, 4253&#x2013;4264 (2000).</Citation><ArticleIdList><ArticleId IdType=\"pubmed\">10976056</ArticleId></ArticleIdList></Reference><Reference><Citation>Kass M., Witkin A. &amp; Terzopoulos D. Snakes: Active contour models. International journal of computer vision 1, 321&#x2013;331 (1988).</Citation></Reference><Reference><Citation>Farhadifar R. &amp; Needleman D. Automated segmentation of the first mitotic spindle in differential interference contrast microcopy images of c. elegans embryos. In Mitosis, 41&#x2013;45 (Springer, 2014).</Citation><ArticleIdList><ArticleId IdType=\"pubmed\">24633792</ArticleId></ArticleIdList></Reference><Reference><Citation>Zuiderveld K. Contrast limited adaptive histogram equalization. Graphics gems 474&#x2013;485 (1994).</Citation></Reference><Reference><Citation>Willert C. E. &amp; Gharib M. Digital particle image velocimetry. Experiments in fluids 10, 181&#x2013;193 (1991)</Citation></Reference><Reference><Citation>Thielicke W. &amp; Stamhuis E. PIVlab - towards user-friendly, affordable and accurate digital particle image velocimetry in MATLAB. Journal of open research software 2 (2014).</Citation></Reference><Reference><Citation>Jain A. K. &amp; Farrokhnia F. Unsupervised texture segmentation using gabor filters. Pattern recognition 24, 1167&#x2013;1186(1991).</Citation></Reference></ReferenceList></PubmedData></PubmedArticle></PubmedArticleSet>",
		"items": [
			{
				"itemType": "preprint",
				"title": "Self-organized intracellular twisters",
				"creators": [
					{
						"firstName": "Sayantan",
						"lastName": "Dutta",
						"creatorType": "author"
					},
					{
						"firstName": "Reza",
						"lastName": "Farhadifar",
						"creatorType": "author"
					},
					{
						"firstName": "Wen",
						"lastName": "Lu",
						"creatorType": "author"
					},
					{
						"firstName": "Gokberk",
						"lastName": "Kabacaoğlu",
						"creatorType": "author"
					},
					{
						"firstName": "Robert",
						"lastName": "Blackwell",
						"creatorType": "author"
					},
					{
						"firstName": "David B.",
						"lastName": "Stein",
						"creatorType": "author"
					},
					{
						"firstName": "Margot",
						"lastName": "Lakonishok",
						"creatorType": "author"
					},
					{
						"firstName": "Vladimir I.",
						"lastName": "Gelfand",
						"creatorType": "author"
					},
					{
						"firstName": "Stanislav Y.",
						"lastName": "Shvartsman",
						"creatorType": "author"
					},
					{
						"firstName": "Michael J.",
						"lastName": "Shelley",
						"creatorType": "author"
					}
				],
				"date": "2023-04-06",
				"abstractNote": "Life in complex systems, such as cities and organisms, comes to a standstill when global coordination of mass, energy, and information flows is disrupted. Global coordination is no less important in single cells, especially in large oocytes and newly formed embryos, which commonly use fast fluid flows for dynamic reorganization of their cytoplasm. Here, we combine theory, computing, and imaging to investigate such flows in the Drosophila oocyte, where streaming has been proposed to spontaneously arise from hydrodynamic interactions among cortically anchored microtubules loaded with cargo-carrying molecular motors. We use a fast, accurate, and scalable numerical approach to investigate fluid-structure interactions of 1000s of flexible fibers and demonstrate the robust emergence and evolution of cell-spanning vortices, or twisters. Dominated by a rigid body rotation and secondary toroidal components, these flows are likely involved in rapid mixing and transport of ooplasmic components.",
				"archiveID": "arXiv:2304.02112v2",
				"language": "eng",
				"repository": "ArXiv",
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
		"input": "<?xml version=\"1.0\" ?>\n<!DOCTYPE PubmedArticleSet PUBLIC \"-//NLM//DTD PubMedArticle, 1st January 2025//EN\" \"https://dtd.nlm.nih.gov/ncbi/pubmed/out/pubmed_250101.dtd\">\n<PubmedArticleSet>\n<PubmedArticle><MedlineCitation Status=\"PubMed-not-MEDLINE\" Owner=\"NLM\"><PMID Version=\"1\">37398060</PMID><DateRevised><Year>2025</Year><Month>04</Month><Day>08</Day></DateRevised><Article PubModel=\"Electronic\"><Journal><ISSN IssnType=\"Electronic\">2693-5015</ISSN><JournalIssue CitedMedium=\"Internet\"><PubDate><Year>2023</Year><Month>Jun</Month><Day>14</Day></PubDate></JournalIssue><Title>Research square</Title><ISOAbbreviation>Res Sq</ISOAbbreviation></Journal><ArticleTitle>Neuronal Connectivity as a Determinant of Cell Types and Subtypes.</ArticleTitle><ELocationID EIdType=\"pii\" ValidYN=\"Y\">rs.3.rs-2960606</ELocationID><ELocationID EIdType=\"doi\" ValidYN=\"Y\">10.21203/rs.3.rs-2960606/v1</ELocationID><Abstract><AbstractText>Classifications of single neurons at brain-wide scale is a powerful way to characterize the structural and functional organization of a brain. We acquired and standardized a large morphology database of 20,158 mouse neurons, and generated a whole-brain scale potential connectivity map of single neurons based on their dendritic and axonal arbors. With such an anatomy-morphology-connectivity mapping, we defined neuron connectivity types and subtypes (both called \"c-types\" for simplicity) for neurons in 31 brain regions. We found that neuronal subtypes defined by connectivity in the same regions may share statistically higher correlation in their dendritic and axonal features than neurons having contrary connectivity patterns. Subtypes defined by connectivity show distinct separation with each other, which cannot be recapitulated by morphology features, population projections, transcriptomic, and electrophysiological data produced to date. Within this paradigm, we were able to characterize the diversity in secondary motor cortical neurons, and subtype connectivity patterns in thalamocortical pathways. Our finding underscores the importance of connectivity in characterizing the modularity of brain anatomy, as well as the cell types and their subtypes. These results highlight that c-types supplement conventionally recognized transcriptional cell types (t-types), electrophysiological cell types (e-types), and morphological cell types (m-types) as an important determinant of cell classes and their identities.</AbstractText></Abstract><AuthorList CompleteYN=\"Y\"><Author ValidYN=\"Y\"><LastName>Liu</LastName><ForeName>Lijuan</ForeName><Initials>L</Initials><AffiliationInfo><Affiliation>SEU-ALLEN Joint Center, Institute for Brain and Intelligence, Southeast University, Nanjing, Jiangsu, China.</Affiliation></AffiliationInfo></Author><Author ValidYN=\"Y\"><LastName>Yun</LastName><ForeName>Zhixi</ForeName><Initials>Z</Initials><AffiliationInfo><Affiliation>SEU-ALLEN Joint Center, Institute for Brain and Intelligence, Southeast University, Nanjing, Jiangsu, China.</Affiliation></AffiliationInfo></Author><Author ValidYN=\"Y\"><LastName>Manubens-Gil</LastName><ForeName>Linus</ForeName><Initials>L</Initials><AffiliationInfo><Affiliation>SEU-ALLEN Joint Center, Institute for Brain and Intelligence, Southeast University, Nanjing, Jiangsu, China.</Affiliation></AffiliationInfo></Author><Author ValidYN=\"Y\"><LastName>Chen</LastName><ForeName>Hanbo</ForeName><Initials>H</Initials><AffiliationInfo><Affiliation>Tencent AI Lab, Bellevue, WA, USA.</Affiliation></AffiliationInfo></Author><Author ValidYN=\"Y\"><LastName>Xiong</LastName><ForeName>Feng</ForeName><Initials>F</Initials><AffiliationInfo><Affiliation>SEU-ALLEN Joint Center, Institute for Brain and Intelligence, Southeast University, Nanjing, Jiangsu, China.</Affiliation></AffiliationInfo></Author><Author ValidYN=\"Y\"><LastName>Dong</LastName><ForeName>Hongwei</ForeName><Initials>H</Initials><AffiliationInfo><Affiliation>UCLA Brain Research and Artificial Intelligence Nexus, Department of Neurobiology, David Geffen School of Medicine, University of California Los Angeles, Los Angeles, CA, USA.</Affiliation></AffiliationInfo></Author><Author ValidYN=\"Y\"><LastName>Zeng</LastName><ForeName>Hongkui</ForeName><Initials>H</Initials><AffiliationInfo><Affiliation>Allen Institute for Brain Science, Seattle, WA, USA.</Affiliation></AffiliationInfo></Author><Author ValidYN=\"Y\"><LastName>Hawrylycz</LastName><ForeName>Michael</ForeName><Initials>M</Initials><AffiliationInfo><Affiliation>Allen Institute for Brain Science, Seattle, WA, USA.</Affiliation></AffiliationInfo></Author><Author ValidYN=\"Y\"><LastName>Ascoli</LastName><ForeName>Giorgio A</ForeName><Initials>GA</Initials><AffiliationInfo><Affiliation>Center for Neural Informatics, Bioengineering Department, and Neuroscience Program, Krasnow Institute for Advanced Study, George Mason University, Fairfax, VA, USA.</Affiliation></AffiliationInfo></Author><Author ValidYN=\"Y\"><LastName>Peng</LastName><ForeName>Hanchuan</ForeName><Initials>H</Initials><AffiliationInfo><Affiliation>SEU-ALLEN Joint Center, Institute for Brain and Intelligence, Southeast University, Nanjing, Jiangsu, China.</Affiliation></AffiliationInfo></Author></AuthorList><Language>eng</Language><GrantList CompleteYN=\"Y\"><Grant><GrantID>R01 NS039600</GrantID><Acronym>NS</Acronym><Agency>NINDS NIH HHS</Agency><Country>United States</Country></Grant><Grant><GrantID>RF1 MH128693</GrantID><Acronym>MH</Acronym><Agency>NIMH NIH HHS</Agency><Country>United States</Country></Grant><Grant><GrantID>U01 MH114829</GrantID><Acronym>MH</Acronym><Agency>NIMH NIH HHS</Agency><Country>United States</Country></Grant><Grant><GrantID>U19 MH114830</GrantID><Acronym>MH</Acronym><Agency>NIMH NIH HHS</Agency><Country>United States</Country></Grant></GrantList><PublicationTypeList><PublicationType UI=\"D000076942\">Preprint</PublicationType><PublicationType UI=\"D016428\">Journal Article</PublicationType></PublicationTypeList><ArticleDate DateType=\"Electronic\"><Year>2023</Year><Month>06</Month><Day>14</Day></ArticleDate></Article><MedlineJournalInfo><Country>United States</Country><MedlineTA>Res Sq</MedlineTA><NlmUniqueID>101768035</NlmUniqueID><ISSNLinking>2693-5015</ISSNLinking></MedlineJournalInfo><CommentsCorrectionsList><CommentsCorrections RefType=\"UpdateIn\"><RefSource>Nat Methods. 2025 Apr;22(4):861-873. doi: 10.1038/s41592-025-02621-6.</RefSource><PMID Version=\"1\">40119176</PMID></CommentsCorrections></CommentsCorrectionsList><CoiStatement>Competing interests: All other authors declare they have no competing interests.</CoiStatement></MedlineCitation><PubmedData><History><PubMedPubDate PubStatus=\"pubmed\"><Year>2023</Year><Month>7</Month><Day>3</Day><Hour>13</Hour><Minute>6</Minute></PubMedPubDate><PubMedPubDate PubStatus=\"medline\"><Year>2023</Year><Month>7</Month><Day>3</Day><Hour>13</Hour><Minute>7</Minute></PubMedPubDate><PubMedPubDate PubStatus=\"entrez\"><Year>2023</Year><Month>7</Month><Day>3</Day><Hour>11</Hour><Minute>42</Minute></PubMedPubDate><PubMedPubDate PubStatus=\"pmc-release\"><Year>2023</Year><Month>6</Month><Day>30</Day></PubMedPubDate></History><PublicationStatus>epublish</PublicationStatus><ArticleIdList><ArticleId IdType=\"pubmed\">37398060</ArticleId><ArticleId IdType=\"pmc\">PMC10312949</ArticleId><ArticleId IdType=\"doi\">10.21203/rs.3.rs-2960606/v1</ArticleId><ArticleId IdType=\"pii\">rs.3.rs-2960606</ArticleId></ArticleIdList><ReferenceList><Reference><Citation>Abbott L. F., Bock D. D., Callaway E. M., Denk W., Dulac C., Fairhall A. L., &#x2026; &amp; Van Essen D. C. (2020). The mind of a mouse. Cell, 182(6), 1372&#x2013;1376.</Citation><ArticleIdList><ArticleId IdType=\"pubmed\">32946777</ArticleId></ArticleIdList></Reference><Reference><Citation>Akram M. A., Nanda S., Maraver P., Arma&#xf1;anzas R., &amp; Ascoli G. A. (2018). An open repository for single-cell reconstructions of the brain forest. Scientific data, 5(1), 1&#x2013;12.</Citation><ArticleIdList><ArticleId IdType=\"pmc\">PMC5827689</ArticleId><ArticleId IdType=\"pubmed\">29485626</ArticleId></ArticleIdList></Reference><Reference><Citation>Axer M., &amp; Amunts K. (2022). Scale matters: The nested human connectome. Science, 378(6619), 500&#x2013;504.</Citation><ArticleIdList><ArticleId IdType=\"pubmed\">36378967</ArticleId></ArticleIdList></Reference><Reference><Citation>Bijari K., Akram M. A., &amp; Ascoli G. A. (2020). An open-source framework for neuroscience metadata management applied to digital reconstructions of neuronal morphology. Brain Informatics, 7(1), 1&#x2013;12.</Citation><ArticleIdList><ArticleId IdType=\"pmc\">PMC7098402</ArticleId><ArticleId IdType=\"pubmed\">32219575</ArticleId></ArticleIdList></Reference><Reference><Citation>Binley K. E., Ng W. S., Tribble J. R., Song B., &amp; Morgan J. E. (2014). Sholl analysis: a quantitative comparison of semi-automated methods. Journal of Neuroscience Methods, 225, 65&#x2013;70.</Citation><ArticleIdList><ArticleId IdType=\"pubmed\">24485871</ArticleId></ArticleIdList></Reference><Reference><Citation>Bureau I., von Saint Paul F., &amp; Svoboda K. (2006). Interdigitated paralemniscal and lemniscal pathways in the mouse barrel cortex. PLoS Biology, 4(12), e382.</Citation><ArticleIdList><ArticleId IdType=\"pmc\">PMC1637129</ArticleId><ArticleId IdType=\"pubmed\">17121453</ArticleId></ArticleIdList></Reference><Reference><Citation>Clasc&#xe1; F., Rubio-Garrido P., &amp; Jabaudon D. (2012). Unveiling the diversity of thalamocortical neuron subtypes. European Journal of Neuroscience, 35(10), 1524&#x2013;1532.</Citation><ArticleIdList><ArticleId IdType=\"pubmed\">22606998</ArticleId></ArticleIdList></Reference><Reference><Citation>Cortes C., &amp; Vapnik V. (1995). Support-vector networks. Machine Learning, 20, 273&#x2013;297.</Citation></Reference><Reference><Citation>Dong H. W. (2008). The Allen reference atlas: A digital color brain atlas of the C57Bl/6J male mouse. John Wiley &amp; Sons Inc.</Citation></Reference><Reference><Citation>Dorkenwald S., Turner N. L., Macrina T., Lee K., Lu R., Wu J., &#x2026; &amp; Seung H. S.(2022). Binary and analog variation of synapses between cortical pyramidal neurons. Elife, 11, e76120.</Citation><ArticleIdList><ArticleId IdType=\"pmc\">PMC9704804</ArticleId><ArticleId IdType=\"pubmed\">36382887</ArticleId></ArticleIdList></Reference><Reference><Citation>Gao L., Liu S., Gou L., Hu Y., Liu Y., Deng L., &#x2026; &amp; Yan J. (2022). Single-neuron projectome of mouse prefrontal cortex. Nature Neuroscience, 25(4), 515&#x2013;529.</Citation><ArticleIdList><ArticleId IdType=\"pubmed\">35361973</ArticleId></ArticleIdList></Reference><Reference><Citation>Gouwens N. W., Sorensen S. A., Baftizadeh F., Budzillo A., Lee B. R., Jarsky T., &#x2026; &amp; Zeng H. (2020). Integrated morphoelectric and transcriptomic classification of cortical GABAergic cells. Cell, 183(4), 935&#x2013;953.</Citation><ArticleIdList><ArticleId IdType=\"pmc\">PMC7781065</ArticleId><ArticleId IdType=\"pubmed\">33186530</ArticleId></ArticleIdList></Reference><Reference><Citation>Guido W. (2018). Development, form, and function of the mouse visual thalamus. Journal of neurophysiology, 120(1), 211&#x2013;225.</Citation><ArticleIdList><ArticleId IdType=\"pmc\">PMC6093956</ArticleId><ArticleId IdType=\"pubmed\">29641300</ArticleId></ArticleIdList></Reference><Reference><Citation>Guo K., Yamawaki N., Barrett J. M., Tapies M., &amp; Shepherd G. M. (2020). Cortico-thalamo-cortical circuits of mouse forelimb S1 are organized primarily as recurrent loops. Journal of Neuroscience, 40(14), 2849&#x2013;2858.</Citation><ArticleIdList><ArticleId IdType=\"pmc\">PMC7117898</ArticleId><ArticleId IdType=\"pubmed\">32075900</ArticleId></ArticleIdList></Reference><Reference><Citation>Guo K., Yamawaki N., Svoboda K., &amp; Shepherd G. M. (2018). Anterolateral motorcortex connects with a medial subdivision of ventromedial thalamus through cell type-specific circuits, forming an excitatory thalamo-cortico-thalamic loop via layer 1 apical tuft dendrites of layer 5B pyramidal tract type neurons. Journal of Neuroscience, 38(41), 8787&#x2013;8797.</Citation><ArticleIdList><ArticleId IdType=\"pmc\">PMC6181310</ArticleId><ArticleId IdType=\"pubmed\">30143573</ArticleId></ArticleIdList></Reference><Reference><Citation>Han X., Guo S., Ji N., Li T., Liu J., Ye X., &#x2026; &amp; Peng H. (2023). Whole human-brain mapping of single cortical neurons for profiling morphological diversity and stereotypy. Science Advance, 2023.</Citation><ArticleIdList><ArticleId IdType=\"pmc\">PMC10569712</ArticleId><ArticleId IdType=\"pubmed\">37824619</ArticleId></ArticleIdList></Reference><Reference><Citation>Harris J. A., Mihalas S., Hirokawa K. E., Whitesell J. D., Choi H., Bernard A., &#x2026; &amp; Zeng H. (2019). Hierarchical organization of cortical and thalamic connectivity. Nature, 575(7781), 195&#x2013;202.</Citation><ArticleIdList><ArticleId IdType=\"pmc\">PMC8433044</ArticleId><ArticleId IdType=\"pubmed\">31666704</ArticleId></ArticleIdList></Reference><Reference><Citation>Kalmbach B. E., Hodge R. D., Jorstad N. L., Owen S., de Frates R., Yanny A. M., &#x2026; &amp; Ting J. T. (2021). Signature morpho-electric, transcriptomic, and dendritic properties of human layer 5 neocortical pyramidal neurons. Neuron, 109(18), 2914&#x2013;2927.</Citation><ArticleIdList><ArticleId IdType=\"pmc\">PMC8570452</ArticleId><ArticleId IdType=\"pubmed\">34534454</ArticleId></ArticleIdList></Reference><Reference><Citation>Lee B. R., Budzillo A., Hadley K., Miller J. A., Jarsky T., Baker K., &#x2026; &amp; Berg J. (2021). Scaled, high fidelity electrophysiological, morphological, and transcriptomic cell characterization. eLife, 10, e65482.</Citation><ArticleIdList><ArticleId IdType=\"pmc\">PMC8428855</ArticleId><ArticleId IdType=\"pubmed\">34387544</ArticleId></ArticleIdList></Reference><Reference><Citation>Lichtman J. W., Livet J., &amp; Sanes J. R. (2008). A technicolour approach to the connectome. Nature Reviews Neuroscience, 9(6), 417&#x2013;422.</Citation><ArticleIdList><ArticleId IdType=\"pmc\">PMC2577038</ArticleId><ArticleId IdType=\"pubmed\">18446160</ArticleId></ArticleIdList></Reference><Reference><Citation>Lipovsek M., Bardy C., Cadwell C. R., Hadley K., Kobak D., &amp; Tripathy S. J. (2021). Patch-seq: Past, present, and future. Journal of Neuroscience, 41(5), 937&#x2013;946.</Citation><ArticleIdList><ArticleId IdType=\"pmc\">PMC7880286</ArticleId><ArticleId IdType=\"pubmed\">33431632</ArticleId></ArticleIdList></Reference><Reference><Citation>Liu L., &amp; Qian P. (2022). Manifold classification of neuron types from microscopic images. Bioinformatics, 38(21), 4987&#x2013;4989.</Citation><ArticleIdList><ArticleId IdType=\"pubmed\">36066416</ArticleId></ArticleIdList></Reference><Reference><Citation>Luo L. (2015). Principles of Neurobiology. Garland Science.</Citation></Reference><Reference><Citation>Manubens-Gil L., Zhou Z., Chen H., Ramanathan A., Liu X., Liu Y., &#x2026; &amp; Peng H. (2023). BigNeuron: a resource to benchmark and predict best-performing algorithms for automated reconstruction of neuronal morphology. Nature Methods, 2023.</Citation></Reference><Reference><Citation>Mehta K., Goldin R. F., &amp; Ascoli G. A. (2023). Circuit analysis of the Drosophila brain using connectivity-based neuronal classification reveals organization of key communication pathways. Network Neuroscience, 7(1), 269&#x2013;298.</Citation><ArticleIdList><ArticleId IdType=\"pmc\">PMC10275213</ArticleId><ArticleId IdType=\"pubmed\">37339321</ArticleId></ArticleIdList></Reference><Reference><Citation>Moffitt J. R., Bambah-Mukku D., Eichhorn S. W., Vaughn E., Shekhar K., Perez J. D., &#x2026; &amp; Zhuang X. (2018). Molecular, spatial, and functional single-cell profiling of the hypothalamic preoptic region. Science, 362(6416), eaau5324.</Citation><ArticleIdList><ArticleId IdType=\"pmc\">PMC6482113</ArticleId><ArticleId IdType=\"pubmed\">30385464</ArticleId></ArticleIdList></Reference><Reference><Citation>Mu&#xf1;oz-Casta&#xf1;eda R., Zingg B., Matho K. S., Chen X., Wang Q., Foster N. N., &#x2026; &amp; Dong H. W. (2021). Cellular anatomy of the mouse primary motor cortex. Nature, 598(7879), 159&#x2013;166.</Citation><ArticleIdList><ArticleId IdType=\"pmc\">PMC8494646</ArticleId><ArticleId IdType=\"pubmed\">34616071</ArticleId></ArticleIdList></Reference><Reference><Citation>Noble W. S. (2006). What is a support vector machine?. Nature Biotechnology, 24(12), 1565&#x2013;1567.</Citation><ArticleIdList><ArticleId IdType=\"pubmed\">17160063</ArticleId></ArticleIdList></Reference><Reference><Citation>Oh S. W., Harris J. A., Ng L., Winslow B., Cain N., Mihalas S., &#x2026; &amp; Zeng H. (2014). A mesoscale connectome of the mouse brain. Nature, 508(7495), 207&#x2013;214.</Citation><ArticleIdList><ArticleId IdType=\"pmc\">PMC5102064</ArticleId><ArticleId IdType=\"pubmed\">24695228</ArticleId></ArticleIdList></Reference><Reference><Citation>Okigawa S., Yamaguchi M., Ito K. N., Takeuchi R. F., Morimoto N., &amp; Osakada F. (2021). Cell type-and layer-specific convergence in core and shell neurons of the dorsal lateral geniculate nucleus. Journal of Comparative Neurology, 529(8), 2099&#x2013;2124.</Citation><ArticleIdList><ArticleId IdType=\"pubmed\">33236346</ArticleId></ArticleIdList></Reference><Reference><Citation>Peng H., Hawrylycz M., Roskams J., Hill S., Spruston N., Meijering E., &amp; Ascoli G. A. (2015). BigNeuron: large-scale 3D neuron reconstruction from optical microscopy images. Neuron, 87(2), 252&#x2013;256.</Citation><ArticleIdList><ArticleId IdType=\"pmc\">PMC4725298</ArticleId><ArticleId IdType=\"pubmed\">26182412</ArticleId></ArticleIdList></Reference><Reference><Citation>Peng H., Xie P., Liu L., Kuang X., Wang Y., Qu L., &#x2026; &amp; Zeng H. (2021). Morphological diversity of single neurons in molecularly defined cell types. Nature, 598(7879), 174&#x2013;181.</Citation><ArticleIdList><ArticleId IdType=\"pmc\">PMC8494643</ArticleId><ArticleId IdType=\"pubmed\">34616072</ArticleId></ArticleIdList></Reference><Reference><Citation>Pierret T., Lavall&#xe9;e P., &amp; Desch&#xea;nes M. (2000). Parallel streams for the relay of vibrissal information through thalamic barreloids. Journal of Neuroscience, 20(19), 7455&#x2013;7462.</Citation><ArticleIdList><ArticleId IdType=\"pmc\">PMC6772772</ArticleId><ArticleId IdType=\"pubmed\">11007905</ArticleId></ArticleIdList></Reference><Reference><Citation>Purves D., Augustine G. J., Fitzpatrick D., Hall W., LaMantia A. S., &amp; White L. (2019). Neurosciencebs. De Boeck Sup&#xe9;rieur.</Citation></Reference><Reference><Citation>Qu L., Li Y., Xie P., Liu L., Wang Y., Wu J., &#x2026; &amp; Peng H. (2022). Cross-modal coherent registration of whole mouse brains. Nature Methods, 19(1), 111&#x2013;118.</Citation><ArticleIdList><ArticleId IdType=\"pubmed\">34887551</ArticleId></ArticleIdList></Reference><Reference><Citation>Ram&#xf3;n y Cajal S. (1909) Histologie Du Syst&#xe8;me Nerveux de L&#x2019;homme &amp; Des Vert&#xe9;br&#xe9;s., (Paris: Maloine: [Translated by Swanson N. and Swanson L.W., Oxford University Press, 1995], 1909).</Citation></Reference><Reference><Citation>Rees CL, Moradi K &amp; Ascoli GA. (2017). Weighing the evidence in Peters&#x2019; rule: does neuronal morphology predict connectivity?. Trends in neurosciences, 40(2), 63&#x2013;71.</Citation><ArticleIdList><ArticleId IdType=\"pmc\">PMC5285450</ArticleId><ArticleId IdType=\"pubmed\">28041634</ArticleId></ArticleIdList></Reference><Reference><Citation>Russ D. E., Cross R. B. P., Li L., Koch S. C., Matson K. J., Yadav A., &#x2026; &amp; Levine A. J. (2021). A harmonized atlas of mouse spinal cord cell types and their spatial organization. Nature Communications, 12(1), 5722.</Citation><ArticleIdList><ArticleId IdType=\"pmc\">PMC8481483</ArticleId><ArticleId IdType=\"pubmed\">34588430</ArticleId></ArticleIdList></Reference><Reference><Citation>Scala F., Kobak D., Bernabucci M., Bernaerts Y., Cadwell C. R., Castro J. R., &#x2026; &amp; Tolias A. S. (2021). Phenotypic variation of transcriptomic cell types in mouse motor cortex. Nature, 598(7879), 144&#x2013;150.</Citation><ArticleIdList><ArticleId IdType=\"pmc\">PMC8113357</ArticleId><ArticleId IdType=\"pubmed\">33184512</ArticleId></ArticleIdList></Reference><Reference><Citation>Scheffer L. K., Xu C. S., Januszewski M., Lu Z., Takemura S. Y., Hayworth K. J., &#x2026; &amp; Plaza S. M. (2020). A connectome and analysis of the adult Drosophila central brain. eLife, 9, e57443.</Citation><ArticleIdList><ArticleId IdType=\"pmc\">PMC7546738</ArticleId><ArticleId IdType=\"pubmed\">32880371</ArticleId></ArticleIdList></Reference><Reference><Citation>Scorcioni R., Polavaram S., &amp; Ascoli G. A. (2008). L-Measure: a web-accessible tool for the analysis, comparison and search of digital reconstructions of neuronal morphologies. Nature Protocols, 3(5), 866&#x2013;876.</Citation><ArticleIdList><ArticleId IdType=\"pmc\">PMC4340709</ArticleId><ArticleId IdType=\"pubmed\">18451794</ArticleId></ArticleIdList></Reference><Reference><Citation>Seb&#xe9;-Pedr&#xf3;s A., Saudemont B., Chomsky E., Plessier F., Mailh&#xe9; M. P., Renno J., &#x2026;&amp;Marlow H. (2018). Cnidarian cell type diversity and regulation revealed by whole-organism single-cell RNA-Seq. Cell, 173(6), 1520&#x2013;1534.</Citation><ArticleIdList><ArticleId IdType=\"pubmed\">29856957</ArticleId></ArticleIdList></Reference><Reference><Citation>Seung S. (2012). Connectome: How the brain&#x2019;s wiring makes us who we are. HMH.</Citation></Reference><Reference><Citation>Sporns O. (2011). The human connectome: a complex network. Annals of the new York Academy of Sciences, 1224(1), 109&#x2013;125.</Citation><ArticleIdList><ArticleId IdType=\"pubmed\">21251014</ArticleId></ArticleIdList></Reference><Reference><Citation>Staiger J. F., &amp; Petersen C. C. (2021). Neuronal circuits in barrel cortex for whisker sensory perception. Physiological Reviews, 101(1), 353&#x2013;415.</Citation><ArticleIdList><ArticleId IdType=\"pubmed\">32816652</ArticleId></ArticleIdList></Reference><Reference><Citation>Steinwart I., &amp; Christmann A. (2008). Support vector machines. Springer Science &amp; Business Media.</Citation></Reference><Reference><Citation>Stepanyants A., Hof P. R., &amp; Chklovskii D. B. (2002). Geometry and structural plasticity of synaptic connectivity. Neuron, 34(2), 275&#x2013;288.</Citation><ArticleIdList><ArticleId IdType=\"pubmed\">11970869</ArticleId></ArticleIdList></Reference><Reference><Citation>Tecuatl C., Wheeler D. W., Sutton N., &amp; Ascoli G. A. (2021). Comprehensive estimates of potential synaptic connections in local circuits of the rodent hippocampal formation by axonal-dendritic overlap. Journal of Neuroscience, 41(8), 1665&#x2013;1683.</Citation><ArticleIdList><ArticleId IdType=\"pmc\">PMC8115893</ArticleId><ArticleId IdType=\"pubmed\">33361464</ArticleId></ArticleIdList></Reference><Reference><Citation>Turner N. L., Macrina T., Bae J. A., Yang R., Wilson A. M., Schneider-Mizell C., &#x2026;&amp; Seung H. S. (2022). Reconstruction of neocortex: Organelles, compartments, cells, circuits, and activity. Cell, 185(6), 1082&#x2013;1100.</Citation><ArticleIdList><ArticleId IdType=\"pmc\">PMC9337909</ArticleId><ArticleId IdType=\"pubmed\">35216674</ArticleId></ArticleIdList></Reference><Reference><Citation>Van Essen D. C., Ugurbil K., Auerbach E., Barch D., Behrens T. E., Bucholz R., &#x2026; &amp; WU-Minn HCP Consortium. (2012). The Human Connectome Project: a data acquisition perspective. Neuroimage, 62(4), 2222&#x2013;2231.</Citation><ArticleIdList><ArticleId IdType=\"pmc\">PMC3606888</ArticleId><ArticleId IdType=\"pubmed\">22366334</ArticleId></ArticleIdList></Reference><Reference><Citation>Viaene A. N., Petrof I., &amp; Sherman S. M. (2011). Synaptic properties of thalamic input to layers 2/3 and 4 of primary somatosensory and auditory cortices. Journal of Neurophysiology, 105(1), 279&#x2013;292.</Citation><ArticleIdList><ArticleId IdType=\"pmc\">PMC3023380</ArticleId><ArticleId IdType=\"pubmed\">21047937</ArticleId></ArticleIdList></Reference><Reference><Citation>Wan Y., Long F., Qu L., Xiao H., Hawrylycz M., Myers E. W., &amp; Peng H. (2015). BlastNeuron for automated comparison, retrieval and clustering of 3D neuron morphologies. Neuroinformatics, 13, 487&#x2013;499.</Citation><ArticleIdList><ArticleId IdType=\"pubmed\">26036213</ArticleId></ArticleIdList></Reference><Reference><Citation>Wang Q., Ding S. L., Li Y., Royall J., Feng D., Lesnar P., &#x2026; &amp; Ng L. (2020). The Allen mouse brain common coordinate framework: a 3D reference atlas. Cell, 181(4), 936&#x2013;953.</Citation><ArticleIdList><ArticleId IdType=\"pmc\">PMC8152789</ArticleId><ArticleId IdType=\"pubmed\">32386544</ArticleId></ArticleIdList></Reference><Reference><Citation>Whitesell J. D., Liska A., Coletta L., Hirokawa K. E., Bohn P., Williford A., &#x2026; &amp; Harris J. A. (2021). Regional, layer, and cell-type-specific connectivity of the mouse default mode network. Neuron, 109(3), 545&#x2013;559.</Citation><ArticleIdList><ArticleId IdType=\"pmc\">PMC8150331</ArticleId><ArticleId IdType=\"pubmed\">33290731</ArticleId></ArticleIdList></Reference><Reference><Citation>Winnubst J., Bas E., Ferreira T. A., Wu Z., Economo M. N., Edson P., &#x2026; &amp; Chandrashekar J. (2019). Reconstruction of 1,000 projection neurons reveals new cell types and organization of long-range connectivity in the mouse brain. Cell, 179(1), 268&#x2013;281.</Citation><ArticleIdList><ArticleId IdType=\"pmc\">PMC6754285</ArticleId><ArticleId IdType=\"pubmed\">31495573</ArticleId></ArticleIdList></Reference><Reference><Citation>Yang J. H., &amp; Kwan A. C. (2021). Secondary motor cortex: Broadcasting and biasing animal&#x2019;s decisions through long-range circuits. International Review of Neurobiology, 158, 443&#x2013;470.</Citation><ArticleIdList><ArticleId IdType=\"pmc\">PMC8190828</ArticleId><ArticleId IdType=\"pubmed\">33785155</ArticleId></ArticleIdList></Reference><Reference><Citation>Yao Z., van Velthoven C. T., Nguyen T. N., Goldy J., Sedeno-Cortes A. E.,Baftizadeh F., &#x2026; &amp; Zeng H. (2021). A taxonomy of transcriptomic cell types across the isocortex and hippocampal formation. Cell, 184(12), 3222&#x2013;3241.</Citation><ArticleIdList><ArticleId IdType=\"pmc\">PMC8195859</ArticleId><ArticleId IdType=\"pubmed\">34004146</ArticleId></ArticleIdList></Reference><Reference><Citation>Yin W., Brittain D., Borseth J., Scott M. E., Williams D., Perkins J., &#x2026; &amp; da Costa N. M. (2020). A petascale automated imaging pipeline for mapping neuronal circuits with high-throughput transmission electron microscopy. Nature Communications, 11(1), 4949.</Citation><ArticleIdList><ArticleId IdType=\"pmc\">PMC7532165</ArticleId><ArticleId IdType=\"pubmed\">33009388</ArticleId></ArticleIdList></Reference><Reference><Citation>Zeng H., &amp; Sanes J. R. (2017). Neuronal cell-type classification: challenges, opportunities and the path forward. Nature Reviews Neuroscience, 18(9), 530&#x2013;546.</Citation><ArticleIdList><ArticleId IdType=\"pubmed\">28775344</ArticleId></ArticleIdList></Reference><Reference><Citation>Zhang M., Eichhorn S. W., Zingg B., Yao Z., Cotter K., Zeng H.&#x2026; &amp; Zhuang X. (2021). Spatially resolved cell atlas of the mouse primary motor cortex by MERFISH. Nature, 598(7879), 137&#x2013;143.</Citation><ArticleIdList><ArticleId IdType=\"pmc\">PMC8494645</ArticleId><ArticleId IdType=\"pubmed\">34616063</ArticleId></ArticleIdList></Reference><Reference><Citation>Zhang M., Pan X., Jung W., Halpern A., Eichhorn S. W., Lei Z., &#x2026; &amp; Zhuang X. (2023). A molecularly defined and spatially resolved cell atlas of the whole mouse brain. bioRxiv, 2023&#x2013;03.</Citation><ArticleIdList><ArticleId IdType=\"pmc\">PMC10719103</ArticleId><ArticleId IdType=\"pubmed\">38092912</ArticleId></ArticleIdList></Reference><Reference><Citation>Zhong S., Ding W., Sun L., Lu Y., Dong H., Fan X., &#x2026; &amp; Wang (2020). Decoding the development of the human hippocampus. Nature, 577(7791), 531&#x2013;536.</Citation><ArticleIdList><ArticleId IdType=\"pubmed\">31942070</ArticleId></ArticleIdList></Reference><Reference><Citation>Zingg B., Hintiryan H., Gou L., Song M. Y., Bay M., Bienkowski M. S., &#x2026; &amp; Dong H. W. (2014). Neural networks of the mouse neocortex. Cell, 156(5), 1096&#x2013;1111.</Citation><ArticleIdList><ArticleId IdType=\"pmc\">PMC4169118</ArticleId><ArticleId IdType=\"pubmed\">24581503</ArticleId></ArticleIdList></Reference></ReferenceList><ReferenceList><Title>References (Methods section only)</Title><Reference><Citation>Brown M. J., Holland B. R., &amp; Jordan G. J. (2020). hyperoverlap: Detecting biological overlap in n-dimensional space. Methods in Ecology and Evolution, 11(4), 513&#x2013;523.</Citation></Reference><Reference><Citation>Cali&#x144;ski T., &amp; Harabasz J. (1974). A dendrite method for cluster analysis. Communications in Statistics-theory and Methods, 3(1), 1&#x2013;27.</Citation></Reference><Reference><Citation>Cohen L., Koffman N., Meiri H., Yarom Y., Lampl I., &amp; Mizrahi A. (2013). Time-lapse electrical recordings of single neurons from the mouse neocortex. Proceedings of the National Academy of Sciences, 110(14), 5665&#x2013;5670.</Citation><ArticleIdList><ArticleId IdType=\"pmc\">PMC3619327</ArticleId><ArticleId IdType=\"pubmed\">23509258</ArticleId></ArticleIdList></Reference><Reference><Citation>Cortes C., &amp; Vapnik V. (1995). Support-vector networks. Machine Learning, 20, 273&#x2013;297.</Citation></Reference><Reference><Citation>Delaunay B. (1934). Sur la sphere vide. Izv. Akad. Nauk SSSR, Otdelenie Matematicheskii i Estestvennyka Nauk, 7(793&#x2013;800), 1&#x2013;2.</Citation></Reference><Reference><Citation>Edelsbrunner H., &amp; M&#xfc;cke E. P. (1994). Three-dimensional alpha shapes. ACM Transactions on Graphics (TOG), 13(1), 43&#x2013;72.</Citation></Reference><Reference><Citation>Gong H., Xu D., Yuan J., Li X., Guo C., Peng J., &#x2026; &amp; Luo Q. (2016). High-throughput dual-colour precision imaging for brain-wide connectome with cytoarchitectonic landmarks at the cellular level. Nature communications, 7(1), 12142.</Citation><ArticleIdList><ArticleId IdType=\"pmc\">PMC4932192</ArticleId><ArticleId IdType=\"pubmed\">27374071</ArticleId></ArticleIdList></Reference><Reference><Citation>Han J., Pei J., &amp; Tong H. (2022). Data mining: concepts and techniques. Morgan kaufmann.</Citation></Reference><Reference><Citation>Iascone D. M., Li Y., S&#xfc;mb&#xfc;l U., Doron M., Chen H., Andreu V., &#x2026; &amp; Polleux, F. (2020). Whole-neuron synaptic mapping reveals spatially precise excitatory/inhibitory balance limiting dendritic and somatic spiking. Neuron, 106(4), 566&#x2013;578.</Citation><ArticleIdList><ArticleId IdType=\"pmc\">PMC7244395</ArticleId><ArticleId IdType=\"pubmed\">32169170</ArticleId></ArticleIdList></Reference><Reference><Citation>Jiang S., Guan Y., Chen S., Jia X., Ni H., Zhang Y., &#x2026; &amp; Gong, H. (2020). Anatomically revealed morphological patterns of pyramidal neurons in layer 5 of the motor cortex. Scientific reports, 10(1), 7916.</Citation><ArticleIdList><ArticleId IdType=\"pmc\">PMC7220918</ArticleId><ArticleId IdType=\"pubmed\">32405029</ArticleId></ArticleIdList></Reference><Reference><Citation>Karlsson T. E., Smedfors G., Brodin A. T., &#xc5;berg E., Mattsson A., H&#xf6;gbeck I., &#x2026; &amp; Olson, L. (2016). NgR1: a tunable sensor regulating memory formation, synaptic, and dendritic plasticity. Cerebral cortex, 26(4), 1804&#x2013;1817.</Citation><ArticleIdList><ArticleId IdType=\"pmc\">PMC4785958</ArticleId><ArticleId IdType=\"pubmed\">26838771</ArticleId></ArticleIdList></Reference><Reference><Citation>Lin H. M., Kuang J. X., Sun P., Li N., Lv X., &amp; Zhang Y. H. (2018). Reconstruction of intratelencephalic neurons in the mouse secondary motor cortex reveals the diverse projection patterns of single neurons. Frontiers in neuroanatomy, 12, 86.</Citation><ArticleIdList><ArticleId IdType=\"pmc\">PMC6218457</ArticleId><ArticleId IdType=\"pubmed\">30425624</ArticleId></ArticleIdList></Reference><Reference><Citation>McLachlan G. J. (1999). Mahalanobis distance. Resonance, 4(6), 20&#x2013;26.</Citation></Reference><Reference><Citation>Morelli E., Ghiglieri V., Pendolino V., Bagetta V., Pignataro A., Fejtova A., &#x2026; &amp; Calabresi P. (2014). Environmental enrichment restores CA1 hippocampal LTP and reduces severity of seizures in epileptic mice. Experimental neurology, 261, 320&#x2013;327.</Citation><ArticleIdList><ArticleId IdType=\"pubmed\">24858730</ArticleId></ArticleIdList></Reference><Reference><Citation>Murase S., Lantz C. L., Kim E., Gupta N., Higgins R., Stopfer M., &#x2026; &amp; Quinlan E. M. (2016). Matrix metalloproteinase-9 regulates neuronal circuit development and excitability. Molecular neurobiology, 53, 3477&#x2013;3493.</Citation><ArticleIdList><ArticleId IdType=\"pmc\">PMC4686372</ArticleId><ArticleId IdType=\"pubmed\">26093382</ArticleId></ArticleIdList></Reference><Reference><Citation>Nooruddin F. S., &amp; Turk G. (2003). Simplification and repair of polygonal models using volumetric techniques. IEEE Transactions on Visualization and Computer Graphics, 9(2), 191&#x2013;205.</Citation></Reference><Reference><Citation>Schwarz G. (1978). Estimating the dimension of a model. The annals of statistics, 461&#x2013;464.</Citation></Reference><Reference><Citation>Scrucca L., Fop M., Murphy T. B., &amp; Raftery A. E. (2016). mclust 5: clustering, classification and density estimation using Gaussian finite mixture models. The R journal, 8(1), 289.</Citation><ArticleIdList><ArticleId IdType=\"pmc\">PMC5096736</ArticleId><ArticleId IdType=\"pubmed\">27818791</ArticleId></ArticleIdList></Reference><Reference><Citation>Smit-Rigter L. A., Noorlander C. W., von Oerthel L., Chameau P., Smidt M. P., &amp; van Hooft J. A. (2012). Prenatal fluoxetine exposure induces life-long serotonin 5-HT3 receptor-dependent cortical abnormalities and anxiety-like behaviour. Neuropharmacology, 62(2), 865&#x2013;870.</Citation><ArticleIdList><ArticleId IdType=\"pubmed\">21964434</ArticleId></ArticleIdList></Reference><Reference><Citation>Suter B. A., &amp; Shepherd G. M. (2015). Reciprocal interareal connections to corticospinal neurons in mouse M1 and S2. Journal of Neuroscience, 35(7), 2959&#x2013;2974.</Citation><ArticleIdList><ArticleId IdType=\"pmc\">PMC4331623</ArticleId><ArticleId IdType=\"pubmed\">25698734</ArticleId></ArticleIdList></Reference><Reference><Citation>Yamashita T., Vavladeli A., Pala A., Galan K., Crochet S., Petersen S. S., &amp; Petersen C. C. (2018). Diverse long-range axonal projections of excitatory layer 2/3 neurons in mouse barrel cortex. Frontiers in neuroanatomy, 12, 33.</Citation><ArticleIdList><ArticleId IdType=\"pmc\">PMC5938399</ArticleId><ArticleId IdType=\"pubmed\">29765308</ArticleId></ArticleIdList></Reference></ReferenceList></PubmedData></PubmedArticle></PubmedArticleSet>",
		"items": [
			{
				"itemType": "preprint",
				"title": "Neuronal Connectivity as a Determinant of Cell Types and Subtypes",
				"creators": [
					{
						"firstName": "Lijuan",
						"lastName": "Liu",
						"creatorType": "author"
					},
					{
						"firstName": "Zhixi",
						"lastName": "Yun",
						"creatorType": "author"
					},
					{
						"firstName": "Linus",
						"lastName": "Manubens-Gil",
						"creatorType": "author"
					},
					{
						"firstName": "Hanbo",
						"lastName": "Chen",
						"creatorType": "author"
					},
					{
						"firstName": "Feng",
						"lastName": "Xiong",
						"creatorType": "author"
					},
					{
						"firstName": "Hongwei",
						"lastName": "Dong",
						"creatorType": "author"
					},
					{
						"firstName": "Hongkui",
						"lastName": "Zeng",
						"creatorType": "author"
					},
					{
						"firstName": "Michael",
						"lastName": "Hawrylycz",
						"creatorType": "author"
					},
					{
						"firstName": "Giorgio A.",
						"lastName": "Ascoli",
						"creatorType": "author"
					},
					{
						"firstName": "Hanchuan",
						"lastName": "Peng",
						"creatorType": "author"
					}
				],
				"date": "2023-06-14",
				"DOI": "10.21203/rs.3.rs-2960606/v1",
				"abstractNote": "Classifications of single neurons at brain-wide scale is a powerful way to characterize the structural and functional organization of a brain. We acquired and standardized a large morphology database of 20,158 mouse neurons, and generated a whole-brain scale potential connectivity map of single neurons based on their dendritic and axonal arbors. With such an anatomy-morphology-connectivity mapping, we defined neuron connectivity types and subtypes (both called \"c-types\" for simplicity) for neurons in 31 brain regions. We found that neuronal subtypes defined by connectivity in the same regions may share statistically higher correlation in their dendritic and axonal features than neurons having contrary connectivity patterns. Subtypes defined by connectivity show distinct separation with each other, which cannot be recapitulated by morphology features, population projections, transcriptomic, and electrophysiological data produced to date. Within this paradigm, we were able to characterize the diversity in secondary motor cortical neurons, and subtype connectivity patterns in thalamocortical pathways. Our finding underscores the importance of connectivity in characterizing the modularity of brain anatomy, as well as the cell types and their subtypes. These results highlight that c-types supplement conventionally recognized transcriptional cell types (t-types), electrophysiological cell types (e-types), and morphological cell types (m-types) as an important determinant of cell classes and their identities.",
				"archiveID": "rs.3.rs-2960606",
				"language": "eng",
				"repository": "Research Square",
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
