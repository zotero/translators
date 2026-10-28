{
	"translatorID": "d322870e-1540-4024-9e6a-84a2501d7cb8",
	"label": "KQED",
	"creator": "Vera de Kok",
	"target": "^https?://((www|video)\\.)?kqed\\.org/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-10-28 21:40:00"
}

/*
	***** BEGIN LICENSE BLOCK *****

	KQED Translator
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
	KQED ships no JSON-LD and no meta author / article:published_time on its articles,
	which is why Embedded Metadata alone (and Citoid) returns items without creators.
	The article page does mark up an article container, the byline and the publication
	date, so those are read here; everything else comes from Embedded Metadata.

	Videos live on video.kqed.org and are the same UI as pbs.org: the show name, the
	airing date and the running time are only in the rendered page, and the canonical
	link points at pbs.org, so the page URL is kept instead.

	Podcast shows carry a PodcastSeries block in JSON-LD. Their episodes are cards on
	that page (with a download link), there are no separate episode pages.
*/

const ARTICLE_PATH = /\/(?:arts|culture|education|health|news|politics|science)\/\d{5,}\//;
const PODCAST_PATH = /^https?:\/\/(?:www\.)?kqed\.org\/podcasts\/[^/?#]+\/?$/;

function detectWeb(doc, url) {
	if (doc.querySelector('[class*="SinglePost__mpost"], [class*="mpost_Title"]')) {
		return 'newspaperArticle';
	}
	if (doc.querySelector('[data-sentry-component="VideoContentMetadata"]')) {
		return 'videoRecording';
	}
	if (getPodcastSeries(doc) || PODCAST_PATH.test(url)) {
		return 'podcast';
	}
	if (getSearchResults(doc, true)) return 'multiple';
	return false;
}

function getSearchResults(doc, checkOnly) {
	let items = {};
	let found = false;
	for (let link of doc.querySelectorAll('a[href*="/news/"], a[href*="/arts/"],'
		+ ' a[href*="/science/"], a[href*="/culture/"], a[href*="/education/"],'
		+ ' a[href*="/health/"], a[href*="/politics/"]')) {
		let href = link.getAttribute('href');
		if (!href || !ARTICLE_PATH.test(href)) continue;
		// card links wrap an image and carry the headline in the title attribute
		let title = ZU.trimInternal(link.getAttribute('title') || link.textContent);
		if (!title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function doWeb(doc, url) {
	let type = detectWeb(doc, url);
	if (type == 'multiple') {
		Zotero.selectItems(getSearchResults(doc, false), (items) => {
			if (items) ZU.processDocuments(Object.keys(items), doWeb);
		});
		return;
	}
	if (type == 'videoRecording' || type == 'podcast') {
		scrapeMedia(doc, url, type);
		return;
	}
	scrape(doc, url);
}

function scrape(doc, url) {
	let translator = Zotero.loadTranslator('web');
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	translator.setHandler('itemDone', (_obj, item) => {
		item.itemType = 'newspaperArticle';

		// og:title carries a " | KQED" suffix, the h1 is the headline as published
		item.title = getText(doc, '[class*="Title__title"]') || item.title.replace(/\s*\|\s*KQED\s*$/, '');

		let creators = getCreators(doc);
		if (creators.length) item.creators = creators;

		// the first <time> is the publication date, the second one is the "Updated" stamp
		let published = getAttr(doc, '[class*="mpost_dateAndTime"] time[datetime]', 'datetime');
		if (published) item.date = ZU.strToISO(published) || published;

		item.section = getSection(doc, url);

		// the label links to a tag page on some posts ("Fall Guide 2026") and to the
		// home page on others, so it is only a tag when it points at /tag/
		let label = doc.querySelector('[class*="categoryLabel"]');
		let labelHref = label ? label.getAttribute('href') || '' : '';
		if (labelHref.includes('/tag/')) {
			let tag = ZU.trimInternal(label.textContent);
			if (tag) item.tags.push(tag);
		}

		item.abstractNote = getText(doc, '[class*="mpost_Excerpt"]') || item.abstractNote;

		item.publicationTitle = 'KQED';

		// KQED publishes in English only, and the page declares the bare "en"
		item.language = 'en-US';

		item.complete();
	});
	translator.translate();
}

function scrapeMedia(doc, url, itemType) {
	let translator = Zotero.loadTranslator('web');
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	translator.setHandler('itemDone', (_obj, item) => {
		item.itemType = itemType;
		if (itemType == 'podcast') {
			fillPodcast(item, doc, url);
		}
		else {
			fillVideo(item, doc, url);
		}
		item.complete();
	});
	translator.translate();
}

function fillVideo(item, doc, url) {
	// the h1 is the episode title; og:title is "Show | Season 2026 | Episode title"
	item.title = getText(doc, 'h1') || item.title;
	item.seriesTitle = getVideoSeries(doc);
	item.studio = 'KQED';

	// "9/29/2026" or "10/23/2026 | Expires 11/22/2026 | Rating TV-PG"
	let aired = getText(doc, '[data-sentry-component="AiringExpiringRating"]')
		.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
	if (aired) item.date = `${aired[3]}-${pad(aired[1])}-${pad(aired[2])}`;

	// the metadata line reads "10/23/2026 | 57m 46s" (and "Season 13 Episode 5 | 16m 59s")
	let runningTime = getRunningTime(doc);
	if (runningTime) item.runningTime = runningTime;

	// on the PBS-sourced videos the description is just the title repeated
	if (item.abstractNote == item.title) delete item.abstractNote;

	item.language = 'en-US';
	item.libraryCatalog = 'video.kqed.org';
	// the canonical link points at the original pbs.org page
	item.url = url;
}

function fillPodcast(item, doc, url) {
	let series = getPodcastSeries(doc);
	let title = series ? series.name : getAttr(doc, 'meta[property="og:title"]', 'content');
	item.title = cleanPodcastTitle(title || item.title);
	if (series && series.description) item.abstractNote = series.description;
	item.language = 'en-US';
	item.url = url;
}

function getRunningTime(doc) {
	let text = getText(doc, '[class*="video_meta_data"]');
	let hours = text.match(/(\d+)\s*h/);
	let minutes = text.match(/(\d+)\s*m/);
	let seconds = text.match(/(\d+)\s*s/);
	if (!minutes) return '';
	let rest = pad(seconds ? seconds[1] : 0);
	return hours ? `${hours[1]}:${pad(minutes[1])}:${rest}` : `${minutes[1]}:${rest}`;
}

function getVideoSeries(doc) {
	let title = getAttr(doc, 'meta[property="og:title"]', 'content');
	let parts = title.split('|').map(part => part.trim()).filter(Boolean);
	return parts.length > 1 ? parts[0] : '';
}

function getPodcastSeries(doc) {
	for (let script of doc.querySelectorAll('script[type="application/ld+json"]')) {
		let data;
		try {
			data = JSON.parse(script.textContent);
		}
		catch (error) {
			continue;
		}
		for (let entry of [].concat(data)) {
			if (!entry) continue;
			let types = [].concat(entry['@type'] || []);
			if (types.includes('PodcastSeries')) return entry;
		}
	}
	return null;
}

function cleanPodcastTitle(title) {
	return ZU.trimInternal(title.replace(/\s*\|\s*KQED\s*$/, '').replace(/\s*\|\s*Podcasts\s*$/, ''));
}

function pad(value) {
	return String(value).padStart(2, '0');
}

function getSection(doc, url) {
	// the section is the first path segment (/arts/13992952/... -> Arts); the visible
	// label is inconsistent (a series name on guide posts, "News" elsewhere)
	let segment = url.match(/kqed\.org\/([a-z]+)\//);
	if (segment) return segment[1][0].toUpperCase() + segment[1].slice(1);
	return getText(doc, '[class*="categoryLabel_Text"]');
}

function getCreators(doc) {
	let names = [];
	let seen = {};
	for (let link of doc.querySelectorAll('[class*="mpost_Authors"] a')) {
		let name = ZU.trimInternal(link.textContent);
		if (!name || seen[name.toLowerCase()]) continue;
		seen[name.toLowerCase()] = true;
		names.push(name);
	}
	return names.map(name => (name.includes(' ')
		? ZU.cleanAuthor(name, 'author', false)
		: { lastName: name, creatorType: 'author', fieldMode: 1 }));
}

function getText(doc, selector) {
	let element = doc.querySelector(selector);
	return element ? ZU.trimInternal(element.textContent) : '';
}

function getAttr(doc, selector, attribute) {
	let element = doc.querySelector(selector);
	return element ? element.getAttribute(attribute) : '';
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.kqed.org/arts/13992952/best-outdoor-festivals-bay-area-fall-2026",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "15 of the Best Outdoor Festivals in the Bay Area This Fall",
				"creators": [
					{
						"firstName": "Pendarvis",
						"lastName": "Harshaw",
						"creatorType": "author"
					}
				],
				"date": "2026-08-25",
				"abstractNote": "There’s plenty of places to eat, drink, dance and celebrate outside this fall.",
				"language": "en-US",
				"libraryCatalog": "www.kqed.org",
				"publicationTitle": "KQED",
				"section": "Arts",
				"url": "https://www.kqed.org/arts/13992952/best-outdoor-festivals-bay-area-fall-2026",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Fall Guide 2026"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.kqed.org/news/12103028/should-you-use-usps-to-mail-your-midterm-ballot-heres-what-california-election-officials-say",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Should You Use USPS to Mail Your Midterm Ballot? Here’s What California Election Officials Say",
				"creators": [
					{
						"firstName": "Izzy",
						"lastName": "Bloom",
						"creatorType": "author"
					}
				],
				"date": "2026-10-06",
				"abstractNote": "With recent changes to how the U.S. Postal Service operates and President Trump’s attacks on mail voting, here’s what to know.",
				"language": "en-US",
				"libraryCatalog": "www.kqed.org",
				"publicationTitle": "KQED",
				"section": "News",
				"shortTitle": "Should You Use USPS to Mail Your Midterm Ballot?",
				"url": "https://www.kqed.org/news/12103028/should-you-use-usps-to-mail-your-midterm-ballot-heres-what-california-election-officials-say",
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
		"url": "https://www.kqed.org/arts",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://video.kqed.org/video/extreme-makeovers-arent-just-a-human-thing-1xbdtl/",
		"items": [
			{
				"itemType": "videoRecording",
				"title": "Extreme Makeovers Aren’t Just a Human Thing",
				"creators": [],
				"date": "2026-09-29",
				"abstractNote": "Explore four mind-blowing animal transformations.",
				"language": "en-US",
				"libraryCatalog": "video.kqed.org",
				"runningTime": "16:59",
				"seriesTitle": "Deep Look",
				"studio": "KQED",
				"url": "https://video.kqed.org/video/extreme-makeovers-arent-just-a-human-thing-1xbdtl/",
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
		"url": "https://www.kqed.org/podcasts/thebay",
		"items": [
			{
				"itemType": "podcast",
				"title": "The Bay",
				"creators": [],
				"abstractNote": "Ericka Cruz Guevarra talks with local journalists about what’s happening in the Bay Area. It’s the context and analysis you need to make sense of the headlines.",
				"language": "en-US",
				"url": "https://www.kqed.org/podcasts/thebay",
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
		"url": "https://video.kqed.org/video/october-23-2026-pbs-news-hour-full-episode-1792728001/",
		"items": [
			{
				"itemType": "videoRecording",
				"title": "October 23, 2026 - PBS News Hour full episode",
				"creators": [],
				"date": "2026-10-23",
				"language": "en-US",
				"libraryCatalog": "video.kqed.org",
				"runningTime": "57:46",
				"seriesTitle": "PBS News Hour",
				"studio": "KQED",
				"url": "https://video.kqed.org/video/october-23-2026-pbs-news-hour-full-episode-1792728001/",
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
	}
]
/** END TEST CASES **/
