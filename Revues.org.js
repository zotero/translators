{
	"translatorID": "87766765-919e-4d3b-9071-3dd7efe984c8",
	"label": "Revues.org",
	"creator": "Aurimas Vinckevicius, Pierre-Alain Mignot, and Michael Berkowitz",
	"target": "^http://.*\\.revues\\.org",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsv",
	"lastUpdated": "2012-05-13 00:56:40"
}

function detectWeb(doc, url) {
	// don't do anything on main domain, because there's nothing to fetch there
	if(url.match(/http:\/\/(www\.)?revues\.org/)) return false;

	var types = ZU.xpath(doc, '//meta[@name="DC.type"]/@content');
	for(var i=0, n=types.length; i<n; i++) {
		switch(types[i].textContent.toLowerCase()) {
			case 'journalarticle':
				return 'journalArticle';
			case 'collection':
				return 'multiple';
			case 'booksection':
				return 'bookSection';
		}
	}

	if (ZU.xpath(doc, '//div[@id="inside"]/div[@class="sommaire"]\
			/dl[@class="documents"]/dd[@class="titre"]/a').length ||
		ZU.xpath(doc, '//ul[@class="summary"]//div[@class="title"]/a').length) {
		return "multiple";
	} else if (ZU.xpath(doc, '//h1[@id="docTitle"]/span[@class="text"]').length ||
		url.match(/document\d+/)) {
		return "journalArticle";
	}
}

