{
	"translatorID": "04623cf0-313c-11df-9aae-0800200c9a66",
	"label": "ZotSelect Link",
	"creator": "Scott Campbell, Avram Lyon, Nathan Schneider",
	"target": "html",
	"minVersion": "2.0",
	"maxVersion": "",
	"priority": 200,
	"displayOptions": {
		"exportCharset": "UTF-8"
	},
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-05-14 17:36:19"
}

function doExport() {
	var item;
	while(item = Zotero.nextItem()) {
		Zotero.write('<a href="zotero://select/items/');
		var library_id = item.libraryID ? item.libraryID : 0;
		
		var titleS = (item.title) ? item.title.replace(/&/g,'&amp;').replace(/"/g,'&quot;') : "(no title)";
		var pubTitleS = (item.publicationTitle) ? item.publicationTitle.replace(/&/g,'&amp;').replace(/"/g,'&quot;') : "";
		if (!pubTitleS && item.type)
			pubTitleS = '['+item.type+']';
		Zotero.write(library_id+'_'+item.key+'" title="'+titleS+'&#13;'+((item.conferenceName) ? item.conferenceName : pubTitleS)+'">');

		var creatorsS = item.creators[0].lastName;
		if (item.creators.length>2)
			creatorsS += " et al.";
		else if (item.creators.length==2)
			creatorsS += " &amp; " + item.creators[1].lastName;
		
		var date = Zotero.Utilities.strToDate(item.date);
		var dateS = (date.year) ? date.year : item.date;
		
		Zotero.write('(' + creatorsS + ' ' + dateS + ')</a><br/>');
	}
}/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
