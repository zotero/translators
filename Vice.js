{
	"translatorID": "131310dc-854c-4629-acad-521319ab9f19",
	"label": "Vice",
	"creator": "czar, Bao Trinh",
	"target": "^https?://(.+?\\.)?vice?\\.com/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-08-15 22:11:31"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2018-2021 czar, Bao Trinh
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
	const path = url.replace(/^https?:\/\//, '').split('/');
	if (path.length <= 4) {
		if (getSearchResults(doc, true)) return "multiple";
	}
	else if (path[2].match(/^(article|story)$/)) {
		return "magazineArticle";
	}
	return false;
}


function getSearchResults(doc, checkOnly) {
	const items = {};
	let found = false;
	const rows = doc.querySelectorAll('.feed__list .feed__list__item .vice-card-hed a');
	for (const row of rows) {
		const href = row.href;
		const title = ZU.trimInternal(row.textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function scrape(doc, url) {
	const trans = Zotero.loadTranslator('web');
	trans.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48'); // Embedded Metadata
	trans.setDocument(doc);

	trans.setHandler('itemDone', function (obj, item) {
		item.url = url;
		item.publicationTitle = item.publicationTitle ? item.publicationTitle : "Vice";
		item.publicationTitle = item.publicationTitle.replace(/^I-d$/, 'i-D');
		item.ISSN = "1077-6788";

		let linkedData = text(doc, 'script[type="application/ld+json"]');
		if (linkedData) {
			linkedData = JSON.parse(linkedData);
			if (linkedData && linkedData['@graph']) {
				linkedData = linkedData['@graph'].find(x => x['@type'] == "NewsArticle");
				if (linkedData) item.date = linkedData.datePublished;
			}
		}

		item.creators.length = 0;
		for (const author of doc.querySelectorAll('main.main-content .contributors .contributor .contributor__meta a')) {
			item.creators.push(ZU.cleanAuthor(author.textContent, 'author'));
		}
		for (const author of attr(doc, 'meta[property="article:author"]', 'content').split(",")) {
			item.creators.push(ZU.cleanAuthor(author, 'author'));
		}

		item.tags.length = 0;
		for (const tag of doc.querySelectorAll('.tags .tags__item')) {
			item.tags.push(tag.textContent);
		}
		for (const tag of attr(doc, 'meta[name="news_keywords"]', 'content').split(",")) {
			item.tags.push(tag);
		}

		item.complete();
	});

	trans.getTranslatorObject(function (trans) {
		trans.addCustomFields({
			datePublished: 'date'
		});
		trans.itemType = detectWeb(doc, url);
		trans.doWeb(doc, url);
	});
}


function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		Zotero.selectItems(getSearchResults(doc, false), (items) => {
			if (!items) return true;
			const articles = [...items];
			ZU.processDocuments(articles, scrape);
			return true;
		});
	}
	else {
		scrape(doc, url);
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.vice.com/en/article/padaqv/anti-g20-activists-told-us-what-they-brought-to-the-protest-in-hamburg",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "Anti-G20 Activists Told Us What They Brought to the Protest in Hamburg",
				"creators": [
					{
						"firstName": "Alexander",
						"lastName": "Indra",
						"creatorType": "author"
					}
				],
				"date": "2017-07-07T13:41:46.436Z",
				"abstractNote": "\"My inflatable crocodile works as a shield against police batons, and as a seat. It also just lightens the mood.\"",
				"blogTitle": "Vice",
				"language": "en",
				"url": "https://www.vice.com/en/article/padaqv/anti-g20-activists-told-us-what-they-brought-to-the-protest-in-hamburg",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "G20"
					},
					{
						"tag": "Hamburg"
					},
					{
						"tag": "VICE Germany"
					},
					{
						"tag": "VICE International"
					},
					{
						"tag": "demo"
					},
					{
						"tag": "demonstration"
					},
					{
						"tag": "protest"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.vice.com/en/article/bjxjbw/nina-freemans-games-really-get-millennial-romance",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "Nina Freeman’s Games Really Get Millennial Romance",
				"creators": [
					{
						"firstName": "Kate",
						"lastName": "Gray",
						"creatorType": "author"
					}
				],
				"date": "2017-07-09T18:00:00.000Z",
				"abstractNote": "And by rummaging around our own pasts through them, we can better understand where we are, and where we’ve been, on all things sexual.",
				"blogTitle": "Vice",
				"language": "en",
				"url": "https://www.vice.com/en/article/bjxjbw/nina-freemans-games-really-get-millennial-romance",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Awkward Teenage Rituals"
					},
					{
						"tag": "GAMES"
					},
					{
						"tag": "How Do You Do It"
					},
					{
						"tag": "Lost Memories Dot Net"
					},
					{
						"tag": "Nina Freeman"
					},
					{
						"tag": "Waypoint"
					},
					{
						"tag": "cibelle"
					},
					{
						"tag": "msn"
					},
					{
						"tag": "romance"
					}
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
				"itemType": "magazineArticle",
				"title": "Wie kaputte Handys und Profite die G20-Gegner antreiben",
				"creators": [
					{
						"firstName": "Laura",
						"lastName": "Meschede",
						"creatorType": "author"
					}
				],
				"date": "2017-07-09T10:47:09.008Z",
				"abstractNote": "Der Rüstungsgegner, die Umweltschützerin und die Hippiefrau: Ich glaube, eigentlich haben sie das gleiche Ziel. Sie haben es auf ihren Plakaten nur unterschiedlich formuliert.",
				"blogTitle": "Vice",
				"language": "de",
				"url": "https://www.vice.com/de/article/59pdy5/wie-kaputte-handys-und-profite-die-g20-gegner-antreiben",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Hamburg"
					},
					{
						"tag": "Laura Meschede"
					},
					{
						"tag": "Meinung"
					},
					{
						"tag": "Wirtschaft"
					},
					{
						"tag": "kapitalismus"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.vice.com/en/section/games",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://amuse-i-d.vice.com/category/well-being/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://i-d.vice.com/en_uk/article/j5mm37/anish-kapoor-has-been-banned-from-using-yet-another-rare-paint",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "anish kapoor has been banned from using yet another rare paint",
				"creators": [
					{
						"firstName": "Isabelle",
						"lastName": "Hellyer",
						"creatorType": "author"
					}
				],
				"date": "2017-07-07T14:18:46Z",
				"abstractNote": "Contemporary art's most bizarre feud heats up with the creation of a new color-changing paint available to all — except Kapoor.",
				"blogTitle": "i-D",
				"language": "en",
				"url": "https://i-d.vice.com/en_uk/article/j5mm37/anish-kapoor-has-been-banned-from-using-yet-another-rare-paint",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "#sharetheblack"
					},
					{
						"tag": "Anish Kapoor"
					},
					{
						"tag": "Art"
					},
					{
						"tag": "Culture"
					},
					{
						"tag": "Stuart Semple"
					},
					{
						"tag": "art news"
					},
					{
						"tag": "vantablack"
					}
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
		"url": "https://www.vice.com/en/article/434pxm/voters-may-soon-toughen-up-americas-weakest-police-shootings-law",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "Voters may soon toughen up America’s weakest police shootings law",
				"creators": [
					{
						"firstName": "Carter",
						"lastName": "Sherman",
						"creatorType": "author"
					}
				],
				"date": "2017-07-07T12:17:51.000Z",
				"abstractNote": "VICE is the definitive guide to enlightening information.",
				"blogTitle": "Vice",
				"language": "en",
				"url": "https://www.vice.com/en/article/434pxm/voters-may-soon-toughen-up-americas-weakest-police-shootings-law",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Charleena Lyles"
					},
					{
						"tag": "Che Taylor"
					},
					{
						"tag": "Criminal Justice"
					},
					{
						"tag": "News"
					},
					{
						"tag": "Politics"
					},
					{
						"tag": "VICE News"
					},
					{
						"tag": "ballot initiative"
					},
					{
						"tag": "crime"
					},
					{
						"tag": "law enforcement"
					},
					{
						"tag": "not this time"
					},
					{
						"tag": "police"
					},
					{
						"tag": "police deadly force"
					},
					{
						"tag": "seattle"
					},
					{
						"tag": "washington state"
					}
				],
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
	},
	{
		"type": "web",
		"url": "https://www.vice.com/en/article/qj8xe7/nso-group-ceo-claims-bds-is-probably-behind-damning-investigation",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "NSO Group CEO Claims BDS Is Probably Behind Damning Investigation",
				"creators": [
					{
						"firstName": "Emanuel",
						"lastName": "Maiberg",
						"creatorType": "author"
					},
					{
						"firstName": "Lorenzo",
						"lastName": "Franceschi-Bicchierai",
						"creatorType": "author"
					}
				],
				"date": "2021-07-23T17:40:24.942Z",
				"abstractNote": "\"I don't want to sound cynical now, but there are those who don't want [Israel] to import ice cream or export technologies.\"",
				"blogTitle": "Vice",
				"language": "en",
				"url": "https://www.vice.com/en/article/qj8xe7/nso-group-ceo-claims-bds-is-probably-behind-damning-investigation",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "NSO"
					},
					{
						"tag": "israel"
					},
					{
						"tag": "worldnews"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://i-d.vice.com/en_uk/article/epnkaz/adam-driver-for-burberry-and-toilet-stall-whats-in-fashion",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "Adam Driver for Burberry and toilet stalls: what's in fashion?",
				"creators": [
					{
						"firstName": "Mahoro",
						"lastName": "Seward",
						"creatorType": "author"
					},
					{
						"firstName": "Osman",
						"lastName": "Ahmed",
						"creatorType": "author"
					},
					{
						"firstName": "Kumba",
						"lastName": "Kpakima",
						"creatorType": "author"
					}
				],
				"date": "2021-08-02T09:36:13Z",
				"abstractNote": "Your one-stop-shop for this week’s fashion news to know.",
				"blogTitle": "i-D",
				"language": "en",
				"shortTitle": "Adam Driver for Burberry and toilet stalls",
				"url": "https://i-d.vice.com/en_uk/article/epnkaz/adam-driver-for-burberry-and-toilet-stall-whats-in-fashion",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Miu Miu"
					},
					{
						"tag": "What's in fashion?"
					},
					{
						"tag": "burberry"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
