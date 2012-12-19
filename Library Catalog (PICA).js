{
	"translatorID": "1b9ed730-69c7-40b0-8a06-517a89a3a278",
	"label": "Library Catalog (PICA)",
	"creator": "Sean Takats, Michael Berkowitz, Sylvain Machefert, Sebastian Karcher",
	"target": "^http://[^/]+/DB=\\d",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsb",
	"lastUpdated": "2012-12-18 23:55:08"
}

/*Works for many, but not all PICA versions. Tested with:
http://opc4.kb.nl/
http://catalogue.rug.nl/
http://www.sudoc.abes.fr/
http://gso.gbv.de
*/
function detectWeb(doc, url) {
	var multxpath = "//span[@class='tab1']";
	if (elt = doc.evaluate(multxpath, doc, null, XPathResult.ANY_TYPE, null).iterateNext()) {
		var content = elt.textContent;
		if ((content == "Liste des résultats") || (content == "shortlist") || (content == 'Kurzliste') || content == 'titellijst') {
			return "multiple";
		} else if ((content == "Notice détaillée") || (content == "title data") || (content == 'Titeldaten') || (content == 'full title') || (content == 'Titelanzeige' || (content == 'titelgegevens'))) {
			var xpathimage = "//span[@class='rec_mat_long']/img";
			if (elt = doc.evaluate(xpathimage, doc, null, XPathResult.ANY_TYPE, null).iterateNext()) {
				var type = elt.getAttribute('src');
				//Z.debug(type);
				if (type.indexOf('article.') > 0) {
					return "journalArticle";
				} else if (type.indexOf('audiovisual.') > 0) {
					return "film";
				} else if (type.indexOf('book.') > 0) {
					return "book";
				} else if (type.indexOf('handwriting.') > 0) {
					return "manuscript";
				} else if (type.indexOf('sons.') > 0 || type.indexOf('sound.') > 0 || type.indexOf('score') > 0) {
					return "audioRecording";
				} else if (type.indexOf('thesis.') > 0) {
					return "thesis";
				} else if (type.indexOf('map.') > 0) {
					return "map";
				}
			}
			return "book";
		}
	}
}

