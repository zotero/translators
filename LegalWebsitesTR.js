{
	"translatorID": "307787d2-1ec6-4623-90ed-d01ab4f2c51d",
	"label": "Turkish Legal Publishers",
	"creator": "Mehmet Akif Petek",
	"target": "^https?://(www\\.)?(hukukmarket\\.com|seckin\\.com\\.tr|yetkin\\.com\\.tr|filizkitabevi\\.com|legal\\.com\\.tr|adalet\\.com\\.tr|betayayincilik\\.com|onikilevha\\.com\\.tr)/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-10-16 12:00:00"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2025 Mehmet Akif Petek

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
	// Check if JSON-LD with Book or Product type exists
	let jsonLd = doc.querySelectorAll('script[type="application/ld+json"]');
	for (let script of jsonLd) {
		try {
			let data = JSON.parse(script.textContent);
			if (data['@type'] === 'Book' || data['@type'] === 'Product') {
				return 'book';
			}
		}
		catch (e) {
			// Continue checking other scripts
		}
	}

	// Check for microdata indicators
	if (doc.querySelector('[itemtype*="Book"]') || doc.querySelector('[itemtype*="Product"]')) {
		return 'book';
	}

	// Check for book-specific meta tags
	if (doc.querySelector('meta[property="og:type"][content="book"]')
		|| doc.querySelector('meta[property="book:isbn"]')
		|| doc.querySelector('meta[property="book:author"]')) {
		return 'book';
	}

	// Site-specific URL patterns for product pages
	let path = new URL(url).pathname;
	if (path.includes('/kitap/') || path.includes('/urun/') || path.includes('/product/')
		|| path.includes('/book/') || path.includes('/yayin/')) {
		return 'book';
	}

	let host = new URL(url).host;

	// yetkin.com.tr: /kira-hukuku-davalari-15081
	if (host.includes('yetkin.com.tr') && /\/[a-z0-9-]+-\d+$/.test(path)) {
		return 'book';
	}

	// filizkitabevi.com: /anayasa-mahkemesi-kararlari-isiginda-infaz-hukuku-4-baski
	if (host.includes('filizkitabevi.com') && /\/[a-z0-9-]+$/.test(path)) {
		return 'book';
	}

	// adalet.com.tr: /tuketici-hukuku-30259
	if (host.includes('adalet.com.tr') && /\/[a-z0-9-]+-\d+$/.test(path)) {
		return 'book';
	}

	// betayayincilik.com: /turk-hukuk-tarihi-p-19561958
	if (host.includes('betayayincilik.com') && /\/[a-z0-9-]+-p-\d+$/.test(path)) {
		return 'book';
	}

	// Check for search results
	if (getSearchResults(doc, true)) {
		return 'multiple';
	}

	return false;
}

function getSearchResults(doc, checkOnly) {
	let items = {};
	let found = false;
	let rows = [];
	let host = new URL(doc.location.href).host;

	// Site-specific selectors for search results
	if (host.includes('hukukmarket.com')) {
		rows = doc.querySelectorAll('a[href*="/urun/"]');
	}
	else if (host.includes('seckin.com.tr')) {
		rows = doc.querySelectorAll('a[href*="/kitap/"]');
	}
	else if (host.includes('yetkin.com.tr')) {
		rows = doc.querySelectorAll('a[href*="/p/"]');
	}
	else if (host.includes('filizkitabevi.com')) {
		rows = doc.querySelectorAll('a[href*="/"][title]');
	}
	else if (host.includes('legal.com.tr')) {
		rows = doc.querySelectorAll('a[href*="/book/"]');
	}
	else if (host.includes('adalet.com.tr')) {
		rows = doc.querySelectorAll('a[href*="/"][title]');
	}
	else if (host.includes('betayayincilik.com')) {
		rows = doc.querySelectorAll('a[href*="/"][title]');
	}
	else if (host.includes('onikilevha.com.tr')) {
		rows = doc.querySelectorAll('a[href*="/yayin/"]');
	}

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
		await scrape(doc, url);
	}
}

