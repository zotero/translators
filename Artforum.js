{
	"translatorID": "a127f012-4ea4-4d05-a657-24d47f91b016",
	"label": "Artforum",
	"creator": "czar",
	"target": "^https?://(www\\.)?artforum\\.com",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2018-07-08 18:09:39"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2018 czar
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


function detectWeb(doc, url) {
	if (/-\d{5,}$/.test(url)) {
		return "blogPost";
	} else if (getSearchResults(doc, true)) {
		return "multiple";
	}
}

/*
FW.Scraper({
itemType         : 'blogPost',
detect           : FW.Url().match(/\/news\//),
title            : FW.Xpath('//meta[@property="og:title"]/@content').text(),
attachments      : [{ url: FW.Url(),
  title:  "Artforum snapshot",
  type: "text/html" }],
date             : FW.Xpath('//div[@id="NewsContent"]/h6').text().replace(/POSTED\s/,""),
blogTitle        : "Artforum",
language         : "en-US",
abstractNote     : FW.Xpath('//meta[@property="og:description"]/@content').text()
});

FW.Scraper({
itemType         : 'blogPost',
detect           : FW.Url().match(/\/(diary|picks|video|film|passages|slant|museums|words)\/id=/),
title            : FW.Xpath('//meta[@property="og:title"]/@content').text(),
attachments      : [{ url: FW.Url(),
  title:  "Artforum snapshot",
  type: "text/html" }],
creators         : FW.Xpath('//meta[@name="author"]/@content').text().replace(/As told to\s/,"").cleanAuthor("author"), // /words/ uses "As told to" in the byline metadata, and better to regex it out than to pull from the HTML instead
date             : FW.Xpath('//div[@class="Topper"]/h6').text().replace(/(\d{2})\.(\d{2})\.(\d{2})/, "20$3-$1-$2,"),
blogTitle        : "Artforum",
language         : "en-US",
abstractNote     : FW.Xpath('//meta[@property="og:description"]/@content').text()
});

FW.Scraper({
itemType         : 'magazineArticle',
detect           : FW.Url().match(/\/inprint\/issue=\d{6}&id=/),
title            : FW.Xpath('//div[@class="Text"]/h1').text(),
attachments      : [{ url: FW.Url(),
  title:  "Artforum snapshot",
  type: "text/html" }],
creators         : FW.Xpath('//meta[@name="author"]/@content').text().cleanAuthor("author"),
date             : FW.Xpath('//div[@class="Text"]/h6').text(),
blogTitle        : "Artforum",
language         : "en-US",
abstractNote     : FW.Xpath('//meta[@property="og:description"]/@content').text()
});

FW.MultiScraper({
itemType         : 'multiple',
detect           : FW.Url().match(/\/search\//),
choices          : {
  titles  :  FW.Xpath('//p[@class="Title"]/a').text().trim(),
  urls    :  FW.Xpath('//p[@class="Title"]/a').key("href").trim()
}
});
*/
function scrape(doc, url) {
	var translator = Zotero.loadTranslator('web');
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48'); // embedded metadata (EM)
	translator.setDocument(doc);
	
	translator.setHandler('itemDone', function (obj, item) { // corrections to EM
		item.itemType = "blogPost";
		item.publicationTitle = "Artforum";
		var json_ld = doc.querySelector('script[type="application/ld+json"]');
		if (json_ld) {
			json_ld = json_ld.textContent;
			item.date = json_ld.match(/"datePublished"\s?:\s?"([^"]*)"/)[1].split(":")[0];
		}
		var authorMetadata = doc.querySelectorAll('.contrib-link a');
		for (let author of authorMetadata) {
			item.creators.push(ZU.cleanAuthor(author.text, "author"));
		}
		if (url.includes('/print/')) {
			item.itemType = "magazineArticle";
			item.ISSN = "0004-3532";
			var issueDate = doc.querySelector('h3.print-article__issue-title');
			if (issueDate) {
				item.date = issueDate.textContent.trim().replace('PRINT ','');
				/* are you feeling adventurous? could follow link to issue's page and scrape the volume/issue numbers...
				item.volume = 
				item.issue = 
				*/
			}
		}
		item.complete();
	});

	translator.getTranslatorObject(function(trans) {
		trans.doWeb(doc, url);
	});
}


