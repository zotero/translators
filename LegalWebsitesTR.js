{
	"translatorID": "307787d2-1ec6-4623-90ed-d01ab4f2c51d",
	"label": "Legal Websites TR",
	"creator": "Mehmet Akif Petek",
	"target": "^https?://(www\.)?(kitapyurdu\.com|hukukmarket\.com|seckin\.com\.tr|yetkin\.com\.tr|filizkitabevi\.com|legal\.com\.tr|adalet\.com\.tr|betayayincilik\.com|onikilevha\.com\.tr)/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-06-19 08:50:03"
}

/*
	***** BEGIN LICENSE BLOCK *****

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
	if (url.includes('/kitap/') || url.includes('product_id') || url.includes('/medeni-hukuk/') || url.includes('seckin.com.tr') || url.includes('yetkin.com.tr') || url.includes('filizkitabevi.com') || url.includes('legal.com.tr') || url.includes('adalet.com.tr')) {
		return 'book';
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//a[contains(@href, "/kitap/")]|//a[contains(@href, "product_id")]|//a[contains(@href, "/medeni-hukuk/")]|//a[contains(@href, "yetkin.com.tr")]|//a[contains(@href, "filizkitabevi.com")]|//a[contains(@href, "legal.com.tr")]|//a[contains(@href, "adalet.com.tr")]');
	for (var i = 0; i < rows.length; i++) {
		var href = rows[i].href;
		var title = ZU.trimInternal(rows[i].textContent);
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
		scrape(doc, url);
	}
}


/*
remove titles from creators
*/
function cleanCreatorTitles(str) {
	return str.replace(/Prof.|Doç.|Yrd.|Dr.|Arş.|Öğr.|Gör.|Çevirmen:|Editor:|Derleyici:/g, '');
}

function localeCapitalizeTitle(name) {
	return name
		.split(/\s+/)
		.map(part => part[0] + part.slice(1).toLocaleLowerCase('tr'))
		.join(' ');
}

