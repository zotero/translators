{
	"translatorID": "ac4b1d6a-6e52-42e2-9634-ebbe1e96b9ad",
	"label": "IETF",
	"creator": "Félix Brezo (@febrezo)",
	"target": "^https?://tools.ietf.org/(html|pdf|rfc)/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2020-08-02 14:35:03"
}

/*
	IETF Translator
	Copyright (C) 2020 Félix Brezo (@febrezo), felixbrezo@disroot.org
	
	This program is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.
	
	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU General Public License for more details.
	
	You should have received a copy of the Affero GNU General Public License
	along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/


function detectWeb(doc, url) {
	return "report";
}

function doWeb(doc, url) {
	var resourceType = detectWeb(doc, url);
	var newItem = new Zotero.Item(resourceType);
	
	var targetUri;
	if (url.includes("/rfc/")) {
		targetUri = url.replace("/rfc/", "/html/").replace(".txt", "");
	}
	else if (url.includes("/pdf/")) {
		targetUri = url.replace("/pdf/", "/html/").replace(".pdf", "");
	}
	else {
		targetUri = url;
	}

	Zotero.Utilities.HTTP.doGet(targetUri, function (resText) {
		// Clean and parse metadata web
		resText = resText.replace(/<!DOCTYPE[^>]*>/, "").replace(/<\?xml[^>]*\?>/, "");
		resText = Zotero.Utilities.trim(resText);

		let parser = new DOMParser();
		let metadataDoc = parser.parseFromString(resText, "text/html");

		// Start scraping
		newItem.title = ZU.xpathText(metadataDoc, "//meta[@name='DC.Title']/@content");
		
		// Iterating through authors
		let index = 0;
		while (true) {
			index++;
			var tmpAuthor = ZU.xpathText(metadataDoc, "(//meta[@name='DC.Creator'])[" + index + "]/@content");
			if (tmpAuthor) {
				let splitAuthor = tmpAuthor.split(" <")[0].split(", ");	// Remove references to emails that sometimes appear
				if (splitAuthor.length == 1) {			// Process authors given as full name
			 		newItem.creators.push(ZU.cleanAuthor(splitAuthor[0], "author", false)); 
				}
				else {										// Process splitted authors
					newItem.creators.push({ lastName: splitAuthor[0], firstName: splitAuthor[1], creatorType: "author" });
				}
			}
			else {
				break;
			}
		}
		newItem.reportNumber = "RFC " + ZU.xpathText(metadataDoc, "//meta[@name='DC.Identifier']/@content").split(":")[3];
		newItem.institution = "IETF";
		let abstractContent = ZU.xpathText(metadataDoc, "//meta[@name='DC.Description.Abstract']/@content");
		newItem.abstractNote = abstractContent.replace(/\n/g, " ");
		
		let regexp_type = /\[([^\]]+)\]$/;
		let reportType = abstractContent.match(regexp_type)[1];
		
		newItem.reportType = ZU.capitalizeName(reportType.replace("-", " "));
		newItem.url = targetUri;
		let tmpDate = ZU.xpathText(metadataDoc, "//meta[@name='DC.Date.Issued']/@content");
		newItem.date = ZU.strToISO(tmpDate);

		// Adding the attachment
		newItem.attachments.push({
			title: "Snapshot",
			mimeType: "text/html",
			url: targetUri
		});
	
		newItem.complete();
	});
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://tools.ietf.org/html/rfc2474",
		"items": [
			{
				"itemType": "report",
				"title": "Definition of the Differentiated Services Field (DS Field) in the IPv4 and IPv6 Headers",
				"creators": [
					{
						"lastName": "Nichols",
						"firstName": "Kathleen",
						"creatorType": "author"
					},
					{
						"lastName": "Black",
						"firstName": "David L.",
						"creatorType": "author"
					},
					{
						"lastName": "Blake",
						"firstName": "Steven",
						"creatorType": "author"
					},
					{
						"lastName": "Baker",
						"firstName": "Fred",
						"creatorType": "author"
					}
				],
				"date": "1998-12",
				"abstractNote": "This document defines the IP header field, called the DS (for differentiated services) field. [STANDARDS-TRACK]",
				"institution": "IETF",
				"libraryCatalog": "IETF",
				"reportNumber": "RFC 2474",
				"reportType": "Standards Track",
				"url": "https://tools.ietf.org/html/rfc2474",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
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
		"url": "https://tools.ietf.org/html/rfc2822",
		"items": [
			{
				"itemType": "report",
				"title": "Internet Message Format",
				"creators": [
					{
						"firstName": "Peter W.",
						"lastName": "Resnick",
						"creatorType": "author"
					}
				],
				"date": "2001-04",
				"abstractNote": "This document specifies a syntax for text messages that are sent between computer users, within the framework of \"electronic mail\" messages. [STANDARDS-TRACK]",
				"institution": "IETF",
				"libraryCatalog": "IETF",
				"reportNumber": "RFC 2822",
				"reportType": "Standards Track",
				"url": "https://tools.ietf.org/html/rfc2822",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
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
		"url": "https://tools.ietf.org/rfc/rfc2822.txt",
		"items": [
			{
				"itemType": "report",
				"title": "Internet Message Format",
				"creators": [
					{
						"firstName": "Peter W.",
						"lastName": "Resnick",
						"creatorType": "author"
					}
				],
				"date": "2001-04",
				"abstractNote": "This document specifies a syntax for text messages that are sent between computer users, within the framework of \"electronic mail\" messages. [STANDARDS-TRACK]",
				"institution": "IETF",
				"libraryCatalog": "IETF",
				"reportNumber": "RFC 2822",
				"reportType": "Standards Track",
				"url": "https://tools.ietf.org/html/rfc2822",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
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
