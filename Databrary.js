{
	"translatorID": "45ece855-7303-41d2-8c9f-1151f684943c",
	"label": "Databrary",
	"creator": "Sebastian Karcher",
	"target": "^https?://nyu\\.databrary\\.org/(volume|search)",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-04-19 16:49:05"
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


const datasetType = ZU.fieldIsValidForType('title', 'dataset')
	? 'dataset'
	: 'document';

function detectWeb(doc, url) {
	if (url.includes('/volume/')) {
		return datasetType;
	}
	else if (url.includes("/search?q=")) {
		Z.monitorDOMChanges(doc.querySelector('body'));
		if (getSearchResults(doc, true)) return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('h3.search-volume-result-title>a');
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
	if (detectWeb(doc, url) == 'multiple') {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (!items) return;
		for (let url of Object.keys(items)) {
			// page loads via javascript, so geting the object wont' work
			url = url.replace("https://nyu.databrary.org/volume", "https://nyu.databrary.org/api/volume");
			await scrapeJSON(await requestText(url));
		}
	}
	else {
		await scrape(doc, url);
	}
}

async function scrapeJSON(text) {
	var dbJSON = JSON.parse(text);
	let doi = dbJSON.doi;
	let risURL = `https://data.datacite.org/application/x-research-info-systems/${doi}`;
	let id = dbJSON.id;
	let risText = await requestText(risURL);
	let translator = Zotero.loadTranslator('import');
	translator.setTranslator('32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7'); // RIS
	translator.setString(risText);
	translator.setHandler('itemDone', (_obj, item) => {
		item.itemType = "dataset";
		item.attachments.push({
			title: 'Snapshot',
			url: `http://databrary.org/volume/${id}`,
			mimeType: 'text/html'
		});

		item.complete();
	});
	await translator.translate();
}

async function scrape(doc) {
	let DOI = attr(doc, 'p.panel-overview-volume-citation>a', 'href');
	DOI = DOI.replace(/https?:\/\/doi.org/, "");
	let risURL = `https://data.datacite.org/application/x-research-info-systems/${DOI}`;
	// Z.debug(risURL)

	let risText = await requestText(risURL);
	// Z.debug(risText);
	let translator = Zotero.loadTranslator('import');
	translator.setTranslator('32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7'); // RIS
	translator.setString(risText);
	translator.setHandler('itemDone', (_obj, item) => {
		item.attachments.push({
			title: 'Snapshot',
			document: doc
		});

		item.complete();
	});
	await translator.translate();
}


/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://nyu.databrary.org/volume/1322",
		"defer": true,
		"detectedItemType": "dataset",
		"items": [
			{
				"itemType": "dataset",
				"title": "Moving language: Mothers’ verbs correspond to infants’ real-time locomotion",
				"creators": [
					{
						"lastName": "West",
						"firstName": "Kelsey Louise",
						"creatorType": "author"
					},
					{
						"lastName": "Tamis-LeMonda",
						"firstName": "Catherine",
						"creatorType": "author"
					},
					{
						"lastName": "Adolph",
						"firstName": "Karen",
						"creatorType": "author"
					}
				],
				"date": "2021",
				"DOI": "10.17910/B7.1322",
				"abstractNote": "How do infants learn language? Infants can only learn the words that they hear. We tested whether infants’ actions affect the words that caregivers say—specifically whether infant locomotion influences caregivers’ language about locomotion. Compared to crawling infants, walkers travel greater distances (Adolph, et al, 2012). Does enhanced locomotion in walkers influence the verbs that caregivers say? We hypothesized that walking creates new opportunities for verb learning. To disentangle locomotor ability from age, we observed same-aged crawlers and walkers (16 13-month-old crawlers and 16 13-month-old walkers) and an older group of walkers (16 18-month-olds) during two hours of activity at home. Mothers’ language was transcribed verbatim. We then identified each “locomotor verb” (e.g., “come,” “bring”) that mothers said, and each bout of infant crawling and walking. Walkers’ enhanced locomotion indeed opened new opportunities for verb learning. Although mothers’ language overall was more frequent to older compared to younger infants, their locomotor verbs were more frequent to walkers than to crawlers. Preliminary findings show that caregivers directed more utterances to 18-month-olds (M = 2,006.00, SD = 579.02) compared to 13-month-old crawlers (M = 1,553.75, SD = 728.42) and walkers (M = 1,363.50, SD = 619.29), F (2, 31) = 3.23, p = .052. Notably, caregivers directed twice as many locomotor verbs to 13- and 18-month-old walkers (M = 53.13, SD = 15.40; M = 53.00, SD = 25.14, respectively) compared with 13-month-old crawlers (M = 25.25, SD = 12.87), F (2, 31) = 5.46, p = .01. Moreover, mothers’ locomotor verbs were related to infants’ moment-to-moment locomotion: Infants who moved more frequently received more locomotor verbs compared to infants who moved less, r(26) = .42, p = .035. Findings indicate that locomotor development leads to more advanced forms of infant activity, which consequently prompts caregivers to use more advanced language.",
				"libraryCatalog": "Databrary",
				"repository": "Databrary",
				"shortTitle": "Moving language",
				"url": "http://databrary.org/volume/1322",
				"attachments": [
					{
						"title": "Snapshot",
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
		"url": "https://nyu.databrary.org/search?q=mothers",
		"defer": true,
		"detectedItemType": "multiple",
		"items": "multiple"
	}
]
/** END TEST CASES **/
