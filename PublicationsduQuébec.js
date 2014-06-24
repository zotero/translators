{
	"translatorID": "22d0bede-8db5-4656-9b9a-7d682ec1335d",
	"label": "PublicationsduQuébec",
	"creator": "Marc Lajoie",
	"target": "^https?://(?:www2\\.)?publicationsduquebec\\.gouv\\.qc\\.ca\\/",
	"minVersion": "1.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsib",
	"lastUpdated": "2014-06-24 10:16:52"
}

var pubqcRegexp = /https?:\/\/(?:www2\.)?publicationsduquebec\.gouv\.qc\.ca\/dynamicSearch\/.+/;

function detectWeb(doc, url) {
	if (pubqcRegexp.test(url)) {
		return "statute";
	} else {
		var aTags = doc.getElementsByTagName("a");
		for (var i = 0; i < aTags.length; i++) {
			if (pubqcRegexp.test(aTags[i].href)) {
				return "multiple";
			}
		}
	}
}

function scrape(doc, url) {

	var newItem = new Zotero.Item("statute");
	
	try {
		var titleloi = doc.getElementsByClassName('Titreloi');
		titleloi = ZU.xpathText(titleloi, './node()', null, '');
		var codeloi = doc.getElementsByClassName('Alpha')[0];
		codeloi = ZU.xpathText(codeloi, './node()', null, '');
	
	}
	catch(err) {
		var titleloi = doc.getElementsByClassName('Titrereg');
		titleloi = ZU.xpathText(titleloi, './node()', null, '');
		var codeloi = doc.getElementsByClassName('Libelle')[0];
		codeloi = ZU.xpathText(codeloi, './node()', null, '');
	
	}
	
	if (codeloi.contains("chapitre")){
		newItem.language="french";
	} else {
		newItem.language="english";
	}
	codeloi=codeloi.replace("chapitre"||"chapter", "c");
	
	newItem.title=titleloi;
		
	newItem.code="RLRQ"+" "+codeloi;
	
	newItem.rights="© Éditeur officiel du Québec";
	
	newItem.jurisdiction="Québec, Canada";
	newItem.url=url;

	newItem.attachments.push({
		document: doc,
		title: "© Éditeur officiel du Québec"
	});
	

	
	newItem.complete();
}

function doWeb(doc, url) {
	if (pubqcRegexp.test(url)) {
		scrape(doc, url);
	} else {
		var items = ZU.getItemArray(doc, doc, pubqcRegexp);
		Zotero.selectItems(items, function (items) {
			if (!items) {
				return true;
			}
			var articles = [];
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, scrape);
		});
	}
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www2.publicationsduquebec.gouv.qc.ca/home.php",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www2.publicationsduquebec.gouv.qc.ca/dynamicSearch/telecharge.php?type=2&file=/B_1/B1.html",
		"items": [
			{
				"itemType": "statute",
				"creators": [],
				"notes": [],
				"tags": [
					"New"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "© Éditeur officiel du Québec"
					}
				],
				"language": "french",
				"title": "Loi sur le Barreau",
				"code": "RLRQ c B-1",
				"rights": "© Éditeur officiel du Québec",
				"jurisdiction": "Québec, Canada",
				"url": "http://www2.publicationsduquebec.gouv.qc.ca/dynamicSearch/telecharge.php?type=2&file=/B_1/B1.html",
				"libraryCatalog": "PublicationsduQuébec",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www2.publicationsduquebec.gouv.qc.ca/dynamicSearch/telecharge.php?type=2&file=/B_1/B1_A.html",
		"items": [
			{
				"itemType": "statute",
				"creators": [],
				"notes": [],
				"tags": [
					"New"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "© Éditeur officiel du Québec"
					}
				],
				"language": "english",
				"title": "An Act respecting the Barreau du Québec",
				"code": "RLRQ chapter B-1",
				"rights": "© Éditeur officiel du Québec",
				"jurisdiction": "Québec, Canada",
				"url": "http://www2.publicationsduquebec.gouv.qc.ca/dynamicSearch/telecharge.php?type=2&file=/B_1/B1_A.html",
				"libraryCatalog": "PublicationsduQuébec",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www2.publicationsduquebec.gouv.qc.ca/dynamicSearch/telecharge.php?type=3&file=/B_1/B1R3.HTM",
		"items": [
			{
				"itemType": "statute",
				"creators": [],
				"notes": [],
				"tags": [
					"New"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "© Éditeur officiel du Québec"
					}
				],
				"language": "french",
				"title": "Code de déontologie des avocats",
				"code": "RLRQ c B-1, r. 3",
				"rights": "© Éditeur officiel du Québec",
				"jurisdiction": "Québec, Canada",
				"url": "http://www2.publicationsduquebec.gouv.qc.ca/dynamicSearch/telecharge.php?type=3&file=/B_1/B1R3.HTM",
				"libraryCatalog": "PublicationsduQuébec",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www2.publicationsduquebec.gouv.qc.ca/dynamicSearch/telecharge.php?type=3&file=/B_1/B1R3_A.HTM",
		"items": [
			{
				"itemType": "statute",
				"creators": [],
				"notes": [],
				"tags": [
					"New"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "© Éditeur officiel du Québec"
					}
				],
				"language": "english",
				"title": "Code of ethics of advocates",
				"code": "RLRQ chapter B-1, r. 3",
				"rights": "© Éditeur officiel du Québec",
				"jurisdiction": "Québec, Canada",
				"url": "http://www2.publicationsduquebec.gouv.qc.ca/dynamicSearch/telecharge.php?type=3&file=/B_1/B1R3_A.HTM",
				"libraryCatalog": "PublicationsduQuébec",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	}
]
/** END TEST CASES **/
