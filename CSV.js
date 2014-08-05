{
	"translatorID": "25f4c5e2-d790-4daa-a667-797619c7e2f2",
	"label": "CSV",
	"creator": "Philipp Zumstein",
	"target": "csv",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"displayOptions": {
		"exportCharset": "UTF-8xBOM"
	},
	"inRepository": true,
	"translatorType": 2,
	"browserSupport": "gcs",
	"lastUpdated": "2014-08-03 09:25:17"
}

//The export will be stucked if you try to export to a csv-file
//which is already opend with Excel. Thus, close it before or rename
//the new csv-file.

var recordsDelimiter = "\n";
var fieldsDelimiter = ",";
var fieldWrapperCharacter = '"';


//order of the exported fields which are
//either single fields e.g. 'uniqueFields/title'
//or calculated from the other fields and then
//starts with >, e.g. '>author'
var exportConfiguration = [
	'itemType',
	'>publicationYear',
	'>author',//all creator fields with base type author
	'uniqueFields/title',
	'uniqueFields/publicationTitle',
	'uniqueFields/ISBN',
	'uniqueFields/ISSN',
	'uniqueFields/DOI',
	'uniqueFields/url',
	'uniqueFields/abstractNote',
	'dateAdded',
	'dateModified',
	'>tagsOwn',
	'>tagsAutomatic',
	//the remaining fields are in alphabetical order:
	'uniqueFields/accessDate',
	'uniqueFields/applicationNumber',
	'uniqueFields/archive',
	'uniqueFields/archiveLocation',
	'uniqueFields/artworkSize',
	'uniqueFields/assignee',
	'>attachments',
	'>attorneyAgent',
	'>bookAuthor',
	'uniqueFields/callNumber',
	'>castMember',
	'uniqueFields/charset',
	'>commenter',
	'>composer',
	'uniqueFields/conferenceName',
	'>contributor',
	'>cosponsor',
	'>counsel',
	'uniqueFields/country',
	'uniqueFields/court',
	'uniqueFields/date',
	'uniqueFields/edition',
	'>editor',
	'uniqueFields/extra',
	'uniqueFields/filingDate',
	'>guest',
	'uniqueFields/history',
	'>interviewer',
	'uniqueFields/issue',
	'uniqueFields/issuingAuthority',
	'uniqueFields/journalAbbreviation',
	'key',
	'uniqueFields/language',
	'uniqueFields/legalStatus',
	'uniqueFields/libraryCatalog',
	'uniqueFields/medium',
	'uniqueFields/meetingName',
	'uniqueFields/mimeType',
	'uniqueFields/note',
	'>notes',
	'uniqueFields/numPages',
	'uniqueFields/number',
	'uniqueFields/numberOfVolumes',
	'uniqueFields/pages',
	'uniqueFields/place',
	'uniqueFields/priorityNumbers',
	'>producer',
	'uniqueFields/programmingLanguage',
	'uniqueFields/publisher',
	'>recipient',
	'uniqueFields/references',
	'uniqueFields/reporter',
	'>reviewedAuthor',
	'uniqueFields/rights',
	'uniqueFields/runningTime',
	'uniqueFields/scale',
	'>scriptwriter',
	'uniqueFields/section',
	'uniqueFields/series',
	'>seriesEditor',
	'uniqueFields/seriesNumber',
	'uniqueFields/seriesText',
	'uniqueFields/seriesTitle',
	'uniqueFields/shortTitle',
	'uniqueFields/system',
	'>translator',
	'uniqueFields/type',
	'uniqueFields/version',
	'uniqueFields/volume',
	'>wordsBy'
];

var item;
var lastField = false;

