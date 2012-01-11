{
	"translatorID": "b6d0a7a-d076-48ae-b2f0-b6de28b194e",
	"label": "ScienceDirect",
	"creator": "Michael Berkowitz",
	"target": "^https?://[^/]*science-?direct\\.com[^/]*/science(\\/article)?(\\?(?:.+\\&|)ob=(?:ArticleURL|ArticleListURL|PublicationURL))?",
	"minVersion": "2.1",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsb",
	"lastUpdated": "2012-01-11 09:09:04"
}

function detectWeb(doc, url) {
  	if ((url.indexOf("_ob=DownloadURL") != -1) 
		|| doc.title == "ScienceDirect Login" 
		|| doc.title == "ScienceDirect - Dummy"
		|| (url.indexOf("/science/advertisement/") !== -1)) { 
		return false;
	}
	if((url.indexOf("pdf") !== -1
				&& url.indexOf("_ob=ArticleURL") === -1
				&& url.indexOf("/article/") === -1)
			|| url.indexOf("/journal/") !== -1
			|| url.indexOf("_ob=ArticleListURL") !== -1
			|| url.indexOf("/book/") !== -1) {
		if (ZU.xpath(doc, '//table[@class="resultRow"]/tbody/tr/td[2]/a').length > 0
			|| ZU.xpath(doc, '//table[@class="resultRow"]/tbody/tr/td[2]/h3/a').length > 0
			|| ZU.xpath(doc, '//td[@class="nonSerialResultsList"]/h3/a').length > 0

			//not sure if this fourth one is still necessary.
			|| ZU.xpath(doc, '//div[@class="font3"][@id="bodyMainResults"]//td[@class="pubBody"]/div/table/tbody/tr/td[3]/a').length > 0
			) {
			return "multiple";
		} else {
			return false;
		}
	} else if (!url.match("pdf")) {
		// Book sections have the ISBN in the URL
		if (url.indexOf("/B978") !== -1)
			return "bookSection";
		else
			return "journalArticle";
	} 
}



