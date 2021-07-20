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
	"lastUpdated": "2021-07-20 17:25:32"
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
*/

/* eslint-disable dot-notation */
/* eslint-disable no-await-in-loop */

/**
 * A class to make the PicaJson more accessible
 * @property fields {PicaObjectField[]} The structured PicaJson.
 * @property invalidFormat {Boolean} Whether the format of the given data was valid.
 * @property getSubfield {function}
 * @constructor
 * @param { String } PicaJsonArray the data given back by the unApi Server
 */
class PicaObject {
	constructor(rawPicaJsonArray) {
		this.fields = picaObjectConstructor(rawPicaJsonArray);
		this.invalidFormat = !!this.fields.fail;
	}

	/**
	 * A method to get Fields with a fieldId.
	 * @param { string } fieldId desired fieldId string.
	 * @param { boolean } all - wheter all fields shell be returned, defaults to one field.
	 * @returns { (PicaObjectField | PicaObjectField[] | undefined) } (array of) requested field
	 */
	getField(fieldId, all) {
		if (all) {
			return this.fields[fieldId] ? this.fields[fieldId] : [];
		}
		else {
			return this.fields[fieldId] ? this.fields[fieldId][0] : undefined;
		}
	}

	/**
	 * A method to get Fields with a fieldId.
	 * @param { string } fieldId desired fieldId string.
	 * @param { string } subfieldId desired subFieldId string.
	 * @param { boolean } all - wheter all fields shell be returned, defaults to one field.
	 * @returns { (string | string[] | undefined) } subfield-contents.
	 */
	getSubfield(fieldId, subfieldId, all) {
		let tmpField = this.fields[fieldId];
		let returnSubfield = tmpField && tmpField[0]
			? tmpField[0].getSubfield(subfieldId, all)
			: all
				? []
				: '';
		return returnSubfield;
	}
}

