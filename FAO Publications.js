{
	"translatorID": "4883f662-29df-44ad-959e-27c9d036d165",
	"label": "FAO Publications",
	"creator": "Bin Liu <lieubean@gmail.com>",
	"target": "^https?://www\\.fao\\.org/(publications|documents)/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-04-01 16:44:37"
}

/*
	***** BEGIN LICENSE BLOCK *****
	Copyright © 2017 Bin Liu
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
	// Just differentiate single and multiple.
	if (url.includes('/card/')) {
		let isConferencePaper = false;
		let confMetaName = ['اسم الاجتماع', '会议名称', 'Meeting Name', 'Nom de la réunion', 'Название мероприятия', 'Nombre de la reunión'];
		let labelArray = [];
		if (url.includes('/publications/')) {
			labelArray = doc.querySelectorAll('.fdr_label'); 	// Identify item type (book or conferencePaper) based on "fdr_label" class.
		}
		else if (url.includes('/documents/')) {
			labelArray = doc.querySelectorAll('.fw-bold'); 	// Identify item type (book or conferencePaper) based on "fw-bold" class.
			// Page layout for meeting documents is not functioning properly at "documents" pages (e.g. https://www.fao.org/documents/card/en/c/ND423EN/ and http://www.fao.org/documents/card/zh/c/mw246ZH/ ). Keep the code for now because it doesn't interfere with books and meeting documents are very few.
		}
		for (let i = 0; i < labelArray.length; i++) {
			for (let j = 0; j < confMetaName.length; j++) {
				isConferencePaper = labelArray[i].innerText.includes(confMetaName[j]);
				if (isConferencePaper) {
					break;
				}
			}
			if (isConferencePaper) {
				break;
			}
		}
		if (isConferencePaper) {
			return 'conferencePaper';
		}
		else {
			return 'book';
		}
	}

	/* Multiples currently don't load properly
	else if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	*/
	return false;
}

function cleanMetaPub(str) {
	// clean meta fields obtained from page for "publications" pages
	if (str.includes(';') === false) {
		return str.slice(str.indexOf(':') + 2);
	}
	else {
		let strArray = str.slice(str.indexOf(':') + 2).split(';');
		return strArray;
	}
}

function cleanMetaDoc(str) {
	// clean meta fields obtained from page for "documents" pages
	if (str.includes(';') === false) {
		return str;
	}
	else {
		let strArray = str.split(';').filter(String); // split by semicolon and remove empty elements
		return strArray;
	}
}

function getLang(str) {
	// language: 2 or 3 letters following ISO 639
	// indicated by the last 1-3 letters in PDF file name (langCode)
	// One good example is the various language versions of http://www.fao.org/publications/card/en/c/I2801E
	let langCode, lang = '';
	let matches = str.match(/([a-z]+)\.pdf$/i);
	if (matches) {
		langCode = matches[1];
	}
	// In the new PDF naming scheme, langCode follows ISO 639.
	if (langCode.length > 1) {
		lang = langCode.toLowerCase();
	}
	// In the old PDF naming scheme, langCode is one lower/upper case letter and only differentiates between the 6 UN languages.
	else if ((langCode == 'a') || (langCode == 'A')) {
		lang = 'ar';
	}
	else if ((langCode == 'c') || (langCode == 'C')) {
		lang = 'zh';
	}
	else if ((langCode == 'e') || (langCode == 'E')) {
		lang = 'en';
	}
	else if ((langCode == 'f') || (langCode == 'F')) {
		lang = 'fr';
	}
	else if ((langCode == 'r') || (langCode == 'R')) {
		lang = 'ru';
	}
	else if ((langCode == 's') || (langCode == 'S')) {
		lang = 'es';
	}
	else { // Other languages are usually designated 'o'. Using 'else' just to be safe.
		lang = 'other';
	}
	return lang;
}

