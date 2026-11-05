{
	"translatorID": "53f8d182-4edc-4eab-b5a1-141698a10101",
	"label": "News UK",
	"creator": "Philipp Zumstein, Vera de Kok",
	"target": "^https?://(?:www\\.)?(?:thetimes\\.(?:com|co\\.uk)|(?:thesun|thescottishsun)\\.co\\.uk|thesun\\.ie|talksport\\.com)/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-11-05 12:14:02"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2017 Philipp Zumstein
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

function detectWeb(doc, url) {
	if (getArticle(doc)) {
		return getPublication(url) == 'talkSPORT' ? 'webpage' : 'newspaperArticle';
	}
	if (getSearchResults(doc, true)) return 'multiple';
	return false;
}

function getSearchResults(doc, checkOnly) {
	let items = {};
	for (let link of doc.querySelectorAll('a[href]')) {
		let href = link.href.replace(/[?#].*$/, '');
		let publication = getPublication(href);
		if (!publication) continue;
		let heading = link.querySelector('h2, h3') || link.closest('h2, h3');
		if (!heading && publication != 'The Times') continue;
		if (!/\/article\/|\/\d{6,}\//.test(href)) continue;
		let title = cleanText((heading || link).textContent);
		if (!title) continue;
		if (checkOnly) return true;
		items[href] = title;
	}
	return Object.keys(items).length ? items : false;
}

async function doWeb(doc, url) {
	if (detectWeb(doc, url) == 'multiple') {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (!items) return;
		for (let link of Object.keys(items)) {
			await scrape(await requestDocument(link), link);
		}
	}
	else {
		await scrape(doc, url);
	}
}

function getNodes(doc) {
	let nodes = [];
	for (let script of doc.querySelectorAll('script[type="application/ld+json"]')) {
		try {
			let data = JSON.parse(script.textContent);
			for (let block of (Array.isArray(data) ? data : [data])) {
				if (block && typeof block == 'object') nodes.push(...(block['@graph'] || [block]));
			}
		}
		catch (e) { /* Ignore malformed metadata blocks. */ }
	}
	return nodes;
}

function getArticle(doc) {
	return getNodes(doc).find((node) => {
		let types = Array.isArray(node['@type']) ? node['@type'] : [node['@type']];
		return types.some(type => /^(?:NewsArticle|Article|ReportageNewsArticle|LiveBlogPosting)$/.test(type))
			&& node.headline;
	});
}

async function scrape(doc, url) {
	let data = getArticle(doc) || {};
	let itemType = detectWeb(doc, url);
	let translator = Zotero.loadTranslator('web');
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	translator.setHandler('itemDone', (_obj, item) => {
		item.itemType = itemType;
		if (data.headline) item.title = cleanText(data.headline);
		if (data.datePublished) item.date = data.datePublished.slice(0, 10);
		let canonical = doc.querySelector('link[rel="canonical"]');
		item.url = canonical ? canonical.href : url;
		let publication = data.publisher?.name || getPublication(url);
		setPublication(item, publication);
		if (itemType == 'newspaperArticle') item.place = getPlace(url);
		item.creators = getCreators(data);
		let language = data.inLanguage || doc.querySelector('meta[property="og:locale"]')?.content || doc.documentElement.lang;
		if (language) item.language = language.replace('_', '-');
		let section = getSection(doc, data);
		if (section && itemType == 'newspaperArticle') item.section = section;
		item.tags = getTags(doc, item.tags, data.keywords);
		item.complete();
	});
	await translator.translate();
}

function getPublication(url) {
	return {
		'thetimes.com': 'The Times',
		'thetimes.co.uk': 'The Times',
		'thesun.co.uk': 'The Sun',
		'thescottishsun.co.uk': 'The Scottish Sun',
		'thesun.ie': 'The Irish Sun',
		'talksport.com': 'talkSPORT'
	}[getHost(url)] || '';
}

function getPlace(url) {
	return {
		'thetimes.com': 'London',
		'thetimes.co.uk': 'London',
		'thesun.co.uk': 'London',
		'thescottishsun.co.uk': 'Glasgow',
		'thesun.ie': 'Dublin',
		'talksport.com': 'London'
	}[getHost(url)] || '';
}

function getHost(url) {
	return url.match(/^https?:\/\/(?:www\.)?([^/]+)\//i)?.[1].toLowerCase();
}

function setPublication(item, publication) {
	if (item.itemType == 'webpage') item.websiteTitle = publication || 'talkSPORT';
	else if (publication) item.publicationTitle = publication;
	let issn = {
		'The Times': '0140-0460',
		'The Sunday Times': '0956-1382',
		'The Sun': '0307-2681',
		'The Scottish Sun': '1474-0370'
	}[publication];
	if (issn) item.ISSN = issn;
}

function getCreators(data) {
	let names = [];
	if (data.author) {
		for (let author of (Array.isArray(data.author) ? data.author : [data.author])) {
			if (typeof author == 'string') names.push(author);
			else if (author && author['@type'] != 'Organization') names.push(author.name || '');
		}
	}
	let creators = [];
	let seen = new Set();
	for (let name of names) {
		name = cleanText(name).replace(/^By\s+/i, '').split(',')[0];
		if (!name || /^\d+$/.test(name) || /^(?:The (?:Sunday Times|Times|(?:Irish |Scottish )?Sun)|Times Money|talkSPORT|Reuters|Associated Press|PA(?: Media)?|AFP)$/i.test(name)) continue;
		if (seen.has(name.toLowerCase())) continue;
		seen.add(name.toLowerCase());
		creators.push(ZU.cleanAuthor(name, 'author'));
	}
	return creators;
}

function getSection(doc, data) {
	let section = data.articleSection;
	// Times section IDs are internal identifiers; use its readable breadcrumbs instead.
	if (!section || /^TheTimes/.test(section)) {
		let breadcrumb = getNodes(doc).find(node => node['@type'] == 'BreadcrumbList');
		section = breadcrumb?.itemListElement?.slice(-1)[0]?.name;
	}

	return section ? cleanText(Array.isArray(section) ? section.join(', ') : section) : '';
}

function getTopicTags(doc) {
	for (let script of doc.querySelectorAll('script')) {
		if (!/window\.tealiumServerData\s*=/.test(script.textContent)) continue;
		let match = script.textContent.match(/"article_topic_tags"\s*:\s*("(?:\\.|[^"\\])*")/);
		if (!match) continue;
		try {
			return JSON.parse(match[1]).split(',');
		}
		catch (e) { /* Ignore malformed topic metadata. */ }
	}
	return [];
}
function getTags(doc, existingTags, keywords) {
	let tags = new Map();
	keywords = keywords || [];
	if (typeof keywords == 'string') keywords = keywords.split(',');
	for (let tag of [...existingTags.map(tag => tag.tag || tag), ...keywords, ...getTopicTags(doc)]) {
		tag = cleanText(tag);
		if (tag && !/^Section:/i.test(tag)) tags.set(tag.toLowerCase(), { tag });
	}
	return Array.from(tags.values());
}

function cleanText(value) {
	return ZU.trimInternal(ZU.unescapeHTML(value || ''));
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.thetimes.com/business/technology/article/lloyds-bank-quantum-computers-financial-crime-7h5g0jgsg",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Lloyds Bank uses quantum computing to detect money mules",
				"creators": [
					{
						"firstName": "Chris",
						"lastName": "Dorrell",
						"creatorType": "author"
					}
				],
				"date": "2026-04-06",
				"ISSN": "0140-0460",
				"abstractNote": "Experiment using sophisticated algorithms, in partnership with IBM, successfully identifies a bank account used to transfer stolen money",
				"language": "en-GB",
				"libraryCatalog": "www.thetimes.com",
				"publicationTitle": "The Times",
				"place": "London",
				"section": "Technology",
				"url": "https://www.thetimes.com/business/technology/article/lloyds-bank-quantum-computers-financial-crime-7h5g0jgsg",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "business and finance"
					},
					{
						"tag": "ibm"
					},
					{
						"tag": "lloyds banking group"
					},
					{
						"tag": "uk banking"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.thetimes.co.uk/article/weve-come-a-long-way-since-1967-reg-2l5j3gsph",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "We’ve come a long way since 1967, Reg",
				"creators": [
					{
						"firstName": "Nina",
						"lastName": "Montagu-Smith",
						"creatorType": "author"
					}
				],
				"date": "2017-07-01",
				"ISSN": "0956-1382",
				"abstractNote": "Last week was the 50th anniversary of a landmark in the history of money: on June 27, 1967, the world’s first cash machine was unveiled in the unlikely sett",
				"language": "en-GB",
				"libraryCatalog": "www.thetimes.com",
				"publicationTitle": "The Sunday Times",
				"place": "London",
				"section": "Money",
				"url": "https://www.thetimes.com/money/saving-investing/article/weve-come-a-long-way-since-1967-reg-2l5j3gsph",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "barclays"
					},
					{
						"tag": "comedy"
					},
					{
						"tag": "london"
					},
					{
						"tag": "technology"
					},
					{
						"tag": "uk banking"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.thetimes.com/life-style/celebrity/article/sydney-sweeney-sports-ad-novig-controversy-rj6hzwcv2",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Sydney Sweeney adverts ‘a kick in the face for women’s sport’",
				"creators": [
					{
						"firstName": "Seren",
						"lastName": "Hughes",
						"creatorType": "author"
					},
					{
						"firstName": "Lisa",
						"lastName": "Creffield",
						"creatorType": "author"
					}
				],
				"date": "2026-09-14",
				"ISSN": "0140-0460",
				"abstractNote": "The British sprinter Amy Hunt has joined the backlash against the American actress and lingerie model’s campaign for Novig, a betting company",
				"language": "en-GB",
				"libraryCatalog": "www.thetimes.com",
				"publicationTitle": "The Times",
				"place": "London",
				"section": "Celebrity",
				"url": "https://www.thetimes.com/life-style/celebrity/article/sydney-sweeney-sports-ad-novig-controversy-rj6hzwcv2",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "feminism"
					},
					{
						"tag": "sydney sweeney"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.thesun.co.uk/money/40912555/cheapest-supermarket-revealed-price-gap/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Nation’s cheapest supermarket revealed as shoppers warned of massive £61 price gap between rivals",
				"creators": [
					{
						"firstName": "Olivia",
						"lastName": "Tomlinson",
						"creatorType": "author"
					}
				],
				"date": "2026-11-05",
				"abstractNote": "THE nation's cheapest supermarket has been revealed, with shoppers being warned of the huge price gap between rival retailers. Consumer champion...",
				"language": "en-GB",
				"libraryCatalog": "www.thesun.co.uk",
				"publicationTitle": "The Sun",
				"place": "London",
				"section": "Money",
				"url": "https://www.thesun.co.uk/money/40912555/cheapest-supermarket-revealed-price-gap/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Aldi"
					},
					{
						"tag": "Asda"
					},
					{
						"tag": "Lidl"
					},
					{
						"tag": "Morrisons"
					},
					{
						"tag": "Ocado"
					},
					{
						"tag": "Sainsbury's"
					},
					{
						"tag": "Tesco"
					},
					{
						"tag": "Waitrose"
					}
				],
				"notes": [],
				"seeAlso": [],
				"ISSN": "0307-2681"
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.thesun.ie/news/17869469/woman-spared-jail-fatal-cork-crash/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Woman, 87, spared jail after hitting accelerator instead of brake killing mum-of-5 & seriously injuring man in Cork",
				"creators": [
					{
						"firstName": "Ann",
						"lastName": "Mooney",
						"creatorType": "author"
					}
				],
				"date": "2026-11-04",
				"abstractNote": "A WOMAN who accidentally hit the accelerator instead of the brake while parking and hit two friends outside a store, resulting in the death of a...",
				"language": "en-GB",
				"libraryCatalog": "www.thesun.ie",
				"publicationTitle": "The Irish Sun",
				"place": "Dublin",
				"section": "News",
				"url": "https://www.thesun.ie/news/17869469/woman-spared-jail-fatal-cork-crash/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Cork"
					},
					{
						"tag": "Crime"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.thescottishsun.co.uk/news/17024547/school-evacuated-hazmat-fire/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "School evacuated hours before it was set to welcome students for first time as firefighters in hazmat suits attend scene",
				"creators": [
					{
						"firstName": "Bruno",
						"lastName": "Brown",
						"creatorType": "author"
					}
				],
				"date": "2026-11-03",
				"abstractNote": "A SCHOOL was dramatically evacuated after a chemical spill just hours before pupils were due to arrive for their first day in its new...",
				"language": "en-GB",
				"libraryCatalog": "www.thescottishsun.co.uk",
				"publicationTitle": "The Scottish Sun",
				"place": "Glasgow",
				"section": "News",
				"url": "https://www.thesun.co.uk/news/40899358/school-evacuated-hazmat-fire/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": [],
				"ISSN": "1474-0370"
			}
		]
	},
	{
		"type": "web",
		"url": "https://talksport.com/football/4688855/harry-kane-highest-salary-europe-new-bayern-munich-contract/",
		"items": [
			{
				"itemType": "webpage",
				"title": "Harry Kane lands highest salary in Europe as Ballon d'Or winner announces decision on future",
				"creators": [
					{
						"firstName": "Sean",
						"lastName": "O'Brien",
						"creatorType": "author"
					}
				],
				"date": "2026-11-05",
				"abstractNote": "England captain Harry Kane has signed a three-year contract extension with Bayern Munich. The Ballon d’Or winner lands what is thought to be the most lucrative deal in Bayern Munich history, …",
				"language": "en",
				"url": "https://talksport.com/football/4688855/harry-kane-highest-salary-europe-new-bayern-munich-contract/",
				"websiteTitle": "talkSPORT",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Bayern Munich"
					},
					{
						"tag": "Harry Kane"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.thesun.co.uk/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.thetimes.com/",
		"items": "multiple"
	}
]
/** END TEST CASES **/
