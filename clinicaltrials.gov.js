{
	"translatorID": "874d70a0-6b95-4391-a681-c56dabaa1411",
	"label": "clinicaltrials.gov",
	"creator": "Ryan Velazquez and contributors",
	"target": "^https://(classic\\.clinicaltrials\\.gov/ct2/(show|results)|(www\\.)?clinicaltrials\\.gov/(study|search))\\b",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-09-17 06:35:36"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2020 Ryan Velazquez and contributors

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


function isClassic(url) {
	return url.startsWith("https://classic.clinicaltrials.gov");
}

function detectWeb(doc, url) {
	let urlObject = new URL(url);

	if (!isClassic(url)) { // new UI and default since July 2023
		if (urlObject.pathname === "/search") {
			// Watch for disappearance/appearance of results due to filtering
			let resultsNode = doc.querySelector(".results-content-area");
			if (resultsNode) {
				// after the node has been generated by ajax, watch it
				Zotero.monitorDOMChanges(resultsNode);
			}

			if (getSearchResults(doc, true/* checkOnly */)) {
				return "multiple";
			}
		}
		else if (urlObject.pathname.startsWith("/study/")) {
			return "report";
		}
		return false;
	}

	// for "classic" UI
	if (urlObject.pathname === "/ct2/results") {
		// The following node being watched is present on the intial page.
		Zotero.monitorDOMChanges(doc.querySelector("#docListBlock"));
		if (getSearchResults(doc, true/* checkOnly */)) {
			return "multiple";
		}
	}
	else if (urlObject.pathname.startsWith("/ct2/show/")) {
		return "report";
	}

	return false;
}

// The keys in the returned item will be the NCTId, which is enough for
// identifying a report
function getSearchResults(doc, checkOnly) {
	let resultSelector
		= isClassic(doc.location.href)
			? '#theDataTable a[href^="/ct2/show/"]'
			: "ctg-search-hit-card header > a[href^='/study/']";
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll(resultSelector);
	for (let row of rows) {
		let id = getClinicalTrialID(row.href);
		let title = ZU.trimInternal(row.textContent);
		if (!id || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[id] = title;
	}
	return found ? items : false;
}

async function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		let trialIDs = await Z.selectItems(getSearchResults(doc));
		if (!trialIDs) return;
		for (let id of Object.keys(trialIDs)) {
			await scrape(id);
		}
	}
	else {
		await scrape(getClinicalTrialID(url));
	}
}

async function scrape(clinicalTrialID) {
	let jsonRequestURL = `https://classic.clinicaltrials.gov/api/query/full_studies?expr=${clinicalTrialID}&fmt=JSON`;
	classicJSONToItem(await requestJSON(jsonRequestURL));
}

function getClinicalTrialID(url) {
	let pathComponents = new URL(url).pathname.split("/");
	return pathComponents[pathComponents.length - 1]; // last component in pathname
}

// Convert the data object from the JSON response of "classic" API into item
// TODO:
// - Add support for new API
// - This can be the basis for a search and import translator
function classicJSONToItem(data) {
	let item = new Zotero.Item("report");

	let study = data.FullStudiesResponse.FullStudies[0].Study;

	// Start get the creator info
	let creators = [];

	let authorModule = study.ProtocolSection.SponsorCollaboratorsModule;
	let firstAuthor = authorModule.ResponsibleParty;
	let leadSponsor = authorModule.LeadSponsor;

	let investigatorName;
	if (firstAuthor
		&& firstAuthor.ResponsiblePartyType !== "Sponsor") { // a person
		// Clean up the comma trailing titles such as "First Last, MD, PhD"
		investigatorName = firstAuthor.ResponsiblePartyInvestigatorFullName;
		let cleanName = investigatorName.split(", ")[0];
		creators.push(ZU.cleanAuthor(cleanName, "author"));
	}

	if (leadSponsor && leadSponsor.LeadSponsorName !== investigatorName) {
		// lead sponsor is not a duplicate of the PI
		creators.push({
			lastName: leadSponsor.LeadSponsorName,
			creatorType: (creators.length ? "contributor" : "author"),
			fieldMode: 1
		});
	}

	if (authorModule.CollaboratorList) {
		let collabArray = authorModule.CollaboratorList.Collaborator || [];
		for (let entity of collabArray) {
			if (entity && entity.CollaboratorName) {
				creators.push({
					lastName: entity.CollaboratorName,
					creatorType: "contributor",
					fieldMode: 1
				});
			}
		}
	}

	item.creators = creators;

	let idModule = study.ProtocolSection.IdentificationModule;
	let statusModule = study.ProtocolSection.StatusModule;

	item.title = idModule.OfficialTitle;
	item.date = statusModule.LastUpdateSubmitDate;
	item.accessDate = ZU.strToISO(data.FullStudiesResponse.DataVrs);
	item.institution = "clinicaltrials.gov"; // publisher
	item.reportNumber = idModule.NCTId;
	item.shortTitle = idModule.BriefTitle;
	item.abstractNote = study.ProtocolSection.DescriptionModule.BriefSummary;
	item.url = "https://clinicaltrials.gov/study/" + idModule.NCTId;
	item.reportType = "Clinical trial registration";
	item.extra = `submitted: ${statusModule.StudyFirstSubmitDate}`;
	item.complete();
}


