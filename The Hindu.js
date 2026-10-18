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
	"lastUpdated": "2026-10-17 12:55:00"
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

function detectWeb(doc, url) {
	// .ece als PAD-suffix (niet ergens in query/fragment)
	if (/\.ece(?:[?#]|$)/.test(url)) {
		return "newspaperArticle";
	} else if (url.includes('/search/?') && getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//div[contains(@class, "story-card-33-news") or contains(@class, "story-card-news")]//a[contains(@href, ".ece")]');
	for (var i = 0; i < rows.length; i++) {
		var href = rows[i].href;
		var title = ZU.trimInternal(rows[i].textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}


function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (!items) {
				return true;
			}
			var articles = [];
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, scrape);
		});
	} else {
		scrape(doc, url);
	}
}

function scrape(doc, url) {
	var translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	//translator.setDocument(doc);
	
	translator.setHandler('itemDone', function (obj, item) {
		//fix the authors
		// The Hindu zet de byline server-side in de HTML:
		//   <div class="author-name"><a class="person-name" href=".../profile/author/<slug>/">Naam</a>
		// De oude selector (div.author-container) bestaat niet meer en leverde dus niets op.
		// Het byline-blok is de ENIGE betrouwbare bron: de footer bevat een link met
		// class="authors &amp; contributors-menu" (daar kwam lastName "&" vandaan) en
		// article:author is op sommige pagina's letterlijk " & ".
		var names = [];
		var seen = {};
		var links = ZU.xpath(doc, '//div[contains(@class, "author")]'
			+ '//a[contains(@class, "person-name")]');
		for (var i=0; i<links.length; i++) {
			var name = ZU.trimInternal(links[i].textContent);
			if (name && !seen[name]) {
				seen[name] = 1;
				names.push(name);
			}
		}
		if (!names.length) {
			// oudere artikelen: <div class="author fL"><span>Naam</span></div>
			var oldAuthors = ZU.xpath(doc, '//div[contains(@class, "author")]/span');
			for (var j=0; j<oldAuthors.length; j++) {
				var oldName = ZU.trimInternal(oldAuthors[j].textContent);
				if (oldName && !seen[oldName]) {
					seen[oldName] = 1;
					names.push(oldName);
				}
			}
		}
		if (names.length>0) {
			item.creators = [];
			for (var k=0; k<names.length; k++) {
				insertCreator(names[k], item);
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

	translator.getTranslatorObject(function(trans) {
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


function insertCreator(authorName, newItem){
	/*Check for some author name conventions unique to the Hindu*/
	/*Right now we are using the following: 
	  
	  1) PTI, a news agency, is often credited as an author on The
	  Hindu articles.  We just change the author status to
	  "contributor", and retain the capitalization.
	  
	  2) Some articles are bylined "Special Coresspondent". Again, we
	  change the author status to "contributor".
	  
	*/
	authorName = ZU.capitalizeTitle(authorName.toLowerCase(), true);
	if (authorName == "Pti") {
		newItem.creators.push({
			lastName: "PTI", 
			creatorType: 'contributor', 
			fieldMode: 1
		});
	} else if (authorName == "Special Correspondent") {
		newItem.creators.push({
			lastName: "Special Correspondent", 
			creatorType: 'contributor', 
			fieldMode: 1
		});
	} else {
		newItem.creators.push(ZU.cleanAuthor(authorName, "author"));
	}
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
	}
];
/** END TEST CASES **/
