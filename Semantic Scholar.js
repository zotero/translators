{
	"translatorID": "276cb34c-6861-4de7-a11d-c2e46fb8af28",
	"label": "Semantic Scholar",
	"creator": "Guy Aglionby",
	"target": "^https?://(www[.])?semanticscholar\\.org/(search|paper|author)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2018-09-11 19:58:38"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2017 Guy Aglionby
	
	This file is part of Zotero.

	Zotero is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	Zotero is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
	GNU Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public License
	along with Zotero. If not, see <http://www.gnu.org/licenses/>.

	***** END LICENSE BLOCK *****
*/

// See also https://github.com/zotero/translators/blob/master/BibTeX.js
var bibtex2zoteroTypeMap = {
	"inproceedings": "conferencePaper",
	"conference"   : "conferencePaper",
	"article"      : "journalArticle"
};

function detectWeb(doc, url) {
	if (url.includes('/search') || url.includes('/author/')) {
		return 'multiple';
	} else {
		let citation = ZU.xpathText(doc, '//pre[@class="bibtex-citation"]');
		let type = citation.split('{')[0].replace('@', '');
		return bibtex2zoteroTypeMap[type];
	}
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) === 'multiple') {
		Zotero.selectItems(getSearchResults(doc), function (selected) {
			if (selected) {
				ZU.processDocuments(Object.keys(selected), parseDocument);
			}
		});
	} else {
		parseDocument(doc, url);
	}
}

function getSearchResults(doc) {
	var titles = ZU.xpath(doc, '//a[@data-selenium-selector="title-link"]');
	var results = {};
	titles.forEach(function(linkElement) {
		results[linkElement.href] = linkElement.textContent;
	});
	return results;
}

function parseDocument(doc, url) {
	let citation = ZU.xpathText(doc, '//pre[@class="bibtex-citation"]');
	
	let translator = Zotero.loadTranslator("import");
	translator.setTranslator("9cb70025-a888-4a29-a210-93ec52da40d4");
	translator.setString(citation);
	translator.setHandler("itemDone", function (obj, item) {
		// Add the link to Semantic Scholar
		item.attachments.push({
			url: url,
			title: "Semantic Scholar Link",
			mimeType: "text/html",
			snapshot: false
		});

		// Attach the PDF
		var scripts = ZU.xpath(doc, '//script');
		var rawData = {};
		const DATA_INDICATOR = 'var DATA = \'';
		for (let i = 0; i < scripts.length; i++) {
			if (scripts[i].innerHTML.startsWith(DATA_INDICATOR)) {
				let dataText = scripts[i].innerHTML.replace(DATA_INDICATOR, '').slice(0, -2);
				dataText = decodeURIComponent(atob(dataText));
				rawData = JSON.parse(dataText)[0].resultData.paper;
				break;
			}
		}
		
		if (item.pages) {
			item.pages = fixPageRange(item.pages);
		}
		
		if (item.volume && item.volume.includes(' ')) {
			let volumeAndIssue = item.volume.split(' ');
			item.volume = volumeAndIssue[0];
			item.issue = volumeAndIssue[1];
		}
		
		if (rawData.hasPdf) {
			let paperLink = rawData.links.filter(function(link) { return link.linkType === 's2'; })[0].url;
			item.attachments.push({
				url: paperLink,
				title: "Full Text PDF",
				mimeType: 'application/pdf'
			});
		}

		if (rawData.paperAbstract && rawData.paperAbstract.text) {
			item.abstractNote = ZU.unescapeHTML(rawData.paperAbstract.text);
		}

		if (rawData.doiInfo && rawData.doiInfo.doi) {
			item.DOI = rawData.doiInfo.doi;
		}
		
		if (rawData.entities) {
			for (let entity of rawData.entities) {
				item.tags.push(entity.name);
			}
		}

		item.complete();
	});
	translator.translate();
}

