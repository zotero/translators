{
	"translatorID": "1c5b122c-7e58-4cd5-932b-93f5ca0b7e1a",
	"label": "Postmedia",
	"creator": "Adam Crymble and Abe Jellinek",
	"target": "^https://(www\\.|o\\.)?((((national|financial|leader|fairview|princegeorge)post|(edmonton|stthomastimes|melfort)journal|(edmonton|calgary|toronto|ottawa|winnipeg|vancouver|peacecountry|coldlake)sun|(cochrane|highriver|wetaskiwin|owensoundsun|timmins)times|(prrecord|montreal)gazette|(seaforthhuron)expositor|(edmonton|sprucegrove)examiner|(chatham|kingston|sarnia|sault)thisweek|(airdrie|pinchercreek|wiarton)echo|(calgary|hanna|stratfordbeacon)herald|(strathroyage)dispatch|(draytonvalleywestern|woodstocksentinel|)review|(fortsaskatchewan|clintonnews|)record|(stonyplain|gananoque|)reporter|(vulcan|mitchell|)advocate|(whitecourt|goderichsignal|sault|thesudbury|windsor|)star|(vermilion|)standard|(lf|wallaceburgcourier|timmins|)press|ontariofarmer|(parisstar|thechronicle-|)online|(pembroke)observer|(nanton|sherwoodpark|kenoraminerand|tillsonburg|kincardine|)news|thegrowthop|midnorthmonitor|(mayerthorpefreelanc|standard-freehold)er|thestarphoenix|dailyheraldtribune|fortmcmurraytoday|leducrep|canoe|lakeshoreadvance|thewhig|lucknowsentinel|ottawacitizen|napaneeguide|thegraphicleader|theprovince|shorelinebeacon|canada)(\\.com))|(((driv|health)ing|thecragandcanyon|devondispatch|(thebeaumont|northern|chathamdaily)news|countymarket|cochranetimespost|communitypress|greybrucethisweek|nugget|countyweeklynews|brantfordexpositor|(intelligenc|thelondon|theobserv|record|todaysfarm|simcoereform)er|thepost\\.on|elliotlakestandard|trentonian)(\\.ca))|tj\\.news)/",
	"minVersion": "1.0.0b4.r5",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-03-25 04:53:34"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2021 Abe Jellinek
	
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


function detectWeb(doc, _url) {
	let jsonText = text(doc, 'script[type="application/ld+json"]');
	let type = JSON.parse(jsonText)['@type'];
	if (jsonText && type == 'NewsArticle' || type == 'ReportageNewsArticle') {
		return "newspaperArticle";
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('a.article-card__link');
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(row.textContent);
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

function scrape(doc, _url) {
	let item = new Zotero.Item('newspaperArticle');
	let json = JSON.parse(text(doc, 'script[type="application/ld+json"]'));
	item.title = json.headline;
	item.url = json.url;
	item.date = ZU.strToISO(json.dateModified || json.datePublished);
	item.abstractNote = json.description;
	item.publicationTitle = json.publisher.name;
	item.language = 'en';
	// ignore generic authors
	if (!json.creator.name.includes('News') && !json.creator.name.includes('staff')) {
		item.creators.push(ZU.cleanAuthor(json.creator.name, 'author'));
	}
	if (doc.querySelector('.wire-published-by__authors')) {
		item.creators = [];
		for (let author of text(doc, '.wire-published-by__authors').split(/, | and /)) {
			item.creators.push(ZU.cleanAuthor(author, 'author'));
		}
	}
	
	item.attachments.push({ title: 'Snapshot', document: doc });
	item.libraryCatalog = '';
	
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://financialpost.com/news/economy/a-really-tough-sell-multinationals-shrug-off-g7-tax-assault",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "'A really tough sell': Multinationals shrug off G7 tax assault",
				"creators": [
					{
						"firstName": "Richard",
						"lastName": "Waters",
						"creatorType": "author"
					},
					{
						"firstName": "Emma",
						"lastName": "Agyemang",
						"creatorType": "author"
					},
					{
						"firstName": "Aziza",
						"lastName": "Kasumov",
						"creatorType": "author"
					},
					{
						"firstName": "Tim",
						"lastName": "Bradshaw",
						"creatorType": "author"
					}
				],
				"date": "2021-06-11",
				"abstractNote": "The stock market's response has been a collective yawn, while big tech gave a muted welcome to the plans",
				"language": "en",
				"publicationTitle": "Financial Post",
				"shortTitle": "'A really tough sell'",
				"url": "https://financialpost.com/news/economy/a-really-tough-sell-multinationals-shrug-off-g7-tax-assault",
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
		"url": "https://nationalpost.com/entertainment/weekend-post/massive-genre-nerd-kate-herron-calls-loki-a-love-letter-to-sci-fi",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "'Massive genre nerd' Kate Herron calls Loki a love letter to sci-fi",
				"creators": [
					{
						"firstName": "Chris",
						"lastName": "Knight",
						"creatorType": "author"
					}
				],
				"date": "2021-06-11",
				"abstractNote": "Riffs and references include Brazil, Dune, Blade Runner, The Hitchhiker's Guide to the Galaxy and (almost) Sesame Street",
				"language": "en",
				"publicationTitle": "National Post",
				"url": "https://nationalpost.com/entertainment/weekend-post/massive-genre-nerd-kate-herron-calls-loki-a-love-letter-to-sci-fi",
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
		"url": "https://nationalpost.com/search/?search_text=uefa&date_range=-30d&sort=score",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://edmontonjournal.com/business/cold-lake-alberta-trapper-skunk-removal",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "‘Pretty simple animals’: Cold Lake hires trapper for free skunk removal",
				"creators": [
					{
						"firstName": "Lauren",
						"lastName": "Krugel",
						"creatorType": "author"
					}
				],
				"date": "2024-03-23",
				"abstractNote": "The eastern Alberta city has hired Babincak to trap the striped critters and relocate them where they can't cause a stink for residents.",
				"language": "en",
				"publicationTitle": "Edmonton Journal",
				"shortTitle": "‘Pretty simple animals’",
				"url": "https://edmontonjournal.com/business/cold-lake-alberta-trapper-skunk-removal",
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
		"url": "https://www.thecragandcanyon.ca/news/local-news/parks-canada-derails-banff-townsite-to-norquay-gondola/wcm/577f1324-4669-4406-869a-727ad54515ef",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Parks Canada derails Banff townsite-to-Norquay gondola plan",
				"creators": [
					{
						"firstName": "Bill",
						"lastName": "Kaufmann",
						"creatorType": "author"
					}
				],
				"date": "2024-03-21",
				"abstractNote": "Parks Canada has re-affirmed its opposition to a planned gondola linking the Banff townsite to Mount Norquay, citing environmental concerns.",
				"language": "en",
				"publicationTitle": "Bow Valley Crag & Canyon",
				"url": "https://www.thecragandcanyon.ca/news/local-news/parks-canada-derails-banff-townsite-to-norquay-gondola",
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
		"url": "https://calgarysun.com/news/local-news/calgarian-joins-son-under-russian-fire-in-frontline-ukrainian-city/wcm/3e1a336d-e645-4335-87cf-6ab5a7f62ba7",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "'Anything can happen:' Calgarian joins son under Russian fire in frontline Ukrainian city",
				"creators": [
					{
						"firstName": "Bill",
						"lastName": "Kaufmann",
						"creatorType": "author"
					}
				],
				"date": "2024-03-24",
				"abstractNote": "Calgarian Paul Hughes has joined his son to do aid work in the front line Ukrainian city of Kherson, under constant Russian bombardment.",
				"language": "en",
				"publicationTitle": "Calgary Sun",
				"shortTitle": "'Anything can happen",
				"url": "https://calgarysun.com/news/local-news/calgarian-joins-son-under-russian-fire-in-frontline-ukrainian-city",
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
		"url": "https://www.cochranetimes.com/news/local-news/proposed-bearspaw-development-showdown/wcm/60ee4648-1428-4b38-b0fe-4f840f9be71a",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Foes, backers of huge proposed Bearspaw development gird for crucial showdown",
				"creators": [
					{
						"firstName": "Bill",
						"lastName": "Kaufmann",
						"creatorType": "author"
					}
				],
				"date": "2024-01-18",
				"abstractNote": "Foes and proponents of a huge shopping-residential proposal for Bearspaw are girding for a crucial public hearing.",
				"language": "en",
				"publicationTitle": "Cochrane Times",
				"url": "https://www.cochranetimes.com/news/local-news/proposed-bearspaw-development-showdown",
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
		"url": "https://www.prrecordgazette.com/sports/grande-prairie-storm-tie-calgary-playoffs",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Grande Prairie Storm defeat Calgary Canucks tie playoff series in heart-pounding game Mar. 19",
				"creators": [
					{
						"firstName": "Daniel",
						"lastName": "Janson",
						"creatorType": "author"
					}
				],
				"date": "2024-03-21",
				"abstractNote": "The Grande Prairie Storm AJHL game 4 playoff matchup vs the Calgary Canucks.",
				"language": "en",
				"publicationTitle": "Peace River Record Gazette",
				"url": "https://www.prrecordgazette.com/sports/grande-prairie-storm-tie-calgary-playoffs",
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
