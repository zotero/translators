{
	"translatorID": "6c61897b-ca44-4ce6-87c1-2da68b44e6f7",
	"label": "Summon 2",
	"creator": "Abe Jellinek",
	"target": "^https?://([^/]+\\.)?summon\\.serialssolutions\\.com/",
	"minVersion": "4.0",
	"maxVersion": "",
	"priority": 150,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsib",
	"lastUpdated": "2021-07-20 21:07:15"
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


function detectWeb(doc, _url) {
	if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.documentSummary');
	for (let row of rows) {
		let id = row.id;
		let title = ZU.trimInternal(text(row, 'h3'));
		if (!id || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[id] = title;
	}
	return found ? items : false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (items) scrape(Object.keys(items), doc.location.hostname);
		});
	}
}

function scrape(ids, hostname) {
	let url = `/citation/export?ids=${ids.join(',')}&format=endnote&file_name=zotero`;
	ZU.doGet(url, function (ris) {
		let translator = Zotero.loadTranslator("import");
		// RIS
		translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
		translator.setString(ris);
		translator.setHandler("itemDone", function (obj, item) {
			item.creators = item.creators.filter(
				creator => !creator.lastName.includes('(Online service)')
			);
			
			if (item.date) {
				if (item.date.includes(';')) {
					item.date = item.date.split(';')[0];
				}
				item.date = ZU.strToISO(item.date);
			}
			
			item.libraryCatalog = `Summon 2 (${hostname})`;
			
			item.complete();
		});
		translator.translate();
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://aub.summon.serialssolutions.com/#!/search?ho=t&l=en&bookMark=eNqFj01Lw0AYhFf8QFvzDzykJ_FQ2M_s7rGGWoWCl-J12WzeaGyardmN_v0G04sieBqGeRhmJuis9S2coERLRbjilClGxekvf4EmBAtOqNJKXqIkhHeMMcVKSUyu0Cz3u30DEdJVX5eQRp9uIMR00Ue_s7H27TU6r2wTIDnqFL08LDf543z9vHrKF-u5pZJJPFdOikIyXlauAMIzoqDi2pa0lCCJ4kxr7QoumOMZZpYwyEBmglQOl6UjjE3RzVhs-8I4G23jX01BKRWEZXyI745x2MJXePNNDOazgcL7bTA_Pg_sbGSDrWxXm7-Z25HZd_6jHz6b7yoHbexsY5b3uRCUEqr_G3YA3UVrQQ",
		"defer": true,
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://aub.summon.serialssolutions.com/#!/search?ho=t&fvf=ContentType,Book%20Review,t&l=en&q=(test)",
		"defer": true,
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://uvic.summon.serialssolutions.com/#!/search?ho=t&l=en&q=test",
		"defer": true,
		"items": "multiple"
	}
]
/** END TEST CASES **/
