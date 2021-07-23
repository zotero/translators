{
	"translatorID": "80505478-d42e-4920-8c33-4f863d4ce513",
	"label": "Calisphere",
	"creator": "Abe Jellinek",
	"target": "^https://calisphere\\.org/(item/|search/)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-07-07 21:01:11"
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
	if (doc.querySelector('.meta-block__list')) {
		for (let type of doc.querySelectorAll('.meta-block__list > .meta-block__type')) {
			if (type.textContent.trim() == 'Type') {
				switch (type.nextElementSibling.innerText.trim().toLowerCase()) {
					case 'text':
						return 'document';
					case 'image':
						return 'artwork';
					case 'moving image':
						return 'videoRecording';
					case 'sound':
						return 'audioRecording';
					case 'dataset':
						return 'document';
					case 'physical object':
						return 'artwork';
				}
				break;
			}
		}
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.thumbnail__link');
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

function scrape(doc, url) {
	let item = new Zotero.Item(detectWeb(doc, url));
	
	item.title = text(doc, '[itemprop="name"]');
	item.abstractNote = text(doc, '[itemprop="description"]');
	item.date = ZU.strToISO(text(doc, '[itemprop="dateCreated"]'));
	
	// sometimes the last language line will be the ISO code!
	let languages = text(doc, '[itemprop="inLanguage"]').split(/\s/);
	item.language = languages[languages.length - 1];
	
	item.url = attr(doc, 'link[rel="canonical"]', 'href') || url;
	item.archive = text(doc, '[itemprop="isPartOf"]');
	item.libraryCatalog = 'Calisphere';
	
	let authors = innerText(doc, '[itemprop="creator"]');
	if (authors) {
		for (let author of authors.split('\n')) {
			let type = 'author';
			if (item.itemType == 'artwork') {
				type = 'artist';
			}
			else if (item.itemType == 'videoRecording'
				|| item.itemType == 'audioRecording') {
				type = 'contributor'; // hard to tell from the page
			}
			
			item.creators.push(ZU.cleanAuthor(
				author,
				type,
				true
			));
		}
	}
	
	item.tags = innerText(doc, '[itemprop="about"]')
		.split('\n')
		.map(tag => ({ tag }));
	
	if (doc.querySelector('a.obj__link')) {
		item.attachments.push({
			title: 'Source',
			mimeType: 'text/html',
			url: attr(doc, 'a.obj__link', 'href')
		});
	}
	
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://calisphere.org/item/829e5da7-6ff0-4a60-82d3-b3246d00d9ca/",
		"items": [
			{
				"itemType": "document",
				"title": "Field crops newsletter: allelopathic effect of alfalfa on sugarbeets; safflower for 1989?; U.C. regional wheat tests; U.C. regional barley tests; U.C. regional alfalfa variety yield trials; early beet planting; sustainable agriculture--program announcement; ecological farm conference; corn test plot results",
				"creators": [
					{
						"firstName": "Franz R.",
						"lastName": "Kegel",
						"creatorType": "author"
					}
				],
				"date": "1988-11",
				"abstractNote": "Funding: Digitization funded in part by a National Historical Publications and Records Commission (NHPRC) Major Initiatives Grant (RM-100281) awarded to the University of California, Merced Library.",
				"archive": "Fresno County, UC Cooperative Extension Records",
				"language": "eng",
				"libraryCatalog": "Calisphere",
				"shortTitle": "Field crops newsletter",
				"url": "https://calisphere.org/item/829e5da7-6ff0-4a60-82d3-b3246d00d9ca/",
				"attachments": [
					{
						"title": "Source",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "alfalfa"
					},
					{
						"tag": "allelopathy"
					},
					{
						"tag": "sugar beet"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://calisphere.org/item/a63418fba6033a5c00ae1c0230e4375b/",
		"items": [
			{
				"itemType": "artwork",
				"title": "Son! Do you know that your seed corn will grow? Get your seed corn now. The seed corn situation is the worst in the history of the state. If wheat or oats fail, we can plant corn and grow a paying crop ... Corn is Illinois' greatest crop",
				"creators": [
					{
						"firstName": "John T.",
						"lastName": "McCutcheon",
						"creatorType": "artist"
					}
				],
				"date": "1917",
				"archive": "Hoover Institution Digital Collections",
				"libraryCatalog": "Calisphere",
				"shortTitle": "Son! Do you know that your seed corn will grow?",
				"url": "https://calisphere.org/item/a63418fba6033a5c00ae1c0230e4375b/",
				"attachments": [
					{
						"title": "Source",
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
		"url": "https://calisphere.org/item/fd3fad62ed17fab44be94069beadbdde/",
		"items": [
			{
				"itemType": "videoRecording",
				"title": "Atlas I Serparation Test, Atlas IIAS SRB Test, Atlas IIA Test, Fairing Test HACL Video 00008",
				"creators": [],
				"abstractNote": "Film from the Atlas Centaur Heritage Film Collection which was donated to the San Diego Air and Space Museum by Lockheed Martin and United Launch Alliance. The Collection contains 3,000 reels of 16-millimeter film. From the archives of the San Diego Air and Space Museum http://www.sandiegoairandspace.org/research/ Please do not use for commercial purposes without permission.",
				"archive": "Moving Image Collection",
				"libraryCatalog": "Calisphere",
				"url": "https://calisphere.org/item/fd3fad62ed17fab44be94069beadbdde/",
				"attachments": [
					{
						"title": "Source",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Atlas"
					},
					{
						"tag": "Atlas Centaur"
					},
					{
						"tag": "Atlas IIA"
					},
					{
						"tag": "Atlas Missile"
					},
					{
						"tag": "Atlas Rocket"
					},
					{
						"tag": "Lockheed Martin Missile Atlas Centaur Heritage Film Collection Convair General Dynamics"
					},
					{
						"tag": "UAL"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://calisphere.org/item/977c7c5e19b2e32fea03596d91975c2d/",
		"items": [
			{
				"itemType": "videoRecording",
				"title": "Interview with Cornelis de Kluyver",
				"creators": [
					{
						"firstName": "Cornelis A.",
						"lastName": "De Kluyver",
						"creatorType": "contributor"
					}
				],
				"date": "2001-12-03",
				"abstractNote": "Cornelis de Kluyver was dean of the Drucker School from 1999 to 2006. Here he talks about some of his humorous encounters with Peter Drucker and what it was like to be his \"boss\" as dean, referring to Drucker as a \"benevolent mentor\". He also discusses Drucker's European education and background as well as his experience as a journalist.",
				"archive": "Drucker Archives",
				"language": "English",
				"libraryCatalog": "Calisphere",
				"url": "https://calisphere.org/item/977c7c5e19b2e32fea03596d91975c2d/",
				"attachments": [
					{
						"title": "Source",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "De Kluyver, Cornelis A"
					},
					{
						"tag": "Drucker, Peter F. (Peter Ferdinand), 1909-2005"
					},
					{
						"tag": "Interviews"
					},
					{
						"tag": "Universities and colleges - Faculty"
					},
					{
						"tag": "Universities and colleges - United States - Administration"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://calisphere.org/item/dcfef906d97891a33d602e75fc6c9524/",
		"items": [
			{
				"itemType": "audioRecording",
				"title": "H.E. Barney Jewett oral history interview",
				"creators": [
					{
						"lastName": "Ontario City Library",
						"creatorType": "contributor"
					},
					{
						"firstName": "Robert H.",
						"lastName": "Collins",
						"creatorType": "contributor"
					}
				],
				"date": "1977",
				"abstractNote": "H.E. Jewett: Came from Iowa in 1935; house-1889 moved to present site in 1912;off Hwy 66 orange trees everywhere;came out to Ontario in 1950;main crop in Chino was potatoes and corn;Main crop is green feed, corn, alfalfa; Pacific electric, electric buses,quiet, smog free-Big red car to San Bernardino,system sold to Mexico City;Mass transportation;Earthquakes-1889,​1​9​2​0​'​s​, 1950's, and 1971.  California Preservation Service",
				"archive": "California Revealed from Ontario City Library, Robert E. Ellingwood Model Colony History Room",
				"language": "English",
				"libraryCatalog": "Calisphere",
				"url": "https://calisphere.org/item/dcfef906d97891a33d602e75fc6c9524/",
				"attachments": [
					{
						"title": "Source",
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
		"url": "https://calisphere.org/search/?q=corn",
		"items": "multiple"
	}
]
/** END TEST CASES **/
