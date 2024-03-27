{
	"translatorID": "b5b5808b-1c61-473d-9a02-e1f5ba7b8eef",
	"label": "Datacite JSON",
	"creator": "Philipp Zumstein",
	"target": "json",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 1,
	"lastUpdated": "2024-03-23 00:20:22"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2019 Philipp Zumstein
	
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

// copied from CSL JSON
function parseInput() {
	var str, json = "";
	
	// Read in the whole file at once, since we can't easily parse a JSON stream. The
	// chunk size here is pretty arbitrary, although larger chunk sizes may be marginally
	// faster. We set it to 1MB.
	while ((str = Z.read(1048576)) !== false) json += str;
	
	try {
		return JSON.parse(json);
	}
	catch (e) {
		Zotero.debug(e);
		return false;
	}
}

function detectImport() {
	var parsedData = parseInput();
	if (parsedData && (parsedData.schemaVersion && parsedData.schemaVersion.startsWith("http://datacite.org/schema/") || /datacite/i.test(parsedData.agency))) {
		return true;
	}
	return false;
}

/* eslint-disable camelcase*/
var mappingTypes = {
	article: "preprint",
	book: "book",
	chapter: "bookSection",
	"article-journal": "journalArticle",
	"article-magazine": "magazineArticle",
	"article-newspaper": "newspaperArticle",
	thesis: "thesis",
	"entry-encyclopedia": "encyclopediaArticle",
	"entry-dictionary": "dictionaryEntry",
	"paper-conference": "conferencePaper",
	personal_communication: "letter",
	manuscript: "manuscript",
	interview: "interview",
	motion_picture: "film",
	graphic: "artwork",
	webpage: "webpage",
	report: "report",
	bill: "bill",
	legal_case: "case",
	patent: "patent",
	legislation: "statute",
	map: "map",
	"post-weblog": "blogPost",
	post: "forumPost",
	song: "audioRecording",
	speech: "presentation",
	broadcast: "radioBroadcast",
	dataset: "dataset"
};
/* eslint-enable camelcase*/
// pre-6.0.26 releases don't have a dataset item type
if (datasetType == "document") {
	mappingTypes.dataset = 'document';
}


function doImport() {
	var data = parseInput();

	var type = "journalArticle";
	// we're using the citeproc mapping for pre v4 DataCite Kernel
	if (data.types.citeproc && mappingTypes[data.types.citeproc]) {
		type = mappingTypes[data.types.citeproc];
	}
	if (["softwaresourcecode", "softwareapplication", "mobileapplication", "videogame", "webapplication"].includes(data.types.schemaOrg.toLowerCase())) {
		type = "computerProgram";
	}
	if (data.types.resourceTypeGeneral == "BookChapter") {
		// for some reason datacite maps some BookChapters to citeproc article
		type = "bookSection";
	}

	var item = new Zotero.Item(type);
	if (data.types.citeproc == "dataset" && datasetType == "document") {
		item.extra = "Type: dataset";
	}
	var title = "";
	for (let titleElement of data.titles) {
		if (!titleElement.title) {
			continue;
		}
		if (!titleElement.titleType) {
			title = titleElement.title + title;
		}
		else if (titleElement.titleType.toLowerCase() == "subtitle") {
			title = title + ": " + titleElement.title;
		}
	}
	item.title = title;
	
	if (data.creators) {
		for (let creator of data.creators) {
			if (creator.familyName && creator.givenName) {
				item.creators.push({
					lastName: creator.familyName,
					firstName: creator.givenName,
					creatorType: "author"
				});
			}
			else if (creator.nameType == "Personal") {
				item.creators.push(ZU.cleanAuthor(creator.name, "author", true));
			}
			else {
				item.creators.push({ lastName: creator.name, creatorType: "author", fieldMode: 1 });
			}
		}
	}
	if (data.contributors) {
		for (let contributor of data.contributors) {
			let role = "contributor";
			if (contributor.contributorRole) {
				switch (contributor.contributorRole.toLowerCase()) {
					case "editor":
						role = "editor";
						break;
					case "producer":
						role = "producer";
						break;
					default:
						// use the already assigned value
				}
			}
			if (contributor.familyName && contributor.givenName) {
				item.creators.push({
					lastName: contributor.familyName,
					firstName: contributor.givenName,
					creatorType: role
				});
			}
			else if (contributor.nameType == "Personal") {
				item.creators.push(ZU.cleanAuthor(contributor.name, role));
			}
			else {
				item.creators.push({ lastName: contributor.name, creatorType: role, fieldMode: 1 });
			}
		}
	}
	if (typeof (data.publisher) == "object") {
		item.publisher = data.publisher.name;
	}
	else {
		item.publisher = data.publisher;
	}
	let dates = {};
	if (data.dates) {
		for (let date of data.dates) {
			dates[date.dateType] = date.date;
		}
		item.date = dates.Issued || dates.Updated || dates.Available || dates.Accepted || dates.Submitted || dates.Created || data.publicationYear;
	}
	
	item.DOI = data.doi;
	//add DOI to extra for unsupported items
	if (item.DOI && !ZU.fieldIsValidForType("DOI", item.itemType)) {
		if (item.extra) {
			item.extra += "\nDOI: " + item.DOI;
		}
		else {
			item.extra = "DOI: " + item.DOI;
		}
	}
	item.url = data.url;
	item.language = data.language;
	if (data.subjects) {
		for (let subject of data.subjects) {
			item.tags.push(subject.subject);
		}
	}
	if (data.formats) {
		item.medium = data.formats.join();
	}
	if (data.sizes) {
		item.pages = item.artworkSize = data.sizes.join(", ");
	}
	item.version = data.version;
	if (data.rightsList) {
		item.rights = data.rightsList.map(x => x.rights).join(", ");
	}
	
	var descriptionNote = "";
	if (data.descriptions) {
		for (let description of data.descriptions) {
			if (description.descriptionType == "Abstract") {
				item.abstractNote = description.description;
			}
			else {
				descriptionNote += "<h2>" + description.descriptionType + "</h2>\n" + description.description;
			}
		}
	}
	if (descriptionNote !== "") {
		item.notes.push({ note: descriptionNote });
	}
	if (data.container) {
		if (data.container.type == "Series") {
			item.publicationTitle = data.container.title;
			item.volume = data.container.volume;
			var pages = (data.container.firstPage || "") + (data.container.lastPage || "");
			if (!item.pages && pages !== "") {
				item.pages = pages;
			}
		}
		if (data.container.identifier && data.container.identifierType) {
			if (data.container.identifierType == "ISSN") {
				item.ISSN = data.container.identifier;
			}
			if (data.container.identifierType == "ISBN") {
				item.ISBN = data.container.identifier;
			}
		}
	}
	if (data.relatedItems) {
		for (let container of data.relatedItems) {
			// For containers following Metadata Kernel 4.4 update
			if (container.relationType == "IsPublishedIn") {
				// we only grab the container info for IsPublishedIn, i.e. mostly books for chapter & journals
				item.volume = container.volume;
				if (container.titles) {
					if (Array.isArray(container.titles) && container.titles.length) {
						item.publicationTitle = container.titles[0].title;
					}
					else {
						item.publicationTitle = container.titles.title;
					}
				}
				if (container.relatedItemIdentifier) {
					if (container.relatedItemIdentifier.relatedItemIdentifierType == "ISSN") {
						item.ISSN = container.relatedItemIdentifier.relatedItemIdentifier;
					}
					else if (container.relatedItemIdentifier.relatedItemIdentifierType == "ISBN") {
						item.ISBN = container.relatedItemIdentifier.relatedItemIdentifier;
					}
				}
				item.issue = container.issue;
				if (container.publicationYear) {
					item.date = container.publicationYear;
				}
				if (container.firstPage && container.lastPage) {
					item.pages = container.firstPage + "-" + container.lastPage;
				}
				else {
					item.pages = (container.firstPage || "") + (container.lastPage || "");
				}

				item.edition = container.edition;
				if (container.contributor && Array.isArray(container.contributor)) {
					for (let contributor of container.contributor) {
						let role = "contributor";
						if (contributor.contributorType == "Editor") {
							role = "editor";
						}
						if (contributor.familyName && contributor.givenName) {
							item.creators.push({
								lastName: contributor.familyName,
								firstName: contributor.givenName,
								creatorType: role
							});
						}
						else if (contributor.nameType == "Personal") {
							item.creators.push(ZU.cleanAuthor(contributor.name, role, true));
						}
						else {
							item.creators.push({ lastName: contributor.name, creatorType: role, fieldMode: 1 });
						}
					}
				}
				break;
			}
			else {
				continue;
			}
		}
	}
	if (data.relatedIdentifiers) {
		for (let relates of data.relatedIdentifiers) {
			if (!item.ISSN && relates.relatedIdentifierType == "ISSN") {
				item.ISSN = relates.relatedIdentifier;
			}
			if (!item.ISBN && relates.relatedIdentifierType == "ISBN") {
				item.ISBN = relates.relatedIdentifier;
			}
		}
	}
	// remove duplicate creators (they'll have had multiple roles in datacite metadata)
	let uniqueCreatorSet = new Set(item.creators.map(JSON.stringify));
	item.creators = Array.from(uniqueCreatorSet).map(JSON.parse);
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "import",
		"input": "{\n  \"id\": \"https://doi.org/10.5281/zenodo.2548653\",\n  \"doi\": \"10.5281/zenodo.2548653\",\n  \"url\": \"https://zenodo.org/record/2548653\",\n  \"types\": {\n    \"resourceTypeGeneral\": \"Text\",\n    \"resourceType\": \"Journal article\",\n    \"schemaOrg\": \"ScholarlyArticle\",\n    \"citeproc\": \"article-journal\",\n    \"bibtex\": \"article\",\n    \"ris\": \"RPRT\"\n  },\n  \"creators\": [\n    {\n      \"nameType\": \"Personal\",\n      \"name\": \"Dube, Zenzo Lusaba\",\n      \"givenName\": \"Zenzo Lusaba\",\n      \"familyName\": \"Dube\",\n      \"affiliation\": \"National University of Science and Technology, Zimbabwe\"\n    },\n    {\n      \"nameType\": \"Personal\",\n      \"name\": \"Murahwe, Gloria Rosi\",\n      \"givenName\": \"Gloria Rosi\",\n      \"familyName\": \"Murahwe\",\n      \"affiliation\": \"Reserve Bank of Zimbabwe\"\n    }\n  ],\n  \"titles\": [\n    {\n      \"title\": \"An analysis of corporate governance practices in government controlled versus private banking institutions in Zimbabwe\"\n    }\n  ],\n  \"publisher\": \"Zenodo\",\n  \"container\": {\n    \"type\": \"Series\",\n    \"identifier\": \"https://zenodo.org/communities/nustlibrary44\",\n    \"identifierType\": \"URL\"\n  },\n  \"subjects\": [\n    {\n      \"subject\": \"corporate governance\"\n    },\n    {\n      \"subject\": \"private banking\"\n    }\n  ],\n  \"contributors\": [\n\n  ],\n  \"dates\": [\n    {\n      \"date\": \"2015-01-01\",\n      \"dateType\": \"Issued\"\n    }\n  ],\n  \"publicationYear\": \"2015\",\n  \"language\": \"en\",\n  \"identifiers\": [\n    {\n      \"identifierType\": \"DOI\",\n      \"identifier\": \"https://doi.org/10.5281/zenodo.2548653\"\n    },\n    {\n      \"identifierType\": \"URL\",\n      \"identifier\": \"https://zenodo.org/record/2548653\"\n    }\n  ],\n  \"sizes\": [\n\n  ],\n  \"formats\": [\n\n  ],\n  \"rightsList\": [\n    {\n      \"rights\": \"Creative Commons Attribution 4.0 International\",\n      \"rightsUri\": \"http://creativecommons.org/licenses/by/4.0/legalcode\"\n    },\n    {\n      \"rights\": \"Open Access\",\n      \"rightsUri\": \"info:eu-repo/semantics/openAccess\"\n    }\n  ],\n  \"descriptions\": [\n    {\n      \"description\": \"The significance of good corporate governance practices is of paramount importance. It can be posited that the Zimbabwean banking sector crisis of the period 2003 to 2004 was largely due to poor corporate governance practices. Most of the banking institutions that faced closure in that era were of domestic origin. This crisis however did not affect the Government owned banks. This was a paradox as private banks are seen as profitable compared to Government owned banks. The paper sought to ascertain who between the government and private banks better adhered to corporate governance principles. Twenty one banks were involved in this study. A total of 39 questionnaires were sent, three per bank. Ten face to face interviews were conducted with the banks' directors and managers. The paper unearthed that corporate governance practices are observed by both private banks and government controlled banks; however private banks appear to have a slighter edge. Government owned banks do have good corporate practices in place\",\n      \"descriptionType\": \"Abstract\"\n    },\n    {\n      \"description\": \"This is an open access article distributed under the Creative Commons Attribution License, which permits unrestricted use, distribution, and reproduction in any medium, provided the original work is properly cited.\",\n      \"descriptionType\": \"Other\"\n    }\n  ],\n  \"geoLocations\": [\n\n  ],\n  \"fundingReferences\": [\n\n  ],\n  \"relatedIdentifiers\": [\n    {\n      \"relatedIdentifier\": \"10.5281/zenodo.2548652\",\n      \"relatedIdentifierType\": \"DOI\",\n      \"relationType\": \"IsVersionOf\"\n    },\n    {\n      \"relatedIdentifier\": \"https://zenodo.org/communities/nustlibrary44\",\n      \"relatedIdentifierType\": \"URL\",\n      \"relationType\": \"IsPartOf\"\n    }\n  ],\n  \"schemaVersion\": \"http://datacite.org/schema/kernel-4\",\n  \"providerId\": \"cern\",\n  \"clientId\": \"cern.zenodo\",\n  \"agency\": \"DataCite\",\n  \"state\": \"findable\"\n}",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "An analysis of corporate governance practices in government controlled versus private banking institutions in Zimbabwe",
				"creators": [
					{
						"lastName": "Dube",
						"firstName": "Zenzo Lusaba",
						"creatorType": "author"
					},
					{
						"lastName": "Murahwe",
						"firstName": "Gloria Rosi",
						"creatorType": "author"
					}
				],
				"date": "2015-01-01",
				"DOI": "10.5281/zenodo.2548653",
				"abstractNote": "The significance of good corporate governance practices is of paramount importance. It can be posited that the Zimbabwean banking sector crisis of the period 2003 to 2004 was largely due to poor corporate governance practices. Most of the banking institutions that faced closure in that era were of domestic origin. This crisis however did not affect the Government owned banks. This was a paradox as private banks are seen as profitable compared to Government owned banks. The paper sought to ascertain who between the government and private banks better adhered to corporate governance principles. Twenty one banks were involved in this study. A total of 39 questionnaires were sent, three per bank. Ten face to face interviews were conducted with the banks' directors and managers. The paper unearthed that corporate governance practices are observed by both private banks and government controlled banks; however private banks appear to have a slighter edge. Government owned banks do have good corporate practices in place",
				"language": "en",
				"rights": "Creative Commons Attribution 4.0 International, Open Access",
				"url": "https://zenodo.org/record/2548653",
				"attachments": [],
				"tags": [
					{
						"tag": "corporate governance"
					},
					{
						"tag": "private banking"
					}
				],
				"notes": [
					{
						"note": "<h2>Other</h2>\nThis is an open access article distributed under the Creative Commons Attribution License, which permits unrestricted use, distribution, and reproduction in any medium, provided the original work is properly cited."
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "import",
		"input": "{\n  \"id\": \"https://doi.org/10.5438/n138-z3mk\",\n  \"doi\": \"10.5438/n138-z3mk\",\n  \"url\": \"https://github.com/datacite/bolognese\",\n  \"types\": {\n    \"resourceTypeGeneral\": \"Software\",\n    \"resourceType\": \"SoftwareSourceCode\",\n    \"schemaOrg\": \"SoftwareSourceCode\",\n    \"citeproc\": \"article\",\n    \"bibtex\": \"misc\",\n    \"ris\": \"COMP\"\n  },\n  \"creators\": [\n    {\n      \"nameType\": \"Personal\",\n      \"name\": \"Fenner, Martin\",\n      \"givenName\": \"Martin\",\n      \"familyName\": \"Fenner\",\n      \"nameIdentifiers\": [\n        {\n          \"nameIdentifier\": \"https://orcid.org/0000-0003-0077-4738\",\n          \"nameIdentifierScheme\": \"ORCID\"\n        }\n      ]\n    }\n  ],\n  \"titles\": [\n    {\n      \"title\": \"Bolognese: a Ruby library for conversion of DOI Metadata\"\n    }\n  ],\n  \"publisher\": \"DataCite\",\n  \"container\": {\n  },\n  \"subjects\": [\n    {\n      \"subject\": \"doi\"\n    },\n    {\n      \"subject\": \"metadata\"\n    },\n    {\n      \"subject\": \"crossref\"\n    },\n    {\n      \"subject\": \"datacite\"\n    },\n    {\n      \"subject\": \"schema.org\"\n    },\n    {\n      \"subject\": \"bibtex\"\n    },\n    {\n      \"subject\": \"codemeta\"\n    }\n  ],\n  \"contributors\": [\n\n  ],\n  \"dates\": [\n    {\n      \"date\": \"2017-02-13\",\n      \"dateType\": \"Created\"\n    },\n    {\n      \"date\": \"2017-02-25\",\n      \"dateType\": \"Issued\"\n    },\n    {\n      \"date\": \"2017-02-25\",\n      \"dateType\": \"Updated\"\n    }\n  ],\n  \"publicationYear\": \"2017\",\n  \"identifiers\": [\n    {\n      \"identifierType\": \"DOI\",\n      \"identifier\": \"https://doi.org/10.5438/n138-z3mk\"\n    }\n  ],\n  \"sizes\": [\n\n  ],\n  \"formats\": [\n\n  ],\n  \"rightsList\": [\n\n  ],\n  \"descriptions\": [\n    {\n      \"description\": \"Ruby gem and command-line utility for conversion of DOI metadata from and to different metadata formats, including schema.org.\",\n      \"descriptionType\": \"Abstract\"\n    }\n  ],\n  \"geoLocations\": [\n\n  ],\n  \"fundingReferences\": [\n\n  ],\n  \"relatedIdentifiers\": [\n\n  ],\n  \"schemaVersion\": \"http://datacite.org/schema/kernel-4\",\n  \"providerId\": \"datacite\",\n  \"clientId\": \"datacite.datacite\",\n  \"agency\": \"DataCite\",\n  \"state\": \"findable\"\n}",
		"items": [
			{
				"itemType": "computerProgram",
				"title": "Bolognese: a Ruby library for conversion of DOI Metadata",
				"creators": [
					{
						"lastName": "Fenner",
						"firstName": "Martin",
						"creatorType": "author"
					}
				],
				"date": "2017-02-25",
				"abstractNote": "Ruby gem and command-line utility for conversion of DOI metadata from and to different metadata formats, including schema.org.",
				"company": "DataCite",
				"extra": "DOI: 10.5438/n138-z3mk",
				"url": "https://github.com/datacite/bolognese",
				"attachments": [],
				"tags": [
					{
						"tag": "bibtex"
					},
					{
						"tag": "codemeta"
					},
					{
						"tag": "crossref"
					},
					{
						"tag": "datacite"
					},
					{
						"tag": "doi"
					},
					{
						"tag": "metadata"
					},
					{
						"tag": "schema.org"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "import",
		"input": "{\n  \"id\": \"https://doi.org/10.3205/mbi000337\",\n  \"doi\": \"10.3205/mbi000337\",\n  \"url\": \"http://www.egms.de/en/journals/mbi/2015-15/mbi000337.shtml\",\n  \"types\": {\n    \"resourceTypeGeneral\": \"Text\",\n    \"resourceType\": \"Journal Article\",\n    \"schemaOrg\": \"ScholarlyArticle\",\n    \"citeproc\": \"article-journal\",\n    \"bibtex\": \"article\",\n    \"ris\": \"RPRT\"\n  },\n  \"creators\": [\n    {\n      \"nameType\": \"Personal\",\n      \"name\": \"Miljković, Natascha\",\n      \"givenName\": \"Natascha\",\n      \"familyName\": \"Miljković\",\n      \"affiliation\": \"Zitier-Weise, Agentur für Plagiatprävention e.U., Wien, Österreich\"\n    }\n  ],\n  \"titles\": [\n    {\n      \"title\": \"Mehr Schaden als Nutzen? Problematischer Einsatz von Textvergleichsprogrammen zur vermeintlichen Plagiatsvermeidung\",\n      \"lang\": \"de\"\n    },\n    {\n      \"title\": \"Doing more harm than good? Disputable use of text matching software as assumed plagiarism prevention method\",\n      \"titleType\": \"TranslatedTitle\",\n      \"lang\": \"en\"\n    }\n  ],\n  \"publisher\": \"German Medical Science GMS Publishing House\",\n  \"container\": {\n    \"type\": \"Series\",\n    \"identifier\": \"1865-066X\",\n    \"identifierType\": \"ISSN\",\n    \"title\": \"GMS Medizin - Bibliothek - Information; 15(1-2):Doc10\"\n  },\n  \"subjects\": [\n    {\n      \"subject\": \"plagiarism detection\",\n      \"lang\": \"en\"\n    },\n    {\n      \"subject\": \"plagiarism detection software\",\n      \"lang\": \"en\"\n    },\n    {\n      \"subject\": \"text matching analysis\",\n      \"lang\": \"en\"\n    },\n    {\n      \"subject\": \"scientific writing\",\n      \"lang\": \"en\"\n    },\n    {\n      \"subject\": \"forms of plagiarism\",\n      \"lang\": \"en\"\n    },\n    {\n      \"subject\": \"misconceptions\",\n      \"lang\": \"en\"\n    },\n    {\n      \"subject\": \"Plagiatsprüfung\",\n      \"lang\": \"de\"\n    },\n    {\n      \"subject\": \"Plagiatsprüfprogramme\",\n      \"lang\": \"de\"\n    },\n    {\n      \"subject\": \"Textvergleichsanalysen\",\n      \"lang\": \"de\"\n    },\n    {\n      \"subject\": \"wissenschaftlich Schreiben\",\n      \"lang\": \"de\"\n    },\n    {\n      \"subject\": \"Plagiatsformen\",\n      \"lang\": \"de\"\n    },\n    {\n      \"subject\": \"Falschannahmen\",\n      \"lang\": \"de\"\n    },\n    {\n      \"subject\": \"610 Medical sciences; Medicine\",\n      \"subjectScheme\": \"DDC\"\n    }\n  ],\n  \"contributors\": [\n\n  ],\n  \"dates\": [\n    {\n      \"date\": \"2015-08-12\",\n      \"dateType\": \"Issued\"\n    }\n  ],\n  \"publicationYear\": \"2015\",\n  \"language\": \"de\",\n  \"identifiers\": [\n    {\n      \"identifierType\": \"DOI\",\n      \"identifier\": \"https://doi.org/10.3205/mbi000337\"\n    },\n    {\n      \"identifierType\": \"URN\",\n      \"identifier\": \"urn:nbn:de:0183-mbi0003372\"\n    },\n    {\n      \"identifierType\": \"Doc\",\n      \"identifier\": \"mbi000337\"\n    }\n  ],\n  \"sizes\": [\n\n  ],\n  \"formats\": [\n    \"text/html\"\n  ],\n  \"rightsList\": [\n    {\n      \"rights\": \"Dieser Artikel ist ein Open-Access-Artikel und steht unter den Lizenzbedingungen der Creative Commons Attribution 4.0 License (Namensnennung).\",\n      \"rightsUri\": \"http://creativecommons.org/licenses/by/4.0\"\n    }\n  ],\n  \"descriptions\": [\n    {\n      \"description\": \"The number of so called plagiarism detection software is ever-growing, though hardly any of those products are really useful as marketed. Especially since their producers force-fed the term plagiarism detection – in stark contrast to the only function they have, which is text matching – to their customers, several misconceptions have established, which keep circulating within higher education institutions rather persistently, thus even hindering the establishment of efficient prevention strategies within. By all means are those products not sufficient enough as sole preventing method against plagiarism and will never be technically mature enough to find all forms of scientifically unethical writing methods.\",\n      \"descriptionType\": \"Abstract\",\n      \"lang\": \"en\"\n    },\n    {\n      \"description\": \"Die Liste an selbst ernannten Plagiatsprüfprogrammen ist lang und wächst ständig, brauchbar wie propagiert sind jedoch nur wenige davon. Besonders durch die gezielte Werbung der ProgrammherstellerInnen mit dem Begriff Plagiatsdetektion – im Gegensatz zu ihrer einzigen tatsächlichen Funktionsweise, dem bloßen Textvergleich –, haben sich einige falsche Annahmen zu diesen Produkten ergeben, die sich im universitären Bereich leider sehr hartnäckig halten und bei der Konzeptionierung effizienter Präventionsmaßnahmen sogar hinderlich sein können. Als einzige eingesetzte präventive Maßnahme (im weitesten Sinne) sind diese Programme völlig unzureichend und können technisch zudem ohnedies nicht alle Formen von unwissenschaftlichen Schreibverhalten finden.\",\n      \"descriptionType\": \"Abstract\",\n      \"lang\": \"de\"\n    },\n    {\n      \"description\": \"GMS Medizin - Bibliothek - Information; 15(1-2):Doc10\",\n      \"descriptionType\": \"SeriesInformation\"\n    }\n  ],\n  \"geoLocations\": [\n\n  ],\n  \"fundingReferences\": [\n\n  ],\n  \"relatedIdentifiers\": [\n    {\n      \"relatedIdentifier\": \"1865-066X\",\n      \"relatedIdentifierType\": \"ISSN\",\n      \"relationType\": \"IsPartOf\"\n    }\n  ],\n  \"schemaVersion\": \"http://datacite.org/schema/kernel-3\",\n  \"providerId\": \"zbmed\",\n  \"clientId\": \"zbmed.gms\",\n  \"agency\": \"DataCite\",\n  \"state\": \"findable\"\n}",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Mehr Schaden als Nutzen? Problematischer Einsatz von Textvergleichsprogrammen zur vermeintlichen Plagiatsvermeidung",
				"creators": [
					{
						"lastName": "Miljković",
						"firstName": "Natascha",
						"creatorType": "author"
					}
				],
				"date": "2015-08-12",
				"DOI": "10.3205/mbi000337",
				"ISSN": "1865-066X",
				"abstractNote": "Die Liste an selbst ernannten Plagiatsprüfprogrammen ist lang und wächst ständig, brauchbar wie propagiert sind jedoch nur wenige davon. Besonders durch die gezielte Werbung der ProgrammherstellerInnen mit dem Begriff Plagiatsdetektion – im Gegensatz zu ihrer einzigen tatsächlichen Funktionsweise, dem bloßen Textvergleich –, haben sich einige falsche Annahmen zu diesen Produkten ergeben, die sich im universitären Bereich leider sehr hartnäckig halten und bei der Konzeptionierung effizienter Präventionsmaßnahmen sogar hinderlich sein können. Als einzige eingesetzte präventive Maßnahme (im weitesten Sinne) sind diese Programme völlig unzureichend und können technisch zudem ohnedies nicht alle Formen von unwissenschaftlichen Schreibverhalten finden.",
				"language": "de",
				"publicationTitle": "GMS Medizin - Bibliothek - Information; 15(1-2):Doc10",
				"rights": "Dieser Artikel ist ein Open-Access-Artikel und steht unter den Lizenzbedingungen der Creative Commons Attribution 4.0 License (Namensnennung).",
				"url": "http://www.egms.de/en/journals/mbi/2015-15/mbi000337.shtml",
				"attachments": [],
				"tags": [
					{
						"tag": "610 Medical sciences; Medicine"
					},
					{
						"tag": "Falschannahmen"
					},
					{
						"tag": "Plagiatsformen"
					},
					{
						"tag": "Plagiatsprüfprogramme"
					},
					{
						"tag": "Plagiatsprüfung"
					},
					{
						"tag": "Textvergleichsanalysen"
					},
					{
						"tag": "forms of plagiarism"
					},
					{
						"tag": "misconceptions"
					},
					{
						"tag": "plagiarism detection"
					},
					{
						"tag": "plagiarism detection software"
					},
					{
						"tag": "scientific writing"
					},
					{
						"tag": "text matching analysis"
					},
					{
						"tag": "wissenschaftlich Schreiben"
					}
				],
				"notes": [
					{
						"note": "<h2>SeriesInformation</h2>\nGMS Medizin - Bibliothek - Information; 15(1-2):Doc10"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "import",
		"input": "{\n  \"id\": \"https://doi.org/10.17171/2-3-12-1\",\n  \"doi\": \"10.17171/2-3-12-1\",\n  \"url\": \"http://repository.edition-topoi.org/collection/MAGN/single/0012/0\",\n  \"types\": {\n    \"resourceTypeGeneral\": \"Dataset\",\n    \"resourceType\": \"3D Data\",\n    \"schemaOrg\": \"Dataset\",\n    \"citeproc\": \"dataset\",\n    \"bibtex\": \"misc\",\n    \"ris\": \"DATA\"\n  },\n  \"creators\": [\n    {\n      \"nameType\": \"Personal\",\n      \"name\": \"Fritsch, Bernhard\",\n      \"givenName\": \"Bernhard\",\n      \"familyName\": \"Fritsch\"\n    }\n  ],\n  \"titles\": [\n    {\n      \"title\": \"3D model of object V 1.2-71\"\n    },\n    {\n      \"title\": \"Structured-light Scan, Staatliche Museen zu Berlin -  Antikensammlung\",\n      \"titleType\": \"Subtitle\"\n    }\n  ],\n  \"publisher\": \"Edition Topoi\",\n  \"container\": {\n    \"type\": \"DataRepository\",\n    \"identifier\": \"10.17171/2-3-1\",\n    \"identifierType\": \"DOI\",\n    \"title\": \"Architectural Fragments from Magnesia on the Maeander\"\n  },\n  \"subjects\": [\n    {\n      \"subject\": \"101 Ancient Cultures\"\n    },\n    {\n      \"subject\": \"410-01 Building and Construction History\"\n    }\n  ],\n  \"contributors\": [\n\n  ],\n  \"dates\": [\n    {\n      \"date\": \"2016\",\n      \"dateType\": \"Updated\"\n    },\n    {\n      \"date\": \"2016\",\n      \"dateType\": \"Issued\"\n    }\n  ],\n  \"publicationYear\": \"2016\",\n  \"identifiers\": [\n    {\n      \"identifierType\": \"DOI\",\n      \"identifier\": \"https://doi.org/10.17171/2-3-12-1\"\n    }\n  ],\n  \"sizes\": [\n\n  ],\n  \"formats\": [\n    \"nxs\"\n  ],\n  \"rightsList\": [\n\n  ],\n  \"descriptions\": [\n    {\n      \"description\": \"Architectural Fragments from Magnesia on the Maeander\",\n      \"descriptionType\": \"SeriesInformation\"\n    }\n  ],\n  \"geoLocations\": [\n\n  ],\n  \"fundingReferences\": [\n\n  ],\n  \"relatedIdentifiers\": [\n    {\n      \"relatedIdentifier\": \"10.17171/2-3-1\",\n      \"relatedIdentifierType\": \"DOI\",\n      \"relationType\": \"IsPartOf\"\n    },\n    {\n      \"relatedIdentifier\": \"10.17171/2-3\",\n      \"relatedIdentifierType\": \"DOI\",\n      \"relationType\": \"IsPartOf\"\n    }\n  ],\n  \"schemaVersion\": \"http://datacite.org/schema/kernel-3\",\n  \"providerId\": \"tib\",\n  \"clientId\": \"tib.topoi\",\n  \"agency\": \"DataCite\",\n  \"state\": \"findable\"\n}",
		"items": [
			{
				"itemType": "dataset",
				"title": "3D model of object V 1.2-71: Structured-light Scan, Staatliche Museen zu Berlin -  Antikensammlung",
				"creators": [
					{
						"lastName": "Fritsch",
						"firstName": "Bernhard",
						"creatorType": "author"
					}
				],
				"date": "2016",
				"DOI": "10.17171/2-3-12-1",
				"format": "nxs",
				"repository": "Edition Topoi",
				"url": "http://repository.edition-topoi.org/collection/MAGN/single/0012/0",
				"attachments": [],
				"tags": [
					{
						"tag": "101 Ancient Cultures"
					},
					{
						"tag": "410-01 Building and Construction History"
					}
				],
				"notes": [
					{
						"note": "<h2>SeriesInformation</h2>\nArchitectural Fragments from Magnesia on the Maeander"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "import",
		"input": "{\n  \"id\": \"https://doi.org/10.21248/jfml.2018.6\",\n  \"doi\": \"10.21248/jfml.2018.6\",\n  \"url\": \"https://jfml.org/article/view/6\",\n  \"types\": {\n    \"resourceTypeGeneral\": \"Text\",\n    \"resourceType\": \"Article\",\n    \"schemaOrg\": \"ScholarlyArticle\",\n    \"citeproc\": \"article-journal\",\n    \"bibtex\": \"article\",\n    \"ris\": \"RPRT\"\n  },\n  \"creators\": [\n    {\n      \"nameType\": \"Personal\",\n      \"name\": \"Mostovaia, Irina\",\n      \"givenName\": \"Irina\",\n      \"familyName\": \"Mostovaia\"\n    }\n  ],\n  \"titles\": [\n    {\n      \"title\": \"Nonverbale graphische Ressourcen bei Reparaturen in der interaktionalen informellen Schriftlichkeit am Beispiel der deutschen Chat-Kommunikation via IRC-Chat und WhatsApp\"\n    }\n  ],\n  \"publisher\": \"Journal für Medienlinguistik\",\n  \"container\": {\n    \"type\": \"Series\",\n    \"title\": \"Journal für Medienlinguistik\",\n    \"firstPage\": \"Bd. 1 Nr. 1 (2018)\"\n  },\n  \"subjects\": [\n\n  ],\n  \"contributors\": [\n\n  ],\n  \"dates\": [\n    {\n      \"date\": \"2018-06-18\",\n      \"dateType\": \"Submitted\"\n    },\n    {\n      \"date\": \"2018-11-22\",\n      \"dateType\": \"Accepted\"\n    },\n    {\n      \"date\": \"2018-12-04\",\n      \"dateType\": \"Updated\"\n    },\n    {\n      \"date\": \"2018-12-04\",\n      \"dateType\": \"Issued\"\n    }\n  ],\n  \"publicationYear\": \"2018\",\n  \"language\": \"de\",\n  \"identifiers\": [\n    {\n      \"identifierType\": \"DOI\",\n      \"identifier\": \"https://doi.org/10.21248/jfml.2018.6\"\n    },\n    {\n      \"identifierType\": \"publisherId\",\n      \"identifier\": \"1-3-6\"\n    }\n  ],\n  \"sizes\": [\n    \"42-79 Seiten\"\n  ],\n  \"formats\": [\n\n  ],\n  \"rightsList\": [\n    {\n      \"rights\": \"Dieses Werk steht unter der Lizenz Creative Commons Namensnennung - Weitergabe unter gleichen Bedingungen 4.0 International.\",\n      \"rightsUri\": \"http://creativecommons.org/licenses/by-sa/4.0\"\n    }\n  ],\n  \"descriptions\": [\n    {\n      \"description\": \"The aim of this paper is to present the results of an empirical analysis of the use of non-alphabetic graphic signs (e.g. asterisks, slashes, plus signs etc.) in the context of repairs in Russian and German informal electronic communication. The data for the analysis were taken from the “Mobile Communication Database MoCoDa” (https://www.uni-due.de/~hg0263/SMSDB), which contains Russian and German private electronic communication via SMS, WhatsApp and other short message services, and the “Dortmunder Chat-Korpus” (http://www.chatkorpus.tu-dortmund.de/korpora.html). This paper describes the functions of various graphic resources in the context of repairs in both data collections and compares the occurrences of these functions in current Russian and German computer-mediated communication. It concludes that particular signs in both data sets share the same subset of functions, but they differ in terms of how frequently these resources occur in each form of communication.\",\n      \"descriptionType\": \"Abstract\"\n    },\n    {\n      \"description\": \"Journal für Medienlinguistik, Bd. 1 Nr. 1 (2018)\",\n      \"descriptionType\": \"SeriesInformation\"\n    }\n  ],\n  \"geoLocations\": [\n\n  ],\n  \"fundingReferences\": [\n\n  ],\n  \"relatedIdentifiers\": [\n\n  ],\n  \"schemaVersion\": \"http://datacite.org/schema/kernel-4\",\n  \"providerId\": \"gesis\",\n  \"clientId\": \"gesis.ubjcs\",\n  \"agency\": \"DataCite\",\n  \"state\": \"findable\"\n}",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Nonverbale graphische Ressourcen bei Reparaturen in der interaktionalen informellen Schriftlichkeit am Beispiel der deutschen Chat-Kommunikation via IRC-Chat und WhatsApp",
				"creators": [
					{
						"lastName": "Mostovaia",
						"firstName": "Irina",
						"creatorType": "author"
					}
				],
				"date": "2018-12-04",
				"DOI": "10.21248/jfml.2018.6",
				"abstractNote": "The aim of this paper is to present the results of an empirical analysis of the use of non-alphabetic graphic signs (e.g. asterisks, slashes, plus signs etc.) in the context of repairs in Russian and German informal electronic communication. The data for the analysis were taken from the “Mobile Communication Database MoCoDa” (https://www.uni-due.de/~hg0263/SMSDB), which contains Russian and German private electronic communication via SMS, WhatsApp and other short message services, and the “Dortmunder Chat-Korpus” (http://www.chatkorpus.tu-dortmund.de/korpora.html). This paper describes the functions of various graphic resources in the context of repairs in both data collections and compares the occurrences of these functions in current Russian and German computer-mediated communication. It concludes that particular signs in both data sets share the same subset of functions, but they differ in terms of how frequently these resources occur in each form of communication.",
				"language": "de",
				"pages": "42-79 Seiten",
				"publicationTitle": "Journal für Medienlinguistik",
				"rights": "Dieses Werk steht unter der Lizenz Creative Commons Namensnennung - Weitergabe unter gleichen Bedingungen 4.0 International.",
				"url": "https://jfml.org/article/view/6",
				"attachments": [],
				"tags": [],
				"notes": [
					{
						"note": "<h2>SeriesInformation</h2>\nJournal für Medienlinguistik, Bd. 1 Nr. 1 (2018)"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "import",
		"input": "{\n  \"id\": \"https://doi.org/10.17885/heiup.jts.2018.1-2.23812\",\n  \"doi\": \"10.17885/heiup.jts.2018.1-2.23812\",\n  \"url\": \"https://heiup.uni-heidelberg.de/journals/index.php/transcultural/article/view/23812\",\n  \"types\": {\n    \"resourceTypeGeneral\": \"Text\",\n    \"resourceType\": \"Article\",\n    \"schemaOrg\": \"ScholarlyArticle\",\n    \"citeproc\": \"article-journal\",\n    \"bibtex\": \"article\",\n    \"ris\": \"RPRT\"\n  },\n  \"creators\": [\n    {\n      \"nameType\": \"Personal\",\n      \"name\": \"Gadkar-Wilcox, Wynn\",\n      \"givenName\": \"Wynn\",\n      \"familyName\": \"Gadkar-Wilcox\"\n    }\n  ],\n  \"titles\": [\n    {\n      \"title\": \"Universality, Modernity and Cultural Borrowing Among Vietnamese Intellectuals, 1877–1919\"\n    }\n  ],\n  \"publisher\": \"The Journal of Transcultural Studies\",\n  \"container\": {\n    \"type\": \"Series\",\n    \"title\": \"The Journal of Transcultural Studies\",\n    \"firstPage\": \"No 1\",\n    \"lastPage\": \"2 (2018)\"\n  },\n  \"subjects\": [\n\n  ],\n  \"contributors\": [\n\n  ],\n  \"dates\": [\n    {\n      \"date\": \"2018-07-16\",\n      \"dateType\": \"Submitted\"\n    },\n    {\n      \"date\": \"2018-09-27\",\n      \"dateType\": \"Accepted\"\n    },\n    {\n      \"date\": \"2019-01-16\",\n      \"dateType\": \"Updated\"\n    },\n    {\n      \"date\": \"2018-12-20\",\n      \"dateType\": \"Issued\"\n    }\n  ],\n  \"publicationYear\": \"2018\",\n  \"language\": \"en\",\n  \"identifiers\": [\n    {\n      \"identifierType\": \"DOI\",\n      \"identifier\": \"https://doi.org/10.17885/heiup.jts.2018.1-2.23812\"\n    },\n    {\n      \"identifierType\": \"publisherId\",\n      \"identifier\": \"22-2384-23812\"\n    }\n  ],\n  \"sizes\": [\n    \"33–52 Pages\"\n  ],\n  \"formats\": [\n\n  ],\n  \"rightsList\": [\n    {\n      \"rights\": \"This work is licensed under a Creative Commons Attribution-NonCommercial 4.0 International License.\",\n      \"rightsUri\": \"http://creativecommons.org/licenses/by-nc/4.0\"\n    }\n  ],\n  \"descriptions\": [\n    {\n      \"description\": \"After 1897, as the power of the Nguyen Monarchy was increasingly restricted by a centralizing administration in French Indochina, it sought to retain its relevance by grappling with reformist ideas, especially those associated with Xu Jiyu, Tan Sitong, and Liang Qichao. This paper examines the influence of those thinkers on the policy questions of 1877, 1904, and 1919 and proposes that even when the monarchy was defending more traditional ideas against reform, these new conceptions were fundamentally transforming the thinking of even more conservative elites.\",\n      \"descriptionType\": \"Abstract\"\n    },\n    {\n      \"description\": \"The Journal of Transcultural Studies, No 1-2 (2018)\",\n      \"descriptionType\": \"SeriesInformation\"\n    }\n  ],\n  \"geoLocations\": [\n\n  ],\n  \"fundingReferences\": [\n\n  ],\n  \"relatedIdentifiers\": [\n\n  ],\n  \"schemaVersion\": \"http://datacite.org/schema/kernel-4\",\n  \"providerId\": \"gesis\",\n  \"clientId\": \"gesis.ubhd\",\n  \"agency\": \"DataCite\",\n  \"state\": \"findable\"\n}",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Universality, Modernity and Cultural Borrowing Among Vietnamese Intellectuals, 1877–1919",
				"creators": [
					{
						"lastName": "Gadkar-Wilcox",
						"firstName": "Wynn",
						"creatorType": "author"
					}
				],
				"date": "2018-12-20",
				"DOI": "10.17885/heiup.jts.2018.1-2.23812",
				"abstractNote": "After 1897, as the power of the Nguyen Monarchy was increasingly restricted by a centralizing administration in French Indochina, it sought to retain its relevance by grappling with reformist ideas, especially those associated with Xu Jiyu, Tan Sitong, and Liang Qichao. This paper examines the influence of those thinkers on the policy questions of 1877, 1904, and 1919 and proposes that even when the monarchy was defending more traditional ideas against reform, these new conceptions were fundamentally transforming the thinking of even more conservative elites.",
				"language": "en",
				"pages": "33–52 Pages",
				"publicationTitle": "The Journal of Transcultural Studies",
				"rights": "This work is licensed under a Creative Commons Attribution-NonCommercial 4.0 International License.",
				"url": "https://heiup.uni-heidelberg.de/journals/index.php/transcultural/article/view/23812",
				"attachments": [],
				"tags": [],
				"notes": [
					{
						"note": "<h2>SeriesInformation</h2>\nThe Journal of Transcultural Studies, No 1-2 (2018)"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "import",
		"input": "{\n  \"id\": \"https://doi.org/10.7916/d8959hr1\",\n  \"doi\": \"10.7916/D8959HR1\",\n  \"url\": \"https://tremorjournal.org/index.php/tremor/article/view/413\",\n  \"types\": {\n    \"ris\": \"RPRT\",\n    \"bibtex\": \"article\",\n    \"citeproc\": \"article-journal\",\n    \"schemaOrg\": \"ScholarlyArticle\",\n    \"resourceType\": \"Article\",\n    \"resourceTypeGeneral\": \"Text\"\n  },\n  \"creators\": [\n    {\n      \"name\": \"Hogg, Elliot\",\n      \"nameType\": \"Personal\",\n      \"givenName\": \"Elliot\",\n      \"familyName\": \"Hogg\",\n      \"affiliation\": []\n    },\n    {\n      \"name\": \"Tagliati, Michele\",\n      \"nameType\": \"Personal\",\n      \"givenName\": \"Michele\",\n      \"familyName\": \"Tagliati\",\n      \"affiliation\": []\n    }\n  ],\n  \"titles\": [\n    {\n      \"title\": \"Overuse Cervical Dystonia: A Case Report and Literature Review\"\n    }\n  ],\n  \"publisher\": \"Tremor and Other Hyperkinetic Movements\",\n  \"container\": {\n    \"type\": \"Series\",\n    \"title\": \"Tremor and Other Hyperkinetic Movements\",\n    \"firstPage\": \"Tremor and Other Hyperkinetic Movements\"\n  },\n  \"contributors\": [],\n  \"dates\": [\n    {\n      \"date\": \"2016-06-28\",\n      \"dateType\": \"Submitted\"\n    },\n    {\n      \"date\": \"2016-08-22\",\n      \"dateType\": \"Accepted\"\n    },\n    {\n      \"date\": \"2019-02-06\",\n      \"dateType\": \"Updated\"\n    },\n    {\n      \"date\": \"2016-09-14\",\n      \"dateType\": \"Issued\"\n    }\n  ],\n  \"publicationYear\": 2016,\n  \"language\": \"en\",\n  \"identifiers\": [\n    {\n      \"identifier\": \"https://doi.org/10.7916/d8959hr1\",\n      \"identifierType\": \"DOI\"\n    },\n    {\n      \"identifier\": \"1-2-413\",\n      \"identifierType\": \"publisherId\"\n    }\n  ],\n  \"descriptions\": [\n    {\n      \"description\": \"Background: Overuse or task-specific dystonia has been described in a number of professions characterized by repetitive actions, typically affecting the upper extremities. Cervical dystonia (CD), however, has rarely been associated with overuse. Case Report: We present a case report of typical CD that developed in the context of chronic repetitive movements associated with the patient’s professional occupation as an office manager who spent many hours per day holding a phone to his ear. Discussion: Overuse CD should be suspected when typical symptoms and signs of CD develop in the context of chronic repetitive use or overuse of cervical muscles, especially where exacerbating tasks involve asymmetric postures.\",\n      \"descriptionType\": \"Abstract\"\n    },\n    {\n      \"description\": \"Tremor and Other Hyperkinetic Movements, Tremor and Other Hyperkinetic Movements\",\n      \"descriptionType\": \"SeriesInformation\"\n    }\n  ],\n  \"providerId\": \"cul\",\n  \"clientId\": \"cul.columbia\",\n  \"agency\": \"DataCite\",\n  \"state\": \"findable\"\n}",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Overuse Cervical Dystonia: A Case Report and Literature Review",
				"creators": [
					{
						"lastName": "Hogg",
						"firstName": "Elliot",
						"creatorType": "author"
					},
					{
						"lastName": "Tagliati",
						"firstName": "Michele",
						"creatorType": "author"
					}
				],
				"date": "2016-09-14",
				"DOI": "10.7916/D8959HR1",
				"abstractNote": "Background: Overuse or task-specific dystonia has been described in a number of professions characterized by repetitive actions, typically affecting the upper extremities. Cervical dystonia (CD), however, has rarely been associated with overuse. Case Report: We present a case report of typical CD that developed in the context of chronic repetitive movements associated with the patient’s professional occupation as an office manager who spent many hours per day holding a phone to his ear. Discussion: Overuse CD should be suspected when typical symptoms and signs of CD develop in the context of chronic repetitive use or overuse of cervical muscles, especially where exacerbating tasks involve asymmetric postures.",
				"language": "en",
				"pages": "Tremor and Other Hyperkinetic Movements",
				"publicationTitle": "Tremor and Other Hyperkinetic Movements",
				"url": "https://tremorjournal.org/index.php/tremor/article/view/413",
				"attachments": [],
				"tags": [],
				"notes": [
					{
						"note": "<h2>SeriesInformation</h2>\nTremor and Other Hyperkinetic Movements, Tremor and Other Hyperkinetic Movements"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "import",
		"input": "{\r\n  \"id\": \"https://doi.org/10.17885/heiup.jts.2018.1-2.23812\",\r\n  \"doi\": \"10.17885/heiup.jts.2018.1-2.23812\",\r\n  \"url\": \"https://heiup.uni-heidelberg.de/journals/index.php/transcultural/article/view/23812\",\r\n  \"types\": {\r\n    \"resourceTypeGeneral\": \"Text\",\r\n    \"resourceType\": \"Article\",\r\n    \"schemaOrg\": \"ScholarlyArticle\",\r\n    \"citeproc\": \"article-journal\",\r\n    \"bibtex\": \"article\",\r\n    \"ris\": \"RPRT\"\r\n  },\r\n  \"creators\": [\r\n    {\r\n      \"nameType\": \"Personal\",\r\n      \"name\": \"Gadkar-Wilcox, Wynn\",\r\n      \"givenName\": \"Wynn\",\r\n      \"familyName\": \"Gadkar-Wilcox\"\r\n    }\r\n  ],\r\n  \"titles\": [\r\n    {\r\n      \"title\": \"Universality, Modernity and Cultural Borrowing Among Vietnamese Intellectuals, 1877–1919\"\r\n    }\r\n  ],\r\n  \"publisher\": \"The Journal of Transcultural Studies\",\r\n  \"container\": {\r\n    \"type\": \"Series\",\r\n    \"title\": \"The Journal of Transcultural Studies\",\r\n    \"firstPage\": \"No 1\",\r\n    \"lastPage\": \"2 (2018)\"\r\n  },\r\n  \"subjects\": [\r\n\r\n  ],\r\n  \"contributors\": [\r\n\r\n  ],\r\n  \"dates\": [\r\n    {\r\n      \"date\": \"2018-07-16\",\r\n      \"dateType\": \"Submitted\"\r\n    },\r\n    {\r\n      \"date\": \"2018-09-27\",\r\n      \"dateType\": \"Accepted\"\r\n    },\r\n    {\r\n      \"date\": \"2019-01-16\",\r\n      \"dateType\": \"Updated\"\r\n    },\r\n    {\r\n      \"date\": \"2018-12-20\",\r\n      \"dateType\": \"Issued\"\r\n    }\r\n  ],\r\n  \"publicationYear\": \"2018\",\r\n  \"language\": \"en\",\r\n  \"identifiers\": [\r\n    {\r\n      \"identifierType\": \"DOI\",\r\n      \"identifier\": \"https://doi.org/10.17885/heiup.jts.2018.1-2.23812\"\r\n    },\r\n    {\r\n      \"identifierType\": \"publisherId\",\r\n      \"identifier\": \"22-2384-23812\"\r\n    }\r\n  ],\r\n  \"sizes\": [\r\n    \"33–52 Pages\"\r\n  ],\r\n  \"formats\": [\r\n\r\n  ],\r\n  \"rightsList\": [\r\n    {\r\n      \"rights\": \"This work is licensed under a Creative Commons Attribution-NonCommercial 4.0 International License.\",\r\n      \"rightsUri\": \"http://creativecommons.org/licenses/by-nc/4.0\"\r\n    }\r\n  ],\r\n  \"descriptions\": [\r\n    {\r\n      \"description\": \"After 1897, as the power of the Nguyen Monarchy was increasingly restricted by a centralizing administration in French Indochina, it sought to retain its relevance by grappling with reformist ideas, especially those associated with Xu Jiyu, Tan Sitong, and Liang Qichao. This paper examines the influence of those thinkers on the policy questions of 1877, 1904, and 1919 and proposes that even when the monarchy was defending more traditional ideas against reform, these new conceptions were fundamentally transforming the thinking of even more conservative elites.\",\r\n      \"descriptionType\": \"Abstract\"\r\n    },\r\n    {\r\n      \"description\": \"The Journal of Transcultural Studies, No 1-2 (2018)\",\r\n      \"descriptionType\": \"SeriesInformation\"\r\n    }\r\n  ],\r\n  \"geoLocations\": [\r\n\r\n  ],\r\n  \"fundingReferences\": [\r\n\r\n  ],\r\n  \"relatedIdentifiers\": [\r\n\r\n  ],\r\n  \"schemaVersion\": \"http://datacite.org/schema/kernel-4\",\r\n  \"providerId\": \"gesis\",\r\n  \"clientId\": \"gesis.ubhd\",\r\n  \"agency\": \"DataCite\",\r\n  \"state\": \"findable\"\r\n}",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Universality, Modernity and Cultural Borrowing Among Vietnamese Intellectuals, 1877–1919",
				"creators": [
					{
						"lastName": "Gadkar-Wilcox",
						"firstName": "Wynn",
						"creatorType": "author"
					}
				],
				"date": "2018-12-20",
				"DOI": "10.17885/heiup.jts.2018.1-2.23812",
				"abstractNote": "After 1897, as the power of the Nguyen Monarchy was increasingly restricted by a centralizing administration in French Indochina, it sought to retain its relevance by grappling with reformist ideas, especially those associated with Xu Jiyu, Tan Sitong, and Liang Qichao. This paper examines the influence of those thinkers on the policy questions of 1877, 1904, and 1919 and proposes that even when the monarchy was defending more traditional ideas against reform, these new conceptions were fundamentally transforming the thinking of even more conservative elites.",
				"language": "en",
				"pages": "33–52 Pages",
				"publicationTitle": "The Journal of Transcultural Studies",
				"rights": "This work is licensed under a Creative Commons Attribution-NonCommercial 4.0 International License.",
				"url": "https://heiup.uni-heidelberg.de/journals/index.php/transcultural/article/view/23812",
				"attachments": [],
				"tags": [],
				"notes": [
					{
						"note": "<h2>SeriesInformation</h2>\nThe Journal of Transcultural Studies, No 1-2 (2018)"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "import",
		"input": "{\r\n  \"id\": \"https://doi.org/10.5281/zenodo.5513598\",\r\n  \"doi\": \"10.5281/ZENODO.5513598\",\r\n  \"url\": \"https://zenodo.org/record/5513598\",\r\n  \"types\": {\r\n    \"ris\": \"GEN\",\r\n    \"bibtex\": \"misc\",\r\n    \"citeproc\": \"article\",\r\n    \"schemaOrg\": \"CreativeWork\",\r\n    \"resourceTypeGeneral\": \"Preprint\"\r\n  },\r\n  \"creators\": [\r\n    {\r\n      \"name\": \"Walsh, Michael\",\r\n      \"givenName\": \"Michael\",\r\n      \"familyName\": \"Walsh\",\r\n      \"affiliation\": [\r\n        {\r\n          \"name\": \"Sorbonne University Abu Dhabi\"\r\n        }\r\n      ]\r\n    }\r\n  ],\r\n  \"titles\": [\r\n    {\r\n      \"title\": \"Non-healthcare occupational exposure to SARS-CoV-2 across industries in the United States before March 2020: a dataset generating protocol\"\r\n    }\r\n  ],\r\n  \"publisher\": {\r\n    \"name\": \"Zenodo\"\r\n  },\r\n  \"container\": {\r\n    \"type\": \"Series\",\r\n    \"identifier\": \"https://zenodo.org/communities/covid-19\",\r\n    \"identifierType\": \"URL\"\r\n  },\r\n  \"subjects\": [\r\n    {\r\n      \"subject\": \"applied epidemiology\"\r\n    },\r\n    {\r\n      \"subject\": \"COVID-19\"\r\n    },\r\n    {\r\n      \"subject\": \"SARS-CoV-2\"\r\n    },\r\n    {\r\n      \"subject\": \"emerging infectious disease\"\r\n    },\r\n    {\r\n      \"subject\": \"global health\"\r\n    },\r\n    {\r\n      \"subject\": \"occupational health\"\r\n    },\r\n    {\r\n      \"subject\": \"environmental health\"\r\n    },\r\n    {\r\n      \"subject\": \"pandemic\"\r\n    },\r\n    {\r\n      \"subject\": \"united states\"\r\n    }\r\n  ],\r\n  \"contributors\": [],\r\n  \"dates\": [\r\n    {\r\n      \"date\": \"2021-09-17\",\r\n      \"dateType\": \"Issued\"\r\n    }\r\n  ],\r\n  \"publicationYear\": 2021,\r\n  \"language\": \"en\",\r\n  \"identifiers\": [\r\n    {\r\n      \"identifier\": \"https://zenodo.org/record/5513598\",\r\n      \"identifierType\": \"URL\"\r\n    }\r\n  ],\r\n  \"sizes\": [],\r\n  \"formats\": [],\r\n  \"version\": \"1.0\",\r\n  \"rightsList\": [\r\n    {\r\n      \"rights\": \"Creative Commons Attribution 4.0 International\",\r\n      \"rightsUri\": \"https://creativecommons.org/licenses/by/4.0/legalcode\",\r\n      \"schemeUri\": \"https://spdx.org/licenses/\",\r\n      \"rightsIdentifier\": \"cc-by-4.0\",\r\n      \"rightsIdentifierScheme\": \"SPDX\"\r\n    },\r\n    {\r\n      \"rights\": \"Open Access\",\r\n      \"rightsUri\": \"info:eu-repo/semantics/openAccess\"\r\n    }\r\n  ],\r\n  \"descriptions\": [\r\n    {\r\n      \"description\": \"This dataset generating protocol provides a way to establish baseline measures for non- healthcare occupational exposure to SARS-CoV-2 across Census coded industries in the United States before March 2020. These estimates will be derived from the following data sources. The SARS-CoV-2 Occupational Exposure Risk Matrix (SOEM) will provide baseline estimates for non- healthcare occupational exposure to SARS-CoV-2 across Census coded occupations in the United States before March 2020. The Employed Labor Force Query System (ELFQS) will provide employed worker population estimates for number of civilian workers above 15 years of age per Census occupation code per Census industry code from 2015 to 2019. By way of statistical methods, this dataset will extend the SOEM from the level of occupations to the level of industries. The baseline measures that will be introduced in this dataset should be of immediate use to policymakers, practitioners, and researchers seeking understand the risk of occupational exposure to SARS-CoV-2 across industries in the United States before March 2020. They should also prove useful to individuals and institutions seeking to understand the impact of later interventions designed to mitigate occupational exposure to SARS-CoV-2 across industries in the United States.\",\r\n      \"descriptionType\": \"Abstract\"\r\n    },\r\n    {\r\n      \"description\": \"{\\\"references\\\": [\\\"Getting your workplace ready for COVID-19. World Health Organization website. Accessed on September 5, 2021. URL=https://www.who.int/docs/default-source/coronaviruse/getting- workplace-ready-for-covid-19.pdf.\\\", \\\"Occupational Health Subcommittee Epidemiological Classification of COVID-19 Work- Relatedness and Documentation of Public-Facing Occupations. Council for State and Territorial Epidemiologists Website. Accessed on September 5, 2021. URL= https://www.cste.org/resource/resmgr/occupationalhealth/publications/OH_Docs.zip.\\\", \\\"About O*NET. Occupational Information Network website. Accessed on September 5, 2021. URL=https://www.onetcenter.org/overview.html.\\\", \\\"Technical information. Employed Labor Force (ELF) query system website. Last reviewed on October 2, 2020. Accessed on September 5, 2021. URL=https://wwwn.cdc.gov/Wisards/cps/cps_techinfo.aspx#tic2.\\\", \\\"Walsh M. Measuring non-healthcare occupational exposure to SARS-CoV-2 across occupational groups in the United States: Version 2. Protocols.io. dx.doi.org/10.17504/protocols.io.bw9gph3w.\\\"]}\",\r\n      \"descriptionType\": \"Other\"\r\n    }\r\n  ],\r\n  \"geoLocations\": [],\r\n  \"fundingReferences\": [],\r\n  \"relatedIdentifiers\": [\r\n    {\r\n      \"relationType\": \"IsVersionOf\",\r\n      \"relatedIdentifier\": \"10.5281/zenodo.5513597\",\r\n      \"relatedIdentifierType\": \"DOI\"\r\n    },\r\n    {\r\n      \"relationType\": \"IsPartOf\",\r\n      \"relatedIdentifier\": \"https://zenodo.org/communities/covid-19\",\r\n      \"relatedIdentifierType\": \"URL\"\r\n    }\r\n  ],\r\n  \"relatedItems\": [],\r\n  \"schemaVersion\": \"http://datacite.org/schema/kernel-4\",\r\n  \"providerId\": \"cern\",\r\n  \"clientId\": \"cern.zenodo\",\r\n  \"agency\": \"datacite\",\r\n  \"state\": \"findable\"\r\n}",
		"items": [
			{
				"itemType": "preprint",
				"title": "Non-healthcare occupational exposure to SARS-CoV-2 across industries in the United States before March 2020: a dataset generating protocol",
				"creators": [
					{
						"lastName": "Walsh",
						"firstName": "Michael",
						"creatorType": "author"
					}
				],
				"date": "2021-09-17",
				"DOI": "10.5281/ZENODO.5513598",
				"abstractNote": "This dataset generating protocol provides a way to establish baseline measures for non- healthcare occupational exposure to SARS-CoV-2 across Census coded industries in the United States before March 2020. These estimates will be derived from the following data sources. The SARS-CoV-2 Occupational Exposure Risk Matrix (SOEM) will provide baseline estimates for non- healthcare occupational exposure to SARS-CoV-2 across Census coded occupations in the United States before March 2020. The Employed Labor Force Query System (ELFQS) will provide employed worker population estimates for number of civilian workers above 15 years of age per Census occupation code per Census industry code from 2015 to 2019. By way of statistical methods, this dataset will extend the SOEM from the level of occupations to the level of industries. The baseline measures that will be introduced in this dataset should be of immediate use to policymakers, practitioners, and researchers seeking understand the risk of occupational exposure to SARS-CoV-2 across industries in the United States before March 2020. They should also prove useful to individuals and institutions seeking to understand the impact of later interventions designed to mitigate occupational exposure to SARS-CoV-2 across industries in the United States.",
				"language": "en",
				"repository": "Zenodo",
				"rights": "Creative Commons Attribution 4.0 International, Open Access",
				"url": "https://zenodo.org/record/5513598",
				"attachments": [],
				"tags": [
					{
						"tag": "COVID-19"
					},
					{
						"tag": "SARS-CoV-2"
					},
					{
						"tag": "applied epidemiology"
					},
					{
						"tag": "emerging infectious disease"
					},
					{
						"tag": "environmental health"
					},
					{
						"tag": "global health"
					},
					{
						"tag": "occupational health"
					},
					{
						"tag": "pandemic"
					},
					{
						"tag": "united states"
					}
				],
				"notes": [
					{
						"note": "<h2>Other</h2>\n{\"references\": [\"Getting your workplace ready for COVID-19. World Health Organization website. Accessed on September 5, 2021. URL=https://www.who.int/docs/default-source/coronaviruse/getting- workplace-ready-for-covid-19.pdf.\", \"Occupational Health Subcommittee Epidemiological Classification of COVID-19 Work- Relatedness and Documentation of Public-Facing Occupations. Council for State and Territorial Epidemiologists Website. Accessed on September 5, 2021. URL= https://www.cste.org/resource/resmgr/occupationalhealth/publications/OH_Docs.zip.\", \"About O*NET. Occupational Information Network website. Accessed on September 5, 2021. URL=https://www.onetcenter.org/overview.html.\", \"Technical information. Employed Labor Force (ELF) query system website. Last reviewed on October 2, 2020. Accessed on September 5, 2021. URL=https://wwwn.cdc.gov/Wisards/cps/cps_techinfo.aspx#tic2.\", \"Walsh M. Measuring non-healthcare occupational exposure to SARS-CoV-2 across occupational groups in the United States: Version 2. Protocols.io. dx.doi.org/10.17504/protocols.io.bw9gph3w.\"]}"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "import",
		"input": "{\r\n  \"id\": \"https://doi.org/10.48648/yhp7-0g75\",\r\n  \"doi\": \"10.48648/YHP7-0G75\",\r\n  \"url\": \"https://zmfp.de/beitraege/mathematikapps-fuer-die-grundschule-analysieren\",\r\n  \"types\": {\r\n    \"ris\": \"JOUR\",\r\n    \"bibtex\": \"article\",\r\n    \"citeproc\": \"article-journal\",\r\n    \"schemaOrg\": \"ScholarlyArticle\",\r\n    \"resourceTypeGeneral\": \"JournalArticle\"\r\n  },\r\n  \"creators\": [\r\n    {\r\n      \"name\": \"Walter, Daniel\",\r\n      \"nameType\": \"Personal\",\r\n      \"givenName\": \"Daniel\",\r\n      \"familyName\": \"Walter\",\r\n      \"affiliation\": [\r\n        {\r\n          \"name\": \"University of Bremen\",\r\n          \"schemeUri\": \"https://ror.org\",\r\n          \"affiliationIdentifier\": \"https://ror.org/04ers2y35\",\r\n          \"affiliationIdentifierScheme\": \"ROR\"\r\n        }\r\n      ],\r\n      \"nameIdentifiers\": []\r\n    },\r\n    {\r\n      \"name\": \"Schwätzer, Ulrich\",\r\n      \"nameType\": \"Personal\",\r\n      \"givenName\": \"Ulrich\",\r\n      \"familyName\": \"Schwätzer\",\r\n      \"affiliation\": [\r\n        {\r\n          \"name\": \"University of Duisburg-Essen\",\r\n          \"schemeUri\": \"https://ror.org\",\r\n          \"affiliationIdentifier\": \"https://ror.org/04mz5ra38\",\r\n          \"affiliationIdentifierScheme\": \"ROR\"\r\n        }\r\n      ],\r\n      \"nameIdentifiers\": []\r\n    }\r\n  ],\r\n  \"titles\": [\r\n    {\r\n      \"lang\": \"de\",\r\n      \"title\": \"Mathematikapps für die Grundschule analysieren\",\r\n      \"titleType\": null\r\n    }\r\n  ],\r\n  \"publisher\": {\r\n    \"name\": \"Gesellschaft für Didaktik der Mathematik e.V.\"\r\n  },\r\n  \"subjects\": [\r\n    {\r\n      \"subject\": \"FOS: Educational sciences\",\r\n      \"valueUri\": \"\",\r\n      \"schemeUri\": \"http://www.oecd.org/science/inno/38235147.pdf\",\r\n      \"subjectScheme\": \"Fields of Science and Technology (FOS)\",\r\n      \"classificationCode\": \"5.3\"\r\n    }\r\n  ],\r\n  \"contributors\": [],\r\n  \"dates\": [],\r\n  \"publicationYear\": 2023,\r\n  \"language\": \"de\",\r\n  \"identifiers\": [],\r\n  \"sizes\": [],\r\n  \"formats\": [],\r\n  \"rightsList\": [\r\n    {\r\n      \"rights\": \"Creative Commons Attribution Share Alike 4.0 International\",\r\n      \"rightsUri\": \"https://creativecommons.org/licenses/by-sa/4.0/legalcode\",\r\n      \"schemeUri\": \"https://spdx.org/licenses/\",\r\n      \"rightsIdentifier\": \"cc-by-sa-4.0\",\r\n      \"rightsIdentifierScheme\": \"SPDX\"\r\n    }\r\n  ],\r\n  \"descriptions\": [\r\n    {\r\n      \"lang\": null,\r\n      \"description\": \"Die Nutzung digitaler Medien ist derzeit nicht nur bezogen auf den Mathematik-unterricht der Grundschule ein Schwerpunktthema der schulischen Bildung. Dabei wird vor allem der Einsatz von Apps kontrovers diskutiert. Während auf der einen Seite von empirisch erprobten Positivbeispielen berichtet wird, so stehen auf der anderen Seite zahlreiche Apps in der Kritik. Dieser Artikel befasst sich mit der Frage, inwiefern eine kriteriengeleitete Analyse des Bestandes von Mathema-tik–apps sowohl Anliegen der Praxis als auch der Forschung unterstützen kann. Hierzu wird im Theorieteil zunächst der Forschungsstand zur Einschätzung von Mathematikapps dargelegt. Nachdem bestehende Forschungserkenntnisse berich-tet und Kriterien zur Analyse von Apps begründet dargelegt werden, erfolgt die Darstellung von Ergebnissen einer Analyse von 227 Mathematikapps. Die Überle-gungen münden in eine kritische Diskussion, die eine Zusammenfassung der Ergebnisse, Konsequenzen für die Praxis und Forschung sowie Ausführungen zu Grenzen des Beitrags enthält. \",\r\n      \"descriptionType\": \"Abstract\"\r\n    }\r\n  ],\r\n  \"geoLocations\": [],\r\n  \"fundingReferences\": [],\r\n  \"relatedIdentifiers\": [],\r\n  \"relatedItems\": [\r\n    {\r\n      \"titles\": [\r\n        {\r\n          \"title\": \"Zeitschrift für Mathematikdidaktik in Forschung und Praxis\"\r\n        }\r\n      ],\r\n      \"volume\": \"4\",\r\n      \"relationType\": \"IsPublishedIn\",\r\n      \"publicationYear\": \"2023\",\r\n      \"relatedItemType\": \"Journal\",\r\n      \"relatedItemIdentifier\": {\r\n        \"relatedItemIdentifier\": \"2701-9012\",\r\n        \"relatedItemIdentifierType\": \"ISSN\"\r\n      }\r\n    }\r\n  ],\r\n  \"schemaVersion\": \"http://datacite.org/schema/kernel-4\",\r\n  \"providerId\": \"uyzi\",\r\n  \"clientId\": \"uyzi.zmfp\",\r\n  \"agency\": \"datacite\",\r\n  \"state\": \"findable\"\r\n}",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Mathematikapps für die Grundschule analysieren",
				"creators": [
					{
						"lastName": "Walter",
						"firstName": "Daniel",
						"creatorType": "author"
					},
					{
						"lastName": "Schwätzer",
						"firstName": "Ulrich",
						"creatorType": "author"
					}
				],
				"date": "2023",
				"DOI": "10.48648/YHP7-0G75",
				"ISSN": "2701-9012",
				"abstractNote": "Die Nutzung digitaler Medien ist derzeit nicht nur bezogen auf den Mathematik-unterricht der Grundschule ein Schwerpunktthema der schulischen Bildung. Dabei wird vor allem der Einsatz von Apps kontrovers diskutiert. Während auf der einen Seite von empirisch erprobten Positivbeispielen berichtet wird, so stehen auf der anderen Seite zahlreiche Apps in der Kritik. Dieser Artikel befasst sich mit der Frage, inwiefern eine kriteriengeleitete Analyse des Bestandes von Mathema-tik–apps sowohl Anliegen der Praxis als auch der Forschung unterstützen kann. Hierzu wird im Theorieteil zunächst der Forschungsstand zur Einschätzung von Mathematikapps dargelegt. Nachdem bestehende Forschungserkenntnisse berich-tet und Kriterien zur Analyse von Apps begründet dargelegt werden, erfolgt die Darstellung von Ergebnissen einer Analyse von 227 Mathematikapps. Die Überle-gungen münden in eine kritische Diskussion, die eine Zusammenfassung der Ergebnisse, Konsequenzen für die Praxis und Forschung sowie Ausführungen zu Grenzen des Beitrags enthält.",
				"language": "de",
				"publicationTitle": "Zeitschrift für Mathematikdidaktik in Forschung und Praxis",
				"rights": "Creative Commons Attribution Share Alike 4.0 International",
				"url": "https://zmfp.de/beitraege/mathematikapps-fuer-die-grundschule-analysieren",
				"volume": "4",
				"attachments": [],
				"tags": [
					{
						"tag": "FOS: Educational sciences"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "import",
		"input": "{\r\n  \"id\": \"https://doi.org/10.48548/pubdata-155\",\r\n  \"doi\": \"10.48548/PUBDATA-155\",\r\n  \"url\": \"https://pubdata.leuphana.de/handle/20.500.14123/175\",\r\n  \"types\": {\r\n    \"ris\": \"CHAP\",\r\n    \"bibtex\": \"inbook\",\r\n    \"citeproc\": \"chapter\",\r\n    \"schemaOrg\": \"Chapter\",\r\n    \"resourceType\": \"BookChapter\",\r\n    \"resourceTypeGeneral\": \"BookChapter\"\r\n  },\r\n  \"creators\": [\r\n    {\r\n      \"name\": \"Barron, Anne\",\r\n      \"nameType\": \"Personal\",\r\n      \"givenName\": \"Anne\",\r\n      \"familyName\": \"Barron\",\r\n      \"affiliation\": [\r\n        {\r\n          \"name\": \"Institute of English Studies (IES), Leuphana Universität Lüneburg\",\r\n          \"affiliationIdentifier\": \"https://ror.org/02w2y2t16\",\r\n          \"affiliationIdentifierScheme\": \"ROR\"\r\n        }\r\n      ],\r\n      \"nameIdentifiers\": [\r\n        {\r\n          \"schemeUri\": \"https://orcid.org\",\r\n          \"nameIdentifier\": \"https://orcid.org/0000-0003-2962-7985\",\r\n          \"nameIdentifierScheme\": \"ORCID\"\r\n        }\r\n      ]\r\n    }\r\n  ],\r\n  \"titles\": [\r\n    {\r\n      \"title\": \"Sorry Miss, I Completely Forgot about It\"\r\n    },\r\n    {\r\n      \"title\": \"Apologies and Vocatives in Ireland and England\",\r\n      \"titleType\": \"Subtitle\"\r\n    }\r\n  ],\r\n  \"publisher\": {\r\n    \"name\": \"Medien- und Informationszentrum, Leuphana Universität Lüneburg\"\r\n  },\r\n  \"container\": {},\r\n  \"subjects\": [],\r\n  \"contributors\": [\r\n    {\r\n      \"name\": \"Medien- Und Informationszentrum\",\r\n      \"nameType\": \"Organizational\",\r\n      \"affiliation\": [\r\n        {\r\n          \"name\": \"Leuphana Universität Lüneburg\",\r\n          \"affiliationIdentifier\": \"https://ror.org/02w2y2t16\",\r\n          \"affiliationIdentifierScheme\": \"ROR\"\r\n        }\r\n      ],\r\n      \"contributorType\": \"DataCurator\",\r\n      \"nameIdentifiers\": []\r\n    },\r\n    {\r\n      \"name\": \"Medien- Und Informationszentrum\",\r\n      \"nameType\": \"Organizational\",\r\n      \"affiliation\": [\r\n        {\r\n          \"name\": \"Leuphana Universität Lüneburg\",\r\n          \"affiliationIdentifier\": \"https://ror.org/02w2y2t16\",\r\n          \"affiliationIdentifierScheme\": \"ROR\"\r\n        }\r\n      ],\r\n      \"contributorType\": \"DataManager\",\r\n      \"nameIdentifiers\": []\r\n    },\r\n    {\r\n      \"name\": \"Medien- Und Informationszentrum\",\r\n      \"nameType\": \"Organizational\",\r\n      \"affiliation\": [\r\n        {\r\n          \"name\": \"Leuphana Universität Lüneburg\",\r\n          \"affiliationIdentifier\": \"https://ror.org/02w2y2t16\",\r\n          \"affiliationIdentifierScheme\": \"ROR\"\r\n        }\r\n      ],\r\n      \"contributorType\": \"HostingInstitution\",\r\n      \"nameIdentifiers\": []\r\n    },\r\n    {\r\n      \"name\": \"Technische Informationsbibliothek (TIB) Hannover\",\r\n      \"nameType\": \"Organizational\",\r\n      \"affiliation\": [\r\n        {\r\n          \"name\": \"Niedersächsische Ministerium für Wissenschaft und Kultur\",\r\n          \"affiliationIdentifier\": \"https://ror.org/0116z8r77\",\r\n          \"affiliationIdentifierScheme\": \"ROR\"\r\n        }\r\n      ],\r\n      \"contributorType\": \"RegistrationAgency\",\r\n      \"nameIdentifiers\": [\r\n        {\r\n          \"schemeUri\": \"https://ror.org\",\r\n          \"nameIdentifier\": \"https://ror.org/04aj4c181\",\r\n          \"nameIdentifierScheme\": \"ROR\"\r\n        }\r\n      ]\r\n    }\r\n  ],\r\n  \"dates\": [\r\n    {\r\n      \"date\": \"2024-02-27\",\r\n      \"dateType\": \"Accepted\"\r\n    },\r\n    {\r\n      \"date\": \"2021-11-30\",\r\n      \"dateType\": \"Issued\"\r\n    },\r\n    {\r\n      \"date\": \"2024-02-27\",\r\n      \"dateType\": \"Submitted\"\r\n    },\r\n    {\r\n      \"date\": \"2024-02-27\",\r\n      \"dateType\": \"Available\"\r\n    }\r\n  ],\r\n  \"publicationYear\": 2024,\r\n  \"language\": \"en\",\r\n  \"identifiers\": [\r\n    {\r\n      \"identifier\": \"https://hdl.handle.net/20.500.14123/175\",\r\n      \"identifierType\": \"Handle\"\r\n    },\r\n    {\r\n      \"identifier\": \"https://nbn-resolving.org/urn:nbn:de:gbv:luen4-dspace-20.500.14123/175-7\",\r\n      \"identifierType\": \"URN\"\r\n    }\r\n  ],\r\n  \"sizes\": [\r\n    \"741001 b\"\r\n  ],\r\n  \"formats\": [\r\n    \"application/pdf\"\r\n  ],\r\n  \"version\": \"1\",\r\n  \"rightsList\": [\r\n    {\r\n      \"rights\": \"Anonymous\"\r\n    },\r\n    {\r\n      \"lang\": \"en-US\",\r\n      \"rights\": \"Creative Commons Attribution 4.0 International\",\r\n      \"rightsUri\": \"https://creativecommons.org/licenses/by/4.0/legalcode\",\r\n      \"schemeUri\": \"https://spdx.org/licenses/\",\r\n      \"rightsIdentifier\": \"cc-by-4.0\",\r\n      \"rightsIdentifierScheme\": \"SPDX\"\r\n    }\r\n  ],\r\n  \"descriptions\": [\r\n    {\r\n      \"description\": \"The study of the pragmatics of Irish English is a recent endeavour. Since its beginnings, a substantial amount of scholarship has been conducted in a cross-varietal design with the aim of highlighting shared and specific features of Irish English vis-à-vis other varieties of English. A particular focus of such variational pragmatic research has been on speech act realisations. Cross-varietal studies on apologies in Irish English remain, however, limited. The present chapter addresses this research gap in the study of apologies in Irish English. It takes a variational pragmatic approach to the study of remedial apologies, contrasting apologies in Irish English and in English English empirically using comparable data . Specifically, production questionnaire data is investigated and norms of appropriate verbal apologetic behaviour contrasted. The analysis centres on the apology strategies and modification employed across varieties and on their linguistic realisations, and a particular focus is placed on the cross-varietal use of alerters and vocatives in apologising. Findings point to the universality of apology strategies, while also revealing variety-preferential pragmatic differences. Specifically, the Irish English data reveals a higher use of vocatives, many playing a relational function in the data, and thus suggesting higher levels of relational orientation in the Irish English data relative to the English English data. In addition, a higher use of upgrading strategies and explanations, many communicating an active speaker role, is recorded in the Irish English data pointing to a comparatively higher redress of speakers’ loss of positive face.\",\r\n      \"descriptionType\": \"Abstract\"\r\n    }\r\n  ],\r\n  \"geoLocations\": [],\r\n  \"fundingReferences\": [],\r\n  \"relatedIdentifiers\": [\r\n    {\r\n      \"relationType\": \"IsVariantFormOf\",\r\n      \"relatedIdentifier\": \"10.4324/9781003025078-6\",\r\n      \"relatedIdentifierType\": \"DOI\"\r\n    },\r\n    {\r\n      \"relationType\": \"IsPublishedIn\",\r\n      \"relatedIdentifier\": \"978-0-367-85639-7\",\r\n      \"relatedIdentifierType\": \"ISBN\"\r\n    }\r\n  ],\r\n  \"relatedItems\": [\r\n    {\r\n      \"titles\": [\r\n        {\r\n          \"title\": \"Expanding the Landscapes of Irish English Research\"\r\n        }\r\n      ],\r\n      \"creators\": [],\r\n      \"lastPage\": \"128\",\r\n      \"firstPage\": \"109\",\r\n      \"publisher\": \"Routledge\",\r\n      \"contributors\": [],\r\n      \"relationType\": \"IsPublishedIn\",\r\n      \"publicationYear\": \"2022\",\r\n      \"relatedItemType\": \"Book\",\r\n      \"relatedItemIdentifier\": {\r\n        \"relatedItemIdentifier\": \"10.4324/9781003025078-6\",\r\n        \"relatedItemIdentifierType\": \"DOI\"\r\n      }\r\n    }\r\n  ],\r\n  \"schemaVersion\": \"http://datacite.org/schema/kernel-4\",\r\n  \"providerId\": \"pvre\",\r\n  \"clientId\": \"pvre.aqmlok\",\r\n  \"agency\": \"datacite\",\r\n  \"state\": \"findable\"\r\n}",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Sorry Miss, I Completely Forgot about It: Apologies and Vocatives in Ireland and England",
				"creators": [
					{
						"lastName": "Barron",
						"firstName": "Anne",
						"creatorType": "author"
					},
					{
						"lastName": "Medien- Und Informationszentrum",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "Technische Informationsbibliothek (TIB) Hannover",
						"creatorType": "contributor",
						"fieldMode": 1
					}
				],
				"date": "2022",
				"ISBN": "978-0-367-85639-7",
				"abstractNote": "The study of the pragmatics of Irish English is a recent endeavour. Since its beginnings, a substantial amount of scholarship has been conducted in a cross-varietal design with the aim of highlighting shared and specific features of Irish English vis-à-vis other varieties of English. A particular focus of such variational pragmatic research has been on speech act realisations. Cross-varietal studies on apologies in Irish English remain, however, limited. The present chapter addresses this research gap in the study of apologies in Irish English. It takes a variational pragmatic approach to the study of remedial apologies, contrasting apologies in Irish English and in English English empirically using comparable data . Specifically, production questionnaire data is investigated and norms of appropriate verbal apologetic behaviour contrasted. The analysis centres on the apology strategies and modification employed across varieties and on their linguistic realisations, and a particular focus is placed on the cross-varietal use of alerters and vocatives in apologising. Findings point to the universality of apology strategies, while also revealing variety-preferential pragmatic differences. Specifically, the Irish English data reveals a higher use of vocatives, many playing a relational function in the data, and thus suggesting higher levels of relational orientation in the Irish English data relative to the English English data. In addition, a higher use of upgrading strategies and explanations, many communicating an active speaker role, is recorded in the Irish English data pointing to a comparatively higher redress of speakers’ loss of positive face.",
				"bookTitle": "Expanding the Landscapes of Irish English Research",
				"extra": "DOI: 10.48548/PUBDATA-155",
				"language": "en",
				"pages": "109-128",
				"publisher": "Medien- und Informationszentrum, Leuphana Universität Lüneburg",
				"rights": "Anonymous, Creative Commons Attribution 4.0 International",
				"url": "https://pubdata.leuphana.de/handle/20.500.14123/175",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "import",
		"input": "{\r\n  \"id\": \"https://doi.org/10.25656/01:28324\",\r\n  \"doi\": \"10.25656/01:28324\",\r\n  \"url\": \"https://www.pedocs.de/frontdoor.php?source_opus=28324\",\r\n  \"types\": {\r\n    \"ris\": \"CHAP\",\r\n    \"bibtex\": \"misc\",\r\n    \"citeproc\": \"article\",\r\n    \"schemaOrg\": \"Chapter\",\r\n    \"resourceTypeGeneral\": \"BookChapter\"\r\n  },\r\n  \"creators\": [\r\n    {\r\n      \"name\": \"Bonnet, Andreas\",\r\n      \"givenName\": \"Andreas\",\r\n      \"familyName\": \"Bonnet\",\r\n      \"nameIdentifiers\": [\r\n        {\r\n          \"schemeUri\": \"https://www.dnb.de/gnd\",\r\n          \"nameIdentifier\": \"122894715\",\r\n          \"nameIdentifierScheme\": \"GND\"\r\n        }\r\n      ]\r\n    },\r\n    {\r\n      \"name\": \"Bakels, Elena\",\r\n      \"givenName\": \"Elena\",\r\n      \"familyName\": \"Bakels\",\r\n      \"nameIdentifiers\": [\r\n        {\r\n          \"schemeUri\": \"https://www.dnb.de/gnd\",\r\n          \"nameIdentifier\": \"1204016224\",\r\n          \"nameIdentifierScheme\": \"GND\"\r\n        }\r\n      ]\r\n    },\r\n    {\r\n      \"name\": \"Hericks, Uwe\",\r\n      \"givenName\": \"Uwe\",\r\n      \"familyName\": \"Hericks\",\r\n      \"nameIdentifiers\": [\r\n        {\r\n          \"schemeUri\": \"https://www.dnb.de/gnd\",\r\n          \"nameIdentifier\": \"129263400\",\r\n          \"nameIdentifierScheme\": \"GND\"\r\n        }\r\n      ]\r\n    }\r\n  ],\r\n  \"titles\": [\r\n    {\r\n      \"lang\": \"de\",\r\n      \"title\": \"Die Professionalisierung von Lehrpersonen aus praxeologischer Perspektive. Professionelles Handeln als Entscheiden\"\r\n    }\r\n  ],\r\n  \"publisher\": {\r\n    \"name\": \"Verlag Julius Klinkhardt : Bad Heilbrunn\"\r\n  },\r\n  \"subjects\": [\r\n    {\r\n      \"lang\": \"en\",\r\n      \"subject\": \"370 Education\",\r\n      \"subjectScheme\": \"DDC\",\r\n      \"classificationCode\": \"370\"\r\n    },\r\n    {\r\n      \"lang\": \"de\",\r\n      \"subject\": \"370 Erziehung, Schul- und Bildungswesen\",\r\n      \"subjectScheme\": \"DDC\",\r\n      \"classificationCode\": \"370\"\r\n    },\r\n    {\r\n      \"lang\": \"de\",\r\n      \"subject\": \"Professionalität\"\r\n    },\r\n    {\r\n      \"lang\": \"de\",\r\n      \"subject\": \"Professionalisierung\"\r\n    },\r\n    {\r\n      \"lang\": \"de\",\r\n      \"subject\": \"Lehrer\"\r\n    },\r\n    {\r\n      \"lang\": \"de\",\r\n      \"subject\": \"Lehramtsstudent\"\r\n    },\r\n    {\r\n      \"lang\": \"de\",\r\n      \"subject\": \"Praxeologie\"\r\n    },\r\n    {\r\n      \"lang\": \"de\",\r\n      \"subject\": \"Entscheidung\"\r\n    },\r\n    {\r\n      \"lang\": \"de\",\r\n      \"subject\": \"Erwartung\"\r\n    },\r\n    {\r\n      \"lang\": \"de\",\r\n      \"subject\": \"Habitus\"\r\n    },\r\n    {\r\n      \"lang\": \"de\",\r\n      \"subject\": \"Norm\"\r\n    },\r\n    {\r\n      \"lang\": \"de\",\r\n      \"subject\": \"Standardisierung\"\r\n    },\r\n    {\r\n      \"lang\": \"de\",\r\n      \"subject\": \"Mathematikunterricht\"\r\n    },\r\n    {\r\n      \"lang\": \"de\",\r\n      \"subject\": \"Englischunterricht\"\r\n    },\r\n    {\r\n      \"lang\": \"de\",\r\n      \"subject\": \"Pädagogisches Handeln\"\r\n    },\r\n    {\r\n      \"lang\": \"en\",\r\n      \"subject\": \"Professionalism\"\r\n    },\r\n    {\r\n      \"lang\": \"en\",\r\n      \"subject\": \"Professionality\"\r\n    },\r\n    {\r\n      \"lang\": \"en\",\r\n      \"subject\": \"Professionalization\"\r\n    },\r\n    {\r\n      \"lang\": \"en\",\r\n      \"subject\": \"Teacher\"\r\n    },\r\n    {\r\n      \"lang\": \"en\",\r\n      \"subject\": \"Student teachers\"\r\n    },\r\n    {\r\n      \"lang\": \"en\",\r\n      \"subject\": \"Expectancy\"\r\n    },\r\n    {\r\n      \"lang\": \"en\",\r\n      \"subject\": \"Habits\"\r\n    },\r\n    {\r\n      \"lang\": \"en\",\r\n      \"subject\": \"Standard setting\"\r\n    },\r\n    {\r\n      \"lang\": \"en\",\r\n      \"subject\": \"Standards\"\r\n    },\r\n    {\r\n      \"lang\": \"en\",\r\n      \"subject\": \"Mathematics lessons\"\r\n    },\r\n    {\r\n      \"lang\": \"en\",\r\n      \"subject\": \"Teaching of mathematics\"\r\n    },\r\n    {\r\n      \"lang\": \"en\",\r\n      \"subject\": \"English language lessons\"\r\n    },\r\n    {\r\n      \"lang\": \"en\",\r\n      \"subject\": \"Teaching of English\"\r\n    },\r\n    {\r\n      \"lang\": \"en\",\r\n      \"subject\": \"Mathematics\"\r\n    },\r\n    {\r\n      \"subject\": \"FOS: Mathematics\",\r\n      \"schemeUri\": \"http://www.oecd.org/science/inno/38235147.pdf\",\r\n      \"subjectScheme\": \"Fields of Science and Technology (FOS)\"\r\n    }\r\n  ],\r\n  \"contributors\": [\r\n    {\r\n      \"name\": \"DIPF | Leibniz-Institut für Bildungsforschung und Bildungsinformation\",\r\n      \"nameType\": \"Organizational\",\r\n      \"contributorType\": \"HostingInstitution\",\r\n      \"nameIdentifiers\": {\r\n        \"schemeUri\": \"https://ror.org\",\r\n        \"nameIdentifier\": \"https://ror.org/0327sr118\",\r\n        \"nameIdentifierScheme\": \"ROR\"\r\n      }\r\n    }\r\n  ],\r\n  \"dates\": [\r\n    {\r\n      \"date\": \"2023\",\r\n      \"dateType\": \"Issued\"\r\n    },\r\n    {\r\n      \"date\": \"2024-02-21\",\r\n      \"dateType\": \"Updated\"\r\n    }\r\n  ],\r\n  \"publicationYear\": 2023,\r\n  \"language\": \"de\",\r\n  \"identifiers\": [\r\n    {\r\n      \"identifier\": \"https://nbn-resolving.org/urn:nbn:de:0111-pedocs-283244\",\r\n      \"identifierType\": \"URN\"\r\n    }\r\n  ],\r\n  \"rightsList\": [\r\n    {\r\n      \"rights\": \"Creative Commons Namensnennung - Nicht kommerziell - Keine Bearbeitungen 4.0 International\",\r\n      \"rightsUri\": \"http://creativecommons.org/licenses/by-nc-nd/4.0/deed.de\",\r\n      \"rightsIdentifier\": \"cc by nc nd 4.0 international\"\r\n    }\r\n  ],\r\n  \"descriptions\": [\r\n    {\r\n      \"description\": \"Hinzke, Jan-Hendrik [Hrsg.]; Keller-Schneider, Manuela [Hrsg.]: Professionalität und Professionalisierung von Lehrpersonen. Perspektiven, theoretische Rahmungen und empirische Zugänge. Bad Heilbrunn : Verlag Julius Klinkhardt 2023, S. 179-196. - (Studien zur Professionsforschung und Lehrer:innenbildung)\",\r\n      \"descriptionType\": \"SeriesInformation\"\r\n    },\r\n    {\r\n      \"lang\": \"de\",\r\n      \"description\": \"Insbesondere rekonstruktive Untersuchungen haben die Bedeutsamkeit impliziter Wissensbestände für die Professionalisierung von Lehrpersonen herausgearbeitet. Diese Linie der Professionsforschung untersucht mit Hilfe soziologischer Theorien und rekonstruktiver Methoden, welchen Einfluss sozialisatorisch erworbene Wissensbestände und die Strukturen der Organisation Schule auf das Handeln von Lehrpersonen haben. Im Zentrum dieses Aufsatzes stehen die praxeologisch zentralen Begriffe Habitus und Norm sowie die systemtheoretische Konzeptualisierung von (organisationalem) Handeln als Umgang mit Kontingenz durch das Treffen von Entscheidungen. Die Ausführungen werden an ersten Daten aus dem Projekt Professionalisierung von Lehrpersonen der Fächer Mathematik und Englisch (ProME) illustriert. In diesem Projekt wird untersucht, wie Lehrpersonen der Fächer Mathematik und Englisch im Spannungsfeld von Habitus, Organisations- und Identitätsnormen zu ihren alltäglichen Handlungsentscheidungen kommen. (DIPF/Orig.)\",\r\n      \"descriptionType\": \"Abstract\"\r\n    },\r\n    {\r\n      \"lang\": \"en\",\r\n      \"description\": \"Reconstructive research into teacher knowledge has established the crucial role of implicit knowledge. This line of enquiry uses sociological theories and interpretative methods to establish the impact of a-theoretical knowledge or narrative knowledge on teachers’ actions. In this paper we use the praxeological concepts of habitus and norm alongside the systemtheoretical notion of decision-making in order to conceptualize how individuals act in organizational contexts. We exemplify this with first data from our project Professionalisation of Teachers of Maths and English (ProME). This project examines, how teachers of Maths and English navigate the tensions between habitus, organizational norms, and identity-norms in their dairly decision-making. (DIPF/Orig.)\",\r\n      \"descriptionType\": \"Abstract\"\r\n    }\r\n  ],\r\n  \"relatedIdentifiers\": [\r\n    {\r\n      \"relationType\": \"IsVariantFormOf\",\r\n      \"relatedIdentifier\": \"https://doi.org/10.35468/6043-09\",\r\n      \"resourceTypeGeneral\": \"Text\",\r\n      \"relatedIdentifierType\": \"DOI\"\r\n    },\r\n    {\r\n      \"relationType\": \"IsPublishedIn\",\r\n      \"relatedIdentifier\": \"978-3-7815-6043-7\",\r\n      \"relatedIdentifierType\": \"ISBN\"\r\n    },\r\n    {\r\n      \"relationType\": \"IsPublishedIn\",\r\n      \"relatedIdentifier\": \"978-3-7815-2600-6 \",\r\n      \"relatedIdentifierType\": \"ISBN\"\r\n    }\r\n  ],\r\n  \"relatedItems\": [\r\n    {\r\n      \"issue\": \"\",\r\n      \"titles\": {\r\n        \"title\": \"Professionalität und Professionalisierung von Lehrpersonen. Perspektiven, theoretische Rahmungen und empirische Zugänge\"\r\n      },\r\n      \"volume\": \"Studien zur Professionsforschung und Lehrer:innenbildung\",\r\n      \"lastPage\": \"196\",\r\n      \"firstPage\": \"179\",\r\n      \"publisher\": \"Verlag Julius Klinkhardt : Bad Heilbrunn\",\r\n      \"relationType\": \"IsPublishedIn\",\r\n      \"publicationYear\": \"2023\",\r\n      \"relatedItemType\": \"Book\",\r\n      \"relatedItemIdentifier\": {\r\n        \"relatedItemIdentifier\": \"978-3-7815-6043-7\",\r\n        \"relatedItemIdentifierType\": \"ISBN\"\r\n      }\r\n    }\r\n  ],\r\n  \"schemaVersion\": \"http://datacite.org/schema/kernel-4\",\r\n  \"providerId\": \"mjvh\",\r\n  \"clientId\": \"mjvh.pedocs\",\r\n  \"agency\": \"datacite\",\r\n  \"state\": \"findable\"\r\n}",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Die Professionalisierung von Lehrpersonen aus praxeologischer Perspektive. Professionelles Handeln als Entscheiden",
				"creators": [
					{
						"lastName": "Bonnet",
						"firstName": "Andreas",
						"creatorType": "author"
					},
					{
						"lastName": "Bakels",
						"firstName": "Elena",
						"creatorType": "author"
					},
					{
						"lastName": "Hericks",
						"firstName": "Uwe",
						"creatorType": "author"
					},
					{
						"lastName": "DIPF | Leibniz-Institut für Bildungsforschung und Bildungsinformation",
						"creatorType": "contributor",
						"fieldMode": 1
					}
				],
				"date": "2023",
				"ISBN": "978-3-7815-6043-7",
				"abstractNote": "Reconstructive research into teacher knowledge has established the crucial role of implicit knowledge. This line of enquiry uses sociological theories and interpretative methods to establish the impact of a-theoretical knowledge or narrative knowledge on teachers’ actions. In this paper we use the praxeological concepts of habitus and norm alongside the systemtheoretical notion of decision-making in order to conceptualize how individuals act in organizational contexts. We exemplify this with first data from our project Professionalisation of Teachers of Maths and English (ProME). This project examines, how teachers of Maths and English navigate the tensions between habitus, organizational norms, and identity-norms in their dairly decision-making. (DIPF/Orig.)",
				"bookTitle": "Professionalität und Professionalisierung von Lehrpersonen. Perspektiven, theoretische Rahmungen und empirische Zugänge",
				"extra": "DOI: 10.25656/01:28324",
				"language": "de",
				"pages": "179-196",
				"publisher": "Verlag Julius Klinkhardt : Bad Heilbrunn",
				"rights": "Creative Commons Namensnennung - Nicht kommerziell - Keine Bearbeitungen 4.0 International",
				"url": "https://www.pedocs.de/frontdoor.php?source_opus=28324",
				"volume": "Studien zur Professionsforschung und Lehrer:innenbildung",
				"attachments": [],
				"tags": [
					{
						"tag": "370 Education"
					},
					{
						"tag": "370 Erziehung, Schul- und Bildungswesen"
					},
					{
						"tag": "Englischunterricht"
					},
					{
						"tag": "English language lessons"
					},
					{
						"tag": "Entscheidung"
					},
					{
						"tag": "Erwartung"
					},
					{
						"tag": "Expectancy"
					},
					{
						"tag": "FOS: Mathematics"
					},
					{
						"tag": "Habits"
					},
					{
						"tag": "Habitus"
					},
					{
						"tag": "Lehramtsstudent"
					},
					{
						"tag": "Lehrer"
					},
					{
						"tag": "Mathematics"
					},
					{
						"tag": "Mathematics lessons"
					},
					{
						"tag": "Mathematikunterricht"
					},
					{
						"tag": "Norm"
					},
					{
						"tag": "Praxeologie"
					},
					{
						"tag": "Professionalisierung"
					},
					{
						"tag": "Professionalism"
					},
					{
						"tag": "Professionality"
					},
					{
						"tag": "Professionalität"
					},
					{
						"tag": "Professionalization"
					},
					{
						"tag": "Pädagogisches Handeln"
					},
					{
						"tag": "Standard setting"
					},
					{
						"tag": "Standardisierung"
					},
					{
						"tag": "Standards"
					},
					{
						"tag": "Student teachers"
					},
					{
						"tag": "Teacher"
					},
					{
						"tag": "Teaching of English"
					},
					{
						"tag": "Teaching of mathematics"
					}
				],
				"notes": [
					{
						"note": "<h2>SeriesInformation</h2>\nHinzke, Jan-Hendrik [Hrsg.]; Keller-Schneider, Manuela [Hrsg.]: Professionalität und Professionalisierung von Lehrpersonen. Perspektiven, theoretische Rahmungen und empirische Zugänge. Bad Heilbrunn : Verlag Julius Klinkhardt 2023, S. 179-196. - (Studien zur Professionsforschung und Lehrer:innenbildung)"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "import",
		"input": "{\r\n  \"id\": \"https://doi.org/10.11588/arthistoricum.1141.c16127\",\r\n  \"doi\": \"10.11588/ARTHISTORICUM.1141.C16127\",\r\n  \"url\": \"https://books.ub.uni-heidelberg.de//arthistoricum/catalog/book/1141/chapter/16127\",\r\n  \"types\": {\r\n    \"ris\": \"CHAP\",\r\n    \"bibtex\": \"misc\",\r\n    \"citeproc\": \"article\",\r\n    \"schemaOrg\": \"Chapter\",\r\n    \"resourceType\": \"Chapter\",\r\n    \"resourceTypeGeneral\": \"BookChapter\"\r\n  },\r\n  \"creators\": [\r\n    {\r\n      \"name\": \"Rasche, Adelheid\",\r\n      \"nameType\": \"Personal\",\r\n      \"givenName\": \"Adelheid\",\r\n      \"familyName\": \"Rasche\",\r\n      \"affiliation\": [],\r\n      \"nameIdentifiers\": []\r\n    },\r\n    {\r\n      \"name\": \"Großmann, G. Ulrich\",\r\n      \"nameType\": \"Personal\",\r\n      \"givenName\": \"G. Ulrich\",\r\n      \"familyName\": \"Großmann\",\r\n      \"affiliation\": [],\r\n      \"nameIdentifiers\": []\r\n    }\r\n  ],\r\n  \"titles\": [\r\n    {\r\n      \"title\": \"Luxury in Silk. Eighteenth-Century Fashion: English summary of the book Luxus in Seide\"\r\n    },\r\n    {\r\n      \"title\": \"Luxury in Silk. Eighteenth-Century Fashion: English summary of the book Luxus in Seide\",\r\n      \"titleType\": \"TranslatedTitle\"\r\n    }\r\n  ],\r\n  \"publisher\": {\r\n    \"name\": \"arthistoricum.net\"\r\n  },\r\n  \"container\": {\r\n    \"type\": \"Series\",\r\n    \"identifier\": \"10.11588/arthistoricum.1141\",\r\n    \"identifierType\": \"DOI\"\r\n  },\r\n  \"subjects\": [\r\n    {\r\n      \"subject\": \"gnd/4054289-0\"\r\n    },\r\n    {\r\n      \"subject\": \"gnd/4039792-0\"\r\n    },\r\n    {\r\n      \"subject\": \"gnd/4031011-5\"\r\n    }\r\n  ],\r\n  \"contributors\": [],\r\n  \"dates\": [\r\n    {\r\n      \"date\": \"2023\",\r\n      \"dateType\": \"Issued\"\r\n    }\r\n  ],\r\n  \"publicationYear\": 2023,\r\n  \"language\": \"de\",\r\n  \"identifiers\": [],\r\n  \"sizes\": [],\r\n  \"formats\": [],\r\n  \"rightsList\": [\r\n    {\r\n      \"rightsUri\": \"https://www.ub.uni-heidelberg.de/service/openaccess/lizenzen/freier-zugang.html\"\r\n    }\r\n  ],\r\n  \"descriptions\": [],\r\n  \"geoLocations\": [],\r\n  \"fundingReferences\": [],\r\n  \"relatedIdentifiers\": [\r\n    {\r\n      \"relationType\": \"IsPartOf\",\r\n      \"relatedIdentifier\": \"10.11588/arthistoricum.1141\",\r\n      \"relatedIdentifierType\": \"DOI\"\r\n    }\r\n  ],\r\n  \"relatedItems\": [\r\n    {\r\n      \"titles\": [\r\n        {\r\n          \"title\": \"Luxus in Seide\"\r\n        },\r\n        {\r\n          \"title\": \"Luxus in Seide\",\r\n          \"titleType\": \"TranslatedTitle\"\r\n        }\r\n      ],\r\n      \"creators\": [],\r\n      \"contributors\": [],\r\n      \"relationType\": \"IsPublishedIn\",\r\n      \"relatedItemType\": \"Book\",\r\n      \"relatedItemIdentifier\": {\r\n        \"relatedItemIdentifier\": \"https://books.ub.uni-heidelberg.de//arthistoricum/catalog/book/1141\",\r\n        \"relatedItemIdentifierType\": \"URL\"\r\n      }\r\n    }\r\n  ],\r\n  \"schemaVersion\": \"http://datacite.org/schema/kernel-4\",\r\n  \"providerId\": \"vgzm\",\r\n  \"clientId\": \"gesis.ubhd\",\r\n  \"agency\": \"datacite\",\r\n  \"state\": \"findable\"\r\n}",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Luxury in Silk. Eighteenth-Century Fashion: English summary of the book Luxus in Seide",
				"creators": [
					{
						"lastName": "Rasche",
						"firstName": "Adelheid",
						"creatorType": "author"
					},
					{
						"lastName": "Großmann",
						"firstName": "G. Ulrich",
						"creatorType": "author"
					}
				],
				"date": "2023",
				"bookTitle": "Luxus in Seide",
				"extra": "DOI: 10.11588/ARTHISTORICUM.1141.C16127",
				"language": "de",
				"publisher": "arthistoricum.net",
				"url": "https://books.ub.uni-heidelberg.de//arthistoricum/catalog/book/1141/chapter/16127",
				"attachments": [],
				"tags": [
					{
						"tag": "gnd/4031011-5"
					},
					{
						"tag": "gnd/4039792-0"
					},
					{
						"tag": "gnd/4054289-0"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
