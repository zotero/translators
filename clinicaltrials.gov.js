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
	if (url.includes("https://clinicaltrials.gov/ct2/results")) {
		throw new Error("clinicaltrials.gov search pages not supported by Zotero, only individual trials");
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
	if (isXmlAPIRequest(url) || isJsonAPIRequest(url)) {
		return url.split("expr=")[1].split("&")[0];
	}
	else {
		return url.split("/show/")[1].split("?")[0];
	}
}

function dateTimeToDateString(dateTime) {
	return dateTime.split(" ")[0].split(":").join("-");
}

function nameToFirstAndLast(rawName) {
	const name = rawName.split(",")[0];
	const firstName = name.split(" ")[0];
	const lastName = name.split(",")[0].split(" ")[name.split(" ").length - 1];
	return [firstName, lastName];
}

function extrasObjToExtrasString(extrasObj) {
	let extrasString = "";
	for (let key in extrasObj) {
		if (key == "collaborators") {
			const stringifiedArray = "'" + extrasObj[key].join("','") + "'";
			extrasString = extrasString + "\n" + key + ": " + stringifiedArray;
		}
		else {
			extrasString = extrasString + "\n" + key + ": " + extrasObj[key];
		}
	}
	return extrasString;
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

		// Start get the creator info
		let creators = [];
		let responsiblePartyInvestigator;
		let sponsor;
		let collaborators = [];
		if (study.ProtocolSection.SponsorCollaboratorsModule.hasOwnProperty("ResponsibleParty")) {
			const responsibleParty = study.ProtocolSection.SponsorCollaboratorsModule.ResponsibleParty;
			if (typeof responsibleParty.ResponsiblePartyInvestigatorFullName == "string") {
				responsiblePartyInvestigator = responsibleParty.ResponsiblePartyInvestigatorFullName;
				const splitResponsiblePartyInvestigator = nameToFirstAndLast(responsiblePartyInvestigator);
				creators.push({
					firstName: splitResponsiblePartyInvestigator[0],
					lastName: splitResponsiblePartyInvestigator[1],
					creatorType: "author"
				});
			}
		}

		if (study.ProtocolSection.SponsorCollaboratorsModule.hasOwnProperty("LeadSponsor")) {
			sponsor = study.ProtocolSection.SponsorCollaboratorsModule.LeadSponsor.LeadSponsorName;
			creators.push({
				firstName: sponsor,
				creatorType: "author"
			});
		}
		
		if (study.ProtocolSection.SponsorCollaboratorsModule.hasOwnProperty("CollaboratorList")) {
			const collaboratorList = study.ProtocolSection.SponsorCollaboratorsModule.CollaboratorList.Collaborator;
			collaboratorList.forEach((collaborator) => {
				collaborators.push(
					{
						firstName: collaborator.CollaboratorName,
						creatorType: "author"
					}
				);
			});
			collaborators.forEach((collaborator) => {
				creators.push(collaborator);
			});
		}

		item.creators = creators;
		// Done get the creator info

		item.date = study.ProtocolSection.StatusModule.LastUpdateSubmitDate;
		item.accessDate = dateTimeToDateString(data.FullStudiesResponse.DataVrs);
		item.libraryCatalog = "clinicaltrials.gov";
		item.shortTitle = study.ProtocolSection.IdentificationModule.BriefTitle;
		item.url = "https://clinicaltrials.gov/ct2/show/" + clinicalTrialID;
		let extras = {
			submittedDate: study.ProtocolSection.StatusModule.StudyFirstSubmitDate,
			responsiblePartyInvestigator: responsiblePartyInvestigator,
			sponsor: sponsor
		};
		if (collaborators.length > 0) {
			extras.collaborators = [];
			collaborators.forEach((collaborator) => {
				extras.collaborators.push(collaborator.firstName);
			});
		}
		const extrasString = extrasObjToExtrasString(extras);
		item.extra = extrasString;
		item.complete();
	});
}


/** BEGIN TEST CASES **/
var testCases = [ 
	{
		"type": "web",
		"url": "https://clinicaltrials.gov/ct2/show/NCT04292899",
		"items": [
			{
				"itemType": "report",
				"title": "A Phase 3 Randomized Study to Evaluate the Safety and Antiviral Activity of Remdesivir (GS-5734™) in Participants With Severe COVID-19",
				"creators": [
					{
						"firstName": "Gilead Sciences",
						"creatorType": "author"
					}
				],
				"date": "March 27, 2020",
				"accessDate": "2020-04-01",
				"libraryCatalog": "clinicaltrials.gov",
				"shortTitle": "Study to Evaluate the Safety and Antiviral Activity of Remdesivir (GS-5734™) in Participants With Severe Coronavirus Disease (COVID-19)",
				"url": "https://clinicaltrials.gov/ct2/show/NCT04292899",
				"extra": "submittedDate: February 28, 2020\nresponsiblePartyInvestigator: undefined\nsponsor: Gilead Sciences",
				"notes": [],
          		"tags": [],
        		"seeAlso": [],
         		"attachments": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://clinicaltrials.gov/ct2/show/NCT00287391",
		"items": [
			{
				"itemType": "report",
				"title": "The Impact of Gastroesophageal Reflux Disease in Sleep Disorders: A Pilot Investigation of Rabeprazole, 20 mg Twice Daily for the Relief of GERD-Related Insomnia.",
				"creators": [
					{
						"firstName": "University of North Carolina",
						"creatorType": "author"
					},
					{
						"firstName": "Janssen Pharmaceutica N.V., Belgium",
						"creatorType": "author"
					}
				],
				"date": "April 25, 2007",
				"accessDate": "2020-04-01",
				"libraryCatalog": "clinicaltrials.gov",
				"shortTitle": "Sleep Disorders and Gastroesophageal Reflux Disease (GERD)",
				"url": "https://clinicaltrials.gov/ct2/show/NCT00287391",
				"extra": "submittedDate: February 3, 2006\nresponsiblePartyInvestigator: undefined\nsponsor: University of North Carolina\ncollaborators: 'Janssen Pharmaceutica N.V., Belgium'",
				"notes": [],
          		"tags": [],
        		"seeAlso": [],
         		"attachments": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://clinicaltrials.gov/ct2/show/NCT04261517?recrs=e&cond=COVID&draw=2&rank=8",
		"items": [
			{
				"itemType": "report",
				"title": "Efficacy and Safety of Hydroxychloroquine for Treatment of Pneumonia Caused by 2019-nCoV ( HC-nCoV )",
				"creators": [
					{
						"firstName": "Hongzhou",
						"lastName": "Lu",
						"creatorType": "author"
					},
					{
						"firstName": "Shanghai Public Health Clinical Center",
						"creatorType": "author"
					}
				],
				"date": "March 22, 2020",
				"accessDate": "2020-04-01",
				"libraryCatalog": "clinicaltrials.gov",
				"url": "https://clinicaltrials.gov/ct2/show/NCT04261517",
				"extra": "submittedDate: February 6, 2020\nresponsiblePartyInvestigator: Hongzhou Lu\nsponsor: Shanghai Public Health Clinical Center",
				"notes": [],
          		"tags": [],
        		"seeAlso": [],
         		"attachments": []
			}
		]
	}

]
/** END TEST CASES **/
