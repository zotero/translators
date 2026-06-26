{
	"translatorID": "a3f2b1c4-d5e6-7f89-a012-b3c4d5e6f789",
	"label": "Lovdata",
	"creator": "Sondre Bogen-Straume",
	"target": "^https?://(www\\.)?lovdata\\.no/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": false,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-06-17 00:00:00"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Lovdata Translator
	Copyright © 2026 Sondre Bogen-Straume

	This file is part of Zotero.

	Zotero is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	Zotero is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
	GNU Affero General Public License for more details.

	***** END LICENSE BLOCK *****
*/

var COURTS = {
	hr: 'Norges Høyesterett',
	lb: 'Borgarting lagmannsrett',
	la: 'Agder lagmannsrett',
	lf: 'Frostating lagmannsrett',
	lg: 'Gulating lagmannsrett',
	le: 'Eidsivating lagmannsrett',
	lh: 'Hålogaland lagmannsrett',
	toslo: 'Oslo tingrett',
	tberg: 'Bergen tingrett',
	tstav: 'Stavanger tingrett',
	tron: 'Trondheim tingrett',
	tnord: 'Nord-Troms og Senja tingrett',
	troms: 'Troms tingrett',
	thed: 'Innlandet tingrett',
	tguli: 'Sogn og Fjordane tingrett',
	tvest: 'Vestfold tingrett',
	tagder: 'Agder tingrett',
	ttelema: 'Nedre Telemark tingrett'
};

var MONTHS_NO = [
	'januar', 'februar', 'mars', 'april', 'mai', 'juni',
	'juli', 'august', 'september', 'oktober', 'november', 'desember'
];

function detectWeb(doc, url) {
	if (/\/(lov|forskrift)\/\d{4}-\d{2}-\d{2}/.test(url)) {
		return 'statute';
	}
	if (/\/avgjorelse\/[a-z]+-\d{4}/.test(url)) {
		return 'case';
	}
	return 'webpage';
}

function doWeb(doc, url) {
	scrape(doc, url);
}

function scrape(doc, url) {
	var docType = detectWeb(doc, url);
	if (!docType) return;

	var item = new Zotero.Item(docType);

	// Title: prefer og:title, fall back to <title>
	var ogTitleEl = doc.querySelector('meta[property="og:title"]');
	var title = ogTitleEl
		? (ogTitleEl.getAttribute('content') || '')
		: doc.title.replace(/\s*[-–|]\s*Lovdata\s*$/i, '').trim();

	var meta = extractMetaFields(doc);

	// Last URL path segment is the document identifier
	var lastSegment = url.split('?')[0].replace(/\/$/, '').split('/').pop();

	if (docType === 'statute') {
		var isForskrift = /\/forskrift\//.test(url);
		var prefix = isForskrift ? 'FOR' : 'LOV';

		// The "Dato" metadata field on Lovdata shows the official reference, e.g. "LOV-2005-05-20-28"
		var codeNumber = meta['Dato'] || '';
		var dateEnacted = '';

		if (codeNumber && /^(LOV|FOR)-\d{4}-\d{2}-\d{2}/.test(codeNumber)) {
			var dm = codeNumber.match(/\d{4}-\d{2}-\d{2}/);
			if (dm) dateEnacted = dm[0];
		}
		else {
			// Construct from URL pattern: /lov/2005-05-20-28
			var dateMatch = url.match(/\/(\d{4}-\d{2}-\d{2})-(\d+)/);
			if (dateMatch) {
				dateEnacted = dateMatch[1];
				codeNumber = prefix + '-' + dateMatch[1] + '-' + dateMatch[2];
			}
			else {
				codeNumber = lastSegment.toUpperCase();
			}
		}

		// Short title from "Korttittel" field: "Straffeloven – strl." → "Straffeloven"
		var shortTitle = meta['Korttittel'] || '';
		if (shortTitle) {
			shortTitle = shortTitle.replace(/\s*[–-]\s*\w+\.\s*$/, '').trim();
		}
		else {
			var pm = title.match(/\(([^)]+)\)\s*$/);
			if (pm) shortTitle = pm[1];
		}

		var fullTitle = buildStatuteTitle(title, dateEnacted, codeNumber, isForskrift);

		item.nameOfAct = fullTitle;
		item.shortTitle = shortTitle;
		item.codeNumber = codeNumber;
		item.dateEnacted = dateEnacted;

		var dept = meta['Departement'] || meta['Avdeling'] || '';
		if (dept) {
			item.creators.push({ creatorType: 'author', lastName: dept, fieldMode: 1 });
		}

		// Abstract from SNL summary block
		var snlDiv = doc.querySelector('.dokument-intro.snl-summary');
		if (snlDiv) {
			var snlClone = snlDiv.cloneNode(true);
			// Remove "Sist endret"-line and "Les mer"-link
			var toRemove = snlClone.querySelectorAll('.snl-lastchanged, .snl-readmore');
			for (var r = 0; r < toRemove.length; r++) {
				toRemove[r].parentNode.removeChild(toRemove[r]);
			}
			item.abstractNote = ZU.trimInternal(snlClone.textContent).trim();
		}

		// History from amendment notices (paragraphs with class morTag_mf)
		var historyParts = [];
		var historyNodes = doc.querySelectorAll('p.morTag_mf');
		for (var h = 0; h < historyNodes.length; h++) {
			var hText = ZU.trimInternal(historyNodes[h].textContent).trim();
			if (hText) historyParts.push(hText);
		}
		if (historyParts.length) {
			item.extra = 'Historie:\n' + historyParts.join('\n');
		}
	}
	else if (docType === 'case') {
		var docketNumber = lastSegment.toUpperCase();

		var prefixMatch = lastSegment.match(/^([a-z]+)-/);
		var court = meta['Domstol'] || meta['Instans'] || '';
		if (!court && prefixMatch) {
			court = COURTS[prefixMatch[1]] || prefixMatch[1].toUpperCase();
		}

		var dateDecided = '';
		if (meta['Dato'] && !/^[A-Z]{2,}-/.test(meta['Dato'])) {
			dateDecided = ZU.strToISO(meta['Dato']) || '';
		}

		// Page title format: "Norges Høyesterett - Dom: HR-2021-2580-A - Lovdata"
		var caseName = docketNumber;
		var decisionType = '';
		var titleMatch = title.match(/^(.+?)\s*[-–]\s*(Dom|Kjennelse|Beslutning|Ordreskrift|Uttalelse)\s*:\s*(.+)$/i);
		if (titleMatch) {
			if (!court) court = titleMatch[1].trim();
			decisionType = titleMatch[2].trim();
			caseName = titleMatch[3].trim();
		}

		item.caseName = caseName;
		item.court = court;
		item.docketNumber = docketNumber;
		if (dateDecided) item.dateDecided = dateDecided;
		if (decisionType) item.extra = 'Avgjørelsestype: ' + decisionType;

		// Abstract from meta description
		var descEl = doc.querySelector('meta[name="description"]');
		if (descEl) item.abstractNote = descEl.getAttribute('content') || '';

		// Tags/emneord from Stikkord – plain text nodes before the first <a> link
		var stikkordCell = doc.querySelector('#metaField_stikkord');
		if (stikkordCell) {
			var kwText = '';
			for (var k = 0; k < stikkordCell.childNodes.length; k++) {
				var knode = stikkordCell.childNodes[k];
				if (knode.nodeType === 1 && knode.tagName === 'A') break;
				if (knode.nodeType === 3) kwText += knode.textContent;
			}
			kwText.split(/\.\s+/).forEach(function (kw) {
				kw = kw.replace(/\.\s*$/, '').trim();
				if (kw) item.tags.push(kw);
			});
		}

		// History/saksgang – plain text without the hidden popup
		var saksgangCell = doc.querySelector('#metaField_saksgang');
		if (saksgangCell) {
			var sgClone = saksgangCell.cloneNode(true);
			var popup = sgClone.querySelector('[data-role="popup"], [style*="display:none"]');
			if (popup) popup.parentNode.removeChild(popup);
			var showLink = sgClone.querySelector('.showRettskraftInfo');
			if (showLink) showLink.parentNode.removeChild(showLink);
			item.history = ZU.trimInternal(sgClone.textContent).trim();
		}

		// Parter → counsel (one literal entry with the full parties string)
		var parterCell = doc.querySelector('#metaField_parter');
		if (parterCell) {
			var parterText = ZU.trimInternal(parterCell.textContent).trim();
			if (parterText) {
				item.creators.push({ creatorType: 'counsel', lastName: parterText, fieldMode: 1 });
			}
		}

		// Forfatter/rettsmedlemmer → author creators
		var rettsmedlemCell = doc.querySelector('#metaField_rettsmedlemmer');
		if (rettsmedlemCell) {
			parseJudges(rettsmedlemCell, item);
		}

		// Henvisninger i teksten → attached note
		var henviCell = doc.querySelector('#metaField_henvisning');
		if (henviCell) {
			var henviClone = henviCell.cloneNode(true);
			var hideLink = henviClone.querySelector('.hideTooLong');
			if (hideLink) hideLink.parentNode.removeChild(hideLink);
			// Replace | separators with line breaks
			henviClone.querySelectorAll('.lovhenvisningSeparator').forEach(function (sep) {
				sep.textContent = '\n';
			});
			var henviText = ZU.trimInternal(henviClone.textContent)
				.replace(/ , /g, ', ')
				.trim();
			var safeText = henviText
				.replace(/&/g, '&amp;')
				.replace(/</g, '&lt;')
				.replace(/>/g, '&gt;');
			item.notes.push({ note: '<h2>Henvisninger i teksten</h2><pre>' + safeText + '</pre>' });
		}
	}

	// Fallback for unrecognized Lovdata pages – save as plain webpage
	if (docType === 'webpage') {
		item.title = title || doc.title;
		item.websiteTitle = 'Lovdata';
		item.creators.push({ creatorType: 'author', firstName: 'Sondre', lastName: 'Bogen-Straume' });
		item.attachments.push({ title: 'Snapshot', document: doc });
	}

	item.attachments.push({ title: 'Snapshot', document: doc });

	item.url = url;
	item.language = 'no';
	item.accessDate = ZU.strToISO(new Date().toString());
	item.complete();
}

