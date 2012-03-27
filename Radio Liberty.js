{
	"translatorID": "b1c90b99-2e1a-4374-a03b-92e45f1afc55",
	"label": "Radio Free Europe / Radio Liberty",
	"creator": "Avram Lyon",
	"target": "^http://www\\.rferl\\.org/|^http://www\\.azatliq\\.org/|^http://www\\.azattyq\\.org/|^http://rus\\.azattyq\\.org/|^http://da\\.azadiradio\\.org/|^http://pa\\.azadiradio\\.org/|^http://www\\.azattyk\\.org/|^http://www\\.ozodi\\.org/|^http://www\\.ozodlik\\.org/|^http://www\\.evropaelire\\.org/|^http://www\\.slobodnaevropa\\.org/|^http://www\\.makdenes\\.org/|^http://www\\.iraqhurr\\.org/|^http://www\\.radiofarda\\.com/|^http://www\\.azatutyun\\.am/|^http://www\\.azadliq\\.org/|^http://www\\.svaboda\\.org/|^http://www\\.tavisupleba\\.org/|^http://www\\.azathabar\\.com/|^http://www\\.svobodanews\\.ru/|^http://www\\.europalibera\\.org/|^http://www\\.radiosvoboda\\.org/",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcs",
	"lastUpdated": "2012-03-27 01:24:06"
}

/*
   Radio Liberty Translator
   Copyright (C) 2009-2011 Avram Lyon, ajlyon@gmail.com

   This program is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 3 of the License, or
   (at your option) any later version.

   This program is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with this program.  If not, see <http://www.gnu.org/licenses/>.
 
 This translator works on articles posted on the websites of Radio Free Europe / Radio Liberty.
 It imports the basic metadata the site provides, from normal article pages and from search 
 result pages.

 The translator tries to work on all of the languages of RFE/RL; they should all work.
 
 Editions:
	English:	http://www.rferl.org/
	Tatar/Bashkir:	http://www.azatliq.org/
	Kazakh:		http://www.azattyq.org/	(Kazakh)
			http://rus.azattyq.org/	(Russian)
	Afghan:		http://da.azadiradio.org/ (Dari)
			http://pa.azadiradio.org/ (Pashto)
	Kirghiz:	http://www.azattyk.org/
	Tajik:		http://www.ozodi.org/
	Uzbek:		http://www.ozodlik.org/
	Albanian:	http://www.evropaelire.org/
	Bosnian/Montenegrin/Serbian:
			http://www.slobodnaevropa.org/
	Macedonian:	http://www.makdenes.org/
	Iraqi Arabic:	http://www.iraqhurr.org/
	Farsi:		http://www.radiofarda.com/
	Armenian:	http://www.azatutyun.am/
	Azerbaijani:	http://www.azadliq.org/
	Belarus:	http://www.svaboda.org/
	Georgian:	http://www.tavisupleba.org/
	Turkmen:	http://www.azathabar.com/
	Russian:	http://www.svobodanews.ru/
	Moldovan:	http://www.europalibera.org/ (Romanian)
	Ukrainian:	http://www.radiosvoboda.org/
 
 This translator does not yet attempt to work with the video files that Radio Liberty
 hosts and produces; work with them must be left for a future revision.

 It does try to save linked audio files for stories-- still nothing
 for video content.

 Another future improvement would be the facility to import from the front page and subject
 pages. This is not yet possible.

 Some of the services use non-standard ways of marking authorship, for example, the Pashto edition
 places the author at the bottom of the article, but there is no clear way to scrape that
 information and the translator does not load it.
*/

function detectWeb(doc, url){
	if (url.match(/\/content\/|\/archive\/news|\/archive\/ru_news_zone/)) {
		// The translator uses this type because RFE/RL generally has a place of publication
		// and a Section; both are specific to newspaperArticle.
		return "newspaperArticle";
	} else if (url.match(/\/search\/\?k=.+/)){
		return "multiple";
	}
}

