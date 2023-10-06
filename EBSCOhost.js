{
	"translatorID": "d0b1914a-11f1-4dd7-8557-b32fe8a3dd47",
	"label": "EBSCOhost",
	"creator": "Simon Kornblith, Michael Berkowitz, Josh Geller",
	"target": "^https?://[^/]+/(eds|bsi|ehost)/(results|detail|folder|pdfviewer)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsib",
	"lastUpdated": "2021-10-11 01:07:25"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2021 Simon Kornblith, Michael Berkowitz, Josh Geller

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

// eslint-disable-next-line no-unused-vars
function detectWeb(doc, url) {
	// See if this is a search results or folder results page
	var multiple = getResultList(doc, {}, {});	// we don't care about actual data at this point
	if (multiple) {
		return "multiple";
	}

	if (doc.querySelector("a.permalink-link")) {
		return "journalArticle";
	}
	else if (ZU.xpathText(doc, '//section[@class="record-header"]/h2')) {
		return "journalArticle";
	}
	return false;
}

/*
 * given the text of the delivery page, downloads an item
 */
function downloadFunction(text, url, prefs) {
	if (text.search(/^TY\s\s?-/m) == -1) {
		text = "\nTY  - JOUR\n" + text;	// this is probably not going to work if there is garbage text in the begining
	}

	// fix DOI
	text = text.replace(/^(?:L3|DI)(\s\s?-)/gm, 'DO$1');

	// There are cases where the RIS type isn't good--
	// there is sometimes better data in M3
	// This list should be augmented over time
	var m, m3Data;
	var itemType = prefs.itemType;

	if (!itemType && (m = text.match(/^M3\s+-\s*(.*)$/m))) {
		m3Data = m[1];	// used later
		switch (m3Data) {
			case "Literary Criticism":
			case "Case Study":
				itemType = "journalArticle";
				break;
		}
	}
	// remove M3 so it does not interfere with DOI.
	// hopefully EBCSOhost doesn't use this for anything useful
	text = text.replace(/^M3\s\s?-.*/gm, '');
	
	// we'll save this for later, in case we have to throw away a subtitle
	// from the RIS
	let subtitle;
	
	// EBSCOhost uses nonstandard tags to represent journal titles on some items
	// no /g flag so we don't create duplicate tags
	let journalRe = /^(JO|JF|J1)/m;
	if (journalRe.test(text)) {
		let subtitleRe = /^T2\s\s?-\s?(.*)/m;
		let subtitleMatch = text.match(subtitleRe);
		if (subtitleMatch) {
			// if there's already something in T2, store it and erase it from the RIS
			subtitle = subtitleMatch[1];
			text = text.replace(subtitleRe, '');
		}
		
		text = text.replace(journalRe, 'T2');
	}
	
	// Let's try to keep season info
	// Y1  - 1993///Winter93
	// Y1  - 2009///Spring2009
	// maybe also Y1  - 1993///93Winter
	var season = text.match(
		/^(Y1\s+-\s+(\d{2})(\d{2})\/\/\/)(?:\2?\3(.+)|(.+?)\2?\3)\s*$/m);
	season = season && (season[4] || season[5]);
	
	// load translator for RIS
	var translator = Zotero.loadTranslator("import");
	translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
	translator.setString(text);
	// eslint-disable-next-line padded-blocks
	translator.setHandler("itemDone", function (obj, item) {
		
		/* Fix capitalization issues */
		// title
		if (!item.title && prefs.itemTitle) {
			item.title = prefs.itemTitle;
		}
		if (item.title) {
			// Strip final period from title if present
			item.title = item.title.replace(/([^.])\.\s*$/, '$1');
			
			if (item.title.toUpperCase() == item.title) {
				item.title = ZU.capitalizeTitle(item.title, true);
			}
			
			if (subtitle) {
				item.title += `: ${subtitle}`;
			}
		}

		// authors
		var fn, ln;
		for (var i = 0, n = item.creators.length; i < n; i++) {
			fn = item.creators[i].firstName;
			if (fn && fn.toUpperCase() == fn) {
				item.creators[i].firstName = ZU.capitalizeTitle(fn, true);
			}

			ln = item.creators[i].lastName;
			if (ln && ln.toUpperCase() == ln) {
				item.creators[i].lastName = ZU.capitalizeTitle(ln, true);
			}
		}
		
		// Sometimes EBSCOhost gives us year and season
		if (season) {
			item.date = season + ' ' + item.date;
		}
		
		// The non-DOI values in M3 should never pass RIS translator,
		// but, just in case, if we know it's not DOI, let's remove it
		if (item.DOI && item.DOI == m3Data) {
			item.DOI = undefined;
		}
		
		// Strip EBSCOhost tags from the end of abstract
		if (item.abstractNote) {
			item.abstractNote = item.abstractNote
				.replace(/\s*\[[^\].]+\]$/, ''); // to be safe, don't strip sentences
		}

		// Get the accession number from URL if not in RIS
		var an = url.match(/_(\d+)_AN/);
		if (!item.callNumber) {
			if (an) {
				an = an[1];
				item.callNumber = an;
			}
		}
		else if (!an) {	// we'll need this later
			an = item.callNumber;
		}
		
		// A lot of extra info is jammed into notes
		item.notes = [];
		
		// the archive field is pretty useless:
		item.archive = "";
		
		if (item.url) {
			// Trim the ⟨=cs suffix -- EBSCO can't find the record with it!
			item.url = item.url.replace(/(AN=[0-9]+)⟨=[a-z]{2}/, "$1")
				.replace(/#.*$/, '');
			if (!prefs.hasFulltext) {
				// For items without full text,
				// move the stable link to a link attachment
				item.attachments.push({
					url: item.url + "&scope=cite",
					title: "EBSCO Record",
					mimeType: "text/html",
					snapshot: false
				});
				item.url = undefined;
			}
		}
		
		if (prefs.pdfURL) {
			item.attachments.push({
				url: prefs.pdfURL,
				title: "EBSCO Full Text",
				mimeType: "application/pdf"
			});
			item.complete();
		}
		else if (prefs.fetchPDF) {
			var args = urlToArgs(url);
			if (prefs.mobile) {
				// the PDF is not embedded in the mobile view
				var id = url.match(/([^/]+)\?sid/)[1];
				var pdfurl = "/ehost/pdfviewer/pdfviewer/"
					+ id
					+ "?sid=" + args.sid
					+ "&vid=" + args.vid;
				item.attachments.push({
					url: pdfurl,
					title: "EBSCO Full Text",
					mimeType: "application/pdf"
				});
				item.complete();
			}
			else {
				var pdf = "/ehost/pdfviewer/pdfviewer?"
					+ "sid=" + args.sid
					+ "&vid=" + args.vid;
				Z.debug("Fetching PDF from " + pdf);

				ZU.processDocuments(pdf,
					function (pdfDoc) {
						if (!isCorrectViewerPage(pdfDoc)) {
							Z.debug('PDF viewer page doesn\'t appear to be serving the correct PDF. Skipping PDF attachment.');
							return;
						}
						
						var realpdf = findPdfUrl(pdfDoc);
						if (realpdf) {
							item.attachments.push({
								url: realpdf,
								title: "EBSCO Full Text",
								mimeType: "application/pdf",
								proxy: false
							});
						}
						else {
							Z.debug("Could not find a reference to PDF.");
						}
					},
					function () {
						Z.debug("PDF retrieval done.");
						item.complete();
					}
				);
			}
		}
		else {
			Z.debug("Not attempting to retrieve PDF.");
			item.complete();
		}
	});

	translator.getTranslatorObject(function (trans) {
		trans.options.itemType = itemType;
		trans.doImport();
	});
}

// collects item url->title (in items) and item url->database info (in itemInfo)
function getResultList(doc, items, itemInfo) {
	var results = ZU.xpath(doc, '//li[@class="result-list-li"]');
	var title, folderData, count = 0;
	// make search results work if you can't add to folder, e.g. for EBSCO used as discovery service of library such as
	// https://www.library.umass.edu/
	// http://search.ebscohost.com/login.aspx?direct=true&site=eds-live&scope=site&type=0&custid=s4895734&groupid=main&profid=eds&mode=and&lang=en&authtype=ip,guest,athens
	if (results.length > 0) {
		let folder = ZU.xpathText(doc, '//span[@class = "item add-to-folder"]/input/@value|.//span[@class = "item add-to-folder"]/a[1]/@data-folder');
		for (let i = 0; i < results.length; i++) {
			title = ZU.xpath(results[i], './/a[@class = "title-link color-p4"]');
			if (!title.length) continue;
			if (folder) {
				folderData = ZU.xpath(results[i],
					'.//span[@class = "item add-to-folder"]/input/@value|.//span[@class = "item add-to-folder"]/a[1]/@data-folder');
				// I'm not sure if the input/@value format still exists somewhere, but leaving this in to be safe
				// skip if we're missing something
	
				itemInfo[title[0].href] = {
					folderData: folderData[0].textContent,
					// let's also store item type
					itemType: ZU.xpathText(results[i],
						'.//div[contains(@class, "pubtype")]/span/@class'),
					itemTitle: ZU.xpathText(results[i], './/span[@class="title-link-wrapper"]/a'),
					// check if PDF is available
					fetchPDF: ZU.xpath(results[i], './/span[@class="record-formats"]/a[contains(@class,"pdf-ft")]').length,
					hasFulltext: ZU.xpath(results[i], './/span[@class="record-formats"]/a[contains(@class,"pdf-ft") or contains(@class, "html-ft")]').length
				};
			}
			count++;
			items[title[0].href] = title[0].textContent;
		}
	}
	else {
		results = ZU.xpath(doc, '//ol[@id="resultlist"]//li[@class="resultlist-record"]');
		let folder = ZU.xpathText(doc, '//a[@class="add-to-folder"]');
		for (let i = 0; i < results.length; i++) {
			title = ZU.xpath(results[i], './/h2[@class="record-title"]/a');
			if (!title.length) continue;
			if (folder) {
				folderData = ZU.xpath(results[i], './/a[@class="add-to-folder"]/@data-folder');
			
				itemInfo[title[0].href] = {
					folderData: folderData[0].textContent,
					// let's also store item type
					itemType: ZU.xpathText(results[i],
						'.//div[contains(@class, "pub-type")]/@class'),
					itemTitle: ZU.xpathText(results[i], './/h2[@class="record-title"]/a'),
					// check if FullText is available - if it is we also try the PDF
					fetchPDF: ZU.xpath(results[i], './/ul[@class="record-description"]/li/span[contains(text(),"Full Text")]').length,
					hasFulltext: ZU.xpath(results[i], './/ul[@class="record-description"]/li/span[contains(text(),"Full Text")]').length
				};
			}
			count++;
			items[title[0].href] = title[0].textContent;
		}
	}
	return count;
}

// returns Zotero item type given a class name for the item icon in search list
function ebscoToZoteroItemType(ebscoType) {
	if (!ebscoType) return false;

	var m = ebscoType.match(/\bpt-(\S+)/);
	if (m) {
		switch (m[1]) {
			case "review":
			case "academicJournal":
				return "journalArticle";
			// This isn't always right. See https://forums.zotero.org/discussion/42535/atlas-codes-journals-as-magazines/
			// case "serialPeriodical":
			//	return "magazineArticle";	//is this right?
			// break;
			case "newspaperArticle":
				return "newspaperArticle";
		}
	}
	return false;
}

// extracts arguments from a url and places them into an object
var argumentsRE = /([^?=&]+)(?:=([^&]*))?/g;
function urlToArgs(url) {
	// reset index
	argumentsRE.lastIndex = 0;

	var args = {};
	var arg;
	// eslint-disable-next-line padded-blocks
	while ((arg = argumentsRE.exec(url))) {
		args[arg[1]] = arg[2];
	}

	return args;
}

// given a PDF viewer document, returns whether it appears to be displaying
// the correct PDF corresponding to the requested item. EBSCO sometimes returns
// the PDF for a previously viewed item when the current item doesn't have an
// associated PDF, but it won't serve metadata on the PDF viewer page in these
// cases.
function isCorrectViewerPage(pdfDoc) {
	let citationAmplitude = attr(pdfDoc, 'a[name="citation"][data-amplitude]', 'data-amplitude');
	if (!citationAmplitude || !citationAmplitude.startsWith('{')) {
		Z.debug('PDF viewer page structure has changed - assuming PDF is correct');
		return true;
	}
	
	return !!JSON.parse(citationAmplitude).result_index;
}

// given a pdfviewer page, extracts the PDF url
function findPdfUrl(pdfDoc) {
	var el;
	var realpdf = (el = pdfDoc.getElementById('downloadLink')) && el.href; // link
	if (!realpdf) {
		// input
		realpdf = (el = pdfDoc.getElementById('pdfUrl')) && el.value;
	}
	if (!realpdf) {
		realpdf = (el = pdfDoc.getElementById('pdfIframe') // iframe
				|| pdfDoc.getElementById('pdfEmbed')) // embed
			&& el.src;
	}
	
	return realpdf;
}

/**
 * borrowed from http://www.webtoolkit.info/javascript-base64.html
 */
var base64KeyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

function utf8Encode(string) {
	string = string.replace(/\r\n/g, "\n");
	var utftext = "";

	for (var n = 0; n < string.length; n++) {
		var c = string.charCodeAt(n);
		if (c < 128) {
			utftext += String.fromCharCode(c);
		}
		else if ((c > 127) && (c < 2048)) {
			utftext += String.fromCharCode((c >> 6) | 192);
			utftext += String.fromCharCode((c & 63) | 128);
		}
		else {
			utftext += String.fromCharCode((c >> 12) | 224);
			utftext += String.fromCharCode(((c >> 6) & 63) | 128);
			utftext += String.fromCharCode((c & 63) | 128);
		}
	}
	return utftext;
}

function btoa(input) {
	var output = "";
	var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
	var i = 0;
	input = utf8Encode(input);
		
	while (i < input.length) {
		chr1 = input.charCodeAt(i++);
		chr2 = input.charCodeAt(i++);
		chr3 = input.charCodeAt(i++);
		enc1 = chr1 >> 2;
		enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
		enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
		enc4 = chr3 & 63;
		if (isNaN(chr2)) {
			enc3 = enc4 = 64;
		}
		else if (isNaN(chr3)) {
			enc4 = 64;
		}
		output = output
				+ base64KeyStr.charAt(enc1) + base64KeyStr.charAt(enc2)
				+ base64KeyStr.charAt(enc3) + base64KeyStr.charAt(enc4);
	}
	return output;
}

/**
 * end borrowed code
 */
 
/**
 * EBSCOhost encodes the target url before posting the form
 * Replicated from http://global.ebsco-content.com/interfacefiles/13.4.0.98/javascript/bundled/_layout2/master.js
 */
function urlSafeEncodeBase64(str) {
	return btoa(str).replace(/\+/g, "-").replace(/\//g, "_")
		.replace(/=*$/, function (m) {
			return m.length;
		});
}

// var counter;
// eslint-disable-next-line no-unused-vars
function doWeb(doc, url) {
// counter = 0;
	var items = {};
	var itemInfo = {};
	var multiple = getResultList(doc, items, itemInfo);

	if (multiple) {
		Zotero.selectItems(items, function (items) {
			if (!items) {
				return;
			}

			// fetch each url assynchronously
			for (let i in items) {
				(function (itemInfo) {
					ZU.processDocuments(
						i.replace(/#.*$/, ''),
						function (doc) {
							doDelivery(doc, itemInfo);
						}
					);
				})(itemInfo[i]);
			}
		});
	}
	else {
		doDelivery(doc); // Individual record.
		// Record key exists in attribute for add to folder link in DOM
	}
}

function doDelivery(doc, itemInfo) {
	var folderData;
	if (!itemInfo || !itemInfo.folderData)	{
		// Get the db, AN, and tag from ep.clientData instead
		var clientData;
		var scripts = doc.getElementsByTagName("script");
		for (var i = 0; i < scripts.length; i++) {
			clientData = scripts[i].textContent
				.match(/var ep\s*=\s*({[^;]*})(?:;|\s*$)/);
			if (clientData) break;
		}
		if (!clientData) {
			return;
		}

		/* We now have the script containing ep.clientData */
		clientData = clientData[1].match(/"currentRecord"\s*:\s*({[^}]*})/);
		if (!clientData) {
			return;
		}

		/* If this starts throwing exceptions, we should probably start try-catching it */
		folderData = JSON.parse(clientData[1]);
	}
	else {
		folderData = JSON.parse(itemInfo.folderData); // The attributes are a little different
		folderData.Db = folderData.db;
		folderData.Term = folderData.uiTerm;
		folderData.Tag = folderData.uiTag;
	}

	// some preferences for later
	var prefs = {};
	prefs.mobile = false;
	if (ZU.xpathText(doc, '//p[@class="view-layout"]/strong[@class="mobile"]')) {
		prefs.mobile = true;
	}
	// figure out if there's a PDF available
	// if PDFs stop downloading, might want to remove this
	if (!itemInfo)	{
		if (doc.location.href.includes('/pdfviewer/')) {
			prefs.pdfURL = findPdfUrl(doc);
			prefs.fetchPDF = !!prefs.pdfURL;
		}
		else {
			prefs.fetchPDF = !(ZU.xpath(doc, '//div[@id="column1"]//ul[1]/li').length	// check for left-side column
					&& !ZU.xpath(doc, '//a[contains(@class,"pdf-ft")]').length);	// check if there's a PDF there
		}
		prefs.hasFulltext = !(ZU.xpath(doc, '//div[@id="column1"]//ul[1]/li').length	// check for left-side column
			&& !ZU.xpath(doc, '//a[contains(@class,"pdf-ft") or contains(@class, "html-ft")]').length);
		prefs.itemTitle = ZU.xpathText(doc, '//dd[contains(@class, "citation-title")]/a/span')
			|| ZU.xpathText(doc, '//h2[@id="selectionTitle"]');
	}
	else {
		prefs.fetchPDF = itemInfo.fetchPDF;
		prefs.hasFulltext = itemInfo.hasFulltext;
		prefs.itemType = ebscoToZoteroItemType(itemInfo.itemType);
		prefs.itemTitle = itemInfo.itemTitle;
	}
	
	if (prefs.itemTitle) {
		prefs.itemTitle = ZU.trimInternal(prefs.itemTitle).replace(/([^.])\.$/, '$1');
	}
	// Z.debug(prefs);

	var postURL = ZU.xpathText(doc, '//form[@id="aspnetForm"]/@action');
	if (!postURL) {
		postURL = doc.location.href; // fallback for mobile site
	}
	var args = urlToArgs(postURL);

	postURL = "/ehost/delivery/ExportPanelSave/"
		+ urlSafeEncodeBase64(folderData.Db + "__" + folderData.Term + "__" + folderData.Tag)
		+ "?sid=" + args.sid
		+ "&vid=" + args.vid
		+ "&bdata=" + args.bdata
		+ "&theExportFormat=1";	// RIS file
	ZU.doGet(postURL, function (text) {
		downloadFunction(text, postURL, prefs);
	});
}

/** BEGIN TEST CASES **/
var testCases = []
/** END TEST CASES **/
