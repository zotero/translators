{
	"translatorID": "3f1b68b1-8ee7-4ab7-a514-185d72b2f80d",
	"label": "BOE",
	"creator": "Félix Brezo (@febrezo)",
	"target": "^https?://([a-z]+\\.)?boe\\.es/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-07-26 17:07:40"
}

/*
	BOE Translator
	Copyright (C) 2020-2021 Félix Brezo, felixbrezo@disroot.org
	
	This program is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.
	
	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU General Public License for more details.
	
	You should have received a copy of the Affero GNU General Public License
	along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/


function detectWeb(doc, url) {
	if (url.includes("diario_boe") || url.includes("www.boe.es/eli") || url.includes("/doc.php")) {
		return "statute";
	}
	return false;
}

function doWeb(doc, url) {
	var resourceType = detectWeb(doc, url);
	var newItem = new Zotero.Item(resourceType);
	
	var metadataUri;
	if (!url.includes("/xml")) {
		var index = 0;
		
		while (true) {
			index++;
			metadataUri = ZU.xpathText(doc, "(//meta[@property='http://data.europa.eu/eli/ontology#is_embodied_by'])[" + index + "]/@resource");
			if (!metadataUri || metadataUri.includes("/xml")) {
				break;
			}
		}
	}
	else {
		metadataUri = url;
	}

	Zotero.Utilities.HTTP.doGet(metadataUri, function (resText) {
		// Clean and parse metadata web
		resText = resText.replace(/<!DOCTYPE[^>]*>/, "").replace(/<\?xml[^>]*\?>/, "");
		resText = Zotero.Utilities.trim(resText);
		var parser = new DOMParser();
		var metadataDoc = parser.parseFromString(resText, "text/xml");

		// Start scraping
		var tmpAuthor = ZU.xpathText(metadataDoc, "//departamento");
		if (tmpAuthor) {
			newItem.creators.push({ lastName: tmpAuthor, creatorType: "author", fieldMode: 1 });
		}
		
		var tmpDate = ZU.xpathText(metadataDoc, "//fecha_publicacion");
		newItem.dateEnacted = ZU.strToISO(tmpDate.substring(0, 4) + "/" + tmpDate.substring(4, 6) + "/" + tmpDate.substring(6, 8));
		
		newItem.nameOfAct = ZU.xpathText(metadataDoc, "//titulo").replace(/\.$/, ""); // Remove trailing dot
		newItem.section = ZU.xpathText(metadataDoc, "//seccion");
		newItem.pages = ZU.xpathText(metadataDoc, "//pagina_inicial") + "-" + ZU.xpathText(metadataDoc, "//pagina_final");
		newItem.session = ZU.xpathText(metadataDoc, "//diario") + " núm. " + ZU.xpathText(metadataDoc, "//diario_numero");
		newItem.codeNumber = ZU.xpathText(metadataDoc, "//identificador");
		newItem.publicLawNumber = ZU.xpathText(metadataDoc, "//rango") + " " + ZU.xpathText(metadataDoc, "//numero_oficial");
		newItem.url = ZU.xpathText(metadataDoc, "//url_eli");

		// Adding the attachment
		newItem.attachments.push({
			title: "Snapshot",
			mimeType: "text/html",
			url: url
		});
	
		newItem.complete();
	});
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.boe.es/eli/es/rd/2020/06/30/614",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Real Decreto 614/2020, de 30 de junio, por el que se establece una cualificación profesional de la familia profesional Comercio y Marketing, que se incluye en el Catálogo Nacional de Cualificaciones Profesionales",
				"creators": [
					{
						"lastName": "Ministerio de Educación y Formación Profesional",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"dateEnacted": "2020-07-20",
				"codeNumber": "BOE-A-2020-8150",
				"pages": "53856-53876",
				"publicLawNumber": "Real Decreto 614/2020",
				"section": "1",
				"session": "Boletín Oficial del Estado núm. 197",
				"url": "https://www.boe.es/eli/es/rd/2020/06/30/614",
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
		"url": "https://www.boe.es/eli/es/rd/2020/06/30/614/dof/spa/xml",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Real Decreto 614/2020, de 30 de junio, por el que se establece una cualificación profesional de la familia profesional Comercio y Marketing, que se incluye en el Catálogo Nacional de Cualificaciones Profesionales",
				"creators": [
					{
						"lastName": "Ministerio de Educación y Formación Profesional",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"dateEnacted": "2020-07-20",
				"codeNumber": "BOE-A-2020-8150",
				"pages": "53856-53876",
				"publicLawNumber": "Real Decreto 614/2020",
				"section": "1",
				"session": "Boletín Oficial del Estado núm. 197",
				"url": "https://www.boe.es/eli/es/rd/2020/06/30/614",
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
		"url": "https://www.boe.es/diario_boe/xml.php?id=BOE-A-1978-31229",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Constitución Española",
				"creators": [
					{
						"lastName": "Cortes Generales",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"dateEnacted": "1978-12-29",
				"codeNumber": "BOE-A-1978-31229",
				"pages": "29313-29424",
				"publicLawNumber": "Constitución",
				"section": "1",
				"session": "Boletín Oficial del Estado núm. 311",
				"url": "https://www.boe.es/eli/es/c/1978/12/27/(1)",
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
		"url": "https://www.boe.es/buscar/doc.php?id=BOE-A-1978-31229",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Constitución Española",
				"creators": [
					{
						"lastName": "Cortes Generales",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"dateEnacted": "1978-12-29",
				"codeNumber": "BOE-A-1978-31229",
				"pages": "29313-29424",
				"publicLawNumber": "Constitución",
				"section": "1",
				"session": "Boletín Oficial del Estado núm. 311",
				"url": "https://www.boe.es/eli/es/c/1978/12/27/(1)",
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
