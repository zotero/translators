{
	"translatorID": "5f22bd25-5b70-11e1-bb1d-c4f24aa18c1e",
	"label": "Annual Reviews",
	"creator": "Aurimas Vinckevicius and Abe Jellinek",
	"target": "^https?://[^/]*annualreviews\\.org(:[\\d]+)?(?=/)[^?]*(/(toc|journal|doi)/|showMost(Read|Cited)Articles|doSearch)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 150,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-08-02 12:48:22"
}

/**
	Copyright (c) 2012-2021 Aurimas Vinckevicius and Abe Jellinek

	This program is free software: you can redistribute it and/or
	modify it under the terms of the GNU Affero General Public License
	as published by the Free Software Foundation, either version 3 of
	the License, or (at your option) any later version.

	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
	Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public
	License along with this program.  If not, see
	<http://www.gnu.org/licenses/>.
*/

// add using BibTex
function addByBibTex(doi, tags) {
	var baseUrl = 'http://www.annualreviews.org';
	var risRequest = baseUrl + '/action/downloadCitation';
	var pdfUrl = baseUrl + '/doi/pdf/' + doi;

	var postData = 'include=abs&direct=on&submit=Download+chapter+metadata&downloadFileName=citation'
			+ '&format=bibtex'		// bibtex
			+ '&doi=' + encodeURIComponent(doi);

	Zotero.Utilities.HTTP.doPost(risRequest, postData, function (text) {
		var translator = Zotero.loadTranslator('import');
		translator.setTranslator('9cb70025-a888-4a29-a210-93ec52da40d4');	// bibtex
		translator.setString(text);

		translator.setHandler('itemDone', function (obj, item) {
			// title is sometimes in all caps
			if (item.title == item.title.toUpperCase()) item.title = ZU.capitalizeTitle(item.title, true);
			if (item.abstractNote) {
				item.abstractNote = item.abstractNote.replace(/^...?Abstract/, "");
			}
			// add tags
			if (tags) {
				item.tags = tags;
			}

			// set PDF file
			item.attachments = [{
				url: pdfUrl,
				title: 'Full Text PDF',
				mimeType: 'application/pdf'
			}];

			item.complete();
		});

		translator.translate();
	});
}

function detectWeb(doc, url) {
	if (/\/doi\/(abs|full|pdf|10\.)/.test(url)) {
		return 'journalArticle';
	}
	else if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.articleBoxWrapper');
	if (!rows.length) rows = doc.querySelectorAll('.teaser');
	for (let row of rows) {
		let doi = attr(row, 'input[name="doi"]', 'value');
		if (!doi) doi = ZU.cleanDOI(attr(row, 'h2 > a', 'href'));
		let title = ZU.trimInternal(text(row, 'h2 > a'));
		if (!doi || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[doi] = title;
	}
	return found ? items : false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (items) Object.keys(items).forEach(addByBibTex);
		});
	}
	else {
		scrape(doc, url);
	}
}


