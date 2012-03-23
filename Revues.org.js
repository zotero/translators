{
	"translatorID": "87766765-919e-4d3b-9071-3dd7efe984c8",
	"label": "Revues.org",
	"creator": "Pierre-Alain Mignot",
	"target": "^http://.*\\.revues\\.org",
	"minVersion": "1.0.1b1.r1",
	"maxVersion": "",
	"priority": 1,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gb",
	"lastUpdated": "2011-11-13 23:22:33"
}

function detectWeb(doc, url) {
	// don't do anything on main domain, because there's nothing to fetch there
	if(url.match(/http:\/\/(www\.)?revues\.org/)) return false;

	var types = doc.evaluate('//meta[@name="DC.type"]', doc, null, XPathResult.ANY_TYPE, null);
	var type;
	while(type = types.iterateNext()) {
		type = type.content.toLowerCase();
		if('journalarticle' === type) {
			return 'journalArticle';
		} else if('collection' === type) {
			return 'multiple';
		} else if('booksection' === type) {
			return 'bookSection';
		}
	}

	if (doc.evaluate('//div[@id="inside"]/div[@class="sommaire"]/dl[@class="documents"]/dd[@class="titre"]/a', doc, null, XPathResult.ANY_TYPE, null).iterateNext()
		|| doc.evaluate('//ul[@class="summary"]//div[@class="title"]/a', doc, null, XPathResult.ANY_TYPE, null).iterateNext()) {
		return "multiple";
	} else if (doc.evaluate('//h1[@id="docTitle"]/span[@class="text"]', doc, null, XPathResult.ANY_TYPE, null).iterateNext() || url.match(/document\d+/)) {
		return "journalArticle";
	}

	return false;
}

