{
	"translatorID": "92d4ed84-8d0-4d3c-941f-d4b9124cfbb",
	"label": "IEEE Xplore",
	"creator": "Simon Kornblith, Michael Berkowitz, Bastian Koenings, and Avram Lyon",
	"target": "^https?://([^/]+\\.)?ieeexplore\\.ieee\\.org/([^#]+[&?]arnumber=\\d+|(abstract/)?document/|search/(searchresult|selected)\\.jsp|xpl/(mostRecentIssue|tocresult)\\.jsp\\?|xpl/conhome/\\d+/proceeding)",
	"minVersion": "4.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-04-04 18:55:24"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2023 Simon Kornblith, Michael Berkowitz, Bastian Koenings, and Avram Lyon

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
	var wrapper = doc.querySelector('.global-content-wrapper');
	if (wrapper) {
		Zotero.monitorDOMChanges(wrapper);
	}
	
	if (/[?&]arnumber=(\d+)/i.test(url) || /\/document\/\d+/i.test(url)) {
		var firstBreadcrumb = ZU.xpathText(doc, '(//div[contains(@class, "breadcrumbs")]//a)[1]');
		if (firstBreadcrumb == "Conferences") {
			return "conferencePaper";
		}
		return "journalArticle";
	}
	
	// Issue page
	if ((url.includes("xpl/tocresult.jsp") || url.includes("xpl/mostRecentIssue.jsp")) && getSearchResults(doc, true)) {
		return getSearchResults(doc, true) ? "multiple" : false;
	}
	
	// Search results
	if (url.includes("/search/searchresult.jsp") && getSearchResults(doc, true)) {
		return "multiple";
	}
	
	// conference list results
	if (url.includes("xpl/conhome") && url.includes("proceeding") && getSearchResults(doc, true)) {
		return "multiple";
	}

	// more generic method for other cases (is this still needed?)
	/*
	var scope = ZU.xpath(doc, '//div[contains(@class, "ng-scope")]')[0];
	if (!scope) {
		Zotero.debug("No scope");
		return;
	}
	
	Z.monitorDOMChanges(scope, {childList: true});

	if (getSearchResults(doc, true)) {
		return "multiple";
	}
	*/
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//*[contains(@class, "article-list") or contains(@class, "List-results-items")]//a[parent::h2|parent::h3]|//*[@id="results-blk"]//*[@class="art-abs-url"]');
	for (var i = 0; i < rows.length; i++) {
		var href = rows[i].href;
		var title = ZU.trimInternal(rows[i].textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[fixUrl(href)] = title;
	}
	return found ? items : false;
}

// Some pages don't show the metadata we need (http://forums.zotero.org/discussion/16283)
// No data: http://ieeexplore.ieee.org/search/srchabstract.jsp?tp=&arnumber=1397982
// No data: http://ieeexplore.ieee.org/stamp/stamp.jsp?tp=&arnumber=1397982
// Data: http://ieeexplore.ieee.org/xpls/abs_all.jsp?arnumber=1397982
// Also address issue of saving from PDF itself, I hope
// URL like http://ieeexplore.ieee.org/ielx4/78/2655/00080767.pdf?tp=&arnumber=80767&isnumber=2655
// Or: http://ieeexplore.ieee.org/stamp/stamp.jsp?tp=&arnumber=1575188&tag=1
function fixUrl(url) {
	var arnumber = url.match(/arnumber=(\d+)/);
	if (arnumber) {
		return url.replace(/\/(?:search|stamp|ielx[45])\/.*$/, "/xpls/abs_all.jsp?arnumber=" + arnumber[1]);
	}
	else {
		return url;
	}
}


async function doWeb(doc, url) {
	if (detectWeb(doc, url) == 'multiple') {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (!items) return;
		for (let url of Object.keys(items)) {
			await scrape(await requestDocument(url));
		}
	}
	else if (url.includes("/search/") || url.includes("/stamp/") || url.includes("/ielx4/") || url.includes("/ielx5/")) {
		await scrape(await requestDocument(fixUrl(url)));
	}
	else {
		await scrape(doc, url);
	}
}


async function scrape(doc, url = doc.location.href) {
	var arnumber = (url.match(/arnumber=(\d+)/) || url.match(/\/document\/(\d+)/))[1];
	// Z.debug("arNumber = " + arnumber);
	
	var script = ZU.xpathText(doc, '//script[@type="text/javascript" and contains(., "global.document.metadata")]');
	if (script) {
		var dataRaw = script.split("global.document.metadata")[1]
.replace(/^=/, '').replace(/};[\s\S]*$/m, '}');
		try {
			var data = JSON.parse(dataRaw);
		}
		catch (e) {
			Z.debug("Error parsing JSON data:");
			Z.debug(e);
		}
	}
	
	
	let bibtexURL = "/rest/search/citation/format?recordIds=" + arnumber + "&fromPage=&citations-format=citation-abstract&download-format=download-bibtex";
	Z.debug(bibtexURL);
	// metadata is downloaded in a JSON data field
	let bibtex = await requestJSON(bibtexURL, { headers: { Referer: url} });
	bibtex = bibtex.data;
	bibtex = ZU.unescapeHTML(bibtex.replace(/(&[^\s;]+) and/g, '$1;'));
	// remove empty tag - we can take this out once empty tags are ignored
	bibtex = bibtex.replace(/(keywords=\{.+);\}/, "$1}");
	var earlyaccess = false;
	if (/^@null/.test(bibtex)) {
		earlyaccess = true;
		bibtex = text.replace(/^@null/, "@article");
	}

	let pdfGatewayURL = "/stamp/stamp.jsp?tp=&arnumber=" + arnumber;
	let pdfURL;
	try {
		let src = await requestDocument(pdfGatewayURL);
		// Either the PDF is embedded in the page, or (e.g. for iOS)
		// the page has a redirect to the full-page PDF
		//
		// As of 3/2020, embedded PDFs via a web-based proxy are
		// being served as getPDF.jsp, so support that in addition
		// to direct .pdf URLs.
		let m = /<i?frame src="([^"]+\.pdf\b[^"]*|[^"]+\/getPDF\.jsp\b[^"]*)"|<meta HTTP-EQUIV="REFRESH" content="0; url=([^\s"]+\.pdf\b[^\s"]*)"/.exec(src);
		pdfURL = m && (m[1] || m[2]);
	}
	catch (e) {
	}

	if (!pdfURL) {
		pdfURL = "/stampPDF/getPDF.jsp?tp=&arnumber=" + arnumber + "&ref=";
	}

	var translator = Zotero.loadTranslator("import");
	// Calling the BibTeX translator
	translator.setTranslator("9cb70025-a888-4a29-a210-93ec52da40d4");
	translator.setString(bibtex);
	translator.setHandler("itemDone", function (obj, item) {
		item.notes = [];
		var res;
		// Rearrange titles, per http://forums.zotero.org/discussion/8056
		// If something has a comma or a period, and the text after comma ends with
		// "of", "IEEE", or the like, then we switch the parts. Prefer periods.
		if (item.publicationTitle.includes(".")) {
			res = item.publicationTitle.trim().match(/^(.*)\.(.*(?:of|on|IEE|IEEE|IET|IRE))$/);
		}
		else {
			res = item.publicationTitle.trim().match(/^(.*),(.*(?:of|on|IEE|IEEE|IET|IRE))$/);
		}
		if (res) {
			item.publicationTitle = res[2] + " " + res[1];
		}
		if (item.publicationTitle) {
			item.publicationTitle = item.publicationTitle.replace(/\(IEEE Cat\. No\.\s*[A-Z0-9]+\)/, '');
		}
		if (item.itemType === "conferencePaper") {
			item.proceedingsTitle = item.publicationTitle;
			delete item.publicationTitle;

			item.conferenceName = item.proceedingsTitle.replace(/\.?\s*proceedings( of)?/i, '');
		}
		if (earlyaccess) {
			item.volume = "Early Access Online";
			item.issue = "";
			item.pages = "";
		}
			
		if (data && data.authors && data.authors.length == item.creators.length) {
			item.creators = [];
			for (let author of data.authors) {
				item.creators.push({
					firstName: author.firstName,
					lastName: author.lastName,
					creatorType: "author"
				});
			}
		}
			
		if (!item.ISSN && data && data.issn) {
			item.ISSN = data.issn.map(el => el.value).join(", ");
		}
		if (item.ISSN && !ZU.fieldIsValidForType('ISSN', item.itemType)) {
			item.extra = "ISSN: " + item.ISSN;
		}
		item.url = url
			// Strip session IDs and other query params
			.replace(/[?#].*/, '');
		
		// Try not to save a snapshot if PDF download seems like it'll work
		if (doc.querySelector('a[title="You do not have access to this PDF"]')) {
			item.attachments.push({
				document: doc,
				title: "Snapshot"
			});
		}
		item.attachments.push({
			url: pdfURL,
			title: "Full Text PDF",
			mimeType: "application/pdf"
		});
		item.complete();
	});

	translator.getTranslatorObject(function (trans) {
		trans.setKeywordSplitOnSpace(false);
		trans.setKeywordDelimRe('\\s*;\\s*', '');
		trans.doImport();
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://ieeexplore.ieee.org/document/4607247?tp=&arnumber=4607247&refinements%3D4294967131%26openedRefinements%3D*%26filter%3DAND(NOT(4283010803))%26searchField%3DSearch%20All%26queryText%3Dturing=",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Fuzzy Turing Machines: Variants and Universality",
				"creators": [
					{
						"firstName": "Yongming",
						"lastName": "Li",
						"creatorType": "author"
					}
				],
				"date": "2008-12",
				"DOI": "10.1109/TFUZZ.2008.2004990",
				"ISSN": "1941-0034",
				"abstractNote": "In this paper, we study some variants of fuzzy Turing machines (FTMs) and universal FTM. First, we give several formulations of FTMs, including, in particular, deterministic FTMs (DFTMs) and nondeterministic FTMs (NFTMs). We then show that DFTMs and NFTMs are not equivalent as far as the power of recognizing fuzzy languages is concerned. This contrasts sharply with classical TMs. Second, we show that there is no universal FTM that can exactly simulate any FTM on it. But if the membership degrees of fuzzy sets are restricted to a fixed finite subset A of [0,1], such a universal machine exists. We also show that a universal FTM exists in some approximate sense. This means, for any prescribed accuracy, that we can construct a universal machine that simulates any FTM with the given accuracy. Finally, we introduce the notions of fuzzy polynomial time-bounded computation and nondeterministic fuzzy polynomial time-bounded computation, and investigate their connections with polynomial time-bounded computation and nondeterministic polynomial time-bounded computation.",
				"issue": "6",
				"itemID": "4607247",
				"libraryCatalog": "IEEE Xplore",
				"pages": "1491-1502",
				"publicationTitle": "IEEE Transactions on Fuzzy Systems",
				"shortTitle": "Fuzzy Turing Machines",
				"url": "https://ieeexplore.ieee.org/document/4607247",
				"volume": "16",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					},
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Computational complexity"
					},
					{
						"tag": "Computational modeling"
					},
					{
						"tag": "Computer science"
					},
					{
						"tag": "Deterministic fuzzy Turing machine (DFTM)"
					},
					{
						"tag": "Fuzzy sets"
					},
					{
						"tag": "Hardware"
					},
					{
						"tag": "Intelligent control"
					},
					{
						"tag": "Microcomputers"
					},
					{
						"tag": "Polynomials"
					},
					{
						"tag": "Turing machines"
					},
					{
						"tag": "fuzzy computational complexity"
					},
					{
						"tag": "fuzzy grammar"
					},
					{
						"tag": "fuzzy recursive language"
					},
					{
						"tag": "fuzzy recursively enumerable (f.r.e.) language"
					},
					{
						"tag": "nondeterministic fuzzy Turing machine (NFTM)"
					},
					{
						"tag": "universal fuzzy Turing machine (FTM)"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://ieeexplore.ieee.org/document/6221978?arnumber=6221978",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Graph Matching for Adaptation in Remote Sensing",
				"creators": [
					{
						"firstName": "Devis",
						"lastName": "Tuia",
						"creatorType": "author"
					},
					{
						"firstName": "Jordi",
						"lastName": "Munoz-Mari",
						"creatorType": "author"
					},
					{
						"firstName": "Luis",
						"lastName": "Gomez-Chova",
						"creatorType": "author"
					},
					{
						"firstName": "Jesus",
						"lastName": "Malo",
						"creatorType": "author"
					}
				],
				"date": "2013-01",
				"DOI": "10.1109/TGRS.2012.2200045",
				"ISSN": "1558-0644",
				"abstractNote": "We present an adaptation algorithm focused on the description of the data changes under different acquisition conditions. When considering a source and a destination domain, the adaptation is carried out by transforming one data set to the other using an appropriate nonlinear deformation. The eventually nonlinear transform is based on vector quantization and graph matching. The transfer learning mapping is defined in an unsupervised manner. Once this mapping has been defined, the samples in one domain are projected onto the other, thus allowing the application of any classifier or regressor in the transformed domain. Experiments on challenging remote sensing scenarios, such as multitemporal very high resolution image classification and angular effects compensation, show the validity of the proposed method to match-related domains and enhance the application of cross-domains image processing techniques.",
				"issue": "1",
				"itemID": "6221978",
				"libraryCatalog": "IEEE Xplore",
				"pages": "329-341",
				"publicationTitle": "IEEE Transactions on Geoscience and Remote Sensing",
				"url": "https://ieeexplore.ieee.org/document/6221978",
				"volume": "51",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					},
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Adaptation models"
					},
					{
						"tag": "Domain adaptation"
					},
					{
						"tag": "Entropy"
					},
					{
						"tag": "Manifolds"
					},
					{
						"tag": "Remote sensing"
					},
					{
						"tag": "Support vector machines"
					},
					{
						"tag": "Transforms"
					},
					{
						"tag": "Vector quantization"
					},
					{
						"tag": "model portability"
					},
					{
						"tag": "multitemporal classification"
					},
					{
						"tag": "support vector machine (SVM)"
					},
					{
						"tag": "transfer learning"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://ieeexplore.ieee.org/search/searchresult.jsp?queryText%3Dlabor&refinements=4291944246&pageNumber=1&resultAction=REFINE",
		"defer": true,
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://ieeexplore.ieee.org/xpl/conhome/7048058/proceeding",
		"defer": true,
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://ieeexplore.ieee.org/xpl/mostRecentIssue.jsp?punumber=6221021",
		"defer": true,
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://ieeexplore.ieee.org/search/searchresult.jsp?queryText=Wind%20Farms&newsearch=true",
		"defer": true,
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://ieeexplore.ieee.org/document/1397982?tp=&arnumber=1397982",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Analysis and circuit modeling of waveguide-separated absorption charge multiplication-avalanche photodetector (WG-SACM-APD)",
				"creators": [
					{
						"firstName": "Y.M.",
						"lastName": "El-Batawy",
						"creatorType": "author"
					},
					{
						"firstName": "M.J.",
						"lastName": "Deen",
						"creatorType": "author"
					}
				],
				"date": "2005-03",
				"DOI": "10.1109/TED.2005.843884",
				"ISSN": "1557-9646",
				"abstractNote": "Waveguide photodetectors are considered leading candidates to overcome the bandwidth efficiency tradeoff of conventional photodetectors. In this paper, a theoretical physics-based model of the waveguide separated absorption charge multiplication avalanche photodetector (WG-SACM-APD) is presented. Both time and frequency modeling for this photodetector are developed and simulated results for different thicknesses of the absorption and multiplication layers and for different areas of the photodetector are presented. These simulations provide guidelines for the design of these high-performance photodiodes. In addition, a circuit model of the photodetector is presented in which the photodetector is a lumped circuit element so that circuit simulation of the entire photoreceiver is now feasible. The parasitics of the photodetector are included in the circuit model and it is shown how these parasitics degrade the photodetectors performance and how they can be partially compensated by an external inductor in series with the load resistor. The results obtained from the circuit model of the WG-SACM-APD are compared with published experimental results and good agreement is obtained. This circuit modeling can easily be applied to any WG-APD structure. The gain-bandwidth characteristic of WG-SACM-APD is studied for different areas and thicknesses of both the absorption and the multiplication layers. The dependence of the performance of the photodetector on the dimensions, the material parameters and the multiplication gain are also investigated.",
				"issue": "3",
				"itemID": "1397982",
				"libraryCatalog": "IEEE Xplore",
				"pages": "335-344",
				"publicationTitle": "IEEE Transactions on Electron Devices",
				"url": "https://ieeexplore.ieee.org/document/1397982",
				"volume": "52",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					},
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Avalanche photodetectors"
					},
					{
						"tag": "Avalanche photodiodes"
					},
					{
						"tag": "Linear circuits"
					},
					{
						"tag": "Optical receivers"
					},
					{
						"tag": "Photodetectors"
					},
					{
						"tag": "SACM photodetectors"
					},
					{
						"tag": "Semiconductor device modeling"
					},
					{
						"tag": "circuit model of photodetectors"
					},
					{
						"tag": "high-speed photodetectors"
					},
					{
						"tag": "photodetectors"
					},
					{
						"tag": "physics-based modeling"
					},
					{
						"tag": "waveguide photodetectors"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://ieeexplore.ieee.org/document/6919256?arnumber=6919256&punumber%3D6287639=",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Information Security in Big Data: Privacy and Data Mining",
				"creators": [
					{
						"firstName": "Lei",
						"lastName": "Xu",
						"creatorType": "author"
					},
					{
						"firstName": "Chunxiao",
						"lastName": "Jiang",
						"creatorType": "author"
					},
					{
						"firstName": "Jian",
						"lastName": "Wang",
						"creatorType": "author"
					},
					{
						"firstName": "Jian",
						"lastName": "Yuan",
						"creatorType": "author"
					},
					{
						"firstName": "Yong",
						"lastName": "Ren",
						"creatorType": "author"
					}
				],
				"date": "2014",
				"DOI": "10.1109/ACCESS.2014.2362522",
				"ISSN": "2169-3536",
				"abstractNote": "The growing popularity and development of data mining technologies bring serious threat to the security of individual,'s sensitive information. An emerging research topic in data mining, known as privacy-preserving data mining (PPDM), has been extensively studied in recent years. The basic idea of PPDM is to modify the data in such a way so as to perform data mining algorithms effectively without compromising the security of sensitive information contained in the data. Current studies of PPDM mainly focus on how to reduce the privacy risk brought by data mining operations, while in fact, unwanted disclosure of sensitive information may also happen in the process of data collecting, data publishing, and information (i.e., the data mining results) delivering. In this paper, we view the privacy issues related to data mining from a wider perspective and investigate various approaches that can help to protect sensitive information. In particular, we identify four different types of users involved in data mining applications, namely, data provider, data collector, data miner, and decision maker. For each type of user, we discuss his privacy concerns and the methods that can be adopted to protect sensitive information. We briefly introduce the basics of related research topics, review state-of-the-art approaches, and present some preliminary thoughts on future research directions. Besides exploring the privacy-preserving approaches for each type of user, we also review the game theoretical approaches, which are proposed for analyzing the interactions among different users in a data mining scenario, each of whom has his own valuation on the sensitive information. By differentiating the responsibilities of different users with respect to security of sensitive information, we would like to provide some useful insights into the study of PPDM.",
				"itemID": "6919256",
				"libraryCatalog": "IEEE Xplore",
				"pages": "1149-1176",
				"publicationTitle": "IEEE Access",
				"shortTitle": "Information Security in Big Data",
				"url": "https://ieeexplore.ieee.org/document/6919256",
				"volume": "2",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Algorithm design and analysis"
					},
					{
						"tag": "Computer security"
					},
					{
						"tag": "Data mining"
					},
					{
						"tag": "Data mining"
					},
					{
						"tag": "Data privacy"
					},
					{
						"tag": "Game theory"
					},
					{
						"tag": "Privacy"
					},
					{
						"tag": "Tracking"
					},
					{
						"tag": "anonymization"
					},
					{
						"tag": "anonymization"
					},
					{
						"tag": "anti-tracking"
					},
					{
						"tag": "anti-tracking"
					},
					{
						"tag": "data mining"
					},
					{
						"tag": "game theory"
					},
					{
						"tag": "game theory"
					},
					{
						"tag": "privacy auction"
					},
					{
						"tag": "privacy auction"
					},
					{
						"tag": "privacy-preserving data mining"
					},
					{
						"tag": "privacypreserving data mining"
					},
					{
						"tag": "provenance"
					},
					{
						"tag": "provenance"
					},
					{
						"tag": "sensitive information"
					},
					{
						"tag": "sensitive information"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://ieeexplore.ieee.org/document/80767",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "An eigenanalysis interference canceler",
				"creators": [
					{
						"firstName": "A.M.",
						"lastName": "Haimovich",
						"creatorType": "author"
					},
					{
						"firstName": "Y.",
						"lastName": "Bar-Ness",
						"creatorType": "author"
					}
				],
				"date": "1991-01",
				"DOI": "10.1109/78.80767",
				"ISSN": "1941-0476",
				"abstractNote": "Eigenanalysis methods are applied to interference cancellation problems. While with common array processing methods the cancellation is effected by global optimization procedures that include the interferences and the background noise, the proposed technique focuses on the interferences only, resulting in superior cancellation performance. Furthermore, the method achieves full effectiveness even for short observation times, when the number of samples used for processing is of the the order of the number of interferences. Adaptive implementation is obtained with a simple, fast converging algorithm.<>",
				"issue": "1",
				"itemID": "80767",
				"libraryCatalog": "IEEE Xplore",
				"pages": "76-84",
				"publicationTitle": "IEEE Transactions on Signal Processing",
				"url": "https://ieeexplore.ieee.org/document/80767",
				"volume": "39",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					},
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Array signal processing"
					},
					{
						"tag": "Background noise"
					},
					{
						"tag": "Direction of arrival estimation"
					},
					{
						"tag": "Interference cancellation"
					},
					{
						"tag": "Jamming"
					},
					{
						"tag": "Noise cancellation"
					},
					{
						"tag": "Optimization methods"
					},
					{
						"tag": "Sensor arrays"
					},
					{
						"tag": "Signal to noise ratio"
					},
					{
						"tag": "Steady-state"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://ieeexplore.ieee.org/abstract/document/7696113?reload=true",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "3D flexible antenna realization process using liquid metal and additive technology",
				"creators": [
					{
						"firstName": "Mathieu",
						"lastName": "Cosker",
						"creatorType": "author"
					},
					{
						"firstName": "Fabien",
						"lastName": "Ferrero",
						"creatorType": "author"
					},
					{
						"firstName": "Leonardo",
						"lastName": "Lizzi",
						"creatorType": "author"
					},
					{
						"firstName": "Robert",
						"lastName": "Staraj",
						"creatorType": "author"
					},
					{
						"firstName": "Jean-Marc",
						"lastName": "Ribero",
						"creatorType": "author"
					}
				],
				"date": "2016-06",
				"DOI": "10.1109/APS.2016.7696113",
				"abstractNote": "This paper presents a method to design 3D flexible antennas using liquid metal and additive technology (3D printer based on Fused Deposition Modeling (FDM) technology). The fabricated antennas present flexible properties. The design method is first presented and validated using the example of a simple inverted F antenna (IFA) in Ultra High Frequency (UHF) band. The design, the fabrication and the obtained measured results are discussed.",
				"conferenceName": "2016 IEEE International Symposium on Antennas and Propagation (APSURSI)",
				"extra": "ISSN: 1947-1491",
				"itemID": "7696113",
				"libraryCatalog": "IEEE Xplore",
				"pages": "809-810",
				"proceedingsTitle": "2016 IEEE International Symposium on Antennas and Propagation (APSURSI)",
				"url": "https://ieeexplore.ieee.org/abstract/document/7696113",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					},
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "3D printer"
					},
					{
						"tag": "Antenna measurements"
					},
					{
						"tag": "Antenna radiation patterns"
					},
					{
						"tag": "IFA antenna"
					},
					{
						"tag": "Liquids"
					},
					{
						"tag": "Metals"
					},
					{
						"tag": "Printers"
					},
					{
						"tag": "Three-dimensional displays"
					},
					{
						"tag": "additive technology"
					},
					{
						"tag": "liquid metal"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://ieeexplore.ieee.org/xpl/tocresult.jsp?isnumber=10045573&punumber=6221021",
		"defer": true,
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://ieeexplore.ieee.org/stamp/stamp.jsp?tp=&arnumber=9919149",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Joint UAV Placement and IRS Phase Shift Optimization in Downlink Networks",
				"creators": [
					{
						"firstName": "Hung",
						"lastName": "Nguyen-Kha",
						"creatorType": "author"
					},
					{
						"firstName": "Hieu V.",
						"lastName": "Nguyen",
						"creatorType": "author"
					},
					{
						"firstName": "Mai T.",
						"lastName": "P. Le",
						"creatorType": "author"
					},
					{
						"firstName": "Oh-Soon",
						"lastName": "Shin",
						"creatorType": "author"
					}
				],
				"date": "2022",
				"DOI": "10.1109/ACCESS.2022.3214663",
				"ISSN": "2169-3536",
				"abstractNote": "This study investigates the integration of an intelligent reflecting surface (IRS) into an unmanned aerial vehicle (UAV) platform to utilize the advantages of these leading technologies for sixth-generation communications, e.g., improved spectral and energy efficiency, extended network coverage, and flexible deployment. In particular, we investigate a downlink IRS–UAV system, wherein single-antenna ground users (UEs) are served by a multi-antenna base station (BS). To assist the communication between UEs and the BS, an IRS mounted on a UAV is deployed, in which the direct links are obstructed owing to the complex urban channel characteristics. The beamforming at the BS, phase shift at the IRS, and the 3D placement of the UAV are jointly optimized to maximize the sum rate. Because the optimization variables, particularly the beamforming and IRS phase shift, are highly coupled with each other, the optimization problem is naturally non-convex. To effectively solve the formulated problem, we propose an iterative algorithm that employs block coordinate descent and inner approximation methods. Numerical results demonstrate the effectiveness of our proposed approach for a UAV-mounted IRS system on the sum rate performance over the state-of-the-art technology using the terrestrial counterpart.",
				"itemID": "9919149",
				"libraryCatalog": "IEEE Xplore",
				"pages": "111221-111231",
				"publicationTitle": "IEEE Access",
				"url": "https://ieeexplore.ieee.org/document/9919149/;jsessionid=3386C5DE504CACC506C45DCCE33CE92B",
				"volume": "10",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Array signal processing"
					},
					{
						"tag": "Autonomous aerial vehicles"
					},
					{
						"tag": "Beamforming"
					},
					{
						"tag": "Downlink"
					},
					{
						"tag": "Iterative methods"
					},
					{
						"tag": "Optimization"
					},
					{
						"tag": "Relays"
					},
					{
						"tag": "Three-dimensional displays"
					},
					{
						"tag": "UAV-mounted IRS"
					},
					{
						"tag": "Wireless communication"
					},
					{
						"tag": "convex optimization"
					},
					{
						"tag": "intelligent reflecting surface (IRS)"
					},
					{
						"tag": "unmanned aerial vehicle (UAV)"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://ieeexplore.ieee.org/document/805864",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "Position Statement: Increasing Test Coverage in a VLSI Design Course",
				"creators": [
					{
						"firstName": "J.A.",
						"lastName": "Abraham",
						"creatorType": "author"
					}
				],
				"date": "1999-09",
				"DOI": "10.1109/TEST.1999.805864",
				"abstractNote": "It is argued that test and verification (validation) have a lot in common. The test problem is a (small) subset I of the verification problem. The concept of justification is useful for both problems. Practical formal Bbolean equivalence checking tools draw heavily on algorithms from the test field. ATPG techniqu s are beginning to be applied to other verification problems. A VLSI design course should, therefore, emphasize both manufacturing test and design verification as necessary to produce a quality ptoduct, and these topics should comprise a significant part of the content of the course.",
				"conferenceName": "International Test Conference 1999",
				"extra": "ISSN: 1089-3539",
				"itemID": "805864",
				"libraryCatalog": "IEEE Xplore",
				"pages": "1132-1132",
				"proceedingsTitle": "International Test Conference 1999. Proceedings",
				"shortTitle": "Position Statement",
				"url": "https://ieeexplore.ieee.org/document/805864",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					},
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Jacobian matrices"
					},
					{
						"tag": "Testing"
					},
					{
						"tag": "Very large scale integration"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
