{
	"translatorID": "d3f35d5a-55da-4e07-be7d-b4d2a821279f",
	"label": "KitapYurdu.com",
	"creator": "Hasan Huseyin DER",
	"target": "^https?://www\\.kitapyurdu\\.com/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-02-08 18:18:10"
}

/*
	***** BEGIN LICENSE BLOCK *****

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
	if (url.includes('/kitap/') || url.includes('product_id')) {
		return 'book';
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//a[contains(@href, "/kitap/")]|//a[contains(@href, "product_id")]');
	for (var i = 0; i < rows.length; i++) {
		var href = rows[i].href;
		var title = ZU.trimInternal(rows[i].textContent);
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


/*
remove titles from creators
*/
function cleanCreatorTitles(str) {
	return str.replace(/Prof.|Doç.|Yrd.|Dr.|Arş.|Öğr.|Gör.|Çevirmen:|Editor:|Derleyici:/g, '');
}

function localeCapitalizeTitle(name) {
	return name
		.split(/\s+/)
		.map(part => part[0] + part.slice(1).toLocaleLowerCase('tr'))
		.join(' ');
}

function scrape(doc, _url) {
	var item = new Zotero.Item("book");
	let json = JSON.parse(text(doc, 'body script[type="application/ld+json"]'));
	
	item.title = ZU.unescapeHTML(json.name);
	
	var authors = doc.querySelectorAll('.pr_producers__manufacturer .pr_producers__link');
	for (var i = 0; i < authors.length; i++) {
		var creator = cleanCreatorTitles(authors[i].textContent);
		item.creators.push(ZU.cleanAuthor(creator, "author"));
	}

	
	var translators = ZU.xpath(doc, '//tr[contains(., "Çevirmen")]');
	for (let i = 0; i < translators.length; i++) {
		let creator = cleanCreatorTitles(translators[i].textContent);
		item.creators.push(ZU.cleanAuthor(creator, "translator"));
	}
	
	var editors = ZU.xpath(doc, '//tr[contains(., "Editor")]|//tr[contains(., "Derleyici")]');
	for (let i = 0; i < editors.length; i++) {
		let creator = cleanCreatorTitles(editors[i].textContent);
		item.creators.push(ZU.cleanAuthor(creator, "editor"));
	}
	
	var edition = doc.querySelector('[itemprop=bookEdition]');
	if (edition) {
		edition = ZU.trimInternal(edition.textContent);
		// don't add first edition:
		if (edition.split('.')[0] != "1") {
			item.edition = edition.split('.')[0];
		}
	}
	
	var language = ZU.xpathText(doc, '//tr/td[contains(., "Dil")]//following-sibling::td');
	if (language) {
		switch (language.trim()) {
			case "İNGİLİZCE":
				item.language = "en";
				break;
			default:
				item.language = "tr";
		}
	}
	
	var publisher = json.publisher.name;
	if (publisher) {
		publisher = ZU.trimInternal(publisher);
		if (item.language == "tr") {
			item.publisher = localeCapitalizeTitle(publisher);
		}
		else {
			item.publisher = ZU.capitalizeTitle(publisher, true);
		}
	}
	
	for (let tr of doc.querySelectorAll('.attributes tr')) {
		if (text(tr, 'td', 0).startsWith('Yayın Tarihi')) {
			item.date = ZU.strToISO(text(tr, 'td', 1));
		}
	}
	
	item.ISBN = json.isbn;
	item.numPages = json.numberOfPages;
	item.abstractNote = ZU.unescapeHTML(json.description);
	
	item.attachments.push({
		title: "Snapshot",
		document: doc
	});
		
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.kitapyurdu.com/kitap/makroekonomi/139156.html",
		"items": [
			{
				"itemType": "book",
				"title": "Makroekonomi",
				"creators": [
					{
						"firstName": "N. Gregory",
						"lastName": "Mankiw",
						"creatorType": "author"
					},
					{
						"firstName": "Ömer Faruk",
						"lastName": "Çolak",
						"creatorType": "translator"
					}
				],
				"date": "2018-03-31",
				"ISBN": "9786054160389",
				"abstractNote": "Gregory Mankiw’in Makroekonomi kitabı tüm dünya da ders kitabı olarak geniş kabul görmüştür. Kitap bugüne kadar altı baskı yaparken, başta Almanca, Fransızca, İtalyanca, İspanyolca, Çince, Rusça, Japonca ve Portekizce olmak üzere 16 dile çevrilmiştir. Elinizde tuttuğunuz Türkçe çeviride altıncı baskıdan yapılmıştır. Mankiw’in makroekonomi kitabını bu kadar önemli kılan nokta kitabın öğrenci ve öğretici dostu olmasıdır. Kitap makroekonomideki son gelişmeleri teorik olarak anlatırken ekonomideki gerçekleşmelere ilişkin verdiği örneklerle de teorik bilginin ayakları üzerine basmasını sağlamaktadır. Kitapta konular anlatıldıktan sonra her bölümün sonuna özet, anahtar kelimeler ile problemler ve uygulama soruları koyulmuştur. Kitaba sahip olan öğrenciler Eflatun Yayınevi’nin web sayfasına kayıt olup kitaptaki kodu girdiklerinde süresiz olarak kitaptaki sorular için istedikleri yardımı mail yoluyla alabileceklerdir. Böylece öğrenci, çalıştığı konular üzerinde kendisini interaktif hale getirmiş olacaktır.",
				"language": "tr",
				"libraryCatalog": "KitapYurdu.com",
				"numPages": "688",
				"publisher": "Efil Yayınevi",
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
		"url": "https://www.kitapyurdu.com/kitap/temel-ekonometri/22831.html",
		"items": [
			{
				"itemType": "book",
				"title": "Temel Ekonometri",
				"creators": [
					{
						"firstName": "Damodar N.",
						"lastName": "Gujarati",
						"creatorType": "author"
					},
					{
						"firstName": "Dawn",
						"lastName": "Porter",
						"creatorType": "author"
					},
					{
						"firstName": "Gülay Günlük",
						"lastName": "Şenesen",
						"creatorType": "translator"
					},
					{
						"firstName": "Ümit",
						"lastName": "Şenesen",
						"creatorType": "translator"
					}
				],
				"date": "2014-10-21",
				"ISBN": "9789750406171",
				"abstractNote": "Temel Ekonometri’nin ilk baskısı otuz üç yıl önce yapılmıştı. Ekonometrinin hem kuramında hem uygulamasında önemli gelişmeler oldu. Her bir yeni basımında önemli gelişmeler kitaba yansımış ve kitap dünyanın bir çok üniversitesinde ders kitabı olarak kullanılmıştır. Bu kadar uzun ömürlü olan kitap iktisat ve finansman öğrencilerinin yanı sıra siyaset, kamu yönetimi, uluslararası ilişkiler, eğitim, tarım ve sağlık bilimlerinde de yaygın kullanılmaktadır. Yazar Gujarati’nin kitabın önsözünde yazdığı gibi: “Yıllar boyunca ekonometrinin, yeni başlayanlara, matris cebiri, yüksek matematik, giriş düzeyinin ötesinde istatistik kullanmadan, sezgisel ve anlaşılır biçimde öğretilebileceğini ilişkin olan kesin inancımı hiç değişmemiştir. Bazı konular özünde tekniktir. Böyle durumlarda ya uygun bir ek koydum ya da okuyucuyu ilgili kaynaklara yönlendirdim. O zaman bile teknik malzemeyi okuyucunun sezgisel anlayışını sağlayacak biçimde basitleştirmeye çalıştım. “ Yeni basımda öğrenciler kitabın, konuları geliştirilmiş, somut örnekli yeni basımını çok yararlı bulacaktır. Bu basımda kitapta kullanılan gerçek verilerin konuyla ilgili ve güncel olmasına özen gösterilmiştir. Kitaba on beş yeni açıklayıcı örnekle otuzdan fazla bölüm sonu alıştırması eklenmiştir. Ayrıca daha önceki basımda yirmi beşe yakın örnek ve yirmiden çok alıştırmanın da verileri güncellenmiştir. Beşinci basımın çevirisinde kitapta Damodar Gujarati ile yeni ortak yazar Dawn Porter, ekonometrinin temellerini güncel araştırmalarla harmanladılar. Öğrencilere yönelik olarak da kitaptaki örneklerde kullanılan veri setleri bütün olarak Excel formatında hazırlanmıştır. Kitabın ilk bölümünde klasik modelin varsayımlarının genişletilmesini ele alıyor ve ardından çoklu doğrusallık, küçük örneklem, değişen varyans, ardışık bağımlılık, geleneksel ve almaşık ekonometrik modellemeler konularını beş bölümde inceleniyor. Daha sonra kitapta, gölge değişkenlerle regresyon, gölge bağımlı değişkenle regresyon, DOM, LOgit, Probit, Tobit modelleri, dinamik ekonometri modelleri, ardışık bağlanımlı ve gecikmesi dağıtılmış modeller anlatılıyor. Diğer bölümlerde eşanlı denklem modelleri konusu, zaman serileri ekonometrisi ele alınıyor. Durağanlık, birim kökler, eşbütünleşim konularının yanı sıra ABBHO ve VAB modelleriyle kestrim açıklanıyor. Ekonometri, özellikle de son yirmi-otuz yıldır bilgisayardaki kapasite ve hız artışlarıyla birlikte, hızlı bir gelişme gösteren, dolayısıyla sürekli yeni terimler doğuran bir bilim dalıdır. Bu nedenle çeviride, bu terimlerin Türkçe karşılıklarının kullanılmasına özen gösterilmiş ve olası bir karışıklığı önlemek için de, kitabın sonundaki Konu Dizini'nde her terimin hem Türkçe, hem İngilizce karşılıkları verilmiştir. İçindekiler; • Tek Denklemli Bağlamın (Regresyon) Modelleri • Bağlanım (Regresyon) Çözümlemesinin Niteliği • İki Değişkenli Bağlanım (Regresyon) Çözümlemesi: Bazı Temel Bilgiler • İki Değişkenli Bağlanım (Regresyon) Modeli: Tahmin Sorunu • Klasik Normal Doğrusal Bağlanım (Regresyon) Modeli (KNDBM) • İki Değişkenli Bağlanım (Regresyon)- Aralık Tahmini ve Önsav Sınaması • İki Değişkenli Doğrusal Bağlanım (Regresyon) Modelinin Uzantıları • Çoklu Bağlanım (Regresyon) Çözümlemesi: Tahmin Sorunu • Çoklu Bağlanım Çözümlemesi: Çıkarsama Sorunu • Yapay Değişkenlerle Bağlanım (Regresyon) Modelleri • Klasik Modelin Varsayımlarının Gevşetilmesi • Çoklu Doğrusallık: Açıklayıcı Değişkenler İlişkiliyse Ne Olur? • Değişen Varyans: Hata Varyansı Sabit Değilse Ne Olur? • Ardışık İlişki: Hata Terimleri İlişkiliyse Ne Olur? • Ekonometrik Modelleme: Model Kurma, Tanı Koyma Sınamaları",
				"language": "tr",
				"libraryCatalog": "KitapYurdu.com",
				"numPages": "972",
				"publisher": "Literatür - Ders Kitapları",
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
		"url": "https://www.kitapyurdu.com/kitap/iktisadi-krizler-ve-turkiye-ekonomisi/375871.html",
		"items": [
			{
				"itemType": "book",
				"title": "İktisadi Krizler ve Türkiye Ekonomisi",
				"creators": [
					{
						"firstName": "",
						"lastName": "Kolektif",
						"creatorType": "author"
					},
					{
						"firstName": "Nadir",
						"lastName": "Eroğlu",
						"creatorType": "editor"
					},
					{
						"firstName": "İlhan",
						"lastName": "Eroğlu",
						"creatorType": "editor"
					},
					{
						"firstName": "Halil İbrahim",
						"lastName": "Aydın",
						"creatorType": "editor"
					}
				],
				"date": "2015-09-16",
				"ISBN": "9786055145545",
				"abstractNote": "Prof Dr. İlker Parasız'ın onlarca kitabı ve bilimsel çalışmaları iktisat bilimine, akademisyenlere, öğrencilere rehber olmuştur. Bu önemli çalışmaların pek çoğu iktisadi krizler üzerine kaleme alınmıştır. Bu armağan kitap da kıymetli bilim adamı İlker Hoca'ya bir minnet ve şükran ifadesi olarak hazırlanmıştır. Kitap 25 değişik üniversiteden ve Türkiye Cumhuriyet Merkez Bankası'ndan toplam 39 yazarın kaleme aldığı 28 makaleden ve dört bölüm başlığından oluşmaktadır. Kitapta iktisadi kriz konusu, teoriden pratiğe ve küresel boyuttan ulusal boyuta dizayn edilmeye çalışılmıştır. Üniversite ve kurum çeşitliliği, yazar portföyünün farklı bakış açılarına sahip akademisyenlerden oluşması bu çalışmanın en dikkat çeken özelliklerinden birisidir. Kitapta, krizlerin genel olarak nedenleri, özellikleri, yayılma yolları ile teorik ve kavramsal arka planı ve kriz kuramları tartışılmış, krizlerin çıkış nedenleri olarak teknoloji, politika, para ve banka ilişkilerinin yanı sıra ticaret ve sermaye ilişkileri de incelenmiş, liberal e Marksist görüşlerin ekonomik krizler hakkındaki yaklaşımları analiz edilmiştir. Dünyada yaşanan krizleri tarihsel perspektifte değerlendirmeyi amaçlayan bu kitap, daha çok günümüzde etkilerini devam ettiren 2008 küresel kriz üzerine yoğunlaşmakta, 2008'e kadar, 1929 krizi ile başlayan, petrol krizi, Latin Amerika, Asya ve Rusya krizlerini de derinlemesine analiz etmektedir. Özellikle, 2008 krizi, finansallaşma ve gelir adaletsiziliği ilişkisine vurgu yapmakta, yaşanan küresel kriz sonrası dünya ekonomisinin genel görünümü ve akabinde uygulanan iktisat politikalarını değerlenmektedir. Çalışmada ayrıca Türkiye'de yaşanan iktisadi krizler ile küresel krizlerinin Türkiye'ye etkilerini inceleme konusu yapılmaktadır. Ulusal ölçekte 1994 krizi bir başlıkta, 1994 sonrası dönem de 2000 ve 2001 krizi olarak iki ayrı başlıkta değerlendirilmektedir. 2008 krizi öncesi ve sonrası Türkiye ekonomisi ve 2008 krizi sonrası borç krizine yakalanan Avrupa Birliği'ndeki krizin Türkiye'ye yansımaları da ayrı makalelerde ele alınmaktadır. Kriz göstergeleri, krizden alınan dersler, risk yönetimi ve krize karşı alınacak uluslararası önlemlerle ilgili önemli makalelerin yer aldığı bu eserde risk yönetimi kavramı tartışılarak bilimsel bir temele oturtulmakta, kantitatif olarak kriz kriterleri kapsamında uluslararası işbirliği çerçevesinde yapılan G-20 toplantıları değerlendirmektedir. Kitap, iktisadi krizleri çok yönlü ele alarak bu konunun hem teorideki yerini hem de pratikteki yansımalarını yüksek öğrenimin ve konuya ilgi duyan diğer kesimlerin istifadesine sunmaktadır.",
				"language": "tr",
				"libraryCatalog": "KitapYurdu.com",
				"numPages": "661",
				"publisher": "Orion Kitabevi Akademik Kitaplar",
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
		"url": "https://www.kitapyurdu.com/kitap/ekonomi-politikasi--teori-ve-turkiye-uygulamasi/59581.html",
		"items": [
			{
				"itemType": "book",
				"title": "Ekonomi Politikası / Teori ve Türkiye Uygulaması",
				"creators": [
					{
						"firstName": "Mahfi",
						"lastName": "Eğilmez",
						"creatorType": "author"
					},
					{
						"firstName": "Ercan",
						"lastName": "Kumcu",
						"creatorType": "author"
					}
				],
				"date": "2020-02-18",
				"ISBN": "9789751415851",
				"abstractNote": "İlk olarak 2002’de yayımlanan Ekonomi Politikası, bugüne kadar defalarca basıldı. Kitap, üniversitelerde ders kitabı olarak okutuldu, çeşitli mesleklere giriş sınavlarında temel soru kitapları arasında yer aldı. Yalnızca bir ders kitabı olmakla kalmadı, aynı zamanda ekonomi öğrenmek ve izlemek isteyenlerin de elkitabı haline geldi. Bu kez kitap, güncel gelişmeleri de kapsayacak biçimde yeniden yazıldı. Kitap, bu yapısıyla ekonomi ve işletme öğrencileri için olduğu kadar ekonomi konularını merak edenler için de vazgeçilmez bir başvuru kitabı olma özelliği taşıyor.",
				"language": "tr",
				"libraryCatalog": "KitapYurdu.com",
				"numPages": "344",
				"publisher": "Remzi Kitabevi",
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
		"url": "https://www.kitapyurdu.com/kitap/dinler-sosyolojisi/420519.html",
		"items": [
			{
				"itemType": "book",
				"title": "Dinler Sosyolojisi",
				"creators": [
					{
						"firstName": "Jean Paul",
						"lastName": "Willaime",
						"creatorType": "author"
					},
					{
						"firstName": "Ramazan",
						"lastName": "Adıbelli",
						"creatorType": "translator"
					}
				],
				"date": "2017-03-04",
				"ISBN": "9786059460132",
				"abstractNote": "Dinler sosyolojisi, dinin toplumsal tezahürlerini ve bunların tarihsel gelişimini ele alır. Modern toplumu araştıran ilk sosyologlar, dini fenomenleri de incelemek zorunda kalmıştı. Ancak dini evren üzerine yöneltilen sosyolojik bakış o dönemden beri birçok kez değişti ve zenginleşti. Weber ve Durkheim’dan itibaren süregelen yaklaşımlarla birlikte en güncel sorunları da işleyen bu eser, dinlerin toplumsal olgular olduğunu ve bu olguları analiz etmenin toplumu ve gelişimini anlamada temel önem taşıdığını gösterir.",
				"language": "tr",
				"libraryCatalog": "KitapYurdu.com",
				"numPages": "136",
				"publisher": "Pinhan Yayıncılık",
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
