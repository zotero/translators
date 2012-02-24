{
	"translatorID": "c82c574d-7fe8-49ca-a360-a05d6e34fec0",
	"label": "zotero.org",
	"creator": "Dan Stillman and Aurimas Vinckevicius",
	"target": "^https?://[^/]*zotero\\.org(:\\d+)?/.+/items(/|$)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcs",
	"lastUpdated": "2012-02-24 03:46:01"
}

function detectWeb(doc, url) {
	//single item
	if( url.match(/\/itemKey\/\w+/) ) {
		return ZU.xpathText(doc, '//div[@id="item-details-div"]//td[preceding-sibling::th[text()="Item Type"]]/@class')
				|| false;
	}

	// Skip private groups
	//is this still how they are identified??
	if (url.match(/\/groups\/[0-9]+\/items/)) {
		return false;
	}

	// Library and collections
	if ( ( url.match(/\/items\/?([?#].*)?$/) ||
		url.indexOf('/collectionKey/') != -1 || url.match(/\/collection\/\w+/) )
		&& doc.getElementById("field-table") ) {
		return "multiple";
	}
}

function addByRDF(text) {
	var translator = Zotero.loadTranslator('import');
	translator.setTranslator('5e3ad958-ac79-463d-812b-a86a9235c28f');
	translator.setString(text);
	translator.translate();
}


function doWeb(doc, url) {
	var libraryURI = ZU.xpathText(doc, '//link[@type="application/atom+xml" and @rel="alternate"]/@href')
					.match(/^.+?\/(?:users|groups)\/\w+/)[0]
					+ '/items/';
	var apiOpts = '?format=rdf_zotero';
	var itemRe = /\/itemKey\/(\w+)/;

	if (detectWeb(doc, url) == "multiple") {
		var elems = ZU.xpath(doc, '//table[@id="field-table"]//td[1][not(contains(./a, "Unpublished Note"))]');
		var items = ZU.getItemArray(doc, elems);
		
		Zotero.selectItems(items, function(selectedItems) {
			if( !selectedItems ) return true;

			var apiURIs = [], itemID;
			for (var url in selectedItems) {
				itemID = url.match(itemRe)[1];
				//export using zotero rdf to preserve as much information as possible
				apiURIs.push(libraryURI + itemID + apiOpts);
			}

			Zotero.Utilities.HTTP.doGet(apiURIs, addByRDF);
		});
	} else {
		var itemID = url.match(itemRe)[1];
		var itemURI = libraryURI + itemID + apiOpts;
		Zotero.Utilities.doGet(itemURI, addByRDF);
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.zotero.org/groups/all_things_zotero/items/itemKey/HXTTNJGD",
		"defer": true,
		"items": [
			 {
         	"itemType": "journalArticle",
         	"creators": [
         		[]
         	],
         	"notes": [],
         	"tags": [],
         	"seeAlso": [],
         	"attachments": [],
         	"itemID": "#item_1",
         	"title": "Expert Searching, Zotero: A New Bread of Search Tool",
         	"publicationTitle": "Medical Library Association Newsletter",
         	"reporter": "Medical Library Association Newsletter",
         	"date": "April 2007",
         	"callNumber": "0000",
         	"libraryCatalog": "zotero.org",
         	"shortTitle": "Expert Searching, Zotero"
			 }
		]
	},
	{
		"type": "web",
		"url": "https://www.zotero.org/marksample/items/collectionKey/5RN69IBP/itemKey/58VT7DAA",
		"defer": true,
		"items": [
			  {
         	"itemType": "book",
         	"creators": [
         		[]
         	],
         	"notes": [],
         	"tags": [],
         	"seeAlso": [],
         	"attachments": [],
         	"itemID": "urn:isbn:0812235517",
         	"title": "American Magic and Dread: Don DeLillo’s Dialogue with Culture",
         	"publisher": "University of Pennsylvania Press",
         	"place": "Philadelphia",
         	"institution": "University of Pennsylvania Press",
         	"company": "University of Pennsylvania Press",
         	"label": "University of Pennsylvania Press",
         	"distributor": "University of Pennsylvania Press",
         	"date": "2000",
         	"ISBN": "0812235517",
         	"shortTitle": "American Magic",
         	"libraryCatalog": "zotero.org"
         }
		]
	},
	{
		"type": "web",
		"url": "https://www.zotero.org/groups/all_things_zotero/items",
		"items": "multiple",
		"defer": true
	},
	{
		"type": "web",
		"url": "https://www.zotero.org/groups/all_things_zotero/items/collectionKey/XX99JMW8",
		"items": "multiple",
		"defer": true
	},
	{
		"type": "web",
		"url": "https://www.zotero.org/marksample/items",
		"items": "multiple",
		"defer": true
	},
	{
		"type": "web",
		"url": "https://www.zotero.org/marksample/items/collectionKey/5RN69IBP",
		"items": "multiple",
		"defer": true
	},
	{
		"type": "web",
		"url": "https://www.zotero.org/marksample/items/collection/5RN69IBP",
		"items": "multiple",
		"defer": true
	}
]
/** END TEST CASES **/