function scrape(doc, _url) {
	var item = new Zotero.Item("book");
	
	// Find the Product JSON-LD data
	let jsonLd = doc.querySelectorAll('script[type="application/ld+json"]');
	let json;
	for (let script of jsonLd) {
		try {
			let parsed = JSON.parse(script.textContent);
			if (parsed["@type"] === "Product") {
				json = parsed;
				break;
			}
		} catch (e) {
			// Skip invalid JSON
		}
	}
	
	if (json) {
		item.title = ZU.unescapeHTML(json.name);
		if (json.brand && json.brand.name) {
			let publisher = ZU.trimInternal(json.brand.name);
			item.publisher = localeCapitalizeTitle(publisher);
		}
		item.ISBN = json.gtin13;
		item.abstractNote = ZU.unescapeHTML(json.description);
	}
	
	// For seckin.com.tr, extract data from meta tags if JSON-LD doesn't have complete info
	if (_url.includes('seckin.com.tr')) {
		// Get title from meta tag if not already set
		if (!item.title) {
			var titleMeta = doc.querySelector('meta[property="og:title"]');
			if (titleMeta) {
				item.title = ZU.unescapeHTML(titleMeta.getAttribute('content'));
			}
		}
		
		// Get ISBN from meta tag
		if (!item.ISBN) {
			var isbnMeta = doc.querySelector('meta[property="book:isbn"]');
			if (isbnMeta) {
				item.ISBN = isbnMeta.getAttribute('content');
			}
		}
		
		// Get author from meta tag
		var authorMeta = doc.querySelector('meta[property="book:author"]');
		if (authorMeta) {
			var creator = cleanCreatorTitles(authorMeta.getAttribute('content'));
			item.creators.push(ZU.cleanAuthor(creator, "author"));
		}
		
		// Get description from meta tag if not already set
		if (!item.abstractNote) {
			var descMeta = doc.querySelector('meta[name="description"]');
			if (descMeta) {
				item.abstractNote = ZU.unescapeHTML(descMeta.getAttribute('content'));
			}
		}
	}
	
	// For yetkin.com.tr, extract additional data from JSON-LD and description
	if (_url.includes('yetkin.com.tr') && json) {
		// Extract ISBN from productID if available
		if (json.productID && json.productID.includes('ISBN:')) {
			item.ISBN = json.productID.replace('ISBN:', '');
		}
		
		// Extract author, edition, and other details from description
		if (json.description) {
			let desc = json.description;
			
			// Extract author (usually appears after title)
			let authorMatch = desc.match(/(?:Prof\.|Doç\.|Dr\.)\s*([A-ZÇĞIİÖŞÜ][a-zçğıiöşü]+(?:\s+[A-ZÇĞIİÖŞÜ][a-zçğıiöşü]+)*)/i);
			if (authorMatch && authorMatch[1]) {
				let creator = cleanCreatorTitles(authorMatch[0]);
				item.creators.push(ZU.cleanAuthor(creator, "author"));
			}
			
			// Extract edition
			let editionMatch = desc.match(/(\d+)\. Baskı/);
			if (editionMatch && editionMatch[1] && editionMatch[1] !== "1") {
				item.edition = editionMatch[1];
			}
			
			// Extract publication date
			let dateMatch = desc.match(/(\d{4})\/(\d{2})/);
			if (dateMatch && dateMatch[1]) {
				item.date = dateMatch[1];
			}
			
			// Extract page count
			let pageMatch = desc.match(/(\d+)\s+Sayfa/);
			if (pageMatch && pageMatch[1]) {
				item.numPages = pageMatch[1];
			}
		}
		
		// Set language to Turkish
		item.language = "tr";
	}
	
	// For filizkitabevi.com, extract data from HTML structure and data attributes
	if (_url.includes('filizkitabevi.com')) {
		// Get title from h1 if not already set
		if (!item.title) {
			var titleElem = doc.querySelector('h1.contentHeader.prdHeader');
			if (titleElem) {
				item.title = ZU.trimInternal(titleElem.textContent);
			}
		}
		
		// Get authors from prd_brand_box
		var authorElems = doc.querySelectorAll('.prd_brand_box .writer a');
		for (let i = 0; i < authorElems.length; i++) {
			let creator = cleanCreatorTitles(authorElems[i].textContent);
			item.creators.push(ZU.cleanAuthor(creator, "author"));
		}
		
		// Get publisher from prd_brand_box
		var publisherElem = doc.querySelector('.prd_brand_box .publisher a');
		if (publisherElem) {
			item.publisher = ZU.trimInternal(publisherElem.textContent);
		}
		
		// Get ISBN from data attribute or custom fields
		var prdView = doc.querySelector('.prd_view');
		if (prdView && prdView.getAttribute('data-prd-barcode')) {
			item.ISBN = prdView.getAttribute('data-prd-barcode');
		}
		
		// Extract metadata from custom fields table
		var customFields = doc.querySelectorAll('.prd_custom_fields .table-row');
		for (let i = 0; i < customFields.length; i++) {
			let label = customFields[i].querySelector('.prd-features-label');
			let value = customFields[i].querySelector('.table-cell:last-child');
			if (label && value) {
				let labelText = label.textContent.trim();
				let valueText = value.textContent.trim();
				
				if (labelText === 'Sayfa Sayısı') {
					item.numPages = valueText;
				} else if (labelText === 'Baskı') {
					if (valueText !== '1') {
						item.edition = valueText;
					}
				} else if (labelText === 'Basım Tarihi') {
					// Extract year from date like "Haziran 2025"
					let yearMatch = valueText.match(/(\d{4})/);
					if (yearMatch && yearMatch[1]) {
						item.date = yearMatch[1];
					}
				} else if (labelText === 'Dili') {
					if (valueText === 'Türkçe') {
						item.language = 'tr';
					}
				}
			}
		}
		
		// Get description from meta tag if not already set
		if (!item.abstractNote) {
			var descMeta = doc.querySelector('meta[name="description"]');
			if (descMeta) {
				item.abstractNote = ZU.unescapeHTML(descMeta.getAttribute('content'));
			}
		}
		
		// Set default language to Turkish if not set
		if (!item.language) {
			item.language = "tr";
		}
	}
	// Handle adalet.com.tr
	else if (_url.includes('adalet.com.tr')) {
		// Get title from h1 element
		var titleElem = doc.querySelector('.ProductName h1 span');
		if (titleElem) {
			item.title = titleElem.textContent.trim();
		}

		// Extract metadata from onYaziSablon section
		var onYaziSection = doc.querySelector('.onYaziSablon');
		if (onYaziSection) {
			// Get author
			var authorLink = onYaziSection.querySelector('a.yazar');
			if (authorLink) {
				var creator = cleanCreatorTitles(authorLink.textContent);
				item.creators.push(ZU.cleanAuthor(creator, "author"));
			}

			// Get publisher
			var publisherLink = onYaziSection.querySelector('a.yayinevi');
			if (publisherLink) {
				item.publisher = publisherLink.textContent.trim();
			}

			// Get ISBN
			var isbnSpan = onYaziSection.querySelector('span.isbn');
			if (isbnSpan) {
				item.ISBN = isbnSpan.textContent.trim();
			}

			// Get publication date
			var dateSpan = onYaziSection.querySelector('span.yayin_tarihi');
			if (dateSpan) {
				item.date = dateSpan.textContent.trim();
			}
		}

		// Extract additional metadata from productDetailModel JavaScript variable
		var scriptContent = doc.documentElement.innerHTML;
		var productDetailMatch = scriptContent.match(/var productDetailModel = (\{[^;]+\});/);
		if (productDetailMatch && productDetailMatch[1]) {
			try {
				var productData = JSON.parse(productDetailMatch[1]);
				
				// Get price
				if (productData.productPrice) {
					item.extra = (item.extra || '') + 'Price: ' + productData.productPrice + ' TL\n';
				}

				// Get brand name as additional publisher info
				if (productData.brandName && !item.publisher) {
					item.publisher = productData.brandName;
				}

				// Get barcode as ISBN if not already found
				if (productData.barkod && !item.ISBN) {
					item.ISBN = productData.barkod;
				}
			} catch (e) {
				// Ignore JSON parsing errors
			}
		}

		// Get description from meta tag
		var descMeta = doc.querySelector('meta[name="description"]');
		if (descMeta) {
			item.abstractNote = descMeta.getAttribute('content');
		}

		// Set default language to Turkish
		item.language = 'tr';
	}
	
	// Get product description for notes field
	var descriptionElem = doc.querySelector('.product-description');
	if (descriptionElem) {
		item.notes.push({note: descriptionElem.textContent});
	}
	
	// Get authors from the author links
	var authors = doc.querySelectorAll('.hm-product-author-top a');
	for (var i = 0; i < authors.length; i++) {
		var creator = cleanCreatorTitles(authors[i].textContent);
		item.creators.push(ZU.cleanAuthor(creator, "author"));
	}

	// Look for translators
	var translatorSection = doc.querySelector('.hm-product-cevirmen-top');
	if (translatorSection) {
		var translators = translatorSection.querySelectorAll('a');
		for (let i = 0; i < translators.length; i++) {
			let creator = cleanCreatorTitles(translators[i].textContent);
			item.creators.push(ZU.cleanAuthor(creator, "translator"));
		}
	}
	
	// Look for editors
	var editorSection = doc.querySelector('.hm-product-editor-top');
	if (editorSection) {
		var editors = editorSection.querySelectorAll('a');
		for (let i = 0; i < editors.length; i++) {
			let creator = cleanCreatorTitles(editors[i].textContent);
			item.creators.push(ZU.cleanAuthor(creator, "editor"));
		}
	}
	
	// Get edition
	var editionElem = doc.querySelector('.hm-product-baski-top');
	if (editionElem) {
		let editionText = editionElem.textContent;
		let match = editionText.match(/(\d+)\. Baskı/);
		if (match && match[1] && match[1] !== "1") {
			item.edition = match[1];
		}
	}
	
	// Set language (default to Turkish)
	item.language = "tr";
	
	// Get publication date
	var dateElem = doc.querySelector('.hm-product-basim-tarihi-top');
	if (dateElem) {
		let dateText = dateElem.textContent;
		let match = dateText.match(/(\d{4})/);
		if (match && match[1]) {
			item.date = match[1];
		}
	}
	
	// Get number of pages
	var pagesElem = doc.querySelector('.hm-product-sayfa-top');
	if (pagesElem) {
		let pagesText = pagesElem.textContent;
		let match = pagesText.match(/(\d+)\s+sayfa/);
		if (match && match[1]) {
			item.numPages = match[1];
		}
	}
	
	// Handle legal.com.tr specific extraction
	if (_url.includes('legal.com.tr')) {
		// Get title from h1.headline
		var titleElem = doc.querySelector('.headline h1');
		if (titleElem) {
			item.title = titleElem.textContent.trim();
		}

		// Extract ISBN from MARC record
		var marcText = doc.querySelector('#divmarc textarea');
		if (marcText) {
			var marcContent = marcText.textContent;
			// Extract ISBN from 020 field
			var isbnMatch = marcContent.match(/020\s+\[a\]:\s*([0-9-]+)/i);
			if (isbnMatch && isbnMatch[1]) {
				item.ISBN = isbnMatch[1].replace(/-/g, '');
			}

			// Extract author from 100 field
			var authorMatch = marcContent.match(/100\s+0\s+\[a\]:\s*(.+)/i);
			if (authorMatch && authorMatch[1]) {
				var creator = cleanCreatorTitles(authorMatch[1].trim());
				item.creators.push(ZU.cleanAuthor(creator, "author"));
			}

			// Extract publisher from 260 field
			var publisherMatch = marcContent.match(/260\s+\[a\]:[^\n]*\n\s*\[b\]:\s*(.+)/i);
			if (publisherMatch && publisherMatch[1]) {
				item.publisher = publisherMatch[1].trim();
			}

			// Extract publication date from 260 field
			var dateMatch = marcContent.match(/260\s+\[a\]:[^\n]*\n\s*\[b\]:[^\n]*\n\s*\[c\]:\s*(\d{4})/i);
			if (dateMatch && dateMatch[1]) {
				item.date = dateMatch[1];
			}

			// Extract page count from 300 field
			var pagesMatch = marcContent.match(/300\s+\[a\]:\s*(\d+)\s*s\./i);
			if (pagesMatch && pagesMatch[1]) {
				item.numPages = pagesMatch[1];
			}

			// Extract language from 041 field
			var langMatch = marcContent.match(/041\s+\[a\]:\s*(\w+)/i);
			if (langMatch && langMatch[1]) {
				if (langMatch[1] === 'tur') {
					item.language = "tr";
				} else {
					item.language = langMatch[1];
				}
			}

			// Extract edition from 250 field
			var editionMatch = marcContent.match(/250\s+\[a\]:\s*(.+)/i);
			if (editionMatch && editionMatch[1]) {
				item.edition = editionMatch[1].trim();
			}
		}

		// Get description from meta tag
		var descMeta = doc.querySelector('meta[name="description"]');
		if (descMeta) {
			item.abstractNote = descMeta.getAttribute('content');
		}
	}
	
	item.attachments.push({
		title: "Snapshot",
		document: doc
	});
		
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://hukukmarket.com/medeni-hukuk/kitap/45930-9786254328794-medeni-hukuk.html",
		"items": [
			{
				"itemType": "book",
				"title": "Medeni Hukuk",
				"creators": [
					{
						"firstName": "M. Kemal",
						"lastName": "Oğuzman",
						"creatorType": "author"
					},
					{
						"firstName": "Nami",
						"lastName": "Barlas",
						"creatorType": "author"
					}
				],
				"date": "2024",
				"ISBN": "9786254328794",
				"edition": "30",
				"language": "tr",
				"libraryCatalog": "KitapYurdu.com",
				"numPages": "425",
				"publisher": "On İki Levha Yayıncılık",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "Hocam Prof. Dr. M. Kemal Oğuzman'ın 7. basıyı yaptıktan sonra vefat etmesinin ardından, tarafımdan her baskıda belirli ölçüde genişletilerek, dili sadeleştirilerek ve yeni kanunlara, doktrin kaynaklarına ve yargı içtihatlarına göre güncellenerek 23 baskısı daha yapılan ve bugün 30. basıya ulaşan kitabımızın bu yeni basısında da, son basıdan bu yana geçen kısa süre içinde meydana gelen gelişmeler ve yenilikler kitaba işlenmiştir.(ÖNSÖZDEN)\n \nİÇİNDEKİLER\n \nBirinci Bölüm Genel Bakış §1. Medeni Hukukun Anlamı ve Konusu I. \"Hukuk\" Kavramı II. Kamu Hukuku Özel Hukuk Ayırımı III. Medeni Hukukun Anlamı IV. Medeni Hukukun Konusu §2. Medeni Hukukun Düzenleniş Tarzı Bakımından Çeşitli Sistemler I. Roma Cermen Sisteminin Etkisi Altındaki Hukuk Düzenleri II. İslam Hukukunun Etkisi Altındaki Hukuk Düzenleri III. İngiliz Hukukunun Etkisini Taşıyan Hukuk Düzenleri IV. Sosyalist Prensiplerin Etkisi Altındaki Hukuk Düzenleri V. Avrupa Birliği Hukukunda Durum §3. Bulunduğumuz Grupta Kanunlaştırma Hareketi ve İsviçre Medeni Kanunu'nun Yapılışı I. Genel Bakış II. İsviçre'de Medeni Kanunun Yapılışı §4. Türkiye'de Medeni Hukuk Alanında Kanunlaştırma Hareketleri ve Medeni Kanun I. Osmanlı İmparatorluğu Döneminde Kanunlaştırma II. Türkiye Cumhuriyeti Döneminde Kanunlaştırma Hareketi\n \nİkinci Bölüm Medeni Hukukun Yürürlük Kaynakları ve Uygulanması §1. Hukukta \"Kaynak\" Kavramı ve Medeni Hukukun Yürürlük Kaynaklarına Genel Bakış I. \"Kaynak\" Kavramı II. Medeni Hukukun Yürürlük Kaynaklarına Genel Bakış §2. Kanunlar, Tüzükler, Yönetmelikler I. Kavramlara Genel Bakış II. Yürürlüğe Koyma ve Yürürlükten Kaldırma III. Medeni Hukukla Doğrudan İlgili Temel Düzenlemeler IV. Kanunların Uygulanması §3. Örf ve Adet Hukuku I. Kavram II. Bir Örf ve Adet Hukuku Kuralının Doğumu İçin Gerekli Şartlar III. Örf ve Adet Hukukunun Rolü §4. Hakim Tarafından Yaratılan Hukuk I. Genel Bakış II. Hakimin Hukuk Yaratmasının Şartları III. Hakimin Hukuk Yaratırken Uygulayacağı Yöntem IV. Hakimin Hukuk Yaratırken Yararlanacağı İmkanlar V. Hakimin Yarattığı Hukuk Kuralının Rolü §5. Medeni Hukuk Uygulamasında Bilimsel Görüşlerin ve Yargı Kararlarının Rolü I. Genel Bakış II. Doktrinde Yer Alan Bilimsel Görüşler III. Yargısal İçtihatlar\n \nÜçüncü Bölüm Medeni Hukukun Bazı Temel Kavramları §1. \"Hak\" Kavramı I. Terim II. Hak Kavramını Açıklayan Görüşler §2. Hakların Çeşitleri I. Para ile Ölçülebilen Değeri Bulunup Bulunmaması Açısından: Malvarlığı Hakları Kişi Varlığı Hakları II. İleri Sürülebileceği Çevre Açısından: Mutlak Haklar - Nisbi Haklar III. Kullanılmasının Etkisi Bakımından: Alelade Haklar - Yenilik Doğuran Haklar IV. Kullanma Yetkisi Açısından: Kişiye Sıkı Sıkıya Bağlı Olan ve Olmayan Haklar V. Bağımsız Olup Olmama Açısından: Bağımsız Haklar - Bağlı Haklar §3. Hak Sahibi §4. Hakların Kazanılması ve Kaybedilmesi I. \"Hukuki Olay\", \"Hukuki Fiil\" ve \"Hukuki İşlem\" Kavramları II. Hakların Kazanılma (İktisap) Tarzı III. Hakların Kaybediliş Tarzı §5. Hakların Kazanılmasında İyiniyetin Rolü I. İyiniyet Kavramı II. İyiniyetin Rolü III. İyiniyetin Aranacağı Kişi ve İyiniyetin Aranacağı An IV. İyiniyetin İspatı §6. Hakların Kullanılması ve Dürüstlük Kuralına Uyma Zorunluluğu I. Genel Bakış II. Dürüstlük Kuralı III. Hakkın Kötüye Kullanılması IV. Dürüstlük Kuralı ve Hakkın Kötüye Kullanılması Yasağının Uygulama Alanı V. Medeni Kanunun 2. Maddesi Uygulanırken Göz Önünde Tutulacak Esaslar §7. Hakların Korunması I. Genel Bakış II. Talep III. Dava IV. Cebri İcra V. Hakkını Kendi Gücü ile Koruma VI. Uğranılan Zararı Tazmin Ettirme\n \nKaynaklar Kavram İndeksi Kanun Maddeleri İndeksi"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.seckin.com.tr/kitap/hukuk-davalarinda-hakimin-reddi-yasaklilik-cekinme-cekilme-ret-sebepleri-ve-ret-proseduru-mehmet-akif-tutumlu-s-p-877660362",
		"items": [
			{
				"itemType": "book",
				"title": "Hukuk Davalarında Hakimin Reddi, Mehmet Akif Tutumlu - Kitap",
				"creators": [
					{
						"firstName": "Mehmet Akif",
						"lastName": "Tutumlu",
						"creatorType": "author"
					}
				],
				"ISBN": "9789750299605",
				"abstractNote": "Çalışma, 6100 Sayılı Hukuk Muhakemeleri Kanunun 34-45. maddelerinde düzenlenen hâkimin davaya bakmaktan yasaklılığı ve r",
				"language": "tr",
				"libraryCatalog": "KitapYurdu.com",
				"publisher": "Seçkin Yayıncılık Sanayi ve Ticaret A.ş.",
				"attachments": [
					{
						"title": "Snapshot",
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
		"url": "https://yetkin.com.tr/idari-yargilama-hukuku-9932",
		"items": [
			{
				"itemType": "book",
				"title": "İdari Yargılama Hukuku",
				"creators": [
					{
						"firstName": "",
						"lastName": "Dr",
						"creatorType": "author"
					}
				],
				"date": "2025",
				"ISBN": "9786050522211",
				"abstractNote": "İdari Yargılama Hukuku Prof. Dr. Ali ULUSOY 2025/06 4. Baskı,252 Sayfa ISBN 9786050522211 \"İdari Yargılama Hukuku\" isimli bu çalışma Ocak 20",
				"edition": "4",
				"language": "tr",
				"libraryCatalog": "KitapYurdu.com",
				"numPages": "252",
				"publisher": "Yetkin Yayınları",
				"attachments": [
					{
						"title": "Snapshot",
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
		"url": "https://www.filizkitabevi.com/ortakligin-giderilmesi-davalari-13-baski",
		"items": [
			{
				"itemType": "book",
				"title": "Ortaklığın Giderilmesi Davaları 13.BASKI",
				"creators": [],
				"date": "2025",
				"ISBN": "9786253811136",
				"abstractNote": "Ortaklığın Giderilmesi Davaları 13.BASKI Ortaklığın giderilmesi davası; hisseli mülkiyette, kısaca paylı veya elbirliği mülkiyetine konu taşınır veya taşınmaz m",
				"edition": "13",
				"language": "tr",
				"libraryCatalog": "KitapYurdu.com",
				"numPages": "1264",
				"attachments": [
					{
						"title": "Snapshot",
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
		"url": "https://legal.com.tr/kitaplar/urun/vergi-hukuku-sempozyumu/369221",
		"items": [
			{
				"itemType": "book",
				"title": "Vergi Hukuku Sempozyumu",
				"creators": [
					{
						"firstName": "Hakan",
						"lastName": "Üzeltürk",
						"creatorType": "author"
					}
				],
				"date": "2025",
				"ISBN": "9786256580923",
				"abstractNote": "Hukuk Kitapları ve Dergilerine her ortamdan erişin. Online Kitap / Online Dergi / Basılı Yayın",
				"edition": "1. Baskı",
				"language": "tr",
				"libraryCatalog": "KitapYurdu.com",
				"numPages": "95",
				"publisher": "Legal Yayınevi",
				"attachments": [
					{
						"title": "Snapshot",
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
