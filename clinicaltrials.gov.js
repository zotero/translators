{
	"translatorID": "874d70a0-6b95-4391-a681-c56dabaa1411",
	"label": "clinicaltrials.gov",
	"creator": "Ryan Velazquez",
	"target": "^https://(www\\.)?clinicaltrials\\.gov/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2020-04-01 14:00:00"
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
	if (url.includes('https://clinicaltrials.gov/ct2/results')) {
		throw new Error('clinicaltrials.gov search pages not supported by Zotero, only individual trials');
	}
	else {
		return "report";
	}
}

function doWeb(doc, url) {
	scrape(doc, url);
}

function isJsonAPIRequest(url) {
	if (url.includes("https://clinicaltrials.gov/api/query") && url.includes("fmt=JSON")) {
		return true;
	}
	else {
		return false;
	}
}

function isXmlAPIRequest(url) {
	if (url.includes("https://clinicaltrials.gov/api/query") && url.includes("fmt=XML")) {
		return true;
	}
	else {
		return false;
	}
}

function getClinicalTrialID(url) {
	// TODO: make sure this handles all the potential URLs
	if (isXmlAPIRequest(url) || isJsonAPIRequest(url)) {
		return url.split("expr=")[1].split("&")[0];
	}
	else {
		return url.split('/show/')[1].split("?")[0];
	}
}

function dateTimeToDateString(dateTime) {
	return dateTime.split(" ")[0].split(":").join("-");
}

function scrape(doc, url) {
	const clinicalTrialID = getClinicalTrialID(url);
	let jsonRequestURL;
	if (!isJsonAPIRequest(url)) {
		jsonRequestURL = `https://clinicaltrials.gov/api/query/full_studies?expr=${clinicalTrialID}&fmt=JSON`;
	}
	else {
		jsonRequestURL = url;
	}

	ZU.doGet(jsonRequestURL, function (resp) {
		const data = JSON.parse(resp);
		var item = new Zotero.Item("report");
		const study = data.FullStudiesResponse.FullStudies[0].Study;
		item.itemType = "report";
		item.title = study.ProtocolSection.IdentificationModule.OfficialTitle;

		// Get the creator info
		const responsibleParty = study.ProtocolSection.SponsorCollaboratorsModule.ResponsibleParty;
		if (typeof responsibleParty.ResponsiblePartyInvestigatorFullName == "string") {
			let authorName = responsibleParty.ResponsiblePartyInvestigatorFullName;
			item.creator = {
				author: authorName
			};
		}
		else if (study.ProtocolSection.SponsorCollaboratorsModule.ResponsibleParty.ResponsiblePartyType == "Sponsor") {
			let sponsor = study.ProtocolSection.SponsorCollaboratorsModule.LeadSponsor.LeadSponsorName;
			item.creator = {
				author: sponsor
			};
		}

		item.date = study.ProtocolSection.StatusModule.LastUpdateSubmitDate; // TODO: is this the date that we want? Would "StudyFirstSubmitDate" be better?
		item.accessDate = dateTimeToDateString(data.FullStudiesResponse.DataVrs);
		item.libraryCatalog = "clinicaltrials.gov";
		item.shortTitle = study.ProtocolSection.IdentificationModule.BriefTitle;
		item.url = "https://clinicaltrials.gov/ct2/show/" + clinicalTrialID;
		item.complete();
	});
}


/** BEGIN TEST CASES **/
// TODO: set up more test cases
var testCases = [ 
	{
		"type": "web",
		"url": "https://clinicaltrials.gov/ct2/show/NCT04292899",
		"items": [
			{
				"itemType": "report",
				"title": "A Phase 3 Randomized Study to Evaluate the Safety and Antiviral Activity of Remdesivir (GS-5734™) in Participants With Severe COVID-19",
				"creator": {
					"author": "Gilead Sciences"
				},
				"date": "February 28, 2020",
				"accessDate": "2020-04-01",
				"libraryCatalog": "clinicaltrials.gov",
				"shortTitle": "Study to Evaluate the Safety and Antiviral Activity of Remdesivir (GS-5734™) in Participants With Severe Coronavirus Disease (COVID-19)",
				"url": "https://clinicaltrials.gov/ct2/show/NCT04292899"
			}
		]
	}
]
/** END TEST CASES **/
