{
	"translatorID": "1294baba-5685-4f4d-b875-be8f0b8b3877",
	"label": "Portale Antenati",
	"creator": "Stefano Ricciardi",
	"target": "^https?://(www\\.)?antenati\\.(cultura\\.gov|san\\.beniculturali)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-12-29 16:13:32"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2025 Stefano Ricciardi

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
	// Match Antenati domain patterns
	if (!url.match(/^https?:\/\/(www\.)?antenati\.(cultura\.gov|san\.beniculturali)\.it/)) {
		return false;
	}

	// Detect gallery pages (contain multiple records)
	if (doc.querySelector('[data-gallery-id]') ||
		url.includes('/gallery/') ||
		doc.querySelector('.gallery-item') ||
		doc.querySelector('.archival-unit-list')) {
		return "multiple";
	}

	// Detect individual record pages
	if (doc.querySelector('[data-manifest-url]') ||
		url.includes('/view/') ||
		url.includes('/ark:/') ||
		doc.querySelector('.iiif-manifest') ||
		doc.querySelector('.archival-unit-detail') ||
		doc.querySelector('.document-viewer') ||
		doc.title.includes('Visualizzatore')) {
		return "manuscript";
	}

	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;

	// Look for individual archival records in gallery pages
	var rows = doc.querySelectorAll('a[href*="/view/"], a[href*="/ark:/"], .archival-unit-item a, .gallery-item a');

	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(row.textContent) ||
				   row.getAttribute('title') ||
				   row.querySelector('.title, .archival-title')?.textContent ||
				   'Archival Record';

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
		await scrape(doc, url);
	}
}

async function scrape(doc, url = doc.location.href) {
	// Extract page number from Mirador viewer navigation element
	// Format: "124 di 126 • pag. 124" (Italian: "124 of 126 • page 124")
	let currentPageNumber = null;
	let miradorNav = doc.querySelector('[class*="mirador-canvas-nav"]');
	if (miradorNav) {
		let navText = miradorNav.textContent;
		// Extract the first number (current page position)
		let match = navText.match(/^(\d+)\s+di\s+\d+/);
		if (match) {
			currentPageNumber = parseInt(match[1], 10);
		}
	}

	let manifestUrl = await extractManifestUrl(doc, url);
	if (!manifestUrl) {
		Zotero.debug("Portale Antenati: No IIIF manifest URL found, using fallback scrape");
		await fallbackScrape(doc, url);
		return;
	}

	try {
		// Add headers to bypass WAF protection as noted in the Python implementation
		let manifest = await requestJSON(manifestUrl, {
			headers: {
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
				'Referer': 'https://antenati.cultura.gov.it/',
				'Accept': 'application/json, text/plain, */*',
				'Accept-Language': 'en-US,en;q=0.9',
				'Accept-Encoding': 'gzip, deflate, br',
				'Connection': 'keep-alive',
				'Sec-Fetch-Dest': 'empty',
				'Sec-Fetch-Mode': 'cors',
				'Sec-Fetch-Site': 'same-site'
			}
		});

		let item = await createItemFromManifest(manifest, url);
		if (item) {
			await addImageAttachments(item, manifest, url, currentPageNumber);
			item.complete();
		}
	}
	catch (error) {
		Zotero.debug("Portale Antenati: Failed to fetch manifest: " + error);
		await fallbackScrape(doc, url);
	}
}

async function extractManifestUrl(doc, url) {
	// Strategy 1: Look for data attributes
	let manifestElement = doc.querySelector('[data-manifest-url]');
	if (manifestElement) {
		return manifestElement.getAttribute('data-manifest-url');
	}

	// Strategy 2: Look for IIIF manifest links
	let manifestLink = doc.querySelector('link[rel="alternate"][type="application/json"]');
	if (manifestLink) {
		return manifestLink.href;
	}

	// Strategy 3: Search HTML content for manifestId (Python script approach)
	let htmlContent = doc.documentElement.innerHTML;
	let lines = htmlContent.split('\n');

	for (let line of lines) {
		if (line.includes('manifestId')) {
			// Look for URLs in single quotes using regex similar to Python script
			let manifestUrlMatch = line.match(/'([A-Za-z0-9.:/-]+manifest[^']*)'/);
			if (manifestUrlMatch) {
				return manifestUrlMatch[1];
			}
		}
	}

	// Strategy 4: Look for manifest URLs in script tags
	let scripts = doc.querySelectorAll('script');
	for (let script of scripts) {
		let text = script.textContent;
		if (text.includes('manifest')) {
			// Look for dam-antenati.cultura.gov.it manifest URLs
			let match = text.match(/https:\/\/dam-antenati\.cultura\.gov\.it\/antenati\/containers\/[A-Za-z0-9]+\/manifest/);
			if (match) {
				return match[0];
			}

			// Fallback: look for any manifest URL
			let manifestMatch = text.match(/['"](https?:\/\/[^'"]*manifest[^'"]*)['"]/);
			if (manifestMatch) {
				return manifestMatch[1];
			}
		}
	}

	// Strategy 5: Original URL construction (kept as final fallback)
	let urlMatch = url.match(/\/ark:\/([^\/]+)\/([^\/]+)(?:\/([^\/]+))?/);
	if (urlMatch) {
		let baseUrl = new URL(url);
		return `${baseUrl.origin}/iiif/ark:/${urlMatch[1]}/${urlMatch[2]}${urlMatch[3] ? '/' + urlMatch[3] : ''}/manifest.json`;
	}

	return null;
}

