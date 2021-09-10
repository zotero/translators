{
	"translatorID": "64f4a2b8-33d8-4303-834a-3b71065cf6c6",
	"label": "Ahval News",
	"creator": "Abe Jellinek",
	"target": "^https?://ahvalnews\\.com/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-08-12 20:49:38"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2021 Abe Jellinek
	
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


function detectWeb(doc, _url) {
	if (getJSONLD(doc)) {
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
	var rows = doc.querySelectorAll('h2.field-title > a');
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

function scrape(doc, _url) {
	let item = new Zotero.Item('newspaperArticle');
	let json = getJSONLD(doc);
	
	item.title = json.headline;
	item.abstractNote = json.description;
	item.publicationTitle = 'Ahval';
	item.date = ZU.strToISO(json.dateModified || json.datePublished);
	item.section = json.articleSection;
	item.language = doc.documentElement.lang;
	item.url = json.url;
	
	if (json.author && json.author.name != 'Ahval') {
		// usually no authors, sometimes one
		item.creators.push(ZU.cleanAuthor(json.author.name, 'author'));
	}
	
	item.attachments.push({
		title: 'Snapshot',
		document: doc
	});
	
	item.complete();
}

function getJSONLD(doc) {
	let jsonLDText = text(doc, 'script[type="application/ld+json"]');
	if (!jsonLDText.trim()) {
		return null;
	}
	
	let json = JSON.parse(jsonLDText);
	if (!json['@graph']) {
		return null;
	}
	
	for (let graphObj of json['@graph']) {
		if (graphObj['@type'] == 'NewsArticle') {
			return graphObj;
		}
	}
	
	return null;
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://ahvalnews.com/turkish-lira/turkey-signs-2-billion-currency-swap-deal-south-korea",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Turkey signs $2 billion currency swap deal with South Korea",
				"creators": [],
				"date": "2021-08-12",
				"abstractNote": "Turkey’s central bank and the Bank of Korea signed a currency swap agreement in lira and won worth as much as $2 billion.\r\n\r\nThe deal, effective for three years from Thursday, is designed to promote bilateral trade and financial cooperation for the economic development of both countries, the Bank of Korea said in a statement on its website.\r\n\r\nTurkey has sought to obtain currency swaps with central banks around the world to help bolster its foreign exchange reserves, which have fallen into negative territory when accounting for liabilities. The agreements, which have included arrangements worth about $10 billion with Turkey’s regional ally Qatar, have failed to halt a slide in the lira’s value to successive record lows since a 2018 currency crisis.\r\n\r\nIt is interesting that “another G20 central bank seems willing to support and prolong the continuation of really questionable monetary policy settings in Turkey”, said Tim Ash, a senior emerging markets strategist at BlueBay Asset Management in London. The deal \"does not really touch the sides\" in terms of defending the lira, he said.\r\n\r\nTurkey’s central bank kept interest rates at below inflation for much of last year to help the government engineer a borrowing boom. That led to an exodus of capital from the lira as deposit holders saw returns from their investments, net of inflation, disappear.\r\n\r\nThe lira rose 0.3 percent to 8.6 per dollar after the swap deal was announced after trading up 0.1 percent earlier in the day.\r\n\r\nThe agreement with the Bank of Korea was announced hours before the Turkish central bank was due to publish a monthly decision on interest rates. The benchmark rate in Turkey stands at 19 percent, marginally above annual consumer price inflation of 18.95 percent.\r\n\r\nPresident Recep Tayyip Erdoğan is calling for rate cuts and has sacked three central bank governors in just over two years due to disagreements over monetary policy. Erdoğan holds the unorthodox view that higher interest rates are inflationary. The latest governor, appointed in March, has kept rates unchanged even as inflation accelerated from 15.6 percent in February.\r\n\r\nSouth Korean companies make substantial investments in Turkey’s economy, particularly in the construction, energy and technology industries. The investments have included a 2017 contract for the building of the world’s longest suspension bridge over the Dardanelles straits worth around $2.7 billion.",
				"language": "en",
				"libraryCatalog": "Ahval News",
				"publicationTitle": "Ahval",
				"section": "News",
				"url": "https://ahvalnews.com/turkish-lira/turkey-signs-2-billion-currency-swap-deal-south-korea",
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
		"url": "https://ahvalnews.com/northern-cyprus-turkey/former-turkish-cypriot-leader-akincis-adviser-banned-entering-turkey",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Former Turkish Cypriot leader Akıncı’s adviser banned from entering Turkey",
				"creators": [
					{
						"firstName": "Tümay",
						"lastName": "Tuğyan",
						"creatorType": "author"
					}
				],
				"date": "2021-07-13",
				"abstractNote": "Ali Bizden, the press and communications coordinator of former Turkish Cypriot leader Mustafa Akıncı, was banned from entering Turkey for five years on charges of acting against the country’s national security.\r\n\r\nBizden was informed of the ban by immigration police in Turkey on Tuesday night after he sought to pass through passport control at Istanbul’s Sabiha Gökçen Airport. The ban had been ordered back in September last year, he said via social media on Wednesday.",
				"language": "en",
				"libraryCatalog": "Ahval News",
				"publicationTitle": "Ahval",
				"section": "News",
				"url": "https://ahvalnews.com/northern-cyprus-turkey/former-turkish-cypriot-leader-akincis-adviser-banned-entering-turkey",
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
		"url": "https://ahvalnews.com/turkish-lira/turkey-signs-2-billion-currency-swap-deal-south-korea",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Turkey signs $2 billion currency swap deal with South Korea",
				"creators": [],
				"date": "2021-08-12",
				"abstractNote": "Turkey’s central bank and the Bank of Korea signed a currency swap agreement in lira and won worth as much as $2 billion.\r\n\r\nThe deal, effective for three years from Thursday, is designed to promote bilateral trade and financial cooperation for the economic development of both countries, the Bank of Korea said in a statement on its website.\r\n\r\nTurkey has sought to obtain currency swaps with central banks around the world to help bolster its foreign exchange reserves, which have fallen into negative territory when accounting for liabilities. The agreements, which have included arrangements worth about $10 billion with Turkey’s regional ally Qatar, have failed to halt a slide in the lira’s value to successive record lows since a 2018 currency crisis.\r\n\r\nIt is interesting that “another G20 central bank seems willing to support and prolong the continuation of really questionable monetary policy settings in Turkey”, said Tim Ash, a senior emerging markets strategist at BlueBay Asset Management in London. The deal \"does not really touch the sides\" in terms of defending the lira, he said.\r\n\r\nTurkey’s central bank kept interest rates at below inflation for much of last year to help the government engineer a borrowing boom. That led to an exodus of capital from the lira as deposit holders saw returns from their investments, net of inflation, disappear.\r\n\r\nThe lira rose 0.3 percent to 8.6 per dollar after the swap deal was announced after trading up 0.1 percent earlier in the day.\r\n\r\nThe agreement with the Bank of Korea was announced hours before the Turkish central bank was due to publish a monthly decision on interest rates. The benchmark rate in Turkey stands at 19 percent, marginally above annual consumer price inflation of 18.95 percent.\r\n\r\nPresident Recep Tayyip Erdoğan is calling for rate cuts and has sacked three central bank governors in just over two years due to disagreements over monetary policy. Erdoğan holds the unorthodox view that higher interest rates are inflationary. The latest governor, appointed in March, has kept rates unchanged even as inflation accelerated from 15.6 percent in February.\r\n\r\nSouth Korean companies make substantial investments in Turkey’s economy, particularly in the construction, energy and technology industries. The investments have included a 2017 contract for the building of the world’s longest suspension bridge over the Dardanelles straits worth around $2.7 billion.",
				"language": "en",
				"libraryCatalog": "Ahval News",
				"publicationTitle": "Ahval",
				"section": "News",
				"url": "https://ahvalnews.com/turkish-lira/turkey-signs-2-billion-currency-swap-deal-south-korea",
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
		"url": "https://ahvalnews.com/tr/din/secme-sacmalar-hukuk-islam-allah-kelami-vs",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Seçme saçmalar: Hukuk, İslam, Allah kelamı vs.",
				"creators": [
					{
						"firstName": "Sevan",
						"lastName": "Nişanyan",
						"creatorType": "author"
					}
				],
				"date": "2021-08-11",
				"abstractNote": "“Laik toplumlarda kanunlar kutsal değildir. Zaman içinde insanların gelişen ihtiyaçlarına göre hukukta iyileştirme yapılabilir. Laik toplumlarda insanlar kendi yasalarını yapar, tanrı onların dünyada yaptıklarına karışmaz.”\r\n\r\nKanunları alelumum ‘insanlar’ yapmaz. ‘Birileri’ yapar. \r\n\r\n“Kanunlar zaman ve zemine göre değiştirilebilir” dediğiniz zaman kimin ne zaman ve hangi koşullarda değiştirebileceğini de belirtmeniz gerekir. \r\n\r\nYoksa birileri çıkar “arkadaşlar yarın beni padişah ilan edeceğiz” der, yahut gece yarısı torba yasa çıkarır, gık diyemezsin.\r\n\r\nKarşı taraf haklı mıdır, haksız mıdır ayrı mevzu. Ama laiklik hayranlarının yüz senedir halâ karşı tarafın gerekçesini fark etmemiş görünmeleri hayreti muciptir. \r\n\r\nKarşı taraf diyor ki, kanunlar kutsaldır. Yani kafana esti diye zırt pırt değiştiremezsin. O yetkiyi sana verirsek sonucu kaçınılmaz bir kesinlikle zorbalıktır, hukukun paçavra edilmesidir. Hukuku zamana uydurmak gerekiyor ise nasıl uydurulacağına devlet sopasını elinde tutanlar değil, ak sakallı alimler karar versin.\r\n\r\nAyrıca, müsterih olun, tanrı bir şeye karışmaz. \r\n\r\nÇünkü tanrı hayaldir. \r\n\r\nSadece yasa yapmanın farklı yöntemleri vardır.\r\n\r\n“Roma imparatorluğunda kanunlarla toplumda kutsal olan ve olmayan net bir şekilde ayrılmıştır. Laiklik esas alınmıştır.”\r\n\r\nBiraz Roma tarihi bilen bilir ki Roma hukuku ve siyasi kurumları iliğine kadar dini inanç ve törelerle yoğrulmuştur; dinsizliğin, dine zarar vermenin cezası ölümdür.  \r\n\r\nMerak ediyorsanız Mommsen yahut Fustel de Coulanges okuyun. \r\n\r\nEski Roma dini geniş meşrepli olduğundan insanları çok üzmemiştir. \r\n\r\nHıristiyanlık resmi din olduğunda ise muhtemelen insanlık tarihinin en feci yobazlık sahneleri yaşandı. Yanlış inanç sahipleri acımasızca kovuşturuldu, tapınakları yakıldı, dini zulümden kaçanlar yüzünden koca vilayetler ıssız kaldı.\r\n\r\nKutsal olanla dünyevinin ayrışması Batı Avrupa Ortaçağının eseridir. Roma devleti Batıda yıkılınca kilise uzun süre tek medeni otorite mercii olarak kaldı. Sonra devletler yeniden güçlenince gücünü onlarla paylaşmamak için çatır çatır direndi. \r\n\r\nSonunda otoriteyi paylaşmaktan ve birbirinin alanına fazla bulaşmamayı kabul etmekten başka çare bulamadılar.\r\n\r\nDoğu Roma’da devlet çökmediği için böyle bir şey olmadı. Ne Bizans’ta, ne Rusya’da, ne Osmanlı’da o yüzden din ve devletin ayrılması diye bir şey duyulmamıştır.\r\n\r\n“Kuranın tanrıdan geldiğine inanıldığından değiştirilemez özelliği vardır. Bu durumda Kurandaki toplum yönetim yasalarını, hukuku değiştirebilir misiniz? Değiştiremezsiniz.”\r\n\r\nKuran’da birtakım şiirsel imgeler, muğlak deklarasyonlar, ne manaya geldiği belirsiz meseller ve bolca öfke krizi vardır. Hemen her ayetin zıddını söyleyen bir ayet illa ki bulunur. \r\n\r\nBu tuhaf metinden (ve onu tamamlamak için uydurulan on binlerce hadisten) bir hukuk sistemi kendiliğinden üremedi. Üretmek için çağın en parlak alimleri canhıraş bir gayretle 200 sene uğraştılar. Ürettikleri sistemi yorumlamak için, eskisi kadar parlak olmayan varisleri bin küsur senedir hala uğraşıyor. Siz orada değiştirilmez bir tanrı yasası bulduğunuzu iddia ediyorsanız yolunuz açık olsun.\r\n\r\nİslam hukukunun iki ana yolu ve dört tali mezhebi (ve tabii bugün terk edilmiş olan onlarca alternatifi) Abbasi devletinin ilk yüzyıllarında oluşturuldu. \r\n\r\nYani Kuran’ın telifinden kaba hesap 100 ila 200  yıl sonra. \r\n\r\nAllah’ı referans göstermeleri politik bir tercihti. Aşırı güçlenen ve meşruiyet zemini sarsak olan halife devletine karşı hukuk mesleği sırtını “Allah kelamına” dayama ihtiyacını hissetti. Buyur askeriye senin, vergi senin, ama hukuk senin tasarrufunda değil, ilmiye sınıfının tekelidir, dediler. \r\n\r\nSenin kılıcın varsa bizim de Allahımız ve kitabımız var diye kendi kendilerini teselli ettiler.\r\n\r\nSon derece akıllıca bir hamleydi. Sonuçta ilim mesleğinin yüzyıllar içinde aşırı derecede muhafazakarlaşmasına, kılıç sahibinin tasallutuna karşı istiridye gibi içine kapanmasına yol açtı, o ayrı mevzu.\r\n\r\nBugün “İslam değişir mi? Değişmez!” diyerek kendi sorup kendi cevaplayanların bu hakikatleri aklında tutmasında yarar vardır. \r\n\r\nİslam hukuku konusunda ahkam kesmeyi toplumun en cahil ve ezik sınıflarına terk edip sonra onların kalın kafalılığından şikayet etmek pek de rasyonel bir tavır olmasa gerek.\r\n\r\n\r\n* Bu yazı, Sevan Nişanyan’ın blogundan alınmıştır.",
				"language": "tr",
				"libraryCatalog": "Ahval News",
				"publicationTitle": "Ahval",
				"section": "Yazarlar",
				"shortTitle": "Seçme saçmalar",
				"url": "https://ahvalnews.com/tr/din/secme-sacmalar-hukuk-islam-allah-kelami-vs",
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
		"url": "https://ahvalnews.com/ar/70-mn-alatrak-ydwn-laghlaq-alhdwd-fy-wjh-allajyyn/alnsryt-altrkyt",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "70% من الأتراك يدعون لإغلاق الحدود في وجه اللاجئين",
				"creators": [],
				"date": "2021-08-12",
				"abstractNote": "اعتقلت السلطات التركية الخميس نحو ثمانين شخصا يشتبه بأنهم شجعوا أو شاركوا في الهجوم على محلات تجارية لسوريين في أنقرة على أثر مشاجرة سقط فيها قتيل في أجواء تصاعد خطاب كراهية الأجانب في تركيا.",
				"language": "ar",
				"libraryCatalog": "Ahval News",
				"publicationTitle": "Ahval",
				"section": "أخبار",
				"url": "https://ahvalnews.com/ar/70-mn-alatrak-ydwn-laghlaq-alhdwd-fy-wjh-allajyyn/alnsryt-altrkyt",
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
		"url": "https://ahvalnews.com/ar/hl-ymkn-ltrkya-walhnd-ttqabla-wjhaan-lwjh-fy-afghanstan/alhnd",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "هل يمكن لتركيا والهند أن تتقابلا وجهاً لوجه في أفغانستان؟",
				"creators": [
					{
						"firstName": "نيكولاس",
						"lastName": "مورغان",
						"creatorType": "author"
					}
				],
				"date": "2021-08-10",
				"abstractNote": "لماذا ترحب #الهند بدور #تركيا في #أفغانستان بعد خروج الولايات المتحدة رغم خلافات البلدين العميقة؟",
				"language": "ar",
				"libraryCatalog": "Ahval News",
				"publicationTitle": "Ahval",
				"section": "رأي",
				"url": "https://ahvalnews.com/ar/hl-ymkn-ltrkya-walhnd-ttqabla-wjhaan-lwjh-fy-afghanstan/alhnd",
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
		"url": "https://ahvalnews.com/special-feature",
		"items": "multiple"
	}
]
/** END TEST CASES **/
