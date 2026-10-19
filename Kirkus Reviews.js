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
Kirkus Reviews book and audiobook reviews. The page is dressed up with the
reviewed book's metadata (the JSON-LD @type is even "Book"), but what it
represents is an unsigned review in Kirkus Reviews: the h1 is the reviewed
book's title in ALL CAPS, the "by" line names the book's contributors, and the
review's own publication date is buried in the third column of the details
block as "Review Posted Online". The review has no byline, so it gets no
creators; the book's people and metadata are recorded as labels in extra.
*/


function detectWeb(doc, url) {
	// review pages: /book-reviews/<author>/<slug>/ and /audiobook-reviews/<author>/<slug>/
	// (the /print/ variant has its own stripped-down markup, hence the second check)
	if (/\/(?:book|audiobook)-reviews\/[^/]+\/[^/]+/.test(new URL(url).pathname)
		&& (doc.querySelector('#review-body') || doc.querySelector('h1.book_detail_title'))) {
		return "magazineArticle";
	}
	if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	// result cards on discover/section pages, author pages and search pages
	var rows = doc.querySelectorAll('a.card-text[href*="/book-reviews/"], a.card-text[href*="/audiobook-reviews/"]');
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
	item.title = ZU.capitalizeTitle(title, true);

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

	// the byline names the book's contributors ("by X & illustrated by Y",
	// "read by Z" for audiobooks); the review itself is unsigned, so nobody here
	// is an author of the item - they are recorded as labels instead
	let extra = [];
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
				"extra": "Book author: Stephen King\nBook author: Peter Straub\nBook publication date: 2026-10-06\nISBN: 9781668233092\nPage count: 624\nPublisher: Scribner\nSeries: Talisman series, Vol. 3",
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
				"extra": "Book author: Barbara Kingsolver\nBook publication date: 2026-10-06\nISBN: 9780063577541\nPage count: 352\nPublisher: Harper/HarperCollins\nKirkus Star",
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
				"extra": "Book author: Bonnie Garmus\nNarrator: Seth Numrich\nISBN: 9781668193181\nPublisher: Simon & Schuster Audio\nDuration: 17 hrs, 9 mins",
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
				"extra": "Book author: Avi\nIllustrator: Brian Floca\nBook publication date: 1995-10-01\nISBN: 0-531-09483-9\nPage count: 147\nPublisher: Orchard\nSeries: Poppy series, Vol. 3",
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
				"extra": "Book author: Avi\nIllustrator: Brian Floca\nBook publication date: 1995-10-01\nISBN: 0-531-09483-9\nPage count: 147\nPublisher: Orchard\nSeries: Poppy series, Vol. 3",
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
				"extra": "Book author: Larry McMurtry\nBook publication date: 1985-06-01\nISBN: 068487122X\nPage count: 872\nPublisher: Simon & Schuster",
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
	}
]
/** END TEST CASES **/
