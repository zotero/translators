{
	"translatorID": "9575e804-219e-4cd6-813d-9b690cbfc0fc",
	"label": "PLoS Journals",
	"creator": "Michael Berkowitz And Rintze Zelle",
	"target": "^https?://(www\\.plos(one|ntds|compbiol|pathogens|genetics|medicine|biology)\\.org|journals\\.plos\\.org)/(search/|\\w+/article)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2015-01-15 03:50:06"
}

function detectWeb(doc, url) {
	if (url.indexOf("Search.action") != -1
		|| url.indexOf("browse.action") != -1
		|| url.indexOf("browseIssue.action") != -1
		|| url.indexOf("/search/") != -1) {
		return getSearchResults(doc, url, true) ? "multiple" : false;
	}
	
	var host = getHost(doc);
	if (url.indexOf("/article?") != -1 && getID(url) && host) {
		// For individual articles we have to fetch data from different host,
		// so we have to defer to server translation
		return Zotero.isBookmarklet && url.indexOf(host) == -1 ? "server" : "journalArticle";
	}
}

function getSearchResults(doc, url, checkOnly) {
	var articlex;
	if(url.indexOf('browseIssue.action') == -1) {
		articlex = '//span[@class="article"]/a';
	} else {
		articlex = '//div[@class="header"]/h3/a';
	}
	
	var articles = ZU.xpath(doc, articlex),
		items = {},
		found = false;
	for (var i=0; i<articles.length; i++) {
		var id = getID(articles[i].href);
		if (!id) {
			Z.debug("Could not extract ID from URL: " + articles[i].href);
			continue;
		}
		
		if (checkOnly) return true;
		items[id] = ZU.trimInternal(articles[i].textContent);
		found = true;
	}
	
	return found ? items : false;
}

