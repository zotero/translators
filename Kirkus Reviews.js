{
	"translatorID": "96ad516b-fb08-48ae-9af1-a92dda272bf4",
	"label": "Kirkus Reviews",
	"creator": "Vera de Kok",
	"target": "^https?://(www\\.)?kirkusreviews\\.com/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-10-19 16:00:00"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2026 Vera de Kok

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


/*
Kirkus Reviews has three kinds of citable page, all stored as magazineArticle
in Kirkus Reviews, but they carry their metadata very differently.

A review page (/book-reviews/, /audiobook-reviews/) is dressed up with the
reviewed book's metadata (the JSON-LD @type is even "Book"), but what it
represents is an unsigned review: the h1 is the reviewed book's title in ALL
CAPS, the "by" line names the book's contributors, and the review's own
publication date is buried in the third column of the details block as "Review
Posted Online". The review has no byline, so it gets no creators; the book's
people and metadata are recorded as labels in extra.

A news and features article (/news-and-features/articles/) is ordinary bylined
journalism: its JSON-LD is an Article with a real author and a datePublished.

A Writers' Center piece (/writers-center/<topic>/) has no article JSON-LD at
all, so its byline and date are read from the visible sub-heading.
*/


function detectWeb(doc, url) {
	// review pages: /book-reviews/<author>/<slug>/ and /audiobook-reviews/<author>/<slug>/
	// (the /print/ variant has its own stripped-down markup, hence the second check)
	if (/\/(?:book|audiobook)-reviews\/[^/]+\/[^/]+/.test(new URL(url).pathname)
		&& (doc.querySelector('#review-body') || doc.querySelector('h1.book_detail_title'))) {
		return "magazineArticle";
	}
	// news and features articles are signed pieces, unlike the reviews
	if (isArticle(url) && getArticleData(doc)) {
		return "magazineArticle";
	}
	// writers' center pieces have no article JSON-LD, so they are recognised by
	// their own layout (a sub-heading byline inside a writers-center-article)
	if (isWritersCenter(url) && doc.querySelector('.writers-center-article .kir-page-sub-heading')) {
		return "magazineArticle";
	}
	if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

/*
News and features articles live at /news-and-features/<section>/<slug>/ (in
practice the section is "articles"). They are ordinary bylined journalism, and
unlike the reviews they carry a real author in the page's JSON-LD.
*/
function isArticle(url) {
	return /^\/news-and-features\/[a-z-]+\/[^/]+\/?$/.test(new URL(url).pathname);
}

/*
Writers' Center pieces live at /writers-center/<topic>/<slug>/, where the topic
is "writing", "publishing" or "editing".
*/
function isWritersCenter(url) {
	return /^\/writers-center\/[a-z-]+\/[^/]+\/?$/.test(new URL(url).pathname);
}

/*
The JSON-LD block for a news and features article. Reviews also ship JSON-LD,
but theirs describes the reviewed book rather than the review, so only the
article types count here.
*/
function getArticleData(doc) {
	for (let script of doc.querySelectorAll('script[type="application/ld+json"]')) {
		let data;
		try {
			data = JSON.parse(script.textContent);
		}
		catch (e) {
			continue;
		}
		if (data && ['Article', 'NewsArticle', 'BlogPosting'].includes(data['@type'])) {
			return data;
		}
	}
	return null;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	// result cards on discover/section pages, author pages and search pages
	var rows = doc.querySelectorAll(
		'a.card-text[href*="/book-reviews/"], a.card-text[href*="/audiobook-reviews/"],'
		+ ' a.card-text[href*="/news-and-features/"],'
		+ ' a.lead-name[href*="/writers-center/"], a.lead-text-title[href*="/writers-center/"]'
	);
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
	if (detectWeb(doc, url) == 'multiple') {
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (!items) return;
			let reviewUrls = [];
			for (let u of Object.keys(items)) {
				reviewUrls.push(u);
			}
			ZU.processDocuments(reviewUrls, scrape);
		});
	}
	else {
		scrape(doc, url);
	}
}

