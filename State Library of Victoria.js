{
	"translatorID": "21e61032-efeb-442c-a03b-2c9860abf71f",
	"label": "State Library of Victoria",
	"creator": "Tim Sherratt (tim@timsherratt.au)",
	"target": "^https?://(find|viewer)\\.slv\\.vic\\.gov\\.au/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 90,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-04-17 02:46:07"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2026 YOUR_NAME <- TODO

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
	if (/viewer\.slv/.test(url)) {
		return "artwork";
	}
	else if (/docid=alma\d+/.test(url)) {
		return "book";
	}
	else {
		var rows = doc.querySelectorAll('.urlToXmlPnx[data-url]');
		if (rows.length > 1) return "multiple";
	}
	let exploreElem = doc.querySelector("primo-explore");
	if (exploreElem) {
		Z.monitorDOMChanges(exploreElem, { childList: true, subtree: true });
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.urlToXmlPnx[data-url]');
	for (let row of rows) {
		let href = makeJsonUrl(row.dataset.url);
		let title = text(row.parentNode, '.item-title') || row.parentNode.textContent;
		if (!href || !title) continue;
		title = title.replace(/^;/, '');
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function makeJsonUrl(url) {
	let almaId = url.match(/alma\d+/)[0];
	return `https://find.slv.vic.gov.au/primaws/rest/pub/pnxs/L/${almaId}?vid=61SLV_INST:SLV`;
}

async function doWeb(doc, url) {
	if (detectWeb(doc, url) == 'multiple') {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (!items) return;
		for (let url of Object.keys(items)) {
			await scrape(doc, url);
		}
	}
	else if (/viewer\.slv/.test(url)) {
		await scrapeDigital(doc, url);
	}
	else {
		await scrape(doc, url);
	}
}

// Format mappings to help in determining item types
const FORMATS = {
	article: "journalArticle",
	audio: "audioRecording",
	Books: "book",
	Diaries: "manuscript",
	dissertation: "thesis",
	ead: "manuscript",
	Ephemera: "manuscript",
	images: "artwork",
	manuscript: "manuscript",
	map: "map",
	Maps: "map",
	Papers: "manuscript",
	Photographs: "artwork",
	Periodicals: "book",
	realia: "artwork",
	video: "videoRecording"
};

// Look for values in the specified format field that have mappings in the list above
// If there's no matches, return the default format
function getFormat(metadata, formatField, defaultFormat) {
	let format;
	if (Object.keys(FORMATS).includes(metadata[formatField][0])) {
		format = FORMATS[metadata[formatField][0]];
	}
	else {
		format = defaultFormat;
	}
	return format;
}

// MAIN CATALOGUE
// The SLV's Primo instance exposes a JSON API that we can use to get structured data.
// The Primo-2018 translator gets XML from the same API, but I wanted to extend it a bit and the JSON's
// easier to work with.

// Get a value from a specific field in the JSON metadata.
// The fields are all arrays, but most fields only have one value.
// This returns the first value from the array.
function getMetadataValue(metadata, field, keepPosition) {
	if (Object.keys(metadata).includes(field)) {
		// Get the value and clean it up a bit
		let value = metadata[field][0].trim().replace(/\.$/, "").replace("• ", "");
		// If there's a delimiter, split the value and return the part if the specified position
		if (keepPosition) {
			return splitValues(value, keepPosition - 1);
		}
		// Otherwise, return as is
		else {
			return value;
		}
	}
	return null;
}

// Some of the values have $$[A-Z] delimiters.
// This split the values on the delimiters and returns the requested part.
// I could develop this further to look for delimiters with specific letter values,
// but it doesn't seem necessary to get the required info.
function splitValues(value, keepPosition) {
	let valueParts = value.split(/\$\$[A-Z]{1}/);
	valueParts = valueParts.filter(v => v);
	return valueParts[keepPosition].trim() || value;
}

// Get an array of values from the specified field in the JSON metadata
function getMetadataValues(metadata, fieldName, keepPosition) {
	let values = [];
	let field = metadata[fieldName] || [];
	for (let value of field) {
		// If there's a delimiter, split the value and return the part if the specified position
		if (keepPosition) {
			values.push(splitValues(value.trim().replace(/\.$/, ""), keepPosition - 1));
		}
		// Otherwise, just clean up values
		else {
			values.push(value.trim().replace(/\.$/, "").replace("• ", ""));
		}
	}
	return values;
}

function getAuthors(metadata, authorField) {
	let authors = [];
	if (authorField in metadata) {
		for (let author of metadata[authorField]) {
			// Some author fields include multiple values separated by $$[A-Z] delimiters
			const authorForms = author.split(/\$\$[A-Z]{1}/);
			// If so, the second value seems to be the bare author name (without role etc)
			// so we'll use that
			if (authorForms.length > 1) {
				authors.push(ZU.cleanAuthor(authorForms[1], authorField, true));
			}
			else {
				authors.push(ZU.cleanAuthor(author, authorField, true));
			}
		}
	}
	return authors;
}

// Join values from multiple metadata fields into a single string.
function joinFields(metadata, fields, delimiter, keepPosition) {
	let values = [];
	for (let field of fields) {
		values = values.concat(getMetadataValues(metadata, field, keepPosition));
	}
	return values.join(delimiter);
}

async function scrape(doc, url) {
	// Check if the url is a JSON API request, convert if not
	let jsonUrl;
	if (!/rest\/pub\/pnxs/.test(url)) {
		jsonUrl = makeJsonUrl(url);
	}
	else {
		jsonUrl = url;
	}
	// Get the item metadata from the JSON API
	const jsonData = await requestJSON(jsonUrl);
	const metadata = jsonData.pnx.display;
	// Create the new item
	const itemFormat = getFormat(metadata, "type", "book");
	const item = new Zotero.Item(itemFormat);
	item.title = metadata.title[0].split(" / ")[0];
	// Add authors
	const creators = getAuthors(metadata, "creator");
	const contributors = getAuthors(metadata, "contributor");
	for (let creator of creators.concat(contributors)) {
		item.creators.push(creator);
	}
	// Add publisher and place
	const publisher = getMetadataValue(metadata, "publisher") || "";
	// Try to split publisher value on : to separate place and publisher
	const publisherParts = publisher.split(/\s+:\s+/);
	if (publisherParts.length == 2) {
		item.place = publisherParts[0];
		item.publisher = publisherParts[1];
	// Otherwise use as is
	}
	else {
		item.publisher = publisher;
	}
	// Get format and num of pages
	let format = getMetadataValues(metadata, "format").join("; ");
	item.format = format;
	// If the format value includes the number of pages (eg 28p), add this to numPages
	if (/\d+p\b/.test(format)) {
		item.numPages = format.match(/(\d+)p\b/)[1];
	}
	// Some information can be in multiple fields
	// Here we'll group together like fields and add the concatenated values to the item
	item.abstractNote = joinFields(metadata, ["contents", "description", "lds04", "lds39", "lds40"], ". ");
	item.series = joinFields(metadata, ["series", "lds39"], "; ", 1);
	item.rights = joinFields(metadata, ["lds29", "lds30"], ". ");
	// Add other fields
	item.date = getMetadataValue(metadata, "creationdate");
	item.edition = getMetadataValue(metadata, "edition");
	item.archiveLocation = getMetadataValue(metadata, "lds36");
	item.scale = getMetadataValue(metadata, "lds16");
	item.ISBN = getMetadataValue(jsonData.pnx.addata, "isbn");
	item.language = getMetadataValue(metadata, "language");
	// Use identifier for call number if it exists
	// Otherwise look for the callNumber field
	const identifier = getMetadataValue(metadata, "identifier", 2);
	if (!identifier && jsonData.delivery.bestlocation) {
		item.callNumber = jsonData.delivery.bestlocation.callNumber || null;
	}
	else {
		item.callNumber = identifier;
	}
	// Add tags
	item.tags = getMetadataValues(metadata, "subject");
	// Construct persistent(ish) url
	let almaId = jsonUrl.match(/alma\d+/)[0];
	item.url = `https://find.slv.vic.gov.au/discovery/fulldisplay?vid=61SLV_INST:SLV&docid=${almaId}`;
	item.attachments.push({
		title: "Snapshot",
		document: doc
	});
	item.complete();
}

// DIGITISED ITEM VIEWER
// The digital item viewer has an internal JSON API that includes item metadata
// and info about digitised versions. We'll use that to get the data we need.

// Examples for testing:
// - single digitised image: https://viewer.slv.vic.gov.au/?entity=IE1542628&mode=browse
// - digitised volume of maps with no PDF but multiple images (should get first image): https://viewer.slv.vic.gov.au/?entity=IE8819462&mode=browse
// - selected page from digitised diary with no PDF: https://viewer.slv.vic.gov.au/?entity=IE13142663&file=FL19626988&mode=browse
// - digitised pamphlet with PDF: https://viewer.slv.vic.gov.au/?entity=IE6991521&mode=browse

// Look for a link to a PDF amongst the digital file versions
function getPdfUrl(digitalData) {
	for (let fileData of Object.values(digitalData.file)) {
		if (fileData.mimetype == "application/pdf" && fileData.label.toLowerCase() == "full pdf access copy") {
			return fileData.url;
		}
	}
	return null;
}

// Get a field value from the image with the given file identifier (FL id)
function getImageField(digitalData, fileId, field) {
	for (let [fid, fileData] of Object.entries(digitalData.file)) {
		if (fid == fileId) {
			return fileData[field];
		}
	}
	return null;
}

// The derivative version is the one that's displayed in the interface and available for download.
// Sometimes there's high and low resolution versions of the derivative.
// This extracts the id of the best derivative that can be used for an attachment.
function getDerivativeId(fileData) {
	let copy = fileData.related_files.DERIVATIVE_COPY;
	if (Object.keys(copy).includes("HIGH")) {
		return copy.HIGH.$ref.match(/\["(FL\d+)"\]/)[1];
	}
	else {
		return copy.$ref.match(/\["(FL\d+)"\]/)[1];
	}
}

// For multi-page items without PDFs we want to get the first image.
// To do this we'll loop through the files, looking for one labelled 'index' or 'page 1'.
// This isn't perfect, but seems to get the first image most of the time.
function getFirstImageUrl(digitalData) {
	// There's only one image, so we'll get it.
	if (Object.values(digitalData.summary.file)[0].length == 1) {
		let fileId = getDerivativeId(Object.values(digitalData.file)[0]);
		let label = "";
		// If this is part of a group, get the file label to use as a subtitle
		if (digitalData.viewer_md.group_md) {
			label = getImageField(digitalData, fileId, "label");
		}
		return [fileId, getImageField(digitalData, fileId, "url"), label];
	// Multiple images
	// Eg: map volumes have multiple pages but no PDF
	}
	else {
		// First we'll look for the label 'index'
		for (let fileData of Object.values(digitalData.file)) {
			if (fileData.label.toLowerCase() == "index") {
				let fileId = getDerivativeId(fileData);
				return [fileId, getImageField(digitalData, fileId, "url"), ""];
			}
		}
		// Then we'll look for a label that contains the number '1'
		for (let fileData of Object.values(digitalData.file)) {
			let pageNum = fileData.label.match(/\d+$/);
			if (pageNum && pageNum[0] == "1") {
				let fileId = getDerivativeId(fileData);
				return [fileId, getImageField(digitalData, fileId, "url"), ""];
			}
		}
	}
	return null;
}

// Get a digital file attachment. The rules are:
// - if there's a file id get that
// - if there's a PDF get that
// - otherwise get the first image
function prepareAttachment(digitalData, url) {
	let attachment = {};
	// Check for a file id in the url, get that image
	if (/file=FL\d+/.test(url)) {
		let fileId = url.match(/file=(FL\d+)/)[1];
		let imageUrl = getImageField(digitalData, fileId, "url");
		// This is part of a group, so get the file label to use as a subtitle
		let label = getImageField(digitalData, fileId, "label");
		attachment = [{ title: `Digitised image: ${fileId}`, mimeType: "image/jpeg", url: imageUrl }, label];
	}
	else {
		// Check if there's a PDF version
		let pdfUrl = getPdfUrl(digitalData);
		if (pdfUrl) {
			attachment = [{ title: "PDF", mimeType: "application/pdf", url: pdfUrl }, ""];
		}
		else {
			// If there's no PDF, get the first image
			let [fileId, imageUrl, label] = getFirstImageUrl(digitalData);
			attachment = [{ title: `Digitised image: ${fileId}`, mimeType: "image/jpeg", url: imageUrl }, label];
		}
	}
	return attachment;
}

async function scrapeDigital(doc, url) {
	// Use the IE id in the url to request JSON from the internal API
	const digitalId = url.match(/entity=(IE\d+)/)[1];
	const digitalUrl = `https://viewerapi.slv.vic.gov.au/?entity=${digitalId}&dc_arrays=1`;
	const digitalData = await requestJSON(digitalUrl);
	const metadata = digitalData.viewer_md;
	// Look for format types in the 'genre' field and check against mapping
	const format = getFormat(metadata, "genre", "artwork");
	// Create the item
	const item = new Zotero.Item(format);
	item.title = metadata.title[0].split(" / ")[0];
	// Add authors
	for (let creator of metadata.creator || []) {
		item.creators.push(ZU.cleanAuthor(creator, "contributor", true));
	}
	// Additional fields
	item.date = metadata.physical_date[0].replace(/\.$/, "");
	item.rights = getMetadataValue(metadata, "rights");
	item.callNumber = getMetadataValue(metadata, "accession");
	item.url = url;
	item.series = getMetadataValue(metadata, "is_part_of");
	item.tags = metadata.subject;
	// Notes can be in either the summary or description field, so get both and concat.
	let notes = [];
	notes.push(getMetadataValue(metadata, "summary"));
	notes.push(getMetadataValue(metadata, "description"));
	// Remove any empty entries from the array, then add to item
	item.abstractNote = notes.filter(n => n).join('. ');
	// Get digital file details to attach
	let [attachment, label] = prepareAttachment(digitalData, url);
	// Some images are grouped under a single title,
	// so add the image label to the title for clarity where necessary
	if (label) {
		item.title = `${item.title} (${label})`;
	}
	item.attachments.push(attachment);
	// Add snapshot
	item.attachments.push({
		title: "Snapshot",
		document: doc
	});
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://viewer.slv.vic.gov.au/?entity=IE1542628&mode=browse",
		"items": [
			{
				"itemType": "artwork",
				"title": "Penguin [picture].",
				"creators": [
					{
						"firstName": "Ernest Albert",
						"lastName": "Winter",
						"creatorType": "contributor"
					}
				],
				"date": "[ca. 1900-ca. 1930]",
				"abstractNote": "View looking across beach at low tide to a small town, with hill in the background. 1 photographic print (postcard) : gelatin silver ; 9 x 14 cm",
				"callNumber": "H84.427/1/15",
				"libraryCatalog": "State Library of Victoria",
				"rights": "This work is out of copyright",
				"url": "https://viewer.slv.vic.gov.au/?entity=IE1542628&mode=browse",
				"attachments": [
					{
						"title": "Digitised image: FL21266629",
						"mimeType": "image/jpeg"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Gelatin silver prints."
					},
					{
						"tag": "Penguin (Tas.)"
					},
					{
						"tag": "Postcards."
					},
					{
						"tag": "Tasmania; Penguin; beaches; townls; hills"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://viewer.slv.vic.gov.au/?entity=IE426876&mode=browse",
		"items": [
			{
				"itemType": "artwork",
				"title": "A Souvenir of Portsea - 12 Specially Selected Views in Full Color (Image H84.440/342d)",
				"creators": [],
				"date": "[ca. 1945-1954]",
				"abstractNote": "Foldout postcard comprising 12 images. Front cover (from which title is taken) and text inside front cover not captured. Published by NUCOLORVUE PRODUCTIONS, MENTONE, VICTORIA. - OCEAN BEACH, LOOKING TOWARDS PT. LONSDALE-PORTSEA BEACH AND PIER-THE ROAD BETWEEN SORRENTO AND PORTSEA-PICTURESQUE SCENE, PT. KING-THE FRONT BEACH-A SECTION OF LORD MAYOR'S HOLIDAY CAMP-OVERLOOKING THE BEACH AT PORTSEA-SHOPPING CENTRE AND PORTSEA HOTEL-A CLOSE UP VIEW OF LONDON BRIDGE-ENTRANCE TO LORD MAYOR'S HOLIDAY CAMP-THE OCEAN BEACH, LOOKING TOWARDS CAPE SCHANCK-HOTEL NEPEAN, PORTSEA. 1 digital file",
				"callNumber": "H84.440/342d",
				"libraryCatalog": "State Library of Victoria",
				"rights": "This work is out of copyright",
				"url": "https://viewer.slv.vic.gov.au/?entity=IE426876&mode=browse",
				"attachments": [
					{
						"title": "Digitised image: FL21215334",
						"mimeType": "image/jpeg"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Postcards."
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://viewer.slv.vic.gov.au/?entity=IE13142663&file=FL19626988&mode=browse",
		"detectedItemType": "artwork",
		"items": [
			{
				"itemType": "manuscript",
				"title": "Diary, 1841-1869. [manuscript]. (Image 4)",
				"creators": [
					{
						"firstName": "Sarah",
						"lastName": "Davenport",
						"creatorType": "contributor"
					}
				],
				"date": "1841-1869",
				"abstractNote": "Diary of Sarah Davenport 1841-1869; includes account of voyage to Australia aboard \"Champion of Glasgow\"; settling in N.S.W. and later in Victoria in 1846. Also accounts of life on gold fields in Victoria. 72 p. (0.5 cm.)",
				"callNumber": "MS 10541",
				"libraryCatalog": "State Library of Victoria",
				"rights": "This work is in copyright",
				"url": "https://viewer.slv.vic.gov.au/?entity=IE13142663&file=FL19626988&mode=browse",
				"attachments": [
					{
						"title": "Digitised image: FL19626988",
						"mimeType": "image/jpeg"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "British"
					},
					{
						"tag": "Champion of Glasgow (Ship)"
					},
					{
						"tag": "Davenport, Sarah"
					},
					{
						"tag": "Gold mines and mining"
					},
					{
						"tag": "New South Wales"
					},
					{
						"tag": "Ocean travel"
					},
					{
						"tag": "Victoria"
					},
					{
						"tag": "Women"
					},
					{
						"tag": "Women pioneers"
					},
					{
						"tag": "diaries."
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://viewer.slv.vic.gov.au/?entity=IE6991521&mode=browse",
		"detectedItemType": "artwork",
		"items": [
			{
				"itemType": "manuscript",
				"title": "Dick Whittington & his cat.",
				"creators": [
					{
						"firstName": "Frank",
						"lastName": "Crossley",
						"creatorType": "contributor"
					}
				],
				"date": "1916",
				"abstractNote": "Mr. George Marlow presents, \" Dick Whittington & his cat\", at the Princess Theatre, 8th April, 1916. 16 pages : illustrations, portaits ; 25 cm",
				"libraryCatalog": "State Library of Victoria",
				"rights": "This work is out of copyright",
				"url": "https://viewer.slv.vic.gov.au/?entity=IE6991521&mode=browse",
				"attachments": [
					{
						"title": "PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Theater programs"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://find.slv.vic.gov.au/discovery/search?query=any,contains,pelican&tab=searchProfile&search_scope=slv_local&vid=61SLV_INST:SLV&lang=en&offset=0",
		"defer": true,
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://find.slv.vic.gov.au/discovery/fulldisplay?docid=alma9911250433607636&context=L&vid=61SLV_INST:SLV&lang=en&search_scope=slv_local&adaptor=Local%20Search%20Engine&tab=searchProfile&query=any,contains,pelican",
		"detectedItemType": "book",
		"items": [
			{
				"itemType": "audioRecording",
				"title": "Pelican [sound recording]",
				"creators": [
					{
						"lastName": "Bonnevill (Musical group)",
						"creatorType": "creator"
					}
				],
				"date": "c2001",
				"abstractNote": "Gene -- Lammy -- Camoe -- Ides -- Midnight driver -- Pelican -- Lullabye. Compact disc. Bella Union: BELLACD703. Recorded January 2000 at Scuzz World Studios, Australia",
				"callNumber": "781.64 B64P (4369)",
				"label": "Bella Union",
				"libraryCatalog": "State Library of Victoria",
				"place": "Australia",
				"url": "https://find.slv.vic.gov.au/discovery/fulldisplay?vid=61SLV_INST:SLV&docid=alma9911250433607636",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Popular music -- Australia -- 2001-2010"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://find.slv.vic.gov.au/discovery/fulldisplay?docid=alma9932606163607636&context=L&vid=61SLV_INST:SLV&lang=en&search_scope=slv_local&adaptor=Local%20Search%20Engine&tab=searchProfile&query=any,contains,pelican",
		"detectedItemType": "book",
		"items": [
			{
				"itemType": "artwork",
				"title": "Pelican.",
				"creators": [],
				"date": "[between 1900 and 2012]",
				"abstractNote": ".01: p.2 imprint page, coastline purple hills background -- .02: p.4, 4 pelicans fighting over scattered nest with eggs -- .03: pink pelican hatching from egg -- .04: p.7, mother pelican and chick sitting on nest -- .05: p.8 , chick feeding from mothers bill, 3 pelicans background left -- .06: p.9, chick feeding from mothers bill -- .07: p.10, large group baby pelicans, tree left background -- .08: p.11, group baby pelicans one centre left standing on back another -- .09: p.12, pelican right foreground group left background, 1 flying -- .10: p.13, 8 pelicans, 2 centre swimming left to young bird wading -- .11: p.14, 3 birds left, one ground 2 flying parched lake -- .12: p.15, 3 birds flying to right, water dripping from one's feet -- .13: p.16, 7 flying pelicans flying over distant hills -- .14: p.17, group pelicans 's' shape rising on thermals -- .15: p.18, pelican landing on dam with jetty -- .16: p.19, 3 pelicans, bottom swimming, middle head raised, top, head in water -- .17: p.20, pelican throwing up fish, man right of dam hand raised -- .18: p.21, group pelicans bottom right heads in water, group across page top swimming in formation -- .19: p.22, raining, centre pelican swimming bill open, 2 right background -- .20: p.23, group pelicans on ground some on nests, 1 bird right foreground flying to left -- .21: p.24, 2 pelicans foreground walking to right, background 2 left, 3 swimming, 2 flying -- .22: p.25, 2 pelicans walking to right one throwing fish skeleton -- .23: p.26, 3 pelicans bills open facing left -- .24: p.27, 2 pelicans facing, one right bill open -- .25: p.28, one pelican sitting foreground, one middle ground scratching in dirt -- .26: p.29, pelican right sitting on nest, one left on branch, 4 background -- .27: p.30, 4 pelicans flying to right over landscape with fire -- .28: p.31, map Australian taped top right page, areas defined in red -- .29: p.32, animal and shoe footprints over page nest 2 eggs top, nest 2 hatched chicks lower right -- .37: graphite pencil dummy book -- .38: publisher's first proof colour dummy book (loose pages) -- .30-.36: graphite pencil preliminary sketches -- .39-.40: 2 x A4 coloured copies front cover illustration. Title assigned by cataloguer. Dromkeen registration number: 668.4. Custodial history: Part of the Scholastic Dromkeen Children's Literature Collection (formerly the Dromkeen National Centre for Picture Book Art collection), a collection of approximately 7500 original artworks and illustrations from prepublication material of many of Australia's best-loved children's books. Originally collected by Courtney and Joyce Oldmeadow and held at the historic 'Dromkeen' homestead in Riddell's Creek, Scholastic Australia took over the responsibility of maintaining the collection in 1978, and the collection was gifted to the State Library of Victoria in 2012",
				"callNumber": "H2014.290/1-40",
				"libraryCatalog": "State Library of Victoria",
				"rights": "This work is in copyright. Copyright restrictions apply",
				"url": "https://find.slv.vic.gov.au/discovery/fulldisplay?vid=61SLV_INST:SLV&docid=alma9932606163607636",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Picture books -- Australia -- Pictorial works"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://find.slv.vic.gov.au/discovery/fulldisplay?docid=alma9939775704507636&context=L&vid=61SLV_INST:SLV&lang=en&search_scope=slv_local&adaptor=Local%20Search%20Engine&tab=searchProfile&query=any,contains,pelican&offset=0",
		"items": [
			{
				"itemType": "book",
				"title": "The pelican post (Online)",
				"creators": [
					{
						"lastName": "Augusta Community Resource Centre",
						"creatorType": "contributor"
					}
				],
				"date": "2013",
				"abstractNote": "Title from pdf file. Source of description: Description based on: Vol: 17 Issue No. 3 (August 2017)",
				"callNumber": "2208-5025",
				"format": "online resource; text file PDF",
				"language": "eng",
				"libraryCatalog": "State Library of Victoria",
				"place": "Augusta, W.A.",
				"publisher": "Augusta Community Resource Centre",
				"url": "https://find.slv.vic.gov.au/discovery/fulldisplay?vid=61SLV_INST:SLV&docid=alma9939775704507636",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Augusta (W.A.) -- Periodicals"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
