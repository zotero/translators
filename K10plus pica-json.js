{
	"translatorID": "041335e4-6984-4540-b683-494bc923057a",
	"label": "K10plus pica-json",
	"creator": "Marcel Klotz",
	"target": "json",
	"minVersion": "4.0.27",
	"maxVersion": "",
	"priority": 100,
	"configOptions": {
		"async": true
	},
	"inRepository": true,
	"translatorType": 1,
	"lastUpdated": "2021-03-19 20:19:37"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2021 Marcel Klotz

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

/* ??
possible additional fields:
013D-a:	Art des Inhalts (Text)

*/

/*
	***** Description of the translator *****
This translator can translate Pica-JSON data that conforms to the K10Plus Classification
System (for K10Plus find out more at: https://wiki.k10plus.de/display/K10PLUS/K10plus+Format-Dokumentation)
While there might be other use cases it's designed to retrieve entries from those
institions that parttake in the K10Plus (find out more here: https://wiki.k10plus.de/display/K10PLUS/Teilnahme+am+K10plus)
The translator fetches Pica-JSON data from the K10-unApi-Server and parses it.

The expected input contains a pica production number (ppn) and optionally
a catalog id if there is a specific catalog on the unApi server that you want to use.

The expected format is a JSON string of the form:
  {
	"ppn": <Array of ppn strings >,
	"catalogid": <catalog id>
  }

  Todos:
	- write clean definitions for the functions
	- check where to clean the initial '@'s

*/

/* eslint-disable dot-notation */
/* eslint-disable no-await-in-loop */

function detectImport() {
	try {
		var parsedData = parseInput();
		if (!parsedData) {
			return false;
		}
		else {
			return true;
		}
	}
	catch (e) {
		Zotero.debug(e);
		return false;
	}
}

// eslint-disable-next-line consistent-return
function doImport() {
	if (typeof Promise == 'undefined') {
		startImport(
			function () {},
			function (e) {
				throw e;
			}
		);
	}
	else {
		return new Promise(function (resolve, reject) {
			startImport(resolve, reject);
		});
	}
}

function startImport(resolve, reject) {
	try {
		var parsedData = parseInput();
		if (!parsedData) resolve();
		importNext(parsedData, resolve, reject);
	}
	catch (e) {
		reject(e);
	}
}

async function importNext(parsedData, resolve, reject) {
	var item;
	try {
		var ppnList = parsedData.ppn;
		for (var ppn of ppnList) {
			item = new Z.Item();
			let json = await fetchJson(ppn, parsedData.catalogid);
			if (json.error) {
				reject(json.error);
			}
			else {
				item = await jsonParse(json, item);
				item.complete();
			}
		}
	}
	catch (e) {
		reject(e);
	}
	resolve();
}

function parseInput() {
	var str, json = "";

	// Read in the whole file at once, since we can't easily parse a JSON stream. The
	// chunk size shouldn't need to be bigger than 100 characters
	while ((str = Z.read(100)) !== false) json += str;
	try {
		json = JSON.parse(json);
		var typeChecker = json.ppn
			&& json.ppn instanceof Array
			&& json.ppn.reduce((p, c) => {
				if (!p || typeof c !== "string") {
					return false;
				}
				else {
					return true;
				}
			}, true)
			&& (!json.catalogid || typeof json.catalogid === "string");

		if (typeChecker) {
			return {
				ppn: json.ppn,
				catalogid: json.catalogid && typeof json.catalogid === 'string'
					? json.catalogid
					: undefined
			};
		}
		else {
			return false;
		}
	}
	catch (e) {
		Zotero.debug(e);
		return false;
	}
}
			
/**
 * A class to make the PicaJson more accessible
 * @property subfields { Object } structed subfields.
 * @property isValidFormat {Boolean} Whether the format of the given data was valid.
 * @method getSubfield - returns requested subfield contents.
 * @constructor
 * @param { Object } rawField - elements of the JSON Array in PicaJson format fetched from the unApi
 */
class picaObjectField {
	constructor(rawField) {
		this.subfields = picaObjectFieldConstructor(rawField);
		this.invalidFormat = !!this.subfields.error; 
	}

	/**
	 * A method to get subfield Contents with a subfieldId.
	 * @param { String } subfieldId desired subFieldId string.
	 * @param { Boolean } all - wheter all fields shell be returned, defaults to one field.
	 * @returns { String | String[] | undefined } subfield-contents.
	 */
	getSubfield(subfieldId, all) {
		if (all) {
			return this.subfields[subfieldId] ? this.subfields[subfieldId] : undefined;
		}
		else {
			return this.subfields[subfieldId] ? this.subfields[subfieldId][0] : undefined;
		}
	}
}

/**
 * A class to make the PicaJson more accessible
 * @property json {jsonObject} The structured PicaJson.
 * @property isValidFormat {Boolean} Whether the format of the given data was valid.
 * @property getSubfield {function}
 * @constructor
 * @param { String } PicaJsonArray the data given back by the unApi Server
 */
class picaObject {
	constructor(rawPicaJsonArray) {
		this.fields = picaObjectConstructor(rawPicaJsonArray);
		this.invalidFormat = !!this.fields.fail;
	}

	/**
	 * A method to get Fields with a fieldId.
	 * @param { String } fieldId desired fieldId string.
	 * @param { Boolean } all - wheter all fields shell be returned, defaults to one field.
	 * @returns { picaObjectField | picaObjectField[] | undefined } picaObjectFields or false.
	 */
	getField(fieldId, all) {
		if (all) {
			return this.fields[fieldId] ? this.fields[fieldId] : undefined;
		}
		else {
			return this.fields[fieldId] ? this.fields[fieldId][0] : undefined;
		}
	}

	/**
	 * A method to get Fields with a fieldId.
	 * @param { String } fieldId desired fieldId string.
	 * @param { String } subfieldId desired subFieldId string.
	 * @param { Boolean } all - wheter all fields shell be returned, defaults to one field.
	 * @returns { String | String[] | undefined } subfield-contents.
	 */
	getSubfield(fieldId, subfieldId, all) {
		let tmpField = this.fields[fieldId];
		let returnSubfield = tmpField ? tmpField.getSubfield(subfieldId, all) : undefined;
		return returnSubfield
	}
}

function picaObjectConstructor(json) {
	var unflattenedJson = {};
	try {
		for (let field of json) {
			var fieldname = field[0] || 'fail';
			unflattenedJson[fieldname] = unflattenedJson[fieldname] ? unflattenedJson[fieldname] : [];
			if (fieldname === 'fail') {
				break;
			}
			let newField = new picaObjectField(field);
			if (newField.invalidFormat) {
				Zotero.debug(newField.subfields.error);
				unflattenedJson['fail'] = true;
				break;
			}
			unflattenedJson[fieldname] = unflattenedJson[fieldname].concat(newField);
		}
		if (unflattenedJson['fail']) {
			return { error: 'Invalid Pica-Json-Data' };
		}
		return unflattenedJson;
	} 
	catch (error) {
		Zotero.debug(error);
		return { error: 'Invalid Pica-Json-Data' };
	}
}

function picaObjectFieldConstructor(rawField) {
	let structuredField = {};
	for (let i = 2; i < rawField.length - 1; i += 2) {
		let subfieldId = rawField[i];
		let subfieldContent = rawField[i + 1];
		if (typeof subfieldContent !== 'string') return { error: `Invalid Pica Json field: ${subfieldId}` };
		structuredField[subfieldId] = structuredField[subfieldId] ? structuredField[subfieldId].concat(subfieldContent) : [subfieldContent];
	}
	return structuredField;
}

function unflattenPicaJson(json) {
	var unflattenedJson = {};
	for (let field of json) {
		var fieldname = field[0] || 'fail';
		unflattenedJson[fieldname] = unflattenedJson[fieldname] ? unflattenedJson[fieldname] : [];
		let subfields = {};
		for (let i = 2; i < field.length - 1; i += 2) {
			subfields[field[i]] = field[i + 1];
		}
		unflattenedJson[fieldname].push(subfields);
	}
	if (unflattenedJson['fail']) {
		return { error: 'Invalid Pica-Json-Data' };
	}
	return unflattenedJson;
}

// Generally the data doesn't need to be cleaned. '@'s that mark the first
// significant word are erased though.
function cleanString(string) {
	string = string.replace(/(?=[^@]{0,4})@/, "");
	return string;
}

function asyncDoGet(url) {
	return new Promise(function (resolve, reject) {
		Zotero.Utilities.doGet(url, (resStr, xhr) => {
			if (!resStr) {
				reject(new Error(`Error ${xhr.status}: ${xhr.statusText}`));
			}
			else {
				resolve(resStr);
			}
		});
	});
}


async function fetchJson(ppn, designatedCatalog) {
	let jsonUrl = `http://unapi.k10plus.de/?id=${
		designatedCatalog
			? designatedCatalog
			: 'opac-de-627'
	}:ppn:${ppn}&format=picajson`;
	try {
		var json = await asyncDoGet(jsonUrl);
		json = JSON.parse(json);
		json = unflattenPicaJson(json);
		json.ppn = ppn;
		json.designatedCatalog = designatedCatalog;
		return json;
	}
	catch (e) {
		Zotero.debug(e);
		return { error: e };
	}
}
/*
function contentTypeMapper(contentType) {
	switch (contentType) {
		case "tdi" || "tdm":
			return 'film';	
	}
}
*/

async function jsonParse(json, item) {
	// Start of Type determination
	// according to the fields:
	// - 002@ (bibliographical genre, status)
	// - 002C (content type)
	// - 002D (type of medium)
	// - 002E (data storage type/Datenträgertyp) Subfield a - text; Subfield b - code

	var contentType = json['002C'] && json['002C'][0] ? json['002C'][0]['b'] : undefined;
	var bibliographicalGenre = json['002@'] && json['002@'][0] ? json['002@'][0]['0'] : undefined; // second character of the string in the field defines the ContentMediumType
	// var dataStorageType = json['002E'] && json['002E'][0] ? json['002E'][0] : undefined;
	var superiorWorkField = json['039B'] && json['039B'][0] ? json['039B'][0] : undefined;
	var contentSpecification = json['013D'] && json['013D'][0] ? json['013D'][0]['a'] : undefined;
	var zoteroType;
	var superiorWorkJson;

/*	// film and video recording
	if (contentSpecification === "Film") {
		zoteroType = 'film'
	}
	else if 
*/
	if (bibliographicalGenre[0] === 'H') {
	// handwritten entities -- the (sub-)type isn't inferable easily so everything
	// handwritten will be a manuscript
		zoteroType = 'manuscript';
	}
	else {
		switch (contentType) {
			case "txt":
				if (bibliographicalGenre[1] === 's') {
					var superiorWorkPpn = superiorWorkField && superiorWorkField['9'] ? superiorWorkField['9'] : undefined;
					// the s signals dependent (parts of) superordinated works.
					if (superiorWorkField['R'] && superiorWorkField['R'][1] === 'b') {
						// the superior Work type is journal/paper
						zoteroType = 'journalArticle';
					}
					else {
						zoteroType = 'bookSection';
					}
					if (superiorWorkPpn) {
						superiorWorkJson = await fetchJson(superiorWorkPpn);
					}
				}
				else {
					zoteroType = 'book';
				}
				break;

			case "prm" || "snd" || "spw":
				zoteroType = "audioRecording";
				break;
			case "crf" || "crm" || "crd" || "crn" || "cri" || "crt":
				zoteroType = "map";
				break;
			case "ntm" || "tcm":
				zoteroType = "book";
				break;
			case "sti" || "tci":
				zoteroType = "artwork";
				break;
			default:
				zoteroType = 'book';
		}
	}
	item.itemType = zoteroType || 'book';

	/*  	***** end of type determination ****		*/

	var hasSuperiorWork = superiorWorkJson && !superiorWorkJson.error;

	item = await generalParser(json, item, hasSuperiorWork, superiorWorkJson);
	return item;
}

function generalParser(json, item, hasSuperiorWork, superiorWorkJson) {
	var zoteroType = item.itemType;
	if (hasSuperiorWork) {
		item = generalParser(superiorWorkJson, item);
	}
	switch (zoteroType) {
		case 'film':
			item = filmParse(json, item);
			break;
		case "artwork":
			item = artParse(json, item);
			break;
		default:
			break;
	}
	// title and short title
	let titleField = json["021A"] && json["021A"] ? json["021A"][0] : undefined;
	var title = ' ';
	if (titleField) {
		title = cleanString(titleField['a']);
		if (titleField['d']) {
			var shortTitle = title;
			title = `${title}: ${cleanString(titleField['d'])}`;
		}
	}
	if (zoteroType === "bookSection") {
		item.bookTitle = title;
	}
	else if (shortTitle) {
		item.shortTitle = shortTitle;
		item.title = title;
	}
	// date
	let dateField = json["011@"] && json["011@"][0] ? json["011@"][0] : undefined;
	if (dateField && dateField['a']) {
		item.date = dateField['r']
			? `${dateField['a']} [${dateField['r']}]`
			: dateField['a'];
	}

	// todo: suport multiple relations of a person to a work /check if that is supported generally/add multiple relations to extra field
	// principal & co-authors
	let principalAuthorsList = json["028A"] || [];
	let coAuthorsList = json["028B"] || [];

	principalAuthorsList.concat(coAuthorsList).forEach((authorField) => {
		let author = {
			firstName: authorField["D"] || authorField["d"],
			lastName: authorField["A"] || authorField["a"]
		};
		if (zoteroType === "bookSection") {
			// eslint-disable-next-line
			item.creators.push( Object.assign(author, { creatorType: "bookAuthor" }));
		}
		else {
			item.creators.push(Object.assign(author, { creatorType: "author" }));
		}
	});

	// other people involved (relation specified in one field)
	let creatorsList = json["028C"] || [];
	let otherInvolvedPeopleList = json["028G"] || [];
	let corporationAsAuthorList = json["029A"] || [];
	creatorsList.concat(otherInvolvedPeopleList, corporationAsAuthorList).forEach((e) => {
		let entity = {
			firstName: e['D'] || e['d'],
			lastName: e['A'] || e['a']
		};
		switch (e['4']) {
			case "trl":
				item.creators.push(Object.assign(entity, { creatorType: "translator" }));
				break;
			case "edt":
			case "isb":
				item.creators.push(Object.assign(entity, { creatorType: "editor" }));
				break;
			case "aut":
				item.creators.push(Object.assign(entity, { creatorType: "author" }));
				break;
			case "ctb":
				item.creators.push(Object.assign(entity, { creatorType: "contributor" }));
				break;
			default: {
				// All other contributors will be stored in the extra field with their
				// type of relation to the book specified
				let extraTmp = `${entity.firstName} ${entity.lastName} ${e['B'] ? `(${e['B']})` : ''}`;
				item.extra = item ? item.extra + "\n" + extraTmp : extraTmp;
				break;
			}
		}
	});

	// pages
	let pagesField = json["034D"] && json["034D"][0] ? json["034D"][0] : undefined;
	item.numPages = pagesField && pagesField["a"] ? pagesField["a"] : "";

	if (hasSuperiorWork) {
		return item;
	}

	// publisher and place
	let authorPlaceField = json["033A"] && json["033A"][0] ? json["033A"][0] : undefined;
	item.place = authorPlaceField && authorPlaceField["p"] ? authorPlaceField["p"] : "";
	item.publisher = authorPlaceField && authorPlaceField["n"] ? authorPlaceField["n"] : "";

	// edition
	let editionField = json["032@"] && json["032@"][0] ? json["032@"][0] : undefined;
	item.edition = editionField && editionField["a"] ? editionField["a"] : "";

	// connection to a conference
	let conferenceField = json["030F"] && json["030F"][0] ? json["030F"][0] : undefined;
	if (conferenceField) {
		item.extra = item.extra ? item.extra + "\n" : "";
		item.extra += conferenceField["a"] ? conferenceField["a"] : "";
		item.extra += conferenceField["k"] ? `, ${conferenceField["k"]}` : "";
		item.extra += conferenceField["p"] ? `, ${conferenceField["p"]}` : "";
	}

	// volume & issue
	let volumeIssueField = json["036C"] && json["036C"][0] ? json["036C"][0] : undefined;
	if (volumeIssueField) {
		item.volume = volumeIssueField["l"] ? volumeIssueField["l"] : "";
		let multipleVolumeTitle = `${cleanString(volumeIssueField["a"])} - ${volumeIssueField["l"] ? volumeIssueField["l"] : ''}`;
		// field for the title of the multiple volume book -- as in that cases
		// the title in 21A is only the issue title, the booktitle and shorttitle
		// will be adapted
		if (!item.title) {
			item.title = multipleVolumeTitle;
		}
		else {
			item.shortTitle = item.title;
			item.title = `${multipleVolumeTitle}: ${item.title}`;
		}
	}

	// content type
	let contentTypeField = json["013D"] ? json["013D"][0] : undefined;
	if (contentTypeField) {
		item.extra = item.extra
			? `\n ${contentTypeField["a"]}`
			: contentTypeField["a"];
	}

	// series data
	/* there might be multiple series related to a work insight the data set captured as well in multiple 36E and 36F fields,
	*	as corresponding Zotero fields couldn't capture that, only the first 036E field is used.*/
	let relatedSeriesField = json["036E"] && json["036E"][0] ? json["036E"][0] : undefined;
	if (relatedSeriesField) {
		let subSeries = relatedSeriesField['p']
			? `${relatedSeriesField['p']}${relatedSeriesField['m'] ? ` ${relatedSeriesField['m']}` : ''}`
			: undefined;
		item.series = relatedSeriesField['a'] ? relatedSeriesField['a'] : '';
		if (subSeries) {
			item.seriesNumber = subSeries;
		}
		else {
			item.seriesNumber = relatedSeriesField['l'] ? relatedSeriesField['l'] : '';
		}
	}

	// Thesis data (specyfing if the work in question is a thesis)
	let thesisField = json["037C"] && json["037C"][0] ? json["037C"][0] : undefined;
	if (thesisField) {
		item.extra = item.extra ? `${item.extra}\n` : '';
		item.extra += thesisField['d'] ? `${thesisField['d']} (${thesisField['e']}, ${thesisField["f"]})` : "";
		item.extra += thesisField['b'] ? `${thesisField['b']}, ${thesisField['a']}` : '';
	}

	// Content description
	let contentDescriptionField = json["047I"] && json["047I"][0] ? json["047I"][0] : undefined;
	if (contentDescriptionField) {
		item.extra = item.extra ? `${item.extra}\n` : '';
		item.extra += contentDescriptionField['a'];
	}

	// annotations
	let annotationsField = json['037A'] && json["037A"][0] ? json["037A"][0] : undefined;
	if (annotationsField) {
		item.extra = item.extra ? `${item.extra}\n` : '';
		item.extra += annotationsField['a'];
	}

	// call number - library catalog
	let callNumberField = json["209A"] && json["209A"][0] ? json["209A"][0] : undefined;
	if (callNumberField) {
		item.callNumber = callNumberField['a'];
	}

	// isbn
	let isbnField = json["004A"] && json["004A"][0] ? json["004A"][0] : undefined;
	if (isbnField) {
		item.ISBN = ZU.cleanISBN(isbnField['0']);
	}

	// classification data
	let classData = {};
	let lccDataFields = json["045A"] ? json["045A"] : undefined;
	if (lccDataFields) {
		classData['LCC'] = [];
		lccDataFields.forEach((field) => {
			classData['LCC'] = classData['LCC'].concat(field['a']);
		});
	}

	let ddcDataFields = json["045F"] ? json["045F"] : []; // ?? feld toaucht ohne not auf
	ddcDataFields = json["045H"] ? ddcDataFields.concat(json["045H"]) : ddcDataFields;
	if (ddcDataFields !== []) {
		classData['DDC'] = [];
		ddcDataFields.forEach((field) => {
			classData['DDC'] = classData['DDC'].concat(field['a']);
		});
	}

	let bkDataFields = json["045Q"] ? json["045Q"] : undefined;
	if (bkDataFields) {
		classData['BK'] = [];
		bkDataFields.forEach((field) => {
			classData['BK'] = classData['BK'].concat(field['a']);
		});
	}
	let rvkDataFields = json["045R"] ? json["045R"] : undefined;
	if (rvkDataFields) {
		classData['RVK'] = [];
		rvkDataFields.forEach((field) => {
			classData['RVK'] = classData['RVK'].concat(field['a']);
		});
	}

	// other Classification-Systems stored with specific keys
	let otherClassDataFields = json["045X"] ? json["045X"] : undefined;
	if (otherClassDataFields) {
		otherClassDataFields.forEach((field) => {
			let currentKey = field['i'], currentClassData = field['a'];
			if (!classData[currentKey]) {
				classData[currentKey] = [];
			}
			classData[currentKey] = classData[currentKey].concat(currentClassData);
		});
	}

	let classificationNote = Object.entries(classData).reduce((previousString, currentPair) => {
		let newString = previousString ? previousString + '\n' : '';
		newString += `${currentPair[0]}: ${currentPair[1].reduce((p, c) => {
			p = p ? `${p}, ${c}` : c;
			return p;
		}, '')}`;
		return newString;
	}, '');

	item.notes.push({
		title: "Classification Data",
		note: classificationNote
	});
	return item;
}

function artParse(json, item) {
	// description of the specimen
	let artWorkSizeField = json["034I"] && json["034I"][0] ? json["034I"][0] : undefined;
	if (artWorkSizeField) {
		item.artworkSize = artWorkSizeField['a'];
	}
	let artWorkMediumField = json["002E"] && json["002E"][0] ? json["002E"][0] : undefined;
	if (artWorkMediumField) {
		item.medium = artWorkMediumField['a'];
	}
	let artSpecimenNoteField = json["237A"] && json["237A"][0] ? json["237A"][0] : undefined;
	if (artSpecimenNoteField) {
		item.extra = item.extra ? '\n' : '';
		item.extra += artSpecimenNoteField['a'];
	}
	return item;
}

function filmParse(json, item) {
	let videoRecordingFormatField = json["002E"] && json["002E"][0] ? json["002E"][0] : undefined;
	if (videoRecordingFormatField) {
		item.videoRecordingFormat = videoRecordingFormatField['a'];
	}
	return item;
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "import",
		"input": "{\"ppn\":[\"88511759X\"], \"catalogid\": \"stabikat\"}",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"firstName": "Niklas",
						"lastName": "Luhmann",
						"creatorType": "author"
					},
					{
						"firstName": "Johannes F. K.",
						"lastName": "Schmidt",
						"creatorType": "editor"
					},
					{
						"firstName": "André",
						"lastName": "Kieserling",
						"creatorType": "editor"
					},
					{
						"firstName": "Christoph",
						"lastName": "Gesigora",
						"creatorType": "contributor"
					}
				],
				"date": "2017",
				"ISBN": "3518587056",
				"callNumber": "10 A 17261",
				"edition": "Erste Auflage",
				"extra": "Thema: Theorie der Gesellschaft; Laufzeit: 30 Jahre; Kosten: keine« – so lautet die berühmte Antwort, die Niklas Luhmann Ende der 1960er Jahre auf die Frage nach seinem Forschungsprojekt gab. Der Zeitplan wurde eingehalten: 1997 erschien Die Gesellschaft der Gesellschaft, Luhmanns Opus magnum und Kernstück dieses Vorhabens. So bedeutend dieses Werk, so bemerkenswert seine Vorgeschichte. Denn wie der wissenschaftliche Nachlass des Soziologen zeigt, hat Luhmann im Laufe der Jahrzehnte mehrere weitgehend druckreife und inhaltlich eigenständige Fassungen seiner Gesellschaftstheorie geschrieben. 1975 brachte er die erste dieser Fassungen auf nahezu tausend Typoskriptseiten zum Abschluss. Sie ist ohne Frage die soziologisch reichhaltigste Version einer umfassenden Theorie der Gesellschaft, die aus Luhmanns einzigartigem Forschungsprojekt hervorgegangen ist, und wird nun unter dem Titel Systemtheorie der Gesellschaft erstmals publiziert\nHier auch später erschienene, unveränderte Nachdrucke",
				"numPages": "1131 Seiten",
				"place": "Berlin",
				"publisher": "Suhrkamp",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
