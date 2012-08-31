{
  "translatorID": "32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7",
  "label": "RIS",
  "creator": "Simon Kornblith and Aurimas Vinckevicius",
  "target": "ris",
  "minVersion": "2.1.9",
  "maxVersion": "",
  "priority": 100,
  "displayOptions": {
    "exportCharset": "UTF-8",
    "exportNotes": true
  },
  "inRepository": true,
  "translatorType": 3,
  "browserSupport": "gcsv",
  "lastUpdated": "2012-08-31 02:01:41"
}

function detectImport() {
  var line;
  var i = 0;
  while((line = Zotero.read()) !== false) {
  line = line.replace(/^\s+/, "");
  if(line != "") {
    if(line.substr(0, 6).match(/^TY {1,2}- /)) {
    return true;
    } else {
    if(i++ > 3) {
      return false;
    }
    }
  }
  }
}

/************************
 * TY <-> itemType maps *
 ************************/

var DEFAULT_EXPORT_TYPE = 'GEN';
var DEFAULT_IMPORT_TYPE = 'journalArticle';

var exportTypeMap = {
  artwork:"ART",
  audioRecording:"SOUND", //consider MUSIC
  bill:"BILL",
  blogPost:"BLOG",
  book:"BOOK",
  bookSection:"CHAP",
  "case":"CASE",
  computerProgram:"COMP",
  conferencePaper:"CONF",
  dictionaryEntry:"DICT",
  encyclopediaArticle:"ENCYC",
  email:"ICOMM",
  film:"MPCT",
  hearing:"HEAR",
  journalArticle:"JOUR",
  letter:"PCOMM",
  magazineArticle:"MGZN",
  manuscript:"MANSCPT",
  map:"MAP",
  newspaperArticle:"NEWS",
  patent:"PAT",
  presentation:"SLIDE",
  report:"RPRT",
  statute:"STAT",
  thesis:"THES",
  videoRecording:"VIDEO",
  webpage:"ELEC"
};

//These export type maps are degenerate
//They will cause loss of information when exported and reimported
//These should either be duplicates of some of the RIS types above
//  or be different from the importTypeMap mappings
var degenerateExportTypeMap = {
  interview:"PCOMM",
  instantMessage:"ICOMM",
  forumPost:"ICOMM",
  tvBroadcast:"MPCT",
  radioBroadcast:"SOUND",
  podcast:"SOUND",
  document:"GEN"  //imported as journalArticle
};

//These are degenerate types that are not exported as the same TY value
//These should not include any types from exportTypeMap
//We add the rest from exportTypeMap
var importTypeMap = {
  ABST:"journalArticle",
  ADVS:"film",
  AGGR:"document",  //how can we handle "database" citations?
  ANCIENT:"document",
  CHART:"artwork",
  CLSWK:"book",
  CPAPER:"conferencePaper",
  CTLG:"magazineArticle",
  DATA:"document",  //dataset
  DBASE:"document", //database
  EBOOK:"book",
  ECHAP:"bookSection",
  EDBOOK:"book",
  EJOUR:"journalArticle",
  EQUA:"document",  //what's a good way to handle this?
  FIGURE:"artwork",
  GEN:"journalArticle",
  GOVDOC:"report",
  GRNT:"document",
  INPR:"manuscript",
  JFULL:"journalArticle",
  LEGAL:"case",   //is this what they mean?
  MULTI:"videoRecording", //maybe?
  MUSIC:"audioRecording",
  PAMP:"manuscript",
  SER:"book",
  STAND:"report",
  UNBILL:"manuscript",
  UNPD:"manuscript"
};

//supplement input map with export
var ty;
for(ty in exportTypeMap) {
  importTypeMap[exportTypeMap[ty]] = ty;
}

//merge degenerate export type map into main list
for(ty in degenerateExportTypeMap) {
  exportTypeMap[ty] = degenerateExportTypeMap[ty];
}

/*****************************
 * Tag <-> zotero field maps *
 *****************************/

