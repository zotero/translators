{
	"translatorID": "a127f012-4ea4-4d05-a657-24d47f91b016",
	"label": "Artforum",
	"creator": "czar",
	"target": "^https?://(www\\.)?artforum\\.com/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-09-02 00:33:38"
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
	if (/-\d{5,}([?#].*)?$/.test(url)) {
		if (doc.querySelector('h3.print-article__issue-title')) {
			return "magazineArticle";
		}
		return "blogPost";
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}


function scrape(doc, url) {
	var translator = Zotero.loadTranslator('web');
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48'); // embedded metadata (EM)
	translator.setDocument(doc);
	
	translator.setHandler('itemDone', function (obj, item) { // corrections to EM
		item.publicationTitle = "Artforum";
		item.language = 'en-US';
		var jsonLD = doc.querySelector('script[type="application/ld+json"]');
		if (jsonLD) {
			jsonLD = JSON.parse(jsonLD.textContent);
			item.title = jsonLD.name;
			item.date = jsonLD.dateModified || jsonLD.datePublished;
			
			if (!item.creators.length && jsonLD.author) {
				item.creators.push(ZU.cleanAuthor(jsonLD.author.name, 'author'));
			}
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
				ZU.doGet(issueDate.querySelector('a').href, function (respText) {
					var voliss = respText.match(/Vol\.\s(\d+),\sNo\.\s(\d+)/);
					item.volume = voliss[1];
					item.issue = voliss[2];
					item.complete();
				});
			} else item.complete();
		} else item.complete();
	});

	translator.getTranslatorObject(function(trans) {
		trans.itemType = 'blogPost';
		trans.doWeb(doc, url);
	});
}


function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	// 1st for search page, 2nd for issue ToC, 3rd/4th/5th for sections, 5th+ for homepage
	var rows = doc.querySelectorAll('h1.results-list__h1, .toc-article__title, .news-list h1, .reviews-list h1, .article-list h1, p.hp-singlefeature-author__writer, h3.hp-news__title, h3.hp-twocolumn__title a, h3.hp-artguide__title, p.hp-bloglist__teaser a');
	for (let i = 0; i < rows.length; i++) {
		let href = attr(rows[i], 'a', 'href');
		if (!href) {
			let link = rows[i].closest('a');
			if (link) href = link.href;
		}
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
					return;
				}
				ZU.processDocuments(Object.keys(items), scrape);
			});
			break;
		default:
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
		"url": "https://www.artforum.com/picks/alex-da-corte-62421",
		"items": [
			{
				"itemType": "blogPost",
				"title": "Alex Da Corte",
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
		"url": "https://www.artforum.com/print/previews/201701/whitney-biennial-2017-65484",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "Whitney Biennial 2017",
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
				"issue": "5",
				"language": "en-US",
				"libraryCatalog": "www.artforum.com",
				"publicationTitle": "Artforum",
				"url": "https://www.artforum.com/print/previews/201701/whitney-biennial-2017-65484",
				"volume": "55",
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
		"url": "https://www.artforum.com/print/reviews/201408/dak-art-2014-48214",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "Dak’Art 2014",
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
				"issue": "2",
				"language": "en-US",
				"libraryCatalog": "www.artforum.com",
				"publicationTitle": "Artforum",
				"url": "https://www.artforum.com/print/reviews/201408/dak-art-2014-48214",
				"volume": "53",
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
	},
	{
		"type": "web",
		"url": "https://www.artforum.com/news/levy-gorvy-amalia-dayan-salon-94-merge-to-form-upper-east-side-megagallery-86598",
		"items": [
			{
				"itemType": "blogPost",
				"title": "New York Dealers Lévy Gorvy, Amalia Dayan, Salon 94, Announce Merger",
				"creators": [],
				"date": "2021-09-01",
				"abstractNote": "Two New York galleries—Lévy Gorvy and Salon 94—and dealer Amalia Dayan have announced that they are joining forces to establish a single consortium, called LGDR, whose flagship will be situated on the city’s tony Upper East Side. The news, first reported in the New York Times, is said to have come as a shock to a number of the galleries’ artists, whose fate is unclear.The new entity, which takes its name from the last initials of its owners—Dominique Lévy and Brett Gorvy, cofounders of Lévy Gorvy; veteran dealer Amalia Dayan; and Jeanne Greenberg Rohatyn, the owner of Salon 94—will occupy digs",
				"blogTitle": "Artforum",
				"language": "en-US",
				"url": "https://www.artforum.com/news/levy-gorvy-amalia-dayan-salon-94-merge-to-form-upper-east-side-megagallery-86598",
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
		"url": "https://www.artforum.com/print/202107/david-salle-on-janet-malcolm-86314",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "JANET MALCOLM (1934–2021)",
				"creators": [
					{
						"firstName": "David",
						"lastName": "Salle",
						"creatorType": "author"
					}
				],
				"date": "September 2021",
				"ISSN": "0004-3532",
				"abstractNote": "ABOUT TWENTY-FIVE YEARS AGO Janet Malcolm published a profile of me in the New Yorker that became something of a touchstone of art journalism. It served as the title essay of one of her collections, and has been reprinted several times. I’m told it’s often assigned in classes on art writing, on the assumption that it sheds some light on that murky enterprise.It’s uncommon for the subject of a profile to warmly remember the profiler, and my friendship with Janet struck some people as odd. For some, it would be hard, or so they imagined, to get past the discomforts of so much self-exposure, and",
				"issue": "1",
				"language": "en-US",
				"libraryCatalog": "www.artforum.com",
				"publicationTitle": "Artforum",
				"url": "https://www.artforum.com/print/202107/david-salle-on-janet-malcolm-86314",
				"volume": "60",
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
