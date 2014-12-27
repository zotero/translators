{
	"translatorID": "5af42734-7cd5-4c69-97fc-bc406999bdba",
	"label": "Atypon Journals",
	"creator": "Sebastian Karcher",
	"target": "^https?://[^?#]+(?:/doi/(?:abs|abstract|full|figure|ref|citedby|book)/10\\.|/action/doSearch\\?)|^https?://[^/]+/toc/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 270,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2014-10-04 22:19:55"
}

/*
Atypon Journals Translator
Copyright (C) 2011-2014 Sebastian Karcher

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program. If not, see <http://www.gnu.org/licenses/>.
*/


function detectWeb(doc, url) {
	if (url.search(/^https?:\/\/[^\/]+\/toc\/|\/action\/doSearch\?/) != -1) {
		return getSearchResults(doc, true) ? "multiple" : false;
	}
	
	if (url.indexOf('/doi/book/') != -1) {
		return 'book';
	}
	else if (url.search(/\.ch\d+$/)!=-1){
		return 'bookSection';
	}
	return "journalArticle";
}

function getSearchResults(doc, checkOnly, extras) {
	var articles = {};
	var container = doc.getElementsByName('frmSearchResults')[0]
		|| doc.getElementsByName('frmAbs')[0];
	if (!container) {
		Z.debug('Atypon: multiples container not found.');
		return false;
	}
	var rows = container.getElementsByClassName('articleEntry'),
		found = false,
		doiLink = 'a[contains(@href, "/doi/abs/") or contains(@href, "/doi/abstract/") or '
			+ 'contains(@href, "/doi/full/") or contains(@href, "/doi/book/")]';
	for (var i = 0; i<rows.length; i++) {
		var title = rows[i].getElementsByClassName('art_title')[0];
		if (!title) continue;
		title = ZU.trimInternal(title.textContent);
		
		var urlRow = rows[i];
		var url = ZU.xpathText(urlRow, '(.//' + doiLink + ')[1]/@href');
		
		if (!url) {
			// e.g. http://pubs.rsna.org/toc/radiographics/toc/33/7 shows links in adjacent div
			urlRow = rows[i].nextElementSibling;
			if (!urlRow || urlRow.classList.contains('articleEntry')) continue;
			
			url = ZU.xpathText(urlRow, '(.//' + doiLink + ')[1]/@href');
		}
		if (!url) continue;
		
		if (checkOnly) return true;
		found = true;
		
		if (extras) {
			extras[url] = { pdf: buildPdfUrl(url, urlRow) };
		}
		
		articles[url] = title;
	}
	
	if (!found){
		Z.debug("Trying an alternate multiple format");
		var rows = container.getElementsByClassName("item-details");
		for (var i = 0; i<rows.length; i++) {
			var title = ZU.xpathText(rows[i], './h3');
			if (!title) continue;
			title = ZU.trimInternal(title);
			
			var url = ZU.xpathText(rows[i], '(.//ul[contains(@class, "icon-list")]/li/'
				+ doiLink + ')[1]/@href');
			if (!url) continue;
			
			if (checkOnly) return true;
			found = true;
			
			if (extras) {
				extras[url] = { pdf: buildPdfUrl(url, rows[i]) };
			}
			
			articles[url] = title;
		}
	}
	
	return found ? articles : false;
}

// Keep this in line with target regexp
var replURLRegExp = /\/doi\/(?:abs|abstract|full|figure|ref|citedby|book)\//;

