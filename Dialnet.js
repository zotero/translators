{
	"translatorID": "938ccabb-e297-4092-aa15-22b6511bbd0f",
	"label": "Dialnet",
	"creator": "Philipp Zumstein",
	"target": "^https?://dialnet\\.unirioja\\.es/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-01-05 20:54:41"
}

/*
	***** BEGIN LICENSE BLOCK *****
	
	Copyright © 2016 Philipp Zumstein
	
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
	if (url.includes('/servlet/articulo')) {
		return "journalArticle";
	}
	else if (url.includes('/servlet/libro')) {
		return "book";
	}
	else if (url.includes('/servlet/tesis')) {
		return "thesis";
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//p/span[@class="titulo"]/a');
	for (var i = 0; i < rows.length; i++) {
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
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (!items) {
				return;
			}
			var articles = [];
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, scrape);
		});
	}
	else {
		scrape(doc, url);
	}
}

function scrape(doc, url) {
	var creators = doc.querySelectorAll('meta[name="DC.creator"]');
	var abstracts = doc.querySelectorAll('meta[name="DC.description"]');
	// Abstracts appear in up to three languages
	var abstractArray = [];
	for (let abstract of abstracts) {
		abstract = abstract.content.replace(/\n/g, " ");
		abstractArray.push(abstract);
	}
	abstracts = abstractArray.join("\n");
	
	var translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setHandler('itemDone', function (obj, item) {
		item.url = url;
		item.abstractNote = abstracts;
		// Delete generic abstract as "Información del artículo <title>"
		if (item.abstractNote && item.abstractNote.includes(item.title) && item.abstractNote.length < item.title.length + 30) {
			delete item.abstractNote;
		}
		// Swap out authors for DC authors which have proper commas
		if (item.creators.length == creators.length) {
			item.creators = [];
			for (let creator of creators) {
				creator = creator.content;
				item.creators.push(ZU.cleanAuthor(creator, "author", true));
			}
		}

		// in case of double issue e.g. "3-4" wrong issue number in Embedded Metadata e,g. "3"
		// clean issue number in case of multiple download
		var issue = ZU.xpathText(doc, '//*[@id="informacion"]//a[contains(text(), "Nº.")]');
		if (issue) {
			// e.g. Vol. 89, Nº. 3-4, 2012
			item.issue = issue.split('Nº.')[1].split(',')[0];
		}
	
		// Delete generic keywords
		item.tags = [];
		item.complete();
	});
	translator.getTranslatorObject(function (trans) {
		trans.doWeb(doc, url);
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://dialnet.unirioja.es/servlet/libro?codigo=293780",
		"items": [
			{
				"itemType": "book",
				"title": "Libres, buenos y justos como miembros de un mismo cuerpo: lecciones de teoría del derecho y de derecho natural",
				"creators": [
					{
						"firstName": "Julián",
						"lastName": "Vara Martín",
						"creatorType": "author"
					}
				],
				"date": "2007",
				"ISBN": "9788430945450",
				"language": "spa",
				"libraryCatalog": "dialnet.unirioja.es",
				"publisher": "Tecnos",
				"shortTitle": "Libres, buenos y justos como miembros de un mismo cuerpo",
				"url": "https://dialnet.unirioja.es/servlet/libro?codigo=293780",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
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
		"url": "https://dialnet.unirioja.es/servlet/articulo?codigo=3661304",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Juicios, discursos y acción política en grupos de jóvenes estudiantes universitarios de Bogotá",
				"creators": [
					{
						"firstName": "Martha Cecilia",
						"lastName": "Lozano Ardila",
						"creatorType": "author"
					},
					{
						"firstName": "Sara Victoria",
						"lastName": "Alvarado Salgado",
						"creatorType": "author"
					}
				],
				"date": "2011",
				"ISSN": "1692-715X",
				"abstractNote": "This article presents the outcome of research conducted between 2006 and 2009 on speeches and policy action in seven groups of young university students in Bogotá. Theoretical, epistemological and methodological research was supported by the approach of Hannah Arendt (2001a, 2001b), were supplemented by the insights of Kohn (2005), Brunet (2007), Sánchez (2003), Rosenthal (2006) and Fraser (1997, 2008). The research was developed from four main categories: conceptions of political citizenship; constraints of politics, democracy and citizenship; trigger political action by young people and forms of political action by young people. It concludes with the need for education for political participation and ethics in Colombia reconfiguration.\nEn este artículo se presentan los resultados de la investigación llevada a cabo entre 2006 y 2009 sobre discursos y acción política en siete grupos de jóvenes estudiantes universitarios de Bogotá. Teórica, epistemológica y metodológicamente, se sustentó la investigación en los planteamientos de Hannah Arendt (2001a, 2001b), se complementaron con las comprensiones de Kohn (2005), Brunet (2007), Sánchez (2003), Greppi (2006) y Fraser (1997, 2008). El trabajo se desarrolló desde cuatro categorías fundamentales: concepciones de política, ciudadanía; condicionantes de la política, democracia y la ciudadanía; detonantes de la acción política del los colectivos de jóvenes y las formas de acción política de los jóvenes y las jóvenes. Se Concluye con la necesidad de una educación para la participación política y la reconfiguración ética en Colombia.\nEste artigo apresenta os resultados de uma pesquisa realizada entre 2006 e 2009, em discursos e ação política em sete grupos de jovens universitários em Bogotá. Teóricas, epistemológicas e metodológicas de pesquisa foi suportada pela abordagem de Hannah Arendt (2001a, 2001b), foram complementadas com as idéias de Kohn (2005), Brunet (2007), Sánchez (2003), Rosenthal (2006) e Fraser (1997, 2008). O trabalho foi desenvolvido a partir de quatro categorias principais: as concepções de cidadania política; restrições da política, da democracia e da cidadania; desencadear uma ação política por parte dos jovens e das formas de ação política dos jovens. Conclui-se com a necessidade de educação para a participação política e ética na reconfiguração da Colômbia.",
				"issue": "1",
				"language": "spa",
				"libraryCatalog": "dialnet.unirioja.es",
				"pages": "101-113",
				"publicationTitle": "Revista Latinoamericana de Ciencias Sociales, Niñez y Juventud",
				"url": "https://dialnet.unirioja.es/servlet/articulo?codigo=3661304",
				"volume": "9",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
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
		"url": "http://dialnet.unirioja.es/buscar/documentos?querysDismax.DOCUMENTAL_TODO=politica",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://dialnet.unirioja.es/ejemplar/381860",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://dialnet.unirioja.es/servlet/articulo?codigo=4251373",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Secularisation as a challenge for a contemporary order theology International Theological Symposium as part of the research project \"Transmission of Faith in social and Religious Transformation Processes\".",
				"creators": [
					{
						"firstName": "Ulrich",
						"lastName": "Engel",
						"creatorType": "author"
					}
				],
				"date": "2012",
				"ISSN": "1123-5772",
				"issue": "3-4",
				"language": "mul",
				"libraryCatalog": "dialnet.unirioja.es",
				"pages": "659-666",
				"publicationTitle": "Angelicum",
				"url": "https://dialnet.unirioja.es/servlet/articulo?codigo=4251373",
				"volume": "89",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
