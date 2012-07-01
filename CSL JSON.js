{
	"translatorID": "bc03b4fe-436d-4a1f-ba59-de4d2d7a63f7",
	"label": "CSL JSON",
	"creator": "Simon Kornblith",
	"target": "json",
	"minVersion": "3.0b3",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 3,
	"browserSupport": "gcs",
	"lastUpdated": "2011-09-25 20:49:56"
}

var parsedData;
function detectImport() {
	const CSL_TYPES = ["article", "article-journal", "article-magazine", "article-newspaper",
		"bill", "book", "broadcast", "chapter", "dataset", "entry", "entry-dictionary",
		"entry-encyclopedia", "figure", "graphic", "interview", "legal_case", "legislation",
		"manuscript", "map", "motion_picture", "musical_score", "pamphlet",
		"paper-conference", "patent", "personal_communication", "post", "post-weblog",
		"report", "review", "review-book", "song", "speech", "thesis", "treaty", "webpage"];
		
	var str, json = "";
	while((str = Z.read(32768)) !== false) json += str;
	
	try {
		parsedData = JSON.parse(json);	
	} catch(e) {
		Zotero.debug(e);
		return false;
	}
	
	if(typeof parsedData !== "object") return false;
	if(!(parsedData instanceof Array)) parsedData = [parsedData];
	
	for(var i=0; i<parsedData.length; i++) {
		var item = parsedData[i];
		if(typeof item !== "object" || !item.type || CSL_TYPES.indexOf(item.type) === -1) {
			return false;
		}
	}
	return true;
}

function doImport() {
	for(var i=0; i<parsedData.length; i++) {
		var item = new Z.Item();
		ZU.itemFromCSLJSON(item, parsedData[i]);
		item.complete();
	}
}

function doExport() {
	var item, data = [];
	while(item = Z.nextItem()) data.push(ZU.itemToCSLJSON(item));
	Z.write(JSON.stringify(data, null, "\t"));
}