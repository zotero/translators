{
	"translatorID": "48d3b115-7e09-4134-ad5d-0beda6296761",
	"label": "AIP",
	"creator": "Aurimas Vinckevicius",
	"target": "^http://scitation\\.aip\\.org/(?:search\\?|content/)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2013-10-20 03:35:19"
}

function getSearchResults(doc) {
	return doc.getElementsByClassName("resultItem");
}

function detectWeb(doc, url) {
	if(url.indexOf('search') !== -1 && getSearchResults(doc).length) {
		return 'multiple';
	}
	
	if(ZU.xpathText(doc, '/html/head/meta[@name="citation_journal_title"]/@content')
		|| doc.body.id == 'conferencepaper') {
		return 'journalArticle';
	}
}
function doWeb(doc, url) {
	if(detectWeb(doc, url) == 'multiple') {
		var results = getSearchResults(doc);
		var items = {};
		for(var i=0, n=results.length; i<n; i++) {
			var title = ZU.xpath(results[i], './/div[@class="title"]/a')[0];
			items[title.href] = ZU.trimInternal(title.textContent);
		}
		
		Z.selectItems(items, function(selectedItems) {
			if(!selectedItems) return true;
			
			var urls = [];
			for(var i in selectedItems) {
				urls.push(i);
			}
			
			ZU.processDocuments(urls, scrape);
		})
	} else {
		scrape(doc, url);
	}
}

