{
	"translatorID": "b1c90b99-2e1a-4374-a03b-92e45f1afc55",
	"label": "Radio Free Europe / Radio Liberty",
	"creator": "Avram Lyon and Abe Jellinek",
	"target": "^https?://((www|gandhara)\\.rferl\\.org/|www\\.azatliq\\.org/|www\\.azattyq\\.org/|rus\\.azattyq\\.org/|da\\.azadiradio\\.com/|pa\\.azadiradio\\.com/|www\\.azattyk\\.org/|www\\.ozodi\\.org/|www\\.ozodlik\\.org/|www\\.evropaelire\\.org/|www\\.slobodnaevropa\\.org/|www\\.makdenes\\.org/|www\\.iraqhurr\\.org/|www\\.radiofarda\\.com/|www\\.azatutyun\\.am/|www\\.azadliq\\.org/|www\\.svaboda\\.org/|www\\.svoboda\\.org/|www\\.tavisupleba\\.org/|www\\.azathabar\\.com/|www\\.svobodanews\\.ru/|(romania|moldova)\\.europalibera\\.org/|www\\.radiosvoboda\\.org/)",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-09-02 00:12:35"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2011-2021 Avram Lyon and Abe Jellinek
	
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


/*
 This translator works on articles posted on the websites of Radio Free Europe / Radio Liberty.
 It imports the basic metadata the site provides, from normal article pages and from search
 result pages.

 The translator tries to work on all of the languages of RFE/RL; they should all work.
 
 Editions:
	English:	http://www.rferl.org/
	Tatar/Bashkir:	http://www.azatliq.org/
	Kazakh:		http://www.azattyq.org/	(Kazakh)
			http://rus.azattyq.org/	(Russian)
	Afghan:		http://da.azadiradio.com/ (Dari)
			http://pa.azadiradio.com/ (Pashto)
			https://gandhara.rferl.org (English)
	Kirghiz:	http://www.azattyk.org/
	Tajik:		http://www.ozodi.org/
	Uzbek:		http://www.ozodlik.org/
	Albanian:	http://www.evropaelire.org/
	Bosnian/Montenegrin/Serbian:
			http://www.slobodnaevropa.org/
	Macedonian:	http://www.makdenes.org/
	Iraqi Arabic:	http://www.iraqhurr.org/
	Farsi:		http://www.radiofarda.com/
	Armenian:	http://www.azatutyun.am/
	Azerbaijani:	http://www.azadliq.org/
	Belarus:	http://www.svaboda.org/
	Georgian:	http://www.tavisupleba.org/
	Turkmen:	http://www.azathabar.com/
	Russian:	http://www.svobodanews.ru/ and svoboda.org
	Moldovan:	http://www.europalibera.org/ (Romanian)
	Ukrainian:	http://www.radiosvoboda.org/
 
 This translator does not yet attempt to work with the video files that Radio Liberty
 hosts and produces; EM covers those.

 Another future improvement would be the facility to import from the front page and subject
 pages. This is not yet possible.
*/

function detectWeb(doc, _url) {
	if (doc.body.classList.contains('pg-article')) {
		return "newspaperArticle";
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.media-block');
	for (let row of rows) {
		let link = row.querySelector('.media-block__content > a');
		if (!link || row.querySelector('.ico-video')) continue; // exclude videos
		
		let href = link.href;
		let title = ZU.trimInternal(link.textContent);
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
			if (items) ZU.processDocuments(Object.keys(items), scrape);
		});
	}
	else {
		scrape(doc, url);
	}
}

