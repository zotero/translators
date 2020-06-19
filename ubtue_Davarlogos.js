{
	"translatorID": "1bab66b7-fa6d-4004-80bb-a7127beddec3",
	"label": "ubtue_Davarlogos",
	"creator": "Timotheus Kim",
	"target": "^http://publicaciones\\.uap\\.edu.ar/index\\.php/davarlogos/(article|issue)/view",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": false,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2020-06-10 10:37:05"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2020 Universitätsbibliothek Tübingen.  All rights reserved.

	This program is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public License
	along with this program.  If not, see <http://www.gnu.org/licenses/>.

	***** END LICENSE BLOCK *****
*/

function detectWeb(doc, url) {
	if (url.match(/article/))
		return "journalArticle";
	else if (url.match(/\/issue\/view/)) {
		return "multiple";
	}
}

function getSearchResults(doc) {
	let items = {};
    	let found = false;
	let rows = ZU.xpath(doc, '//*[contains(concat( " ", @class, " " ), concat( " ", "title", " " ))]//a')
	for (let i = 0; i < rows.length; ++i) {
		let href = rows[i].href;
		let title = ZU.trimInternal(rows[i].textContent);
        	if (!href || !title) continue;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}


function postProcess(doc, item) {
	let authors = ZU.xpath(doc, '//*[contains(concat( " ", @class, " " ), concat( " ", "authors", " " ))]')
	if (item.creators.length===0) {
		for (let author of authors) {
			item.creators.push(ZU.cleanAuthor(author.textContent, "author"));
		}
	}
	
	let tagentry = ZU.xpathText(doc, '//*[contains(concat( " ", @class, " " ), concat( " ", "keywords", " " ))]');
	if (tagentry) {
		let tags = ZU.unescapeHTML(tagentry.split(/\s*,\s*/));
			for (var i in tags) {
				item.tags.push(tags[i].replace(/^\w/gi,function(m){return m.toUpperCase();}));
		}
	}
	item.title = item.title.replace(' | DavarLogos', '');
	item.volume = ZU.xpathText(doc, '//*[contains(concat( " ", @class, " " ), concat( " ", "title", " " ))]').trim().substr(4, 7).replace('Núm', '');
	item.issue = ZU.xpathText(doc, '//*[contains(concat( " ", @class, " " ), concat( " ", "title", " " ))]').trim().substr(-20, 1);
	item.date = ZU.xpathText(doc, '//*[contains(concat( " ", @class, " " ), concat( " ", "title", " " ))]').trim().substr(-17, 4);
	item.url = attr(doc, '.pdf', 'href');
	item.ISSN = '1666-7832'
	//ToDO scrape item.pages before getSearchResults see e.g. fzpth

}

function invokeOJSTranslator(doc, url) {
	var translator = Zotero.loadTranslator("web");
	translator.setTranslator("99b62ba4-065c-4e83-a5c0-d8cc0c75d388"); //OJS Translator for abstractNote and title
	translator.setDocument(doc);
	translator.setHandler("itemDone", function (t, i) {
		postProcess(doc, i);
		i.complete();
	});
	translator.translate();
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) === "multiple") {
		Zotero.selectItems(getSearchResults(doc), function (items) {
			if (!items) {
				return true;
			}
			var articles = [];
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, invokeOJSTranslator);
		});
	} else
        invokeOJSTranslator(doc, url);
}
	  
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://publicaciones.uap.edu.ar/index.php/davarlogos/article/view/912",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "De pilares y fundamentos: Siete tesis respecto de la hermenéutica del Pentateuco | DavarLogos",
				"creators": [
					{
						"firstName": "Gerald A.",
						"lastName": "Klingbeil",
						"creatorType": "author"
					}
				],
				"date": "2019",
				"ISSN": "1666-7832",
				"abstractNote": "El estudio de la composición del Pentateuco ha estado en el centro de la erudición crítica desde el siglo XIX. Mientras hay un acuerdo general de que la hipótesis documental de Graf-Wellhausen, como fue presentada originalmente, es insostenible, la mayor parte de la investigación del Pentateuco ha trabajado dentro del marco de la existencia de fuentes divergentes que pasaron por una cantidad de cambios editoriales. Considerando la ley física básica de que el ingreso determina la salida, este estudio desafía la suposición básica de la existencia de fuentes divergentes y pide un enfoque nuevo de la hermenéutica del Pentateuco que aborda el texto bíblico en sus propios términos y no niega a priori la noción de nspiración, desafiando así las suposiciones filosóficas y metodológicas de la erudición histórico-crítica. Como punto de partida para esta nueva conversación, ofrece siete tesis que se concentran en una hermenéutica básica como también promete abordajes metodológicos que pueden dirigir este debate importante más allá de las huellas gastadas de la erudición crítica.",
				"issue": "2",
				"language": "es-ES",
				"libraryCatalog": "publicaciones.uap.edu.ar",
				"shortTitle": "De pilares y fundamentos",
				"url": "http://publicaciones.uap.edu.ar/index.php/davarlogos/article/view/912/841",
				"volume": "18",
				"attachments": [
					{
						"title": "Snapshot"
					}
				],
				"tags": [
					{
						"tag": "\n\t\t\t\t\n\t\t\t\t\t\t\t\t\t\tPalabras clave:\n\t\t\t\t\n\t\t\t\t\n\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\tHermenéutica"
					},
					{
						"tag": "Antiguo Testamento"
					},
					{
						"tag": "Graf-Wellhausen"
					},
					{
						"tag": "Método histórico-crítico\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\n\t\t\t"
					},
					{
						"tag": "Pentateuco"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://publicaciones.uap.edu.ar/index.php/davarlogos/article/view/913",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "La brevedad del tiempo y estar casado como si no se lo estuviera | DavarLogos",
				"creators": [
					{
						"firstName": "Laurenţiu",
						"lastName": "Moţ",
						"creatorType": "author"
					}
				],
				"date": "2019",
				"ISSN": "1666-7832",
				"abstractNote": "Este artículo aborda la pregunta de qué quiere decir Pablo en 1 Corintios 7,29 cuando declara que para el tiempo que queda, para los que tienen esposa, debe ser como si no la tuvieran. Esto se puede referir a un principio ético universal, eterno, o a uno limitado por el contexto —uno escatológico, en este caso—. El estudio procede a abordar la pregunta primaria del significado del versículo en tres secciones. La primera analiza lecturas de escritores cristianos primitivos. La segunda examina el lenguaje del texto y se concentra específicamente en el significado, la sintaxis y el aspecto verbal. En la sección tercera y final, el estudio considera el contexto social y filosófico que puede haber conformado las concepciones corintias del matrimonio. Una comparación entre distintos filósofos estoicos sugiere que Pablo procede con una ambivalencia similar sobre el matrimonio, pero es una que está marcada particularmente por la comprensión escatológica. Esto es ubicado una y otra vez sobre y contra el “trasfondo grecorromano del matrimonio”, que está caracterizado por obligaciones sociales y la expectativa de la relación sexual.",
				"issue": "2",
				"language": "es-ES",
				"libraryCatalog": "publicaciones.uap.edu.ar",
				"volume": "18",
				"attachments": [
					{
						"title": "Snapshot"
					}
				],
				"tags": [
					{
						"tag": "\n\t\t\t\t\n\t\t\t\t\t\t\t\t\t\tPalabras clave:\n\t\t\t\t\n\t\t\t\t\n\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\tTiempo del fin"
					},
					{
						"tag": "1 Corintios 7\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\n\t\t\t"
					},
					{
						"tag": "Celibato"
					},
					{
						"tag": "Matrimonio"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
