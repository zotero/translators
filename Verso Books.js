{
	"translatorID": "bc517bd2-4835-4621-b775-917253bec93a",
	"label": "Verso Books",
	"creator": "Bo An",
	"target": "^https?://(www\\.)?versobooks\\.com/books/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-06-30 18:30:46"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2021 Bo An

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
	const isSubject = url.includes("subjects/");
	if (isSubject && getSearchResults(doc, true)) {
		return 'multiple';
	}
	else if (doc.querySelector('.edition-single--book-title')) {
		return 'book';
	} else {
		return false;
	}
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		Zotero.selectItems(getSearchResults(doc, false), (items) => {
			if (!items) {
				return true;
			}
			const articles = [];
			for (const i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, scrape);
			return true;
		});
	}
	else {
		scrape(doc, url);
	}
}

function getSearchResults(doc) {
	let items = {};
	let found = false;

	const bookLinkEls = doc.querySelectorAll('.book-grid > .book-card');

	Z.debug(bookLinkEls.length);

	bookLinkEls.forEach((bookLinkEl) => {
		const titleEl = bookLinkEl.querySelectorAll('div.book-card--title > a')[0];

		const href = titleEl.href;
		const title = titleEl.textContent;

		items[href] = title;
		if (found === false) {
			found = true;
		}
	});

	return found ? items : false;
}

