{
	"translatorID": "d921155f-0186-1684-615c-ca57682ced9b",
	"label": "JSTOR",
	"creator": "Simon Kornblith, Sean Takats, Michael Berkowitz, and Eli Osherovich",
	"target": "https?://([^/]+\\.)?jstor\\.org/(discover/|action/(showArticle|doBasicSearch|doAdvancedSearch|doLocatorSearch|doAdvancedResults|doBasicResults)|stable/|pss/|openurl\\?|sici\\?)",
	"minVersion": "3.0.12",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsib",
	"lastUpdated": "2015-01-10 13:45:11"
}

function detectWeb(doc, url) {
	// See if this is a seach results page or Issue content
	if (doc.title == "JSTOR: Search Results") {
		return getSearchResults(doc, true) ? "multiple" : false;
	} else if (/stable|pss/.test(url) // Issues with DOIs can't be identified by URL
		&& getSearchResults(doc, true)
	) {
		return "multiple";
	}
	
	// If this is a view page, find the link to the citation
	var favLink = getFavLink(doc);
	if( (favLink && getJID(favLink.href)) || getJID(url) ) {
		return "journalArticle";
	}
}

function getSearchResults(doc, checkOnly) {
	// We have multiple results
	var resultsBlock = doc.getElementsByClassName('list-searchResults')[0];
	if (!resultsBlock) return false;
	
	var titles = ZU.xpath(resultsBlock, '//li//a[@class="title"]|\
		//li//div[@class="title" and not(a[@class="title"]) and a[contains(@href, "10.2307")]]');
	var items = {}, found = false;
	for (var i=0; i<titles.length; i++) {
		var title = ZU.trimInternal(titles[i].textContent);
		var jid;
		if (titles[i].nodeName.toUpperCase() == 'A') {
			jid = getJID(titles[i].href);
		} else {
			//this looks like it's the default now. Not sure how common the others are.
			jid = ZU.xpathText(titles[i], './a[1]/@href');
			if (jid) jid = getJID(jid);
		}
		
		if (!jid || !title) continue;
		
		if (checkOnly) return true;
		found = true;
		items[jid] = title;
		
		//Zotero.debug("Found title " + title+" with JID "+ jid);
	}
	
	return found ? items : false;
}

function getFavLink(doc) {
	var a = doc.getElementById('favorites');
	if (a && a.href) return a;
}

function getJID(url) {
	var m = url.match(/(?:discover|pss|stable(?:\/info)?)\/(10\.\d+(?:%2F|\/)[^?]+|[a-z]*\d+)/);
	if (m) {
		var jid = decodeURIComponent(m[1]);
		if (jid.search(/10\.\d+\//) != 0) {
			Zotero.debug("Converting JID " + jid + " to JSTOR DOI");
			jid = '10.2307/' + jid;
		}
		return jid;
	}
	return false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == 'multiple') {
		Zotero.selectItems(getSearchResults(doc), function (selectedItems) {
			if (!selectedItems) {
				return true;
			}
			var jids = [];
			for (var j in selectedItems) {
				jids.push(j);
			}
			scrape(jids)
		});
	} else {
		// If this is a view page, find the link to the citation
		var favLink = getFavLink(doc);
		var jid;
		if (favLink && (jid = getJID(favLink.href))) {
			Zotero.debug("JID found 1 " + jid);
			scrape([jid]);
		}
		else if (jid = getJID(url)) {
			Zotero.debug("JID found 2 " + jid);
			scrape([jid]);
		}
	}
}

function getTitleFromPage(doc) {
	var title = 
		// http://www.jstor.org/stable/131548
		ZU.xpathText(doc, '//div[@class="rw" and ./cite]/node()[position()>1]', null, ' ')
		// Need examples. May no longer be relevant
		|| ZU.xpathText(doc, '(//div[@class="bd"]/div[cite[@class="rw"]])[1]')
		|| ZU.xpathText(doc, '//div[@class="mainCite"]/h3')
		|| ZU.xpathText(doc, '//div[@class="bd"]/h2');
	if (title) return ZU.trimInternal(title);
}

