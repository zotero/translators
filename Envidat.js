{
	"translatorID": "0f6f5164-b44b-4ef6-9c5e-e3f39637569b",
	"label": "Envidat",
	"creator": "Alain Borel",
	"target": "^https://(www\\.)?envidat.ch/",
	"minVersion": "6.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-04-29 03:02:00"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2023 Alain Borel

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

// A search query in the frontend will be converted to a query for:
// all the words in the title or the notes
// OR all possible single-word queries in the title or notes
let possibleCombinations = (str) => {
	let combinations = ['%22*' + str.split(' ').join('%20') + '*%22~2'];
	let terms = str.match(/\S+/g);
	for (let i = 0; i < terms.length; i++) {
		combinations.push('%22*' + terms[i] + '*%22');
	}
	return combinations;
};

// create the search URL for the API using an array of possible combinations
let apiQuery = (arr) => {
	const finalParams = '&wt=json&rows=1000&fq=capacity:public&fq=state:active';
	let subterms = [];
	for (let k = 0; k < arr.length; k++) {
		subterms.push('title:' + arr[k]);
		subterms.push('notes:' + arr[k]);
	}
	return 'q=' + subterms.join('%20OR%20') + finalParams;
};

function detectWeb(doc, url) {
	if (url.includes('/#/metadata/') || url.includes('/dataset/')) {
		return 'dataset';
	}
	else if (url.includes('/#/browse?')) {
		Zotero.debug('This should be multiple objects');
		return 'multiple';
	}
	else return false;
}

async function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	
	// https://www.envidat.ch/#/browse?search=rock%20snow
	// => https://www.envidat.ch/query?q=title:%22*rock%20snow*%22~2%20OR%20notes:%22*rock%20snow*%22~2%20OR%20title:%20%22*rock*%22%20OR%20notes:%20%22*rock*%22%20OR%20title:%20%22*snow*%22%20OR%20notes:%20%22*snow*%22&wt=json&rows=1000&fq=capacity:public&fq=state:active
	// tags are used at frontend level: https://www.envidat.ch/#/browse?search=rock%20snow&tags=FOREST&isAuthorSearch=false
	// => same call
	let queryString = doc.location.href.replace('https://www.envidat.ch/#/browse', '');
	let urlParams = new URLSearchParams(queryString);
	let query = urlParams.get('search');
	let tags = urlParams.get('tags');
	if (tags) {
		tags = tags.split(',');
	}
	else {
		tags = [];
	}

	let termCombinations = possibleCombinations(query);
	let myQuery = apiQuery(termCombinations);

	let searchApiUrl = 'https://www.envidat.ch/query?' + myQuery;
	let { response: rsp } = await requestJSON(searchApiUrl);
	
	let href;
	let title;
	if (rsp.docs) {
		found = true;
		if (checkOnly) return found;
		for (let row of rsp.docs) {
			// Zotero.debug(row.tags);
			let foundTags = {};
			let allTagsFound = true;
			for (let tag of tags) {
				foundTags[tag] = [];
				for (let rowTag of row.tags) {
					let matcher = new RegExp(tag, "g");
					//if (rowTag.search(tag) >= 0) {
					if (matcher.match(rowTag)) {
						foundTags[tag].push(rowTag);
					}
				}
			}
			for (let tag of tags) {
				if (foundTags[tag] == 0) {
					allTagsFound = false;
				}
			}

			Zotero.debug(allTagsFound);
			if (allTagsFound) {
				// Zotero.debug(foundTags);
				href = '/#/metadata/' + row.name;
				title = ZU.trimInternal(row.title);
				// Zotero.debug(href + '/' + title);
				items[href] = title;
			}
		}
	}
	
	return found ? items : false;
}

async function doWeb(doc, url) {
	if (detectWeb(doc, url) == 'multiple') {
		// Zotero.debug('multiple');
		let searchResults = await getSearchResults(doc, false);
		let items = await Zotero.selectItems(searchResults);
		// Zotero.debug(items.length);
		if (!items) return;
		for (let url of Object.keys(items)) {
			// Zotero.debug('about to scrape() ' + url);
			await scrape(url);
		}
	}
	else {
		await scrape(url);
	}
}

async function scrape(url) {
	// Zotero.debug(url);
	let dataciteUrl = url.replace('#/metadata/', 'dataset/') + '/export/datacite.xml';
	// Zotero.debug(dataciteUrl);
	if (dataciteUrl) {
		let xmlDoc = await requestDocument(dataciteUrl);
		processMetadata(xmlDoc);
	}
}