//used for exporting and importing
//this ensures that we can mostly reimport everything the same way
//(except for item types that do not have unique RIS types, see above)
var fieldMap = {
  //same for all itemTypes
  AB:"abstractNote",
  AN:"archiveLocation",
  DB:"archive",
  DO:"DOI",
  DP:"libraryCatalog",
  IS:"issue",
  J2:"journalAbbreviation",
  KW:"tags",
  LA:"language",
  M2:"extra",   //not in spec
  N1:"notes",
  NV:"numberOfVolumes",
  SE:"section",
  ST:"shortTitle",
  UR:"url",
  Y2:"accessDate",

  //type specific
  //tag => field:itemTypes
  //if itemType not explicitly given, __default field is used
  //  unless itemType is excluded in __exclude
  TI: {
  "__default":"title",
  subject:["email"],
  caseName:["case"],
  nameOfAct:["statute"]
  },
  T2: {
  code:["bill", "statute"],
  bookTitle:["bookSection"],
  blogTitle:["blogPost"],
  conferenceName:["conferencePaper"],
  dictionaryTitle:["dictionaryEntry"],
  encyclopediaTitle:["encyclopediaArticle"],
  committee:["hearing"],
  forumTitle:["forumPost"],
  websiteTitle:["webpage"],
  programTitle:["radioBroadcast", "tvBroadcast"],
  meetingName:["presentation"],
  seriesTitle:["computerProgram", "map", "report"],
  series: ["book"],
  publicationTitle:["journalArticle", "magazineArticle", "newspaperArticle"]
  },
  T3: {
  legislativeBody:["hearing", "bill"],
  series:["bookSection", "conferencePaper"],
  seriesTitle:["audioRecording"]
  },
  //NOT HANDLED: reviewedAuthor, scriptwriter, contributor, guest
  AU: {    "__default":"creators/author",
  "creators/artist":["artwork"],
  "creators/cartographer":["map"],
  "creators/composer":["audioRecording"],
  "creators/director":["film", "radioBroadcast", "tvBroadcast", "videoRecording"],  //this clashes with audioRecording
  "creators/interviewee":["interview"],
  "creators/inventor":["patent"],
  "creators/podcaster":["podcast"],
  "creators/programmer":["computerProgram"]
  },
  A2: {
  "creators/sponsor":["bill"],
  "creators/performer":["audioRecording"],
  "creators/presenter":["presentation"],
  "creators/interviewer":["interview"],
  "creators/editor":["journalArticle", "book", "bookSection", "conferencePaper", "dictionaryEntry", "document", "encyclopediaArticle"],
  "creators/recipient":["email", "instantMessage", "letter"],
  reporter:["case"],
  issuingAuthority:["patent"]
  },
  A3: {
  "creators/cosponsor":["bill"],
  "creators/producer":["film", "tvBroadcast", "videoRecording", "radioBroadcast"],
  "creators/seriesEditor":["book", "bookSection", "conferencePaper", "dictionaryEntry", "encyclopediaArticle", "map", "report"]
  },
  A4: {
  "__default":"creators/translator",
  "creators/counsel":["case"]
  },
  C1: {
  filingDate:["patent"],  //not in spec
  "creators/castMember":["radioBroadcast", "tvBroadcast", "videoRecording"],
  scale:["map"],
  place:["conferencePaper"]
  },
  C2: {
  issueDate:["patent"],   //not in spec
  "creators/bookAuthor":["bookSection"],
  "creators/commenter":["blogPost"]
  },
  C3: {
  artworkSize:["artwork"],
  proceedingsTitle:["conferencePaper"],
  country:["patent"]
  },
  C4: {
  "creators/wordsBy":["audioRecording"],  //not in spec
  "creators/attorneyAgent":["patent"],
  genre:["film"]
  },
  C5: {
  references:["patent"],
  audioRecordingFormat:["audioRecording", "radioBroadcast"],
  videoRecordingFormat:["film", "tvBroadcast", "videoRecording"]
  },
  C6: {
  legalStatus:["patent"],
  },
  CN: {
  "__default":"callNumber",
  docketNumber:["case"]
  },
  CY: {
  "__default":"place",
  "__exclude":["conferencePaper"]   //should be exported as C1
  },
  DA: {
  "__default":"date",
  dateEnacted:["statute"],
  dateDecided:["case"],
  issueDate:["patent"]
  },
  PY: { //duplicate of DA, but this will only output year
  "__default":"date",
  dateEnacted:["statute"],
  dateDecided:["case"],
  issueDate:["patent"]
  },
  ET: {
  "__default":"edition",
  session:["bill", "hearing", "statute"],
  version:["computerProgram"]
  },
  M1: {
  billNumber:["bill"],
  system:["computerProgram"],
  documentNumber:["hearing"],
  applicationNumber:["patent"],
  publicLawNumber:["statute"],
  episodeNumber:["podcast", "radioBroadcast", "tvBroadcast"]
  },
  M3: {
  manuscriptType:["manuscript"],
  mapType:["map"],
  reportType:["report"],
  thesisType:["thesis"],
  websiteType:["blogPost", "webpage"],
  postType:["forumPost"],
  letterType:["letter"],
  interviewMedium:["interview"],
  presentationType:["presentation"],
  artworkMedium:["artwork"],
  audioFileType:["podcast"],
  programmingLanguage:["computerProgram"]
  },
  OP: {
  history:["hearing", "statute", "bill", "case"],
  priorityNumbers:["patent"]
  },
  PB: {
  "__default":"publisher",
  label:["audioRecording"],
  court:["case"],
  distributor:["film"],
  assignee:["patent"],
  institution:["report"],
  university:["thesis"],
  company:["computerProgram"],
  studio:["videoRecording"],
  network:["radioBroadcast", "tvBroadcast"]
  },
  SN: {
  "__default":"ISBN",
  ISSN:["journalArticle", "magazineArticle", "newspaperArticle"],
  patentNumber:["patent"],
  reportNumber:["report"],
  },
  SP: {
  "__default":"pages",  //needs extra processing
  codePages:["bill"], //bill
  numPages:["book", "thesis", "manuscript"],  //manuscript not really in spec
  firstPage:["case"]
  },
  VL: {
  "__default":"volume",
  codeNumber:["statute"],
  codeVolume:["bill"],
  reporterVolume:["case"],
  "notes/Patent Version Number":['patent']
  }
};

