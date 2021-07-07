{
	"translatorID": "c89e7721-9cb3-431c-bc95-5b8d85169449",
	"label": "CNTD",
	"creator": "PChemGuy",
	"target": "https?://docs.cntd.ru/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsbv",
	"lastUpdated": "2020-04-23 15:35:49"
}

/**
	***** BEGIN LICENSE BLOCK *****

	Copyright В© 2020 PChemGuy

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

/**
	A provider of legislative, technical, and regulatory documents in Russian.
	With primary focus on documents produced by Russian authorities, CNTD also
	serves translated into Russian foreign and international documents applicable
	to activities in Russia.
*/

const filters = {
	metadataTableCSS: "div#tab-content2-low > div.document > table.status",
	pdfKeyScriptCSS: "div#page-wrapper > script:nth-child(2)",
	searchResultCSS: "div#tab-content-search > div.content > ul > li > a"
};

const keywords = {
	activeLaw: "Действующий",
	codeAmendments: "(с изменениями на",
	codeVersion: "(редакция"
};

// Holds extracted metadata
let metadata;
let metahtml;

let fieldMap = {
	"Название документа": "title",
	"Номер документа": "publicDocNumber",
	"Вид документа": "docType",
	"Принявший орган": "authority",
	Статус: "legalStatus",
	Опубликован: "published",
	"Дата принятия": "dateApproved",
	"Дата начала действия": "dateEnacted",
	"Дата редакции": "dateAmended",
	"Дата окончания действия": "dateRevoked"
};

/**
	Custom document types
	Each custom type consists of:
		key:		user facing original type name
		"type": 	specific subtype that could be used for coding purposes
		"itemType": Zotero item type
		"short":	user facing shortened type name
		"abbr":		user facing type name abbreviation
		"tags":		tags to be added
*/
const docTypes = {
	ГОСТ: { type: "standard", itemType: "report", short: "ГОСТ", abbr: "ГОСТ", tags: ['standard', 'GOST'] },
	"ГОСТ Р": { type: "standard", itemType: "report", short: "ГОСТ Р", abbr: "ГОСТ Р", tags: ['standard', 'GOST'] },
	"Кодекс РФ": { type: "code", itemType: "statute", short: "Кодекс РФ", abbr: "Кодекс РФ", tags: ['RF Code'] },
	РБ: { type: "statute", itemType: "statute", short: "Руководство по безопасности", abbr: "РБ" },
	"ГН (Гигиенические нормативы)": { type: "statute", itemType: "statute", short: "Гигиенические нормативы", abbr: "ГН" },
	"ФНП (Федеральные нормы и правила)": { type: "statute", itemType: "statute", short: "Федеральные нормы и правила", abbr: "ФНП" },
	"СП (Санитарные правила)": { type: "statute", itemType: "statute", short: "Санитарные правила", abbr: "СП" },
	СанПиН: { type: "statute", itemType: "statute", short: "Санитарные правила и нормы", abbr: "СанПиН" },
	СНиП: { type: "statute", itemType: "statute", short: "Строительные нормы и правила", abbr: "СНиП" },
	"СП (Свод правил)": { type: "statute", itemType: "statute", short: "Свод правил", abbr: "СП" },
	"Информационно-технический справочник по наилучшим доступным технологиям":
		{ type: "statute", itemType: "statute", short: "Информационно-технический справочник по наилучшим доступным технологиям", abbr: "ИТС" },
	"ПОТ РМ": { type: "statute", itemType: "statute", short: "ПОТ РМ", abbr: "ПОТ РМ" },
	ПБ: { type: "statute", itemType: "statute", short: "Правила безопасности", abbr: "ПОТ РМ" },
	"СТО, Стандарт организации": { type: "statute", itemType: "statute", short: "Стандарт организации", abbr: "СТО" },
	"ТР (Технический регламент)": { type: "statute", itemType: "statute", short: "Технический регламент", abbr: "ТР" },
	"Технический регламент Таможенного союза":
		{ type: "statute", itemType: "statute", short: "Технический регламент Таможенного союза", abbr: "ТР ТС" },
	"Технический регламент Евразийского экономического союза":
		{ type: "statute", itemType: "statute", short: "Технический регламент Евразийского экономического союза", abbr: "ТР ЕАЭС" },
	"Государственная поверочная схема": { type: "statute", itemType: "statute",
		short: "Государственная поверочная схема", abbr: "ГПС" },
	Изменение: { type: "statute", itemType: "statute", short: "Изменение", abbr: "Изменение" },
	"МР (Методические рекомендации)": { type: "statute", itemType: "statute", short: "Методические рекомендации", abbr: "МР" },
	"Инструкция по промышленной безопасности и охране труда":
		{ type: "statute", itemType: "statute", short: "ИПБОТ", abbr: "ИПБОТ" },
	Statute: { type: "statute", itemType: "statute", short: "Statute", abbr: "statute" }
};

const legalTypes = ["Указ", "Приказ", "Постановление", "Распоряжение"];

/**
	There are records with no document type defined. When such a type can be
	defined based on document title, an array element is added here, which is an
	arrayed pair of "pattern" to be matched against the title and "custom type".
	Additionally, a corresponding descriptor is added to "docTypes".
*/
const docTypePatterns = [
	[/^Государственная поверочная схема для/, "Государственная поверочная схема"],
	[/^Методические рекомендации /, "МР (Методические рекомендации)"],
	[/^ИПБОТ /, "Инструкция по промышленной безопасности и охране труда"]
];

// Use this to match against document type field (for multi-valued types)
const matchTypePattern = [
	[/Технический регламент Таможенного союза/, "Технический регламент Таможенного союза"],
	[/Технический регламент/, "ТР (Технический регламент)"],
	[/СанПиН/, "СанПиН"],
	[/СНиП/, "СНиП"],
	[/ГН/, "ГН (Гигиенические нормативы)"],
	[/СП \(Свод правил\)/, "СП (Свод правил)"],
	[/СП \(Санитарные правила\)/, "СП (Санитарные правила)"],
	[/ФНП в области /, "ФНП (Федеральные нормы и правила)"],
	[/ПБ/, "ПБ"],
	[/ПОТ РМ/, "ПОТ РМ"]
];


function detectWeb(doc, _url) {
	let pathname = doc.location.pathname;
	let searchPattern = '/search/';
	let recordPattern = /^\/document\/([0-9]+)/;

	if (pathname.includes(searchPattern)) {
		return 'multiple';
	}

	if (pathname.match(recordPattern)) {
		metadata = {};
		metahtml = {};
		metadata.CNTDID = pathname.match(recordPattern)[1];
		parseMetadata(doc);
		return metadata.itemType;
	}

	return false;
}


function doWeb(doc, url) {
	let detected = detectWeb(doc, url);
	if (detected == 'multiple') {
		let searchResult = getSearchResult(doc, url);
		if (searchResult) {
			Zotero.selectItems(searchResult,
				function (selectedRecords) {
					if (selectedRecords) {
						ZU.processDocuments(Object.keys(selectedRecords), doWeb);
					}
				}
			);
		}
	} else {
		adjustMetadata();
		scrape(doc, url);
	}
}


function getSearchResult(doc, _url) {
	let records = {};
	let searchResult = doc.querySelectorAll(filters.searchResultCSS);
	searchResult.forEach(record => records[record.href] = record.innerText.trim());
	return records;
}