function picaObjectConstructor(json) {
	var unflattenedJson = {};
	try {
		for (let field of json) {
			var fieldname = field[0] || 'fail';
			unflattenedJson[fieldname] = unflattenedJson[fieldname] ? unflattenedJson[fieldname] : [];
			if (fieldname === 'fail') break;
			let newField = new PicaObjectField(field);
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
		return { error };
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
class PicaObjectField {
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
			return this.subfields[subfieldId] ? this.subfields[subfieldId] : [];
		}
		else {
			return this.subfields[subfieldId] ? this.subfields[subfieldId][0] : '';
		}
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

function parseInput() {
	var str, json = "";

	// Read in the whole file at once, since we can't easily parse a JSON stream. The
	// chunk size shouldn't need to be bigger than 100 characters
	while ((str = Z.read(100)) !== false) json += str;
	try {
		json = json ? JSON.parse(json) : "";
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

async function importNext(parsedData, resolve, reject) {
	var item;
	try {
		var ppnList = parsedData.ppn;
		for (var ppn of ppnList) {
			item = new Z.Item();
			item.extra = "";
			let picaObj = await getPicaObject(ppn, parsedData.catalogid);
			if (picaObj.invalidFormat) {
				reject(picaObj.fields.error);
			}
			else {
				item = await picaObjectParse(picaObj, item);
				item.complete();
			}
		}
	}
	catch (e) {
		reject(e);
	}
	resolve();
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

async function getPicaObject(ppn, designatedCatalog) {
	let jsonUrl = `http://unapi.k10plus.de/?id=${
		designatedCatalog
			? designatedCatalog
			: 'opac-de-627'
	}:ppn:${ppn}&format=picajson`;
	try {
		let rawJson = await asyncDoGet(jsonUrl);
		let json = JSON.parse(rawJson);
		var picaObj = new PicaObject(json);
		return picaObj;
	}
	catch (e) {
		Zotero.debug(e);
		return { fields: { error: e }, invalidFormat: true };
	}
}

// Generally the data doesn't need to be cleaned. '@'s that mark the first
// significant word are erased though.
function cleanString(string) {
	string = string.replace(/(?=[^@]{0,4})@/, "");
	return string;
}

function itemExtraCleaner(string) {
	string = string.replace("\n\n", "\n");
	string = string.replace(/^\n/, '');
	return string;
}

/**
 * Translates PicaObject Fields to ZoteroItem
 * @param { PicaObject } picaObj
 * @param { ZoteroItem } item
 */
async function picaObjectParse(picaObj, item) {
	var contentType = picaObj.getSubfield('002C', 'b');
	var bibliographicalGenre = picaObj.getSubfield('002@', '0');
	var contentSpecification = picaObj.getSubfield('013D', 'a');
	var zoteroType;

	if (bibliographicalGenre[0] === 'H') {
		// handwritten entities -- the (sub-)type isn't inferable easily so everything
		// handwritten will be a manuscript
		zoteroType = 'manuscript';
	}
	else if (bibliographicalGenre[0] === 'B' && contentSpecification === "Film") {
		zoteroType = "film";
	}
	else {
		switch (contentType) {
			case "txt":
				if (bibliographicalGenre[1] === 's') {
					var superiorWorkPpn = picaObj.getSubfield('039B', '9');
					var superiorWorkBiblGenre = picaObj.getSubfield('039B', 'R');
					// the s signals dependent (parts of) superordinated works.
					if (superiorWorkBiblGenre && superiorWorkBiblGenre[1] === 'b') {
						// the superior Work type is journal/paper
						zoteroType = 'journalArticle';
					}
					else {
						zoteroType = 'bookSection';
					}
					if (superiorWorkPpn) {
						var superiorWorkPicaObj = await getPicaObject(superiorWorkPpn);
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
	item.itemType = zoteroType;
	var hasSuperiorWork = superiorWorkPicaObj && !superiorWorkPicaObj.invalidFormat;
	item = await generalParser(picaObj, item, hasSuperiorWork, superiorWorkPicaObj);
	return item;
}

/**
 * Main translation from PicaObject to ZoteroItem
 * @param {PicaObject} picaObj
 * @param {ZoteroItem} item
 * @param {boolean} hasSuperiorWork
 * @param {PicaObject} superiorWorkPicaObj
 * @param {boolean} isSuperiorWork
 * @returns {ZoteroItem} parsed ZoteroItem
 */
function generalParser(picaObj, item, hasSuperiorWork, superiorWorkPicaObj, isSuperiorWork) {
	var zoteroType = item.itemType;
	if (isSuperiorWork) {
		item.extra += "\nZum übergeordneten Werk:";
	}
	if (hasSuperiorWork) {
		item = generalParser(superiorWorkPicaObj, item, null, null, true);
		var superiorWorkExtraTmp = item.extra;
		item.extra = '';
	}
	switch (zoteroType) {
		case 'film':
			item.videoRecordingFormat = picaObj.getSubfield("002E", "a");
			break;
		case "artwork":
			item.artworkSize = picaObj.getSubfield("034I", "a");
			item.medium = picaObj.getSubfield("002E", "a");
			item.extra += "\n" + picaObj.getSubfield("237A", "a");
			break;
		default:
			break;
	}

	// title and short title
	var title = picaObj.getSubfield('021A', 'a');
	if (title) {
		title = cleanString(title);
		let titleAddition = picaObj.getSubfield('021A', 'd');
		if (titleAddition) {
			var shortTitle = title;
			title = `${title}: ${cleanString(titleAddition)}`;
		}
	}
	if (zoteroType === "bookSection" && isSuperiorWork) {
		item.bookTitle = title;
	}
	else {
		if (shortTitle) {
			item.shortTitle = shortTitle;
		}
		item.title = title || shortTitle;
	}

	// date
	var date = picaObj.getSubfield('011@', 'a');
	var originalDate = picaObj.getSubfield('011@', 'r');
	if (date) {
		item.date = originalDate
			? `${date} [${originalDate}]`
			: date;
	}

	// todo: suport multiple relations of a person to a work /check if that is supported generally/add multiple relations to extra field
	// principal & co-authors
	let peopleMap = new Map;
	let principalAuthorsList = picaObj.getField('028A', true);
	let coAuthorsList = picaObj.getField("028B", true);

	principalAuthorsList.concat(coAuthorsList).forEach((authorField) => {
		let author = {
			firstName: authorField.getSubfield("D") || authorField.getSubfield("d"),
			lastName: authorField.getSubfield("A") || authorField.getSubfield("a")
		};
		peopleMap.set(author, authorField.getSubfield("B", true));
		item.creators.push(Object.assign(author, { creatorType: "author" }));
	});

	// other people involved (relation specified in one field)
	let creatorsList = picaObj.getField("028C", true);
	let otherInvolvedPeopleList = picaObj.getField("028G", true);
	let corporationAsAuthorList = picaObj.getField("029A", true);
	creatorsList.concat(otherInvolvedPeopleList, corporationAsAuthorList).forEach((e) => {
		let entity = {
			firstName: e.getSubfield('D') || e.getSubfield('d'),
			lastName: e.getSubfield('A') || e.getSubfield('a')
		};
		peopleMap.set(entity, e.getSubfield("B", true));
		switch (e.getSubfield('4')) {
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
				break;
			}
		}
	});

	let contributursStr = "";
	for (var [key, value] of peopleMap) {
		contributursStr = contributursStr ? contributursStr + ", " : "";
		let tmpStr = `${key.firstName} ${key.lastName}${value.length > 0
			? `(${value[0]}${value.length > 1
				? value.slice(1, value.length).map((str) => {
					return `, ${str}`;
				})
				: ""
			})`
			: ''}`;
		contributursStr += tmpStr;
	}
	item.extra += contributursStr ? `\nBeteiligte Personen: ${contributursStr}` : item.extra;

	// pages
	item.numPages = picaObj.getSubfield("034D", "a");

	if (hasSuperiorWork) {
		item.title = item.title ? item.title : ' ';
		item.extra += "\n" + superiorWorkExtraTmp;
		return item;
	}

	// publisher and place
	item.place = picaObj.getSubfield("033A", "p");
	item.publisher = picaObj.getSubfield("033A", 'n');

	// edition
	item.edition = picaObj.getSubfield("032@", "a");

	// connection to a conference
	var conferenceTitle = picaObj.getSubfield("030F", "a");
	var conferencePlace = picaObj.getSubfield("030F", "k");
	var conferenceDate = picaObj.getSubfield("030F", "p");
	if (conferenceTitle) {
		item.extra += "\n" + conferenceTitle;
		item.extra += conferencePlace ? `, ${conferencePlace}` : '';
		item.extra += conferenceDate ? `, ${conferenceDate}` : '';
	}

	// volume & issue
	item.volume = picaObj.getSubfield("036C", "l");
	var multipleVolumeTitle = cleanString(picaObj.getSubfield("036C", "a"));
	if (multipleVolumeTitle) {
		multipleVolumeTitle = `${multipleVolumeTitle}${item.volume ? ` - ${item.volume}` : ""}`;
		if (!item.title) {
			item.title = multipleVolumeTitle;
		}
		else {
			item.shortTitle = item.title;
			item.title = `${multipleVolumeTitle}: ${item.title}`;
		}
	}

	// content type
	let contentType = picaObj.getSubfield("013D", "a");
	item.extra = contentType ? item.extra + `\n${contentType}` : item.extra;
	
	// series data
	/* there might be multiple series related to a work insight the data set captured as well in multiple 36E and 36F fields,
	*	as corresponding Zotero fields couldn't capture that, only the first 036E field is used.*/
	item.series = picaObj.getSubfield("036E", "a");
	if (item.series) {
		var subSeries = picaObj.getSubfield("036E", "p");
		var subSeriesAddition = picaObj.getSubfield("036E", "m");
		subSeries = subSeries ? `${subSeries}${subSeriesAddition ? ` ${subSeriesAddition}` : ''}` : '';
		if (subSeries) {
			item.seriesNumber = subSeries;
		}
		else {
			item.seriesNumber = picaObj.getSubfield("036E", "l");
		}
	}

	// Thesis data (specyfing if the work in question is a thesis)
	let thesisType = picaObj.getSubfield("037C", "d");
	let thesisInstitution = picaObj.getSubfield("037C", "e");
	let thesisDate = picaObj.getSubfield("037C", "f");
	let thesisAltInfo = picaObj.getSubfield("037C", "a");
	if (thesisType) {
		item.extra += `\n${thesisType} (${thesisInstitution}, ${thesisDate})`;
	}
	else if (thesisAltInfo) {
		item.extra += "\n" + thesisAltInfo;
	}

	item.extra += "\n" + picaObj.getSubfield("047I", "a"); // Content description
	item.extra += "\n" + picaObj.getSubfield("037A", "a"); // annotations
	item.callNumber = picaObj.getSubfield("2009A", "a");
	item.ISBN = ZU.cleanISBN(picaObj.getSubfield("004A", "0"));

	// classification data

	let classData = {};
	let lccDataFields = picaObj.getField("045A", true);
	if (lccDataFields.length > 0) {
		classData['LCC'] = [];
		lccDataFields.forEach((field) => {
			classData['LCC'] = classData['LCC'].concat(field.getSubfield("a"));
		});
	}

	let ddcDataFields = picaObj.getField("045F", true);
	ddcDataFields = ddcDataFields.concat(picaObj.getField("045H", true));
	if (ddcDataFields.length > 0) {
		classData['DDC'] = [];
		ddcDataFields.forEach((field) => {
			classData['DDC'] = classData['DDC'].concat(field.getSubfield('a'));
		});
	}
	let bkDataFields = picaObj.getField("045Q", true);
	if (bkDataFields.length > 0) {
		classData['BK'] = [];
		bkDataFields.forEach((field) => {
			classData['BK'] = classData['BK'].concat(field.getSubfield("a"));
		});
	}
	let rvkDataFields = picaObj.getField("045R", true);
	if (rvkDataFields.length > 0) {
		classData['RVK'] = [];
		rvkDataFields.forEach((field) => {
			classData['RVK'] = classData['RVK'].concat(field.getSubfield("a"));
		});
	}

	// other Classification-Systems stored with specific keys
	let otherClassDataFields = picaObj.getField("045X", true);
	if (otherClassDataFields.length > 0) {
		otherClassDataFields.forEach((field) => {
			let currentKey = field.getSubfield('i'), currentClassData = field.getSubfield('a');
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
	if (classificationNote) {
		item.notes.push({
			title: "Classification Data",
			note: classificationNote
		});
	}
	item.extra = itemExtraCleaner(item.extra);
	item.title = item.title ? item.title : ' ';
	
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
				"title": "Systemtheorie der Gesellschaft",
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
				"edition": "Erste Auflage",
				"extra": "Beteiligte Personen: Niklas Luhmann(VerfasserIn), Johannes F. K. Schmidt(HerausgeberIn), André Kieserling(HerausgeberIn), Christoph Gesigora(MitwirkendeR)\nThema: Theorie der Gesellschaft; Laufzeit: 30 Jahre; Kosten: keine« – so lautet die berühmte Antwort, die Niklas Luhmann Ende der 1960er Jahre auf die Frage nach seinem Forschungsprojekt gab. Der Zeitplan wurde eingehalten: 1997 erschien Die Gesellschaft der Gesellschaft, Luhmanns Opus magnum und Kernstück dieses Vorhabens. So bedeutend dieses Werk, so bemerkenswert seine Vorgeschichte. Denn wie der wissenschaftliche Nachlass des Soziologen zeigt, hat Luhmann im Laufe der Jahrzehnte mehrere weitgehend druckreife und inhaltlich eigenständige Fassungen seiner Gesellschaftstheorie geschrieben. 1975 brachte er die erste dieser Fassungen auf nahezu tausend Typoskriptseiten zum Abschluss. Sie ist ohne Frage die soziologisch reichhaltigste Version einer umfassenden Theorie der Gesellschaft, die aus Luhmanns einzigartigem Forschungsprojekt hervorgegangen ist, und wird nun unter dem Titel Systemtheorie der Gesellschaft erstmals publiziert\nHier auch später erschienene, unveränderte Nachdrucke",
				"numPages": "1131 Seiten",
				"place": "Berlin",
				"publisher": "Suhrkamp",
				"attachments": [],
				"tags": [],
				"notes": [
					{
						"title": "Classification Data",
						"note": "LCC: HM590\nDDC: 301.01, 300, 301.01\nBK: 71.02\nRVK: MR 5400, CI 3824, MQ 3471, MQ 3470"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "import",
		"input": "{\"ppn\":[\"1701681854\", \"364349824\"]}",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Theodor W. Adorno, Max Horkheimer, Jürgen Habermas und Alfred Schmidt: Kritische Theorie und Nietzsches bürgerliches Denken",
				"creators": [
					{
						"firstName": "Eike",
						"lastName": "Brock",
						"creatorType": "editor"
					},
					{
						"firstName": "Jutta",
						"lastName": "Georg-Lauer",
						"creatorType": "editor"
					},
					{
						"firstName": "Jutta",
						"lastName": "Georg-Lauer",
						"creatorType": "author"
					}
				],
				"date": "2019",
				"ISBN": "9783476047243",
				"bookTitle": "\"- ein Leser, wie ich ihn verdiene\": Nietzsche-Lektüren in der deutschen Philosophie und Soziologie",
				"extra": "Beteiligte Personen: Jutta Georg-Lauer(VerfasserIn)\nZum übergeordneten Werk:\nBeteiligte Personen: Eike Brock(HerausgeberIn), Jutta Georg-Lauer(HerausgeberIn)\nAufsatzsammlung\nLiteraturangaben",
				"place": "Berlin",
				"publisher": "J.B. Metzler",
				"attachments": [],
				"tags": [],
				"notes": [
					{
						"title": "Classification Data",
						"note": "DDC: 193, \nBK: 08.24\nRVK: CG 5917"
					}
				],
				"seeAlso": []
			},
			{
				"itemType": "book",
				"title": "Aggression in der Lebenswelt: die Erweiterung des Parsonschen Konzepts der Aggression durch die Beschreibung des Zusammenhags von Jargon, Aggression und Kultur",
				"creators": [
					{
						"firstName": "Alexander C.",
						"lastName": "Karp",
						"creatorType": "author"
					}
				],
				"date": "2002",
				"edition": "[Elektronische Resource]",
				"extra": "Beteiligte Personen: Alexander C. Karp\nHochschulschrift\nFrankfurt a. M., Univ., Diss., 2002\nTitel auf der Beil",
				"numPages": "1 CD-ROM",
				"shortTitle": "Aggression in der Lebenswelt",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
