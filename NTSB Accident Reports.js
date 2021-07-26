{
	"translatorID": "fef8575b-da80-40ec-8084-631a08cae2bd",
	"label": "NTSB Accident Reports",
	"creator": "Abe Jellinek",
	"target": "^https?://(www\\.)?ntsb\\.gov/investigations/AccidentReports/Pages/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-07-26 18:39:23"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2021 Abe Jellinek
	
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


function detectWeb(doc, _url) {
	if (doc.querySelector('#aiBriefBox')) {
		return "report";
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.reporttitle a');
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(row.textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (items) ZU.processDocuments(Object.keys(items), scrape);
		});
	}
	else {
		scrape(doc, url);
	}
}

function scrape(doc, url) {
	let item = new Zotero.Item('report');
	
	item.title = filterTagsInHTML(
		doc.querySelector('div.page-title > *:last-child').innerHTML
			.replace('&nbsp;', ' ')
			.replace(/<em>/g, '<i>')
			.replace(/<\/em>/g, '</i>')
			.replace(/<strong>/, '<b>')
			.replace(/<\/strong>/, '</b>'), 'i, b');
	item.abstractNote = text(doc, '#exec-summary p');
	item.reportNumber = text(doc, '#NTSBNumber')
		.replace('NTSB Number:', '')
		.trim();
	item.reportType = 'Accident report';
	item.institution = 'National Transportation Safety Board';
	item.date = ZU.strToISO(text(doc, '#AdoptedDate'));
	item.language = 'en';
	item.url = url;
	
	let pdfURL = attr(doc, '#FullReportDiv .link-item a', 'href');
	if (pdfURL) {
		item.attachments.push({
			title: 'Full Text PDF',
			mimeType: 'application/pdf',
			url: pdfURL
		});
	}
	
	item.complete();
}

function filterTagsInHTML(html, allowSelector) {
	let elem = new DOMParser().parseFromString(html, 'text/html');
	filterTags(elem.body, allowSelector);
	return elem.body.innerHTML;
}

function filterTags(root, allowSelector) {
	for (let node of root.childNodes) {
		if (!node.tagName) {
			continue;
		}
		
		if (node.matches(allowSelector)) {
			filterTags(node, allowSelector);
		}
		else {
			while (node.firstChild) {
				let firstChild = node.firstChild;
				node.parentNode.insertBefore(firstChild, node);
				filterTags(firstChild, allowSelector);
			}
			node.remove();
		}
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.ntsb.gov/investigations/AccidentReports/Pages/MAR2102.aspx",
		"items": [
			{
				"itemType": "report",
				"title": "Capsizing and Sinking of Commercial Fishing Vessel ​<i>Scandies Rose</i>​​",
				"creators": [],
				"date": "2021-07-13",
				"abstractNote": "​​​On December 31, 2019, about 2200 Alaska standard time, US Coast Guard Communications Detachment Kodiak received a distress call from the fishing vessel Scandies Rose. The vessel was en route from Kodiak to fishing grounds in the Bering Sea when it capsized about 2.5 miles south of Sutwik Island, Alaska, and sank several minutes later. At the time of the accident, the Scandies Rose had seven crewmembers aboard, two of whom were rescued by the Coast Guard several hours later. The other missing crewmembers were not found and are presumed dead. The Scandies Rose, valued at $15 million, was declared a total loss.",
				"institution": "National Transportation Safety Board",
				"language": "en",
				"libraryCatalog": "NTSB Accident Reports",
				"reportNumber": "MAR-21-02",
				"reportType": "Accident report",
				"url": "https://www.ntsb.gov/investigations/AccidentReports/Pages/MAR2102.aspx",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
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
		"url": "https://www.ntsb.gov/investigations/AccidentReports/Pages/MAB2109.aspx",
		"items": [
			{
				"itemType": "report",
				"title": "Container Damage and Loss aboard Deck Cargo Barge <i>Ho'omaka Hou</i>, Towed by <i>Hoku Loa</i>​",
				"creators": [],
				"date": "2021-04-06",
				"abstractNote": "​On June 22, 2020, about 0230 local time, the deck cargo barge Ho'omaka Hou was under tow by the towing vessel Hoku Loa off the northeast coast of the big island of Hawaii en route to Hilo, when fifty 40-foot containers stacked on the after deck of the barge toppled, causing 21 to fall into the ocean. There were no injuries or pollution reported. Eight containers were eventually recovered by salvors, and 13 remain missing. Cargo loss was estimated at $1.5 million, and damage to the barge and containers was estimated at $131,000.",
				"institution": "National Transportation Safety Board",
				"language": "en",
				"libraryCatalog": "NTSB Accident Reports",
				"reportNumber": "MAB-21-09",
				"reportType": "Accident report",
				"url": "https://www.ntsb.gov/investigations/AccidentReports/Pages/MAB2109.aspx",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
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
		"url": "https://www.ntsb.gov/investigations/AccidentReports/Pages/HWY21MH006-preliminary-report.aspx",
		"items": [
			{
				"itemType": "report",
				"title": "Preliminary Report - Highway: HWY21MH006",
				"creators": [],
				"date": "2021-04-12",
				"abstractNote": "​The information in this report is preliminary and will be supplemented or corrected during the course of the investigation.",
				"institution": "National Transportation Safety Board",
				"language": "en",
				"libraryCatalog": "NTSB Accident Reports",
				"reportNumber": "HWY21MH006-preliminary-report",
				"reportType": "Accident report",
				"shortTitle": "Preliminary Report - Highway",
				"url": "https://www.ntsb.gov/investigations/AccidentReports/Pages/HWY21MH006-preliminary-report.aspx",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
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
		"url": "https://www.ntsb.gov/investigations/AccidentReports/Pages/pipeline.aspx",
		"items": "multiple"
	}
]
/** END TEST CASES **/
