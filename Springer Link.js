{
	"translatorID": "d6c6210a-297c-4b2c-8c43-48cb503cc49e",
	"label": "Springer Link",
	"creator": "Aurimas Vinckevicius",
	"target": "^https?://link\\.springer\\.com/(search(/page/\\d+)?\\?|(article|chapter|book|referenceworkentry|protocol|journal|referencework)/.+)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsbv",
<<<<<<< HEAD
	"lastUpdated": "2020-09-08 02:04:42"
=======
<<<<<<< HEAD
	"lastUpdated": "2021-09-09 07:22:40"
=======
	"lastUpdated": "2020-09-08 02:04:42"
>>>>>>> 9589c8efeb2c378a4d6854f36930e09909e648a8
>>>>>>> 5f00c4ca8b31ceb7f9f4e847436a453442ebbcb6
}

/*
   SpringerLink Translator
   Copyright (C) 2020 Aurimas Vinckevicius and Sebastian Karcher

   This program is free software: you can redistribute it and/or modify
   it under the terms of the GNU Affero General Public License as published by
   the Free Software Foundation, either version 3 of the License, or
   (at your option) any later version.

   This program is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU Affero General Public License for more details.

   You should have received a copy of the GNU Affero General Public License
   along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

function detectWeb(doc, url) {
	var action = url.match(/^https?:\/\/[^/]+\/([^/?#]+)/);
	if (!action) return false;
	if (!doc.head || !doc.head.getElementsByTagName('meta').length) {
		Z.debug("Springer Link: No head or meta tags");
		return false;
	}
	switch (action[1]) {
		case "search":
		case "journal":
		case "book":
		case "referencework":
			if (getResultList(doc).length > 0) {
				return "multiple";
			}
			return false;
		case "article":
			return "journalArticle";
		case "chapter":
		case "referenceworkentry":
		case "protocol":
			if (ZU.xpathText(doc, '//meta[@name="citation_conference_title"]/@content')) {
				return "conferencePaper";
			}
			else {
				return "bookSection";
			}
	}
	return false;
}

function getResultList(doc) {
	var results = ZU.xpath(doc,
		'//ol[@class="content-item-list"]/li/*[self::h3 or self::h2]/a');
	if (!results.length) {
		results = ZU.xpath(doc,
			'//div[@class="toc"]/ol//div[contains(@class,"toc-item")]/h3/a');
	}
	if (!results.length) {
		results = ZU.xpath(doc,
			'//div[@class="book-toc-container"]/ol//div[contains(@class,"content-type-list__meta")]/div/a');
	}
	if (!results.length) {
		results = ZU.xpath(doc, '//div[@class="toc"]/ol//li[contains(@class,"toc-item")]/p[@class="title"]/a');
	}
	// https://link.springer.com/journal/10344/volumes-and-issues/66-5
	if (!results.length) {
		results = ZU.xpath(doc, '//li[@class="c-list-group__item"]//h3/a');
	}
	return results;
}

function doWeb(doc, url) {
	var type = detectWeb(doc, url);
	if (type == "multiple") {
		var list = getResultList(doc);
		var items = {};
		for (var i = 0, n = list.length; i < n; i++) {
			items[list[i].href] = list[i].textContent;
		}
		Zotero.selectItems(items, function (selectedItems) {
			if (!selectedItems) return;
			for (let i in selectedItems) {
				ZU.processDocuments(i, scrape);
			}
		});
	}
	else {
		scrape(doc, url);
	}
}

function complementItem(doc, item) {
	var itemType = detectWeb(doc, doc.location.href);
	// in case we're missing something, we can try supplementing it from page
	if (!item.DOI) {
		item.DOI = ZU.xpathText(doc, '//meta[@name="citation_doi"]/@content');
	}
	if (!item.language) {
		item.language = ZU.xpathText(doc, '//meta[@name="citation_language"]/@content');
	}
	if (!item.publisher) {
		item.publisher = ZU.xpathText(doc, '//dd[@id="abstract-about-publisher"]');
	}
	if (item.publisher && item.place) {
		// delete places in publisher's name
		// e.g. Springer Berlin Heidelberg
		var places = item.place.split(/[\s,;]/);
		for (let place of places) {
			item.publisher = item.publisher.replace(place, '');
		}
	}
	if (!item.date) {
		item.date = ZU.xpathText(doc, '//dd[@id="abstract-about-cover-date"]') || ZU.xpathText(
			doc, '//dd[@id="abstract-about-book-chapter-copyright-year"]');
	}
	if (item.date) {
		item.date = ZU.strToISO(item.date);
	}
	// copyright
	if (!item.rights) {
		item.rights = ZU.xpathText(doc,
			'//dd[@id="abstract-about-book-copyright-holder"]');
		var year = ZU.xpathText(doc,
			'//dd[@id="abstract-about-book-chapter-copyright-year"]');
		if (item.rights && year) {
			item.rights = '©' + year + ' ' + item.rights;
		}
	}
	
	if (itemType == "journalArticle") {
		if (!item.ISSN) {
			item.ISSN = ZU.xpathText(doc, '//dd[@id="abstract-about-issn" or @id="abstract-about-electronic-issn"]');
		}
		if (!item.journalAbbreviation || item.publicationTitle == item.journalAbbreviation) {
			item.journalAbbreviation = ZU.xpathText(doc, '//meta[@name="citation_journal_abbrev"]/@content');
		}
	}
	if (itemType == 'bookSection' || itemType == "conferencePaper") {
		// look for editors
		var editors = ZU.xpath(doc, '//ul[@class="editors"]/li[@itemprop="editor"]/a[@class="person"]');
		var m = item.creators.length;
		for (var i = 0, n = editors.length; i < n; i++) {
			var editor = ZU.cleanAuthor(editors[i].textContent.replace(/\s+Ph\.?D\.?/,
				''), 'editor');
			// make sure we don't already have this person in the list
			var haveEditor = false;
			for (var j = 0; j < m; j++) {
				var creator = item.creators[j];
				if (creator.creatorType == "editor" && creator.lastName == editor.lastName) {
					// we should also check first name, but this could get
					// messy if we only have initials in one case but not
					// the other.
					haveEditor = true;
					break;
				}
			}
			if (!haveEditor) {
				item.creators.push(editor);
			}
		}
		if (!item.ISBN) {
			item.ISBN = ZU.xpathText(doc, '//dd[@id="abstract-about-book-print-isbn" or @id="abstract-about-book-online-isbn"]')
				|| ZU.xpathText(doc, '//span[@id="print-isbn" or @id="electronic-isbn"]');
		}
		// series/seriesNumber
		if (!item.series) {
			item.series = ZU.xpathText(doc, '//dd[@id="abstract-about-book-series-title"]')
				|| ZU.xpathText(doc, '//div[contains(@class, "ArticleHeader")]//a[contains(@href, "/bookseries/")]');
		}
		if (!item.seriesNumber) {
			item.seriesNumber = ZU.xpathText(doc, '//dd[@id="abstract-about-book-series-volume"]');
		}
	}
	// add the DOI to extra for non journal articles
	if (item.itemType != "journalArticle" && item.itemType != "conferencePaper" && item.DOI) {
		item.extra = "DOI: " + item.DOI;
		item.DOI = "";
	}
	// series numbers get mapped to volume; fix this
	if (item.volume == item.seriesNumber) {
		item.volume = "";
	}
	// add abstract
	var abs = ZU.xpathText(doc, '//div[contains(@class,"abstract-content")][1]');
	if (!abs) {
		abs = ZU.xpathText(doc, '//section[@class="Abstract" and @lang="en"]');
	}
	if (abs) item.abstractNote = ZU.trimInternal(abs).replace(/^Abstract[:\s]*/, "");
	// add tags
	var tags = ZU.xpathText(doc, '//span[@class="Keyword"]');
	if (tags && (!item.tags || item.tags.length === 0)) {
		item.tags = tags.split(',');
	}
	return item;
}