async function scrape(doc, url = doc.location.href) {
	var item = new Zotero.Item('book');

	// Extract JSON-LD data
	let jsonLd = doc.querySelectorAll('script[type="application/ld+json"]');
	let productJson = null;
	let bookJson = null;

	for (let script of jsonLd) {
		try {
			let data = JSON.parse(script.textContent);
			if (data['@type'] === 'Product') {
				productJson = data;
			}
			else if (data['@type'] === 'Book') {
				bookJson = data;
			}
		}
		catch (e) {
			// Skip invalid JSON
		}
	}

	// Extract from Product JSON-LD
	if (productJson) {
		if (productJson.name) {
			item.title = ZU.unescapeHTML(productJson.name);
		}
		if (productJson.brand && productJson.brand.name) {
			item.publisher = localeCapitalizeTitle(ZU.trimInternal(productJson.brand.name));
		}
		if (productJson.gtin13) {
			item.ISBN = productJson.gtin13;
		}
		if (productJson.description) {
			item.abstractNote = ZU.unescapeHTML(productJson.description);
		}
	}

	// Extract from Book JSON-LD
	if (bookJson) {
		if (bookJson.name && !item.title) {
			item.title = ZU.unescapeHTML(bookJson.name);
		}
		if (bookJson.isbn && !item.ISBN) {
			item.ISBN = bookJson.isbn;
		}
		if (bookJson.publisher && bookJson.publisher.name && !item.publisher) {
			item.publisher = bookJson.publisher.name;
		}
		if (bookJson.copyrightYear && !item.date) {
			item.date = bookJson.copyrightYear;
		}
		if (bookJson.numberOfPages && !item.numPages) {
			item.numPages = bookJson.numberOfPages.toString();
		}
		if (bookJson.inLanguage) {
			item.language = bookJson.inLanguage === 'tr-TR' ? 'tr' : bookJson.inLanguage;
		}
	}

	// Site-specific extraction
	let host = new URL(url).host;
	if (host.includes('seckin.com.tr')) {
		await scrapeSeckin(doc, item);
	}
	else if (host.includes('yetkin.com.tr')) {
		await scrapeYetkin(doc, item, productJson);
	}
	else if (host.includes('filizkitabevi.com')) {
		await scrapeFiliz(doc, item);
	}
	else if (host.includes('adalet.com.tr')) {
		await scrapeAdalet(doc, item);
	}
	else if (host.includes('betayayincilik.com')) {
		await scrapeBeta(doc, item);
	}
	else if (host.includes('legal.com.tr')) {
		await scrapeLegal(doc, item);
	}
	else if (host.includes('onikilevha.com.tr')) {
		await scrapeOnikilevha(doc, item);
	}
	else if (host.includes('hukukmarket.com')) {
		await scrapeHukukmarket(doc, item);
	}

	// Add snapshot attachment
	item.attachments.push({
		title: 'Snapshot',
		document: doc
	});

	item.complete();
}

// Site-specific scraping functions

async function scrapeSeckin(doc, item) {
	if (!item.title) {
		item.title = attr(doc, 'meta[property="og:title"]', 'content');
	}

	if (!item.ISBN) {
		item.ISBN = attr(doc, 'meta[property="book:isbn"]', 'content');
	}

	let authorName = attr(doc, 'meta[property="book:author"]', 'content');
	if (authorName) {
		item.creators.push(ZU.cleanAuthor(cleanCreatorTitles(authorName), 'author'));
	}

	if (!item.abstractNote) {
		item.abstractNote = attr(doc, 'meta[name="description"]', 'content');
	}

	// Extract creators from page
	let authors = doc.querySelectorAll('.hm-product-author-top a');
	for (let author of authors) {
		let name = cleanCreatorTitles(text(author));
		if (name) {
			item.creators.push(ZU.cleanAuthor(name, 'author'));
		}
	}

	// Extract translators
	let translators = doc.querySelectorAll('.hm-product-cevirmen-top a');
	for (let translator of translators) {
		let name = cleanCreatorTitles(text(translator));
		if (name) {
			item.creators.push(ZU.cleanAuthor(name, 'translator'));
		}
	}

	// Extract editors
	let editors = doc.querySelectorAll('.hm-product-editor-top a');
	for (let editor of editors) {
		let name = cleanCreatorTitles(text(editor));
		if (name) {
			item.creators.push(ZU.cleanAuthor(name, 'editor'));
		}
	}

	// Extract edition
	let editionText = text(doc, '.hm-product-baski-top');
	let editionMatch = editionText.match(/(\d+)\.\s*Baskı/);
	if (editionMatch && editionMatch[1] && editionMatch[1] !== '1') {
		item.edition = editionMatch[1];
	}

	// Extract date
	let dateText = text(doc, '.hm-product-basim-tarihi-top');
	let dateMatch = dateText.match(/(\d{4})/);
	if (dateMatch && dateMatch[1]) {
		item.date = dateMatch[1];
	}

	// Extract pages
	let pagesText = text(doc, '.hm-product-sayfa-top');
	let pagesMatch = pagesText.match(/(\d+)\s+sayfa/);
	if (pagesMatch && pagesMatch[1]) {
		item.numPages = pagesMatch[1];
	}

	item.language = 'tr';
}

