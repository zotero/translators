{
	"translatorID": "4ed446ca-b480-43ee-a8fb-5f9730915edc",
	"label": "Denik CZ",
	"creator": "Jiří Sedláček, Philipp Zumstein",
	"target": "^https?://[^/]*denik\\.cz",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-08-13 17:04:12"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2017-2026 Jiří Sedláček, Philipp Zumstein

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

function detectWeb(doc, url) { // eslint-disable-line no-unused-vars
	if (attr(doc, 'meta[property="og:type"]', 'content') == 'article') {
		return 'newspaperArticle';
	}
	else if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('article h2 a');
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

async function doWeb(doc, url) {
	if (detectWeb(doc, url) == 'multiple') {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (!items) return;
		for (let url of Object.keys(items)) {
			await scrape(await requestDocument(url));
		}
	}
	else {
		await scrape(doc, url);
	}
}

function getJSONLDGraph(doc) {
	for (let script of doc.querySelectorAll('script[type="application/ld+json"]')) {
		try {
			let data = JSON.parse(script.textContent);
			let graph = data['@graph'] || (Array.isArray(data) ? data : [data]);
			if (graph.some(node => node['@type'] == 'NewsArticle')) {
				return graph;
			}
		}
		catch (e) {}
	}
	return [];
}

async function scrape(doc, url = doc.location.href) {
	let graph = getJSONLDGraph(doc);
	let article = graph.find(node => node['@type'] == 'NewsArticle');
	let organization = graph.find(node => node['@type'] == 'NewsMediaOrganization');

	let translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);

	translator.setHandler('itemDone', (_obj, item) => {
		if (article) {
			// exclude generic names like "Redakce"
			item.creators = [];
			let authors = Array.isArray(article.author) ? article.author : [article.author];
			for (let author of authors) {
				if (author && author.name && author.name != 'Redakce') {
					item.creators.push(ZU.cleanAuthor(author.name, 'author'));
				}
			}

			if (article.datePublished) {
				item.date = ZU.strToISO(article.datePublished);
			}
			if (article.articleSection) {
				item.section = article.articleSection;
			}
			if (Array.isArray(article.keywords)) {
				item.tags = article.keywords.map(tag => ({ tag }));
			}
		}
		if (organization && organization.name) {
			// og:site_name is always "www.denik.cz"; the regional edition
			// name (e.g. "Třebíčský deník") is only in the JSON-LD
			item.publicationTitle = organization.name;
		}
		if (!item.language) {
			item.language = 'cs';
		}
		item.complete();
	});

	let em = await translator.getTranslatorObject();
	em.itemType = 'newspaperArticle';
	await em.doWeb(doc, url);
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://trebicsky.denik.cz/zpravy-region/trebic-bude-mit-nocni-autobus-umozni-spojeni-na-vlak-i-pohodlny-navrat-z-klubu/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"creators": [
					{
						"firstName": "Milan",
						"lastName": "Krčmář",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					{
						"tag": "Brno"
					},
					{
						"tag": "Karlovo náměstí"
					},
					{
						"tag": "Třebíč"
					},
					{
						"tag": "jízdní řád"
					},
					{
						"tag": "sídliště"
					},
					{
						"tag": "čtvrť"
					},
					{
						"tag": "železniční stanice"
					}
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"title": "Třebíč bude mít noční autobus. Umožní spojení na vlak i pohodlný návrat z klubů",
				"publicationTitle": "Třebíčský deník",
				"url": "https://trebicsky.denik.cz/zpravy-region/trebic-bude-mit-nocni-autobus-umozni-spojeni-na-vlak-i-pohodlny-navrat-z-klubu/",
				"abstractNote": "V Třebíči se od 29. června změní jízdní řády městských autobusů. Novinkou je zkušební zavedení noční linky, která má návaznost na noční a ranní vlaky.",
				"date": "2026-06-24",
				"language": "cs",
				"libraryCatalog": "trebicsky.denik.cz",
				"section": "Třebíčsko"
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.denik.cz/evropa/dalsi-zatmeni-slunce-evropa-cesko-spanelsko-egypt/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"creators": [
					{
						"firstName": "Tomáš",
						"lastName": "Rosa",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					{
						"tag": "Egypt"
					},
					{
						"tag": "Evropa"
					},
					{
						"tag": "Evropská kosmická agentura"
					},
					{
						"tag": "Luxor"
					},
					{
						"tag": "Měsíc"
					},
					{
						"tag": "Pyrenejský poloostrov"
					},
					{
						"tag": "Tarifa"
					},
					{
						"tag": "zatmění Slunce"
					},
					{
						"tag": "Česko"
					},
					{
						"tag": "Španělsko"
					}
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"title": "Zatmění Slunce se nad Evropu brzy vrátí. A ne jen jednou",
				"publicationTitle": "Deník.cz",
				"url": "https://www.denik.cz/evropa/dalsi-zatmeni-slunce-evropa-cesko-spanelsko-egypt/",
				"abstractNote": "V následujících dvou letech lidé z Evropy opět uvidí zatmění Slunce. Zatímco na jihozápadě státy zahalí tma, na zbytku kontinentu se obyvatelé dočkají alespoň částečného úkazu. V příštím roce se to bu",
				"date": "2026-08-13",
				"language": "cs",
				"libraryCatalog": "www.denik.cz",
				"section": "Evropa"
			}
		]
	},
	{
		"type": "web",
		"url": "https://trebicsky.denik.cz/zpravy-region/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.denik.cz/hledani/?q=praha",
		"items": "multiple"
	}
]
/** END TEST CASES **/
