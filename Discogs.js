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
	"lastUpdated": "2025-05-22 08:14:10"
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

  try {
	// Parse the JSON-LD content
	let jsonLd = JSON.parse(jsonLdScript.textContent);

	// Map JSON-LD fields to Zotero fields
	if (jsonLd.name) {
	  item.title = jsonLd.name; // e.g., "Electric / Impact (The Mixes)"
	}

	if (jsonLd.releaseOf && jsonLd.releaseOf.byArtist) {
	  jsonLd.releaseOf.byArtist.forEach(function(artist) {
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
	  } else {
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
  } catch (e) {
	Zotero.debug("Error parsing JSON-LD: " + e.message);
  }
}

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
