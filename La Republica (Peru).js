{
	"translatorID": "4ec51dc9-b949-497e-856b-a7624175d5c6",
	"label": "La República (Peru)",
	"creator": "Abe Jellinek",
	"target": "^https?://larepublica\\.pe/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-07-14 18:50:45"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2022 Abe Jellinek

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
	if (doc.querySelector('.DefaultTitle')) {
		return 'newspaperArticle';
	}
	return false;
}

async function doWeb(doc, url) {
	await scrape(doc, url);
}

async function scrape(doc, url = doc.location.href) {
	let translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	
	translator.setHandler('itemDone', (_obj, item) => {
		item.creators = [];
		let authors = doc.querySelectorAll('.comp-autor-description a');
		for (let author of authors) {
			let authorName = author.textContent;
			if (authorName) {
				let parts = authorName.split(' ');
				let firstName = parts.shift();
				let fullNameWithComma = parts.join(' ') + ', ' + firstName;
				item.creators.push(ZU.cleanAuthor(fullNameWithComma, 'author', true));
			}
		}

		item.ISSN = '1605-3052';

		item.complete();
	});

	let em = await translator.getTranslatorObject();
	em.itemType = 'newspaperArticle';
	await em.doWeb(doc, url);
}


/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://larepublica.pe/politica/2022/06/22/elecciones-2022-peru-libre-sentenciados-y-acusados-buscan-ocupar-gobiernos-regionales-vladimir-cerron-pedro-castillo-jne/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Candidatos por Perú Libre sentenciados y acusados buscan ocupar Gobiernos regionales",
				"creators": [
					{
						"firstName": "María",
						"lastName": "de los Angeles Morales Isla",
						"creatorType": "author"
					}
				],
				"date": "2022-06-22T10:54:17-05:00",
				"ISSN": "1605-3052",
				"abstractNote": "Afanes peligrosos. El partido de Vladimir Cerrón incluye a candidatos sentenciados por peculado y difamación, acusados de encubrir violencia sexual, clanes familiares de corrupción y maestros sancionados. Estos son los rostros con los que Perú Libre competirá en las elecciones regionales 2022.",
				"language": "es",
				"libraryCatalog": "larepublica.pe",
				"section": "Política",
				"url": "https://larepublica.pe/politica/2022/06/22/elecciones-2022-peru-libre-sentenciados-y-acusados-buscan-ocupar-gobiernos-regionales-vladimir-cerron-pedro-castillo-jne/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Elecciones 2022"
					},
					{
						"tag": "Impresa"
					},
					{
						"tag": "Perú Libre"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://larepublica.pe/economia/2022/06/22/minem-precio-de-combustibles-se-encarecio-hasta-en-s7-en-lo-que-va-del-ano-petroleo-wti-petroperu-osinergmin-gnv/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Precio de combustibles se encareció hasta en S/7 en lo que va del año",
				"creators": [
					{
						"firstName": "Hernán",
						"lastName": "Torres",
						"creatorType": "author"
					},
					{
						"firstName": "Fernando",
						"lastName": "Cuadros",
						"creatorType": "author"
					}
				],
				"date": "2022-06-22T04:52:40-05:00",
				"ISSN": "1605-3052",
				"abstractNote": "Efecto. El alza interminable del WTI, que actualmente oscila en US$ 109, mantiene contra las cuerdas a nuestro dependiente mercado. Es crucial masificar el uso de GNV en el parque automotor para aliviar economía de los hogares.",
				"language": "es",
				"libraryCatalog": "larepublica.pe",
				"section": "Economía",
				"url": "https://larepublica.pe/economia/2022/06/22/minem-precio-de-combustibles-se-encarecio-hasta-en-s7-en-lo-que-va-del-ano-petroleo-wti-petroperu-osinergmin-gnv/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Combustibles"
					},
					{
						"tag": "Impresa"
					},
					{
						"tag": "Ministerio de Energía y Minas"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
