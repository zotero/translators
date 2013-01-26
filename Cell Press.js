{
	"translatorID": "f26cfb71-efd7-47ae-a28c-d4d8852096bd",
	"label": "Cell Press",
	"creator": "Michael Berkowitz, Sebastian Karcher, Aurimas Vinckevicius",
	"target": "^https?://([^/]*\\.)?cell\\.com",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2013-01-25 22:40:39"
}

/*
Cell Journals Translator
Copyright (C) 2011 Sebastian Karcher and Aurimas Vinckevicius

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
	if(ZU.xpathText(doc, '//meta[@name="citation_journal_title"]/@content')) {
		return 'journalArticle';
	} else if(url.indexOf('searchresults?') != -1 &&
		ZU.xpath(doc, '//table[@id="search_results"]\
			//a[contains(@href, "abstract") or contains(@href, "fulltext")]') ) {
		return 'multiple';
	}
}

function scrape(doc, url) {
	//use Embedded Metadata
	var translator = Zotero.loadTranslator('web');
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);

	translator.setHandler('itemDone', function(obj, item) {
		//occasionally creators are not supplied,
		//but we can get them from the page
		if(!item.creators.length) {
			var creators = ZU.xpath(doc, '//div[@id="article_meta"]\
								//p[./a[starts-with(@href,"mailto:")]]/strong');
			for(var i=0, n=creators.length; i<n; i++) {
				item.creators.push(
					ZU.cleanAuthor(creators[i].textContent, 'author'));
			}
		}

		var abstractDiv = doc.getElementById('main_fulltext_content');
		var abstract;
		if(abstractDiv) abstract = ZU.xpathText(abstractDiv, './div[@class="abstract"]//li[@class="summarySubSectionText"]', null, '\n');
		if(!abstract) {
			abstractDiv = doc.getElementById('summaryHighlightWrapper') || doc.getElementById('summaryHolder');
			if(abstractDiv) {
				abstract = ZU.xpathText(abstractDiv, './h4[normalize-space(text())="Summary"]/following-sibling::p', null, '\n');
			}
		}
		if(abstract) {
			item.abstractNote = abstract;
		}

		//fetch direct PDF link (ScienceDirect)
		var pdfUrl;
		for(var i=0, n=item.attachments.length; i<n; i++) {
			if(item.attachments[i].mimeType &&
				item.attachments[i].mimeType == 'application/pdf') {
				pdfUrl = item.attachments[i].url;
				//delete attachment
				item.attachments.splice(i,1);
				n--;
				i--;
			}
		}
		if(pdfUrl) {
			ZU.doGet(pdfUrl, function(text) {
				if(text.indexOf('onload="javascript:redirectToScienceURL();"') != -1) {
					var m = text.match(/value\s*=\s*"([^"]+)"/);
					if(m) {
						pdfUrl = m[1];
					}
				} else if(text.indexOf('onload="javascript:trackPDFDownload();"') != -1) {
					pdfUrl += (pdfUrl.indexOf('?') != -1 ? '&' : '?') +
								'intermediate=true';
				}
				item.attachments.push({
					title: 'Full Text PDF',
					url: pdfUrl,
					mimeType: 'application/pdf'
				});
				item.complete();
			});
		} else {
			item.complete();
		}
	});

	translator.translate();
}

function doWeb(doc, url) {
	if(detectWeb(doc, url) == 'multiple') {
		var res = ZU.xpath(doc,'//table[@id="search_results"]\
									//tr[contains(@class, "shade")]');
		var url, items = new Object();
		for(var i=0, n=res.length; i<n; i++) {
			url = ZU.xpathText(res[i], './/a[contains(@href, "abstract")\
									or contains(@href, "fulltext")][1]/@href');
			if(url) {
				items[url] = ZU.xpathText(res[i], './/strong');
			}
		}

		Zotero.selectItems(items, function(selectedItems) {
			if(!selectedItems) return true;

			var urls = new Array();
			for(var i in selectedItems) {
				urls.push(i);
			}
			ZU.processDocuments(i, scrape);
		});
	} else {
		scrape(doc, url);
	}
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.cell.com/searchresults?searchText=brain&submit_search=Search&searchBy=fulltext",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.cell.com/abstract/S0092-8674(11)00581-2",
		"defer": true,
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Daniel",
						"lastName": "Zwilling",
						"creatorType": "author"
					},
					{
						"firstName": "Shao-Yi",
						"lastName": "Huang",
						"creatorType": "author"
					},
					{
						"firstName": "Korrapati V.",
						"lastName": "Sathyasaikumar",
						"creatorType": "author"
					},
					{
						"firstName": "Francesca M.",
						"lastName": "Notarangelo",
						"creatorType": "author"
					},
					{
						"firstName": "Paolo",
						"lastName": "Guidetti",
						"creatorType": "author"
					},
					{
						"firstName": "Hui-Qiu",
						"lastName": "Wu",
						"creatorType": "author"
					},
					{
						"firstName": "Jason",
						"lastName": "Lee",
						"creatorType": "author"
					},
					{
						"firstName": "Jennifer",
						"lastName": "Truong",
						"creatorType": "author"
					},
					{
						"firstName": "Yaisa",
						"lastName": "Andrews-Zwilling",
						"creatorType": "author"
					},
					{
						"firstName": "Eric W.",
						"lastName": "Hsieh",
						"creatorType": "author"
					},
					{
						"firstName": "Jamie Y.",
						"lastName": "Louie",
						"creatorType": "author"
					},
					{
						"firstName": "Tiffany",
						"lastName": "Wu",
						"creatorType": "author"
					},
					{
						"firstName": "Kimberly",
						"lastName": "Scearce-Levie",
						"creatorType": "author"
					},
					{
						"firstName": "Christina",
						"lastName": "Patrick",
						"creatorType": "author"
					},
					{
						"firstName": "Anthony",
						"lastName": "Adame",
						"creatorType": "author"
					},
					{
						"firstName": "Flaviano",
						"lastName": "Giorgini",
						"creatorType": "author"
					},
					{
						"firstName": "Saliha",
						"lastName": "Moussaoui",
						"creatorType": "author"
					},
					{
						"firstName": "Grit",
						"lastName": "Laue",
						"creatorType": "author"
					},
					{
						"firstName": "Arash",
						"lastName": "Rassoulpour",
						"creatorType": "author"
					},
					{
						"firstName": "Gunnar",
						"lastName": "Flik",
						"creatorType": "author"
					},
					{
						"firstName": "Yadong",
						"lastName": "Huang",
						"creatorType": "author"
					},
					{
						"firstName": "Joseph M.",
						"lastName": "Muchowski",
						"creatorType": "author"
					},
					{
						"firstName": "Eliezer",
						"lastName": "Masliah",
						"creatorType": "author"
					},
					{
						"firstName": "Robert",
						"lastName": "Schwarcz",
						"creatorType": "author"
					},
					{
						"firstName": "Paul J.",
						"lastName": "Muchowski",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
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
				"title": "Kynurenine 3-Monooxygenase Inhibition in Blood Ameliorates Neurodegeneration",
				"date": "June 10 2011",
				"publicationTitle": "Cell",
				"volume": "145",
				"issue": "6",
				"publisher": "Elsevier",
				"DOI": "10.1016/j.cell.2011.05.020",
				"pages": "863-874",
				"ISSN": "0092-8674",
				"url": "http://www.cell.com/abstract/S0092-8674(11)00581-2",
				"accessDate": "CURRENT_TIMESTAMP",
				"libraryCatalog": "www.cell.com",
				"abstractNote": "Metabolites in the kynurenine pathway, generated by tryptophan degradation, are thought to play an important role in neurodegenerative disorders, including Alzheimer's and Huntington's diseases. In these disorders, glutamate receptor-mediated excitotoxicity and free radical formation have been correlated with decreased levels of the neuroprotective metabolite kynurenic acid. Here, we describe the synthesis and characterization of JM6, a small-molecule prodrug inhibitor of kynurenine 3-monooxygenase (KMO). Chronic oral administration of JM6 inhibits KMO in the blood, increasing kynurenic acid levels and reducing extracellular glutamate in the brain. In a transgenic mouse model of Alzheimer's disease, JM6 prevents spatial memory deficits, anxiety-related behavior, and synaptic loss. JM6 also extends life span, prevents synaptic loss, and decreases microglial activation in a mouse model of Huntington's disease. These findings support a critical link between tryptophan metabolism in the blood and neurodegeneration, and they provide a foundation for treatment of neurodegenerative diseases."
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.cell.com/trends/ecology-evolution/searchresults?searchText=brain&submit_search=Search&searchBy=fulltext",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.cell.com/trends/ecology-evolution/abstract/S0169-5347(12)00002-X",
		"defer": true,
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Nichola J.",
						"lastName": "Raihani",
						"creatorType": "author"
					},
					{
						"firstName": "Alex",
						"lastName": "Thornton",
						"creatorType": "author"
					},
					{
						"firstName": "Redouan",
						"lastName": "Bshary",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
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
				"title": "Punishment and cooperation in nature",
				"date": "May 01 2012",
				"publicationTitle": "Trends in Ecology & Evolution",
				"volume": "27",
				"issue": "5",
				"publisher": "Elsevier",
				"DOI": "10.1016/j.tree.2011.12.004",
				"pages": "288-295",
				"ISSN": "0169-5347",
				"url": "http://www.cell.com/trends/ecology-evolution/abstract/S0169-5347(12)00002-X",
				"accessDate": "CURRENT_TIMESTAMP",
				"libraryCatalog": "www.cell.com",
				"abstractNote": "Humans use punishment to promote cooperation in laboratory experiments but evidence that punishment plays a similar role in non-human animals is comparatively rare. In this article, we examine why this may be the case by reviewing evidence from both laboratory experiments on humans and ecologically relevant studies on non-human animals. Generally, punishment appears to be most probable if players differ in strength or strategic options. Although these conditions are common in nature, punishment (unlike other forms of aggression) involves immediate payoff reductions to both punisher and target, with net benefits to punishers contingent on cheats behaving more cooperatively in future interactions. In many cases, aggression yielding immediate benefits may suffice to deter cheats and might explain the relative scarcity of punishment in nature."
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.cell.com/abstract/S0092-8674(05)00554-4",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Xialu",
						"lastName": "Li",
						"creatorType": "author"
					},
					{
						"firstName": "James L.",
						"lastName": "Manley",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
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
				"title": "Inactivation of the SR Protein Splicing Factor ASF/SF2 Results in Genomic Instability",
				"date": "August 12 2005",
				"publicationTitle": "Cell",
				"volume": "122",
				"issue": "3",
				"publisher": "Elsevier",
				"DOI": "10.1016/j.cell.2005.06.008",
				"pages": "365-378",
				"ISSN": "0092-8674",
				"url": "http://www.cell.com/abstract/S0092-8674(05)00554-4",
				"accessDate": "CURRENT_TIMESTAMP",
				"libraryCatalog": "www.cell.com",
				"abstractNote": "SR proteins constitute a family of pre-mRNA splicing factors now thought to play several roles in mRNA metabolism in metazoan cells. Here we provide evidence that a prototypical SR protein, ASF/SF2, is unexpectedly required for maintenance of genomic stability. We first show that in vivo depletion of ASF/SF2 results in a hypermutation phenotype likely due to DNA rearrangements, reflected in the rapid appearance of DNA double-strand breaks and high-molecular-weight DNA fragments. Analysis of DNA from ASF/SF2-depleted cells revealed that the nontemplate strand of a transcribed gene was single stranded due to formation of an RNA:DNA hybrid, R loop structure. Stable overexpression of RNase H suppressed the DNA-fragmentation and hypermutation phenotypes. Indicative of a direct role, ASF/SF2 prevented R loop formation in a reconstituted in vitro transcription reaction. Our results support a model by which recruitment of ASF/SF2 to nascent transcripts by RNA polymerase II prevents formation of mutagenic R loop structures."
			}
		]
	}
]
/** END TEST CASES **/