async function scrapeYetkin(doc, item, productJson) {
	// Extract from productID in JSON-LD
	if (productJson && productJson.productID && productJson.productID.includes('ISBN:')) {
		item.ISBN = productJson.productID.replace('ISBN:', '');
	}

	// Extract metadata from description
	if (productJson && productJson.description) {
		let desc = productJson.description;

		// Extract author
		let authorMatch = desc.match(/(?:Prof\.|Doç\.|Dr\.)\s*([A-ZÇĞIİÖŞÜ][a-zçğıiöşü]+(?:\s+[A-ZÇĞIİÖŞÜ][a-zçğıiöşü]+)*)/i);
		if (authorMatch) {
			item.creators.push(ZU.cleanAuthor(cleanCreatorTitles(authorMatch[0]), 'author'));
		}

		// Extract edition
		let editionMatch = desc.match(/(\d+)\.\s*Baskı/);
		if (editionMatch && editionMatch[1] && editionMatch[1] !== '1') {
			item.edition = editionMatch[1];
		}

		// Extract date
		let dateMatch = desc.match(/(\d{4})\/\d{2}/);
		if (dateMatch && dateMatch[1]) {
			item.date = dateMatch[1];
		}

		// Extract pages
		let pageMatch = desc.match(/(\d+)\s+Sayfa/);
		if (pageMatch && pageMatch[1]) {
			item.numPages = pageMatch[1];
		}
	}

	// Fallback to microdata
	if (!item.title) {
		item.title = attr(doc, 'meta[itemprop="name"]', 'content');
	}

	if (!item.ISBN) {
		item.ISBN = attr(doc, 'meta[itemprop="isbn"]', 'content');
	}

	if (item.creators.length === 0) {
		let authorName = attr(doc, 'meta[itemprop="author"]', 'content');
		if (authorName) {
			item.creators.push(ZU.cleanAuthor(cleanCreatorTitles(authorName), 'author'));
		}
	}

	if (!item.publisher) {
		item.publisher = attr(doc, 'meta[itemprop="publisher"]', 'content');
	}

	if (!item.date) {
		let dateStr = attr(doc, 'meta[itemprop="datePublished"]', 'content');
		let yearMatch = dateStr.match(/(\d{4})/);
		if (yearMatch && yearMatch[1]) {
			item.date = yearMatch[1];
		}
	}

	// Extract from table
	let tableRows = doc.querySelectorAll('table.attribute tbody tr');
	for (let row of tableRows) {
		let cells = row.querySelectorAll('td');
		if (cells.length >= 2) {
			let label = text(cells[0]);
			let value = text(cells[1]);

			if (label === 'Yazar' && item.creators.length === 0) {
				item.creators.push(ZU.cleanAuthor(cleanCreatorTitles(value), 'author'));
			}
			else if (label === 'Baskı Tarihi' && !item.date) {
				let yearMatch = value.match(/(\d{4})/);
				if (yearMatch && yearMatch[1]) {
					item.date = yearMatch[1];
				}
			}
			else if (label === 'Baskı Sayısı' && !item.edition && value !== '1') {
				item.edition = value;
			}
			else if (label === 'Sayfa Sayısı' && !item.numPages) {
				item.numPages = value;
			}
		}
	}

	// Get description from tab
	if (!item.abstractNote) {
		item.abstractNote = text(doc, '#tab-description');
	}

	item.language = 'tr';
}

