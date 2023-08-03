{
	"translatorID": "a354331-981b-43de-a61-bc26dd1be3a9",
	"label": "AMS MathSciNet (Legacy)",
	"creator": "Simon Kornblith, Sebastian Karcher",
	"target": "^https?://(mathscinet\\.)?ams\\.[^/]*/(mathscinet/2006/)?mathscinet(\\-getitem\\?|/search/(publications\\.html|publdoc\\.html))",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-07-06 17:03:34"
}


/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2015-2023 Simon Kornblith & Sebastian Karcher

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
	var itemType;
	if (getSearchResults(doc, true)) {
		return "multiple";
	}
	else if (ZU.xpathText(doc, '//div[@class="headlineMenu"]/*[last()-1]')) {
		itemType = ZU.xpathText(doc, '//div[@class="headlineMenu"]/*[last()-1]');
		switch (itemType.trim().toLowerCase()) {
			case 'article':
				return "journalArticle";
			case 'book':
				return "book";
			case 'chapter':
				return "bookSection";
		}
	}
	return false;
}


function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//div[@class="headlineText"]');
	for (var i = 0; i < rows.length; i++) {
		var href = ZU.xpathText(rows[i], './a[@class="mrnum"]/@href');
		var title = ZU.xpathText(rows[i], './span[@class="title"]');
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}


async function doWeb(doc, url) {
	if (detectWeb(doc, url) == 'multiple') {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (!items) return;
		for (let url of Object.keys(items)) {
			await scrape(await requestDocument(url));
		}
	}
	else {
		await scrape(doc, url);
	}
}


