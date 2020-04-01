{
	"translatorID": "874d70a0-6b95-4391-a681-c56dabaa1411",
	"label": "Clinical Trials",
	"creator": "Ryan Velazquez",
	"target": "^https://(www\\.)?clinicaltrials\\.gov/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4, // TODO
	"browserSupport": "gcsibv", // TODO
	"lastUpdated": "2020-04-01 11:00:00"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2020 Ryan Velazquez
	
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
	// TODO: confirm that there all searches will have ct2/results in the url
	if (url.includes('https://clinicaltrials.gov/ct2/results')){
		return "multiple"
	} else {
		return "journalArticle"
	}
}

// TODO: implement the search functionality
function getSearchResults(doc, checkOnly) {
	return false
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		return null // TODO: implement the search functionality, just returning null for now
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (items) ZU.processDocuments(Object.keys(items), scrape);
		});
	}
	else {
		scrape(doc, url);
	}
}

function isJsonAPIRequest(url) {
	if (url.includes("https://clinicaltrials.gov/api/query") && url.includes("fmt=JSON")) {
		return true
	} else {
		return false
	}
}

function isXmlAPIRequest(url) {
	if (url.includes("https://clinicaltrials.gov/api/query") && url.includes("fmt=XML")) {
		return true
	} else {
		return false
	}
}

function getClinicalTrialID(url) {
	// TODO: make sure this handles all the potential URLs
	if (isXmlAPIRequest(url)){
		return url.split("expr=")[1].split("&")[0]
	} else {
		return url.split('/show/')[1]
	}
}

function dateTimeToDateString(dateTime) {
	return dateTime.split(" ")[0].split(":").join("-")
}

function scrape(doc, url) {
	let jsonRequestURL
	if (!isJsonAPIRequest(url)){
		const clinicalTrialID = getClinicalTrialID(url)
		jsonRequestURL = "https://clinicaltrials.gov/api/query/full_studies?expr=" + clinicalTrialID + "&fmt=JSON"
	} else {
		jsonRequestURL = url
	}

	https.get(jsonRequestURL, (resp) => {  // TODO: replace the `https.get` with `ZU.doGet` and modify accordingly
		let data = ''
		resp.on('data', (chunk) => { data += chunk; });
		resp.on('end', () => {
			var item = {} /// TODO: replace `var item = {}` with `var item = new Zotero.Item(type)`
			data = JSON.parse(data)
			item.accessDate = dateTimeToDateString(data.FullStudiesResponse.DataVrs)
			item.title = data.FullStudiesResponse.FullStudies[0].Study.ProtocolSection.IdentificationModule.OfficialTitle
			item.shortTitle = data.FullStudiesResponse.FullStudies[0].Study.ProtocolSection.IdentificationModule.BriefTitle
			// TODO: parse all the data from the json into the `item`
			console.log('item: ', item);
		})
	})
}


/** BEGIN TEST CASES **/
var testCases = [ // TODO: set up test cases
	
]
/** END TEST CASES **/


// TEMPORARY: Test Function for local testing with node while developing
// comment out the json metadata at the top and then run `node clinicaltrials.gov.js`

const https = require('https')

function testURL(url, testName){
	console.log('\n  ----  testing ', testName)
	doWebResult = doWeb(null, url)
}

console.log('running temporary tests')
testURL("https://clinicaltrials.gov/ct2/show/NCT04292899", "clinical trials main web page")
testURL("https://clinicaltrials.gov/api/query/full_studies?expr=NCT04292899&fmt=JSON", "clinical trials json api request")
testURL("https://clinicaltrials.gov/api/query/full_studies?expr=NCT04292899&fmt=XML", "clinical trials xml api request")
testURL("https://clinicaltrials.gov/ct2/results?recrs=ab&cond=COVID-19&term=&cntry=&state=&city=&dist=", "clinical trials search result")
