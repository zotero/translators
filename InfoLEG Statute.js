
/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2025 Ramiro Álvarez Ugarte

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

This transltor captures statutes saved in Infoleg, the most used website for legislation and other sorts of regulation in Argentina. 

*/

{
	"translatorID": "f1fbddbc-541c-4fc7-884d-a3ed2c869e43",
	"label": "InfoLEG Statute",
	"creator": "Ramiro Álvarez Ugarte",
	"target": "^https?://servicios\\.infoleg\\.gob\\.ar/infolegInternet/verNorma\\.do\\?id=\\d+$",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-03-24 21:15:10"
}

function capitalizeFirstLetters(text) {
	return text.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
}

function capitalizeFirstLetter(text) {
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

function detectWeb(doc, url) {
	Z.debug("📌 Running detectWeb on: " + url);
	
	if (url.includes("infoleg.gob.ar/infolegInternet/verNorma.do")) {
		Z.debug("✅ Matched InfoLEG URL, returning 'statute'");
		return "statute";
	}
	
	Z.debug("❌ No match, returning 'false'");
	return false;
}
function doWeb(doc, url) {
	Z.debug("🔄 Running doWeb() on: " + url);

	var item = new Zotero.Item("statute");
	item.url = url;
	
	// Extract Title
	//let titleNode = doc.querySelector("#Textos_Completos > span");
	//if (titleNode) {
	//	item.title = titleNode.textContent.replace(" – InfoLEG", "").trim();
	//}

	// Extract Title but Capitalize First
	let titleNode = doc.querySelector("#Textos_Completos > span");
	if (titleNode) {
		item.title = capitalizeFirstLetter(titleNode.textContent.replace(" – InfoLEG", "").trim());
	}

// Extract Date and Convert to YYYY-MM-DD Format
let dateNode = doc.querySelector("#Textos_Completos > p:nth-child(5) > a:nth-child(1)");
if (dateNode) {
    let rawDate = dateNode.textContent.replace(" – InfoLEG", "").trim();
    item.date = convertDateToISO(rawDate);
}

// Function to Convert DD-MMM-YYYY to YYYY-MM-DD
function convertDateToISO(dateStr) {
    const monthMap = {
        "ene": "01", "feb": "02", "mar": "03", "abr": "04", "may": "05", "jun": "06",
        "jul": "07", "ago": "08", "sep": "09", "oct": "10", "nov": "11", "dic": "12"
    };

    let match = dateStr.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
    if (match) {
        let day = match[1].padStart(2, "0"); // Ensure two-digit day
        let month = monthMap[match[2]]; // Convert month to number
        let year = match[3]; // Year remains the same
        return `${year}-${month}-${day}`;
    }

    return dateStr; // Return original if format is unexpected
}


	// Extract Code Number (if present in page)
	let codeNumber = doc.querySelector("#Textos_Completos > p:nth-child(5) > a:nth-child(2)");
	if (codeNumber) {
		let match = codeNumber.textContent.match(/\d+/); // Extract only digits
			if (match) {
		item.codeNumber = match[0]; // Save only the number
	}
	}

	// Extract Code Number (if present in page)
	let number = doc.querySelector("#Textos_Completos > p:nth-child(1) > strong");
	if (number) {
		let match = number.textContent.match(/\d+/); // Extract only digits
			if (match) {
		item.number = match[0]; // Save only the number
	}
	}
	 
	// Extract Law Number (if present in page)
//	let lawNumber = doc.querySelector("#Textos_Completos > span");
//	if (lawNumber) {
//		item.code = lawNumber[1];  // Example: "InfoLEG 346231"
//	}

//	let lawNumber = doc.querySelector("#Textos_Completos > p:nth-child(5) > a:nth-child(2)");
//	if (lawNumber) {
//		item.code = lawNumber.textContent.trim();
	//}

	// Extract Law Number (if present in page)
	//let lawNumber = url.match(/id=(\d+)/);
	//if (lawNumber) {
	//	item.code.number = lawNumber[1];  // Example: "InfoLEG 346231"
	//}

	item.code = "B.O.";

	// Set default jurisdiction
	item.jurisdiction = "Argentina bebé";

	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://servicios.infoleg.gob.ar/infolegInternet/verNorma.do?id=346231",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Acceso a la interrupcion voluntaria del embarazo",
				"creators": [],
				"dateEnacted": "2021-01-15",
				"code": "B.O.",
				"codeNumber": "34562",
				"publicLawNumber": "27610",
				"url": "https://servicios.infoleg.gob.ar/infolegInternet/verNorma.do?id=346231",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": [],
				"inRepository": false
			}
		]
	}
]
/** END TEST CASES **/
