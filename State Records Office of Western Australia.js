{
	"translatorID": "8de7d616-0961-438b-b45b-d34bc80aabed",
	"label": "State Records Office of Western Australia",
	"creator": "Mike O'Connor",
	"target": "^https://archive\\.sro\\.wa\\.gov\\.au/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2018-07-19 01:22:40"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2017-18 Mike O'Connor
	
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

function attr(docOrElem,selector,attr,index){var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);return elem?elem.getAttribute(attr):null}function text(docOrElem,selector,index){var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);return elem?elem.textContent:null}
/** select a Mime type for the attachment **/
function selectMimeType(url) {
	fileType = url.replace(/^.*(\..+?)$/, '$1');

	switch (fileType) {
		case ".jpg":
			mime = "image/jpeg";
			break;
		case ".pdf":
			mime = "application/pdf";
			break;
		default:
			mime = fileType;
	}

	return mime;
}

function detectWeb(doc, url) {

	// Adjust the inspection of url as required
	if (url.includes('index.php/search?query=') && getSearchResults(doc, true)) {
		return 'multiple';
	}
	// Adjust the inspection of url as required
	if (url.includes('index.php/search/advanced?') && getSearchResults(doc, true)) {
		return 'multiple';
	}

	if (url.includes('index.php/')) {
		return 'single';
	}
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;

	var rows = doc.querySelectorAll('.search-result-description a');
	for (var i = 0; i < rows.length; i++) {
		var href = rows[i].href;
		var title = ZU.trimInternal(rows[i].title);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function doWeb(doc, url) {

	var type = detectWeb(doc, url);

	switch (type) {
		case 'single':
			scrape(doc, url);
			break;
		case 'multiple':
			Zotero.selectItems(getSearchResults(doc, false), function(items) {
				if (!items) {
					return true;
				}
				var articles = [];
				for (var i in items) {
					articles.push(i);
				}
				ZU.processDocuments(articles, scrape);
			});
			break;
		default:
	}
}

function scrape(doc, url) {
	var type = detectWeb(doc, url);

	var item = new Zotero.Item('manuscript');

	var identityArea = doc.querySelector("section#identityArea");

	if (identityArea) {

		var identityFields = identityArea.querySelectorAll("div.field");

		if (identityFields) {
			for (let field of identityFields) {

				// Zotero.debug("nextFirstEC" + text(identityFields[i],"h3"));

				var nextIdentityField = text(field, "h3");

				switch (nextIdentityField) {
					case "Title":
						item.title = ZU.trimInternal(text(field, "div"));
						break;

					case "Reference code":
						item.archiveLocation = ZU.trimInternal(text(field, "div"));
						break;

					case "Level of description":
						item.manuscriptType = ZU.trimInternal(text(field, "div"));
						break;

					case "Date(s)":

						// Dates stored in an unordered list of 0–2 items.
						// 0 items = no dates ; store "" in item.date;
						// 1 item = either creation or accumulation dates. Use creation dates if available;
						// 2 items = both creation and accumulation dates. Use creation dates;

						var dateList = field.querySelectorAll("ul > li");

						// Find which list items contain which date type

						if (dateList.length > 0) {
							for (let date of dateList) {

								let dateStr = date.textContent;
								let dateRange = dateStr.split("(")[0].split(" - ");

								let dr1 = ZU.trimInternal(dateRange[1]);
								let dr0 = ZU.trimInternal(dateRange[0]);

								if (dateStr.indexOf("(Creation)") > 0) {

									//dateRange = ZU.trimInternal(dateStr.split("(")[0].split(" - "));

									if (dr1.length > 0) {
										// assign TO date as item.date
										item.date = dr1;
									} else if (dr0.length > 0) {
										// assign FROM date as item.date
										item.date = dr0;
									} else {
										item.date = "";
									}

									if (item.date.length > 0) {
										item.notes.push({
											title: "Date(s)",
											note: "Date(s): " + ZU.trimInternal(dateStr)
										});
									}
								}
								if (dateStr.indexOf("(Accumulation)") > 0) {
									// this is the Accumulation date list item
									// Only use this date as the item date if no creation date exists

									if (dr1.length > 0) {
										// assign TO date as item.date
										item.date = dr1;
									} else if (dr0.length > 0) {
										// assign FROM date as item.date
										item.date = dr0;
									} else {
										item.date = "";
									}
									if (item.date.length > 0) {
										item.notes.push({
											title: "Date(s)",
											note: "Date(s): " + ZU.trimInternal(dateStr)
										});
									}
								}
							}

						} else {
							item.date = "";
						}
						break;

					default:
						break;
				}

			}
		}
	}


	item.date = ZU.trimInternal(item.date);
	if (item.date == "-") {
		item.date = "";
	}

	if (item.title === "") {
		item.title = "[Title Not Found]";
	}

	item.url = url;

	var contentArea = doc.querySelector("section#contentAndStructureArea");

	if (contentArea) {
		var contentFields = contentArea.querySelectorAll("div.field");

		for (var j = 0; j < contentFields.length; j++) {

			nextContentField = text(contentFields[j], "h3");

			switch (nextContentField) {
				case "Scope and content":
					item.abstractNote = ZU.trimInternal(text(contentFields[j], "div"));
					break;

				default:
					if (item.abstractNote === "") {
						item.abstractNote = "";
					}
					break;
			}

		}
	}

	var contextArea = doc.querySelector("section#contextArea");

	// all SROWA creators are organisations not individuals ; therefore remove the first part of the
	// creator reference code eg. "AU WA A58 - ";

	if (contextArea) {
		var contextFields = contextArea.querySelectorAll("div.field");

		for (var k = 0; k < contextFields.length; k++) {

			nextContextField = text(contextFields[k], "h3");

			switch (nextContextField) {
				case "Name of creator":
					creatorName = text(contextFields[k], "div > a").split(" - ");
					item.creators.push({
						lastName: creatorName[1],
						creatorType: "author",
						fieldMode: true 
					})
					break;

				default:
					if (item.creatorName === '') {
						item.creatorName = '';
					}
			}

		}

	}

	// attachment(s)

	var digitalObject = doc.querySelector("div.digital-object-reference");

	if (digitalObject) {
		item.attachments.push({
			title: 'SROWA Snapshot',
			url: attr(digitalObject, 'a', 'href'),
			mimeType: selectMimeType(attr(digitalObject, 'a', 'href')),
			snapshot: true
		});
	}

	item.complete();
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://archive.sro.wa.gov.au/index.php/northampton-classification-4-tally-no-000782-northampton-04-1",
		"items": [
			{
				"itemType": "manuscript",
				"title": "Northampton, Classification 4 [Tally No. 000782].",
				"creators": [
					{
						"lastName": "DEPARTMENT OF LANDS AND SURVEYS",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "1906-01-17",
				"archiveLocation": "AU WA S980- cons4936 Northampton 04.1",
				"libraryCatalog": "State Records Office of Western Australia",
				"manuscriptType": "Item",
				"url": "https://archive.sro.wa.gov.au/index.php/northampton-classification-4-tally-no-000782-northampton-04-1",
				"attachments": [],
				"tags": [],
				"notes": [
					{
						"title": "Date(s)",
						"note": "Date(s): - 1906-01-17 (Accumulation)"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://archive.sro.wa.gov.au/index.php/cancelled-public-plans-districts-post-standard-series-s980",
		"items": [
			{
				"itemType": "manuscript",
				"title": "CANCELLED PUBLIC PLANS (DISTRICTS) - POST STANDARD SERIES",
				"creators": [
					{
						"lastName": "DEPARTMENT OF LANDS AND SURVEYS",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "1903-01-01",
				"abstractNote": "This series comprises several groups of cadastral plans (not all of them Public Plans) that were drawn during the same period as the Standard Series (Record Series No. 979). These plans generally conform to grids and scales within individual land districts. A small group of plans also cover Northampton, King Sound and the Warburton Ranges.Due to the lack of conformity within this series each sequence has been assigned a separate consignment number (N.B. there are two Avon plan sequences, one of which describes plans that were drawn but never used as Public Plans).Avon, 80 chain (consignment 4931); Avon, 80 chain, non-public plans (consignment 4976); Cockburn Sound, 80 chain (consignment 4932); Eastern, 10 mile scale (consignment 5375); Melbourne, 80 chain (consignment 4933); Melbourne, 80 chain, non-public plans (consignment 4933); Murray, 80 chain (consignment 4934); Nelson 20 & 80 chain (consignment 4935); Northampton Classification, 40 chain (consignment 4936); Swan, 80 chain (consignment 4937); Wellington, 80 chain (consignment 4938); Melbourne & Victoria, 80 chain lithos (consignment 5474).",
				"archiveLocation": "AU WA S980",
				"libraryCatalog": "State Records Office of Western Australia",
				"manuscriptType": "Series",
				"url": "https://archive.sro.wa.gov.au/index.php/cancelled-public-plans-districts-post-standard-series-s980",
				"attachments": [],
				"tags": [],
				"notes": [
					{
						"title": "Date(s)",
						"note": "Date(s): 1896 - 1915 (Accumulation)"
					},
					{
						"title": "Date(s)",
						"note": "Date(s): 1893-01-01 - 1903-01-01 (Creation)"
					}
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
