{
	"translatorID":"3f50aaac-7acc-4350-acd0-59cb77faf620",
	"translatorType":2,
	"label":"Wikipedia Citation Templates",
	"creator":"Simon Kornblith, Fondazione BEIC",
	"target":"txt",
	"minVersion":"1.0.0b4.r1",
	"maxVersion":"",
	"priority":100,
	"displayOptions":{"exportCharset":"UTF-8"},
	"browserSupport":"gcs",
	"inRepository":true,
	"lastUpdated":"2014-12-31 20:00:26"
}

var fieldMap = {
	edition:"edition",
	publisher:"publisher",
	doi:"DOI",
	isbn:"ISBN",
	issn:"ISSN",
	conference:"conferenceName",
	volume:"volume",
	issue:"issue",
	pages:"pages",
	number:"episodeNumber",
	language:"language",
};

// Currently only targeting the English Wikipedia subdomain
// https://en.wikipedia.org/wiki/Category:Citation_templates
var typeMap = {
	book:"Cite book",
	bookSection:"Cite book",
	journalArticle:"Cite journal",
	magazineArticle:"Cite news",
	newspaperArticle:"Cite news",
	thesis:"Cite paper",
	letter:"Cite",
	manuscript:"Cite book",
	interview:"Cite interview",
	film:"Cite video",
	artwork:"Cite",
	webpage:"Cite web",
	report:"Cite conference",
	bill:"Cite",
	hearing:"Cite",
	patent:"Cite",
	statute:"Cite",
	email:"Cite email",
	map:"Cite",
	blogPost:"Cite web",
	instantMessage:"Cite",
	forumPost:"Cite web",
	audioRecording:"Cite",
	presentation:"Cite paper",
	videoRecording:"Cite video",
	tvBroadcast:"Cite episode",
	radioBroadcast:"Cite episode",
	podcast:"Cite podcast",
	computerProgram:"Cite",
	conferencePaper:"Cite conference",
	document:"Cite",
	encyclopediaArticle:"Cite encyclopedia",
	dictionaryEntry:"Cite encyclopedia"
};

// Most Wikipedias use the "First Last" name format in titles and citations.
// This isn't universal, see e.g. Russian and Chinese.
function formatAuthors(authors, useTypes) {
	var text = "";
	for each(var author in authors) {
		text += ", "+author.firstName;
		if(author.firstName && author.lastName) text += " ";
		text += author.lastName;
		if(useTypes) text += " ("+Zotero.Utilities.getLocalizedCreatorType(author.creatorType)+")";
	}
	return text.substr(2);
}

function formatFirstAuthor(authors, useTypes) {
	var firstCreator = authors.shift();
	var field = firstCreator.lastName;
	if(firstCreator.lastName && firstCreator.firstName) field += ", ";
	field += firstCreator.firstName
	if(useTypes) field += " ("+Zotero.Utilities.getLocalizedCreatorType(firstCreator.creatorType)+")";
	return field;
}

function formatDate(date) {
	var date = date.substr(0, date.indexOf(" "));
	if(date.substr(4, 3) == "-00") {
		date = date.substr(0, 4);
	} else if(date.substr(7, 3) == "-00") {
		date = date.substr(0, 7);
	}
	return date;
}

