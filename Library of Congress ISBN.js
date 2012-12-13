{
	"translatorID": "c070e5a2-4bfd-44bb-9b3c-4be20c50d0d9",
	"label": "Library of Congress ISBN",
	"creator": "Sebastian Karcher",
	"target": "",
	"minVersion": "3.0.9",
	"maxVersion": "",
	"priority": 99,
	"inRepository": true,
	"translatorType": 8,
	"browserSupport": "gcsb",
	"lastUpdated": "2012-12-12 16:10:34"
}


function detectSearch(item) {
	//re-enable once 
	/*if (item.ISBN) {
		return !!ZU.cleanISBN(item.ISBN)
	} else return false; */
	return !!item.ISBN;
}


function doSearch(item) {
	//Sends an SRU formatted as CQL to the library of Congress asking for marcXML back
	//http://www.loc.gov/standards/sru/
	ZU.doGet("http://z3950.loc.gov:7090/voyager?version=1.1&operation=searchRetrieve&query=dc.resourceIdentifier=" + ZU.cleanISBN(item.ISBN) + "&maximumRecords=1", function (text) {
		//Z.debug(text);
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("edd87d07-9194-42f8-b2ad-997c4c7deefd");
		translator.setString(text);
		translator.translate();
	});
}
