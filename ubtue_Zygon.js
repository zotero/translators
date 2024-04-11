{
	"translatorID": "347315ed-1b64-47cd-a5a7-3c531d54d48c",
	"label": "ubtue_Zygon",
	"creator": "Martina Däubler",
	"target": "https://www.zygonjournal.org/(issue|article)/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-04-11 15:37:21"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2022 YOUR_NAME <- TODO

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
	// TODO: adjust the logic here
	if (url.includes('/article/')) {
		return 'journalArticle';
	}
	else if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc,'//div[@class="col m10 s12"]/a');
	for (let row of rows) {
		// TODO: check and maybe adjust
		let href = row.href;
		// TODO: check and maybe adjust
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
			await scrape(await requestDocument(url));
		}
	}
	else {
		await scrape(doc, url);
	}
}

async function scrape(doc, url = doc.location.href) {
	let translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	
	translator.setHandler('itemDone', (_obj, item) => {
		Z.debug(_obj)
		for (orcid_tag of ZU.xpath(doc, '//meta[@name="citation_author_orcid"]')){
		//for (orcid_tag of doc.querySelectorAll('meta[name="citation_author_orcid"]')){
			let previous_author_tag = orcid_tag.previousElementSibling;
			if (previous_author_tag.name == 'citation_author') {
				let author_name = previous_author_tag.content;
				let orcid = orcid_tag.content;
				item.notes.push({note: "orcid:" + orcid + ' | ' + author_name});
			}
		}
		for (card_title of ZU.xpath(doc, '//span[@class="card-title"]/div/small')){
			//Z.debug(card_title)
			if (card_title.innerText == 'Reviews'){
				item.tags.push("RezensionstagPica");
				break;
			}
		}
		item.complete();
	});

	
	let em = await translator.getTranslatorObject();
	
	await em.doWeb(doc, url); 
}


/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
