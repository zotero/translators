{
	"translatorID": "8c1f42d5-02fa-437b-b2b2-73afc768eb07",
	"label": "Highwire 2.0",
	"creator": "Matt Burton",
	"target": "^[^\\?]+(content/([0-9]+/[0-9]+|current|firstcite|early)|search\\?submit=|search\\?fulltext=|cgi/collection/.+)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 200,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcs",
	"lastUpdated": "2012-03-09 16:29:00"
}

/*
 Translator for several Highwire journals. Example URLs:

1. Ajay Agrawal, Iain Cockburn, and John McHale, “Gone but not forgotten: knowledge flows, labor mobility, and enduring social relationships,” Journal of Economic Geography 6, no. 5 (November 2006): 571-591.
	http://joeg.oxfordjournals.org/content/6/5/571 :
2. Gordon L. Clark, Roberto Durán-Fernández, and Kendra Strauss, “‘Being in the market’: the UK house-price bubble and the intended structure of individual pension investment portfolios,” Journal of Economic Geography 10, no. 3 (May 2010): 331-359.
	http://joeg.oxfordjournals.org/content/10/3/331.abstract
3. Hans Maes, “Intention, Interpretation, and Contemporary Visual Art,” Brit J Aesthetics 50, no. 2 (April 1, 2010): 121-138.
	http://bjaesthetics.oxfordjournals.org/cgi/content/abstract/50/2/121
4. M L Giger et al., “Pulmonary nodules: computer-aided detection in digital chest images.,” Radiographics 10, no. 1 (January 1990): 41-51.
	http://radiographics.rsna.org/content/10/1/41.abstract
5. Mitch Leslie, "CLIP catches enzymes in the act," The Journal of Cell Biology 191, no. 1 (October 4, 2010): 2.
	   http://jcb.rupress.org/content/191/1/2.2.short
*/

//detect if there are multiple articles on the page
function hasMultiple(doc, url) {
	return url.match(/search?(.*?&)?submit=[^&]/) ||
		url.indexOf("content/by/section") != -1 ||
		doc.title.indexOf("Table of Contents") != -1 ||
		doc.title.indexOf("Early Edition") != -1 ||
		url.match(/cgi\/collection\/./) ||
		url.indexOf("content/firstcite") != -1 ||
		url.match(/content\/early\/recent$/);
}

//get abstract
function getAbstract(doc) {
	//abstract, summary
	var abstrSections = ZU.xpath(doc,
			'//div[contains(@id,"abstract") or @class="abstractSection"]\
			/*[not(contains(@class,"section-nav"))]');

	var abstr = '';
	var paragraph;

	for(var i=0, n=abstrSections.length; i<n; i++) {
		paragraph = abstrSections[i].textContent.trim();

		//ignore the abstract heading
		if( paragraph.toLowerCase() == 'abstract' ||
			paragraph.toLowerCase() == 'summary' ) {
			continue;
		}

		//put all lines of a paragraph on a single line
		paragraph = paragraph.replace(/\s+/g,' ');

		abstr += paragraph + "\n";
	}

	return abstr.trim();
}

//some journals display keywords
function getKeywords(doc) {
	//some journals are odd and don't work with this.
	//e.g. http://jn.nutrition.org/content/130/12/3122S.abstract
	var keywords = ZU.xpath(doc,'//ul[contains(@class,"kwd-group")]//a');

	var kwds = new Array();
	for(var i=0, n=keywords.length; i<n; i++) {
		kwds.push(keywords[i].textContent.trim());
	}

	return kwds;
}


//add using embedded metadata
function addEmbMeta(doc) {
	var translator = Zotero.loadTranslator("web");
	//Embedded Metadata translator
	translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
	translator.setDocument(doc);

	translator.setHandler("itemDone", function(obj, item) {
		//remove all caps in Names and Titles
		for (i in item.creators){
			item.creators[i].lastName =
				ZU.capitalizeTitle(item.creators[i].lastName, true);
			item.creators[i].firstName =
				ZU.capitalizeTitle(item.creators[i].firstName, true);
		}

		item.title = ZU.capitalizeTitle(item.title,true);

		if(!item.abstractNote) item.abstractNote = getAbstract(doc);

		if( !item.tags || item.tags.length < 1 ) item.tags = getKeywords(doc);

		if (item.notes) item.notes = [];

		item.complete();
	});

	translator.translate();
}

