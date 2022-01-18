{
	"translatorID": "20d5254c-edfb-4728-94be-67828cdfeee3",
	"label": "IETF",
	"creator": "Abe Jellinek",
	"target": "^https?://(datatracker\\.ietf\\.org/|www\\.ietf\\.org/archive/id/|tools\\.ietf\\.org/pdf/|www\\.rfc-editor\\.org/)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-01-14 12:11:37"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2021 Abe Jellinek
	
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


const slugRe = /\/(?:rfc|pdf|id|doc|info)(?:\/html)?\/([^/.]+)/;

function detectWeb(doc, url) {
	if (getSearchResults(doc, true)) {
		return "multiple";
	}
	else if (slugRe.test(url)) {
		return "report";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('td.doc');
	for (let row of rows) {
		let href = attr(row, 'a', 'href');
		let title = ZU.trimInternal(text(row, 'b'));
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (items) ZU.processDocuments(Object.keys(items), scrape);
		});
	}
	else {
		let slug = url.match(slugRe);
		if (slug) {
			slug = slug[1];
			let dataTrackerURL = `https://datatracker.ietf.org/doc/${slug}`;
			if (dataTrackerURL != url && dataTrackerURL != url + '/') {
				Z.debug(`Not on datatracker page; fetching ${dataTrackerURL}`);
				ZU.processDocuments(dataTrackerURL,
					(doc, url) => scrape(doc, url, dataTrackerURL));
				return;
			}
		}
		scrape(doc, url);
	}
}

