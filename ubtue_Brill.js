{
	"translatorID": "b2fcf7d9-e023-412e-a2bc-f06d6275da24",
	"label": "Brill",
	"creator": "Madeesh Kannan, Timotheus Kim",
	"target": "^https?://brill.com/view/journals/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 90,
	"inRepository": false,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2020-12-09 08:46:58"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2019 Universitätsbibliothek Tübingen.  All rights reserved.
	Modified 2020 Timotheus Kim
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
	//for zotaut rss procedure we do not need multiple downloads
	return "journalArticle";
}

function doWeb(doc, url) {
	invokeEmbeddedMetadataTranslator(doc, url);
}

function invokeEmbeddedMetadataTranslator(doc, url) {
	var translator = Zotero.loadTranslator("web");
	translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
	translator.setDocument(doc);
	translator.setHandler("itemDone", function (t, i) {
		i.abstractNote = ZU.unescapeHTML(i.abstractNote).replace(/^abstract/i, '');
		postProcess(doc, i);
		i.complete();
	});
	translator.translate();
}

function postProcess(doc, item) {
	if (!item.abstractNote) {
		var abstractEntry = ZU.xpath(doc, '//section[@class="abstract"]//p');
		if (abstractEntry && abstractEntry.length > 0)
			item.abstractNote = abstractEntry[0].textContent.trim();
	}
	item.tags = ZU.xpath(doc, '//dd[contains(@class, "keywords")]//a');
	if (item.tags)
		item.tags = item.tags.map(i => i.textContent.trim().replace(/^\w/gi,function(m){return m.toUpperCase();}));
	let reviewEntry = text(doc, '.articlecategory');
	if (reviewEntry && reviewEntry.match(/book\sreview/i)) item.tags.push('Book Review');
	// mark articles as "LF" (MARC=856 |z|kostenfrei), that are published as open access
	let openAccessTag = text(doc, '.has-license span');
	if (openAccessTag) item.notes.push('LF');
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://brill.com/view/journals/bi/28/3/article-p273_1.xml",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Reflections on the Scholarly Imaginations of Good and Evil in the Book of Esther",
				"creators": [
					{
						"firstName": "Lydia",
						"lastName": "Lee",
						"creatorType": "author"
					}
				],
				"date": "2020/06/04",
				"DOI": "10.1163/15685152-00283P01",
				"ISSN": "1568-5152, 0927-2569",
				"abstractNote": "The present article seeks to describe, analyze, and evaluate the modern scholarly attempts to grapple with the moral issues about good and evil in the Hebrew Esther story. The first part of the article examines the anti-Semitic sentiments looming behind the pre-World War II European, especially the Protestant, commentators’ ethics assessments of the book of Esther and its Jewish characters, before pointing out a blind spot in these assessments. The second part of the article offers a systematic analysis of the gradual change of attitude induced mainly by the Jewish scholars in the aftermath of the Second World War. Lastly, the paper turns the spotlight on the Esther studies conducted by recent feminist and other marginalized biblical scholars. Attempts are made to demonstrate how their works, coming from different social contexts, enrich the academic discussions about good and evil in the book of Esther.",
				"issue": "3",
				"language": "en",
				"libraryCatalog": "brill.com",
				"pages": "273-302",
				"publicationTitle": "Biblical Interpretation",
				"url": "https://brill.com/view/journals/bi/28/3/article-p273_1.xml",
				"volume": "28",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Book of Esther"
					},
					{
						"tag": "Feminist"
					},
					{
						"tag": "Good and evil"
					},
					{
						"tag": "Jewish"
					},
					{
						"tag": "Marginalized"
					},
					{
						"tag": "Protestant"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://brill.com/view/journals/bi/28/5/article-p557_557.xml",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Reading with Minor Feelings: Racialized Emotions and Children’s (Non)agency in Judges 10–12",
				"creators": [
					{
						"firstName": "Dong Sung",
						"lastName": "Kim",
						"creatorType": "author"
					}
				],
				"date": "2020/11/30",
				"DOI": "10.1163/15685152-2805A003",
				"ISSN": "1568-5152, 0927-2569",
				"abstractNote": "In this article, I read the story of Jephthah and his daughter in Judges 10–12 within the contemporary context of racism and discrimination in the U.S. Particularly focusing on the affective and emotional dimensions of the lived experiences in racially/ethnically minoritized communities, I engage the biblical story with what poet and writer Cathy Park Hong calls, “minor feelings.” Reading the biblical narrative alongside Hong’s crudely personal—and yet pervasively common—accounts of Asian American racial trauma, I critically reflect on the notion of childhood agency, and suggest that the Western conception of agency neither reflects nor promotes the lives of the children in minority groups. In turn, I ask: What if we moved away from the traditional notions of agency and voice in our critical works, and, instead, turned towards emotions, sensations, and other embodied experiences as a site of interpretation, critique, and movement for social change?",
				"issue": "5",
				"language": "en",
				"libraryCatalog": "brill.com",
				"pages": "557-583",
				"publicationTitle": "Biblical Interpretation",
				"shortTitle": "Reading with Minor Feelings",
				"url": "https://brill.com/view/journals/bi/28/5/article-p557_557.xml",
				"volume": "28",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Affect theory"
					},
					{
						"tag": "Cathy Park Hong"
					},
					{
						"tag": "Childist biblical interpretation"
					},
					{
						"tag": "Jephthah’s daughter"
					},
					{
						"tag": "Judges 10–12"
					},
					{
						"tag": "Minor feelings"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://brill.com/view/journals/dsd/27/3/article-p372_4.xml",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Double Object Constructions in DSS Hebrew: The Case of ntn",
				"creators": [
					{
						"firstName": "Femke",
						"lastName": "Siebesma-Mannens",
						"creatorType": "author"
					}
				],
				"date": "2020/10/12",
				"DOI": "10.1163/15685179-bja10017",
				"ISSN": "0929-0761, 1568-5179",
				"abstractNote": "In this article an overview is given of the verbal valence patterns of the verb ‮נתן‬‎ in the Dead Sea Scrolls. Four patterns are distinguished for this verb: 1. ‮נתן‬‎ + OBJECT to produce; 2. + ‮נתן‬‎ OBJECT + RECIPIENT to give to; 3. ‮נתן‬‎ + OBJECT + LOCATION to place; 4. ‮נתן‬‎ + OBJECT + 2ND OBJECT to make into. All occurrences of the verb in the DSS corpus used, consisting of 1QHa, 1QS, 1QM, and 1QpHab, are discussed and divided into one of these patterns. This study shows that pattern 3 occurs most, followed by pattern 2, and that it can be argued that pattern 1 and 4 also occur in our DSS corpus, though the evidence is scarce. In some cases, translations, differing from the translations in the editions of the texts, are proposed that better reflect the verbal valence patterns used in the clause.",
				"issue": "3",
				"language": "en",
				"libraryCatalog": "brill.com",
				"pages": "372-391",
				"publicationTitle": "Dead Sea Discoveries",
				"shortTitle": "Double Object Constructions in DSS Hebrew",
				"url": "https://brill.com/view/journals/dsd/27/3/article-p372_4.xml",
				"volume": "27",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Dead Sea Scrolls"
					},
					{
						"tag": "Ntn"
					},
					{
						"tag": "Qumran Hebrew"
					},
					{
						"tag": "Verbal valence patterns"
					}
				],
				"notes": [
					"LF"
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