function scrape(doc, url) {
	// the /print/ variant is a stripped-down render without byline roles or
	// issue data; the canonical review page has everything, so use that
	if (/\/print\/?$/.test(new URL(url).pathname)) {
		ZU.processDocuments(url.replace(/\/print\/?$/, '/'), scrape);
		return;
	}

	if (isWritersCenter(url) && doc.querySelector('.writers-center-article .kir-page-sub-heading')) {
		scrapeWritersCenter(doc, url);
		return;
	}
	let articleData = getArticleData(doc);
	if (isArticle(url) && articleData) {
		scrapeArticle(doc, url, articleData);
		return;
	}

	var reviewBody = doc.querySelector('#review-body.book-description-first')
		|| doc.querySelector('#review-body');
	// a review URL that renders no review (removed book, error page): bail out
	if (!reviewBody) return;

	// the item is the review, not the book. Kirkus labels the page with Book
	// metadata (and the JSON-LD @type is "Book") because the page is about the
	// book, but there is no reviewer byline and what a citation needs is the
	// review: its own publication date, in Kirkus Reviews.
	var item = new Zotero.Item("magazineArticle");
	item.publicationTitle = "Kirkus Reviews";
	item.ISSN = "1948-7428";
	item.language = 'en-US';
	item.libraryCatalog = "Kirkus Reviews";
	item.url = url;

	// the h1 is the reviewed book's title, stored in ALL CAPS
	let title = ZU.trimInternal(text(reviewBody, 'h1.article-title') || '');
	item.title = restoreAcronyms(ZU.capitalizeTitle(title, true));

	// series info sits below the title, e.g. "From the Talisman series , Vol. 3"
	// or "From the Poppy series, volume 3"; normalise it to "Talisman series, Vol. 3"
	let seriesInfo = ZU.trimInternal(text(reviewBody, 'h2.article-sub-title') || '')
		.replace(/^From the\s+/i, '')
		.replace(/\s*,\s*/g, ', ')
		.replace(/\b(?:volume|vol\.?)\s*(\d+)/i, 'Vol. $1');

	// the details block below the title holds the book's own data and the review
	// metadata in its third column: Pub Date, ISBN, Page Count and Publisher on
	// one side, Review Posted Online and Kirkus Reviews Issue on the other.
	// Audiobooks carry Duration and "DD ISBN" instead of Page Count and ISBN.
	let meta = {};
	for (let field of reviewBody.querySelectorAll('.content-row p')) {
		let label = text(field, 'b');
		if (!label) continue;
		label = ZU.trimInternal(label).replace(/:$/, '');
		meta[label] = ZU.trimInternal(field.textContent).replace(/^[^:]+:\s*/, '');
	}

	// the review's publication date is when it was posted online; the Kirkus
	// issue date is the print issue it ran in, which is the item's issue
	item.date = isoDate(meta['Review Posted Online']);
	item.issue = isoDate(meta['Kirkus Reviews Issue']);

	// everything else in the block describes the book, not the review, and has
	// no home on a magazineArticle - the publisher field means the magazine's
	// publisher, so the book's publisher goes to extra as well
	let bookExtra = [];
	if (isoDate(meta['Pub Date'])) bookExtra.push(`Book publication date: ${isoDate(meta['Pub Date'])}`);
	if (meta['ISBN'] || meta['DD ISBN']) bookExtra.push(`ISBN: ${meta['ISBN'] || meta['DD ISBN']}`);
	if (meta['Page Count']) bookExtra.push(`Page count: ${meta['Page Count']}`);
	if (meta['Publisher']) bookExtra.push(`Publisher: ${meta['Publisher']}`);
	if (seriesInfo) bookExtra.push(`Series: ${seriesInfo}`);
	if (meta['Duration']) bookExtra.push(`Duration: ${meta['Duration']}`);

	// the review text lives in .book-content; its last paragraph repeats the
	// verdict sentence shown above it, so drop that duplicate
	let verdict = ZU.trimInternal(text(reviewBody, '.description-title.kirkus-title') || '');
	let paragraphs = [];
	for (let p of reviewBody.querySelectorAll('.book-content p')) {
		let paragraph = ZU.trimInternal(p.textContent);
		if (paragraph) paragraphs.push(paragraph);
	}
	if (verdict && paragraphs[paragraphs.length - 1] == verdict) {
		paragraphs.pop();
	}
	item.abstractNote = paragraphs.join(' ') || verdict;

	// the "Categories:" block is Kirkus's genre taxonomy, and each link points at
	// /discover-books/<genre>/<subcategory>, so one link supplies two tags. The
	// genre name comes from the nav's own label for it, since slugs like "teen"
	// or "childrens" do not read as names.
	let addTag = function (tag) {
		// the genre labels are mixed case while the category links are in caps, so
		// normalise both to sentence case ("Science Fiction & Fantasy", "Epic Fantasy")
		tag = ZU.capitalizeTitle(ZU.trimInternal(tag || ''), true);
		if (!tag) return;
		if (!item.tags.some(existing => existing.tag.toLowerCase() == tag.toLowerCase())) {
			item.tags.push({ tag });
		}
	};
	let genreNames = {};
	for (let link of doc.querySelectorAll('a[href]')) {
		let [genre, subcategory] = categorySegments(link, url);
		if (genre && !subcategory) genreNames[genre] = ZU.trimInternal(link.textContent);
	}
	for (let link of reviewBody.querySelectorAll('p.article-category a[href]')) {
		let [genre, subcategory] = categorySegments(link, url);
		if (!genre) {
			addTag(link.textContent);
			continue;
		}
		let genreName = genreNames[genre] || slugWords(genre);
		addTag(genreName);
		if (subcategory) {
			addTag(subcategoryName(link.textContent, genreName, subcategory));
		}
	}

	// Kirkus Reviews is published in New York City. magazineArticle has no place
	// field, so the city is written as the CSL variable, which Zotero reads out
	// of extra and passes to the citation processor
	let extra = ['publisher-place: New York City'];

	// the byline names the book's contributors ("by X & illustrated by Y",
	// "read by Z" for audiobooks); the review itself is unsigned, so nobody here
	// is an author of the item - they are recorded as labels instead
	for (let entry of parseByline(reviewBody)) {
		extra.push(`${entry.role || 'Book author'}: ${entry.name}`);
	}

	extra = extra.concat(bookExtra);
	// the Kirkus star marks a review the editors singled out; match the star on
	// this review's own cover, since carousels carry starred covers of others
	if (isStarred(doc, url)) extra.push('Kirkus Star');
	item.extra = extra.join('\n');

	item.attachments.push({
		title: "Kirkus Reviews snapshot",
		mimeType: "text/html",
		document: doc
	});

	item.complete();
}

/*
Turns the byline paragraph into [{ name, role }] entries. The names after the
leading "by" are reviewed authors; names introduced by "illustrated by",
"read by", "translated by" etc. get that role instead of being creators.
*/
/*
News and features articles (Profiles, Perspectives, Seen & Heard, Awards, Book
to Screen, ...). These are signed pieces, so unlike the reviews they get real
creators from the JSON-LD author field, and that JSON-LD datePublished is the
article's own publication date. The visible byline in the details block
("BY X - March 8, 2017") backs up both.
*/
function scrapeArticle(doc, url, data) {
	var item = new Zotero.Item("magazineArticle");
	item.publicationTitle = "Kirkus Reviews";
	item.ISSN = "1948-7428";
	item.language = 'en-US';
	item.libraryCatalog = "Kirkus Reviews";
	item.url = url;

	let details = doc.querySelector('.kir-article-details');
	let heading = (details && details.querySelector('h1')) || doc.querySelector('h1');
	item.title = ZU.trimInternal(heading ? heading.textContent : '')
		|| ZU.unescapeHTML(ZU.trimInternal(data.headline || data.name || ''));

	// the JSON-LD author is a Person or an array of them; fall back to the names
	// in the visible byline when it is missing
	let authors = [];
	for (let author of (Array.isArray(data.author) ? data.author : [data.author])) {
		if (author && author.name) authors.push(author.name);
	}
	if (!authors.length && details) {
		for (let span of details.querySelectorAll('.title-bottom span')) {
			let name = ZU.trimInternal(span.textContent).replace(/^by\s+/i, '');
			if (name && !volumeLikeDate(name)) authors.push(name);
		}
	}
	for (let name of authors) {
		name = ZU.trimInternal(name).replace(/\s+/g, ' ');
		if (!name) continue;
		item.creators.push(ZU.cleanAuthor(name, 'author'));
	}

	let date = data.datePublished || '';
	if (!date) {
		let byline = details && details.querySelector('.title-bottom');
		let match = byline && byline.textContent.match(/([A-Z][a-z]+\.? \d{1,2}, \d{4})/);
		if (match) date = match[1];
	}
	item.date = isoDate(date);

	item.abstractNote = articleBody(doc, authors);

	// the section ("Profiles", "Perspectives", "Awards", ...) is the piece's
	// genre, and works as a tag too
	let section = data.articleSection || '';
	if (!ZU.trimInternal(section)) {
		let link = details && details.querySelector('.title-top a');
		section = link ? link.textContent : '';
	}
	if (ZU.trimInternal(section)) addArticleTag(item, section);
	for (let tag of articleBodyTags(doc)) addArticleTag(item, tag);

	item.extra = 'publisher-place: New York City';

	item.attachments.push({
		title: "Kirkus Reviews snapshot",
		mimeType: "text/html",
		url
	});

	item.complete();
}

function addArticleTag(item, tag) {
	// JSON-LD values are HTML-escaped, e.g. "Seen &amp; Heard"
	tag = ZU.capitalizeTitle(ZU.unescapeHTML(ZU.trimInternal(tag || '')), true);
	if (!tag) return;
	if (!item.tags.some(existing => existing.tag.toLowerCase() == tag.toLowerCase())) {
		item.tags.push({ tag });
	}
}

