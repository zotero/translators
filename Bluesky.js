{
	"translatorID": "3bba003a-ad42-457e-9ea1-547df39d9d00",
	"label": "Bluesky",
	"creator": "Stephan Hügel",
	"target": "^https://bsky\\.app/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-03-26 14:26:25"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2024 Stephan Hügel <urschrei@gmail.com>

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

let handleRe = /(?:\/profile\/)(([^/]+))/;
let postIdRe = /(?:\/post\/)([a-zA-Z0-9]+)/;

function detectWeb(doc, url) {
	if (url.includes('/post/') && handleRe.test(url) && postIdRe.test(url)) {
		return 'forumPost';
	}
	return false;
}

async function doWeb(doc, url) {
	await scrapeAPI(doc, url);
}

async function scrapeAPI(doc, url) {
	let foundHandle = url.match(handleRe)[1];
	let foundPostId = url.match(postIdRe)[1];

	let apiUrl = `https://public.api.bsky.app/xrpc/app.bsky.feed.getPostThread?uri=at://${foundHandle}/app.bsky.feed.post/${foundPostId}`;
	let data = await ZU.requestJSON(apiUrl);
	if (!(data.thread && data.thread.post)) {
		throw new Error("Couldn't save post due to missing metadata");
	}
	else {
		let post = data.thread.post;
		let item = new Zotero.Item("forumPost");
		// Main post details

		// remove newlines and extra whitespace
		let titleCleaned = post.record.text.replace(/\s+/g, ' ');
		// Ensure that full post text is always available
		item.abstractNote = titleCleaned;
		// Tidy if necessary
		if (titleCleaned.length < 140) {
			item.title = titleCleaned;
		}
		else {
			item.title = ZU.ellipsize(titleCleaned, 140, true);
		}
		item.forumTitle = "Bluesky";
		item.type = "Post";
		item.url = url;
		item.date = post.record.createdAt;
		// Add author information
		if (post.author) {
			if (post.author.displayName !== "") {
				item.creators.push(Zotero.Utilities.cleanAuthor(post.author.displayName, "author"));
			}
			else if (post.author.handle !== "handle.invalid") {
				item.creators.push(Zotero.Utilities.cleanAuthor(post.author.handle, "author"));
			}
			// we've got a blank display name and an invalid handle, so we can't add an author: bail out
			else {
				throw new Error("Couldn't save post due to missing author data: neither display name nor handle are available");
			}
			if (post.author.handle !== "handle.invalid") {
				item.setExtra("Author Handle", post.author.handle);
			}
			// DID is the creator's unique id in the ATProto network
			item.setExtra("DID", post.author.did);
		}
		// Add metadata for likes, reposts, etc.
		item.setExtra("Likes", post.likeCount);
		item.setExtra("Reposts", post.repostCount);
		item.setExtra("Quotes", post.quoteCount);

		// Handle embedded quote records (if any)
		if (post.embed && post.embed.record && post.embed.record.value) {
			let embeddedPost = post.embed.record.value;
			item.notes.push({ note: `This post is quoting a post by @${post.embed.record.author.handle}: "${embeddedPost.text}"` });
		}

		// Handle replies (if any)
		if (data.thread.replies && data.thread.replies.length > 0) {
			item.notes.push({ note: `This post had ${data.thread.replies.length} direct replies when it was saved` });
		}
		item.attachments.push({ document: doc, title: "Snapshot" });
		item.complete();
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://bsky.app/profile/watershedlab.bsky.social/post/3lcl3glmdx226",
		"defer": true,
		"items": [
			{
				"itemType": "forumPost",
				"title": "My first and only job in media was as a reporter on a small newspaper in England in 2002. My salary was £8700. Per year.",
				"creators": [
					{
						"firstName": "Dan",
						"lastName": "Shugar",
						"creatorType": "author"
					}
				],
				"date": "2024-12-05T16:25:35.749Z",
				"abstractNote": "My first and only job in media was as a reporter on a small newspaper in England in 2002. My salary was £8700. Per year.",
				"extra": "Author Handle: watershedlab.bsky.social\nDID: did:plc:ufufhaxc74cfl7fpjccykkyh\nLikes: 8\nReposts: 0\nQuotes: 0",
				"forumTitle": "Bluesky",
				"postType": "Post",
				"url": "https://bsky.app/profile/watershedlab.bsky.social/post/3lcl3glmdx226",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "This post is quoting a post by @ericwickham.ca: \"Told the guy replacing my car window how much I made at my first job in radio and I feel like it deeply changed what he thought about people in media.\""
					},
					{
						"note": "This post had 1 direct replies when it was saved"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://bsky.app/profile/did:plc:cxq4zxu7soi67juyvxml46zs/post/3ldr6ebdz5c24",
		"defer": true,
		"items": [
			{
				"itemType": "forumPost",
				"title": "💚 Site of the Day - Rain Delay Media Love that menu! ⚙️ SplitText 🛠️ Webflow site → raindelaymedia.com showcase → gsap.com/showcase",
				"creators": [
					{
						"firstName": "",
						"lastName": "GSAP",
						"creatorType": "author"
					}
				],
				"date": "2024-12-20T19:59:08.958Z",
				"abstractNote": "💚 Site of the Day - Rain Delay Media Love that menu! ⚙️ SplitText 🛠️ Webflow site → raindelaymedia.com showcase → gsap.com/showcase",
				"extra": "Author Handle: gsap-greensock.bsky.social\nDID: did:plc:cxq4zxu7soi67juyvxml46zs\nLikes: 6\nReposts: 0\nQuotes: 0",
				"forumTitle": "Bluesky",
				"postType": "Post",
				"url": "https://bsky.app/profile/did:plc:cxq4zxu7soi67juyvxml46zs/post/3ldr6ebdz5c24",
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
