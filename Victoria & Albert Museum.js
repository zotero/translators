{
	"translatorID": "56fc13bf-411f-4409-9a61-3d334d76763b",
	"label": "Victoria & Albert Museum",
	"creator": "Richard Palmer - V&A Digital Media & Publishing",
	"target": "^https?://collections\\.vam\\.ac\\.uk",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-04-03 16:45:24"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2022 V&A Museum

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
	if (url.includes("/item/")) {
		return "artwork";
	}
	else if (url.includes("/search/") && getRecords(doc).length) {
		return "multiple";
	}
	return false;
}

function scrape(doc, url) {
	var id = url.match(/item\/(O[0-9]+)/i)[1];

	var apiUrl = "https://api.vam.ac.uk/v2/museumobject/" + id;
	Zotero.Utilities.doGet(apiUrl, function (text) {
		var museumobject = JSON.parse(text);
		var data = museumobject.record;
		var item = new Zotero.Item("artwork");
		if (data.titles.length > 0) {
			item.title = data.titles[0].title;
			item.shortTitle = data.objectType;
		}
		else if (data.objectType) {
			item.title = data.objectType;
			item.shortTitle = data.objectType;
		}

		item.abstractNote = data.briefDescription;
		item.medium = data.materialsAndTechniques;
		item.artworkSize = data.dimensionsNote;
		if (data.productionDates.length > 1) {
			item.date = data.productionDates[0].date.text;
		}
		else if (data.productionDates.length > 0) {
			item.date = data.productionDates[0].date.text;
		}

		item.archive = data.collectionCode.text;
		item.libraryCatalog = 'Victoria & Albert Museum';
		item.callNumber = data.accessionNumber;
		item.rights = data.creditLine;
		item.url = url;


		var artistMakerPerson = data.artistMakerPerson;
		for (var i = 0; i < artistMakerPerson.length; i++) {
			// This is not ideal and assume surname, firstnames convention is correct
			var fullName = artistMakerPerson[i].name.text;
			var lastComma = fullName.lastIndexOf(",");
			var firstName = "";
			var lastName = "";

			if (lastComma > 0) {
				lastName = fullName.substring(0, lastComma);
				firstName = fullName.substring(lastComma + 1);
			}
			else {
				firstName = fullName;
			}

			item.creators.push({
				lastName: lastName,
				firstName: firstName,
				creatorType: "author"
			});
		}

		var artistMakerPeople = data.artistMakerPeople;
		for (var j = 0; j < artistMakerPeople.length; j++) {
			item.creators.push({
				lastName: artistMakerPeople[j].name.text,
				fieldMode: 1,
				creatorType: "author"
			});
		}

		var artistMakerOrganisations = data.artistMakerOrganisations;
		for (var k = 0; k < artistMakerOrganisations.length; k++) {
			item.creators.push({
				lastName: artistMakerOrganisations[k].name.text,
				fieldMode: 1,
				creatorType: "author"
			});
		}

		item.attachments.push({
			document: doc,
			title: "Snapshot"
		});

		item.complete();
	});
}

function getRecords(doc) {
	return ZU.xpath(doc, '//figure[contains(@class, "b-object-card--etc")]//a');
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		var artworks = {};

		var items = getRecords(doc);

		for (var item in items) {
			var title = ZU.xpathText(items[item], './/div[@class="b-object-card__caption"]');
			var href = items[item].href;
			artworks[href] = title;
		}
		Zotero.selectItems(artworks, function (artworks) {
			var articles = [];

			if (!artworks) {
				return true;
			}
			for (var i in artworks) {
				articles.push(i);
			}
			Zotero.Utilities.processDocuments(articles, scrape);
			return false;
	    });
	}
	else {
		scrape(doc, url);
	}
	return false;
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://collections.vam.ac.uk/item/O4293/ripple-pattern-vase-imperial-glass-co/",
		"items": [
			{
				"itemType": "artwork",
				"title": "'Ripple' pattern",
				"creators": [,
					{
						"lastName": "",
						"creatorType": "manufacturer",
						"firstName": "Imperial Glass Co."
					}],
				"date": "ca. 1914 and further dates",
				"abstract": "Vase of glass, made by Imperial Glass Company, Ohio, c. 1914-25",
				"artworkMedium": "Press moulded glass, heated",
				"artworkSize": "",
				"callNumber": "C.32-1992",
				"libraryCatalog": "Victoria & Albert Museum",
				"shortTitle": "Vase",
				"url": "https://collections.vam.ac.uk/item/O4293/ripple-pattern-vase-imperial-glass-co",
				"attachments": [
					{
						"title": "Explore the Collections (snapshot)"
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
		"url": "https://collections.vam.ac.uk/item/O19135/graphic-permutations-four-cubes-barton-glenys/",
		"items": [
			{
				"itemType": "artwork",
				"title": "Graphic Permutations",
				"creators": [
					{
						"lastName": "Barton",
						"creatorType": "maker",
						"firstName": "Glenys"
					}],
				"date": "1971",
				"abstract": "E, SP, BARTON GLENYS, 20",
				"artworkMedium": "Bone china, slip-cast, with silk-screened decoration",
				"artworkSize": "",
				"callNumber": "CIRC.277 to C-1973",
				"libraryCatalog": "Victoria & Albert Museum",
				"shortTitle": "Four Cubes",
				"url": "https://collections.vam.ac.uk/item/O19135/graphic-permutations-four-cubes-barton-glenys/",
				"attachments": [
					{
						"title": "Explore the Collections (snapshot)"
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
		"url": "https://collections.vam.ac.uk/item/O11451/the-garrick-bed-bed-chippendale-thomas-senior/",
		"items": [
			{
				"itemType": "artwork",
				"title": "The Garrick Bed",
				"creators": [
					{
						"lastName": "Chippendale (senior)",
						"creatorType": "maker",
						"firstName": "Thomas"
					}],
				"date": "ca. 1775",
				"abstract": "A bed of softwood, with fluted foot columns, painted white and green. The tester is edged with carved lappets painted in green and white. The current hangings of screen printed cotton date from 2001.",
				"artworkMedium": "Japanned (painted) beech and pine, with 20th century reproduction hangings.",
				"artworkSize": "The bed has been reduced in width.",
				"callNumber": "W.70-1916",
				"libraryCatalog": "Victoria & Albert Museum",
				"shortTitle": "The Garrick Bed",
				"url": "https://collections.vam.ac.uk/item/O11451/the-garrick-bed-bed-chippendale-thomas-senior/"
				"attachments": [
					{
						"title": "Explore the Collections (snapshot)"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]


]


]


]

