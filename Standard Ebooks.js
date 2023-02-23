{
	"translatorID": "cc27d642-eab0-4c85-aba8-7a01a9b4e779",
	"label": "Standard Ebooks",
	"creator": "Brendan O'Connell",
	"target": "^https?://standardebooks\\.org/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-02-23 08:52:15"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2023 Brendan O'Connell

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
	// if a book is found, return book
	if (doc.querySelectorAll('meta[content="book"]').length) {
		return 'book';
	}
	// run getSearchResults function. If it finds an array of rows, will return true
	// and this else if will return multiple.
	else if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

// for multiple results
function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	// create an array
	var rows = doc.querySelectorAll('li[typeof="schema:Book"]')
	// loop through the array, just scraping URL and title. title is displayed to the user in
	// Zotero.selectItems popup, URL is sent to scrape function
	for (let row of rows) {
		let href = new URL(row.getAttribute("about"), "https://www.standardebooks.org/").toString();
		// innerText contains title and author, separated by \n. Delete the author and just display
		// title to user.
		let title = text(row, 'a[property="schema:url"]);
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
		await scrape(doc, url);
	}
}

async function scrape(doc) {
	var item = new Zotero.Item("book");

	// get item title
	item.title = text(doc, 'h1[property="schema:name"]');

	// put all authors in an array called creators
	var creators = doc.querySelectorAll('a[property="schema:author"]');

	// for loop based on number of creators, in order to add all authors to item
	for (let creatorElem of creators) {
		// load variable capsCreator with all-caps creator from innerText
		let creator = creatorElem.textContent;
		// remove all-caps and replace with standard capitalization
		// documentation on capitalizeName Zotero utility: https://github.com/zotero/utilities/blob/master/utilities.js
		let creator = Zotero.Utilities.capitalizeName(capsCreator);
		let role = "author";
		item.creators.push(ZU.cleanAuthor(creator, role));
	}

	// if a translator exists, add them to item
	if (doc.querySelector('div[property="schema:translator"]')) {
		let translator = attr(doc, 'div[property="schema:translator"] > meta[property="schema:name"]', 'content');
		let role = "translator";
		item.creators.push(ZU.cleanAuthor(translator, role));
	}

	// Sometimes abstractNote accidentally scrapes a promotional message,
	// "We rely on your support ...", which is displayed sometimes to user.
	// By looping over just the paragraphs within the description, we avoid
	// adding promo message to abstractNote.
	var abstractParagraphs = doc.querySelectorAll('section[id="description"] > p');
	var finalAbstract = '';
	for (let j = 0; j < abstractParagraphs.length; j++) {
		let abstractParagraph = abstractParagraphs[j].innerText + ' ';
		finalAbstract += abstractParagraph;
	}
	item.abstractNote = finalAbstract;

	item.publisher = "Standard Ebooks";

	// I've chosen to include the date of the last edit to the ebook as its publication date,
	// rather than the original publication date of the digitized public domain book.
	// Although these are public domain ebooks, Standard ebooks is making typographical changes,
	// which could be considered altering them from their form on Project Gutenberg,
	// and thus constitute a new "publication".
	item.date = attr(doc, 'meta[property="schema:dateModified"]', 'content');
	item.url = doc.querySelectorAll('meta[property="og:url"]')[0].content;
	// all items have the same rights statement
	item.rights = "This ebook is only thought to be free of copyright restrictions in the United States. It may still be under copyright in other countries. If you’re not located in the United States, you must check your local laws to verify that the contents of this ebook are free of copyright restrictions in the country you’re located in before downloading or using this ebook.";

	// Full text is available at a consistent URL, /text/single-page
	// Attach this, rather than the catalog page.
	var fullText = item.url + "/text/single-page"
	item.attachments.push({
		title: "Full Text",
		url: fullText,
		mimeType: 'text/html',
		snapshot: true
	});
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://standardebooks.org/ebooks/charles-dickens/dombey-and-son",
		"items": [
			{
				"itemType": "book",
				"title": "Dombey and Son",
				"creators": [
					{
						"firstName": "Charles",
						"lastName": "Dickens",
						"creatorType": "author"
					}
				],
				"date": "2023-02-14",
				"abstractNote": "The fictional Dombey and Son is a prominent mercantile “house” in England, and as Dombey and Son the novel opens, the third generation “and Son” has just been born. For Paul Dombey, the proud second “and Son” to graduate to “Dombey,” this moment has been the focus of his life to this point. So much so that he barely knows his six-year-old daughter Florence exists. The impact of that father’s overbearing disposition on the one hand and indifference (and worse) on the other is the subject of the rest of the novel. Paul’s only focus is on preparing the junior Paul to be “and Son,” and those preparations have no room for Florence. As she makes her way to adulthood, she encounters caregivers good and bad, and adventures large and small, all while striving to find a place in her father’s heart. Dombey and Son is a novel about the destructive nature of pride and arrogance, but it also has plenty to say about the essential qualities of motherhood and money. It would not be Dickens if there were not a plethora of characters of all stripes, stations, and personalities, each of whom leave an indelible impression on both the page and the mind.",
				"libraryCatalog": "Standard Ebooks",
				"publisher": "Standard Ebooks",
				"rights": "This ebook is only thought to be free of copyright restrictions in the United States. It may still be under copyright in other countries. If you’re not located in the United States, you must check your local laws to verify that the contents of this ebook are free of copyright restrictions in the country you’re located in before downloading or using this ebook.",
				"url": "https://standardebooks.org/ebooks/charles-dickens/dombey-and-son",
				"attachments": [
					{
						"title": "Full Text",
						"mimeType": "text/html",
						"snapshot": true
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
		"url": "https://standardebooks.org/ebooks/frederic-mistral/mireio/harriet-waters-preston",
		"items": [
			{
				"itemType": "book",
				"title": "Mirèio",
				"creators": [
					{
						"firstName": "Frédéric",
						"lastName": "Mistral",
						"creatorType": "author"
					},
					{
						"firstName": "Harriet Waters",
						"lastName": "Preston",
						"creatorType": "translator"
					}
				],
				"date": "2023-01-20",
				"abstractNote": "Published in 1859 to great fanfare from French literary society, Mirèio was the first of four long narrative poems written by the French author Frédéric Mistral. Composed in Occitan, a regional language spoken in southern France, Mirèio arose out of the milieu of the Félibrige, a cultural movement centered around Mistral and his compatriots who championed the use of the Occitan language. Rich with references to local Provençal culture and geography, Mirèio recounts the joys and sorrows of two young lovers: the titular Mirèio, daughter of a rich farmer, and Vincen, a poor basket weaver. Though the two fall madly in love, they find themselves separated by social class and the disapproving attitude of Mirèio’s parents. In part thanks to Mirèio, Mistral went on to win the 1904 Nobel Prize in Literature, celebrated by the Nobel Committee for his poetry and his work as a Provençal philologist. Mirèio was widely translated, and was also adapted into the French-language opera Mireille by Charles Gounod. Mirèio remains a celebrated depiction of Provençal culture to this day. This Standard Ebooks edition of Mirèio augments Harriet Waters Preston’s unannotated 1890 translation with the annotations from her first translation published in 1872.",
				"libraryCatalog": "Standard Ebooks",
				"publisher": "Standard Ebooks",
				"rights": "This ebook is only thought to be free of copyright restrictions in the United States. It may still be under copyright in other countries. If you’re not located in the United States, you must check your local laws to verify that the contents of this ebook are free of copyright restrictions in the country you’re located in before downloading or using this ebook.",
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
		"url": "https://standardebooks.org/ebooks?tags%5B%5D=autobiography&query=&sort=newest&view=grid&per-page=12",
		"items": "multiple"
	}
]
/** END TEST CASES **/
