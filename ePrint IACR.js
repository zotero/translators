{
	"translatorID": "04a23cbe-5f8b-d6cd-8eb1-2e23bcc8ae8f",
	"label": "ePrint IACR",
	"creator": "Jonas Schrieb",
	"target": "^https?://eprint\\.iacr\\.org/",
	"minVersion": "1.0.0b3.r1",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-10-28 16:15:17"
}

let preprintType = ZU.fieldIsValidForType('title', 'preprint')
	? 'preprint'
	: 'report';

function detectWeb(doc, url) {
	var singleRe   = /^https?:\/\/eprint\.iacr\.org\/(\d{4}\/\d{3}|cgi-bin\/print\.pl)/;
	var multipleRe = /^https?:\/\/eprint\.iacr\.org\/search\?/;
	if (singleRe.test(url)) {
		return preprintType;
	} else if (multipleRe.test(url)) {
		return "multiple";
	}
}

function scrape(doc, url) {
	var reportNoSelector = "h4";
	var titleSelector    = "h3";
	var authorsSelector  = 'meta[name="citation_author"]'
	var abstractXPath    = "//h5[starts-with(text(),\"Abstract\")]/following-sibling::p/text()";
	var keywordsSelector = ".keywords > .keyword";
	var reportNo = text(doc, reportNoSelector);
	reportNo = reportNo.match(/(\d{4})\/(\d{3,4})$/);
	if (reportNo){
		var year = reportNo[1];
		var no   = reportNo[2];
	}
	var title = text(doc, titleSelector);
	title = ZU.trimInternal(title);

	var authors = doc.querySelectorAll(authorsSelector);
	authors = [...authors].map(author => author.content);
	
	var abstr = "";
	var abstractLines = doc.evaluate(abstractXPath, doc, null, XPathResult.ANY_TYPE, null);
	var nextLine;
	while (nextLine = abstractLines.iterateNext()) {
		// An inner line starting with \n starts a new paragraph in the abstract.
		if (nextLine.textContent[0] == "\n") {
			abstr += "\n\n";
		}
		abstr +=  ZU.trimInternal(nextLine.textContent);
	}
	
	var keywords = doc.querySelectorAll(keywordsSelector);
	keywords = [...keywords].map(kw => kw.textContent.trim());

	var newItem = new Zotero.Item(preprintType);
	
	newItem.date = year;
	newItem.reportNumber = no;
	//we want to use this later & make sure we don't make http--> https requests or vice versa. 
	newItem.url = url.match(/^https?:\/\/[^\/]+/)[0] + "/" + year + "/" + no;
	newItem.title = title;
	newItem.abstractNote = abstr;
	for (var i in authors) {
		newItem.creators.push(Zotero.Utilities.cleanAuthor(authors[i], "author"));
	}
for (var i = 0; i < keywords.length; i++) {
	//sometimes the keywords split returns an empty tag - those crash the translator if they're pushed.
	if (keywords[i] != null){
		newItem.tags.push(keywords[i]);}
	}
	newItem.attachments = [
		{url:newItem.url+".pdf", title:"Full Text PDF", mimeType:"application/pdf"}
	];
	newItem.complete();

}

