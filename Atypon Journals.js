{
	"translatorID": "5af42734-7cd5-4c69-97fc-bc406999bdba",
	"label": "Atypon Journals",
	"creator": "Sebastian Karcher and Abe Jellinek",
	"target": "^https?://[^?#]+(/doi/((abs|abstract|full|figure|ref|citedby|book)/)?10\\.|/action/doSearch\\?)|^https?://[^/]+/toc/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 270,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-05-10 18:26:02"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Atypon Journals Translator
	Copyright © 2011-2022 Sebastian Karcher and Abe Jellinek

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


function detectWeb(doc, url) {
	if (url.search(/^https?:\/\/[^/]+\/toc\/|\/action\/doSearch\?|\/doi\/book\//) != -1) {
		return getSearchResults(doc, true) ? "multiple" : false;
	}
	
	var citLink = doc.querySelector('a[href*="/action/showCitFormats"], a[href*="#pill-citations"], .actions-block-container__export-citation, div.pill__item, section.pill__item div.citation-download, a[href*="#tab-citations"]');
	if (citLink) {
		if (url.includes('/doi/book/')) {
			return 'book';
		}
		else if (url.search(/\.ch\d+$/) != -1) {
			return 'bookSection';
		}
		else if (isConference(doc)) {
			return 'conferencePaper';
		}
		return "journalArticle";
	}

	return false;
}

function getSearchResults(doc, checkOnly, extras) {
	var articles = {};
	var container = doc.getElementsByName('frmSearchResults')[0]
		|| doc.getElementsByName('frmAbs')[0]
		|| doc.querySelector('.search__body, .search-result, .table-of-content');
	if (!container) {
		Z.debug('Atypon: multiples container not found.');
		return false;
	}

	// Add whole book entry for book ToCs, but require chapter entries
	// before returning true if checkOnly
	if (doc.querySelector('.book-toc')) {
		let title = attr(doc, 'meta[property="og:title"]', 'content')
			|| doc.title;
		title = title.split('|')[0];
		let url = doc.location.href;
		if (title) {
			articles[url] = title;
			if (extras) {
				extras[url] = {};
			}
		}
	}

	var rows = container.getElementsByClassName('articleEntry'),
		found = false,
		doiLink = 'a[contains(@href, "/doi/abs/") or contains(@href, "/doi/abstract/") or '
			+ 'contains(@href, "/doi/full/") or contains(@href, "/doi/book/")]';
	for (var i = 0; i < rows.length; i++) {
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
	
	if (!found) {
		Z.debug("Trying alternate multiple format #1");
		rows = container.getElementsByClassName("item-details");
		for (let i = 0; i < rows.length; i++) {
			let title = ZU.xpathText(rows[i], './h3');
			if (!title) continue;
			title = ZU.trimInternal(title);
			
			let url = ZU.xpathText(rows[i], '(.//ul[contains(@class, "icon-list")]/li/'
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
	
	if (!found) {
		Z.debug("Trying alternate multiple format #2");
		rows = container.querySelectorAll('.issue-item, .item__body');
		for (let row of rows) {
			let title = text(row, 'a');
			if (!title) continue;
			title = ZU.trimInternal(title);
			
			let url = attr(row, 'a', 'href');
			if (!url) continue;
			
			if (checkOnly) return true;
			found = true;
			
			if (extras) {
				extras[url] = { pdf: buildPdfUrl(url, row) };
			}
			
			articles[url] = title;
		}
	}

	if (!found) {
		Z.debug("Trying alternate multiple format #3");
		rows = container.querySelectorAll('.items-results .card');
		for (let row of rows) {
			let title = text(row, 'a');
			if (!title) continue;
			title = ZU.trimInternal(title);
			
			let url = attr(row, 'a', 'href');
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
var replURLRegExp = /\/doi\/((?:abs|abstract|full|figure|ref|citedby|book)\/)?/;

function buildPdfUrl(url, root) {
	if (!replURLRegExp.test(url)) return false; // The whole thing is probably going to fail anyway
	
	var pdfPaths = ['/doi/pdf/', '/doi/epdf', '/doi/pdfplus/'];
	for (let i = 0; i < pdfPaths.length; i++) {
		if (ZU.xpath(root, './/a[contains(@href, "' + pdfPaths[i] + '")]').length) {
			return url.replace(replURLRegExp, pdfPaths[i]);
		}
	}
	
	Z.debug('PDF link not found.');
	if (root.nodeType != 9 /* DOCUMENT_NODE*/) {
		Z.debug('Available links:');
		var links = root.getElementsByTagName('a');
		if (!links.length) Z.debug('No links');
		for (let i = 0; i < links.length; i++) {
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
				return;
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
	}
	else {
		scrape(doc, url, { pdf: buildPdfUrl(url, doc) });
	}
}

function fixCase(str, titleCase) {
	if (str.toUpperCase() != str) return str;
	
	if (titleCase) {
		return ZU.capitalizeTitle(str, true);
	}
	
	return str.charAt(0) + str.substr(1).toLowerCase();
}

function isConference(doc) {
	for (let label of doc.querySelectorAll('.publication-details__list .label')) {
		if (label.innerText.trim() == 'Conference:') {
			return true;
		}
	}
	return false;
}

function fetchArticles(articles) {
	if (!articles.length) return;
	
	var article = articles.shift();
	ZU.processDocuments(article.url, function (doc, url) {
		scrape(doc, url, article.extras);
	},
	function () {
		if (articles.length) fetchArticles(articles);
	});
}

function scrape(doc, url, extras) {
	url = url.replace(/[?#].*/, "");
	var doi = url.match(/10\.[^?#]+/)[0];
	var citationurl = url.replace(replURLRegExp, "/action/showCitFormats?doi=");
	var abstract = doc.getElementsByClassName('abstractSection')[0]
		|| doc.querySelector('#bookExcerpt');
	var tags = ZU.xpath(doc, '//a[contains(@href, "keyword") or contains(@href, "Keyword=")]');
	Z.debug("Citation URL: " + citationurl);
	
	function finalize(filename) {
		Z.debug("Filename: " + filename);
		var get = '/action/downloadCitation';
		var post = 'doi=' + doi + '&downloadFileName=' + filename + '&format=ris&direct=true&include=cit';
		ZU.doPost(get, post, function (risText) {
			// Z.debug(risText);
			var translator = Zotero.loadTranslator("import");
			// Calling the RIS translator
			translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
			translator.setString(risText);
			translator.setHandler("itemDone", function (obj, item) {
				// Sometimes we get titles and authors in all caps
				item.title = fixCase(item.title);

				// Some special characters get corrupted in the RIS we get
				if (/\b\?s/.test(item.title) && text(doc, 'h1.citation__title')) {
					item.title = text(doc, 'h1.citation__title');
				}

				if (!item.date) {
					item.date = text(doc, 'span[property="datePublished"]');
				}
				if (item.date) {
					item.date = ZU.strToISO(item.date);
					let parts = item.date.split('-');
					if (parts.length == 3 && parts[2] == '01') {
						item.date = parts[0] + '-' + parts[1];
					}
				}
				
				if (item.journalAbbreviation == item.publicationTitle) {
					delete item.journalAbbreviation;
				}
				
				if (item.itemType == 'journalArticle' && isConference(doc)) {
					item.itemType = 'conferencePaper';
				}
				
				if (doc.querySelector('div.contributors')) {
					// the HTML is better, so we'll use that.
					item.creators = [];
					let contributors = doc.querySelector('div.contributors');
					for (let authorLink of contributors.querySelectorAll('[property="author"] a:first-child')) {
						let givenName = text(authorLink, '[property="givenName"]');
						let familyName = text(authorLink, '[property="familyName"]');
						if (!givenName && !familyName) {
							item.creators.push({
								lastName: authorLink.innerText,
								creatorType: 'author',
								fieldMode: 1
							});
						}
						else {
							item.creators.push({
								firstName: givenName,
								lastName: familyName,
								creatorType: 'author'
							});
						}
					}
				}
				else {
					for (let creator of item.creators) {
						if (creator.fieldMode == 1) {
							// add a comma after the last name
							// "Smith Todd G" -> "Smith, Todd G"
							let name = creator.lastName.replace(/(\w+)/, '$1,');
							let cleaned = ZU.cleanAuthor(name, creator.creatorType, true);
							delete creator.fieldMode;
							Object.assign(creator, cleaned);
						}
						
						creator.lastName = fixCase(creator.lastName, true);
						if (creator.firstName) {
							creator.firstName = fixCase(creator.firstName, true);
						}
					}
				}

				item.url = url;
				item.notes = [];
				for (var i in tags) {
					item.tags.push(tags[i].textContent);
				}
				
				if (abstract) {
					// Drop "Abstract" prefix
					// This is not excellent, since some abstracts could
					// conceivably begin with the word "abstract"
					item.abstractNote = abstract.innerText
						.replace(/^[^\w\d]*abstract\s*/i, '');
				}
				
				item.attachments = [];
				if (extras.pdf) {
					item.attachments.push({
						url: extras.pdf,
						title: "Full Text PDF",
						mimeType: "application/pdf"
					});
				}
				
				item.libraryCatalog = url.replace(/^https?:\/\/(?:www\.)?/, '')
					.replace(/[/:].*/, '') + " (Atypon)";
				
				if (item.series == 'Non-serials') {
					delete item.series;
				}
				
				if (item.numberOfVolumes == '0') {
					delete item.numberOfVolumes;
				}
				
				item.complete();
			});
			translator.translate();
		});
	}

	// newer Atypon installs; 2nd one is Science, 3rd one ASM
	if (doc.querySelector('a[href*="#pill-citations"], div.pill__item, section.pill__item div.citation-download')) {
		let filename = attr(doc, 'input[name="downloadFileName"]', 'value');
		finalize(filename);
	}
	else {
		ZU.processDocuments(citationurl, function (citationDoc) {
			let filename = attr(citationDoc, 'input[name="downloadFileName"]', 'value');
			finalize(filename);
		});
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://pubs.rsna.org/toc/radiographics/toc/33/7",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://pubs.rsna.org/doi/full/10.1148/rg.337125073",
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
				"date": "2013-11",
				"DOI": "10.1148/rg.337125073",
				"ISSN": "0271-5333",
				"abstractNote": "Sudden cardiac death is defined as death from unexpected circulatory arrest—usually a result of cardiac arrhythmia—that occurs within 1 hour of the onset of symptoms. Proper and timely identification of individuals at risk for sudden cardiac death and the diagnosis of its predisposing conditions are vital. A careful history and physical examination, in addition to electrocardiography and cardiac imaging, are essential to identify conditions associated with sudden cardiac death. Among young adults (18–35 years), sudden cardiac death most commonly results from a previously undiagnosed congenital or hereditary condition, such as coronary artery anomalies and inherited cardiomyopathies (eg, hypertrophic cardiomyopathy, arrhythmogenic right ventricular cardiomyopathy [ARVC], dilated cardiomyopathy, and noncompaction cardiomyopathy). Overall, the most common causes of sudden cardiac death in young adults are, in descending order of frequency, hypertrophic cardiomyopathy, coronary artery anomalies with an interarterial or intramural course, and ARVC. Often, sudden cardiac death is precipitated by ventricular tachycardia or fibrillation and may be prevented with an implantable cardioverter defibrillator (ICD). Risk stratification to determine the need for an ICD is challenging and involves imaging, particularly echocardiography and cardiac magnetic resonance (MR) imaging. Coronary artery anomalies, a diverse group of congenital disorders with a variable manifestation, may be depicted at coronary computed tomographic angiography or MR angiography. A thorough understanding of clinical risk stratification, imaging features, and complementary diagnostic tools for the evaluation of cardiac disorders that may lead to sudden cardiac death is essential to effectively use imaging to guide diagnosis and therapy.",
				"issue": "7",
				"libraryCatalog": "pubs.rsna.org (Atypon)",
				"pages": "1977-2001",
				"publicationTitle": "RadioGraphics",
				"shortTitle": "Congenital and Hereditary Causes of Sudden Cardiac Death in Young Adults",
				"url": "https://pubs.rsna.org/doi/full/10.1148/rg.337125073",
				"volume": "33",
				"attachments": [
					{
						"title": "Full Text PDF",
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
		"url": "http://pubs.rsna.org/action/doSearch?SeriesKey=&AllField=cardiac",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://epubs.siam.org/doi/book/10.1137/1.9780898718553",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://epubs.siam.org/doi/abs/10.1137/1.9780898718553.ch6",
		"items": [
			{
				"itemType": "bookSection",
				"title": "6. Extensions and Generalizations",
				"creators": [],
				"date": "2001-01",
				"ISBN": "9780898714784",
				"abstractNote": "6.1 Introduction\n\nThere are a variety of extensions of the topics introduced in the previous chapters that could be pursued, several of which have been mentioned earlier along with a comment that they would not be developed in any detail within this monograph. Among some of these possibilities are: (a) the development of a mechanism for generating all the optimal solutions for a specific optimization task when multiple optima may be present, not just one representative exemplar; (b) the incorporation of other loss or merit measures within the various sequencing and partitioning contexts discussed; (c) extensions to the analysis of arbitrary t-mode data, with possible (order) restrictions on some modes but not others, or to a framework in which proximity is given on more than just a pair of objects, e.g., proximity could be defined for all distinct object triples (see Daws (1996)); (d) the generalization of the task of constructing optimal ordered partitions to a two- or higher-mode context that may be hierarchical and/or have various types of order or precedence constraints imposed; and (e) the extension of object ordering constraints when they are to be imposed (e.g., in various partitioning and two-mode sequencing tasks) to the use of circular object orders, where optimal subsets or ordered sequences must now be consistent with respect to a circular contiguity structure.",
				"bookTitle": "Combinatorial Data Analysis",
				"extra": "DOI: 10.1137/1.9780898718553.ch6",
				"libraryCatalog": "epubs.siam.org (Atypon)",
				"pages": "103-114",
				"publisher": "Society for Industrial and Applied Mathematics",
				"series": "Discrete Mathematics and Applications",
				"url": "https://epubs.siam.org/doi/abs/10.1137/1.9780898718553.ch6",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "combinatorial optimization"
					},
					{
						"tag": "least-squares optimization"
					},
					{
						"tag": "ultrametric and additive tree representations"
					},
					{
						"tag": "unidimensional and multidimensional scaling"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.liebertpub.com/doi/full/10.1089/cmb.2009.0238",
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
				"date": "2010-11",
				"DOI": "10.1089/cmb.2009.0238",
				"abstractNote": "An accurate genome sequence of a desired species is now a pre-requisite for genome research. An important step in obtaining a high-quality genome sequence is to correctly assemble short reads into longer sequences accurately representing contiguous genomic regions. Current sequencing technologies continue to offer increases in throughput, and corresponding reductions in cost and time. Unfortunately, the benefit of obtaining a large number of reads is complicated by sequencing errors, with different biases being observed with each platform. Although software are available to assemble reads for each individual system, no procedure has been proposed for high-quality simultaneous assembly based on reads from a mix of different technologies. In this paper, we describe a parallel short-read assembler, called Ray, which has been developed to assemble reads obtained from a combination of sequencing platforms. We compared its performance to other assemblers on simulated and real datasets. We used a combination of Roche/454 and Illumina reads to assemble three different genomes. We showed that mixing sequencing technologies systematically reduces the number of contigs and the number of errors. Because of its open nature, this new tool will hopefully serve as a basis to develop an assembler that can be of universal utilization (availability: http://deNovoAssembler.sf.Net/). For online Supplementary Material, see www.liebertonline.com.",
				"issue": "11",
				"libraryCatalog": "liebertpub.com (Atypon)",
				"pages": "1519-1533",
				"publicationTitle": "Journal of Computational Biology",
				"shortTitle": "Ray",
				"url": "https://www.liebertpub.com/doi/full/10.1089/cmb.2009.0238",
				"volume": "17",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "de Bruijn graphs"
					},
					{
						"tag": "genome assembly"
					},
					{
						"tag": "high-throughput sequencing"
					}
				],
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
		"url": "https://www.worldscientific.com/doi/abs/10.1142/S0219749904000195",
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
				"date": "2004-06",
				"DOI": "10.1142/S0219749904000195",
				"ISSN": "0219-7499",
				"abstractNote": "Zurek claims to have derived Born's rule noncircularly in the context of an ontological no-collapse interpretation of quantum states, without any \"deus ex machina imposition of the symptoms of classicality\". After a brief review of Zurek's derivation it is argued that this claim is exaggerated if not wholly unjustified. In order to demonstrate that Born's rule arises noncircularly from deterministically evolving quantum states, it is not sufficient to assume that quantum states are somehow associated with probabilities and then prove that these probabilities are given by Born's rule. One has to show how irreducible probabilities can arise in the context of an ontological no-collapse interpretation of quantum states. It is argued that the reason why all attempts to do this have so far failed is that quantum states are fundamentally algorithms for computing correlations between possible measurement outcomes, rather than evolving ontological states.",
				"issue": "02",
				"journalAbbreviation": "Int. J. Quantum Inform.",
				"libraryCatalog": "worldscientific.com (Atypon)",
				"pages": "221-229",
				"publicationTitle": "International Journal of Quantum Information",
				"url": "https://www.worldscientific.com/doi/abs/10.1142/S0219749904000195",
				"volume": "02",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Born's rule"
					},
					{
						"tag": "Born's rule"
					},
					{
						"tag": "envariance"
					},
					{
						"tag": "envariance"
					},
					{
						"tag": "interpretation of quantum mechanics"
					},
					{
						"tag": "interpretation of quantum mechanics"
					},
					{
						"tag": "probability"
					},
					{
						"tag": "probability"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.annualreviews.org/doi/abs/10.1146/annurev.matsci.31.1.323",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Block Copolymer Thin Films: Physics and Applications",
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
				"date": "2001-08",
				"DOI": "10.1146/annurev.matsci.31.1.323",
				"ISSN": "1531-7331",
				"abstractNote": "A two-part review of research concerning block copolymer thin films is presented. The first section summarizes experimental and theoretical studies of the fundamental physics of these systems, concentrating upon the forces that govern film morphology. The role of film thickness and surface energetics on the morphology of compositionally symmetric, amorphous diblock copolymer films is emphasized, including considerations of boundary condition symmetry, so-called hybrid structures, and surface chemical expression. Discussions of compositionally asymmetric systems and emerging research areas, e.g., liquid-crystalline and A-B-C triblock systems, are also included. In the second section, technological applications of block copolymer films, e.g., as lithographic masks and photonic materials, are considered. Particular attention is paid to means by which microphase domain order and orientation can be controlled, including exploitation of thickness and surface effects, the application of external fields, and the use of patterned substrates.",
				"issue": "1",
				"journalAbbreviation": "Annu. Rev. Mater. Res.",
				"libraryCatalog": "annualreviews.org (Atypon)",
				"pages": "323-355",
				"publicationTitle": "Annual Review of Materials Research",
				"shortTitle": "Block Copolymer Thin Films",
				"url": "https://www.annualreviews.org/doi/abs/10.1146/annurev.matsci.31.1.323",
				"volume": "31",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "confinement"
					},
					{
						"tag": "nanoarray"
					},
					{
						"tag": "nanopattern"
					},
					{
						"tag": "self-assembly"
					},
					{
						"tag": "self-consistent field"
					},
					{
						"tag": "wetting"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://journals.asm.org/doi/10.1128/mSystems.00122-21",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Dietary Supplements and Nutraceuticals under Investigation for COVID-19 Prevention and Treatment",
				"creators": [
					{
						"firstName": "Ronan",
						"lastName": "Lordan",
						"creatorType": "author"
					},
					{
						"firstName": "Halie M.",
						"lastName": "Rando",
						"creatorType": "author"
					},
					{
						"lastName": "COVID-19 Review Consortium",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"firstName": "Casey S.",
						"lastName": "Greene",
						"creatorType": "author"
					}
				],
				"date": "2021-06-29",
				"DOI": "10.1128/mSystems.00122-21",
				"issue": "3",
				"libraryCatalog": "journals.asm.org (Atypon)",
				"pages": "e00122-21",
				"publicationTitle": "mSystems",
				"url": "https://journals.asm.org/doi/10.1128/mSystems.00122-21",
				"volume": "6",
				"attachments": [
					{
						"title": "Full Text PDF",
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
		"url": "https://journals.asm.org/action/doSearch?AllField=E.+coli&SeriesKey=mra",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://search.informit.org/doi/10.3316/informit.147509991486632",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Comparison of a micro-neutralization test with the rapid fluorescent focus inhibition test for measuring rabies virus neutralizing antibodies",
				"creators": [
					{
						"lastName": "Smith",
						"creatorType": "author",
						"firstName": "Todd G."
					},
					{
						"lastName": "Gilbert",
						"creatorType": "author",
						"firstName": "Amy T."
					}
				],
				"DOI": "10.3316/informit.147509991486632",
				"abstractNote": "The rapid fluorescent focus inhibition test (RFFIT) is routinely used in the United States to measure rabies virus neutralizing antibodies (rVNA). RFFIT has a long history of reproducible and reliable results. The test has been modified over the years to use smaller volumes of reagents and samples, but requires a 50 muL minimum volume of test serum. To conduct pathogenesis studies, small laboratory animals such as mice are regularly tested for rVNA, but the minimum volume for a standard RFFIT may be impossible to obtain, particularly in scenarios of repeated sampling. To address this problem, a micro-neutralization test was developed previously. In the current study, the micro-neutralization test was compared to the RFFIT using 129 mouse serum samples from rabies vaccine studies. Using a cut-off value of 0.1 IU/mL, the sensitivity, specificity, and concordance of the micro-neutralization test were 100%, 97.5%, and 98%, respectively. The geometric mean titer of all samples above the cut-off was 2.0 IU/mL using RFFIT and 3.4 IU/mL using the micro-neutralization test, indicating that titers determined using the micro-neutralization test are not equivalent to RFFIT titers. Based on four rVNA-positive hamster serum samples, the intra-assay coefficient of variability was 24% and inter-assay coefficient of variability was 30.4%. These results support continued use of the micro-neutralization test to determine rabies virus neutralizing antibody titers for low-volume serum samples.",
				"issue": "3",
				"libraryCatalog": "search.informit.org (Atypon)",
				"pages": "1-5",
				"publicationTitle": "Tropical Medicine and Infectious Disease",
				"url": "https://search.informit.org/doi/10.3316/informit.147509991486632",
				"volume": "2",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Diagnosis, Laboratory"
					},
					{
						"tag": "Neutralization (Chemistry)"
					},
					{
						"tag": "Rabies virus"
					},
					{
						"tag": "Rabies--Diagnosis"
					},
					{
						"tag": "Viral antibodies"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://search.informit.org/doi/10.3316/informit.745150560334180",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "The Defense Test and Evaluation Professional Institute’s Role in Supporting the Department of Defense Test and Evaluation Community",
				"creators": [
					{
						"lastName": "Engel",
						"creatorType": "author",
						"firstName": "Jim"
					}
				],
				"DOI": "10.3316/informit.745150560334180",
				"libraryCatalog": "search.informit.org (Atypon)",
				"pages": "29-31",
				"proceedingsTitle": "AIM-TEC 94: Third Australasian Instrumentation and Measurement Conference; Test and Evaluation in the Asia-Pacific Region; Preprints of Papers",
				"url": "https://search.informit.org/doi/10.3316/informit.745150560334180",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Defense Test and Evaluation Professional Institute (DTEPI)"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.science.org/doi/10.1126/science.aag1582",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Transient compartmentalization of RNA replicators prevents extinction due to parasites",
				"creators": [
					{
						"firstName": "Shigeyoshi",
						"lastName": "Matsumura",
						"creatorType": "author"
					},
					{
						"firstName": "Ádám",
						"lastName": "Kun",
						"creatorType": "author"
					},
					{
						"firstName": "Michael",
						"lastName": "Ryckelynck",
						"creatorType": "author"
					},
					{
						"firstName": "Faith",
						"lastName": "Coldren",
						"creatorType": "author"
					},
					{
						"firstName": "András",
						"lastName": "Szilágyi",
						"creatorType": "author"
					},
					{
						"firstName": "Fabrice",
						"lastName": "Jossinet",
						"creatorType": "author"
					},
					{
						"firstName": "Christian",
						"lastName": "Rick",
						"creatorType": "author"
					},
					{
						"firstName": "Philippe",
						"lastName": "Nghe",
						"creatorType": "author"
					},
					{
						"firstName": "Eörs",
						"lastName": "Szathmáry",
						"creatorType": "author"
					},
					{
						"firstName": "Andrew D.",
						"lastName": "Griffiths",
						"creatorType": "author"
					}
				],
				"date": "2016-12-09",
				"DOI": "10.1126/science.aag1582",
				"issue": "6317",
				"libraryCatalog": "science.org (Atypon)",
				"pages": "1293-1296",
				"publicationTitle": "Science",
				"url": "https://www.science.org/doi/10.1126/science.aag1582",
				"volume": "354",
				"attachments": [
					{
						"title": "Full Text PDF",
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
		"url": "https://www.pnas.org/doi/10.1073/pnas.2117831119",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Inequality in science and the case for a new agenda",
				"creators": [
					{
						"firstName": "Joseph L.",
						"lastName": "Graves",
						"creatorType": "author"
					},
					{
						"firstName": "Maureen",
						"lastName": "Kearney",
						"creatorType": "author"
					},
					{
						"firstName": "Gilda",
						"lastName": "Barabino",
						"creatorType": "author"
					},
					{
						"firstName": "Shirley",
						"lastName": "Malcom",
						"creatorType": "author"
					}
				],
				"date": "2022-03-08",
				"DOI": "10.1073/pnas.2117831119",
				"issue": "10",
				"libraryCatalog": "pnas.org (Atypon)",
				"pages": "e2117831119",
				"publicationTitle": "Proceedings of the National Academy of Sciences",
				"url": "https://www.pnas.org/doi/10.1073/pnas.2117831119",
				"volume": "119",
				"attachments": [
					{
						"title": "Full Text PDF",
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
		"url": "https://www.science.org/doi/10.1126/sciadv.abj8030",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Electric field control of chirality",
				"creators": [
					{
						"firstName": "Piush",
						"lastName": "Behera",
						"creatorType": "author"
					},
					{
						"firstName": "Molly A.",
						"lastName": "May",
						"creatorType": "author"
					},
					{
						"firstName": "Fernando",
						"lastName": "Gómez-Ortiz",
						"creatorType": "author"
					},
					{
						"firstName": "Sandhya",
						"lastName": "Susarla",
						"creatorType": "author"
					},
					{
						"firstName": "Sujit",
						"lastName": "Das",
						"creatorType": "author"
					},
					{
						"firstName": "Christopher T.",
						"lastName": "Nelson",
						"creatorType": "author"
					},
					{
						"firstName": "Lucas",
						"lastName": "Caretta",
						"creatorType": "author"
					},
					{
						"firstName": "Shang-Lin",
						"lastName": "Hsu",
						"creatorType": "author"
					},
					{
						"firstName": "Margaret R.",
						"lastName": "McCarter",
						"creatorType": "author"
					},
					{
						"firstName": "Benjamin H.",
						"lastName": "Savitzky",
						"creatorType": "author"
					},
					{
						"firstName": "Edward S.",
						"lastName": "Barnard",
						"creatorType": "author"
					},
					{
						"firstName": "Archana",
						"lastName": "Raja",
						"creatorType": "author"
					},
					{
						"firstName": "Zijian",
						"lastName": "Hong",
						"creatorType": "author"
					},
					{
						"firstName": "Pablo",
						"lastName": "García-Fernandez",
						"creatorType": "author"
					},
					{
						"firstName": "Stephen W.",
						"lastName": "Lovesey",
						"creatorType": "author"
					},
					{
						"firstName": "Gerrit",
						"lastName": "van der Laan",
						"creatorType": "author"
					},
					{
						"firstName": "Peter",
						"lastName": "Ercius",
						"creatorType": "author"
					},
					{
						"firstName": "Colin",
						"lastName": "Ophus",
						"creatorType": "author"
					},
					{
						"firstName": "Lane W.",
						"lastName": "Martin",
						"creatorType": "author"
					},
					{
						"firstName": "Javier",
						"lastName": "Junquera",
						"creatorType": "author"
					},
					{
						"firstName": "Markus B.",
						"lastName": "Raschke",
						"creatorType": "author"
					},
					{
						"firstName": "Ramamoorthy",
						"lastName": "Ramesh",
						"creatorType": "author"
					}
				],
				"date": "2022-01-05",
				"DOI": "10.1126/sciadv.abj8030",
				"issue": "1",
				"libraryCatalog": "science.org (Atypon)",
				"pages": "eabj8030",
				"publicationTitle": "Science Advances",
				"url": "https://www.science.org/doi/10.1126/sciadv.abj8030",
				"volume": "8",
				"attachments": [
					{
						"title": "Full Text PDF",
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
