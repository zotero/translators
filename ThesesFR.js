{
	"translatorID": "3f73f0aa-f91c-4192-b0d5-907312876cb9",
	"label": "ThesesFR",
	"creator": "TFU",
	"target": "^https?://(www\\.)?(theses\\.fr)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2018-04-23 11:16:01"
}

/*
	***** BEGIN LICENSE BLOCK *****
	
	theses.fr

	This file is part of Zotero.

	Zotero is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	Zotero is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
	GNU Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public License
	along with Zotero. If not, see <http://www.gnu.org/licenses/>.

	***** END LICENSE BLOCK *****
*/

function detectWeb(doc, url) {
 
	if (url.indexOf("?q=") != -1) {
		return "multiple";
	} else if (url.indexOf("?q=") == -1) {
		return "thesis";
	}
}



function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//div[contains(@class, "encart arrondi-10")]//h2/a');
	for (var i=0; i<rows.length; i++) {
		var href = rows[i].href;
		var title = ZU.trimInternal(rows[i].textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		Zotero.selectItems(getSearchResults(doc, false), function(items) {
			if (!items) {
				return true;
			}
			var articles = [];
			for (var i in items) {
				articles.push(i);
			}
			//Z.debug(articles)
			ZU.processDocuments(articles, scrape);
		});
	} else {
		scrape(doc, url);
	}
}

function scrape(doc, url) {

	var translator = Zotero.loadTranslator('web');
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48'); //https://github.com/zotero/translators/blob/master/Embedded%20Metadata.js
	translator.setDocument(doc);
	translator.setHandler('itemDone', function(obj, item) {
		//add type
		//converting internal info:eu-repo/semantics/doctoralThesis notation to "Ph.D. Thesis" only for collections and items
		if (item.url.indexOf("/handle/") > -1) {
			item.thesisType = "Ph.D. Thesis";
		}

		//add tags -> from rights
		var rights = ZU.xpath(doc, '//meta[contains(@name, "DC.rights")]');
		if (rights.length > 0) {
			item.rights = [];
			for (var t = 0; t < rights.length; t++) {
				if (mappingRights[rights[t].content]) {
					item.rights.push(mappingRights[rights[t].content]);
				}
			}
			if (rights.length > 0) {
				item.rights = item.rights.join(", ");
			}
		}
		item.complete();
	});
	translator.getTranslatorObject(function(trans) {
		trans.itemType = "thesis";
		trans.doWeb(doc, url);
	});
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.theses.fr/2012LYO10182",
		"items": [
			{
				"itemType": "thesis",
				"title": "Développement et évaluation in vitro d’un dérivé de chitosan fonctionnalisé avec des peptides RGD pour la cicatrisation",
				"creators": [
					{
						"firstName": "Annasara",
						"lastName": "Hansson",
						"creatorType": "author"
					}
				],
				"date": "2012/10/19",
				"abstractNote": "L’objectif du travail présenté dans cette thèse était de développer des nanoparticulesfonctionnelles ayant la capacité d’induire l’adhésion et la migration de kératinocyteshumains normaux. L’utilisation de systèmes particulaires pour favoriser l’adhésion etla migration cellulaire dans les processus de cicatrisation constitue une nouvelleapproche de l’ingéniérie tissulaire. Dans cette optique, un dérivé hydrosoluble du chitosan rendu fonctionnel par l’ajoutde peptides RGD a été développé. Les nanoparticules furent développées parcoacervation complexe entre le dérivé cationique du chitosan et le sulfate dechondroïtine anionique. La capacité du système particulaire à induire unchangement cellulaire phénotypique a été évaluée in vitro.Lors de l’évaluation de ce nouveau polymère, le succès de la synthèse a été montrépar l’absence de cytotoxicité et par la préservation de son activité biologique médiéepar les séquences RGD. Aussi bien les polymères que les nanoparticules ont induitl’adhésion et la mobilité de fibroblastes dermiques humains, confirmant le conceptde nanoparticules bio-actives. Cependant, concernant l’étude des interactions entreles nanoparticules et les kératinocytes, aucune conclusion n’a pu être tirée etd’autres travaux sont nécessaires. Pour résumer, un système particulaire bio-actif a été développé. Le choix despeptides RGD pour induire la migration des kératinocytes doit être réévalué, etl’utilisation de concentrations plus importantes, de mélange de peptides d’adhésionou l’utilisation de peptides d’adhésion différents doit être envisagée pour laréalisation d’études ultérieures.",
				"libraryCatalog": "www.theses.fr",
				"thesisType": "thesis",
				"university": "Lyon 1",
				"url": "http://www.theses.fr/2012LYO10182",
				"attachments": [
					{
						"title": "Snapshot"
					}
				],
				"tags": [
					{
						"tag": "RGD Chitosan Nanoparticles Cell adhesion Wound healing"
					},
					{
						"tag": "RGD Chitosan Nanoparticules Adhésion cellulaire Cicatrisation  en français"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.theses.fr/?q=hansonn",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.theses.fr/?q=bleu",
		"items": "multiple"
	}
]
/** END TEST CASES **/
