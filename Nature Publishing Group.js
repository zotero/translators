{
	"translatorID": "6614a99-479a-4524-8e30-686e4d66663e",
	"label": "Nature Publishing Group",
	"creator": "Aurimas Vinckevicius",
	"target": "https?://[^/]*nature\\.com(:[\\d]+)?(?=/)[^?]*(/(journal|archive|research|search|full|abs)/|current_issue.htm)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 200,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsib",
	"lastUpdated": "2012-02-16 15:46:00"
}

//get abstract
function getAbstract(doc) {
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
		if (prefix == 'x') return namespace; else return null;
	} : null;

	var paragraphs = doc.evaluate('//div[@id="abs"]/*[self::div[not(contains(@class, "keyw-abbr"))] or self::p]', doc, nsResolver, XPathResult.ANY_TYPE, null);
	var textArr = new Array();
	var p;
	while( p = paragraphs.iterateNext() ) {
		textArr.push(p.textContent.trim());
	}

	if(textArr.length == 0) {
		//nothing matched. Must be the new Nature style
		paragraphs = doc.evaluate('//div[contains(@id,"abstract")]/div[@class="content"]/p', doc, nsResolver, XPathResult.ANY_TYPE, null);
		while( p = paragraphs.iterateNext() ) {
			textArr.push(p.textContent.trim());
		}
	}

	return textArr.join("\n");
}

//some journals display keywords
function getKeywords(doc) {
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
		if (prefix == 'x') return namespace; else return null;
	} : null;

	var keywords = doc.evaluate('//div[@class="keyw-abbr"]/p', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext();
	if( !keywords ) {
		//try new nature style
		keywords = Zotero.Utilities.xpathText(doc, '//div[contains(@class,"article-keywords")]/ul/li/a', null, '; ');
	} else {
		keywords = keywords.textContent.trim();
	}

	if( !keywords ) return null;

	return keywords.split('; ');
}

//get PDF url
function getPdfUrl(doc) {
	var link = Zotero.Utilities.xpath(doc, '//li[@class="download-pdf" or @class="pdf" or @class="downloading-pdf"]/a');
	if(link.length == 1) return link[0].href;
}

//add using embedded metadata
function scrapeEmbedMeta(doc, url) {
	var translator = Zotero.loadTranslator("web");
	//Embedded Metadata translator
	translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");

	translator.setDocument(doc);

	translator.setHandler("itemDone", function(obj, item) {
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

		if(!item.abstractNote) item.abstractNote = getAbstract(doc);

		var pdf = getPdfUrl(doc);
		if(pdf) {
			item.attachments = [{
				url: pdf,
				title: 'Full Text PDF',
				mimeType: 'application/pdf'}];
		}

		if( !item.tags || item.tags.length < 1 ) item.tags = getKeywords(doc);

		if (item.notes) item.notes = [];

		item.complete();
	});

	translator.translate();
}

