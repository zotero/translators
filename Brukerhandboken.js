{
	"translatorID": "6c94ba9a-8639-4f58-bea3-076f774cf3a1",
	"label": "Brukerhåndboken",
	"creator": "Sondre Bogen-Straume",
	"target": "https://brukerhandboken\\.miraheze\\.org/",
	"minVersion": "5",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-06-27 16:03:43"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2024 Sondre Bogen-Straume

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
	if (url.includes('/wiki/') && doc.querySelector('.printfooter a[href*="oldid="]')) {
		return 'encyclopediaArticle';
	}
	return false;
}

async function doWeb(doc, url) {
	await scrape(doc, url);
}

async function scrape(doc, url = doc.location.href) {
	let translator = Zotero.loadTranslator('web');
	// Wikipedia
	translator.setTranslator('e5dc9733-f8fc-4c00-8c40-e53e0bb14664');
	translator.setDocument(doc);
	
	translator.setHandler('itemDone', (_obj, item) => {
		item.encyclopediaTitle = 'Brukerhåndboken';
		item.rights = 'Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International';
		item.complete();
	});
	await translator.translate();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://brukerhandboken.miraheze.org/wiki/Brukermedvirkning",
		"items": [
			{
				"itemType": "encyclopediaArticle",
				"title": "Brukermedvirkning",
				"creators": [],
				"date": "2024-05-01T08:31:53Z",
				"abstractNote": "Informasjon om brukermedvirkning her.",
				"encyclopediaTitle": "Brukerhåndboken",
				"extra": "Page Version ID: 912",
				"language": "nb",
				"libraryCatalog": "Brukerhåndboken",
				"rights": "Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International",
				"url": "https://brukerhandboken.miraheze.org/wiki/Brukermedvirkning?oldid=912",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html",
						"snapshot": true
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
		"url": "https://brukerhandboken.miraheze.org/wiki/Forside",
		"items": [
			{
				"itemType": "encyclopediaArticle",
				"title": "Forside",
				"creators": [],
				"date": "2024-05-04T17:20:37Z",
				"encyclopediaTitle": "Brukerhåndboken",
				"extra": "Page Version ID: 933",
				"language": "nb",
				"libraryCatalog": "Brukerhåndboken",
				"rights": "Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International",
				"url": "https://brukerhandboken.miraheze.org/wiki/Forside?oldid=933",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html",
						"snapshot": true
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
		"url": "https://brukerhandboken.miraheze.org/wiki/Ord_og_forkortelser",
		"items": [
			{
				"itemType": "encyclopediaArticle",
				"title": "Ord og forkortelser",
				"creators": [],
				"date": "2024-06-13T18:54:19Z",
				"abstractNote": "Databaseoppføring: Ord og forkortelser - For brukerrepresentanter i helsetjenesten (Q1)\nOrd og forkortelser er en ordbok for brukerrepresentanter i helsetjenesten. Den inneholder ord og forkortelser som brukes hyppig i helsevesenet, og som er som er nyttig å kunne for brukerrepresentanter i helse- og omsorgstjenesten. Innholdet er kurert fra ulike nettsider, dokumenter og liknende. Det er altså ikke jeg som har skrevet alle forklaringene. Henvisning til kildene for tekstene (hvor de er hentet fra) ble når jeg startet på listen ikke tatt med da jeg ikke planla å gjøre den offentlig. Jeg tar nå med kilde i nye oppføringer der det er relevant.\n\nListen er sortert alfabetisk og ment brukt elektronisk da det finnes lenker i tekstene.\nVed forslag til nye ord og forkortelser bruk dette skjemaet: Send inn nytt ord (Airtable) eller e-post. \nVed forslag til endringer eller du har spørsmål ta gjerne kontakt med meg på e-post.\n\nLista er sortert alfabetisk og ment brukt elektronisk da det finnes lenker i tekstene. Noen forkortelser er det brukt punktum.\nLast ned som PDF her.\n\n{{#unlinkedwikibase| id=Q1 }}\n\nOpprettet:\nMal:History-user",
				"encyclopediaTitle": "Brukerhåndboken",
				"extra": "Page Version ID: 1640",
				"language": "nb",
				"libraryCatalog": "Brukerhåndboken",
				"rights": "Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International",
				"url": "https://brukerhandboken.miraheze.org/wiki/Ord_og_forkortelser?oldid=1640",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html",
						"snapshot": true
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
