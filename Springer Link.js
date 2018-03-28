{
	"translatorID": "d6c6210a-297c-4b2c-8c43-48cb503cc49e",
	"label": "Springer Link",
	"creator": "Aurimas Vinckevicius",
	"target": "https?://link\\.springer\\.com/(search(?:/page/\\d+)?\\?|(article|chapter|book|referenceworkentry|protocol|journal|referencework)/.+)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsbv",
	"lastUpdated": "2016-12-05 22:45:53"
}

function detectWeb(doc, url) {
	var action = url.match(/^https?:\/\/[^\/]+\/([^\/?#]+)/);
	if(!action) return;
	if(!doc.head || !doc.head.getElementsByTagName('meta').length) {
		Z.debug("Springer Link: No head or meta tags");
		return;
	}
	switch(action[1]) {
		case "search":
		case "journal":
		case "book":
		case "referencework":
			if(getResultList(doc).length > 0) {
				return "multiple";
			} else {
				return false;
			}
			break;
		case "article":
			return "journalArticle";
			break;
		case "chapter":
		case "referenceworkentry":
		case "protocol":
			if (ZU.xpathText(doc, '//meta[@name="citation_conference_title"]/@content')) {
				return "conferencePaper";
				break;
			} else {
				return "bookSection";
				break;
			}
	}
}

function getResultList(doc) {
	var results = ZU.xpath(doc,
		'//ol[@class="content-item-list"]/li/*[self::h3 or self::h2]/a');
	if(!results.length) {
		results = ZU.xpath(doc,
			'//div[@class="toc"]/ol//div[contains(@class,"toc-item")]/h3/a');
	}
	if(!results.length) {
		results = ZU.xpath(doc,
			'//div[@class="toc"]/ol\
			//li[contains(@class,"toc-item")]/p[@class="title"]/a'
		);
	}
	return results;
}

function doWeb(doc, url) {
	var type = detectWeb(doc, url);
	if(type == "multiple") {
		var list = getResultList(doc);
		var items = {};
		for(var i = 0, n = list.length; i < n; i++) {
			items[list[i].href] = list[i].textContent;
		}
		Zotero.selectItems(items, function(selectedItems) {
			if(!selectedItems) return true;
			for(var i in selectedItems) {
				ZU.processDocuments(i, scrape);
			}
		})
	} else {
		scrape(doc, url)
	}
}

function complementItem(doc, item) {
	var itemType = detectWeb(doc, doc.location.href);
	//in case we're missing something, we can try supplementing it from page
	if(!item.DOI) {
		item.DOI = ZU.xpathText(doc,
			'//dd[@id="abstract-about-book-chapter-doi"\
					or @id="abstract-about-doi"][1]'
		);
	}
	if(!item.publisher) {
		item.publisher = ZU.xpathText(doc, '//dd[@id="abstract-about-publisher"]');
	}
	if(!item.date) {
		item.date = ZU.xpathText(doc, '//dd[@id="abstract-about-cover-date"]') || ZU.xpathText(
			doc, '//dd[@id="abstract-about-book-chapter-copyright-year"]');
	}
	//copyright
	if(!item.rights) {
		item.rights = ZU.xpathText(doc,
			'//dd[@id="abstract-about-book-copyright-holder"]');
		var year = ZU.xpathText(doc,
			'//dd[@id="abstract-about-book-chapter-copyright-year"]');
		if(item.rights && year) {
			item.rights = '©' + year + ' ' + item.rights;
		}
	}
	if(itemType == "journalArticle" && !item.ISSN) {
		item.ISSN = ZU.xpathText(doc,
			'//dd[@id="abstract-about-issn" or\
					@id="abstract-about-electronic-issn"]'
		);
	}
	if(itemType == 'bookSection' || itemType == "conferencePaper") {
		//look for editors
		var editors = ZU.xpath(doc,
			'//ul[@class="editors"]/li[@itemprop="editor"]\
					/a[@class="person"]');
		var m = item.creators.length;
		for(var i = 0, n = editors.length; i < n; i++) {
			var editor = ZU.cleanAuthor(editors[i].textContent.replace(/\s+Ph\.?D\.?/,
				''), 'editor');
			//make sure we don't already have this person in the list
			var haveEditor = false;
			for(var j = 0; j < m; j++) {
				var creator = item.creators[j];
				if(creator.creatorType == "editor" && creator.lastName == editor.lastName) {
					/* we should also check first name, but this could get
					   messy if we only have initials in one case but not
					   the other. */
					haveEditor = true;
					break;
				}
			}
			if(!haveEditor) {
				item.creators.push(editor);
			}
		}
		if(!item.ISBN) {
			item.ISBN = ZU.xpathText(doc,
				'//dd[@id="abstract-about-book-print-isbn" or\
						@id="abstract-about-book-online-isbn"]'
			);
		}
		//series/seriesNumber
		if(!item.series) {
			item.series = ZU.xpathText(doc,
				'//dd[@id="abstract-about-book-series-title"]');
		}
		if(!item.seriesNumber) {
			item.seriesNumber = ZU.xpathText(doc,
				'//dd[@id="abstract-about-book-series-volume"]');
		}
	}
	//add the DOI to extra for non journal articles
	if(item.itemType != "journalArticle" && item.DOI) {
		item.extra = "DOI: " + item.DOI;
		item.DOI = "";
	}
	//series numbers get mapped to volume; fix this
	if(item.volume == item.seriesNumber) {
		item.volume = "";
	}
	//add abstract
	var abs = ZU.xpathText(doc, '//div[contains(@class,"abstract-content")][1]');
	if(!abs) {
		abs = ZU.xpathText(doc, '//section[@class="Abstract" and @lang="en"]')
	}
	if(abs) item.abstractNote = ZU.trimInternal(abs).replace(/^Abstract[:\s]*/, "");
	return item;
}

function scrape(doc, url) {
	var itemType = detectWeb(doc, doc.location.href);
	//we prefer embedded metadata, if missing try RIS
	if(ZU.xpathText(doc, '//meta[@name="citation_title"]/@content')) {
		//use Embeded Metadata translator
		var translator = Zotero.loadTranslator("web");
		translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
		translator.setDocument(doc);
		translator.setHandler("itemDone", function(obj, item) {
			//sometimes we get an error about title not being set
			if(!item.title) {
				Z.debug("Springer Link: title not found");
				Z.debug(item);
				if(doc.head) {
					//clean up and strip out uninteresting content
					Z.debug(doc.head.innerHTML.replace(/<style[^<]+(?:<\/style>|\/>)/ig, '')
						.replace(/<link[^>]+>/ig, '').replace(/(?:\s*[\r\n]\s*)+/g, '\n'));
				} else {
					Z.debug("Springer Link: no head tag");
				}
			}
			item = complementItem(doc, item);
			//add keywords
			var keywords = ZU.xpath(doc,
				'//ul[@class="abstract-about-subject" or @class="abstract-keywords"]\
			/li'
			);
			keywords = keywords.map(function(node) {
				return node.textContent.trim()
			});
			item.tags = keywords;
			item.complete();
		});
		translator.getTranslatorObject(function(trans) {
			trans.addCustomFields({
				"citation_inbook_title": "publicationTitle" //we use here the generic field to make sure to overwrite any other content
			});
			if(itemType) trans.itemType = itemType;
			trans.doWeb(doc, doc.location.href);
		});
	} else {
		var risURL = url.replace(/springer\.com/, "springer.com/export-citation/").replace(
				/[#?].*/, "") + ".ris"
			//Z.debug(risURL)
		var DOI = url.match(/\/(10\.[^#?]+)/)[1];
		var pdfURL = "/content/pdf/" + encodeURIComponent(DOI) + ".pdf"
		Z.debug("pdfURL: " + pdfURL)
		ZU.doGet(risURL, function(text) {
			var translator = Zotero.loadTranslator("import");
			translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
			translator.setString(text);
			translator.setHandler("itemDone", function(obj, item) {
				item = complementItem(doc, item);
				item.attachments.push({
					url: pdfURL,
					title: "Springer Full Text PDF",
					mimeType: "application/pdf"
				})
				item.complete();
			})
			translator.translate();
		})
	}
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://link.springer.com/chapter/10.1007/978-3-540-88682-2_1",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "Something Old, Something New, Something Borrowed, Something Blue",
				"creators": [
					{
						"firstName": "Jan J.",
						"lastName": "Koenderink",
						"creatorType": "author"
					},
					{
						"firstName": "David",
						"lastName": "Forsyth",
						"creatorType": "editor"
					},
					{
						"firstName": "Philip",
						"lastName": "Torr",
						"creatorType": "editor"
					},
					{
						"firstName": "Andrew",
						"lastName": "Zisserman",
						"creatorType": "editor"
					}
				],
				"date": "2008/10/12",
				"ISBN": "9783540886815 9783540886822",
				"abstractNote": "My first paper of a “Computer Vision” signature (on invariants related to optic flow) dates from 1975. I have published in Computer Vision (next to work in cybernetics, psychology, physics, mathematics and philosophy) till my retirement earlier this year (hence the slightly blue feeling), thus my career roughly covers the history of the field. “Vision” has diverse connotations. The fundamental dichotomy is between “optically guided action” and “visual experience”. The former applies to much of biology and computer vision and involves only concepts from science and engineering (e.g., “inverse optics”), the latter involves intention and meaning and thus additionally involves concepts from psychology and philosophy. David Marr’s notion of “vision” is an uneasy blend of the two: On the one hand the goal is to create a “representation of the scene in front of the eye” (involving intention and meaning), on the other hand the means by which this is attempted are essentially “inverse optics”. Although this has nominally become something of the “Standard Model” of CV, it is actually incoherent. It is the latter notion of “vision” that has always interested me most, mainly because one is still grappling with basic concepts. It has been my aspiration to turn it into science, although in this I failed. Yet much has happened (something old) and is happening now (something new). I will discuss some of the issues that seem crucial to me, mostly illustrated through my own work, though I shamelessly borrow from friends in the CV community where I see fit.",
				"conferenceName": "European Conference on Computer Vision",
				"extra": "DOI: 10.1007/978-3-540-88682-2_1",
				"language": "en",
				"libraryCatalog": "link.springer.com",
				"pages": "1-1",
				"proceedingsTitle": "Computer Vision – ECCV 2008",
				"publisher": "Springer Berlin Heidelberg",
				"rights": "©2008 Springer-Verlag Berlin Heidelberg",
				"series": "Lecture Notes in Computer Science",
				"url": "http://link.springer.com/chapter/10.1007/978-3-540-88682-2_1",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
					}
				],
				"tags": [
					"Computer Appl. in Arts and Humanities",
					"Computer Graphics",
					"Computer Imaging, Vision, Pattern Recognition and Graphics",
					"Data Mining and Knowledge Discovery",
					"Image Processing and Computer Vision",
					"Pattern Recognition"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://link.springer.com/referenceworkentry/10.1007/978-0-387-79061-9_5173",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Characterized by Commitment to Something Without Personal Exploration",
				"creators": [
					{
						"firstName": "Sam",
						"lastName": "Goldstein",
						"creatorType": "editor"
					},
					{
						"firstName": "Jack A.",
						"lastName": "Naglieri",
						"creatorType": "editor"
					}
				],
				"date": "2011",
				"ISBN": "9780387775791 9780387790619",
				"abstractNote": "Identity Foreclosure",
				"bookTitle": "Encyclopedia of Child Behavior and Development",
				"extra": "DOI: 10.1007/978-0-387-79061-9_5173",
				"language": "en",
				"libraryCatalog": "link.springer.com",
				"pages": "329-329",
				"publisher": "Springer US",
				"rights": "©2011 Springer Science+Business Media, LLC",
				"url": "http://link.springer.com/referenceworkentry/10.1007/978-0-387-79061-9_5173",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
					}
				],
				"tags": [
					"Child and School Psychology",
					"Developmental Psychology",
					"Education, general",
					"Learning & Instruction"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://link.springer.com/protocol/10.1007/978-1-60761-839-3_22",
		"items": [
			{
				"itemType": "bookSection",
				"title": "What Do We Know?: Simple Statistical Techniques that Help",
				"creators": [
					{
						"lastName": "Bajorath",
						"firstName": "Jürgen",
						"creatorType": "editor"
					},
					{
						"lastName": "Nicholls",
						"firstName": "Anthony",
						"creatorType": "author"
					}
				],
				"date": "January 1, 2011",
				"ISBN": "9781607618386",
				"abstractNote": "An understanding of simple statistical techniques is invaluable in science and in life. Despite this, and despite the sophistication of many concerning the methods and algorithms of molecular modeling, statistical analysis is usually rare and often uncompelling. I present here some basic approaches that have proved useful in my own work, along with examples drawn from the field. In particular, the statistics of evaluations of virtual screening are carefully considered.",
				"bookTitle": "Chemoinformatics and Computational Chemical Biology",
				"extra": "DOI: 10.1007/978-1-60761-839-3_22",
				"language": "English",
				"libraryCatalog": "Springer Link",
				"pages": "531-581",
				"publisher": "Humana Press",
				"rights": "©2011 Humana Press",
				"series": "Methods in Molecular Biology",
				"seriesNumber": "672",
				"shortTitle": "What Do We Know?",
				"url": "http://dx.doi.org/10.1007/978-1-60761-839-3_22",
				"attachments": [
					{
						"title": "Springer Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					"ANOVA",
					"AUC",
					"Central Limit Theorem",
					"Confidence limits",
					"Correlation",
					"Enrichment",
					"Error bars",
					"Propagation of error",
					"ROC curves",
					"Standard deviation",
					"Statistics",
					"Student’s t-test",
					"Variance",
					"Virtual screening",
					"logit transform",
					"p-Values"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://link.springer.com/search?query=zotero",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://link.springer.com/journal/10922/2/1/page/1",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://link.springer.com/referencework/10.1007/978-1-84996-169-1/page/1",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://link.springer.com/book/10.1007/978-3-540-88682-2/page/1",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://link.springer.com/article/10.1007/s10040-009-0439-x",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Tide-induced head fluctuations in a coastal aquifer: effects of the elastic storage and leakage of the submarine outlet-capping",
				"creators": [
					{
						"firstName": "Xiaolong",
						"lastName": "Geng",
						"creatorType": "author"
					},
					{
						"firstName": "Hailong",
						"lastName": "Li",
						"creatorType": "author"
					},
					{
						"firstName": "Michel C.",
						"lastName": "Boufadel",
						"creatorType": "author"
					},
					{
						"firstName": "Shuang",
						"lastName": "Liu",
						"creatorType": "author"
					}
				],
				"date": "2009/07/01",
				"DOI": "10.1007/s10040-009-0439-x",
				"ISSN": "1431-2174, 1435-0157",
				"abstractNote": "This paper considers the tidal head fluctuations in a single coastal confined aquifer which extends under the sea for a certain distance. Its submarine outlet is covered by a silt-layer with properties dissimilar to the aquifer. Recently, Li et al. (2007) gave an analytical solution for such a system which neglected the effect of the elastic storage (specific storage) of the outlet-capping. This article presents an analytical solution which generalizes their work by incorporating the elastic storage of the outlet-capping. It is found that if the outlet-capping is thick enough in the horizontal direction, its elastic storage has a significant enhancing effect on the tidal head fluctuation. Ignoring this elastic storage will lead to significant errors in predicting the relationship of the head fluctuation and the aquifer hydrogeological properties. Quantitative analysis shows the effect of the elastic storage of the outlet-capping on the groundwater head fluctuation. Quantitative conditions are given under which the effect of this elastic storage on the aquifer’s tide-induced head fluctuation is negligible. Li, H.L., Li, G.Y., Chen, J.M., Boufadel, M.C. (2007) Tide-induced head fluctuations in a confined aquifer with sediment covering its outlet at the sea floor. [Fluctuations du niveau piézométrique induites par la marée dans un aquifère captif à décharge sous-marine.] Water Resour. Res 43, doi:10.1029/2005WR004724",
				"issue": "5",
				"journalAbbreviation": "Hydrogeol J",
				"language": "en",
				"libraryCatalog": "link.springer.com",
				"pages": "1289-1296",
				"publicationTitle": "Hydrogeology Journal",
				"shortTitle": "Tide-induced head fluctuations in a coastal aquifer",
				"url": "http://link.springer.com/article/10.1007/s10040-009-0439-x",
				"volume": "17",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/