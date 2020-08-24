{
	"translatorID": "338ea029-1536-4575-ba9b-42094095f65d",
	"label": "ubtue_University of Chicago Press Journal",
	"creator": "Timotheus Kim",
	"target": "https://www\\.journals\\.uchicago\\.edu/doi|toc",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 80,
	"inRepository": false,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2020-08-21 17:30:16"
}

/*
	***** BEGIN LICENSE BLOCK *****
	Copyright © 2020 Universitätsbibliothek Tübingen.  All rights reserved.
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
	***** END LICENSE BLOCK *****
*/

function detectWeb(doc, url) {
	if (url.includes('/doi/')) return "journalArticle";
		else if (url.includes('/toc/') && getSearchResults(doc)) return "multiple";
	else return false;
}

function getSearchResults(doc) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//*[contains(concat( " ", @class, " " ), concat( " ", "issue-item__title", " " ))]//a');
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(row.textContent);
		if (!href || !title) continue;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

/*function invokeEMTranslator(doc) {
	var translator = Zotero.loadTranslator("web");
	translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
	translator.setDocument(doc);
	translator.setHandler("itemDone", function (t, i) {
		//scrape abstract from website instead of EM
		let abstractFull = ZU.xpathText(doc, '//*[contains(concat( " ", @class, " " ), concat( " ", "abstractInFull", " " ))]//p');
		if (abstractFull) i.abstractNote = abstractFull;
		i.complete();
	});
	translator.translate();
}*/

function doWeb(doc, url) {
	if (detectWeb(doc, url) === "multiple") {
		Zotero.selectItems(getSearchResults(doc), function (items) {
			if (!items) {
				return true;
			}
			var articles = [];
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, scrape);
		});
	} else
		scrape(doc, url);
}

