{
	"translatorID": "12177097-1a7a-4252-a2f9-e9962d1d3704",
	"label": "Gartner Reports",
	"creator": "Avram Lyon",
	"target": "^https://www.gartner.com/en/documents/\\d+",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2020-08-30 20:14:08"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2020 Avram Lyon
	
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
	return "report";
}


function doWeb(doc, url) {
	let newItem = new Zotero.Item("report");
	newItem.title = ZU.xpathText(doc, "//h1");
	newItem.itemType = detectWeb(doc, url);
	newItem.abstractNote = ZU.xpathText(doc, "//h5/following-sibling::p");
	newItem.reportNumber = ZU.xpathText(doc, '//p/span[contains(text(), "ID:")]/following-sibling::text()');
	newItem.date = ZU.xpathText(doc, '//p/span[contains(text(), "Published:")]/following-sibling::text()');
	newItem.seriesTitle = ZU.xpathText(doc, '//h2');
	var analysts = ZU.xpath(doc, '//p/span[contains(text(), "Analyst(s):")]/following-sibling::span');
	if (analysts) {
		analystList = analysts.map(entry => entry.textContent.trim());
		for (var i = 0; i < analystList.length; i++) {
			newItem.creators.push(ZU.cleanAuthor(analystList[i], "author"));
		}
	}
	// Does not work without mimetype?
	// var attachments = ZU.xpath(doc, '//h4[contains(text(), "Download Attachments")]/following-sibling::ul/li/a');
	// if (attachments) {
	// 	for (var j = 0; j < attachments.length; j++) {
	// 		let link = attachments[j];
	// 		newItem.attachments.push({url: link.href, title:link.textContent.trim()});
	// 	}
	// }
	newItem.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.gartner.com/en/documents/3982411",
		"items": [
			{
				"itemType": "report",
				"title": "How to Manage and Optimize Costs of Public Cloud IaaS and PaaS",
				"creators": [
					{
						"firstName": "Marco",
						"lastName": "Meinardi",
						"creatorType": "author"
					},
					{
						"firstName": "Traverse",
						"lastName": "Clayton",
						"creatorType": "author"
					}
				],
				"date": "23 March 2020",
				"abstractNote": "Managing costs is a challenge for organizations using public cloud services but also an opportunity to drive efficient consumption of IT. This research provides I&O technical professionals with a framework to manage costs of cloud-integrated IaaS and PaaS providers such as AWS and Microsoft Azure.",
				"libraryCatalog": "Gartner",
				"reportNumber": "G00465208",
				"seriesTitle": "Gartner Information Technology Research",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
