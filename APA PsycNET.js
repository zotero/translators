{
	"translatorID": "1e1e35be-6264-45a0-ad2e-7212040eb984",
	"label": "APA PsycNET",
	"creator": "Philipp Zumstein",
	"target": "^https?://psycnet\\.apa\\.org/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2017-08-13 20:01:09"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2017 Philipp Zumstein
	
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


// attr()/text() v2
function attr(docOrElem,selector,attr,index){var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);return elem?elem.getAttribute(attr):null}function text(docOrElem,selector,index){var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);return elem?elem.textContent:null}


function detectWeb(doc, url) {
	return "journalArticle";
	if (url.indexOf('/PsycBOOKS/')>-1) {
		return "book";
	} else if (url.indexOf('/search/display?')>-1 || url.indexOf('/record/')>-1) {
		if (doc.getElementById('bookchapterstoc')) {
			return "bookSection";
		} else {
			return "journalArticle";
		}
	} else if (url.indexOf('/search/results?')>-1 && getSearchResults(doc, true)) {
		return "multiple";
	}
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('a.article-title');
	for (var i=0; i<rows.length; i++) {
		var href = rows[i].href;
		var title = ZU.trimInternal(rows[i].textContent);Z.debug(title);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}


function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (!items) {
				return true;
			}
			var articles = [];
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, scrape);
		});
	} else {
		scrape(doc, url);
	}
}


function scrape(doc, url) {
	var uid = getIds(doc,url);
	
	var productCode;
	var db = doc.getElementById('database');
	if (db) {
		var db = db.parentNode.textContent;
		if (db.indexOf('PsycARTICLES')>-1) {
			productCode = 'PA';
		} else if (db.indexOf('PsycBOOKS')>-1) {
			productCode = 'PB';
		} else if (db.indexOf('PsycINFO')>-1) {
			productCode = 'PI';
		}
	}
	Z.debug(productCode);
	
	var postData = '{"api":"record.exportRISFile","params":{"UIDList":[{"UID":"'+uid+'","ProductCode":"'+productCode+'"}],"exportType":"zotero"}}';
	var headers = {
		'Content-Type': 'application/json',
		'Referer': url
	};
	Z.debug(postData);


	ZU.doPost('/api/request/record.exportRISFile', postData, function(text) {
		try {
			var data = JSON.parse(text);
		} catch(e) {
			Z.debug('POST request did not result in valid JSON');
			Z.debug(text);
		};
Z.debug(text)
		if (data && data.isRisExportCreated) {
			Z.debug(data);
			ZU.doGet('/ris/download', function(text2) {
				Z.debug("TEXT 2: "+text2);
				var redirect = text2.match(/<meta http-equiv="refresh" content="10; url=([^"]*)"/)
				Z.debug("REDIRECT: "+redirect);
				if (redirect) {
					ZU.doGet(redirect, function(text3) {
						Z.debug("TEXT 3: "+text3);
						processRIS(text3, doc);
					}, null, null, headers);
				} else {
					processRIS(text2, doc);
				}
				
				
			});
		}
	}, headers);
}


function processRIS(text, doc) {
	var translator = Zotero.loadTranslator("import");
	translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
	translator.setString(text);
	translator.setHandler("itemDone", function(obj, item) {
		for (var i=0; i<item.tags.length; i++) {
			item.tags[i] = item.tags[i].replace(/^\*/, '');
		}
		var pdfURL = attr(doc, 'a[href*="/fulltext"]');
		if (pdfURL) {
			item.attachments.push({
				url: pdfURL.href,
				title: "Full Text PDF",
				mimeType: "application/pdf"
			});
		}
		item.attachments.push({
			title: "Snapshot",
			document: doc
		});
		item.complete();
	})
	translator.translate();
}


