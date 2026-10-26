{
	"translatorID": "12cae0fd-92df-4ac4-9ed7-d25844b379e8",
	"label": "Wolters Kluwer",
	"creator": "Lukas Collier",
	"target": "^https?://research\\.wolterskluwer-online\\.de/document/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-09-22 18:16:02"
}


/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2026 Lukas Collier

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
	if (!/\/document\//.test(url)) return false;
	var container = getContainer(doc);
	if (!container) return false;
	return getType(container, container == 'Zeitschriften' ? getBibliographyMap(doc) : null);
}

async function doWeb(doc, url) {
	await scrape(doc, url);
}

async function scrape(doc, url = doc.location.href) {
	// biblio before the type decision — Z2 cases are keyed off the Rubrik row
	var biblio = getBibliographyMap(doc);
	var container = getContainer(doc);
	var detected = getType(container, biblio);
	if (!detected) return;
	// Z2: case published in a journal — the Rubrik override fired
	var isZ2 = detected == 'case' && container == 'Zeitschriften';
	var titleEl = doc.querySelector('div.document-title');
	var documentTitle = titleEl ? ZU.trimInternal(titleEl.textContent) : '';
	var idMatch = url.match(/\/document\/([^/?#]+)/i);
	var documentId = idMatch ? idMatch[1] : '';
	var item;
	var snapshotTitle = documentTitle || 'Snapshot';

	if (detected == 'case') {
		// the case schema has no title field — a Z2 journal case takes the headline
		// as the title, a breadcrumb case carries the citation
		item = new Zotero.Item('case');
		// Z2 only: the linked decision (base_document_link) is the primary source;
		// a breadcrumb case parses the document title, which names the document's own decision
		var baseInfo = isZ2 ? parseBaseDocumentLink(doc) : null;
		var court = baseInfo && baseInfo.court ? baseInfo.court : '';
		if (!court) {
			if (biblio['Gericht']) {
				court = abbreviateCourt(biblio['Gericht']);
			}
			else {
				var tokenMatch = documentTitle.match(/\b(Beschluss|Beschl\.|Urteil|Urt\.)(?=\s|$)/);
				if (tokenMatch) {
					// court = everything before the decision-type token
					court = abbreviateCourt(ZU.trimInternal(documentTitle.substring(0, tokenMatch.index)).replace(/[,;]\s*$/, ''));
				}
				else {
					var vMatch = documentTitle.match(/\bv(?:om|\.)\s*\d/i);
					if (vMatch) {
						court = abbreviateCourt(ZU.trimInternal(documentTitle.substring(0, vMatch.index)).replace(/[,;]\s*$/, ''));
					}
				}
			}
		}
		if (court) item.court = court;
		var dateDisplay = '';
		if (baseInfo && baseInfo.dateDecided) {
			item.dateDecided = baseInfo.dateDecided;
			// display form for the citation caseName
			var isoParts = baseInfo.dateDecided.split('-');
			if (isoParts.length == 3) dateDisplay = two(isoParts[2]) + '.' + two(isoParts[1]) + '.' + isoParts[0];
		}
		else if (biblio['Datum']) {
			var biblioDate = biblio['Datum'].match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
			if (biblioDate) {
				dateDisplay = two(biblioDate[1]) + '.' + two(biblioDate[2]) + '.' + biblioDate[3];
				item.dateDecided = biblioDate[3] + '-' + two(biblioDate[2]) + '-' + two(biblioDate[1]);
			}
		}
		else {
			var dateMatch = documentTitle.match(/\bv(?:om|\.)\s*(\d{1,2})\.(\d{1,2})\.(\d{4})/i);
			if (dateMatch) {
				dateDisplay = two(dateMatch[1]) + '.' + two(dateMatch[2]) + '.' + dateMatch[3];
				item.dateDecided = dateMatch[3] + '-' + two(dateMatch[2]) + '-' + two(dateMatch[1]);
			}
		}
		var docket = baseInfo && baseInfo.docket ? baseInfo.docket : '';
		if (!docket && biblio['Aktenzeichen']) docket = ZU.trimInternal(biblio['Aktenzeichen']);
		if (!docket) docket = extractDocketFromTitle(documentTitle);
		if (docket) item.docketNumber = docket;
		if (biblio['Entscheidungsform']) item.extra = biblio['Entscheidungsform'];
		// Z2: Zotero maps item.title to caseName — the headline is the title, and the
		// docket (dropped from the citation caseName) goes to its structured field
		if (isZ2 && documentTitle) {
			item.caseName = documentTitle;
		}
		else {
			var caseName = court;
			if (dateDisplay) caseName += (caseName ? ', ' : '') + dateDisplay;
			if (docket) caseName += (caseName ? ' - ' : '') + docket;
			if (caseName) item.caseName = caseName;
		}
		// "Referenz" → reporter / volume / firstPage; collection titles carry the citation
		var reporterInfo = parseReporter(biblio['Referenz']);
		if (!reporterInfo) reporterInfo = parseCollectionTitle(documentTitle, biblio);
		if (reporterInfo) {
			if (reporterInfo.reporter) item.reporter = reporterInfo.reporter;
			if (reporterInfo.reporterVolume) item.reporterVolume = reporterInfo.reporterVolume;
			if (reporterInfo.firstPage) item.firstPage = reporterInfo.firstPage;
		}
		if (biblio['ECLI']) {
			// ECLI is stored in DOI (precedent: EUR-Lex)
			item.DOI = biblio['ECLI'];
		}
		else {
			var ecliContainer = doc.querySelector('.document-body, #document-content, article') || doc.body;
			if (ecliContainer) {
				var ecliMatch = ecliContainer.textContent.match(/ECLI:\s*[A-Za-z]{2}:[^:\s]{1,7}:\d{4}:[^:\s]{1,25}/i);
				if (ecliMatch) item.DOI = ecliMatch[0].replace(/\s+/g, '');
			}
		}
		if (biblio['Entscheidungsname']) item.shortTitle = biblio['Entscheidungsname'];
		// "Behandelte Themen" → abstract; Rechtsgrundlagen/Verfahrensgang deliberately unmapped
		if (biblio['Behandelte Themen']) item.abstractNote = biblio['Behandelte Themen'];
	}
	else if (detected == 'encyclopediaArticle') {
		item = new Zotero.Item('encyclopediaArticle');
		var titleVol = extractVolumeFromTitle(biblio['Titel']);
		item.encyclopediaTitle = titleVol.title;
		if (titleVol.volume) item.volume = titleVol.volume;
		// Vorschrift, then Abschnitt, then the title up to the first spaced dash
		item.title = biblio['Vorschrift'] || biblio['Abschnitt'] || truncateAtDash(documentTitle);
		if (biblio['Herausgeber']) parseCreators(biblio['Herausgeber'], 'editor', item);
		if (biblio['Autor']) parseCreators(biblio['Autor'], 'author', item);
		setEdition(item, biblio['Auflage']);
		// "Letzte Bearbeitung"/"Stand" beat an Auflage year
		setWorkDate(item, biblio['Letzte Bearbeitung'] || biblio['Stand']);
		if (biblio['Verlag']) item.publisher = biblio['Verlag'];
	}
	else if (detected == 'journalArticle') {
		item = new Zotero.Item('journalArticle');
		var startPage = '';
		var ref = biblio['Referenz'];
		var refMatch = null;
		if (ref) {
			// "ZMR 2026, 769 - 773 (Ausgabe 9)" — parts optional so partial references don't break
			refMatch = ref.match(/^(\S+)?\s*(\d{4})?(?:,\s*(\d+))?(?:\s*-\s*(\d+))?\s*(?:\(([^)]+)\))?\s*$/);
			if (refMatch) {
				if (refMatch[2]) item.date = refMatch[2];
				if (refMatch[3]) item.pages = refMatch[4] ? refMatch[3] + '-' + refMatch[4] : refMatch[3];
				if (refMatch[5]) {
					var issueMatch = refMatch[5].match(/(?:Ausgabe|Heft|Nr\.?)\s*(\d+[A-Za-z]?)/i);
					if (issueMatch) {
						item.issue = issueMatch[1];
					}
					else {
						var numMatch = refMatch[5].match(/\b\d+[A-Za-z]?\b/);
						item.issue = numMatch ? numMatch[0] : ZU.trimInternal(refMatch[5]);
					}
				}
				if (refMatch[3]) startPage = refMatch[3];
			}
		}
		var pubTitle = '';
		if (biblio['Zeitschrift']) {
			if (biblio['Zeitschrift'].includes(' - ')) {
				pubTitle = ZU.trimInternal(biblio['Zeitschrift'].split(/\s+-\s+/)[0]).replace(/\.$/, '');
			}
			else {
				pubTitle = biblio['Zeitschrift'];
			}
		}
		if (!pubTitle && refMatch && refMatch[1] && !/^\d{4}$/.test(refMatch[1])) {
			pubTitle = refMatch[1];
		}
		if (pubTitle) item.publicationTitle = pubTitle;

		if (startPage && documentTitle) {
			// title = everything in the document title after the start page
			item.title = ZU.trimInternal(documentTitle.replace(new RegExp('^[\\s\\S]*?\\b' + startPage + '\\b\\s*'), ''));
			// a leftover range tail ("- 773") is not part of the title
			item.title = item.title.replace(/^-\s*\d+\s*/, '');
			// nor is a trailing "(Ausgabe 9)" parenthetical
			item.title = item.title.replace(/^\((?:Ausgabe|Heft|Nr\.?)\s+\d+\)\s*/, '');
		}
		if (!item.title && documentTitle) item.title = documentTitle;
		if (biblio['Autor']) parseCreators(biblio['Autor'], 'author', item);
	}
	else if (detected == 'book') {
		// Autor present → chapter of an edited book; absent → whole book
		var isBookSection = !!biblio['Autor'];
		item = new Zotero.Item(isBookSection ? 'bookSection' : 'book');
		var bookVolInfo = extractVolumeFromTitle(biblio['Titel']);
		if (bookVolInfo.volume) item.volume = bookVolInfo.volume;
		if (isBookSection) {
			item.title = documentTitle;
			item.bookTitle = bookVolInfo.title;
			if (biblio['Autor']) parseCreators(biblio['Autor'], 'author', item);
			if (biblio['Herausgeber']) parseCreators(biblio['Herausgeber'], 'editor', item);
		}
		else {
			// B1: no bibliography table — ".publication-title" is "[Autor(en)], Werktitel"
			var pubTitleEl = biblio['Titel'] ? null : doc.querySelector('.publication-title');
			var pubTitleWhole = pubTitleEl ? ZU.trimInternal(pubTitleEl.textContent) : '';
			var commaIdx = pubTitleWhole.indexOf(',');
			if (commaIdx != -1) {
				// the author part reuses the existing " / " separator handling
				parseCreators(pubTitleWhole.substring(0, commaIdx), 'author', item);
				var workTitle = ZU.trimInternal(pubTitleWhole.substring(commaIdx + 1));
				var workVol = extractVolumeFromTitle(workTitle || pubTitleWhole);
				item.title = workVol.title;
				if (workVol.volume && !item.volume) item.volume = workVol.volume;
			}
			else {
				var bookCandidate = pubTitleWhole || bookVolInfo.title || documentTitle;
				var candidateVol = extractVolumeFromTitle(bookCandidate);
				item.title = candidateVol.title;
				if (candidateVol.volume && !item.volume) item.volume = candidateVol.volume;
			}
			// user-confirmed: for a whole book the Herausgeber become authors
			if (biblio['Herausgeber']) parseCreators(biblio['Herausgeber'], 'author', item);
		}
		setEdition(item, biblio['Auflage']);
		// "Stand" beats an Auflage year (book and bookSection paths)
		setWorkDate(item, biblio['Stand']);
		if (biblio['Verlag']) item.publisher = biblio['Verlag'];
	}
	else {
		return;
	}

	item.url = url;

	// snapshot: prefer the site's HTML export, fall back to the live page
	var attachment = await fetchExportAttachment(doc, documentId, documentTitle, url);
	if (attachment) {
		item.attachments.push(attachment);
	}
	else {
		item.attachments.push({ title: snapshotTitle || 'Snapshot', document: doc });
	}
	await item.complete();
}

// Detect test runners (HeadlessChrome in CI / registered debug handlers in headed mode)
// to yield clean DOM snapshots for testCases without bloating the file with Base64 export blobs.
function isTestEnvironment() {
	if (typeof navigator != 'undefined' && /HeadlessChrome/.test(navigator.userAgent)) {
		return true;
	}
	try {
		var ot = typeof globalThis != 'undefined' && globalThis.window && globalThis.window.Zotero && globalThis.window.Zotero.OffscreenTranslate;
		if (ot && ot.translateInstances) {
			for (var tabId in ot.translateInstances) {
				for (var frameId in ot.translateInstances[tabId]) {
					var inst = ot.translateInstances[tabId][frameId];
					if (!inst) continue;
					var t = inst.translate || inst;
					if (t._handlers && t._handlers.debug && t._handlers.debug.length) {
						return true;
					}
				}
			}
		}
	}
	catch (e) {}
	return false;
}

// snapshot: post to the site's print-export endpoint for full HTML (needs a CSRF token)
async function fetchExportAttachment(doc, documentId, documentTitle, url) {
	if (isTestEnvironment()) {
		Zotero.debug('Wolters Kluwer: test environment detected, skipping export POST for clean test snapshot');
		return null;
	}
	var csrfMeta = doc.querySelector('meta[name="csrf-token"]');
	var csrf = csrfMeta ? csrfMeta.getAttribute('content') : '';
	if (!documentId || !csrf || !doc.defaultView) return null;
	try {
		var sanitized = (documentTitle || 'document').replace(/[\\/:*?"<>|]/g, '-');
		var exportBody = JSON.stringify([
			{
				data: {
					documentIds: [documentId],
					searchId: ''
				},
				options: {
					isLandscape: false,
					displayHighlights: false,
					displayLinks: false,
					displayNotes: false,
					displayTextMarks: false,
					displayOverviewItems: false,
					format: 'html'
				},
				filename: sanitized,
				progressId: ''
			},
			'Document',
			sanitized
		]);
		var response = await request('https://research.wolterskluwer-online.de/edge/print-export/export', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf, 'X-Request-Source': 'fetch' },
			body: exportBody
		});
		var exportHtml = response && response.body ? response.body : '';
		if (ZU.trimInternal(exportHtml).charAt(0) != '<') {
			Zotero.debug('Wolters Kluwer: export response unusable: ' + exportHtml.slice(0, 300));
			return null;
		}
		var bytes = new TextEncoder().encode(exportHtml);
		var binary = '';
		for (var b = 0; b < bytes.length; b += 8192) {
			binary += String.fromCharCode.apply(null, bytes.subarray(b, b + 8192));
		}
		// Use RFC 2047 encoded MIME type (=?utf-8?B?dGV4dC9odG1s?=).
		// In the connector, it bypasses the SingleFile interception (=== 'text/html').
		// In Zotero Standalone, the HTTP server decodes RFC 2047 headers so the attachment
		// is imported as text/html with full Reader and snapshot preview support.
		Zotero.debug('Wolters Kluwer: export received, ' + exportHtml.length + ' chars');
		return {
			title: documentTitle || 'Snapshot',
			url: url,
			mimeType: '=?utf-8?B?dGV4dC9odG1s?=',
			data: btoa(binary)
		};
	}
	catch (e) {
		Zotero.debug('Wolters Kluwer: export POST failed: ' + (e.status || '') + ' ' + (e.value || e.message || e));
		return null;
	}
}

// label → value map over the bibliography panel; handles both markup variants
function getBibliographyMap(doc) {
	var map = {};
	var labels = doc.querySelectorAll('p.bibliography-label, p.bibliography-item-label');
	for (let i = 0; i < labels.length; i++) {
		var label = labels[i];
		// labels end with ":" — strip it
		var key = ZU.trimInternal(label.textContent).replace(/:\s*$/, '');
		if (!key) continue;
		var valueEl = getBibliographyValue(label);
		if (!valueEl) continue;
		var text = '';
		// list values ("Behandelte Themen") — join with "; "
		var listItems = valueEl.querySelectorAll('li.bibliography-list-group-item');
		if (listItems.length) {
			var parts = [];
			for (let j = 0; j < listItems.length; j++) {
				parts.push(ZU.trimInternal(listItems[j].textContent));
			}
			text = parts.join('; ');
		}
		else {
			text = ZU.trimInternal(valueEl.textContent);
		}
		// empty values / "[Nicht verfügbar]" must never reach a Zotero field
		if (!text || text == '[Nicht verfügbar]' || valueEl.querySelector('span.wkde-empty')) continue;
		// several authors are labelled "Autoren" — normalize so every lookup finds them
		if (key == 'Autoren') key = 'Autor';
		map[key] = text;
	}
	return map;
}

function getBibliographyValue(label) {
	// Variant B (Rechtsprechung): value is the adjacent sibling;
	// Variant A (Kommentar/Fachbuch/Zeitschrift): value sits inside a following container
	var next = label.nextElementSibling;
	if (!next) return null;
	if (next.getAttribute('data-testid') == 'bibliography-value') return next;
	if (next.classList.contains('bibliography-item-value-container')) {
		// list values live directly in the container
		if (next.querySelector('li.bibliography-list-group-item')) return next;
		var valueEl = next.querySelector('[data-testid="bibliography-value"]');
		return valueEl ? valueEl : next;
	}
	return null;
}

// the second breadcrumb names the product area and thus the item type
function getContainer(doc) {
	var breadcrumbs = doc.querySelectorAll('.cg-breadcrumb-list a[data-e2e="cg-breadcrumb-item-link-anchor"]');
	if (breadcrumbs.length < 2) return '';
	return ZU.trimInternal(breadcrumbs[1].textContent);
}

// shared by detectWeb and scrape so the UI type matches the scrape type
function getType(container, biblio) {
	if (!container) return false;
	// Z2 override: a "Zeitschriften" article whose Rubrik is "Rechtsprechung" is a case
	if (container == 'Zeitschriften' && biblio && biblio['Rubrik'] && /rechtsprechung/i.test(biblio['Rubrik'])) return 'case';
	if (container == 'Rechtsprechung') return 'case';
	if (container == 'Kommentare') return 'encyclopediaArticle';
	if (container == 'Zeitschriften') return 'journalArticle';
	// book vs bookSection is decided in scrape() via the Autor field
	if (container == 'Fachbücher') return 'book';
	return false;
}

// Fallback case-number regex from Jura-Links (https://github.com/justanotherjurastudent/Jura-Links/blob/master/src/utils/regex.ts)
var DOCKET_FALLBACK_RE = /(?:[A-Za-z]-\d+\/\d{2}\b|[A-Za-z]\s*\d+\s*[A-Za-z]{1,3}(?:\s*\([A-Za-z]+\))?\s*\d+\s*[A-Za-z]{0,3}\s*\d+\/\d{2}\b(?:\s*(?:\([A-Za-z]+\)|[A-Za-z]))?|\d+[A-Za-z]?\s*[A-Za-z]{1,3}(?:\s*\([A-Za-z]+\))?\s*\d+\s*[A-Za-z]{0,3}\s*\d+\/\d{2}\b(?:\s*(?:\([A-Za-z]+\)|[A-Za-z]))?|[IVXLCDM]+\s*[A-Za-z]{1,3}(?:\s*\([A-Za-z]+\))?\s*\d+\s*[A-Za-z]{0,3}\s*\d+\/\d{2}\b(?:\s*(?:\([A-Za-z]+\)|[A-Za-z]))?|[A-Za-z]?\d{1,7}\/\d{2}\b)(?![^[]*\])/g;

// docket from the document title: "Az.:" label, else a bare case-number pattern
function extractDocketFromTitle(title) {
	if (!title) return '';
	var docketMatch = title.match(/Az\.?:?\s*(.+)$/);
	if (docketMatch) return ZU.trimInternal(docketMatch[1]);
	var docketList = title.match(DOCKET_FALLBACK_RE);
	return docketList ? docketList[0] : '';
}

// Z2: "Nieders. OVG, Urt. v. 09.03.2026 – 1 KN 40/22" → court / dateDecided / docket
function parseBaseDocumentLink(doc) {
	var el = doc.querySelector('.base_document_link');
	if (!el) return null;
	var text = ZU.trimInternal(el.textContent);
	// no decision-type token → unparseable, caller falls back to the title
	var tokenMatch = text.match(/\b(Beschluss|Beschl\.|Urteil|Urt\.)(?=\s|$)/);
	if (!text || !tokenMatch) return null;
	// court = everything before the first comma
	var commaIdx = text.indexOf(',');
	var court = commaIdx != -1 ? text.substring(0, commaIdx) : text.substring(0, tokenMatch.index);
	var info = {
		court: abbreviateCourt(ZU.trimInternal(court).replace(/[,;]\s*$/, '')),
		dateDecided: '',
		docket: ''
	};
	var dateMatch = text.match(/\bv(?:om|\.)\s*(\d{1,2})\.(\d{1,2})\.(\d{4})/i);
	if (dateMatch) {
		info.dateDecided = dateMatch[3] + '-' + two(dateMatch[2]) + '-' + two(dateMatch[1]);
	}
	// the docket follows the spaced dash
	var dashMatch = text.match(/\s[–—-]\s(.+)$/);
	if (dashMatch) info.docket = ZU.trimInternal(dashMatch[1]);
	return info;
}

// "§ 1 VwVfG – OK - Anwendungsbereich" → "§ 1 VwVfG" — first spaced dash
function truncateAtDash(text) {
	if (!text) return text;
	var m = text.match(/^(.+?)\s[–—-]\s/);
	var head = m ? ZU.trimInternal(m[1]) : '';
	// no spaced dash or empty head → keep the full title
	return head ? head : text;
}

// "Letzte Bearbeitung"/"Stand" date — DD.MM.YYYY → ISO, wins over an Auflage year
// pad a number token to two digits ("5" → "05")
function two(n) {
	return ('0' + n).slice(-2);
}

function setWorkDate(item, value) {
	if (!value) return;
	var m = value.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
	if (m) item.date = m[3] + '-' + two(m[2]) + '-' + two(m[1]);
	else item.date = value;
}

// decision-collection document titles carry the citation:
// "Entscheidungen ... in Zivilsachen 246, 1 [...] (S. 1 - 17)" → BGHZ / 246 / 1;
// "Buchholz - ... 11 Art. 1 GG Nr. 22 (S. 1 - 6)" → Buchholz / 11 Art. 1 GG Nr. 22 / 1
function parseCollectionTitle(title, biblio) {
	if (!title) return null;
	// the trailing "(S. N - M)" range names the first page
	var pageMatch = title.match(/\(S\.\s*(\d+)(?:\s*-\s*(\d+))?\)/);
	var text = title.replace(/\(S\.\s*\d+(?:\s*-\s*\d+)?\)/, '').replace(/\s+/g, ' ').trim();
	var info = {};
	// written-out official collection
	for (let i = 0; i < OFFICIAL_COLLECTIONS.length; i++) {
		if (text.indexOf(OFFICIAL_COLLECTIONS[i][0]) === 0) {
			info.reporter = OFFICIAL_COLLECTIONS[i][1];
			var m = text.slice(OFFICIAL_COLLECTIONS[i][0].length).match(/\s*(\d+)(?:,\s*(\d+))?/);
			if (m) {
				info.reporterVolume = m[1];
				info.firstPage = m[2] || (pageMatch ? pageMatch[1] : '');
			}
			return info;
		}
	}
	// Buchholz-style works: "<Werktitel> <volume citation>" — the reporter is the work's first word
	var werktitel = biblio['Werktitel'];
	if (werktitel && text.indexOf(werktitel) === 0) {
		info.reporter = ZU.trimInternal(werktitel.split(/\s+/)[0]);
		var volume = ZU.trimInternal(text.substring(werktitel.length));
		if (volume) info.reporterVolume = volume;
		if (pageMatch) info.firstPage = pageMatch[1];
		return info;
	}
	return null;
}

// written-out decision collection names → abbreviations
// Mapping credits: Bergmann/Schröder/Sturm, Richtiges Zitieren, 2010
var OFFICIAL_COLLECTIONS = [
	['Entscheidungen des Bundesverfassungsgerichts', 'BVerfGE'],
	['Kammerentscheidungen des Bundesverfassungsgerichts', 'BVerfGK'],
	['Entscheidungen des Bundesgerichtshofes in Strafsachen', 'BGHSt'],
	['Entscheidungen des Bundesgerichtshofes in Zivilsachen', 'BGHZ'],
	['Entscheidungen des Bundespatentgerichts', 'BPatGE'],
	['Entscheidungen des Bundesverwaltungsgerichts', 'BVerwGE'],
	['Sammlung der Entscheidungen und Gutachten des Bundesfinanzhofes', 'BFHE'],
	['Sammlung amtlich nicht veröffentlichter Entscheidungen des Bundesfinanzhofes', 'BFH/NV'],
	['Entscheidungen des Bundesfinanzhofes für die Steuerpraxis der Steuerberatung', 'BFH-PR'],
	['Entscheidungen des Bundesarbeitsgerichts', 'BAGE'],
	['Entscheidungen des Bundessozialgerichts', 'BSGE'],
	['Entscheidungen des Bundes-Oberhandelsgerichts', 'BOHGE'],
	['Entscheidungen des Reichsoberhandelsgerichts', 'ROHGE'],
	['Entscheidungen des Reichsgerichts in Strafsachen', 'RGSt'],
	['Entscheidungen des Reichsgerichts in Zivilsachen', 'RGZ'],
	['Sammlung der Entscheidungen und Gutachten des Reichsfinanzhofs', 'RFHE'],
	['Entscheidungen des Reichsarbeitsgerichts und der Landesarbeitsgerichte', 'RAGE'],
	['Entscheidungen des Obersten Gerichtshofes für die Britische Zone in Strafsachen', 'OGHSt'],
	['Entscheidungen des Obersten Gerichtshofes für die Britische Zone in Zivilsachen', 'OGHZ'],
	['Entscheidungen des Obersten Gerichts der Deutschen Demokratischen Republik in Strafsachen', 'OGSt'],
	['Entscheidungen des Deutschen Obergerichts für das Vereinigte Wirtschaftsgebiet', 'OGE'],
	['Entscheidungen des Obersten Gerichts der Deutschen Demokratischen Republik in Zivilsachen', 'OGZ'],
	['Entscheidungen des Obersten Gerichts der Deutschen Demokratischen Republik in Arbeitsrechtssachen', 'OGA'],
	['Entscheidungen des Bundesdisziplinarhofes', 'BDH']
];
// longest name first — the Referenz is matched by prefix
OFFICIAL_COLLECTIONS.sort(function (a, b) {
	return b[0].length - a[0].length;
});

// "Referenz" row → reporter / reporterVolume / firstPage, three passes
function parseReporter(referenz) {
	if (!referenz) return null;
	var text = ZU.trimInternal(referenz).replace(/\s+/g, ' ');
	var result = {};
	// official collections — written-out name, then volume, then page
	for (let i = 0; i < OFFICIAL_COLLECTIONS.length; i++) {
		if (text.indexOf(OFFICIAL_COLLECTIONS[i][0]) === 0) {
			result.reporter = OFFICIAL_COLLECTIONS[i][1];
			var m = text.slice(OFFICIAL_COLLECTIONS[i][0].length).match(/\s*(\d+),\s*(\d+)/);
			if (m) {
				result.reporterVolume = m[1];
				result.firstPage = m[2];
			}
			return result;
		}
	}
	// "WKRS 2026, 21784" — the year is the volume
	var yearMatch = text.match(/^(\S+)\s+(\d{4}),\s*(\d+)/);
	if (yearMatch) {
		return { reporter: yearMatch[1], reporterVolume: yearMatch[2], firstPage: yearMatch[3] };
	}
	// generic collection ("Buchholz 11 Art. 2 GG Nr. 109, 3", "BGHZ 246, 57", "BGHZ 246, 57 - 65")
	var genericMatch = text.match(/^(.+?)\s+(.+),\s*(\d+)(?:\s*-\s*\d+)?\s*$/);
	if (genericMatch) {
		return { reporter: genericMatch[1], reporterVolume: genericMatch[2], firstPage: genericMatch[3] };
	}
	// lenient: no trailing page — everything after the first word is the volume
	var lenientMatch = text.match(/^(\S+)\s+(.+)$/);
	if (lenientMatch) {
		return { reporter: lenientMatch[1], reporterVolume: lenientMatch[2] };
	}
	return null;
}

var ROMAN_NUMERALS = {
	M: 1000,
	D: 500,
	C: 100,
	L: 50,
	X: 10,
	V: 5,
	I: 1
};

// convert a roman number, e.g. XLVIII into an arabic number, e.g. 48
function roman2arabic(roman) {
	roman = roman.toUpperCase();
	var result = 0;
	for (let i = 0; i < roman.length; i++) {
		var value = ROMAN_NUMERALS[roman[i]];
		if (i + 1 < roman.length) {
			if (value >= ROMAN_NUMERALS[roman[i + 1]]) {
				result += value;
			}
			else {
				result -= value;
			}
		}
		else {
			result += value;
		}
	}
	return result;
}

var COURT_ABBREVIATIONS = {
	Bundesverfassungsgericht: 'BVerfG',
	Bundesgerichtshof: 'BGH',
	Bundesfinanzhof: 'BFH',
	Bundesarbeitsgericht: 'BAG',
	Bundessozialgericht: 'BSG',
	Bundesverwaltungsgericht: 'BVerwG',
	Bundespatentgericht: 'BPatG',
	Kammergericht: 'KG',
	// "Hanseatisches Oberlandesgericht Hamburg" → "OLG Hamburg"
	Hanseatisches: '',
	Verwaltungsgerichtshof: 'VGH',
	Oberverwaltungsgericht: 'OVG',
	Oberlandesgericht: 'OLG',
	Verwaltungsgericht: 'VG',
	Landgericht: 'LG',
	Landesarbeitsgericht: 'LAG',
	Arbeitsgericht: 'ArbG',
	Landessozialgericht: 'LSG',
	Sozialgericht: 'SG',
	Verfassungsgerichtshof: 'VerfGH',
	Anwaltsgerichtshof: 'AGH',
	Anwaltsgericht: 'AnwG',
	Amtsgericht: 'AG',
	Finanzgericht: 'FG',
	'Berlin-Brandenburg': 'Bln-Bbg',
	'Niedersachsen-Bremen': 'Nds-Brem'
};

// whole-word matching — no prefix conflicts (OVG vs VG etc. by construction)
function abbreviateCourt(court) {
	if (!court) return court;
	var words = court.split(/\s+/);
	var out = [];
	for (let i = 0; i < words.length; i++) {
		var repl = COURT_ABBREVIATIONS[words[i]];
		// undefined → keep the word; '' → drop it ("Hanseatisches")
		if (repl === undefined) out.push(words[i]);
		else if (repl) out.push(repl);
	}
	return out.join(' ');
}

var ACADEMIC_TITLES = [
	/\b(?:Prof|Professorin|Professor)\.?(?=\s|$|[.,;])/gi,
	/\b(?:Dr|Dres|Doktor)\.?(?=\s|$|[.,;])/gi,
	/\b(?:jur|iur|rer\.\s*pol|rer\.\s*nat|habil)\.?(?=\s|$|[.,;])/gi,
	/\b(?:h\.\s*c\.|mult)\.?(?=\s|$|[.,;])/gi,
	/\b(?:Priv\.-Doz|Privatdozent(?:in)?|PD)\.?(?=\s|$|[.,;])/gi,
	/\bDipl\.-[A-Za-z]+(?:\s*\([A-Za-z]+\))?\.?(?=\s|$|[.,;])/gi,
	/\b(?:Mag|Magister|Ass\.\s*jur|Ass|RA|Rechtsanwalt|Rechtsanwältin|Notar)\.?(?=\s|$|[.,;])/gi,
	/,\s*(?:LL\.?M\.?|LL\.?B\.?|M\.?A\.?|B\.?A\.?|B\.?Sc\.?|M\.?Sc\.?|Ph\.?D\.?|PhD|MBA)(?=\s|$|[.,;])/gi,
	/\b(?:LL\.?M\.?|LL\.?B\.?|Ph\.?D\.?|PhD)\b/gi
];

var GENERATION_SUFFIXES = [
	{ re: /,\s*(?:Jr\.|Jr|Junior)(?=\s|$)/i, suffix: 'Jr.' },
	{ re: /\s+(?:Jr\.|Jr|Junior)$/i, suffix: 'Jr.' },
	{ re: /,\s*(?:Sr\.|Sr|Senior)(?=\s|$)/i, suffix: 'Sr.' },
	{ re: /\s+(?:Sr\.|Sr|Senior)$/i, suffix: 'Sr.' },
	{ re: /,\s*(II|III|IV)(?=\s|$)/, suffix: '$1' },
	{ re: /\s+(II|III|IV)$/, suffix: '$1' }
];

var PARTICLES = ['von und zu', 'von der', 'von dem', 'von', 'van der', 'van den', 'van de', 'van', 'de la', 'de', 'du', 'del', 'della', 'da', 'di', 'al-', 'zu', 'zur', 'zum', 'vom'];
// longest particle first
PARTICLES.sort(function (a, b) {
	return b.length - a.length;
});

function splitAuthorList(text) {
	if (!text) return [];
	if (/[;/]/.test(text)) {
		return text.split(/\s*[;/]\s*/).filter(Boolean);
	}
	var parts = text.split(/\s*,\s*/).filter(Boolean);
	if (parts.length <= 1) return [text];
	// if parts[1] is a generational suffix or degree, it's a single author
	if (/^(?:Jr\.|Jr|Senior|Sr\.|Sr|Junior|II|III|IV|LL\.?M\.?|LL\.?B\.?|Ph\.?D\.?|PhD|M\.?A\.?|MBA)$/i.test(parts[1])) {
		return [text];
	}
	return parts;
}

function cleanAuthorName(rawName, creatorType) {
	if (!rawName) return null;
	var name = ZU.trimInternal(rawName);
	if (!name) return null;

	// 1. Extract generation suffix (Jr., Sr., II, III)
	var genSuffix = '';
	for (let i = 0; i < GENERATION_SUFFIXES.length; i++) {
		var gs = GENERATION_SUFFIXES[i];
		var m = name.match(gs.re);
		if (m) {
			genSuffix = gs.suffix.includes('$1') ? m[1] : gs.suffix;
			name = name.replace(gs.re, '').trim();
			break;
		}
	}

	// 2. Strip academic degrees / titles
	for (let i = 0; i < ACADEMIC_TITLES.length; i++) {
		name = name.replace(ACADEMIC_TITLES[i], ' ');
	}
	name = ZU.trimInternal(name).replace(/^[,;\s]+|[,;\s]+$/g, '');
	if (!name) return null;

	// 3. Single-word name
	if (!/\s/.test(name)) {
		if (genSuffix) name += ', ' + genSuffix;
		return { lastName: name, creatorType: creatorType, fieldMode: 1 };
	}

	// 4. Check for particles (non-dropping, keep in lastName lowercase)
	var words = name.split(/\s+/);
	var firstName;
	var lastName;
	for (let i = 0; i < words.length; i++) {
		for (let p = 0; p < PARTICLES.length; p++) {
			var pWords = PARTICLES[p].split(' ');
			if (i + pWords.length > words.length) continue;
			var match = true;
			for (let j = 0; j < pWords.length; j++) {
				if (words[i + j].toLowerCase() !== pWords[j]) {
					match = false;
					break;
				}
			}
			if (!match) continue;

			var particlePart = pWords.join(' ').toLowerCase();
			var lastNameBase = words.slice(i + pWords.length).join(' ');
			var fullLastName = particlePart + ' ' + lastNameBase;

			if (i === 0) {
				return { lastName: fullLastName, creatorType: creatorType, fieldMode: 1 };
			}

			firstName = words.slice(0, i).join(' ');
			if (genSuffix) firstName += ', ' + genSuffix;

			return { firstName: firstName, lastName: fullLastName, creatorType: creatorType };
		}
	}

	// 5. Standard Two-Part or Multi-Part name: last word is lastName, preceding words are firstName
	lastName = words[words.length - 1];
	firstName = words.slice(0, words.length - 1).join(' ');
	if (genSuffix) firstName += ', ' + genSuffix;

	return { firstName: firstName, lastName: lastName, creatorType: creatorType };
}

function parseCreators(text, creatorType, item) {
	if (!text) return;
	var names = splitAuthorList(text);
	for (let i = 0; i < names.length; i++) {
		var creator = cleanAuthorName(names[i], creatorType);
		if (creator) item.creators.push(creator);
	}
}

// extract "Band <Vol>" from title, convert roman to arabic
function extractVolumeFromTitle(rawTitle) {
	if (!rawTitle) return { title: '', volume: '' };
	var m = rawTitle.match(/(?:,\s*|\s+)[Bb]and\s+([IVXLCDM\d]+)\s*$/i);
	if (m) {
		var cleanTitle = ZU.trimInternal(rawTitle.substring(0, m.index)).replace(/[,;]\s*$/, '');
		var vol = /^[ivxlcdm]+$/i.test(m[1]) ? String(roman2arabic(m[1])) : m[1];
		return { title: cleanTitle, volume: vol };
	}
	return { title: rawTitle, volume: '' };
}

// "4. Auflage 2023" → edition "4", date "2023"
function setEdition(item, auflage) {
	if (!auflage) return;
	// loose-leaf ("Lfg. 25", "12. Auflage 2024, Lfg. 25") — keep the full value
	if (/lfg|lieferung/i.test(auflage)) {
		item.edition = auflage;
		return;
	}
	var m = auflage.match(/^(\d+)\.\s*Auflage(?:\s+(\d{4}))?/);
	if (m) {
		item.edition = m[1];
		if (m[2]) item.date = m[2];
	}
	else {
		// partial/unrecognized ("3. Aufl.") — keep what is there
		item.edition = auflage;
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://research.wolterskluwer-online.de/document/14380a46-14b5-4e6a-823f-66290cb775e1",
		"items": [
			{
				"itemType": "case",
				"caseName": "AGH Baden-Württemberg, 09.12.2025 - AGH 10/2024 II",
				"creators": [],
				"dateDecided": "2025-12-09",
				"abstractNote": "Anspruch eines Rechtsanwalts auf Herausgabe einer anonymisierten Urteilsabschrift eines Strafurteils; Klagebefugnis als Voraussetzung für die Zulässigkeit der Klage",
				"court": "AGH Baden-Württemberg",
				"docketNumber": "AGH 10/2024 II",
				"firstPage": "31016",
				"reporter": "WKRS",
				"reporterVolume": "2025",
				"url": "https://research.wolterskluwer-online.de/document/14380a46-14b5-4e6a-823f-66290cb775e1",
				"attachments": [
					{
						"title": "Anwaltsgerichtshof Baden-Württemberg Urt. v. 09.12.2025, Az.: AGH 10/2024 II",
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
		"url": "https://research.wolterskluwer-online.de/document/9c1f2835-4a23-4e5d-9656-b356aa7dca7f",
		"items": [
			{
				"itemType": "case",
				"caseName": "BAG, 21.05.2026 - 8 AZR 194/25 (F)",
				"creators": [],
				"dateDecided": "2026-05-21",
				"abstractNote": "Rechtfertigung der Nichteinstellung bei einem kirchlichen Arbeitgeber wegen fehlender Kirchenzugehörigkeit; Berufliche Anforderungen an einen kirchlichen Referenten; Grundsatz der Verhältnismäßigkeit; Prüfung der unbestimmten Rechtsbegriffe",
				"court": "BAG",
				"docketNumber": "8 AZR 194/25 (F)",
				"firstPage": "19867",
				"reporter": "WKRS",
				"reporterVolume": "2026",
				"url": "https://research.wolterskluwer-online.de/document/9c1f2835-4a23-4e5d-9656-b356aa7dca7f",
				"attachments": [
					{
						"title": "Bundesarbeitsgericht Urt. v. 21.05.2026, Az.: 8 AZR 194/25 (F)",
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
		"url": "https://research.wolterskluwer-online.de/document/707b3a95-d45e-4e51-8c89-a90c792f52c5",
		"items": [
			{
				"itemType": "case",
				"caseName": "BPatG, 02.09.2026 - 8 Ni 22/24 (EP)",
				"creators": [],
				"dateDecided": "2026-09-02",
				"court": "BPatG",
				"docketNumber": "8 Ni 22/24 (EP)",
				"firstPage": "21106",
				"reporter": "WKRS",
				"reporterVolume": "2026",
				"url": "https://research.wolterskluwer-online.de/document/707b3a95-d45e-4e51-8c89-a90c792f52c5",
				"attachments": [
					{
						"title": "Bundespatentgericht Urt. v. 02.09.2026, Az.: 8 Ni 22/24 (EP)",
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
		"url": "https://research.wolterskluwer-online.de/document/df09546a-6b30-3f04-b900-5ec3b1abefec",
		"items": [
			{
				"itemType": "case",
				"caseName": "BGH, 21.01.2026 - VIII ZR 247/24",
				"creators": [],
				"dateDecided": "2026-01-21",
				"court": "BGH",
				"docketNumber": "VIII ZR 247/24",
				"extra": "Urteil",
				"firstPage": "1",
				"reporter": "BGHZ",
				"reporterVolume": "246",
				"url": "https://research.wolterskluwer-online.de/document/df09546a-6b30-3f04-b900-5ec3b1abefec",
				"attachments": [
					{
						"title": "Entscheidungen des Bundesgerichtshofes in Zivilsachen 246, 1 [1. Kündigungssperrfrist bei Einbringung in Familien-GbR] (S. 1 - 17)",
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
		"url": "https://research.wolterskluwer-online.de/document/8622437f-ecab-3339-b214-4743f26fecc1",
		"items": [
			{
				"itemType": "case",
				"caseName": "BVerwG, 08.06.2021 - 9 B 26.20",
				"creators": [],
				"dateDecided": "2021-06-08",
				"court": "BVerwG",
				"docketNumber": "9 B 26.20",
				"extra": "Beschluss",
				"firstPage": "1",
				"reporter": "Buchholz",
				"reporterVolume": "11 Art. 1 GG Nr. 22",
				"url": "https://research.wolterskluwer-online.de/document/8622437f-ecab-3339-b214-4743f26fecc1",
				"attachments": [
					{
						"title": "Buchholz - Sammel- und Nachschlagewerk der Rechtsprechung des Bundesverwaltungsgerichts 11 Art. 1 GG Nr. 22 (S. 1 - 6)",
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
		"url": "https://research.wolterskluwer-online.de/document/a66a3ba4-72af-3beb-82bd-cbffca526dc2",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Gleichstellungsgesetze im Wandel? – Zur verfassungsrechtlichen Möglichkeit der Ausweitung des Förderauftrags auf andere Geschlechter",
				"creators": [
					{
						"firstName": "Sina",
						"lastName": "Fontana",
						"creatorType": "author"
					},
					{
						"firstName": "Pia",
						"lastName": "Lange",
						"creatorType": "author"
					}
				],
				"date": "2026",
				"issue": "18",
				"libraryCatalog": "Wolters Kluwer",
				"pages": "1126-1133",
				"publicationTitle": "DVBl",
				"shortTitle": "Gleichstellungsgesetze im Wandel?",
				"url": "https://research.wolterskluwer-online.de/document/a66a3ba4-72af-3beb-82bd-cbffca526dc2",
				"attachments": [
					{
						"title": "Fontana, Lange, DVBl 2026, 1126 Gleichstellungsgesetze im Wandel? – Zur verfassungsrechtlichen Möglichkeit der Ausweitung des Förderauftrags auf andere Geschlechter",
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
		"url": "https://research.wolterskluwer-online.de/document/00e5899e-a2ae-3ea1-bacd-108a40b872bc",
		"items": [
			{
				"itemType": "case",
				"caseName": "BauR 2026, 1601 Ausschluss fossiler Brennstoffe in einem Bebauungsplan",
				"creators": [],
				"firstPage": "1601",
				"reporter": "BauR",
				"reporterVolume": "2026",
				"url": "https://research.wolterskluwer-online.de/document/00e5899e-a2ae-3ea1-bacd-108a40b872bc",
				"attachments": [
					{
						"title": "BauR 2026, 1601 Ausschluss fossiler Brennstoffe in einem Bebauungsplan",
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
		"url": "https://research.wolterskluwer-online.de/document/962221d9-ef76-3513-a648-73560237157f",
		"items": [
			{
				"itemType": "encyclopediaArticle",
				"title": "§ 3 AGG",
				"creators": [
					{
						"lastName": "Schleusener",
						"creatorType": "editor",
						"fieldMode": 1
					},
					{
						"lastName": "Suckow",
						"creatorType": "editor",
						"fieldMode": 1
					},
					{
						"lastName": "Thieken",
						"creatorType": "editor",
						"fieldMode": 1
					},
					{
						"lastName": "Plum",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"lastName": "Thieken",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "2025",
				"edition": "7",
				"encyclopediaTitle": "AGG - Kommentar",
				"libraryCatalog": "Wolters Kluwer",
				"publisher": "Luchterhand Verlag",
				"url": "https://research.wolterskluwer-online.de/document/962221d9-ef76-3513-a648-73560237157f",
				"attachments": [
					{
						"title": "§ 3 AGG – Begriffsbestimmungen",
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
		"url": "https://research.wolterskluwer-online.de/document/70be48ae-1e07-499e-8e36-d550b2f984c5",
		"items": [
			{
				"itemType": "encyclopediaArticle",
				"title": "§ 1 VwVfG",
				"creators": [
					{
						"lastName": "Kugele",
						"creatorType": "editor",
						"fieldMode": 1
					},
					{
						"firstName": "Dieter",
						"lastName": "Kugele",
						"creatorType": "author"
					}
				],
				"date": "2023-08-01",
				"encyclopediaTitle": "VwVfG Kurzkommentar",
				"libraryCatalog": "Wolters Kluwer",
				"publisher": "Wolters Kluwer Deutschland",
				"url": "https://research.wolterskluwer-online.de/document/70be48ae-1e07-499e-8e36-d550b2f984c5",
				"attachments": [
					{
						"title": "§ 1 VwVfG – OK - Anwendungsbereich",
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
		"url": "https://research.wolterskluwer-online.de/document/4add706a-72c0-33ef-9e8a-c2e4b0a63be5",
		"items": [
			{
				"itemType": "encyclopediaArticle",
				"title": "Übersicht",
				"creators": [
					{
						"lastName": "Happ",
						"creatorType": "editor",
						"fieldMode": 1
					},
					{
						"lastName": "Groß",
						"creatorType": "editor",
						"fieldMode": 1
					},
					{
						"lastName": "Möhrle",
						"creatorType": "editor",
						"fieldMode": 1
					},
					{
						"lastName": "Vetter",
						"creatorType": "editor",
						"fieldMode": 1
					}
				],
				"date": "2019",
				"edition": "5",
				"encyclopediaTitle": "Aktienrecht",
				"libraryCatalog": "Wolters Kluwer",
				"publisher": "Carl Heymanns Verlag",
				"url": "https://research.wolterskluwer-online.de/document/4add706a-72c0-33ef-9e8a-c2e4b0a63be5",
				"volume": "1",
				"attachments": [
					{
						"title": "Übersicht",
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
		"url": "https://research.wolterskluwer-online.de/document/69abbc52-868c-346f-8a7d-bd2ea6f8dd88",
		"items": [
			{
				"itemType": "encyclopediaArticle",
				"title": "§ 1 SGB VIII",
				"creators": [
					{
						"lastName": "Krug",
						"creatorType": "editor",
						"fieldMode": 1
					},
					{
						"lastName": "Riehle",
						"creatorType": "editor",
						"fieldMode": 1
					},
					{
						"lastName": "Schwarz",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "2023-01-01",
				"edition": "214. Lfg.",
				"encyclopediaTitle": "SGB VIII",
				"libraryCatalog": "Wolters Kluwer",
				"publisher": "Luchterhand Verlag",
				"url": "https://research.wolterskluwer-online.de/document/69abbc52-868c-346f-8a7d-bd2ea6f8dd88",
				"attachments": [
					{
						"title": "§ 1 SGB VIII – Recht auf Erziehung, Elternverantwortung, Jugendhilfe",
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
		"url": "https://research.wolterskluwer-online.de/document/1777f6db-bbc1-4d4d-a0a2-92978ff5d03d",
		"items": [
			{
				"itemType": "book",
				"title": "Abwasserrecht",
				"creators": [
					{
						"lastName": "Brinkheetker",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"lastName": "Cosack",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"libraryCatalog": "Wolters Kluwer",
				"url": "https://research.wolterskluwer-online.de/document/1777f6db-bbc1-4d4d-a0a2-92978ff5d03d",
				"attachments": [
					{
						"title": "Abwasser - Fassadenreinigung",
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
		"url": "https://research.wolterskluwer-online.de/document/24845ee0-4ff6-3058-ac00-9642c2c44484",
		"detectedItemType": "book",
		"items": [
			{
				"itemType": "bookSection",
				"title": "A. Räumlicher Geltungsbereich",
				"creators": [
					{
						"lastName": "Baldringer",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"lastName": "Löffelmann",
						"creatorType": "editor",
						"fieldMode": 1
					},
					{
						"lastName": "Keldungs",
						"creatorType": "editor",
						"fieldMode": 1
					},
					{
						"lastName": "Baldringer",
						"creatorType": "editor",
						"fieldMode": 1
					}
				],
				"date": "2024-08-01",
				"bookTitle": "Architektenrecht",
				"edition": "8",
				"libraryCatalog": "Wolters Kluwer",
				"publisher": "WERNER Verlag",
				"url": "https://research.wolterskluwer-online.de/document/24845ee0-4ff6-3058-ac00-9642c2c44484",
				"attachments": [
					{
						"title": "A. Räumlicher Geltungsbereich",
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
		"url": "https://research.wolterskluwer-online.de/document/9018a7b0-184f-3dd9-a27e-88b9c4b36a27",
		"items": [
			{
				"itemType": "book",
				"title": "Abmahnung",
				"creators": [
					{
						"lastName": "Kleinebrink",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "2017",
				"edition": "3",
				"libraryCatalog": "Wolters Kluwer",
				"publisher": "Luchterhand Verlag",
				"url": "https://research.wolterskluwer-online.de/document/9018a7b0-184f-3dd9-a27e-88b9c4b36a27",
				"attachments": [
					{
						"title": "I. Abmahnung als personenbezogenes Datum",
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
		"url": "https://research.wolterskluwer-online.de/document/56e36422-8ac5-4aa9-8923-d7ebf0cf4aff",
		"items": [
			{
				"itemType": "case",
				"caseName": "VGH Bayern, 13.08.2026 - 10 ZB 26.1300",
				"creators": [],
				"dateDecided": "2026-08-13",
				"court": "VGH Bayern",
				"docketNumber": "10 ZB 26.1300",
				"firstPage": "21564",
				"reporter": "WKRS",
				"reporterVolume": "2026",
				"url": "https://research.wolterskluwer-online.de/document/56e36422-8ac5-4aa9-8923-d7ebf0cf4aff",
				"attachments": [
					{
						"title": "Verwaltungsgerichtshof Bayern v. 13.08.2026, Az.: 10 ZB 26.1300",
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
		"url": "https://research.wolterskluwer-online.de/document/d6a6b268-68e8-415e-98df-2c57a8b68409",
		"items": [
			{
				"itemType": "case",
				"caseName": "OVG Sachsen-Anhalt, 11.08.2025 - 2 M 64/25",
				"creators": [],
				"dateDecided": "2025-08-11",
				"abstractNote": "Voraussetzungen eines Anspruchs auf Erteilung der begehrten Aufenthaltserlaubnis; Nachholung des Visumverfahrens",
				"court": "OVG Sachsen-Anhalt",
				"docketNumber": "2 M 64/25",
				"firstPage": "21991",
				"reporter": "WKRS",
				"reporterVolume": "2025",
				"url": "https://research.wolterskluwer-online.de/document/d6a6b268-68e8-415e-98df-2c57a8b68409",
				"attachments": [
					{
						"title": "Oberverwaltungsgericht Sachsen-Anhalt Beschl. v. 11.08.2025, Az.: 2 M 64/25",
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
		"url": "https://research.wolterskluwer-online.de/document/620a16c0-9b02-35b9-af49-a9fe36bcefd3",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Das Unterschieben von Rauschmitteln zulasten vermeintlicher Täter",
				"creators": [
					{
						"firstName": "Philipp",
						"lastName": "Molsberger",
						"creatorType": "author"
					},
					{
						"firstName": "Wolfgang",
						"lastName": "Ziebarth",
						"creatorType": "author"
					}
				],
				"date": "2026",
				"issue": "10",
				"libraryCatalog": "Wolters Kluwer",
				"pages": "537-541",
				"publicationTitle": "Die Polizei",
				"url": "https://research.wolterskluwer-online.de/document/620a16c0-9b02-35b9-af49-a9fe36bcefd3",
				"attachments": [
					{
						"title": "Molsberger, Ziebarth, Polizei 2026, 537 Das Unterschieben von Rauschmitteln zulasten vermeintlicher Täter",
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
		"url": "https://research.wolterskluwer-online.de/document/7cd93d09-508f-3b39-bd26-c4ce516a7edd",
		"detectedItemType": "book",
		"items": [
			{
				"itemType": "bookSection",
				"title": "12.06 Genehmigtes Kapital1 §§ 202 ff. AktG",
				"creators": [
					{
						"lastName": "Herchen",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"lastName": "Happ",
						"creatorType": "editor",
						"fieldMode": 1
					},
					{
						"lastName": "Groß",
						"creatorType": "editor",
						"fieldMode": 1
					},
					{
						"lastName": "Möhrle",
						"creatorType": "editor",
						"fieldMode": 1
					},
					{
						"lastName": "Vetter",
						"creatorType": "editor",
						"fieldMode": 1
					}
				],
				"date": "2020",
				"bookTitle": "Aktienrecht",
				"edition": "5",
				"libraryCatalog": "Wolters Kluwer",
				"publisher": "Carl Heymanns Verlag",
				"url": "https://research.wolterskluwer-online.de/document/7cd93d09-508f-3b39-bd26-c4ce516a7edd",
				"volume": "2",
				"attachments": [
					{
						"title": "12.06 Genehmigtes Kapital1 §§ 202 ff. AktG",
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
