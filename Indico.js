{
	"translatorID": "d9a8c2d5-5e8f-4b9a-9c6d-2f3a8b7c9d1e",
	"label": "Indico",
	"creator": "fkguo",
	"target": "^https?://.*indico.*/event/\\d+",
	"minVersion": "6.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-11-21 07:00:00"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2025 fkguo

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

/**
 * Helper function to get text from a CSS selector
 * @param {Document} doc - The document object
 * @param {string} selector - CSS selector
 * @returns {string|null} - Text content or null
 */
function getText(doc, selector) {
	let elem = doc.querySelector(selector);
	return elem ? ZU.trimInternal(elem.textContent) : null;
}

/**
 * Detect the type of page we're on
 * @param {Document} doc - The document object
 * @param {string} url - The current URL
 * @returns {string|boolean} - Item type or false
 */
function detectWeb(doc, url) {
	// Single contribution page (including attachment/material pages)
	// Also handles direct PDF links under contribution attachments if we can deduce the contribution URL
	if (url.match(/\/event\/\d+\/contributions?\/\d+/)) {
		return 'presentation';
	}
	// Event page with multiple contributions, timetable, or contributions list
	else if (url.match(/\/event\/\d+(\/timetable|\/contributions|\/overview)?\/?(\?|#|$)/)) {
		if (getSearchResults(doc, true)) {
			return 'multiple';
		}
		
		// Fallback: if it looks like an Indico event page (via meta tags), we can likely use the API
		// Look for Indico signature
		let isIndico = doc.querySelector('meta[property="og:site_name"][content="Indico"]')
			|| doc.querySelector('link[href*="indico.ico"]')
			|| (doc.title && doc.title.includes('Indico'));
					   
		if (isIndico) {
			return 'multiple';
		}
	}
	return false;
}

/**
 * Process and add a creator to the item
 * @param {Zotero.Item} item - The item to add the creator to
 * @param {string} name - The raw name string
 * @param {string} type - The creator type (e.g., 'presenter')
 */
function processCreator(item, name, type) {
	if (!name) return;

	// 1. Remove parentheses and their content
	let cleanName = name.replace(/\([^)]*\)/g, '');
	
	// 2. Remove titles (Prof., Dr., etc.)
	// Add more titles if needed. delimiting with word boundaries or spaces.
	cleanName = cleanName.replace(/\b(Prof|Dr|Mr|Mrs|Ms)\.?\s+/gi, '');
	
	cleanName = ZU.trimInternal(cleanName);
	if (!cleanName) return;

	// 3. Check for Chinese characters
	// Common CJK range
	if (/[\u4e00-\u9fa5]/.test(cleanName)) {
		item.creators.push({
			lastName: cleanName,
			creatorType: type,
			fieldMode: 1
		});
	} else {
		item.creators.push(ZU.cleanAuthor(cleanName, type, false));
	}
}

/**
 * Helper to clean LaTeX math in titles
 * @param {string} title - The original title
 * @returns {string} - Title with LaTeX converted to Unicode/Plain text where possible
 */
function cleanMathTitle(title) {
	if (!title) return "";
	
	let text = title;

	// Handle explicit LaTeX formatting commands
	text = text.replace(/\\(text|mathrm|bf|it)\{([^}]+)\}/g, '$2'); // Remove formatting wrappers
	
	// Superscripts
	text = text.replace(/\^\{([^}]+)\}/g, (match, content) => {
		content = cleanMathTitle(content);
		return `<sup>${content}</sup>`;
	});
	// Handle single char superscripts including special chars and commands
	const superscriptMap = {
		0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴',
		5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹',
		'+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
		n: 'ⁿ', i: 'ⁱ'
	};
	text = text.replace(/\^([0-9a-zA-Z+\-*])|\^\\(pm|mp)/g, (match, char, latex) => {
		if (char && superscriptMap[char]) return superscriptMap[char];
		if (char) return `<sup>${char}</sup>`;
		if (latex === 'pm') return '<sup>±</sup>';
		if (latex === 'mp') return '<sup>∓</sup>';
		return match;
	});

	// Subscripts
	text = text.replace(/_\{([^}]+)\}/g, (match, content) => {
		content = cleanMathTitle(content);
		return `<sub>${content}</sub>`;
	});
	// Handle single char subscripts including special chars and commands
	const subscriptMap = {
		0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄',
		5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉',
		'+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎',
		a: 'ₐ', e: 'ₑ', o: 'ₒ', x: 'ₓ', h: 'ₕ',
		k: 'ₖ', l: 'ₗ', m: 'ₘ', n: 'ₙ', p: 'ₚ',
		s: 'ₛ', t: 'ₜ'
	};
	text = text.replace(/_([0-9a-zA-Z+\-*])|\_\\(pm|mp)/g, (match, char, latex) => {
		if (char && subscriptMap[char]) return subscriptMap[char];
		if (char) return `<sub>${char}</sub>`;
		if (latex === 'pm') return '<sub>±</sub>';
		if (latex === 'mp') return '<sub>∓</sub>';
		return match;
	});
	
	// Greek letters (add more as needed)
	const greek = {
		'\\alpha': 'α', '\\beta': 'β', '\\gamma': 'γ', '\\delta': 'δ', '\\epsilon': 'ε',
		'\\zeta': 'ζ', '\\eta': 'η', '\\theta': 'θ', '\\iota': 'ι', '\\kappa': 'κ',
		'\\lambda': 'λ', '\\mu': 'μ', '\\nu': 'ν', '\\xi': 'ξ', '\\pi': 'π',
		'\\rho': 'ρ', '\\sigma': 'σ', '\\tau': 'τ', '\\upsilon': 'υ', '\\phi': 'φ',
		'\\chi': 'χ', '\\psi': 'ψ', '\\omega': 'ω',
		'\\Gamma': 'Γ', '\\Delta': 'Δ', '\\Theta': 'Θ', '\\Lambda': 'Λ', '\\Xi': 'Ξ',
		'\\Pi': 'Π', '\\Sigma': 'Σ', '\\Upsilon': 'Υ', '\\Phi': 'Φ', '\\Psi': 'Ψ', '\\Omega': 'Ω'
	};
	
	for (let [tex, char] of Object.entries(greek)) {
		// Replace whole word matches or distinct latex commands
		let re = new RegExp(tex.replace('\\', '\\\\') + '(?![a-zA-Z])', 'g');
		text = text.replace(re, char);
	}
	
	// Common particles and arrows
	text = text.replace(/\\to/g, '→')
		.replace(/\\rightarrow/g, '→')
		.replace(/\\leftarrow/g, '←')
		.replace(/\\longrightarrow/g, '⟶')
		.replace(/\\longleftarrow/g, '⟵')
		.replace(/\\infty/g, '∞')
		.replace(/\\approx/g, '≈')
		.replace(/\\simeq/g, '≃')
		.replace(/\\sim/g, '~')
		.replace(/\\times/g, '×')
		.replace(/\\pm/g, '±')
		.replace(/\\mp/g, '∓')
		.replace(/\\sqrt/g, '√')
		.replace(/\\partial/g, '∂')
		.replace(/\\nabla/g, '∇')
		.replace(/\\cdot/g, '⋅')
		.replace(/\\neq/g, '≠')
		.replace(/\\leq/g, '≤')
		.replace(/\\geq/g, '≥')
		.replace(/\\ll/g, '≪')
		.replace(/\\gg/g, '≫')
		.replace(/\\leftrightarrow/g, '↔')
		.replace(/\\ell/g, 'ℓ')
		.replace(/\\hbar/g, 'ℏ')
		.replace(/\\dagger/g, '†')
		.replace(/\\bar\{([^}]+)\}/g, '$1\u0304')
		.replace(/->/g, '→');
		
	// Cleanup standard e+e- notation specifically mentioned
	// e^{+}e^{-} -> e⁺e⁻
	// Handles $...$ wrappers
	text = text.replace(/\$([^$]+)\$/g, (match, content) => {
		// Remove internal spaces in math mode
		content = content.replace(/\s+/g, '');
		
		// Apply the same cleaning to content inside $...$
		// We recurse lightly or just apply same logic
		let clean = content.replace(/\^\{?\+?\}?/g, '⁺')
			.replace(/\^\{?-?\}?/g, '⁻')
			.replace(/e\^/g, 'e') // Catch e^+ cases processed above
			.replace(/\\/g, ''); // Remove remaining backslashes for simple commands
			
		return clean;
	});

	// Cleanup generic latex braces and dollars if any remain
	text = text.replace(/(\$|\\{|\\})/g, '');
	
	// Fix specific case: e+ e- usually implies e⁺ e⁻
	// This regex looks for 'e' followed immediately by + or -
	// But we already handled ^+ and ^- above. 
	// Handle explicit "e+" "e-" in text if they weren't latex
	// Careful not to replace regular words.
	
	return ZU.trimInternal(text);
}

