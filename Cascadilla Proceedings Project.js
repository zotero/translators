{
	"translatorID": "cbed2134-f963-43a0-a8ad-9813e94de9a7",
	"label": "Cascadilla Proceedings Project",
	"creator": "Abe Jellinek",
	"target": "^https?://(www\\.)?lingref\\.com/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-10-29 00:35:04"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2021 Abe Jellinek
	
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


function detectWeb(doc, _url) {
	if (doc.querySelector('.bookinfo')) {
		return "conferencePaper";
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.pagecontent > .contentpadding > a[href*="abstract"][href$=".html"]');
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(nearestPreviousSibling(row, 'b'));
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function nearestPreviousSibling(el, selector) {
	while ((el = el.previousElementSibling)) {
		if (el.matches(selector)) {
			return el.textContent.trim();
		}
	}
	return '';
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (items) ZU.processDocuments(Object.keys(items), scrape);
		});
	}
	else {
		scrape(doc, url);
	}
}

function scrape(doc, url) {
	var translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	
	translator.setHandler('itemDone', function (obj, item) {
		fillBookInfo(doc, url, item);
		item.complete();
	});

	translator.getTranslatorObject(function (trans) {
		trans.itemType = 'conferencePaper';
		trans.doWeb(doc, url);
	});
}

