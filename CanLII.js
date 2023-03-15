{
	"translatorID": "84799379-7bc5-4e55-9817-baf297d129fe",
	"label": "CanLII",
	"creator": "Sebastian Karcher",
	"target": "^https?://(www\\.)?canlii\\.org/(en|fr)/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-03-15 04:11:17"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2012 Sebastian Karcher
	
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

const isCanLIIurl = (url) => /https?:\/\/(?:www\.)?canlii\.org[^/]*\/(?:en|fr)\/[^/]+\/[^/]+\/doc\/.+/.test(url);

const detectWeb = (doc, url) =>
	isCanLIIurl(url) ? 'case'
	: [...doc.getElementsByTagName('a')].some(el => isCanLIIurl(el.href)) ? 'multiple'
	: false;

const scrape = (doc, url) => {
	const newItem = new Zotero.Item("case");
	const documentMeta = doc.querySelector('#documentMeta');

	// e.g. Reference re Secession of Quebec, 1998 CanLII 793 (SCC), [1998] 2 SCR 217, <http://canlii.ca/t/1fqr3>, retrieved on 2019-11-25
	const voliss = ZU.trimInternal(text('.documentMeta-citation + div:not(script)'));
	newItem.caseName = voliss.split(',')[0];
	const reporterMatch = voliss.match(/\[\d\d\d\d\]\s+(\d+)\s+([A-Z]+)\s+(\d+)/);
	if (reporterMatch) {
		newItem.reporterVolume = reporterMatch[1];
		newItem.reporter = reporterMatch[2];
		newItem.firstPage = reporterMatch[3];
	};

	const court = text('#breadcrumbs span.nowrap', 2);
	if (court) {
		newItem.court = court;
	};

	newItem.dateDecided = ZU.xpathText(documentMeta, '//div[contains(text(), "Date")]/following-sibling::div');
	newItem.docketNumber = ZU.xpathText(documentMeta, '//div[contains(text(), "File number") or contains(text(), "Numéro de dossier")]/following-sibling::div');
	const otherCitations = ZU.xpathText(documentMeta, '//div[contains(text(), "Other citations") or contains(text(), "Autres citations")]/following-sibling::div');
	if (otherCitations) {
		newItem.notes.push({ note: "Other Citations: " + ZU.trimInternal(otherCitations) });
	};

	const shortURL = text('.documentStaticUrl');
	if (shortURL) {
		newItem.url = shortURL.trim();
	};

	// attach link to pdf version
	newItem.attachments.push({
		url: url.replace(/\.html(?:[?#].*)?/, ".pdf"),
		title: "CanLII Full Text PDF",
		mimeType: "application/pdf"
	});
	newItem.attachments.push({
		document: doc,
		title: "CanLII Snapshot"
	});

	newItem.complete();
}

const doWeb = async (doc, url) => {
	if (detectWeb(doc, url) == 'multiple') {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (!items) return;
		for (let url of Object.keys(items)) {
			await scrape(await requestDocument(url));
		}
	}
	else {
		await scrape(doc, url);
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.canlii.org/en/ca/scc/doc/2010/2010scc2/2010scc2.html",
		"items": [
			{
				"itemType": "case",
				"caseName": "MiningWatch Canada v. Canada (Fisheries and Oceans)",
				"creators": [],
				"dateDecided": "2010-01-21",
				"court": "Supreme Court of Canada",
				"docketNumber": "32797",
				"firstPage": "6",
				"reporter": "SCR",
				"reporterVolume": "1",
				"url": "https://canlii.ca/t/27jmr",
				"attachments": [
					{
						"title": "CanLII Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "CanLII Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "Other Citations: [2010] ACS no 2 — [2010] SCJ No 2 (QL) — 99 Admin LR (4th) 1 — 315 DLR (4th) 434 — 397 NR 232"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.canlii.org/en/ca/fct/doc/2011/2011fc119/2011fc119.html?searchUrlHash=AAAAAQAjU3V0dGllIHYuIENhbmFkYSAoQXR0b3JuZXkgR2VuZXJhbCkAAAAAAQ",
		"items": [
			{
				"itemType": "case",
				"caseName": "Suttie v. Canada (Attorney General)",
				"creators": [],
				"dateDecided": "2011-02-02",
				"court": "Federal Court",
				"docketNumber": "T-1089-10",
				"url": "https://canlii.ca/t/2flrk",
				"attachments": [
					{
						"title": "CanLII Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "CanLII Snapshot",
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
		"url": "https://www.canlii.org/fr/ca/csc/doc/2010/2010csc2/2010csc2.html",
		"items": [
			{
				"itemType": "case",
				"caseName": "Mines Alerte Canada c. Canada (Pêches et Océans)",
				"creators": [],
				"dateDecided": "2010-01-21",
				"court": "Cour suprême du Canada",
				"docketNumber": "32797",
				"firstPage": "6",
				"reporter": "RCS",
				"reporterVolume": "1",
				"url": "https://canlii.ca/t/27jms",
				"attachments": [
					{
						"title": "CanLII Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "CanLII Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "Other Citations: [2010] ACS no 2 — [2010] SCJ No 2 (QL) — 99 Admin LR (4th) 1 — 315 DLR (4th) 434 — 397 NR 232"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.canlii.org/fr/ca/cfpi/doc/2011/2011cf119/2011cf119.html?searchUrlHash=AAAAAQAjU3V0dGllIHYuIENhbmFkYSAoQXR0b3JuZXkgR2VuZXJhbCkAAAAAAQ",
		"items": [
			{
				"itemType": "case",
				"caseName": "Suttie c. Canada (Procureur Général)",
				"creators": [],
				"dateDecided": "2011-02-02",
				"court": "Cour fédérale",
				"docketNumber": "T-1089-10",
				"url": "https://canlii.ca/t/fks9z",
				"attachments": [
					{
						"title": "CanLII Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "CanLII Snapshot",
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
		"url": "https://www.canlii.org/en/ca/scc/doc/2010/2010scc2/2010scc2.html",
		"items": [
			{
				"itemType": "case",
				"caseName": "MiningWatch Canada v. Canada (Fisheries and Oceans)",
				"creators": [],
				"dateDecided": "2010-01-21",
				"court": "Supreme Court of Canada",
				"docketNumber": "32797",
				"firstPage": "6",
				"reporter": "SCR",
				"reporterVolume": "1",
				"url": "https://canlii.ca/t/27jmr",
				"attachments": [
					{
						"title": "CanLII Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "CanLII Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "Other Citations: [2010] ACS no 2 — [2010] SCJ No 2 (QL) — 99 Admin LR (4th) 1 — 315 DLR (4th) 434 — 397 NR 232"
					}
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
