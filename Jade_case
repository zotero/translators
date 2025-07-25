{
	"translatorID": "c7e07d17-cc0b-4f6c-b12a-6f3a9de0410b", // generate with `uuidgen` if needed
	"label": "JADE Case Extractor",
	"creator": "Custom for Australian case law",
	"target": "^https?://(www\\.)?jade\\.io/article/",
	"minVersion": "4.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-05-26 00:00:00"
}


function detectWeb(doc, url) {
	if (url.includes("jade.io/article/")) {
		return "case";
	}
	return false;
}

function scrape(doc, url) {
	let newItem = new Zotero.Item("case");

	// Extract case name and MNC from <title>
	let titleElement = doc.querySelector("title");
	if (titleElement) {
		let fullTitle = titleElement.innerText.trim();
		let titleMatch = fullTitle.match(/^(.+?)\s\[(\d{4})\]\s+(\w+)\s+(\d+)/);
		if (titleMatch) {
			newItem.caseName = titleMatch[1];
			newItem.dateDecided = titleMatch[2];
			newItem.court = titleMatch[3];
			newItem.docketNumber = titleMatch[4];
		} else {
			Zotero.debug("Failed to parse case details from <title> tag.");
		}
	}

	// Extract second citation from metadata row and store others in extra
	let rows = doc.querySelectorAll("table tr");
	for (let row of rows) {
		let citationCell = row.querySelector("td span.gwt-InlineLabel");
		if (citationCell) {
			let text = citationCell.textContent.trim();

			// Look for typical citation string: starts with [year] and has semicolons
			if (/^\[\d{4}\]/.test(text) && text.includes(";")) {
				let parts = text.split(";").map(p => p.trim());

				if (parts.length > 1) {
					let secondCitation = parts[1];

					// Try parsing as traditional page-based citation
					let match = secondCitation.match(/(?:\(?(\d{4})\)?\s+)?(\d+)\s+([A-Z.]+)\s+(\d+)/);
					if (match) {
						const year = match[1] || newItem.dateDecided;
						newItem.reporterVolume = match[2];
						newItem.reporter = match[3].replace(/\./g, "");
						newItem.firstPage = match[4];
					} else {
						// Try parsing as paragraph-based citation
						match = secondCitation.match(/(?:\(?(\d{4})\)?\s+)?([A-Z.]+)\s+(¶?\d+(?:[-–]\d+)?)/);
						if (match) {
							const year = match[1] || newItem.dateDecided;
							newItem.reporter = match[2].replace(/\./g, "");
							newItem.firstPage = match[3];
						}
					}
				}

				// Add remaining citations to extra
				let extraCitations = parts.slice(2).join("; ");
				if (extraCitations) {
					newItem.extra = "Additional citations: " + extraCitations;
				}

				break; // Stop after first match
			}
		}
	}

	// Standardise URL
	newItem.url = url
		.replace(/^http:\/\//, 'https://')
		.replace(/^(https:\/\/www)\d/, '$1');

	// Add page snapshot
	newItem.attachments.push({
		document: doc,
		title: "Snapshot",
		mimeType: "text/html"
	});

	// Attach original document if available
	let downloadLink = Array.from(doc.querySelectorAll("a"))
		.find(a => a.textContent.includes("Download Original Document"));
	if (downloadLink) {
		let href = downloadLink.href;
		let filename = href.split('/').pop().split('?')[0];
		let isPDF = filename.toLowerCase().endsWith(".pdf");

		newItem.attachments.push({
			title: "Original Document",
			url: href,
			mimeType: isPDF ? "application/pdf" : "application/octet-stream",
			snapshot: false
		});
	}

	newItem.complete();
}

function doWeb(doc, url) {
	scrape(doc, url);
}
