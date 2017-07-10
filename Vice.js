{
	"translatorID": "131310dc-854c-4629-acad-521319ab9f19",
	"label": "Vice",
	"creator": "czar",
	"target": "^https?://((www|broadly|creators|i-d|amuse-i-d|impact|motherboard|munchies|news|noisey|sports|thump|tonic|waypoint)\\.)?vice\\.com",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2017-07-10 08:03:12"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2017 czar
	http://en.wikipedia.org/wiki/User_talk:Czar

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

// attr()/text()
function attr(doc,selector,attr,index){if(index>0){var elem=doc.querySelectorAll(selector).item(index);return elem?elem.getAttribute(attr):null}var elem=doc.querySelector(selector);return elem?elem.getAttribute(attr):null}function text(doc,selector,index){if(index>0){var elem=doc.querySelectorAll(selector).item(index);return elem?elem.textContent:null}var elem=doc.querySelector(selector);return elem?elem.textContent:null}

function detectWeb(doc, url) {
	if (/\/(article|story)\//.test(url)) {
		return "blogPost";
	} else if (/\.vice\.com\/?($|\w\w(\_\w\w)?\/?$)|\/(search\?q=)|topic\/|category\/|(latest|read)($|\?page=)/.test(url) && getSearchResults(doc, true) ) {
		return "multiple";
	} else if (/amuse-i-d\.vice\.com\/[\w\d-]+\/$/.test(url)) { /* Amuse i-D */
		return "blogPost";
	}
}

function scrape(doc, url) {
	var item = new Zotero.Item("blogPost");
	item.blogTitle = attr(doc,'meta[property="og:site_name"]','content') || "Vice";
	item.language = attr(doc,'html','lang');
	item.url = url;
	item.title = text(doc,'.id-title') || attr(doc,'meta[property="og:title"]','content')/* i-D */;
	item.date = attr(doc,'meta[name="datePublished"]','content') || attr(doc,'meta[property="og:article:published_time"]','content')/* i-D */ || attr(doc,'meta[property="article:published_time"]','content')/* Amuse i-D */ || text(doc,'.post__date')/* Vice News */;
	if (item.date && item.date.indexOf(" on ") != -1) // clean Vice News
		item.date = ZU.strToISO(item.date.replace(' on ',''));
	item.abstractNote = attr(doc,'meta[name="description"]','content');
	// meta keywords has a bunch of junk, so scrape instead:
	var keywords = doc.querySelectorAll('.topics li.topic');
	var keywords_i_D = doc.querySelectorAll('meta[property="og:article:tag"]'); // i-D uses og
	if (keywords.length) {
		for (var i=0; i<keywords.length; i++) {
			item.tags.push(keywords[i].textContent)
		}
	} else if (keywords_i_D.length) { 
		for (var i=0; i<keywords_i_D.length; i++) {
			item.tags.push(keywords_i_D[i].getAttribute('content'))
		}		
	}
	
	// archives appear to 404 on load?
	item.attachments.push({
		title: (attr(doc,'meta[property="og:site_name"]','content') || "Vice")+ " Snapshot",
		mimeType: "text/html",
		document: doc
	});

	// Authors – I haven't found an article with more than one author, but share if you do
	var authors = attr(doc,'.contributor__name .contributor__link','title') || attr(doc,'meta[property="og:article:author"]','content')/* i-D */ || text(doc,'.post__speaker a')/* Vice News? */ || text(doc,'.header-info-module__info span')/* Amuse i-D */;
	if (authors) {
		item.creators.push(ZU.cleanAuthor(authors, "author"));
	}

	item.complete();
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.search__results__item__title, .grid__wrapper__card__text__title, .lede__content__title, .blog-grid__wrapper__card__text__title, .title-container h1.title, .item .item-title');
	var links = doc.querySelectorAll('.search__results__item, .grid__wrapper__card, .lede__content__title, .blog-grid__wrapper__card, .title-container h1.title a, .item .item-title a, .item > a');
	for (var i=0; i<rows.length; i++) {
		var href = links[i].href;
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
	} if (detectWeb(doc, url) == "blogPost") { // prevent unhandled pages
		scrape(doc, url); 
	}
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.vice.com/en_us/article/padaqv/anti-g20-activists-told-us-what-they-brought-to-the-protest-in-hamburg",
		"items": [
			{
				"itemType": "blogPost",
				"title": "Anti-G20 Activists Told Us What They Brought to the Protest in Hamburg",
				"creators": [
					{
						"firstName": "Alexander",
						"lastName": "Indra",
						"creatorType": "author"
					}
				],
				"date": "2017-07-07T11:44:00-04:00",
				"abstractNote": "\"My inflatable crocodile works as a shield against police batons, and as a seat. It also just lightens the mood.\"",
				"blogTitle": "Vice",
				"language": "en",
				"url": "https://www.vice.com/en_us/article/padaqv/anti-g20-activists-told-us-what-they-brought-to-the-protest-in-hamburg",
				"attachments": [
					{
						"title": "Vice Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					"G20",
					"Hamburg",
					"VICE Germany",
					"VICE International",
					"demo",
					"demonstration",
					"protest"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://waypoint.vice.com/en_us/article/bjxjbw/nina-freemans-games-really-get-millennial-romance",
		"items": [
			{
				"itemType": "blogPost",
				"title": "Nina Freeman’s Games Really Get Millennial Romance",
				"creators": [
					{
						"firstName": "Kate",
						"lastName": "Gray",
						"creatorType": "author"
					}
				],
				"date": "2017-07-09T14:00:00-04:00",
				"abstractNote": "And by rummaging around our own pasts through them, we can better understand where we are, and where we’ve been, on all things sexual.",
				"blogTitle": "Waypoint",
				"language": "en",
				"url": "https://waypoint.vice.com/en_us/article/bjxjbw/nina-freemans-games-really-get-millennial-romance",
				"attachments": [
					{
						"title": "Waypoint Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					"Awkward Teenage Rituals",
					"How Do You Do It",
					"Lost Memories Dot Net",
					"Nina Freeman",
					"cibelle",
					"msn",
					"romance"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.vice.com/de/article/59pdy5/wie-kaputte-handys-und-profite-die-g20-gegner-antreiben",
		"items": [
			{
				"itemType": "blogPost",
				"title": "Wie kaputte Handys und Profite die G20-Gegner antreiben",
				"creators": [
					{
						"firstName": "Laura",
						"lastName": "Meschede",
						"creatorType": "author"
					}
				],
				"date": "2017-07-09T06:47:09-04:00",
				"abstractNote": "Der Rüstungsgegner, die Umweltschützerin und die Hippiefrau: Ich glaube, eigentlich haben sie das gleiche Ziel. Sie haben es auf ihren Plakaten nur unterschiedlich formuliert.",
				"blogTitle": "Vice",
				"language": "de",
				"url": "https://www.vice.com/de/article/59pdy5/wie-kaputte-handys-und-profite-die-g20-gegner-antreiben",
				"attachments": [
					{
						"title": "Vice Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					"G20",
					"Hamburg",
					"Laura Meschede",
					"Meinung",
					"Wirtschaft",
					"kapitalismus"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://waypoint.vice.com/en_us/latest?page=2",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://amuse-i-d.vice.com/category/well-being/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://i-d.vice.com/en_us/article/anish-kapoor-has-been-banned-from-using-yet-another-rare-paint",
		"items": [
			{
				"itemType": "blogPost",
				"title": "anish kapoor has been banned from using yet another rare paint",
				"creators": [
					{
						"firstName": "Isabelle",
						"lastName": "Hellyer",
						"creatorType": "author"
					}
				],
				"date": "2017-07-07T14:18:46+00:00",
				"abstractNote": "Contemporary art's most bizarre feud heats up with the creation of a new color-changing paint available to all — except Kapoor.",
				"blogTitle": "i-D",
				"language": "en",
				"url": "http://i-d.vice.com/en_us/article/anish-kapoor-has-been-banned-from-using-yet-another-rare-paint",
				"attachments": [
					{
						"title": "i-D Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					"Anish Kapoor",
					"Art",
					"News",
					"Stuart Semple",
					"Vantablack"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://i-d.vice.com/en_us/topic/music",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://news.vice.com/story/voters-may-soon-toughen-up-americas-weakest-police-shootings-law",
		"items": [
			{
				"itemType": "blogPost",
				"title": "Voters may soon toughen up America’s weakest police shootings law",
				"creators": [
					{
						"firstName": "Carter",
						"lastName": "Sherman",
						"creatorType": "author"
					}
				],
				"date": "2017-07-07",
				"blogTitle": "Vice",
				"language": "en-US",
				"url": "https://news.vice.com/story/voters-may-soon-toughen-up-americas-weakest-police-shootings-law",
				"attachments": [
					{
						"title": "Vice Snapshot",
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
		"url": "https://amuse-i-d.vice.com/exclusive-around-the-world-with-goshas-favourite-artist/",
		"items": [
			{
				"itemType": "blogPost",
				"title": "Exclusive: Around the World With Gosha’s Favourite Artist | Amuse",
				"creators": [
					{
						"firstName": "Katja",
						"lastName": "Horvat",
						"creatorType": "author"
					}
				],
				"date": "2017-07-06T10:00:25Z",
				"abstractNote": "Julian Klincewicz on the importance of vacationing properly",
				"blogTitle": "Amuse",
				"language": "en-US",
				"shortTitle": "Exclusive",
				"url": "https://amuse-i-d.vice.com/exclusive-around-the-world-with-goshas-favourite-artist/",
				"attachments": [
					{
						"title": "Amuse Snapshot",
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
		"url": "https://www.vice.com/de",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://thump.vice.com/en_us/search?q=venetian",
		"items": "multiple"
	}
]
/** END TEST CASES **/
