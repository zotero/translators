{
	"translatorID": "d13eb92e-fb16-41e0-9a24-73bad50f9bb7",
	"label": "American Archive of Public Broadcasting",
	"creator": "Abe Jellinek",
	"target": "^https?://(www\\.)?americanarchive\\.org/catalog",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-08-28 19:23:21"
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
	if (doc.querySelector('meta[property="og:video"]')) {
		return "tvBroadcast";
	}
	else if (doc.querySelector('meta[property="og:audio"]')) {
		return "radioBroadcast";
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('h2 > a[href*="/catalog/"]');
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
	var translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	
	translator.setHandler('itemDone', function (obj, item) {
		if (item.abstractNote) {
			item.abstractNote = item.abstractNote.replace(/\n+/g, ' ');
		}
		
		for (let entry of doc.querySelectorAll('.contributors dl')) {
			for (let b of entry.querySelectorAll('b')) {
				let label = b.textContent;
				let name = b.nextSibling.textContent.trim().replace(/^Dr\b/, '');
				let type = 'contributor';
				let institution = false;
				
				if (label.includes('Reporter') || label.includes('Host')) {
					type = 'castMember';
				}
				else if (label.includes('Director')) {
					type = 'director';
				}
				else if (label.includes('Writer')) {
					type = 'scriptwriter';
				}
				else if (label.includes('Produc')) {
					type = 'producer';
				}
				else if (label.includes('Copyright Holder')) {
					continue;
				}
				
				if (label.includes('Organization')) {
					institution = true;
				}
				
				if (institution) {
					item.creators.push({
						lastName: name,
						creatorType: type,
						fieldMode: 1
					});
				}
				else {
					item.creators.push(ZU.cleanAuthor(name, type, name.includes(', ')));
				}
			}
		}
		
		for (let dt of doc.querySelectorAll('dt')) {
			let key = ZU.trimInternal(dt.textContent);
			
			let dd = dt.nextElementSibling;
			while (dd && dd.tagName == 'DD') {
				let value = ZU.trimInternal(dd.textContent);
	
				switch (key) {
					case 'Contributing Organization':
					case 'Producing Organization': {
						if (item.network) break;
						
						if (!item.creators.length) {
							item.creators.push({
								lastName: value.replace(/\s*\(.*\)/, ''),
								creatorType: 'contributor',
								fieldMode: 1
							});
						}
						
						let [, broadcaster, place] = value.match(/^([^(]*)(?:\((.+)\))?/);
						
						if (/([WK][A-Z]{2,3}|PBS|NPR|Broadcast|Network)/.test(broadcaster)) {
							item.network = broadcaster;
						}
						
						if (place) item.place = place;
						
						break;
					}
					case 'Date':
					case 'Created':
						if (!item.date) {
							item.date = ZU.strToISO(value);
						}
						break;
					case 'Genres':
					case 'Topics':
						item.tags.push({ tag: value });
						break;
					case 'Duration':
						item.runningTime = value;
						break;
					case 'Series':
						item.programTitle = value;
						break;
					case 'Episode':
						item.title = value;
						break;
					case 'Episode Number':
						item.episodeNumber = value;
						break;
					case 'Rights':
						item.rights = value;
						break;
				}
				
				dd = dd.nextElementSibling;
			}
		}
		
		// from the suggested citation on item pages
		item.archive = 'American Archive of Public Broadcasting (GBH and the Library of Congress)';
		
		// would like to grab the video file and attach it here, but they do a
		// referer check that precludes that.
		
		item.complete();
	});

	translator.getTranslatorObject(function (trans) {
		trans.itemType = detectWeb(doc, url);
		trans.doWeb(doc, url);
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://americanarchive.org/catalog/cpb-aacip_83-407wmf7g",
		"items": [
			{
				"itemType": "tvBroadcast",
				"title": "One More Harvest",
				"creators": [
					{
						"lastName": "PBS Utah",
						"creatorType": "contributor",
						"fieldMode": 1
					}
				],
				"date": "1984",
				"abstractNote": "This program profiles Utah farmer Melvin Good and his family. During the program, Melvin reminisces about his life and growing up on the farm; his grandchildren discuss the decision to becoming farmers or pursue another vocation; family members describe Melvin's and their passion for farming; and Melvin describes the process of harvesting a crop.",
				"archive": "American Archive of Public Broadcasting (GBH and the Library of Congress)",
				"language": "en",
				"libraryCatalog": "americanarchive.org",
				"network": "PBS Utah",
				"place": "Salt Lake City, Utah",
				"rights": "KUED",
				"runningTime": "00:28:27",
				"url": "http://americanarchive.org/catalog/cpb-aacip-83-407wmf7g",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Agriculture"
					},
					{
						"tag": "Documentary"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://americanarchive.org/catalog/cpb-aacip_223-225b07vs",
		"items": [
			{
				"itemType": "radioBroadcast",
				"title": "Art and Violence",
				"creators": [
					{
						"firstName": "Amy",
						"lastName": "Tardiff",
						"creatorType": "castMember"
					}
				],
				"date": "1995-06-17",
				"abstractNote": "This segment reports on an artist who discusses the importance of art in response to the violence of contemporary society.",
				"archive": "American Archive of Public Broadcasting (GBH and the Library of Congress)",
				"language": "en",
				"libraryCatalog": "americanarchive.org",
				"network": "WGCU Public Media",
				"place": "Fort Myers, Florida",
				"rights": "No copyright statement in content.",
				"runningTime": "00:04:33",
				"url": "http://americanarchive.org/catalog/cpb-aacip-223-225b07vs",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Fine Arts"
					},
					{
						"tag": "Local Communities"
					},
					{
						"tag": "News"
					},
					{
						"tag": "News Report"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://americanarchive.org/catalog/cpb-aacip-526-cv4bn9z59z",
		"items": [
			{
				"itemType": "tvBroadcast",
				"title": "The Test",
				"creators": [
					{
						"lastName": "WTVI",
						"creatorType": "producer",
						"fieldMode": 1
					},
					{
						"lastName": "Charlotte-Mecklenburg Board of Education",
						"creatorType": "producer",
						"fieldMode": 1
					}
				],
				"abstractNote": "\"'THE TEST' contains practical suggestions on how to reduce a student's trauma when taking a standardized test.\"--1979 Peabody Awards entry form.",
				"archive": "American Archive of Public Broadcasting (GBH and the Library of Congress)",
				"language": "en",
				"libraryCatalog": "americanarchive.org",
				"network": "WTVI",
				"runningTime": "00:10:32.265",
				"url": "http://americanarchive.org/catalog/cpb-aacip-526-cv4bn9z59z",
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
		"url": "https://americanarchive.org/catalog/cpb-aacip-153-956djvtx",
		"items": [
			{
				"itemType": "tvBroadcast",
				"title": "Front Street Weekly",
				"creators": [
					{
						"firstName": "Vivian",
						"lastName": "Condeni",
						"creatorType": "producer"
					},
					{
						"firstName": "Lyle",
						"lastName": "Graham",
						"creatorType": "director"
					},
					{
						"firstName": "Lyle",
						"lastName": "Graham",
						"creatorType": "producer"
					},
					{
						"firstName": "Gwyneth Gamble",
						"lastName": "Booth",
						"creatorType": "castMember"
					},
					{
						"lastName": "Oregon Public Broadcasting",
						"creatorType": "producer",
						"fieldMode": 1
					}
				],
				"date": "1984-11-21",
				"abstractNote": "This episode contains the following segments. The first segment, \"Spiritual Epidemic?,\" features individuals whose search for enlightenment has become all-consuming. The second, \"Magic in the Night?,\" investigates fire-walking and whether it amounts to anything more than a financial scam. The third segment, \"Salem Art Fair '85,\" is a profile on the annual 3-day summer festival. Front Street Weekly is a news magazine featuring segments on current events and topics of interest to the local community.",
				"archive": "American Archive of Public Broadcasting (GBH and the Library of Congress)",
				"language": "en",
				"libraryCatalog": "americanarchive.org",
				"network": "Oregon Public Broadcasting",
				"programTitle": "Front Street Weekly",
				"rights": "Oregon Public Broadcasting c. 1985",
				"runningTime": "00:29:48",
				"url": "http://americanarchive.org/catalog/cpb-aacip-153-956djvtx",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Crafts"
					},
					{
						"tag": "Health"
					},
					{
						"tag": "Local Communities"
					},
					{
						"tag": "Magazine"
					},
					{
						"tag": "News"
					},
					{
						"tag": "News Report"
					},
					{
						"tag": "Religion"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://americanarchive.org/catalog/cpb-aacip_260-2683bp5r",
		"items": [
			{
				"itemType": "tvBroadcast",
				"title": "Gerry Spence",
				"creators": [
					{
						"firstName": "Kyle",
						"lastName": "Nicholoff",
						"creatorType": "director"
					},
					{
						"firstName": "Ruby",
						"lastName": "Calvert",
						"creatorType": "producer"
					},
					{
						"firstName": "Gerry",
						"lastName": "Spence",
						"creatorType": "contributor"
					},
					{
						"firstName": "Deborah",
						"lastName": "Hammons",
						"creatorType": "castMember"
					},
					{
						"firstName": "Deborah",
						"lastName": "Hammons",
						"creatorType": "producer"
					},
					{
						"lastName": "Wyoming PBS",
						"creatorType": "producer",
						"fieldMode": 1
					}
				],
				"abstractNote": "The subject of this episode is Wyoming native Gerry Spence, a best-selling author considered by many to be America's greatest trial lawyer. He sits down with Deborah Hammons to talk about his past growing up in the city of Riverton. \"Main Street, Wyoming is a documentary series exploring aspects of Wyoming's local history and culture.\"",
				"archive": "American Archive of Public Broadcasting (GBH and the Library of Congress)",
				"episodeNumber": "605",
				"language": "en",
				"libraryCatalog": "americanarchive.org",
				"network": "Wyoming PBS",
				"programTitle": "Main Street, Wyoming",
				"rights": "Main Street, Wyoming is a public affairs presentation of Wyoming Public Television 1995 KCWC-TV",
				"runningTime": "00:29:10",
				"url": "http://americanarchive.org/catalog/cpb-aacip-260-2683bp5r",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "History"
					},
					{
						"tag": "Interview"
					},
					{
						"tag": "Local Communities"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://americanarchive.org/catalog/cpb-aacip-3d6c55fdb1b",
		"items": [
			{
				"itemType": "radioBroadcast",
				"title": "Big Bird - America's Favorite Flightless Bird",
				"creators": [
					{
						"lastName": "BirdNote",
						"creatorType": "producer",
						"fieldMode": 1
					},
					{
						"firstName": "Bob",
						"lastName": "Sundstrom",
						"creatorType": "scriptwriter"
					}
				],
				"date": "2018-11-20",
				"abstractNote": "There’s at least one bird that nearly everyone knows on sight: Big Bird. He’s been a Sesame Street celebrity since 1969, cutting a colorful figure for pre-school fans and their parents across the world. Big Bird is really a big kid with a kind heart, who makes friends everywhere he goes. He helps children feel okay about not knowing everything because, well, Big Bird is still figuring things out himself. Like the alphabet. When Big Bird first saw the alphabet, he thought it was one really, really long word. And Michael Stein knows how to pronounce it. Have a listen!",
				"archive": "American Archive of Public Broadcasting (GBH and the Library of Congress)",
				"language": "en",
				"libraryCatalog": "americanarchive.org",
				"place": "Seattle, Washington",
				"programTitle": "BirdNote",
				"rights": "Sounds for BirdNote stories were provided by the Macaulay Library at the Cornell Lab of Ornithology, Xeno-Canto, Martyn Stewart, Chris Peterson, John Kessler, and others. Where music was used, fair use was taken into consideration. Individual credits are found at the bottom of each transcript.",
				"runningTime": "00:01:45.195",
				"url": "http://americanarchive.org/catalog/cpb-aacip-3d6c55fdb1b",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Science"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://americanarchive.org/catalog/cpb-aacip-529-df6k06z734",
		"items": [
			{
				"itemType": "radioBroadcast",
				"title": "An Examination of Testing",
				"creators": [
					{
						"firstName": "William",
						"lastName": "Koch",
						"creatorType": "contributor"
					},
					{
						"firstName": "Panchita",
						"lastName": "Garrett",
						"creatorType": "contributor"
					},
					{
						"firstName": "Kathy",
						"lastName": "Glover",
						"creatorType": "contributor"
					},
					{
						"lastName": "KUT Longhorn Radio Network",
						"creatorType": "producer",
						"fieldMode": 1
					}
				],
				"date": "1982-04-02",
				"abstractNote": "Hosts Kathy Glover and Panchita Garrett talks with Dr. William Koch, Assoc. Dir. Of the Measurement and Evaluation Center at UT Austin. They discuss the nature of standardized testing, how, when and where it is used.",
				"archive": "American Archive of Public Broadcasting (GBH and the Library of Congress)",
				"language": "en",
				"libraryCatalog": "americanarchive.org",
				"network": "KUT Longhorn Radio Network",
				"programTitle": "The Inquiring Mind",
				"rights": "KUT, COPIES OKAY",
				"runningTime": "00:24:32",
				"url": "http://americanarchive.org/catalog/cpb-aacip-529-df6k06z734",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Education"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://americanarchive.org/catalog?q=The+Inquiring+Mind&utf8=%E2%9C%93&f[access_types][]=online",
		"items": "multiple"
	}
]
/** END TEST CASES **/
