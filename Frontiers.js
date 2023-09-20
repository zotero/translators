{
	"translatorID": "cb9e794e-7a65-47cd-90f6-58cdd191e8b0",
	"label": "Frontiers",
	"creator": "Abe Jellinek",
	"target": "^https?://[^./]+\\.frontiersin\\.org/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-09-20 08:19:47"
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
	var rows = doc.querySelectorAll('.article-card, .CardArticle > a');
	for (let row of rows) {
		let href = row.href;
		let title = text(row, "h1, h3"); // issue/topic listing, respectively
		if (!title) {
			title = ZU.trimInternal(row.textContent);
		}
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

async function doWeb(doc, url) {
	let supplementOpts = { attach: false, asLink: false };
	if (Z.getHiddenPref) {
		supplementOpts.attach = Z.getHiddenPref("attachSupplementary");
		supplementOpts.asLink = Z.getHiddenPref("supplementaryAsLink");
	}

	if (detectWeb(doc, url) == 'multiple') {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (!items) return;
		for (let url of Object.keys(items)) {
			// for indirect savign via multiple, use the bibTeX instead of the
			// document itself whenever possible, to save bandwidth
			await scrape(null, url, supplementOpts);
		}
	}
	else {
		await scrape(doc, url, supplementOpts);
	}
}

async function scrape(doc, url, supplementOpts) {
	let supplements = [];
	if (supplementOpts.attach) {
		// If we need supplements, we have to obtain the articleID (string of
		// numbers) that leads to their locations by inspecting the document.
		// This might be replaced by a more lightweight fetch if we knew how to
		// map DOI to articleID.
		if (!doc) {
			doc = await requestDocument(url);
		}
		let articleID = getArticleID(doc);
		// Skip the fetch of supplement info JSON (although lightweight) if
		// there's no supplement button on the page. Avoid the
		// "#supplementary_view" selector because it's a duplicated element id
		// (the page is malformed).
		if (doc.querySelector(".btn-open-supplemental") && articleID) {
			supplements = await getSupplements(articleID, supplementOpts.asLink);
		}
	}

	if (doc) {
		await translateEM(doc, supplements);
	}
	else {
		await translateBibTeX(url, supplements);
	}
}

async function translateEM(doc, supplements) {
	Z.debug("Frontiers: translating using Embedded Metadata");
	let translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);

	translator.setHandler('itemDone', (_obj, item) => {
		delete item.pages; // from meta citation_firstpage, not a page number
		item.libraryCatalog = "Frontiers";
		finalizeItem(item, getDOI(doc.location.href), supplements);
	});

	let em = await translator.getTranslatorObject();
	await em.doWeb(doc, doc.location.href);
}

async function translateBibTeX(url, supplements) {
	Z.debug("Frontiers: translating using bibTeX");
	let doi = getDOI(url);
	let bibTeXURL = `https://www.frontiersin.org/articles/${doi}/bibTex`;
	let bibText = await requestText(bibTeXURL);

	let translator = Zotero.loadTranslator("import");
	translator.setTranslator('9cb70025-a888-4a29-a210-93ec52da40d4'); // bibTeX
	translator.setString(bibText);

	translator.setHandler('itemDone', (_obj, item) => {
		finalizeItem(item, doi, supplements);
	});
	await translator.translate();
}

function finalizeItem(item, doi, supplements) {
	item.attachments = []; // delete EM snapshot if any; redundant with PDF
	if (doi) {
		item.attachments.push({
			title: 'Full Text PDF',
			url: `https://www.frontiersin.org/articles/${doi}/pdf`,
			mimeType: "application/pdf"
		});
	}
	item.attachments.push(...supplements);
	item.complete();
}

function getDOI(url) {
	let m = url.match(/https:\/\/[^/]+\.frontiersin\.org\/articles?\/(10\.\d{4,}\/[^/]+)/);
	return m && m[1];
}

function getArticleID(doc) {
	return attr(doc, "meta[name='citation_firstpage']", "content");
}

var MIME_TYPES = {
	txt: 'text/plain',
	csv: 'text/csv',
	bz2: 'application/x-bzip2',
	gz: 'application/gzip',
	zip: 'application/zip',
	pdf: 'application/pdf',
	doc: 'application/msword',
	docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	xls: 'application/vnd.ms-excel',
	xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
};

async function getSupplements(articleID, asLink) {
	let infoObj = await requestJSON(`https://www.frontiersin.org/articles/getsupplementaryfilesbyarticleid?articleid=${encodeURIComponent(articleID)}&ispublishedv2=false`);
	let attachments = [];
	let fileInfoArray;
	if (infoObj && infoObj.SupplimentalFileDetails
		&& (fileInfoArray = infoObj.SupplimentalFileDetails.FileDetails)) {
		for (let i = 0; i < fileInfoArray.length; i++) {
			let fileInfo = fileInfoArray[i];
			let url = fileInfo.FileDownloadUrl;
			if (!url) continue;

			let fileName = fileInfo.FileName;
			let fileExt = fileName.split(".").pop();
			if (fileExt) {
				fileExt = fileExt.toLowerCase();
			}
			let mimeType = MIME_TYPES[fileExt];

			// Save a link as attachment if hidden pref says so, or file
			// mimeType unknown
			let attachment = {
				title: fileName ? `Supplement - ${fileName}` : `Supplement ${i + 1}`,
				url,
				snapshot: !asLink && Boolean(mimeType),
			};
			if (mimeType) {
				attachment.mimeType = mimeType;
			}
			attachments.push(attachment);
		}
	}
	return attachments;
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
						"firstName": "Sébastien M.",
						"lastName": "Crouzet",
						"creatorType": "author"
					},
					{
						"firstName": "Thomas",
						"lastName": "Serre",
						"creatorType": "author"
					}
				],
				"date": "2011/11/15",
				"DOI": "10.3389/fpsyg.2011.00326",
				"ISSN": "1664-1078",
				"abstractNote": "Research progress in machine vision has been very significant in recent years. Robust face detection and identification algorithms are already readily available to consumers, and modern computer vision algorithms for generic object recognition are now coping with the richness and complexity of natural visual scenes. Unlike early vision models of object recognition that emphasized the role of figure-ground segmentation and spatial information between parts, recent successful approaches are based on the computation of loose collections of image features without prior segmentation or any explicit encoding of spatial relations. While these models remain simplistic models of visual processing, they suggest that, in principle, bottom-up activation of a loose collection of image features could support the rapid recognition of natural object categories and provide an initial coarse visual representation before more complex visual routines and attentional mechanisms take place. Focusing on biologically-plausible computational models of (bottom-up) pre-attentive visual recognition, we review some of the key visual features that have been described in the literature. We discuss the consistency of these feature-based representations with classical theories from visual psychology and test their ability to account for human performance on a rapid object categorization task.",
				"journalAbbreviation": "Front. Psychol.",
				"language": "English",
				"libraryCatalog": "Frontiers",
				"publicationTitle": "Frontiers in Psychology",
				"url": "https://www.frontiersin.org/articles/10.3389/fpsyg.2011.00326",
				"volume": "2",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Computational models"
					},
					{
						"tag": "Computer Vision"
					},
					{
						"tag": "feedforward"
					},
					{
						"tag": "rapid visual object recognition"
					},
					{
						"tag": "visual features"
					}
				],
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
						"firstName": "David H.",
						"lastName": "Keating",
						"creatorType": "author"
					},
					{
						"firstName": "Yaoping",
						"lastName": "Zhang",
						"creatorType": "author"
					},
					{
						"firstName": "Irene M.",
						"lastName": "Ong",
						"creatorType": "author"
					},
					{
						"firstName": "Sean",
						"lastName": "McIlwain",
						"creatorType": "author"
					},
					{
						"firstName": "Eduardo H.",
						"lastName": "Morales",
						"creatorType": "author"
					},
					{
						"firstName": "Jeffrey A.",
						"lastName": "Grass",
						"creatorType": "author"
					},
					{
						"firstName": "Mary",
						"lastName": "Tremaine",
						"creatorType": "author"
					},
					{
						"firstName": "William",
						"lastName": "Bothfeld",
						"creatorType": "author"
					},
					{
						"firstName": "Alan",
						"lastName": "Higbee",
						"creatorType": "author"
					},
					{
						"firstName": "Arne",
						"lastName": "Ulbrich",
						"creatorType": "author"
					},
					{
						"firstName": "Allison J.",
						"lastName": "Balloon",
						"creatorType": "author"
					},
					{
						"firstName": "Michael S.",
						"lastName": "Westphall",
						"creatorType": "author"
					},
					{
						"firstName": "Josh",
						"lastName": "Aldrich",
						"creatorType": "author"
					},
					{
						"firstName": "Mary S.",
						"lastName": "Lipton",
						"creatorType": "author"
					},
					{
						"firstName": "Joonhoon",
						"lastName": "Kim",
						"creatorType": "author"
					},
					{
						"firstName": "Oleg V.",
						"lastName": "Moskvin",
						"creatorType": "author"
					},
					{
						"firstName": "Yury V.",
						"lastName": "Bukhman",
						"creatorType": "author"
					},
					{
						"firstName": "Joshua J.",
						"lastName": "Coon",
						"creatorType": "author"
					},
					{
						"firstName": "Patricia J.",
						"lastName": "Kiley",
						"creatorType": "author"
					},
					{
						"firstName": "Donna M.",
						"lastName": "Bates",
						"creatorType": "author"
					},
					{
						"firstName": "Robert",
						"lastName": "Landick",
						"creatorType": "author"
					}
				],
				"date": "2014/08/13",
				"DOI": "10.3389/fmicb.2014.00402",
				"ISSN": "1664-302X",
				"abstractNote": "Efficient microbial conversion of lignocellulosic hydrolysates to biofuels is a key barrier to the economically viable deployment of lignocellulosic biofuels. A chief contributor to this barrier is the impact on microbial processes and energy metabolism of lignocellulose-derived inhibitors, including phenolic carboxylates, phenolic amides (for ammonia-pretreated biomass), phenolic aldehydes, and furfurals. To understand the bacterial pathways induced by inhibitors present in ammonia-pretreated biomass hydrolysates, which are less well studied than acid-pretreated biomass hydrolysates, we developed and exploited synthetic mimics of ammonia-pretreated corn stover hydrolysate (ACSH). To determine regulatory responses to the inhibitors normally present in ACSH, we measured transcript and protein levels in an Escherichia coli ethanologen using RNA-seq and quantitative proteomics during fermentation to ethanol of synthetic hydrolysates containing or lacking the inhibitors. Our study identified four major regulators mediating these responses, the MarA/SoxS/Rob network, AaeR, FrmR, and YqhC. Induction of these regulons was correlated with a reduced rate of ethanol production, buildup of pyruvate, depletion of ATP and NAD(P)H, and an inhibition of xylose conversion. The aromatic aldehyde inhibitor 5-hydroxymethylfurfural appeared to be reduced to its alcohol form by the ethanologen during fermentation whereas phenolic acid and amide inhibitors were not metabolized. Together, our findings establish that the major regulatory responses to lignocellulose-derived inhibitors are mediated by transcriptional rather than translational regulators, suggest that energy consumed for inhibitor efflux and detoxification may limit biofuel production, and identify a network of regulators for future synthetic biology efforts.",
				"journalAbbreviation": "Front. Microbiol.",
				"language": "English",
				"libraryCatalog": "Frontiers",
				"publicationTitle": "Frontiers in Microbiology",
				"url": "https://www.frontiersin.org/articles/10.3389/fmicb.2014.00402",
				"volume": "5",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Biofuels"
					},
					{
						"tag": "Escherichia coli"
					},
					{
						"tag": "Ethanol"
					},
					{
						"tag": "Proteomics"
					},
					{
						"tag": "RNAseq"
					},
					{
						"tag": "Transcriptomics"
					},
					{
						"tag": "aromatic inhibitors"
					},
					{
						"tag": "lignocellulosic hydrolysate"
					}
				],
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
						"firstName": "Ivan",
						"lastName": "Bermudez",
						"creatorType": "author"
					},
					{
						"firstName": "Daniel",
						"lastName": "Cleven",
						"creatorType": "author"
					},
					{
						"firstName": "Ralucca",
						"lastName": "Gera",
						"creatorType": "author"
					},
					{
						"firstName": "Erik T.",
						"lastName": "Kiser",
						"creatorType": "author"
					},
					{
						"firstName": "Timothy",
						"lastName": "Newlin",
						"creatorType": "author"
					},
					{
						"firstName": "Akrati",
						"lastName": "Saxena",
						"creatorType": "author"
					}
				],
				"date": "2019/06/25",
				"DOI": "10.3389/fdata.2019.00017",
				"ISSN": "2624-909X",
				"abstractNote": "Social Media platforms in Cyberspace provide communication channels for individuals, businesses, as well as state and non-state actors (i.e., individuals and groups) to conduct messaging campaigns. What are the spheres of influence that arose around the keyword \\textit{\\#Munich} on Twitter following an active shooter event at a Munich shopping mall in July $2016$? To answer that question in this work, we capture tweets utilizing \\textit{\\#Munich} beginning one hour after the shooting was reported, and the data collection ends approximately one month later~\\footnote{The collected dataset will be posted online for public use once the research work is published.}. We construct both daily networks and a cumulative network from this data. We analyze community evolution using the standard Louvain algorithm, and how the communities change over time to study how they both encourage and discourage the effectiveness of an information messaging campaign. We conclude that the large communities observed in the early stage of the data disappear from the \\textit{\\#Munich} conversation within seven days. The politically charged nature of many of these communities suggests their activity is migrated to other Twitter hashtags (i.e., conversation topics). Future analysis of Twitter activity might focus on tracking communities across topics and time.",
				"journalAbbreviation": "Front. Big Data",
				"language": "English",
				"libraryCatalog": "Frontiers",
				"publicationTitle": "Frontiers in Big Data",
				"shortTitle": "Twitter Response to Munich July 2016 Attack",
				"url": "https://www.frontiersin.org/articles/10.3389/fdata.2019.00017",
				"volume": "2",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Influence spread"
					},
					{
						"tag": "Munich July 2016 Attack"
					},
					{
						"tag": "Twitter data analysis"
					},
					{
						"tag": "meme propagation"
					},
					{
						"tag": "social network analysis"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.frontiersin.org/research-topics/9706/workshop-proceedings-of-the-13th-international-aaai-conference-on-web-and-social-media",
		"defer": true,
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.frontiersin.org/journals/digital-humanities/articles?type=24&section=913",
		"defer": true,
		"items": "multiple"
	}
]
/** END TEST CASES **/
