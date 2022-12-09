{
	"translatorID": "98878eeb-84b7-4945-86dd-3d61258ecc1b",
	"label": "Mastodon",
	"creator": "Sebastian Karcher",
	"target": "/@.+/\\d{10}",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 300,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-12-09 02:38:35"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2022 Sebastian Karcher

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
	if (text(doc, '#mastodon div.detailed-status__wrapper')) {
		return 'forumPost';
	}
	return false;
}


async function doWeb(doc, _url) {
	// We're for now purposefully staying away from multiples as mass-scraping
	// is discouraged on many Mastodon instances
	await scrape(doc);
}

async function scrape(doc) {
	var item = new Zotero.Item("forumPost");
	var post = doc.getElementsByClassName("detailed-status__wrapper")[0];
	let title = text(post, '.status__content');

	// cut off titles longer than 140 characters
	if (title.length < 140) {
		item.title = title;
	}
	else {
		item.title = ZU.ellipsize(title, 140, true);
		item.abstractNote = title;
		// we'll keep the full text in the abstract in this case;
	}

	let username = text(post, '.display-name__account');
	let name = text(post, '.display-name__html');
	name = ZU.cleanAuthor(name, "author", false);
	// add the handle to the first name field
	if (name.firstName) {
		name.firstName += " (" + username + ")";
	}
	else { // single field authors
		name.firstName = "(" + username + ")";
	}
	// Z.debug(name);
	item.creators.push(name);
	item.date = ZU.strToISO(text(post, '.detailed-status__datetime'));
	let posturl = attr(post, 'a.detailed-status__datetime', 'href');
	if ((posturl.match(/@/g) || []).length == 2) {
		// We're on a different instance than the poster
		item.url = "https://" + posturl.replace(/\/(@.+?)@([^/]+)(\/.+)/, "$2/$1$3");
	}
	else {
		item.url = "https://" + doc.location.host + posturl;
	}
	item.attachments.push({ document: doc, title: "Snapshot" });
	item.language = attr(post, '.status__content__text', 'lang');
	item.forumTitle = "Mastodon";
	item.type = "Mastodon post";
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://openbiblio.social/@zuphilip/109304791051979061",
		"defer": true,
		"items": [
			{
				"itemType": "forumPost",
				"title": "@adam42smith Ist there a Zotero translator already for the different Mastodon instances?",
				"creators": [
					{
						"firstName": "Philipp (@zuphilip@openbiblio.social)",
						"lastName": "Zumstein",
						"creatorType": "author"
					}
				],
				"date": "2022-11-07",
				"forumTitle": "Mastodon",
				"language": "de",
				"postType": "Mastodon post",
				"url": "https://openbiblio.social/@zuphilip/109304791051979061",
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
		"url": "https://fediscience.org/@adam42smith/109451274536283955",
		"defer": true,
		"items": [
			{
				"itemType": "forumPost",
				"title": "@Lambo Yeah, both Chicago & APA have standard guidance. Citing a Mastodon Post CMOS FN:2. Lambert Heller (@Lambo), “Since The Chicago Manual…",
				"creators": [
					{
						"firstName": "Sebastian (@adam42smith@fediscience.org)",
						"lastName": "Karcher",
						"creatorType": "author"
					}
				],
				"date": "2022-12-03",
				"abstractNote": "@Lambo Yeah, both Chicago & APA have standard guidance. Citing a Mastodon Post CMOS FN:2. Lambert Heller (@Lambo), “Since The Chicago Manual of Style (or similar authorities) are apparently not in the Fediverse yet, who will explain to us how to cite a toot?  Do you have any idea, @adam42smith?,” Mastodon, Dec. 3, 2022, 11:17 a.m., https://scholar.social/@Lambo/109450640339409266",
				"forumTitle": "Mastodon",
				"language": "en",
				"postType": "Mastodon post",
				"shortTitle": "@Lambo Yeah, both Chicago & APA have standard guidance. Citing a Mastodon Post CMOS FN",
				"url": "https://fediscience.org/@adam42smith/109451274536283955",
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
		"url": "https://scholar.social/@Lambo/109450640339409266",
		"defer": true,
		"items": [
			{
				"itemType": "forumPost",
				"title": "Since The Chicago Manual of Style (or similar authorities) are apparently not in the Fediverse yet, who will explain to us how to cite a…",
				"creators": [
					{
						"firstName": "Lambert (@Lambo@scholar.social)",
						"lastName": "Heller",
						"creatorType": "author"
					}
				],
				"date": "2022-12-03",
				"abstractNote": "Since The Chicago Manual of Style (or similar authorities) are apparently not in the Fediverse yet, who will explain to us how to cite a toot?  Do you have any idea, @adam42smith?",
				"forumTitle": "Mastodon",
				"language": "de",
				"postType": "Mastodon post",
				"url": "https://scholar.social/@Lambo/109450640339409266",
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