function scrape(doc, url) {
	var zXpath = '//span[@class="Z3988"]';
	var eltCoins = doc.evaluate(zXpath, doc, null, XPathResult.ANY_TYPE, null).iterateNext();
	if (eltCoins) {
		var coins = eltCoins.getAttribute('title');

		var newItem = new Zotero.Item();
		//newItem.repository = "SUDOC"; // do not save repository
		Zotero.Utilities.parseContextObject(coins, newItem)
	} else var newItem = new Zotero.Item();


	newItem.itemType = detectWeb(doc, url);
	newItem.libraryCatalog = "Library Catalog - " + doc.location.host;
	// 	We need to correct some informations where COinS is wrong
	var rowXpath = '//tr[td[@class="rec_lable"]]';
	var tableRows = doc.evaluate(rowXpath, doc, null, XPathResult.ANY_TYPE, null);
	var tableRow;
	var role = "author";
	while (tableRow = tableRows.iterateNext()) {
		var field = doc.evaluate('./td[@class="rec_lable"]', tableRow, null, XPathResult.ANY_TYPE, null).iterateNext().textContent;
		var value = doc.evaluate('./td[@class="rec_title"]', tableRow, null, XPathResult.ANY_TYPE, null).iterateNext().textContent;
		field = ZU.trimInternal(ZU.superCleanString(field.trim()))
			.toLowerCase().replace(/\(s\)/g, '');

		//Z.debug(field + ": " + value)
		//french, english, german, and dutch interface
		switch (field) {
			case 'auteur':
			case 'author':
			case 'medewerker':
			case 'verfasser':
			case 'other persons':
			case 'sonst. personen':
				if (field == 'other persons' || field == 'sonst. personen' || field == 'medewerker') role = "editor";
				// With COins, we only get one author - so we start afresh.
				newItem.creators = new Array();
				//sudoc has authors on separate lines and with different format - use this
				if (url.search(/sudoc\.(abes\.)?fr/) != -1) {

					var authors = ZU.xpath(tableRow, './td[2]/div');
					for (var i in authors) {
						var authorText = authors[i].textContent;
						var authorFields = authorText.match(/^\s*(.+?)\s*(?:\((.+?)\)\s*)?\.\s*([^\.]+)\s*$/);
						var authorFunction = '';
						if (authorFields) {
							authorFunction = authorFields[3];
							authorText = authorFields[1];
							var extra = authorFields[2];
						}
						if (authorFunction) {
							authorFunction = Zotero.Utilities.superCleanString(authorFunction);
						}
						var zoteroFunction = '';
						// TODO : Add other author types
						if (authorFunction == 'Traduction') {
							zoteroFunction = 'translator';
						} else if ((authorFunction.substr(0, 7) == 'Éditeur')) {
							zoteroFunction = 'editor';
						} else if ((newItem.itemType == "thesis") && (authorFunction != 'Auteur')) {
							zoteroFunction = "contributor";
						} else {
							zoteroFunction = 'author';
						}

						if (authorFunction == "Université de soutenance" || authorFunction == "Organisme de soutenance") {
							// If the author function is "université de soutenance"	it means that this author has to be in "university" field
							newItem.university = authorText;
							newItem.city = extra; //store for later
						} else {

							var author = authorText.replace(/[\*\(].+[\)\*]/, "");
							newItem.creators.push(Zotero.Utilities.cleanAuthor(author, zoteroFunction, true));
						}
					}

				} else {
					//all non SUDOC catalogs separate authors by semicolon
					var authors = value.split(/\s*;\s*/);
					for (var i in authors) {
						var author = authors[i].replace(/[\*\(].+[\)\*]/, "");
						var comma = author.indexOf(",") != -1;
						newItem.creators.push(Zotero.Utilities.cleanAuthor(author, role, comma));
					}
				}
				break;

			case 'dans':
			case 'in':
				var m = value.split(/\s*;\s*/);
				newItem.publicationTitle = ZU.superCleanString(m[0].split(/[,\-]/)[0]);
				var n = m[0].match(/\bissn\s+(\d+\s*-\s*\d+)/i);
				if (!newItem.ISSN && n) newItem.ISSN = n[1];
				var volume;
				if (volume = value.match(/\b(v(?:ol)?|bd)\.?\s+(\d+)/i)) {
					newItem.volume = volume[2];
				}
				var issue;
				//not working yet - finetune at some point, but it's tricky.
				if (issue = value.match(/\bno?\.?\s+(\d+(?:\s*-\s*\d+)?)/i)) {
					newItem.issue = issue[1];
				}
				var page;
				if (page = value.match(/\b(p|s)\.?\s+(\d+(?:\s*-\s*\d+))/i)) {
					newItem.page = page[2];
				}
				break;
			case 'serie':
			case 'collection':
			case 'schriftenreihe':
			case 'reeks':
				// The serie isn't in COinS
				newItem.series = value;
				break;

			case 'titre':
			case 'title':
			case 'titel':
			case 'title of article':
			case 'aufsatztitel':
				if (!newItem.title) {
					title = value.split(" / ");
					if (title[1]) {
						//store this to convert authors to editors. 
						//Run separate if in case we'll do this for more languages
						//this assumes title precedes author - need to make sure that's the case
						if (title[1].match(/^\s*(ed. by|edited by)/)) role = "editor";
					}
					newItem.title = title[0];
				}
				newItem.title = newItem.title.replace(/\s+:/, ":").replace(/\s*\[[^\]]+\]/g, "");
				break;

			case 'year':
			case 'jahr':
			case 'jaar':
				newItem.date = value;
				break;

			case 'language':
			case 'langue':
			case 'sprache':
				// Language not defined in COinS
				newItem.language = value;
				break;

			case 'editeur':
			case 'published':
			case 'publisher':
			case 'ort/jahr':
			case 'uitgever':
				//ignore publisher for thesis, so that it does not overwrite university
				if (newItem.itemType == 'thesis' && newItem.university) break;
				var m = value.match(/(.*):([^,]*)(,.+)?/);
				if (m) {
					if (!newItem.city) {
						//keep the square brackets if they're the only location (i.e. at the beginning of the line)
						newItem.city = m[1].replace(/(.)[\[,].+/, "$1");
					}
					if (!(newItem.publisher)) {
						newItem.publisher = Zotero.Utilities.trimInternal(m[2]);
					}
					if (m[3] && !newItem.date) newItem.date = m[3].replace(/,\s*/, "");
				}
				break;

			case 'pays':
			case 'country':
			case 'land':
				if (!newItem.country) {
					newItem.country = value;
				}
				break;

			case 'description':
			case 'extent':
			case 'umfang':
			case 'omvang':
				// We're going to extract the number of pages from this field
				// Known bug doesn't work when there are 2 volumes, 
				var m = value.match(/(\d+) vol\./);
				if (m) {
					newItem.numberOfVolumes = m[1];
				}
				m = value.match(/(\d+)\s+[fpS]/);
				if (m) {
					newItem.numPages = m[1];
				}
				break;

			case 'résumé':
			case 'abstract':
			case 'inhalt':
			case 'samenvatting':
				newItem.abstractNote = value;
				break;

			case 'notes':
			case 'note':
			case 'anmerkung':
			case 'snnotatie':
				newItem.notes.push({
					note: value
				});
				break;

			case 'sujets':
			case 'subjects':
			case 'subject heading':
			case 'trefwoord':
			case 'schlagwörter':

				var subjects = doc.evaluate('./td[2]/div', tableRow, null, XPathResult.ANY_TYPE, null);
				//subjects on separate div lines
				if (ZU.xpath(tableRow, './td[2]/div').length > 1) {
					var subject_out = "";
					while (subject = subjects.iterateNext()) {
						var subject_content = subject.textContent;
						subject_content = subject_content.replace(/^\s*/, "");
						subject_content = subject_content.replace(/\s*$/, "");
						subject_content = subject_content.split(/\s*;\s*/)
						for (var i in subject_content) {
							if (subject_content != "") {
								newItem.tags.push(Zotero.Utilities.trimInternal(subject_content[i]));
							}
						}
					}
				} else {
					//subjects separated by newline or ; in same div.
					var subjects = value.trim().split(/\s*[;\n]\s*/)
					for (var i in subjects) {
						newItem.tags.push(Zotero.Utilities.trimInternal(subjects[i].replace(/\*/g, "")))
					}
				}
				break;

			case 'thèse':
			case 'dissertation':
				newItem.type = value.split(/ ?:/)[0];
				break;

			case "identifiant pérenne de la notice":
			case 'persistent identifier of the record':
			case 'persistent identifier des datensatzes':
				//only SUDOC has permalink
				var permalink = value;
				if (permalink) {
					newItem.attachments.push({
						url: permalink,
						title: 'SUDOC Snapshot',
						mimeType: 'text/html'
					});
				}
				break;

			case 'isbn':
				var isbns = value.trim().split(/[\n,]/);
				var isbn = [];
				for (var i in isbns) {
					isbn.push(ZU.cleanISBN(isbns[i].match(/[\d\-X]+/)[0]));
				}
				//we should eventually check for duplicates, but right now this seems fine;
				newItem.ISBN = isbn.join(", ");
				break;

			case 'worldcat':
				//SUDOC only
				var worldcatLink = doc.evaluate('./td[2]//a', tableRow, null, XPathResult.ANY_TYPE, null).iterateNext();
				if (worldcatLink) {
					newItem.attachments.push({
						url: worldcatLink.href,
						title: 'Worldcat Link',
						mimeType: 'text/html'
					});
				}
				break;
		}
	}

	//merge city & country where they're separate
	var location = [];
	if (newItem.city) location.push(newItem.city.trim());
	newItem.city = undefined;
	if (newItem.country) location.push(newItem.country.trim());
	newItem.country = undefined;
	newItem.place = location.join(', ');

	newItem.complete();
}

