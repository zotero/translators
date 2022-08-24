{
	"translatorID": "91b25fbe-6083-40ef-9ad5-1defc9047a90",
	"label": "Library Catalog (RERO ILS)",
	"creator": "Abe Jellinek",
	"target": "^https://((ils\\.test|bib)\\.rero\\.ch|ils\\.bib\\.uclouvain\\.be)/[^/]+/(documents/\\d+|search/documents\\?)",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 250,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-05-09 18:12:21"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2022 Abe Jellinek

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


/* eslint-disable camelcase */
const TYPE_MAPPING = {
	docmaintype_archives: 'document',
	docmaintype_article: 'journalArticle',
	docmaintype_audio: 'audioRecording',
	docmaintype_book: 'book',
	docsubtype_manuscript: 'manuscript',
	docsubtype_thesis: 'thesis',
	docmaintype_electronic: 'computerProgram',
	docsubtype_video_game: 'computerProgram',
	docmaintype_image: 'artwork',
	docmaintype_map: 'map',
	docmaintype_movie_series: 'videoRecording',
	docmaintype_patent: 'patent',
	docmaintype_preprint: 'preprint',
};

// Copied from MARC translator
const CREATOR_MAPPING = {
	act: "castMember",
	asn: "contributor", // Associated name
	aut: "author",
	cmp: "composer",
	ctb: "contributor",
	drt: "director",
	edt: "editor",
	pbl: "SKIP", // publisher
	prf: "performer",
	pro: "producer",
	pub: "SKIP", // publication place
	trl: "translator"
};

async function detectWeb(doc, url) {
	if (!doc.querySelector('.rero-ils-header')) {
		return false;
	}

	if (getDomainAndID(url).length) {
		return 'book';
	}
	else if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	else if (url.includes('/search/')) {
		Z.monitorDOMChanges(doc.querySelector('public-search-root'),
			{ childList: true, subtree: true });
	}
	return false;
}

function getDomainAndID(url) {
	return (url.match(/\/([^/]+)\/documents\/(\d+)/) || []).slice(1);
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('#recordlist h4 > a[href*="/documents/"]');
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

async function doWeb(doc, url) {
	if (await detectWeb(doc, url) == 'multiple') {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (items) {
			await Promise.all(
				Object.keys(items)
					.map(url => scrape(getDomainAndID(url)))
			);
		}
	}
	else {
		await scrape(getDomainAndID(url));
	}
}

async function scrape([domain, id]) {
	let jsonDoc = await requestDocument(`/${domain}/documents/${id}/export/json`);
	let json = JSON.parse(text(jsonDoc, 'pre')).metadata;

	let itemType = 'book';
	for (let { main_type, subtype } of json.type) {
		if (subtype && TYPE_MAPPING[subtype]) {
			itemType = TYPE_MAPPING[subtype];
		}
		else if (TYPE_MAPPING[main_type]) {
			itemType = TYPE_MAPPING[main_type];
		}
	}

	let item = new Zotero.Item(itemType);

	if (json.title && json.title.length) {
		item.title = json.title[0]._text
			|| (json.title[0].mainTitle[0].value + ': ' + json.title[0].subtitle[0].value);
	}
	else {
		item.title = 'Untitled';
	}

	if (json.contribution && json.contribution.length) {
		for (let creator of json.contribution) {
			let type = CREATOR_MAPPING[creator.role[0]] || 'author';
			if (type === 'SKIP') continue;
			let name = creator.agent.preferred_name
				|| (await requestJSON(creator.agent.$ref)).metadata.preferred_name;
			if (creator.agent.type == 'bf:Organisation') {
				item.creators.push({
					lastName: name,
					creatorType: type,
					fieldMode: 1
				});
			}
			else {
				item.creators.push(ZU.cleanAuthor(name, type, name.includes(',')));
			}
		}

		if (item.creators.every(c => c.creatorType == 'contributor')) {
			for (let creator of item.creators) {
				creator.creatorType = 'author';
			}
		}
	}

	if (json.extent) {
		let extent = json.extent.replace('p.', '');
		if (!(/^vol/i.test(extent)) && ZU.fieldIsValidForType('numPages', itemType)) {
			item.numPages = extent;
		}
	}

	if (json.language && json.language.length) {
		item.language = json.language[0].value;
	}

	if (json.provisionActivity && json.provisionActivity.length) {
		let provision = json.provisionActivity[0];
		let place, agent, date;
		if (provision.statement) {
			for (let statement of provision.statement) {
				let label = statement.label[0] && statement.label[0].value;
				if (!label) continue;
				switch (statement.type) {
					case 'bf:Place':
						place = label;
						break;
					case 'bf:Agent':
						agent = label;
						break;
					case 'Date':
						date = label;
						break;
				}
			}
		}
		if (!date) {
			date = provision.startDate;
		}

		if (place) {
			item.place = place
				.replace(/^\[(.+)\]$/, '$1')
				.replace(/\([^)]+\)/, '')
				.replace(/\[[^\]]+\]/, '');
		}
		if (agent) {
			item.publisher = agent
				.replace(/\([^)]+\)/, '')
				.replace(/\[[^\]]+\]/, '');
		}
		if (date) {
			item.date = ZU.strToISO(date);
		}
	}

	if (json.seriesStatement && json.seriesStatement.length) {
		let statement = json.seriesStatement[0];
		let series = statement.seriesTitle && statement.seriesTitle[0].value;
		if (ZU.fieldIsValidForType('publicationTitle', itemType)) {
			item.publicationTitle = series;
			let seriesEnum = statement.seriesEnumeration && statement.seriesEnumeration[0]
				&& statement.seriesEnumeration[0].value;
			if (seriesEnum) {
				let parts = seriesEnum.split(',').map(part => part.trim().toLowerCase());
				for (let part of parts) {
					if (part.startsWith('vol.')) {
						item.volume = part.substring(4);
					}
					else if (part.startsWith('no.')) {
						item.issue = part.substring(3);
					}
					else if (part.startsWith('p.')) {
						item.pages = part.substring(2);
					}
				}
			}
		}
		else {
			// These are usually collection names, not really series;
			// we probably don't want to store them.
			// item.series = series;
		}
	}

	if (json.identifiedBy) {
		for (let identifier of json.identifiedBy) {
			switch (identifier.type) {
				case 'bf:Isbn':
					item.ISBN = ZU.cleanISBN(identifier.value);
					break;
				case 'uri':
					item.url = identifier.value;
					break;
				case 'bf:Local':
					if (identifier.source == 'RERO') {
						item.callNumber = identifier.value;
					}
			}
		}
	}

	if (json.dimensions && json.dimensions[0]
			&& ZU.fieldIsValidForType('artworkSize', itemType)) {
		item.artworkSize = json.dimensions[0];
	}

	if (json.editionStatement && json.editionStatement[0]) {
		item.edition = json.editionStatement[0].editionDesignation[0].value;
	}

	if (json.subjects) {
		for (let subject of json.subjects) {
			item.tags.push({ tag: subject.term });
		}
	}

	if (json.supplementaryContent) {
		for (let note of json.supplementaryContent) {
			item.notes.push({ note });
		}
	}

	if (json.note) {
		for (let note of json.note) {
			item.notes.push({ note: note.label });
		}
	}

	if (json.summary) {
		for (let summary of json.summary) {
			for (let label of summary.label) {
				item.abstractNote = (item.abstractNote ? item.abstractNote + '\n' : '')
					+ label.value;
			}
		}
	}

	if (json.electronicLocator) {
		for (let locator of json.electronicLocator) {
			if (locator.content == 'coverImage'
					|| locator.url.endsWith('.jpg')
					|| locator.url.endsWith('.png')) {
				continue;
			}
			let title = locator.content == 'fullText'
				? 'Full Text PDF'
				: 'Full Text';
			let mimeType = locator.content == 'fullText'
				? 'application/pdf'
				: 'text/html';
			let snapshot = locator.content != 'fullText';
			item.attachments.push({
				title,
				mimeType,
				snapshot,
				url: locator.url
			});
		}
	}

	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://ils.bib.uclouvain.be/uclouvain/documents/68705",
		"items": [
			{
				"itemType": "book",
				"title": "Histoire économique de la France : XIXe-XXe siècles",
				"creators": [
					{
						"firstName": "François",
						"lastName": "Caron",
						"creatorType": "author"
					}
				],
				"date": "1981",
				"language": "fre",
				"libraryCatalog": "Library Catalog (RERO ILS)",
				"numPages": "320",
				"place": "Paris",
				"publisher": "Armand Colin",
				"shortTitle": "Histoire économique de la France",
				"attachments": [
					{
						"title": "Catalog Entry",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "Bibliogr. p. 304-313"
					},
					{
						"note": "cartes, tabl."
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://ils.bib.uclouvain.be/global/documents/295985",
		"items": [
			{
				"itemType": "book",
				"title": "Interpreting psychological test data.. 1, Test response antecedent",
				"creators": [
					{
						"firstName": "Joseph",
						"lastName": "Gilbert",
						"creatorType": "author"
					}
				],
				"date": "1978",
				"ISBN": "9780442253134",
				"language": "eng",
				"libraryCatalog": "Library Catalog (RERO ILS)",
				"numPages": "XV, 251",
				"place": "New York (N.Y.)",
				"publisher": "Van Nostrand Reinhold",
				"attachments": [
					{
						"title": "Catalog Entry",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Bender-Gestalt Test"
					},
					{
						"tag": "Draw-A-Person Test"
					},
					{
						"tag": "Personality assessment"
					},
					{
						"tag": "Rorschach test"
					},
					{
						"tag": "Wechsler Adult Intelligence Scale"
					}
				],
				"notes": [
					{
						"note": "Associating personality and behavior with responses to the Bender-Gestalt, human figure drawing, Wechsler adult intelligence scale, and the Rorschach ink blot tests"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://ils.bib.uclouvain.be/global/documents/3435980",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "'Common language' in the workplace: an approach devoid of social perspective?",
				"creators": [
					{
						"firstName": "Vincent",
						"lastName": "Mariscal",
						"creatorType": "author"
					}
				],
				"date": "2017",
				"abstractNote": "This paper puts under scrutiny a contemporary management tool called “common language”. This concept derives both from the idea of “freedom” of speech in the workplace, as set up by the Auroux Act, and from the “participative” management approach that emerged in the early 1980s. “Common language” has been developed as part of corporate culture consisting in creating a common culture in which workers can identify themselves; the aim being to coordinate the workers’ actions so they contribute to corporate success. We analyze “common language” as a theoretical construct within a corpus of corporate communication manuals. This study is multidisciplinary: it is mainly based on sociology, sociolinguistics and discourse analysis. We postulate that “common language” is a vision devoid of social perspective, based on an endemic culture where linguistic, cultural, historical and thus social questions are minimized. This interpretation leads us to question whether freedom of speech in the workplace is real or not. Indeed, in the corporate communication manuals studied, language at work is limited to a “theoretical reason”. Ultimately, the rationalization of language in the workplace suggests a technological rationality close to classical management.",
				"issue": "11",
				"language": "eng",
				"libraryCatalog": "Library Catalog (RERO ILS)",
				"pages": "21-40",
				"publicationTitle": "Sociolinguistic Studies",
				"shortTitle": "'Common language' in the workplace",
				"url": "http://hdl.handle.net/2078.1/170384",
				"volume": "1",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf",
						"snapshot": false
					},
					{
						"title": "Catalog Entry",
						"mimeType": "text/html"
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
		"url": "https://bib.rero.ch/global/documents/1289565",
		"items": [
			{
				"itemType": "audioRecording",
				"title": "Solomon (edited and revised by Sir Thomas Beecham, Bart.)",
				"creators": [
					{
						"firstName": "Georg Friedrich",
						"lastName": "Haendel",
						"creatorType": "author"
					},
					{
						"firstName": "Thomas",
						"lastName": "Beecham",
						"creatorType": "contributor"
					},
					{
						"firstName": "John",
						"lastName": "Cameron",
						"creatorType": "contributor"
					},
					{
						"firstName": "Lois",
						"lastName": "Marshall",
						"creatorType": "contributor"
					},
					{
						"firstName": "Elsie",
						"lastName": "Morison",
						"creatorType": "contributor"
					},
					{
						"firstName": "Alexander",
						"lastName": "Young",
						"creatorType": "contributor"
					},
					{
						"lastName": "The Beecham choral society ( London )",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "Royal Philharmonic Orchestra ( Londres )",
						"creatorType": "contributor",
						"fieldMode": 1
					}
				],
				"label": "Columbia, P",
				"language": "eng",
				"libraryCatalog": "Library Catalog (RERO ILS)",
				"attachments": [
					{
						"title": "Catalog Entry",
						"mimeType": "text/html"
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
		"url": "https://ils.bib.uclouvain.be/uclouvain/documents/406229",
		"items": [
			{
				"itemType": "book",
				"title": "Social care in a mixed economy",
				"creators": [
					{
						"firstName": "Brian",
						"lastName": "Hardy",
						"creatorType": "author"
					},
					{
						"firstName": "Martin",
						"lastName": "Knapp",
						"creatorType": "author"
					},
					{
						"firstName": "Gerald",
						"lastName": "Wistow",
						"creatorType": "author"
					}
				],
				"date": "1994",
				"ISBN": "9780335190430",
				"language": "eng",
				"libraryCatalog": "Library Catalog (RERO ILS)",
				"numPages": "X, 166",
				"place": "Buckinghamshire",
				"publisher": "Open university",
				"attachments": [
					{
						"title": "Catalog Entry",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Mixed economy - Great Britain"
					},
					{
						"tag": "Social service - Government policy - Great Britain"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://ils.bib.uclouvain.be/uclouvain/documents/2009186",
		"items": [
			{
				"itemType": "book",
				"title": "Cities in a world economy",
				"creators": [
					{
						"firstName": "Saskia",
						"lastName": "Sassen",
						"creatorType": "author"
					}
				],
				"date": "2019",
				"ISBN": "9781506362618",
				"edition": "Fifth edition",
				"language": "eng",
				"libraryCatalog": "Library Catalog (RERO ILS)",
				"numPages": "xxv, 413",
				"place": "Thousand Oaks",
				"publisher": "Sage",
				"attachments": [
					{
						"title": "Catalog Entry",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Cities and towns - Cross-cultural studies"
					},
					{
						"tag": "Metropolitan areas - Cross-cultural studies"
					},
					{
						"tag": "Sociology, Urban"
					},
					{
						"tag": "Urban economics"
					}
				],
				"notes": [
					{
						"note": "Includes bibliographical references p. 325-394 and index."
					},
					{
						"note": "ill."
					},
					{
						"note": "Revised edition of the author's Cities in a world economy"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://bib.rero.ch/global/documents/1516290",
		"items": [
			{
				"itemType": "audioRecording",
				"title": "Cats on trees",
				"creators": [
					{
						"lastName": "Cats on Trees",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "2014",
				"label": "Tôt ou Tard",
				"language": "eng",
				"libraryCatalog": "Library Catalog (RERO ILS)",
				"place": "Lieu de publication non identifié",
				"attachments": [],
				"tags": [],
				"notes": [
					{
						"note": "1 livret"
					}
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