/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://clinicaltrials.gov/study/NCT04292899",
		"items": [
			{
				"itemType": "report",
				"title": "A Phase 3 Randomized Study to Evaluate the Safety and Antiviral Activity of Remdesivir (GS-5734™) in Participants With Severe COVID-19",
				"creators": [
					{
						"lastName": "Gilead Sciences",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "December 15, 2020",
				"abstractNote": "The primary objective of this study is to evaluate the efficacy of 2 remdesivir (RDV) regimens with respect to clinical status assessed by a 7-point ordinal scale on Day 14.",
				"extra": "submitted: February 28, 2020",
				"institution": "clinicaltrials.gov",
				"libraryCatalog": "clinicaltrials.gov",
				"reportNumber": "NCT04292899",
				"reportType": "Clinical trial registration",
				"shortTitle": "Study to Evaluate the Safety and Antiviral Activity of Remdesivir (GS-5734™) in Participants With Severe Coronavirus Disease (COVID-19)",
				"url": "https://clinicaltrials.gov/study/NCT04292899",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://clinicaltrials.gov/study/NCT00287391",
		"items": [
			{
				"itemType": "report",
				"title": "The Impact of Gastroesophageal Reflux Disease in Sleep Disorders: A Pilot Investigation of Rabeprazole, 20 mg Twice Daily for the Relief of GERD-Related Insomnia.",
				"creators": [
					{
						"lastName": "University of North Carolina",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"lastName": "Janssen Pharmaceutica N.V., Belgium",
						"creatorType": "contributor",
						"fieldMode": 1
					}
				],
				"date": "April 25, 2007",
				"abstractNote": "This study will investigate Gastroesophageal Reflux Disease (GERD)as a cause of sleep disturbance. Patients with GERD may experience all or some of the following symptoms: stomach acid or partially digested food re-entering the esophagus (which is sometimes referred to as heartburn or regurgitation) and belching. Even very small, unnoticeable amounts of rising stomach acid may cause patients to wake up during the night.\n\nThis study will also investigate the effect of Rabeprazole, (brand name Aciphex) on patients with known insomnia. Rabeprazole is an FDA approved medication already marketed for the treatment of GERD.",
				"extra": "submitted: February 3, 2006",
				"institution": "clinicaltrials.gov",
				"libraryCatalog": "clinicaltrials.gov",
				"reportNumber": "NCT00287391",
				"reportType": "Clinical trial registration",
				"shortTitle": "Sleep Disorders and Gastroesophageal Reflux Disease (GERD)",
				"url": "https://clinicaltrials.gov/study/NCT00287391",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://clinicaltrials.gov/study/NCT04261517?recrs=e&cond=COVID&draw=2",
		"items": [
			{
				"itemType": "report",
				"title": "Efficacy and Safety of Hydroxychloroquine for Treatment of COVID-19",
				"creators": [
					{
						"firstName": "Hongzhou",
						"lastName": "Lu",
						"creatorType": "author"
					},
					{
						"lastName": "Shanghai Public Health Clinical Center",
						"creatorType": "contributor",
						"fieldMode": 1
					}
				],
				"date": "April 9, 2020",
				"abstractNote": "The study aims to evaluate the efficacy and safety of hydroxychloroquine in the treatment of COVID-19 pneumonia.",
				"extra": "submitted: February 6, 2020",
				"institution": "clinicaltrials.gov",
				"libraryCatalog": "clinicaltrials.gov",
				"reportNumber": "NCT04261517",
				"reportType": "Clinical trial registration",
				"url": "https://clinicaltrials.gov/study/NCT04261517",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://classic.clinicaltrials.gov/ct2/show/NCT04292899",
		"items": [
			{
				"itemType": "report",
				"title": "A Phase 3 Randomized Study to Evaluate the Safety and Antiviral Activity of Remdesivir (GS-5734™) in Participants With Severe COVID-19",
				"creators": [
					{
						"lastName": "Gilead Sciences",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "December 15, 2020",
				"abstractNote": "The primary objective of this study is to evaluate the efficacy of 2 remdesivir (RDV) regimens with respect to clinical status assessed by a 7-point ordinal scale on Day 14.",
				"extra": "submitted: February 28, 2020",
				"institution": "clinicaltrials.gov",
				"libraryCatalog": "clinicaltrials.gov",
				"reportNumber": "NCT04292899",
				"reportType": "Clinical trial registration",
				"shortTitle": "Study to Evaluate the Safety and Antiviral Activity of Remdesivir (GS-5734™) in Participants With Severe Coronavirus Disease (COVID-19)",
				"url": "https://clinicaltrials.gov/study/NCT04292899",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.clinicaltrials.gov/search?term=transgender%20care",
		"defer": true,
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://classic.clinicaltrials.gov/ct2/results?cond=Coronavirus+Disease+2019&term=&cntry=&state=&city=&dist=&Search=Search",
		"defer": true,
		"items": "multiple"
	}
]
/** END TEST CASES **/