//non-standard or degenerate field maps
//used ONLY for importing and only if these fields are not specified above (e.g. M3)
//these are not exported the same way
var degenerateImportFieldMap = {
  A1: fieldMap["AU"],
  BT: {
  title: ["book", "manuscript"],
  bookTitle: ["bookSection"],
  "__default": "backupPublicationTitle" //we do more filtering on this later
  },
  CT: "title",
  ED: "creators/editor",
  EP: "pages",
  JA: "journalAbbreviation",
  JF: "publicationTitle",
  JO: {
  "__default": "publicationTitle",
  conferenceName: ["conferencePaper"]
  },
  M1: "extra",
  M3: "DOI",
  N2: "abstractNote",
  T1: fieldMap["TI"],
  T2: "backupPublicationTitle",  //most item types should be covered above
  Y1: fieldMap["PY"]
};

//generic tag mapping function with caching
//not intended to be used directly
function mapTag(itemType, tag) {
  if(!this.cache[itemType]) this.cache[itemType] = {};

  //retrieve from cache if available
  if(this.cache[itemType][tag]) {
  return this.cache[itemType][tag];
  }

  var fields = [];
  for(var i=0, n=this.mapList.length; i<n; i++) {
  var map = this.mapList[i];
  var field;
  if(typeof(map[tag]) == 'object') {
    var def, exclude = false;
    for(var f in map[tag]) {
    if(f == "__default") {
      def = map[tag][f];
      continue;
    }

    if(f == "__exclude") {
      if(map[tag][f].indexOf(itemType) != -1) {
      exclude = true;
      }
      continue;
    }

    if(map[tag][f].indexOf(itemType) != -1) {
      field = f;
    }
    }
  
    if(!field && def && !exclude) field = def;
  } else if(typeof(map[tag]) == 'string') {
    field = map[tag];
  }

  if(field) fields.push(field);
  }

  this.cache[itemType][tag] = fields;

  return fields;
}

/********************
 * Import Functions *
 ********************/

//set up import field mapping
var importFields = {};
importFields.getField = mapTag;
importFields.cache = {};
importFields.mapList = [fieldMap, degenerateImportFieldMap];
 
