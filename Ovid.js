{
	"translatorID": "cde4428-5434-437f-9cd9-2281d14dbf9",
	"label": "Ovid",
	"creator": "Simon Kornblith, Michael Berkowitz, and Ovid Technologies",
	"target": "(gw2|asinghal|sp|ovid)[^/]+/ovidweb\\.cgi",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-03-03 21:51:19"
}

/*
   Ovid Zotero Translator
   Copyright (c) 2000-2012 Ovid Technologies, Inc., 2025 Abe Jellinek

   This program is free software: you can redistribute it and/or modify
   it under the terms of the GNU Affero General Public License as
   published by the Free Software Foundation, either version 3 of the
   License, or (at your option) any later version.

   This program is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU Affero General Public License for more details.

   You should have received a copy of the GNU Affero General Public License
   along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/


function detectWeb(doc, url) {
	if (getSearchResults(doc, true) && getS(doc, url)) {
		return 'multiple';
	}

	var id = getIDFromUrl(url);
	Zotero.debug("Found ID: " + id);
	if (id && getS(doc, url)) {
		return 'journalArticle';
	}

	return false;
}

async function getExportSearchParams(doc, url) {
	let s = getS(doc, url);
	if (!s) {
		Zotero.debug("Could not find S parameter");
		return false;
	}

	let action = (attr(doc, '#Datalist, #CitManPrev', 'value') || url).match(/S\.sh\.\d+/)?.[0];
	if (!action) {
		Zotero.debug("Citation Action component not found");
		return false;
	}

	let { data: { params: { PrintFieldsDataList } } }
		= await requestJSON(`./ovidweb.cgi?S=${encodeURIComponent(s)}&Export+Initial+Data=${encodeURIComponent(action)}%7Csearch&records_on_page=1-25`);

	let params = new URLSearchParams();
	params.set('S', s);
	params.set('Citation Action', action);
	params.set('cmexport', '1');
	params.set('jumpstartLink', '1');
	params.set('cmFields', 'ALL');
	params.set('exportType', 'endnote');
	params.set('PrintFieldsDataList', PrintFieldsDataList);
	params.set('externalResolverLink', '1');
	params.set('zoteroRecords', '1');
	return params.toString().replace(/\+/g, '%20');
}

function getIDFromUrl(url) {
	var m = decodeURI(url).match(/=(S\.sh\.[^&#|]+\|[1-9]\d*)/);
	if (m) return m[1];
	return false;
}

function getS(doc, url) {
	return doc.getElementById('S')?.value
		|| getSFromUrl(url);
}

function getSFromUrl(url) {
	return new URL(url).searchParams.get('S');
}

// seems like we have to check all of these, because some can be present but empty
// next to other nodes that are not empty
var titleNodeClasses = ['citation_title',
	'titles-title',
	'article-title',
	'chapter_title',
	'chapter-title',
	'muse-title',
	'booklist-title'];
function getSearchResults(doc, checkOnly, extras) {
	var table = doc.getElementById('titles-records')
		|| doc.getElementById('item-records');
	if (!table) return false;

	var rows = table.getElementsByClassName('titles-row');
	if (!rows.length) rows = table.getElementsByClassName('toc-row');
	if (!rows.length) rows = table.getElementsByClassName('booklist-row');

	var successfulHit;
	if (!rows.length) return false;

	var items = {}, found = false;
	for (let row of rows) {
		var id = getIDFromUrl(attr(row, 'a', 'href'));
		if (!id) continue;

		var title;
		if (successfulHit) {
			title = row.getElementsByClassName(successfulHit)[0];
			if (title) title = ZU.trimInternal(title.textContent);
		}
		else {
			for (var j = 0; j < titleNodeClasses.length; j++) {
				title = row.getElementsByClassName(titleNodeClasses[j])[0];
				if (title) title = ZU.trimInternal(title.textContent);
				if (title) {
					successfulHit = titleNodeClasses[j];
					break;
				}
			}
		}

		if (!title) continue;

		if (checkOnly) return true;
		found = true;
		items[id] = title;

		var checkbox = row.querySelector('input.bibrecord-checkbox');
		if (checkbox) {
			items[id] = {
				title: title,
				checked: checkbox.checked
			};
		}

		if (extras) {
			// Look for PDF link
			var pdfLink = row.querySelector('a > .pdf-icon')?.parentElement;
			if (pdfLink) {
				extras[id] = { linkURL: pdfLink.href };
			}
		}
	}

	return found ? items : false;
}

async function doWeb(doc, url) {
	var extras = {
		callNumberToID: {},
		callNumberToPDF: {},
	};
	var results = getSearchResults(doc, false, extras);
	if (results) {
		let selectedIds = await Zotero.selectItems(results);
		if (!selectedIds) return;
		await fetchMetadata(doc, url, Object.keys(selectedIds), extras);
	}
	else {
		var id = getIDFromUrl(url);

		// Look for PDF link on page as well
		var pdfLink = doc.getElementById('pdf')
			|| doc.querySelector('a > .pdf-icon')?.parentElement;
		if (pdfLink) {
			extras[id] = { linkURL: pdfLink.href };
		}
		else if ((pdfLink = doc.getElementById('embedded-frame'))) {
			extras[id] = { resolvedURL: pdfLink.src };
		}
		else {
			// Attempt to construct it from the URL
			var s = getSFromUrl(url);
			var pdfID = decodeURI(url).match(/\bS\.sh.\d+\|[1-9]\d*/);
			if (s && pdfID) {
				Zotero.debug("Manually constructing PDF URL. There might not be one available.");
				extras[id] = {
					linkURL: 'ovidweb.cgi?S=' + encodeURIComponent(s) + '&PDFLink=B|' + encodeURIComponent(pdfID[0])
				};
			}
		}

		await fetchMetadata(doc, url, [id], extras);
	}
}

