{
	"translatorID": "82148dcb-b7a3-407f-817f-326fe2612723",
	"label": "Open Library ISBN",
	"creator": "Marielle Volz",
	"target": "",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 8,
	"lastUpdated": "2026-08-21 12:01:35"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2026 Marielle Volz

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


function detectSearch(item) {
	return !!item.ISBN;
}

async function doSearch(item) {
	let isbn = ZU.cleanISBN(item.ISBN);
	if (!isbn) return;

	// https://openlibrary.org/dev/docs/api/books (ISBN API)
	let edition = await requestJSON(`https://openlibrary.org/isbn/${isbn}.json`);

	// Additional search request to get author names and the work's subjects,
	// Edition record only contains links to author page
	// https://openlibrary.org/dev/docs/api/search
	let doc = {};
	try {
		let search = await requestJSON(
			`https://openlibrary.org/search.json?q=isbn:${isbn}&fields=author_name,subject`
		);
		doc = (search.docs && search.docs[0]) || {};
	}
	catch (e) {
	}

	let authorNames = doc.author_name || [];
	let subjects = edition.subjects || doc.subject || [];

	// Fallback to get authors from works page if none surface in the search api
	if (!authorNames.length) {
		let authorRefs = edition.authors;
		if (!authorRefs && edition.works && edition.works.length) {
			let work = await requestJSON(`https://openlibrary.org${edition.works[0].key}.json`);
			authorRefs = (work.authors || []).map(a => a.author);
			if (!subjects.length) {
				subjects = work.subjects || [];
			}
		}
		for (let ref of authorRefs || []) {
			let author = await requestJSON(`https://openlibrary.org${ref.key}.json`);
			authorNames.push(author.name);
		}
	}

	let newItem = new Zotero.Item('book');
	newItem.title = edition.title;
	if (edition.subtitle) {
		newItem.title += ': ' + edition.subtitle;
	}

	let seen = new Set();
	function addCreator(name, type) {
		// Strip birth/death dates ("Pevear, Richard, 1943-")
		name = name.replace(/,?\s*\d{4}[-–]?(\d{4})?\.?$/, '');
		// MARC-style role suffixes ("Monas, Sidney, translator"; "Bennett, Jill, ill.")
		// Abbreviations are only trusted in lowercase so that first names
		// ("Smith, Ed") don't get eaten
		let tail = name.match(/,\s*(illustrator|translator|editor|narrator|compiler)s?\.?\s*$/i)
			|| name.match(/,\s*(illus|ill|trans|tr|eds|ed|comp)\.?\s*$/);
		if (tail) {
			name = name.slice(0, tail.index);
			if (type == 'contributor') {
				type = roleType(tail[1]);
			}
		}
		if (!name) return;
		let creator = ZU.cleanAuthor(name, type, name.includes(','));
		if (!creator.firstName) {
			creator.fieldMode = 1;
		}
		// Sometimes there are duplicate authors
		let key = (creator.lastName + '|' + (creator.firstName || '')).replace(/\./g, '').toLowerCase();
		if (!seen.has(key)) {
			seen.add(key);
			newItem.creators.push(creator);
		}
	}
	function roleType(role) {
		if (/translat|^trans?\.?$|^tr\.?$/i.test(role)) return 'translator';
		if (/edit|^eds?\.?$/i.test(role)) return 'editor';
		return 'contributor';
	}

	for (let name of authorNames) {
		addCreator(name, 'author');
	}
	// Add contributors, sometimes i.e. "John Smith (Illustrator)", but often just a name with no role
	for (let contribution of edition.contributions || []) {
		let matches = contribution.match(/^(.+?)\s*\(([^)]+)\)$/);
		if (matches) {
			addCreator(matches[1], roleType(matches[2]));
		}
		else {
			addCreator(contribution, 'contributor');
		}
	}
	for (let contributor of edition.contributors || []) {
		addCreator(contributor.name, roleType(contributor.role || ''));
	}
	if (edition.publish_date) {
		newItem.date = ZU.strToISO(edition.publish_date) || edition.publish_date;
	}
	if (edition.publishers) {
		newItem.publisher = edition.publishers.join(', ');
	}
	if (edition.publish_places) {
		newItem.place = edition.publish_places.join(', ');
	}
	if (edition.number_of_pages) {
		newItem.numPages = String(edition.number_of_pages);
	}
	newItem.ISBN = isbn;

	let extra = [];
	if (edition.oclc_numbers && edition.oclc_numbers.length) {
		extra.push('OCLC: ' + edition.oclc_numbers[0]);
	}
	if (edition.key) {
		extra.push('Open Library ID: ' + edition.key.replace('/books/', ''));
	}
	newItem.extra = extra.join('\n');

	if (edition.lc_classifications && edition.lc_classifications.length) {
		newItem.callNumber = edition.lc_classifications[0];
	}

	newItem.tags = subjects;

	if (edition.notes) {
		let note = typeof edition.notes === 'object' ? edition.notes.value : edition.notes;
		newItem.notes.push({ note });
	}
	newItem.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "search",
		"input": {
			"ISBN": "9780140328721"
		},
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"firstName": "Roald",
						"lastName": "Dahl",
						"creatorType": "author"
					},
					{
						"firstName": "Tony",
						"lastName": "Ross",
						"creatorType": "contributor"
					}
				],
				"notes": [],
				"tags": [
					{
						"tag": "Agriculteurs"
					},
					{
						"tag": "Animals"
					},
					{
						"tag": "Badgers"
					},
					{
						"tag": "Children's fiction"
					},
					{
						"tag": "Children's literature"
					},
					{
						"tag": "Children's plays"
					},
					{
						"tag": "Children's plays, English"
					},
					{
						"tag": "Children's stories"
					},
					{
						"tag": "Children's stories, English"
					},
					{
						"tag": "Children's stories, Welsh"
					},
					{
						"tag": "English Authors"
					},
					{
						"tag": "Fantasy fiction"
					},
					{
						"tag": "Farmers"
					},
					{
						"tag": "Ficción juvenil"
					},
					{
						"tag": "Fiction"
					},
					{
						"tag": "Foxes"
					},
					{
						"tag": "Foxes, fiction"
					},
					{
						"tag": "Hunger"
					},
					{
						"tag": "Interviews"
					},
					{
						"tag": "Juvenile fiction"
					},
					{
						"tag": "Open Library Staff Picks"
					},
					{
						"tag": "Plays"
					},
					{
						"tag": "Rats"
					},
					{
						"tag": "Renards"
					},
					{
						"tag": "Romans, nouvelles, etc. pour la jeunesse"
					},
					{
						"tag": "Thieves"
					},
					{
						"tag": "Tricksters"
					},
					{
						"tag": "Tunnels"
					},
					{
						"tag": "Underground"
					},
					{
						"tag": "Welsh Authors"
					},
					{
						"tag": "Zorros"
					}
				],
				"seeAlso": [],
				"attachments": [],
				"title": "Fantastic Mr. Fox",
				"date": "1988-10-01",
				"publisher": "Puffin",
				"numPages": "96",
				"ISBN": "9780140328721",
				"extra": "Open Library ID: OL7353617M",
				"libraryCatalog": "Open Library ISBN"
			}
		]
	},
	{
		"type": "search",
		"input": {
			"ISBN": "9780262033848"
		},
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"firstName": "Thomas H.",
						"lastName": "Cormen",
						"creatorType": "author"
					},
					{
						"firstName": "Charles E.",
						"lastName": "Leiserson",
						"creatorType": "author"
					},
					{
						"firstName": "Ronald L.",
						"lastName": "Rivest",
						"creatorType": "author"
					},
					{
						"firstName": "Clifford",
						"lastName": "Stein",
						"creatorType": "author"
					}
				],
				"notes": [
					{
						"note": "Includes bibliographical references and index."
					}
				],
				"tags": [
					{
						"tag": "Computer algorithms"
					},
					{
						"tag": "Computer programming"
					}
				],
				"seeAlso": [],
				"attachments": [],
				"title": "Introduction to Algorithms",
				"date": "2009",
				"publisher": "The MIT Press",
				"place": "Cambridge, MA, USA",
				"numPages": "1292",
				"ISBN": "9780262033848",
				"extra": "OCLC: 676697295\nOpen Library ID: OL23170657M",
				"callNumber": "QA76.6 .I5858 2009",
				"libraryCatalog": "Open Library ISBN"
			}
		]
	}
]
/** END TEST CASES **/
