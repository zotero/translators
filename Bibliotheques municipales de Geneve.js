{
	"translatorID": "4f1e51b6-8841-4ba7-b612-7511fae4f37a",
	"label": "Bibliotheques municipales de Geneve",
	"creator": "EA Library Project",
	"target": "^https?://www\\.bm-geneve\\.ch/(?:ark:/75245/caT[0-9X]+(?:[/?#]|$)|search/)",
	"minVersion": "7.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-09-30 13:33:58"
}

// SPDX-License-Identifier: AGPL-3.0-or-later
// BMG's legacy catalogue exposes MARCXML through an asynchronous export job.
// Records use MARC21 XML syntax but contain UNIMARC fields.


/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2026 EA Library Project

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

const MARC_NS = "http://www.loc.gov/MARC21/slim";

function recordID(url) {
	let match = /^https?:\/\/(?:www\.)?bm-geneve\.ch\/ark:\/75245\/ca(T[\dX]+)(?:[/?#]|$)/.exec(url);
	return match ? match[1] : false;
}

function getSearchResults(doc, checkOnly) {
	let items = {};
	let links = doc.querySelectorAll('a[href^="/notice?id="]');

	for (let link of links) {
		let href = link.href;
		let title = link.getAttribute("title") || link.textContent.trim();

		if (!href || !title) continue;
		if (checkOnly) return true;

		items[href] = title.trim();
	}

	return Object.keys(items).length ? items : false;
}

function detectWeb(doc, url) {
	if (recordID(url)) return "book";
	if (url.includes("/search/")) return "multiple";
	return false;
}

function jobID(response) {
	if (typeof response === "string") {
		try {
			response = JSON.parse(response);
		}
		catch (e) {
			throw new Error("BMG: could not parse export response: " + response);
		}
	}

	let id = response && (response.id || response.jobId);

	if (typeof id !== "string"
		|| !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
		throw new Error("BMG: export did not return a job UUID");
	}

	return id;
}

function bmgChecksum(text) {
	text = text.normalize("NFC");
	let n = 305419896;
	for (let i = 0; i < text.length; i++) {
		n += text.charCodeAt(i) * (i + 1);
	}
	return String(n);
}

async function doWeb(doc, url) {
	if (url.includes("/search/")) {
		let items = getSearchResults(doc, false);
		if (!items) return;

		let selected = await Zotero.selectItems(items);
		if (!selected) return;

		for (let selectedURL of Object.keys(selected)) {
			let match = selectedURL.match(/[?&]id=p%3A%3Ausmarcdef_(T[0-9X]+)/i);
			if (!match) continue;

			let id = match[1];
			await importBMGRecord(id, selected[selectedURL]);
		}
		return;
	}

	let id = recordID(url);
	if (!id) throw new Error("BMG: expected an individual record URL");

	let exportTitle = doc.title.replace(
		/\s+-\s+Bibliothèques municipales de la Ville de Genève\s*$/,
		""
	);

	await importBMGRecord(id, exportTitle);
}

async function importBMGRecord(id, exportTitle) {
	let settings = await requestText("/ark:/75245/in/rest/api/settings.js");
	let tokenMatch = /"apiToken"\s*:\s*"([^"]+)"/.exec(settings);
	if (!tokenMatch) throw new Error("BMG: apiToken not found in settings.js");
	let apiToken = tokenMatch[1];

	let exportBody = JSON.stringify({
		aspect: "notice",
		type: "marcxml",
		display: "export",
		ids: ["p::usmarcdef_" + id],
		title: exportTitle,
		queryId: null,
		locale: "en",
		micrositeId: "mainSite"
	});

	let result = await requestText("/in/rest/api/exportInstances", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Accept: "application/json",
			"X-InMedia-Authorization": "Bearer null " + apiToken + " " + bmgChecksum(exportBody),
			"X-Microsite-Id": "mainSite"
		},
		body: exportBody
	});

	let response;
	try {
		response = JSON.parse(result);
	}
	catch (_) {
		response = result.trim();
	}

	let uuid = jobID(response);

	// Poll the export job sequentially, with a short delay between status checks.
	let finished = false;
	for (let attempt = 0; attempt < 30; attempt++) {
		let statusQuery = "?jobId=" + encodeURIComponent(uuid);
		let status = await requestJSON("/in/rest/api/getJobStatus" + statusQuery, {
			headers: {
				"X-InMedia-Authorization": "Bearer null " + apiToken + " " + bmgChecksum(statusQuery),
				"X-Microsite-Id": "mainSite"
			}
		});

		if (!status || status.error) throw new Error("BMG: export job failed");
		if (status.isRunning === false || status.isRunning === "false") {
			finished = true;
			break;
		}
		if (status.isRunning !== true && status.isRunning !== "true") {
			throw new Error("BMG: unrecognized export job status");
		}
		await new Promise(resolve => setTimeout(resolve, 500));
	}

	if (!finished) {
		throw new Error("BMG: export still running after 30 status requests; retry later");
	}

	let xml = await requestText(
		"/in/rest/annotationSVC/getExportFile/" + encodeURIComponent(uuid)
	);

	let item = parseBMG(xml, id);
	await item.complete();
}

