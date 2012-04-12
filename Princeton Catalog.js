{
	"translatorID": "f1f3aa05-d752-4a46-b362-1d3dc87c7c36",
	"label": "Princeton Catalog+",
	"creator": "Jeremy Darrington, Kevin Reiss",
	"target": "https?://[^/]+princeton\\.edu/primo_library/",
	"minVersion": "2.1.9",
	"maxVersion": null,
	"priority": 1,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "g",
	"lastUpdated": "2012-04-12 17:13:11"
}

//
//Supports Catalog+ at Princeton University Library
//http://searchit.princeton.edu/
//Modified from original "Primo.js" translator
//created by "Matt Burton, Avram Lyon, Etienne Cavali√©, Rintze Zelle
//at https://github.com/zotero/translators/blob/master/Primo.js
// revised to include updates/enhancements from the 3-16-2012 update of Primo.js
// https://github.com/zotero/translators/commit/215f735b081950885a1721cd64ac9f4ff08556ea


function detectWeb(doc, url) {
	//var namespace = doc.documentElement.namespaceURI;
	//var nsResolver = namespace ? function(prefix) {
	//		if (prefix == 'x') return namespace; else return null;
	//	} : null;
	// These xpaths will now grab results from Primo sites using the "CustomLayoutContainer" class from Primo's Back Office Editor	
		if (doc.evaluate('//span[contains(@class, "results_corner EXLResultsTitleCorner")]', doc, null, XPathResult.ANY_TYPE, null).iterateNext() ) { 
			 return 'multiple';
		}
		else if (doc.evaluate('//div[contains(@class, "EXLContent EXLBriefDisplay")]', doc, null, XPathResult.ANY_TYPE, null).iterateNext() ) { 
			 return 'multiple';
		}
		else if (doc.evaluate('//div[contains(@class, "results2 EXLFullResultsHeader")]', doc, null, XPathResult.ANY_TYPE, null).iterateNext() ) { 
			return 'book';
		}
		else if (doc.evaluate('//div[contains(@class, "EXLContent EXLFullDisplay")]', doc, null, XPathResult.ANY_TYPE, null).iterateNext() ) { 
			return 'book';
		}
	}

// There is code for handling RIS, but let's stick with PNX for now.

