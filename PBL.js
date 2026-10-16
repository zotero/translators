{
	"translatorID": "6debd0c0-902e-44b8-828e-a8f72af124eb",
	"label": "PBL",
	"creator": "Ewout ter Hoeven",
	"target": "^https?://(www\\.)?pbl\\.nl/(publicaties|actueel|zoeken)",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-07-15 13:31:09"
}


/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2026 Ewout ter Hoeven

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
	if (url.includes('/publicaties/') && doc.querySelector('.node-publication-full')) {
		return "report";
	}
	if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	// Listing/related rows link out to individual publication pages
	var rows = doc.querySelectorAll('.node-publication-docket__read-more-link, a.node-publication-docket__title-link, .view-publications-selection-related__row a[href*="/publicaties/"]');
	for (let row of rows) {
		let href = row.href;
		if (!href || !href.includes('/publicaties/')) continue;
		let title = ZU.trimInternal(row.textContent);
		// Skip generic "Lees meer" labels; try to grab the title from the row instead
		if (/^lees meer/i.test(title)) {
			let container = row.closest('.node-publication-docket');
			let t = container && text(container, '.node-publication-docket__title');
			if (t) title = ZU.trimInternal(t);
		}
		if (!href || !title) continue;
		found = true;
		if (checkOnly) return true;
		items[href] = title;
	}
	return found ? items : false;
}

async function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (!items) return;
		for (let itemURL of Object.keys(items)) {
			await scrape(await requestDocument(itemURL), itemURL);
		}
	}
	else {
		await scrape(doc, url);
	}
}

async function scrape(doc, url = doc.location.href) {
	// PBL publications are reports; map "Publicatie type" if present
	let item = new Zotero.Item("report");

	item.title = text(doc, '.node-publication-full__page-title h1')
		|| text(doc, 'h1');
	item.title = ZU.trimInternal(item.title || '');

	let subtitle = ZU.trimInternal(text(doc, '.node-publication-full__subtitle') || '');
	if (subtitle) {
		item.title = item.title.replace(/[\s?]*$/, m => m.trim());
		item.title = (item.title + (item.title.endsWith('?') ? ' ' : '. ') + subtitle).trim();
	}

	// Metadata from the "Kenmerken" specifications list
	let specs = getSpecifications(doc);

	if (specs['Publicatiedatum']) {
		item.date = ZU.strToISO(specs['Publicatiedatum']);
	}
	else {
		item.date = attr(doc, '.node-publication-full__published-date time', 'datetime');
	}

	if (specs['Aantal pagina\u2019s'] || specs["Aantal pagina's"]) {
		item.pages = specs['Aantal pagina\u2019s'] || specs["Aantal pagina's"];
	}
	if (specs['Publicatietaal']) {
		item.language = specs['Publicatietaal'];
	}
	if (specs['Productnummer']) {
		item.reportNumber = specs['Productnummer'];
	}
	if (specs['Publicatie type']) {
		item.reportType = specs['Publicatie type'];
	}

	item.institution = "PBL Netherlands Environmental Assessment Agency";
	item.url = url;

	// Authors
	let authors = doc.querySelectorAll('.node-publication-full__authors-item a, .node-publication-full__authors-item');
	let seen = new Set();
	for (let a of authors) {
		let name = ZU.trimInternal(a.textContent);
		if (!name || seen.has(name)) continue;
		seen.add(name);
		item.creators.push(ZU.cleanAuthor(name, "author"));
	}

	// Abstract from the intro paragraph
	let abs = text(doc, '.node-publication-full__body--text .par-intro')
		|| text(doc, '.par-intro');
	if (abs) item.abstractNote = ZU.trimInternal(abs);

	// Topic as a tag
	let topic = text(doc, '.node-publication-full__main_topic a');
	if (topic) item.tags.push(ZU.trimInternal(topic));

	// PDF attachment
	let pdfLink = doc.querySelector('.node-publication-full__links-primary-item a.piwik-download[href], .node-publication-full__links-primary-item a[href*="pdf"]');
	if (pdfLink) {
		item.attachments.push({
			url: pdfLink.href,
			title: "Full Text PDF",
			mimeType: "application/pdf"
		});
	}

	item.attachments.push({
		title: "Snapshot",
		document: doc
	});

	item.complete();
}

function getSpecifications(doc) {
	let specs = {};
	let rows = doc.querySelectorAll('.node-publication-full__specifications-item');
	for (let row of rows) {
		let label = text(row, '.node-publication-full__specifications-item-label');
		let value = text(row, '.node-publication-full__specifications-item-value');
		if (label) specs[ZU.trimInternal(label)] = ZU.trimInternal(value || '');
	}
	return specs;
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.pbl.nl/publicaties/beter-bereikbaar",
		"items": [
			{
				"itemType": "report",
				"title": "Beter bereikbaar? Veranderingen in de toegang tot voorzieningen en banen in Nederland tussen 2012 en 2022",
				"creators": [
					{
						"firstName": "Jeroen",
						"lastName": "Bastiaanssen",
						"creatorType": "author"
					},
					{
						"firstName": "Marnix",
						"lastName": "Breedijk",
						"creatorType": "author"
					}
				],
				"date": "2024-09-26",
				"abstractNote": "In het maatschappelijk debat is er in toenemende mate zorg of bereikbaarheid van voorzieningen en banen nog wel voor iedereen gegarandeerd is in Nederland. In dit rapport heeft het PBL met historische microdatasets veranderingen in de bereikbaarheid van voorzieningen en banen in Nederland onderzocht tussen 2012 en 2022, en de mate waarin veranderingen in de ruimtelijke ordening en in het vervoersysteem hieraan hebben bijdragen.",
				"institution": "PBL Netherlands Environmental Assessment Agency",
				"language": "Nederlands",
				"libraryCatalog": "PBL",
				"pages": "77",
				"reportNumber": "5300",
				"reportType": "Rapport",
				"shortTitle": "Beter bereikbaar?",
				"url": "https://www.pbl.nl/publicaties/beter-bereikbaar",
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
						"tag": "Mobiliteit"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
