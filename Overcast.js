{
	"translatorID": "02673fa1-1374-421d-938e-902584689fce",
	"label": "Overcast",
	"creator": "flrntdfr",
	"target": "^https?://overcast\\.fm/\\+",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-11-19 17:09:46"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2026 flrntdfr

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


// Public pages on overcast.fm are episode share links like /+ABQnv71jM7E.
// Podcast lists and other pages require an account and are not handled.
function detectWeb(doc, url) {
	if (/^https?:\/\/overcast\.fm\/\+/.test(url)) {
		return 'podcast';
	}
	return false;
}

async function doWeb(_doc, url) {
	await scrape(url);
}

// Most episode data comes from Overcast's server markup, but the DOM a
// connector snapshot exposes can race the page's own JS rendering, so fetch
// and parse the raw HTML for a deterministic result.
async function scrape(url) {
	const html = await requestText(url);
	const item = new Zotero.Item('podcast');
	item.url = url;

	const title = html.match(/<h2[^>]*>([^<]+)<\/h2>/);
	if (!title) {
		throw new Error('Overcast: episode title not found on ' + url);
	}
	item.title = ZU.unescapeHTML(title[1].trim());

	const series = html.match(/<h3[^>]*>\s*<a[^>]*>([^<]+)<\/a>/);
	if (series) {
		item.seriesTitle = ZU.unescapeHTML(series[1].trim());
	}

	// The date sits in the div right below the episode title.
	const date = html.match(/<\/h2>\s*<div[^>]*>([^<]+)<\/div>/);
	if (date) {
		item.date = ZU.strToISO(date[1].trim()) || date[1].trim();
	}

	const description = attrValue(html, 'og:description');
	if (description) {
		item.abstractNote = description;
	}

	const stream = attrValue(html, 'twitter:player:stream');
	if (stream) {
		item.attachments.push({
			url: stream.replace(/#.*$/, ''),
			title: 'Audio Podcast',
			mimeType: 'audio/mpeg'
		});
	}

	const streamType = attrValue(html, 'twitter:player:stream:content_type');
	if (streamType == 'audio/mpeg') {
		item.audioFileType = 'MP3';
	}

	// Overcast doesn't publish the show's author or the episode durations.
	// The iTunes podcast API has both. Enrichment is best-effort: episodes
	// beyond the API's 200-episode window won't match and the item is left
	// with what the page provides.
	try {
		await enrichFromITunes(item);
	}
	catch (e) {
		Z.debug('Overcast: iTunes enrichment failed: ' + e);
	}

	item.complete();
}

async function enrichFromITunes(item) {
	if (!item.seriesTitle || !item.title) {
		return;
	}
	const search = await requestJSON('https://itunes.apple.com/search?term='
		+ encodeURIComponent(item.seriesTitle) + '&media=podcast&limit=5');
	const podcast = (search.results || []).find(result => result.kind == 'podcast');
	if (!podcast) {
		return;
	}
	const lookup = await requestJSON('https://itunes.apple.com/lookup?id='
		+ podcast.collectionId + '&entity=podcastEpisode&limit=200');
	const episode = (lookup.results || []).find(result => result.wrapperType == 'podcastEpisode' && sameTitle(result.trackName, item.title));
	if (!episode) {
		return;
	}

	// The show's hosts, as a comma-separated list. Only the podcast-level
	// result carries artistName, not the episode results.
	if (podcast.artistName) {
		for (const name of podcast.artistName.split(/,\s*/)) {
			const lastSpace = name.lastIndexOf(' ');
			if (lastSpace > 0) {
				item.creators.push({
					firstName: name.slice(0, lastSpace),
					lastName: name.slice(lastSpace + 1),
					creatorType: 'podcaster'
				});
			}
			else {
				item.creators.push({ lastName: name, creatorType: 'podcaster', fieldMode: 1 });
			}
		}
	}

	if (episode.trackTimeMillis) {
		item.runningTime = formatRunningTime(episode.trackTimeMillis);
	}

	if (!item.date && episode.releaseDate) {
		item.date = ZU.strToISO(episode.releaseDate);
	}

	if (!item.abstractNote && (episode.shortDescription || episode.description)) {
		item.abstractNote = ZU.trimInternal(episode.shortDescription || episode.description);
	}
}

// Overcast titles can be numbered ("717: Two Hot Streaks") where iTunes
// carries the bare title, and both sides mix straight and curly quotes.
function sameTitle(a, b) {
	const norm = t => ZU.trimInternal((t || '')
		.replace(/[\u2018\u2019\u201C\u201D]/g, '"')
		.toLowerCase()
		.replace(/^(?:ep\.?\s*)?\d+\s*:\s*/, ''));
	return norm(a) == norm(b);
}

function formatRunningTime(ms) {
	const totalSeconds = Math.round(ms / 1000);
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = String(totalSeconds % 60).padStart(2, '0');
	return hours
		? hours + ':' + String(minutes).padStart(2, '0') + ':' + seconds
		: minutes + ':' + seconds;
}

function attrValue(html, name) {
	const match = html.match(new RegExp(name + '" content="([^"]*)"'));
	return match ? ZU.unescapeHTML(match[1]) : '';
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://overcast.fm/+ABQnv71jM7E",
		"items": [
			{
				"itemType": "podcast",
				"title": "1: iPhone Plus",
				"creators": [],
				"abstractNote": "Speculation on what a bigger iPhone’s screen might be and why.",
				"audioFileType": "MP3",
				"seriesTitle": "Accidental Tech Podcast",
				"shortTitle": "1",
				"url": "https://overcast.fm/+ABQnv71jM7E",
				"attachments": [
					{
						"title": "Audio Podcast",
						"mimeType": "audio/mpeg"
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
		"url": "https://overcast.fm/+ABYHQDiHjQA",
		"items": [
			{
				"itemType": "podcast",
				"title": "Ep. 01: “Keep Moving and Get Out of the Way”",
				"creators": [],
				"abstractNote": "Punctuality, Freud, reasons, John’s brutal introversion, R.E.M.’s sense of humours, listening with toolboxes, the explicit honesty of volcano science, and ultimately rethinking humanity’s Latifahesque, fleece-and-beards struggle with the two a priori laws.",
				"audioFileType": "MP3",
				"seriesTitle": "Roderick on the Line",
				"shortTitle": "Ep. 01",
				"url": "https://overcast.fm/+ABYHQDiHjQA",
				"attachments": [
					{
						"title": "Audio Podcast",
						"mimeType": "audio/mpeg"
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
		"url": "https://overcast.fm/+ABYHQAW5Q4A",
		"items": [
			{
				"itemType": "podcast",
				"title": "Ep. 647: “Guitar Protective Services”",
				"creators": [
					{
						"firstName": "Merlin",
						"lastName": "Mann",
						"creatorType": "podcaster"
					}
				],
				"abstractNote": "The Problem: Basically, Merlin wants a Mal Evans. (Recorded on November 16, 2026.)",
				"audioFileType": "MP3",
				"seriesTitle": "Roderick on the Line",
				"shortTitle": "Ep. 647",
				"url": "https://overcast.fm/+ABYHQAW5Q4A",
				"attachments": [
					{
						"title": "Audio Podcast",
						"mimeType": "audio/mpeg"
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
		"url": "https://overcast.fm/+ABQnv5XelKo",
		"items": [
			{
				"itemType": "podcast",
				"title": "717: Two Hot Streaks",
				"creators": [
					{
						"firstName": "Marco",
						"lastName": "Arment",
						"creatorType": "podcaster"
					},
					{
						"firstName": "Casey",
						"lastName": "Liss",
						"creatorType": "podcaster"
					},
					{
						"firstName": "John",
						"lastName": "Siracusa",
						"creatorType": "podcaster"
					}
				],
				"abstractNote": "PROLED details and hands-on impressions, Siri AI’s expansion, living with the iPhone Duo, and how you all proved (once again) that you’re the best podcast audience.",
				"audioFileType": "MP3",
				"runningTime": "2:29:42",
				"seriesTitle": "Accidental Tech Podcast",
				"shortTitle": "717",
				"url": "https://overcast.fm/+ABQnv5XelKo",
				"attachments": [
					{
						"title": "Audio Podcast",
						"mimeType": "audio/mpeg"
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
