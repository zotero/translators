{
	"translatorID": "1b9ed730-69c7-40b0-8a06-517a89a3a278",
	"label": "Sudoc",
	"creator": "Sean Takats, Michael Berkowitz, Sylvain Machefert",
	"target": "^http://(www|corail)\\.sudoc\\.abes\\.fr",
	"minVersion": "1.0.0b3.r1",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "g",
	"lastUpdated": "2011-11-15 17:51:40"
}

function detectWeb(doc, url) {
		var namespace = doc.documentElement.namespaceURI;
		var nsResolver = namespace ? function(prefix) {
				if (prefix == 'x') return namespace; else return null;
		} : null;

		var multxpath = "//span[@class='tab1']";
		if (elt = doc.evaluate(multxpath, doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext()) {
				var content = elt.textContent;
				if ( (content == "Liste des résultats") || (content == "shortlist") )
				{
					return "multiple";	
				}
				else if ( (content == "Notice détaillée") || (content == "title data") )
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
						else if (type.indexOf('sons.') > 0)
						{
							return "audioRecording";
						}
						else if (type.indexOf('sound.') > 0)
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
		var eltCoins = doc.evaluate(zXpath, doc, nsResolver, XPathResult.ANY_TYPE, null);
		if (eltCoins = doc.evaluate(zXpath, doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext())
		{
			var coins = eltCoins.getAttribute('title');

			var newItem = new Zotero.Item();
			newItem.repository = "SUDOC";	// do not save repository
			if(Zotero.Utilities.parseContextObject(coins, newItem)) 
			{
				var permalink = "";
				if (newItem.title) 
				{
					newItem.itemType = detectWeb(doc, url);

					// 	We need to correct some informations where COinS is wrong
					var rowXpath = '//tr[td[@class="rec_lable"]]';
					var tableRows = doc.evaluate(rowXpath, doc, nsResolver, XPathResult.ANY_TYPE, null);
					var tableRow;
					
					while (tableRow = tableRows.iterateNext())
					{
						var field = doc.evaluate('./td[1]', tableRow, nsResolver, XPathResult.ANY_TYPE, null).iterateNext().textContent;
						var value = doc.evaluate('./td[2]', tableRow, nsResolver, XPathResult.ANY_TYPE, null).iterateNext().textContent;
						field = Zotero.Utilities.superCleanString(field);
						field = field.replace(/(\(s\))?\s*:\s*$/, "");

						// With COins, only one author is taken, changed.
						if (field.substr(0,6) == "Auteur" || field.substr(0,6) == "Author")
						{
							var authors = doc.evaluate('./td[2]/div', tableRow, nsResolver, XPathResult.ANY_TYPE, null);
							newItem.creators = new Array();
							while (author = authors.iterateNext())
							{
								var authorText = author.textContent;
								
								authorFunction = authorText.split(". ")[1];
								authorText = authorText.split(". ")[0];
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
								else if ( (newItem.itemType == "thesis") && (authorFunction != 'Auteur') )
								{
									zoteroFunction = "contributor";
								}
								else
								{
									zoteroFunction = 'author';
								}
								
								// We need to remove the author dates from reference
								authorText = authorText.replace(/ \(.{4}\-.{4}\)$/, "")
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
						}
						// The serie isn't in COinS
						else 	if (field.substr(0,5) == "Serie" || field.substr(0,10) == "Collection")
						{
							newItem.series = value;	
						}
						// When there's a subtitle, only main title is used !
						else if (field == "Titre" || field == "Title")
						{
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
						}
						// Language not defined in COinS
						else if ( (field == "Langue") || (field == "Language") )
						{
							newItem.language = value;
						}
						else if ( (field == "Editeur") || (field == "Publisher") )
						{
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
							// We don't manage the date field, set in COinS (m[3])
						}
						else if (field == "Description")
						{
							// We're going to extract the number of pages from this field
							// Known bug doesn't work when there are 2 volumes, 
							var m = value.match(/(\d*) vol\. \((.*)\)? ?[pf]\./);
							if (m)
							{
								newItem.numberOfVolumes = m[1];
								newItem.numPages = m[2];
								// Cleaning some remaining characters (should be made above I think but didn't debug it enough)
								newItem.numPages = newItem.numPages.replace(/[\s\)]$/, "");
							}
						}
						else if ( (field == "Résumé") || (field == "Abstract") )
						{
							if (newItem.abstractNote)
							{
								newItem.abstractNote = newItem.abstractNote + " " + value;
							}
							else
							{
								newItem.abstractNote = value;
							}

						}
						else if (field == "Notes")
						{
							if (newItem.abstractNote)
							{
								newItem.abstractNote = newItem.abstractNote + " " + value;
							}
							else
							{
								newItem.abstractNote = value;
							}
						}
						else if ( (field == "Sujets"  ) || (field == "Subjects") )
						{
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
						}
						else if ( (field == "Thèse") || (field == "Dissertation") )
						{
							var thesisType = value.split(/ ?:/)[0];
							newItem.type = thesisType;
						}
						else if ( (field == "Identifiant\u00A0pérenne de\u00A0la\u00A0notice") || (field == "Persistent identifier of the record") )
						{
							newItem.attachments = [{url:value, title:"Notice sudoc", mimeType:"text/html", snapshot:false}];
						}
						else
						{
							Zotero.debug("==> " + field);
						}
					}
					
					newItem.complete();
				}
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
			var items = Zotero.selectItems(availableItems);
			if(!items) {
				return true;
			}
			var uris = new Array();
			for(var i in items) {
					uris.push(newUrl + links[i]);
			}
			Zotero.Utilities.processDocuments(uris, function(doc) { scrape(doc) },
					function() { Zotero.done(); }, null);
			Zotero.wait();		
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
		"url": "http://www.sudoc.fr/000942073",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"lastName": "Bureau international du travail",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"Femmes -- Travail",
					"Conditions de travail",
					"Formation professionnelle",
					"Normes de travail",
					"Relations industrielles",
					"Emploi",
					"Droit social",
					"Marché du travail"
				],
				"seeAlso": [],
				"attachments": [
					{
						"url": "http://www.sudoc.fr/000942073",
						"title": "Notice sudoc",
						"mimeType": "text/html",
						"snapshot": false
					}
				],
				"date": "1985",
				"ISBN": "92-2-203848-7",
				"title": "Le Travail dans le monde : 2, relations professionnelles, normes internationales du travail, formation, conditions de travail, travailleuses",
				"language": "français",
				"abstractNote": "Annexes. - 9789222038480",
				"libraryCatalog": "SUDOC",
				"shortTitle": "Le Travail dans le monde"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.sudoc.fr/147745608",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"firstName": "Jacques",
						"lastName": "Delga",
						"creatorType": "author"
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
						"url": "http://www.sudoc.fr/147745608",
						"title": "Notice sudoc",
						"mimeType": "text/html",
						"snapshot": false
					}
				],
				"date": "2010",
				"ISBN": "978-2-7472-1729-3",
				"title": "Souffrance au travail dans les grandes entreprises",
				"language": "français",
				"libraryCatalog": "SUDOC"
			}
		]
	}
]
/** END TEST CASES **/