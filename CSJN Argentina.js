{
	"translatorID": "294f4583-1d91-40aa-8152-230676717241",
	"label": "CSJN Argentina",
	"creator": "Ramiro",
	"target": "^https://sjconsulta\\.csjn\\.gov\\.ar/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-03-27 22:46:46"
}

/* This translator seeks to capture info on cases from Argentina, from the
Supreme Court website */


/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2025 Ramiro

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

function capitalizeFirstLetters(text) {
	// First, handle specific cases where certain strings should remain lowercase
	text = text.replace(/\bc\/\b/g, 'c/') // Keep "c/" lowercase
		.replace(/\bs\/\b/g, 's/') // Keep "s/" lowercase
		.replace(/\sY\s/g, ' y ') // Keep " Y " lowercase
		.replace(/s\/.*/g, match => match.toLowerCase()); // Keep everything after "s/" lowercase

	// Now apply capitalization to the rest of the string
	return text.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
}
function detectWeb(doc, url) {
	if (url.includes("sjconsulta")) {
		return "case";
	}
	return false;
}

function doWeb(doc, _url) {
	var item = new Zotero.Item("case");
	//Capture title
	let titleNode = doc.querySelector("div > div.col-xs-12.col-sm-11 > div:nth-child(4) > div.col-sm-12.col-lg-7.datosSumario > div:nth-child(1) > div");

	if (titleNode) {
		item.title = capitalizeFirstLetters(titleNode.textContent.trim());
	}
	//Capture date
	let dateNode = doc.querySelector("div > div.col-xs-12.col-sm-11 > div:nth-child(4) > div.col-sm-12.col-lg-7.datosSumario > div.row.datosSumario > div > div.col-sm-4.col-md-3.col-lg-2.numero");

	if (dateNode) {
		item.date = dateNode.textContent.trim();
	}
	// Capture "Fallos"
	let reporterTextNode = doc.querySelector("div > div.col-xs-12.col-sm-11 > div:nth-child(4) > div.col-sm-12.col-lg-7.datosSumario > div.row.datosSumario > div > div.col-sm-6.col-md-4.col-lg-3.numero > div > div"); // Replace with actual selector for the text "Fallos: 306:1892"

	if (reporterTextNode) {
		let reporterText = reporterTextNode.textContent.trim();

		// Use a regex to capture the volume and the page number
		let match = reporterText.match(/Fallos:\s*(\d+):(\d+)/);
		if (match) {
			item.reporterVolume = match[1]; // First number (Volume)
			item.firstPage = match[2]; // Second number (Page)
		}
	}

	item.creators = [{
		creatorType: "author",
		firstName: "",
		lastName: "CSJN",
		fieldMode: 1
	}];

	item.reporter = "Fallos";

	item.court = "CSJN";
	item.complete();
}
