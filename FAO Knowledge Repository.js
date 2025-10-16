{
	"translatorID": "4883f662-29df-44ad-959e-27c9d036d165",
	"label": "FAO Knowledge Repository",
	"creator": "Bin Liu",
	"target": "^https?://openknowledge\\.fao\\.org/(items/|search|browse/|collections/)",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-10-16 16:05:06"
}

/*
	***** BEGIN LICENSE BLOCK *****
	Copyright © 2025 Bin Liu
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
	// Single item page pattern
	if (url.includes('/items/')) {
		// The text "Prodct type" can be in various languages
		const productTypeLabels = [
			'نوع المنتج', // Arabic
			'出版物类型', // Chinese
			'Product type', // English
			'Type de produit', // French
			'Тип продукта', // Russian
			'Tipo de producto', // Spanish
		];
		const productTypeLabelsPredicate = productTypeLabels.map(l => `contains(text(), '${l}')`).join(' or ');
		const productTypeRaw = ZU.xpathText(doc, `//*[${productTypeLabelsPredicate}]/following::text()[1]`) || '';

		if (!productTypeRaw) {
			// Wait for page to populate
			Z.monitorDOMChanges(doc.body);
			return false;
		}

		const productType = productTypeRaw.toLowerCase();

		// Product type --> Zotero item type mapping scheme:
		// - Book (series); Book (stand-alone); Booklet; Journal, magazine, bulletin --> Book
		// - Presentation --> Presentation
		// - Meeting --> Conference paper
		// - Infographic; Poster, banner --> Artwork
		// - Document; Brochure, flyer, fact-sheet; Project; Newsletter; any other --> Report
		if (/book|journal/.test(productType)) return 'book';
		if (/presentation/.test(productType)) return 'presentation';
		if (/meeting/.test(productType)) return 'conferencePaper';
		if (/infographic|poster/.test(productType)) return 'artwork';
		return 'report';
	}
	// Multiple items
	else if (url.includes('/search') || url.includes('/browse/') || url.includes('/collections/')) {
		return 'multiple';
	}
	return false;
}

async function doWeb(doc, url) {
	if (detectWeb(doc, url) == 'multiple') {
		let items = await Z.selectItems(getSearchResults(doc, false));
		if (!items) return;
		
		for (let url of Object.keys(items)) {
			await scrapeItem(url);
		}
	}
	else {
		await scrapeItem(url);
	}
}

async function scrapeItem(url) {
	// Extract UUID from the URL
	let uuid = url.match(/\/items\/([a-f0-9-]+)/)[1];
	
	// Construct the DSpace REST API endpoint
	let apiUrl = url.replace(/\/items\/.*/, '/server/api/core/items/' + uuid);
	
	// Fetch JSON metadata from the API
	let json = await requestJSON(apiUrl);
	
	// Create a new Zotero item
	let item = new Z.Item(determineItemType(json));

	// Map metadata fields
	if (json.metadata['dc.title']) {
		// Connect title and subtitle with '. ' unless the title ends with '?' or '!'.
		if (json.metadata['dc.title.subtitle']) {
			let titleLastChar = json.metadata['dc.title'][0].value.slice(-1);
			if (titleLastChar == '?' || titleLastChar == '!') {
				item.title = json.metadata['dc.title'][0].value + ' ' + json.metadata['dc.title.subtitle'][0].value;
			}
			else {
				item.title = json.metadata['dc.title'][0].value + '. ' + json.metadata['dc.title.subtitle'][0].value;
			}
		}
		else {
			item.title = json.metadata['dc.title'][0].value;
		}
	}
	
	if (json.metadata['dc.contributor.author']) {
		for (let author of json.metadata['dc.contributor.author']) {
			let authorList = author.value.split(';');
			for (let authorName of authorList) {
				authorName = authorName.trim();
				if (!authorName) continue;
				if (authorName.includes(',')) {
					// Format is "Last, First" - use ZU.cleanAuthor with comma=true
					let cleanedNames = ZU.cleanAuthor(authorName, 'author', true);
					// Check if firstName contains '(ed )' after cleaning, i.e. '(ed.)' before cleaning; if so, designate as editor
					if (cleanedNames.firstName && cleanedNames.firstName.includes('(ed )')) {
						cleanedNames.firstName = cleanedNames.firstName.replace('(ed )', '').trim();
						item.creators.push({
							firstName: cleanedNames.firstName,
							lastName: cleanedNames.lastName,
							creatorType: 'editor'
						});
					}
					else {
						item.creators.push(cleanedNames);
					}
				}
				else {
					// Single name or corporate author - use fieldMode
					item.creators.push({
						lastName: authorName,
						fieldMode: 1,
						creatorType: 'author'
					});
				}
			}
		}
	}
	
	if (json.metadata['dc.relation.ispartofseries']) {
		item.series = json.metadata['dc.relation.ispartofseries'][0].value;
	}

	if (json.metadata['dc.relation.number']) {
		item.seriesNumber = json.metadata['dc.relation.number'][0].value;
	}

	if (json.metadata['fao.edition']) {
		item.edition = json.metadata['fao.edition'][0].value;
	}

	if (json.metadata['fao.meetingtitle']) {
		item.conferenceName = json.metadata['fao.meetingtitle'][0].value;
	}

	if (json.metadata['fao.placeofpublication']) {
		let places = json.metadata['fao.placeofpublication'][0].value
			.split(';')
			.map(p => p.trim())
			.filter(p => p); // Remove empty strings
		item.place = places.join('; ');
	}

	if (json.metadata['dc.publisher']) {
		let publishers = json.metadata['dc.publisher'][0].value
			.split(';')
			.map(p => p.trim())
			.filter(p => p); // Remove empty strings
		item.publisher = publishers.join('; ');
	}

	if (json.metadata['dc.date.issued']) {
		item.date = json.metadata['dc.date.issued'][0].value;
	}

	if (json.metadata['dc.format.numberofpages']) {
		item.numPages = json.metadata['dc.format.numberofpages'][0].value.match(/\d+/)[0];
	}

	if (json.metadata['dc.language.iso']) {
		item.language = json.metadata['dc.language.iso'][0].value;
	}

	if (json.metadata['dc.identifier.isbn']) {
		item.ISBN = ZU.cleanISBN(json.metadata['dc.identifier.isbn'][0].value, true);
	}

	if (json.metadata['dc.identifier.uri']) {
		item.url = json.metadata['dc.identifier.uri'][0].value;
	}

	if (json.metadata['dc.rights.copyright']) {
		item.rights = json.metadata['dc.rights.copyright'][0].value;
	}
	
	if (json.metadata['fao.identifier.doi']) {
		item.DOI = ZU.cleanDOI(json.metadata['fao.identifier.doi'][0].value);
	}
	
	if (json.metadata['dc.description.abstract']) {
		let abstract = json.metadata['dc.description.abstract'][0].value;
		abstract = abstract.replace(/[ \t]+(\n)/g, '$1');
		abstract = abstract.replace(/\n+/g, '\n');
		item.abstractNote = abstract;
	}

	// Add PDF attachment if available
	try {
		await addPDFAttachment(item, json, uuid);
	}
	catch (e) {
		Z.debug("Error adding PDF attachment: " + e);
	}
	
	if (json.metadata['fao.subject.agrovoc']) {
		for (let subject of json.metadata['fao.subject.agrovoc']) {
			item.tags.push(subject.value);
		}
	}

	// For Meeting: add Meeting symbol, Meeting Session Number, Meeting date, and Meeting location to Extra
	// Need to assign item.extra as empty first, otherwise it's undefined
	item.extra = '';

	if (json.metadata['fao.meetingsymbol']) {
		item.extra = item.extra + 'Meeting symbol: ' + json.metadata['fao.meetingsymbol'][0].value + '\n';
	}

	if (json.metadata['fao.meetingsessionnumber']) {
		item.extra = item.extra + 'Meeting Session Number: ' + json.metadata['fao.meetingsessionnumber'][0].value + '\n';
	}

	if (json.metadata['fao.meetingdate']) {
		item.extra = item.extra + 'Meeting date: ' + json.metadata['fao.meetingdate'][0].value + '\n';
	}

	if (json.metadata['fao.meetinglocation']) {
		item.extra = item.extra + 'Meeting location: ' + json.metadata['fao.meetinglocation'][0].value + '\n';
	}

	item.complete();
}

