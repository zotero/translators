{
	"translatorID": "f225cf62-a125-47eb-92e6-64fd7e0adbc6",
	"label": "JSON-LD",
	"creator": "Philipp Zumstein",
	"target": "txt",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 2,
	"lastUpdated": "2018-04-25 18:00:00"
}


/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2018 Philipp Zumstein

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


function doExport() {
	var result = {};
	result["@context"] = {
			"schema": "http://schema.org/"
	};
	result["@graph"] = [];
	var item, outputItem;
	while ((item = Zotero.nextItem())) {
		// parse extra fields
		if (item.extra) {
			let extra = item.extra.split('\n');
			for (let extraField of extra) {
				if (extraField.includes(':')) {
					let key = extraField.split(':')[0];
					let value = extraField.split(':')[1];
					item.key = value.trim();
				}
			}
		}
		outputItem = {};
		let type = mappingTypes[item.itemType];
		outputItem["@type"] = type ? type : "schema:CreativeWork";
		outputItem["@id"] = item.uri;
		// simple fields
		for (let key in item) {
			let value = item[key];
			let field = mappingFields[key];
			if (field) {
				outputItem[field] = value;
			}
		}
		// creators
		for (let creator of item.creators) {
			let creatorType = creator.creatorType;
			if (creatorType == "bookAuthor") continue; // will handle that later in the section about chapter
			if (["interviewer", "reviewedAuthor"].includes(creatorType)) continue; // TODO
			// author, composer, director, editor, recipient, translator are the same in schema
			var outputCreatorType = "schema:" + creatorType;
			addCreator(creator, outputCreatorType, outputItem);
		}
		// DOI
		if (item.DOI) {
			outputItem["schema:sameAs"] = item.DOI.includes("://") ? item.DOI : "https://doi.org/" + item.DOI;
		}
		// publisher, place
		if (item.publisher || item.place) {
			outputItem["schema:publisher"] = {
				"@type": "Organization",
				"schema:name": item.publisher,
				"schema:location": item.place
			};
		}
		// series, seriesNumber, seriesEditor
		if (item.series || item.seriesTitle) {
			outputItem["schema:isPartOf"] = {
				"@type": "Series",
				"schema:name": item.series || item.seriesTitle,
				"schema:position": item.seriesNumber,
				"schema:description": item.seriesText
			};
			for (let creator of item.creators) {
				if (creator.creatorType !== "seriesEditor") continue; 
				addCreator(creator, "schema:editor", outputItem["schema:isPartOf"]);
			}
		}
		// tags
		outputItem["schema:about"] = item.tags.map(singleTag => singleTag.tag);
		// archive, archiveLocation
		if (item.archive || item.archiveLocation) {
			outputItem["schema:offers"] = {
				"@type": "Offer",
				"seller": item.archive,
				"sku": item.archiveLocation
			};
		}
		// chapter
		if (type == "schema:Chapter") {
			let possibleSerie = outputItem["schema:isPartOf"];
			outputItem["schema:isPartOf"] = {
				"@type": "schema:Book",
				"@id": item.uri + "#book",
				"schema:name": item.bookTitle,
				"schema:isPartOf": possibleSerie,
				"schema:inLanguage": item.language
			};
			moveProperties(["schema:volumeNumber", "schema:bookEdition", "schema:publisher", "schema:isbn"], outputItem, outputItem["schema:isPartOf"]);
			for (let creator of item.creators) {
				if (creator.creatorType !== "bookAuthor") continue; 
				addCreator(creator, "schema:author", outputItem["schema:isPartOf"]);
			}
		}
		
		// journal article
		if (type == "schema:ScholarlyArticle") {
			var resource = outputItem;
			if (resource["schema:issueNumber"]) {
				resource["schema:isPartOf"] = {
					"@type": "schema:PublicationIssue",
					"@id": item.uri + "#issue"
				};
				moveProperties(["schema:volumeNumber", "schema:issueNumber", "schema:issn"], resource, resource["schema:isPartOf"]);
				resource = resource["schema:isPartOf"];
			}
			if (resource["schema:volumeNumber"]) {
				resource["schema:isPartOf"] = {
					"@type": "schema:PublicationVolume",
					"@id": item.uri + "#volume"
				};
				moveProperties(["schema:volumeNumber", "schema:issn"], resource, resource["schema:isPartOf"]);
				resource = resource["schema:isPartOf"];
			}
			if (item.publicationTitle) {
				resource["schema:isPartOf"] = {
					"@type": "schema:Periodical",
					"@id": item.uri + "#journal",
					"schema:name": item.publicationTitle,
					"schema:alternateName": item.journalAbbreviation
				};
				moveProperties(["schema:issn"], resource, resource["schema:isPartOf"]);
				resource = resource["schema:isPartOf"];
			}
		}
		
		result["@graph"].push(outputItem);
	}
	
	// output everything
	if (result["@graph"].length==1 && outputItem) {
		// we don't need the @graph for a single item
		delete result["@graph"];
		for (let key in outputItem) {
			result[key] = outputItem[key];
		}
	}
	Zotero.write(JSON.stringify(result, null, 2));
}

