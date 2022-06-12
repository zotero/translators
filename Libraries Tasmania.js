{
	"translatorID": "44699e59-a196-4716-ae33-141ec605e394",
	"label": "Libraries Tasmania",
	"creator": "Tim Sherratt (tim@timsherratt.org)",
	"target": "^https?://librariestas\\.ent\\.sirsidynix\\.net\\.au/client/en_AU/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-06-12 07:08:34"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2022 Tim Sherratt

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

const formatMapping = {
	photograph: "artwork",
	"image (online)": "artwork",
	eMusic: "audioRecording",
	cd: "audioRecording",
	eAudiobook: "audioRecording",
	dvd: "videoRecording",
	"archived website": "webpage"
};

function detectWeb(doc, url) {
	let catType = url.match(/en_AU\/(library|tas|names)\/search/);
	if (url.includes("results") && getSearchResults(doc, true)) {
		return "multiple";
	}
	else if (catType == "tas" || url.includes("ARCHIVES_")) {
		return "manuscript";
	}
	else if (catType == "names" || url.includes("NAME_INDEXES")) {
		return "manuscript";
	}
	else {
		var formats = doc.querySelectorAll("div.displayElementText.text-p.LOCAL_FORMAT");
		for (let i = 0; i < formats.length; i++) {
			if (formats[i].textContent in formatMapping) {
				return formatMapping[formats[i].textContent];
			}
		}
		return "book";
	}
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (!items) {
				return true;
			}
			var articles = [];
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, scrape);
			return false;
		});
	}
	else {
		scrape(doc, url);
	}
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll(".displayDetailLink a");
	for (let i = 0; i < rows.length; i++) {
		let href = rows[i].href.replace(/\?qu=$/, "");
		let title = ZU.trimInternal(rows[i].textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function getFieldText(doc, label) {
	let fields = doc.querySelectorAll("div.displayElementText.text-p." + label);
	if (fields) {
		let fieldTexts = [];
		for (let i = 0; i < fields.length; ++i) {
			fieldTexts.push(ZU.trimInternal(fields[i].textContent));
		}
		return fieldTexts.join(" | ");
	}
	return "";
}

function getLinkLists(doc, label, idx) {
	var values = [];
	let links = doc.querySelectorAll("div." + label + " a[href*='" + idx + "']");
	if (links) {
		for (let i = 0; i < links.length; ++i) {
			values.push(links[i].textContent);
		}
	}
	return values;
}

function addPermalink(doc, item) {
	let permalink = doc.querySelector("a[onclick^='return permalink']");
	if (permalink) {
		item.url = permalink.getAttribute("onclick").match(/(https.+)'\);$/)[1];
	}
	return item;
}

function addDigitalFiles(doc, item) {
	// Links to digital versions have a range of labels in the catalogue
	// So we'll look for any links that look right
	let digitalLinks = doc.querySelectorAll("a[href^='https://stors.tas.gov.au'][target='_new'], a[href^='https://stors.tas.gov.au'][target='_blank']");
	var digitalUrls = [];
	var digitalLabels = {};
	for (let i = 0; i < digitalLinks.length; ++i) {
		var url = digitalLinks[i].href;
		// If there's an init value we can use this to get the url for a specific page
		let initPath = url.match(/\$init=(.+)/);
		if (initPath) {
			url = "https://stors.tas.gov.au/" + initPath[1];
		}
		digitalUrls.push(url);
		// Save the link's text to use in the attachment label
		digitalLabels[url] = digitalLinks[i].textContent;
	}
	Zotero.debug(digitalUrls);

	// Process image viewer links
	// This will only attach single images or PDFs
	// The multi-page viewers use iFrames and seem to draw images from a couple of different sources.
	// This makes it difficult to get at them reliably.
	// Because there are so many variations that could break things, processDocs calls item.done() on error.
	if (digitalUrls.length > 0) {
		ZU.processDocuments(digitalUrls, function (digitalDoc) {
			var mimeType = "image/jpeg";
			// Find the download link
			var downloadLink = digitalDoc.querySelector("a[title='Download'], a[id='downloadLink']");
			// Sometimes the download link opens a modal, if so get the link from the modal code
			if (downloadLink && !downloadLink.href.includes("/download/")) {
				downloadLink = digitalDoc.querySelector("div.downloadDialog a");
			}
			if (downloadLink) {
				// Z.debug(downloadLink.href);
				// If the page is using a PDF viewer, set mime type to pdf
				// Otherwise use default jpeg mimetype
				let viewer = digitalDoc.querySelector("#viewer");
				if (viewer && viewer.className.startsWith("pdf")) {
					mimeType = "application/pdf";
				}
				// Zotero.debug(digitalDoc.location.href);
				// Add file as attachment
				item.attachments.push({
					title: 'Libraries Tasmania digital item: ' + digitalLabels[digitalDoc.location.href],
					mimeType: mimeType,
					url: downloadLink.href
				});
			}
		},
		// On complete
		function () {
			item.complete();
		},
		// On error
		function (e) {
			Z.debug(e);
			item.complete();
		});
	}
	else {
		item.complete();
	}
}

function cleanText(text) {
	// Removes unnecessary stuff from catalogue strings
	var replace = ["[", "]", "<", ">"];
	text = ZU.trim(text);
	for (let i = 0; i < replace.length; ++i) {
		text = text.replace(replace[i], "");
	}
	text = text.replace(/\.$/, "");
	return text;
}

function scrape(doc, url) {
	// Catalogue search type
	var catType = url.match(/en_AU\/(library|tas|names|all)\/search/)[1];
	// The 'all' search type can include anything.
	// In this case URL checks should identify archives and names.
	// Including both checks to try and catch as much as possible.
	if (catType == "tas" || url.includes("ARCHIVES_")) {
		scrapeArchives(doc, url);
	}
	else if (catType == "names" || url.includes("NAME_INDEXES")) {
		scrapeNames(doc, url);
	}
	else {
		scrapeLibrary(doc, url);
	}
}

function scrapeLibrary(doc, url) {
	// Format of item
	var format = detectWeb(doc, url);
	// If there's a 'Library View' tab we can use MARC
	if (doc.querySelector("div#marc-tab0")) {
		// call MARC translator
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("a6ee60df-1ddc-4aae-bb25-45e0537be973");
		translator.getTranslatorObject(function (marc) {
			var record = new marc.record();
			var item = new Zotero.Item();
			var fieldTag, indicators, fieldContent;
			for (let row of doc.querySelectorAll("div#marc-tab0 table tr")) {
				let fields = row.querySelectorAll("td");
				fieldTag = ZU.trim(fields[0].textContent);
				indicators = ZU.trim(fields[1].textContent);
				// There don't seem to be any subfields in the records.
				// Or at least I haven't found any.
				// Adding in a subfield is necessary to get the translator to work.
				fieldContent = marc.subfieldDelimiter + "a" + ZU.trim(fields[2].textContent);
				record.addField(fieldTag, indicators, fieldContent);
			}
			record.translate(item);
			// Doesn't seem to get format correctly from MARC, so add manually
			item.itemType = format;
			// Add reference number
			item.callNumber = getFieldText(doc, "DOC_ID");
			// Add permalink
			item = addPermalink(doc, item);
			// Add digitised files as attachments
			addDigitalFiles(doc, item);
		});
	// No MARC so we have to scrape manually
	}
	else {
		var item = new Zotero.Item(format);
		item.title = getFieldText(doc, "T245_DISPLAY");
		item.callNumber = getFieldText(doc, "DOC_ID");

		// Creators
		let authors = getLinkLists(doc, "AUTHOR_TALIS_FULL", "AUTHOR_INDEX");
		for (let i = 0; i < authors.length; ++i) {
			item.creators.push(ZU.cleanAuthor(authors[i], "author", true));
		}
		let contribs = getLinkLists(doc, "AUTHOR_OTHER_TALIS_FULL", "AUTHOR_INDEX");
		for (let i = 0; i < contribs.length; ++i) {
			item.creators.push(ZU.cleanAuthor(contribs[i], "contributor", true));
		}

		// PUBLICATION DETAILS
		var pubInfo = getFieldText(doc, "PUBLICATION_INFO");
		// Music can have a distributor
		if (!pubInfo) {
			pubInfo = getFieldText(doc, "DISTRIBUTION_264");
		}
		// eBooks?
		if (!pubInfo) {
			pubInfo = getFieldText(doc, "PUBLICATION_264");
		}
		// See if it matches standard format
		var pubParts = pubInfo.match(/^(.+):(.+),(.+)$/);
		if (pubParts) {
			item.place = cleanText(pubParts[1]);
			item.publisher = cleanText(pubParts[2]);
			item.date = cleanText(pubParts[3]);
		}
		else {
			item.publisher = pubInfo;
		}

		let contents = getFieldText(doc, "CONTENTS_TALIS");
		let summary = getFieldText(doc, "SUMMARY_TALIS");
		let notes = getFieldText(doc, "NOTES_TALIS");
		let combined = [summary, contents, notes].join("\n\n");
		item.abstractNote = combined ? combined : "";
		
		// Physical description
		let physDesc = getFieldText(doc, "DESC_TALIS");
		let physParts = physDesc.split(";");
		if (physParts.length == 2 && format == "book") {
			item.numPages = cleanText(physParts[0]);
			item["physical desription"] = cleanText(physParts[1]);
		}
		else {
			item["physical desription"] = cleanText(physDesc);
		}

		item = addPermalink(doc, item);
		addDigitalFiles(doc, item);
	}
}

function scrapeArchives(doc) {
	var item = new Zotero.Item("manuscript");

	// Types should be Agency, Series, or Item
	let typeLabel = ZU.trim(doc.querySelector(".T245_DISPLAY_label").textContent).replace(/:$/, "");
	if (typeLabel == "Description") {
		item.manuscriptType = "Item";
	}
	else {
		item.manuscriptType = typeLabel;
	}

	item.title = getFieldText(doc, "T245_DISPLAY");
	item.callNumber = getFieldText(doc, "ARCHIVE_915");
	item.archiveLocation = getFieldText(doc, "ARCHIVES_ITEM_LOCN_BAY");

	var description = getFieldText(doc, "ARCHIVES_ITEM_FURTHER_DESC");
	// Agencies and series have a different note field
	if (!description) {
		description = getFieldText(doc, "TAS_IDX_500");
	}
	item.abstractNote = description;

	// If there are start and end dates (as for series) save as a range
	let startDate = getFieldText(doc, "ARCHIVES_SERIES_START_DATE");
	let endDate = getFieldText(doc, "ARCHIVES_SERIES_END_DATE");
	if (startDate && endDate) {
		item.date = ZU.strToISO(startDate) + "/" + ZU.strToISO(endDate);
	}
	else if (startDate) {
		item.date = ZU.strToISO(startDate);
	}

	// Save linked agencies as contributors
	let agencyLabel = doc.querySelector("div[class*='ARCHIVES_SERIES_CREATING_AGEN'");
	if (agencyLabel) {
		let agencies = agencyLabel.nextElementSibling.querySelectorAll("td.ASlink");
		for (let i = 0; i < agencies.length; ++i) {
			item.creators.push({ lastName: agencies[i].innerText, creatorType: "contributor" });
		}
	}

	// Save additional information to Extra
	// Series
	let series = doc.querySelector("a[href*='ARCHIVES_SERIES']");
	item.series = series ? series.textContent : "";

	// Functions
	let functions = getLinkLists(doc, "ARCHIVES_FUN_DIX");
	if (functions.length > 0) {
		item.functions = functions.join(", ");
	}
	
	// Descriptive fields -- add values to Extra
	var tasFields = [
		"ARCHIVES_ACCESS",
		"ARCHIVES_AGENCY_SOURCES",
		"ARCHIVES_AGENCIES_CREATING",
		"ARCHIVES_SERIES_ARRANGEMENT"
	];
	for (let i = 0; i < tasFields.length; ++i) {
		let label = doc.querySelector("div." + tasFields[i] + "_label");
		if (label) {
			item[ZU.trim(label.textContent).replace(/:$/, "")] = getFieldText(doc, tasFields[i]);
		}
	}
	
	item = addPermalink(doc, item);
	addDigitalFiles(doc, item);
}

function scrapeNames(doc) {
	var item = new Zotero.Item("manuscript");
	// There can be multiple entries for title -- eg in case of divorce there are two names.
	// getFieldText() will join multiple values with | delimiters
	item.title = getFieldText(doc, "NI_NAME_FULL_DISPLAY");
	item.callNumber = getFieldText(doc, "DOC_ID");
	item.manuscriptType = getFieldText(doc, "NI_INDEX");

	// Dates have many different labels, loop through this list until one is found
	// then save to item.date
	// Dates will also be saved to Extra (see below) with their specific labels.
	const dateLabels = [
		"NI_YEAR_DISPLAY",
		"NI_ADMISS_DATE",
		"NI_TRIAL_DATE",
		"NI_BIRTH_DATE",
		"NI_DEATH_DATE",
		"NI_MARRIAGE_DATE",
		"NI_ARRIVAL_DATE",
		"NI_DEPARTURE_DATE",
		"NI_INQUEST_DATE",
		"NI_LAND_DATE",
		"NI_DOC_HEALTH_DATE",
		"NI_EMPLOY_DATE",
	];
	for (let i = 0; i < dateLabels.length; ++i) {
		let displayDate = getFieldText(doc, dateLabels[i]);
		if (displayDate) {
			item.date = displayDate;
			break;
		}
	}

	// Name index records have many possible fields.
	// This list was made by scanning sample records, so labels could be missing.
	// Loop through this list, and if values exist save them to Extra.
	const fields = [
		"NI_OCCUP",
		"NI_YEAR_DISPLAY",
		"NI_SHIP_NATIVE_PLACE",
		"NI_REMARKS",
		"NI_GENDER",
		"NI_MOTHER",
		"NI_P_OCCUP",
		"NI_BIRTH_DATE",
		"NI_BAPTISM_DATE",
		"NI_REG_PLACE",
		"NI_REG_YEAR",
		"NI_AGE",
		"NI_DEATH_DATE",
		"NI_SPOUSE",
		"NI_SPOUSE_GENDER",
		"NI_SPOUSE_AGE",
		"NI_MARRIAGE_DATE",
		"NI_NAME_RANK",
		"NI_DEPARTURE_DATE",
		"NI_DEPARTURE_PORT",
		"NI_SHIP",
		"NI_BOUND",
		"NI_WILL_NO",
		"NI_PAGE",
		"NI_NAME_TITLE",
		"NI_ARRIVAL_DATE",
		"NI_VOYAGE_NO",
		"NI_CON_IDX",
		"NI_SHIP_OR_FREE1",
		"NI_NAME2",
		"NI_SHIP_OR_FREE2",
		"NI_MP_DATE",
		"NI_CORONER",
		"NI_DESC",
		"NI_INQUEST_DATE",
		"NI_VERDICT",
		"NI_LAND_DATE",
		"NI_LOCATION",
		"NI_DOC_HEALTH_DATE",
		"NI_UNDER14",
		"NI_CENSUS_DISTRICT",
		"NI_NAME_STATUS",
		"NI_TRIAL_DATE",
		"NI_OFFENSE",
		"NI_VERDICT",
		"NI_PP_ID",
		"NI_EMPLOYER",
		"NI_PROPERTY",
		"NI_EMPLOY_DATE",
		"NI_NOMINATOR",
		"NI_DOC_DATE",
		"NI_FATHER",
		"NI_P_OCCUP",
		"NI_PRE_SCHOOL",
		"NI_ADMISS_DATE"
	];
	// Add field values to Extras
	for (let i = 0; i < fields.length; ++i) {
		let label = doc.querySelector("div." + fields[i] + "_label");
		if (label) {
			item[ZU.trim(label.textContent).replace(/:$/, "")] = getFieldText(doc, fields[i]);
		}
	}
	item = addPermalink(doc, item);
	addDigitalFiles(doc, item);
}

// Zotero.debug(item);
	
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://librariestas.ent.sirsidynix.net.au/client/en_AU/library/search/detailnonmodal/ent:$002f$002fLT_NAXOS_DIX$002f0$002fLT_NAXOS_DIX:TC871901/one",
		"items": [
			{
				"itemType": "audioRecording",
				"title": "SCALERO, R.: Violin and Piano Works (M. Tortorelli, Meluso)",
				"creators": [],
				"abstractNote": "I. Allegro (08 min. 26 sec.) / Scalero -- II. Adagio (06 min. 21 sec.) / Scalero -- III. Vivace, ma appassionato (08 min. 13 sec.) / Scalero -- No. 1. Lento, poi tempo di walzer (04 min. 31 sec.) / Scalero -- No. 2. Andante malinconico (03 min. 48 sec.) / Scalero -- No. 3. Allegro con brio (05 min. 39 sec.) / Scalero -- No. 1. Allegro (04 min. 50 sec.) / Scalero -- No. 2. Allegro, alla Scarlatti (03 min. 31 sec.) / Scalero -- No. 3. Allegro giusto (05 min. 30 sec.) / Scalero -- 12 Variazioni nach den Barucaba von Paganini, Op. 15 (16 min. 44 sec.) / Scalero",
				"callNumber": "LT_NAXOS_DIX:TC871901",
				"label": "Hong Kong : Naxos Digital Services US Inc. 3014",
				"libraryCatalog": "Libraries Tasmania",
				"shortTitle": "SCALERO, R.",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://librariestas.ent.sirsidynix.net.au/client/en_AU/library/search/detailnonmodal/ent:$002f$002fSD_ILS$002f0$002fSD_ILS:491298/one",
		"items": [
			{
				"itemType": "book",
				"title": "Lives of the most eminent English poets, with critical observations on their works: to which are added the \"Preface to Shakespeare\" and the review of \"The origin of evil\" / With a sketch of the author's life by Walter Scott",
				"creators": [
					{
						"firstName": "Samuel",
						"lastName": "Johnson",
						"creatorType": "author"
					}
				],
				"extra": "OCLC: 614762888",
				"libraryCatalog": "Libraries Tasmania",
				"numPages": "588",
				"place": "London : Warne, [187- ]",
				"shortTitle": "Lives of the most eminent English poets, with critical observations on their works",
				"url": "https://stors.tas.gov.au/ILS/SD_ILS-491298",
				"attachments": [],
				"tags": [
					{
						"tag": "English poetry--18th century--History and criticism"
					},
					{
						"tag": "English poetry--Early modern, 1500-1700--History and criticism"
					},
					{
						"tag": "Poets, English"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://librariestas.ent.sirsidynix.net.au/client/en_AU/library/search/detailnonmodal/ent:$002f$002fSD_ILS$002f0$002fSD_ILS:640276/one",
		"items": [
			{
				"itemType": "artwork",
				"title": "The whaling bark - Chas. W. Morgan lying on bottom Fairhaven Wharf [picture]",
				"creators": [],
				"libraryCatalog": "Libraries Tasmania",
				"url": "https://stors.tas.gov.au/ILS/SD_ILS-640276",
				"attachments": [
					{
						"title": "Libraries Tasmania digital item: https://stors.tas.gov.au/AUTAS001126070242w800",
						"mimeType": "image/jpeg"
					}
				],
				"tags": [
					{
						"tag": "Barks (Sailing ships)--Tasmania--Hobart--Photographs"
					},
					{
						"tag": "Charles W. Morgan (Ship)--Photographs"
					},
					{
						"tag": "Fairhaven Wharf (Mass.)--History--Photographs"
					},
					{
						"tag": "Sailing ships--Tasmania--History--Photographs"
					},
					{
						"tag": "Ships, Wooden--Tasmania--History--Photographs"
					},
					{
						"tag": "Whaling ships--United States--History--Photographs"
					},
					{
						"tag": "Whaling--United States--History--Photographs"
					},
					{
						"tag": "Windjammers (Sailing ships)--History--Photographs"
					}
				],
				"notes": [
					{
						"note": "Exact measurements: 209 x 400 mm Photographic print is mounted on acid free board in the course of conservation work Inscribed in pencil by D. Jones on verso of board: [Verso of] Photograph inscribed in green ink - \"The Whaling Bark lying on bottom Fairhaven Wharf\" Accompanied by: 1 envelope bearing on its recto a map of Tasmania mounted on the Australian flag in blue, red and white. Believed to be the original storage receptacle for the photographic print Condition at Feb. 2002: Overall condition is good. Repaired by D. Jones July 1983 and mounted on acid free boad"
					}
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
