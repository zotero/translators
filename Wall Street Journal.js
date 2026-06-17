{
	"translatorID": "53f8d182-4edc-4eab-b5a1-141698a1303b",
	"label": "Wall Street Journal",
	"creator": "Philipp Zumstein",
	"target": "^https?://(online|blogs|www)?\\.wsj\\.com/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-10-07 13:31:42"
}

/*
	***** BEGIN LICENSE BLOCK *****
	
	Copyright © 2016 Philipp Zumstein
	
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
	if (url.includes('blogs.wsj.com')) {
		return "blogPost";
	}
	else if (attr(doc, 'meta[name="page.section"]', 'content') === 'Article') {
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
	var rows = doc.querySelectorAll('h3 > a[class*="CardLink"]');
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
			if (!items) return;

			var articles = [];
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, scrape);
		});
	}
	else {
		scrape(doc, url);
	}
}


function scrape(doc, url) {
	var translator = Zotero.loadTranslator('web');
	var type = detectWeb(doc, url);
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setHandler('itemDone', function (obj, item) {
		item.ISSN = "0099-9660";
		item.language = "en-US";
		if (type == "newspaperArticle") {
			item.publicationTitle = "Wall Street Journal";
		}
		// Multiple authors are not seperated into multiple metadata fields
		// and will therefore be extracted wrongly into one author. We
		// correct this by using the JSON-LD data.
		var jsonld = ZU.xpathText(doc, '//script[@type="application/ld+json"]');
		if (jsonld) {
			var data = JSON.parse(jsonld);
			for (let i = 0; i < data.length; i++) {
				if (data[i]["@type"] == "NewsArticle") {
					let jsonAuthor = false;
					if (data[i].author && data[i].author.length) {
						jsonAuthor = true;
						item.creators = [];
						for (let j = 0; j < data[i].author.length; j++) {
							if (data[i].author[j]["@type"] == "Person") {
								item.creators.push(ZU.cleanAuthor(data[i].author[j].name, "author"));
							}
							else {
								item.creators.push(ZU.cleanAuthor(data[i].author[j].name, "author", true));
							}
						}
					}
					if (!jsonAuthor) {
						// If we don't get authors from JSON (as is the case for old articles)
						// parse them from metaheader
						let authorString = attr('meta[name="author"]', 'content');
						if (authorString) {
							item.creators = [];
							let authors = authorString.split(/,?\s+and\s+|,\s+/);
							for (let author of authors) {
								item.creators.push(ZU.cleanAuthor(author, "author", false));
							}
						}
					}
					break;
				}
			}
		}
		item.complete();
	});
	
	translator.getTranslatorObject(function (trans) {
		trans.itemType = type;
		trans.addCustomFields({
			"article.published": "date"
		});
		trans.doWeb(doc, url);
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.wsj.com/articles/SB10001424052970204517204577046222233016362",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Hundreds Say They'd Take Australian Mining Job",
				"creators": [
					{
						"firstName": "John W.",
						"lastName": "Miller",
						"creatorType": "author"
					}
				],
				"date": "2011-11-18T19:58:00Z",
				"ISSN": "0099-9660",
				"abstractNote": "A profile of an Australian miner making $200,000 a year, published in The Wall Street Journal, led hundreds of people to ask how they could apply for such a job.",
				"language": "en-US",
				"libraryCatalog": "www.wsj.com",
				"publicationTitle": "Wall Street Journal",
				"section": "Careers",
				"url": "https://www.wsj.com/articles/SB10001424052970204517204577046222233016362",
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
		"url": "https://www.wsj.com/articles/SB10001424052970203471004577144672783559392",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "An Odd Turn in Insider Case",
				"creators": [
					{
						"firstName": "Jenny",
						"lastName": "Strasburg",
						"creatorType": "author"
					},
					{
						"firstName": "Susan",
						"lastName": "Pulliam",
						"creatorType": "author"
					}
				],
				"date": "2012-01-06T23:20:00Z",
				"ISSN": "0099-9660",
				"abstractNote": "An outspoken analyst who is embroiled in the Wall Street insider-trading investigation allegedly left threatening messages for two FBI agents.",
				"language": "en-US",
				"libraryCatalog": "www.wsj.com",
				"publicationTitle": "Wall Street Journal",
				"section": "Markets",
				"url": "https://www.wsj.com/articles/SB10001424052970203471004577144672783559392",
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
		"url": "https://www.wsj.com/search?query=argentina&mod=searchresults_viewallresults",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.wsj.com/articles/BL-REB-15488",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Number of the Week: Americans' Cheaper Restaurant Bills",
				"creators": [
					{
						"firstName": "Phil",
						"lastName": "Izzo",
						"creatorType": "author"
					}
				],
				"date": "2012-01-07T10:00:00Z",
				"ISSN": "0099-9660",
				"abstractNote": "Americans spend less per visit to restaurants than most other major industrialized countries, according to data compiled by market research firm NPD Group.",
				"language": "en-US",
				"libraryCatalog": "www.wsj.com",
				"publicationTitle": "Wall Street Journal",
				"section": "Real Time Economics",
				"shortTitle": "Number of the Week",
				"url": "https://www.wsj.com/articles/BL-REB-15488",
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
		"url": "https://www.wsj.com/articles/american-detained-in-north-korea-to-face-trial-next-sunday-1410053845",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "American Detained in North Korea to Face Trial Next Sunday",
				"creators": [
					{
						"firstName": "Jeyup S.",
						"lastName": "Kwaak",
						"creatorType": "author"
					}
				],
				"date": "2014-09-07T01:37:00Z",
				"ISSN": "0099-9660",
				"abstractNote": "Matthew Miller, one of three Americans detained by North Korea, will face trial next Sunday, the country's state media said.",
				"language": "en-US",
				"libraryCatalog": "www.wsj.com",
				"publicationTitle": "Wall Street Journal",
				"section": "World",
				"url": "http://online.wsj.com/articles/american-detained-in-north-korea-to-face-trial-next-sunday-1410053845",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Asia"
					},
					{
						"tag": "Asia Pacific"
					},
					{
						"tag": "Crime/Courts"
					},
					{
						"tag": "Developing Economies"
					},
					{
						"tag": "Eastern Asia"
					},
					{
						"tag": "North America"
					},
					{
						"tag": "OASN"
					},
					{
						"tag": "ONEW"
					},
					{
						"tag": "Political/General News"
					},
					{
						"tag": "Pyongyang"
					},
					{
						"tag": "SYND"
					},
					{
						"tag": "United States"
					},
					{
						"tag": "World News"
					},
					{
						"tag": "american detained in north korea"
					},
					{
						"tag": "american in north korea"
					},
					{
						"tag": "courts"
					},
					{
						"tag": "crime"
					},
					{
						"tag": "general news"
					},
					{
						"tag": "matthew miller"
					},
					{
						"tag": "north korea"
					},
					{
						"tag": "political"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.wsj.com/articles/faa-suffers-glitch-to-crew-alert-system-potentially-affecting-flights-in-u-s-11673437407?mod=hp_lead_pos1",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "​U.S. Flight Disruptions Mount After FAA Grounding Order Ends ​​",
				"creators": [
					{
						"firstName": "Andrew",
						"lastName": "Tangel",
						"creatorType": "author"
					},
					{
						"firstName": "Alison",
						"lastName": "Sider",
						"creatorType": "author"
					},
					{
						"firstName": "Benjamin",
						"lastName": "Katz",
						"creatorType": "author"
					}
				],
				"date": "2023-01-11T11:43:00Z",
				"ISSN": "0099-9660",
				"abstractNote": "The Federal Aviation Administration lifted its ban on domestic flight departures across the U.S. following an overnight outage.",
				"language": "en-US",
				"libraryCatalog": "www.wsj.com",
				"publicationTitle": "Wall Street Journal",
				"section": "Business",
				"url": "https://www.wsj.com/articles/faa-suffers-glitch-to-crew-alert-system-potentially-affecting-flights-in-u-s-11673437407",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "AAL"
					},
					{
						"tag": "ARCHIVE"
					},
					{
						"tag": "Air Transport"
					},
					{
						"tag": "Airlines"
					},
					{
						"tag": "American Airlines Group"
					},
					{
						"tag": "Asia"
					},
					{
						"tag": "Asia Pacific"
					},
					{
						"tag": "Automotive"
					},
					{
						"tag": "Business/Disruptive Innovation"
					},
					{
						"tag": "C&E Industry News Filter"
					},
					{
						"tag": "Content Types"
					},
					{
						"tag": "Corporate/Industrial News"
					},
					{
						"tag": "DAL"
					},
					{
						"tag": "Delta Air Lines"
					},
					{
						"tag": "East Asia"
					},
					{
						"tag": "Europe"
					},
					{
						"tag": "FDX"
					},
					{
						"tag": "Factiva Filters"
					},
					{
						"tag": "FedEx"
					},
					{
						"tag": "JBLU"
					},
					{
						"tag": "Japan"
					},
					{
						"tag": "JetBlue Airways"
					},
					{
						"tag": "LINK|i15-WP-WSJ-0000482693"
					},
					{
						"tag": "LINK|i3-WP-WSJ-0000482693"
					},
					{
						"tag": "LINK|i6-WP-WSJ-0000482693"
					},
					{
						"tag": "LUV"
					},
					{
						"tag": "Low Cost Airlines"
					},
					{
						"tag": "North America"
					},
					{
						"tag": "Passenger Airlines"
					},
					{
						"tag": "Political/General News"
					},
					{
						"tag": "Product/Service Disruptions"
					},
					{
						"tag": "Products/Services"
					},
					{
						"tag": "Regulation/Government Policy"
					},
					{
						"tag": "SYND"
					},
					{
						"tag": "Southwest Airlines"
					},
					{
						"tag": "Transport"
					},
					{
						"tag": "Transportation/Logistics"
					},
					{
						"tag": "UAL"
					},
					{
						"tag": "United Airlines Holdings"
					},
					{
						"tag": "United Kingdom"
					},
					{
						"tag": "United States"
					},
					{
						"tag": "WSJ-PRO-WSJ.com"
					},
					{
						"tag": "Western Europe"
					},
					{
						"tag": "business"
					},
					{
						"tag": "corporate"
					},
					{
						"tag": "disruptive innovation"
					},
					{
						"tag": "general news"
					},
					{
						"tag": "gfx-contrib"
					},
					{
						"tag": "government policy"
					},
					{
						"tag": "industrial news"
					},
					{
						"tag": "logistics"
					},
					{
						"tag": "political"
					},
					{
						"tag": "product"
					},
					{
						"tag": "products"
					},
					{
						"tag": "regulation"
					},
					{
						"tag": "service disruptions"
					},
					{
						"tag": "services"
					},
					{
						"tag": "transportation"
					},
					{
						"tag": "wsjcorp"
					},
					{
						"tag": "wsjspeeddesk"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.wsj.com/tech/ai/nvidia-ceo-jensen-huang-us-china-relationship-b7d438a7?mod=hp_lead_pos2",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Nvidia’s CEO Walks an AI Tightrope Between the U.S. and China",
				"creators": [
					{
						"firstName": "Amrith",
						"lastName": "Ramkumar",
						"creatorType": "author"
					},
					{
						"firstName": "Raffaele",
						"lastName": "Huang",
						"creatorType": "author"
					},
					{
						"firstName": "Robbie",
						"lastName": "Whelan",
						"creatorType": "author"
					}
				],
				"date": "2025-09-19T01:00:00Z",
				"ISSN": "0099-9660",
				"abstractNote": "With the Intel deal, Nvidia’s CEO is signaling support for the Trump administration’s aims while seeking more access to the Chinese chip market.",
				"language": "en-US",
				"libraryCatalog": "www.wsj.com",
				"publicationTitle": "Wall Street Journal",
				"section": "Tech",
				"url": "https://www.wsj.com/tech/ai/nvidia-ceo-jensen-huang-us-china-relationship-b7d438a7",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Artificial Intelligence Technologies"
					},
					{
						"tag": "Asia"
					},
					{
						"tag": "Asia Pacific"
					},
					{
						"tag": "C&E Industry News Filter"
					},
					{
						"tag": "China"
					},
					{
						"tag": "Computer Hardware"
					},
					{
						"tag": "Computers/Consumer Electronics"
					},
					{
						"tag": "Computing"
					},
					{
						"tag": "Content Types"
					},
					{
						"tag": "Corporate/Industrial News"
					},
					{
						"tag": "Developing Economies"
					},
					{
						"tag": "Domestic Politics"
					},
					{
						"tag": "East Asia"
					},
					{
						"tag": "Emerging Market Countries"
					},
					{
						"tag": "Factiva Filters"
					},
					{
						"tag": "GCAPI"
					},
					{
						"tag": "Graphics Processing Units"
					},
					{
						"tag": "Greater China"
					},
					{
						"tag": "Industrial Electronics"
					},
					{
						"tag": "Industrial Goods"
					},
					{
						"tag": "Integrated Circuits"
					},
					{
						"tag": "Jensen Huang"
					},
					{
						"tag": "LINK|i1-WP-WSJ-0002955966"
					},
					{
						"tag": "LINK|i10-WP-WSJ-0002955966"
					},
					{
						"tag": "LINK|i2-WP-WSJ-0002955966"
					},
					{
						"tag": "LINK|i3-WP-WSJ-0002955966"
					},
					{
						"tag": "LINK|i4-WP-WSJ-0002955966"
					},
					{
						"tag": "LINK|i5-WP-WSJ-0002955966"
					},
					{
						"tag": "LINK|i6-WP-WSJ-0002955966"
					},
					{
						"tag": "LINK|i7-WP-WSJ-0002955966"
					},
					{
						"tag": "LINK|i8-WP-WSJ-0002955966"
					},
					{
						"tag": "LINK|i9-WP-WSJ-0002955966"
					},
					{
						"tag": "Management"
					},
					{
						"tag": "NVDA"
					},
					{
						"tag": "NVIDIA"
					},
					{
						"tag": "North America"
					},
					{
						"tag": "Political/General News"
					},
					{
						"tag": "Politics/International Relations"
					},
					{
						"tag": "Regulation/Government Policy"
					},
					{
						"tag": "Risk Topics - Artificial Intelligence"
					},
					{
						"tag": "Risk Topics - Geopolitics"
					},
					{
						"tag": "Risk Topics - Regulations & Regulators"
					},
					{
						"tag": "Risk Topics - Sanctions & Trade Controls"
					},
					{
						"tag": "SYND"
					},
					{
						"tag": "Semiconductors"
					},
					{
						"tag": "Senior Level Management"
					},
					{
						"tag": "Technology"
					},
					{
						"tag": "United States"
					},
					{
						"tag": "WSJ-PRO-WSJ.com"
					},
					{
						"tag": "computers"
					},
					{
						"tag": "consumer electronics"
					},
					{
						"tag": "corporate"
					},
					{
						"tag": "general news"
					},
					{
						"tag": "government policy"
					},
					{
						"tag": "industrial news"
					},
					{
						"tag": "international relations"
					},
					{
						"tag": "political"
					},
					{
						"tag": "politics"
					},
					{
						"tag": "regulation"
					},
					{
						"tag": "risk-compliance"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