// Constructs Zotero item and populates it
function scrape(doc, url) {
	let extra = [];
	let zItem = new Zotero.Item(metadata.itemType);
	// creator: {fieldMode: 1, firstName: "", lastName: "", creatorType: "author"};
	let authorities = metadata.authority.split(' ## ');
	for (let authority of authorities) {
		zItem.creators.push({
			fieldMode: 1,
			firstName: "",
			lastName: authority,
			creatorType: "author"
		});
	}

	zItem.title = metadata.title;
	zItem.url = url;
	zItem.language = 'Russian';

	// For statute, the date/dateEnacted field is set to the last amendment
	// date. Original enactment date is stored in the extra field.
	zItem.date = metadata.dateAmended ? metadata.dateAmended : metadata.dateEnacted;

	switch (metadata.itemType) {
		case 'statute':
			zItem.codeNumber = metadata.subType;
			zItem.publicLawNumber = metadata.publicDocNumber;
			if (metadata.code) zItem.code = metadata.code;
			if (metadata.section) zItem.section = metadata.section;
			break;
		case 'report':
			zItem.reportType = metadata.subType;
			zItem.reportNumber = metadata.publicDocNumber;
			break;
	}

	switch (metadata.subType) {
		case 'Кодекс РФ':
		case 'ФНП (Федеральные нормы и правила)':
			zItem.codeNumber = metadata.docType;
			break;
	}

	// Extra
	extra.push('CNTDID: ' + metadata.CNTDID);
	if (metadata.published) extra.push('Published: ' + metadata.published);
	extra.push('dateEnactedOriginal: ' + metadata.dateEnacted);
	if (metadata.dateApproved) extra.push('dateApproved: ' + metadata.dateApproved);
	if (metadata.dateRevoked) extra.push('dateRevoked: ' + metadata.dateRevoked);
	zItem.extra = extra.join('\n');

	if (metadata.tags) zItem.tags.push(...metadata.tags);
	if (metadata.legalStatus && metadata.legalStatus != keywords.activeLaw) zItem.tags.push('Inactive');
	if (metadata.dateRevoked) zItem.tags.push('Revoked');

	zItem.complete();
}


/**
 *	Parses record table with document metadata into global metadata object
 *
 *	@return {null}
 */
function parseMetadata(doc) {
	let irow;
	let descTableRows = doc.querySelector(filters.metadataTableCSS).rows;
	let subType;

	// Parse description table
	for (irow = 0; irow < descTableRows.length; irow++) {
		let rowCells = descTableRows[irow].cells;
		if (rowCells.length == 0) continue;
		let fieldName = fieldMap[rowCells[0].innerText.trim().slice(0, -1)];
		metadata[fieldName] = rowCells[1].innerText.trim();
		metahtml[fieldName] = rowCells[1].innerHTML;
	}
	let title = metadata.title;

	// Try to deduce type from the multi-valued type field
	if (metadata.docType) {
		let docType = metadata.docType;
		for (let pattern of matchTypePattern) {
			if (docType.match(pattern[0])) {
				subType = pattern[1];
				break;
			}
		}
		if (subType) {
			switch (subType) {
				case 'ТР (Технический регламент)':
					if (title.startsWith('ТР ЕАЭС')) subType = 'Технический регламент Евразийского экономического союза';
					break;
			}
			metadata.subType = subType;
		}
	}

	// Try to deduce type from the title
	if (!metadata.docType) {
		for (let pattern of docTypePatterns) {
			if (title.match(pattern[0])) {
				metadata.docType = pattern[1];
				break;
			}
		}
	}

	if (!metadata.docType) metadata.docType = 'Statute';
	metadata.type = 'statute';
	metadata.itemType = 'statute';

	// Set subType from docType if not set.
	if (!metadata.subType) {
		subType = metadata.docType.match(/^[^\n]+/)[0].trim(); // For RF Codes (1st line)
		metadata.subType = subType;
	}
	let subT = docTypes[subType];
	if (subT) {
		metadata.type = subT.type;
		metadata.itemType = subT.itemType;
	}
}


/**
 *	Adjust metadata
 *
 *	@return {null}
 */
