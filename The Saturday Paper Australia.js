{
	"translatorID": "051797f9-02fa-4ca4-bd33-ddfa68114aed",
	"label": "The Saturday Paper Australia",
	"creator": "Justin Warren",
	"target": "https?://(www\\.)?thesaturdaypaper\\.com\\.au/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-08-05 02:13:38"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2023 Justin Warren

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
	var articlePageTitle = doc.querySelector('div.content > div > div.article-page > div.article-page__header > h1')
	if (articlePageTitle) {
		return 'newspaperArticle';
	}

	else if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('div.article');
	for (let row of rows) {
		// TODO: check and maybe adjust
		let href = row.href;
		// TODO: check and maybe adjust
		let title = ZU.trimInternal(row.textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == 'multiple') {
		let items = Zotero.selectItems(getSearchResults(doc, false));
		if (!items) return;
		for (let url of Object.keys(items)) {
			scrape(requestDocument(url));
		}
	}
	else if (detectWeb(doc, url)) {
		scrape(doc, url);
	}
}

function scrape(doc, url = doc.location.href) {
	let item = new Zotero.Item('newspaperArticle');
	item.publicationTitle = "The Saturday Paper";
	item.title = attr(doc, 'meta[name="dcterms.title"]', 'content');
	item.date = ZU.strToISO(attr(doc, 'meta[name="dcterms.date"]', 'content'));
	item.abstractNote = attr(doc, 'meta[name="dcterms.description"]', 'content');
	item.creators.push(ZU.cleanAuthor(attr(doc, 'meta[name="dcterms.creator"]', 'content'),"author"));
	item.language = "en-AU";
	item.url = url;
	// The section name is the first part of the path after the FQDN in the url
	let pattern = /https?:\/\/(www\.)?thesaturdaypaper.com.au\/(\w+)/;
	var m = url.match(pattern);
	if (m) {
		item.section = ZU.capitalizeTitle(m[2], true);
	}
	let editionRaw = doc.querySelector('p.issue-nav__current').textContent;
	var em = editionRaw.match(/.*No\.\s(\d+)/);
	if (em) {
		item.edition = em[1];
	}
	item.attachments.push({
		title: "Snapshot",
		document: doc
	});
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.thesaturdaypaper.com.au/comment/topic/2023/08/05/morrisons-strong-welfare-cop-out",
		"detectedItemType": "newspaperArticle",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Morrison’s strong welfare cop-out",
				"creators": [
					{
						"firstName": "Paul",
						"lastName": "Bongiorno",
						"creatorType": "author"
					}
				],
				"date": "2023-08-05",
				"abstractNote": "For a while, late on Monday afternoon in the house of representatives, you could be forgiven for thinking the Peter Dutton-led opposition had finally cast itself adrift from Scott Morrison. As the former prime minister rose, on indulgence from the speaker, to give his first public response to the excoriating findings of the Royal Commission into the Robodebt Scheme, you could hear a pin drop. Not because what Morrison was saying was riveting, but because the chamber was almost completely deserted.",
				"edition": "461",
				"language": "en-AU",
				"libraryCatalog": "The Saturday Paper Australia",
				"publicationTitle": "The Saturday Paper",
				"section": "Comment",
				"url": "https://www.thesaturdaypaper.com.au/comment/topic/2023/08/05/morrisons-strong-welfare-cop-out",
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
		"url": "https://www.thesaturdaypaper.com.au/life/environment/2023/07/01/underwater-sculptures-preserving-the-great-barrier-reef",
		"detectedItemType": "newspaperArticle",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Underwater sculptures preserving the Great Barrier Reef",
				"creators": [
					{
						"firstName": "Mark",
						"lastName": "Dapin",
						"creatorType": "author"
					}
				],
				"date": "2023-07-01",
				"abstractNote": "On the day he and I do not take a catamaran to Queensland’s Museum of Underwater Art (MOUA), sculptor Jason deCaires Taylor is sipping a cold beer at a table in the Longboard Bar and Grill overlooking the Coral Sea. It’s a warm afternoon in Townsville, but the wind is too strong for our planned sail out to the reef to view his newly installed Ocean Sentinels – eight hybrid human and marine sculptures fixed on the seabed at a depth of four to six metres.",
				"edition": "456",
				"language": "en-AU",
				"libraryCatalog": "The Saturday Paper Australia",
				"publicationTitle": "The Saturday Paper",
				"section": "Life",
				"url": "https://www.thesaturdaypaper.com.au/life/environment/2023/07/01/underwater-sculptures-preserving-the-great-barrier-reef",
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
		"url": "https://www.thesaturdaypaper.com.au/culture/the-influence/2023/08/03/laura-woollett",
		"detectedItemType": "newspaperArticle",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Laura Woollett",
				"creators": [
					{
						"firstName": "Neha",
						"lastName": "Kale",
						"creatorType": "author"
					}
				],
				"date": "2023-08-05",
				"abstractNote": "Laura Elizabeth Woollett is known for the short story collection The Love of a Bad Man and the novels The Newcomer and Beautiful Revolutionary. The latter, a gripping work inspired by Jim Jones’s Peoples Temple, was shortlisted for the 2019 Prime Minister’s Literary Award for Fiction and the Australian Literature Society Gold Medal.",
				"edition": "461",
				"language": "en-AU",
				"libraryCatalog": "The Saturday Paper Australia",
				"publicationTitle": "The Saturday Paper",
				"section": "Culture",
				"url": "https://www.thesaturdaypaper.com.au/culture/the-influence/2023/08/03/laura-woollett",
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
		"url": "https://www.thesaturdaypaper.com.au/news/education/2023/08/05/exclusive-unsw-referred-icac",
		"detectedItemType": "newspaperArticle",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Exclusive: UNSW referred to ICAC",
				"creators": [
					{
						"firstName": "Rick",
						"lastName": "Morton",
						"creatorType": "author"
					}
				],
				"date": "2023-08-05",
				"abstractNote": "The manner in which Professor Attila Brungs was appointed to his $1 million-a-year role as vice-chancellor at UNSW Sydney, and the alleged retaliation against executives who raised concerns about the process, has been referred to the New South Wales Independent Commission Against Corruption by the state’s outgoing Tertiary Education minister.",
				"edition": "461",
				"language": "en-AU",
				"libraryCatalog": "The Saturday Paper Australia",
				"publicationTitle": "The Saturday Paper",
				"section": "News",
				"shortTitle": "Exclusive",
				"url": "https://www.thesaturdaypaper.com.au/news/education/2023/08/05/exclusive-unsw-referred-icac",
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
		"url": "https://www.thesaturdaypaper.com.au/sport/soccer/2023/06/17/emily-van-egmonds-high-hopes-the-world-cup#hrd",
		"detectedItemType": "newspaperArticle",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Emily van Egmond’s high hopes for the World Cup",
				"creators": [
					{
						"firstName": "Sarah",
						"lastName": "Krasnostein",
						"creatorType": "author"
					}
				],
				"date": "2023-06-17",
				"abstractNote": "Matildas centurion Emily van Egmond speaks as rapidly and decisively as she responds on the pitch. It’s 7.30am in wintry Melbourne but 2.30pm in sunny San Diego, where the 29-year-old midfielder – who’s played her club soccer with San Diego Wave since January last year – chats via Zoom before heading home for the FIFA Women’s World Cup, which begins on July 20.",
				"edition": "454",
				"language": "en-AU",
				"libraryCatalog": "The Saturday Paper Australia",
				"publicationTitle": "The Saturday Paper",
				"section": "Sport",
				"url": "https://www.thesaturdaypaper.com.au/sport/soccer/2023/06/17/emily-van-egmonds-high-hopes-the-world-cup#hrd",
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
