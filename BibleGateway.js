{
	"translatorID": "eca3c08a-252b-4030-9df2-d25026e1e69d",
	"label": "BibleGateway",
	"creator": "",
	"target": "^https?://www\\.biblegateway\\.com/",
	"minVersion": "7.0",
	"maxVersion": "",
	"priority": 200,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-11-27 19:06:20"
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
	if (!url.includes('biblegateway.com')) {
		return false;
	}
	if (isPassageUrl(url) && doc.querySelector('.passage-text')) {
		return "bookSection";
	}
	return false;
}

async function doWeb(doc, url) {
	await scrape(doc, url);
}

const docStyle = `
			body { font-family: Georgia, serif; line-height: 1.6; max-width: 700px; margin: 2rem auto; padding: 0 1rem; }
			.versenum, sup { font-size: 0.75em; vertical-align: super; color: #666; }
			h1, h3, h4 { font-family: sans-serif; }
		`;

async function getChapterOverview(translation, chapterOsis) {
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
			for (let [k, v] of Object.entries(error)) {
				Zotero.debug(`Get Chapter error field ${k}: ${v}`);
			}
		}
	}
	return response.body?.data?.bible?.chapterOverview?.content;
}

async function scrape(doc, url = doc.location.href) {
	let item = new Zotero.Item('bookSection');
	let langEl = doc.querySelector("html");

	if (langEl) {
		item.language = langEl.getAttribute("lang");
	}
	let verEl = doc.querySelector("div.version-display");
	let translation;
	if (verEl) {
		translation = verEl.innerHTML.trim();
	}
	else {
		Zotero.debug("No version element found");
	}

	let translationLong = text(doc, 'span.translation span.dropdown-display-text');

	let osis = attr(doc, 'div.passage-table', 'data-osis');

	const titleRe = /^([A-Z a-z\d]+ \d+(?::\d+)?)(?:[-–]\d+(?::\d+)?)?\s+([A-Z][A-Z0-9]+)(?= -)/gm;
	let match = titleRe.exec(doc.title);

	let pageTitle = match[0];
	if (!osis) {
		osis = match[1];
	}
	if (!translation) {
		translation = match[2];
	}
	item.bookTitle = `The Bible, ${translationLong}`;

	item.extra = item.extra ? item.extra + `\ntranslation-code: ${translation}` : `translation-code: ${translation}`;
	// ToDo add translation name to extra as well
	let descEl = doc.querySelector('[property~="og:description"]');
	if (descEl) {
		item.abstractNote = descEl.getAttribute("content");
	}

	item.title = `${pageTitle}`;
	item.attachments = [];
	let passageEl = doc.querySelector(".passage-text");
	if (passageEl) {
		// Build a minimal HTML document for the snapshot
		let cleanDoc = new DOMParser().parseFromString(
			`<!DOCTYPE html><html><head>
			<title>${ZU.htmlSpecialChars(item.title)}</title>
			<style>${docStyle}</style></head><body></body></html>`,
			"text/html"
		);

		cleanDoc.body.innerHTML = passageEl.outerHTML;

		item.attachments.push({
			title: "Passage",
			url: url,
			mimeType: "text/html",
			document: cleanDoc
		});
	}
	else {
		Zotero.debug(`did not find .passage-text for ${url}`);
	}

	let chapterRe = /(\w+)\.(\d+)(?:\.\d+)?/g;
	let chapterOsises = [...osis.matchAll(chapterRe)].map(m => ({ book: m[1], chapter: parseInt(m[2]) }));
	Zotero.debug(`chapter osises: ${chapterOsises}`);
	if (chapterOsises.length > 1) {
		let chapter = chapterOsises[0].chapter;
		let book = chapterOsises[0].book;
		let lastChapter = chapterOsises[1].chapter;
		chapterOsises.length = 0;
		while (chapter <= lastChapter) {
			chapterOsises.push({ book: book, chapter: chapter });
			chapter += 1;
		}
	}
	for (let chapterOsis of chapterOsises) {
		let overview = await getChapterOverview(translation, chapterOsis);
		if (overview) {
			item.notes.push({
				note: `<h3>Chapter Overview</h3><p>Title: ${chapterOsis.book} ${chapterOsis.chapter}</p>`
				+ "<p>" + ZU.htmlSpecialChars(overview) + '</p>'
			});
		}
		else {
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
				"title": "Isaiah 53 NRSVUE",
				"creators": [],
				"abstractNote": "Who has believed what we have heard? And to whom has the arm of the LORD been revealed? For he grew up before him like a young plant and like a root out of dry ground; he had no form or majesty that we should look at him, nothing in his appearance that we should desire him. He was despised and rejected by others; a man of suffering and acquainted with infirmity, and as one from whom others hide their faces he was despised, and we held him of no account. Surely he has borne our infirmities and carried our diseases, yet we accounted him stricken, struck down by God, and afflicted. But he was wounded for our transgressions, crushed for our iniquities; upon him was the punishment that made us whole, and by his bruises we are healed.",
				"bookTitle": "The Bible, New Revised Standard Version Updated Edition",
				"extra": "translation-code: NRSVUE",
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
						"note": "<h3>Chapter Overview</h3><p>Title: Isa 53</p><p>&lt;p&gt;&lt;a class=&quot;bibleref&quot; data-bibleref=&quot;Isa.53&quot; href=&quot;/passage/?search=Isa 53&quot;&gt;Isaiah 53&lt;/a&gt; is the last, longest and arguably the loveliest of the suffering servant songs in the book of Isaiah.&lt;sup&gt;&lt;a data-resourceref=&quot;niv-study-bible/isa-53-5&quot; data-preview=&quot;53:5 The centering verse of 52:13—53:12, the last, longest and arguably the loveliest of the suffering servant songs in the book of Isaiah (see note on 42:1–4).&quot;&gt;1&lt;/a&gt;&lt;/sup&gt; &amp;quot;Peace,&amp;quot; therefore, is a central theme in &lt;a class=&quot;bibleref&quot; data-bibleref=&quot;Isa.40-Isa.66&quot; href=&quot;/passage/?search=Isa 40-Isa 66&quot;&gt;chs. 40–66&lt;/a&gt; generally and &lt;a class=&quot;bibleref&quot; data-bibleref=&quot;Isa.52.13-Isa.53.12&quot; href=&quot;/passage/?search=Isa 52:13-Isa 53:12&quot;&gt;52:13—53:12&lt;/a&gt; specifically. Such overarching and overwhelming shalom could be &amp;quot;brought&amp;quot; to God&apos;s people only by the atoning sacrifice of the One who was &amp;quot;pierced for our transgressions&amp;quot; and &amp;quot;crushed for our iniquities.&amp;quot;&lt;sup&gt;&lt;a data-resourceref=&quot;niv-study-bible/isa-53-5&quot; data-preview=&quot;“Peace,” therefore, is a central theme in chs. 40–66 generally and 52:13—53:12 specifically. Such overarching and overwhelming shalom could be “brought” to God’s people only by the atoning sacrifice of the One who was “pierced for our transgressions” and “crushed for our iniquities” (see v. 12 and note; cf.&quot;&gt;2&lt;/a&gt;&lt;/sup&gt;&lt;/p&gt;&lt;p&gt;The servant comes in a quiet and unassuming way (&lt;a class=&quot;bibleref&quot; data-bibleref=&quot;Isa.53.2&quot; href=&quot;/passage/?search=Isa 53:2&quot;&gt;v. 2&lt;/a&gt;). His &amp;quot;appearance&amp;quot; is quite ordinary (&lt;a class=&quot;bibleref&quot; data-bibleref=&quot;Isa.53.2&quot; href=&quot;/passage/?search=Isa 53:2&quot;&gt;v. 2&lt;/a&gt;). He takes on himself the pain and &amp;quot;suffering&amp;quot; of the world (&lt;a class=&quot;bibleref&quot; data-bibleref=&quot;Isa.53.3&quot; href=&quot;/passage/?search=Isa 53:3&quot;&gt;v. 3&lt;/a&gt;).&lt;sup&gt;&lt;a data-resourceref=&quot;niv-application-bible/com23053001&quot; data-preview=&quot;(1) He comes in a quiet and unassuming way (v. 2). (2) His “appearance” is quite ordinary (v. 2). (3) He takes on himself the pain and “suffering” of the world (v. 3).&quot;&gt;3&lt;/a&gt;&lt;/sup&gt; Everything that happened to the servant was in fact what should have happened to us&lt;sup&gt;&lt;a data-resourceref=&quot;niv-biblical-theology/isa-53-4-6&quot; data-preview=&quot;Everything that happened to the servant was in fact what should have happened to us (cf.&quot;&gt;4&lt;/a&gt;&lt;/sup&gt; and the sins &amp;quot;laid on him&amp;quot; are similar to the action of the high priest on the Day of Atonement when he laid the sins of the people on the scapegoat (&lt;a class=&quot;bibleref&quot; data-bibleref=&quot;Lev.16.21&quot; href=&quot;/passage/?search=Lev 16:21&quot;&gt;Lev 16:21&lt;/a&gt;).&lt;sup&gt;&lt;a data-resourceref=&quot;niv-biblical-theology/isa-53-6&quot; data-preview=&quot;Similar to the action of the high priest on the Day of Atonement when he laid the sins of the people on the scapegoat (Lev 16:21).&quot;&gt;5&lt;/a&gt;&lt;/sup&gt;&lt;/p&gt;&lt;p&gt;His death was not accidental; these things happened because &amp;quot;it was the LORD&apos;s will&amp;quot; (&lt;a class=&quot;bibleref&quot; data-bibleref=&quot;Isa.53.10&quot; href=&quot;/passage/?search=Isa 53:10&quot;&gt;v. 10&lt;/a&gt;), and this expresses not cruelty but love for a lost world.&lt;sup&gt;&lt;a data-resourceref=&quot;niv-biblical-theology/isa-53-10-12&quot; data-preview=&quot;These things happened not accidentally or merely because this is an unjust world but because “it was the LORD’s will” (v. 10).&quot;&gt;6&lt;/a&gt;, &lt;a data-resourceref=&quot;niv-biblical-theology/isa-53-10-12&quot; data-preview=&quot;But this expresses not cruelty but love for a lost world.&quot;&gt;7&lt;/a&gt;&lt;/sup&gt; Because the servant has suffered in &amp;quot;our&amp;quot; place (vv. 4–6), we need not suffer for our sins but can be declared innocent (&lt;a class=&quot;bibleref&quot; data-bibleref=&quot;Rom.3.20-Rom.3.24&quot; href=&quot;/passage/?search=Rom 3:20-Rom 3:24&quot;&gt;Rom 3:20–24&lt;/a&gt;).&lt;sup&gt;&lt;a data-resourceref=&quot;niv-biblical-theology/isa-53-11&quot; data-preview=&quot;Because the servant has suffered in “our” place (vv. 4–6), we need not suffer for our sins but can be declared innocent (Rom 3:20–24).&quot;&gt;8&lt;/a&gt;&lt;/sup&gt; Peter quotes these lines as he encourages believers to endure unjust suffering (see &lt;a class=&quot;bibleref&quot; data-bibleref=&quot;1Pet.2.22&quot; href=&quot;/passage/?search=1Pet 2:22&quot;&gt;1Pe 2:22&lt;/a&gt; and note).&lt;sup&gt;&lt;a data-resourceref=&quot;niv-study-bible/isa-53-9&quot; data-preview=&quot;Peter quotes these lines as he encourages believers to endure unjust suffering (see 1Pe 2:22 and note).&quot;&gt;9&lt;/a&gt;&lt;/sup&gt;&lt;/p&gt;</p>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.biblegateway.com/passage/?search=Isaiah%2053%3A12&version=NIV",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Isaiah 53:12 NIV",
				"creators": [],
				"abstractNote": "Therefore I will give him a portion among the great, and he will divide the spoils with the strong, because he poured out his life unto death, and was numbered with the transgressors. For he bore the sin of many, and made intercession for the transgressors.",
				"bookTitle": "The Bible, New International Version",
				"extra": "translation-code: NIV",
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
						"note": "<h3>Chapter Overview</h3><p>Title: Isa 53</p><p>&lt;p&gt;&lt;a class=&quot;bibleref&quot; data-bibleref=&quot;Isa.53&quot; href=&quot;/passage/?search=Isa 53&quot;&gt;Isaiah 53&lt;/a&gt; is the last, longest and arguably the loveliest of the suffering servant songs in the book of Isaiah.&lt;sup&gt;&lt;a data-resourceref=&quot;niv-study-bible/isa-53-5&quot; data-preview=&quot;53:5 The centering verse of 52:13—53:12, the last, longest and arguably the loveliest of the suffering servant songs in the book of Isaiah (see note on 42:1–4).&quot;&gt;1&lt;/a&gt;&lt;/sup&gt; &amp;quot;Peace,&amp;quot; therefore, is a central theme in &lt;a class=&quot;bibleref&quot; data-bibleref=&quot;Isa.40-Isa.66&quot; href=&quot;/passage/?search=Isa 40-Isa 66&quot;&gt;chs. 40–66&lt;/a&gt; generally and &lt;a class=&quot;bibleref&quot; data-bibleref=&quot;Isa.52.13-Isa.53.12&quot; href=&quot;/passage/?search=Isa 52:13-Isa 53:12&quot;&gt;52:13—53:12&lt;/a&gt; specifically. Such overarching and overwhelming shalom could be &amp;quot;brought&amp;quot; to God&apos;s people only by the atoning sacrifice of the One who was &amp;quot;pierced for our transgressions&amp;quot; and &amp;quot;crushed for our iniquities.&amp;quot;&lt;sup&gt;&lt;a data-resourceref=&quot;niv-study-bible/isa-53-5&quot; data-preview=&quot;“Peace,” therefore, is a central theme in chs. 40–66 generally and 52:13—53:12 specifically. Such overarching and overwhelming shalom could be “brought” to God’s people only by the atoning sacrifice of the One who was “pierced for our transgressions” and “crushed for our iniquities” (see v. 12 and note; cf.&quot;&gt;2&lt;/a&gt;&lt;/sup&gt;&lt;/p&gt;&lt;p&gt;The servant comes in a quiet and unassuming way (&lt;a class=&quot;bibleref&quot; data-bibleref=&quot;Isa.53.2&quot; href=&quot;/passage/?search=Isa 53:2&quot;&gt;v. 2&lt;/a&gt;). His &amp;quot;appearance&amp;quot; is quite ordinary (&lt;a class=&quot;bibleref&quot; data-bibleref=&quot;Isa.53.2&quot; href=&quot;/passage/?search=Isa 53:2&quot;&gt;v. 2&lt;/a&gt;). He takes on himself the pain and &amp;quot;suffering&amp;quot; of the world (&lt;a class=&quot;bibleref&quot; data-bibleref=&quot;Isa.53.3&quot; href=&quot;/passage/?search=Isa 53:3&quot;&gt;v. 3&lt;/a&gt;).&lt;sup&gt;&lt;a data-resourceref=&quot;niv-application-bible/com23053001&quot; data-preview=&quot;(1) He comes in a quiet and unassuming way (v. 2). (2) His “appearance” is quite ordinary (v. 2). (3) He takes on himself the pain and “suffering” of the world (v. 3).&quot;&gt;3&lt;/a&gt;&lt;/sup&gt; Everything that happened to the servant was in fact what should have happened to us&lt;sup&gt;&lt;a data-resourceref=&quot;niv-biblical-theology/isa-53-4-6&quot; data-preview=&quot;Everything that happened to the servant was in fact what should have happened to us (cf.&quot;&gt;4&lt;/a&gt;&lt;/sup&gt; and the sins &amp;quot;laid on him&amp;quot; are similar to the action of the high priest on the Day of Atonement when he laid the sins of the people on the scapegoat (&lt;a class=&quot;bibleref&quot; data-bibleref=&quot;Lev.16.21&quot; href=&quot;/passage/?search=Lev 16:21&quot;&gt;Lev 16:21&lt;/a&gt;).&lt;sup&gt;&lt;a data-resourceref=&quot;niv-biblical-theology/isa-53-6&quot; data-preview=&quot;Similar to the action of the high priest on the Day of Atonement when he laid the sins of the people on the scapegoat (Lev 16:21).&quot;&gt;5&lt;/a&gt;&lt;/sup&gt;&lt;/p&gt;&lt;p&gt;His death was not accidental; these things happened because &amp;quot;it was the LORD&apos;s will&amp;quot; (&lt;a class=&quot;bibleref&quot; data-bibleref=&quot;Isa.53.10&quot; href=&quot;/passage/?search=Isa 53:10&quot;&gt;v. 10&lt;/a&gt;), and this expresses not cruelty but love for a lost world.&lt;sup&gt;&lt;a data-resourceref=&quot;niv-biblical-theology/isa-53-10-12&quot; data-preview=&quot;These things happened not accidentally or merely because this is an unjust world but because “it was the LORD’s will” (v. 10).&quot;&gt;6&lt;/a&gt;, &lt;a data-resourceref=&quot;niv-biblical-theology/isa-53-10-12&quot; data-preview=&quot;But this expresses not cruelty but love for a lost world.&quot;&gt;7&lt;/a&gt;&lt;/sup&gt; Because the servant has suffered in &amp;quot;our&amp;quot; place (vv. 4–6), we need not suffer for our sins but can be declared innocent (&lt;a class=&quot;bibleref&quot; data-bibleref=&quot;Rom.3.20-Rom.3.24&quot; href=&quot;/passage/?search=Rom 3:20-Rom 3:24&quot;&gt;Rom 3:20–24&lt;/a&gt;).&lt;sup&gt;&lt;a data-resourceref=&quot;niv-biblical-theology/isa-53-11&quot; data-preview=&quot;Because the servant has suffered in “our” place (vv. 4–6), we need not suffer for our sins but can be declared innocent (Rom 3:20–24).&quot;&gt;8&lt;/a&gt;&lt;/sup&gt; Peter quotes these lines as he encourages believers to endure unjust suffering (see &lt;a class=&quot;bibleref&quot; data-bibleref=&quot;1Pet.2.22&quot; href=&quot;/passage/?search=1Pet 2:22&quot;&gt;1Pe 2:22&lt;/a&gt; and note).&lt;sup&gt;&lt;a data-resourceref=&quot;niv-study-bible/isa-53-9&quot; data-preview=&quot;Peter quotes these lines as he encourages believers to endure unjust suffering (see 1Pe 2:22 and note).&quot;&gt;9&lt;/a&gt;&lt;/sup&gt;&lt;/p&gt;</p>"
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
		"url": "https://www.biblegateway.com/passage/?search=Ecclesiastes%203-5&version=KJV",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Ecclesiastes 3-5 KJV",
				"creators": [],
				"abstractNote": "To every thing there is a season, and a time to every purpose under the heaven: A time to be born, and a time to die; a time to plant, and a time to pluck up that which is planted; A time to kill, and a time to heal; a time to break down, and a time to build up; A time to weep, and a time to laugh; a time to mourn, and a time to dance; A time to cast away stones, and a time to gather stones together; a time to embrace, and a time to refrain from embracing;",
				"bookTitle": "The Bible, King James Version",
				"extra": "translation-code: KJV",
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
						"note": "<h3>Chapter Overview</h3><p>Title: Eccl 3</p><p>&lt;p&gt;&lt;a class=&quot;bibleref&quot; data-bibleref=&quot;Eccl.3&quot; href=&quot;/passage/?search=Eccl 3&quot;&gt;Ecclesiastes 3&lt;/a&gt; opens with a poem in which the totality of life is represented here in a series of opposites.&lt;sup&gt;&lt;a data-resourceref=&quot;niv-application-bible/com21003001&quot; data-preview=&quot;3:1–8 The totality of life is represented here in a series of opposites.&quot;&gt;1&lt;/a&gt;&lt;/sup&gt; Rather than a formula for balance, these verses describe life more than they offer advice for life.&lt;sup&gt;&lt;a data-resourceref=&quot;quest-study-bible/does-this-describe-balanced-life-3-1&quot; data-preview=&quot;These verses describe life more than they offer advice for life.&quot;&gt;2&lt;/a&gt;&lt;/sup&gt;&lt;/p&gt;&lt;p&gt;The point is that humans have little or no control over times and changes. The eternal God sovereignly determines all of life&apos;s activities.&lt;sup&gt;&lt;a data-resourceref=&quot;niv-study-bible/ecc-3-1&quot; data-preview=&quot;3:1–22 Humans have little or no control over times and changes. The eternal God sovereignly determines all of life’s activities (e.g., the 14 opposites of vv.&quot;&gt;3&lt;/a&gt;&lt;/sup&gt; &lt;a class=&quot;bibleref&quot; data-bibleref=&quot;Eccl.3.11&quot; href=&quot;/passage/?search=Eccl 3:11&quot;&gt;Verse 11&lt;/a&gt; serves as a chapter summary: God&apos;s beautiful but tantalizing world is too big for us, yet its satisfactions are too small.&lt;sup&gt;&lt;a data-resourceref=&quot;niv-study-bible/ecc-3-11&quot; data-preview=&quot;3:11 A chapter summary: God’s beautiful but tantalizing world is too big for us, yet its satisfactions are too small.&quot;&gt;4&lt;/a&gt;&lt;/sup&gt;&lt;/p&gt;&lt;p&gt;God has set eternity in the human heart, meaning every person has a desire to know the big story of which they are a part. However, humans are limited and lack the necessary knowledge of the beginning and the end in order to know the time for everything.&lt;sup&gt;&lt;a data-resourceref=&quot;niv-biblical-theology/ecc-3-1-22&quot; data-preview=&quot;The problem for the Teacher is that God has set eternity in the human heart (v. 11), i.e., every person has a desire to know the big story of which they are a part. However, humans are limited and lack the necessary knowledge of the beginning and the end in order to know the time for everything.&quot;&gt;5&lt;/a&gt;&lt;/sup&gt; The Teacher&apos;s alternative is to give up on our quest for profit and recognition and to reorient our lives toward the Creator. The only rational response to reality is to &amp;quot;fear [God]&amp;quot; (&lt;a class=&quot;bibleref&quot; data-bibleref=&quot;Eccl.3.14&quot; href=&quot;/passage/?search=Eccl 3:14&quot;&gt;v. 14&lt;/a&gt;).&lt;sup&gt;&lt;a data-resourceref=&quot;niv-application-bible/com21003009&quot; data-preview=&quot;The alternative is to give up on our quest for profit and recognition and to reorient our lives toward the Creator. The only rational response to reality is to “fear [God]” (v. 14).&quot;&gt;6&lt;/a&gt;&lt;/sup&gt;&lt;/p&gt;&lt;p&gt;The chapter closes with injustice and death, where the Teacher is agnostic about life after death.&lt;sup&gt;&lt;a data-resourceref=&quot;niv-application-bible/com21003016&quot; data-preview=&quot;The Teacher is agnostic about life after death.&quot;&gt;7&lt;/a&gt;&lt;/sup&gt; This earthly view is included in the Bible to show us how futile life can be when it is lived without a divine perspective.&lt;sup&gt;&lt;a data-resourceref=&quot;quest-study-bible/why-would-biblical-writer-offer-no-hope-death-3-20&quot; data-preview=&quot;It is included in the Bible to show us how futile life can be when it is lived without a divine perspective.&quot;&gt;8&lt;/a&gt;&lt;/sup&gt; Instead, our response to his grace and blessing should be to seize the time that we have and live it well and joyfully to his glory and praise.&lt;sup&gt;&lt;a data-resourceref=&quot;niv-application-bible/appcom21003016&quot; data-preview=&quot;Our response to his grace and blessing should be to seize the time that we have and live it well and joyfully to his glory and praise.&quot;&gt;9&lt;/a&gt;&lt;/sup&gt;&lt;/p&gt;</p>"
					},
					{
						"note": "<h3>Chapter Overview</h3><p>Title: Eccl 4</p><p>&lt;p&gt;&lt;a class=&quot;bibleref&quot; data-bibleref=&quot;Eccl.4&quot; href=&quot;/passage/?search=Eccl 4&quot;&gt;Ecclesiastes 4&lt;/a&gt; continues the Teacher&apos;s search for meaning. Observation of oppression, work done from the wrong motivation, and human isolation make the Teacher question the meaning of life.&lt;sup&gt;&lt;a data-resourceref=&quot;niv-biblical-theology/ecc-4-1-12&quot; data-preview=&quot;Observation of oppression, work done from the wrong motivation, and human isolation make the Teacher question the meaning of life.&quot;&gt;1&lt;/a&gt;&lt;/sup&gt; Oppression is a theme already touched on (&lt;a class=&quot;bibleref&quot; data-bibleref=&quot;Eccl.3.16&quot; href=&quot;/passage/?search=Eccl 3:16&quot;&gt;3:16&lt;/a&gt;) and another ingredient in the human tragedy.&lt;sup&gt;&lt;a data-resourceref=&quot;niv-study-bible/ecc-4-1&quot; data-preview=&quot;A theme already touched on (3:16) and another ingredient in the human tragedy.&quot;&gt;2&lt;/a&gt;&lt;/sup&gt;&lt;/p&gt;&lt;p&gt;Seeing the powerless suffer, he concludes that the dead are better off than the living but that it is even better never to be born.&lt;sup&gt;&lt;a data-resourceref=&quot;niv-biblical-theology/ecc-4-1-3&quot; data-preview=&quot;He concludes that the dead are better off than the living but that it is even better never to be born.&quot;&gt;3&lt;/a&gt;&lt;/sup&gt; Turning to work, he finds that neither hard work (motivated by envy) nor idleness brings happiness, meaning or fulfillment.&lt;sup&gt;&lt;a data-resourceref=&quot;niv-study-bible/ecc-4-4&quot; data-preview=&quot;4:4–6 Neither hard work (motivated by envy) nor idleness brings happiness, meaning or fulfillment.&quot;&gt;4&lt;/a&gt;&lt;/sup&gt;&lt;/p&gt;&lt;p&gt;Yet the Teacher is also practical. While talking about a corrupt world full of troubles, he went on to suggest one way of coping: People are better off when they have friends to help them with the challenges of life.&lt;sup&gt;&lt;a data-resourceref=&quot;quest-study-bible/why-did-teacher-mention-value-companionship-4-9-12&quot; data-preview=&quot;So while talking about a corrupt world full of troubles, he went on to suggest one way of coping: People are better off when they have friends to help them with the challenges of life.&quot;&gt;5&lt;/a&gt;&lt;/sup&gt; His image of a three-strand cord has a remarkable parallel in the Gilgamesh Epic, in which Gilgamesh encourages his friend Enkidu about the value of friendship.&lt;sup&gt;&lt;a data-resourceref=&quot;niv-cultural-backgrounds/ecc-4-12&quot; data-preview=&quot;This has a remarkable parallel in the Gilgamesh Epic, in which Gilgamesh encourages his friend Enkidu about the value of friendship: “Two men will not die; the towed boat will not sink, / a towrope of three strands cannot be cut.” Both texts speak of the security that two can offer one another and then use the analogy of a three-stranded rope.&quot;&gt;6&lt;/a&gt;&lt;/sup&gt;&lt;/p&gt;&lt;p&gt;For Christians, this chapter is a reminder that the religious individualism that lays great emphasis on a person&apos;s relationship with God but little emphasis on a person&apos;s social, economic, political, and religious relationships with other people has little, in the end, to do with the Bible.&lt;sup&gt;&lt;a data-resourceref=&quot;niv-application-bible/appcom21004008&quot; data-preview=&quot;✜ 4:1–16 The religious individualism that lays great emphasis on a person’s relationship with God but little emphasis on a person’s social, economic, political, and religious relationships with other people has little, in the end, to do with the Bible.&quot;&gt;7&lt;/a&gt;&lt;/sup&gt;&lt;/p&gt;</p>"
					},
					{
						"note": "<h3>Chapter Overview</h3><p>Title: Eccl 5</p><p>&lt;p&gt;&lt;a class=&quot;bibleref&quot; data-bibleref=&quot;Eccl.5&quot; href=&quot;/passage/?search=Eccl 5&quot;&gt;Ecclesiastes 5&lt;/a&gt; has two parts: reverent worship (&lt;a class=&quot;bibleref&quot; data-bibleref=&quot;Eccl.5.1-Eccl.5.7&quot; href=&quot;/passage/?search=Eccl 5:1-Eccl 5:7&quot;&gt;vv. 1–7&lt;/a&gt;) and the problem of wealth (&lt;a class=&quot;bibleref&quot; data-bibleref=&quot;Eccl.5.8-Eccl.5.20&quot; href=&quot;/passage/?search=Eccl 5:8-Eccl 5:20&quot;&gt;vv. 8–20&lt;/a&gt;).&lt;/p&gt;&lt;p&gt;The theme of the first section is the meaninglessness of superficial religion, as reflected in making rash vows.&lt;sup&gt;&lt;a data-resourceref=&quot;niv-study-bible/ecc-5-1&quot; data-preview=&quot;5:1–7 The theme of this section is the meaninglessness of superficial religion, as reflected in making rash vows.&quot;&gt;1&lt;/a&gt;&lt;/sup&gt; The Teacher counsels us to approach God&apos;s presence reverently and carefully&lt;sup&gt;&lt;a data-resourceref=&quot;niv-biblical-theology/ecc-5-1&quot; data-preview=&quot;Approach God’s presence reverently and carefully.&quot;&gt;2&lt;/a&gt;&lt;/sup&gt; and to listen, which means not just hear but also obey.&lt;sup&gt;&lt;a data-resourceref=&quot;niv-study-bible/ecc-5-1-1&quot; data-preview=&quot;Not just hear but also obey.&quot;&gt;3&lt;/a&gt;&lt;/sup&gt; Vows were not required, but once a vow was made, it was imperative that it be fulfilled.&lt;sup&gt;&lt;a data-resourceref=&quot;quest-study-bible/is-it-better-have-no-intentions-unachieved-good&quot; data-preview=&quot;Vows were not required, but once a vow was made, it was imperative that it be fulfilled.&quot;&gt;4&lt;/a&gt;&lt;/sup&gt;&lt;/p&gt;&lt;p&gt;In the second section, the Teacher returns to the subject of oppression (vv. 8–9; &lt;a class=&quot;bibleref&quot; data-bibleref=&quot;Eccl.4.1-Eccl.4.3&quot; href=&quot;/passage/?search=Eccl 4:1-Eccl 4:3&quot;&gt;4:1–3&lt;/a&gt;) and then explores how the love of money destroys people (&lt;a class=&quot;bibleref&quot; data-bibleref=&quot;Eccl.4.10-Eccl.4.16&quot; href=&quot;/passage/?search=Eccl 4:10-Eccl 4:16&quot;&gt;vv. 10–17&lt;/a&gt;).&lt;sup&gt;&lt;a data-resourceref=&quot;niv-biblical-theology/ecc-5-8-17&quot; data-preview=&quot;5:8–17 The Teacher returns to the subject of oppression (vv. 8–9; 4:1–3) and then explores how the love of money destroys people (vv. 10–17).&quot;&gt;5&lt;/a&gt;&lt;/sup&gt; Like all false gods, money never fulfills those who pursue it; it only feeds the insatiable desire for more.&lt;sup&gt;&lt;a data-resourceref=&quot;niv-application-bible/com21005010&quot; data-preview=&quot;5:10 Like all false gods, money never fulfills those who pursue it; it only feeds the insatiable desire for more.&quot;&gt;6&lt;/a&gt;&lt;/sup&gt;&lt;/p&gt;&lt;p&gt;Yet the chapter ends with hope. Wealth and possessions, a source of such trouble in the previous section, are a gift to enjoy.&lt;sup&gt;&lt;a data-resourceref=&quot;niv-biblical-theology/ecc-5-18-20&quot; data-preview=&quot;16–17 is remarkable: in v. 17, “they eat in darkness, with great frustration, affliction and anger,” but in v. 18 what is good is “to eat, to drink and to find satisfaction.” Wealth and possessions, a source of such trouble in the previous section, are a gift to enjoy.&quot;&gt;7&lt;/a&gt;&lt;/sup&gt; The lesson: mortals are weak and perishing, and this should drive them to understand the real meaning of the fear of God.&lt;sup&gt;&lt;a data-resourceref=&quot;niv-cultural-backgrounds/ecc-5-2&quot; data-preview=&quot;Ecclesiastes begins with the same premise, but moves in a different direction: Mortals are weak and perishing, and this should drive them to understand the real meaning of the fear of God.&quot;&gt;8&lt;/a&gt;&lt;/sup&gt;&lt;/p&gt;</p>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.biblegateway.com/passage/?search=Lamentations%203%3A4&version=KJ21",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Lamentations 3:4 KJ21",
				"creators": [],
				"abstractNote": "My flesh and my skin hath He made old; He hath broken my bones.",
				"bookTitle": "The Bible, 21st Century King James Version",
				"extra": "translation-code: KJ21",
				"language": "en",
				"libraryCatalog": "BibleGateway",
				"shortTitle": "Lamentations 3",
				"attachments": [
					{
						"title": "Passage",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "<h3>Chapter Overview</h3><p>Title: Lam 3</p><p>&lt;p&gt;&lt;a class=&quot;bibleref&quot; data-bibleref=&quot;Lam.3&quot; href=&quot;/passage/?search=Lam 3&quot;&gt;Lamentations 3&lt;/a&gt; sits at the center of the book, and the most pronounced expression of hope in the book comes in this chapter, which directly follows the darkest portrait of God&apos;s wrath in &lt;a class=&quot;bibleref&quot; data-bibleref=&quot;Lam.2&quot; href=&quot;/passage/?search=Lam 2&quot;&gt;chapter 2&lt;/a&gt;.&lt;sup&gt;&lt;a data-resourceref=&quot;niv-biblical-theology/la-3-1-66&quot; data-preview=&quot;It is noteworthy that the most pronounced expression of hope in the book comes in ch. 3, which directly follows the darkest portrait of God’s wrath in ch. 2.&quot;&gt;1&lt;/a&gt;&lt;/sup&gt; The poet first sees God as the source of trouble,&lt;sup&gt;&lt;a data-resourceref=&quot;niv-application-bible/com25003001&quot; data-preview=&quot;3:1–12 The poet first sees God as the source of trouble.&quot;&gt;2&lt;/a&gt;&lt;/sup&gt; and communal suffering is depicted in the agony of a particular, unnamed individual.&lt;sup&gt;&lt;a data-resourceref=&quot;niv-biblical-theology/la-3-1-16&quot; data-preview=&quot;The account of communal suffering is now depicted in the agony and misery of a particular, unnamed individual.&quot;&gt;3&lt;/a&gt;&lt;/sup&gt;&lt;/p&gt;&lt;p&gt;Then the tone shifts. Right in the middle of this book comes a remarkable assurance: God&apos;s love and mercy never fail, and God&apos;s faithfulness is great.&lt;sup&gt;&lt;a data-resourceref=&quot;niv-application-bible/sbcog-25003022&quot; data-preview=&quot;Yet right in the middle of this book comes a remarkable assurance: God’s love and mercy never fail, and God’s faithfulness is great (La 3:22–23).&quot;&gt;4&lt;/a&gt;&lt;/sup&gt; The Hebrew for &amp;quot;great love&amp;quot; is plural and denotes the Lord&apos;s repeated acts of loving faithfulness to his covenant promises.&lt;sup&gt;&lt;a data-resourceref=&quot;niv-study-bible/la-3-22&quot; data-preview=&quot;The Hebrew for this phrase is plural (as also in Ps 107:43) and denotes the Lord’s repeated acts of loving faithfulness to his covenant promises (Ps 89:1; see also article).&quot;&gt;5&lt;/a&gt;&lt;/sup&gt;&lt;/p&gt;&lt;p&gt;The chapter also moves from &amp;quot;I&amp;quot; to &amp;quot;we.&amp;quot; The repentance language is first-person plural—&amp;quot;Let us examine … let us return&amp;quot;—indicating that the poet&apos;s experience is linked with that of his community.&lt;sup&gt;&lt;a data-resourceref=&quot;niv-application-bible/com25003040&quot; data-preview=&quot;Significantly, the language is first-person plural: “Let us examine … let us return … let us lift” (vv.&quot;&gt;6&lt;/a&gt;, &lt;a data-resourceref=&quot;niv-application-bible/com25003040&quot; data-preview=&quot;This indicates that the poet’s experience is linked with that of his community.&quot;&gt;7&lt;/a&gt;&lt;/sup&gt;&lt;/p&gt;&lt;p&gt;For readers today, God&apos;s faithfulness does not mean he will remove his children from the storms, but it does mean that whatever storm we face, God is there with us.&lt;sup&gt;&lt;a data-resourceref=&quot;niv-application-bible/sbcog-25003022&quot; data-preview=&quot;God’s faithfulness does not mean God will remove his children from the storms, but it does mean that whatever storm we find ourselves in, God is there with us.&quot;&gt;8&lt;/a&gt;&lt;/sup&gt; And waiting on the Lord includes the practices of prayer and repentance; it is not merely marking time.&lt;sup&gt;&lt;a data-resourceref=&quot;niv-application-bible/appcom25003052&quot; data-preview=&quot;For the poet, waiting on the Lord (v. 24) includes the practices of prayer and repentance; he does not assume that waiting is merely marking time.&quot;&gt;9&lt;/a&gt;&lt;/sup&gt;&lt;/p&gt;</p>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.biblegateway.com/passage/?search=%20Isaiah%2045%3A5%E2%80%937&version=NRSVUE",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Isaiah 45:5–7 NRSVUE",
				"creators": [],
				"abstractNote": "I am the LORD, and there is no other; besides me there is no god. I arm you, though you do not know me, so that they may know, from the rising of the sun and from the west, that there is no one besides me; I am the LORD, and there is no other. I form light and create darkness, I make weal and create woe; I the LORD do all these things.",
				"bookTitle": "The Bible, New Revised Standard Version Updated Edition",
				"extra": "translation-code: NRSVUE",
				"language": "en",
				"libraryCatalog": "BibleGateway",
				"shortTitle": "Isaiah 45",
				"attachments": [
					{
						"title": "Passage",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "<h3>Chapter Overview</h3><p>Title: Isa 45</p><p>&lt;p&gt;&lt;a class=&quot;bibleref&quot; data-bibleref=&quot;Isa.45&quot; href=&quot;/passage/?search=Isa 45&quot;&gt;Isaiah 45&lt;/a&gt; continues the book&apos;s message that God will rescue his exiled people, naming the Persian king Cyrus as the deliverer. Cyrus, a foreign emperor, is called &amp;quot;his anointed&amp;quot; just as he is called &amp;quot;my shepherd&amp;quot; (&lt;a class=&quot;bibleref&quot; data-bibleref=&quot;Isa.44.28&quot; href=&quot;/passage/?search=Isa 44:28&quot;&gt;44:28&lt;/a&gt;), because God has appointed him to carry out a divine commission in his role as king.&lt;sup&gt;&lt;a data-resourceref=&quot;niv-study-bible/isa-45-1&quot; data-preview=&quot;Cyrus, a foreign emperor, is called “his anointed” just as he is called “my shepherd” (44:28), because God has appointed him to carry out a divine commission in his role as king.&quot;&gt;1&lt;/a&gt;&lt;/sup&gt; Though the word Messiah means &amp;quot;anointed one,&amp;quot; Cyrus was not the Messiah—the special One to redeem God&apos;s people.&lt;sup&gt;&lt;a data-resourceref=&quot;quest-study-bible/how-was-cyrus-lord-anointed-45-1&quot; data-preview=&quot;Though the word Messiah means “anointed one,” Cyrus was not the Messiah—the special One to redeem God’s people.&quot;&gt;2&lt;/a&gt;&lt;/sup&gt;&lt;/p&gt;&lt;p&gt;Remarkably, this king did not even worship Israel&apos;s God. Cyrus most certainly was not a worshiper of Yahweh. In his inscriptions, his polytheism is evident.&lt;sup&gt;&lt;a data-resourceref=&quot;niv-cultural-backgrounds/isa-45-4&quot; data-preview=&quot;Cyrus most certainly was not a worshiper of Yahweh. In his inscriptions, his polytheism is evident.&quot;&gt;3&lt;/a&gt;&lt;/sup&gt; Yet the specific prediction of Cyrus&apos;s name is one example of Yahweh&apos;s unique capacity to predict the future, something the idols could not do.&lt;sup&gt;&lt;a data-resourceref=&quot;niv-biblical-theology/isa-45-1-8&quot; data-preview=&quot;3, 4); the specific prediction of Cyrus’s name is one example of Yahweh’s unique capacity to predict the future, something the idols could not do (see the note on 41:21–29).&quot;&gt;4&lt;/a&gt;&lt;/sup&gt;&lt;/p&gt;&lt;p&gt;The chapter also answers objections to God&apos;s methods. It is Yahweh&apos;s right to use Cyrus, a pagan emperor who does not acknowledge him, to deliver his people. Yahweh insists that as the Creator he has a perfect right to do so.&lt;sup&gt;&lt;a data-resourceref=&quot;niv-biblical-theology/isa-45-9-19&quot; data-preview=&quot;It is Yahweh’s right to use Cyrus, a pagan emperor who does not acknowledge him, to deliver his people. Yahweh insists that as the Creator he has a perfect right to do so (vv.&quot;&gt;5&lt;/a&gt;&lt;/sup&gt;&lt;/p&gt;&lt;p&gt;Finally, God&apos;s saving purpose reaches beyond Israel. God does not want to destroy the idol makers but to save them.&lt;sup&gt;&lt;a data-resourceref=&quot;niv-application-bible/com23045022&quot; data-preview=&quot;God does not want to destroy the idol makers but to save them.&quot;&gt;6&lt;/a&gt;&lt;/sup&gt; For today, the chapter invites reflection: when have we seen God use surprising means to accomplish his good purposes?&lt;sup&gt;&lt;a data-resourceref=&quot;niv-application-bible/sbqg-23045013&quot; data-preview=&quot;When have we seen God use surprising means to accomplish his good purposes?&quot;&gt;7&lt;/a&gt;&lt;/sup&gt;&lt;/p&gt;</p>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.biblegateway.com/passage/?search=REV%201%3A14%20&version=KJV",
		"items": [
			{
				"itemType": "bookSection",
				"title": "REV 1:14 KJV",
				"creators": [],
				"abstractNote": "His head and his hairs were white like wool, as white as snow; and his eyes were as a flame of fire;",
				"bookTitle": "The Bible, King James Version",
				"extra": "translation-code: KJV",
				"language": "en",
				"libraryCatalog": "BibleGateway",
				"shortTitle": "REV 1",
				"attachments": [
					{
						"title": "Passage",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "<h3>Chapter Overview</h3><p>Title: Rev 1</p><p>&lt;p&gt;&lt;a class=&quot;bibleref&quot; data-bibleref=&quot;Rev.1&quot; href=&quot;/passage/?search=Rev 1&quot;&gt;Revelation 1&lt;/a&gt; opens the book with a prologue, a letter-style greeting, and John&apos;s vision of Jesus among the seven churches. &lt;sup&gt;&lt;a data-resourceref=&quot;niv-study-bible/introduction-to-revelation&quot; data-preview=&quot;Introduction (1:1–8) A. Prologue (1:1–3) B. Greetings and Doxology (1:4–8) II. Jesus Among the Seven Churches (1:9–20) III.&quot;&gt;1&lt;/a&gt;&lt;/sup&gt; John writes from exile on Patmos, likely a Roman penal colony, for his work as a Christian missionary. &lt;sup&gt;&lt;a data-resourceref=&quot;niv-study-bible/introduction-to-revelation&quot; data-preview=&quot;John has been exiled to the island of Patmos (possibly the site of a Roman penal colony) for his activities as a Christian missionary (1:9).&quot;&gt;2&lt;/a&gt;&lt;/sup&gt; This opening vision of Christ lays the groundwork for the messages to the churches in &lt;a class=&quot;bibleref&quot; data-bibleref=&quot;Rev.2-Rev.3&quot; href=&quot;/passage/?search=Rev 2-Rev 3&quot;&gt;chapters 2–3&lt;/a&gt;. &lt;sup&gt;&lt;a data-resourceref=&quot;niv-biblical-theology/introduction-to-revelation&quot; data-preview=&quot;John’s opening vision of Christ (1:9–20) is foundational for the messages to the churches (chs. 2–3).&quot;&gt;3&lt;/a&gt;&lt;/sup&gt;&lt;/p&gt;&lt;p&gt;Theologically, the chapter presents Jesus with titles that belong to God. When Jesus calls himself &amp;quot;the First and the Last,&amp;quot; he uses the title that identifies deity, affirming his own divine nature. &lt;sup&gt;&lt;a data-resourceref=&quot;niv-cultural-backgrounds/rev-1-17&quot; data-preview=&quot;I am the First and the Last. This is precisely the title that identifies deity in the same context (cf. v. 8; Isa 41:4; 44:6; 48:12); Jesus opens his revelation to John by affirming his deity.&quot;&gt;4&lt;/a&gt;&lt;/sup&gt; He is also the &amp;quot;firstborn from the dead,&amp;quot; a comfort for Christians who might soon face death for his name. &lt;sup&gt;&lt;a data-resourceref=&quot;niv-application-bible/com66001005&quot; data-preview=&quot;Jesus is also here the “firstborn from the dead,” relevant for Christians who might soon face death for his name.&quot;&gt;5&lt;/a&gt;&lt;/sup&gt;&lt;/p&gt;&lt;p&gt;For application, Jesus appears among the lampstands, which represent the seven churches, suggesting his presence with his people. &lt;sup&gt;&lt;a data-resourceref=&quot;niv-application-bible/com66001011&quot; data-preview=&quot;Jesus appears among the lampstands (vv. 12–13). These represent the seven churches (v. 20), suggesting Jesus’ presence with his church.&quot;&gt;6&lt;/a&gt;&lt;/sup&gt; Above all, God is still in control and will conclude history the way he promised. &lt;sup&gt;&lt;a data-resourceref=&quot;niv-application-bible/appcom66001003&quot; data-preview=&quot;Application ✜ 1:1–3 God is still in control and will conclude history the way he promised.&quot;&gt;7&lt;/a&gt;&lt;/sup&gt; Because all history is in God&apos;s hands, his people need not fear. &lt;sup&gt;&lt;a data-resourceref=&quot;niv-application-bible/com66001007&quot; data-preview=&quot;Finally, John confirms all history is in God’s hands (v. 8); thus, his people need not fear.&quot;&gt;8&lt;/a&gt;&lt;/sup&gt;&lt;/p&gt;</p>"
					}
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
