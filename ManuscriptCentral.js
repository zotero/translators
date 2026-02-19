{
	"translatorID": "e5b82dfa-7101-416f-9a28-f9e818e7b53f",
	"label": "ManuscriptCentral",
	"creator": "Mikko Rönkkö",
	"target": "^https?://mc\\.manuscriptcentral\\.com/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-02-19 11:00:00"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2026 Mikko Rönkkö

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

/*
 * ManuscriptCentral (ScholarOne Manuscripts) translator.
 *
 * Supports two page types:
 *   - Manuscript list pages  (CURRENT_PAGE ends with _VIEW_MANUSCRIPTS or similar queue pages)
 *   - Manuscript detail pages (CURRENT_PAGE ends with _MANUSCRIPT_DETAILS)
 *
 * Note: The site uses JavaScript POST-form navigation; individual manuscript detail pages have
 * no stable URL. List items are therefore scraped directly from the DOM without HTTP fetching.
 * Only the corresponding/submitting author is available on the list page; the full author list
 * is available on the detail page. Abstract and keywords are behind popups and not extracted.
 */

// ── Helpers ──────────────────────────────────────────────────────────────────

function getJournalName(doc) {
	// The journal name appears in the responsive navbar brand link
	let brand = doc.querySelector('a.brand');
	if (brand) return ZU.trimInternal(brand.textContent);
	// Fallback: parse it from the window.dataLayer push in the page scripts
	for (let script of doc.querySelectorAll('script')) {
		let m = script.textContent.match(/'journal_name'\s*:\s*'([^']+)'/);
		if (m) return m[1];
	}
	return '';
}

function parseMCDate(str) {
	// Converts "05-Feb-2026" → "2026-02-05"
	let months = {
		Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
		Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12'
	};
	let m = str.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
	if (!m) return str;
	return `${m[3]}-${months[m[2]] || '01'}-${m[1].padStart(2, '0')}`;
}

function parseAuthors(text) {
	// Input: "Cerar, Jelena (proxy) (contact); Devinney, Timothy; Rose, Elizabeth"
	// Removes parenthetical notes, splits on semicolons, parses "Last, First" format.
	let cleaned = text.replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
	return cleaned.split(/;\s*/)
		.map(name => name.trim())
		.filter(Boolean)
		.map(name => ZU.cleanAuthor(name, 'author', true));
}

// Returns true if a text string looks like a manuscript ID:
// short, no spaces, contains at least one hyphen (e.g. "ORM-26-0049")
function looksLikeMsId(text) {
	return text.length > 0
		&& text.length <= 30
		&& !text.includes(' ')
		&& text.includes('-');
}

// ── Core translator functions ─────────────────────────────────────────────────

function detectWeb(doc, _url) {
	let currentPage = (doc.querySelector('input[name="CURRENT_PAGE"]') || {}).value || '';
	if (currentPage.endsWith('_MANUSCRIPT_DETAILS') && doc.querySelector('td.headerbg2')) {
		return 'journalArticle';
	}
	if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	// Manuscript ID cells in list pages are td.tablelightcolor > p.listcontents with
	// no child elements and text that looks like a manuscript ID (e.g. "ORM-26-0049").
	let items = {};
	let found = false;
	for (let p of doc.querySelectorAll('td.tablelightcolor p.listcontents')) {
		if (p.children.length > 0) continue;
		let msId = ZU.trimInternal(p.textContent);
		if (!looksLikeMsId(msId)) continue;
		let row = p.closest('tr');
		if (!row) continue;
		let cells = row.querySelectorAll('td.tablelightcolor');
		if (cells.length < 2) continue;
		let titleP = cells[1].querySelector('p.listcontents');
		if (!titleP) continue;
		// Title is the first text node, before the optional "View Submission" link
		let title = ZU.trimInternal(
			(titleP.firstChild || {}).textContent || titleP.textContent);
		if (!title) continue;
		if (checkOnly) return true;
		found = true;
		items[msId] = title;
	}
	return found ? items : false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) === 'multiple') {
		let rowDataMap = buildListItemData(doc);
		let selectable = {};
		for (let msId in rowDataMap) {
			selectable[msId] = rowDataMap[msId].title;
		}
		Zotero.selectItems(selectable, function (selected) {
			if (!selected) return;
			let journal = getJournalName(doc);
			for (let msId in selected) {
				saveListItem(rowDataMap[msId], journal, url);
			}
		});
	}
	else {
		scrapeDetail(doc, url);
	}
}