function doWeb(doc, url) {
	var arts = new Array();
	if (detectWeb(doc, url) == "multiple") {
		var items = new Object();
		if(doc.evaluate('//meta[@name="DC.description.tableOfContents"]', doc, null, XPathResult.ANY_TYPE, null).iterateNext()) {
			var titles = doc.evaluate('//meta[@name="DC.description.tableOfContents"]', doc, null, XPathResult.ANY_TYPE, null).iterateNext().content.split(' -- ');
			var articles = doc.evaluate('//meta[@name="DC.relation.hasPart"]', doc, null, XPathResult.ANY_TYPE, null);
			var article;
			var i = 0;
			while(article = articles.iterateNext()) {
				items[article.content] = titles[i++];
			}
		} else {
			if (doc.evaluate('//ul[@class="summary"]//div[@class="title"]/a', doc, null, XPathResult.ANY_TYPE, null).iterateNext()) {
				var xpath = '//ul[@class="summary"]//div[@class="title"]/a';
			} else if (doc.evaluate('//div[@id="inside"]/div[@class="sommaire"]/dl[@class="documents"]/dd[@class="titre"]/a', doc, null, XPathResult.ANY_TYPE, null).iterateNext()) {
				var xpath = '//div[@id="inside"]/div[@class="sommaire"]/dl[@class="documents"]/dd[@class="titre"]/a';
			} else {
				return false;
			}
			
			var titles = doc.evaluate(xpath, doc, null, XPathResult.ANY_TYPE, null);
			var title;
			while(title = titles.iterateNext()) {
				items[title.href] = title.textContent;
			}
		}

		items = Zotero.selectItems(items);
		for(var i in items) {
			arts.push(i);
		}
	} else {
		arts.push(url);
	}

	if(url.match(/persee\-\d+/)) {
		// the article is on Persée portal, getting it to be translated by COinS
		var translator = Zotero.loadTranslator("web");
		translator.setTranslator("05d07af9-105a-4572-99f6-a8e231c0daef");
		Zotero.Utilities.processDocuments(arts, function(doc) {
			translator.setDocument(doc);
			translator.translate();
		}, function() {Zotero.done();});
	} else {
		Zotero.Utilities.processDocuments(arts, function(doc) {
			var metas = doc.evaluate('//meta', doc, null, XPathResult.ANY_TYPE, null);
			var links = doc.evaluate('//link[@rel="alternate"]', doc, null, XPathResult.ANY_TYPE, null);
			var meta, type, link;
			var data = new Array();
			// those four to have unique authors, not used by Zotero
			data['authors'] = new Array();
			data['contrib'] = new Array();
			data['editors'] = new Array();
			data['translators'] = new Array();
			// authors
			data['creators'] = new Array();
			// keywords
			data['tags'] = new Array();
			data['attachments'] = new Array();
			data['notes'] = new Array();

			while(link = links.iterateNext()) {
				switch(link.type) {
					case 'application/pdf':
						data['attachments'].push({'url':link.href,'title':link.title,'mimeType':'application/pdf','downloadable':true});
						break;
					// maybe later, epub ...
					default: break;
				}
			}

			while(meta = metas.iterateNext()) { // iterate over each metas
				switch(meta.name.toLowerCase()) {
					case 'dc.type':
						switch(meta.content.toLowerCase()) {
							case 'journalarticle':
								type = 'journalArticle';
								break;
							
							case 'collection':
							case 'book':
								type = 'multiple';
								break;
							
							case 'booksection':
								type = 'bookSection';
								break;
							
							default: break;
						}
						break;

					case 'author':
					case 'dc.creator':
						var authors = meta.content.split(';');
						for(var i in authors) {
							if(!data['authors'][authors[i]]) {
								data['authors'][authors[i]] = true;
								data['creators'].push(Zotero.Utilities.cleanAuthor(ZU.capitalizeTitle(authors[i].toLowerCase()), "author", true));
							}
						}
						break;
					
					case 'dc.contributor':
					case 'dc.contributor.ill':
						var contribs = meta.content.split(';');
						for(var i in contribs) {
							if(!data['contrib'][contribs[i]]) {
								data['contrib'][contribs[i]] = true;
								data['creators'].push(Zotero.Utilities.cleanAuthor(contribs[i], "contributor", true));
							}
						}
						break;

					case 'dc.contributor.edt':
						var editors = meta.content.split(';');
						for(var i in editors) {
							if(!data['editors'][editors[i]]) {
								data['editors'][editors[i]] = true;
								data['creators'].push(Zotero.Utilities.cleanAuthor(editors[i], "editor", true));
							}
						}
						break;

					case 'dc.contributor.com':
						var bookAuthors = meta.content.split(';');
						for(var i in bookAuthors) {
							if(!data['authors'][bookAuthors[i]]) {
								data['authors'][bookAuthors[i]] = true;
								data['creators'].push(Zotero.Utilities.cleanAuthor(bookAuthors[i], "bookAuthor", true));
							}
						}
						break;

					case 'dc.contributor.trl':
						var translators = meta.content.split(';');
						for(var i in translators) { 
							if(!data['translators'][translators[i]]) {
								data['translators'][translators[i]] = true;
								data['creators'].push(Zotero.Utilities.cleanAuthor(translators[i], "translator", true));
							}
						}
						break;

					case 'dc.subject':
					case 'keywords':
						for each(var tag in meta.content.split(/,\s*/))
							data['tags'].push(tag);
						break;

					case 'dc.identifier':
						if(!meta.scheme || meta.scheme === 'URI') {
							if(!data['url']) data['url'] = meta.content;
						} else if(meta.scheme === 'ISSN' && !data['ISSN']) {
							data['ISSN'] = meta.content;
						}
						break;
					
					case 'dc.title':
						data['title'] = meta.content;
						break;
						
					case 'dc.publisher':
						data['publisher'] = data['publisher'] ? data['publisher'] + ';' + meta.content : meta.content;
						break;
					
					case 'dc.language':
						data['language'] = data['language'] ? data['language'] + ';' + meta.content : meta.content;
						break;
					
					case 'dc.date':
						if(!data['date']) data['date'] = meta.content;
						break;
					
					case 'dc.rights':
						data['rights'] = data['rights'] ? data['rights'] + ';' + meta.content : meta.content;
						break;
					
					case 'dc.relation.ispartof':
						if(meta.scheme && 'ISBN' === meta.scheme) {
							data['ISBN'] = meta.content;
						} else if(!data['publicationTitle']) {
							data['publicationTitle'] = meta.content.replace(/(\s*,\s*)+$/, '');
						}
						break;

					case 'dc.description.tableofcontents':
						data['notes'].push({'note':meta.content});
						break;

					case 'dc.description':
					case 'description':
						if(!data['abstractNote']) {
							data['abstractNote'] = meta.content;
						} else if(-1 === data['abstractNote'].indexOf(meta.content)) {
							data['abstractNote'] += ';' + meta.content;
						}
						break;

					case 'prism.publicationname':
						data['publicationTitle'] = meta.content;
						break;

					case 'prism.number':
						data['issue'] = meta.content;
						break;

					case 'prism.volume':
						data['volume'] = meta.content;
						break;

					case 'prism.issuename':
						data['prism.series'] = meta.content;
						break;

					case 'prism.startingpage':
						data['pagination_first'] = meta.content;
						break;

					case 'prism.endingpage':
						data['pagination_last'] = meta.content;
						break;

					case 'prism.publicationdate':
						// we take only the date and not the time
						data['date'] = meta.content.substr(0,10);
						break;

					case 'prism.issn':
						data['ISSN'] = meta.content;
						break;

					case 'prism.isbn':
						data['ISBN'] = meta.content;
						break;

					case 'prism.elssn':
						//if(!data['ISSN']) data['ISSN'] = meta.content;
						break;

					case 'prism.url':
						data['url'] = meta.content;
						break;

					case 'prism.teaser':
						data['extra'] = meta.content;
						break;

					case 'prism.section':
						data['prism.section'] = meta.content;
						break;

					default: break;
				}
			}

			var item = new Zotero.Item(type ? type : 'journalArticle');
			
			if('bookSection' === type) {
				if(data['publicationTitle']) {
					data['bookTitle'] = data['publicationTitle'];
					delete data['publicationTitle'];
				}
				if(data['prism.series']) {
					data['publicationTitle'] = data['prism.series'];
				}
			} else {
				if(data['prism.series']) {
					data['seriesTitle'] = data['prism.series'];
				} else if(data['prism.section']) {
					data['seriesTitle'] = data['prism.section'];
				}
				delete data['prism.section'];
			}
			delete data['prism.series'];
			
			if(data['pagination_first'] && data['pagination_last']) {
				data['pages'] = data['pagination_first'] + '-' + data['pagination_last'];
			} else if(data['pagination_first']) {
				data['pages'] = data['pagination_first'];
			} else if(data['pagination_last']) {
				data['pages'] = data['pagination_last'];
			}
			delete data['pagination_first'], data['pagination_last'], data['authors'], data['contrib'];
			
			if(!data['title']) {
				// if no dc.title found, Zotero will throw an error, so we get the page title
				data['title'] = doc.evaluate('//title', doc, null, XPathResult.ANY_TYPE, null).iterateNext().textContent;
			}

			data['attachments'].push({'title':data['title'],'url':data['url'],'mimeType':'text/html'});

			for(var i in data) // populate
				item[i] = data[i];

			// will always be Revues.org
			item.libraryCatalog = 'Revues.org';
			
			item.complete();
		}, function() {Zotero.done();});
	}
	Zotero.wait();
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://e-spania.revues.org/12303",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "georges",
						"lastName": "martin",
						"creatorType": "author"
					},
					{
						"firstName": "Georges",
						"lastName": "Martin",
						"creatorType": "editor"
					}
				],
				"notes": [
					{
						"note": "<h1>Plan</h1><h1>L’infantat</h1><h1>L’infante</h1><h1>Annexe</h1>"
					}
				],
				"tags": [
					"infante Elvire",
					"Saint-Isidore de León",
					"testament",
					"Elvire Fernandez",
					"Urraque Fernandez",
					"infante Urraque",
					"Sancie Raimundez",
					"infante Sancie",
					"Ferdinand Ier de Castille et de León",
					"Alphonse VI de Castille et de León",
					"infantat",
					"infantaticum",
					"XIe siècle",
					"Urraca Fernández",
					"San Isidoro de León",
					"testamento",
					"Infantazgo",
					"Infanta Elvira",
					"Infanta Urraca",
					"Elvira Fernández",
					"Sancha Raimundez",
					"Infanta Sancha",
					"Fernando I de Castilla y León",
					"Alfonso VI de Castilla y León",
					"siglo XI",
					"infante Elvire",
					"Saint-Isidore de León",
					"testament",
					"Elvire Fernandez",
					"Urraque Fernandez",
					"infante Urraque",
					"Sancie Raimundez",
					"infante Sancie",
					"Ferdinand Ier de Castille et de León",
					"Alphonse VI de Castille et de León",
					"infantat",
					"infantaticum",
					"XIe siècle",
					"Urraca Fernández",
					"testamento",
					"San Isidoro de León",
					"Infantazgo",
					"Infanta Elvira",
					"Infanta Urraca",
					"Elvira Fernández",
					"Sancha Raimundez",
					"Infanta Sancha",
					"Fernando I de Castilla y León",
					"Alfonso VI de Castilla y León",
					"siglo XI",
					"\ninfante Elvire",
					"Saint-Isidore de León",
					"testament",
					"Elvire Fernandez",
					"Urraque Fernandez",
					"infante Urraque",
					"Sancie Raimundez",
					"infante Sancie",
					"Ferdinand Ier de Castille et de León",
					"Alphonse VI de Castille et de León",
					"infantat",
					"infantaticum",
					"XIe siècle",
					"\nUrraca Fernández",
					"testamento",
					"San Isidoro de León",
					"Infantazgo",
					"Infanta Elvira",
					"Infanta Urraca",
					"Elvira Fernández",
					"Sancha Raimundez",
					"Infanta Sancha",
					"Fernando I de Castilla y León",
					"Alfonso VI de Castilla y León",
					"siglo XI"
				],
				"seeAlso": [],
				"attachments": [
					{
						"url": "http://e-spania.revues.org/pdf/12303",
						"title": "Le testament d’Elvire (Tábara, 1099)",
						"mimeType": "application/pdf",
						"downloadable": true
					},
					{
						"title": "Le testament d’Elvire (Tábara, 1099)",
						"url": "http://e-spania.revues.org/12303",
						"mimeType": "text/html"
					}
				],
				"authors": "",
				"contrib": "",
				"editors": "",
				"translators": "",
				"url": "http://e-spania.revues.org/12303",
				"ISSN": "1951-6169",
				"title": "Le testament d’Elvire (Tábara, 1099)",
				"publisher": "SEMH-Sorbonne",
				"language": "fr",
				"abstractNote": "Le testament d’Elvire livre de précieuses informations sur la réalité historique de l’infantat : son implantation, la composition de ses biens, ses évolutions, les formes de son acquisition et de sa transmission, sa fonction politique. Mais il nous renseigne aussi sur une infante de niveau moyen, sur son cadre de vie, son entourage, ses activités, les réseaux de son pouvoir et même sur sa foi. ;El testamento de Elvira brinda una preciosísima información sobre la realidad del infantazgo : su extensión, la composición de sus bienes, sus evoluciones, las formas de su adquisición y transmisión, su papel político. También nos informa sobre una infanta de nivel mediano, sobre el marco de su vida, su entorno personal, sus actividades, la red de sus influencias e incluso sobre su fe.",
				"date": "2011-11-13",
				"rights": "© e-Spania",
				"publicationTitle": "e-Spania",
				"issue": "5",
				"extra": "Le 11 novembre 1099, dans sa ville de Tábara, non loin de Benavente, l’infante Elvire, âgée d’environ 63 ans et « prisonnière de la lourde chaîne de la maladie », ordonne son testament. Celui-ci nous a été convenablement conservé dans une copie précoce, écrite sur parchemin en lettres wisigothiques rondes. Il est signé par l’infante et souscrit par sa sœur, l’infante Urraque, ainsi que par les évêques de León, de Tuy et d’Oviedo. Elvire était la fille du roi Ferdinand Ier, mort en 1065, et la...",
				"seriesTitle": "Alphonse X le Sage | Infantes",
				"libraryCatalog": "Revues.org",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://amerika.revues.org/1283",
		"items": "multiple"
	}
]
/** END TEST CASES **/