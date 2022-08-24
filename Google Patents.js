{
	"translatorID": "d71e9b6d-2baa-44ed-acb4-13fe2fe592c0",
	"label": "Google Patents",
	"creator": "Philipp Zumstein",
	"target": "^https?://(www\\.)?patents\\.google\\.com/",
	"minVersion": "4.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-07-05 17:15:19"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2018 Philipp Zumstein
	
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
	// The subtree changes from multiple search results to a single result
	// when clicking on one entry or back to the search results, and thus
	// we have to monitor this.
	Z.monitorDOMChanges(ZU.xpath(doc, '//search-app')[0]);

	// Plural with "s" vs. singular without
	if (ZU.xpathText(doc, '//search-app/search-results')) {
		return "multiple";
	}
	if (ZU.xpathText(doc, '//search-app/search-result')
		|| doc.querySelector('meta[name^="citation_patent_"]')) {
		return "patent";
	}
	return false;
}


function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		var urlParts = url.split('/?');
		var jsonUrl = urlParts[0] + '/xhr/query?url=' + encodeURIComponent(urlParts[1]);
		// Z.debug(jsonUrl);
		ZU.doGet(jsonUrl, function (text) {
			var json = JSON.parse(text);
			var results = json.results.cluster[0].result;
			var selectResults = {};
			for (let i = 0; i < results.length; i++) {
				selectResults[i] = ZU.cleanTags(results[i].patent.title);
			}
			Zotero.selectItems(selectResults, function (items) {
				if (!items) return;
				for (var i in items) {
					let resultUrl = urlParts[0] + '/patent/' + results[i].patent.publication_number;
					scrapeJson(results[i].patent, resultUrl);
				}
			});
		});
	}
	else {
		// Some old urls miss the language part, which we have to add before
		// calling other urls.
		var includeLanguageCode = url.match(/\/patent\/[^/?#]+\/[a-z][a-z]\b/);
		if (!includeLanguageCode) {
			url = url.replace(/(\/patent\/[^/?#]+)\b/, "$1/en");
		}
		var xhrUrl = url.replace('/patent/', '/xhr/result?id=patent/');
		ZU.doGet(xhrUrl, function (text) {
			// Z.debug(text);
			var parser = new DOMParser();
			var doc = parser.parseFromString(text, "text/html");
			scrape(doc, url);
		});
	}
}

function scrape(doc, url) {
	var metadata = doc.querySelectorAll('*[itemprop]');
	var json = {};
	for (let i = 0; i < metadata.length; i++) {
		let label = metadata[i].getAttribute('itemprop');
		// We stop before going into the publications, related entries etc.
		if (label == 'description' || label == 'pubs') break;
		let value = microdataValue(metadata[i], true);
		if (label && value) {
			if (metadata[i].getAttribute('repeat') === '') {
				if (!json[label]) json[label] = [];
				json[label].push(value);
			}
			else if (!json[label]) {
				// don't overwrite values
				json[label] = value;
				// else Z.debug(label)
			}
		}
	}
	scrapeJson(json, url, doc);
}


function microdataValue(propertyNode, firstCall) {
	if (propertyNode.hasAttribute("itemscope") && firstCall) {
		var metadata = propertyNode.querySelectorAll('*[itemprop]');
		var innerJson = {};
		for (let i = 0; i < metadata.length; i++) {
			let label = metadata[i].getAttribute('itemprop');
			let value = microdataValue(metadata[i], false);
			innerJson[label] = value;
		}
		return innerJson;
	}
	switch (propertyNode.tagName.toLowerCase()) {
		case "meta":
			return propertyNode.getAttribute("content");
		case "audio":
		case "embed":
		case "iframe":
		case "img":
		case "source":
		case "track":
		case "video":
			return propertyNode.getAttribute("src");
		case "a":
		case "area":
		case "link":
			return propertyNode.getAttribute("href");
		case "object":
			return propertyNode.getAttribute("data");
		case "data":
		case "meter":
			return propertyNode.getAttribute("value");
		case "time":
			return propertyNode.getAttribute("datetime");
		case "span":// non-standard, but can occur
			if (propertyNode.childNodes.length > 1 && propertyNode.getAttribute("content")) {
				return propertyNode.getAttribute("content");
			}
			return propertyNode.textContent;
		default:
			return propertyNode.textContent;
	}
}


function scrapeJson(json, url, doc) {
	// Z.debug(json);
	var item = new Zotero.Item('patent');
	item.title = ZU.cleanTags(json.title).replace(/\.\s*$/, '');
	if (json.inventor) {
		if (typeof json.inventor === 'string') json.inventor = [json.inventor];
		for (let i = 0; i < json.inventor.length; i++) {
			item.creators.push(ZU.cleanAuthor(json.inventor[i], 'inventor'));
		}
	}
	item.issueDate = json.publicationDate || json.publication_date;
	item.filingDate = json.filingDate || json.filing_date;
	item.patentNumber = json.publicationNumber || json.publication_number;
	if (json.assigneeOriginal && !(typeof json.assigneeOriginal === 'string')) {
		item.assignee = json.assigneeOriginal.join(', '); // or assigneeCurrent
	}
	else {
		item.assignee = json.assigneeOriginal || json.assignee;
	}
	item.applicationNumber = (json.applicationNumber || '').replace(/[/,]/g, '');
	// This status is sometimes not what would be expected
	// if (json.legalStatusIfi) item.legalStatus = json.legalStatusIfi.status;
	item.country = json.countryCode;
	if (item.country) item.issuingAuthority = getPatentOffice(item.country);
	item.language = json.primaryLanguage;
	
	// Keywords
	if (json.priorArtKeywords) {
		for (let i = 0; i < json.priorArtKeywords.length; i++) {
			item.tags.push(json.priorArtKeywords[i]);
		}
	}
	
	// Abstract
	if (json.abstract) {
		item.abstractNote = json.abstract.content;
	}
	else if (doc) {
		item.abstractNote = attr(doc, 'meta[name="description"]', 'content');
	}
	
	// Classifications
	if (json.cpcs) {
		var classifications = [];
		for (let i = 0; i < json.cpcs.length; i++) {
			if (json.cpcs[i].Leaf && !json.cpcs[i].cpcs) {
				classifications.push(json.cpcs[i].Code + ': ' + json.cpcs[i].Description);
			}
		}
		if (classifications.length > 0) {
			item.notes.push({ note: "<h2>Classifications</h2>\n" + classifications.join("<br/>\n") });
		}
	}
	
	item.url = url;
	let pdfurl = json.pdfLink || json.pdf;
	if (pdfurl) {
		// Relative links don't resolve correctly in all cases. Let's make sure we're getting this all from
		// the right place on the google API
		if (!pdfurl.includes("https://")) {
			pdfurl = "https://patentimages.storage.googleapis.com/" + pdfurl;
		}
		// Z.debug(pdfurl);
		item.attachments.push({
			url: pdfurl,
			title: "Full Text PDF",
			mimeType: "application/pdf"
		});
	}
	
	item.complete();
}


function getPatentOffice(number) {
	// get the PatentOffice from the first two letters of the patentNumber
	var country;
	if (number.indexOf('EP') === 0) {
		country = 'European Union';
	}
	else if (number.indexOf('US') === 0) {
		country = 'United States';
	}
	else if (number.indexOf('WO') === 0) {
		country = 'World Intellectual Property Organization';
	}
	else if (number.indexOf('CN') === 0) {
		country = 'China';
	}
	else if (number.indexOf('CA') === 0) {
		country = 'Canada';
	}
	else if (number.indexOf('DE') === 0) {
		country = 'Germany';
	}
	return country;
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://patents.google.com/?q=book&oq=book",
		"defer": true,
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://patents.google.com/patent/US1065211",
		"items": [
			{
				"itemType": "patent",
				"title": "Bottle-stopper",
				"creators": [
					{
						"firstName": "William T.",
						"lastName": "Brook",
						"creatorType": "inventor"
					}
				],
				"issueDate": "1913-06-17",
				"applicationNumber": "US71306412A",
				"assignee": "William T Brook",
				"country": "US",
				"filingDate": "1912-08-03",
				"issuingAuthority": "United States",
				"patentNumber": "US1065211A",
				"url": "https://patents.google.com/patent/US1065211/en",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "bottle"
					},
					{
						"tag": "neck"
					},
					{
						"tag": "stopper"
					},
					{
						"tag": "wire"
					},
					{
						"tag": "yoke"
					}
				],
				"notes": [
					{
						"note": "<h2>Classifications</h2>\nB01L3/5021: Test tubes specially adapted for centrifugation purposes<br/>\nB65D39/04: Cup-shaped plugs or like hollow flanged members"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://patents.google.com/patent/US1120656",
		"items": [
			{
				"itemType": "patent",
				"title": "Push-pin",
				"creators": [
					{
						"firstName": "Jonathan A.",
						"lastName": "Hunt",
						"creatorType": "inventor"
					}
				],
				"issueDate": "1914-12-08",
				"applicationNumber": "US81214214A",
				"assignee": "HUNT SPECIALTY Manufacturing Co",
				"country": "US",
				"filingDate": "1914-01-14",
				"issuingAuthority": "United States",
				"patentNumber": "US1120656A",
				"url": "https://patents.google.com/patent/US1120656/en",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "extending"
					},
					{
						"tag": "head"
					},
					{
						"tag": "hollow"
					},
					{
						"tag": "pin"
					},
					{
						"tag": "push"
					}
				],
				"notes": [
					{
						"note": "<h2>Classifications</h2>\nF16B15/00: Nails; Staples<br/>\nY10T24/4696: Pin or separate essential cooperating device therefor having distinct head structure"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://patents.google.com/patent/US7123498",
		"items": [
			{
				"itemType": "patent",
				"title": "Non-volatile memory device",
				"creators": [
					{
						"firstName": "Hisatada",
						"lastName": "Miyatake",
						"creatorType": "inventor"
					},
					{
						"firstName": "Kohki",
						"lastName": "Noda",
						"creatorType": "inventor"
					},
					{
						"firstName": "Toshio",
						"lastName": "Sunaga",
						"creatorType": "inventor"
					},
					{
						"firstName": "Hiroshi",
						"lastName": "Umezaki",
						"creatorType": "inventor"
					},
					{
						"firstName": "Hideo",
						"lastName": "Asano",
						"creatorType": "inventor"
					},
					{
						"firstName": "Koji",
						"lastName": "Kitamura",
						"creatorType": "inventor"
					}
				],
				"issueDate": "2006-10-17",
				"applicationNumber": "US10964352",
				"assignee": "International Business Machines Corp",
				"country": "US",
				"filingDate": "2004-10-12",
				"issuingAuthority": "United States",
				"language": "en",
				"patentNumber": "US7123498B2",
				"url": "https://patents.google.com/patent/US7123498/en",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "magneto resistive"
					},
					{
						"tag": "memory"
					},
					{
						"tag": "memory cells"
					},
					{
						"tag": "mtj"
					},
					{
						"tag": "parallel"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://patents.google.com/patent/US4390992#v=onepage&q&f=false",
		"items": [
			{
				"itemType": "patent",
				"title": "Plasma channel optical pumping device and method",
				"creators": [
					{
						"firstName": "O'Dean P.",
						"lastName": "Judd",
						"creatorType": "inventor"
					}
				],
				"issueDate": "1983-06-28",
				"applicationNumber": "US06284151",
				"assignee": "US Department of Energy",
				"country": "US",
				"filingDate": "1981-07-17",
				"issuingAuthority": "United States",
				"patentNumber": "US4390992A",
				"url": "https://patents.google.com/patent/US4390992/en#v=onepage&q&f=false",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "electrodes"
					},
					{
						"tag": "gaseous"
					},
					{
						"tag": "laser"
					},
					{
						"tag": "lasing medium"
					},
					{
						"tag": "sub"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://patents.google.com/?q=ordinateur&oq=ordinateur",
		"defer": true,
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://patents.google.com/patent/EP1808414A1/fr?oq=water",
		"items": [
			{
				"itemType": "patent",
				"title": "Installation pour le recyclage d'eaux sanitaires",
				"creators": [
					{
						"firstName": "Michel",
						"lastName": "Billon",
						"creatorType": "inventor"
					}
				],
				"issueDate": "2007-07-18",
				"applicationNumber": "EP06447010A",
				"assignee": "Michel Billon",
				"country": "EP",
				"filingDate": "2006-01-16",
				"issuingAuthority": "European Union",
				"language": "fr",
				"patentNumber": "EP1808414A1",
				"url": "https://patents.google.com/patent/EP1808414A1/fr?oq=water",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "filter"
					},
					{
						"tag": "installation"
					},
					{
						"tag": "tank"
					},
					{
						"tag": "valve"
					},
					{
						"tag": "water"
					}
				],
				"notes": [
					{
						"note": "<h2>Classifications</h2>\nE03D5/003: Grey water flushing systems<br/>\nE03B1/04: Methods or layout of installations for water supply for domestic or like local supply<br/>\nE03B1/042: Details thereof, e.g. valves or pumps<br/>\nE03D5/006: Constructional details of cisterns for using greywater<br/>\nC02F2103/002: Grey water, e.g. from clothes washers, showers or dishwashers<br/>\nC02F2209/005: Processes using a programmable logic controller [PLC]<br/>\nC02F2209/42: Liquid level<br/>\nE03B2001/045: Greywater supply systems using household water<br/>\nE03B2001/047: Greywater supply systems using rainwater<br/>\nY02A20/108: Rainwater harvesting<br/>\nY02A20/148: Water conservation; Efficient water supply; Efficient water use using grey water using household water from wash basins or showers<br/>\nY02A20/30: Relating to industrial water supply, e.g. used for cooling"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://patents.google.com/patent/EP0011951A1/en?oq=water",
		"items": [
			{
				"itemType": "patent",
				"title": "Cold-water soluble tamarind gum, process for its preparation and its application in sizing textile warp",
				"creators": [
					{
						"firstName": "Joseph S.",
						"lastName": "Racciato",
						"creatorType": "inventor"
					}
				],
				"issueDate": "1980-06-11",
				"applicationNumber": "EP79302482A",
				"assignee": "Merck and Co Inc",
				"country": "EP",
				"filingDate": "1979-11-06",
				"issuingAuthority": "European Union",
				"language": "en",
				"patentNumber": "EP0011951A1",
				"url": "https://patents.google.com/patent/EP0011951A1/en?oq=water",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "cold"
					},
					{
						"tag": "soluble"
					},
					{
						"tag": "tamarind gum"
					},
					{
						"tag": "tkp"
					},
					{
						"tag": "water"
					}
				],
				"notes": [
					{
						"note": "<h2>Classifications</h2>\nD06M15/01: Treating fibres, threads, yarns, fabrics, or fibrous goods made from such materials, with macromolecular compounds; Such treatment combined with mechanical treatment with natural macromolecular compounds or derivatives thereof<br/>\nC08B37/0087: Glucomannans or galactomannans; Tara or tara gum, i.e. D-mannose and D-galactose units, e.g. from Cesalpinia spinosa; Tamarind gum, i.e. D-galactose, D-glucose and D-xylose units, e.g. from Tamarindus indica; Gum Arabic, i.e. L-arabinose, L-rhamnose, D-galactose and D-glucuronic acid units, e.g. from Acacia Senegal or Acacia Seyal; Derivatives thereof"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://patents.google.com/patent/US4748058",
		"items": [
			{
				"itemType": "patent",
				"title": "Artificial tree",
				"creators": [
					{
						"firstName": "Chester L. Craig",
						"lastName": "Jr",
						"creatorType": "inventor"
					}
				],
				"issueDate": "1988-05-31",
				"abstractNote": "An artificial tree assembly, and a tree constructed therefrom, are provided. The assembly comprises a collapsible three-piece pole; a base member formed by the bottom of a box for storing the tree assembly and including a pole support member secured thereto for supporting the pole; and a plurality of limb sections and interconnecting garlands. The limb-sections each comprise a central ring portion and a plurality of limb members extending radially outwardly from the central ring portions. The ring portions of the limb sections are stacked, when not in use, on the pole support member and are disposed, in use, along the length of pole in spaced relationship therealong. The garlands interconnect the limb portions so that as the ring portions are lifted, from the top, from the stacked positions thereof on the pole support member and slid along the pole, the garlands between adjacent limb section are tensioned, in turn, and thus serve to lift the next adjacent limb section until the tree is fully erected.",
				"applicationNumber": "US07013056",
				"assignee": "Craig Jr Chester L",
				"country": "US",
				"filingDate": "1987-02-10",
				"issuingAuthority": "United States",
				"patentNumber": "US4748058A",
				"url": "https://patents.google.com/patent/US4748058/en",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "artificial"
					},
					{
						"tag": "garlands"
					},
					{
						"tag": "limb"
					},
					{
						"tag": "members"
					},
					{
						"tag": "pole"
					}
				],
				"notes": [
					{
						"note": "<h2>Classifications</h2>\nA47G33/06: Artificial Christmas trees"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://patents.google.com/patent/US5979603?oq=tree",
		"items": [
			{
				"itemType": "patent",
				"title": "Portable tree stand having fiber composite platform",
				"creators": [
					{
						"firstName": "Ronald R.",
						"lastName": "Woller",
						"creatorType": "inventor"
					}
				],
				"issueDate": "1999-11-09",
				"applicationNumber": "US08369434",
				"assignee": "Summit Specialties Inc",
				"country": "US",
				"filingDate": "1995-01-06",
				"issuingAuthority": "United States",
				"patentNumber": "US5979603A",
				"url": "https://patents.google.com/patent/US5979603/en?oq=tree",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "fibers"
					},
					{
						"tag": "lightweight"
					},
					{
						"tag": "pair"
					},
					{
						"tag": "reinforcing fibers"
					},
					{
						"tag": "tree"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://patents.google.com/patent/US2970959",
		"items": [
			{
				"itemType": "patent",
				"title": "Composition and method for inhibiting scale",
				"creators": [
					{
						"firstName": "Loyd W.",
						"lastName": "Jones",
						"creatorType": "inventor"
					}
				],
				"issueDate": "1961-02-07",
				"applicationNumber": "US742486A",
				"assignee": "Pan American Petroleum Corp",
				"country": "US",
				"filingDate": "1958-06-17",
				"issuingAuthority": "United States",
				"patentNumber": "US2970959A",
				"url": "https://patents.google.com/patent/US2970959/en",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "cmc"
					},
					{
						"tag": "pellet"
					},
					{
						"tag": "scale"
					},
					{
						"tag": "sodium"
					},
					{
						"tag": "water"
					}
				],
				"notes": [
					{
						"note": "<h2>Classifications</h2>\nC02F5/105: Treatment of water with complexing chemicals or other solubilising agents for softening, scale prevention or scale removal, e.g. adding sequestering agents using organic substances combined with inorganic substances<br/>\nY10S507/927: Well cleaning fluid"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://patents.google.com/patent/US6239091",
		"items": [
			{
				"itemType": "patent",
				"title": "Machine dishwashing compositions with a polymer having cationic monomer units",
				"creators": [
					{
						"firstName": "Alla",
						"lastName": "Tartakovsky",
						"creatorType": "inventor"
					},
					{
						"firstName": "Joseph Oreste",
						"lastName": "Carnali",
						"creatorType": "inventor"
					},
					{
						"firstName": "John Robert",
						"lastName": "Winters",
						"creatorType": "inventor"
					}
				],
				"issueDate": "2001-05-29",
				"applicationNumber": "US09075548",
				"assignee": "Lever Brothers Co",
				"country": "US",
				"filingDate": "1998-05-11",
				"issuingAuthority": "United States",
				"patentNumber": "US6239091B1",
				"url": "https://patents.google.com/patent/US6239091/en",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "acid"
					},
					{
						"tag": "alkyl"
					},
					{
						"tag": "cationic"
					},
					{
						"tag": "polymer"
					},
					{
						"tag": "radical"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://patents.google.com/patent/US20110172136",
		"items": [
			{
				"itemType": "patent",
				"title": "Detergent composition with hydrophilizing soil-release agent and methods for using same",
				"creators": [
					{
						"firstName": "Tobias Johannes",
						"lastName": "Fütterer",
						"creatorType": "inventor"
					},
					{
						"firstName": "Lawrence Alan",
						"lastName": "HOUGH",
						"creatorType": "inventor"
					},
					{
						"firstName": "Robert Lee",
						"lastName": "Reierson",
						"creatorType": "inventor"
					}
				],
				"issueDate": "2011-07-14",
				"abstractNote": "Laundry detergent compositions that provide soil release benefits to all fabric comprising an organophosphorus soil release agents and optional non-cotton secondary soil release agents. The present invention further relates to a method for providing soil release benefits to cotton fabric by contacting cotton articles with a water soluble and/or dispersible organophosphorus material. The contacting can be during washing or by pretreating by applying the composition directly to stains or by presoaking the clothing in the composition prior to washing. The present invention further relates to providing soil release benefits to all fabric in the laundry wash load in the presence of a bleaching agent.",
				"applicationNumber": "US13071376",
				"assignee": "Rhodia Operations SAS",
				"country": "US",
				"filingDate": "2011-03-24",
				"issuingAuthority": "United States",
				"language": "en",
				"patentNumber": "US20110172136A1",
				"url": "https://patents.google.com/patent/US20110172136/en",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "alkyl"
					},
					{
						"tag": "alkyleneoxy"
					},
					{
						"tag": "composition"
					},
					{
						"tag": "organophosphorus"
					},
					{
						"tag": "poly"
					}
				],
				"notes": [
					{
						"note": "<h2>Classifications</h2>\nC11D3/0036: Soil deposition preventing compositions; Antiredeposition agents<br/>\nC11D1/342: Phosphonates; Phosphinates; Phosphonites<br/>\nC11D1/345: Phosphates; Phosphites<br/>\nC11D11/0017: \"Soft\" surfaces, e.g. textiles<br/>\nC11D3/361: Phosphonates, phosphinates, phosphonites<br/>\nC11D3/362: Phosphates, phosphites<br/>\nC11D3/3784: (Co)polymerised monomers containing phosphorus"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://patents.google.com/patent/US3625104A/en",
		"items": [
			{
				"itemType": "patent",
				"title": "Water key for brass wind musical instruments",
				"creators": [
					{
						"firstName": "Raymond A.",
						"lastName": "Amado",
						"creatorType": "inventor"
					}
				],
				"issueDate": "1971-12-07",
				"abstractNote": "A FLUID RELEASE VALVE FOR BRASS WIND INSTRUMENTS (CORNETS, TRUMPETS, TROMBONES AND THE LIKE) COMMONLY KNOWN AS A WATER KEY BUT DISTINCT AND DIFFERENT FROM TTHE CONVENTIONAL PIVOTED LEVER-TYPE WATER KEY. IT COMPRISES A VALVE BODY EMBODYING A CYLINDER AND AN ENCLOSED SPRING-LOADED PISTON WHICH RECIPROCATES IN THE CYLINDER AND WHICH SIMULTANEOUSLY OPENS AND CLOSES DIAMETRICALLY OPPOSITE FLUID INLET AND DISCHARGE PORTS AND HAS A PUSH-BUTTON-TYPE FINGER-PIECE AT A READILY ACCESSIBLE END OF THE VALVE BODY.",
				"assignee": "Raymond A Amado",
				"country": "US",
				"filingDate": "1970-05-12",
				"issuingAuthority": "United States",
				"patentNumber": "US3625104A",
				"url": "https://patents.google.com/patent/US3625104A/en",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "piston"
					},
					{
						"tag": "port"
					},
					{
						"tag": "sleeve"
					},
					{
						"tag": "valve"
					},
					{
						"tag": "water key"
					}
				],
				"notes": [
					{
						"note": "<h2>Classifications</h2>\nG10D7/10: Lip-reed wind instruments, i.e. using the vibration of the musician's lips, e.g. cornets, trumpets, trombones or French horns"
					}
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
