{
	"translatorID": "87766765-919e-4d3b-9071-3dd7efe984c8",
	"label": "Revues.org",
	"creator": "Aurimas Vinckevicius",
	"target": "^http://.*\\.revues\\.org",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcs",
	"lastUpdated": "2012-03-26 20:29:10"
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

			item.complete();
		});
		translator.translate();
	}
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		var results = ZU.xpath(doc, '//div[@id="inside"]/div[@class="sommaire"]\
			/dl[@class="documents"]/dd[@class="titre"]');
		if(!results.length) {
			results = ZU.xpath(doc, '//ul[@class="summary"]//div[@class="title"]');
		}

/* When is this needed?
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
				"publisher": "Institut de hautes études internationales et du développement",
				"institution": "Institut de hautes études internationales et du développement",
				"company": "Institut de hautes études internationales et du développement",
				"label": "Institut de hautes études internationales et du développement",
				"distributor": "Institut de hautes études internationales et du développement",
				"date": "2012/02/03",
				"DOI": "10.4000/iheid.412",
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
				"issue": "1",
				"ISBN": "978-2-940415-91-5",
				"abstractNote": "L’histoire de la ladera ouest de La Paz s’insère dans l’histoire générale de La Paz, à son tour influencée par (et influençant) l’histoire nationale bolivienne. La compréhension du processus de construction des risques, sans laquelle il est impossible de comprendre leur régulation sociale, est en grande partie le produit de l’histoire. En effet, l’approche diachronique semble être un moyen indispensable d’objectivation du social, inspiré ainsi de la sociologie « inséparablement structurale et génétique » (Wacquant 1995) de Pierre Bourdieu, et plus précisément ici, elle joue un rôle fondamental dans la recherche des causes, voire des « causes-racines » de la progression de la vulnérabilité (Wisner et al. 2004). On s’intéressera non seulement aux conditions de possibilité de l’établissement en zone à risque, mais également à la manière dont celle-ci s’est effectivement réalisée.Faire l’histoire de la ladera ouest, c’est construire l’histoire d’un espace, dans la lignée de l’école des annales (Braudel 1990), rendant solidaires l’une de l’autre l’histoire et la géographie. Mais c’est également s’intéresser à un objet inédit – l’histoire des laderas n’a jamais été écrite comme telle, et l’histoire de La Paz correspond souvent à celle du centre-ville. On peut y déceler plusieurs raisons. D’abord, le désintérêt général envers un espace peuplé par des populations indigènes, à faible capital économique, politique et culturel, et dont l’urbanisation constitue dans l’imaginaire collecti",
				"ISSN": "2108-6419",
				"url": "http://iheid.revues.org/412?lang=fr",
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
					}
				],
				"notes": [],
				"tags": [
					"Alphonse VI de Castille et de León",
					"Elvire Fernandez",
					"Ferdinand Ier de Castille et de León",
					"Saint-Isidore de León",
					"Sancie Raimundez",
					"Urraque Fernandez",
					"XIe siècle",
					"infantat",
					"infantaticum",
					"infante Elvire",
					"infante Sancie",
					"infante Urraque",
					"testament"
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
				"rights": "© e-Spania",
				"DOI": "10.4000/e-spania.12303",
				"language": "fr",
				"issue": "5",
				"abstractNote": "Le testament d’Elvire livre de précieuses informations sur la réalité historique de l’infantat : son implantation, la composition de ses biens, ses évolutions, les formes de son acquisition et de sa transmission, sa fonction politique. Mais il nous renseigne aussi sur une infante de niveau moyen, sur son cadre de vie, son entourage, ses activités, les réseaux de son pouvoir et même sur sa foi.",
				"ISSN": "1951-6169",
				"url": "http://e-spania.revues.org/12303?lang=fr",
				"libraryCatalog": "e-spania.revues.org",
				"title": "Le testament d’Elvire (Tábara, 1099)",
				"publicationTitle": "e-Spania. Revue interdisciplinaire d’études hispaniques médiévales et modernes",
				"date": "2012/03/31"
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
					}
				],
				"notes": [],
				"tags": [
					"Alfonso VI de Castilla y León",
					"Elvira Fernández",
					"Fernando I de Castilla y León",
					"Infanta Elvira",
					"Infanta Sancha",
					"Infanta Urraca",
					"Infantazgo",
					"San Isidoro de León",
					"Sancha Raimundez",
					"Urraca Fernández",
					"siglo XI",
					"testamento"
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
				"rights": "© e-Spania",
				"DOI": "10.4000/e-spania.12303",
				"language": "fr",
				"issue": "5",
				"abstractNote": "El testamento de Elvira brinda una preciosísima información sobre la realidad del infantazgo : su extensión, la composición de sus bienes, sus evoluciones, las formas de su adquisición y transmisión, su papel político. También nos informa sobre una infanta de nivel mediano, sobre el marco de su vida, su entorno personal, sus actividades, la red de sus influencias e incluso sobre su fe.",
				"ISSN": "1951-6169",
				"url": "http://e-spania.revues.org/12303?lang=es",
				"libraryCatalog": "e-spania.revues.org",
				"title": "Le testament d’Elvire (Tábara, 1099)",
				"publicationTitle": "e-Spania. Revue interdisciplinaire d’études hispaniques médiévales et modernes",
				"date": "2012/03/31"
			}
		]
	}
]
/** END TEST CASES **/