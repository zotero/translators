{
	"translatorID": "04a23cbe-5f8b-d6cd-8eb1-2e23bcc8ae8f",
	"label": "ePrint IACR",
	"creator": "Jonas Schrieb",
	"target": "^https://eprint\\.iacr\\.org/",
	"minVersion": "6.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-07-21 13:48:22"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2010-2023 Jonas Schrieb and contributors

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

// There are several types of searches available on ePrint, producing pages with different structure, need to distinguish them
// This covers the standard text-based search
const SEARCH_TYPE_TEXT = "text";
// This covers all time-based searches: "All papers" (excluding "Compact view"), "Updates from the last X days", "Listing by year"
const SEARCH_TYPE_TIME = "time";
let searchType = "";

function detectWeb(doc, url) {
	var eprintBaseURLRe = /^https:\/\/eprint\.iacr\.org\//;
	// Single paper URL format is https://<ePrint FQDN>/<year>/<paper number within the year>
	// The year is always 4 digits, paper number can technically be 1 digit or more,
	// the default is 3 or 4 digits (the former is left-padded with zeroes if smaller than 100)
	var singleRe = new RegExp(eprintBaseURLRe.source + /\d{4}\/\d+/.source);

	var multipleTextSearchRe = new RegExp(eprintBaseURLRe.source + /search\?/.source);
	var multipleTimeSearchYearRe = new RegExp(eprintBaseURLRe.source + /\d{4}\/?$/.source);
	var multipleTimeSearchDaysRe = new RegExp(eprintBaseURLRe.source + /days/.source);
	// The "Compact view" is explicitly unsupported - it does not use pagination and trying to handle all 20K+ papers at once reliably kills Zotero
	var multipleTimeSearchAllRe = new RegExp(eprintBaseURLRe.source + /complete\/?$/.source);

	if (singleRe.test(url)) {
		return 'preprint';
	}
	else if (multipleTextSearchRe.test(url)) {
		searchType = SEARCH_TYPE_TEXT;
	}
	else if (multipleTimeSearchYearRe.test(url)
		|| multipleTimeSearchDaysRe.test(url)
		|| multipleTimeSearchAllRe.test(url)) {
		searchType = SEARCH_TYPE_TIME;
	}
	if (searchType && getSearchResults(doc, true)) return "multiple";

	return false;
}

async function scrape(doc, url = doc.location.href) {
	var titleSelector = 'meta[name="citation_title"]';
	var authorsSelector = 'meta[name="citation_author"]';
	var archiveSelector = 'meta[name="citation_journal_title"]';
	var abstractXPath = "//h5[starts-with(text(),'Abstract')]/following-sibling::p[1]";
	var noteXPath = "//h5[starts-with(text(),'Abstract')]/following-sibling::p[2]/strong[starts-with(text(), 'Note:')]/..";
	var keywordsSelector = ".keywords > .keyword";
	var publicationInfoSelector = "//div[@id='metadata']/dl/dt[starts-with(text(), 'Publication info')]/following-sibling::dd[1]";
	var availableFormatsSelector = "//div[@id='metadata']/dl/dt[contains(text(), 'Available format(s)')]/following-sibling::dd[1]/a";
	var paperIDSelector = "#eprintContent h4";
	var paperID = text(doc, paperIDSelector);
	// The year is always 4 digits, the paper number is canonicalized (3 or 4 digits) before calling scrape()
	paperID = paperID.match(/(\d{4})\/(\d{3,4})$/);
	if (paperID) {
		var paperYear = paperID[1];
		var paperNum = paperID[2];
		paperID = paperYear + "/" + paperNum;
	}
	var title = ZU.trimInternal(attr(doc, titleSelector, 'content'));

	var archiveName = ZU.trimInternal(attr(doc, archiveSelector, 'content'));

	var authors = doc.querySelectorAll(authorsSelector);
	authors = [...authors].map(author => author.content);

	// Pages use MathJax lazy typesetting, which affects tests (content is missing as typesetting isn't being done).
	// Work around by pulling the abstract from the OG tag in that case.
	let abstr = "";
	if (doc.querySelector('mjx-lazy')) {
		abstr = attr(doc, 'meta[property="og:description"]', 'content');
	}
	else {
		abstr = ZU.xpathText(doc, abstractXPath);
	}

	// Remove surplus whitespace, but preserve paragraphs, denoted in the page markup by double newlines with some spaces in between
	if (abstr) abstr = abstr.replace(/\n\s+\n/g, "\n\n").replace(/[ \t]+/g, " ").trim();

	let note = ZU.xpathText(doc, noteXPath);
	if (note) note = ZU.trimInternal(note.replace(/^Note: /, ""));

	let publicationInfo = ZU.xpathText(doc, publicationInfoSelector);
	publicationInfo = ZU.trimInternal(publicationInfo);

	var keywords = doc.querySelectorAll(keywordsSelector);
	keywords = [...keywords].map(kw => kw.textContent.trim());

	var newItem = new Zotero.Item('preprint');

	newItem.date = paperYear;

	let urlComponents = url.match(/^https:\/\/([^/]+)/);
	let eprintFQDN = urlComponents[1];
	newItem.archive = archiveName;
	newItem.libraryCatalog = `${archiveName} (${eprintFQDN})`;
	newItem.archiveID = paperID;

	// Canonicalize the URL to avoid errors if e.g., the user removed or prepended extra zeroes to the paper ID in the original URL
	newItem.url = urlComponents[0] + "/" + paperID;
	newItem.title = title;
	newItem.abstractNote = abstr;

	for (let i in authors) {
		newItem.creators.push(ZU.cleanAuthor(authors[i], "author"));
	}

	for (let i in keywords) {
		newItem.tags.push(keywords[i]);
	}

	let formats = ZU.xpath(doc, availableFormatsSelector);
	for (const format of formats) {
		let formatName = format.textContent.trim();
		let attachment = {};
		switch (formatName.toLowerCase()) {
			case "pdf":
				// There are entries where a format button is present, but the URL points to the ePrint home page
				if (format.href.slice(-4) != ".pdf") continue;
				attachment.mimeType = "application/pdf";
				break;
			case "ps":
				// There are entries where a format button is present, but the URL points to the ePrint home page
				if (format.href.slice(-3) != ".ps") continue;
				attachment.mimeType = "application/ps";
				break;
			default:
				// For security reasons, avoid adding unknown formats (allowlist approach)
				Z.debug("Unknown format, skipping: " + formatName);
				continue;
		}
		attachment.url = format.href;
		attachment.title = "Full Text " + formatName;
		newItem.attachments.push(attachment);
	}

	if (note) newItem.notes.push({ note: note });

	let extra = `Publication info: ${publicationInfo}`;
	newItem.extra = newItem.extra
		? newItem.extra + `\n${extra}`
		: extra;

	newItem.complete();
}

function getSearchResults(doc, checkonly) {
	if (searchType === SEARCH_TYPE_TEXT) {
		return getTextSearchResults(doc, checkonly);
	}
	else if (searchType === SEARCH_TYPE_TIME) {
		return getTimeSearchResults(doc, checkonly);
	}
	return false;
}

// Standard (text) search results parser
function getTextSearchResults(doc, checkOnly) {
	let rowSelector = ".results > div";
	let titleSelector = "div > strong:first-child";
	let linkSelector = "a.paperlink";

	let items = {};
	let found = false;
	// Each "row" div will contain two nested divs with necessary information
	for (let row of doc.querySelectorAll(rowSelector)) {
		let title = text(row, titleSelector);
		let href = attr(row, linkSelector, 'href');
		if (!title || !href) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

// Time-based search results parser ("All papers", "Listing by year", "Updates from the last X days")
function getTimeSearchResults(doc, checkOnly) {
	let rowSelector = ".paperList > div";
	let titleSelector = ".papertitle";
	let linkSelector = "a:first-child";

	let items = {};
	let found = false;
	// This search type returns a page with a flat list of divs, odd ones contain links, even ones contain titles
	// We treat the list as a set of [virtual] rows, each comprised of a pair of divs
	let rows = doc.querySelectorAll(rowSelector);
	for (let i = 0; i < rows.length - 1; i += 2) {
		let href = attr(rows[i], linkSelector, "href");
		let title = text(rows[i + 1], titleSelector);
		if (!title || !href) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

async function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		let items = await Z.selectItems(getSearchResults(doc, false));
		if (!items) return;
		for (let url of Object.keys(items)) {
			await scrape(await requestDocument(url));
		}
	}
	// Firefox restrictions will prevent this convenience clause from running (Chrome works as expected)
	// Standard PDF saving (and metadata retrieval) logic will be used instead
	else if (/\.pdf$/.test(url)) {
		// Go to the landing page to scrape
		url = url.replace(/\.pdf$/, "");
		await scrape(await requestDocument(url));
	}
	else {
		await scrape(doc, url);
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://eprint.iacr.org/2005/033",
		"items": [
			{
				"itemType": "preprint",
				"title": "An Attack on CFB Mode Encryption As Used By OpenPGP",
				"creators": [
					{
						"firstName": "Serge",
						"lastName": "Mister",
						"creatorType": "author"
					},
					{
						"firstName": "Robert",
						"lastName": "Zuccherato",
						"creatorType": "author"
					}
				],
				"date": "2005",
				"abstractNote": "This paper describes an adaptive-chosen-ciphertext attack on the Cipher Feedback (CFB) mode of encryption as used in OpenPGP. In most circumstances it will allow an attacker to determine 16 bits of any block of plaintext with about $2^{15}$ oracle queries for the initial\nsetup work and $2^{15}$ oracle queries for each block. Standard CFB mode encryption does not appear to be affected by this attack. It applies to a particular variation of CFB used by OpenPGP. In particular it exploits an ad-hoc integrity check feature in OpenPGP which was meant as a \"quick check\" to determine the correctness of the decrypting symmetric key.",
				"archive": "Cryptology ePrint Archive",
				"archiveID": "2005/033",
				"extra": "Publication info: Published elsewhere. Unknown where it was published",
				"libraryCatalog": "Cryptology ePrint Archive (eprint.iacr.org)",
				"url": "https://eprint.iacr.org/2005/033",
				"attachments": [
					{
						"mimeType": "application/pdf",
						"title": "Full Text PDF"
					}
				],
				"tags": [
					{
						"tag": "applications"
					},
					{
						"tag": "cryptanalysis"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://eprint.iacr.org/2011/566",
		"items": [
			{
				"itemType": "preprint",
				"title": "Fully Homomorphic Encryption with Polylog Overhead",
				"creators": [
					{
						"firstName": "Craig",
						"lastName": "Gentry",
						"creatorType": "author"
					},
					{
						"firstName": "Shai",
						"lastName": "Halevi",
						"creatorType": "author"
					},
					{
						"firstName": "Nigel P.",
						"lastName": "Smart",
						"creatorType": "author"
					}
				],
				"date": "2011",
				"abstractNote": "We show that homomorphic evaluation of (wide enough) arithmetic circuits can be accomplished with only polylogarithmic overhead. Namely, we present a construction of fully homomorphic encryption (FHE) schemes that for security parameter $\\secparam$ can evaluate any width-$\\Omega(\\secparam)$ circuit with $t$ gates in time $t\\cdot polylog(\\secparam)$.\n\nTo get low overhead, we use the recent batch homomorphic evaluation techniques of Smart-Vercauteren and Brakerski-Gentry-Vaikuntanathan, who showed that homomorphic operations can be applied to \"packed\" ciphertexts that encrypt vectors of plaintext elements. In this work, we introduce permuting/routing techniques to move plaintext elements across\nthese vectors efficiently. Hence, we are able to implement general arithmetic circuit in a batched fashion without ever needing to \"unpack\" the plaintext vectors.\n\nWe also introduce some other optimizations that can speed up homomorphic evaluation in certain cases. For example, we show how to use the Frobenius map to raise plaintext elements to powers of~$p$ at the \"cost\" of a linear operation.",
				"archive": "Cryptology ePrint Archive",
				"archiveID": "2011/566",
				"extra": "Publication info: Published elsewhere. extended abstract in Eurocrypt 2012",
				"libraryCatalog": "Cryptology ePrint Archive (eprint.iacr.org)",
				"url": "https://eprint.iacr.org/2011/566",
				"attachments": [
					{
						"mimeType": "application/pdf",
						"title": "Full Text PDF"
					}
				],
				"tags": [
					{
						"tag": "Automorphism"
					},
					{
						"tag": "Batching"
					},
					{
						"tag": "Bootstrapping"
					},
					{
						"tag": "Galois group"
					},
					{
						"tag": "Homomorphic encryption"
					},
					{
						"tag": "Permutation network"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://eprint.iacr.org/2022/1039",
		"items": [
			{
				"itemType": "preprint",
				"title": "Theoretical Limits of Provable Security Against Model Extraction by Efficient Observational Defenses",
				"creators": [
					{
						"firstName": "Ari",
						"lastName": "Karchmer",
						"creatorType": "author"
					}
				],
				"date": "2022",
				"abstractNote": "Can we hope to provide provable security against model extraction attacks? As a step towards a theoretical study of this question, we unify and abstract a wide range of \"observational\" model extraction defenses (OMEDs) --- roughly, those that attempt to detect model extraction by analyzing the distribution over the adversary's queries. To accompany the abstract OMED, we define the notion of complete OMEDs --- when benign clients can freely interact with the model --- and sound OMEDs --- when adversarial clients are caught and prevented from reverse engineering the model. Our formalism facilitates a simple argument for obtaining provable security against model extraction by complete and sound OMEDs, using (average-case) hardness assumptions for PAC-learning, in a way that abstracts current techniques in the prior literature.\n\nThe main result of this work establishes a partial computational incompleteness theorem for the OMED: any efficient OMED for a machine learning model computable by a polynomial size decision tree that satisfies a basic form of completeness cannot satisfy soundness, unless the subexponential Learning Parity with Noise (LPN) assumption does not hold. To prove the incompleteness theorem, we introduce a class of model extraction attacks called natural Covert Learning attacks based on a connection to the Covert Learning model of Canetti and Karchmer (TCC '21), and show that such attacks circumvent any defense within our abstract mechanism in a black-box, nonadaptive way. As a further technical contribution, we extend the Covert Learning algorithm of Canetti and Karchmer to work over any \"concise\" product distribution (albeit for juntas of a logarithmic number of variables rather than polynomial size decision trees), by showing that the technique of learning with a distributional inverter of Binnendyk et al. (ALT '22) remains viable in the Covert Learning setting.",
				"archive": "Cryptology ePrint Archive",
				"archiveID": "2022/1039",
				"extra": "Publication info: Published elsewhere. IEEE Secure and Trustworthy Machine Learning (SATML)",
				"libraryCatalog": "Cryptology ePrint Archive (eprint.iacr.org)",
				"url": "https://eprint.iacr.org/2022/1039",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Covert Learning"
					},
					{
						"tag": "Model Extraction"
					},
					{
						"tag": "Provable Security"
					}
				],
				"notes": [
					{
						"note": "This is an updated version. The paper has been modified to improve readability and argumentation. Some new results have been added in section 5. The previous version of the paper appeared under the title \"The Limits of Provable Security Against Model Extraction.\" The current version is the same as for publication in IEEE SATML '23, except for minor differences and formatting."
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://eprint.iacr.org/search?q=test",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://eprint.iacr.org/days/7",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://eprint.iacr.org/2021/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://eprint.iacr.org/complete/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://eprint.iacr.org/2019/430",
		"items": [
			{
				"itemType": "preprint",
				"title": "Composition of Boolean Functions: An Application to the Secondary Constructions of Bent Functions",
				"creators": [
					{
						"firstName": "Guangpu",
						"lastName": "Gao",
						"creatorType": "author"
					},
					{
						"firstName": "Dongdai",
						"lastName": "Lin",
						"creatorType": "author"
					},
					{
						"firstName": "Wenfen",
						"lastName": "Liu",
						"creatorType": "author"
					},
					{
						"firstName": "Yongjuan",
						"lastName": "Wang",
						"creatorType": "author"
					}
				],
				"date": "2019",
				"abstractNote": "Bent functions are optimal combinatorial objects and have been attracted\ntheir research for four decades. Secondary constructions play a central role\nin constructing bent functions since a complete classification of this class\nof functions is elusive. This paper is devoted to establish a relationship\nbetween the secondary constructions and the composition of Boolean\nfunctions. We firstly prove that some well-known secondary constructions of\nbent functions, can be described by the composition of a plateaued Boolean\nfunction and some bent functions. Then their dual functions can be\ncalculated by the Lagrange interpolation formula. By following this\nobservation, two secondary constructions of\nbent functions are presented. We show that they are inequivalent to the known ones, and\nmay generate bent functions outside the primary classes $\\mathcal{M}$ and $%\n\\mathcal{PS}$. These results show that the method we present in this paper\nis genetic and unified and therefore can be applied to the constructions of Boolean\nfunctions with other cryptographical criteria.",
				"archive": "Cryptology ePrint Archive",
				"archiveID": "2019/430",
				"extra": "Publication info: Preprint. MINOR revision.",
				"libraryCatalog": "Cryptology ePrint Archive (eprint.iacr.org)",
				"shortTitle": "Composition of Boolean Functions",
				"url": "https://eprint.iacr.org/2019/430",
				"attachments": [],
				"tags": [
					{
						"tag": "Bent"
					},
					{
						"tag": "Composition of Boolean functions"
					},
					{
						"tag": "Lagrange interpolation formula"
					},
					{
						"tag": "Secondary constructions"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://eprint.iacr.org/2002/195",
		"items": [
			{
				"itemType": "preprint",
				"title": "An addition to the paper: A polarisation based visual crypto system and its secret sharing schemes",
				"creators": [
					{
						"firstName": "H. D. L.",
						"lastName": "Hollmann",
						"creatorType": "author"
					},
					{
						"firstName": "J. H. v",
						"lastName": "Lint",
						"creatorType": "author"
					},
					{
						"firstName": "L.",
						"lastName": "Tolhuizen",
						"creatorType": "author"
					},
					{
						"firstName": "P.",
						"lastName": "Tuyls",
						"creatorType": "author"
					}
				],
				"date": "2002",
				"abstractNote": "An (n,k) pair is a pair of binary nxm matrices (A,B), such that the weight of the modulo-two sum of any i rows, 1\\leq i \\leq k, from A or B is equal to a_i or b_i, respectively, and moreover, a_i=b_i, for 1\\leq i < k, while a_k \\neq b_k. In this note we first show how to construct an (n,k) Threshold Visual Secret Sharing Scheme from an (n,k) pair. Then, we explicitly construct an (n,k)-pair for all n and k with 1 \\leq k <n.",
				"archive": "Cryptology ePrint Archive",
				"archiveID": "2002/195",
				"extra": "Publication info: Published elsewhere. Unknown where it was published",
				"libraryCatalog": "Cryptology ePrint Archive (eprint.iacr.org)",
				"shortTitle": "An addition to the paper",
				"url": "https://eprint.iacr.org/2002/195",
				"attachments": [
					{
						"mimeType": "application/ps",
						"title": "Full Text PS"
					}
				],
				"tags": [
					{
						"tag": "(MDS) codes"
					},
					{
						"tag": "Light Polarisation"
					},
					{
						"tag": "Threshold Visual Secret Sharing Schemes"
					},
					{
						"tag": "XOR"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://eprint.iacr.org/2002/163",
		"items": [
			{
				"itemType": "preprint",
				"title": "Man-in-the-Middle in Tunnelled Authentication Protocols",
				"creators": [
					{
						"firstName": "N.",
						"lastName": "Asokan",
						"creatorType": "author"
					},
					{
						"firstName": "Valtteri",
						"lastName": "Niemi",
						"creatorType": "author"
					},
					{
						"firstName": "Kaisa",
						"lastName": "Nyberg",
						"creatorType": "author"
					}
				],
				"date": "2002",
				"abstractNote": "Recently new protocols have been proposed in IETF for protecting\nremote client authentication protocols by running them within a\nsecure tunnel. Examples of such protocols are PIC, PEAP and EAP-TTLS.\nOne goal of these new protocols is to enable the migration from legacy\nclient authentication protocols to more secure protocols, e.g., from\nplain EAP type to, say, PEAP. In the new drafts, the security of\nthe subsequent session credentials are based only on keys derived\nduring the unilateral authentication where the network server is\nauthenticated to the client. Client authentication is mentioned as an\noption in PEAP and EAP-TTLS, but is not mandated. Naturally, the PIC\nprotocol does not even offer this option, because the goal of PIC is\nto obtain credentials that can be used for client authentication.\n\nIn addition to running the authentication protocols within such tunnel\nit should also be possible to use them in legacy mode without any\ntunnelling so as to leverage the legacy advantages such as widespread\nuse. In this paper we show that in practical situations, such a mixed\nmode usage opens up the possibility to run a man-in-the-middle attack\nfor impersonating the legitimate client. For those well-designed\nclient authentication protocols that already have a sufficient level\nof security, the use of tunnelling in the proposed form is a step\nbackwards because they introduce a new vulnerability.\n\nThe problem is due to the fact that the legacy client authentication\nprotocol is not aware if it is run in protected or unprotected mode.\nWe propose to solve the discovered problem by using a cryptographic\nbinding between the client authentication protocol and the protection\nprotocol.",
				"archive": "Cryptology ePrint Archive",
				"archiveID": "2002/163",
				"extra": "Publication info: Published elsewhere. Unknown where it was published",
				"libraryCatalog": "Cryptology ePrint Archive (eprint.iacr.org)",
				"url": "https://eprint.iacr.org/2002/163",
				"attachments": [
					{
						"mimeType": "application/pdf",
						"title": "Full Text PDF"
					},
					{
						"mimeType": "application/ps",
						"title": "Full Text PS"
					}
				],
				"tags": [
					{
						"tag": "Internet applications"
					},
					{
						"tag": "authentication protocols"
					},
					{
						"tag": "man-in-the-middle attacks"
					}
				],
				"notes": [
					{
						"note": "Draft updated. PS version provided."
					}
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
