{
	"translatorID": "25f4c5e2-d790-4daa-a667-797619c7e2f2",
	"label": "CSV",
	"creator": "Philipp Zumstein",
	"target": "csv",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"displayOptions": {
		"exportCharset": "UTF-8"
	},
	"inRepository": true,
	"translatorType": 2,
	"browserSupport": "gcs",
	"lastUpdated": "2014-07-06 16:50:51"
}

//The export will be stucked if you try to export to a csv-file
//which is already opend with Excel. Thus, close it before or rename
//the new csv-file.

var recordsDeliminator = "\n";
var fieldsDeliminator = ",";
var fieldWrapperCharacter = '"';

function exclude(field) {
	return false;//standard configuration: exclude no fields
	
	//change for non-standard configuration, e.g.
	//return  field == 'notes' || field == 'attachments' || field == 'tags' || field == 'related' || 
	//		field == 'seeAlso' || field == 'uniqueFields' ||
	//		/creators\/\d+\/fieldMode/g.test(field);
}


var item;
var overallStructure;
var positionToInsertNext;


//export the content of a field
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


//parse the object item (with possible previous path prevPath)
//adjust the overallStructure, i.e. import new column names if needed
//(function is recursive)
function parseObject(item, prevPath) {
	if (item == undefined) {
		return false;
	}
    var keys = Object.keys(item);
	
    for (var i = 0; i < keys.length; i++) {
		if (prevPath == "") {
			currentFieldName = keys[i];
		} else {
			currentFieldName = prevPath+"/"+keys[i];
		}
		
		if (exclude(currentFieldName)) {
			continue;//with next element in for-loop
		}
		
        if (typeof item[keys[i]] === 'object') {
		
			for (var j = 0; j < overallStructure.length; j++) {
				if ( overallStructure[j].startsWith( currentFieldName ) ) {
					positionToInsertNext = j+1;
				}
			}

			parseObject(item[keys[i]], currentFieldName);
		} else {
			var indexOverallStructure = overallStructure.indexOf(currentFieldName);
			if (indexOverallStructure == -1 ) {
				overallStructure.splice(positionToInsertNext, 0, currentFieldName);//splice works also if positionToInsertNext is equal to the length of the array
				positionToInsertNext++;
			} else {
				positionToInsertNext = indexOverallStructure+1;
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
		
		positionToInsertNext = 0;//oldIndex
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