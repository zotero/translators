{
	"translatorID": "0f6f5164-b44b-4ef6-9c5e-e3f39637569b",
	"label": "Envidat",
	"creator": "Alain Borel",
	"target": "^https://(www.)?envidat.ch",
	"minVersion": "6.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-12-08 12:13:36"
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

const datasetType = ZU.fieldIsValidForType('title', 'dataset')
	? 'dataset'
	: 'document';

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
	// Zotero.debug(url);
	if (url.includes('/metadata/')) {
		// Zotero.debug('This should be a dataset');
		return datasetType;
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
	// Zotero.debug('queryString: ' + queryString);
	let urlParams = new URLSearchParams(queryString);
	let query = urlParams.get('search');
	let tags = urlParams.get('tags');
	if (tags) {
		tags = tags.split(',');
	}
	else {
		tags = [];
	}
	// Zotero.debug('querystring: ' + queryString);
	// Zotero.debug('query: ' + query);
	// Zotero.debug('tags: ' + tags);

	let termCombinations = possibleCombinations(query);
	let myQuery = apiQuery(termCombinations);

	let searchApiUrl = 'https://www.envidat.ch/query?' + myQuery;
	// Zotero.debug(searchApiUrl);
	let text = await requestText(searchApiUrl);
	
	let rsp = JSON.parse(text).response;
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
		let text = await requestText(dataciteUrl);
		processMetadata(text);
	}
}

function processMetadata(text) {
	let parser = new DOMParser();
	let xmlDoc = parser.parseFromString(text, "text/xml");
	let item = new Zotero.Item(datasetType);
	item.repository = 'Envidat';

	let titleNode = xmlDoc.getElementsByTagName("title");
	if (titleNode) {
		item.title = titleNode[0].childNodes[0].nodeValue;
	}

	let pubYearNode = xmlDoc.getElementsByTagName("publicationYear");
	if (pubYearNode) {
		item.date = pubYearNode[0].childNodes[0].nodeValue;
	}

	let languageNode = xmlDoc.getElementsByTagName("language");
	if (languageNode) {
		item.language = languageNode[0].childNodes[0].nodeValue;
	}

	let publisherNode = xmlDoc.getElementsByTagName("publisher");
	if (publisherNode) {
		item.publisher = publisherNode[0].childNodes[0].nodeValue;
	}

	let creatorNodes = xmlDoc.getElementsByTagName("creator");
	for (let creatorNode of creatorNodes) {
		let givenName = creatorNode.getElementsByTagName("givenName")[0].childNodes[0].nodeValue;
		let familyName = creatorNode.getElementsByTagName("familyName")[0].childNodes[0].nodeValue;
		// TODO should we use or map the roles from Datacite?
		let author = { lastName: familyName, firstName: givenName, creatorType: 'author' };
		item.creators.push(author);
	}

	let subjectNodes = xmlDoc.getElementsByTagName("subject");
	for (let subjectNode of subjectNodes) {
		let tag = { tag: subjectNode.childNodes[0].nodeValue };
		item.tags.push(tag);
	}

	// TODO find an example with a DOI
	let doiNode = xmlDoc.getElementsByTagName("identifier");
	if (doiNode) {
		if (doiNode[0].childNodes == 1) {
			item.DOI = doiNode[0].childNodes[0].nodeValue;
		}
	}

	let alternateIdentifierNodes = xmlDoc.getElementsByTagName("alternateIdentifier");
	for (let alternateIdentifierNode of alternateIdentifierNodes) {
		// The URL given in the RIS export is apparently the first one,
		// but the one with a UUID feels more stable, so let's just use the last one
		if (alternateIdentifierNode.getAttribute("alternateIdentifierType") == 'URL') {
			item.url = alternateIdentifierNode.childNodes[0].nodeValue;
		}
	}

	let descriptionNodes = xmlDoc.getElementsByTagName("description");
	for (let descriptionNode of descriptionNodes) {
		if (descriptionNode.getAttribute("descriptionType") == 'Abstract') {
			item.abstractNote = descriptionNode.childNodes[0].nodeValue;
		}
	}

	let rightNodes = xmlDoc.getElementsByTagName("rights");
	for (let rightNode of rightNodes) {
		item.rights = rightNode.childNodes[0].nodeValue;
	}
	
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.envidat.ch/#/metadata/experimental-rockfall-dataset-tschamut-grisons-switzerland",
		"detectedItemType": "dataset",
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
				"repository": "WSL Institute for Snow and Avalanche Research SLF",
				"rights": "ODbL with Database Contents License (DbCL)",
				"url": "https://www.envidat.ch/dataset/5b7a47bf-cbea-42a0-879f-ea2ccd17e82f",
				"attachments": [],
				"tags": [
					{
						"tag": "DEM"
					},
					{
						"tag": "DEPOSITION POINTS"
					},
					{
						"tag": "INDUCED ROCKFALL"
					},
					{
						"tag": "NATURAL HAZARDS"
					},
					{
						"tag": "ROCKFALL"
					},
					{
						"tag": "ROCKFALL EXPERIMENTS"
					},
					{
						"tag": "ROCKFALL RUNOUT"
					},
					{
						"tag": "SENSOR STREAM"
					},
					{
						"tag": "STONENODE"
					},
					{
						"tag": "STONENODEDATA"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.envidat.ch/#/metadata/gem-bh",
		"detectedItemType": "dataset",
		"items": [
			{
				"itemType": "dataset",
				"title": "Processed permafrost borehole data (2940 m asl), Gemsstock, Switzerland",
				"creators": [
					{
						"lastName": "Phillips",
						"firstName": "Marcia",
						"creatorType": "author"
					}
				],
				"date": "2016",
				"abstractNote": "Processed ground temperature measurements at the Gemsstock permafrost borehole in canton Uri, Switzerland. The borehole is located at 2940 m asl on a steep (50&deg;) North-West slope (315&deg;). The surface material is bedrock and borehole depth is 40 m.  Thermistors used YSI 44008. Year of drilling 2006. This borehole is part of the Swiss Permafrost network, PERMOS (www.permos.ch). Contact phillips@slf.ch for details of processing applied.\nPublications\n1. A. Haberkorn, M. Phillips, R. Kenner, H. Rhyner, M. Bavay, S.P. Galos, M. Hoelzle. Thermal regime of rock and its relation to snow cover in steep Alpine rock walls: Gemsstock, central Swiss Alps. 2015. Geografiska Annaler: Series A, Physical Geography. Volume 97. Issue 3. 579–597. http://dx.doi.org/10.1111/geoa.12101. 10.1111/geoa.12101.\n2. R. Kenner, M. Phillips, C. Danioth, C. Denier, P. Thee, A. Zgraggen. Investigation of rock and ice loss in a recently deglaciated mountain rock wall using terrestrial laser scanning: Gemsstock, Swiss Alps. 2011. Cold Regions Science and Technology. Volume 67. Issue 3. 157–164. http://dx.doi.org/10.1016/j.coldregions.2011.04.006. 10.1016/j.coldregions.2011.04.006.",
				"language": "en",
				"libraryCatalog": "Envidat",
				"repository": "PERMOS",
				"rights": "ODbL with Database Contents License (DbCL)",
				"url": "https://www.envidat.ch/dataset/1e117ff0-3fd3-4f7f-8593-9313fc79e0ca",
				"attachments": [],
				"tags": [
					{
						"tag": "BOREHOLE"
					},
					{
						"tag": "GEMSSTOCK"
					},
					{
						"tag": "PERMAFROST"
					},
					{
						"tag": "PERMOS"
					},
					{
						"tag": "TEMPERATURE"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
