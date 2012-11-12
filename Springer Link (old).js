{
	"translatorID": "f8765470-5ace-4a31-b4bd-4327b960ccd",
	"label": "Springer Link (old)",
	"creator": "Sebastian Karcher",
	"target": "https?://[^/]*springerlink\\.(metapress\\.)?com/.+/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsib",
	"lastUpdated": "2012-11-12 12:09:49"
}

/*
Springerlink Translator
Copyright (C) 2011 Sebastian Karcher

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

//localized containers
//update as springerlink gets more locales
var slContainers = {
	//issues are part of journals
	'issue': 'issue',
	'heft': 'issue',
	//journal
	'journal': 'journal',
	'zeitschrift': 'journal',
	//book
	'book': 'book',
	'buch': 'book',
	//series
	'series': 'series'	//en = de
}

function detectWeb(doc, url) {
	if(url.indexOf('/journals/') != -1 ||
		url.indexOf('/book-series/') != -1) return;
	//lists of books, book chapters, search results,
	//and articles within journal
	if (ZU.xpath(doc, '//div[@id="ContentPrimary"]\
		//ul[@id="PrimaryManifest"]\
		//p[@class="title"][./a]').length)
		return "multiple";

	var container = ZU.xpathText(doc, '//div[@id="Cockpit"]//a[@href="#ui-tabs-1"]');
	if(container) container = container.trim().toLowerCase();

	switch(slContainers[container]) {
		//journal article list should have been picked up as multiple
		case 'issue':
		case 'journal':
			return 'journalArticle';
			break;
		case 'book':
			return 'bookSection';
			break;
		case 'series':
			return 'book';
			break;
		default:
			Z.debug('unknown container: ' + container);
	}
}

function doWeb(doc, url) {
	var type = detectWeb(doc, url);
	if ( type == "multiple") {
		var titles = ZU.xpath(doc, '//div[@id="ContentPrimary"]\
						//ul[@id="PrimaryManifest"]//p[@class="title"][./a]');

		Zotero.selectItems(ZU.getItemArray(doc, titles), function (items) {
			if (!items) return true;

			var citationurls = new Array();
			if(url.indexOf('/books/') != -1 ||
				url.indexOf('/reference-works/') != -1) {
				for (var itemurl in items) {
					citationurls.push(itemurl);
				}
				ZU.processDocuments(citationurls, scrapeBook);
			} else {
				for (var itemurl in items) {
					var newurl = itemurl + "export-citation";
					citationurls.push(newurl);
				}
				getpages(citationurls);
			}
		});
	} else if( type == 'book' ){
		scrapeBook(doc)
	} else {
		var citationurl = url.replace(/\/?(?:(?:about|abstract|fulltext\.html|references|export-citation)\/?)?(?:[#?].*)?$/, "")
							 + "/export-citation";
		getpages(citationurl);
	}
}

function getpages(citationurl) {
	//we work entirely from the citations page
	Z.debug('citationurl: ' + citationurl);
	Zotero.Utilities.processDocuments(citationurl, function (doc) {
		scrape(doc);
	}, function () {
		Zotero.done()
	});
}

function scrapeBook(doc) {
	var item = new Zotero.Item('book');

	//title
	item.title = ZU.xpathText(doc, '//div[@id="ContentHeading"]//h1[@class="title"]');

	if(!item.title) {
		Z.debug('Could not get book title');
		Z.debug('Page Dump: ' + doc.body.innerHTML);
	}

	item.title = ZU.capitalizeTitle(ZU.trimInternal(item.title));

	//authors
	var authors = ZU.xpath(doc, '//div[@id="ContentHeading"]//p[@class="authors"]/a');
	for(var i=0, n=authors.length; i<n; i++) {
		item.creators.push(ZU.cleanAuthor(authors[i].textContent,'author'));
	}

	//editors
	var editors = ZU.xpath(doc, '//div[@id="ContentHeading"]//p[@class="editors"]/a');
	for(var i=0, n=editors.length; i<n; i++) {
		item.creators.push(ZU.cleanAuthor(editors[i].textContent,'editor'));
	}

	//series
	item.series = ZU.xpathText(doc, '//div[@id="ContentHeading"]//div[@class="primary"]/a');
	if(item.series) item.series = ZU.capitalizeTitle(ZU.trimInternal(item.series));

	//doi
	var doi = ZU.xpathText(doc, '//div[@id="ContentHeading"]\
					//div[@class="secondary"]/span[@class="doi"]', null, '');
	if(doi) {
		item.extra = ZU.trimInternal(doi).replace(/^.*?(?=DOI)/i,' ');
	}

	//volume, issue, etc
	var vol = ZU.xpathText(doc, '//div[@id="ContentHeading"]//div[@class="secondary"]/text()');
	if(vol) {
		var m = vol.trim().match(/^(?:volume\s+(\d+),)?.*?(\d{4})$/);
		if(m) {
			item.volume = m[1];
			item.date = m[2];
		}
	}

	item.url = doc.location.href.replace('/#.*/','');

	item.complete();
}

