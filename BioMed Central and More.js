{
	"translatorID": "1a3e63b2-0adf-4c8e-928b-c58c2594b45d",
	"label": "BioMed Central and More",
	"creator": "Ben Parr and Avram Lyon",
	"target": "http://[^/]*(jcmr-online|respiratory-research|bio-diglib|nuclear-receptor|medimmunol|kinetoplastids|filariajournal|cellandchromosome|actavetscand|aidsrestherapy|almob|ann-clinmicrob|annals-general-psychiatry|asir-journal|arthritis-research|apfmj|anzhealthpolicy|behavioralandbrainfunctions|biodatamining|biology-direct|biomagres|biomedical-engineering-online|bpsmedicine|biotechnologyforbiofuels|biomedcentral|breast-cancer-research|cancerci|cbmjournal|cardiab|cardiovascularultrasound|casesjournal|lipidsignaling.cbdjournals|biosignaling|celldiv|cerebrospinalfluidresearch|journal.chemistrycentral|capmh|cmjournal|chiroandosteo|clinicalmolecularallergy|cpementalhealth|comparative-hepatology|conflictandhealth|resource-allocation|coughjournal|ccforum|cytojournal|diagnosticpathology|dynamic-med|ete-online|ehjournal|epi-perspectives|epigeneticsandchromatin|fibrogenesis|frontiersinzoology|gvt-journal|genomebiology|genomemedicine|geochemicaltransactions|globalizationandhealth|gutpathogens|harmreductionjournal|head-face-med|hqlo|health-policy-systems|human-resources-health|immunityageing|immunome-research|implementationscience|infectagentscancer|intarchmed|internationalbreastfeedingjournal|equityhealthj|ijbnpa|ij-healthgeographics|ijmhs|issoonline|jautoimdis|jbioleng|jbiol|j-biomed-discovery|jbppni|carcinogenesis|cardiothoracicsurgery|jcmr-online|jcircadianrhythms|ethnobiomed|jexpclinassistreprod|jeccr|jfootankleres|jhoonline|jibtherapies|journal-inflammation|jmedicalcasereports|jmolecularsignaling|jnanobiotechnology|jnrbm|jneuroengrehab|jneuroinflammation|occup-med|josr-online|jissn|translational-medicine|traumamanagement|lipidworld|malariajournal|microbialcellfactories|molecularbrain|molecular-cancer|molecularcytogenetics|molecularneurodegeneration|molecularpain|neuraldevelopment|nonlinearbiomedphys|nutritionandmetabolism|nutritionj|ojrd|om-pc|parasitesandvectors|particleandfibretoxicology|pathogeneticsjournal|pssjournal|ped-rheum|peh-med|plantmethods|pophealthmetrics|proteomesci|ro-journal|rbej|reproductive-health-journal|respiratory-research|retrovirology|salinesystems|the-scientist|scoliosisjournal|scfbm|substanceabusepolicy|tbiomed|thrombosisjournal|thyroidresearchjournal|tobaccoinduceddiseases|trialsjournal|urooncologyjournal|virologyj|wjes|wjso)\\.(com|org|net)",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "g",
	"lastUpdated": "2011-10-10 21:47:47"
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

function detectWeb(doc,url)
{
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
	if (prefix == "x" ) return namespace; else return null;
	} : null;
		
	var xpath='//meta[@name="citation_journal_title"]';
		
	//Single
	if (doc.evaluate(xpath, doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext()) 
		{return "journalArticle";}
			
	if (url.match(/\/search\/results\?.*terms=/)) return "multiple";
}


function doWeb(doc,url)
{
	if (detectWeb(doc, url) == "multiple") {
		var hits = {};
		var urls = [];
		var results = ZU.xpath(doc,"//table[@id='articles-list']//td[@class='article-entry']//p/strong/a");
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
		});
	}
	
	// We call the Embedded RDF translator to do the actual work
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

	Zotero.wait();
}
