{
	"translatorID": "3b978207-5d5c-416f-b15e-2d9da4aa75e9",
	"label": "OSF Preprints",
	"creator": "Sebastian Karcher",
	"target": "^https://osf\\.io/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-10-28 14:51:21"
}

/*
    ***** BEGIN LICENSE BLOCK *****

    Copyright © 2025 Abe Jellinek

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


const API_BASE = `https://api.osf.io/v2`;

let idRe = /(?:\/preprints\/[^#?/]+|^)\/([^#?/]+)/;

function detectWeb(doc, url) {
	if (idRe.test(url)) {
		return 'preprint';
	}
	else if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	else if (url.includes('/search')) {
		Zotero.monitorDOMChanges(doc.querySelector('osf-root'));
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('osf-resource-card h2 a');
	for (let row of rows) {
		let type = text(row.closest('osf-resource-card'), '.type');
		if (type !== 'Preprint') continue;
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
	if (detectWeb(doc, url) == 'multiple') {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (!items) return;
		for (let url of Object.keys(items)) {
			await scrape(url);
		}
	}
	else {
		await scrape(url);
	}
}

async function scrape(url) {
	let id = new URL(url).pathname.match(idRe)[1];
	let json = (await requestJSON(
		`${API_BASE}/preprints/${id}/?embed=identifiers`
	)).data;

	let item = new Zotero.Item('preprint');
	
	item.archiveID = json.id;
	item.date = ZU.strToISO(json.attributes.date_published || json.attributes.date_modified);
	item.DOI = json.attributes.doi;
	item.title = json.attributes.title;
	item.abstractNote = json.attributes.description;
	item.tags = json.attributes.tags.map(tag => ({ tag }));
	item.url = json.links.html;

	let citation = (await requestJSON(`${API_BASE}/preprints/${id}/citation/`)).data;

	item.creators = citation.attributes.author.map(author => ({
		lastName: author.family,
		firstName: author.given,
		creatorType: 'author',
	}));
	item.repository = citation.attributes.publisher;

	if (!item.DOI) {
		let identifiers = json.embeds.identifiers.data;
		item.DOI = identifiers.find(id => id.attributes.category === 'doi')
			?.attributes.value;
	}

	if (json.relationships.primary_file) {
		let file = (await requestJSON(json.relationships.primary_file.links.related.href)).data;
		item.attachments.push({
			title: 'Preprint PDF',
			mimeType: 'application/pdf',
			url: file.links.download,
		});
	}

	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://osf.io/preprints/osf/b2xmp",
		"items": [
			{
				"itemType": "preprint",
				"title": "‘All In’: A Pragmatic Framework for COVID-19 Testing and Action on a Global Scale",
				"creators": [
					{
						"lastName": "Pettit",
						"firstName": "Syril D",
						"creatorType": "author"
					},
					{
						"lastName": "Jerome",
						"firstName": "Keith",
						"creatorType": "author"
					},
					{
						"lastName": "Rouquie",
						"firstName": "David",
						"creatorType": "author"
					},
					{
						"lastName": "Hester",
						"firstName": "Susan",
						"creatorType": "author"
					},
					{
						"lastName": "Wehmas",
						"firstName": "Leah",
						"creatorType": "author"
					},
					{
						"lastName": "Mari",
						"firstName": "Bernard",
						"creatorType": "author"
					},
					{
						"lastName": "Barbry",
						"firstName": "Pascal",
						"creatorType": "author"
					},
					{
						"lastName": "Kanda",
						"firstName": "Yasunari",
						"creatorType": "author"
					},
					{
						"lastName": "Matsumoto",
						"firstName": "Mineo",
						"creatorType": "author"
					},
					{
						"lastName": "Botten",
						"firstName": "Jason",
						"creatorType": "author"
					},
					{
						"lastName": "Bruce",
						"firstName": "Emily",
						"creatorType": "author"
					}
				],
				"date": "2020-04-29",
				"DOI": "10.31219/osf.io/b2xmp",
				"abstractNote": "Current demand for SARS-CoV-2 testing is straining material resource and labor capacity around the globe.  As a result, the public health and clinical community are hindered in their ability to monitor and contain the spread of COVID-19.  Despite broad consensus that more testing is needed, pragmatic guidance towards realizing this objective has been limited.  This paper addresses this limitation by proposing a novel and geographically agnostic framework (‘the 4Ps Framework) to guide multidisciplinary, scalable, resource-efficient, and achievable efforts towards enhanced testing capacity.  The 4Ps (Prioritize, Propagate, Partition, and Provide) are described in terms of specific opportunities to enhance the volume, diversity, characterization, and implementation of SARS-CoV-2 testing to benefit public health.  Coordinated deployment of the strategic and tactical recommendations described in this framework have the potential to rapidly expand available testing capacity, improve public health decision-making in response to the COVID-19 pandemic, and/or to be applied in future emergent disease outbreaks.",
				"archiveID": "b2xmp_v1",
				"libraryCatalog": "OSF Preprints",
				"repository": "OSF Preprints",
				"shortTitle": "‘All In’",
				"url": "https://osf.io/b2xmp_v1/",
				"attachments": [
					{
						"title": "Preprint PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "COVID-19"
					},
					{
						"tag": "Pandemic"
					},
					{
						"tag": "Public Health"
					},
					{
						"tag": "RT-PCR"
					},
					{
						"tag": "SARS-CoV-2"
					},
					{
						"tag": "Virologic Testing"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://osf.io/preprints/socarxiv/j7qta",
		"items": [
			{
				"itemType": "preprint",
				"title": "The Reliability of Replications: A Study in Computational Reproductions",
				"creators": [
					{
						"lastName": "Breznau",
						"firstName": "Nate",
						"creatorType": "author"
					},
					{
						"lastName": "Rinke",
						"firstName": "Eike Mark",
						"creatorType": "author"
					},
					{
						"lastName": "Wuttke",
						"firstName": "Alexander",
						"creatorType": "author"
					},
					{
						"lastName": "Nguyen",
						"firstName": "Hung H V",
						"creatorType": "author"
					},
					{
						"lastName": "Adem",
						"firstName": "Muna",
						"creatorType": "author"
					},
					{
						"lastName": "Adriaans",
						"firstName": "Jule",
						"creatorType": "author"
					},
					{
						"lastName": "Akdeniz",
						"firstName": "Esra",
						"creatorType": "author"
					},
					{
						"lastName": "Alvarez-Benjumea",
						"firstName": "Amalia",
						"creatorType": "author"
					},
					{
						"lastName": "Andersen",
						"firstName": "Henrik K",
						"creatorType": "author"
					},
					{
						"lastName": "Auer",
						"firstName": "Daniel",
						"creatorType": "author"
					},
					{
						"lastName": "Azevedo",
						"firstName": "Flavio",
						"creatorType": "author"
					},
					{
						"lastName": "Bahnsen",
						"firstName": "Oke",
						"creatorType": "author"
					},
					{
						"lastName": "Bai",
						"firstName": "Ling",
						"creatorType": "author"
					},
					{
						"lastName": "Balzer",
						"firstName": "Dave",
						"creatorType": "author"
					},
					{
						"lastName": "Bauer",
						"firstName": "Gerrit",
						"creatorType": "author"
					},
					{
						"lastName": "Bauer",
						"firstName": "Paul",
						"creatorType": "author"
					},
					{
						"lastName": "Baumann",
						"firstName": "Markus",
						"creatorType": "author"
					},
					{
						"lastName": "Baute",
						"firstName": "Sharon",
						"creatorType": "author"
					},
					{
						"lastName": "Benoit",
						"firstName": "Verena",
						"creatorType": "author"
					},
					{
						"lastName": "Bernauer",
						"firstName": "Julian",
						"creatorType": "author"
					},
					{
						"lastName": "Berning",
						"firstName": "Carl",
						"creatorType": "author"
					},
					{
						"lastName": "Berthold",
						"firstName": "Anna",
						"creatorType": "author"
					},
					{
						"lastName": "Bethke",
						"firstName": "Felix S",
						"creatorType": "author"
					},
					{
						"lastName": "Biegert",
						"firstName": "Thomas",
						"creatorType": "author"
					},
					{
						"lastName": "Blinzler",
						"firstName": "Katharina",
						"creatorType": "author"
					},
					{
						"lastName": "Blumenberg",
						"firstName": "Johannes",
						"creatorType": "author"
					},
					{
						"lastName": "Bobzien",
						"firstName": "Licia",
						"creatorType": "author"
					},
					{
						"lastName": "Bohman",
						"firstName": "Andrea",
						"creatorType": "author"
					},
					{
						"lastName": "Bol",
						"firstName": "Thijs",
						"creatorType": "author"
					},
					{
						"lastName": "Bostic",
						"firstName": "Amie",
						"creatorType": "author"
					},
					{
						"lastName": "Brzozowska",
						"firstName": "Zuzanna",
						"creatorType": "author"
					},
					{
						"lastName": "Burgdorf",
						"firstName": "Katharina",
						"creatorType": "author"
					},
					{
						"lastName": "Burger",
						"firstName": "Kaspar",
						"creatorType": "author"
					},
					{
						"lastName": "Busch",
						"firstName": "Kathrin",
						"creatorType": "author"
					},
					{
						"lastName": "Castillo",
						"firstName": "Juan C",
						"creatorType": "author"
					},
					{
						"lastName": "Chan",
						"firstName": "Nathan",
						"creatorType": "author"
					},
					{
						"lastName": "Christmann",
						"firstName": "Pablo",
						"creatorType": "author"
					},
					{
						"lastName": "Connelly",
						"firstName": "Roxanne",
						"creatorType": "author"
					},
					{
						"lastName": "Czymara",
						"firstName": "Christian S",
						"creatorType": "author"
					},
					{
						"lastName": "Damian",
						"firstName": "Elena",
						"creatorType": "author"
					},
					{
						"lastName": "de Rooij",
						"firstName": "Eline A",
						"creatorType": "author"
					},
					{
						"lastName": "Ecker",
						"firstName": "Alejandro",
						"creatorType": "author"
					},
					{
						"lastName": "Edelmann",
						"firstName": "Achim",
						"creatorType": "author"
					},
					{
						"lastName": "Eder",
						"firstName": "Christina",
						"creatorType": "author"
					},
					{
						"lastName": "Eger",
						"firstName": "Maureen A",
						"creatorType": "author"
					},
					{
						"lastName": "Ellerbrock",
						"firstName": "Simon",
						"creatorType": "author"
					},
					{
						"lastName": "Forke",
						"firstName": "Anna",
						"creatorType": "author"
					},
					{
						"lastName": "Forster",
						"firstName": "Andrea G",
						"creatorType": "author"
					},
					{
						"lastName": "Freire",
						"firstName": "Danilo",
						"creatorType": "author"
					},
					{
						"lastName": "Gaasendam",
						"firstName": "Chris",
						"creatorType": "author"
					},
					{
						"lastName": "Gavras",
						"firstName": "Konstantin",
						"creatorType": "author"
					},
					{
						"lastName": "Gayle",
						"firstName": "Vernon, Professor",
						"creatorType": "author"
					},
					{
						"lastName": "Gessler",
						"firstName": "Theresa",
						"creatorType": "author"
					},
					{
						"lastName": "Gnambs",
						"firstName": "Timo",
						"creatorType": "author"
					},
					{
						"lastName": "Godefroidt",
						"firstName": "Amélie",
						"creatorType": "author"
					},
					{
						"lastName": "Grömping",
						"firstName": "Max",
						"creatorType": "author"
					},
					{
						"lastName": "Groß",
						"firstName": "Martin",
						"creatorType": "author"
					},
					{
						"lastName": "Gruber",
						"firstName": "Stefan",
						"creatorType": "author"
					},
					{
						"lastName": "Gummer",
						"firstName": "Tobias",
						"creatorType": "author"
					},
					{
						"lastName": "Hadjar",
						"firstName": "Andreas",
						"creatorType": "author"
					},
					{
						"lastName": "Halbherr",
						"firstName": "Verena",
						"creatorType": "author"
					},
					{
						"lastName": "Heisig",
						"firstName": "Jan P",
						"creatorType": "author"
					},
					{
						"lastName": "Hellmeier",
						"firstName": "Sebastian",
						"creatorType": "author"
					},
					{
						"lastName": "Heyne",
						"firstName": "Stefanie",
						"creatorType": "author"
					},
					{
						"lastName": "Hirsch",
						"firstName": "Magdalena",
						"creatorType": "author"
					},
					{
						"lastName": "Hjerm",
						"firstName": "Mikael",
						"creatorType": "author"
					},
					{
						"lastName": "Hochman",
						"firstName": "Oshrat",
						"creatorType": "author"
					},
					{
						"lastName": "Höffler",
						"firstName": "Jan H",
						"creatorType": "author"
					},
					{
						"lastName": "Hövermann",
						"firstName": "Andreas",
						"creatorType": "author"
					},
					{
						"lastName": "Hunger",
						"firstName": "Sophia",
						"creatorType": "author"
					},
					{
						"lastName": "Hunkler",
						"firstName": "Christian",
						"creatorType": "author"
					},
					{
						"lastName": "Huth-Stöckle",
						"firstName": "Nora",
						"creatorType": "author"
					},
					{
						"lastName": "Ignacz",
						"firstName": "Zsofia S.",
						"creatorType": "author"
					},
					{
						"lastName": "Israel",
						"firstName": "Sabine",
						"creatorType": "author"
					},
					{
						"lastName": "Jacobs",
						"firstName": "Laura",
						"creatorType": "author"
					},
					{
						"lastName": "Jacobsen",
						"firstName": "Jannes",
						"creatorType": "author"
					},
					{
						"lastName": "Jaeger",
						"firstName": "Bastian",
						"creatorType": "author"
					},
					{
						"lastName": "Jungkunz",
						"firstName": "Sebastian",
						"creatorType": "author"
					},
					{
						"lastName": "Jungmann",
						"firstName": "Nils",
						"creatorType": "author"
					},
					{
						"lastName": "Kanjana",
						"firstName": "Jennifer",
						"creatorType": "author"
					},
					{
						"lastName": "Kauff",
						"firstName": "Mathias",
						"creatorType": "author"
					},
					{
						"lastName": "Khan",
						"firstName": "Salman",
						"creatorType": "author"
					},
					{
						"lastName": "Khatua",
						"firstName": "Sayak",
						"creatorType": "author"
					},
					{
						"lastName": "Kleinert",
						"firstName": "Manuel",
						"creatorType": "author"
					},
					{
						"lastName": "Klinger",
						"firstName": "Julia",
						"creatorType": "author"
					},
					{
						"lastName": "Kolb",
						"firstName": "Jan-Philipp",
						"creatorType": "author"
					},
					{
						"lastName": "Kołczyńska",
						"firstName": "Marta",
						"creatorType": "author"
					},
					{
						"lastName": "Kuk",
						"firstName": "John S",
						"creatorType": "author"
					},
					{
						"lastName": "Kunißen",
						"firstName": "Katharina",
						"creatorType": "author"
					},
					{
						"lastName": "Sinatra",
						"firstName": "Dafina K",
						"creatorType": "author"
					},
					{
						"lastName": "Greinert",
						"firstName": "Alexander",
						"creatorType": "author"
					},
					{
						"lastName": "Lee",
						"firstName": "Robin C",
						"creatorType": "author"
					},
					{
						"lastName": "Lersch",
						"firstName": "Philipp M",
						"creatorType": "author"
					},
					{
						"lastName": "Liu",
						"firstName": "David",
						"creatorType": "author"
					},
					{
						"lastName": "Löbel",
						"firstName": "Lea-Maria",
						"creatorType": "author"
					},
					{
						"lastName": "Lutscher",
						"firstName": "Philipp",
						"creatorType": "author"
					},
					{
						"lastName": "Mader",
						"firstName": "Matthias",
						"creatorType": "author"
					},
					{
						"lastName": "Madia",
						"firstName": "Joan E",
						"creatorType": "author"
					},
					{
						"lastName": "Malancu",
						"firstName": "Natalia",
						"creatorType": "author"
					},
					{
						"lastName": "Maldonado",
						"firstName": "Luis",
						"creatorType": "author"
					},
					{
						"lastName": "Marahrens",
						"firstName": "Helge",
						"creatorType": "author"
					},
					{
						"lastName": "Martin",
						"firstName": "Nicole",
						"creatorType": "author"
					},
					{
						"lastName": "Martinez",
						"firstName": "Paul",
						"creatorType": "author"
					},
					{
						"lastName": "Mayerl",
						"firstName": "Jochen",
						"creatorType": "author"
					},
					{
						"lastName": "MAYORGA",
						"firstName": "OSCAR J",
						"creatorType": "author"
					},
					{
						"lastName": "McDonnell",
						"firstName": "Robert M",
						"creatorType": "author"
					},
					{
						"lastName": "McManus",
						"firstName": "Patricia A",
						"creatorType": "author"
					},
					{
						"lastName": "Wagner",
						"firstName": "Kyle",
						"creatorType": "author"
					},
					{
						"lastName": "Meeusen",
						"firstName": "Cecil",
						"creatorType": "author"
					},
					{
						"lastName": "Meierrieks",
						"firstName": "Daniel",
						"creatorType": "author"
					},
					{
						"lastName": "Mellon",
						"firstName": "Jonathan",
						"creatorType": "author"
					},
					{
						"lastName": "Merhout",
						"firstName": "Friedolin",
						"creatorType": "author"
					},
					{
						"lastName": "Merk",
						"firstName": "Samuel",
						"creatorType": "author"
					},
					{
						"lastName": "Meyer",
						"firstName": "Daniel",
						"creatorType": "author"
					},
					{
						"lastName": "Micheli",
						"firstName": "Leticia",
						"creatorType": "author"
					},
					{
						"lastName": "Mijs",
						"firstName": "Jonathan J",
						"creatorType": "author"
					},
					{
						"lastName": "Moya",
						"firstName": "Cristóbal",
						"creatorType": "author"
					},
					{
						"lastName": "Neunhoeffer",
						"firstName": "Marcel",
						"creatorType": "author"
					},
					{
						"lastName": "Nüst",
						"firstName": "Daniel",
						"creatorType": "author"
					},
					{
						"lastName": "Nygård",
						"firstName": "Olav",
						"creatorType": "author"
					},
					{
						"lastName": "Ochsenfeld",
						"firstName": "Fabian",
						"creatorType": "author"
					},
					{
						"lastName": "Otte",
						"firstName": "Gunnar",
						"creatorType": "author"
					},
					{
						"lastName": "Pechenkina",
						"firstName": "Anna",
						"creatorType": "author"
					},
					{
						"lastName": "Pickup",
						"firstName": "Mark",
						"creatorType": "author"
					},
					{
						"lastName": "Prosser",
						"firstName": "Christopher",
						"creatorType": "author"
					},
					{
						"lastName": "Raes",
						"firstName": "Louis",
						"creatorType": "author"
					},
					{
						"lastName": "Ralston",
						"firstName": "Kevin",
						"creatorType": "author"
					},
					{
						"lastName": "Ramos",
						"firstName": "Miguel",
						"creatorType": "author"
					},
					{
						"lastName": "Reichert",
						"firstName": "Frank",
						"creatorType": "author"
					},
					{
						"lastName": "Roets",
						"firstName": "Arne",
						"creatorType": "author"
					},
					{
						"lastName": "Rogers",
						"firstName": "Jonathan",
						"creatorType": "author"
					},
					{
						"lastName": "Ropers",
						"firstName": "Guido",
						"creatorType": "author"
					},
					{
						"lastName": "Samuel",
						"firstName": "Robin",
						"creatorType": "author"
					},
					{
						"lastName": "Sand",
						"firstName": "Gergor",
						"creatorType": "author"
					},
					{
						"lastName": "Petrarca",
						"firstName": "Constanza S",
						"creatorType": "author"
					},
					{
						"lastName": "Schachter",
						"firstName": "Ariela",
						"creatorType": "author"
					},
					{
						"lastName": "Schaeffer",
						"firstName": "Merlin",
						"creatorType": "author"
					},
					{
						"lastName": "Schieferdecker",
						"firstName": "David",
						"creatorType": "author"
					},
					{
						"lastName": "Schlueter",
						"firstName": "Elmar",
						"creatorType": "author"
					},
					{
						"lastName": "Schmidt",
						"firstName": "Katja",
						"creatorType": "author"
					},
					{
						"lastName": "Schmidt",
						"firstName": "Regine",
						"creatorType": "author"
					},
					{
						"lastName": "Schmidt-Catran",
						"firstName": "Alexander",
						"creatorType": "author"
					},
					{
						"lastName": "Schmiedeberg",
						"firstName": "Claudia",
						"creatorType": "author"
					},
					{
						"lastName": "Schneider",
						"firstName": "Jürgen",
						"creatorType": "author"
					},
					{
						"lastName": "Schoonvelde",
						"firstName": "Martijn",
						"creatorType": "author"
					},
					{
						"lastName": "Schulte-Cloos",
						"firstName": "Julia",
						"creatorType": "author"
					},
					{
						"lastName": "Schumann",
						"firstName": "Sandy",
						"creatorType": "author"
					},
					{
						"lastName": "Schunck",
						"firstName": "Reinhard",
						"creatorType": "author"
					},
					{
						"lastName": "Seuring",
						"firstName": "Julian",
						"creatorType": "author"
					},
					{
						"lastName": "Silber",
						"firstName": "Henning",
						"creatorType": "author"
					},
					{
						"lastName": "Sleegers",
						"firstName": "Willem W A",
						"creatorType": "author"
					},
					{
						"lastName": "Sonntag",
						"firstName": "Nico",
						"creatorType": "author"
					},
					{
						"lastName": "Staudt",
						"firstName": "Alexander",
						"creatorType": "author"
					},
					{
						"lastName": "Steiber",
						"firstName": "Nadia",
						"creatorType": "author"
					},
					{
						"lastName": "Steiner",
						"firstName": "Nils",
						"creatorType": "author"
					},
					{
						"lastName": "Sternberg",
						"firstName": "Sebastian",
						"creatorType": "author"
					},
					{
						"lastName": "Stiers",
						"firstName": "Dieter",
						"creatorType": "author"
					},
					{
						"lastName": "Stojmenovska",
						"firstName": "Dragana",
						"creatorType": "author"
					},
					{
						"lastName": "Storz",
						"firstName": "Nora",
						"creatorType": "author"
					},
					{
						"lastName": "Striessnig",
						"firstName": "Erich",
						"creatorType": "author"
					},
					{
						"lastName": "Stroppe",
						"firstName": "Anne-Kathrin",
						"creatorType": "author"
					},
					{
						"lastName": "Suchow",
						"firstName": "Jordan",
						"creatorType": "author"
					},
					{
						"lastName": "Teltemann",
						"firstName": "Janna",
						"creatorType": "author"
					},
					{
						"lastName": "Tibajev",
						"firstName": "Andrey",
						"creatorType": "author"
					},
					{
						"lastName": "Tung",
						"firstName": "Brian B",
						"creatorType": "author"
					},
					{
						"lastName": "Vagni",
						"firstName": "Giacomo",
						"creatorType": "author"
					},
					{
						"lastName": "Van Assche",
						"firstName": "Jasper",
						"creatorType": "author"
					},
					{
						"lastName": "van der Linden",
						"firstName": "Meta",
						"creatorType": "author"
					},
					{
						"lastName": "van der Noll",
						"firstName": "Jolanda",
						"creatorType": "author"
					},
					{
						"lastName": "Van Hootegem",
						"firstName": "Arno",
						"creatorType": "author"
					},
					{
						"lastName": "Vogtenhuber",
						"firstName": "Stefan",
						"creatorType": "author"
					},
					{
						"lastName": "Voicu",
						"firstName": "Bogdan",
						"creatorType": "author"
					},
					{
						"lastName": "Wagemans",
						"firstName": "Fieke",
						"creatorType": "author"
					},
					{
						"lastName": "Wehl",
						"firstName": "Nadja",
						"creatorType": "author"
					},
					{
						"lastName": "Werner",
						"firstName": "Hannah",
						"creatorType": "author"
					},
					{
						"lastName": "Wiernik",
						"firstName": "Brenton M",
						"creatorType": "author"
					},
					{
						"lastName": "Winter",
						"firstName": "Fabian",
						"creatorType": "author"
					},
					{
						"lastName": "Wolf",
						"firstName": "Christof",
						"creatorType": "author"
					},
					{
						"lastName": "Wu",
						"firstName": "Cary",
						"creatorType": "author"
					},
					{
						"lastName": "Yamada",
						"firstName": "Yuki",
						"creatorType": "author"
					},
					{
						"lastName": "Zakula",
						"firstName": "Björn",
						"creatorType": "author"
					},
					{
						"lastName": "Zhang",
						"firstName": "Nan",
						"creatorType": "author"
					},
					{
						"lastName": "Ziller",
						"firstName": "Conrad",
						"creatorType": "author"
					},
					{
						"lastName": "Zins",
						"firstName": "Stefan",
						"creatorType": "author"
					},
					{
						"lastName": "Żółtak",
						"firstName": "Tomasz",
						"creatorType": "author"
					}
				],
				"date": "2021-05-18",
				"DOI": "10.31235/osf.io/j7qta_v1",
				"abstractNote": "This paper reports findings from a crowdsourced replication. Eighty-five independent teams attempted a computational replication of results reported in an original study of policy preferences and immigration by fitting the same statistical models to the same data. The replication involved an experimental condition. Random assignment put participating teams into either the transparent group that received the original study and code, or the opaque group receiving only a methods section, rough results description and no code. The transparent group mostly verified the numerical results of the original study with the same sign and p-value threshold (95.7%), while the opaque group had less success (89.3%). Exact numerical reproductions to the second decimal place were far less common (76.9% and 48.1%), and the number of teams who verified at least 95% of all effects in all models they ran was 79.5% and 65.2% respectively. Therefore, the reliability we quantify depends on how reliability is defined, but most definitions suggest it would take a minimum of three independent replications to achieve reliability. Qualitative investigation of the teams’ workflows reveals many causes of error including mistakes and procedural variations. Although minor error across researchers is not surprising, we show this occurs where it is least expected in the case of computational reproduction. Even when we curate the results to boost ecological validity, the error remains large enough to undermine reliability between researchers to some extent. The presence of inter-researcher variability may explain some of the current “reliability crisis” in the social sciences because it may be undetected in all forms of research involving data analysis. The obvious implication of our study is more transparency. Broader implications are that researcher variability adds an additional meta-source of error that may not derive from conscious measurement or modeling decisions, and that replications cannot alone resolve this type of uncertainty.",
				"archiveID": "j7qta_v1",
				"libraryCatalog": "OSF Preprints",
				"repository": "SocArXiv",
				"shortTitle": "The Reliability of Replications",
				"url": "https://osf.io/preprints/socarxiv/j7qta_v1/",
				"attachments": [
					{
						"title": "Preprint PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Immigration"
					},
					{
						"tag": "Meta-Reliability"
					},
					{
						"tag": "Noise"
					},
					{
						"tag": "Policy Preferences"
					},
					{
						"tag": "Replication"
					},
					{
						"tag": "Researcher Variability"
					},
					{
						"tag": "Secondary Observer Effect"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://osf.io/preprints/psyarxiv/7eb4g",
		"items": [
			{
				"itemType": "preprint",
				"title": "Revisiting the Digital Jukebox in Daily Life: Applying Mood Management Theory to Algorithmically Curated Music Streaming Environments",
				"creators": [
					{
						"lastName": "Ernst",
						"firstName": "Alicia",
						"creatorType": "author"
					},
					{
						"lastName": "Dietrich",
						"firstName": "Felix",
						"creatorType": "author"
					},
					{
						"lastName": "Rohr",
						"firstName": "Benedikt",
						"creatorType": "author"
					},
					{
						"lastName": "Reinecke",
						"firstName": "Leonard",
						"creatorType": "author"
					},
					{
						"lastName": "Scharkow",
						"firstName": "Michael",
						"creatorType": "author"
					}
				],
				"date": "2024-09-30",
				"DOI": "10.31234/osf.io/7eb4g_v1",
				"abstractNote": "Experimental evidence has profoundly contributed to our understanding of Mood Man-agement Theory (MMT) in the context of music. Extant research, however, lacks insights into everyday mood regulation through music listening, especially on music streaming services where selections can be guided by algorithmic recommendations. Hence, we tested MMT in a naturalistic setting by combining experience sampling with logged music streaming data, while accounting for algorithmic curation as a boundary condition to users’ music choices. In a pre-registered study utilizing T = 6,864 surveys from N = 144 listeners, results showed that mood, music selection, and algorithmic curation varied substantially from situation to situation. How-ever, we found no effects between mood and music choices that would confirm MMT’s selection hypotheses, yet in part, small congruent effects between mood and music. Algorithmic curation did not establish novel MMT-related patterns. Our findings suggest re-specifying MMT and related media use theories for daily life.",
				"archiveID": "7eb4g_v1",
				"libraryCatalog": "OSF Preprints",
				"repository": "PsyArXiv",
				"shortTitle": "Revisiting the Digital Jukebox in Daily Life",
				"url": "https://osf.io/preprints/psyarxiv/7eb4g_v1/",
				"attachments": [
					{
						"title": "Preprint PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Mood Management Theory"
					},
					{
						"tag": "algorithmic curation"
					},
					{
						"tag": "digital behavioral data"
					},
					{
						"tag": "experience sampling method"
					},
					{
						"tag": "music use"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://osf.io/search?search=curiosity&tab=5",
		"defer": true,
		"items": "multiple"
	}
]
/** END TEST CASES **/
