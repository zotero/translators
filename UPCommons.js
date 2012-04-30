{
	"translatorID": "0abd577b-ec45-4e9f-9081-448737e2fd34",
	"label": "UPCommons",
	"creator": "Sebastian Karcher",
	"target": "^https?://upcommons\\.upc\\.edu",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "g",
	"lastUpdated": "2012-04-30 00:09:48"
}

function detectWeb(doc, url) {
	if (doc.evaluate('//table[@class="itemDisplayTable"]', doc, null, XPathResult.ANY_TYPE, null).iterateNext()) {
		var type = ZU.xpathText(doc, '//meta[@name="DC.type"]/@content');
		if(itemTypes[type]!=null) return itemTypes[type];
		else return "document";
	} else if (doc.evaluate('//table[@class="miscTable"]//td[2]', doc, null, XPathResult.ANY_TYPE, null).iterateNext() || doc.evaluate('//div[@id="main"]/ul[@class="browselist"]/li/a', doc, null, XPathResult.ANY_TYPE, null).iterateNext()) {
		return "multiple";
	}
}

var itemTypes = {
	"Article":"journalArticle",
	"Audiovisual":"film",
	"Book":"book",
	"Thesis":"thesis",
	"Working Paper":"report",
	"Technical Report":"report"
}

function doWeb(doc,url)
{
	if (detectWeb(doc, url) == "multiple") {
		var hits = {};
		var urls = [];
		var results = ZU.xpath(doc,"//tr/td[@headers='t1']/a");
	
		for (var i in results) {
			hits[results[i].href] = results[i].textContent;
		}
		Z.selectItems(hits, function(items) {
			if (items == null) return true;
			for (var j in items) {
				urls.push(j);
			}
			ZU.processDocuments(urls, function (myDoc) { 
				doWeb(myDoc, myDoc.location.href) }, function () {Z.done()});

			Z.wait();
		});
	} else {
		// We call the Embedded Metadata translator to do the actual work
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
		translator.setHandler("itemDone", function(obj, item) {
			 var type = ZU.xpathText(doc, '//meta[@name="DC.type"]/@content');
			 if(itemTypes[type]!=null) item.itemType = itemTypes[type];
			 item.abstractNote=item.extra;
			 item.extra = "";
			item.complete();
			});
		translator.getTranslatorObject(function (obj) {
				obj.doWeb(doc, url);
				});
	}
};/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://upcommons.upc.edu/browse?type=author&order=ASC&rpp=20&value=Sabat%C3%A9+Garriga%2C+Ferran",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://upcommons.upc.edu/handle/2117/12974",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Judit",
						"lastName": "Coromina",
						"creatorType": "author"
					},
					{
						"firstName": "Ferran",
						"lastName": "Sabaté Garriga",
						"creatorType": "author"
					},
					{
						"firstName": "Jordi",
						"lastName": "Romeu Robert",
						"creatorType": "author"
					},
					{
						"firstName": "Ferran",
						"lastName": "Ruiz",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"Àrees temàtiques de la UPC::Ensenyament i aprenentatge::Didàctica::Organització de la docència",
					"Electronic portfolios in education",
					"Portafolis electrònics en educació"
				],
				"seeAlso": [
					"Open Access"
				],
				"attachments": [
					{
						"title": "Snapshot"
					}
				],
				"itemID": "http://upcommons.upc.edu/handle/2117/12974",
				"title": "Digital portfolio for learning: A new communication channel for education",
				"date": "2011-07-21",
				"DOI": "10.3926/ic.2011.v7n1.p116-142",
				"reportType": "Article",
				"letterType": "Article",
				"manuscriptType": "Article",
				"mapType": "Article",
				"thesisType": "Article",
				"websiteType": "Article",
				"presentationType": "Article",
				"postType": "Article",
				"audioFileType": "Article",
				"accepted": "2011-07-21T12:45:25Z",
				"language": "es",
				"url": "http://upcommons.upc.edu/handle/2117/12974",
				"accessDate": "CURRENT_TIMESTAMP",
				"libraryCatalog": "upcommons.upc.edu",
				"abstractNote": "Propósito: La Generalitat de Catalunya tiene previsto introducir antes del año 2017 el portafolio digital, una iniciativa vinculada con los nuevos métodos de aprendizaje. Constatado el creciente interés por el portafolio digital como medio de comunicación en la educación, este artículo tiene por objetivos describir detalladamente su funcionamiento e identificar una lista de criterios, útiles a los centros educativos, para seleccionar la aplicación de gestión del portafolio digital que mejor se adapte a sus necesidades.\nDiseño/metodología/enfoque: En primer lugar se fija el marco teórico de funcionamiento del portafolio digital. Luego se tipifican las aplicaciones que son usadas comúnmente para su implementación. A continuación se realiza un análisis de requisitos de una aplicación ideal con acuerdo a las fases de creación del portafolio identificados en el marco teórico. Finalmente, a partir de estos requisitos se identifica una lista de criterios útiles para seleccionar la aplicación de soporte al portafolio.\nResultados y originalidad/valor: El artículo aporta un proceso estructurado en etapas y fases para la creación del portafolio digital que va más allá de los existentes en la literatura. Además, define una lista de criterios útiles para seleccionar la aplicación de soporte al portafolio digital\nPortafolio digital de aprendizaje: Un nuevo medio de comunicación en la educación 117\nJ. Coromina, F. Sabate, J. Romeu, F. Ruiz\nque más convenga a un centro educativo, obtenidos con una metodología bastante exhaustiva.\nLimitaciones/implicaciones de investigación: Para poner en práctica los criterios identificados se propone completar, en un nuevo estudio, el modelo de decisión multicriterio, especificando los procesos para pesar los criterios y normalizarlos. Después se podría analizar la validez del modelo estudiando la satisfacción obtenida por su uso en una muestra de centros educativos.\nImplicaciones prácticas: La lista de criterios se espera facilite la selección de la aplicación informática de soporte al portafolio de aprendizaje a los centros educativos, con acuerdo a sus necesidades específicas.",
				"shortTitle": "Digital portfolio for learning"
			}
		]
	}
]
/** END TEST CASES **/