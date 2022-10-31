{
	"translatorID": "1ffa5e32-a985-49cc-8c74-8b638d2c4142",
	"label": "Harvard University Press Books",
	"creator": "Sebastian Karcher",
	"target": "https://www.hup.harvard.edu/(catalog.php|results-list.php)",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-10-06 14:39:23"
}

/*
    ***** BEGIN LICENSE BLOCK *****

    Copyright © 2022 Sebastian Karcher

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
	if (/[?&]isbn=/.test(url)) {
		return 'book';
	}
	else if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.resultsContainer .title>a');
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

async function doWeb(doc, url) {
	if (detectWeb(doc, url) == 'multiple') {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (items) {
			await Promise.all(
				Object.keys(items)
					.map(url => requestDocument(url).then(scrape))
			);
		}
	}
	else {
		await scrape(doc);
	}
}

async function scrape(doc) {
	var item = new Zotero.Item("book");
	let mainTitle = text(doc, '#mainTop h1');
	let subTitle = text(doc, '#mainTop h2');
	item.title = [mainTitle, subTitle].join(": ");

	var creators = doc.querySelectorAll('#authorList>h3');
	var role = "author";// default

	for (var i = 0; i < creators.length; i++) {
		var creator = creators[i].textContent;
		if (creator.includes("Edited by")) {
			role = "editor";
			creator = creator.replace("Edited by ", "");
		}
		item.creators.push(ZU.cleanAuthor(creator, role));
	}
	
	var date = ZU.xpathText(doc, '//div[contains(@class, "product_sidebar")]/p[starts-with(., "Published:")]');
	if (date) {
		item.date = ZU.strToISO(date);
	}
	
	let isbn = text(doc, '#bookMeta p.isbn');
	if (isbn) {
		item.ISBN = ZU.cleanISBN(isbn);
	}
	
	var details = doc.getElementById('bookDetails').innerHTML;
	if (details) {
		let pages = details.match(/(\d+) pages/i);
		if (pages) {
			item.numPages = pages[1];
		}
		let publisher = details.match(/>([^<]+?Press)/);
		if (publisher) {
			item.publisher = publisher[1];
		}
	}
	
	let series = text(doc, 'h5.series');
	if (series) {
		item.series = ZU.capitalizeTitle(series, true);
	}

	var meta = text(doc, '#bookMeta');
	if (meta) {
		let date = meta.match(/Publication Date:\s*(.+)/);
		if (date) {
			item.date = ZU.strToISO(date[1]);
		}
	}
	if (!item.publisher) {
		item.publisher = "Harvard University Press";
	}
	item.place = "Cambridge, MA";

	// remove the pull quotes at the top of the "abstract"
	var abstract = doc.querySelectorAll('#mainBottom #content>p:not(.keynote)');

	if (abstract) {
		let fullAbstract = [];
		for (let paragraph of abstract) {
			fullAbstract.push(paragraph.textContent);
		}
		item.abstractNote = fullAbstract.join("\n");
	}
	
	item.attachments.push({
		title: "Snapshot",
		document: doc
	});
		
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.hup.harvard.edu/catalog.php?isbn=9780674276611",
		"items": [
			{
				"itemType": "book",
				"title": "Getting to Diversity: What Works and What Doesn’t",
				"creators": [
					{
						"firstName": "Frank",
						"lastName": "Dobbin",
						"creatorType": "author"
					},
					{
						"firstName": "Alexandra",
						"lastName": "Kalev",
						"creatorType": "author"
					}
				],
				"date": "2022-09-13",
				"ISBN": "9780674276611",
				"abstractNote": "Every year America becomes more diverse, but change in the makeup of the management ranks has stalled. The problem has become an urgent matter of national debate. How do we fix it? Bestselling books preach moral reformation. Employers, however well intentioned, follow guesswork and whatever their peers happen to be doing. Arguing that it’s time to focus on changing systems rather than individuals, two of the world’s leading experts on workplace diversity show us a better way in the first comprehensive, data-driven analysis of what succeeds and what fails. The surprising results will change how America works.\nFrank Dobbin and Alexandra Kalev draw on more than thirty years of data from eight hundred companies as well as in-depth interviews with managers. The research shows just how little companies gain from standard practice: sending managers to diversity training to reveal their biases, then following up with hiring and promotion rules, and sanctions, to shape their behavior. Almost nothing changes. It’s time, Dobbin and Kalev argue, to focus on changing the management systems that make it hard for women and people of color to succeed. They show us how the best firms are pioneering new recruitment, mentoring, and skill training systems, and implementing strategies for mixing segregated work groups to increase diversity. They explain what a difference ambitious work–life programs make. And they argue that as firms adopt new systems, the key to making them work is to make them accessible to all—not just the favored few.\nPowerful, authoritative, and driven by a commitment to change, Getting to Diversity is the book we need now to address constructively one of the most fraught challenges in American life.",
				"libraryCatalog": "Harvard University Press Books",
				"numPages": "272",
				"place": "Cambridge, MA",
				"publisher": "Belknap Press",
				"shortTitle": "Getting to Diversity",
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
		"url": "https://www.hup.harvard.edu/catalog.php?isbn=9780674271821",
		"items": [
			{
				"itemType": "book",
				"title": "The Critical Writings of Oscar Wilde: An Annotated Selection",
				"creators": [
					{
						"firstName": "Oscar",
						"lastName": "Wilde",
						"creatorType": "author"
					},
					{
						"firstName": "Nicholas",
						"lastName": "Frankel",
						"creatorType": "editor"
					}
				],
				"date": "2022-12-13",
				"ISBN": "9780674271821",
				"abstractNote": "Though he is primarily acclaimed today for his drama and fiction, Oscar Wilde was also one of the greatest critics of his generation. Annotated and introduced by Wilde scholar Nicholas Frankel, this unique collection reveals Wilde as a writer who transformed criticism, giving the genre new purpose, injecting it with style and wit, and reorienting it toward the kinds of social concerns that still occupy our most engaging cultural commentators.\n“Criticism is itself an art,” Wilde wrote, and The Critical Writings of Oscar Wilde demonstrates this philosophy in action. Readers will encounter some of Wilde’s most quotable writings, such as “The Decay of Lying,” which famously avers that “Life imitates Art far more than Art imitates life.” But Frankel also includes lesser-known works like “The American Invasion,” a witty celebration of modern femininity, and “Aristotle at Afternoon Tea,” in which Wilde deftly (and anonymously) carves up his former tutor’s own criticism. The essays, reviews, dialogues, and epigrams collected here cover an astonishing range of themes: literature, of course, but also fashion, politics, masculinity, cuisine, courtship, marriage—the breadth of Victorian England. If today’s critics address such topics as a matter of course, it is because Wilde showed that they could. It is hard to imagine a twenty-first-century criticism without him.",
				"libraryCatalog": "Harvard University Press Books",
				"numPages": "400",
				"place": "Cambridge, MA",
				"publisher": "Harvard University Press",
				"shortTitle": "The Critical Writings of Oscar Wilde",
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
		"url": "https://www.hup.harvard.edu/results-list.php?hcid=43",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.hup.harvard.edu/results-list.php?search=labor&submit=Search",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.hup.harvard.edu/catalog.php?isbn=9780674975736",
		"items": [
			{
				"itemType": "book",
				"title": "The Singer of Tales: Third Edition",
				"creators": [
					{
						"firstName": "Albert B.",
						"lastName": "Lord",
						"creatorType": "author"
					},
					{
						"firstName": "David F.",
						"lastName": "Elmer",
						"creatorType": "editor"
					}
				],
				"date": "2019-04-02",
				"ISBN": "9780674975736",
				"abstractNote": "First published in 1960, Albert B. Lord’s The Singer of Tales remains the fundamental study of the distinctive techniques and aesthetics of oral epic poetry. Based upon pathbreaking fieldwork conducted in the 1930s and 1950s among oral epic singers of Bosnia, Croatia, and Serbia, Lord analyzes in impressive detail the techniques of oral composition in performance. He explores the consequences of this analysis for the interpretation of numerous works of traditional verbal art, including—in addition to South Slavic epic songs—the Homeric Iliad and Odyssey, Beowulf, the Chanson de Roland, and the Byzantine epic Digenis Akritas. A cardinal text for the study of oral traditions, The Singer of Tales also represents an exemplary use of the comparative method in literary criticism.\nThis third edition offers a corrected text of the second edition and is supplemented by an open-access website (in lieu of the second edition’s CD-ROM), providing all the recordings discussed by Lord, as well as a variety of other multimedia materials.",
				"libraryCatalog": "Harvard University Press Books",
				"numPages": "350",
				"place": "Cambridge, MA",
				"publisher": "Harvard University Press",
				"series": "Hellenic Studies Series",
				"shortTitle": "The Singer of Tales",
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
	}
]
/** END TEST CASES **/