// Convert MARC21/ISO 639-2 codes to ISO 639-1 code where available
function MARC21toISO6391(code) {
	// List from http://www.loc.gov/standards/iso639-2/php/code_list.php
	// We have to keep a local copy/function, per Unicode CLDR advice:
	// http://unicode.org/cldr/trac/ticket/8106#comment:3
	// Some ISO 639-1 codes are not used by MediaWiki yet, commented out
	var map = {
		aar: "aa",
		abk: "ab",
		afr: "af",
		aka: "ak",
		alb: "sq",
		amh: "am",
		ara: "ar",
		arg: "an",
		arm: "hy",
		asm: "as",
		ava: "av",
		//ave: "ae",
		aym: "ay",
		aze: "az",
		bak: "ba",
		bam: "bm",
		baq: "eu",
		bel: "be",
		ben: "bn",
		bih: "bh",
		bis: "bi",
		bod: "bo",
		bos: "bs",
		bre: "br",
		bul: "bg",
		bur: "my",
		cat: "ca",
		ces: "cs",
		cha: "ch",
		che: "ce",
		chi: "zh",
		chu: "cu",
		chv: "cv",
		cor: "kw",
		cos: "co",
		cre: "cr",
		cym: "cy",
		cze: "cs",
		dan: "da",
		deu: "de",
		div: "dv",
		dut: "nl",
		dzo: "dz",
		ell: "el",
		eng: "en",
		epo: "eo",
		est: "et",
		eus: "eu",
		ewe: "ee",
		fao: "fo",
		fas: "fa",
		fij: "fj",
		fin: "fi",
		fra: "fr",
		fre: "fr",
		fry: "fy",
		ful: "ff",
		geo: "ka",
		ger: "de",
		gla: "gd",
		gle: "ga",
		glg: "gl",
		glv: "gv",
		gre: "el",
		grn: "gn",
		guj: "gu",
		hat: "ht",
		hau: "ha",
		heb: "he",
		her: "hz",
		hin: "hi",
		hmo: "ho",
		hrv: "hr",
		hun: "hu",
		hye: "hy",
		ibo: "ig",
		ice: "is",
		ido: "io",
		iii: "ii",
		iku: "iu",
		ile: "ie",
		ina: "ia",
		ind: "id",
		ipk: "ik",
		isl: "is",
		ita: "it",
		jav: "jv",
		jpn: "ja",
		kal: "kl",
		kan: "kn",
		kas: "ks",
		kat: "ka",
		kau: "kr",
		kaz: "kk",
		khm: "km",
		kik: "ki",
		kin: "rw",
		kir: "ky",
		kom: "kv",
		kon: "kg",
		kor: "ko",
		kua: "kj",
		kur: "ku",
		lao: "lo",
		lat: "la",
		lav: "lv",
		lim: "li",
		lin: "ln",
		lit: "lt",
		ltz: "lb",
		//lub: "lu",
		lug: "lg",
		mac: "mk",
		mah: "mh",
		mal: "ml",
		mao: "mi",
		mar: "mr",
		may: "ms",
		mkd: "mk",
		mlg: "mg",
		mlt: "mt",
		mon: "mn",
		mri: "mi",
		msa: "ms",
		mya: "my",
		nau: "na",
		nav: "nv",
		//nbl: "nr",
		//nde: "nd",
		ndo: "ng",
		nep: "ne",
		nld: "nl",
		nno: "nn",
		nob: "nb",
		nor: "no",
		nya: "ny",
		oci: "oc",
		//oji: "oj",
		ori: "or",
		orm: "om",
		oss: "os",
		pan: "pa",
		per: "fa",
		pli: "pi",
		pol: "pl",
		por: "pt",
		pus: "ps",
		que: "qu",
		roh: "rm",
		ron: "ro",
		rum: "ro",
		run: "rn",
		rus: "ru",
		sag: "sg",
		san: "sa",
		sin: "si",
		slk: "sk",
		slo: "sk",
		slv: "sl",
		sme: "se",
		smo: "sm",
		sna: "sn",
		snd: "sd",
		som: "so",
		sot: "st",
		spa: "es",
		sqi: "sq",
		srd: "sc",
		srp: "sr",
		ssw: "ss",
		sun: "su",
		swa: "sw",
		swe: "sv",
		tah: "ty",
		tam: "ta",
		tat: "tt",
		tel: "te",
		tgk: "tg",
		tgl: "tl",
		tha: "th",
		tib: "bo",
		tir: "ti",
		ton: "to",
		tsn: "tn",
		tso: "ts",
		tuk: "tk",
		tur: "tr",
		twi: "tw",
		uig: "ug",
		ukr: "uk",
		urd: "ur",
		uzb: "uz",
		ven: "ve",
		vie: "vi",
		vol: "vo",
		wel: "cy",
		wln: "wa",
		wol: "wo",
		xho: "xh",
		yid: "yi",
		yor: "yo",
		zha: "za",
		zho: "zh",
		zul: "zu",
	};

	if ( map[code] ) {
		return map[code];
	} else {
		return code;
	}
}

