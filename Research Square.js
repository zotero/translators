{
	"translatorID": "f8f24699-a23f-4355-8d03-4f03a1112ec4",
	"label": "Research Square",
	"creator": "Abe Jellinek",
	"target": "^https?://www\\.researchsquare\\.com/(article|browse)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-07-19 15:56:27"
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


function detectWeb(doc, url) {
	if (url.includes('/article/') && doc.querySelector('.page-article')) {
		return "report";
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('a.article-title[href*="/article/"]');
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
	let bareURL = url.replace(/[?#].*/, '');
	let risURL = bareURL
		.replace('researchsquare.com/article', 'researchsquare.com/api/article')
		+ '.ris';
	let pdfURL = bareURL + '.pdf';
	
	ZU.doGet(risURL, function (text) {
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
		translator.setString(text);
		translator.setHandler("itemDone", function (obj, item) {
			if (!item.title) {
				// ...no title in the RIS sometimes? odd
				item.title = attr(doc, 'meta[property="og:title"]', 'content');
			}
			
			item.itemType = 'report';
			if (!item.extra || !/^type: article/im.test(item.extra)) {
				item.extra = (item.extra || '') + '\nType: article';
			}
			
			// research square assigns preprints publication titles based on
			// where they've been submitted to, which isn't really right from
			// zotero's point of view
			delete item.publicationTitle;
			delete item.journalAbbreviation;
			
			item.attachments.push({
				url: pdfURL,
				title: "Full Text PDF",
				mimeType: "application/pdf"
			});
			
			for (let creator of item.creators) {
				if (creator.fieldMode == 1) {
					delete creator.fieldMode;
					Object.assign(creator,
						ZU.cleanAuthor(creator.lastName, creator.creatorType));
				}
			}
			
			item.url = bareURL;
			
			item.complete();
		});
		translator.translate();
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.researchsquare.com/article/rs-629724/v1",
		"items": [
			{
				"itemType": "report",
				"title": "Peptide formation as on the early Earth: from amino acid mixtures to peptides in sulphur dioxide",
				"creators": [
					{
						"lastName": "Trapp",
						"creatorType": "author",
						"firstName": "Oliver"
					},
					{
						"lastName": "Sauer",
						"creatorType": "author",
						"firstName": "Fabian"
					},
					{
						"lastName": "Haas",
						"creatorType": "author",
						"firstName": "Maren"
					},
					{
						"lastName": "Sydow",
						"creatorType": "author",
						"firstName": "Constanze"
					},
					{
						"lastName": "Siegle",
						"creatorType": "author",
						"firstName": "Alexander"
					},
					{
						"lastName": "Lauer",
						"creatorType": "author",
						"firstName": "Christoph"
					}
				],
				"date": "July 19, 2021",
				"abstractNote": "The formation of peptide bonds is one of the most important biochemical reaction steps. Without the development of structurally and catalytically active polymers, there would be no life on our planet. Intensive research is being conducted on possible reaction pathways for the formation of complex peptides on the early Earth. Salt-induced peptide formation (SIPF) by metal catalysis is one possible pathway for abiotic peptide synthesis. The high salt concentration supports dehydration in this process. However, the formation of large, complex oligomer systems is prevented by the high thermodynamic barrier of peptide condensation in aqueous solution. Liquid sulphur dioxide proves to be a superior alternative for copper-catalysed peptide condensation. Compared to water, the amino acids are activated in sulphur dioxide, which leads to the incorporation of all 20 proteinogenic amino acids into the resulting proteins and thus to a large variety of products. Strikingly, even extremely low initial reactant concentrations of only 50 mM are sufficient for extensive peptide formation, leading to an overall yield of 2.9% for dialanine in 7 days. The reactions carried out at room temperature and the successful use of the Hadean mineral covellite as a catalyst, suggest a volcanic environment for the formation of the peptide world on early Earth as a likely scenario.",
				"extra": "Type: article",
				"libraryCatalog": "Research Square",
				"shortTitle": "Peptide formation as on the early Earth",
				"url": "https://www.researchsquare.com/article/rs-629724/v1",
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
		"url": "https://www.researchsquare.com/article/rs-624370/v1",
		"items": [
			{
				"itemType": "report",
				"title": "A dual mechanism of action of AT-527 against SARS-CoV-2 polymerase",
				"creators": [
					{
						"lastName": "Canard",
						"creatorType": "author",
						"firstName": "Bruno"
					},
					{
						"lastName": "Shannon",
						"creatorType": "author",
						"firstName": "Ashleigh"
					},
					{
						"lastName": "Fattorini",
						"creatorType": "author",
						"firstName": "Veronique"
					},
					{
						"lastName": "Sama",
						"creatorType": "author",
						"firstName": "Bhawna"
					},
					{
						"lastName": "Selisko",
						"creatorType": "author",
						"firstName": "Barbara"
					},
					{
						"lastName": "Feracci",
						"creatorType": "author",
						"firstName": "Mikael"
					},
					{
						"lastName": "Falcou",
						"creatorType": "author",
						"firstName": "Camille"
					},
					{
						"lastName": "Gauffre",
						"creatorType": "author",
						"firstName": "Pierre"
					},
					{
						"lastName": "El-Kazzi",
						"creatorType": "author",
						"firstName": "Priscila"
					},
					{
						"lastName": "Decroly",
						"creatorType": "author",
						"firstName": "Etienne"
					},
					{
						"lastName": "Alvarez",
						"creatorType": "author",
						"firstName": "Karine"
					},
					{
						"lastName": "Eydoux",
						"creatorType": "author",
						"firstName": "Cecilia"
					},
					{
						"lastName": "Guillemot",
						"creatorType": "author",
						"firstName": "Jean-Claude"
					},
					{
						"lastName": "Moussa",
						"creatorType": "author",
						"firstName": "Adel"
					},
					{
						"lastName": "Good",
						"creatorType": "author",
						"firstName": "Steven"
					},
					{
						"lastName": "Colla",
						"creatorType": "author",
						"firstName": "Paolo La"
					},
					{
						"lastName": "Lin",
						"creatorType": "author",
						"firstName": "Kai"
					},
					{
						"lastName": "Sommadossi",
						"creatorType": "author",
						"firstName": "Jean-Pierre"
					},
					{
						"lastName": "Zhu",
						"creatorType": "author",
						"firstName": "Yingxao"
					},
					{
						"lastName": "Yan",
						"creatorType": "author",
						"firstName": "Xiaodong"
					},
					{
						"lastName": "Shi",
						"creatorType": "author",
						"firstName": "Hui"
					},
					{
						"lastName": "Ferron",
						"creatorType": "author",
						"firstName": "Francois"
					},
					{
						"lastName": "Delpal",
						"creatorType": "author",
						"firstName": "Adrien"
					}
				],
				"date": "July 19, 2021",
				"abstractNote": "A worldwide effort is ongoing to discover drugs against the Severe Acute Respiratory Syndrome coronavirus type 2 (SARS-CoV-2), which has so far caused &gt;3.5 million fatalities (https://covid19.who.int/). The virus essential RNA-dependent RNA polymerase complex is targeted by several nucleoside/tide analogues whose mechanisms of action and clinical potential are currently evaluated. The guanosine analogue AT-527, a double prodrug of its 5&#039;-triphosphate AT-9010, is currently in phase III clinical trials as a COVID19 treatment. Here we report the cryo-EM structure at 2.98 Å resolution of the SARS-CoV-2 nsp12-nsp7-(nsp8)2 complex with RNA showing AT-9010 bound at three sites of nsp12. At the RdRp active-site, one AT-9010 is incorporated into the RNA product. Its 2&#039;-methyl group prevents correct alignment of a second AT-9010 occupying the incoming NTP pocket. The 2&#039;-F, 2&#039;-methyl 3&#039;-OH ribose scaffold explains the non-obligate RNA chain-termination potency of this NA series for both HCV NS5 and SARS-CoV RTCs. A third AT-9010 molecule 5&#039;-diphosphate binds to a coronavirus-specific pocket in the nsp12 N-terminus NiRAN domain, a SelO pseudo-kinase structural and functional homologue. This unique binding mode impedes NiRAN-mediated UMPylation of SARS-CoV-2 nsp8 and nsp9 proteins. Our results suggest a mechanism of action for AT-527 in line with a therapeutic use for COVID19.",
				"extra": "Type: article",
				"libraryCatalog": "Research Square",
				"url": "https://www.researchsquare.com/article/rs-624370/v1",
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
		"url": "https://www.researchsquare.com/browse?offset=0&status=all&title=test",
		"items": "multiple"
	}
]
/** END TEST CASES **/