function doWeb(doc, url) {
	var links = new Array();
	
	if (detectWeb(doc,url) == 'multiple') {
			var items = new Object();
			
			var linkIterator = "";
			var titleIterator = "";
			if (doc.evaluate('//h2[contains(@class, "EXLResultTitle")]/a/@href', doc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null).snapshotLength == 0)
			{
				// Primo v2
				linkIterator = doc.evaluate('//div[contains(@class, "title")]/a/@href', doc, null, XPathResult.ANY_TYPE, null);
				titleIterator = doc.evaluate('//div[contains(@class, "title")]/a/span', doc, null, XPathResult.ANY_TYPE, null);
			}
			else
			{
				// Primo v3
				linkIterator = doc.evaluate('//h2[contains(@class, "EXLResultTitle")]/a/@href', doc, null, XPathResult.ANY_TYPE, null);
				titleIterator = doc.evaluate('//h2[contains(@class, "EXLResultTitle")]/a', doc, null, XPathResult.ANY_TYPE, null);
			}

			
			// try/catch for the case when there are no search results, let doc.evealuate fail quietly
			try {
				while (link = linkIterator.iterateNext(), title = titleIterator.iterateNext()) {
					
					// create an array containing the links and add '&showPnx=true' to the end
					var xmlLink = Zotero.Utilities.trimInternal(link.textContent)+'&showPnx=true';
					//Zotero.debug(xmlLink);
					var title = Zotero.Utilities.trimInternal(title.textContent);
					items[xmlLink] = title;
				}
				
				Zotero.selectItems(items, function (items) {
					if (!items) {
						return true;
					}
					for (var i in items) {
						links.push(i);
					}
					//Z.debug(links)
					ZU.doGet(links, scrape, function () {
						Zotero.done();
					});
					Zotero.wait();
				});
				
			} catch(e) {
				Zotero.debug("Search results contained zero items. "+e);
				return;
			}

	} else {
		links = url + '&showPnx=true';
		Zotero.Utilities.doGet(links, scrape, function () {
			Zotero.done();
		});
	}
}
	
	//Zotero.Utilities.HTTP.doGet(links, function(text) {
	function scrape(text){
		Z.debug(text);
		var parser = new DOMParser();
		var doc = parser.parseFromString(text, "text/xml");
		
		itemType = ZU.xpathText(doc, '//display/type');
		if ((itemType == 'book')) {
			var item = new Zotero.Item("book");
		} else if (itemType == 'audio') {
			var item = new Zotero.Item("audioRecording");
		} else if (itemType == 'video') {
			var item = new Zotero.Item("videoRecording");
		} else if (itemType == 'report') {
			var item = new Zotero.Item("report");
		} else if (itemType == 'webpage') {
			var item = new Zotero.Item("webpage");
		} else if (itemType == 'article') {
			var item = new Zotero.Item("articleJournal");
		} else if (itemType == 'thesis') {
			var item = new Zotero.Item("thesis");
		} else if (itemType == 'map') {
			var item = new Zotero.Item("map");
		} else if (itemType == 'archives') { //route primo item type archives to manuscript
			var item = new Zotero.Item('manuscript');
		} else {
			var item = new Zotero.Item("document");
		}
		
		item.title = ZU.superCleanString(ZU.xpathText(doc, '//search/title[1]'));			
		
		var creators;
		var contributors;
		if (ZU.xpathText(doc, '//display/creator')) {
			creators = ZU.xpath(doc, '//display/creator'); 
		}
		
		if (ZU.xpathText(doc, '//display/contributor')) {
			contributors = ZU.xpath(doc, '//display/contributor'); 
		}
		
		if (!creators && contributors) { // <creator> not available using <contributor> as author instead
			creators = contributors;
			contributors = null;
		}
		
		for (i in creators) {
			if (creators[i]) {
				var creator  = creators[i].textContent.split(/\s*;\s*/);
				for (j in creator){
					creator[j] = creator[j].replace(/\d{4}-(\d{4})?/g, '')
					item.creators.push(Zotero.Utilities.cleanAuthor(creator[j], "author", true));
				}			
			}
		}
		
		for (i in contributors) {
			if (contributors[i]) {
				var contributor = contributors[i].textContent.split(/\s*;\s*/);
				for (j in contributor){
					contributor[j] = contributor[j].replace(/\d{4}-(\d{4})?/g, '')
					item.creators.push(Zotero.Utilities.cleanAuthor(contributor[j], "contributor", true));
				}			
			}
		}
		//PNX doesn't do well with institutional authors; This isn't perfect, but it helps:
		for (i in item.creators){
			if (!item.creators[i].firstName){
				item.creators[i].fieldMode=1;
			}
		}
		
		
		var pubplace;
		if (pubplace = ZU.xpathText(doc, '//addata/cop')) {
			item.place = ZU.superCleanString(ZU.xpathText(doc, '//addata/cop'));
		}
		
		var publisher;
		if (publisher = ZU.xpathText(doc, '//addata/pub')) {
			item.publisher = publisher;
		}
		
		// expand or to use search section in lieu of missing display tag
		var date;
		if (date = ZU.xpathText(doc, '//display/creationdate|//search/creationdate')) {
			item.date = date.match(/\d+/)[0];
		}
		
		// We really hope that Primo always uses ISO 639-2
		// This looks odd, but it just means that we're using the verbatim
		// content if it isn't in our ISO 639-2 hash.
		var language;
		if (language = ZU.xpathText(doc, '//facets/language[1]')) {
			if(!(item.language = iso6392(language)))
				item.language = language;
		}
		
		// local pul fields for pages, numVolues, isbn
		var pages;
		if (ZU.xpathText(doc, '//display/lds03') == null) {
			item.pages = null;
		}
		else if (pages = ZU.xpathText(doc, '//display/lds03').match(/\d+(?= p.)/))
		{
			item.pages = item.numPages = pages[0];
		}
		
		var numVolumes;
		if (ZU.xpathText(doc, '//display/lds03') == null) {
			item.numberOfVolumes = null;
		}
		else if (numVolumes = ZU.xpathText(doc, '//display/lds03').match(/\d+(?= v)/)) {
			item.numberOfVolumes = numVolumes;
		}
	
		// The identifier field is supposed to have standardized format, but
		// the super-tolerant idCheck should be better than a regex.
		// (although note that it will reject invalid ISBNs)
		var locators;
		if (locators = ZU.xpathText(doc, 'addata/isbn[1]')) {
			locators = idCheck(locators);
			if (locators.isbn10) item.ISBN = locators.isbn10;
			if (locators.isbn13) item.ISBN = locators.isbn13;
			if (locators.issn) item.ISSN = locators.issn;
		}
		
		var edition;
		if (edition = ZU.xpathText(doc, '//display/edition')) {
			item.edition = edition;
		}
		
		
	// local pul processing for Series Title and Series Number 
	var seriesTitle;
	if(seriesTitle = ZU.xpathText(doc, '//addata/seriestitle[1]')) {
		var seriesPatt = /(.+)v\./
		var seriesPatt2 = /\;\s\d+/
		var seriesPatt3 = /\;.+\d+/
		var seriesPatt4 = /\;.+\d+.+/
		var seriesPatt5 = /\.\s\d+/
		var seriesPatt6 = /\,\s\d+/
		if (seriesPatt.test(seriesTitle)) {
			seriesTitle = seriesTitle.match(/(.+)v\./)[0];
			item.series = seriesTitle.slice(0, -4);
			}
		else if (seriesPatt2.test(seriesTitle)) {
			seriesTitle = seriesTitle.split(" ; ")
			item.series = seriesTitle[0];
 			}
		else if (seriesPatt3.test(seriesTitle)) {
			item.series = seriesTitle.match(/.+(?= ;)/);
			}
		else if (seriesPatt4.test(seriesTitle)) {
			item.series = seriesTitle.match(/.+(?= ;)/);
			}
		else if (seriesPatt5.test(seriesTitle)) {
			item.series = seriesTitle.match(/.+(?= .)/);
			} 
		else if (seriesPatt6.test(seriesTitle)) {
			item.series = seriesTitle.match(/.+(?=,)/);
			} 
		else { 
			item.series = seriesTitle;			
			}
	}
	
	var seriesNum;
	if(seriesNum = ZU.xpathText(doc, '//addata/seriestitle')) {
		var seriesNumPatt = /\;\s\d+/
		var seriesNumPatt2 = /\;.+\d+/
		var seriesNumPatt3 = /\.\s\d+/
		var seriesNumPatt4 = /\;.+\d+.+/
		if (seriesNumPatt.test(seriesNum)) {
			seriesNum = seriesNum.slice(/\;\s\d+/);
			item.seriesNumber = seriesNum.match(/\d+/);
		}
		else if (seriesNumPatt2.test(seriesNum)){
			seriesNum = seriesNum.slice(/\;.+\d+/);
			item.seriesNumber = seriesNum.match(/\d+/);
		}
		else if (seriesNumPatt3.test(seriesNum)) {
			seriesNum = seriesNum.slice(/\.\s\d+/);
			item.seriesNumber = seriesNum.match(/\d+/);
		}
		else if (seriesNumPatt4.test(seriesNum)){
			seriesNum = seriesNum.slice(/\;.+\d+.+/);
			item.seriesNumber = seriesNum.match(/\d+.+/);
		}
	}

	// pull subjects from display to retain formatting
	var subject, j;
	subject = ZU.xpath(doc, '//display/subject');
	if(subject.length > 0) {
		subject = ZU.xpathText(doc, '//display/subject').split("; ");
		j = 0;
		for (var i in subject) {
			item.tags.push(subject[j]);
			j = j+1;
		}
	}	
		

		var notes, j;
		if (notes = ZU.xpath(doc, '//search/description')) {
			for (var i in notes) {
				j = parseInt(i) + 1;
				item.notes.push(ZU.xpathText(doc, '//search/description['+j+']'));
			}
		}
		
		var TOC;
		if (TOC = ZU.xpathText(doc, '//search/toc')) {
			item.extra = TOC;
		}
		
		var callNumber;
		if (callNumber = ZU.xpathText(doc, '//search/lsr05')) { //local pul field
			item.callNumber = callNumber;
		}
		
		// add to pull full-text if present
		var linktosrc;
		if (linktosrc = ZU.xpathText(doc, '//links/linktorsrc')) { //local pul field
		var link = linktosrc.match(/\$\$U(http.+)\$\$./)
			item.url = link[1];
		} else {
			
			var permaLink;
			if (permaLink = ZU.xpathText(doc, '//control/recordid')) { //local pul field
			item.url = 'http://searchit.princeton.edu/primo_library/libweb/action/dlDisplay.do?institution=PRN&vid=PRINCETON&docId='+permaLink; //would be nice not to harcode this
			}
			
		}
		item.complete();
	}

