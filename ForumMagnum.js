{
	"translatorID": "d9f957ca-6393-48ba-b179-59c384e37a12",
	"label": "ForumMagnum",
	"creator": "Federico Stafforini",
	"target": "^https://(forum\\.effectivealtruism\\.org|www\\.lesswrong\\.com)/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-05-22 19:00:42"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2022 Federico Stafforini

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


const GRAPHQL_URL = '/graphql';

function detectWeb(doc, url) {
	if (getPostId(url) || getCommentId(url)) {
		return 'forumPost';
	}
	else if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.PostsTitle-root a[href*="/posts/"]');
	if (!rows.length) rows = doc.querySelectorAll('.ExpandedPostsSearchHit-title > .ExpandedPostsSearchHit-link[href*="/posts/"]');
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

async function scrape(doc, url = doc.location.href) {
	const commentId = getCommentId(url);
	if (commentId) {
		await scrapeComment(doc, url, commentId);
		return;
	}
	await scrapePost(doc, url);
}

async function scrapePost(doc, url) {
	const post = await fetchPost(getPostId(url));
	const newItem = getBaseItem(url);
	newItem.title = post.title;
	newItem.date = post.postedAt;
	addCreators(newItem, getPostAuthors(post));
	addTags(newItem, post.tags);
	addSnapshot(newItem, doc);
	newItem.complete();
}

async function scrapeComment(doc, url, commentId) {
	const comment = await fetchComment(commentId);
	const newItem = getBaseItem(url);
	newItem.date = comment.postedAt;
	const commentMarkdown = comment.contents ? comment.contents.markdown || '' : '';
	addCreators(newItem, comment.user ? [comment.user] : []);
	newItem.title = getCommentTitle(commentMarkdown, comment.user);
	addSnapshot(newItem, doc);
	newItem.complete();
}

function getBaseItem(url) {
	const item = new Zotero.Item("forumPost");
	item.url = url;
	item.forumTitle = url.startsWith('https://forum.effectivealtruism.org/') ? "Effective Altruism Forum" : "LessWrong";
	return item;
}

function addSnapshot(item, doc) {
	item.attachments.push({
		title: "Snapshot",
		document: doc
	});
}

function getCommentId(url) {
	return new URL(url).searchParams.get('commentId');
}

function getPostId(url) {
	const postId = new URL(url).pathname.match(/\/(?:posts|s)\/([^/]+)/);
	return postId ? postId[1] : null;
}

async function fetchPost(postId) {
	const response = await requestForum({
		query: `query GetPost($postId: String!) {
			post(input: {selector: {_id: $postId}}) {
				result {
					_id
					title
					postedAt
					user { displayName }
					coauthors { displayName }
					tags { name }
				}
			}
		}`,
		variables: { postId }
	});
	if (!response.data || !response.data.post || !response.data.post.result) {
		throw new Error(`No post found for ${postId}`);
	}
	return response.data.post.result;
}

async function fetchComment(commentId) {
	const response = await requestForum({
		query: `query GetComment($commentId: String!) {
			comment(input: {selector: {_id: $commentId}}) {
				result {
					_id
					postedAt
					user { displayName }
					contents { markdown }
				}
			}
		}`,
		variables: { commentId }
	});
	if (!response.data || !response.data.comment || !response.data.comment.result) {
		throw new Error(`No comment found for ${commentId}`);
	}
	return response.data.comment.result;
}

async function requestForum(body) {
	return requestJSON(GRAPHQL_URL, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
}

function getPostAuthors(post) {
	if (post.coauthors && post.coauthors.length) {
		return post.coauthors;
	}
	return post.user ? [post.user] : [];
}

function addCreators(item, users) {
	for (let user of users) {
		if (user.displayName) {
			item.creators.push({
				lastName: user.displayName,
				creatorType: 'author',
				fieldMode: 1
			});
		}
	}
}

function addTags(item, tags) {
	if (!tags) return;
	for (let tag of tags) {
		if (tag.name) {
			item.tags.push(tag.name);
		}
	}
}

function markdownToText(markdown) {
	return ZU.trimInternal(markdown
		.replace(/<[^>]+>/g, ' ')
		.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
		.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
		.replace(/[*_`>#]/g, '')
		.replace(/\s+/g, ' '));
}

function getCommentTitle(commentMarkdown, user) {
	const titleLine = commentMarkdown.split('\n').find(line => line.trim());
	if (titleLine) {
		return ZU.ellipsize(markdownToText(titleLine), 100);
	}
	if (user && user.displayName) {
		return `Comment by ${user.displayName}`;
	}
	return "Untitled comment";
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://forum.effectivealtruism.org/posts/CN4ZY7Jv5fCcBKySr/ai-safety-has-a-very-particular-worldview",
		"items": [
			{
				"itemType": "forumPost",
				"title": "AI Safety Has a Very Particular Worldview",
				"creators": [
					{
						"lastName": "zeshen🔸",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "2025-10-17T19:19:01.739Z",
				"forumTitle": "Effective Altruism Forum",
				"url": "https://forum.effectivealtruism.org/posts/CN4ZY7Jv5fCcBKySr/ai-safety-has-a-very-particular-worldview",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "AI risk skepticism"
					},
					{
						"tag": "AI safety"
					},
					{
						"tag": "Building effective altruism"
					},
					{
						"tag": "Criticism of the effective altruism community"
					},
					{
						"tag": "Draft Amnesty Week (2025)"
					},
					{
						"tag": "Existential risk"
					},
					{
						"tag": "Opinion"
					},
					{
						"tag": "Philosophy"
					},
					{
						"tag": "Philosophy of effective altruism"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://forum.effectivealtruism.org/posts/GF32yiwBK3neT4Bh5/achim-s-shortform?commentId=XApLAdHWCAm7i68d3",
		"items": [
			{
				"itemType": "forumPost",
				"title": "Time-boxing and to-do lists",
				"creators": [
					{
						"lastName": "Achim",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "2022-07-05T13:38:06.610Z",
				"forumTitle": "Effective Altruism Forum",
				"url": "https://forum.effectivealtruism.org/posts/GF32yiwBK3neT4Bh5/achim-s-shortform?commentId=XApLAdHWCAm7i68d3",
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
		"url": "https://forum.effectivealtruism.org/posts/nzX4jfPrimZWpvJw3/?commentId=2A3eXKZKLykE9fxsx",
		"items": [
			{
				"itemType": "forumPost",
				"title": "Linksammlung zum heutigen Workshop",
				"creators": [
					{
						"lastName": "Achim",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "2026-01-11T20:51:17.865Z",
				"forumTitle": "Effective Altruism Forum",
				"url": "https://forum.effectivealtruism.org/posts/nzX4jfPrimZWpvJw3/?commentId=2A3eXKZKLykE9fxsx",
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
		"url": "https://www.lesswrong.com/posts/nR3DkyivzF4ve97oM/how-go-players-disempower-themselves-to-ai",
		"items": [
			{
				"itemType": "forumPost",
				"title": "How Go Players Disempower Themselves to AI",
				"creators": [
					{
						"lastName": "Ashe Vazquez Nuñez",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "2026-05-01T23:24:27.769Z",
				"forumTitle": "LessWrong",
				"url": "https://www.lesswrong.com/posts/nR3DkyivzF4ve97oM/how-go-players-disempower-themselves-to-ai",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "AI"
					},
					{
						"tag": "Gaming (videogames/tabletop)"
					},
					{
						"tag": "MATS Program"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.lesswrong.com/posts/nR3DkyivzF4ve97oM/how-go-players-disempower-themselves-to-ai?commentId=6FiqDnPF5unKX6LQt",
		"items": [
			{
				"itemType": "forumPost",
				"title": "Really good piece, thanks for writing it. History of X posts like this one are unfortunately rare, a…",
				"creators": [
					{
						"lastName": "LawrenceC",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "2026-05-02T07:51:34.362Z",
				"forumTitle": "LessWrong",
				"url": "https://www.lesswrong.com/posts/nR3DkyivzF4ve97oM/how-go-players-disempower-themselves-to-ai?commentId=6FiqDnPF5unKX6LQt",
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
		"url": "https://forum.effectivealtruism.org/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://forum.effectivealtruism.org/search?query=sbf&page=1",
		"defer": true,
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.lesswrong.com/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.lesswrong.com/search?query=2027",
		"defer": true,
		"items": "multiple"
	}
]
/** END TEST CASES **/
