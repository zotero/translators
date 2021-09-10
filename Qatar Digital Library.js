{
	"translatorID": "f8c30c62-89a3-45d6-9c48-16c48ad6ba3c",
	"label": "Qatar Digital Library",
	"creator": "Abe Jellinek",
	"target": "^https?://(www\\.)?qdl\\.qa/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-07-08 23:32:09"
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


function detectWeb(doc, url) {
	if (url.includes('/archive/') && doc.querySelector('.page-title h1')) {
		let type = text(doc, 'a[href*="source_content_type"]').toLowerCase();
		switch (type) {
			case 'archival file':
			case 'ملف أرشيفي':
			case 'archival item':
			case 'مادة أرشيفية':
			case 'letter book':
			case 'مجلد مراسلات':
			case 'book':
			case 'كتب':
			case 'volume':
			case 'مجلد':
			case 'diary':
			case 'مذكرات':
			case 'journal':
			case 'دورية':
				return 'book';
			case 'letter':
			case 'رسالة':
				return 'letter';
			case 'map':
			case 'خرائط':
			case 'plan':
			case 'خريطة':
				return 'map';
			case 'photograph':
			case 'صورة فوتوغرافية':
			case 'drawing':
			case 'رسم تخطيطي':
			case 'illustration':
			case 'رسم':
			case 'painting':
			case 'لوحة':
			case 'print':
			case 'مطبوعة':
			case 'diagram':
			case 'رسم توضيحي':
			case 'رسم بياني':
				return 'artwork';
			case 'manuscript item':
			case 'مادة من مخطوطة':
			case 'manuscript':
			case 'مخطوطة':
			case 'مخطوطات':
			case 'note':
			case 'مذكرة':
				return 'manuscript';
			case 'report':
			case 'تقرير':
				return 'report';
			case 'list':
			case 'قائمة':
			case 'statistical table':
			case 'جدول إحصاء':
			case 'certificate':
			case 'شهادة':
			case 'appendix':
			case 'ملحق':
				return 'document';
			case 'newspaper clipping':
			case 'قصاصة صحفية':
			case 'newspaper article':
			case 'مقال صحفي':
				return 'newspaperArticle';
			case 'journal article':
			case 'مقال':
				return 'journalArticle';
			default:
				Z.debug('Unmapped type: ' + type);
				return 'document';
		}
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('h3 > a[href*="/archive/"]');
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

function scrape(doc, url) {
	let item = new Zotero.Item(detectWeb(doc, url));
	item.extra = '';
	
	let iiifURL = attr(doc, 'a.iiif_link', 'href');
	ZU.doGet(iiifURL, function (respText) {
		let json = JSON.parse(respText);
		
		item.title = json.label['@value'].replace(/(^')|('$)/g, '');
		item.abstractNote = ZU.trimInternal(json.description['@value']);
		
		for (let meta of json.metadata) {
			addMetadata(item, meta.label['@value'], meta.value['@value']);
		}
		
		for (let labelElem of doc.querySelectorAll('dt')) {
			let label = labelElem.innerText.trim();
			let value = labelElem.nextSibling.innerText;
			let rawValue = labelElem.nextSibling.innerHTML;
			
			addMetadataFromPage(item, label, value, rawValue);
		}
		
		let pdfLink = doc.querySelector('.pdf-download a');
		if (pdfLink) {
			let pdfLinkText = pdfLink.innerText
				.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
			if ((pdfLinkText.match(/(\d+) (MB|ميجإبايت)/) || [])[1] < 100) {
				item.attachments.push({
					title: 'Full Text PDF',
					mimeType: 'application/pdf',
					url: pdfLink.href
				});
			}
			else {
				// if the PDF is huge, just send an empty URL to get the red X
				// and explain in the attachment title field
				item.attachments.push({
					title: 'Full Text PDF (too large)',
					mimeType: 'application/pdf',
					url: ''
				});
			}
		}
		
		item.complete();
	});
}

function addMetadata(item, label, value) {
	switch (label) {
		case 'Qatar Digital Library link':
		case 'رابط مكتبة قطر الرقمية':
			item.url = (value.match(/https?:\/\/[^"]+/) || [])[0];
			break;
		case 'Original held at':
		case 'الأصل محفوظ في':
			item.archive = value;
			break;
		case 'Archive reference':
		case 'رقم الاستدعاء':
			item.archiveLocation = value;
			break;
		case 'Original language':
		case 'اللغة الأصلية':
			item.language = value;
			break;
		case 'Date':
		case 'التاريخ':
			item.date = ZU.strToISO(value);
			break;
		case 'Arrangement':
		case 'Physical characteristics':
		case 'الترتيب':
		case 'الخصائص المادية':
			item.notes.push({ note: cleanNote(value) });
			break;
		case 'Type':
			// Type metadata from page is better
			break;
		default:
			Z.debug(`Unknown metadata: ${label} = ${value}`);
	}
}

function addMetadataFromPage(item, label, value, rawValue) {
	switch (label) {
		case 'Content':
		case 'المحتوى':
			item.notes.push({ note: cleanNote(rawValue) });
			break;
		case 'Author':
		case 'المؤلف':
			if (value.includes('Please see item description')
				|| value.startsWith('Unknown')) {
				break;
			}
			
			item.creators.push({
				lastName: value,
				creatorType: 'author',
				fieldMode: 1
			});
			
			break;
		case 'Usage terms':
		case 'شروط الاستخدام':
			item.rights = value;
			break;
		case 'Degree coordinates':
		case 'الإحداثيات':
			item.notes.push({ note: `<h1>Map coordinates</h1>\n${rawValue}` });
			break;
		case 'Type':
		case 'النوع':
			item.extra += `Genre: ${value}\n`;
			break;
	}
}

function cleanNote(note) {
	return note.trim()
		.replace(/\n\s+/g, '\n')
		.replace(/class="RightToLeft"/g, 'dir="rtl"')
		.replace(/class="LeftToRight"/g, 'dir="ltr"');
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.qdl.qa/en/archive/81055/vdc_100085203762.0x000001",
		"items": [
			{
				"itemType": "book",
				"title": "The Transactions of the Bombay Geographical Society. From May 1857 to May 1858. (New Issue.) Edited by the Secretary. Volume XIV.",
				"creators": [
					{
						"lastName": "Bombay Geographical Society",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "1857",
				"abstractNote": "The Transactions of the Bombay Geographical Society. From May 1857 to May 1858. (New Issue.) Edited by the Secretary. Volume XIV. Publication details: Bombay: Smith, Taylor & Co., 1859. With maps and drawings.",
				"archive": "British Library: India Office Records and Private Papers",
				"archiveLocation": "ST 393, vol 14",
				"extra": "Genre: Archival file",
				"language": "English in Latin script",
				"libraryCatalog": "Qatar Digital Library",
				"rights": "Public Domain",
				"url": "https://www.qdl.qa/en/archive/81055/vdc_100085203762.0x000001",
				"attachments": [
					{
						"title": "Full Text PDF (too large)",
						"mimeType": "application/pdf",
						"url": ""
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "This volume contains a table of contents giving headings and page references. There is an index to Volumes I-XVII (1836-1864) in a separate volume (ST 393, index)."
					},
					{
						"note": "Dimensions: 220 x 140mm"
					},
					{
						"note": "<p> <em>The Transactions of the Bombay Geographical Society. From May 1857 to May 1858. (New Issue.) Edited by the Secretary. Volume XIV.</em> </p><p>Publication details: Bombay: Smith, Taylor &amp; Co., 1859.</p><p>With maps and drawings.</p>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.qdl.qa/en/archive/81055/vdc_100038378586.0x0000bf",
		"items": [
			{
				"itemType": "letter",
				"title": "Copy of a Letter from HM Envoy Extraordinary and Minister Plenipotentiary to Persia, Sir Harford Jones, to Brigadier-General Sir John Malcolm",
				"creators": [
					{
						"lastName": "East India Company, the Board of Control, the India Office, or other British Government Department",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "1810-06-15",
				"abstractNote": "Copy of a letter from HM Envoy Extraordinary and Minister Plenipotentiary to Persia [Iran], Sir Harford Jones, to the British Government of India's Envoy to Persia, Brigadier-General Sir John Malcolm, dated 15 June 1810, in reply to Malcolm's letter of 10 June 1810. The letter concerns Malcolm's admission to the camp of the court of the Shah of Persia. The letter also accounts for an incident in which Malcolm opened one of Jones's packets to the Resident at Bushire. The letter was enclosed in Jones's letter to the Secret Committee of the East India Company of 13 July 1810, which was received on 21 November 1810.",
				"archive": "British Library: India Office Records and Private Papers",
				"archiveLocation": "IOR/L/PS/9/68/48",
				"extra": "Genre: Letter",
				"language": "English in Latin script",
				"libraryCatalog": "Qatar Digital Library",
				"rights": "Open Government Licence",
				"url": "https://www.qdl.qa/en/archive/81055/vdc_100038378586.0x0000bf",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "<p>Copy of a letter from HM Envoy Extraordinary and Minister Plenipotentiary to Persia [Iran], Sir Harford Jones, to the British Government of India's Envoy to Persia, Brigadier-General Sir John Malcolm, dated 15 June 1810, in reply to Malcolm's letter of 10 June 1810. The letter concerns Malcolm's admission to the camp of the court of the Shah of Persia. The letter also accounts for an incident in which Malcolm opened one of Jones's packets to the Resident at Bushire. The letter was enclosed in Jones's letter to the Secret Committee of the East India Company of 13 July 1810, which was received on 21 November 1810.</p>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.qdl.qa/en/archive/81055/vdc_100000001878.0x000290",
		"items": [
			{
				"itemType": "book",
				"title": "‘Imaum of Muscat’s wish to return the “Prince Regent Yacht”’",
				"creators": [
					{
						"lastName": "Āl Bū Sa‘īd, Sayyid Sa‘īd bin Sulṭān",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"lastName": "East India Company, the Board of Control, the India Office, or other British Government Department",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "1838-03-11",
				"abstractNote": "The item consists of copies and extracts of correspondence and minutes enclosed with a political letter from the Government of Bombay [Mumbai] to the Court of Directors of the East India Company. The item relates to the Imaum [Imam] of Muscat’s (also written as Muskat) request that the yacht, the , recently gifted to him by King William IV, should be taken from him as he fears it will become spoiled if it remains in his possession. Prince Regent The item consists of copies and extracts of correspondence and minutes enclosed with a political letter from the Government of Bombay [Mumbai] to the Court of Directors of the East India Company. The item relates to the Imaum [Imam] of Muscat’s (also written as Muskat) request that the yacht, the , recently gifted to him by King William IV, should be taken from him as he fears it will become spoiled if it remains in his possession. The title page of the item contains the following references: ‘Bombay Political Department’, ‘P.C. [Previous Communication] 2540, Draft 81, 1840’, ‘Collection No. 17’, and ‘Examiner’s Office’.",
				"archive": "British Library: India Office Records and Private Papers",
				"archiveLocation": "IOR/F/4/1797/73821",
				"extra": "Genre: Archival item",
				"language": "English in Latin script",
				"libraryCatalog": "Qatar Digital Library",
				"rights": "Open Government Licence",
				"url": "https://www.qdl.qa/en/archive/81055/vdc_100000001878.0x000290",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "The papers are arranged in approximate chronological order from the front to the rear of the item. The item also contains a table of contents (f 307), noting ‘Page’, ‘Date’, ‘From’ and ‘To’."
					},
					{
						"note": "Foliation: the foliation sequence for this description (used for referencing) commences at f 302, and terminates at f 307, as it is part of a larger physical volume; these numbers are written in pencil, are circled, and are located in the bottom right corner of the recto side of each folio. Pagination: the item also contains an original pagination sequence."
					},
					{
						"note": "<p>The item consists of copies and extracts of correspondence and minutes enclosed with a political letter from the Government of Bombay [Mumbai] to the Court of Directors of the East India Company. The item relates to the Imaum [Imam] of Muscat’s (also written as Muskat) request that the yacht, the <em>Prince Regent</em> , recently gifted to him by King William IV, should be taken from him as he fears it will become spoiled if it remains in his possession.</p><p>The title page of the item contains the following references: ‘Bombay Political Department’, ‘P.C. [Previous Communication] 2540, Draft 81, 1840’, ‘Collection No. 17’, and ‘Examiner’s Office’.</p>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.qdl.qa/en/archive/81055/vdc_100032582181.0x000001",
		"items": [
			{
				"itemType": "manuscript",
				"title": "Sharḥ al-Mulakhkhaṣ fī al-hay’ah شرح الملخص في الهيئة  Jurjānī, ‘Alī ibn Muḥammad جرجاني، علي بن محمد  and  al-Mulakhkhaṣ fī ‘ilm al-hay’ah al-basīṭah الملخص في علم الهيئة البسيطة  Maḥmūd ibn Muḥammad al-Jaghmīnī محمود بن محمد الجغميني",
				"creators": [],
				"abstractNote": "Contents: (1) al-Jurjānī, ʿAlī ibn Muḥammad (الجرجاني، علي بن محمد), (شرح الملخص في الهيئة; ff 2r-65v); Sharḥ al-Mulakhkhaṣ fī al-hayʾah (1) al-Jurjānī, ʿAlī ibn Muḥammad (الجرجاني، علي بن محمد), (شرح الملخص في الهيئة; ff 2r-65v); (2) al-Jaghmīnī, Maḥmūd ibn Muḥammad (الجغميني، محمود بن محمد), (الملخص في علم الهيئة البسيطة; ff 66v-86r). al-Mulakhkhaṣ fī ‘ilm al-hay’ah al-basīṭah (2) al-Jaghmīnī, Maḥmūd ibn Muḥammad (الجغميني، محمود بن محمد), (الملخص في علم الهيئة البسيطة; ff 66v-86r).",
				"archive": "British Library: Oriental Manuscripts",
				"archiveLocation": "Add MS 23398",
				"extra": "Genre: Manuscript",
				"language": "Arabic in Arabic script",
				"libraryCatalog": "Qatar Digital Library",
				"rights": "Public Domain",
				"url": "https://www.qdl.qa/en/archive/81055/vdc_100032582181.0x000001",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "Material: Eastern laid paper Dimensions: 171 x 128 mm leaf [135 x 105 mm written] Foliation: British Museum foliation in pencil / India Office Library foliation stamped in black ink Ruling: No ruling visible; 21 lines per page; vertical spacing 16 lines per 10 cm Script:\nNaskh Script:\nInk: Black ink, with rubricated headings, diagrams in red and some overlinings in red Binding: Morocco leather Islamic binding without flap; blind tooled medallion, pendants and borders on both boards Condition: Folio(s) missing from beginning of volume; some water (oil?) damage especially towards end of volume Marginalia: Many by multiple hands (see e.g. ff 2-5) Seals: f. 86r"
					},
					{
						"note": "<p>Contents:</p><ul><li>(1) al-Jurjānī, ʿAlī ibn Muḥammad (الجرجاني، علي بن محمد), <em>Sharḥ al-Mulakhkhaṣ fī al-hayʾah</em> (شرح الملخص في الهيئة; ff 2r-65v);</li><li>(2) al-Jaghmīnī, Maḥmūd ibn Muḥammad (الجغميني، محمود بن محمد), <em>al-Mulakhkhaṣ fī ‘ilm al-hay’ah al-basīṭah</em> (الملخص في علم الهيئة البسيطة; ff 66v-86r).</li></ul>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.qdl.qa/en/archive/81055/vdc_100098585763.0x000001",
		"items": [
			{
				"itemType": "map",
				"title": "The Transactions of the Bombay Geographical Society. From January 1863 to December 1864. (Edited by the Secretary.) Volume XVII.",
				"creators": [
					{
						"lastName": "Bombay Geographical Society",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "1863",
				"abstractNote": "The Transactions of the Bombay Geographical Society. From January 1863 to December 1864. (Edited by the Secretary.) Volume XVII. Publication details: Bombay: Printed at the Education Society's Press, Byculla, 1865. With maps, etc.",
				"archive": "British Library: India Office Records and Private Papers",
				"archiveLocation": "ST 393, vol 17",
				"extra": "Genre: Map",
				"language": "English in Latin script",
				"libraryCatalog": "Qatar Digital Library",
				"rights": "Public Domain",
				"url": "https://www.qdl.qa/en/archive/81055/vdc_100085203917.0x000001",
				"attachments": [
					{
						"title": "Full Text PDF (too large)",
						"mimeType": "application/pdf",
						"url": ""
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "This volume contains a table of contents giving headings and page references, and two indexes. There is an index to Volumes I-XVII (1836-1864) in a separate volume (ST 393, index)."
					},
					{
						"note": "Dimensions: 220 x 140mm"
					},
					{
						"note": "<p>The map accompanies <em>The Transactions of the Bombay Geographical Society. From January 1863 to December 1864. (Edited by the Secretary.) Volume XVII</em> : Article XX (pages 302-320), entitled 'Report on Dhur Yaroo in the Shikarpoor Collectorate. By Assistant Surgeon J Lalor, BA.'</p><p>Map of the Dhar Yaro Plateau (referred to the accompanying article as 'Dhur Yaroo') in the Hala Range, Larkhana District, Sind [Sindh]. The map indicates hydrology and structures. Relief is indicated by hachures.</p><p>Scale: five miles = 62mm.</p>"
					},
					{
						"note": "<h1>Map coordinates</h1>\nTop-left: 28° 29' 44.16\" N, 66° 25' 55.92\" E<br>Top-right: 28° 29' 44.16\" N, 71° 7' 32.88\" E<br>Bottom-left: 23° 32' 21.84\" N, 66° 25' 55.92\" E<br>Bottom-right: 23° 32' 21.84\" N, 71° 7' 32.88\" E<br>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.qdl.qa/en/archive/81055/vdc_100023299128.0x000001",
		"items": [
			{
				"itemType": "artwork",
				"title": "Minaret in Ormuz",
				"creators": [],
				"date": "1870",
				"abstractNote": "Genre/Subject Matter: This photograph shows a dilapidated tower or minaret on the island of Hormuz off the coast of Bandar Abbas. To the left in the background several reed or palm-frond structures are visible while to the right there is a white-washed, one-storey building. Two European men wearing pith helmets are seated at the foot of the tower. A third man stands in the large central opening near the top of the tower while a fourth man's head is visible behind him. Inscriptions: Upper right, in pencil alongside image: '48', 'a' Below image, in pen: 'Minaret in Ormuz' Below pen inscription, in pencil: '(Hormuz)'",
				"archive": "British Library: Visual Arts",
				"archiveLocation": "Photo 355/1(48)",
				"extra": "Genre: Photograph",
				"language": "English in Latin script",
				"libraryCatalog": "Qatar Digital Library",
				"rights": "Public Domain",
				"url": "https://www.qdl.qa/en/archive/81055/vdc_100023299128.0x000001",
				"attachments": [
					{
						"title": "Full Text PDF (too large)",
						"mimeType": "application/pdf",
						"url": ""
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "Dimensions: \n209 x 133 mm \nFormat: \nAlbumen print on paper \nCondition: \nThe print is in good condition with staining in the sky area, particularly in the upper left and lower left corner, and minor surface dirt throughout. \nFoliation: \n‘a’ (crossed out); ‘48’ \nProcess: \nAlbumen print"
					},
					{
						"note": "<p> <em>Genre/Subject Matter:</em> </p><p>This photograph shows a dilapidated tower or minaret on the island of Hormuz off the coast of Bandar Abbas.</p><p>To the left in the background several reed or palm-frond structures are visible while to the right there is a white-washed, one-storey building.</p><p>Two European men wearing pith helmets are seated at the foot of the tower. A third man stands in the large central opening near the top of the tower while a fourth man's head is visible behind him.</p><p> <em>Inscriptions:</em> </p><p>Upper right, in pencil alongside image: '48', 'a'</p><p>Below image, in pen: 'Minaret in Ormuz'</p><p>Below pen inscription, in pencil: '(Hormuz)'</p>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.qdl.qa/en/archive/81055/vdc_100000000653.0x00017d",
		"items": [
			{
				"itemType": "manuscript",
				"title": "Miscellany of texts on gemstones, Ottoman sultans, and herbs",
				"creators": [],
				"date": "1595",
				"abstractNote": "An anonymous notebook containing texts on gemstones, Ottoman sultans, and herbs, interspersed with notes and a prayer. Divisions of the text: (1) Lughat al-jawhar wa-asmāʾ al-jawāhir wa-manāfiʿihā (كتاب لغة الجوهر واسماء الجواهر ومنافعها, ff.1v-20v); A text enumerating different types of gemstones including rubies, emeralds, topaz, diamonds, turquoise, agate, magnetite, emery, and lapis lazuli, as well as pearls and coral. Their qualities, variants, colours, values, and medical uses are listed. The text is interrupted by a page of notes (f. 5r) comprising an account of Noah's ark, a calligraphic exercise, notes on the ascendant planets governing days of the week, and a list of herbal ingredients including opium, saffron and henbane. (2) Tawārīkh salṭanat IbnʿUthmān (تواريخ سلطنة ابن عثمان, f.21r-21v); A list of the Ottoman Sultans from ʿUthmān I, with notes of feats including the conquests of Istanbul, Aleppo and Cyprus. Accession dates and lengths of rule are given up to the end of Sultan Murād III's (مراد) reign in 1595. The accession of Muḥammad III (محمد, r. 1595-1603) is also recorded. A note of ingredients for manufacturing soap (f. 21v), followed by a continuation of (1) Lughat al-jawhar wa-asmāʾ al-jawāhir wa-manāfiʿihā (f. 22r), about magnetite; (3) Maʿrifat al-ʿushb (معرفة العشب, ff. 22v-25r); A text on the properties, origins, and values of different plants and herbs with instructions for their alchemical use. (4) f. 26v-26r: A prayer. The volume is decorated with a roughly-executed frontispiece in gold, green, red and blue, with lettering in red (f. 1v); and a diagram of a talismanic engraving in gold, green and blue, depicting a triangle enclosed in a circle with lettering indicated in red (f. 7v). Begins (f. 1r, lines 1-4): بسم الله الرحمن الرحيم وبه نستعين نكتب لغة الجوهر وأسماء الجواهر ومنافعها أول اسم عام لجميع الأحجر المعدنية النفيسة... Ends (f. 26r, lines 3-4): ارحمني وعلمني صلاحاً وادباً ومعرفة فاني امنت بوصاياك",
				"archive": "British Library: Western Manuscripts",
				"archiveLocation": "Sloane MS 2696",
				"extra": "Genre: Manuscript",
				"language": "Arabic in Arabic script",
				"libraryCatalog": "Qatar Digital Library",
				"rights": "Public Domain",
				"url": "https://www.qdl.qa/en/archive/81055/vdc_100000000653.0x00017d",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "Material: A mixture of Eastern and Western laid paper, some repurposed from larger sheets. Dimensions: 77 x 61 mm leaf [69 x 56 mm written] Foliation: British Museum foliation in pencil Ruling: No ruling for main text; perpendicular\nrulings at larger dimensions visible on some blank folios. 12-14 lines per page, variable. misṭarah Ruling: No ruling for main text; perpendicular\nrulings at larger dimensions visible on some blank folios. 12-14 lines per page, variable. Script: Naskh Ink: Black ink; calligraphic exercise on f. 5r in light brown ink Decoration: Frontispiece (f. 1r) and diagram (f. 7r); see Content. Binding: Vertical format British Museum brown leather binding gold-stamped with M. B. (Museum Brittanicum) Condition: Good, some dirt. Marginalia: Latin notes: 'Libellus de Gemmis; no. 41; Parandis medicamentis juxta dispositionem astrorum. (f. 27v) Seals: British Museum seals (ff. 1v, 26r, 27v)."
					},
					{
						"note": "<p>An anonymous notebook containing texts on gemstones, Ottoman sultans, and herbs, interspersed with notes and a prayer.</p><p>Divisions of the text:</p><ul><li>(1) Lughat al-jawhar wa-asmāʾ al-jawāhir wa-manāfiʿihā (كتاب لغة الجوهر واسماء الجواهر ومنافعها, ff.1v-20v);</li></ul><p>A text enumerating different types of gemstones including rubies, emeralds, topaz, diamonds, turquoise, agate, magnetite, emery, and lapis lazuli, as well as pearls and coral. Their qualities, variants, colours, values, and medical uses are listed. The text is interrupted by a page of notes (f. 5r) comprising an account of Noah's ark, a calligraphic exercise, notes on the ascendant planets governing days of the week, and a list of herbal ingredients including opium, saffron and henbane.</p><ul><li>(2) Tawārīkh salṭanat IbnʿUthmān (تواريخ سلطنة ابن عثمان, f.21r-21v);</li></ul><p dir=\"rtl\">A list of the Ottoman Sultans from ʿUthmān I, with notes of feats including the conquests of Istanbul, Aleppo and Cyprus. Accession dates and lengths of rule are given up to the end of Sultan Murād III's (مراد) reign in 1595. The accession of Muḥammad III (محمد, r. 1595-1603) is also recorded. A note of ingredients for manufacturing soap (f. 21v), followed by a continuation of (1) Lughat al-jawhar wa-asmāʾ al-jawāhir wa-manāfiʿihā (f. 22r), about magnetite;</p><ul><li>(3) Maʿrifat al-ʿushb (معرفة العشب, ff. 22v-25r);</li></ul><p>A text on the properties, origins, and values of different plants and herbs with instructions for their alchemical use.</p><ul><li>(4) f. 26v-26r: A prayer.</li></ul><p>The volume is decorated with a roughly-executed frontispiece in gold, green, red and blue, with lettering in red (f. 1v); and a diagram of a talismanic engraving in gold, green and blue, depicting a triangle enclosed in a circle with lettering indicated in red (f. 7v).</p><p></p><p>Begins (f. 1r, lines 1-4):</p><p dir=\"rtl\">بسم الله الرحمن الرحيم وبه نستعين</p><p dir=\"rtl\">نكتب لغة الجوهر وأسماء الجواهر ومنافعها</p><p dir=\"rtl\">أول اسم عام لجميع الأحجر المعدنية</p><p dir=\"rtl\">النفيسة...</p><p></p><p>Ends (f. 26r, lines 3-4):</p><p dir=\"rtl\">ارحمني وعلمني صلاحاً وادباً ومعرفة</p><p dir=\"rtl\">فاني امنت بوصاياك</p><p></p>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.qdl.qa/en/archive/81055/vdc_100040139751.0x000023",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Coll 5/39 ‘Flights of RAF aeroplanes to Gilgit; flights of foreign aircraft over Gilgit and Chitral’",
				"creators": [
					{
						"lastName": "Royal Air Force",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "1932-12-28",
				"abstractNote": "The file is concerned with aviation in Gilgit, Hunza, Mir, and the surrounding area. It primarily covers three topics. The first topic is the matter of annual Royal Air Force (RAF) flights to Gilgit over the Himalayas in 1932, 1934, 1935, and 1936. It includes a report on the 1934 flight (see folios 132-141), a report on the 1935 flight (see folios 114-129), and a memorandum on proposals for the 1936 flight (see folios 106-107). A couple of sketch maps have been included to accompany these reports: see folios 104 and 117. Forty-five aerial photographic prints from the flight in November 1934 have also been included: see folios 159-203. Press excerpts of coverage of the first flight over the Himalayas in November 1932 can be found towards the back of the file: cuttings from 28 December 1932 (folios 151-154); 1932 (folio 146); 19 January 1932 (folio 145); and the 18 January 1933 (folio 144). It also includes a report of the visit by Air Marshall Sir Edgar Ludlow-Hewitt to Gilgit between 21 and 24 October 1936: see folios 98-99. The Times, The first topic is the matter of annual Royal Air Force (RAF) flights to Gilgit over the Himalayas in 1932, 1934, 1935, and 1936. It includes a report on the 1934 flight (see folios 132-141), a report on the 1935 flight (see folios 114-129), and a memorandum on proposals for the 1936 flight (see folios 106-107). A couple of sketch maps have been included to accompany these reports: see folios 104 and 117. Forty-five aerial photographic prints from the flight in November 1934 have also been included: see folios 159-203. Press excerpts of coverage of the first flight over the Himalayas in November 1932 can be found towards the back of the file: cuttings from 28 December 1932 (folios 151-154); 1932 (folio 146); 19 January 1932 (folio 145); and the 18 January 1933 (folio 144). It also includes a report of the visit by Air Marshall Sir Edgar Ludlow-Hewitt to Gilgit between 21 and 24 October 1936: see folios 98-99. The Times of India Mail Edition, The first topic is the matter of annual Royal Air Force (RAF) flights to Gilgit over the Himalayas in 1932, 1934, 1935, and 1936. It includes a report on the 1934 flight (see folios 132-141), a report on the 1935 flight (see folios 114-129), and a memorandum on proposals for the 1936 flight (see folios 106-107). A couple of sketch maps have been included to accompany these reports: see folios 104 and 117. Forty-five aerial photographic prints from the flight in November 1934 have also been included: see folios 159-203. Press excerpts of coverage of the first flight over the Himalayas in November 1932 can be found towards the back of the file: cuttings from 28 December 1932 (folios 151-154); 1932 (folio 146); 19 January 1932 (folio 145); and the 18 January 1933 (folio 144). It also includes a report of the visit by Air Marshall Sir Edgar Ludlow-Hewitt to Gilgit between 21 and 24 October 1936: see folios 98-99. The Near East and India, The first topic is the matter of annual Royal Air Force (RAF) flights to Gilgit over the Himalayas in 1932, 1934, 1935, and 1936. It includes a report on the 1934 flight (see folios 132-141), a report on the 1935 flight (see folios 114-129), and a memorandum on proposals for the 1936 flight (see folios 106-107). A couple of sketch maps have been included to accompany these reports: see folios 104 and 117. Forty-five aerial photographic prints from the flight in November 1934 have also been included: see folios 159-203. Press excerpts of coverage of the first flight over the Himalayas in November 1932 can be found towards the back of the file: cuttings from 28 December 1932 (folios 151-154); 1932 (folio 146); 19 January 1932 (folio 145); and the 18 January 1933 (folio 144). It also includes a report of the visit by Air Marshall Sir Edgar Ludlow-Hewitt to Gilgit between 21 and 24 October 1936: see folios 98-99. Birmingham Post, The first topic is the matter of annual Royal Air Force (RAF) flights to Gilgit over the Himalayas in 1932, 1934, 1935, and 1936. It includes a report on the 1934 flight (see folios 132-141), a report on the 1935 flight (see folios 114-129), and a memorandum on proposals for the 1936 flight (see folios 106-107). A couple of sketch maps have been included to accompany these reports: see folios 104 and 117. Forty-five aerial photographic prints from the flight in November 1934 have also been included: see folios 159-203. Press excerpts of coverage of the first flight over the Himalayas in November 1932 can be found towards the back of the file: cuttings from 28 December 1932 (folios 151-154); 1932 (folio 146); 19 January 1932 (folio 145); and the 18 January 1933 (folio 144). It also includes a report of the visit by Air Marshall Sir Edgar Ludlow-Hewitt to Gilgit between 21 and 24 October 1936: see folios 98-99. The second topic is reports of violations of the northern frontier of British India by foreign – mainly German and Russian – aircraft. Correspondence in the file documents investigations into these reports and subsequent action taken. The third topic is a reconnaissance of the Hunza Valley in 1937 to identify a site for a landing ground, the selection of Pasu, and the postponement of the project by the Government of India. The main correspondents are as follows: officials of the Foreign and Political Department of the Government of India (External Affairs Department from 1937), the Political Resident at Kashmir, the Political Agent at Gilgit, HM Consul General at Kashgar, and HM Minister at Kabul. Only occasional reference is made to the India Office in London. The file includes a divider which gives a list of correspondence references contained in the file by year. This is placed at the back of the correspondence.",
				"archive": "British Library: India Office Records and Private Papers",
				"archiveLocation": "IOR/L/PS/12/1993",
				"extra": "Genre: Newspaper clipping",
				"language": "English in Latin script",
				"libraryCatalog": "Qatar Digital Library",
				"rights": "Public Domain",
				"url": "https://www.qdl.qa/en/archive/81055/vdc_100000000555.0x000213",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "The papers are arranged in approximate chronological order from the rear to the front of the file. An envelope containing photographic prints has been filed at the rear of the file."
					},
					{
						"note": "Foliation: the foliation sequence for this description commences at the inside front cover with 1, and terminates at the last folio with 205; these numbers are written in pencil, are circled, and are located in the top right corner of the recto side of each folio. A previous foliation sequence, which is also circled, has been superseded and therefore crossed out. Folio 158 was a conservation box, which was removed when the photographic prints (ff 159-203) were rehoused in polyester sheets. Folio number 158 is therefore no longer used."
					},
					{
						"note": "<p>Newspaper cuttings from <em>The Times</em> newspaper article, 28 December 1932, covering a Royal Air Force demonstration flight over the Himalayas in November 1932. This folio includes the headline and a print of an aerial photograph – taken during the course of the flight – showing an RAF Hawker Hart flying against the mountains.</p><p>The flight did not fly over Mount Rakaposhi as claimed by the article.</p>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.qdl.qa/en/archive/81055/vdc_100023442788.0x000001",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Russia in Asia - Growing influence of Europe on Asia",
				"creators": [
					{
						"lastName": "Revue des Deux Mondes",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "1858",
				"abstractNote": "The file contains journal articles, correspondence, papers and memorandum relating to russian involvement in Asia 1850s-1860s and Pelly's mission to Herat and Afghanistan in 1760. The material relating to Russian involvement and influences in Asia primarily consists of journal articles, in french, from the journal looking at Russian expansion into both the Caucasus and the Far East, along with a newspaper article and handwritten observations made by Lewis Pelly. There is also an article in french from the same journal regarding French interests in Asia. Revue des deux mondes The material relating to Russian involvement and influences in Asia primarily consists of journal articles, in french, from the journal looking at Russian expansion into both the Caucasus and the Far East, along with a newspaper article and handwritten observations made by Lewis Pelly. There is also an article in french from the same journal regarding French interests in Asia. The material in the file relating to Lewis Pelly's mission to Herat and Afghanistan in 1860 includes correspondence with Sultan Ahmed Khan, Governor of Herat; and correspondence and records of conversations with Earl Canning, Viceroy and Governor General of India regarding his mission; matters relating to pay and reimbursement of expenses and observations on matters in Herat, the recent Persian War, and possible threats to India's north-western frontier. Also included in the file is a record of a conversation with Earl Canning regarding Pelly's career and the offer of the position of acting consul at Zanzibar, May 1861. File contains a title card, in Lewis Pelly's handwriting.",
				"archive": "British Library: India Office Records and Private Papers",
				"archiveLocation": "Mss Eur F126/21",
				"extra": "Genre: Journal article",
				"language": "English and French in Latin script",
				"libraryCatalog": "Qatar Digital Library",
				"rights": "Public Domain",
				"url": "https://www.qdl.qa/en/archive/81055/vdc_100000001524.0x0003a0",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "The contents of the file have been arranged chronologically, with the exception of the article at folios 14-27 which had originally been dated as 1860 but was actually printed in 1866. Enclosures to items have been placed directly after the item they are enclosed with."
					},
					{
						"note": "Foliation: The file has been foliated using a pencil number enclosed in a circle located in the top right hand corner of the recto of each folio. There has been some renumbering of the file and former foliation numbers have been crossed through. The file contains three printed journal articles and each of these has their own original printed pagination sequences. Foliation anomaly: 27a"
					},
					{
						"note": "<p>Printed article, in french, titled 'Politique de la France en Asie' (The politics of France in Asia).</p><p>The article recounts France's historic involvement in Asia alongside other European countries including Great Britain and the Netherlands; details the reception of French ambassadors and missionaries in various Asian countries, in particular China; and assesses the colonialisation projects undertaken by the French government, and their thoughts and attitudes more generally in regards to colonies.</p><p>The article was published in <em>Revue des Deux Mondes</em> in 1858.</p>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.qdl.qa/en/archive/81055/vdc_100075534085.0x0000cd",
		"items": [
			{
				"itemType": "document",
				"title": "Vol 10 Letters Outward",
				"creators": [
					{
						"lastName": "East India Company, the Board of Control, the India Office, or other British Government Department",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "1806-11-03",
				"abstractNote": "A volume of letters sent outwards. Most of the correspondence is from Nicholas Hankey Smith, Resident at Bushire, mainly to various company officials in India or elsewhere in the Gulf and surrounding regions. Correspondence is also frequently sent to Jaffer Ali Khan [Ja‘afar ‘Alī Khān], the Resident's native agent at Shiraz, along with various other Persian officials. From July 1808, correspondence is sent out by William Bruce, who becomes Acting Resident following the departure of Nicholas Hankey Smith. The volume also contains some letters inwards, mainly as enclosures to letters outward. The subject matter of the correspondence is the administration of the Bushire Residency, company trade and political matters in the Gulf. French diplomatic activity, and plans to advance on British India is also a frequent topic in the correspondence. The following abbreviations have been used: HCC - Honourable Company's Cruizer HMS - His Majesty's Ship",
				"archive": "British Library: India Office Records and Private Papers",
				"archiveLocation": "IOR/R/15/1/10",
				"extra": "Genre: Certificate",
				"language": "English, French and Arabic in Latin and Arabic script",
				"libraryCatalog": "Qatar Digital Library",
				"rights": "Open Government Licence",
				"url": "https://www.qdl.qa/en/archive/81055/vdc_100000000159.0x0003de",
				"attachments": [
					{
						"title": "Full Text PDF (too large)",
						"mimeType": "application/pdf",
						"url": ""
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "This was once a single volume that has since been split into two parts. Part 1: ff.1-96 Part 2:  ff.97-194"
					},
					{
						"note": "2 volumes in one slipcase Foliation: The foliation sequence runs through two volumes as a continuous sequence. It commences at the title page of volume one and terminates at the last folio of volume two; these numbers are written in pencil, and are located in the top right corner of the recto side of each folio. The file contains the following foliation corrections: 1 is followed by 1A; 11 is followed by 11A; 117 is followed by 117A; 193 is followed by 193A. Pagination: An original pagination sequence also runs through both volumes between ff 1-194; these numbers are written in ink, and are located in the top outermost corner of each page. The pagination is intermittent in places as numbers have been lost as a result of damage to the folios. Condition: The volumes have suffered from extensive pest damage resulting in the loss of a significant amount of text, and as a result the content can be difficult to read in places."
					},
					{
						"note": "<p>A certificate of the sale of <em>Gelaria Expirance</em> and her stores as a result of the vessel floundering. It was purchased by the late Shaik Nasser and is now in the possession of his son the Shiek Abdol Russool [Shaikh ‘Abd al-Rasūl Khān].</p>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.qdl.qa/%D8%A7%D9%84%D8%B9%D8%B1%D8%A8%D9%8A%D8%A9/archive/81055/vdc_100000001878.0x000290",
		"items": [
			{
				"itemType": "book",
				"title": "\"رغبة إمام مسقط في إعادة «يخت برينس ريجنت»\"",
				"creators": [
					{
						"lastName": "Āl Bū Sa‘īd, Sayyid Sa‘īd bin Sulṭān",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"lastName": "شركة الهند الشرقية ولجنة البرلمان البريطاني لشئون الهند ومكتب الهند وإدارات الحكومة البريطانية الأخرى",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"abstractNote": "تتكون المادة من نسخ ومقتطفات من مراسلات ومحاضر مرفقة برسالة سياسية من حكومة بومباي [مومباي] إلى مجلس إدارة شركة الهند الشرقية. تتعلق المادة بطلب إمام مسقط بأن يؤخذ منه اليخت \"برينس ريجنت\" الذي أهداه إليه مؤخرًا الملك ويليام الرابع، لأنه يخاف من تضرره إذا ما بقى في حوزته. تتكون المادة من نسخ ومقتطفات من مراسلات ومحاضر مرفقة برسالة سياسية من حكومة بومباي [مومباي] إلى مجلس إدارة شركة الهند الشرقية. تتعلق المادة بطلب إمام مسقط بأن يؤخذ منه اليخت \"برينس ريجنت\" الذي أهداه إليه مؤخرًا الملك ويليام الرابع، لأنه يخاف من تضرره إذا ما بقى في حوزته. تحتوي صفحة عنوان المادة على المراجع التالية: \"الإدارة السياسية في بومباي\"، [مراسلات سابقة] ٢٥٤٠، المسوّدة ٨١، ١٨٤٠\"، \"المجموعة رقم ١٧\"، \"مكتب المفتش\".",
				"archive": "المكتبة البريطانية: أوراق خاصة وسجلات من مكتب الهند",
				"archiveLocation": "IOR/F/4/1797/73821",
				"extra": "Genre: مادة أرشيفية",
				"language": "الإنجليزية   اللاتينية بالأحرف",
				"libraryCatalog": "Qatar Digital Library",
				"rights": "ترخيص حكومي عام",
				"url": "https://www.qdl.qa/العربية/archive/81055/vdc_100000001878.0x000290",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "الأوراق مرتبة ترتيبًا زمنيًا تقريبيًا من بداية المادة إلى نهايتها. تتضمن المادة أيضًا جدول محتويات (ص. ٣٠٧) يشير إلى \"الصفحة\"، \"التاريخ\"، \"من\"، \"إلى\"."
					},
					{
						"note": "ترقيم الأوراق: يبدأ تسلسل ترقيم الأوراق لهذا الوصف (المُستخدم للأغراض المرجعية) على ص. ٣٠٢ وينتهي في ص. ٣٠٧، حيث أنه جزء من مجلد أكبر؛ هذه الأرقام مكتوبة بالقلم الرصاص ومحاطة بدائرة في أسفل يمين صفحة الوجه من كل ورقة. ترقيم الصفحات: تحتوي المادة أيضًا على تسلسل ترقيم صفحات أصلي."
					},
					{
						"note": "<p>تتكون المادة من نسخ ومقتطفات من مراسلات ومحاضر مرفقة برسالة سياسية من حكومة بومباي [مومباي] إلى مجلس إدارة <a href=\"/العربية/قاموس-مصطلحات#شركة_الهند_الشرقية\" class=\"lexicon-term\">\nشركة الهند الشرقية <span class=\"lexicon-term-hover\" style=\"opacity: 1; left: 10%; right: auto;\">\nمؤسسة بريطانية كانت تدير المصالح التجارية والعسكرية في الهند وجنوب غرب آسيا </span>\n</a>. تتعلق المادة بطلب إمام مسقط بأن يؤخذ منه اليخت \"برينس ريجنت\" الذي أهداه إليه مؤخرًا الملك ويليام الرابع، لأنه يخاف من تضرره إذا ما بقى في حوزته.</p><p>تحتوي صفحة عنوان المادة على المراجع التالية: \"الإدارة السياسية في بومباي\"، [مراسلات سابقة] ٢٥٤٠، المسوّدة ٨١، ١٨٤٠\"، \"المجموعة رقم ١٧\"، \"مكتب المفتش\".</p>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.qdl.qa/%D8%A7%D9%84%D8%B9%D8%B1%D8%A8%D9%8A%D8%A9/archive/81055/vdc_100085203762.0x000001",
		"items": [
			{
				"itemType": "book",
				"title": "\"معاملات الجمعية الجغرافية في بومباي. من مايو ١٨٥٧ حتى مايو ١٨٥٨. (إصدار جديد.) تحرير السكرتير. المجلد XIV.\"",
				"creators": [
					{
						"lastName": "Bombay Geographical Society",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"abstractNote": "\"معاملات الجمعية الجغرافية في بومباي. من مايو ١٨٥٧ حتى مايو ١٨٥٨. (إصدار جديد.) تحرير السكرتير. المجلد XIV.\" \"معاملات الجمعية الجغرافية في بومباي. من مايو ١٨٥٧ حتى مايو ١٨٥٨. (إصدار جديد.) تحرير السكرتير. المجلد XIV.\" بيانات النشر: بومباي: سميث، تايلور وشركاهما، ١٨٥٩. مع خرائط ورسومات.",
				"archive": "المكتبة البريطانية: أوراق خاصة وسجلات من مكتب الهند",
				"archiveLocation": "ST 393, vol 14",
				"extra": "Genre: ملف أرشيفي",
				"language": "الإنجليزية   اللاتينية بالأحرف",
				"libraryCatalog": "Qatar Digital Library",
				"rights": "نطاق عام",
				"url": "https://www.qdl.qa/العربية/archive/81055/vdc_100085203762.0x000001",
				"attachments": [
					{
						"title": "Full Text PDF (too large)",
						"mimeType": "application/pdf",
						"url": ""
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "يحتوي هذا المجلد على جدول محتويات يشمل عناوين ومراجع الصفحات. يوجد فهرس بالمجلدات I-XVII (١٨٣٦-١٨٦٤) في مجلد منفصل (ST 393, index)."
					},
					{
						"note": "الأبعاد: ٢٢٠ × ١٤٠ مم"
					},
					{
						"note": "<p>\"معاملات الجمعية الجغرافية في بومباي. من مايو ١٨٥٧ حتى مايو ١٨٥٨. (إصدار جديد.) تحرير السكرتير. المجلد XIV.\"</p><p>بيانات النشر: بومباي: سميث، تايلور وشركاهما، ١٨٥٩.</p><p>مع خرائط ورسومات.</p>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.qdl.qa/en/search/site/kuwait%2520iraq?retain-filters=1",
		"items": "multiple"
	}
]
/** END TEST CASES **/