function scrape(doc, url) {
	//is this still necessary??
	if(url.match(/persee\-\d+/)) {
		// the article is on Persée portal, getting it to be translated by COinS
		var translator = Zotero.loadTranslator("web");
		translator.setTranslator("05d07af9-105a-4572-99f6-a8e231c0daef");
		translator.setDocument(doc);
		translator.translate();
	} else {
		//use Embeded Metadata
		var translator = Zotero.loadTranslator('web');
		translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
		translator.setDocument(doc);
		translator.setHandler('itemDone', function(obj, item) {
			//editor and translator declarations not part of DC spec
			//editors (and compilers)
			var editors = ZU.xpath(doc, '//meta[@name="DC.contributor.edt" \
				or @name="DC.contributor.com"]/@content');
			for(var i=0, n=editors.length; i<n; i++) {
				item.creators.push(
					ZU.cleanAuthor(editors[i].textContent, 'editor', true));
			}
			//translators
			var trans = ZU.xpath(doc,
				'//meta[@name="DC.contributor.trl"]/@content');
			for(var i=0, n=trans.length; i<n; i++) {
				item.creators.push(
					ZU.cleanAuthor(trans[i].textContent, 'translator', true));
			}

			//set abstract and keywords based on preferred locale
			var locale = doc.cookie.match(/\blanguage=([a-z]{2})/i);
			//default to french if not set
			locale = locale ? locale[1].toLowerCase() : 'fr';

			//get abstract  and tags in preferred locale
			//or the first locale available
			item.abstractNote = ZU.xpathText(doc,
				'//meta[@name="description" or @name="DC.description"]\
						[lang("' + locale + '") or @lang="' + locale + '"][1]\
						/@content') ||
				ZU.xpathText(doc,
					'//meta[@name="description" or @name="DC.description"][1]\
						/@content');

			var tags = ZU.xpathText(doc,
				'//meta[@name="keywords" or @name="DC.subject"]\
						[lang("' + locale + '") or @lang="' + locale + '"][1]\
						/@content') ||
				ZU.xpathText(doc,
					'//meta[@name="keywords" or @name="DC.subject"][1]\
						/@content');
			if(tags) {
				item.tags = tags.trim().split(/\s*,\s*/);
			}

			delete item.extra;

			//store the language-specific url
			item.url = url;

			item.complete();
		});

		translator.getTranslatorObject(function(trans) {
			//override some of the mappings
			trans.addCustomFields({
				'prism.number': 'issue',
				'prism.volume': 'volume',
				'DC.title': 'title'
			});

			trans.doWeb(doc, url);
		});
	}
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		var results = ZU.xpath(doc, '//div[@id="inside"]/div[@class="sommaire"]\
			/dl[@class="documents"]/dd[@class="titre"]');
		if(!results.length) {
			results = ZU.xpath(doc, '//ul[@class="summary"]//div[@class="title"]');
		}

/* From old code: When is this needed?
		if(doc.evaluate('//meta[@name="DC.description.tableOfContents"]', doc, null, XPathResult.ANY_TYPE, null).iterateNext()) {
			var titles = doc.evaluate('//meta[@name="DC.description.tableOfContents"]', doc, null, XPathResult.ANY_TYPE, null).iterateNext().content.split(' -- ');
			var articles = doc.evaluate('//meta[@name="DC.relation.hasPart"]', doc, null, XPathResult.ANY_TYPE, null);
			var article;
			var i = 0;
			while(article = articles.iterateNext()) {
				items[article.content] = titles[i++];
			}
		} */

		Zotero.selectItems(ZU.getItemArray(doc, results), function(selectedItems) {
			if(!selectedItems) return true;

			var urls = new Array();
			for(var i in selectedItems) {
				urls.push(i);
			}

			ZU.processDocuments(urls, function(doc) {
				scrape(doc, doc.location.href)
			});
		});
	} else {
		scrape(doc, url);
	}
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://amerika.revues.org/1283",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://iheid.revues.org/412?lang=fr",
		"items": [
			{
				"itemType": "bookSection",
				"creators": [
					{
						"firstName": "Fabien",
						"lastName": "Nathan",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
					}
				],
				"itemID": "http://iheid.revues.org/412?lang=fr",
				"title": "Chapitre 2 – L’histoire de La Paz et de la ladera ouest",
				"publicationTitle": "Collections électroniques de l’Institut de hautes études internationales et du développement. Graduate Institute Publications Online",
				"rights": "© The Graduate Institute | Geneva",
				"issue": "1",
				"number": "1",
				"patentNumber": "1",
				"publisher": "Institut de hautes études internationales et du développement",
				"institution": "Institut de hautes études internationales et du développement",
				"company": "Institut de hautes études internationales et du développement",
				"label": "Institut de hautes études internationales et du développement",
				"distributor": "Institut de hautes études internationales et du développement",
				"date": "2012/02/03",
				"DOI": "10.4000/iheid.412",
				"url": "http://iheid.revues.org/412?lang=fr",
				"abstractNote": "L’histoire de la ladera ouest de La Paz s’insère dans l’histoire générale de La Paz, à son tour influencée par (et influençant) l’histoire nationale bolivienne. La compréhension du processus de construction des risques, sans laquelle il est impossible de comprendre leur régulation sociale, est en grande partie le produit de l’histoire. En effet, l’approche diachronique semble être un moyen indispensable d’objectivation du social, inspiré ainsi de la sociologie « inséparablement structurale et génétique » (Wacquant 1995) de Pierre Bourdieu, et plus précisément ici, elle joue un rôle fondamental dans la recherche des causes, voire des « causes-racines » de la progression de la vulnérabilité (Wisner et al. 2004). On s’intéressera non seulement aux conditions de possibilité de l’établissement en zone à risque, mais également à la manière dont celle-ci s’est effectivement réalisée.Faire l’histoire de la ladera ouest, c’est construire l’histoire d’un espace, dans la lignée de l’école des annales (Braudel 1990), rendant solidaires l’une de l’autre l’histoire et la géographie. Mais c’est également s’intéresser à un objet inédit – l’histoire des laderas n’a jamais été écrite comme telle, et l’histoire de La Paz correspond souvent à celle du centre-ville. On peut y déceler plusieurs raisons. D’abord, le désintérêt général envers un espace peuplé par des populations indigènes, à faible capital économique, politique et culturel, et dont l’urbanisation constitue dans l’imaginaire collecti",
				"reportType": "bookSection",
				"letterType": "bookSection",
				"manuscriptType": "bookSection",
				"mapType": "bookSection",
				"thesisType": "bookSection",
				"websiteType": "bookSection",
				"presentationType": "bookSection",
				"postType": "bookSection",
				"audioFileType": "bookSection",
				"language": "fr",
				"ISBN": "978-2-940415-91-5",
				"ISSN": "2108-6419",
				"accessDate": "CURRENT_TIMESTAMP",
				"libraryCatalog": "iheid.revues.org"
			}
		]
	},
	{
		"type": "web",
		"url": "http://e-spania.revues.org/12303?lang=fr",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Georges",
						"lastName": "Martin",
						"creatorType": "author"
					},
					{
						"firstName": "Georges",
						"lastName": "Martin",
						"creatorType": "editor"
					}
				],
				"notes": [],
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
					"XIe siècle"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
					}
				],
				"itemID": "http://e-spania.revues.org/12303?lang=fr",
				"title": "Le testament d’Elvire (Tábara, 1099)",
				"publicationTitle": "e-Spania. Revue interdisciplinaire d’études hispaniques médiévales et modernes",
				"rights": "© e-Spania",
				"issue": "5",
				"number": "5",
				"patentNumber": "5",
				"publisher": "CLEA (Civilisations et Littératures d’Espagne et d’Amérique du Moyen Âge aux Lumières), EA 4083",
				"institution": "CLEA (Civilisations et Littératures d’Espagne et d’Amérique du Moyen Âge aux Lumières), EA 4083",
				"company": "CLEA (Civilisations et Littératures d’Espagne et d’Amérique du Moyen Âge aux Lumières), EA 4083",
				"label": "CLEA (Civilisations et Littératures d’Espagne et d’Amérique du Moyen Âge aux Lumières), EA 4083",
				"distributor": "CLEA (Civilisations et Littératures d’Espagne et d’Amérique du Moyen Âge aux Lumières), EA 4083",
				"date": "2012/03/31",
				"DOI": "10.4000/e-spania.12303",
				"url": "http://e-spania.revues.org/12303?lang=fr",
				"abstractNote": "Le testament d’Elvire livre de précieuses informations sur la réalité historique de l’infantat : son implantation, la composition de ses biens, ses évolutions, les formes de son acquisition et de sa transmission, sa fonction politique. Mais il nous renseigne aussi sur une infante de niveau moyen, sur son cadre de vie, son entourage, ses activités, les réseaux de son pouvoir et même sur sa foi.",
				"reportType": "Text",
				"letterType": "Text",
				"manuscriptType": "Text",
				"mapType": "Text",
				"thesisType": "Text",
				"websiteType": "Text",
				"presentationType": "Text",
				"postType": "Text",
				"audioFileType": "Text",
				"language": "fr",
				"ISSN": "1951-6169",
				"accessDate": "CURRENT_TIMESTAMP",
				"libraryCatalog": "e-spania.revues.org"
			}
		]
	},
	{
		"type": "web",
		"url": "http://e-spania.revues.org/12303?lang=es",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Georges",
						"lastName": "Martin",
						"creatorType": "author"
					},
					{
						"firstName": "Georges",
						"lastName": "Martin",
						"creatorType": "editor"
					}
				],
				"notes": [],
				"tags": [
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
					"siglo XI"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
					}
				],
				"itemID": "http://e-spania.revues.org/12303?lang=es",
				"title": "Le testament d’Elvire (Tábara, 1099)",
				"publicationTitle": "e-Spania. Revue interdisciplinaire d’études hispaniques médiévales et modernes",
				"rights": "© e-Spania",
				"issue": "5",
				"number": "5",
				"patentNumber": "5",
				"publisher": "CLEA (Civilisations et Littératures d’Espagne et d’Amérique du Moyen Âge aux Lumières), EA 4083",
				"institution": "CLEA (Civilisations et Littératures d’Espagne et d’Amérique du Moyen Âge aux Lumières), EA 4083",
				"company": "CLEA (Civilisations et Littératures d’Espagne et d’Amérique du Moyen Âge aux Lumières), EA 4083",
				"label": "CLEA (Civilisations et Littératures d’Espagne et d’Amérique du Moyen Âge aux Lumières), EA 4083",
				"distributor": "CLEA (Civilisations et Littératures d’Espagne et d’Amérique du Moyen Âge aux Lumières), EA 4083",
				"date": "2012/03/31",
				"DOI": "10.4000/e-spania.12303",
				"url": "http://e-spania.revues.org/12303?lang=es",
				"abstractNote": "El testamento de Elvira brinda una preciosísima información sobre la realidad del infantazgo : su extensión, la composición de sus bienes, sus evoluciones, las formas de su adquisición y transmisión, su papel político. También nos informa sobre una infanta de nivel mediano, sobre el marco de su vida, su entorno personal, sus actividades, la red de sus influencias e incluso sobre su fe.",
				"reportType": "Text",
				"letterType": "Text",
				"manuscriptType": "Text",
				"mapType": "Text",
				"thesisType": "Text",
				"websiteType": "Text",
				"presentationType": "Text",
				"postType": "Text",
				"audioFileType": "Text",
				"language": "fr",
				"ISSN": "1951-6169",
				"accessDate": "CURRENT_TIMESTAMP",
				"libraryCatalog": "e-spania.revues.org"
			}
		]
	},
	{
		"type": "web",
		"url": "http://chs.revues.org/index142.html",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Emmanuel",
						"lastName": "Blanchard",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
					}
				],
				"itemID": "http://chs.revues.org/index142.html",
				"title": "L’encadrement des Algériens de Paris (1944-1954), entre contraintes juridiques et arbitraire policier",
				"publicationTitle": "Crime, Histoire & Sociétés / Crime, History & Societies",
				"rights": "© Droz",
				"publisher": "Droz",
				"institution": "Droz",
				"company": "Droz",
				"label": "Droz",
				"distributor": "Droz",
				"date": "2007/06/01",
				"DOI": "10.4000/chs.142",
				"reportType": "journalArticle",
				"letterType": "journalArticle",
				"manuscriptType": "journalArticle",
				"mapType": "journalArticle",
				"thesisType": "journalArticle",
				"websiteType": "journalArticle",
				"presentationType": "journalArticle",
				"postType": "journalArticle",
				"audioFileType": "journalArticle",
				"language": "fr",
				"issue": "1",
				"ISBN": "978-2-600-01160-0",
				"abstractNote": "Au sortir de la Seconde Guerre mondiale, pour sauvegarder son empire colonial, la France est contrainte de reconnaître la citoyenneté des Français musulmans d’Algérie (FMA). Dès lors, ceux-ci se retrouvent en métropole dans une situation proche de celle d’autres citoyens diminués (vagabonds, prostituées…) qui, bien que juridiquement peu accessibles à la répression policière sont considérés comme « indésirables » et constituent la clientèle privilégiée de forces de l’ordre agissant aux marges de la loi. Si l’ethnicité, la xénophobie, et la situation coloniale contribuent à définir les Algériens comme « indésirables », le répertoire d’actions policier envers les FMA tient avant tout à la façon dont l’arène policière est médiatisée par le contrôle et la représentation politiques.",
				"pages": "5-25",
				"ISSN": "1422-0857",
				"url": "http://chs.revues.org/index142.html",
				"accessDate": "CURRENT_TIMESTAMP",
				"libraryCatalog": "chs.revues.org",
				"volume": "11"
			}
		]
	},
	{
		"type": "web",
		"url": "http://poldev.revues.org/135",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Gareth",
						"lastName": "Austin",
						"creatorType": "author"
					},
					{
						"firstName": "Emmanuelle",
						"lastName": "Chauvet",
						"creatorType": "translator"
					}
				],
				"notes": [],
				"tags": [
					"Afrique subsaharienne"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
					}
				],
				"itemID": "http://poldev.revues.org/135",
				"title": "Développement économique et legs coloniaux en Afrique",
				"publicationTitle": "Revue internationale de politique de développement. International Development Policy series",
				"rights": "© The Graduate Institute|Geneva",
				"publisher": "Institut de hautes études internationales et du développement",
				"institution": "Institut de hautes études internationales et du développement",
				"company": "Institut de hautes études internationales et du développement",
				"label": "Institut de hautes études internationales et du développement",
				"distributor": "Institut de hautes études internationales et du développement",
				"date": "2010/03/11",
				"DOI": "10.4000/poldev.135",
				"reportType": "Text",
				"letterType": "Text",
				"manuscriptType": "Text",
				"mapType": "Text",
				"thesisType": "Text",
				"websiteType": "Text",
				"presentationType": "Text",
				"postType": "Text",
				"audioFileType": "Text",
				"language": "fr",
				"issue": "1",
				"abstractNote": "Cet article étudie les effets du gouvernement colonial et de l’action des Africains pendant la période coloniale sur le contexte institutionnel et la situation en matière de ressources qui ont posé le cadre du futur développement économique au sud du Sahara. Cette question est placée dans la perspective de la dynamique du développement dans une région qui était, en 1900, extrêmement riche en terres et caractérisée par un manque de main-d’œuvre et de capital, par des activités marchandes indigènes dont l’ampleur peut étonner et par des degrés variables mais souvent peu élevés de centralisation politique. L’article explore la différence entre les effets des gouvernements français et britannique, mais il affirme que la différence visible dans l’évolution de la pauvreté, du bien-être et du changement structurel a davantage été déterminée par l’opposition entre économies « de peuplement » et « d’exploitation ».",
				"pages": "11-36",
				"ISSN": "1663-9375",
				"url": "http://poldev.revues.org/135",
				"accessDate": "CURRENT_TIMESTAMP",
				"libraryCatalog": "poldev.revues.org"
			}
		]
	},
	{
		"type": "web",
		"url": "http://ifpo.revues.org/879",
		"items": [
			{
				"itemType": "bookSection",
				"creators": [
					{
						"firstName": "Hélène",
						"lastName": "Vacher",
						"creatorType": "author"
					},
					{
						"firstName": "Raffaele",
						"lastName": "Cattedra",
						"creatorType": "editor"
					},
					{
						"firstName": "Pascal",
						"lastName": "Garret",
						"creatorType": "editor"
					},
					{
						"firstName": "Catherine",
						"lastName": "Miller",
						"creatorType": "editor"
					},
					{
						"firstName": "Mercedes",
						"lastName": "Volait",
						"creatorType": "editor"
					}
				],
				"notes": [],
				"tags": [
					"urbanisme",
					"Lyautey",
					"patrimoine",
					"planification"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
					}
				],
				"itemID": "http://ifpo.revues.org/879",
				"title": "La planification de la sauvegarde et le détour marocain (1912-1925)",
				"publicationTitle": "Collections électroniques de l’Ifpo. Livres en ligne des Presses de l’Institut français du Proche-Orient",
				"rights": "Article L.111-1 du Code de la propriété intellectuelle.",
				"publisher": "Institut français du Proche-Orient",
				"institution": "Institut français du Proche-Orient",
				"company": "Institut français du Proche-Orient",
				"label": "Institut français du Proche-Orient",
				"distributor": "Institut français du Proche-Orient",
				"date": "2010/01/31",
				"reportType": "bookSection",
				"letterType": "bookSection",
				"manuscriptType": "bookSection",
				"mapType": "bookSection",
				"thesisType": "bookSection",
				"websiteType": "bookSection",
				"presentationType": "bookSection",
				"postType": "bookSection",
				"audioFileType": "bookSection",
				"language": "fr",
				"ISBN": "978-2-35159-200-7",
				"abstractNote": "La sauvegarde des médinas du Maroc, sous la houlette du résident général Lyautey (1912-1925), relève de la politique d’aménagement qui engloba les cités du « vieux Maroc » dans la révolution spatiale induite par l’occupation coloniale. Dès sa mise en place, l’administration du Protectorat assigna une dimension symbolique à la conservation des monuments et des cités du Maroc. Innovante sur le plan institutionnel, spectaculaire au plan de son impact sur la forme urbaine, la politique de sauvegarde est à apprécier au regard des modalités spécifiques de la mise sous tutelle de l’Empire chérifien et des réformes conduites par les artisans de la « Renaissance marocaine » pour donner une cohérence spatiale, politique et culturelle au « Maroc utile ». La séparation des ordres urbains, ou la discontinuité planifiée, opérée par les autorités du Protectorat au Maroc, a fait l’objet de nombreux travaux depuis les années 1970. Toutefois, la mise en perspective de cette expérience dans l’histoire des discours et des disciplines de l’aménagement urbain demeure un objet de controverse1, tandis que la politique de sauvegarde est à considérer à l’aune de l’invention du patrimoine urbain2.L’article examine le cadre d’émergence des opérations de protection des cités marocaines dans la perspective du mouvement international en faveur de l’urbanisme au début du xxe siècle. En considérant le dispositif d’intervention élaboré à cette fin et des exemples de mise en oeuvre, cette contribution question",
				"ISSN": "2078-3493",
				"url": "http://ifpo.revues.org/879",
				"accessDate": "CURRENT_TIMESTAMP",
				"libraryCatalog": "ifpo.revues.org"
			}
		]
	},
	{
		"type": "web",
		"url": "http://ifpo.revues.org/615",
		"items": [
			{
				"itemType": "bookSection",
				"creators": [
					{
						"firstName": "Élias",
						"lastName": "Khoury",
						"creatorType": "author"
					},
					{
						"firstName": "Pascale",
						"lastName": "Féghali",
						"creatorType": "editor"
					},
					{
						"lastName": "Ifpo",
						"creatorType": "translator"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
					}
				],
				"itemID": "http://ifpo.revues.org/615",
				"title": "Préface",
				"publicationTitle": "Collections électroniques de l’Ifpo. Livres en ligne des Presses de l’Institut français du Proche-Orient",
				"rights": "© Institut français du Proche-Orient",
				"publisher": "Institut français du Proche-Orient",
				"institution": "Institut français du Proche-Orient",
				"company": "Institut français du Proche-Orient",
				"label": "Institut français du Proche-Orient",
				"distributor": "Institut français du Proche-Orient",
				"date": "2009/06/01",
				"reportType": "bookSection",
				"letterType": "bookSection",
				"manuscriptType": "bookSection",
				"mapType": "bookSection",
				"thesisType": "bookSection",
				"websiteType": "bookSection",
				"presentationType": "bookSection",
				"postType": "bookSection",
				"audioFileType": "bookSection",
				"language": "fr",
				"issue": "4",
				"ISBN": "978-2-35159-147-5",
				"abstractNote": "J’ai suivi le cheminement de ce livre alors qu’il n’était encore qu’un projet de thèse à l’université de Nanterre et j’ai ainsi accompagné les différentes étapes de ce travail : de l’enquête de terrain aux prises de vues, en passant par la longue période de rédaction, la soutenance de la thèse - à laquelle je pris part comme membre du jury -, et finalement le livre dans sa version présente.Ce fut une expérience passionnante et ce, à plus d’un titre. Elle participe d’une longue amitié qui me lie à Pascale Féghali et elle prolonge un travail commun que nous avions débuté au Théâtre de Beyrouth puis avec le festival Ayloul. Pascale Féghali expérimente aujourd’hui une autre approche, en tant que cinéaste et anthropologue, alliant l’art au savoir, transformant la caméra en un outil de recherche sans pareil pour sonder la profondeur des rapports humains. En cela, elle suit la voie tracée par son maître, Jean Rouch, pionnier de cette approche basée sur l’interpénétration féconde de l’art et de la connaissance scientifique, chacun servant de vecteur à l’autre. Ce livre parle deux langages : celui des mots et celui de la caméra. Les mots retracent les étapes de la recherche et ses vicissitudes et nous transportent au plus près des gens et des récits, alors que la caméra donne accès à un langage qui se situe au-delà des mots et transfigure des marginaux en véritables personnages. À la croisée de ces deux langages apparaît la voix pudique de l’auteur. Pascale Féghali a réussi à transfor",
				"pages": "7-9",
				"ISSN": "2078-3493",
				"url": "http://ifpo.revues.org/615",
				"accessDate": "CURRENT_TIMESTAMP",
				"libraryCatalog": "ifpo.revues.org"
			}
		]
	}
]
/** END TEST CASES **/