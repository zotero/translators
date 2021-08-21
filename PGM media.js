
{
	"translatorID": "6714072a-7967-4600-aaa5-a507b067d0d5",
	"label": "PGM Media,
	"creator": "Vera de Kok",
	"target": "^https?://(www\\.)?(myprivacy\\.dpgmedia|ad|bndestem|deondernemer|destentor|ed|gelderlander|pzc|tubantia)\\.nl/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-08-21 22:09:00"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2021 Vera de Kok 
	
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
	return 'newspaperArticle';
}


function doWeb(doc, url) {
	var item = new Zotero.Item('newspaperArticle');
	item.libraryCatalog = "DPG Media";
	item.language = 'nl';
	var new_url = url.split('callbackUrl=')[1];
	new_url = decodeURIComponent(new_url);
	new_url = decodeURIComponent(new_url);
	new_url = new_url.replace(/(.+)(?:privacy-gate\/accept-tcf2|privacygate-confirm|privacy-wall\/accept)\?redirectUri=\/(.+)/, '$1$2')
	item.url = new_url
	
	
	var title = new_url.replace(/.+\/(.+)~.+/, '$1')
	title = title.replace(/-/g, " ")
	title = Zotero.Utilities.capitalizeTitle(title, true)
	title = title.replace(/ En /g, " en ")
	item.title = title

	if (new_url.indexOf('ad.nl') != -1) {
		item.publicationTitle = 'Algemeen Dagblad';
	}
	else if (new_url.indexOf('bndestem.nl') != -1) {
		item.publicationTitle = 'BN DeStem';
	}
	else if (new_url.indexOf('gelderlander.nl') != -1) {
		item.publicationTitle = 'De Gelderlander';
	}
	else if (new_url.indexOf('deondernemer.nl') != -1) {
		item.publicationTitle = 'De Ondernemer';
	}
	else if (new_url.indexOf('destentor.nl') != -1) {
		item.publicationTitle = 'De Stentor';
	}
	else if (new_url.indexOf('ed.nl') != -1) {
		item.publicationTitle = 'Eindhovens Dagblad';
	}
	else if (new_url.indexOf('pzc.nl') != -1) {
		item.publicationTitle = 'Provinciale Zeeuwse Courant';
	}
	else if (new_url.indexOf('tubantia.nl') != -1) {
		item.publicationTitle = 'De Twentsche Courant Tubantia';
	}

	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://myprivacy.dpgmedia.nl/consent?siteKey=V9f6VUvlHxq9wKIN&callbackUrl=https%3A%2F%2Fwww.ad.nl%2Fprivacy-gate%2Faccept-tcf2%3FredirectUri%3D%252Fbuitenland%252Fkaag-nog-meer-dan-700-nederlanders-in-afghanistan~abf44305%252F",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Kaag Nog Meer Dan 700 Nederlanders in Afghanistan",
				"creators": [],
				"language": "nl",
				"publicationTitle": "Algemeen Dagblad",
				"url": "https://www.ad.nl/buitenland/kaag-nog-meer-dan-700-nederlanders-in-afghanistan~abf44305/",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": [],
				"libraryCatalog": "DPG Media"
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.ad.nl/politiek/nu-135-nederlanders-en-afghanen-geevacueerd~ae2a8bc5/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Nu 135 Nederlanders en Afghanen Geevacueerd",
				"creators": [],
				"language": "nl",
				"publicationTitle": "Algemeen Dagblad",
				"url": "https://www.ad.nl/politiek/nu-135-nederlanders-en-afghanen-geevacueerd~ae2a8bc5/",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": [],
				"libraryCatalog": "DPG Media"
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.bndestem.nl/politiek/afghaans-ambassadepersoneel-en-gezinnen-op-weg-naar-nederland-we-zijn-opgelucht~ae2a8bc5/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Afghaans Ambassadepersoneel en Gezinnen Op Weg Naar Nederland We Zijn Opgelucht",
				"creators": [],
				"language": "nl",
				"publicationTitle": "BN DeStem",
				"url": "https://www.bndestem.nl/politiek/afghaans-ambassadepersoneel-en-gezinnen-op-weg-naar-nederland-we-zijn-opgelucht~ae2a8bc5/",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": [],
				"libraryCatalog": "DPG Media"
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.gelderlander.nl/nijmegen-e-o/honderden-demonstranten-in-nijmegen-zijn-de-stilte-zat-ik-breek-liever-nog-een-keer-mijn-nek-in-plaats-van-lowlands-missen~adf9785e/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Honderden Demonstranten in Nijmegen Zijn De Stilte Zat Ik Breek Liever Nog Een Keer Mijn Nek in Plaats Van Lowlands Missen",
				"creators": [],
				"language": "nl",
				"publicationTitle": "De Gelderlander",
				"url": "https://www.gelderlander.nl/nijmegen-e-o/honderden-demonstranten-in-nijmegen-zijn-de-stilte-zat-ik-breek-liever-nog-een-keer-mijn-nek-in-plaats-van-lowlands-missen~adf9785e/",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": [],
				"libraryCatalog": "DPG Media"
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.deondernemer.nl/corona/maatregelen/medische-experts-geen-verschil-besmettingsrisico-camping-f1-gp-zandvoort-festivals~3234358",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Medische Experts Geen Verschil Besmettingsrisico Camping F1 Gp Zandvoort Festivals",
				"creators": [],
				"language": "nl",
				"publicationTitle": "De Ondernemer",
				"url": "https://www.deondernemer.nl/corona/maatregelen/medische-experts-geen-verschil-besmettingsrisico-camping-f1-gp-zandvoort-festivals~3234358",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": [],
				"libraryCatalog": "DPG Media"
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.destentor.nl/zwolle/rumoer-in-deventer-politiemacht-begeleidt-zwolse-supporters-stad-uit~a07599f1/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Rumoer in Deventer Politiemacht Begeleidt Zwolse Supporters Stad Uit",
				"creators": [],
				"language": "nl",
				"publicationTitle": "De Stentor",
				"url": "https://www.destentor.nl/zwolle/rumoer-in-deventer-politiemacht-begeleidt-zwolse-supporters-stad-uit~a07599f1/",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": [],
				"libraryCatalog": "DPG Media"
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.ed.nl/olympische-spelen/wat-als-tamberi-en-barshim-het-niet-eens-waren-geworden-over-jump-off-of-het-goud-delen~ae793839/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Wat Als Tamberi en Barshim Het Niet Eens Waren Geworden Over Jump Off of Het Goud Delen",
				"creators": [],
				"language": "nl",
				"publicationTitle": "Eindhovens Dagblad",
				"url": "https://www.ed.nl/olympische-spelen/wat-als-tamberi-en-barshim-het-niet-eens-waren-geworden-over-jump-off-of-het-goud-delen~ae793839/",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": [],
				"libraryCatalog": "DPG Media"
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.pzc.nl/zeeuws-nieuws/trajectcontrole-blijkt-lucratief-veruit-meeste-boetes-op-zeelandbrug-voor-paar-kilometer-te-hard~a36d8239/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Trajectcontrole Blijkt Lucratief Veruit Meeste Boetes Op Zeelandbrug Voor Paar Kilometer Te Hard",
				"creators": [],
				"language": "nl",
				"publicationTitle": "Provinciale Zeeuwse Courant",
				"url": "https://www.pzc.nl/zeeuws-nieuws/trajectcontrole-blijkt-lucratief-veruit-meeste-boetes-op-zeelandbrug-voor-paar-kilometer-te-hard~a36d8239/",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": [],
				"libraryCatalog": "DPG Media"
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.tubantia.nl/enschede/de-stille-meerderheid-lult-niet-maar-poetst~a7c808fa/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "De Stille Meerderheid Lult Niet Maar Poetst",
				"creators": [],
				"language": "nl",
				"publicationTitle": "De Twentsche Courant Tubantia",
				"url": "https://www.tubantia.nl/enschede/de-stille-meerderheid-lult-niet-maar-poetst~a7c808fa/",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": [],
				"libraryCatalog": "DPG Media"
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.ad.nl/buitenland/kaag-nederland-wil-bijdragen-aan-versterken-vliegveld-kaboel~abf44305/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Kaag Nederland Wil Bijdragen Aan Versterken Vliegveld Kaboel",
				"creators": [],
				"language": "nl",
				"publicationTitle": "Algemeen Dagblad",
				"url": "https://www.ad.nl/buitenland/kaag-nederland-wil-bijdragen-aan-versterken-vliegveld-kaboel~abf44305/",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": [],
				"libraryCatalog": "DPG Media"
			}
		]
	}
]
/** END TEST CASES **/
