{
	"translatorID": "e048e70e-8fea-43e9-ac8e-940bc3d71b0b",
	"label": "LingBuzz",
	"creator": "Göktuğ Kayaalp",
	"target": "^https://ling.auf.net/lingbuzz/\\d+",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2020-10-07 15:14:37"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2020 Göktuğ Kayaalp <self at gkayaalp dot com>

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

function detectWeb(_doc, _url) {
	return "journalArticle";
}

function doWeb(doc, _url) {
	var newItem = new Zotero.Item("journalArticle");

	// Collect information.
	var idBlock = doc.querySelector("center").innerText.split("\n");
	var title = idBlock[0];
	var author = idBlock[1];
	var date = idBlock[2];
	var abstract = doc.querySelector(
		"center"
	).nextElementSibling.nextSibling.textContent;
	var table = doc.querySelector("tbody").innerText.split(/\n|\t/);
	var reference = table[3];
	var keywords = table[8].split(/[;,] /);
	var pdfURL = doc.querySelector(
		"body > table:nth-child(4) > tbody:nth-child(1) > tr:nth-child(1) "
		+ "> td:nth-child(2) > a:nth-child(1)"
	).href;
	// Phew.  That was... disgusting, if I'm polite.

	newItem.title = title;
	newItem.creators.push(
		Zotero.Utilities.cleanAuthor(author, "author"));
	newItem.abstractNote = abstract;
	newItem.date = date;
	newItem.language = "English"; // haven't seen an article in other language.

	newItem.attachments = [
		{ document: doc, title: "Snapshot", mimeType: "text/html" },
		{ url: pdfURL, title: "LingBuzz Full Text PDF", mimeType: "application/pdf" }
	];

	newItem.tags = keywords;
	newItem.callNumber = reference; // XXX: IDK if this is the apt field.

	newItem.publicationTitle = "LingBuzz";

	newItem.complete();
}