function scrape(doc, url) {
	var DOI = url.match(/\/(10\.[^#?]+)/)[1];
	var risURL = "https://citation-needed.springer.com/v2/references/" + DOI + "?format=refman&flavour=citation";
	// Z.debug("risURL" + risURL);
	var pdfURL = "/content/pdf/" + encodeURIComponent(DOI) + ".pdf";
	// Z.debug("pdfURL: " + pdfURL);
	ZU.doGet(risURL, function (text) {
		// Z.debug(text)
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
		translator.setString(text);
		translator.setHandler("itemDone", function (obj, item) {
			item = complementItem(doc, item);
			
			item.attachments.push({
				url: pdfURL,
				title: "Springer Full Text PDF",
				mimeType: "application/pdf"
			});
			item.complete();
		});
		translator.translate();
	});
}


/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://link.springer.com/chapter/10.1007/978-3-540-88682-2_1",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "Something Old, Something New, Something Borrowed, Something Blue",
				"creators": [
					{
						"lastName": "Koenderink",
						"firstName": "Jan J.",
						"creatorType": "author"
					},
					{
						"lastName": "Forsyth",
						"firstName": "David",
						"creatorType": "editor"
					},
					{
						"lastName": "Torr",
						"firstName": "Philip",
						"creatorType": "editor"
					},
					{
						"lastName": "Zisserman",
						"firstName": "Andrew",
						"creatorType": "editor"
					}
				],
				"date": "2008",
				"DOI": "10.1007/978-3-540-88682-2_1",
				"ISBN": "9783540886822",
				"abstractNote": "My first paper of a “Computer Vision” signature (on invariants related to optic flow) dates from 1975. I have published in Computer Vision (next to work in cybernetics, psychology, physics, mathematics and philosophy) till my retirement earlier this year (hence the slightly blue feeling), thus my career roughly covers the history of the field. “Vision” has diverse connotations. The fundamental dichotomy is between “optically guided action” and “visual experience”. The former applies to much of biology and computer vision and involves only concepts from science and engineering (e.g., “inverse optics”), the latter involves intention and meaning and thus additionally involves concepts from psychology and philosophy. David Marr’s notion of “vision” is an uneasy blend of the two: On the one hand the goal is to create a “representation of the scene in front of the eye” (involving intention and meaning), on the other hand the means by which this is attempted are essentially “inverse optics”. Although this has nominally become something of the “Standard Model” of CV, it is actually incoherent. It is the latter notion of “vision” that has always interested me most, mainly because one is still grappling with basic concepts. It has been my aspiration to turn it into science, although in this I failed. Yet much has happened (something old) and is happening now (something new). I will discuss some of the issues that seem crucial to me, mostly illustrated through my own work, though I shamelessly borrow from friends in the CV community where I see fit.",
				"language": "en",
				"libraryCatalog": "Springer Link",
				"pages": "1-1",
				"place": "Berlin, Heidelberg",
				"proceedingsTitle": "Computer Vision – ECCV 2008",
				"publisher": "Springer",
				"series": "Lecture Notes in Computer Science",
				"attachments": [
					{
						"title": "Springer Full Text PDF",
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
		"url": "https://link.springer.com/referenceworkentry/10.1007/978-0-387-79061-9_5173",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Characterized by Commitment to Something Without Personal Exploration",
				"creators": [
					{
						"lastName": "Goldstein",
						"firstName": "Sam",
						"creatorType": "editor"
					},
					{
						"lastName": "Naglieri",
						"firstName": "Jack A.",
						"creatorType": "editor"
					}
				],
				"date": "2011",
				"ISBN": "9780387790619",
				"bookTitle": "Encyclopedia of Child Behavior and Development",
				"extra": "DOI: 10.1007/978-0-387-79061-9_5173",
				"language": "en",
				"libraryCatalog": "Springer Link",
				"pages": "329-329",
				"place": "Boston, MA",
				"publisher": "Springer US",
				"url": "https://doi.org/10.1007/978-0-387-79061-9_5173",
				"attachments": [
					{
						"title": "Springer Full Text PDF",
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
		"url": "https://link.springer.com/protocol/10.1007/978-1-60761-839-3_22",
		"items": [
			{
				"itemType": "bookSection",
				"title": "What Do We Know?: Simple Statistical Techniques that Help",
				"creators": [
					{
						"lastName": "Nicholls",
						"firstName": "Anthony",
						"creatorType": "author"
					},
					{
						"lastName": "Bajorath",
						"firstName": "Jürgen",
						"creatorType": "editor"
					}
				],
				"date": "2011",
				"ISBN": "9781607618393",
				"abstractNote": "An understanding of simple statistical techniques is invaluable in science and in life. Despite this, and despite the sophistication of many concerning the methods and algorithms of molecular modeling, statistical analysis is usually rare and often uncompelling. I present here some basic approaches that have proved useful in my own work, along with examples drawn from the field. In particular, the statistics of evaluations of virtual screening are carefully considered.",
				"bookTitle": "Chemoinformatics and Computational Chemical Biology",
				"extra": "DOI: 10.1007/978-1-60761-839-3_22",
				"language": "en",
				"libraryCatalog": "Springer Link",
				"pages": "531-581",
				"place": "Totowa, NJ",
				"publisher": "Humana Press",
				"series": "Methods in Molecular Biology",
				"shortTitle": "What Do We Know?",
				"url": "https://doi.org/10.1007/978-1-60761-839-3_22",
				"attachments": [
					{
						"title": "Springer Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": " ANOVA "
					},
					{
						"tag": " AUC "
					},
					{
						"tag": " Central Limit Theorem "
					},
					{
						"tag": " Confidence limits "
					},
					{
						"tag": " Correlation "
					},
					{
						"tag": " Enrichment "
					},
					{
						"tag": " Error bars "
					},
					{
						"tag": " Propagation of error "
					},
					{
						"tag": " ROC curves "
					},
					{
						"tag": " Standard deviation "
					},
					{
						"tag": " Student’s t-test "
					},
					{
						"tag": " Variance "
					},
					{
						"tag": " Virtual screening "
					},
					{
						"tag": " logit transform "
					},
					{
						"tag": " p-Values "
					},
					{
						"tag": "Statistics "
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://link.springer.com/search?query=zotero",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://link.springer.com/journal/10922/2/1/page/1",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://link.springer.com/referencework/10.1007/978-1-84996-169-1?page=1#toc",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://link.springer.com/book/10.1007/978-3-540-88682-2",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://link.springer.com/article/10.1007/s10040-009-0439-x",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Tide-induced head fluctuations in a coastal aquifer: effects of the elastic storage and leakage of the submarine outlet-capping",
				"creators": [
					{
						"lastName": "Geng",
						"firstName": "Xiaolong",
						"creatorType": "author"
					},
					{
						"lastName": "Li",
						"firstName": "Hailong",
						"creatorType": "author"
					},
					{
						"lastName": "Boufadel",
						"firstName": "Michel C.",
						"creatorType": "author"
					},
					{
						"lastName": "Liu",
						"firstName": "Shuang",
						"creatorType": "author"
					}
				],
				"date": "2009-07-01",
				"DOI": "10.1007/s10040-009-0439-x",
				"ISSN": "1435-0157",
				"abstractNote": "This paper considers the tidal head fluctuations in a single coastal confined aquifer which extends under the sea for a certain distance. Its submarine outlet is covered by a silt-layer with properties dissimilar to the aquifer. Recently, Li et al. (2007) gave an analytical solution for such a system which neglected the effect of the elastic storage (specific storage) of the outlet-capping. This article presents an analytical solution which generalizes their work by incorporating the elastic storage of the outlet-capping. It is found that if the outlet-capping is thick enough in the horizontal direction, its elastic storage has a significant enhancing effect on the tidal head fluctuation. Ignoring this elastic storage will lead to significant errors in predicting the relationship of the head fluctuation and the aquifer hydrogeological properties. Quantitative analysis shows the effect of the elastic storage of the outlet-capping on the groundwater head fluctuation. Quantitative conditions are given under which the effect of this elastic storage on the aquifer’s tide-induced head fluctuation is negligible. Li, H.L., Li, G.Y., Chen, J.M., Boufadel, M.C. (2007) Tide-induced head fluctuations in a confined aquifer with sediment covering its outlet at the sea floor. [Fluctuations du niveau piézométrique induites par la marée dans un aquifère captif à décharge sous-marine.] Water Resour. Res 43, doi:10.1029/2005WR004724",
				"issue": "5",
				"journalAbbreviation": "Hydrogeol J",
				"language": "en",
				"libraryCatalog": "Springer Link",
				"pages": "1289-1296",
				"publicationTitle": "Hydrogeology Journal",
				"shortTitle": "Tide-induced head fluctuations in a coastal aquifer",
				"url": "https://doi.org/10.1007/s10040-009-0439-x",
				"volume": "17",
				"attachments": [
					{
						"title": "Springer Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
<<<<<<< HEAD
				"tags": [],
				"notes": [],
=======
<<<<<<< HEAD
				"tags": [
					{
						"tag": "Analytical solutions"
					},
					{
						"tag": "Coastal aquifers"
					},
					{
						"tag": "Elastic storage"
					},
					{
						"tag": "Submarine outlet-capping"
					},
					{
						"tag": "Tidal loading efficiency"
					}
				],
				"notes": [
					{
						"note": "abs:Résumé Cet article considère les fluctuations piézométriques dues à la marée dans un aquifère côtier captif simple s’étendant à une certaine distance sous la mer. Son exutoire sous-marin est recouvert par un dépôt silteux de propriétés différentes de celles de l’aquifère. Récemment, Li et autres (2007) ont donné une représentation analytique d’un tel système tenant compte de l’effet d’emmagasinement élastique du réservoir sous le toit à l’exutoire. Cet article présente une solution analytique qui généralise le modèle en introduisant l’emmagasinement élastique à l’exutoire. Il démontre que si la couveture à l’exutoire est assez épaisse en direction, l’emmagasinement élastique a un effet amplificateur important sur la fluctuation piézométrique due à la marée. Ignorer cet emmagasinement élastique conduirait à des erreurs importantes sur le rapport entre la hauteur piézométrique réelle et la hauteur telle qu’elle ressort des caractéristiques de l’aquifère. Le modèle montre donc l’effet de l’emmagasinement élastique sur la fluctuation du niveau de l’aquifère. Il indique les seuils en dessous desquels l’effet de cet emmagasinement élastique sur la fluctuation de l’aquifère induite par la marée est négligeable. Li, H.L., Li, G.Y., Chen, J.M., Boufadel, M.C. (2007) Tide-induced head fluctuations in a confined aquifer with sediment covering its outlet at the sea floor. [Fluctuations du niveau piézométrique induites par la marée dans un aquifère captif à décharge sous-marine.] Water Resour. Res 43, doi:10.1029/2005WR004724"
					}
				],
=======
				"tags": [],
				"notes": [],
>>>>>>> 9589c8efeb2c378a4d6854f36930e09909e648a8
>>>>>>> 5f00c4ca8b31ceb7f9f4e847436a453442ebbcb6
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://link.springer.com/chapter/10.1007/0-387-24250-3_4",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Whole-Class and Peer Interaction in an Activity of Writing and Revision",
				"creators": [
					{
						"lastName": "Allal",
						"firstName": "Linda",
						"creatorType": "author"
					},
					{
						"lastName": "Lopez",
						"firstName": "Lucie Mottier",
						"creatorType": "author"
					},
					{
						"lastName": "Lehraus",
						"firstName": "Katia",
						"creatorType": "author"
					},
					{
						"lastName": "Forget",
						"firstName": "Alexia",
						"creatorType": "author"
					},
					{
						"lastName": "Kostouli",
						"firstName": "Triantafillia",
						"creatorType": "editor"
					}
				],
				"date": "2005",
				"ISBN": "9780387242507",
				"abstractNote": "The perspective of situated cognition provides a conceptual framework for studying social mediation in activities of text production. The investigation presented here concerns two forms of social mediation: (1) whole-class interactions that prepare the students for drafting and revising their texts; (2) peer interactions occurring when dyads engage in joint revision of their drafts. The data collected in three fifth-grade classrooms include observations of whole-class interactions, recordings of dyadic interactions and classifications of text transformations that students carried out during individual and joint phases of revision. The analyses examine the relationships between qualitative indicators of interaction dynamics and quantitative data on text transformations. The findings show that differences in the whole-class interactions are reflected in the students’ revisions particularly with respect to the degree of rewriting that they undertake, as compared to simple error correction. Although analysis of the dyadic interactions reveals important variations in the dynamics of the exchanges, two general findings emerge. In the large majority of cases, the activity of joint revision leads to a substantial increase in the number of text transformations, beyond those made by each author individually. Even in cases where no new transformations occur, the authors engage actively in interaction about revision (e.g., they propose revisions of the other student’s text, explain revisions made individually to their own text, argue against proposals of the other student, etc.). Implications of the results for future research on writing instruction are discussed.",
				"bookTitle": "Writing in Context(s): Textual Practices and Learning Processes in Sociocultural Settings",
				"extra": "DOI: 10.1007/0-387-24250-3_4",
				"language": "en",
				"libraryCatalog": "Springer Link",
				"pages": "69-91",
				"place": "Boston, MA",
				"publisher": "Springer US",
				"series": "Studies in Writing",
				"url": "https://doi.org/10.1007/0-387-24250-3_4",
				"attachments": [
					{
						"title": "Springer Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": " peer interaction "
					},
					{
						"tag": " revision "
					},
					{
						"tag": " whole-class interaction "
					},
					{
						"tag": " writing "
					},
					{
						"tag": "Social mediation "
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
<<<<<<< HEAD
		"url": "https://link.springer.com/journal/10344/volumes-and-issues/66-5",
		"items": "multiple"
=======
<<<<<<< HEAD
		"url": "https://link.springer.com/journal/11562/14/1",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://link.springer.com/article/10.1007/s11562-019-00443-w",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Who pioneered Islamic banking in Malaysia? The background of the pioneers of Bank Islam Malaysia Berhad",
				"creators": [
					{
						"lastName": "Kitamura",
						"firstName": "Hideki",
						"creatorType": "author"
					}
				],
				"date": "2020-04-01",
				"DOI": "10.1007/s11562-019-00443-w",
				"ISSN": "1872-0226",
				"abstractNote": "This study investigates the background of the pioneers of Bank Islam Malaysia Berhad (BIMB) and their perception of Islamic banking to explore the influence that their background had on the practices of BIMB, which have been criticized for being too similar to those of conventional banking. Accordingly, this study opts to explore this topic using interviews with the pioneers, complemented by archival research. Results of the research into the pioneers’ background and their perception of Islamic banking show that most came from a conventional banking background as part of the strong network of the founder of the bank, Abdul Halim Ismail. Furthermore, to fulfill the government’s expectations, they intended to make conventional banking Islamically acceptable rather than simply implementing the profit-and-loss sharing envisaged as ideal by Islamic economists, so they could provide modern banking facilities to economically underrepresented Malay Muslims. The findings reaffirm the significance of the intermediary role of practitioners, their background and philosophy in the development of products and services. In addition, the findings suggest the need for a reevaluation of the research of social scientists exploring whether Islamic banking offers an alternative to conventional global banking, as the pioneers of BIMB did not deny the value of conventional banking, but rather sought to learn from conventional banking to provide competitive banking products in a workable Islamic way.",
				"issue": "1",
				"journalAbbreviation": "Cont Islam",
				"language": "en",
				"libraryCatalog": "Springer Link",
				"pages": "75-93",
				"publicationTitle": "Contemporary Islam",
				"shortTitle": "Who pioneered Islamic banking in Malaysia?",
				"url": "https://doi.org/10.1007/s11562-019-00443-w",
				"volume": "14",
				"attachments": [
					{
						"title": "Springer Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Bank Islam Malaysia Berhad"
					},
					{
						"tag": "Economic anthropology/sociology"
					},
					{
						"tag": "Islamic banking"
					},
					{
						"tag": "Malaysia"
					}
				],
				"notes": [
					{
						"note": "orcid:0000-0001-6700-731X | Hideki Kitamura"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://link.springer.com/article/10.1007/s00481-019-00556-z",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Ist unerfüllter Kinderwunsch ein Leiden? – Der Leidensbegriff im Kontext der Kinderwunschtherapie",
				"creators": [
					{
						"lastName": "Westermann",
						"firstName": "Anna Maria",
						"creatorType": "author"
					},
					{
						"lastName": "Alkatout",
						"firstName": "Ibrahim",
						"creatorType": "author"
					}
				],
				"date": "2020-06-01",
				"DOI": "10.1007/s00481-019-00556-z",
				"ISSN": "1437-1618",
				"abstractNote": "Der Begriff Leiden ist in der Medizin und in der Bioethik bisher kaum reflektiert und dahingehend in normativer Hinsicht wenig bestimmt. Dennoch bildet das Leiden an einer Unfruchtbarkeit den Ausgangspunkt für die medizintechnischen Interventionen der assistierten reproduktionsmedizinischen Behandlung. Dabei wird implizit angenommen, dass der unerfüllte Kinderwunsch ein Leiden ist. Ob der unerfüllte Kinderwunsch allerdings ein Leiden darstellt, ist bisher nicht eindeutig geklärt worden.Ziel dieses Beitrages ist es, die Annahme, dass es sich beim unerfüllten Kinderwunsch um ein Leiden handelt, zu überprüfen. Anhand der Darstellung einiger gängiger Leidenskonzeptionen werden Merkmale von Leiden herausgearbeitet, die als treffende Grundannahmen für eine Leidensbestimmung gelten können. Es wird sich zeigen, dass der unerfüllte Kinderwunsch, entsprechend der Leidenskonzeptionen, als ein Leiden angesehen werden sollte, und ihm somit ein normativer Stellenwert zukommt. In einem weiteren Schritt ist zu klären, ob das Leiden an einem unerfüllten Kinderwunsch als ein Rechtfertigungsgrund für reproduktionsmedizinische Interventionen gelten kann. Dafür wird zum einen der Stellenwert von Leiden, als eine anthropologische Grundbedingung, im Zusammenhang mit dem Leidenslinderungsauftrag der Medizin diskutiert. Zum anderen werden die Risiken der reproduktionsmedizinischen Therapien sowie deren Bedeutung als Gesundheitsressourcen erörtert. Dabei wird deutlich, dass Leiden an einem unerfüllten Kinderwunsch immer ein psychosomatischer Komplex ist. Nur unter Berücksichtigung der psychoexistenziellen Dimension des Leidens ergibt sich eine Legitimation für eine angemessene somatische Intervention.",
				"issue": "2",
				"journalAbbreviation": "Ethik Med",
				"language": "de",
				"libraryCatalog": "Springer Link",
				"pages": "125-139",
				"publicationTitle": "Ethik in der Medizin",
				"shortTitle": "Ist unerfüllter Kinderwunsch ein Leiden?",
				"url": "https://doi.org/10.1007/s00481-019-00556-z",
				"volume": "32",
				"attachments": [
					{
						"title": "Springer Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Infertility"
					},
					{
						"tag": "Kinderwunschbehandlung"
					},
					{
						"tag": "Leiden"
					},
					{
						"tag": "Leidenslinderung"
					},
					{
						"tag": "Relief of suffering"
					},
					{
						"tag": "Reproductive medicine"
					},
					{
						"tag": "Reproduktionsmedizin"
					},
					{
						"tag": "Suffering"
					},
					{
						"tag": "Unerfüllter Kinderwunsch"
					},
					{
						"tag": "Unfulfilled desire to have children"
					}
				],
				"notes": [
					"LF:",
					{
						"note": "abs:Definition of the problem: In medicine and bioethics, the term “suffering” is not clearly defined from a normative point of view. Nevertheless, suffering due to infertility is the starting point for medical interventions in assisted reproductive medicine. This implies that the unfulfilled desire to have children is a form of suffering, but the validity of this statement has not yet been clarified. Arguments: Based on descriptions of some common concepts, certain characteristics of suffering are identified. We discuss the significance of suffering as an anthropological condition in connection with the mission of medicine to alleviate human suffering. Furthermore, the risks of reproductive treatment and their significance for health are addressed. Conclusion: We conclude that the unfulfilled desire to have children is a form of suffering, and therefore has a normative value. The legitimacy of appropriate somatic intervention can only be established by taking the psycho-existential dimension of suffering into account."
					},
					{
						"note": "orcid:0000-0002-7194-6034 | Ibrahim Alkatout M.D., PhD, M.A., MaHM"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://link.springer.com/article/10.1007/s11153-020-09772-w",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Fitting prepositional gratitude to god is metaphysically impossible",
				"creators": [
					{
						"lastName": "Hunt",
						"firstName": "Marcus William",
						"creatorType": "author"
					}
				],
				"date": "2021-04-01",
				"DOI": "10.1007/s11153-020-09772-w",
				"ISSN": "1572-8684",
				"abstractNote": "It is argued that God cannot be a fitting target of prepositional gratitude. The first premise is that if someone cannot be benefited, then they cannot be a fitting target of prepositional gratitude. The second premise is that God cannot be benefited. Concerning the first premise, it is argued that a necessary component of prepositional gratitude is the desire to benefit one’s benefactor. Then it is argued that such a desire is fitting only if one’s benefactor can in fact be benefited. Concerning the second premise, it is noted that classical theism widely attributes blessedness to God. It is argued that if God is blessed then God necessarily has as much well-being as it is possible for God to have, and hence God cannot be benefited. Also noted are some ways in which God’s blessedness is compatible with less orthodox ideas about God’s passibility. The argument is then defended against eight objections.",
				"issue": "2",
				"journalAbbreviation": "Int J Philos Relig",
				"language": "en",
				"libraryCatalog": "Springer Link",
				"pages": "153-170",
				"publicationTitle": "International Journal for Philosophy of Religion",
				"url": "https://doi.org/10.1007/s11153-020-09772-w",
				"volume": "89",
				"attachments": [
					{
						"title": "Springer Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Blessedness"
					},
					{
						"tag": "Classical theism"
					},
					{
						"tag": "Fittingness"
					},
					{
						"tag": "Gratitude"
					},
					{
						"tag": "Philosophy of the emotions"
					}
				],
				"notes": [
					{
						"note": "orcid:0000-0001-6858-1903 | Marcus William Hunt"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://link.springer.com/article/10.1007/s11153-021-09790-2",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "After Pascal’s Wager: on religious belief, regulated and rationally held",
				"creators": [
					{
						"lastName": "Warman",
						"firstName": "Jack",
						"creatorType": "author"
					},
					{
						"lastName": "Efird",
						"firstName": "David",
						"creatorType": "author"
					}
				],
				"date": "2021-08-01",
				"DOI": "10.1007/s11153-021-09790-2",
				"ISSN": "1572-8684",
				"abstractNote": "In Pascal’s famous wager, he claims that the seeking non-believer can induce genuine religious belief in herself by joining a religious community and taking part in its rituals. This form of belief regulation is epistemologically puzzling: can we form beliefs in this way, and could such beliefs be rationally held? In the first half of the paper, we explain how the regimen could allow the seeking non-believer to regulate her religious beliefs by intervening on her evidence and epistemic standards. In the second half of the paper, we argue that regulated religious beliefs can be rationally held.",
				"issue": "1",
				"journalAbbreviation": "Int J Philos Relig",
				"language": "en",
				"libraryCatalog": "Springer Link",
				"pages": "61-78",
				"publicationTitle": "International Journal for Philosophy of Religion",
				"shortTitle": "After Pascal’s Wager",
				"url": "https://doi.org/10.1007/s11153-021-09790-2",
				"volume": "90",
				"attachments": [
					{
						"title": "Springer Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "orcid:0000-0001-6447-4158 | Jack Warman"
					},
					{
						"note": "orcid:0000-0001-5935-1938 | David Efird"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://link.springer.com/article/10.1007/s00481-021-00606-5",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Intensivpflege in Zeiten der COVID-19 Pandemie: Zur Frage des Verhältnisses von Fürsorge und Selbstsorge",
				"creators": [
					{
						"lastName": "Kuhn",
						"firstName": "Eva",
						"creatorType": "author"
					},
					{
						"lastName": "Seidlein",
						"firstName": "Anna-Henrikje",
						"creatorType": "author"
					}
				],
				"date": "2021-03-01",
				"DOI": "10.1007/s00481-021-00606-5",
				"ISSN": "1437-1618",
				"abstractNote": "Die COVID-19 Pandemie stellt eine beträchtliche Herausforderung für die Kapazität und Funktionalität der Intensivversorgung dar. Dies betrifft nicht nur Ressourcen, sondern vor allem auch die körperlichen und psychischen Grenzen von Pflegefachpersonen. Der Frage, wie sich Fürsorge und Selbstsorge von Pflegefachpersonen auf Intensivstationen im Rahmen der COVID-19 Pandemie zueinander verhalten, wurde bislang im öffentlichen und wissenschaftlichen Diskurs keine Aufmerksamkeit geschenkt. Der vorliegende Beitrag reflektiert dieses Verhältnis mit Hilfe des Ethikkodex des International Council of Nurses, unter besonderer Berücksichtigung der Prinzipienethik und der Care-Ethik nach Joan Tronto und zeigt einen Korridor ethisch vertretbarer Pflege auf.Die Arbeit leistet damit einen wichtigen Beitrag zu einer differenzierten ethischen Betrachtung der Rechte und Verantwortlichkeiten von Pflegefachpersonen als moralischen Akteuren innerhalb des Pandemiegeschehens in Deutschland. Damit schafft er eine erste Voraussetzung für einen breiten gesellschaftlichen und politischen Diskurs, der über die Pandemie hinaus dringend notwendig ist, um die Situation der Pflegefachpersonen und der Gepflegten nachhaltig zu verbessern.",
				"issue": "1",
				"journalAbbreviation": "Ethik Med",
				"language": "de",
				"libraryCatalog": "Springer Link",
				"pages": "51-70",
				"publicationTitle": "Ethik in der Medizin",
				"shortTitle": "Intensivpflege in Zeiten der COVID-19 Pandemie",
				"url": "https://doi.org/10.1007/s00481-021-00606-5",
				"volume": "33",
				"attachments": [
					{
						"title": "Springer Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "COVID-19"
					},
					{
						"tag": "Care"
					},
					{
						"tag": "Care Ethik"
					},
					{
						"tag": "Care ethics"
					},
					{
						"tag": "Code of ethics"
					},
					{
						"tag": "Ethikkodex"
					},
					{
						"tag": "Fürsorge"
					},
					{
						"tag": "Intensive care nursing"
					},
					{
						"tag": "Intensivpflege"
					},
					{
						"tag": "Pandemic"
					},
					{
						"tag": "Pandemie"
					},
					{
						"tag": "Selbstsorge"
					},
					{
						"tag": "Self-care"
					}
				],
				"notes": [
					"LF:",
					{
						"note": "abs:Definition of the problem: The COVID-19 pandemic poses a considerable challenge to the capacity and functionality of intensive care. This concerns not only resources but, above all, the physical and psychological boundaries of nursing professionals. The question of how care for others and self-care of nurses in intensive care units are related to each other in the context of the COVID-19 pandemic has not been addressed in public and scientific discourse so far. Arguments: The present contribution reflects this relationship with reference to the Code of Ethics of the International Council of Nurses, particularly considering principlism and the Care Ethics according to Joan Tronto. As a result, it shows a corridor of ethically justifiable care with several borders, above all: (1) self-care must not be given up completely for the benefit of care for others, and (2) a categorical subordination of care for others to self-care is ethically not justifiable. Conclusion: The article makes an important contribution to a differentiated ethical consideration of the rights and responsibilities of intensive care nurses as moral actors within the pandemic in Germany. It, thus, provides a first starting point for a broad social and political discourse which is urgently needed not only during but also after the pandemic in order to improve the situation of intensive care nurses and those who are cared for."
					},
					{
						"note": "orcid:0000-0002-8337-9639 | Eva Kuhn Mag.theol., B.A."
					},
					{
						"note": "orcid:0000-0002-7690-567X | Anna-Henrikje Seidlein M.Sc., B.A."
					}
				],
				"seeAlso": []
			}
		]
=======
		"url": "https://link.springer.com/journal/10344/volumes-and-issues/66-5",
		"items": "multiple"
>>>>>>> 9589c8efeb2c378a4d6854f36930e09909e648a8
>>>>>>> 5f00c4ca8b31ceb7f9f4e847436a453442ebbcb6
	}
]
/** END TEST CASES **/