async function createItemFromManifest(manifest, url) {
	let item = new Zotero.Item('manuscript');

	// Set basic item properties
	item.url = url;
	item.libraryCatalog = "Portale Antenati";

	// Extract metadata from IIIF manifest
	let titleYear = null; // "Titolo" contains the year (e.g., "1809") for title construction
	if (manifest.metadata) {
		manifest.metadata.forEach(field => {
			let label = field.label;
			let value = Array.isArray(field.value) ? field.value.join('; ') : field.value;

			// Clean up HTML tags if present
			if (typeof value === 'string') {
				value = ZU.cleanTags(value);
			}

			switch (label) {
				case 'Titolo':
				case 'Title':
					titleYear = value;
					break;

				case 'Contesto archivistico':
				case 'Archival Context':
					item.archive = value;
					break;

				case 'Tipologia':
				case 'Typology':
				case 'Type':
					item.manuscriptType = value;
					break;

				case 'Data':
				case 'Datazione':
				case 'Date':
					item.date = value;
					break;

				case 'Luogo':
				case 'Place':
				case 'Località':
					item.place = value;
					break;

				case 'Collezione':
				case 'Collection':
				case 'Fondo':
					item.archiveLocation = value;
					break;

				case 'Descrizione':
				case 'Description':
					item.abstractNote = value;
					break;
			}
		});
	}

	// Construct title from metadata: "year - type - archive"
	// Example: "1809 - Nati - Archivio di Stato di Lecce > Stato civile della restaurazione > Casamassella"
	let titleParts = [];
	if (titleYear) {
		titleParts.push(titleYear);
	}
	if (item.manuscriptType) {
		titleParts.push(item.manuscriptType);
	}
	if (item.archive) {
		titleParts.push(item.archive);
	}

	if (titleParts.length > 0) {
		item.title = titleParts.join(' - ');
	}
	else if (manifest.label) {
		// Fallback to manifest label
		item.title = Array.isArray(manifest.label) ? manifest.label.join(' ') : manifest.label;
	}
	else {
		// Final fallback
		item.title = "Archival Record from Portale Antenati";
	}

	// Extract description from manifest description
	if (!item.abstractNote && manifest.description) {
		item.abstractNote = Array.isArray(manifest.description)
			? manifest.description.join(' ')
			: manifest.description;
	}

	// Extract number of pages from canvas count
	if (manifest.sequences && manifest.sequences[0] && manifest.sequences[0].canvases) {
		item.numPages = String(manifest.sequences[0].canvases.length);
	}

	return item;
}

// Helper function to convert ArrayBuffer to base64 in chunks (avoids stack overflow)
function arrayBufferToBase64(buffer) {
	let binary = '';
	const bytes = new Uint8Array(buffer);
	const chunkSize = 8192;
	for (let i = 0; i < bytes.length; i += chunkSize) {
		const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
		for (let j = 0; j < chunk.length; j++) {
			binary += String.fromCharCode(chunk[j]);
		}
	}
	return btoa(binary);
}