/**
 * Formats "YYYY-MM-DD" → "20. mai 2005"
 */
function formatDateNo(isoDate) {
	var m = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
	if (!m) return isoDate;
	var day = parseInt(m[3], 10);
	var month = MONTHS_NO[parseInt(m[2], 10) - 1];
	return day + '. ' + month + ' ' + m[1];
}

/**
 * Builds "Lov 20. mai 2005 nr. 28 om straff (straffeloven)"
 * from the Lovdata page title "Lov om straff (straffeloven)".
 */
function buildStatuteTitle(pageTitle, dateEnacted, codeNumber, isForskrift) {
	var typeWord = isForskrift ? 'Forskrift' : 'Lov';

	// Number is the last segment of codeNumber: "LOV-2005-05-20-28" → "28"
	var numMatch = codeNumber.match(/-(\d+)$/);
	var num = numMatch ? numMatch[1] : '';

	// Strip leading type word: "Lov om straff..." → "om straff..."
	var rest = pageTitle.replace(new RegExp('^' + typeWord + '\\s+', 'i'), '').trim();

	var parts = [typeWord];
	if (dateEnacted) parts.push(formatDateNo(dateEnacted));
	if (num) parts.push('nr. ' + num);
	if (rest) parts.push(rest);
	return parts.join(' ');
}

