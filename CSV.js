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
	"lastUpdated": "2014-07-17 22:51:51"
}

//The export will be stucked if you try to export to a csv-file
//which is already opend with Excel. Thus, close it before or rename
//the new csv-file.

var recordsDeliminator = "\n";
var fieldsDeliminator = ",";
var fieldWrapperCharacter = '"';

var singleFieldsForExport = [
	'key',
	'itemType',
	'dateAdded',
	'dateModified',
	'uniqueFields/title',
	'uniqueFields/abstractNote',
	'uniqueFields/medium',
	'uniqueFields/artworkSize',
	'uniqueFields/reporter',
	'uniqueFields/publicationTitle',
	'uniqueFields/conferenceName',
	'uniqueFields/type',
	'uniqueFields/scale',
	'uniqueFields/series',
	'uniqueFields/seriesTitle',
	'uniqueFields/version',
	'uniqueFields/seriesText',
	'uniqueFields/journalAbbreviation',
	'uniqueFields/seriesNumber',
	'uniqueFields/volume',
	'uniqueFields/court',
	'uniqueFields/number',
	'uniqueFields/filingDate',
	'uniqueFields/issue',
	'uniqueFields/pages',
	'uniqueFields/applicationNumber',
	'uniqueFields/priorityNumbers',
	'uniqueFields/history',
	'uniqueFields/numberOfVolumes',
	'uniqueFields/edition',
	'uniqueFields/place',
	'uniqueFields/country',
	'uniqueFields/assignee',
	'uniqueFields/issuingAuthority',
	'uniqueFields/meetingName',
	'uniqueFields/publisher',
	'uniqueFields/programmingLanguage',
	'uniqueFields/date',
	'uniqueFields/references',
	'uniqueFields/legalStatus',
	'uniqueFields/runningTime',
	'uniqueFields/system',
	'uniqueFields/section',
	'uniqueFields/numPages',
	'uniqueFields/language',
	'uniqueFields/DOI',
	'uniqueFields/ISSN',
	'uniqueFields/ISBN',
	'uniqueFields/shortTitle',
	'uniqueFields/url',
	'uniqueFields/mimeType',
	'uniqueFields/charset',
	'uniqueFields/accessDate',
	'uniqueFields/archive',
	'uniqueFields/archiveLocation',
	'uniqueFields/libraryCatalog',
	'uniqueFields/callNumber',
	'uniqueFields/rights',
	'uniqueFields/extra',
	'uniqueFields/note',
	];

//It is possible to disable some multiple fields from the export.
//just set the corresponding flag below to false.
var multipleFieldsForExport = {'creators' : true, 'tags' : true, 'notes' : true, 'attachments' : true};

//list of all creator types in some order
var creatorsType = ['author', 'contributor', 'editor', 'bookAuthor', 'seriesEditor', 'translator',
					'reviewedAuthor', 'artist', 'performer', 'composer', 'wordsBy',
					'sponsor', 'cosponsor', 'commenter', 'counsel', 'programmer', 'recipient', 
					'director', 'producer', 'scriptwriter', 'interviewee', 'interviewer',
					'cartographer', 'inventor', 'attorneyAgent', 'podcaster', 'guest',
					'presenter', 'castMember'];

var item;


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



function doExport() {
	
	//write header line
	for (var i=0; i<singleFieldsForExport.length; i++) {
		var name = singleFieldsForExport[i];
		var nameArray = name.split("/");
		name = nameArray[nameArray.length-1];
		exportField(name);
	}
	exportField('tagsOwn');
	exportField('tagsAutomatic');
	exportField('notes');
	exportField('attachements');
	for (var c=0; c<creatorsType.length; c++) {
		exportField(creatorsType[c]);
	}
	
	Zotero.write(recordsDeliminator);
	
	//writing data for each item
	while (item = Zotero.nextItem()) {
		//go over all single fields
		for (var j=0; j<singleFieldsForExport.length; j++){
			var field = singleFieldsForExport[j];
			var content = evaluate(item, field);
			exportField(content);
		}
		//tags fields
		if (multipleFieldsForExport['tags']) {
			var tagsObject = evaluate(item, 'tags');
			var contentArray = [ [], [] ];
			for (var k=0; k<tagsObject.length; k++) {
				var test = evaluate(item, 'tags/' + k + '/type');
				contentArray[test].push( evaluate(item, 'tags/' + k + '/tag') );//Is tags/0/tag = tags/0/fields/name ?
			}
			exportField( contentArray[0].join(";") );
			exportField( contentArray[1].join(";") );
		}
		//notes fields
		if (multipleFieldsForExport['notes']) {
			var noteObject = evaluate(item, 'notes');
			var contentArray = [];
			for (var k=0; k<noteObject.length; k++) {
				contentArray.push( evaluate(item, 'notes/' + k + '/note') );
			}
			exportField( contentArray.join("\n") );//? TODO change to something?
		}
		//attachements fields
		if (multipleFieldsForExport['attachments']) {
			var attObject = evaluate(item, 'attachments');
			var contentArray = [];
			for (var k=0; k<attObject.length; k++) {
				contentArray.push( evaluate(item, 'attachments/' + k + '/url') );
			}
			exportField( contentArray.join(' ') );
		}
		//creators fields
		if (multipleFieldsForExport['creators']) {
			//initialize data structure
			var contentCreators = {};
			for (var index=0; index<creatorsType.length; index++) {
				contentCreators[ creatorsType[index] ] = [];
			}
			//fill in all data into contentCreators
			var creatorsObject = evaluate(item, 'creators');
			for (var k=0; k<creatorsObject.length; k++) {
				var creatorType = evaluate(item, 'creators/' + k + '/creatorType');
				var creatorLastName = evaluate(item, 'creators/' + k + '/lastName');
				var creatorFirstName = evaluate(item, 'creators/' + k + '/firstName');
				var creatorFieldMode = evaluate(item, 'creators/' + k + '/fieldMode');
				if (creatorFieldMode == "") {
					contentCreators[ creatorType ].push( creatorLastName +', ' + creatorFirstName );
				} else {
					contentCreators[ creatorType ].push( creatorLastName );
				}
			}
			//export
			for (var index=0; index<creatorsType.length; index++) {
				var contentArray = contentCreators[ creatorsType[index] ];
				if (contentArray.length > 0) {
					exportField( contentArray.join(';') );
				} else {
					exportField('');
				}
			}
		}
		

		
		Z.debug(item);
	

		Zotero.write(recordsDeliminator);
	}

}