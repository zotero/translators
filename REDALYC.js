{
	"translatorID": "d1ac3b4f-1aa7-4a76-a97e-cf3580a41c37",
	"label": "REDALYC",
	"creator": "Sebastian Karcher",
	"target": "^https?://(www\\.)?redalyc\\.(uaemex\\.mx|org)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-12-23 04:12:43"
}

/*
	Translator
   Copyright (C) 2013 Sebastian Karcher

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
*/

function detectWeb(doc, url) {
	if (url.includes('articulo.oa?id=') || /\/journal\/\d+\/\d+/.test(url)) {
		return "journalArticle";
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}


function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.getElementsByClassName('contentcard');
	for (let row of rows) {
		// Single language
		let href = attr(row, 'a[ng-if*="article.pdfOtroIdioma=="]', 'href');
		// mutliple languages we go to the HTML instead
		if (!href) {
			href = ZU.xpathText(row, './/a[img[@src="img/formatos-05-html.png"]]/@href');
		}
		// if all else fails, we go to the linked title
		if (!href) {
			href = ZU.xpathText(row, './/a[span[@class="title"]]/@href');
		}
		// Z.debug(href)
		let title = text(row, '.title');
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
	if (doc.getElementById('visor-cabecera')) {
		// we're on a viewer page
		var pdfURL = attr(doc, "#impresion-pdf-n", "onclick");
		if (pdfURL) {
			pdfURL = pdfURL.replace("window.open('", "").replace("')", "");
		}
		Z.debug(pdfURL);
	}
	let translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	
	translator.setHandler('itemDone', (_obj, item) => {
		if (item.title == item.title.toUpperCase()) {
			item.title = ZU.capitalizeTitle(item.title.toLowerCase(), true);
		}
		if (pdfURL) {
			item.attachments = [{ url: pdfURL, title: "Full Text PDF", mimeType: "application/pdf" }];
		}
		item.complete();
	});

	let em = await translator.getTranslatorObject();
	em.itemType = 'journalArticle';
	await em.doWeb(doc, url);
}


/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.redalyc.org/articulo.oa?id=32921102001",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Os partidos políticos brasileiros realmente não importam?",
				"creators": [
					{
						"firstName": "Maria do Socorro Sousa",
						"lastName": "Braga",
						"creatorType": "author"
					},
					{
						"firstName": "Jairo Pimentel",
						"lastName": "Jr",
						"creatorType": "author"
					}
				],
				"date": "2011",
				"ISSN": "0104-6276, 1807-0191",
				"abstractNote": "Há décadas a constatação corrente no Brasil é de que os partidos pouco importam para explicar o comportamento dos eleitores brasileiros. Entretanto, esse cenário de baixa identificação partidária contrasta com a observação de que, ao menos para as eleições presidenciais a competição eleitoral tem se estruturado em torno de duas organizações partidárias: PT e PSDB. O objetivo deste artigo é demonstrar que mesmo que os partidos de fato não estejam internalizados em termos de identidade partidária, estamos vivenciando importante movimento no sentido de uma divisão do eleitorado entre as duas principais organizações políticas em termos de simpatia partidária, redundando na estruturação de um sistema bipartidário ao nível da disputa nacional. Com base nas respostas dos entrevistados do ESEB 2002, 2006 e 2010 sobre as eleições presidências verificamos que nesses pleitos as simpatias eleitorais pelo PT e PSDB se mostraram um dos principais componentes de explicação do voto nos candidatos. Este artigo também destacou que apesar das simpatias partidárias serem uma heurística utilizada para decisão do voto entre os eleitores com maior escolaridade, foi possível observar que mesmo entre os menos escolarizados essa variável foi fundamental para explicar o voto, evidenciando que mesmo entre eleitores com menor conhecimento político, os partidos têm auxiliado na decisão do voto.",
				"issue": "2",
				"language": "Portugués",
				"libraryCatalog": "www.redalyc.org",
				"pages": "271-303",
				"publicationTitle": "Opinião Pública",
				"url": "https://www.redalyc.org/articulo.oa?id=32921102001",
				"volume": "17",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "CSES-ESEB2010"
					},
					{
						"tag": "ESEB2010"
					},
					{
						"tag": "Partidos políticos"
					},
					{
						"tag": "Political parties"
					},
					{
						"tag": "comportamento eleitoral"
					},
					{
						"tag": "electoral behavior"
					},
					{
						"tag": "eleições presidenciais"
					},
					{
						"tag": "party sympathy"
					},
					{
						"tag": "presidential elections"
					},
					{
						"tag": "simpatia partidária"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"defer": true,
		"url": "https://www.redalyc.org/busquedaArticuloFiltros.oa?q=piqueteros",
		"items": "multiple"
	}
]
/** END TEST CASES **/
