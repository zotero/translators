{
	"translatorID": "2f22b2a9-91c4-4555-8480-792b6551a381",
	"label": "University of Chicago Press Books",
	"creator": "Sebastian Karcher",
	"target": "^https?://(www\\.)?press\\.uchicago\\.edu/(ucp/books/|press/search.html)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-12-07 08:14:56"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2021 Sebastian Karcher
	
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


function detectWeb(doc, url) {
	if (url.includes('/book/')) {
		return "book";
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.resultsurl > a[href*="/book/"]');
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(row.textContent);
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
	// translator.setDocument(doc);
	
	translator.setHandler('itemDone', function (obj, item) {
		var authors = doc.querySelectorAll('.purchase-item-detail-title-desktop .author>a');
		var authorString = text(doc, '.author-info');
		var type = "author";

		if (authorString.includes("Edited by")) {
			type = "editor";
		}
		
		for (let author of authors) {
			item.creators.push(ZU.cleanAuthor(author.textContent, type));
		}
		
		// Some authors aren't hyperlinked
		if (authorString.includes(",")) {
			// grab the text-only content of the author string
			var moreAuthors = ZU.xpathText(doc, '//div[@class="purchase-item-detail-title-desktop"]//p[contains(@class, "author")]/text()');
			// clean it.
			moreAuthors = moreAuthors.replace(/^[^,]*[,\s]*/, "").replace(/^and/, "");
			moreAuthors = moreAuthors.split(/,\s(?:and )?|\sand\s/);
			for (let author of moreAuthors) {
				item.creators.push(ZU.cleanAuthor(author, type));
			}
		}
		var editors = text(doc, '.editor');
		if (editors) {
			var editorType = "editor";
	
			if (editors.includes("Translated by")) {
				editorType = "translator";
			}
			editors = editors.replace(/.+?\sby\s/, "");
			editors = editors.split(/,\s(?:and )?|\sand\s/);
			for (let editor of editors) {
				item.creators.push(ZU.cleanAuthor(editor, editorType));
			}
		}

		// title in metadata is without subtitle
		var subtitle = text(doc, '.purchase-item-detail-title-desktop h2');
		
		if (!item.title.includes(subtitle)) {
			item.title += ": " + subtitle;
		}
		var details = text(doc, '.purchase-item-detail-details');
		
		if (details) {
			let numPages = details.match(/(\d+)\s*pages/);
			if (numPages) item.numPages = numPages[1];
		}
		
		var publisher = text(doc, '.purchase-item-detail-distributor a');
		
		if (publisher) {
			item.publisher = publisher;
		}
		else {
			item.publisher = "University of Chicago Press";
			item.place = "Chicago, IL";
		}
		
		item.series = text(doc, '.series-name');

		item.date = ZU.strToISO(text(doc, '.purchase-format-pubdate'));
		item.ISBN = ZU.cleanISBN(text(doc, '.purchase-format-isbn'));
		item.libraryCatalog = "University of Chicago Press";
		item.complete();
	});

	translator.getTranslatorObject(function (trans) {
		trans.addCustomFields({
		});
		trans.doWeb(doc, url);
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://press.uchicago.edu/ucp/books/book/chicago/E/bo3684144.html",
		"items": [
			{
				"itemType": "book",
				"title": "English Verb Classes and Alternations: A Preliminary Investigation",
				"creators": [
					{
						"firstName": "Beth",
						"lastName": "Levin",
						"creatorType": "author"
					}
				],
				"abstractNote": "In this rich reference work, Beth Levin classifies over 3,000 English verbs according to shared meaning and behavior. Levin starts with the hypothesis that a verb’s meaning influences its syntactic behavior and develops it into a powerful tool for studying the English verb lexicon. She shows how identifying verbs with similar syntactic behavior provides an effective means of distinguishing semantically coherent verb classes, and isolates these classes by examining verb behavior with respect to a wide range of syntactic alternations that reflect verb meaning. The first part of the book sets out alternate ways in which verbs can express their arguments. The second presents classes of verbs that share a kernel of meaning and explores in detail the behavior of each class, drawing on the alternations in the first part. Levin’s discussion of each class and alternation includes lists of relevant verbs, illustrative examples, comments on noteworthy properties, and bibliographic references. The result is an original, systematic picture of the organization of the verb inventory. Easy to use, English Verb Classes and Alternations sets the stage for further explorations of the interface between lexical semantics and syntax. It will prove indispensable for theoretical and computational linguists, psycholinguists, cognitive scientists, lexicographers, and teachers of English as a second language.",
				"language": "en",
				"libraryCatalog": "University of Chicago Press",
				"numPages": "366",
				"place": "Chicago, IL",
				"publisher": "University of Chicago Press",
				"shortTitle": "English Verb Classes and Alternations",
				"url": "https://press.uchicago.edu/ucp/books/book/chicago/E/bo3684144.html",
				"attachments": [
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
		"url": "https://press.uchicago.edu/ucp/books/book/distributed/N/bo28224328.html",
		"items": [
			{
				"itemType": "book",
				"title": "Not for Patching: A Strategic Welfare Review",
				"creators": [
					{
						"firstName": "Frank",
						"lastName": "Field",
						"creatorType": "author"
					},
					{
						"firstName": "Andrew",
						"lastName": "Forsey",
						"creatorType": "author"
					}
				],
				"abstractNote": "In his famous report of 1942, the economist and social reformer William Beveridge wrote that World War II was a “revolutionary moment in the world’s history” and so a time “for revolutions, not for patching.” The Beveridge Report outlined the welfare state that Atlee’s government would go on to implement after 1946, instituting, for the first time, a national system of benefits to protect all from “the cradle to the grave.” Its crowning glory was the National Health Service, established in 1948, which provided free medical care for all at the point of delivery. Since then, the welfare system has been patched, beset by muddled thinking and short-termism. The British government spends more than £171 billion every year on welfare—and yet, since the Beveridge Report, there has been no strategic review of the system, compared to other areas of government and public policy, which have been subject to frequent strategic reviews. Reform of the welfare system need not mean dismantlement, Frank Field and Andrew Forsey argue here, but serious questions nonetheless must be asked about how the welfare state as we understand it can remain sustainable as the twenty-first century progresses.",
				"language": "en",
				"libraryCatalog": "University of Chicago Press",
				"numPages": "120",
				"publisher": "Haus Publishing",
				"series": "Haus Curiosities",
				"shortTitle": "Not for Patching",
				"url": "https://press.uchicago.edu/ucp/books/book/distributed/N/bo28224328.html",
				"attachments": [
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
		"url": "https://press.uchicago.edu/ucp/books/book/chicago/C/bo3624192.html",
		"items": [
			{
				"itemType": "book",
				"title": "Civil Society and the Political Imagination in Africa: Critical Perspectives",
				"creators": [
					{
						"firstName": "John L.",
						"lastName": "Comaroff",
						"creatorType": "editor"
					},
					{
						"firstName": "Jean",
						"lastName": "Comaroff",
						"creatorType": "editor"
					}
				],
				"abstractNote": "The essays in this important new collection explore the diverse, unexpected, and controversial ways in which the idea of civil society has recently entered into populist politics and public debate throughout Africa. In a substantial introduction, anthropologists Jean and John Comaroff offer a critical theoretical analysis of the nature and deployment of the concept—and the current debates surrounding it. Building on this framework, the contributors investigate the \"problem\" of civil society across their regions of expertise, which cover the continent. Drawing creatively on one another’s work, they examine the impact of colonial ideology, postcoloniality, and development practice on discourses of civility, the workings of everyday politics, the construction of new modes of selfhood, and the pursuit of moral community. Incisive and original, the book shows how struggles over civil society in Africa reveal much about larger historical forces in the post-Cold War era. It also makes a strong case for the contribution of historical anthropology to contemporary discourses on the rise of a \"new world order.\"",
				"language": "en",
				"libraryCatalog": "University of Chicago Press",
				"numPages": "329",
				"place": "Chicago, IL",
				"publisher": "University of Chicago Press",
				"shortTitle": "Civil Society and the Political Imagination in Africa",
				"url": "https://press.uchicago.edu/ucp/books/book/chicago/C/bo3624192.html",
				"attachments": [
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
		"url": "https://press.uchicago.edu/ucp/books/book/distributed/S/bo70004539.html",
		"items": [
			{
				"itemType": "book",
				"title": "Speaking for Ourselves: Environmental Justice in Canada",
				"creators": [
					{
						"firstName": "Julian",
						"lastName": "Agyeman",
						"creatorType": "editor"
					},
					{
						"firstName": "Peter",
						"lastName": "Cole",
						"creatorType": "editor"
					},
					{
						"firstName": "Randolph",
						"lastName": "Haluza-DeLay",
						"creatorType": "editor"
					},
					{
						"firstName": "Pat",
						"lastName": "O’Riley",
						"creatorType": "editor"
					}
				],
				"abstractNote": "The concept of environmental justice has offered a new direction for social movements and public policy in recent decades, and researchers worldwide now position social equity as a prerequisite for sustainability. Yet the relationship between social equity and environmental sustainability has been little studied in Canada. Speaking for Ourselves draws together Aboriginal and non-Aboriginal scholars and activists who bring equity issues to the forefront by considering environmental justice from multiple perspectives and in specifically Canadian contexts.",
				"language": "en",
				"libraryCatalog": "University of Chicago Press",
				"numPages": "306",
				"publisher": "University of British Columbia Press",
				"shortTitle": "Speaking for Ourselves",
				"url": "https://press.uchicago.edu/ucp/books/book/distributed/S/bo70004539.html",
				"attachments": [
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
		"url": "https://press.uchicago.edu/ucp/books/book/distributed/C/bo38131006.html",
		"items": [
			{
				"itemType": "book",
				"title": "Capitalism and Labor: Towards Critical Perspectives",
				"creators": [
					{
						"firstName": "Klaus",
						"lastName": "Dörre",
						"creatorType": "editor"
					},
					{
						"firstName": "Nicole",
						"lastName": "Mayer-Ahuja",
						"creatorType": "editor"
					},
					{
						"firstName": "Dieter",
						"lastName": "Sauer",
						"creatorType": "editor"
					},
					{
						"firstName": "Volker",
						"lastName": "Wittke",
						"creatorType": "editor"
					},
					{
						"firstName": "Julian",
						"lastName": "Müller",
						"creatorType": "translator"
					}
				],
				"abstractNote": "Capitalism’s presence in nearly all areas of contemporary life is widely-known and unshakeable. There is perhaps nowhere more true than in the workplace. Why then, ask the authors of this collection, have the broad concepts of work and capitalism become a progressively smaller focus in sociology in recent decades, shunted to the sidelines in favor of more granular subjects in labor studies? Capitalism and Labor calls for sociologists to refocus their research on the unavoidable realities of the capitalist system, particularly in the wake of the global financial and economic unrest of the past decade. Although they provide no easy solutions, the essays in this book will serve as a starting point for sociologists to renew their focus on labor and its inextricable relationship to capitalism in the twenty-first century.",
				"language": "en",
				"libraryCatalog": "University of Chicago Press",
				"numPages": "434",
				"publisher": "Campus Verlag",
				"series": "International Labour Studies",
				"shortTitle": "Capitalism and Labor",
				"url": "https://press.uchicago.edu/ucp/books/book/distributed/C/bo38131006.html",
				"attachments": [
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
		"url": "https://press.uchicago.edu/press/search.html?clause=labor&division=bo",
		"items": "multiple"
	}
]
/** END TEST CASES **/
