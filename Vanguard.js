{
	"translatorID": "3d3ab047-f5c2-430a-ac10-a6aec5448bb0",
	"label": "Vanguard",
	"creator": "VWF",
	"target": "^https?://((www|allure)\\\\.)?vanguardngr\\\\.com/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-10-28 10:06:29"
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

function parseJSONLD(doc) {
	let nodes = doc.querySelectorAll('script[type="application/ld+json"]');
	for (let node of nodes) {
		let txt = node.textContent.trim();
		if (!txt) continue;
		try {
			let parsed = JSON.parse(txt);
			let candidates = [];
			if (Array.isArray(parsed)) {
				candidates = parsed;
			}
			else if (parsed['@graph'] && Array.isArray(parsed['@graph'])) {
				candidates = parsed['@graph'];
			}
			else if (parsed.mainEntity) {
				candidates = [parsed.mainEntity, parsed];
			}
			else {
				candidates = [parsed];
			}

			for (let cand of candidates) {
				if (!cand) continue;
				let t = cand['@type'] || cand.type;
				if (!t) continue;
				if (typeof t === 'string') {
					if (t.includes('Article')) {
						return cand;
					}
				}
				else if (Array.isArray(t)) {
					for (let tt of t) {
						if (typeof tt === 'string' && tt.includes('Article')) {
							return cand;
						}
					}
				}
			}
		}
		catch (e) {
			// ignore malformed JSON-LD
		}
	}
	return null;
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
	url = url || doc.location.href;

	if (isIndexURL(url)) {
		return 'multiple';
	}

	let j = parseJSONLD(doc);
	if (j) {
		if (url.includes('allure.vanguardngr.com')) {
			return 'magazineArticle';
		}
		return 'newspaperArticle';
	}

	if (meta(doc, 'article:published_time') || meta(doc, 'og:type') === 'article') {
		if (url.includes('allure.vanguardngr.com')) {
			return 'magazineArticle';
		}
		return 'newspaperArticle';
	}

	if (url.includes('allure.vanguardngr.com')) {
		if (text(doc, 'div.s-post-header>h1') || text(doc, 'div.article-content h1, div.article-content h2')) {
			return 'magazineArticle';
		}
	}
	else if (text(doc, 'div.entry-heading-wrapper>h2.entry-heading')) {
		return 'newspaperArticle';
	}

	// Explicit fallback ONLY for category/tag pages
	if (getSearchResults(doc, true) && isIndexURL(url)) {
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
	else if (mode === 'newspaperArticle' || mode === 'magazineArticle') {
		await scrape(doc, url);
	}
}

async function scrape(doc, url) {
	url = url || doc.location.href;

	function isSingleName(name) {
		if (!name) return true;
		name = name.trim();
		name = name.replace(/^\s*by\s+/i, '').trim();
		if (name.split(/\s+/).length === 1) return true;
		if (/^[A-Z0-9-]{2,}$/.test(name) && name.includes(' ') === -1) return true;
		return false;
	}

	function splitAuthors(nameStr) {
		if (!nameStr) return [];
		let s = nameStr.trim();
		s = s.replace(/^\s*by\s+/i, '').trim();
		s = s.replace(/\s*\([^)]*\)\s*$/, '').trim();
		s = s.replace(/,\s*[A-Z][a-z]+(?:[\s-][A-Z][a-z]+)*$/, '').trim();
		if (s.includes('|')) s = s.split('|')[0].trim();
		let parts = s.split(/\s+(?:and|&)\s+|;\s*/i);
		if (parts.length === 1 && s.includes(',') !== -1) {
			parts = s.split(/\s*,\s*/).map(p => p.trim()).filter(Boolean);
		}
		let cleaned = [];
		for (let p of parts) {
			let np = (p || '').trim();
			np = np.replace(/^\s*by\s+/i, '').trim();
			np = np.replace(/\s*\([^)]*\)\s*$/, '').trim();
			np = np.replace(/,\s*[A-Z][a-z]+(?:[\s-][A-Z][a-z]+)*$/, '').trim();
			if (np && !/^(agency|news desk|agency reporter|vanguard|our reporter|allure|editorial|nigeria|staff|bureau)$/i.test(np)) {
				cleaned.push(np);
			}
		}
		return cleaned;
	}

	let itype = (url && url.includes('allure.vanguardngr.com')) ? 'magazineArticle' : 'newspaperArticle';
	let item = new Zotero.Item(itype);
	let data = parseJSONLD(doc);

	if (data) {
		item.title = ZU.unescapeHTML(
			data.headline
			|| meta(doc, 'og:title')
			|| text(doc, 'div.entry-heading-wrapper>h2.entry-heading')
			|| text(doc, 'div.s-post-header>h1')
			|| ''
		);

		item.abstractNote = ZU.unescapeHTML(
			data.description
			|| meta(doc, 'og:description')
			|| ''
		);

		item.url = data.url || meta(doc, 'og:url') || url;
		item.language = data.inLanguage || meta(doc, 'og:locale') || 'en';
		item.ISSN = (url && url.includes('allure.vanguardngr.com')) ? '2276-9234' : '0794-652X';

		let rawJsonDate = data.datePublished || '';
		if (rawJsonDate) {
			let isoFromZU = ZU.strToISO(rawJsonDate);
			item.date = isoFromZU || rawJsonDate;
		}

		if (data.author) {
			let authors = Array.isArray(data.author) ? data.author : [data.author];
			let graph = [];
			try {
				let nodes = doc.querySelectorAll('script[type="application/ld+json"]');
				for (let node of nodes) {
					let txt = node.textContent.trim();
					if (!txt) continue;
					let parsed = JSON.parse(txt);
					if (parsed['@graph'] && Array.isArray(parsed['@graph'])) {
						graph = parsed['@graph'];
						break;
					}
				}
			}
			catch (e) {}

			for (let a of authors) {
				let name = '';
				if (typeof a === 'string') name = a;
				else if (a && typeof a === 'object') {
					if (a.name) name = a.name;
					else if (a['@id']) {
						let match = graph.find(obj => obj['@id'] === a['@id']);
						if (match && match.name) name = match.name;
					}
				}
				name = (name || '').trim().replace(/^\s*by\s+/i, '').trim();
				if (name.includes('|')) name = name.split('|')[0].trim();
				name = name.replace(/,\s*[A-Z][a-z]+(?:[\s-][A-Z][a-z]+)*$/, '').trim();

				let lname = name.toLowerCase();
				if (name && !/agency|news desk|agency reporter|vanguard|our reporter|allure|editorial|nigeria|staff|bureau/i.test(lname) && !isSingleName(name)) {
					let authorParts = splitAuthors(name);
					for (let realName of authorParts) {
						if (!isSingleName(realName)) item.creators.push(ZU.cleanAuthor(realName, 'author'));
					}
				}
			}
		}

		if (data.articleSection) {
			let section = Array.isArray(data.articleSection)
				? data.articleSection.map(s => s.toLowerCase())
				: [data.articleSection.toLowerCase()];
			if (section.includes('editorial')) {
				item.creators = [];
			}
		}
	}

	if (item.title) {
		let m = item.title.match(/,\s*by\s+(.+)$/i);
		if (m && m[1]) {
			let colAuthors = splitAuthors(m[1]);
			if (colAuthors.length) {
				item.creators = [];
				for (let ca of colAuthors) {
					if (!isSingleName(ca)) item.creators.push(ZU.cleanAuthor(ca, 'author'));
				}
			}
			item.title = item.title.replace(/,\s*by\s+(.+)$/i, '').trim();
		}
	}

	if (!item.title || !item.title.trim()) {
		item.title = ZU.unescapeHTML(
			meta(doc, 'og:title')
			|| text(doc, 'div.entry-heading-wrapper>h2.entry-heading')
			|| text(doc, 'div.s-post-header>h1')
			|| ''
		);
	}

	if (!item.abstractNote || !item.abstractNote.trim()) {
		item.abstractNote = ZU.unescapeHTML(meta(doc, 'og:description') || '');
	}

	if (!item.date || !item.date.trim()) {
		let metaDate = meta(doc, 'article:published_time');
		if (metaDate) item.date = ZU.strToISO(metaDate) || metaDate;
	}

	if (!item.url || !item.url.trim()) item.url = meta(doc, 'og:url') || url;
	if (!item.publicationTitle) item.publicationTitle = (url && url.includes('allure.vanguardngr.com')) ? 'Vanguard Allure' : 'Vanguard';

	// --- Unified Allure fallback with "name-likeness" + selector and pipe handling ---
	if (item.creators.length === 0) {
		let found = false;

		// --- Allure-specific enhanced author detection ---
		if (url.includes('allure.vanguardngr.com')) {
			let txt = '';
			
			// 1) Try first <p> under div.article-content
			let firstP = doc.querySelector('div.article-content > p:first-of-type');
			if (firstP) {
				let rawHTML = firstP.innerHTML.trim();
				// If contains a <br>, take only the part before <br>
				if (rawHTML.includes('<br')) {
					txt = rawHTML.split(/<br\s*\/?>/i)[0].replace(/<[^>]+>/g, '').trim();
				}
				else {
					txt = firstP.textContent.trim();
				}
			}

			// 2) If not found or too long, check second child div inside article-content
			if (!txt || txt.length > 80 || txt.split(/\s+/).length > 8 || /[.!?]\s/.test(txt)) {
				let secondDiv = doc.querySelector('div.article-content > div:nth-of-type(2)');
				if (secondDiv) {
					let t = secondDiv.textContent.trim();
					if (t && t.length < 60 && t.split(/\s+/).length <= 6) txt = t;
				}
			}

			// 3) Clean up extracted candidate
			if (txt) {
				txt = txt.replace(/^\s*(By|Written by)\s+/i, '').trim();
				txt = txt.replace(/\s*\|.*$/, '').trim();
				txt = txt.replace(/\s*,\s*$/, '').trim(); // handles trailing commas like "Rita Chioma,"
				txt = txt.replace(/\s*\(.*\)\s*$/, '').trim();
			}

			// 4) Apply name-likeness tests
			if (
				txt
				&& txt.length <= 60
				&& txt.split(/\s+/).length <= 6
				&& /^[A-Z][a-z.'-]+(?:\s+[A-Z][a-z.'-]+){0,3}$/.test(txt)
				&& !/agency|news desk|agency reporter|vanguard|our reporter|allure|editorial|nigeria|staff|bureau/i.test(txt.toLowerCase())
			) {
				let parts = splitAuthors(txt);
				for (let name of parts) {
					if (!isSingleName(name)) {
						item.creators.push(ZU.cleanAuthor(name, 'author'));
						found = true;
					}
				}
			}
			else if (txt && (txt.length > 60 || txt.split(/\s+/).length > 6 || /[.!?]\s/.test(txt))) {
				// Explicitly ignore overly long or sentence-like paragraphs
				found = true;
			}
		}
		// --- END Allure-specific ---

		// If not found via "name-likeness", fall back to general Vanguard selectors
		if (!found && item.creators.length === 0) {
			let cand = text(doc, 'div.entry-content-inner-wrapper p')
				|| text(doc, 'div.byline, span.author, div.author-name');

			if (cand && !/agency|news desk|agency reporter|vanguard|our reporter|allure|editorial|nigeria|staff|bureau/i.test(cand.toLowerCase())) {
				cand = cand.split('|')[0].trim(); // remove any role or title after pipe
				let authorParts = splitAuthors(cand);
				for (let name of authorParts) {
					if (!isSingleName(name)) item.creators.push(ZU.cleanAuthor(name, 'author'));
				}
			}
		}
	}

	item.attachments.push({ document: doc, title: 'Snapshot' });
	item.place = 'Nigeria';
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.vanguardngr.com/2025/10/from-pitch-to-purposeful-philanthropy-zahra-buhari-indimis-unspoken-touches-by-emmanuel-aziken/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "From Pitch To Purposeful Philanthropy: Zahra Buhari-Indimi’s Unspoken Touches",
				"creators": [
					{
						"firstName": "Emmanuel",
						"lastName": "Aziken",
						"creatorType": "author"
					}
				],
				"date": "2025-10-24",
				"ISSN": "0794-652X",
				"abstractNote": "This weekend, the eyes of football lovers across the continent will be fixed on Abuja, where glamour meets generosity as some of the most iconic names in world football converge for a cause that transcends sport.  At the magnificent Moshood Abiola National Stadium, the Barcelona Legends will lock horns with the African Legends in a charity exhibition […]",
				"language": "en-GB",
				"libraryCatalog": "Vanguard",
				"place": "Nigeria",
				"publicationTitle": "Vanguard",
				"shortTitle": "From Pitch To Purposeful Philanthropy",
				"url": "https://www.vanguardngr.com/2025/10/from-pitch-to-purposeful-philanthropy-zahra-buhari-indimis-unspoken-touches-by-emmanuel-aziken/",
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
		"url": "https://www.vanguardngr.com/2025/10/over-20-pdp-lawmakers-threaten-defection-over-controversy-surrounding-national-woman-leader-nominee/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Over 20 PDP lawmakers threaten defection over controversy surrounding national woman leader nominee",
				"creators": [
					{
						"firstName": "Gift",
						"lastName": "Chapi-Odekina",
						"creatorType": "author"
					}
				],
				"date": "2025-10-27",
				"ISSN": "0794-652X",
				"abstractNote": "The Peoples Democratic Party (PDP) is facing a fresh internal dispute as more than 20 of its federal lawmakers have threatened to defect over an alleged plan by the party leadership to approve a nominee reportedly backed by an All Progressives Congress (APC) governor for the position of PDP National Woman Leader.",
				"language": "en-GB",
				"libraryCatalog": "Vanguard",
				"place": "Nigeria",
				"publicationTitle": "Vanguard",
				"url": "https://www.vanguardngr.com/2025/10/over-20-pdp-lawmakers-threaten-defection-over-controversy-surrounding-national-woman-leader-nominee/",
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
		"url": "https://allure.vanguardngr.com/2025/09/ikorodu-bois-go-from-ikorodu-streets-to-global-screen/",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "Ikorodu Bois go from Ikorodu streets to global screen",
				"creators": [],
				"date": "2025-09-28",
				"ISSN": "2276-9234",
				"abstractNote": "In the densely populated town of Ikorodu in Lagos State, a highly talented group of young creatives have turned daily life into a springboard for the global limelight. Referred to as the Ikorodu Bois, the trio of siblings and their cousin have turned into a cultural force, repackaging how the globe sees African creativity in the digital era. What started as a joke experiments with smartphones and household items has evolved into an art form that commands international attention. The Ikorodu Bois’ signature style low-budget, high-impact recreations of blockbuster trailers and viral music videos is now celebrated far beyond the […]",
				"language": "en-US",
				"libraryCatalog": "Vanguard",
				"publicationTitle": "Vanguard Allure",
				"url": "https://allure.vanguardngr.com/2025/09/ikorodu-bois-go-from-ikorodu-streets-to-global-screen/",
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
		"url": "https://allure.vanguardngr.com/2016/10/us-first-lady-michelle-obama-glows-cover/",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "US First Lady, Michelle Obama glows on the cover of New York Times Style Magazine",
				"creators": [
					{
						"firstName": "Rita",
						"lastName": "Chioma",
						"creatorType": "author"
					}
				],
				"date": "2016-10-18",
				"ISSN": "2276-9234",
				"abstractNote": "By Rita Chioma Glowing as ever, U.S First Lady Michelle Obama covered the latest edition of The New York Times Style Magazine, which has been titled “Greats” issue. The mother of two looked ageless on the photos splashed on the magazine cover and inside pages. Michelle also received glowing love letters from some of the world’s best known men and women, including acclaimed Nigerian writer and feminist, Chimamanda Ngozi Adichie, Hollywood actress, Rashida Jones, Political activist and journalist, Gloria Steinem and Pulitzer Prize-winning biographer and author, Jon Meacham, all hailing her for being a great woman and role model.",
				"language": "en-US",
				"libraryCatalog": "Vanguard",
				"publicationTitle": "Vanguard Allure",
				"url": "https://allure.vanguardngr.com/2016/10/us-first-lady-michelle-obama-glows-cover/",
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
		"url": "https://allure.vanguardngr.com/2018/07/stella-damasus-celebrates-husband-daniel-ademinokan-on-birthday/",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "Stella Damasus celebrates husband, Daniel Ademinokan on birthday",
				"creators": [
					{
						"firstName": "Temitope",
						"lastName": "Ojo",
						"creatorType": "author"
					}
				],
				"date": "2018-07-31",
				"ISSN": "2276-9234",
				"abstractNote": "By Temitope Ojo Nollywood actress and singer, Stella Damasus, on Tuesday, celebrated her husband and filmmaker, Daniel Ademinokan, as he added another year to his age. In a post to Instagram, Stella shared pictures of herself and her husband and expressed how deeply she loves him. The 40-year-old mother of two added that though she has a lot to say, she will say them in “the other room”. “My lover, my husband, my friend, my brother, my gist partner, my prayer partner, my hero, the head of my home @dabishop007 happy birthday my love. “So much to say to you […]",
				"language": "en-US",
				"libraryCatalog": "Vanguard",
				"publicationTitle": "Vanguard Allure",
				"url": "https://allure.vanguardngr.com/2018/07/stella-damasus-celebrates-husband-daniel-ademinokan-on-birthday/",
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
