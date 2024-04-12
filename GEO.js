{
	"translatorID": "5a325508-cb60-42c3-8b0f-d4e3c6441059",
	"label": "GEO",
	"creator": "mangosteen",
	"target": "^https?://www\\.ncbi\\.nlm\\.nih\\.gov/geo/query/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": false,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-04-12 13:00"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2022 l0o0

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
    return "dataset";
//	if (url.includes("acc.cgi?acc")) {
//		return "dataset";
//	}
//	return false;
}

async function doWeb(doc, url) {
	const newItem = new Z.Item('dataset');

    // url is of format: https://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc=GSE251923
    // subset the last part of the url to get the accession number
    const acc = url.split("acc=")[1];
    newItem.identifier = acc;

    newItem.repository = "GEO";

	newItem.title = text(doc, '#ui-ncbiexternallink-1 > table > tbody > tr > td > table:nth-child(6) > tbody > tr:nth-child(3) > td:nth-child(2) > table > tbody > tr > td > table > tbody > tr > td > table:nth-child(6) > tbody > tr > td > table:nth-child(1) > tbody > tr:nth-child(3) > td:nth-child(2)')

    const status_str =  text(doc, '#ui-ncbiexternallink-1 > table > tbody > tr > td > table:nth-child(6) > tbody > tr:nth-child(3) > td:nth-child(2) > table > tbody > tr > td > table > tbody > tr > td > table:nth-child(6) > tbody > tr > td > table:nth-child(1) > tbody > tr:nth-child(6) > td:nth-child(2)')
    // status is of format: Public on Dec 27, 2023
    // subset it to get the date
    newItem.date = status_str.split("on")[1].trim();

	newItem.url = url;

    const author_str = text(doc, '#ui-ncbiexternallink-1 > table > tbody > tr > td > table:nth-child(6) > tbody > tr:nth-child(3) > td:nth-child(2) > table > tbody > tr > td > table > tbody > tr > td > table:nth-child(6) > tbody > tr > td > table:nth-child(1) > tbody > tr:nth-child(10) > td:nth-child(2)');
    // authors is of format: Chen J, Song Y, Huang J, Wan X, Li Y
    // push into newItem.creators
    author_str.split(',').forEach(author => {
        newItem.creators.push(ZU.cleanAuthor(author, 'author'));
    });

	/* 删除这行启用note记录全文
	let note = doc.body.querySelector("#js_content");
	if (note) {
		note = `<h1>${newItem.title}</h1>`
			+ note.innerHTML
				.trim()
				.replace(/\"/g, "'")
				.replace(/<img .*?src='(.*?)'.*?>/g, "<img src='$1'\/>");
		newItem.notes.push(note);
	}
	删除这行启用note记录全文 */
	newItem.attachments.push({
		url: url,
		title: 'Snapshot',
		document: doc
	});
	newItem.complete();
}