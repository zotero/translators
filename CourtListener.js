{
	"translatorID": "07890a30-866e-452a-ac3e-c19fcb39b597",
	"label": "CourtListener",
	"creator": "Sebastian Karcher",
	"target": "^https?://www\\.courtlistener\\.com",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-02-04 05:00:08"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2024 Sebastian Karcher

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
	if (url.includes('/opinion/')) {
		return 'case';
	}
	else if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('article > h3 > a');
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(row.textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

async function doWeb(doc, url) {
	if (detectWeb(doc, url) == 'multiple') {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (!items) return;
		for (let url of Object.keys(items)) {
			await scrape(await requestDocument(url));
		}
	}
	else {
		await scrape(doc);
	}
}

async function scrape(doc, url = doc.location.href) {
	var item = new Zotero.Item('case');
	let citeString = text(doc, 'h2');
	
	let title = citeString.match(/^(.+?),\s\d+/);
	item.caseName = title ? title[1] : citation;
	item.court = text(doc, 'article h3');
	item.reporter = text(doc, '.citation .reporter');
	item.reporterVolume = text(doc, '.citation .volume');
	item.firstPage = text(doc, '.citation .page');
	let citation = text(doc, 'center b .citation');
	if (!item.reporter && !item.reporterVolume) {
		// the reporter elements aren't always tagged. We might have to parse them
		// the best version is in the top of the opinion (we always want that for history matching,
		// so getting that outside the conditional

		// if that's not there, we're parsing from the title of the case
		if (!citation) {
			citation = citeString.match(/^.+?,\s(\d+.+)/)[1].replace(/\(.+?\)$/, "");
		}
		let citeExpr = citation.trim().match(/^(\d+)\s((?:[A-Z][a-z]?\.\s?)+(?:[2-3]d)?(?:Supp\.)?)\s(\d{1,4})(,|$)/);
		if (citeExpr) {
			item.reporterVolume = citeExpr[1];
			item.reporter = citeExpr[2];
			item.firstPage = citeExpr[3];
		}
		else {
			// if we can't match the reporter elements properly, just write the whole thing to citation.
			item.history = citation;
		}
	}

	if (!item.history) {
		// if we haven't already written case history, write the part that's not already included in the citation
		// there are often stray spaces in either citation, so we need to check for the version without it.
		let caseHistory = ZU.xpathText(doc, '//span[@class="meta-data-header" and contains(text(), "Citations:")]/following-sibling::span');
		// Z.debug(caseHistory);
		if (caseHistory.replace(/\s/g, "").startsWith(citation.replace(/\s/g, ""))
		&& !(caseHistory.replace(/\s/g, "") == citation.replace(/\s/g, ""))) {
			item.history = caseHistory.trim().replace(/^.+?,/, "");
		}
	}
	
	// no good selctor for date, author, and docket number, so
	let date = ZU.xpathText(doc, '//span[@class="meta-data-header" and contains(text(), "Filed:")]/following-sibling::span');
	item.dateDecided = date ? date.trim() : "";
	let docket = ZU.xpathText(doc, '//span[@class="meta-data-header" and contains(text(), "Docket Number:")]/following-sibling::span');
	item.docketNumber = docket ? docket.trim() : "";
	let authors = ZU.xpath(doc, '//span[@class="meta-data-header" and contains(text(), "Author:")]/following-sibling::span');
	for (let author of authors) {
		item.creators.push(ZU.cleanAuthor(author.textContent.trim(), "author", false));
	}
	item.url = url.replace(/\/\?.*/, "");
	item.attachments.push({ document: doc, title: "Full Text" });
	item.extra = "";
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.courtlistener.com/opinion/1872757/gibson-v-bossier-city-general-hosp/?type=o&q=testing&type=o&order_by=score%20desc&stat_Precedential=on",
		"items": [
			{
				"itemType": "case",
				"caseName": "Gibson v. Bossier City General Hosp.",
				"creators": [],
				"dateDecided": "November 26th, 1991",
				"court": "Louisiana Court of Appeal",
				"docketNumber": "22693-CA, 23002-CA",
				"firstPage": "1332",
				"reporter": "So.2d",
				"reporterVolume": "594",
				"url": "https://www.courtlistener.com/opinion/1872757/gibson-v-bossier-city-general-hosp",
				"attachments": [
					{
						"title": "Full Text",
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
		"url": "https://www.courtlistener.com/opinion/1611405/blackwell-v-power-test-corp/?type=o&type=o&q=testing&order_by=score+desc&stat_Precedential=on&page=3",
		"items": [
			{
				"itemType": "case",
				"caseName": "Blackwell v. Power Test Corp.",
				"creators": [
					{
						"firstName": "Henry Curtis",
						"lastName": "Meanor",
						"creatorType": "author"
					}
				],
				"dateDecided": "August 19th, 1981",
				"court": "District Court, D. New Jersey",
				"docketNumber": "Civ. A. 80-2227",
				"firstPage": "802",
				"reporter": "F.Supp.",
				"reporterVolume": "540",
				"url": "https://www.courtlistener.com/opinion/1611405/blackwell-v-power-test-corp",
				"attachments": [
					{
						"title": "Full Text",
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
		"url": "https://www.courtlistener.com/opinion/108284/griggs-v-duke-power-co/?q=testing",
		"items": [
			{
				"itemType": "case",
				"caseName": "Griggs v. Duke Power Co.",
				"creators": [
					{
						"firstName": "Warren Earl",
						"lastName": "Burger",
						"creatorType": "author"
					}
				],
				"dateDecided": "March 8th, 1971",
				"court": "Supreme Court of the United States",
				"docketNumber": "124",
				"firstPage": "424",
				"history": "91 S. Ct. 849, 28 L. Ed. 2d 158, 1971 U.S. LEXIS 134",
				"reporter": "U.S.",
				"reporterVolume": "401",
				"url": "https://www.courtlistener.com/opinion/108284/griggs-v-duke-power-co",
				"attachments": [
					{
						"title": "Full Text",
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
		"url": "https://www.courtlistener.com/?q=testing",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.courtlistener.com/opinion/3959231/state-v-martin/?q=State%20v.%20Martin&type=o&order_by=score%20desc&stat_Precedential=on",
		"items": [
			{
				"itemType": "case",
				"caseName": "State v. Martin",
				"creators": [
					{
						"firstName": "Robert L.",
						"lastName": "Black",
						"creatorType": "author"
					}
				],
				"dateDecided": "February 9th, 1983",
				"court": "Ohio Court of Appeals",
				"docketNumber": "C-820238",
				"firstPage": "717",
				"history": "20 Ohio App. 3d 172",
				"reporter": "N.E.2d",
				"reporterVolume": "485",
				"url": "https://www.courtlistener.com/opinion/3959231/state-v-martin",
				"attachments": [
					{
						"title": "Full Text",
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
