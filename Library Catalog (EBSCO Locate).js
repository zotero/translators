{
	"translatorID": "86c090c5-ad3f-4c54-a1f3-9870942014ac",
	"label": "Library Catalog (EBSCO Locate)",
	"creator": "Sebastian Karcher and Abe Jellinek",
	"target": "/search\\?|/instances/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 260,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-10-16 15:04:23"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2025 Sebastian Karcher and Abe Jellinek

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

function detectWeb(doc, url) {
	if (attr(doc, 'meta[name="description"]', 'content') !== 'EBSCO Locate') {
		return false;
	}
	if (getRecordID(url)) {
		let type = text(doc, 'div[class*="__metadata-type"]');
		switch (type) {
			case "Book":
				return "book";
			case "Cartographic Material":
				return "map";
			case "Audio":
				return "audioRecording";
			case "Video":
			case "Films, Videos":
				return "videoRecording";
			case "Image":
				return "artwork";
			case "Archive/Manuscript":
			case "Textual Manuscript":
				return "manuscript";
			default:
				return "book";
		}
	}
	else if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('h2 > a[href*="/instances/"]');
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

function getRecordID(url) {
	return new URL(url).pathname.match(/\/instances\/([^/]+)/)?.[1];
}

async function getAPIParams(doc) {
	let scriptURL = attr(doc, 'script[type="module"][src*="/index-"]', 'src');
	if (!scriptURL) return null;
	let scriptText = await requestText(scriptURL);
	let matches = scriptText.match(/baseURL:("[^"]+").+"X-Okapi-Tenant":("[^"]+")/);
	if (!matches) return null;
	let [, baseURL, okapiTenant] = matches;
	return {
		baseURL: JSON.parse(baseURL),
		okapiTenant: JSON.parse(okapiTenant),
	};
}

async function doWeb(doc, url) {
	let apiParams = await getAPIParams(doc);
	if (!apiParams) {
		throw new Error('Unable to generate API params');
	}

	if (detectWeb(doc, url) == 'multiple') {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (!items) return;
		for (let url of Object.keys(items)) {
			await scrape(url, apiParams);
		}
	}
	else {
		await scrape(url, apiParams);
	}
}

async function scrape(url, { baseURL, okapiTenant }) {
	let recordID = getRecordID(url);

	let marcURL = `${baseURL}/opac-inventory/download-instance/${recordID}?utf=true`;
	let headers = {
		Accept: 'application/json',
		'X-Okapi-Tenant': okapiTenant
	};
	
	let marcText;
	let marcRecordJSON;
	
	try {
		marcText = await requestText(marcURL, { headers });
	}
	catch {
		Z.debug('Instance requires X-Okapi-Token - getting one');
		let guestTokenURL = `${baseURL}/opac-auth/guest-token`;
		let guestTokenResponse = await request(guestTokenURL, { headers });
		Z.debug(guestTokenResponse.headers)
		headers['x-okapi-token'] = guestTokenResponse.headers['x-okapi-token'];
		Z.debug('New headers:');
		Z.debug(headers);

		try {
			marcText = await requestText(marcURL, { headers });
		}
		catch {
			Z.debug('Instance disallows MARC downloads - parsing MARC from record JSON');
			let recordURL = `${baseURL}/opac-inventory/source-records/${recordID}`;
			let recordJSON = await requestJSON(recordURL, { headers });
			marcRecordJSON = recordJSON.parsedRecord.content;
		}
	}

	let translate = Zotero.loadTranslator('import');
	translate.setTranslator('a6ee60df-1ddc-4aae-bb25-45e0537be973'); // MARC
	let item;
	if (marcText) {
		translate.setString(marcText);
		translate.setHandler('itemDone', () => {});
		[item] = await translate.translate();
	}
	else if (marcRecordJSON) {
		let marc = await translate.getTranslatorObject();
		let record = new marc.record();
		record.leader = marcRecordJSON.leader;

		let fields = marcRecordJSON.fields.map(obj => Object.entries(obj)[0]);
		for (let [field, value] of fields) {
			if (typeof value === 'string') {
				record.addField(field, '  ', value);
			}
			else {
				let { ind1, ind2, subfields } = value;
				let joinedSubfields = subfields
					.map(obj => Object.entries(obj)[0])
					.map(([subfield, value]) => marc.subfieldDelimiter + subfield + value)
					.join('');
				record.addField(field, ind1 + ind2, joinedSubfields);
			}
		}

		item = new Zotero.Item();
		record.translate(item);
	}
	else {
		throw new Error('No record available');
	}
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://search.catalog.loc.gov/instances/5f9c256e-151d-5615-ad15-3d2749318cac?option=keyword&query=karcher",
		"items": [
			{
				"itemType": "book",
				"title": "Praxis des Beton- und Stahlbetonbaus: Wissensgrundlagen für die Baustelle und das Ingenieurbüro",
				"creators": [
					{
						"firstName": "Gustav",
						"lastName": "Kärcher",
						"creatorType": "author"
					}
				],
				"date": "1952",
				"callNumber": "TA681 .K25",
				"libraryCatalog": "Library Catalog (EBSCO Locate)",
				"numPages": "200",
				"place": "Stuttgart",
				"publisher": "Franckh",
				"shortTitle": "Praxis des Beton- und Stahlbetonbaus",
				"attachments": [],
				"tags": [
					{
						"tag": "Concrete construction"
					},
					{
						"tag": "Reinforced concrete construction"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://search.catalog.loc.gov/search?option=keyword&pageNumber=1&query=karcher&recordsPerPage=25",
		"defer": true,
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://usu.locate.ebsco.com/instances/b7dbef48-705a-5c2e-96f6-cf44ab7d3bae?option=keyword&pageNumber=1&query=test&recordsPerPage=25",
		"items": [
			{
				"itemType": "book",
				"title": "How to pass armed forces tests",
				"creators": [
					{
						"lastName": "College Publishing Corporation, Brooklyn",
						"creatorType": "editor",
						"fieldMode": 1
					}
				],
				"date": "1967",
				"callNumber": "UB336 .C64",
				"extra": "OCLC: 00712430",
				"libraryCatalog": "Library Catalog (EBSCO Locate)",
				"numPages": "244",
				"place": "New York",
				"publisher": "College Publishing Corporation",
				"series": "Score-high exam book",
				"seriesNumber": "102",
				"attachments": [],
				"tags": [
					{
						"tag": "Armed Forces Examinations"
					},
					{
						"tag": "United States"
					}
				],
				"notes": [
					{
						"note": "\"A Cowles educational book.\""
					},
					{
						"note": "The self test -- The time test -- The pressure test -- The distraction test -- The lot test -- The test of being misunderstood -- The confrontation test -- The money test -- The disappointment test -- The offense test -- The gratitude test -- The perfect storm"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://usu.locate.ebsco.com/search?option=keyword&pageNumber=1&query=test&recordsPerPage=25",
		"defer": true,
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://nalis.locate.ebsco.com/instances/0cf96b8b-80ee-5c06-94bf-23240ee6b0ef?option=keyword&pageNumber=1&query=dracula&recordsPerPage=25",
		"items": [
			{
				"itemType": "book",
				"title": "Dracula and Frankenstein are friends",
				"creators": [
					{
						"firstName": "Katherine Brown",
						"lastName": "Tegen",
						"creatorType": "author"
					},
					{
						"firstName": "Doug",
						"lastName": "Cushman",
						"creatorType": "author"
					}
				],
				"date": "2003",
				"ISBN": "9780060001155 9780060001162",
				"abstractNote": "Dracula and Frankenstein are friends until they both decide to have a Halloween party and Dracula misplaces Frankenstein's invitations",
				"edition": "1st ed",
				"libraryCatalog": "Library Catalog (EBSCO Locate)",
				"numPages": "1",
				"place": "New York",
				"publisher": "HarperCollins",
				"attachments": [],
				"tags": [
					{
						"tag": "Fiction"
					},
					{
						"tag": "Fiction"
					},
					{
						"tag": "Fiction"
					},
					{
						"tag": "Fiction"
					},
					{
						"tag": "Friendship"
					},
					{
						"tag": "Halloween"
					},
					{
						"tag": "Monsters"
					},
					{
						"tag": "Parties"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://nalis.locate.ebsco.com/search?option=keyword&pageNumber=1&query=dracula&recordsPerPage=25",
		"defer": true,
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://covenant.searchmobius.org/instances/2eabe9c2-d8c7-5bf1-87f5-cb9dc47b70ea",
		"items": [
			{
				"itemType": "book",
				"title": "The Oxford annotated Mishnah: a new translation of the Mishnah with introductions and notes",
				"creators": [
					{
						"firstName": "Shaye J. D.",
						"lastName": "Cohen",
						"creatorType": "editor"
					},
					{
						"firstName": "Robert",
						"lastName": "Goldenberg",
						"creatorType": "editor"
					},
					{
						"firstName": "Hayim",
						"lastName": "Lapin",
						"creatorType": "editor"
					}
				],
				"date": "2023",
				"ISBN": "9780198894186 9780198894193 9780198894209 9780198894216",
				"abstractNote": "\"The Mishnah is the foundational document of rabbinic law and, one could say, of rabbinic Judaism itself. It is overwhelmingly technical and focused on matters of practice, custom, and law. The Oxford Annotated Mishnah is the first annotated translation of this work, making the text accessible to all. With explanations of all technical terms and expressions, The Oxford Annotated Mishnah brings together an expert group of translators and annotators to assemble a version of the Mishnah that requires no specialist knowledge.\"",
				"callNumber": "BM497.5.E5 O946 2023",
				"extra": "OCLC: 1406341265",
				"language": "eng",
				"libraryCatalog": "Library Catalog (EBSCO Locate)",
				"numPages": "3",
				"place": "Oxford, United Kingdom ; New York, NY",
				"publisher": "Oxford University Press",
				"shortTitle": "The Oxford annotated Mishnah",
				"attachments": [],
				"tags": [
					{
						"tag": "Commentaries"
					},
					{
						"tag": "Commentaries"
					},
					{
						"tag": "Commentaries"
					},
					{
						"tag": "Droit juif"
					},
					{
						"tag": "Jewish law"
					},
					{
						"tag": "Jewish law"
					},
					{
						"tag": "Mishnah"
					},
					{
						"tag": "Mishnah"
					},
					{
						"tag": "Mishnah"
					},
					{
						"tag": "Mishnah"
					},
					{
						"tag": "Versions"
					},
					{
						"tag": "commentaries"
					}
				],
				"notes": [
					{
						"note": "First published 2022 in hardcover Third volume includes indexes"
					},
					{
						"note": "Shaye J.D. Cohen and Hayim Lapin -- Richard S. Sarason -- Gregg E. Gardner -- Richard S. Sarason -- Michael Rosenberg -- Yair Furstenberg -- William Friedman and Matthew Hass -- Joshua Kulp -- Joshua Kulp -- Joshua Kulp -- Joshua Kulp -- Naftali S. Cohn. -- Shaye J.D. Cohen -- Charlotte Elisheva Fonrobert -- Jonathan Klawans -- Miriam-Simma Walfish -- Yonatan S. Miller -- Jeffrey L. Rubenstein -- Judith Hauptman -- Steven D. Fraade -- David Levine -- Alyssa Gray -- Gail Labovitz -- Michal Bar-Asher Siegal. -- Introduction / The Mishnah. ORDER OF ZERA'IM. Tractate Berakhot / Tractate Pe'ah / Tractate Demai / Tractate Kilayim / Tractate Shevi'it / Tractate Terumot / Tractate Ma'aserot / Tractate Ma'aser Sheni / Tractate Hallah / Tractate Orlah / Tractate Bikkurim / ORDER OF MO'ED. Tractate Shabbat / Tractate Eruvin / Tractate Pesahim / Tractate Sheqalim / Tractate Yoma / Tractate Sukkah / Tractate Betsah / Tractate Rosh Hashanah / Tractate Ta'anit / Tractate Megillah / Tractate Mo'ed Qatan / Tractate Hagigah Tal Ilan -- Robert Brody -- Robert Goldenberg -- Robert Goldenberg -- Ishay Rosen-Zvi and Orr Scharf -- David Brodsky -- Gail Labovitz. -- Hayim Lapin -- Hayim Lapin -- Hayim Lapin -- Beth Berkowitz -- David C. Flatto -- Elizabeth Shanks Alexander -- Shaye J.D. Cohen -- Christine Hayes -- Martin S. Jaffee -- Alyssa Gray. -- ORDER OF NASHIM. Tractate Yevamot / Tractate Ketubbot / Tractate Nedarim / Tractate Nazir / Tractate Sotah / Tractate Gittin / Tractate Qiddushin / ORDER OF NEZIQIN. Tractate Bava Qamma / Tractate Bava Metsi'a / Tractate Bava Batra / Tractate Sanhedrin / Tractate Makkot / Tractate Shevu'ot / Tractate Eduyot / Tractate Avodah Zarah / Tractate Avot / Tractate Horayot Aryeh Cohen -- Dvora Weisberg -- Jordan D. Rosenblum -- Chaya Halberstam -- Jonah Steinberg -- Tzvi Novick -- Moulie Vidas -- Sarra Lev -- Naftali S. Cohn -- Naftali S. Cohn -- Dalia Marx. -- Michael Chernick -- Yehudah Cohn -- Mira Balberg -- Marcus Mordecai Schwartz -- Yair Furstenberg -- Yonatan Adler -- Charlotte Elisheva Fonrobert -- Hannah Harrington -- Shlomo Zuckier -- David Levine -- Leib Moscovitz -- Richard Hidary. -- ORDER OF QODASHIM. Tractate Zevahim / Tractate Menahot / Tractate Hullin / Tractate Bekhorot / Tractate Arakhin / Tractate Temurah / Tractate Keritot / Tractate Me'ilah / Tractate Tamid / Tractate Middot / Tractate Qinnim / ORDER OF TOHOROT. Tractate Kelim / Tractate Oholot / Tractate Nega'im / Tractate Parah / Tractate Tohorot / Tractate Miqva'ot / Tractate Niddah / Tractate Makhshirin / Tractate Zavim / Tractate Tevul Yom / Tractate Yadayim / Tractate Uqtsin / Appendix: Money, weights, and measures -- Glossary of untranslated Hebrew terms -- Index of Biblical passages -- Index of names and subjects"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://covenant.searchmobius.org/search?option=keyword&pageNumber=1&query=robert%20alter&recordsPerPage=25",
		"defer": true,
		"items": "multiple"
	}
]
/** END TEST CASES **/