function buildListItemData(doc) {
	// Extracts all available fields from each manuscript's two-row structure.
	let data = {};
	for (let p of doc.querySelectorAll('td.tablelightcolor p.listcontents')) {
		if (p.children.length > 0) continue;
		let msId = ZU.trimInternal(p.textContent);
		if (!looksLikeMsId(msId)) continue;
		let row1 = p.closest('tr');
		if (!row1) continue;
		let cells1 = row1.querySelectorAll('td.tablelightcolor');
		if (cells1.length < 2) continue;
		let titleP = cells1[1].querySelector('p.listcontents');
		let title = ZU.trimInternal(
			(titleP && titleP.firstChild ? titleP.firstChild.textContent : null)
			|| (titleP ? titleP.textContent : '')
		);
		// Date is in cells1[2] (rowspan=2 in the source table)
		let date = ZU.trimInternal((cells1[2] || {}).textContent || '');
		// Row 2 immediately follows row 1
		let row2 = row1.nextElementSibling;
		let cells2 = row2 ? row2.querySelectorAll('td.tablelightcolor') : [];
		let msType = ZU.trimInternal((cells2[0] || {}).textContent || '');
		// Corresponding author link has "mailpopup" in its href
		let authorLink = cells2[1]
			? cells2[1].querySelector('a[href*="mailpopup"]')
			: null;
		let author = authorLink ? ZU.trimInternal(authorLink.textContent) : '';
		if (msId && title) {
			data[msId] = { title, msId, date, msType, author };
		}
	}
	return data;
}

function saveListItem(data, journal, url) {
	let item = new Zotero.Item('journalArticle');
	item.title = ZU.capitalizeTitle(data.title, true);
	if (data.author) {
		item.creators.push(ZU.cleanAuthor(data.author, 'author', true));
	}
	if (data.date) {
		item.date = parseMCDate(data.date.replace(/;.*$/, '').trim());
	}
	item.publicationTitle = journal;
	item.url = url;
	item.libraryCatalog = 'ScholarOne Manuscripts';
	let extraParts = ['Manuscript ID: ' + data.msId];
	if (data.msType) extraParts.push('Manuscript Type: ' + data.msType);
	item.extra = extraParts.join('\n');
	item.complete();
}

