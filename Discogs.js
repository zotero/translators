{
	"translatorID": "669bb7bd-bc34-46cd-9340-cf8af8187063",
	"label": "Discogs",
	"creator": "Michael Z Freeman",
	"target": "^https://www\\.discogs\\.com/release/[a-z0-9-]+",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-11-29 12:24:52"
}

/*
HISTORY

This translator was something I've been circling arund for 3 years. I started a BA(Hons) in Creative Music Technology at Falmouth University.
I became frustrated with the lack of citation tools for music releases and audio recordings in general. Zotero does detect the Discogs page as an
audio recording but does not fill in the correct details. Other citation tools out there fail to have searches for music releases and seem to have
no idea that vinyl records can in fact be cited and referenced. All this when as a DJ I am researching releases and writing assessments and dissertations !
So I hope this translator can improve the situation.

METHOD

This translator accesses the "ld+json" block in the "release" Discogs page. It is not designed to use the "master" page for a release as that will not
list the record label.

INFO

Some comments in the code below are based on page https://www.discogs.com/release/126504-Micro-Vicious-Vic-Electric-Impact-The-Mixes
*/


/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2025 Michael Z Freeman

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
	if (url.match(/release\/\d+/)) {
		return "audioRecording";
	}
	return false;
}

function doWeb(doc, url) {
	// Create a new Zotero item of type "audioRecording"
	let item = new Zotero.Item("audioRecording");

	// Locate the JSON-LD script tag
	let jsonLdScript = doc.querySelector('script[type="application/ld+json"]');
	if (!jsonLdScript) {
		Zotero.debug("No JSON-LD found on the page.");
		return;
	}

	// Parse the JSON-LD content
	let jsonLd = JSON.parse(jsonLdScript.textContent);

	// Map JSON-LD fields to Zotero fields
	if (jsonLd.name) {
		item.title = jsonLd.name; // e.g., "Electric / Impact (The Mixes)"
	}

	if (jsonLd.releaseOf && jsonLd.releaseOf.byArtist) {
		jsonLd.releaseOf.byArtist.forEach(function (artist) {
			item.creators.push({
				lastName: artist.name, // e.g., "DJ Micro", "Vicious Vic"
				creatorType: "performer"
			});
		});
	}

	if (jsonLd.recordLabel && jsonLd.recordLabel.length > 0) {
		item.label = jsonLd.recordLabel[0].name; // e.g., "Caffeine Records"
	}

	if (jsonLd.musicReleaseFormat) {
		item.medium = jsonLd.musicReleaseFormat; // e.g., "Vinyl"
	}

	if (jsonLd.datePublished) {
		item.date = jsonLd.datePublished; // e.g., 1996
	}

	if (jsonLd.genre) {
		if (Array.isArray(jsonLd.genre)) {
			jsonLd.genre.forEach(genre => item.tags.push(genre));
		}
		else {
			item.tags.push(jsonLd.genre); // e.g., "Electronic"
		}
	}

	if (jsonLd.catalogNumber) {
		item.callNumber = jsonLd.catalogNumber; // e.g., "CF 2833, L-46099"
	}

	if (jsonLd.description) {
		item.abstractNote = jsonLd.description; // e.g., "This is the black vinyl release..."
	}

	if (jsonLd.image) {
		item.attachments.push({
			url: jsonLd.image, // e.g., cover image URL
			title: "Cover Image",
			mimeType: "image/jpeg"
		});
	}

	// Add the release page URL
	item.url = url;

	// Complete the item and save it to Zotero
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.discogs.com/release/292096-Brothers-And-Systems-One-Voice-Remixes",
		"items": [
			{
				"itemType": "audioRecording",
				"title": "One Voice (Remixes)",
				"creators": [
					{
						"lastName": "Brothers And Systems",
						"creatorType": "performer"
					}
				],
				"date": 1992,
				"audioRecordingFormat": "Vinyl",
				"callNumber": "SPRO-67103",
				"label": "I.R.S. Records",
				"libraryCatalog": "Discogs",
				"url": "https://www.discogs.com/release/292096-Brothers-And-Systems-One-Voice-Remixes",
				"attachments": [
					{
						"title": "Cover Image",
						"mimeType": "image/jpeg"
					}
				],
				"tags": [
					{
						"tag": "Electronic"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.discogs.com/release/18925-Eon-Spice",
		"items": [
			{
				"itemType": "audioRecording",
				"title": "Spice",
				"creators": [
					{
						"lastName": "Eon",
						"creatorType": "performer"
					}
				],
				"date": 1990,
				"abstractNote": "Rear of sleeve states &quot;The Spice Must Flow&quot;.\n\nSide A: 45 RPM / Side 1: 33⅓ RPM\n\nSide A = &quot;Side A&quot;\nTrack A = &quot;I.&quot;\n\nSide B = &quot;Side 1&quot;\nTrack B1 = &quot;I.&quot;\nTrack B2 = &quot;II.&quot;\n\nCatalog number on rear of sleeve, spine and centre label: STORM 22\nCatalog number on spine: EFA 17175\nCatalog number on rear of sleeve: EFA 12&quot; 17175\n\nRecorded at Spike\nMastered by Paul at The Exchange\nDistributed in the UK by SRD\nMade in England\n© 1990 Vinyl Solution\n℗ 1990 Vinyl Solution\n\nDurations are not on release.\n\nRunouts are etched.\n\nIncidental information:\nEach side ends in a locked groove.\nAll tracks sample dialogue from the film Dune.\nTrack A samples:\nLocked groove from ‘<a href=\"/release/419461\" rel=\"nofollow\" target=\"_blank\">Sutekh Time Tunnel</a>’.\nSynth from <a href=\"https://www.discogs.com/master/2881\"  target=\"_blank\">The Human League - Love Action (I Believe In Love)</a>.",
				"audioRecordingFormat": "Vinyl",
				"callNumber": "STORM 22, 17175, 12\" 17175",
				"label": "Vinyl Solution",
				"libraryCatalog": "Discogs",
				"url": "https://www.discogs.com/release/18925-Eon-Spice",
				"attachments": [
					{
						"title": "Cover Image",
						"mimeType": "image/jpeg"
					}
				],
				"tags": [
					{
						"tag": "Electronic"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.discogs.com/release/2464-LFO-LFO-Remix",
		"items": [
			{
				"itemType": "audioRecording",
				"title": "LFO Remix",
				"creators": [
					{
						"lastName": "LFO",
						"creatorType": "performer"
					}
				],
				"date": 1990,
				"abstractNote": "Warp Records in Association with Outer Rhythm\r\n\r\n℗ 1990 Warp Records/Outer Rhythm \r\n© 1990 Warp Records/Outer Rhythm\r\n\r\nThe Designers Republic phasers on full... The Absolute Truth!",
				"audioRecordingFormat": "Vinyl",
				"callNumber": "WAP 5R, WAP 5R",
				"label": "Warp Records",
				"libraryCatalog": "Discogs",
				"url": "https://www.discogs.com/release/2464-LFO-LFO-Remix",
				"attachments": [
					{
						"title": "Cover Image",
						"mimeType": "image/jpeg"
					}
				],
				"tags": [
					{
						"tag": "Electronic"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
