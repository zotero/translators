{
	"translatorID": "50eae488-fb64-4739-a2d8-2294a3548213",
	"label": "Common Sense Media",
	"creator": "Vera de Kok",
	"target": "^https?://(www\\.)?commonsensemedia\\.org/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-10-19 00:00:00"
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

const SITE_NAME = 'Common Sense Media';

// English and Spanish editions use different review paths (tv-reviews vs.
// resenas-tv, and resenas-sitio-web for a hyphenated kind), and the path also
// tells the reviewed work's kind when the page does not say so in its JSON-LD.
const REVIEW_PATH = /\/(?:es\/)?(?:[a-z]+(?:-[a-z]+)*-reviews?|resenas?-[a-z]+(?:-[a-z]+)*|ai-ratings)\/([^/]+)\/?$/;

// User reviews live under a review page and are not works of their own.
const USER_REVIEW_PATH = /\/(?:user-reviews?|resenas?-usuario)\//;

// Advice articles carry no rating and no reviewed work, but they are single
// pages with their own date and (organisation) byline.
const ARTICLE_PATH = /\/(?:es\/)?(?:articulos|articles)\/([^/]+)\/?$/;

// Search and browse pages render their result list client-side from
// /ajax/search/<the same path arguments as the page>. "/search/test" and
// "/search/category/movie/sort/date-desc" both go through this.
const SEARCH_PAGE = /^\/(?:es\/)?(?:search|buscar)(?:\/|$)/;

// Keyed by the path segment with "-reviews"/"resenas-" stripped, so English and
// Spanish both land here.
const KIND_NAMES = {
	movie: 'movie',
	book: 'book',
	tv: 'TV series',
	app: 'app',
	appl: 'app',
	game: 'video game',
	videojuego: 'video game',
	website: 'website',
	'sitio-web': 'website',
	sitio: 'website',
	music: 'album',
	ai: 'AI tool',
	ia: 'AI tool',
	pelicula: 'movie',
	libro: 'book',
	aplicacion: 'app',
	juego: 'video game',
};

// Byline prefixes on the rendered page ("By Ashley Moulton", "Por Matt Berman").
const BYLINE_PREFIX = /^(?:by|por|written by|reviewed by|reseña de)\s+/i;

// The reviewed work's own type, used for the "[Review of the ...]" part.
const WORK_TYPES = [
	'Book',
	'Movie',
	'TVSeries',
	'TVEpisode',
	'TVSeason',
	'VideoGame',
	'MobileApplication',
	'SoftwareApplication',
	'VideoObject',
	'MusicAlbum',
	'Product',
	'CreativeWork',
];

function detectWeb(doc, url) {
	if (url.match(REVIEW_PATH) || url.match(ARTICLE_PATH)) {
		return 'webpage';
	}
	if (isSearchPage(url) || getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

function isSearchPage(url) {
	let pathname;
	try {
		pathname = new URL(url).pathname;
	}
	catch (e) {
		return false;
	}
	return SEARCH_PAGE.test(pathname);
}

// The search page's own markup carries no results: the list is fetched from
// /ajax/search/<path arguments> and rendered client-side, so the results have to
// be requested rather than read out of the document.
async function getSearchPageResults(url) {
	let pathname = new URL(url).pathname.replace(/^\/es\//, '/').replace(/^\/buscar/, '/search');
	let json;
	try {
		json = await requestJSON('https://www.commonsensemedia.org/ajax' + pathname);
	}
	catch (e) {
		return false;
	}
	let items = {};
	for (let result of json.items || []) {
		if (!result.url || !result.title) continue;
		let resultUrl = new URL(result.url, 'https://www.commonsensemedia.org/');
		let resultPath = resultUrl.pathname;
		// Only what this translator can scrape: the same page also lists top-picks
		// lists, videos, press releases and about pages.
		if (!resultPath.match(REVIEW_PATH) && !resultPath.match(ARTICLE_PATH)) continue;
		if (resultPath.match(USER_REVIEW_PATH)) continue;
		items[resultUrl.href] = clean(result.title);
	}
	return Object.keys(items).length ? items : false;
}

function getLDNodes(doc) {
	let nodes = [];
	for (let script of doc.querySelectorAll('script[type="application/ld+json"]')) {
		let data;
		try {
			data = JSON.parse(script.textContent);
		}
		catch (e) {
			continue;
		}
		for (let block of [].concat(data)) {
			if (!block || typeof block != 'object') continue;
			for (let node of [].concat(block['@graph'] || block)) {
				if (node && typeof node == 'object') nodes.push(node);
			}
		}
	}
	return nodes;
}

// The JSON-LD payload keeps HTML entities, so "Thomas &amp; Friends" arrives
// escaped even though it is not markup.
function clean(value) {
	return ZU.unescapeHTML(ZU.trimInternal(value || ''));
}

function hasType(node, types) {
	return types.includes(node['@type']);
}

// CriticReview on review pages, plain Review on pages for older apps and games.
function getReviewNode(nodes) {
	return nodes.find(node => hasType(node, ['CriticReview', 'Review'])) || null;
}

function findByID(nodes, id) {
	return id ? nodes.find(node => node['@id'] == id) || null : null;
}

// The reviewed work, resolved through the review's itemReviewed (an @id
// reference on most pages, an inline node on app pages) and, failing that,
// through the WebPage's about. A generic "first work type" search would pick
// up the site's own WebSite node, which is named "Common Sense Media".
function getWorkNode(nodes, review) {
	if (review && review.itemReviewed) {
		let reviewed = findByID(nodes, review.itemReviewed['@id']) || review.itemReviewed;
		if (reviewed && (hasType(reviewed, WORK_TYPES) || reviewed.name)) return reviewed;
	}
	let page = nodes.find(node => node['@type'] == 'WebPage');
	let about = page && findByID(nodes, page.about && page.about['@id']);
	if (about) return about;
	return nodes.find(node => hasType(node, WORK_TYPES)) || null;
}

function getKind(doc, work) {
	// ".../tv-reviews/bluey" -> "tv"; ".../es/resenas-sitio-web/disney" -> "sitio-web".
	let match = doc.location.pathname.match(/\/([a-z]+(?:-[a-z]+)*)\/(?:[^/]+)\/?$/);
	let fromPath = match && KIND_NAMES[match[1].replace(/-reviews?$/, '').replace(/^resenas?-/, '')];
	if (fromPath) return fromPath;
	let type = work && work['@type'];
	switch (type) {
		case 'Book': return 'book';
		case 'Movie': return 'movie';
		case 'TVSeries':
		case 'TVEpisode':
		case 'TVSeason': return 'TV series';
		case 'VideoGame': return 'video game';
		case 'MobileApplication':
		case 'SoftwareApplication': return 'app';
		case 'MusicAlbum': return 'album';
		default: return '';
	}
}

function getSearchResults(doc, checkOnly) {
	// List pages declare their reviews in an ItemList, which gives clean titles
	// ("See full review" is what the card's call-to-action says).
	let items = {};
	for (let node of getLDNodes(doc)) {
		if (node['@type'] != 'ItemList') continue;
		for (let entry of [].concat(node.itemListElement || [])) {
			let item = entry && entry.item;
			if (!item || !item.url || !item.name) continue;
			if (!new URL(item.url).pathname.match(REVIEW_PATH)) continue;
			if (checkOnly) return true;
			items[item.url] = clean(item.name);
		}
	}
	if (Object.keys(items).length) return items;

	// Everything else (and any list without an ItemList) falls back to the
	// cards' own titles, not to the link text of each card's button.
	for (let link of doc.querySelectorAll('a[href*="-reviews/"], a[href*="/resenas-"]')) {
		let href = link.href;
		// A list page also links to articles and parent guides; only outright
		// review pages are offered.
		let pathname = new URL(href).pathname;
		if (!pathname.match(REVIEW_PATH) || pathname.match(USER_REVIEW_PATH)) continue;
		let title = clean(link.textContent);
		if (!title || title.length < 2 || /^see full review$/i.test(title)) continue;
		if (checkOnly) return true;
		items[href] = title;
	}
	return Object.keys(items).length ? items : false;
}

async function doWeb(doc, url) {
	if (detectWeb(doc, url) == 'multiple') {
		let items = isSearchPage(url)
			? await getSearchPageResults(url)
			: getSearchResults(doc, false);
		if (!items) return;
		items = await Zotero.selectItems(items);
		if (!items) return;
		for (let url of Object.keys(items)) {
			await scrape(await requestDocument(url));
		}
	}
	else {
		await scrape(doc, url);
	}
}

// Reviewers are people in CriticReview.author, but a few pages credit the site
// itself ("Common Sense Media") in exactly the same slot, and the /articles/
// pages put the organisation in NewsArticle.author as if it were a person. An
// organisational byline is the publisher, so it must never become a creator.
function getAuthors(doc, nodes, review) {
	let names = [];
	for (let author of [].concat((review && review.author) || [])) {
		if (typeof author == 'string') {
			names.push(author);
		}
		else if (author && author.name) {
			names.push(author.name);
		}
	}
	if (!names.some(name => !isOrganisation(name, nodes))) {
		// Pages without a review node (website-reviews) only carry the byline in
		// the page itself: "By Jean Armour Polly, based on child development
		// research". Everything from the first comma on is boilerplate.
		let byline = text(doc, '.review-view-author') || text(doc, '.article-header__author');
		if (byline) {
			names.push(ZU.trimInternal(byline).split(/,| based on | con base en /)[0]);
		}
	}
	names = names
		.map(name => clean(name).replace(BYLINE_PREFIX, ''))
		.filter(name => name && !isOrganisation(name, nodes));
	return [...new Set(names)];
}

function getOrganisationNames(nodes) {
	let names = [SITE_NAME];
	for (let node of nodes) {
		if (node['@type'] == 'Organization' && node.name) names.push(node.name);
	}
	return names.map(name => name.toLowerCase());
}

function isOrganisation(name, nodes) {
	if (!name) return true;
	let lower = name.toLowerCase();
	return getOrganisationNames(nodes).some(org => lower == org || lower.includes(org));
}

// The review's own publication date. Review nodes carry it (a 2020 review of a
// 1969 series is dated 2020), while work nodes carry the reviewed work's date,
// which must not be cited as the review date.
function getDate(doc, nodes, review, work) {
	// Advice articles are dated by their NewsArticle node.
	let news = nodes.find(node => node['@type'] == 'NewsArticle');
	if (news && news.datePublished) return ZU.strToISO(news.datePublished);
	if (review && review.datePublished) return ZU.strToISO(review.datePublished);
	// website-reviews pages have no review node, only the work.
	if (!review && work && work.datePublished) return ZU.strToISO(work.datePublished);
	let lastUpdated = text(doc, '.detail--last-updated');
	return lastUpdated ? ZU.strToISO(lastUpdated) : '';
}

function getLanguage(doc, review, work) {
	let lang = (review && review.inLanguage)
		|| (work && work.inLanguage)
		|| doc.documentElement.lang
		|| attr(doc, 'meta[property="og:locale"]', 'content')
		|| 'en';
	return lang.split(/[-_]/)[0].toLowerCase();
}

// The reviewed work's title, not the page title: the page titles these pages
// "Bluey - Parents' Guide & TV Review", which is a headline, not a work.
function getWorkTitle(doc, work) {
	if (work && work.name && work.name != SITE_NAME) {
		return cleanWorkName(work.name);
	}
	return cleanWorkName(text(doc, 'h1') || doc.title);
}

function cleanWorkName(title) {
	return clean((title || '')
		.replace(/\s*\|\s*Common Sense Media\s*$/i, '')
		.replace(/\s+-\s+Parents' Guide.*$/i, '')
		.replace(/^Parents' Guide to\s+/i, '')
		.replace(/^Guía para padres sobre\s+/i, ''));
}

async function scrape(doc, url = doc.location.href) {
	let item = new Zotero.Item('webpage');
	let nodes = getLDNodes(doc);
	let review = getReviewNode(nodes);
	let work = getWorkNode(nodes, review);
	let title = getWorkTitle(doc, work);

	item.title = title;
	item.date = getDate(doc, nodes, review, work);
	item.language = getLanguage(doc, review, work);
	item.url = url;
	item.websiteTitle = SITE_NAME;
	item.libraryCatalog = SITE_NAME;

	for (let author of getAuthors(doc, nodes, review)) {
		item.creators.push(ZU.cleanAuthor(author, 'author'));
	}

	let extra = [];
	// CSL styles recognise a review through the reviewed-title variable, which
	// Zotero only exposes through extra (the route London Review of Books takes).
	// Advice articles are not reviews and get neither variable.
	let isReview = !!review || !!doc.location.pathname.match(REVIEW_PATH);
	if (isReview) {
		if (title) extra.push('reviewed-title: ' + title);
		let kind = getKind(doc, work);
		if (kind) extra.push('reviewed-genre: ' + kind);
	}
	if (review && review.reviewRating && review.reviewRating.ratingValue) {
		let rating = review.reviewRating;
		let scale = rating.bestRating ? '/' + rating.bestRating : '';
		extra.push('Rating: ' + rating.ratingValue + scale);
	}
	if (extra.length) item.extra = extra.join('\n');

	let summary = (review && review.reviewBody) || attr(doc, 'meta[name="description"]', 'content');
	if (summary) item.abstractNote = clean(summary);

	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.commonsensemedia.org/movie-reviews/inside-out",
		"items": [
			{
				"itemType": "webpage",
				"title": "Inside Out",
				"creators": [
					{
						"firstName": "Betsy",
						"lastName": "Bozdech",
						"creatorType": "author"
					}
				],
				"date": "2015-06-19",
				"abstractNote": "Creative, clever story about big feelings has peril, scares.",
				"extra": "reviewed-title: Inside Out\nreviewed-genre: movie\nRating: 5/5",
				"language": "en",
				"url": "https://www.commonsensemedia.org/movie-reviews/inside-out",
				"websiteTitle": "Common Sense Media",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.commonsensemedia.org/movie-reviews/Sixteen-Candles.html?show=kid",
		"items": [
			{
				"itemType": "webpage",
				"title": "Sixteen Candles",
				"creators": [
					{
						"firstName": "Randy",
						"lastName": "White",
						"creatorType": "author"
					}
				],
				"date": "2005-03-07",
				"abstractNote": "Racy, drunken, dated 1980s high school comedy.",
				"extra": "reviewed-title: Sixteen Candles\nreviewed-genre: movie\nRating: 2/5",
				"language": "en",
				"url": "https://www.commonsensemedia.org/movie-reviews/sixteen-candles?show=kid",
				"websiteTitle": "Common Sense Media",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.commonsensemedia.org/tv-reviews/South-Nowhere.html",
		"items": [
			{
				"itemType": "webpage",
				"title": "South of Nowhere",
				"creators": [
					{
						"firstName": "Jill",
						"lastName": "Murphy",
						"creatorType": "author"
					}
				],
				"date": "2005-11-03",
				"abstractNote": "An eye-opening portrayal; OK for mature teens.",
				"extra": "reviewed-title: South of Nowhere\nreviewed-genre: TV series\nRating: 4/5",
				"language": "en",
				"url": "https://www.commonsensemedia.org/tv-reviews/south-of-nowhere",
				"websiteTitle": "Common Sense Media",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.commonsensemedia.org/book-reviews/Heat.html",
		"items": [
			{
				"itemType": "webpage",
				"title": "Heat",
				"creators": [
					{
						"firstName": "Matt",
						"lastName": "Berman",
						"creatorType": "author"
					}
				],
				"date": "2007-02-28",
				"abstractNote": "Engaging story about a pitching prodigy.",
				"extra": "reviewed-title: Heat\nreviewed-genre: book\nRating: 4/5",
				"language": "en",
				"url": "https://www.commonsensemedia.org/book-reviews/heat",
				"websiteTitle": "Common Sense Media",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.commonsensemedia.org/game-reviews/Game-Wave.html",
		"items": [
			{
				"itemType": "webpage",
				"title": "Game Wave",
				"creators": [
					{
						"firstName": "Jinny",
						"lastName": "Gudmundsen",
						"creatorType": "author"
					}
				],
				"date": "2006-07-25",
				"abstractNote": "In addition to being a DVD gaming system, the \"Game Wave\" is a regular DVD player. Because the system costs $110, it will appeal most to families looking to pick up a first or second DVD player. We found that the \"Open/Close\" button on this system was less responsive than typical DVD players; families purchasing the \"Game Wave\" will need to be patient and may have to push the button multiple times to insert DVDs into the system. Twenty years ago families would congregate around a board game to play trivia games. Nowadays, with kids weaned on technology, board games seem tame. \"Game Wave\"'s combination of music, videos, narration, and multimedia breathes life into trivia games in a way that this new generation can embrace.",
				"extra": "reviewed-title: Game Wave\nreviewed-genre: video game\nRating: 4",
				"language": "en",
				"url": "https://www.commonsensemedia.org/game-reviews/game-wave",
				"websiteTitle": "Common Sense Media",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.commonsensemedia.org/app-reviews/glass-tower-2",
		"items": [
			{
				"itemType": "webpage",
				"title": "Glass Tower 2",
				"creators": [
					{
						"firstName": "Christopher",
						"lastName": "Healy",
						"creatorType": "author"
					}
				],
				"date": "2010-06-23",
				"abstractNote": "If you overlook the sneaky pricing on \"Glass Tower 2\", it's a really great puzzle app. You are presented with stacks of differently-shaped glass blocks, and you must eliminate all the blue blocks (by tapping and shattering them) without letting any of the red blocks fall and break. It's an incredibly simple concept, but it's simplicity makes it addictive (which makes you all the more eager to buy the additional levels). What's really neat is your ability to stabilize shaky towers by literally tilting your mobile device and rebalancing teetering blocks. There are also a couple of helpful power-ups, like a freeze spell that pauses falling blocks in mid-air.",
				"extra": "reviewed-title: Glass Tower 2\nreviewed-genre: app\nRating: 4",
				"language": "en",
				"url": "https://www.commonsensemedia.org/app-reviews/glass-tower-2",
				"websiteTitle": "Common Sense Media",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.commonsensemedia.org/website-reviews/Runescape.html",
		"items": [
			{
				"itemType": "webpage",
				"title": "RuneScape",
				"creators": [
					{
						"firstName": "Jean Armour",
						"lastName": "Polly",
						"creatorType": "author"
					}
				],
				"date": "2005-01-12",
				"abstractNote": "Medieval multiplayer game isn't for all kids. Read Common Sense Media's RuneScape review, age rating, and parents guide.",
				"extra": "reviewed-title: RuneScape\nreviewed-genre: website",
				"language": "en",
				"url": "https://www.commonsensemedia.org/website-reviews/runescape",
				"websiteTitle": "Common Sense Media",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.commonsensemedia.org/podcast-reviews/little-kids-big-hearts",
		"items": [
			{
				"itemType": "webpage",
				"title": "Little Kids, Big Hearts",
				"creators": [
					{
						"firstName": "Lakshmi",
						"lastName": "Hutchinson",
						"creatorType": "author"
					}
				],
				"date": "2022-05-24",
				"abstractNote": "This is a great choice if you're looking for a podcast focused on social-emotional skills that's empowering for young children. Kids listening to \"Little Kids, Big Hearts\" will enjoy hearing about topics that are relatable to them through the voices of other children. You can tell that the host is an experienced educator as he guides the children through questions and conversation but still lets them take center stage. Some of the more fantastical elements, like the puppet characters and the land of the Qook-a-Lakas, will probably appeal most to the preschool/kindergarten audience, but there is a lot for older children to get out of this as well. \"Little Kids, Big Hearts\" is designed to help kids express their feelings, engage in honest conversation, and learn about empathy and friendship. At the same time, it's still entertaining and enjoyable to listen to. This podcast can serve as a valuable resource for opening up a dialogue between caregivers and kids, and there are discussion guides for educators and families available on the website.",
				"extra": "reviewed-title: Little Kids, Big Hearts\nRating: 4",
				"language": "en",
				"url": "https://www.commonsensemedia.org/podcast-reviews/little-kids-big-hearts",
				"websiteTitle": "Common Sense Media",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.commonsensemedia.org/articles/online-camps-for-a-summer-of-learning-adventures",
		"items": [
			{
				"itemType": "webpage",
				"title": "Online Camps for a Summer of Learning Adventures",
				"creators": [],
				"date": "2022-05-13",
				"abstractNote": "Virtual camps and classes offer a wide variety of enrichment to keep kids busy, learning, and having fun. Advice from Common Sense Media editors.",
				"language": "en",
				"url": "https://www.commonsensemedia.org/articles/online-camps-for-a-summer-of-learning-adventures",
				"websiteTitle": "Common Sense Media",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.commonsensemedia.org/search/test",
		"items": "multiple"
	}
]
/** END TEST CASES **/
