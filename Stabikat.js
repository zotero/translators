{
	"translatorID": "599ff9de-2049-4b99-ad67-691bde0df74a",
	"label": "Stabikat",
	"creator": "Marcel Klotz",
	"target": "^https?://(www\\\\.)?stabikat.de/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcs",
	"lastUpdated": "2021-02-20 21:30:35"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2021 Marcel Klotz

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

function attr(docOrElem, selector, attr, index) {
	var elem = index ? docOrElem.querySelectorAll(selector).item(index) : docOrElem.querySelector(selector);
	return elem ? elem.getAttribute(attr) : null;
}

function text(docOrElem, selector, index) {
	var elem = index ? docOrElem.querySelectorAll(selector).item(index) : docOrElem.querySelector(selector);
	return elem ? elem.textContent : null;
}


function detectWeb(doc, url) {
	if (url.indexOf('ACT=SRCH') != -1 && getSearchResults(doc, true)) {
		return 'multiple';
	} else{
		var type = attr(doc, "#maticon", "alt");
		switch (type) {
			case 'Bücher':
			case 'Books':
				return 'book';
			case 'Briefe':
			case 'Letters':
				return 'letter';
			case 'Musikalien':
			case 'Music':
				return 'music';
			case 'Zeitschriften/Serien (ohne Online-Zeitschr.)':
			case 'Periodicals (non-online)':
				return 'periodicals_non-online';
			case 'Filme, Videos, etc.':
			case 'Audio visual':
				return 'film';
			case 'Tonträger':
			case 'Sound':
				return 'audioRecording';
			case 'Online-Zeitschriften':
			case 'Online periodicals':
				// periodicals -- in contrast to their articles -- will use book-entries, as there is no specific type
				return 'periodicals_online';
			case 'Bilder':
			case 'Pictures':
				return 'picture';
			case 'Datenträger':
			case 'Software':
				return 'Datenträger';
			case 'E-Books/Online Ressourcen':
			case 'Online resources (without periodicals)':
				// periodicals -- in contrast to their articals -- will use book-entries, as there is no specific type
				return 'book';
			case 'Kartenmaterial':
			case 'Cartography':
			return 'map';
			case 'Mikroformen':
			case 'Microfilm':
				return 'microfilm';
			case 'Aufsätze':
			case 'Articles':
				return 'article';
			case 'Manuskripte':
			case 'Handwriting':
				return 'manuscript';
			case 'Spiele, Skulpturen, etc.':
			case 'Games, Scupture, etc.':
				return 'other';
			default:
				return 'book';
		}
	}
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		Zotero.selectItems (getSearchResults(doc, false), function (items) {
			if (!items) {
				return true;
			}
			var articles = [];
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, scrape);
		});
	} else {
		scrape(doc, url);
	}
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.hit');
	for (var i=0; i<rows.length; i++) {
		var href = rows[i].childNodes[1] && rows[i].childNodes[1].href ? rows[i].childNodes[1].href : "";
		var title = ZU.trimInternal(rows[i].textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function fetchJson(ppn, type, isReferenceWork, referencingWorkJson) {
	var JsonUrl = "http://unapi.gbv.de/?id=stabikat:ppn:" + ppn + "&format=picajson";
	Zotero.Utilities.doGet(JsonUrl, function (json) {
		json = JSON.parse(json);
		{return !isReferenceWork ? jsonParse(json, type) : doReferencingWork(json, type, referencingWorkJson) }
	});
}

function doReferencingWork(json, type, referencingWorkJson){
	var newItem = generalParser(json, type, referencingWorkJson);
	newItem.complete();
}

function scrape(doc, url) {
	var type = detectWeb(doc, url);

	//get the identifaction number necessary for the api query
	var permalink = attr(doc, ".cnt > table:nth-child(1) > tbody:nth-child(1) > tr:nth-child(4) > td:nth-child(1) > table:nth-child(1) > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(2) > a:nth-child(1)", "href");
	var ppn = permalink.slice(permalink.indexOf("PPN=") + 4);
	//load the json with the ID
	fetchJson(ppn, type, false);
}



function jsonParse(json, type) {
	// parsing is directed according to  the documentation of fields in: https://swbtools.bsz-bw.de/cgi-bin/k10plushelp.pl?cmd=pplist&katalog=Standard&val=-1&adm=0
	switch(type){
		case "book":
		case 'periodicals_online':
		case 'periodicals_non-online':
		case 'other':
			type = "book";
			var newItem = generalParser(json, type, false);
			newItem.complete();
			break;
		case "article":
			var bookPPN = '';
			//fetching data to acquire reference work data
			for (var i = 0; i < json.length; i++){
				if (json[i][0] === '039B'){
					for (var j = 0; j < json[i].length; j++){
						if (json[i][j] === '9'){
							bookPPN = json[i][j+1];
							break;
						}
					}
					break;
				}
			}
			
			if (bookPPN){
				fetchJson(bookPPN, "bookSection", true, json);
			} else {
				newItem = generalParser(json, type, false);
				newItem.complete();
			}
			break;
		case "microfilm":
		case "Datenträger":
			for (i = 0; i < json.length; i++){
				if (json[i][0] === '002@'){
					var contentmediumtype = json[i][3][1];
					if (contentmediumtype === 's'){
						jsonParse(json, "article");
					} else {
						newItem = generalParser(json, 'book');
						newItem.complete();
					}
					break;
				}
			}
			break;
		case "film":
		case "map":
		case "music":
			//content type is stored in 002C. Data is used to specify zotero type in cases of video and audio, image material
			var contentType = "";
			for (i = 0; i < json.length; i++){
				if (json[i][0] === '002C'){
					for ( j = 0; j < json[i].length; j++){
						if (json[i][j] === "b"){
							contentType = json[i][j+1];
						}
					}
				}
			}
			switch(contentType){
				case "tdi" || "tdm" || "tdi":
					newItem = generalParser(json, "film");
					newItem.complete();
					break;
				case "prm" || "snd" || "spw":
					newItem = generalParser(json, "audioRecording")
					newItem.complete();
					break;
				case "crf" || "crm" || "crd" || "crn" || "cri" || "crt":
					newItem = generalParser(json, "map");
					newItem.complete();
					break;
				case "ntm" || "tcm":
					newItem = generalParser(json, "book");
					newItem.complete();
					break;
				case "sti" || "tci":
					newItem = generalParser(json, "artwork");
					newItem.complete();
					break;
				default:
					newItem = generalParser(json, "book");
					newItem.complete();
					break;
			}
			break;
		case "audioRecording":
			newItem = generalParser(json, 'audioRecording');
			newItem.complete();
			break;
		case "manuscript":
			newItem = generalParser(json, 'manuscript', false);
			newItem.complete();
			break;
		default:
			type = "book"
			newItem = generalParser(json, type, false);
			newItem.complete();
			break;
		}
}


function articleParse(json, newItem) {

		for (var i = 0; i < json.length; i++){
			// Title of the article/book section
			if (json[i][0] === "021A"){ 
				for (var j = 0; j < json[i].length; j++){
					if (json[i][j] === 'a') {
						
						newItem.title = json[i][j+1].replace('@', '');// an '@' was put into the database to 
						//mark the first significant word in a title and needs to be erased in translation.
					} else if (json[i][j] === 'd') {
						newItem.shortTitle = newItem.title;
						newItem.title += ': ' + json[i][j+1].replace('@', ''); 
					}
				}
			}
			//date 
			else if (json[i][0] === "011@"){ 
				for (j = 0; j < json[i].length; j++){
					if (json[i][j] === 'a') {
						newItem.date = json[i][j+1];				
					} else if (json[i][j] === 'r') {
						newItem.date === ' [' + json[i][j+1] + ']';
					} else if (json[i][j] === 'p') {
						conference_data += ', ' + json[i][j+1];
					}
				}
			}
			//principal authors
			else if (json[i][0] === "028A") { //multiple authors are to be seperated by a newline
				
				for (j = 0; j < json[i].length; j++) {
					if (json[i][j] == 'A' || json[i][j] == 'a'){
						var princAuthorLastName = json[i][j+1];
					}
					if (json[i][j] == 'D' || json[i][j] == 'd'){
						var princAuthorFirstName = json[i][j+1];
					}
					if (json[i][j] == 'B' || json[i][j] == 'b'){
						var authType = json[i][j+1];
					}
					if (json[i][j] == '4'){
						var authTypeShort = json[i][j+1];
					}
				}
				newItem.creators.push({
					firstName: princAuthorFirstName,
					lastName: princAuthorLastName,
					creatorType: "author"
				})
				if (authTypeShort && authTypeShort !== 'aut'){
					let extraTmp = `${princAuthorFirstName} ${princAuthorLastName}${authType?`(${authType})`:''}`
					if (newItem.extra == null){
						newItem.extra = extraTmp
					} else {
						newItem.extra += '\n' + extraTmp;
					}
				}
			}
			//co-authors
			else if (json[i][0] == "028B"){ 
				for (j = 0; j < json[i].length; j++) {
					if (json[i][j] == 'A' || json[i][j] == 'a'){
						var secAuthorLastName = json[i][j+1];
					}
					if (json[i][j] == 'D' || json[i][j] == 'd'){
							var secAuthorFirstName = json[i][j+1];
					}
				}
				newItem.creators.push({
					firstName: secAuthorFirstName,
					lastName: secAuthorLastName,
					creatorType: "author"
				})
			}
			// other people involved (relation specified in one field)
			else if (json[i][0] === "028C" 
				|| json[i][0] === "028G" 
				|| json[i][0].includes("029")){ 
				var contributorFirstName = '';
				var contributorLastName = '';
				var contributorType = 'a';
				console.log("found field");
				for (j = 0; j < json[i].length; j++){
					if (json[i][j] === 'B'){
						contributorType = json[i][j+1];
					}
					if (json[i][j] == 'A' || json[i][j] == 'a'){
						contributorLastName = json[i][j+1];
					}
					if (json[i][j] == 'D' || json[i][j] == 'd'){
						contributorFirstName = json[i][j+1];
						}
					if (json[i][j] == 'F' || json[i][j] == 'f'){
						contributorLastName += json[i][j+1];
						}
					if (contributorLastName !== ''){
						if (json[i][j] === '4'){
							if (json[i][j+1] === "trl"){
								newItem.creators.push({
									firstName: contributorFirstName,
									lastName: contributorLastName,
									creatorType: "translator"
								})
							} else if (json[i][j+1] === "edt" || json[i][j+1] === "isb" ) {
								newItem.creators.push({
									firstName: contributorFirstName,
									lastName: contributorLastName,
									creatorType: "editor"
								})
							} else if (json[i][j+1] === "ctb") {
								newItem.creators.push({
									firstName: contributorFirstName,
									lastName: contributorLastName,
									creatorType: "contributor"
								})
							} else if (json[i][j+1] === "aut") {
								newItem.creators.push({
									firstName: contributorFirstName,
									lastName: contributorLastName,
									creatorType: "author"
								})
							} else { 
								if (newItem.extra == null){
									newItem.extra = contributorFirstName + ' ' + contributorLastName + ' (' + contributorType + ')';
								} else {
									newItem.extra += '\n' + contributorFirstName + ' ' + contributorLastName + ' (' + contributorType + ')';
								}
							}
						}
					}
				}
			}
			else if (json[i][0] === "034D"){ 
				for (j = 0; j < json[i].length; j++){
					if (json[i][j] === 'a') {
						newItem.pages = json[i][j+1];					
					}
				}
			}
		}
	return newItem
}

function generalParser(json, zoterotype, referencingWorkJson) { 
	var notes_lcc = '';
	var notes_ddc = '';
	var notes_bk = '';
	var notes_rvk = '';
	var extraClassDataDict = {};
	var extraClassDataDictKeyList = [];
	var callnumberFound = false;
	var isbnFound = false;
	var isThesis = false;
	var thesisDate = '';
	var thesisInstitution = '';
	var thesisType = '';

	var newItem = new Zotero.Item(zoterotype);

  newItem.author = '';
  for (var i = 0; i < json.length;  i++){
		// title and short title
		if (json[i][0] === "021A"){ 
			for (var j = 0; j < json[i].length; j++){
				if (json[i][j] === 'a') {
					if (zoterotype === 'bookSection'){
						newItem.bookTitle = json[i][j+1].replace('@', '');
					} else {
						newItem.title = json[i][j+1].replace('@', '');// an '@' was put into the database to 
						//mark the first significant word in a title and needs to be erased in translation.
					} 

				} else if (json[i][j] === 'd') {
					if (zoterotype === 'bookSection'){
						newItem.bookTitle += ': ' + json[i][j+1].replace('@', ''); 						
					} else {					
					newItem.shortTitle = newItem.title;
					newItem.title += ': ' + json[i][j+1].replace('@', ''); 
					}
				}
			}
		}
		else if (json[i][0] === "013D"){

			var contentType
			for (j = 0; j < json[i].length; j++){
				if (json[i][j] === 'a') {
					contentType = json[i][j+1];
					break;
				}
			}
			if (contentType) {
				if (!newItem.extra == ''){
					newItem.extra += "\n" + contentType;
				} else{ newItem.extra = contentType;}
			}
		}

		



		//date 
		else if (json[i][0] === "011@"){ 
			for (j = 0; j < json[i].length; j++){
				if (json[i][j] === 'a') {
					newItem.date = json[i][j+1]
				} else if (json[i][j] === 'r') {
					newItem.date === ' [' + json[i][j+1] + ']'
				}
			}
		}

		//isbn 
		else if (json[i][0] === "004A"){ 
			for (j = 0; j < json[i].length; j++){
				if (json[i][j] === '0') {
					if (isbnFound) {
						if (newItem.ISBN.length === 17){ //both isbn-10 and isbn-13 will likely be present in a field with the same name
							// but the goal is to get the newer format of isbn-13 that has 17 characters.
							break;
						}
					}
					newItem.ISBN = ZU.cleanISBN(json[i][j+1]);
					isbnFound = true;				
				}
		}}


		
		//principal authors
		else if (json[i][0] === "028A") {
			for (j = 0; j < json[i].length; j++) {
				if (json[i][j] == 'A' || json[i][j] == 'a'){
					var princAuthorLastName = json[i][j+1];
				}
				if (json[i][j] == 'D' || json[i][j] == 'd'){
					var princAuthorFirstName = json[i][j+1];
				}
				if (json[i][j] == 'B' || json[i][j] == 'b'){
					var authType = json[i][j+1];
				}
				if (json[i][j] == '4'){
					var authTypeShort = json[i][j+1];
				}
			}
			if (zoterotype === "bookSection"){
				newItem.creators.push({
					firstName: princAuthorFirstName,
					lastName: princAuthorLastName,
					creatorType: "bookAuthor"
				})
			} else {
				newItem.creators.push({
					firstName: princAuthorFirstName,
					lastName: princAuthorLastName,
					creatorType: "author"
				})
			}

			if (authTypeShort && authTypeShort !== 'aut'){
				let extraTmp = `${princAuthorFirstName} ${princAuthorLastName}${authType?`(${authType})`:''}`
				if (newItem.extra == null){
					newItem.extra = extraTmp
				} else {
					newItem.extra += '\n' + extraTmp;
				}
			}
		}
		//co-authors
		else if (json[i][0] == "028B"){ 
			for (j = 0; j < json[i].length; j++) {
				if (json[i][j] == 'A' || json[i][j] == 'a'){
					var secAuthorLastName = json[i][j+1];
				}
				if (json[i][j] == 'D' || json[i][j] == 'd'){
						var secAuthorFirstName = json[i][j+1];
				}
			}
			newItem.creators.push({
				firstName: secAuthorFirstName,
				lastName: secAuthorLastName,
				creatorType: "author"
			})
		}
		// other people involved (relation specified in one field)
		else if (json[i][0] === "028C" 
				|| json[i][0] === "028G" 
				|| json[i][0] === "029A" 
				|| json[i][0].includes("029") ){ 
			var contributorFirstName = '';
			var contributorLastName = '';
			var contributorType = '';
			var extraType = false
			for (j = 0; j < json[i].length; j++){
				if (json[i][j] === 'B'){
					contributorType = json[i][j+1];
				}
				if (json[i][j] == 'A' || json[i][j] == 'a'){
					contributorLastName = json[i][j+1];
				}
				if (json[i][j] == 'D' || json[i][j] == 'd'){
					contributorFirstName = json[i][j+1];
					}
				if (json[i][j] == 'F' || json[i][j] == 'f'){
					contributorLastName += json[i][j+1];
					}
				if (contributorLastName !== ''){
					if (json[i][j] === '4'){
						if (json[i][j+1] === "trl"){
							newItem.creators.push({
								firstName: contributorFirstName,
								lastName: contributorLastName,
								creatorType: "translator"
							})
							break;
						} else if (json[i][j+1] === "edt" || json[i][j+1] === "isb" ) {
							newItem.creators.push({
								firstName: contributorFirstName,
								lastName: contributorLastName,
								creatorType: "editor"
							})
							break;
						} else if (json[i][j+1] === "ctb") {
							newItem.creators.push({
								firstName: contributorFirstName,
								lastName: contributorLastName,
								creatorType: "contributor"
							})
							break;
						} else if (json[i][j+1] === "aut") {
							newItem.creators.push({
								firstName: contributorFirstName,
								lastName: contributorLastName,
								creatorType: "author"
							});
							break;
						}
					}  else {
						extraType = true;
					}
				}
			}
			if (extraType) {
			 /* All other contributors will be stored in the extra field with their 
			type of relation to the book specified*/
				let extraTmp = `${contributorFirstName} ${contributorLastName}${contributorType?`(${contributorType})`:''}`
				if (newItem.extra == null){
					newItem.extra = extraTmp
				} else {
					newItem.extra += '\n' + extraTmp;
				}
			}
		}
		
		// publisher and place
		else if (json[i][0] === "033A"){ 
			for (j = 0; j < json[i].length; j++){
				if (json[i][j] === 'p') {
					newItem.place = json[i][j+1];					
				} else if (json[i][j] === 'n') {
					newItem.publisher = json[i][j+1];
				}
			}
		}
		// edition
		else if (json[i][0] === "032@"){ 
			for (j = 0; j < json[i].length; j++){
				if (json[i][j] === 'a') {
					newItem.edition = json[i][j+1];
				}
			}
		}
		// pages
		else if (json[i][0] === "034D"){ 
			for (j = 0; j < json[i].length; j++){
				if (json[i][j] === 'a') {
					newItem.numPages = json[i][j+1];
				}
			}
		}
		// connection to a conference (put to extra field)
		else if (json[i][0] === "030F"){ 
			for (j = 0; j < json[i].length; j++){
				var conference_data = ''
				if (json[i][j] === 'a') {
					conference_data += json[i][j+1];					
				} else if (json[i][j] === 'k') {
					conference_data += ', ' + json[i][j+1];
				} else if (json[i][j] === 'p') {
					conference_data += ', ' + json[i][j+1];
				}
			}
			if (newItem.extra == null){
				newItem.extra = conference_data
			} else {
					newItem.extra += '\n' + conference_data
				}
		}
		//volume & issue -data
		else if (json[i][0] === "036C"){ // for journals, newspapers etc. the data would be found in 031a with info on issue etc.
			var multipleVolumeTitle;
			var volumeNumber;
			for (j = 0; j < json[i].length; j++){
				if (json[i][j] === 'a') {  /*field for the title of the multiple volume book -- as in that cases the title 
					in 21A is only the issue title, the booktitle and shorttitle will be adapted */
					multipleVolumeTitle = json[i][j+1].replace('@', '');	
				} else if (json[i][j] === 'l') {
					volumeNumber = json[i][j+1]; /*By now there's no information available for me on what values will be put 
					in this field by the system, so there won't be any string manipulation */
				}
			}
			newItem.volume = volumeNumber;
			if (newItem.title == null){
				newItem.title = multipleVolumeTitle + ' - ' + volumeNumber;
			} else {
					newItem.shortTitle = newItem.title
					newItem.title = multipleVolumeTitle + ' - ' + volumeNumber + ': ' + newItem.title;
				}


		}
		//series -data
		/*there might be multiple series related to a work insight the data set captured as well in 36E fields,
		as corresponding Zotero fields couldn't capture that, only 036F is used.*/
		else if (json[i][0] === "036F"){ 
			for (j = 0; j < json[i].length; j++){
				if (json[i][j] === 'a') {
					newItem.series = json[i][j+1].replace('@', '');					
				} else if (json[i][j] === 'l') {
					newItem.seriesNumber = json[i][j+1]; /*This field isn't just digits but contains different formats of series numerations
					that aren't specified and sometimes contain additional information. Therefore no further processing is done. */
				}
			}
			
		}
		//thesis
		else if (json[i][0] === "037C"){ 
			for (j = 0; j < json[i].length; j++){
				if (json[i][j] === 'd') {
					thesisType = json[i][j+1];
					isThesis = true;				
				} else if (json[i][j] === 'e') {
					thesisInstitution = json[i][j+1];
				} else if (json[i][j] === 'f') {
					thesisDate = json[i][j+1];
				} else if (json[i][j] === 'a') {
					var unspecifiedThesisData = json[i][j+1];
				} else if (json[i][j] === 'b') {
					var unspecifiedThesisDataPlace = json[i][j+1].replace('@', '');
				} 
			}
			if (isThesis) {
				if (newItem.extra == null){
					newItem.extra = thesisType + ' (' + thesisInstitution + ", " + thesisDate + ')';
				} else {
					newItem.extra += '\n' + thesisType + ' (' + thesisInstitution + ", " + thesisDate + ')';
				}
			} else {
				if (newItem.extra == null){
					newItem.extra = unspecifiedThesisDataPlace + ', ' + unspecifiedThesisData;
				} else {
					newItem.extra += '\n' + unspecifiedThesisDataPlace + ', ' + unspecifiedThesisData;
				}
			}
		}
		// Content description
		else if (json[i][0] === "047I"){
			for (j = 0; j < json[i].length; j++){
				if (json[i][j] === 'a') {
					if (newItem.extra != null){
						newItem.extra += "\n" + json[i][j + 1];
					} else{
						newItem.extra = json[i][j + 1];
					}
				}
			}
		}
		
		// annotations
		else if (json[i][0] === "037A"){
			for (j = 0; j < json[i].length; j++){
				if (json[i][j] === 'a') {
					if (newItem.extra != null){
						newItem.extra += "\n" + json[i][j + 1];
					} else{
						newItem.extra = json[i][j + 1];
					}
				}
			}
		}


		//Signature - library-catalog
		else if (json[i][0] === "209A" & !callnumberFound){
			for (j = 0; j < json[i].length; j++){
				if (json[i][j] === 'a') {
					newItem.callNumber = json[i][j+1];
					callnumberFound = true
					break;
				}
			}
			newItem.libraryCatalog = 'Stabikat'
		}
		// Classification-Data (in an note)

		/*Getting classification data of different library classification systems in a csv format*/
		//LCC-classification - not necessarily present in the data
		else if (json[i][0] === "045A"){ 
			for (j = 0; j < json[i].length; j++){
				if (json[i][j] === 'a') {
					if (notes_lcc !== ''){
						notes_lcc += ', ';
					}
					notes_lcc += "'" + json[i][j+1] + "'";
				}
			}
		}
		// different 045*-fields containing other classification data are left out to concentrate on the more relevant.
		
		// DDC-Notation
		//there are two fields for ddc-notation 045F and 045H
		else if (json[i][0] === "045F"){ 
			for (j = 0; j < json[i].length; j++){
				if (json[i][j] === 'a') {
					if (notes_ddc !== ''){
						notes_ddc += ', ';
					}
					notes_ddc += "'" + json[i][j+1] + "'";
				}
			}
		}
		else if (json[i][0] === "045H"){ 
			for (j = 0; j < json[i].length; j++){
				if (json[i][j] === 'a') {
					if (notes_ddc !== ''){
						notes_ddc += ', ';
					}
					notes_ddc += "'" + json[i][j+1] + "'";
				}
			}
		}
		// BK (Basisklassifikation)
		else if (json[i][0] === "045Q"){ 
			for (j = 0; j < json[i].length; j++){
				if (json[i][j] === 'a') {
					if (notes_bk !== ''){
						notes_bk += ', ';
					}
					notes_bk += "'" + json[i][j+1] + "'";
				}
			}
		}
		// RVK
		else if (json[i][0] === "045R"){ 
			for (j = 0; j < json[i].length; j++){
				if (json[i][j] === 'a') {
					if (notes_rvk !== ''){
						notes_rvk += ', ';
					}
					notes_rvk += "'" + json[i][j+1] + "'";
				}
			}
		}
		// other Classification-Systems stored with specific keys
		else if (json[i][0] === "045X"){ 
			for (j = 0; j < json[i].length; j++){
				if (json[i][j] === 'i' || json[i][j] === 'b') {
					var presKey = "'" + json[i][j+1] + "'";
					if (extraClassDataDict[presKey] == null)  {
						extraClassDataDict[presKey] = [];
						extraClassDataDictKeyList[extraClassDataDictKeyList.length] = presKey;
					}	
				} else if (json[i][j] === 'a') {
					extraClassDataDict[presKey][extraClassDataDict[presKey].length] = json[i][j + 1];
				}
			}
		}
	}
  
	var classificationNote = `${notes_lcc? `LCC: ${notes_lcc}\n` : ''}${notes_ddc? `DDC: ${notes_ddc}\n` : ''}${notes_bk? `BK: ${notes_bk}\n` : ''} ${notes_rvk? `RVK: ${notes_rvk}\n` : ''}`
	for (i = 0; i < extraClassDataDictKeyList.length; i++) {
		tmp = `${extraClassDataDictKeyList[i]} ${JSON.stringify(extraClassDataDict[extraClassDataDictKeyList[i]])}`
		clasificationNote = classificationNote? `${classificationNote}\n${tmp}` : tmp 
	}
  
	newItem.notes.push({
		note:classificationNote,
		title:"Classification Data"
	});
	console.log(zoterotype)
	switch(zoterotype){
		case 'bookSection':
		case 'article':
			console.log("before articleparse", referencingWorkJson);
			if (referencingWorkJson) {
				newItem = articleParse(referencingWorkJson, newItem);
			}
			return newItem
		case 'film':
			newItem = filmParse(json, newItem);
			return newItem
		case 'audioRecording':
			newItem = audioParse(json, newItem);
			return newItem
		case 'map':
			newItem = mapParse(json, newItem);
			return newItem
		case 'music':
			newItem = musicParse(json, newItem);
			return newItem
		case "artwork":
			newItem = artParse(json, newItem)
			return newItem
		case "manuscript":
			newItem = manuscriptParse(json, newItem)
			return newItem
		default:
			return newItem
	}


}

function artParse(json, newItem){
	for (var i = 0; i < json.length; i++){
		// description of the specimen
		if (json[i][0] === "034I"){
			for (var j = 0; j < json[i].length; j++){
				if (json[i][j] === 'a') {
						newItem.artworkSize = json[i][j + 1];
				}
			}		
		} 	else if (json[i][0] === "237A"){
			for (j = 0; j < json[i].length; j++){
				if (json[i][j] === 'a') {
					if (newItem.extra != null){
						newItem.extra += "\n" + json[i][j + 1];
					} else{
						newItem.extra = json[i][j + 1];
					}
				}
			}
		} else if (json[i][0] === "002E"){
			for (j = 0; j < json[i].length; j++){
				if (json[i][j] === 'a') {
						newItem.artworkMedium = json[i][j + 1];
				}
			}
		}
  }
  return newItem
}

function filmParse(json, newItem){
	for (var i = 0; i < json.length; i++){
		if (json[i][0] === "002E"){
			for (var j = 0; j < json[i].length; j++){
				if (json[i][j] === 'a') {
						newItem.videoRecordingFormat = json[i][j + 1];
				}
			}
		}
  }
  return newItem
}

function audioParse(json, newItem){
  return newItem
}

function mapParse(json, newItem){
  return newItem
}

function musicParse(json, newItem){
  return newItem
}

function manuscriptParse(json, newItem){
  return newItem
}