function scrape(jids) {
	var postUrl = "/action/downloadSingleCitationSec?"
		+ "userAction=export&format=refman&direct=true&singleCitation=true";
	var postBody = "noDoi=yesDoi&doi=";
	
	(function next() {
		if (!jids.length) return;
		var jid = jids.shift()
		ZU.doPost(postUrl, postBody + encodeURIComponent(jid), function(text) {
			processRIS(text, jid);
			next();
		})
	})();
}

function processRIS(text, jid) {
	// load translator for RIS
	var translator = Zotero.loadTranslator("import");
	translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
	//Z.debug(text);
	
	//M1 is mostly useless and sometimes ends up in the issue field
	//we can use it to check if the article is a review though
	var review = text.search(/^M1\s+-\s+ArticleType:\s*book-review/m) !== -1;
	
	translator.setString(text);
	translator.setHandler("itemDone", function(obj, item) {
		//author names are not supplied as lastName, firstName in RIS
		//we fix it here
		var m;
		for(var i=0, n=item.creators.length; i<n; i++) {
			if(!item.creators[i].firstName
				&& (m = item.creators[i].lastName.match(/^(.+)\s+(\S+)$/))) {
				item.creators[i].firstName = m[1];
				item.creators[i].lastName = m[2];
				delete item.creators[i].fieldMode;
			}
		}
		
		// Don't save HTML snapshot from 'UR' tag
		item.attachments = [];
		
		if (/stable\/(\d+)/.test(item.url)) {
			var pdfurl = "/stable/pdfplus/" + jid  + ".pdf?acceptTC=true";
			item.attachments.push({
				url:pdfurl,
				title:"JSTOR Full Text PDF",
				mimeType:"application/pdf"
			});
		}
		
		if (item.ISSN) {
			item.ISSN = ZU.cleanISSN(item.ISSN);
		}
		
		if (!item.DOI) item.DOI = jid; // validate later
		
		//reviews don't have titles in RIS - we get them from the item page
		if (!item.title && review){
			if(item.url) {
				Zotero.debug("Attempting to retrieve review title from " + item.url);
				ZU.processDocuments(item.url, function(doc){
					item.title = getTitleFromPage(doc);
					if(item.title) {
						item.title = "Review of " + item.title;
					} else {
						item.title = "Review";
					}
					
					finalizeItem(item);
				});
				return;
			} else {
				item.title = "Review";
			}
		}
		
		finalizeItem(item);
	});
		
	translator.getTranslatorObject(function (trans) {
		trans.options.fieldMap = {
			'M1': {
				'__default': '__ignore'
			}
		}
		trans.doImport();	
	});
}
	
