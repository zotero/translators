{
	"translatorID": "2dc0b23d-64d8-4933-b629-5c003451ccf7",
	"label": "Légifrance",
	"creator": "Guillaume Adreani",
	"target": "^https?://(www\\.)?legifrance\\.gouv\\.fr/",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-06-16 11:01:10"
}

/*
	***** BEGIN LICENSE BLOCK *****
	
	Copyright © 2013 Guillaume Adreani (guillaume.adreani@gmail.com @adreagui] for Droit.org
	
	This file is part of Zotero.
	
	Zotero is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.
	
	Zotero is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU Affero General Public License for more details.
	
	You should have received a copy of the GNU Affero General Public License
	along with Zotero.  If not, see <http://www.gnu.org/licenses/>.
	
	***** END LICENSE BLOCK *****
*/

/*
Thanks to Sebastian Karcher and Aurimas Vinckevicius

*/

function detectWeb(doc, url) { // eslint-disable-line no-unused-vars
	let path = (new URL(url)).pathname;
	if (/(?:CETATEXT|CONSTEXT|JURITEXT)/.test(url)) { // Détection jurisprudence
		return "case";
	}
	else if (/LEGIARTI|affichCodeArticle|affichTexteArticle|KALICONT|JORFTEXT|CNILTEXT/.test(url)) { // Détection textes législatifs
		return "statute"; // Détection lois et codes
	}
	else if (/^\/search\//.test(path)) { // Détection occurences multiples uniquement pour la jurisprudence
		return "multiple"; // occurences multiples
	}
	else return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.title-result-item');
	for (let row of rows) {
		let href = attr(row, "a", "href");
		let title = ZU.trimInternal(row.textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

async function doWeb(doc, url) {
	if (detectWeb(doc, url) == 'multiple') {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (!items) return;
		for (let url of Object.keys(items)) {
			scrape(await requestDocument(url));
		}
	}
	else {
		scrape(doc, url);
	}
}

function scrape(doc, url = doc.location.href) {
	switch (detectWeb(doc, url)) {
		case "case": {
			scrapeCase(doc, url);
			break;
		}
		case "statute": {
			scrapeLegislation(doc, url);
			break;
		}
	}
}

function scrapeCase(doc, url) { // Jurisprudence
	var newItem = new Zotero.Item("case");

	// Paramètres communs
	var title = ZU.xpathText(doc, '//h1[@class="main-title"]');
	title = ZU.trimInternal(title);
	newItem.title = title;
	newItem.url = url;
	// NOTE: RTF may have gone (2023-06); the site now only shows "print" and
	// "copy text to clipboard".
	var rtfurl = ZU.xpathText(doc, '//a[contains(text(), "Télécharger")]/@href');
	if (rtfurl) {
		newItem.attachments = [{
			url: "http://www.legifrance.gouv.fr/" + rtfurl,
			title: "Document en RTF",
			mimeType: "application/rtf"
		}];
	}

	// Situation selon les juridictions
	let matchInfo;

	if ((matchInfo = title.match(/(.*) - (.*) - (.*) - (.*)/))) {
		// Conseil constitutionnel
		let [, numero, date, texteParties,] = matchInfo;
		newItem.court = 'Conseil constitutionnel';
		newItem.docketNumber = numero;
		newItem.date = date;
		newItem.extra = texteParties;
	}
	else if ((matchInfo = title.match(/(Conseil d'État), (.*), ([0-9/]+), ([0-9]+), (.+Lebon)/i))) {
		// Conseil d'État avec indication de publication
		let [, cour, formation, date, numero, publication] = matchInfo;
		newItem.court = cour;
		newItem.extra = formation;
		newItem.date = date;
		newItem.docketNumber = numero;
		newItem.reporter = publication;
	}
	else if ((matchInfo = title.match(/(Conseil d'État), (.*), ([0-9/]+), ([0-9]+)/i))) {
		// Conseil d'État sans indication de publication
		let [, , formation, date, numero] = matchInfo;
		newItem.court = "Conseil d'État";
		newItem.extra = formation;
		newItem.date = date;
		newItem.docketNumber = numero;
	}
	else if ((matchInfo = title.match(/(Tribunal des Conflits), , ([0-9/]+), (.*)/i))) {
		// Tribunal des conflits (jp administrative)
		let [, , date, numero] = matchInfo;
		newItem.court = 'Tribunal des Conflits';
		newItem.date = date;
		newItem.docketNumber = numero;
	}
	else if ((matchInfo = title.match(/(Cour administrative.*?), (.+?), ([0-9/]+), (.+?)(?:$|, (.+Lebon)$)/i))) {
		// Cours administratives d'appel avec publication
		// très rares cas sans publication
		let [, cour, formation, date, numero, publication] = matchInfo;
		newItem.court = cour;
		newItem.extra = formation;
		newItem.date = date;
		newItem.docketNumber = numero;
		if (publication) {
			newItem.reporter = publication;
		}
	}
	else if ((matchInfo = title.match(/(Tribunal Administratif.*), (.*chambre), ([0-9/]+), ([0-9]+)/i))) {
		// tribunaux administratifs avec chambre
		let [, cour, formation, date, numero] = matchInfo;
		newItem.court = cour;
		newItem.date = date;
		newItem.extra = formation;
		newItem.docketNumber = numero;
	}
	else if ((matchInfo = title.match(/(Tribunal Administratif|administratif.*), du (.*), ([0-9-]+), (.+Lebon)/))) {
		// tribunaux administratifs sans chambre avec publication
		let [, cour, date, numero, publication] = matchInfo;
		newItem.court = cour;
		newItem.date = date;
		newItem.docketNumber = numero;
		newItem.reporter = publication;
	}
	else if ((matchInfo = title.match(/(Cour de cassation), (.*), (.*), ([0-9-. ]+), (.*)/))) {
		// Note : présence d'autres cas pour les TA
		// Cour de cassation
		let [, nature, formation, date, numero, publication] = matchInfo;
		newItem.court = 'Cour de cassation';
		if (nature) newItem.tags.push(nature);
		newItem.extra = formation;
		newItem.date = date;
		newItem.docketNumber = numero;
		newItem.reporter = publication;
	}
	else if ((matchInfo = title.match(/(Cour d'appel.*|Tribunal.*|Conseil.*|Chambre.*|Juridiction.*|Commission.*|Cour d'assises.*) de (.*), (.*), ([0-9/]+)/i))) {
		// cours d'appel et tribunaux
		// XXX Why take apart the court and location only to put them together?
		// Also this duplicates with the Tribunal Administratif... case.
		let [, cour, lieu, date, numero] = matchInfo;
		newItem.court = cour + ' de ' + lieu;
		newItem.date = date;
		newItem.docketNumber = numero;
	}
	else if ((matchInfo = title.match(/(Tribunal des conflits), (.*), (.*), ([0-9-. ]+), (.*)/i))) {
		// Tribunal des conflits - Base CASS
		let [, , nature, date, numero, publication] = matchInfo;
		newItem.court = 'Tribunal des conflits';
		if (nature) newItem.tags.push(nature);
		newItem.date = date;
		newItem.docketNumber = numero;
		newItem.reporter = publication;
	}
	newItem.complete();
}

function scrapeLegislation(doc, url) {
	var newItem = new Zotero.Item("statute");

	var title = ZU.trimInternal(text(doc, '.chronolegi-label')).replace(/(?:«\s+)([^»]+)(?:\s+»)/, "$1");
	if (!title) {
		title = ZU.trimInternal(text(doc, '.main-title, .main-title-light'));
	}
	Z.debug(title);
	newItem.title = title;
	newItem.url = url;

	let matchInfo;
	if ((matchInfo = title.match(/Article (\S+) - (Code.+)/i))) {
		// Codes
		let [, codeNumber, code] = matchInfo;
		newItem.code = code;
		newItem.codeNumber = codeNumber;
	}
	else if ((matchInfo = title.match(/(LOI|Décret)(?: n[o°](\s*[0-9-]+))? du (([0-9]+) (janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre) ([0-9z]+))/i))) {
		// Lois
		let [, , code, date] = matchInfo;
		newItem.code = code; // publicLawNumber non défini
		newItem.date = date;
	}
	else if ((matchInfo = title.match(/(Délibération) ([0-9-]+) du (([0-9]+) (.*) ([0-9]+))/i))) {
		// CNIL
		let [, nameOfAct, code, date] = matchInfo;
		newItem.nameOfAct = nameOfAct + ' de la Commission Nationale de l\'Informatique et des Libertés';
		newItem.code = code;
		newItem.date = date;
	}

	newItem.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.legifrance.gouv.fr/affichJuriConst.do?oldAction=rechJuriConst&idTexte=CONSTEXT000026458384&fastReqId=79382296&fastPos=1",
		"items": [
			{
				"itemType": "case",
				"title": "Décision 2012-274 QPC - 28 septembre 2012 - Consorts G. [Calcul de l'indemnité de réduction due par le donataire ou le légataire d'une exploitation agricole en Alsace-Moselle] - Conformité",
				"creators": [],
				"date": "28 septembre 2012",
				"accessDate": "CURRENT_TIMESTAMP",
				"court": "Conseil constitutionnel",
				"docketNumber": "Décision 2012-274 QPC",
				"extra": "Consorts G. [Calcul de l'indemnité de réduction due par le donataire ou le légataire d'une exploitation agricole en Alsace-Moselle]",
				"libraryCatalog": "Légifrance",
				"url": "http://www.legifrance.gouv.fr/affichJuriConst.do?oldAction=rechJuriConst&idTexte=CONSTEXT000026458384&fastReqId=79382296&fastPos=1",
				"attachments": [
					{
						"title": "Document en RTF",
						"mimeType": "application/rtf"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.legifrance.gouv.fr/affichJuriAdmin.do?oldAction=rechJuriAdmin&idTexte=CETATEXT000026845833&fastReqId=1276712822&fastPos=1",
		"items": [
			{
				"itemType": "case",
				"title": "Tribunal des Conflits, , 17/12/2012, C3871",
				"creators": [],
				"date": "17/12/2012",
				"accessDate": "CURRENT_TIMESTAMP",
				"court": "Tribunal des Conflits",
				"docketNumber": "C3871",
				"libraryCatalog": "Légifrance",
				"url": "http://www.legifrance.gouv.fr/affichJuriAdmin.do?oldAction=rechJuriAdmin&idTexte=CETATEXT000026845833&fastReqId=1276712822&fastPos=1",
				"attachments": [
					{
						"title": "Document en RTF",
						"mimeType": "application/rtf"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.legifrance.gouv.fr/affichJuriAdmin.do?oldAction=rechJuriAdmin&idTexte=CETATEXT000021750743&fastReqId=754258727&fastPos=1",
		"items": [
			{
				"itemType": "case",
				"title": "Tribunal Administratif de Nantes, 5ème chambre, 17/12/2009, 0802183",
				"creators": [],
				"date": "17/12/2009",
				"accessDate": "CURRENT_TIMESTAMP",
				"court": "Tribunal Administratif de Nantes, 5ème chambre",
				"docketNumber": "0802183",
				"libraryCatalog": "Légifrance",
				"url": "http://www.legifrance.gouv.fr/affichJuriAdmin.do?oldAction=rechJuriAdmin&idTexte=CETATEXT000021750743&fastReqId=754258727&fastPos=1",
				"attachments": [
					{
						"title": "Document en RTF",
						"mimeType": "application/rtf"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.legifrance.gouv.fr/affichJuriAdmin.do?oldAction=rechJuriAdmin&idTexte=CETATEXT000026925589&fastReqId=1836722737&fastPos=1",
		"items": [
			{
				"itemType": "case",
				"title": "Cour administrative d'appel de Bordeaux, 2ème chambre (formation à 3), 08/01/2013, 11BX01796, Inédit au recueil Lebon",
				"creators": [],
				"date": "08/01/2013",
				"accessDate": "CURRENT_TIMESTAMP",
				"court": "Cour administrative d'appel de Bordeaux",
				"docketNumber": "11BX01796",
				"extra": "2ème chambre (formation à 3)",
				"libraryCatalog": "Légifrance",
				"reporter": "Inédit au recueil Lebon",
				"url": "http://www.legifrance.gouv.fr/affichJuriAdmin.do?oldAction=rechJuriAdmin&idTexte=CETATEXT000026925589&fastReqId=1836722737&fastPos=1",
				"attachments": [
					{
						"title": "Document en RTF",
						"mimeType": "application/rtf"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.legifrance.gouv.fr/affichJuriJudi.do?oldAction=rechJuriJudi&idTexte=JURITEXT000026815591&fastReqId=673705389&fastPos=2",
		"items": [
			{
				"itemType": "case",
				"title": "Cour de cassation, Chambre mixte, 21 décembre 2012, 12-15.063, Publié au bulletin",
				"creators": [],
				"date": "21 décembre 2012",
				"accessDate": "CURRENT_TIMESTAMP",
				"court": "Cour de cassation",
				"docketNumber": "12-15.063",
				"extra": "Chambre mixte",
				"libraryCatalog": "Légifrance",
				"reporter": "Publié au bulletin",
				"url": "http://www.legifrance.gouv.fr/affichJuriJudi.do?oldAction=rechJuriJudi&idTexte=JURITEXT000026815591&fastReqId=673705389&fastPos=2",
				"attachments": [
					{
						"title": "Document en RTF",
						"mimeType": "application/rtf"
					}
				],
				"tags": [
					"Cour de cassation"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.legifrance.gouv.fr/affichJuriJudi.do?oldAction=rechJuriJudi&idTexte=JURITEXT000026870360&fastReqId=1277546473&fastPos=1",
		"items": [
			{
				"itemType": "case",
				"title": "Cour d'appel de Limoges, 27 décembre 2012, 11/01637",
				"creators": [],
				"date": "27 décembre 2012",
				"accessDate": "CURRENT_TIMESTAMP",
				"court": "Cour d'appel de Limoges",
				"docketNumber": "11/01637",
				"libraryCatalog": "Légifrance",
				"url": "http://www.legifrance.gouv.fr/affichJuriJudi.do?oldAction=rechJuriJudi&idTexte=JURITEXT000026870360&fastReqId=1277546473&fastPos=1",
				"attachments": [
					{
						"title": "Document en RTF",
						"mimeType": "application/rtf"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.legifrance.gouv.fr/affichJuriJudi.do?oldAction=rechJuriJudi&idTexte=JURITEXT000020391875&fastReqId=1321603064&fastPos=9",
		"items": [
			{
				"itemType": "case",
				"title": "Conseil de prud'hommes de Bordeaux, 13 janvier 2009, 04/00973",
				"creators": [],
				"date": "13 janvier 2009",
				"accessDate": "CURRENT_TIMESTAMP",
				"court": "Conseil de prud'hommes de Bordeaux",
				"docketNumber": "04/00973",
				"libraryCatalog": "Légifrance",
				"url": "http://www.legifrance.gouv.fr/affichJuriJudi.do?oldAction=rechJuriJudi&idTexte=JURITEXT000020391875&fastReqId=1321603064&fastPos=9",
				"attachments": [
					{
						"title": "Document en RTF",
						"mimeType": "application/rtf"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.legifrance.gouv.fr/affichJuriJudi.do?oldAction=rechJuriJudi&idTexte=JURITEXT000026304473&fastReqId=2146436360&fastPos=11",
		"items": [
			{
				"itemType": "case",
				"title": "Tribunal des conflits, civile, 14 mai 2012, 12-03.836, Publié au bulletin",
				"creators": [],
				"date": "14 mai 2012",
				"accessDate": "CURRENT_TIMESTAMP",
				"court": "Tribunal des conflits",
				"docketNumber": "12-03.836",
				"libraryCatalog": "Légifrance",
				"reporter": "Publié au bulletin",
				"url": "http://www.legifrance.gouv.fr/affichJuriJudi.do?oldAction=rechJuriJudi&idTexte=JURITEXT000026304473&fastReqId=2146436360&fastPos=11",
				"attachments": [
					{
						"title": "Document en RTF",
						"mimeType": "application/rtf"
					}
				],
				"tags": [
					"civile"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.legifrance.gouv.fr/affichCodeArticle.do?idArticle=LEGIARTI000006419320&cidTexte=LEGITEXT000006070721&dateTexte=20130114&fastPos=2&fastReqId=490815339&oldAction=rechCodeArticle",
		"items": [
			{
				"itemType": "statute",
				"title": "Code civil - Article 16",
				"creators": [],
				"accessDate": "CURRENT_TIMESTAMP",
				"code": "Code civil",
				"codeNumber": "16",
				"libraryCatalog": "Légifrance",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.legifrance.gouv.fr/affichCnil.do?oldAction=rechExpCnil&id=CNILTEXT000017653865&fastReqId=131680152&fastPos=1",
		"items": [
			{
				"itemType": "statute",
				"title": "Délibération de la Commission Nationale de l'Informatique et des Libertés",
				"nameOfAct": "Délibération de la Commission Nationale de l'Informatique et des Libertés",
				"creators": [],
				"date": "04 février 1997",
				"accessDate": "CURRENT_TIMESTAMP",
				"code": "97-008",
				"libraryCatalog": "Légifrance",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.legifrance.gouv.fr/affichJuriAdmin.do?oldAction=rechJuriAdmin&idTexte=CETATEXT000026910036&fastReqId=1849242527&fastPos=10",
		"items": [
			{
				"itemType": "case",
				"title": "Conseil d'État, 1ère et 6ème sous-sections réunies, 07/01/2013, 343126",
				"creators": [],
				"date": "07/01/2013",
				"accessDate": "CURRENT_TIMESTAMP",
				"court": "Conseil d'État",
				"docketNumber": "343126",
				"extra": "1ère et 6ème sous-sections réunies",
				"libraryCatalog": "Légifrance",
				"url": "http://www.legifrance.gouv.fr/affichJuriAdmin.do?oldAction=rechJuriAdmin&idTexte=CETATEXT000026910036&fastReqId=1849242527&fastPos=10",
				"attachments": [
					{
						"title": "Document en RTF",
						"mimeType": "application/rtf"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.legifrance.gouv.fr/affichJuriAdmin.do?oldAction=rechJuriAdmin&idTexte=CETATEXT000026910028&fastReqId=726489675&fastPos=15",
		"items": [
			{
				"itemType": "case",
				"title": "Conseil d'État, 10ème sous-section jugeant seule, 28/12/2012, 331405, Inédit au recueil Lebon",
				"creators": [],
				"date": "28/12/2012",
				"accessDate": "CURRENT_TIMESTAMP",
				"court": "Conseil d'État",
				"docketNumber": "331405",
				"extra": "10ème sous-section jugeant seule",
				"libraryCatalog": "Légifrance",
				"reporter": "Inédit au recueil Lebon",
				"url": "http://www.legifrance.gouv.fr/affichJuriAdmin.do?oldAction=rechJuriAdmin&idTexte=CETATEXT000026910028&fastReqId=726489675&fastPos=15",
				"attachments": [
					{
						"title": "Document en RTF",
						"mimeType": "application/rtf"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.legifrance.gouv.fr/affichTexte.do?cidTexte=JORFTEXT000026871286&fastPos=1&fastReqId=217867052&categorieLien=id&oldAction=rechTexte",
		"items": [
			{
				"itemType": "statute",
				"title": "LOI n° 2012-1561 du 31 décembre 2012 relative à la représentation communale dans les communautés de communes et d'agglomération",
				"creators": [],
				"date": "31 décembre 2012",
				"accessDate": "CURRENT_TIMESTAMP",
				"code": "2012-1561",
				"libraryCatalog": "Légifrance",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.legifrance.gouv.fr/affichTexte.do?cidTexte=JORFTEXT000000320901&fastPos=4&fastReqId=702580559&categorieLien=id&oldAction=rechTexte",
		"items": [
			{
				"itemType": "statute",
				"title": "Loi n°85-1483 du 31 décembre 1985 AUTORISANT L'APPROBATION D'UN ACCORD DE COOPERATION EN MATIERE ECONOMIQUE ET FINANCIERE ENTRE LE GOUVERNEMENT DE LA REPUBLIQUE FRANCAISE ET LE GOUVERNEMENT DE LA REPUBLIQUE GABONAISE,SIGNE A PARIS LE 14-04-1983",
				"creators": [],
				"date": "31 décembre 1985",
				"accessDate": "CURRENT_TIMESTAMP",
				"code": "85-1483",
				"libraryCatalog": "Légifrance",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000042338158",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Article L511-18 - Code de la construction et de l'habitation",
				"creators": [],
				"code": "Code de la construction et de l'habitation",
				"codeNumber": "L511-18",
				"url": "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000042338158",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.legifrance.gouv.fr/search/all?tab_selection=all&searchField=ALL&query=corps&page=1&init=true",
		"items": "multiple"
	}
]
/** END TEST CASES **/
