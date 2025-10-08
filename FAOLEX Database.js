{
	"translatorID": "3b163469-3e62-46d8-82a1-4f31e86bf6f4",
	"label": "FAOLEX Database",
	"creator": "Bin Liu <lieubean@gmail.com>",
	"target": "^https?://www\\.fao\\.org/faolex/results/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-10-07 15:49:50"
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
	if (/\/faolex\/results\/details\//.test(url)) {
		// This matches the details page for a law
		return 'statute';
	} 
	else if (/\/faolex\/results\//.test(url)) {
		// Results/listing page with multiple laws
		return 'multiple';
	}
	return false;
}

//Multiple items don't work because the site use dynamic elements. Both ZU.processDocuments and requestDocument result in "Error: No title specified for item".
async function doWeb(doc, url) {
	// if (detectWeb(doc, url) == 'multiple') {
	// 	let items = await Z.selectItems(getSearchResults(doc, false));
	// 	if (!items) return;
		
	// 	for (let itemUrl of Object.keys(items)) {
	// 		await ZU.processDocuments(itemUrl, scrapeItem);
	// 		// Fetch the document for each URL
	// 		// let itemDoc = await requestDocument(itemUrl);
	// 		// await scrapeItem(itemDoc, itemUrl);
	// 	}
	// }
	// else {
		await scrapeItem(doc, url);
	// }
}

async function scrapeItem(doc, url) {
	let item = new Z.Item('statute');

	// Name of Act (title): English title (original title)
	// The label "Original title" appears in different languages
	const originalTitleLabels = [
		'العنوان الأصلي', // Arabic
		'原标题', // Chinese
		'Original title', // English
		'Titre original', // French
		'Оригинальное название', // Russian
		'Título original', // Spanish
	];

	let originalTitle = '';
	for (let label of originalTitleLabels) {
		originalTitle = ZU.xpathText(doc, `//*[contains(text(), '${label}')]/following-sibling::*[1]`) || '';
		if (originalTitle) break;
	}
	if (originalTitle.endsWith('.')) {
		originalTitle = originalTitle.slice(0, -1).trim();
	}
	
	let engTitle = doc.querySelector('.item-title')?.textContent.trim() || '';
	if (engTitle.endsWith('.')) {
		engTitle = engTitle.slice(0, -1).trim();
	}
	
	item.title = originalTitle ? `${engTitle} (${originalTitle})` : engTitle;

	item.creators.push({
		lastName: (doc.querySelector('.country')?.textContent.trim() || ''),
		creatorType: 'author',
		fieldMode: 1
	});

	//Public Law Number: Use the value of "FAOLEX No"
	item.number = doc.querySelector('.faolexid .item-value')?.textContent.trim() || '';
	
	// Date Enacted: Use the value of "Date of text"
	item.date = doc.querySelector('.dateOfText .item-value')?.textContent.trim() || '';
	
	item.language = doc.querySelector('.documentLanguage .item-value')?.textContent.trim() || '';
	
	let abstract = doc.querySelector('#abstractN0')?.innerText || '';
	abstract = abstract.replace(/\n+/g, '\n').trim();
	item.abstractNote = abstract;
	
	// PDF attachment: looks for links with PDF in the href
	let pdfLink = doc.querySelector('a[href$=".pdf"]');
	if (pdfLink) {
		item.attachments.push({
			title: "Full Text PDF",
			url: pdfLink.href,
			mimeType: "application/pdf"
		});
	}

	//tags: Use the value of "Keywords"
	let keywords = doc.querySelector('.keywords .item-value')?.textContent.trim();
	if (keywords) {
		let keywordArray = Array.from(new Set(
			keywords.split(';').map(k => k.trim()).filter(Boolean)
		));
		for (let k of keywordArray) {
			item.tags.push(k);
		}
	}
	
	item.url = url.endsWith('/') ? url.slice(0, -1) : url;

	item.complete();
}

