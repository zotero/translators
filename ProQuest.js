{
	"translatorID": "fce388a6-a847-4777-87fb-6595e710b7e7",
	"label": "ProQuest",
	"creator": "Avram Lyon",
	"target": "^https?://search\\.proquest\\.com.*\\/(docview|results|publicationissue|browseterms|browsetitles|browseresults|myresearch\\/(figtables|documents))",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2012-06-10 22:02:58"
}

/*
   ProQuest Translator
   Copyright (C) 2011 Avram Lyon, ajlyon@gmail.com

   This program is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 3 of the License, or
   (at your option) any later version.

   This program is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

var language="English";
var L={};

//returns an array of values for a given field or array of fields
//the values are in the same order as the field names
function getValue(doc, fields) {
	if(typeof(fields) != 'object') fields = [fields];

	var values = [];
	for(var i=0, n=fields.length; i<n; i++) {
		values = values.concat(ZU.xpath(doc,
			'//div[@class="display_record_indexing_fieldname" and\
				normalize-space(text())="' +
			fields[i] +
			'"]/following-sibling::div[@class="display_record_indexing_data"][1]'));
	}

	return values;
}

function getTextValue(doc, fields) {
	if(typeof(fields) != 'object') fields = [fields];

	//localize fields
	fields = fields.map(function(field) { return L[field] || field; });

	return getValue(doc, fields).map(function(e) { return e.textContent });
}

function detectWeb(doc, url) {
	var lang = ZU.xpathText(doc, '//a[@id="changeLanguageLink"]/text()');
	if(lang && lang.trim() != "English") {
		language = lang.trim();
		L = fieldNames[language];
	} else {
		language = 'English';
		L = {};
	}

	//Check for multiple first
	if (url.indexOf('docview') == -1) {
		var resultitem = ZU.xpath(doc, '//a[contains(@href, "/docview/")]');
		if (resultitem.length) {
			return "multiple";
		}
	}

	var types = getTextValue(doc, ["Source type", "Document type", "Record type"]);
	var zoteroType = getItemType(types);
	if(zoteroType) return zoteroType;

	//hack for NYTs, which misses crucial data.
	var db = getTextValue(doc, "Database");
	if (db && db.indexOf("The New York Times") !== -1) {
		return "newspaperArticle";
	}

	if (url.indexOf('/dissertations/') != -1) return "thesis";

	// Fall back on journalArticle-- even if we couldn't guess the type
	if(types.length) return "journalArticle";

	if (url.indexOf("/results/") === -1) {
		var abstract_link = ZU.xpath(doc, '//a[@class="formats_base_sprite format_abstract"]');
		if (abstract_link.length) return "journalArticle";
	}

	return false;
}

function doWeb(doc, url) {
	var type = detectWeb(doc, url);
	if (type != "multiple") {
		scrape(doc, url, type);
	} else {
		// detect web returned multiple
		var results = ZU.xpath(doc, '//a[contains(@class,"previewTitle") or\
									contains(@class,"resultTitle")]');
		// If the above didn't get us titles, try agin with a more liberal xPath
		if (!results.length) {
			results = ZU.xpath(doc, '//a[contains(@href, "/docview/")]');
		}

		var items = new Array();
		for(var i=0, n=results.length; i<n; i++) {
			items[results[i].href] = results[i].textContent;
		}

		Zotero.selectItems(items, function (items) {
			if (!items) return true;

			var articles = new Array();
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles,
				function(doc) { doWeb(doc, doc.location.href) });
		});
	}
}

function scrape(doc, url, type) {
	var item = new Zotero.Item(type);

	//title
	item.title = getTextValue(doc, "Title")[0];
	if(item.title && (item.title == item.title.toUpperCase())) {
		item.title = item.title.capitalizeTitle(item.title, true);
	}

	//authors
	var creators = getTextValue(doc, "Author").join(';')
		.replace(/(?:^|;)by\s+/i,'')	//sometimes the authors begin with "By"
		.split(/\s*;\s*|\s+and\s+/i);
	for(var i=0, n=creators.length; i<n; i++) {
		/**TODO: might have to detect proper creator type from item type*/
		item.creators.push(
			ZU.cleanAuthor(creators[i], 'author', creators[i].indexOf(',') != -1));
	}
	
	//editors
	var creators = getTextValue(doc, "Editor").join(';').split(/\s*(;|and)\s*/i);
	for(var i=0, n=creators.length; i<n; i++) {
		if(!creators[i]) continue;
		item.creators.push(ZU.cleanAuthor(creators[i], 'editor', true));
	}

	item.publicationTitle = getTextValue(doc, "Publication title")[0];
	item.volume = getTextValue(doc, "Volume")[0];
	item.issue = getTextValue(doc, "Issue")[0];
	item.numPages = getTextValue(doc, "Number of pages")[0];
	item.ISSN = getTextValue(doc, "ISSN")[0];
	item.ISBN = getTextValue(doc, "ISBN")[0];
	item.DOI = getTextValue(doc, "DOI")[0];
	item.rights = getTextValue(doc, "Copyright")[0];
	item.language = getTextValue(doc, ["Language", "Language of publication"])[0];
	item.section = getTextValue(doc, "Section")[0];
	item.date = getTextValue(doc, ["Publication date", "Publication year", "Year"])[0];
	item.pages = getTextValue(doc, "Pages")[0];
	item.university = getTextValue(doc, "School")[0];
	item.thesisType = getTextValue(doc, "Degree")[0];
	item.publisher = getTextValue(doc, "Publisher")[0];
	item.place = getTextValue(doc, ["Place of publication", "School location"])[0];
	item.url = url;

	var country = getTextValue(doc, "Country of publication")[0];
	if(country) {
		item.place = item.place ? item.place + ', ' + country : country;
	}

	//sometimes number of pages ends up in pages
	if(!item.numPages) item.numPages = item.pages;

	item.abstractNote = ZU.xpath(doc,
		'//div[@id="abstractZone" or contains(@id,"abstractFull")]/\
			p[normalize-space(text())]')
		.map(function(p) { return ZU.trimInternal(p.textContent) })
		.join('\n');

	item.attachments.push({
		title: 'Snapshot',
		document: doc
	});

	var pdfUrl = ZU.xpath(doc, '//div[@id="side_panel"]//\
		a[contains(@class,"format_pdf") and contains(@href,"fulltext")][1]');
	if(pdfUrl.length) {
		item.attachments.push({
			title: 'Full Text PDF',
			url: pdfUrl[0].href,
			mimeType: 'application/pdf'
		});
	}

	var keywords = getTextValue(doc, "Identifier / keyword").join(',') ||
					getTextValue(doc, ["Subject", "Journal subject"]).join(',');
	if(keywords) item.tags = keywords.split(/\s*(?:,|;)\s*/);

	item.complete();
}