//export the content of a field
function exportField(content) {
	Zotero.write(fieldWrapperCharacter);
	if (content != undefined && content != '') {
		if (typeof content === 'string') {//replace don't work on numbers e.g. itemID
			//content = content.replace(new RegExp(recordsDelimiter, 'g') , " ");//may be useful if line breaks in fields in csv are not working correctly for the further computation
			content = content.replace(new RegExp(fieldWrapperCharacter, 'g') , fieldWrapperCharacter+fieldWrapperCharacter);//"If double-quotes are used to enclose fields, then a double-quote appearing inside a field must be escaped by preceding it with another double quote." cf. http://tools.ietf.org/html/rfc4180#section-2
		}
		Zotero.write( content );
	}
	Zotero.write(fieldWrapperCharacter);
	if (!lastField) {
		Zotero.write(fieldsDelimiter);
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
	for (var i=0; i<exportConfiguration.length; i++) {
		if (i == exportConfiguration.length-1) {
			lastField = true;
		}
		var name = exportConfiguration[i];
		var nameArray = name.split("/");
		name = nameArray[nameArray.length-1];
		exportField(name.replace('>',''));
	}
	Zotero.write(recordsDelimiter);
	
	while (item = Zotero.nextItem()) {
		//prepare an object for tags:
		var tagsObject = evaluate(item, 'tags');
		var tagsContentArray = [ [], [] ];
		for (var k=0; k<tagsObject.length; k++) {
			var test = tagsObject[k].type;
			tagsContentArray[test].push( tagsObject[k].tag );
		}
		//prepare an object for notes:
		var noteObject = evaluate(item, 'notes');
		var noteContentArray = [];
		for (var k=0; k<noteObject.length; k++) {
			noteContentArray.push( noteObject[k].note );
		}
		//prepare an object for attachments:
		var attObject = evaluate(item, 'attachments');
		var attContentArray = [];
		for (var k=0; k<attObject.length; k++) {
			attContentArray.push( attObject[k].url );
		}
		//prepare an object for creators:
		//  initialize data structure with all possible creatorTypes
		var contentCreators = {
			'artist' : [],
			'attorneyAgent' : [],
			'author' : [],
			'bookAuthor' : [],
			'cartographer' : [],
			'castMember' : [],
			'commenter' : [],
			'composer' : [],
			'contributor' : [],
			'cosponsor' : [],
			'counsel' : [],
			'director' : [],
			'editor' : [],
			'guest' : [],
			'interviewee' : [],
			'interviewer' : [],
			'inventor' : [],
			'performer' : [],
			'podcaster' : [],
			'presenter' : [],
			'producer' : [],
			'programmer' : [],
			'recipient' : [], 
			'reviewedAuthor' : [],
			'scriptwriter' : [],
			'seriesEditor' : [],
			'sponsor' : [],
			'translator' : [],
			'wordsBy' : []
		};
		//  fill in all data into contentCreators object
		var creatorsObject = evaluate(item, 'creators');
		for (var k=0; k<creatorsObject.length; k++) {
			var creator = creatorsObject[k];
			if (!creator.fieldMode) {//0 for last, first ; 1 for institutional authors
				contentCreators[ creator.creatorType ].push( creator.lastName +', ' + creator.firstName );
			} else {
				contentCreators[ creator.creatorType ].push( creator.lastName );
			}
		}
		
		lastField = false;
		//go over all fields
		for (var j=0; j<exportConfiguration.length; j++){
			if (j == exportConfiguration.length-1) {
				lastField = true;
			}
			
			var field = exportConfiguration[j];
			if (field.indexOf('>') == -1) {//single fields to export
				var content = evaluate(item, field);
				exportField(content);
			} else {//calculated fields to export
				var fieldName = field.substr(1);
				switch(fieldName) {
					case 'publicationYear':
						var date = ZU.strToDate(item.date);
						exportField( date.year );
						break;
					case 'tagsOwn':
						exportField( tagsContentArray[0].join(";") );
						break;
					case 'tagsAutomatic':
						exportField( tagsContentArray[1].join(";") );
						break;
					case 'notes':
						exportField( noteContentArray.join("\n") );
						break;
					case 'attachments':
						exportField( attContentArray.join(' ') );
						break;
					
					case 'author':
						var contentArray = contentCreators[ 'author' ].concat(
											contentCreators[ 'artist' ], 
											contentCreators[ 'performer' ], 
											contentCreators[ 'sponsor' ], 
											contentCreators[ 'programmer' ], 
											contentCreators[ 'director' ], 
											contentCreators[ 'interviewee' ], 
											contentCreators[ 'cartographer' ], 
											contentCreators[ 'inventor' ], 
											contentCreators[ 'podcaster' ],  
											contentCreators[ 'presenter' ] 
											);
						if (item.itemType == 'hearing') {
							contentArray = contentArray.concat(contentCreators[ 'contributor' ]);
						}
						exportField( contentArray.join(';') );
						break;
					case 'contributor':
					case 'editor':
					case 'bookAuthor':
					case 'seriesEditor':
					case 'translator':
					case 'reviewedAuthor':
					case 'composer':
					case 'wordsBy':
					case 'cosponsor':
					case 'commenter':
					case 'counsel':
					case 'recipient':
					case 'producer':
					case 'scriptwriter':
					case 'interviewer':
					case 'attorneyAgent':
					case 'guest':
					case 'castMember':
						var contentArray = contentCreators[ fieldName ];
						exportField( contentArray.join(';') );
						break;
				}
			}
		}
		
		Zotero.write(recordsDelimiter);
	}

}