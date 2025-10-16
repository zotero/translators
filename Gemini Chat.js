{
	"translatorID": "6a86b35c-f06f-4c3a-a014-f7c1117c4ede",
	"label": "Gemini Chat",
	"creator": "Jacob J. Walker",
	"target": "^https?://gemini\\.google\\.com/(?:app(?:/c)?|share)/[A-Za-z0-9_-]",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-10-16 16:54:06"
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
 * The Gemini translator handles single private or shared Gemini conversations.
 *
 * For private conversations, it signs the user in via the Gemini MaZiqc API, retrieves summaries for title and date,
 * and then backfills the human author and model details from the live DOM when needed. The saved item always keeps the
 * private conversation snapshot (share lookups are not yet wired up in this refactor).
 *
 * For shared conversations, it extracts the visible metadata from the published page, including publish timestamps,
 * and attaches a snapshot that points at the shared URL.
 *
 * Gemini project dashboards are not yet supported.
 *
 */

/* AI Chat Translator Pattern *
 ******************************
 *
 * The shared translator pattern handles AI conversations by first determining the source context:
 *  - A private conversation ('private')
 *  - A shared conversation ('share')
 *
 * Depending on the source, the Gemini-specific behavior is:
 *
 * Private Conversation
 * --------------------
 * 1. Gather auth tokens from the Gemini page context and call the MaZiqc summary API for title/date details.
 * 2. Record the resolved conversation identifier so later DOM fallbacks align to the same chat.
 * 3. Fill any missing human author or model metadata from the live DOM when the API does not expose it.
 * 4. Keep the private conversation URL and attach a snapshot based on the currently viewed page.
 *
 * Shared Conversation
 * -------------------
 * 1. Parse the published share DOM for title, owner, model, and publish timestamps.
 * 2. Save the share URL as both the item URL and the snapshot target.
 *
 * Project dashboards will hook into the private flow once Gemini exposes stable project APIs.
 *
 */

/* Changelog
 *
 * - v1.0.5-rc: Adjusted MaZiqc pagination indentation to clear linter warnings.
 * - v1.0.4-rc: Restored shared conversation model capture logic after regression.
 * - v1.0.3-rc: Fixed shared conversation model extraction regression and resolved lints.
 * - v1.0.2-rc: Refactored private conversation summary retrieval to use the MaZiqc list helper.
 * - v1.0.1-rc: Resolved linter findings for the release candidate.
 * - v1.0.0-rc: Gemini Chat translator for Zotero.
 *              - Private conversations are snapshoted
 *              - Public Shared URLs only can get the metadata presented, which currently is not the date
 */

/////////////////////////////
//#region Global Constants //
/////////////////////////////

const VERSION = 'v1.0.5-rc';

const DEFAULT_ITEM_OBJECT = {
	itemType: 'instantMessage',
	title: 'Gemini Chat Conversation',
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
			lastName: 'Google Gemini',
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
			title: 'Gemini Chat Conversation Snapshot',
			url: '',
			snapshot: true,
			mimeType: 'application/xhtml+xml'
		}
	]
};


// Timeouts
const ZOTERO_FETCH_DEFAULT_TIMEOUT_MS = 7000;
const LIST_CONVERSATION_LIMIT = 100;

let GEMINI_BATCH_EXECUTE_REQ_COUNTER = Math.floor(Math.random() * 9000) + 1000;

