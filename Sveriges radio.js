{
	"translatorID": "caa8f42c-9dbf-446e-963b-6ee18e3133d2",
	"label": "Sveriges Radio",
	"creator": "Sebastian Berlin, Vera de Kok",
	"target": "^https?://(?:www\\.)?sverigesradio\\.se/(?:artikel/|sok\\?)",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-11-12 12:16:53"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2018 Sebastian Berlin
	
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
	if (/\/artikel\/[^/?#]+/.test(url) && doc.querySelector('h1')) {
		return "newspaperArticle";
	}
	if (getSearchResults(doc, true)) return "multiple";
	return false;
}
function getSearchResults(doc, checkOnly) {
	let items = {};
	for (let link of doc.querySelectorAll('main a[href*="/artikel/"], a.search-item')) {
		if (!/^https?:\/\/(?:www\.)?sverigesradio\.se\/artikel\/[^/?#]+/.test(link.href)) continue;
		let title = ZU.trimInternal(link.textContent);
		if (!title) continue;
		if (checkOnly) return true;
		items[link.href] = title;
	}
	return Object.keys(items).length ? items : false;
}
async function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		let selected = await Zotero.selectItems(getSearchResults(doc, false));
		if (!selected) return;
		for (let selectedURL of Object.keys(selected)) {
			await scrape(await requestDocument(selectedURL));
		}
	}
	else {
		await scrape(doc);
	}
}
function getArticleData(doc) {
	let slug = doc.location.pathname.split('/').filter(Boolean).pop();
	let payload = '';
	for (let script of doc.querySelectorAll('script:not([src])')) {
		let chunk = script.textContent.match(/^self\.__next_f\.push\((.+)\);?$/s);
		if (!chunk) continue;
		try {
			let data = JSON.parse(chunk[1])[1];
			if (typeof data == 'string') payload += data;
		}
		catch (e) {
			continue;
		}
	}
	// Parse the article prop from the streamed data, never execute page scripts.
	for (let match of payload.matchAll(/"article":(\{.*?\}),"directReportEntries":/gs)) {
		try {
			let article = JSON.parse(match[1]);
			if (article.slug == slug || String(article.id) == slug) return article;
		}
		catch (e) {
			continue;
		}
	}
	return null;
}
async function scrape(doc) {
	let article = getArticleData(doc);
	let translator = Zotero.loadTranslator('web');
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48'); // Embedded Metadata
	translator.setDocument(doc);
	translator.setHandler('itemDone', (_obj, item) => {
		item.publicationTitle = "Sveriges Radio";
		item.libraryCatalog = "Sveriges Radio";
		item.title = text(doc, 'h1');
		delete item.shortTitle;
		if (article) {
			item.date = article.publishUTC;
			item.section = article.programName;
			item.language = article.language.code;
		}
		let names = article ? article.bylines.map(byline => byline.name) : [];
		if (!names.length) {
			for (let node of ZU.xpath(doc, '//p[contains(concat(" ", normalize-space(@class), " "), " byline ")]/text()')) {
				let name = ZU.trimInternal(node.textContent);
				let email = node.parentElement.querySelector('a[href^="mailto:"]');
				if (email) {
					let key = value => value.normalize('NFD')
						.replace(/[\u0300-\u036f]/g, '')
						.toLowerCase()
						.replace(/[^a-z]/g, '');
					let emailName = key(email.getAttribute('href').split('@')[0].replace('mailto:', ''));
					let words = name.split(/\s+/);
					for (let i = 1; i < words.length; i++) {
						if (key(words.slice(0, i).join(' ')) == emailName) {
							name = words.slice(0, i).join(' ');
							break;
						}
					}
				}
				names.push(name);
			}
		}
		item.creators = [];
		for (let name of names) {
			name = ZU.trimInternal(name.split(/[/,]/)[0]);
			if (!name) continue;
			if (name == item.section || /^(Ekot|Radiosporten|Radio Sweden|Sveriges Radio)$/.test(name)) {
				item.creators.push({ lastName: name, creatorType: 'author', fieldMode: 1 });
			}
			else {
				item.creators.push(ZU.cleanAuthor(name, 'author'));
			}
		}
		item.tags = [];
		item.complete();
	});
	let em = await translator.getTranslatorObject();
	em.itemType = "newspaperArticle";
	em.addCustomFields({ 'twitter:description': 'abstractNote' });
	await em.doWeb(doc, doc.location.href);
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.sverigesradio.se/artikel/6821850",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Australierna säger ja till samkönade äktenskap",
				"creators": [
					{
						"lastName": "Ekot",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "2017-11-14T23:11:00Z",
				"abstractNote": "I en rådgivande postomröstning i Australien svarade 61,6 procent av medborgarna att de ville se en lag som godkänner samkönade äktenskap.",
				"language": "sv",
				"libraryCatalog": "Sveriges Radio",
				"publicationTitle": "Sveriges Radio",
				"section": "Ekot",
				"url": "https://www.sverigesradio.se/artikel/6821850",
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
		"url": "https://www.sverigesradio.se/artikel/6865752",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Här duschas de äldre av en robot",
				"creators": [
					{
						"firstName": "Emil",
						"lastName": "Hellerud",
						"creatorType": "author"
					}
				],
				"date": "2018-02-20T05:06:00Z",
				"abstractNote": "I Karlstad har äldreomsorgen börjat använda en duschrobot.",
				"language": "sv",
				"libraryCatalog": "Sveriges Radio",
				"publicationTitle": "Sveriges Radio",
				"section": "Ekot",
				"url": "https://www.sverigesradio.se/artikel/6865752",
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
		"url": "https://www.sverigesradio.se/artikel/6891473",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Stim skriver internationellt avtal med Facebook",
				"creators": [
					{
						"firstName": "Emil",
						"lastName": "Salmaso",
						"creatorType": "author"
					}
				],
				"date": "2018-02-21T15:26:00Z",
				"abstractNote": "Musikskaparnas representantorganisation Stim har skrivit ett internationellt avtal med Facebook.",
				"language": "sv",
				"libraryCatalog": "Sveriges Radio",
				"publicationTitle": "Sveriges Radio",
				"section": "Kulturnytt",
				"url": "https://www.sverigesradio.se/artikel/6891473",
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
		"url": "https://www.sverigesradio.se/artikel/6892065",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "HD: Nawaz Sharif får inte leda sitt parti i Pakistan",
				"creators": [
					{
						"firstName": "Margita",
						"lastName": "Boström",
						"creatorType": "author"
					}
				],
				"date": "2018-02-22T10:44:00Z",
				"abstractNote": "Högsta domstolen i Pakistan har slagit fast att landets avsatte premiärminister Nawaz Sharif inte längre får leda det parti han själv grundat.",
				"language": "sv",
				"libraryCatalog": "Sveriges Radio",
				"publicationTitle": "Sveriges Radio",
				"section": "Ekot",
				"shortTitle": "HD",
				"url": "https://www.sverigesradio.se/artikel/6892065",
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
		"url": "https://www.sverigesradio.se/artikel/6891577",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Alarmerande självmordssiffror bland ensamkommande unga",
				"creators": [
					{
						"firstName": "Åsa",
						"lastName": "Swee",
						"creatorType": "author"
					}
				],
				"date": "2018-02-22T05:00:00Z",
				"abstractNote": "Förra året begick 12 ensamkommande barn och ungdomar självmord i Sverige.",
				"language": "sv",
				"libraryCatalog": "Sveriges Radio",
				"publicationTitle": "Sveriges Radio",
				"section": "P4 Jämtland",
				"url": "https://www.sverigesradio.se/artikel/6891577",
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
		"url": "https://www.sverigesradio.se/artikel/6892091",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Facebook låg nere – #facebookdown trendar",
				"creators": [
					{
						"firstName": "Karin",
						"lastName": "Ingströmer",
						"creatorType": "author"
					},
					{
						"firstName": "Estrid",
						"lastName": "Wagersten",
						"creatorType": "author"
					}
				],
				"date": "2018-02-22T11:09:00Z",
				"abstractNote": "Facebook och Instagram fick problem strax före 12. Minuter senare fungerade allt som vanligt för de flesta användare.",
				"language": "sv",
				"libraryCatalog": "Sveriges Radio",
				"publicationTitle": "Sveriges Radio",
				"section": "P4 Halland",
				"url": "https://www.sverigesradio.se/artikel/6892091",
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
		"url": "https://www.sverigesradio.se/artikel/6894423",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Siberian 'Beast from the East' keeps Swedish kids inside",
				"creators": [
					{
						"firstName": "Richard",
						"lastName": "Orange",
						"creatorType": "author"
					}
				],
				"date": "2018-02-26T12:31:00Z",
				"abstractNote": "A Siberian cold front has brought Sweden unusually cold temperatures for late February.",
				"language": "en",
				"libraryCatalog": "Sveriges Radio",
				"publicationTitle": "Sveriges Radio",
				"section": "Radio Sweden",
				"url": "https://www.sverigesradio.se/artikel/6894423",
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
		"url": "https://www.sverigesradio.se/sok?query=choklad",
		"defer": true,
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.sverigesradio.se/artikel/har-gor-den-svenska-extrabubblan-sin-forsta-traning",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Här gör den svenska ”extrabubblan” sin första träning",
				"creators": [
					{
						"lastName": "Radiosporten",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "2021-06-11T18:03:00Z",
				"abstractNote": "Under fredagen genomfördes den första träningen för de sex spelare som blixtinkallats till fotbollslandslagets extrabubbla.",
				"language": "sv",
				"libraryCatalog": "Sveriges Radio",
				"publicationTitle": "Sveriges Radio",
				"section": "Radiosporten",
				"url": "https://www.sverigesradio.se/artikel/har-gor-den-svenska-extrabubblan-sin-forsta-traning",
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
		"url": "https://www.sverigesradio.se/artikel/boreal-regnskog-upptackt-i-vastra-jamtland",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Upptäckten: Här kan det finnas svensk regnskog",
				"creators": [
					{
						"firstName": "Mats",
						"lastName": "Ottosson",
						"creatorType": "author"
					}
				],
				"date": "2026-11-05T18:30:00Z",
				"abstractNote": "Svenska och norska biologer har identifierat ett område i västra Jämtland som uppfyller kriterierna för boreal regnskog.",
				"language": "sv",
				"libraryCatalog": "Sveriges Radio",
				"publicationTitle": "Sveriges Radio",
				"section": "Vetenskapsradion Nyheter",
				"shortTitle": "Upptäckten",
				"url": "https://www.sverigesradio.se/artikel/boreal-regnskog-upptackt-i-vastra-jamtland",
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
		"url": "https://www.sverigesradio.se/artikel/trafikverket-fick-svara-om-sveriges-radios-granskning",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Efter granskningen: Trafikverket fick svara i utskottet",
				"creators": [
					{
						"firstName": "Lisa Linder",
						"lastName": "Lindberg",
						"creatorType": "author"
					},
					{
						"firstName": "Mikael Grill",
						"lastName": "Pettersson",
						"creatorType": "author"
					}
				],
				"date": "2026-11-05T16:18:00Z",
				"abstractNote": "Trafikverkets högsta ledning fick under torsdagen svara på frågor från riksdagens trafikutskott om Ekots och P4 Dalarnas granskning av myndighetens it-affärer.",
				"language": "sv",
				"libraryCatalog": "Sveriges Radio",
				"publicationTitle": "Sveriges Radio",
				"section": "Ekot",
				"shortTitle": "Efter granskningen",
				"url": "https://www.sverigesradio.se/artikel/trafikverket-fick-svara-om-sveriges-radios-granskning",
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
		"url": "https://www.sverigesradio.se/artikel/sweden-to-extend-internal-border-checks",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Sweden to extend internal border checks",
				"creators": [
					{
						"lastName": "Radio Sweden",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "2026-11-05T13:35:00Z",
				"abstractNote": "The caretaker government says it's extending the period for internal border checks for another six month period in Sweden based on an assessment that there is a serious threat to public order and internal security.",
				"language": "en",
				"libraryCatalog": "Sveriges Radio",
				"publicationTitle": "Sveriges Radio",
				"section": "Radio Sweden",
				"url": "https://www.sverigesradio.se/artikel/sweden-to-extend-internal-border-checks",
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
		"url": "https://sverigesradio.se/artikel/boreal-regnskog-upptackt-i-vastra-jamtland",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Upptäckten: Här kan det finnas svensk regnskog",
				"creators": [
					{
						"firstName": "Mats",
						"lastName": "Ottosson",
						"creatorType": "author"
					}
				],
				"date": "2026-11-05T18:30:00Z",
				"abstractNote": "Svenska och norska biologer har identifierat ett område i västra Jämtland som uppfyller kriterierna för boreal regnskog.",
				"language": "sv",
				"libraryCatalog": "Sveriges Radio",
				"publicationTitle": "Sveriges Radio",
				"section": "Vetenskapsradion Nyheter",
				"shortTitle": "Upptäckten",
				"url": "https://www.sverigesradio.se/artikel/boreal-regnskog-upptackt-i-vastra-jamtland",
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
