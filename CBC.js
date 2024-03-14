{
	"translatorID": "03c4b906-8cb2-4850-a771-697cbd92c2a1",
	"label": "CBC",
	"creator": "Geoff Banh",
	"target": "^https?:\\/\\/www\\.cbc\\.ca/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-03-14 20:55:10"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2024 Geoff Banh
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
	let path = new URL(url).pathname;
	if (path.includes("/search?") && getSearchResults(doc, true)) {
		return 'multiple';
	}
	else if ((/(news|sports|radio|books|arts|music|life|television|archives)\//.test(path)) && getLD(doc)) {
		return "newspaperArticle";
	}
	else if (path.includes("/player/")) {
		return "videoRecording";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	// Adjust the CSS Selectors
	var rows = doc.querySelectorAll('.card.cardListing');
	for (const row of rows) {
		var href = row.href;
		var title = text(row, 'h3.headline');
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}


function getLD(doc) {
	let ldScript = text(doc, "script[type='application/ld+json']");
	if (ldScript) return JSON.parse(ldScript);
	return null;
}

function getMetaContent(doc, attribute, text) {
	return attr(doc.head, 'meta[' + attribute + '="' + text + '"]', 'content');
}


async function scrape(doc, url = doc.location.href) {
	let translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	translator.setHandler('itemDone', (_obj, item) => {
		item.language = "en-CA";
		let ld = getLD(doc);

		// only do processing if page has ld
		if (ld) {
			item.url = getMetaContent(doc, 'property', "og:url");

			item.title = ld.headline ? ld.headline : ld.name;
			if (item.itemType == "videoRecording") {
				item.date = ZU.strToISO(ld.uploadDate);
			}
			else {
				item.date = ZU.strToISO(ld.datePublished);
			}
			item.abstractNote = ld.description;

			item.creators = []; // clear existing authors
			// ignore organization authors
			if (ld.hasOwnProperty("author") && ld.author[0]['@type'] != "Organization") {
				// either single author or multiple comma separated in one entry
				if (ld.author.length == 1) {
					let authors = ld.author[0].name;
					if (authors.includes(',')) {
						let authorsList = authors.split(',');
						for (const a of authorsList) {
							item.creators.push(ZU.cleanAuthor(a, "author"));
						}
					}
					else {
						item.creators.push(ZU.cleanAuthor(authors, "author"));
					}
				}
				else {
					for (const a of ld.author) {
						item.creators.push(ZU.cleanAuthor(a.name, "author"));
					}
				}
			}


			let siteName = "CBC";
			if (item.itemType != "videoRecording") {
				// get department (e.g. News, Sports, Radio)
				// remove .ca/ manually, as regex lookbehind doesn't seem to work
				let dept = (/\.ca\/\w+(?=\/)/.exec(item.url))[0].replace(".ca/", "");
				// capitalize department
				dept = dept[0].toUpperCase() + dept.slice(1);
				siteName += " " + dept;
			}
			item.publicationTitle = siteName;
			item.libraryCatalog = "CBC.ca";
		}
		item.complete();
	});

	let em = await translator.getTranslatorObject();
	em.itemType = detectWeb(doc, url);
	await em.doWeb(doc, url);
}

async function doWeb(doc, url) {
	if (detectWeb(doc, url) == 'multiple') {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (!items) return;
		for (let url of Object.keys(items)) {
			await scrape(await requestDocument(url));
		}
	}
	else {
		await scrape(doc, url);
	}
}


/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.cbc.ca/news/canada/online-groups-pressuring-youth-self-harm-1.7107885",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Violent online groups are pressuring youth into harming themselves, authorities warn",
				"creators": [
					{
						"firstName": "Ioanna",
						"lastName": "Roumeliotis",
						"creatorType": "author"
					},
					{
						"firstName": "Laurence",
						"lastName": "Mathieu-Leger",
						"creatorType": "author"
					},
					{
						"firstName": "Andrew",
						"lastName": "Culbert",
						"creatorType": "author"
					}
				],
				"date": "2024-02-09",
				"abstractNote": "Authorities in Canada and the U.S. are warning the public about violent online groups that deliberately target vulnerable minors and pressure them into recording or livestreaming self-harm and producing child sexual abuse material.",
				"language": "en-CA",
				"libraryCatalog": "CBC.ca",
				"publicationTitle": "CBC News",
				"url": "https://www.cbc.ca/news/canada/online-groups-pressuring-youth-self-harm-1.7107885",
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
		"url": "https://www.cbc.ca/sports/hockey/nhl/elias-pettersson-contract-extension-canucks-nhl-1.7132138",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Canucks star forward Elias Pettersson signs 8-year contract extension",
				"creators": [
					{
						"firstName": "Nick",
						"lastName": "Wells",
						"creatorType": "author"
					}
				],
				"date": "2024-03-02",
				"abstractNote": "The Vancouver Canucks and star centre Elias Pettersson have agreed to an eight-year contract extension, the team announced Saturday. He is second in team scoring this season with 75 points on 29 goals and 46 assists.",
				"language": "en-CA",
				"libraryCatalog": "CBC.ca",
				"publicationTitle": "CBC Sports",
				"url": "https://www.cbc.ca/sports/hockey/nhl/elias-pettersson-contract-extension-canucks-nhl-1.7132138",
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
		"url": "https://www.cbc.ca/player/play/2313671747656",
		"items": [
			{
				"itemType": "videoRecording",
				"title": "If you get pulled over by police this month in Regina, expect to take a breathalyzer test",
				"creators": [],
				"date": "2024-03-02",
				"abstractNote": "Everyone who gets pulled over for any reason will get a test. SGI and police are telling people about the plan because not everyone is aware of a 2018 federal law that allows it. CBC's Darla Ponace has more on what you need to know about mandatory roadside alcohol tests.",
				"language": "en-CA",
				"libraryCatalog": "CBC.ca",
				"runningTime": "82.849",
				"url": "https://www.cbc.ca/player/play/2313671747656",
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
		"url": "https://www.cbc.ca/radio/thecurrent/airport-facial-recognition-biometrics-1.7130000",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Airports want to scan your face to make travelling easier. Privacy experts caution it's not ready for takeoff",
				"creators": [
					{
						"firstName": "Jason",
						"lastName": "Vermes",
						"creatorType": "author"
					}
				],
				"date": "2024-03-03",
				"abstractNote": "While airlines and airports say facial recognition can make air travel — an often tedious experience — more efficient and seamless, privacy advocates argue the use of biometric data is fraught and open to abuse.",
				"language": "en-CA",
				"libraryCatalog": "CBC.ca",
				"publicationTitle": "CBC Radio",
				"url": "https://www.cbc.ca/radio/thecurrent/airport-facial-recognition-biometrics-1.7130000",
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
		"url": "https://www.cbc.ca/radio/frequency",
		"detectedItemType": false,
		"items": []
	},
	{
		"type": "web",
		"url": "https://www.cbc.ca/news/politics/trudeau-meloni-pro-palestinian-protesters-toronto-1.7132378",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Trudeau's Toronto event with Italy PM Meloni cancelled due to pro-Palestinian protest",
				"creators": [
					{
						"firstName": "Justin",
						"lastName": "Li",
						"creatorType": "author"
					},
					{
						"firstName": "Christian",
						"lastName": "Paas-Lang",
						"creatorType": "author"
					}
				],
				"date": "2024-03-03",
				"abstractNote": "A Toronto event where Canadian Prime Minister Justin Trudeau was scheduled to host his Italian counterpart was cancelled on Saturday due to security concerns as hundreds of pro-Palestinian protesters gathered outside the venue, a spokesperson for the Prime Minister's Office said.",
				"language": "en-CA",
				"libraryCatalog": "CBC.ca",
				"publicationTitle": "CBC News",
				"url": "https://www.cbc.ca/news/politics/trudeau-meloni-pro-palestinian-protesters-toronto-1.7132378",
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
		"url": "https://www.cbc.ca/music/canadian-reggae-songs-record-labels-1.7116717",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Canadian reggae's past, present and future",
				"creators": [
					{
						"firstName": "Kelsey",
						"lastName": "Adams",
						"creatorType": "author"
					}
				],
				"date": "2024-02-23",
				"abstractNote": "From the 1st recording on Canadian soil to the newcomers pushing the genre forward today.",
				"language": "en-CA",
				"libraryCatalog": "CBC.ca",
				"publicationTitle": "CBC Music",
				"url": "https://www.cbc.ca/music/canadian-reggae-songs-record-labels-1.7116717",
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
		"url": "https://www.cbc.ca/life/culture/the-best-card-games-to-play-with-a-standard-deck-1.5836447",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "The best card games to play with a standard deck",
				"creators": [
					{
						"firstName": "Sebastian",
						"lastName": "Yūe",
						"creatorType": "author"
					}
				],
				"date": "2020-12-10",
				"abstractNote": "This list will have you suggesting card night every chance you get!",
				"language": "en-CA",
				"libraryCatalog": "CBC.ca",
				"publicationTitle": "CBC Life",
				"url": "https://www.cbc.ca/life/culture/the-best-card-games-to-play-with-a-standard-deck-1.5836447",
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
		"url": "https://www.cbc.ca/television/he-landed-a-sitcom-role-on-his-first-audition-i-was-really-hyped-says-scarborough-teen-1.7101522",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "He landed a sitcom role on his first audition. 'I was really hyped,' says Scarborough teen",
				"creators": [
					{
						"firstName": "Russ",
						"lastName": "Martin",
						"creatorType": "author"
					}
				],
				"date": "2024-02-05",
				"abstractNote": "The new CBC workplace comedy One More Time follows the manager of a second-hand sporting goods shop, DJ, played by comedian D.J. Demers, and the hijinks of his beloved gang of oddball employees. Among the motley crew is Keeran Devkar, a very green first-time associate played by 15-year-old Seran Sathiyaseelan.",
				"language": "en-CA",
				"libraryCatalog": "CBC.ca",
				"publicationTitle": "CBC Television",
				"url": "https://www.cbc.ca/television/he-landed-a-sitcom-role-on-his-first-audition-i-was-really-hyped-says-scarborough-teen-1.7101522",
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
		"url": "https://www.cbc.ca/search?q=Windows%2011&section=arts&sortOrder=relevance&media=all",
		"items": "multiple"
	}
]
/** END TEST CASES **/
