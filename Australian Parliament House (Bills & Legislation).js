{
	"translatorID": "ee31d168-6213-4436-acf6-3e08513ba501",
	"label": "Australian Parliament House (Bills & Legislation)",
	"creator": "Simon Elvery",
	"target": "https:\\/\\/www\\.aph\\.gov\\.au\\/Parliamentary_Business\\/Bills_Legislation\\/Bills_Search_Results.+",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-11-26 01:59:42"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2024 Simon Elvery
	
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
	const statusEl = Array.from(doc.querySelectorAll('.dl--inline--bills dt')).find(d => d.textContent.trim() === 'Status');
	const status = statusEl && statusEl.nextElementSibling && statusEl.nextElementSibling.textContent.trim();
	const results = doc.querySelector('.search-filter-results');
	if (!status && !results) return false;
	if (results) return 'multiple';
	return (status === 'Act') ? 'statute' : 'bill';
}


function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.search-filter-results h4 a');
	for (var i = 0; i < rows.length; i++) {
		var href = attr(rows[i], 'href');
		var title = text(rows[i]);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

async function doWeb(doc, url) {
	if (detectWeb(doc, url) === 'multiple') {
		const results = getSearchResults(doc, false);
		if (!Object.keys(results).length) return;
		let items = await Zotero.selectItems(results);
		if (!items) return;
		for (let url of Object.keys(items)) {
			await scrape(await requestDocument(url), url);
		}
	}
	else {
		await scrape(doc, url);
	}
}

function scrape(doc, url) {
	let item = new Zotero.Item(detectWeb(doc,url));
	
	item.language = "en-AU";
	item.title = text('#main_0_billSummary_divHeader h1');
	item.url = url;
	var permalink = attr(doc, '#main_0_billSummary_permalink', 'href');
	if (permalink.length > 0) {
		item.url = permalink;
	}

	item.history = Array.from(doc.querySelectorAll('#main_0_mainDiv thead tr')).reduce((all, el) => {
		const chamber = text(el, 'th');
		return all.concat(Array.from(el.querySelectorAll('tbody tr')).map((el) => {
			return `${chamber.length ? chamber + ' ' : ''}${text(el, 'td:first-child')} ${text(el, 'td:last-child')}`;
		}));
	}, []);

	item.attachments = Array.from(doc.querySelectorAll('div.bill-details tr')).reduce((acc, rowEl) => {
		const name = text(rowEl, 'li', 0).replace(/\\n/g,'').replace(/\s+/g, ' ');
		Array.from(rowEl.querySelectorAll('.format a')).forEach((aEl) => {
			const formatName = attr(aEl, 'img', 'alt');
			const mimeType = aEl.href.split(';').map(d => d.split('=').map(dd => decodeURIComponent(dd))).find(d => d[0] === 'fileType')[1];
			acc.push({
				title: `${name} (${formatName})`,
				url: aEl.href,
				mimeType
			})
		})
		return acc;
	},[])

	item.attachments.push({
		title: 'Snapshot',
		document: doc
	});

	const notesHeading = Array.from(doc.querySelectorAll('.bill-details h3')).find(d => d.textContent === 'Notes');

	if (notesHeading && notesHeading.nextElementSibling) {
		item.notes = Array.from(notesHeading.nextElementSibling.querySelectorAll('li')).map(el => ({note: el.textContent.trim()}));
	}

	item.rights = attr(doc, '[name="DCTERMS.license"]', 'content');
	
	item.complete();
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.aph.gov.au/Parliamentary_Business/Bills_Legislation/Bills_Search_Results/Result?bId=r7284",
		"items": [
			{
				"itemType": "bill",
				"title": "Online Safety Amendment (Social Media Minimum Age) Bill 2024",
				"creators": [],
				"language": "en-AU",
				"rights": "Creative Commons - Attribution-NonCommercial-NoDerivs 3.0 Australia (CC BY-NC-ND 3.0 AU)",
				"url": "https://parlinfo.aph.gov.au/parlInfo/search/display/display.w3p;query=Id%3A%22legislation%2Fbillhome%2Fr7284%22",
				"attachments": [
					{
						"title": "First reading (Word Format)",
						"mimeType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
					},
					{
						"title": "First reading (PDF Format)",
						"mimeType": "application/pdf"
					},
					{
						"title": "Explanatory memorandum (Word Format)",
						"mimeType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
					},
					{
						"title": "Explanatory memorandum (PDF Format)",
						"mimeType": "application/pdf"
					},
					{
						"title": "2nd reading amendment STEGGALL, Zali, MP (Word Format)",
						"mimeType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
					},
					{
						"title": "2nd reading amendment STEGGALL, Zali, MP (PDF Format)",
						"mimeType": "application/pdf"
					},
					{
						"title": "2nd reading amendment DANIEL, Zoe, MP (Word Format)",
						"mimeType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
					},
					{
						"title": "2nd reading amendment DANIEL, Zoe, MP (PDF Format)",
						"mimeType": "application/pdf"
					},
					{
						"title": "2nd reading amendment SCAMPS, Sophie, MP (Word Format)",
						"mimeType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
					},
					{
						"title": "2nd reading amendment SCAMPS, Sophie, MP (PDF Format)",
						"mimeType": "application/pdf"
					},
					{
						"title": "2nd reading amendment TINK, Kylea, MP (Word Format)",
						"mimeType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
					},
					{
						"title": "2nd reading amendment TINK, Kylea, MP (PDF Format)",
						"mimeType": "application/pdf"
					},
					{
						"title": "Detail - Crossbench SHARKIE, Rebekha, MP (Word Format)",
						"mimeType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
					},
					{
						"title": "Detail - Crossbench SHARKIE, Rebekha, MP (PDF Format)",
						"mimeType": "application/pdf"
					},
					{
						"title": "Bills Digest (PDF Format)",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "Referred to Committee (21/11/2024): Senate Environment and Communications Legislation Committee; Report due 26/11/2024"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.aph.gov.au/Parliamentary_Business/Bills_Legislation/Bills_Search_Results/Result?bId=r6930",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Aboriginal Land Grant (Jervis Bay Territory) Amendment (Strengthening Land and Governance Provisions) Bill 2022",
				"creators": [],
				"language": "en-AU",
				"rights": "Creative Commons - Attribution-NonCommercial-NoDerivs 3.0 Australia (CC BY-NC-ND 3.0 AU)",
				"url": "https://parlinfo.aph.gov.au/parlInfo/search/display/display.w3p;query=Id%3A%22legislation%2Fbillhome%2Fr6930%22",
				"attachments": [
					{
						"title": "First reading (Word Format)",
						"mimeType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
					},
					{
						"title": "First reading (PDF Format)",
						"mimeType": "application/pdf"
					},
					{
						"title": "As passed by both Houses (Word Format)",
						"mimeType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
					},
					{
						"title": "As passed by both Houses (PDF Format)",
						"mimeType": "application/pdf"
					},
					{
						"title": "Addendum to explanatory memorandum (Word Format)",
						"mimeType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
					},
					{
						"title": "Addendum to explanatory memorandum (PDF Format)",
						"mimeType": "application/pdf"
					},
					{
						"title": "Explanatory memorandum (Word Format)",
						"mimeType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
					},
					{
						"title": "Explanatory memorandum (PDF Format)",
						"mimeType": "application/pdf"
					},
					{
						"title": "Supplementary explanatory memorandum (Word Format)",
						"mimeType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
					},
					{
						"title": "Supplementary explanatory memorandum (PDF Format)",
						"mimeType": "application/pdf"
					},
					{
						"title": "CW - Government [sheet QL223] (Word Format)",
						"mimeType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
					},
					{
						"title": "CW - Government [sheet QL223] (PDF Format)",
						"mimeType": "application/pdf"
					},
					{
						"title": "CW - Independent [sheet 1749] THORPE, Sen Lidia (Word Format)",
						"mimeType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
					},
					{
						"title": "CW - Independent [sheet 1749] THORPE, Sen Lidia (PDF Format)",
						"mimeType": "application/pdf"
					},
					{
						"title": "CW - Independent [sheet 1774] THORPE, Sen Lidia (Word Format)",
						"mimeType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
					},
					{
						"title": "CW - Independent [sheet 1774] THORPE, Sen Lidia (PDF Format)",
						"mimeType": "application/pdf"
					},
					{
						"title": "Schedule of the amendments made by the Senate (Word Format)",
						"mimeType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
					},
					{
						"title": "Schedule of the amendments made by the Senate (PDF Format)",
						"mimeType": "application/pdf"
					},
					{
						"title": "Bills Digest (PDF Format)",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "Considered by scrutiny committee (23/11/2022): Senate Standing Committee for the Scrutiny of Bills; Scrutiny Digest 1 of 2023"
					},
					{
						"note": "An electronic version of this Act is available on the Federal Register of Legislation (www.legislation.gov.au)"
					}
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