/**
 * Get search results from pages with multiple contributions
 * @param {Document} doc - The document object
 * @param {boolean} checkOnly - Only check if results exist
 * @returns {Object|boolean} - Object of {url: title} pairs or boolean
 */
function getSearchResults(doc, checkOnly) {
	let items = {};
	let found = false;
	
	// Try multiple selectors to find contribution links
	let selectors = [
		'a[href*="/contributions/"]',           // Generic contribution links
		'.contribution-list a',                  // Contribution list items
		'.timetable-item a[href*="/contributions/"]',  // Timetable entries
		'td.contrib-title a',                   // Table-based contribution lists
		'.contrib-row a',                       // Row-based layouts
		'article.contribution a',               // Article-based layouts
		'.session-contrib a[href*="/contributions/"]',  // Session contribution links
		'.timetable-item .title a',             // Timetable title links
		'.entry-title a'                        // Generic entry title links
	];
	
	for (let selector of selectors) {
		let rows = doc.querySelectorAll(selector);
		
		for (let row of rows) {
			let href = row.href;
			
			// Filter out non-contribution links and ensure valid URL pattern
			// Also exclude attachments and materials
			if (!href || !href.match(/\/contributions?\/\d+/) || href.match(/\/attachments\/|\/material\/|\/materials\//)) continue;
			
			// Get title from link text or nearby elements
			let title = ZU.trimInternal(row.textContent);
			
			// If the link itself doesn't have good text, try to find a nearby title
			if (!title || title.length < 3) {
				let parentRow = row.closest('tr, li, .contribution, article, .timetable-item, .session-item, .entry, .row');
				if (parentRow) {
					let titleEl = parentRow.querySelector('.title, .contrib-title, .entry-title, h2, h3, h4, .name, span.text');
					if (titleEl) {
						title = ZU.trimInternal(titleEl.textContent);
					}
				}
			}
			
			if (!title || title.length < 3) continue;

			// Clean title Math/LaTeX
			title = cleanMathTitle(title);
			
			// Normalize the URL (remove trailing slashes and fragments)
			let normalizedUrl = href.split('#')[0].replace(/\/$/, '');
			
			// Avoid duplicate entries
			if (items[normalizedUrl]) continue;
			
			if (checkOnly) return true;
			found = true;
			items[normalizedUrl] = title;
		}
		
		// If we found items with this selector, no need to try others
		if (found) break;
	}
	
	return found ? items : false;
}

/**
 * Main function to handle web scraping
 * @param {Document} doc - The document object
 * @param {string} url - The current URL
 */
async function doWeb(doc, url) {
	let type = detectWeb(doc, url);
	if (type == 'multiple') {
		let items = getSearchResults(doc, false);
		
		// If we detected 'multiple' but found no items in DOM (e.g. React timetable),
		// try to fetch from API
		let eventDataForAttachments = null;
		if (!items) {
			let ids = extractIds(url);
			if (ids.eventId) {
				// Use the export API to get all contributions
				// We also need detailed contribution info (attachments) here if possible, 
				// but standard export API might not give full file details for all items without heavy payload.
				// Let's get the list first.
				let apiUrl = `${getBaseUrl(url)}/export/event/${ids.eventId}.json?detail=contributions`;
				try {
					let json = await requestJSON(apiUrl);
					if (json && (json.results || json.count)) {
						items = {};
						// Handle different API response structures
						eventDataForAttachments = json.results ? json.results[0] : json;
						if (eventDataForAttachments && eventDataForAttachments.contributions) {
							for (let c of eventDataForAttachments.contributions) {
								// Use title and ID to form a selection
								// URL might be in c.url
								if (c.url && c.title) {
									items[c.url] = cleanMathTitle(c.title);
								}
							}
						}
					}
				}
				catch (e) {
					Zotero.debug("Indico API fallback failed: " + e);
				}
			}
		}

		if (items && Object.keys(items).length > 0) {
			let selected = await Zotero.selectItems(items);
			if (selected) {
				for (let itemUrl of Object.keys(selected)) {
					// If we have the API data cached and it contains this contribution, use it to avoid extra requests
					// However, scrapeFromContributionJSON expects specific structure.
					// The 'eventDataForAttachments' might contain the contribution data we need.
					let cachedContrib = null;
					if (eventDataForAttachments && eventDataForAttachments.contributions) {
						let selectedId = extractIds(itemUrl).contribId;
						if (selectedId) {
							cachedContrib = eventDataForAttachments.contributions.find(c => String(c.id) === String(selectedId));
						}
					}

					if (cachedContrib) {
						// If we have cached data, we can potentially use it directly or pass it to scrape
						// But scrape() is designed to take a URL. 
						// Let's modify scrape to accept optional pre-loaded data or just let it re-fetch if robust.
						// To keep it simple and robust (and ensure full details), we call scrape(null, itemUrl)
						// which will try JSON/API fetch for that specific item.
						// The scrape() function already handles fetching JSON for a single item which includes attachments.
						await scrape(null, itemUrl);
					}
					else {
						await scrape(null, itemUrl);
					}
				}
			}
		}
	}
	else if (type == 'presentation') {
		// Check if this is a PDF file URL
		if (url.endsWith('.pdf') && url.includes('/attachments/')) {
			// Construct contribution URL from attachment URL
			// Format: .../event/123/contributions/456/attachments/789/1011/file.pdf
			let contribUrl = url.replace(/\/attachments\/.+/, '/');
			// Ensure it looks like a valid contribution URL
			if (contribUrl.match(/\/event\/\d+\/contributions?\/\d+\/?$/)) {
				await scrape(null, contribUrl);
				return;
			}
		}
		await scrape(doc, url);
	}
}

/**
 * Extract event ID and contribution ID from URL
 * @param {string} url - The URL to parse
 * @returns {Object} - Object with eventId and contribId
 */
function extractIds(url) {
	let eventMatch = url.match(/\/event\/(\d+)/);
	let contribMatch = url.match(/\/contributions?\/(\d+)/);
	
	return {
		eventId: eventMatch ? eventMatch[1] : null,
		contribId: contribMatch ? contribMatch[1] : null
	};
}

/**
 * Get base URL from full URL
 * @param {string} url - The full URL
 * @returns {string} - Base URL
 */
function getBaseUrl(url) {
	let urlObj = new URL(url);
	return `${urlObj.protocol}//${urlObj.host}`;
}

/**
 * Scrape contribution data from Indico page or API
 * @param {Document} [doc] - The document object (optional)
 * @param {string} url - The URL to scrape
 */
async function scrape(doc, url) {
	let ids = extractIds(url);
	let baseUrl = getBaseUrl(url);
	
	if (!ids.eventId || !ids.contribId) {
		Zotero.debug("Could not extract event ID or contribution ID from URL: " + url);
		return;
	}

	// Priority 1: Try direct Contribution JSON (e.g., .../contributions/123.json)
	// This is most accurate for single contribution metadata
	let jsonUrl = url.split('#')[0].split('?')[0].replace(/\/$/, '') + '.json';
	
	try {
		// When scraping from a list (doc is null), ensure we fetch the full contribution page or JSON
		// to get attachments if the initial JSON fails or is incomplete.
		let json = await requestJSON(jsonUrl);
		if (json && json.title) {
			// Contribution JSON usually contains materials/folders with attachments
			await scrapeFromContributionJSON(json, doc, url, baseUrl, ids);
			return;
		}
	}
	catch (e) {
		Zotero.debug("Direct contribution JSON failed: " + e);
	}
	
	// Priority 2: Try old Indico Export API
	// Indico API endpoint format: /export/event/{event_id}.json?detail=contributions
	let apiUrl = `${baseUrl}/export/event/${ids.eventId}.json?detail=contributions&pretty=yes`;
	
	try {
		let json = await requestJSON(apiUrl);
		await scrapeFromAPI(json, url, baseUrl, ids);
	}
	catch (e) {
		Zotero.debug("API request failed, falling back to HTML scraping: " + e);
		// Fallback to HTML scraping
		// If doc is null (batch mode), we MUST fetch the individual contribution page
		if (!doc) {
			try {
				doc = await requestDocument(url);
			}
			catch (e2) {
				Zotero.debug("Could not fetch contribution page: " + e2);
				return;
			}
		}
		await scrapeFromHTML(doc, url, baseUrl, ids);
	}
}

/**
 * Scrape data from direct Contribution JSON
 * @param {Object} json - The JSON object
 * @param {Document} [doc] - The document object
 * @param {string} url - The URL
 * @param {string} baseUrl - Base URL
 * @param {Object} ids - IDs
 */
async function scrapeFromContributionJSON(json, doc, url, baseUrl, ids) {
	let item = new Zotero.Item('presentation');
	
	// Title
	item.title = cleanMathTitle(json.title);
	
	// Date
	if (json.start_dt) {
		item.date = ZU.strToISO(json.start_dt);
	}
	else if (json.date) {
		item.date = ZU.strToISO(json.date);
	}
	
	// Presenters / Authors
	// Look for persons list
	let persons = json.persons || json.presenters || json.speakers || [];
	if (persons.length > 0) {
		for (let person of persons) {
			// Prefer speakers, but if no info, take all
			if (person.is_speaker || persons.length === 1 || !persons.some(p => p.is_speaker)) {
				let firstName = person.first_name || person.firstName;
				let lastName = person.last_name || person.lastName;
				let fullName = person.full_name || person.fullName || person.name;
				
				if (!fullName && firstName && lastName) {
					fullName = `${firstName} ${lastName}`;
				}
				
				if (fullName) {
					processCreator(item, fullName, 'presenter');
				}
				else if (firstName && lastName) {
					// Fallback if fullName construction failed for some reason (though above covers it)
					// or if we want to keep separate fields (but we want to process them)
					// Constructing full name is safer for uniform processing
					processCreator(item, `${firstName} ${lastName}`, 'presenter');
				}
			}
		}
	}
	
	// Place
	let placeParts = [];
	if (json.venue_name) placeParts.push(json.venue_name);
	if (json.room_name) placeParts.push(json.room_name);
	if (json.location) placeParts.push(json.location);
	if (json.address) placeParts.push(json.address);
	
	if (placeParts.length > 0) {
		item.place = placeParts.join(', ');
	}
	
	// Abstract
	if (json.description) {
		// Description often contains HTML
		item.abstractNote = ZU.cleanTags(json.description);
	}
	
	// Meeting Name
	// Usually not in contribution JSON, try to get from doc or fallback
	if (doc) {
		// Try to find event title in HTML
		let eventTitleEl = doc.querySelector('.event-title a, .breadcrumb .event, .page-title .event, h1[itemprop="name"]');
		if (eventTitleEl) {
			item.meetingName = ZU.trimInternal(eventTitleEl.textContent);
		}
		// Fallback: page title often is "Contribution Title | Event Title"
		if (!item.meetingName) {
			let pageTitle = doc.querySelector('title');
			if (pageTitle) {
				let titleParts = pageTitle.textContent.split('|');
				if (titleParts.length > 1) {
					// The event title is usually the last or second to last part
					// e.g. "My Talk | My Conference | Indico"
					let candidate = ZU.trimInternal(titleParts[titleParts.length - 1]);
					if (candidate === 'Indico' && titleParts.length > 2) {
						candidate = ZU.trimInternal(titleParts[titleParts.length - 2]);
					}
					if (candidate !== 'Indico') {
						item.meetingName = candidate;
					}
				}
			}
		}
	}
	
	// If still no meeting name, try to fetch basic event info
	if (!item.meetingName) {
		try {
			let eventJsonUrl = `${baseUrl}/export/event/${ids.eventId}.json`;
			let eventJson = await requestJSON(eventJsonUrl);
			if (eventJson && eventJson.results && eventJson.results[0] && eventJson.results[0].title) {
				item.meetingName = eventJson.results[0].title;
			}
		}
		catch (e) {
			// Ignore
		}
	}
	
	// Attachments
	// The contribution JSON might contain folders/files
	let folders = json.folders || json.files || [];
	if (folders.length > 0) {
		for (let folder of folders) {
			let attachments = folder.attachments || folder.files || [];
			for (let att of attachments) {
				let attUrl = att.download_url || att.url;
				let attTitle = att.title || att.filename || 'Attachment';
				if (attUrl) {
					item.attachments.push({
						title: attTitle,
						url: attUrl,
						mimeType: att.content_type || 'application/pdf'
					});
				}
			}
		}
	}
	
	// If no attachments found in JSON, try to scrape them from HTML page if doc is not provided
	if (item.attachments.length === 0 && !doc) {
		try {
			doc = await requestDocument(url);
		}
		catch (e) {
			Zotero.debug("Could not fetch contribution page for attachments: " + e);
		}
	}

	// If no attachments found in JSON but we have doc, scrape them from HTML
	if (item.attachments.length === 0 && doc) {
		// Look for attachment links specifically in the contribution content area
		// Typically found in .contribution-display or similar containers to avoid event-level attachments
		let container = doc.querySelector('.contribution-display, .contribution-content, .page-content, main');
		if (container) {
			let attachmentLinks = container.querySelectorAll('a[href*="/attachments/"], a[href*="/material/"], a.attachment-link');
			for (let link of attachmentLinks) {
				let attachUrl = link.href;
				let attachTitle = ZU.trimInternal(link.textContent) || 'Attachment';
				
				// Verify it's a contribution attachment (has contribId in URL)
				// Event attachments: /event/123/attachments/...
				// Contribution attachments: /event/123/contributions/456/attachments/...
				if (attachUrl && (attachUrl.includes(`/contributions/${ids.contribId}/`) || attachUrl.includes(`/contribution/${ids.contribId}/`))
					&& (attachUrl.includes('.pdf') || attachUrl.includes('/attachments/') || attachUrl.includes('/material/'))) {
					
					// Avoid dupes if possible
					if (!item.attachments.some(a => a.url === attachUrl)) {
						item.attachments.push({
							title: attachTitle,
							url: attachUrl,
							mimeType: 'application/pdf'
						});
					}
				}
			}
		}
	}
	
	// Snapshot
	if (doc) {
		item.attachments.push({
			title: 'Snapshot',
			document: doc,
			mimeType: 'text/html'
		});
	}
	
	item.url = url;
	item.complete();
}

/**
 * Scrape data from Indico API response
 * @param {Object} json - The API response JSON
 * @param {string} url - The original URL
 * @param {string} baseUrl - Base URL of the Indico instance
 * @param {Object} ids - Event and contribution IDs
 */
async function scrapeFromAPI(json, url, baseUrl, ids) {
	let item = new Zotero.Item('presentation');
	
	// Navigate to the contribution data in the JSON structure
	let contribution = null;
	let event = null;
	
	// Indico API can return different structures
	if (json.results && json.results.length > 0) {
		event = json.results[0];
	}
	else if (json.count !== undefined) {
		// Sometimes the event is directly in the json object
		event = json;
	}
	
	if (event && event.contributions) {
		// Find the specific contribution by ID (convert both to strings for comparison)
		contribution = event.contributions.find(c => String(c.id) === String(ids.contribId));
	}
	
	if (contribution) {
		// Title
		item.title = cleanMathTitle(contribution.title || '');
		
		// Presenters/Speakers - try multiple field names
		let speakers = contribution.speakers || contribution.presenters || contribution.authors || [];
		if (speakers && speakers.length > 0) {
			for (let speaker of speakers) {
				// Try different name field formats
				let name = speaker.fullName || speaker.full_name || speaker.name || '';
				if (!name && speaker.first_name && speaker.last_name) {
					name = `${speaker.first_name} ${speaker.last_name}`;
				}
				if (!name && speaker.firstName && speaker.lastName) {
					name = `${speaker.firstName} ${speaker.lastName}`;
				}
				
				if (name) {
					processCreator(item, name, 'presenter');
				}
			}
		}
		
		// Date - try multiple field names
		let dateStr = contribution.startDate || contribution.start_date || contribution.date;
		if (dateStr) {
			item.date = ZU.strToISO(dateStr);
		}
		
		// Meeting/Conference name
		if (event.title) {
			item.meetingName = event.title;
		}
		
		// Place/Location - combine multiple location fields
		let locationParts = [];
		
		if (contribution.location || event.location) {
			locationParts.push(contribution.location || event.location);
		}
		if (contribution.roomFullname || contribution.room_fullname || contribution.room) {
			locationParts.push(contribution.roomFullname || contribution.room_fullname || contribution.room);
		}
		if (contribution.address || event.address) {
			locationParts.push(contribution.address || event.address);
		}
		
		if (locationParts.length > 0) {
			item.place = locationParts.join(', ');
		}
		
		// Abstract/Description
		if (contribution.description) {
			item.abstractNote = ZU.cleanTags(contribution.description);
		}
		
		// Attachments - try multiple field names
		let folders = contribution.folders || contribution.materials || contribution.attachments || [];
		if (folders && folders.length > 0) {
			for (let folder of folders) {
				let attachmentList = folder.attachments || folder.resources || [];
				if (attachmentList && attachmentList.length > 0) {
					for (let attachment of attachmentList) {
						let attachUrl = attachment.download_url || attachment.url;
						let attachTitle = attachment.title || attachment.filename || attachment.name || 'Attachment';
						let mimeType = attachment.content_type || attachment.type || 'application/pdf';
						
						if (attachUrl) {
							item.attachments.push({
								title: attachTitle,
								url: attachUrl,
								mimeType: mimeType
							});
						}
					}
				}
			}
		}
		
		// Add snapshot
		item.attachments.push({
			title: 'Snapshot',
			document: await requestDocument(url),
			mimeType: 'text/html'
		});
		
		// URL
		item.url = url;
		
		item.complete();
	}
	else {
		// If we couldn't find the contribution in the API response, fall back to HTML
		Zotero.debug("Could not find contribution in API response, falling back to HTML");
		let doc = await requestDocument(url);
		await scrapeFromHTML(doc, url, baseUrl, ids);
	}
}

/**
 * Scrape data from HTML when API is not available
 * @param {Document} doc - The document object
 * @param {string} url - The original URL
 * @param {string} baseUrl - Base URL of the Indico instance
 * @param {Object} ids - Event and contribution IDs
 */
async function scrapeFromHTML(doc, url, baseUrl, ids) {
	let item = new Zotero.Item('presentation');
	
	// Title - try multiple selectors
	// Priority: Contribution title -> H1 -> Page Title
	let title = getText(doc, 'h1.contribution-title')
		|| getText(doc, '.item-title')
		|| getText(doc, '.contribution-title')
		|| getText(doc, 'h1[itemprop="name"]')
		// Support for older Indico versions / Standard theme
		|| getText(doc, '.conference-page .title h2')
		|| getText(doc, '.title-with-actions h2')
		|| getText(doc, '.conference-page .title .text')
		|| getText(doc, '.conference-page .title');
		
	if (!title) {
		let h1 = getText(doc, 'h1');
		if (h1 && !h1.includes('Indico')) {
			title = h1;
		}
	}
	
	item.title = cleanMathTitle(title || '');
	
	// Presenters/Speakers
	// Look for speaker list specifically to avoid confusion with other names
	let speakerElements = doc.querySelectorAll('.speaker-list .speaker-item, .speaker-list a, .contribution-speakers .speaker-name, .presenter-list .name');
	
	if (speakerElements.length === 0) {
		// Fallback: try searching for "Speaker" label
		let labels = doc.querySelectorAll('dt, .label, strong');
		for (let label of labels) {
			if (label.textContent.includes('Speaker') || label.textContent.includes('Presenter')) {
				let value = label.nextElementSibling || label.parentElement.querySelector('dd, .value');
				if (value) {
					let name = ZU.trimInternal(value.textContent);
					processCreator(item, name, 'presenter');
				}
			}
		}
	}
	else {
		for (let speakerEl of speakerElements) {
			// For older Indico, .speaker-item might contain "Prof. Name"
			// We try to extract the name part if possible, but cleanAuthor handles most prefixes
			let name = ZU.trimInternal(speakerEl.textContent);
			processCreator(item, name, 'presenter');
		}
	}
	
	// Date
	// Try meta tags first, then visible elements
	let dateEl = doc.querySelector('meta[itemprop="startDate"]');
	if (dateEl) {
		item.date = ZU.strToISO(dateEl.content);
	}
	else {
		dateEl = doc.querySelector('.contribution-date, .datetime, time, [datetime], .date, .time-info');
		if (dateEl) {
			let dateText = dateEl.getAttribute('datetime') || dateEl.textContent;
			if (dateText) {
				item.date = ZU.strToISO(dateText);
			}
		}
	}
	
	// Place/Location
	let locationEl = doc.querySelector('.contribution-location, .location, .room, .venue');
	if (locationEl) {
		item.place = ZU.trimInternal(locationEl.textContent);
	}
	
	// Meeting/Conference name
	let eventTitleEl = doc.querySelector('.event-title a, .breadcrumb .event, .page-title .event, .confTitle .conference-title-link span[itemprop="title"]');
	if (eventTitleEl) {
		item.meetingName = ZU.trimInternal(eventTitleEl.textContent);
	}
	// Fallback: try to get from page title
	if (!item.meetingName) {
		let pageTitle = doc.querySelector('title');
		if (pageTitle) {
			let titleParts = pageTitle.textContent.split('|');
			if (titleParts.length > 1) {
				// Usually the event name is the 2nd to last part
				let candidate = ZU.trimInternal(titleParts[titleParts.length - 1]);
				if (candidate === 'Indico' && titleParts.length > 2) {
					candidate = ZU.trimInternal(titleParts[titleParts.length - 2]);
				}
				if (candidate !== 'Indico') {
					item.meetingName = candidate;
				}
			}
		}
	}
	
	// Abstract
	let abstractEl = doc.querySelector('.contribution-description, .description, .abstract, [itemprop="description"]');
	if (abstractEl) {
		item.abstractNote = ZU.trimInternal(abstractEl.textContent);
	}
	
	// Attachments
	let attachmentLinks = doc.querySelectorAll('a[href*="/attachments/"], a[href*="/material/"], a.attachment-link, a[href$=".pdf"]');
	for (let link of attachmentLinks) {
		let attachUrl = link.href;
		let attachTitle = ZU.trimInternal(link.textContent) || 'Attachment';
		
		// Only include attachments that belong to this specific contribution
		// Pattern: .../contributions/{id}/...
		if (attachUrl
			&& (attachUrl.includes(`/contributions/${ids.contribId}/`) || attachUrl.includes(`/contribution/${ids.contribId}/`))
			&& (attachUrl.includes('/attachments/') || attachUrl.includes('/material/'))) {
			
			item.attachments.push({
				title: attachTitle,
				url: attachUrl,
				mimeType: 'application/pdf'
			});
		}
	}
	
	// Always add snapshot
	item.attachments.push({
		title: 'Snapshot',
		document: doc,
		mimeType: 'text/html'
	});
	
	// URL
	item.url = url;
	
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://indico.cern.ch/event/1339154/timetable/#20251110.detailed",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://indico.cern.ch/event/1539475/contributions/6775678/",
		"items": [
			{
				"itemType": "presentation",
				"title": "The J/ψJ/ψ-nucleon interaction mechanism: A theoretical study based on  scattering length",
				"creators": [
					{
						"firstName": "Feng-Kun",
						"lastName": "Guo",
						"creatorType": "presenter"
					}
				],
				"date": "2025-11-18",
				"meetingName": "Quarkonium Working Group Workshop",
				"place": "CERN, 500/1-001 - Main Auditorium",
				"shortTitle": "The J/ψJ/ψ-nucleon interaction mechanism",
				"url": "https://indico.cern.ch/event/1539475/contributions/6775678/",
				"attachments": [
					{
						"title": "QWG17 at CERN poster",
						"mimeType": "application/pdf"
					},
					{
						"title": "JpsiNucleon_QWG_FKGuo.pdf",
						"mimeType": "application/pdf"
					},
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
		"url": "https://indico.cern.ch/event/1539475/timetable/#20251117.detailed",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://indico.itp.ac.cn/event/324/contributions/2059/",
		"items": [
			{
				"itemType": "presentation",
				"title": "格点QCD进展综述",
				"creators": [
					{
						"lastName": "川 刘",
						"creatorType": "presenter",
						"fieldMode": 1
					}
				],
				"date": "2025-10-10",
				"meetingName": "第五届中国格点量子色动力学研讨会",
				"url": "https://indico.itp.ac.cn/event/324/contributions/2059/",
				"attachments": [
					{
						"title": "1.刘川-格点QCD进展综述.pdf",
						"mimeType": "application/pdf"
					},
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
