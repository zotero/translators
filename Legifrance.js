{
	"translatorID": "2dc0b23d-64d8-4933-b629-5c003451ccf7",
	"label": "Légifrance",
	"creator": "Guillaume Adreani",
	"target": "^https?://(www.)?legifrance\\.gouv\\.fr/",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2020-04-06 23:03:28"
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

var legifrancecaseRegexp = /https?:\/\/(www.)?legifrance\\.gouv\\.fr\/.+JURITEXT|CETATEXT|CONSTEXT.+/;
// Détection occurences multiples uniquement pour la jurisprudence ... pour l'instant

function detectWeb(doc, url) {
	if (url.match(/.CETATEXT|CONSTEXT|JURITEXT./)) { // Détection jurisprudence
		return "case";
	} else if (url.match(/LEGIARTI|affichCodeArticle|affichTexteArticle|KALICONT|JORFTEXT|CNILTEXT/)) { // Détection textes législatifs
		return "statute"; // Détection lois et codes
	} else if (url.match(/rechJuriConst|rechExpJuriConst|rechJuriAdmin|rechExpJuriAdmin|rechJuriJudi|rechExpJuriJudi/)) { // Détection occurences multiples uniquement pour la jurisprudence
		return "multiple"; // occurences multiples
	} else return false;
}

function scrapecase(doc) { //Jurisprudence
	var newItem = new Zotero.Item("case");
	
	// Paramètres communs
	var numero, date, formation, cour, publication, nature;
	
	var title = ZU.xpathText(doc, '//h2[@class="title"]');
	newItem.title = title;
	newItem.url = doc.location.href;
	var rtfurl = ZU.xpathText(doc, '//a[contains(text(), "Télécharger")]/@href');
	if (rtfurl) {
		newItem.attachments = [{
			url: "http://www.legifrance.gouv.fr/" + rtfurl,
			title: "Document en RTF",
			mimeType: "application/rtf"
		}];
	}
	
	// Situation selon les juridictions
	
	var a;// Conseil constitutionnel
	a = title.match(/(.*) - (.*) - (.*) - (.*)/);
	if (a) {
		numero = a[1];
		date = a[2];
		var texteparties = a[3];
		formation = a[4];
		newItem.court = 'Conseil constitutionnel';
		newItem.docketNumber = numero;
		newItem.date = date;
		newItem.extra = texteparties;
	}
	
	var b;// Conseil d'État avec indication de publication
	b = title.match(/(Conseil d'État), (.*), (s*[0-9/]+), (s*[0-9]+), (.*Lebon)/);
	if (b) {
		cour = b[1];
		formation = b[2];
		date = b[3];
		numero = b[4];
		publication = b[5];
		newItem.court = 'Conseil d\'État';
		newItem.extra = formation;
		newItem.date = date;
		newItem.docketNumber = numero;
		newItem.reporter = publication;
	}

	var c;// Conseil d'État sans indication de publication
	c = title.match(/(Conseil d'État), (.*), (s*[0-9/]+), (s*[0-9]+)/);
	if (c) {
		formation = c[2];
		date = c[3];
		numero = c[4];
		newItem.court = 'Conseil d\'État';
		newItem.extra = formation;
		newItem.date = date;
		newItem.docketNumber = numero;
	}
	
	var d;// Tribunal des conflits (jp administrative)
	d = title.match(/(Tribunal des Conflits), , (s*[0-9/]+), (.*)/);
	if (d) {
		date = d[2];
		numero = d[3];
		newItem.court = 'Tribunal des Conflits';
		newItem.date = date;
		newItem.docketNumber = numero;
	}
	
	var e;// Cours administratives d'appel avec publication // très rares cas sans publication
	e = title.match(/(Cour administrative .*), (.*), (s*[0-9/]+), (.*), (.*Lebon)/);
	if (e) {
		cour = e[1];
		formation = e[2];
		date = e[3];
		numero = e[4];
		publication = e[5];
		newItem.court = cour;
		newItem.extra = formation;
		newItem.date = date;
		newItem.docketNumber = numero;
		newItem.reporter = publication;
	}
	
	var f; // tribunaux administratifs avec chambre
	f = title.match(/(|Tribunal Administratif|administratif.*), (.*chambre), (s*[0-9/]+), (s*[0-9]+)/);
	if (f) {
		cour = f[1];
		formation = f[2];
		date = f[3];
		numero = f[4];
		newItem.court = 'Tribunal ' + cour;
		newItem.date = date;
		newItem.docketNumber = numero;
	}
	
	var g; // tribunaux administratifs sans chambre avec publication
	g = title.match(/(Tribunal Administratif|administratif.*), du (.*), (s*[0-9-]+), (.*Lebon)/);
	if (g) {
		cour = g[1];
		date = g[2];
		numero = g[3];
		publication = g[4];
		newItem.court = 'Tribunal ' + cour;
		newItem.date = date;
		newItem.docketNumber = numero;
		newItem.reporter = publication;
	}
	
	// Note : présence d'autres cas pour les TA
	
	var h; // Cour de cassation
	h = title.match(/(Cour de cassation), (.*), (.*), (s*[0-9-. ]+), (.*)/);
	if (h) {
		nature = h[1];
		formation = h[2];
		date = h[3];
		numero = h[4];
		publication = h[5];
		newItem.court = 'Cour de cassation';
		if (nature) newItem.tags.push(nature);
		newItem.extra = formation;
		newItem.date = date;
		newItem.docketNumber = numero;
		newItem.reporter = publication;
	}
	
	var i; // cours d'appel et tribunaux
	i = title.match(/(Cour d'appel.*|Tribunal.*|Conseil.*|Chambre.*|Juridiction.*|Commission.*|Cour d'assises.*) de (.*), (.*), (s*[0-9/]+)/);
	if (i) {
		cour = i[1];
		var lieu = i[2];
		date = i[3];
		numero = i[4];
		newItem.court = cour + ' de ' + lieu;
		newItem.date = date;
		newItem.docketNumber = numero;
	}
	
	var j;// Tribunal des conflits - Base CASS
	j = title.match(/(Tribunal des conflits), (.*), (.*), (s*[0-9-. ]+), (.*)/);
	if (j) {
		nature = j[2];
		date = j[3];
		numero = j[4];
		publication = j[5];
		newItem.court = 'Tribunal des conflits';
		if (nature) newItem.tags.push(nature);
		newItem.date = date;
		newItem.docketNumber = numero;
		newItem.reporter = publication;
	}
	newItem.complete();
}


function scrapelegislation(doc) { //Législation
	var code, date, UnParam;
	var newItem = new Zotero.Item("statute");
	
	var title = ZU.xpathText(doc, '//h2[@class="title"]');
	newItem.title = title;
	var MonUrl = doc.location.href;
	var UrlParam = MonUrl.substring(MonUrl.indexOf("?")+1).split("&");
	
	if (MonUrl.indexOf("jsessionid") != -1) {
		MonUrl = MonUrl.substring(0,MonUrl.indexOf("jsessionid")-1)+"?";
	} else {
		MonUrl = MonUrl.substring(0,MonUrl.indexOf("?")+1);
	}
	for (UnParam in UrlParam) {
		if ((UrlParam[UnParam].indexOf("dateTexte") == -1)&&(UrlParam[UnParam].indexOf("categorieLien") == -1)) {
			MonUrl = MonUrl + UrlParam[UnParam]+"&";
		}
	}
	MonUrl = MonUrl.substring(0,MonUrl.length-1);
	newItem.url = MonUrl;
	newItem.accessDate = 'CURRENT_TIMESTAMP';
	
	//
	var a; // Codes
	a = title.match(/(Code.*) - Article (.*)/);
	if (a) {
		code = a[1];
		var codeNumber = a[2];
		newItem.code = code;
		newItem.codeNumber = codeNumber;
	}
	
	var b; // Lois 1er modèle
	b = title.match(/(LOI|Décret) n[o°] (s*[0-9-]+) du ((s*[0-9]+) (janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre) (s*[0-9z]+))/);
	if (b) {
		code = b[2];
		date = b[3];
		newItem.code = code; // publicLawNumber non défini
		newItem.date = date;
	}
	
	var c; // Lois 2ème modèle
	c = title.match(/(Loi|Décret) n[o°](s*[0-9-]+) du ((s*[0-9]+) (janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre) (s*[0-9z]+))/);
	if (c) {
		code = c[2];
		date = c[3];
		newItem.code = code; // publicLawNumber non défini
		newItem.date = date;
	}
	
	var e; // CNIL
	e = title.match(/(Délibération) (s*[0-9-]+) du ((s*[0-9]+) (.*) (s*[0-9]+))/);
	if (e) {
		var nameOfAct = e[1];
		code = e[2];
		date = e[3];
		newItem.nameOfAct = nameOfAct + ' de la Commission Nationale de l\'Informatique et des Libertés';
		newItem.code = code;
		newItem.date = date;
	}
	
	newItem.complete();
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "case") {
		scrapecase(doc, url);
	} else if (detectWeb(doc, url) == "statute") {
		scrapelegislation(doc, url);
	} else if (detectWeb(doc, url) == "multiple") {
		var items = Zotero.Utilities.getItemArray(doc, doc, legifrancecaseRegexp);
		var articles = [];
		Zotero.selectItems(items, function (items) {
			if (!items) {
				return;
			}
			for (var i in items) {
				articles.push(i);
			}
			Zotero.Utilities.processDocuments(articles, scrapecase);
		});
	}
} /** BEGIN TEST CASES **/

var testCases = [
	{
		"type": "web",
		"url": "http://www.legifrance.gouv.fr/affichJuriConst.do?oldAction=rechJuriConst&idTexte=CONSTEXT000026458384&fastReqId=79382296&fastPos=1",
		"items": [
			{
				"itemType": "case",
				"creators": [],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Document en RTF",
						"mimeType": "application/rtf"
					}
				],
				"title": "Décision 2012-274 QPC - 28 septembre 2012 - Consorts G. [Calcul de l'indemnité de réduction due par le donataire ou le légataire d'une exploitation agricole en Alsace-Moselle] - Conformité",
				"accessDate": "CURRENT_TIMESTAMP",
				"url": "http://www.legifrance.gouv.fr/affichJuriConst.do?oldAction=rechJuriConst&idTexte=CONSTEXT000026458384&fastReqId=79382296&fastPos=1",
				"court": "Conseil constitutionnel",
				"docketNumber": "Décision 2012-274 QPC",
				"date": "28 septembre 2012",
				"extra": "Consorts G. [Calcul de l'indemnité de réduction due par le donataire ou le légataire d'une exploitation agricole en Alsace-Moselle]",
				"libraryCatalog": "Légifrance"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.legifrance.gouv.fr/affichJuriAdmin.do?oldAction=rechJuriAdmin&idTexte=CETATEXT000026845833&fastReqId=1276712822&fastPos=1",
		"items": [
			{
				"itemType": "case",
				"creators": [],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Document en RTF",
						"mimeType": "application/rtf"
					}
				],
				"title": "Tribunal des Conflits, , 17/12/2012, C3871",
				"accessDate": "CURRENT_TIMESTAMP",
				"url": "http://www.legifrance.gouv.fr/affichJuriAdmin.do?oldAction=rechJuriAdmin&idTexte=CETATEXT000026845833&fastReqId=1276712822&fastPos=1",
				"court": "Tribunal des Conflits",
				"date": "17/12/2012",
				"docketNumber": "C3871",
				"libraryCatalog": "Légifrance"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.legifrance.gouv.fr/affichJuriAdmin.do?oldAction=rechJuriAdmin&idTexte=CETATEXT000021750743&fastReqId=754258727&fastPos=1",
		"items": [
			{
				"itemType": "case",
				"creators": [],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Document en RTF",
						"mimeType": "application/rtf"
					}
				],
				"title": "Tribunal Administratif de Nantes, 5ème chambre, 17/12/2009, 0802183",
				"accessDate": "CURRENT_TIMESTAMP",
				"url": "http://www.legifrance.gouv.fr/affichJuriAdmin.do?oldAction=rechJuriAdmin&idTexte=CETATEXT000021750743&fastReqId=754258727&fastPos=1",
				"court": "Tribunal Administratif de Nantes, 5ème chambre",
				"date": "17/12/2009",
				"docketNumber": "0802183",
				"libraryCatalog": "Légifrance"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.legifrance.gouv.fr/affichJuriAdmin.do?oldAction=rechJuriAdmin&idTexte=CETATEXT000026925589&fastReqId=1836722737&fastPos=1",
		"items": [
			{
				"itemType": "case",
				"creators": [],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Document en RTF",
						"mimeType": "application/rtf"
					}
				],
				"title": "Cour administrative d'appel de Bordeaux, 2ème chambre (formation à 3), 08/01/2013, 11BX01796, Inédit au recueil Lebon",
				"accessDate": "CURRENT_TIMESTAMP",
				"url": "http://www.legifrance.gouv.fr/affichJuriAdmin.do?oldAction=rechJuriAdmin&idTexte=CETATEXT000026925589&fastReqId=1836722737&fastPos=1",
				"court": "Cour administrative d'appel de Bordeaux",
				"extra": "2ème chambre (formation à 3)",
				"date": "08/01/2013",
				"docketNumber": "11BX01796",
				"reporter": "Inédit au recueil Lebon",
				"libraryCatalog": "Légifrance"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.legifrance.gouv.fr/affichJuriJudi.do?oldAction=rechJuriJudi&idTexte=JURITEXT000026815591&fastReqId=673705389&fastPos=2",
		"items": [
			{
				"itemType": "case",
				"creators": [],
				"notes": [],
				"tags": [
					"Cour de cassation"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Document en RTF",
						"mimeType": "application/rtf"
					}
				],
				"title": "Cour de cassation, Chambre mixte, 21 décembre 2012, 12-15.063, Publié au bulletin",
				"url": "http://www.legifrance.gouv.fr/affichJuriJudi.do?oldAction=rechJuriJudi&idTexte=JURITEXT000026815591&fastReqId=673705389&fastPos=2",
				"court": "Cour de cassation",
				"extra": "Chambre mixte",
				"date": "21 décembre 2012",
				"docketNumber": "12-15.063",
				"reporter": "Publié au bulletin",
				"libraryCatalog": "Légifrance",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.legifrance.gouv.fr/affichJuriJudi.do?oldAction=rechJuriJudi&idTexte=JURITEXT000026870360&fastReqId=1277546473&fastPos=1",
		"items": [
			{
				"itemType": "case",
				"creators": [],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Document en RTF",
						"mimeType": "application/rtf"
					}
				],
				"title": "Cour d'appel de Limoges, 27 décembre 2012, 11/01637",
				"accessDate": "CURRENT_TIMESTAMP",
				"url": "http://www.legifrance.gouv.fr/affichJuriJudi.do?oldAction=rechJuriJudi&idTexte=JURITEXT000026870360&fastReqId=1277546473&fastPos=1",
				"court": "Cour d'appel de Limoges",
				"date": "27 décembre 2012",
				"docketNumber": "11/01637",
				"libraryCatalog": "Légifrance"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.legifrance.gouv.fr/affichJuriJudi.do?oldAction=rechJuriJudi&idTexte=JURITEXT000020391875&fastReqId=1321603064&fastPos=9",
		"items": [
			{
				"itemType": "case",
				"creators": [],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Document en RTF",
						"mimeType": "application/rtf"
					}
				],
				"title": "Conseil de prud'hommes de Bordeaux, 13 janvier 2009, 04/00973",
				"accessDate": "CURRENT_TIMESTAMP",
				"url": "http://www.legifrance.gouv.fr/affichJuriJudi.do?oldAction=rechJuriJudi&idTexte=JURITEXT000020391875&fastReqId=1321603064&fastPos=9",
				"court": "Conseil de prud'hommes de Bordeaux",
				"date": "13 janvier 2009",
				"docketNumber": "04/00973",
				"libraryCatalog": "Légifrance"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.legifrance.gouv.fr/affichJuriJudi.do?oldAction=rechJuriJudi&idTexte=JURITEXT000026304473&fastReqId=2146436360&fastPos=11",
		"items": [
			{
				"itemType": "case",
				"creators": [],
				"notes": [],
				"tags": [
					"civile"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Document en RTF",
						"mimeType": "application/rtf"
					}
				],
				"title": "Tribunal des conflits, civile, 14 mai 2012, 12-03.836, Publié au bulletin",
				"url": "http://www.legifrance.gouv.fr/affichJuriJudi.do?oldAction=rechJuriJudi&idTexte=JURITEXT000026304473&fastReqId=2146436360&fastPos=11",
				"court": "Tribunal des conflits",
				"date": "14 mai 2012",
				"docketNumber": "12-03.836",
				"reporter": "Publié au bulletin",
				"libraryCatalog": "Légifrance",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.legifrance.gouv.fr/affichCodeArticle.do?idArticle=LEGIARTI000006419320&cidTexte=LEGITEXT000006070721&dateTexte=20130114&fastPos=2&fastReqId=490815339&oldAction=rechCodeArticle",
		"items": [
			{
				"itemType": "statute",
				"creators": [],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"title": "Code civil - Article 16",
				"accessDate": "CURRENT_TIMESTAMP",
				"code": "Code civil",
				"codeNumber": "16",
				"libraryCatalog": "Légifrance"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.legifrance.gouv.fr/affichCnil.do?oldAction=rechExpCnil&id=CNILTEXT000017653865&fastReqId=131680152&fastPos=1",
		"items": [
			{
				"itemType": "statute",
				"creators": [],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"title": "Délibération de la Commission Nationale de l'Informatique et des Libertés",
				"accessDate": "CURRENT_TIMESTAMP",
				"nameOfAct": "Délibération de la Commission Nationale de l'Informatique et des Libertés",
				"code": "97-008",
				"date": "04 février 1997",
				"libraryCatalog": "Légifrance"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.legifrance.gouv.fr/affichJuriAdmin.do?oldAction=rechJuriAdmin&idTexte=CETATEXT000026910036&fastReqId=1849242527&fastPos=10",
		"items": [
			{
				"itemType": "case",
				"creators": [],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Document en RTF",
						"mimeType": "application/rtf"
					}
				],
				"title": "Conseil d'État, 1ère et 6ème sous-sections réunies, 07/01/2013, 343126",
				"accessDate": "CURRENT_TIMESTAMP",
				"url": "http://www.legifrance.gouv.fr/affichJuriAdmin.do?oldAction=rechJuriAdmin&idTexte=CETATEXT000026910036&fastReqId=1849242527&fastPos=10",
				"court": "Conseil d'État",
				"extra": "1ère et 6ème sous-sections réunies",
				"date": "07/01/2013",
				"docketNumber": "343126",
				"libraryCatalog": "Légifrance"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.legifrance.gouv.fr/affichJuriAdmin.do?oldAction=rechJuriAdmin&idTexte=CETATEXT000026910028&fastReqId=726489675&fastPos=15",
		"items": [
			{
				"itemType": "case",
				"creators": [],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Document en RTF",
						"mimeType": "application/rtf"
					}
				],
				"title": "Conseil d'État, 10ème sous-section jugeant seule, 28/12/2012, 331405, Inédit au recueil Lebon",
				"accessDate": "CURRENT_TIMESTAMP",
				"url": "http://www.legifrance.gouv.fr/affichJuriAdmin.do?oldAction=rechJuriAdmin&idTexte=CETATEXT000026910028&fastReqId=726489675&fastPos=15",
				"court": "Conseil d'État",
				"extra": "10ème sous-section jugeant seule",
				"date": "28/12/2012",
				"docketNumber": "331405",
				"reporter": "Inédit au recueil Lebon",
				"libraryCatalog": "Légifrance"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.legifrance.gouv.fr/affichTexte.do?cidTexte=JORFTEXT000026871286&fastPos=1&fastReqId=217867052&categorieLien=id&oldAction=rechTexte",
		"items": [
			{
				"itemType": "statute",
				"creators": [],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"title": "LOI n° 2012-1561 du 31 décembre 2012 relative à la représentation communale dans les communautés de communes et d'agglomération",
				"accessDate": "CURRENT_TIMESTAMP",
				"code": "2012-1561",
				"date": "31 décembre 2012",
				"libraryCatalog": "Légifrance"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.legifrance.gouv.fr/affichTexte.do?cidTexte=JORFTEXT000000320901&fastPos=4&fastReqId=702580559&categorieLien=id&oldAction=rechTexte",
		"items": [
			{
				"itemType": "statute",
				"creators": [],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"title": "Loi n°85-1483 du 31 décembre 1985 AUTORISANT L'APPROBATION D'UN ACCORD DE COOPERATION EN MATIERE ECONOMIQUE ET FINANCIERE ENTRE LE GOUVERNEMENT DE LA REPUBLIQUE FRANCAISE ET LE GOUVERNEMENT DE LA REPUBLIQUE GABONAISE,SIGNE A PARIS LE 14-04-1983",
				"accessDate": "CURRENT_TIMESTAMP",
				"code": "85-1483",
				"date": "31 décembre 1985",
				"libraryCatalog": "Légifrance"
			}
		]
	}
]
/** END TEST CASES **/
