{
	"translatorID": "25f4c5e2-d790-4daa-a667-797619c7e2f2",
	"label": "CSV",
	"creator": "Philipp Zumstein",
	"target": "csv",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"displayOptions": {
		"exportCharset": "UTF-8",
		"Export Creators" : true,
		"exportNotes": false,
		"Export Attachements": false,
		"Export Tags" : false,
		"Export Related" : false,
		"Export SeeAlso" : false,
		"Export UniqueFields" : false
	},
	"inRepository": true,
	"translatorType": 2,
	"browserSupport": "gcs",
	"lastUpdated": "2014-07-07 23:31:51"
}

//The export will be stucked if you try to export to a csv-file
//which is already opend with Excel. Thus, close it before or rename
//the new csv-file.

var recordsDeliminator = "\n";
var fieldsDeliminator = ",";
var fieldWrapperCharacter = '"';

var item;
var overallStructure;
var oldIndex;

//exclude some fields from export
//theoretical it is also possible to
//exclude some path like creators/0/fieldMode
function exclude(field) {
	var excludeCreators = !(Zotero.getOption("Export Creators"));
	var excludeNotes = !(Zotero.getOption("exportNotes"));
	var excludeAttachements = !(Zotero.getOption("Export Attachements"));
	var excludeTags = !(Zotero.getOption("Export Tags"));
	var excludeRelated = !(Zotero.getOption("Export Related"));
	var excludeSeeAlso = !(Zotero.getOption("Export SeeAlso"));
	var excludeUniqueFields = !(Zotero.getOption("Export UniqueFields"));
	return  (field == 'creators' && excludeCreators) ||
			(field == 'notes' && excludeNotes) || 
			(field == 'attachments' && excludeAttachements) || 
			(field == 'tags' && excludeTags) || 
			(field == 'related' && excludeRelated) || 
			(field == 'seeAlso' & excludeSeeAlso) || 
			(field == 'uniqueFields' && excludeUniqueFields);
}

/*
function escapeString(text) {
	if (typeof text === 'string') {//replace don't work on numbers e.g. itemID
		text = text.replace(new RegExp(recordsDeliminator, 'g') , " ");// /\r?\n|\r/g
		text = text.replace(new RegExp(fieldWrapperCharacter, 'g') , fieldWrapperCharacter+fieldWrapperCharacter);//Wenn der Feldbegrenzer selbst in den Daten enthalten ist, wird dieser im Datenfeld verdoppelt http://de.wikipedia.org/wiki/CSV_%28Dateiformat%29
	}
	return text;
}
*/

function exportField(content) {
	if (content == undefined) {
		Zotero.write(fieldWrapperCharacter + fieldWrapperCharacter + fieldsDeliminator);
	} else {
		Zotero.write(fieldWrapperCharacter);
		if (typeof content === 'string') {//replace don't work on numbers e.g. itemID
			content = content.replace(new RegExp(recordsDeliminator, 'g') , " ");// /\r?\n|\r/g
			content = content.replace(new RegExp(fieldWrapperCharacter, 'g') , fieldWrapperCharacter+fieldWrapperCharacter);//Wenn der Feldbegrenzer selbst in den Daten enthalten ist, wird dieser im Datenfeld verdoppelt http://de.wikipedia.org/wiki/CSV_%28Dateiformat%29
		}
		Zotero.write( content );
		Zotero.write(fieldWrapperCharacter + fieldsDeliminator);
	}
}


//evaluates the obj (e.g. item) on some path (e.g. creators/0/firstName)
function evaluate(obj, path) {
	if (obj == undefined || path.length == 0) {
		return undefined;
	}
	var splitPos = path.indexOf("/");
	if (splitPos == -1) {
		return obj[path];
	} else {
		var newObj = obj[path.substring(0,splitPos)];
		var newPath = path.substring(splitPos+1);
		return evaluate(newObj, newPath);
	}
}


function parseObject(item, fieldName) {
	if (item == undefined) {
		return false;
	}
    var keys = Object.keys(item);
	
    for (var i = 0; i < keys.length; i++) {
		currentFieldName = fieldName+keys[i]+"/";
		if (exclude(currentFieldName.substring(0, currentFieldName.length -1))) {
			continue;//with next element in for-loop
		}
		
        if (typeof item[keys[i]] === 'object') {
			var indexOverallStructure = overallStructure.lastIndexOf( currentFieldName.substring(0, currentFieldName.length-1) );
			if (indexOverallStructure != -1 ) {
				oldIndex = indexOverallStructure;
			}
			parseObject(item[keys[i]], currentFieldName);
		} else {
			currentFieldName = currentFieldName.substring(0, currentFieldName.length-1);//delete last slash
			var indexOverallStructure = overallStructure.indexOf(currentFieldName);
			if (indexOverallStructure == -1 ) {
				overallStructure.splice(oldIndex, 0, currentFieldName);
				oldIndex++;
			} else {
				oldIndex = indexOverallStructure;
			}
		}
    }
}


function doExport() {
	
	//filling up the overallStructure and saving items in itemList
	overallStructure = new Array();
	var itemList = new Array();
	while (item = Zotero.nextItem()) {
		itemList.push(item);
		
		oldIndex = 0;//, oldIndex
		parseObject( item, "" );//call function with possible recursion
		
	}
	Z.debug("overallStructure"); Z.debug(overallStructure);
	
	//write header line
	for (var i=0; i<overallStructure.length; i++) {
		exportField(overallStructure[i]);
	}
	Zotero.write(recordsDeliminator);
	
	//writing data for each item
	for (var j=0; j<itemList.length; j++) {
		item = itemList[j];
		for (var i=0; i<overallStructure.length; i++) {
			var content = evaluate(item, overallStructure[i]);
			exportField(content);
		}
		
		Zotero.write(recordsDeliminator);
	}

}