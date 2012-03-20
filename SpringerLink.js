{
	"translatorID": "f8765470-5ace-4a31-b4bd-4327b960ccd",
	"label": "SpringerLink",
	"creator": "Sebastian Karcher",
	"target": "https?://[^/]*springerlink\\.(metapress\\.)?com/.+/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcs",
	"lastUpdated": "2012-03-12 23:14:24"
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
		var citationurl = url.replace(/about\/|abstract\/|fulltext\.html|references\/|#.*/, "") + "export-citation";
		getpages(citationurl);
	}
}

function getpages(citationurl) {
	//we work entirely from the citations page
	Z.debug('citationurl: ' + citationurl)
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
	if(item.title) item.title = ZU.capitalizeTitle(ZU.trimInternal(item.title));

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

function scrape(doc) {
	var newurl = doc.location.href;
	var pdfurl = newurl.replace(/export-citation/, "fulltext.pdf");
	var absurl = newurl.replace(/export-citation/, "abstract/");
	var viewstate = encodeURIComponent(ZU.xpathText(doc, '//input[@name="__VIEWSTATE"]/@value'));
	var eventvalidate = encodeURIComponent(ZU.xpathText(doc, '//input[@name="__EVENTVALIDATION"]/@value'));

	Z.debug('eventvalidate: ' + eventvalidate);
	Z.debug('viewstate: ' + viewstate);
	if(!eventvalidate || !viewstate) Z.debug(doc.documentElement.body.innerHTML);

	var get = newurl;
	var post = '__VIEWSTATE=' + viewstate + '&ctl00%24ctl14%24cultureList=en-us&ctl00%24ctl14%24SearchControl%24BasicSearchForTextBox=&ctl00%24ctl14%24SearchControl%24BasicAuthorOrEditorTextBox=&ctl00%24ctl14%24SearchControl%24BasicPublicationTextBox=&ctl00%24ctl14%24SearchControl%24BasicVolumeTextBox=&ctl00%24ctl14%24SearchControl%24BasicIssueTextBox=&ctl00%24ctl14%24SearchControl%24BasicPageTextBox=&ctl00%24ContentPrimary%24ctl00%24ctl00%24Export=AbstractRadioButton&ctl00%24ContentPrimary%24ctl00%24ctl00%24CitationManagerDropDownList=ReferenceManager&ctl00%24ContentPrimary%24ctl00%24ctl00%24ExportCitationButton=Export+Citation&__EVENTVALIDATION=' + eventvalidate;
	Zotero.Utilities.HTTP.doPost(get, post, function (text) {
		Z.debug('Citation Export: ' + text);
		var translator = Zotero.loadTranslator("import");
		// Calling the RIS translator
		translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
		translator.setString(text);
		translator.setHandler("itemDone", function (obj, item) {
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
		translator.translate();
	});
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.springerlink.com/content/q122682q1u2r7282/abstract/",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"lastName": "Schmer",
						"firstName": "Marty",
						"creatorType": "author"
					},
					{
						"lastName": "Mitchell",
						"firstName": "Robert",
						"creatorType": "author"
					},
					{
						"lastName": "Vogel",
						"firstName": "Kenneth",
						"creatorType": "author"
					},
					{
						"lastName": "Schacht",
						"firstName": "Walter",
						"creatorType": "author"
					},
					{
						"lastName": "Marx",
						"firstName": "David",
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
				"date": "2010",
				"publisher": "Springer New York",
				"ISBN": "1939-1234",
				"ISSN": "1939-1234",
				"pages": "243-250",
				"volume": "3",
				"issue": "3",
				"url": "http://www.springerlink.com/content/q122682q1u2r7282/abstract/",
				"DOI": "10.1007/s12155-009-9070-x",
				"abstractNote": "Switchgrass ( Panicum virgatum L.) is being developed as a biofuel feedstock for the United States. Efficient and accurate methods to estimate switchgrass biomass feedstock supply within a production area will be required by biorefineries. Our main objective was to determine the effectiveness of indirect methods for estimating biomass yields and composition of switchgrass fields. Indirect measurements were conducted in eastern Nebraska from 2003 to 2007 in which switchgrass biomass yields were manipulated using three nitrogen rates (0 kg N ha -1 , 60 kg N ha -1 , and 120 kg N ha -1 ) and two harvest periods (August and post-killing frost). A modified Robel pole was used to determine visual obstruction, elongated leaf height, and canopy height measurements. Prediction models from the study showed that elongated leaf height, visual obstruction, and canopy height measurements accounted for &gt; 91%, &gt; 90%, and &gt; 82% of the variation in switchgrass biomass, respectively. Regression slopes were similar by cultivar (“Cave-in-Rock” and “Trailblazer”), harvest period, and across years indicating that a single model is applicable for determining biomass feedstock supply within a region, assuming similar harvesting methods. Sample numbers required to receive the same level of precision were as follows: elongated leaf height&lt;canopy height&lt;visual obstruction. Twenty to 30 elongated leaf height measurements in a field could predict switchgrass biomass yield within 10% of the mean with 95% confidence. Visual obstruction is recommended on switchgrass fields with low to variable stand densities while elongated leaf height measurements would be recommended on switchgrass fields with high, uniform stand densities. Incorporating an ocular device with a Robel pole provided reasonable frequency estimates of switchgrass, broadleaf weeds, and grassy weeds at the field scale.",
				"libraryCatalog": "SpringerLink",
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
						"lastName": "Herold",
						"firstName": "H.",
						"creatorType": "author"
					},
					{
						"lastName": "Pchennikov",
						"firstName": "A.",
						"creatorType": "author"
					},
					{
						"lastName": "Streitenberger",
						"firstName": "M.",
						"creatorType": "author"
					},
					{
						"lastName": "Böllinghaus",
						"firstName": "Thomas",
						"creatorType": "contributor"
					},
					{
						"lastName": "Herold",
						"firstName": "Horst",
						"creatorType": "contributor"
					}
				],
				"notes": [],
				"tags": [
					"Chemistry and Materials Science"
				],
				"seeAlso": [],
				"attachments": [
					{
						"url": "http://www.springerlink.com/content/n66482lu84706725/fulltext.pdf",
						"title": "SpringerLink Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"url": "http://www.springerlink.com/content/n66482lu84706725/abstract/",
						"title": "SpringerLink Snapshot",
						"mimeType": "text/html"
					}
				],
				"title": "Hot Cracking Phenomena in Welds",
				"date": "2005",
				"publisher": "Springer Berlin Heidelberg",
				"ISBN": "978-3-540-27460-5",
				"ISSN": "978-3-540-27460-5",
				"pages": "328-346",
				"url": "http://www.springerlink.com/content/n66482lu84706725/abstract/",
				"DOI": "10.1007/3-540-27460-X_17",
				"abstractNote": "Referring to the ISO standardization of hot cracking test procedures with externally loaded specimens, three different and fundamental test procedures are assessed with the help of experiments and finite element analyses to find out the influence of different deformation rates on the test results of three well known stainless steels.",
				"libraryCatalog": "SpringerLink",
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
				"libraryCatalog": "SpringerLink",
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
						"lastName": "Budd",
						"firstName": "Aidan",
						"creatorType": "author"
					},
					{
						"lastName": "Anisimova",
						"firstName": "Maria",
						"creatorType": "contributor"
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
				"title": "Evolutionary Genomics",
				"series": "Methods in Molecular Biology",
				"date": "2012",
				"publisher": "Humana Press",
				"ISBN": "978-1-61779-582-4",
				"ISSN": "978-1-61779-582-4",
				"pages": "51-76",
				"volume": "855",
				"url": "http://www.springerlink.com/content/u0lh124733784407/abstract/",
				"DOI": "10.1007/978-1-61779-582-4_2",
				"abstractNote": "Genomes can be organised in different ways. Understanding the extent of the diversity of genome organisation, the processes that create it, and its consequences is particularly important for two key reasons. Firstly, it is relevant for our understanding of the genetic basis for the astounding diversity of life on Earth. Elucidating the mechanisms and processes underlying such diversity has been, and remains, one of the central goals of biological research. Secondly, it helps prepare us for our analysis of new genomes. For example, knowing that plasmids can be circular or linear, we know to check for circularity or linearity in a plasmid we encounter for the first time (if this is relevant for our analysis). This article provides an overview of variation and diversity in several aspects of genome organisation and architecture, including the number, size, ploidy, composition (RNA or DNA), packaging, and topology of the molecules encoding the genome. Additionally, it reviews differences in selected genomic features, i.e. telomeres, centromeres, DNA replication origins, and sex chromosomes. To put this in context, it incorporates a brief survey of organism diversity and the tree of life, and ends with a discussion of mutation mechanisms and inheritance, and explanations of key terms used to describe genomic variation.",
				"libraryCatalog": "SpringerLink",
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
						"lastName": "Allalouf",
						"firstName": "Miriam",
						"creatorType": "author"
					},
					{
						"lastName": "Shavitt",
						"firstName": "Yuval",
						"creatorType": "author"
					},
					{
						"lastName": "Solé-Pareta",
						"firstName": "Josep",
						"creatorType": "contributor"
					},
					{
						"lastName": "Smirnov",
						"firstName": "Michael",
						"creatorType": "contributor"
					},
					{
						"lastName": "Van Mieghem",
						"firstName": "Piet",
						"creatorType": "contributor"
					},
					{
						"lastName": "Domingo-Pascual",
						"firstName": "Jordi",
						"creatorType": "contributor"
					},
					{
						"lastName": "Monteiro",
						"firstName": "Edmundo",
						"creatorType": "contributor"
					},
					{
						"lastName": "Reichl",
						"firstName": "Peter",
						"creatorType": "contributor"
					},
					{
						"lastName": "Stiller",
						"firstName": "Burkhard",
						"creatorType": "contributor"
					},
					{
						"lastName": "Gibbens",
						"firstName": "Richard",
						"creatorType": "contributor"
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
				"title": "Quality of Service in the Emerging Networking Panorama",
				"series": "Lecture Notes in Computer Science",
				"date": "2004",
				"publisher": "Springer Berlin / Heidelberg",
				"ISBN": "978-3-540-23238-4",
				"ISSN": "978-3-540-23238-4",
				"pages": "278-287",
				"volume": "3266",
				"url": "http://www.springerlink.com/content/7xqan2jybdv837y9/abstract/",
				"DOI": "10.1007/978-3-540-30193-6_28",
				"abstractNote": "Max-min is an established fairness criterion for allocating bandwidth for flows. In this work we look at the combined problem of multi-path routing and bandwidth allocation such that the flow allocation for each connection will be maximized and fairness will be maintained. We use the weighted extension of the max-min criterion to allocate bandwidth in proportion to the flows’ demand. Our contribution is an algorithm which, for the first time, solves the combined routing and bandwidth allocation problem for the case where flows are allowed to be splitted along several paths. We use multi commodity flow (MCF) formulation which is solved using linear programming (LP) techniques. These building blocks are used by our algorithm to derive the required optimal routing and allocation.",
				"libraryCatalog": "SpringerLink",
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
						"lastName": "Hilaire",
						"firstName": "Denis",
						"creatorType": "author"
					},
					{
						"lastName": "Rotach",
						"firstName": "Mathias",
						"creatorType": "author"
					},
					{
						"lastName": "Clot",
						"firstName": "Bernard",
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
				"ISBN": "0393-5965",
				"ISSN": "0393-5965",
				"pages": "1-15",
				"url": "http://www.springerlink.com/content/q01x257j47005462/abstract/",
				"DOI": "10.1007/s10453-012-9252-4",
				"abstractNote": "We describe a method for constructing prediction models for daily pollen concentrations of several pollen taxa in different measurement sites in Switzerland. The method relies on daily pollen concentration time series that were measured with Hirst samplers. Each prediction is based on the weather conditions observed near the pollen measurement site. For each prediction model, we do model assessment with a test data set spanning several years.",
				"libraryCatalog": "SpringerLink",
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
				"libraryCatalog": "SpringerLink",
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
	}
]
/** END TEST CASES **/