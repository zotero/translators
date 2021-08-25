{
	"translatorID": "54d6d465-159b-4631-92fe-4ff0d4664e22",
	"label": "World Digital Library",
	"creator": "Abe Jellinek",
	"target": "^https?://www\\.wdl\\.org/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-07-09 17:07:18"
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


function detectWeb(doc, url) {
	if (url.includes('/item/')) {
		let itemType = text(doc, '#item-type a').trim();
		switch (itemType) {
			case 'Books':
				return 'book';
			case 'Journals':
				return 'book'; // entire journal issue
			case 'Manuscripts':
				return 'manuscript';
			case 'Maps':
				return 'map';
			case 'Motion Pictures':
				return 'film';
			case 'Newspapers':
				return 'book'; // entire newspaper
			case 'Prints, Photographs':
				return 'artwork';
			case 'Sound Recordings':
				if (/\binterview\b/i.test(doc.title)) {
					return 'interview';
				}
				return 'audioRecording';
			default:
				Z.debug(`Unmapped type: ${itemType}`);
				return 'book';
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
	var rows = doc.querySelectorAll('.body > a.title');
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
	
	let main = doc.querySelector('main');
	
	item.title = text(main, '[itemprop="name"]');
	let originalTitle = text(main, '#original-title');
	if (originalTitle) item.title = `${item.title} (${originalTitle})`;
	
	item.abstractNote = text(main, '[itemprop="description"]');
	item.date = ZU.strToISO(attr(main, '[itemprop="dateCreated"]', 'datetime'));
	item.publisher = text(main, '[itemprop="publisher"]');
	item.place = text(main, '.place-of-publication');
	
	item.tags = [...doc.querySelectorAll('[itemprop="keywords"]')]
		.map(kw => ({ tag: kw.innerText }));
	
	item.creators = [...doc.querySelectorAll('[itemprop="creator"]')]
		.map(creator => ZU.cleanAuthor(
			creator.innerText,
			{
				map: 'cartographer',
				artwork: 'artist',
				film: 'contributor',
				audioRecording: 'contributor',
				interview: 'contributor' // too complicated to figure out from the page
			}[item.itemType] || 'author',
			true
		));
	
	item.url = attr(doc, 'link[rel="canonical"]', 'href');
	
	let attachmentLink = doc.querySelector('a[href$=".pdf"]');
	let mimeType = 'application/pdf';
	let label = 'Full Text PDF';
	
	if (!attachmentLink) {
		attachmentLink = doc.querySelector('a[href$=".mp3"]');
		mimeType = 'audio/mpeg';
		label = 'Audio';
	}
	
	if (!attachmentLink) {
		attachmentLink = doc.querySelector('a[href$=".mp4"]');
		mimeType = 'video/mp4';
		label = 'Video';
	}
	
	if (attachmentLink) {
		let maybeSize = (text(attachmentLink, '.badge').match(/([0-9.])/) || [])[1];
		if (maybeSize && parseFloat(maybeSize) >= 100) {
			item.attachments.push({
				title: `${label} (too large)`,
				mimeType: mimeType,
				url: ''
			});
		}
		else {
			item.attachments.push({
				title: label,
				mimeType: mimeType,
				url: attachmentLink.href
			});
		}
	}
	
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.wdl.org/en/item/18/",
		"items": [
			{
				"itemType": "book",
				"title": "First Nerchinsk Regiment of Zabaikal Cossack Troops (1-й Нерчинский полк Забайкальского казачьего войска)",
				"creators": [
					{
						"firstName": "A. E.",
						"lastName": "Makovin",
						"creatorType": "author"
					}
				],
				"date": "1907",
				"abstractNote": "The First Nerchinsk Cossack Regiment was created in 1898 on the basis of the First Chita Regiment. In May 1899, the regiment was relocated from Chita to the Ussuriisk Region. In 1900, it was sent to Manchuria in connection with Russia’s participation in the European effort to quell the Boxer Rebellion, an uprising against foreign influence in China. The regiment later participated in the Russo-Japanese War of 1904-05 before returning to Chita after a six-year absence. This book is a historical outline of the regiment’s activities in 1898-1906, and includes maps and diagrams of battles, photographs, and black-and-white and colored illustrations by the artist N. Samokish.",
				"libraryCatalog": "World Digital Library",
				"place": "Saint Petersburg",
				"publisher": "Association of R. Golik and A. Vil'borg",
				"url": "https://www.wdl.org/en/item/18/",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Armies"
					},
					{
						"tag": "Battles"
					},
					{
						"tag": "Meeting of Frontiers"
					},
					{
						"tag": "Military science"
					},
					{
						"tag": "Public administration & military science"
					},
					{
						"tag": "Russo-Japanese War, 1904-1905"
					},
					{
						"tag": "Social sciences"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.wdl.org/en/item/4044/",
		"items": [
			{
				"itemType": "artwork",
				"title": "Cuban Refugee Breaks Down Upon his Arrival at Key West, Florida from Mariel, Cuba During the Mariel Boatlift",
				"creators": [
					{
						"firstName": "Dale M.",
						"lastName": "McDonald",
						"creatorType": "artist"
					}
				],
				"date": "1980",
				"abstractNote": "The Mariel Boatlift was a mass exodus of Cubans from Mariel Port on the island of Cuba to Florida between April and November 1980. Departure by boat was permitted by the Castro government after several years of improving relations between Cuba and the United States under President Jimmy Carter, a period that coincided with a severe downturn in the Cuban economy. Perhaps as many as 125,000 Cubans made the journey to Florida on overcrowded craft of varying size and seaworthiness. Political opinion in the United States began to turn against Carter after media reports revealed that recently released convicted criminals and mental patients were among those seeking asylum. This image, by photographer and firefighter Dale M. McDonald, shows the overwhelming emotions of a refugee at arriving safely in Key West from Cuba.",
				"libraryCatalog": "World Digital Library",
				"url": "https://www.wdl.org/en/item/4044/",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Boat people"
					},
					{
						"tag": "Civil & political rights"
					},
					{
						"tag": "Cubans"
					},
					{
						"tag": "Emigration and immigration"
					},
					{
						"tag": "International migration & colonization"
					},
					{
						"tag": "Mariel Boatlift, 1980"
					},
					{
						"tag": "Political science"
					},
					{
						"tag": "Political science"
					},
					{
						"tag": "Refugees"
					},
					{
						"tag": "Social sciences"
					},
					{
						"tag": "Social sciences"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.wdl.org/en/item/110/",
		"items": [
			{
				"itemType": "interview",
				"title": "Interview with Fountain Hughes, Baltimore, Maryland, June 11, 1949",
				"creators": [
					{
						"firstName": "Fountain",
						"lastName": "Hughes",
						"creatorType": "contributor"
					},
					{
						"firstName": "Hermond",
						"lastName": "Norwood",
						"creatorType": "contributor"
					}
				],
				"date": "1949-06-11",
				"abstractNote": "Approximately 4 million slaves were freed at the conclusion of the American Civil War. The stories of a few thousand have been passed on to future generations through word of mouth, diaries, letters, records, or written transcripts of interviews. Only 26 audio-recorded interviews of ex-slaves have been found, 23 of which are in the collections of the American Folklife Center at the Library of Congress. In this interview, 101-year-old Fountain Hughes recalls his boyhood as a slave, the Civil War, and life in the United States as an African American from the 1860s to the 1940s. About slavery, he tells the interviewer: \"You wasn't no more than a dog to some of them in them days. You wasn't treated as good as they treat dogs now. But still I didn't like to talk about it. Because it makes, makes people feel bad you know. Uh, I, I could say a whole lot I don't like to say. And I won't say a whole lot more.\"",
				"libraryCatalog": "World Digital Library",
				"url": "https://www.wdl.org/en/item/110/",
				"attachments": [
					{
						"title": "Audio",
						"mimeType": "audio/mpeg"
					}
				],
				"tags": [
					{
						"tag": "African American men"
					},
					{
						"tag": "Credit--Management"
					},
					{
						"tag": "Culture & institutions"
					},
					{
						"tag": "History & geography"
					},
					{
						"tag": "History of North America"
					},
					{
						"tag": "Jefferson, Thomas, 1743-1826"
					},
					{
						"tag": "Slavery"
					},
					{
						"tag": "Social sciences"
					},
					{
						"tag": "United States"
					},
					{
						"tag": "United States--History--Civil War, 1861-1865"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.wdl.org/en/item/4052/",
		"items": [
			{
				"itemType": "film",
				"title": "Care and Feeding of a Mermaid",
				"creators": [],
				"date": "1961-12",
				"abstractNote": "This film shows a young woman training to perform as a mermaid at Weeki Wachee, a Florida water park founded by Newton Perry (1908–87) after World War II. After serving in the U.S. Navy during the war, where among other duties he trained military divers, champion swimmer Perry scouted out locations for a water park. He found a major spring in a largely unpopulated area 100 miles (160 kilometers) north of Tampa, with remarkably clear water that flowed to the Gulf of Mexico 16 miles (26 kilometers) away. To lure tourists to his attraction, in 1947 Perry constructed an underwater theater where people could view the wildlife in the springs. To further differentiate Weeki Wachee from other roadside attractions, Perry trained young women to stay underwater for long periods of time using his own innovative underwater tubing system for breathing. The swimmers performed underwater maneuvers and ballet. Perry advertised the mermaids of Weeki Wachee, which by the 1950s was one of the most popular attractions in the United States. In 1959, the American Broadcast Company bought the park, built a larger, 500-seat theatre that was embedded below ground in the side of the spring, and began promoting the spring across the nation. In this 1961 film, underwater cameras allow viewers see lessons in breath control, graceful movements, synchronized swimming, and underwater dining etiquette.",
				"libraryCatalog": "World Digital Library",
				"url": "https://www.wdl.org/en/item/4052/",
				"attachments": [
					{
						"title": "Video",
						"mimeType": "video/mp4"
					}
				],
				"tags": [
					{
						"tag": "Attractions -- Employees"
					},
					{
						"tag": "Recreational & performing arts"
					},
					{
						"tag": "Skin diving"
					},
					{
						"tag": "Synchronized swimming"
					},
					{
						"tag": "The arts; fine & decorative arts"
					},
					{
						"tag": "Women swimmers"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.wdl.org/en/search/?q=theme+park&qla=en",
		"items": "multiple"
	}
]
/** END TEST CASES **/
