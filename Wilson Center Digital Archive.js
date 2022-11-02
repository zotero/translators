{
	"translatorID": "c4b00da8-420d-4029-9286-0afd766991c1",
	"label": "Wilson Center Digital Archive",
	"creator": "Abe Jellinek",
	"target": "^https?://digitalarchive\\.wilsoncenter\\.org/(document|search-results)/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-05-11 21:19:38"
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


async function detectWeb(doc, url) {
	if (url.includes('/document/')) {
		return 'manuscript';
	}
	else if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.search-res li');
	for (let row of rows) {
		let href = attr(row, '.lnk-res', 'href');
		let title = ZU.trimInternal(text(row, '.itm-title'));
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
					.map(url => requestDocument(url).then(scrape))
			);
		}
	}
	else {
		await scrape(doc, url);
	}
}

async function scrape(doc, url = doc.location.href) {
	let risURL = url.replace(/[?#].*$/, '') + '.ris';
	let risText = await requestText(risURL);
	let translator = Zotero.loadTranslator('import');
	translator.setTranslator('32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7'); // RIS
	translator.setString(risText);
	translator.setHandler('itemDone', (_obj, item) => {
		if (item.abstractNote) {
			item.abstractNote = ZU.unescapeHTML(item.abstractNote);
		}

		if (!item.manuscriptType) {
			for (let h4 of doc.querySelectorAll('.doc-inf-information h4')) {
				if (h4.textContent.includes('Type')) {
					item.manuscriptType = h4.nextElementSibling.textContent;
				}
			}
		}

		for (let subject of doc.querySelectorAll('#subj-list li')) {
			item.tags.push({ tag: subject.textContent });
		}

		let pdfURL = attr(doc, 'a.down[href*=".pdf"]', 'href');
		if (pdfURL) {
			item.attachments.push({
				title: 'Full Text PDF',
				mimeType: 'application/pdf',
				url: pdfURL
			});
		}

		for (let creator of item.creators) {
			if (creator.firstName && creator.firstName.includes(',')) {
				creator.firstName = creator.firstName.split(',')[0];
			}
		}

		item.complete();
	});
	await translator.translate();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://digitalarchive.wilsoncenter.org/document/280697",
		"items": [
			{
				"itemType": "manuscript",
				"title": "Letter to the Deputy Chairman of the Soviet Committee of the MGG, Prof. Pushkov",
				"creators": [],
				"date": "1958",
				"archive": "History and Public Policy Program Digital Archive",
				"archiveLocation": "RGANI, f. 5, op. 49, d. 131, ll. 193-194. Translated by Gary Goldberg.",
				"language": "Russian",
				"libraryCatalog": "Woodrow Wilson International Center for Scholars",
				"url": "https://digitalarchive.wilsoncenter.org/document/280697",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "China--Foreign relations--Soviet Union"
					},
					{
						"tag": "China--Foreign relations--Taiwan"
					},
					{
						"tag": "Taiwan--Foreign relations--United States"
					},
					{
						"tag": "Taiwan--International status"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://digitalarchive.wilsoncenter.org/document/209833",
		"items": [
			{
				"itemType": "manuscript",
				"title": "Djilas's First Conversation with Stalin",
				"creators": [
					{
						"lastName": "Djilas",
						"firstName": "Milovan",
						"creatorType": "author"
					},
					{
						"lastName": "Stalin",
						"firstName": "Joseph",
						"creatorType": "author"
					},
					{
						"lastName": "Molotov",
						"firstName": "Vyacheslav Mikhaylovich",
						"creatorType": "author"
					}
				],
				"date": "1944-05-19",
				"abstractNote": "Milovan Djilas recounts his first meeting and impressions of Stalin and discuss wartime matters.",
				"archive": "History and Public Policy Program Digital Archive",
				"archiveLocation": "Milovan Djilas. Wartime. Translated by Michael B. Petrovich. (New York: Harcourt Brace Jovanovich, 1977), 385-387.",
				"language": "English",
				"libraryCatalog": "Woodrow Wilson International Center for Scholars",
				"url": "https://digitalarchive.wilsoncenter.org/document/209833",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Soviet Union--Foreign relations--Yugoslavia"
					},
					{
						"tag": "World War, 1939-1945--Yugoslavia"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://digitalarchive.wilsoncenter.org/document/121893",
		"items": [
			{
				"itemType": "manuscript",
				"title": "Report of the Hungarian Ministry of Foreign Affairs [F. Somogyi] for the Council of Ministers about the Meeting of the leaders of the Warsaw Pact on 4 December",
				"creators": [
					{
						"lastName": "Somogyi",
						"firstName": "Ferenc",
						"creatorType": "author"
					}
				],
				"date": "1989-12-06",
				"abstractNote": "Summary of the meeting of the leaders of the Warsaw Pact. The document is not signed, but it is highly likely it was authorized by Ferenc Somogyi, Deputy Minister of the Hungarian Ministry of Foreign Affairs, who was present at the meeting in Moscow.",
				"archive": "History and Public Policy Program Digital Archive",
				"archiveLocation": "Obtained by Béla Révész; translated and edited by Barnabás Vajd, Laura Deal, and Karl P. Benziger.",
				"language": "Hungarian",
				"libraryCatalog": "Woodrow Wilson International Center for Scholars",
				"manuscriptType": "Report",
				"url": "https://digitalarchive.wilsoncenter.org/document/121893",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Bush, George, 1924-"
					},
					{
						"tag": "Catholic Church"
					},
					{
						"tag": "Gorbachev, Mikhail Sergeevich, 1931-"
					},
					{
						"tag": "John Paul II, Pope, 1920-2005"
					},
					{
						"tag": "Perestroika"
					},
					{
						"tag": "Soviet Union--Foreign relations--United States"
					},
					{
						"tag": "Soviet Union--Foreign relations--Vatican City"
					},
					{
						"tag": "Soviet Union--Religion"
					},
					{
						"tag": "Summit meetings--Malta"
					},
					{
						"tag": "Warsaw Treaty Organization"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://digitalarchive.wilsoncenter.org/search-results/1/%7B%22search-in%22%3A%22all%22%2C%22term%22%3A%22test%22%7D?recordType=Record",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://digitalarchive.wilsoncenter.org/document/134696",
		"items": [
			{
				"itemType": "manuscript",
				"title": "TASS Digest Distributed to Cde. I.V. Stalin and Cde. C.M. Molotov, 'The Anti-Soviet Fabrications of a Mexican Newspaper; Etc.'",
				"creators": [
					{
						"lastName": "Telegraph Agency of the Soviet Union (TASS)",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "1945-10-16",
				"abstractNote": "Summary of news reports from Mexico, Sweden, Canada, and Great Britain, most on Stalin's alleged illness.",
				"archive": "History and Public Policy Program Digital Archive",
				"archiveLocation": "RGASPI, f. 558, op. 11, d. 97, ll. 67-70. Contributed by Sergey Radchenko and translated by Gary Goldberg.",
				"language": "Russian",
				"libraryCatalog": "Woodrow Wilson International Center for Scholars",
				"url": "https://digitalarchive.wilsoncenter.org/document/134696",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Stalin, Joseph, 1879-1953"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
