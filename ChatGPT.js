{
	"translatorID": "d8a83346-164a-467d-8717-eb96d4dcce6f",
	"label": "ChatGPT",
	"creator": "Abe Jellinek",
	"target": "^https://chatgpt\\.com/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-10-27 15:38:43"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2025 Abe Jellinek

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

// Simple translator for ChatGPT that grabs the date and model info
// for private and public chats.

// Please don't take any of the translator authorship advice that ChatGPT
// gives in the test page. It's mostly wrong.


function detectWeb(doc, url) {
	if (url.includes('/c/') || url.includes('/share/')) {
		return 'webpage';
	}
	return false;
}

async function doWeb(doc, url) {
	let item = new Zotero.Item('webpage');
	item.title = doc.title;
	item.websiteTitle = 'ChatGPT';
	item.websiteType = 'Generative AI chat';

	if (url.includes('/share/')) {
		item.url = url;
	}
	
	item.creators.push({
		creatorType: 'author',
		lastName: 'OpenAI',
		fieldMode: 1
	});
	item.attachments.push({
		title: 'Snapshot',
		document: doc
	});

	try {
		await enrichItemWithAPI(doc, url, item);
	}
	catch (e) {
		Zotero.debug(e);
	}

	item.complete();
}

async function enrichItemWithAPI(doc, url, item) {
	let dataScript = [...doc.querySelectorAll('script')]
		.find(script => script.textContent.startsWith('window.__reactRouterContext.streamController.enqueue('))
		.textContent;
	let extract = (key) => {
		let formattedKey = `\\"${key}\\",\\"`;
		let keyIndex = dataScript.indexOf(formattedKey);
		if (keyIndex === -1) return null;
		return dataScript.substring(keyIndex + formattedKey.length).split('\\"')[0];
	};
	
	let language = extract('locale');
	let deviceID = extract('WebAnonymousCookieID');
	let accessToken = extract('accessToken');
	let clientVersion = doc.documentElement.dataset.build;

	let id = url.match(/\/(?:c|share)\/([^#?/]+)/)[1];
	let apiSlug;
	if (url.includes('/c/')) {
		apiSlug = 'conversation/' + id;
	}
	else {
		apiSlug = 'share/' + id;
	}

	let apiURL = '/backend-api/' + apiSlug;
	let headers = {
		'OAI-Language': language,
		'OAI-Device-Id': deviceID,
		'OAI-Client-Version': clientVersion,
	};
	if (accessToken) {
		headers.Authorization = `Bearer ${accessToken}`;
	}
	
	let json = await requestJSON(apiURL, { headers });
	item.title = json.title;
	let date = new Date((json.update_time || json.create_time) * 1000);
	item.date = ZU.strToISO(date.toISOString());
	if (json.model) {
		item.websiteTitle += ` (${json.model.title})`;
	}

	if (url.includes('/c/')) {
		// Private conversation: Add existing share URL if available
		try {
			let { items: shares }
				= await requestJSON('/backend-api/shared_conversations?order=created', { headers });
			let share = shares.find(share => share.conversation_id === id);
			if (share) {
				Zotero.debug('Conversation has been shared as ' + share.id);
				if (new Date(share.update_time) >= date) {
					Zotero.debug('Share is up to date');
					item.url = `https://chatgpt.com/share/${share.id}`;
				}
				else {
					Zotero.debug(`Out of date: ${share.update_time} < ${date}`);
				}
			}
			else {
				Zotero.debug('Not yet shared');
			}
		}
		catch (e) {
			Zotero.debug('Unable to find share');
			Zotero.debug(e);
		}
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://chatgpt.com/share/68fa640b-9fc8-8013-a803-3d5241df6556",
		"items": [
			{
				"itemType": "webpage",
				"title": "Write Zotero translator",
				"creators": [
					{
						"creatorType": "author",
						"lastName": "OpenAI",
						"fieldMode": 1
					}
				],
				"date": "2025-10-24",
				"url": "https://chatgpt.com/share/68fa640b-9fc8-8013-a803-3d5241df6556",
				"websiteTitle": "ChatGPT (GPT-5)",
				"websiteType": "Generative AI chat",
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
