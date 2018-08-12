{
	"translatorID": "65c7ee26-eee7-442a-ba09-41da30cf2864",
	"label": "Theses.fr",
	"creator": "Pierre Payen",
	"target": "^https?://(www\\.)?theses.fr/[^?]",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2018-03-16 17:07:38"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2018 Pierre Payen
	
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


// attr()/text() v2
function attr(docOrElem,selector,attr,index){var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);return elem?elem.getAttribute(attr):null;}function text(docOrElem,selector,index){var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);return elem?elem.textContent:null;}


function detectWeb(doc, url) {
	if (!(url.includes('/?q='))) {
		return "thesis";
	} else if (getSearchResults(doc, true)) {
		return "multiple";
	}
}


function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('div.informations>h2>a[href]');
	for (let i=0; i<rows.length; i++) {
		let href = rows[i].href;
		let title = ZU.trimInternal(rows[i].textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}


function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (!items) {
				return true;
			}
			var articles = [];
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, scrape);
		});
	} else {
		scrape(doc, url);
	}
}


function scrape(doc, url) {
	var translator = Zotero.loadTranslator('web');
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	// translator.setDocument(doc);
	
	translator.setHandler('itemDone', function (obj, item) {
		item.section = "Theses";
		item.complete();
	});

	translator.getTranslatorObject(function(trans) {
		trans.itemType = "thesis";
		trans.addCustomFields({
			'twitter:description': 'abstractNote'
		});
		trans.doWeb(doc, url);
	});
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.theses.fr/s197772",
		"items": [
			{
				"itemType": "thesis",
				"title": "Modélisation d'un matériau faible indice en hyperfréquence par une condition d'impédance d'ordre élevé",
				"creators": [
					{
						"firstName": "Pierre",
						"lastName": "Payen",
						"creatorType": "author"
					}
				],
				"abstractNote": ",",
				"libraryCatalog": "www.theses.fr",
				"url": "http://www.theses.fr/s197772",
				"attachments": [
					{
						"title": "Snapshot"
					}
				],
				"tags": [
					{
						"tag": "en français"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.theses.fr/2012LIL2S049",
		"items": [
			{
				"itemType": "thesis",
				"title": "Nouvelles approches thérapeutiques par potentialisation d’antituberculeux analogues du nicotinamide",
				"creators": [
					{
						"firstName": "Nicolas",
						"lastName": "Blondiaux",
						"creatorType": "author"
					}
				],
				"date": "2012/12/17",
				"abstractNote": "Les antibiotiques représentent à l’heure actuelle le seul moyen de lutte efficace contre la tuberculose. Parmi eux, l’éthionamide (ETH) est l’un des antituberculeux les plus efficaces. Il pose cependant des problèmes d’effets indésirables non négligeables ce qui relègue son utilisation en seconde ligne de traitement. Ces inconvénients aboutissent fréquemment à une inobservance au traitement, à l’origine du développement de souches résistantes.L’ETH, à l’instar d’autres composés antimycobactériens, est une pro-drogue nécessitant son activation métabolique par une enzyme produite par la mycobactérie elle-même. Il a été montré que cette bio-activation intra-bactérienne est exercée par la mono-oxygénase EthA dont la production est réprimée par le régulateur transcriptionnel EthR. Lors de travaux précédents, des inhibiteurs de EthR ont été développés dans le but de stimuler la bioactivation de l’ETH par EthA. Ces molécules de synthèse ont permis de potentialiser l’efficacité de l’ETH d’un facteur trois sur un modèle murin d’infection tuberculeuse. Toutefois, bien qu’actifs chez l’animal, cette première série de composés possède des propriétés pharmacocinétiques et pharmacodynamiques (PK/PD) insuffisantes pour une utilisation en clinique humaine. Le premier objectif de ce travail a donc été de définir un « profil minimum acceptable » nécessaire à la réalisation d’études pré-cliniques. L’évaluation systématique des performances de plus de 500 composés a mené à l’identification de leads compatibles avec le profil défini. Notre deuxième objectif a été d’évaluer l’intérêt de la stratégie de potentialisation de l’ETH dans la problématique de la prise en charge de la tuberculose multi-résistante (MDR-TB). Ainsi, dans 80% des cas, l’usage de nos inhibiteurs d’EthR a permis d’abaisser significativement la concentration minimale inhibitrice d’ETH.Parallèlement, tirant profit de la quantité importante de composés générés lors de ce programme d’optimisation, une étude fondamentale des interactions entre inhibiteurs et EthR a été menée. De cette manière, nous avons pu identifier une région restreinte de la poche d’interaction de EthR avec ses inhibiteurs/ligands, nécessaire et suffisante à la réorganisation spatiale menant à une forme inactive du répresseur. Pour la première fois dans cette famille de répresseur de type TetR, nous avons montré que la modification d’un seul acide aminé dans cette région de la protéine provoque les mêmes phénomènes allostériques que ceux induits par la fixation des inhibiteurs/ligands. De façon inattendue, le programme d’optimisation des inhibiteurs nous a mené à l’identification d’une nouvelle famille de molécules capables de potentialiser l’ETH alors qu’elles ont perdu leur capacité d’interagir avec EthR. Des expériences de transcriptomique et de RMN ont révélé que ces composés inhibent une voie de bio-activation de l’ETH indépendante de EthA. Cette voie ouvre des perspectives extraordinaires de traitement puisque ces inhibiteurs augmentent significativement l’efficacité de la prodrogue, non seulement sur les souches cliniques MDR-TB, mais également sur les souches cliniques résistantes à l’ETH. Notre dernier objectif a été de calquer cette stratégie de potentialisation à l’antituberculeux le plus utilisé dans le monde, l’isoniazide (INH). Tout comme l’ETH, l’INH est une pro-drogue. Sa bio-activation est tributaire de la catalase-peroxydase KatG dont le niveau d’expression est sous dépendance du régulateur transcriptionnel FurA. Notre objectif a donc été d’obtenir des inhibiteurs spécifiques de FurA. En l’absence de structure cristallographique de FurA nous empêchant une approche par chimie raisonnée sur cible, nous avons basé notre stratégie sur un criblage à haut débit de vastes chimiothèques. Les premiers hits et leur partielle optimisation sont discutés dans ce travail.",
				"libraryCatalog": "www.theses.fr",
				"thesisType": "thesis",
				"university": "Lille 2",
				"url": "http://www.theses.fr/2012LIL2S049",
				"attachments": [
					{
						"title": "Snapshot"
					}
				],
				"tags": [
					{
						"tag": "Stratégie de potentialisation Tuberculose Ethionamide Isoniazide Multi-résistance  en français"
					},
					{
						"tag": "Tuberculosis Ethionamide Isoniazide Boosting strategy Multi-resistance"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.theses.fr/?q=kieran",
		"items": "multiple"
	}
]
/** END TEST CASES **/