function addCreator(creator, outputCreatorType, outputItem) {
	if (!outputCreatorType) return;
	if (!outputItem[outputCreatorType]) outputItem[outputCreatorType] = [];
	if (creator.fieldMode) {
		outputItem[outputCreatorType].push({
			"@type": "schema:Organization",
			"schema:name": creator.lastName
		});
	} else {
		outputItem[outputCreatorType].push({
			"@type": creator.fieldMode ? "schema:Organization" : "schema:Person",
			"schema:givenName": creator.firstName,
			"schema:familyName": creator.lastName
		});
	}
}

// move properties from an object to another object
function moveProperties(properties, fromObject, toObject) {
	for (let property of properties) {
		toObject[property] = fromObject[property];
		delete fromObject[property];
	}
}

var mappingTypes = {
	"artwork": "schema:VisualArtwork",
	"attachment": "DigitalDocument",
	"audioRecording": "AudioObject", // TODO also MusicRecording could fit
	"bill": "schema:Legislation", //TODO check
	"blogPost": "schema:BlogPosting",
	"book": "schema:Book",
	"bookSection": "schema:Chapter",
	"case": null,
	"computerProgram": "schema:SoftwareApplication",
	"conferencePaper": null,
	"dictionaryEntry": null,
	"document": null,
	"email": "schema:EmailMessage",
	"encyclopediaArticle": null,
	"film": "schema:Movie",
	"forumPost": "schema:DiscussionForumPosting",
	"hearing": null,
	"instantMessage": null,
	"interview": null,
	"journalArticle": "schema:ScholarlyArticle",
	"letter": null,
	"magazineArticle": "schema:Article",
	"manuscript": null,
	"map": "schema:Map",
	"newspaperArticle": "schema:NewsArticle",
	"note": "NoteDigitalDocument",
	"patent": null,
	"podcast": null,
	"presentation": null,
	"radioBroadcast": null,
	"report": "Report",
	"statute": "schema:Legislation", //TODO check
	"thesis": "schema:Thesis",
	"tvBroadcast": null,
	"videoRecording": "schema:VideoObject",
	"webpage": "schema:WebPage",
	// in Zotero's extra field
	"dataset": "schema:Dataset"
};

var mappingFields = {
	"title": "schema:name",
	"abstractNote": "schema:description",
	"volume": "schema:volumeNumber",
	"issue": "schema:issueNumber",
	"edition": "schema:bookEdition",
	"date": "schema:datePublished",
	"numPages": "schema:numberOfPages",
	"language": "schema:inLanguage",
	"ISBN": "schema:isbn",
	"pages": "schema:pagination",
	"numberOfVolumes": "", // TODO
	"ISSN": "schema:issn",
	"rights": "schema:license",
	"artworkMedium": "schema:artMedium",
	"audioRecordingFormat": "encodingFormat",
	"videoRecordingFormat": "encodingFormat",
	"runningTime": "schema:duration",
	"programmingLanguage": "schema:programmingLanguage",
	"url": "schema:url",
	"shortTitle": "schema:alternateName",
	// TODO not yet handled
	"proceedingsTitle": "",
	"conferenceName": "",
	"libraryCatalog": "",
	"callNumber": "",
	"accessDate": ""
};

