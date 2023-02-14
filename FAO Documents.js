{
	"translatorID": "8476a42f-2ee8-4bec-9b25-c7ee6a1745ad",
	"label": "FAO Documents",
	"creator": "Bin Liu <lieubean@gmail.com>",
	"target": "^https?://www\\.fao\\.org/documents/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-02-14 17:52:40"
}

/*
	***** BEGIN LICENSE BLOCK *****
	Copyright © 2023 Bin Liu
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

// This translator is based on "FAO publications", which targets URLs "https://www.fao.org/publications/*".

function detectWeb(doc, url) {
	// Identify item type (book or conferencePaper) based on "fw-bold" class.
	// Page layout for meeting documents is not functioning properly (e.g. https://www.fao.org/documents/card/en/c/ND423EN/ and http://www.fao.org/documents/card/zh/c/mw246ZH/ ). Keep the code for now because it doesn't interfere with books and meeting documents are very few.
	if (url.includes('card')) {
		let isConferencePaper = false;
		let confMetaName = ['اسم الاجتماع', '会议名称', 'Meeting Name', 'Nom de la réunion', 'Название мероприятия', 'Nombre de la reunión'];
		let labelArray = doc.querySelectorAll('.fw-bold');
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

function cleanMeta(str) {
	// clean meta fields obtained from page
	if (str.includes(';') === false) {
		return str;
	}
	else {
		var strArray = str.split(';').filter(String); // split by semicolon and remove empty elements
		return strArray;
	}
}

function scrape(doc, url) {
	var newItem = new Z.Item();

	if (url.includes('card')) {
		// attach document card URL and snapshot
		// TEMP: Disable at least until we have post-JS snapshots
		/* newItem.attachments.push({
			url: url,
			title: 'FAO Document Record Snapshot',
			mimeType: 'text/html',
			snapshot: true
		}); */

		//* ********* Begin fixed-location variables **********

		// Some variables always appear and appear at the same location in all document pages.

		// abstract
		var abs = doc.getElementsByClassName("_card-body-info-center")[0];
		// abstractNote should be all text before the class "others-info". See example: https://www.fao.org/documents/card/en/c/ca8466en
		var otherInfo = abs.querySelectorAll(".others-info")[0];
		var keywords = abs.querySelectorAll(".tags-list")[0]; // "KEYWORDS:" + tags
		newItem.abstractNote = (abs.innerText.replace(otherInfo.innerText, '').replace(keywords.innerText, '')).trim();

		// tags: class="badge" within abs
		var tags = abs.querySelectorAll(".badge");
		for (var i = 0; i < tags.length; i++) {
			newItem.tags[i] = tags[i].innerText.trim();
		}

		// attach PDF: PDF link in innerHTML of "_card-buttons-downloads" class.
		var pdfUrl = (doc.getElementsByClassName("_card-buttons-downloads")[0].innerHTML).match(/http\S*\.pdf/gi)[0];
		newItem.attachments.push({
			url: pdfUrl,
			title: 'Full Text PDF',
			mimeType: 'application/pdf'
		});

		// url
		newItem.url = url;
		
		// language: 2 or 3 letters following ISO 639
		// indicated by the last 1-3 letters in PDF file name (langCode)
		// One good example is the various language versions of http://www.fao.org/publications/card/en/c/I2801E
		var langCode = '';
		var matches = pdfUrl.match(/([a-z]+)\.pdf$/i);
		if (matches) {
			langCode = matches[1];
		}
		// In the new PDF naming scheme, langCode follows ISO 639.
		if (langCode.length > 1) {
			newItem.language = langCode.toLowerCase();
		}
		// In the old PDF naming scheme, langCode is one lower/upper case letter and only differentiates between the 6 UN languages.
		else if ((langCode == 'a') || (langCode == 'A')) {
			newItem.language = 'ar';
		}
		else if ((langCode == 'c') || (langCode == 'C')) {
			newItem.language = 'zh';
		}
		else if ((langCode == 'e') || (langCode == 'E')) {
			newItem.language = 'en';
		}
		else if ((langCode == 'f') || (langCode == 'F')) {
			newItem.language = 'fr';
		}
		else if ((langCode == 'r') || (langCode == 'R')) {
			newItem.language = 'ru';
		}
		else if ((langCode == 's') || (langCode == 'S')) {
			newItem.language = 'es';
		}
		else { // Other languages are usually designated 'o'. Using 'else' just to be safe.
			newItem.language = 'other';
		}

		// title: use colon to connect main title and subtitle (if subtitle exists)
		var mainTitle = doc.getElementsByClassName("page-title")[0].innerText;
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
		var metaText = doc.getElementsByClassName("_card-body-info-left")[0].innerText;

		// DOI
		var DOILead = 'https://doi.org/';
		if (metaText.includes(DOILead)) {
			var DOIMatch = metaText.match(/https:\/\/doi\.org\/(.+)/i);
			newItem.DOI = DOIMatch[1];
		}

		var metaTextArr = metaText.split('\n'); // scrape text of meta area and split into an array based on line breaks.

		// get what variables are listed in the page, save to object existingMeta
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
		var existingMeta = {};
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
			var metaResult = cleanMeta(existingMeta[key]);

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
	newItem.complete();
}


