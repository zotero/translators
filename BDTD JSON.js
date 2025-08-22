{
	"translatorID": "9a0deb91-85ad-414d-a094-ec5296fa996c",
	"label": "BDTD JSON",
	"creator": "Felipe Alexande Ferreira",
	"target": "^http(s)?://bdtd.ibict.br",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-07-28 04:03:59"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2022 Felipe Alexandre Ferreira
	
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
 * Import json files that were exported from "Biblioteca Digital Brasileira de Teses e Dissertações" (https://bdtd.ibict.br).
 * Do a search and then import as JSON.
 */

function readWholeInput() {
	var str, json = "";
	
	//Other JSON translators are reading whole file too.
	//TODO parse json as stream (there are some npm modules implementing this.)
	while ((str = Z.read(1048576*10)) !== false) json += str;
	
	return json;
}

function validBDTDItem(item) {
	if(!item.id) return false;
	if(!item.title) return false;
	if(!item.authors) return false;
	if(typeof(item.id) !== 'string') return false;
	if(typeof(item.title) !== 'string') return false;
	if(typeof(item.authors) !== 'object') return false;
	if(Array.isArray(item.authors)) return false;
	return true;
}

function validBDTD(data) {
	let obj;
	try {
		obj = JSON.parse(data);
	} catch (e) {
		return false;
	}
	if(typeof(obj) !== 'object') return false;
	if(!obj.resultCount) return false;
	if(!obj.status) return false
	if(!obj.records) return false;
	if(!Array.isArray(obj.records)) return false;
	if(!obj.records.length > 0) return false;
	if(!validBDTDItem(obj.records[0])) return false;
	return true;
}

function detectImport() {
	var input = readWholeInput();
	return validBDTD(input);
}

function importWeb(json) {
	let parsedData = JSON.parse(json);
	let itemsTitlesMap = {};//map id to title
	let itemsMap = {};//map id to item object
	parsedData.records.forEach(item => {
		itemsTitlesMap[item.id] = item.title;
		itemsMap[item.id] = item
	});
	Zotero.selectItems(itemsTitlesMap, selectedItems => Object.keys(selectedItems).forEach(id => importItem(itemsMap[id])));
}

function doImport() {
	Z.debug("DO IMPORT")
	let parsedData = JSON.parse(readWholeInput);
	if (typeof Promise == 'undefined') {
		parsedData.records.forEach(r => importItem(r));
	} else {
		return Promise.all(parsedData.records.map(r => importItem(r)));
	}}

const mapThesisType = {
	"masterThesis": "Master's Thesis",
	"doctoralThesis": "Doctoral Thesis"
}

function setThesisType(item,r) {
	if(Array.isArray(r.types) && r.types[0] && mapThesisType[r.types[0]]) {
		item.thesisType = mapThesisType[r.types[0]];
	} else if(Array.isArray(r.formats) && r.formats[0] && mapThesisType[r.formats[0]]) {
		item.thesisType = mapThesisType[r.formats[0]];
	}
}



const mapLanguage = {
	"eng": "English",
	"por": "Portuguese"
}

function importSubjectsValue(subjectsValue,item) {
	if(!Array.isArray(subjectsValue)) return;
	subjectsValue.forEach(x => {
		if(Array.isArray(x)) {
			x.forEach(tag => item.tags.push(tag));
		} else {
			if(typeof(x) == 'string') {
				item.tags.push(x);
			}
		}
	});
}

function importAllSubjects(r,item) {
	Object.keys(r).filter(key => key.startsWith("subjects") &&  Array.isArray(r[key])).forEach(key => importSubjectsValue(r[key], item));
}

function importItem(r) {
	let item = new Z.Item("thesis");//default to thesis
	item.title = r.title;
	
	setThesisType(item,r);
	
	if(Array.isArray(r.languages) && r.languages[0]) {
		let langCode = r.languages[0].toLowerCase();
		item.language = mapLanguage[langCode];
		item.abstractNote = r["abstract_"+langCode] || r.abstract_eng || r.abstract_por;
	}

	if(r.authors && r.authors.primary) {
		Object.keys(r.authors.primary).forEach(authorName => item.creators.push(Zotero.Utilities.cleanAuthor(authorName, "author", authorName.includes(","))));
	}

	if(r.authors && r.contributors && r.contributors.advisor) {
		Object.keys(r.contributors.advisor).forEach(authorName => item.creators.push(Zotero.Utilities.cleanAuthor(authorName, "advisor", authorName.includes(","))));
	}

	if(r.authors && r.contributors && r.contributors.referee) {
		Object.keys(r.contributors.referee).forEach(authorName => item.creators.push(Zotero.Utilities.cleanAuthor(authorName, "referee", authorName.includes(","))));
	}

	importAllSubjects(r,item);

	if(Array.isArray(r.urls)) {
		item.url = r.urls[0];
	}

	if(Array.isArray(r.publicationDates)) {
		item.date = r.publicationDates[0]
	}

	if(Array.isArray(r.institutions)) {
		item.institution = r.institutions[0]
	}
	Z.debug('item imported')
	return item.complete();
}

function detectWeb(doc, url) {

	let urlWithoutProtocol = url.substr(url.indexOf('://')+3);//it can be http:// or https://
	if (urlWithoutProtocol.startsWith("bdtd.ibict.br/vufind/Search/Results?")) {
		return 'multiple';
	} else if (urlWithoutProtocol.startsWith("bdtd.ibict.br/vufind/Record/")) {
		return "thesis";
	}
}

function doWeb(doc, url) {
	switch (detectWeb(doc, url)) {
	case "multiple": 
		let urlJson = Array.from(doc.getElementById("Export").getElementsByTagName("a")).filter(tag => tag.text = "Export JSON")[0].href.replace('limit=1000','limit=20');
		ZU.doGet(urlJson, importWeb);
		break;
	case "thesis":
		let referBibixUrl = url + "/Export?style=EndNote";
		const translator = Zotero.loadTranslator('import');
		ZU.doGet(referBibixUrl, data => {
			const translator = Zotero.loadTranslator('import');
			translator.setTranslator("881f60f2-0802-411a-9228-ce5f47b64c7d");//ReferBibix
			translator.setString(data);
			translator.translate();
		});
		break;
	}
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://bdtd.ibict.br/vufind/Search/Results?lookfor=quantum+cryptography&type=AllFields",
		"items": "multiple"
	}
]
/** END TEST CASES **/
