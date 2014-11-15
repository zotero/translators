{
	"translatorID": "27ee5b2c-2a5a-4afc-a0aa-d386642d4eed",
	"label": "PubMed Central",
	"creator": "Michael Berkowitz and Rintze Zelle",
	"target": "^https?://(www.)?ncbi.nlm.nih.gov/pmc/",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 101,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsbv",
	"lastUpdated": "2014-11-13 20:01:34"
}

function detectWeb(doc, url) {
	if (getPMCID(url)) {
		return "journalArticle";
	}
	else if(getSearchResults(doc)) {
		return "multiple";
	}
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		var results = getSearchResults(doc);
		Zotero.selectItems(results.ids, function (ids) {
			if (!ids) {
				return true;
			}
			var pmcids = new Array();
			for (var i in ids) {
				pmcids.push(i);
			}
			lookupPMCIDs(pmcids, doc, results.pdfs);
		});
	} else {
		getSingle(doc, url);
	}
}

function getPMCID(url) {
	var pmcid = url.match(/\/articles\/PMC([\d]+)/);
	return pmcid ? pmcid[1] : false;
}


function getPDF(doc,xpath) {
	var pdf = ZU.xpath(doc,xpath);
	return pdf.length ? pdf[0].href : false;
}

function getSingle(doc, url) {
	var pmcid = getPMCID(url);
	var pdf = getPDF(doc,'//td[@class="format-menu"]//a[contains(@href,".pdf")]'
			+ '|//div[@class="format-menu"]//a[contains(@href,".pdf")]'
			+ '|//aside[@id="jr-alt-p"]/div/a[contains(@href,".pdf")]');
	var pdfCollection = {};
			
	if(pdf) pdfCollection[pmcid] = pdf;
		
	lookupPMCIDs([pmcid], doc, pdfCollection);
}

function getSearchResults(doc) {
	var articles = doc.getElementsByClassName('rprt'),
		ids = {},
		pdfCollection = {},
		found = false;
	for (var i = 0; i < articles.length; i++) {
		var article = articles[i],
			pmcid = ZU.xpathText(article,'.//dl[@class="rprtid"]/dd').match(/PMC([\d]+)/);
		if(pmcid) {
			pmcid = pmcid[1];
			var title = ZU.xpathText(article,'.//div[@class="title"]');
			var pdf = getPDF(article,'.//div[@class="links"]/a'
				+'[@class="view" and contains(@href,".pdf")][1]');
			ids[pmcid] = title;
			found = true;
			if(pdf) pdfCollection[pmcid] = pdf;
		}
	}
	return found ? {"ids":ids,"pdfs":pdfCollection} : false;
}

