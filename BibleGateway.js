{
	"translatorID": "eca3c08a-252b-4030-9df2-d25026e1e69d",
	"label": "BibleGateway",
	"creator": "",
	"target": "^https?://www\\.biblegateway\\.com/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 200,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-11-13 21:04:31"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2026 Dandelion Good

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


function isPassageUrl(url) {
	// ToDo already covered in regex
	return url.includes('/passage/');
}


function detectWeb(doc, url) {
	Zotero.debug("!!! DETECTWEB TRACE TRIGGERED FOR: " + url);
	
	if (!url.includes('biblegateway.com')) {
		Zotero.debug(`BibleGateway detectWeb quick return ${url}`);
		return false;
	}
	Zotero.debug(`in BibleGateway detectWeb for ${url}`);
	if (isPassageUrl(url) && doc.querySelector('.passage-text')) {
		return "bookSection";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	// TODO: adjust the CSS selector
	var rows = doc.querySelectorAll('h2 > a.title[href*="/article/"]');
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

const docStyle = `
			body { font-family: Georgia, serif; line-height: 1.6; max-width: 700px; margin: 2rem auto; padding: 0 1rem; }
			.versenum, sup { font-size: 0.75em; vertical-align: super; color: #666; }
			h1, h3, h4 { font-family: sans-serif; }
		`;

async function getChapterOverview(translation, chapterOsis) {
	Zotero.debug(`in getChapterOverview ${translation} ${chapterOsis.book}.${chapterOsis.chapter}`);
	const graphqlUrl = "https://www.biblegateway.com/graphql/";

	const payload = {
		query: `query ChapterOverview($translation: String!, $chapterOsis: String!) {
			bible(translation: $translation) {
				chapterOverview(chapterOsis: $chapterOsis) {
					content
				}
			}
		}`,
		variables: {
			translation: translation,
			chapterOsis: `${chapterOsis.book}.${chapterOsis.chapter}`
		}
	};
	const mime = "application/json";
	const response = await request(graphqlUrl, {
		headers: {
			"Content-Type": mime,
			Accept: mime
		},
		body: JSON.stringify(payload),
		responseType: "json",
		method: "POST",
	});
	if (response.status > 299) {
		for (let error of response.body.errors) {
			Zotero.debug(`Error getting overview: `);
			for (let [k,v] of Object.entries(error)) {
				Zotero.debug(`error field ${k}: ${v}`);
			}
		}
	}
	return response.body?.data?.bible?.chapterOverview?.content;
}

async function scrape(doc, url = doc.location.href) {
	Zotero.debug(`scraping ${url}`);
	let item = new Zotero.Item('bookSection');
	let langEl = doc.querySelector("html");

	if (langEl) {
		item.language = langEl.getAttribute("lang");
	}
	let verEl = doc.querySelector("div.version-display");
	let translation;
	if (verEl) {
		Zotero.debug(`Found version ${verEl.outerHTML}`);
		translation = verEl.innerHTML.trim();
	} else {
		Zotero.debug("No version element found");
	}

	let osis = attr(doc, 'div.passage-table', 'data-osis');
	
	Zotero.debug(`osis: ${osis}, translation: ${translation}`);
	Zotero.debug(`document title: '${doc.title}'`);
	const titleRe = /^([A-Z a-z\d]+ \d+(?::\d+)?)(?:-\d+(?::\d+)?)?\s+([A-Z]+) -/gm;
	let match = titleRe.exec(doc.title);

	let titleOsis = match[1];
	if (!osis) {
		let osis = titleOsis;
		Zotero.debug(`osis: ${osis}, translation: ${translation}`);
	}
	if (!translation) {
		translation = match[2];
		Zotero.debug(`title: '${doc.title}'\nmatch: ${match}`);
	}
	Zotero.debug(`osis: ${osis}, translation: ${translation}`);
	
	// let itemElement = doc.querySelector('[property~="og:type"]');
	let descEl = doc.querySelector('[property~="og:description"]');
	if (descEl) {
		item.abstractNote = descEl.getAttribute("content");
	}
	
	item.title = `${titleOsis} - ${translation}`;
	item.attachments = [];
	
	let passageEl = doc.querySelector(".passage-text");
	if (passageEl) {
		// Clone it so we don't alter the user's active browser tab
		let clone = passageEl.cloneNode(true);


		// Build a minimal HTML document for the snapshot
		let cleanDoc = doc.implementation.createHTMLDocument(item.title);
		let style = cleanDoc.createElement("style");
		style.textContent = docStyle;
		cleanDoc.head.appendChild(style);
		cleanDoc.body.appendChild(cleanDoc.importNode(clone, true));

		item.attachments.push({
			title: "Passage",
			url: url,
			mimeType: "text/html",
			document: cleanDoc
		});
	} else {
		Zotero.debug(`did not find .passage-text for ${url}`);
	}

	let chapterRe = /(\w+)\.(\d+)(?:\.\d+)?/g;
	let chapterOsises = [...osis.matchAll(chapterRe)].map(m => ({ book: m[1], chapter: parseInt(m[2]) }));
	Zotero.debug(`chapter Osises: ${[...chapterOsises]}`);
	if (chapterOsises.length > 1) {
		let chapter = chapterOsises[0].chapter;
		let book = chapterOsises[0].book;
		let lastChapter = chapterOsises[1].chapter;
		chapterOsises.length = 0;
		while (chapter <= lastChapter) {
			chapterOsises.push({book: book, chapter: chapter});
			chapter += 1;
		}
	}
	for (let chapterOsis of chapterOsises) {
		let overview = await getChapterOverview(translation, chapterOsis);
		if (overview) {
			item.notes.push({
				note: `<h3>Chapter Overview</h3><p>Title: ${chapterOsis.book} ${chapterOsis.chapter} - ${translation}</p>`
				+ "<p>" + ZU.htmlSpecialChars(overview) + '</p>'
			});
		} else {
			Zotero.debug(`did not find overview for ${translation}-${chapterOsis}`);
		}
	}
	
	item.complete();
}


// Todo Handle case of .e.g Genesis 49:10-Exodus 1:12: 
// data on page/osises says it displays chapters across the books but it does not

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.biblegateway.com/passage/?search=Isaiah%2053&version=NRSVUE",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Isaiah 53 - NRSVUE",
				"creators": [],
				"abstractNote": "Who has believed what we have heard? And to whom has the arm of the LORD been revealed? For he grew up before him like a young plant and like a root out of dry ground; he had no form or majesty that we should look at him, nothing in his appearance that we should desire him. He was despised and rejected by others; a man of suffering and acquainted with infirmity, and as one from whom others hide their faces he was despised, and we held him of no account. Surely he has borne our infirmities and carried our diseases, yet we accounted him stricken, struck down by God, and afflicted. But he was wounded for our transgressions, crushed for our iniquities; upon him was the punishment that made us whole, and by his bruises we are healed.",
				"language": "en",
				"libraryCatalog": "BibleGateway",
				"attachments": [
					{
						"title": "Passage",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "<h3>Chapter Overview</h3><p>Title: Isa 53 - NRSVUE</p><p>&lt;p&gt;&lt;a class=&quot;bibleref&quot; data-bibleref=&quot;Isa.53&quot; href=&quot;/passage/?search=Isa 53&quot;&gt;Isaiah 53&lt;/a&gt; is the last, longest and arguably the loveliest of the suffering servant songs in the book of Isaiah.&lt;sup&gt;&lt;a data-resourceref=&quot;niv-study-bible/isa-53-5&quot; data-preview=&quot;53:5 The centering verse of 52:13—53:12, the last, longest and arguably the loveliest of the suffering servant songs in the book of Isaiah (see note on 42:1–4).&quot;&gt;1&lt;/a&gt;&lt;/sup&gt; &amp;quot;Peace,&amp;quot; therefore, is a central theme in &lt;a class=&quot;bibleref&quot; data-bibleref=&quot;Isa.40-Isa.66&quot; href=&quot;/passage/?search=Isa 40-Isa 66&quot;&gt;chs. 40–66&lt;/a&gt; generally and &lt;a class=&quot;bibleref&quot; data-bibleref=&quot;Isa.52.13-Isa.53.12&quot; href=&quot;/passage/?search=Isa 52:13-Isa 53:12&quot;&gt;52:13—53:12&lt;/a&gt; specifically. Such overarching and overwhelming shalom could be &amp;quot;brought&amp;quot; to God&apos;s people only by the atoning sacrifice of the One who was &amp;quot;pierced for our transgressions&amp;quot; and &amp;quot;crushed for our iniquities.&amp;quot;&lt;sup&gt;&lt;a data-resourceref=&quot;niv-study-bible/isa-53-5&quot; data-preview=&quot;“Peace,” therefore, is a central theme in chs. 40–66 generally and 52:13—53:12 specifically. Such overarching and overwhelming shalom could be “brought” to God’s people only by the atoning sacrifice of the One who was “pierced for our transgressions” and “crushed for our iniquities” (see v. 12 and note; cf.&quot;&gt;2&lt;/a&gt;&lt;/sup&gt;&lt;/p&gt;&lt;p&gt;The servant comes in a quiet and unassuming way (&lt;a class=&quot;bibleref&quot; data-bibleref=&quot;Isa.53.2&quot; href=&quot;/passage/?search=Isa 53:2&quot;&gt;v. 2&lt;/a&gt;). His &amp;quot;appearance&amp;quot; is quite ordinary (&lt;a class=&quot;bibleref&quot; data-bibleref=&quot;Isa.53.2&quot; href=&quot;/passage/?search=Isa 53:2&quot;&gt;v. 2&lt;/a&gt;). He takes on himself the pain and &amp;quot;suffering&amp;quot; of the world (&lt;a class=&quot;bibleref&quot; data-bibleref=&quot;Isa.53.3&quot; href=&quot;/passage/?search=Isa 53:3&quot;&gt;v. 3&lt;/a&gt;).&lt;sup&gt;&lt;a data-resourceref=&quot;niv-application-bible/com23053001&quot; data-preview=&quot;(1) He comes in a quiet and unassuming way (v. 2). (2) His “appearance” is quite ordinary (v. 2). (3) He takes on himself the pain and “suffering” of the world (v. 3).&quot;&gt;3&lt;/a&gt;&lt;/sup&gt; Everything that happened to the servant was in fact what should have happened to us&lt;sup&gt;&lt;a data-resourceref=&quot;niv-biblical-theology/isa-53-4-6&quot; data-preview=&quot;Everything that happened to the servant was in fact what should have happened to us (cf.&quot;&gt;4&lt;/a&gt;&lt;/sup&gt; and the sins &amp;quot;laid on him&amp;quot; are similar to the action of the high priest on the Day of Atonement when he laid the sins of the people on the scapegoat (&lt;a class=&quot;bibleref&quot; data-bibleref=&quot;Lev.16.21&quot; href=&quot;/passage/?search=Lev 16:21&quot;&gt;Lev 16:21&lt;/a&gt;).&lt;sup&gt;&lt;a data-resourceref=&quot;niv-biblical-theology/isa-53-6&quot; data-preview=&quot;Similar to the action of the high priest on the Day of Atonement when he laid the sins of the people on the scapegoat (Lev 16:21).&quot;&gt;5&lt;/a&gt;&lt;/sup&gt;&lt;/p&gt;&lt;p&gt;His death was not accidental; these things happened because &amp;quot;it was the LORD&apos;s will&amp;quot; (&lt;a class=&quot;bibleref&quot; data-bibleref=&quot;Isa.53.10&quot; href=&quot;/passage/?search=Isa 53:10&quot;&gt;v. 10&lt;/a&gt;), and this expresses not cruelty but love for a lost world.&lt;sup&gt;&lt;a data-resourceref=&quot;niv-biblical-theology/isa-53-10-12&quot; data-preview=&quot;These things happened not accidentally or merely because this is an unjust world but because “it was the LORD’s will” (v. 10).&quot;&gt;6&lt;/a&gt;, &lt;a data-resourceref=&quot;niv-biblical-theology/isa-53-10-12&quot; data-preview=&quot;But this expresses not cruelty but love for a lost world.&quot;&gt;7&lt;/a&gt;&lt;/sup&gt; Because the servant has suffered in &amp;quot;our&amp;quot; place (vv. 4–6), we need not suffer for our sins but can be declared innocent (&lt;a class=&quot;bibleref&quot; data-bibleref=&quot;Rom.3.20-Rom.3.24&quot; href=&quot;/passage/?search=Rom 3:20-Rom 3:24&quot;&gt;Rom 3:20–24&lt;/a&gt;).&lt;sup&gt;&lt;a data-resourceref=&quot;niv-biblical-theology/isa-53-11&quot; data-preview=&quot;Because the servant has suffered in “our” place (vv. 4–6), we need not suffer for our sins but can be declared innocent (Rom 3:20–24).&quot;&gt;8&lt;/a&gt;&lt;/sup&gt; Peter quotes these lines as he encourages believers to endure unjust suffering (see &lt;a class=&quot;bibleref&quot; data-bibleref=&quot;1Pet.2.22&quot; href=&quot;/passage/?search=1Pet 2:22&quot;&gt;1Pe 2:22&lt;/a&gt; and note).&lt;sup&gt;&lt;a data-resourceref=&quot;niv-study-bible/isa-53-9&quot; data-preview=&quot;Peter quotes these lines as he encourages believers to endure unjust suffering (see 1Pe 2:22 and note).&quot;&gt;9&lt;/a&gt;&lt;/sup&gt;&lt;/p&gt;</p>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.biblegateway.com/passage/?search=Isaiah%2053%3A12&version=NRSVUE",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Isaiah 53:12 - NRSVUE",
				"creators": [],
				"abstractNote": "Therefore I will allot him a portion with the great, and he shall divide the spoil with the strong, because he poured out himself to death and was numbered with the transgressors, yet he bore the sin of many and made intercession for the transgressors.",
				"language": "en",
				"libraryCatalog": "BibleGateway",
				"shortTitle": "Isaiah 53",
				"attachments": [
					{
						"title": "Passage",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "<h3>Chapter Overview</h3><p>Title: Isa 53 - NRSVUE</p><p>&lt;p&gt;&lt;a class=&quot;bibleref&quot; data-bibleref=&quot;Isa.53&quot; href=&quot;/passage/?search=Isa 53&quot;&gt;Isaiah 53&lt;/a&gt; is the last, longest and arguably the loveliest of the suffering servant songs in the book of Isaiah.&lt;sup&gt;&lt;a data-resourceref=&quot;niv-study-bible/isa-53-5&quot; data-preview=&quot;53:5 The centering verse of 52:13—53:12, the last, longest and arguably the loveliest of the suffering servant songs in the book of Isaiah (see note on 42:1–4).&quot;&gt;1&lt;/a&gt;&lt;/sup&gt; &amp;quot;Peace,&amp;quot; therefore, is a central theme in &lt;a class=&quot;bibleref&quot; data-bibleref=&quot;Isa.40-Isa.66&quot; href=&quot;/passage/?search=Isa 40-Isa 66&quot;&gt;chs. 40–66&lt;/a&gt; generally and &lt;a class=&quot;bibleref&quot; data-bibleref=&quot;Isa.52.13-Isa.53.12&quot; href=&quot;/passage/?search=Isa 52:13-Isa 53:12&quot;&gt;52:13—53:12&lt;/a&gt; specifically. Such overarching and overwhelming shalom could be &amp;quot;brought&amp;quot; to God&apos;s people only by the atoning sacrifice of the One who was &amp;quot;pierced for our transgressions&amp;quot; and &amp;quot;crushed for our iniquities.&amp;quot;&lt;sup&gt;&lt;a data-resourceref=&quot;niv-study-bible/isa-53-5&quot; data-preview=&quot;“Peace,” therefore, is a central theme in chs. 40–66 generally and 52:13—53:12 specifically. Such overarching and overwhelming shalom could be “brought” to God’s people only by the atoning sacrifice of the One who was “pierced for our transgressions” and “crushed for our iniquities” (see v. 12 and note; cf.&quot;&gt;2&lt;/a&gt;&lt;/sup&gt;&lt;/p&gt;&lt;p&gt;The servant comes in a quiet and unassuming way (&lt;a class=&quot;bibleref&quot; data-bibleref=&quot;Isa.53.2&quot; href=&quot;/passage/?search=Isa 53:2&quot;&gt;v. 2&lt;/a&gt;). His &amp;quot;appearance&amp;quot; is quite ordinary (&lt;a class=&quot;bibleref&quot; data-bibleref=&quot;Isa.53.2&quot; href=&quot;/passage/?search=Isa 53:2&quot;&gt;v. 2&lt;/a&gt;). He takes on himself the pain and &amp;quot;suffering&amp;quot; of the world (&lt;a class=&quot;bibleref&quot; data-bibleref=&quot;Isa.53.3&quot; href=&quot;/passage/?search=Isa 53:3&quot;&gt;v. 3&lt;/a&gt;).&lt;sup&gt;&lt;a data-resourceref=&quot;niv-application-bible/com23053001&quot; data-preview=&quot;(1) He comes in a quiet and unassuming way (v. 2). (2) His “appearance” is quite ordinary (v. 2). (3) He takes on himself the pain and “suffering” of the world (v. 3).&quot;&gt;3&lt;/a&gt;&lt;/sup&gt; Everything that happened to the servant was in fact what should have happened to us&lt;sup&gt;&lt;a data-resourceref=&quot;niv-biblical-theology/isa-53-4-6&quot; data-preview=&quot;Everything that happened to the servant was in fact what should have happened to us (cf.&quot;&gt;4&lt;/a&gt;&lt;/sup&gt; and the sins &amp;quot;laid on him&amp;quot; are similar to the action of the high priest on the Day of Atonement when he laid the sins of the people on the scapegoat (&lt;a class=&quot;bibleref&quot; data-bibleref=&quot;Lev.16.21&quot; href=&quot;/passage/?search=Lev 16:21&quot;&gt;Lev 16:21&lt;/a&gt;).&lt;sup&gt;&lt;a data-resourceref=&quot;niv-biblical-theology/isa-53-6&quot; data-preview=&quot;Similar to the action of the high priest on the Day of Atonement when he laid the sins of the people on the scapegoat (Lev 16:21).&quot;&gt;5&lt;/a&gt;&lt;/sup&gt;&lt;/p&gt;&lt;p&gt;His death was not accidental; these things happened because &amp;quot;it was the LORD&apos;s will&amp;quot; (&lt;a class=&quot;bibleref&quot; data-bibleref=&quot;Isa.53.10&quot; href=&quot;/passage/?search=Isa 53:10&quot;&gt;v. 10&lt;/a&gt;), and this expresses not cruelty but love for a lost world.&lt;sup&gt;&lt;a data-resourceref=&quot;niv-biblical-theology/isa-53-10-12&quot; data-preview=&quot;These things happened not accidentally or merely because this is an unjust world but because “it was the LORD’s will” (v. 10).&quot;&gt;6&lt;/a&gt;, &lt;a data-resourceref=&quot;niv-biblical-theology/isa-53-10-12&quot; data-preview=&quot;But this expresses not cruelty but love for a lost world.&quot;&gt;7&lt;/a&gt;&lt;/sup&gt; Because the servant has suffered in &amp;quot;our&amp;quot; place (vv. 4–6), we need not suffer for our sins but can be declared innocent (&lt;a class=&quot;bibleref&quot; data-bibleref=&quot;Rom.3.20-Rom.3.24&quot; href=&quot;/passage/?search=Rom 3:20-Rom 3:24&quot;&gt;Rom 3:20–24&lt;/a&gt;).&lt;sup&gt;&lt;a data-resourceref=&quot;niv-biblical-theology/isa-53-11&quot; data-preview=&quot;Because the servant has suffered in “our” place (vv. 4–6), we need not suffer for our sins but can be declared innocent (Rom 3:20–24).&quot;&gt;8&lt;/a&gt;&lt;/sup&gt; Peter quotes these lines as he encourages believers to endure unjust suffering (see &lt;a class=&quot;bibleref&quot; data-bibleref=&quot;1Pet.2.22&quot; href=&quot;/passage/?search=1Pet 2:22&quot;&gt;1Pe 2:22&lt;/a&gt; and note).&lt;sup&gt;&lt;a data-resourceref=&quot;niv-study-bible/isa-53-9&quot; data-preview=&quot;Peter quotes these lines as he encourages believers to endure unjust suffering (see 1Pe 2:22 and note).&quot;&gt;9&lt;/a&gt;&lt;/sup&gt;&lt;/p&gt;</p>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.biblegateway.com/passage/?search=Isaiah%2053%3A14&version=NRSVUE",
		"detectedItemType": false,
		"items": []
	},
	{
		"type": "web",
		"url": "https://www.biblegateway.com/passage/?search=Ecclesiastes%203-5&version=NRSVUE",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Ecclesiastes 3 - NRSVUE",
				"creators": [],
				"abstractNote": "Everything Has Its Time - For everything there is a season and a time for every matter under heaven: a time to be born and a time to die; a time to plant and a time to pluck up what is planted; a time to kill and a time to heal; a time to break down and a time to build up; a time to weep and a time to laugh; a time to mourn and a time to dance; a time to throw away stones and a time to gather stones together; a time to embrace and a time to refrain from embracing;",
				"language": "en",
				"libraryCatalog": "BibleGateway",
				"attachments": [
					{
						"title": "Passage",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "<h3>Chapter Overview</h3><p>Title: Eccl 3 - NRSVUE</p><p>&lt;p&gt;&lt;a class=&quot;bibleref&quot; data-bibleref=&quot;Eccl.3&quot; href=&quot;/passage/?search=Eccl 3&quot;&gt;Ecclesiastes 3&lt;/a&gt; opens with a poem in which the totality of life is represented here in a series of opposites.&lt;sup&gt;&lt;a data-resourceref=&quot;niv-application-bible/com21003001&quot; data-preview=&quot;3:1–8 The totality of life is represented here in a series of opposites.&quot;&gt;1&lt;/a&gt;&lt;/sup&gt; Rather than a formula for balance, these verses describe life more than they offer advice for life.&lt;sup&gt;&lt;a data-resourceref=&quot;quest-study-bible/does-this-describe-balanced-life-3-1&quot; data-preview=&quot;These verses describe life more than they offer advice for life.&quot;&gt;2&lt;/a&gt;&lt;/sup&gt;&lt;/p&gt;&lt;p&gt;The point is that humans have little or no control over times and changes. The eternal God sovereignly determines all of life&apos;s activities.&lt;sup&gt;&lt;a data-resourceref=&quot;niv-study-bible/ecc-3-1&quot; data-preview=&quot;3:1–22 Humans have little or no control over times and changes. The eternal God sovereignly determines all of life’s activities (e.g., the 14 opposites of vv.&quot;&gt;3&lt;/a&gt;&lt;/sup&gt; &lt;a class=&quot;bibleref&quot; data-bibleref=&quot;Eccl.3.11&quot; href=&quot;/passage/?search=Eccl 3:11&quot;&gt;Verse 11&lt;/a&gt; serves as a chapter summary: God&apos;s beautiful but tantalizing world is too big for us, yet its satisfactions are too small.&lt;sup&gt;&lt;a data-resourceref=&quot;niv-study-bible/ecc-3-11&quot; data-preview=&quot;3:11 A chapter summary: God’s beautiful but tantalizing world is too big for us, yet its satisfactions are too small.&quot;&gt;4&lt;/a&gt;&lt;/sup&gt;&lt;/p&gt;&lt;p&gt;God has set eternity in the human heart, meaning every person has a desire to know the big story of which they are a part. However, humans are limited and lack the necessary knowledge of the beginning and the end in order to know the time for everything.&lt;sup&gt;&lt;a data-resourceref=&quot;niv-biblical-theology/ecc-3-1-22&quot; data-preview=&quot;The problem for the Teacher is that God has set eternity in the human heart (v. 11), i.e., every person has a desire to know the big story of which they are a part. However, humans are limited and lack the necessary knowledge of the beginning and the end in order to know the time for everything.&quot;&gt;5&lt;/a&gt;&lt;/sup&gt; The Teacher&apos;s alternative is to give up on our quest for profit and recognition and to reorient our lives toward the Creator. The only rational response to reality is to &amp;quot;fear [God]&amp;quot; (&lt;a class=&quot;bibleref&quot; data-bibleref=&quot;Eccl.3.14&quot; href=&quot;/passage/?search=Eccl 3:14&quot;&gt;v. 14&lt;/a&gt;).&lt;sup&gt;&lt;a data-resourceref=&quot;niv-application-bible/com21003009&quot; data-preview=&quot;The alternative is to give up on our quest for profit and recognition and to reorient our lives toward the Creator. The only rational response to reality is to “fear [God]” (v. 14).&quot;&gt;6&lt;/a&gt;&lt;/sup&gt;&lt;/p&gt;&lt;p&gt;The chapter closes with injustice and death, where the Teacher is agnostic about life after death.&lt;sup&gt;&lt;a data-resourceref=&quot;niv-application-bible/com21003016&quot; data-preview=&quot;The Teacher is agnostic about life after death.&quot;&gt;7&lt;/a&gt;&lt;/sup&gt; This earthly view is included in the Bible to show us how futile life can be when it is lived without a divine perspective.&lt;sup&gt;&lt;a data-resourceref=&quot;quest-study-bible/why-would-biblical-writer-offer-no-hope-death-3-20&quot; data-preview=&quot;It is included in the Bible to show us how futile life can be when it is lived without a divine perspective.&quot;&gt;8&lt;/a&gt;&lt;/sup&gt; Instead, our response to his grace and blessing should be to seize the time that we have and live it well and joyfully to his glory and praise.&lt;sup&gt;&lt;a data-resourceref=&quot;niv-application-bible/appcom21003016&quot; data-preview=&quot;Our response to his grace and blessing should be to seize the time that we have and live it well and joyfully to his glory and praise.&quot;&gt;9&lt;/a&gt;&lt;/sup&gt;&lt;/p&gt;</p>"
					},
					{
						"note": "<h3>Chapter Overview</h3><p>Title: Eccl 4 - NRSVUE</p><p>&lt;p&gt;&lt;a class=&quot;bibleref&quot; data-bibleref=&quot;Eccl.4&quot; href=&quot;/passage/?search=Eccl 4&quot;&gt;Ecclesiastes 4&lt;/a&gt; continues the Teacher&apos;s search for meaning. Observation of oppression, work done from the wrong motivation, and human isolation make the Teacher question the meaning of life.&lt;sup&gt;&lt;a data-resourceref=&quot;niv-biblical-theology/ecc-4-1-12&quot; data-preview=&quot;Observation of oppression, work done from the wrong motivation, and human isolation make the Teacher question the meaning of life.&quot;&gt;1&lt;/a&gt;&lt;/sup&gt; Oppression is a theme already touched on (&lt;a class=&quot;bibleref&quot; data-bibleref=&quot;Eccl.3.16&quot; href=&quot;/passage/?search=Eccl 3:16&quot;&gt;3:16&lt;/a&gt;) and another ingredient in the human tragedy.&lt;sup&gt;&lt;a data-resourceref=&quot;niv-study-bible/ecc-4-1&quot; data-preview=&quot;A theme already touched on (3:16) and another ingredient in the human tragedy.&quot;&gt;2&lt;/a&gt;&lt;/sup&gt;&lt;/p&gt;&lt;p&gt;Seeing the powerless suffer, he concludes that the dead are better off than the living but that it is even better never to be born.&lt;sup&gt;&lt;a data-resourceref=&quot;niv-biblical-theology/ecc-4-1-3&quot; data-preview=&quot;He concludes that the dead are better off than the living but that it is even better never to be born.&quot;&gt;3&lt;/a&gt;&lt;/sup&gt; Turning to work, he finds that neither hard work (motivated by envy) nor idleness brings happiness, meaning or fulfillment.&lt;sup&gt;&lt;a data-resourceref=&quot;niv-study-bible/ecc-4-4&quot; data-preview=&quot;4:4–6 Neither hard work (motivated by envy) nor idleness brings happiness, meaning or fulfillment.&quot;&gt;4&lt;/a&gt;&lt;/sup&gt;&lt;/p&gt;&lt;p&gt;Yet the Teacher is also practical. While talking about a corrupt world full of troubles, he went on to suggest one way of coping: People are better off when they have friends to help them with the challenges of life.&lt;sup&gt;&lt;a data-resourceref=&quot;quest-study-bible/why-did-teacher-mention-value-companionship-4-9-12&quot; data-preview=&quot;So while talking about a corrupt world full of troubles, he went on to suggest one way of coping: People are better off when they have friends to help them with the challenges of life.&quot;&gt;5&lt;/a&gt;&lt;/sup&gt; His image of a three-strand cord has a remarkable parallel in the Gilgamesh Epic, in which Gilgamesh encourages his friend Enkidu about the value of friendship.&lt;sup&gt;&lt;a data-resourceref=&quot;niv-cultural-backgrounds/ecc-4-12&quot; data-preview=&quot;This has a remarkable parallel in the Gilgamesh Epic, in which Gilgamesh encourages his friend Enkidu about the value of friendship: “Two men will not die; the towed boat will not sink, / a towrope of three strands cannot be cut.” Both texts speak of the security that two can offer one another and then use the analogy of a three-stranded rope.&quot;&gt;6&lt;/a&gt;&lt;/sup&gt;&lt;/p&gt;&lt;p&gt;For Christians, this chapter is a reminder that the religious individualism that lays great emphasis on a person&apos;s relationship with God but little emphasis on a person&apos;s social, economic, political, and religious relationships with other people has little, in the end, to do with the Bible.&lt;sup&gt;&lt;a data-resourceref=&quot;niv-application-bible/appcom21004008&quot; data-preview=&quot;✜ 4:1–16 The religious individualism that lays great emphasis on a person’s relationship with God but little emphasis on a person’s social, economic, political, and religious relationships with other people has little, in the end, to do with the Bible.&quot;&gt;7&lt;/a&gt;&lt;/sup&gt;&lt;/p&gt;</p>"
					},
					{
						"note": "<h3>Chapter Overview</h3><p>Title: Eccl 5 - NRSVUE</p><p>&lt;p&gt;&lt;a class=&quot;bibleref&quot; data-bibleref=&quot;Eccl.5&quot; href=&quot;/passage/?search=Eccl 5&quot;&gt;Ecclesiastes 5&lt;/a&gt; has two parts: reverent worship (&lt;a class=&quot;bibleref&quot; data-bibleref=&quot;Eccl.5.1-Eccl.5.7&quot; href=&quot;/passage/?search=Eccl 5:1-Eccl 5:7&quot;&gt;vv. 1–7&lt;/a&gt;) and the problem of wealth (&lt;a class=&quot;bibleref&quot; data-bibleref=&quot;Eccl.5.8-Eccl.5.20&quot; href=&quot;/passage/?search=Eccl 5:8-Eccl 5:20&quot;&gt;vv. 8–20&lt;/a&gt;).&lt;/p&gt;&lt;p&gt;The theme of the first section is the meaninglessness of superficial religion, as reflected in making rash vows.&lt;sup&gt;&lt;a data-resourceref=&quot;niv-study-bible/ecc-5-1&quot; data-preview=&quot;5:1–7 The theme of this section is the meaninglessness of superficial religion, as reflected in making rash vows.&quot;&gt;1&lt;/a&gt;&lt;/sup&gt; The Teacher counsels us to approach God&apos;s presence reverently and carefully&lt;sup&gt;&lt;a data-resourceref=&quot;niv-biblical-theology/ecc-5-1&quot; data-preview=&quot;Approach God’s presence reverently and carefully.&quot;&gt;2&lt;/a&gt;&lt;/sup&gt; and to listen, which means not just hear but also obey.&lt;sup&gt;&lt;a data-resourceref=&quot;niv-study-bible/ecc-5-1-1&quot; data-preview=&quot;Not just hear but also obey.&quot;&gt;3&lt;/a&gt;&lt;/sup&gt; Vows were not required, but once a vow was made, it was imperative that it be fulfilled.&lt;sup&gt;&lt;a data-resourceref=&quot;quest-study-bible/is-it-better-have-no-intentions-unachieved-good&quot; data-preview=&quot;Vows were not required, but once a vow was made, it was imperative that it be fulfilled.&quot;&gt;4&lt;/a&gt;&lt;/sup&gt;&lt;/p&gt;&lt;p&gt;In the second section, the Teacher returns to the subject of oppression (vv. 8–9; &lt;a class=&quot;bibleref&quot; data-bibleref=&quot;Eccl.4.1-Eccl.4.3&quot; href=&quot;/passage/?search=Eccl 4:1-Eccl 4:3&quot;&gt;4:1–3&lt;/a&gt;) and then explores how the love of money destroys people (&lt;a class=&quot;bibleref&quot; data-bibleref=&quot;Eccl.4.10-Eccl.4.16&quot; href=&quot;/passage/?search=Eccl 4:10-Eccl 4:16&quot;&gt;vv. 10–17&lt;/a&gt;).&lt;sup&gt;&lt;a data-resourceref=&quot;niv-biblical-theology/ecc-5-8-17&quot; data-preview=&quot;5:8–17 The Teacher returns to the subject of oppression (vv. 8–9; 4:1–3) and then explores how the love of money destroys people (vv. 10–17).&quot;&gt;5&lt;/a&gt;&lt;/sup&gt; Like all false gods, money never fulfills those who pursue it; it only feeds the insatiable desire for more.&lt;sup&gt;&lt;a data-resourceref=&quot;niv-application-bible/com21005010&quot; data-preview=&quot;5:10 Like all false gods, money never fulfills those who pursue it; it only feeds the insatiable desire for more.&quot;&gt;6&lt;/a&gt;&lt;/sup&gt;&lt;/p&gt;&lt;p&gt;Yet the chapter ends with hope. Wealth and possessions, a source of such trouble in the previous section, are a gift to enjoy.&lt;sup&gt;&lt;a data-resourceref=&quot;niv-biblical-theology/ecc-5-18-20&quot; data-preview=&quot;16–17 is remarkable: in v. 17, “they eat in darkness, with great frustration, affliction and anger,” but in v. 18 what is good is “to eat, to drink and to find satisfaction.” Wealth and possessions, a source of such trouble in the previous section, are a gift to enjoy.&quot;&gt;7&lt;/a&gt;&lt;/sup&gt; The lesson: mortals are weak and perishing, and this should drive them to understand the real meaning of the fear of God.&lt;sup&gt;&lt;a data-resourceref=&quot;niv-cultural-backgrounds/ecc-5-2&quot; data-preview=&quot;Ecclesiastes begins with the same premise, but moves in a different direction: Mortals are weak and perishing, and this should drive them to understand the real meaning of the fear of God.&quot;&gt;8&lt;/a&gt;&lt;/sup&gt;&lt;/p&gt;</p>"
					}
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
