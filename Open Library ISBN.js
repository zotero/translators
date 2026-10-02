{
	"translatorID": "82148dcb-b7a3-407f-817f-326fe2612723",
	"label": "Open Library ISBN",
	"creator": "Marielle Volz",
	"target": "",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 110,
	"inRepository": true,
	"translatorType": 8,
	"lastUpdated": "2026-09-07 12:30:50"
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

// Remove trailing parentheticals from titles, as this is usually a series name or similar
function stripTrailingParens(s) {
	let cleaned = s.replace(/(\s*\([^()]*\))+$/, '').trim();
	return cleaned || s;
}

// Clean an Open Library / MARC-style creator name and add it to the item,
// skipping duplicates
function addCreator(item, name, type) {
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
	if (!item.creators.some(c => creatorKey(c) == creatorKey(creator))) {
		item.creators.push(creator);
	}
}

function creatorKey(creator) {
	return (creator.lastName + '|' + (creator.firstName || '')).replace(/\./g, '').toLowerCase();
}

function roleType(role) {
	if (/translat|^trans?\.?$|^tr\.?$/i.test(role)) return 'translator';
	if (/edit|^eds?\.?$/i.test(role)) return 'editor';
	return 'contributor';
}

async function fetchAuthorNames(refs) {
	let authors = await Promise.all(refs
		.filter(ref => ref && ref.key)
		.map(ref => requestJSON(`https://openlibrary.org${ref.key}.json`)));
	return authors.map(author => author.name).filter(Boolean);
}

// https://openlibrary.org/dev/docs/api/search
async function searchByISBN(isbn) {
	try {
		let search = await requestJSON(
			`https://openlibrary.org/search.json?q=isbn:${isbn}&fields=author_name,subject`
		);
		return (search.docs && search.docs[0]) || {};
	}
	catch (e) {
		return {};
	}
}

async function doSearch(item) {
	let isbn = ZU.cleanISBN(item.ISBN);
	if (!isbn) return;

	// https://openlibrary.org/dev/docs/api/books (ISBN API)
	let edition = await requestJSON(`https://openlibrary.org/isbn/${isbn}.json`);

	// The edition only links author records; fetch each name from there rather
	// than from the search API's work-level author list, which can include
	// translators and merged duplicates that don't apply to this edition.
	// The search API is still needed for the work's subjects, and for authors
	// when the edition links none. Run the requests concurrently.
	let editionAuthors = edition.authors || [];
	let subjects = edition.subjects || [];
	let needSearch = !editionAuthors.length || !subjects.length;
	let [authorNames, doc] = await Promise.all([
		fetchAuthorNames(editionAuthors),
		needSearch ? searchByISBN(isbn) : {},
	]);
	if (!authorNames.length) authorNames = doc.author_name || [];
	if (!subjects.length) subjects = doc.subject || [];

	// Last resort: the work record
	if (!authorNames.length && edition.works && edition.works.length) {
		let work = await requestJSON(`https://openlibrary.org${edition.works[0].key}.json`);
		authorNames = await fetchAuthorNames((work.authors || []).map(a => a.author));
		if (!subjects.length) {
			subjects = work.subjects || [];
		}
	}

	let newItem = new Zotero.Item('book');
	// Some records have the subtitle after the title with line breaks
	let titleParts = (edition.title || '').split(/[\r\n]+/);
	if (edition.subtitle) {
		titleParts.push(edition.subtitle);
	}
	// Trailing parentheticals are nearly always series names or volume info,
	// e.g. "Dynamics and Control (Oxford Science Publications)"
	newItem.title = titleParts
		.map(s => stripTrailingParens(ZU.trimInternal(s)))
		.filter(Boolean)
		.join(': '); // For full title, join with colon (English centric)

	for (let name of authorNames) {
		addCreator(newItem, name, 'author');
	}
	// Add contributors, sometimes i.e. "John Smith (Illustrator)", but often just a name with no role
	for (let contribution of edition.contributions || []) {
		let matches = contribution.match(/^(.+?)\s*\(([^)]+)\)$/);
		if (matches) {
			addCreator(newItem, matches[1], roleType(matches[2]));
		}
		else {
			addCreator(newItem, contribution, 'contributor');
		}
	}
	for (let contributor of edition.contributors || []) {
		addCreator(newItem, contributor.name, roleType(contributor.role || ''));
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
	},
	{
		"type": "search",
		"input": {
			"ISBN": "9781841692203"
		},
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"firstName": "Denny",
						"lastName": "Borsboom",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					{
						"tag": "Assessment, Testing & Measurement"
					},
					{
						"tag": "PSYCHOLOGY"
					},
					{
						"tag": "Psychological tests"
					},
					{
						"tag": "Psychometrics"
					},
					{
						"tag": "Reproducibility of Results"
					}
				],
				"seeAlso": [],
				"attachments": [],
				"title": "Frontiers of Test Validity Theory: Multivariate Applications",
				"date": "2011",
				"publisher": "Routledge",
				"ISBN": "9781841692203",
				"extra": "OCLC: 852158659\nOpen Library ID: OL26155791M",
				"callNumber": "BF176",
				"libraryCatalog": "Open Library ISBN",
				"shortTitle": "Frontiers of Test Validity Theory"
			}
		]
	},
	{
		"type": "search",
		"input": {
			"ISBN": "9780198540403"
		},
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"firstName": "Roy M.",
						"lastName": "Anderson",
						"creatorType": "author"
					},
					{
						"firstName": "Robert M.",
						"lastName": "May",
						"creatorType": "author"
					},
					{
						"firstName": "B.",
						"lastName": "Anderson",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					{
						"tag": "Communicable diseases"
					}
				],
				"seeAlso": [],
				"attachments": [],
				"title": "Infectious Diseases of Humans: Dynamics and Control",
				"date": "1992-09-11",
				"publisher": "Oxford University Press, USA",
				"numPages": "766",
				"ISBN": "9780198540403",
				"extra": "Open Library ID: OL7400763M",
				"libraryCatalog": "Open Library ISBN",
				"shortTitle": "Infectious Diseases of Humans"
			}
		]
	}
]
/** END TEST CASES **/
