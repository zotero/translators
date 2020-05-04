{
	"translatorID": "874d70a0-6b95-4391-a681-c56dabaa1411",
	"label": "clinicaltrials.gov",
	"creator": "Ryan Velazquez",
	"target": "^https://(www\\.)?clinicaltrials\\.gov/ct2/show",
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

function detectWeb() {
	return "report";
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
				creators.push(ZU.cleanAuthor(responsiblePartyInvestigator, "author", false));
			}
		}

		if (study.ProtocolSection.SponsorCollaboratorsModule.hasOwnProperty("LeadSponsor")) {
			sponsor = study.ProtocolSection.SponsorCollaboratorsModule.LeadSponsor.LeadSponsorName;
			let sponsorCreatorType;
			if (creators.length == 0) {
				sponsorCreatorType = "author";
			}
			else {
				sponsorCreatorType = "contributor";
			}
			creators.push({
				firstName: sponsor,
				creatorType: sponsorCreatorType
			});
		}
		
		if (study.ProtocolSection.SponsorCollaboratorsModule.hasOwnProperty("CollaboratorList")) {
			const collaboratorList = study.ProtocolSection.SponsorCollaboratorsModule.CollaboratorList.Collaborator;
			collaboratorList.forEach((collaborator) => {
				collaborators.push(
					{
						firstName: collaborator.CollaboratorName,
						creatorType: "contributor"
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
		item.institution = "clinicaltrials.gov";
		item.reportNumber = clinicalTrialID;
		item.shortTitle = study.ProtocolSection.IdentificationModule.BriefTitle;
		item.abstractNote = study.ProtocolSection.DescriptionModule.BriefSummary;
		item.url = "https://clinicaltrials.gov/ct2/show/" + clinicalTrialID;
		item.reportType = "Clinical trial registration";
		item.extra = `submitted: ${study.ProtocolSection.StatusModule.StudyFirstSubmitDate}`;
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
				"abstractNote": "The primary objective of this study is to evaluate the efficacy of 2 remdesivir (RDV) regimens with respect to clinical status assessed by a 7-point ordinal scale on Day 14.",
				"creators": [
					{
						"firstName": "Gilead Sciences",
						"creatorType": "author"
					}
				],
				"date": "April 28, 2020",
				"accessDate": "2020-04-01",
				"libraryCatalog": "clinicaltrials.gov",
				"shortTitle": "Study to Evaluate the Safety and Antiviral Activity of Remdesivir (GS-5734™) in Participants With Severe Coronavirus Disease (COVID-19)",
				"url": "https://clinicaltrials.gov/ct2/show/NCT04292899",
				"institution": "clinicaltrials.gov",
				"reportNumber": "NCT04292899",
				"reportType": "Clinical trial registration",
				"extra": "submitted: February 28, 2020",
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
				"abstractNote": "This study will investigate Gastroesophageal Reflux Disease (GERD)as a cause of sleep disturbance. Patients with GERD may experience all or some of the following symptoms: stomach acid or partially digested food re-entering the esophagus (which is sometimes referred to as heartburn or regurgitation) and belching. Even very small, unnoticeable amounts of rising stomach acid may cause patients to wake up during the night.\n\nThis study will also investigate the effect of Rabeprazole, (brand name Aciphex) on patients with known insomnia. Rabeprazole is an FDA approved medication already marketed for the treatment of GERD.",
				"creators": [
					{
						"firstName": "University of North Carolina",
						"creatorType": "author"
					},
					{
						"firstName": "Janssen Pharmaceutica N.V., Belgium",
						"creatorType": "contributor"
					}
				],
				"date": "April 25, 2007",
				"accessDate": "2020-04-01",
				"libraryCatalog": "clinicaltrials.gov",
				"shortTitle": "Sleep Disorders and Gastroesophageal Reflux Disease (GERD)",
				"url": "https://clinicaltrials.gov/ct2/show/NCT00287391",
				"institution": "clinicaltrials.gov",
				"reportNumber": "NCT00287391",
				"reportType": "Clinical trial registration",
				"extra": "submitted: February 3, 2006",
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
				"title": "Efficacy and Safety of Hydroxychloroquine for Treatment of COVID-19",
				"abstractNote": "The study aims to evaluate the efficacy and safety of hydroxychloroquine in the treatment of COVID-19 pneumonia.",
				"creators": [
					{
						"firstName": "Hongzhou",
						"lastName": "Lu",
						"creatorType": "author"
					},
					{
						"firstName": "Shanghai Public Health Clinical Center",
						"creatorType": "contributor"
					}
				],
				"date": "April 9, 2020",
				"accessDate": "2020-04-01",
				"libraryCatalog": "clinicaltrials.gov",
				"url": "https://clinicaltrials.gov/ct2/show/NCT04261517",
				"institution": "clinicaltrials.gov",
				"reportNumber": "NCT04261517",
				"reportType": "Clinical trial registration",
				"extra": "submitted: February 6, 2020",
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": []
			}
		]
	}
]
/** END TEST CASES **/