function fillBookInfo(doc, url, item) {
	let bookInfo = doc.querySelector('.bookinfo > .contentpadding')
		|| doc.querySelector('.pagecontent > .contentpadding');
	item.proceedingsTitle = text(bookInfo, '.largerfont');
	item.abstractNote = text(doc, '.abstract div');
	
	if (item.publisher && item.publisher.startsWith('Cascadilla')) {
		item.place = 'Somerville, MA';
	}
	
	item.url = url;
	
	for (let child of bookInfo.childNodes) {
		if (child.textContent.trim().startsWith('edited by')) {
			for (let name of child.textContent.trim()
					.replace(/^edited by\s*/, '').split(/, (?:and )?| and /)) {
				item.creators.push(ZU.cleanAuthor(name, 'editor'));
			}
			break;
		}
	}
	
	for (let attachment of item.attachments) {
		if (attachment.url && attachment.url.startsWith('www.')) {
			attachment.url = 'https://' + attachment.url;
		}
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.lingref.com/cpp/wccfl/25/abstract1429.html",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "Subject Preference in Korean",
				"creators": [
					{
						"firstName": "Nayoung",
						"lastName": "Kwon",
						"creatorType": "author"
					},
					{
						"firstName": "Maria",
						"lastName": "Polinsky",
						"creatorType": "author"
					},
					{
						"firstName": "Robert",
						"lastName": "Kluender",
						"creatorType": "author"
					},
					{
						"firstName": "Donald",
						"lastName": "Baumer",
						"creatorType": "editor"
					},
					{
						"firstName": "David",
						"lastName": "Montero",
						"creatorType": "editor"
					},
					{
						"firstName": "Michael",
						"lastName": "Scanlon",
						"creatorType": "editor"
					}
				],
				"date": "2006",
				"ISBN": "9781574734157",
				"abstractNote": "This paper presents experimental data on the processing of relative and adjunct clauses in Korean. Both types of clause contain null elements (gaps), although these gaps may possibly represent different types of empty categories (deletion under movement in relative clauses, null pronominals in adjunct clauses). The experimental evidence shows that even in head-final languages like Korean, subject gaps of all types enjoy a processing advantage over object gaps, thus adding support to the idea that the subject advantage is a universal principle of grammar. Different explanatory mechanisms have been proposed to account for this subject advantage. The Korean data support structurally-based accounts rather than accounts that rely on the linear distance between the filler and the gap in a long-distance dependency. Theoretically, these new data shed additional light on—but do not entirely resolve—long-standing controversies over whether Korean relative clauses represent English-like operator-movement structures or structures with an unselectively bound null pronominal.",
				"conferenceName": "25th West Coast Conference on Formal Linguistics",
				"libraryCatalog": "www.lingref.com",
				"pages": "1-14",
				"place": "Somerville, MA",
				"proceedingsTitle": "Proceedings of the 25th West Coast Conference on Formal Linguistics",
				"publisher": "Cascadilla Proceedings Project",
				"url": "http://www.lingref.com/cpp/wccfl/25/abstract1429.html",
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
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.lingref.com/cpp/wccfl/25/index.html",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.lingref.com/cpp/acal/42/abstract2769.html",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "A Comparative Study of Topological Relation Markers in Two Gur Languages: Gurenɛ and Chakali",
				"creators": [
					{
						"firstName": "Jonathan Allen",
						"lastName": "Brindle",
						"creatorType": "author"
					},
					{
						"firstName": "Samuel Awinkene",
						"lastName": "Atintono",
						"creatorType": "author"
					},
					{
						"firstName": "Michael R.",
						"lastName": "Marlo",
						"creatorType": "editor"
					},
					{
						"firstName": "Nikki B.",
						"lastName": "Adams",
						"creatorType": "editor"
					},
					{
						"firstName": "Christopher R.",
						"lastName": "Green",
						"creatorType": "editor"
					},
					{
						"firstName": "Michelle",
						"lastName": "Morrison",
						"creatorType": "editor"
					},
					{
						"firstName": "Tristan M.",
						"lastName": "Purvis",
						"creatorType": "editor"
					}
				],
				"date": "2012",
				"ISBN": "9781574734539",
				"abstractNote": "This paper explores from a comparative perspective the strategies employed for the coding of topological relations in two Gur languages, Gurenε and Chakali. It identifies the similarities and differences in the coding of semantic concepts that describe topological relations and examines the lexical semantics of locative predicate relations. The results of the study show that both languages use existential, postural or positional verbs to express topological relations, and that these verbs often combine with nominal postpositions. The paper is a contribution to the typological classification of locative predication proposed by Ameka and Levinson (2007), and to areal typology, as it concludes by comparing some of the findings with an analysis of Likpe (Ghana-Togo Mountain, Kwa (Ameka, 2007a)).",
				"conferenceName": "42nd Annual Conference on African Linguistics",
				"libraryCatalog": "www.lingref.com",
				"pages": "195-207",
				"place": "Somerville, MA",
				"proceedingsTitle": "Selected Proceedings of the 42nd Annual Conference on African Linguistics: African Languages in Context",
				"publisher": "Cascadilla Proceedings Project",
				"shortTitle": "A Comparative Study of Topological Relation Markers in Two Gur Languages",
				"url": "http://www.lingref.com/cpp/acal/42/abstract2769.html",
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
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.lingref.com/cpp/slrf/2011/abstract2914.html",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "Does Partial Radical Information Help in the Learning of Chinese Characters?",
				"creators": [
					{
						"firstName": "Jing",
						"lastName": "Wang",
						"creatorType": "author"
					},
					{
						"firstName": "Keiko",
						"lastName": "Koda",
						"creatorType": "author"
					},
					{
						"firstName": "Erik",
						"lastName": "Voss",
						"creatorType": "editor"
					},
					{
						"firstName": "Shu-Ju Diana",
						"lastName": "Tai",
						"creatorType": "editor"
					},
					{
						"firstName": "Zhi",
						"lastName": "Li",
						"creatorType": "editor"
					}
				],
				"date": "2013",
				"ISBN": "9781574734584",
				"abstractNote": "Whether and how partial radical information in different transparency levels helps in the acquisition of Chinese characters, as well as how contextual information interacts with semantic transparency in character meaning inference, are open questions and are explored in the present study. A character meaning inference task in isolation and a character meaning inference task in context were completed by 37 first-year students\nin the University of Pittsburgh Chinese program. Three kinds of characters (transparent, semitransparent, and single-unit characters without radicals) were chosen based on Shu et al.'s (2003) study, and two conditions (isolation and context) were designed. The results showed that in both conditions, learners achieved higher scores on transparent characters than on semi-transparent characters, and their performance was significantly better on compound characters (both transparent and semitransparent) than single-unit characters without radicals. Also, context impeded with learning semitransparent characters, but did not affect transparent and single-unit characters. The results suggest that partial radical information helps Chinese character learning, and that teaching compound characters componentially may be more effective than teaching them holistically.",
				"conferenceName": "2011 Second Language Research Forum",
				"libraryCatalog": "www.lingref.com",
				"pages": "162-172",
				"place": "Somerville, MA",
				"proceedingsTitle": "Selected Proceedings of the 2011 Second Language Research Forum: Converging Theory and Practice",
				"publisher": "Cascadilla Proceedings Project",
				"url": "http://www.lingref.com/cpp/slrf/2011/abstract2914.html",
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
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.lingref.com/cpp/slrf/2011/abstract2913.html",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "A Reexamination of Ultimate Attainment in L2 Phonology: Length of Immersion, Motivation, and Phonological Short-Term Memory",
				"creators": [
					{
						"firstName": "Charles",
						"lastName": "Nagle",
						"creatorType": "author"
					},
					{
						"firstName": "Erik",
						"lastName": "Voss",
						"creatorType": "editor"
					},
					{
						"firstName": "Shu-Ju Diana",
						"lastName": "Tai",
						"creatorType": "editor"
					},
					{
						"firstName": "Zhi",
						"lastName": "Li",
						"creatorType": "editor"
					}
				],
				"date": "2013",
				"ISBN": "9781574734584",
				"abstractNote": "The current study investigated phonological attainment among a sample of 34 English-speaking late-learners of L2 Spanish. Participants completed a language background questionnaire, motivation assessment, operation span task, and phonological short-term memory task, and recorded three speaking tasks. As a point of comparison, three native Spanish-speaking participants also recorded the speaking tasks. Four naïve L1 Spanish raters subsequently evaluated the speech clips. Regression analyses on the raters' scores revealed that length of immersion, motivation, and phonological short-term memory accounted for 70% of the variance in the sample. Furthermore, three learners received ratings that fell within the native range. Taken together, these findings suggest that immersion, motivation, and PSTM are critical factors that determine end-state phonological attainment for the learners in this study, as well as that late-learners appear to be capable of achieving near-native pronunciation in a foreign language.",
				"conferenceName": "2011 Second Language Research Forum",
				"libraryCatalog": "www.lingref.com",
				"pages": "148-161",
				"place": "Somerville, MA",
				"proceedingsTitle": "Selected Proceedings of the 2011 Second Language Research Forum: Converging Theory and Practice",
				"publisher": "Cascadilla Proceedings Project",
				"shortTitle": "A Reexamination of Ultimate Attainment in L2 Phonology",
				"url": "http://www.lingref.com/cpp/slrf/2011/abstract2913.html",
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
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
