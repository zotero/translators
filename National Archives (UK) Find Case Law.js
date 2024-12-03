{
	"translatorID": "5c0588e6-561f-4ab3-bb13-4f72bf049ca8",
	"label": "National Archives (UK) Find Case Law",
	"creator": "Tim Cowlishaw <tim@timcowlishaw.co.uk>",
	"target": "https?:\\/\\/caselaw\\.nationalarchives\\.gov\\.uk\\/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-12-12 04:54:26"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2023 Tim Cowlishaw

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


function detectWeb(doc, _url) {
	if (isJudgment(doc)) {
		return "case";
	}
	else if (isResultsList(doc)) {
		return "multiple";
	}
	return false;
}

function doWeb(doc, url) {
	var result;
	if (isJudgment(doc)) {
		result = scrape(doc, url);
	}
	else if (isResultsList(doc)) {
		const resultList = doc.querySelector("ul.judgment-listing__list");
		const items = ZU.getItemArray(doc, resultList, /\/[a-zA-Z0-9]+/);
		result = Z.selectItems(items, function (items) {
			if (items) ZU.processDocuments(Object.keys(items), scrape);
		});
	}
	return result;
}

function isJudgment(doc) {
	return doc.querySelector("article.judgment") !== null;
}

function isResultsList(doc) {
	return doc.querySelector("ul.judgment-listing__list") !== null;
}

function scrape(doc, url) {
	const item = new Z.Item("case");
	const dataUrl = new URL(url);
	dataUrl.pathname += "/data.xml";
	dataUrl.search = null;

	ZU.doGet(dataUrl.href, function (text) {
		const parser = new DOMParser();
		const xmlDoc = parser.parseFromString(text, "text/xml");
		function xpath(path) {
			return ZU.xpathText(xmlDoc, path, { akn: "http://docs.oasis-open.org/legaldocml/ns/akn/3.0",
				uk: "https://caselaw.nationalarchives.gov.uk/akn" }
			);
		}
		item.uri = xpath("//akn:FRBRExpression/akn:FRBRuri/@value");
		item.title = xpath("//akn:FRBRWork/akn:FRBRname/@value");
		item.dateDecided = xpath('//akn:FRBRWork/akn:FRBRdate[@name="judgment"]/@date');
		item.court = xpath('//uk:court');
		new Array(xpath('//akn:judge/@refersTo')).forEach(function (href) {
			if (href !== null) {
				const id = href.replace("#", "");
				item.creators.push({
					lastName: xpath(`//akn:TLCPerson[@eId='${id}']/@showAs`),
					creatorType: "author",
					fieldMode: 1
				});
			}
		});
		const ncn = xpath("//uk:cite");
		item.notes.push({ note: `Neutral Citation Number: ${ncn}` });
		ZU.doGet(item.uri, function (text) {
			const parser = new DOMParser();
			const htmlDoc = parser.parseFromString(text, "text/html");
			const downloadButton = htmlDoc.querySelector(".judgment-toolbar-buttons__option--pdf");
			const pdfURL = downloadButton && downloadButton.getAttribute("href");
			if (pdfURL) {
				item.attachments.push({
					url: "https://caselaw.nationalarchives.gov.uk" + pdfURL,
					title: "Full Text PDF",
					mimeType: "application/pdf"
				});
			}
		});
		item.complete();
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://caselaw.nationalarchives.gov.uk/ewhc/qb/2020/3156",
		"items": [
			{
				"itemType": "case",
				"caseName": "Vardy v Rooney",
				"creators": [
					{
						"lastName": "THE HON. MR JUSTICE WARBY",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"dateDecided": "2020-11-20",
				"court": "EWHC-QBD",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "Neutral Citation Number: [2020] EWHC 3156 (QB)"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://caselaw.nationalarchives.gov.uk/ewca/civ/2021/567",
		"items": [
			{
				"itemType": "case",
				"caseName": "Corbyn v Millett",
				"creators": [],
				"dateDecided": "2021-04-20",
				"court": "EWCA-Civil",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "Neutral Citation Number: [2021] EWCA Civ 567"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://caselaw.nationalarchives.gov.uk/judgments/search?query=Corbyn",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://caselaw.nationalarchives.gov.uk/ewhc/qb/2020/3156?query=vardy+v+Rooney",
		"items": [
			{
				"itemType": "case",
				"caseName": "Vardy v Rooney",
				"creators": [
					{
						"lastName": "THE HON. MR JUSTICE WARBY",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"dateDecided": "2020-11-20",
				"court": "EWHC-QBD",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "Neutral Citation Number: [2020] EWHC 3156 (QB)"
					}
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
