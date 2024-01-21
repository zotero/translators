{
	"translatorID": "99592877-f698-4e14-b541-b6181f6c577f",
	"label": "Public Record Office Victoria",
	"creator": "Tim Sherratt (tim@timsherratt.au)",
	"target": "^https?://prov\\.vic\\.gov\\.au/(archive|search_journey)/*",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-01-21 03:13:11"
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
	if (getSearchResults(doc, true)) {
		return "multiple";
	// match items but not series, agencies, or functions (VPRS, VA or VF)
	}
	else if (url.match(/archive\/(?!VPRS|VA|VF)[A-Z0-9-]+/)) {
		return "manuscript";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	let items = {};
	let found = false;
	let rows = doc.querySelectorAll(".sub_heading_search_result");
	for (let row of rows) {
		let href = row.href;
		href = href.match(/archive\/(?!VPRS|VA|VF)[A-Z0-9-]+/) ? href : null;
		let title = row.innerText.replace(/\n/g, " ");
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
	// Get the API record for this item
	let id = url.match(/archive\/([A-Z0-9-]+)/)[1];
	let apiURL = "https://api.prov.vic.gov.au/search/query?wt=json&q=(_id%3A" + id + ")";
	let apiJSON = await requestJSON(apiURL);
	let record = apiJSON.response.docs[0];
	
	// Create the Zotero item
	let item = new Zotero.Item("manuscript");
	item.title = record.title;
	item.type = record.category;
	item.archive = "Public Record Office Victoria";
	item.archiveLocation = record.citation;
	item.libraryCatalog = "PROV API";
	item.url = url;
	item.rights = record.rights_status.join(", ");
	item.place = record.location.join(", ");
	item.abstractNote = record["description.aggregate"];

	// Normalise dates and drop default values
	let startDate = record.start_dt.replace("T00:00:00Z", "");
	// Discard default
	startDate = startDate != "1753-01-01" ? startDate : "";
	let endDate = record.end_dt.replace("T00:00:00Z", "");
	// Discard default
	endDate = endDate != "3000-12-31" ? endDate : "";

	// If there's a date range use 'issued', otherwise use 'date'
	if (startDate == endDate) {
		item.date = startDate;
	}
	else {
		item.issued = startDate + "/" + endDate;
	}
	
	// Add creating agencies
	let agencies = record["agencies.titles"] || [];
	for (let i = 0; i < agencies.length; i++) {
		item.creators.push({
			lastName: record["agencies.ids"][i] + ", " + agencies[i],
			creatorType: "contributor",
			fieldMode: 1
		});
	}

	// Include a series reference
	item.series = record["is_part_of_series.id"][0] + ", " + record["is_part_of_series.title"][0];

	// Digitised files have IIIF manifests, which can be used to get PDFs and images
	if ("iiif-manifest" in record) {
		// Link to IIIF manifest
		let manifestUrl = record["iiif-manifest"];
		
		// Link to generate PDF of complete file
		// The behaviour of PDF links changes depending on the size of the file,
		// if it's beyond a certain size you're redirected to a page and have to wait for it to be generated.
		// Sometimes the PDF generation doesn't work at all.
		// That's why I've set `snapshot` to false on the PDF.
		let pdfUrl = "https://cart.cp.prov.vic.gov.au/showdigitalcopy.php?manifest=" + manifestUrl;
		
		// Get full size image of first page
		let imageUrl = record["iiif-thumbnail"].replace("!200,200", "full");
		
		item.attachments = [{
			url: pdfUrl,
			title: "Download file as PDF",
			mimeType: "application/pdf",
			snapshot: false
		},
		{
			url: manifestUrl,
			title: "IIIF manifest",
			mimeType: "application/json",
			snapshot: false
		},
		{
			url: imageUrl,
			title: "Page 1 image",
			mimeType: "image/jpeg",
			snapshot: true
		}];
	}

	item.complete();
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://prov.vic.gov.au/search_journey/select?q=series_id:10742%20AND%20text:(*)&start_date=&end_date=&form_origin=MELBOURNE1956OLYMPICS_SEARCH&iud=true",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://prov.vic.gov.au/archive/0C7B792B-F7F4-11E9-AE98-39C0B3AF8E48?image=1",
		"items": [
			{
				"itemType": "manuscript",
				"title": "B1324",
				"creators": [
					{
						"lastName": "VA4153, Organising Committee for the XVIth Olympiad Melbourne [1956]",
						"creatorType": "contributor",
						"fieldMode": 1
					}
				],
				"abstractNote": "[Swimming]; Swimming; [No slip]",
				"archive": "Public Record Office Victoria",
				"archiveLocation": "VPRS 10742/P0000, B1324",
				"libraryCatalog": "PROV API",
				"manuscriptType": "Item",
				"place": "North Melbourne, Online",
				"rights": "Open",
				"url": "https://prov.vic.gov.au/archive/0C7B792B-F7F4-11E9-AE98-39C0B3AF8E48?image=1",
				"attachments": [
					{
						"title": "Download file as PDF",
						"mimeType": "application/pdf",
						"snapshot": false
					},
					{
						"title": "IIIF manifest",
						"mimeType": "application/json",
						"snapshot": false
					},
					{
						"title": "Page 1 image",
						"mimeType": "image/jpeg",
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
