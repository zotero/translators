{
	"translatorID": "6614a99-479a-4524-8e30-686e4d66663e",
	"label": "Nature Publishing Group",
	"creator": "Aurimas Vinckevicius",
	"target": "https?://[^/]*nature\\.com(:[\\d]+)?(?=/)[^?]*(/(journal|archive|research|topten|search|full|abs)/|/current_issue.htm|/most.htm)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 200,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcs",
	"lastUpdated": "2012-03-30 20:15:34"
}

/**
	Copyright (c) 2012 Aurimas Vinckevicius
	
	This program is free software: you can redistribute it and/or
	modify it under the terms of the GNU Affero General Public License
	as published by the Free Software Foundation, either version 3 of
	the License, or (at your option) any later version.
	
	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
	Affero General Public License for more details.
	
	You should have received a copy of the GNU Affero General Public
	License along with this program. If not, see
	<http://www.gnu.org/licenses/>.
*/

//get abstract
function getAbstract(doc) {
	var abstractLocations = [
	//e.g. 'lead' http://www.nature.com/emboj/journal/v31/n1/full/emboj2011343a.html
	//e.g. 'first_paragraph' http://www.nature.com/emboj/journal/vaop/ncurrent/full/emboj201239a.html
	'//p[contains(@class,"lead") or contains(@class,"first_paragraph")]',
	//e.g.
	'//div[@id="abs"]/*[self::div[not(contains(@class, "keyw-abbr"))] or self::p]',
	//e.g. 'first-paragraph' http://www.nature.com/nature/journal/v481/n7381/full/nature10669.html
	//e.g. 'standfirst' http://www.nature.com/nature/journal/v481/n7381/full/481237a.html
	'//div[@id="first-paragraph" or @class="standfirst"]/p',
	//e.g. http://www.nature.com/nature/journal/v481/n7381/full/nature10728.html
	'//div[contains(@id,"abstract")]/div[@class="content"]/p'];

	var paragraphs = [];

	for (var i = 0, n = abstractLocations.length; i < n && !paragraphs.length; i++) {
		paragraphs = Zotero.Utilities.xpath(doc, abstractLocations[i]);
	}

	if (!paragraphs.length) return null;

	var textArr = new Array();
	var p;
	for (var i = 0, n = paragraphs.length; i < n; i++) {
		p = ZU.trimInternal(paragraphs[i].textContent);
		if (p) textArr.push(p);
	}

	return textArr.join("\n").trim() || null;
}

//some journals display keywords
function getKeywords(doc) {
	var keywords = Zotero.Utilities.xpathText(doc, '//p[@class="keywords"]') || //e.g. http://www.nature.com/onc/journal/v26/n6/full/1209842a.html
	Zotero.Utilities.xpathText(doc, '//ul[@class="keywords"]//ul/li', null, '') || //e.g. http://www.nature.com/emboj/journal/v31/n3/full/emboj2011459a.html
	Zotero.Utilities.xpathText(doc, '//div[contains(@class,"article-keywords")]/ul/li/a', null, '; '); //e.g. http://www.nature.com/nature/journal/v481/n7382/full/481433a.html
	if (!keywords) return null;
	return keywords.split(/[;,]\s+/);
}

