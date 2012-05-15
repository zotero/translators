{
	"translatorID": "dfec8317-9b59-4cc5-8771-cdcef719d171",
	"label": "Springer Science+Business Media",
	"creator": "Aurimas Vinckevicius",
	"target": "^https?://[^/]+/(content/\\d+/\\d+/\\d+|search/results)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 250,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsbv",
	"lastUpdated": "2012-05-13 00:31:15"
}

/*
Springer Open Translator
Copyright (C) 2011 Aurimas Vinckevicius

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

function getItems(doc, url) {
	//Since you can perform a cross-site search, make sure we have links that
	//we can scrape
	var host = url.match(/^http:\/\/(?:[^/]+\.)?([^\.\/]+\.[^\.\/]+)(?:\/|$)/i);
	if(!host) return;
	host = host[1];

	return ZU.xpath(doc, '//table[@id="articles-list"]\
					//p[.//strong/a[contains(@href,"' + host + '/")]]\
					[not(.//span[@class="article-title"])]');
}

function scrape(doc) {
	var translator = Zotero.loadTranslator("web");
	//embedded metadata
	translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
	translator.setDocument(doc);

	translator.setHandler("itemDone", function(obj, item) {
		item.abstractNote = item.extra;
		delete item.extra;

		//sometimes there's no url specified in the meta tags,
		//only og:url, which is for the website.
		//In that case, include current url
		if(!item.url.match(/[^\/]\/[^\/]/))
			item.url = doc.location.href;

		//keywords
		var keywords = ZU.xpathText(doc, '//*[@id="keywords"]/text()', null, '; ');
		if(keywords) {
			item.tags = ZU.trimInternal(keywords).replace(/(^;\s*|\s*;$)/g,'')
							.split(/;\s*/);
		}

		item.complete();
	});

	translator.translate();
}