function scrape(doc, url) {
	var newItem = new Z.Item();
	var abs, existingMeta = {};
	var textVariable = { // declarations for metadata names as appeared in document pages in different languages
		date: ['سنة النشر', '出版年份', 'Year of publication', 'Année de publication', 'Год издания', 'Fecha de publicación'],
		publisher: ['الناشر', '出版方', 'Publisher', 'Éditeur', 'Издатель', 'Editor'],
		place: ['مكان النشر', '出版地点', 'Place of publication', 'Lieu de publication', 'Место публикации', 'Lugar de publicacion'],
		pages: ['الصفحات', '页数', 'Pages', 'Страницы', 'Páginas'],
		ISBN: ['الرقم الدولي الموحد للكتاب', 'ISBN'],
		author: ['الكاتب', '作者', 'Author', 'Auteur', 'Автор', 'Autor'],
		seriesTitle: ['العنوان التسلسي', '系列标题', 'Serial Title', 'Titre de la série', 'Название серии', 'Título de la serie'],
		seriesNumber: ['رقم المسلسل', '系列号码', 'Series number', 'Numéro de série', 'Серийный номер', 'Número de serie'],
		conference: ['اسم الاجتماع', '会议名称', 'Meeting Name', 'Nom de la réunion', 'Название мероприятия', 'Nombre de la reunión']
	};
	var metaText = [];
	var DOIMatch, pdfUrl, mainTitle, subTitle, metaResult, conferenceWeb = '';
	var DOILead = 'https://doi.org/';

	if (url.includes('/card/')) {
		// attach document card URL and snapshot
		// TEMP: Disable at least until we have post-JS snapshots
		/* newItem.attachments.push({
			url: url,
			title: 'FAO Document Record Snapshot',
			mimeType: 'text/html',
			snapshot: true
		}); */
		if (url.includes('/publications/')) {
			//* ********* Begin fixed-location variables **********

			// Some variables always appear and appear at the same location in all document pages.

			// abstract
			abs = doc.getElementById("mainContentN0");
			// The childrens of `abs` are the label "Abstract:" in a strong-tag,
			// the abstract in several p-tags or text nodes directly, and possibly
			// a note about other languages which begins also with a strong-tag.
			if (abs) {
				let children = abs.childNodes;
				let abstractFound = false;
				for (let child of children) {
					if (child.tagName == "STRONG" || (child.nodeType == Node.ELEMENT_NODE && text(child, 'strong'))) {
						if (abstractFound) {
							break; // stop when another strong tag is found
						}
						else {
							abstractFound = true;
							continue; // exclude the label "Abstract"
						}
					}
					if (newItem.abstractNote) {
						if (newItem.abstractNote.slice(-1) !== "\n") {
							newItem.abstractNote += "\n\n";
						}
						newItem.abstractNote += child.textContent;
					}
					else {
						newItem.abstractNote = child.textContent;
					}
				}
				// DOI: Some docs contain DOI as a separate paragraph in abs field
				if (abs.innerText.includes(DOILead)) {
					DOIMatch = abs.innerText.match(/https:\/\/doi\.org\/(.+)/i);
					newItem.DOI = DOIMatch[1];
				}
			}

			// attach PDF: PDF link in innerHTML of "dynafef_det" class.
			pdfUrl = attr(doc, '.dynafef_det a[href$=".pdf"]', 'href');
			newItem.attachments.push({
				url: pdfUrl,
				title: 'Full Text PDF',
				mimeType: 'application/pdf'
			});
			
			// url
			newItem.url = url;
			
			//language
			newItem.language = getLang(pdfUrl);
			
			// title: use colon to connect main title and subtitle (if subtitle exists)
			mainTitle = text(doc, '#headerN0 > h1');
			subTitle = text(doc, 'h4.csc-firstHeader');
			if (!subTitle) {
				newItem.title = mainTitle;
			}
			else if ((newItem.language == 'zh') || (newItem.language == 'ja')) {
				newItem.title = mainTitle + '：' + subTitle;
			}
			else {
				newItem.title = mainTitle + ': ' + subTitle;
			}

			//* ********* End fixed-location variables **********


			//* ********* Begin dynamic-location variables **********

			// Variables that appear neither in all document pages nor at same positions in the pages.
			// scrape text of meta area and split into an array based on line breaks.
			metaText = text(doc, '#fdr_label').split('\n');
			// get what variables are listed in the page, save to object existingMeta
			for (let i = 0; i < metaText.length; i++) {
				for (let key in textVariable) {
					for (let j = 0; j < textVariable[key].length; j++) {
						if (metaText[i].includes(textVariable[key][j])) {
							existingMeta[key] = metaText[i];
						}
					}
				}
			}

			for (let key in existingMeta) {
				metaResult = cleanMetaPub(existingMeta[key]);

				// date
				if (key.includes('date')) {
					newItem.date = metaResult;
				}
				// publisher
				if (key.includes('publisher')) {
					newItem.publisher = metaResult;
				}
				// place
				if (key.includes('place')) {
					newItem.place = metaResult;
				}
				// number of pages
				if (key.includes('pages')) {
					newItem.numPages = metaResult.match(/\d+/)[0];
				}
				// ISBN
				if (key.includes('ISBN')) {
					newItem.ISBN = ZU.cleanISBN(metaResult, false);
				}
				// author(s): whether there is one or more authors; whether last and first name are separated by ',' (if not, use single-field mode).
				if (key.includes('author')) {
					if (Array.isArray(metaResult)) { // If there are more than 1 authors, metaResult returns an array.
						for (let i = 0; i < metaResult.length; i++) {
							if (metaResult[i].includes(',')) {
								newItem.creators.push(ZU.cleanAuthor(metaResult[i], 'author', true));
							}
							else {
								newItem.creators.push({
									lastName: metaResult[i],
									creatorType: 'author',
									fieldMode: 1
								});
							}
						}
					}
					else if (metaResult.includes(',')) {
						newItem.creators.push(ZU.cleanAuthor(metaResult, 'author', true));
					}
					else {
						newItem.creators.push({
							lastName: metaResult,
							creatorType: 'author',
							fieldMode: 1
						});
					}
				}
				// tag (Agrovoc)
				if (key.includes('tags')) {
					for (var i = 0; i < metaResult.length; i++) {
						newItem.tags[i] = metaResult[i].trim();
					}
				}
				// seriesTitle
				if (key.includes('seriesTitle')) {
					newItem.series = metaResult;
				}
				// seriesNumber
				if (key.includes('seriesNumber')) {
					newItem.seriesNumber = metaResult;
				}
				// conferenceName: save for later conditions.
				if (key.includes('conference')) {
					conferenceWeb = metaResult[0];
					newItem.conferenceName = conferenceWeb;
				}
			}

			// If there's no publisher, use 'FAO' as publisher.
			if (!newItem.publisher) {
				newItem.publisher = 'FAO';
			}
			// If there's no place, use 'Rome, Italy' as place.
			if (!newItem.place) {
				newItem.place = 'Rome, Italy';
			}
			// If there's no author, use 'FAO' as author.
			if (!newItem.creators.length) {
				newItem.creators.push({
					lastName: 'FAO',
					creatorType: 'author',
					fieldMode: 1
				});
			}
			// If conference exists in document page, the itemType is 'conferencePaper'; otherwise it's 'book'.
			if (conferenceWeb) {
				newItem.itemType = 'conferencePaper';
			}
			else {
				newItem.itemType = 'book';
			}
			//* ********* End dynamic-location variables **********
		}
		if (url.includes('documents')) {
			//* ********* Begin fixed-location variables **********

			// Some variables always appear and appear at the same location in all document pages.

			// abstract
			abs = doc.getElementsByClassName("_card-body-info-center")[0];
			// abstractNote should be all text before the class "others-info". See example: https://www.fao.org/documents/card/en/c/ca8466en
			var otherInfo = abs.querySelectorAll(".others-info")[0];
			var keywords = abs.querySelectorAll(".tags-list")[0]; // "KEYWORDS:" + tags
			newItem.abstractNote = (abs.innerText.replace(otherInfo.innerText, '').replace(keywords.innerText, '')).trim();

			// tags: class="badge" within abs
			var tags = abs.querySelectorAll(".badge");
			for (let i = 0; i < tags.length; i++) {
				newItem.tags[i] = tags[i].innerText.trim();
			}

			// attach PDF: PDF link in innerHTML of "_card-buttons-downloads" class.
			pdfUrl = (doc.getElementsByClassName("_card-buttons-downloads")[0].innerHTML).match(/http\S*\.pdf/gi)[0];
			newItem.attachments.push({
				url: pdfUrl,
				title: 'Full Text PDF',
				mimeType: 'application/pdf'
			});

			// url
			newItem.url = url;

			// language: 2 or 3 letters following ISO 639
			newItem.language = getLang(pdfUrl);

			// title: use colon to connect main title and subtitle (if subtitle exists)
			mainTitle = doc.getElementsByClassName("page-title")[0].innerText;
			var subTitleElement = doc.getElementsByClassName("sub-title");
			if (subTitleElement.length == '0') { // If there's no sub-title class in the web page, subTitleElement is an empty HTMLCollection with “0” (string, not number) as the length attribute.
				newItem.title = mainTitle;
			}
			else if ((newItem.language == 'zh') || (newItem.language == 'ja')) {
				newItem.title = mainTitle + '：' + subTitleElement[0].innerText;
			}
			else {
				newItem.title = mainTitle + ': ' + subTitleElement[0].innerText;
			}

			//* ********* End fixed-location variables **********


			//* ********* Begin dynamic-location variables **********

			// Variables that appear neither in all document pages nor at same positions in the pages.
			metaText = doc.getElementsByClassName("_card-body-info-left")[0].innerText;

			// DOI
			if (metaText.includes(DOILead)) {
				DOIMatch = metaText.match(/https:\/\/doi\.org\/(.+)/i);
				newItem.DOI = DOIMatch[1];
			}

			// scrape text of meta area and split into an array based on line breaks.
			var metaTextArr = metaText.split('\n');
			// get what variables are listed in the page, save to object existingMeta
			for (let i = 0; i < metaTextArr.length; i++) {
				for (let key in textVariable) {
					for (let j = 0; j < textVariable[key].length; j++) {
						if (metaTextArr[i].includes(textVariable[key][j])) {
							existingMeta[key] = metaTextArr[i + 1]; // In metaTextArr, the value of a meta field always appears at the next element of the meta.
						}
					}
				}
			}

			for (let key in existingMeta) {
				metaResult = cleanMetaDoc(existingMeta[key]);

				// date
				if (key.includes('date')) {
					newItem.date = metaResult;
				}
				// publisher
				if (key.includes('publisher')) {
					if (Array.isArray(metaResult)) { // differentiate between multiple (array) and single (string)
						newItem.publisher = metaResult.join(', ');
					}
					else {
						newItem.publisher = metaResult;
					}
				}
				// place
				if (key.includes('place')) { // differentiate between multiple (array) and single (string)
					if (Array.isArray(metaResult)) {
						newItem.publisher = metaResult.join(', ');
					}
					else {
						newItem.publisher = metaResult;
					}
				}
				// number of pages
				if (key.includes('pages')) {
					newItem.numPages = metaResult.match(/\d+/)[0];
				}
				// ISBN
				if (key.includes('ISBN')) {
					newItem.ISBN = ZU.cleanISBN(metaResult, false);
				}
				// author(s): whether there is one or more authors; whether last and first name are separated by ',' (if not, use single-field mode).
				if (key.includes('author')) {
					if (Array.isArray(metaResult)) { // If there are more than 1 authors, metaResult returns an array.
						for (let i = 0; i < metaResult.length; i++) {
							if (metaResult[i].includes(',')) {
								newItem.creators.push(ZU.cleanAuthor(metaResult[i], 'author', true));
							}
							else {
								newItem.creators.push({
									lastName: metaResult[i],
									creatorType: 'author',
									fieldMode: 1
								});
							}
						}
					}
					else if (metaResult.includes(',')) {
						newItem.creators.push(ZU.cleanAuthor(metaResult, 'author', true));
					}
					else {
						newItem.creators.push({
							lastName: metaResult,
							creatorType: 'author',
							fieldMode: 1
						});
					}
				}
				// seriesTitle
				if (key.includes('seriesTitle')) {
					newItem.series = metaResult;
				}
				// seriesNumber
				if (key.includes('seriesNumber')) {
					newItem.seriesNumber = metaResult;
				}
				// conferenceName
				if (key.includes('conference')) {
					newItem.conferenceName = metaResult[0];
				}
			}
			// If there's no publisher, use 'FAO' as publisher.
			if (!newItem.publisher) {
				newItem.publisher = 'FAO';
			}
			// If there's no place, use 'Rome, Italy' as place.
			if (!newItem.place) {
				newItem.place = 'Rome, Italy';
			}
			// If there's no author, use 'FAO' as author.
			if (!newItem.creators.length) {
				newItem.creators.push({
					lastName: 'FAO',
					creatorType: 'author',
					fieldMode: 1
				});
			}
			// If conference exists in document page, the itemType is 'conferencePaper'; otherwise it's 'book'.
			if (newItem.conferenceName) {
				newItem.itemType = 'conferencePaper';
			}
			else {
				newItem.itemType = 'book';
			}
			//* ********* End dynamic-location variables **********
		}
	}
	newItem.complete();
}

