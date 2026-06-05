{
	"translatorID": "d3b1d34c-f8a1-43bb-9dd6-27aa6403b217",
	"label": "YouTube",
	"creator": "Sean Takats, Michael Berkowitz, Matt Burton, Rintze Zelle, and Geoff Banh",
	"target": "^https?://([^/]+\\.)?youtube\\.com/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-06-05 16:09:20"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2015-2024 Sean Takats, Michael Berkowitz, Matt Burton, Rintze Zelle, and Geoff Banh

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
	if (/\/watch\?(?:.*)\bv=[0-9a-zA-Z_-]+/.test(url)) {
		return "videoRecording";
	}
	// Search results
	/* Testurls:
	http://www.youtube.com/user/Zoteron
	http://www.youtube.com/playlist?list=PL793CABDF042A9514
	http://www.youtube.com/results?search_query=zotero&oq=zotero&aq=f&aqi=g4&aql=&gs_sm=3&gs_upl=60204l61268l0l61445l6l5l0l0l0l0l247l617l1.2.1l4l0
	*/
	/* currently not working 2020-11-11
	if ((url.includes("/results?") || url.includes("/playlist?") || url.includes("/user/"))
			&& getSearchResults(doc, true)) {
		return "multiple";
	} */
	return false;
}

function getSearchResults(doc, checkOnly) {
	var links = doc.querySelectorAll('a.ytd-video-renderer, a.ytd-playlist-video-renderer');
	var items = {},
		found = false;
	for (var i = 0, n = links.length; i < n; i++) {
		var title = ZU.trimInternal(links[i].textContent);
		var link = links[i].href;
		if (!title || !link) continue;

		if (checkOnly) return true;

		found = true;
		items[link] = title;
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

function getMetaContent(doc, attrName, value) {
	return attr(doc, 'meta[' + attrName + '="' + value + '"]', 'content');
}

function videoIdFromURL(url) {
	var m = url.match(/[?&]v=([0-9a-zA-Z_-]+)/);
	return m ? m[1] : null;
}

// Build the canonical watch URL from the video ID so URLs with the v=
// parameter in any position (e.g. ?list=...&v=ID) normalise the same way.
function canonicalWatchURL(url) {
	var videoId = videoIdFromURL(url);
	return videoId ? 'https://www.youtube.com/watch?v=' + videoId : url;
}

// Depth-first walk over a parsed JSON tree. `visit` returns true to stop;
// walkJson then unwinds and returns true. JSON.parse already guarantees the
// tree is acyclic and bounded, so no depth cap is needed.
function walkJson(node, visit) {
	if (!node || typeof node !== 'object') return false;
	if (visit(node)) return true;
	if (Array.isArray(node)) {
		for (var item of node) if (walkJson(item, visit)) return true;
	}
	else {
		for (var key of Object.keys(node)) if (walkJson(node[key], visit)) return true;
	}
	return false;
}

// The videoId the ytInitialData payload describes. Read directly from the
// root `currentVideoEndpoint` rather than walking the tree: that key also
// appears under recommendation tiles and overlay menus, so a DFS would
// match whichever one comes first in object-key order.
function dataVideoId(data) {
	return (data
		&& data.currentVideoEndpoint
		&& data.currentVideoEndpoint.watchEndpoint
		&& data.currentVideoEndpoint.watchEndpoint.videoId) || null;
}

// Channel names for the watched video (uploader first, then collaborators).
// Scoped to videoSecondaryInfoRenderer because sidebar recommendations live
// under videoCardRenderer, which has an identically-shaped owner.
//
// Collaborator names live in a dialogViewModel whose customContent.
// listViewModel holds one listItem per channel. Each listItem also carries
// a trailingButtons subtree with a nested subscribe-options sheet ("All",
// "Personalised", "None", "Unsubscribe"), so we iterate listItems directly
// rather than walking the dialog subtree — otherwise the menu options get
// scraped as collaborators.
//
// Returns [] for single-owner pages (no dialog) and for pages whose
// ytInitialData lacks the expected anchor entirely.
function channelNamesFromData(data) {
	var vor = null;
	walkJson(data, function (node) {
		if (node.videoSecondaryInfoRenderer) {
			vor = node.videoSecondaryInfoRenderer.owner
				&& node.videoSecondaryInfoRenderer.owner.videoOwnerRenderer;
			return true;
		}
		return false;
	});
	if (!vor) {
		Zotero.debug('YouTube: no videoSecondaryInfoRenderer.owner.videoOwnerRenderer');
		return [];
	}

	var names = [];
	walkJson(vor, function (node) {
		var items = node.dialogViewModel
			&& node.dialogViewModel.customContent
			&& node.dialogViewModel.customContent.listViewModel
			&& node.dialogViewModel.customContent.listViewModel.listItems;
		if (!Array.isArray(items)) return false;
		for (var item of items) {
			var name = item.listItemViewModel
				&& item.listItemViewModel.title
				&& item.listItemViewModel.title.content;
			if (name) names.push(name);
		}
		return true;
	});
	return names;
}

// Parse `var ytInitialData = {...}` out of a script blob. Returns null on
// any failure (missing marker, unbalanced braces, JSON parse error) and
// logs the cause, so the caller can treat ytInitialData as a single signal.
function extractYtInitialData(raw) {
	if (!raw) return null;
	var marker = raw.indexOf('var ytInitialData = {');
	if (marker === -1) return null;
	var start = raw.indexOf('{', marker);

	// The script appends statements after the object literal, so JSON.parse
	// can't be fed the whole blob. Walk to the matching closing brace, tracking
	// string boundaries so { or } inside string values don't miscount depth.
	var depth = 0, end = start, inString = false;
	while (end < raw.length) {
		var ch = raw[end];
		if (inString) {
			if (ch === '\\') end++;
			else if (ch === '"') inString = false;
		}
		else if (ch === '"') inString = true;
		else if (ch === '{') depth++;
		else if (ch === '}') {
			if (--depth === 0) break;
		}
		end++;
	}
	if (depth !== 0) {
		Zotero.debug('YouTube: ytInitialData braces unbalanced');
		return null;
	}
	try {
		return JSON.parse(raw.substring(start, end + 1));
	}
	catch (e) {
		Zotero.debug('YouTube: ytInitialData parse failed: ' + e);
		return null;
	}
}

// Returns null if no usable ytInitialData is present in this doc
// (script absent or all candidates failed to parse) — refetching the
// same URL won't help, so the caller should fall straight back to DOM.
// Returns { stale: true } when a ytInitialData was found but describes
// a different video; refetching the canonical URL may yield fresh data.
// Returns { names: string[] } when fresh data parsed cleanly (names may
// be empty for single-owner videos).
function namesFromDoc(doc, expectedVideoId) {
	for (var script of doc.querySelectorAll('script:not([src])')) {
		var raw = script.textContent;
		var data = extractYtInitialData(raw);
		if (!data) continue;
		if (dataVideoId(data) !== expectedVideoId) {
			Zotero.debug('YouTube: ytInitialData describes a different video (SPA stale)');
			return { stale: true };
		}
		return { names: channelNamesFromData(data) };
	}
	return null;
}

async function extractCreatorNames(doc, url) {
	var videoId = videoIdFromURL(url);
	if (!videoId) return [];

	var result = namesFromDoc(doc, videoId);
	if (!result) return [];
	if (!result.stale) return result.names;

	try {
		var fresh = await requestDocument(canonicalWatchURL(url));
		var refetched = namesFromDoc(fresh, videoId);
		if (refetched && !refetched.stale) return refetched.names;
		Zotero.debug('YouTube: refetch did not yield matching ytInitialData');
		return [];
	}
	catch (e) {
		Zotero.debug('YouTube: refetch for ytInitialData failed: ' + e);
		return [];
	}
}

async function scrape(doc, url = doc.location.href) {
	var item = new Zotero.Item("videoRecording");
	if (!Zotero.isServer) {
		let jsonLD;
		try {
			jsonLD = JSON.parse(text(doc, 'script[type="application/ld+json"]'));
		}
		catch (e) {
			jsonLD = {};
		}

		/* YouTube won't update the meta tags for the user,
		 * if they open e.g. a suggested video in the same tab.
		 * Thus we scrape them from screen instead.
		 */

		item.title = text(doc, '#info-contents h1.title') // Desktop
			|| text(doc, '#title')
			|| text(doc, '.slim-video-information-title'); // Mobile
		item.url = canonicalWatchURL(url);
		item.runningTime = text(doc, '#movie_player .ytp-time-duration') // Desktop
			|| text(doc, '.ytm-time-display .time-second'); // Mobile after unmute
		if (!item.runningTime && jsonLD.duration) { // Mobile before unmute
			let duration = parseInt(jsonLD.duration.substring(2));
			let hours = String(Math.floor(duration / 3600)).padStart(2, '0');
			let minutes = String(Math.floor(duration % 3600 / 60)).padStart(2, '0');
			let seconds = String(duration % 60).padStart(2, '0');
			if (duration >= 3600) { // Include hours
				item.runningTime = `${hours}:${minutes}:${seconds}`;
			}
			else { // Just include minutes and seconds
				item.runningTime = `${minutes}:${seconds}`;
			}
		}

		item.date = ZU.strToISO(
			text(doc, '#info-strings yt-formatted-string') // Desktop
			|| attr(doc, 'ytm-factoid-renderer:last-child > div', 'aria-label') // Mobile if description has been opened
		) || jsonLD.uploadDate; // Mobile on initial page load

		var creatorNames = await extractCreatorNames(doc, url);
		if (creatorNames.length) {
			for (var name of creatorNames) {
				item.creators.push({ lastName: name, creatorType: "author", fieldMode: 1 });
			}
		}
		else {
			var author = text(doc, '#meta-contents #text-container .ytd-channel-name') // Desktop
				|| text(doc, '#upload-info #text-container .ytd-channel-name')
				|| text(doc, '.slim-owner-channel-name'); // Mobile
			if (author) {
				item.creators.push({
					lastName: author,
					creatorType: "author",
					fieldMode: 1
				});
			}
		}
		var description = text(doc, '#description .content')
			|| text(doc, '#description')
			|| text(doc, 'ytm-expandable-video-description-body-renderer .collapsed-string-container')
			|| text(doc, '#snippet span');
		if (description) {
			item.abstractNote = description;
		}
	}
	else {
		// required for translator server, which doesn't load the page's JS
		item.title = getMetaContent(doc, 'name', 'title');
		item.url = getMetaContent(doc, 'property', 'og:url');
		let isoDuration = getMetaContent(doc, 'itemprop', 'duration');
		// Convert ISO 8601 duration to HH:MM:SS
		item.runningTime = isoDuration.replace(/^PT/, '').replace(/H/, ':').replace(/M/, ':')
.replace(/S/, '');
		item.date = ZU.strToISO(getMetaContent(doc, 'itemprop', 'uploadDate'));
		let author = attr(doc, 'link[itemprop="name"]', 'content');
		if (author) {
			item.creators.push({
				lastName: author,
				creatorType: "author",
				fieldMode: 1
			});
		}
		let description = getMetaContent(doc, 'name', 'description');
		if (description) {
			item.abstractNote = description;
		}
	}

	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.youtube.com/watch?v=pq94aBrc0pY",
		"defer": true,
		"items": [
			{
				"itemType": "videoRecording",
				"title": "Zotero Intro",
				"creators": [
					{
						"lastName": "Zoteron",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "2007-01-01",
				"abstractNote": "Zotero is a free, easy-to-use research tool that helps you gather and organize resources (whether bibliography or the full text of articles), and then lets you to annotate, organize, and share the results of your research. It includes the best parts of older reference manager software (like EndNote)—the ability to store full reference information in author, title, and publication fields and to export that as formatted references—and the best parts of modern software such as del.icio.us or iTunes, like the ability to sort, tag, and search in advanced ways. Using its unique ability to sense when you are viewing a book, article, or other resource on the web, Zotero will—on many major research sites—find and automatically save the full reference information for you in the correct fields.",
				"libraryCatalog": "YouTube",
				"runningTime": "02:53",
				"url": "https://www.youtube.com/watch?v=pq94aBrc0pY",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.youtube.com/watch?v=73Do0OScoOU",
		"defer": true,
		"items": [
			{
				"itemType": "videoRecording",
				"title": "The First Entity Component System - An Interview with Marc LeBlanc",
				"creators": [
					{
						"lastName": "Molly Rocket",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"lastName": "Marc \"MAHK\" LeBlanc",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "2026-06-01",
				"abstractNote": "An interview with Marc LeBlanc on the pioneering entity system work done at Looking Glass for Thief: The Dark Project.\n\nAccompanying article: https://computerenhance.com\nMahk's YouTube:    / @algorithmancytube  \nMahk's Twitch:   / videos  \nMahk's game design website: https://8kindsoffun.com",
				"libraryCatalog": "YouTube",
				"runningTime": "2:32:34",
				"url": "https://www.youtube.com/watch?v=73Do0OScoOU",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
