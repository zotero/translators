{
	"translatorID": "2e1c09a0-3006-11de-8c30-0800200c9a66",
	"label": "Euclid",
	"creator": "Guy Freeman and Avram Lyon",
	"target": "^https?://[^/]*projecteuclid\\.org[^/]*/",
	"minVersion": "1.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2012-11-13 12:15:19"
}

function detectWeb(doc, url) {

	var xpath = '//div[@class="abstract-text"]';
	Zotero.debug(xpath);
	if (doc.evaluate(xpath, doc, null, XPathResult.ANY_TYPE, null).iterateNext()) {
		return "journalArticle";
	}
}

function doWeb(doc, url) {
	var host = doc.location.host;
	var newItem = new Zotero.Item("journalArticle");
	newItem.url = doc.location.href;
	//Zotero.debug(doc.location.href);
	var items = Object();
	var header;
	var contents;

	var titleXPath = '//div[@id="main-text"]/h3';
	var titleitem = doc.evaluate(titleXPath, doc, null, XPathResult.ANY_TYPE, null).iterateNext().textContent;
	//Zotero.debug(titleitem);
	newItem.title = titleitem;
	
	//get author from google tags
	var authors = ZU.xpathText(doc, '//meta[@name="citation_authors"]/@content');
	if (authors){
		var author = authors.split(/\s*;\s*/)
		for (var i in author){
			Z.debug(author)
			newItem.creators.push(Zotero.Utilities.cleanAuthor(author[i], 'author', true));
		}
	}
	
	else{
		//leaving the old code here in case it's still needed
		var authorXPath = '//div[@class="abs-page-text-bold"]/span';
		var authoritem = doc.evaluate(authorXPath, doc, null, XPathResult.ANY_TYPE, null).iterateNext().textContent.replace(/^\s*|\s*$/g, '');
		if (authoritem.search(/\sand\s/) == -1) {
			var authoritem2 = "";
			for (var authornamescount in authoritem.split(/\s/)) {
				authoritem2 = authoritem2 + " " + authoritem.split(/\s/)[authornamescount][0] + authoritem.split(/\s/)[authornamescount].substring(1).toLowerCase();
			}
			newItem.creators.push(Zotero.Utilities.cleanAuthor(authoritem2, 'author'));
		} else {
			var authors = authoritem.split(/\sand\s/i);
			for (var authorcount in authors) {
				var author = "";
				for (var authornames in authors[authorcount].split(/\s/)) {
					author = author + " " + authors[authorcount].split(/\s/)[authornames][0] + authors[authorcount].split(/\s/)[authornames].substring(1).toLowerCase();
				}
				newItem.creators.push(Zotero.Utilities.cleanAuthor(author, 'author'));
			}
		}
	}
	var abstractXPath = '//div[@class="abstract-text"]/p';
	var abstractitem = doc.evaluate(abstractXPath, doc, null, XPathResult.ANY_TYPE, null).iterateNext().textContent;
	newItem.abstractNote = abstractitem;

	var journalXPath = '//div[@id="main-image"]/img';
	var journalitem = doc.evaluate(journalXPath, doc, null, XPathResult.ANY_TYPE, null).iterateNext()["alt"];
	newItem.publicationTitle = journalitem;

	var journalabbXPath = '//div[@class="abs-page-text"]/a';
	var journalabbitem = doc.evaluate(journalabbXPath, doc, null, XPathResult.ANY_TYPE, null).iterateNext().textContent;
	newItem.journalAbbreviation = journalabbitem;

	var idXPath = '//div[@id="identifier"]/p';
	var idresult = doc.evaluate(idXPath, doc, null, XPathResult.ANY_TYPE, null).iterateNext().innerHTML;
	var idrows = idresult.split('<br>');
	var idrow, pieces;
	var identifiers = [];
	newItem.extra = "";
	for each(idrow in idrows) {
		pieces = idrow.match(/\s*([^:]+)\s*:\s*(.+)/);
		if (pieces && pieces[1] && pieces[2]) {
			switch (pieces[1]) {
			case "Digital Object Identifier":
				newItem.DOI = pieces[2].match(/^\s*doi:(.*)/)[1];
				break;
			case "Mathematical Reviews number (MathSciNet)":
			case "Zentralblatt MATH identifier":
				identifiers.push(pieces[1] + ": " + pieces[2].match(/>(.*?)</)[1]);
				break;
			case "Permanent link to this document":
				newItem.url = pieces[2];
				break;
			default:
				Zotero.debug("Discarding identifier: " + pieces[1] + ": " + pieces[2]);
				break;
			}
			pieces = null;
		}
		newItem.extra = identifiers.join("; ");
	}

	var volumeetcXPath = '//div[@class="abs-page-text"]/text()';
	//var volumeetcitem = doc.evaluate(volumeetcXPath, doc, null, XPathResult.ANY_TYPE, null).iterateNext().childNodes[2].textContent;
	var volumeetcitem = doc.evaluate(volumeetcXPath, doc, null, XPathResult.ANY_TYPE, null).iterateNext().textContent;
	//Zotero.debug("volumeetcitem="+volumeetcitem);
	var volumeetcitemarray = volumeetcitem.replace(/\s+/g, " ").split(/\s/);
	if (volumeetcitemarray[3].search(/Number/) == -1 && volumeetcitemarray[3].search(/Issue/) == -1) {
		var volumeitem = volumeetcitemarray[2].match(/\d+/)[0];
		var yearitem = volumeetcitemarray[3].match(/\d+/)[0];
		var pagesitem = volumeetcitemarray[4].match(/[^\.]+/)[0];
		newItem.volume = volumeitem;
		newItem.pages = pagesitem;
		newItem.date = yearitem;
	} else {
		var volumeitem = volumeetcitemarray[2].match(/\d+/)[0];
		var issueitem = volumeetcitemarray[4].match(/\d+/)[0];
		var yearitem = volumeetcitemarray[5].match(/\d+/)[0];
		var pagesitem = volumeetcitemarray[6].match(/[^\.]+/)[0];
		newItem.volume = volumeitem;
		newItem.pages = pagesitem;
		newItem.issue = issueitem;
		newItem.date = yearitem;
	}

	// From META tags
	newItem.publisher = doc.evaluate('//meta[@name="citation_publisher"]', doc, null, XPathResult.ANY_TYPE, null).iterateNext().content;
	newItem.date = doc.evaluate('//meta[@name="citation_date"]', doc, null, XPathResult.ANY_TYPE, null).iterateNext().content;
	newItem.ISSN = doc.evaluate('//meta[@name="citation_issn"]', doc, null, XPathResult.ANY_TYPE, null).iterateNext().content;
	newItem.language = doc.evaluate('//meta[@name="citation_language"]', doc, null, XPathResult.ANY_TYPE, null).iterateNext().content;

	var pdfurlxpath = '//meta[@name="citation_pdf_url"]';
	if (doc.evaluate(pdfurlxpath, doc, null, XPathResult.ANY_TYPE, null).iterateNext()) {
		var pdfurl = doc.evaluate(pdfurlxpath, doc, null, XPathResult.ANY_TYPE, null).iterateNext().content;
		newItem.attachments.push({
			url: pdfurl,
			title: "Euclid Project PDF",
			mimeType: "application/pdf"
		});
	}

	newItem.complete();
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://projecteuclid.org/DPubS?service=UI&version=1.0&verb=Display&handle=euclid.jsl/1309952534",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Russell",
						"lastName": "Miller",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"url": "http://projecteuclid.org/DPubS/Repository/1.0/Disseminate?view=body&id=pdf_1&handle=euclid.jsl/1309952534",
						"title": "Euclid Project PDF",
						"mimeType": "application/pdf"
					}
				],
				"url": "http://projecteuclid.org/euclid.jsl/1309952534",
				"title": "Low5 Boolean subalgebras and computable copies",
				"abstractNote": "It is known that the spectrum of a Boolean algebra\ncannot contain a low4 degree unless it also contains\nthe degree 0; it remains open\nwhether the same holds for low5 degrees.\nWe address the question differently, by considering\nBoolean subalgebras of the computable atomless\nBoolean algebra ℬ.  For such subalgebras 𝒜,\nwe show that it is possible for the spectrum of\nthe unary relation 𝒜 on ℬ to contain\na low5 degree without containing 0.",
				"publicationTitle": "Journal of Symbolic Logic",
				"journalAbbreviation": "J. Symbolic Logic",
				"DOI": "10.2178/jsl/1309952534",
				"volume": "76",
				"pages": "1061-1074",
				"issue": "3",
				"date": "2011-09",
				"publisher": "Association for Symbolic Logic",
				"ISSN": "0022-4812",
				"language": "EN",
				"libraryCatalog": "Euclid",
				"extra": "Mathematical Reviews number (MathSciNet): MR2849259",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://projecteuclid.org/DPubS?service=UI&version=1.0&verb=Display&handle=euclid.aoas/1310562719",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Christopher J.",
						"lastName": "Long",
						"creatorType": "author"
					},
					{
						"firstName": "Patrick L.",
						"lastName": "Purdon",
						"creatorType": "author"
					},
					{
						"firstName": "Simona",
						"lastName": "Temereanca",
						"creatorType": "author"
					},
					{
						"firstName": "Neil U.",
						"lastName": "Desai",
						"creatorType": "author"
					},
					{
						"firstName": "Matti S.",
						"lastName": "Hämäläinen",
						"creatorType": "author"
					},
					{
						"firstName": "Emery N.",
						"lastName": "Brown",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Euclid Project PDF",
						"mimeType": "application/pdf"
					}
				],
				"url": "http://projecteuclid.org/euclid.aoas/1310562719",
				"title": "State-space solutions to the dynamic magnetoencephalography inverse problem using high performance computing",
				"abstractNote": "Determining the magnitude and location of neural sources within the brain that are responsible for generating magnetoencephalography (MEG) signals measured on the surface of the head is a challenging problem in functional neuroimaging. The number of potential sources within the brain exceeds by an order of magnitude the number of recording sites. As a consequence, the estimates for the magnitude and location of the neural sources will be ill-conditioned because of the underdetermined nature of the problem. One well-known technique designed to address this imbalance is the minimum norm estimator (MNE). This approach imposes an L2 regularization constraint that serves to stabilize and condition the source parameter estimates. However, these classes of regularizer are static in time and do not consider the temporal constraints inherent to the biophysics of the MEG experiment. In this paper we propose a dynamic state-space model that accounts for both spatial and temporal correlations within and across candidate intracortical sources. In our model, the observation model is derived from the steady-state solution to Maxwell’s equations while the latent model representing neural dynamics is given by a random walk process. We show that the Kalman filter (KF) and the Kalman smoother [also known as the fixed-interval smoother (FIS)] may be used to solve the ensuing high-dimensional state-estimation problem. Using a well-known relationship between Bayesian estimation and Kalman filtering, we show that the MNE estimates carry a significant zero bias. Calculating these high-dimensional state estimates is a computationally challenging task that requires High Performance Computing (HPC) resources. To this end, we employ the NSF Teragrid Supercomputing Network to compute the source estimates. We demonstrate improvement in performance of the state-space algorithm relative to MNE in analyses of simulated and actual somatosensory MEG experiments. Our findings establish the benefits of high-dimensional state-space modeling as an effective means to solve the MEG source localization problem.",
				"publicationTitle": "The Annals of Applied Statistics",
				"journalAbbreviation": "Ann. Appl. Stat.",
				"extra": "Mathematical Reviews number (MathSciNet): MR2849772; Zentralblatt MATH identifier: 1223.62160",
				"DOI": "10.1214/11-AOAS483",
				"volume": "5",
				"pages": "1207-1228",
				"issue": "2",
				"date": "2011-06",
				"publisher": "Institute of Mathematical Statistics",
				"ISSN": "1932-6157",
				"language": "EN",
				"libraryCatalog": "Euclid",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	}
]
/** END TEST CASES **/