async function scrapeFiliz(doc, item) {
	// Extract from microdata
	if (!item.title) {
		item.title = text(doc, '[itemprop="name"]') || text(doc, 'h1.contentHeader.prdHeader');
	}

	if (!item.ISBN) {
		item.ISBN = text(doc, '[itemprop="sku"]') || attr(doc, '.prd_view', 'data-prd-barcode');
	}

	if (!item.publisher) {
		item.publisher = attr(doc, '[itemprop="brand"] [itemprop="name"]', 'content')
			|| text(doc, '.prd_brand_box .publisher a');
	}

	if (!item.abstractNote) {
		item.abstractNote = text(doc, '[itemprop="description"]')
			|| attr(doc, 'meta[name="description"]', 'content');
	}

	// Extract authors
	let authorElems = doc.querySelectorAll('.prd_brand_box .writer a');
	for (let author of authorElems) {
		let name = cleanCreatorTitles(text(author));
		if (name) {
			item.creators.push(ZU.cleanAuthor(name, 'author'));
		}
	}

	// If no authors found, try .writer span
	if (item.creators.length === 0) {
		let writerName = text(doc, '.writer span') || text(doc, '.writer');
		if (writerName) {
			item.creators.push(ZU.cleanAuthor(cleanCreatorTitles(writerName), 'author'));
		}
	}

	// Extract from custom fields table
	let customFields = doc.querySelectorAll('.prd_custom_fields .table-row');
	for (let field of customFields) {
		let label = text(field, '.prd-features-label');
		let value = text(field, '.table-cell:last-child');

		if (label === 'Sayfa Sayısı' && !item.numPages) {
			item.numPages = value;
		}
		else if (label === 'Baskı' && !item.edition && value !== '1') {
			item.edition = value;
		}
		else if (label === 'Basım Tarihi' && !item.date) {
			let yearMatch = value.match(/(\d{4})/);
			if (yearMatch && yearMatch[1]) {
				item.date = yearMatch[1];
			}
		}
		else if (label === 'Dili' && !item.language) {
			item.language = value === 'Türkçe' ? 'tr' : value;
		}
	}

	if (!item.language) {
		item.language = 'tr';
	}
}

async function scrapeAdalet(doc, item) {
	if (!item.title) {
		item.title = text(doc, '.ProductName h1 span')
			|| text(doc, '.ProductName h1')
			|| text(doc, '.ProductName');
	}

	// Extract from onYaziSablon section
	let authorName = text(doc, '.onYaziSablon a.yazar');
	if (authorName) {
		item.creators.push(ZU.cleanAuthor(cleanCreatorTitles(authorName), 'author'));
	}

	if (!item.publisher) {
		item.publisher = text(doc, '.onYaziSablon a.yayinevi');
	}

	if (!item.ISBN) {
		item.ISBN = text(doc, '.onYaziSablon span.isbn');
	}

	if (!item.date) {
		item.date = text(doc, '.onYaziSablon span.yayin_tarihi');
	}

	// Extract from productDetailModel JavaScript
	let scriptContent = doc.documentElement.innerHTML;
	let productDetailMatch = scriptContent.match(/var productDetailModel = (\{[^;]+\});/);
	if (productDetailMatch && productDetailMatch[1]) {
		try {
			let productData = JSON.parse(productDetailMatch[1]);

			if (productData.productPrice) {
				item.extra = (item.extra || '') + 'Price: ' + productData.productPrice + ' TL\n';
			}

			if (productData.brandName && !item.publisher) {
				item.publisher = productData.brandName;
			}

			if (productData.barkod && !item.ISBN) {
				item.ISBN = productData.barkod;
			}
		}
		catch (e) {
			// Ignore parsing errors
		}
	}

	if (!item.abstractNote) {
		item.abstractNote = attr(doc, 'meta[name="description"]', 'content');
	}

	item.language = 'tr';
}

async function scrapeBeta(doc, item) {
	if (!item.title) {
		item.title = text(doc, 'h1.product-title') || text(doc, 'h1');

		// Fallback to title tag
		if (!item.title) {
			let titleTag = doc.querySelector('title');
			if (titleTag) {
				item.title = titleTag.textContent.trim().replace(/ - Beta Yayıncılık$/, '');
			}
		}
	}

	// Extract metadata from various selectors
	let authorName = text(doc, '.author-info .author') || text(doc, '.author');
	if (authorName) {
		item.creators.push(ZU.cleanAuthor(cleanCreatorTitles(authorName), 'author'));
	}

	if (!item.publisher) {
		item.publisher = text(doc, '.publisher-info .publisher') || text(doc, '.publisher') || 'Beta Yayıncılık';
	}

	if (!item.ISBN) {
		item.ISBN = text(doc, '.isbn-info .isbn') || text(doc, '.isbn');
	}

	if (!item.date) {
		item.date = text(doc, '.date-info .date') || text(doc, '.date');
	}

	if (!item.edition) {
		let edition = text(doc, '.edition-info .edition') || text(doc, '.edition');
		if (edition && edition !== '1') {
			item.edition = edition;
		}
	}

	if (!item.numPages) {
		item.numPages = text(doc, '.pages-info .pages') || text(doc, '.pages');
	}

	if (!item.abstractNote) {
		item.abstractNote = text(doc, '.description .abstract')
			|| text(doc, '.abstract')
			|| attr(doc, 'meta[name="description"]', 'content');
	}

	// Extract price
	let price = text(doc, '.price-info .price') || text(doc, '.price');
	if (price) {
		item.extra = (item.extra || '') + 'Price: ' + price + '\n';
	}

	item.language = 'tr';
}

