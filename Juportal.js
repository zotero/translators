{
	"translatorID": "e1c9fcd1-9ab7-42f3-8ac0-juportal",
	"label": "Juportal",
	"creator": "Denzel Vingerhoed",
	"target": "juportal.be",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-06-02 13:06:36"
}

function detectWeb(doc, url) {
	if (url.includes('/content/ECLI:')) {
		return "case";
	} else if (url.includes('/zoekmachine/zoekresultaten')) {
		return "multiple";
	}
	return false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) === "multiple") {
		let items = getSearchResults(doc);
		Zotero.selectItems(items, function (selectedItems) {
			if (!selectedItems) return;
			let urls = Object.keys(selectedItems);
			ZU.processDocuments(urls, scrape);
		});
	} else {
		scrape(doc, url);
	}
}

function getSearchResults(doc) {
	let items = {};
	let links = doc.querySelectorAll('a[href*="/content/ECLI:"]');
	for (let link of links) {
		let title = ZU.trimInternal(link.textContent);
		let href = link.href;
		if (href && title) {
			items[href] = title;
		}
	}
	return Object.keys(items).length ? items : false;
}
function scrape(doc, url) {
	let item = new Zotero.Item("case");
	item.url = url;

	if (!item.title) {
	let titleElem = doc.querySelector("h1, h2");
	if (titleElem) {
		item.title = titleElem.textContent.trim();
	} else if (item.docketNumber) {
		item.title = "Zaak " + item.docketNumber;
	} else {
		item.title = "Onbekende zaak";
	}
}


	// Extract ECLI from the page itself (more reliable)
	let ecliLabel = doc.querySelector('p.champ-entete-table');
	if (ecliLabel && ecliLabel.textContent.trim().startsWith("ECLI nr:")) {
	let ecliValueElem = ecliLabel.nextElementSibling;
	if (ecliValueElem) {
		item.docketNumber = ecliValueElem.textContent.trim();
	}
	}

	// Fallback to URL if not found
	if (!item.docketNumber) {
	let ecliMatch = url.match(/ECLI:[^:]+:[^:]+:[^:]+:[^/.?]+/);
	if (ecliMatch) {
		item.docketNumber = ecliMatch[0];
	}
	}

	

	// Determine court name from ECLI or fallback to DOM
	let ecliCourtMatch = url.match(/ECLI:BE:([A-Z]+)/);
	const courtMap = {
		CASS: "Cass.",
		RVSCE: "RvS",
		GHCC: "Gh.",
		CABRL: "HvB Brussel",
		HBGNT: "HvB Gent",
		HBANT: "HVB Antwerpen",
		CALIE: "HvB Luik",
		CAMON: "HvB Bergen",
		AHANT: "Arbh. Antwerpen",
		AHGNT: "Arbh. Gent",
		CTBRL: "Arbh. Brussel",
		CTLIE: "Arbh. Luik",
		CTMON: "Arbh. Bergen",
		EAANT: "Rb. Antwerpen",
		EAWVL: "Rb. West-Vl.",
		EAOVL: "Rb. Oost-Vl.",
		EALIM: "Rb. Limburg",
		EALEU: "Rb. Leuven",
		EABRL: "Rb. Brussel (Nl.)",
		PIBRL: "Rb. Brussel (Fr.)",
		PIHAI: "Rb. Henegouwen",
		PINAM: "Rb. Namen",
		TREUP: "Rb. Eupen",
		PIBRW: "Rb. Waals-Brabant",
		ARANT: "Arbrb. Antwerpen",
		ARGNT: "Arbhb. Gent",
		ARLEU: "Arbrb. Leuven",
		ARBRL: "Arbrb. Brussel (Nl.)",
		TTBRL: "Arbrb. Brussel (Fr.)",
		TTHAI: "Arbrb. Henegouwen",
		TTLIE: "Arbrb. Luik",
		TTBRW: "Arbrb. Waals-Brabant",
		ORANT: "Or. Antwerpen",
		ORBRL: "Or. Brussel (Nl.)",
		TEBRL: "Or. Brussel (Fr.)",
		ORLEU: "Or. Leuven",
		TEBRW: "Or. Waals-Brabant",
		ORGNT: "Or. Gent",
		TELIE: "Or. Luik",
		TEHAI: "Or. Henegouwen",
		COHSAV: "Commissie voor financiële hulp aan slachtoffers van opzettelijke gewelddaden en aan de occasionele redders",
		GBAPD: "GBA",
	

		// add more mappings as needed
	};
	if (ecliCourtMatch) {
		let courtCode = ecliCourtMatch[1];
		if (courtMap[courtCode]) {
			item.court = courtMap[courtCode];
		} else {
			let courtDiv = doc.querySelector("#show-author");
			if (courtDiv) {
				item.court = courtDiv.textContent.trim();
			}
		}
	}

	// Try date from ECLI in URL (e.g. 20250506)
	let ecliDateMatch = url.match(/ECLI:[^:]+:[^:]+:[^:]+:[^.]+\.(\d{4})(\d{2})(\d{2})/);
	if (ecliDateMatch) {
		let [ , year, month, day ] = ecliDateMatch;
		item.dateDecided = `${year}-${month}-${day}`;
	}

	// Fallback: look in <legend> text content for Dutch or French month names
	if (!item.dateDecided) {
		const monthMap = {
			"januari": "01", "février": "02", "februari": "02",
			"maart": "03", "mars": "03",
			"april": "04",
			"mei": "05", "mai": "05",
			"juni": "06", "juin": "06",
			"juli": "07", "juillet": "07",
			"augustus": "08", "août": "08",
			"september": "09",
			"oktober": "10", "octobre": "10",
			"november": "11",
			"december": "12", "décembre": "12"
		};

		let legends = doc.querySelectorAll("legend");
		for (let legend of legends) {
			let text = legend.textContent.trim().toLowerCase();
			let dateMatch = text.match(/(\d{1,2})\s+([a-zéû]+)\s+(\d{4})/i);
			if (dateMatch) {
				let day = dateMatch[1].padStart(2, "0");
				let monthName = dateMatch[2].toLowerCase();
				let year = dateMatch[3];
				let month = monthMap[monthName];
				if (month) {
					item.dateDecided = `${year}-${month}-${day}`;
					break;
				}
			}
		}
	}
	// Extract abstract from "Fiche" section
let ficheLegend = Array.from(doc.querySelectorAll("legend")).find(l => {
	return l.textContent.trim().toLowerCase() === "fiche";
});

if (ficheLegend) {
	let fieldset = ficheLegend.closest("fieldset");
	if (fieldset) {
		let abstractDiv = fieldset.querySelector("div.plaintext");
		if (abstractDiv) {
			let abstractText = abstractDiv.textContent.trim();
			if (abstractText) {
				item.abstractNote = abstractText;
			}
		}
	}
}



	// Add snapshot
	item.attachments.push({
	title: "Juportal Snapshot",
	document: doc,
	mimeType: "text/html"
});

	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://juportal.be/content/ECLI:BE:CASS:2025:ARR.20250506.2N.11",
		"items": [
			{
				"itemType": "case",
				"caseName": "Onbekende zaak",
				"creators": [],
				"court": "Cass.",
				"docketNumber": "ECLI:BE:CASS:2025:ARR.20250506.2N.11",
				"language": "nl",
				"url": "https://juportal.be/content/ECLI:BE:CASS:2025:ARR.20250506.2N.11",
				"attachments": [
					{
						"title": "Juportal Snapshot",
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
