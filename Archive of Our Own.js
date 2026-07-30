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
		return 'bookSection';
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
	return false;
}

async function doWeb(doc, url)
{
	let detectedType = detectWeb(doc, url);

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
	}
	else {
		// normalize URL by re-deriving it via sharing link
		let href = attr(scrapingDoc, 'ul.work.navigation.actions > li.share > a', 'href').slice(0, -'/share'.length);
		item.url = new URL(href, baseUrl).toString();
	}

	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