function finalizeItem(item) {
	// Validate DOI
	Zotero.debug("Validating DOI " + item.DOI);
	ZU.doGet('//api.crossref.org/works/' + encodeURIComponent(item.DOI) + '/agency',
		function(text) {
			try {
				var ra = JSON.parse(text);
				if (!ra || ra.status != "ok") {
					delete item.DOI;
				}
			} catch(e) {
				delete item.DOI;
				Zotero.debug("Could not parse JSON. Probably invalid DOI");
			}
		}, function() {
			item.complete();
		}
	);
}
	
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.jstor.org/action/doBasicSearch?Query=chicken&Search.x=0&Search.y=0&wc=on",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.jstor.org/stable/1593514?&Search=yes&searchText=chicken&list=hide&searchUri=%2Faction%2FdoBasicSearch%3FQuery%3Dchicken%26Search.x%3D0%26Search.y%3D0%26wc%3Don&prevSearch=&item=1&ttl=70453&returnArticleService=showFullText",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Chicken Primary Enterocytes: Inhibition of Eimeria tenella Replication after Activation with Crude Interferon-γ Supernatants",
				"creators": [
					{
						"lastName": "Dimier-Poisson",
						"firstName": "I. H.",
						"creatorType": "author"
					},
					{
						"lastName": "Bout",
						"firstName": "D. T.",
						"creatorType": "author"
					},
					{
						"lastName": "Quéré",
						"firstName": "P.",
						"creatorType": "author"
					}
				],
				"date": "September 1, 2004",
				"ISSN": "0005-2086",
				"abstractNote": "A reproducible and original method for the preparation of chicken intestine epithelial cells from 18-day-old embryos for long-term culture was obtained by using a mechanical isolation procedure, as opposed to previous isolation methods using relatively high concentrations of trypsin, collagenase, or EDTA. Chicken intestine epithelial cells typically expressed keratin and chicken E-cadherin, in contrast to chicken embryo fibroblasts, and they increased cell surface MHC II after activation with crude IFN-γ containing supernatants, obtained from chicken spleen cells stimulated with concanavalin A or transformed by reticuloendotheliosis virus. Eimeria tenella was shown to be able to develop until the schizont stage after 46 hr of culture in these chicken intestinal epithelial cells, but it was not able to develop further. However, activation with IFN-γ containing supernatants resulted in strong inhibition of parasite replication, as shown by incorporation of [3 H]uracil. Thus, chicken enterocytes, which are the specific target of Eimeria development in vivo, could be considered as potential local effector cells involved in the protective response against this parasite. /// Se desarrolló un método reproducible y original para la preparación de células epiteliales de intestino de embriones de pollo de 18 días de edad para ser empleadas como cultivo primario de larga duración. Las células epiteliales de intestino fueron obtenidas mediante un procedimiento de aislamiento mecánico, opuesto a métodos de aislamientos previos empleando altas concentraciones de tripsina, colagenasa o EDTA. Las células epiteliales de intestino expresaron típicamente keratina y caderina E, a diferencia de los fibroblastos de embrión de pollo, e incrementaron el complejo mayor de histocompatibilidad tipo II en la superficie de la célula posterior a la activación con sobrenadantes de interferón gamma. Los sobrenadantes de interferón gamma fueron obtenidos a partir de células de bazos de pollos estimuladas con concanavalina A o transformadas con el virus de reticuloendoteliosis. Se observó el desarrollo de la Eimeria tenella hasta la etapa de esquizonte después de 46 horas de cultivo en las células intestinales epiteliales de pollo pero no se observó un desarrollo posterior. Sin embargo, la activación de los enterocitos con los sobrenadantes con interferón gamma resultó en una inhibición fuerte de la replicación del parásito, comprobada mediante la incorporación de uracilo [3 H]. Por lo tanto, los enterocitos de pollo, blanco específico del desarrollo in vivo de la Eimeria, podrían ser considerados como células efectoras locales, involucradas en la respuesta protectora contra este parásito.",
				"issue": "3",
				"journalAbbreviation": "Avian Diseases",
				"libraryCatalog": "JSTOR",
				"pages": "617-624",
				"publicationTitle": "Avian Diseases",
				"rights": "Copyright © 2004 American Association of Avian Pathologists",
				"shortTitle": "Chicken Primary Enterocytes",
				"url": "http://www.jstor.org/stable/1593514",
				"volume": "48",
				"attachments": [
					{
						"title": "JSTOR Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.jstor.org/stable/10.1086/245591?&Search=yes&searchText=bread&searchText=engel&searchText=alpern&searchText=barbara&searchText=alone&list=hide&searchUri=%2Faction%2FdoAdvancedSearch%3Fq0%3Dnot%2Bby%2Bbread%2Balone%26f0%3Dall%26c1%3DAND%26q1%3Dbarbara%2Balpern%2Bengel%26f1%3Dall%26acc%3Don%26wc%3Don%26Search%3DSearch%26sd%3D%26ed%3D%26la%3D%26jo%3D&prevSearch=&item=2&ttl=82&returnArticleService=showFullText",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Not by Bread Alone: Subsistence Riots in Russia during World War I",
				"creators": [
					{
						"lastName": "Engel",
						"creatorType": "author",
						"firstName": "Barbara Alpern"
					}
				],
				"date": "December 1, 1997",
				"DOI": "10.1086/245591",
				"ISSN": "0022-2801",
				"issue": "4",
				"journalAbbreviation": "The Journal of Modern History",
				"libraryCatalog": "JSTOR",
				"pages": "696-721",
				"publicationTitle": "The Journal of Modern History",
				"rights": "Copyright © 1997 The University of Chicago Press",
				"shortTitle": "Not by Bread Alone",
				"url": "http://www.jstor.org/stable/10.1086/245591",
				"volume": "69",
				"attachments": [
					{
						"title": "JSTOR Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.jstor.org/stable/10.1086/508232",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Remaking Families: A Review Essay",
				"creators": [
					{
						"lastName": "Satz",
						"creatorType": "author",
						"firstName": "Debra"
					}
				],
				"date": "January 1, 2007",
				"DOI": "10.1086/508232",
				"ISSN": "0097-9740",
				"issue": "2",
				"journalAbbreviation": "Signs",
				"libraryCatalog": "JSTOR",
				"pages": "523-538",
				"publicationTitle": "Signs",
				"rights": "Copyright © 2007 The University of Chicago Press",
				"shortTitle": "Remaking Families",
				"url": "http://www.jstor.org/stable/10.1086/508232",
				"volume": "32",
				"attachments": [
					{
						"title": "JSTOR Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.jstor.org/stable/131548",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Review of Soviet Criminal Justice under Stalin by Peter H. Solomon",
				"creators": [
					{
						"lastName": "Burbank",
						"firstName": "Jane",
						"creatorType": "author"
					}
				],
				"date": "April 1, 1998",
				"ISSN": "0036-0341",
				"issue": "2",
				"journalAbbreviation": "Russian Review",
				"libraryCatalog": "JSTOR",
				"pages": "310-311",
				"publicationTitle": "Russian Review",
				"rights": "Copyright © 1998 The Editors and Board of Trustees of the Russian Review",
				"url": "http://www.jstor.org/stable/131548",
				"volume": "57",
				"attachments": [
					{
						"title": "JSTOR Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.jstor.org/stable/40398803",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Coauthorship Dynamics and Knowledge Capital: The Patterns of Cross-Disciplinary Collaboration in Information Systems Research",
				"creators": [
					{
						"lastName": "Oh",
						"firstName": "Wonseok",
						"creatorType": "author"
					},
					{
						"lastName": "Choi",
						"firstName": "Jin Nam",
						"creatorType": "author"
					},
					{
						"lastName": "Kim",
						"firstName": "Kimin",
						"creatorType": "author"
					}
				],
				"date": "December 1, 2005",
				"ISSN": "0742-1222",
				"abstractNote": "From the social network perspective, this study explores the ontological structure of knowledge sharing activities engaged in by researchers in the field of information systems (IS) over the past three decades. We construct a knowledge network based on coauthorship patterns extracted from four major journals in the IS field in order to analyze the distinctive characteristics of each subfield and to assess the amount of internal and external knowledge exchange that has taken place among IS researchers. This study also tests the role of different types of social capital that influence the academic impact of researchers. Our results indicate that the proportion of coauthored IS articles in the four journals has doubled over the past 25 years, from merely 40 percent in 1978 to over 80 percent in 2002. However, a significant variation exists in terms of the shape, density, and centralization of knowledge exchange networks across the four subfields of IS—namely, behavioral science, organizational science, computer science, and economic science. For example, the behavioral science subgroup, in terms of internal cohesion among researchers, tends to develop the most dense collaborative relationships, whereas the computer science subgroup is the most fragmented. Moreover, external collaboration across these subfields appears to be limited and severely unbalanced. Across the four subfields, on average, less than 20 percent of the research collaboration ties involved researchers from different subdisciplines. Finally, the regression analysis reveals that knowledge capital derived from a network rich in structural holes has a positive influence on an individual researcher's academic performance.",
				"issue": "3",
				"journalAbbreviation": "Journal of Management Information Systems",
				"libraryCatalog": "JSTOR",
				"pages": "265-292",
				"publicationTitle": "Journal of Management Information Systems",
				"rights": "Copyright © 2005 M.E. Sharpe, Inc.",
				"shortTitle": "Coauthorship Dynamics and Knowledge Capital",
				"url": "http://www.jstor.org/stable/40398803",
				"volume": "22",
				"attachments": [
					{
						"title": "JSTOR Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.jstor.org/action/doBasicSearch?Query=%28solomon+criminal+justice%29+AND+disc%3A%28slavicstudies-discipline+OR+history-discipline%29&prq=%28criminal+justice%29+AND+disc%3A%28slavicstudies-discipline+OR+history-discipline%29&hp=25&acc=on&wc=on&fc=off&so=rel&racc=off",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.jstor.org/stable/info/10.1525/rep.2014.128.1.1",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "“Judaism” as Political Concept: Toward a Critique of Political Theology",
				"creators": [
					{
						"lastName": "Nirenberg",
						"firstName": "David",
						"creatorType": "author"
					}
				],
				"date": "November 1, 2014",
				"DOI": "10.1525/rep.2014.128.1.1",
				"ISSN": "0734-6018",
				"abstractNote": "This article traces a long history in Christian political thought of linking politics, statecraft, and worldly authority to the broader category of carnal literalism, typed as “Jewish” by the Pauline tradition. This tradition produced a tendency to discuss political error in terms of Judaism, with the difference between mortal and eternal, private and public, tyrant and legitimate monarch, mapped onto the difference between Jew and Christian. As a result of this history, transcendence as a political ideal has often figured (and perhaps still figures?) its enemies as Jewish.",
				"issue": "1",
				"journalAbbreviation": "Representations",
				"libraryCatalog": "JSTOR",
				"pages": "1-29",
				"publicationTitle": "Representations",
				"rights": "Copyright © 2014 University of California Press",
				"shortTitle": "“Judaism” as Political Concept",
				"url": "http://www.jstor.org/stable/10.1525/rep.2014.128.1.1",
				"volume": "128",
				"attachments": [
					{
						"title": "JSTOR Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.jstor.org/discover/10.1086/378695?uid=3739832&uid=2&uid=4&uid=3739256&sid=21105503736473",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Salaries, Turnover, and Performance in the Federal Criminal Justice System",
				"creators": [
					{
						"lastName": "Boylan",
						"creatorType": "author",
						"firstName": "Richard T."
					}
				],
				"date": "April 1, 2004",
				"DOI": "10.1086/378695",
				"ISSN": "0022-2186",
				"abstractNote": "Abstract The effect of salaries on turnover and performance is analyzed for U.S. attorneys in office during the years 1969 through 1999. Lower salaries are shown to increase the turnover of U.S. attorneys, and higher turnover is shown to reduce output. Two features distinguish U.S. attorneys (chief federal prosecutors) from other public‐ and private‐sector employees. First, since 1977, U.S. attorney salaries have been tied to the salaries of members of Congress and are thus exogenously determined. Second, there are public measures for the output of U.S. attorneys. Both features simplify the study of the effect of salaries on turnover and performance.",
				"issue": "1",
				"journalAbbreviation": "Journal of Law and Economics",
				"libraryCatalog": "JSTOR",
				"pages": "75-92",
				"publicationTitle": "Journal of Law and Economics",
				"rights": "Copyright © 2004 The University of Chicago",
				"url": "http://www.jstor.org/stable/10.1086/378695",
				"volume": "47",
				"attachments": [
					{
						"title": "JSTOR Full Text PDF",
						"mimeType": "application/pdf"
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