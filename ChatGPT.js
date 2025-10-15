{
	"translatorID": "9f90035c-d941-45d3-8f64-599bb7323ad8",
	"label": "ChatGPT",
	"creator": "Jacob J. Walker",
	"target": "^https?://(?:chatgpt\\.com|chat\\.openai\\.com)/(?:c/|share/|g/[^/]+/(?:c/|project(?=($|[/?#]))))",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-10-15 19:39:38"
}

/*
  ***** BEGIN LICENSE BLOCK *****

  Copyright © 2025 Jacob J. Walker

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

/* Description
 **************
 *
 * The ChatGPT Translator can get a private conversation (standard), shared conversation, or conversations from a project. 
 * As there is no specic "AI" source, instantMessages seemed to be the closest, but ChatGPT is set as the first "author" (Although, hesitantly, but this is done for transparency)
 *
 * For a private conversation, the translator attempts to use the internal API so data is cleanest, and some data such as date is only available via API
 * Since a private conversation that is cited cannot be accessed, if the private conversation has had a public share created, it will put this URL in, and its date
 *
 * Shared conversations that have not yet been used by a new user have a share URL, but do not have API access to it and limited DOM information, so only a little metadata is filled in
 *
 * Projects allow for multiple grabbing of conversations, utilizing the individual grabs for most of the code.
 *
 * Please note, much of this was vibe coded by OpenAi's Codex, so there is likely a lot of bloat that can be removed.  
 * I did several refactors to try and reduce Codex's bad habit of overengineering stuff, but I have run out of time to complete this, and in my tests it works well.
 *
 *
 * Only a single automated test is included, as most testing is on private conversations.  
 * But to try and at least provide some info on my private testing, in the test share conversation, I included a log of getting that conversation when it was private.
 *
 */


/* AI Chat Translator Pattern *
 ******************************
 *
 * The pattern for retrieving AI chats goes generally as follows:
 *
 * First is determined the source of the chats(s)
 *  - A private conversation ('private')
 *  - A shared conversation ('shared')
 *  - A project ('project')
 *
 * Depending on the source, the following will occur
 *
 * Private Conversation
 * --------------------
 * 1. While getting the initial API info for the chat, get the user info
 * 2. Get from the internal API endpoint for the conversation
 * 3. As a fallback, Get from the DOM for the conversation
 * 4. Get the shared version of the conversation if it exists from the Shared Conversation List
 * 5. Get the Snapshot from the private conversation
 *
 * Shared Conversation
 * -------------------
 * 1. Get from the DOM as much information as can be found.
 * 2. Attach a snapshot that points at the shared conversation URL
 *
 * Project of Conversations
 * ------------------------
 * 1. Scan the project dashboard DOM to build the selectable conversation list
 * 2. Resolve project and conversation identifiers for the selected entry
 * 3. Fetch each conversation via the private API pathway (same as a private save)
 * 4. Enrich with share metadata when available and note the project URL in the item
 *
 */

/* Changelog
 *
 * - v1.0.0-rc: ChatGPT translator for Zotero.
 *              - Private conversations are snapshoted, but the URL and Date will come from a share if it is available
 *              - Public Shared URLs only can get the metadata presented, which currently is not the date
 *              - Projects can have mutliple private conversationns saved, but by Zotero's limitation, they can't be snapshoted
 */

/////////////////////////////
//#region Global Constants //
/////////////////////////////

const VERSION = 'v0.9.42-alpha';

const DEFAULT_ITEM_OBJECT = {
	itemType: 'instantMessage',
	title: 'ChatGPT Conversation',
	date: '',
	url: '',
	abstractNote: '',
	language: '',
	shortTitle: '',
	archive: '',
	archiveLocation: '',
	libraryCatalog: '',
	callNumber: '',
	accessDate: '',
	rights: '',
	extra: '',
	volume: '',
	issue: '',
	pages: '',
	publicationTitle: '',
	aiModel: null,
	creators: [
		{
			creatorType: 'author',
			lastName: 'ChatGPT',
			fieldMode: 1
		},
		{
			creatorType: 'author',
			lastName: 'User',
			fieldMode: 1
		}
	],
	attachments: [
		{
			title: 'ChatGPT Conversation Snapshot',
			url: '',
			snapshot: true,
			mimeType: 'application/xhtml+xml'
		}
	]
};


// Timeouts
const ZOTERO_FETCH_DEFAULT_TIMEOUT_MS = 7000;
const SHARE_LIST_TIMEOUT_MS = 3500;

