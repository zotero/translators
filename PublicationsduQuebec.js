{
	"translatorID": "22d0bede-8db5-4656-9b9a-7d682ec1335d",
	"label": "Publications du Québec",
	"creator": "Marc Lajoie",
	"target": "^https?://(?:www2\\.)?publicationsduquebec\\.gouv\\.qc\\.ca\\/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsib",
	"lastUpdated": "2014-06-24 10:16:52"
}
/*

Publications du Québec Translator

Copyright (C) 2014 Marc Lajoie



This program is free software: you can redistribute it and/or modify

it under the terms of the GNU General Public License as published by

the Free Software Foundation, either version 3 of the License, or

(at your option) any later version.



This program is distributed in the hope that it will be useful,

but WITHOUT ANY WARRANTY; without even the implied warranty of

MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the

GNU General Public License for more details.



You should have received a copy of the GNU General Public License

along with this program. If not, see <http://www.gnu.org/licenses/>.

+*/

var pubqcRegexp = /https?:\/\/(?:www2\.)?publicationsduquebec\.gouv\.qc\.ca\/dynamicSearch\/telecharge\.php\?/;

function getMultiple(doc, checkOnly) {
  var res = ZU.xpath(doc, '//span[@class="texteNormalBleuB"]/a[2]');
  if(!res.length) return false;
  if(checkOnly) return true;

  var items = {};
  for(var i=0; i<res.length; i++) {
	items[res[i].href] = ZU.trimInternal(res[i].textContent);
  }

  return items;
}

function detectWeb(doc, url) {
	if (pubqcRegexp.test(url)) {
		return "statute";
	} else {
			if (getMultiple(doc, true)) {
				return "multiple";
		}
	}
}

function scrape(doc, url) {

	var newItem = new Zotero.Item("statute");
	
	var titleloi = doc.getElementsByClassName('Titreloi')[0] || doc.getElementsByClassName('Titrereg')[0];
	titleloi = ZU.trimInternal(titleloi.textContent); 
	var codeloi = doc.getElementsByClassName('Alpha')[0] || doc.getElementsByClassName('Libelle')[0];
	codeloi = ZU.trimInternal(codeloi.textContent);
	
	newItem.title=titleloi;
	
	if (codeloi.indexOf("chapitre")!=-1){
		newItem.language="french";
		codeloi=codeloi.replace("chapitre", "c");
		newItem.code="RLRQ " + codeloi;
	} else {
		newItem.language="english";
		codeloi=codeloi.replace("chapter", "c");
		newItem.code="CQLR " + codeloi;
	}
	
	newItem.rights="© Éditeur officiel du Québec";
	
	newItem.jurisdiction="Québec, Canada";
	newItem.url=url;

	newItem.attachments.push({
		document: doc,
		title: "Snapshot"
	});
	

	
	newItem.complete();
}

function doWeb(doc, url) {
	if (pubqcRegexp.test(url)) {
		scrape(doc, url);
	} else {
		var items = getMultiple(doc);
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
		"url": "http://www2.publicationsduquebec.gouv.qc.ca/page_intermediaire.php?content=http://www2.publicationsduquebec.gouv.qc.ca/lois_et_reglements/liste_alpha.php&title=Lois%20refondues%20et%20r%E8glements&action=4&lang=en&section=lois_et_reglements",
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
						"title": "Snapshot"
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
						"title": "Snapshot"
					}
				],
				"language": "english",
				"title": "An Act respecting the Barreau du Québec",
				"code": "CQLR c B-1",
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
						"title": "Snapshot"
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
						"title": "Snapshot"
					}
				],
				"language": "english",
				"title": "Code of ethics of advocates",
				"code": "CQLR c B-1, r. 3",
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