function doWeb(doc, url) {
	var nextTitle;

	if (detectWeb(doc, url) == "multiple") {
		var rowSelector = ".paperList > div, .results > div";
		var titleSelector = ".papertitle, strong";
		var linkSelector = ".paperlink, a:first-child";

		let items = {};
		for (let row of doc.querySelectorAll(rowSelector)) {
			let title = text(row, titleSelector);
			let href = attr(row, linkSelector, 'href');
			if (!title || !href) continue;
			items[href] = title;
		}

		var titles = doc.querySelectorAll(titleSelector);
		var links  = doc.querySelectorAll(linkSelector);
		Zotero.selectItems(items, function (items) {
			if (items) ZU.processDocuments(Object.keys(items), scrape);
		});
	} else {
		if (url.search(/\.pdf$/)!= -1) {
			//go to the landing page to scrape
			url = url.replace(/\.pdf$/, "");
			ZU.processDocuments([url], scrape)
		}
		else scrape(doc, url)
	}
}/** BEGIN TEST CASES **/
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
				"abstractNote": "This paper describes an adaptive-chosen-ciphertext attack on the Cipher Feedback (CFB) mode of encryption as used in OpenPGP. In most circumstances it will allow an attacker to determine 16 bits of any block of plaintext with aboutoracle queries for the initial setup work andoracle queries for each block. Standard CFB mode encryption does not appear to be affected by this attack. It applies to a particular variation of CFB used by OpenPGP. In particular it exploits an ad-hoc integrity check feature in OpenPGP which was meant as a \"quick check\" to determine the correctness of the decrypting symmetric key.",
				"libraryCatalog": "ePrint IACR",
				"url": "https://eprint.iacr.org/2005/033",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
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
				"abstractNote": "We show that homomorphic evaluation of (wide enough) arithmetic circuits can be accomplished with only polylogarithmic overhead. Namely, we present a construction of fully homomorphic encryption (FHE) schemes that for security parametercan evaluate any width-circuit withgates in time. To get low overhead, we use the recent batch homomorphic evaluation techniques of Smart-Vercauteren and Brakerski-Gentry-Vaikuntanathan, who showed that homomorphic operations can be applied to \"packed\" ciphertexts that encrypt vectors of plaintext elements. In this work, we introduce permuting/routing techniques to move plaintext elements across these vectors efficiently. Hence, we are able to implement general arithmetic circuit in a batched fashion without ever needing to \"unpack\" the plaintext vectors. We also introduce some other optimizations that can speed up homomorphic evaluation in certain cases. For example, we show how to use the Frobenius map to raise plaintext elements to powers of~at the \"cost\" of a linear operation.",
				"libraryCatalog": "ePrint IACR",
				"url": "https://eprint.iacr.org/2011/566",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
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
		"url": "https://eprint.iacr.org/2016/1013.pdf",
		"items": [
			{
				"itemType": "preprint",
				"title": "A Formal Security Analysis of the Signal Messaging Protocol",
				"creators": [],
				"date": "2016",
				"abstractNote": "The Signal protocol is a cryptographic messaging protocol that provides end-to-end encryption for instant messaging in WhatsApp, Wire, and Facebook Messenger among many others, serving well over 1 billion active users. Signal includes several uncommon security properties (such as \"future secrecy\" or \"post-compromise security\"), enabled by a novel technique called *ratcheting* in which session keys are updated with every message sent. We conduct a formal security analysis of Signal's initial extended triple Diffie-Hellman (X3DH) key agreement and Double Ratchet protocols as a multi-stage authenticated key exchange protocol. We extract from the implementation a formal description of the abstract protocol, and define a security model which can capture the ratcheting key update structure as a multi-stage model where there can be a tree of stages, rather than just a sequence. We then prove the security of Signal's key exchange core in our model, demonstrating several standard security properties. We have found no major flaws in the design, and hope that our presentation and results can serve as a foundation for other analyses of this widely adopted protocol.Fix omission in description of initial X3DH handshake, reorganize figures for improved presentation. Full list of changes in Appendix D.",
				"libraryCatalog": "ePrint IACR",
				"url": "https://eprint.iacr.org/2016/1013",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Signal"
					},
					{
						"tag": "authenticated key exchange"
					},
					{
						"tag": "future secrecy"
					},
					{
						"tag": "messaging"
					},
					{
						"tag": "multi-stage key exchange"
					},
					{
						"tag": "post-compromise security"
					},
					{
						"tag": "protocols"
					},
					{
						"tag": "provable security"
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
				"title": "The Limits of Provable Security Against Model Extraction",
				"creators": [
					{
						"firstName": "Ari",
						"lastName": "Karchmer",
						"creatorType": "author"
					}
				],
				"date": "2022",
				"abstractNote": "Can we hope to provide provable security against model extraction attacks? As a step towards a theoretical study of this question, we unify and abstract a wide range of \"observational\" model extraction defense mechanisms -- roughly, those that attempt to detect model extraction using a statistical analysis conducted on the distribution over the adversary's queries. To accompany the abstract observational model extraction defense, which we call OMED for short, we define the notion of complete defenses -- the notion that benign clients can freely interact with the model -- and sound defenses -- the notion that adversarial clients are caught and prevented from reverse engineering the model. We then propose a system for obtaining provable security against model extraction by complete and sound OMEDs, using (average-case) hardness assumptions for PAC-learning. Our main result nullifies our proposal for provable security, by establishing a computational incompleteness theorem for the OMED: any efficient OMED for a machine learning model computable by a polynomial size decision tree that satisfies a basic form of completeness cannot satisfy soundness, unless the subexponential Learning Parity with Noise (LPN) assumption does not hold. To prove the incompleteness theorem, we introduce a class of model extraction attacks called natural Covert Learning attacks based on a connection to the Covert Learning model of Canetti and Karchmer (TCC '21), and show that such attacks circumvent any defense within our abstract mechanism in a black-box, nonadaptive way. Finally, we further expose the tension between Covert Learning and OMEDs by proving that Covert Learning algorithms require the nonexistence of provable security via efficient OMEDs. Therefore, we observe a \"win-win\" result by obtaining a characterization of the existence of provable security via efficient OMEDs by the nonexistence of natural Covert Learning algorithms.",
				"libraryCatalog": "ePrint IACR",
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
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://eprint.iacr.org/search?q=test",
		"items": "multiple"
	}
]
/** END TEST CASES **/