function lookupPMCIDs(ids, doc, pdfLink) {
	Zotero.wait();
	var newUri = "http://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pmc&retmode=xml&id=" + ids.join(",");
	Zotero.debug(newUri);
	Zotero.Utilities.HTTP.doGet(newUri, function (text) {
		text = text.replace(/(<[^!>][^>]*>)/g, function replacer(str, p1, p2, offset, s) {
			return str.replace(/-/gm, "");
		}); //Strip hyphens from element names, attribute names and attribute values
		text = text.replace(/(<[^!>][^>]*>)/g, function replacer(str, p1, p2, offset, s) {
			return str.replace(/:/gm, "");
		}); //Strip colons from element names, attribute names and attribute values
		text = text.replace(/<xref[^<\/]*<\/xref>/g, ""); //Strip xref cross reference from e.g. title
		text = Zotero.Utilities.trim(text);
		//Z.debug(text)
		
		var parser = new DOMParser();
		var doc = parser.parseFromString(text, "text/xml");

		var articles = ZU.xpath(doc, '/pmcarticleset/article');

		for(var i in articles) {
			var newItem = new Zotero.Item("journalArticle");
			
			var journal = ZU.xpath(articles[i], 'front/journalmeta');

			newItem.journalAbbreviation = ZU.xpathText(journal, 'journalid[@journalidtype="nlmta"]');
			
			var journalTitle;
			if ((journalTitle = ZU.xpathText(journal, 'journaltitlegroup/journaltitle'))) {
				newItem.publicationTitle = journalTitle;
			} else if ((journalTitle = ZU.xpathText(journal, 'journaltitle'))) {
				newItem.publicationTitle = journalTitle;
			}

			var issn;
			if ((issn = ZU.xpathText(journal, 'issn[@pubtype="ppub"]'))) {
				newItem.ISSN = issn;
			} else if ((issn = ZU.xpathText(journal, 'issn[@pubtype="epub"]'))) {
				newItem.ISSN = issn;
			}

			var article = ZU.xpath(articles[i], 'front/articlemeta');

			var abstract;
			if ((abstract = ZU.xpathText(article, 'abstract/p'))) {
				newItem.abstractNote = abstract;
			} else {
				var abstractSections = ZU.xpath(article, 'abstract/sec');
				var abstract = [];
				for (var j in abstractSections) {
					abstract.push(ZU.xpathText(abstractSections[j], 'title') + "\n" + ZU.xpathText(abstractSections[j], 'p'));
				}
				newItem.abstractNote = abstract.join("\n\n");
			}

			newItem.DOI = ZU.xpathText(article, 'articleid[@pubidtype="doi"]');
			
			newItem.extra = "PMID: " + ZU.xpathText(article, 'articleid[@pubidtype="pmid"]') + "\n";
			newItem.extra = newItem.extra + "PMCID: PMC" + ids[i];

			newItem.title = ZU.trim(ZU.xpathText(article, 'titlegroup/articletitle'));
			
			newItem.volume = ZU.xpathText(article, 'volume');
			newItem.issue = ZU.xpathText(article, 'issue');

			var lastPage = ZU.xpathText(article, 'lpage');
			var firstPage = ZU.xpathText(article, 'fpage');
			if (firstPage && lastPage && (firstPage != lastPage)) {
				newItem.pages = firstPage + "-" + lastPage;
			} else if (firstPage) {
				newItem.pages = firstPage;
			}

			var pubDate = ZU.xpath(article, 'pubdate[@pubtype="ppub"]');
			if (!pubDate.length) {
				pubDate = ZU.xpath(article, 'pubdate[@pubtype="epub"]');
			}
			if (pubDate) {
				if (ZU.xpathText(pubDate, 'day')) {
					newItem.date = ZU.xpathText(pubDate, 'year') + "-" + ZU.xpathText(pubDate, 'month') + "-" + ZU.xpathText(pubDate, 'day');
				} else if (ZU.xpathText(pubDate, 'month')) {
					newItem.date = ZU.xpathText(pubDate, 'year') + "-" + ZU.xpathText(pubDate, 'month');
				} else if (ZU.xpathText(pubDate, 'year')) {
					newItem.date = ZU.xpathText(pubDate, 'year');
				}
			}

			var contributors = ZU.xpath(article, 'contribgroup/contrib');
			if (contributors) {
				var authors = ZU.xpath(article, 'contribgroup/contrib[@contribtype="author"]');
				for (var j in authors) {
					var lastName = ZU.xpathText(authors[j], 'name/surname');
					var firstName = ZU.xpathText(authors[j], 'name/givennames');
					if (firstName || lastName) {
						newItem.creators.push({
							lastName: lastName,
							firstName: firstName
						});
					}
				}
			}

			var linkurl = "http://www.ncbi.nlm.nih.gov/pmc/articles/PMC" + ids[i] + "/";
			newItem.url = linkurl;
			newItem.attachments = [{
				url: linkurl,
				title: "PubMed Central Link",
				mimeType: "text/html",
				snapshot: false
			}];
			
			if (ZU.xpathText(article, 'selfuri/@xlinktitle') == "pdf") {
				var pdfFileName = "http://www.ncbi.nlm.nih.gov/pmc/articles/PMC" + 
				ids[i] + "/pdf/" + ZU.xpathText(article, 'selfuri/@xlinkhref');
			} else if (pdfLink) {
				var pdfFileName = pdfLink[ids[i]];
			} else if (ZU.xpathText(article, 'articleid[@pubidtype="publisherid"]')){
				//this should work on most multiples
				var pdfFileName = "http://www.ncbi.nlm.nih.gov/pmc/articles/PMC" + 
				ids[i] + "/pdf/" + ZU.xpathText(article, 'articleid[@pubidtype="publisherid"]') + ".pdf";
			}
			
			if (pdfFileName) {
				newItem.attachments.push({
				title:"PubMed Central Full Text PDF",
				mimeType:"application/pdf",
				url:pdfFileName
				});
			}

			newItem.complete();
		}

		Zotero.done();
	});
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.ncbi.nlm.nih.gov/pmc/articles/PMC2377243/?tool=pmcentrez",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"lastName": "Aoki",
						"firstName": "Takuya"
					},
					{
						"lastName": "Yamasawa",
						"firstName": "Fumihiro"
					},
					{
						"lastName": "Kawashiro",
						"firstName": "Takeo"
					},
					{
						"lastName": "Shibata",
						"firstName": "Tetsuichi"
					},
					{
						"lastName": "Ishizaka",
						"firstName": "Akitoshi"
					},
					{
						"lastName": "Urano",
						"firstName": "Tetsuya"
					},
					{
						"lastName": "Okada",
						"firstName": "Yasumasa"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "PubMed Central Link",
						"mimeType": "text/html",
						"snapshot": false
					},
					{
						"title": "PubMed Central Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"journalAbbreviation": "Respir Res",
				"publicationTitle": "Respiratory Research",
				"ISSN": "1465-9921",
				"abstractNote": "Background\nThe patient population receiving long-term oxygen therapy has increased with the rising morbidity of COPD. Although high-dose oxygen induces pulmonary edema and interstitial fibrosis, potential lung injury caused by long-term exposure to low-dose oxygen has not been fully analyzed. This study was designed to clarify the effects of long-term low-dose oxygen inhalation on pulmonary epithelial function, edema formation, collagen metabolism, and alveolar fibrosis.\n\nMethods\nGuinea pigs (n = 159) were exposed to either 21% or 40% oxygen for a maximum of 16 weeks, and to 90% oxygen for a maximum of 120 hours. Clearance of inhaled technetium-labeled diethylene triamine pentaacetate (Tc-DTPA) and bronchoalveolar lavage fluid-to-serum ratio (BAL/Serum) of albumin (ALB) were used as markers of epithelial permeability. Lung wet-to-dry weight ratio (W/D) was measured to evaluate pulmonary edema, and types I and III collagenolytic activities and hydroxyproline content in the lung were analyzed as indices of collagen metabolism. Pulmonary fibrotic state was evaluated by histological quantification of fibrous tissue area stained with aniline blue.\n\nResults\nThe clearance of Tc-DTPA was higher with 2 week exposure to 40% oxygen, while BAL/Serum Alb and W/D did not differ between the 40% and 21% groups. In the 40% oxygen group, type I collagenolytic activities at 2 and 4 weeks and type III collagenolytic activity at 2 weeks were increased. Hydroxyproline and fibrous tissue area were also increased at 2 weeks. No discernible injury was histologically observed in the 40% group, while progressive alveolar damage was observed in the 90% group.\n\nConclusion\nThese results indicate that epithelial function is damaged, collagen metabolism is affected, and both breakdown of collagen fibrils and fibrogenesis are transiently induced even with low-dose 40% oxygen exposure. However, these changes are successfully compensated even with continuous exposure to low-dose oxygen. We conclude that long-term low-dose oxygen exposure does not significantly induce permanent lung injury in guinea pigs.",
				"DOI": "10.1186/1465-9921-9-37",
				"extra": "PMID: 18439301\nPMCID: PMC2377243",
				"title": "Effects of long-term low-dose oxygen supplementation on the epithelial function, collagen metabolism and interstitial fibrogenesis in the guinea pig lung",
				"volume": "9",
				"issue": "1",
				"pages": "37",
				"date": "2008",
				"url": "http://www.ncbi.nlm.nih.gov/pmc/articles/PMC2377243/",
				"libraryCatalog": "PubMed Central",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.ncbi.nlm.nih.gov/pmc/?term=anger",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.ncbi.nlm.nih.gov/pmc/issues/184700/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.ncbi.nlm.nih.gov/pmc/articles/PMC3139813/",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"lastName": "Rubio",
						"firstName": "Doris McGartland"
					},
					{
						"lastName": "del Junco",
						"firstName": "Deborah J."
					},
					{
						"lastName": "Bhore",
						"firstName": "Rafia"
					},
					{
						"lastName": "Lindsell",
						"firstName": "Christopher J."
					},
					{
						"lastName": "Oster",
						"firstName": "Robert A."
					},
					{
						"lastName": "Wittkowski",
						"firstName": "Knut M."
					},
					{
						"lastName": "Welty",
						"firstName": "Leah J."
					},
					{
						"lastName": "Li",
						"firstName": "Yi-Ju"
					},
					{
						"lastName": "DeMets",
						"firstName": "Dave"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "PubMed Central Link",
						"mimeType": "text/html",
						"snapshot": false
					},
					{
						"title": "PubMed Central Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"journalAbbreviation": "Stat Med",
				"publicationTitle": "Statistics in medicine",
				"ISSN": "0277-6715",
				"abstractNote": "Increasing demands for evidence-based medicine and for the translation of biomedical research into individual and public health benefit have been accompanied by the proliferation of special units that offer expertise in biostatistics, epidemiology, and research design (BERD) within academic health centers. Objective metrics that can be used to evaluate, track, and improve the performance of these BERD units are critical to their successful establishment and sustainable future. To develop a set of reliable but versatile metrics that can be adapted easily to different environments and evolving needs, we consulted with members of BERD units from the consortium of academic health centers funded by the Clinical and Translational Science Award Program of the National Institutes of Health. Through a systematic process of consensus building and document drafting, we formulated metrics that covered the three identified domains of BERD practices: the development and maintenance of collaborations with clinical and translational science investigators, the application of BERD-related methods to clinical and translational research, and the discovery of novel BERD-related methodologies. In this article, we describe the set of metrics and advocate their use for evaluating BERD practices. The routine application, comparison of findings across diverse BERD units, and ongoing refinement of the metrics will identify trends, facilitate meaningful changes, and ultimately enhance the contribution of BERD activities to biomedical research.",
				"DOI": "10.1002/sim.4184",
				"extra": "PMID: 21284015\nPMCID: PMC3139813",
				"title": "Evaluation Metrics for Biostatistical and Epidemiological Collaborations",
				"volume": "30",
				"issue": "23",
				"pages": "2767-2777",
				"date": "2011-10-15",
				"url": "http://www.ncbi.nlm.nih.gov/pmc/articles/PMC3139813/",
				"libraryCatalog": "PubMed Central",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.ncbi.nlm.nih.gov/pmc/?term=test",
		"items": "multiple"
	}
]
/** END TEST CASES **/