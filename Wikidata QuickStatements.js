{
	"translatorID": "51e5355d-9974-484f-80b9-f84d2b55782e",
	"label": "Wikidata QuickStatements",
	"creator": "Philipp Zumstein",
	"target": "txt",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 2,
	"browserSupport": "gcs",
	"lastUpdated": "2017-08-04 20:31:00"
}


/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2017 Philipp Zumstein

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


var typeMapping = {
	//Zotero types
	"artwork" : "Q838948",
	//"attachment" : "Q17709279",
	"audioRecording" : "Q30070318",
	"bill" : "Q686822",
	"blogPost" : "Q17928402",
	"book" : "Q571",
	"bookSection" : "Q1980247",
	"case" : "Q2334719",
	"computerProgram" : "Q40056",
	"conferencePaper" : "Q23927052",
	"dictionaryEntry" : "Q30070414",
	"document" : "Q49848",
	"email" : "Q30070439",
	"encyclopediaArticle" : "Q17329259",
	"film" : "Q11424",
	"forumPost" : "Q7216866",
	"hearing" : "Q30070550",
	"instantMessage" : "Q30070565",
	"interview" : "Q178651",
	"journalArticle" : "Q13442814",
	"letter" : "Q133492",
	"magazineArticle" : "Q30070590",
	"manuscript" : "Q87167",
	"map" : "Q4006",
	"newspaperArticle" : "Q5707594",
	//note
	"patent" : "Q253623",
	"podcast" : "Q24634210",
	"presentation" : "Q604733",
	"radioBroadcast" : "Q1555508",
	"report" : "Q10870555",
	"statute" : "Q820655",
	"thesis" : "Q1266946",
	"tvBroadcast" : "Q15416",
	"videoRecording" : "Q30070675",
	"webpage" : "Q36774",
	//additional CSL types (can be used in Zotero with a hack)
	"dataset" : "Q1172284",
	//entry
	"figure" : "Q30070753",
	"musical_score" : "Q187947",
	"pamphlet" : "Q190399",
	"review" : "Q265158",
	"review-book" : "Q637866",
	"treaty" : "Q131569"
};

//simple properties with string values can be simply mapped here
var propertyMapping = {
	"P356" : "DOI",
	"P953" : "url",
	"P478" : "volume",
	"P433" : "issue",
	"P304" : "pages"
};

var languageMapping = {
	"en" : "Q1860",
	"it" : "Q652",
	"de" : "Q188",
	"ger" : "Q188",
	"fr" : "Q150"
};

var identifierMapping = {
	"PMID" : "P698",
	"PMCID" : "P932",
	"JSTOR ID" : "P888",
	"arXiv" : "P818",
	"Open Library ID" : "P648",
	"OCLC" : "P243"
};


function zoteroItemToQuickStatements(item) {
	var statements = ['CREATE'];
	var addStatement = function() {
		var args = Array.prototype.slice.call(arguments);
		statements.push('LAST\t' + args.join('\t'));
	};

	var itemType = item.itemType;
	//check whether a special itemType is defined in the extra fields
	if (item.extra) {
		var matchItemType = item.extra.match(/itemType: ([\w\-]+)($|\n)/);
		if (matchItemType) {
			itemType = matchItemType[1];
		}
	}
	if (typeMapping[itemType]) {
		addStatement('P31', typeMapping[itemType]);
	}
	addStatement('Len', '"' + item.title + '"');

	var description = itemType.replace(/([A-Z])/, function(match, firstLetter) {
		return ' ' + firstLetter.toLowerCase();
	});
	if (item.publicationTitle && (itemType=="journalArticle" || itemType=="magazineArticle" || itemType=="newspaperArticle")) {
		description = description + ' from \'' + item.publicationTitle + '\'';
	}
	if (item.date) {
		var year = ZU.strToDate(item.date).year;
		if (year) {
			description = description + ' published in ' + year;
		}
	}
	addStatement('Den', '"' + description + '"');

	for (var pnumber in propertyMapping) {
		var zfield = propertyMapping[pnumber];
		if (item[zfield]) {
			addStatement(pnumber, '"' + item[zfield] + '"');
		}
	}

	var index = 1;
	for (var i=0; i<item.creators.length; i++) {
		var creatorValue = item.creators[i].lastName;
		var creatorType = item.creators[i].creatorType;
		if (item.creators[i].firstName) {
			creatorValue = item.creators[i].firstName + ' ' + creatorValue;
		}
		if (creatorType=="author") {
			addStatement('P2093', '"' + creatorValue + '"', 'P1545', '"' + index+ '"');
			index++;
		}
		//other creatorTypes are ignored, because they would need to point an item, rather than just writing the string value
	}

	if (item.date) {
		//e.g. +1967-01-17T00:00:00Z/11
		var formatedDate = ZU.strToISO(item.date);
		switch(formatedDate.length) {
			case 4:
				formatedDate = formatedDate + "-00-00T00:00:00Z/9";
				break;
			case 7:
				formatedDate = formatedDate + "-00T00:00:00Z/10";
				break;
			case 10:
				formatedDate = formatedDate + "T00:00:00Z/11";
				break;
			default:
				formatedDate = formatedDate + "/11";
		}
		addStatement('P577', '+'+formatedDate);
	}

	if (item.ISBN) {
		var isbnDigits = item.ISBN.replace(/\-/g, '');
		if (isbnDigits.length==13) {
			addStatement('P212', '"' + item.ISBN + '"');
		}
		if (isbnDigits.length==10) {
			addStatement('P957', '"' + item.ISBN + '"');
		}
	}

	if (item.language) {
		item.language = item.language.toLowerCase();
		addStatement('P1476', item.language + ':"' + item.title + '"');
		for (var lang in languageMapping) {
			if (item.language.startsWith(lang)) {
				addStatement('P407', languageMapping[lang]);
			}
		}
	} else {
		//otherwise use "und" for undetermined language
		addStatement('P1476', 'und:"' + item.title + '"');
	}

	if (item.extra) {
		var extraLines = item.extra.split('\n');
		for (var j=0; j<extraLines.length; j++) {
			var colon = extraLines[j].indexOf(':');
			if (colon>-1) {
				var label = extraLines[j].substr(0,colon);
				var value = extraLines[j].substr(colon+1);
				if (identifierMapping[label]) {
					addStatement(identifierMapping[label], '"' + value.trim() + '"');
				}
			}
		}
	}

	return statements.join('\n') + '\n';
}

function doExport() {
	var item;
	while ((item = Zotero.nextItem())) {
		Zotero.write(zoteroItemToQuickStatements(item));
	}
}