/* The next two functions are logic that could be bundled away into the translator toolkit. */

// Implementation of ISBN and ISSN check-digit verification
// Based on ISBN Users' Manual (http://www.isbn.org/standards/home/isbn/international/html/usm4.htm)
// and the Wikipedia treatment of ISBN (http://en.wikipedia.org/wiki/International_Standard_Book_Number)
// and the Wikipedia treatment of ISSN (http://en.wikipedia.org/wiki/International_Standard_Serial_Number)

// This will also check ISMN validity, although it does not distinguish from their
// neighbors in namespace, ISBN-13. It does not handle pre-2008 M-prefixed ISMNs; see
// http://en.wikipedia.org/wiki/International_Standard_Music_Number

// This does not validate multiple identifiers in one field,
// but it will gracefully ignore all non-number detritus,
// such as extraneous hyphens, spaces, and comments.

// It currently maintains hyphens in non-initial and non-final position,
// discarding consecutive ones beyond the first as well.

// It also adds the customary hyphen to valid ISSNs.

// Takes the first 8 valid digits and tries to read an ISSN,
// takes the first 10 valid digits and tries to read an ISBN 10,
// and takes the first 13 valid digits to try to read an ISBN 13
// Returns an object with three attributes:
// 	"issn" 
// 	"isbn10"
// 	"isbn13"
// Each will be set to a valid identifier if found, and otherwise be a
// boolean false.

// There could conceivably be a valid ISBN-13 with an ISBN-10
// substring; this should probably be interpreted as the latter, but it is a
// client UI issue.
idCheck = function(isbn) {
	
	// For ISBN 10, multiple by these coefficients, take the sum mod 11
	// and subtract from 11
	var isbn10 = [10, 9, 8, 7, 6, 5, 4, 3, 2];

	// For ISBN 13, multiple by these coefficients, take the sum mod 10
	// and subtract from 10
	var isbn13 = [1, 3, 1, 3, 1, 3, 1, 3, 1, 3, 1, 3];

	// For ISSN, multiply by these coefficients, take the sum mod 11
	// and subtract from 11
	var issn = [8, 7, 6, 5, 4, 3, 2];

	// We make a single pass through the provided string, interpreting the
	// first 10 valid characters as an ISBN-10, and the first 13 as an
	// ISBN-13. We then return an array of booleans and valid detected
	// ISBNs.

	var j = 0;
	var sum8 = 0;
	var num8 = "";
	var sum10 = 0;
	var num10 = "";
	var sum13 = 0;
	var num13 = "";
	var chars = [];

	for (var i=0; i < isbn.length; i++) {
		if (isbn.charAt(i) == " ") {
			
			// Since the space character evaluates as a number,
			// it is a special case.
		} else if (j > 0 && isbn.charAt(i) == "-" && isbn.charAt(i-1) != "-") {
			
			// Preserve hyphens, except in initial and final position
			// Also discard consecutive hyphens
			if(j < 7) num8 += "-";
			if(j < 10) num10 += "-";
			if(j < 13) num13 += "-";
		} else if (j < 7 && ((isbn.charAt(i) - 0) == isbn.charAt(i))) {
			sum8 += isbn.charAt(i) * issn[j];
			sum10 += isbn.charAt(i) * isbn10[j];
			sum13 += isbn.charAt(i) * isbn13[j];
			num8 += isbn.charAt(i);
			num10 += isbn.charAt(i);
			num13 += isbn.charAt(i);
			j++;
		} else if (j == 7 &&
			(isbn.charAt(i) == "X" || isbn.charAt(i) == "x" ||
				((isbn.charAt(i) - 0) == isbn.charAt(i)))) {
			
			// In ISSN, an X represents the check digit "10".
			if(isbn.charAt(i) == "X" || isbn.charAt(i) == "x") {
				var check8 = 10;
				num8 += "X";
			} else {
				var check8 = isbn.charAt(i);
				sum10 += isbn.charAt(i) * isbn10[j];
				sum13 += isbn.charAt(i) * isbn13[j];
				num8 += isbn.charAt(i);
				num10 += isbn.charAt(i);
				num13 += isbn.charAt(i);
				j++;
			}
		} else if (j < 9 && ((isbn.charAt(i) - 0) == isbn.charAt(i))) {
			sum10 += isbn.charAt(i) * isbn10[j];
			sum13 += isbn.charAt(i) * isbn13[j];
			num10 += isbn.charAt(i);
			num13 += isbn.charAt(i);
			j++;
		} else if (j == 9 &&
			(isbn.charAt(i) == "X" || isbn.charAt(i) == "x" ||
				((isbn.charAt(i) - 0) == isbn.charAt(i)))) {
			
			// In ISBN-10, an X represents the check digit "10".
			if(isbn.charAt(i) == "X" || isbn.charAt(i) == "x") {
				var check10 = 10;
				num10 += "X";
			} else {
				var check10 = isbn.charAt(i);
				sum13 += isbn.charAt(i) * isbn13[j];
				num10 += isbn.charAt(i);
				num13 += isbn.charAt(i);
				j++;
			}
		} else if(j < 12 && ((isbn.charAt(i) - 0) == isbn.charAt(i))) {
			sum13 += isbn.charAt(i) * isbn13[j];
			num13 += isbn.charAt(i);
			j++;
		} else if (j == 12 && ((isbn.charAt(i) - 0) == isbn.charAt(i))) {
			var check13 = isbn.charAt(i);
			num13 += isbn.charAt(i);
		}
	}
	var valid8  = ((11 - sum8 % 11) % 11) == check8;
	var valid10 = ((11 - sum10 % 11) % 11) == check10;
	var valid13 = (10 - sum13 % 10 == check13);
	var matches = false;
	
	// Since ISSNs have a standard hyphen placement, we can add a hyphen
	if (valid8 && (matches = num8.match(/([0-9]{4})([0-9]{3}[0-9Xx])/))) {
		num8 = matches[1] + '-' + matches[2];
	} 

	if(!valid8) {num8 = false};
	if(!valid10) {num10 = false};
	if(!valid13) {num13 = false};
	return {"isbn10" : num10, "isbn13" : num13, "issn" : num8};
}