async function addPDFAttachment(item, json) {
	// Fetch bundles to find PDF
	let bundlesUrl = json._links.bundles.href;
	let bundles = await requestJSON(bundlesUrl);
	// Look for ORIGINAL bundle with PDF
	if (bundles._embedded && bundles._embedded.bundles) {
		for (let bundle of bundles._embedded.bundles) {
			if (bundle.name === 'ORIGINAL') {
				let bitstreamsUrl = bundle._links.bitstreams.href;
				let bitstreams = await requestJSON(bitstreamsUrl);
				if (bitstreams._embedded && bitstreams._embedded.bitstreams) {
					for (let bitstream of bitstreams._embedded.bitstreams) {
						if (bitstream.name.toLowerCase().endsWith('.pdf')) {
							item.attachments.push({
								title: 'Full Text PDF',
								mimeType: 'application/pdf',
								url: bitstream._links.content.href
							});
							return;
						}
					}
				}
			}
		}
	}
}

function determineItemType(json) {
	// Map dc.type to Zotero item types.
	// Types (except Meeting) are listed at: https://openknowledge.fao.org/handle/20.500.14283/1
	// Mapping scheme (same as Product type):
	// - Book (series); Book (stand-alone); Booklet; Journal, magazine, bulletin --> Book
	// - Presentation --> Presentation
	// - Meeting --> Conference paper
	// - Infographic; Poster, banner --> Artwork
	// - Document; Brochure, flyer, fact-sheet; Project; Newsletter; any other --> Report
	if (json.metadata['dc.type'] && json.metadata['dc.type'][0]) {
		let dcType = json.metadata['dc.type'][0].value.toLowerCase();
		if (/(book|journal)/.test(dcType)) return 'book';
		if (/presentation/.test(dcType)) return 'presentation';
		if (/meeting/.test(dcType)) return 'conferencePaper';
		if (/(infographic|poster)/.test(dcType)) return 'artwork';
	}
	return 'report';
}