function getID(url) {
	var m = url.match(/[?&]id=([^&?#]+)/);
	if (m) return m[1];
	
	m = url.match(/info(%3A|:)doi(?:%2F|\/)([^&?#]+)/);
	if (m) {
		if (m[1] != ':')  {
			return decodeURIComponent(m[2]);
		} else {
			return m[2];
		}
	}
}

function getHost(doc) {
	// Retrieve host for RIS
	var downloadLink = doc.getElementById('downloadCitation');
	if (!downloadLink) return;
	return downloadLink.href.replace(/(https?:\/\/.+?)\/.*$/, '$1');
}
function getSelectedItems(doc, articleXPath) {
	var items = {};
	var articles = doc.evaluate(articleXPath, doc, null, XPathResult.ANY_TYPE, null);
	var next_art;
	while (next_art = articles.iterateNext()) {
		items[next_art.href] = next_art.textContent.trim();
	}
	Zotero.selectItems(items, function (items) {
		if(!items) return true;
		
		var texts = [];
		for (var i in items) {
			texts.push(i);
		}
		processTexts(texts);
	});
}

function doWeb(doc, url) {
	var risBaseURL = '/article/getRisCitation.action?articleURI=info%3Adoi%2F';
	if (detectWeb(doc, url) == 'multiple') {
		Zotero.selectItems(getSearchResults(doc, url), function(items) {
			if (!items) return true;
			
			var urls = [];
			for (var i in items) {
				urls.push(risBaseURL + encodeURIComponent(i));
			}
			processTexts(urls);
		})
	} else {
		var host = getHost(doc);
		var id = getID(url);
		
		processTexts([host + risBaseURL + encodeURIComponent(id)]);
	}
}

function processTexts(texts) {
	var risLinks = [];
	for (var i in texts) {
		var risLink = texts[i];
		var pdfURL = risLink.replace("getRisCitation.action?articleURI=", "fetchObject.action?uri=")
			+ '&representation=PDF';
		(function(risLink, pdfURL) {
			//Z.debug(pdfURL)
			ZU.doGet(risLink, function (text) {
				var translator = Zotero.loadTranslator("import");
				translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
				translator.setString(text);
				translator.setHandler("itemDone", function (obj, item) {
					item.attachments = [{
						url: pdfURL,
						title: "PLoS Full Text PDF",
						mimeType: "application/pdf"
					}];
					
					if (item.url) {
						item.url = item.url.replace('%2F', '/');
					}
					
					item.complete();
				});
				translator.translate();
			});
		})(risLink, pdfURL);
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://journals.plos.org/plosbiology/article?id=10.1371/journal.pbio.1001090",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "The Naturally Processed CD95L Elicits a c-Yes/Calcium/PI3K-Driven Cell Migration Pathway",
				"creators": [
					{
						"lastName": "Tauzin",
						"firstName": "Sébastien",
						"creatorType": "author"
					},
					{
						"lastName": "Chaigne-Delalande",
						"firstName": "Benjamin",
						"creatorType": "author"
					},
					{
						"lastName": "Selva",
						"firstName": "Eric",
						"creatorType": "author"
					},
					{
						"lastName": "Khadra",
						"firstName": "Nadine",
						"creatorType": "author"
					},
					{
						"lastName": "Daburon",
						"firstName": "Sophie",
						"creatorType": "author"
					},
					{
						"lastName": "Contin-Bordes",
						"firstName": "Cécile",
						"creatorType": "author"
					},
					{
						"lastName": "Blanco",
						"firstName": "Patrick",
						"creatorType": "author"
					},
					{
						"lastName": "Le Seyec",
						"firstName": "Jacques",
						"creatorType": "author"
					},
					{
						"lastName": "Ducret",
						"firstName": "Thomas",
						"creatorType": "author"
					},
					{
						"lastName": "Counillon",
						"firstName": "Laurent",
						"creatorType": "author"
					},
					{
						"lastName": "Moreau",
						"firstName": "Jean-François",
						"creatorType": "author"
					},
					{
						"lastName": "Hofman",
						"firstName": "Paul",
						"creatorType": "author"
					},
					{
						"lastName": "Vacher",
						"firstName": "Pierre",
						"creatorType": "author"
					},
					{
						"lastName": "Legembre",
						"firstName": "Patrick",
						"creatorType": "author"
					}
				],
				"date": "June 21, 2011",
				"DOI": "10.1371/journal.pbio.1001090",
				"abstractNote": "Author Summary\nThe “death receptor” CD95 (also known as Fas) plays an essential role in ensuring immune tolerance of self antigens as well as in the elimination of the body's cells that have been infected or transformed. This receptor is engaged by the membrane-bound ligand CD95L, which can be released into blood circulation after cleavage by metalloproteases. Hitherto, most of the studies on the CD95 signal have been performed with chimeric CD95Ls that mimic the membrane-bound ligand and exhibit a level of aggregation beyond that described for the metalloprotease-cleaved ligand. Multi-aggregated CD95L elicits a caspase-driven apoptotic signal. In this study, we observe that levels of soluble and naturally processed CD95L in sera of patients suffering from lupus correlate with disease severity. Strikingly, although this soluble CD95L fails to trigger cell death unlike its chimeric version, it induces a “non-canonical” Ca2+/c-yes/PI3K-dependent signaling pathway that promotes the transmigration of T-lymphocytes across the endothelial barrier. These findings shed light on an entirely new role for the soluble CD95L that may contribute to local or systemic tissue damage by enhancing the infiltration of activated T-lymphocytes. Overall, these findings underline the importance of revisiting the role of this “apoptotic cytokine” in the context of chronic inflammatory disorders.",
				"issue": "6",
				"journalAbbreviation": "PLoS Biol",
				"libraryCatalog": "PLoS Journals",
				"pages": "e1001090",
				"publicationTitle": "PLoS Biol",
				"url": "http://dx.doi.org/10.1371/journal.pbio.1001090",
				"volume": "9",
				"attachments": [
					{
						"title": "PLoS Full Text PDF",
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
		"url": "http://journals.plos.org/plosmedicine/article?id=10.1371/journal.pmed.1000098",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "An Economic Evaluation of Venous Thromboembolism Prophylaxis Strategies in Critically Ill Trauma Patients at Risk of Bleeding",
				"creators": [
					{
						"lastName": "Chiasson",
						"firstName": "T. Carter",
						"creatorType": "author"
					},
					{
						"lastName": "Manns",
						"firstName": "Braden J.",
						"creatorType": "author"
					},
					{
						"lastName": "Stelfox",
						"firstName": "Henry Thomas",
						"creatorType": "author"
					}
				],
				"date": "June 23, 2009",
				"DOI": "10.1371/journal.pmed.1000098",
				"abstractNote": "Using decision analysis, Henry Stelfox and colleagues estimate the cost-effectiveness of three venous thromboembolism prophylaxis strategies in patients with severe traumatic injuries who were also at risk for bleeding complications.",
				"issue": "6",
				"journalAbbreviation": "PLoS Med",
				"libraryCatalog": "PLoS Journals",
				"pages": "e1000098",
				"publicationTitle": "PLoS Med",
				"url": "http://dx.doi.org/10.1371/journal.pmed.1000098",
				"volume": "6",
				"attachments": [
					{
						"title": "PLoS Full Text PDF",
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
		"url": "http://www.plosmedicine.org/article/browseIssue.action",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.plosbiology.org/search/simple?from=globalSimpleSearch&filterJournals=PLoSBiology&query=amygdala&x=0&y=0",
		"items": "multiple"
	}
]
/** END TEST CASES **/