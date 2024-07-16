{
	"translatorID": "96b9f483-c44d-5784-cdad-ce21b984fe01",
	"label": "Amazon",
	"creator": "Sean Takats, Michael Berkowitz, and Simon Kornblith",
	"target": "^https?://((www\\.)|(smile\\.))?amazon",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-07-16 18:51:09"
}

function detectWeb(doc, _url) {
	if (getSearchResults(doc, true)) {
		return (Zotero.isBookmarklet ? "server" : "multiple");
	}
	if ((attr(doc, 'link[rel=canonical]', 'href') || '').match(/dp\/[A-Z0-9]+$/)) {
		if (Zotero.isBookmarklet) return "server";
		
		var productClass = attr(doc, 'div[id="dp"]', 'class');
		if (!productClass) {
			Z.debug("No product class found; trying store ID");
			productClass = attr(doc, 'input[name="storeID"]', 'value');
		}
		if (!productClass) {
			Z.debug("No store ID found; looking for special stores");
			if (doc.getElementById('dmusic_buybox_container')) {
				productClass = 'music';
			}
		}
		// delete language code
		productClass = productClass.replace(/[a-z][a-z]_[A-Z][A-Z]/, "").trim();
		
		if (productClass) {
			if (productClass.includes("book")) { // also ebooks
				return "book";
			}
			else if (productClass == "music" | productClass == "dmusic") {
				return "audioRecording";
			}
			else if (productClass == "dvd" | productClass == "dvd-de" | productClass == "video" | productClass == "movies-tv") {
				return "videoRecording";
			}
			else if (productClass == "videogames" | productClass == "mobile-apps") {
				return "computerProgram";
			}
			else {
				Z.debug("Unknown product class" + productClass + "will be ignored by Zotero");
			}
		}
		else {
			// audio books are purchased as audible abo
			if (text(doc, 'form[class="a-spacing-none"][action*="/audible/"]')) {
				return "audioRecording";
			}
			var mainCategory = text(doc, '#wayfinding-breadcrumbs_container li a');
			if (mainCategory && mainCategory.includes('Kindle')) {
				return "book";
			}
			else {
				Z.debug("Items in this category will be ignored by Zotero: " + mainCategory);
			}
		}
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	// search results
	var links = doc.querySelectorAll('div.s-result-list h2>a');
	
	if (!links.length) {
		// wish lists
		var container = doc.getElementById('item-page-wrapper');
		if (container) {
			links = ZU.xpath(container, './/a[starts-with(@id, "itemName_")]');
		}
	}
	
	if (!links.length) {
		// author pages
		links = ZU.xpath(doc, '//div[@id="searchWidget"]//a[span[contains(@class, "a-size-medium")]]');
	}
	
	if (!links.length) return false;
	var availableItems = {}, found = false,
		asinRe = /\/(?:dp|product)\/(?:[^?#]+)\//;
	for (var i = 0; i < links.length; i++) {
		var elmt = links[i];
		if (asinRe.test(elmt.href)) {
			if (checkOnly) return true;
			availableItems[elmt.href] = elmt.textContent.trim();
			found = true;
		}
	}
	
	return found ? availableItems : false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == 'multiple') {
		Zotero.selectItems(getSearchResults(doc), function (items) {
			if (!items) return;
			
			var links = [];
			for (var i in items) links.push(i);
			Zotero.Utilities.processDocuments(links, scrape);
		});
	}
	else {
		scrape(doc, url);
	}
}

function addLink(doc, item) {
	item.attachments.push({ title: "Amazon.com Link", snapshot: false, mimeType: "text/html", url: doc.location.href });
}


var CREATOR = {
	Actor: "castMember",
	Director: "director",
	Producer: "producer",
	Writer: "scriptwriter",
	Translator: "translator",
	Author: "author",
	Illustrator: "contributor",
	Editor: "editor"
};

var DATE = [
	"original release date",
	"dvd Release Date",
	"erscheinungstermin",
	"date de sortie du dvd",
	"release date"
];

// localization
var i15dFields = {
	ISBN: ['ISBN-13', 'ISBN-10', 'ISBN', '条形码'],
	Publisher: ['Publisher', 'Verlag', 'Herausgeber', '出版社'],
	Hardcover: ['Hardcover', 'Gebundene Ausgabe', '精装', 'ハードカバー', 'Relié', 'Copertina rigida', 'Tapa dura'],
	Paperback: ['Paperback', 'Taschenbuch', '平装', 'ペーパーバック', 'Broché', 'Copertina flessibile', 'Tapa blanda'],
	'Print Length': ['Print Length', 'Seitenzahl der Print-Ausgabe', '紙の本の長さ', "Nombre de pages de l'édition imprimée", "Longueur d'impression", 'Poche', 'Broché', 'Lunghezza stampa', 'Longitud de impresión', 'Número de páginas'], // TODO: Chinese label
	Language: ['Language', 'Sprache', '语种', '言語', 'Langue', 'Lingua', 'Idioma'],
	Author: ['Author', '著', '作者'],
	Actor: ['Actors', 'Actor', 'Darsteller', 'Acteurs', 'Attori', 'Attore', 'Actores', '出演'],
	Director: ['Directors', 'Director', 'Regisseur', 'Regisseur(e)', 'Réalisateurs', 'Regista', 'Directores', '監督'],
	Producer: ['Producers', 'Producer'],
	'Run Time': ['Run Time', 'Spieldauer', 'Durée', 'Durata', 'Duración', '時間'],
	Studio: ['Studio', 'Estudio', '販売元'],
	'Audio CD': ['Audio CD', 'CD', 'CD de audio'],
	Label: ['Label', 'Etichetta', 'Étiquette', 'Sello', '发行公司', 'レーベル'],
	'Total Length': ['Total Length', 'Gesamtlänge', 'Durée totale', 'Lunghezza totale', 'Duración total', '収録時間'],
	Translator: ["Translator", "Übersetzer", "Traduttore", "Traductor", "翻訳"],
	Illustrator: ["Illustrator", "Illustratore", "Ilustrador", "イラスト"],
	Writer: ['Writers'],
	Editor: ['Editor', 'Editora', 'Editeur', 'Éditeur', 'Editore']
};

function getField(info, field) {
	// returns the value for the key 'field' or any of its
	// corresponding (language specific) keys of the array 'info'
	
	if (!i15dFields[field]) return false;
	
	for (var i = 0; i < i15dFields[field].length; i++) {
		let possibleField = i15dFields[field][i].toLowerCase();
		if (info[possibleField] !== undefined) {
			return info[possibleField];
		}
	}
	return false;
}

function translateField(str) {
	for (var f in i15dFields) {
		if (i15dFields[f].includes(str)) {
			return f;
		}
	}
	return false;
}


function scrape(doc, url) {
	var isAsian = url.search(/^https?:\/\/[^/]+\.(?:jp|cn)[:/]/) != -1;
	// Scrape HTML for items without ISBNs, because Amazon doesn't provide an easy way for
	// open source projects like us to use their API
	Z.debug("Scraping from Page");
	var item = new Zotero.Item(detectWeb(doc, url) || "book");

	var title = doc.getElementById('btAsinTitle')
		|| doc.getElementById('title_row')
		|| doc.getElementById('productTitle')
		|| doc.getElementById('ebooksProductTitle')
		|| doc.getElementById('title_feature_div')
		|| doc.getElementById('dmusicProductTitle_feature_div');
	// get first non-empty text node (other text nodes are things like [Paperback] and dates)
	item.title = ZU.trimInternal(
		ZU.xpathText(title, '(.//text()[normalize-space(self::text())])[1]')
	)
		// though sometimes [Paperback] or [DVD] is mushed with the title...
		.replace(/(?: [([].+[)\]])+$/, "");
	
	var baseNode = title.parentElement, bncl;
	//	Z.debug(baseNode)
	while (baseNode && (bncl = baseNode.classList)
		&& !(// ways to identify a node encompasing title and authors
			baseNode.id == 'booksTitle'
			|| baseNode.id == 'ppd-center'
			|| baseNode.id == 'title_feature_div'
			|| bncl.contains('buying')
			|| bncl.contains('content')
			|| bncl.contains('DigitalMusicInfoColumn')
			|| (baseNode.id == 'centerCol' && baseNode.firstElementChild.id.indexOf('title') == 0)
		)
	) {
		baseNode = baseNode.parentElement;
	}

	var authors, name, role, invertName;
	if (baseNode) {
		authors = ZU.xpath(baseNode, './/span[@id="artistBlurb"]/a');
		// if (!authors.length) authors = baseNode.getElementsByClassName('contributorNameID');
		if (!authors.length) authors = ZU.xpath(baseNode, '(.//*[@id="byline"]/span[contains(@class, "author")] | .//*[@id="byline"]/span[contains(@class, "author")]/span)/a[contains(@class, "a-link-normal")][1]');
		if (!authors.length) authors = ZU.xpath(baseNode, './/span[@class="contributorNameTrigger"]/a[not(@href="#")]');
		if (!authors.length) authors = ZU.xpath(baseNode, './/span[contains(@class, "author")]/a|.//span[contains(@class, "author")]/span/a');
		if (!authors.length) authors = ZU.xpath(baseNode, './/a[following-sibling::*[1][@class="byLinePipe"]]');
		if (!authors.length) authors = ZU.xpath(baseNode, './/a[contains(@href, "field-author=")]');
		if (!authors.length) authors = ZU.xpath(baseNode, './/a[@id="ProductInfoArtistLink"]');
		if (!authors.length) authors = ZU.xpath(baseNode, './/a[@id="ProductInfoArtistLink"]');
		for (let i = 0; i < authors.length; i++) {
			role = ZU.xpathText(authors[i], '(.//following::text()[normalize-space(self::text())])[1]');
			if (role) {
				role = CREATOR[translateField(
					role.replace(/^.*\(\s*|\s*\).*$/g, '')
						.split(',')[0] // E.g. "Actor, Primary Contributor"
						.trim()
				)];
			}
			if (!role) role = 'author';
			
			name = ZU.trimInternal(authors[i].textContent)
				.replace(/\s*\([^)]+\)/, '');
			
			if (item.itemType == 'audioRecording') {
				item.creators.push({
					lastName: name,
					creatorType: 'performer',
					fieldMode: 1
				});
			}
			else {
				invertName = isAsian && !(/[A-Za-z]/.test(name));
				if (invertName) {
					// Use last character as given name if there is no space
					if (!name.includes(' ')) name = name.replace(/.$/, ' $&');
					name = name.replace(/\s+/, ', '); // Surname comes first
				}
				item.creators.push(ZU.cleanAuthor(name, role, name.includes(',')));
			}
		}
	}
	// can't find the baseNode on some pages, e.g. https://www.amazon.com/First-Quarto-Hamlet-Cambridge-Shakespeare-dp-0521418194/dp/0521418194/ref=mt_hardcover?_encoding=UTF8&me=&qid=
	if (!item.creators.length) {
		// subtle differences in the author block, so duplicating some code here
		authors = ZU.xpath(doc, '//div[@id="bylineInfo"]/span[contains(@class, "author")]');
		for (let i = 0; i < authors.length; i++) {
			role = ZU.xpathText(authors[i], './/span[@class="contribution"]');
			if (role) {
				role = CREATOR[translateField(
					role.trim().replace(/^.*\(\s*|\s*\).*$/g, '')
						.split(',')[0] // E.g. "Actor, Primary Contributor"
						.trim()
				)];
			}
			if (!role) role = 'author';
			name = ZU.trimInternal(ZU.xpathText(authors[i], './span/a[contains(@class, "a-link-normal")]|./a[contains(@class, "a-link-normal")]'))
				.replace(/\s*\([^)]+\)/, '').replace(/,\s*$/, '');
			if (item.itemType == 'audioRecording') {
				item.creators.push({
					lastName: name,
					creatorType: 'performer',
					fieldMode: 1
				});
			}
			else {
				invertName = isAsian && !(/[A-Za-z]/.test(name));
				if (invertName) {
					// Use last character as given name if there is no space
					if (!name.includes(' ')) name = name.replace(/.$/, ' $&');
					name = name.replace(/\s+/, ', '); // Surname comes first
				}
				item.creators.push(ZU.cleanAuthor(name, role, name.includes(',')));
			}
		}
	}
	
	
	// Abstract
	var abstractNode = doc.getElementById('postBodyPS');
	if (abstractNode) {
		item.abstractNote = abstractNode.textContent.trim();
		if (!item.abstractNote) {
			var iframe = abstractNode.getElementsByTagName('iframe')[0];
			if (iframe) {
				abstractNode = iframe.contentWindow.document.getElementById('iframeContent');
				item.abstractNote = abstractNode.textContent.trim();
			}
		}
	} else {
		item.abstractNote = text(doc, '#bookDescription_feature_div .a-expander-content');
	}

	// Extract info into an array
	var info = {},
		els = ZU.xpath(doc, '//div[@class="content"]/ul/li[b]');
	if (els.length) {
		for (let i = 0; i < els.length; i++) {
			let el = els[i],
				key = ZU.xpathText(el, 'b[1]').trim();
			if (key) {
				info[key.replace(/\s*:$/, "").toLowerCase()] = el.textContent.substr(key.length + 1).trim();
			}
		}
	}
	if (!els.length) {
		// New design encountered 08/31/2020
		els = doc.querySelectorAll('ul.detail-bullet-list li');
		if (!els.length) {
			// New design encountered 2022-11-20
			els = doc.querySelectorAll('#detailBullets_feature_div ul > li span');
		}
		for (let el of els) {
			let key = text(el, '.a-list-item span:first-child');
			let value = text(el, '.a-list-item span:nth-child(2)');
			if (key && value) {
				key = key.replace(/\s*:\s*$/, "");
				// Extra colon in Language field as of 9/4/2020
				key = key.replace(/\s*:$/, '');
				// The colon is surrounded by RTL/LTR marks as of 6/24/2021
				key = key.replace(/[\s\u200e\u200f]*:[\s\u200e\u200f]*$/, '');
				info[key.toLowerCase()] = value.trim();
			}
		}
	}
	if (!els.length) {
		// New design encountered 06/30/2013
		els = ZU.xpath(doc, '//tr[td[@class="a-span3"]][td[@class="a-span9"]]');
		for (let i = 0; i < els.length; i++) {
			let el = els[i],
				key = ZU.xpathText(el, 'td[@class="a-span3"]'),
				value = ZU.xpathText(el, 'td[@class="a-span9"]');
			if (key && value) {
				info[key.trim().toLowerCase()] = value.trim();
			}
		}
	}
	item.ISBN = getField(info, 'ISBN');
	if (item.ISBN) {
		item.ISBN = ZU.cleanISBN(item.ISBN);
	}

	// Date
	for (let i = 0; i < DATE.length; i++) {
		item.date = info[DATE[i]];
		if (item.date) break;
	}
	if (!item.date) {
		for (let i in info) {
			let m = /\(([^)]+ [0-9]{4})\)/.exec(info[i]);
			if (m) item.date = m[1];
		}
	}
	
	// Books
	var publisher = getField(info, 'Publisher') || getField(info, 'Editor');
	if (publisher) {
		var m = /([^;(]+)(?:;? *([^(]*))?(?:\(([^)]*)\))?/.exec(publisher);
		item.publisher = m[1].trim();
		if (m[2]) {
			item.edition = m[2].trim()
				.replace(/^(Auflage|Édition)\s?:/, '')
				// "FISCHER Taschenbuch; 15. Auflage (1. Mai 1992)""
				.replace(/\. (Auflage|[EÉ]dition)\s*/, '');
		}
		// Looks like a date
		if (m[3] && m[3].search(/\b\d{4}\b/) != -1) item.date = ZU.strToISO(m[3].trim());
	}
	var pages = getField(info, 'Hardcover') || getField(info, 'Paperback') || getField(info, 'Print Length');
	if (pages) item.numPages = parseInt(pages);
	item.language = getField(info, 'Language');
	// add publication place from ISBN translator, see at the end
	
	// Video
	if (item.itemType == 'videoRecording') {
		// This seems to only be worth it for videos
		var clearedCreators = false;
		for (var i in CREATOR) {
			if (getField(info, i)) {
				if (!clearedCreators) {
					item.creators = [];
					clearedCreators = true;
				}
				var creators = getField(info, i).split(/ *, */);
				for (var j = 0; j < creators.length; j++) {
					item.creators.push(ZU.cleanAuthor(creators[j], CREATOR[i]));
				}
			}
		}
	}
	item.studio = getField(info, 'Studio');
	item.runningTime = getField(info, 'Run Time');
	if (!item.runningTime) item.runningTime = getField(info, 'Total Length');
	item.language = getField(info, 'Language');
	// Music
	item.label = getField(info, 'Label');
	var department = ZU.xpathText(doc, '//li[contains(@class, "nav-category-button")]/a');
	if (getField(info, 'Audio CD')) {
		item.audioRecordingFormat = "Audio CD";
	}
	else if (department && department.trim() == "Amazon MP3 Store") {
		item.audioRecordingFormat = "MP3";
	}
	
	addLink(doc, item);
	
	// we search for translators for a given ISBN
	// and try to figure out the missing publication place
	if (item.ISBN && !item.place) {
		Z.debug("Searching for additional metadata by ISBN: " + item.ISBN);
		var search = Zotero.loadTranslator("search");
		search.setHandler("translators", function (obj, translators) {
			search.setTranslator(translators);
			search.setHandler("itemDone", function (obj, lookupItem) {
				Z.debug(lookupItem.libraryCatalog);
				if (lookupItem.place) {
					// e.g. [Paris]
					item.place = lookupItem.place.replace("[", "").replace("]", "");
				}
				
				if (!item.date && lookupItem.date) {
					item.date = lookupItem.date;
				}
			});
			search.translate();
		});
		search.setHandler("error", function (error) {
			// we mostly need this handler to prevent the default one from kicking in
			Z.debug("ISBN search for " + item.ISBN + " failed: " + error);
		});
		search.setHandler("done", function () {
			item.complete();
		});
		search.setSearch({ ISBN: item.ISBN });
		search.getTranslators();
	}
	else {
		item.complete();
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.amazon.com/Loveless-My-Bloody-Valentine/dp/B000002LRJ/ref=ntt_mus_ep_dpi_1",
		"items": [
			{
				"itemType": "audioRecording",
				"title": "Wrong",
				"creators": [
					{
						"lastName": "My Bloody Valentine",
						"creatorType": "performer",
						"fieldMode": 1
					}
				],
				"date": "1991",
				"label": "Sire",
				"language": "English",
				"libraryCatalog": "Amazon",
				"attachments": [
					{
						"title": "Amazon.com Link",
						"snapshot": false,
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
