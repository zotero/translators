{
	"translatorID": "3f003fb1-7ae8-40d0-b891-af1df39cf555",
	"label": "WNYC",
	"creator": "Vera de Kok",
	"target": "^https?://(?:www\\.)?wnyc\\.org/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-10-28 22:30:00"
}

/*
	***** BEGIN LICENSE BLOCK *****

	WNYC Translator
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
	WNYC (New York Public Radio) runs a Nuxt app. The pages have no JSON-LD and no
	meta author or publication date, so Embedded Metadata (and Citoid) returns items
	without creators or a date, titled with an og:title that ends in " | WNYC".

	Everything needed is in the server-rendered payload in <script id="__NUXT_DATA__">,
	which stays in the DOM after hydration. It is a flat table: an object's values are
	indexes into that table, so every value is resolved before use.

	Handled page types:
	- /story/<slug>              type "article"            -> newspaperArticle
	                             type "segment"/"episode"  -> radioBroadcast
	- /browse/shows/episode/...  type "episode"            -> radioBroadcast
	- /npr/<id>                  type "npr_episode"        -> radioBroadcast
	Show, event and index pages have no item of their own and are left to Embedded
	Metadata.
*/

const PAGE_KEY = /^(?:story-publisher|index-episode|npr-story|show-page)-/;
const ITEM_PATH = /^\/(?:story\/|browse\/shows\/episode\/|npr\/)/;

function detectWeb(doc, url) {
	let page = getPage(doc, url);
	if (!page) return false;
	if (page.itemType) return page.itemType;
	// show pages list their recent episodes; like any list page, let the user pick
	return Object.keys(page.episodes).length > 1 ? 'multiple' : false;
}

async function doWeb(doc, url) {
	let page = getPage(doc, url);
	if (!page) return;
	if (page.itemType) {
		scrape(page, doc, url);
		return;
	}
	let selected = await Zotero.selectItems(page.episodes);
	if (!selected) return;
	for (let episodeUrl of Object.keys(selected)) {
		let episodeDoc = await requestDocument(episodeUrl);
		scrape(getPage(episodeDoc, episodeUrl), episodeDoc, episodeUrl);
	}
}

function scrape(page, doc, url) {
	if (!page) return;
	let data = page.data;
	let item = new Zotero.Item(page.itemType);

	item.title = data.title || text(doc, 'h1');
	item.abstractNote = ZU.cleanTags(data.description || data.tease || '');
	item.date = publishedDate(data);
	item.language = 'en-US';
	item.url = url;

	if (page.itemType == 'newspaperArticle') {
		item.publicationTitle = 'WNYC';
	}
	else {
		// the show is the programme, and WNYC relays NPR shows like Fresh Air
		if (data.showTitle) item.programTitle = data.showTitle;
		item.network = data.cmsSource == 'npr' ? 'NPR' : 'WNYC';
		let runningTime = formatRunningTime(data.estimatedDuration);
		if (runningTime) item.runningTime = runningTime;
		if (data.episodeNumber) item.episodeNumber = String(data.episodeNumber);
	}

	for (let name of data.authors) {
		// NPR.js uses director as the creator type for radio broadcasts
		let creatorType = page.itemType == 'newspaperArticle' ? 'author' : 'director';
		item.creators.push(ZU.cleanAuthor(name, creatorType));
	}

	if (data.audio) {
		item.attachments.push({ title: 'Audio', mimeType: 'audio/mpeg', url: data.audio });
	}
	item.attachments.push({ title: 'Snapshot', document: doc });

	item.complete();
}

function itemTypeFor(key, data) {
	// episode pages carry the "full" rendition of an episode, story pages the
	// "article"/"segment"/"episode" rendition
	if (/^index-episode-/.test(key)) return 'radioBroadcast';
	switch (data.type) {
		case 'article':
			return 'newspaperArticle';
		case 'segment':
		case 'episode':
		case 'npr_episode':
			return 'radioBroadcast';
	}
	return false;
}

