{
	"translatorID": "fb12ae9e-f473-cab4-0546-27ab88c64101",
	"label": "Library Catalog (DRA)",
	"creator": "Simon Kornblith",
	"target": "/web2/tramp2\\.exe/(?:see\\_record/|authority\\_hits/|do_keyword_search|form/|goto/.*\\?.*screen=(MARC)?Record\\.html)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsb",
	"lastUpdated": "2013-04-17 03:10:37"
}

/* sample URLs: http://libraries.nc-pals.org
http://web2.libraries.vermont.gov/web2/tramp2.exe/log_in?SETTING_KEY=English
http://ilsweb.uncg.edu/web2/tramp2.exe/log_in?SETTING_KEY=English&servers=1home&guest=guest&screen=home.html */

function detectWeb(doc, url) {
	if(doc.location.href.search(/\/authority_hits|\/form\//) > 0) {
		return "multiple";
	} else {
		return "book";
	}
}

function doWeb(doc, url) {
	var checkItems = false;
	if(detectWeb(doc, url)== "multiple") {
		checkItems = Zotero.Utilities.gatherElementsOnXPath(doc, doc, "//ol//tr/td|//ol/li//ul/li", null);
	}
	
	if(checkItems && checkItems.length) {
		var items = Zotero.Utilities.getItemArray(doc, checkItems, 'https?://.*/web2/tramp2\.exe/(goto|see\_record)');
		uris=[];
		Zotero.selectItems(items, function (items) {
			if (!items) {
				return true;
			}
			for (var i in items) {
				uris.push(i);
			}
			scrape(uris)
			});

	} else {
		if (url.indexOf("/do_keyword_search/")!=-1){
			url = "http://" + doc.location.host + ZU.xpathText(doc, '//td[@class="enrichcontent"]/a[contains(@href, "MARCRecord")]/@href');
		}
		scrape([url]);
	}
}
function scrape(uris){
	for(var i in uris) {
		var uri = uris[i];
		var uriRegexp = /^(https?:\/\/.*\/web2\/tramp2\.exe\/)(?:goto|see\_record|authority\_hits)(\/.*)\?(?:screen=Record\.html\&)?(.*)$/i;
		var m = uriRegexp.exec(uri);
		if(uri.indexOf("/authority_hits") < 0) {
			var newUri = m[1]+"download_record"+m[2]+"/RECORD.MRC?format=marc&"+m[3];
		} else {
			var newUri = m[1]+"download_record"+m[2]+"/RECORD.MRC?format=marc";
		}
		
		// Keep track of how many requests have been completed
		var j = 0;
		
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("a6ee60df-1ddc-4aae-bb25-45e0537be973");
		
		var domain = uri.match(/https?:\/\/([^/]+)/);
		translator.setHandler("itemDone", function(obj, item) {
			item.repository = domain[1]+" Library Catalog";
			item.complete();
		});
		
		Zotero.Utilities.HTTP.doGet(newUri, function(text) {
			translator.setString(text);
			translator.translate();		
			j++;
			if(j == uris.length) {
				Zotero.done();
			}
		});
	}
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://ilsweb.uncg.edu/web2/tramp2.exe/do_keyword_search/guest?setting_key=English&servers=1home&index=kw&query=ocn759914117",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"firstName": "Lori",
						"lastName": "Stein",
						"creatorType": "contributor"
					},
					{
						"firstName": "Sadi",
						"lastName": "Stein",
						"creatorType": "contributor"
					}
				],
				"notes": [
					{
						"note": "Joy Williams ; introduced by Daniel Alarc�on -- t Another drunk gambler / Craig Nova ; introduced by Ann Beattie -- Leonard Michaels ; introduced by David Bezmozgis -- Jane Bowles ; introduced by Lydia Davis -- James Salter ; introduced by Dave Eggers -- Denis Johnson ; introduced by Jeffrey Eugenides -- Mary-Beth Hughes ; introduced by Mary Gaitskill -- Jorge Luis Borges ; introduced by Aleksandar Hemon -- Bernard Cooper ; introduced by Amy Hempel -- Thomas Glynn ; introduced by Jonathan Lethem -- Mary Robison ; introduced by Sam Lipsyte -- Donald Barthelme ; introduced by Ben Marcus -- Raymond Carver ; introduced by David Means -- Ethan Canin ; introduced by Lorrie Moore -- Steven Milhauser ; introduced by Daniel Orozco -- Guy Davenport ; introduced by Norman Rush -- Norman Rush ; introduced by Mona Simpson -- Lydia Davis ; introduced by Ali Smith -- Evan S. Connell ; introduced by Wells Tower -- Dallas Wiebe ; introduced by Joy William Dimmer / City boy / Emmy Moore's journal / Bangkok / Car crash while hitchhiking / Pelican song / Funes, the memorious / Old birds / Except for the sickness I'm quite healthy now. You can believe that / Likely Lake / Several garlic tales / Why don't you dance / The palace thief / Flying carpets / Dinner at the Bank of England / Lying presences / Ten stories from Flaubert / The beau monde of Mrs. Bridge / Night flight to Stockholm"
					},
					{
						"note": "\"Twenty contemporary authors introduce twenty sterling examples of the short story from the pages of The Paris Review\"--Cover p. [4"
					}
				],
				"tags": [
					"Short story",
					"Authorshi",
					"Short stories"
				],
				"seeAlso": [],
				"attachments": [],
				"ISBN": "9781250005984",
				"title": "Object lessons: the Paris Review presents the art of the short story",
				"edition": "1st ed",
				"place": "New York",
				"publisher": "Picador",
				"date": "2012",
				"numPages": "358",
				"callNumber": "PN3373 .O33 2012",
				"libraryCatalog": "ilsweb.uncg.edu Library Catalog",
				"shortTitle": "Object lessons"
			}
		]
	}
]
/** END TEST CASES **/