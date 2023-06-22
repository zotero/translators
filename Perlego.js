{
	"translatorID": "04ac108d-c467-46da-bcbe-9cd128ca4796",
	"label": "Perlego",
	"creator": "Alasdair Munday",
	"target": "perlego\\.com/book/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-06-22 23:13:26"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2022 YOUR_NAME <- TODO

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
	if (url.includes('/book/')){
	return "book"
  }
}

async function doWeb(doc, url) {
	// Main function for extracting metadata and saving to Zotero

  // Metadata extraction logic

  // Create a new Zotero item
  let newItem = new Zotero.Item('book');

  // Set metadata fields on the new item
  newItem.title = getTextByDataTestLocator("BookTitleAuthorComponent-title", doc);
  newItem.date = getTextByAdjacentDivText('Year',doc);
  newItem.publisher = getTextByAdjacentDivText('Publisher', doc);
  newItem.edition = getTextByAdjacentDivText('Edition', doc);
  newItem.url = url;
  newItem.ISBN = getIsbn(doc);

  var authors = getTextByDataTestLocator("BookTitleAuthorComponent-author",doc);
  authors.split(',').forEach(a => newItem.creators.push(Zotero.Utilities.cleanAuthor(a, 'author')))


  // Save the item to Zotero
  newItem.complete();

  // Export the item to Zotero
  Zotero.done();
}

// Helper functions (if needed)
function getTextByDataTestLocator(dataTestLocator, document) {
  // Find the element with the specified data-test-locator attribute
  const element = document.querySelector(`[data-test-locator="${dataTestLocator}"]`);

  // Check if the element is found
  if (element) {
	// Retrieve the text content of the element
	const text = element.textContent.trim();
	return text;
  } else {
	// Return null if the element is not found
	return null;
  }
}

function getTextByAdjacentDivText(divText, document) {
  // Find all div elements on the page
  const divs = document.querySelectorAll('div');

  // Iterate through each div
  for (const div of divs) {
	// Check if the div contains only the specified text
	if (div.textContent.trim() === divText) {
	  // Find the adjacent anchor tag
	  const anchor = div.nextElementSibling;

	  // Check if the anchor tag is found
	  if (anchor && anchor.tagName.toLowerCase() === 'a') {
		// Retrieve the text content of the anchor tag
		const text = anchor.textContent.trim();
		return text;
	  }
	}
  }

  // Return null if the div or anchor tag is not found
  return null;
}

function getIsbn(document) {
  // Find the div with the specified data-test-locator attribute
  const div = document.querySelector(`div[data-test-locator="more-wrapper"]`);

  // Check if the div is found
  if (div) {
	// Find the first child element of the div
	const firstChild = div.firstElementChild;

	// Check if the first child element is found
	if (firstChild) {
	  // Retrieve the text content of the first child element
	  const text = firstChild.textContent.trim();
	  return text;
	}
  }

  // Return null if the div or first child element is not found
  return null;
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.perlego.com/book/1431388/qualitative-research-practice-a-guide-for-social-science-students-and-researchers-pdf?queryID=8d25693afbbc254b9927e5d0f7dac19f&searchIndexType=books",
		"detectedItemType": "book",
		"items": [
			{
				"itemType": "book",
				"title": "Qualitative Research Practice",
				"creators": [
					{
						"firstName": "Jane",
						"lastName": "Ritchie",
						"creatorType": "author"
					},
					{
						"firstName": "Jane",
						"lastName": "Lewis",
						"creatorType": "author"
					},
					{
						"firstName": "Carol McNaughton",
						"lastName": "Nicholls",
						"creatorType": "author"
					},
					{
						"firstName": "Rachel",
						"lastName": "Ormston",
						"creatorType": "author"
					},
					{
						"firstName": "Jane",
						"lastName": "Ritchie",
						"creatorType": "author"
					},
					{
						"firstName": "Jane",
						"lastName": "Lewis",
						"creatorType": "author"
					},
					{
						"firstName": "Carol McNaughton",
						"lastName": "Nicholls",
						"creatorType": "author"
					},
					{
						"firstName": "Rachel",
						"lastName": "Ormston",
						"creatorType": "author"
					}
				],
				"date": "2013",
				"edition": "2",
				"libraryCatalog": "Perlego",
				"publisher": "SAGE Publications Ltd",
				"url": "https://www.perlego.com/book/1431388/qualitative-research-practice-a-guide-for-social-science-students-and-researchers-pdf?queryID=8d25693afbbc254b9927e5d0f7dac19f&searchIndexType=books",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.perlego.com/book/1431388/qualitative-research-practice-a-guide-for-social-science-students-and-researchers-pdf?queryID=8d25693afbbc254b9927e5d0f7dac19f&searchIndexType=books",
		"detectedItemType": "book",
		"items": [
			{
				"itemType": "book",
				"title": "Qualitative Research Practice",
				"creators": [
					{
						"firstName": "Jane",
						"lastName": "Ritchie",
						"creatorType": "author"
					},
					{
						"firstName": "Jane",
						"lastName": "Lewis",
						"creatorType": "author"
					},
					{
						"firstName": "Carol McNaughton",
						"lastName": "Nicholls",
						"creatorType": "author"
					},
					{
						"firstName": "Rachel",
						"lastName": "Ormston",
						"creatorType": "author"
					},
					{
						"firstName": "Jane",
						"lastName": "Ritchie",
						"creatorType": "author"
					},
					{
						"firstName": "Jane",
						"lastName": "Lewis",
						"creatorType": "author"
					},
					{
						"firstName": "Carol McNaughton",
						"lastName": "Nicholls",
						"creatorType": "author"
					},
					{
						"firstName": "Rachel",
						"lastName": "Ormston",
						"creatorType": "author"
					}
				],
				"date": "2013",
				"edition": "2",
				"libraryCatalog": "Perlego",
				"publisher": "SAGE Publications Ltd",
				"url": "https://www.perlego.com/book/1431388/qualitative-research-practice-a-guide-for-social-science-students-and-researchers-pdf?queryID=8d25693afbbc254b9927e5d0f7dac19f&searchIndexType=books",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.perlego.com/book/1304220/fear-of-the-lord-is-wisdom-a-theological-introduction-to-wisdom-in-israel-pdf",
		"detectedItemType": "book",
		"items": [
			{
				"itemType": "book",
				"title": "Fear of the Lord Is Wisdom",
				"creators": [
					{
						"firstName": "Tremper",
						"lastName": "Longman",
						"creatorType": "author"
					}
				],
				"date": "2017",
				"libraryCatalog": "Perlego",
				"publisher": "Baker Academic",
				"url": "https://www.perlego.com/book/1304220/fear-of-the-lord-is-wisdom-a-theological-introduction-to-wisdom-in-israel-pdf",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