// Some page ranges are given as e.g. 575-84. Expand these to e.g. 575-584
function fixPageRange(pageRange) {
	let numbers = pageRange.split('-');
	if (numbers.length !== 2) {
		return pageRange;
	}
	
	numbers = numbers.map(function(x) { return parseInt(x); });
	
	// No change is needed if they're already correctly formatted
	if (numbers[0] < numbers[1]) {
		return pageRange;
	} else {
		let digitsInSecond = Math.floor(Math.log10(numbers[1])) + 1;
		let baseNumber = numbers[0];
		let difference = 0;
		
		for (let i = 1; i <= digitsInSecond; i++) {
			let mod = baseNumber % (10 ** i);
			baseNumber -= mod;
			difference += mod;
		}
		
		// If the given pageRange doesn't make sense, just leave it as it has been given
		// e.g. '95-10'
		if (difference > numbers[1]) {
			return pageRange;
		}
		
		numbers[1] = baseNumber + numbers[1];
		
		return numbers[0] + '-' + numbers[1];
	}
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.semanticscholar.org/paper/TectoMT%3A-Modular-NLP-Framework-Popel-Zabokrtsk%C3%BD/e1ea10a288632a4003a4221759bc7f7a2df36208",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "TectoMT: Modular NLP Framework",
				"creators": [
					{
						"firstName": "Martin",
						"lastName": "Popel",
						"creatorType": "author"
					},
					{
						"firstName": "Zdenek",
						"lastName": "Zabokrtský",
						"creatorType": "author"
					}
				],
				"date": "2010",
				"DOI": "10.1007/978-3-642-14770-8_33",
				"abstractNote": "In the present paper we describe TectoMT, a multi-purpose open-source NLP framework. It allows for fast and efficient development of NLP applications by exploiting a wide range of software modules already integrated in TectoMT, such as tools for sentence segmentation, tokenization, morphological analysis, POS tagging, shallow and deep syntax parsing, named entity recognition, anaphora resolution, tree-to-tree translation, natural language generation, word-level alignment of parallel corpora, and other tasks. One of the most complex applications of TectoMT is the English-Czech machine translation system with transfer on deep syntactic (tectogrammatical) layer. Several modules are available also for other languages (German, Russian, Arabic). Where possible, modules are implemented in a language-independent way, so they can be reused in many applications.",
				"itemID": "Popel2010TectoMTMN",
				"libraryCatalog": "Semantic Scholar",
				"proceedingsTitle": "IceTAL",
				"shortTitle": "TectoMT",
				"attachments": [
					{
						"title": "Semantic Scholar Link",
						"mimeType": "text/html",
						"snapshot": false
					},
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Anaphora (linguistics)"
					},
					{
						"tag": "Language-independent specification"
					},
					{
						"tag": "Machine translation"
					},
					{
						"tag": "Multi-Purpose Viewer"
					},
					{
						"tag": "Named-entity recognition"
					},
					{
						"tag": "Natural language generation"
					},
					{
						"tag": "Natural language processing"
					},
					{
						"tag": "Open-source software"
					},
					{
						"tag": "Parallel text"
					},
					{
						"tag": "Parsing"
					},
					{
						"tag": "Part-of-speech tagging"
					},
					{
						"tag": "Sentence boundary disambiguation"
					},
					{
						"tag": "Text corpus"
					},
					{
						"tag": "Tokenization (data security)"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"defer": true,
		"url": "https://www.semanticscholar.org/paper/The-spring-in-the-arch-of-the-human-foot-Ker-Bennett/8555e05e52e5c04017ca7a9c9da9ed9c39e4f9a0",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "The spring in the arch of the human foot",
				"creators": [
					{
						"firstName": "Robert F.",
						"lastName": "Ker",
						"creatorType": "author"
					},
					{
						"firstName": "Michael Brian",
						"lastName": "Bennett",
						"creatorType": "author"
					},
					{
						"firstName": "S. R.",
						"lastName": "Bibby",
						"creatorType": "author"
					},
					{
						"firstName": "Ralph C.",
						"lastName": "Kester",
						"creatorType": "author"
					},
					{
						"firstName": "R. McN",
						"lastName": "Alexander",
						"creatorType": "author"
					}
				],
				"date": "1987",
				"DOI": "10.1038/325147a0",
				"abstractNote": "Large mammals, including humans, save much of the energy needed for running by means of elastic structures in their legs and feet1,2. Kinetic and potential energy removed from the body in the first half of the stance phase is stored briefly as elastic strain energy and then returned in the second half by elastic recoil. Thus the animal runs in an analogous fashion to a rubber ball bouncing along. Among the elastic structures involved, the tendons of distal leg muscles have been shown to be important2,3. Here we show that the elastic properties of the arch of the human foot are also important.",
				"itemID": "Ker1987TheSI",
				"libraryCatalog": "Semantic Scholar",
				"pages": "147-149",
				"publicationTitle": "Nature",
				"volume": "325",
				"attachments": [
					{
						"title": "Semantic Scholar Link",
						"mimeType": "text/html",
						"snapshot": false
					}
				],
				"tags": [
					{
						"tag": "Tendon structure"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.semanticscholar.org/paper/Foundations-of-Statistical-Natural-Language-Manning-Sch%C3%BCtze/06fd7d924d499fbc62ccbcc2e458fb6c187bcf6f",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Foundations of Statistical Natural Language Processing",
				"creators": [
					{
						"firstName": "Christopher D.",
						"lastName": "Manning",
						"creatorType": "author"
					},
					{
						"firstName": "Hinrich",
						"lastName": "Schütze",
						"creatorType": "author"
					}
				],
				"date": "2000",
				"DOI": "10.1023/A:1011424425034",
				"abstractNote": "In 1993, Eugene Charniak published a slim volume entitled Statistical Language Learning. At the time, empirical techniques for natural language processing were on the rise; that year, Computational Linguistics published a special issue on such methods, and Charniak’s text was the first to treat the emerging field. Nowadays, the revolution has become the establishment; in 1998, nearly half the papers in Computational Linguistics concerned empirical methods (Hirschberg 1998). Indeed, Christopher Manning and Hinrich Schütze’s new, by-no-means slim textbook on statistical NLP—strangely, the first since Charniak’s—begins “The need for a thorough textbook for Statistical Natural Language Processing hardly needs to be argued for.” Indubitably so; the question is, is this it? Foundations of Statistical Natural Language Processing (henceforth FSNLP) is certainly ambitious in scope. True to its name, it contains a great deal of preparatory material, including: gentle introductions to probability and information theory; a chapter on linguistic concepts; and (a most welcome addition) discussion of the nitty-gritty of doing empirical work, ranging from lists of available corpora to in-depth discussion of the critical issue of smoothing. Scattered throughout are also topics fundamental to doing good experimental work in general, such as hypothesis testing, cross-validation, and baselines. Along with these preliminaries, FSNLP covers traditional tools of the trade: Markov models, probabilistic grammars, supervised and unsupervised classification, and the vector-space model. Finally, several chapters are devoted to specific problems, among them lexicon acquisition, word sense disambiguation, parsing, machine translation, and information retrieval. (The companion website contains further useful material, including links to programs and a list of errata.) In short, this is a Big Book, and this fact alone confers some benefits. For the researcher, FSNLP offers the convenience of one-stop shopping: at present, there is no other NLP reference in which standard empirical techniques, statistical tables, definitions of linguistic terms, and elements of information retrieval appear together; furthermore, the text also summarizes and critiques many individual research papers. Similarly, someone teaching a course on statistical NLP will appreciate the large number of topics FSNLP covers, allowing the tailoring of a syllabus to individual in-",
				"itemID": "Manning2000FoundationsOS",
				"libraryCatalog": "Semantic Scholar",
				"pages": "277-279",
				"publicationTitle": "Computational Linguistics",
				"volume": "26",
				"attachments": [
					{
						"title": "Semantic Scholar Link",
						"mimeType": "text/html",
						"snapshot": false
					}
				],
				"tags": [
					{
						"tag": "Algorithm"
					},
					{
						"tag": "Data compression"
					},
					{
						"tag": "Grams"
					},
					{
						"tag": "Language model"
					},
					{
						"tag": "Linear interpolation"
					},
					{
						"tag": "N-gram"
					},
					{
						"tag": "Natural language processing"
					},
					{
						"tag": "Protologism"
					},
					{
						"tag": "Smoothing"
					},
					{
						"tag": "Stochastic grammar"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.semanticscholar.org/paper/Interleukin-7-mediates-the-homeostasis-of-na%C3%AFve-and-Schluns-Kieper/aee7b854bed51120fe356a5792dfb22fec7cf2ae",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Interleukin-7 mediates the homeostasis of naïve and memory CD8 T cells in vivo",
				"creators": [
					{
						"firstName": "Kimberly S.",
						"lastName": "Schluns",
						"creatorType": "author"
					},
					{
						"firstName": "William C.",
						"lastName": "Kieper",
						"creatorType": "author"
					},
					{
						"firstName": "Stephen C.",
						"lastName": "Jameson",
						"creatorType": "author"
					},
					{
						"firstName": "Leo",
						"lastName": "Lefrançois",
						"creatorType": "author"
					}
				],
				"date": "2000",
				"DOI": "10.1038/80868",
				"abstractNote": "The naïve and memory T lymphocyte pools are maintained through poorly understood homeostatic mechanisms that may include signaling via cytokine receptors. We show that interleukin-7 (IL-7) plays multiple roles in regulating homeostasis of CD8+ T cells. We found that IL-7 was required for homeostatic expansion of naïve CD8+ and CD4+ T cells in lymphopenic hosts and for CD8+ T cell survival in normal hosts. In contrast, IL- 7 was not necessary for growth of CD8+ T cells in response to a virus infection but was critical for generating T cell memory. Up-regulation of Bcl-2 in the absence of IL-7 signaling was impaired after activation in vivo. Homeostatic proliferation of memory cells was also partially dependent on IL-7. These results point to IL-7 as a pivotal cytokine in T cell homeostasis.",
				"itemID": "Schluns2000Interleukin7MT",
				"libraryCatalog": "Semantic Scholar",
				"pages": "426-432",
				"publicationTitle": "Nature Immunology",
				"volume": "1",
				"attachments": [
					{
						"title": "Semantic Scholar Link",
						"mimeType": "text/html",
						"snapshot": false
					}
				],
				"tags": [
					{
						"tag": "Chronic Lymphocytic Leukemia"
					},
					{
						"tag": "Homeostasis"
					},
					{
						"tag": "Interleukin-7"
					},
					{
						"tag": "Leukemia, B-Cell"
					},
					{
						"tag": "Memory Disorders"
					},
					{
						"tag": "T-Lymphocyte"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.semanticscholar.org/paper/Prim%C3%A4re-Ziliendyskinesie-in-%C3%96sterreich-Lesic-Maurer/13c67d45a9919f44bbd07fde9bdf5f4a0e9ecc8d",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Primäre Ziliendyskinesie in Österreich",
				"creators": [
					{
						"firstName": "Irena",
						"lastName": "Lesic",
						"creatorType": "author"
					},
					{
						"firstName": "Elisabeth",
						"lastName": "Maurer",
						"creatorType": "author"
					},
					{
						"firstName": "Marie-Pierre F.",
						"lastName": "Strippoli",
						"creatorType": "author"
					},
					{
						"firstName": "Claudia E.",
						"lastName": "Kuehni",
						"creatorType": "author"
					},
					{
						"firstName": "Angelo",
						"lastName": "Barbato",
						"creatorType": "author"
					},
					{
						"firstName": "Thomas",
						"lastName": "Frischer",
						"creatorType": "author"
					}
				],
				"date": "2009",
				"DOI": "10.1007/s00508-009-1197-4",
				"abstractNote": "INTRODUCTION: Primary ciliary dyskinesia (PCD) is a rare hereditary recessive disease with symptoms of recurrent pneumonia, chronic bronchitis, bronchiectasis, and chronic sinusitis. Chronic rhinitis is often the presenting symptom in newborns and infants. Approximately half of the patients show visceral mirror image arrangements (situs inversus). In this study, we aimed 1) to determine the number of paediatric PCD patients in Austria, 2) to show the diagnostic and therapeutic modalities used in the clinical centres and 3) to describe symptoms of children with PCD. PATIENTS, MATERIAL AND METHODS: For the first two aims, we analysed data from a questionnaire survey of the European Respiratory Society (ERS) task force on Primary Ciliary Dyskinesia in children. All paediatric respiratory units in Austria received a questionnaire. Symptoms of PCD patients from Vienna Children's University Hospital (aim 3) were extracted from case histories. RESULTS: In 13 Austrian clinics 48 patients with PCD (36 aged from 0–19 years) were identified. The prevalence of reported cases (aged 0–19 yrs) in Austria was 1:48000. Median age at diagnosis was 4.8 years (IQR 0.3–8.2), lower in children with situs inversus compared to those without (3.1 vs. 8.1 yrs, p = 0.067). In 2005–2006, the saccharine test was still the most commonly used screening test for PCD in Austria (45%). Confirmation of the diagnosis was usually by electron microscopy (73%). All clinics treated exacerbations immediately with antibiotics, 73% prescribed airway clearance therapy routinely to all patients. Other therapies and diagnostic tests were applied very inconsistently across Austrian hospitals. All PCD patients from Vienna (n = 13) had increased upper and lower respiratory secretions, most had recurring airway infections (n = 12), bronchiectasis (n = 7) and bronchitis (n = 7). CONCLUSION: Diagnosis and therapy of PCD in Austria are inhomogeneous. Prospective studies are needed to learn more about the course of the disease and to evaluate benefits and harms of different treatment strategies. EINLEITUNG: Die primäre Ziliendyskinesie (Primary Ciliary Dykinesia, PCD) ist eine seltene, meist autosomal-rezessiv vererbte Erkrankung, mit den typischen Manifestationen rezidivierende Pneumonien, chronische Bronchitis, Bronchiektasien, chronische Sinusitis und, insbesondere bei Neugeborenen und Säuglingen, chronischer Rhinitis. Die Hälfte der Patienten haben einen Situs inversus. Die Ziele dieser Studie waren, 1) die Anzahl pädiatrischer PCD-Patienten in Österreich zu erfassen, 2) die diagnostischen und therapeutischen Modalitäten der behandelnden Zentren darzustellen und 3) die Symptomatik der Patienten zu beschreiben. PATIENTEN, MATERIAL UND METHODEN: Zur Beantwortung der ersten zwei Fragen analysierten wir die österreichischen Resultate einer Fragebogenuntersuchung der pädiatrischen PCD Taskforce der European Respiratory Society (ERS). Die klinischen Charakteristika der PCD-Patienten an der Universitätsklinik für Kinder- und Jugendheilkunde in Wien stellten wir anhand der Krankengeschichten zusammen. ERGEBNISSE: In 13 österreichischen Krankenhäusern wurden 48 Patienten identifiziert (36 im Alter von 0–19 Jahre). Dies ergibt für Österreich eine Prävalenz diagnostizierter PCD-Patienten (0–19 Jahre) von 1:48000. Das mediane Alter bei Diagnose war 4,8 Jahre (IQR 0,3–8,2 Jahre). Patienten mit Situs inversus wurden früher diagsnotiziert (3,1 Jahre versus 8,1 Jahre; p = 0,067). Das gebräuchlichste screening-Verfahren (2005–2006) war der Saccharintest (45%), zur Diagnosesicherung wurde meist die Elektronenmikroskopie eingesetzt (73%). Alle Kliniken behandelten Exazerbationen sofort antibiotisch, Atemphysiotherapie wurde in 73% der Zentren eingesetzt. Insgesamt waren Diagnostik und Therapie der PCD in Österreich uneinheitlich. Alle Patienten der Universitätsklinik Wien (n = 13) hatten eine verstärkte Sekretproduktion, die meisten rezidivierende Atemwegsinfekte (n = 12), Bronchiektasen (n = 7) und Bronchitis (n = 7). KONKLUSION: Diagnostik und Therapie der PCD in Österreich sind uneinheitlich. Prospektive Studien sind notwendig, den Verlauf der Erkrankung zu erforschen sowie Nutzen und Schaden unterschiedlicher Therapie-konzepte darzustellen.",
				"itemID": "Lesic2009PrimreZI",
				"libraryCatalog": "Semantic Scholar",
				"pages": "616-622",
				"publicationTitle": "Wiener klinische Wochenschrift",
				"volume": "121",
				"attachments": [
					{
						"title": "Semantic Scholar Link",
						"mimeType": "text/html",
						"snapshot": false
					}
				],
				"tags": [
					{
						"tag": "Addison Disease"
					},
					{
						"tag": "Apoptosis"
					},
					{
						"tag": "Bronchiectasis"
					},
					{
						"tag": "Bronchitis, Chronic"
					},
					{
						"tag": "Chronic sinusitis"
					},
					{
						"tag": "Ciliary Motility Disorders"
					},
					{
						"tag": "Dyskinesia, Drug-Induced"
					},
					{
						"tag": "Epilepsy"
					},
					{
						"tag": "Extraction"
					},
					{
						"tag": "Infant, Newborn"
					},
					{
						"tag": "Kartagener Syndrome"
					},
					{
						"tag": "Neoplasms, Unknown Primary"
					},
					{
						"tag": "Osteoarthritis, Spine"
					},
					{
						"tag": "Physical medicine/manipulation"
					},
					{
						"tag": "Recurrent pneumonia"
					},
					{
						"tag": "Situs Inversus"
					},
					{
						"tag": "Surgical Wound Infection"
					},
					{
						"tag": "Surgical operation note:Find:Pt:Outpatient:Doc:Nurse"
					},
					{
						"tag": "Urinary Calculi"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.semanticscholar.org/author/Jane-Holmes/3023517",
		"items": "multiple"
	}
]
/** END TEST CASES **/