function getSearchResults(doc, checkOnly) {
	let items = {};
	let found = false;
	let rows = doc.querySelectorAll('a[href*="/faolex/results/details/"]');
	
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

// Note on test cases: Because the site use dynamic elements , automatic test in Scaffold doesn't work. New tests must be added manually.

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.fao.org/faolex/results/details/fr/c/LEX-FAOC238894/",
		"defer": true,
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Fisheries Law",
				"creators": [
					{
						"lastName": "Cambodge (Niveau national)",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"dateEnacted": "16 June 2025",
				"abstractNote": "This Law is formulated with the goal of effectively managing, conserving and developing the fisheries sector, aiming to ensure long-term food security and economic and environmental sustainability. It also aims to protect the rights and benefits of fishers, fishing communities, aquaculture operators and businesses, in line with socio-economic and technological developments, while promoting participation in the sustainable management and conservation of fishery resources within regional and international frameworks — particularly in combating illegal, unreported and unregulated (IUU) fishing.\nThe Law sets up a comprehensive legal framework, covering: the management, protection, conservation and sustainable development of fishery resources; the protection of the interests of those involved in the fishery supply chain; support measures for the implementation of sectoral strategic plans in line with government policy; measures to meet necessary standards and conditions to ensure compatibility with international legal instruments; aquaculture management measures; etc. A Fisheries Commission shall be established to oversee the management and sustainability of the fisheries sector. The Law also introduces expanded inshore exclusive zones.\nThe Law consists of 15 Chapters and 104 Articles, with two Annexes.",
				"language": "Khmer",
				"publicLawNumber": "LEX-FAOC238894",
				"url": "https://www.fao.org/faolex/results/details/fr/c/LEX-FAOC238894",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Pêche illicite, non déclarée et non réglementée (INN)"
					},
					{
						"tag": "agriculture familiale"
					},
					{
						"tag": "aquaculture"
					},
					{
						"tag": "autorisation/permis"
					},
					{
						"tag": "biodiversité"
					},
					{
						"tag": "classement/déclassement"
					},
					{
						"tag": "commerce international"
					},
					{
						"tag": "commerce intérieur"
					},
					{
						"tag": "coopération internationale"
					},
					{
						"tag": "débarquement"
					},
					{
						"tag": "développement durable"
					},
					{
						"tag": "engins de pêche/méthodes de pêche"
					},
					{
						"tag": "gestion communautaire"
					},
					{
						"tag": "gestion et conservation  des pêches"
					},
					{
						"tag": "gestion intégrée"
					},
					{
						"tag": "gouvernance"
					},
					{
						"tag": "haute mer"
					},
					{
						"tag": "infractions/sanctions"
					},
					{
						"tag": "institution"
					},
					{
						"tag": "loi-cadre"
					},
					{
						"tag": "mariculture"
					},
					{
						"tag": "mesures du ressort de l’État du port"
					},
					{
						"tag": "mise en application/conformité"
					},
					{
						"tag": "pêche continentale"
					},
					{
						"tag": "pêche maritime"
					},
					{
						"tag": "pêche étrangère"
					},
					{
						"tag": "santé des animaux"
					},
					{
						"tag": "transbordement"
					},
					{
						"tag": "transformation/manutention"
					},
					{
						"tag": "utilisation durable"
					},
					{
						"tag": "zone marine"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.fao.org/faolex/results/details/en/c/LEX-FAOC237255",
		"defer": true,
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Climate Law (No. 7552) (İklim Kanunu (Kanun No. 7552))",
				"creators": [
					{
						"lastName": "Türkiye",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"dateEnacted": "02 July 2025",
				"abstractNote": "The Climate Law seeks to combat climate change in line with the green growth vision and net zero emissions target. It covers the reduction of greenhouse gas emissions and climate change adaptation activities, which are fundamental to combating climate change, as well as planning and implementation tools, revenues, permits, and inspections, and the procedures and principles of the related legal and institutional framework.\nThis Law adopts the approaches of equality, climate justice, precaution, participation, integration, sustainability, transparency, just transition, and progress. It obliges public institutions and organizations, as well as real and legal persons, to comply with and implement the measures and regulations to be taken in the public interest in accordance with this Law, in a timely manner. In the Nationally Determined Contributions (NDCs), the country's development priorities and special conditions will be taken into account in line with the net-zero emissions target, and measures will be taken within this framework.\nArticle 5 of the Climate Law lays down the activities to combat climate change, consisting of greenhouse gas emission reduction activities and climate change adaptation activities. Relevant public institutions and organizations are obligated to adapt, prepare, implement, monitor, and update planning tools containing medium- and long-term targets within the framework of greenhouse gas emission reduction activities. The public institutions and organizations are responsible for implementing mitigation measures, such as: (i) efficiency of energy, water, and raw material; (ii) preventing pollution at source; (iii) increasing the use of renewable energy; (iv) reducing the carbon footprint of products, businesses, institutions, and organizations; (v) using alternative clean or low-carbon fuels and raw materials; (vi) expanding electrification; and (vii) developing and increasing the use of clean technologies, in a manner consistent with the net-zero emissions target and the circular economy approach, in the sectors listed in the NDCs. Relevant institutions and organizations shall take measures to prevent carbon sink losses in forests, agricultural lands, pastures, and wetlands to offset emissions towards achieving the net-zero emissions target.\nThis Law provides for the establishment of the Emissions Trading System (ETS) and lays down provisions on the principles of allocations, the composition and duties of the Carbon Market Board, and voluntary carbon markets and offsets. It gives priority to climate-friendly investments with a high potential for reducing greenhouse gas emissions or adapting to climate change, as well as activities that contribute to meeting the research, development, and sectoral technological transformation needs required for green growth, and the mechanisms implemented within this scope. Article 14 sets out administrative sanctions, including but not limited to: violation of prohibitions or restrictions related to ozone-depleting substances, fluorinated greenhouse gases, hydrofluorocarbons and the monitoring greenhouse gas emissions, and businesses operating within the scope of the ETS without a greenhouse gas emission permit.",
				"language": "Turkish",
				"publicLawNumber": "LEX-FAOC237255",
				"url": "https://www.fao.org/faolex/results/details/en/c/LEX-FAOC237255",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "agricultural land"
					},
					{
						"tag": "air quality/air pollution"
					},
					{
						"tag": "allocation/quota"
					},
					{
						"tag": "basic legislation"
					},
					{
						"tag": "bioenergy"
					},
					{
						"tag": "biofuel"
					},
					{
						"tag": "business/industry/corporations"
					},
					{
						"tag": "certification"
					},
					{
						"tag": "circular economy"
					},
					{
						"tag": "climate change"
					},
					{
						"tag": "data collection/reporting"
					},
					{
						"tag": "emissions"
					},
					{
						"tag": "emissions pricing"
					},
					{
						"tag": "energy conservation/energy production"
					},
					{
						"tag": "enforcement/compliance"
					},
					{
						"tag": "environmental planning"
					},
					{
						"tag": "governance"
					},
					{
						"tag": "green economy"
					},
					{
						"tag": "hazardous substances"
					},
					{
						"tag": "innovation"
					},
					{
						"tag": "inspection"
					},
					{
						"tag": "institution"
					},
					{
						"tag": "insurance"
					},
					{
						"tag": "investment"
					},
					{
						"tag": "monitoring"
					},
					{
						"tag": "offences/penalties"
					},
					{
						"tag": "oil"
					},
					{
						"tag": "ozone layer"
					},
					{
						"tag": "policy/planning"
					},
					{
						"tag": "pollution control"
					},
					{
						"tag": "precautionary principle"
					},
					{
						"tag": "protection of environment"
					},
					{
						"tag": "renewable energy"
					},
					{
						"tag": "research"
					},
					{
						"tag": "risk assessment/management"
					},
					{
						"tag": "sustainable development"
					},
					{
						"tag": "water resources management"
					},
					{
						"tag": "wetlands"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.fao.org/faolex/results/details/ru/c/LEX-FAOC237135/",
		"defer": true,
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Law No. 128 “Water Code” (ВОДНЫЙ КОДЕКС КЫРГЫЗСКОЙ РЕСПУБЛИКИ от 27 июня 2025 года № 128)",
				"creators": [
					{
						"lastName": "Кыргызстан (Национальный уровень)",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"dateEnacted": "27 June 2025",
				"abstractNote": "The Water Code establishes a comprehensive legal framework governing water relations, emphasizing the regulation of water use, protection, and development to ensure adequate and safe water supply for the population, environmental protection, and rational resource development. It underscores the state's ownership of water resources, the basin management approach, and principles such as stakeholder participation, environmental responsibility, and economic valuation of water. The document delineates the roles and competencies of various state bodies, including the President, Parliament, Cabinet of Ministers, and specialized councils, such as the National Water and Land Council and basin councils, with responsibilities ranging from policy formulation, legislation development, to water resource management and monitoring. Key measures include the development of national strategies and programs, basin plans, and water management policies aligned with international obligations. The Code specifies procedures for water allocation, permits, and contracts, prioritizing water use for drinking, household needs, irrigation, and energy generation. It details the regulation of groundwater extraction, the issuance of permits, and the transfer and extension of water use rights, alongside mechanisms for water pricing, exemptions, and liability for violations. The document also emphasizes environmental standards, pollution control, and the classification of water quality, along with establishing security zones, emergency response systems, and dam safety protocols. Institutional responsibilities for monitoring, enforcement, and stakeholder engagement are explicitly outlined, with timelines for periodic reviews and updates. Implementation mechanisms include the establishment of a unified water information system, state water inventories, and registers, with data collection, analysis, and reporting procedures governed by the Cabinet of Ministers. The Code prescribes institutional roles for water management authorities, environmental agencies, and local administrations, detailing procedures for permits, inspections, and dispute resolution. It also addresses international cooperation, stipulating principles for cross-border water relations, treaty compliance, and joint project financing. Overall, the document provides a detailed legal and institutional blueprint for water governance, emphasizing procedural clarity, stakeholder participation, and compliance with international standards.",
				"language": "русский",
				"publicLawNumber": "LEX-FAOC237135",
				"url": "https://www.fao.org/faolex/results/details/ru/c/LEX-FAOC237135",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "базовое законодательство"
					},
					{
						"tag": "водоснабжение"
					},
					{
						"tag": "возобновляемая энергия"
					},
					{
						"tag": "государственная система водоснабжения"
					},
					{
						"tag": "договоры"
					},
					{
						"tag": "дозволение/разрешение"
					},
					{
						"tag": "международное сотрудничество"
					},
					{
						"tag": "мониторинг"
					},
					{
						"tag": "орошение"
					},
					{
						"tag": "охрана окружающей среды"
					},
					{
						"tag": "питьевая вода"
					},
					{
						"tag": "поверхностные воды"
					},
					{
						"tag": "подземные воды"
					},
					{
						"tag": "права на воду"
					},
					{
						"tag": "приоритеты"
					},
					{
						"tag": "производство гидроэлектроэнергии"
					},
					{
						"tag": "процедурные вопросы"
					},
					{
						"tag": "сбор данных/отчетность"
					},
					{
						"tag": "стандарты"
					},
					{
						"tag": "стандарты качества воды"
					},
					{
						"tag": "управление водными ресурсами"
					},
					{
						"tag": "устойчивое использование"
					},
					{
						"tag": "устойчивое развитие"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.fao.org/faolex/results/details/zh/c/LEX-FAOC231816/",
		"defer": true,
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Regulations of the Ningxia Hui Autonomous Region on Ecological and Environmental Protection (宁夏回族自治区生态环境保护条例)",
				"creators": [
					{
						"lastName": "中国 (Ningxia)",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"dateEnacted": "28 November 2024",
				"abstractNote": "The Regulations aim to protect and improve the ecological environment, prevent and control pollution and other public hazards, safeguard public health and ecological environment rights and interests, promote the construction of ecological civilization, and promote sustainable economic and social development. The Regulations consist of 8 Chapters: Chapter 1 General Provisions; Chapter 2 Supervision and Administration; Chapter 3: Protecting and Improving the Ecological Environment; Chapter 4 Prevention and Control of Pollution and Other Public Hazards; Chapter 5 Environmental Risk Prevention and Emergency Response; Chapter 6 Information Disclosure and Public Participation; Chapter 7 Legal Liability; Chapter 8 Supplementary Provisions.\nThe Regulations reflect a broader commitment to ecological civilization and align with national policies on environmental protection, emphasizing the importance of collaborative efforts among various governmental departments and stakeholders through comprehensive environmental governance with a multi-faceted approach. The People's Government of the Autonomous Region shall organize the preparation of a water pollution prevention and control plan for the Ningxia section of the Yellow River Basin and strengthen the construction of a natural conservation area system with national parks as the main body. Local governments are tasked to establish robust monitoring and management systems for pollution sources, enhance emergency response capabilities for environmental incidents, and conduct regular risk assessments. The Regulations emphasize the need for public participation in environmental protection initiatives, including education and awareness campaigns to foster a culture of ecological responsibility. Additionally, the Regulations make provisions on the establishment of compensation mechanisms for ecological protection and the promotion of green technologies and practices across sectors. In terms of food, agriculture, and natural resource management, the Regulations advocate for sustainable practices that protect biodiversity and prevent resource depletion. Specific measures include the prohibition of illegal hunting and harvesting of protected species, as well as the implementation of water pollution prevention plans in agricultural areas. The Regulations also call for the integration of ecological considerations into agricultural policies and practices, ensuring that food production does not compromise environmental integrity.",
				"language": "汉语",
				"publicLawNumber": "LEX-FAOC231816",
				"url": "https://www.fao.org/faolex/results/details/zh/c/LEX-FAOC231816",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "保护区"
					},
					{
						"tag": "公众参与"
					},
					{
						"tag": "公共卫生"
					},
					{
						"tag": "公共用水"
					},
					{
						"tag": "内陆水域"
					},
					{
						"tag": "再生能源"
					},
					{
						"tag": "创新"
					},
					{
						"tag": "危害"
					},
					{
						"tag": "可持续利用"
					},
					{
						"tag": "可持续发展"
					},
					{
						"tag": "商业/工业/企业"
					},
					{
						"tag": "土壤污染/质量"
					},
					{
						"tag": "地下水"
					},
					{
						"tag": "地表水"
					},
					{
						"tag": "废弃物管理"
					},
					{
						"tag": "废物处理"
					},
					{
						"tag": "授权/许可"
					},
					{
						"tag": "排放"
					},
					{
						"tag": "排放定价"
					},
					{
						"tag": "政策/计划"
					},
					{
						"tag": "教育"
					},
					{
						"tag": "数据收集/报告"
					},
					{
						"tag": "栖息地保护"
					},
					{
						"tag": "检查"
					},
					{
						"tag": "森林管理/森林保护"
					},
					{
						"tag": "水资源管理"
					},
					{
						"tag": "污染控制"
					},
					{
						"tag": "污染者付费原则"
					},
					{
						"tag": "污水废水/排放"
					},
					{
						"tag": "治理"
					},
					{
						"tag": "沼泽地"
					},
					{
						"tag": "淡水污染"
					},
					{
						"tag": "物种保护"
					},
					{
						"tag": "环境保护"
					},
					{
						"tag": "环境影响评价"
					},
					{
						"tag": "环境规划"
					},
					{
						"tag": "生态友好的产品/生态友好型工艺"
					},
					{
						"tag": "生态系统保护"
					},
					{
						"tag": "生活垃圾"
					},
					{
						"tag": "生物多样性"
					},
					{
						"tag": "空气质量/空气污染"
					},
					{
						"tag": "管理/保护"
					},
					{
						"tag": "粮食安全"
					},
					{
						"tag": "综合管理"
					},
					{
						"tag": "绿色经济"
					},
					{
						"tag": "节能/能源生产"
					},
					{
						"tag": "融资"
					},
					{
						"tag": "责任/补偿"
					},
					{
						"tag": "跨界影响"
					},
					{
						"tag": "运输/仓储"
					},
					{
						"tag": "违法行为/处罚"
					},
					{
						"tag": "非生活来源的废弃物"
					},
					{
						"tag": "预警系统"
					},
					{
						"tag": "预防浪费"
					},
					{
						"tag": "风险评估/管理"
					},
					{
						"tag": "饮用水"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.fao.org/faolex/results/details/es/c/LEX-FAOC236786/",
		"defer": true,
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Resolución 1415/2024 - Norma Técnica de Alimentos para Animales de la República Argentina",
				"creators": [
					{
						"lastName": "Argentina (Nivel nacional)",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"dateEnacted": "03 December 2024",
				"abstractNote": "Por la presente Resolución se aprueba la Norma Técnica de Alimentos para Animales de la República Argentina, como marco normativo consolidado e integral para toda la temática de alimentos destinados a la alimentación animal. En particular, se mantiene el Registro de Productos destinados a la Alimentación Animal vigente, en el cual deben inscribirse todos los productos debidamente aprobados destinados a la alimentación animal que se elaboren, comercialicen, fraccionen, depositen, distribuyan, importen y/o exporten, los cuales deberán contar para ello con un establecimiento autorizado por el Servicio Nacional de Sanidad y Calidad Agroalimentaria(SENASA). Por otro lado, se establecen las condiciones generales de los productos que no requieren registro, así como también de aquellos productos elaborados a pedido.\nLa Norma Técnica asimismo contempla disposiciones detalladas en cuanto a las condiciones generales sobre la comercialización de los productos, las especificaciones completas de los niveles de garantía establecidas, los embalajes y rótulos.",
				"language": "Español",
				"publicLawNumber": "LEX-FAOC236786",
				"url": "https://www.fao.org/faolex/results/details/es/c/LEX-FAOC236786",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "alimentos para animales/piensos"
					},
					{
						"tag": "buenas prácticas"
					},
					{
						"tag": "comercio interior"
					},
					{
						"tag": "comercio internacional"
					},
					{
						"tag": "higiene/procedimientos sanitarios"
					},
					{
						"tag": "medicamentos"
					},
					{
						"tag": "negocios/industria/corporaciones"
					},
					{
						"tag": "resistencia a los antimicrobianos"
					},
					{
						"tag": "sanidad animal"
					},
					{
						"tag": "transporte/depósito"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