function processTag(item, entry) {
  var tag = entry[1];
  var value = entry[2].trim();
  var rawLine = entry[0];

  var zField = importFields.getField(item.itemType, tag)[0];
  if(!zField) {
  Z.debug("Unknown field " + tag + " in entry :\n" + rawLine);
  zField = 'unknown';  //this will result in the value being added as note
  }

  //drop empty fields
  if (value === "" || !zField) return;

  if (tag != "N1" && tag != "AB") {
  value = Zotero.Utilities.unescapeHTML(value);
  }

  //tag based manipulations
  switch(tag) {
  case "N1":
    //seems that EndNote duplicates title in the note field sometimes
    if(item.title == value) {
    value = undefined;
    //do some HTML formatting in non-HTML notes
    } else if(!value.match(/<[^>]+>/)) { //from cleanTags
    value = '<p>'
      + value.replace(/\n\n/g, '</p><p>')
         .replace(/\n/g, '<br/>')
         .replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;')
         .replace(/  /g, '&nbsp;&nbsp;')
      + '</p>';
    }
  break;
  case "EP":
    if(item.pages) {
    if(item.pages.indexOf('-') == -1) {
      item.pages = item.pages + '-' + value;
    } else {
      item.backupNumPages = value;
    }
    value = undefined;
    }
  break;
  case "L1":
    item.attachments.push({url:value, mimeType:"application/pdf",
    title:"Full Text (PDF)", downloadable:true});
    value = undefined;
  break;
  case "L2":
    item.attachments.push({url:value, mimeType:"text/html",
    title:"Full Text (HTML)", downloadable:true});
    value = undefined;
  break;
  case "L4":
    item.attachments.push({url:value,
    title:"Image", downloadable:true});
    value = undefined;
  break;
  }

  zField = zField.split('/');
  //zField based manipulations
  switch(zField[0]) {
  case "backupPublicationTitle":
    item.backupPublicationTitle = value;
    value = undefined;
  break;
  case "creators":
    var creator = value.split(/\s*,\s*/);
    value = {lastName: creator[0], firstName:creator[1], creatorType:zField[1]};
  break;
  case "date":
  case "accessDate":
  case "filingDate":
  case "issueDate":
  case "dateEnacted":
  case "dateDecided":
    value = value.split('/');
    //adjust month (it's 0 based)
    if(value[1]) {
    value[1] = parseInt(value[1]);
    if(value[1]) value[1]--;
    }

    value = ZU.formatDate({
        'year': value[0],
        'month': value[1],
        'day': value[2],
        'part': value[3]
        });
  break;
  case "tags":
    value = value.split(/\s*([\r\n]+\s*)+/);
  break;
  case "notes":
    value = {note:value};
    //we can specify note title in the field mapping table. See VL for patent
    if(zField[1]) {
      value.title = zField[1];
    }
  break;
  }

  applyValue(item, zField[0], value, rawLine);
}

function applyValue(item, zField, value, rawLine) {
  if(!value) return;

  if(!zField || zField == 'unknown') {
  if(!Zotero.parentTranslator) {
    Z.debug("Entry stored as note");
    item.notes.push({note:rawLine});
  }
  return;
  }

  //check if field is valid for item type
  if(zField != 'creators' && zField != 'tags' && zField != 'notes'
      && !ZU.fieldIsValidForType(zField, item.itemType)) {
  Z.debug("Invalid field '" + zField + "' for item type '" + item.itemType + "'.");
  if(!Zotero.parentTranslator) {
    Z.debug("Entry stored as note");
    item.notes.push({note:rawLine});
  }
  return;
  }

  //special processing for certain fields
  switch(zField) {
    case 'notes':
      if(!(value instanceof Array)) {
        value = [value];
      }
      //intentional omission of break
  case 'creators':
  case 'tags':
    item[zField] = item[zField].concat(value);
  break;
  case 'extra':
    if(item.extra) {
    item.extra += '; ' + value;
    }
  break;
  default:
    item[zField] = value;
  }
}

function completeItem(item) {
  // if backup publication title exists but not proper, use backup
  // (hack to get newspaper titles from EndNote)
  if(item.backupPublicationTitle) {
  if(!item.publicationTitle) {
    item.publicationTitle = item.backupPublicationTitle;
  }
  item.backupPublicationTitle = undefined;
  }

  if(item.backupNumPages) {
  if(!item.numPages) {
    item.numPages = item.backupNumPages;
  }
  item.backupNumPages = undefined;
  }

  // fix for doi: prefixed to DOI
  if(item.DOI) {
  item.DOI = item.DOI.replace(/\s*doi:\s*/,'');
  }

  // hack for sites like Nature, which only use JA, journal abbreviation
  if(item.journalAbbreviation && !item.publicationTitle){
  item.publicationTitle = item.journalAbbreviation;
  }

  // Hack for Endnote exports missing full title
  if(item.shortTitle && !item.title){
  item.title = item.shortTitle;
  }

  item.complete();
}

