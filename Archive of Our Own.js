{
	"translatorID": "4913f5c0-d929-4162-81f2-bf922618746f",
	"label": "Archive of Our Own",
	"creator": "omnivorous_narrator",
	"target": "^https?://archiveofourown.org/*",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-08-01 04:32:15"
}
/*
    ***** BEGIN LICENSE BLOCK *****

    Copyright © 2026 omnivorous_narrator

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

const baseUrl = 'https://archiveofourown.org/';

function parseIntWithThousandsDelimCommas(text) {
	return text.split(',').join();
}

function getCollection(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('li:is(.work,.series).blurb > div.header > h4.heading > a:is([href^="/works/"],[href^="/series/"])');
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

function parseWorkPreface(node, item)
{
	let title = ZU.trimInternal(text(node, 'h2.title.heading'));
	if (!title) return false;
	item.title = title;

	item.creators = [];
	let authorElems = node.querySelectorAll('h3.byline.heading > a[rel="author"]');
	for (let authorElem of authorElems) {
		item.creators.push({
			lastName: authorElem.textContent.trim(),
			creatorType: 'author',
			fieldMode: 1
		});
	}

	let summaryElem = node.querySelector('div.summary > blockquote.userstuff');
	if (summaryElem)
		item.abstractNote = ZU.cleanTags(ZU.trimInternal(summaryElem.innerHTML)).trim();

	return true;
}

function parseWorkMeta(node, item)
{
	let publishedDate = ZU.strToISO(text(node, 'dd.published'));
	let updatedDate = ZU.strToISO(text(node, 'dd.status')) || publishedDate;
	item.date = updatedDate;
	let endDate = updatedDate; //isComplete ? updatedDate : '';
	let issued = (publishedDate === endDate) ? publishedDate : [publishedDate, endDate].join(' - ');
	item.setExtra('Issued', issued);

	let seriesTitle = ZU.trimInternal(text(node, 'dd.series a[href^="/series/"]'));
	if (seriesTitle) {
		item.series = seriesTitle;
		item.seriesNumber = parseInt(ZU.trimInternal(text(node, 'dd.series > span.position')).split(' ')[1]);
	}

	let chapterCountCurrent, chapterCountExpected = text(node, 'dd.chapters').split('/').map((desc) => (desc === '?') ? null : parseInt(desc));
	let isComplete = (chapterCountCurrent == chapterCountExpected);
	item.setExtra('Complete', isComplete);
	if (isComplete) {
		let chapterCount = parseInt(text(node, 'dd.chapters').split('/')[1].trim());
		item.setExtra('Chapter-Count', chapterCount);
		// word count uses commas as thousands-separators
		let wordCount = parseIntWithThousandsDelimCommas(text(node, 'dd.words').trim());
		item.setExtra('Word-Count', wordCount);
	}

	return true;
}

function parseChapterHead(node, item)
{
	let title = ZU.trimInternal(text(node, '.title'));
	item.title = title;
	if (!title) return false;
	let href = attr(node, '.title > a[href^="/works/"]', 'href');
	item.url = new URL(href, baseUrl).toString();

	let summaryElem = node.querySelector('div.summary > blockquote.userstuff');
	if (summaryElem)
		item.abstractNote = ZU.cleanTags(ZU.trimInternal(summaryElem.innerHTML)).trim();

	return true;
}

function detectWeb(doc, url)
{
	if (/\/works\/[0-9]+\/chapters\/[0-9]+/.test(url)) {
		// single chapter in multi-chapter work
		// OR only chapter in multi-chapter work (this is rarely used URL likely unreachable otherwise)
		Zotero.debug("AO3 chapter page");
		return Z.getHiddenPref('AO3.alwaysAddFullWork') ? 'book' : 'bookSection';
	}
	else if (/\/works\/[0-9]+\/?$/.test(url)) {
		// in multi-chapter works, this auto-redirects to first chapter, unless content warning is being displayed
		// in single-chapter works, this does not auto-redirect to chapter URL
		Zotero.debug("AO3 work page");
		return 'book';
	}
	else if (/\/works\/[0-9]+\?view_full_work/.test(url)) {
		Zotero.debug("AO3 full work page");
		return 'book';
	}
	else if (/\/works\/[0-9]+\/navigate/.test(url)) {
		// TOC page
		Zotero.debug("AO3 work TOC page");
		return 'book';
	}
	else if (/\/series\/[0-9]+/.test(url)) {
		// paged
		Zotero.debug("AO3 series TOC page");
		return 'multiple';
	}
	else if (/\/users\/[a-zA-Z0-9_]+(\/pseuds\/([a-zA-Z0-9_\-]|(%[0-9a-fA-F]{2}))+)?\/(works|series|bookmarks|collections)/.test(url)) {
		// see https://archiveofourown.org/faq/your-account#usernamecharacters,
		// and https://archiveofourown.org/faq/pseuds#pseudcharacters
		// paged; list may include series, not just works
		Zotero.debug("AO3 user collection page");
		return 'multiple';
	}
	else if (/\/works\/search\?work_search\[query\]/.test(url)) {
		// paged; list only includes works, not series
		Zotero.debug("AO3 search results page");
		return 'multiple';
	}
	return false;
}

async function doWeb(doc, url)
{
	let detectedType = detectWeb(doc, url);

	if (detectedType == 'multiple') {
		let items = await Zotero.selectItems(getCollection(doc, false));
		if (!items) return;
		for (let url of Object.keys(items)) {
			let doc = await requestDocument(url);
			// recursively scrape to include titles within series (if any)
			// (won't be causing DDoS, as it is gated by Z.selectItems())
			await doWeb(doc, url);
		}

		// TODO: support paged results?
		return;
	}

	// single item
	let scrapingUrl = new URL(url);
	let useAltScrapingUrl = false;
	let item = null;

	if (detectedType == 'bookSection') {
		item = new Zotero.Item('bookSection');
	}
	else {
		item = new Zotero.Item('book');
		// if TOC page, scrape using content page (metadata not displayed on TOC page)
		let splitAt = scrapingUrl.pathname.indexOf('/navigate');
		if (splitAt != -1) {
			scrapingUrl.pathname = scrapingUrl.pathname.slice(0, splitAt);
			useAltScrapingUrl = true;
		}
	}

	// N.B. on any works page with content (chapter or full work, NOT TOC page), a content warning may be displayed instead;
	// set view_adult=true to visit content
	if (scrapingUrl.searchParams.get('view_adult') !== 'true') {
		scrapingUrl.searchParams.set('view_adult', 'true');
		useAltScrapingUrl = true;
	}

	let scrapingDoc = useAltScrapingUrl ? await requestDocument(scrapingUrl.toString()) : doc;

	let prefaceElem = scrapingDoc.querySelector('div#workskin > div.preface');
	if (!parseWorkPreface(prefaceElem, item)) {
		return false;
	}

	let metaElem = scrapingDoc.querySelector('dl.work.meta');
	parseWorkMeta(metaElem, item);

	if (detectedType == 'bookSection') { // implies body text page
		item.bookTitle = item.title;
		item.title = null;
		let chapterElem = scrapingDoc.querySelector('div#workskin div.chapter.preface');
		parseChapterHead(chapterElem, item);

		item.attachments = [{
			title: "Snapshot",
			document: doc
		}];
	}
	else {
		// normalize URL by re-deriving it via sharing link
		let href = attr(scrapingDoc, 'ul.work.navigation.actions > li.share > a', 'href').slice(0, -'/share'.length);
		item.url = new URL(href, baseUrl).toString();

		let getFullTextDownloadUrl = (doc, format) => attr(doc, `ul.work.navigation.actions > li.download a[href*=".${format}"]`, 'href');

		item.attachments = [];
		let standaloneHtmlUrl = getFullTextDownloadUrl(scrapingDoc, 'html');
		if (standaloneHtmlUrl) {
			item.attachments.push({
				url: standaloneHtmlUrl,
				title: 'Full Text HTML',
				mimeType: 'text/html',
				snapshot: true
			});
		}
		let epubUrl = getFullTextDownloadUrl(scrapingDoc, 'epub');
		if (epubUrl) {
			item.attachments.push({
				url: epubUrl,
				title: 'Full Text ePUB',
				mimeType: 'application/epub+zip',
				snapshot: false
			});
		}
	}

	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://archiveofourown.org/works/4817126/chapters/11029061",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Chapter 1: Ronnie",
				"creators": [
					{
						"lastName": "Hyaroo",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "2015-11-28",
				"abstractNote": "Hermione gives a lecture on \"gender-flip fanfiction\"; i.e. fanfiction depicting an AU where one or more characters has been born the opposite sex. Of course, when the ones attending the lecture are Harry and Ron... or should that perhaps be \"Holly\" and \"Ronnie\"?... it might get a little difficult to stay on track. A very meta story.",
				"bookTitle": "Hermione Granger's Guide To Gender-Flip Fanfiction",
				"extra": "Issued: 2015-09-17 - 2015-11-28\nComplete: false",
				"libraryCatalog": "Archive of Our Own",
				"shortTitle": "Chapter 1",
				"url": "https://archiveofourown.org/works/4817126/chapters/11029061",
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
		"url": "https://archiveofourown.org/works/4817126/navigate",
		"items": [
			{
				"itemType": "book",
				"title": "Hermione Granger's Guide To Gender-Flip Fanfiction",
				"creators": [
					{
						"lastName": "Hyaroo",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "2015-11-28",
				"abstractNote": "Hermione gives a lecture on \"gender-flip fanfiction\"; i.e. fanfiction depicting an AU where one or more characters has been born the opposite sex. Of course, when the ones attending the lecture are Harry and Ron... or should that perhaps be \"Holly\" and \"Ronnie\"?... it might get a little difficult to stay on track. A very meta story.",
				"extra": "Issued: 2015-09-17 - 2015-11-28\nComplete: false",
				"libraryCatalog": "Archive of Our Own",
				"url": "https://archiveofourown.org/works/4817126",
				"attachments": [
					{
						"title": "Full Text HTML",
						"mimeType": "text/html",
						"snapshot": true
					},
					{
						"title": "Full Text EPUB",
						"mimeType": "application/epub+zip",
						"snapshot": true
					},
					{
						"title": "Full Text MOBI",
						"mimeType": "application/x-mobipocket-ebook",
						"snapshot": false
					},
					{
						"title": "Full Text AZW3",
						"mimeType": "application/vnd.amazon.ebook",
						"snapshot": false
					},
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf",
						"snapshot": false
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
		"url": "https://archiveofourown.org/works/3721921/chapters/8243602",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Chapter 1: Veronica Weasley",
				"creators": [
					{
						"lastName": "Hyaroo",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "2015-04-15",
				"abstractNote": "This is the first story in the planned Weasley Girl trilogy, an AU in which Ron Weasley was born a girl.\n\nSo many stories have asked the question: \"What if Harry Potter was a girl?\" Few stories, however, seem to bother with the question \"What if Ron Weasley was a girl?\" So, just to be contrary, this story will. Everyone else here is going to be as in canon, but Ron's going to be a girl, and then we'll see how this might change the story. There might be some consequences here you wouldn't have expected.\n\nWe begin the story when Harry has been left at King's Cross by the Dursleys and is looking for Platform Nine-and-three-quarters, just in time for the Weasleys to make the scene...",
				"bookTitle": "Weasley Girl",
				"extra": "Issued: 2015-04-11 - 2015-04-15\nComplete: false",
				"libraryCatalog": "Archive of Our Own",
				"series": "Weasley Girl",
				"shortTitle": "Chapter 1",
				"url": "https://archiveofourown.org/works/3721921/chapters/8243602",
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
		"url": "https://archiveofourown.org/works/3721921/navigate",
		"items": [
			{
				"itemType": "book",
				"title": "Weasley Girl",
				"creators": [
					{
						"lastName": "Hyaroo",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "2015-04-15",
				"abstractNote": "AU: The first friend Harry Potter made on the Hogwarts express wasn't Ronald \"Ron\" Weasley; it was Veronica \"Ronnie\" Weasley, first-born daughter of the Weasley clan. And all of a sudden, the future looked very different.\n\nJoin the newly-formed \"Potter's Gang\" (consisting of Harry, Ronnie, Hermione and Neville) in their first year at Hogwarts as they get into all kinds of misadventures, and maybe have to face a certain Dark Lord before they're ready for it.\n\nFirst novel in the \"Weasley Girl\" trilogy. Fem!Ron, but not a romance, and not a canon rehash.",
				"extra": "Issued: 2015-04-11 - 2015-04-15\nComplete: false",
				"libraryCatalog": "Archive of Our Own",
				"series": "Weasley Girl",
				"url": "https://archiveofourown.org/works/3721921",
				"attachments": [
					{
						"title": "Full Text HTML",
						"mimeType": "text/html",
						"snapshot": true
					},
					{
						"title": "Full Text EPUB",
						"mimeType": "application/epub+zip",
						"snapshot": true
					},
					{
						"title": "Full Text MOBI",
						"mimeType": "application/x-mobipocket-ebook",
						"snapshot": false
					},
					{
						"title": "Full Text AZW3",
						"mimeType": "application/vnd.amazon.ebook",
						"snapshot": false
					},
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf",
						"snapshot": false
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
		"url": "https://archiveofourown.org/works/185537",
		"items": [
			{
				"itemType": "book",
				"title": "Monsters Ascendant",
				"creators": [
					{
						"lastName": "urbanAnchorite (t_ZM)",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "2011-04-17",
				"abstractNote": "And what rough beast, its hour come round at last/Slouches towards Skaia to be born?",
				"extra": "Issued: 2011-04-17\nComplete: false",
				"libraryCatalog": "Archive of Our Own",
				"url": "https://archiveofourown.org/works/185537",
				"attachments": [
					{
						"title": "Full Text HTML",
						"mimeType": "text/html",
						"snapshot": true
					},
					{
						"title": "Full Text EPUB",
						"mimeType": "application/epub+zip",
						"snapshot": true
					},
					{
						"title": "Full Text MOBI",
						"mimeType": "application/x-mobipocket-ebook",
						"snapshot": false
					},
					{
						"title": "Full Text AZW3",
						"mimeType": "application/vnd.amazon.ebook",
						"snapshot": false
					},
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf",
						"snapshot": false
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