/*
The prose of an article. The paragraphs live in .main-content, but that column
also holds a "related" carousel and the lead photo, so take the article's own
paragraphs only and drop the closing "X is the Y editor." line, which just
restates the byline.
*/
function articleBody(doc, authorNames) {
	let container = doc.querySelector('.main-content')
		|| doc.querySelector('.article-author-description-start');
	if (!container) return '';

	let paragraphs = [];
	for (let p of container.querySelectorAll('p')) {
		let paragraph = ZU.trimInternal(p.textContent);
		if (paragraph) paragraphs.push(paragraph);
	}
	return stripContributor(paragraphs, authorNames).join(' ');
}

/*
Drops the author's closing credit, which Kirkus either writes as its own last
paragraph or tacks onto one ("... makes this series irresistible. Laurie
Muchnick is the fiction editor."). Only the named author's own sentence goes.
*/
function stripContributor(paragraphs, authorNames) {
	if (!paragraphs.length) return paragraphs;
	let last = paragraphs[paragraphs.length - 1];
	let sentences = last.split(/(?<=[.!?])\s+/);
	if (sentences.length > 1 && isContributorLine(sentences[sentences.length - 1], authorNames)) {
		sentences.pop();
		paragraphs[paragraphs.length - 1] = sentences.join(' ');
	}
	if (paragraphs.length > 1 && isContributorLine(paragraphs[paragraphs.length - 1], authorNames)) {
		paragraphs.pop();
	}
	return paragraphs;
}

/*
Kirkus closes an article with a credit for its author: a one-liner ("Laurie
Muchnick is the fiction editor.") or a short bio ("Andrea Moran lives outside of
Nashville ..."). The byline already carries the name, so these are dropped from
the abstract. They are recognised by opening with the author's own name, which
keeps unrelated closing sentences intact.
*/
function isContributorLine(paragraph, authorNames) {
	let value = ZU.trimInternal(paragraph || '');
	if (!value || value.length > 400) return false;

	let normalise = name => ZU.trimInternal(name).toLowerCase().replace(/\s+/g, ' ');
	let names = (authorNames || []).map(normalise).filter(Boolean);
	if (!names.length) return false;

	let valueLower = normalise(value);
	if (names.some(name => valueLower.startsWith(name))) return true;

	// fall back to a surname plus a job title, for credits written in the third
	// person ("Muchnick is the fiction editor of Kirkus.")
	let surnames = names.map(name => name.split(' ').pop()).filter(surname => surname.length > 1);
	if (!surnames.some(surname => valueLower.includes(surname))) return false;
	return /\bis (?:the|a|an|our)\b/i.test(value)
		&& /\b(?:editor|writer|critic|correspondent|reviewer|reporter|journalist)\b/i.test(value);
}

/*
Articles have no Categories block; the genre links in the footer are sitewide,
so there is nothing per-article to add. Kept as a seam in case Kirkus starts
tagging them the way it tags reviews.
*/
function articleBodyTags(_doc) {
	return [];
}

/*
The details block puts the date in a span next to the author name, e.g.
"BY Laurie Muchnick - March 8, 2017"; that span is not an author.
*/
function volumeLikeDate(value) {
	return /^(?:[A-Z][a-z]+\.? \d{1,2}, \d{4}|\d+)$/.test(value) || /^[\u2022\u00b7-]$/.test(value);
}

/*
Writers' Center pieces (/writers-center/<topic>/<slug>/). They share none of the
news and features markup and ship no article JSON-LD, so everything comes from
the page itself: the title is an h2.heading, the byline is a sub-heading of the
form "BY Jane Doe - August 14, 2026", and the topic ("Publishing") labels the
section above the title.
*/
function scrapeWritersCenter(doc, url) {
	var item = new Zotero.Item("magazineArticle");
	item.publicationTitle = "Kirkus Reviews";
	item.ISSN = "1948-7428";
	item.language = 'en-US';
	item.libraryCatalog = "Kirkus Reviews";
	item.url = url;

	let header = doc.querySelector('.kir-about-page');
	let heading = header && header.querySelector('h2.heading');
	let title = ZU.trimInternal(heading ? heading.textContent : '');
	if (!title) {
		let meta = doc.querySelector('meta[property="og:title"], meta[name="og:title"]');
		title = ZU.trimInternal(meta ? meta.content : '');
	}
	item.title = title;

	let byline = header && header.querySelector('.kir-page-sub-heading');
	let bylineText = byline ? ZU.trimInternal(byline.textContent) : '';
	// "BY ANDREA MORAN - August 14, 2026": everything before the separator is the
	// author, everything after it the date
	let parts = bylineText.split(/\s*[\u2022\u00b7]\s*/);
	let authorNames = [];
	if (parts.length) {
		let name = parts[0].replace(/^by\s+/i, '');
		if (name) authorNames.push(name);
	}
	for (let name of authorNames) {
		item.creators.push(ZU.cleanAuthor(titleCaseName(name), 'author'));
	}

	let dateMatch = bylineText.match(/([A-Z][a-z]+\.? \d{1,2}, \d{4})/);
	if (dateMatch) item.date = isoDate(dateMatch[1]);

	item.abstractNote = writersCenterBody(doc, authorNames);

	let topic = header && header.querySelector('.kir-page-sub-label');
	if (topic) addArticleTag(item, topic.textContent);

	item.extra = 'publisher-place: New York City';

	item.attachments.push({
		title: "Kirkus Reviews snapshot",
		mimeType: "text/html",
		url
	});

	item.complete();
}

