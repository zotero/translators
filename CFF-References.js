{
	"translatorID": "99A6641F-A8C2-4923-9BBB-0DA87F1E5187",
	"label": "CFF References",
	"creator": "Sebastian Karcher, Dave Bunten",
	"target": "cff",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 2,
	"lastUpdated": "2024-03-15 12:21:10"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2024 Sebastian Karcher, Dave Bunten

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

// set a global for spacing purposes under the references key of a citation.cff file
var referencesSpacing = '    ';

function writeArray(tags) {
	if (!tags.length) return false;
	let keywords = "\n";
	for (let tag of tags) {
		keywords += referencesSpacing + "  - " + tag.tag + "\n";
	}
	return keywords.replace(/\\n$/, "");
}

function writeDOI(itemDOI) {
	if (!itemDOI) return false;
	let doi = "\n" + referencesSpacing + "  - type: doi\n" + referencesSpacing + "    value: " + itemDOI + "\n";
	return doi;
}

function writeCreators(itemCreators, creatorType="") {
	let itemAuthors = [];
	for (let creator of itemCreators) {
		if (creatorType != "" && ZU.getCreatorsForType(creator.itemType)[0] == creatorType) {
			itemAuthors.push(creator);
		}
		else {
			itemAuthors.push(creator);
		}
	}
	if (!itemAuthors.length) return false;
	let authors = "\n";
	for (let author of itemAuthors) {
		authors += referencesSpacing + "  - family-names: " + author.lastName + "\n";
		if (author.firstName) {
			authors += referencesSpacing + "    given-names: " + author.firstName + "\n";
		}
	}
	return authors;
}

function doExport() {
	var item;

	Zotero.write('# This CITATION.cff reference content was generated from Zotero.\n');
	Zotero.write('references:\n');

	// eslint-disable-next-line no-cond-assign
	while (item = Zotero.nextItem()) {
		var cff = {};
		cff.title = ">-\n" + referencesSpacing + "  " + item.title + "\n";
		cff.abstract = item.abstractNote;
		cff.type = item.itemType;
		cff.license = item.rights;
		cff.version = item.versionNumber;

		// Referenced from:
		// https://github.com/zotero/zotero/blob/65db66eb339fc2bab4a78f9955f9e5197de3d028/chrome/locale/en-GB/zotero/zotero.properties#L491
		cff.collection_title = item.collections
		cff.conference = item.conferenceName;
		cff.copyright = item.rights;
		cff.date_accessed = item.accessDate;
		cff.edition = item.edition;
		cff.editors = writeCreators(item.creators, "editor");
		cff.editors_series = item.series
		cff.recipients = writeCreators(item.creators, "recipient");
		cff.translators = writeCreators(item.creators, "translator");
		cff.format = item.format;
		cff.institution = item.institution;
		cff.isbn = item.ISBN;
		cff.issn = item.ISSN;
		cff.issue = item.issue;
		cff.issue_date = item.issueDate;
		cff.journal = item.journalAbbreviation;
		cff.languages = writeArray(item.language)
		cff.location = item.archiveLocation;
		cff.medium = item.medium;
		cff.number = item.number;
		cff.number_volumes = item.numberOfVolumes;
		cff.pages = item.pages;
		// match for pmcid within extras content
		if (item.extra && /^pmcid:/i.test(item.extra)) {
			cff.pmcid = item.extra.match(/pmcid:\s*(\S+)/);
		}
		cff.publisher = item.publisher;
		cff.repository = cff.repository;
		cff.section = item.section;
		cff.thesis_type = item.thesisType;
		cff.volume = item.volume;
		cff.url = item.url;
		cff.keywords = writeArray(item.tags);
		cff.authors = writeCreators(item.creators, "author");
		if (item.date) {
			// if we have a dataset or software, use date-released field
			if (item.itemType == "dataset" || item.itemType == "computerProgram") {
				cff["date-released"] = ZU.strToISO(item.date);
			}
			// include date published for any item types
			cff["date-published"] = ZU.strToISO(item.date);
		}
		// get DOI from Extra for software; this will stop running automatically once software supports DOI
		if (!ZU.fieldIsValidForType('DOI', item.itemType) && /^doi:/i.test(item.extra)) {
			item.DOI = ZU.cleanDOI(item.extra);
		}
		cff.identifiers = writeDOI(item.DOI);

		// prep the entry as a new item
		Zotero.write('  - ');

		// loop through the cff elements and write output
		for (let field in cff) {
			if (!cff[field]) continue;
			if (field == "title") {
				// rely on prep dash for item start above for titles
				Zotero.write(field + ": " + cff[field]);
			}
			else if (field == "abstract") {
				// special case for abstract, which can sometimes be large
				Zotero.write(referencesSpacing + field + ": |\n" + referencesSpacing + "  " + cff[field] + "\n");
			}
			else if (field == "authors" || field == "keywords") {
				Zotero.write(referencesSpacing + field + ": " + cff[field]);
			}
			else {
				Zotero.write(referencesSpacing + field.replace("_", "-") + ": " + cff[field] + "\n");
			}
		}
	}
}

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