async function scrape(doc, url = doc.location.href) {
	var host = url.match(/^(.+)\/mathscinet/);
	var pub = host[0] + "/search/publications.html?fmt=bibtex";
	var MR = ZU.xpathText(doc, '//div[@id="content"]/div[@class="doc"]/div[@class="headline"]/strong[1]');
	pub += "&pg1=MR&s1=" + MR.replace(/^MR0*/, "");

	let text = await requestText(pub);
	var preRE = /<pre>\s*([\s\S]*?)\s*<\/pre>/g;
	var bibTeXString = "";
		
	var m;
	//eslint-disable-next-line no-cond-assign
	while (m = preRE.exec(text)) {
		bibTeXString += m[1] + '\n';
	}
		
	// import using BibTeX
	let translator = Zotero.loadTranslator("import");
	translator.setTranslator("9cb70025-a888-4a29-a210-93ec52da40d4");
	translator.setString(bibTeXString);
	translator.setHandler("itemDone", function (obj, item) {
		// Fix/fetch MR number
		var mrnumber;
		if (item.extra) {
			item.extra = item.extra.replace(/^MR:\s*(?:MR)?(\d+).*/gm,
				function (m, mr) {
					mrnumber = mr;
					return 'MR: ' + mr;
				});
		}
			
		if (mrnumber) {
			url = 'https://mathscinet.ams.org/mathscinet-getitem?mr=' + mrnumber;
		}
		item.attachments.push({ title: "MathSciNet Snapshot", document: doc });
		item.url = url;
		item.complete();
	});
	await translator.translate();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://mathscinet.ams.org/mathscinet/search/publications.html?pg4=AUCN&s4=Karcher&co4=AND&pg5=TI&s5=&co5=AND&pg6=PC&s6=&co6=AND&pg7=ALLF&s7=&co7=AND&Submit=Search&dr=all&yrop=eq&arg3=&yearRangeFirst=&yearRangeSecond=&pg8=ET&s8=All&review_format=html",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://mathscinet.ams.org/mathscinet/2006/mathscinet/search/publdoc.html?arg3=&co4=AND&co5=AND&co6=AND&co7=AND&dr=all&pg4=MR&pg5=TI&pg6=PC&pg7=ALLF&pg8=ET&r=1&review_format=html&s4=3004573",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Extrapolation of stable random fields",
				"creators": [
					{
						"firstName": "Wolfgang",
						"lastName": "Karcher",
						"creatorType": "author"
					},
					{
						"firstName": "Elena",
						"lastName": "Shmileva",
						"creatorType": "author"
					},
					{
						"firstName": "Evgeny",
						"lastName": "Spodarev",
						"creatorType": "author"
					}
				],
				"date": "2013",
				"DOI": "10.1016/j.jmva.2012.11.004",
				"ISSN": "0047-259X",
				"extra": "MR: 3004573",
				"itemID": "MR3004573",
				"journalAbbreviation": "J. Multivariate Anal.",
				"libraryCatalog": "AMS MathSciNet (Legacy)",
				"pages": "516–536",
				"publicationTitle": "Journal of Multivariate Analysis",
				"url": "https://mathscinet.ams.org/mathscinet-getitem?mr=3004573",
				"volume": "115",
				"attachments": [
					{
						"title": "MathSciNet Snapshot",
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
		"url": "https://mathscinet.ams.org/mathscinet/search/publications.html?pg1=ISSI&s1=308850",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://mathscinet.ams.org/mathscinet/2006/mathscinet/search/publdoc.html?arg3=&co4=AND&co5=AND&co6=AND&co7=AND&dr=all&pg4=MR&pg5=TI&pg6=PC&pg7=ALLF&pg8=ET&r=1&review_format=html&s4=2767535",
		"items": [
			{
				"itemType": "bookSection",
				"title": "On implementation of the Markov chain Monte Carlo stochastic approximation algorithm",
				"creators": [
					{
						"firstName": "Yihua",
						"lastName": "Jiang",
						"creatorType": "author"
					},
					{
						"firstName": "Peter",
						"lastName": "Karcher",
						"creatorType": "author"
					},
					{
						"firstName": "Yuedong",
						"lastName": "Wang",
						"creatorType": "author"
					}
				],
				"date": "2011",
				"bookTitle": "Advances in directional and linear statistics",
				"extra": "MR: 2767535\nDOI: 10.1007/978-3-7908-2628-9_7",
				"itemID": "MR2767535",
				"libraryCatalog": "AMS MathSciNet (Legacy)",
				"pages": "97–111",
				"publisher": "Physica-Verlag/Springer, Heidelberg",
				"url": "https://mathscinet.ams.org/mathscinet-getitem?mr=2767535",
				"attachments": [
					{
						"title": "MathSciNet Snapshot",
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
		"url": "https://mathscinet.ams.org/mathscinet/2006/mathscinet/search/publdoc.html?arg3=&co4=AND&co5=AND&co6=AND&co7=AND&dr=all&pg4=MR&pg5=TI&pg6=PC&pg7=ALLF&pg8=ET&r=1&review_format=html&s4=2663710",
		"items": [
			{
				"itemType": "book",
				"title": "Advances in directional and linear statistics",
				"creators": [
					{
						"firstName": "Martin T.",
						"lastName": "Wells",
						"creatorType": "editor"
					},
					{
						"firstName": "Ashis",
						"lastName": "SenGupta",
						"creatorType": "editor"
					}
				],
				"date": "2011",
				"ISBN": "9783790826272",
				"extra": "MR: 2663710\nDOI: 10.1007/978-3-7908-2628-9",
				"itemID": "MR2663710",
				"libraryCatalog": "AMS MathSciNet (Legacy)",
				"numPages": "xiv+321",
				"publisher": "Physica-Verlag/Springer, Heidelberg",
				"url": "https://mathscinet.ams.org/mathscinet-getitem?mr=2663710",
				"attachments": [
					{
						"title": "MathSciNet Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "<p>A Festschrift for Sreenivasa Rao Jammalamadaka</p>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://mathscinet.ams.org/mathscinet-getitem?mr=1346201",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Sommation des séries divergentes",
				"creators": [
					{
						"firstName": "Bernard",
						"lastName": "Malgrange",
						"creatorType": "author"
					}
				],
				"date": "1995",
				"ISSN": "0723-0869",
				"extra": "MR: 1346201",
				"issue": "2-3",
				"itemID": "MR1346201",
				"journalAbbreviation": "Exposition. Math.",
				"libraryCatalog": "AMS MathSciNet",
				"pages": "163–222",
				"publicationTitle": "Expositiones Mathematicae. International Journal",
				"url": "https://mathscinet.ams.org/mathscinet-getitem?mr=1346201",
				"volume": "13",
				"attachments": [
					{
						"title": "MathSciNet Snapshot"
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