function parseBMG(xml, id) {
	let dom = new DOMParser().parseFromString(xml, "text/xml");
	if (dom.getElementsByTagName("parsererror").length) {
		throw new Error("BMG: invalid XML export");
	}

	let records = Array.from(dom.getElementsByTagNameNS(MARC_NS, "record"));
	if (records.length !== 1) {
		throw new Error("BMG: expected exactly one MARCXML record");
	}

	let record = records[0];
	let exportedID = Array.from(record.getElementsByTagNameNS(MARC_NS, "controlfield"))
		.find(field => field.getAttribute("tag") === "002");
	if (exportedID && exportedID.textContent.trim() !== id) {
		throw new Error("BMG: exported record ID does not match requested record");
	}

	let fields = tag => Array.from(record.getElementsByTagNameNS(MARC_NS, "datafield"))
		.filter(field => field.getAttribute("tag") === tag);

	let values = (field, code) => {
		if (!field) {
			return [];
		}

		return Array.from(field.getElementsByTagNameNS(MARC_NS, "subfield"))
			.filter(sub => sub.getAttribute("code") === code)
			.map(sub => sub.textContent
				.replace(/[\u0098\u009c]/g, "")
				.replace(/•<([^>]*)>•/g, "$1")
				.trim())
			.filter(Boolean);
	};

	let value = (tag, code) => fields(tag)
		.flatMap(field => values(field, code))
		.join("; ");

	let format = value("109", "g");
	let itemType = "book";

	if (format === "DVD") {
		itemType = "film";
	}
	else if (format === "ADC") {
		itemType = "audioRecording";
	}

	let item = new Zotero.Item(itemType);

	item.title = value("200", "a");
	let subtitle = value("200", "e");
	if (subtitle) {
		item.title += ": " + subtitle;
	}
	if (!item.title) {
		throw new Error("BMG: missing UNIMARC 200$a title");
	}

	item.ISBN = value("010", "a");
	item.place = value("210", "a");
	item.publisher = value("210", "c");

	let publicationDate = value("210", "d");

	if (itemType === "film") {
		let filmDate = value("300", "a").match(/\bFilm de (\d{4})\b/i);
		item.date = filmDate ? filmDate[1] : publicationDate;
	}
	else if (itemType === "audioRecording") {
		let year = publicationDate.match(/\b(\d{4})\b/);
		item.date = year ? year[1] : publicationDate;
	}
	else {
		item.date = publicationDate;
	}

	item.edition = value("205", "a");
	item.language = value("101", "a");
	item.abstractNote = value("330", "a");

	let seriesStatement = fields("225")
		.map(field => [...values(field, "a"), ...values(field, "i")].join(". "))
		.filter(Boolean)
		.join("; ");

	let setTitle = value("461", "a");
	let setNumber = value("461", "v");

	if (itemType !== "film") {
		if (setTitle && setNumber) {
			item.series = setTitle;
			item.seriesNumber = setNumber;
		}
		else {
			item.series = seriesStatement;
			item.seriesNumber = value("225", "v");
		}
	}

	let extent = value("215", "a");

	if (itemType === "film") {
		if (format === "DVD") {
			item.videoRecordingFormat = "DVD";
		}
	}
	else if (itemType === "audioRecording") {
		let carrier = value("109", "h");
		let audioFormat = value("215", "c");

		if (carrier === "Disque compact") {
			item.audioRecordingFormat = audioFormat === "MP3" ? "CD MP3" : "CD";
		}
	}

	if (itemType === "film" || itemType === "audioRecording") {
		let runningTime = /\b(ca\s+)?(\d+)\s*min\.?/i.exec(extent);
		if (runningTime) {
			item.runningTime = (runningTime[1] || "") + runningTime[2] + " min";
		}
	}
	else {
		let pages = /(?:^|[\s(])(\d+)\s*p(?:\.|ages?\b)/i.exec(extent);
		if (pages) {
			item.numPages = pages[1];
		}
	}

	let extras = [];

	if (itemType === "film" && seriesStatement) {
		extras.push("Series: " + seriesStatement);
		let seriesNumber = value("225", "v");
		if (seriesNumber) {
			extras.push("Series Number: " + seriesNumber);
		}
	}

	let audience = value("333", "a");
	if (audience) {
		extras.push("Public : " + audience);
	}

	if (setTitle && setNumber && seriesStatement) {
		extras.push("Mention de collection : " + seriesStatement);
	}

	if (setTitle && !setNumber) {
		extras.push("Set: " + setTitle);
	}

	let physicalDetails = value("215", "c");

	if (physicalDetails) {
		if (itemType === "film") {
			extras.push("Technical details: " + physicalDetails);
		}
		else if (itemType !== "audioRecording") {
			extras.push("Illustrations: " + physicalDetails);
		}
	}

	let dimensions = value("215", "d");
	if (dimensions && itemType !== "film" && itemType !== "audioRecording") {
		extras.push("Dimensions: " + dimensions);
	}

	let isAudiobook = itemType === "audioRecording"
		&& fields("608").some(field => values(field, "a").includes("LIVRE LU"));

	for (let tag of ["700", "701", "702"]) {
		for (let field of fields(tag)) {
			let surname = values(field, "a").join(" ");
			if (!surname) {
				continue;
			}
			surname = ZU.capitalizeName(surname);

			let role = tag === "702" ? "contributor" : "author";
			let relator = values(field, "4")[0];

			if (isAudiobook && tag === "700") {
				role = "originalCreator";
			}

			if (relator === "730") {
				role = "translator";
			}
			if (relator === "340") {
				role = "editor";
			}
			if (itemType === "film" && relator === "005") {
				role = "castMember";
			}

			if (itemType === "audioRecording") {
				if (relator === "230") {
					role = "composer";
				}
				if (relator === "480") {
					role = "wordsBy";
				}
				if (["250", "545", "550", "721"].includes(relator)) {
					role = "performer";
				}
			}

			let given = values(field, "b").join(" ");

			if (relator === "440") {
				extras.unshift("Illustrator: " + surname + (given ? " || " + given : ""));
			}
			else {
				item.creators.push({
					firstName: given,
					lastName: surname,
					creatorType: role
				});
			}
		}
	}

	if (itemType === "audioRecording") {
		for (let field of fields("712")) {
			let name = values(field, "a").join(" ");
			let subdivision = values(field, "b").join(" ");
			let place = values(field, "c").join(" ");

			if (!name) {
				continue;
			}

			if (subdivision) {
				name += ". " + subdivision;
			}
			if (place) {
				name += " (" + place + ")";
			}

			item.creators.push({
				lastName: name,
				fieldMode: 1,
				creatorType: "performer"
			});
		}
	}

	item.extra = extras.join("\n");

	if (
		itemType === "book"
		&& !item.creators.some(creator => creator.creatorType === "author")
		&& value("200", "f")
	) {
		item.creators.push(ZU.cleanAuthor(value("200", "f"), "author"));
	}

	for (let tag of ["600", "601", "602", "604", "605", "606", "607", "608", "610"]) {
		for (let field of fields(tag)) {
			let heading = values(field, "a").join(" ");
			let given = values(field, "b").join(" ");

			if (given) {
				heading += ", " + given;
			}

			let divisions = ["j", "x", "y", "z"].flatMap(code => values(field, code));
			if (divisions.length) {
				heading += " -- " + divisions.join(" -- ");
			}

			if (heading) {
				item.tags.push({ tag: heading });
			}
		}
	}

	item.url = "https://www.bm-geneve.ch/ark:/75245/ca" + id;
	item.libraryCatalog = "Bibliothèques municipales de Genève";

	return item;
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.bm-geneve.ch/ark:/75245/caT007557919?posInSet=1&queryId=994c1c8a-fa5c-4748-a2ea-fd1bb4d8c702",
		"items": [
			{
				"itemType": "book",
				"title": "Tous à cheval",
				"creators": [
					{
						"firstName": "Timo",
						"lastName": "Parvela",
						"creatorType": "author"
					},
					{
						"firstName": "Johanna",
						"lastName": "Kuningas",
						"creatorType": "translator"
					}
				],
				"date": "2023",
				"ISBN": "9782092595985",
				"abstractNote": "Pour impressionner sa nouvelle voisine, Toni emprunte un cheval dans un centre équestre mais l'animal s'enfuit. Heureusement, il peut compter sur ses amis pour l'aider à le retrouver. ©Electre 2023",
				"extra": "Illustrator: Zonk || Zelda\nPublic : A partir de 8 ans\nMention de collection : Nathan poche. Premiers romans\nIllustrations: illustrations en noir et en couleur\nDimensions: 19 x 15 cm",
				"language": "fre",
				"libraryCatalog": "Bibliothèques municipales de Genève",
				"numPages": "152",
				"place": "Paris",
				"publisher": "Nathan",
				"series": "Moi et ma super bande",
				"seriesNumber": "15",
				"url": "https://www.bm-geneve.ch/ark:/75245/caT007557919",
				"attachments": [],
				"tags": [
					{
						"tag": "ROMAN FINNOIS"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.bm-geneve.ch/ark:/75245/caT006624946?posInSet=1&queryId=baf9bcbd-3d28-4d04-ae7a-5141eeedb564",
		"detectedItemType": "book",
		"items": [
			{
				"itemType": "film",
				"title": "Place publique",
				"creators": [
					{
						"firstName": "Agnès",
						"lastName": "Jaoui",
						"creatorType": "author"
					},
					{
						"firstName": "Jean-Pierre",
						"lastName": "Bacri",
						"creatorType": "castMember"
					},
					{
						"firstName": "Agnès",
						"lastName": "Jaoui",
						"creatorType": "castMember"
					},
					{
						"firstName": "Léa",
						"lastName": "Drucker",
						"creatorType": "castMember"
					}
				],
				"date": "2018",
				"abstractNote": "Castro, autrefois star du petit écran, est à présent un animateur sur le déclin. Aujourd’hui, son chauffeur, Manu, le conduit à la pendaison de crémaillère de sa productrice et amie de longue date, Nathalie, qui a emménagé dans une belle maison près de Paris. Hélène, soeur de Nathalie et ex-femme de Castro, est elle aussi invitée. Quand ils étaient jeunes, ils partageaient les mêmes idéaux mais le succès a converti Castro au pragmatisme (ou plutôt au cynisme) tandis qu’Hélène est restée fidèle à ses convictions. Leur fille, Nina, qui a écrit un livre librement inspiré de la vie de ses parents, se joint à eux. Alors que Castro assiste, impuissant, à la chute inexorable de son audimat, Hélène tente désespérément d’imposer dans son émission une réfugiée afghane. Pendant ce temps, la fête bat son plein",
				"distributor": "Frenetic",
				"extra": "Public : Age suggéré : 16 ans\nTechnical details: 16/9, son surround",
				"language": "fre",
				"libraryCatalog": "Bibliothèques municipales de Genève",
				"place": "[S.l.]",
				"runningTime": "98 min",
				"url": "https://www.bm-geneve.ch/ark:/75245/caT006624946",
				"videoRecordingFormat": "DVD",
				"attachments": [],
				"tags": [
					{
						"tag": "CINEMA FRANCAIS -- 21e s. -- 2010-2020"
					},
					{
						"tag": "COMEDIE -- cinéma"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.bm-geneve.ch/ark:/75245/caT006987035?posInSet=6&queryId=d365cd27-aff7-4516-8eee-6dd33f97ae5b",
		"detectedItemType": "book",
		"items": [
			{
				"itemType": "audioRecording",
				"title": "La cerise sur le gâteau",
				"creators": [
					{
						"firstName": "Jean-Philippe",
						"lastName": "Arrou-Vignod",
						"creatorType": "originalCreator"
					},
					{
						"firstName": "Laurent",
						"lastName": "Stocker",
						"creatorType": "performer"
					}
				],
				"date": "2020",
				"abstractNote": "Rien n'est simple dans cette famille de six garçons. Les grands, Jean-A. et Jean-B., entrent dans l'adolescence et sont absorbés par la découverte des filles. Leurs parents expédient Jean-A. en Angleterre pour un séjour linguistique et Jean-B. est inscrit de force aux scouts marins. Mais Jean-A. ne s'intéresse qu'à la musique pop et Jean-B. tombe amoureux",
				"audioRecordingFormat": "CD MP3",
				"extra": "Public : Age suggéré : 10 ans\nSet: Histoires des Jean-Quelque-Chose",
				"label": "Gallimard-Jeunesse",
				"language": "fre",
				"libraryCatalog": "Bibliothèques municipales de Genève",
				"place": "[Paris]",
				"runningTime": "ca 150 min",
				"url": "https://www.bm-geneve.ch/ark:/75245/caT006987035",
				"attachments": [],
				"tags": [
					{
						"tag": "LIVRE LU"
					},
					{
						"tag": "ROMAN FRANCAIS"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.bm-geneve.ch/ark:/75245/caT004965399?posInSet=1&queryId=9942ae9f-d66e-494a-b9c9-c6a67c2cb719",
		"detectedItemType": "book",
		"items": [
			{
				"itemType": "audioRecording",
				"title": "The marriage of Figaro: opéra en quatre actes",
				"creators": [
					{
						"firstName": "Wolfgang Amadeus",
						"lastName": "Mozart",
						"creatorType": "composer"
					},
					{
						"firstName": "Lorenzo",
						"lastName": "Da Ponte",
						"creatorType": "wordsBy"
					},
					{
						"firstName": "José van",
						"lastName": "Dam",
						"creatorType": "performer"
					},
					{
						"firstName": "Tom",
						"lastName": "Krause",
						"creatorType": "performer"
					},
					{
						"firstName": "Elizabeth",
						"lastName": "Harwood",
						"creatorType": "performer"
					},
					{
						"firstName": "Mirella",
						"lastName": "Freni",
						"creatorType": "performer"
					},
					{
						"firstName": "Frederica von",
						"lastName": "Stade",
						"creatorType": "performer"
					},
					{
						"firstName": "Paolo",
						"lastName": "Montarsolo",
						"creatorType": "performer"
					},
					{
						"firstName": "Herbert von",
						"lastName": "Karajan",
						"creatorType": "performer"
					},
					{
						"lastName": "Staatsoper. Chor (Wien)",
						"fieldMode": 1,
						"creatorType": "performer"
					},
					{
						"lastName": "Wiener Philharmoniker",
						"fieldMode": 1,
						"creatorType": "performer"
					}
				],
				"date": "2005",
				"audioRecordingFormat": "CD",
				"label": "Allegro",
				"language": "ita",
				"libraryCatalog": "Bibliothèques municipales de Genève",
				"place": "[S.l.]",
				"shortTitle": "The marriage of Figaro",
				"url": "https://www.bm-geneve.ch/ark:/75245/caT004965399",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