async function scrapeLegal(doc, item) {
	if (!item.title) {
		item.title = text(doc, '.headline h1');
	}

	// Extract from MARC record using the MARC translator
	let marcContent = text(doc, '#divmarc textarea');
	if (marcContent) {
		try {
			// Use the MARC translator to parse the record
			let translator = Zotero.loadTranslator('import');
			translator.setTranslator('a6ee60df-1ddc-4aae-bb25-45e0537be973'); // MARC
			translator.setString(marcContent);
			let marcItems = await translator.translate();

			if (marcItems && marcItems.length > 0) {
				let marcItem = marcItems[0];

				// Copy fields from MARC item if not already set
				if (!item.ISBN && marcItem.ISBN) {
					item.ISBN = marcItem.ISBN;
				}
				if (item.creators.length === 0 && marcItem.creators.length > 0) {
					for (let creator of marcItem.creators) {
						creator.lastName = cleanCreatorTitles(creator.lastName || '');
						creator.firstName = cleanCreatorTitles(creator.firstName || '');
						item.creators.push(creator);
					}
				}
				if (!item.publisher && marcItem.publisher) {
					item.publisher = marcItem.publisher;
				}
				if (!item.date && marcItem.date) {
					item.date = marcItem.date;
				}
				if (!item.numPages && marcItem.numPages) {
					item.numPages = marcItem.numPages;
				}
				if (!item.language && marcItem.language) {
					item.language = marcItem.language === 'tur' ? 'tr' : marcItem.language;
				}
				if (!item.edition && marcItem.edition) {
					item.edition = marcItem.edition;
				}
			}
		}
		catch (e) {
			// MARC parsing failed, continue without MARC data
			Zotero.debug('MARC parsing failed: ' + e);
		}
	}

	if (!item.abstractNote) {
		item.abstractNote = attr(doc, 'meta[name="description"]', 'content');
	}
}

async function scrapeOnikilevha(doc, item) {
	// Already handled by Book JSON-LD extraction in main scrape function

	// Extract author from HTML if not in JSON-LD
	if (item.creators.length === 0) {
		let authorName = text(doc, '.detail2 a[href*="/yazar/"]');
		if (authorName) {
			item.creators.push(ZU.cleanAuthor(cleanCreatorTitles(authorName), 'author'));
		}
	}

	if (!item.title) {
		item.title = text(doc, '.hdr h1');
	}

	// Extract price
	let priceText = text(doc, '.detail2');
	let priceMatch = priceText.match(/([\d,.]+)\s*TL/);
	if (priceMatch && priceMatch[1]) {
		item.extra = (item.extra || '') + 'Price: ' + priceMatch[1] + ' TL\n';
	}

	if (!item.abstractNote) {
		item.abstractNote = attr(doc, 'meta[name="description"]', 'content');

		// Try detailed description
		let contentDesc = text(doc, 'div[style*="text-align: justify"]');
		if (contentDesc && contentDesc.length > (item.abstractNote || '').length) {
			item.abstractNote = contentDesc;
		}
	}

	if (!item.language) {
		item.language = 'tr';
	}
}

async function scrapeHukukmarket(doc, item) {
	// Extract from common elements
	if (!item.title) {
		item.title = text(doc, 'h1') || attr(doc, 'meta[property="og:title"]', 'content');
	}

	if (!item.abstractNote) {
		item.abstractNote = attr(doc, 'meta[name="description"]', 'content');
	}

	item.language = 'tr';
}

// Helper functions

function cleanCreatorTitles(str) {
	return str.replace(/Prof\.|Doç\.|Yrd\.|Dr\.|Arş\.|Öğr\.|Gör\.|Çevirmen:|Editor:|Derleyici:/g, '');
}

function localeCapitalizeTitle(name) {
	return name
		.split(/\s+/)
		.map(part => part[0] + part.slice(1).toLocaleLowerCase('tr'))
		.join(' ');
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.filizkitabevi.com/anayasa-mahkemesi-kararlari-isiginda-infaz-hukuku-4-baski",
		"items": [
			{
				"itemType": "book",
				"title": "Anayasa Mahkemesi Kararları Işığında İnfaz Hukuku 4.BASKI",
				"creators": [
					{
						"firstName": "",
						"lastName": "Mustafa Özen",
						"creatorType": "author"
					}
				],
				"publisher": "Adalet Yayınevi",
				"ISBN": "9786253773670",
				"language": "tr"
			}
		]
	}
]
/** END TEST CASES **/
