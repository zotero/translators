{
	"translatorID": "e782b521-99ed-47c7-b021-62351a0a4f91",
	"label": "CFF",
	"creator": "Sebastian Karcher",
	"target": "cff",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 2,
	"lastUpdated": "2023-04-29 02:20:52"
}

/*
    ***** BEGIN LICENSE BLOCK *****

    Copyright © 2023 Sebastian Karcher

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

function writeKeywords(tags) {
	if (!tags.length) return false;
	let keywords = "\n";
	for (let tag of tags) {
		keywords += "  - " + tag.tag + "\n";
	}
	return keywords.replace(/\\n$/, "");
}

function writeDOI(itemDOI) {
	if (!itemDOI) return false;
	let doi = "\n  - type: doi\n    value: " + itemDOI + "\n";
	return doi;
}

function writeAuthors(itemCreators) {
	let itemAuthors = [];
	for (let creator of itemCreators) {
		if (creator.creatorType == "author") {
			itemAuthors.push(creator);
		}
	}
	if (!itemAuthors.length) return false;
	let authors = "\n";
	for (let author of itemAuthors) {
		authors += "  - family-names: " + author.lastName + "\n";
		if (author.firstName) {
			authors += "    given-names: " + author.firstName + "\n";
		}
	}
	return authors;
}

function doExport() {
	var item;
	// eslint-disable-next-line no-cond-assign
	while (item = Zotero.nextItem()) {
		// can't store independent notes in RIS
		if (item.itemType != "dataset" && item.itemType != "computerProgram") {
			continue;
		}
		var cff = {};
		cff.title = " >-\n  " + item.title;
		cff.abstract = item.abstractNote;
		cff.type = item.itemType == 'dataset' ? 'dataset' : 'software';
		cff.license = item.rights;
		cff.version = item.versionNumber;
		cff.keywords = writeKeywords(item.tags);
		cff.authors = writeAuthors(item.creators);
		cff.identifiers = writeDOI(item.DOI);

		Zotero.write('cff-version: 1.2.0\nmessage: >-\n  If you use this software, please cite it using the metadata from this file.\n');
		for (let field in cff) {
			if (!cff[field]) continue;
			if (field == "authors" || field == "keywords") {
				Zotero.write(field + ": " + cff[field]);
			}
			else {
				Zotero.write(field + ": " + cff[field] + "\n");
			}
		}
	}
}


/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
