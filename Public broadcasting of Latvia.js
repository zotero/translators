{
	"translatorID": "dab3903a-0289-46f8-a74a-eccf7bdb86b6",
	"label": "Public broadcasting of Latvia",
	"creator": "Mārtiņš Bruņenieks",
	"target": "^https?://(www\\.)?lsm\\.lv/raksts/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2019-10-22 10:41:39"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2019 Mārtiņš Bruņenieks
	
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
	if (url.includes('/raksts/')) {
		return "newspaperArticle";
	}
	return false;
}


function doWeb(doc, url) {
	if (detectWeb(doc, url) == "newspaperArticle") {
		scrape(doc, url);
	}
}

function formatDate(date) {
	return date.toISOString().split('T')[0];
}

function scrape(doc, url) {
	var translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');

	translator.setHandler('itemDone', function (obj, item) {
		item.publicationTitle = ZU.xpathText(doc, '//section[@class="globalnav__item globalnav__item-sitename"]');
		item.section = ZU.xpathText(doc, '//div[@class="article__info"]/section[3]');

		item.creators = [];
		
		// Possible formats:
		// Autori: Zanda Ozola-Balode (Panorāma), Linda Zalāne (Latvijas Radio Ziņu dienesta korespondente)
		// Autori: Uģis Lībietis (Latvijas Radio ārzemju ziņu korespondents )
		// Autori: Ludmila Glazunova
		// Autori: LSM.lv ziņu redakcija
		
		var names = ZU.xpathText(doc, '//div[@class="article__info"]/section[@class="article__info__authors"]');
		if (names) {
			names = names.substring(names.indexOf(":") + 1);
		
			var authors = names.split(',');
			
			for (let author of authors) {
				author = author.trim();
				if (author === 'LSM.lv ziņu redakcija' || author === 'LETA' || author === 'BNS') {
					item.creators.push({ lastName: author, creatorType: "author", fieldMode: true });
				} else {
					// Zanda Ozola-Balode (Panorāma)
					if (author.indexOf('(') > 0) {
						author = author.substring(0, author.indexOf('('));
					}
					item.creators.push(ZU.cleanAuthor(author, "author"));
				}
			}
		}
		
		// Date string is of the format:
		// Publicerat onsdag 15 november 2017 kl 00.11
		// /html/body/main/section[8]/div/div[1]/section[1]/article/div[3]/section[1]
		var dateString = ZU.xpathText(doc, '//div[@class="article__info"]/section[1]');
		if (dateString.indexOf('Šodien') > 0) {
			item.date = formatDate(new Date());
		} else if (dateString.indexOf('Vakar') > 0) {
			item.date = formatDate(new Date(new Date().setDate(new Date().getDate() - 1)));
		} else {
			// 14. jūlijs, 2014, 16:07
			// 12. oktobris, 20:29
			var dateParts = dateString.match(/(\d{1,2})\. (\w+), (\d{4}), .*/);
			if (!dateParts) {
				dateParts = dateString.match(/(\d{1,2})\. (\w+),.*/);
				if (dateParts) {
					dateParts[3] = new Date().getFullYear();
				}
			}
			if (dateParts) {
				var year = dateParts[3];
				var months = {
					janvāris: "01",
					februāris: "02",
					marts: "03",
					aprīlis: "04",
					maijs: "05",
					jūnijs: "06",
					jūlijs: "07",
					augusts: "08",
					septembris: "09",
					oktobris: "10",
					novembris: "11",
					decembris: "12"
				};
				var month = months[dateParts[2]];
				var day = dateParts[1];
				item.date = year + "-" + month + "-" + day;
			}
		}
		item.tags = [];

		item.complete();
	});
	
	translator.getTranslatorObject(function (trans) {
		trans.itemType = "newspaperArticle";
		trans.doWeb(doc, url);
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.lsm.lv/raksts/zinas/arzemes/britu-parlamenta-spikers-bloke-atkartoto-balsojumu-par-brexit-vienosanos.a335859/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Britu parlamenta spīkers bloķē atkārtoto balsojumu par «Brexit» vienošanos",
				"creators": [
					{
						"firstName": "Uģis",
						"lastName": "Lībietis",
						"creatorType": "author"
					}
				],
				"date": "2019-10-21",
				"abstractNote": "Lielbritānijas parlamenta spīkers Džons Bērkovs pirmdien, 21. oktobrī, bloķējis premjerministra Borisa Džonsona mēģinājumu sarīkot atkārtotu balsojumu par viņa panākto jauno \"Brexit\" vienošanos. Bērkovs norādīja, ka valdība cenšas iesniegt apspriešanai likumprojektu, kas \"pēc būtības neatšķiras\" no tā, kuru deputāti izskatījuši jau sestdien.",
				"language": "lv",
				"libraryCatalog": "www.lsm.lv",
				"publicationTitle": "Latvijas Sabiedriskie Mediji",
				"section": "Pasaulē",
				"url": "https://www.lsm.lv/raksts/zinas/arzemes/britu-parlamenta-spikers-bloke-atkartoto-balsojumu-par-brexit-vienosanos.a335859/",
				"attachments": [
					{
						"title": "Snapshot"
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
		"url": "https://www.lsm.lv/raksts/zinas/latvija/girgens-par-kuza-atbildibu-lems-pec-policista-iespejamas-kukulosanas-izmeklesanas.a335847/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Ģirģens par Ķuža atbildību lems pēc policista iespējamās kukuļošanas izmeklēšanas",
				"creators": [
					{
						"firstName": "Zanda",
						"lastName": "Ozola-Balode",
						"creatorType": "author"
					},
					{
						"firstName": "Linda",
						"lastName": "Zalāne",
						"creatorType": "author"
					}
				],
				"date": "2019-10-21",
				"abstractNote": "Iekšlietu ministrs Sandis Ģirģens (\"KPV LV\") Valsts policijas (VP) priekšnieka Inta Ķuža atbildību amatam solās vērtēt brīdī, kad noslēgsies izmeklēšana par Latgales policistu, kurš tiek turēts aizdomās par kukuļošanu.",
				"language": "lv",
				"libraryCatalog": "www.lsm.lv",
				"publicationTitle": "Latvijas Sabiedriskie Mediji",
				"section": "Latvijā",
				"url": "https://www.lsm.lv/raksts/zinas/latvija/girgens-par-kuza-atbildibu-lems-pec-policista-iespejamas-kukulosanas-izmeklesanas.a335847/",
				"attachments": [
					{
						"title": "Snapshot"
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
		"url": "https://www.lsm.lv/raksts/zinas/latvija/svetdien-pulkstena-raditaji-japagriez-stundu-atpakal.a335900/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Svētdien pulksteņa rādītāji jāpagriež stundu atpakaļ",
				"creators": [
					{
						"lastName": "LSM.lv ziņu redakcija",
						"creatorType": "author",
						"fieldMode": true
					}
				],
				"date": "2019-10-22",
				"abstractNote": "Naktī uz svētdienu, 27. oktobri, Latvijā un daudzviet citur pasaulē notiks pāreja no vasaras uz ziemas laiku – pulksteņa rādītāji būs pagriež par vienu stundu atpakaļ, informēja Ekonomikas ministrijā (EM).",
				"language": "lv",
				"libraryCatalog": "www.lsm.lv",
				"publicationTitle": "Latvijas Sabiedriskie Mediji",
				"section": "Latvijā",
				"url": "https://www.lsm.lv/raksts/zinas/latvija/svetdien-pulkstena-raditaji-japagriez-stundu-atpakal.a335900/",
				"attachments": [
					{
						"title": "Snapshot"
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
		"url": "https://www.lsm.lv/raksts/sports/basketbols/ventspils-jurmalas-un-ogres-basketbola-klubi-gust-uzvaras-latvijas-igaunijas-liga.a334960/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Ventspils, Jūrmalas un Ogres basketbola klubi gūst uzvaras Latvijas-Igaunijas līgā",
				"creators": [],
				"date": "2019-10-12",
				"abstractNote": "Ventspilī, Jūrmalā un Ogrē sestdien mājinieki svinēja uzvaru \"Pafbet\" Latvijas-Igaunijas (LIBL) Basketbola līgas spēlēs.",
				"language": "lv",
				"libraryCatalog": "www.lsm.lv",
				"publicationTitle": "Latvijas Sabiedriskie Mediji",
				"section": "Basketbols",
				"url": "https://www.lsm.lv/raksts/sports/basketbols/ventspils-jurmalas-un-ogres-basketbola-klubi-gust-uzvaras-latvijas-igaunijas-liga.a334960/",
				"attachments": [
					{
						"title": "Snapshot"
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
		"url": "https://www.lsm.lv/raksts/zinas/latvija/straujuma-atkapjas-no-premjeres-amata.a158366/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Straujuma atkāpjas no premjeres amata",
				"creators": [
					{
						"firstName": "Aija",
						"lastName": "Kinca",
						"creatorType": "author"
					},
					{
						"lastName": "BNS",
						"creatorType": "author",
						"fieldMode": true
					},
					{
						"firstName": "Madara",
						"lastName": "Līcīte",
						"creatorType": "author"
					},
					{
						"firstName": "Ivo",
						"lastName": "Leitāns",
						"creatorType": "author"
					},
					{
						"firstName": "Anete",
						"lastName": "Bērtule",
						"creatorType": "author"
					},
					{
						"lastName": "LSM.lv ziņu redakcija",
						"creatorType": "author",
						"fieldMode": true
					},
					{
						"firstName": "Edgars",
						"lastName": "Kupčs",
						"creatorType": "author"
					}
				],
				"date": "2015-12-7",
				"abstractNote": "Pirmdienas rītā no amata atkāpusies premjere Laimdota Straujuma (\"Vienotība\"). Par savu demisiju Straujuma oficiāli paziņoja pirmdienas, 7.decembra, rītā pēc iepriekš neplānotas tikšanās ar Valsts prezidentu Raimondu Vējoni. Tiesa, Straujuma par plāniem atkāpties no Ministru prezidentes amata \"Vienotības\" valdi īsziņā informējusi jau svētdienas, 6.decembra, vakarā.",
				"language": "lv",
				"libraryCatalog": "www.lsm.lv",
				"publicationTitle": "Latvijas Sabiedriskie Mediji",
				"section": "Latvijā",
				"url": "https://www.lsm.lv/raksts/zinas/latvija/straujuma-atkapjas-no-premjeres-amata.a158366/",
				"attachments": [
					{
						"title": "Snapshot"
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
