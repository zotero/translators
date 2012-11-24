{
	"translatorID": "4f62425a-c99f-4ce1-b7c1-5a3ac0d636a3",
	"label": "AfroEuropa",
	"creator": "Michael Berkowitz",
	"target": "^https?://journal\\.afroeuropa\\.eu/",
	"minVersion": "1.0.0b4.r5",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2012-09-04 21:06:33"
}

function detectWeb(doc, url) {
	if (doc.evaluate('//tr[td/a[2]]', doc, null, XPathResult.ANY_TYPE, null).iterateNext()) {
		return "multiple";
	} else if (url.match(/article\/view/)) {
		return "journalArticle";
	}
}

function makeExport(site, str) {
	var nums = str.match(/\d+(\/\d+)?/)[0];
	if (!nums.match(/\//)) nums += "/0";
	return site + 'rt/captureCite/' + nums + '/referenceManager';
}

function doWeb(doc, url) {
	var site = url.match(/^http:\/\/([^/]*\/)+index\.php\/[^/]*\//)[0];
	var arts = new Array();
	if (detectWeb(doc, url) == "multiple") {
		var xpath = '//tr[td/a]';
		if (url.match(/search/)) {
			var titlex = './td[2]';
			var linkx = './td[3]/a[1]';
		} else if (url.match(/issue/)) {
			var titlex = './td[1]';
			var linkx = './td[2]/a[1]';
		}
		var items = new Object();
		var results = doc.evaluate(xpath, doc, null, XPathResult.ANY_TYPE, null);
		var result;
		while (result = results.iterateNext()) {
			var title = Zotero.Utilities.trimInternal(doc.evaluate(titlex, result, null, XPathResult.ANY_TYPE, null).iterateNext().textContent);
			var link = doc.evaluate(linkx, result, null, XPathResult.ANY_TYPE, null).iterateNext().href;
			items[makeExport(site, link)] = title;
		}
		items = Zotero.selectItems(items);
		for (var i in items) {
			arts.push(i);
		}
	} else {
		arts = [makeExport(site, url)];
	}
	Zotero.Utilities.HTTP.doGet(arts, function(text) {
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
		translator.setString(text);
		translator.setHandler("itemDone", function(obj, item) {
			item.title = Zotero.Utilities.capitalizeTitle(item.title);
			var voliss = item.publicationTitle.split(/;\s+/);
			item.publicationTitle = Zotero.Utilities.trimInternal(voliss[0]);
			voliss = voliss[1].match(/(\d+),\s+No\s+(\d+)\s+\((\d+)\)/);
			item.volume = voliss[1];
			item.issue = voliss[2];
			item.date = voliss[3];
			var auts = new Array();
			for each (var aut in item.creators) {
				auts.push(aut.lastName);
			}
			item.creators = new Array();
			for each (var aut in auts) {
				item.creators.push(Zotero.Utilities.cleanAuthor(aut, "author"));
			}
			if(item.url) {
				item.attachments.push({
					title:"AfroEuropa Snapshot",
					url:item.url,
					mimeType:"text/html",
					snapshot:true
				});
			}
			item.complete();
		});
		translator.translate();
	});
	Zotero.wait();
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://journal.afroeuropa.eu/index.php/afroeuropa/issue/view/7",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://journal.afroeuropa.eu/index.php/afroeuropa/article/viewArticle/114",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Terri",
						"lastName": "Ochiaga",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"Chike Momah",
					"African Diaspora",
					"Afroeuropean Studies",
					"Nigerian Civil War Literature."
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "AfroEuropa Snapshot",
						"mimeType": "text/html",
						"snapshot": true
					}
				],
				"title": "“ANXIETY, FEAR, DESPAIR”: THE EXPERIENCES OF A BIAFRAN FAMILY IN THE DIASPORA DURING THE NIGERIA/BIAFRA CIVIL WAR AS PORTRAYED IN MOMAH’S TITI: BIAFRAN MAID IN GENEVA",
				"publicationTitle": "Afroeuropa: Journal of Afroeuropean Studies",
				"accessDate": "2010",
				"abstractNote": "The Nigeria-Biafra Civil War (1967- 1970) was a shattering experience for all involved, but very especially for those who fought for the independence, survival and protection of the small republic, Biafra, geographically situated in what had, before the declaration of independence, been Eastern Nigeria. As is wont to occur in the aftermath of such a devastating conflict, many of the survivors, among them world-renowned authors wrote accounts, both autobiographical and fictionalised, of the Nigeria/Biafra Civil War, giving rise to a vast corpus of Civil War Literature. One of the shining ones of Nigerian literature, Chike Momah, has in his historical novel Titi: Biafran Maid in Geneva , written the first account of the effects of the traumatic conflict on a diasporic Biafran family in particular, and the Biafran community resident in Switzerland in general. How he achieves the feat of portraying their anxiety, fear and despair from a distance is the object of our analysis in this paper. His is a novel written many years after the end of the conflict and is the sophomore literary work of an extremely talented man, who in spite of being part of the Ibadan golden generation of authors began his career after his retirement from the United Nations. In this masterpiece he has proved indeed that “The idea of Biafra will never, never die.”",
				"url": "http://journal.afroeuropa.eu/index.php/afroeuropa/article/view/114",
				"date": "2008",
				"volume": "2",
				"issue": "3",
				"libraryCatalog": "AfroEuropa",
				"shortTitle": "“ANXIETY, FEAR, DESPAIR”"
			}
		]
	}
]
/** END TEST CASES **/