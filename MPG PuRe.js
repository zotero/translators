{
	"translatorID": "9d0b3532-f3ee-4096-87e6-5c5759a3e9dc",
	"label": "MPG PuRe",
	"creator": "Abe Jellinek",
	"target": "^https?://pure\\.mpg\\.de/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-09-07 20:00:26"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2021 Abe Jellinek
	
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


function detectWeb(doc, _url) {
	if (doc.querySelector('meta[name="citation_title"]')) {
		if (doc.querySelector('meta[name="citation_conference_title"]')) {
			return "conferencePaper";
		}
		else {
			return "journalArticle";
		}
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.itemHeadline > a');
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(row.textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (items) ZU.processDocuments(Object.keys(items), scrape);
		});
	}
	else {
		scrape(doc, url);
	}
}

function scrape(doc, url) {
	var translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	
	translator.setHandler('itemDone', function (obj, item) {
		// XPath works best here
		item.abstractNote = ZU.xpathText(doc,
			'//b[contains(text(), "Abstract")]/following-sibling::span');
		item.libraryCatalog = 'MPG PuRe';
		item.date = item.date.replace(/\//g, '-');
		
		if (!item.url || item.url.includes('//pure.mpg.de/pubman/')) {
			item.url = text(doc, '#form1\\:lnkCitationURLVersionPid') || item.url;
		}
		
		item.attachments = item.attachments.filter(a => a.title != 'Snapshot');
		
		item.complete();
	});

	translator.getTranslatorObject(function (trans) {
		trans.doWeb(doc, url);
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://pure.mpg.de/pubman/faces/ViewItemFullPage.jsp?itemId=item_3174176",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Test–Retest Reliability of the Brain Metabolites GABA and Glx With JPRESS, PRESS, and MEGA‐PRESS MRS Sequences in vivo at 3T",
				"creators": [
					{
						"firstName": "A.",
						"lastName": "Baeshen",
						"creatorType": "author"
					},
					{
						"firstName": "P. O.",
						"lastName": "Wyss",
						"creatorType": "author"
					},
					{
						"firstName": "A.",
						"lastName": "Henning",
						"creatorType": "author"
					},
					{
						"firstName": "R. L.",
						"lastName": "O'Gorman",
						"creatorType": "author"
					},
					{
						"firstName": "M.",
						"lastName": "Piccirelli",
						"creatorType": "author"
					},
					{
						"firstName": "S.",
						"lastName": "Kollias",
						"creatorType": "author"
					},
					{
						"firstName": "L.",
						"lastName": "Michels",
						"creatorType": "author"
					}
				],
				"date": "2020-04",
				"DOI": "10.1002/jmri.26921",
				"ISSN": "1053-1807",
				"abstractNote": "Background\n\nThe optimization of magnetic resonance spectroscopy (MRS) sequences allows improved diagnosis and prognosis of neurological and psychological disorders. Thus, to assess the test–retest and intersequence reliability of such MRS sequences in quantifying metabolite concentrations is of clinical relevance.\nPurpose\n\nTo evaluate the test–retest and intersequence reliability of three MRS sequences to estimate GABA and Glx = Glutamine+Glutamate concentrations in the human brain.\nStudy Type\n\nProspective.\nSubjects\n\nEighteen healthy participants were scanned twice (range: 1 day to 1 week between the two sessions) with identical protocols.\nField Strength/Sequence\n\n3T using a 32‐channel SENSE head coil in the PCC region; PRESS, JPRESS, and MEGA‐PRESS sequences.\nAssessment\n\nMetabolite concentrations were estimated using LCModel (for PRESS and MEGA‐PRESS) and ProFit2 (for JPRESS).\nStatistical Tests\n\nThe test–retest reliability was evaluated by Wilcoxon signed‐rank tests, Pearson's r correlation coefficients, intraclass‐correlation coefficients (ICC), coefficients of variation (CV), and by Bland–Altman (BA) plots. The intersequence reliability was assessed with Wilcoxon signed‐rank tests, Pearson's r correlation coefficients, and BA plots.\nResults\n\nFor GABA, only the MEGA‐PRESS sequence showed a moderate test–retest correlation (r = 0.54, ICC = 0.5, CV = 8.8%) and the BA plots indicated good agreement (P > 0.05) for all sequences. JPRESS provided less precise results and PRESS was insensitive to GABA. For Glx, the r and ICC values for PRESS (r = 0.87, ICC = 0.9, CV = 2.9%) and MEGA‐PRESS (r = 0.70, ICC = 0.7, CV = 5.3%) reflect higher correlations, compared with JPRESS (r = 0.39, ICC = 0.4, CV = 20.1%).",
				"issue": "4",
				"libraryCatalog": "MPG PuRe",
				"pages": "1181-1191",
				"publicationTitle": "Journal of Magnetic Resonance Imaging",
				"url": "https://onlinelibrary.wiley.com/doi/epdf/10.1002/jmri.26921",
				"volume": "51",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://pure.mpg.de/pubman/faces/ViewItemFullPage.jsp?itemId=item_3256816_2",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Neural correlates of modal displacement and discourse-updating under (un)certainty",
				"creators": [
					{
						"firstName": "Maxime",
						"lastName": "Tulling",
						"creatorType": "author"
					},
					{
						"firstName": "Ryan",
						"lastName": "Law",
						"creatorType": "author"
					},
					{
						"firstName": "Ailís",
						"lastName": "Cournane",
						"creatorType": "author"
					},
					{
						"firstName": "Liina",
						"lastName": "Pylkkänen",
						"creatorType": "author"
					}
				],
				"date": "2020-12-07",
				"DOI": "10.1523/ENEURO.0290-20.2020",
				"abstractNote": "A hallmark of human thought is the ability to think about not just the actual world, but also about alternative ways the world could be. One way to study this contrast is through language. Language has grammatical devices for expressing possibilities and necessities, such as the words might or must. With these devices, called “modal expressions,” we can study the actual vs. possible contrast in a highly controlled way. While factual utterances such as “There is a monster under my bed” update the here-and-now of a discourse model, a modal version of this sentence, “There might be a monster under my bed,” displaces from the here-and-now and merely postulates a possibility. We used magnetoencephalography (MEG) to test whether the processes of discourse updating and modal displacement dissociate in the brain. Factual and modal utterances were embedded in short narratives, and across two experiments, factual expressions increased the measured activity over modal expressions. However, the localization of the increase appeared to depend on perspective: signal localizing in right temporo-parietal areas increased when updating others’ beliefs, while frontal medial areas seem sensitive to updating one’s own beliefs. The presence of modal displacement did not elevate MEG signal strength in any of our analyses. In sum, this study identifies potential neural signatures of the process by which facts get added to our mental representation of the world.Competing Interest StatementThe authors have declared no competing interest.",
				"language": "eng",
				"libraryCatalog": "MPG PuRe",
				"url": "http://hdl.handle.net/21.11116/0000-0009-22A3-8",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://pure.mpg.de/pubman/faces/ViewItemFullPage.jsp?itemId=item_3339827_1",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "Euclid mission status after mission critical design",
				"creators": [
					{
						"firstName": "R.",
						"lastName": "Laureijs",
						"creatorType": "author"
					},
					{
						"firstName": "G. D.",
						"lastName": "Racca",
						"creatorType": "author"
					},
					{
						"firstName": "Y.",
						"lastName": "Mellier",
						"creatorType": "author"
					},
					{
						"firstName": "P.",
						"lastName": "Musi",
						"creatorType": "author"
					},
					{
						"firstName": "L.",
						"lastName": "Brouard",
						"creatorType": "author"
					},
					{
						"firstName": "T.",
						"lastName": "Böenke",
						"creatorType": "author"
					},
					{
						"firstName": "L. Gaspar",
						"lastName": "Venancio",
						"creatorType": "author"
					},
					{
						"firstName": "E.",
						"lastName": "Maiorano",
						"creatorType": "author"
					},
					{
						"firstName": "A.",
						"lastName": "Short",
						"creatorType": "author"
					},
					{
						"firstName": "P.",
						"lastName": "Strada",
						"creatorType": "author"
					},
					{
						"firstName": "B.",
						"lastName": "Altieri",
						"creatorType": "author"
					},
					{
						"firstName": "G.",
						"lastName": "Buenadicha",
						"creatorType": "author"
					},
					{
						"firstName": "X.",
						"lastName": "Dupac",
						"creatorType": "author"
					},
					{
						"firstName": "P. Gomez",
						"lastName": "Alvarez",
						"creatorType": "author"
					},
					{
						"firstName": "J.",
						"lastName": "Hoar",
						"creatorType": "author"
					},
					{
						"firstName": "R.",
						"lastName": "Kohley",
						"creatorType": "author"
					},
					{
						"firstName": "R.",
						"lastName": "Vavrek",
						"creatorType": "author"
					},
					{
						"firstName": "A.",
						"lastName": "Rudolph",
						"creatorType": "author"
					},
					{
						"firstName": "M.",
						"lastName": "Schmidt",
						"creatorType": "author"
					},
					{
						"firstName": "J.",
						"lastName": "Amiaux",
						"creatorType": "author"
					},
					{
						"firstName": "H.",
						"lastName": "Aussel",
						"creatorType": "author"
					},
					{
						"firstName": "M.",
						"lastName": "Berthé",
						"creatorType": "author"
					},
					{
						"firstName": "M.",
						"lastName": "Cropper",
						"creatorType": "author"
					},
					{
						"firstName": "J.-C.",
						"lastName": "Cuillandre",
						"creatorType": "author"
					},
					{
						"firstName": "C.",
						"lastName": "Dabin",
						"creatorType": "author"
					},
					{
						"firstName": "J.",
						"lastName": "Dinis",
						"creatorType": "author"
					},
					{
						"firstName": "R.",
						"lastName": "Nakajima",
						"creatorType": "author"
					},
					{
						"firstName": "T.",
						"lastName": "Maciaszek",
						"creatorType": "author"
					},
					{
						"firstName": "R.",
						"lastName": "Scaramella",
						"creatorType": "author"
					},
					{
						"firstName": "A.",
						"lastName": "da Silva",
						"creatorType": "author"
					},
					{
						"firstName": "I.",
						"lastName": "Tereno",
						"creatorType": "author"
					},
					{
						"firstName": "O. R.",
						"lastName": "Williams",
						"creatorType": "author"
					},
					{
						"firstName": "A.",
						"lastName": "Zacchei",
						"creatorType": "author"
					},
					{
						"firstName": "R.",
						"lastName": "Azzollini",
						"creatorType": "author"
					},
					{
						"firstName": "F.",
						"lastName": "Bernardeau",
						"creatorType": "author"
					},
					{
						"firstName": "J.",
						"lastName": "Brinchmann",
						"creatorType": "author"
					},
					{
						"firstName": "C.",
						"lastName": "Brockley-Blatt",
						"creatorType": "author"
					},
					{
						"firstName": "F.",
						"lastName": "Castander",
						"creatorType": "author"
					},
					{
						"firstName": "A.",
						"lastName": "Cimatti",
						"creatorType": "author"
					},
					{
						"firstName": "C.",
						"lastName": "Conselice",
						"creatorType": "author"
					},
					{
						"firstName": "A.",
						"lastName": "Ealet",
						"creatorType": "author"
					},
					{
						"firstName": "P.",
						"lastName": "Fosalba",
						"creatorType": "author"
					},
					{
						"firstName": "W.",
						"lastName": "Gillard",
						"creatorType": "author"
					},
					{
						"firstName": "L.",
						"lastName": "Guzzo",
						"creatorType": "author"
					},
					{
						"firstName": "H.",
						"lastName": "Hoekstra",
						"creatorType": "author"
					},
					{
						"firstName": "P.",
						"lastName": "Hudelot",
						"creatorType": "author"
					},
					{
						"firstName": "K.",
						"lastName": "Jahnke",
						"creatorType": "author"
					},
					{
						"firstName": "T.",
						"lastName": "Kitching",
						"creatorType": "author"
					},
					{
						"firstName": "L.",
						"lastName": "Miller",
						"creatorType": "author"
					},
					{
						"firstName": "J.",
						"lastName": "Mohr",
						"creatorType": "author"
					},
					{
						"firstName": "W.",
						"lastName": "Percival",
						"creatorType": "author"
					},
					{
						"firstName": "V.",
						"lastName": "Pettorino",
						"creatorType": "author"
					},
					{
						"firstName": "J.",
						"lastName": "Rhodes",
						"creatorType": "author"
					},
					{
						"firstName": "A.",
						"lastName": "Sanchez",
						"creatorType": "author"
					},
					{
						"firstName": "M.",
						"lastName": "Sauvage",
						"creatorType": "author"
					},
					{
						"firstName": "S.",
						"lastName": "Serrano",
						"creatorType": "author"
					},
					{
						"firstName": "R.",
						"lastName": "Teyssier",
						"creatorType": "author"
					},
					{
						"firstName": "J.",
						"lastName": "Weller",
						"creatorType": "author"
					},
					{
						"firstName": "J.",
						"lastName": "Zoubian",
						"creatorType": "author"
					}
				],
				"date": "2020-12-13",
				"DOI": "10.1117/12.2563145",
				"abstractNote": "Euclid, an ESA mission designed to characterise dark energy and dark matter, passed its Mission Critical Design Review in November 2018. It was demonstrated that the project is ready to start integration and test of the main systems, and that it has the ability to fulfil its top-level mission requirements. In addition, based on the performances at M-CDR, the scientific community has verified that the science requirements can be achieved for the Weak Lensing and Galaxy Clustering dark energy probes, namely a dark energy Figure of Merit of 400 and a 2% accuracy in the growth factor exponent gamma. We present the status of the main elements of the Euclid mission in the light of the demanding high optical performance which is the essential design driver is the to meet the scientific requirements. We include the space segment comprising of a service module and payload module hosting the telescope and its two scientific instruments, and the ground segment, which encompasses the operational and science ground segment. The elements for the scientific success of the mission for a timely release of the data are shortly presented: the processing and calibration of the data, and the design of the sky survey. Euclid is presently on schedule for a launch in September 2022.",
				"conferenceName": "Conference on Space Telescopes and Instrumentation - Optical, Infrared, and Millimeter Wave",
				"language": "eng",
				"libraryCatalog": "MPG PuRe",
				"url": "http://hdl.handle.net/21.11116/0000-0009-204B-F",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://pure.mpg.de/pubman/faces/SearchResultListPage.jsp?esq=%7B%22bool%22%3A%7B%22must%22%3A%5B%7B%22term%22%3A%7B%22publicState%22%3A%7B%22value%22%3A%22RELEASED%22%2C%22boost%22%3A1.0%7D%7D%7D%2C%7B%22bool%22%3A%7B%22should%22%3A%5B%7B%22simple_query_string%22%3A%7B%22query%22%3A%22test%22%2C%22flags%22%3A-1%2C%22default_operator%22%3A%22and%22%2C%22analyze_wildcard%22%3Atrue%2C%22auto_generate_synonyms_phrase_query%22%3Atrue%2C%22fuzzy_prefix_length%22%3A0%2C%22fuzzy_max_expansions%22%3A50%2C%22fuzzy_transpositions%22%3Atrue%2C%22boost%22%3A1.0%7D%7D%2C%7B%22bool%22%3A%7B%22should%22%3A%5B%7B%22term%22%3A%7B%22objectId%22%3A%7B%22value%22%3A%22test%22%2C%22boost%22%3A1.0%7D%7D%7D%2C%7B%22match%22%3A%7B%22objectPid%22%3A%7B%22query%22%3A%22test%22%2C%22operator%22%3A%22AND%22%2C%22prefix_length%22%3A0%2C%22max_expansions%22%3A50%2C%22fuzzy_transpositions%22%3Atrue%2C%22lenient%22%3Afalse%2C%22zero_terms_query%22%3A%22NONE%22%2C%22auto_generate_synonyms_phrase_query%22%3Atrue%2C%22boost%22%3A1.0%7D%7D%7D%2C%7B%22match%22%3A%7B%22versionPid%22%3A%7B%22query%22%3A%22test%22%2C%22operator%22%3A%22AND%22%2C%22prefix_length%22%3A0%2C%22max_expansions%22%3A50%2C%22fuzzy_transpositions%22%3Atrue%2C%22lenient%22%3Afalse%2C%22zero_terms_query%22%3A%22NONE%22%2C%22auto_generate_synonyms_phrase_query%22%3Atrue%2C%22boost%22%3A1.0%7D%7D%7D%2C%7B%22match%22%3A%7B%22metadata.identifiers.id%22%3A%7B%22query%22%3A%22test%22%2C%22operator%22%3A%22AND%22%2C%22prefix_length%22%3A0%2C%22max_expansions%22%3A50%2C%22fuzzy_transpositions%22%3Atrue%2C%22lenient%22%3Afalse%2C%22zero_terms_query%22%3A%22NONE%22%2C%22auto_generate_synonyms_phrase_query%22%3Atrue%2C%22boost%22%3A1.0%7D%7D%7D%2C%7B%22match%22%3A%7B%22metadata.sources.identifiers.id%22%3A%7B%22query%22%3A%22test%22%2C%22operator%22%3A%22AND%22%2C%22prefix_length%22%3A0%2C%22max_expansions%22%3A50%2C%22fuzzy_transpositions%22%3Atrue%2C%22lenient%22%3Afalse%2C%22zero_terms_query%22%3A%22NONE%22%2C%22auto_generate_synonyms_phrase_query%22%3Atrue%2C%22boost%22%3A1.0%7D%7D%7D%5D%2C%22adjust_pure_negative%22%3Atrue%2C%22boost%22%3A1.0%7D%7D%5D%2C%22adjust_pure_negative%22%3Atrue%2C%22boost%22%3A1.0%7D%7D%5D%2C%22adjust_pure_negative%22%3Atrue%2C%22boost%22%3A1.0%7D%7D",
		"items": "multiple"
	}
]
/** END TEST CASES **/
