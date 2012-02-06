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
	"browserSupport": "gcsib",
	"lastUpdated": "2012-02-06 05:13:31"
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
	return url.match("search\\?submit=") ||
		url.match("search\\?fulltext=") ||
		url.match("content/by/section") || 
		doc.title.match("Table of Contents") || 
		doc.title.match("Early Edition") || 
		url.match("cgi/collection/.+") || 
		url.match("content/firstcite") ||
		url.match("content/early/recent$");
}

//create a url to the PDF based on the article URL
function getPdfUrl(url) {
	if (url.match("cgi/content")) {
		return url.replace(/cgi\/content\/abstract/, "content") + ".full.pdf";
	// This is here to catch those pdf+html pages
	} else if (url.match("\.full\.pdf")) {
		return url.slice(0, url.lastIndexOf(".full.pdf")) + ".full.pdf";
	} else {
	// This is not ideal...todo: brew a regex that grabs the correct URL
		return url.slice(0, url.lastIndexOf(".")) + ".full.pdf";
	}
}

//get citation manager ID for the article
function getCitMgrId(text) {
	/* To use XPath, we would need to create a DOM object,
	   which is tricky on HTML, since it is not always well-formed.
	   This regex seems to work on all Highwire 2.0 sites */

	var match = text.match(/\bgca=(.+?)["&]/i);
	if (!match) {
		Zotero.debug('Failed to detect citation manager ID');
		return null;
	}

	return match[1];
}

//return the fully formatted URL to the citation manager
function getCitMgrUrl(doc, text) {
	var host = doc.location.protocol + '//' + doc.location.host + "/";
	var id = getCitMgrId(text);

	if(!id) {
		return null;
	}

	return host + 'citmgr?type=refman&gca=' + id;
}

//add an item from RIS text
function addRIS(text, url) {
	var pdfurl = getPdfUrl(url);

	//Is there a way to clear translator instead of reloading it??
	var translator = Zotero.loadTranslator("import");
	//RIS translator
	translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");

	translator.setString(text);

	// Sometimes Highwire 2.0 has blank entries for N1
	if (text.match(/N1\s+\-\s+(10\..*)\n/)) {
		var doi = text.match(/N1\s+\-\s+(.*)\n/)[1];
	}

	translator.setHandler("itemDone", function(obj, item) {
		item.attachments = [
			{url:url, title:"Snapshot", mimeType:"text/html"},
			{url:pdfurl, title:"Full Text PDF", mimeType:"application/pdf"}
		];
		if (doi) item.DOI = doi;
		
		//remove all caps in Names and Titles
		for (i in item.creators){
			if (item.creators[i].lastName && item.creators[i].lastName == item.creators[i].lastName.toUpperCase()) {
				item.creators[i].lastName = Zotero.Utilities.capitalizeTitle(item.creators[i].lastName.toLowerCase(),true);
			}
			if (item.creators[i].firstName && item.creators[i].firstName == item.creators[i].firstName.toUpperCase()) {
				item.creators[i].firstName = Zotero.Utilities.capitalizeTitle(item.creators[i].firstName.toLowerCase(),true);
			}
		}
		if (item.title == item.title.toUpperCase()) {
			item.title = Zotero.Utilities.capitalizeTitle(item.title.toLowerCase(),true);
		}

		if (item.notes) item.notes = [];
		item.complete();
	});
	translator.translate();
}

function detectWeb(doc, url) {
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
		if (prefix == 'x') return namespace; else return null;
	} : null;
	
	var highwiretest = false;

	//quick test for highwire embedded pdf page
	highwiretest = url.match(/\.pdf\+html/);

	//only queue up the sidebar for data extraction (it seems to always be present)
	if(highwiretest && !url.match(/\\?frame=sidebar/)) {
		return null;
	}

	if (!highwiretest) {
		// lets hope this installations don't tweak this...
		highwiretest = doc.evaluate("//link[@href = '/shared/css/hw-global.css']", doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext();
	}
	
	if(highwiretest) {
		if (hasMultiple(doc, url)) {
			return "multiple";
		} else if (url.match("content/(early/)?[0-9]+")) {
			return "journalArticle";
		}
	}
}

function doWeb(doc, url) {
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
		if (prefix == 'x') return namespace; else return null;
	} : null;

	if (!url) url = doc.documentElement.location;

	if (hasMultiple(doc, url)) {
		//get a list of URLs to import
		if (doc.title.match("Table of Contents")
			|| doc.title.match("Early Edition")
			|| url.match("content/firstcite")) {
			var searchx = '//li[contains(@class, "toc-cit") and not(ancestor::div/h2/a/text() = "Correction" or ancestor::div/h2/a/text() = "Corrections")]'; 
			var titlex = './/h4';
		} else if (url.match("content/early/recent")) {
			var searchx = '//div[contains(@class, "is-early-release")]';
			var titlex = './/span[contains(@class, "cit-title")]';
		} else if (url.match("content/by/section") || url.match("cgi/collection/.+")) {
			var searchx = '//li[contains(@class, "results-cit cit")]'; 
			var titlex = './/span[contains(@class, "cit-title")]';
		} else {
			var searchx = '//div[contains(@class,"results-cit cit")]';
			var titlex = './/span[contains(@class,"cit-title")]';
		}	
		var linkx = './/a[1]';
		var searchres = doc.evaluate(searchx, doc, nsResolver, XPathResult.ANY_TYPE, null);
		var next_res, title, link;
		var items = new Object();
		while (next_res = searchres.iterateNext()) {
			title = doc.evaluate(titlex, next_res, nsResolver, XPathResult.ANY_TYPE, null).iterateNext().textContent;
			link = doc.evaluate(linkx, next_res, nsResolver, XPathResult.ANY_TYPE, null).iterateNext();
			if(link) {
				items[link.href] = title;
			}
		}
		Zotero.selectItems(items, function(selectedItems) { items = selectedItems; });
		var arts = new Array();
		for (var i in items) {
			arts.push(i);
		}
		if(arts.length == 0){
			Zotero.debug('no items');
			return false;
		}

		var newurls = new Array();
		for each (var i in arts) {
			newurls.push(i);
		}

		Zotero.Utilities.HTTP.doGet(arts, function(text) {
			var get, newurl;

			newurl = newurls.shift();
			citMgrUrl = getCitMgrUrl(doc, text);
			if(!citMgrUrl) {
				return false;
			}

			Zotero.Utilities.HTTP.doGet(citMgrUrl, function(text) {
				addRIS(text, newurl);
			});
		});
	}
	else {
		var citMgrUrl = getCitMgrUrl(doc, doc.documentElement.innerHTML);
		if(!citMgrUrl) {
			return false;
		}

		Zotero.Utilities.HTTP.doGet(
			citMgrUrl,
			function(text) {
				addRIS(text, url);
			}
		);
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
						"lastName": "Hofstein",
						"firstName": "Avi",
						"creatorType": "author"
					},
					{
						"lastName": "Lunetta",
						"firstName": "Vincent N.",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"url": false,
						"title": "Snapshot",
						"mimeType": "text/html"
					},
					{
						"url": false,
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"title": "The Role of the Laboratory in Science Teaching: Neglected Aspects of Research",
				"date": "Summer 1982",
				"publicationTitle": "Review of Educational Research",
				"pages": "201 -217",
				"volume": "52",
				"issue": "2",
				"url": "http://rer.sagepub.com/content/52/2/201.abstract",
				"abstractNote": "The laboratory has been given a central and distinctive role in science education, and science educators have suggested that there are rich benefits in learning from using laboratory activities. At this time, however, some educators have begun to question seriously the effectiveness and the role of laboratory work, and the case for laboratory teaching is not as self-evident as it once seemed. This paper provides perspectives on these issues through a review of the history, goals, and research findings regarding the laboratory as a medium of instruction in introductory science teaching. The analysis of research culminates with suggestions for researchers who are working to clarify the role of the laboratory in science education.",
				"DOI": "10.3102/00346543052002201",
				"libraryCatalog": "Highwire 2.0",
				"shortTitle": "The Role of the Laboratory in Science Teaching"
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
						"lastName": "Owens",
						"firstName": "Trevor",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"url": false,
						"title": "Snapshot",
						"mimeType": "text/html"
					},
					{
						"url": false,
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"title": "Modding the History of Science: Values at Play in Modder Discussions of Sid Meier’s CIVILIZATION",
				"date": "May 27 , 2010",
				"publicationTitle": "Simulation & Gaming",
				"url": "http://sag.sagepub.com/content/early/2010/04/23/1046878110366277.abstract",
				"abstractNote": "Sid Meier’s CIVILIZATION has been promoted as an educational tool, used as a platform for building educational simulations, and maligned as promoting Eurocentrism, bioimperialism, and racial superiority. This article explores the complex issues involved in interpreting a game through analysis of the ways modders (gamers who modify the game) have approached the history of science, technology, and knowledge embodied in the game. Through text analysis of modder discussion, this article explores the assumed values and tone of the community’s discourse. The study offers initial findings that CIVILIZATION modders value a variety of positive discursive practices for developing historical models. Community members value a form of historical authenticity, they prize subtlety and nuance in models for science in the game, and they communicate through civil consensus building. Game theorists, players, and scholars, as well as those interested in modeling the history, sociology, and philosophy of science, will be interested to see the ways in which CIVILIZATION III cultivates an audience of modders who spend their time reimagining how science and technology could work in the game.",
				"DOI": "10.1177/1046878110366277",
				"libraryCatalog": "Highwire 2.0",
				"shortTitle": "Modding the History of Science"
			}
		]
	},
	{
		"type": "web",
		"url": "http://scx.sagepub.com/content/30/2/277.abstract",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"lastName": "Mulder",
						"firstName": "Henk A. J.",
						"creatorType": "author"
					},
					{
						"lastName": "Longnecker",
						"firstName": "Nancy",
						"creatorType": "author"
					},
					{
						"lastName": "Davis",
						"firstName": "Lloyd S.",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"url": false,
						"title": "Snapshot",
						"mimeType": "text/html"
					},
					{
						"url": false,
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"title": "The State of Science Communication Programs at Universities Around the World",
				"date": "December 01 , 2008",
				"publicationTitle": "Science Communication",
				"pages": "277 -287",
				"volume": "30",
				"issue": "2",
				"url": "http://scx.sagepub.com/content/30/2/277.abstract",
				"abstractNote": "Building on discussions at two workshops held at the recent 10th International Conference on the Public Communication of Science and Technology during June 2008 in Malmö, Sweden, this article proposes specific steps toward achieving a common understanding of the essential elements for academic programs in science communication. About 40 academics, science communication professionals, and students from at least 16 countries participated in this process.",
				"DOI": "10.1177/1075547008324878",
				"libraryCatalog": "Highwire 2.0"
			}
		]
	}
]
/** END TEST CASES **/