function adjustMetadata() {
	let subType = metadata.subType;
	let subT = docTypes[subType];

	/**
		Document ID, title, type, and authority may have multiple values separated
		by several new lines. Replace separator with " ## ".
		There are issues with missing "\n" (innerText) in place of <br> (innerHTML)
		possibly due to the "doc" format passed by the tester, hence the extra code.
	*/
	if (metadata.publicDocNumber) {
		metadata.publicDocNumber = metahtml.publicDocNumber
			.replace(/<br>/g, '\n').trim().replace(/[\n]+/g, ' ## ');
	}
	metadata.title = metahtml.title.replace(/<br>/g, '\n').trim().replace(/[\n]+/g, ' ## ');
	if (metadata.authority) metadata.authority = metadata.authority.replace(/[\t\n]+/g, ' ## ');

	/*
		Remove document type and number prefix from title
		This general processing must go before the next block, in which additional
		type-specific processing may be performed.
	*/
	let prefixPatterns = [];
	prefixPatterns.push(subType + ' ' + metadata.publicDocNumber + ' ');
	prefixPatterns.push(metadata.publicDocNumber + ' ' + subType + ' ');
	if (subT) prefixPatterns.push(subT.abbr + ' ' + metadata.publicDocNumber + ' ');
	let title = metadata.title;
	for (let prefix of prefixPatterns) {
		if (title.startsWith(prefix)) {
			metadata.title = title.slice(prefix.length);
			break;
		}
	}

	if (subT) {
		let docNumber;
		let docType;
		let section;
		let docSubNumber;
		let title;
		let prefix;
		let codeTitle;
		let icutoff;
		let pattern;
		let dateApproved;

		switch (subType) {
			case 'Кодекс РФ':
				// Set docType to the second line ("Federal law")
				metadata.docType = metadata.docType.match(/^[^\n]+[\n\t]+([^\n]+)/)[1].trim();
				codeTitle = metadata.title;
				icutoff = codeTitle.indexOf(keywords.codeAmendments);
				if (icutoff == -1) icutoff = codeTitle.indexOf(keywords.codeVersion);
				metadata.code = codeTitle.slice(0, icutoff).trim();
				break;
			case 'РБ':
				// Remove document type and number prefix from title
				metadata.title = metadata.title.replace(subType + '-' + metadata.publicDocNumber + ' ', '');
				title = metadata.title;
				pattern = RegExp('^' + subT.short + ' "([^"]+)"$');
				title = title.match(pattern);
				if (title) metadata.title = title[1];
				break;
			case 'ПОТ РМ':
				prefix = metadata.title.match(/^ПОТ Р ?М-([0-9./-]+) /);
				if (prefix) {
					metadata.title = metadata.title.slice(prefix[0].length);
					docNumber = prefix[1];
					docSubNumber = metadata.publicDocNumber
						.replace(' ## ' + docNumber, '').replace(docNumber + ' ## ', '').replace(docNumber, '');
					if (docSubNumber) metadata.publicDocNumber = docNumber + ' ## ' + docSubNumber;
				}
				break;
			case 'ПБ':
				title = metadata.title;
				prefix = 'Об утверждении Правил ';
				if (title.startsWith(prefix)) {
					title = title.replace('Об утверждении Правил ', 'Правила ');
				} else {
					prefix = metadata.title.match(/^ПБ ([0-9.-]+) /);
					if (prefix) {
						let docNumber = prefix[1];
						if (metadata.publicDocNumber.includes(docNumber)) {
							title = title.slice(prefix[0].length);
							let docSubNumber = metadata.publicDocNumber
								.replace(' ## ' + docNumber, '').replace(docNumber + ' ## ', '').replace(docNumber, '');
							if (docSubNumber) metadata.publicDocNumber = docNumber + ' ## ' + docSubNumber;
						}
					}
				}
				metadata.title = title;
				break;
			case 'СТО, Стандарт организации':
				title = metadata.title;
				prefix = subT.abbr + ' ([^0-9]+) ' + metadata.publicDocNumber + ' ';
				prefix = title.match(prefix);
				if (prefix) {
					metadata.title = title.replace(prefix[0], '');
					if (!metadata.authority) metadata.authority = prefix[1];
					else metadata.section = prefix[1];
				}
				break;
			case 'ГН (Гигиенические нормативы)':
			case 'СанПиН':
			case 'СП (Санитарные правила)':
				if (!metadata.publicDocNumber) break;
				docNumber = metadata.title.slice(subT.abbr.length + 1).match(/^[^\s]+/);
				if (docNumber) {
					docNumber = metadata.publicDocNumber.match(docNumber[0]);
				}
				if (docNumber) {
					docNumber = docNumber[0];
					metadata.title = metadata.title.replace(subT.abbr + ' ' + docNumber + ' ', '');
					docSubNumber = metadata.publicDocNumber
						.replace(' ## ' + docNumber, '').replace(docNumber + ' ## ', '').replace(docNumber, '');
					if (docSubNumber) metadata.publicDocNumber = docNumber + ' ## ' + docSubNumber;
				}
				if (subType[0] == 'С') metadata.code = 'СП (Санитарные правила)';
				break;
			case 'СНиП':
				dateApproved = metadata.dateApproved;
				dateApproved = dateApproved.replace('*', '');
				dateApproved = dateApproved.replace(/\n.*/, '').trim();
				metadata.dateApproved = dateApproved;
				title = metadata.title;
				title = title.replace('*', '');
				prefix = title.match(/^СНиП ([0-9./-]+) /);
				if (prefix) {
					title = title.slice(prefix[0].length);
					docNumber = prefix[1];
					docSubNumber = metadata.publicDocNumber
						.replace(' ## ' + docNumber, '').replace(docNumber + ' ## ', '').replace(docNumber, '');
					if (docSubNumber) metadata.publicDocNumber = docNumber + ' ## ' + docSubNumber;
				}
				metadata.title = title;
				metadata.code = 'СП (Свод правил)';
				break;
			case 'СП (Свод правил)':
				metadata.code = 'СП (Свод правил)';
				break;
			case 'ФНП (Федеральные нормы и правила)':
				metadata.code = subType;
				docType = metadata.docType;
				section = docType.match(subT.abbr + '[^\\n]+')[0];
				metadata.section = section;
				metadata.docType = docType.replace(section, '').trim();
				title = metadata.title;
				prefix = /^Об утверждении (|и введении в действие )федеральных норм и правил в области [^"]+/i;
				prefix = title.match(prefix);
				if (prefix) {
					title = title.replace(prefix[0], '');
				} else {
					docNumber = /^НП-[0-9-]+/;
					docNumber = title.match(docNumber);
					if (docNumber) {
						docNumber = docNumber[0];
						title = title.replace(docNumber, '');
						docSubNumber = metadata.publicDocNumber
							.replace(' ## ' + docNumber, '').replace(docNumber + ' ## ', '').replace(docNumber, '');
						if (docSubNumber) metadata.publicDocNumber = docNumber + ' ## ' + docSubNumber;
					}
				}
				metadata.title = title.replace(/"/g, '');
				break;
			case 'ТР (Технический регламент)':
				title = metadata.title;
				title = title.replace(/^Об утверждении технического регламента /i, '');
				title = title.replace(/^о/, 'О');
				metadata.title = title;
				metadata.title = metadata.title.replace(/"/g, '');
				metadata.code = 'ТР (Технический регламент)';
				break;
			case 'Технический регламент Евразийского экономического союза':
			case 'Технический регламент Таможенного союза':
				// Remove document type and number prefix from title
				metadata.title = metadata.title.replace(/"/g, '');
				metadata.code = 'ТР (Технический регламент)';
				break;
		}

		// Tags
		if (subT.tags) metadata.tags = subT.tags;
	} else {
		// Remove authority from document type
		for (let legalType of legalTypes) {
			if (subType.indexOf(legalType) == 0) {
				metadata.subType = legalType;
				break;
			}
		}
	}

	// Remove authority from document type
	let docType = metadata.docType;
	for (let legalType of legalTypes) {
		if (docType.indexOf(legalType) == 0) {
			metadata.docType = legalType;
			break;
		}
	}

	// Replace separator when multiple publication sources are provided
	if (metadata.published) metadata.published = metadata.published.replace(/[\t\n]+/g, ' ## ');

	// Parse dates with Russian month names
	if (metadata.dateApproved) metadata.dateApproved = parseDate(metadata.dateApproved);
	if (metadata.dateEnacted) metadata.dateEnacted = parseDate(metadata.dateEnacted);
	if (metadata.dateAmended) metadata.dateAmended = parseDate(metadata.dateAmended);
	if (metadata.dateRevoked) metadata.dateRevoked = parseDate(metadata.dateRevoked);
	if (!metadata.dateEnacted) metadata.dateEnacted = metadata.dateApproved;
}


/**
 *	Parses date in Russian
 *
 *	@param {String} text - date string DD ruMonth YYYY
 *	@return {String} - date string M/D/Y.
 */
function parseDate(text) {
	const monthsRu = { января: 1, февраля: 2, марта: 3, апреля: 4, мая: 5, июня: 6,
		июля: 7, августа: 8, сентября: 9, октября: 10, ноября: 11, декабря: 12 };
	let datePattern = /^\s*([0-9]{1,2})\s+([^\s]+)\s+([0-9]+)/;
	let date = text.match(datePattern);
	if (!date) return undefined;
	if (!monthsRu[date[2]]) return undefined;
	date = monthsRu[date[2]] + '/' + date[1] + '/' + date[3];
	return date;
}


/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://docs.cntd.ru/document/1200128307",
		"items": [
			{
				"itemType": "report",
				"title": "Межгосударственная система стандартизации (МГСС). Основные положения (Переиздание)",
				"creators": [
					{
						"fieldMode": 1,
						"firstName": "",
						"lastName": "Росстандарт",
						"creatorType": "author"
					}
				],
				"date": "10/01/2019",
				"extra": "CNTDID: 1200128307\nPublished: Официальное издание. М.: Стандартинформ, 2019 год\ndateEnactedOriginal: 7/01/2016\ndateApproved: 12/11/2015",
				"language": "Russian",
				"libraryCatalog": "CNTD",
				"reportNumber": "1.0-2015",
				"reportType": "ГОСТ",
				"url": "http://docs.cntd.ru/document/1200128307",
				"attachments": [],
				"tags": [
					{
						"tag": "GOST"
					},
					{
						"tag": "standard"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://docs.cntd.ru/document/901932011",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "О внесении изменений в Указ Президента Российской Федерации от 16 июля 2004 года N 910 \"О мерах по совершенствованию государственного управления\" (утратил силу с 04.04.2006 на основании Указа Президента РФ от 30.03.2006 N 285)",
				"creators": [
					{
						"fieldMode": 1,
						"firstName": "",
						"lastName": "Президент РФ",
						"creatorType": "author"
					}
				],
				"dateEnacted": "4/26/2005",
				"codeNumber": "Указ",
				"extra": "CNTDID: 901932011\nPublished: Собрание законодательства Российской Федерации, N 18, 02.05.2005, ст.1665\ndateEnactedOriginal: 4/26/2005\ndateApproved: 4/26/2005\ndateRevoked: 4/04/2006",
				"language": "Russian",
				"publicLawNumber": "473",
				"url": "http://docs.cntd.ru/document/901932011",
				"attachments": [],
				"tags": [
					{
						"tag": "Inactive"
					},
					{
						"tag": "Revoked"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://docs.cntd.ru/document/901931853",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "О награждении государственными наградами Российской Федерации работников государственного унитарного предприятия \"Московский метрополитен\"",
				"creators": [
					{
						"fieldMode": 1,
						"firstName": "",
						"lastName": "Президент РФ",
						"creatorType": "author"
					}
				],
				"dateEnacted": "4/25/2005",
				"codeNumber": "Указ",
				"extra": "CNTDID: 901931853\nPublished: Собрание законодательства Российской Федерации, N 18, 02.05.2005\ndateEnactedOriginal: 4/25/2005\ndateApproved: 4/25/2005",
				"language": "Russian",
				"publicLawNumber": "472",
				"url": "http://docs.cntd.ru/document/901931853",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://docs.cntd.ru/document/1200102193",
		"items": [
			{
				"itemType": "report",
				"title": "Стандартизация в Российской Федерации. Основные положения (с Изменением N 1)",
				"creators": [
					{
						"fieldMode": 1,
						"firstName": "",
						"lastName": "Росстандарт",
						"creatorType": "author"
					}
				],
				"date": "11/22/2013",
				"extra": "CNTDID: 1200102193\nPublished: официальное издание ## М.: Стандартинформ, 2013 год\ndateEnactedOriginal: 7/01/2013\ndateApproved: 11/23/2012",
				"language": "Russian",
				"libraryCatalog": "CNTD",
				"reportNumber": "1.0-2012",
				"reportType": "ГОСТ Р",
				"url": "http://docs.cntd.ru/document/1200102193",
				"attachments": [],
				"tags": [
					{
						"tag": "GOST"
					},
					{
						"tag": "standard"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://docs.cntd.ru/document/901712929",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "О государственном регулировании обеспечения плодородия земель сельскохозяйственного назначения (с изменениями на 5 апреля 2016 года) (редакция, действующая с 1 июля 2016 года)",
				"creators": [
					{
						"fieldMode": 1,
						"firstName": "",
						"lastName": "Государственная Дума",
						"creatorType": "author"
					}
				],
				"dateEnacted": "4/05/2016",
				"codeNumber": "Федеральный закон",
				"extra": "CNTDID: 901712929\nPublished: Собрание законодательства Российской Федерации, N 29, 20.07.98, ст.3399 ## Ведомости Федерального Собрания, N 22, 01.08.98\ndateEnactedOriginal: 7/16/1998\ndateApproved: 7/16/1998",
				"language": "Russian",
				"publicLawNumber": "101-ФЗ",
				"url": "http://docs.cntd.ru/document/901712929",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://docs.cntd.ru/document/901832805",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Гражданский процессуальный кодекс Российской Федерации (с изменениями на 2 декабря 2019 года) (редакция, действующая с 30 марта 2020 года)",
				"creators": [
					{
						"fieldMode": 1,
						"firstName": "",
						"lastName": "Государственная Дума",
						"creatorType": "author"
					}
				],
				"dateEnacted": "12/02/2019",
				"code": "Гражданский процессуальный кодекс Российской Федерации",
				"codeNumber": "Федеральный закон",
				"extra": "CNTDID: 901832805\nPublished: Российская газета, N 220, 20.11.2002 ## Парламентская газета, N 220-221, 20.11.2002 ## Собрание законодательства Российской Федерации, N 46, 18.11.2002, ст.4532 ## Приложение к \"Российской газете\", N 46, 2002 год ## Ведомости Федерального Собрания РФ, N 33, 21.11.2002\ndateEnactedOriginal: 2/01/2003\ndateApproved: 11/14/2002",
				"language": "Russian",
				"publicLawNumber": "138-ФЗ",
				"url": "http://docs.cntd.ru/document/901832805",
				"attachments": [],
				"tags": [
					{
						"tag": "RF Code"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://docs.cntd.ru/document/1200003915",
		"items": [
			{
				"itemType": "report",
				"title": "Шайбы. Технические условия (с Изменениями N 1, 2, 3)",
				"creators": [
					{
						"fieldMode": 1,
						"firstName": "",
						"lastName": "Госстандарт СССР",
						"creatorType": "author"
					}
				],
				"date": "8/01/2006",
				"extra": "CNTDID: 1200003915\nPublished: официальное издание ## Шайбы и контрящие элементы. Технические условия. Конструкция и размеры: Сб. стандартов. - М.: Стандартинформ, 2006 год\ndateEnactedOriginal: 1/01/1979\ndateApproved: 6/26/1978",
				"language": "Russian",
				"libraryCatalog": "CNTD",
				"reportNumber": "11371-78",
				"reportType": "ГОСТ",
				"url": "http://docs.cntd.ru/document/1200003915",
				"attachments": [],
				"tags": [
					{
						"tag": "GOST"
					},
					{
						"tag": "standard"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://docs.cntd.ru/document/564602190",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "ОКАТО Общероссийский классификатор объектов административно-территориального деления ОК 019-95",
				"creators": [
					{
						"fieldMode": 1,
						"firstName": "",
						"lastName": "Росстандарт",
						"creatorType": "author"
					}
				],
				"dateEnacted": "4/01/2020",
				"codeNumber": "Изменение",
				"extra": "CNTDID: 564602190\ndateEnactedOriginal: 4/01/2020\ndateApproved: 3/13/2020",
				"language": "Russian",
				"publicLawNumber": "400/2020",
				"url": "http://docs.cntd.ru/document/564602190",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://docs.cntd.ru/document/437253093",
		"items": [
			{
				"itemType": "report",
				"title": "Дороги автомобильные общего пользования. Смеси литые асфальтобетонные дорожные горячие и асфальтобетон литой дорожный. Методы испытаний",
				"creators": [
					{
						"fieldMode": 1,
						"firstName": "",
						"lastName": "Росстандарт",
						"creatorType": "author"
					}
				],
				"date": "6/01/2020",
				"extra": "CNTDID: 437253093\ndateEnactedOriginal: 6/01/2020\ndateApproved: 3/27/2020",
				"language": "Russian",
				"libraryCatalog": "CNTD",
				"reportNumber": "54400-2020",
				"reportType": "ГОСТ Р",
				"url": "http://docs.cntd.ru/document/437253093",
				"attachments": [],
				"tags": [
					{
						"tag": "GOST"
					},
					{
						"tag": "Inactive"
					},
					{
						"tag": "standard"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://docs.cntd.ru/document/1200170667",
		"items": [
			{
				"itemType": "report",
				"title": "Параметры и критерии оценки качества вождения с целью оценки безопасности использования транспортных средств",
				"creators": [
					{
						"fieldMode": 1,
						"firstName": "",
						"lastName": "Росстандарт",
						"creatorType": "author"
					}
				],
				"date": "6/01/2020",
				"extra": "CNTDID: 1200170667\nPublished: Официальное издание. М.: Стандартинформ, 2020\ndateEnactedOriginal: 6/01/2020\ndateApproved: 12/25/2019",
				"language": "Russian",
				"libraryCatalog": "CNTD",
				"reportNumber": "58782-2019",
				"reportType": "ГОСТ Р",
				"url": "http://docs.cntd.ru/document/1200170667",
				"attachments": [],
				"tags": [
					{
						"tag": "GOST"
					},
					{
						"tag": "Inactive"
					},
					{
						"tag": "standard"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://docs.cntd.ru/document/563813381",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Государственная поверочная схема для средств измерений содержания неорганических компонентов в водных растворах",
				"creators": [
					{
						"fieldMode": 1,
						"firstName": "",
						"lastName": "Ростехнадзор",
						"creatorType": "author"
					}
				],
				"dateEnacted": "1/01/2020",
				"codeNumber": "Государственная поверочная схема",
				"extra": "CNTDID: 563813381\nPublished: Официальный сайт Росстандарта www.gost.ru по состоянию на 21.11.2019\ndateEnactedOriginal: 1/01/2020\ndateApproved: 11/01/2019",
				"language": "Russian",
				"url": "http://docs.cntd.ru/document/563813381",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://docs.cntd.ru/document/564183718",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Методические рекомендации по определению допустимого рабочего давления магистральных нефтепроводов и нефтепродуктоводов",
				"creators": [
					{
						"fieldMode": 1,
						"firstName": "",
						"lastName": "Ростехнадзор",
						"creatorType": "author"
					}
				],
				"dateEnacted": "1/14/2020",
				"codeNumber": "РБ",
				"extra": "CNTDID: 564183718\ndateEnactedOriginal: 1/14/2020\ndateApproved: 1/14/2020",
				"language": "Russian",
				"url": "http://docs.cntd.ru/document/564183718",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://docs.cntd.ru/document/564444866",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Руководство по безопасности при использовании атомной энергии \"Рекомендации по оценке уровня безопасности пунктов хранения и проведению анализа несоответствий требованиям действующих федеральных норм и правил в области использования атомной энергии\"",
				"creators": [
					{
						"fieldMode": 1,
						"firstName": "",
						"lastName": "Ростехнадзор",
						"creatorType": "author"
					}
				],
				"dateEnacted": "3/12/2020",
				"codeNumber": "РБ",
				"extra": "CNTDID: 564444866\ndateEnactedOriginal: 3/12/2020\ndateApproved: 3/12/2020",
				"language": "Russian",
				"publicLawNumber": "164-20",
				"url": "http://docs.cntd.ru/document/564444866",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://docs.cntd.ru/document/1200105768",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Инструкция по промышленной безопасности и охране труда при обслуживании и эксплуатации вентиляционных установок (актуализированная редакция)",
				"creators": [
					{
						"fieldMode": 1,
						"firstName": "",
						"lastName": "ООО \"СПКТБ Нефтегазмаш\"",
						"creatorType": "author"
					}
				],
				"dateEnacted": "5/24/2017",
				"codeNumber": "Инструкция по промышленной безопасности и охране труда",
				"extra": "CNTDID: 1200105768\ndateEnactedOriginal: 5/24/2017\ndateApproved: 5/24/2017",
				"language": "Russian",
				"publicLawNumber": "409-2008",
				"url": "http://docs.cntd.ru/document/1200105768",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://docs.cntd.ru/document/557540415",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Предельно допустимые концентрации (ПДК) микроорганизмов-продуцентов, бактериальных препаратов и их компонентов в воздухе рабочей зоны ## ГН 2.1.6.3537-18 Предельно допустимые концентрации (ПДК) микроорганизмов-продуцентов, бактериальных препаратов и их компонентов в атмосферном воздухе городских и сельских поселений ## Об утверждении гигиенических нормативов ГН 2.1.6.3537-18 \"Предельно допустимые концентрации (ПДК) микроорганизмов-продуцентов, бактериальных препаратов и их компонентов в атмосферном воздухе городских и сельских поселений\" и гигиенических нормативов ГН 2.2.6.3538-18 \"Предельно допустимые концентрации (ПДК) микроорганизмов-продуцентов, бактериальных препаратов и их компонентов в воздухе рабочей зоны\"",
				"creators": [
					{
						"fieldMode": 1,
						"firstName": "",
						"lastName": "Главный государственный санитарный врач РФ",
						"creatorType": "author"
					}
				],
				"dateEnacted": "6/09/2018",
				"codeNumber": "ГН (Гигиенические нормативы)",
				"extra": "CNTDID: 557540415\nPublished: Официальный интернет-портал правовой информации www.pravo.gov.ru, 29.05.2018, N 0001201805290049\ndateEnactedOriginal: 6/09/2018\ndateApproved: 5/10/2018\ndateRevoked: 5/10/2028",
				"language": "Russian",
				"publicLawNumber": "2.2.6.3538-18 ## 32 ## 2.1.6.3537-18",
				"url": "http://docs.cntd.ru/document/557540415",
				"attachments": [],
				"tags": [
					{
						"tag": "Inactive"
					},
					{
						"tag": "Revoked"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://docs.cntd.ru/document/901865875",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Санитарные правила по определению класса опасности токсичных отходов производства и потребления ## О введении в действие СП 2.1.7.1386-03 (с изменениями на 31 марта 2011 года)",
				"creators": [
					{
						"fieldMode": 1,
						"firstName": "",
						"lastName": "Главный государственный санитарный врач РФ",
						"creatorType": "author"
					},
					{
						"fieldMode": 1,
						"firstName": "",
						"lastName": "Минздравмедпром России",
						"creatorType": "author"
					}
				],
				"dateEnacted": "3/31/2011",
				"code": "СП (Санитарные правила)",
				"codeNumber": "СП (Санитарные правила)",
				"extra": "CNTDID: 901865875\nPublished: Российская газета, N 119/1, 20.06.2003 (специальный выпуск) ## Сборник нормативно-правовых актов в области санитарно-эпидемиологического благополучия населения. Часть II.- М.: Федеральный центр госсанэпиднадзора Минздрава России, 2003 год\ndateEnactedOriginal: 7/01/2003\ndateApproved: 6/16/2003",
				"language": "Russian",
				"publicLawNumber": "2.1.7.1386-03 ## 144",
				"url": "http://docs.cntd.ru/document/901865875",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://docs.cntd.ru/document/901862250",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Предельно допустимые концентрации (ПДК) вредных веществ в воздухе рабочей зоны ## О введении в действие ГН 2.2.5.1313-03 (с изменениями на 29 июня 2017 года) (утратило силу с 04.05.2018 на основании постановления Главного государственного санитарного врача РФ от 13.02.2018 N 25)",
				"creators": [
					{
						"fieldMode": 1,
						"firstName": "",
						"lastName": "Главный государственный санитарный врач РФ",
						"creatorType": "author"
					},
					{
						"fieldMode": 1,
						"firstName": "",
						"lastName": "Минздрав России",
						"creatorType": "author"
					}
				],
				"dateEnacted": "6/29/2017",
				"codeNumber": "ГН (Гигиенические нормативы)",
				"extra": "CNTDID: 901862250\nPublished: Российская газета, N 119/1, 20.06.2003 (специальный выпуск) ## Гигиенические нормативы ГН 2.2.5.1313-03, издание официальное, Москва, 2003 год\ndateEnactedOriginal: 6/15/2003\ndateApproved: 4/30/2003\ndateRevoked: 5/04/2018",
				"language": "Russian",
				"publicLawNumber": "2.2.5.1313-03 ## 76",
				"url": "http://docs.cntd.ru/document/901862250",
				"attachments": [],
				"tags": [
					{
						"tag": "Inactive"
					},
					{
						"tag": "Revoked"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://docs.cntd.ru/document/1200041776",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Руководство по организации перевозки опасных грузов автомобильным транспортом",
				"creators": [
					{
						"fieldMode": 1,
						"firstName": "",
						"lastName": "Департамент автомобильного транспорта Минтранса России",
						"creatorType": "author"
					}
				],
				"dateEnacted": "2/08/1996",
				"codeNumber": "РД",
				"extra": "CNTDID: 1200041776\nPublished: / Министерство транспорта Российской Федерации. - М., 1996 год\ndateEnactedOriginal: 2/08/1996\ndateApproved: 2/08/1996",
				"language": "Russian",
				"publicLawNumber": "3112199-0199-96",
				"url": "http://docs.cntd.ru/document/1200041776",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://docs.cntd.ru/document/1200076312",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Санитарные нормы и правила по ограничению шума на территориях и в помещениях производственных предприятий",
				"creators": [
					{
						"fieldMode": 1,
						"firstName": "",
						"lastName": "Заместитель главного государственного санитарного врача СССР",
						"creatorType": "author"
					}
				],
				"dateEnacted": "4/30/1969",
				"codeNumber": "СанПиН",
				"extra": "CNTDID: 1200076312\nPublished: / Министерство здравоохранения СССР. - М., 1969 год\ndateEnactedOriginal: 4/30/1969\ndateApproved: 4/30/1969",
				"language": "Russian",
				"url": "http://docs.cntd.ru/document/1200076312",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://docs.cntd.ru/document/1200034684",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Санитарные нормы допустимых концентраций (ПДК) химических веществ в почве",
				"creators": [
					{
						"fieldMode": 1,
						"firstName": "",
						"lastName": "Заместитель главного государственного санитарного врача СССР",
						"creatorType": "author"
					}
				],
				"dateEnacted": "10/30/1987",
				"code": "СП (Санитарные правила)",
				"codeNumber": "СанПиН",
				"extra": "CNTDID: 1200034684\nPublished: Сборник важнейших официальных материалов по санитарным и противоэпидемическим вопросам. В семи томах. Том 2. В двух частях. Часть 2. - М.: МП \"Рарог\", 1992 год\ndateEnactedOriginal: 10/30/1987\ndateApproved: 10/30/1987",
				"language": "Russian",
				"publicLawNumber": "42-128-4433-87",
				"url": "http://docs.cntd.ru/document/1200034684",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://docs.cntd.ru/document/901852023",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Гигиенические требования к проектированию предприятий и установок атомной промышленности (СПП ПУАП-03) ## О введении в действие санитарно-эпидемиологических правил и нормативов СанПиН 2.6.1.07-03 \"Гигиенические требования к проектированию предприятий и установок атомной промышленности\" (с изменениями на 15 мая 2003 года)",
				"creators": [
					{
						"fieldMode": 1,
						"firstName": "",
						"lastName": "Главный государственный санитарный врач РФ",
						"creatorType": "author"
					},
					{
						"fieldMode": 1,
						"firstName": "",
						"lastName": "Минздрав России",
						"creatorType": "author"
					}
				],
				"dateEnacted": "5/15/2003",
				"code": "СП (Санитарные правила)",
				"codeNumber": "СанПиН",
				"extra": "CNTDID: 901852023\nPublished: Российская газета, N 71, 12.04.2003 ## Бюллетень нормативных актов федеральных органов исполнительной власти, N 25, 23.06.2003 ## Приложение к \"Российской газете\", N 27, 2003 год (опубликовано без приложения)\ndateEnactedOriginal: 4/23/2003\ndateApproved: 2/04/2003",
				"language": "Russian",
				"publicLawNumber": "2.6.1.07-03 ## 6",
				"url": "http://docs.cntd.ru/document/901852023",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://docs.cntd.ru/document/1200034335",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Межотраслевые правила по охране труда при производстве асбеста и асбестосодержащих материалов и изделий",
				"creators": [
					{
						"fieldMode": 1,
						"firstName": "",
						"lastName": "Министерство труда и социального развития РФ",
						"creatorType": "author"
					}
				],
				"dateEnacted": "7/01/2000",
				"codeNumber": "ПОТ РМ",
				"extra": "CNTDID: 1200034335\nPublished: / Минтруда РФ. - СПб.: ЦОТПБСП, 2000 год\ndateEnactedOriginal: 7/01/2000\ndateApproved: 1/31/2000",
				"language": "Russian",
				"publicLawNumber": "010-2000",
				"url": "http://docs.cntd.ru/document/1200034335",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://docs.cntd.ru/document/1200008143",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Межотраслевые правила по охране труда при использовании химических веществ",
				"creators": [
					{
						"fieldMode": 1,
						"firstName": "",
						"lastName": "Министерство труда и социального развития РФ",
						"creatorType": "author"
					}
				],
				"dateEnacted": "4/01/1998",
				"codeNumber": "ПОТ РМ",
				"extra": "CNTDID: 1200008143\nPublished: СПб.: ЦОТПБСП, 2000 год\ndateEnactedOriginal: 4/01/1998\ndateApproved: 9/17/1997",
				"language": "Russian",
				"publicLawNumber": "004-97",
				"url": "http://docs.cntd.ru/document/1200008143",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://docs.cntd.ru/document/901821239",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Межотраслевые правила по охране труда при проведении работ по пайке и лужению изделий ## Об утверждении Межотраслевых правил по охране труда при проведении работ по пайке и лужению изделий",
				"creators": [
					{
						"fieldMode": 1,
						"firstName": "",
						"lastName": "Министерство труда и социального развития РФ",
						"creatorType": "author"
					}
				],
				"dateEnacted": "10/01/2002",
				"codeNumber": "ПОТ РМ",
				"extra": "CNTDID: 901821239\nPublished: Российская газета, N 154-155, 20.08.2002 ## Бюллетень нормативных актов федер. органов исполнит. власти, N32, 12.08.2002 ## Бюллетень Министерства труда и социального развития РФ, N 7, 2002 год\ndateEnactedOriginal: 10/01/2002\ndateApproved: 6/17/2002",
				"language": "Russian",
				"publicLawNumber": "022-2002 ## 41",
				"url": "http://docs.cntd.ru/document/901821239",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://docs.cntd.ru/document/901857383",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Правила сертификации электрооборудования для взрывоопасных сред",
				"creators": [
					{
						"fieldMode": 1,
						"firstName": "",
						"lastName": "Госстандарт России",
						"creatorType": "author"
					},
					{
						"fieldMode": 1,
						"firstName": "",
						"lastName": "Госгортехнадзор России",
						"creatorType": "author"
					}
				],
				"dateEnacted": "6/09/2003",
				"codeNumber": "ПБ",
				"extra": "CNTDID: 901857383\nPublished: Российская газета, N 101, 29.05.2003 ## Бюллетень нормативных актов федеральных органов исполнительной власти, N 28, 14.07.2003 ## Вестник Госстандарта России, N 6, 2003 год ## официальное издание, Серия 03. Нормативные документы межотраслевого применения по вопросам промышленной безопасности и охраны недр. Вып.23. - М.: ГУП \"НТЦ \"Промышленная безопасность\", 2003 год\ndateEnactedOriginal: 6/09/2003\ndateApproved: 3/19/2003\ndateRevoked: 1/01/2021",
				"language": "Russian",
				"publicLawNumber": "28/10 ## 03-538-03",
				"url": "http://docs.cntd.ru/document/901857383",
				"attachments": [],
				"tags": [
					{
						"tag": "Revoked"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://docs.cntd.ru/document/1200029691",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Правила охраны сооружений и природных объектов от вредного влияния подземных горных разработок на угольных месторождениях",
				"creators": [
					{
						"fieldMode": 1,
						"firstName": "",
						"lastName": "Госгортехнадзор России",
						"creatorType": "author"
					}
				],
				"dateEnacted": "3/16/1998",
				"codeNumber": "ПБ",
				"extra": "CNTDID: 1200029691\nPublished: / Серия \"Библиотека горного инженера\". Справочник по охране недр. Том 7 \"Охрана недр\". Книга 2. - М.: Изд-во \"Горное дело\" ООО \"Киммерийский центр\", 2011 год\ndateEnactedOriginal: 3/16/1998\ndateApproved: 3/16/1998",
				"language": "Russian",
				"publicLawNumber": "07-269-98 ## 13",
				"url": "http://docs.cntd.ru/document/1200029691",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://docs.cntd.ru/document/563400440",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Инженерные изыскания для строительства в районах распространения набухающих грунтов. Общие требования",
				"creators": [
					{
						"fieldMode": 1,
						"firstName": "",
						"lastName": "Министерство строительства и жилищно-коммунального хозяйства Российской Федерации",
						"creatorType": "author"
					}
				],
				"dateEnacted": "7/29/2019",
				"code": "СП (Свод правил)",
				"codeNumber": "СП (Свод правил)",
				"extra": "CNTDID: 563400440\nPublished: Официальное издание. М.: Стандартинформ, 2019 год\ndateEnactedOriginal: 7/29/2019\ndateApproved: 1/28/2019",
				"language": "Russian",
				"publicLawNumber": "449.1326000.2019",
				"url": "http://docs.cntd.ru/document/563400440",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://docs.cntd.ru/document/902359424",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "О безопасности взрывчатых веществ и изделий на их основе",
				"creators": [
					{
						"fieldMode": 1,
						"firstName": "",
						"lastName": "Комиссия Таможенного союза",
						"creatorType": "author"
					}
				],
				"dateEnacted": "7/01/2014",
				"code": "ТР (Технический регламент)",
				"codeNumber": "Технический регламент Таможенного союза",
				"extra": "CNTDID: 902359424\nPublished: Официальный сайт Комиссии таможенного союза www.tsouz.ru, 20.07.2012\ndateEnactedOriginal: 7/01/2014\ndateApproved: 7/20/2012",
				"language": "Russian",
				"publicLawNumber": "ТР ТС 028/2012",
				"url": "http://docs.cntd.ru/document/902359424",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://docs.cntd.ru/document/456090353",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "О безопасности упакованной питьевой воды, включая природную минеральную воду",
				"creators": [
					{
						"fieldMode": 1,
						"firstName": "",
						"lastName": "Совет ЕЭК",
						"creatorType": "author"
					}
				],
				"dateEnacted": "1/01/2019",
				"code": "ТР (Технический регламент)",
				"codeNumber": "Технический регламент Евразийского экономического союза",
				"extra": "CNTDID: 456090353\nPublished: Официальный сайт Евразийского экономического союза www.eaeunion.org, 05.09.2017\ndateEnactedOriginal: 1/01/2019\ndateApproved: 6/23/2017",
				"language": "Russian",
				"publicLawNumber": "ТР ЕАЭС 044/2017",
				"url": "http://docs.cntd.ru/document/456090353",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://docs.cntd.ru/document/1200043175",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Технический регламент операционного контроля качества строительно-монтажных и специальных работ при возведении зданий и сооружений. 08. Устройство гидроизоляции подземной части здания",
				"creators": [
					{
						"fieldMode": 1,
						"firstName": "",
						"lastName": "Руководитель Комплекса архитектуры, строительства, развития и реконструкции города",
						"creatorType": "author"
					}
				],
				"dateEnacted": "6/30/2000",
				"code": "ТР (Технический регламент)",
				"codeNumber": "ТР (Технический регламент)",
				"extra": "CNTDID: 1200043175\nPublished: / Правительство Москвы; Комплекс архитектуры, строительства, развития и реконструкции города. - М., 2000 год\ndateEnactedOriginal: 6/30/2000\ndateApproved: 6/30/2000",
				"language": "Russian",
				"publicLawNumber": "94.08-99",
				"url": "http://docs.cntd.ru/document/1200043175",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://docs.cntd.ru/document/551620626",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Правила безопасности в производстве растительных масел методом прессования и экстракции",
				"creators": [
					{
						"fieldMode": 1,
						"firstName": "",
						"lastName": "Ростехнадзор",
						"creatorType": "author"
					}
				],
				"dateEnacted": "6/14/2019",
				"code": "ФНП (Федеральные нормы и правила)",
				"codeNumber": "Приказ",
				"extra": "CNTDID: 551620626\nPublished: Официальный интернет-портал правовой информации www.pravo.gov.ru, 14.12.2018, N 0001201812140019\ndateEnactedOriginal: 6/14/2019\ndateApproved: 11/08/2018",
				"language": "Russian",
				"publicLawNumber": "538",
				"section": "ФНП в области промышленной безопасности",
				"url": "http://docs.cntd.ru/document/551620626",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://docs.cntd.ru/document/420215595",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Безопасность при обращении с радиоактивными отходами. Общие положения (с изменениями на 22 ноября 2018 года)",
				"creators": [
					{
						"fieldMode": 1,
						"firstName": "",
						"lastName": "Ростехнадзор",
						"creatorType": "author"
					}
				],
				"dateEnacted": "11/22/2018",
				"code": "ФНП (Федеральные нормы и правила)",
				"codeNumber": "Приказ",
				"extra": "CNTDID: 420215595\nPublished: Российская газета, N 24/1, 06.02.2015, (специальный выпуск)\ndateEnactedOriginal: 2/17/2015\ndateApproved: 8/05/2014",
				"language": "Russian",
				"publicLawNumber": "347 ## НП-058-14",
				"section": "ФНП в области использования атомной энергии",
				"url": "http://docs.cntd.ru/document/420215595",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://docs.cntd.ru/document/902289182",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Общие положения обеспечения безопасности исследовательских ядерных установок",
				"creators": [
					{
						"fieldMode": 1,
						"firstName": "",
						"lastName": "Ростехнадзор",
						"creatorType": "author"
					}
				],
				"dateEnacted": "9/13/2011",
				"code": "ФНП (Федеральные нормы и правила)",
				"codeNumber": "Приказ",
				"extra": "CNTDID: 902289182\nPublished: Российская газета, N 195, 02.09.2011\ndateEnactedOriginal: 9/13/2011\ndateApproved: 6/30/2011",
				"language": "Russian",
				"publicLawNumber": "348 ## НП-033-11",
				"section": "ФНП в области использования атомной энергии",
				"url": "http://docs.cntd.ru/document/902289182",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://docs.cntd.ru/document/1200034640",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Установки по переработке отработавшего ядерного топлива. Требования безопасности",
				"creators": [
					{
						"fieldMode": 1,
						"firstName": "",
						"lastName": "Госатомнадзор России",
						"creatorType": "author"
					}
				],
				"dateEnacted": "9/01/2000",
				"code": "ФНП (Федеральные нормы и правила)",
				"codeNumber": "Постановление",
				"extra": "CNTDID: 1200034640\nPublished: официальное издание ## Вестник Госатомнадзора России, N 3(9), 2000 год\ndateEnactedOriginal: 9/01/2000\ndateApproved: 12/27/1999",
				"language": "Russian",
				"publicLawNumber": "НП-013-99 ## 5",
				"section": "ФНП в области использования атомной энергии",
				"url": "http://docs.cntd.ru/document/1200034640",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://docs.cntd.ru/document/564138843",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Типовые технические требования к трансформаторам, автотрансформаторам  (распределительным, силовым)классов напряжения 110-750 кВ",
				"creators": [
					{
						"fieldMode": 1,
						"firstName": "",
						"lastName": "ПАО \"ФСК ЕЭС\"",
						"creatorType": "author"
					}
				],
				"dateEnacted": "12/20/2019",
				"codeNumber": "СТО, Стандарт организации",
				"extra": "CNTDID: 564138843\nPublished: Сайт Федеральной сетевой компании Единой энергетической системы (ФСК ЕЭС) www.fsk-ees.ru по состоянию на 15.01.2020\ndateEnactedOriginal: 12/20/2019\ndateApproved: 12/20/2019",
				"language": "Russian",
				"publicLawNumber": "56947007-29.180.01.275-2019",
				"url": "http://docs.cntd.ru/document/564138843",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://docs.cntd.ru/document/564468768",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Процессы выполнения работ по подготовке проектной документации. Основные положения. Внутренние системы газоснабжения технологических установок, котельных и малых теплоэлектроцентралей",
				"creators": [
					{
						"fieldMode": 1,
						"firstName": "",
						"lastName": "НОПРИЗ",
						"creatorType": "author"
					}
				],
				"dateEnacted": "1/01/2020",
				"codeNumber": "СТО, Стандарт организации",
				"extra": "CNTDID: 564468768\nPublished: Межотраслевое объединение работодателей (Ноприз) http://nopriz.ru по состоянию на 17.03.2020\ndateEnactedOriginal: 1/01/2020\ndateApproved: 9/17/2019",
				"language": "Russian",
				"publicLawNumber": "П-020-2019",
				"url": "http://docs.cntd.ru/document/564468768",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://docs.cntd.ru/document/552484101",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Музеи. Отопление, вентиляция, кондиционирование воздуха",
				"creators": [
					{
						"fieldMode": 1,
						"firstName": "",
						"lastName": "НП \"АВОК\"",
						"creatorType": "author"
					}
				],
				"dateEnacted": "8/15/2018",
				"codeNumber": "СТО, Стандарт организации",
				"extra": "CNTDID: 552484101\nPublished: М,: НП \"АВОК\", 2018 год\ndateEnactedOriginal: 8/15/2018\ndateApproved: 8/15/2018",
				"language": "Russian",
				"publicLawNumber": "7.7-2018",
				"section": "НП \"АВОК\"",
				"url": "http://docs.cntd.ru/document/552484101",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://docs.cntd.ru/document/564068890",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Производство алюминия",
				"creators": [
					{
						"fieldMode": 1,
						"firstName": "",
						"lastName": "Росстандарт",
						"creatorType": "author"
					}
				],
				"dateEnacted": "3/01/2020",
				"codeNumber": "Информационно-технический справочник по наилучшим доступным технологиям",
				"extra": "CNTDID: 564068890\nPublished: Официальный сайт Росстандарта www.gost.ru по состоянию на 27.12.2019\ndateEnactedOriginal: 3/01/2020\ndateApproved: 12/12/2019",
				"language": "Russian",
				"publicLawNumber": "11-2019",
				"url": "http://docs.cntd.ru/document/564068890",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://docs.cntd.ru/document/902243701",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "О безопасности сетей газораспределения и газопотребления (с изменениями на 14 декабря 2018 года)",
				"creators": [
					{
						"fieldMode": 1,
						"firstName": "",
						"lastName": "Правительство РФ",
						"creatorType": "author"
					}
				],
				"dateEnacted": "12/14/2018",
				"code": "ТР (Технический регламент)",
				"codeNumber": "ТР (Технический регламент)",
				"extra": "CNTDID: 902243701\nPublished: Собрание законодательства Российской Федерации, N 45, 08.11.2010, ст.5853\ndateEnactedOriginal: 11/08/2011\ndateApproved: 10/29/2010",
				"language": "Russian",
				"publicLawNumber": "870",
				"url": "http://docs.cntd.ru/document/902243701",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://docs.cntd.ru/document/902206841",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Требования к безопасности продуктов детского, диетического и лечебно-профилактического питания",
				"creators": [
					{
						"fieldMode": 1,
						"firstName": "",
						"lastName": "Правительство Республики Казахстан",
						"creatorType": "author"
					}
				],
				"dateEnacted": "7/01/2010",
				"code": "ТР (Технический регламент)",
				"codeNumber": "ТР (Технический регламент)",
				"extra": "CNTDID: 902206841\nPublished: Собрание законодательства Российской Федерации, N 11, 15.03.2010, ст.1221\ndateEnactedOriginal: 7/01/2010\ndateApproved: 5/04/2008",
				"language": "Russian",
				"publicLawNumber": "411",
				"url": "http://docs.cntd.ru/document/902206841",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://docs.cntd.ru/document/1200019270",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Проектирование систем противопожарной защиты резервуарных парков Госкомрезерва России",
				"creators": [
					{
						"fieldMode": 1,
						"firstName": "",
						"lastName": "Госкомрезерв России",
						"creatorType": "author"
					}
				],
				"dateEnacted": "11/13/1998",
				"code": "СП (Свод правил)",
				"codeNumber": "СП (Свод правил)",
				"extra": "CNTDID: 1200019270\nPublished: официальное издание ## М., 1998 год\ndateEnactedOriginal: 11/13/1998\ndateApproved: 11/13/1998",
				"language": "Russian",
				"publicLawNumber": "21-104-98",
				"url": "http://docs.cntd.ru/document/1200019270",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://docs.cntd.ru/document/871001022",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Пожарная безопасность зданий и сооружений (с Изменениями N 1, 2)",
				"creators": [
					{
						"fieldMode": 1,
						"firstName": "",
						"lastName": "Минстрой России",
						"creatorType": "author"
					}
				],
				"dateEnacted": "7/19/2002",
				"code": "СП (Свод правил)",
				"codeNumber": "СНиП",
				"extra": "CNTDID: 871001022\nPublished: официальное издание ## Госстрой России. - М.: ГУП ЦПП, 2002 год\ndateEnactedOriginal: 1/01/1998\ndateApproved: 2/13/1997",
				"language": "Russian",
				"publicLawNumber": "21-01-97 ## 112.13330.2011",
				"url": "http://docs.cntd.ru/document/871001022",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
