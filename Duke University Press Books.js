{
	"translatorID": "4608f0e4-40a6-47ac-8467-1955eb8bd708",
	"label": "Duke University Press Books",
	"creator": "Sebastian Karcher",
	"target": "^https?://www\\.dukeupress\\.edu/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-10-05 02:33:49"
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


function detectWeb(doc, _url) {
	if (doc.querySelectorAll('div[itemtype="http://schema.org/Book"]').length) {
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
	var rows = doc.querySelectorAll('.book-info > a');
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

function getContributorRole(text) {
	if (text.includes("Editor")) {
		return "editor";
	}
	else if (text.includes("Contributor")) {
		return "contributor";
	}
	else return "author";
}
async function scrape(doc) {
	var item = new Zotero.Item("book");


	item.title = attr(doc, '#subject-title meta[itemprop="name"]', 'content');
	
	// don't break if DUP messes up the title metadata in schema
	// as they do here: https://www.dukeupress.edu/beyond-this-narrow-now
	if (!item.title) {
		let maintitle = text(doc, 'h1');
		let subtitle = text(doc, 'h2');
		let title = [maintitle, subtitle];
		item.title = title.filter(Boolean).join(": ");
	}

	var creators = doc.getElementsByClassName('author');

	for (let i = 0; i < creators.length; i++) {
		let creator = creators[i].textContent;
		let role = getContributorRole(creators[i].title);
		item.creators.push(ZU.cleanAuthor(creator, role));
	}
	
	item.date = attr(doc, '.container meta[itemprop="copyrightYear"]', 'content');
	item.numPages = attr(doc, '.container meta[itemprop="numberOfPages"]', 'content');
	item.ISBN = attr(doc, '.container meta[itemprop="isbn"]', 'content');
	item.abstractNote = text(doc, 'div[itemprop="description"]');
	item.series = text(doc, '#b-series-info>h3');
	item.publisher = "Duke University Press";
	item.place = "Durham, NC";

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
		"url": "https://www.dukeupress.edu/the-fixer",
		"items": [
			{
				"itemType": "book",
				"title": "The Fixer: Visa Lottery Chronicles",
				"creators": [
					{
						"firstName": "Charles",
						"lastName": "Piot",
						"creatorType": "author"
					},
					{
						"firstName": "Kodjo Nicolas",
						"lastName": "Batema",
						"creatorType": "contributor"
					}
				],
				"date": "2019",
				"ISBN": "9781478003045",
				"abstractNote": "In the West African nation of Togo, applying for the U.S. Diversity Visa Lottery is a national obsession, with hundreds of thousands of Togolese entering each year. From the street frenzy of the lottery sign-up period and the scramble to raise money for the embassy interview to the gamesmanship of those adding spouses and dependents to their dossiers, the application process is complicated, expensive, and unpredictable. In The Fixer Charles Piot follows Kodjo Nicolas Batema, a Togolese visa broker—known as a “fixer”—as he shepherds his clients through the application and interview process. Relaying the experiences of the fixer, his clients, and embassy officials, Piot captures the ever-evolving cat-and-mouse game between the embassy and the hopeful Togolese as well as the disappointments and successes of lottery winners in the United States. These detailed and compelling stories uniquely illustrate the desire and savviness of migrants as they work to find what they hope will be a better life.",
				"libraryCatalog": "Duke University Press Books",
				"numPages": "224",
				"place": "Durham, NC",
				"publisher": "Duke University Press",
				"series": "Theory in Forms",
				"shortTitle": "The Fixer",
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
		"url": "https://www.dukeupress.edu/all-about-your-eyes-second-edition",
		"items": [
			{
				"itemType": "book",
				"title": "All about Your Eyes, Second Edition, revised and updated",
				"creators": [
					{
						"firstName": "Sharon",
						"lastName": "Fekrat",
						"creatorType": "editor"
					},
					{
						"firstName": "Tanya S.",
						"lastName": "Glaser",
						"creatorType": "editor"
					},
					{
						"firstName": "Henry L.",
						"lastName": "Feng",
						"creatorType": "editor"
					}
				],
				"date": "2021",
				"ISBN": "9781478011606",
				"abstractNote": "A concise, easy-to-understand reference book, the revised and updated second edition of All about Your Eyes tells you what you need to know to care for your eyes and what to expect from your eye doctor. In this reliable guide, leading eye care experts: * explain eye anatomy and how healthy eyes work * describe various eye diseases, including pink eye, cataract, glaucoma, age-related macular degeneration, and diabetic retinopathy * provide up-to-date information on surgery For each eye problem, the authors describe in simple, straightforward language: * what it is * the symptoms * what, if anything, you can do to prevent it * when to call the doctor * diagnostic tests and treatment * the likelihood of recoveryAll about Your Eyes includes a glossary of technical terms and, following each entry, links to websites where further information may be found. Contributors. Natalie A. Afshari, MD, Rosanna P. Bahadur, MD, Paramjit K. Bhullar, MD, Faith A. Birnbaum, MD, Cassandra C. Brooks, MD, Pratap Challa, MD, Melissa Mei-Hsia Chan, MBBS, Ravi Chandrashekhar, MD, MSEE, Nathan Cheung, OD, FAAO Claudia S. Cohen, MD, Vincent A. Deramo, MD, Cathy DiBernardo, RN, Laura B. Enyedi, MD, Sharon Fekrat, MD, Henry L. Feng, MD, Brenton D. Finklea, MD, Anna Ginter, MD, Tanya S. Glaser, MD, Michelle Sy Go, MD, MS, Mark Goerlitz-Jessen, MD, Herb Greenman, MD, Abhilash Guduru, MD, Preeya Gupta, MD, Renee Halberg, MSW, LCSW, S. Tammy Hsu, MD, Alessandro Iannaccone, MD, MS, FARVO, Charlene L. James, OD, Kim Jiramongkolchai, MD, Michael P. Kelly, FOPS, Muge R. Kesen, MD, Kirin Khan, MD, Wajiha Jurdi Kheir, MD, Jane S. Kim, MD, Jennifer Lira, MD, Katy C. Liu, MD, PhD, Ramiro S. Maldonado, MD, Ankur Mehra, MD, Priyatham S. Mettu, MD, Prithvi Mruthyunjaya, MD, MHS, Nisha Mukherjee, MD, Kenneth Neufeld, MD, Kristen Peterson, MD, James H. Powers, MD, S. Grace Prakalapakorn, MD, MPH, Michael Quist, MD, Leon Rafailov, MD, Roshni Ranjit-Reeves, MD, Nikolas Raufi, MD, William Raynor, BS, Cason Robbins, BS, Ananth Sastry, MD, Dianna L. Seldomridge, MD, MBA, Terry Semchyshyn, MD, Ann Shue, MD, Julia Song, MD, Brian Stagg, MD, Christopher Sun, MBBS, Anthony Therattil, BS, Daniel S.W. Ting, MBBS, Fay Jobe Tripp, MS, OTR/L, CLVT, CDRS, Obinna Umunakwe, MD, PhD, Lejla Vajzovic, MD, Susan M. Wakil, MD, C. Ellis Wisely, MD, MBA, Julie A. Woodward, MD",
				"libraryCatalog": "Duke University Press Books",
				"numPages": "256",
				"place": "Durham, NC",
				"publisher": "Duke University Press",
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
		"url": "https://www.dukeupress.edu/books/browse?sortid=7",
		"items": "multiple"
	}
]
/** END TEST CASES **/