function scrape(doc, url) {
	// match both /doi/abs/10.1146 (etc.) and /doi/10.1146
	var match = url.match(/\/(?:doi)\/(?:abs|full|pdf)?\/?([^?]+)/);
	if (match) {
		let tags = attr(doc, 'meta[name="dc.Subject"]', 'content')
			.split('; ')
			.map(tag => ({ tag }));
		addByBibTex(match[1], tags);
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.annualreviews.org/action/doSearch?pageSize=20&sortBy=relevancy&text1=something&field1=AllField&logicalOpe1=and&text2=&field2=Abstract&logicalOpe2=and&text3=&field3=Title&filterByPub=all&publication=1449&AfterYear=&BeforeYear=",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.annualreviews.org/journal/biophys",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.annualreviews.org/toc/biophys/40/1",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.annualreviews.org/action/showMostCitedArticles?topArticlesType=sinceInception&journalCode=biophys",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.annualreviews.org/action/showMostReadArticles?topArticlesType=sinceInception&journalCode=biophys",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.annualreviews.org/doi/abs/10.1146/annurev.biophys.29.1.545?prevSearch=&searchHistoryKey=",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Molecular Mechanisms Controlling Actin Filament Dynamics in Nonmuscle Cells",
				"creators": [
					{
						"firstName": "Thomas D.",
						"lastName": "Pollard",
						"creatorType": "author"
					},
					{
						"firstName": "Laurent",
						"lastName": "Blanchoin",
						"creatorType": "author"
					},
					{
						"firstName": "R. Dyche",
						"lastName": "Mullins",
						"creatorType": "author"
					}
				],
				"date": "2000",
				"DOI": "10.1146/annurev.biophys.29.1.545",
				"abstractNote": "We review how motile cells regulate actin filament assembly at their leading edge. Activation of cell surface receptors generates signals (including activated Rho family GTPases) that converge on integrating proteins of the WASp family (WASp, N-WASP, and Scar/WAVE). WASP family proteins stimulate Arp2/3 complex to nucleate actin filaments, which grow at a fixed 70° angle from the side of pre-existing actin filaments. These filaments push the membrane forward as they grow at their barbed ends. Arp2/3 complex is incorporated into the network, and new filaments are capped rapidly, so that activated Arp2/3 complex must be supplied continuously to keep the network growing. Hydrolysis of ATP bound to polymerized actin followed by phosphate dissociation marks older filaments for depolymerization by ADF/cofilins. Profilin catalyzes exchange of ADP for ATP, recycling actin back to a pool of unpolymerized monomers bound to profilin and thymosin-β4 that is poised for rapid elongation of new barbed ends.",
				"extra": "PMID: 10940259",
				"issue": "1",
				"itemID": "doi:10.1146/annurev.biophys.29.1.545",
				"libraryCatalog": "Annual Reviews",
				"pages": "545-576",
				"publicationTitle": "Annual Review of Biophysics and Biomolecular Structure",
				"url": "https://doi.org/10.1146/annurev.biophys.29.1.545",
				"volume": "29",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "ADF/cofilins"
					},
					{
						"tag": "Arp2/3 complex"
					},
					{
						"tag": "WASp"
					},
					{
						"tag": "cell motility"
					},
					{
						"tag": "profilin"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.annualreviews.org/toc/anchem/5/1",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.annualreviews.org/toc/linguistics/current",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.annualreviews.org/doi/abs/10.1146/annurev-linguistics-081720-111352",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Linguistics Then and Now: Some Personal Reflections",
				"creators": [
					{
						"firstName": "Noam",
						"lastName": "Chomsky",
						"creatorType": "author"
					}
				],
				"date": "2021",
				"DOI": "10.1146/annurev-linguistics-081720-111352",
				"abstractNote": "By mid-twentieth century, a working consensus had been reached in the linguistics community, based on the great achievements of preceding years. Synchronic linguistics had been established as a science, a “taxonomic” science, with sophisticated procedures of analysis of data. Taxonomic science has limits. It does not ask “why?” The time was ripe to seek explanatory theories, using insights provided by the theory of computation and studies of explanatory depth. That effort became the generative enterprise within the biolinguistics framework. Tensions quickly arose: The elements of explanatory theories (generative grammars) were far beyond the reach of taxonomic procedures. The structuralist principle that language is a matter of training and habit, extended by analogy, was unsustainable. More generally, the mood of “virtually everything is known” became “almost nothing is understood,” a familiar phenomenon in the history of science, opening a new and exciting era for a flourishing discipline.",
				"issue": "1",
				"itemID": "doi:10.1146/annurev-linguistics-081720-111352",
				"libraryCatalog": "Annual Reviews",
				"pages": "1-11",
				"publicationTitle": "Annual Review of Linguistics",
				"shortTitle": "Linguistics Then and Now",
				"url": "https://doi.org/10.1146/annurev-linguistics-081720-111352",
				"volume": "7",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "autobiography"
					},
					{
						"tag": "biolinguistics program"
					},
					{
						"tag": "explanatory linguistic theory"
					},
					{
						"tag": "explanatory theories"
					},
					{
						"tag": "generative enterprise"
					},
					{
						"tag": "history of linguistics"
					},
					{
						"tag": "history of science"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.annualreviews.org/doi/10.1146/annurev-physchem-040513-103712",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Phase Separation in Bulk Heterojunctions of Semiconducting Polymers and Fullerenes for Photovoltaics",
				"creators": [
					{
						"firstName": "Neil D.",
						"lastName": "Treat",
						"creatorType": "author"
					},
					{
						"firstName": "Michael L.",
						"lastName": "Chabinyc",
						"creatorType": "author"
					}
				],
				"date": "2014",
				"DOI": "10.1146/annurev-physchem-040513-103712",
				"abstractNote": "Thin-film solar cells are an important source of renewable energy. The most efficient thin-film solar cells made with organic materials are blends of semiconducting polymers and fullerenes called the bulk heterojunction (BHJ). Efficient BHJs have a nanoscale phase-separated morphology that is formed during solution casting. This article reviews recent work to understand the nature of the phase-separation process resulting in the formation of the domains in polymer-fullerene BHJs. The BHJ is now viewed as a mixture of polymer-rich, fullerene-rich, and mixed polymer-fullerene domains. The formation of this structure can be understood through fundamental knowledge of polymer physics. The implications of this structure for charge transport and charge generation are given.",
				"extra": "PMID: 24689796",
				"issue": "1",
				"itemID": "doi:10.1146/annurev-physchem-040513-103712",
				"libraryCatalog": "Annual Reviews",
				"pages": "59-81",
				"publicationTitle": "Annual Review of Physical Chemistry",
				"url": "https://doi.org/10.1146/annurev-physchem-040513-103712",
				"volume": "65",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "organic electronics"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