function scrape(doc, url) {
	//use Embedded Metadata
	var translator = Z.loadTranslator('web');
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	
	translator.setHandler('itemDone', function(obj, item) {
		//for conference papers, we're missing some metadata
		if(!item.publicationTitle
			&& ZU.xpath(doc, '//div[@id="breadcrumb"]/a[@title="Link to conference proceedings"]').length) {
			item.publicationTitle = "AIP Conference Proceedings";
			item.volume = ZU.xpathText(doc, '//div[@class="itemCitation"]//span[@class="citationvolume"]');
		}
		
		var pdf = ZU.xpath(doc, '//li[@class="pdf"]/a[@class="pdf" and @href]')[0];
		if(pdf) {
			item.attachments.push({
				title: "Full Text PDF",
				url: pdf.href,
				mimeType: 'application/pdf'
			});
		}
		
		var keywords = ZU.xpath(doc, '//div[@class="keywords-container"]//dt/a');
		var tags = [];
		for(var i=0, n=keywords.length; i<n; i++) {
			tags.push(ZU.trimInternal(keywords[i].textContent));
		}
		if(tags.length) {
			item.tags = tags;
		}
		
		item.complete();
	});
	
	translator.translate();
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://scitation.aip.org/content/aip/journal/aplmater/1/2/10.1063/1.4818002",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Ian",
						"lastName": "MacLaren",
						"creatorType": "author"
					},
					{
						"firstName": "LiQiu",
						"lastName": "Wang",
						"creatorType": "author"
					},
					{
						"firstName": "Owen",
						"lastName": "Morris",
						"creatorType": "author"
					},
					{
						"firstName": "Alan J.",
						"lastName": "Craven",
						"creatorType": "author"
					},
					{
						"firstName": "Robert L.",
						"lastName": "Stamps",
						"creatorType": "author"
					},
					{
						"firstName": "Bernhard",
						"lastName": "Schaffer",
						"creatorType": "author"
					},
					{
						"firstName": "Quentin M.",
						"lastName": "Ramasse",
						"creatorType": "author"
					},
					{
						"firstName": "Shu",
						"lastName": "Miao",
						"creatorType": "author"
					},
					{
						"firstName": "Kambiz",
						"lastName": "Kalantari",
						"creatorType": "author"
					},
					{
						"firstName": "Iasmi",
						"lastName": "Sterianou",
						"creatorType": "author"
					},
					{
						"firstName": "Ian M.",
						"lastName": "Reaney",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"Antiferroelectricity",
					"Dielectric oxides",
					"Iron group ions",
					"Image reconstruction",
					"Ozone",
					"Electron energy loss spectroscopy",
					"Nanorods",
					"Crystal structure",
					"Ferroelectricity",
					"Optical aberrations"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Snapshot"
					},
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"title": "Local stabilisation of polar order at charged antiphase boundaries in antiferroelectric (Bi<sub>0.85</sub>Nd<sub>0.15</sub>)(Ti<sub>0.1</sub>Fe<sub>0.9</sub>)O<sub>3</sub>",
				"publisher": "AIP Publishing",
				"institution": "American Institute of Physics",
				"company": "American Institute of Physics",
				"label": "American Institute of Physics",
				"distributor": "American Institute of Physics",
				"date": "2013/08/13",
				"reportType": "Text",
				"letterType": "Text",
				"manuscriptType": "Text",
				"mapType": "Text",
				"thesisType": "Text",
				"websiteType": "Text",
				"presentationType": "Text",
				"postType": "Text",
				"audioFileType": "Text",
				"publicationTitle": "APL Materials",
				"volume": "1",
				"issue": "2",
				"abstractNote": "Observation of an unusual, negatively-charged antiphase boundary in (Bi0.85Nd0.15)(Ti0.1Fe0.9)O3 is reported. Aberration corrected scanning transmission electron microscopy is used to establish the full three dimensional structure of this boundary including O-ion positions to ∼±10 pm. The charged antiphase boundary stabilises tetragonally distorted regions with a strong polar ordering to either side of the boundary, with a characteristic length scale determined by the excess charge trapped at the boundary. Far away from the boundary the crystal relaxes into the well-known Nd-stabilised antiferroelectric phase.",
				"DOI": "10.1063/1.4818002",
				"pages": "021102",
				"ISSN": "2166-532X",
				"url": "http://scitation.aip.org/content/aip/journal/aplmater/1/2/10.1063/1.4818002",
				"libraryCatalog": "scitation.aip.org",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://scitation.aip.org/content/aip/proceeding/aipcp/10.1063/1.4756630",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "S.",
						"lastName": "Št'astník",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"Insulator surfaces",
					"Numerical analysis",
					"Surface finishing",
					"Advanced materials",
					"Materials science",
					"Number theory",
					"Radiative heat transfer",
					"Thermal analysis",
					"Thermal nonlinear materials"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Snapshot"
					}
				],
				"title": "Evaluation of thermal resistance of building insulations with reflective surfaces",
				"publisher": "American Institute of Physics",
				"institution": "American Institute of Physics",
				"company": "American Institute of Physics",
				"label": "American Institute of Physics",
				"distributor": "American Institute of Physics",
				"date": "2012/09/26",
				"reportType": "Text",
				"letterType": "Text",
				"manuscriptType": "Text",
				"mapType": "Text",
				"thesisType": "Text",
				"websiteType": "Text",
				"presentationType": "Text",
				"postType": "Text",
				"audioFileType": "Text",
				"abstractNote": "The thermal resistance of advanced insulation materials, applied namely in civil engineering, containing reflective surfaces and air gaps, cannot be evaluated correctly using the valid European standards because of presence of the dominant nonlinear radiative heat transfer and other phenomena not included in the recommended computational formulae. The proper general physical analysis refers to rather complicated problems from classical thermodynamics, whose both existence theory and numerical analysis contain open questions and cannot be done in practice when the optimization of composition of insulation layers is required. This paper, coming from original experimental results, demonstrates an alternative simplified computational approach, taking into account the most important physical processes, useful in the design of modern insulation systems.",
				"DOI": "10.1063/1.4756630",
				"pages": "2204-2207",
				"url": "http://scitation.aip.org/content/aip/proceeding/aipcp/10.1063/1.4756630",
				"libraryCatalog": "scitation.aip.org",
				"accessDate": "CURRENT_TIMESTAMP",
				"publicationTitle": "AIP Conference Proceedings",
				"volume": "1479"
			}
		]
	},
	{
		"type": "web",
		"url": "http://scitation.aip.org/search?value1=insulation&option1=all&option12=resultCategory&value12=ResearchPublicationContent",
		"items": "multiple"
	}
]
/** END TEST CASES **/