function detectWeb(doc, url) {
	var highwiretest = false;

	//quick test for highwire embedded pdf page
	highwiretest = url.indexOf('.pdf+html') != -1;

	//only queue up the sidebar for data extraction (it seems to always be present)
	if(highwiretest && url.indexOf('?frame=sidebar') == -1) {
		return null;
	}

	if (!highwiretest) {
		// lets hope this installations don't tweak this...
		highwiretest = ZU.xpath(doc,
				"//link[@href='/shared/css/hw-global.css']").length;
	}

	if(highwiretest) {
		if (hasMultiple(doc, url)) {
			return "multiple";
		} else if ( url.match("content/(early/)?[0-9]+") && 
					url.indexOf('/suppl/') == -1 ) {
			return "journalArticle";
		}
	}
}

function doWeb(doc, url) {
	if (hasMultiple(doc, url)) {
		if (!url) url = doc.documentElement.location;

		//get a list of URLs to import
		if ( doc.title.indexOf("Table of Contents") != -1 ||
			url.indexOf("content/firstcite") != -1 ) {
			var searchx = '//li[contains(@class, "toc-cit") and \
				not(ancestor::div/h2/a/text() = "Correction" or \
					ancestor::div/h2/a/text() = "Corrections")]';
			var titlex = './/h4';
		} else if ( url.indexOf("content/early/recent") != -1 ||
					doc.title.indexOf("Early Edition") != -1) {
			var searchx = '//div[contains(@class, "is-early-release") or \
								contains(@class, "from-current-issue")]';
			var titlex = './/span[contains(@class, "cit-title")]';
		} else if (url.indexOf("content/by/section") != -1 ||
					url.match(/cgi\/collection\/./)) {
			var searchx = '//li[contains(@class, "results-cit cit")]';
			var titlex = './/*[contains(@class, "cit-title")]';
		} else {
			//should we exclude corrections?
			//e.g. http://jcb.rupress.org/search?submit=yes&fulltext=%22CLIP%20catches%20enzymes%20in%20the%20act%22&sortspec=date&where=fulltext&y=0&x=0&hopnum=1
			var searchx = '//div[contains(@class,"results-cit cit")]';
			var titlex = './/span[contains(@class,"cit-title")]';
		}

		var next_res, title, link;
		var linkx = '(.//a)[1]/@href';
		var searchres = ZU.xpath(doc, searchx);
		var items = new Object();

		for(var i=0, n=searchres.length; i<n; i++) {
			next_res = searchres[i];

			title = ZU.xpathText(next_res, titlex);
			link = ZU.xpathText(next_res, linkx);
			if(link && title) {
				items[link] = title.trim();
			}
		}

		Zotero.selectItems(items, function(selectedItems) {
			if( selectedItems == null ) return true;

			var urls = new Array();
			for( var item in selectedItems ) {
				urls.push(item);
			}

			Zotero.Utilities.processDocuments(urls, addEmbMeta);
		});
	} else {
		addEmbMeta(doc);
	}
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://rer.sagepub.com/content/52/2/201.abstract",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Avi",
						"lastName": "Hofstein",
						"creatorType": "author"
					},
					{
						"firstName": "Vincent N",
						"lastName": "Lunetta",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
					}
				],
				"itemID": "http://rer.sagepub.com/content/52/2/201.abstract",
				"title": "The Role of the Laboratory in Science Teaching: Neglected Aspects of Research",
				"publisher": "SAGE Publications",
				"institution": "SAGE Publications",
				"company": "SAGE Publications",
				"label": "SAGE Publications",
				"distributor": "SAGE Publications",
				"date": "06/01/1982",
				"DOI": "10.3102/00346543052002201",
				"language": "en",
				"publicationTitle": "Review of Educational Research",
				"journalAbbreviation": "REVIEW OF EDUCATIONAL RESEARCH",
				"volume": "52",
				"issue": "2",
				"url": "http://rer.sagepub.com/content/52/2/201",
				"pages": "201-217",
				"ISSN": "0034-6543, 1935-1046",
				"accessDate": "CURRENT_TIMESTAMP",
				"libraryCatalog": "rer.sagepub.com",
				"shortTitle": "The Role of the Laboratory in Science Teaching",
				"abstractNote": "The laboratory has been given a central and distinctive role in science education, and science educators have suggested that there are rich benefits in learning from using laboratory activities. At this time, however, some educators have begun to question seriously the effectiveness and the role of laboratory work, and the case for laboratory teaching is not as self-evident as it once seemed. This paper provides perspectives on these issues through a review of the history, goals, and research findings regarding the laboratory as a medium of instruction in introductory science teaching. The analysis of research culminates with suggestions for researchers who are working to clarify the role of the laboratory in science education."
			}
		]
	},
	{
		"type": "web",
		"url": "http://sag.sagepub.com/content/early/2010/04/23/1046878110366277.abstract",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Trevor",
						"lastName": "Owens",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
					}
				],
				"itemID": "http://sag.sagepub.com/content/early/2010/04/23/1046878110366277.abstract",
				"title": "Modding the History of Science: Values at Play in Modder Discussions of Sid Meier’s CIVILIZATION",
				"publisher": "SAGE Publications",
				"institution": "SAGE Publications",
				"company": "SAGE Publications",
				"label": "SAGE Publications",
				"distributor": "SAGE Publications",
				"date": "2010-05-27",
				"DOI": "10.1177/1046878110366277",
				"language": "en",
				"publicationTitle": "Simulation & Gaming",
				"journalAbbreviation": "Simulation Gaming",
				"url": "http://sag.sagepub.com/content/early/2010/04/23/1046878110366277",
				"ISSN": "1046-8781, 1552-826X",
				"accessDate": "CURRENT_TIMESTAMP",
				"libraryCatalog": "sag.sagepub.com",
				"shortTitle": "Modding the History of Science",
				"abstractNote": "Sid Meier’s CIVILIZATION has been promoted as an educational tool, used as a platform for building educational simulations, and maligned as promoting Eurocentrism, bioimperialism, and racial superiority. This article explores the complex issues involved in interpreting a game through analysis of the ways modders (gamers who modify the game) have approached the history of science, technology, and knowledge embodied in the game. Through text analysis of modder discussion, this article explores the assumed values and tone of the community’s discourse. The study offers initial findings that CIVILIZATION modders value a variety of positive discursive practices for developing historical models. Community members value a form of historical authenticity, they prize subtlety and nuance in models for science in the game, and they communicate through civil consensus building. Game theorists, players, and scholars, as well as those interested in modeling the history, sociology, and philosophy of science, will be interested to see the ways in which CIVILIZATION III cultivates an audience of modders who spend their time reimagining how science and technology could work in the game."
			}
		]
	},
	{
		"type": "web",
		"url": "http://radiographics.rsna.org/content/10/1/41.full.pdf+html?frame=sidebar",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "M L",
						"lastName": "Giger",
						"creatorType": "author"
					},
					{
						"firstName": "K.",
						"lastName": "Doi",
						"creatorType": "author"
					},
					{
						"firstName": "H.",
						"lastName": "MacMahon",
						"creatorType": "author"
					},
					{
						"firstName": "C E",
						"lastName": "Metz",
						"creatorType": "author"
					},
					{
						"firstName": "F F",
						"lastName": "Yin",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
					}
				],
				"itemID": "http://radiographics.rsna.org/content/10/1/41.full.pdf+html?frame=sidebar",
				"title": "Pulmonary Nodules: Computer-Aided Detection in Digital Chest Images.",
				"publisher": "Radiological Society of North America",
				"institution": "Radiological Society of North America",
				"company": "Radiological Society of North America",
				"label": "Radiological Society of North America",
				"distributor": "Radiological Society of North America",
				"date": "01/01/1990",
				"language": "en",
				"publicationTitle": "Radiographics",
				"journalAbbreviation": "Radiographics",
				"volume": "10",
				"issue": "1",
				"url": "http://radiographics.rsna.org/content/10/1/41",
				"pages": "41-51",
				"ISSN": "0271-5333, 1527-1323",
				"accessDate": "CURRENT_TIMESTAMP",
				"libraryCatalog": "radiographics.rsna.org",
				"shortTitle": "Pulmonary nodules"
			}
		]
	},
	{
		"type": "web",
		"url": "http://bjaesthetics.oxfordjournals.org/search?fulltext=art&submit=yes&x=0&y=0",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://bjaesthetics.oxfordjournals.org/content/current",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://radiographics.rsna.org/cgi/collection/professional",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://jcb.rupress.org/content/early/by/section",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://rsbl.royalsocietypublishing.org/content/early/recent",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://bloodjournal.hematologylibrary.org/content/early/recent",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.pnas.org/content/108/52/20881.full",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Julien",
						"lastName": "Couthouis",
						"creatorType": "author"
					},
					{
						"firstName": "Michael P",
						"lastName": "Hart",
						"creatorType": "author"
					},
					{
						"firstName": "James",
						"lastName": "Shorter",
						"creatorType": "author"
					},
					{
						"firstName": "Mariely",
						"lastName": "DeJesus-Hernandez",
						"creatorType": "author"
					},
					{
						"firstName": "Renske",
						"lastName": "Erion",
						"creatorType": "author"
					},
					{
						"firstName": "Rachel",
						"lastName": "Oristano",
						"creatorType": "author"
					},
					{
						"firstName": "Annie X",
						"lastName": "Liu",
						"creatorType": "author"
					},
					{
						"firstName": "Daniel",
						"lastName": "Ramos",
						"creatorType": "author"
					},
					{
						"firstName": "Niti",
						"lastName": "Jethava",
						"creatorType": "author"
					},
					{
						"firstName": "Divya",
						"lastName": "Hosangadi",
						"creatorType": "author"
					},
					{
						"firstName": "James",
						"lastName": "Epstein",
						"creatorType": "author"
					},
					{
						"firstName": "Ashley",
						"lastName": "Chiang",
						"creatorType": "author"
					},
					{
						"firstName": "Zamia",
						"lastName": "Diaz",
						"creatorType": "author"
					},
					{
						"firstName": "Tadashi",
						"lastName": "Nakaya",
						"creatorType": "author"
					},
					{
						"firstName": "Fadia",
						"lastName": "Ibrahim",
						"creatorType": "author"
					},
					{
						"firstName": "Hyung-Jun",
						"lastName": "Kim",
						"creatorType": "author"
					},
					{
						"firstName": "Jennifer A",
						"lastName": "Solski",
						"creatorType": "author"
					},
					{
						"firstName": "Kelly L",
						"lastName": "Williams",
						"creatorType": "author"
					},
					{
						"firstName": "Jelena",
						"lastName": "Mojsilovic-Petrovic",
						"creatorType": "author"
					},
					{
						"firstName": "Caroline",
						"lastName": "Ingre",
						"creatorType": "author"
					},
					{
						"firstName": "Kevin",
						"lastName": "Boylan",
						"creatorType": "author"
					},
					{
						"firstName": "Neill R",
						"lastName": "Graff-Radford",
						"creatorType": "author"
					},
					{
						"firstName": "Dennis W",
						"lastName": "Dickson",
						"creatorType": "author"
					},
					{
						"firstName": "Dana",
						"lastName": "Clay-Falcone",
						"creatorType": "author"
					},
					{
						"firstName": "Lauren",
						"lastName": "Elman",
						"creatorType": "author"
					},
					{
						"firstName": "Leo",
						"lastName": "McCluskey",
						"creatorType": "author"
					},
					{
						"firstName": "Robert",
						"lastName": "Greene",
						"creatorType": "author"
					},
					{
						"firstName": "Robert G",
						"lastName": "Kalb",
						"creatorType": "author"
					},
					{
						"firstName": "Virginia M. -Y",
						"lastName": "Lee",
						"creatorType": "author"
					},
					{
						"firstName": "John Q",
						"lastName": "Trojanowski",
						"creatorType": "author"
					},
					{
						"firstName": "Albert",
						"lastName": "Ludolph",
						"creatorType": "author"
					},
					{
						"firstName": "Wim",
						"lastName": "Robberecht",
						"creatorType": "author"
					},
					{
						"firstName": "Peter M",
						"lastName": "Andersen",
						"creatorType": "author"
					},
					{
						"firstName": "Garth A",
						"lastName": "Nicholson",
						"creatorType": "author"
					},
					{
						"firstName": "Ian P",
						"lastName": "Blair",
						"creatorType": "author"
					},
					{
						"firstName": "Oliver D",
						"lastName": "King",
						"creatorType": "author"
					},
					{
						"firstName": "Nancy M",
						"lastName": "Bonini",
						"creatorType": "author"
					},
					{
						"firstName": "Vivianna",
						"lastName": "Van Deerlin",
						"creatorType": "author"
					},
					{
						"firstName": "Rosa",
						"lastName": "Rademakers",
						"creatorType": "author"
					},
					{
						"firstName": "Zissimos",
						"lastName": "Mourelatos",
						"creatorType": "author"
					},
					{
						"firstName": "Aaron D",
						"lastName": "Gitler",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
					}
				],
				"itemID": "http://www.pnas.org/content/108/52/20881.full",
				"title": "A Yeast Functional Screen Predicts New Candidate ALS Disease Genes",
				"publisher": "National Acad Sciences",
				"institution": "National Academy of Sciences",
				"company": "National Academy of Sciences",
				"label": "National Academy of Sciences",
				"distributor": "National Academy of Sciences",
				"date": "12/27/2011",
				"DOI": "10.1073/pnas.1109434108",
				"language": "en",
				"publicationTitle": "Proceedings of the National Academy of Sciences",
				"journalAbbreviation": "PNAS",
				"volume": "108",
				"issue": "52",
				"url": "http://www.pnas.org/content/108/52/20881",
				"pages": "20881-20890",
				"ISSN": "0027-8424, 1091-6490",
				"accessDate": "CURRENT_TIMESTAMP",
				"libraryCatalog": "www.pnas.org",
				"abstractNote": "Amyotrophic lateral sclerosis (ALS) is a devastating and universally fatal neurodegenerative disease. Mutations in two related RNA-binding proteins, TDP-43 and FUS, that harbor prion-like domains, cause some forms of ALS. There are at least 213 human proteins harboring RNA recognition motifs, including FUS and TDP-43, raising the possibility that additional RNA-binding proteins might contribute to ALS pathogenesis. We performed a systematic survey of these proteins to find additional candidates similar to TDP-43 and FUS, followed by bioinformatics to predict prion-like domains in a subset of them. We sequenced one of these genes, TAF15, in patients with ALS and identified missense variants, which were absent in a large number of healthy controls. These disease-associated variants of TAF15 caused formation of cytoplasmic foci when expressed in primary cultures of spinal cord neurons. Very similar to TDP-43 and FUS, TAF15 aggregated in vitro and conferred neurodegeneration in Drosophila, with the ALS-linked variants having a more severe effect than wild type. Immunohistochemistry of postmortem spinal cord tissue revealed mislocalization of TAF15 in motor neurons of patients with ALS. We propose that aggregation-prone RNA-binding proteins might contribute very broadly to ALS pathogenesis and the genes identified in our yeast functional screen, coupled with prion-like domain prediction analysis, now provide a powerful resource to facilitate ALS disease gene discovery."
			}
		]
	}
]
/** END TEST CASES **/