function getPage(doc, url) {
	let payload = getPageData(doc);
	if (!payload) return false;
	let { key, data, table } = payload;
	let itemType = itemTypeFor(key, data);
	if (!itemType && !/^show-page-/.test(key)) return false;
	return {
		data,
		itemType,
		episodes: itemType ? {} : getEpisodes(data, url, table),
	};
}

/**
 * The episodes of a show page, taken from its list modules ("Recent Episodes").
 */
function getEpisodes(data, baseUrl, table) {
	let episodes = {};
	for (let rawBlock of asArray(data.body)) {
		let block = resolveValue(table, rawBlock);
		let value = resolveValue(table, block && block.value);
		let list = resolveValue(table, value && value.list);
		for (let rawEntry of asArray(resolveValue(table, list && list.listItems))) {
			let entry = resolveValue(table, rawEntry);
			let link = resolveValue(table, entry && entry.link);
			if (typeof link != 'string' || !ITEM_PATH.test(link)) continue;
			let title = resolveValue(table, entry.title) || resolveValue(table, entry.listingTitle);
			episodes[new URL(link, baseUrl).href] = ZU.trimInternal(String(title || link));
		}
	}
	return episodes;
}

function asArray(value) {
	return Array.isArray(value) ? value : [];
}

/**
 * The page's own object out of the Nuxt payload with every value resolved.
 */
function getPageData(doc) {
	let script = doc.getElementById('__NUXT_DATA__');
	if (!script) return false;

	let table;
	try {
		table = JSON.parse(script.textContent);
	}
	catch (error) {
		Zotero.debug('WNYC: unparseable __NUXT_DATA__ (' + error + ')');
		return false;
	}
	if (!Array.isArray(table)) return false;

	let resolve = value => resolveValue(table, value);

	let root = table.find(entry => entry && typeof entry == 'object' && !Array.isArray(entry)
		&& 'data' in entry);
	let data = root && resolve(root.data);
	if (!data || typeof data != 'object') return false;

	let key = Object.keys(data).find(name => PAGE_KEY.test(name));
	let entry = key && resolve(data[key]);
	if (!entry || typeof entry != 'object') return false;

	let page = {};
	for (let field of Object.keys(entry)) {
		page[field] = resolve(entry[field]);
	}
	page.authors = (Array.isArray(page.authors) ? page.authors : [])
		.map((author) => {
			author = resolve(author);
			let name = author && typeof author == 'object' ? resolve(author.name) : author;
			return typeof name == 'string' ? ZU.trimInternal(name) : '';
		})
		.filter(name => name);
	return { key, data: page, table };
}

/**
 * Follow a payload index to its value, unwrapping devalue's reactive wrappers.
 */
function resolveValue(table, value) {
	for (let guard = 0; typeof value == 'number' && guard < 32; guard++) {
		if (value < 0 || value >= table.length) return undefined;
		let target = table[value];
		if (Array.isArray(target) && target.length == 2 && typeof target[0] == 'string'
				&& /(?:Reactive|Ref)$/.test(target[0])) {
			value = target[1];
			continue;
		}
		return target;
	}
	return value;
}

function publishedDate(data) {
	// sortDate is WNYC's local publish date; publicationDate is the same moment in UTC
	let value = data.sortDate || data.publicationDate || '';
	let match = String(value).match(/^\d{4}-\d{2}-\d{2}/);
	return match ? match[0] : '';
}