async function addImageAttachments(item, manifest, baseUrl, currentPageNumber) {
	if (!manifest.sequences || !manifest.sequences[0] || !manifest.sequences[0].canvases) {
		return;
	}

	const canvases = manifest.sequences[0].canvases;
	const downloadedImages = []; // Store downloaded images for embedding in note

	// Headers required to bypass WAF protection (same as Python script)
	const imageHeaders = {
		'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
		'Referer': 'https://antenati.cultura.gov.it/',
		'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
		'Accept-Language': 'en-US,en;q=0.9'
	};

	// Find the target canvas
	let targetCanvas = null;
	let targetIndex = -1;
	let targetLabel = null;

	// If we have a page number from the DOM (Mirador viewer), use it directly
	if (currentPageNumber && currentPageNumber > 0 && currentPageNumber <= canvases.length) {
		targetIndex = currentPageNumber - 1; // Convert to 0-based index
		targetCanvas = canvases[targetIndex];
		targetLabel = targetCanvas.label;

		// Set the page number on the item (format: "X of Y")
		item.pages = `${currentPageNumber} of ${canvases.length}`;
	}
	else {
		// Fallback: try to match by page ID from URL
		const pageId = baseUrl.split('/').pop();

		for (let i = 0; i < canvases.length; i++) {
			const canvas = canvases[i];
			if (canvas.images && canvas.images[0] && canvas.images[0].resource) {
				const imageUrl = canvas.images[0].resource['@id'] || canvas.images[0].resource.id;
				if (imageUrl && imageUrl.includes('/' + pageId + '/')) {
					targetCanvas = canvas;
					targetIndex = i;
					targetLabel = canvas.label;
					break;
				}
			}
		}

		// If no matching canvas found, fall back to first canvas
		if (!targetCanvas && canvases.length > 0) {
			targetCanvas = canvases[0];
			targetIndex = 0;
			targetLabel = canvases[0].label;
		}

		// Set page number from canvas label if we didn't get it from DOM (format: "X of Y")
		if (targetLabel) {
			item.pages = `${targetLabel} of ${canvases.length}`;
		}
	}

	// Download only the target image
	if (targetCanvas && targetCanvas.images && targetCanvas.images[0] && targetCanvas.images[0].resource) {
		let imageUrl = targetCanvas.images[0].resource['@id'] || targetCanvas.images[0].resource.id;

		if (imageUrl) {
			// Add size parameter for reasonable file size (max width 800px for good quality)
			if (imageUrl.includes('/full/full/')) {
				imageUrl = imageUrl.replace('/full/full/', '/full/800,/');
			}

			try {
				// Download image with proper headers to bypass 403
				const response = await request(imageUrl, {
					headers: imageHeaders,
					responseType: 'arraybuffer'
				});

				if (response.body && response.body.byteLength > 0) {
					// Convert to base64
					const base64Data = arrayBufferToBase64(response.body);
					const dataUri = `data:image/jpeg;base64,${base64Data}`;

					// Store for later use in note
					downloadedImages.push({
						index: targetIndex + 1,
						label: targetLabel,
						dataUri: dataUri,
						originalUrl: imageUrl
					});
				}
			}
			catch (error) {
				Zotero.debug("Portale Antenati: Failed to download image: " + error);
			}
		}
	}

	// Create an HTML note with the embedded image
	if (downloadedImages.length > 0) {
		const img = downloadedImages[0];
		let noteHtml = '';
		if (img.label) {
			noteHtml += `<p><strong>Page: ${img.label}</strong></p>\n`;
		}
		noteHtml += `<p><img src="${img.dataUri}" style="max-width:100%;" /></p>\n`;
		noteHtml += `<p><a href="${baseUrl}">View in Portale Antenati</a></p>`;

		item.notes.push({
			note: noteHtml,
			title: "Archival Images"
		});
	}

	// Add link to original page
	item.attachments.push({
		title: "View in Portale Antenati",
		url: baseUrl,
		mimeType: 'text/html',
		snapshot: false
	});
}

async function fallbackScrape(doc, url) {
	// Fallback when IIIF manifest is not available
	let item = new Zotero.Item('manuscript');

	item.url = url;
	item.libraryCatalog = "Portale Antenati";

	// Try to extract basic metadata from page HTML
	let title = doc.querySelector('h1, .title, .archival-title, .page-title')?.textContent;
	item.title = ZU.trimInternal(title) || "Archival Record from Portale Antenati";

	// Look for metadata in the page
	let metaElements = doc.querySelectorAll('meta[name], meta[property]');
	for (let meta of metaElements) {
		let name = meta.getAttribute('name') || meta.getAttribute('property');
		let content = meta.getAttribute('content');

		if (name && content) {
			switch (name.toLowerCase()) {
				case 'description':
				case 'og:description':
					if (!item.abstractNote) item.abstractNote = content;
					break;
				case 'og:title':
					if (!item.title || item.title === "Archival Record from Portale Antenati") {
						item.title = content;
					}
					break;
			}
		}
	}

	// Add link to the page (without snapshot to avoid webpage screenshots)
	item.attachments.push({
		title: "View in Portale Antenati",
		url: url,
		mimeType: 'text/html',
		snapshot: false
	});

	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
