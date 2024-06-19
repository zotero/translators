{
	"translatorID": "5a325508-cb60-42c3-8b0f-d4e3c6441059",
	"label": "GEO",
	"creator": "mangosteen",
	"target": "^https?://www\\.ncbi\\.nlm\\.nih\\.gov/geo/query/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-04-12 05:48:08"
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
	newItem.repository = "GEO";
	newItem.title = text(doc, '#ui-ncbiexternallink-1 > table > tbody > tr > td > table:nth-child(6) > tbody > tr:nth-child(3) > td:nth-child(2) > table > tbody > tr > td > table > tbody > tr > td > table:nth-child(6) > tbody > tr > td > table:nth-child(1) > tbody > tr:nth-child(3) > td:nth-child(2)');
	newItem.abstractNote = text(doc, '#ui-ncbiexternallink-1 > table > tbody > tr > td > table:nth-child(6) > tbody > tr:nth-child(3) > td:nth-child(2) > table > tbody > tr > td > table > tbody > tr > td > table:nth-child(6) > tbody > tr > td > table:nth-child(1) > tbody > tr:nth-child(6) > td:nth-child(2)');
	newItem.url = url;
	// url is of format: https://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc=GSE251923
	// subset the last part of the url to get the accession number
	const acc = url.split("acc=")[1];
	newItem.identifier = acc;
	// status is of format: Public on Dec 27, 2023
	// subset it to get the date
	const status_str =  text(doc, '#ui-ncbiexternallink-1 > table > tbody > tr > td > table:nth-child(6) > tbody > tr:nth-child(3) > td:nth-child(2) > table > tbody > tr > td > table > tbody > tr > td > table:nth-child(6) > tbody > tr > td > table:nth-child(1) > tbody > tr:nth-child(2) > td:nth-child(2)');
	newItem.date = status_str.split("on")[1].trim();
	// authors is of format: Chen J, Song Y, Huang J, Wan X, Li Y
	// push into newItem.creators
	const author_str = text(doc, '#ui-ncbiexternallink-1 > table > tbody > tr > td > table:nth-child(6) > tbody > tr:nth-child(3) > td:nth-child(2) > table > tbody > tr > td > table > tbody > tr > td > table:nth-child(6) > tbody > tr > td > table:nth-child(1) > tbody > tr:nth-child(10) > td:nth-child(2)');
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
		title: 'Snapshot',
		document: doc
	});
	newItem.complete();
}


/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc=GSE251923",
		"items": [
			{
				"itemType": "dataset",
				"title": "Integrated single-cell RNA sequencing and spatial transcriptomics analysis reveals the tumor microenvironment in patients with endometrial cancer responding to anti-PD-1 treatment",
				"creators": [
					{
						"firstName": "Chen",
						"lastName": "J",
						"creatorType": "author"
					},
					{
						"firstName": "Song",
						"lastName": "Y",
						"creatorType": "author"
					},
					{
						"firstName": "Huang",
						"lastName": "J",
						"creatorType": "author"
					},
					{
						"firstName": "Wan",
						"lastName": "X",
						"creatorType": "author"
					},
					{
						"firstName": "Li",
						"lastName": "Y",
						"creatorType": "author"
					}
				],
				"date": "Dec 27, 2023",
				"abstractNote": "The heterogeneity and complex of immune cell components have a crucial effect on endometrial cancer progression and response to treatment. However, deciphering the neoplastic subtypes and their spatial arrangement remains a formidable challenge. Here, we combine single-cell RNA sequencing (scRNA-seq) with spatial transcriptomics (ST) to identify special immune cell populations that might be involved in the important contribution to the anti-PD-1 sensitiveness of EC. Each cell is organized into discrete subpopulations, characterized by a range of distinct features, origins, and functions. These cell clusters are not only distinguished by their diversity but also arise from interplay among various subtypes. Cell number and function of CD8 cytotoxic cells and Treg cells were abnormal in anti-PD-1 patients with non-responsiveness, and we also identified several ligand-receptor associated with T cell dysfunction. Additionally, we have observed that these subclusters are distinctly localized within various tissue regions, exhibiting variations in the enrichment of immune cell types. Our findings offer valuable biological insights into emerging therapeutic targets and potential biomarkers for enhancing anti-PD-1 therapy.",
				"identifier": "GSE251923",
				"libraryCatalog": "GEO",
				"url": "https://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc=GSE251923",
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
