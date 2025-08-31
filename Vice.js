{
	"translatorID": "131310dc-854c-4629-acad-521319ab9f19",
	"label": "Vice",
	"creator": "czar",
	"target": "^https?://(.+?\\.)?vice\\.com/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-01-03 23:13:44"
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


function scrubLowercaseTags(tags) {
	for (let tag of tags) {
		if (tag == tag.toLowerCase()) {
			tags[tags.indexOf(tag)] = ZU.capitalizeTitle(tag, true);
		}
	}
	return tags;
}

// ignore i-d.vice.com and amuse.vice.com, which can both use Embedded Metadata and don't need this translator
function detectWeb(doc, url) {
	if (url.includes('i-d.vice.com') || url.includes('amuse.vice.com')) {
		return false;
	}
	else if (/\/(article|story)\//.test(url)) {
		return "blogPost";
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}


function scrape(doc, url) {
	let item = new Zotero.Item('blogPost');
	let json = JSON.parse(text(doc, 'script[type="application/ld+json"]'));
	if (json) json = json["@graph"][1];
	else Z.debug("JSON invalid");
	item.title = json.headline;
	
	item.abstractNote = attr(doc, 'meta[name="description"]', 'content');
	item.blogTitle = "Vice";
	item.date = json.dateModified || json.datePublished;
	item.url = json.mainEntityOfPage['@id'];
	item.language = attr(doc, 'html', 'lang');
	
	// use XPath to support the rare multiple authors and fallback to JSON, which only lists one author
	let authors = doc.querySelectorAll('.contributor__meta a');
	if (authors) {
		for (let author of authors) {
			item.creators.push(ZU.cleanAuthor(author.text, "author"));
		}
	}
	else item.creators.push(ZU.cleanAuthor(json.author.name, 'author'));

	let tags = doc.querySelectorAll('.tags a');
	if (tags) {
		for (let tag of tags) {
			item.tags.push(tag.text);
		}
	}
	item.tags = scrubLowercaseTags(item.tags);
	
	item.attachments.push({
		document: doc,
		title: 'Snapshot',
		mimeType: "text/html"
	});
	
	item.complete();
}


function getSearchResults(doc, checkOnly) {
	let items = {};
	let found = false;
	let rows = doc.querySelectorAll('.vice-card-hed a');
	for (let row of rows) {
		var href = row.href;
		var title = ZU.trimInternal(row.textContent);
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
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.vice.com/en/article/padaqv/anti-g20-activists-told-us-what-they-brought-to-the-protest-in-hamburg",
		"items": [
			{
				"itemType": "blogPost",
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
						"tag": "Demo"
					},
					{
						"tag": "Demonstration"
					},
					{
						"tag": "G20"
					},
					{
						"tag": "Hamburg"
					},
					{
						"tag": "Protest"
					},
					{
						"tag": "VICE Germany"
					},
					{
						"tag": "VICE International"
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
				"itemType": "blogPost",
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
						"tag": "Cibelle"
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
						"tag": "Msn"
					},
					{
						"tag": "Nina Freeman"
					},
					{
						"tag": "Romance"
					},
					{
						"tag": "Waypoint"
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
				"itemType": "blogPost",
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
						"tag": "Kapitalismus"
					},
					{
						"tag": "Laura Meschede"
					},
					{
						"tag": "Meinung"
					},
					{
						"tag": "Wirtschaft"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.vice.com/en/article/434pxm/voters-may-soon-toughen-up-americas-weakest-police-shootings-law",
		"items": [
			{
				"itemType": "blogPost",
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
						"tag": "Ballot Initiative"
					},
					{
						"tag": "Charleena Lyles"
					},
					{
						"tag": "Che Taylor"
					},
					{
						"tag": "Crime"
					},
					{
						"tag": "Criminal Justice"
					},
					{
						"tag": "Law Enforcement"
					},
					{
						"tag": "News"
					},
					{
						"tag": "Not This Time"
					},
					{
						"tag": "Police"
					},
					{
						"tag": "Police Deadly Force"
					},
					{
						"tag": "Politics"
					},
					{
						"tag": "Seattle"
					},
					{
						"tag": "VICE News"
					},
					{
						"tag": "Washington State"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.vice.com/en/section/games?page=2",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.vice.com/de",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.vice.com/en/topic/thump?q=venetian",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.vice.com/en/article/y3dpyw/inside-crime-app-citizen-vigilante",
		"items": [
			{
				"itemType": "blogPost",
				"title": "'FIND THIS FUCK:' Inside Citizen’s Dangerous Effort to Cash In On Vigilantism",
				"creators": [
					{
						"firstName": "Joseph",
						"lastName": "Cox",
						"creatorType": "author"
					},
					{
						"firstName": "Jason",
						"lastName": "Koebler",
						"creatorType": "author"
					}
				],
				"date": "2021-05-27T18:11:39.649Z",
				"abstractNote": "Internal documents, messages, and roadmaps show how crime app Citizen is pushing the boundary of what a private, app-enabled vigilante force may be capable of.",
				"blogTitle": "Vice",
				"language": "en",
				"shortTitle": "'FIND THIS FUCK",
				"url": "https://www.vice.com/en/article/y3dpyw/inside-crime-app-citizen-vigilante",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Andrew Frame"
					},
					{
						"tag": "CYBER"
					},
					{
						"tag": "LAPD"
					},
					{
						"tag": "Los Angeles"
					},
					{
						"tag": "Private Security"
					},
					{
						"tag": "RACISM"
					},
					{
						"tag": "SURVEILLANCE"
					},
					{
						"tag": "Vigilante"
					},
					{
						"tag": "Wild Fire"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
