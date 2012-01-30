{
	"translatorID": "1a3e63b2-0adf-4c8e-928b-c58c2594b45d",
	"label": "BioMed Central and More",
	"creator": "Ben Parr and Avram Lyon",
	"target": "^https?://[^/]*(jcheminf|jcmr-online|respiratory-research|bio-diglib|nuclear-receptor|medimmunol|kinetoplastids|filariajournal|cellandchromosome|actavetscand|aidsrestherapy|almob|ann-clinmicrob|annals-general-psychiatry|asir-journal|arthritis-research|apfmj|anzhealthpolicy|behavioralandbrainfunctions|biodatamining|biology-direct|biomagres|biomedical-engineering-online|bpsmedicine|biotechnologyforbiofuels|biomedcentral|breast-cancer-research|cancerci|cbmjournal|cardiab|cardiovascularultrasound|casesjournal|lipidsignaling.cbdjournals|biosignaling|celldiv|cerebrospinalfluidresearch|journal.chemistrycentral|capmh|cmjournal|chiroandosteo|clinicalmolecularallergy|cpementalhealth|comparative-hepatology|conflictandhealth|resource-allocation|coughjournal|ccforum|cytojournal|diagnosticpathology|dynamic-med|ete-online|ehjournal|epi-perspectives|epigeneticsandchromatin|fibrogenesis|frontiersinzoology|gvt-journal|genomebiology|genomemedicine|geochemicaltransactions|globalizationandhealth|gutpathogens|harmreductionjournal|head-face-med|hqlo|health-policy-systems|human-resources-health|immunityageing|immunome-research|implementationscience|infectagentscancer|intarchmed|internationalbreastfeedingjournal|equityhealthj|ijbnpa|ij-healthgeographics|ijmhs|issoonline|jautoimdis|jbioleng|jbiol|j-biomed-discovery|jbppni|carcinogenesis|cardiothoracicsurgery|jcmr-online|jcircadianrhythms|ethnobiomed|jexpclinassistreprod|jeccr|jfootankleres|jhoonline|jibtherapies|journal-inflammation|jmedicalcasereports|jmolecularsignaling|jnanobiotechnology|jnrbm|jneuroengrehab|jneuroinflammation|occup-med|josr-online|jissn|translational-medicine|traumamanagement|lipidworld|malariajournal|microbialcellfactories|molecularbrain|molecular-cancer|molecularcytogenetics|molecularneurodegeneration|molecularpain|neuraldevelopment|nonlinearbiomedphys|nutritionandmetabolism|nutritionj|ojrd|om-pc|parasitesandvectors|particleandfibretoxicology|pathogeneticsjournal|pssjournal|ped-rheum|peh-med|plantmethods|pophealthmetrics|proteomesci|ro-journal|rbej|reproductive-health-journal|respiratory-research|retrovirology|salinesystems|the-scientist|scoliosisjournal|scfbm|substanceabusepolicy|tbiomed|thrombosisjournal|thyroidresearchjournal|tobaccoinduceddiseases|trialsjournal|urooncologyjournal|virologyj|wjes|wjso)\\.(com|org|net)",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcs",
	"lastUpdated": "2012-01-30 22:39:00"
}

/*
   BioMed Central Translator
   Copyright (C) 2011 Avram Lyon, ajlyon@gmail.com

   This program is free software: you can redistribute it and/or modify
   it under the terms of the GNU Affer General Public License as published by
   the Free Software Foundation, either version 3 of the License, or
   (at your option) any later version.

   This program is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU Affero General Public License for more details.

   You should have received a copy of the GNU Affer General Public License
   along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

/*
Translator completely rewritten by Avram Lyon to use RDF. Original target regex by Ben Parr.
 */

function detectWeb(doc,url) {
	var xpath='//meta[@name="citation_journal_title"]';
		
	if (ZU.xpath(doc, xpath).length > 0) {
		return "journalArticle";
	}
			
	if (url.match(/\/search\/results(\.asp)?\?.*terms=/)) {
		return "multiple";
	}

	return false;
}


function doWeb(doc,url)
{
	if (detectWeb(doc, url) == "multiple") {
		var hits = {};
		var urls = [];
		var results = ZU.xpath(doc,"//table[@id='articles-list']//td[@class='article-entry']//p/strong/a");
		if (!results || results.length == 0) results = ZU.xpath(doc,"//form[@name='search']/table[3]/tbody/tr/td[2]/a[@class='hiddenlink']");
		for (var i in results) {
			hits[results[i].href] = results[i].textContent;
		}
		Z.selectItems(hits, function(items) {
			if (items == null) return true;
			for (var j in items) {
				urls.push(j);
			}
			ZU.processDocuments(urls, function (myDoc) { 
				doWeb(myDoc, myDoc.location.href) }, function () {Z.done()});

			Z.wait();
		});
	} else {
		// We call the Embedded Metadata translator to do the actual work
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
		translator.setHandler("itemDone", function(obj, item) {
				item.abstractNote = item.extra;
				item.extra = '';
				item.complete();
				});
		translator.getTranslatorObject(function (obj) {
				obj.doWeb(doc, url);
				});
	}
}

/** BEGIN TEST CASES **/
var testCases = [
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
						"firstName": "Katrin S",
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
						"firstName": "Wolfgang G",
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
						"url": false,
						"mimeType": "application/pdf"
					},
					{
						"document": false,
						"title": "Snapshot"
					}
				],
				"title": "Nicotinic receptors on rat alveolar macrophages dampen ATP-induced increase in cytosolic calcium concentration",
				"publicationTitle": "Respiratory Research",
				"volume": "11",
				"issue": "1",
				"DOI": "10.1186/1465-9921-11-133",
				"pages": "133",
				"url": "http://respiratory-research.com/content/11/1/133",
				"libraryCatalog": "respiratory-research.com"
			}
		]
	}
]
/** END TEST CASES **/
