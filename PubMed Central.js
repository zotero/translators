{
	"translatorID": "27ee5b2c-2a5a-4afc-a0aa-d386642d4eed",
	"label": "PubMed Central",
	"creator": "Michael Berkowitz and Rintze Zelle",
	"target": "https?://[^/]*.nih.gov/",
	"minVersion": "1.0.0b4.r5",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "g",
	"lastUpdated": "2011-11-16 13:04:03"
}

function detectWeb(doc, url) {
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
		if (prefix == 'x') return namespace; else return null;
	} : null;
	
	try {var pmid = url.match(/ncbi\.nlm\.nih\.gov\/pmc\/articles\/PMC([\d]+)/)[1];} catch (e) {}
	if (pmid) {
		return "journalArticle";
	}
	
	var uids = doc.evaluate('//div[@class="toc-pmcid"]', doc, nsResolver, XPathResult.ANY_TYPE, null);
	if(uids.iterateNext()) {
		if (uids.iterateNext()){
			return "multiple";
		}
		return "journalArticle";
	}
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
			newItem.extra = newItem.extra + "PMCID: " + ids[i];

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
			newItem.attachments = [{
				url: linkurl,
				title: "PubMed Central Link",
				mimeType: "text/html",
				snapshot: false
			}];
			
			if (ZU.xpathText(article, 'selfuri/@xlinktitle') == "pdf") {
				var pdfFileName = ZU.xpathText(article, 'selfuri/@xlinkhref');
			} else if (pdfLink) {
				var pdfFileName = pdfLink;
			}
			if (pdfFileName) {
				var pdfURL = "http://www.ncbi.nlm.nih.gov/pmc/articles/PMC" + ids[i] + "/pdf/" + pdfFileName;
				newItem.attachments.push({
				title:"PubMed Central Full Text PDF",
				mimeType:"application/pdf",
				url:pdfURL
				});
			}

			newItem.complete();
		}

		Zotero.done();
	});
}



function doWeb(doc, url) {
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ?
	function (prefix) {
		if (prefix == 'x') return namespace;
		else return null;
	} : null;

	var ids = new Array();
	var pmcid;
	var pdfLink;
	var resultsCount = 0;
	try {
		pmcid = url.match(/ncbi\.nlm\.nih\.gov\/pmc\/articles\/PMC([\d]+)/)[1];
	} catch(e) {}
	if (pmcid) {
		try {
			var formatLinks = doc.evaluate('//td[@class="format-menu"]//a/@href', doc, nsResolver, XPathResult.ANY_TYPE, null);
			while (formatLink = formatLinks.iterateNext().textContent) {
				if(pdfLink = formatLink.match(/\/pdf\/([^\/]*\.pdf$)/)) {
					pdfLink = pdfLink[1];
				}
			}
		} catch (e) {}
		ids.push(pmcid);
		lookupPMCIDs(ids, doc, pdfLink);
	} else {
		var pmcids = doc.evaluate('//div[@class="toc-pmcid"]', doc, nsResolver, XPathResult.ANY_TYPE, null);
		var titles = doc.evaluate('//div[@class="toc-title"]', doc, nsResolver, XPathResult.ANY_TYPE, null);
		var title;
		while (pmcid = pmcids.iterateNext()) {
			title = titles.iterateNext();
			ids[pmcid.textContent.match(/PMC([\d]+)/)[1]] = title.textContent;
			resultsCount = resultsCount + 1;
		}
		if (resultsCount > 1) {
			ids = Zotero.selectItems(ids);
		}
		if (!ids) {
			return true;
		}

		var pmcids = new Array();
		for (var i in ids) {
			pmcids.push(i);
		}
		lookupPMCIDs(pmcids, doc);
	}
}