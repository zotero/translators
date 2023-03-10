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
	"lastUpdated": "2023-03-10 15:43:05"
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

var legifrancecaseRegexp = /https?:\/\/(www.)?legifrance\\.gouv\\.fr\/.+JURITEXT|CETATEXT|CONSTEXT.+/
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

		var title = ZU.xpathText(doc, '//h1[@class="main-title"]');
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

		var a; // Conseil constitutionnel
		a = title.match(/(.*) - (.*) - (.*) - (.*)/)
		if (a) {
			var numero = a[1];
			var date = a[2];
			var texteparties = a[3]
			var formation = a[4];
			newItem.court = 'Conseil constitutionnel';
			newItem.docketNumber = numero;
			newItem.date = date;
			newItem.extra = texteparties;
		}

		var b; // Conseil d'État avec indication de publication
		b = title.match(/(Conseil d'État), (.*), (s*[0-9/]+), (s*[0-9]+), (.*Lebon)/)
		if (b) {
			var cour = b[1];
			var formation = b[2];
			var date = b[3];
			var numero = b[4];
			var publication = b[5];
		  	newItem.court = 'Conseil d\'État';
			newItem.extra = formation;
			newItem.date = date;
			newItem.docketNumber = numero;
			newItem.reporter = publication;
		}

		var c; // Conseil d'État sans indication de publication
		c = title.match(/(Conseil d'État), (.*), (s*[0-9/]+), (s*[0-9]+)/)
		if (c) {
			var formation = c[2];
			var date = c[3];
			var numero = c[4];
		   	newItem.court = 'Conseil d\'État';
			newItem.extra = formation;
			newItem.date = date;
			newItem.docketNumber = numero;
		}

		var d; // Tribunal des conflits (jp administrative)
		d = title.match(/(Tribunal des Conflits), , (s*[0-9/]+), (.*)/)
		if (d) {
			var date = d[2];
			var numero = d[3];
			newItem.court = 'Tribunal des Conflits';
			newItem.date = date;
			newItem.docketNumber = numero;
		}


		var e; // Cours administratives d'appel avec publication // très rares cas sans publication
		e = title.match(/(Cour administrative .*), (.*), (s*[0-9/]+), (.*), (.*Lebon)/)
		if (e) {
			var cour = e[1];
			var formation = e[2];
			var date = e[3];
			var numero = e[4];
			var publication = e[5];
			newItem.court = cour;
			newItem.extra = formation;
			newItem.date = date;
			newItem.docketNumber = numero;
			newItem.reporter = publication;
		}

		var f; // tribunaux administratifs avec chambre
		f = title.match(/(|Tribunal Administratif|administratif.*), (.*chambre), (s*[0-9/]+), (s*[0-9]+)/)
		if (f) {
			var cour = f[1];
			var formation = f[2];
			var date = f[3];
			var numero = f[4];
			newItem.court = 'Tribunal ' + cour;
			newItem.date = date;
			newItem.docketNumber = numero;
		}

		var g; // tribunaux administratifs sans chambre avec publication
		g = title.match(/(Tribunal Administratif|administratif.*), du (.*), (s*[0-9-]+), (.*Lebon)/)
		if (g) {
			var cour = g[1];
			var date = g[2];
			var numero = g[3];
			var publication = g[4];
			newItem.court = 'Tribunal ' + cour;
			newItem.date = date;
			newItem.docketNumber = numero;
			newItem.reporter = publication;
		}

		// Note : présence d'autres cas pour les TA

		var h; // Cour de cassation
		h = title.match(/(Cour de cassation), (.*), (.*), (s*[0-9-. ]+), (.*)/)
		if (h) {
			var nature = h[1];
			var formation = h[2];
			var date = h[3];
			var numero = h[4];
			var publication = h[5];
			newItem.court = 'Cour de cassation';
			if (nature) newItem.tags.push(nature);
			newItem.extra = formation;
			newItem.date = date;
			newItem.docketNumber = numero;
			newItem.reporter = publication;
		}

		var i; // cours d'appel et tribunaux
		i = title.match(/(Cour d'appel.*|Tribunal.*|Conseil.*|Chambre.*|Juridiction.*|Commission.*|Cour d'assises.*) de (.*), (.*), (s*[0-9/]+)/)
		if (i) {
			var cour = i[1];
			var lieu = i[2];
			var date = i[3];
			var numero = i[4];
			newItem.court = cour + ' de ' + lieu;
			newItem.date = date;
			newItem.docketNumber = numero;
		}

		var j; // Tribunal des conflits - Base CASS
		j = title.match(/(Tribunal des conflits), (.*), (.*), (s*[0-9-. ]+), (.*)/)
		if (j) {
			var nature = j[2];
			var date = j[3];
			var numero = j[4];
			var publication = j[5];
			newItem.court = 'Tribunal des conflits';
			if (nature) newItem.tags.push(nature);
			newItem.date = date;
			newItem.docketNumber = numero;
			newItem.reporter = publication;

		}
		newItem.complete();
	}

	function scrapelegislation(doc, url) { //Législation

		var newItem = new Zotero.Item("statute");

		var title = ZU.xpathText(doc, '/html/head/title');
		newItem.title = title;
		newItem.accessDate = 'CURRENT_TIMESTAMP';

		var a; // Codes
		// exemple titre : Article 16 - Code civil - Légifrance
		a = title.match(/Article (.*) - (Code.*) - Légifrance/)
		if (a) {
			var codeNumber = a[1];  // N° article
			var code = a[2]; // "Code ____"

			newItem.code = code;
			newItem.codeNumber = codeNumber;

			// Reconstruit le nom en "Code ___ - Article ____"
			newItem.nameOfAct = code.concat(" - Article ", codeNumber)
		}

		var b; // Lois 1er modèle
		b = title.match(/(LOI|Décret) n[o°] (s*[0-9-]+) du ((s*[0-9]+) (janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre) (s*[0-9z]+))/)
		if (b) {

			var code = b[2];
			var date = b[3];
			newItem.code = code; // publicLawNumber non défini
			newItem.date = date;

		}

		var c; // Lois 2ème modèle
		c = title.match(/(Loi|Décret) n[o°](s*[0-9-]+) du ((s*[0-9]+) (janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre) (s*[0-9z]+))/)
		if (c) {

			var code = c[2];
			var date = c[3];
			newItem.code = code; // publicLawNumber non défini
			newItem.date = date;

		}

		var e; // CNIL
		e = title.match(/(Délibération) (s*[0-9-]+) du ((s*[0-9]+) (.*) (s*[0-9]+))/)
		if (e) {
			var nameOfAct = e[1];
			var code = e[2];
			var date = e[3];
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
					return true;
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
		"url": "https://www.legifrance.gouv.fr/cons/id/CONSTEXT000026458384/",
		"items": [
			{
				"itemType": "case",
				"caseName": "Décision 2012-274 QPC - 28 septembre 2012 - Consorts G.  [Calcul de l'indemnité de réduction due par le donataire ou le légataire d'une exploitation agricole en Alsace-Moselle] - Conformité",
				"creators": [],
				"dateDecided": "28 septembre 2012",
				"court": "Conseil constitutionnel",
				"docketNumber": "Décision 2012-274 QPC",
				"extra": "Consorts G.  [Calcul de l'indemnité de réduction due par le donataire ou le légataire d'une exploitation agricole en Alsace-Moselle]",
				"url": "https://www.legifrance.gouv.fr/cons/id/CONSTEXT000026458384/",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.legifrance.gouv.fr/ceta/id/CETATEXT000026845833/",
		"items": [
			{
				"itemType": "case",
				"caseName": "Tribunal des Conflits, , 17/12/2012, C3871",
				"creators": [],
				"dateDecided": "17/12/2012",
				"court": "Tribunal des Conflits",
				"docketNumber": "C3871",
				"url": "https://www.legifrance.gouv.fr/ceta/id/CETATEXT000026845833/",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.legifrance.gouv.fr/ceta/id/CETATEXT000021750743/",
		"items": [
			{
				"itemType": "case",
				"caseName": "Tribunal Administratif de Nantes, 5ème chambre, 17/12/2009, 0802183",
				"creators": [],
				"dateDecided": "17/12/2009",
				"court": "Tribunal Administratif de Nantes, 5ème chambre",
				"docketNumber": "0802183",
				"url": "https://www.legifrance.gouv.fr/ceta/id/CETATEXT000021750743/",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.legifrance.gouv.fr/ceta/id/CETATEXT000026925589/",
		"items": [
			{
				"itemType": "case",
				"caseName": "Cour administrative d'appel de Bordeaux, 2ème chambre (formation à 3), 08/01/2013, 11BX01796, Inédit au recueil Lebon",
				"creators": [],
				"dateDecided": "08/01/2013",
				"court": "Cour administrative d'appel de Bordeaux",
				"docketNumber": "11BX01796",
				"extra": "2ème chambre (formation à 3)",
				"reporter": "Inédit au recueil Lebon",
				"url": "https://www.legifrance.gouv.fr/ceta/id/CETATEXT000026925589/",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.legifrance.gouv.fr/juri/id/JURITEXT000026815591/",
		"items": [
			{
				"itemType": "case",
				"caseName": "Cour de cassation, Chambre mixte, 21 décembre 2012, 12-15.063, Publié au bulletin",
				"creators": [],
				"dateDecided": "21 décembre 2012",
				"court": "Cour de cassation",
				"docketNumber": "12-15.063",
				"extra": "Chambre mixte",
				"reporter": "Publié au bulletin",
				"url": "https://www.legifrance.gouv.fr/juri/id/JURITEXT000026815591/",
				"attachments": [],
				"tags": [
					{
						"tag": "Cour de cassation"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.legifrance.gouv.fr/juri/id/JURITEXT000026870360/",
		"items": [
			{
				"itemType": "case",
				"caseName": "Cour d'appel de Limoges, 27 décembre 2012, 11/01637",
				"creators": [],
				"dateDecided": "27 décembre 2012",
				"court": "Cour d'appel de Limoges",
				"docketNumber": "11/01637",
				"url": "https://www.legifrance.gouv.fr/juri/id/JURITEXT000026870360/",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.legifrance.gouv.fr/juri/id/JURITEXT000020391875/",
		"items": [
			{
				"itemType": "case",
				"caseName": "Conseil de prud'hommes de Bordeaux, 13 janvier 2009, 04/00973",
				"creators": [],
				"dateDecided": "13 janvier 2009",
				"court": "Conseil de prud'hommes de Bordeaux",
				"docketNumber": "04/00973",
				"url": "https://www.legifrance.gouv.fr/juri/id/JURITEXT000020391875/",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.legifrance.gouv.fr/juri/id/JURITEXT000026304473/",
		"items": [
			{
				"itemType": "case",
				"caseName": "Tribunal des conflits, civile, 14 mai 2012, 12-03.836, Publié au bulletin",
				"creators": [],
				"dateDecided": "14 mai 2012",
				"court": "Tribunal des conflits",
				"docketNumber": "12-03.836",
				"reporter": "Publié au bulletin",
				"url": "https://www.legifrance.gouv.fr/juri/id/JURITEXT000026304473/",
				"attachments": [],
				"tags": [
					{
						"tag": "civile"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006419320",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Code civil - Article 16",
				"creators": [],
				"code": "Code civil",
				"codeNumber": "16",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.legifrance.gouv.fr/cnil/id/CNILTEXT000017653865/",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Délibération de la Commission Nationale de l'Informatique et des Libertés",
				"creators": [],
				"dateEnacted": "4 février 1997",
				"code": "97-008",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.legifrance.gouv.fr/ceta/id/CETATEXT000026910036/",
		"items": [
			{
				"itemType": "case",
				"caseName": "Conseil d'État, 1ère et 6ème sous-sections réunies, 07/01/2013, 343126",
				"creators": [],
				"dateDecided": "07/01/2013",
				"court": "Conseil d'État",
				"docketNumber": "343126",
				"extra": "1ère et 6ème sous-sections réunies",
				"url": "https://www.legifrance.gouv.fr/ceta/id/CETATEXT000026910036/",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.legifrance.gouv.fr/ceta/id/CETATEXT000026910028/",
		"items": [
			{
				"itemType": "case",
				"caseName": "Conseil d'État, 10ème sous-section jugeant seule, 28/12/2012, 331405, Inédit au recueil Lebon",
				"creators": [],
				"dateDecided": "28/12/2012",
				"court": "Conseil d'État",
				"docketNumber": "331405",
				"extra": "10ème sous-section jugeant seule",
				"reporter": "Inédit au recueil Lebon",
				"url": "https://www.legifrance.gouv.fr/ceta/id/CETATEXT000026910028/",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000026871286",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "LOI n° 2012-1561 du 31 décembre 2012 relative à la représentation communale dans les communautés de communes et d'agglomération (1)",
				"creators": [],
				"dateEnacted": "31 décembre 2012",
				"code": "2012-1561",
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
		"url": "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000035644695",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Code du travail - Article R1234-4",
				"creators": [],
				"code": "Code du travail",
				"codeNumber": "R1234-4",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000035644695/2023-01-25",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Code du travail - Article R1234-4",
				"creators": [],
				"code": "Code du travail",
				"codeNumber": "R1234-4",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
