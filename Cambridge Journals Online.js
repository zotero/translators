{
	"translatorID": "850f4c5f-71fb-4669-b7da-7fb7a95500ef",
	"label": "Cambridge Journals Online",
	"creator": "Sean Takats, Michael Berkowitz, Avram Lyon, and Aurimas Vinckevicius",
	"target": "^https?://[^/]*journals.cambridge.org[^/]*//?action/(quickSearch|search|displayAbstract|displayFulltext|displayIssue|displayJournal)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2014-10-28 04:35:23"
}

function detectWeb(doc, url)	{
	var xpath = '//div[@class="tableofcontents-row"][div/input[@type="checkbox"][@name="toView"]]';
	if (url.indexOf("/action/displayAbstract") != -1
		|| url.indexOf("action/displayFulltext") != -1
	) {
		return "journalArticle";
	} else if (getSearchResults(doc, true)){
		return "multiple";			
	}
}

function getSearchResults(doc, checkOnly, extras) {
	var items = {}, found = false;
	var root = doc;
	
	// Some multiples pages display different tabs of multiples. Find the active one
	// e.g. http://journals.cambridge.org/action/displayJournal?jid=ORX
	var ajaxContainers = doc.getElementsByClassName('ajaxContainer');
	for (var i=0; i<ajaxContainers.length; i++) {
		if (ajaxContainers[i].offsetHeight) {
			// visible
			root = ajaxContainers[i];
			break;
		}
	}
	
	var rows = root.getElementsByClassName('tableofcontents-row');
	for (var i=0; i<rows.length; i++) {
		var id = ZU.xpathText(rows[i], './/input[@name="toView"][1]/@value');
		if (!id) continue;
		
		var title = ZU.xpathText(rows[i], './/h3/a/@title');
		if (!title) continue;
		
		if (checkOnly) return true;
		found = true;
		items[id] = title;
		
		if (extras) {
			var pdfUrl = rows[i].getElementsByClassName('type-pdf')[0];
			if (pdfUrl) {
				extras[id] = pdfUrl.href;
			}
		}
	}
	
	return found ? items : false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		var extras = {};
		Zotero.selectItems(getSearchResults(doc, false, extras), function(items) {
			if (!items) return true;
			
			var articles = [];
			for (var i in items) {
				articles.push({
					id: i,
					pdf: extras[i]
				});
			}
			fetch(articles);
		});
	} else {
		var article = {};
		
		var id = url.match(/\baid=(\d+)/);
		if (!id) throw new Error('Could not determine article ID');
		article.id = id[1];
		
		var pdfBar = doc.getElementById('navigation-help');
		if (pdfBar) {
			var pdfUrl = pdfBar.getElementsByClassName('typePDF')[0];
			if (!pdfUrl) {
				pdfUrl = ZU.xpath(pdfBar, './/a[img[@title="Download PDF"]]')[0]
					|| ZU.xpath(pdfBar, './/a[img[starts-with(@title,"Open PDF")]]')[0];
			}
			
			if (pdfUrl) article.pdf = pdfUrl.href;
		}
		
		article.doc = doc;
		
		fetch([article]);
	}
}

function fetch(articles) {
	var article = articles.shift();
	ZU.doPost('/action/exportCitation',
		'format=BibTex&Download=Export&displayAbstract=Yes&componentIds=' + encodeURIComponent(article.id),
		function(text) {
			parseData(text, article, function() { if (articles.length) fetch(articles) });
		}
	);
}

var months = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];

