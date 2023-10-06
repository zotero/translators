{
	"translatorID": "595f70a0-9f64-459c-a4b1-658c8193bf7f",
	"label": "Kanopy",
	"creator": "Abe Jellinek",
	"target": "^https?://[^/]+\\.kanopy\\.com/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-08-16 23:36:22"
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
	if (url.includes('/video/')) {
		return "film";
	}
	return false;
}

function doWeb(doc, url) {
	scrape(doc, url);
}

function scrape(doc, url) {
	let item = new Zotero.Item('film');
	
	item.title = ZU.trimInternal(text(doc, 'h1.title').trim().replace(/\s*\n/, ':'));
	item.abstractNote = text(doc, '#video-panel-details p');
	item.distributor = text(doc, '.author a');
	item.url = attr(doc, 'link[rel="canonical"]', 'href') || url;
	
	for (let elem = doc.querySelector('.features > *'); elem; elem = elem.nextElementSibling) {
		let key = elem.textContent.trim();
		let value = (elem = elem.nextElementSibling).textContent.trim();
		
		switch (key) {
			case 'Running Time':
				item.runningTime = value;
				break;
			case 'Year':
				item.date = value;
				break;
			case 'Filmmakers':
				for (let person of elem.querySelectorAll('a')) {
					item.creators.push(ZU.cleanAuthor(person.textContent, 'director'));
				}
				break;
			case 'Features':
				for (let person of elem.querySelectorAll('a')) {
					item.creators.push(ZU.cleanAuthor(person.textContent, 'contributor'));
				}
				break;
			case 'Languages':
				item.language = value;
				break;
			case 'Subjects':
				for (let subj of elem.querySelectorAll('.item')) {
					let tag = subj.textContent.replace(/\s*>\s*/g, '--').trim();
					if (tag != 'Staff Picks') {
						item.tags.push({ tag });
					}
				}
				break;
		}
	}
	
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://berkeley.kanopy.com/video/metropolis-0",
		"items": [
			{
				"itemType": "film",
				"title": "Metropolis",
				"creators": [
					{
						"firstName": "Fritz",
						"lastName": "Lang",
						"creatorType": "director"
					}
				],
				"date": "1927",
				"abstractNote": "Perhaps the most famous and influential of all silent films, METROPOLIS had for 75 years been seen only in shortened or truncated versions. Now, restored in Germany with state-of-the-art digital technology, under the supervision of the Murnau Foundation, and with the original 1927 orchestral score by Gottfried Huppertz added, METROPOLIS can be appreciated in its full glory.",
				"distributor": "Kino Lorber",
				"language": "German, Silent",
				"libraryCatalog": "Kanopy",
				"runningTime": "149 mins",
				"url": "https://berkeley.kanopy.com/video/metropolis-0",
				"attachments": [],
				"tags": [
					{
						"tag": "Global Studies & Languages--German Studies"
					},
					{
						"tag": "Movies"
					},
					{
						"tag": "Movies--Early Film"
					},
					{
						"tag": "Movies--Science Fiction & Fantasy"
					},
					{
						"tag": "The Arts--Film Studies"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://berkeley.kanopy.com/video/modern-times",
		"items": [
			{
				"itemType": "film",
				"title": "Modern Times",
				"creators": [
					{
						"firstName": "Charlie",
						"lastName": "Chaplin",
						"creatorType": "director"
					},
					{
						"firstName": "Charlie",
						"lastName": "Chaplin",
						"creatorType": "contributor"
					},
					{
						"firstName": "Henry",
						"lastName": "Bergman",
						"creatorType": "contributor"
					},
					{
						"firstName": "Paulette",
						"lastName": "Goddard",
						"creatorType": "contributor"
					}
				],
				"date": "1936",
				"abstractNote": "Charlie Chaplin's last outing as the Little Tramp puts the iconic character to work as a giddily inept factory employee who becomes smitten with a gorgeous gamine (Paulette Goddard).",
				"distributor": "The Criterion Collection",
				"language": "English, Silent",
				"libraryCatalog": "Kanopy",
				"runningTime": "88 mins",
				"url": "https://berkeley.kanopy.com/video/modern-times",
				"attachments": [],
				"tags": [
					{
						"tag": "Movies"
					},
					{
						"tag": "Movies--Classic Cinema"
					},
					{
						"tag": "Movies--Comedy"
					},
					{
						"tag": "Movies--Early Film"
					},
					{
						"tag": "The Arts--Film Studies"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://berkeley.kanopy.com/video/hard-days-night",
		"items": [
			{
				"itemType": "film",
				"title": "A Hard Day's Night",
				"creators": [
					{
						"firstName": "Richard",
						"lastName": "Lester",
						"creatorType": "director"
					},
					{
						"firstName": "George",
						"lastName": "Harrison",
						"creatorType": "contributor"
					},
					{
						"firstName": "John",
						"lastName": "Lennon",
						"creatorType": "contributor"
					},
					{
						"firstName": "Paul",
						"lastName": "McCartney",
						"creatorType": "contributor"
					},
					{
						"firstName": "Ringo",
						"lastName": "Starr",
						"creatorType": "contributor"
					}
				],
				"date": "1964",
				"abstractNote": "Meet the Beatles! Just one month after they exploded onto the U.S. scene with their Ed Sullivan Show appearance, John, Paul, George, and Ringo began working on a project that would bring their revolutionary talent to the big screen, earning them a 1965 BAFTA nomination for Most Promising Newcomer to Leading Film Roles.",
				"distributor": "The Criterion Collection",
				"language": "English",
				"libraryCatalog": "Kanopy",
				"runningTime": "89 mins",
				"url": "https://berkeley.kanopy.com/video/hard-days-night",
				"attachments": [],
				"tags": [
					{
						"tag": "Global Studies & Languages--European/Baltic Studies"
					},
					{
						"tag": "Movies"
					},
					{
						"tag": "Movies--Classic Cinema"
					},
					{
						"tag": "Movies--Comedy"
					},
					{
						"tag": "The Arts--Music"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://berkeley.kanopy.com/video/black-panthers-0",
		"items": [
			{
				"itemType": "film",
				"title": "The Black Panthers: Vanguard of the Revolution",
				"creators": [
					{
						"firstName": "Stanley",
						"lastName": "Nelson",
						"creatorType": "director"
					}
				],
				"date": "2015",
				"abstractNote": "In the turbulent 1960s, change was coming to America and the fault lines could no longer be ignored -- cities were burning, Vietnam was exploding, and disputes raged over equality and civil rights. A new revolutionary culture was emerging and it sought to drastically transform the system. The Black Panther Party for Self-Defense would, for a short time, put itself at the vanguard of that change. The Black Panthers: Vanguard of the Revolution is the first feature-length documentary to explore the Black Panther Party, its significance to the broader American culture, its cultural and political awakening for black people, and the painful lessons wrought when a movement derails. Master documentarian Stanley Nelson goes straight to the source, weaving a treasure trove of rare archival footage with the diverse group of voices of the people who were there: police, FBI informants, journalists, white supporters and detractors, and Black Panthers who remained loyal to the party and those who left it.",
				"distributor": "PBS",
				"language": "English",
				"libraryCatalog": "Kanopy",
				"runningTime": "115 mins",
				"shortTitle": "The Black Panthers",
				"url": "https://berkeley.kanopy.com/video/black-panthers-0",
				"attachments": [],
				"tags": [
					{
						"tag": "Documentaries"
					},
					{
						"tag": "Documentaries--Ethnicity & Identity"
					},
					{
						"tag": "Documentaries--Historical Perspectives"
					},
					{
						"tag": "Movies--TV Series"
					},
					{
						"tag": "Social Sciences--History - Modern"
					},
					{
						"tag": "Social Sciences--Race & Class Studies"
					},
					{
						"tag": "Social Sciences--Sociology"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://berkeley.kanopy.com/video/berlin-symphony-great-city",
		"items": [
			{
				"itemType": "film",
				"title": "Berlin, Symphony of a Great City",
				"creators": [
					{
						"firstName": "Walter",
						"lastName": "Ruttmann",
						"creatorType": "director"
					}
				],
				"date": "1927",
				"abstractNote": "At once an invaluable photographic record of life in Weimar Berlin and a timeless demonstration of the cinema's ability to enthrall on a purely visceral level, Berlin, Symphony of a Great City (Berlin, die Symphonie der Grosstadt) offers a kaleidoscopic view of a single day in the life of a bustling metropolis.",
				"distributor": "Flicker Alley",
				"language": "English, Silent",
				"libraryCatalog": "Kanopy",
				"runningTime": "63 mins",
				"url": "https://berkeley.kanopy.com/video/berlin-symphony-great-city",
				"attachments": [],
				"tags": [
					{
						"tag": "Global Studies & Languages--German Studies"
					},
					{
						"tag": "Movies--Early Film"
					},
					{
						"tag": "The Arts"
					},
					{
						"tag": "The Arts--Film Studies"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