async function fetchMetadata(doc, url, ids, extras) {
	let s = getS(doc, url);

	// The export API acts on checked search results, which are tracked server-side
	// So we need to check the results we want to export and uncheck them later

	async function getSelectedCount() {
		return (await requestJSON(`./ovidweb.cgi?&S=${encodeURIComponent(s)}&View+Current+Selected=1`))
			.record_count;
	}

	let selectedCount = await getSelectedCount();
	Zotero.debug('Selected before: ' + selectedCount);
	let toDeselect = [];
	for (let id of ids) {
		await request(`./ovidweb.cgi?&S=${encodeURIComponent(s)}&Citation+Selection=${id}|Y&on_msp=1&selectall=0`);
		let newRecordCount = await getSelectedCount();
		if (newRecordCount > selectedCount) {
			toDeselect.push(id);
		}
		selectedCount = newRecordCount;
	}
	Zotero.debug('Selected for export: ' + selectedCount);

	try {
		let searchParams = await getExportSearchParams(doc, url);
		Zotero.debug("Params: " + searchParams);

		let taggedText = await requestText('./ovidweb.cgi?' + searchParams);

		// Get rid of some extra HTML fluff from the request if it's there
		// The section we want starts with something like
		// --HMvBAmfg|xxEGNm@\<{bVtBLgneqH?vKCw?nsIZhjcjsyRFVQ=
		// Content-type: application/x-bibliographic
		// Content-Transfer-Encoding: quoted-printable
		// Content-Description: Ovid Citations
		//
		// and ends with
		// --HMvBAmfg|xxEGNm@\<{bVtBLgneqH?vKCw?nsIZhjcjsyRFVQ=--

		taggedText = taggedText.replace(/[\s\S]*(--\S+)\s+Content-type:\s*application\/x-bibliographic[^<]+([\s\S]+?)\s*\1[\s\S]*/, '$2');
		Z.debug(taggedText);

		var trans = Zotero.loadTranslator('import');
		// OVID Tagged
		trans.setTranslator('59e7e93e-4ef0-4777-8388-d6eddb3261bf');
		trans.setString(taggedText);
		trans.setHandler('itemDone', function (obj, item) {
			let id = ids.find(id => id.endsWith('|' + item.itemID));
			if (!id) {
				// Item was checked in Ovid UI but not selected in dialog
				return;
			}
			delete item.itemID;
			if (extras[id]) {
				retrievePdfUrl(item, extras[id]);
			}
			else {
				item.complete();
			}
		});
		await trans.translate();
	}
	finally {
		for (let id of toDeselect) {
			await request(`./ovidweb.cgi?&S=${encodeURIComponent(s)}&Citation+Selection=${id}|N&on_msp=1&selectall=0`);
		}
		Zotero.debug('Selected after: ' + await getSelectedCount());
	}
}

function retrievePdfUrl(item, extras) {
	if (extras.resolvedURL) {
		item.attachments.push({
			title: "Full Text PDF",
			url: extras.resolvedURL,
			mimeType: 'application/pdf'
		});
		item.complete();
	}
	else if (extras.linkURL) {
		Zotero.debug("Looking for PDF URL on " + extras.linkURL);
		ZU.doGet(extras.linkURL, function (text) {
			var m = text.match(/<iframe [^>]*src\s*=\s*(['"])(.*?)\1/);
			if (m) {
				item.attachments.push({
					title: "Full Text PDF",
					url: m[2],
					mimeType: 'application/pdf'
				});
			}
		}, function () {
			item.complete();
		});
	}
	else {
		item.complete();
	}
}

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