// get items from a multiple-item page.
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
	/*	if (detectWeb(doc, url) == "multiple") {
		Z.selectItems(getSearchResults(doc, false), function (items) {
			if (!items) {
				return;
			}
			var articles = [];
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, scrape);
		});
	}
	else {*/
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
				"libraryCatalog": "FAO Documents",
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
				"libraryCatalog": "FAO Documents",
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
				"libraryCatalog": "FAO Documents",
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
		"url": "https://www.fao.org/documents/card/en/c/I9069EN",
		"defer": true,
		"items": [
			{
				"itemType": "book",
				"title": "Republic of Moldova Value Chain Gap Analysis",
				"creators": [
					{
						"firstName": "J.",
						"lastName": "O'Connell",
						"creatorType": "author"
					},
					{
						"firstName": "P.",
						"lastName": "Kiparisov",
						"creatorType": "author"
					}
				],
				"date": "2018",
				"ISBN": "9789251304839",
				"abstractNote": "Agriculture and food industry sectors have a major importance for the Moldovan economy. The Republic of Moldova has one of the highest share of rural population among the countries in Europe and Central Asia, and its agriculture sector significantly contributes to the country’s gross domestic product.\n\nThis work is a part of a series of studies on the value chain development gaps and the environment for doing business for farmers. The goal of this study is to try to consolidate the information on countrywide value chain development gathered from various open sources and based on materials developed in a field mission by FAO officers with an emphasis on the plum and berry value chains. The authors did not aim at close examination of the selected value chains; rather, this paper is a general overview that will be a reference point for future field work in the country.\n\nTo get the results, the authors analysed the legislative history related to value chains, collected materials and statistics from open sources, conducted a field mission and interviewed stakeholders.\n\nThe first part of the report observes the overall situation in the Republic of Moldova with a focus on the agriculture sector, reviewing related legislation, the environment for doing business for farmers, and trade. The paper examines existing support measures for agriculture and covers the banking sector and trade policy. The second part examines value chain actors and overviews the selected value chains of plums and berries. The final part provides recommendations.",
				"language": "en",
				"libraryCatalog": "FAO Documents",
				"numPages": "65",
				"place": "Rome, Italy",
				"publisher": "FAO",
				"url": "https://www.fao.org/documents/card/en/c/I9069EN",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Republic of Moldova"
					},
					{
						"tag": "agricultural sector"
					},
					{
						"tag": "data analysis"
					},
					{
						"tag": "economic analysis"
					},
					{
						"tag": "economic infrastructure"
					},
					{
						"tag": "economic situation"
					},
					{
						"tag": "research"
					},
					{
						"tag": "supply chain"
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
				"libraryCatalog": "FAO Documents",
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
				"libraryCatalog": "FAO Documents",
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
				"libraryCatalog": "FAO Documents",
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
				"libraryCatalog": "FAO Documents",
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
	}
]
/** END TEST CASES **/