function doWeb(doc, url){
	var n = doc.documentElement.namespaceURI;
	var ns = n ? function(prefix) {
		if (prefix == 'x') return n; else return null;
	} : null;
	
	var articles = new Array();
	if (detectWeb(doc, url) == "multiple") {
		var results = doc.evaluate('//div[@class="searchResultItem"]', doc, ns, XPathResult.ANY_TYPE, null);
		var items = new Array();
		var result;
		while(result = results.iterateNext()) {
			var link = doc.evaluate('./a[@class="resultLink"]', result, ns, XPathResult.ANY_TYPE, null).iterateNext();
			var title = link.textContent;
			var url = link.href;
			items[url] = title;
		}
		items = Zotero.selectItems(items);
		if(!items) return true;
		for (var i in items) {
			articles.push(i);
		}
	} else {
		articles = [url];
	}
	
	Zotero.Utilities.processDocuments(articles, function(doc) {
		item = new Zotero.Item("newspaperArticle");
		item.title = Zotero.Utilities.trimInternal(
			doc.evaluate('//h1', doc, ns, XPathResult.ANY_TYPE, null).iterateNext().textContent
		);
		
		var author = doc.evaluate('//div[@id="article"]//div[@class="author"]', doc, ns, XPathResult.ANY_TYPE, null);
		if ((author = author.iterateNext()) !== null) {
			author = author.textContent;
			// Sometimes we have "By Author"
			if(author.substr(0, 3).toLowerCase() == "by ") {
				author = author.substr(3);
			}
			var cleaned = Zotero.Utilities.cleanAuthor(author, "author");
			// If we have only one name, set the author to one-name mode
			if (cleaned.firstName == "") {
				cleaned["fieldMode"] = true;
			} else {
				// We can check for all lower-case and capitalize if necessary
				// All-uppercase is handled by cleanAuthor
				cleaned.firstName = (cleaned.firstName == cleaned.firstName.toLowerCase()) ?
					Zotero.Utilities.capitalizeTitle(cleaned.firstName, true) : cleaned.firstName;
				cleaned.lastName = (cleaned.lastName == cleaned.lastName.toLowerCase()) ?
					Zotero.Utilities.capitalizeTitle(cleaned.lastName, true) : cleaned.lastName;
			}
			item.creators.push(cleaned);
		}
		// The section should _always_ be present
		item.section = doc.evaluate('//div[@id="article" or @class="middle_content"]/h2', doc, ns, XPathResult.ANY_TYPE, null).iterateNext().textContent.trim();

		// This exposes a limitation of Zotero's date handling; the Afghan services
		// use the Hijri calendar, and mixed sorting looks funny-- I'd like to be able
		// to mark such dates to be handled appropriately
		var date = doc.evaluate('//div[@id="article"]//p[@class="article_date"]', doc, ns, XPathResult.ANY_TYPE, null);
		if ((date = date.iterateNext()) !== null) {
			// sometimes not present
			item.date = Zotero.Utilities.trimInternal(date.textContent);
		}

		// We can also try to derive the location-- if the byline can be parsed
		// Here, we assume that the byline uses all-caps for the location
		// TODO Use more general all-caps character class, since this excludes special
		// 	characters that may occur in city names.
		//	This all-caps class is borrowed from utilities.js and augmented by
		//	the basic Cyrillic capital letters.
		var textnode = doc.evaluate('//div[@id="article"]//div[@class="zoomMe"]', doc, ns, XPathResult.ANY_TYPE, null).iterateNext();
		if (textnode) {
			var text = textnode.textContent;
			hits = text.match(/([A-ZА-Я \u0400-\u042f]+) \((.*)\) --/);
			if (!hits) {
				hits = text.match(/([A-ZА-Я \u0400-\u042f]+) --/);
			}
			if (hits) {
				var place = Zotero.Utilities.capitalizeTitle(hits[1], true);
				item.place = place;
				// We add the wire service as an author; it would be nice to have a field for it
				item.creators.push({lastName : hits[2], creatorType:"author", fieldMode:true});
			}
		}

		item.url = url;
		item.publicationTitle = doc.evaluate('//h2[@id="header_logo_anchor" or @id="header_logo"]//span', doc, ns, XPathResult.ANY_TYPE, null).iterateNext().textContent;

		// Language map:
		var map = {
			"www.rferl.org" : "English",
			"www.azatliq.org" : "Tatar/Bashkir",
			"www.azattyq.org" : "Kazakh",
			"rus.azattyq.org" : "Russian",
			"da.azadiradio.org" : "Dari",
			"pa.azadiradio.org" : "Pashto",
			"www.azattyk.org" : "Kirghiz",
			"www.ozodi.org" : "Tajik",
			"www.ozodlik.org" : "Uzbek",
			"www.evropaelire.org" : "Albanian",
			"www.slobodnaevropa.org" : "Bosnian/Montenegrin/Serbian",
			"www.makdenes.org" : "Macedonian",
			"www.iraqhurr.org" : "Iraqi Arabic",
			"www.radiofarda.com" : "Farsi",
			"www.azatutyun.am" : "Armenian",
			"www.azadliq.org" : "Azerbaijani",
			"www.svaboda.org" : "Belarussian",
			"www.tavisupleba.org" : "Georgian",
			"www.azathabar.com" : "Turkmen",
			"www.svobodanews.ru" : "Russian",
			"www.europalibera.org" : "Romanian",
			"www.radiosvoboda.org" : "Ukrainian"
		}
		domain = doc.location.href.match(/https?:\/\/([^/]+)/);
		item.language = map[domain[1]];

		/* The printable version doesn't save nicely, unfortunately.
		// Make printable URL for better saving
		var printurl = url.replace(/(.*)\/.*\/(.*\.html)/,"$1/articleprintview/$2");
		item.attachments.push({url:printurl, title:"RFE/RL Snapshot", mimeType:"text/html"});
		*/
		item.attachments.push({url:url, title: (item.publicationTitle + " Snapshot"), mimeType:"text/html"});

		var listenLink = doc.evaluate('//li[@class="listenlink"]/a', doc, ns, XPathResult.ANY_TYPE, null).iterateNext();
		if (listenLink) {
				Zotero.Utilities.doGet(listenLink.href, addAudio, null);
		} else item.complete();

	}, function() {Zotero.done();});
	Zotero.wait();
}