function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	// 1st for search page, 2nd for issue ToC, 3rd/4th/5th for sections, 5th+ for homepage
	var rows = doc.querySelectorAll('h1.results-list__h1, .toc-article__title, .news-list h1, .reviews-list h1, .article-list h1, p.hp-singlefeature-author__writer, h3.hp-news__title, h3.hp-twocolumn__title a, h3.hp-artguide__title, p.hp-bloglist__teaser a');
	var links = doc.querySelectorAll('h1.results-list__h1 a, .toc-article__title a, .news-list h1 a, .reviews-list h1 a, .article-list h1 a, h3.hp-singlefeature-author__title > a, a.hp-news__article, h3.hp-twocolumn__title a, .hp-artguide div.image-container > a, p.hp-bloglist__teaser a');
	for (let i=0; i<rows.length; i++) {
		let href = links[i].href;
		let title = ZU.trimInternal(rows[i].textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}


function doWeb(doc, url) {
	switch (detectWeb(doc, url)) {
		case "multiple":
			Zotero.selectItems(getSearchResults(doc, false), function (items) {
				if (!items) {
					return true;
				}
				var articles = [];
				for (var i in items) {
					articles.push(i);
				}
				Z.debug(articles);
				ZU.processDocuments(articles, scrape);
			});
			break;
		case "blogPost":
			scrape(doc, url);
			break;
	}
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.artforum.com/news/ugochukwu-smooth-nzewi-appointed-curator-of-hood-museum-40747",
		"items": [
			{
				"itemType": "blogPost",
				"title": "Ugochukwu-Smooth Nzewi Appointed Curator of Hood Museum",
				"creators": [],
				"date": "2013-05-06",
				"abstractNote": "The Hood Museum of Art at Dartmouth College, Hanover, has appointed Ugochukwu-Smooth Nzewi as its first curator of African Art, reports Artdaily. Born in Nigeria, Nzewi received his PhD in Art History from Emory University. A specialist in modern and contemporary African and African Diaspora arts, he will be responsible in his new role for the documentation, preservation, and research of Hood’s African Art collection, which includes some 1,900 objects. He will also engage Dartmouth faculty and students in the development of curricular programming related to the museum’s African holdings. Nzewi",
				"blogTitle": "Artforum",
				"language": "en-US",
				"url": "https://www.artforum.com/news/ugochukwu-smooth-nzewi-appointed-curator-of-hood-museum-40747",
				"attachments": [
					{
						"title": "Snapshot"
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
		"url": "https://www.artforum.com/diary/kaitlin-phillips-at-the-11th-new-york-art-book-fair-63626",
		"items": [
			{
				"itemType": "blogPost",
				"title": "Fine Print",
				"creators": [
					{
						"firstName": "Kaitlin",
						"lastName": "Phillips",
						"creatorType": "author"
					}
				],
				"date": "2016-09-22",
				"abstractNote": "LAST THURSDAY, at the opening night preview of Printed Matter’s NY Book Fair at MoMA PS1, in the popup white dome in the courtyard, at one of the end-to-end merchandise tables, V. Vale (“That’s the name I’m famous under”), founder of RE/Search, complains to a fan that the fair, in its eleventh year, and its host city, have lost their street cred:“I never come to New York. Yeah, I never come to New York. I never come to New York,” says Vale, beaming defiantly.“Well, New York may have jumped the shark.”“I don’t know what that means. Jump the shark.”“It means that something has hit its peak, and",
				"blogTitle": "Artforum",
				"language": "en-US",
				"url": "https://www.artforum.com/diary/kaitlin-phillips-at-the-11th-new-york-art-book-fair-63626",
				"attachments": [
					{
						"title": "Snapshot"
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
		"url": "https://www.artforum.com/picks/alex-da-corte-62421",
		"items": [
			{
				"itemType": "blogPost",
				"title": "Alex Da Corte at Art + Practice",
				"creators": [
					{
						"firstName": "Aria",
						"lastName": "Dean",
						"creatorType": "author"
					}
				],
				"date": "2016-07-28",
				"abstractNote": "As you enter this space, your senses are bombarded by Alex Da Corte’s scrambled, saturated landscape. A supersized witch’s hat fills the first area, lit by green and red neon from above. This is flanked by a stained-glass window depicting a red rose, referencing Disney’s Beauty and the Beast, and a floor-to-ceiling, blown-up image of a weeping bridesmaid. The exhibition is like a dream: Recognizable elements are mashed together, but something is off, and it gradually morphs into a surreal nightmare.The gallery buzzes with sound from three video works—the focal point of the second room—depicting",
				"blogTitle": "Artforum",
				"language": "en-US",
				"url": "https://www.artforum.com/picks/alex-da-corte-62421",
				"attachments": [
					{
						"title": "Snapshot"
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
		"url": "https://www.artforum.com/film/nick-pinkerton-on-gimme-shelter-hollywood-north-66885",
		"items": [
			{
				"itemType": "blogPost",
				"title": "Canadian Makin’",
				"creators": [
					{
						"firstName": "Nick",
						"lastName": "Pinkerton",
						"creatorType": "author"
					}
				],
				"date": "2017-02-24",
				"abstractNote": "AFTER THE EMERGENCE of alluring Canadian production subsidies in the late 1990s, moviegoers of the aughts became inured to watching downtown Vancouver fill in for AnyCity, USA, in a parade of multiplex productions that managed to extract bland back-lot anonymity from location shooting. But Anthology Film Archives’ twelve-film series “Gimme Shelter: Hollywood North” pays tribute to a very different, pioneering era of runaway production, part of an ongoing sesquicentennial celebration of our neighbors above to be followed by “1970s Canadian Independents,” beginning at Anthology on March 9.The",
				"blogTitle": "Artforum",
				"language": "en-US",
				"url": "https://www.artforum.com/film/nick-pinkerton-on-gimme-shelter-hollywood-north-66885",
				"attachments": [
					{
						"title": "Snapshot"
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
		"url": "https://www.artforum.com/print/previews/201701/whitney-biennial-2017-65484",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "Whitney Biennial 2017 at Whitney Museum of American Art",
				"creators": [
					{
						"firstName": "Beau",
						"lastName": "Rutland",
						"creatorType": "author"
					}
				],
				"date": "January 2017",
				"ISSN": "0004-3532",
				"abstractNote": "Curated by Christopher Y. Lew and Mia LocksFollowing a three-year hiatus to accommodate the museum’s move downtown, the Whitney Biennial makes its Gansevoort Street debut this March. As the republic falls before our very eyes, one hopes that this divisive survey of American art will react against, and not just reflect, the current state of affairs. This year’s roster of sixty-three artists and collectives is thankfully diverse in perspectives and refreshingly full of emerging and underrecognized voices&#151;absent are the many elder statesmen often gratuitously included in these affairs. The",
				"language": "en-US",
				"libraryCatalog": "www.artforum.com",
				"publicationTitle": "Artforum",
				"url": "https://www.artforum.com/print/previews/201701/whitney-biennial-2017-65484",
				"attachments": [
					{
						"title": "Snapshot"
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
		"url": "https://www.artforum.com/interviews/jamie-stewart-talks-about-xiu-xiu-s-record-forget-and-recent-collaborations-66615",
		"items": [
			{
				"itemType": "blogPost",
				"title": "Jamie Stewart",
				"creators": [
					{
						"firstName": "Paige K.",
						"lastName": "Bradley",
						"creatorType": "author"
					}
				],
				"date": "2017-02-21",
				"abstractNote": "Across thirteen albums and a handful of EPs, Xiu Xiu have remained a prickly, relentless force, inspiring loyalty, love, annoyance, and disgust in equal measure. Some people never get over their music, and some you couldn’t pay to even approach it. On the occasion of the release of their latest album, FORGET, the band’s mainstay Jamie Stewart discusses how he met Vaginal Davis (who performs on its last track), the band’s collaborations with Danh Vō, and the concept behind the record’s title. Polyvinyl will release FORGET on February 24, 2017.HOW I MET VAGINAL DAVIS is actually a long story and",
				"blogTitle": "Artforum",
				"language": "en-US",
				"url": "https://www.artforum.com/interviews/jamie-stewart-talks-about-xiu-xiu-s-record-forget-and-recent-collaborations-66615",
				"attachments": [
					{
						"title": "Snapshot"
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
		"url": "https://www.artforum.com/print/reviews/201408/dak-art-2014-48214",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "Chika Okeke-Agulu on Dak’Art 2014",
				"creators": [
					{
						"firstName": "Chika",
						"lastName": "Okeke-Agulu",
						"creatorType": "author"
					}
				],
				"date": "October 2014",
				"ISSN": "0004-3532",
				"abstractNote": "THE ELEVENTH EDITION of the Dak’Art Biennial of Contemporary African Art, which took place this past summer, may well have been the most ambitious since the exhibition’s inception in 1992. It was the largest and most diverse yet, not only showcasing emerging artists from across Africa but also including the work of many superstars from the established biennial circuit. This roster showed that the global art world must reckon with Dak’Art, which seems poised to take its place among the most established international art shows. Yet this year’s iteration also suggested that the biennial is still",
				"language": "en-US",
				"libraryCatalog": "www.artforum.com",
				"publicationTitle": "Artforum",
				"url": "https://www.artforum.com/print/reviews/201408/dak-art-2014-48214",
				"attachments": [
					{
						"title": "Snapshot"
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
		"url": "https://www.artforum.com/search?search=1%3A54&sort=date",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.artforum.com/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.artforum.com/print/previews/current/new-york",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.artforum.com/print/201806",
		"items": "multiple"
	}
]
/** END TEST CASES **/
