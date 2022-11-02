{
	"translatorID": "e3da3448-db8f-44ad-a650-54110335c4ae",
	"label": "El Comercio (Perú)",
	"creator": "Sebastian Karcher",
	"target": "^https?://elcomercio\\.pe",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 280,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-08-22 02:12:03"
}

/*
    ***** BEGIN LICENSE BLOCK *****

    Copyright © 2022 Sebsatian Karcher

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


async function detectWeb(doc, url) {
	if (doc.getElementsByClassName('story').length) {
		return 'newspaperArticle';
	}
	// Search results don't work; excluding
	else if (!url.includes("buscar") && getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('h2.fs-wi__title > a, h2 > a.story-item__title');
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(row.textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

async function doWeb(doc, url) {
	if (await detectWeb(doc, url) == 'multiple') {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (items) {
			await Promise.all(
				Object.keys(items)
					.map(url => requestDocument(url).then(scrape))
			);
		}
	}
	else {
		await scrape(doc, url);
	}
}

async function scrape(doc, url = doc.location.href) {
	var item = new Zotero.Item("newspaperArticle");
	let authors = doc.getElementsByClassName('s-aut__n');
	// Most authors in El Comercio appear to have two last names, one first name;
	for (let author of authors) {
		author = author.textContent;
		let authorName = author.match(/^(.+?)\s(.+)$/);
		if (!authorName || author == 'Redacción EC' || author.includes("Agencia")) {
			item.creators.push({ lastName: author, creatorType: "author", fieldMode: 1 });
		}
		else {
			let firstName = authorName[1];
			let lastName = authorName[2];
			item.creators.push({ firstName: firstName, lastName: lastName, creatorType: "author" });
		}
	}
		
	let tags = attr('meta[name="keywords"]', 'content');
	tags = tags.split(/\s*,\s*/);
	for (let tag of tags) {
		item.tags.push(tag);
	}
	item.attachments.push({ document: doc, title: "Article Snapshot" });

	item.title = text('h1', doc);
	item.date = ZU.strToISO(attr('meta[property="article:published_time"]', 'content'));
	item.url = url;
	item.abstractNote = attr('meta[name="DC.description"]', 'content', doc);
		
	item.language = "es-PE";
	item.ISSN = "1605-3052";
	item.place = "Lima";
	item.publicationTitle = "El Comercio";

	// item.section = 'News';
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://elcomercio.pe/mundo/latinoamerica/nueva-constitucion-chile-aprobar-o-rechazar-el-desafio-de-la-nueva-constitucion-chilena-gabriel-boric-plebiscito-de-salida-noticia/?ref=ecr",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Aprobar o rechazar: el desafío de la nueva Constitución chilena",
				"creators": [
					{
						"firstName": "Gisella",
						"lastName": "López Lenci",
						"creatorType": "author"
					}
				],
				"date": "2022-08-21",
				"ISSN": "1605-3052",
				"abstractNote": "Tras el estallido social del 2019, los chilenos se pusieron de acuerdo en que ya no quieren la vigente Carta Magna, pero las encuestas muestran que están lejos de estar entusiasmados con el texto elaborado por la Convención Constitucional, y por la que deberán votar en solo dos semanas.",
				"language": "es-PE",
				"libraryCatalog": "El Comercio (Perú)",
				"place": "Lima",
				"publicationTitle": "El Comercio",
				"shortTitle": "Aprobar o rechazar",
				"url": "https://elcomercio.pe/mundo/latinoamerica/nueva-constitucion-chile-aprobar-o-rechazar-el-desafio-de-la-nueva-constitucion-chilena-gabriel-boric-plebiscito-de-salida-noticia/?ref=ecr",
				"attachments": [
					{
						"title": "Article Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Chile"
					},
					{
						"tag": "Gabriel Boric"
					},
					{
						"tag": "Nueva Constitución"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://elcomercio.pe/politica/yenifer-paredes-poder-judicial-evalua-36-meses-de-prision-preventiva-contra-cunada-de-pedro-castillo-este-domingo-21-de-agosto-video-ministerio-publico-rmmn-noticia/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Poder Judicial reprograma audiencia por pedido de 36 meses de prisión preventiva contra Yenifer Paredes",
				"creators": [
					{
						"lastName": "Redacción EC",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "2022-08-21",
				"ISSN": "1605-3052",
				"abstractNote": "El Poder Judicial evaluará este domingo 21 de agosto el pedido de la Fiscalía de 36 meses de prisión preventiva en contra de la cuñada del presidente Pedro Castillo, Yenifer Paredes.",
				"language": "es-PE",
				"libraryCatalog": "El Comercio (Perú)",
				"place": "Lima",
				"publicationTitle": "El Comercio",
				"url": "https://elcomercio.pe/politica/yenifer-paredes-poder-judicial-evalua-36-meses-de-prision-preventiva-contra-cunada-de-pedro-castillo-este-domingo-21-de-agosto-video-ministerio-publico-rmmn-noticia/",
				"attachments": [
					{
						"title": "Article Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Ministerio Público"
					},
					{
						"tag": "Pedro Castillo"
					},
					{
						"tag": "Poder Judicial"
					},
					{
						"tag": "Yenifer Paredes"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://elcomercio.pe/mundo/latinoamerica/chile-existe-una-tendencia-a-rechazar-nueva-constitucion-en-chile-revelan-los-ultimos-sondeos-gabriel-boric-rmmn-noticia/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Existe una tendencia a rechazar nueva Constitución en Chile, revelan los últimos sondeos",
				"creators": [
					{
						"lastName": "Agencia EFE",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "2022-08-20",
				"ISSN": "1605-3052",
				"abstractNote": "Los últimos sondeos publicados en Chile este jueves, cuando a partir de la medianoche comienza la veda para divulgar encuestas electorales, revelaron que se mantiene la tendencia a rechazar la propuesta de nueva Constitución en el plebiscito de septiembre.",
				"language": "es-PE",
				"libraryCatalog": "El Comercio (Perú)",
				"place": "Lima",
				"publicationTitle": "El Comercio",
				"url": "https://elcomercio.pe/mundo/latinoamerica/chile-existe-una-tendencia-a-rechazar-nueva-constitucion-en-chile-revelan-los-ultimos-sondeos-gabriel-boric-rmmn-noticia/",
				"attachments": [
					{
						"title": "Article Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Augusto Pinochet"
					},
					{
						"tag": "Chile"
					},
					{
						"tag": "Gabriel Boric"
					},
					{
						"tag": "Pulso Ciudadano"
					},
					{
						"tag": "constitución de  Augusto Pinochet"
					},
					{
						"tag": "nueva Constitución"
					},
					{
						"tag": "nueva constitución chile"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://elcomercio.pe/deporte-total/seleccion/siete-hijos-de-juan-reynoso-cuentan-quien-es-realmente-el-nuevo-entrenador-de-la-seleccion-peruana-liga-1-universitario-melgar-coronel-bolognesi-rmmd-dtcc-noticia/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Siete ‘hijos’ de Juan Reynoso cuentan quién es realmente el nuevo entrenador de la selección",
				"creators": [
					{
						"firstName": "Eliezer",
						"lastName": "Benedetti",
						"creatorType": "author"
					},
					{
						"firstName": "Marco",
						"lastName": "Quilca León",
						"creatorType": "author"
					}
				],
				"date": "2022-08-21",
				"ISSN": "1605-3052",
				"abstractNote": "Siete futbolistas que fueron dirigidos por Juan Reynoso nos cuentan cómo era ser entrenado por él, los especiales pedidos que les hacía dentro y fuera de la cancha, además de las parrillas, apuestas y otras anécdotas especiales que tuvieron con el ‘Cabezón’.",
				"language": "es-PE",
				"libraryCatalog": "El Comercio (Perú)",
				"place": "Lima",
				"publicationTitle": "El Comercio",
				"url": "https://elcomercio.pe/deporte-total/seleccion/siete-hijos-de-juan-reynoso-cuentan-quien-es-realmente-el-nuevo-entrenador-de-la-seleccion-peruana-liga-1-universitario-melgar-coronel-bolognesi-rmmd-dtcc-noticia/",
				"attachments": [
					{
						"title": "Article Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Diego Penny"
					},
					{
						"tag": "Hernán Rengifo"
					},
					{
						"tag": "Jonathan Acasiete"
					},
					{
						"tag": "Juan Reynoso"
					},
					{
						"tag": "Junior Ross"
					},
					{
						"tag": "Liga 1"
					},
					{
						"tag": "Minzum Quina"
					},
					{
						"tag": "Rainer Torres"
					},
					{
						"tag": "Reynoso"
					},
					{
						"tag": "Selección peruana"
					},
					{
						"tag": "Ysrael Zúñiga"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://elcomercio.pe/economia/",
		"items": "multiple"
	}
]
/** END TEST CASES **/