//get the next RIS entry that matches the RIS format
//returns an array in the format [raw "line", tag, value]
//lines may be combined into one entry
var RIS_format = /^([A-Z][A-Z0-9]) {1,2}- (.*)/;
function getLine() {
  var entry, lastLineLength;

  if(getLine.buffer) {
  entry = getLine.buffer.match(RIS_format);
  lastLineLength = entry[2].length;
  getLine.buffer = undefined;
  }

  var nextLine, temp;
  while(nextLine = Zotero.read()) {
  temp = nextLine.match(RIS_format);

  //if we are already processing an entry, then this is the next entry
  //store this line for later and return
  if(temp && entry) {
    getLine.buffer = temp[0];
    return entry;

  //otherwise this is a new entry
  } else if(temp) {
    entry = temp;
    lastLineLength = entry[2].length;

  //if this line didn't match, then we just attach it to the current value
  //Try to figure out if this is supposed to be on a new line or not
  } else if (entry) {
    //new lines would probably only be meaningful in notes and abstracts
    if(entry[1] == 'AB' || entry[1] == 'N1' || entry[1] == 'N2') {
        //if previous line was short, this would probably be on a new line
        //Might consider looking for periods and capital letters
        if(lastLineLength < 60) {
          nextLine = "\r\n" + nextLine;
        }
    }
    
    //check if we need to add a space
      if(entry[2].substr(-1) != ' ') {
        nextLine = ' ' + nextLine;
      }

    entry[0] += nextLine;
    entry[2] += nextLine;
  }
  }

  if(entry) return entry;
}

function doImport(attachments) {
  var entry;
  //skip to the first TY entry
  do {
  entry = getLine();
  } while(entry && entry[1] != 'TY');

  var item;
  var i = -1;  //item counter for attachments
  while(entry) {
  switch(entry[1]) {
    //new item
    case 'TY':
    if(item) completeItem(item);
    var type = importTypeMap[entry[2].trim()];
    if(!type) {
      type = DEFAULT_IMPORT_TYPE;
      Z.debug("Unknown RIS item type: " + entry[2] + ". Defaulting to " + type);
    }
    var item = new Zotero.Item(type);
    //add attachments
    i++;
    if(attachments && attachments[i]) {
      item.attachments = attachments[i];
    }
    break;
    case 'ER':
    if(item) completeItem(item);
    item = undefined;
    break;
    default:
    processTag(item, entry);
  }
  entry = getLine();
  }

  //complete last item if ER is missing
  if(item) completeItem(item);
}

/********************
 * Export Functions *
 ********************/

//RIS files have a certain structure, which is often meaningful
//Records always start with TY and ER. This is hardcoded below
var exportOrder = {
  "__default": ["TI", "AU", "T2", "A2", "T3", "A3", "A4", "AB", "C1", "C2", "C3",
  "C4", "C5", "C6", "CN", "CY", "DA", "PY", "DO", "DP", "ET", "VL", "IS", "SP",
  "J2", "LA", "M1", "M3", "NV", "OP", "PB", "SE", "SN", "ST", "UR", "AN", "DB",
  "Y2", "N1", "KW"],
  //in bill sponsor (A2) and cosponsor (A3) should be together and not split by legislativeBody (T3)
  "bill": ["TI", "AU", "T2", "A2", "A3", "T3", "A4", "AB",  "C1", "C2", "C3",
  "C4", "C5", "C6", "CN", "CY", "DA", "PY", "DO", "DP", "ET", "VL", "IS", "SP",
  "J2", "LA", "M1", "M3", "NV", "OP", "PB", "SE", "SN", "ST", "UR", "AN", "DB",
  "Y2", "N1", "KW"]
};

var newLineChar = "\r\n";   //from spec

//set up export field mapping
var exportFields = {};
exportFields.getField = mapTag;
exportFields.cache = {};
exportFields.mapList = [fieldMap];

function addTag(tag, value) {
  if(value instanceof Array) {
  for(var i=0, n=value.length; i<n; i++) {
    var v = (value[i] + '').trim();
    if(!v) continue;

    Zotero.write(tag + "  - " + v + newLineChar);
  }
  } else {
  value = (value + '').trim();
  if(!value) return;

  Zotero.write(tag + "  - " + value + newLineChar);
  }
}