function scrapeExport(doc, viewstate, eventvalidate) {
	var newurl = doc.location.href;
	var pdfurl = newurl.replace(/export-citation/, "fulltext.pdf");
	var absurl = newurl.replace(/export-citation/, "abstract/");
	var get = newurl;
	var post = '__VIEWSTATE=' + encodeURIComponent(viewstate) +
		'&ctl00%24ctl14%24cultureList=en-us' +
		'&ctl00%24ctl14%24SearchControl%24BasicSearchForTextBox=' +
		'&ctl00%24ctl14%24SearchControl%24BasicAuthorOrEditorTextBox=' +
		'&ctl00%24ctl14%24SearchControl%24BasicPublicationTextBox=' +
		'&ctl00%24ctl14%24SearchControl%24BasicVolumeTextBox=' +
		'&ctl00%24ctl14%24SearchControl%24BasicIssueTextBox=' +
		'&ctl00%24ctl14%24SearchControl%24BasicPageTextBox=' +
		'&ctl00%24ContentPrimary%24ctl00%24ctl00%24' +
			'Export=AbstractRadioButton' + 
		'&ctl00%24ContentPrimary%24ctl00%24ctl00%24' +
		//	'CitationManagerDropDownList=ReferenceManager' +
			'CitationManagerDropDownList=BibTex' +
		'&ctl00%24ContentPrimary%24ctl00%24ctl00%24' +
			'ExportCitationButton=Export+Citation' +
		'&__EVENTVALIDATION=' + encodeURIComponent(eventvalidate);
	Zotero.Utilities.HTTP.doPost(get, post, function (text) {
		//Z.debug('Citation Export: ' + text);
		var translator = Zotero.loadTranslator("import");
		// Calling the RIS translator
		//translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
		// Calling the BibTeX translator
		translator.setTranslator("9cb70025-a888-4a29-a210-93ec52da40d4");
		translator.setString(text);
		translator.setHandler("itemDone", function (obj, item) {
			item.DOI = item.extra;
			delete item.extra;
			item.url = absurl;
			item.notes = [];
			item.attachments = [{
				url: pdfurl,
				title: "SpringerLink Full Text PDF",
				mimeType: "application/pdf"
			}, {
				url: absurl,
				title: "SpringerLink Snapshot",
				mimeType: "text/html"
			}];
			item.complete();
		});

		translator.getTranslatorObject(function(trans) {
			trans.setKeywordSplitOnSpace(false);
			trans.doImport();
		});
	});
}

