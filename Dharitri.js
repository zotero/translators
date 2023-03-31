{
	"translatorID": "08edce2b-4831-417b-be9f-5cae6cac38e5",
	"label": "Dharitri",
	"creator": "Subhashish Panigrahi",
	"target": "^https?://(www|news?)\\.dharitri\\.com/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-03-14 14:45:10"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2023 Subhashish Panigrahi

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
	url = url.replace(/[?#].+/, "");
	if (/\d{8}$/.test(url) || /\d{7}\.(stm)$/.test(url)) {
		if (doc.querySelector('#page.media-asset-page, #page.vxp-headlines') {
			return "videoRecording";
		}
		return "newspaperArticle";
	}
	if (url.includes("/newsbeat/article")) {
		return "blogPost";
	}
	if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//a[h3]');
	// for NewsBeat
	if (!rows.length) {
		rows = ZU.xpath(doc, '//article/div/h1[@itemprop="headline"]/a');
	}
	for (let i = 0; i < rows.length; i++) {
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
			if (items) ZU.processDocuments(Object.keys(items), scrape);
		});
	}
	else {
		scrape(doc, url);
	}
}

function scrape(doc, url) {
	url = url.replace(/[?#].+/, "");
	var itemType = detectWeb(doc, url);
	
	var translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	
	translator.setHandler('itemDone', function (obj, item) {
		// add date and time if missing by one of four attempts:
		// 1. look at the json-ld data
		// 2. calculate it from the data-seconds attribute
		// 3. extract it from a nonstandard meta field
		// 4. for old pages, get from metadata
		var jsonld = ZU.xpathText(doc, '//script[@type="application/ld+json"]');
		var data = JSON.parse(jsonld);
		// Z.debug(data);
		if (data && data.datePublished) {
			item.date = data.datePublished;
		}
		else {
			var seconds = attr(doc, 'div .date[data-seconds]', 'data-seconds');
			if (!item.date && seconds) {
				// Z.debug(seconds);
				var date = new Date(1000 * seconds);
				item.date = date.toISOString();
			}
			else {
				item.date = attr(doc, 'meta[property="rnews:datePublished"]', 'content');
				if (!item.date) {
					item.date = text(doc, 'p.timestamp');
					if (!item.date) {
						item.date = attr(doc, 'meta[name="OriginalPublicationDate"]', 'content');
					}
				}
			}
		}
		
		if (item.date) {
			item.date = ZU.strToISO(item.date);
		}
		// delete wrongly attached creators like
		// "firstName": "B. B. C.", "lastName": "News"
		item.creators = [];
		// add authors from byline__name but only if they
		// are real authors and not just part of the webpage title
		// like By BBC Trending, By News from Elsewhere... or By Who, What Why
		var authorString = ZU.xpathText(doc, '//span[@class="byline__name"]');
		var webpageTitle = ZU.xpathText(doc, '//h1');
		if (authorString) {
			authorString = authorString.replace('By', '').replace('...', '');
			let authors = authorString.split('&');
			for (let i = 0; i < authors.length; i++) {
				if (webpageTitle.toLowerCase().includes(authors[i].trim().toLowerCase())) {
					continue;
				}
				item.creators.push(ZU.cleanAuthor(authors[i], "author"));
			}
		}
		else {
			authorString = ZU.xpathText(doc, '//p[@class="byline"]');
			var title = ZU.xpathText(doc, '//em[@class="title"]');
			if (authorString) {
				authorString = authorString.replace(title, '').replace('By', '');
				let authors = authorString.split('&');
				for (let i = 0; i < authors.length; i++) {
					item.creators.push(ZU.cleanAuthor(authors[i], "author"));
				}
			}
		}
		
		// description for About Us page

		if (url.includes("/about-us")) {
			item.blogTitle = "About us";
		}


		for (let i in item.tags) {
			item.tags[i] = item.tags[i].charAt(0).toUpperCase() + item.tags[i].substring(1);
		}

		if (!item.language || item.language === "or") {
			item.language = "or";
		}

		if (url.substr(-4) == ".stm") {
			item.title = ZU.xpathText(doc, '//meta[@name="Headline"]/@content');
		}

		item.complete();
	});

	translator.getTranslatorObject(function (trans) {
		trans.itemType = itemType;
		trans.doWeb(doc, url);
	});
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.dharitri.com/australia-shocked-in-odi-series-after-test-team-captain-changed",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "ଟେଷ୍ଟ ପରେ ଦିନିକିଆ ସିରିଜରେ ଅଷ୍ଟ୍ରେଲିଆକୁ ଝଟ୍‌କା, ବଦଳିଲେ…",
				"creators": [
					{
						"firstName": "",
						"lastName": "",
						"creatorType": "author"
					}
				],
				"date": "2023-03-14",
				"abstractNote": "ଭାରତ ଏବଂ ଅଷ୍ଟ୍ରେଲିଆ ମଧ୍ୟରେ ଟେଷ୍ଟ ସିରିଜ ଶେଷ ହୋଇଛି। ମାର୍ଚ୍ଚ ୧୭ରୁ ଉଭୟ ଦଳ ମଧ୍ୟରେ ୩ ମ୍ୟାଚ୍‌ ବିଶିଷ୍ଟ ଦିନିକିଆ ସିରିଜ ଖେଳାଯିବ। ଏହି ସିରିଜ ଲାଗି ଷ୍ଟିଭ୍‌ ସ୍ମିଥ୍‌ ଅଧିନାୟକ ରହିବେ। ପ୍ୟାଟ୍‌ କମିନ୍ସ ଭାରତ ଫେରିବେ ନାହିଁ। ଏଣୁ ସ୍ମିଥ୍‌ ଅଧିନାୟକ ଦାୟିତ୍ୱ ସମ୍ଭାଳିବେ ବୋଲି କ୍ରିକେଟ ଅଷ୍ଟ୍ରେଲିଆ ନିଶ୍ଚିତ କରିଛି।",
				"language": "or",
				"libraryCatalog": "www.dharitri.com",
				"publicationTitle": "ଧରିତ୍ରୀ",
				"section": "ଖେଳ",
				"url": "https://www.dharitri.com/australia-shocked-in-odi-series-after-test-team-captain-changed",
				"attachments": [
					{
						"title": "ଖେଳ"
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
		"url": "https://www.dharitri.com/category/sports-news/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.dharitri.com/father-in-icu-anubhav-tweets-for-speedy-resolution-of-family-dispute-case/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "ଆଇସିୟୁରେ ବାପା, ପାରିବାରିକ ବିବାଦ ମାମଲା ଶୀଘ୍ର ସାରିବାକୁ ବର୍ଷାଙ୍କୁ ଅନୁଭବଙ୍କ ଟୁଇଟ୍‌",
				"creators": [],
				"date": "2023-03-14",
				"abstractNote": "କେନ୍ଦ୍ରାପଡ଼ା ଏମ୍‌ପି ତଥା ଅଭିନେତା ଅନୁଭବ ମହାନ୍ତି ଓ ତାଙ୍କ ସ୍ତ୍ରୀ ତଥା ଅଭିନେତ୍ରୀ ବର୍ଷା ପ୍ରିୟଦର୍ଶିନୀଙ୍କ ମଧ୍ୟରେ ଚାଲିଥିବା ପାରିବାରିକ କଳହ ଏଯାବତ ସମାଧାନ ହୋଇପାରିନାହିଁ। ମାମଲା କୋର୍ଟରେ ଥିବା ବେଳେ ଏହା ନୂଆ ଏକ ମୋଡ଼ ନେଇଥିବା ଦେଖାଯାଇଛି। ଅନୁଭବଙ୍କ ବାପା ଅସୁସ୍ଥ ଅଛନ୍ତି। ଦିନକୁ ଦିନ ସୁସ୍ଥ ହେବା ବଦଳରେ ସେ ଅଧିକ ଗୁରୁତର ହୋଇଯିବାରୁ ଆଇସିୟୁରେ ତାଙ୍କର ଚିକିତ୍ସା କରାଯାଉଛି। ଏଣୁ ପାରିବାରିକ ବିବାଦ ମାମଲା ଶୀଘ୍ର ସାରିବା ପାଇଁ ଅନୁଭବ ସ୍ତ୍ରୀ ବର୍ଷାଙ୍କୁ ଟୁଇଟ୍‌ କରି ଜଣାଇଛନ୍ତି।",
				"language": "or",
				"libraryCatalog": "www.dharitri.com",
				"publicationTitle": "ଧରିତ୍ରୀ",
				"section": "ମେଟ୍ରୋ",
				"url": "https://www.dharitri.com/father-in-icu-anubhav-tweets-for-speedy-resolution-of-family-dispute-case/",
				"attachments": [
					{
						"title": "ମେଟ୍ରୋ"
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
		"url": "https://www.dharitri.com/in-this-india-856",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "ଏଇ ଭାରତରେ",
				"creators": [
					{
						"firstName": "",
						"lastName": "",
						"creatorType": "author"
					},
				],
				"date": "2023-03-14",
				"abstractNote": "",
				"language": "or",
				"libraryCatalog": "www.dharitri.com",
				"publicationTitle": "ଧରିତ୍ରୀ",
				"section": "ସମ୍ପାଦକୀୟ",
				"url": "https://www.dharitri.com/in-this-india-856",
				"attachments": [
					{
						"title": "ସମ୍ପାଦକୀୟ"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
]
/** END TEST CASES **/