/*
The byline is in caps ("ANDREA MORAN") while the names elsewhere on the site are
in title case, so normalise before handing it to cleanAuthor.
*/
function titleCaseName(name) {
	return ZU.trimInternal(name)
		.toLowerCase()
		.replace(/(^|[\s'-])([a-z])/g, (m, sep, letter) => sep + letter.toUpperCase());
}

function writersCenterBody(doc, authorNames) {
	let container = doc.querySelector('.writers-center-article-content')
		|| doc.querySelector('.writers-center-article');
	if (!container) return '';

	let paragraphs = [];
	for (let p of container.querySelectorAll('p')) {
		let paragraph = ZU.trimInternal(p.textContent);
		if (paragraph) paragraphs.push(paragraph);
	}
	return stripContributor(paragraphs, authorNames).join(' ');
}

/*
capitalizeTitle lowercases everything but a word's first letter, so an acronym in
a title set in caps comes out wrong ("THE AGE OF AI" -> "The Age of Ai"). Kirkus
serves the title in caps in every source it has (h1, og:title and the JSON-LD
name), so the original spelling cannot be recovered from the page and the
acronyms common in book titles are restored from a list instead.
*/
function restoreAcronyms(title) {
	// common words that happen to look like acronyms (Us, La) are left out
	let acronyms = 'AI DNA USA UK EU TV WWII WWI NFL NBA CEO CFO NASA FBI CIA NYC MTV BBC ACLU'.split(' ');
	for (let acronym of acronyms) {
		let capitalised = acronym.charAt(0) + acronym.slice(1).toLowerCase();
		title = title.replace(new RegExp('\\b' + capitalised + '\\b', 'g'), acronym);
	}
	return title;
}

function parseByline(reviewBody) {
	let byline = reviewBody.querySelector('p.article-author');
	if (!byline) return [];

	let entries = [];
	let roleText = '';
	for (let node of byline.childNodes) {
		if (node.nodeType == 1 && node.matches('a[href^="/author/"]')) {
			let name = ZU.trimInternal(node.textContent);
			if (name) {
				entries.push({ name, role: roleFromText(roleText) });
			}
			roleText = '';
			continue;
		}
		if (node.nodeType == 1 && node.matches('span.pub-date-mobile')) {
			break;
		}
		roleText += node.textContent;
	}
	return entries;
}

function roleFromText(roleText) {
	let match = roleText.match(/\b(read|narrat\w*|illustrat\w*|translat\w*|edit\w*|foreword|introduction|afterword|contribut\w*)\s+by\b/i);
	if (!match) return null;
	let verb = match[1].toLowerCase();
	if (verb.startsWith('read') || verb.startsWith('narrat')) return 'Narrator';
	if (verb.startsWith('illustrat')) return 'Illustrator';
	if (verb.startsWith('translat')) return 'Translator';
	if (verb.startsWith('edit')) return 'Editor';
	return 'Contributor';
}

/*
The review's publication date is "Review Posted Online", buried in the third
column of the details block - the book's own "Pub Date" is a different thing.
Kirkus writes dates as "July 6, 2026" / "Sept. 30, 2011"; Zotero stores dates in
ISO 8601 (YYYY-MM-DD), so hand the string to strToISO. Rejects the relative or
missing values Kirkus uses for undated titles ("today", "yesterday", "N/A").
*/
function isoDate(value) {
	let date = ZU.trimInternal(value || '');
	if (!date || /^(?:n\/?a|today|yesterday|unknown)$/i.test(date)) return '';
	return ZU.strToISO(date) || date;
}

/*
Splits a Kirkus category link into [genre, subcategory]. The site links genre
pages as /discover-books/<genre> and book categories as
/discover-books/<genre>/<subcategory>; anything else yields no genre.
*/
function categorySegments(link, baseURL) {
	let href;
	try {
		href = new URL(link.getAttribute('href'), baseURL).pathname;
	}
	catch (e) {
		return [];
	}
	let match = href.match(/^\/discover-(?:books|audiobooks)\/([a-z0-9-]+)(?:\/([a-z0-9-]+))?\/?$/);
	return match ? [match[1], match[2]] : [];
}

/*
Turns a URL slug into words: "science-fiction-fantasy" -> "science fiction fantasy".
*/
function slugWords(slug) {
	return ZU.trimInternal(String(slug || '').replace(/-/g, ' '));
}

/*
The anchor text of a category link is the subcategory in caps, but Kirkus
sometimes glues the genre onto it ("CHILDREN'S GENERAL CHILDREN'S" for the
childrens/general-childrens page). Prefer the anchor text with any leading genre
name removed, and fall back to the slug.
*/
function subcategoryName(anchorText, genreName, slug) {
	let name = ZU.trimInternal(anchorText || '');
	let lower = name.toLowerCase();
	let genre = genreName.toLowerCase();
	if (lower.startsWith(genre)) name = name.slice(genreName.length);
	name = ZU.trimInternal(name);
	// a slug word the site does not spell out ("childrens") reads better than a
	// capitalised fragment glued to the genre
	return name || slugWords(slug);
}

function isStarred(doc, url) {
	let path = new URL(url).pathname.replace(/\/print\/$/, '/');
	for (let star of doc.querySelectorAll('.cover-container.kirkus-star a[href]')) {
		if (new URL(star.href).pathname.replace(/\/print\/$/, '/') == path) {
			return true;
		}
	}
	return false;
}


/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.kirkusreviews.com/book-reviews/stephen-king/other-worlds-than-these/",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "Other Worlds Than These",
				"creators": [],
				"date": "2026-07-06",
				"ISSN": "1948-7428",
				"abstractNote": "King wraps up a trilogy he and fellow horror-meister Straub began 42 years ago with The Talisman (1984) and continued with Black House (2001). Straub died in 2022, but, King recounts in a gracious afterword, he suggested that the last volume in the Talisman series pick up the story of real-life mass murderers Charlie Starkweather and Caril Ann Fugate and transfer it to the otherworldly Territories. King obliges, landing hero Jack Sawyer in the middle of great unpleasantness while visiting “America-side.” Jack, whom we first met as a 12-year-old, is now middle-aged and world-weary (make that worlds-weary), but he knows he’s on to something interesting when he hears tell of the rampage inflicted on the quiet Nebraska countryside by Roy Kinneston and Tara Lynn Speckhoffer, emulating their murderous predecessors victim by victim. Because “many people on America-side have counterparts in the Territories,” the teenage killers turn up there, too, recruiting young acolytes who dye their hair red and, as if on a new Children’s Crusade, kill everything in sight, leaving behind the chilling graffito “Dead People Don’t Care.” Jack bops back and forth between realms through a kind of magic that flummoxes the America-siders, especially the cop who first jails him and, after Jack disappears because he senses that “something is wrong on the other side,” becomes a grudging admirer on his return. The action goes more supernatural still when Jack and his merry Mid-Worlder band fight back in earnest against the Kinneston-Speckhoffer cultists, a battle that takes them to a scary underworld setting that’s just right for an apocalyptic showdown. A few figures from the earlier two novels have walk-on roles, but otherwise, as King cooks up his diabolical splatterfest, he answers an old question: “What fresh hell is this?”",
				"extra": "publisher-place: New York City\nBook author: Stephen King\nBook author: Peter Straub\nBook publication date: 2026-10-06\nISBN: 9781668233092\nPage count: 624\nPublisher: Scribner\nSeries: Talisman series, Vol. 3",
				"issue": "2026-08-01",
				"language": "en-US",
				"libraryCatalog": "Kirkus Reviews",
				"publicationTitle": "Kirkus Reviews",
				"url": "https://www.kirkusreviews.com/book-reviews/stephen-king/other-worlds-than-these/",
				"attachments": [
					{
						"title": "Kirkus Reviews snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Epic Fantasy"
					},
					{
						"tag": "Fiction"
					},
					{
						"tag": "General Fiction"
					},
					{
						"tag": "Science Fiction & Fantasy"
					},
					{
						"tag": "Supernatural Thriller"
					},
					{
						"tag": "Thriller & Suspense"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.kirkusreviews.com/book-reviews/barbara-kingsolver/partita/",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "Partita",
				"creators": [],
				"date": "2026-07-06",
				"ISSN": "1948-7428",
				"abstractNote": "A phone call from her past disrupts the tenuously reconstructed life of a concert pianist turned farmer’s wife. We know from the beginning that Livia Cable is the battered survivor of her brother Cyrus’ death by suicide, a devastating romance, and a career-ending injury. Only 11 when Cyrus stepped in front of a train, she was already marked out as different in her rural Tennessee hometown by her extraordinary musical ability. The siblings had huddled together against their angry mother’s frequent beatings, and Livia still feels abandoned by Cyrus years later, when she picks up the phone to hear the voice of Sigurd, the fiery labor organizer she loved and lost to “the revolution” while on scholarship at the Indiana University School of Music. Now married to kind, steady childhood friend Charlie, Livia looks back on her affair with Sigurd as she struggles to deal with the recent death of her mother, a compulsive hoarder who left a house stuffed with junk to be disposed of and bitter memories that haven’t faded over time. Kingsolver skillfully juggles the two time frames to unravel Livia’s complicated feelings about the life she lost when her right hand was crushed and the life she has now as a country piano teacher. A partita, she explains to Sigurd early on, “is a composition made of a lot of parts with a lot of different moods…the artist’s work is to make them all add up to something that feels whole.” That’s precisely what Kingsolver does in this beautifully paced and judged narrative, which builds to revelations uncovered amid the piles of trash in Livia’s childhood home about the reasons for Cyrus’ suicide (clearly foreshadowed) and their mother’s rage (startling and heartbreaking). A fierce belief that great art is for everyone joins Kingsolver’s familiar preoccupations with class distinctions, social injustice, and the complex bonds of family and community in a tender denouement.",
				"extra": "publisher-place: New York City\nBook author: Barbara Kingsolver\nBook publication date: 2026-10-06\nISBN: 9780063577541\nPage count: 352\nPublisher: Harper/HarperCollins\nKirkus Star",
				"issue": "2026-08-01",
				"language": "en-US",
				"libraryCatalog": "Kirkus Reviews",
				"publicationTitle": "Kirkus Reviews",
				"url": "https://www.kirkusreviews.com/book-reviews/barbara-kingsolver/partita/",
				"attachments": [
					{
						"title": "Kirkus Reviews snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Fiction"
					},
					{
						"tag": "General Fiction"
					},
					{
						"tag": "Literary Fiction"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.kirkusreviews.com/audiobook-reviews/bonnie-garmus/peck-peck/",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "Peck & Peck",
				"creators": [],
				"ISSN": "1948-7428",
				"abstractNote": "Narrator Seth Numrich delivers just the right mix of innocence, cockiness, and dimwittedness to make this wildly silly and comically perceptive sendup of all things publishing and poetic an absolute listening pleasure. Batter Gray (named after his mother’s dog) has just graduated college and is ready to make it big in the Big Apple. Unfortunately, his only skill is an “ear” for poetry. Luckily, he lands a job at one of the most famous poetry magazines in the world. Numrich is at his best giving entertaining character voices to Batter’s smothering mother, who is keeping a few secrets, and his overbearing boss, who has secrets of his own.",
				"extra": "publisher-place: New York City\nBook author: Bonnie Garmus\nNarrator: Seth Numrich\nISBN: 9781668193181\nPublisher: Simon & Schuster Audio\nDuration: 17 hrs, 9 mins",
				"language": "en-US",
				"libraryCatalog": "Kirkus Reviews",
				"publicationTitle": "Kirkus Reviews",
				"url": "https://www.kirkusreviews.com/audiobook-reviews/bonnie-garmus/peck-peck/",
				"attachments": [
					{
						"title": "Kirkus Reviews snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Fiction"
					},
					{
						"tag": "General Fiction"
					},
					{
						"tag": "Literary Fiction"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.kirkusreviews.com/book-reviews/kevin-henkes/poppy/",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "Poppy",
				"creators": [],
				"date": "2010-05-19",
				"ISSN": "1948-7428",
				"abstractNote": "An adolescent mouse named Poppy is off on a romantic tryst with her rebel boyfriend when they are attacked by Mr. Ocax, the owl who rules over the area. He kills the boyfriend, but Poppy escapes and Mr. Ocax vows to catch her. Mr. Ocax has convinced all the mice that he is their protector when, in fact, he preys on them mercilessly. When the mice ask his permission to move to a new house, he refuses, blaming Poppy for his decision. Poppy suspects that there is another reason Mr. Ocax doesn't want them to move and investigates to clear her name. With the help of a prickly old porcupine and her quick wits, Poppy defeats her nemesis and her own fears, saving her family in the bargain.",
				"extra": "publisher-place: New York City\nBook author: Avi\nIllustrator: Brian Floca\nBook publication date: 1995-10-01\nISBN: 0-531-09483-9\nPage count: 147\nPublisher: Orchard\nSeries: Poppy series, Vol. 3",
				"issue": "1995-09-15",
				"language": "en-US",
				"libraryCatalog": "Kirkus Reviews",
				"publicationTitle": "Kirkus Reviews",
				"url": "https://www.kirkusreviews.com/book-reviews/kevin-henkes/poppy/",
				"attachments": [
					{
						"title": "Kirkus Reviews snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Children's"
					},
					{
						"tag": "General Children's"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.kirkusreviews.com/book-reviews/kevin-henkes/poppy/print/",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "Poppy",
				"creators": [],
				"date": "2010-05-19",
				"ISSN": "1948-7428",
				"abstractNote": "An adolescent mouse named Poppy is off on a romantic tryst with her rebel boyfriend when they are attacked by Mr. Ocax, the owl who rules over the area. He kills the boyfriend, but Poppy escapes and Mr. Ocax vows to catch her. Mr. Ocax has convinced all the mice that he is their protector when, in fact, he preys on them mercilessly. When the mice ask his permission to move to a new house, he refuses, blaming Poppy for his decision. Poppy suspects that there is another reason Mr. Ocax doesn't want them to move and investigates to clear her name. With the help of a prickly old porcupine and her quick wits, Poppy defeats her nemesis and her own fears, saving her family in the bargain.",
				"extra": "publisher-place: New York City\nBook author: Avi\nIllustrator: Brian Floca\nBook publication date: 1995-10-01\nISBN: 0-531-09483-9\nPage count: 147\nPublisher: Orchard\nSeries: Poppy series, Vol. 3",
				"issue": "1995-09-15",
				"language": "en-US",
				"libraryCatalog": "Kirkus Reviews",
				"publicationTitle": "Kirkus Reviews",
				"url": "https://www.kirkusreviews.com/book-reviews/kevin-henkes/poppy/",
				"attachments": [
					{
						"title": "Kirkus Reviews snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Children's"
					},
					{
						"tag": "General Children's"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.kirkusreviews.com/book-reviews/larry-mcmurtry/lonesome-dove/",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "Lonesome Dove",
				"creators": [],
				"date": "2011-09-30",
				"ISSN": "1948-7428",
				"abstractNote": "This large, stately, and intensely powerful new novel by the author of Terms of Endearment and The Last Picture Show is constructed around a cattle drive—an epic journey from dry, hard-drinking south Texas, where a band of retired Texas Rangers has been living idly, to the last outpost and the last days of the old, unsettled West in rough Montana. The time is the 1880s. The characters are larger than life and shimmer: Captain Woodrow Call, who leads the drive, is the American type of an unrelentingly righteous man whose values are puritanical and pioneering and whose orders, which his men inevitably follow, lead, toward the end, to their deaths; talkative Gus McCrae, Call's best friend, learned, lenient, almost magically skilled in a crisis, who is one of those who dies; Newt, the unacknowledged 17-year-old son of Captain Call's one period of self-indulgence and the inheritor of what will become a new and kinder West; and whores, drivers, misplaced sheriffs and scattered settlers, all of whom are drawn sharply, engagingly, movingly. As the rag-tag band drives the cattle 3,000 miles northward, only Call fails to learn that his quest to conquer more new territories in the West is futile—it's a quest that perishes as men are killed by natural menaces that soon will be tamed and by half-starved renegades who soon will die at the hands of those less heroic than themselves. McMurtry shows that it is a quest misplaced in history, in a landscape that is bare of buffalo but still mythic; and it is only one of McMurtry's major accomplishments that he does it without forfeiting a grain of the characters' sympathetic power or of the book's considerable suspense.",
				"extra": "publisher-place: New York City\nBook author: Larry McMurtry\nBook publication date: 1985-06-01\nISBN: 068487122X\nPage count: 872\nPublisher: Simon & Schuster",
				"issue": "1985-05-15",
				"language": "en-US",
				"libraryCatalog": "Kirkus Reviews",
				"publicationTitle": "Kirkus Reviews",
				"url": "https://www.kirkusreviews.com/book-reviews/larry-mcmurtry/lonesome-dove/",
				"attachments": [
					{
						"title": "Kirkus Reviews snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Fiction"
					},
					{
						"tag": "General Fiction"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.kirkusreviews.com/discover-books/thriller-suspense/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.kirkusreviews.com/search/books/?q=stephen+king",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.kirkusreviews.com/news-and-features/articles/murder-hits-close-work/",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "A Murder That Hits Close to…Work",
				"creators": [
					{
						"firstName": "Laurie",
						"lastName": "Muchnick",
						"creatorType": "author"
					}
				],
				"date": "2017-03-08",
				"ISSN": "1948-7428",
				"abstractNote": "You know how when you read a book in a particularly lovely setting, your memories of the story get tangled up in the memories of the place where you read it? I can never think of Elinor Lipman without picturing the Massachusetts hammock where I devoured The Ladies’ Man in 1999, for instance. But reading a book in an unhappy place can be just as transformative, and I found myself bonded to Judith Flanders’ Samantha Clair mystery series in the course of a long night in the ER when I had pneumonia last fall. As I spent eight hours waiting for a CT scan, I was glad to distract myself with A Murder of Magpies, the first novel featuring Sam, a London book editor who finds herself investigating the disappearance of one of her authors—a gossip columnist—in between having lunch with agents, writing cover memos, and trying to figure out if her star writer’s new novel is as bad as she thinks it is. The cover of A Murder of Magpies has blurbs by two of my favorite mystery writers, Donna Leon and Louise Penny. (Since we’re talking about the business of publishing, why not mention the blurbs?) Like those two, Flanders has created a distinctive hero and placed her in a fully realized world—and the fact that it’s the book world makes this series irresistible.",
				"extra": "publisher-place: New York City",
				"language": "en-US",
				"libraryCatalog": "Kirkus Reviews",
				"publicationTitle": "Kirkus Reviews",
				"url": "https://www.kirkusreviews.com/news-and-features/articles/murder-hits-close-work/",
				"attachments": [
					{
						"title": "Kirkus Reviews snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Perspectives"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.kirkusreviews.com/news-and-features/articles/winners-of-the-2026-kirkus-prize-revealed/",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "Winners of the 2026 Kirkus Prize Revealed",
				"creators": [
					{
						"firstName": "Mark",
						"lastName": "Athitakis",
						"creatorType": "author"
					}
				],
				"date": "2026-10-07",
				"ISSN": "1948-7428",
				"abstractNote": "Tayari Jones, Pamela Colloff, and Elizabeth Acevedo are the winners of this year’s Kirkus Prizes, given annually by Kirkus Reviews to works of exceptional merit in the categories of fiction, nonfiction, and young readers’ literature. The winners of the awards were announced Wednesday night during a ceremony at the TriBeca Rooftop in New York. The event was also livestreamed on Kirkus’ YouTube channel. Jones won the fiction prize for Kin, about the experiences of two lifelong friends growing up motherless in Louisiana. In a citation, the prize jurors wrote, “In a powerfully compelling novel that brims with the cadences of the Black South, Jones explores the women’s diverging lives while using them as a lens to observe social injustice in language that is intimate, conversational, and musical.” The jurors for the fiction prize were Kimberly Brock, adult book buyer at Joseph-Beth Booksellers in Cincinnati; Karen R. Long, a Kirkus reviewer and former manager of the Anisfield-Wolf Book Awards; and Kirkus fiction editor Laurie Muchnick. Colloff took home the nonfiction award for Catch the Devil: A True Story of Murder, Deception, and Injustice on the Gulf Coast, which investigates and questions the 1987 conviction of Jim Dailey for the murder of a 14-year-old girl, Shelly Boggio. In a citation, the prize jurors praised “Colloff’s exposure of a criminal justice system that is all too happy to look the other way in cutting deals that can have devastating consequences.” The jurors for the nonfiction prize were Bonnie Tsui, an award-winning journalist and author of On Muscle and other books; Nora Krug, a writer and former editor at the Washington Post Book World; and Kirkus nonfiction editor John McMurtrie. The winner of the young readers’ literature prize was Elizabeth Acevedo’s Anger Is Only a Shadow, about a teenage girl’s encounter with the juvenile justice system and the mental health challenges faced by her brother. In a citation, the prize jurors wrote, “Nuanced, resonant verse paints a clear-eyed, profoundly loving portrait of a teen navigating the complexities of growing up. Acevedo’s cast of fully rounded, compassionately drawn characters will live on in readers’ hearts.” The jurors for the young readers’ literature prize were Sarah Park Dahlen, associate professor at the School of Information Sciences at the University of Illinois Urbana-Champaign and a board member of the International Research Society for Children’s Literature; Leah Johnson, author of You Should See Me in a Crown and other books and the owner of Loudmouth Books in Indianapolis; and Kirkus young readers’ editors Mahnaz Dar and Laura Simeon. The winners of the prizes were chosen from books that received a starred review from Kirkus Reviews during the eligibility period of Nov. 1, 2025 to Oct. 31, 2026. The winning authors each receive a trophy created by the London design team of Vezzini & Chen, along with a cash prize of $50,000. In a statement, Tom Beer, editor-in-chief of Kirkus, said, “Readers can rejoice over the winners of this year’s Kirkus Prize; these are remarkably accomplished works of fiction and nonfiction that nevertheless wear their accomplishments lightly. Above all, they are unforgettable books that will engage and transform all who enter their pages.” The Kirkus Prize was first awarded in 2014. Previous winners include James McBride for The Heaven & Earth Grocery Store, Adam Higginbotham for Challenger: A True Story of Heroism and Disaster on the Edge of Space, and New Kid by Jerry Craft.",
				"extra": "publisher-place: New York City",
				"language": "en-US",
				"libraryCatalog": "Kirkus Reviews",
				"publicationTitle": "Kirkus Reviews",
				"url": "https://www.kirkusreviews.com/news-and-features/articles/winners-of-the-2026-kirkus-prize-revealed/",
				"attachments": [
					{
						"title": "Kirkus Reviews snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Awards"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.kirkusreviews.com/news-and-features/articles/author-john-green-sets-guinness-world-record/",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "Author John Green Sets Guinness World Record",
				"creators": [
					{
						"firstName": "Michael",
						"lastName": "Schaub",
						"creatorType": "author"
					}
				],
				"date": "2026-09-25",
				"ISSN": "1948-7428",
				"abstractNote": "John Green wrote one of the top bestsellers books in publishing history, and now he’s added another distinction to his résumé. The author has been recognized with a Guinness World Record for the most tip-in sheets signed by an author in their lifetime, having given his John Hancock to a staggering 875,557 pages. Tip-in sheets are printed separately from a book and later attached to it; publishers frequently use them to include authors’ autographs. Green has sold more than 50 million copies of his books, with his 2012 young adult novel, The Fault in Our Stars, responsible for nearly half of that number. His other books, including Looking for Alaska, Paper Towns, Turtles All the Way Down, and Everything Is Tuberculosis have all been bestsellers. Green’s latest novel, Hollywood, Ending—his first for adults—was published Tuesday by Dutton. In a starred review, a critic for Kirkus called the book “a classic Green portrait of young love…but here the fault is in our social media.” He launched the book on Tuesday at an event in Brooklyn, where Guinness World Records adjudicator Ryan Masserano presented him with the award. “This is a special accomplishment that I am proud to have achieved,” Green said. “Tonight, I get to go to sleep as a Guinness World Records title holder!” It is, of course, an impressive achievement. But if you happen to see Green on the street, maybe don’t give him a vigorous handshake.",
				"extra": "publisher-place: New York City",
				"language": "en-US",
				"libraryCatalog": "Kirkus Reviews",
				"publicationTitle": "Kirkus Reviews",
				"url": "https://www.kirkusreviews.com/news-and-features/articles/author-john-green-sets-guinness-world-record/",
				"attachments": [
					{
						"title": "Kirkus Reviews snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Seen & Heard"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.kirkusreviews.com/writers-center/publishing/biggest-myths-about-self-publishing/",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "The Biggest Myths About Self-Publishing",
				"creators": [
					{
						"firstName": "Andrea",
						"lastName": "Moran",
						"creatorType": "author"
					}
				],
				"date": "2026-08-14",
				"ISSN": "1948-7428",
				"abstractNote": "If you’re considering self-publishing as a way to get your book read and seen, you probably have quite a few questions about the process. The good news is that the internet has a lot of opinions on the matter. The bad news is . . . that the internet has a lot of opinions on the matter. Alongside some genuinely helpful information are a lot of myths and rumors about what it means to self-publish. Read on for some of the more common ones—as well as what you can really expect on your self-publishing journey. Indie publishing and self-publishing are the same thing.Some people tend to use the terms indie publishing and self-publishing interchangeably, but they’re actually two completely different things. Indie publishing means that your book is still being published by a professional press—just not one that is affiliated with any of the Big Five publishers or their smaller imprints. The Big Five, by the way, are Penguin Random House, with imprints like Viking and Doubleday; HarperCollins, with imprints like William Morrow and Avon; Simon & Schuster, with imprints like Scribner and Atria; Macmillan Publishers, with imprints like St. Martin’s Press and Farrar, Straus and Giroux; and Hachette Book Group, with imprints like Grand Central and Little, Brown and Company. Indie publishers vary wildly in both the content that they publish and the quality with which they do so. They also accept and reject manuscripts in a similar manner as the Big Five. Self-publishing, on the other hand, is exactly what it sounds like: the independent publication of a book by its author (aka: you). You can’t make as much money by self-publishing.While traditional publishers may have the means to offer those multibook, multimillion-dollar contracts that we tend to hear about, the fact is that those are rare. Extremely rare. And those often involve advances, which means that you’d have to make that amount back in sales before you ever saw a dime from any sort of royalties. When you self-publish, you earn a much higher percentage of royalties since you have more control over the product. If your book happens to go viral and you see impressive sales, you could very well earn more money than if you had punted it to a Big Five or indie publisher. You only have to worry about marketing if you self-publish.Many authors don’t want to deal with the marketing aspect of their book and are therefore tempted to submit their manuscripts to traditional publishers with the idea that the publisher will take care of marketing for them. Please know the chances are extremely high that you will have to aggressively market your book—even if you are picked up by one of the Big Five, and especially if you go through an indie publisher. Traditional publishers tend to pick and choose just a few titles to throw their money behind in the expectations that those will be their most successful. So unless you’re one of the chosen few, you’ll likely be largely on your own when it comes to marketing anyway—just like if you self-publish! There is a certain formula that leads to a successful book.Wouldn’t it be lovely if writers could be handed a formula for success? “Just do X, Y, and Z, and watch your sales skyrocket!” The truth is, however, that no one really knows what they’re doing in the wild world of self-publishing. What works one month may completely backfire the next. Trends come and go, tastes change, new avenues of marketing or selling a book pop up only to be replaced by something even newer the next year. That’s why it’s important to take everything with a grain of salt and to focus on what really matters: writing a quality manuscript. Because if you go chasing fame or fortune or viral sales, you’ll likely wind up frustrated and burned out. It’s easier to self-publish.It’s not hard to see how this idea has gained so much steam over the years. After all, it’s nice to not have to submit a manuscript to dozens of agents or publishers, waiting to hear back or culling through rejection letters. Instead, you can just . . . publish it yourself. And in that sense, it is easier to self-publish. But make no mistake: That’s where the simplicity ends. As a self-publisher, it is now up to you to be in charge of everything. From hiring an editor (yes, you need an editor—everyone does), to hiring a professional artist to design your cover (no, you should not try to do this yourself unless you also happen to be a professional designer), to writing the blurb on the back of the book, to marketing your book via social media. In other words, it’s a multistep process that takes a lot of work if you want to make your book look professional—and that’s the ultimate goal, isn’t it?",
				"extra": "publisher-place: New York City",
				"language": "en-US",
				"libraryCatalog": "Kirkus Reviews",
				"publicationTitle": "Kirkus Reviews",
				"url": "https://www.kirkusreviews.com/writers-center/publishing/biggest-myths-about-self-publishing/",
				"attachments": [
					{
						"title": "Kirkus Reviews snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Publishing"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.kirkusreviews.com/writers-center/writing/how-protect-your-writing-ai/",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "How to Protect Your Writing from AI",
				"creators": [
					{
						"firstName": "Chelsea",
						"lastName": "Ennen",
						"creatorType": "author"
					}
				],
				"date": "2026-09-04",
				"ISSN": "1948-7428",
				"abstractNote": "If you’re a writer, you likely know about the lawsuit against Anthropic, where authors of books that were stolen to create large language models sued for copyright infringement. Despite the lawsuit’s success in winning a $1.5 billion payout, even the people involved admit that the fight against AI is long from over. There is reason to be concerned that these massive companies can just write off payouts as the cost of doing business until there is actual regulation, but waiting for those protections to materialize before publishing means putting your dreams on hold indefinitely. Luckily there are a few key places to look to find out what might be happening to your words without your permission. And when you have that knowledge, you’ll be better equipped to protect your work. Read Your Contracts If you are taking a traditional path to publishing, there is going to be a point when the publisher gives you a contract to sign. While it would be nice to think that publishers would inherently want to protect writing as an art form, you can never be too sure, and the stakes are too high to take anything for granted. You might know to read your contracts, and to have your agent read your contracts, but you might want to expand that circle to a lawyer. Depending on how resourced your agency is, they might have an in-house lawyer to check it over, and they might have proactively developed anti-AI language they put in all of their clients’ contracts. Talk to your agent about your concerns, seek out legal counsel, and make it clear to your agency that at least one of their clients would support a company-wide AI policy if they don’t already have one. If you’re an independent author, you need to read the small print of whatever service you’re using to host your work. If you’re using a big platform like Amazon, there is likely some degree of press coverage around this issue, and you should be able to dig up any relevant passages in your terms and conditions, possibly without needing a lawyer’s consultation. If you’re using a smaller platform, you should reach out directly to the staff and ask. In this highly charged conversation, you will not be the first person to ask, and they should be ready with an answer. Hide Your Drafts While it’s a novel idea for us today, hundreds of years from now, people will cite the phrase “If you aren’t paying for it, you are the product” as some kind of ancient proverb. Referring to services like Google and social media platforms, the idea is that we should be mindful of how valuable personal information is to big corporations. For example, if you don’t deny cookies while surfing the web, data brokers can use your browsing behavior to show you targeted ads. That’s why it’s free to do a search on Google but if you look up “what’s the best toaster” once, you’ll be inundated with toaster ads for weeks. Google tools are incredibly popular for writers because the Google Docs app is an easy way to protect your writing via the cloud. Not only can you access your draft from any internet-connected device, anywhere in the world, but if you spill coffee all over your laptop and fry your hard drive, your work will be safe. But does that convenience come at a cost? Google itself says no, it does not steal your Google Docs material for AI training, but it would be wise to be a bit wary. Word processors like Scrivener come at a one-time cost and give you options to back up your work to cloud services like Dropbox. Paranoia isn’t the worst trait to have while dealing with major corporations, and a one-time payment for an independent word processor might be worth it. Or, even better, go back to pen and paper for your rough drafts and notes! The Company You Keep It feels like the Wild West out here in publishing today, with a wide range of opinions on what constitutes appropriate use of AI tools and what AI even means; after all, isn’t spell-check a form of AI? Some people like to cite services like spell-check or professional-grade coding tools as evidence that anyone who argues against AI is a hypocrite fighting a losing battle. But there’s a big difference between getting help spelling the word lieutenant and opting out of the actual work of creative writing. Even if your agent or publisher is willing to put anti-AI language into your contract, you should see it as a red flag if they would have been willing to resell your work to a tech giant had you not spoken up. If your self-publishing platform promises not to break your story into parts to feed the machine but is happy to sell AI slop on the same digital shelf as your work, then you deserve better. Stay Educated, Stay Sane While many artists are rightfully upset about what tech billionaires are doing to their industry, it's important not to let your resentment eat up your life. If you start to find it hard to engage in writing stories without feeling dismay that it’s all for nothing, then the chatbots win. Try to stay up to date on big news items, preferably from reputable news sources rather than your other angry friends on social media. Make yourself knowledgeable enough to protect your work but then unplug, go outside, and continue to lead the kind of rich, full life that will fuel your inimitable human creativity.",
				"extra": "publisher-place: New York City",
				"language": "en-US",
				"libraryCatalog": "Kirkus Reviews",
				"publicationTitle": "Kirkus Reviews",
				"url": "https://www.kirkusreviews.com/writers-center/writing/how-protect-your-writing-ai/",
				"attachments": [
					{
						"title": "Kirkus Reviews snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Writing"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.kirkusreviews.com/book-reviews/henry-kissinger/the-age-of-ai/",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "The Age of AI",
				"creators": [],
				"date": "2021-10-12",
				"ISSN": "1948-7428",
				"abstractNote": "Kissinger, Schmidt, and Huttenlocher weigh in on the robotic future. When thinking of Kissinger in the context of futurology, one might conjure the image of Stanley Kubrick’s Dr. Strangelove; after all, it’s said that he served as the model for the character. Instead, think of the 1983 film War Games, in which young Matthew Broderick nearly touches off thermonuclear war with his computer tinkering. As that latter film showed, AI involves machines learning to think for themselves—and when they do so while lacking “preprogrammed moves, combinations, or strategies derived from human play,” the machines learn by their own rules. This can be good: One AI routine that the authors discuss figured out a new pharmaceutical formula that humans might never have discovered. But there’s a catch, potentially ominous: “The advent of AI obliges us to confront whether there is a form of logic that humans have not achieved or cannot achieve, exploring aspects of reality we have never known and may never directly know.” The book then spins off into an area Kissinger knows best: how AI might be put to work in the realm of national and international security, developing systems that may keep us all safe—or, alternately, that “will be so responsive that adversaries may attempt to attack before the systems are operational.” All this begs the need for international accords on the use of AI, and we must better understand the machines already showing the promise of outstripping some of our mental processes, an understanding that will allow us to “make peace with them and, in so doing, change the world.” Some parts of this policy paper seem to be mere padding, as with the side tour into Kant’s notion of the Ding an sich, but some will be of interest to students of arms control, future battlespaces, and the like.",
				"extra": "publisher-place: New York City\nBook author: Henry A. Kissinger\nBook author: Eric Schmidt\nBook author: Daniel Huttenlocher\nBook publication date: 2021-11-02\nISBN: 978-0-316-27380-0\nPage count: 272\nPublisher: Little, Brown",
				"issue": "2021-11-01",
				"language": "en-US",
				"libraryCatalog": "Kirkus Reviews",
				"publicationTitle": "Kirkus Reviews",
				"url": "https://www.kirkusreviews.com/book-reviews/henry-kissinger/the-age-of-ai/",
				"attachments": [
					{
						"title": "Kirkus Reviews snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Current Events & Social Issues"
					},
					{
						"tag": "General Current Events & Social Issues"
					},
					{
						"tag": "Issues & Controversies"
					},
					{
						"tag": "Nonfiction"
					},
					{
						"tag": "Science & Technology"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
