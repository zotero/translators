{
	"translatorID": "e4b51f32-bb3f-4d37-a46d-083efe534233",
	"label": "CERN Document Server",
	"creator": "Sebastian Karcher",
	"target": "^https?://cds\\.cern\\.ch/(search\\?|collection/|record/)",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-04-13 01:12:36"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2023 Sebastian Karcher

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
	if (url.includes('/record/')) {
		return getItemType(doc);
	}
	else if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

function getItemType(doc) {
	var type = text(doc, '.formatRecordHeader').trim();
	// These are the most important one, but could probably be expanded further
	switch (type) {
		case "Article":
			return "journalArticle";
		case "Thesis":
			return "thesis";
		case "Report":
			return "report";
		case "Book":
		case "Books":
			return "book";
		case "Preprint":
			return "preprint";
		case "Talks":
			return "presentation";
		default:
			return "document";
	}
}
function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('strong>a.titlelink');
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

async function doWeb(doc, url) {
	if (detectWeb(doc, url) == 'multiple') {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (!items) return;
		for (let url of Object.keys(items)) {
			await scrape(await requestDocument(url));
		}
	}
	else {
		await scrape(doc, url);
	}
}

async function scrape(doc, url = doc.location.href) {
	var pdfUrl = attr(doc, '#detailedrecordminipanelfile a[href*=".pdf"]', 'href');
	var abstract = attr(doc, 'meta[property="og:description"]', 'content');
	var thesisUniversity = attr(doc, 'meta[name="citation_dissertation_institution"]', 'content');
	// Z.debug(pdfUrl);
	let bibUrl = url.replace(/[#?].*/, "") + '/export/hx?ln=en';
	let bibText = await requestText(bibUrl);
	bibText = bibText.match(/<pre>([\s\S]+?)<\/pre>/)[1];
	// Z.debug(bibText)
	let translator = Zotero.loadTranslator("import");
	translator.setTranslator('9cb70025-a888-4a29-a210-93ec52da40d4');
	translator.setString(bibText);
	translator.setHandler('itemDone', (_obj, item) => {
		if (pdfUrl) {
			item.attachments.push({ url: pdfUrl, title: "Full Text PDF", mimeType: "application/pdf" });
		}
		delete item.itemID;
		if (item.itemType == "thesis" && !item.university) {
			item.university = thesisUniversity;
		}
		item.abstractNote = abstract;
		item.itemType = getItemType(doc);
		item.extra = "";
		item.complete();
	});
	await translator.translate();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://cds.cern.ch/search?ln=en&sc=1&p=testing&action_search=Search&op1=a&m1=a&p1=&f1=&c=Articles+%26+Preprints&c=Books+%26+Proceedings&c=Presentations+%26+Talks&c=Periodicals+%26+Progress+Reports&c=Multimedia+%26+Outreach&c=International+Collaborations",
		"detectedItemType": "multiple",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://cds.cern.ch/record/2855572?ln=en",
		"detectedItemType": "preprint",
		"items": [
			{
				"itemType": "preprint",
				"title": "A short history of Internet protocols at CERN",
				"creators": [
					{
						"firstName": "Ben",
						"lastName": "Segal",
						"creatorType": "author"
					}
				],
				"date": "1995",
				"libraryCatalog": "CERN Document Server",
				"place": "Geneva",
				"repository": "CERN",
				"url": "https://cds.cern.ch/record/2855572",
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
		"url": "https://cds.cern.ch/collection/Published%20Articles?ln=en",
		"detectedItemType": "multiple",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://cds.cern.ch/record/2855446?ln=de",
		"detectedItemType": "journalArticle",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Production of Σ⁰ Hyperon and Search of Σ⁰ Hypernuclei at LHC with ALICE",
				"creators": [
					{
						"firstName": "Alexander",
						"lastName": "Borissov",
						"creatorType": "author"
					},
					{
						"firstName": "Sergei",
						"lastName": "Solokhin",
						"creatorType": "author"
					}
				],
				"date": "2023",
				"DOI": "10.1134/S1063778823010131",
				"abstractNote": "The first measurements of the transverse momentum ($p_{{{T}}}$) spectra and integrated yields and mean $p_{{T}}$ of $\\Sigma^{0}$ and $\\overline{\\Sigma}^{0}$ hyperons in $pp$ collisions at $\\sqrt{s}=7$ TeV at the LHC are presented. The $\\Sigma^{0}$($\\overline{\\Sigma}^{0}$) is reconstructed via its electromagnetic decay channel $\\Lambda$($\\overline{\\Lambda})+\\gamma$. The $\\Lambda$ ($\\overline{\\Lambda}$) baryon is reconstructed via its decay into $p+\\pi^{-}$ ($\\overline{{{p}}}+\\pi^{+}$), while the photon is detected by exploiting the unique capability of the ALICE detector to measure low-energy photons via conversion into $e^{+}e^{-}$ pairs in the detector material. The yield of $\\Sigma^{0}$ is compared to that of the $\\Lambda$ baryon, which has the same quark content but different isospin. These data contribute to the understanding of hadron production mechanisms and provide a reference for constraining QCD-inspired models and tuning Monte Carlo event generators such as PYTHIA. In addition, the feasibility of a search for a bound state of proton, neutron and $\\Sigma^{0}$($\\Sigma^{0}$ hypernuclei ${}^{3}_{\\Sigma^{0}}$H) is presented, based on the luminosities foreseen for the LHC Runs 3 and 4.",
				"issue": "6",
				"libraryCatalog": "CERN Document Server",
				"pages": "970-975",
				"publicationTitle": "Phys. At. Nucl.",
				"url": "https://cds.cern.ch/record/2855446",
				"volume": "85",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://cds.cern.ch/record/2854594?ln=en",
		"detectedItemType": "report",
		"items": [
			{
				"itemType": "report",
				"title": "Notes on the machine studies team informal seminars on transitional phenomena",
				"creators": [
					{
						"firstName": "O",
						"lastName": "Barbalat",
						"creatorType": "author"
					}
				],
				"date": "1968",
				"institution": "CERN",
				"libraryCatalog": "CERN Document Server",
				"place": "Geneva",
				"url": "https://cds.cern.ch/record/2854594",
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
		"url": "https://cds.cern.ch/record/2854931?ln=en",
		"detectedItemType": "thesis",
		"items": [
			{
				"itemType": "thesis",
				"title": "Pathlength-dependent jet quenching in the quark–gluon plasma at ALICE",
				"creators": [
					{
						"firstName": "Caitlin",
						"lastName": "Beattie",
						"creatorType": "author"
					}
				],
				"date": "2023",
				"abstractNote": "At extremely high temperatures, the quarks and gluons that compose the fundamental building blocks of our universe undergo a phase transition from stable hadronic matter to become a deconfined quark--gluon plasma (QGP). One way to study this medium is through collisions of heavy ions, where extraordinarily high energy densities produce just such a deconfined state. Of particular interest are jets, collimated showers of hadrons that originate early in the collision and undergo modification as they traverse the QGP, thus probing the medium's properties and enabling the study of quantum chromodynamics at multiple scales. Notably, jets lose energy as they propagate through the medium, the pathlength dependence of which remains an open question. The answer is of significant interest, however, given that quantitative constraints on this dependence are closely related to the underlying mechanisms that drive jet quenching phenomena. This thesis will discuss the first measurement of jets using a technique known as event-shape engineering (ESE), a measurement made in an effort to constrain the pathlength dependence of jet energy loss. For this thesis, charged jets were measured in Pb--Pb collisions using the ALICE detector at the CERN Large Hadron Collider. These jets were then classified according to their angle with respect to the event plane, as well as the shape of the event that they traversed. No sensitivity of the jet spectra to the event shape was observed; however, the yields were seen to be dependent on the event-plane angle. Moreover, this dependence was stronger for highly-elliptical events and weaker for highly-isotropic events. Such results are consistent with descriptions of pathlength distributions that were studied in Trajectum and the assumption that jets lose energy in a pathlength-dependent manner. Further theoretical models are required to extract quantitative constraints from this study.",
				"libraryCatalog": "CERN Document Server",
				"university": "Yale University (US)",
				"url": "https://cds.cern.ch/record/2854931",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "<p>Presented 07 Mar 2023</p>"
					}
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