function doWeb(doc, url) {
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
		if (prefix == 'x') return namespace; else return null;
	} : null;

		var articles = new Array();
		if(detectWeb(doc, url) == "multiple") {
			//search page
			var items = new Object();
			var xpath;
				xpath = '//table[@class="resultRow"]/tbody/tr/td[2]/a|//table[@class="resultRow"]/tbody/tr/td[2]/h3/a|//td[@class="nonSerialResultsList"]/h3/a';
			var rows = doc.evaluate(xpath, doc, nsResolver, XPathResult.ANY_TYPE, null);
			var next_row;
			while (next_row = rows.iterateNext()) {
				var title = next_row.textContent;
				var link = next_row.href;
				if (!title.match(/PDF \(/) && !title.match(/Related Articles/)) items[link] = title;
			}
			items = Zotero.selectItems(items);
			for (var i in items) {
				articles.push(i);
			}

			var sets = [];
			for each (article in articles) {
				sets.push({article:article});
			}

		} else {
			articles = [url];
			var sets =[{currentdoc:doc}];
		}
		if(articles.length == 0) {
			Zotero.debug('no items');
			return;
		}


		var scrape = function(newDoc, set) {
			var PDF;
			var tempPDF = newDoc.evaluate('//div[@class="icon_pdf"]/a', newDoc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext();
			if (!tempPDF) { // PDF xpath failed, lets try another
				// TODO: others?
				//tempPDF = newDoc.evaluate('//a[@class="noul" and contains(text(), "PDF")]', newDoc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext();
				if (!tempPDF) { // second PDF xpath failed set PDF to null to avoid item.attachments
					PDF = null;
				} else {
					PDF = tempPDF.href; // second xpath succeeded, use that link
				}
			} else {
				PDF = tempPDF.href; // first xpath succeeded, use that link
			}
			var url = newDoc.location.href;
			var get = newDoc.evaluate('//div[@class="icon_exportarticlesci_dir"]/a', newDoc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext().href;
			// if the PDF is available make it an attachment otherwise only use snapshot.
			var attachments;
			if (PDF) {
				attachments = [
					{url:url, title:"ScienceDirect Snapshot", mimeType:"text/html"},
					{url:PDF, title:"ScienceDirect Full Text PDF", mimeType:"application/pdf"} // Sometimes PDF is null...I hope that is ok
				];
			} else {
				attachments = [
					{url:url, title:"ScienceDirect Snapshot", mimeType:"text/html"}
				];
			}
			// This does not work, not sure why.
			//var doi = newDoc.evaluate('//a[contains(text(), "doi")]/text()', newDoc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext();
			//Zotero.debug(doi);
			//doi = doi.textContent.substr(4);
			// pass these values to the next function
			//set.doi = doi;
			set.url = url;
			set.get = get;
			set.attachments = attachments;
			return set;

		};

		var first = function(set, next) {
				var article = set.article;
				Zotero.Utilities.processDocuments(article, function(doc){
					set = scrape(doc, set);
					next();
				});
		};

		var second = function(set, next) {
			var url = set.url;
			var get = set.get;

			Zotero.Utilities.HTTP.doGet(get, function(text) {
				const postOrder = ["_ob", "_method", "_acct", "_userid", "_docType",
					"_ArticleListID", "_uoikey", "_eidkey", "count", "md5", "JAVASCRIPT_ON",
					"format", "citation-type", "Export"];
				var postParams = {
					"_ob":"DownloadURL",
					"_method":"finish",
					"_docType":"FLA",
					"count":"1",
					"JAVASCRIPT_ON":"Y",
					"format":"cite-abs",
					"citation-type":"RIS",
					"Export":"Export"
				};

				const re = /<input type=hidden name=(md5|_acct|_userid|_uoikey|_eidkey|_ArticleListID) value=([^>]+)>/g;
				while((m = re.exec(text)) != null) {
					postParams[encodeURIComponent(m[1])] = encodeURIComponent(m[2]);
				}

				var post = "";
				for(var i=0, n=postOrder.length; i<n; i++) {
					var key = postOrder[i];
					if(postParams[key]) post += "&"+key+"="+postParams[key];
				}

				var baseurl = url.match(/https?:\/\/[^/]+\//)[0];

				set.post = post;
				set.baseurl = baseurl;

				next();
			});


		};

		var third = function(set, next) {
			var baseurl = set.baseurl;
			var post = set.post;
			var attachments = set.attachments;


			Zotero.Utilities.HTTP.doPost(baseurl + 'science', post, function(text) {
				var translator = Zotero.loadTranslator("import");
				translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
				translator.setString(text);
				translator.setHandler("itemDone", function(obj, item) {
					item.attachments = attachments;

					if(item.notes[0]) {
						item.abstractNote = item.notes[0].note;
						item.notes = new Array();
					}
					item.DOI = item.DOI.replace(/^doi:\s+/i, '');
					item.complete();
				});
				translator.translate();

				next();
			}, false, 'utf8');


		};

		var detectedType = detectWeb(doc, url);
		if(detectedType == "journalArticle"
			|| detectedType == "bookSection") {
			var set = scrape(doc, {});
			second(set, function(){
				third(set, function(){
					Zotero.done();
				});
			});

		} else {
			var callbacks = [first, second, third];
			Zotero.Utilities.processAsync(sets, callbacks, function() {Zotero.done()});
		}

	Zotero.wait();
}


/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.sciencedirect.com/science/article/pii/S0896627311004430#bib5",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"lastName": "Schaaf",
						"firstName": "Christian P.",
						"creatorType": "author"
					},
					{
						"lastName": "Zoghbi",
						"firstName": "Huda Y.",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"url": false,
						"title": "ScienceDirect Snapshot",
						"mimeType": "text/html"
					},
					{
						"url": false,
						"title": "ScienceDirect Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"title": "Solving the Autism Puzzle a Few Pieces at a Time",
				"publicationTitle": "Neuron",
				"volume": "70",
				"issue": "5",
				"pages": "806-808",
				"date": "June 9, 2011",
				"ISBN": "0896-6273",
				"ISSN": "0896-6273",
				"DOI": "10.1016/j.neuron.2011.05.025",
				"url": "http://www.sciencedirect.com/science/article/pii/S0896627311004430",
				"abstractNote": "In this issue, a pair of studies (Levy et al. and Sanders et al.) identify several de novo copy-number variants that together account for 5%–8% of cases of simplex autism spectrum disorders. These studies suggest that several hundreds of loci are likely to contribute to the complex genetic heterogeneity of this group of disorders. An accompanying study in this issue (Gilman et al.), presents network analysis implicating these CNVs in neural processes related to synapse development, axon targeting, and neuron motility.",
				"libraryCatalog": "ScienceDirect"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.sciencedirect.com/science/article/pii/S016748890800116X",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"lastName": "Pereira",
						"firstName": "C.",
						"creatorType": "author"
					},
					{
						"lastName": "Silva",
						"firstName": "R.D.",
						"creatorType": "author"
					},
					{
						"lastName": "Saraiva",
						"firstName": "L.",
						"creatorType": "author"
					},
					{
						"lastName": "Johansson",
						"firstName": "B.",
						"creatorType": "author"
					},
					{
						"lastName": "Sousa",
						"firstName": "M.J.",
						"creatorType": "author"
					},
					{
						"lastName": "Côrte-Real",
						"firstName": "M.",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"Yeast apoptosis",
					"Apoptotic regulators",
					"Mitochondrial outer membrane permeabilization",
					"Permeability transition pore",
					"Bcl-2 family",
					"Mitochondrial fragmentation"
				],
				"seeAlso": [],
				"attachments": [
					{
						"url": false,
						"title": "ScienceDirect Snapshot",
						"mimeType": "text/html"
					},
					{
						"url": false,
						"title": "ScienceDirect Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"title": "Mitochondria-dependent apoptosis in yeast",
				"publicationTitle": "Biochimica et Biophysica Acta (BBA) - Molecular Cell Research",
				"volume": "1783",
				"issue": "7",
				"pages": "1286-1302",
				"date": "July 2008",
				"ISBN": "0167-4889",
				"ISSN": "0167-4889",
				"DOI": "10.1016/j.bbamcr.2008.03.010",
				"url": "http://www.sciencedirect.com/science/article/pii/S016748890800116X",
				"abstractNote": "Mitochondrial involvement in yeast apoptosis is probably the most unifying feature in the field. Reports proposing a role for mitochondria in yeast apoptosis present evidence ranging from the simple observation of ROS accumulation in the cell to the identification of mitochondrial proteins mediating cell death. Although yeast is unarguably a simple model it reveals an elaborate regulation of the death process involving distinct proteins and most likely different pathways, depending on the insult, growth conditions and cell metabolism. This complexity may be due to the interplay between the death pathways and the major signalling routes in the cell, contributing to a whole integrated response. The elucidation of these pathways in yeast has been a valuable help in understanding the intricate mechanisms of cell death in higher eukaryotes, and of severe human diseases associated with mitochondria-dependent apoptosis. In addition, the absence of obvious orthologues of mammalian apoptotic regulators, namely of the Bcl-2 family, favours the use of yeast to assess the function of such proteins. In conclusion, yeast with its distinctive ability to survive without respiration-competent mitochondria is a powerful model to study the involvement of mitochondria and mitochondria interacting proteins in cell death.",
				"libraryCatalog": "ScienceDirect",
				"accessDate": "CURRENT_TIMESTAMP",
				"checkFields": "title"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.sciencedirect.com/science/book/9780123694683",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.sciencedirect.com/science/article/pii/B9780123694683500083",
		"items": [
			{
				"itemType": "bookSection",
				"creators": [
					{
						"lastName": "Dierk",
						"firstName": "Raabe",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"url": false,
						"title": "ScienceDirect Snapshot",
						"mimeType": "text/html"
					},
					{
						"url": false,
						"title": "ScienceDirect Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"title": "8 - Introduction to discrete dislocation statics and dynamics",
				"bookTitle": "Computational Materials Engineering",
				"publisher": "Academic Press",
				"place": "Burlington",
				"date": "2007",
				"pages": "267-316",
				"ISBN": "978-0-12-369468-3",
				"ISSN": "978-0-12-369468-3",
				"DOI": "10.1016/B978-012369468-3/50008-3",
				"url": "http://www.sciencedirect.com/science/article/pii/B9780123694683500083",
				"libraryCatalog": "ScienceDirect"
			}
		]
	}
]
/** END TEST CASES **//** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.sciencedirect.com/science/article/pii/S0896627311004430#bib5",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"lastName": "Schaaf",
						"firstName": "Christian P.",
						"creatorType": "author"
					},
					{
						"lastName": "Zoghbi",
						"firstName": "Huda Y.",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"url": false,
						"title": "ScienceDirect Snapshot",
						"mimeType": "text/html"
					},
					{
						"url": false,
						"title": "ScienceDirect Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"title": "Solving the Autism Puzzle a Few Pieces at a Time",
				"publicationTitle": "Neuron",
				"volume": "70",
				"issue": "5",
				"pages": "806-808",
				"date": "June 9, 2011",
				"ISBN": "0896-6273",
				"ISSN": "0896-6273",
				"DOI": "10.1016/j.neuron.2011.05.025",
				"url": "http://www.sciencedirect.com/science/article/pii/S0896627311004430",
				"abstractNote": "In this issue, a pair of studies (Levy et al. and Sanders et al.) identify several de novo copy-number variants that together account for 5%–8% of cases of simplex autism spectrum disorders. These studies suggest that several hundreds of loci are likely to contribute to the complex genetic heterogeneity of this group of disorders. An accompanying study in this issue (Gilman et al.), presents network analysis implicating these CNVs in neural processes related to synapse development, axon targeting, and neuron motility.",
				"libraryCatalog": "ScienceDirect"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.sciencedirect.com/science/article/pii/S016748890800116X",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"lastName": "Pereira",
						"firstName": "C.",
						"creatorType": "author"
					},
					{
						"lastName": "Silva",
						"firstName": "R.D.",
						"creatorType": "author"
					},
					{
						"lastName": "Saraiva",
						"firstName": "L.",
						"creatorType": "author"
					},
					{
						"lastName": "Johansson",
						"firstName": "B.",
						"creatorType": "author"
					},
					{
						"lastName": "Sousa",
						"firstName": "M.J.",
						"creatorType": "author"
					},
					{
						"lastName": "Côrte-Real",
						"firstName": "M.",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"Yeast apoptosis",
					"Apoptotic regulators",
					"Mitochondrial outer membrane permeabilization",
					"Permeability transition pore",
					"Bcl-2 family",
					"Mitochondrial fragmentation"
				],
				"seeAlso": [],
				"attachments": [
					{
						"url": false,
						"title": "ScienceDirect Snapshot",
						"mimeType": "text/html"
					},
					{
						"url": false,
						"title": "ScienceDirect Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"title": "Mitochondria-dependent apoptosis in yeast",
				"publicationTitle": "Biochimica et Biophysica Acta (BBA) - Molecular Cell Research",
				"volume": "1783",
				"issue": "7",
				"pages": "1286-1302",
				"date": "July 2008",
				"ISBN": "0167-4889",
				"ISSN": "0167-4889",
				"DOI": "10.1016/j.bbamcr.2008.03.010",
				"url": "http://www.sciencedirect.com/science/article/pii/S016748890800116X",
				"abstractNote": "Mitochondrial involvement in yeast apoptosis is probably the most unifying feature in the field. Reports proposing a role for mitochondria in yeast apoptosis present evidence ranging from the simple observation of ROS accumulation in the cell to the identification of mitochondrial proteins mediating cell death. Although yeast is unarguably a simple model it reveals an elaborate regulation of the death process involving distinct proteins and most likely different pathways, depending on the insult, growth conditions and cell metabolism. This complexity may be due to the interplay between the death pathways and the major signalling routes in the cell, contributing to a whole integrated response. The elucidation of these pathways in yeast has been a valuable help in understanding the intricate mechanisms of cell death in higher eukaryotes, and of severe human diseases associated with mitochondria-dependent apoptosis. In addition, the absence of obvious orthologues of mammalian apoptotic regulators, namely of the Bcl-2 family, favours the use of yeast to assess the function of such proteins. In conclusion, yeast with its distinctive ability to survive without respiration-competent mitochondria is a powerful model to study the involvement of mitochondria and mitochondria interacting proteins in cell death.",
				"libraryCatalog": "ScienceDirect",
				"accessDate": "CURRENT_TIMESTAMP",
				"checkFields": "title"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.sciencedirect.com/science/book/9780123694683",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.sciencedirect.com/science/article/pii/B9780123694683500083",
		"items": [
			{
				"itemType": "bookSection",
				"creators": [
					{
						"lastName": "Dierk",
						"firstName": "Raabe",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"url": false,
						"title": "ScienceDirect Snapshot",
						"mimeType": "text/html"
					},
					{
						"url": false,
						"title": "ScienceDirect Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"title": "8 - Introduction to discrete dislocation statics and dynamics",
				"bookTitle": "Computational Materials Engineering",
				"publisher": "Academic Press",
				"place": "Burlington",
				"date": "2007",
				"pages": "267-316",
				"ISBN": "978-0-12-369468-3",
				"ISSN": "978-0-12-369468-3",
				"DOI": "10.1016/B978-012369468-3/50008-3",
				"url": "http://www.sciencedirect.com/science/article/pii/B9780123694683500083",
				"libraryCatalog": "ScienceDirect"
			}
		]
	}
]
/** END TEST CASES **/
