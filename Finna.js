{
	"translatorID": "808e29ab-620a-407a-b706-acae6c2c7ad7",
	"label": "Finna",
	"creator": "Abe Jellinek",
	"target": "^https?://([^/]+\\.)?finna\\.fi/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 150,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-08-04 20:33:47"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2021 Abe Jellinek
	
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
	if (url.includes('/Record/')) {
		let format = doc.querySelector('.recordFormat span').className;
		if (format.includes('video')) {
			return "videoRecording";
		}
		else if (format.includes('sound')) {
			return "audioRecording";
		}
		else if (format.includes('journalarticle')) {
			return "journalArticle";
		}
		else if (format.includes('thesis')) {
			return "thesis";
		}
		else {
			return "book";
		}
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('h2 > a.title[href*="/Record/"]');
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(row.textContent)
			.replace(/Show detailed view|Näytä tarkat tiedot|Visa detaljrik vy/, '');
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (items) {
				for (let url of Object.keys(items)) {
					scrapeMARC(url);
				}
			}
		});
	}
	else {
		scrapeMARC(url);
	}
}

function scrapeMARC(url) {
	let cleanURL = url.replace(/[#?].*$/, '').replace(/\/$/, '');
	let marcURL = cleanURL + '/Export?style=MARC';
	
	// would like to pass all the URLs at once as an array here, but it makes
	// the RIS fallback difficult.
	ZU.doGet(marcURL, function (marcData) {
		var success = false;
		
		var translator = Zotero.loadTranslator("import");
		// MARC
		translator.setTranslator("a6ee60df-1ddc-4aae-bb25-45e0537be973");
		translator.setString(marcData);
		
		translator.setHandler('itemDone', function (_, item) {
			if (item.place) {
				item.place = item.place.replace(/\[[^[]+\]/, '');
			}
			
			if (item.publisher) {
				item.publisher = item.publisher.replace(/&amp;/g, '&');
			}
			
			success = true;
			item.complete();
		});
		
		translator.setHandler('done', function (_) {
			if (!success) {
				Z.debug('Falling back to RIS.');
				scrapeRIS(cleanURL);
			}
		});
		
		translator.translate();
	});
}

function scrapeRIS(cleanURL) {
	let risURL = cleanURL + '/Export?style=RIS';
	
	ZU.doGet(risURL, function (text) {
		var translator = Zotero.loadTranslator("import");
		// RIS
		translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
		translator.setString(text);
		translator.setHandler("itemDone", function (obj, item) {
			item.complete();
		});
		translator.translate();
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://kansalliskirjasto.finna.fi/Record/fikka.3295274",
		"items": [
			{
				"itemType": "book",
				"title": "Test pilot",
				"creators": [
					{
						"firstName": "Leonard",
						"lastName": "Sealey",
						"creatorType": "author"
					}
				],
				"date": "1977",
				"ISBN": "9789511044376",
				"callNumber": "Ga 1973- Ga 1973- Ga 1973-",
				"language": "eng fin",
				"libraryCatalog": "Finna",
				"numPages": "16",
				"place": "Helsingissä",
				"publisher": "Otava",
				"series": "Lively readers",
				"seriesNumber": "4",
				"attachments": [],
				"tags": [],
				"notes": [
					{
						"note": "Finnish vocabulary comp. by Anneli Aarikka"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://kansalliskirjasto.finna.fi/Record/doria.10024_82096",
		"items": [
			{
				"itemType": "book",
				"title": "Goodrich \"High-test\" konehihnat",
				"creators": [
					{
						"lastName": "Auto-Vulcano",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"language": "fin",
				"libraryCatalog": "Finna",
				"url": "http://www.doria.fi/handle/10024/82096",
				"attachments": [],
				"tags": [
					{
						"tag": "Goodrich (tavaramerkki)"
					},
					{
						"tag": "Moottoriajoneuvojen esitteet ja hinnastot"
					},
					{
						"tag": "hinnastot"
					},
					{
						"tag": "moottoriajoneuvot"
					},
					{
						"tag": "tavaramerkit"
					},
					{
						"tag": "tieliikenne"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://kirkes.finna.fi/Record/kirkes.252925",
		"items": [
			{
				"itemType": "book",
				"title": "Suomen maatalouden historia: jälleenrakennuskaudesta EU-Suomeen. 3: Suurten muutosten aika",
				"creators": [
					{
						"firstName": "Pirjo",
						"lastName": "Markkola",
						"creatorType": "editor"
					},
					{
						"firstName": "Viljo",
						"lastName": "Rasila",
						"creatorType": "editor"
					}
				],
				"date": "2004",
				"ISBN": "9789517464833 9789517464802",
				"abstractNote": "Summary: Overwiew of tghe history of finnish agriculture - from prehistory to the 21st century / Viljo Rasila",
				"callNumber": "67.09",
				"language": "fin",
				"libraryCatalog": "Finna",
				"numPages": "518",
				"place": "Helsinki",
				"publisher": "Suomalaisen Kirjallisuuden Seura",
				"series": "Suomalaisen Kirjallisuuden Seuran toimituksia",
				"seriesNumber": "914:3",
				"shortTitle": "Suomen maatalouden historia",
				"attachments": [],
				"tags": [
					{
						"tag": "1870-1950-luku"
					},
					{
						"tag": "1940-2000-luku"
					},
					{
						"tag": "Euroopan Unioni"
					},
					{
						"tag": "Euroopan unioni"
					},
					{
						"tag": "Eurooppa"
					},
					{
						"tag": "Suomi"
					},
					{
						"tag": "asutustoiminta"
					},
					{
						"tag": "historia"
					},
					{
						"tag": "integraatio"
					},
					{
						"tag": "jälleenrakentaminen"
					},
					{
						"tag": "karjatalous"
					},
					{
						"tag": "kasvu"
					},
					{
						"tag": "luonnonmukainen tuotanto"
					},
					{
						"tag": "maaltamuutto"
					},
					{
						"tag": "maaseutu"
					},
					{
						"tag": "maatalous"
					},
					{
						"tag": "maatalous"
					},
					{
						"tag": "maatalouspolitiikka"
					},
					{
						"tag": "maatalousteknologia"
					},
					{
						"tag": "maataloustuotanto"
					},
					{
						"tag": "maataloustyö"
					},
					{
						"tag": "osuustoiminta"
					},
					{
						"tag": "rakennemuutos"
					},
					{
						"tag": "taloushistoria"
					},
					{
						"tag": "tukimuodot"
					}
				],
				"notes": [
					{
						"note": "S. 490-507: Overview of the Finnish agriculture / Viljo Rasila"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://blanka.finna.fi/Search/Results?sort=main_date_str+desc&limit=0&filter%5B%5D=first_indexed%3A%22%5BNOW-1MONTHS%2FDAY+TO+%2A%5D%22&filter%5B%5D=%7Eformat%3A%220%2FBook%2F%22&filter%5B%5D=%7Eformat%3A%220%2FOther%2F%22&filter%5B%5D=%7Eformat%3A%220%2FSound%2F%22&filter%5B%5D=%7Eformat%3A%220%2FVideo%2F%22&filter%5B%5D=%7Eformat%3A%220%2FMusicalScore%2F%22&type=AllFields",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://finna.fi/Search/Results?lookfor=test&type=AllFields",
		"items": "multiple"
	}
]
/** END TEST CASES **/
