{
	"translatorID": "bc2fbf38-3061-4335-8644-69ce68580b20",
	"label": "NPR",
	"creator": "Abe Jellinek",
	"target": "^https?://www\\.npr\\.org/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-08-13 21:08:15"
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


function detectWeb(doc, url) {
	// NPR assumes that only a crawler (which always loads pages fresh rather
	// than letting the SPA framework fake a reload) would want JSON-LD, so we
	// can't use that as our only check, and we'll have to manually reload the
	// page to get it in doWeb.
	// The JSON-LD also sticks around when you navigate to a non-story page,
	// which is odd, so we can't use it as a test for a story page at all!
	if (doc.querySelector('#storytext')) {
		if (doc.querySelector('h1.transcript a')) {
			if (attr(doc, '.slug a', 'href').includes('npr.org/podcasts/')) {
				return "podcast";
			}
			else {
				return "radioBroadcast";
			}
		}
		else if (doc.querySelector('#primaryaudio')) {
			return "multiple";
		}
		else {
			return "newspaperArticle";
		}
	}
	else if (/^https?:\/\/www\.npr\.org\/.+/.test(url)) {
		// wait for SPA reload
		Z.monitorDOMChanges(doc.querySelector('#loading-bar'));
	}
	// we can't really do search results, because each result might be a
	// multiple and there's no way to tell from the search page
	return false;
}


function doWeb(doc, url) {
	if (doc.querySelector('script[type="application/ld+json"]')) {
		scrape(doc, url);
	}
	else {
		// See comment in detectWeb. Have to add a # to ensure that
		// processDocuments doesn't use the already-loaded page.
		ZU.processDocuments(url + '#', scrape);
	}
}

function scrape(doc, url) {
	let detected = detectWeb(doc, url);
	switch (detected) {
		case 'multiple': {
			// we're detecting "multiple" because we have audio and text,
			// so we can just hardcode the options here
			let options = { text: 'Text', audio: 'Audio' };
			Zotero.selectItems(options, function (items) {
				if (items.text) {
					scrapeText(doc, url);
				}
				if (items.audio) {
					scrapeAudio(doc, url);
				}
			});
			break; }
		case 'newspaperArticle':
			scrapeText(doc, url);
			break;
		case 'radioBroadcast':
		case 'podcast':
			scrapeAudio(doc, url);
			break;
	}
}

function scrapeText(doc, _url) {
	let item = new Zotero.Item('newspaperArticle');
	let json = JSON.parse(text(doc, 'script[type="application/ld+json"]'));
	
	item.title = json.headline;
	item.abstractNote = ZU.cleanTags(json.description);
	item.publicationTitle = 'NPR';
	item.date = json.dateModified || json.datePublished;
	item.section = text(doc, 'h3.slug');
	item.language = 'en';
	item.url = json.mainEntityOfPage['@id'];
	
	if (json.author) {
		for (let name of json.author.name) {
			item.creators.push(ZU.cleanAuthor(name, 'author'));
		}
	}
	
	item.attachments.push({
		title: 'Snapshot',
		document: doc
	});
	
	item.complete();
}

function scrapeAudio(doc, _url) {
	// first we need to figure out whether we're looking at a radio broadcast
	// or a podcast
	let itemType;
	if (doc.querySelector('h1.transcript a')) {
		// if we're on a transcript page, the slug link will include /podcasts/
		// if the show in question is a podcast
		if (attr(doc, '.slug a', 'href').includes('npr.org/podcasts/')) {
			itemType = 'podcast';
		}
		else {
			itemType = 'radioBroadcast';
		}
	}
	else if (doc.querySelector('.program-block a')) {
		// if we're on an article page, there'll be a .program-block link iff
		// the show aired on a radio program
		itemType = 'radioBroadcast';
	}
	else {
		itemType = 'podcast';
	}
	
	let item = new Zotero.Item(itemType);
	let json = JSON.parse(text(doc, 'script[type="application/ld+json"]'));
	
	item.title = text(doc, '#primaryaudio .audio-module-title') || json.headline;
	item.abstractNote = ZU.cleanTags(json.description);
	
	// strip the time from the date, since we have no way of knowing exactly
	// what time it aired (and the time on the article is based on when the
	// transcript was published)
	let date = (json.dateModified || json.datePublished).replace(/T.+$/, '');
	if (itemType == 'radioBroadcast') {
		item.date = date;
		item.programTitle = text(doc, '.program-block a');
		if (!item.programTitle) {
			// transcript pages don't have a .program-block, so we'll use a
			// shakier approach based on internal audio player metadata
			try {
				item.programTitle = JSON.parse(
					attr(doc, 'div[data-audio]', 'data-audio')
				).program;
			}
			catch (_) {}
		}
		item.network = 'NPR';
	}
	else {
		// podcasts have no date field
		item.extra = `issued: ${date}\n`;
		item.seriesTitle = text(doc, 'h3.slug');
		item.publisher = 'NPR'; // no good analogue for this, so let it go into extra
	}
	
	item.runningTime = attr(doc, '#primaryaudio .audio-module-duration', 'datetime')
		.replace(/P(\d+)H,(\d+)M,(\d+)S/, '$1:$2:$3')
		.replace(/P(\d+)M,(\d+)S/, '$1:$2');
	item.language = 'en';
	item.url = json.mainEntityOfPage['@id'];
	
	if (json.author) {
		for (let name of json.author.name) {
			let creatorType = itemType == 'radioBroadcast' ? 'director' : 'podcaster';
			item.creators.push(ZU.cleanAuthor(name, creatorType));
		}
	}
	
	item.attachments.push({
		title: 'Audio',
		mimeType: 'audio/mpeg',
		url: attr(doc, '#primaryaudio .audio-tool-download > a', 'href')
	});
	
	item.attachments.push({
		title: 'Transcript',
		mimeType: 'text/html',
		url: attr(doc, '#primaryaudio .audio-tool-transcript > a', 'href'),
		snapshot: true
	});
	
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.npr.org/2020/07/09/889562040/supreme-court-rules-that-about-half-of-oklahoma-is-indian-land",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Supreme Court Rules That About Half Of Oklahoma Is Native American Land",
				"creators": [
					{
						"firstName": "Laurel",
						"lastName": "Wamsley",
						"creatorType": "author"
					}
				],
				"date": "2020-07-09T19:17:00-04:00",
				"abstractNote": "\"Today we are asked whether the land these treaties promised remains an Indian reservation. ... Because Congress has not said otherwise, we hold the government to its word,\" wrote Justice Gorsuch.",
				"language": "en",
				"libraryCatalog": "NPR",
				"publicationTitle": "NPR",
				"section": "Law",
				"url": "https://www.npr.org/2020/07/09/889562040/supreme-court-rules-that-about-half-of-oklahoma-is-indian-land",
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
		"url": "https://www.npr.org/2021/07/13/1011376403/its-summer-and-that-means-the-mysterious-return-of-glacier-ice-worms",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.npr.org/transcripts/1011376403",
		"items": [
			{
				"itemType": "radioBroadcast",
				"title": "It's Summer, And That Means The Mysterious Return Of Glacier Ice Worms",
				"creators": [
					{
						"firstName": "Nell",
						"lastName": "Greenfieldboyce",
						"creatorType": "director"
					}
				],
				"date": "2021-07-13",
				"abstractNote": "On mountaintop glaciers of Alaska, Washington and Oregon, billions of tiny black worms are tunneling upward to the barren, icy surface. What lures them, and how do they survive the frozen depths?",
				"language": "en",
				"libraryCatalog": "NPR",
				"network": "NPR",
				"programTitle": "Morning Edition",
				"runningTime": "6:38",
				"url": "https://www.npr.org/2021/07/13/1011376403/its-summer-and-that-means-the-mysterious-return-of-glacier-ice-worms",
				"attachments": [
					{
						"title": "Audio",
						"mimeType": "audio/mpeg"
					},
					{
						"title": "Transcript",
						"mimeType": "text/html",
						"snapshot": true
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
		"url": "https://www.npr.org/transcripts/1011289394",
		"items": [
			{
				"itemType": "podcast",
				"title": "Égalité, Fraternité, And 'Libertie'",
				"creators": [
					{
						"firstName": "Gene",
						"lastName": "Demby",
						"creatorType": "podcaster"
					},
					{
						"firstName": "Shereen Marisol",
						"lastName": "Meraji",
						"creatorType": "podcaster"
					}
				],
				"abstractNote": "This month on Code Switch, we're talking about books — new and old — that have deepened our understandings of what it means to be free. First up, a conversation with author Kaitlyn Greenidge about her new novel, Libertie, which tells the story of a young woman pushing back against her mother's expectations of what her life should look like.",
				"extra": "issued: 2021-07-07",
				"language": "en",
				"runningTime": "23:33",
				"seriesTitle": "Code Switch",
				"url": "https://www.npr.org/2021/06/29/1011289394/egalite-fraternite-and-libertie",
				"attachments": [
					{
						"title": "Audio",
						"mimeType": "audio/mpeg"
					},
					{
						"title": "Transcript",
						"mimeType": "text/html",
						"snapshot": true
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