// get items from a multiple-item page
// Multiple-item searching is no longer provided.
/*function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//*[@class="item-image"]');
	for (var i = 0; i < rows.length; i++) {
		var href = rows[i].href;
		var title = ZU.trimInternal(rows[i].text);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}*/

function doWeb(doc, url) {
	// if (detectWeb(doc, url) == "multiple") {
	// 	Z.selectItems(getSearchResults(doc, false), function (items) {
	// 		if (!items) {
	// 			return;
	// 		}
	// 		var articles = [];
	// 		for (var i in items) {// 			articles.push(i);
	// 		}
	// 		ZU.processDocuments(articles, scrape);
	// 	});
	// }
	// else {
	scrape(doc, url);
	// }
}

// Note on test cases: Because the pages use dynamic elements (which is also why the translator doesn't work for multiple item pages), automatic test in Scaffold doesn't work. Every time a test is needed, use "New Web" to manually add it.

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.fao.org/documents/card/en?details=cc0461en",
		"defer": true,
		"items": [
			{
				"itemType": "book",
				"title": "The State of World Fisheries and Aquaculture 2022: Towards Blue Transformation",
				"creators": [
					{
						"lastName": "FAO",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "2022",
				"ISBN": "9789251363645",
				"abstractNote": "The 2022 edition of The State of World Fisheries and Aquaculture coincides with the launch of the Decade of Action to deliver the Global Goals, the United Nations Decade of Ocean Science for Sustainable Development and the United Nations Decade on Ecosystem Restoration. It presents how these and other equally important United Nations events, such as the International Year of Artisanal Fisheries and Aquaculture (IYAFA 2022), are being integrated and supported through Blue Transformation, a priority area of FAO’s new Strategic Framework 2022–2031 designed to accelerate achievement of the 2030 Agenda for Sustainable Development in food and agriculture.\n\nThe concept of Blue Transformation emerged from the Thirty-fourth Session of the FAO Committee on Fisheries in February 2021, and in particular the Declaration for Sustainable Fisheries and Aquaculture, which was negotiated and endorsed by all FAO Members. The Declaration calls for support for “an evolving and positive vision for fisheries and aquaculture in the twenty first century, where the sector is fully recognized for its contribution to fighting poverty, hunger and malnutrition.” In this context, Part 1 of this edition of The State of World Fisheries and Aquaculture reviews the world status of fisheries and aquaculture, while Parts 2 and 3 are devoted to Blue Transformation and its pillars on intensifying and expanding aquaculture, improving fisheries management and innovating fisheries and aquaculture value chains. Blue Transformation emphasizes the need for forward-looking and bold actions to be launched or accelerated in coming years to achieve the objectives of the Declaration and in support of the 2030 Agenda. Part 4 covers current and high-impact emerging issues – COVID-19, climate change and gender equality – that require thorough consideration for transformative steps and preparedness to secure sustainable, efficient and equitable fisheries and aquaculture, and finally draws some outlook on future trends based on projections.\n\nThe State of World Fisheries and Aquaculture aims to provide objective, reliable and up-to-date information to a wide audience – policymakers, managers, scientists, stakeholders and indeed everyone interested in the fisheries and aquaculture sector.",
				"language": "en",
				"libraryCatalog": "FAO Publications",
				"numPages": "266",
				"place": "Rome, Italy",
				"publisher": "FAO",
				"series": "The State of World Fisheries and Aquaculture (SOFIA)",
				"seriesNumber": "2022",
				"shortTitle": "The State of World Fisheries and Aquaculture 2022",
				"url": "https://www.fao.org/documents/card/en?details=cc0461en",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "aquaculture production"
					},
					{
						"tag": "climate change adaptation"
					},
					{
						"tag": "fish trade"
					},
					{
						"tag": "fishery management"
					},
					{
						"tag": "fishery production"
					},
					{
						"tag": "fishery resources"
					},
					{
						"tag": "gender equality"
					},
					{
						"tag": "sustainable fisheries"
					},
					{
						"tag": "value chains"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.fao.org/publications/card/en?details=cc0461en",
		"defer": true,
		"items": [
			{
				"itemType": "book",
				"title": "The State of World Fisheries and Aquaculture 2022: Towards Blue Transformation",
				"creators": [
					{
						"lastName": "FAO",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "2022",
				"ISBN": "9789251363645",
				"abstractNote": "The 2022 edition of The State of World Fisheries and Aquaculture coincides with the launch of the Decade of Action to deliver the Global Goals, the United Nations Decade of Ocean Science for Sustainable Development and the United Nations Decade on Ecosystem Restoration. It presents how these and other equally important United Nations events, such as the International Year of Artisanal Fisheries and Aquaculture (IYAFA 2022), are being integrated and supported through Blue Transformation, a priority area of FAO’s new Strategic Framework 2022–2031 designed to accelerate achievement of the 2030 Agenda for Sustainable Development in food and agriculture. \n\nThe concept of Blue Transformation emerged from the Thirty-fourth Session of the FAO Committee on Fisheries in February 2021, and in particular the Declaration for Sustainable Fisheries and Aquaculture, which was negotiated and endorsed by all FAO Members. The Declaration calls for support for “an evolving and positive vision for fisheries and aquaculture in the twenty first century, where the sector is fully recognized for its contribution to fighting poverty, hunger and malnutrition.” In this context, Part 1 of this edition of The State of World Fisheries and Aquaculture reviews the world status of fisheries and aquaculture, while Parts 2 and 3 are devoted to Blue Transformation and its pillars on intensifying and expanding aquaculture, improving fisheries management and innovating fisheries and aquaculture value chains. Blue Transformation emphasizes the need for forward-looking and bold actions to be launched or accelerated in coming years to achieve the objectives of the Declaration and in support of the 2030 Agenda. Part 4 covers current and high-impact emerging issues – COVID-19, climate change and gender equality – that require thorough consideration for transformative steps and preparedness to secure sustainable, efficient and equitable fisheries and aquaculture, and finally draws some outlook on future trends based on projections. \n\nThe State of World Fisheries and Aquaculture aims to provide objective, reliable and up-to-date information to a wide audience – policymakers, managers, scientists, stakeholders and indeed everyone interested in the fisheries and aquaculture sector.\n\nThe following complementary information is available:\n\nRead online the full digital reportSee the interactive storyRead the In Brief\n\nHelp us improve your reading experience\n\nLast updated date 19/08/2022",
				"language": "other",
				"libraryCatalog": "FAO Publications",
				"numPages": "266",
				"place": "Rome, Italy",
				"publisher": "FAO",
				"series": "The State of World Fisheries and Aquaculture (SOFIA)",
				"seriesNumber": "2022",
				"shortTitle": "The State of World Fisheries and Aquaculture 2022",
				"url": "https://www.fao.org/publications/card/en?details=cc0461en",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "aquaculture production"
					},
					{
						"tag": "climate change adaptation"
					},
					{
						"tag": "fish trade"
					},
					{
						"tag": "fishery management"
					},
					{
						"tag": "fishery production"
					},
					{
						"tag": "fishery resources"
					},
					{
						"tag": "gender equality"
					},
					{
						"tag": "sustainable fisheries"
					},
					{
						"tag": "value chains"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.fao.org/documents/card/en/c/ca8466en",
		"defer": true,
		"items": [
			{
				"itemType": "book",
				"title": "Responding to the impact of the COVID-19 outbreak on food value chains through efficient logistics",
				"creators": [
					{
						"lastName": "FAO",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "2020",
				"ISBN": "9789251323717",
				"abstractNote": "Measures implemented around the world to contain the COVID-19 pandemic have entailed a severe reduction not only in the transportation of goods and services that rely on transport, but also in the migration of labour domestically and internationally. Workers are less available reflecting both disruptions in transportation systems and restrictions to stop the transmission of the disease, within and across borders.\n\nThe Food and Agriculture Organization of the United Nations (FAO) urges countries to maintain functioning food value chains to avoid food shortages, following practices that are being proven to work. This note summarizes some practices that could be useful for governments and the private sector to maintain critical logistical elements in food value chain.",
				"language": "en",
				"libraryCatalog": "FAO Publications",
				"numPages": "4",
				"place": "Rome, Italy",
				"publisher": "FAO",
				"url": "https://www.fao.org/documents/card/en/c/ca8466en",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Coronavirus"
					},
					{
						"tag": "agrifood sector"
					},
					{
						"tag": "infectious diseases"
					},
					{
						"tag": "logistics"
					},
					{
						"tag": "value chains"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.fao.org/documents/card/en/c/ca8751en/",
		"defer": true,
		"items": [
			{
				"itemType": "book",
				"title": "Blockchain application in seafood value chains",
				"creators": [
					{
						"firstName": "F.",
						"lastName": "Blaha",
						"creatorType": "author"
					},
					{
						"firstName": "K.",
						"lastName": "Katafono",
						"creatorType": "author"
					}
				],
				"date": "2020",
				"ISBN": "9789251324530",
				"abstractNote": "Innovation through information and communication technologies is a key enabler in transforming food systems and holds great potential to achieve the Sustainable Development Goals. Recent developments, such as mobile technologies, smart networks, drones, remote-sensing, distributed computing, as well as disruptive technologies, such as blockchain, the Internet of things and artificial intelligence, are serving as the premise for a “digital revolution” whereby management of resources can potentially be highly optimized, intelligent and anticipatory. This publication establishes chain traceability as the substrate over which digital solutions need to operate. It provides a comprehensive introduction to blockchain, and covers smart contracts, explores how they relate to blockchain with an example of their use in seafood value chains, and then examines major development and operational considerations for blockchain applications. The publication also analyses the seafood supply chain with considerations on flag, coastal, port, processing and market States. It identifies general control elements (critical tracking events and corresponding key data elements) that form the basis for traceability monitoring and acquisition, and summarizes suitability for blockchain. It also investigates considerations for legality, transparency, species fraud and food safety.",
				"language": "en",
				"libraryCatalog": "FAO Publications",
				"numPages": "56",
				"place": "Rome, Italy",
				"publisher": "FAO",
				"series": "FAO Fisheries and Aquaculture Circular",
				"seriesNumber": "No. 1207",
				"url": "https://www.fao.org/documents/card/en/c/ca8751en/",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "analysis"
					},
					{
						"tag": "blockchain technology"
					},
					{
						"tag": "fisheries"
					},
					{
						"tag": "food production"
					},
					{
						"tag": "food systems"
					},
					{
						"tag": "traceability"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.fao.org/documents/card/en/c/ca7988en/",
		"defer": true,
		"items": [
			{
				"itemType": "book",
				"title": "FAO publications catalogue 2020: March",
				"creators": [
					{
						"lastName": "FAO",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "2020",
				"ISBN": "9789251322550",
				"abstractNote": "This catalogue aims to improve the dissemination and outreach of FAO’s knowledge products and overall publishing programme. By providing information on its key publications in every area of FAO’s work, and catering to a range of audiences, it thereby contributes to all organizational outcomes.\n\nFrom statistical analysis to specialized manuals to children’s books, FAO publications cater to a diverse range of audiences. This catalogue presents a selection of FAO’s main publications, produced in 2020 or earlier, ranging from its global reports and general interest publications to numerous specialized titles. In addition to the major themes of agriculture, forestry and fisheries, it also includes thematic sections on climate change, economic and social development, and food safety and nutrition.",
				"language": "en",
				"libraryCatalog": "FAO Publications",
				"numPages": "114",
				"place": "Rome, Italy",
				"publisher": "FAO",
				"shortTitle": "FAO publications catalogue 2020",
				"url": "https://www.fao.org/documents/card/en/c/ca7988en/",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "FAO"
					},
					{
						"tag": "cataloguing"
					},
					{
						"tag": "information dissemination"
					},
					{
						"tag": "publications"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.fao.org/documents/card/fr/c/77dbd058-8dd4-4295-af77-23f6b28cc683/",
		"defer": true,
		"items": [
			{
				"itemType": "book",
				"title": "Vivre et se nourir de la forêt en Afrique centrale",
				"creators": [
					{
						"firstName": "O.",
						"lastName": "Ndoye",
						"creatorType": "author"
					},
					{
						"firstName": "P.",
						"lastName": "Vantomme",
						"creatorType": "author"
					}
				],
				"date": "2016",
				"ISBN": "9789252094890",
				"abstractNote": "Ce livre nous emmène au cœur des zones de forêts denses et sahéliennes de l’Afrique centrale, un écosystème précieux et essentiel à la vie quotidienne de ses habitants, représentant l’un des trois principaux ensembles boisés tropicaux de la planète. Dix pays (Burundi, Cameroun, Congo, Gabon, Guinée Equatoriale, République Centrafricaine, République Démocratique du Congo, Rwanda, Sao Tomé & Principe, Tchad) abritent ces forêts et savanes, riches d’importantes ressources naturelles. Ils ont en com mun une longue histoire liée à la colonisation, suivie d'une expérience de coopération multiforme depuis les indépendances qui évolue incontestablement vers une intégration économique et monétaire. De nos jours, alors que les équilibres séculaires entre l’homme et la nature semblent ébranlés, que la sécurité alimentaire, la lutte contre la pauvreté et la préservation de la biodiversité et des ressources forestières sont devenus des enjeux mondiaux ; à l’heure où la croissance démographique non m aîtrisée fragilise le maintien des écosystèmes forestiers tout en accentuant les conflits liés à la recherche d’espace vital, le phénomène des changements climatiques vient davantage sonder le génie créateur des populations forestières dans la préservation et la gestion durable de la forêt et des produits forestiers non ligneux (PFNL) qui en sont issus. Cette publication est l’œuvre du personnel technique de la FAO, avec la contribution des partenaires internationaux et locaux engagés dans l’évo lution des PFNL. Elle est un document précieux consacré au développement des peuples par la promotion des PFNL en Afrique centrale en vue du renforcement de la sécurité alimentaire et la lutte contre la pauvreté.\n\nVoir aussi la sommaire en version anglais",
				"language": "fr",
				"libraryCatalog": "FAO Publications",
				"numPages": "251",
				"place": "Rome, Italy",
				"publisher": "FAO",
				"series": "Produits Forestiers Non-Ligneux",
				"seriesNumber": "No. 21",
				"url": "https://www.fao.org/documents/card/fr/c/77dbd058-8dd4-4295-af77-23f6b28cc683/",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Afrique centrale"
					},
					{
						"tag": "Commerce international"
					},
					{
						"tag": "Communauté rurale"
					},
					{
						"tag": "Connaissance indigène"
					},
					{
						"tag": "Nouvelle technologie"
					},
					{
						"tag": "Petite entreprise"
					},
					{
						"tag": "Politique forestière"
					},
					{
						"tag": "Produit forestier non ligneux"
					},
					{
						"tag": "Ressource forestière"
					},
					{
						"tag": "Sécurité alimentaire"
					},
					{
						"tag": "Valeur économique"
					},
					{
						"tag": "sustainable forest management"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.fao.org/publications/card/zh/c/mw246ZH/",
		"defer": true,
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "亚太区域可持续粮食系统 促进健康膳食和营养改善专题讨论会成果报告",
				"creators": [
					{
						"firstName": "X.",
						"lastName": "Yao",
						"creatorType": "author"
					}
				],
				"date": "2018",
				"abstractNote": "联合国粮食及农业组织（粮农组织）亚洲及太平洋区域办事处（亚太区域办），与世界卫生组织（世卫组织）、世界粮食计划署（粮食署）、联合国儿童基金会（儿基会）以及世界银行南亚粮食和营养安全举措（世行南亚举措）合作，组织了“亚太区域可持续粮食系统促进健康膳食和营养改善专题讨论会”。讨论会的组织是对2016年12月在罗马粮农组织总部就同一主题召开的粮农组织/世卫组织国际研讨会采取的一项区域后续行动。会议目的是就具有促成积极营养成果潜力的农业和粮食系统政策及行动交流经验和证据。\n\n讨论会呼吁所有利益相关方在相关政策框架中说明的全球、区域、国家行动中形成合力，其中包括可持续发展目标、第二届国际营养大会行动框架、联合国营养问题行动十年，以及相关的国家多部门行动计划和非传染性疾病工作计划。讨论会还呼吁联合国机构联合采取具体行动，支持各国实现其粮食安全和营养议程。\n\n本情况说明对审议结果做了总结。",
				"conferenceName": "FAO Regional Conference for Asia and the Pacific (APRC)",
				"language": "zh",
				"libraryCatalog": "FAO Publications",
				"place": "Rome, Italy",
				"publisher": "FAO",
				"url": "https://www.fao.org/publications/card/zh/c/mw246ZH/",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "meetings"
					},
					{
						"tag": "traditional foods"
					},
					{
						"tag": "亚太"
					},
					{
						"tag": "人体营养"
					},
					{
						"tag": "粮食供给"
					},
					{
						"tag": "联合国粮农组织"
					},
					{
						"tag": "营养不良"
					},
					{
						"tag": "营养政策"
					},
					{
						"tag": "营养教育"
					},
					{
						"tag": "营养状况调查"
					},
					{
						"tag": "营养监督"
					},
					{
						"tag": "进食"
					},
					{
						"tag": "食品供应链"
					},
					{
						"tag": "食品工业"
					},
					{
						"tag": "食物政策"
					},
					{
						"tag": "食物的获得"
					},
					{
						"tag": "食物链"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.fao.org/documents/card/ar/c/c6c2c8d7-3683-53a7-ab58-ce480c65f36c/",
		"defer": true,
		"items": [
			{
				"itemType": "book",
				"title": "الخطوط التوجيهية الطوعية بشأن الحوكمة المسؤولة لحيازة الأراضي ومصايد الأسماك والغابات في سياق الأمن الغذائي الوطني",
				"creators": [
					{
						"lastName": "FAO",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "2012",
				"ISBN": "9789256072771",
				"abstractNote": "هذه الخطوط التوجيهية هي أول صكّ عالمي شامل خاص بالحيازات وإدارتها يُعدّ من خلال مفاوضات حكومية دولية. وتضع هذه الخطوط التوجيهية مبادئ ومعايير مقبولة دولياً للممارسات المسؤولة لاستخدام الأراضي ومصايد الأسماك والغابات وللتحكّم بها. وهي تعطي توجيهات لتحسين الأطر القانونية والتنظيمية والمتصلة بالسياسات التي تنظّم حقوق الحيازة ولزيادة شفافية نظم الحيازة وإدارتها ولتعزيز القدرات والإجراءات التي تتخذها الأجهزة العامة ومؤسسات القطاع الخاص ومنظمات المجتمع المدني وجميع المعنيين بالحيازات وإد ارتها. وتُدرج هذه الخطوط التوجيهية إدارة الحيازات ضمن السياق الوطني للأمن الغذائي وهي تسعى إلى المساهمة في الإعمال المطرد للحق في غذاء كافٍ والقضاء على الفقر وحماية البيئة وتحقيق التنمية الاجتماعية والاقتصادية المستدامة.",
				"language": "ar",
				"libraryCatalog": "FAO Publications",
				"numPages": "40",
				"place": "Rome, Italy",
				"publisher": "FAO",
				"url": "https://www.fao.org/documents/card/ar/c/c6c2c8d7-3683-53a7-ab58-ce480c65f36c/",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "guidelines"
					},
					{
						"tag": "أمن غذائي"
					},
					{
						"tag": "إقتصاديات الغابة"
					},
					{
						"tag": "اقتصاد الصيد"
					},
					{
						"tag": "الحكم"
					},
					{
						"tag": "النوع الاجتماعي"
					},
					{
						"tag": "حيازة الأراضي"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.fao.org/documents/card/en/c/5014f143-be17-4b58-b90e-f1c6bef344a0/",
		"defer": true,
		"items": [
			{
				"itemType": "book",
				"title": "Climate-Smart Agriculture: A Call for Action: Synthesis of the Asia-Pacific Regional Workshop Bangkok, Thailand, 18 to 20 June 2015",
				"creators": [
					{
						"lastName": "FAO",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "2015",
				"ISBN": "9789251088630",
				"abstractNote": "This publication is a summary of the workshop held in Bangkok, Thailand from 18 to 20 June 2015 to promote the mainstreaming and up-scaling of Climate-Smart Agriculture in the region. Included in the report are successful case studies that agriculturists have been practicing as a means to address food security under adverse circumstances.",
				"language": "en",
				"libraryCatalog": "FAO Publications",
				"numPages": "106",
				"place": "Rome, Italy",
				"publisher": "FAO Regional Office for Asia and the Pacific",
				"series": "RAP Publication",
				"shortTitle": "Climate-Smart Agriculture",
				"url": "https://www.fao.org/documents/card/en/c/5014f143-be17-4b58-b90e-f1c6bef344a0/",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "climate-smart agriculture"
					},
					{
						"tag": "forestry"
					},
					{
						"tag": "market gardens"
					},
					{
						"tag": "meetings"
					},
					{
						"tag": "sustainable agriculture"
					},
					{
						"tag": "sustainable development"
					},
					{
						"tag": "urban farmers"
					},
					{
						"tag": "water harvesting"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