//get PDF url
function getPdfUrl(url) {
	var m = url.match(/(^[^#?]+\/)(?:full|abs)(\/[^#?]+?\.)[a-zA-Z]+(?=$|\?|#)/);
	if (m && m.length) return m[1] + 'pdf' + m[2] + 'pdf';
}

//add using embedded metadata
function scrapeEmbedMeta(doc, url) {
	var translator = Zotero.loadTranslator("web");
	//Embedded Metadata translator
	translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");

	translator.setDocument(doc);

	translator.setHandler("itemDone", function (obj, item) {
		//remove all caps in Names and Titles
		for (i in item.creators) {
			if (item.creators[i].lastName && item.creators[i].lastName == item.creators[i].lastName.toUpperCase()) {
				item.creators[i].lastName = Zotero.Utilities.capitalizeTitle(item.creators[i].lastName.toLowerCase(), true);
			}
			if (item.creators[i].firstName && item.creators[i].firstName == item.creators[i].firstName.toUpperCase()) {
				item.creators[i].firstName = Zotero.Utilities.capitalizeTitle(item.creators[i].firstName.toLowerCase(), true);
			}
		}

		if (item.title == item.title.toUpperCase()) {
			item.title = Zotero.Utilities.capitalizeTitle(item.title.toLowerCase(), true);
		}

		if (!item.abstractNote) item.abstractNote = getAbstract(doc);

		var pdf = getPdfUrl(url);
		if (pdf) {
			item.attachments = [{
				url: pdf,
				title: 'Full Text PDF',
				mimeType: 'application/pdf'
			}];
		}

		if (!item.tags || item.tags.length < 1) item.tags = getKeywords(doc);

		if (item.notes) item.notes = [];

		item.complete();
	});

	translator.translate();
}

function detectWeb(doc, url) {
	if (url.match(/\/(full|abs)\/[^\/]+($|\?|#)/)) {

		return 'journalArticle';

	} else if (doc.title.toLowerCase().indexOf('table of contents') != -1 || //single issue ToC. e.g. http://www.nature.com/emboj/journal/v30/n1/index.html or http://www.nature.com/nature/journal/v481/n7381/index.html
	doc.title.toLowerCase().indexOf('current issue') != -1 || url.indexOf('/research/') != -1 || url.indexOf('/topten/') != -1 || url.indexOf('/most.htm') != -1 || (url.indexOf('/vaop/') != -1 && url.indexOf('index.html') != -1) || //advanced online publication
	url.indexOf('sp-q=') != -1) { //search query
		return 'multiple';

	} else if (url.indexOf('/archive/') != -1) {
		if (url.indexOf('index.htm') != -1) return false; //list of issues
		if (url.indexOf('subject.htm') != -1) return false; //list of subjects
		if (url.indexOf('category.htm') != -1 && url.indexOf('code=') == -1) return false; //list of categories
		return 'multiple'; //all else should be ok
	}
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == 'multiple') {
		var allHNodes = '*[self::h1 or self::h2 or self::h3 or self::h4 or self::h5]';
		var nodex, titlex, linkx;
		var nodes = [];

		if (url.indexOf('/search/') != -1 || url.indexOf('/most.htm') != -1) {
			//search, "top" lists
			nodex = '//ol[@class="results-list" or @id="content-list"]/li';
			titlex = './' + allHNodes + '/node()[not(self::span)]';
			linkx = './' + allHNodes + '/a';

			nodes = Zotero.Utilities.xpath(doc, nodex);
		} else {

			//Maybe there's a nice way to figure out which journal uses what style, but for now we'll just try one until it matches
			//these seem to be listed in order of frequency
			var styles = [
			//oncogene
			{
				'nodex': '//div[child::*[@class="atl"]]',
				'titlex': './' + allHNodes + '/node()[not(self::span)]',
				'linkx': './p[@class="links"]/a[contains(text(),"Full Text") or contains(text(),"Full text")]'
			},
			//embo journal
			{
				'nodex': '//ul[@class="articles"]/li',
				'titlex': './' + allHNodes + '[@class="article-title"]/node()[not(self::span)]',
				'linkx': './ul[@class="article-links"]/li/a[contains(text(),"Full Text") or contains(text(),"Full text")]'
			},
			//nature
			{
				'nodex': '//ul[contains(@class,"article-list") or contains(@class,"collapsed-list")]/li',
				'titlex': './/' + allHNodes + '/a',
				'linkx': './/' + allHNodes + '/a'
			}];

			for (var i = 0; i < styles.length && nodes.length == 0; i++) {
				nodex = styles[i].nodex;
				titlex = styles[i].titlex;
				linkx = styles[i].linkx;

				nodes = Zotero.Utilities.xpath(doc, nodex);
			}
		}

		if (nodes.length == 0) return false; //nothing matched
		var items = new Object();
		var title, url;
		for (var i = 0; i < nodes.length; i++) {
			title = Zotero.Utilities.xpathText(nodes[i], titlex, null, '');
			link = Zotero.Utilities.xpath(nodes[i], linkx);
			if (title && link.length == 1) {
				items[link[0].href] = title.trim();
			}
		}

		var urls = new Array();

		Zotero.selectItems(items, function (selectedItems) {
			if (selectedItems == null) return true;
			for (var item in selectedItems) {
				urls.push(item);
			}
			Zotero.Utilities.processDocuments(urls, function (newDoc) {
				doWeb(newDoc, newDoc.location.href)
			}, function () {
				Zotero.done();
			});
			Zotero.wait();
		});
	} else {
		scrapeEmbedMeta(doc, url);
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.nature.com/onc/journal/v31/n6/index.html",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.nature.com/onc/journal/v31/n6/full/onc2011282a.html",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "J.",
						"lastName": "Jiang",
						"creatorType": "author"
					},
					{
						"firstName": "Y.",
						"lastName": "Zhang",
						"creatorType": "author"
					},
					{
						"firstName": "S.",
						"lastName": "Chuai",
						"creatorType": "author"
					},
					{
						"firstName": "Z.",
						"lastName": "Wang",
						"creatorType": "author"
					},
					{
						"firstName": "D.",
						"lastName": "Zheng",
						"creatorType": "author"
					},
					{
						"firstName": "F.",
						"lastName": "Xu",
						"creatorType": "author"
					},
					{
						"firstName": "Y.",
						"lastName": "Zhang",
						"creatorType": "author"
					},
					{
						"firstName": "C.",
						"lastName": "Li",
						"creatorType": "author"
					},
					{
						"firstName": "Y.",
						"lastName": "Liang",
						"creatorType": "author"
					},
					{
						"firstName": "Z.",
						"lastName": "Chen",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"ONC",
					"oncogenes",
					"cancer",
					"apoptosis",
					"tumor suppressor genes",
					"tumor viruses",
					"molecular oncology",
					"cell cycle",
					"growth factors",
					"growth factor receptors",
					"apoptosis",
					"growth regulatory genes"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"itemID": "http://www.nature.com/onc/journal/v31/n6/full/onc2011282a.html",
				"title": "Trastuzumab (herceptin) targets gastric cancer stem cells characterized by CD90 phenotype",
				"publicationTitle": "Oncogene",
				"rights": "© 2011 Nature Publishing Group",
				"volume": "31",
				"issue": "6",
				"number": "6",
				"patentNumber": "6",
				"pages": "671-682",
				"ISSN": "0950-9232",
				"publisher": "Nature Publishing Group",
				"institution": "Nature Publishing Group",
				"company": "Nature Publishing Group",
				"label": "Nature Publishing Group",
				"distributor": "Nature Publishing Group",
				"date": "2011-07-11",
				"language": "en",
				"DOI": "10.1038/onc.2011.282",
				"abstractNote": "Oncogene is one of the world’s leading cancer journals. It is published weekly and covers all aspects of the structure and function of Oncogenes.",
				"url": "http://www.nature.com/onc/journal/v31/n6/full/onc2011282a.html",
				"accessDate": "CURRENT_TIMESTAMP",
				"libraryCatalog": "www.nature.com"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.nature.com/emboj/journal/vaop/ncurrent/index.html",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.nature.com/emboj/journal/vaop/ncurrent/full/emboj201217a.html",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Er-Chieh",
						"lastName": "Cho",
						"creatorType": "author"
					},
					{
						"firstName": "Shunsheng",
						"lastName": "Zheng",
						"creatorType": "author"
					},
					{
						"firstName": "Shonagh",
						"lastName": "Munro",
						"creatorType": "author"
					},
					{
						"firstName": "Geng",
						"lastName": "Liu",
						"creatorType": "author"
					},
					{
						"firstName": "Simon M.",
						"lastName": "Carr",
						"creatorType": "author"
					},
					{
						"firstName": "Jutta",
						"lastName": "Moehlenbrink",
						"creatorType": "author"
					},
					{
						"firstName": "Yi-Chien",
						"lastName": "Lu",
						"creatorType": "author"
					},
					{
						"firstName": "Lindsay",
						"lastName": "Stimson",
						"creatorType": "author"
					},
					{
						"firstName": "Omar",
						"lastName": "Khan",
						"creatorType": "author"
					},
					{
						"firstName": "Rebecca",
						"lastName": "Konietzny",
						"creatorType": "author"
					},
					{
						"firstName": "Joanna",
						"lastName": "McGouran",
						"creatorType": "author"
					},
					{
						"firstName": "Amanda S.",
						"lastName": "Coutts",
						"creatorType": "author"
					},
					{
						"firstName": "Benedikt",
						"lastName": "Kessler",
						"creatorType": "author"
					},
					{
						"firstName": "David J.",
						"lastName": "Kerr",
						"creatorType": "author"
					},
					{
						"firstName": "Nicholas B. La",
						"lastName": "Thangue",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"The EMBO Journal",
					"European Molecular Biology Organization",
					"science",
					"scientific journal",
					"biology articles",
					"cell signalling",
					"cell biology",
					"structure",
					"biological research",
					"journal of cell biology",
					"molecular and cellular biology",
					"genetics",
					"biochemistry",
					"molecular cell biology",
					"molecular biology of the cell",
					"development",
					"immunology",
					"neuroscience",
					"plant biology",
					"structural biology",
					"genomic and computational biology",
					"genome stability and dynamics",
					"chromatin and transcription",
					"RNA",
					"proteins",
					"cellular metabolism",
					"signal transduction",
					"cell cycle",
					"differentiation and death",
					"membranes and transport",
					"cell and tissue architecture",
					"microbiology and pathogens",
					"molecular biology of disease."
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"itemID": "http://www.nature.com/emboj/journal/vaop/ncurrent/full/emboj201217a.html",
				"title": "Arginine methylation controls growth regulation by E2F-1",
				"publicationTitle": "The EMBO Journal",
				"rights": "© 2012 Nature Publishing Group",
				"ISSN": "ERROR! NO ISSN",
				"publisher": "Nature Publishing Group",
				"institution": "Nature Publishing Group",
				"company": "Nature Publishing Group",
				"label": "Nature Publishing Group",
				"distributor": "Nature Publishing Group",
				"date": "2012-02-10",
				"language": "en",
				"DOI": "10.1038/emboj.2012.17",
				"abstractNote": "The EMBO Journal encourages and publishes articles that report novel findings of wide biological significance in the areas of development, immunology, neuroscience, plant biology, structural biology, genomic & computational biology, genome stability & dynamics, chromatin & transcription, RNA, proteins, cellular metabolism, signal transduction, cell cycle, differentiation & death, membranes & transport, cell & tissue architecture, microbiology & pathogens and molecular biology of disease.",
				"url": "http://www.nature.com/emboj/journal/vaop/ncurrent/full/emboj201217a.html",
				"accessDate": "CURRENT_TIMESTAMP",
				"libraryCatalog": "www.nature.com"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.nature.com/onc/topten/index.html",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.nature.com/nature/journal/v481/n7381/full/nature10669.html",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "S.",
						"lastName": "Vegetti",
						"creatorType": "author"
					},
					{
						"firstName": "D. J.",
						"lastName": "Lagattuta",
						"creatorType": "author"
					},
					{
						"firstName": "J. P.",
						"lastName": "McKean",
						"creatorType": "author"
					},
					{
						"firstName": "M. W.",
						"lastName": "Auger",
						"creatorType": "author"
					},
					{
						"firstName": "C. D.",
						"lastName": "Fassnacht",
						"creatorType": "author"
					},
					{
						"firstName": "L. V. E.",
						"lastName": "Koopmans",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"Astronomy",
					"Astrophysics"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"itemID": "http://www.nature.com/nature/journal/v481/n7381/full/nature10669.html",
				"title": "Gravitational detection of a low-mass dark satellite galaxy at cosmological distance",
				"publicationTitle": "Nature",
				"rights": "© 2012 Nature Publishing Group, a division of Macmillan Publishers Limited. All Rights Reserved.",
				"volume": "481",
				"pages": "341-343",
				"ISSN": "0028-0836",
				"publisher": "Nature Publishing Group",
				"institution": "Nature Publishing Group",
				"company": "Nature Publishing Group",
				"label": "Nature Publishing Group",
				"distributor": "Nature Publishing Group",
				"date": "2012-01-18",
				"language": "en",
				"issue": "7381",
				"DOI": "10.1038/nature10669",
				"abstractNote": "The mass function of dwarf satellite galaxies that are observed around Local Group galaxies differs substantially from simulations based on cold dark matter: the simulations predict many more dwarf galaxies than are seen. The Local Group, however, may be anomalous in this regard. A massive dark satellite in an early-type lens galaxy at a redshift of 0.222 was recently found using a method based on gravitational lensing, suggesting that the mass fraction contained in substructure could be higher than is predicted from simulations. The lack of very low-mass detections, however, prohibited any constraint on their mass function. Here we report the presence of a (1.9[thinsp][plusmn][thinsp]0.1)[thinsp][times][thinsp]108nature10669-m1jpg19K2716 dark satellite galaxy in the Einstein ring system JVAS B1938+666 (ref. 11) at a redshift of 0.881, where nature10669-m2jpg20K2716 denotes the solar mass. This satellite galaxy has a mass similar to that of the Sagittarius galaxy, which is a satellite of the Milky Way. We determine the logarithmic slope of the mass function for substructure beyond the local Universe to be nature10669-m3jpg21K4620, with an average mass fraction of nature10669-m4jpg21K4820 per cent, by combining data on both of these recently discovered galaxies. Our results are consistent with the predictions from cold dark matter simulations at the 95 per cent confidence level, and therefore agree with the view that galaxies formed hierarchically in a Universe composed of cold dark matter.",
				"url": "http://www.nature.com/nature/journal/v481/n7381/full/nature10669.html",
				"accessDate": "CURRENT_TIMESTAMP",
				"libraryCatalog": "www.nature.com"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.nature.com/nature/journal/v481/n7381/full/481237a.html",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [],
				"notes": [],
				"tags": [
					"Policy",
					"Politics",
					"History"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"itemID": "http://www.nature.com/nature/journal/v481/n7381/full/481237a.html",
				"title": "Antarctic Treaty is cold comfort",
				"publicationTitle": "Nature",
				"rights": "© 2012 Nature Publishing Group, a division of Macmillan Publishers Limited. All Rights Reserved.",
				"volume": "481",
				"pages": "237-237",
				"ISSN": "0028-0836",
				"publisher": "Nature Publishing Group",
				"institution": "Nature Publishing Group",
				"company": "Nature Publishing Group",
				"label": "Nature Publishing Group",
				"distributor": "Nature Publishing Group",
				"date": "2012-01-18",
				"language": "en",
				"issue": "7381",
				"DOI": "10.1038/481237a",
				"abstractNote": "Researchers need to cement the bond between science and the South Pole if the region is to remain one of peace and collaboration.",
				"url": "http://www.nature.com/nature/journal/v481/n7381/full/481237a.html",
				"accessDate": "CURRENT_TIMESTAMP",
				"libraryCatalog": "www.nature.com"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.nature.com/nature/journal/v481/n7381/full/nature10728.html",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Peter J.",
						"lastName": "Watson",
						"creatorType": "author"
					},
					{
						"firstName": "Louise",
						"lastName": "Fairall",
						"creatorType": "author"
					},
					{
						"firstName": "Guilherme M.",
						"lastName": "Santos",
						"creatorType": "author"
					},
					{
						"firstName": "John W. R.",
						"lastName": "Schwabe",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"Structural biology",
					"Biochemistry"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"itemID": "http://www.nature.com/nature/journal/v481/n7381/full/nature10728.html",
				"title": "Structure of HDAC3 bound to co-repressor and inositol tetraphosphate",
				"publicationTitle": "Nature",
				"rights": "© 2011 Nature Publishing Group, a division of Macmillan Publishers Limited. All Rights Reserved.",
				"volume": "481",
				"pages": "335-340",
				"ISSN": "0028-0836",
				"publisher": "Nature Publishing Group",
				"institution": "Nature Publishing Group",
				"company": "Nature Publishing Group",
				"label": "Nature Publishing Group",
				"distributor": "Nature Publishing Group",
				"date": "2012-01-09",
				"language": "en",
				"issue": "7381",
				"DOI": "10.1038/nature10728",
				"url": "http://www.nature.com/nature/journal/v481/n7381/full/nature10728.html",
				"accessDate": "CURRENT_TIMESTAMP",
				"libraryCatalog": "www.nature.com",
				"abstractNote": "Histone deacetylase enzymes (HDACs) are emerging cancer drug targets. They regulate gene expression by removing acetyl groups from lysine residues in histone tails, resulting in chromatin condensation. The enzymatic activity of most class I HDACs requires recruitment into multi-subunit co-repressor complexes, which are in turn recruited to chromatin by repressive transcription factors. Here we report the structure of a complex between an HDAC and a co-repressor, namely, human HDAC3 with the deacetylase activation domain (DAD) from the human SMRT co-repressor (also known as NCOR2). The structure reveals two remarkable features. First, the SMRT-DAD undergoes a large structural rearrangement on forming the complex. Second, there is an essential inositol tetraphosphate molecule—d-myo-inositol-(1,4,5,6)-tetrakisphosphate (Ins(1,4,5,6)P4)—acting as an ‘intermolecular glue’ between the two proteins. Assembly of the complex is clearly dependent on the Ins(1,4,5,6)P4, which may act as a regulator—potentially explaining why inositol phosphates and their kinases have been found to act as transcriptional regulators. This mechanism for the activation of HDAC3 appears to be conserved in class I HDACs from yeast to humans, and opens the way to novel therapeutic opportunities."
			}
		]
	}
]
/** END TEST CASES **/