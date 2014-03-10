{
	"translatorID": "4c6b4c5f-7286-45bb-8e99-0c518d177fa7",
	"label": "OpenEdition Books",
	"creator": "Cédric Chatelain",
	"target": "^http?://(?:books.openedition.org)/",
	"minVersion": "1.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsi",
	"lastUpdated": "2013-12-10 12:08:41"
}

function detectWeb(doc, url){
	//testing if a link to a rdf file exist
	if(doc.getElementById('zotero_rdf')){
		//testing to know if we have a book or a chapter
		var met = doc.getElementsByName('DC.type')[0];
		var cont = met.getAttributeNode("content").value
		Zotero.debug(cont);
		if(cont == 'Book' || cont == 'book'){
			return 'book';
		}else{
			return 'bookSection';
		}
	}else{
		return false;
	}
}

function doWeb(doc, url) {
	detectWeb(doc, url);
	var rdf = doc.getElementById('zotero_rdf').href;
	if (rdf) {
		Zotero.debug(rdf);
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("14763d25-8ba0-45df-8f52-b8d1108e7ac9");
		Zotero.Utilities.HTTP.doGet(rdf, function (text) {
			Zotero.debug(text);
			translator.setString(text);
				 translator.translate();
		});
	}
}
