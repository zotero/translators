{
	"translatorID": "05997944-d1c2-41bf-a399-9932268c81e5",
	"label": "Bookshop.org",
	"creator": "Abe Jellinek",
	"target": "^https://bookshop\\.org/books",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-07-01 17:14:32"
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
	if (/\/books\/[^/]+\/[0-9]+/.test(url)
		&& attr('meta[property="og:type"]', 'content') == 'book') {
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
	var rows = doc.querySelectorAll('h2 a[href*="/books/"]');
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
	translator.setDocument(doc);
	
	translator.setHandler('itemDone', function (obj, item) {
		item.numPages = text(doc, '[itemprop="numberOfPages"]');
		item.publisher = text(doc, '[itemprop="publisher"]');
		
		item.tags = [];
		item.attachments = [];
		item.url = '';
		
		for (let author of doc.querySelectorAll('span[itemprop="author"]')) {
			let name = text(author, 'span[itemprop="name"]');
			let type = author.parentNode.nextSibling.textContent;
			
			if (type.includes('Author')) {
				type = 'author';
			}
			else if (type.includes('Editor')) {
				type = 'editor';
			}
			else if (type.includes('Translator')) {
				type = 'translator';
			}
			else {
				type = 'contributor';
			}
			
			item.creators.push(ZU.cleanAuthor(name, type));
		}
		
		item.complete();
	});

	translator.getTranslatorObject(function (trans) {
		trans.itemType = "book";
		trans.doWeb(doc, url);
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://bookshop.org/books/crying-in-h-mart-a-memoir/9780525657743",
		"items": [
			{
				"itemType": "book",
				"title": "Crying in H Mart: A Memoir",
				"creators": [
					{
						"firstName": "Michelle",
						"lastName": "Zauner",
						"creatorType": "author"
					}
				],
				"date": "2021-04-20T12:00:00-04:00",
				"ISBN": "9780525657743",
				"abstractNote": "NEW YORK TIMES BEST SELLER - A Best Book of 2021:  AV Club - Bustle - Entertainment Weekly - Good Morning America - Chicago Review of Books - Fortune - TIME - CNN Underscored - Apartment Therapy - Popsugar - Hello Giggles - Business Insider - The Millions - Wall Street Journal Magazine - Glamour From the indie rockstar of Japanese Breakfast fame, and author of the viral 2018 New Yorker essay that shares the title of this book, an unflinching, powerful memoir about growing up Korean American, losing her mother, and forging her own identity. In this exquisite story of family, food, grief, and endurance, Michelle Zauner proves herself far more than a dazzling singer, songwriter, and guitarist. With humor and heart, she tells of growing up one of the few Asian American kids at her school in Eugene, Oregon; of struggling with her mother's particular, high expectations of her; of a painful adolescence; of treasured months spent in her grandmother's tiny apartment in Seoul, where she and her mother would bond, late at night, over heaping plates of food. As she grew up, moving to the East Coast for college, finding work in the restaurant industry, and performing gigs with her fledgling band--and meeting the man who would become her husband--her Koreanness began to feel ever more distant, even as she found the life she wanted to live. It was her mother's diagnosis of terminal cancer, when Michelle was twenty-five, that forced a reckoning with her identity and brought her to reclaim the gifts of taste, language, and history her mother had given her. Vivacious and plainspoken, lyrical and honest, Zauner's voice is as radiantly alive on the page as it is onstage. Rich with intimate anecdotes that will resonate widely, and complete with family photos, Crying in H Mart is a book to cherish, share, and reread.",
				"language": "en",
				"libraryCatalog": "bookshop.org",
				"numPages": "256",
				"publisher": "Knopf Publishing Group",
				"shortTitle": "Crying in H Mart",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://bookshop.org/books/organic-chemistry-for-babies/9781492671169",
		"items": [
			{
				"itemType": "book",
				"title": "Organic Chemistry for Babies",
				"creators": [
					{
						"firstName": "Chris",
						"lastName": "Ferrie",
						"creatorType": "author"
					},
					{
						"firstName": "Cara",
						"lastName": "Florance",
						"creatorType": "author"
					}
				],
				"date": "2018-05-01T12:00:00-04:00",
				"ISBN": "9781492671169",
				"abstractNote": "Fans of Chris Ferrie's Rocket Science for Babies, Quantum Physics for Babies, and 8 Little Planets will love this introduction to organic chemistry for babies and toddlers!It only takes a small spark to ignite a child's mind.Written by an expert, Organic Chemistry for Babies is a colorfully simple introduction to the structure of organic, carbon-containing compounds and materials. Gift your special little one the opportunity to learn with this perfect science baby gift and help them be one step ahead of pre-med students! With a tongue-in-cheek approach that adults will love, this installment of the Baby University baby board book series is the perfect way to introduce STEM concepts for babies and toddlers. After all, it's never too early to become an organic chemist!If you're looking for the perfect STEAM book for teachers, science toys for babies, or chemistry toys for kids, look no further! Organic Chemistry for Babies offers fun early learning for your little scientist!",
				"language": "en",
				"libraryCatalog": "bookshop.org",
				"numPages": "24",
				"publisher": "Sourcebooks Explore",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://bookshop.org/books?keywords=pippi",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://bookshop.org/books/meditations-a-new-translation-7be5ded9-87a9-4056-af72-d6c917125a29/9780812968255",
		"items": [
			{
				"itemType": "book",
				"title": "Meditations: A New Translation",
				"creators": [
					{
						"firstName": "Marcus",
						"lastName": "Aurelius",
						"creatorType": "author"
					},
					{
						"firstName": "Gregory",
						"lastName": "Hays",
						"creatorType": "translator"
					}
				],
				"date": "2003-05-06T12:00:00-04:00",
				"ISBN": "9780812968255",
				"abstractNote": "Nearly two thousand years after it was written, Meditations remains profoundly relevant for anyone seeking to lead a meaningful life. Few ancient works have been as influential as the Meditations of Marcus Aurelius, philosopher and emperor of Rome (A.D. 161-180). A series of spiritual exercises filled with wisdom, practical guidance, and profound understanding of human behavior, it remains one of the greatest works of spiritual and ethical reflection ever written. Marcus's insights and advice--on everything from living in the world to coping with adversity and interacting with others--have made the Meditations required reading for statesmen and philosophers alike, while generations of ordinary readers have responded to the straightforward intimacy of his style. For anyone who struggles to reconcile the demands of leadership with a concern for personal integrity and spiritual well-being, the Meditations remains as relevant now as it was two thousand years ago.  In Gregory Hays's new translation--the first in thirty-five years--Marcus's thoughts speak with a new immediacy. In fresh and unencumbered English, Hays vividly conveys the spareness and compression of the original Greek text. Never before have Marcus's insights been so directly and powerfully presented.  With an Introduction that outlines Marcus's life and career, the essentials of Stoic doctrine, the style and construction of the Meditations, and the work's ongoing influence, this edition makes it possible to fully rediscover the thoughts of one of the most enlightened and intelligent leaders of any era.",
				"language": "en",
				"libraryCatalog": "bookshop.org",
				"numPages": "256",
				"publisher": "Modern Library",
				"shortTitle": "Meditations",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
