{
	"translatorID": "96b9f483-c44d-5784-cdad-ce21b984fe01",
	"label": "Amazon.com",
	"creator": "Sean Takats, Michael Berkowitz, and Simon Kornblith",
	"target": "^https?://(?:www\\.)?amazon",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsbv",
	"lastUpdated": "2014-04-18 13:56:21"
}

function detectWeb(doc, url) {
	if(getSearchResults(doc, url)) {
		return (Zotero.isBookmarklet ? "server" : "multiple");
	} else {
		var xpath = '//input[contains(@name, "ASIN")]';
		if(doc.evaluate(xpath, doc, null, XPathResult.ANY_TYPE, null).iterateNext()) {
			if(Zotero.isBookmarklet) return "server";
			
			var elmt = doc.evaluate('//input[@name="storeID"]', doc, null, XPathResult.ANY_TYPE, null).iterateNext();
			if(elmt) {
				var storeID = elmt.value;
				//Z.debug(storeID);
				if (storeID=="music"|storeID=="dmusic"){
					return "audioRecording";
				} else if (storeID=="dvd"|storeID=="dvd-de"|storeID=="video"|storeID=="movies-tv"){
					return "videoRecording";
				} else if (storeID=="videogames"|storeID=="mobile-apps") {
					return "computerProgram";
				} else {
					return "book";
				}
			} else {
				return "book";
			}
		}
	}
}