//try to figure out ids that we can use for fetching RIS
function getIds(doc, url) {
	//try to extract uid from the table
	var uid = doc.getElementById('uid');
	if (uid) {
		return text(doc, '#uid + dd');
	}

	//try to extract uid from the url
	if (url.indexOf('/record/')>-1) {
		var m = url.match(/\/record\/([\d\-]*)/);
		if (m && m[1]) {
			return m[1];
		}
	}
	
	/**on the book pages, we can find the UID in
	 * the Front matter and Back matter links
	 */
	if (url.indexOf('/PsycBOOKS/')>-1) {
		var link = attr(doc, '.bookMatterLinks a', 'href');
		var m = link.match(/\/fulltext\/([^&]+?)-(?:FRM|BKM)/i);
		if (m && m[1]) {
			return m[1];
		}
	}

	/**for pages with buy.optionToBuy
	 * we can fetch the id from the url
	 * alternatively, the id is in a javascript section (this is messy)
	 */
	if(url.indexOf('buy.optiontobuy') != -1) {
		var m = url.match(/\bid=([^&]+)/);
		if(m) {
			ret.lstUID = m[1];
			return ret;
		}

		m = doc.documentElement.textContent.match(/\bitemUID\s*=\s*(['"])(.*?)\1/);
		if(m && m[2]) {
			ret.lstUID = m[2];
			return ret;
		}
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://psycnet.apa.org/index.cfm?fa=search.displayRecord&uid=2004-16644-010",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Neuropsychology of Adults With Attention-Deficit/Hyperactivity Disorder: A Meta-Analytic Review",
				"creators": [
					{
						"lastName": "Hervey",
						"firstName": "Aaron S.",
						"creatorType": "author"
					},
					{
						"lastName": "Epstein",
						"firstName": "Jeffery N.",
						"creatorType": "author"
					},
					{
						"lastName": "Curry",
						"firstName": "John F.",
						"creatorType": "author"
					}
				],
				"date": "2004",
				"DOI": "10.1037/0894-4105.18.3.485",
				"ISSN": "1931-1559 0894-4105",
				"abstractNote": "A comprehensive, empirically based review of the published studies addressing neuropsychological performance in adults diagnosed with attention-deficit/hyperactivity disorder (ADHD) was conducted to identify patterns of performance deficits. Findings from 33 published studies were submitted to a meta-analytic procedure producing sample-size-weighted mean effect sizes across test measures. Results suggest that neuropsychological deficits are expressed in adults with ADHD across multiple domains of functioning, with notable impairments in attention, behavioral inhibition, and memory, whereas normal performance is noted in simple reaction time. Theoretical and developmental considerations are discussed, including the role of behavioral inhibition and working memory impairment. Future directions for research based on these findings are highlighted, including further exploration of specific impairments and an emphasis on particular tests and testing conditions.",
				"issue": "3",
				"language": "English",
				"libraryCatalog": "APA PsycNET",
				"pages": "485-503",
				"publicationTitle": "Neuropsychology",
				"rights": "(c) 2016 APA, all rights reserved",
				"shortTitle": "Neuropsychology of Adults With Attention-Deficit/Hyperactivity Disorder",
				"volume": "18",
				"attachments": [
					{
						"title": "APA Psycnet Fulltext PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					"*Attention Deficit Disorder with Hyperactivity",
					"*Experimentation",
					"*Neuropsychological Assessment",
					"*Neuropsychology",
					"Behavioral Inhibition",
					"Empirical Methods",
					"Hyperkinesis",
					"Inhibition (Personality)",
					"Reaction Time"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://psycnet.apa.org/journals/xge/50/5/325/",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Factor analysis of meaning",
				"creators": [
					{
						"lastName": "Osgood",
						"firstName": "Charles E.",
						"creatorType": "author"
					},
					{
						"lastName": "Suci",
						"firstName": "George J.",
						"creatorType": "author"
					}
				],
				"date": "1955",
				"DOI": "10.1037/h0043965",
				"ISSN": "0022-1015",
				"abstractNote": "Two factor analytic studies of meaningful judgments based upon the same sample of 50 bipolar descriptive scales are reported. Both analyses reveal three major connotative factors: evaluation, potency, and activity. These factors appear to be independent dimensions of the semantic space within which the meanings of concepts may be specified.",
				"issue": "5",
				"language": "English",
				"libraryCatalog": "APA PsycNET",
				"pages": "325-338",
				"publicationTitle": "Journal of Experimental Psychology",
				"rights": "(c) 2016 APA, all rights reserved",
				"volume": "50",
				"attachments": [
					{
						"title": "APA Psycnet Fulltext PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					"*Factor Analysis",
					"*Judgment",
					"*Semantics",
					"Factor Structure",
					"Meaning"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://psycnet.apa.org/psycinfo/1992-98221-010",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Catatonia: Tonic immobility: Evolutionary underpinnings of human catalepsy and catatonia",
				"creators": [
					{
						"lastName": "Gallup Jr.",
						"firstName": "Gordon G.",
						"creatorType": "author"
					},
					{
						"lastName": "Maser",
						"firstName": "Jack D.",
						"creatorType": "author"
					},
					{
						"lastName": "Maser",
						"firstName": "J. D.",
						"creatorType": "editor"
					},
					{
						"lastName": "Seligman",
						"firstName": "M. E. P.",
						"creatorType": "editor"
					}
				],
				"date": "1977",
				"ISBN": "9780716703686 9780716703679",
				"abstractNote": "tonic immobility [animal hypnosis] might be a useful laboratory analog or research model for catatonia / we have been collaborating on an interdisciplinary program of research in an effort to pinpoint the behavioral antecedents and biological bases for tonic immobility / attempt to briefly summarize our findings, and . . . discuss the implications of these data in terms of the model characteristics of tonic immobility / hypnosis / catatonia, catalepsy, and cataplexy / tonic immobility as a model for catatonia / fear potentiation / fear alleviation / fear or arousal / learned helplessness / neurological correlates / pharmacology and neurochemistry / genetic underpinnings / evolutionary considerations / implications for human psychopathology",
				"bookTitle": "Psychopathology: Experimental models",
				"libraryCatalog": "APA PsycNET",
				"pages": "334-357",
				"place": "New York, NY, US",
				"publisher": "W H Freeman/Times Books/ Henry Holt & Co",
				"rights": "(c) 2016 APA, all rights reserved",
				"series": "A series of books in psychology.",
				"shortTitle": "Catatonia",
				"attachments": [
					{
						"title": "APA PsycNET Snapshot"
					}
				],
				"tags": [
					"*Catalepsy",
					"*Catatonia",
					"*Tonic Immobility",
					"Animal Models",
					"Fear",
					"Genetics",
					"Neurology",
					"Pharmacology"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://psycnet.apa.org/psycinfo/2004-16329-000/",
		"items": [
			{
				"itemType": "book",
				"title": "The abnormal personality: A textbook",
				"creators": [
					{
						"lastName": "White",
						"firstName": "Robert W.",
						"creatorType": "author"
					}
				],
				"date": "1948",
				"abstractNote": "The author's intent is to write about abnormal people in a way that will be valuable and interesting to students new to the subject. A first course in abnormal psychology is not intended to train specialists. Its goal is more general: it should provide the student with the opportunity to whet his interest, expand his horizons, register a certain body of new facts, and relate this to the rest of his knowledge about mankind. I have tried to present the subject in such a way as to emphasize its usefulness to all students of human nature. I have tried the experiment of writing two introductory chapters, one historical and the other clinical. This reflects my desire to set the subject-matter in a broad perspective and at the same time to anchor it in concrete fact. Next comes a block of six chapters designed to set forth the topics of maladjustment and neurosis. The two chapters on psychotherapy complete the more purely psychological or developmental part of the work. In the final chapter the problem of disordered personalities is allowed to expand to its full social dimensions. Treatment, care, and prevention call for social effort and social organization. I have sought to show some of the lines, both professional and nonprofessional, along which this effort can be expended.",
				"extra": "DOI: 10.1037/10023-000",
				"libraryCatalog": "APA PsycNET",
				"numPages": "617",
				"place": "New York, NY, US",
				"publisher": "Ronald Press Company",
				"rights": "(c) 2016 APA, all rights reserved",
				"shortTitle": "The abnormal personality",
				"volume": "x",
				"attachments": [
					{
						"title": "APA Psycnet Fulltext PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					"Abnormal Psychology"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://psycnet.apa.org/books/10023",
		"items": [
			{
				"itemType": "book",
				"title": "The abnormal personality: A textbook",
				"creators": [
					{
						"lastName": "White",
						"firstName": "Robert W.",
						"creatorType": "author"
					}
				],
				"date": "1948",
				"abstractNote": "The author's intent is to write about abnormal people in a way that will be valuable and interesting to students new to the subject. A first course in abnormal psychology is not intended to train specialists. Its goal is more general: it should provide the student with the opportunity to whet his interest, expand his horizons, register a certain body of new facts, and relate this to the rest of his knowledge about mankind. I have tried to present the subject in such a way as to emphasize its usefulness to all students of human nature. I have tried the experiment of writing two introductory chapters, one historical and the other clinical. This reflects my desire to set the subject-matter in a broad perspective and at the same time to anchor it in concrete fact. Next comes a block of six chapters designed to set forth the topics of maladjustment and neurosis. The two chapters on psychotherapy complete the more purely psychological or developmental part of the work. In the final chapter the problem of disordered personalities is allowed to expand to its full social dimensions. Treatment, care, and prevention call for social effort and social organization. I have sought to show some of the lines, both professional and nonprofessional, along which this effort can be expended.",
				"extra": "DOI: 10.1037/10023-000",
				"libraryCatalog": "APA PsycNET",
				"numPages": "617",
				"place": "New York, NY, US",
				"publisher": "Ronald Press Company",
				"rights": "(c) 2016 APA, all rights reserved",
				"shortTitle": "The abnormal personality",
				"volume": "x",
				"attachments": [
					{
						"title": "APA PsycNET Snapshot"
					}
				],
				"tags": [
					"Abnormal Psychology"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://psycnet.apa.org/index.cfm?fa=buy.optionToBuy&id=2004-16329-002",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Clinical introduction: Examples of disordered personalities",
				"creators": [
					{
						"lastName": "White",
						"firstName": "Robert W.",
						"creatorType": "author"
					}
				],
				"date": "1948",
				"abstractNote": "This chapter examines some representative examples of disordered personalities. The reader should be forewarned that the five cases described here will be frequently referred to in later chapters of the book. They display to advantage many of the problems and principles that will occupy us when we undertake to build up a systematic account of abnormal psychology. It will be assumed that the cases given in this chapter are well remembered, and with this in mind the reader should not only go through them but study and compare them rather carefully. The main varieties of disordered personalities and student attitudes toward abnormality are discussed before the case histories are presented.",
				"bookTitle": "The abnormal personality: A textbook",
				"extra": "DOI: 10.1037/10023-002",
				"libraryCatalog": "APA PsycNET",
				"pages": "54-101",
				"place": "New York, NY, US",
				"publisher": "Ronald Press Company",
				"rights": "(c) 2016 APA, all rights reserved",
				"shortTitle": "Clinical introduction",
				"attachments": [
					{
						"title": "APA PsycNET Snapshot"
					}
				],
				"tags": [
					"*Abnormal Psychology",
					"Personality Disorders"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://psycnet.apa.org/index.cfm?fa=buy.optionToBuy&id=2010-19350-001",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Predicting behavior in economic games by looking through the eyes of the players",
				"creators": [
					{
						"lastName": "Mellers",
						"firstName": "Barbara A.",
						"creatorType": "author"
					},
					{
						"lastName": "Haselhuhn",
						"firstName": "Michael P.",
						"creatorType": "author"
					},
					{
						"lastName": "Tetlock",
						"firstName": "Philip E.",
						"creatorType": "author"
					},
					{
						"lastName": "Silva",
						"firstName": "José C.",
						"creatorType": "author"
					},
					{
						"lastName": "Isen",
						"firstName": "Alice M.",
						"creatorType": "author"
					}
				],
				"date": "2010",
				"DOI": "10.1037/a0020280",
				"ISSN": "1939-2222 0096-3445",
				"abstractNote": "Social scientists often rely on economic experiments such as ultimatum and dictator games to understand human cooperation. Systematic deviations from economic predictions have inspired broader conceptions of self-interest that incorporate concerns for fairness. Yet no framework can describe all of the major results. We take a different approach by asking players directly about their self-interest—defined as what they want to do (pleasure-maximizing options). We also ask players directly about their sense of fairness—defined as what they think they ought to do (fairness-maximizing options). Player-defined measures of self-interest and fairness predict (a) the majority of ultimatum-game and dictator-game offers, (b) ultimatum-game rejections, (c) exiting behavior (i.e., escaping social expectations to cooperate) in the dictator game, and (d) who cooperates more after a positive mood induction. Adopting the players' perspectives of self-interest and fairness permits better predictions about who cooperates, why they cooperate, and when they punish noncooperators.",
				"issue": "4",
				"libraryCatalog": "APA PsycNET",
				"pages": "743-755",
				"publicationTitle": "Journal of Experimental Psychology: General",
				"rights": "(c) 2016 APA, all rights reserved",
				"volume": "139",
				"attachments": [
					{
						"title": "APA PsycNET Snapshot"
					}
				],
				"tags": [
					"*Economics",
					"*Games",
					"*Prediction",
					"Behavior",
					"Cooperation",
					"Emotional States"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://psycnet.apa.org/books/12348/002",
		"items": [
			{
				"itemType": "bookSection",
				"title": "The self in vocational psychology: Object, subject, and project",
				"creators": [
					{
						"lastName": "Savickas",
						"firstName": "Mark L.",
						"creatorType": "author"
					},
					{
						"lastName": "Hartung",
						"firstName": "P. J.",
						"creatorType": "editor"
					},
					{
						"lastName": "Subich",
						"firstName": "L. M.",
						"creatorType": "editor"
					}
				],
				"date": "2011",
				"ISBN": "9781433808616 9781433808623",
				"abstractNote": "In this chapter, I seek to redress vocational psychology’s inattention to the self and address the ambiguity of the meaning of self. To begin, I offer a chronological survey of vocational psychology’s three main views of human singularity. During succeeding historical eras, different aspects of human singularity interested vocational psychologists, so they developed a new set of terms and concepts to deal with shifts in the meaning of individuality. Over time, vocational psychology developed what Kuhn (2000) referred to as language communities, each with its own paradigm for understanding the self and vocational behavior. Because the self is fundamentally ambiguous, adherents to each paradigm describe it with an agreed on language and metaphors. Thus, each paradigm has a textual tradition, or way of talking about the self. As readers shall see, when they talk about individuals, differentialists use the language of personality, developmentalists use the language of personhood, and constructionists use the language of identity.",
				"bookTitle": "Developing self in work and career: Concepts, cases, and contexts",
				"extra": "DOI: 10.1037/12348-002",
				"libraryCatalog": "APA PsycNET",
				"pages": "17-33",
				"place": "Washington, DC, US",
				"publisher": "American Psychological Association",
				"rights": "(c) 2017 APA, all rights reserved",
				"shortTitle": "The self in vocational psychology",
				"attachments": [
					{
						"title": "APA Psycnet Fulltext PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					"*Occupational Guidance",
					"*Personality",
					"Self-Concept"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/