function doExport() {
  var item, order, tag, fields, field, value;

  while(item = Zotero.nextItem()) {
  // can't store independent notes in RIS
  if(item.itemType == "note" || item.itemType == "attachment") {
    continue;
  }

  // type
  var type = exportTypeMap[item.itemType];
  if(!type) {
    type = DEFAULT_EXPORT_TYPE;
    Z.debug("Unknown item type: " + item.itemType + ". Defaulting to " + type);
  }
  addTag("TY",  type);

  order = exportOrder[item.itemType] || exportOrder["__default"];
  for(var i=0, n=order.length; i<n; i++) {
    tag = order[i];
    //find the appropriate field to export for this item type
    field = exportFields.getField(item.itemType, tag);

    //if we didn't get anything, we don't need to export this tag for this item type
    if(!field) continue;

    value = undefined;
    //we can define fields that are nested (i.e. creators) using slashes
    field = field.split(/\//);

    //handle special cases based on item field
    switch(field[0]) {
    case "creators":
      //according to spec, one author per line in the "Lastname, Firstname, Suffix" format
      //Zotero does not store suffixes in a separate field
      value = [];
      var name;
      for(var j=0, m=item.creators.length; j<m; j++) {
      name = [];
      if(item.creators[j].creatorType == field[1]) {
        name.push(item.creators[j].lastName);
        if(item.creators[j].firstName) name.push(item.creators[j].firstName);
        value.push(name.join(', '));
      }
      }
      if(!value.length) value = undefined;
    break;
    case "notes":
      value = item.notes.map(function(n) { return n.note.replace(/(?:\r\n?|\n)/g, "\r\n"); });
    break;
    case "tags":
      value = item.tags.map(function(t) { return t.tag; });
    break;
    case "pages":
      if(tag == "SP" && item.pages) {
      var m = item.pages.trim().match(/(.+?)[\u002D\u00AD\u2010-\u2015\u2212\u2E3A\u2E3B\s]+(.+)/);
      if(m) {
        addTag(tag, m[1]);
        tag = "EP";
        value = m[2];
      }
      }
    break;
    default:
      value = item[field];
    }

    //handle special cases based on RIS tag
    switch(tag) {
    case "PY":
      var date = ZU.strToDate(item[field]);
      if(!date.year) continue;
      value = ('000' + date.year).substr(-4); //since this is in export, this should not be a problem with MS JavaScript implementation of substr
    break;
    case "Y2":
    case "DA":
      var date = ZU.strToDate(item[field]);
      if(!date.year) continue;
      date.year = ('000' + date.year).substr(-4);
      date.month = (date.month || date.month===0 || date.month==="0")?('0' + (date.month+1)).substr(-2):'';
      date.day = date.day?('0' + date.day).substr(-2):'';
      if(!date.part) date.part = '';

      value = date.year + '/' + date.month + '/' + date.day + '/'; //+ date.part;   //part is probably a mess of day of the week and time
    break;
    }

    addTag(tag, value);
  }

  Zotero.write("ER  - ," + newLineChar + newLineChar);
  }
}

/** BEGIN TEST CASES **/
var testCases = [
  {
    "type": "import",
    "input": "TY  - JOUR\nA1  - Baldwin,S.A.\nA1  - Fugaccia,I.\nA1  - Brown,D.R.\nA1  - Brown,L.V.\nA1  - Scheff,S.W.\nT1  - Blood-brain barrier breach following\ncortical contusion in the rat\nJO  - J.Neurosurg.\nY1  - 1996\nVL  - 85\nSP  - 476\nEP  - 481\nRP  - Not In File\nKW  - cortical contusion\nKW  - blood-brain barrier\nKW  - horseradish peroxidase\nKW  - head trauma\nKW  - hippocampus\nKW  - rat\nN2  - Adult Fisher 344 rats were subjected to a unilateral impact to the dorsal cortex above the hippocampus at 3.5 m/sec with a 2 mm cortical depression. This caused severe cortical damage and neuronal loss in hippocampus subfields CA1, CA3 and hilus. Breakdown of the blood-brain barrier (BBB) was assessed by injecting the protein horseradish peroxidase (HRP) 5 minutes prior to or at various times following injury (5 minutes, 1, 2, 6, 12 hours, 1, 2, 5, and 10 days). Animals were killed 1 hour after HRP injection and brain sections were reacted with diaminobenzidine to visualize extravascular accumulation of the protein. Maximum staining occurred in animals injected with HRP 5 minutes prior to or 5 minutes after cortical contusion. Staining at these time points was observed in the ipsilateral hippocampus. Some modest staining occurred in the dorsal contralateral cortex near the superior sagittal sinus. Cortical HRP stain gradually decreased at increasing time intervals postinjury. By 10 days, no HRP stain was observed in any area of the brain. In the ipsilateral hippocampus, HRP stain was absent by 3 hours postinjury and remained so at the 6- and 12- hour time points. Surprisingly, HRP stain was again observed in the ipsilateral hippocampus 1 and 2 days following cortical contusion, indicating a biphasic opening of the BBB following head trauma and a possible second wave of secondary brain damage days after the contusion injury. These data indicate regions not initially destroyed by cortical impact, but evidencing BBB breach, may be accessible to neurotrophic factors administered intravenously both immediately and days after brain trauma.\nER  - ",
    "items": [
      {
        "itemType": "journalArticle",
        "creators": [
          {
            "lastName": "Baldwin",
            "firstName": "S.A.",
            "creatorType": "author"
          },
          {
            "lastName": "Fugaccia",
            "firstName": "I.",
            "creatorType": "author"
          },
          {
            "lastName": "Brown",
            "firstName": "D.R.",
            "creatorType": "author"
          },
          {
            "lastName": "Brown",
            "firstName": "L.V.",
            "creatorType": "author"
          },
          {
            "lastName": "Scheff",
            "firstName": "S.W.",
            "creatorType": "author"
          }
        ],
        "notes": [
          {
            "note": "RP  - Not In File"
          }
        ],
        "tags": [
          "cortical contusion",
          "blood-brain barrier",
          "horseradish peroxidase",
          "head trauma",
          "hippocampus",
          "rat"
        ],
        "seeAlso": [],
        "attachments": [],
        "title": "Blood-brain barrier breach following cortical contusion in the rat",
        "publicationTitle": "J.Neurosurg.",
        "date": "1996",
        "volume": "85",
        "pages": "476-481",
        "abstractNote": "Adult Fisher 344 rats were subjected to a unilateral impact to the dorsal cortex above the hippocampus at 3.5 m/sec with a 2 mm cortical depression. This caused severe cortical damage and neuronal loss in hippocampus subfields CA1, CA3 and hilus. Breakdown of the blood-brain barrier (BBB) was assessed by injecting the protein horseradish peroxidase (HRP) 5 minutes prior to or at various times following injury (5 minutes, 1, 2, 6, 12 hours, 1, 2, 5, and 10 days). Animals were killed 1 hour after HRP injection and brain sections were reacted with diaminobenzidine to visualize extravascular accumulation of the protein. Maximum staining occurred in animals injected with HRP 5 minutes prior to or 5 minutes after cortical contusion. Staining at these time points was observed in the ipsilateral hippocampus. Some modest staining occurred in the dorsal contralateral cortex near the superior sagittal sinus. Cortical HRP stain gradually decreased at increasing time intervals postinjury. By 10 days, no HRP stain was observed in any area of the brain. In the ipsilateral hippocampus, HRP stain was absent by 3 hours postinjury and remained so at the 6- and 12- hour time points. Surprisingly, HRP stain was again observed in the ipsilateral hippocampus 1 and 2 days following cortical contusion, indicating a biphasic opening of the BBB following head trauma and a possible second wave of secondary brain damage days after the contusion injury. These data indicate regions not initially destroyed by cortical impact, but evidencing BBB breach, may be accessible to neurotrophic factors administered intravenously both immediately and days after brain trauma."
      }
    ]
  },
  {
    "type": "import",
    "input": "TY  - PAT\nA1  - Burger,D.R.\nA1  - Goldstein,A.S.\nT1  - Method of detecting AIDS virus infection\nY1  - 1990/2/27\nVL  - 877609\nIS  - 4,904,581\nRP  - Not In File\nA2  - Epitope,I.\nCY  - OR\nPB  - 4,629,783\nKW  - AIDS\nKW  - virus\nKW  - infection\nKW  - antigens\nY2  - 1986/6/23\nM1  - G01N 33/569 G01N 33/577\nM2  - 435/5 424/3 424/7.1 435/7 435/29 435/32 435/70.21 435/240.27 435/172.2 530/387 530/808 530/809 935/110\nN2  - A method is disclosed for detecting the presence of HTLV III infected cells in a medium. The method comprises contacting the medium with monoclonal antibodies against an antigen produced as a result of the infection and detecting the binding of the antibodies to the antigen. The antigen may be a gene product of the HTLV III virus or may be bound to such gene product. On the other hand the antigen may not be a viral gene product but may be produced as a result of the infection and may further be bound to a lymphocyte. The medium may be a human body fluid or a culture medium. A particular embodiment of the present method involves a method for determining the presence of a AIDS virus in a person. The method comprises combining a sample of a body fluid from the person with a monoclonal antibody that binds to an antigen produced as a result of the infection and detecting the binding of the monoclonal antibody to the antigen. The presence of the binding indicates the presence of a AIDS virus infection. Also disclosed are novel monoclonal antibodies, noval compositions of matter, and novel diagnostic kits\nER  - ",
    "items": [
      {
        "itemType": "patent",
        "creators": [
          {
            "lastName": "Burger",
            "firstName": "D.R.",
            "creatorType": "inventor"
          },
          {
            "lastName": "Goldstein",
            "firstName": "A.S.",
            "creatorType": "inventor"
          }
        ],
        "notes": [
          {
            "note": "877609",
            "title": "Patent Version Number"
          },
          {
            "note": "IS  - 4,904,581"
          },
          {
            "note": "RP  - Not In File"
          }
        ],
        "tags": [
          "AIDS",
          "virus",
          "infection",
          "antigens"
        ],
        "seeAlso": [],
        "attachments": [],
        "title": "Method of detecting AIDS virus infection",
        "issueDate": "February 27, 1990",
        "issuingAuthority": "Epitope,I.",
        "place": "OR",
        "assignee": "4,629,783",
        "accessDate": "June 23, 1986",
        "applicationNumber": "G01N 33/569 G01N 33/577",
        "abstractNote": "A method is disclosed for detecting the presence of HTLV III infected cells in a medium. The method comprises contacting the medium with monoclonal antibodies against an antigen produced as a result of the infection and detecting the binding of the antibodies to the antigen. The antigen may be a gene product of the HTLV III virus or may be bound to such gene product. On the other hand the antigen may not be a viral gene product but may be produced as a result of the infection and may further be bound to a lymphocyte. The medium may be a human body fluid or a culture medium. A particular embodiment of the present method involves a method for determining the presence of a AIDS virus in a person. The method comprises combining a sample of a body fluid from the person with a monoclonal antibody that binds to an antigen produced as a result of the infection and detecting the binding of the monoclonal antibody to the antigen. The presence of the binding indicates the presence of a AIDS virus infection. Also disclosed are novel monoclonal antibodies, noval compositions of matter, and novel diagnostic kits"
      }
    ]
  },
  {
    "type": "import",
    "input": "TY  - PAT\nA2  - organization, issuing\nA3  - international author\nAB  - abstract\nAD  - inventor address\nAN  - accession number\nAU  - Inventor\nC2  - issue date\nC3  - designated states\nC4  - attorney/agent\nC5  - references\nC6  - legal status\nCA  - caption\nCN  - call number\nCY  - country\nDA  - date\nDB  - name of database\nDO  - doi\nDP  - database provider\nET  - international patent classification\nKW  - keywords\nLA  - language\nLB  - label\nM1  - application number\nM3  - patent type\nN1  - notes\nNV  - us patent classification\nOP  - priority numbers\nPB  - assignee\nPY  - year\nRN  - research notes\nSE  - international patent number\nSN  - patent number\nSP  - pages\nST  - short title\nT2  - published source\nT3  - title, international\nTA  - author, translated\nTI  - title\nTT  - translated title\nUR  - url\nVL  - patent version number\nY2  - access date\nID  - 13\nER  - \n\n\n",
    "items": [
      {
        "itemType": "patent",
        "creators": [
          {
            "lastName": "Inventor",
            "creatorType": "inventor"
          },
          {
            "lastName": "attorney/agent",
            "creatorType": "attorneyAgent"
          }
        ],
        "notes": [
          {
            "note": "A3  - international author"
          },
          {
            "note": "AD  - inventor address"
          },
          {
            "note": "AN  - accession number"
          },
          {
            "note": "CA  - caption"
          },
          {
            "note": "CN  - call number"
          },
          {
            "note": "DB  - name of database"
          },
          {
            "note": "DO  - doi"
          },
          {
            "note": "DP  - database provider"
          },
          {
            "note": "ET  - international patent classification"
          },
          {
            "note": "LB  - label"
          },
          {
            "note": "M3  - patent type"
          },
          {
            "note": "<p>notes</p>"
          },
          {
            "note": "NV  - us patent classification"
          },
          {
            "note": "RN  - research notes"
          },
          {
            "note": "SE  - international patent number"
          },
          {
            "note": "T3  - title, international"
          },
          {
            "note": "TA  - author, translated"
          },
          {
            "note": "TT  - translated title"
          },
          {
            "note": "patent version number",
            "title": "Patent Version Number"
          },
          {
            "note": "ID  - 13"
          }
        ],
        "tags": [
          "keywords"
        ],
        "seeAlso": [],
        "attachments": [],
        "issuingAuthority": "organization, issuing",
        "abstractNote": "abstract",
        "issueDate": "year",
        "country": "designated states",
        "references": "references",
        "legalStatus": "legal status",
        "place": "country",
        "language": "language",
        "applicationNumber": "application number",
        "priorityNumbers": "priority numbers",
        "assignee": "assignee",
        "patentNumber": "patent number",
        "pages": "pages",
        "shortTitle": "short title",
        "title": "title",
        "url": "url",
        "accessDate": "access date",
        "publicationTitle": "published source"
      }
    ]
  }
]
/** END TEST CASES **/