function scrape(doc, url) {
	var translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	
	translator.setHandler('itemDone', function (obj, item) {
		let json = JSON.parse(text(doc, 'script[type="application/ld+json"]'));
		if (json.author) {
			let clean = authors => authors
				.filter(author => author.name && !author.name.startsWith('RFE/RL'))
				.map(author => ZU.cleanAuthor(ZU.capitalizeName(author.name), 'author'));
			item.creators = clean(
				Array.isArray(json.author)
					? json.author
					: [json.author]);
		}
		
		item.date = json.dateModified || json.datePublished;
		item.section = ZU.unescapeHTML(json.articleSection);
		
		if (item.publicationTitle == 'RadioFreeEurope/RadioLiberty') {
			item.publicationTitle = 'Radio Free Europe/Radio Liberty';
		}
		
		if (item.abstractNote) {
			item.abstractNote = ZU.unescapeHTML(item.abstractNote);
		}
		
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
		"url": "https://www.azatliq.org/a/24281041.html",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Татар яшьләре татарлыкны сакларга тырыша",
				"creators": [
					{
						"firstName": "гүзәл",
						"lastName": "мәхмүтова",
						"creatorType": "author"
					}
				],
				"date": "2011-07-29 21:16:41Z",
				"abstractNote": "Бу көннәрдә “Идел” җәйләвендә XXI Татар яшьләре көннәре үтә. Яшьләр вакытларын төрле чараларда катнашып үткәрә.",
				"language": "tt",
				"libraryCatalog": "www.azatliq.org",
				"publicationTitle": "Азатлык Радиосы",
				"section": "татарстан",
				"url": "https://www.azatliq.org/a/24281041.html",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "татарстан"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.svoboda.org/a/24382010.html",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Партия \"Яблоко\" перевела свою предвыборную программу на 18 языков",
				"creators": [],
				"date": "2011-11-05 02:52:48Z",
				"abstractNote": "Партия \"Яблоко\" в День народного единства, который в пятницу отмечался в России, представила свою программу на предстоящих выборах в Госдуму на 18 языках.\nПредседатель \"Яблока\" Сергей Митрохин назвал интернет-презентацию документа \"Россия требует перемен!\" ответом на \"Русские марши\". \"Мы...",
				"language": "ru",
				"libraryCatalog": "www.svoboda.org",
				"publicationTitle": "Радио Свобода",
				"section": "Новости",
				"url": "https://www.svoboda.org/a/24382010.html",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Главные разделы"
					},
					{
						"tag": "Новости"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.rferl.org/a/kyrgyzstan-webcam-sex-workers-blackmail/31371806.html",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "The Sinister Side Of Kyrgyzstan's Online Sex Industry",
				"creators": [
					{
						"firstName": "Ulanbek",
						"lastName": "Asanaliev",
						"creatorType": "author"
					},
					{
						"firstName": "Ray",
						"lastName": "Furlong",
						"creatorType": "author"
					},
					{
						"firstName": "Carl",
						"lastName": "Schreck",
						"creatorType": "author"
					}
				],
				"date": "2021-07-27 11:14:58Z",
				"abstractNote": "An RFE/RL investigation reveals how young Kyrgyz women trying to make ends meet as online sex workers are subject to abuse, blackmail, and even rape.",
				"language": "en",
				"libraryCatalog": "www.rferl.org",
				"publicationTitle": "Radio Free Europe/Radio Liberty",
				"section": "Kyrgyzstan",
				"url": "https://www.rferl.org/a/kyrgyzstan-webcam-sex-workers-blackmail/31371806.html",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Features"
					},
					{
						"tag": "Kyrgyzstan"
					},
					{
						"tag": "Picks"
					},
					{
						"tag": "Watchdog"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.rferl.org/a/uzbek-corruption-covid-president/31330444.html",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Companies Linked To Uzbek Government Won Major COVID Construction Contracts",
				"creators": [],
				"date": "2021-07-01 08:17:00Z",
				"abstractNote": "Construction contracts for two major COVID-19 medical facilities near Tashkent went to companies linked to the Uzbek president’s inner circle and the capital city’s mayor, according to an RFE/RL investigation.",
				"language": "en",
				"libraryCatalog": "www.rferl.org",
				"publicationTitle": "Radio Free Europe/Radio Liberty",
				"section": "Uzbekistan",
				"url": "https://www.rferl.org/a/uzbek-corruption-covid-president/31330444.html",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "News"
					},
					{
						"tag": "Picks"
					},
					{
						"tag": "The Coronavirus Crisis"
					},
					{
						"tag": "Uzbekistan"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.azattyq.org/a/toqayev-address-to-the-nation/31438870.html",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Тоқаевтың \"дұрыс жолы\", \"уақыт созу\" және \"алтыншы мәселеге айналған\" саяси реформа",
				"creators": [
					{
						"firstName": "Асылхан",
						"lastName": "МАМАШҰЛЫ",
						"creatorType": "author"
					}
				],
				"date": "2021-09-01 16:45:29Z",
				"abstractNote": "Қазақстан президенті Қасым-Жомарт Тоқаев халыққа жолдауында экономика, денсаулық, білім, өңірлік саясат, еңбек нарығы және саяси жаңғыру туралы айтты. Мәжілістің бірлескен отырысында әдеттегідей орысша-қазақша араластыра оқыған жолдауында президент Қазақстанның саяси жаңғыру мен адам құқықтары...",
				"language": "kk",
				"libraryCatalog": "www.azattyq.org",
				"publicationTitle": "Азаттық радиосы",
				"section": "ҚАЗАҚСТАН",
				"url": "https://www.azattyq.org/a/toqayev-address-to-the-nation/31438870.html",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "БАС ТАҚЫРЫПТАР"
					},
					{
						"tag": "ЖАЛПЫ АРХИВ"
					},
					{
						"tag": "Президент жолдауы"
					},
					{
						"tag": "Тоқаев саяси реформа"
					},
					{
						"tag": "тоқаев адам құқықтары"
					},
					{
						"tag": "тоқаев жолдау"
					},
					{
						"tag": "тоқаев парламент"
					},
					{
						"tag": "ҚАЗАҚСТАН"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://gandhara.rferl.org/a/taliban-interview-female-journalist/31437308.html",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Plans Ruined, Dreams Shattered: Female Journalist In Kabul Deals With New Reality",
				"creators": [
					{
						"firstName": "Farangis",
						"lastName": "Najibullah",
						"creatorType": "author"
					}
				],
				"date": "2021-08-31 17:07:14Z",
				"abstractNote": "Very few women in Kabul dare to return to their jobs these days after the Taliban told them to stay home \"for now\" for their own security. RFE/RL spoke to a young journalist -- one of a handful of women who continues to work despite the risks amid the chaos in the Afghan capital.",
				"language": "en",
				"libraryCatalog": "gandhara.rferl.org",
				"publicationTitle": "RFE/RL",
				"section": "Afghanistan",
				"shortTitle": "Plans Ruined, Dreams Shattered",
				"url": "https://gandhara.rferl.org/a/taliban-interview-female-journalist/31437308.html",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Afghanistan"
					},
					{
						"tag": "Features"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.azattyk.org/a/kumtor-karieri-centerranyn-kooptonuusu-kyrgyz-taraptyn-jooby/31438681.html",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Кумтөр карьериндеги абал: \"Центерранын\" кооптонуусу, бийликтин жообу",
				"creators": [
					{
						"firstName": "Токтосун",
						"lastName": "Шамбетов",
						"creatorType": "author"
					}
				],
				"date": "2021-09-01 14:50:49Z",
				"abstractNote": "Кумтөр боюнча кыргыз бийлиги менен соттошуп жаткан канадалык \"Центерра\" компаниясы алтын кендеги карьерде топтолгон суунун деңгээли көтөрүлүп жатканын, анын кесепетине кооптонуусун билдирди.\n\"Центерранын тынчсыздануусу\"\nКанадалык \"Центерра Голд\" компаниясы Кумтөр кенинин карьеринде топтолгон...",
				"language": "ky",
				"libraryCatalog": "www.azattyk.org",
				"publicationTitle": "Азаттык Υналгысы",
				"section": "Саясат",
				"shortTitle": "Кумтөр карьериндеги абал",
				"url": "https://www.azattyk.org/a/kumtor-karieri-centerranyn-kooptonuusu-kyrgyz-taraptyn-jooby/31438681.html",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Дүйнө"
					},
					{
						"tag": "Коопсуздук"
					},
					{
						"tag": "Кумтөр"
					},
					{
						"tag": "Кыргызстан"
					},
					{
						"tag": "Макалалар архиви"
					},
					{
						"tag": "Саясат"
					},
					{
						"tag": "Центерра"
					},
					{
						"tag": "карьер"
					},
					{
						"tag": "кендеги карьер"
					},
					{
						"tag": "кыргызстан"
					},
					{
						"tag": "суу"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.ozodi.org/a/31439085.html",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Шурӯи таҳсил дар мактабҳои Тоҷикистон бо нигаронӣ аз бемории ҳамагир. ВИДЕО",
				"creators": [
					{
						"firstName": "Алишер",
						"lastName": "Зарифӣ",
						"creatorType": "author"
					},
					{
						"firstName": "Шаҳлои",
						"lastName": "Абдуллоҳ",
						"creatorType": "author"
					}
				],
				"date": "2021-09-01 17:17:54Z",
				"abstractNote": "Намояндагони Созмони Ҷаҳонии Тандурустӣ ва ЮНИСЕФ аз кишварҳо хостаанд, ки ҳама чораҳои зарурӣ, аз ҷумла эм кардани муаллимонро биандешанд, то бо вуҷуди паҳншавии навъи \"делта\"-и коронавирус дари мактабҳо кушода бимонанд.",
				"language": "tg",
				"libraryCatalog": "www.ozodi.org",
				"publicationTitle": "Радиои Озодӣ",
				"section": "Ҷомeа",
				"url": "https://www.ozodi.org/a/31439085.html",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Матолиби навтарин"
					},
					{
						"tag": "Тоҷикистон"
					},
					{
						"tag": "Ҷомeа"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.evropaelire.org/a/profesionistes--kabul--shqetesohen-te-ardhmen/31435595.html",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Profesionistët e rinj në Kabul shqetësohen për të ardhmen e tyre",
				"creators": [
					{
						"firstName": "Farangis",
						"lastName": "Najibullah",
						"creatorType": "author"
					}
				],
				"date": "2021-09-01 18:42:59Z",
				"language": "sq",
				"libraryCatalog": "www.evropaelire.org",
				"publicationTitle": "Radio Evropa e Lirë",
				"section": "Nga këndi ynë",
				"url": "https://www.evropaelire.org/a/profesionistes--kabul--shqetesohen-te-ardhmen/31435595.html",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Afganistani"
					},
					{
						"tag": "Botë"
					},
					{
						"tag": "Nga këndi ynë"
					},
					{
						"tag": "afganet"
					},
					{
						"tag": "kufizimet e lirise"
					},
					{
						"tag": "profesionistet"
					},
					{
						"tag": "regjimi taliban"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.slobodnaevropa.org/a/uragan-ida-klimatske-promjene-infrastruktura-sad/31437255.html",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "'Oko kuća je močvara, u njoj aligatori': Jugoistok Amerike poslije uragana Ida",
				"creators": [],
				"date": "2021-09-01 11:17:06Z",
				"language": "sh",
				"libraryCatalog": "www.slobodnaevropa.org",
				"publicationTitle": "Radio Slobodna Evropa",
				"section": "Dnevno@RSE",
				"shortTitle": "'Oko kuća je močvara, u njoj aligatori'",
				"url": "https://www.slobodnaevropa.org/a/uragan-ida-klimatske-promjene-infrastruktura-sad/31437255.html",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Aktuelno"
					},
					{
						"tag": "Dnevno@RSE"
					},
					{
						"tag": "Luizijana"
					},
					{
						"tag": "Nju Orleans"
					},
					{
						"tag": "Svijet"
					},
					{
						"tag": "Uragan Isa"
					},
					{
						"tag": "infrastruktura"
					},
					{
						"tag": "joe biden"
					},
					{
						"tag": "klimatske promjene"
					},
					{
						"tag": "sad"
					},
					{
						"tag": "uragan katrina"
					},
					{
						"tag": "vanredna situacija"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.azathabar.com/a/31438312.html",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "COVID-19 hadysalary gürelýän mahaly, mekdeplerde ýokary synp okuwçylaryň dynç alyşlary uzaldyldy",
				"creators": [
					{
						"firstName": "Azatlyk",
						"lastName": "Radiosy",
						"creatorType": "author"
					}
				],
				"date": "2021-09-01 14:56:50Z",
				"abstractNote": "Türkmenistanda COVID-19 hadysalary ozal görlüp-eşidilmedik derejede gürelýän, ýurduň ýokary okuw jaýlarynda sapaklar bölekleýin onlaýn tertibe geçirilen mahaly, orta mekdepleriň ýokary synp okuwçylarynyň dynç alyş möhleti uzaldyldy. Bu ýagdaýlar barada Azatlyk Radiosynyň habarçylary paýtagt...",
				"language": "tk",
				"libraryCatalog": "www.azathabar.com",
				"publicationTitle": "Azatlyk Radiosy",
				"section": "Türkmenistan",
				"url": "https://www.azathabar.com/a/31438312.html",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Türkmenistan"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.radiosvoboda.org/s?k=%D0%97%D0%B5%D0%BB%D0%B5%D0%BD%D1%81%D1%8C%D0%BA%D0%B8%D0%B9&tab=all&pi=1&r=any&pp=10",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.rferl.org/s?k=afghanistan&tab=all&pi=1&r=any&pp=10",
		"items": "multiple"
	}
]
/** END TEST CASES **/