function scrape(doc) {
	var viewstate = ZU.xpathText(doc, '//input[@name="__VIEWSTATE"]/@value');
	var eventvalidate = ZU.xpathText(doc, '//input[@name="__EVENTVALIDATION"]/@value');

	Z.debug('eventvalidate: ' + eventvalidate);
	Z.debug('viewstate: ' + viewstate);
	if(!eventvalidate || !viewstate) {
		ZU.doGet(doc.location.href, function(text) {
			var m = text.match(/name\s*=\s*(["'])__VIEWSTATE\1[^>]+?value=(['"])(.+?)\2/i);
			if(m) viewstate = m[3];
			m = text.match(/name\s*=\s*(["'])__EVENTVALIDATION\1[^>]+?value=(['"])(.+?)\2/i);
			if(m) eventvalidate = m[3];

			Z.debug('doGet viewstate: ' + viewstate);
			Z.debug('doGet eventsvalidate: ' + eventvalidate);
			if(!eventvalidate || !viewstate) Z.debug(text);

			scrapeExport(doc, viewstate, eventvalidate);
		})
	} else {
		scrapeExport(doc, viewstate, eventvalidate);
	}


}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.springerlink.com/content/q122682q1u2r7282/abstract/?MUD=MP",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Marty",
						"lastName": "Schmer",
						"creatorType": "author"
					},
					{
						"firstName": "Robert",
						"lastName": "Mitchell",
						"creatorType": "author"
					},
					{
						"firstName": "Kenneth",
						"lastName": "Vogel",
						"creatorType": "author"
					},
					{
						"firstName": "Walter",
						"lastName": "Schacht",
						"creatorType": "author"
					},
					{
						"firstName": "David",
						"lastName": "Marx",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"Chemistry and Materials Science"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "SpringerLink Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "SpringerLink Snapshot",
						"mimeType": "text/html"
					}
				],
				"title": "Efficient Methods of Estimating Switchgrass Biomass Supplies",
				"publicationTitle": "BioEnergy Research",
				"publisher": "Springer New York",
				"ISSN": "1939-1234",
				"pages": "243-250",
				"volume": "3",
				"issue": "3",
				"url": "http://www.springerlink.com/content/q122682q1u2r7282/abstract/",
				"abstractNote": "Switchgrass ( Panicum virgatum L.) is being developed as a biofuel feedstock for the United States. Efficient and accurate methods to estimate switchgrass biomass feedstock supply within a production area will be required by biorefineries. Our main objective was to determine the effectiveness of indirect methods for estimating biomass yields and composition of switchgrass fields. Indirect measurements were conducted in eastern Nebraska from 2003 to 2007 in which switchgrass biomass yields were manipulated using three nitrogen rates (0 kg N ha -1 , 60 kg N ha -1 , and 120 kg N ha -1 ) and two harvest periods (August and post-killing frost). A modified Robel pole was used to determine visual obstruction, elongated leaf height, and canopy height measurements. Prediction models from the study showed that elongated leaf height, visual obstruction, and canopy height measurements accounted for &gt; 91%, &gt; 90%, and &gt; 82% of the variation in switchgrass biomass, respectively. Regression slopes were similar by cultivar (“Cave-in-Rock” and “Trailblazer”), harvest period, and across years indicating that a single model is applicable for determining biomass feedstock supply within a region, assuming similar harvesting methods. Sample numbers required to receive the same level of precision were as follows: elongated leaf height&lt;canopy height&lt;visual obstruction. Twenty to 30 elongated leaf height measurements in a field could predict switchgrass biomass yield within 10% of the mean with 95% confidence. Visual obstruction is recommended on switchgrass fields with low to variable stand densities while elongated leaf height measurements would be recommended on switchgrass fields with high, uniform stand densities. Incorporating an ocular device with a Robel pole provided reasonable frequency estimates of switchgrass, broadleaf weeds, and grassy weeds at the field scale.",
				"date": "2010",
				"DOI": "10.1007/s12155-009-9070-x",
				"libraryCatalog": "Springer Link (old)",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.springerlink.com/content/?k=test",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.springerlink.com/content/n66482lu84706725/references/",
		"items": [
			{
				"itemType": "bookSection",
				"creators": [
					{
						"firstName": "H.",
						"lastName": "Herold",
						"creatorType": "author"
					},
					{
						"firstName": "A.",
						"lastName": "Pchennikov",
						"creatorType": "author"
					},
					{
						"firstName": "M.",
						"lastName": "Streitenberger",
						"creatorType": "author"
					},
					{
						"firstName": "Thomas",
						"lastName": "Böllinghaus",
						"creatorType": "editor"
					},
					{
						"firstName": "Horst",
						"lastName": "Herold",
						"creatorType": "editor"
					}
				],
				"notes": [],
				"tags": [
					"Chemistry and Materials Science"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "SpringerLink Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "SpringerLink Snapshot",
						"mimeType": "text/html"
					}
				],
				"title": "Influence of the Deformation Rate of Different Tests on Hot Cracking Formation",
				"publicationTitle": "Hot Cracking Phenomena in Welds",
				"publisher": "Springer Berlin Heidelberg",
				"ISBN": "978-3-540-27460-5",
				"pages": "328-346",
				"url": "http://www.springerlink.com/content/n66482lu84706725/abstract/",
				"abstractNote": "Referring to the ISO standardization of hot cracking test procedures with externally loaded specimens, three different and fundamental test procedures are assessed with the help of experiments and finite element analyses to find out the influence of different deformation rates on the test results of three well known stainless steels.",
				"date": "2005",
				"DOI": "10.1007/3-540-27460-X_17",
				"libraryCatalog": "Springer Link (old)",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.springerlink.com/content/978-3-540-60427-3",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"firstName": "Erasmus",
						"lastName": "Landvogt",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"title": "A Compactification of the Bruhat-Tits Building",
				"series": "Lecture Notes in Mathematics",
				"extra": "DOI: 10.1007/BFb0094594",
				"url": "http://www.springerlink.com/content/978-3-540-60427-3",
				"libraryCatalog": "Springer Link (old)",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.springerlink.com/content/u0lh124733784407/#section=1046256&page=1",
		"items": [
			{
				"itemType": "bookSection",
				"creators": [
					{
						"firstName": "Aidan",
						"lastName": "Budd",
						"creatorType": "author"
					},
					{
						"firstName": "Maria",
						"lastName": "Anisimova",
						"creatorType": "editor"
					}
				],
				"notes": [],
				"tags": [
					"Biomedical and Life Sciences"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "SpringerLink Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "SpringerLink Snapshot",
						"mimeType": "text/html"
					}
				],
				"title": "Diversity of Genome Organisation",
				"publicationTitle": "Evolutionary Genomics",
				"series": "Methods in Molecular Biology",
				"publisher": "Humana Press",
				"ISBN": "978-1-61779-582-4",
				"pages": "51-76",
				"volume": "855",
				"url": "http://www.springerlink.com/content/u0lh124733784407/abstract/",
				"abstractNote": "Genomes can be organised in different ways. Understanding the extent of the diversity of genome organisation, the processes that create it, and its consequences is particularly important for two key reasons. Firstly, it is relevant for our understanding of the genetic basis for the astounding diversity of life on Earth. Elucidating the mechanisms and processes underlying such diversity has been, and remains, one of the central goals of biological research. Secondly, it helps prepare us for our analysis of new genomes. For example, knowing that plasmids can be circular or linear, we know to check for circularity or linearity in a plasmid we encounter for the first time (if this is relevant for our analysis). This article provides an overview of variation and diversity in several aspects of genome organisation and architecture, including the number, size, ploidy, composition (RNA or DNA), packaging, and topology of the molecules encoding the genome. Additionally, it reviews differences in selected genomic features, i.e. telomeres, centromeres, DNA replication origins, and sex chromosomes. To put this in context, it incorporates a brief survey of organism diversity and the tree of life, and ends with a discussion of mutation mechanisms and inheritance, and explanations of key terms used to describe genomic variation.",
				"date": "2012",
				"DOI": "10.1007/978-1-61779-582-4_2",
				"libraryCatalog": "Springer Link (old)",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.springerlink.com/content/7xqan2jybdv837y9/",
		"items": [
			{
				"itemType": "bookSection",
				"creators": [
					{
						"firstName": "Miriam",
						"lastName": "Allalouf",
						"creatorType": "author"
					},
					{
						"firstName": "Yuval",
						"lastName": "Shavitt",
						"creatorType": "author"
					},
					{
						"firstName": "Josep",
						"lastName": "Solé-Pareta",
						"creatorType": "editor"
					},
					{
						"firstName": "Michael",
						"lastName": "Smirnov",
						"creatorType": "editor"
					},
					{
						"firstName": "Piet",
						"lastName": "Van Mieghem",
						"creatorType": "editor"
					},
					{
						"firstName": "Jordi",
						"lastName": "Domingo-Pascual",
						"creatorType": "editor"
					},
					{
						"firstName": "Edmundo",
						"lastName": "Monteiro",
						"creatorType": "editor"
					},
					{
						"firstName": "Peter",
						"lastName": "Reichl",
						"creatorType": "editor"
					},
					{
						"firstName": "Burkhard",
						"lastName": "Stiller",
						"creatorType": "editor"
					},
					{
						"firstName": "Richard",
						"lastName": "Gibbens",
						"creatorType": "editor"
					}
				],
				"notes": [],
				"tags": [
					"Computer Science"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "SpringerLink Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "SpringerLink Snapshot",
						"mimeType": "text/html"
					}
				],
				"title": "Maximum Flow Routing with Weighted Max-Min Fairness",
				"publicationTitle": "Quality of Service in the Emerging Networking Panorama",
				"series": "Lecture Notes in Computer Science",
				"publisher": "Springer Berlin / Heidelberg",
				"ISBN": "978-3-540-23238-4",
				"pages": "278-287",
				"volume": "3266",
				"url": "http://www.springerlink.com/content/7xqan2jybdv837y9/abstract/",
				"abstractNote": "Max-min is an established fairness criterion for allocating bandwidth for flows. In this work we look at the combined problem of multi-path routing and bandwidth allocation such that the flow allocation for each connection will be maximized and fairness will be maintained. We use the weighted extension of the max-min criterion to allocate bandwidth in proportion to the flows’ demand. Our contribution is an algorithm which, for the first time, solves the combined routing and bandwidth allocation problem for the case where flows are allowed to be splitted along several paths. We use multi commodity flow (MCF) formulation which is solved using linear programming (LP) techniques. These building blocks are used by our algorithm to derive the required optimal routing and allocation.",
				"date": "2004",
				"DOI": "10.1007/978-3-540-30193-6_28",
				"libraryCatalog": "Springer Link (old)",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.springerlink.com/content/q01x257j47005462/",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Denis",
						"lastName": "Hilaire",
						"creatorType": "author"
					},
					{
						"firstName": "Mathias",
						"lastName": "Rotach",
						"creatorType": "author"
					},
					{
						"firstName": "Bernard",
						"lastName": "Clot",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"Earth and Environmental Science"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "SpringerLink Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "SpringerLink Snapshot",
						"mimeType": "text/html"
					}
				],
				"title": "Building models for daily pollen concentrations",
				"publicationTitle": "Aerobiologia",
				"publisher": "Springer Netherlands",
				"ISSN": "0393-5965",
				"pages": "499-513",
				"volume": "28",
				"issue": "4",
				"url": "http://www.springerlink.com/content/q01x257j47005462/abstract/",
				"abstractNote": "We describe a method for constructing prediction models for daily pollen concentrations of several pollen taxa in different measurement sites in Switzerland. The method relies on daily pollen concentration time series that were measured with Hirst samplers. Each prediction is based on the weather conditions observed near the pollen measurement site. For each prediction model, we do model assessment with a test data set spanning several years.",
				"date": "2012",
				"DOI": "10.1007/s10453-012-9252-4",
				"libraryCatalog": "Springer Link (old)",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.springerlink.com/content/978-1-4020-5065-7/#section=476416&page=1",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"firstName": "Liljana",
						"lastName": "Gavrilovska",
						"creatorType": "author"
					},
					{
						"firstName": "Ramjee",
						"lastName": "Prasad",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"title": "Ad Hoc Networking Towards Seamless Communications",
				"series": "Signals and Communication Technology",
				"extra": "DOI: 10.1007/978-1-4020-5066-4",
				"url": "http://www.springerlink.com/content/978-1-4020-5065-7/#section=476416&page=1",
				"libraryCatalog": "Springer Link (old)",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.springerlink.com/reference-works/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.springerlink.com/books/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.springerlink.com/protocols/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.springerlink.com/content/905u225mu8rr70m2",
		"items": [
			{
				"itemType": "bookSection",
				"creators": [
					{
						"firstName": "Jia",
						"lastName": "Yu",
						"creatorType": "author"
					},
					{
						"firstName": "Shie",
						"lastName": "Mannor",
						"creatorType": "author"
					},
					{
						"firstName": "Nahum",
						"lastName": "Shimkin",
						"creatorType": "author"
					},
					{
						"firstName": "Sertan",
						"lastName": "Girgin",
						"creatorType": "editor"
					},
					{
						"firstName": "Manuel",
						"lastName": "Loth",
						"creatorType": "editor"
					},
					{
						"firstName": "Rémi",
						"lastName": "Munos",
						"creatorType": "editor"
					},
					{
						"firstName": "Philippe",
						"lastName": "Preux",
						"creatorType": "editor"
					},
					{
						"firstName": "Daniil",
						"lastName": "Ryabko",
						"creatorType": "editor"
					}
				],
				"notes": [],
				"tags": [
					"Computer Science"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "SpringerLink Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "SpringerLink Snapshot",
						"mimeType": "text/html"
					}
				],
				"title": "Markov Decision Processes with Arbitrary Reward Processes",
				"publicationTitle": "Recent Advances in Reinforcement Learning",
				"series": "Lecture Notes in Computer Science",
				"publisher": "Springer Berlin / Heidelberg",
				"ISBN": "978-3-540-89721-7",
				"pages": "268-281",
				"volume": "5323",
				"url": "http://www.springerlink.com/content/905u225mu8rr70m2/abstract/",
				"abstractNote": "We consider a control problem where the decision maker interacts with a standard Markov decision process with the exception that the reward functions vary arbitrarily over time. We extend the notion of Hannan consistency to this setting, showing that, in hindsight, the agent can perform almost as well as every deterministic policy. We present efficient online algorithms in the spirit of reinforcement learning that ensure that the agent’s performance loss, or regret, vanishes over time, provided that the environment is oblivious to the agent’s actions. However, counterexamples indicate that the regret does not vanish if the environment is not oblivious.",
				"date": "2008",
				"DOI": "10.1007/978-3-540-89722-4_21",
				"libraryCatalog": "Springer Link (old)",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	}
]
/** END TEST CASES **/