function doWeb(doc, url) {
	var type = detectWeb(doc, url);
	if (type == "multiple") {
		var newUrl = doc.evaluate('//base/@href', doc, null, XPathResult.ANY_TYPE, null).iterateNext().nodeValue;
		var xpath = "//table[@summary='short title presentation']/tbody/tr//td[contains(@class, 'rec_title')]";
		var elmts = doc.evaluate(xpath, doc, null, XPathResult.ANY_TYPE, null);
		var elmt = elmts.iterateNext();
		var links = new Array();
		var availableItems = new Array();
		var i = 0;
		do {
			var link = doc.evaluate(".//a/@href", elmt, null, XPathResult.ANY_TYPE, null).iterateNext().nodeValue;
			var searchTitle = doc.evaluate(".//a", elmt, null, XPathResult.ANY_TYPE, null).iterateNext().textContent;
			availableItems[i] = searchTitle;
			links[i] = link;
			i++;
		} while (elmt = elmts.iterateNext());
		Zotero.selectItems(availableItems, function (items) {
			if (!items) {
				return true;
			}
			var uris = new Array();
			for (var i in items) {
				uris.push(newUrl + links[i]);
			}
			ZU.processDocuments(uris, function (doc) {
				scrape(doc, doc.location.href)
			});
		});
	} else if (type != "") {
		scrape(doc, url);
	}
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.sudoc.abes.fr/DB=2.1/CMD?ACT=SRCHA&IKT=1016&SRT=RLV&TRM=labor",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.sudoc.abes.fr/DB=2.1/SRCH?IKT=12&TRM=147745608",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"firstName": "Jacques",
						"lastName": "Delga",
						"creatorType": "editor"
					}
				],
				"notes": [],
				"tags": [
					"Stress lié au travail -- France",
					"Harcèlement -- France",
					"Conditions de travail -- France",
					"Violence en milieu de travail",
					"Psychologie du travail"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "SUDOC Snapshot",
						"mimeType": "text/html"
					},
					{
						"title": "Worldcat Link",
						"mimeType": "text/html"
					}
				],
				"date": "2010",
				"ISBN": "9782747217293",
				"title": "Souffrance au travail dans les grandes entreprises",
				"libraryCatalog": "Library Catalog - www.sudoc.abes.fr",
				"language": "français",
				"publisher": "Eska",
				"numberOfVolumes": "1",
				"numPages": "290",
				"place": "Paris, France"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.sudoc.abes.fr/DB=2.1/SRCH?IKT=12&TRM=156726319",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"firstName": "Jason",
						"lastName": "Puckett",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"Bibliographie -- Méthodologie -- Informatique"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "SUDOC Snapshot",
						"mimeType": "text/html"
					},
					{
						"title": "Worldcat Link",
						"mimeType": "text/html"
					}
				],
				"date": "2011",
				"ISBN": "9780838985892",
				"title": "Zotero: a guide for librarians, researchers and educators",
				"libraryCatalog": "Library Catalog - www.sudoc.abes.fr",
				"language": "anglais",
				"publisher": "Association of College and Research Libraries",
				"numberOfVolumes": "1",
				"numPages": "159",
				"place": "Chicago, Etats-Unis",
				"shortTitle": "Zotero"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.sudoc.abes.fr/DB=2.1/SRCH?IKT=12&TRM=093838956",
		"items": [
			{
				"itemType": "thesis",
				"creators": [
					{
						"firstName": "Brigitte",
						"lastName": "Lambert",
						"creatorType": "author"
					},
					{
						"firstName": "Pierre",
						"lastName": "Morel",
						"creatorType": "contributor"
					}
				],
				"notes": [
					{
						"note": "Publication autorisée par le jury"
					}
				],
				"tags": [
					"Leucémie lymphoïde chronique -- Thèses et écrits académiques",
					"Cellules B -- Thèses et écrits académiques",
					"Lymphome malin non hodgkinien -- Dissertations académiques",
					"Lymphocytes B -- Dissertations académiques",
					"Leucémie chronique lymphocytaire à cellules B -- Dissertations académiques"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "SUDOC Snapshot",
						"mimeType": "text/html"
					},
					{
						"title": "Worldcat Link",
						"mimeType": "text/html"
					}
				],
				"date": "2004",
				"title": "Facteurs pronostiques des lymphomes diffus lymphocytiques",
				"libraryCatalog": "Library Catalog - www.sudoc.abes.fr",
				"university": "Université du droit et de la santé",
				"language": "français",
				"numberOfVolumes": "1",
				"numPages": "87",
				"type": "Thèse d'exercice",
				"place": "Lille, France"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.sudoc.abes.fr/DB=2.1/SRCH?IKT=12&TRM=127261664",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Sirpa",
						"lastName": "Tenhunen",
						"creatorType": "author"
					}
				],
				"notes": [
					{
						"note": "Contient un résumé en anglais et en français. - in Journal of the Royal Anthropological Institute, vol. 14, no. 3 (Septembre 2008)"
					}
				],
				"tags": [
					"Communes rurales -- Et la technique -- Aspect social -- Inde",
					"Téléphonie mobile -- Aspect social -- Inde",
					"Inde -- Conditions sociales -- 20e siècle"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "SUDOC Snapshot",
						"mimeType": "text/html"
					}
				],
				"date": "2008",
				"pages": "p. [515]-534",
				"issue": "3",
				"volume": "14",
				"libraryCatalog": "Library Catalog - www.sudoc.abes.fr",
				"title": "Mobile technology in the village: ICTs, culture, and social logistics in India",
				"language": "anglais",
				"publisher": "Royal Anthropological Institute",
				"publicationTitle": "Journal of the Royal Anthropological Institute",
				"ISSN": "1359-0987",
				"place": "London, Royaume-Uni",
				"shortTitle": "Mobile technology in the village"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.sudoc.abes.fr/DB=2.1/SRCH?IKT=12&TRM=128661828",
		"items": [
			{
				"itemType": "film",
				"creators": [
					{
						"firstName": "Véronique",
						"lastName": "Kleiner",
						"creatorType": "author"
					},
					{
						"firstName": "Christian",
						"lastName": "Sardet",
						"creatorType": "author"
					}
				],
				"notes": [
					{
						"note": "Les différents films qui composent ce DVD sont réalisés avec des prises de vue réelles, ou des images microcinématographiques ou des images de synthèse, ou des images fixes tirées de livres. La bande son est essentiellement constituée de commentaires en voix off et d'interviews (les commentaires sont en anglais et les interviews sont en langue originales : anglais, français ou allemand, sous-titrée en anglais). - Discovering the cell : participation de Paul Nurse (Rockefeller university, New York), Claude Debru (ENS : Ecole normale supérieure, Paris) et Werner Franke (DKFZ : Deutsches Krebsforschungszentrum, Heidelberg) ; Membrane : participation de Kai Simons, Soizig Le Lay et Lucas Pelkmans (MPI-CBG : Max Planck institute of molecular cell biology and genetics, Dresden) ; Signals and calcium : participation de Christian Sardet et Alex Mc Dougall (CNRS / UPMC : Centre national de la recherche scientifique / Université Pierre et Marie Curie, Villefrance-sur-Mer) ; Membrane traffic : participation de Thierry Galli et Phillips Alberts (Inserm = Institut national de la santé et de la recherche médicale, Paris) ; Mitochondria : participation de Michael Duchen, Rémi Dumollard et Sean Davidson (UCL : University college of London) ; Microfilaments : participation de Cécile Gauthier Rouvière et Alexandre Philips (CNRS-CRBM : CNRS-Centre de recherche de biochimie macromoléculaire, Montpellier) ; Microtubules : participation de Johanna Höög, Philip Bastiaens et Jonne Helenius (EMBL : European molecular biology laboratory, Heidelberg) ; Centrosome : participation de Michel Bornens et Manuel Théry (CNRS-Institut Curie, Paris) ; Proteins : participation de Dino Moras et Natacha Rochel-Guiberteau (IGBMC : Institut de génétique et biologie moléculaire et cellulaire, Strasbourg) ; Nocleolus and nucleus : participation de Daniele Hernandez-Verdun, Pascal Rousset, Tanguy Lechertier (CNRS-UPMC / IJM : Institut Jacques Monod, Paris) ; The cell cycle : participation de Paul Nurse (Rockefeller university, New York) ; Mitosis and chromosomes : participation de Jan Ellenberg, Felipe Mora-Bermudez et Daniel Gerlich (EMBL, Heidelberg) ; Mitosis and spindle : participation de Eric Karsenti, Maiwen Caudron et François Nedelec (EMBL, Heidelberg) ; Cleavage : participation de Pierre Gönczy, Marie Delattre et Tu Nguyen Ngoc (Isrec : Institut suisse de recherche expérimentale sur le cancer, Lausanne) ; Cellules souches : participation de Göran Hermerén (EGE : European group on ethics in science and new technologies, Brussels) ; Cellules libres : participation de Jean-Jacques Kupiec (ENS, Paris) ; Cellules et évolution : participation de Paule Nurse (Rockefeller university, New York)"
					}
				],
				"tags": [
					"Cellules",
					"Cellules -- Évolution",
					"Membrane cellulaire",
					"Cellules -- Aspect moral",
					"Cytologie -- Recherche",
					"Biologie cellulaire",
					"Biogenèse",
					"Ultrastructure (biologie)",
					"Cells",
					"Cells -- Evolution",
					"Cell membranes",
					"Cells -- Moral and ethical aspects",
					"Cytology -- Research",
					"QH582.4"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "SUDOC Snapshot",
						"mimeType": "text/html"
					},
					{
						"title": "Worldcat Link",
						"mimeType": "text/html"
					}
				],
				"date": "2006",
				"ISBN": "0815342233",
				"title": "Exploring the living cell",
				"libraryCatalog": "Library Catalog - www.sudoc.abes.fr",
				"language": "anglais",
				"publisher": "Garland Science [distrib.]",
				"abstractNote": "Ensemble de 20 films permettant de découvrir les protagonistes de la découverte de la théorie cellulaire, l'évolution, la diversité, la structure et le fonctionnement des cellules. Ce DVD aborde aussi en images les recherches en cours dans des laboratoires internationaux et les débats que ces découvertes sur la cellule provoquent. Les films sont regroupés en 5 chapitres complétés de fiches informatives et de liens Internet.",
				"place": "[Meudon] : CNRS Images, France"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.sudoc.abes.fr/DB=2.1/SRCH?IKT=12&TRM=098846663",
		"items": [
			{
				"itemType": "map",
				"creators": [],
				"notes": [],
				"tags": [
					"Météorologie maritime -- Méditerranée (mer) -- Atlas",
					"Vents -- Méditerranée (mer) -- Atlas",
					"Vent de mer -- Méditerranée (mer) -- Atlas",
					"Vagues -- Méditerranée (mer) -- Atlas",
					"Méditerranée (mer) -- Atlas"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "SUDOC Snapshot",
						"mimeType": "text/html"
					},
					{
						"title": "Worldcat Link",
						"mimeType": "text/html"
					}
				],
				"date": "2004",
				"ISBN": "2110956747",
				"title": "Wind and wave atlas of the Mediterranean sea",
				"libraryCatalog": "Library Catalog - www.sudoc.abes.fr",
				"language": "anglais",
				"publisher": "Western European Union",
				"place": "[S.l.]"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.sudoc.abes.fr/DB=2.1/SRCH?IKT=12&TRM=05625248X",
		"items": [
			{
				"itemType": "audioRecording",
				"creators": [
					{
						"firstName": "Ernest H.",
						"lastName": "Sanders",
						"creatorType": "author"
					},
					{
						"firstName": "Frank Llewellyn",
						"lastName": "Harrison",
						"creatorType": "author"
					},
					{
						"firstName": "Peter",
						"lastName": "Lefferts",
						"creatorType": "author"
					}
				],
				"notes": [
					{
						"note": "Modern notation. - \"Critical apparatus\": p. 174-243"
					}
				],
				"tags": [
					"Messes (musique) -- Partitions",
					"Motets -- Partitions"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "SUDOC Snapshot",
						"mimeType": "text/html"
					},
					{
						"title": "Worldcat Link",
						"mimeType": "text/html"
					}
				],
				"date": "1986",
				"title": "English music for mass and offices (II) and music for other ceremonies",
				"libraryCatalog": "Library Catalog - www.sudoc.abes.fr",
				"language": "latin",
				"publisher": "Éditions de l'oiseau-lyre",
				"numPages": "1",
				"series": "Polyphonic music of the fourteenth century ; v. 17",
				"place": "Monoco, Monaco"
			}
		]
	}
]
/** END TEST CASES **/
