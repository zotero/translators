{
	"translatorID": "ac9c95f6-7692-47fb-b231-4cc36d1d67f5",
	"label": "National Gallery of Australia",
	"creator": "Ben Swift",
	"target": "^https?://searchthecollection\\.nga\\.gov\\.au/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-08-25 17:02:37"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2021 Ben Swift

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
	if (url.match(/uniqueId=(\d+)/)) {
		return "artwork";
	}
	return false;
}

function parseArtwork(uniqueId) {
	let jsonURL = `https://searchthecollection.nga.gov.au/stcapi/service/stc/node?uniqueId=${uniqueId}`;

	ZU.doGet(jsonURL, function (respText) {
		let newArtwork = new Zotero.Item("artwork");
		let json = JSON.parse(respText);

		if (parseInt(json.responseCode) != 200) {
			throw new Error(`NGA Collection API request failed: ${json.responseMessage}`);
		}

		let data = json.payLoad;

		// start populating the Zotero artwork item
		newArtwork.callNumber = uniqueId;
		newArtwork.url = `https://searchthecollection.nga.gov.au/object?uniqueId=${uniqueId}`;

		// pull data from the relevant fields of the json response
		newArtwork.title = data.vraTitleDisplayText;
		newArtwork.libraryCatalog = `National Gallery of Australia - ${data.ngadCollectionStatus}`;
		newArtwork.date = data.vraDateDisplayText;
		newArtwork.artworkMedium = data.vraMaterialDisplayText;

		let creators = JSON.parse(data.creatorsJson);
		let irns = []; // for deduplication

		for (let creator of creators) {
			// the API sometimes returns duplicate creators, so here we check
			// if we've seen this one before
			if (irns.includes(creator.irn)) continue;

			// if not, on with the show!
			let name = creator.NamFullName;
			let type = creator.NamPartyType;
			if (type == "Person") {
				// if we get a person, we should treat their name like
				// a personal name and attempt to parse it
				newArtwork.creators.push(ZU.cleanAuthor(name, "artist"));
			}
			else {
				// if we get an organization, we should pass its name
				// through as-is
				newArtwork.creators.push({
					lastName: name,
					creatorType: "contributor",
					fieldMode: 1
				});
			}
			irns.push(creator.irn);
		}

		newArtwork.tags = data.aatTerTerm;

		// provenance info (if present) is a useful thing to store in the notes field
		if (data.provenance) {
			newArtwork.notes.push(data.provenance);
		}

		newArtwork.complete();
	});
}

function doWeb(doc, url) {
	if (detectWeb(doc, url)) {
		// if `detectWeb' returns true then this will definitely match,
		// since it's the same regex
		let uniqueId = url.match(/uniqueId=(\d+)/)[1];
		parseArtwork(uniqueId);
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://searchthecollection.nga.gov.au/object?uniqueId=4193",
		"items": [
			{
				"itemType": "artwork",
				"title": "Be sure. Have a pap test. Visit your doctor or health centre now.",
				"creators": [
					{
						"firstName": "Alison",
						"lastName": "Alder",
						"creatorType": "artist"
					},
					{
						"lastName": "Redback Graphix",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "NSW Women's Advisory Service",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "Printcraft Pty Ltd",
						"creatorType": "contributor",
						"fieldMode": 1
					}
				],
				"date": "1991",
				"artworkMedium": "offset-lithograph, printed in colour inks, from multiple plates",
				"callNumber": "4193",
				"libraryCatalog": "National Gallery of Australia - Permanent Collection",
				"url": "https://searchthecollection.nga.gov.au/object?uniqueId=4193",
				"attachments": [],
				"tags": [
					{
						"tag": "feminism"
					},
					{
						"tag": "women"
					}
				],
				"notes": [
					"created by Alison Alder with Redback Graphix, Sydney, New South Wales, Australia, 1991\nwith Redback Graphix, the design studio, Sydney, New South Wales, Australia, from creation\nwho sold it to the National Gallery, Canberra, Australian Capital Territory, Australia, 1993\n\nThe collecting history of this work is complete. An unbroken chain of ownership is documented and has been verified."
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://searchthecollection.nga.gov.au/landing-info?uniqueId=13972",
		"items": [
			{
				"itemType": "artwork",
				"title": "Third detail. SNAILS SPACE, March 25 1995",
				"creators": [
					{
						"firstName": "David",
						"lastName": "Hockney",
						"creatorType": "artist"
					},
					{
						"lastName": "Nash Editions",
						"creatorType": "contributor",
						"fieldMode": 1
					}
				],
				"date": "1995",
				"artworkMedium": "colour inkjet print",
				"callNumber": "13972",
				"libraryCatalog": "National Gallery of Australia - Permanent Collection",
				"url": "https://searchthecollection.nga.gov.au/object?uniqueId=13972",
				"attachments": [],
				"tags": [
					{
						"tag": "Abstract"
					},
					{
						"tag": "Cubist"
					},
					{
						"tag": "arcs"
					},
					{
						"tag": "curves"
					},
					{
						"tag": "dots"
					},
					{
						"tag": "eclecticism"
					},
					{
						"tag": "form"
					},
					{
						"tag": "humour"
					},
					{
						"tag": "imagination"
					},
					{
						"tag": "lines"
					},
					{
						"tag": "narrative"
					},
					{
						"tag": "perspective"
					},
					{
						"tag": "pictorial space"
					},
					{
						"tag": "self-expression"
					},
					{
						"tag": "serial art"
					},
					{
						"tag": "shape"
					},
					{
						"tag": "symbolism"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