function getSearchResults(doc, url) {
	//search results
	var links = [],
		container = doc.getElementById('atfResults')
			|| doc.getElementById('mainResults'); //e.g. http://www.amazon.com/Mark-LeBar/e/B00BU8L2DK
	if(container) {
		links = ZU.xpath(container, './div[starts-with(@id,"result_")]//h3/a')
	}
	
	if(!links.length) {
		//wish lists
		container = doc.getElementById('item-page-wrapper');
		if(container) {
			links = ZU.xpath(container, './/a[starts-with(@id, "itemName_")]');
		}
	}
	
	if(!links.length) return false;
	
	var availableItems = {}, found = false,
		asinRe = /\/(?:dp|product)\/(?:[^?#]+)\//;
	for(var i=0; i<links.length; i++) {
		var elmt = links[i];
		if(asinRe.test(elmt.href)) {
			availableItems[elmt.href] = elmt.textContent.trim();
			found = true;
		}
	}
	
	return found ? availableItems : false;
}

function doWeb(doc, url) {
	if(detectWeb(doc, url) == 'multiple') {
		Zotero.selectItems(getSearchResults(doc, url), function(items) {
			if(!items) return true;
			
			var links = [];
			for(var i in items) links.push(i);
			Zotero.Utilities.processDocuments(links, scrape);
		});

	} else {
		scrape(doc, url);
	}
}

function addLink(doc, item) {
	item.attachments.push({title:"Amazon.com Link", snapshot:false, mimeType:"text/html", url:doc.location.href});
}


var CREATOR = {
	"Actors":"castMember",
	"Directors":"director",
	"Producers":"producer"
};

var DATE = [
	"Original Release Date",
	"DVD Release Date"
];

//localization
var i15dFields = {
	'ISBN' : ['ISBN-13', 'ISBN-10', 'ISBN', '条形码'],
	'Publisher': ['Publisher', 'Verlag', 'Editora', '出版社', 'Editeur',  'Éditeur', 'Editore', 'Editor'],
	'Hardcover': ['Hardcover', 'Gebundene Ausgabe', '精装', 'ハードカバー', 'Relié', 'Copertina rigida', 'Tapa dura'],
	'Paperback' : ['Paperback', 'Taschenbuch', '平装', 'ペーパーバック', 'Broché', 'Copertina flessibile', 'Tapa blanda'],
	'Print Length' : ['Print Length', 'Seitenzahl der Print-Ausgabe', '紙の本の長さ', "Nombre de pages de l'édition imprimée", "Longueur d'impression", 'Lunghezza stampa', 'Longitud de impresión', 'Número de páginas'],//TODO: Chinese label
	'Language' : ['Language', 'Sprache', '语种', '言語', 'Langue', 'Lingua', 'Idioma'],
	'Actors' : ['Actors', 'Darsteller', 'Acteurs', 'Attori', 'Actores', '出演'],
	'Directors' : ['Directors', 'Regisseur(e)', 'Réalisateurs', 'Regista', 'Directores', '監督'],
	'Producers' : ['Producers'],
	'Run Time' : ['Run Time', 'Spieldauer', 'Durée', 'Durata', 'Duración', '時間'],
	'Studio' : ['Studio', 'Estudio', '販売元'],
	'Audio CD' : ['Audio CD', 'CD', 'CD de audio'],
	'Label' : ['Label', 'Etichetta', 'Étiquette', 'Sello', '发行公司', 'レーベル'],
	'Total Length' : ['Total Length', 'Gesamtlänge', 'Durée totale', 'Lunghezza totale', 'Duración total', '収録時間'],
	'Translator' : ["Translator", "Übersetzer", "Traduttore", "Traductor", "翻訳"],
	'Illustrator' : ["Illustrator", "Illustratore", "Ilustrador", "イラスト"]
};

function getField(info, field) {
	//returns the value for the key 'field' or any of its
	//corresponding (language specific) keys of the array 'info'
	
	if(!i15dFields[field]) return;
	
	for(var i=0; i<i15dFields[field].length; i++) {
		if(info[i15dFields[field][i]] !== undefined) return info[i15dFields[field][i]];	
	}
}

function get_nextsibling(n) {
	//returns next sibling of n, or if it was the last one
	//returns next sibling of its parent node, or... --> while(x == null)
	//accepts only element nodes (type 1) or nonempty textnode (type 3)
	//and skips everything else
	var x=n.nextSibling;
	while (x == null || (x.nodeType != 1 && (x.nodeType != 3 || x.textContent.match(/^\s*$/) ))) {
		if (x==null) {
			x = get_nextsibling(n.parentNode);
		} else {
			x=x.nextSibling;
		}
	}
	return x;	
}

function scrape(doc, url) {
	// Scrape HTML for items without ISBNs, because Amazon doesn't provide an easy way for
	// open source projects like us to use their API
	Z.debug("Scraping from Page")		
	var department = ZU.xpathText(doc, '//li[contains(@class, "nav-category-button")]/a').trim();
	var item = new Zotero.Item(detectWeb(doc, url) || "book");

	
	// Old design
	var titleNode = ZU.xpath(doc, '//span[@id="btAsinTitle"]')[0] ||
	// New design encountered 06/30/2013					
		ZU.xpath(doc, '//h1[@id="title"]/span')[0]||
		ZU.xpath(doc, '//h1[@id="title"]')[0]||
		ZU.xpath(doc, '//div[@id="title_row"]')[0]
		
	item.title = ZU.trimInternal(titleNode.textContent).replace(/(?: [(\[].+[)\]])+$/, "");
	
	var nextLine = get_nextsibling(titleNode);
	if ( ZU.xpath(nextLine, './/a[@href]').length == 0 &&  nextLine.tagName != "A") { //e.g. http://www.amazon.com/dp/1118728963
		nextLine = get_nextsibling(nextLine);
	}

	//we dont want div id=contributorContainer...
	//or some fake link with javascript functions...
	authors = ZU.xpath(nextLine, './a[@href] | ./span/a[@href] | ./span/span//a[@href]');
	if (authors.length == 0) authors = [ nextLine ];
	for(var i=0; i<authors.length; i++) {
		var author = authors[i].textContent.trim().replace(/\([^\)]*\)/,"");
		if(author) {
			var creatorRoleNode = get_nextsibling(authors[i]);
			if (creatorRoleNode.tagName == "A") {
				creatorRoleNode = get_nextsibling(creatorRoleNode);
			}
			var creatorRoleText = ZU.trimInternal(creatorRoleNode.textContent).replace("(","").replace(")","");
			if (i15dFields["Translator"].indexOf(creatorRoleText) > -1) {
				item.creators.push(ZU.cleanAuthor(author, 'translator'));
			} else if (i15dFields["Illustrator"].indexOf(creatorRoleText) > -1) {
				item.creators.push(ZU.cleanAuthor(author, 'contributor'));
			} else {
				item.creators.push(ZU.cleanAuthor(author, 'author'));
			}
			if (item.creators[item.creators.length -1].firstName == "") {
				item.creators[item.creators.length -1].fieldMode = 1;
				delete item.creators[item.creators.length -1].firstName;
			}
		}
	}
	
	//Abstract
	var abstractNode = doc.getElementById('postBodyPS');
	if (abstractNode) {
		item.abstractNote = abstractNode.textContent.trim();
		if (!item.abstractNote) {
			var iframe = abstractNode.getElementsByTagName('iframe')[0];
			if(iframe) {
				abstractNode = iframe.contentWindow.document.getElementById('iframeContent');
				item.abstractNote = abstractNode.textContent.trim();
			}
		}
	}
	
	// Extract info into an array
	var info = {},
		els = ZU.xpath(doc, '//div[@class="content"]/ul/li[b]');
	if(els.length) {
		for(var i=0; i<els.length; i++) {
			var el = els[i],
				key = ZU.xpathText(el, 'b[1]').trim()
			if(key) {
				info[key.replace(/\s*:$/, "")] = el.textContent.substr(key.length+1).trim();
			}
		}
	} else {
		// New design encountered 06/30/2013
		els = ZU.xpath(doc, '//tr[td[@class="a-span3"]][td[@class="a-span9"]]');
		for(var i=0; i<els.length; i++) {
			var el = els[i],
				key = ZU.xpathText(el, 'td[@class="a-span3"]'),
				value = ZU.xpathText(el, 'td[@class="a-span9"]');
			if(key && value) info[key.trim()] = value.trim();
		}
	}
	// Date
	for(var i=0; i<DATE.length; i++) {
		item.date = info[DATE[i]];
		if(item.date) break;
	}
	if(!item.date) {
		for(var i in info) {
			var m = /\(([^)]+ [0-9]{4})\)/.exec(info[i]);
			if(m) item.date = m[1];
		}
	}
	
	// Books
	var publisher = getField(info, 'Publisher');
	if(publisher) {
		var m = /([^;(]+)(?:; *([^(]*))?( \([^)]*\))?/.exec(publisher);
		item.publisher = m[1];
		item.edition = m[2];
	}
	item.ISBN = getField(info, 'ISBN');
	if (item.ISBN) {
		item.ISBN = ZU.cleanISBN(item.ISBN);
	}
	var pages = getField(info, 'Hardcover') || getField(info, 'Paperback') || getField(info, 'Print Length');
	if(pages) item.numPages = parseInt(pages, 10);
	item.language = getField(info, 'Language');
	//add publication place from ISBN translator, see at the end
	
	// Video
	var clearedCreators = false;
	for(var i in CREATOR) {
		if(getField(info, i)) {
			if(!clearedCreators) {
				item.creators = [];
				clearedCreators = true;
			}
			var creators = getField(info, i).split(/ *, */);
			for(var j=0; j<creators.length; j++) {
				item.creators.push(ZU.cleanAuthor(creators[j], CREATOR[i]));
			}
		}
	}
	item.studio = getField(info, 'Studio');
	item.runningTime = getField(info, 'Run Time');
	if (!item.runningTime) item.runningTime = getField(info, 'Total Length');
	item.language = getField(info, 'Language');
	// Music
	item.label = getField(info, 'Label');
	if(getField(info, 'Audio CD')) {
		item.audioRecordingType = "Audio CD";
	} else if(department == "Amazon MP3 Store") {
		item.audioRecordingType = "MP3";
	}
	
	addLink(doc, item);
	
	//we search for translators for a given ISBN
	//and try to figure out the missing publication place
	if(item.ISBN && !item.place) {
		Z.debug("Searching for additional metadata by ISBN: " + item.ISBN);
		var search = Zotero.loadTranslator("search");
		search.setHandler("translators", function(obj, translators) {
			search.setTranslator(translators);
			search.setHandler("itemDone", function(obj, lookupItem) {
				Z.debug(lookupItem.libraryCatalog);
				if (lookupItem.place) {
					//e.g. [Paris]
					item.place = lookupItem.place.replace("[","").replace("]","");
				}
			});
			search.translate();
		});
		search.setHandler("error", function(error) {
			// we mostly need this handler to prevent the default one from kicking in
			Z.debug("ISBN search for " + item.ISBN + " failed: " + error);
		});
		search.setHandler("done", function() {
			item.complete();
		});
		search.setSearch({ ISBN: item.ISBN });
		search.getTranslators();
		
	} else {
		item.complete();
	}
	
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.amazon.com/Test-William-Sleator/dp/0810989891/ref=sr_1_1?ie=UTF8&qid=1308010556&sr=8-1",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"firstName": "William",
						"lastName": "Sleator",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Amazon.com Link",
						"snapshot": false,
						"mimeType": "text/html"
					}
				],
				"title": "Test",
				"abstractNote": "Now in paperback! Pass, and have it made. Fail, and suffer the consequences. A master of teen thrillers tests readers’ courage in an edge-of-your-seat novel that echoes the fears of exam-takers everywhere. Ann, a teenage girl living in the security-obsessed, elitist United States of the very near future, is threatened on her way home from school by a mysterious man on a black motorcycle. Soon she and a new friend are caught up in a vast conspiracy of greed involving the mega-wealthy owner of a school testing company. Students who pass his test have it made; those who don’t, disappear . . . or worse. Will Ann be next? For all those who suspect standardized tests are an evil conspiracy, here’s a thriller that really satisfies! Praise for Test “Fast-paced with short chapters that end in cliff-hangers . . . good read for moderately reluctant readers. Teens will be able to draw comparisons to contemporary society’s shift toward standardized testing and ecological concerns, and are sure to appreciate the spoofs on NCLB.” —School Library Journal “Part mystery, part action thriller, part romance . . . environmental and political overtones . . . fast pace and unique blend of genres holds attraction for younger teen readers.” —Booklist",
				"date": "April 1, 2010",
				"publisher": "Amulet Paperbacks",
				"edition": "Reprint edition",
				"ISBN": "9780810989894",
				"numPages": 320,
				"language": "English",
				"place": "New York",
				"libraryCatalog": "Amazon.com"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.amazon.com/s/ref=nb_sb_noss?url=search-alias%3Dstripbooks&field-keywords=foot&x=0&y=0",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.amazon.com/Loveless-My-Bloody-Valentine/dp/B000002LRJ/ref=ntt_mus_ep_dpi_1",
		"items": [
			{
				"itemType": "audioRecording",
				"creators": [
					{
						"firstName": "My Bloody",
						"lastName": "Valentine",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Amazon.com Link",
						"snapshot": false,
						"mimeType": "text/html"
					}
				],
				"title": "Loveless",
				"date": "November 5, 1991",
				"label": "Sire / London/Rhino",
				"audioRecordingType": "Audio CD",
				"libraryCatalog": "Amazon.com"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.amazon.com/s?ie=UTF8&keywords=The%20Harvard%20Concise%20Dictionary%20of%20Music%20and%20Musicians&index=blended&Go=o",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.amazon.com/Adaptation-Superbit-Collection-Nicholas-Cage/dp/B00005JLRE/ref=sr_1_1?ie=UTF8&qid=1309683150&sr=8-1",
		"items": [
			{
				"itemType": "videoRecording",
				"creators": [
					{
						"firstName": "Nicolas",
						"lastName": "Cage",
						"creatorType": "castMember"
					},
					{
						"firstName": "Meryl",
						"lastName": "Streep",
						"creatorType": "castMember"
					},
					{
						"firstName": "Chris",
						"lastName": "Cooper",
						"creatorType": "castMember"
					},
					{
						"firstName": "Tilda",
						"lastName": "Swinton",
						"creatorType": "castMember"
					},
					{
						"firstName": "Jay",
						"lastName": "Tavare",
						"creatorType": "castMember"
					},
					{
						"firstName": "Spike",
						"lastName": "Jonze",
						"creatorType": "director"
					},
					{
						"firstName": "Charlie",
						"lastName": "Kaufman",
						"creatorType": "producer"
					},
					{
						"firstName": "Edward",
						"lastName": "Saxon",
						"creatorType": "producer"
					},
					{
						"firstName": "Jonathan",
						"lastName": "Demme",
						"creatorType": "producer"
					},
					{
						"firstName": "Peter",
						"lastName": "Saraf",
						"creatorType": "producer"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Amazon.com Link",
						"snapshot": false,
						"mimeType": "text/html"
					}
				],
				"title": "Adaptation",
				"date": "May 20, 2003",
				"studio": "Sony Pictures Home Entertainment",
				"runningTime": "114 minutes",
				"language": "English (Dolby Digital 2.0 Surround), English (Dolby Digital 5.1), English (DTS 5.1), French (Dolby Digital 5.1)",
				"libraryCatalog": "Amazon.com"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.amazon.com/gp/registry/registry.html?ie=UTF8&id=1Q7ELHV59D7N&type=wishlist",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.amazon.fr/Candide-Fran%C3%A7ois-Marie-Voltaire-Arouet-dit/dp/2035866014/ref=sr_1_2?s=books&ie=UTF8&qid=1362329827&sr=1-2",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"firstName": "François-Marie",
						"lastName": "Voltaire",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Amazon.com Link",
						"snapshot": false,
						"mimeType": "text/html"
					}
				],
				"title": "Candide",
				"abstractNote": "Que signifie ce nom \"Candide\" : innocence de celui qui ne connaît pas le mal ou illusion du naïf qui n'a pas fait l'expérience du monde ? Voltaire joue en 1759, après le tremblement de terre de Lisbonne, sur ce double sens. Il nous fait partager les épreuves fictives d'un jeune homme simple, confronté aux leurres de l'optimisme, mais qui n'entend pas désespérer et qui en vient à une sagesse finale, mesurée et mystérieuse. Candide n'en a pas fini de nous inviter au gai savoir et à la réflexion.",
				"date": "17 août 2011",
				"publisher": "Larousse",
				"ISBN": "9782035866011",
				"numPages": 176,
				"language": "Français",
				"place": "Paris",
				"libraryCatalog": "Amazon.com"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.amazon.de/Fiktionen-Erz%C3%A4hlungen-Jorge-Luis-Borges/dp/3596105811/ref=sr_1_1?ie=UTF8&qid=1362329791&sr=8-1",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"firstName": "Jorge Luis",
						"lastName": "Borges",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Amazon.com Link",
						"snapshot": false,
						"mimeType": "text/html"
					}
				],
				"title": "Fiktionen: Erzählungen 1939 - 1944",
				"abstractNote": "Gleich bei seinem Erscheinen in den 40er Jahren löste Jorge Luis Borges’ erster Erzählband »Fiktionen« eine literarische Revolution aus. Erfundene Biographien, fiktive Bücher, irreale Zeitläufe und künstliche Realitäten verflocht Borges zu einem geheimnisvollen Labyrinth, das den Leser mit seinen Rätseln stets auf neue herausfordert. Zugleich begründete er mit seinen berühmten Erzählungen wie»›Die Bibliothek zu Babel«, «Die kreisförmigen Ruinen« oder»›Der Süden« den modernen »Magischen Realismus«.   »Obwohl sie sich im Stil derart unterscheiden, zeigen zwei Autoren uns ein Bild des nächsten Jahrtausends: Joyce und Borges.« Umberto Eco",
				"date": "1. Mai 1992",
				"publisher": "FISCHER Taschenbuch",
				"edition": "Auflage: 12",
				"ISBN": "9783596105816",
				"numPages": 192,
				"language": "Deutsch",
				"place": "Frankfurt am Main",
				"libraryCatalog": "Amazon.com",
				"shortTitle": "Fiktionen"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.amazon.co.uk/Tale-Two-Cities-ebook/dp/B004EHZXVQ/ref=sr_1_1?s=books&ie=UTF8&qid=1362329884&sr=1-1",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"firstName": "Charles",
						"lastName": "Dickens",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Amazon.com Link",
						"snapshot": false,
						"mimeType": "text/html"
					}
				],
				"title": "A Tale of Two Cities",
				"date": "1 Dec 2010",
				"publisher": "Public Domain Books",
				"numPages": 238,
				"language": "English",
				"libraryCatalog": "Amazon.com"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.amazon.it/Emil-Astrid-Lindgren/dp/888203867X/ref=sr_1_1?s=books&ie=UTF8&qid=1362324961&sr=1-1",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"firstName": "Astrid",
						"lastName": "Lindgren",
						"creatorType": "author"
					},
					{
						"firstName": "B.",
						"lastName": "Berg",
						"creatorType": "contributor"
					},
					{
						"firstName": "A. Palme",
						"lastName": "Sanavio",
						"creatorType": "translator"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Amazon.com Link",
						"snapshot": false,
						"mimeType": "text/html"
					}
				],
				"title": "Emil",
				"abstractNote": "Si pensa che soprattutto in una casa moderna, con prese elettriche, gas, balconi altissimi un bambino possa mettersi in pericolo: Emil vive in una tranquilla casa di campagna, ma riesce a ficcare la testa in una zuppiera e a rimanervi incastrato, a issare la sorellina Ida in cima all'asta di una bandiera, e a fare una tale baldoria alla fiera del paese che i contadini decideranno di organizzare una colletta per spedirlo in America e liberare così la sua povera famiglia. Ma questo succederà nel prossimo libro di Emil, perché ce ne sarà un altro, anzi due, tante sono le sue monellerie. Età di lettura: da 7 anni.",
				"date": "26 giugno 2008",
				"publisher": "Nord-Sud",
				"edition": "3 edizione",
				"ISBN": "9788882038670",
				"numPages": 72,
				"language": "Italiano",
				"place": "Milano",
				"libraryCatalog": "Amazon.com"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.amazon.cn/%E5%9B%BE%E4%B9%A6/dp/B007CUSP3A",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"lastName": "吕士楠",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"lastName": "初敏",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"lastName": "许洁萍",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"lastName": "贺琳",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Amazon.com Link",
						"snapshot": false,
						"mimeType": "text/html"
					}
				],
				"title": "汉语语音合成:原理和技术",
				"abstractNote": "《汉语语音合成:原理和技术》介绍语音合成的原理和针对汉语的各项合成技术，以及应用的范例。全书分基础篇和专题篇两大部分。基础篇介绍语音合成技术的发展历程和作为语音合成技术基础的声学语音学知识，尤其是作者获得的相关研究成果（填补了汉语语音学知识中的某些空白），并对各种合成器的工作原理和基本结构进行系统的阐述。专题篇结合近十年来国内外技术发展的热点和方向，讨论韵律分析与建模、数据驱动的语音合成方法、语音合成数据库的构建技术、文语转换系统的评估方法、语音合成技术的应用等。 《汉语语音合成:原理和技术》面向从事语言声学、语音通信技术，特别是语音合成的科学工作者、工程技术人员、大学教师、研究生和高年级的大学生，可作为他们研究、开发、进修的参考书。",
				"publisher": "科学出版社",
				"edition": "第1版",
				"ISBN": "9787030329202",
				"numPages": 373,
				"place": "Beijing",
				"libraryCatalog": "Amazon.com",
				"shortTitle": "汉语语音合成"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.amazon.co.uk/Walt-Disney-Pixar-Up-DVD/dp/B0029Z9UQ4/ref=sr_1_1?s=dvd&ie=UTF8&qid=1395560537&sr=1-1&keywords=up",
		"items": [
			{
				"itemType": "videoRecording",
				"creators": [
					{
						"firstName": "Ed",
						"lastName": "Asner",
						"creatorType": "castMember"
					},
					{
						"firstName": "Christopher",
						"lastName": "Plummer",
						"creatorType": "castMember"
					},
					{
						"firstName": "Jordan",
						"lastName": "Nagai",
						"creatorType": "castMember"
					},
					{
						"firstName": "Pete",
						"lastName": "Docter",
						"creatorType": "director"
					},
					{
						"firstName": "Bob",
						"lastName": "Peterson",
						"creatorType": "director"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Amazon.com Link",
						"snapshot": false,
						"mimeType": "text/html"
					}
				],
				"title": "Walt Disney / Pixar - Up",
				"date": "15 Feb 2010",
				"studio": "Walt Disney Studios Home Entertainment",
				"runningTime": "96 minutes",
				"language": "English",
				"libraryCatalog": "Amazon.com"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.amazon.de/dp/B00GKBYC3E/",
		"items": [
			{
				"itemType": "audioRecording",
				"creators": [
					{
						"firstName": "Various",
						"lastName": "artists",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Amazon.com Link",
						"snapshot": false,
						"mimeType": "text/html"
					}
				],
				"title": "Die Eiskönigin Völlig Unverfroren",
				"runningTime": "1:08:59",
				"libraryCatalog": "Amazon.com"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.amazon.co.jp/gp/product/0099578077/",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"firstName": "Haruki",
						"lastName": "Murakami",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Amazon.com Link",
						"snapshot": false,
						"mimeType": "text/html"
					}
				],
				"title": "1Q84: Books 1, 2 and 3",
				"publisher": "Vintage",
				"ISBN": "9780099578079",
				"numPages": 1328,
				"language": "英語, 英語, 不明",
				"place": "London",
				"libraryCatalog": "Amazon.com",
				"shortTitle": "1Q84"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.amazon.com/Mark-LeBar/e/B00BU8L2DK",
		"items": "multiple"
	}
]
/** END TEST CASES **/