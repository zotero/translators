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
	"lastUpdated": "2025-01-30 15:03:34"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2024 Dae

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
			await scrape(await requestDocument(url));
		}
	}
	else {
		await scrape(doc, url);
	}
}

function extractOrcid(doc, item) {
	for (orcid_tag of ZU.xpath(doc, '//meta[@name="citation_author_orcid"]')){
		let previous_author_tag = orcid_tag.previousElementSibling;
		if (previous_author_tag.name == 'citation_author') {
			let author_name = previous_author_tag.content;
			let orcid = orcid_tag.content;
			item.notes.push({note: "orcid:" + orcid + ' | ' + author_name + ' | ' + "taken from website"});
		}
	}
	if (!item.notes.some(obj => obj.note.startsWith('orcid'))) {
		for (orcid_element of ZU.xpath(doc, '//a[contains(@href, "orcid")]')) {
			let orcid = orcid_element.href.replace(new RegExp('https?://orcid.org/'), '');
			let author_name = orcid_element.previousSibling.textContent.trim()
			item.notes.push({note: "orcid:" + orcid + ' | ' + author_name + ' | ' + "taken from website"});
		}
	}
}

async function scrape(doc, url = doc.location.href) {
	let translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);

	translator.setHandler('itemDone', (_obj, item) => {
		if (item.abstractNote.length < 20) {
			let abstractNEU = text(doc, 'div.card-content h2~p'); 
			if (abstractNEU.length > 20) {
				item.abstractNote = abstractNEU; 
			} 
			else {
				item.abstractNote = "";
			}
		}

		extractOrcid(doc, item);
			
		if (text(doc, 'span.card-title div small') == 'Reviews'){
			item.tags.push("RezensionstagPica");
		}

		if (!item.pages && ZU.xpathText(doc, '//th[text()="Pages"]/following-sibling::td/text()')) item.pages = ZU.xpathText(doc, '//th[text()="Pages"]/following-sibling::td/text()');

		item.complete();

	});

	
	let em = await translator.getTranslatorObject();
	
	await em.doWeb(doc, url); 
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.zygonjournal.org/article/id/14964/",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "A BROADER PERSPECTIVE ON “HUMANS”: ANALYSIS OF INSĀN IN TWELVER SHĪʿĪ PHILOSOPHY AND IMPLICATIONS FOR ASTROTHEOLOGY",
				"creators": [
					{
						"firstName": "Abdullah",
						"lastName": "Ansar",
						"creatorType": "author"
					},
					{
						"firstName": "Shahbaz",
						"lastName": "Haider",
						"creatorType": "author"
					}
				],
				"date": "2023-12-01",
				"DOI": "10.1111/zygo.12926",
				"ISSN": "1467-9744",
				"abstractNote": "This article explores the essence of the human (insān) as it is understood in Twelver Shīʿī philosophy and mysticism. It presents a Shīʿī philosophical elucidation regarding the possible existence of extraterrestrial intelligent lifeforms and what their relationship with “humanhood” might be. This line of reasoning is presented with a general sketch of how, in Shīʿī Islamic thought, a “human being” is characterized by specific traits and the relationship of human beings with the archetype of the Perfect Human (al‐Insān al‐Kāmil). Following this is a review of Shīʿī Imāmī traditions regarding extraterrestrial intelligent life and the plurality of worlds. This sequence ultimately allows for a unique analysis of humanhood according to the Shīʿī philosophical viewpoint and helps determine if the term “human” can be used for other intelligent beings with similar ontological features and intelligence levels.",
				"issue": "4",
				"language": "None",
				"libraryCatalog": "www.zygonjournal.org",
				"pages": "838–859",
				"publicationTitle": "Zygon: Journal of Religion and Science",
				"shortTitle": "A BROADER PERSPECTIVE ON “HUMANS”",
				"url": "https://www.zygonjournal.org/article/id/14964/",
				"volume": "58",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Perfect Human"
					},
					{
						"tag": "Shīʿī Ḥadīth"
					},
					{
						"tag": "al‐Insān al‐Kāmil"
					},
					{
						"tag": "astrotheology"
					},
					{
						"tag": "extraterrestrial intelligent life"
					},
					{
						"tag": "human–extraterrestrial interaction (HEI)"
					},
					{
						"tag": "noncarbon‐based lifeforms"
					},
					{
						"tag": "plurality of worlds"
					}
				],
				"notes": [
					{
						"note": "orcid:0000-0001-8195-7530 | Abdullah Ansar"
					}
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