function addAudio(text) {
	// http://realaudio.rferl.org/TB/2011/03/29/20110329-183936-TB-clip.mp3
	var audio = text.match(/http:\/\/realaudio\.rferl\.org[^"]*\.mp3/);
	if (audio) item.attachments.push({url:audio[0], mimeType:"application/octet-stream", title:"RFE/RL Audio"})
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.azatliq.org/content/article/24281041.html",
		"items": [
			{
				"itemType": "newspaperArticle",
				"creators": [
					{
						"firstName": "Гүзәл",
						"lastName": "Мәхмүтова",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"url": false,
						"title": " Азатлык Радиосы  Snapshot",
						"mimeType": "text/html"
					},
					{
						"url": false,
						"mimeType": "application/octet-stream",
						"title": "RFE/RL Audio"
					}
				],
				"title": "Татар яшьләре татарлыкны сакларга тырыша",
				"section": "татарстан",
				"date": "29.07.2011",
				"url": "http://www.azatliq.org/content/article/24281041.html",
				"publicationTitle": "Азатлык Радиосы",
				"language": "Tatar/Bashkir",
				"libraryCatalog": "Radio Free Europe / Radio Liberty"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.svobodanews.ru/archive/ru_news_zone/20111105/17/17.html?id=24382010",
		"items": [
			{
				"itemType": "newspaperArticle",
				"creators": [],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"url": false,
						"title": " Радио Свобода  Snapshot",
						"mimeType": "text/html"
					}
				],
				"title": "Партия \"Яблоко\" перевела свою предвыборную программу на 18 языков",
				"section": "Новости",
				"url": "http://www.svobodanews.ru/archive/ru_news_zone/20111105/17/17.html?id=24382010",
				"publicationTitle": "Радио Свобода",
				"language": "Russian",
				"libraryCatalog": "Radio Free Europe / Radio Liberty"
			}
		]
	}
]
/** END TEST CASES **/