function buildPdfUrl(url, root) {
	if (!replURLRegExp.test(url)) return false; // The whole thing is probably going to fail anyway
	
	var pdfPaths = ['/doi/pdf/', '/doi/pdfplus/'];
	for (var i=0; i<pdfPaths.length; i++) {
		if (ZU.xpath(root, './/a[contains(@href, "' + pdfPaths[i] + '")]').length) {
			return url.replace(replURLRegExp, pdfPaths[i]);
		}
	}
	
	Z.debug('PDF link not found.')
	if (root.nodeType != 9 /*DOCUMENT_NODE*/) {
		Z.debug('Available links:');
		var links = root.getElementsByTagName('a');
		if (!links.length) Z.debug('No links');
		for (var i=0; i<links.length; i++) {
			Z.debug(links[i].href);
		}
	}
	
	return false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		var extras = {};
		Zotero.selectItems(getSearchResults(doc, false, extras), function (items) {
			if (!items) {
				return true;
			}
			var articles = [];
			for (var itemurl in items) {
				articles.push({
					url: itemurl.replace(/\?prev.+/, ""),
					extras: extras[itemurl]
				});
			}
			
			fetchArticles(articles);
		});

	} else {
		scrape(doc, url, {pdf: buildPdfUrl(url, doc)});
	}
}

function fixCase(str, titleCase) {
	if (str.toUpperCase() != str) return str;
	
	if (titleCase) {
		return ZU.capitalizeTitle(str, true);
	}
	
	return str.charAt(0) + str.substr(1).toLowerCase();
}

function fetchArticles(articles) {
	if (!articles.length) return;
	
	var article = articles.shift();
	ZU.processDocuments(article.url, function(doc, url) {
		scrape(doc, url, article.extras);
	},
	function() {
		if (articles.length) fetchArticles(articles);
	});
}