function detectWeb(doc, url) {
	if( url.match(/\/(full|abs)\/[^\/]+($|\?|#)/) ) {

		return 'journalArticle';

	} else if( doc.title.toLowerCase().match('table of contents') ||	//single issue ToC. e.g. http://www.nature.com/emboj/journal/v30/n1/index.html or http://www.nature.com/nature/journal/v481/n7381/index.html
		doc.title.toLowerCase().match('current issue') ||
		url.match('/research/') ||
		url.match('/vaop/') ||		//advanced online publication
		url.match('sp-q=') ) {		//search query

		return 'multiple';

	} else if( url.match('/archive/') ) {
		if( url.match('index.htm') ) return false;				//list of issues
		if( url.match('subject.htm') ) return false;				//list of subjects
		if( url.match('category.htm') && !url.match('code=') ) return false;	//list of categories

		return 'multiple';	//all else should be ok

	}
}

function doWeb(doc, url) {
	if( detectWeb(doc, url) == 'multiple' ) {
		var allHNodes = '*[self::h1 or self::h2 or self::h3 or self::h4 or self::h5]';
		var nodex, titlex, linkx;
		var nodes = [];

		if( url.match('/search/') ) {
			//search
			nodex = '//ol[@class="results-list"]/li';
			titlex = './' + allHNodes + '/node()[not(self::span)]';
			linkx = './' + allHNodes + '/a';

			nodes = Zotero.Utilities.xpath(doc, nodex);
		} else {

			//Maybe there's a nice way to figure out which journal uses what style, but for now we'll just try one until it matches
			//these seem to be listed in order of frequency
			var styles = [
				//oncogene
				{
					'nodex' : '//div[child::*[@class="atl"]]',
					'titlex' : './' + allHNodes + '/node()[not(self::span)]',
					'linkx' : './p[@class="links"]/a[contains(text(),"Full Text") or contains(text(),"Full text")]'
				},
				//embo journal
				{
					'nodex' : '//ul[@class="articles"]/li',
					'titlex' : './' + allHNodes + '[@class="article-title"]/node()[not(self::span)]',
					'linkx' : './ul[@class="article-links"]/li/a[contains(text(),"Full Text") or contains(text(),"Full text")]'
				},
				//nature
				{
					'nodex' : '//ul[contains(@class,"article-list") or contains(@class,"collapsed-list")]/li',
					'titlex' : './/' + allHNodes + '/a',
					'linkx' : './/' + allHNodes + '/a'
				}];

			for(var i=0; i<styles.length && nodes.length==0; i++) {
				nodex = styles[i].nodex;
				titlex = styles[i].titlex;
				linkx = styles[i].linkx;

				nodes = Zotero.Utilities.xpath(doc, nodex);
			}
		}

		if(nodes.length == 0) return false;	//nothing matched

		var items = new Object();
		var title, url;
		for(var i=0; i<nodes.length; i++) {
			title = Zotero.Utilities.xpathText(nodes[i], titlex, null, '');
			link = Zotero.Utilities.xpath(nodes[i], linkx);
			if(title && link.length==1) {
				items[link[0].href] = title.trim();
			}
		}

		var urls = new Array();

		Zotero.selectItems(items, function(selectedItems) {
			if( selectedItems == null ) return true;
			for( var item in selectedItems ) {
				urls.push(item);
			}
			Zotero.Utilities.processDocuments(urls,
				function(newDoc) {
					doWeb(newDoc, newDoc.location.href)
				},
				function() { Zotero.done(); });
			Zotero.wait(); });
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
					"gastric cancer",
					"cancer stem cells",
					"CD90",
					"ERBB2",
					"trastuzumab (herceptin)"
				],
				"seeAlso": [],
				"attachments": [
					{
						"url": "http://www.nature.com/onc/journal/v31/n6/pdf/onc2011282a.pdf",
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"itemID": "http://www.nature.com/onc/journal/v31/n6/full/onc2011282a.html",
				"title": "Trastuzumab (herceptin) targets gastric cancer stem cells characterized by CD90 phenotype",
				"source": "Oncogene",
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
				"accessionNumber": "doi:10.1038/onc.2011.282",
				"DOI": "10.1038/onc.2011.282",
				"url": "http://www.nature.com/onc/journal/v31/n6/full/onc2011282a.html",
				"accessDate": "CURRENT_TIMESTAMP",
				"libraryCatalog": "www.nature.com",
				"abstractNote": "Identification and characterization of cancer stem cells (CSCs) in gastric cancer are difficult owing to the lack of specific markers and consensus methods. In this study, we show that cells with the CD90 surface marker in gastric tumors could be enriched under non-adherent, serum-free and sphere-forming conditions. These CD90+ cells possess a higher ability to initiate tumor in vivo and could re-establish the cellular hierarchy of tumors from single-cell implantation, demonstrating their self-renewal properties. Interestingly, higher proportion of CD90+ cells correlates with higher in vivo tumorigenicity of gastric primary tumor models. In addition, it was found that ERBB2 was overexpressed in about 25% of the gastric primary tumor models, which correlates with the higher level of CD90 expression in these tumors. Trastuzumab (humanized anti-ERBB2 antibody) treatment of high-tumorigenic gastric primary tumor models could reduce the CD90+ population in tumor mass and suppress tumor growth when combined with traditional chemotherapy. Moreover, tumorigenicity of tumor cells could also be suppressed when trastuzumab treatment starts at the same time as cell implantation. Therefore, we have identified a CSC population in gastric primary tumors characterized by their CD90 phenotype. The finding that trastuzumab targets the CSC population in gastric tumors suggests that ERBB2 signaling has a role in maintaining CSC populations, thus contributing to carcinogenesis and tumor invasion. In conclusion, the results from this study provide new insights into the gastric tumorigenic process and offer potential implications for the development of anticancer drugs as well as therapeutic treatment of gastric cancers."
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.nature.com/nature/journal/v482/n7384/full/nature10800.html",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Ross N.",
						"lastName": "Mitchell",
						"creatorType": "author"
					},
					{
						"firstName": "Taylor M.",
						"lastName": "Kilian",
						"creatorType": "author"
					},
					{
						"firstName": "David A. D.",
						"lastName": "Evans",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"Geology",
					"Geophysics",
					"Earth sciences",
					"Planetary sciences"
				],
				"seeAlso": [],
				"attachments": [
					{
						"itemType": "journalArticle",
						"creators": [
							{
								"firstName": "Ross N.",
								"lastName": "Mitchell",
								"creatorType": "author"
							},
							{
								"firstName": "Taylor M.",
								"lastName": "Kilian",
								"creatorType": "author"
							},
							{
								"firstName": "David A. D.",
								"lastName": "Evans",
								"creatorType": "author"
							}
						],
						"notes": [],
						"tags": [],
						"seeAlso": [],
						"attachments": [],
						"itemID": "http://www.nature.com/nature/journal/v482/n7384/full/nature10800.html",
						"title": "Supercontinent cycles and the calculation of absolute palaeolongitude in deep time",
						"source": "Nature",
						"publicationTitle": "Nature",
						"rights": "© 2012 Nature Publishing Group, a division of Macmillan Publishers Limited. All Rights Reserved.",
						"volume": "482",
						"pages": "208-211",
						"ISSN": "0028-0836",
						"publisher": "Nature Publishing Group",
						"institution": "Nature Publishing Group",
						"company": "Nature Publishing Group",
						"label": "Nature Publishing Group",
						"distributor": "Nature Publishing Group",
						"date": "2012-02-08",
						"accessionNumber": "doi:10.1038/nature10800",
						"issue": "7384",
						"DOI": "10.1038/nature10800",
						"url": "http://www.nature.com/nature/journal/v482/n7384/full/nature10800.html",
						"accessDate": "CURRENT_TIMESTAMP",
						"libraryCatalog": "www.nature.com"
					}
				],
				"itemID": "http://www.nature.com/nature/journal/v482/n7384/full/nature10800.html",
				"title": "Supercontinent cycles and the calculation of absolute palaeolongitude in deep time",
				"source": "Nature",
				"publicationTitle": "Nature",
				"rights": "© 2012 Nature Publishing Group, a division of Macmillan Publishers Limited. All Rights Reserved.",
				"volume": "482",
				"pages": "208-211",
				"ISSN": "0028-0836",
				"publisher": "Nature Publishing Group",
				"institution": "Nature Publishing Group",
				"company": "Nature Publishing Group",
				"label": "Nature Publishing Group",
				"distributor": "Nature Publishing Group",
				"date": "2012-02-08",
				"accessionNumber": "doi:10.1038/nature10800",
				"issue": "7384",
				"DOI": "10.1038/nature10800",
				"url": "http://www.nature.com/nature/journal/v482/n7384/full/nature10800.html",
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
						"firstName": "Simon M",
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
						"firstName": "Amanda S",
						"lastName": "Coutts",
						"creatorType": "author"
					},
					{
						"firstName": "Benedikt",
						"lastName": "Kessler",
						"creatorType": "author"
					},
					{
						"firstName": "David J",
						"lastName": "Kerr",
						"creatorType": "author"
					},
					{
						"firstName": "Nicholas B La",
						"lastName": "Thangue",
						"creatorType": "author"
					}
				],
				"notes": [],
				"seeAlso": [],
				"attachments": [
					{
						"url": "http://www.nature.com/emboj/journal/vaop/ncurrent/pdf/emboj201217a.pdf",
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"itemID": "http://www.nature.com/emboj/journal/vaop/ncurrent/full/emboj201217a.html",
				"title": "Arginine methylation controls growth regulation by E2F-1",
				"source": "The EMBO Journal",
				"publicationTitle": "The EMBO Journal",
				"rights": "© 2012 Nature Publishing Group",
				"ISSN": "ERROR! NO ISSN",
				"publisher": "Nature Publishing Group",
				"institution": "Nature Publishing Group",
				"company": "Nature Publishing Group",
				"label": "Nature Publishing Group",
				"distributor": "Nature Publishing Group",
				"date": "2012-02-10",
				"accessionNumber": "doi:10.1038/emboj.2012.17",
				"DOI": "10.1038/emboj.2012.17",
				"url": "http://www.nature.com/emboj/journal/vaop/ncurrent/full/emboj201217a.html",
				"accessDate": "CURRENT_TIMESTAMP",
				"libraryCatalog": "www.nature.com"
			}
		]
	}
]
/** END TEST CASES **/