// This function should be replaced by a lookup from the multilingual machinery in multilingual builds of Zotero
// Gives name for three-letter code
function iso6392(code) {
MAP_ISO6391_ISO6392 = {'aar' : 'Afar',
'abk' : 'Abkhazian',
'ace' : 'Achinese',
'ach' : 'Acoli',
'ada' : 'Adangme',
'ady' : 'Adyghe; Adygei',
'afa' : 'Afro-Asiatic languages',
'afh' : 'Afrihili',
'afr' : 'Afrikaans',
'ain' : 'Ainu',
'aka' : 'Akan',
'akk' : 'Akkadian',
'alb' : 'Albanian',
'ale' : 'Aleut',
'alg' : 'Algonquian languages',
'alt' : 'Southern Altai',
'amh' : 'Amharic',
'ang' : 'English, Old (ca.450-1100)',
'anp' : 'Angika',
'apa' : 'Apache languages',
'ara' : 'Arabic',
'arc' : 'Official Aramaic (700-300 BCE); Imperial Aramaic (700-300 BCE)',
'arg' : 'Aragonese',
'arm' : 'Armenian',
'arn' : 'Mapudungun; Mapuche',
'arp' : 'Arapaho',
'art' : 'Artificial languages',
'arw' : 'Arawak',
'asm' : 'Assamese',
'ast' : 'Asturian; Bable; Leonese; Asturleonese',
'ath' : 'Athapascan languages',
'aus' : 'Australian languages',
'ava' : 'Avaric',
'ave' : 'Avestan',
'awa' : 'Awadhi',
'aym' : 'Aymara',
'aze' : 'Azerbaijani',
'bad' : 'Banda languages',
'bai' : 'Bamileke languages',
'bak' : 'Bashkir',
'bal' : 'Baluchi',
'bam' : 'Bambara',
'ban' : 'Balinese',
'baq' : 'Basque',
'bas' : 'Basa',
'bat' : 'Baltic languages',
'bej' : 'Beja; Bedawiyet',
'bel' : 'Belarusian',
'bem' : 'Bemba',
'ben' : 'Bengali',
'ber' : 'Berber languages',
'bho' : 'Bhojpuri',
'bih' : 'Bihari languages',
'bik' : 'Bikol',
'bin' : 'Bini; Edo',
'bis' : 'Bislama',
'bla' : 'Siksika',
'bnt' : 'Bantu languages',
'tib' : 'Tibetan',
'bos' : 'Bosnian',
'bra' : 'Braj',
'bre' : 'Breton',
'btk' : 'Batak languages',
'bua' : 'Buriat',
'bug' : 'Buginese',
'bul' : 'Bulgarian',
'bur' : 'Burmese',
'byn' : 'Blin; Bilin',
'cad' : 'Caddo',
'cai' : 'Central American Indian languages',
'car' : 'Galibi Carib',
'cat' : 'Catalan; Valencian',
'cau' : 'Caucasian languages',
'ceb' : 'Cebuano',
'cel' : 'Celtic languages',
'cze' : 'Czech',
'cha' : 'Chamorro',
'chb' : 'Chibcha',
'che' : 'Chechen',
'chg' : 'Chagatai',
'chi' : 'Chinese',
'chk' : 'Chuukese',
'chm' : 'Mari',
'chn' : 'Chinook jargon',
'cho' : 'Choctaw',
'chp' : 'Chipewyan; Dene Suline',
'chr' : 'Cherokee',
'chu' : 'Church Slavic; Old Slavonic; Church Slavonic; Old Bulgarian; Old Church Slavonic',
'chv' : 'Chuvash',
'chy' : 'Cheyenne',
'cmc' : 'Chamic languages',
'cop' : 'Coptic',
'cor' : 'Cornish',
'cos' : 'Corsican',
'cpe' : 'Creoles and pidgins, English based',
'cpf' : 'Creoles and pidgins, French-based',
'cpp' : 'Creoles and pidgins, Portuguese-based',
'cre' : 'Cree',
'crh' : 'Crimean Tatar; Crimean Turkish',
'crp' : 'Creoles and pidgins',
'csb' : 'Kashubian',
'cus' : 'Cushitic languages',
'wel' : 'Welsh',
'cze' : 'Czech',
'dak' : 'Dakota',
'dan' : 'Danish',
'dar' : 'Dargwa',
'day' : 'Land Dayak languages',
'del' : 'Delaware',
'den' : 'Slave (Athapascan)',
'ger' : 'German',
'dgr' : 'Dogrib',
'din' : 'Dinka',
'div' : 'Divehi; Dhivehi; Maldivian',
'doi' : 'Dogri',
'dra' : 'Dravidian languages',
'dsb' : 'Lower Sorbian',
'dua' : 'Duala',
'dum' : 'Dutch, Middle (ca.1050-1350)',
'dut' : 'Dutch; Flemish',
'dyu' : 'Dyula',
'dzo' : 'Dzongkha',
'efi' : 'Efik',
'egy' : 'Egyptian (Ancient)',
'eka' : 'Ekajuk',
'gre' : 'Greek, Modern (1453-)',
'elx' : 'Elamite',
'eng' : 'English',
'enm' : 'English, Middle (1100-1500)',
'epo' : 'Esperanto',
'est' : 'Estonian',
'baq' : 'Basque',
'ewe' : 'Ewe',
'ewo' : 'Ewondo',
'fan' : 'Fang',
'fao' : 'Faroese',
'per' : 'Persian',
'fat' : 'Fanti',
'fij' : 'Fijian',
'fil' : 'Filipino; Pilipino',
'fin' : 'Finnish',
'fiu' : 'Finno-Ugrian languages',
'fon' : 'Fon',
'fre' : 'French',
'fre' : 'French',
'frm' : 'French, Middle (ca.1400-1600)',
'fro' : 'French, Old (842-ca.1400)',
'frr' : 'Northern Frisian',
'frs' : 'Eastern Frisian',
'fry' : 'Western Frisian',
'ful' : 'Fulah',
'fur' : 'Friulian',
'gaa' : 'Ga',
'gay' : 'Gayo',
'gba' : 'Gbaya',
'gem' : 'Germanic languages',
'geo' : 'Georgian',
'ger' : 'German',
'gez' : 'Geez',
'gil' : 'Gilbertese',
'gla' : 'Gaelic; Scottish Gaelic',
'gle' : 'Irish',
'glg' : 'Galician',
'glv' : 'Manx',
'gmh' : 'German, Middle High (ca.1050-1500)',
'goh' : 'German, Old High (ca.750-1050)',
'gon' : 'Gondi',
'gor' : 'Gorontalo',
'got' : 'Gothic',
'grb' : 'Grebo',
'grc' : 'Greek, Ancient (to 1453)',
'gre' : 'Greek, Modern (1453-)',
'grn' : 'Guarani',
'gsw' : 'Swiss German; Alemannic; Alsatian',
'guj' : 'Gujarati',
'gwi' : 'Gwich\'in',
'hai' : 'Haida',
'hat' : 'Haitian; Haitian Creole',
'hau' : 'Hausa',
'haw' : 'Hawaiian',
'heb' : 'Hebrew',
'her' : 'Herero',
'hil' : 'Hiligaynon',
'him' : 'Himachali languages; Western Pahari languages',
'hin' : 'Hindi',
'hit' : 'Hittite',
'hmn' : 'Hmong',
'hmo' : 'Hiri Motu',
'hrv' : 'Croatian',
'hsb' : 'Upper Sorbian',
'hun' : 'Hungarian',
'hup' : 'Hupa',
'arm' : 'Armenian',
'iba' : 'Iban',
'ibo' : 'Igbo',
'ice' : 'Icelandic',
'ido' : 'Ido',
'iii' : 'Sichuan Yi; Nuosu',
'ijo' : 'Ijo languages',
'iku' : 'Inuktitut',
'ile' : 'Interlingue; Occidental',
'ilo' : 'Iloko',
'ina' : 'Interlingua (International Auxiliary Language Association)',
'inc' : 'Indic languages',
'ind' : 'Indonesian',
'ine' : 'Indo-European languages',
'inh' : 'Ingush',
'ipk' : 'Inupiaq',
'ira' : 'Iranian languages',
'iro' : 'Iroquoian languages',
'ice' : 'Icelandic',
'ita' : 'Italian',
'jav' : 'Javanese',
'jbo' : 'Lojban',
'jpn' : 'Japanese',
'jpr' : 'Judeo-Persian',
'jrb' : 'Judeo-Arabic',
'kaa' : 'Kara-Kalpak',
'kab' : 'Kabyle',
'kac' : 'Kachin; Jingpho',
'kal' : 'Kalaallisut; Greenlandic',
'kam' : 'Kamba',
'kan' : 'Kannada',
'kar' : 'Karen languages',
'kas' : 'Kashmiri',
'geo' : 'Georgian',
'kau' : 'Kanuri',
'kaw' : 'Kawi',
'kaz' : 'Kazakh',
'kbd' : 'Kabardian',
'kha' : 'Khasi',
'khi' : 'Khoisan languages',
'khm' : 'Central Khmer',
'kho' : 'Khotanese; Sakan',
'kik' : 'Kikuyu; Gikuyu',
'kin' : 'Kinyarwanda',
'kir' : 'Kirghiz; Kyrgyz',
'kmb' : 'Kimbundu',
'kok' : 'Konkani',
'kom' : 'Komi',
'kon' : 'Kongo',
'kor' : 'Korean',
'kos' : 'Kosraean',
'kpe' : 'Kpelle',
'krc' : 'Karachay-Balkar',
'krl' : 'Karelian',
'kro' : 'Kru languages',
'kru' : 'Kurukh',
'kua' : 'Kuanyama; Kwanyama',
'kum' : 'Kumyk',
'kur' : 'Kurdish',
'kut' : 'Kutenai',
'lad' : 'Ladino',
'lah' : 'Lahnda',
'lam' : 'Lamba',
'lao' : 'Lao',
'lat' : 'Latin',
'lav' : 'Latvian',
'lez' : 'Lezghian',
'lim' : 'Limburgan; Limburger; Limburgish',
'lin' : 'Lingala',
'lit' : 'Lithuanian',
'lol' : 'Mongo',
'loz' : 'Lozi',
'ltz' : 'Luxembourgish; Letzeburgesch',
'lua' : 'Luba-Lulua',
'lub' : 'Luba-Katanga',
'lug' : 'Ganda',
'lui' : 'Luiseno',
'lun' : 'Lunda',
'luo' : 'Luo (Kenya and Tanzania)',
'lus' : 'Lushai',
'mac' : 'Macedonian',
'mad' : 'Madurese',
'mag' : 'Magahi',
'mah' : 'Marshallese',
'mai' : 'Maithili',
'mak' : 'Makasar',
'mal' : 'Malayalam',
'man' : 'Mandingo',
'mao' : 'Maori',
'map' : 'Austronesian languages',
'mar' : 'Marathi',
'mas' : 'Masai',
'may' : 'Malay',
'mdf' : 'Moksha',
'mdr' : 'Mandar',
'men' : 'Mende',
'mga' : 'Irish, Middle (900-1200)',
'mic' : 'Mi\'kmaq; Micmac',
'min' : 'Minangkabau',
'mis' : 'Uncoded languages',
'mac' : 'Macedonian',
'mkh' : 'Mon-Khmer languages',
'mlg' : 'Malagasy',
'mlt' : 'Maltese',
'mnc' : 'Manchu',
'mni' : 'Manipuri',
'mno' : 'Manobo languages',
'moh' : 'Mohawk',
'mon' : 'Mongolian',
'mos' : 'Mossi',
'mao' : 'Maori',
'may' : 'Malay',
'mul' : 'Multiple languages',
'mun' : 'Munda languages',
'mus' : 'Creek',
'mwl' : 'Mirandese',
'mwr' : 'Marwari',
'bur' : 'Burmese',
'myn' : 'Mayan languages',
'myv' : 'Erzya',
'nah' : 'Nahuatl languages',
'nai' : 'North American Indian languages',
'nap' : 'Neapolitan',
'nau' : 'Nauru',
'nav' : 'Navajo; Navaho',
'nbl' : 'Ndebele, South; South Ndebele',
'nde' : 'Ndebele, North; North Ndebele',
'ndo' : 'Ndonga',
'nds' : 'Low German; Low Saxon; German, Low; Saxon, Low',
'nep' : 'Nepali',
'new' : 'Nepal Bhasa; Newari',
'nia' : 'Nias',
'nic' : 'Niger-Kordofanian languages',
'niu' : 'Niuean',
'dut' : 'Dutch; Flemish',
'nno' : 'Norwegian Nynorsk; Nynorsk, Norwegian',
'nob' : 'Bokmål, Norwegian; Norwegian Bokmål',
'nog' : 'Nogai',
'non' : 'Norse, Old',
'nor' : 'Norwegian',
'nqo' : 'N\'Ko',
'nso' : 'Pedi; Sepedi; Northern Sotho',
'nub' : 'Nubian languages',
'nwc' : 'Classical Newari; Old Newari; Classical Nepal Bhasa',
'nya' : 'Chichewa; Chewa; Nyanja',
'nym' : 'Nyamwezi',
'nyn' : 'Nyankole',
'nyo' : 'Nyoro',
'nzi' : 'Nzima',
'oci' : 'Occitan (post 1500)',
'oji' : 'Ojibwa',
'ori' : 'Oriya',
'orm' : 'Oromo',
'osa' : 'Osage',
'oss' : 'Ossetian; Ossetic',
'ota' : 'Turkish, Ottoman (1500-1928)',
'oto' : 'Otomian languages',
'paa' : 'Papuan languages',
'pag' : 'Pangasinan',
'pal' : 'Pahlavi',
'pam' : 'Pampanga; Kapampangan',
'pan' : 'Panjabi; Punjabi',
'pap' : 'Papiamento',
'pau' : 'Palauan',
'peo' : 'Persian, Old (ca.600-400 B.C.)',
'per' : 'Persian',
'phi' : 'Philippine languages',
'phn' : 'Phoenician',
'pli' : 'Pali',
'pol' : 'Polish',
'pon' : 'Pohnpeian',
'por' : 'Portuguese',
'pra' : 'Prakrit languages',
'pro' : 'Provençal, Old (to 1500);Occitan, Old (to 1500)',
'pus' : 'Pushto; Pashto',
'qaa' : 'Reserved for local use',
'que' : 'Quechua',
'raj' : 'Rajasthani',
'rap' : 'Rapanui',
'rar' : 'Rarotongan; Cook Islands Maori',
'roa' : 'Romance languages',
'roh' : 'Romansh',
'rom' : 'Romany',
'rum' : 'Romanian; Moldavian; Moldovan',
'rum' : 'Romanian; Moldavian; Moldovan',
'run' : 'Rundi',
'rup' : 'Aromanian; Arumanian; Macedo-Romanian',
'rus' : 'Russian',
'sad' : 'Sandawe',
'sag' : 'Sango',
'sah' : 'Yakut',
'sai' : 'South American Indian languages',
'sal' : 'Salishan languages',
'sam' : 'Samaritan Aramaic',
'san' : 'Sanskrit',
'sas' : 'Sasak',
'sat' : 'Santali',
'scn' : 'Sicilian',
'sco' : 'Scots',
'sel' : 'Selkup',
'sem' : 'Semitic languages',
'sga' : 'Irish, Old (to 900)',
'sgn' : 'Sign Languages',
'shn' : 'Shan',
'sid' : 'Sidamo',
'sin' : 'Sinhala; Sinhalese',
'sio' : 'Siouan languages',
'sit' : 'Sino-Tibetan languages',
'sla' : 'Slavic languages',
'slo' : 'Slovak',
'slo' : 'Slovak',
'slv' : 'Slovenian',
'sma' : 'Southern Sami',
'sme' : 'Northern Sami',
'smi' : 'Sami languages',
'smj' : 'Lule Sami',
'smn' : 'Inari Sami',
'smo' : 'Samoan',
'sms' : 'Skolt Sami',
'sna' : 'Shona',
'snd' : 'Sindhi',
'snk' : 'Soninke',
'sog' : 'Sogdian',
'som' : 'Somali',
'son' : 'Songhai languages',
'sot' : 'Sotho, Southern',
'spa' : 'Spanish; Castilian',
'alb' : 'Albanian',
'srd' : 'Sardinian',
'srn' : 'Sranan Tongo',
'srp' : 'Serbian',
'srr' : 'Serer',
'ssa' : 'Nilo-Saharan languages',
'ssw' : 'Swati',
'suk' : 'Sukuma',
'sun' : 'Sundanese',
'sus' : 'Susu',
'sux' : 'Sumerian',
'swa' : 'Swahili',
'swe' : 'Swedish',
'syc' : 'Classical Syriac',
'syr' : 'Syriac',
'tah' : 'Tahitian',
'tai' : 'Tai languages',
'tam' : 'Tamil',
'tat' : 'Tatar',
'tel' : 'Telugu',
'tem' : 'Timne',
'ter' : 'Tereno',
'tet' : 'Tetum',
'tgk' : 'Tajik',
'tgl' : 'Tagalog',
'tha' : 'Thai',
'tib' : 'Tibetan',
'tig' : 'Tigre',
'tir' : 'Tigrinya',
'tiv' : 'Tiv',
'tkl' : 'Tokelau',
'tlh' : 'Klingon; tlhIngan-Hol',
'tli' : 'Tlingit',
'tmh' : 'Tamashek',
'tog' : 'Tonga (Nyasa)',
'ton' : 'Tonga (Tonga Islands)',
'tpi' : 'Tok Pisin',
'tsi' : 'Tsimshian',
'tsn' : 'Tswana',
'tso' : 'Tsonga',
'tuk' : 'Turkmen',
'tum' : 'Tumbuka',
'tup' : 'Tupi languages',
'tur' : 'Turkish',
'tut' : 'Altaic languages',
'tvl' : 'Tuvalu',
'twi' : 'Twi',
'tyv' : 'Tuvinian',
'udm' : 'Udmurt',
'uga' : 'Ugaritic',
'uig' : 'Uighur; Uyghur',
'ukr' : 'Ukrainian',
'umb' : 'Umbundu',
'und' : 'Undetermined',
'urd' : 'Urdu',
'uzb' : 'Uzbek',
'vai' : 'Vai',
'ven' : 'Venda',
'vie' : 'Vietnamese',
'vol' : 'Volapük',
'vot' : 'Votic',
'wak' : 'Wakashan languages',
'wal' : 'Wolaitta; Wolaytta',
'war' : 'Waray',
'was' : 'Washo',
'wel' : 'Welsh',
'wen' : 'Sorbian languages',
'wln' : 'Walloon',
'wol' : 'Wolof',
'xal' : 'Kalmyk; Oirat',
'xho' : 'Xhosa',
'yao' : 'Yao',
'yap' : 'Yapese',
'yid' : 'Yiddish',
'yor' : 'Yoruba',
'ypk' : 'Yupik languages',
'zap' : 'Zapotec',
'zbl' : 'Blissymbols; Blissymbolics; Bliss',
'zen' : 'Zenaga',
'zha' : 'Zhuang; Chuang',
'chi' : 'Chinese',
'znd' : 'Zande languages',
'zul' : 'Zulu',
'zun' : 'Zuni',
'zxx' : 'No linguistic content; Not applicable',
'zza' : 'Zaza; Dimili; Dimli; Kirdki; Kirmanjki; Zazaki'};
	var lang;
	return ((lang = MAP_ISO6391_ISO6392[code]) !== null) ? lang : false;
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://searchit.princeton.edu/primo_library/libweb/action/display.do?tabs=detailsTab&ct=display&fn=search&doc=PRN_VOYAGER3232007&indx=1&recIds=PRN_VOYAGER3232007&recIdxs=0&elementId=0&renderMode=poppedOut&displayMode=full&frbrVersion=&dscnt=0&vl(124740333UI0)=any&scp.scps=scope%3A(OTHERS)%2Cscope%3A(FIRE)&frbg=&tab=location&dstmp=1331756863647&srt=title&mode=Basic&dum=true&tb=t&fromLogin=true&vl(1UIStartWith0)=contains&vl(freeText0)=Historiography%20--%20Byzantine%20Empire%20--%20Congresses&vid=PRINCETON",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"firstName": "Klaus",
						"lastName": "Belke",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"Byzantine Empire -- Historiography -- Congresses",
					"Byzantine Empire -- Civilization -- Congresses"
				],
				"seeAlso": [],
				"attachments": [],
				"title": "Byzanz als Raum : zu Methoden und Inhalten der historischen Geographie des östlichen Mittelmeerraumes",
				"place": "Wien",
				"publisher": "Verlag der Österreichischen Akademie der Wissenschaften",
				"date": "2000",
				"language": "German",
				"numPages": "316",
				"pages": "316",
				"ISBN": "370012872X",
				"series": "Denkschriften (Österreichische Akademie der Wissenschaften. Philosophisch-Historische Klasse)",
				"seriesNumber": "283",
				"callNumber": "0912.934.6q Bd.283",
				"url": "http://searchit.princeton.edu/primo_library/libweb/action/dlDisplay.do?institution=PRN&vid=PRINCETON&docId=PRN_VOYAGER3232007",
				"libraryCatalog": "Princeton Catalog+",
				"accessDate": "CURRENT_TIMESTAMP",
				"shortTitle": "Byzanz als Raum"
			}
		]
	},
	{
		"type": "web",
		"url": "http://searchit.princeton.edu/primo_library/libweb/action/display.do?tabs=detailsTab&ct=display&fn=search&doc=PRN_VOYAGER3255547&indx=2&recIds=PRN_VOYAGER3255547&recIdxs=1&elementId=1&renderMode=poppedOut&displayMode=full&frbrVersion=&dscnt=0&vl(124740333UI0)=any&scp.scps=scope%3A(OTHERS)%2Cscope%3A(FIRE)&frbg=&tab=location&dstmp=1331756863647&srt=title&mode=Basic&dum=true&tb=t&fromLogin=true&vl(1UIStartWith0)=contains&vl(freeText0)=Historiography%20--%20Byzantine%20Empire%20--%20Congresses&vid=PRINCETON",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"firstName": "Italy)",
						"lastName": "Giornata di studi bizantini (5th : 1998 : Naples",
						"creatorType": "author"
					},
					{
						"firstName": "Criscuolo, Ugo, Maisano, Riccardo, Associazione italiana di studi",
						"lastName": "bizantini",
						"creatorType": "contributor"
					}
				],
				"notes": [],
				"tags": [
					"Historiography -- Byzantine Empire -- Congresses",
					"Byzantine Empire -- Historiography -- Congresses"
				],
				"seeAlso": [],
				"attachments": [],
				"title": "Categorie linguistiche e concettuali della storiografia bizantina : atti della quinta Giornata di studi bizantini, Napoli, 23-24 aprile 1998",
				"place": "Napoli",
				"publisher": "M. D'Auria",
				"date": "2000",
				"language": "Italian",
				"numPages": "274",
				"pages": "274",
				"ISBN": "887092176X",
				"callNumber": "DF505 .G56 1998",
				"url": "http://searchit.princeton.edu/primo_library/libweb/action/dlDisplay.do?institution=PRN&vid=PRINCETON&docId=PRN_VOYAGER3255547",
				"libraryCatalog": "Princeton Catalog+",
				"accessDate": "CURRENT_TIMESTAMP",
				"shortTitle": "Categorie linguistiche e concettuali della storiografia bizantina"
			}
		]
	},
	{
		"type": "web",
		"url": "http://searchit.princeton.edu/primo_library/libweb/action/display.do?tabs=detailsTab&ct=display&fn=search&doc=PRN_VOYAGER3432980&indx=3&recIds=PRN_VOYAGER3432980&recIdxs=2&elementId=2&renderMode=poppedOut&displayMode=full&frbrVersion=&dscnt=0&vl(124740333UI0)=any&scp.scps=scope%3A(OTHERS)%2Cscope%3A(FIRE)&frbg=&tab=location&dstmp=1331756863647&srt=title&mode=Basic&dum=true&tb=t&fromLogin=true&vl(1UIStartWith0)=contains&vl(freeText0)=Historiography%20--%20Byzantine%20Empire%20--%20Congresses&vid=PRINCETON",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"firstName": "Coventry)",
						"lastName": "Spring Symposium of Byzantine Studies (33rd : 1999 : University of Warwick",
						"creatorType": "author"
					},
					{
						"firstName": "Eastmond, Antony, , Society for the Promotion of Byzantine Studies (Great",
						"lastName": "Britain)",
						"creatorType": "contributor"
					}
				],
				"notes": [],
				"tags": [
					"Byzantine Empire -- History -- Congresses",
					"Byzantine Empire -- Historiography -- Congresses"
				],
				"seeAlso": [],
				"attachments": [],
				"title": "Eastern approaches to Byzantium : papers from the Thirty-third Spring Symposium of Byzantine Studies, University of Warwick, Coventry, March 1999",
				"place": "Aldershot ; Burlington, VT",
				"publisher": "Ashgate",
				"date": "2001",
				"language": "English",
				"numPages": "297",
				"pages": "297",
				"ISBN": "0754603229",
				"series": "Publications (Society for the Promotion of Byzantine studies (Great Britain))",
				"seriesNumber": "9",
				"callNumber": "DF552 .S674 1999",
				"url": "http://searchit.princeton.edu/primo_library/libweb/action/dlDisplay.do?institution=PRN&vid=PRINCETON&docId=PRN_VOYAGER3432980",
				"libraryCatalog": "Princeton Catalog+",
				"accessDate": "CURRENT_TIMESTAMP",
				"shortTitle": "Eastern approaches to Byzantium"
			}
		]
	},
	{
		"type": "web",
		"url": "http://searchit.princeton.edu/primo_library/libweb/action/display.do?tabs=detailsTab&ct=display&fn=search&doc=PRN_VOYAGER6416191&indx=5&recIds=PRN_VOYAGER6416191&recIdxs=4&elementId=4&renderMode=poppedOut&displayMode=full&frbrVersion=&dscnt=0&vl(124740333UI0)=any&scp.scps=scope%3A(OTHERS)%2Cscope%3A(FIRE)&frbg=&tab=location&dstmp=1331756863647&srt=title&mode=Basic&dum=true&tb=t&fromLogin=true&vl(1UIStartWith0)=contains&vl(freeText0)=Historiography%20--%20Byzantine%20Empire%20--%20Congresses&vid=PRINCETON",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"lastName": "Spring Symposium of Byzantine Studies (40th : 2007 : University of Birmingham)",
						"creatorType": "author"
					},
					{
						"firstName": "Macrides, R.",
						"lastName": "J",
						"creatorType": "contributor"
					}
				],
				"notes": [],
				"tags": [
					"Historiography -- Byzantine Empire -- Congresses",
					"Byzantine literature -- History and criticism -- Congresses",
					"Byzantine Empire -- Historiography -- Congresses",
					"Byzantine Empire -- History -- Sources -- Congresses"
				],
				"seeAlso": [],
				"attachments": [],
				"title": "History as literature in Byzantium : papers from the Fortieth Spring Symposium of Byzantine Studies, University of Birmingham, March 2007",
				"place": "Farnham, Surrey, England ; Burlington, VT",
				"publisher": "Ashgate",
				"date": "2010",
				"language": "English",
				"numPages": "324",
				"pages": "324",
				"ISBN": "9781409412069",
				"series": "Publications (Society for the Promotion of Byzantine Studies (Great Britain))",
				"seriesNumber": "15",
				"extra": "Aesthetics -- The aesthetics of history : from Theophanes to Eustathios / Stratis Papaioannou -- Audience -- Uncovering Byzantium's historiographical audience / Brian Croke -- Anna Komnene and Niketas Choniates \"translated\" : the fourteenth-century Byzantine metaphrases / John Davis -- Narrator -- Psellos and \"his emperors\" : fact, fiction, and genre / Michael Jeffreys -- \"Listen, all of you, both Franks and Romans\" : the narrator in the Chronicle of Morea / Teresa Shawcross -- Story-telling -- From propaganda to history to literature : the Byzantine stories of Theodosius' apple and Marcian's eagles / Roger Scott -- Dream narratives in historical writing : making sense of history in Theophanes' Chronographia / George T. Calofonos -- The Venice Alexander romance : pictorial narrative and the art of telling stories / Nicolette S.Trahoulia -- The classical tradition reinterpreted -- A historian and his tragic hero : a literary reading of Theophylact Simocatta's ecumenical history / Stephanos Efthymiades -- Envy and Nemesis in the Vita Basilii and Leo the Deacon : literary mimesis or something more? / Martin Hinterberger -- Sources reconfigured -- The story of the patriarch Constantine II of Constantinople in Theophanes and George the Monk : transformations of a narrative / Dmitry Afinogenov -- Engaging the Byzantine past : strategies of visualizing history in Sicily and Bulgaria / Elena N. Boeck -- The Synopsis chronike and hagiography : the presentation of Constantine the Great / Konstantinos Zafeiris -- Structure and themes -- Procopius' Persian War : a thematic and literary analysis / Anthony Kaldellis -- La chronique de Malalas entre littérature et philosophie / Paolo Odorico -- Rhetoric and history : the case of Niketas Choniates / Athanasios Angelou.",
				"callNumber": "DF505 .S67 2007",
				"url": "http://searchit.princeton.edu/primo_library/libweb/action/dlDisplay.do?institution=PRN&vid=PRINCETON&docId=PRN_VOYAGER6416191",
				"libraryCatalog": "Princeton Catalog+",
				"accessDate": "CURRENT_TIMESTAMP",
				"shortTitle": "History as literature in Byzantium"
			}
		]
	}
]
/** END TEST CASES **/