function scrape(doc, url, extras) {
	url = url.replace(/[?#].*/, "");
	var doi = url.match(/10\.[^?#]+/)[0];
	var citationurl = url.replace(replURLRegExp, "/action/showCitFormats?doi=");
	var abstract = ZU.xpathText(doc, '//div[@class="abstractSection"]')
	var tags = ZU.xpath(doc, '//p[@class="fulltext"]//a[contains(@href, "keywordsfield") or contains(@href, "Keyword=")]');
	Z.debug("Citation URL: " + citationurl);
	ZU.processDocuments(citationurl, function(citationDoc){
		var filename = citationDoc.evaluate('//form//input[@name="downloadFileName"]', citationDoc, null, XPathResult.ANY_TYPE, null).iterateNext().value;
		Z.debug("Filename: " + filename);
		var get = '/action/downloadCitation';
		var post = 'doi=' + doi + '&downloadFileName=' + filename + '&format=ris&direct=true&include=cit';
		ZU.doPost(get, post, function (text) {
			//Z.debug(text);
			var translator = Zotero.loadTranslator("import");
			// Calling the RIS translator
			translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
			translator.setString(text);
			translator.setHandler("itemDone", function (obj, item) {
				// Sometimes we get titles and authros in all caps
				item.title = fixCase(item.title);
				
				for (var i=0; i<item.creators.length; i++) {
					item.creators[i].lastName = fixCase(item.creators[i].lastName, true);
					if (item.creators[i].firstName) {
						item.creators[i].firstName = fixCase(item.creators[i].firstName, true);
					}
				}
				
				item.url = url;
				item.notes = [];
				for (var i in tags){
					item.tags.push(tags[i].textContent)
				}
				item.abstractNote = abstract;
				item.attachments = [];
				if (extras.pdf) {
					item.attachments.push({
						url: extras.pdf,
						title: "Full Text PDF",
						mimeType: "application/pdf"
					});
				}
				
				item.attachments.push({
					document: doc,
					title: "Snapshot",
					mimeType: "text/html"
				});
				item.libraryCatalog = url.replace(/^https?:\/\/(?:www\.)?/, '')
					.replace(/[\/:].*/, '') + " (Atypon)";
				item.complete();
			});
			translator.translate();
		});
	})
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.esajournals.org/doi/abs/10.1890/09-1234.1",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Assimilation of multiple data sets with the ensemble Kalman filter to improve forecasts of forest carbon dynamics",
				"creators": [
					{
						"lastName": "Gao",
						"firstName": "Chao",
						"creatorType": "author"
					},
					{
						"lastName": "Wang",
						"firstName": "Han",
						"creatorType": "author"
					},
					{
						"lastName": "Weng",
						"firstName": "Ensheng",
						"creatorType": "author"
					},
					{
						"lastName": "Lakshmivarahan",
						"firstName": "S.",
						"creatorType": "author"
					},
					{
						"lastName": "Zhang",
						"firstName": "Yanfen",
						"creatorType": "author"
					},
					{
						"lastName": "Luo",
						"firstName": "Yiqi",
						"creatorType": "author"
					}
				],
				"date": "February 22, 2011",
				"DOI": "10.1890/09-1234.1",
				"ISSN": "1051-0761",
				"abstractNote": "The ensemble Kalman filter (EnKF) has been used in weather forecasting to assimilate observations into weather models. In this study, we examine how effectively forecasts of a forest carbon cycle can be improved by assimilating observations with the EnKF. We used the EnKF to assimilate into the terrestrial ecosystem (TECO) model eight data sets collected at the Duke Forest between 1996 and 2004 (foliage biomass, fine root biomass, woody biomass, litterfall, microbial biomass, forest floor carbon, soil carbon, and soil respiration). We then used the trained model to forecast changes in carbon pools from 2004 to 2012. Our daily analysis of parameters indicated that all the exit rates were well constrained by the EnKF, with the exception of the exit rates controlling the loss of metabolic litter and passive soil organic matter. The poor constraint of these two parameters resulted from the low sensitivity of TECO predictions to their values and the poor correlation between these parameters and the observed variables. Using the estimated parameters, the model predictions and observations were in agreement. Model forecasts indicate 15 380–15 660 g C/m2 stored in Duke Forest by 2012 (a 27% increase since 2004). Parameter uncertainties decreased as data were sequentially assimilated into the model using the EnKF. Uncertainties in forecast carbon sinks increased over time for the long-term carbon pools (woody biomass, structure litter, slow and passive SOM) but remained constant over time for the short-term carbon pools (foliage, fine root, metabolic litter, and microbial carbon). Overall, EnKF can effectively assimilate multiple data sets into an ecosystem model to constrain parameters, forecast dynamics of state variables, and evaluate uncertainty.",
				"issue": "5",
				"journalAbbreviation": "Ecological Applications",
				"libraryCatalog": "esajournals.org (Atypon)",
				"pages": "1461-1473",
				"publicationTitle": "Ecological Applications",
				"url": "http://www.esajournals.org/doi/abs/10.1890/09-1234.1",
				"volume": "21",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					"carbon cycle",
					"data assimilation",
					"ecological forecast",
					"ensemble Kalman filter (EnKF)",
					"parameter estimation",
					"uncertainty analysis"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.esajournals.org/toc/ecap/21/5",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://pubs.rsna.org/toc/radiographics/toc/33/7",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://pubs.rsna.org/doi/abs/10.1148/rg.337125073",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Congenital and Hereditary Causes of Sudden Cardiac Death in Young Adults: Diagnosis, Differential Diagnosis, and Risk Stratification",
				"creators": [
					{
						"lastName": "Stojanovska",
						"firstName": "Jadranka",
						"creatorType": "author"
					},
					{
						"lastName": "Garg",
						"firstName": "Anubhav",
						"creatorType": "author"
					},
					{
						"lastName": "Patel",
						"firstName": "Smita",
						"creatorType": "author"
					},
					{
						"lastName": "Melville",
						"firstName": "David M.",
						"creatorType": "author"
					},
					{
						"lastName": "Kazerooni",
						"firstName": "Ella A.",
						"creatorType": "author"
					},
					{
						"lastName": "Mueller",
						"firstName": "Gisela C.",
						"creatorType": "author"
					}
				],
				"date": "November 1, 2013",
				"DOI": "10.1148/rg.337125073",
				"ISSN": "0271-5333",
				"abstractNote": "Sudden cardiac death is defined as death from unexpected circulatory arrest—usually a result of cardiac arrhythmia—that occurs within 1 hour of the onset of symptoms. Proper and timely identification of individuals at risk for sudden cardiac death and the diagnosis of its predisposing conditions are vital. A careful history and physical examination, in addition to electrocardiography and cardiac imaging, are essential to identify conditions associated with sudden cardiac death. Among young adults (18–35 years), sudden cardiac death most commonly results from a previously undiagnosed congenital or hereditary condition, such as coronary artery anomalies and inherited cardiomyopathies (eg, hypertrophic cardiomyopathy, arrhythmogenic right ventricular cardiomyopathy [ARVC], dilated cardiomyopathy, and noncompaction cardiomyopathy). Overall, the most common causes of sudden cardiac death in young adults are, in descending order of frequency, hypertrophic cardiomyopathy, coronary artery anomalies with an interarterial or intramural course, and ARVC. Often, sudden cardiac death is precipitated by ventricular tachycardia or fibrillation and may be prevented with an implantable cardioverter defibrillator (ICD). Risk stratification to determine the need for an ICD is challenging and involves imaging, particularly echocardiography and cardiac magnetic resonance (MR) imaging. Coronary artery anomalies, a diverse group of congenital disorders with a variable manifestation, may be depicted at coronary computed tomographic angiography or MR angiography. A thorough understanding of clinical risk stratification, imaging features, and complementary diagnostic tools for the evaluation of cardiac disorders that may lead to sudden cardiac death is essential to effectively use imaging to guide diagnosis and therapy.",
				"issue": "7",
				"journalAbbreviation": "RadioGraphics",
				"libraryCatalog": "pubs.rsna.org (Atypon)",
				"pages": "1977-2001",
				"publicationTitle": "RadioGraphics",
				"shortTitle": "Congenital and Hereditary Causes of Sudden Cardiac Death in Young Adults",
				"url": "http://pubs.rsna.org/doi/abs/10.1148/rg.337125073",
				"volume": "33",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html"
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
		"url": "http://pubs.rsna.org/action/doSearch?SeriesKey=&AllField=cardiac",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://epubs.siam.org/doi/book/10.1137/1.9780898718553",
		"items": [
			{
				"itemType": "book",
				"title": "Combinatorial Data Analysis",
				"creators": [
					{
						"lastName": "Hubert",
						"firstName": "L.",
						"creatorType": "author"
					},
					{
						"lastName": "Arabie",
						"firstName": "P.",
						"creatorType": "author"
					},
					{
						"lastName": "Meulman",
						"firstName": "J.",
						"creatorType": "author"
					}
				],
				"date": "January 1, 2001",
				"ISBN": "978-0-89871-478-4",
				"abstractNote": "The first part of this monograph's title, Combinatorial Data Analysis (CDA), refers to a wide class of methods for the study of relevant data sets in which the arrangement of a collection of objects is absolutely central. Characteristically, CDA is involved either with the identification of arrangements that are optimal for a specific representation of a given data set (usually operationalized with some specific loss or merit function that guides a combinatorial search defined over a domain constructed from the constraints imposed by the particular representation selected), or with the determination in a confirmatory manner of whether a specific object arrangement given a priori reflects the observed data. As the second part of the title, Optimization by Dynamic Programming, suggests, the sole focus of this monograph is on the identification of arrangements; it is then restricted further, to where the combinatorial search is carried out by a recursive optimization process based on the general principles of dynamic programming. For an introduction to confirmatory CDA without any type of optimization component, the reader is referred to the monograph by Hubert (1987). For the use of combinatorial optimization strategies other than dynamic programming for some (clustering) problems in CDA, the recent comprehensive review by Hansen and Jaumard (1997) provides a particularly good introduction.",
				"libraryCatalog": "epubs.siam.org (Atypon)",
				"numPages": "172",
				"publisher": "Society for Industrial and Applied Mathematics",
				"series": "Discrete Mathematics and Applications",
				"url": "http://epubs.siam.org/doi/book/10.1137/1.9780898718553",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html"
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
		"url": "http://epubs.siam.org/doi/abs/10.1137/1.9780898718553.ch6",
		"items": [
			{
				"itemType": "bookSection",
				"title": "6. Extensions and Generalizations",
				"creators": [],
				"date": "January 1, 2001",
				"ISBN": "978-0-89871-478-4",
				"abstractNote": "6.1 Introduction There are a variety of extensions of the topics introduced in the previous chapters that could be pursued, several of which have been mentioned earlier along with a comment that they would not be developed in any detail within this monograph. Among some of these possibilities are: (a) the development of a mechanism for generating all the optimal solutions for a specific optimization task when multiple optima may be present, not just one representative exemplar; (b) the incorporation of other loss or merit measures within the various sequencing and partitioning contexts discussed; (c) extensions to the analysis of arbitrary t-mode data, with possible (order) restrictions on some modes but not others, or to a framework in which proximity is given on more than just a pair of objects, e.g., proximity could be defined for all distinct object triples (see Daws (1996)); (d) the generalization of the task of constructing optimal ordered partitions to a two- or higher-mode context that may be hierarchical and/or have various types of order or precedence constraints imposed; and (e) the extension of object ordering constraints when they are to be imposed (e.g., in various partitioning and two-mode sequencing tasks) to the use of circular object orders, where optimal subsets or ordered sequences must now be consistent with respect to a circular contiguity structure.",
				"bookTitle": "Combinatorial Data Analysis",
				"libraryCatalog": "epubs.siam.org (Atypon)",
				"numberOfVolumes": "0",
				"pages": "103-114",
				"publisher": "Society for Industrial and Applied Mathematics",
				"series": "Discrete Mathematics and Applications",
				"url": "http://epubs.siam.org/doi/abs/10.1137/1.9780898718553.ch6",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html"
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
		"url": "http://online.liebertpub.com/doi/abs/10.1089/cmb.2009.0238",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Ray: Simultaneous Assembly of Reads from a Mix of High-Throughput Sequencing Technologies",
				"creators": [
					{
						"lastName": "Boisvert",
						"firstName": "Sébastien",
						"creatorType": "author"
					},
					{
						"lastName": "Laviolette",
						"firstName": "François",
						"creatorType": "author"
					},
					{
						"lastName": "Corbeil",
						"firstName": "Jacques",
						"creatorType": "author"
					}
				],
				"date": "October 20, 2010",
				"DOI": "10.1089/cmb.2009.0238",
				"ISSN": "1066-5277",
				"abstractNote": "An accurate genome sequence of a desired species is now a pre-requisite for genome research. An important step in obtaining a high-quality genome sequence is to correctly assemble short reads into longer sequences accurately representing contiguous genomic regions. Current sequencing technologies continue to offer increases in throughput, and corresponding reductions in cost and time. Unfortunately, the benefit of obtaining a large number of reads is complicated by sequencing errors, with different biases being observed with each platform. Although software are available to assemble reads for each individual system, no procedure has been proposed for high-quality simultaneous assembly based on reads from a mix of different technologies. In this paper, we describe a parallel short-read assembler, called Ray, which has been developed to assemble reads obtained from a combination of sequencing platforms. We compared its performance to other assemblers on simulated and real datasets. We used a combination of Roche/454 and Illumina reads to assemble three different genomes. We showed that mixing sequencing technologies systematically reduces the number of contigs and the number of errors. Because of its open nature, this new tool will hopefully serve as a basis to develop an assembler that can be of universal utilization (availability: http://deNovoAssembler.sf.Net/). For online Supplementary Material, see www.liebertonline.com.",
				"issue": "11",
				"journalAbbreviation": "Journal of Computational Biology",
				"libraryCatalog": "online.liebertpub.com (Atypon)",
				"pages": "1519-1533",
				"publicationTitle": "Journal of Computational Biology",
				"shortTitle": "Ray",
				"url": "http://online.liebertpub.com/doi/abs/10.1089/cmb.2009.0238",
				"volume": "17",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html"
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
		"url": "http://journals.jps.jp/toc/jpsj/2014/83/6",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.worldscientific.com/doi/abs/10.1142/S0219749904000195",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Probabilities from envariance?",
				"creators": [
					{
						"lastName": "Mohrhoff",
						"firstName": "Ulrich",
						"creatorType": "author"
					}
				],
				"date": "June 1, 2004",
				"DOI": "10.1142/S0219749904000195",
				"ISSN": "0219-7499",
				"abstractNote": "Zurek claims to have derived Born's rule noncircularly in the context of an ontological no-collapse interpretation of quantum states, without any \"deus ex machina imposition of the symptoms of classicality\". After a brief review of Zurek's derivation it is argued that this claim is exaggerated if not wholly unjustified. In order to demonstrate that Born's rule arises noncircularly from deterministically evolving quantum states, it is not sufficient to assume that quantum states are somehow associated with probabilities and then prove that these probabilities are given by Born's rule. One has to show how irreducible probabilities can arise in the context of an ontological no-collapse interpretation of quantum states. It is argued that the reason why all attempts to do this have so far failed is that quantum states are fundamentally algorithms for computing correlations between possible measurement outcomes, rather than evolving ontological states.",
				"issue": "02",
				"journalAbbreviation": "Int. J. Quantum Inform.",
				"libraryCatalog": "worldscientific.com (Atypon)",
				"pages": "221-229",
				"publicationTitle": "International Journal of Quantum Information",
				"url": "http://www.worldscientific.com/doi/abs/10.1142/S0219749904000195",
				"volume": "02",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html"
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
		"url": "http://www.annualreviews.org/doi/abs/10.1146/annurev.matsci.31.1.323",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "BLOCK COPOLYMER THIN FILMS: Physics and Applications1",
				"creators": [
					{
						"lastName": "Fasolka",
						"firstName": "Michael J",
						"creatorType": "author"
					},
					{
						"lastName": "Mayes",
						"firstName": "Anne M",
						"creatorType": "author"
					}
				],
				"date": "August 1, 2001",
				"DOI": "10.1146/annurev.matsci.31.1.323",
				"ISSN": "1531-7331",
				"abstractNote": "▪ Abstract  A two-part review of research concerning block copolymer thin films is presented. The first section summarizes experimental and theoretical studies of the fundamental physics of these systems, concentrating upon the forces that govern film morphology. The role of film thickness and surface energetics on the morphology of compositionally symmetric, amorphous diblock copolymer films is emphasized, including considerations of boundary condition symmetry, so-called hybrid structures, and surface chemical expression. Discussions of compositionally asymmetric systems and emerging research areas, e.g., liquid-crystalline and A-B-C triblock systems, are also included. In the second section, technological applications of block copolymer films, e.g., as lithographic masks and photonic materials, are considered. Particular attention is paid to means by which microphase domain order and orientation can be controlled, including exploitation of thickness and surface effects, the application of external fields, and the use of patterned substrates.",
				"issue": "1",
				"journalAbbreviation": "Annu. Rev. Mater. Res.",
				"libraryCatalog": "annualreviews.org (Atypon)",
				"pages": "323-355",
				"publicationTitle": "Annual Review of Materials Research",
				"shortTitle": "BLOCK COPOLYMER THIN FILMS",
				"url": "http://www.annualreviews.org/doi/abs/10.1146/annurev.matsci.31.1.323",
				"volume": "31",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html"
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
		"url": "http://www.emeraldinsight.com/toc/sajgbr/2/2",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.emeraldinsight.com/doi/full/10.1108/SAJGBR-10-2012-0120",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Irish coffee? Well, something better …",
				"creators": [
					{
						"lastName": "Rao",
						"firstName": "Pramila",
						"creatorType": "author"
					}
				],
				"date": "August 16, 2013",
				"DOI": "10.1108/SAJGBR-10-2012-0120",
				"ISSN": "2045-4457",
				"issue": "2",
				"journalAbbreviation": "S Asian Jnl of Global Bus Res",
				"libraryCatalog": "emeraldinsight.com (Atypon)",
				"pages": "165-171",
				"publicationTitle": "South Asian Journal of Global Business Research",
				"shortTitle": "Irish coffee?",
				"url": "http://www.emeraldinsight.com/doi/full/10.1108/SAJGBR-10-2012-0120",
				"volume": "2",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html"
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