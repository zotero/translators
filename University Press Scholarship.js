{
	"translatorID": "f098a2db-6bfc-49ef-a6d7-9fc84f3c868c",
	"label": "University Press Scholarship",
	"creator": "Abe Jellinek",
	"target": "^https?://[^/]+\\.universitypressscholarship\\.com/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-07-06 21:55:30"
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


function detectWeb(doc, url) {
	if (doc.querySelector('.cite a')) {
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
	var rows = doc.querySelectorAll('h2.itemTitle > a');
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
			if (items) scrape(Object.keys(items).map(getDocumentURI));
		});
	}
	else {
		scrape([getDocumentURI(url)]);
	}
}

function scrape(documentURIs) {
	ZU.doPost(
		'/rest/citation/export',
		JSON.stringify({
			citationExports: documentURIs.map(uri => ({
				citationId: null,
				documentUri: uri
			})),
			format: 'ris'
		}),
		function (text) {
			var translator = Zotero.loadTranslator("import");
			// RIS
			translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
			translator.setString(text);
			translator.setHandler("itemDone", function (obj, item) {
				item.tags = item.tags.filter(tag => tag != 'ER');
				item.complete();
			});
			translator.translate();
		},
		{
			'Content-Type': 'application/json'
		}
	);
}

function getDocumentURI(url) {
	if (!url.includes('/view')) {
		return false;
	}
	
	return url.replace(/[#?].*/, '').substring(url.indexOf('/view') + 5);
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://oxford.universitypressscholarship.com/view/10.1093/acprof:oso/9780199299591.001.0001/acprof-9780199299591",
		"items": [
			{
				"itemType": "book",
				"title": "The Absent-Minded Imperialists: Empire, Society, and Culture in Britain",
				"creators": [
					{
						"lastName": "Porter",
						"firstName": "Bernard",
						"creatorType": "author"
					}
				],
				"date": "2006",
				"ISBN": "9780199299591",
				"abstractNote": "The British empire was a huge enterprise. To foreigners, it more or less defined Britain in the 19th and early 20th centuries. Its repercussions in the wider world are still with us today. It also had a great impact on Britain herself: for example, on her economy, security, population, and eating habits. One might expect this to have been reflected in her society and culture. Indeed, this has now become the conventional wisdom: that Britain was steeped in imperialism domestically, which affected (or infected) almost everything Britons thought, felt, and did. This book examines this assumption critically against the broader background of contemporary British society. It argues that the empire had a far lower profile in Britain than it did abroad. Although Britain was an imperial nation in this period, she was never a genuine imperial society. As well as showing how this was possible, the book also discusses the implications of this attitude for Britain and her empire, and for the relationship between culture and imperialism more generally, bringing his study up to date by including the case of the present-day United States.",
				"extra": "DOI: 10.1093/acprof:oso/9780199299591.001.0001",
				"language": "eng",
				"libraryCatalog": "University Press Scholarship",
				"numPages": "512",
				"place": "Oxford",
				"publisher": "Oxford University Press",
				"shortTitle": "The Absent-Minded Imperialists",
				"url": "https://oxford.universitypressscholarship.com/10.1093/acprof:oso/9780199299591.001.0001/acprof-9780199299591",
				"attachments": [],
				"tags": [
					{
						"tag": "Britain"
					},
					{
						"tag": "culture"
					},
					{
						"tag": "diet"
					},
					{
						"tag": "economy"
					},
					{
						"tag": "imperialism"
					},
					{
						"tag": "perceptions"
					},
					{
						"tag": "population"
					},
					{
						"tag": "society"
					},
					{
						"tag": "spending"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://oxford.universitypressscholarship.com/search?siteToSearch=oso&q=test&searchBtn=Search&isQuickSearch=true",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://fordham.universitypressscholarship.com/view/10.5422/fordham/9780823288359.001.0001/upso-9780823288359",
		"items": [
			{
				"itemType": "book",
				"title": "Working Alternatives: American and Catholic Experiments in Work and Economy",
				"creators": [
					{
						"lastName": "Seitz",
						"firstName": "John C.",
						"creatorType": "editor"
					},
					{
						"lastName": "Firer Hinze",
						"firstName": "Christine",
						"creatorType": "editor"
					}
				],
				"date": "2020",
				"ISBN": "9780823288359",
				"abstractNote": "Popular interest in the kinds of conditions that make work productive, growing media attention to the grinding cycle of poverty, and the widening sense that consumption must become sustainable and just, all contribute to an atmosphere thirsty for humanistic economic analysis. This volume offers such analysis from a novel and generative diversity of vantage points, including religious and secular histories, theological ethics, and business management. In particular, Working Alternatives brings modern Roman Catholic forms of engaging with economic questions—embodied in the evolving set of documents that make up the area of “Catholic social thought”—into conversation with one another and with non-Catholic experiments in economic thought and practice. Clustered not by discipline but by their emphasis on either 1) new ways of seeing economic practice 2) new ways of valuing human activity, or 3) implementation of new ways of working, the volume’s essays facilitate the necessarily interdisciplinary thinking demanded by the complexities of economic sustainability and justice. Collectively, the works gathered here assert and test a challenging and far-reaching hypothesis: economic theories, systems, and practices—ways of conceiving, organizing and enacting work, management, supply, production, exchange, remuneration, wealth, and consumption—rely on basic, often unexamined, presumptions about human personhood, relations, and flourishing.",
				"extra": "DOI: 10.5422/fordham/9780823288359.001.0001",
				"language": "eng",
				"libraryCatalog": "University Press Scholarship",
				"numPages": "304",
				"publisher": "Fordham University Press",
				"shortTitle": "Working Alternatives",
				"url": "https://fordham.universitypressscholarship.com/10.5422/fordham/9780823288359.001.0001/upso-9780823288359",
				"attachments": [],
				"tags": [
					{
						"tag": "Catholic social teaching"
					},
					{
						"tag": "business"
					},
					{
						"tag": "ethics"
					},
					{
						"tag": "feminism"
					},
					{
						"tag": "history"
					},
					{
						"tag": "labor"
					},
					{
						"tag": "management"
					},
					{
						"tag": "religion"
					},
					{
						"tag": "sustainability"
					},
					{
						"tag": "theology"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://liverpool.universitypressscholarship.com/view/10.3828/liverpool/9781786941831.001.0001/upso-9781786941831",
		"items": [
			{
				"itemType": "book",
				"title": "Intimate Frontiers: A Literary Geography of the Amazon",
				"creators": [
					{
						"lastName": "Martínez-Pinzón",
						"firstName": "Felipe",
						"creatorType": "editor"
					},
					{
						"lastName": "Uriarte",
						"firstName": "Javier",
						"creatorType": "editor"
					}
				],
				"date": "2019",
				"ISBN": "9781786941831",
				"abstractNote": "The diverse approaches to the Amazon collected in this book focus on stories of intimate, quotidian, interpersonal experiences (as opposed to those that take place between companies and nations) that, in turn, have resisted or else have been ignored by larger historical designs. This is why we propose a literary geography of the Amazon. In this space made out of historias, we will show the always already crafted, and hence political, ways in which this region has been represented in more “scientific”, often nationalizing histories. This includes, of course, understanding the “gigantic” discourses on Amazonia as rooted––if rarely discussed––in different quotidian, everyday experiences of a more intimate nature. The intimate interactions between one human being and another, or between men and animals, plants, or the natural space more generally as we see it, are not, as one might expect, comforting. Instead they are often disquieting, uncanny, or downright violent. This book argues that the Amazon’s “gigantism” lays not in its natural resources or opportunities for economic exploit, but in the richness that inhabits its archive of historias in the form of songs, oral histories, images, material culture, and texts.",
				"extra": "DOI: 10.3828/liverpool/9781786941831.001.0001",
				"language": "eng",
				"libraryCatalog": "University Press Scholarship",
				"numPages": "288",
				"publisher": "Liverpool University Press",
				"series": "American Tropics Towards a Literary Geography LUP",
				"shortTitle": "Intimate Frontiers",
				"url": "https://liverpool.universitypressscholarship.com/10.3828/liverpool/9781786941831.001.0001/upso-9781786941831",
				"attachments": [],
				"tags": [
					{
						"tag": "Amazonia"
					},
					{
						"tag": "Archive of “historias”"
					},
					{
						"tag": "Interactions between men and nature"
					},
					{
						"tag": "Intimate or private encounters"
					},
					{
						"tag": "Literary Geography"
					},
					{
						"tag": "“Gigantic” discourses on Amazonia"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