function scrape(doc, _) {
	const newItem = new Zotero.Item('book');

	newItem.publisher = "Verso Books";
	const title = text(doc, '.edition-single--book-title');
	const subtitle = text(doc, '.edition-single--book-subtitle');
	newItem.title = title + (subtitle ? `: ${subtitle}` : '');

	const contributorsEls = doc.querySelectorAll('.edition-single--book-contributors > span');
	contributorsEls.forEach((contributorEl) => {
		const authors = contributorEl.querySelectorAll('a');
			authors.forEach((authorEl) => {
				let role = 'author';
				const isAuthor = authorEl.href.includes('authors');
				const isEditor = contributorEl.textContent.toLowerCase().includes('edited by');
				if (isEditor) {
					role = 'editor';
				}
				if (isAuthor) {
					const authorFullName = authorEl.textContent;
					newItem.creators.push(ZU.cleanAuthor(authorFullName, role, false));
				}
			});
		// check if translator
		const spanText = contributorEl.textContent;
		const isTranslator = spanText.toLowerCase().includes('translated by');
		if (isTranslator) {
			const translatorName = spanText.replace('Translated by', '');
			newItem.creators.push(ZU.cleanAuthor(translatorName, "translator", false));
		}
	});

	const description = text(doc, '.edition-single--book-description');
	if (description) {
		newItem.abstractNote = description;
	}

	const detailsText = text(doc, '.edition-single--product-card > .details');
	if (detailsText.length > 0) {
		const detailsArray = detailsText.split('/');
		const pages = detailsArray[0].replace('pages', '');
		const date = detailsArray[1];
		const ISBN = detailsArray[2];

		if (pages) {
			newItem.pages = pages;
		}

		if (date) {
			newItem.date = ZU.strToISO(date);
		}

		if (ISBN) {
			newItem.ISBN = ZU.cleanISBN(ISBN);
		}
	}
	newItem.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.versobooks.com/books/subjects/35-feminism-amp-gender#browse",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.versobooks.com/books/3779-china-in-one-village",
		"items": [
			{
				"itemType": "book",
				"title": "China in One Village: The Story of One Town and the Changing World",
				"creators": [
					{
						"firstName": "Liang",
						"lastName": "Hong",
						"creatorType": "author"
					},
					{
						"firstName": "Emily",
						"lastName": "Goedde",
						"creatorType": "translator"
					}
				],
				"date": "2021-06",
				"ISBN": "9781839761775",
				"abstractNote": "After a decade away from her ancestral family village, during which she became a writer and literary scholar in Beijing, Liang Hong started visiting her rural hometown in landlocked Henan Province. What she found was an extended family riven by the seismic changes in Chinese society and a village turned inside out by emigration, neglect, and environmental despoliation. Combining family memoir, literary observation, and social commentary, Liang’s by turns lyrically poetic and movingly raw investigation into the fate of her village became a bestselling book in China and brought her fame.\n\nFor many months, Liang walked the roads and fields of her village, recording the stories of her relatives—especially her irascible, unforgettable father—and talking to everyone from high government officials to the lowest of village outcasts. Across China, many saw in Liang’s riveting interviews with family members and childhood acquaintances a mirror of their own lives, and her observations about the way the greatest rural-to-urban migration of modern times has twisted the country resonated deeply. China in One Village tells the story of contemporary China through one clear-eyed, literary observer, one family, and one village.",
				"libraryCatalog": "Verso Books",
				"publisher": "Verso Books",
				"shortTitle": "China in One Village",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.versobooks.com/books/3814-capitalism-and-the-camera",
		"items": [
			{
				"itemType": "book",
				"title": "Capitalism and the Camera: Essays on Photography and Extraction",
				"creators": [
					{
						"firstName": "Kevin",
						"lastName": "Coleman",
						"creatorType": "editor"
					},
					{
						"firstName": "Daniel",
						"lastName": "James",
						"creatorType": "editor"
					}
				],
				"date": "2021-05",
				"ISBN": "9781839760808",
				"abstractNote": "Photography was invented between the publication of Adam Smith’s The Wealth of Nations and Karl Marx and Friedrich Engels’s The Communist Manifesto. Taking the intertwined development of capitalism and the camera as their starting point, the essays collected here investigate the relationship between capitalist accumulation and the photographic image, and ask whether photography might allow us to refuse capitalism’s violence—and if so, how?\n\nDrawn together in productive disagreement, the essays in this collection explore the relationship of photography to resource extraction and capital accumulation, from 1492 to the postcolonial; the camera’s potential to make visible critical understandings of capitalist production and society, especially economies of class and desire; and the ways the camera and the image can be used to build cultural and political counterpublics from which a democratic struggle against capitalism might emerge.\n\nWith essays by Ariella Aïsha Azoulay, Siobhan Angus, Kajri Jain, Walter Benn Michaels, T. J. Clark, John Paul Ricco, Blake Stimson, Chris Stolarski, Tong Lam and Jacob Emery.",
				"libraryCatalog": "Verso Books",
				"publisher": "Verso Books",
				"shortTitle": "Capitalism and the Camera",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.versobooks.com/books/1508-yellow-peril",
		"items": [
			{
				"itemType": "book",
				"title": "Yellow Peril!: An Archive of Anti-Asian Fear",
				"creators": [
					{
						"firstName": "John Kuo Wei",
						"lastName": "Tchen",
						"creatorType": "author"
					},
					{
						"firstName": "Dylan",
						"lastName": "Yeats",
						"creatorType": "author"
					}
				],
				"date": "2014-02",
				"ISBN": "9781781681237",
				"abstractNote": "The “yellow peril” is one of the oldest and most pervasive racist ideas in Western culture—dating back to the birth of European colonialism during the Enlightenment. Yet while Fu Manchu looks almost quaint today, the prejudices that gave him life persist in modern culture. Yellow Peril! is the first comprehensive repository of anti-Asian images and writing, and it surveys the extent of this iniquitous form of paranoia.\n\nWritten by two dedicated scholars and replete with paintings, photographs, and images drawn from pulp novels, posters, comics, theatrical productions, movies, propagandistic and pseudo-scholarly literature, and a varied world of pop culture ephemera, this is both a unique and fascinating archive and a modern analysis of this crucial historical formation.",
				"libraryCatalog": "Verso Books",
				"publisher": "Verso Books",
				"shortTitle": "Yellow Peril!",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.versobooks.com/books/subjects/6-middle-east",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.versobooks.com/books/2930-poets-of-the-chinese-revolution",
		"items": [
			{
				"itemType": "book",
				"title": "Poets of the Chinese Revolution",
				"creators": [
					{
						"firstName": "Chen",
						"lastName": "Duxiu",
						"creatorType": "author"
					},
					{
						"firstName": "Chen",
						"lastName": "Yi",
						"creatorType": "author"
					},
					{
						"firstName": "Mao",
						"lastName": "Zedong",
						"creatorType": "author"
					},
					{
						"firstName": "Zheng",
						"lastName": "Chaolin",
						"creatorType": "author"
					},
					{
						"firstName": "Gregor",
						"lastName": "Benton",
						"creatorType": "editor"
					},
					{
						"firstName": "Feng",
						"lastName": "Chongyi",
						"creatorType": "editor"
					}
				],
				"date": "2019-06",
				"ISBN": "9781788734684",
				"abstractNote": "The Chinese Revolution was a complex and protracted event staged by competing groups and individuals with different hopes and expectations. Its veterans included many poets, four of whom feature in this anthology. Poetry has played a different role in China—and in the Chinese Revolution—than in the West. In the Chinese tradition, poetry is collective and collaborative. But, in life, the four poets in this collection were entangled in opposition and, at times, regarded one another with bitter hostility.\n\nThe four poets, whose work is collected in English translation here alongside the Chinese originals, all wrote in the classical style, but their poetry was no less diverse than their politics. Chen Duxiu led China’s early cultural awakening before founding the Communist Party in 1921. Mao Zedong led the party to power in 1949. Zheng Chaolin, Chen Duxiu’s disciple and, like him, a convert to Trotskyism, spent thirty-four years in jail, first under the Nationalist regime and then under their Maoist nemeses. The guerrilla leader Chen Yi wrote flamboyant and descriptive poems in mountain bivouacs and in the heat of battle. Together, the four poets illustrate the complicated relationship between the Communist Revolution and Chinese cultural traditions.",
				"libraryCatalog": "Verso Books",
				"publisher": "Verso Books",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