function doExport() {
	var first = true;
	while(item = Zotero.nextItem()) {
		// determine type
		var type = typeMap[item.itemType];
		if(!type) type = "Cite";
		
		var properties = new Object();
		
		for(var wikiField in fieldMap) {
			var zoteroField = fieldMap[wikiField];
			if(item[zoteroField]) properties[wikiField] = item[zoteroField];
		}
		
		if(item.creators && item.creators.length) {
			if(type == "Cite episode") {
				// now add additional creators
				properties.credits = formatAuthors(item.creators, true);
			} else if(type == "Cite video") {
				properties.people = "";
				
				// make first creator first, last
				properties.people = formatFirstAuthor(item.creators, true);
				// now add additional creators
				if(item.creators.length) properties.people += ", "+formatAuthors(item.creators, true);
				
				// use type
				if(item.type) {
					properties.medium = item.type;
				}
			} else if(type == "Cite email") {
				// get rid of non-authors
				for(var i=0; i<item.creators.length; i++) {
					if(item.creators[i].creatorType != "author") {
						// drop contributors
						item.creators.splice(i--, 1);
					}
				}
				
				// make first authors first, last
				properties.author = formatFirstAuthor(item.creators);
				// add supplemental authors
				if(item.creators.length) {
					properties.author += ", "+formatAuthors(item.creators);
				}
			} else if(type == "Cite interview") {
				// check for an interviewer or translator
				var interviewers = [];
				var translators = [];
				for(var i=0; i<item.creators.length; i++) {
					if(item.creators[i].creatorType == "translator") {
						translators.push(item.creators.splice(i--,1)[0]);
					} else if(item.creators[i].creatorType == "interviewer") {
						interviewers.push(item.creators.splice(i--,1)[0]);
					} else if(item.creators[i].creatorType == "contributor") {
						// drop contributors
						item.creators.splice(i--,1);
					}
				}
				
				// interviewers
				if(interviewers.length) {
					properties.interviewer = formatAuthors([interviewers.shift()]);
					if(interviewers.length) properties.cointerviewers = formatAuthors(interviewers);
				}
				// translators
				if(translators.length) {
					properties.cointerviewers = (properties.cointerviewers ? properties.cointerviewers+", " : "");
					properties.cointerviewers += formatAuthors(translators);
				}
				// interviewees
				if(item.creators.length) {
					// take up to 4 interviewees
					var i = 1;
					while((interviewee = item.creators.shift()) && i <= 4) {
						var lastKey = "last";
						var firstKey = "first";
						if(i != 1) {
							lastKey += i;
							firstKey += i;
						}
						
						properties[lastKey] = interviewee.lastName;
						properties[firstKey] = interviewee.firstName;
					}
				}
				// medium
				if(item.medium) {
					properties.type = item.medium
				}
			} else {
				// check for an editor or translator
				var editors = [];
				var translators = [];
				for(var i=0; i < item.creators.length; i++) {
					var creator = item.creators[i];
					if(creator.creatorType == "translator") {
						translators.push(item.creators.splice(i--,1)[0]);
					} else if(creator.creatorType == "editor") {
						editors.push(item.creators.splice(i--,1)[0]);
					} else if(creator.creatorType == "contributor") {
						// drop contributors
						item.creators.splice(i--, 1);
					}
				}
				
				// editors
				var others = "";
				if(editors.length) {
					var editorText = formatAuthors(editors)+(editors.length == 1 ? " (ed.)" : " (eds.)");
					if(item.itemType == "bookSection" || type == "Cite conference" || type == "Cite encyclopedia") {
						// as per docs, use editor only for chapters
						properties.editors = editorText;
					} else {
						others = editorText;
					}
				}
				// translators
				if(translators.length) {
					if(others) others += ", ";
					others += formatAuthors(translators)+" (trans.)";
				}
				
				// pop off first author, if there is one
				if(item.creators.length) {
					var firstAuthor = item.creators.shift();
					properties.last = firstAuthor.lastName;
					properties.first = firstAuthor.firstName;
					
					// add supplemental authors
					if(item.creators.length) {
						properties.coauthors = formatAuthors(item.creators);
					}
				}
				
				// attach others
				if(others) {
					if(type == "Cite book") {
						properties.others = others;
					} else {
						properties.coauthors = (properties.coauthors ? properties.coauthors+", " : "");
						properties.coauthors += others;
					}
				}
			}
		}
		
		if(item.itemType == "bookSection") {
			properties.title = item.publicationTitle;
			properties.chapter = item.title;;
		} else {
			properties.title = item.title;
			
			if(type == "Cite journal") {
				properties.journal = item.publicationTitle;
			} else if(type == "Cite conference") {
				properties.booktitle = item.publicationTitle;
			} else if(type == "Cite encyclopedia") {
				properties.encyclopedia = item.publicationTitle;
			} else {
				properties.work = item.publicationTitle;
			}
		}
		
		if(type == "Cite web" && item.type) {
			properties.format = item.type;
		}
		
		if(item.place) {
			if(type == "Cite episode") {
				properties.city = item.place;
			} else {
				properties.location = item.place;
			}
		}
		
		if(item.series) {
			properties.series = item.series;
		} else if(item.seriesTitle) {
			properties.series = item.seriesTitle;
		} else if(item.seriesText) {
			properties.series = item.seriesText;
		}
		
		if(item.accessDate) {
			properties.accessdate = formatDate(item.accessDate);
		}
		
		if(item.date) {
			if(type == "Cite email") {
				properties.senddate = formatDate(item.date);
			} else {
				var date = Zotero.Utilities.strToDate(item.date);
				var mm = "00";
				var dd = "00";
				if (date["month"] != undefined){
					mm = date["month"];
					mm = mm + 1;
					if (mm < 10){
						mm = "0" + mm;
					} 
				}
				if (date["day"] != undefined){
					dd = date["day"];
					if (dd < 10){
						dd = "0" + dd;
					} 
				}
				if (date["year"] != undefined){
					var yyyy = date["year"].toString();
					while (yyyy.length < 4){
						yyyy = "0"+yyyy;
					}
					properties.date = formatDate(yyyy+"-"+mm+"-"+dd+" ");
				}
			}
		}

		if(item.runningTime) {
			if(type == "Cite episode") {
				properties.minutes = item.runningTime;
			} else {
				properties.time = item.runningTime;
			}
		}
		
		if(item.url && item.accessDate) {
			if(item.itemType == "bookSection") {
				properties.chapterurl = item.url;
			} else {
				properties.url = item.url;
			}
		}
		
		if(item.language) {
			// MediaWiki uses ISO 639-1/639-3, some differences possible with MARC21
			// and ISO 639-2 http://www.loc.gov/marc/languages/language_code.html
			properties.language = MARC21toISO6391(item.language);
		}
		
		if(properties.pages) {
			properties.pages = properties.pages.replace(/[^0-9]+/,"–")//separate page numbers with en dash
		}
		
		if(item.extra) {
			// automatically fill in PMCID, PMID, and JSTOR fields
			var extraFields={
				pmid: /^PMID\s*\:\s*([0-9]+)/m,
				pmc: /^PMCID\s*\:\s*((?:PMC)?[0-9]+)/m
			};
			
			for(var f in extraFields){
				var match = item.extra.match(extraFields[f]);
				if(match) properties[f] = match[1];
			}
		}
		
		if(item.url) {
			//try to extract missing fields from URL
			var libraryURLs={ 
				pmid:/www\.ncbi\.nlm\.nih\.gov\/pubmed\/([0-9]+)/i,
				pmc:/www\.ncbi\.nlm\.nih\.gov\/pmc\/articles\/((?:PMC)?[0-9]+)/i,
				jstor:/www\.jstor\.org\/stable\/([^?#]+)/i
			};
			
			for(var f in libraryURLs){
				if(properties[f]) continue; //don't overwrite from extra field
				var match = item.url.match(libraryURLs[f]);
				if(match) properties[f] = match[1];
			}
		}
		
		// write out properties
		Zotero.write((first ? "" : "\r\n\r\n") + "{{"+type);
		for(var key in properties) {
			if(properties[key]) Zotero.write("\r\n| "+key+" = "+properties[key]);
		}
		Zotero.write("\r\n}}");
		
		first = false;
	}
}