function getSearchResults(doc, checkOnly) {
	let items = {};
	let found = false;
	let rows = doc.querySelectorAll('a[href*="/items/"]');
	
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

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://openknowledge.fao.org/items/75a7f18a-3e96-4857-a3ab-37f9d3193604",
		"defer": 1,
		"items": [
			{
				"itemType": "book",
				"title": "FISH4ACP - Developing sustainable aquatic value chains. Practical guidance for analysis, strategy, and design",
				"creators": [
					{
						"firstName": "D.",
						"lastName": "Neven",
						"creatorType": "author"
					},
					{
						"firstName": "C.",
						"lastName": "Walker",
						"creatorType": "author"
					},
					{
						"firstName": "A.",
						"lastName": "Lienert",
						"creatorType": "author"
					},
					{
						"firstName": "G.",
						"lastName": "Macfayden",
						"creatorType": "author"
					},
					{
						"firstName": "B.",
						"lastName": "Romuld",
						"creatorType": "author"
					},
					{
						"firstName": "B.",
						"lastName": "Vilela López",
						"creatorType": "author"
					},
					{
						"firstName": "H.",
						"lastName": "Hodzic",
						"creatorType": "author"
					},
					{
						"firstName": "A.",
						"lastName": "Kourgansky",
						"creatorType": "author"
					},
					{
						"firstName": "P.-P.",
						"lastName": "Blanc",
						"creatorType": "author"
					},
					{
						"firstName": "K.",
						"lastName": "Hett",
						"creatorType": "author"
					},
					{
						"firstName": "A.",
						"lastName": "del Rio Poza",
						"creatorType": "author"
					}
				],
				"date": "2025",
				"ISBN": "9789251390771",
				"abstractNote": "Practical guide for the analysis and development of sustainable aquatic value chains, based on the methodology used by FISH4ACP, a global aquatic value chain development program, to analyse and develop fisheries and aquaculture value chains in 12 African, Caribbean and Pacific countries. It is part of a series of practitioner handbooks on sustainable value chain development within the framework of FAO’s sustainable food value chain (SFVC) approach. This guide provides practical guidance on assessing aquatic value chains, designing and implementing effective upgrading strategies, and strengthening stakeholder collaboration and governance.",
				"language": "English",
				"libraryCatalog": "FAO Knowledge Repository",
				"numPages": "164",
				"place": "Rome, Italy",
				"publisher": "FAO",
				"rights": "FAO",
				"url": "https://openknowledge.fao.org/handle/20.500.14283/cd2205en",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "aquatic value chains"
					},
					{
						"tag": "development plans"
					},
					{
						"tag": "development policies"
					},
					{
						"tag": "economic analysis"
					},
					{
						"tag": "functional analysis"
					},
					{
						"tag": "learning"
					},
					{
						"tag": "monitoring and evaluation"
					},
					{
						"tag": "social analysis"
					},
					{
						"tag": "stakeholder engagement"
					},
					{
						"tag": "sustainability assessment"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://openknowledge.fao.org/items/28fe3916-ad18-481d-92f5-42572165dae6",
		"defer": 1,
		"items": [
			{
				"itemType": "book",
				"title": "Developing sustainable food value chains - Practical guidance for systems-based analysis and design. SFVC methodological brief",
				"creators": [
					{
						"lastName": "FAO",
						"fieldMode": 1,
						"creatorType": "author"
					},
					{
						"lastName": "UNIDO",
						"fieldMode": 1,
						"creatorType": "author"
					}
				],
				"date": "2024",
				"abstractNote": "This brief outlines a rigorous and standardized approach for value chain analysis and design, taking a systems perspective to analyse and influence the behaviour and performance of value chain actors influenced by a complex environment. The brief also covers the design of upgrading strategies and associated development plans, based on the identification of root causes of value chain bottlenecks and using a participatory and multistakeholder approach. The brief is primarily based on FAO’s Sustainable Food Value Chain (SFVC) framework which promotes a systems-based development of agrifood value chains that are economically, socially and environmentally sustainable, as well as resilient to shocks and stressors.\nThe end-product of the application of the methodology is a VC report with four components. The first two components, a functional analysis and a sustainability assessment, make up the VC analysis. The last two components, an upgrading strategy and a development plan, represent the VC design.",
				"language": "English",
				"libraryCatalog": "FAO Knowledge Repository",
				"numPages": "40",
				"place": "Rome, Italy; Vienna, Austria",
				"publisher": "FAO; UNIDO",
				"rights": "FAO",
				"url": "https://openknowledge.fao.org/handle/20.500.14283/cc9291en",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "agrifood systems"
					},
					{
						"tag": "development plans"
					},
					{
						"tag": "governance"
					},
					{
						"tag": "sustainability assessment"
					},
					{
						"tag": "value chain analysis"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://openknowledge.fao.org/items/3b13b1e7-28e9-443d-b431-8e6062730f1b",
		"defer": 1,
		"items": [
			{
				"itemType": "book",
				"title": "中华人民共和国内陆渔业概况与加强内陆渔业统计资料收集与分析能力建设",
				"creators": [
					{
						"lastName": "​ 粮农组织",
						"fieldMode": 1,
						"creatorType": "author"
					}
				],
				"date": "2025",
				"ISBN": "9789251400494",
				"abstractNote": "中国地表水域面积达2060万公顷，水域和水生生物资源不仅是天然渔业生产的来源和基础，而且对基于种群增殖和水产养殖的鱼类生产意义重大。内陆天然捕捞生产主要集中在河流和湖泊，而大多数水库则以增殖渔业为主。2020年，全国淡水捕捞产量146万吨，比2019年下降20.84%。2005年以来，中国淡水捕捞及水产品产值突破200亿元，2018年达到峰值465.77亿元。随着经济不断发展，内陆捕捞业在社会经济中的作用也发生了变化。20世纪90年代以来，水产养殖产量逐渐增加；2010年以来，内陆捕捞产量逐渐减少。2016年以来，随着各项禁渔政策的出台和执法力度的加强，特别是“长江十年禁渔”政策的实施，以及主要湖泊禁渔休渔，内陆捕捞产量大幅下降。随着水域生态保护意识的增强、禁渔政策的实施和执法力度的加大，淡水捕捞产量和产值将进一步下降。然而，尽管水产养殖产量大幅增加，并提供了大部分淡水鱼供应，但来自天然水域的优质水产品仍然深受消费者青睐。",
				"language": "Chinese",
				"libraryCatalog": "FAO Knowledge Repository",
				"numPages": "134",
				"place": "意大利罗马",
				"publisher": "粮农组织",
				"rights": "FAO",
				"series": "渔业及水产养殖通报",
				"seriesNumber": "No. 1264",
				"url": "https://openknowledge.fao.org/handle/20.500.14283/cc9258zh",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "中国"
					},
					{
						"tag": "内陆捕捞渔业"
					},
					{
						"tag": "数据分析"
					},
					{
						"tag": "数据收集"
					},
					{
						"tag": "渔业统计"
					},
					{
						"tag": "生产统计"
					},
					{
						"tag": "生产要素"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://openknowledge.fao.org/items/40085e60-2d17-4c74-b4bc-78c2edbb0d3c",
		"defer": 1,
		"items": [
			{
				"itemType": "report",
				"title": "FAO + 日本：持続可能な開発に向けての連携拡大. リーフレット",
				"creators": [
					{
						"lastName": "FAO",
						"fieldMode": 1,
						"creatorType": "author"
					}
				],
				"date": "2020",
				"abstractNote": "日本は1951年に国際連合食糧農業機関（FAO）に加盟して以降、FAOの最重要パートナー国のひとつであり、食料安全保障の確立と自然資源の持続可能な利用の促進に努めてきました。日本の財政支援、専門技術や人材は、FAOの取り組む国際基準の設定や気候変動の緩和と適応、動植物の越境性病害虫への対策、栄養、世界農業遺産（GIAHS）、緊急対応やレジリエンスの構築といった幅広い分野において、きわめて重要といえます。",
				"institution": "FAO",
				"language": "Japanese",
				"libraryCatalog": "FAO Knowledge Repository",
				"place": "Tokyo, Japan",
				"rights": "FAO",
				"url": "https://openknowledge.fao.org/handle/20.500.14283/ca7473ja",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "合名会社"
					},
					{
						"tag": "国連食糧農業機関"
					},
					{
						"tag": "持続可能開発、持続的発展"
					},
					{
						"tag": "日本国"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://openknowledge.fao.org/items/1ca5357e-a044-4d20-8eb3-79f4148f5ab8",
		"defer": 1,
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "PC 130/5 - Visión y estrategia relativas a la labor de la FAO en materia de nutrición",
				"creators": [],
				"date": "2021",
				"conferenceName": "FAO Programme Committee (PC)",
				"extra": "Meeting symbol: PC 130/4\nMeeting Session Number: Sess. 130\nMeeting date: 22-26 March 2021\nMeeting location: Virtual Meeting",
				"language": "Spanish",
				"libraryCatalog": "FAO Knowledge Repository",
				"place": "Roma, Italia",
				"publisher": "FAO",
				"rights": "FAO",
				"url": "https://openknowledge.fao.org/handle/20.500.14283/ne853es",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
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
		"url": "https://openknowledge.fao.org/items/874a4dfa-0a98-4a2d-b3df-b08a48fee504",
		"defer": 1,
		"items": [
			{
				"itemType": "artwork",
				"title": "New food sources and production systems. Food safety perspectives and future trends",
				"creators": [
					{
						"lastName": "FAO",
						"fieldMode": 1,
						"creatorType": "author"
					}
				],
				"date": "2024",
				"abstractNote": "New food sources and production systems is a rapidly evolving and innovative sector that covers a range of foods, from plant-based food products, edible insects and seaweeds to products arising from technological innovations such as cell-based food production and precision fermentation. In addition to the nutritional and sustainability aspects of new foods, the associated food safety issues must be identified and addressed to guide the development of relevant standards and other food safety management measures needed to propel the sector forward and instil consumer trust. The Food and Agriculture Organization of the United Nations (FAO) aims to help prepare its Members for the arrival of new foods on the market by providing sufficient information that the Members can leverage to suitably protect the health of consumers and implement fair practices in trade. Using foresight approaches, FAO has been monitoring this emerging sector and evaluating the opportunities and challenges this sector brings for agrifood systems, especially in the context of food safety. Based on this foresight work, three focus areas were selected for a Food Safety Foresight Technical Meeting held at the FAO headquarters in Rome from 13 to 17 November 2023. This infographic accompanies the meeting report, Plant-based food products, precision fermentation and 3D food printing: food safety perspectives and future trends. It visualizes the key food safety issues, nutritional characteristics, environmental aspects, and consumer perceptions related to plant-based food products that mimic animal-derived foods, precision fermentation and 3D food printing.",
				"language": "English",
				"libraryCatalog": "FAO Knowledge Repository",
				"rights": "FAO",
				"url": "https://openknowledge.fao.org/handle/20.500.14283/cd2419en",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
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
		"url": "https://openknowledge.fao.org/items/3513ab01-f55f-4b23-9cbd-ed268aa8bc54",
		"defer": 1,
		"items": [
			{
				"itemType": "presentation",
				"title": "Цифровые Деревни в Европе и Центральной Азии",
				"creators": [
					{
						"lastName": "Digital Agriculture REU",
						"fieldMode": 1,
						"creatorType": "author"
					},
					{
						"lastName": "FAO",
						"fieldMode": 1,
						"creatorType": "author"
					}
				],
				"date": "2024",
				"abstractNote": "Recognizing the opportunities, but also the potential risks, offered by ICT for accelerating agricultural and rural development, in January 2021 FAO launched the Digital Villages Initiative (DVI) with the ambitious goal to convert at least 1000 villages around the world into Digital Villages. With DVI, FAO is supporting a digital rural transformation process to address agrifood systems’ challenges and improve the livelihoods and resilience of rural communities.   The flyer details the activities that are ongoing as part of the digital Villages initiative in REU.  Digital Villages enhance rural resilience and food security by providing farmers with digital tools for accessing inputs, market information, and alternative sales channels online. They deliver real-time data on prices, weather, and pests, enabling informed decisions on crop management and purchasing. These initiatives also simplify obtaining financial aid and insurance, with streamlined online applications and digital fund reception. This contributes to the development of the four betters and the achievement of SDG goals through localization facilitated through digitalization. The projects detailed in the flyer can be used for general information for other interested countries and regions.",
				"language": "Russian",
				"place": "Будапешт, Венгрия",
				"rights": "FAO",
				"url": "https://openknowledge.fao.org/handle/20.500.14283/cc8237ru",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Европа"
					},
					{
						"tag": "Центральная Азия"
					},
					{
						"tag": "деревни"
					},
					{
						"tag": "развитие села"
					},
					{
						"tag": "цифровое сельское хозяйство"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://openknowledge.fao.org/search?query=climate%20change",
		"defer": true,
		"items": "multiple"
	}
]
/** END TEST CASES **/
