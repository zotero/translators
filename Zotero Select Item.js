{
"translatorID":"76a79119-3a32-453a-a0a9-c92640e3c93b",
"translatorType":2,
"label":"Zotero Select Item",
"creator":"Scott Campbell, Avram Lyon",
"target":"html",
"minVersion":"2.0",
"maxVersion":"",
"priority":200,
"inRepository":false,
"lastUpdated":"2012-07-17 22:27:00"
}

function doExport() {
	var item;
	while(item = Zotero.nextItem()) {
		Zotero.write("zotero://select/items/");
		var library_id = item.libraryID ? item.libraryID : 0;
		Zotero.write(library_id+"_"+item.key);
	}
}