function detectWeb(doc, url) {
	var hostDB = ZU.xpathText(doc,'(//li[@id="SPR" or @id="BMC" or @id="CC"])[1]\
									/a/@href');
	if(hostDB) hostDB = hostDB.toLowerCase().replace(/^\s*https?:\/\//,'')
						.replace(/[^a-z]*$/,'');

	switch(hostDB) {
		case 'www.springeropen.com':
		case 'www.biomedcentral.com':
		case 'www.chemistrycentral.com':
			break;
		default:
			return;
	}

	//This should only include journals
	var title = ZU.xpathText(doc, '//meta[@name="citation_title"]/@content');
	if(title && title.trim()) {
		return 'journalArticle';
	}

	if(getItems(doc, url).length) {
		return 'multiple';
	}
}

function doWeb(doc, url) {
	if(detectWeb(doc, url) == 'multiple') {
		Zotero.selectItems( ZU.getItemArray(doc, getItems(doc, url) ),
						function(selectedItems) {
			if(!selectedItems) return true;

			var urls = new Array();
			for(var i in selectedItems) {
				urls.push(i);
			}

			ZU.processDocuments(urls, scrape);
		});
	} else {
		scrape(doc);
	}
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.journalofinequalitiesandapplications.com/content/2011/1/53",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Abasalt",
						"lastName": "Bodaghi",
						"creatorType": "author"
					},
					{
						"firstName": "Idham A.",
						"lastName": "Alias",
						"creatorType": "author"
					},
					{
						"firstName": "Mohammad H.",
						"lastName": "Ghahramani",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"cubic functional equation",
					"multiplier",
					"Hyers-Ulam stability",
					"Superstability"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
					}
				],
				"itemID": "http://www.journalofinequalitiesandapplications.com/content/2011/1/53",
				"title": "Approximately cubic functional equations and cubic multipliers",
				"publicationTitle": "Journal of Inequalities and Applications",
				"rights": "2011 Bodaghi et al; licensee Springer.",
				"volume": "2011",
				"issue": "1",
				"number": "1",
				"patentNumber": "1",
				"pages": "53",
				"publisher": "Springer",
				"institution": "Springer",
				"company": "Springer",
				"label": "Springer",
				"distributor": "Springer",
				"date": "2011-09-13",
				"DOI": "10.1186/1029-242X-2011-53",
				"ISSN": "1029-242X",
				"url": "http://www.journalofinequalitiesandapplications.com/content/2011/1/53",
				"abstractNote": "In this paper, we prove the Hyers-Ulam stability and the superstability for cubic functional equation by using the fixed point alternative theorem. As a consequence, we show that the cubic multipliers are superstable under some conditions.",
				"reportType": "Research",
				"letterType": "Research",
				"manuscriptType": "Research",
				"mapType": "Research",
				"thesisType": "Research",
				"websiteType": "Research",
				"presentationType": "Research",
				"postType": "Research",
				"audioFileType": "Research",
				"language": "en",
				"accessDate": "CURRENT_TIMESTAMP",
				"libraryCatalog": "www.journalofinequalitiesandapplications.com"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.nanoscalereslett.com/content/6/1/530/abstract",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Haiyan",
						"lastName": "Chen",
						"creatorType": "author"
					},
					{
						"firstName": "Yixuan",
						"lastName": "Zhang",
						"creatorType": "author"
					},
					{
						"firstName": "Yanling",
						"lastName": "Lu",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"potassium niobate",
					"crystal structure",
					"phase transition",
					"nanoscale powder."
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Snapshot"
					}
				],
				"itemID": "http://www.nanoscalereslett.com/content/6/1/530/abstract",
				"title": "Nanoscale potassium niobate crystal structure and phase transition",
				"publicationTitle": "Nanoscale Research Letters",
				"rights": "2011 Chen et al; licensee Springer.",
				"volume": "6",
				"issue": "1",
				"number": "1",
				"patentNumber": "1",
				"pages": "530",
				"publisher": "Springer",
				"institution": "Springer",
				"company": "Springer",
				"label": "Springer",
				"distributor": "Springer",
				"date": "2011-09-23",
				"DOI": "10.1186/1556-276X-6-530",
				"ISSN": "1556-276X",
				"url": "http://www.nanoscalereslett.com/content/6/1/530/abstract",
				"abstractNote": "Nanoscale potassium niobate (KNbO3) powders of orthorhombic structure were synthesized using the sol-gel method. The heat-treatment temperature of the gels had a pronounced effect on KNbO3 particle size and morphology. Field emission scanning electron microscopy and transmission electron microscopy were used to determine particle size and morphology. The average KNbO3 grain size was estimated to be less than 100 nm, and transmission electron microscopy images indicated that KNbO3 particles had a brick-like morphology. Synchrotron X-ray diffraction was used to identify the room-temperature structures using Rietveld refinement. The ferroelectric orthorhombic phase was retained even for particles smaller than 50 nm. The orthorhombic to tetragonal and tetragonal to cubic phase transitions of nanocrystalline KNbO3 were investigated using temperature-dependent powder X-ray diffraction. Differential scanning calorimetry was used to examine the temperature dependence of KNbO3 phase transition. The Curie temperature and phase transition were independent of particle size, and Rietveld analyses showed increasing distortions with decreasing particle size.",
				"reportType": "Nano Express",
				"letterType": "Nano Express",
				"manuscriptType": "Nano Express",
				"mapType": "Nano Express",
				"thesisType": "Nano Express",
				"websiteType": "Nano Express",
				"presentationType": "Nano Express",
				"postType": "Nano Express",
				"audioFileType": "Nano Express",
				"language": "en",
				"accessDate": "CURRENT_TIMESTAMP",
				"libraryCatalog": "www.nanoscalereslett.com"
			}
		]
	},
	{
		"type": "web",
		"url": "http://jwcn.eurasipjournals.com/search/results?terms=project",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://respiratory-research.com/search/results?terms=cells",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://respiratory-research.com/content/11/1/133",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Zbigniew",
						"lastName": "Mikulski",
						"creatorType": "author"
					},
					{
						"firstName": "Petra",
						"lastName": "Hartmann",
						"creatorType": "author"
					},
					{
						"firstName": "Gitte",
						"lastName": "Jositsch",
						"creatorType": "author"
					},
					{
						"firstName": "Zbigniew",
						"lastName": "Zasłona",
						"creatorType": "author"
					},
					{
						"firstName": "Katrin S.",
						"lastName": "Lips",
						"creatorType": "author"
					},
					{
						"firstName": "Uwe",
						"lastName": "Pfeil",
						"creatorType": "author"
					},
					{
						"firstName": "Hjalmar",
						"lastName": "Kurzen",
						"creatorType": "author"
					},
					{
						"firstName": "Jürgen",
						"lastName": "Lohmeyer",
						"creatorType": "author"
					},
					{
						"firstName": "Wolfgang G.",
						"lastName": "Clauss",
						"creatorType": "author"
					},
					{
						"firstName": "Veronika",
						"lastName": "Grau",
						"creatorType": "author"
					},
					{
						"firstName": "Martin",
						"lastName": "Fronius",
						"creatorType": "author"
					},
					{
						"firstName": "Wolfgang",
						"lastName": "Kummer",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
					}
				],
				"itemID": "http://respiratory-research.com/content/11/1/133",
				"title": "Nicotinic receptors on rat alveolar macrophages dampen ATP-induced increase in cytosolic calcium concentration",
				"publicationTitle": "Respiratory Research",
				"rights": "2010 Mikulski et al; licensee BioMed Central Ltd.",
				"volume": "11",
				"issue": "1",
				"number": "1",
				"patentNumber": "1",
				"pages": "133",
				"publisher": "BioMed Central Ltd",
				"institution": "BioMed Central Ltd",
				"company": "BioMed Central Ltd",
				"label": "BioMed Central Ltd",
				"distributor": "BioMed Central Ltd",
				"date": "2010-09-29",
				"DOI": "10.1186/1465-9921-11-133",
				"ISSN": "1465-9921",
				"reportType": "Research",
				"letterType": "Research",
				"manuscriptType": "Research",
				"mapType": "Research",
				"thesisType": "Research",
				"websiteType": "Research",
				"presentationType": "Research",
				"postType": "Research",
				"audioFileType": "Research",
				"language": "en",
				"abstractNote": "Nicotinic acetylcholine receptors (nAChR) have been identified on a variety of cells of the immune system and are generally considered to trigger anti-inflammatory events. In the present study, we determine the nAChR inventory of rat alveolar macrophages (AM), and investigate the cellular events evoked by stimulation with nicotine.",
				"url": "http://respiratory-research.com/content/11/1/133",
				"accessDate": "CURRENT_TIMESTAMP",
				"libraryCatalog": "respiratory-research.com"
			}
		]
	},
	{
		"type": "web",
		"url": "http://journal.chemistrycentral.com/content/5/1/5",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Stephen J.",
						"lastName": "Crozier",
						"creatorType": "author"
					},
					{
						"firstName": "Amy G.",
						"lastName": "Preston",
						"creatorType": "author"
					},
					{
						"firstName": "Jeffrey W.",
						"lastName": "Hurst",
						"creatorType": "author"
					},
					{
						"firstName": "Mark J.",
						"lastName": "Payne",
						"creatorType": "author"
					},
					{
						"firstName": "Julie",
						"lastName": "Mann",
						"creatorType": "author"
					},
					{
						"firstName": "Larry",
						"lastName": "Hainly",
						"creatorType": "author"
					},
					{
						"firstName": "Debra L.",
						"lastName": "Miller",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
					}
				],
				"itemID": "http://journal.chemistrycentral.com/content/5/1/5",
				"title": "Cacao seeds are a",
				"publicationTitle": "Chemistry Central Journal",
				"rights": "2011 Crozier et al",
				"volume": "5",
				"issue": "1",
				"number": "1",
				"patentNumber": "1",
				"pages": "5",
				"publisher": "Chemistry Central Ltd",
				"institution": "Chemistry Central Ltd",
				"company": "Chemistry Central Ltd",
				"label": "Chemistry Central Ltd",
				"distributor": "Chemistry Central Ltd",
				"date": "2011-02-07",
				"DOI": "10.1186/1752-153X-5-5",
				"ISSN": "1752-153X",
				"reportType": "Research article",
				"letterType": "Research article",
				"manuscriptType": "Research article",
				"mapType": "Research article",
				"thesisType": "Research article",
				"websiteType": "Research article",
				"presentationType": "Research article",
				"postType": "Research article",
				"audioFileType": "Research article",
				"language": "en",
				"abstractNote": "Numerous popular media sources have developed lists of",
				"url": "http://journal.chemistrycentral.com/content/5/1/5",
				"accessDate": "CURRENT_TIMESTAMP",
				"libraryCatalog": "journal.chemistrycentral.com"
			}
		]
	}
]
/** END TEST CASES **/