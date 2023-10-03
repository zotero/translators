{
	"translatorID": "92d4ed84-8d0-4d3c-941f-d4b9124cfbb",
	"label": "IEEE Xplore",
	"creator": "Simon Kornblith, Michael Berkowitz, Bastian Koenings, and Avram Lyon",
	"target": "^https?://([^/]+\\.)?ieeexplore\\.ieee\\.org/([^#]+[&?]arnumber=\\d+|(abstract/)?document/|book/|search/(searchresult|selected)\\.jsp|xpl/(mostRecentIssue|tocresult)\\.jsp\\?|xpl/conhome/\\d+/proceeding)",
	"minVersion": "4.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-10-03 17:00:55"
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

const BASE_URL = "https://ieeexplore.ieee.org";

function detectWeb(doc, url) {
	// TODO this is not necessary for papers
	let appRoot = doc.querySelector('xpl-root');
	if (appRoot) {
		Zotero.monitorDOMChanges(appRoot);
	}

	// pdf-viewer page contains too little metadata; journalArticle is a
	// reasonable guess
	if (isPDFViewer(url)) {
		return "journalArticle";
	}

	let metadata = extractJSON(doc);
	if (metadata) {
		let type = getTypeFromJSON(metadata);
		if (type !== null) {
			return type;
		}
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
	// articleID may be falsy for books; it will be handled as a special case.
	// NOTE that books don't have PDF-views, only individual chapters do.
	let articleID = getArticleID(url);
	let canonicalURL = `${BASE_URL}/document/${articleID}`;

	if (isPDFViewer(url)) {
		Z.debug(`Input is PDF-view page; article ID ${articleID}`);
		// get the abstract page
		doc = await requestDocument(canonicalURL);
	}

	let metadata = extractJSON(doc);
	if (!metadata) {
		throw new Error(`No metadata extracted for page at ${url}`);
	}

	let type = getTypeFromJSON(metadata);
	let item = new Z.Item(type);
	if (type === "book" && metadata.bookNumber) {
		item.url = `${BASE_URL}/book/${metadata.bookNumber}`;
	}
	else {
		item.url = canonicalURL;
	}

	// Set doc metadata field as item field
	function setField(metadataField, itemField = metadataField) {
		let value = metadata[metadataField];
		if (value) {
			item[itemField] = value;
		}
	}

	// metadata field -> item field
	setField("formulaStrippedArticleTitle", "title");
	if (!item.title) {
		setField("title");
	}
	setField("publicationDate", "date");
	setField("doi", "DOI");
	setField("publicationTitle");
	setField("publisher");
	if (!metadata.isEarlyAccess) {
		setField("volume");
		setField("issue");

		let pages = metadata.startPage;
		if (typeof pages === "string") {
			if (metadata.endPage) {
				pages += `-${metadata.endPage}`;
			}
			item.pages = pages;
		}
	}

	// abstract
	if (metadata.abstract) {
		item.abstractNote = ZU.trimInternal(ZU.unescapeHTML(ZU.cleanTags(metadata.abstract)));
	}

	// creators; property name can be "authors" or "author" (books)
	for (let authorObj of metadata.authors || metadata.author || []) {
		if (authorObj.firstName || authorObj.lastName) {
			item.creators.push({
				firstName: authorObj.firstName,
				lastName: authorObj.lastName,
				creatorType: "author",
			});
		}
		else if (authorObj.name) {
			item.creators.push(ZU.cleanAuthor(authorObj.name, "author"));
		}
	}

	// ISSN and ISBN if any, keeping only the ones for electronic media
	setSN(item, metadata, "ISSN");
	setSN(item, metadata, "ISBN");

	// Special handling for book; return early to skip irrelevant parts
	// (attachment etc.)
	if (type === "book") {
		setField("copyrightYear", "date");
		setField("pages", "numPages");
		item.tags.push(...metadata.topics.split(" ; "));
		item.complete();
		return;
	}

	if (type === "conferencePaper") {
		setField("confLoc", "place");
		setField("displayPublicationTitle", "conferenceName");
		let confDates = metadata.displayPublicationDate;
		if (confDates) {
			let extraText = `Conference Dates: ${confDates}`;
			item.extra = item.extra ? item.extra + `\n${extraText}` : extraText;
		}
	}
	else if (type === "standard") {
		setField("standardNumber", "number");
		setField("status");
	}

	if (metadata.pubMedId) {
		let extraText = `PMID: ${metadata.pubMedId}`;
		item.extra = item.extra ? item.extra + `\n${extraText}` : extraText;
	}

	item.tags.push(...getTags(metadata));

	item.attachments.push(getFullTextPDF(articleID));

	if (metadata.xploreNote) {
		item.notes.push({ note: metadata.xploreNote });
	}

	item.complete();
}

function getArticleID(url) {
	let urlObj = new URL(url);
	let m = urlObj.pathname.match(/\/document\/(\d+)($|\/)/);
	if (m) {
		return m[1];
	}
	return urlObj.searchParams.get("arnumber"); // for pdf-viewer
}

function isPDFViewer(url) {
	return /^https:\/\/[^/]+\/stamp\//.test(url);
}

// Extract form the embedded code the JS object initializer that is the source
// data for the page rendered in client JS, using regex for simplicity.
function extractJSON(doc) {
	for (let elem of doc.querySelectorAll("script[type='text/javascript']")) {
		if (elem.getAttribute("src")) continue;
		let m = elem.textContent.match(/(;|^)\s*xplGlobal\.document\.metadata\s*=\s*(\{.+?\});\s*$/sm);
		if (m) return JSON.parse(m[2]);
	}
	return null;
}

function getTypeFromJSON(metadata) {
	let type = metadata.contentType;
	if (type === "periodicals") {
		return metadata.contentTypeDisplay === "Magazines"
			? "magazineArticle"
			: "journalArticle";
	}
	else if (type === "conferences") {
		return "conferencePaper";
	}
	else if (type === "standards") {
		return "standard";
	}
	else if (type === "Books") {
		return "book";
	}
	else if (metadata.isBook && metadata.isChapter) {
		return "bookSection";
	}
	return null;
}

function getTags(metadata) {
	let keywords = new Map();
	for (let keywordsObj of metadata.keywords || []) {
		for (let word of keywordsObj.kwd) {
			let key = word.toLowerCase();
			if (!keywords.has(key)) keywords.set(key, word);
		}
	}
	for (let { code, term } of metadata.icsCodes || []) {
		keywords.set(code, code);
		let key = term.toLowerCase();
		if (!keywords.has(key)) keywords.set(key, term);
	}
	return keywords.values();
}

function setSN(item, metadata, snType) {
	for (let obj of metadata[snType.toLowerCase()] || []) {
		if (obj.format === `Electronic ${snType}`) {
			item[snType] = obj.value;
			return;
		}
	}
}

function getFullTextPDF(articleID) {
	// "ref" is the base64-encoded canonical URL of article without the
	// trailing slash. The encoded URL is always ASCII so btoa() suffices.
	let ref = btoa(`${BASE_URL}/document/${articleID}`);
	let url = `${BASE_URL}/stampPDF/getPDF.jsp?tp=&arnumber=${articleID}&ref=${ref}`;
	return { title: "Full Text PDF", url, mimeType: "application/pdf" };
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://ieeexplore.ieee.org/document/4607247/?tp=&arnumber=4607247&refinements%3D4294967131%26openedRefinements%3D*%26filter%3DAND%28NOT%284283010803%29%29%26searchField%3DSearch+All%26queryText%3Dturing",
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
				"date": "December 2008",
				"DOI": "10.1109/TFUZZ.2008.2004990",
				"ISSN": "1063-6706, 1941-0034",
				"abstractNote": "In this paper, we study some variants of fuzzy Turing machines (FTMs) and universal FTM. First, we give several formulations of FTMs, including, in particular, deterministic FTMs (DFTMs) and nondeterministic FTMs (NFTMs). We then show that DFTMs and NFTMs are not equivalent as far as the power of recognizing fuzzy languages is concerned. This contrasts sharply with classical TMs. Second, we show that there is no universal FTM that can exactly simulate any FTM on it. But if the membership degrees of fuzzy sets are restricted to a fixed finite subset A of [0,1], such a universal machine exists. We also show that a universal FTM exists in some approximate sense. This means, for any prescribed accuracy, that we can construct a universal machine that simulates any FTM with the given accuracy. Finally, we introduce the notions of fuzzy polynomial time-bounded computation and nondeterministic fuzzy polynomial time-bounded computation, and investigate their connections with polynomial time-bounded computation and nondeterministic polynomial time-bounded computation.",
				"issue": "6",
				"itemID": "4607247",
				"libraryCatalog": "IEEE Xplore",
				"pages": "1491-1502",
				"publicationTitle": "IEEE Transactions on Fuzzy Systems",
				"shortTitle": "Fuzzy Turing Machines",
				"volume": "16",
				"attachments": [
					{
						"title": "IEEE Xplore Abstract Record"
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
						"tag": "Turing machines"
					},
					{
						"tag": "computational complexity"
					},
					{
						"tag": "deterministic automata"
					},
					{
						"tag": "deterministic fuzzy Turing machines"
					},
					{
						"tag": "fixed finite subset"
					},
					{
						"tag": "fuzzy computational complexity"
					},
					{
						"tag": "fuzzy grammar"
					},
					{
						"tag": "fuzzy languages"
					},
					{
						"tag": "fuzzy polynomial time-bounded computation"
					},
					{
						"tag": "fuzzy recursive language"
					},
					{
						"tag": "fuzzy recursively enumerable (f.r.e.) language"
					},
					{
						"tag": "fuzzy set theory"
					},
					{
						"tag": "fuzzy sets"
					},
					{
						"tag": "nondeterministic fuzzy Turing machine (NFTM)"
					},
					{
						"tag": "nondeterministic fuzzy Turing machines"
					},
					{
						"tag": "nondeterministic polynomial time-bounded computation"
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
		"url": "https://ieeexplore.ieee.org/document/6221978/?arnumber=6221978",
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
				"date": "January 2013",
				"DOI": "10.1109/TGRS.2012.2200045",
				"ISSN": "0196-2892, 1558-0644",
				"abstractNote": "We present an adaptation algorithm focused on the description of the data changes under different acquisition conditions. When considering a source and a destination domain, the adaptation is carried out by transforming one data set to the other using an appropriate nonlinear deformation. The eventually nonlinear transform is based on vector quantization and graph matching. The transfer learning mapping is defined in an unsupervised manner. Once this mapping has been defined, the samples in one domain are projected onto the other, thus allowing the application of any classifier or regressor in the transformed domain. Experiments on challenging remote sensing scenarios, such as multitemporal very high resolution image classification and angular effects compensation, show the validity of the proposed method to match-related domains and enhance the application of cross-domains image processing techniques.",
				"issue": "1",
				"itemID": "6221978",
				"libraryCatalog": "IEEE Xplore",
				"pages": "329-341",
				"publicationTitle": "IEEE Transactions on Geoscience and Remote Sensing",
				"volume": "51",
				"attachments": [
					{
						"title": "IEEE Xplore Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "IEEE Xplore Abstract Record"
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
						"tag": "adaptation algorithm"
					},
					{
						"tag": "angular effects"
					},
					{
						"tag": "cross-domain image processing techniques"
					},
					{
						"tag": "data acquisition conditions"
					},
					{
						"tag": "destination domain"
					},
					{
						"tag": "geophysical image processing"
					},
					{
						"tag": "geophysical techniques"
					},
					{
						"tag": "graph matching method"
					},
					{
						"tag": "image classification"
					},
					{
						"tag": "image matching"
					},
					{
						"tag": "image resolution"
					},
					{
						"tag": "model portability"
					},
					{
						"tag": "multitemporal classification"
					},
					{
						"tag": "multitemporal very high resolution image classification"
					},
					{
						"tag": "nonlinear deformation"
					},
					{
						"tag": "nonlinear transform"
					},
					{
						"tag": "remote sensing"
					},
					{
						"tag": "remote sensing"
					},
					{
						"tag": "source domain"
					},
					{
						"tag": "support vector machine (SVM)"
					},
					{
						"tag": "transfer learning"
					},
					{
						"tag": "transfer learning mapping"
					},
					{
						"tag": "vector quantization"
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
		"url": "https://ieeexplore.ieee.org/document/1397982/?tp=&arnumber=1397982",
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
				"date": "March 2005",
				"DOI": "10.1109/TED.2005.843884",
				"ISSN": "0018-9383, 1557-9646",
				"abstractNote": "Waveguide photodetectors are considered leading candidates to overcome the bandwidth efficiency tradeoff of conventional photodetectors. In this paper, a theoretical physics-based model of the waveguide separated absorption charge multiplication avalanche photodetector (WG-SACM-APD) is presented. Both time and frequency modeling for this photodetector are developed and simulated results for different thicknesses of the absorption and multiplication layers and for different areas of the photodetector are presented. These simulations provide guidelines for the design of these high-performance photodiodes. In addition, a circuit model of the photodetector is presented in which the photodetector is a lumped circuit element so that circuit simulation of the entire photoreceiver is now feasible. The parasitics of the photodetector are included in the circuit model and it is shown how these parasitics degrade the photodetectors performance and how they can be partially compensated by an external inductor in series with the load resistor. The results obtained from the circuit model of the WG-SACM-APD are compared with published experimental results and good agreement is obtained. This circuit modeling can easily be applied to any WG-APD structure. The gain-bandwidth characteristic of WG-SACM-APD is studied for different areas and thicknesses of both the absorption and the multiplication layers. The dependence of the performance of the photodetector on the dimensions, the material parameters and the multiplication gain are also investigated.",
				"issue": "3",
				"itemID": "1397982",
				"libraryCatalog": "IEEE Xplore",
				"pages": "335-344",
				"publicationTitle": "IEEE Transactions on Electron Devices",
				"volume": "52",
				"attachments": [
					{
						"title": "IEEE Xplore Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "IEEE Xplore Abstract Record"
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
						"tag": "SACM photodetectors"
					},
					{
						"tag": "Semiconductor device modeling"
					},
					{
						"tag": "WG-SACM-APD circuit modeling"
					},
					{
						"tag": "absorption layers"
					},
					{
						"tag": "avalanche photodiodes"
					},
					{
						"tag": "circuit model of photodetectors"
					},
					{
						"tag": "circuit modeling"
					},
					{
						"tag": "circuit simulation"
					},
					{
						"tag": "circuit simulation"
					},
					{
						"tag": "external inductor"
					},
					{
						"tag": "frequency modeling"
					},
					{
						"tag": "high-performance photodiodes"
					},
					{
						"tag": "high-speed photodetectors"
					},
					{
						"tag": "high-speed photodetectors"
					},
					{
						"tag": "load resistor"
					},
					{
						"tag": "lumped circuit element"
					},
					{
						"tag": "lumped parameter networks"
					},
					{
						"tag": "multiplication layers"
					},
					{
						"tag": "optical receivers"
					},
					{
						"tag": "parasitics effects"
					},
					{
						"tag": "photodetector analysis"
					},
					{
						"tag": "photodetectors"
					},
					{
						"tag": "photodetectors"
					},
					{
						"tag": "photoreceiver"
					},
					{
						"tag": "physics-based modeling"
					},
					{
						"tag": "semiconductor device models"
					},
					{
						"tag": "theoretical physics-based model"
					},
					{
						"tag": "time modeling"
					},
					{
						"tag": "waveguide photodetectors"
					},
					{
						"tag": "waveguide photodetectors"
					},
					{
						"tag": "waveguide separated absorption charge multiplication avalanche photodetector"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://ieeexplore.ieee.org/document/6919256/?arnumber=6919256&punumber%3D6287639",
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
				"volume": "2",
				"attachments": [
					{
						"title": "IEEE Xplore Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "IEEE Xplore Abstract Record"
					}
				],
				"tags": [
					{
						"tag": "Algorithm design and analysis"
					},
					{
						"tag": "Big Data"
					},
					{
						"tag": "Big Data"
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
						"tag": "PPDM"
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
						"tag": "data acquisition"
					},
					{
						"tag": "data collector"
					},
					{
						"tag": "data miner"
					},
					{
						"tag": "data mining"
					},
					{
						"tag": "data mining"
					},
					{
						"tag": "data protection"
					},
					{
						"tag": "data provider"
					},
					{
						"tag": "data publishing"
					},
					{
						"tag": "decision maker"
					},
					{
						"tag": "game theory"
					},
					{
						"tag": "game theory"
					},
					{
						"tag": "game theory"
					},
					{
						"tag": "game theory"
					},
					{
						"tag": "information protection"
					},
					{
						"tag": "information security"
					},
					{
						"tag": "privacy auction"
					},
					{
						"tag": "privacy auction"
					},
					{
						"tag": "privacy preserving data mining"
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
						"tag": "security of data"
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
		"url": "https://ieeexplore.ieee.org/document/80767/",
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
				"date": "January 1991",
				"DOI": "10.1109/78.80767",
				"ISSN": "1053-587X, 1941-0476",
				"abstractNote": "Eigenanalysis methods are applied to interference cancellation problems. While with common array processing methods the cancellation is effected by global optimization procedures that include the interferences and the background noise, the proposed technique focuses on the interferences only, resulting in superior cancellation performance. Furthermore, the method achieves full effectiveness even for short observation times, when the number of samples used for processing is of the the order of the number of interferences. Adaptive implementation is obtained with a simple, fast converging algorithm.<>",
				"issue": "1",
				"itemID": "80767",
				"libraryCatalog": "IEEE Xplore",
				"pages": "76-84",
				"publicationTitle": "IEEE Transactions on Signal Processing",
				"volume": "39",
				"attachments": [
					{
						"title": "IEEE Xplore Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "IEEE Xplore Abstract Record"
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
					},
					{
						"tag": "adaptive filters"
					},
					{
						"tag": "adaptive implementation"
					},
					{
						"tag": "array processing"
					},
					{
						"tag": "eigenanalysis methods"
					},
					{
						"tag": "eigenvalues and eigenfunctions"
					},
					{
						"tag": "fast converging algorithm"
					},
					{
						"tag": "filtering and prediction theory"
					},
					{
						"tag": "interference cancellation"
					},
					{
						"tag": "interference suppression"
					},
					{
						"tag": "signal processing"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://ieeexplore.ieee.org/abstract/document/7696113/?reload=true",
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
				"date": "June 2016",
				"DOI": "10.1109/APS.2016.7696113",
				"abstractNote": "This paper presents a method to design 3D flexible antennas using liquid metal and additive technology (3D printer based on Fused Deposition Modeling (FDM) technology). The fabricated antennas present flexible properties. The design method is first presented and validated using the example of a simple inverted F antenna (IFA) in Ultra High Frequency (UHF) band. The design, the fabrication and the obtained measured results are discussed.",
				"conferenceName": "2016 IEEE International Symposium on Antennas and Propagation (APSURSI)",
				"extra": "ISSN: 1947-1491",
				"itemID": "7696113",
				"libraryCatalog": "IEEE Xplore",
				"pages": "809-810",
				"proceedingsTitle": "2016 IEEE International Symposium on Antennas and Propagation (APSURSI)",
				"attachments": [
					{
						"title": "IEEE Xplore Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "IEEE Xplore Abstract Record"
					}
				],
				"tags": [
					{
						"tag": "3D flexible antenna design"
					},
					{
						"tag": "3D flexible antenna realization process"
					},
					{
						"tag": "3D printer"
					},
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
						"tag": "FDM technology"
					},
					{
						"tag": "IFA"
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
						"tag": "UHF antennas"
					},
					{
						"tag": "UHF band"
					},
					{
						"tag": "additive technology"
					},
					{
						"tag": "additives"
					},
					{
						"tag": "antenna fabrication"
					},
					{
						"tag": "fused deposition modeling technology"
					},
					{
						"tag": "inverted F antenna"
					},
					{
						"tag": "liquid metal"
					},
					{
						"tag": "liquid metal and additive technology"
					},
					{
						"tag": "liquid metals"
					},
					{
						"tag": "planar inverted-F antennas"
					},
					{
						"tag": "rapid prototyping (industrial)"
					},
					{
						"tag": "ultra high frequency band"
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
		"url": "https://ieeexplore.ieee.org/stamp/stamp.jsp?tp=&arnumber=7265050",
		"defer": true,
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Disturbance-Observer-Based Control and Related Methods—An Overview",
				"creators": [
					{
						"firstName": "Wen-Hua",
						"lastName": "Chen",
						"creatorType": "author"
					},
					{
						"firstName": "Jun",
						"lastName": "Yang",
						"creatorType": "author"
					},
					{
						"firstName": "Lei",
						"lastName": "Guo",
						"creatorType": "author"
					},
					{
						"firstName": "Shihua",
						"lastName": "Li",
						"creatorType": "author"
					}
				],
				"date": "February 2016",
				"DOI": "10.1109/TIE.2015.2478397",
				"ISSN": "1557-9948",
				"abstractNote": "Disturbance-observer-based control (DOBC) and related methods have been researched and applied in various industrial sectors in the last four decades. This survey, at first time, gives a systematic and comprehensive tutorial and summary on the existing disturbance/uncertainty estimation and attenuation techniques, most notably, DOBC, active disturbance rejection control, disturbance accommodation control, and composite hierarchical antidisturbance control. In all of these methods, disturbance and uncertainty are, in general, lumped together, and an observation mechanism is employed to estimate the total disturbance. This paper first reviews a number of widely used linear and nonlinear disturbance/uncertainty estimation techniques and then discusses and compares various compensation techniques and the procedures of integrating disturbance/uncertainty compensation with a (predesigned) linear/nonlinear controller. It also provides concise tutorials of the main methods in this area with clear descriptions of their features. The application of this group of methods in various industrial sections is reviewed, with emphasis on the commercialization of some algorithms. The survey is ended with the discussion of future directions.",
				"issue": "2",
				"libraryCatalog": "IEEE Xplore",
				"pages": "1083-1095",
				"publicationTitle": "IEEE Transactions on Industrial Electronics",
				"url": "https://ieeexplore.ieee.org/document/7265050",
				"volume": "63",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Attenuation"
					},
					{
						"tag": "Disturbances"
					},
					{
						"tag": "Frequency estimation"
					},
					{
						"tag": "Nonlinear systems"
					},
					{
						"tag": "Observers"
					},
					{
						"tag": "Robustness"
					},
					{
						"tag": "Uncertainty"
					},
					{
						"tag": "active disturbance rejection control"
					},
					{
						"tag": "attenuation techniques"
					},
					{
						"tag": "compensation"
					},
					{
						"tag": "compensation techniques"
					},
					{
						"tag": "composite hierarchical antidisturbance control"
					},
					{
						"tag": "disturbance accommodation control"
					},
					{
						"tag": "disturbance-observer-based control"
					},
					{
						"tag": "disturbance-uncertainty compensation"
					},
					{
						"tag": "estimation"
					},
					{
						"tag": "industrial sections"
					},
					{
						"tag": "linear systems"
					},
					{
						"tag": "linear-nonlinear controller"
					},
					{
						"tag": "motion control"
					},
					{
						"tag": "nonlinear control systems"
					},
					{
						"tag": "nonlinear disturbance-uncertainty estimation"
					},
					{
						"tag": "power system control"
					},
					{
						"tag": "power system faults"
					},
					{
						"tag": "uncertainties"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://ieeexplore.ieee.org/book/6480473",
		"items": [
			{
				"itemType": "book",
				"title": "Mobile Ad Hoc Networking: The Cutting Edge Directions",
				"creators": [
					{
						"firstName": "Stefano",
						"lastName": "Basagni",
						"creatorType": "author"
					},
					{
						"firstName": "Marco",
						"lastName": "Conti",
						"creatorType": "author"
					},
					{
						"firstName": "Silvia",
						"lastName": "Giordano",
						"creatorType": "author"
					},
					{
						"firstName": "Ivan",
						"lastName": "Stojmenovic",
						"creatorType": "author"
					}
				],
				"date": "2013",
				"ISBN": "9781118511237",
				"abstractNote": "\"An excellent book for those who are interested in learning the current status of research and development . . . [and] who want to get a comprehensive overview of the current state-of-the-art.\" —E-Streams This book provides up-to-date information on research and development in the rapidly growing area of networks based on the multihop ad hoc networking paradigm. It reviews all classes of networks that have successfully adopted this paradigm, pointing out how they penetrated the mass market and sparked breakthrough research. Covering both physical issues and applications, Mobile Ad Hoc Networking: Cutting Edge Directions offers useful tools for professionals and researchers in diverse areas wishing to learn about the latest trends in sensor, actuator, and robot networking, mesh networks, delay tolerant and opportunistic networking, and vehicular networks. Chapter coverage includes: Multihop ad hoc networking Enabling technologies and standards for mobile multihop wireless networking Resource optimization in multiradio multichannel wireless mesh networks QoS in mesh networks Routing and data dissemination in opportunistic networks Task farming in crowd computing Mobility models, topology, and simulations in VANET MAC protocols for VANET Wireless sensor networks with energy harvesting nodes Robot-assisted wireless sensor networks: recent applications and future challenges Advances in underwater acoustic networking Security in wireless ad hoc networks Mobile Ad Hoc Networking will appeal to researchers, developers, and students interested in computer science, electrical engineering, and telecommunications.",
				"libraryCatalog": "IEEE Xplore",
				"numPages": "888",
				"publisher": "IEEE",
				"shortTitle": "Mobile Ad Hoc Networking",
				"url": "https://ieeexplore.ieee.org/book/6480473",
				"attachments": [],
				"tags": [
					{
						"tag": "Communication, Networking and Broadcast Technologies"
					},
					{
						"tag": "Components, Circuits, Devices and Systems"
					},
					{
						"tag": "Computing and Processing"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://ieeexplore.ieee.org/document/6482734/keywords#keywords",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Advances in Underwater Acoustic Networking",
				"creators": [
					{
						"firstName": "Stefano",
						"lastName": "Basagni",
						"creatorType": "author"
					},
					{
						"firstName": "Marco",
						"lastName": "Conti",
						"creatorType": "author"
					},
					{
						"firstName": "Silvia",
						"lastName": "Giordano",
						"creatorType": "author"
					},
					{
						"firstName": "Ivan",
						"lastName": "Stojmenovic",
						"creatorType": "author"
					}
				],
				"ISBN": "9781118511237",
				"abstractNote": "This chapter contains sections titled: Introduction Communication Architecture Basics of Underwater Communications Physical Layer Medium Access Control Layer Network Layer Cross-Layer Design Experimental Platforms UW-Buffalo: An Underwater Acoustic Testbed at the University at Buffalo Conclusions References",
				"bookTitle": "Mobile Ad Hoc Networking: The Cutting Edge Directions",
				"libraryCatalog": "IEEE Xplore",
				"pages": "804-852",
				"publisher": "Wiley-IEEE Press",
				"url": "https://ieeexplore.ieee.org/document/6482734",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Acoustics"
					},
					{
						"tag": "Logic gates"
					},
					{
						"tag": "Transducers"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://ieeexplore.ieee.org/document/4472240",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "An Introduction To Compressive Sampling",
				"creators": [
					{
						"firstName": "Emmanuel J.",
						"lastName": "Candes",
						"creatorType": "author"
					},
					{
						"firstName": "Michael B.",
						"lastName": "Wakin",
						"creatorType": "author"
					}
				],
				"date": "March 2008",
				"ISSN": "1558-0792",
				"abstractNote": "Conventional approaches to sampling signals or images follow Shannon's theorem: the sampling rate must be at least twice the maximum frequency present in the signal (Nyquist rate). In the field of data conversion, standard analog-to-digital converter (ADC) technology implements the usual quantized Shannon representation - the signal is uniformly sampled at or above the Nyquist rate. This article surveys the theory of compressive sampling, also known as compressed sensing or CS, a novel sensing/sampling paradigm that goes against the common wisdom in data acquisition. CS theory asserts that one can recover certain signals and images from far fewer samples or measurements than traditional methods use.",
				"issue": "2",
				"libraryCatalog": "IEEE Xplore",
				"pages": "21-30",
				"publicationTitle": "IEEE Signal Processing Magazine",
				"url": "https://ieeexplore.ieee.org/document/4472240",
				"volume": "25",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Biomedical imaging"
					},
					{
						"tag": "Data acquisition"
					},
					{
						"tag": "Frequency"
					},
					{
						"tag": "Image coding"
					},
					{
						"tag": "Image sampling"
					},
					{
						"tag": "Protocols"
					},
					{
						"tag": "Receivers"
					},
					{
						"tag": "Relatively few wavelet"
					},
					{
						"tag": "Sampling methods"
					},
					{
						"tag": "Signal processing"
					},
					{
						"tag": "Signal sampling"
					},
					{
						"tag": "compressed sensing"
					},
					{
						"tag": "compressive sampling"
					},
					{
						"tag": "image processing"
					},
					{
						"tag": "image recovery"
					},
					{
						"tag": "sampling paradigm"
					},
					{
						"tag": "sensing paradigm"
					},
					{
						"tag": "signal processing equipment"
					},
					{
						"tag": "signal recovery"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://ieeexplore.ieee.org/document/8332112",
		"items": [
			{
				"itemType": "standard",
				"title": "1547-2018 - IEEE Standard for Interconnection and Interoperability of Distributed Energy Resources with Associated Electric Power Systems Interfaces",
				"creators": [],
				"date": "06 April 2018",
				"DOI": "10.1109/IEEESTD.2018.8332112",
				"abstractNote": "The technical specifications for, and testing of, the interconnection and interoperability between utility electric power systems (EPSs) and distributed energy resources (DERs) are the focus of this standard. It provides requirements relevant to the performance, operation, testing, safety considerations, and maintenance of the interconnection. It also includes general requirements, response to abnormal conditions, power quality, islanding, and test specifications and requirements for design, production, installation evaluation, commissioning, and periodic tests. The stated requirements are universally needed for interconnection of DER, including synchronous machines, induction machines, or power inverters/converters and will be sufficient for most installations. The criteria and requirements are applicable to all DER technologies interconnected to EPSs at typical primary and/or secondary distribution voltages. Installation of DER on radial primary and secondary distribution systems is the main emphasis of this document, although installation of DERs on primary and secondary network distribution systems is considered. This standard is written considering that the DER is a 60 Hz source.",
				"libraryCatalog": "IEEE Xplore",
				"number": "1547-2018",
				"publisher": "IEEE",
				"status": "active",
				"url": "https://ieeexplore.ieee.org/document/8332112",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "27.100"
					},
					{
						"tag": "Diesel engines"
					},
					{
						"tag": "Energy management"
					},
					{
						"tag": "Energy storage"
					},
					{
						"tag": "Fault diagnosis"
					},
					{
						"tag": "Flicker"
					},
					{
						"tag": "Generators"
					},
					{
						"tag": "IEEE 1547"
					},
					{
						"tag": "IEEE Standards"
					},
					{
						"tag": "Power distribution"
					},
					{
						"tag": "Power stations in general"
					},
					{
						"tag": "Power systems reliability"
					},
					{
						"tag": "certification"
					},
					{
						"tag": "clearing time"
					},
					{
						"tag": "codes"
					},
					{
						"tag": "commissioning"
					},
					{
						"tag": "communications"
					},
					{
						"tag": "dc injection"
					},
					{
						"tag": "design"
					},
					{
						"tag": "diesel generators"
					},
					{
						"tag": "dispersed generation"
					},
					{
						"tag": "distributed generation"
					},
					{
						"tag": "electric distribution systems"
					},
					{
						"tag": "electric power systems"
					},
					{
						"tag": "energy resources"
					},
					{
						"tag": "faults"
					},
					{
						"tag": "field"
					},
					{
						"tag": "frequency support"
					},
					{
						"tag": "fuel cells"
					},
					{
						"tag": "grid"
					},
					{
						"tag": "grid support"
					},
					{
						"tag": "harmonics"
					},
					{
						"tag": "induction machines"
					},
					{
						"tag": "installation"
					},
					{
						"tag": "interconnection requirements and specifications"
					},
					{
						"tag": "interoperability"
					},
					{
						"tag": "inverters"
					},
					{
						"tag": "islanding"
					},
					{
						"tag": "microturbines"
					},
					{
						"tag": "monitoring and control"
					},
					{
						"tag": "networks"
					},
					{
						"tag": "paralleling"
					},
					{
						"tag": "performance"
					},
					{
						"tag": "photovoltaic power systems"
					},
					{
						"tag": "point of common coupling"
					},
					{
						"tag": "power"
					},
					{
						"tag": "power converters"
					},
					{
						"tag": "production tests"
					},
					{
						"tag": "protection functions"
					},
					{
						"tag": "public utility commissions"
					},
					{
						"tag": "quality"
					},
					{
						"tag": "reclosing coordination"
					},
					{
						"tag": "regulations"
					},
					{
						"tag": "ride through"
					},
					{
						"tag": "rule-making"
					},
					{
						"tag": "standards"
					},
					{
						"tag": "storage"
					},
					{
						"tag": "synchronous machines"
					},
					{
						"tag": "testing"
					},
					{
						"tag": "trip setting"
					},
					{
						"tag": "utilities"
					},
					{
						"tag": "voltage regulation"
					},
					{
						"tag": "wind energy systems"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://ieeexplore.ieee.org/document/8626494",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Stacked Deconvolutional Network for Semantic Segmentation",
				"creators": [
					{
						"firstName": "Jun",
						"lastName": "Fu",
						"creatorType": "author"
					},
					{
						"firstName": "Jing",
						"lastName": "Liu",
						"creatorType": "author"
					},
					{
						"firstName": "Yuhang",
						"lastName": "Wang",
						"creatorType": "author"
					},
					{
						"firstName": "Jin",
						"lastName": "Zhou",
						"creatorType": "author"
					},
					{
						"firstName": "Changyong",
						"lastName": "Wang",
						"creatorType": "author"
					},
					{
						"firstName": "Hanqing",
						"lastName": "Lu",
						"creatorType": "author"
					}
				],
				"DOI": "10.1109/TIP.2019.2895460",
				"ISSN": "1941-0042",
				"abstractNote": "Recent progress in semantic segmentation has been driven by improving the spatial resolution under Fully Convolutional Networks (FCNs). To address this problem, we propose a Stacked Deconvolutional Network (SDN) for semantic segmentation. In SDN, multiple shallow deconvolutional networks, which are called as SDN units, are stacked one by one to integrate contextual information and bring the fine recovery of localization information. Meanwhile, inter-unit and intra-unit connections are designed to assist network training and enhance feature fusion since the connections improve the flow of information and gradient propagation throughout the network. Besides, hierarchical supervision is applied during the upsampling process of each SDN unit, which enhances the discrimination of feature representations and benefits the network optimization. We carry out comprehensive experiments and achieve the new state-ofthe- art results on four datasets, including PASCAL VOC 2012, CamVid, GATECH, COCO Stuff. In particular, our best model without CRF post-processing achieves an intersection-over-union score of 86.6% in the test set.",
				"extra": "PMID: 30703024",
				"libraryCatalog": "IEEE Xplore",
				"publicationTitle": "IEEE Transactions on Image Processing",
				"url": "https://ieeexplore.ieee.org/document/8626494",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Decoding"
					},
					{
						"tag": "Deconvolutional Neural Network"
					},
					{
						"tag": "Dense Connection"
					},
					{
						"tag": "Hierarchical Supervision"
					},
					{
						"tag": "Image segmentation"
					},
					{
						"tag": "Pattern recognition"
					},
					{
						"tag": "Semantic Segmentation"
					},
					{
						"tag": "Semantics"
					},
					{
						"tag": "Spatial resolution"
					},
					{
						"tag": "Task analysis"
					},
					{
						"tag": "Training"
					}
				],
				"notes": [
					{
						"note": "IEEE Xplore Notice to Reader: \"Stacked Deconvolutional Network for Semantic Segmentation, by Jun Fu, Jing Lu, Yuhang Wang, Jin Zhou, Changyong Wang, and Hanqing Lu, published in the IEEE Transactions on Image Processing Early Access Digital Object Identifier: 10.1109/TIP.2019.2895460 This article will not be published in final form due to unauthorized changes made to the authorship following acceptance of the paper. It should not be considered for citation purposes. We regret any inconvenience this may have caused. Gaurav Sharma Editor-in-Chief IEEE Transactions on Image Processing "
					}
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