function scrape(doc, url) {
	var risURL = "https://www.journals.uchicago.edu/action/downloadCitation";
	var doi = ZU.xpathText(doc, '//meta[@name="dc.Identifier" and @scheme="doi"]/@content');
	if (!doi) {
		doi = url.match(/10\.[^?#]+/)[0];
	}
	var post = "doi=" + encodeURIComponent(doi) + "&include=abs&format=ris&direct=false&submit=Download+Citation";
	//Z.debug(risURL)

	ZU.doPost(risURL, post, function (text) {
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
		translator.setString(text);
		translator.setHandler("itemDone", function (obj, item) {
			Z.debug(text)
			var tags = ZU.xpath(doc, '//meta[@name="dc.Subject"]');
			for (var i in tags){
					//let tags[0].content = tags[0].content.split(';'))
					let tagentry = tags[i].content.split(/;/);// Z.debug(tagentry)
					for (var v in tagentry) {
						item.tags.push(tagentry[v]);	
					}
				}
			// 
			var abstract = ZU.xpathText(doc, '//*[contains(concat( " ", @class, " " ), concat( " ", "abstractInFull", " " ))]//p');
			if (item.abstractNote) item.abstractNote = abstract; // Z.debug(abstract)
			item.complete();
		});
		translator.translate();
	});
}


/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.journals.uchicago.edu/doi/10.1086/708235",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Between the Highland Polity and Philistia: The United Monarchy and the Resettlement of the Shephelah in the Iron Age IIA, with a Special Focus on Tel ʿEton and Khirbet Qeiyafa",
				"creators": [
					{
						"lastName": "Faust",
						"firstName": "Avraham",
						"creatorType": "author"
					}
				],
				"date": "März 20, 2020",
				"DOI": "10.1086/708235",
				"ISSN": "0003-097X",
				"abstractNote": "The Shephelah, one of Judah’s 8th century b.c.e. settlement hubs, was sparsely settled during the Iron Age I, when only a small Canaanite enclave survived in its eastern part. The resettlement of the Shephelah, beginning during the Iron Age I–II transition and lasting over 200 years, was a complex process that had two different facets. The first, better-known facet is the gradual establishment of dozens of new sites, the vast majority of which had clear connections to the highlands polity (e.g., Lachish, Tel Zayit, Tel Burna). The second, less-discussed facet is the transformations experienced by the few settlements that existed in the region in the Iron Age I, most notably Tell Beit Mirsim, Beth-Shemesh, Tel ʿEton, and Tel Halif. After presenting background data, the article will offer a detailed reconstruction of the processes through which the Shephelah became part of the highland polity, with a special focus on Tel ʿEton and on the enigmatic, earlier, and short-lived site of Khirbet Qeiyafa. The paper will conclude with a detailed refutation of the recent suggestion that the small Iron Age I Canaanite enclave that existed in the eastern Shephelah developed into a large Iron Age IIA Canaanite polity.",
				"journalAbbreviation": "Bulletin of the American Schools of Oriental Research",
				"libraryCatalog": "ubtue_University of Chicago Press Journal_test_ris",
				"pages": "115-136",
				"publicationTitle": "Bulletin of the American Schools of Oriental Research",
				"shortTitle": "Between the Highland Polity and Philistia",
				"url": "https://doi.org/10.1086/708235",
				"volume": "383",
				"attachments": [],
				"tags": [
					{
						"tag": " 10th century"
					},
					{
						"tag": " Israel"
					},
					{
						"tag": " Judah"
					},
					{
						"tag": " Khirbet Qeiyafa"
					},
					{
						"tag": " Philistia"
					},
					{
						"tag": " Tel ʿEton"
					},
					{
						"tag": " United Monarchy"
					},
					{
						"tag": "Shephelah"
					}
				],
				"notes": [
					{
						"note": "<p>doi: 10.1086/708235</p>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.journals.uchicago.edu/doi/10.1086/707494",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "The Color-Inlaid “Champlevé” Reliefs of the Synagogue at Sardis",
				"creators": [
					{
						"lastName": "Rautman",
						"firstName": "Marcus",
						"creatorType": "author"
					}
				],
				"date": "Januar 29, 2020",
				"DOI": "10.1086/707494",
				"ISSN": "0003-097X",
				"abstractNote": "One of the notable features of the Sardis Synagogue was its extensive decoration with floor mosaics, wall paintings, marble revetment, and opus sectile, with an ornamental relief arcade also appearing in the forecourt. Reliefs carved in the distinctive “champlevé” technique presented a series of arches with spandrels featuring vases, vines, and birds set against a reddish ground. The sculptural approach is not well known in the region, although examples of similar work have been reported across Europe and the east Mediterranean, most notably at Aizanoi, Antioch, and Kourion. Other fragments of incised and color-inlaid relief at Sardis suggest that the Synagogue arcade was carved by sculptors who were both familiar with the site and aware of broader trends in architectural ornament in the 6th century c.e., *Remembering Gene Kleinbauer (1937–2019)—teacher, mentor, and friend",
				"journalAbbreviation": "Bulletin of the American Schools of Oriental Research",
				"libraryCatalog": "ubtue_University of Chicago Press Journal_test_ris",
				"pages": "97-113",
				"publicationTitle": "Bulletin of the American Schools of Oriental Research",
				"url": "https://doi.org/10.1086/707494",
				"volume": "383",
				"attachments": [],
				"tags": [
					{
						"tag": " Sardis"
					},
					{
						"tag": " ornament"
					},
					{
						"tag": " synagogue"
					},
					{
						"tag": "Champlevé relief sculpture"
					}
				],
				"notes": [
					{
						"note": "<p>doi: 10.1086/707494</p>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.journals.uchicago.edu/doi/10.1086/707583",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Chalkstone Vessels from Sepphoris: Galilean Production in Roman Times",
				"creators": [
					{
						"lastName": "Sherman",
						"firstName": "Maya",
						"creatorType": "author"
					},
					{
						"lastName": "Weiss",
						"firstName": "Zeev",
						"creatorType": "author"
					},
					{
						"lastName": "Zilberman",
						"firstName": "Tami",
						"creatorType": "author"
					},
					{
						"lastName": "Yasur",
						"firstName": "Gal",
						"creatorType": "author"
					}
				],
				"date": "Februar 6, 2020",
				"DOI": "10.1086/707583",
				"ISSN": "0003-097X",
				"abstractNote": "Stone vessels were used in Judaea and the Galilee from the second half of the 1st century b.c.e. until the 2nd century c.e., when it is widely accepted that they were phased out. This study focuses on the major types of chalkstone vessels uncovered in Roman Sepphoris, identifies the unique forms in the assemblage, and discusses the technological issues pertaining to their production. The findings presented in this study suggest that the stone vessels in the Galilee, unlike those in Judaea, did not disappear immediately but were found in layers associated with the Late Roman period (mid-2nd to 4th centuries), thus indicating their continual use. In tracing the sources of the chalkstone vessels, the geochemical analysis employed in this study shows that large numbers of vessels used by Sepphoreans were evidently produced in local quarries of the Lower Galilee.",
				"journalAbbreviation": "Bulletin of the American Schools of Oriental Research",
				"libraryCatalog": "ubtue_University of Chicago Press Journal_test_ris",
				"pages": "79-95",
				"publicationTitle": "Bulletin of the American Schools of Oriental Research",
				"shortTitle": "Chalkstone Vessels from Sepphoris",
				"url": "https://doi.org/10.1086/707583",
				"volume": "383",
				"attachments": [],
				"tags": [
					{
						"tag": " Galilean chalkstone vessels"
					},
					{
						"tag": " Sepphoris"
					},
					{
						"tag": " daily life"
					},
					{
						"tag": " quarries"
					},
					{
						"tag": "Chalkstone vessels"
					}
				],
				"notes": [
					{
						"note": "<p>doi: 10.1086/707583</p>"
					}
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
