{
	"translatorID": "2b62db1e-1d49-4e2b-a409-a3f9f1870a41",
	"label": "State Records Office of Western Australia",
	"creator": "Mike O'Connor",
	"target": "^https://archive\\.sro\\.wa\\.gov\\.au/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2018-10-05 03:30:23"
}
/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2017-18 Mike O'Connor
	
	This translator designed to be used with
	the State Record Office of Western Australia
	AtoM (accesstomemory.org) archive catalogue.
	
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

function findDate(dateStr) {
	
	// Four date strings are possible in AtoM
	// TYPE = 'Creation' or 'Accumulation'
	// and should be ISO-8601 compliant:
	// (1) single date: 
	//		yyyy-mm-dd (TYPE)
	// (2) single FROM date: 
	//		yyyy-mm-dd - (TYPE)
	// (3) single TO date:
	//		- yyyy-mm-dd (TYPE)
	// (4) range i.e. FROM and TO dates:
	//		yyyy-mm-dd - YYYY-MM-DD (TYPE)
	// N.B. Some dates in AtoM are yyyy only.
	
	
	if (dateStr.indexOf(" - ") > 0) {
		dateRange = dateStr.split("(")[0].split(" - ");
		
		if (dateRange[1].trim().length > 0) {
			return ZU.trimInternal(dateRange[1].trim());
		} else {
			return ZU.trimInternal(dateRange[0].trim());
		}

	} else {
		dateRange = dateStr.split("(")[0];
		return ZU.trimInternal(dateRange);
	}

}

function toTitleCase(titleStr) {
	// In AtoM Agency names and Series titles are stored all-capitals.
	// This fn. shifts them to(wards) title case
	var newTitleStr = titleStr.toLowerCase().split(/ /);
	for (var i = 0; i < newTitleStr.length; i++) {
		if (newTitleStr[i].indexOf("-") > 0) {
			var hyphenStr = newTitleStr[i].toLowerCase().split(/-/);
			for (var j = 0; j < hyphenStr.length; j++) {
				hyphenStr[j] = hyphenStr[j].charAt(0).toUpperCase() + hyphenStr[j].slice(1);
			}
			newTitleStr[i] = hyphenStr.join('-');
		} else {
			newTitleStr[i] = newTitleStr[i].charAt(0).toUpperCase() + newTitleStr[i].slice(1); 	
		}
		switch (newTitleStr[i]) {
			case 'Of': 
				newTitleStr[i] = 'of';
				break;
			case 'And':
				newTitleStr[i] = 'and';
				break;
			default:
			break;	
		}
	}
	return newTitleStr.join(' ');
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

						if (dateList.length > 0) {

							var prefDate = "";
							
							for (let date of dateList) {

								let dateStr = date.textContent;
								
								if (dateStr.indexOf("(Creation)") > 0) {
									var dateCreationStr = findDate(dateStr);
									prefDate = "cr";
									if (dateCreationStr.length > 0) {
										item.notes.push({
											title: "Creation Date(s)",
											note: "Date(s): " + ZU.trimInternal(dateStr)
										});
									}
								} else if (dateStr.indexOf("(Accumulation)") > 0) {
									var dateAccumStr = findDate(dateStr);
									if (prefDate === "") {									
										prefDate = "ac";
									}
									if (dateAccumStr.length > 0) {
										item.notes.push({
											title: "Accumulation Date(s)",
											note: "Date(s): " + ZU.trimInternal(dateStr)
										});
								} else {
									item.date = "";
									}
								}
							}
							// Zotero entry date is Creation date, if available.
							if (prefDate === "cr") {
								item.date = dateCreationStr;
							} else {
								item.date = dateAccumStr;
							}
						} else {
							// 0 items in date list
							item.date = "";
						}
						break;

					default:
						break;
				}

			}
		}
	}

	if (item.manuscriptType === "Series") {
		item.title = toTitleCase(item.title);	
	}
	
	item.date = ZU.trimInternal(item.date);
	if (item.date === "-") {
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
						lastName: toTitleCase(creatorName[1]),
						creatorType: "author",
						fieldMode: true 
					});
					break;

				default:
					if (item.creatorName === '') {
						item.creatorName = '';
					}
					break;
			}

		}

	}

	// attachment(s)

	var digitalObject = doc.querySelector("div.digital-object-reference");

	if (digitalObject) {
		item.attachments.push({
			url: attr(digitalObject, 'a', 'href'),
			title: "Digital copy from SROWA.",
			type: selectMimeType(attr(digitalObject, 'a', 'href')),
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
						"fieldMode": true
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
						"title": "Accumulation Date(s)",
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
						"fieldMode": true
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
						"title": "Accumulation Date(s)",
						"note": "Date(s): 1896 - 1915 (Accumulation)"
					},
					{
						"title": "Creation Date(s)",
						"note": "Date(s): 1893-01-01 - 1903-01-01 (Creation)"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://archive.sro.wa.gov.au/index.php/warramboo-locations-survey-of-road-from-magnet-towards-lawlers-by-a-e-arney-fieldbook-5-pp-28-40-scale-20-chains-to-an-inch-warramboo-6",
		"items": [
			{
				"itemType": "manuscript",
				"title": "Warramboo Locations, survey of Road from Magnet towards Lawlers by A.E. Arney, Fieldbook 5 pp. 28-40 [scale: 20 chains to an inch].",
				"creators": [
					{
						"lastName": "DEPARTMENT OF LANDS AND SURVEYS",
						"creatorType": "author",
						"fieldMode": true
					},
					{
						"lastName": "SURVEY OFFICE",
						"creatorType": "author",
						"fieldMode": true
					},
					{
						"lastName": "SURVEYOR-GENERAL'S DEPARTMENT",
						"creatorType": "author",
						"fieldMode": true
					},
					{
						"lastName": "CROWN LANDS AND SURVEYS DEPARTMENT",
						"creatorType": "author",
						"fieldMode": true
					},
					{
						"lastName": "DEPARTMENT OF LAND ADMINISTRATION",
						"creatorType": "author",
						"fieldMode": true
					}
				],
				"date": "1897-01-01",
				"archiveLocation": "AU WA S236- cons3869 Warramboo 6",
				"libraryCatalog": "State Records Office of Western Australia",
				"manuscriptType": "Item",
				"shortTitle": "Warramboo Locations, survey of Road from Magnet towards Lawlers by A.E. Arney, Fieldbook 5 pp. 28-40 [scale",
				"url": "https://archive.sro.wa.gov.au/index.php/warramboo-locations-survey-of-road-from-magnet-towards-lawlers-by-a-e-arney-fieldbook-5-pp-28-40-scale-20-chains-to-an-inch-warramboo-6",
				"attachments": [
					{
						"title": "Digital copy from SROWA.",
						"type": "image/jpeg",
						"snapshot": true
					}
				],
				"tags": [],
				"notes": [
					{
						"title": "Accumulation Date(s)",
						"note": "Date(s): 1897-01-01 - (Accumulation)"
					}
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