// RegEx Patterns
const CONVERSATION_URL_REGEX = /https?:\/\/(?:chatgpt\.com|chat\.openai\.com)\/(?:c\/|g\/[^/]+\/c\/)/i;
const SHARED_URL_REGEX = /https?:\/\/(?:chatgpt\.com|chat\.openai\.com)\/share\/(?:[a-z]+\/)?([0-9a-f-]{36})(?=($|[/?#]))/i;
const PROJECT_URL_REGEX = /https?:\/\/(?:chatgpt\.com|chat\.openai\.com)\/g\/[^/]+\/project(?=($|[/?#]))/i;
const PROJECT_CONVERSATION_PATH_REGEX = /^\/?g\/([^/]+)\/c\/([0-9a-f-]{36})(?=($|[/?#]))/i;

// Logging Levels
const ENABLE_VERBOSE_API_LOGGING = false;
const ENABLE_VERBOSE_DOM_LOGGING = false;
const LOG_LEVEL_ERROR = 1;
const LOG_LEVEL_DEBUG = 4;

const CHATGPT_API_AUTH_CACHE = new WeakMap();

//#endregion


//////////////////////////////////////
//#region Standard Zotero Functions //
//////////////////////////////////////

/**
 * @description Identifies the Zotero item type represented by the current page.
 * @param {Document} doc - The page DOM.
 * @param {string} url - The URL of the current page.
 * @returns {false | 'multiple' | string} Zotero item type, 'multiple', or false when unsupported.
 */
function detectWeb(doc, url) {
	const start = Date.now();
	let result = false;
	let pageURL = null;
	const itemType = DEFAULT_ITEM_OBJECT.itemType;
	try {
		pageURL = typeof url === 'string'
			? url
			: (doc && doc.location && typeof doc.location.href === 'string' ? doc.location.href : null);

		if (!result && typeof pageURL === 'string'
		&& CONVERSATION_URL_REGEX.test(pageURL)) {
			result = itemType;
		}

		if (!result && typeof pageURL === 'string'
		&& SHARED_URL_REGEX.test(pageURL)) {
			result = itemType;
		}

		if (!result && typeof pageURL === 'string'
		&& PROJECT_URL_REGEX.test(pageURL)) {
			result = 'multiple';
		}
		return result;
	}
	finally {
		const elapsed = Date.now() - start;
		const mode = result || '∅';
		Zotero.debug(`[flow:new][detectWeb] done type=${result || '∅'} matched=${result ? 'true' : 'false'} mode=${mode} ms=${elapsed}`, LOG_LEVEL_DEBUG);
	}
}


/**
 * @description Orchestrates saving based on the result of detectWeb, handling single and multiple items.
 * @param {Document} doc - The page DOM.
 * @param {string} url - The URL of the current page.
 * @returns {void}
 */
async function doWeb(doc, url) {
	const start = Date.now();
	const detected = detectWeb(doc, url);
	const logURL = typeof url === 'string'
		? url
		: (doc && doc.location && typeof doc.location.href === 'string' ? doc.location.href : '∅');
	Zotero.debug(`doWeb start version=${VERSION || '∅'} mode=${detected || 'single'} url=${logURL}`, LOG_LEVEL_DEBUG);

	let ids = {
		projectID: null,
		conversationID: null,
		lastPromptID: null,
		lastResponseID: null,
		shareID: null
	};

	try {
		if (detected !== 'multiple') {
			const resolvedURL = url
					|| (doc && doc.location && typeof doc.location.href === 'string'
						? doc.location.href
						: null);
			let singleSource = 'private';
			if (typeof resolvedURL === 'string' && resolvedURL) {
				if (CONVERSATION_URL_REGEX.test(resolvedURL)) {
					singleSource = 'private';
				}
				else if (SHARED_URL_REGEX.test(resolvedURL)) {
					singleSource = 'share';
				}
			}
			if (singleSource === 'private') {
				ids = getPrivateConversationIDs(doc, resolvedURL, ids);
			}
			else if (singleSource === 'share') {
				ids = getSharedConversationIDs(doc, resolvedURL, ids);
			}
			await getItem(doc, ids, singleSource);
		}
		else {
			const selectionMap = getSearchResults(doc, false);
			const choicesMap = selectionMap && typeof selectionMap === 'object' ? selectionMap : null;
			if (!choicesMap || !Object.keys(choicesMap).length) {
				Zotero.debug('[flow:new][doWeb] no project choices available after scan', LOG_LEVEL_DEBUG);
				return;
			}
			const projectEntries = domGetProjectConversationList(doc);
			const choices = await new Promise((resolve) => {
				Zotero.selectItems(choicesMap, resolve);
			});
			if (!choices) {
				return;
			}

			for (const selectionKey of Object.keys(choices)) {
				try {
					ids.projectID = null;
					ids.conversationID = null;
					ids.lastPromptID = null;
					ids.lastResponseID = null;
					ids.shareID = null;
					const entry = (() => {
						if (!Array.isArray(projectEntries) || !projectEntries.length) {
							return null;
						}
						const direct = projectEntries.find(candidate => candidate && candidate.absoluteURL === selectionKey);
						if (direct) {
							return direct;
						}
						return projectEntries.find(candidate => candidate
						&& candidate.conversationID
						&& typeof selectionKey === 'string'
						&& selectionKey.toLowerCase().includes(candidate.conversationID));
					})();
					if (entry) {
						if (entry.projectID) {
							ids.projectID = entry.projectID;
						}
						if (entry.conversationID) {
							ids.conversationID = entry.conversationID;
						}
					}
					else {
						getProjectConversationIDs(doc, selectionKey, ids);
					}
					await getItem(doc, ids, 'project');
				}
				catch (err) {
					Zotero.debug(`[chatgpt:error][doWeb] project item failed url="${(selectionKey || '∅').replace(/"/g, '\\"')}" msg="${err && err.message ? err.message : err}"`, LOG_LEVEL_ERROR);
				}
			}
		}
	}
	finally {
		const elapsed = Date.now() - start;
		const mode = detected === 'multiple' ? 'multiple' : 'single';
		Zotero.debug(`[flow:new][doWeb] done mode=${mode} url=${logURL || '∅'} ms=${elapsed}`, LOG_LEVEL_DEBUG);
	}
}


/**
 * @description Collects candidate items on project dashboards so the user can pick which to save.
 * @param {Document} doc - The page DOM.
 * @param {boolean} checkOnly - When true, stop after confirming at least one result exists.
 * @returns {boolean | Object<string, string>} False when no results, true during checkOnly, or a map of URLs to labels.
 */
function getSearchResults(doc, checkOnly) {
	if (!doc || typeof doc.querySelectorAll !== 'function') {
		return false;
	}

	const conversations = domGetProjectConversationList(doc);
	if (!conversations || !conversations.length) {
		return false;
	}

	if (checkOnly) {
		return true;
	}

	const items = {};
	for (const conversation of conversations) {
		if (!conversation || !conversation.absoluteURL || !conversation.label) {
			continue;
		}
		items[conversation.absoluteURL] = conversation.label;
	}

	return Object.keys(items).length ? items : false;
}

//#endregion


/////////////////////////
//#region Initial Gets //
///////////////////////////

/**
 * @description Collects the primary identifiers for a private conversation from the DOM.
 * @param {Document} doc - The page DOM.
 * @param {string} url - The URL of the current page.
 * @param {{ conversationID?: string|null, lastPromptID?: string|null, lastResponseID?: string|null }} [ids] - Existing bundle to populate.
 * @returns {{ conversationID: string|null, lastPromptID: string|null, lastResponseID: string|null }}
 */
function getPrivateConversationIDs(doc, url, ids) {
	const start = Date.now();
	const result = ids && typeof ids === 'object'
		? ids
		: {
			conversationID: null,
			lastPromptID: null,
			lastResponseID: null
		};

	result.conversationID = null;
	result.lastPromptID = null;
	result.lastResponseID = null;

	const extractConversationID = (value) => {
		if (!value || typeof value !== 'string') {
			return null;
		}
		const match = value.match(/\/(?:app\/)?c\/([0-9a-f-]{36})(?=($|[/?#]))/i)
				|| value.match(/\/conversation\/([0-9a-f-]{36})(?=($|[/?#]))/i);
		return match && match[1] ? cleanConversationID(match[1]) : null;
	};

	const candidateSources = [];
	if (typeof url === 'string') {
		candidateSources.push(url);
	}
	if (doc && doc.location && typeof doc.location.href === 'string') {
		candidateSources.push(doc.location.href);
	}

	for (const candidate of candidateSources) {
		const normalized = extractConversationID(candidate);
		if (normalized) {
			result.conversationID = normalized;
			break;
		}
	}

	if (!result.conversationID && doc && typeof doc.querySelector === 'function') {
		const selectors = [
			'[data-conversation-id]',
			'[data-conversationid]',
			'[data-conversation]',
			'meta[name="conversation-id"]',
			'meta[name="conversationId"]',
			'meta[property="conversation-id"]',
			'meta[property="conversationId"]'
		];
		for (const selector of selectors) {
			const node = doc.querySelector(selector);
			if (!node) continue;
			const raw = node.getAttribute('data-conversation-id')
		|| node.getAttribute('data-conversationid')
		|| node.getAttribute('data-conversation')
		|| node.getAttribute('content')
		|| node.getAttribute('value');
			const normalized = extractConversationID(raw);
			if (normalized) {
				result.conversationID = normalized;
				break;
			}
		}
	}

	const elapsed = Date.now() - start;
	Zotero.debug(`[ids][getPrivateConversationIDs] done cid=${result.conversationID || '∅'} lastPromptID=${result.lastPromptID || '∅'} lastResponseID=${result.lastResponseID || '∅'} ms=${elapsed}`, LOG_LEVEL_DEBUG);
	return result;
}


/**
 * @description Extracts the share identifier from a shared conversation context.
 * @param {Document} doc - The page DOM.
 * @param {string} url - The URL of the current page.
 * @param {{ shareID?: string|null, shareURL?: string|null }} [ids] - Existing bundle to populate.
 * @returns {{ shareID: string|null, shareURL: string|null }}
 */
function getSharedConversationIDs(doc, url, ids) {
	const start = Date.now();
	const result = ids && typeof ids === 'object'
		? ids
		: {
			shareID: null,
			shareURL: null
		};

	result.shareID = null;
	result.shareURL = null;

	const normalizeShareID = (value) => {
		if (!value || typeof value !== 'string') {
			return null;
		}
		const trimmed = value.trim();
		if (!trimmed) {
			return null;
		}
		const match = trimmed.match(/\/share\/(?:[a-z]+\/)?([0-9a-f-]{36})(?=($|[/?#]))/i);
		if (match && match[1]) {
			return cleanConversationID(match[1]);
		}
		if (/^[0-9a-f-]{36}$/i.test(trimmed)) {
			return cleanConversationID(trimmed);
		}
		return null;
	};

	const buildShareURL = (shareID, contextDoc) => {
		if (!shareID) {
			return null;
		}
		const origin = (() => {
			if (contextDoc && contextDoc.location && typeof contextDoc.location.origin === 'string' && contextDoc.location.origin) {
				return contextDoc.location.origin;
			}
			return 'https://chatgpt.com';
		})();
		return `${origin.replace(/\/$/, '')}/share/${shareID}`;
	};

	const maybeAssign = (value, source) => {
		if (result.shareID) {
			return;
		}
		const normalized = normalizeShareID(value);
		if (normalized) {
			result.shareID = normalized;
			if (!result.shareURL) {
				if (typeof value === 'string' && value.trim() && /\/share\//i.test(value)) {
					const trimmed = value.trim();
					result.shareURL = trimmed.replace(/(\?|#).*$/, '');
				}
				else {
					result.shareURL = buildShareURL(normalized, doc);
				}
			}
			Zotero.debug(`[ids][getSharedConversationIDs] share candidate source=${source} id=${normalized}`, LOG_LEVEL_DEBUG);
		}
	};

	maybeAssign(url, 'input-url');
	if (!result.shareID && doc && doc.location && typeof doc.location.href === 'string') {
		maybeAssign(doc.location.href, 'doc.location');
	}

	if (!result.shareID && doc && typeof doc.querySelector === 'function') {
		const metaCandidates = [
			{ selector: 'meta[property="og:url"]', attr: 'content', source: 'meta[og:url]' },
			{ selector: 'meta[name="twitter:url"]', attr: 'content', source: 'meta[twitter:url]' },
			{ selector: 'link[rel="canonical"]', attr: 'href', source: 'link[canonical]' }
		];
		for (const entry of metaCandidates) {
			const node = doc.querySelector(entry.selector);
			if (!node) continue;
			maybeAssign(node.getAttribute(entry.attr), entry.source);
			if (result.shareID) break;
		}
	}

	const elapsed = Date.now() - start;
	Zotero.debug(`[ids][getSharedConversationIDs] done shareID=${result.shareID || '∅'} ms=${elapsed}`, LOG_LEVEL_DEBUG);
	return result;
}

/**
 * @description Derives the project identifier (slug) from the current context.
 * @param {Document} doc - The page DOM.
 * @param {string} url - The URL of the current page.
 * @param {{ projectID?: string|null }} [ids] - Existing bundle to populate.
 * @returns {{ projectID: string|null }}
 */
function getProjectID(doc, url, ids) {
	const start = Date.now();
	const result = ids && typeof ids === 'object' ? ids : { projectID: null };

	result.projectID = null;

	const extractProjectSlug = (value) => {
		if (!value || typeof value !== 'string') {
			return null;
		}
		let candidate = value.trim();
		if (!candidate) {
			return null;
		}

		let pathname = candidate;
		const needsURLParse = /^https?:\/\//i.test(candidate) || candidate.startsWith('//');
		if (needsURLParse) {
			try {
				const base = doc && doc.location && typeof doc.location.href === 'string'
					? doc.location.href
					: 'https://chatgpt.com/';
				pathname = new URL(candidate, base).pathname || candidate;
			}
			catch (_) {}
		}

		const match = pathname.match(/\/g\/([^/]+)/i);
		if (!match || !match[1]) {
			return null;
		}
		let slug = match[1];
		try {
			slug = decodeURIComponent(slug);
		}
		catch (_) {}
		slug = slug.trim();
		if (!slug) {
			return null;
		}
		if (slug.includes('/')) {
			slug = slug.split('/')[0];
		}
		return slug || null;
	};

	const candidateSources = [];
	if (typeof url === 'string') {
		candidateSources.push(url);
	}
	if (doc && doc.location) {
		if (typeof doc.location.href === 'string') {
			candidateSources.push(doc.location.href);
		}
		if (typeof doc.location.pathname === 'string') {
			candidateSources.push(doc.location.pathname);
		}
	}

	if (doc && typeof doc.querySelector === 'function') {
		const attrCandidates = [
			{ selector: '[data-project-id]', attr: 'data-project-id' },
			{ selector: '[data-project]', attr: 'data-project' },
			{ selector: 'meta[name="project-id"]', attr: 'content' },
			{ selector: 'meta[property="project:id"]', attr: 'content' }
		];
		for (const entry of attrCandidates) {
			try {
				const node = doc.querySelector(entry.selector);
				if (!node) continue;
				const raw = node.getAttribute(entry.attr) || node.getAttribute('content') || node.getAttribute('value');
				if (raw) {
					candidateSources.push(raw);
				}
			}
			catch (_) {}
		}
	}

	for (const candidate of candidateSources) {
		const slug = extractProjectSlug(candidate);
		if (slug) {
			result.projectID = slug;
			break;
		}
	}

	const elapsed = Date.now() - start;
	Zotero.debug(`[ids][getProjectID] done projectID=${result.projectID || '∅'} ms=${elapsed}`, LOG_LEVEL_DEBUG);
	return result;
}

/**
 * @description Extracts conversation identifiers scoped within the current project view.
 * @param {Document} doc - The page DOM.
 * @param {string} url - The URL associated with the selection.
 * @param {{ projectID?: string|null, conversationID?: string|null, lastPromptID?: string|null, lastResponseID?: string|null }} [ids] - Existing bundle to populate.
 * @returns {{ projectID: string|null, conversationID: string|null, lastPromptID: string|null, lastResponseID: string|null }}
 */
function getProjectConversationIDs(doc, url, ids) {
	const start = Date.now();
	const result = ids && typeof ids === 'object'
		? ids
		: {
			projectID: null,
			conversationID: null,
			lastPromptID: null,
			lastResponseID: null
		};

	getProjectID(doc, url, result);

	result.conversationID = null;
	result.lastPromptID = null;
	result.lastResponseID = null;

	const extractConversationID = (value) => {
		if (!value || typeof value !== 'string') {
			return null;
		}
		const match = value.match(/\/g\/[^/]+\/c\/([0-9a-f-]{36})(?=($|[/?#]))/i)
				|| value.match(/\/c\/([0-9a-f-]{36})(?=($|[/?#]))/i);
		return match && match[1] ? cleanConversationID(match[1]) : null;
	};

	const candidateSources = [];
	if (typeof url === 'string') {
		candidateSources.push(url);
	}
	if (doc && doc.location && typeof doc.location.href === 'string') {
		candidateSources.push(doc.location.href);
	}

	for (const candidate of candidateSources) {
		const normalized = extractConversationID(candidate);
		if (normalized) {
			result.conversationID = normalized;
			break;
		}
	}

	if (!result.conversationID && doc && typeof doc.querySelector === 'function') {
		const selectors = [
			'[data-conversation-id]',
			'[data-conversationid]',
			'[data-conversation]',
			'meta[name="conversation-id"]',
			'meta[name="conversationId"]',
			'meta[property="conversation-id"]',
			'meta[property="conversationId"]'
		];
		for (const selector of selectors) {
			const node = doc.querySelector(selector);
			if (!node) continue;
			const raw = node.getAttribute('data-conversation-id')
		|| node.getAttribute('data-conversationid')
		|| node.getAttribute('data-conversation')
		|| node.getAttribute('content')
		|| node.getAttribute('value');
			const normalized = extractConversationID(raw);
			if (normalized) {
				result.conversationID = normalized;
				break;
			}
		}
	}

	const elapsed = Date.now() - start;
	Zotero.debug(`[ids][getProjectConversationIDs] done projectID=${result.projectID || '∅'} cid=${result.conversationID || '∅'} ms=${elapsed}`, LOG_LEVEL_DEBUG);
	return result;
}

/**
 * @description Creates an empty Zotero item while the full implementation is in progress.
 * @param {Document} doc - The page DOM.
 * @param {{ projectID: string|null, conversationID: string|null, lastPromptID: string|null, lastResponseID: string|null, shareID: string|null }} ids - Identifier bundle gathered in doWeb.
 * @param {'private'|'share'|'project'} source - Pathway indicator from doWeb.
 * @returns {Promise<void>}
 */
async function getItem(doc, ids, source) {
	const item = new Zotero.Item(DEFAULT_ITEM_OBJECT.itemType);
	// Always start with a fresh creator list; we'll populate explicit defaults below.
	item.creators = [];
	item.attachments = [];

	let auth = null;
	let humanCreator = null;
	const isPrivateLike = source === 'private' || source === 'project';
	if (isPrivateLike) {
		try {
			auth = await apiGetAuth(doc, ids, source);
			const authUser = auth && auth.userName ? auth.userName : '∅';
			const authEmailFlag = auth && auth.email ? 'true' : 'false';
			Zotero.debug(`[flow:new][getItem] auth ready token=${auth && auth.token ? 'yes' : 'no'} user="${String(authUser).replace(/"/g, '\\"')}" email=${authEmailFlag}`, LOG_LEVEL_DEBUG);
			if (auth && auth.userName) {
				humanCreator = cleanHumanAuthor(auth.userName);
				if (humanCreator && !humanCreator.creatorType) {
					humanCreator.creatorType = 'author';
				}
			}
		}
		catch (err) {
			Zotero.debug(`[chatgpt:error][getItem] auth fetch failed msg="${err && err.message ? err.message : err}"`, LOG_LEVEL_ERROR);
		}
	}

	// Insert the default AI-side author first to keep ordering consistent.
	if (Array.isArray(DEFAULT_ITEM_OBJECT.creators) && DEFAULT_ITEM_OBJECT.creators[0]) {
		item.creators.push(Object.assign({}, DEFAULT_ITEM_OBJECT.creators[0]));
	}
	// Append the authenticated human creator when available; fall back later if needed.
	if (humanCreator) {
		item.creators.push(humanCreator);
	}
	else if (Array.isArray(DEFAULT_ITEM_OBJECT.creators) && DEFAULT_ITEM_OBJECT.creators[1]) {
		item.creators.push(Object.assign({}, DEFAULT_ITEM_OBJECT.creators[1]));
	}

	try {
		if (source === 'private') {
			await apiGetPrivateConversation(doc, ids, source, item, auth);
			const needsHuman = !item.creators[1]
		|| !item.creators[1].lastName
		|| item.creators[1].lastName === DEFAULT_ITEM_OBJECT.creators[1].lastName;
			const needsModel = !item.extra || !/Model:/i.test(item.extra);
			if (needsHuman || needsModel) {
				domGetPrivateConversation(doc, ids, item, { needsHuman, needsModel });
			}
		}
		else if (source === 'project') {
			await apiGetPrivateConversation(doc, ids, source, item, auth);
		}
	}
	catch (err) {
		Zotero.debug(`[chatgpt:error][getItem] ${source} pathway error msg="${err && err.message ? err.message : err}"`, LOG_LEVEL_ERROR);
	}

	if (source === 'share') {
		domGetSharedConversation(doc, ids, item);
	}

	const documentURL = doc && doc.location && typeof doc.location.href === 'string'
		? doc.location.href
		: null;
	const conversationURL = ids && ids.conversationID
		? `https://chatgpt.com/c/${ids.conversationID}`
		: null;
	const privateURL = (() => {
		if (source === 'project' && conversationURL) {
			return conversationURL;
		}
		if (documentURL && documentURL.trim()) {
			return documentURL.trim();
		}
		if (conversationURL) {
			return conversationURL;
		}
		return null;
	})();

	if ((source === 'private' || source === 'project') && ids && ids.conversationID) {
		try {
			const shareList = await apiGetSharedConversationList(doc, ids, source, auth);
			if (shareList && shareList.size) {
				const normalizedCID = cleanConversationID(ids.conversationID);
				const shareEntry = shareList.get(normalizedCID) || shareList.get(ids.conversationID);
				if (shareEntry && shareEntry.shareURL) {
					if (!item.url || item.url === privateURL || !item.url.trim()) {
						item.url = shareEntry.shareURL;
					}
					if (shareEntry.isoDate) {
						const normalizedDate = cleanDate(shareEntry.isoDate);
						if (normalizedDate) {
							item.date = normalizedDate;
						}
					}
					if (ids && shareEntry.shareID && !ids.shareID) {
						ids.shareID = shareEntry.shareID;
					}
					if (privateURL && privateURL !== shareEntry.shareURL) {
						const privateLine = `Private URL: ${privateURL}`;
						if (!item.extra || !item.extra.split(/\r?\n/).includes(privateLine)) {
							item.extra = item.extra && item.extra.length
								? `${item.extra}\n${privateLine}`
								: privateLine;
						}
					}
				}
			}
		}
		catch (err) {
			Zotero.debug(`[chatgpt:error][getItem] share list error msg="${err && err.message ? err.message : err}"`, LOG_LEVEL_ERROR);
		}
	}

	if (source === 'project' && documentURL && conversationURL && documentURL !== conversationURL) {
		const projectLine = `Project URL: ${documentURL}`;
		if (!item.extra || !item.extra.split(/\r?\n/).includes(projectLine)) {
			item.extra = item.extra && item.extra.length
				? `${item.extra}\n${projectLine}`
				: projectLine;
		}
	}

	if (!item.title) {
		item.title = DEFAULT_ITEM_OBJECT.title;
	}
	if (!item.url) {
		if (privateURL) {
			item.url = privateURL;
		}
		else if (ids && ids.conversationID) {
			item.url = `https://chatgpt.com/c/${ids.conversationID}`;
		}
		else {
			item.url = DEFAULT_ITEM_OBJECT.url;
		}
	}

	const attachmentTemplate = Array.isArray(DEFAULT_ITEM_OBJECT.attachments)
	&& DEFAULT_ITEM_OBJECT.attachments.length
	&& DEFAULT_ITEM_OBJECT.attachments[0]
		? DEFAULT_ITEM_OBJECT.attachments[0]
		: null;
	const makeSnapshotAttachment = (targetURL) => {
		if (!targetURL || typeof targetURL !== 'string') {
			return null;
		}
		const trimmed = targetURL.trim();
		if (!trimmed) {
			return null;
		}
		const attachment = {
			title: attachmentTemplate && attachmentTemplate.title
				? attachmentTemplate.title
				: 'ChatGPT Conversation Snapshot',
			url: trimmed,
			snapshot: true
		};
		if (attachmentTemplate && attachmentTemplate.mimeType) {
			attachment.mimeType = attachmentTemplate.mimeType;
		}
		if (doc) {
			attachment.document = doc;
		}
		return attachment;
	};

	if (source === 'private') {
		const snapshotURL = typeof privateURL === 'string' ? privateURL.trim() : '';
		const privateAttachment = makeSnapshotAttachment(snapshotURL || null);
		if (privateAttachment) {
			item.attachments.push(privateAttachment);
		}
	}
	else if (source === 'share') {
		const shareSnapshotURL = (() => {
			if (ids && typeof ids.shareURL === 'string' && ids.shareURL.trim()) {
				return ids.shareURL.trim();
			}
			if (item.url && typeof item.url === 'string' && item.url.trim()) {
				return item.url.trim();
			}
			if (typeof documentURL === 'string' && documentURL.trim()) {
				return documentURL.trim();
			}
			return null;
		})();
		const shareAttachment = makeSnapshotAttachment(shareSnapshotURL);
		if (shareAttachment) {
			item.attachments.push(shareAttachment);
		}
	}
	// Project pathway intentionally skips snapshot attachments.

	item.complete();
}

//#endregion


////////////////////
//#region API Get //
////////////////////

async function apiGetAuth(doc, ids, _source) {
	const start = Date.now();
	const path = '/api/auth/session';
	const cid = ids && ids.conversationID ? ids.conversationID : '∅';
	const finish = (result, origin, status, errorMsg) => {
		const elapsed = Date.now() - start;
		const tokenSet = result && result.token ? 'true' : 'false';
		const userName = result && result.userName ? result.userName : '∅';
		const emailFlag = result && result.email ? 'true' : 'false';
		Zotero.debug(`[api][apiGetAuth] done origin=${origin} token=${tokenSet} user="${String(userName).replace(/"/g, '\\"')}" email=${emailFlag} ms=${elapsed}`, LOG_LEVEL_DEBUG);
		if (errorMsg) {
			const loggedStatus = isNullish(status) ? '∅' : status;
			Zotero.debug(`[chatgpt:error][apiGetAuth] fail cid=${cid || '∅'} path="${path}" status=${loggedStatus} ms=${elapsed} msg="${errorMsg}"`, LOG_LEVEL_ERROR);
		}
		return result;
	};

	if (!doc) {
		return finish({ token: null, userName: null }, 'no-doc', null, 'no document context');
	}

	if (CHATGPT_API_AUTH_CACHE.has(doc)) {
		const cached = CHATGPT_API_AUTH_CACHE.get(doc);
		return finish(cached, 'cache', null, null);
	}

	const response = await callAPI(doc, {
		url: path,
		headers: { Accept: 'application/json' },
		responseType: 'json',
		expectJSON: true,
		label: '[chatgpt] /api/auth/session'
	});

	if (!response) {
		return finish({ token: null, userName: null }, 'network', null, 'no response');
	}

	if (!response.ok) {
		return finish({ token: null, userName: null }, 'network', response.status, 'http error');
	}

	const parseJSONInline = (raw, label) => {
		const s = (raw || '').trim();
		if (!s) {
			Zotero.debug(`[norm][${label}] empty`, LOG_LEVEL_DEBUG);
			return null;
		}
		try {
			const obj = JSON.parse(s);
			Zotero.debug(`[norm][${label}] parsed ok`, LOG_LEVEL_DEBUG);
			return obj;
		}
		catch (e) {
			const msg = e && e.message ? e.message : e;
			Zotero.debug(`[norm][${label}] parse error ${msg}`, LOG_LEVEL_DEBUG);
			return null;
		}
	};

	let data = null;
	if (response && response.data && typeof response.data === 'object') {
		data = response.data;
	}
	else if (response && typeof response.data === 'string') {
		data = parseJSONInline(response.data, '[chatgpt] /api/auth/session body') || null;
	}
	else if (response && typeof response.raw === 'string') {
		data = parseJSONInline(response.raw, '[chatgpt] /api/auth/session raw') || null;
	}

	let token = null;
	let userName = null;
	let userEmail = null;
	if (data && typeof data === 'object') {
		token = data.accessToken || data.access_token
		|| (data.user && (data.user.accessToken || data.user.access_token)) || null;
		if (data.user && typeof data.user.name === 'string') {
			userName = data.user.name.trim() || null;
		}
		if (data.user && typeof data.user.email === 'string') {
			userEmail = data.user.email.trim() || null;
		}
	}

	const result = {
		token: token || null,
		userName: userName || null,
		email: userEmail || null
	};
	CHATGPT_API_AUTH_CACHE.set(doc, result);
	try {
		Zotero.debug(`[flow:new] apiGetAuth result token=${result.token ? 'yes' : 'no'} user=${result.userName || '∅'}`, LOG_LEVEL_DEBUG);
	}
	catch (_) {}
	const status = response && typeof response.status === 'number' ? response.status : null;
	const errorMsg = result.token ? null : 'missing token';
	return finish(result, 'network', status, errorMsg);
}

function apiGetHeaders(doc) {
	const start = Date.now();
	const result = {
		headers: {},
		cookieString: null
	};

	if (!doc) {
		Zotero.debug('[api][apiGetHeaders] skip: no document context', LOG_LEVEL_DEBUG);
		return result;
	}

	const snapshotCookies = () => {
		try {
			if (typeof doc.cookie === 'string' && doc.cookie.length) {
				return doc.cookie;
			}
		}
		catch (_) {}
		try {
			const win = doc && doc.defaultView;
			if (win && win.document && typeof win.document.cookie === 'string' && win.document.cookie.length) {
				return win.document.cookie;
			}
		}
		catch (_) {}
		return null;
	};

	const getCookieValue = (cookieString, name) => {
		if (!cookieString || typeof cookieString !== 'string' || !name) {
			return null;
		}
		const escaped = name.replace(/([.*+?^${}()|[\]\\])/g, '\\$1');
		const pattern = new RegExp(`(?:^|;\\s*)${escaped}=([^;]*)`);
		const match = cookieString.match(pattern);
		if (!match || match.length < 2) {
			return null;
		}
		try {
			return decodeURIComponent(match[1]);
		}
		catch (_) {
			return match[1];
		}
	};

	const trim = (value) => {
		if (typeof value !== 'string') {
			return null;
		}
		const trimmed = value.trim();
		return trimmed ? trimmed : null;
	};

	result.cookieString = snapshotCookies();

	const accountId = trim(getCookieValue(result.cookieString, '_account'));
	const deviceId = trim(getCookieValue(result.cookieString, 'oai-did'));

	let language = null;
	const win = doc && doc.defaultView ? doc.defaultView : null;
	if (win && win.navigator && typeof win.navigator.language === 'string' && win.navigator.language) {
		language = trim(win.navigator.language);
	}
	if (!language && doc && doc.documentElement && typeof doc.documentElement.lang === 'string') {
		language = trim(doc.documentElement.lang);
	}
	if (!language && typeof Zotero !== 'undefined' && Zotero.locale) {
		language = trim(Zotero.locale);
	}

	if (accountId) {
		result.headers['chatgpt-account-id'] = accountId;
	}
	if (deviceId) {
		result.headers['oai-device-id'] = deviceId;
	}
	if (language) {
		result.headers['oai-language'] = language;
	}

	const elapsed = Date.now() - start;
	Zotero.debug(`[api][apiGetHeaders] done account=${accountId ? 'true' : 'false'} device=${deviceId ? 'true' : 'false'} lang=${language || '∅'} ms=${elapsed}`, LOG_LEVEL_DEBUG);
	return result;
}

async function apiGetPrivateConversation(doc, ids, source, item, authHint) {
	const start = Date.now();
	const pathway = source || '∅';
	const conversationID = ids && ids.conversationID ? ids.conversationID : null;
	const log = (level, message) => {
		Zotero.debug(`[api][apiGetPrivateConversation][${pathway}] ${message}`, level ?? LOG_LEVEL_DEBUG);
	};

	if (!conversationID) {
		log(LOG_LEVEL_DEBUG, 'skip: no conversationID available');
		return null;
	}

	const auth = authHint || await apiGetAuth(doc, ids, source);
	if (!auth || !auth.token) {
		log(LOG_LEVEL_ERROR, `auth unavailable cid=${conversationID}`);
		return null;
	}

	const workspace = apiGetHeaders(doc);
	const requestHeaders = Object.assign(
		{},
		workspace && workspace.headers ? workspace.headers : {},
		{
			Authorization: `Bearer ${auth.token}`,
			Accept: 'application/json'
		}
	);

	let response;
	try {
		response = await callAPI(doc, {
			url: `/backend-api/conversation/${conversationID}`,
			headers: requestHeaders,
			responseType: 'json',
			expectJSON: true,
			label: `[chatgpt] /backend-api/conversation/${conversationID}`
		});
	}
	catch (err) {
		log(LOG_LEVEL_ERROR, `transport error cid=${conversationID} msg="${err && err.message ? err.message : err}"`);
		return null;
	}

	if (!response || !response.ok || !response.data || typeof response.data !== 'object') {
		const status = response && typeof response.status === 'number' ? response.status : '∅';
		log(LOG_LEVEL_ERROR, `http error cid=${conversationID} status=${status}`);
		return null;
	}

	const payload = response.data;
	const pick = (candidates) => {
		for (const candidate of candidates) {
			if (!candidate) continue;
			if (typeof candidate === 'string') {
				return candidate;
			}
			if (candidate && typeof candidate === 'object') {
				if (typeof candidate.value === 'string') return candidate.value;
				if (typeof candidate.title === 'string') return candidate.title;
				if (typeof candidate.data === 'string') return candidate.data;
			}
		}
		return null;
	};

	const resolvedTitle = cleanTitle(pick([
		payload.title,
		payload.summary && payload.summary.title,
		payload.conversation && payload.conversation.title
	]));
	if (item && !item.title && resolvedTitle) {
		item.title = resolvedTitle;
	}

	const resolvedConversationID = cleanConversationID(pick([
		payload.id,
		payload.conversation_id,
		payload.conversation && payload.conversation.id
	]));
	if (resolvedConversationID && ids) {
		ids.conversationID = resolvedConversationID;
	}

	const resolvedShareID = cleanConversationID(pick([
		payload.share_id,
		payload.metadata && payload.metadata.share_id,
		payload.conversation && payload.conversation.share_id
	]));
	if (resolvedShareID && ids) {
		ids.shareID = resolvedShareID;
	}

	const timestampCandidate = (() => {
		if (typeof payload.update_time === 'number') return new Date(payload.update_time * 1000).toISOString();
		if (typeof payload.create_time === 'number') return new Date(payload.create_time * 1000).toISOString();
		if (payload.update_time) return payload.update_time;
		if (payload.create_time) return payload.create_time;
		return null;
	})();
	const resolvedDate = cleanDate(timestampCandidate);
	if (item && !item.date && resolvedDate) {
		item.date = resolvedDate;
	}

	const lastNode = pick([
		payload.current_node,
		payload.metadata && payload.metadata.last_message_id
	]);
	if (lastNode && ids && !ids.lastResponseID) {
		ids.lastResponseID = lastNode;
	}

	const elapsed = Date.now() - start;
	const titleForLog = (item && item.title) || resolvedTitle || '∅';
	log(LOG_LEVEL_DEBUG, `ok cid=${conversationID} title="${titleForLog.replace(/"/g, '\\"')}" ms=${elapsed}`);
	return payload;
}

//TODO: Implement apiGetProjectConversation


//TODO: Implement apiGetPrivateConversationList

async function apiGetSharedConversationList(doc, ids, source, authHint) {
	const start = Date.now();
	const pathway = source || '∅';
	const log = (level, message) => {
		Zotero.debug(`[api][apiGetSharedConversationList][${pathway}] ${message}`, level ?? LOG_LEVEL_DEBUG);
	};

	if (!doc) {
		log(LOG_LEVEL_DEBUG, 'skip: no document context');
		return null;
	}

	const auth = authHint || await apiGetAuth(doc, ids, source);
	if (!auth || !auth.token) {
		log(LOG_LEVEL_DEBUG, 'skip: missing auth token');
		return null;
	}

	const conversationID = ids && ids.conversationID ? cleanConversationID(ids.conversationID) : null;
	const workspace = apiGetHeaders(doc);
	const requestHeaders = Object.assign(
		{},
		workspace && workspace.headers ? workspace.headers : {},
		{
			Authorization: `Bearer ${auth.token}`,
			Accept: 'application/json'
		}
	);

	const defaultShareHost = (() => {
		const host = doc && doc.location && String(doc.location.host || '').toLowerCase();
		if (host && host.includes('chat.openai.com')) {
			return 'https://chat.openai.com';
		}
		return 'https://chatgpt.com';
	})();

	const parseMaybeTimeToMs = (value) => {
		if (isNullish(value)) return null;
		if (typeof value === 'number') {
			return value < 1e12 ? value * 1000 : value;
		}
		if (typeof value === 'string') {
			const trimmed = value.trim();
			if (!trimmed) return null;
			const numeric = Number(trimmed);
			if (!Number.isNaN(numeric)) {
				return numeric < 1e12 ? numeric * 1000 : numeric;
			}
			const parsed = Date.parse(trimmed);
			if (!Number.isNaN(parsed)) {
				return parsed;
			}
		}
		return null;
	};

	const buildISODate = (entry) => {
		const ms = parseMaybeTimeToMs(
			entry && (entry.update_time ?? entry.create_time ?? entry.updated_at ?? entry.created_at)
		);
		if (isNullish(ms)) {
			return null;
		}
		const iso = new Date(ms).toISOString();
		return cleanDate(iso) || iso;
	};

	let response;
	try {
		response = await callAPI(doc, {
			url: '/backend-api/shared_conversations?order=created',
			headers: requestHeaders,
			responseType: 'json',
			expectJSON: true,
			timeout: SHARE_LIST_TIMEOUT_MS,
			label: '[chatgpt] /backend-api/shared_conversations'
		});
	}
	catch (err) {
		log(LOG_LEVEL_ERROR, `transport error msg="${err && err.message ? err.message : err}"`);
		return null;
	}

	if (!response || !response.ok) {
		const status = response && typeof response.status === 'number' ? response.status : '∅';
		log(LOG_LEVEL_ERROR, `http error status=${status}`);
		return null;
	}

	if (!response.data || typeof response.data !== 'object' || !Array.isArray(response.data.items)) {
		log(LOG_LEVEL_ERROR, 'malformed payload');
		return null;
	}

	const shareMap = new Map();
	const items = response.data.items;
	for (const entry of items) {
		if (!entry) continue;
		const rawConversationID = entry.conversation_id || entry.conversationId || entry.cid;
		const normalizedConversationID = cleanConversationID(rawConversationID);
		const rawShareID = typeof entry.share_id === 'string'
			? entry.share_id
			: (typeof entry.id === 'string' ? entry.id : null);
		const normalizedShareID = rawShareID ? rawShareID.trim().toLowerCase() : null;
		let shareURL = null;
		if (entry.share_url && typeof entry.share_url === 'string') {
			shareURL = entry.share_url.trim();
		}
		else if (normalizedShareID) {
			shareURL = `${defaultShareHost}/share/${normalizedShareID}`;
		}
		if (!normalizedConversationID || !shareURL) {
			continue;
		}
		shareMap.set(normalizedConversationID, {
			shareURL,
			shareID: normalizedShareID,
			isoDate: buildISODate(entry)
		});
		if (conversationID && normalizedConversationID === conversationID) {
			break;
		}
	}

	const elapsed = Date.now() - start;
	log(LOG_LEVEL_DEBUG, `done count=${shareMap.size} target=${conversationID || '∅'} ms=${elapsed}`);

	return shareMap.size ? shareMap : null;
}

//TODO: Implement apiGetProjectConversationList


//#endregion


////////////////////
//#region DOM Get //
////////////////////

function domGetPrivateConversation(doc, ids, item, needs = {}) {
	const start = Date.now();
	if (!doc || typeof doc.querySelector !== 'function') {
		Zotero.debug('[dom][domGetPrivateConversation] skip: no DOM access', LOG_LEVEL_DEBUG);
		return;
	}

	const results = { human: null, model: null };
	const headerTexts = [];
	const headerSources = [];

	if (typeof doc.evaluate === 'function' && typeof XPathResult !== 'undefined') {
		try {
			const headerNodes = doc.evaluate(
				'//*[@id][starts-with(@id,"radix-")]/div[1]//span[normalize-space()][position() <= 2]',
				doc,
				null,
				XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
				null
			);
			if (headerNodes) {
				const length = Math.min(headerNodes.snapshotLength, 2);
				for (let i = 0; i < length; i++) {
					const text = headerNodes.snapshotItem(i)?.textContent?.trim();
					if (text) {
						headerTexts[i] = text;
						headerSources[i] = `dom:radix-header-span[${i + 1}]`;
					}
				}
			}
		}
		catch (_) {}
	}

	if ((headerTexts[0] === undefined || headerTexts[1] === undefined)
	&& typeof doc.querySelector === 'function') {
		const fallbackHeader = doc.querySelector('[id^="radix-"] > div');
		if (fallbackHeader && typeof fallbackHeader.querySelectorAll === 'function') {
			let ordinal = 0;
			for (const span of fallbackHeader.querySelectorAll('span')) {
				const candidate = span?.textContent?.trim();
				if (!candidate) continue;
				if (headerTexts[ordinal] === undefined) {
					headerTexts[ordinal] = candidate;
					if (!headerSources[ordinal]) {
						headerSources[ordinal] = `dom:radix-header-span[${ordinal + 1}]-fallback`;
					}
				}
				ordinal++;
				if (headerTexts[0] !== undefined && headerTexts[1] !== undefined) {
					break;
				}
				if (ordinal >= 2) {
					break;
				}
			}
		}
	}

	if (needs.needsHuman) {
		if (!item.creators[1]) {
			item.creators[1] = Object.assign({}, DEFAULT_ITEM_OBJECT.creators[1]);
		}
		const applyHuman = (value, source) => {
			const cleaned = cleanHumanAuthor(value);
			if (!cleaned) return false;
			item.creators[1] = cleaned;
			results.human = source;
			return true;
		};

		let filledHuman = false;
		if (headerTexts[0]) {
			filledHuman = applyHuman(headerTexts[0], headerSources[0] || 'dom:radix-header-span[1]');
		}
		if (!filledHuman) {
			const metaAuthor = doc.querySelector('meta[name="author"]');
			if (metaAuthor && metaAuthor.getAttribute('content')) {
				filledHuman = applyHuman(metaAuthor.getAttribute('content'), 'meta[name="author"]');
			}
		}
		if (!filledHuman) {
			const twitterCreator = doc.querySelector('meta[name="twitter:creator"]');
			if (twitterCreator && twitterCreator.getAttribute('content')) {
				applyHuman(twitterCreator.getAttribute('content'), 'meta[name="twitter:creator"]');
			}
		}
	}

	if (needs.needsModel) {
		let modelValue = null;
		let modelSource = null;

		if (headerTexts[1]) {
			const cleanedText = headerTexts[1].replace(/^Model:\s*/i, '').trim();
			if (cleanedText) {
				modelValue = cleanedText;
				modelSource = headerSources[1] || 'dom:radix-header-span[2]';
			}
		}

		if (modelValue) {
			const cleaned = cleanAIModel(modelValue);
			if (cleaned) {
				const extraLine = `Model: ${cleaned}`;
				if (!item.extra) {
					item.extra = extraLine;
				}
				else if (!item.extra.includes(extraLine)) {
					item.extra = `${item.extra}\n${extraLine}`;
				}
				results.model = modelSource || 'xpath';
			}
		}
	}

	Zotero.debug(`[dom][domGetPrivateConversation] done human=${results.human || '∅'} model=${results.model || '∅'} ms=${Date.now() - start}`, LOG_LEVEL_DEBUG);
}

function domGetSharedConversation(doc, ids, item) {
	const start = Date.now();
	if (!doc || typeof doc.querySelector !== 'function') {
		Zotero.debug('[dom][domGetSharedConversation] skip: no DOM access', LOG_LEVEL_DEBUG);
		return null;
	}
	if (ENABLE_VERBOSE_DOM_LOGGING) {
		try {
			const html = doc && doc.documentElement
				? doc.documentElement.outerHTML
				: (doc && doc.body ? doc.body.outerHTML : '');
			if (html) {
				Zotero.debug(`[dom][domGetSharedConversation] full DOM:\n${html}`, LOG_LEVEL_DEBUG);
			}
			else {
				Zotero.debug('[dom][domGetSharedConversation] full DOM: ∅ (no serializable HTML)', LOG_LEVEL_DEBUG);
			}
		}
		catch (err) {
			Zotero.debug(`[dom][domGetSharedConversation] full DOM serialization error: ${err && err.message ? err.message : err}`, LOG_LEVEL_DEBUG);
		}
	}

	const DEBUG_SCAN_DATES = ENABLE_VERBOSE_DOM_LOGGING;
	const logPastDatesInDOM = () => {
		if (!DEBUG_SCAN_DATES || !doc || typeof doc.createTreeWalker !== 'function') {
			return;
		}
		const root = doc.body || doc;
		if (!root) return;
		const ISO_REGEX = /\b\d{4}-\d{2}-\d{2}(?:[T\s]\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z?)?\b/g;
		const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
		const hits = [];
		while (walker.nextNode()) {
			const text = walker.currentNode && walker.currentNode.nodeValue;
			if (!text || !ISO_REGEX.test(text)) continue;
			const matches = text.match(ISO_REGEX) || [];
			for (const raw of matches) {
				const normalized = cleanDate(raw);
				if (!normalized) continue;
				const ts = Date.parse(normalized);
				if (Number.isNaN(ts) || ts >= Date.now()) continue;
				hits.push({
					raw,
					normalized,
					context: text.trim().slice(0, 160)
				});
			}
		}
		if (hits.length) {
			try {
				Zotero.debug(`[dom][domGetSharedConversation] past-date-scan hits=${hits.length} ${JSON.stringify(hits)}`, LOG_LEVEL_DEBUG);
			}
			catch (err) {
				Zotero.debug(`[dom][domGetSharedConversation] past-date-scan log error: ${err && err.message ? err.message : err}`, LOG_LEVEL_DEBUG);
			}
		}
		else {
			Zotero.debug('[dom][domGetSharedConversation] past-date-scan found no matches', LOG_LEVEL_DEBUG);
		}
	};
	logPastDatesInDOM();

	const summary = {};
	const pickFirst = (...values) => {
		for (const value of values.flat()) {
			if (!value && value !== 0) continue;
			if (typeof value === 'string') {
				const trimmed = value.trim();
				if (trimmed) return trimmed;
			}
			else if (typeof value === 'number') {
				return value;
			}
		}
		return null;
	};

	let sharedPayload = null;
	const nextDataScript = doc.getElementById('__NEXT_DATA__');
	if (nextDataScript && typeof nextDataScript.textContent === 'string') {
		const text = nextDataScript.textContent.trim();
		if (text && text.length < 2_000_000) {
			try {
				sharedPayload = JSON.parse(text);
			}
			catch (err) {
				Zotero.debug(`[dom][domGetSharedConversation] __NEXT_DATA__ parse error: ${err && err.message ? err.message : err}`, LOG_LEVEL_DEBUG);
			}
		}
	}

	const extractSharedConversation = (payload) => {
		if (!payload || typeof payload !== 'object') {
			return null;
		}
		const walk = (node) => {
			if (!node || typeof node !== 'object') {
				return null;
			}
			if (node.sharedConversation && typeof node.sharedConversation === 'object') {
				return node.sharedConversation;
			}
			if (node.conversation && typeof node.conversation === 'object') {
				return node.conversation;
			}
			if (node.props && typeof node.props === 'object') {
				const fromProps = walk(node.props);
				if (fromProps) return fromProps;
			}
			if (node.pageProps && typeof node.pageProps === 'object') {
				const fromPageProps = walk(node.pageProps);
				if (fromPageProps) return fromPageProps;
			}
			if (node.initialState && typeof node.initialState === 'object') {
				const fromInitial = walk(node.initialState);
				if (fromInitial) return fromInitial;
			}
			return null;
		};
		return walk(payload);
	};

	const sharedConversation = extractSharedConversation(sharedPayload);

	const getMeta = (selector, attr = 'content') => {
		const node = doc.querySelector(selector);
		if (!node) return null;
		const value = attr ? node.getAttribute(attr) : node.textContent;
		return value && typeof value === 'string' ? value.trim() : null;
	};

	const rawDocumentTitle = doc && typeof doc.title === 'string' ? doc.title : null;
	const titleCandidate = rawDocumentTitle ? cleanTitle(rawDocumentTitle) : null;
	if (titleCandidate) {
		item.title = titleCandidate;
		summary.title = titleCandidate;
	}

	if (sharedConversation && typeof sharedConversation.id === 'string') {
		const normalizedShare = cleanConversationID(sharedConversation.id);
		if (normalizedShare && ids && !ids.shareID) {
			ids.shareID = normalizedShare;
		}
	}

	if (sharedConversation && typeof sharedConversation.conversation_id === 'string') {
		const normalizedCID = cleanConversationID(sharedConversation.conversation_id);
		if (normalizedCID && ids && !ids.conversationID) {
			ids.conversationID = normalizedCID;
		}
	}

	const humanCandidate = cleanHumanAuthor(pickFirst(
		sharedConversation && sharedConversation.owner && (sharedConversation.owner.display_name || sharedConversation.owner.name),
		sharedConversation && sharedConversation.share_author,
		sharedConversation && sharedConversation.metadata && sharedConversation.metadata.share_author,
		getMeta('meta[name="author"]'),
		getMeta('meta[property="profile:username"]'),
		getMeta('meta[name="twitter:creator"]'),
		(() => {
			const node = doc.querySelector('[data-testid="conversation-owner"], header a[href^="https://chatgpt.com/profile"]');
			return node && node.textContent ? node.textContent.trim() : null;
		})()
	));
	if (humanCandidate) {
		if (!item.creators[1]) {
			item.creators[1] = Object.assign({}, DEFAULT_ITEM_OBJECT.creators[1]);
		}
		item.creators[1] = humanCandidate;
		summary.humanCreator = humanCandidate;
	}

	const modelCandidate = cleanAIModel(pickFirst(
		sharedConversation && sharedConversation.default_model_slug,
		sharedConversation && sharedConversation.model_slug,
		sharedConversation && sharedConversation.model && sharedConversation.model.slug,
		sharedConversation && sharedConversation.metadata && sharedConversation.metadata.model_slug,
		getMeta('meta[name="ai-model"]'),
		getMeta('meta[name="model"]')
	));
	if (modelCandidate) {
		const modelLine = `Model: ${modelCandidate}`;
		item.extra = item.extra && item.extra.length
			? `${item.extra}\n${modelLine}`
			: modelLine;
		summary.aiModel = modelCandidate;
	}

	const aiAlias = cleanAIName(pickFirst(
		sharedConversation && sharedConversation.metadata && sharedConversation.metadata.model_name,
		sharedConversation && sharedConversation.model_name
	));
	if (aiAlias && item.creators[0]) {
		item.creators[0] = aiAlias;
		summary.aiCreator = aiAlias;
	}

	const participantsLine = (() => {
		const node = doc.querySelector('div.text-xs.text-gray-500');
		if (!node || typeof node.textContent !== 'string') return null;
		return node.textContent.trim();
	})();
	if (participantsLine) {
		summary.participants = participantsLine;
		const betweenMatch = participantsLine.match(/between\s+(.+?)(?:\.\s*$|$)/i);
		if (betweenMatch && betweenMatch[1]) {
			const participantNames = betweenMatch[1]
		.split(/\s*&\s*|\s+and\s+/iu)
		.map(name => (name && typeof name === 'string' ? name.trim() : ''))
		.filter(Boolean);
			if (participantNames.length) {
				const participantAI = cleanAIName(participantNames[0]);
				if (participantAI) {
					item.creators[0] = participantAI;
					if (!summary.aiCreator) {
						summary.aiCreator = participantAI;
					}
				}
				if (participantNames.length > 1) {
					const participantHuman = cleanHumanAuthor(participantNames.slice(1).join(' & '));
					if (participantHuman) {
						item.creators[1] = participantHuman;
						if (!summary.humanCreator) {
							summary.humanCreator = participantHuman;
						}
					}
				}
			}
		}
	}

	const canonicalShareURL = getMeta('link[rel="canonical"]', 'href');
	const currentURL = doc.location && typeof doc.location.href === 'string' ? doc.location.href : null;
	const shareURLCandidate = pickFirst(
		canonicalShareURL,
		currentURL
	);
	if (shareURLCandidate) {
		summary.shareURL = shareURLCandidate;
		if (!item.url) {
			item.url = shareURLCandidate;
		}
		if (ids && !ids.shareURL) {
			ids.shareURL = shareURLCandidate;
		}
	}

	const elapsed = Date.now() - start;
	const loggedTitle = item.title ? item.title : '∅';
	Zotero.debug(`[dom][domGetSharedConversation] done title="${loggedTitle.replace(/"/g, '\\"')}" ms=${elapsed}`, LOG_LEVEL_DEBUG);
	return Object.keys(summary).length ? summary : null;
}

//TODO: Implement domGetProjectConversation

//TODO: Implement domGetPrivateConversationList

//TODO: Implement domGetSharedConversationList

/**
 * @description Scans the project dashboard DOM for conversation entries.
 * @param {Document} doc - The page DOM.
 * @returns {Array<{ absoluteURL: string, label: string, conversationID: string|null, projectID: string|null }>}
 */
function domGetProjectConversationList(doc) {
	const start = Date.now();
	if (!doc || typeof doc.querySelectorAll !== 'function') {
		Zotero.debug('[dom][domGetProjectConversationList] skip: no DOM access', LOG_LEVEL_DEBUG);
		return [];
	}

	const baseIDs = getProjectID(doc, doc && doc.location && doc.location.href ? doc.location.href : null);
	const defaultProjectID = baseIDs && baseIDs.projectID ? baseIDs.projectID : null;

	const trim = (value) => {
		if (typeof ZU !== 'undefined' && typeof ZU.trimInternal === 'function') {
			return ZU.trimInternal(value);
		}
		return typeof value === 'string' ? value.trim() : '';
	};

	const anchors = doc.querySelectorAll('a[href]');
	if (!anchors || !anchors.length) {
		Zotero.debug('[dom][domGetProjectConversationList] no anchor candidates found', LOG_LEVEL_DEBUG);
		return [];
	}

	const seen = new Set();
	const results = [];
	const origin = doc.location && doc.location.href ? doc.location.href : 'https://chatgpt.com/';

	const deriveEntry = (rawHref) => {
		if (!rawHref || typeof rawHref !== 'string') {
			return null;
		}
		let absoluteURL = null;
		try {
			const resolved = new URL(rawHref, origin);
			resolved.hash = '';
			absoluteURL = resolved.href;
		}
		catch (_) {
			const trimmed = rawHref.trim();
			if (trimmed) {
				absoluteURL = trimmed;
			}
		}
		if (!absoluteURL) {
			return null;
		}

		let pathname = null;
		try {
			pathname = new URL(absoluteURL).pathname;
		}
		catch (_) {
			pathname = absoluteURL;
		}

		const match = pathname && pathname.match(PROJECT_CONVERSATION_PATH_REGEX);
		if (!match || !match[2]) {
			return null;
		}
		const conversationID = cleanConversationID(match[2]);
		if (!conversationID) {
			return null;
		}
		let projectSlug = defaultProjectID;
		if (match[1]) {
			let slug = match[1];
			try {
				slug = decodeURIComponent(slug);
			}
			catch (_) {}
			slug = slug.trim();
			if (slug.includes('/')) {
				slug = slug.split('/')[0];
			}
			if (slug) {
				projectSlug = slug;
			}
		}

		return {
			absoluteURL,
			conversationID,
			projectID: projectSlug || null
		};
	};

	const pickLabel = (node, conversationID) => {
		const candidateTexts = [
			node.getAttribute && node.getAttribute('data-label'),
			node.getAttribute && node.getAttribute('aria-label'),
			node.textContent
		];
		for (const text of candidateTexts) {
			if (!text || typeof text !== 'string') continue;
			const trimmed = trim(text);
			if (trimmed) {
				return trimmed;
			}
		}
		if (conversationID && typeof conversationID === 'string') {
			return `Conversation ${conversationID.slice(0, 8)}`;
		}
		return 'Conversation';
	};

	for (const anchor of anchors) {
		const href = anchor.getAttribute('href') || anchor.href;
		const entry = deriveEntry(href);
		if (!entry || !entry.absoluteURL) {
			continue;
		}

		const dedupeKey = entry.conversationID || entry.absoluteURL;
		if (seen.has(dedupeKey)) {
			continue;
		}
		seen.add(dedupeKey);

		const label = pickLabel(anchor, entry.conversationID);
		results.push({
			absoluteURL: entry.absoluteURL,
			label,
			conversationID: entry.conversationID,
			projectID: entry.projectID || null
		});
	}

	const elapsed = Date.now() - start;
	Zotero.debug(`[dom][domGetProjectConversationList] done count=${results.length} projectID=${defaultProjectID || '∅'} ms=${elapsed}`, LOG_LEVEL_DEBUG);
	return results;
}

//#endregion


//////////////////////////////////////////////
//#region Cleaning (Normalization) Functions//
//////////////////////////////////////////////

function cleanConversationID(value) {
	let result = null;
	if (typeof value === 'string') {
		const trimmed = typeof ZU !== 'undefined' && typeof ZU.trimInternal === 'function'
			? ZU.trimInternal(value)
			: value.trim();
		result = trimmed ? trimmed.toLowerCase() : null;
	}
	return result;
}

function cleanTitle(value) {
	let result = null;
	if (value) {
		const trimAndStrip = (input) => {
			const trimmed = typeof ZU !== 'undefined' && typeof ZU.trimInternal === 'function'
				? ZU.trimInternal(input)
				: String(input).trim();
			if (!trimmed) return null;

			let result = trimmed
				.replace(/^(?:ChatGPT|OpenAI)\s*[-–—|:]\s*/i, '')
				.replace(/\s*[-–—|:]\s*(?:ChatGPT|OpenAI)$/i, '')
				.replace(/\s*\|\s*(?:ChatGPT|OpenAI)$/i, '')
				.trim();

			if (!result) {
				result = trimmed.replace(/\b(ChatGPT|OpenAI)\b/ig, '').trim();
			}

			return result || null;
		};
		if (typeof value === 'string') {
			result = trimAndStrip(value);
		}
		else if (typeof value === 'object') {
			if (typeof value.title === 'string') {
				result = trimAndStrip(value.title);
			}
			else if (typeof value.data === 'string') {
				result = trimAndStrip(value.data);
			}
			else if (value.data && typeof value.data.title === 'string') {
				result = trimAndStrip(value.data.title);
			}
		}
	}
	if (result) {
		const trim = (str) => {
			if (typeof ZU !== 'undefined' && typeof ZU.trimInternal === 'function') {
				return ZU.trimInternal(str);
			}
			return String(str).trim();
		};
		const trimmedResult = trim(result);
		const lowered = trimmedResult ? trimmedResult.toLowerCase() : '';
		const defaultsTitle = typeof DEFAULT_ITEM_OBJECT.title === 'string'
			? trim(DEFAULT_ITEM_OBJECT.title).toLowerCase()
			: null;
		if (!lowered
		|| (defaultsTitle && lowered === defaultsTitle)
		|| lowered === 'chatgpt'
		|| lowered === 'chatgpt conversation') {
			result = null;
		}
		else {
			result = trimmedResult;
		}
	}
	return result;
}

function isNullish(value) {
	return value === null || value === undefined;
}

function cleanAIName(value) {
	let result = null;
	const trimValue = (input) => {
		if (isNullish(input)) return null;
		const base = typeof input === 'string' ? input : String(input);
		const trimmed = (typeof ZU !== 'undefined' && typeof ZU.trimInternal === 'function')
			? ZU.trimInternal(base)
			: base.trim();
		return trimmed || null;
	};
	const ensureAuthorCreator = (creator) => {
		if (!creator) return null;
		const normalized = Object.assign({}, creator);
		normalized.creatorType = 'author';
		if (!normalized.firstName && normalized.lastName && !normalized.fieldMode) {
			normalized.fieldMode = 1;
		}
		return normalized;
	};

	if (value && typeof value === 'object' && value.data !== undefined) {
		result = cleanAIName(value.data);
	}
	else if (Array.isArray(value)) {
		for (const entry of value) {
			result = cleanAIName(entry);
			if (result) break;
		}
	}
	else if (value) {
		if (typeof value === 'string') {
			const trimmed = trimValue(value);
			result = trimmed ? ensureAuthorCreator(ZU.cleanAuthor(trimmed, 'author')) : null;
		}
		else if (typeof value === 'object') {
			if (value.lastName || value.firstName) {
				const clone = Object.assign({}, value);
				if (typeof clone.lastName === 'string') clone.lastName = trimValue(clone.lastName);
				if (typeof clone.firstName === 'string') clone.firstName = trimValue(clone.firstName);
				if (clone.lastName || clone.firstName) {
					result = ensureAuthorCreator(clone);
				}
			}
			if (!result) {
				const candidates = [
					value.aiName,
					value.fullName,
					value.displayName,
					value.name
				];
				for (const candidate of candidates) {
					const trimmed = trimValue(candidate);
					if (trimmed) {
						result = ensureAuthorCreator(ZU.cleanAuthor(trimmed, 'author'));
						if (result) break;
					}
				}
			}
		}
	}

	if (result && !result.creatorType) {
		result.creatorType = 'author';
	}
	return result;
}

function cleanHumanAuthor(value) {
	let result = null;
	const rejectIfChatGPT = (input) => {
		if (!input) return null;
		const trimmed = typeof ZU !== 'undefined' && typeof ZU.trimInternal === 'function'
			? ZU.trimInternal(input)
			: String(input).trim();
		if (!trimmed) return null;
		const lowered = trimmed.toLowerCase();
		if (lowered === 'chatgpt' || lowered === 'openai') {
			return null;
		}
		return trimmed;
	};

	if (value && typeof value === 'object' && value.data !== undefined) {
		result = cleanHumanAuthor(value.data);
	}
	else if (value) {
		if (Array.isArray(value) && value.length) {
			result = cleanHumanAuthor(value[0]);
		}
		else if (typeof value === 'string') {
			const trimmed = rejectIfChatGPT(value);
			result = trimmed ? ZU.cleanAuthor(trimmed, 'author') : null;
		}
		else if (typeof value === 'object') {
			if (value.lastName || value.firstName) {
				result = Object.assign({ creatorType: 'author' }, value);
			}
			else if (typeof value.userName === 'string') {
				const trimmed = rejectIfChatGPT(value.userName);
				result = trimmed ? ZU.cleanAuthor(trimmed, 'author') : null;
			}
			else if (typeof value.fullName === 'string') {
				const trimmed = rejectIfChatGPT(value.fullName);
				result = trimmed ? ZU.cleanAuthor(trimmed, 'author') : null;
			}
			else if (typeof value.displayName === 'string') {
				const trimmed = rejectIfChatGPT(value.displayName);
				result = trimmed ? ZU.cleanAuthor(trimmed, 'author') : null;
			}
			else if (typeof value.name === 'string') {
				const trimmed = rejectIfChatGPT(value.name);
				result = trimmed ? ZU.cleanAuthor(trimmed, 'author') : null;
			}
		}
	}
	return result;
}

function cleanAIModel(value) {
	let result = null;
	if (value && typeof value === 'object' && value.data !== undefined) {
		result = cleanAIModel(value.data);
	}
	else if (value) {
		if (typeof value === 'number') {
			result = String(value);
		}
		else if (Array.isArray(value) && value.length) {
			result = cleanAIModel(value[0]);
		}
		else if (typeof value === 'string') {
			const trimmed = typeof ZU !== 'undefined' && typeof ZU.trimInternal === 'function'
				? ZU.trimInternal(value)
				: value.trim();
			result = trimmed || null;
		}
		else if (typeof value === 'object') {
			const candidates = [
				value.aiModel,
				value.model,
				value.displayName,
				value.name,
				value.label,
				value.version
			];
			for (const candidate of candidates) {
				if (typeof candidate === 'string') {
					const trimmed = typeof ZU !== 'undefined' && typeof ZU.trimInternal === 'function'
						? ZU.trimInternal(candidate)
						: candidate.trim();
					if (trimmed) {
						result = trimmed;
						break;
					}
				}
			}
		}
	}
	return result;
}

function cleanDate(value) {
	let result = null;
	if (value && typeof value === 'object' && value.data !== undefined) {
		result = cleanDate(value.data);
	}
	else if (value) {
		if (typeof value === 'string') {
			const trimmed = typeof ZU !== 'undefined' && typeof ZU.trimInternal === 'function'
				? ZU.trimInternal(value)
				: value.trim();
			if (trimmed) {
				const iso = typeof ZU !== 'undefined' && typeof ZU.strToISO === 'function'
					? ZU.strToISO(trimmed)
					: null;
				result = iso || trimmed;
			}
		}
		else if (typeof value === 'object') {
			if (value.date) {
				result = cleanDate(value.date);
			}
			else if (value.data && value.data.date) {
				result = cleanDate(value.data.date);
			}
		}
	}
	return result;
}

//#endregion


//////////////////////////////////////////////
//#region Library of Zotero Helper Functions//
//////////////////////////////////////////////

async function callAPI(doc, apiOptions = {}) {
	const start = Date.now();
	if (!apiOptions || !apiOptions.url) {
		throw new Error('callAPI requires an options object with a url property');
	}

	const normalizeAPIText = (value, contextLabel) => {
		let result = '';
		if (!value && value !== 0) {
			result = '';
		}
		else if (typeof value === 'string') {
			result = value;
		}
		else if (typeof value === 'number' || typeof value === 'boolean') {
			result = String(value);
		}
		else if (value instanceof ArrayBuffer) {
			try {
				result = new TextDecoder('utf-8').decode(value);
			}
			catch (err) {
				Zotero.debug(`${contextLabel || '[decode]'} TextDecoder error: ${err && err.message ? err.message : err}`, LOG_LEVEL_DEBUG);
				result = '';
			}
		}
		else if (value && typeof value === 'object') {
			const toUint8 = (input) => {
				if (!input) return null;
				if (typeof Uint8Array !== 'undefined' && input instanceof Uint8Array) {
					return input;
				}
				if (typeof ArrayBuffer !== 'undefined') {
					if (input instanceof ArrayBuffer) {
						return new Uint8Array(input);
					}
					if (ArrayBuffer.isView && ArrayBuffer.isView(input)) {
						try {
							return new Uint8Array(input.buffer, input.byteOffset || 0, input.byteLength || input.buffer.byteLength);
						}
						catch (_) {
							return new Uint8Array(input.buffer);
						}
					}
				}
				if (typeof input.byteLength === 'number') {
					try {
						return new Uint8Array(input);
					}
					catch (_) {}
				}
				if (input.buffer && typeof input.buffer.byteLength === 'number') {
					try {
						return new Uint8Array(input.buffer, input.byteOffset || 0, input.byteLength || input.buffer.byteLength);
					}
					catch (_) {
						return new Uint8Array(input.buffer);
					}
				}
				return null;
			};

			const view = toUint8(value);
			if (view) {
				if (view.length === 0) {
					result = '';
				}
				else if (typeof TextDecoder !== 'undefined') {
					try {
						result = new TextDecoder('utf-8').decode(view);
					}
					catch (err) {
						Zotero.debug(`${contextLabel || '[decode]'} TextDecoder error: ${err && err.message ? err.message : err}`, LOG_LEVEL_DEBUG);
						let fallback = '';
						for (let i = 0; i < view.length; i++) {
							fallback += String.fromCharCode(view[i]);
						}
						result = fallback;
					}
				}
				else {
					let fallback = '';
					for (let i = 0; i < view.length; i++) {
						fallback += String.fromCharCode(view[i]);
					}
					result = fallback;
				}
			}
			else if (typeof value.text === 'string') {
				result = value.text;
			}
			else if (value && value.body && typeof value.body === 'string') {
				result = value.body;
			}
			else if (value && value.body && value.body.data) {
				if (Array.isArray(value.body.data)) {
					result = value.body.data.join('\n');
				}
				else if (value.body.data instanceof ArrayBuffer) {
					result = normalizeAPIText(value.body.data, contextLabel);
				}
			}
			else if (value && value.message && typeof value.message === 'string') {
				result = value.message;
			}
			else if (value && value.error && typeof value.error === 'string') {
				result = value.error;
			}
			else if (value && value.raw) {
				result = normalizeAPIText(value.raw, contextLabel);
			}
			else if (typeof value.toString === 'function') {
				try {
					const str = value.toString();
					result = !isNullish(str) && str !== '[object Object]' ? str : '';
				}
				catch (_) {
					result = '';
				}
			}
			if (!result || (typeof result === 'string' && !result.trim())) {
				try {
					const jsonString = JSON.stringify(value);
					if (typeof jsonString === 'string'
			&& jsonString.length
			&& jsonString !== '{}'
			&& jsonString !== '[]') {
						result = jsonString;
					}
				}
				catch (err) {
					Zotero.debug(`${contextLabel || '[decode]'} JSON stringify error: ${err && err.message ? err.message : err}`, LOG_LEVEL_DEBUG);
				}
			}
			if (!result) {
				result = '';
			}
		}
		return result;
	};

	const safeJSONParseWithLabel = (text, parseLabel) => {
		const startParse = Date.now();
		let parsed = null;
		let errorMsg = null;
		if (typeof text === 'string') {
			const trimmed = text.trim();
			if (trimmed) {
				try {
					parsed = JSON.parse(trimmed);
				}
				catch (err) {
					errorMsg = err && err.message ? err.message : String(err);
				}
			}
		}
		const elapsedParse = Date.now() - startParse;
		if (errorMsg) {
			Zotero.debug(`[chatgpt:error][safeJSONParseWithLabel] fail cid=∅ path="${parseLabel || '∅'}" status=∅ ms=${elapsedParse} msg="${String(errorMsg).replace(/"/g, '\'')}"`, LOG_LEVEL_ERROR);
		}
		return parsed;
	};

	const target = apiOptions.url;
	const baseHref = doc && doc.location ? String(doc.location.href) : null;
	let targetURL;
	try {
		targetURL = new URL(target, baseHref || undefined).href;
	}
	catch (_) {
		targetURL = target;
	}

	const opts = Object.assign({ headers: {}, method: 'GET' }, apiOptions);
	if (isNullish(opts.credentials)) {
		opts.credentials = 'include';
	}

	const method = (opts.method || 'GET').toUpperCase();
	const headers = Object.assign({}, opts.headers || {});
	const allowBody = opts.allowBody !== undefined ? !!opts.allowBody : (method !== 'GET' && method !== 'HEAD');
	const body = allowBody && opts.body !== undefined ? opts.body : null;
	const label = opts.label || `[callAPI] ${method} ${targetURL}`;

	if (isNullish(opts.timeout)) {
		opts.timeout = ZOTERO_FETCH_DEFAULT_TIMEOUT_MS;
	}

	const wantsJSON = (() => {
		if (opts.responseType === 'json') return true;
		const accept = headers.Accept || headers.accept;
		if (accept && typeof accept === 'string' && accept.toLowerCase().includes('application/json')) {
			return true;
		}
		if (typeof opts.expectJSON === 'boolean') {
			return opts.expectJSON;
		}
		return false;
	})();

	const forceDefaultFallback = !!opts.forceDefaultViewFallback;
	const preferDefaultView = !!opts.preferDefaultView;
	const disableDefaultView = !!opts.disableDefaultViewFallback;

	const normalizeRaw = (value, contextLabel = label) => normalizeAPIText(value, contextLabel);
	const safeJSONParse = text => safeJSONParseWithLabel(text, label);

	if (ENABLE_VERBOSE_API_LOGGING) {
		let bodyForLog = null;
		if (allowBody && !isNullish(body)) {
			if (typeof body === 'string') {
				bodyForLog = body;
			}
			else if (body && typeof body === 'object') {
				try {
					bodyForLog = JSON.stringify(body);
				}
				catch (err) {
					bodyForLog = `[object ${body.constructor && body.constructor.name ? body.constructor.name : 'unknown'}]`;
				}
			}
			else {
				bodyForLog = String(body);
			}
		}
		const requestLog = {
			url: targetURL,
			method,
			headers,
			credentials: opts.credentials || null
		};
		if (!isNullish(bodyForLog)) {
			requestLog.body = bodyForLog;
		}
		try {
			Zotero.debug(`[api][callAPI] request detail ${JSON.stringify(requestLog)}`, LOG_LEVEL_DEBUG);
		}
		catch (err) {
			Zotero.debug(`[api][callAPI] request detail serialization error: ${err && err.message ? err.message : err}`, LOG_LEVEL_DEBUG);
		}
	}

	const expectJSONFromContentType = (contentType) => {
		if (typeof opts.expectJSON === 'boolean') {
			return opts.expectJSON;
		}
		if (wantsJSON) return true;
		return typeof contentType === 'string' && /\bapplication\/([a-z0-9.+-]*json)\b/i.test(contentType);
	};

	const buildResult = (status, rawCandidate, jsonCandidate, expectJSON, contentType, responseHeaders) => {
		const raw = normalizeRaw(rawCandidate);
		const ok = status >= 200 && status < 300;
		if (expectJSON) {
			const parsed = jsonCandidate !== undefined ? jsonCandidate : safeJSONParse(raw);
			if (parsed && typeof parsed === 'object') {
				return { ok, status, data: parsed, raw, contentType: contentType || null, headers: responseHeaders || null };
			}
			if (raw && typeof raw === 'string') {
				return { ok, status, data: raw, raw, contentType: contentType || null, headers: responseHeaders || null };
			}
			return { ok, status, data: parsed, raw, contentType: contentType || null, headers: responseHeaders || null };
		}
		return { ok, status, data: raw, raw, contentType: contentType || null, headers: responseHeaders || null };
	};

	const hasMeaningfulPayload = (result) => {
		if (!result) return false;
		if (typeof result.raw === 'string' && result.raw.length) return true;
		if (result.raw && typeof result.raw === 'object') return true;
		if (typeof result.data === 'string' && result.data.length) return true;
		if (result.data && typeof result.data === 'object') return true;
		return false;
	};

	const readStatus = source => (source && typeof source.status === 'number' ? source.status : 0);
	const readContentType = (source) => {
		if (!source) return null;
		if (typeof source.getResponseHeader === 'function') {
			const header = source.getResponseHeader('Content-Type');
			if (header) return header;
		}
		const sourceHeaders = source.headers;
		if (sourceHeaders && typeof sourceHeaders === 'object') {
			const targetHeader = 'content-type';
			for (const key of Object.keys(sourceHeaders)) {
				if (typeof key === 'string' && key.toLowerCase() === targetHeader) {
					const value = sourceHeaders[key];
					if (isNullish(value)) {
						return null;
					}
					return Array.isArray(value) ? value.join(',') : value;
				}
			}
		}
		return null;
	};

	const readBody = (source) => {
		if (!source) return null;
		if (typeof source.responseText === 'string') return source.responseText;
		if (typeof source.response === 'string') return source.response;
		if (source.body !== undefined) return source.body;
		if (source.response && typeof source.response === 'object') return source.response;
		return null;
	};

	const readHeaders = (source) => {
		if (!source) return null;
		const result = {};
		const record = (key, value) => {
			if (!key) return;
			const name = String(key).toLowerCase();
			if (!name) return;
			if (isNullish(value)) return;
			const valueStr = Array.isArray(value) ? value.join(',') : String(value);
			if (!valueStr) return;
			result[name] = valueStr;
		};
		const parseHeaderString = (raw) => {
			if (!raw || typeof raw !== 'string') return;
			const lines = raw.split(/\r?\n/);
			for (const line of lines) {
				if (!line) continue;
				const idx = line.indexOf(':');
				if (idx === -1) continue;
				const key = line.slice(0, idx);
				const value = line.slice(idx + 1).trim();
				record(key, value);
			}
		};
		try {
			if (typeof source.getAllResponseHeaders === 'function') {
				parseHeaderString(source.getAllResponseHeaders());
			}
		}
		catch (_) {}
		if (source.responseHeaders) {
			const headerSource = source.responseHeaders;
			if (typeof headerSource === 'string') {
				parseHeaderString(headerSource);
			}
			else if (typeof headerSource === 'object') {
				for (const [key, value] of Object.entries(headerSource)) {
					record(key, value);
				}
			}
		}
		const directHeaders = source.headers;
		if (directHeaders) {
			if (typeof directHeaders.entries === 'function') {
				try {
					for (const [key, value] of directHeaders.entries()) {
						record(key, value);
					}
				}
				catch (_) {}
			}
			else if (Array.isArray(directHeaders)) {
				for (const entry of directHeaders) {
					if (Array.isArray(entry) && entry.length >= 2) {
						record(entry[0], entry[1]);
					}
				}
			}
			else if (typeof directHeaders === 'object') {
				for (const [key, value] of Object.entries(directHeaders)) {
					record(key, value);
				}
			}
		}
		return Object.keys(result).length ? result : null;
	};

	let defaultViewAttempted = false;
	let defaultViewCached = null;
	const maybeRunDefaultViewFallback = async () => {
		if (disableDefaultView) {
			return null;
		}
		if (defaultViewAttempted) {
			return defaultViewCached;
		}
		defaultViewAttempted = true;

		const win = doc && doc.defaultView;
		if (!win || typeof win.fetch !== 'function') {
			Zotero.debug(`${label} default-view fetch unavailable`, LOG_LEVEL_DEBUG);
			defaultViewCached = null;
			return null;
		}

		const fetchLabel = `${label} (default-view fallback)`;
		const fetchOptions = {
			method,
			credentials: opts.credentials,
			headers: Object.assign({}, headers || {})
		};
		if (allowBody && !isNullish(body)) {
			fetchOptions.body = body;
		}

		try {
			const response = await win.fetch(targetURL, fetchOptions);
			let raw = '';
			if (typeof response.clone === 'function' && typeof response.arrayBuffer === 'function') {
				try {
					const buffer = await response.clone().arrayBuffer();
					raw = normalizeRaw(buffer, fetchLabel) || raw;
				}
				catch (err) {
					Zotero.debug(`[fetch] ${fetchLabel} arrayBuffer error: ${err && err.message}`, LOG_LEVEL_DEBUG);
				}
			}
			if (!raw && typeof response.text === 'function') {
				try {
					const text = await response.text();
					if (!isNullish(text)) {
						raw = text;
					}
				}
				catch (err) {
					Zotero.debug(`[fetch] ${fetchLabel} text error: ${err && err.message}`, LOG_LEVEL_DEBUG);
				}
			}
			if (!raw && typeof response.arrayBuffer === 'function' && !response.bodyUsed) {
				try {
					const buffer = await response.arrayBuffer();
					raw = normalizeRaw(buffer, fetchLabel) || raw;
				}
				catch (err) {
					Zotero.debug(`[fetch] ${fetchLabel} arrayBuffer fallback error: ${err && err.message}`, LOG_LEVEL_DEBUG);
				}
			}

			const fallback = {
				ok: !!response.ok,
				status: typeof response.status === 'number' ? response.status : 0,
				raw,
				contentType: response.headers && typeof response.headers.get === 'function'
					? response.headers.get('content-type')
					: null,
				headers: readHeaders(response)
			};
			const fallbackExpectJSON = expectJSONFromContentType(fallback.contentType);
			const fallbackParsed = fallbackExpectJSON ? safeJSONParse(fallback.raw) : fallback.raw;
			defaultViewCached = buildResult(fallback.status || 0, fallback.raw, fallbackParsed, fallbackExpectJSON, fallback.contentType, fallback.headers);
			return defaultViewCached;
		}
		catch (e) {
			Zotero.debug(`${fetchLabel} error: ${e && e.message}`, LOG_LEVEL_DEBUG);
			defaultViewCached = null;
			return null;
		}
	};

	const promoteResult = async (result, expectJSON) => {
		if (!result) return null;

		if (forceDefaultFallback || preferDefaultView) {
			const fallbackResult = await maybeRunDefaultViewFallback();
			if (fallbackResult && fallbackResult.ok) {
				if (preferDefaultView) {
					return fallbackResult;
				}
				if (hasMeaningfulPayload(fallbackResult)) {
					return fallbackResult;
				}
			}
		}

		if (!disableDefaultView && expectJSON && (!result.data || typeof result.data !== 'object')) {
			const fallbackResult = await maybeRunDefaultViewFallback();
			if (fallbackResult && fallbackResult.ok && hasMeaningfulPayload(fallbackResult)) {
				return fallbackResult;
			}
		}

		return result;
	};

	const finalizePayload = (payload) => {
		if (!payload) return null;
		const status = typeof payload.status === 'number' ? payload.status : 0;
		const contentType = payload.contentType || null;
		const expectJSON = expectJSONFromContentType(contentType);
		const raw = normalizeRaw(payload.raw);
		const responseHeaders = payload.headers || null;
		const seededJSON = payload.jsonCandidate !== undefined
			? payload.jsonCandidate
			: (expectJSON ? safeJSONParse(raw) : undefined);
		const ok = status >= 200 && status < 300;
		if (expectJSON) {
			if (seededJSON && typeof seededJSON === 'object') {
				return { ok, status, data: seededJSON, raw, contentType, headers: responseHeaders };
			}
			if (typeof seededJSON === 'string' && seededJSON.length) {
				return { ok, status, data: seededJSON, raw, contentType, headers: responseHeaders };
			}
			return { ok, status, data: seededJSON, raw, contentType, headers: responseHeaders };
		}
		return { ok, status, data: raw, raw, contentType, headers: responseHeaders };
	};

	const runTransport = async (transportName, transportLabel, runner) => {
		try {
			const payload = await runner();
			const result = finalizePayload(payload);
			if (!result) return null;
			const expectJSON = expectJSONFromContentType(result.contentType);
			const promoted = await promoteResult(result, expectJSON);
			return promoted;
		}
		catch (e) {
			const msg = `${transportLabel} error: ${e && e.message}`;
			if (transportName === 'pageXHR') {
				Zotero.debug(`[scaffoldFetch-xhr-error] ${targetURL}: ${e && e.message}`, LOG_LEVEL_DEBUG);
			}
			else {
				Zotero.debug(msg, LOG_LEVEL_DEBUG);
			}
			return null;
		}
	};

	const transports = [
		{
			name: 'ZU.request',
			label: `${label} via ZU.request`,
			runner: async () => {
				if (typeof ZU === 'undefined' || typeof ZU.request !== 'function') {
					return null;
				}
				const params = {
					method,
					headers,
					responseType: wantsJSON ? 'json' : 'text'
				};
				if (allowBody && !isNullish(body)) {
					params.body = body;
				}
				if (opts.timeout) {
					params.timeout = opts.timeout;
				}
				const resp = await ZU.request(targetURL, params);
				if (!resp) return null;
				return {
					status: readStatus(resp),
					raw: readBody(resp),
					contentType: readContentType(resp),
					headers: readHeaders(resp),
					jsonCandidate: resp && resp.responseJSON !== undefined ? resp.responseJSON : undefined
				};
			}
		},
		{
			name: 'Zotero.HTTP.request',
			label: `${label} via Zotero.HTTP.request`,
			runner: async () => {
				if (typeof Zotero === 'undefined' || !Zotero.HTTP || typeof Zotero.HTTP.request !== 'function') {
					return null;
				}
				const httpOpts = {
					headers,
					responseType: 'text'
				};
				if (allowBody && !isNullish(body)) {
					httpOpts.body = body;
				}
				if (opts.timeout) {
					httpOpts.timeout = opts.timeout;
				}
				const xhr = await Zotero.HTTP.request(method, targetURL, httpOpts);
				return {
					status: readStatus(xhr),
					raw: readBody(xhr),
					contentType: readContentType(xhr),
					headers: readHeaders(xhr)
				};
			}
		},
		{
			name: 'pageXHR',
			label: `${label} via page XHR`,
			runner: async () => {
				const win = doc && doc.defaultView;
				const XHR = (win && win.XMLHttpRequest) ? win.XMLHttpRequest : (typeof XMLHttpRequest !== 'undefined' ? XMLHttpRequest : null);
				if (!XHR) {
					return null;
				}
				const xhr = new XHR();
				xhr.open(method, targetURL, true);
				const useCredentials = opts.credentials !== 'omit';
				if ('withCredentials' in xhr) {
					xhr.withCredentials = useCredentials;
				}
				for (const [key, value] of Object.entries(headers)) {
					if (!isNullish(value)) {
						xhr.setRequestHeader(key, value);
					}
				}
				if (opts.timeout) {
					xhr.timeout = opts.timeout;
				}
				try {
					const response = await new Promise((resolve, reject) => {
						xhr.onload = () => resolve(xhr);
						xhr.onerror = () => reject(new Error('Network error'));
						xhr.onabort = () => reject(new Error('Request aborted'));
						const payload = allowBody && !isNullish(body) ? body : null;
						xhr.send(payload);
					});
					return {
						status: readStatus(response),
						raw: readBody(response),
						contentType: readContentType(response),
						headers: readHeaders(response)
					};
				}
				catch (err) {
					Zotero.debug(`${label} pageXHR error: ${err && err.message ? err.message : err}`, LOG_LEVEL_DEBUG);
					return null;
				}
			}
		}
	];

	let finalResult = null;
	for (const transport of transports) {
		const promoted = await runTransport(transport.name, transport.label, transport.runner);
		if (promoted) {
			finalResult = promoted;
			break;
		}
	}

	const elapsed = Date.now() - start;
	if (!finalResult) {
		Zotero.debug(`[chatgpt:error][callAPI] fail cid=∅ path="${targetURL}" status=0 ms=${elapsed} msg="no transport"`, LOG_LEVEL_ERROR);
		const fallback = { ok: false, status: 0, data: null, raw: '', contentType: null };
		return fallback;
	}

	if (ENABLE_VERBOSE_API_LOGGING) {
		if (finalResult.headers) {
			try {
				Zotero.debug(`[api][callAPI] response headers path="${targetURL}" ${JSON.stringify(finalResult.headers)}`, LOG_LEVEL_DEBUG);
			}
			catch (err) {
				Zotero.debug(`[api][callAPI] response headers serialization error: ${err && err.message ? err.message : err}`, LOG_LEVEL_DEBUG);
			}
		}
		if (!isNullish(finalResult.raw) && finalResult.raw !== '') {
			let rawOut = null;
			if (typeof finalResult.raw === 'string') {
				rawOut = finalResult.raw;
			}
			else {
				try {
					rawOut = JSON.stringify(finalResult.raw);
				}
				catch (err) {
					rawOut = `[unserializable raw: ${err && err.message ? err.message : err}]`;
				}
			}
			if (!isNullish(rawOut)) {
				Zotero.debug(`[api][callAPI] response raw path="${targetURL}" ${rawOut}`, LOG_LEVEL_DEBUG);
			}
		}
		else if (!isNullish(finalResult.data)) {
			let dataOut = null;
			if (typeof finalResult.data === 'string') {
				dataOut = finalResult.data;
			}
			else {
				try {
					dataOut = JSON.stringify(finalResult.data);
				}
				catch (err) {
					dataOut = `[unserializable data: ${err && err.message ? err.message : err}]`;
				}
			}
			if (!isNullish(dataOut)) {
				Zotero.debug(`[api][callAPI] response data path="${targetURL}" ${dataOut}`, LOG_LEVEL_DEBUG);
			}
		}
	}

	return finalResult;
}

//#endregion

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://chatgpt.com/share/68ec4fb0-fc34-8006-897a-627fe8caf2a3",
		"items": [
			{
				"itemType": "instantMessage",
				"title": "Test conversation translator",
				"creators": [
					{
						"creatorType": "author",
						"lastName": "ChatGPT",
						"fieldMode": 1
					},
					{
						"creatorType": "author",
						"lastName": "User",
						"fieldMode": 1
					}
				],
				"url": "https://chatgpt.com/share/68ec4fb0-fc34-8006-897a-627fe8caf2a3",
				"attachments": [
					{
						"title": "ChatGPT Conversation Snapshot",
						"snapshot": true,
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
