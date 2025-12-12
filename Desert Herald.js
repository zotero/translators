{
	"translatorID": "abf3fd3f-2419-436d-8e16-f94188672e82",
	"label": "Desert Herald",
	"creator": "VWF",
	"target": "^https?://www\\.?desertherald\\.ng/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-12-12 10:25:28"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2025 VWF

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

function meta(doc, nameOrProp) {
	let m = doc.querySelector('meta[property="' + nameOrProp + '"]')
		|| doc.querySelector('meta[name="' + nameOrProp + '"]');
	return m ? m.getAttribute('content') : '';
}

function isMultiWordAuthor(name) {
	return name && name.trim().split(/\s+/).length > 1;
}

function getSearchResults(doc, checkOnly) {
	let items = {};
	let found = false;
	let rows = doc.querySelectorAll('a[href*="/"]');
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(row.textContent || row.title || '');
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function isIndexURL(url) {
	return url && (url.includes('/tag/') || url.includes('/category/'));
}

function detectWeb(doc, url) {
	// ARTICLE detection ONLY by headline selector
	if (text(doc, 'header.entry-header.clearfix h1.post-title.lg')) {
		return 'newspaperArticle';
	}

	// MULTIPLE detection
	if (isIndexURL(url)) {
		return 'multiple';
	}

	if (getSearchResults(doc, true)) {
		return 'multiple';
	}

	return false;
}

async function doWeb(doc, url) {
	url = url || doc.location.href;
	let mode = detectWeb(doc, url);

	if (mode === 'multiple') {
		let items = getSearchResults(doc, false);
		if (!items) return;
		let selected = await Zotero.selectItems(items);
		if (!selected) return;
		for (let u of Object.keys(selected)) {
			await scrape(await requestDocument(u));
		}
	}
	else if (mode === 'newspaperArticle') {
		await scrape(doc, url);
	}
}

async function scrape(doc, url) {
	url = url || doc.location.href;

	// Author Detection
	function isSingleName(name) {
		if (!name) return true;
		name = name.trim();
		if (name.split(/\s+/).length === 1) return true;
		if (/^[A-Z0-9-]+$/.test(name)) return true;
		return false;
	}

	function cleanAuthor(raw) {
		if (!raw) return "";
		let name = raw.replace(/^\s*by\s+/i, "").trim();
		name = name.replace(/^\s*from\s+/i, "").trim();
		name = name.replace(/\s+reports?$/i, "").trim();
		name = name.replace(/\s+in\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*$/i, "").trim();
		name = name.replace(/,\s*[A-Z][a-z]+(?:[\s-][A-Z][a-z]+)*$/i, "").trim();
		name = name.replace(/\s*[–-]\s*[A-Z][a-z]+$/i, "").trim();
		if (/^[A-Z\s,.-]+$/.test(name)) {
			name = name.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
		}
		return name;
	}

	function extractAuthorsFromParagraph(text) {
		if (!text) return [];
		text = text.trim();
		text = text.replace(/\.\s*$/, "").trim();

		let authors = [];

		if (/^(by\s+[A-Z]|from\s+[A-Z]|détails avec\s+[A-Z]|[A-Z].*\sreports?)/i.test(text)) {
			text = text.replace(/^\s*by\s+/i, "").trim();
			text = text.replace(/^\s*from\s+/i, "").trim();
			text = text.replace(/^\s*détails avec\s+/i, "").trim();
			let parts = text.split(/\s*(?:,|and|&|–)\s+/i);
			for (let part of parts) {
				let m = part.match(/[A-Z][a-zA-Z'-]+(?:\s+[A-Z][a-zA-Z'-]+){0,3}/);
				if (m) {
					let name = cleanAuthor(m[0]);
					if (name && !isSingleName(name)) authors.push(name);
				}
			}
		}

		return authors;
	}

	let item = new Zotero.Item('newspaperArticle');

	// HEADLINE
	item.title = ZU.unescapeHTML(
			meta(doc, 'og:title')
			|| text(doc, 'header.entry-header.clearfix h1.post-title.lg')
			|| ''
		);

	// ABSTRACT
	item.abstractNote = ZU.unescapeHTML(
		meta(doc, 'og:description') || ''
	);

	// URL
	item.url = meta(doc, 'og:url') || url;

	// LANGUAGE
	item.language = 'en';

	// DATE
	let dateNode = doc.querySelector('ul.post-meta li.post-meta-date');
	if (dateNode) {
		let raw = dateNode.textContent.trim(); // e.g. 23/01/2022
		let parts = raw.split('/');
		if (parts.length === 3) {
			item.date = `${parts[2]}-${parts[1]}-${parts[0]}`;
		}
	}

	// AUTHORS (CSS paragraphs first)
	let ps = doc.querySelectorAll("div.entry-content.clearfix p");
	let authorCandidates = [];

	for (let i = 0; i < Math.min(ps.length, 4); i++) {
		let txt = ps[i].textContent.trim();
		if (!txt) continue;

		if (
			txt.length > 150
			&& !/^by\s+[A-Z]/i.test(txt)
			&& !/^from\s+[A-Z]/i.test(txt)
			&& !/^détails avec\s+[A-Z]/i.test(txt)
			&& !/[A-Z].*\sreports?/i.test(txt)
		) {
			continue;
		}

		let found = extractAuthorsFromParagraph(txt);
		if (found.length) {
			authorCandidates = found;
			break;
		}
	}

	// FALLBACK AUTHOR (BYLINE NEAR HEADLINE)
	if (!authorCandidates.length) {
		let byline = doc.querySelector('ul.post-meta li.post-author a');
		if (byline) {
			let name = cleanAuthor(byline.textContent.trim());
			if (name && isMultiWordAuthor(name)) {
				authorCandidates.push(name);
			}
		}
	}

	for (let a of authorCandidates) {
		item.creators.push(ZU.cleanAuthor(a, "author"));
	}

	// PUBLICATION INFO
	item.publicationTitle = 'Desert Herald';
	item.ISSN = '0794-2990';

	item.attachments.push({
		document: doc,
		title: 'Snapshot'
	});

	item.place = 'Nigeria';
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://desertherald.ng/i-have-no-intention-to-vie-for-apc-chairmanship-buni-clarifies/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "I Have No Intention to Vie for APC Chairmanship, Buni Clarifies",
				"creators": [
					{
						"firstName": "Adedayo",
						"lastName": "Akinwale",
						"creatorType": "author"
					}
				],
				"date": "2022-01-23",
				"ISSN": "0794-2990",
				"abstractNote": "*Alleged tenure elongation plot untrue, says ruling party *Ojudu commends party for adopting direct primary for Ekiti 2022 By Adedayo Akinwale The National Chairman of the Caretaker/Extraordinary Convention Planning Committee (CECPC) of the All Progressives Congress (APC) and Governor of Yobe State, Mai Mala Buni, yesterday debunked speculations that he was scheming to contest for […]",
				"language": "en",
				"libraryCatalog": "Desert Herald",
				"place": "Nigeria",
				"publicationTitle": "Desert Herald",
				"url": "https://desertherald.ng/i-have-no-intention-to-vie-for-apc-chairmanship-buni-clarifies/",
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
		"url": "https://desertherald.ng/apc-court-strikes-out-suit-challenging-buni-led-committee/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "APC: Court strikes out suit challenging Buni led Committee",
				"creators": [
					{
						"firstName": "Nasir",
						"lastName": "Sambo",
						"creatorType": "author"
					}
				],
				"date": "2022-01-23",
				"ISSN": "0794-2990",
				"abstractNote": ".By Festus Ahon The Federal High Court, sitting in Port-Harcourt, Rivers State has struck out the suit challenging the competence of the Governor Mai Mala Buni led Caretaker Extra-Ordinary Convention Planning Committee of the All Progressives Congress, APC. Delivery judgment on the Suit No: FHC/ABJ/857/2021brought before it Odjebobo Desire Onayefeme and others, the presiding Judge, […]",
				"language": "en",
				"libraryCatalog": "Desert Herald",
				"place": "Nigeria",
				"publicationTitle": "Desert Herald",
				"shortTitle": "APC",
				"url": "https://desertherald.ng/apc-court-strikes-out-suit-challenging-buni-led-committee/",
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
		"url": "https://desertherald.ng/super-eagles-crash-out-of-nations-cup-as-tunisia-beat-nigeria-1-0/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Super Eagles crash out of Nations Cup as Tunisia beat Nigeria 1-0",
				"creators": [
					{
						"firstName": "Mubarak",
						"lastName": "Tinja",
						"creatorType": "author"
					}
				],
				"date": "2022-01-23",
				"ISSN": "0794-2990",
				"abstractNote": "Nigeria’s Super Eagles have crashed out of the Africa Cup of Nations. Tunisia upset 10-man Nigeria with a 1-0 win. Youssef Msakni scored for Tunisia in the 47th minute as Nigerian goalkeeper, Maduka Okoye, failed to stop the shot by the Al-Duhail winger. The Super Eagles were down to 10 men after Alex Iwobi was […]",
				"language": "en",
				"libraryCatalog": "Desert Herald",
				"place": "Nigeria",
				"publicationTitle": "Desert Herald",
				"url": "https://desertherald.ng/super-eagles-crash-out-of-nations-cup-as-tunisia-beat-nigeria-1-0/",
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
	}
]
/** END TEST CASES **/
