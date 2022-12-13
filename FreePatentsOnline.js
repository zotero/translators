{
	"translatorID": "879d738c-bbdd-4fa0-afce-63295764d3b7",
	"label": "FreePatentsOnline",
	"creator": "Adam Crymble, Philipp Zumstein",
	"target": "^https?://www\\.freepatentsonline\\.com/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-12-13 17:39:29"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2018 Philipp Zumstein
	
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
	if (url.includes("result.html") && getSearchResults(doc, true)) {
		return "multiple";
	} else if (text(doc, 'div.disp_doc2 > div') || url.includes(".pdf")) {
		return "patent";
	}
}


function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('table.listing_table > tbody > tr > td > a');
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


function scrape(doc, url, pdfUrl = null) {
	if (url.includes('.pdf')) {
		ZU.processDocuments(url.replace('.pdf', '.html'),
			(catalogDoc, catalogUrl) => scrape(catalogDoc, catalogUrl, getPDFURL(doc)));
		return;
	}

	var newItem = new Zotero.Item("patent");
	
	var fieldtitles = ZU.xpath(doc, '//div[@class="disp_doc2"]/div[@class="disp_elm_title"]');
	for (let i=0; i<fieldtitles.length; i++) {
		let label = fieldtitles[i].textContent.replace(/:$\s*/, '').toLowerCase();
		let value = ZU.xpathText(fieldtitles[i], './following-sibling::div').trim();
		switch (label) {
			case "title":
				if (value == value.toUpperCase()) value = ZU.capitalizeTitle(value, true);
				newItem.title = value;
				break;
			case "abstract":
				newItem.abstractNote = value;
				break;
			case "application number":
			case "document type and number":
				newItem.applicationNumber = value;
				break;
			case "publication date":
				//e.g. 07/18/2006
				newItem.issueDate = parseDate(value);
				break;
			case "filing date":
				newItem.filingDate = parseDate(value);
				break;
			case "assignee":
				newItem.assignee = ZU.trimInternal(value);
				break;
			case "inventors":
				let inventorsList = value.split("\n");
				for (let j=0; j<inventorsList.length; j++) {
					let name = inventorsList[j].replace(/\(.*$/, '').trim();
					newItem.creators.push(ZU.cleanAuthor(name, "inventor", name.includes(',')));
				}
				break;
			case "attorney, agent or firm":
				if (value == value.toUpperCase()) value = ZU.capitalizeTitle(value, true);
				let attorneysList = value.split("\n");
				for (let j=0; j<attorneysList.length; j++) {
					let name = attorneysList[j].replace(/\(.*$/, '').trim();
					if (name.includes(',')) {
						newItem.creators.push(ZU.cleanAuthor(name, "attorneyAgent", true));
					} else {
						newItem.creators.push({
							lastName: name, 
							creatorType: "attorneyAgent",
							fieldMode: 1
						});
					}
				}
				break;
			case "primary examiner":
				if (value == value.toUpperCase()) value = ZU.capitalizeTitle(value, true);
				newItem.creators.push(ZU.cleanAuthor(value, "contributor", value.includes(',')));
				break;
		}
	}

	if (!newItem.patentNumber) {
		newItem.patentNumber = ZU.xpathText(doc, "//input[@type='hidden' and @name='number']/@value");
	}

	if (!newItem.country) {
		newItem.country = ZU.xpathText(doc, "//input[@type='hidden' and @name='country']/@value");
	}

	newItem.url = url;
	
	
	newItem.attachments.push({
		document: doc,
		title: "Snapshot"
	});
	
	if (pdfUrl) {
		newItem.attachments.push({
			url: pdfUrl,
			mimeType: "application/pdf",
			title: "Full Text PDF"
		});
		newItem.complete();
	}
	else {
		let pdfWrapperUrl = attr(doc, 'a[href*=".pdf"]', 'href');
		if (pdfWrapperUrl) {
			ZU.processDocuments(pdfWrapperUrl, (pdfWrapperDoc) => {
				newItem.attachments.push({
					url: getPDFURL(pdfWrapperDoc),
					mimeType: "application/pdf",
					title: "Full Text PDF"
				});
				newItem.complete();
			});
		}
		else {
			newItem.complete();
		}
	}
}


function getPDFURL(doc) {
	return doc.querySelector("center > iframe[src*='s3']").src.replace(/#.*/, '');
}


function parseDate(value) {
	//e.g. 07/18/2006
	let dateParts = value.split('/');
	if (dateParts.length==3) {
		return dateParts[2] + '-' + dateParts[0] + '-' + dateParts[1]
	} else {
		return ZU.strToISO(value);
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.freepatentsonline.com/result.html?query_txt=encryption&sort=relevance&srch=top&search=",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.freepatentsonline.com/7751561.html",
		"items": [
			{
				"itemType": "patent",
				"title": "Partial encryption",
				"creators": [
					{
						"firstName": "Brant L.",
						"lastName": "Candelore",
						"creatorType": "inventor"
					},
					{
						"firstName": "Robert Allan",
						"lastName": "Unger",
						"creatorType": "inventor"
					},
					{
						"firstName": "Leo M.",
						"lastName": "Pedlow Jr. ",
						"creatorType": "inventor"
					},
					{
						"firstName": "Hosuk",
						"lastName": "Song",
						"creatorType": "contributor"
					},
					{
						"lastName": "Miller Patent Services",
						"creatorType": "attorneyAgent",
						"fieldMode": 1
					}
				],
				"issueDate": "2010-07-06",
				"abstractNote": "A multiple partial encryption device consistent with certain embodiments has an input for receiving a unencrypted video signal. An encryption arrangement produces a partially multiple encrypted video signal from the unencrypted video signal. An output provides the partially multiple encrypted video signal. This abstract is not to be considered limiting, since other embodiments may deviate from the features described in this abstract.",
				"applicationNumber": "12/001561",
				"assignee": "Sony Corporation (Tokyo, JP) Sony Electronics Inc. (Park Ridge, NJ, US)",
				"country": "United States",
				"filingDate": "2007-12-12",
				"patentNumber": "7751561",
				"url": "https://www.freepatentsonline.com/7751561.html",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					},
					{
						"mimeType": "application/pdf",
						"title": "Full Text PDF"
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