/**
 * Extracts metadata label→value pairs from Lovdata's facts panel.
 * Tries dl/dt/dd first, then table rows as fallback.
 */
function extractMetaFields(doc) {
	var fields = {};

	var dts = doc.querySelectorAll('dt');
	for (var i = 0; i < dts.length; i++) {
		var dt = dts[i];
		var label = ZU.trimInternal(dt.textContent).replace(/:$/, '').trim();
		var dd = dt.nextElementSibling;
		if (dd && dd.tagName === 'DD') {
			fields[label] = ZU.trimInternal(dd.textContent).trim();
		}
	}
	if (Object.keys(fields).length) return fields;

	var rows = doc.querySelectorAll('tr');
	for (var j = 0; j < rows.length; j++) {
		var cells = rows[j].querySelectorAll('th, td');
		if (cells.length >= 2) {
			var lbl = ZU.trimInternal(cells[0].textContent).replace(/:$/, '').trim();
			var val = ZU.trimInternal(cells[1].textContent).trim();
			if (lbl) fields[lbl] = val;
		}
	}

	return fields;
}

/**
 * Parses judge names from the rettsmedlemmer cell and adds them as 'author' creators.
 * Handles patterns like:
 *   "Tingrettsdommer Jon Sverdrup Efjestad.\nMeddommere: Monica Eriksen og Per-Otto Oppi Christiansen."
 */
function parseJudges(cell, item) {
	var titlePattern = /^(Høyesterettsjustitiarius|Høyesterettsdommer|Lagdommer|Tingrettsdommer|Jordskiftedommer|Meddommere?|Fagdommere?|Rettens leder)\s*:?\s*/i;

	var fullText = ZU.trimInternal(cell.textContent);

	// Split on sentence boundaries and line breaks
	var segments = fullText.split(/\.\s+|\.\s*$/m);

	for (var s = 0; s < segments.length; s++) {
		var seg = segments[s].trim();
		if (!seg) continue;

		// Strip leading role title
		seg = seg.replace(titlePattern, '').trim();
		if (!seg) continue;

		// Split multiple names joined by " og "
		var names = seg.split(/\s+og\s+/);
		for (var n = 0; n < names.length; n++) {
			var name = names[n].replace(/[.,]+$/, '').trim();
			if (!name) continue;

			var parts = name.split(/\s+/);
			if (parts.length >= 2) {
				item.creators.push({
					creatorType: 'author',
					firstName: parts.slice(0, parts.length - 1).join(' '),
					lastName: parts[parts.length - 1]
				});
			}
			else if (parts.length === 1) {
				item.creators.push({ creatorType: 'author', lastName: parts[0], fieldMode: 1 });
			}
		}
	}
}

/** @param {Document} doc */
function getAttr(doc, selector, attribute) {
	var el = doc.querySelector(selector);
	return el ? (el.getAttribute(attribute) || '') : '';
}
