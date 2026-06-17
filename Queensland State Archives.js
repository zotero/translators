{
	"translatorID": "214505fc-fa92-4b35-b323-5f12a4b157cb",
	"label": "Queensland State Archives",
	"creator": "Tim Sherratt (tim@timsherratt.au)",
	"target": "^https?://www\\.archivessearch\\.qld\\.gov\\.au/(items|search)",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-08-28 06:00:51"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2024 Tim Sherratt

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

async function detectWeb(doc, url) {
	if (/\/search\?/.test(url)) {
		if (getSearchResults(doc, true)) {
			return "multiple";
		}
		else {
			Zotero.monitorDOMChanges(doc.body);
			return false;
		}
	}
	else if (/items\/ITM[0-9]+/.test(url)) {
		return "manuscript";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	let items = {};
	let found = false;
	let rows = doc.querySelectorAll("div.result-left-pane a");
	for (let row of rows) {
		let href = row.href;
		href = /\/items\//.test(href) ? href : null;
		let title = row.innerText;
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

async function doWeb(doc, url) {
	if (await detectWeb(doc, url) == 'multiple') {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (items) {
			for (let url of Object.keys(items)) {
				await scrape(url);
			}
		}
	}
	else {
		await scrape(url);
	}
}

async function scrape(url) {
	let id = url.match(/items\/(ITM[0-9-]+)/)[1];
	let apiURL = "https://www.archivessearch.qld.gov.au/api/fetch?qsa_id=" + id + "&type=archival_object";
	let data = await requestJSON(apiURL);
	let item = new Zotero.Item("manuscript");
	item.title = data.title;
	if ("record_type" in data.subject_terms) {
		let recordTypes = data.subject_terms.record_type.map(
			term => term.term
		);
		item.type = recordTypes.join("; ");
	}
	item.archive = "Queensland State Archives";
	item.archiveLocation = data.qsa_id_prefixed;
	item.url = url;
	item.rights = data.copyright_status;
	let startDate = data.dates[0].begin.split("-")[0];
	let endDate = data.dates[0].end.split("-")[0];
	// If there's a date range use 'issued', otherwise use 'date'
	if (startDate == endDate) {
		item.date = startDate;
	}
	else {
		item.extra = (item.extra ? item.extra + "\n" : "") + "Issued: " + startDate + "/" + endDate;
	}
	// Include a series reference (archive collection)
	item.extra = (item.extra ? item.extra + "\n" : "") + "Archive Collection: " + data.resource.qsa_id_prefixed + ", " + data.resource.display_string;
	// Add creating agencies
	let agencies = data.creating_agency || [];
	for (let i = 0; i < agencies.length; i++) {
		item.creators.push({
			lastName: agencies[i]._resolved.qsa_id_prefixed + ", " + agencies[i]._resolved.display_string,
			creatorType: "contributor",
			fieldMode: 1
		});
	}
	// Add digital representation
	for (let image of data.digital_representations) {
		let imageID = image.qsa_id_prefixed;
		let mimeType, imageTitle;
		if (image.file_type == "JPEG") {
			mimeType = "image/jpeg";
			imageTitle = "Image " + imageID;
		}
		else if (image.file_type == "PDF") {
			mimeType = "application/pdf";
			imageTitle = "PDF " + imageID;
		}
		item.attachments.push({
			title: imageTitle,
			url: "https://www.archivessearch.qld.gov.au/api/download_file/" + imageID,
			mimeType: mimeType,
			snapshot: true
		});
	}
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.archivessearch.qld.gov.au/items/ITM3872594",
		"items": [
			{
				"itemType": "manuscript",
				"title": "Regina v Thomas Thompson (or Thomas Norman or James Thompson) . Extract from from Briefs, depositions and associated papers in criminal cases heard, No. 15 [WARNING: CONTENT MAY CAUSE DISTRESS]",
				"creators": [
					{
						"lastName": "A2120, Circuit Court, Rockhampton",
						"creatorType": "contributor",
						"fieldMode": 1
					}
				],
				"date": "1865",
				"archive": "Queensland State Archives",
				"archiveLocation": "ITM3872594",
				"extra": "Archive Collection: S10976, Briefs, Depositions and Associated Papers in Criminal Cases Heard - Supreme Court, Central District, Rockhampton",
				"libraryCatalog": "Queensland State Archives",
				"rights": "Copyright State of Queensland",
				"shortTitle": "Regina v Thomas Thompson (or Thomas Norman or James Thompson) . Extract from from Briefs, depositions and associated papers in criminal cases heard, No. 15 [WARNING",
				"url": "https://www.archivessearch.qld.gov.au/items/ITM3872594",
				"attachments": [
					{
						"title": "PDF DR173618",
						"mimeType": "application/pdf",
						"snapshot": true
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
		"url": "https://www.archivessearch.qld.gov.au/items/ITM3871900",
		"items": [
			{
				"itemType": "manuscript",
				"title": "GABBERT, MARY CARMELIA",
				"creators": [
					{
						"lastName": "A191, Supreme Court, Southern District, Brisbane",
						"creatorType": "contributor",
						"fieldMode": 1
					}
				],
				"date": "2018",
				"archive": "Queensland State Archives",
				"archiveLocation": "ITM3871900",
				"extra": "Archive Collection: S6339, Originating Applications - Probate and Letters of Administration (Supreme Court, Brisbane)",
				"libraryCatalog": "Queensland State Archives",
				"manuscriptType": "Ecclesiastical (will) file",
				"rights": "Copyright State of Queensland",
				"url": "https://www.archivessearch.qld.gov.au/items/ITM3871900",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.archivessearch.qld.gov.au/items/ITM1523915",
		"items": [
			{
				"itemType": "manuscript",
				"title": "Town map - Cheepie",
				"creators": [
					{
						"lastName": "A18, Lands Department",
						"creatorType": "contributor",
						"fieldMode": 1
					}
				],
				"date": "1954",
				"archive": "Queensland State Archives",
				"archiveLocation": "ITM1523915",
				"extra": "Archive Collection: S19466, South West Region Maps",
				"libraryCatalog": "Queensland State Archives",
				"manuscriptType": "Map",
				"url": "https://www.archivessearch.qld.gov.au/items/ITM1523915",
				"attachments": [
					{
						"title": "Image DR173204",
						"mimeType": "image/jpeg",
						"snapshot": true
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
		"url": "https://www.archivessearch.qld.gov.au/search?f[]=keywords&has_digital=false&op[]=AND&open=false&q[]=wragge&sort=relevance&type[]=archival_object",
		"defer": true,
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.archivessearch.qld.gov.au/items/ITM276520",
		"items": [
			{
				"itemType": "manuscript",
				"title": "Criminal files - Supreme Court, Northern District, Townsville",
				"creators": [
					{
						"lastName": "A267, Supreme Court, Northern District, Townsville",
						"creatorType": "contributor",
						"fieldMode": 1
					}
				],
				"archive": "Queensland State Archives",
				"archiveLocation": "ITM276520",
				"extra": "Issued: 1875/1876\nArchive Collection: S7833, Criminal Files - Supreme Court, Northern District, Townsville",
				"libraryCatalog": "Queensland State Archives",
				"manuscriptType": "Depositions and indictments",
				"rights": "Copyright State of Queensland",
				"url": "https://www.archivessearch.qld.gov.au/items/ITM276520",
				"attachments": [
					{
						"title": "PDF DR87978",
						"mimeType": "application/pdf",
						"snapshot": true
					},
					{
						"title": "PDF DR87979",
						"mimeType": "application/pdf",
						"snapshot": true
					},
					{
						"title": "PDF DR87980",
						"mimeType": "application/pdf",
						"snapshot": true
					},
					{
						"title": "PDF DR87981",
						"mimeType": "application/pdf",
						"snapshot": true
					},
					{
						"title": "PDF DR87982",
						"mimeType": "application/pdf",
						"snapshot": true
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