function formatRunningTime(seconds) {
	if (!seconds || typeof seconds != 'number' || seconds < 1) return '';
	let hours = Math.floor(seconds / 3600);
	let minutes = Math.floor(seconds / 60) % 60;
	let rest = seconds % 60;
	let pad = number => String(number).padStart(2, '0');
	return hours ? `${hours}:${pad(minutes)}:${pad(rest)}` : `${minutes}:${pad(rest)}`;
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://wnyc.org/story/speech-1983-sanders-rails-against-establishment",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "In Speech from 1983, Sanders Rails Against the Establishment",
				"creators": [
					{
						"firstName": "Andrea",
						"lastName": "Bernstein",
						"creatorType": "author"
					}
				],
				"date": "2016-04-13",
				"abstractNote": "In a 1983 speech, Sanders displayed a distaste for bankers, the two-party system and political naysayers. But in a much stronger way than he does today.",
				"language": "en-US",
				"libraryCatalog": "WNYC",
				"publicationTitle": "WNYC",
				"url": "https://wnyc.org/story/speech-1983-sanders-rails-against-establishment",
				"attachments": [
					{
						"title": "Audio",
						"mimeType": "audio/mpeg"
					},
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
		"url": "https://wnyc.org/story/madonna-ray-of-light",
		"items": [
			{
				"itemType": "radioBroadcast",
				"title": "'Ray Of Light' Was Madonna's 'Mid-Life Enlightenment' Record",
				"creators": [],
				"date": "2013-09-19",
				"abstractNote": "NPR Music’s Ann Powers calls Ray of Light Madonna's “mid-life enlightenment” record — and she walks us through this interesting chapter in the star’s career.",
				"language": "en-US",
				"libraryCatalog": "WNYC",
				"network": "WNYC",
				"programTitle": "Soundcheck",
				"runningTime": "20:13",
				"url": "https://wnyc.org/story/madonna-ray-of-light",
				"attachments": [
					{
						"title": "Audio",
						"mimeType": "audio/mpeg"
					},
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
		"url": "https://wnyc.org/browse/shows/episode/simplecast/f63266fa-3c5d-48f3-8b49-b6012bac73cb",
		"items": [
			{
				"itemType": "radioBroadcast",
				"title": "NJ Governor Sherrill: Our election is secutre.",
				"creators": [],
				"date": "2026-10-27",
				"abstractNote": "New Jersey Gov. Sherrill addressed the noncitizens found on voter rolls, what New Jersey's looking out for as President Trump vows to send election monitors nationwide, and the search for New Jersey's next lieutenant governor.",
				"episodeNumber": "3",
				"language": "en-US",
				"libraryCatalog": "WNYC",
				"network": "WNYC",
				"programTitle": "Ask Governor Sherrill",
				"runningTime": "59:03",
				"shortTitle": "NJ Governor Sherrill",
				"url": "https://wnyc.org/browse/shows/episode/simplecast/f63266fa-3c5d-48f3-8b49-b6012bac73cb",
				"attachments": [
					{
						"title": "Audio",
						"mimeType": "audio/mpeg"
					},
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
		"url": "https://wnyc.org/npr/nx-s1-6019370",
		"items": [
			{
				"itemType": "radioBroadcast",
				"title": "New book revisits the 2023 killing of an unhoused man in crisis on the NYC subway",
				"creators": [
					{
						"firstName": "Tonya",
						"lastName": "Mosley",
						"creatorType": "director"
					}
				],
				"date": "2026-10-28",
				"abstractNote": "Jordan Neely was frightening fellow passengers. A former Marine named Daniel Penny put Neely into a chokehold, killing him. Journalist Anand Giridharadas investigates the incident in Man in the Mirror.",
				"language": "en-US",
				"libraryCatalog": "WNYC",
				"network": "NPR",
				"programTitle": "Fresh Air",
				"runningTime": "36:47",
				"url": "https://wnyc.org/npr/nx-s1-6019370",
				"attachments": [
					{
						"title": "Audio",
						"mimeType": "audio/mpeg"
					},
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
		"url": "https://wnyc.org/story/213999-blog-food-and-beverage-biz-banks-outcry-against-big-soda-ban",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Hoping Sugary Drink Ban Fizzles Out, Beverage Business Weighs Next Steps",
				"creators": [
					{
						"firstName": "Fred",
						"lastName": "Mogul",
						"creatorType": "author"
					}
				],
				"date": "2012-06-01",
				"abstractNote": "Industry groups are quietly trying to build opposition to Mayor Michel  Bloomberg’s proposed big sugary drink ban. But if the past is any guide,  they will have a tough time thwarting...",
				"language": "en-US",
				"libraryCatalog": "WNYC",
				"publicationTitle": "WNYC",
				"url": "https://wnyc.org/story/213999-blog-food-and-beverage-biz-banks-outcry-against-big-soda-ban",
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
		"url": "https://wnyc.org/browse/shows/ask-governor-sherrill",
		"items": "multiple"
	}
]
/** END TEST CASES **/
