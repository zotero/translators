{
	"translatorID": "06142d59-fa9c-48c3-982b-6e7c67d3d6b8",
	"label": "The Hindu",
	"creator": "Philipp Zumstein",
	"target": "^https?://www\\.thehindu\\.com/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-10-18 17:39:21"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2017 Philipp Zumstein
	
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

/**
This translator interfaces with www.thehindu.com on the current content
of the newspaper. The other translator "The Hindu (old)" deals with older
content (pre 2009)
**/

async function detectWeb(doc, url) {
	// .ece als PAD-suffix (niet ergens in query/fragment)
	if (/\.ece(?:[?#]|$)/.test(url)) {
		return "newspaperArticle";
	}
	if (isSearchPage(url)) {
		// The results are injected by the search widget after load, so
		// there is nothing to judge from the document as it arrives.
		return (await waitForResults(doc)) ? "multiple" : false;
	}
	return false;
}

// A search page is only useful once a query is present; /search/ on its own
// and /search/?q= are empty.
var SEARCH_QUERY_RE = /[?&#](?:gsc\.)?(?:q|query)=[^&#]+/;

function isSearchPage(url) {
	return /\/search\/(?:[?#]|$)/.test(url) && SEARCH_QUERY_RE.test(url);
}

async function waitForResults(doc) {
	for (var i = 0; i < 20; i++) {
		if (doc.querySelector('div.gsc-results a.gs-title')) {
			return true;
		}
		await new Promise(resolve => setTimeout(resolve, 250));
	}
	return false;
}


function getSearchResults(doc, checkOnly) {
	var items = {};
	var rows = doc.querySelectorAll('div.gsc-results a.gs-title');
	for (var row of rows) {
		// The link is a google.com redirect; data-ctorig holds the target.
		// Every result is emitted twice, once per thumbnail layout.
		var href = row.dataset.ctorig || row.getAttribute('href');
		var title = cleanSearchTitle(row.textContent);
		if (!href || !title || !/\.ece(?:[?#]|$)/.test(href) || items[href]) {
			continue;
		}
		if (checkOnly) {
			return true;
		}
		items[href] = title;
	}
	return Object.keys(items).length ? items : false;
}

// The results carry the site name as a suffix.
function cleanSearchTitle(text) {
	return ZU.trimInternal(text || '')
		.replace(/\s*[|-]\s*The Hindu(?: BusinessLine)?$/, '');
}


async function doWeb(doc, url) {
	if (await detectWeb(doc, url) == "multiple") {
		var items = getSearchResults(doc, false);
		var selected = await Zotero.selectItems(items);
		if (!selected) {
			return;
		}
		// Sequential: a search result set is a few dozen pages at most.
		for (var article of Object.keys(selected)) {
			await scrapeDocument(article);
		}
	}
	else {
		scrape(doc, url);
	}
}

// scrape() is callback based, so this promise settles only after the item is done.
function scrapeDocument(url) {
	return requestDocument(url).then(doc => scrape(doc, url));
}

function scrape(doc, url) {
	var translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	//translator.setDocument(doc);
	
	translator.setHandler('itemDone', function (obj, item) {
		// Fix the authors. The byline block is the only reliable source: the footer
		// link "authors & contributors-menu" is not a person, and article:author is
		// literally " & " on some pages.
		var byline = getByline(doc);
		if (byline.length) {
			var credits = [];
			for (var i = 0; i < byline.length; i++) {
				var parts = parseCredit(byline[i]);
				for (var j = 0; j < parts.length; j++) {
					if (!hasCredit(credits, parts[j].value)) {
						credits.push(parts[j]);
					}
				}
			}
			item.creators = [];
			for (var k = 0; k < credits.length; k++) {
				item.creators.push(credits[k].type == 'person'
					? personCreator(credits[k].value)
					: corporateCreator(credits[k].value));
			}
		}
		if (!item.date) {
			item.date = ZU.xpathText(doc, '//meta[@name="publish-date"]/@content');
		}
		// De oude div.ut-container is weg; de datumregel eindigt nu op " IST - Plaats".
		// Daarvoor in de plaats is er een generieke .update-publish-time, dus anker op
		// die tekst in plaats van op de containerklasse.
		var placeText = ZU.xpathText(doc, '//p[contains(@class, "updated-time")]/span')
			|| ZU.xpathText(doc, '//div[contains(@class, "update-publish-time")]');
		var place = placeText && placeText.split(/\s+-\s+/).pop();
		if (place && !/\d/.test(place) && place.length < 60) {
			item.place = ZU.capitalizeTitle(place.trim(), true);
		}
		item.language = "en-IN";
		item.publicationTitle = "The Hindu";
		// EM neemt de meta-description over, maar de pagina bevat daar dubbele spaties
		// ("moved aside  so we could embrace") die in de HTML-collapse niet zichtbaar zijn.
		if (item.abstractNote) {
			item.abstractNote = ZU.trimInternal(item.abstractNote);
		}
		// Sommige artikelen hebben een automatisch gevulde description
		// ("<Kolom> News:<titel>") in plaats van een echte samenvatting; die is
		// waardeloos als abstract. Neem dan de eerste (lange) alinea van de body.
		var ld = getJSONLD(doc);
		if (!item.abstractNote || isGeneratedDescription(item.abstractNote)) {
			var lead = getLeadParagraph(doc);
			if (lead) item.abstractNote = lead;
		}
		// De sectie die Embedded Metadata uit de breadcrumb haalt is de rubriek op
		// het hoogste niveau ("Features", "Business") terwijl JSON-LD de fijnere
		// rubriek geeft ("Metroplus", "Economy").
		if (ld && ld.articleSection) {
			item.section = ZU.trimInternal(String(ld.articleSection));
		}
		item.ISSN = "0971-751X";
		item.complete();
	});

	translator.getTranslatorObject(function (trans) {
		trans.itemType = "newspaperArticle";
		trans.doWeb(doc, url);
	});
}


function getJSONLD(doc) {
	var scripts = doc.querySelectorAll('script[type="application/ld+json"]');
	var found = null;
	for (var i = 0; i < scripts.length; i++) {
		var data;
		try {
			data = JSON.parse(scripts[i].textContent);
		}
		catch (e) {
			continue;
		}
		var nodes = Array.isArray(data) ? data : (data['@graph'] || [data]);
		for (var j = 0; j < nodes.length; j++) {
			if (/Article/.test(nodes[j]['@type'] || '')) {
				found = nodes[j];
			}
		}
	}
	return found;
}

function isGeneratedDescription(text) {
	// "<Kolom> News:<titel>" - geen echte samenvatting
	return /\bNews:\s*/.test(text) || text.length < 40;
}

function getLeadParagraph(doc) {
	var paras = ZU.xpath(doc, '//div[contains(@class, "article-section")]'
		+ '//p[string-length(normalize-space(.)) > 120]');
	for (var i = 0; i < paras.length; i++) {
		// fotobijschriften staan in dezelfde body
		if (/\bcaption\b/.test(paras[i].className || '')) continue;
		var text = ZU.trimInternal(paras[i].textContent);
		if (text) return text;
	}
	return null;
}


// Wire services The Hindu credits in the byline. A credit, not an author.
// Wire services The Hindu credits in its bylines. They are credits, not authors.
var AGENCIES = {
	pti: 'PTI',
	'press trust of india': 'PTI',
	ap: 'AP',
	'associated press': 'AP',
	afp: 'AFP',
	'agence france-presse': 'AFP',
	reuters: 'Reuters',
	ians: 'IANS',
	'indo-asian news service': 'IANS',
	ani: 'ANI',
	'asian news international': 'ANI'
};

// The paper's own desks and the role-only byline, which are not people either.
var DESKS = {
	'the hindu bureau': 'The Hindu Bureau',
	'sports bureau': 'Sports Bureau',
	'team bl': 'Team BL',
	'team sportstar': 'Team Sportstar',
	'special correspondent': 'Special Correspondent'
};

function getByline(doc) {
	var names = [];
	// Only the article byline container counts. A plain contains(@class, "author")
	// also matches the div.author-name of every "related articles" card in
	// div.package-list, which would add a dozen unrelated names as authors.
	var container = '//div[contains(concat(" ", normalize-space(@class), " "), " author ")]';
	var links = ZU.xpath(doc, container + '//a[contains(@class, "person-name")]');
	if (!links.length) {
		// older articles: <div class="author fL"><span>Name</span></div>
		links = ZU.xpath(doc, container + '/span');
	}
	for (var i = 0; i < links.length; i++) {
		var name = ZU.trimInternal(links[i].textContent);
		if (name && !names.includes(name)) {
			names.push(name);
		}
	}
	return names;
}

// Split one byline entry into typed parts: "PTI", "PTI/AFP" and "Lavpreet Kaur,"
// all occur, where the trailing comma belongs to the markup.
function parseCredit(text) {
	var name = ZU.trimInternal(text || '').replace(/^[\s&,]+|[\s&,]+$/g, '');
	if (!name) return [];
	var chunks = name.split(/\s*(?:[/&,]|\band\b)\s*/i);
	if (chunks.length > 1) {
		var parts = [];
		for (var i = 0; i < chunks.length; i++) {
			parts = parts.concat(parseCredit(chunks[i]));
		}
		return parts;
	}
	if (AGENCIES[name.toLowerCase()]) {
		return [{ type: 'corporate', value: AGENCIES[name.toLowerCase()] }];
	}
	if (DESKS[name.toLowerCase()]) {
		return [{ type: 'desk', value: DESKS[name.toLowerCase()] }];
	}
	return [{ type: 'person', value: name }];
}

function hasCredit(credits, value) {
	for (var i = 0; i < credits.length; i++) {
		if (credits[i].value === value) {
			return true;
		}
	}
	return false;
}

function personCreator(name) {
	// Some bylines are all caps ("SHARAN APPARAO"); initials such as "G.V.R."
	// must survive, so only rewrite names that carry no lowercase at all.
	if (name == name.toUpperCase()) {
		name = ZU.capitalizeTitle(name.toLowerCase(), true);
	}
	return ZU.cleanAuthor(name, 'author');
}

// Agencies and desks get a contributor in one field, so a credit like
// "The Hindu Bureau" does not become the persons "The Hindu" and "Bureau".
function corporateCreator(name) {
	return { lastName: name, creatorType: 'contributor', fieldMode: 1 };
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.thehindu.com/news/national/telegram-no-more-stop-100-stop/article4914819.ece",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Telegram no more STOP 100 STOP",
				"creators": [
					{
						"firstName": "Shiv Sahay",
						"lastName": "Singh",
						"creatorType": "author"
					}
				],
				"date": "2013-07-14T17:42:52+05:30",
				"ISSN": "0971-751X",
				"abstractNote": "India bids adieu to the telegram after 163 years",
				"language": "en-IN",
				"libraryCatalog": "www.thehindu.com",
				"place": "Kolkata",
				"publicationTitle": "The Hindu",
				"section": "India",
				"url": "https://www.thehindu.com/news/national/telegram-no-more-stop-100-stop/article4914819.ece",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					"BSNL",
					"Telegram",
					"Telegram service discontinuation",
					"Telegraph service"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.thehindu.com/features/once-favoured-now-forgotten/article4912011.ece?homepage=true",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Once favoured, now forgotten",
				"creators": [
					{
						"firstName": "Anusha",
						"lastName": "Parthasarathy",
						"creatorType": "author"
					},
					{
						"firstName": "Lakshmi",
						"lastName": "Krupa",
						"creatorType": "author"
					}
				],
				"date": "2013-07-14T18:29:36+05:30",
				"ISSN": "0971-751X",
				"abstractNote": "An important part of people’s lives for many years, the telegram is now no more. And, we can’t help but think of such integral aspects of our growing up years that have now disappeared or have become less significant. Though they have moved aside so we could embrace a better lifestyle, they will always remain an ode to an age when life was much simpler. Anusha Parthasarathy and Lakshmi Krupa press the rewind button",
				"language": "en-IN",
				"libraryCatalog": "www.thehindu.com",
				"place": "Chennai",
				"publicationTitle": "The Hindu",
				"section": "Metroplus",
				"url": "https://www.thehindu.com/features/metroplus/once-favoured-now-forgotten/article4912011.ece",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					"Cassette tapes",
					"Dial-up",
					"Floppy discs",
					"Gramophone",
					"Pager",
					"Roll films",
					"Transistor radio",
					"Typewriter",
					"VCR"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.thehindu.com/business/Economy/petrol-prices-to-go-up-by-rs-155-per-litre/article4914855.ece",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Petrol prices to go up by Rs. 1.55 per litre",
				"creators": [
					{
						"lastName": "PTI",
						"creatorType": "contributor",
						"fieldMode": 1
					}
				],
				"date": "2013-07-14T17:57:17+05:30",
				"ISSN": "0971-751X",
				"abstractNote": "This is the fourth increase since June. It was raised by 75 paise on June 1, followed by a Rs. 2 per litre increase on June 16 and a Rs. 1.82 per litre hike on June 29.",
				"language": "en-IN",
				"libraryCatalog": "www.thehindu.com",
				"place": "New Delhi",
				"publicationTitle": "The Hindu",
				"section": "Economy",
				"url": "https://www.thehindu.com/business/Economy/petrol-prices-to-go-up-by-rs-155-per-litre/article4914855.ece",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					"Petrol price hike",
					"Rupee fall",
					"oil imports",
					"oil marketing companies"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.thehindu.com/opinion/columns/devdutt-pattanaik-column-india-has-many-krishnas-cult-to-culture/article71467898.ece",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Column by Devdutt Pattanaik | India has many Krishnas",
				"creators": [
					{
						"firstName": "Devdutt",
						"lastName": "Pattanaik",
						"creatorType": "author"
					}
				],
				"date": "2026-09-17T06:06:00+05:30",
				"ISSN": "0971-751X",
				"abstractNote": "Explore the diverse interpretations of Krishna across India, reflecting regional identities, cultural nuances, and spiritual aspirations through history.",
				"language": "en-IN",
				"libraryCatalog": "www.thehindu.com",
				"publicationTitle": "The Hindu",
				"section": "Columns",
				"url": "https://www.thehindu.com/opinion/columns/devdutt-pattanaik-column-india-has-many-krishnas-cult-to-culture/article71467898.ece",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					"Devdutt Pattanaik on India's many Krishnas",
					"Devdutt Pattanaik's From cult to culture",
					"India has many Krishnas writes Devdutt Pattanaik",
					"diverse interpretations of Krishna across India"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.thehindu.com/news/international/clashes-and-fires-break-out-as-protesters-rally-across-france-joining-students/article71598941.ece",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Clashes and fires break out as protesters rally across France, joining students",
				"creators": [
					{
						"lastName": "AP",
						"creatorType": "contributor",
						"fieldMode": 1
					}
				],
				"date": "2026-10-18T07:05:54+05:30",
				"ISSN": "0971-751X",
				"abstractNote": "Violent protests surge across France as thousands rally, damaging property and clashing with police amid student blockades and rising costs.",
				"language": "en-IN",
				"libraryCatalog": "www.thehindu.com",
				"publicationTitle": "The Hindu",
				"section": "World",
				"url": "https://www.thehindu.com/news/international/clashes-and-fires-break-out-as-protesters-rally-across-france-joining-students/article71598941.ece",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					"France protests",
					"France unrest",
					"France violence protests",
					"French reform protests",
					"French youth protests"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.thehindu.com/news/cities/chennai/rediscover-satyajit-ray-at-this-durga-puja-pandal-in-nandanam/article71597692.ece",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Rediscover Satyajit Ray at this Durga Puja pandal in Nandanam",
				"creators": [
					{
						"lastName": "The Hindu Bureau",
						"creatorType": "contributor",
						"fieldMode": 1
					}
				],
				"date": "2026-10-17T23:12:19+05:30",
				"ISSN": "0971-751X",
				"abstractNote": "The 48th Sharadotsav of South Madras Cultural Association with a pandal themed around \u201cSatyajit Ray\u2019s Magical Creations\u201d is the team work of its members",
				"language": "en-IN",
				"libraryCatalog": "www.thehindu.com",
				"publicationTitle": "The Hindu",
				"section": "Chennai",
				"url": "https://www.thehindu.com/news/cities/chennai/rediscover-satyajit-ray-at-this-durga-puja-pandal-in-nandanam/article71597692.ece",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					"Durga Puja celebrations and chennai",
					"South Madras Cultural Association and durga puja",
					"satyajit ray and pandal theme"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.thehindu.com/search/?q=kerala",
		"items": "multiple"
	}
]
/** END TEST CASES **/