function scrapeDetail(doc, url) {
	let item = new Zotero.Item('journalArticle');
	let block = doc.querySelector('td.headerbg2');

	// ── Manuscript ID ──────────────────────────────────────────────────────────
	// Primary: breadcrumb shows "Details for ORM-26-0049" — works regardless of
	// how the metadata block is formatted.
	let msId = '';
	let breadcrumbActive = doc.querySelector('li.active');
	if (breadcrumbActive) {
		let m = breadcrumbActive.textContent.match(/Details for\s+(\S+)/i);
		if (m) msId = m[1].trim();
	}
	// Fallback: first bold text inside the metadata block
	if (!msId && block) {
		let bEl = block.querySelector('p.pagecontents b');
		if (bEl) msId = ZU.trimInternal(bEl.textContent);
	}

	// ── Authors ────────────────────────────────────────────────────────────────
	// Anchor on "(contact)" — ScholarOne always marks the contact author with this
	// text, and it appears only in the authors paragraph.
	let authorsP = null;
	if (block) {
		for (let p of block.querySelectorAll('p.pagecontents')) {
			if (p.textContent.includes('(contact)')) {
				authorsP = p;
				break;
			}
		}
		// Fallback: paragraph whose text contains "; " (multi-author separator)
		if (!authorsP) {
			for (let p of block.querySelectorAll('p.pagecontents')) {
				if (p.textContent.includes('; ')) {
					authorsP = p;
					break;
				}
			}
		}
	}
	if (authorsP) {
		item.creators = parseAuthors(ZU.trimInternal(authorsP.textContent));
	}

	// ── Title ──────────────────────────────────────────────────────────────────
	// Walk backward from the authors row to find the nearest non-empty
	// p.pagecontents that doesn't look like an MS ID (short hyphenated string).
	let titleText = '';
	if (authorsP) {
		let authorsRow = authorsP.closest('tr');
		let row = authorsRow && authorsRow.previousElementSibling;
		while (row && !titleText) {
			let p = row.querySelector('p.pagecontents');
			if (p) {
				let t = ZU.trimInternal(p.textContent);
				if (t && !looksLikeMsId(t)) titleText = t;
			}
			row = row.previousElementSibling;
		}
	}
	item.title = ZU.capitalizeTitle(titleText, true);

	// ── Manuscript Type ────────────────────────────────────────────────────────
	// Walk forward from the authors row to find the first plain-text p.pagecontents
	// with no links (skips status rows which contain editor/reviewer links).
	let msType = '';
	if (authorsP) {
		let authorsRow = authorsP.closest('tr');
		let row = authorsRow && authorsRow.nextElementSibling;
		while (row && !msType) {
			let p = row.querySelector('p.pagecontents');
			if (p && !p.querySelector('a')) {
				let t = ZU.trimInternal(p.textContent);
				if (t && !looksLikeMsId(t)) msType = t;
			}
			row = row.nextElementSibling;
		}
	}

	// ── Submission date ────────────────────────────────────────────────────────
	for (let footer of (block ? block.querySelectorAll('p.footer') : [])) {
		if (!footer.textContent.includes('Submitted:')) continue;
		let m = footer.textContent.match(/Submitted:\s*([\d\w-]+)/);
		if (m) item.date = parseMCDate(m[1]);
		break;
	}

	item.publicationTitle = getJournalName(doc);
	item.url = url;
	item.libraryCatalog = 'ScholarOne Manuscripts';

	let extraParts = [];
	if (msId) extraParts.push('Manuscript ID: ' + msId);
	if (msType) extraParts.push('Manuscript Type: ' + msType);
	if (extraParts.length) item.extra = extraParts.join('\n');

	// ── Proof attachments ─────────────────────────────────────────────────────
	let htmlBtn = doc.querySelector('a[target="_proofHTML"]');
	let pdfBtn = doc.querySelector('a[target="_proofPDF"]');
	let htmlBtnMatch = htmlBtn
		&& (htmlBtn.getAttribute('onclick') || '').match(/window\.open\(['"]([^'"]+)['"]/);
	let pdfBtnMatch = pdfBtn
		&& (pdfBtn.getAttribute('onclick') || '').match(/window\.open\(['"]([^'"]+)['"]/);

	let pending = (htmlBtnMatch ? 1 : 0) + (pdfBtnMatch ? 1 : 0);
	if (!pending) {
		item.complete();
		return;
	}
	function doneOne() {
		if (--pending === 0) item.complete();
	}

	if (htmlBtnMatch) {
		let wrapperUrl = new URL(htmlBtnMatch[1], url).href;
		ZU.doGet(wrapperUrl, function (text) {
			// The HTML proof URL serves a frameset wrapper; the actual article
			// HTML is in the frame named "main".
			let frameMatch = text.match(/<frame\b[^>]*\bname\s*=\s*['"]main['"][^>]*\bsrc\s*=\s*["']([^"']+)["']/i)
				|| text.match(/<frame\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*\bname\s*=\s*['"]main['"][^>]*/i)
				|| text.match(/<iframe[^>]+src\s*=\s*["']([^"']+)["']/i);
			if (frameMatch) {
				item.attachments.push({
					url: new URL(frameMatch[1], wrapperUrl).href,
					title: 'HTML Proof'
				});
			}
			doneOne();
		});
	}

	// PDF: the onclick URL opens a PROOF_POPUP page that JS-redirects to the real
	// DOWNLOAD=TRUE URL.  Extract that URL and push it as a PDF attachment.
	if (pdfBtnMatch) {
		let pdfPopupUrl = new URL(pdfBtnMatch[1], url).href;
		ZU.doGet(pdfPopupUrl, function (text) {
			let redirectMatch = text.match(/location\.href\s*=\s*["']([^"']+)["']/);
			if (redirectMatch) {
				item.attachments.push({
					url: new URL(redirectMatch[1], url).href,
					title: 'PDF Proof',
					mimeType: 'application/pdf'
				});
			}
			doneOne();
		});
	}
}

/** BEGIN TEST CASES **/
var testCases = []
/** END TEST CASES **/
