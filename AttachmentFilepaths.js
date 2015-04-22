{
	"translatorID": "e7eb5c9d-d90d-40c4-98a6-a943529ad23e",
	"label": "Attachment Filepaths",
	"creator": "Jacob Levernier, editing work by Philipp Zumstein and Aurimas Vinckevicius",
	"target": "txt",
	"minVersion": "1.0",
	"maxVersion": "",
	"priority": 100,
	"displayOptions": {
		"exportCharset": "UTF-8xBOM",
		"Only Export Paths of Plaintext Files": false,
		"Export All Filepaths on One Line": false
	},
	"inRepository": true,
	"translatorType": 2,
	"browserSupport": "g",
	"lastUpdated": "2015-04-22 18:40:31"
}

/*
	This export translator is based on the CSV.js Zotero translator (v3.0) by Philipp Zumstein and Aurimas Vinckevicius. Like the CSV translator, is it licensed under the AGPLv3 (or any later version).

    ***** BEGIN LICENSE BLOCK *****
	Copyright 2015 Jacob Levernier
    Copyright 2014 Philipp Zumstein, Aurimas Vinckevicius
	
    This file is part of Zotero.
    Zotero is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
    Zotero is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.  You should have received a copy of the GNU Affero General Public License along with Zotero. If not, see <http://www.gnu.org/licenses/>.
    ***** END LICENSE BLOCK *****
*/

// The list of file extensions that are whitelisted if "Only Export Paths of Plaintext Files" is checked: 
// NOTE: These should all be lowercase, without a leading dot (e.g., "txt" instead of ".TXT")
var plainTextFileExtensions = [
	"txt",
	"mkd",
	"md",
	"markdown",
	"rmkd",
	"rmd",
	"rmarkdown",
	"rst"
];

var fieldWrapperCharacter = '"';

// If we've been told to export everything on one line, we'll separate each value (i.e., each path within a given Zotero record) and each record (i.e., going from one Zotero record to another) with a space. Otherwise, we'll use a newline ('\n'):
var exportAllFilepathsOnOneLine;
exportAllFilepathsOnOneLine = Zotero.getOption("Export All Filepaths on One Line");

if(exportAllFilepathsOnOneLine == false){
	var recordDelimiter = "\n",
		valueSeparator = "\n";
} else {
	var recordDelimiter = " ",
		valueSeparator = " ";
};

// Exported columns in order of export
var exportedFields = [
	"attachments/path",
	"attachments/url"
];

var onlyExportPlainTextFiles;
function doExport() {
	onlyExportPlainTextFiles = Zotero.getOption("Only Export Paths of Plaintext Files");
	var item, line;
	while (item = Zotero.nextItem()) {
		line = '';
		for (var i=0; i<exportedFields.length; i++) {
			lineValue = getValue(item, exportedFields[i]);
			if(lineValue != ""){ // If there's anything new to write...
				line += lineValue + recordDelimiter;
			}
		}
		Zotero.write(line);
	}
}

function getValue(item, field) {
	var split = field.split('/');
	var value = ""; // Create a blank variable; we'll fill it in below.
	if((split[0]) == 'attachments') {
		var paths = [];
		for (var i=0; i<item.attachments.length; i++) {
			if (split[1] == 'path') {
				var fileExtension = item.attachments[i].localPath.split('.').pop(); // THIS LINE SEEMS TO CAUSE AN ERROR.
				if(onlyExportPlainTextFiles == false || (onlyExportPlainTextFiles == true && plainTextFileExtensions.indexOf(fileExtension.toLowerCase()) > -1)){ // If we've been told to only export plaintext files, then we check here whether the file extension is in the list of plain text extensions. If it is, or if we can export all files...
	    			paths.push(fieldWrapperCharacter + item.attachments[i].localPath + fieldWrapperCharacter); // Export the file path.
				}
			} else if (split[1] == 'url' && !item.attachments[i].localPath) {
				paths.push(fieldWrapperCharacter + item.attachments[i].url + fieldWrapperCharacter);
			}
		}
		if(paths.length > 0){ // Only add the valueSeparator if there's something new to add it for (Lacking this, you might end up with, e.g., a lot of extra newlines when just exporting plaintext notes).
			value += paths.join(valueSeparator);
		};
	}
	return value;
}