function scrape(doc, url, originalURL) {
	let bibURL = attr(doc, '.meta-info a[href*="/bibtex"], .meta a[href*="/bibtex"]',
		'href');
	if (!bibURL) {
		// this is probably a draft with a weird versioned URL that doesn't
		// resolve right. so we'll reformat the version and try again.
		let strippedOriginalURL = originalURL.replace(/-?(\d+)$/, '/$1');
		if (strippedOriginalURL != originalURL) {
			Z.debug(`Versioned URL resolved incorrectly; trying ${strippedOriginalURL}`);
			ZU.processDocuments(strippedOriginalURL,
				(doc, url) => scrape(doc, url, strippedOriginalURL));
			return;
		}
	}
	
	if (bibURL.startsWith('/')) {
		// relative URL resolution doesn't currently work right when inside a
		// cross-domain processDocuments callback, so we'll do it manually
		bibURL = 'https://datatracker.ietf.org' + bibURL;
	}
	Z.debug(`Fetching BibTeX from ${bibURL}`);
	ZU.doGet(bibURL, function (respText) {
		// make sure the BibTeX translator understands that it's a report...
		// weird stuff with the reportNumber happens otherwise.
		respText = respText.replace(/^\s*@[^{]+/m, '@report');
		
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("9cb70025-a888-4a29-a210-93ec52da40d4");
		translator.setString(respText);
		translator.setHandler("itemDone", function (obj, item) {
			item.institution = 'Internet Engineering Task Force';
			item.reportType = item.series;
			if (item.type || item.reportType) {
				item.reportType = (item.type || item.reportType)
					.replace(/-/g, ' ');
				delete item.type; // not sure what that's about
				
				if (item.reportType == 'Request for Comments'
					&& item.reportNumber
					&& !item.reportNumber.includes('RFC')) {
					// by convention
					item.reportNumber = `RFC ${item.reportNumber}`;
				}
			}
			delete item.series;
			delete item.publisher;
			delete item.backupPublisher;
			delete item.extra;
			
			item.url = url.replace(/[?#].*/, '');

			let pdfURL = attr(doc, '.meta a[href$=".pdf"], .meta a[href*="/doc/pdf"]', 'href');
			if (pdfURL) {
				item.attachments.push({
					title: 'Full Text PDF',
					mimeType: 'application/pdf',
					url: pdfURL
				});
			}

			for (let creator of item.creators) {
				if (creator.firstName) {
					creator.firstName = creator.firstName.replace(/Dr\.?\s*/i, '');
				}
			}

			item.complete();
		});
		translator.translate();
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://datatracker.ietf.org/doc/html/rfc1737",
		"items": [
			{
				"itemType": "report",
				"title": "Functional Requirements for Uniform Resource Names",
				"creators": [
					{
						"firstName": "Larry M.",
						"lastName": "Masinter",
						"creatorType": "author"
					},
					{
						"firstName": "Karen R.",
						"lastName": "Sollins",
						"creatorType": "author"
					}
				],
				"date": "1994-12",
				"abstractNote": "This document specifies a minimum set of requirements for a kind of Internet resource identifier known as Uniform Resource Names (URNs). This memo provides information for the Internet community. This memo does not specify an Internet standard of any kind.",
				"institution": "Internet Engineering Task Force",
				"itemID": "rfc1737",
				"libraryCatalog": "IETF",
				"reportNumber": "RFC 1737",
				"reportType": "Request for Comments",
				"url": "https://datatracker.ietf.org/doc/rfc1737/",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
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
		"url": "https://datatracker.ietf.org/doc/rfc8869/",
		"items": [
			{
				"itemType": "report",
				"title": "Evaluation Test Cases for Interactive Real-Time Media over Wireless Networks",
				"creators": [
					{
						"firstName": "Zaheduzzaman",
						"lastName": "Sarker",
						"creatorType": "author"
					},
					{
						"firstName": "Xiaoqing",
						"lastName": "Zhu",
						"creatorType": "author"
					},
					{
						"firstName": "Jian",
						"lastName": "Fu",
						"creatorType": "author"
					}
				],
				"date": "2021-01",
				"abstractNote": "The Real-time Transport Protocol (RTP) is a common transport choice for interactive multimedia communication applications. The performance of these applications typically depends on a well-functioning congestion control algorithm. To ensure a seamless and robust user experience, a well-designed RTP-based congestion control algorithm should work well across all access network types. This document describes test cases for evaluating performances of candidate congestion control algorithms over cellular and Wi-Fi networks.",
				"institution": "Internet Engineering Task Force",
				"itemID": "rfc8869",
				"libraryCatalog": "IETF",
				"reportNumber": "RFC 8869",
				"reportType": "Request for Comments",
				"url": "https://datatracker.ietf.org/doc/rfc8869/",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
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
		"url": "https://datatracker.ietf.org/doc/html/draft-ietf-bmwg-evpntest-09",
		"items": [
			{
				"itemType": "report",
				"title": "Benchmarking Methodology for EVPN and PBB-EVPN",
				"creators": [
					{
						"firstName": "sudhin",
						"lastName": "jacob",
						"creatorType": "author"
					},
					{
						"firstName": "Kishore",
						"lastName": "Tiruveedhula",
						"creatorType": "author"
					}
				],
				"date": "2021-06-18",
				"abstractNote": "This document defines methodologies for benchmarking EVPN and PBB- EVPN performance. EVPN is defined in RFC 7432, and is being deployed in Service Provider networks. Specifically, this document defines the methodologies for benchmarking EVPN/PBB-EVPN convergence, data plane performance, and control plane performance.",
				"institution": "Internet Engineering Task Force",
				"itemID": "ietf-bmwg-evpntest-09",
				"libraryCatalog": "IETF",
				"reportNumber": "draft-ietf-bmwg-evpntest-09",
				"reportType": "Internet Draft",
				"url": "https://datatracker.ietf.org/doc/draft-ietf-bmwg-evpntest/09/",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "<p>Work in Progress</p>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://datatracker.ietf.org/doc/draft-ietf-bmwg-evpntest/09/bibtex/",
		"items": [
			{
				"itemType": "report",
				"title": "Benchmarking Methodology for EVPN and PBB-EVPN",
				"creators": [
					{
						"firstName": "sudhin",
						"lastName": "jacob",
						"creatorType": "author"
					},
					{
						"firstName": "Kishore",
						"lastName": "Tiruveedhula",
						"creatorType": "author"
					}
				],
				"date": "2021-06-18",
				"abstractNote": "This document defines methodologies for benchmarking EVPN and PBB- EVPN performance. EVPN is defined in RFC 7432, and is being deployed in Service Provider networks. Specifically, this document defines the methodologies for benchmarking EVPN/PBB-EVPN convergence, data plane performance, and control plane performance.",
				"institution": "Internet Engineering Task Force",
				"itemID": "ietf-bmwg-evpntest-09",
				"libraryCatalog": "IETF",
				"reportNumber": "draft-ietf-bmwg-evpntest-09",
				"reportType": "Internet Draft",
				"url": "https://datatracker.ietf.org/doc/draft-ietf-bmwg-evpntest/",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "<p>Work in Progress</p>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.rfc-editor.org/rfc/rfc1691.html",
		"items": [
			{
				"itemType": "report",
				"title": "The Document Architecture for the Cornell Digital Library",
				"creators": [
					{
						"firstName": "William",
						"lastName": "Turner",
						"creatorType": "author"
					}
				],
				"date": "1994-08",
				"abstractNote": "This memo defines an architecture for the storage and retrieval of the digital representations for books, journals, photographic images, etc., which are collected in a large organized digital library. This memo provides information for the Internet community. This memo does not specify an Internet standard of any kind.",
				"institution": "Internet Engineering Task Force",
				"itemID": "rfc1691",
				"libraryCatalog": "IETF",
				"reportNumber": "RFC 1691",
				"reportType": "Request for Comments",
				"url": "https://datatracker.ietf.org/doc/rfc1691/",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
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
		"url": "https://www.ietf.org/archive/id/draft-ietf-rift-rift-13.txt",
		"items": [
			{
				"itemType": "report",
				"title": "RIFT: Routing in Fat Trees",
				"creators": [
					{
						"firstName": "Alankar",
						"lastName": "Sharma",
						"creatorType": "author"
					},
					{
						"firstName": "Pascal",
						"lastName": "Thubert",
						"creatorType": "author"
					},
					{
						"firstName": "Bruno",
						"lastName": "Rijsman",
						"creatorType": "author"
					},
					{
						"firstName": "Dmitry",
						"lastName": "Afanasiev",
						"creatorType": "author"
					}
				],
				"abstractNote": "This document defines a specialized, dynamic routing protocol for Clos and fat-tree network topologies optimized towards minimization of control plane state as well as configuration and operational complexity.",
				"institution": "Internet Engineering Task Force",
				"itemID": "ietf-rift-rift-13",
				"libraryCatalog": "IETF",
				"reportNumber": "draft-ietf-rift-rift-13",
				"reportType": "Internet Draft",
				"shortTitle": "RIFT",
				"url": "https://datatracker.ietf.org/doc/draft-ietf-rift-rift/13/",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "<p>Work in Progress</p>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://datatracker.ietf.org/doc/search/?name=tree&activedrafts=on&rfcs=on",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.rfc-editor.org/info/rfc616",
		"items": [
			{
				"itemType": "report",
				"title": "LATEST NETWORK MAPS",
				"creators": [],
				"date": "1973-02",
				"institution": "Internet Engineering Task Force",
				"itemID": "rfc616",
				"libraryCatalog": "IETF",
				"reportNumber": "RFC 616",
				"reportType": "Request for Comments",
				"url": "https://datatracker.ietf.org/doc/rfc616/",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
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
