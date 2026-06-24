{
	"translatorID": "f22fa4c7-b2fd-4cf4-aac9-8fc2d9c154a4",
	"label": "Linked Metadata",
	"creator": "Dan Stillman",
	"target": "",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 299,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2020-04-11 20:26:55"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2020 Dan Stillman
	
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

const MAX_REQUESTS = 4;

// Content types we always check
var always = new Set([
	"application/marc",
	"application/marcxml+xml",
	"application/mods+xml",
	"application/rdf+xml",
	"application/x-bibtex",
	"application/x-endnote-refer",
	"application/x-research-info-systems",
	"text/x-wiki",
	"application/vnd.citationstyles.csl+json",
]);
// Content types we check only if the title contains a string we recognize
var conditional = new Map([
	["application/json", ["csl"]],
	["application/xml", ["dc", "evernote", "marc", "mods", "tei"]],
	["text/html", ["bookmarks", "coins"]],
	["text/plain", ["bibtex", "marc", "refworks", "ris"]],
]);
// Treat text/xml the same as application/xml
conditional.set("text/xml", conditional.get("application/xml"));

// Store items from detect
var items = null;

async function detectWeb(doc, url) {
	var numRequests = 0;
	
	var links = doc.querySelectorAll('link[rel="alternate"]');
	for (let link of links) {
		if (numRequests >= MAX_REQUESTS) {
			Zotero.debug("Too many requests -- stopping");
			break;
		}
		
		let type = link.getAttribute('type');
		if (!type) {
			continue;
		}
		type = type.toLowerCase();
		if (!always.has(type)) {
			// For conditional types, look for certain strings in 'title'
			let titles = conditional.get(type);
			if (!titles) {
				continue;
			}
			let title = link.getAttribute('title');
			if (!title) {
				continue;
			}
			title = title.toLowerCase();
			if (!titles.some(x => title.includes(x))) {
				Zotero.debug(`Found ${type} link but '${title}' didn't match possible titles`);
				continue;
			}
		}
		
		let href = link.getAttribute('href');
		if (!href) {
			continue;
		}
		// Resolve protocol-relative URL
		if (href.startsWith('//')) {
			href = url.match(/https?:\/\//)[0] + href;
		}
		// Resolve relative URL
		else if (href.startsWith('/')) {
			href = url.match(/https?:\/\/[^/]+/)[0] + href;
		}
		
		try {
			numRequests++;
			
			Zotero.debug("Trying " + type + " link");
			// TODO: Replace with new async method, once we decide what that should be
			let req = await Zotero.Utilities.HTTP.request("GET", href); // eslint-disable-line no-await-in-loop
			let result = await new Promise((resolve) => { // eslint-disable-line no-await-in-loop, no-loop-func
				let t = Zotero.loadTranslator("import");
				t.setHandler("translators", async function (obj, translators) {
					if (translators.length) {
						t.setTranslator(translators[0].translatorID);
						// Ignore translated items, since we're just detecting
						t.setHandler("itemDone", () => {});
						items = await t.translate();
						if (items.length > 1) {
							resolve("multiple");
							return;
						}
						else if (items.length == 1) {
							resolve(items[0].itemType);
							return;
						}
					}
					resolve(false);
				});
				t.setString(req.responseText);
				t.getTranslators();
			});
			if (result) {
				return result;
			}
		}
		catch (e) {
			Zotero.debug(e);
		}
	}
	
	return false;
}

async function doWeb(doc, url) {
	// In some environments, detectWeb() might not have been run or the state might not have been
	// saved
	if (!items) {
		await detectWeb(doc, url);
		
		// Error running detection
		if (!items) {
			return;
		}
	}
	
	if (items.length > 1) {
		let itemsObj = {};
		let i = 0;
		items.forEach(item => itemsObj[i++] = item.title);
		Zotero.selectItems(itemsObj, function (selectedItems) {
			if (selectedItems) {
				for (let i in selectedItems) {
					let item = items[parseInt(i)];
					item.libraryCatalog = doc.location.host;
					item.complete();
				}
			}
		});
	}
	else {
		items[0].libraryCatalog = doc.location.host;
		items[0].complete();
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://search.library.wisc.edu/catalog/9910065379202121",
		"items": [
			{
				"itemType": "audioRecording",
				"title": "Oktett für vier Violinen, zwei Violen und zwei Violoncelli, op. 20 : Arrangement für Klavier zu vier Händen",
				"creators": [
					{
						"lastName": "Mendelssohn-Bartholdy",
						"firstName": "Felix, 1809-1847",
						"creatorType": "composer"
					}
				],
				"date": "2004",
				"abstractNote": "1 score (xvii, 101 pages) : facsimiles ; 31 cm",
				"callNumber": "M3 M236 1997 Ser.3 v.5a",
				"label": "Wiesbaden : Breitkopf & Härtel, 2004.",
				"libraryCatalog": "search.library.wisc.edu",
				"shortTitle": "Oktett für vier Violinen, zwei Violen und zwei Violoncelli, op. 20",
				"url": "https://search.library.wisc.edu/catalog/9910065379202121",
				"attachments": [],
				"tags": [],
				"notes": [
					{
						"note": "<p>Arrangement by the composer.;&quot;Herausgegeben von der Sächsischen Akademie der Wissenschaften zu Leipzig.&quot;--Series t.p.;Added t.p. in English.;Introd. in German with English translation; critical commentary in German on p. 95-101.;Includes bibliographical references.</p>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://purl.stanford.edu/fv751yt5934",
		"items": [
			{
				"itemType": "report",
				"title": "Evaluating Information: The Cornerstone of Civic Online Reasoning",
				"creators": [
					{
						"firstName": "Sam",
						"lastName": "Wineburg",
						"creatorType": "author"
					},
					{
						"firstName": "Sarah",
						"lastName": "McGrew",
						"creatorType": "author"
					},
					{
						"firstName": "Joel",
						"lastName": "Breakstone",
						"creatorType": "author"
					},
					{
						"firstName": "Teresa",
						"lastName": "Ortega",
						"creatorType": "author"
					}
				],
				"date": "2016-11-22",
				"abstractNote": "Over the last year and a half, the Stanford History Education Group has prototyped, field\r\ntested, and validated a bank of assessments that tap civic online reasoning—the ability to\r\njudge the credibility of information that floods young people’s smartphones, tablets, and\r\ncomputers.\r\n\r\nBetween January 2015 and June 2016, we administered 56 tasks to students across 12\r\nstates. In total, we collected and analyzed 7,804 student responses. Our sites for field testing\r\nincluded under-resourced, inner-city schools in Los Angeles and well-resourced\r\nschools in suburbs outside of Minneapolis. Our college assessments, which focused on\r\nopen web searches, were administered online at six diferent universities that ranged from\r\nStanford, an institution that rejects 94% of its applicants, to large state universities that\r\nadmit the majority of students who apply.\r\n\r\nIn what follows, we provide an overview of what we learned and sketch paths our\r\nfuture work might take. We end by providing samples of our assessments of civic online\r\nreasoning.",
				"libraryCatalog": "purl.stanford.edu",
				"rights": "User agrees that, where applicable, content will not be used to identify or to otherwise infringe the privacy or confidentiality rights of individuals. Content distributed via the Stanford Digital Repository may be subject to additional license and use restrictions applied by the depositor., CC by-nc-nd: CC BY-NC-ND Attribution-NonCommercial-NoDerivs",
				"shortTitle": "Evaluating Information",
				"attachments": [],
				"tags": [
					{
						"tag": "assessment"
					},
					{
						"tag": "civic online reasoning"
					},
					{
						"tag": "inquiry"
					},
					{
						"tag": "media literacy"
					}
				],
				"notes": [
					{
						"note": "preferred citation: Wineburg, Sam and McGrew, Sarah and Breakstone, Joel and Ortega, Teresa. (2016). Evaluating Information: The Cornerstone of Civic Online Reasoning. Stanford Digital Repository. Available at: http://purl.stanford.edu/fv751yt5934"
					},
					{
						"note": "citation/reference: "
					},
					{
						"note": "contact: teortega@stanford.edu"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://clio.columbia.edu/catalog/1815901",
		"items": [
			{
				"itemType": "book",
				"title": "Mannheim: Geschichte, Kunst und Kultur der freundlichen und lebendigen Stadt an Rhein und Neckar",
				"creators": [
					{
						"firstName": "Berthold",
						"lastName": "Roland",
						"creatorType": "author"
					}
				],
				"date": "1966",
				"callNumber": "943M31 R64",
				"extra": "OCLC: ocm11808835",
				"libraryCatalog": "clio.columbia.edu",
				"numPages": "120",
				"place": "Amorbach",
				"publisher": "Emig",
				"shortTitle": "Mannheim",
				"attachments": [],
				"tags": [
					{
						"tag": "History"
					},
					{
						"tag": "Mannheim (Germany)"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://catalog.lib.unc.edu/catalog/UNCb8145243",
		"items": [
			{
				"itemType": "book",
				"title": "Global warming : reduction",
				"creators": [
					{
						"lastName": "Gombatz",
						"firstName": "Erika Gasper",
						"creatorType": "author"
					}
				],
				"date": "2008",
				"language": "English",
				"libraryCatalog": "catalog.lib.unc.edu",
				"place": "San Diego, Calif.",
				"publisher": "San Diego, Calif. : Classroom Complete Press, 2008.",
				"shortTitle": "Global warming",
				"url": "https://catalog.lib.unc.edu/catalog/UNCb8145243",
				"attachments": [
					{
						"title": "Full Text (HTML)",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Global warming -- Study and teaching"
					}
				],
				"notes": [
					{
						"note": "<p>For grade(s): 3-4.</p>"
					},
					{
						"note": "<p>For grade(s): 5-8.</p>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://catalyst.library.jhu.edu/catalog/bib_647397",
		"items": [
			{
				"itemType": "book",
				"title": "The language of the Inka since the European invasion",
				"creators": [
					{
						"firstName": "Bruce",
						"lastName": "Mannheim",
						"creatorType": "author"
					}
				],
				"date": "1991",
				"ISBN": "9780292746633",
				"callNumber": "PM602 .M36 1991",
				"edition": "1st ed",
				"libraryCatalog": "catalyst.library.jhu.edu",
				"numPages": "326",
				"place": "Austin",
				"publisher": "University of Texas Press",
				"series": "Texas linguistics series",
				"attachments": [],
				"tags": [
					{
						"tag": "Conquest, 1522-1548"
					},
					{
						"tag": "History"
					},
					{
						"tag": "History"
					},
					{
						"tag": "History"
					},
					{
						"tag": "Incas"
					},
					{
						"tag": "Languages"
					},
					{
						"tag": "Peru"
					},
					{
						"tag": "Peru"
					},
					{
						"tag": "Peru"
					},
					{
						"tag": "Quechua language"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