function processMetadata(xmlDoc) {
	// TODO: Replace with call to Datacite XML if we ever add a translator for that
	let item = new Zotero.Item('dataset');
	item.repository = 'Envidat';

	item.title = text(xmlDoc, "title");
	item.date = text(xmlDoc, "publicationYear");
	item.language = text(xmlDoc, "language");
	item.publisher = text(xmlDoc, "publisher");
	for (let creatorNode of xmlDoc.getElementsByTagName("creator")) {
		let givenName = text(creatorNode, "givenName");
		let familyName = text(creatorNode, "familyName");
		// TODO should we use or map the roles from Datacite?
		let author = { lastName: familyName, firstName: givenName, creatorType: 'author' };
		item.creators.push(author);
	}

	for (let subjectNode of xmlDoc.getElementsByTagName("subject")) {
		let tag = { tag: subjectNode.textContent };
		if (tag.tag === tag.tag.toUpperCase()) {
			tag.tag = ZU.capitalizeTitle(tag.tag, true);
		}
		item.tags.push(tag);
	}

	// TODO find an example with a DOI
	item.DOI = text(xmlDoc, "Identifier");
	item.url = text(xmlDoc, "alternateIdentifier[alternateIdentifierType='URL']:last-child");
	item.abstractNote = text(xmlDoc, "description[descriptionType='Abstract' i]");
	item.rights = text(xmlDoc, "rights");
	
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.envidat.ch/#/metadata/experimental-rockfall-dataset-tschamut-grisons-switzerland",
		"items": [
			{
				"itemType": "dataset",
				"title": "Induced Rockfall Dataset (Small Rock Experimental Campaign), Tschamut, Grisons, Switzerland",
				"creators": [
					{
						"lastName": "Caviezel",
						"firstName": "Andrin",
						"creatorType": "author"
					},
					{
						"lastName": "Bühler",
						"firstName": "Yves",
						"creatorType": "author"
					},
					{
						"lastName": "Christen",
						"firstName": "Marc",
						"creatorType": "author"
					},
					{
						"lastName": "Bartelt",
						"firstName": "Perry",
						"creatorType": "author"
					}
				],
				"date": "2018",
				"abstractNote": "Dataset of an experimental campaign of induced rockfall in Tschamut, Grisons, Switzerland. \nThe data archive contains site specific geographical data such as DEM and orthophoto as well as the deposition points of manually induced rockfall by releasing differently shaped boulders with 30–80 kg of mass. Additionally available are all the StoneNode data streams for rocks equipped with a sensor. The data set consists of \n* Deposition points from two series (wet (27/10/2016) and frozen (08/12/2016) ground)  \n* Digital Elevation Model (grid resolution 2 m) obtained via UAV\n* Orthophoto (5 cm resolution) obtained via UAV\n* Digitized rock point clouds (.pts input files for RAMMS::ROCKFALL)\n* StoneNode v1.0 raw data stream for equipped rocks.\nFurther information is found in\n* A. Caviezel et al., _Design and Evaluation of a Low-Power Sensor Device for Induced Rockfall Experiments_, IEEE Transactions on Instrumentation and Measurement, 2018, 67, 767-779, http://ieeexplore.ieee.org/document/8122020/\n*  P. Niklaus et al., _StoneNode: A low-power sensor device for induced rockfall experiments_, 2017 IEEE Sensors Applications Symposium (SAS), 2017, 1-6, http://ieeexplore.ieee.org/document/7894081/",
				"language": "en",
				"libraryCatalog": "Envidat",
				"repository": "EnviDat",
				"rights": "ODbL with Database Contents License (DbCL)",
				"url": "https://www.envidat.ch/dataset/5b7a47bf-cbea-42a0-879f-ea2ccd17e82f",
				"attachments": [],
				"tags": [
					{
						"tag": "Dem"
					},
					{
						"tag": "Deposition Points"
					},
					{
						"tag": "Induced Rockfall"
					},
					{
						"tag": "Natural Hazards"
					},
					{
						"tag": "Rockfall"
					},
					{
						"tag": "Rockfall Experiments"
					},
					{
						"tag": "Rockfall Runout"
					},
					{
						"tag": "Sensor Stream"
					},
					{
						"tag": "Stonenode"
					},
					{
						"tag": "Stonenodedata"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.envidat.ch/dataset/10-16904-envidat-28",
		"items": [
			{
				"itemType": "dataset",
				"title": "Snowfarming data set Davos and Martell 2015",
				"creators": [
					{
						"lastName": "Grünewald",
						"firstName": "Thomas",
						"creatorType": "author"
					},
					{
						"lastName": "Wolfsperger",
						"firstName": "Fabian",
						"creatorType": "author"
					},
					{
						"lastName": "Lehning",
						"firstName": "Michael",
						"creatorType": "author"
					}
				],
				"date": "2018",
				"abstractNote": "Two data sets obtained for snow farming projects (Fluela, Davos, CH and Martell, IT) in 2015. \nThe data set contains for each site:\n* 10 cm GIS raster of snow depth calculated from terrestrial laserscanning surveys (TLS) in the end of winter season (April/May)\n* 10 cm GIS raster of snow depth calculated from TLS in the end of summer season (October)\nInput files for SNOWPACK model:\n* .sno: snow profile at the end of winter\n* .smet: meteorological data measured by weather stations in the area\nFor more details see  Grünewald, T., Lehning, M., and Wolfsperger, F.: Snow farming: Conserving snow over the summer season, The Cryosphere Discuss., https://doi.org/10.5194/tc-2017-93, in review, 2017.",
				"language": "en",
				"libraryCatalog": "Envidat",
				"repository": "EnviDat",
				"rights": "ODbL with Database Contents License (DbCL)",
				"url": "https://www.envidat.ch/dataset/640b09be-3b86-492e-aba2-449329969989",
				"attachments": [],
				"tags": [
					{
						"tag": "Snow"
					},
					{
						"tag": "Snow Conservation"
					},
					{
						"tag": "Snow Farming"
					},
					{
						"tag": "Snowpack"
					},
					{
						"tag": "Terrestrial Laser Scanning"
					},
					{
						"tag": "Winter Tourism"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
