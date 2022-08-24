{
	"translatorID": "cb9e794e-7a65-47cd-90f6-58cdd191e8b0",
	"label": "Frontiers",
	"creator": "Abe Jellinek",
	"target": "^https?://[^./]+\\.frontiersin\\.org/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-04-02 19:36:06"
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
	if (doc.querySelector('meta[name^="citation_"]')) {
		return "journalArticle";
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	// actual search result pages don't use <a> tags and instead emulate tags
	// with JS onclick, so this is just for topics/collections
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.article-list .teaser-heading a');
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
	let risURL = attr(doc, '.citation a[href$="/reference"]', 'href');
	if (!risURL) {
		risURL = url.replace(/\/full([?#].*)?$/, '/reference');
	}
	let pdfURL = attr(doc, '.download-files-pdf', 'href');
	if (!pdfURL) {
		pdfURL = url.replace(/\/full([?#].*)?$/, '/pdf');
	}
	
	ZU.doGet(risURL, function (risText) {
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7"); // RIS
		translator.setString(risText);
		translator.setHandler("itemDone", function (obj, item) {
			if (pdfURL) {
				item.attachments.push({
					url: pdfURL,
					title: 'Full Text PDF',
					mimeType: 'application/pdf'
				});
			}
			
			if (item.journalAbbreviation == item.publicationTitle) {
				delete item.journalAbbreviation;
			}
			
			item.complete();
		});
		translator.translate();
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.frontiersin.org/articles/10.3389/fpsyg.2011.00326/full",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "What are the Visual Features Underlying Rapid Object Recognition?",
				"creators": [
					{
						"lastName": "Crouzet",
						"firstName": "Sébastien",
						"creatorType": "author"
					},
					{
						"lastName": "Serre",
						"firstName": "Thomas",
						"creatorType": "author"
					}
				],
				"date": "2011",
				"DOI": "10.3389/fpsyg.2011.00326",
				"ISSN": "1664-1078",
				"abstractNote": "Research progress in machine vision has been very significant in recent years. Robust face detection and identification algorithms are already readily available to consumers, and modern computer vision algorithms for generic object recognition are now coping with the richness and complexity of natural visual scenes. Unlike early vision models of object recognition that emphasized the role of figure-ground segmentation and spatial information between parts, recent successful approaches are based on the computation of loose collections of image features without prior segmentation or any explicit encoding of spatial relations. While these models remain simplistic models of visual processing, they suggest that, in principle, bottom-up activation of a loose collection of image features could support the rapid recognition of natural object categories and provide an initial coarse visual representation before more complex visual routines and attentional mechanisms take place. Focusing on biologically plausible computational models of (bottom-up) pre-attentive visual recognition, we review some of the key visual features that have been described in the literature. We discuss the consistency of these feature-based representations with classical theories from visual psychology and test their ability to account for human performance on a rapid object categorization task.",
				"libraryCatalog": "Frontiers",
				"pages": "326",
				"publicationTitle": "Frontiers in Psychology",
				"url": "https://www.frontiersin.org/article/10.3389/fpsyg.2011.00326",
				"volume": "2",
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
		"url": "https://www.frontiersin.org/articles/10.3389/fmicb.2014.00402/full",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Aromatic inhibitors derived from ammonia-pretreated lignocellulose hinder bacterial ethanologenesis by activating regulatory circuits controlling inhibitor efflux and detoxification",
				"creators": [
					{
						"lastName": "Keating",
						"firstName": "David H.",
						"creatorType": "author"
					},
					{
						"lastName": "Zhang",
						"firstName": "Yaoping",
						"creatorType": "author"
					},
					{
						"lastName": "Ong",
						"firstName": "Irene M.",
						"creatorType": "author"
					},
					{
						"lastName": "McIlwain",
						"firstName": "Sean",
						"creatorType": "author"
					},
					{
						"lastName": "Morales",
						"firstName": "Eduardo H.",
						"creatorType": "author"
					},
					{
						"lastName": "Grass",
						"firstName": "Jeffrey A.",
						"creatorType": "author"
					},
					{
						"lastName": "Tremaine",
						"firstName": "Mary",
						"creatorType": "author"
					},
					{
						"lastName": "Bothfeld",
						"firstName": "William",
						"creatorType": "author"
					},
					{
						"lastName": "Higbee",
						"firstName": "Alan",
						"creatorType": "author"
					},
					{
						"lastName": "Ulbrich",
						"firstName": "Arne",
						"creatorType": "author"
					},
					{
						"lastName": "Balloon",
						"firstName": "Allison J.",
						"creatorType": "author"
					},
					{
						"lastName": "Westphall",
						"firstName": "Michael S.",
						"creatorType": "author"
					},
					{
						"lastName": "Aldrich",
						"firstName": "Josh",
						"creatorType": "author"
					},
					{
						"lastName": "Lipton",
						"firstName": "Mary S.",
						"creatorType": "author"
					},
					{
						"lastName": "Kim",
						"firstName": "Joonhoon",
						"creatorType": "author"
					},
					{
						"lastName": "Moskvin",
						"firstName": "Oleg V.",
						"creatorType": "author"
					},
					{
						"lastName": "Bukhman",
						"firstName": "Yury V.",
						"creatorType": "author"
					},
					{
						"lastName": "Coon",
						"firstName": "Joshua J.",
						"creatorType": "author"
					},
					{
						"lastName": "Kiley",
						"firstName": "Patricia J.",
						"creatorType": "author"
					},
					{
						"lastName": "Bates",
						"firstName": "Donna M.",
						"creatorType": "author"
					},
					{
						"lastName": "Landick",
						"firstName": "Robert",
						"creatorType": "author"
					}
				],
				"date": "2014",
				"DOI": "10.3389/fmicb.2014.00402",
				"ISSN": "1664-302X",
				"abstractNote": "Efficient microbial conversion of lignocellulosic hydrolysates to biofuels is a key barrier to the economically viable deployment of lignocellulosic biofuels. A chief contributor to this barrier is the impact on microbial processes and energy metabolism of lignocellulose-derived inhibitors, including phenolic carboxylates, phenolic amides (for ammonia-pretreated biomass), phenolic aldehydes, and furfurals. To understand the bacterial pathways induced by inhibitors present in ammonia-pretreated biomass hydrolysates, which are less well studied than acid-pretreated biomass hydrolysates, we developed and exploited synthetic mimics of ammonia-pretreated corn stover hydrolysate (ACSH). To determine regulatory responses to the inhibitors normally present in ACSH, we measured transcript and protein levels in an Escherichia coli ethanologen using RNA-seq and quantitative proteomics during fermentation to ethanol of synthetic hydrolysates containing or lacking the inhibitors. Our study identified four major regulators mediating these responses, the MarA/SoxS/Rob network, AaeR, FrmR, and YqhC. Induction of these regulons was correlated with a reduced rate of ethanol production, buildup of pyruvate, depletion of ATP and NAD(P)H, and an inhibition of xylose conversion. The aromatic aldehyde inhibitor 5-hydroxymethylfurfural appeared to be reduced to its alcohol form by the ethanologen during fermentation, whereas phenolic acid and amide inhibitors were not metabolized. Together, our findings establish that the major regulatory responses to lignocellulose-derived inhibitors are mediated by transcriptional rather than translational regulators, suggest that energy consumed for inhibitor efflux and detoxification may limit biofuel production, and identify a network of regulators for future synthetic biology efforts.",
				"libraryCatalog": "Frontiers",
				"pages": "402",
				"publicationTitle": "Frontiers in Microbiology",
				"url": "https://www.frontiersin.org/article/10.3389/fmicb.2014.00402",
				"volume": "5",
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
		"url": "https://www.frontiersin.org/articles/10.3389/fdata.2019.00017/full",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Twitter Response to Munich July 2016 Attack: Network Analysis of Influence",
				"creators": [
					{
						"lastName": "Bermudez",
						"firstName": "Ivan",
						"creatorType": "author"
					},
					{
						"lastName": "Cleven",
						"firstName": "Daniel",
						"creatorType": "author"
					},
					{
						"lastName": "Gera",
						"firstName": "Ralucca",
						"creatorType": "author"
					},
					{
						"lastName": "Kiser",
						"firstName": "Erik T.",
						"creatorType": "author"
					},
					{
						"lastName": "Newlin",
						"firstName": "Timothy",
						"creatorType": "author"
					},
					{
						"lastName": "Saxena",
						"firstName": "Akrati",
						"creatorType": "author"
					}
				],
				"date": "2019",
				"DOI": "10.3389/fdata.2019.00017",
				"ISSN": "2624-909X",
				"abstractNote": "Social Media platforms in Cyberspace provide communication channels for individuals, businesses, as well as state and non-state actors (i.e., individuals and groups) to conduct messaging campaigns. What are the spheres of influence that arose around the keyword #Munich on Twitter following an active shooter event at a Munich shopping mall in July 2016? To answer that question in this work, we capture tweets utilizing #Munich beginning 1 h after the shooting was reported, and the data collection ends approximately 1 month later1. We construct both daily networks and a cumulative network from this data. We analyze community evolution using the standard Louvain algorithm, and how the communities change over time to study how they both encourage and discourage the effectiveness of an information messaging campaign. We conclude that the large communities observed in the early stage of the data disappear from the #Munich conversation within 7 days. The politically charged nature of many of these communities suggests their activity is migrated to other Twitter hashtags (i.e., conversation topics). Future analysis of Twitter activity might focus on tracking communities across topics and time.",
				"libraryCatalog": "Frontiers",
				"pages": "17",
				"publicationTitle": "Frontiers in Big Data",
				"shortTitle": "Twitter Response to Munich July 2016 Attack",
				"url": "https://www.frontiersin.org/article/10.3389/fdata.2019.00017",
				"volume": "2",
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
		"url": "https://www.frontiersin.org/research-topics/9706/workshop-proceedings-of-the-13th-international-aaai-conference-on-web-and-social-media",
		"items": "multiple"
	}
]
/** END TEST CASES **/
