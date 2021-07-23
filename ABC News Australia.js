{
	"translatorID": "92d45016-5f7b-4bcf-bb63-193033f02f2b",
	"label": "ABC News Australia",
	"creator": "Joyce Chia",
	"target": "https?://(www).abc.net.au/news/*",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-07-23 00:07:01"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2020 Joyce Chia
	
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
	if (ZU.xpathText(doc, '//meta[@property="ABC.ContentType" and @content="CMChannel"]/@content')>-1 
			&& getSearchResults(doc, true)) {
		return 'multiple';
	}
	else if (ZU.xpathText(doc, '//meta[@property="ABC.ContentType" and @content="ABCVideo"]/@content')) {
		return 'video';
	}
	else if (ZU.xpathText(doc, '//meta[@property="ABC.ContentType" and @content="Article"]/@content')) {
		return 'newspaperArticle';
}}


function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('h3 a');
	for (var i=0; i<rows.length; i++) {
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
		item.language = "en-AU";
		// og:url does not preserve https prefixes, so use canonical link until fixed
		var canonical = doc.querySelector('link[rel="canonical"]');
		if (canonical) {
			item.url = canonical.href;
		}
			item.publicationTitle = "ABC News";
			item.language = "en-AU";
		//authors are either listed as meta properties article"author" or as CSS, used CSS here	
		var authors = text(doc, '*[class^="_1SzQc"]'); 
		if (authors && item.creators.length <= 1) {
			authors = authors.replace(/^By /, '');
			if (authors == authors.toUpperCase()) { // convert to title case if all caps
				authors = ZU.capitalizeTitle(authors, true);
			}
			item.creators = [];
			var authorsList = authors.split(/,|\band\b/);
			for (let i = 0; i < authorsList.length; i++) {
				item.creators.push(ZU.cleanAuthor(authorsList[i], "author"));
			}}
			item.complete();
	});

	translator.getTranslatorObject(function(trans) {
		trans.doWeb(doc, url);
	});
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.nytimes.com/1912/03/05/archives/two-money-inquiries-hearings-of-trust-charges-and-aldrich-plan-at.html",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "TWO MONEY INQUIRIES.; Hearings of Trust Charges and Aldrich Plan at the Same Time.",
				"creators": [
					{
						"firstName": "Special to The New York",
						"lastName": "Times",
						"creatorType": "author"
					}
				],
				"date": "1912-03-05",
				"ISSN": "0362-4331",
				"abstractNote": "com weighs holding simultaneous hearings on money trust and Aldrich plan",
				"language": "en-US",
				"libraryCatalog": "NYTimes.com",
				"publicationTitle": "The New York Times",
				"section": "Archives",
				"url": "https://www.nytimes.com/1912/03/05/archives/two-money-inquiries-hearings-of-trust-charges-and-aldrich-plan-at.html",
				"attachments": [],
				"tags": [
					{
						"tag": "Banks and Banking"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.nytimes.com/2010/08/21/education/21harvard.html?_r=1&scp=1&sq=marc%20hauser&st=cse",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Harvard Finds Marc Hauser Guilty of Scientific Misconduct",
				"creators": [
					{
						"firstName": "Nicholas",
						"lastName": "Wade",
						"creatorType": "author"
					}
				],
				"date": "2010-08-20",
				"ISSN": "0362-4331",
				"abstractNote": "The university has found Marc Hauser “solely responsible” for eight instances of scientific misconduct.",
				"language": "en-US",
				"libraryCatalog": "NYTimes.com",
				"publicationTitle": "The New York Times",
				"section": "Education",
				"url": "https://www.nytimes.com/2010/08/21/education/21harvard.html",
				"attachments": [],
				"tags": [
					{
						"tag": "Ethics"
					},
					{
						"tag": "Harvard University"
					},
					{
						"tag": "Hauser, Marc D"
					},
					{
						"tag": "Research"
					},
					{
						"tag": "Science and Technology"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.nytimes.com/search?query=marc%20hauser&sort=best",
		"defer": true,
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://opinionator.blogs.nytimes.com/2013/06/19/our-broken-social-contract/",
		"items": [
			{
				"itemType": "blogPost",
				"title": "Our Broken Social Contract",
				"creators": [
					{
						"firstName": "Thomas B.",
						"lastName": "Edsall",
						"creatorType": "author"
					}
				],
				"date": "2013-06-19",
				"abstractNote": "At their core, are America’s problems primarily economic or moral?",
				"blogTitle": "Opinionator",
				"language": "en-US",
				"url": "https://opinionator.blogs.nytimes.com/2013/06/19/our-broken-social-contract/",
				"attachments": [],
				"tags": [
					{
						"tag": "Economic Conditions and Trends"
					},
					{
						"tag": "Income Inequality"
					},
					{
						"tag": "Social Conditions and Trends"
					},
					{
						"tag": "Thomas B. Edsall"
					},
					{
						"tag": "United States"
					},
					{
						"tag": "United States Economy"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.nytimes.com/2015/05/10/nyregion/manicurists-in-new-york-area-are-underpaid-and-unprotected.html?_r=0",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "반짝이는 매니큐어에 숨겨진 네일 미용사들의 어두운 삶",
				"creators": [
					{
						"firstName": "Sarah Maslin",
						"lastName": "Nir",
						"creatorType": "author"
					}
				],
				"date": "2015-05-07",
				"ISSN": "0362-4331",
				"abstractNote": "뉴욕타임스는 취재 중 많은 네일숍 직원들이 부당한 대우와 인종차별 및 학대에 흔하게 시달리며 정부 노동자법률기구의 보호도 제대로 받지 못한다는 사실을 발견했다.",
				"language": "ko-KR",
				"libraryCatalog": "NYTimes.com",
				"publicationTitle": "The New York Times",
				"section": "New York",
				"url": "https://www.nytimes.com/2015/05/10/nyregion/manicurists-in-new-york-area-are-underpaid-and-unprotected.html",
				"attachments": [],
				"tags": [
					{
						"tag": "Beauty Salons"
					},
					{
						"tag": "Discrimination"
					},
					{
						"tag": "Korean-Americans"
					},
					{
						"tag": "Labor and Jobs"
					},
					{
						"tag": "New York City"
					},
					{
						"tag": "Wages and Salaries"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.nytimes.com/2017/05/24/us/politics/russia-trump-manafort-flynn.html?hp&action=click&pgtype=Homepage&clickSource=story-heading&module=span-ab-top-region&region=top-news&WT.nav=top-news&_r=0",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Top Russian Officials Discussed How to Influence Trump Aides Last Summer",
				"creators": [
					{
						"firstName": "Matthew",
						"lastName": "Rosenberg",
						"creatorType": "author"
					},
					{
						"firstName": "Adam",
						"lastName": "Goldman",
						"creatorType": "author"
					},
					{
						"firstName": "Matt",
						"lastName": "Apuzzo",
						"creatorType": "author"
					}
				],
				"date": "2017-05-24",
				"ISSN": "0362-4331",
				"abstractNote": "American spies collected intelligence last summer revealing that Russians were debating how to work with Trump advisers, current and former officials say.",
				"language": "en-US",
				"libraryCatalog": "NYTimes.com",
				"publicationTitle": "The New York Times",
				"section": "U.S.",
				"url": "https://www.nytimes.com/2017/05/24/us/politics/russia-trump-manafort-flynn.html",
				"attachments": [],
				"tags": [
					{
						"tag": "Cyberwarfare and Defense"
					},
					{
						"tag": "Espionage and Intelligence Services"
					},
					{
						"tag": "Flynn, Michael T"
					},
					{
						"tag": "Manafort, Paul J"
					},
					{
						"tag": "Presidential Election of 2016"
					},
					{
						"tag": "Russia"
					},
					{
						"tag": "Trump, Donald J"
					},
					{
						"tag": "United States Politics and Government"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.nytimes.com/1966/09/12/archives/draft-deferment-scored-at-rutgers.html?login=email&auth=login-email",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Draft Deferment Scored at Rutgers",
				"creators": [],
				"date": "1966-09-12",
				"ISSN": "0362-4331",
				"abstractNote": "P Goodman urges Rutgers U students to campaign for abolition of student deferment, s, freshman orientation",
				"language": "en-US",
				"libraryCatalog": "NYTimes.com",
				"publicationTitle": "The New York Times",
				"section": "Archives",
				"url": "https://www.nytimes.com/1966/09/12/archives/draft-deferment-scored-at-rutgers.html",
				"attachments": [],
				"tags": [
					{
						"tag": "Colleges and Universities"
					},
					{
						"tag": "Draft and Mobilization of Troops"
					},
					{
						"tag": "Miscellaneous Section"
					},
					{
						"tag": "United States"
					},
					{
						"tag": "United States Armament and Defense"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.nytimes.com/1970/11/12/archives/ideological-labels-changing-along-with-the-labelmakers-ideological.html",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Ideological Labels Changing Along With the Label–Makers",
				"creators": [
					{
						"firstName": "Israel",
						"lastName": "Shenker",
						"creatorType": "author"
					}
				],
				"date": "1970-11-12",
				"ISSN": "0362-4331",
				"abstractNote": "Comment on labeling pol ideology of intellectuals, apropos of Prof N Glazer coming pub of book of essays on subject; Glazer classification of P Goodman, D Macdonald, M Harrington, I Howe and late C W Mills noted; Goodman, Macdonald, Howe, Harrington, Prof Trilling, I Kristol, N Podhoretz, D Bell, B Rustin, Prof H Rosenberg comment; some pors",
				"language": "en-US",
				"libraryCatalog": "NYTimes.com",
				"publicationTitle": "The New York Times",
				"section": "Archives",
				"url": "https://www.nytimes.com/1970/11/12/archives/ideological-labels-changing-along-with-the-labelmakers-ideological.html",
				"attachments": [],
				"tags": [
					{
						"tag": "Bell, Daniel"
					},
					{
						"tag": "Glazer, Nathan"
					},
					{
						"tag": "Goodman, Paul"
					},
					{
						"tag": "Howe, Irving"
					},
					{
						"tag": "Intellectuals"
					},
					{
						"tag": "Kristol, Irving"
					},
					{
						"tag": "Macdonald, Dwight"
					},
					{
						"tag": "Podhoretz, Norman"
					},
					{
						"tag": "Politics and Government"
					},
					{
						"tag": "Trilling, Lionel"
					},
					{
						"tag": "United States"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.nytimes.com/2017/07/03/business/oreo-new-flavors.html",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "When Just Vanilla Won’t Do, How About a Blueberry Pie Oreo?",
				"creators": [
					{
						"firstName": "Maya",
						"lastName": "Salam",
						"creatorType": "author"
					}
				],
				"date": "2017-07-03",
				"ISSN": "0362-4331",
				"abstractNote": "The company has increasingly been experimenting with limited-edition flavors that seemed designed as much for an Instagram feed as they are to be eaten.",
				"language": "en-US",
				"libraryCatalog": "NYTimes.com",
				"publicationTitle": "The New York Times",
				"section": "Business",
				"url": "https://www.nytimes.com/2017/07/03/business/oreo-new-flavors.html",
				"attachments": [],
				"tags": [
					{
						"tag": "Contests and Prizes"
					},
					{
						"tag": "Cookies"
					},
					{
						"tag": "Mondelez International Inc"
					},
					{
						"tag": "Oreo"
					},
					{
						"tag": "Social Media"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.nytimes.com/2018/01/11/opinion/social-media-dumber-steven-pinker.html",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Opinion | Social Media Is Making Us Dumber. Here’s Exhibit A.",
				"creators": [
					{
						"firstName": "Jesse",
						"lastName": "Singal",
						"creatorType": "author"
					}
				],
				"date": "2018-01-11",
				"ISSN": "0362-4331",
				"abstractNote": "Steven Pinker is a liberal, Jewish professor. But social media convinced people that he’s a darling of the alt-right.",
				"language": "en-US",
				"libraryCatalog": "NYTimes.com",
				"publicationTitle": "The New York Times",
				"section": "Opinion",
				"url": "https://www.nytimes.com/2018/01/11/opinion/social-media-dumber-steven-pinker.html",
				"attachments": [],
				"tags": [
					{
						"tag": "Anti-Semitism"
					},
					{
						"tag": "Fringe Groups and Movements"
					},
					{
						"tag": "Harvard University"
					},
					{
						"tag": "Jews and Judaism"
					},
					{
						"tag": "Pinker, Steven"
					},
					{
						"tag": "Social Media"
					},
					{
						"tag": "Twitter"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.nytimes.com/interactive/2017/11/10/us/men-accused-sexual-misconduct-weinstein.html",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "After Weinstein: 71 Men Accused of Sexual Misconduct and Their Fall From Power",
				"creators": [
					{
						"firstName": "Sarah",
						"lastName": "Almukhtar",
						"creatorType": "author"
					},
					{
						"firstName": "Michael",
						"lastName": "Gold",
						"creatorType": "author"
					},
					{
						"firstName": "Larry",
						"lastName": "Buchanan",
						"creatorType": "author"
					}
				],
				"date": "2017-11-10",
				"ISSN": "0362-4331",
				"abstractNote": "A list of men who have resigned, been fired or otherwise lost power since the Harvey Weinstein scandal broke.",
				"language": "en-US",
				"libraryCatalog": "NYTimes.com",
				"publicationTitle": "The New York Times",
				"section": "U.S.",
				"shortTitle": "After Weinstein",
				"url": "https://www.nytimes.com/interactive/2017/11/10/us/men-accused-sexual-misconduct-weinstein.html, https://www.nytimes.com/interactive/2017/11/10/us/men-accused-sexual-misconduct-weinstein.html",
				"attachments": [],
				"tags": [
					{
						"tag": "#MeToo Movement"
					},
					{
						"tag": "Besh, John (1968- )"
					},
					{
						"tag": "C K, Louis"
					},
					{
						"tag": "Conyers, John Jr"
					},
					{
						"tag": "Cornish, Tony"
					},
					{
						"tag": "Franken, Al"
					},
					{
						"tag": "Franks, Trent"
					},
					{
						"tag": "Huff, Justin"
					},
					{
						"tag": "Keillor, Garrison"
					},
					{
						"tag": "Lauer, Matt"
					},
					{
						"tag": "Levine, James"
					},
					{
						"tag": "Lizza, Ryan"
					},
					{
						"tag": "Masterson, Danny (1976- )"
					},
					{
						"tag": "Price, Roy (1967- )"
					},
					{
						"tag": "Rose, Charlie"
					},
					{
						"tag": "Sex Crimes"
					},
					{
						"tag": "Sexual Harassment"
					},
					{
						"tag": "Simmons, Russell"
					},
					{
						"tag": "Spacey, Kevin"
					},
					{
						"tag": "Stein, Lorin"
					},
					{
						"tag": "Weinstein, Harvey"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.nytimes.com/2017/05/22/world/europe/greece-athens-anarchy-austerity.html",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Anarchists Fill Services Void Left by Faltering Greek Governance",
				"creators": [
					{
						"firstName": "Niki",
						"lastName": "Kitsantonis",
						"creatorType": "author"
					}
				],
				"date": "2017-05-22",
				"ISSN": "0362-4331",
				"abstractNote": "Anarchist groups are taking matters into their own hands after years of austerity policies and a refugee crisis have undermined the Greek government.",
				"language": "en-US",
				"libraryCatalog": "NYTimes.com",
				"publicationTitle": "The New York Times",
				"section": "World",
				"url": "https://www.nytimes.com/2017/05/22/world/europe/greece-athens-anarchy-austerity.html",
				"attachments": [],
				"tags": [
					{
						"tag": "Coalition of the Radical Left (Greece)"
					},
					{
						"tag": "Demonstrations, Protests and Riots"
					},
					{
						"tag": "Greece"
					},
					{
						"tag": "Politics and Government"
					},
					{
						"tag": "Terrorism"
					},
					{
						"tag": "Vandalism"
					},
					{
						"tag": "vis-photo"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.abc.net.au/news/2020-05-22/nt-government-coronavirus-recovery-commission-michael-gunner/12276832?section=politics",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "NT 'uniquely positioned' to solve Australia's economic woes post-COVID-19, says Chief Minister",
				"creators": [
					{
						"firstName": "Lauren",
						"lastName": "Roberts",
						"creatorType": "author"
					}
				],
				"date": "2020-05-22",
				"abstractNote": "The NT Labor Government establishes a new commission to help it financially recover from the coronavirus pandemic, with the former opposition leader and a former chief minister in key roles.",
				"language": "en-AU",
				"libraryCatalog": "www.abc.net",
				"publicationTitle": "ABC News",
				"url": "https://www.abc.net.au/news/2020-05-22/nt-government-coronavirus-recovery-commission-michael-gunner/12276832",
				"attachments": [],
				"tags": [
					{
						"tag": "chief minister michael gunner"
					},
					{
						"tag": "coronavirus budget"
					},
					{
						"tag": "nt budget"
					},
					{
						"tag": "parliament house"
					},
					{
						"tag": "territory economic reconstruction commission"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