function parseData(text, article, next) {
	// Fix month (presented as a digit)
	text = text.replace(/\bmonth\s*=\s*{\s*(\d+)\s*}/g, function(match, m) {
		if (months[m-1]) return 'month = ' + months[m-1];
		return match;
	});
	
	var translator = Zotero.loadTranslator("import");
	// BibTeX
	translator.setTranslator("9cb70025-a888-4a29-a210-93ec52da40d4");
	translator.setString(text);
	translator.setHandler("itemDone", function(obj, item) {
		// Fix author capitalization. Served in all-caps
		for (var i=0; i<item.creators.length; i++) {
			var c = item.creators[i];
			if (c.firstName && c.firstName == c.firstName.toUpperCase()) {
				c.firstName = ZU.capitalizeTitle(c.firstName, true);
			}
			if (c.lastName == c.lastName.toUpperCase()) {
				c.lastName = ZU.capitalizeTitle(c.lastName, true);
			}
		}
		
		// Strip off ABSTRACT
		if (item.abstractNote) {
			item.abstractNote = item.abstractNote.replace(/^\s*ABSTRACT\s*/, '');
		}
		
		if (article.pdf) {
			item.attachments.push({
				title: 'Full Text PDF',
				url: article.pdf + '&toPdf=true',
				mimeType: 'application/pdf'
			});
		}
		
		var snapshot = {
			title: 'Cambridge Journals Snapshot'
		};
		if (article.doc) {
			snapshot.document = article.doc;
		} else {
			snapshot.url = '/action/displayAbstract?aid=' + encodeURIComponent(article.id);
			snapshot.mimeType = 'text/html';
		}
		item.attachments.push(snapshot);
		
		//if (item.tags.length) {
		item.complete();
		next();
		//	return;
		//}
		
		/* Seem to be rather infrequent. See http://journals.cambridge.org/action/displayAbstract?aid=1380884
		// Keywords seem to only come from RIS (but BibTeX has abstract and month). Is it worth it?
		ZU.doPost('/action/exportCitation',
			'format=RIS&Download=Export&displayAbstract=No&componentIds=' + encodeURIComponent(article.id),
			function(text) {
				var translator = Zotero.loadTranslator("import");
				// RIS
				translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
				translator.setString(text);
				translator.setHandler("itemDone", function(obj, risItem) {
					item.tags = risItem.tags;
					item.complete();
					next();
				})
				translator.translate();
			}
		);
		*/
	});
	translator.translate();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://journals.cambridge.org/action/displayAbstract?fromPage=online&aid=8267699&fulltextType=RA&fileId=S0021875810001738",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "“SAMO© as an Escape Clause”: Jean-Michel Basquiat's Engagement with a Commodified American Africanism",
				"creators": [
					{
						"firstName": "Laurie A.",
						"lastName": "Rodrigues",
						"creatorType": "author"
					}
				],
				"date": "May 2011",
				"DOI": "10.1017/S0021875810001738",
				"ISSN": "1469-5154",
				"abstractNote": "Heir to the racist configuration of the American art exchange and the delimiting appraisals of blackness in the American mainstream media, Jean-Michel Basquiat appeared on the late 1970s New York City street art scene – then he called himself “SAMO.” Not long thereafter, Basquiat grew into one of the most influential artists of an international movement that began around 1980, marked by a return to figurative painting. Given its rough, seemingly untrained and extreme, conceptual nature, Basquiat's high-art oeuvre might not look so sophisticated to the uninformed viewer. However, Basquiat's work reveals a powerful poetic and visual gift, “heady enough to confound academics and hip enough to capture the attention span of the hip hop nation,” as Greg Tate has remarked. As noted by Richard Marshall, Basquiat's aesthetic strength actually comes from his striving “to achieve a balance between the visual and intellectual attributes” of his artwork. Like Marshall, Tate, and others, I will connect with Basquiat's unique, self-reflexively experimental visual practices of signifying and examine anew Basquiat's active contribution to his self-alienation, as Hebdige has called it. Basquiat's aesthetic makes of his paintings economies of accumulation, building a productive play of contingency from the mainstream's constructions of race. This aesthetic move speaks to a need for escape from the perceived epistemic necessities of blackness. Through these economies of accumulation we see, as Tate has pointed out, Basquiat's “intellectual obsession” with issues such as ancestry/modernity, personhood/property and originality/origins of knowledge, driven by his tireless need to problematize mainstream media's discourses surrounding race – in other words, a commodified American Africanism.",
				"issue": "02",
				"itemID": "AMS:8267699",
				"libraryCatalog": "Cambridge Journals Online",
				"pages": "227–243",
				"publicationTitle": "Journal of American Studies",
				"shortTitle": "“SAMO© as an Escape Clause”",
				"url": "http://journals.cambridge.org/article_S0021875810001738",
				"volume": "45",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Cambridge Journals Snapshot"
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
		"url": "http://journals.cambridge.org/action/displayIssue?decade=2010&jid=PSR&volumeId=107&issueId=02&iid=8919472",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://journals.cambridge.org/action/displayFulltext?type=1&fid=8267701&jid=AMS&volumeId=45&issueId=02&aid=8267699&bodyId=&membershipNumber=&societyETOCSession=",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "“SAMO© as an Escape Clause”: Jean-Michel Basquiat's Engagement with a Commodified American Africanism",
				"creators": [
					{
						"firstName": "Laurie A.",
						"lastName": "Rodrigues",
						"creatorType": "author"
					}
				],
				"date": "May 2011",
				"DOI": "10.1017/S0021875810001738",
				"ISSN": "1469-5154",
				"abstractNote": "Heir to the racist configuration of the American art exchange and the delimiting appraisals of blackness in the American mainstream media, Jean-Michel Basquiat appeared on the late 1970s New York City street art scene – then he called himself “SAMO.” Not long thereafter, Basquiat grew into one of the most influential artists of an international movement that began around 1980, marked by a return to figurative painting. Given its rough, seemingly untrained and extreme, conceptual nature, Basquiat's high-art oeuvre might not look so sophisticated to the uninformed viewer. However, Basquiat's work reveals a powerful poetic and visual gift, “heady enough to confound academics and hip enough to capture the attention span of the hip hop nation,” as Greg Tate has remarked. As noted by Richard Marshall, Basquiat's aesthetic strength actually comes from his striving “to achieve a balance between the visual and intellectual attributes” of his artwork. Like Marshall, Tate, and others, I will connect with Basquiat's unique, self-reflexively experimental visual practices of signifying and examine anew Basquiat's active contribution to his self-alienation, as Hebdige has called it. Basquiat's aesthetic makes of his paintings economies of accumulation, building a productive play of contingency from the mainstream's constructions of race. This aesthetic move speaks to a need for escape from the perceived epistemic necessities of blackness. Through these economies of accumulation we see, as Tate has pointed out, Basquiat's “intellectual obsession” with issues such as ancestry/modernity, personhood/property and originality/origins of knowledge, driven by his tireless need to problematize mainstream media's discourses surrounding race – in other words, a commodified American Africanism.",
				"issue": "02",
				"itemID": "AMS:8267699",
				"libraryCatalog": "Cambridge Journals Online",
				"pages": "227–243",
				"publicationTitle": "Journal of American Studies",
				"shortTitle": "“SAMO© as an Escape Clause”",
				"url": "http://journals.cambridge.org/article_S0021875810001738",
				"volume": "45",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Cambridge Journals Snapshot"
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
		"url": "http://journals.cambridge.org/action/displayAbstract?fromPage=online&aid=1380884&fileId=S0022112007008166",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "High-resolution simulations of cylindrical density currents",
				"creators": [
					{
						"firstName": "Mariano I.",
						"lastName": "Cantero",
						"creatorType": "author"
					},
					{
						"firstName": "S.",
						"lastName": "Balachandar",
						"creatorType": "author"
					},
					{
						"firstName": "Marcelo H.",
						"lastName": "Garcia",
						"creatorType": "author"
					}
				],
				"date": "November 2007",
				"DOI": "10.1017/S0022112007008166",
				"ISSN": "1469-7645",
				"abstractNote": "Three-dimensional highly resolved simulations are presented for cylindrical density currents using the Boussinesq approximation for small density difference. Three Reynolds numbers (Re) are investigated (895, 3450 and 8950, which correspond to values of the Grashof number of 105, 1.5 × 106 and 107, respectively) in order to identify differences in the flow structure and dynamics. The simulations are performed using a fully de-aliased pseudospectral code that captures the complete range of time and length scales of the flow. The simulated flows present the main features observed in experiments at large Re. As the current develops, it transitions through different phases of spreading, namely acceleration, slumping, inertial and viscous Soon after release the interface between light and heavy fluids rolls up forming Kelvin–Helmholtz vortices. The formation of the first vortex sets the transition between acceleration and slumping phases. Vortex formation continues only during the slumping phase and the formation of the last Kelvin–Helmholtz vortex signals the departure from the slumping phase. The coherent Kelvin–Helmholtz vortices undergo azimuthal instabilities and eventually break up into small-scale turbulence. In the case of planar currents this turbulent region extends over the entire body of the current, while in the cylindrical case it only extends to the regions of Kelvin–Helmholtz vortex breakup. The flow develops three-dimensionality right from the beginning with incipient lobes and clefts forming at the lower frontal region. These instabilities grow in size and extend to the upper part of the front. Lobes and clefts continuously merge and split and result in a complex pattern that evolves very dynamically. The wavelength of the lobes grows as the flow spreads, while the local Re of the flow decreases. However, the number of lobes is maintained over time. Owing to the high resolution of the simulations, we have been able to link the lobe and cleft structure to local flow patterns and vortical structures. In the near-front region and body of the current several hairpin vortices populate the flow. Laboratory experiments have been performed at the higher Re and compared to the simulation results showing good agreement. Movies are available with the online version of the paper.",
				"itemID": "FLM:1380884",
				"libraryCatalog": "Cambridge Journals Online",
				"pages": "437–469",
				"publicationTitle": "Journal of Fluid Mechanics",
				"url": "http://journals.cambridge.org/article_S0022112007008166",
				"volume": "590",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Cambridge Journals Snapshot"
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
		"url": "http://journals.cambridge.org/action/displayJournal?jid=ORX",
		"items": "multiple",
		"defer": true
	}
]
/** END TEST CASES **/