{
	"translatorID": "c8784ef5-2891-4b6b-9bee-dd7c3a3d580c",
	"label": "Juricaf",
	"creator": "Guillaume Adreani",
	"target": "http://www.juricaf.org",
	"minVersion": "1.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "g",
	"lastUpdated": "2012-09-28 13:15:32"
}

var juricafRegexp = /http:\/\/www.juricaf\.org\/arret\/.+/;

function detectWeb(doc, url) {

	if (juricafRegexp.test(url)) {
		return "case";
	} else {
		var aTags = doc.getElementsByTagName("a");
		for (var i = 0; i < aTags.length; i++) {
			if (juricafRegexp.test(aTags[i].href)) {
				return "multiple";
			}
		}
	}
}

function scrape(doc) {
var newItem = new Zotero.Item("case");

var title = ZU.xpathText(doc,'//meta[@name="title"][1]\/@content');
newItem.title = title;

var docketNumber = ZU.xpathText(doc,'//meta[@name="docketNumber"][1]\/@content');
newItem.docketNumber = docketNumber;

var rights = ZU.xpathText(doc,'//meta[@name="DC.accessRights"][1]\/@content');
newItem.rights = rights;

var shortTitle = ZU.xpathText(doc,'//meta[@name="shortTitle"][1]\/@content');
newItem.shortTitle = shortTitle;

var reporter = ZU.xpathText(doc,'//meta[@name="reporter"][1]\/@content');
newItem.reporter = reporter;

var court = ZU.xpathText(doc,'//meta[@name="DC.creator"][1]\/@content');
newItem.court = court;
newItem.creators = court;

var tags = ZU.xpathText(doc,'//meta[@name="DC.subject"][1]\/@content');
newItem.tags = tags.trim().split(/\s*,\s*/);

var language = ZU.xpathText(doc,'//meta[@name="language"][1]\/@content');
newItem.language = language;

var date = ZU.xpathText(doc,'//meta[@name="DC.date"][1]\/@content');
newItem.date = date;

var url = ZU.xpathText(doc,'//meta[@name="og:url"][1]\/@content');
newItem.url = url;

newItem.accessDate = 'CURRENT_TIMESTAMP';

var rtfurl = ZU.xpathText(doc, '//a[contains(text(), "RTF")]/@href');
	if (rtfurl) {
		newItem.attachments = [{
			url: rtfurl,
			title: "Version Word",
			mimeType: "application/rtf"
		}];
	}
	
newItem.complete();

}

function doWeb(doc, url) {

	if (juricafRegexp.test(url)) {
		scrape(doc, url);
	} else {

		var items = Zotero.Utilities.getItemArray(doc, doc, juricafRegexp);
		var articles = [];
		Zotero.selectItems(items, function (items) {
			if (!items) {
				return true;
			}
			for (var i in items) {
				articles.push(i);
			}
			Zotero.Utilities.processDocuments(articles, scrape, function () {
				Zotero.done();
			});
			Zotero.wait();
		});
	}
}	

/** BEGIN TEST CASES **/
var testCases = [
	{

         
         	"itemType": "case",
         	"creators": "Cour de cassation",
         	"notes": [],
         	"tags": [
         		"STATUTS PROFESSIONNELS PARTICULIERS",
         		"Emplois domestiques",
         		"Assistant maternel",
         		"Licenciement",
         		"Indemnités",
         		"Montant de l'indemnité de licenciement",
         		"Calcul",
         		"Application des dispositions du code du travail",
         		"Exclusion",
         		"Fondement",
         		"Détermination STATUT COLLECTIF DU TRAVAIL",
         		"Conventions et accords collectifs",
         		"Conventions diverses",
         		"Assistants maternels",
         		"Convention nationale des assistants maternels du particulier employeur du 1er juillet 2004",
         		"Article 18",
         		"Application",
         		"Portée"
         	],
         	"seeAlso": [],
         	"attachments": [
         		{
         			"url": "http://www.legifrance.gouv.fr/telecharger_rtf.do?idTexte=JURITEXT000025960035&origine=juriJudi",
         			"title": "Version Word",
         			"mimeType": "application/rtf"
         		}
         	],
         	"title": "France, Cour de cassation, Chambre sociale, 31 mai 2012, 10-24497",
         	"docketNumber": "10-24497",
         	"rights": "public",
         	"shortTitle": "Cass. Soc., 31 mai 2012, pourvoi n°10-24497, Bull. civ.",
         	"reporter": "Publié au bulletin",
         	"court": "Cour de cassation",
         	"language": "fr",
         	"date": "2012-05-31",
         	"libraryCatalog": "Juricaf"
         },
         
         {
		"type": "web",
		"url": "http://www.juricaf.org/recherche/+/facet_pays%3AFrance",
		"items": "multiple"
	}
         
         
       ]
/** END TEST CASES **/