function getItemType(types) {
	var guessType, govdoc, govdocType;
	for(var i=0, n=types.length; i<n; i++) {
		switch (types[i]) {
			case "Conference Papers and Proceedings":
			case "Conference Papers & Proceedings":
				return "conferencePaper";
			case "Dissertations & Theses":
			case "Dissertation/Thesis":
				return "thesis";
			case "Newspapers":
			case "Wire Feeds":
			case "WIRE FEED":
			case "Historical Newspapers":
				return "newspaperArticle";
			case "Scholarly Journals":
			case "Trade Journals":
			case "Historical Periodicals":
				return "journalArticle";
			case "Magazines":
				return "magazineArticle";
			case "Reports":
			case "REPORT":
				return "report";
			case "Blog":
			case "Article In An Electronic Resource Or Web Site":
				return "blogPost";
			case "Patent":
				return "patent";
			case "Government & Official Publications":
				govdoc = true;
			break;
			case "Blogs, Podcats, & Websites":
				guessType = "webpage";
			break;
			case "Books":
				guessType = "book";
			break;
			case "Pamphlets & Ephemeral Works":
				guessType = "document";
			break;
			case "Encyclopedias & Reference Works":
				guessType = "encyclopediaArticle";
			break;
		}

		if (types[i].indexOf("report", 0) != -1) {
			govdocType = "report"
		} else if (types[i].indexOf("statute", 0) != -1) {
			govdocType = "statute"
		}

		if(govdoc && govdocType) {
			return govdocType;
		}
	}

	return guessType;
}

