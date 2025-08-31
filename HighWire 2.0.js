{
	"translatorID": "8c1f42d5-02fa-437b-b2b2-73afc768eb07",
	"label": "HighWire 2.0",
	"creator": "Matt Burton, Sebastian Karcher",
	"target": "^[^?#]+(/content/([0-9.]+[A-Z\\-]*/|current|firstcite|early)|/search\\?.*?\\bsubmit=|/search(/results)?\\?fulltext=|/cgi/collection/.|/search/.)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 250,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-06-13 22:14:27"
}

/*
   Highwire 2.0 Translator Copyright (C) 2014-2020 Matt Burton,
	 Sebastian Karcher, and Zotero contributors

   This program is free software: you can redistribute it and/or modify
   it under the terms of the GNU Affero General Public License as published by
   the Free Software Foundation, either version 3 of the License, or
   (at your option) any later version.

   This program is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU Affero General Public License for more details.

   You should have received a copy of the GNU Affero General Public License
   along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/


const preprintType = ZU.fieldIsValidForType('title', 'preprint')
	? 'preprint'
	: 'report';

function getSearchResults(doc, url, checkOnly) {
	var xpaths = [
		{
			searchx: '//li[contains(@class, "toc-cit") and 	not(ancestor::div/h2/a/text() = "Correction" or ancestor::div/h2/a/text() = "Corrections")]',
			titlex: './/h4'
		},
		{
			searchx: '//div[@id="normal-search-results"]//*[contains(@class, "results-cit cit")]',
			titlex: './/*[contains(@class, "cit-title")]'
		},
		{
			searchx: '//div[contains(@class, "toc-level level3")]//ul[@class="cit-list"]/div',
			titlex: './/span[contains(@class, "cit-title")]'
		},
		{
			searchx: '//div[contains(@class,"main-content-wrapper")]//div[contains(@class, "highwire-article-citation")]',
			titlex:	'.//a[contains(@class, "highwire-cite-linked-title")]'
		},
		{
			// BMJ quick search
			searchx: '//ol[contains(@class, "search-results")]/li[h3[@class="title"]]',
			titlex: './h3[@class="title"]'
		},
		{
			// BMJ advanced search
			searchx: '//ul[contains(@class,"highwire-search-results-list")]//li[contains(@class, "search-result")]',
			titlex:	'.//a[contains(@class, "highwire-cite-linked-title")]'
		}
	];
	
	var found = false, items = {},
		// exclude cit-site-url for Sage Advanced Search (no stable URLs for testing)
		linkx = '(.//a[not(contains(@href, "hasaccess.xhtml")) and not(@class="cit-site-url")])[1]';
	for (var i = 0; i < xpaths.length && !found; i++) {
		var rows = ZU.xpath(doc, xpaths[i].searchx);
		if (!rows.length) continue;
		
		for (var j = 0, n = rows.length; j < n; j++) {
			var title = ZU.xpath(rows[j], xpaths[i].titlex)[0];
			if (!title) continue;
			
			var link;
			if (title.nodeName == 'A') {
				link = title;
			}
			else {
				link = ZU.xpath(rows[j], linkx)[0];
				if (!link || !link.href) continue;
			}
			
			items[link.href] = ZU.trimInternal(title.textContent);
			found = true;
			
			if (checkOnly) return true;
		}
	}
	
	if (found) Zotero.debug('Found search results using xpath set #' + (i - 1));
	
	return found ? items : null;
}

// get abstract
function getAbstract(doc) {
	// abstract, summary
	var abstrSections = ZU.xpath(doc,
		'//div[contains(@id,"abstract") or @class="abstractSection"]/*[not(contains(@class,"section-nav")) and not(contains(@class,"kwd"))]');

	var abstr = '';
	var paragraph;

	for (var i = 0, n = abstrSections.length; i < n; i++) {
		paragraph = abstrSections[i].textContent.trim();

		// ignore the abstract heading
		if (paragraph.toLowerCase() == 'abstract'
			|| paragraph.toLowerCase() == 'summary') {
			continue;
		}

		// put all lines of a paragraph on a single line
		paragraph = paragraph.replace(/\s+/g, ' ');

		abstr += paragraph + "\n";
	}

	return abstr.trim();
}

// some journals display keywords
function getKeywords(doc) {
	// some journals are odd and don't work with this.
	// e.g. http://jn.nutrition.org/content/130/12/3122S.abstract
	var keywords = ZU.xpath(doc, '//ul[contains(@class,"kwd-group")]//a');
	var kwds = [];
	for (var i = 0, n = keywords.length; i < n; i++) {
		// don't break for empty nodes
		if (keywords[i].textContent)	kwds.push(keywords[i].textContent.trim());
	}

	return kwds;
}

// mimetype map for supplementary attachments
// intentionally excluding potentially large files like videos and zip files
var suppTypeMap = {
	pdf: 'application/pdf',
	//	'zip': 'application/zip',
	doc: 'application/msword',
	docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	xls: 'application/vnd.ms-excel',
	xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
};

// attach supplementary information
function attachSupplementary(doc, item, next) {
	var navDiv = doc.getElementById('article-cb-main')
		|| doc.getElementById('article-views')
		|| ZU.xpath(doc, '//div[contains(@class, "cb-section")]')[0]; // http://www.plantphysiol.org/content/162/1/9.abstract
	if (navDiv) {
		var suppLink = ZU.xpath(navDiv, './/a[@rel="supplemental-data"]')[0]
			|| ZU.xpath(doc, '//a[@rel="supplemental-data"]')[0];
		if (suppLink) {
			var attachAsLink = Z.getHiddenPref("supplementaryAsLink");
			if (attachAsLink) {
				item.attachments.push({
					title: "Supplementary info",
					url: suppLink.href,
					mimeType: 'text/html',
					snapshot: false
				});
			}
			else {
				ZU.processDocuments(suppLink.href, function (newDoc, url) {
					// sciencemag.org
					var container = newDoc.getElementById('sci-bd');
					if (container) {
						var dts = ZU.xpath(container, './dl/dt');
						for (let i = 0, n = dts.length; i < n; i++) {
							let dt = dts[i];
							let title = ZU.trimInternal(dt.textContent);
							
							let dd = dt.nextElementSibling;
							
							let description;
							if (dd.nodeName.toUpperCase() == 'DD') {
								if (dd.firstElementChild
									&& dd.firstElementChild.nodeName.toUpperCase() == 'UL') {
									description = ZU.xpathText(dd, './ul/li', null, '; ');
								}
								else {
									description = dd.textContent;
								}
								
								if (description) {
									description = ZU.trimInternal(description)
										.replace(/\s;/g, ';');
										
									if (description.indexOf(title) === 0
										|| title.toUpperCase() == 'DOWNLOAD SUPPLEMENT') {
										title = '';
									}
									else {
										title += '. ';
									}
									
									title += description;
								}
							}
							
							if (title.toUpperCase() == 'DOWNLOAD SUPPLEMENT') {
								title = 'Supplementary Data';
							}
							
							let suppUrl = dt.getElementsByTagName('a')[0];
							if (!suppUrl) continue;
							suppUrl = suppUrl.href;
							
							let type = suppTypeMap[url.substr(url.lastIndexOf('.') + 1).toLowerCase()];
							
							// don't download files with unknown type.
							// Could be large files we're not accounting for, like videos,
							// or HTML pages that we would end up taking snapshots of
							let snapshot = !attachAsLink && type;
							
							item.attachments.push({
								title: title,
								url: suppUrl,
								mimeType: type,
								snapshot: !!snapshot
							});
						}
						next(doc, item);
						return;
					}
					
					// others
					container = newDoc.getElementById('content-block');
					if (container) {
						var links = ZU.xpath(container, './h1[@class="data-supp-article-title"]/following-sibling::div//ul//a');
					
						var counters = {};
						for (let i = 0, n = links.length; i < n; i++) {
							let title = links[i].nextSibling; // http://www.plantphysiol.org/content/162/1/9.abstract
							if (title) {
								title = title.textContent
									.replace(/^[^a-z]+/i, '').trim();
							}

							if (!title) {
								title = ZU.trimInternal(links[i].textContent.trim())
									.replace(/^download\s+/i, '')
									.replace(/\([^()]+\)$/, '');
							}
							
							let tUC = title.toUpperCase();
							if (!counters[tUC]) {	// when all supp data has the same title, we'll add some numbers
								counters[tUC] = 1;
							}
							else {
								title += ' ' + (++counters[tUC]);
							}
							
							let suppUrl = links[i].href;
							
							// determine type by extension
							let type = suppTypeMap[url.substr(url.lastIndexOf('.') + 1).toLowerCase()];
							
							// don't download files with unknown type.
							// Could be large files we're not accounting for, like videos,
							// or HTML pages that we would end up taking snapshots of
							let snapshot = !attachAsLink && type;
							
							item.attachments.push({
								title: title,
								url: suppUrl,
								mimeType: type,
								snapshot: !!snapshot
							});
						}
						next(doc, item);
					}
				});
			}
		}
	}
}

// add using embedded metadata
function addEmbMeta(doc, url) {
	var translator = Zotero.loadTranslator("web");
	// Embedded Metadata translator
	translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
	translator.setDocument(doc);

	translator.setHandler("itemDone", function (obj, item) {
		if (item.publicationTitle.endsWith('Rxiv')) {
			item.itemType = preprintType;
			if (preprintType != 'preprint') {
				item.extra = (item.extra || '') + '\nType: article';
			}
			item.libraryCatalog = item.publisher = item.publicationTitle;
			delete item.publicationTitle;
			delete item.institution;
		}
		
		// remove all caps in Names and Titles
		for (let i = 0; i < item.creators.length; i++) {
			// Z.debug(item.creators[i])
			if (item.creators[i].lastName == item.creators[i].lastName.toUpperCase()) {
				item.creators[i].lastName
					= ZU.capitalizeTitle(item.creators[i].lastName, true);
			}
			// we test for existence of first Name to not fail with spotty data.
			if (item.creators[i].firstName && item.creators[i].firstName == item.creators[i].firstName.toUpperCase()) {
				item.creators[i].firstName
					= ZU.capitalizeTitle(item.creators[i].firstName, true);
			}
		}

		if (item.title == item.title.toUpperCase()) {
			item.title = ZU.capitalizeTitle(item.title, true);
		}
		
		// BMJ doesn't include pages in metadata; grab article number from recommended citation
		if (!item.pages) {
			let pages = ZU.xpathText(doc, '//span[@class="highwire-cite-article-as"]');
			if (pages && pages.includes(":")) {
				item.pages = pages.trim().match(/:([^:]+)$/)[1];
			}
		}
		
		var abs = getAbstract(doc);
		if (abs) item.abstractNote = abs;

		var kwds = getKeywords(doc);
		if (kwds) item.tags = kwds;

		if (item.notes) item.notes = [];
		
		// try to get PubMed ID and link if we don't already have it from EM
		var pmDiv;
		if ((!item.extra || item.extra.search(/\bPMID:/) == -1)
			&& (pmDiv = doc.getElementById('cb-art-pm'))) {
			var pmId = ZU.xpathText(pmDiv, './/a[contains(@class, "cite-link")]/@href')
					|| ZU.xpathText(pmDiv, './ol/li[1]/a/@href');	// e.g. http://www.pnas.org/content/108/52/20881.full
			if (pmId) pmId = pmId.match(/access_num=(\d+)/);
			if (pmId) {
				if (item.extra) item.extra += '\n';
				else item.extra = '';
				
				item.extra += 'PMID: ' + pmId[1];
				
				item.attachments.push({
					title: "PubMed entry",
					url: "http://www.ncbi.nlm.nih.gov/pubmed/" + pmId[1],
					mimeType: "text/html",
					snapshot: false
				});
			}
		}
		
		if (Z.getHiddenPref && Z.getHiddenPref("attachSupplementary")) {
			try {	// don't fail if we can't attach supplementary data
				var async = attachSupplementary(doc, item, function (doc, item) {
					item.complete();
				});
			}
			catch (e) {
				Z.debug("Error attaching supplementary information.");
				Z.debug(e);
				if (async) item.complete();
			}
			if (!async) {
				item.complete();
			}
		}
		else {
			item.complete();
		}
	});

	translator.getTranslatorObject(function (trans) {
		trans.doWeb(doc, url);
	});
}

function detectWeb(doc, url) {
	var highwiretest = false;

	// quick test for highwire embedded pdf page
	highwiretest = url.includes('.pdf+html');

	// only queue up the sidebar for data extraction (it seems to always be present)
	if (highwiretest && url.includes('?frame=sidebar')) {
		return false;
	}

	if (!highwiretest) {
		// lets hope this installations don't tweak this...
		highwiretest = ZU.xpath(doc,
			"//link[@href='/shared/css/hw-global.css']|//link[contains(@href,'highwire.css')]").length;
	}
	
	if (!highwiretest) {
		// (they did)
		highwiretest = doc.querySelector('.highwire-article-citation');
	}
	
	if (highwiretest) {
		if (/content\/(early\/)?[0-9]+/.test(url)
			&& !url.includes('/suppl/')
		) {
			if (url.includes('medrxiv.org') || url.includes('biorxiv.org')) {
				return preprintType;
			}
			else {
				return "journalArticle";
			}
		}
		else if (getSearchResults(doc, url, true)) {
			return "multiple";
		}
	}
	return false;
}

function doWeb(doc, url) {
	if (!url) url = doc.documentElement.location;
	

	// Z.debug(items)
	if (detectWeb(doc, url) == "multiple") {
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (items) ZU.processDocuments(Object.keys(items), addEmbMeta);
		});
	}
	else if (url.includes('.full.pdf+html')) {
		// abstract in EM is not reliable. Fetch abstract page and scrape from there.
		ZU.processDocuments(url.replace(/\.full\.pdf\+html.*/, ''), addEmbMeta);
	}
	else {
		addEmbMeta(doc, url);
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.pnas.org/content/108/52/20881.full",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "A yeast functional screen predicts new candidate ALS disease genes",
				"creators": [
					{
						"firstName": "Julien",
						"lastName": "Couthouis",
						"creatorType": "author"
					},
					{
						"firstName": "Michael P.",
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
						"firstName": "Annie X.",
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
						"firstName": "Jennifer A.",
						"lastName": "Solski",
						"creatorType": "author"
					},
					{
						"firstName": "Kelly L.",
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
						"firstName": "Neill R.",
						"lastName": "Graff-Radford",
						"creatorType": "author"
					},
					{
						"firstName": "Dennis W.",
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
						"firstName": "Robert G.",
						"lastName": "Kalb",
						"creatorType": "author"
					},
					{
						"firstName": "Virginia M.-Y.",
						"lastName": "Lee",
						"creatorType": "author"
					},
					{
						"firstName": "John Q.",
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
						"firstName": "Peter M.",
						"lastName": "Andersen",
						"creatorType": "author"
					},
					{
						"firstName": "Garth A.",
						"lastName": "Nicholson",
						"creatorType": "author"
					},
					{
						"firstName": "Ian P.",
						"lastName": "Blair",
						"creatorType": "author"
					},
					{
						"firstName": "Oliver D.",
						"lastName": "King",
						"creatorType": "author"
					},
					{
						"firstName": "Nancy M.",
						"lastName": "Bonini",
						"creatorType": "author"
					},
					{
						"firstName": "Vivianna Van",
						"lastName": "Deerlin",
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
						"firstName": "Aaron D.",
						"lastName": "Gitler",
						"creatorType": "author"
					}
				],
				"date": "2011/12/27",
				"DOI": "10.1073/pnas.1109434108",
				"ISSN": "0027-8424, 1091-6490",
				"abstractNote": "Amyotrophic lateral sclerosis (ALS) is a devastating and universally fatal neurodegenerative disease. Mutations in two related RNA-binding proteins, TDP-43 and FUS, that harbor prion-like domains, cause some forms of ALS. There are at least 213 human proteins harboring RNA recognition motifs, including FUS and TDP-43, raising the possibility that additional RNA-binding proteins might contribute to ALS pathogenesis. We performed a systematic survey of these proteins to find additional candidates similar to TDP-43 and FUS, followed by bioinformatics to predict prion-like domains in a subset of them. We sequenced one of these genes, TAF15, in patients with ALS and identified missense variants, which were absent in a large number of healthy controls. These disease-associated variants of TAF15 caused formation of cytoplasmic foci when expressed in primary cultures of spinal cord neurons. Very similar to TDP-43 and FUS, TAF15 aggregated in vitro and conferred neurodegeneration in Drosophila, with the ALS-linked variants having a more severe effect than wild type. Immunohistochemistry of postmortem spinal cord tissue revealed mislocalization of TAF15 in motor neurons of patients with ALS. We propose that aggregation-prone RNA-binding proteins might contribute very broadly to ALS pathogenesis and the genes identified in our yeast functional screen, coupled with prion-like domain prediction analysis, now provide a powerful resource to facilitate ALS disease gene discovery.",
				"extra": "PMID: 22065782",
				"issue": "52",
				"journalAbbreviation": "PNAS",
				"language": "en",
				"libraryCatalog": "www.pnas.org",
				"pages": "20881-20890",
				"publicationTitle": "Proceedings of the National Academy of Sciences",
				"rights": "©  . Freely available online through the PNAS open access option.",
				"url": "https://www.pnas.org/content/108/52/20881",
				"volume": "108",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					},
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
		"type": "web",
		"url": "http://genesdev.cshlp.org/content/16/14/1779",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "G9a histone methyltransferase plays a dominant role in euchromatic histone H3 lysine 9 methylation and is essential for early embryogenesis",
				"creators": [
					{
						"firstName": "Makoto",
						"lastName": "Tachibana",
						"creatorType": "author"
					},
					{
						"firstName": "Kenji",
						"lastName": "Sugimoto",
						"creatorType": "author"
					},
					{
						"firstName": "Masami",
						"lastName": "Nozaki",
						"creatorType": "author"
					},
					{
						"firstName": "Jun",
						"lastName": "Ueda",
						"creatorType": "author"
					},
					{
						"firstName": "Tsutomu",
						"lastName": "Ohta",
						"creatorType": "author"
					},
					{
						"firstName": "Misao",
						"lastName": "Ohki",
						"creatorType": "author"
					},
					{
						"firstName": "Mikiko",
						"lastName": "Fukuda",
						"creatorType": "author"
					},
					{
						"firstName": "Naoki",
						"lastName": "Takeda",
						"creatorType": "author"
					},
					{
						"firstName": "Hiroyuki",
						"lastName": "Niida",
						"creatorType": "author"
					},
					{
						"firstName": "Hiroyuki",
						"lastName": "Kato",
						"creatorType": "author"
					},
					{
						"firstName": "Yoichi",
						"lastName": "Shinkai",
						"creatorType": "author"
					}
				],
				"date": "07/15/2002",
				"DOI": "10.1101/gad.989402",
				"ISSN": "0890-9369, 1549-5477",
				"abstractNote": "Covalent modification of histone tails is crucial for transcriptional regulation, mitotic chromosomal condensation, and heterochromatin formation. Histone H3 lysine 9 (H3-K9) methylation catalyzed by the Suv39h family proteins is essential for establishing the architecture of pericentric heterochromatin. We recently identified a mammalian histone methyltransferase (HMTase), G9a, which has strong HMTase activity towards H3-K9 in vitro. To investigate the in vivo functions of G9a, we generated G9a-deficient mice and embryonic stem (ES) cells. We found that H3-K9 methylation was drastically decreased in G9a-deficient embryos, which displayed severe growth retardation and early lethality. G9a-deficient ES cells also exhibited reduced H3-K9 methylation compared to wild-type cells, indicating that G9a is a dominant H3-K9 HMTase in vivo. Importantly, the loss of G9a abolished methylated H3-K9 mostly in euchromatic regions. Finally, G9a exerted a transcriptionally suppressive function that depended on its HMTase activity. Our results indicate that euchromatic H3-K9 methylation regulated by G9a is essential for early embryogenesis and is involved in the transcriptional repression of developmental genes.",
				"extra": "PMID: 12130538",
				"issue": "14",
				"journalAbbreviation": "Genes Dev.",
				"language": "en",
				"libraryCatalog": "genesdev.cshlp.org",
				"pages": "1779-1791",
				"publicationTitle": "Genes & Development",
				"url": "http://genesdev.cshlp.org/content/16/14/1779",
				"volume": "16",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					},
					{
						"title": "PubMed entry",
						"mimeType": "text/html",
						"snapshot": false
					}
				],
				"tags": [
					{
						"tag": "Euchromatin"
					},
					{
						"tag": "G9a HMTase"
					},
					{
						"tag": "heterochromatin"
					},
					{
						"tag": "histone H3-K9 methylation"
					},
					{
						"tag": "mammalian development"
					},
					{
						"tag": "transcriptional regulation"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://science.sciencemag.org/content/340/6131/483",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Potent Social Learning and Conformity Shape a Wild Primate’s Foraging Decisions",
				"creators": [
					{
						"firstName": "Erica van de",
						"lastName": "Waal",
						"creatorType": "author"
					},
					{
						"firstName": "Christèle",
						"lastName": "Borgeaud",
						"creatorType": "author"
					},
					{
						"firstName": "Andrew",
						"lastName": "Whiten",
						"creatorType": "author"
					}
				],
				"date": "2013/04/26",
				"DOI": "10.1126/science.1232769",
				"ISSN": "0036-8075, 1095-9203",
				"abstractNote": "Animal Culture\nCultural transmission of information occurs when individuals learn from others with more experience or when individuals come to accept particular modes of behavior as the local norm. Such information transfer can be expected in highly social or long-lived species where contact and time for learning are maximized and are seen in humans (see the Perspective by de Waal). Using a network-based diffusion analysis on a long-term data set that includes tens of thousands of observations of individual humpback whales, Allen et al. (p. 485) show that an innovative feeding behavior has spread through social transmission since it first emerged in a single individual in 1980. The “lobtail” feeding has passed among associating individuals for more than three decades. Van de Waal et al. (p. 483), on the other hand, used a controlled experimental approach in vervet monkeys to show that individuals learn what to eat from more experienced individuals within their social group. Not only did young animals learn from observing older animals, but immigrating males switched their food preference to that of their new group.\nConformity to local behavioral norms reflects the pervading role of culture in human life. Laboratory experiments have begun to suggest a role for conformity in animal social learning, but evidence from the wild remains circumstantial. Here, we show experimentally that wild vervet monkeys will abandon personal foraging preferences in favor of group norms new to them. Groups first learned to avoid the bitter-tasting alternative of two foods. Presentations of these options untreated months later revealed that all new infants naïve to the foods adopted maternal preferences. Males who migrated between groups where the alternative food was eaten switched to the new local norm. Such powerful effects of social learning represent a more potent force than hitherto recognized in shaping group differences among wild animals.\nA natural experiment reveals that wild vervet migrants adopt local norms when it comes to choosing foods. [Also see Perspective by de Waal]\nA natural experiment reveals that wild vervet migrants adopt local norms when it comes to choosing foods. [Also see Perspective by de Waal]",
				"extra": "PMID: 23620053",
				"issue": "6131",
				"language": "en",
				"libraryCatalog": "science.sciencemag.org",
				"pages": "483-485",
				"publicationTitle": "Science",
				"rights": "Copyright © 2013, American Association for the Advancement of Science",
				"url": "https://science.sciencemag.org/content/340/6131/483",
				"volume": "340",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					},
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
		"type": "web",
		"url": "http://www.bmj.com/search/cell",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.bmj.com/content/322/7277/29.1",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Islet and stem cell transplantation for treating diabetes",
				"creators": [
					{
						"firstName": "Palle",
						"lastName": "Serup",
						"creatorType": "author"
					},
					{
						"firstName": "Ole D.",
						"lastName": "Madsen",
						"creatorType": "author"
					},
					{
						"firstName": "Thomas",
						"lastName": "Mandrup-Poulsen",
						"creatorType": "author"
					}
				],
				"date": "2001/01/06",
				"DOI": "10.1136/bmj.322.7277.29",
				"ISSN": "0959-8138, 1468-5833",
				"abstractNote": "By 2010 the number of people with diabetes is expected to exceed 350 million. Late diabetic complications will cause considerable morbidity in 5-10% of these patients and place an enormous burden on society. Transplantation of insulin producing islet cells isolated in vitro from a donor pancreas could be a cure for type 1 and some cases of type 2 diabetes. Currently, however, lack of sufficient donor organs and the side effects of immunosuppressive therapy limit its potential. Ways to overcome these problems include deriving islet cells from other sources such as pigs, human pancreatic duct cells, fetal pancreatic stem cells, embryonic stem cells, and by therapeutic cloning. This article outlines these developments and discusses how islet cell transplantation is likely to become the treatment of choice for most insulin dependent diabetics within the next five to 10 years.\n\nOur article is based on information from the following core references: the international islet transplant registry; recently published articles describing improvements in islet cell transplantation, reporting treatment of diabetes in animal models with islet cells grown in vitro, and describing novel molecular mechanisms in pancreatic endocrine development (including our own recent work); papers in embryonic and adult stem cell research that have had a major influence on our thinking; and the seminal work from the Roslin Institute and other groups on nuclear transfer.\n\nIn many cases current diabetes drug therapies do not provide sufficiently tight control of blood glucose to avoid diabetic late complications. 1 2 Transplantation of whole donor pancreas is an effective form of treatment but is of limited application since it entails major surgery and long term immunosuppression. This failure to prevent the morbidity associated with diabetes places an enormous burden not only on patients and their relatives but also on society. The costs of treating late diabetic complications …",
				"extra": "PMID: 11141151",
				"issue": "7277",
				"journalAbbreviation": "BMJ",
				"language": "en",
				"libraryCatalog": "www.bmj.com",
				"pages": "29-32",
				"publicationTitle": "BMJ",
				"rights": "© 2001 BMJ Publishing Group Ltd.",
				"url": "https://www.bmj.com/content/322/7277/29.1",
				"volume": "322",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					},
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
		"type": "web",
		"url": "http://www.bmj.com/search/advanced/title%3Acell%20title_flags%3Amatch-all%20limit_from%3A1840-01-01%20limit_to%3A2015-02-25%20numresults%3A10%20sort%3Arelevance-rank%20format_result%3Astandard",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.bmj.com/content/350/bmj.h696",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Length of hospital stay after hip fracture and short term risk of death after discharge: a total cohort study in Sweden",
				"creators": [
					{
						"firstName": "Peter",
						"lastName": "Nordström",
						"creatorType": "author"
					},
					{
						"firstName": "Yngve",
						"lastName": "Gustafson",
						"creatorType": "author"
					},
					{
						"firstName": "Karl",
						"lastName": "Michaëlsson",
						"creatorType": "author"
					},
					{
						"firstName": "Anna",
						"lastName": "Nordström",
						"creatorType": "author"
					}
				],
				"date": "2015/02/20",
				"DOI": "10.1136/bmj.h696",
				"ISSN": "1756-1833",
				"abstractNote": "Objective To investigate relation between inpatient length of stay after hip fracture and risk of death after hospital discharge.\nSetting Population ≥50 years old living in Sweden as of 31 December 2005 with a first hip fracture the years 2006-12.\nParticipants 116 111 patients with an incident hip fracture from a closed nationwide cohort.\nMain outcome measure Death within 30 days of hospital discharge in relation to hospital length of stay after adjustment for multiple covariates.\nResults Mean inpatient length of stay after a hip fracture decreased from 14.2 days in 2006 to 11.6 days in 2012 (P<0.001). The association between length of stay and risk of death after discharge was non-linear (P<0.001), with a threshold for this non-linear effect of about 10 days. Thus, for patients with length of stay of ≤10 days (n=59 154), each 1-day reduction in length of stay increased the odds of death within 30 days of discharge by 8% in 2006 (odds ratio 1.08 (95% confidence interval 1.04 to 1.12)), which increased to16% in 2012 (odds ratio 1.16 (1.12 to 1.20)). In contrast, for patients with a length of stay of ≥11 days (n=56 957), a 1-day reduction in length of stay was not associated with an increased risk of death after discharge during any of the years of follow up.\nLimitations No accurate evaluation of the underlying cause of death could be performed.\nConclusion Shorter length of stay in hospital after hip fracture is associated with increased risk of death after hospital discharge, but only among patients with length of stay of 10 days or less. This association remained robust over consecutive years.",
				"extra": "PMID: 25700551",
				"journalAbbreviation": "BMJ",
				"language": "en",
				"libraryCatalog": "www.bmj.com",
				"pages": "h696",
				"publicationTitle": "BMJ",
				"rights": "© Nordström et al 2015. This is an Open Access article distributed in accordance with the Creative Commons Attribution Non Commercial (CC BY-NC 4.0) license, which permits others to distribute, remix, adapt, build upon this work non-commercially, and license their derivative works on different terms, provided the original work is properly cited and the use is non-commercial. See:  http://creativecommons.org/licenses/by-nc/4.0/.",
				"shortTitle": "Length of hospital stay after hip fracture and short term risk of death after discharge",
				"url": "https://www.bmj.com/content/350/bmj.h696",
				"volume": "350",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					},
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
		"type": "web",
		"url": "https://www.pnas.org/content/early/recent",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.pnas.org/content/117/50/31591.long",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Functional characterization of 67 endocytic accessory proteins using multiparametric quantitative analysis of CCP dynamics",
				"creators": [
					{
						"firstName": "Madhura",
						"lastName": "Bhave",
						"creatorType": "author"
					},
					{
						"firstName": "Rosa E.",
						"lastName": "Mino",
						"creatorType": "author"
					},
					{
						"firstName": "Xinxin",
						"lastName": "Wang",
						"creatorType": "author"
					},
					{
						"firstName": "Jeon",
						"lastName": "Lee",
						"creatorType": "author"
					},
					{
						"firstName": "Heather M.",
						"lastName": "Grossman",
						"creatorType": "author"
					},
					{
						"firstName": "Ashley M.",
						"lastName": "Lakoduk",
						"creatorType": "author"
					},
					{
						"firstName": "Gaudenz",
						"lastName": "Danuser",
						"creatorType": "author"
					},
					{
						"firstName": "Sandra L.",
						"lastName": "Schmid",
						"creatorType": "author"
					},
					{
						"firstName": "Marcel",
						"lastName": "Mettlen",
						"creatorType": "author"
					}
				],
				"date": "2020/12/15",
				"DOI": "10.1073/pnas.2020346117",
				"ISSN": "0027-8424, 1091-6490",
				"abstractNote": "Clathrin-mediated endocytosis (CME) begins with the nucleation of clathrin assembly on the plasma membrane, followed by stabilization and growth/maturation of clathrin-coated pits (CCPs) that eventually pinch off and internalize as clathrin-coated vesicles. This highly regulated process involves a myriad of endocytic accessory proteins (EAPs), many of which are multidomain proteins that encode a wide range of biochemical activities. Although domain-specific activities of EAPs have been extensively studied, their precise stage-specific functions have been identified in only a few cases. Using single-guide RNA (sgRNA)/dCas9 and small interfering RNA (siRNA)-mediated protein knockdown, combined with an image-based analysis pipeline, we have determined the phenotypic signature of 67 EAPs throughout the maturation process of CCPs. Based on these data, we show that EAPs can be partitioned into phenotypic clusters, which differentially affect CCP maturation and dynamics. Importantly, these clusters do not correlate with functional modules based on biochemical activities. Furthermore, we discover a critical role for SNARE proteins and their adaptors during early stages of CCP nucleation and stabilization and highlight the importance of GAK throughout CCP maturation that is consistent with GAK’s multifunctional domain architecture. Together, these findings provide systematic, mechanistic insights into the plasticity and robustness of CME.",
				"extra": "PMID: 33257546",
				"issue": "50",
				"journalAbbreviation": "PNAS",
				"language": "en",
				"libraryCatalog": "www.pnas.org",
				"pages": "31591-31602",
				"publicationTitle": "Proceedings of the National Academy of Sciences",
				"rights": "Copyright © 2020 the Author(s). Published by PNAS.. https://creativecommons.org/licenses/by-nc-nd/4.0/This open access article is distributed under Creative Commons Attribution-NonCommercial-NoDerivatives License 4.0 (CC BY-NC-ND).",
				"url": "https://www.pnas.org/content/117/50/31591",
				"volume": "117",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					},
					{
						"title": "PubMed entry",
						"mimeType": "text/html",
						"snapshot": false
					}
				],
				"tags": [
					{
						"tag": "CRISPRi screen"
					},
					{
						"tag": "GAK"
					},
					{
						"tag": "SNAREs"
					},
					{
						"tag": "clathrin-mediated endocytosis"
					},
					{
						"tag": "total internal reflection fluorescence microscopy"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.pnas.org/content/114/13/3521",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Overcoming catastrophic forgetting in neural networks",
				"creators": [
					{
						"firstName": "James",
						"lastName": "Kirkpatrick",
						"creatorType": "author"
					},
					{
						"firstName": "Razvan",
						"lastName": "Pascanu",
						"creatorType": "author"
					},
					{
						"firstName": "Neil",
						"lastName": "Rabinowitz",
						"creatorType": "author"
					},
					{
						"firstName": "Joel",
						"lastName": "Veness",
						"creatorType": "author"
					},
					{
						"firstName": "Guillaume",
						"lastName": "Desjardins",
						"creatorType": "author"
					},
					{
						"firstName": "Andrei A.",
						"lastName": "Rusu",
						"creatorType": "author"
					},
					{
						"firstName": "Kieran",
						"lastName": "Milan",
						"creatorType": "author"
					},
					{
						"firstName": "John",
						"lastName": "Quan",
						"creatorType": "author"
					},
					{
						"firstName": "Tiago",
						"lastName": "Ramalho",
						"creatorType": "author"
					},
					{
						"firstName": "Agnieszka",
						"lastName": "Grabska-Barwinska",
						"creatorType": "author"
					},
					{
						"firstName": "Demis",
						"lastName": "Hassabis",
						"creatorType": "author"
					},
					{
						"firstName": "Claudia",
						"lastName": "Clopath",
						"creatorType": "author"
					},
					{
						"firstName": "Dharshan",
						"lastName": "Kumaran",
						"creatorType": "author"
					},
					{
						"firstName": "Raia",
						"lastName": "Hadsell",
						"creatorType": "author"
					}
				],
				"date": "2017/03/28",
				"DOI": "10.1073/pnas.1611835114",
				"ISSN": "0027-8424, 1091-6490",
				"abstractNote": "The ability to learn tasks in a sequential fashion is crucial to the development of artificial intelligence. Until now neural networks have not been capable of this and it has been widely thought that catastrophic forgetting is an inevitable feature of connectionist models. We show that it is possible to overcome this limitation and train networks that can maintain expertise on tasks that they have not experienced for a long time. Our approach remembers old tasks by selectively slowing down learning on the weights important for those tasks. We demonstrate our approach is scalable and effective by solving a set of classification tasks based on a hand-written digit dataset and by learning several Atari 2600 games sequentially.",
				"extra": "PMID: 28292907",
				"issue": "13",
				"journalAbbreviation": "PNAS",
				"language": "en",
				"libraryCatalog": "www.pnas.org",
				"pages": "3521-3526",
				"publicationTitle": "Proceedings of the National Academy of Sciences",
				"rights": "©  . Freely available online through the PNAS open access option.",
				"url": "https://www.pnas.org/content/114/13/3521",
				"volume": "114",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					},
					{
						"title": "PubMed entry",
						"mimeType": "text/html",
						"snapshot": false
					}
				],
				"tags": [
					{
						"tag": "artificial intelligence"
					},
					{
						"tag": "continual learning"
					},
					{
						"tag": "deep learning"
					},
					{
						"tag": "stability plasticity"
					},
					{
						"tag": "synaptic consolidation"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.biorxiv.org/content/10.1101/2021.08.03.454978v1",
		"items": [
			{
				"itemType": "preprint",
				"title": "Endothelial Semaphorin 3fb regulates Vegf pathway-mediated angiogenic sprouting",
				"creators": [
					{
						"firstName": "Charlene",
						"lastName": "Watterston",
						"creatorType": "author"
					},
					{
						"firstName": "Rami",
						"lastName": "Halabi",
						"creatorType": "author"
					},
					{
						"firstName": "Sarah",
						"lastName": "McFarlane",
						"creatorType": "author"
					},
					{
						"firstName": "Sarah J.",
						"lastName": "Childs",
						"creatorType": "author"
					}
				],
				"date": "2021-08-05",
				"DOI": "10.1101/2021.08.03.454978",
				"abstractNote": "Vessel growth integrates diverse extrinsic signals with intrinsic signaling cascades to coordinate cell migration and sprouting morphogenesis. The pro-angiogenic effects of Vascular Endothelial Growth Factor (VEGF) are carefully controlled during sprouting to generate an efficiently patterned vascular network. We identify crosstalk between VEGF signaling and that of the secreted ligand Semaphorin 3fb (Sema3fb), one of two zebrafish paralogs of mammalian Sema3F. The sema3fb gene is expressed by endothelial cells in actively sprouting vessels. Loss of sema3fb results in abnormally wide and stunted intersegmental vessel artery sprouts. Although the sprouts initiate at the correct developmental time, they have a reduced migration speed. These sprouts have persistent filopodia and abnormally spaced nuclei suggesting dysregulated control of actin assembly. sema3fb mutants show simultaneously higher expression of pro-angiogenic (VEGF receptor 2 (vegfr2) and delta-like 4 (dll4)) and anti-angiogenic (soluble VEGF receptor 1 (svegfr1)/ soluble Fms Related Receptor Tyrosine Kinase 1 (sflt1)) pathway components. We show increased phospho-ERK staining in migrating angioblasts, consistent with enhanced Vegf activity. Reducing Vegfr2 kinase activity in sema3fb mutants rescues angiogenic sprouting. Our data suggest that Sema3fb plays a critical role in promoting endothelial sprouting through modulating the VEGF signaling pathway, acting as an autocrine cue that modulates intrinsic growth factor signaling.\nAuthor summary To supply tissues with essential oxygen and nutrients, blood vessel development is carefully orchestrated by positive ‘go’ and negative ‘stop’ growth signals as well as directional cues to shape patterning. Semaphorin proteins are named after the ‘Semaphore’ railway signaling system that directed trains along the appropriate tracks. Our work highlights the role of the Semaphorin 3fb protein in providing a pro-growth signal to developing vessels. Semaphorin 3fb is both produced by, and acts on the precursors of blood vessels as they migrate, a process known as autocrine control. We find that losing Semaphorin 3fb leads to stalled blood vessel growth, indicating it normally acts as a positive signal. It acts via modulating the VEGF growth factor signaling pathway that in turn, controls the migration process. We propose that Semaphorin3b fine-tunes vessel growth, thus ensuring a properly patterned network develops.",
				"language": "en",
				"libraryCatalog": "bioRxiv",
				"repository": "bioRxiv",
				"rights": "© 2021, Posted by Cold Spring Harbor Laboratory. This pre-print is available under a Creative Commons License (Attribution-NonCommercial-NoDerivs 4.0 International), CC BY-NC-ND 4.0, as described at http://creativecommons.org/licenses/by-nc-nd/4.0/",
				"url": "https://www.biorxiv.org/content/10.1101/2021.08.03.454978v1",
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
		"url": "https://www.medrxiv.org/content/10.1101/2021.06.16.21258632v1",
		"items": [
			{
				"itemType": "preprint",
				"title": "A System Dynamics Model for Effects of Workplace Violence and Clinician Burnout on Agitation Management in the Emergency Department",
				"creators": [
					{
						"firstName": "Ambrose H.",
						"lastName": "Wong",
						"creatorType": "author"
					},
					{
						"firstName": "Nasim S.",
						"lastName": "Sabounchi",
						"creatorType": "author"
					},
					{
						"firstName": "Hannah R.",
						"lastName": "Roncallo",
						"creatorType": "author"
					},
					{
						"firstName": "Jessica M.",
						"lastName": "Ray",
						"creatorType": "author"
					},
					{
						"firstName": "Rebekah",
						"lastName": "Heckmann",
						"creatorType": "author"
					}
				],
				"date": "2021-06-22",
				"DOI": "10.1101/2021.06.16.21258632",
				"abstractNote": "Background Over 1.7 million episodes of agitation occur annually across the United States in emergency departments (EDs), some of which lead to workplace assaults on clinicians and require invasive methods like physical restraints to maintain staff and patient safety. Recent studies demonstrated that experiences of workplace violence lead to symptoms of burnout, which may impact future decisions regarding use of physical restraints on agitated patients. To capture the dynamic interactions between clinicians and agitated patients under their care, we applied qualitative system dynamics methods to develop a model that describes causal feedback mechanisms of clinician burnout and the use of physical restraints to manage agitation.\nMethods We convened an interprofessional panel of clinician stakeholders and agitation experts for a series of model building sessions to develop the current model. The panel derived the final version of our model over ten sessions of iterative refinement and modification, each lasting approximately three to four hours. We incorporated findings from prior studies on agitation and burnout as a result of workplace violence, identifying interpersonal and psychological factors likely to influence our outcomes of interest to form the basis of our model.\nResults The final model resulted in five main sets of feedback loops that describe key narratives regarding the relationship between clinician burnout and agitated patients becoming physically restrained: (1) use of restraints decreases agitation and risk of assault, leading to increased perceptions of safety and decreasing use of restraints in a balancing feedback loop which stabilizes the system; (2) clinician stress leads to a perception of decreased safety and lower threshold to restrain, causing more stress in a negatively reinforcing loop; (3) clinician burnout leads to a decreased perception of colleague support which leads to more burnout in a negatively reinforcing loop; (4) clinician burnout leads to negative perceptions of patient intent during agitation, thus lowering threshold to restrain and leading to higher task load, more likelihood of workplace assaults, and higher burnout in a negatively reinforcing loop; and (5) mutual trust between clinicians causes increased perceptions of safety and improved team control, leading to decreased clinician stress and further increased mutual trust in a positively reinforcing loop.\nConclusions Our system dynamics approach led to the development of a robust qualitative model that illustrates a number of important feedback cycles that underly the relationships between clinician experiences of workplace violence, stress and burnout, and impact on decisions to physically restrain agitated patients. This work identifies potential opportunities at multiple targets to break negatively reinforcing cycles and support positive influences on safety for both clinicians and patients in the face of physical danger.",
				"language": "en",
				"libraryCatalog": "medRxiv",
				"repository": "medRxiv",
				"rights": "© 2021, Posted by Cold Spring Harbor Laboratory. The copyright holder for this pre-print is the author. All rights reserved. The material may not be redistributed, re-used or adapted without the author's permission.",
				"url": "https://www.medrxiv.org/content/10.1101/2021.06.16.21258632v1",
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
