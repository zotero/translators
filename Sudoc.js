{
	"translatorID": "1b9ed730-69c7-40b0-8a06-517a89a3a278",
	"label": "Sudoc",
	"creator": "Sean Takats, Michael Berkowitz, Sylvain Machefert",
	"target": "^http://(www|corail)\\.sudoc\\.abes\\.fr",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcs",
	"lastUpdated": "2012-03-07 23:16:08"
}

function detectWeb(doc, url) {
		var namespace = doc.documentElement.namespaceURI;
		var nsResolver = namespace ? function(prefix) {
				if (prefix == 'x') return namespace; else return null;
		} : null;

		var multxpath = "//span[@class='tab1']";
		if (elt = doc.evaluate(multxpath, doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext()) {
				var content = elt.textContent;
				if ( (content == "Liste des résultats") ||
					(content == "shortlist") ||
					(content == 'Kurzliste') )
				{
					return "multiple";	
				}
				else if ( (content == "Notice détaillée") ||
							(content == "title data") ||
							(content == 'Titeldaten') )
				{
					var xpathimage = "//span[@class='rec_mat_long']/img";
					if (elt = doc.evaluate(xpathimage, doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext())
					{
						var type = elt.getAttribute('src');
						if (type.indexOf('article.') > 0)
						{
							return "journalArticle";
						}
						else if (type.indexOf('audiovisual.') > 0)
						{
							return "film";
						}
						else if (type.indexOf('book.') > 0)
						{
							return "book";
						}
						else if (type.indexOf('handwriting.') > 0)
						{
							return "manuscript";
						}
						else if (type.indexOf('sons.') > 0 ||
								type.indexOf('sound.') > 0 ||
								type.indexOf('score') > 0 )
						{
							return "audioRecording";
						}
						else if (type.indexOf('thesis.') > 0)
						{
							return "thesis";
						}
						else if (type.indexOf('map.') > 0)
						{
							return "map";
						}
					}
					return "book";
				}
		}
}

function scrape(doc, url) {
		var namespace = doc.documentElement.namespaceURI;
		var nsResolver = namespace ? function(prefix) {
				if (prefix == 'x') return namespace; else return null;
		} : null;

		var zXpath = '//span[@class="Z3988"]';
		var eltCoins = doc.evaluate(zXpath, doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext();
		if (eltCoins)
		{
			var coins = eltCoins.getAttribute('title');

			var newItem = new Zotero.Item();
			newItem.repository = "SUDOC";	// do not save repository
			if(Zotero.Utilities.parseContextObject(coins, newItem)) 
			{
				var permalink = "";

				newItem.itemType = detectWeb(doc, url);

				// 	We need to correct some informations where COinS is wrong
				var rowXpath = '//tr[td[@class="rec_lable"]]';
				var tableRows = doc.evaluate(rowXpath, doc, nsResolver, XPathResult.ANY_TYPE, null);
				var tableRow;
				
				while (tableRow = tableRows.iterateNext())
				{
					var field = doc.evaluate('./td[1]', tableRow, nsResolver, XPathResult.ANY_TYPE, null).iterateNext().textContent;
					var value = doc.evaluate('./td[2]', tableRow, nsResolver, XPathResult.ANY_TYPE, null).iterateNext().textContent;
					field = ZU.trimInternal( ZU.superCleanString(field.trim()) )
								.toLowerCase().replace(/\(s\)/g,'');

					//french, english, and german interface
					switch(field) {
						case 'auteur':
						case 'author':	//en = de
							// With COins, only one author is taken, changed.
							var authors = doc.evaluate('./td[2]/div', tableRow, nsResolver, XPathResult.ANY_TYPE, null);
							newItem.creators = new Array();
							while (author = authors.iterateNext())
							{
								var authorText = author.textContent;
								
								var authorFields = authorText.match(/^\s*(.+?)\s*(?:\(.+?\)\s*)?\.\s*([^\.]+)\s*$/);
								var authorFunction = '';
								if(authorFields) {
									authorFunction = authorFields[2];
									authorText = authorFields[1];
								}
								if (authorFunction)
								{
									authorFunction = Zotero.Utilities.superCleanString(authorFunction);
								}

								var zoteroFunction = '';
								
								// TODO : Add other authotiry types
								if (authorFunction == 'Traduction')
								{
									zoteroFunction = 'translator';
								}
								else if ( (authorFunction.substr(0,7) == 'Éditeur') )
								{
									zoteroFunction = 'editor';
								}
								else if ( (newItem.itemType == "thesis") && (authorFunction != 'Auteur') )
								{
									zoteroFunction = "contributor";
								}
								else
								{
									zoteroFunction = 'author';
								}

								if (authorFunction == "Université de soutenance")
								{
									// If the author function is "université de soutenance"	it means that this author has to be in "university" field
									newItem.university = authorText;
								}
								else
								{
									newItem.creators.push(Zotero.Utilities.cleanAuthor(authorText, zoteroFunction, true));
								}
							}
							break;

						case 'dans':
						case 'in':
							var m = value.split(/\s*;\s*/);
							newItem.publicationTitle = ZU.superCleanString( m[0].split(/,/)[0] );
							var n = m[0].match(/\bissn\s+(\d+\s*-\s*\d+)/i);
							if(!newItem.ISSN && n) newItem.ISSN = n[1];

							if(m[1]) {
								//this varies a lot
								//year (can be in parentheses or not)
								//try not to match 4 digit page numbers
								//not preceeded by a p or hyphen and not followed by hyphen
								n = m[1].match(/[^-p]\.?\s+(\d{4})\b\s*[^-]/i);
								if(!newItem.date && n) newItem.date = n[1];

								//volume
								n = m[1].match(/\bv(?:ol)?\.?\s+(\d+)/i);
								if(!newItem.volume && n) newItem.volume = n[1];

								//issue
								n = m[1].match(/\bno?\.?\s+(\d+(?:\s*-\s*\d+)?)/i);
								if(!newItem.issue && n) newItem.issue = n[1];

								//pages
								n = m[1].match(/\bp\.?\s+(\d+(?:\s*-\s*\d+))/i);
								if(!newItem.pages && n) newItem.pages = n[1].replace(/\s+/g,'');
							}
							break;
						case 'serie':	//en = de
						case 'collection':
							// The serie isn't in COinS
							newItem.series = value;	
							break;

						case 'titre':
						case 'title':	//en = de
							// When there's a subtitle, only main title is used !
							var title = '';
							var titles = doc.evaluate('./td[2]/div/span', tableRow, nsResolver, XPathResult.ANY_TYPE, null);
							while (partTitle = titles.iterateNext())
							{
								partTitle = partTitle.textContent;
								partTitle = partTitle.replace(/(\[[^\]]+\] ?)/g,"");
								title = title + partTitle;
							}
							// Remove the author
							title = title.split(" / ")[0];
							newItem.title = title;
							break;

						case 'language':	//en = de
						case 'langue':
							// Language not defined in COinS
							newItem.language = value;
							break;
						case 'editeur':
						case 'publisher':	//en = de
							var m = value.match(/(.*):(.*),(.*)/);

							if (m)
							{
								if (!(newItem.place))
								{
									newItem.place = Zotero.Utilities.trimInternal(m[1]);
								}
								if (!(newItem.publisher))
								{
									newItem.publisher = Zotero.Utilities.trimInternal(m[2]);
								}
							}
							break;

						case 'description':
							// We're going to extract the number of pages from this field
							// Known bug doesn't work when there are 2 volumes, 
							var m = value.match(/(\d+) vol\./);
							if (m)
							{
								newItem.numberOfVolumes = m[1];
							}

							m = value.match(/(\d+)\s+[fp]\W/);
							if(m) {
								newItem.numPages = m[1];
							}
							break;

						case 'résumé':
						case 'abstract':
							newItem.abstractNote = value;
							break;

						case 'notes':	//fr = en = de
							newItem.notes.push({note: value});
							break;

						case 'sujets':
						case 'subjects':	//en = de
							var subjects = doc.evaluate('./td[2]/div', tableRow, nsResolver, XPathResult.ANY_TYPE, null);
							var subject_out = "";
							
							while (subject = subjects.iterateNext())
							{
								var subject_content = subject.textContent;
								subject_content = subject_content.replace(/^\s*/, "");
								subject_content = subject_content.replace(/\s*$/, "");
								if (subject_content != "")
								{
									newItem.tags.push(Zotero.Utilities.trimInternal(subject_content));
								}
							}
							break;

						case 'thèse':
						case 'dissertation':	//en = de
							newItem.type = value.split(/ ?:/)[0];
							break;

						case "identifiant\u00A0pérenne de\u00A0la\u00A0notice":
						case 'persistent identifier of the record':
						case 'persistent identifier des datensatzes':
							newItem.url = value;
							break;

						case 'worldcat':
							var worldcatLink = doc.evaluate('./td[2]//a', tableRow, nsResolver, XPathResult.ANY_TYPE, null).iterateNext();
							if(worldcatLink) {
								newItem.attachments.push( { url: worldcatLink.href, title: 'Worldcat Link', mimeType: 'text/html' } );
							}
							break;
					}
				}

				newItem.attachments.push({document: doc, title: 'SUDOC Snapshot'});
				newItem.complete();
			}
		}
}

function doWeb(doc, url) {
		var namespace = doc.documentElement.namespaceURI;
		var nsResolver = namespace ? function(prefix) {
				if (prefix == 'x') return namespace; else return null;
		} : null;
		
		var type = detectWeb(doc, url);
		if (type == "multiple")
		{
			// On va lister les titres
			var newUrl = doc.evaluate('//base/@href', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext().nodeValue;
			var xpath = "//table[@summary='short title presentation']/tbody/tr//td[@class='rec_title']";
			var elmts = doc.evaluate(xpath, doc, nsResolver, XPathResult.ANY_TYPE, null);
			var elmt = elmts.iterateNext();
			var links = new Array();
			var availableItems = new Array();
			
			var i = 0;
			do
			{
				var link = doc.evaluate(".//a/@href", elmt, nsResolver, XPathResult.ANY_TYPE, null).iterateNext().nodeValue;
				var searchTitle  = doc.evaluate(".//a", elmt, nsResolver, XPathResult.ANY_TYPE, null).iterateNext().textContent;
				
				availableItems[i] = searchTitle ;
				links[i] = link;
				i++;
			} while (elmt = elmts.iterateNext());
			Zotero.selectItems(availableItems, function(items) {
				if(!items) {
					return true;
				}
				var uris = new Array();
				for(var i in items) {
						uris.push(newUrl + links[i]);
				}
				ZU.processDocuments(uris, function(doc) { scrape(doc, doc.location.href) });
			});
		}
		else if (type != "")
		{
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
						"title": "Worldcat Link",
						"mimeType": "text/html"
					},
					{
						"title": "SUDOC Snapshot"
					}
				],
				"date": "2010",
				"ISBN": "978-2-7472-1729-3",
				"title": "Souffrance au travail dans les grandes entreprises",
				"url": "http://www.sudoc.fr/147745608",
				"language": "français",
				"place": "Paris",
				"publisher": "Eska",
				"numberOfVolumes": "1",
				"numPages": "290",
				"libraryCatalog": "SUDOC",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.sudoc.fr/156726319",
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
						"title": "SUDOC Snapshot"
					}
				],
				"date": "2011",
				"ISBN": "978-0-83898589-2",
				"title": "Zotero : a guide for librarians, researchers and educators",
				"url": "http://www.sudoc.fr/156726319",
				"language": "anglais",
				"place": "Chicago",
				"publisher": "Association of College and Research Libraries",
				"numberOfVolumes": "1",
				"numPages": "159",
				"libraryCatalog": "SUDOC",
				"accessDate": "CURRENT_TIMESTAMP",
				"shortTitle": "Zotero"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.sudoc.fr/093838956",
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
						"title": "Worldcat Link",
						"mimeType": "text/html"
					},
					{
						"title": "SUDOC Snapshot"
					}
				],
				"date": "2004",
				"title": "Facteurs pronostiques des lymphomes diffus lymphocytiques",
				"url": "http://www.sudoc.fr/093838956",
				"university": "Université du droit et de la santé",
				"language": "français",
				"place": "[S.l.]",
				"publisher": "[s.n.]",
				"numberOfVolumes": "1",
				"numPages": "87",
				"type": "Thèse d'exercice",
				"libraryCatalog": "SUDOC",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.sudoc.fr/127261664",
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
						"title": "SUDOC Snapshot"
					}
				],
				"date": "2008",
				"pages": "p. [515]-534",
				"issue": "3",
				"volume": "14",
				"url": "http://www.sudoc.fr/127261664",
				"title": "Mobile technology in the village : ICTs, culture, and social logistics in India",
				"language": "anglais",
				"place": "London",
				"publisher": "Royal Anthropological Institute",
				"publicationTitle": "Journal of the Royal Anthropological Institute",
				"ISSN": "1359-0987",
				"libraryCatalog": "SUDOC",
				"accessDate": "CURRENT_TIMESTAMP",
				"shortTitle": "Mobile technology in the village"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.sudoc.fr/128661828",
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
						"title": "Worldcat Link",
						"mimeType": "text/html"
					},
					{
						"title": "SUDOC Snapshot"
					}
				],
				"date": "2006",
				"ISBN": "0-8153-4223-3",
				"title": "Exploring the living cell",
				"url": "http://www.sudoc.fr/128661828",
				"language": "anglais",
				"place": "[Meudon] : CNRS Images [prod., éd.] ; New York",
				"publisher": "Garland Science [distrib.]",
				"abstractNote": "Ensemble de 20 films permettant de découvrir les protagonistes de la découverte de la théorie cellulaire, l'évolution, la diversité, la structure et le fonctionnement des cellules. Ce DVD aborde aussi en images les recherches en cours dans des laboratoires internationaux et les débats que ces découvertes sur la cellule provoquent. Les films sont regroupés en 5 chapitres complétés de fiches informatives et de liens Internet.",
				"libraryCatalog": "SUDOC",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.sudoc.fr/098846663",
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
						"title": "Worldcat Link",
						"mimeType": "text/html"
					},
					{
						"title": "SUDOC Snapshot"
					}
				],
				"date": "2004",
				"ISBN": "2-11-095674-7",
				"title": "Wind and wave atlas of the Mediterranean sea",
				"url": "http://www.sudoc.fr/098846663",
				"language": "anglais",
				"place": "[S.l.]",
				"publisher": "Western European Union, Western European armaments organisation research cell",
				"libraryCatalog": "SUDOC",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.sudoc.fr/05625248X",
		"items": [
			{
				"itemType": "audioRecording",
				"creators": [
					{
						"firstName": "Ernest H",
						"lastName": "Sanders",
						"creatorType": "author"
					},
					{
						"firstName": "Frank Llewellyn (1905-)",
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
						"title": "Worldcat Link",
						"mimeType": "text/html"
					},
					{
						"title": "SUDOC Snapshot"
					}
				],
				"date": "1986",
				"title": "English music for mass and offices (II) and music for other ceremonies",
				"url": "http://www.sudoc.fr/05625248X",
				"language": "latin",
				"place": "Monoco",
				"publisher": "Éditions de l'oiseau-lyre",
				"numPages": "243",
				"series": "Polyphonic music of the fourteenth century ; v. 17",
				"libraryCatalog": "SUDOC",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	}
]
/** END TEST CASES **/