//localized field names
var fieldNames = {
	'العربية': {
		"Source type":'نوع المصدر',
		"Document type":'نوع المستند',
		//"Record type"
		"Database":'قاعدة البيانات',
		"Title":'العنوان',
		"Author":'المؤلف',
		//"Editor":
		"Publication title":'عنوان المطبوعة',
		"Volume":'المجلد',
		"Issue":'الإصدار',
		"Number of pages":'عدد الصفحات',
		"ISSN":'رقم المسلسل الدولي',
		"ISBN":'الترقيم الدولي للكتاب',
		//"DOI":
		"Copyright":'حقوق النشر',
		"Language":'اللغة',
		"Language of publication":'لغة النشر',
		"Section":'القسم',
		"Publication date":'تاريخ النشر',
		"Publication year":'عام النشر',
		"Year":'العام',
		"Pages":'الصفحات',
		"School":'المدرسة',
		"Degree":'الدرجة',
		"Publisher":'الناشر',
		"Place of publication":'مكان النشر',
		"School location":'موقع المدرسة',
		"Country of publication":'بلد النشر',
		"Identifier / keyword":'معرف / كلمة أساسية',
		"Subject":'الموضوع',
		"Journal subject":'موضوع الدورية'
	},
	'Bahasa Indonesia': {
		"Source type":'Jenis sumber',
		"Document type":'Jenis dokumen',
		//"Record type"
		"Database":'Basis data',
		"Title":'Judul',
		"Author":'Pengarang',
		//"Editor":
		"Publication title":'Judul publikasi',
		"Volume":'Volume',
		"Issue":'Edisi',
		"Number of pages":'Jumlah halaman',
		"ISSN":'ISSN',
		"ISBN":'ISBN',
		//"DOI":
		"Copyright":'Hak cipta',
		"Language":'Bahasa',
		"Language of publication":'Bahasa publikasi',
		"Section":'Bagian',
		"Publication date":'Tanggal publikasi',
		"Publication year":'Tahun publikasi',
		"Year":'Tahun',
		"Pages":'Halaman',
		"School":'Sekolah',
		"Degree":'Gelar',
		"Publisher":'Penerbit',
		"Place of publication":'Tempat publikasi',
		"School location":'Lokasi sekolah',
		"Country of publication":'Negara publikasi',
		"Identifier / keyword":'Pengidentifikasi/kata kunci',
		"Subject":'Subjek',
		"Journal subject":'Subjek jurnal'
	},
	'Deutsch': {
		"Source type":'Quellentyp',
		"Document type":'Dokumententyp',
		//"Record type"
		"Database":'Datenbank',
		"Title":'Titel',
		"Author":'Autor',
		//"Editor":
		"Publication title":'Titel der Publikation',
		"Volume":'Band',
		"Issue":'Ausgabe',
		"Number of pages":'Seitenanzahl',
		"ISSN":'ISSN',
		"ISBN":'ISBN',
		//"DOI":
		"Copyright":'Copyright',
		"Language":'Sprache',
		"Language of publication":'Publikationssprache',
		"Section":'Bereich',
		"Publication date":'Publikationsdatum',
		"Publication year":'Erscheinungsjahr',
		"Year":'Jahr',
		"Pages":'Seiten',
		"School":'Bildungseinrichtung',
		"Degree":'Studienabschluss',
		"Publisher":'Herausgeber',
		"Place of publication":'Verlagsort',
		"School location":'Standort der Bildungseinrichtung',
		"Country of publication":'Publikationsland',
		"Identifier / keyword":'Identifikator/Schlüsselwort',
		"Subject":'Thema',
		"Journal subject":'Zeitschriftenthema'
	},
	'Español': {
		"Source type":'Tipo de fuente',
		"Document type":'Tipo de documento',
		//"Record type"
		"Database":'Base de datos',
		"Title":'Título',
		"Author":'Autor',
		//"Editor":
		"Publication title":'Título de publicación',
		"Volume":'Tomo',
		"Issue":'Número',
		"Number of pages":'Número de páginas',
		"ISSN":'ISSN',
		"ISBN":'ISBN',
		//"DOI":
		"Copyright":'Copyright',
		"Language":'Idioma',
		"Language of publication":'Idioma de la publicación',
		"Section":'Sección',
		"Publication date":'Fecha de titulación',
		"Publication year":'Año de publicación',
		"Year":'Año',
		"Pages":'Páginas',
		"School":'Institución',
		"Degree":'Título universitario',
		"Publisher":'Editorial',
		"Place of publication":'Lugar de publicación',
		"School location":'Lugar de la institución',
		"Country of publication":'País de publicación',
		"Identifier / keyword":'Identificador / palabra clave',
		"Subject":'Materia',
		"Journal subject":'Materia de la revista'
	},
	'Français': {
		"Source type":'Type de source',
		"Document type":'Type de document',
		//"Record type"
		"Database":'Base de données',
		"Title":'Titre',
		"Author":'Auteur',
		//"Editor":
		"Publication title":'Titre de la publication',
		"Volume":'Volume',
		"Issue":'Numéro',
		"Number of pages":'Nombre de pages',
		"ISSN":'ISSN',
		"ISBN":'ISBN',
		//"DOI":
		"Copyright":'Copyright',
		"Language":'Langue',
		"Language of publication":'Langue de publication',
		"Section":'Section',
		"Publication date":'Date du diplôme',
		"Publication year":'Année de publication',
		"Year":'Année',
		"Pages":'Pages',
		"School":'École',
		"Degree":'Diplôme',
		"Publisher":'Éditeur',
		"Place of publication":'Lieu de publication',
		"School location":'Localisation de l'école',
		"Country of publication":'Pays de publication',
		"Identifier / keyword":'Identificateur / mot-clé',
		"Subject":'Sujet',
		"Journal subject":'Sujet de la publication'
	},
	'한국어': {
		"Source type":'원본 유형',
		"Document type":'문서 형식',
		//"Record type"
		"Database":'데이터베이스',
		"Title":'제목',
		"Author":'저자',
		//"Editor":
		"Publication title":'출판물 제목',
		"Volume":'권',
		"Issue":'호',
		"Number of pages":'페이지 수',
		"ISSN":'ISSN',
		"ISBN":'ISBN',
		//"DOI":
		"Copyright":'Copyright',
		"Language":'언어',
		"Language of publication":'출판 언어',
		"Section":'섹션',
		"Publication date":'출판 날짜',
		"Publication year":'출판 연도',
		"Year":'연도',
		"Pages":'페이지',
		"School":'학교',
		"Degree":'학위',
		"Publisher":'출판사',
		"Place of publication":'출판 지역',
		"School location":'학교 지역',
		"Country of publication":'출판 국가',
		"Identifier / keyword":'식별자/키워드',
		"Subject":'주제',
		"Journal subject":'저널 주제'
	},
	'Italiano': {
		"Source type":'Tipo di fonte',
		"Document type":'Tipo di documento',
		//"Record type"
		"Database":'Database',
		"Title":'Titolo',
		"Author":'Autore',
		//"Editor":
		"Publication title":'Titolo pubblicazione',
		"Volume":'Volume',
		"Issue":'Fascicolo',
		"Number of pages":'Numero di pagine',
		"ISSN":'ISSN',
		"ISBN":'ISBN',
		//"DOI":
		"Copyright":'Copyright',
		"Language":'Lingua',
		"Language of publication":'Lingua di pubblicazione',
		"Section":'Sezione',
		"Publication date":'Data di pubblicazione',
		"Publication year":'Anno di pubblicazione',
		"Year":'Anno',
		"Pages":'Pagine',
		"School":'Istituzione accademica',
		"Degree":'Titolo accademico',
		"Publisher":'Casa editrice',
		"Place of publication":'Luogo di pubblicazione:',
		"School location":'Località istituzione accademica',
		"Country of publication":'Paese di pubblicazione',
		"Identifier / keyword":'Identificativo/parola chiave',
		"Subject":'Soggetto',
		"Journal subject":'Soggetto rivista'
	},
	'Magyar': {
		"Source type":'Forrástípus',
		"Document type":'Dokumentum típusa',
		//"Record type"
		"Database":'Adatbázis',
		"Title":'Cím',
		"Author":'Szerző',
		//"Editor":
		"Publication title":'Publikáció címe',
		"Volume":'Kötet',
		"Issue":'Szám',
		"Number of pages":'Oldalszám',
		"ISSN":'ISSN',
		"ISBN":'ISBN',
		//"DOI":
		"Copyright":'Copyright',
		"Language":'Nyelv',
		"Language of publication":'Publikáció nyelve',
		"Section":'Rész',
		"Publication date":'Publikáció dátuma',
		"Publication year":'Publikáció éve',
		"Year":'Év',
		"Pages":'Oldalak',
		"School":'Iskola',
		"Degree":'Diploma',
		"Publisher":'Kiadó',
		"Place of publication":'Publikáció helye',
		"School location":'Iskola helyszíne:',
		"Country of publication":'Publikáció országa',
		"Identifier / keyword":'Azonosító / kulcsszó',
		"Subject":'Tárgy',
		"Journal subject":'Folyóirat tárgya'
	}/*,
	'日本語': {
		"Source type":'نوع المصدر',
		"Document type":'نوع المستند',
		//"Record type"
		"Database":'قاعدة البيانات',
		"Title":'العنوان',
		"Author":'المؤلف',
		//"Editor":
		"Publication title":'عنوان المطبوعة',
		"Volume":'المجلد',
		"Issue":'الإصدار',
		"Number of pages":'عدد الصفحات',
		"ISSN":'رقم المسلسل الدولي',
		"ISBN":'الترقيم الدولي للكتاب',
		//"DOI":
		"Copyright":'حقوق النشر',
		"Language":'اللغة',
		"Language of publication":'لغة النشر',
		"Section":'القسم',
		"Publication date":'تاريخ النشر',
		"Publication year":'عام النشر',
		"Year":'العام',
		"Pages":'الصفحات',
		"School":'المدرسة',
		"Degree":'الدرجة',
		"Publisher":'الناشر',
		"Place of publication":'مكان النشر',
		"School location":'موقع المدرسة',
		"Country of publication":'بلد النشر',
		"Identifier / keyword":'معرف / كلمة أساسية',
		"Subject":'الموضوع','عنوان المطبوع',
		"Journal subject":'موضوع الدورية'
	},
	'Norsk': {
		"Source type":'نوع المصدر',
		"Document type":'نوع المستند',
		//"Record type"
		"Database":'قاعدة البيانات',
		"Title":'العنوان',
		"Author":'المؤلف',
		//"Editor":
		"Publication title":'عنوان المطبوعة',
		"Volume":'المجلد',
		"Issue":'الإصدار',
		"Number of pages":'عدد الصفحات',
		"ISSN":'رقم المسلسل الدولي',
		"ISBN":'الترقيم الدولي للكتاب',
		//"DOI":
		"Copyright":'حقوق النشر',
		"Language":'اللغة',
		"Language of publication":'لغة النشر',
		"Section":'القسم',
		"Publication date":'تاريخ النشر',
		"Publication year":'عام النشر',
		"Year":'العام',
		"Pages":'الصفحات',
		"School":'المدرسة',
		"Degree":'الدرجة',
		"Publisher":'الناشر',
		"Place of publication":'مكان النشر',
		"School location":'موقع المدرسة',
		"Country of publication":'بلد النشر',
		"Identifier / keyword":'معرف / كلمة أساسية',
		"Subject":'الموضوع','عنوان المطبوع',
		"Journal subject":'موضوع الدورية'
	},
	'Polski': {
		"Source type":'نوع المصدر',
		"Document type":'نوع المستند',
		//"Record type"
		"Database":'قاعدة البيانات',
		"Title":'العنوان',
		"Author":'المؤلف',
		//"Editor":
		"Publication title":'عنوان المطبوعة',
		"Volume":'المجلد',
		"Issue":'الإصدار',
		"Number of pages":'عدد الصفحات',
		"ISSN":'رقم المسلسل الدولي',
		"ISBN":'الترقيم الدولي للكتاب',
		//"DOI":
		"Copyright":'حقوق النشر',
		"Language":'اللغة',
		"Language of publication":'لغة النشر',
		"Section":'القسم',
		"Publication date":'تاريخ النشر',
		"Publication year":'عام النشر',
		"Year":'العام',
		"Pages":'الصفحات',
		"School":'المدرسة',
		"Degree":'الدرجة',
		"Publisher":'الناشر',
		"Place of publication":'مكان النشر',
		"School location":'موقع المدرسة',
		"Country of publication":'بلد النشر',
		"Identifier / keyword":'معرف / كلمة أساسية',
		"Subject":'الموضوع','عنوان المطبوع',
		"Journal subject":'موضوع الدورية'
	},
	'Português (Brasil)': {
		"Source type":'نوع المصدر',
		"Document type":'نوع المستند',
		//"Record type"
		"Database":'قاعدة البيانات',
		"Title":'العنوان',
		"Author":'المؤلف',
		//"Editor":
		"Publication title":'عنوان المطبوعة',
		"Volume":'المجلد',
		"Issue":'الإصدار',
		"Number of pages":'عدد الصفحات',
		"ISSN":'رقم المسلسل الدولي',
		"ISBN":'الترقيم الدولي للكتاب',
		//"DOI":
		"Copyright":'حقوق النشر',
		"Language":'اللغة',
		"Language of publication":'لغة النشر',
		"Section":'القسم',
		"Publication date":'تاريخ النشر',
		"Publication year":'عام النشر',
		"Year":'العام',
		"Pages":'الصفحات',
		"School":'المدرسة',
		"Degree":'الدرجة',
		"Publisher":'الناشر',
		"Place of publication":'مكان النشر',
		"School location":'موقع المدرسة',
		"Country of publication":'بلد النشر',
		"Identifier / keyword":'معرف / كلمة أساسية',
		"Subject":'الموضوع','عنوان المطبوع',
		"Journal subject":'موضوع الدورية'
	},
	'Português (Portugal)': {
		"Source type":'نوع المصدر',
		"Document type":'نوع المستند',
		//"Record type"
		"Database":'قاعدة البيانات',
		"Title":'العنوان',
		"Author":'المؤلف',
		//"Editor":
		"Publication title":'عنوان المطبوعة',
		"Volume":'المجلد',
		"Issue":'الإصدار',
		"Number of pages":'عدد الصفحات',
		"ISSN":'رقم المسلسل الدولي',
		"ISBN":'الترقيم الدولي للكتاب',
		//"DOI":
		"Copyright":'حقوق النشر',
		"Language":'اللغة',
		"Language of publication":'لغة النشر',
		"Section":'القسم',
		"Publication date":'تاريخ النشر',
		"Publication year":'عام النشر',
		"Year":'العام',
		"Pages":'الصفحات',
		"School":'المدرسة',
		"Degree":'الدرجة',
		"Publisher":'الناشر',
		"Place of publication":'مكان النشر',
		"School location":'موقع المدرسة',
		"Country of publication":'بلد النشر',
		"Identifier / keyword":'معرف / كلمة أساسية',
		"Subject":'الموضوع','عنوان المطبوع',
		"Journal subject":'موضوع الدورية'
	},
	'Русский': {
		"Source type":'نوع المصدر',
		"Document type":'نوع المستند',
		//"Record type"
		"Database":'قاعدة البيانات',
		"Title":'العنوان',
		"Author":'المؤلف',
		//"Editor":
		"Publication title":'عنوان المطبوعة',
		"Volume":'المجلد',
		"Issue":'الإصدار',
		"Number of pages":'عدد الصفحات',
		"ISSN":'رقم المسلسل الدولي',
		"ISBN":'الترقيم الدولي للكتاب',
		//"DOI":
		"Copyright":'حقوق النشر',
		"Language":'اللغة',
		"Language of publication":'لغة النشر',
		"Section":'القسم',
		"Publication date":'تاريخ النشر',
		"Publication year":'عام النشر',
		"Year":'العام',
		"Pages":'الصفحات',
		"School":'المدرسة',
		"Degree":'الدرجة',
		"Publisher":'الناشر',
		"Place of publication":'مكان النشر',
		"School location":'موقع المدرسة',
		"Country of publication":'بلد النشر',
		"Identifier / keyword":'معرف / كلمة أساسية',
		"Subject":'الموضوع','عنوان المطبوع',
		"Journal subject":'موضوع الدورية'
	},
	'ไทย': {
		"Source type":'نوع المصدر',
		"Document type":'نوع المستند',
		//"Record type"
		"Database":'قاعدة البيانات',
		"Title":'العنوان',
		"Author":'المؤلف',
		//"Editor":
		"Publication title":'عنوان المطبوعة',
		"Volume":'المجلد',
		"Issue":'الإصدار',
		"Number of pages":'عدد الصفحات',
		"ISSN":'رقم المسلسل الدولي',
		"ISBN":'الترقيم الدولي للكتاب',
		//"DOI":
		"Copyright":'حقوق النشر',
		"Language":'اللغة',
		"Language of publication":'لغة النشر',
		"Section":'القسم',
		"Publication date":'تاريخ النشر',
		"Publication year":'عام النشر',
		"Year":'العام',
		"Pages":'الصفحات',
		"School":'المدرسة',
		"Degree":'الدرجة',
		"Publisher":'الناشر',
		"Place of publication":'مكان النشر',
		"School location":'موقع المدرسة',
		"Country of publication":'بلد النشر',
		"Identifier / keyword":'معرف / كلمة أساسية',
		"Subject":'الموضوع','عنوان المطبوع',
		"Journal subject":'موضوع الدورية'
	},
	'Türkçe': {
		"Source type":'نوع المصدر',
		"Document type":'نوع المستند',
		//"Record type"
		"Database":'قاعدة البيانات',
		"Title":'العنوان',
		"Author":'المؤلف',
		//"Editor":
		"Publication title":'عنوان المطبوعة',
		"Volume":'المجلد',
		"Issue":'الإصدار',
		"Number of pages":'عدد الصفحات',
		"ISSN":'رقم المسلسل الدولي',
		"ISBN":'الترقيم الدولي للكتاب',
		//"DOI":
		"Copyright":'حقوق النشر',
		"Language":'اللغة',
		"Language of publication":'لغة النشر',
		"Section":'القسم',
		"Publication date":'تاريخ النشر',
		"Publication year":'عام النشر',
		"Year":'العام',
		"Pages":'الصفحات',
		"School":'المدرسة',
		"Degree":'الدرجة',
		"Publisher":'الناشر',
		"Place of publication":'مكان النشر',
		"School location":'موقع المدرسة',
		"Country of publication":'بلد النشر',
		"Identifier / keyword":'معرف / كلمة أساسية',
		"Subject":'الموضوع','عنوان المطبوع',
		"Journal subject":'موضوع الدورية'
	},
	'中文(简体)‎': {
		"Source type":'نوع المصدر',
		"Document type":'نوع المستند',
		//"Record type"
		"Database":'قاعدة البيانات',
		"Title":'العنوان',
		"Author":'المؤلف',
		//"Editor":
		"Publication title":'عنوان المطبوعة',
		"Volume":'المجلد',
		"Issue":'الإصدار',
		"Number of pages":'عدد الصفحات',
		"ISSN":'رقم المسلسل الدولي',
		"ISBN":'الترقيم الدولي للكتاب',
		//"DOI":
		"Copyright":'حقوق النشر',
		"Language":'اللغة',
		"Language of publication":'لغة النشر',
		"Section":'القسم',
		"Publication date":'تاريخ النشر',
		"Publication year":'عام النشر',
		"Year":'العام',
		"Pages":'الصفحات',
		"School":'المدرسة',
		"Degree":'الدرجة',
		"Publisher":'الناشر',
		"Place of publication":'مكان النشر',
		"School location":'موقع المدرسة',
		"Country of publication":'بلد النشر',
		"Identifier / keyword":'معرف / كلمة أساسية',
		"Subject":'الموضوع','عنوان المطبوع',
		"Journal subject":'موضوع الدورية'
	},
	'中文(繁體)': {
		"Source type":'نوع المصدر',
		"Document type":'نوع المستند',
		//"Record type"
		"Database":'قاعدة البيانات',
		"Title":'العنوان',
		"Author":'المؤلف',
		//"Editor":
		"Publication title":'عنوان المطبوعة',
		"Volume":'المجلد',
		"Issue":'الإصدار',
		"Number of pages":'عدد الصفحات',
		"ISSN":'رقم المسلسل الدولي',
		"ISBN":'الترقيم الدولي للكتاب',
		//"DOI":
		"Copyright":'حقوق النشر',
		"Language":'اللغة',
		"Language of publication":'لغة النشر',
		"Section":'القسم',
		"Publication date":'تاريخ النشر',
		"Publication year":'عام النشر',
		"Year":'العام',
		"Pages":'الصفحات',
		"School":'المدرسة',
		"Degree":'الدرجة',
		"Publisher":'الناشر',
		"Place of publication":'مكان النشر',
		"School location":'موقع المدرسة',
		"Country of publication":'بلد النشر',
		"Identifier / keyword":'معرف / كلمة أساسية',
		"Subject":'الموضوع','عنوان المطبوع',
		"Journal subject":'موضوع الدورية'
	}*/
};/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://search.proquest.com/dissertations/docview/251755786/abstract/132B8A749B71E82DBA1/1",
		"items": [
			{
				"itemType": "thesis",
				"creators": [
					{
						"firstName": "Valleri Jane",
						"lastName": "Robinson",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"Communication and the arts",
					"Stanislavsky",
					"Konstantin",
					"Konstantin Stanislavsky",
					"Russian",
					"Modernism",
					"Theater"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Snapshot"
					},
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"title": "Beyond Stanislavsky: The influence of Russian modernism on the American theatre",
				"numPages": "233 p.",
				"ISBN": "9780493440408, 0493440402",
				"rights": "Copyright UMI - Dissertations Publishing 2001",
				"language": "English",
				"section": "0168",
				"date": "2001",
				"pages": "233 p.",
				"university": "The Ohio State University",
				"thesisType": "Ph.D.",
				"place": "United States -- Ohio",
				"url": "http://search.proquest.com/dissertations/docview/251755786/abstract/132B8A749B71E82DBA1/1",
				"abstractNote": "Russian modernist theatre greatly influenced the development of American theatre during the first three decades of the twentieth century. Several developments encouraged the relationships between Russian artists and their American counterparts, including key tours by Russian artists in America, the advent of modernism in the American theatre, the immigration of Eastern Europeans to the United States, American advertising and consumer culture, and the Bolshevik Revolution and all of its domestic and international ramifications. Within each of these major and overlapping developments, Russian culture became increasingly acknowledged and revered by American artists and thinkers, who were seeking new art forms to express new ideas. This study examines some of the most significant contributions of Russian theatre and its artists in the early decades of the twentieth century. Looking beyond the important visit of the Moscow Art Theatre in 1923, this study charts the contributions of various Russian artists and their American supporters.\nCertainly, the influence of Stanislavsky and the Moscow Art Theatre on the modern American theatre has been significant, but theatre historians' attention to his influence has overshadowed the contributions of other Russian artists, especially those who provided non-realistic approaches to theatre. In order to understand the extent to which Russian theatre influenced the American stage, this study focuses on the critics, intellectuals, producers, and touring artists who encouraged interaction between Russians and Americans, and in the process provided the catalyst for American theatrical experimentation. The key figures in this study include some leaders in the Yiddish intellectual and theatrical communities in New York City, Morris Gest and Otto H. Kahn, who imported many important Russian performers for American audiences, and a number of Russian émigré artists, including Jacob Gordin, Jacob Ben-Ami, Benno Schneider, Boris Aronson, and Michel Fokine, who worked in the American theatre during the first three decades of the twentieth century.",
				"libraryCatalog": "ProQuest",
				"accessDate": "CURRENT_TIMESTAMP",
				"shortTitle": "Beyond Stanislavsky"
			}
		]
	},
	{
		"type": "web",
		"url": "http://search.proquest.com/docview/213445241",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Gerald F.",
						"lastName": "Powers",
						"creatorType": "author"
					},
					{
						"firstName": "Drew",
						"lastName": "Christiansen",
						"creatorType": "author"
					},
					{
						"firstName": "Robert T.",
						"lastName": "Hennemeyer",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"Peace",
					"Book reviews",
					"Sciences: Comprehensive Works",
					"Sociology",
					"Political Science--International Relations"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Snapshot"
					}
				],
				"title": "Peacemaking: moral & policy challenges for a new world // Review",
				"publicationTitle": "Peace Research",
				"volume": "27",
				"issue": "2",
				"numPages": "0",
				"ISSN": "00084697",
				"rights": "Copyright Peace Research May 1995",
				"language": "English",
				"date": "May 1995",
				"pages": "90-100",
				"publisher": "Menno Simons College",
				"place": "Winnipeg, Canada",
				"url": "http://search.proquest.com/docview/213445241",
				"abstractNote": "In his \"Introduction\" to the book entitled Peacemaking: Moral and Policy Challenges for a New World, Rev. Drew Christiansen points out that the Roman Catholic bishops of the United States have made a clear distinction between the social teachings of the Church--comprising universally binding moral and ethical principles--and the particular positions they have taken on public policy issues--such as those relating to war, peace, justice, human rights and other socio-political matters. While the former are not to be mitigated under any circumstances, the latter, being particular applications, observations and recommendations, can allow for plurality of opinion and diversity of focus in the case of specific social, political and opinion and diversity of focus in the case of specific social, political and moral issues.(f.1) Peacemaking aligns itself with this second category. The objectives of this review essay are the following: to summarize the main topics and themes, of some of the recently-published documents on Catholic political thought, relating to peacemaking and peacekeeping; and to provide a brief critique of their main contents, recommendations and suggestions.\nThe Directions of Peacemaking: As in the earlier documents, so too are the virtues of faith, hope, courage, compassion, humility, kindness, patience, perseverance, civility and charity emphasized, in The Harvest of Justice, as definite aids in peacemaking and peacekeeping. The visions of global common good, social and economic development consistent with securing and nurturing conditions for justice and peace, solidarity among people, as well as cooperation among the industrial rich and the poor developing nations are also emphasized as positive enforcements in the peacemaking and peacekeeping processes. All of these are laudable commitments, so long as they are pursued through completely pacifist perspectives. The Harvest of Justice also emphasizes that, \"as far as possible, justice should be sought through nonviolent means;\" however, \"when sustained attempt at nonviolent action fails, then legitimate political authorities are permitted as a last resort to employ limited force to rescue the innocent and establish justice.\"(f.13) The document also frankly admits that \"the vision of Christian nonviolence is not passive.\"(f.14) Such a position may disturb many pacifists. Even though some restrictive conditions--such as a \"just cause,\" \"comparative justice,\" legitimate authority\" to pursue justice issues, \"right intentions,\" probability of success, proportionality of gains and losses in pursuing justice, and the use of force as last resort--are indicated and specified in the document, the use of violence and devastation are sanctioned, nevertheless, by its reaffirmation of the use of force in setting issues and by its support of the validity of the \"just war\" tradition.\nThe first section, entitled \"Theology, Morality, and Foreign Policy in A New World,\" contains four essays. These deal with the new challenges of peace, the illusion of control, creating peace conditions through a theological framework, as well as moral reasoning and foreign policy after the containment. The second, comprising six essays, is entitled \"Human Rights, Self-Determination, and Sustainable Development.\" These essays deal with effective human rights agenda, religious nationalism and human rights, identity, sovereignty, and self-determination, peace and the moral imperatives of democracy, and political economy of peace. The two essays which comprise the third section, entitled \"Global Institutions,\" relate the strengthening of the global institutions and action for the future. The fourth, entitled \"The Use of Force After the Cold War,\" is both interesting and controversial. Its six essays discuss ethical dilemmas in the use of force, development of the just-war tradition, in a multicultural world, casuistry, pacifism, and the just-war tradition, possibilities and limits of humanitarian intervention, and the challenge of peace and stability in a new international order. The last section, devoted to \"Education and Action for Peace,\" contains three essays, which examine the education for peacemaking, the challenge of conscience and the pastoral response to ongoing challenge of peace.",
				"libraryCatalog": "ProQuest",
				"accessDate": "CURRENT_TIMESTAMP",
				"shortTitle": "Peacemaking"
			}
		]
	},
	{
		"type": "web",
		"url": "http://search.proquest.com/hnpnewyorktimes/docview/122485317/abstract/1357D8A4FC136DF28E3/11?accountid=12861",
		"items": [
			{
				"itemType": "newspaperArticle",
				"creators": [
					{
						"firstName": "F. Stephen",
						"lastName": "Larrabee",
						"creatorType": "author"
					},
					{
						"firstName": "R. G.",
						"lastName": "Livingston",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Snapshot"
					},
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"title": "Rethinking Policy on East Germany",
				"publicationTitle": "New York Times (1923-Current file)",
				"numPages": "1",
				"ISSN": "03624331",
				"rights": "Copyright New York Times Company Aug 22, 1984",
				"language": "English",
				"date": "Aug 22, 1984",
				"pages": "A23",
				"publisher": "New York Times Company",
				"place": "New York, N.Y., United States",
				"url": "http://search.proquest.com/hnpnewyorktimes/docview/122485317/abstract/1357D8A4FC136DF28E3/11?accountid=12861",
				"abstractNote": "For some months now, a gradual thaw has been in the making between East Germany and West Germany. So far, the United States has paid scant attention -- an attitude very much in keeping with our neglect of East Germany throughout the postwar period. We should reconsider this policy before things much further -- and should in particular begin to look more closely at what is going on in East Germany.",
				"libraryCatalog": "ProQuest",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://search.proquest.com/docview/129023293/abstract?accountid=12861",
		"items": [
			{
				"itemType": "newspaperArticle",
				"creators": [
					{
						"firstName": "",
						"lastName": "",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"Business And Economics--Banking And Finance"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Snapshot"
					},
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"title": "THE PRESIDENT AND ALDRICH.: Railway Age Relates Happenings Behind the Scenes Regarding Rate Regulation.",
				"publicationTitle": "Wall Street Journal (1889-1922)",
				"numPages": "1",
				"rights": "Copyright Dow Jones & Company Inc Dec 5, 1905",
				"language": "English",
				"date": "Dec 5, 1905",
				"pages": "7",
				"publisher": "Dow Jones & Company Inc",
				"place": "New York, N.Y., United States",
				"url": "http://search.proquest.com/docview/129023293/abstract?accountid=12861",
				"abstractNote": "The Railway Age says: \"The history of the affair (railroad rate question) as it has gone on behind the scenes, is about as follows.",
				"libraryCatalog": "ProQuest",
				"accessDate": "CURRENT_TIMESTAMP",
				"shortTitle": "THE PRESIDENT AND ALDRICH."
			}
		]
	}
]
/** END TEST CASES **/