// RegEx Patterns
const CONVERSATION_URL_REGEX = /https?:\/\/gemini\.google\.com\/app(?:\/c)?\/[A-Za-z0-9_-]+(?=($|[/?#]))/i;
const SHARED_URL_REGEX = /https?:\/\/gemini\.google\.com\/share\/[A-Za-z0-9_-]+(?=($|[/?#]))/i;
// TODO add const PROJECT_URL_REGEX when projects are supported by Gemini.
// TODO add const PROJECT_CONVERSATION_PATH_REGEX when projects are supported by Gemini.

// Logging Levels
const ENABLE_VERBOSE_API_LOGGING = false;
const ENABLE_VERBOSE_DOM_LOGGING = false;
const LOG_LEVEL_ERROR = 1;
const LOG_LEVEL_DEBUG = 4;

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

		// TODO add PROJECT_URL_REGEX detection when projects are supported by Gemini.

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
		// TODO add project selection handling when projects are supported by Gemini.
	}
	finally {
		const elapsed = Date.now() - start;
		const mode = detected === 'multiple' ? 'multiple' : 'single';
		Zotero.debug(`[flow:new][doWeb] done mode=${mode} url=${logURL || '∅'} ms=${elapsed}`, LOG_LEVEL_DEBUG);
	}
}

/**
 * @description Collects candidate items on search or listing pages so the user can pick which to save.
 * @param {Document} _doc - The page DOM.
 * @param {boolean} _checkOnly - When true, stop after confirming at least one result exists.
 * @returns {boolean | Object<string, string>} False when no results, true during checkOnly, or a map of URLs to titles.
 */
// eslint-disable-next-line no-unused-vars
function getSearchResults(_doc, _checkOnly) {
	// TODO reintroduce project search when projects are supported by Gemini.
	return false;
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

	const normalizeConversationID = (value) => {
		if (!value || typeof value !== 'string') {
			return null;
		}
		let trimmed = value.trim();
		if (!trimmed) {
			return null;
		}
		const match = trimmed.match(/(?:app(?:\/c)?|conversation|share)\/([A-Za-z0-9_-]+)/i);
		if (match && match[1]) {
			trimmed = match[1];
		}
		if (!/^[A-Za-z0-9_-]+$/.test(trimmed)) {
			return null;
		}
		const withPrefix = trimmed.startsWith('c_') ? trimmed : `c_${trimmed}`;
		return cleanConversationID(withPrefix);
	};

	const candidateSources = [];
	if (typeof url === 'string') {
		candidateSources.push(url);
	}
	if (doc && doc.location && typeof doc.location.href === 'string') {
		candidateSources.push(doc.location.href);
	}

	for (const candidate of candidateSources) {
		const normalized = normalizeConversationID(candidate);
		if (normalized) {
			result.conversationID = normalized;
			break;
		}
	}

	if (!result.conversationID && doc && typeof doc.querySelector === 'function') {
		const attrSelectors = [
			'[data-conversation-id]',
			'[data-conversationid]',
			'[data-test-id="conversation"]',
			'meta[name="conversation-id"]',
			'meta[name="conversationId"]',
			'meta[property="conversation-id"]',
			'meta[property="conversationId"]'
		];
		for (const selector of attrSelectors) {
			const node = doc.querySelector(selector);
			if (!node) continue;
			const raw = node.getAttribute('data-conversation-id')
				|| node.getAttribute('data-conversationid')
				|| node.getAttribute('data-conversation')
				|| node.getAttribute('data-test-conversation-id')
				|| node.getAttribute('content')
				|| node.getAttribute('value');
			const normalized = normalizeConversationID(raw || '');
			if (normalized) {
				result.conversationID = normalized;
				break;
			}
		}
	}

	const capturePromptID = (text) => {
		if (result.lastPromptID || !text || typeof text !== 'string') {
			return;
		}
		const matches = text.match(/r_[A-Za-z0-9]+/g);
		if (matches && matches.length) {
			result.lastPromptID = matches[matches.length - 1];
		}
	};

	const captureResponseID = (text) => {
		if (result.lastResponseID || !text || typeof text !== 'string') {
			return;
		}
		const matches = text.match(/rc_[A-Za-z0-9]+/g);
		if (matches && matches.length) {
			result.lastResponseID = matches[matches.length - 1];
		}
	};

	if (doc && typeof doc.querySelectorAll === 'function') {
		for (const node of doc.querySelectorAll('[jslog]')) {
			const payload = node.getAttribute('jslog');
			capturePromptID(payload);
			captureResponseID(payload);
			if (result.lastPromptID && result.lastResponseID) {
				break;
			}
		}

		if (!result.lastPromptID) {
			const promptNodes = doc.querySelectorAll(
				'[id^="message-content-id-r_"],'
				+ '[id^="model-response-message-contentr_"],'
				+ '[id^="message-content-r_"]'
			);
			for (const node of promptNodes) {
				const idAttr = node && node.getAttribute ? node.getAttribute('id') : null;
				if (idAttr) {
					capturePromptID(idAttr);
				}
				if (result.lastPromptID) {
					break;
				}
			}
		}

		if (!result.lastResponseID) {
			const draftNodes = doc.querySelectorAll('[data-test-draft-id^="rc_"]');
			for (const node of draftNodes) {
				const draftID = node && node.getAttribute ? node.getAttribute('data-test-draft-id') : null;
				if (draftID) {
					captureResponseID(draftID);
				}
				if (result.lastResponseID) {
					break;
				}
			}
		}

		if (!result.lastResponseID) {
			const responseAttrNodes = doc.querySelectorAll('[id*="rc_"]');
			for (const node of responseAttrNodes) {
				const idAttr = node && node.getAttribute ? node.getAttribute('id') : null;
				if (idAttr) {
					captureResponseID(idAttr);
				}
				if (result.lastResponseID) {
					break;
				}
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
		let trimmed = value.trim();
		if (!trimmed) {
			return null;
		}
		const match = trimmed.match(/\/share\/([A-Za-z0-9_-]+)(?=($|[/?#]))/i);
		if (match && match[1]) {
			trimmed = match[1];
		}
		if (!/^[A-Za-z0-9_-]+$/.test(trimmed)) {
			return null;
		}
		return trimmed;
	};

	const buildShareURL = (shareID, contextDoc) => {
		if (!shareID) {
			return null;
		}
		const origin = (() => {
			if (contextDoc && contextDoc.location && typeof contextDoc.location.origin === 'string' && contextDoc.location.origin) {
				return contextDoc.location.origin;
			}
			return 'https://gemini.google.com';
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
			{ selector: 'link[rel="canonical"]', attr: 'href', source: 'link[canonical]' },
			{ selector: 'a[data-share-url]', attr: 'data-share-url', source: 'a[data-share-url]' }
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

// TODO add function getProjectID when projects are supported by Gemini.
// TODO add function getProjectConversationIDs when projects are supported by Gemini.

async function getItem(doc, ids, source) {
	const item = new Zotero.Item(DEFAULT_ITEM_OBJECT.itemType);
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
			Zotero.debug(`[ai:error][getItem] auth fetch failed msg="${err && err.message ? err.message : err}"`, LOG_LEVEL_ERROR);
		}
	}

	if (Array.isArray(DEFAULT_ITEM_OBJECT.creators) && DEFAULT_ITEM_OBJECT.creators[0]) {
		item.creators.push(Object.assign({}, DEFAULT_ITEM_OBJECT.creators[0]));
	}
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
			const docIsShare = doc
				&& doc.location
				&& typeof doc.location.href === 'string'
				&& SHARED_URL_REGEX.test(doc.location.href);
			if ((needsHuman || needsModel) && !docIsShare) {
				domGetPrivateConversation(doc, ids, item, { needsHuman, needsModel });
			}
		}
		else if (source === 'project') {
			await apiGetPrivateConversation(doc, ids, source, item, auth);
		}
	}
	catch (err) {
		Zotero.debug(`[ai:error][getItem] ${source} pathway error msg="${err && err.message ? err.message : err}"`, LOG_LEVEL_ERROR);
	}

	if (source === 'share') {
		domGetSharedConversation(doc, ids, item);

		const defaultAICreator = Object.assign({}, DEFAULT_ITEM_OBJECT.creators[0]);
		if (item.creators.length) {
			item.creators[0] = defaultAICreator;
		}
		else {
			item.creators.push(defaultAICreator);
		}

		const secondCreator = item.creators.length > 1 ? item.creators[1] : null;
		const defaultSecond = (DEFAULT_ITEM_OBJECT.creators[1]
			&& typeof DEFAULT_ITEM_OBJECT.creators[1].lastName === 'string')
			? DEFAULT_ITEM_OBJECT.creators[1].lastName.trim().toLowerCase()
			: '';
		const hasRealHuman = !!(secondCreator
			&& ((secondCreator.firstName && secondCreator.firstName.trim())
				|| (secondCreator.lastName && secondCreator.lastName.trim()
					&& secondCreator.lastName.trim().toLowerCase() !== defaultSecond)));

		if (!hasRealHuman) {
			const anonymousCreator = {
				creatorType: 'author',
				lastName: 'Anonymous',
				fieldMode: 1
			};
			if (item.creators.length > 1) {
				item.creators[1] = anonymousCreator;
			}
			else {
				item.creators.push(anonymousCreator);
			}
		}
	}

	const documentURL = doc && doc.location && typeof doc.location.href === 'string'
		? doc.location.href
		: null;
	const conversationURL = (() => {
		if (ids && ids.conversationID) {
			const bareID = ids.conversationID.startsWith('c_') ? ids.conversationID.slice(2) : ids.conversationID;
			return `https://gemini.google.com/app/${bareID}`;
		}
		return null;
	})();
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
			Zotero.debug(`[ai:error][getItem] share list error msg="${err && err.message ? err.message : err}"`, LOG_LEVEL_ERROR);
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
			const bareID = ids.conversationID.startsWith('c_') ? ids.conversationID.slice(2) : ids.conversationID;
			item.url = `https://gemini.google.com/app/${bareID}`;
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
				: 'AI Conversation Snapshot',
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

async function apiGetAuth(doc, _ids, _source) {
	const start = Date.now();
	const origin = geminiResolveOrigin(doc);
	const context = geminiReadAuthContext(doc);
	let token = context.token;

	if (!token) {
		try {
			const response = await callAPI(doc, {
				url: `${origin}/app`,
				method: 'GET',
				headers: {
					Accept: 'text/html',
					'X-Same-Domain': '1'
				},
				timeout: ZOTERO_FETCH_DEFAULT_TIMEOUT_MS,
				responseType: 'text',
				preferDefaultView: true,
				label: '[gemini] GET /app'
			});
			if (response && response.ok) {
				const html = typeof response.data === 'string'
					? response.data
					: (typeof response.raw === 'string' ? response.raw : '');
				const fetchedToken = geminiExtractToken(html);
				if (fetchedToken) {
					token = fetchedToken;
				}
			}
		}
		catch (err) {
			const message = err && err.message ? err.message : err;
			Zotero.debug(`[api][gemini][apiGetAuth] fallback fetch error: ${message}`, LOG_LEVEL_ERROR);
		}
	}

	const result = {
		token: token || null,
		bl: context.bl || null,
		fSid: context.fSid || null,
		hl: context.hl || 'en',
		userName: context.userName || null,
		email: context.email || null
	};
	const elapsed = Date.now() - start;
	Zotero.debug(`[api][gemini][apiGetAuth] done token=${result.token ? 'yes' : 'no'} bl=${result.bl || '∅'} fsid=${result.fSid || '∅'} hl=${result.hl || '∅'} ms=${elapsed}`, LOG_LEVEL_DEBUG);
	return result;
}

async function apiGetPrivateConversation(doc, ids, source, item, authHint) {
	const start = Date.now();
	const pathway = source || '∅';
	const conversationID = geminiNormalizeConversationID(ids && ids.conversationID);
	if (!conversationID) {
		Zotero.debug(`[api][gemini][apiGetPrivateConversation][${pathway}] skip: no conversationID`, LOG_LEVEL_DEBUG);
		return null;
	}

	const auth = authHint || await apiGetAuth(doc, ids, source);
	if (!auth || !auth.token) {
		Zotero.debug(`[api][gemini][apiGetPrivateConversation][${pathway}] auth unavailable cid=${conversationID}`, LOG_LEVEL_ERROR);
		return null;
	}

	let summary = null;
	try {
		const conversationList = await apiGetPrivateConversationList(doc, ids, source, auth);
		if (conversationList instanceof Map && conversationList.size) {
			summary = conversationList.get(conversationID) || null;
		}
	}
	catch (err) {
		const message = err && err.message ? err.message : err;
		Zotero.debug(`[api][gemini][apiGetPrivateConversation][${pathway}] list fetch error msg="${String(message).replace(/"/g, '\'')}"`, LOG_LEVEL_ERROR);
	}

	if (!summary) {
		summary = await geminiFetchConversationSummary(doc, conversationID, auth);
	}

	if (!summary) {
		Zotero.debug(`[api][gemini][apiGetPrivateConversation][${pathway}] no summary returned cid=${conversationID}`, LOG_LEVEL_DEBUG);
		return null;
	}

	if (ids) {
		ids.conversationID = summary.cid || conversationID;
	}

	if (item) {
		if (!item.title && summary.title) {
			item.title = cleanTitle(summary.title) || summary.title;
		}
		if (!item.date) {
			let resolvedDate = null;
			if (summary.isoDate) {
				resolvedDate = cleanDate(summary.isoDate) || summary.isoDate;
			}
			else if (!isNullish(summary.timestampMs)) {
				const iso = geminiIsoDateFromTimestamp(summary.timestampMs);
				if (iso) {
					resolvedDate = cleanDate(iso) || iso;
				}
			}
			if (resolvedDate) {
				summary.isoDate = resolvedDate;
				item.date = resolvedDate;
			}
		}
	}

	const elapsed = Date.now() - start;
	Zotero.debug(`[api][gemini][apiGetPrivateConversation][${pathway}] ok cid=${summary.cid || conversationID} ms=${elapsed}`, LOG_LEVEL_DEBUG);
	return summary;
}

async function apiGetPrivateConversationList(doc, ids, source, authHint) {
	const start = Date.now();
	const pathway = source || '∅';
	const normalizedTarget = ids && ids.conversationID
		? geminiNormalizeConversationID(ids.conversationID)
		: null;

	const auth = authHint || await apiGetAuth(doc, ids, source);
	if (!auth || !auth.token) {
		Zotero.debug(`[api][gemini][apiGetPrivateConversationList][${pathway}] auth unavailable target=${normalizedTarget || '∅'}`, LOG_LEVEL_ERROR);
		return null;
	}

	const endpoint = geminiBuildBatchExecuteEndpoint(doc, auth);
	if (!endpoint) {
		Zotero.debug(`[api][gemini][apiGetPrivateConversationList][${pathway}] missing endpoint target=${normalizedTarget || '∅'}`, LOG_LEVEL_ERROR);
		return null;
	}

	const origin = geminiResolveOrigin(doc);
	const headers = {
		'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
		Origin: origin,
		Referer: `${origin}/app`,
		'X-Same-Domain': '1'
	};
	const token = auth.token;

	const result = new Map();

	const attempts = [
		{
			identifier: normalizedTarget ? `target-${normalizedTarget}` : 'sidebar-target',
			builder: pageToken => [[
				isNullish(pageToken) ? '' : pageToken,
				LIST_CONVERSATION_LIMIT,
				[[false, true, normalizedTarget ? normalizedTarget.replace(/^c_/, '') : '']]
			]],
			initialPage: ''
		},
		{
			identifier: 'generic-list',
			builder: pageToken => [
				LIST_CONVERSATION_LIMIT,
				pageToken === undefined ? null : pageToken,
				[0, null, 1]
			],
			initialPage: null
		}
	];

	for (const attempt of attempts) {
		const seen = new Set();
		let pageToken = attempt.initialPage;

		while (true) {
			const requestArgs = attempt.builder(pageToken);
			const body = geminiBuildMaZiqcRequestBody(requestArgs, token, attempt.identifier);
			if (!body) {
				break;
			}

			const response = await callAPI(doc, {
				url: endpoint,
				method: 'POST',
				headers,
				body,
				timeout: ZOTERO_FETCH_DEFAULT_TIMEOUT_MS,
				responseType: 'text',
				forceDefaultViewFallback: true,
				label: `[gemini][MaZiqc] ${attempt.identifier}`
			});

			if (!response || !response.ok) {
				break;
			}

			const payloadText = geminiExtractAPIResponseText(response, `[gemini][MaZiqc] ${attempt.identifier}`);
			if (!payloadText) {
				break;
			}

			const { summaries, nextPageToken } = geminiParseMaZiqcResponse(payloadText, `[gemini][MaZiqc] ${attempt.identifier}`);
			if (Array.isArray(summaries) && summaries.length) {
				for (const entry of summaries) {
					if (!entry) continue;
					const normalized = geminiNormalizeConversationID(entry.cid);
					if (!normalized) continue;
					const timestampMs = !isNullish(entry.timestampMs) ? entry.timestampMs : null;
					let isoDate = null;
					if (!isNullish(timestampMs)) {
						const rawIso = geminiIsoDateFromTimestamp(timestampMs);
						if (rawIso) {
							isoDate = cleanDate(rawIso) || rawIso;
						}
					}
					result.set(normalized, {
						cid: normalized,
						title: entry.title || null,
						timestampMs,
						isoDate
					});
				}
			}

			if (!nextPageToken || seen.has(nextPageToken)) {
				break;
			}
			seen.add(nextPageToken);
			pageToken = nextPageToken;
		}

		if (normalizedTarget && result.has(normalizedTarget)) {
			break;
		}
	}

	const elapsed = Date.now() - start;
	if (!result.size) {
		Zotero.debug(`[api][gemini][apiGetPrivateConversationList][${pathway}] empty result target=${normalizedTarget || '∅'} ms=${elapsed}`, LOG_LEVEL_DEBUG);
		return null;
	}

	Zotero.debug(`[api][gemini][apiGetPrivateConversationList][${pathway}] size=${result.size} target=${normalizedTarget || '∅'} ms=${elapsed}`, LOG_LEVEL_DEBUG);
	return result;
}

async function apiGetSharedConversationList(_doc, _ids, _source, _authHint) {
	Zotero.debug('[api][gemini][apiGetSharedConversationList] share list unsupported; returning null', LOG_LEVEL_DEBUG);
	return null;
}

async function apiGetProjectConversationList(doc, ids, source, authHint) { // eslint-disable-line no-unused-vars
	// TODO: Implement when Gemini projects are supported.
	return null;
}

function geminiExtractToken(source) {
	if (!source || typeof source !== 'string') {
		return null;
	}
	const match = /"SNlM0e":"([^"]+)"/.exec(source);
	return match && match[1] ? match[1] : null;
}

function geminiResolveOrigin(doc) {
	try {
		const href = doc && doc.location && typeof doc.location.href === 'string'
			? doc.location.href
			: null;
		if (href) {
			return new URL(href).origin;
		}
	}
	catch (_) {}
	return 'https://gemini.google.com';
}

function geminiReadAuthContext(doc) {
	const context = {
		token: null,
		bl: null,
		fSid: null,
		hl: 'en',
		userName: null,
		email: null
	};

	let html = '';
	try {
		html = doc && doc.documentElement ? String(doc.documentElement.innerHTML) : '';
	}
	catch (_) {
		html = '';
	}

	context.token = geminiExtractToken(html);

	const win = doc && doc.defaultView;
	const globalData = (() => {
		if (!win) return null;
		if (!isNullish(win.WIZ_global_data)) return win.WIZ_global_data;
		if (!isNullish(win.__WIZ_global_data)) return win.__WIZ_global_data;
		return null;
	})();

	const readGlobalValue = (key) => {
		if (!globalData) return null;
		const value = globalData[key];
		if (isNullish(value)) return null;
		if (typeof value === 'string') return value;
		if (typeof value === 'number') return String(value);
		return null;
	};

	if (!context.bl) {
		context.bl = readGlobalValue('cfb2h');
	}
	if (!context.fSid) {
		context.fSid = readGlobalValue('FdrFJe');
	}
	if (!context.hl) {
		context.hl = readGlobalValue('hl');
	}

	if (!context.bl) {
		const match = /"cfb2h":"([^"\\]+)"/.exec(html);
		if (match && match[1]) {
			context.bl = match[1];
		}
	}
	if (!context.fSid) {
		const match = /"FdrFJe":"([^"\\]+)"/.exec(html) || /"f\.sid":"([^"]+)"/.exec(html);
		if (match && match[1]) {
			context.fSid = match[1];
		}
	}
	if (!context.hl) {
		const match = /"hl":"([a-zA-Z-]+)"/.exec(html);
		if (match && match[1]) {
			context.hl = match[1];
		}
	}

	if (!context.hl && doc && doc.documentElement) {
		const domLang = doc.documentElement.lang || (typeof doc.documentElement.getAttribute === 'function'
			? doc.documentElement.getAttribute('lang')
			: null);
		if (domLang) {
			context.hl = domLang;
		}
	}

	if (!context.hl) {
		context.hl = 'en';
	}

	return context;
}

function geminiNormalizeConversationID(value) {
	if (!value || typeof value !== 'string') {
		return null;
	}
	let trimmed = value.trim();
	if (!trimmed) {
		return null;
	}
	if (!/^c_/i.test(trimmed)) {
		trimmed = `c_${trimmed.replace(/^c_/i, '')}`;
	}
	return cleanConversationID(trimmed);
}

function geminiIsoDateFromTimestamp(timestampMs) {
	if (!Number.isFinite(timestampMs)) {
		return null;
	}
	const date = new Date(timestampMs);
	if (!Number.isFinite(date.getTime())) {
		return null;
	}
	const pad = input => String(input).padStart(2, '0');
	const yyyy = date.getFullYear();
	const MM = pad(date.getMonth() + 1);
	const dd = pad(date.getDate());
	const hh = pad(date.getHours());
	const mm = pad(date.getMinutes());
	const ss = pad(date.getSeconds());
	const offsetMinutes = -date.getTimezoneOffset();
	const sign = offsetMinutes >= 0 ? '+' : '-';
	const abs = Math.abs(offsetMinutes);
	const tzh = pad(Math.floor(abs / 60));
	const tzm = pad(abs % 60);
	return `${yyyy}-${MM}-${dd}T${hh}:${mm}:${ss}${sign}${tzh}:${tzm}`;
}

async function geminiFetchConversationSummary(doc, targetCID, auth) {
	const normalizedTarget = geminiNormalizeConversationID(targetCID);
	const ids = normalizedTarget
		? { conversationID: normalizedTarget }
		: { conversationID: null };
	const list = await apiGetPrivateConversationList(doc, ids, 'private', auth);
	if (!list || !list.size) {
		return null;
	}

	if (normalizedTarget && list.has(normalizedTarget)) {
		return list.get(normalizedTarget);
	}

	for (const value of list.values()) {
		if (value) {
			return value;
		}
	}
	return null;
}

function geminiBuildBatchExecuteEndpoint(doc, auth, extraParams) {
	const origin = geminiResolveOrigin(doc);
	const params = new URLSearchParams();
	params.set('rpcids', 'MaZiqc');
	params.set('source-path', '/app');

	if (auth && auth.bl) {
		params.set('bl', String(auth.bl));
	}
	if (auth && auth.hl) {
		params.set('hl', String(auth.hl));
	}
	if (auth && auth.fSid) {
		params.set('f.sid', String(auth.fSid));
	}

	params.set('soc-app', '162');
	params.set('soc-platform', '1');
	params.set('soc-device', '1');
	params.set('_reqid', String(GEMINI_BATCH_EXECUTE_REQ_COUNTER++));
	params.set('rt', 'c');

	if (extraParams && typeof extraParams === 'object') {
		for (const [key, value] of Object.entries(extraParams)) {
			if (isNullish(value)) continue;
			params.set(key, String(value));
		}
	}

	return `${origin}/_/BardChatUi/data/batchexecute?${params.toString()}`;
}

function geminiBuildMaZiqcRequestBody(requestArgs, token, label) {
	if (!token || !Array.isArray(requestArgs)) {
		return null;
	}
	const entry = ['MaZiqc', JSON.stringify(requestArgs), null, label || 'MaZiqc'];
	const payload = JSON.stringify([[entry]]);
	return `f.req=${encodeURIComponent(payload)}&at=${encodeURIComponent(token)}`;
}

function geminiSafeJSONParse(value, label) {
	if (isNullish(value)) {
		return null;
	}
	if (typeof value !== 'string') {
		return typeof value === 'object' ? value : null;
	}
	const trimmed = value.trim();
	if (!trimmed) {
		return null;
	}
	try {
		return JSON.parse(trimmed);
	}
	catch (err) {
		const message = err && err.message ? err.message : err;
		const preview = trimmed.length > 200 ? `${trimmed.slice(0, 200)}…` : trimmed;
		Zotero.debug(`[api][gemini][MaZiqc] JSON parse failed label=${label || '∅'} msg="${String(message).replace(/"/g, '\'')}" preview="${preview.replace(/\s+/g, ' ')}"`, LOG_LEVEL_ERROR);
		return null;
	}
}

function geminiExtractAPIResponseText(apiResponse, label) {
	if (!apiResponse) {
		return '';
	}
	if (typeof apiResponse.raw === 'string' && apiResponse.raw) {
		return apiResponse.raw;
	}
	if (typeof apiResponse.data === 'string' && apiResponse.data) {
		return apiResponse.data;
	}
	const fallback = !isNullish(apiResponse.raw) ? apiResponse.raw : apiResponse.data;
	if (isNullish(fallback)) {
		return '';
	}
	if (typeof fallback === 'string') {
		return fallback;
	}
	if (fallback instanceof ArrayBuffer) {
		try {
			return new TextDecoder('utf-8').decode(fallback);
		}
		catch (err) {
			Zotero.debug(`${label || '[decode]'} TextDecoder error: ${err && err.message ? err.message : err}`, LOG_LEVEL_DEBUG);
			return '';
		}
	}
	if (typeof fallback === 'object') {
		if (typeof fallback.toString === 'function' && fallback.toString !== Object.prototype.toString) {
			try {
				const asString = fallback.toString();
				if (typeof asString === 'string' && asString && asString !== '[object Object]') {
					return asString;
				}
			}
			catch (_) {}
		}
		try {
			const json = JSON.stringify(fallback);
			return typeof json === 'string' ? json : '';
		}
		catch (_) {
			return '';
		}
	}
	return String(fallback);
}

function geminiParseMaZiqcResponse(payloadText, label) {
	const payloads = [];
	const parseJSON = value => geminiSafeJSONParse(value, label);

	if (typeof payloadText !== 'string' || !payloadText.length) {
		return { summaries: [], nextPageToken: null };
	}

	if (ENABLE_VERBOSE_API_LOGGING) {
		try {
			const preview = payloadText.slice(0, 240).replace(/\s+/g, ' ');
			Zotero.debug(`[api][gemini][MaZiqc] payload preview label=${label || '∅'} preview="${preview}"`, LOG_LEVEL_DEBUG);
		}
		catch (_) {}
	}

	let cursor = 0;
	const length = payloadText.length;
	let abortedToFallback = false;

	if (payloadText.startsWith(")]}'")) {
		const firstBreak = payloadText.indexOf('\n', cursor);
		cursor = firstBreak === -1 ? length : firstBreak + 1;
	}

	const collectPayload = (entry) => {
		if (!entry) return;
		if (Array.isArray(entry) && entry[0] === 'wrb.fr') {
			for (let i = 1; i < entry.length; i++) {
				const candidate = entry[i];
				if (!candidate) continue;
				if (typeof candidate === 'string') {
					const parsed = parseJSON(candidate);
					if (parsed) {
						payloads.push(parsed);
						break;
					}
				}
				else if (typeof candidate === 'object') {
					payloads.push(candidate);
					break;
				}
			}
			return;
		}
		if (Array.isArray(entry)) {
			for (const part of entry) {
				collectPayload(part);
			}
		}
	};

	while (cursor < length) {
		while (cursor < length && /\s/.test(payloadText[cursor])) {
			cursor++;
		}
		if (cursor >= length) break;

		if (!/[0-9]/.test(payloadText[cursor])) {
			break;
		}

		let lenStr = '';
		while (cursor < length && /[0-9]/.test(payloadText[cursor])) {
			lenStr += payloadText[cursor++];
		}
		if (!lenStr) {
			break;
		}

		const chunkLen = Number(lenStr);
		if (!Number.isFinite(chunkLen) || chunkLen <= 0) {
			while (cursor < length && payloadText[cursor] !== '\n') cursor++;
			if (cursor < length) cursor++;
			continue;
		}

		if (payloadText[cursor] === '\n') {
			cursor++;
		}

		if (cursor + chunkLen > length) {
			break;
		}

		const chunk = payloadText.slice(cursor, cursor + chunkLen);
		cursor += chunkLen;
		if (payloadText[cursor] === '\n') {
			cursor++;
		}

		const parsedChunk = parseJSON(chunk);
		if (!parsedChunk) {
			abortedToFallback = true;
			continue;
		}

		if (Array.isArray(parsedChunk)) {
			for (const entry of parsedChunk) {
				collectPayload(entry);
			}
		}
		else {
			collectPayload(parsedChunk);
		}
	}

	if (!payloads.length || abortedToFallback) {
		const lines = payloadText.split('\n');
		for (const line of lines) {
			const trimmed = line.trim();
			if (!trimmed || trimmed === ')]}\'') {
				continue;
			}
			const parsedLine = parseJSON(trimmed);
			if (!parsedLine) {
				continue;
			}
			if (Array.isArray(parsedLine)) {
				for (const entry of parsedLine) {
					collectPayload(entry);
				}
			}
			else {
				collectPayload(parsedLine);
			}
		}
	}

	const summaries = [];
	let nextPageToken = null;

	for (const payload of payloads) {
		if (!Array.isArray(payload)) continue;
		if (payload.length > 1 && typeof payload[1] === 'string' && !nextPageToken) {
			nextPageToken = payload[1];
		}
		const rows = Array.isArray(payload[2]) ? payload[2] : null;
		if (!rows || !rows.length) continue;
		for (const row of rows) {
			if (!Array.isArray(row) || row.length < 2) continue;
			const cid = typeof row[0] === 'string' ? row[0] : null;
			const title = typeof row[1] === 'string' ? row[1].trim() : null;
			const tsParts = Array.isArray(row[5]) ? row[5] : null;
			let timestampMs = null;
			if (tsParts && tsParts.length) {
				const seconds = Number(tsParts[0]);
				const nanos = tsParts.length > 1 ? Number(tsParts[1]) : 0;
				if (Number.isFinite(seconds)) {
					timestampMs = (seconds * 1000) + (Number.isFinite(nanos) ? Math.round(nanos / 1e6) : 0);
				}
			}
			summaries.push({
				cid,
				title,
				timestampMs
			});
		}
	}

	return { summaries, nextPageToken };
}

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

	if (needs && needs.needsHuman) {
		if (!item.creators[1]) {
			item.creators[1] = Object.assign({}, DEFAULT_ITEM_OBJECT.creators[1]);
		}

		const pickHumanCandidate = (value) => {
			if (!value || typeof value !== 'string') return null;
			const stripped = value
				.replace(/Google Account:\s*/i, '')
				.replace(/Signed in as\s*/i, '')
				.trim();
			if (!stripped) return null;
			const withoutParen = stripped.replace(/\s*\([^)]*\)\s*$/, '').trim();
			const firstLine = withoutParen.split(/\r?\n/).map(part => part.trim()).find(Boolean) || withoutParen;
			if (!firstLine) return null;
			if (/^(?:google\s+account|gemini)$/i.test(firstLine)) return null;
			if (/google\s+gemini/i.test(firstLine)) return null;
			const segments = firstLine
				.split(/[—–:|-]/)
				.map(part => part.trim())
				.filter(Boolean);
			return segments[0] || firstLine;
		};

		const applyHuman = (value, source) => {
			const candidate = pickHumanCandidate(value);
			if (!candidate) return false;
			const cleaned = cleanHumanAuthor(candidate);
			if (!cleaned) return false;
			item.creators[1] = cleaned;
			results.human = source;
			return true;
		};

		const ariaSelectors = [
			'[aria-label*="Google Account" i]',
			'[aria-label*="Signed in as" i]'
		];
		for (const selector of ariaSelectors) {
			const nodes = doc.querySelectorAll(selector);
			let matched = false;
			for (const node of nodes) {
				if (!node) continue;
				const aria = node.getAttribute && node.getAttribute('aria-label');
				if (aria && applyHuman(aria, `${selector}:aria`)) {
					matched = true;
					break;
				}
				const text = typeof node.textContent === 'string' ? node.textContent : null;
				if (text && applyHuman(text, `${selector}:text`)) {
					matched = true;
					break;
				}
			}
			if (matched) break;
		}

		if (!results.human) {
			const metaSelectors = [
				'meta[name="author"]',
				"meta[property='og:title']",
				"meta[name='twitter:title']",
				'meta[name="owner"]'
			];
			for (const selector of metaSelectors) {
				const node = doc.querySelector(selector);
				if (!node) continue;
				const candidate = node.getAttribute('content') || node.getAttribute('value');
				if (candidate && applyHuman(candidate, selector)) {
					break;
				}
			}
		}

		if (!results.human) {
			const profileNode = doc.querySelector('[data-test-id="profile-menu-username"], [data-test-id="profile-name"]');
			if (profileNode && typeof profileNode.textContent === 'string') {
				applyHuman(profileNode.textContent, 'dom:profile');
			}
		}

		if (!results.human && typeof doc.title === 'string') {
			applyHuman(doc.title, 'document.title');
		}
	}

	if (needs && needs.needsModel) {
		const coerceModelLabel = (value) => {
			if (!value || typeof value !== 'string') return null;
			const cleaned = value.trim().replace(/\s+/g, ' ');
			if (!cleaned) return null;
			const normalized = cleaned
				.replace(/^current model:\s*/i, '')
				.replace(/^model:\s*/i, '')
				.replace(/[.,;\s]+$/, '');
			if (!normalized || /^Gemini$/i.test(normalized)) {
				return null;
			}
			const paren = normalized.match(/\(([^)]+)\)/);
			if (paren && paren[1]) {
				const inside = paren[1].trim();
				if (inside) return inside;
			}
			const labeled = normalized.match(/(?:model|using|with)[:-]?\s*(Gemini[^|]+)/i);
			if (labeled && labeled[1]) {
				return labeled[1].trim();
			}
			const explicit = normalized.match(/Gemini\s+[A-Za-z0-9 .+-]+/);
			if (explicit && explicit[0]) {
				return explicit[0].trim();
			}
			const short = normalized.match(/\b(?:1(?:\.[0-9]+)?\s+(?:Pro|Flash|Nano)|Nano|Pro)\b/i);
			if (short && short[0]) {
				return short[0].trim();
			}
			return normalized;
		};

		const applyModel = (value, source) => {
			const candidate = coerceModelLabel(value);
			if (!candidate) return false;
			const cleaned = cleanAIModel(candidate);
			if (!cleaned) return false;
			const modelLine = `Model: ${cleaned}`;
			if (!item.extra) {
				item.extra = modelLine;
			}
			else if (!item.extra.split(/\r?\n/).includes(modelLine)) {
				item.extra = `${item.extra}\n${modelLine}`;
			}
			results.model = source;
			return true;
		};

		const selectors = [
			'[data-test-id="model-switcher"]',
			'[data-test-id="model-chip"]',
			'[data-test-id="model-pill"]',
			'[aria-label*="model" i]',
			'[title*="model" i]'
		];
		for (const selector of selectors) {
			const nodes = doc.querySelectorAll(selector);
			let matched = false;
			for (const node of nodes) {
				if (!node) continue;
				const aria = node.getAttribute && node.getAttribute('aria-label');
				if (aria && applyModel(aria, `${selector}:aria`)) {
					matched = true;
					break;
				}
				const title = node.getAttribute && node.getAttribute('title');
				if (title && applyModel(title, `${selector}:title`)) {
					matched = true;
					break;
				}
				const text = typeof node.textContent === 'string' ? node.textContent : null;
				if (text && applyModel(text, `${selector}:text`)) {
					matched = true;
					break;
				}
			}
			if (matched) break;
		}

		if (!results.model) {
			const metaSelectors = [
				'meta[name="model"]',
				'meta[name="ai-model"]',
				'meta[itemprop="softwareVersion"]',
				'meta[name="application-name"]'
			];
			for (const selector of metaSelectors) {
				const node = doc.querySelector(selector);
				if (!node) continue;
				const candidate = node.getAttribute('content') || node.getAttribute('value');
				if (candidate && applyModel(candidate, selector)) {
					break;
				}
			}
		}

		if (!results.model && typeof doc.title === 'string') {
			applyModel(doc.title, 'document.title');
		}
	}

	const elapsed = Date.now() - start;
	Zotero.debug(`[dom][domGetPrivateConversation] done human=${results.human || '∅'} model=${results.model || '∅'} ms=${elapsed}`, LOG_LEVEL_DEBUG);
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

	const summary = {};
	const results = { human: null, model: null };
	const pickFirst = (...values) => {
		for (const value of values.flat()) {
			if (isNullish(value)) continue;
			if (typeof value === 'string') {
				const trimmed = value.trim();
				if (trimmed) return trimmed;
			}
		}
		return null;
	};

	const appendExtraLine = (line) => {
		if (!line) return;
		const existing = item.extra ? item.extra.split(/\r?\n/) : [];
		if (existing.includes(line)) {
			return;
		}
		item.extra = existing.length ? `${item.extra}\n${line}` : line;
	};

	const metaContent = (selector) => {
		const node = doc.querySelector(selector);
		if (!node) return null;
		const content = node.getAttribute('content') || node.getAttribute('value');
		return typeof content === 'string' ? content : null;
	};

	const rawTitle = (() => {
		const metaTitle = pickFirst(
			metaContent("meta[property='og:title']"),
			metaContent("meta[name='twitter:title']")
		);
		if (metaTitle) return metaTitle;
		if (doc && typeof doc.title === 'string') {
			const stripped = doc.title.replace(/^Gemini\s*[-–:]\s*/i, '').trim();
			return stripped || doc.title;
		}
		return null;
	})();
	const titleCandidate = rawTitle ? cleanTitle(rawTitle) : null;
	if (titleCandidate) {
		item.title = titleCandidate;
		summary.title = titleCandidate;
	}

	const shareURL = pickFirst(
		(() => {
			const node = doc.querySelector('link[rel="canonical" i]');
			return node ? node.getAttribute('href') : null;
		})(),
		doc && doc.location && typeof doc.location.href === 'string' ? doc.location.href : null
	);
	if (shareURL) {
		const trimmed = shareURL.trim();
		if (trimmed) {
			summary.shareURL = trimmed;
			if (!item.url) {
				item.url = trimmed;
			}
			if (ids) {
				if (!ids.shareURL) {
					ids.shareURL = trimmed;
				}
				if (!ids.shareID) {
					const match = trimmed.match(/\/share\/([A-Za-z0-9_-]+)/i);
					if (match && match[1]) {
						ids.shareID = match[1];
					}
				}
			}
		}
	}

	if (ids && !ids.conversationID) {
		const conversationHint = getPrivateConversationIDs(doc, shareURL || null, null);
		if (conversationHint && conversationHint.conversationID) {
			ids.conversationID = conversationHint.conversationID;
		}
	}

	const pickHumanCandidate = (value) => {
		if (!value || typeof value !== 'string') return null;
		const stripped = value
			.replace(/Google Account:\s*/i, '')
			.replace(/Signed in as\s*/i, '')
			.trim();
		if (!stripped) return null;
		const withoutParen = stripped.replace(/\s*\([^)]*\)\s*$/, '').trim();
		const firstLine = withoutParen.split(/\r?\n/).map(part => part.trim()).find(Boolean) || withoutParen;
		if (!firstLine) return null;
		if (/^(?:google\s+account|gemini)$/i.test(firstLine)) return null;
		if (/google\s+gemini/i.test(firstLine)) return null;
		const segments = firstLine
			.split(/[—–:|-]/)
			.map(part => part.trim())
			.filter(Boolean);
		return segments[0] || firstLine;
	};

	const applyHuman = (value, source) => {
		const candidate = pickHumanCandidate(value);
		if (!candidate) return false;
		const cleaned = cleanHumanAuthor(candidate);
		if (!cleaned) return false;
		item.creators[1] = cleaned;
		summary.humanCreator = cleaned;
		results.human = source;
		return true;
	};

	const humanMetaSelectors = [
		"meta[name='author']",
		"meta[name='twitter:creator']",
		"meta[property='profile:username']",
		"meta[name='share-author']"
	];
	for (const selector of humanMetaSelectors) {
		const value = metaContent(selector);
		if (value && applyHuman(value, selector)) {
			break;
		}
	}

	if (!summary.humanCreator) {
		const ownerNode = doc.querySelector('[data-test-id="conversation-owner"], [data-test-id="profile-name"], [data-test-id="owner-name"]');
		if (ownerNode && typeof ownerNode.textContent === 'string') {
			applyHuman(ownerNode.textContent, 'dom:owner');
		}
	}

	if (!summary.humanCreator) {
		const description = metaContent("meta[property='og:description']") || metaContent("meta[name='description']");
		if (description) {
			const byMatch = description.match(/\bby\s+([^.,]+)/i);
			if (!(byMatch && applyHuman(byMatch[1], 'meta:description'))) {
				const withMatch = description.match(/\bwith\s+([^.,]+)/i);
				if (withMatch) {
					applyHuman(withMatch[1], 'meta:description');
				}
			}
		}
	}

	const aiAlias = cleanAIName(pickFirst(
		metaContent("meta[name='application-name']"),
		metaContent("meta[property='og:site_name']")
	));
	if (aiAlias) {
		summary.aiCreator = aiAlias;
	}

	const toIsoFromGeminiDate = (raw) => {
		if (!raw || typeof raw !== 'string') return null;
		const stripped = raw.replace(/^Published\s*/i, '').trim();
		if (!stripped) return null;
		const normalized = stripped.replace(/\s+at\s+/i, ' ');
		return cleanDate(normalized) || null;
	};

	const publishBlock = doc.querySelector('div.publish-time, [data-test-id="publish-time"]');
	if (publishBlock) {
		const publishMode = publishBlock.querySelector('.publish-time-mode');
		if (publishMode) {
			const modeSpan = publishMode.querySelector('[data-test-id="created-with-bard-mode-from-config"]');
			const modelStrong = modeSpan ? modeSpan.querySelector('strong') : null;
			const modelText = modelStrong && modelStrong.textContent ? modelStrong.textContent.trim() : null;
			const cleanedModel = modelText ? (cleanAIModel(modelText) || modelText) : null;
			if (cleanedModel) {
				const modelLine = `Model: ${cleanedModel}`;
				appendExtraLine(modelLine);
				if (!summary.aiModel) {
					summary.aiModel = cleanedModel;
				}
				if (!results.model) {
					results.model = 'dom:publish-time-mode';
				}
			}

			let createdDateText = null;
			const candidateSpans = Array.from(publishMode.querySelectorAll(':scope > span')).filter(span => span !== modeSpan);
			for (const span of candidateSpans) {
				const text = span && span.textContent ? span.textContent.trim() : '';
				if (text) {
					createdDateText = text;
					break;
				}
			}
			if (!createdDateText && publishMode.childNodes) {
				for (const node of publishMode.childNodes) {
					if (node === modeSpan) continue;
					if (node.nodeType === Node.TEXT_NODE) {
						const text = node.textContent ? node.textContent.trim() : '';
						if (text) {
							createdDateText = text;
							break;
						}
					}
				}
			}
			if (createdDateText) {
				const createdIso = toIsoFromGeminiDate(createdDateText);
				if (createdIso) {
					appendExtraLine(`Created: ${createdIso}`);
					summary.createdIso = createdIso;
				}
				else {
					appendExtraLine(`Created: ${createdDateText}`);
				}
			}
		}

		const publishedNode = publishBlock.querySelector('.publish-time-text');
		if (publishedNode) {
			const publishedText = publishedNode.textContent ? publishedNode.textContent.trim() : '';
			const publishedIso = toIsoFromGeminiDate(publishedText);
			if (publishedIso) {
				item.date = publishedIso;
				summary.publishedIso = publishedIso;
			}
		}
	}

	const elapsed = Date.now() - start;
	const loggedTitle = item.title ? item.title.replace(/"/g, '\\"') : '∅';
	Zotero.debug(`[dom][domGetSharedConversation] done title="${loggedTitle}" human=${results.human || '∅'} model=${results.model || '∅'} ms=${elapsed}`, LOG_LEVEL_DEBUG);
	return Object.keys(summary).length ? summary : null;
}

//TODO: Implement domGetProjectConversation

//TODO: Implement domGetPrivateConversationList

//TODO: Implement domGetSharedConversationList


//TODO: Implement domGetProjectConversationList(doc) {


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

			const base = trimmed.replace(/\s+\|\s*(AI)$/i, '').trim() || trimmed;
			const sanitized = base
				.replace(/^[\u200e\u200f\u202a-\u202e]+/, '')
				.replace(/[\u200e\u200f\u202a-\u202e]+$/, '')
				.trim();

			let result = sanitized
				.replace(/^(?:Google\s+)?Gemini\s*[-–—|:]\s*/i, '')
				.replace(/\s*[-–—|:]\s*(?:Google\s+)?Gemini$/i, '')
				.replace(/\s*\|\s*(?:Google\s+)?Gemini$/i, '')
				.trim();

			if (!result) {
				result = sanitized.replace(/\b(?:Google\s+)?Gemini\b/ig, '').trim();
			}

			return result || sanitized || null;
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
			|| lowered === 'ai'
			|| lowered === 'ai conversation') {
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
	const rejectIfAI = (input) => {
		if (!input) return null;
		const trimmed = typeof ZU !== 'undefined' && typeof ZU.trimInternal === 'function'
			? ZU.trimInternal(input)
			: String(input).trim();
		if (!trimmed) return null;
		const lowered = trimmed.toLowerCase();
		if (lowered === 'ai' || lowered === 'openai') {
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
			const trimmed = rejectIfAI(value);
			result = trimmed ? ZU.cleanAuthor(trimmed, 'author') : null;
		}
		else if (typeof value === 'object') {
			if (value.lastName || value.firstName) {
				result = Object.assign({ creatorType: 'author' }, value);
			}
			else if (typeof value.userName === 'string') {
				const trimmed = rejectIfAI(value.userName);
				result = trimmed ? ZU.cleanAuthor(trimmed, 'author') : null;
			}
			else if (typeof value.fullName === 'string') {
				const trimmed = rejectIfAI(value.fullName);
				result = trimmed ? ZU.cleanAuthor(trimmed, 'author') : null;
			}
			else if (typeof value.displayName === 'string') {
				const trimmed = rejectIfAI(value.displayName);
				result = trimmed ? ZU.cleanAuthor(trimmed, 'author') : null;
			}
			else if (typeof value.name === 'string') {
				const trimmed = rejectIfAI(value.name);
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
				const lowered = trimmed.toLowerCase();
				const isRelative = lowered.startsWith('today')
					|| lowered.startsWith('yesterday')
					|| lowered.startsWith('tomorrow')
					|| lowered.startsWith('right now')
					|| lowered.startsWith('just now')
					|| lowered.startsWith('now')
					|| /\bago\b/.test(lowered);
				if (isRelative) {
					return null;
				}
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
			Zotero.debug(`[ai:error][safeJSONParseWithLabel] fail cid=∅ path="${parseLabel || '∅'}" status=∅ ms=${elapsedParse} msg="${String(errorMsg).replace(/"/g, '\'')}"`, LOG_LEVEL_ERROR);
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
		Zotero.debug(`[ai:error][callAPI] fail cid=∅ path="${targetURL}" status=0 ms=${elapsed} msg="no transport"`, LOG_LEVEL_ERROR);
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
		"url": "https://gemini.google.com/share/88994295fbe1",
		"items": [
			{
				"itemType": "instantMessage",
				"title": "Zotero Connector Test Case",
				"creators": [
					{
						"firstName": "",
						"lastName": "Gemini",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"creatorType": "author",
						"lastName": "User",
						"fieldMode": 1
					}
				],
				"url": "https://gemini.google.com/share/88994295fbe1",
				"attachments": [
					{
						"title": "Gemini Chat Conversation Snapshot",
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
