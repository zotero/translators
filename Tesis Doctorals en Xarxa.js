
{
	"translatorID": "dd2d7c63-0c4b-4da4-b1d8-e72c7445c1e0",
	"label": "Tesis Doctorals en Xarxa",
	"creator": "CSUC",
	"target": "^https?://(www\.)?(tdx\.cat|tesisenred\.net)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsb",
	"lastUpdated": "2016-09-22 15:33:33"
}


function detectWeb(doc, url) {
	var type = ZU.xpath(doc, '//meta[@name="DC.type"]/@content');
	if (type.length>0) {
		if (mappingTable[type[0].textContent]) {
			return mappingTable[type[0].textContent];
		} else {
			return "thesis";
		}
	}else{
		return "multiple";
	}
}

var mappingTable = {
	"info:eu-repo/semantics/doctoralThesis":"thesis",
}

var mappingRights = {
	"info:eu-repo/semantics/embargoedAccess":"Embargoed Access",
	"info:eu-repo/semantics/openAccess":"Open Access",
}



function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		
		var hits=[];
		var urls=[];
		var results=ZU.xpath(doc,'//div[@class="artifact-title"]/a');
		for (var i in results) {
			hits.push(results[i].href);
		}
		
		Zotero.selectItems(hits, function (items) {
			if (!items) {
				return true;
			}
			var items = new Array();
			for (var j in items) {
				urls.push(j);
				
			}
			ZU.processDocuments(urls, scrape);
		});
	} else {
		scrape(doc, url);
	}
}

function scrape(doc, url) {
			var item = new Zotero.Item("thesis");
			//title
			var titles = ZU.xpath(doc, '//meta[@name="citation_title"]');
			if (titles) {
					item.title = titles[0].content
			}
			
			//add isbn
			var isbn = ZU.xpath(doc, '//meta[@name="citation_isbn"]');
			if (isbn.length>0) {
					item.isbn = isbn[0].content
			}
			
			//add issn
			var issn = ZU.xpath(doc, '//meta[@name="citation_issn"]');
			if (issn.length>0) {
					item.issn = issn[0].content
			}
			
			//add DATE
			var date = ZU.xpath(doc, '//meta[@name="citation_date"]');
			if (date.length>0) {
					item.date = date[0].content
			}
			
			//add abstract
			var abstract = ZU.xpath(doc, '//meta[@name="citation_abstract"]');
			if (abstract.length>0) {
					item.abstractNote = abstract[0].content
			}
			
			if ( ! item.abstract ) {
				var abstract = ZU.xpath(doc, '//meta[contains(@name, "DCTERMS.abstract")]');
				if (abstract.length>0) {
						item.abstractNote = abstract[0].content
				}			
			}
			
			//add URL
			var identfiers = ZU.xpath(doc, '//meta[contains(@scheme, "DCTERMS.URI")]');
			if (identfiers.length>0) {
					item.url=identfiers[0].content;
			}
			
			//add language
			var language = ZU.xpath(doc, '//meta[@name="citation_language"]');
			if (language.length>0) {
					item.language=language[0].content;
			}

			//add publisher 
			var publisher = ZU.xpath(doc, '//meta[@name="citation_publisher"]');
			if (publisher.length>0) {
				for (var i=0; i<publisher.length; i++) {
					item.publisher = publisher[i].content;
					item.university = publisher[i].content;

				}
				
			}
			
			//add tags -> from subjects
			var tags = ZU.xpath(doc, '//meta[contains(@name, "DC.subject")]');
			if (tags.length>0) {
					item.tags = [];
					for (var t=0; t<tags.length; t++) {
						item.tags.push( tags[t].content );
					}
			}

			//add tags -> from rights
			var rights = ZU.xpath(doc, '//meta[contains(@name, "DC.rights")]');
			if (rights.length>0) {
					item.rights = [];
					for (var t=0; t<rights.length; t++) {
						if (mappingRights[rights[t].content])
						item.rights.push(mappingRights[rights[t].content]);
					}
			}
					
			
			var authors = ZU.xpath(doc, '//meta[@name="citation_author"]');
			if (authors) {
				item.creators = [];
				for (var a=0; a<authors.length; a++) {
					var authorsText = authors[a].content;
					var authorsType = authors[a].name.substr(3);//either creator or contributer
					var authorParts = authorsText.split(',');
					//distinguish between lastName (every letter is in uppercase) from firstName
					//but there might also be just initials (e.g. "D.") from the firstName
					var firstName = "";
					var lastName = "";
					var splitPos=0;
					
					if (authorParts.length>1){
					firstName=authorParts[1];
					lastName= authorParts[0];
					}else{
						firstName=authorParts[0];
					}
					item.creators.push( {lastName:lastName.trim(), firstName:firstName.trim(), creatorType:"creator" });
				}
			}
		
			//add pages
			var pages =ZU.xpath(doc, '//*[@element="format" and @qualifier="extent"]');
			if (pages.length>0) {
					var cleanpages= pages[0].textContent.split('p.')[0];
					// item.pages="p. 1-"+cleanpages;
					item.numPages = parseInt( cleanpages, 10 );
			}
			//add type
			item.thesisType="Ph.D. Thesis";
			
		item.complete();

}

/** BEGIN TEST CASES **/
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://tdx.cat/handle/10803/393947",
		"items": [
			{
				"itemType": "thesis",
				"title": "El deporte en la vida y en la obra de Manuel Vázquez Montalbán: 1939-2003",
				"creators": [
					{
						"lastName": "Osúa Quintana",
						"firstName": "Jordi",
						"creatorType": "creator"
					}
				],
				"date": "2013-10-29",
				"abstractNote": "Manuel Vázquez Montalbán (1939-2003) dedicó parte de su obra a reflexionar sobre el deporte, uno de los grandes fenómenos de masas del siglo XX. El objetivo de esta tesis es identificar, recopilar, ordenar y sistematizar las referencias al deporte presentes en ensayos, novelas, poemas y, sobre todo, artículos periodísticos de este autor para analizar su pensamiento deportivo.\r\n\r\nLa elaboración de su biografía deportiva permite determinar la importancia del deporte en su vida y las circunstancias personales que concurren en la formación de su pensamiento deportivo. Su perfil deportivo responde más al del aficionado que al del practicante de una modalidad determinada. Las experiencias de su infancia y juventud en el barrio del Raval, el compromiso en la lucha antifranquista, la síntesis entre la cultura popular y académica realizada en la prisión de Lérida y la coincidencia con un grupo de intelectuales de izquierda barcelonistas configuraron una visión del deporte lúcida y original.\r\n\r\nSu extensa producción periodística y literaria incluye 700 textos deportivos. Su preocupación por las cuestiones deportivas responde, más que a su afición, a un interés personal por reflexionar, desde una perspectiva crítica y subcultural, sobre un fenómeno escasamente estudiado por los intelectuales. En un primer momento, sus comentarios pretenden evidenciar los lazos del deporte con el franquismo y reflexionar sobre el sentido del deporte en la sociedad de masas. Con la transición democrática, sus escritos deportivos se centran en los medios de comunicación, la política o la sociedad en general. Posteriormente, al convertirse en un autor de prestigio, fue reclamado por diversos medios de comunicación nacionales e internacionales para explicar algunas cuestiones específicas relacionadas con el \"Barça\", los Juegos Olímpicos de Barcelona (1992) o los partidos \"Barça\"-Real Madrid.\r\n\r\nDespués de analizar cuantitativamente el contenido de los textos deportivos montalbanianos y sistematizar sus ideas alrededor de seis ámbitos temáticos —el deporte en general, el fútbol en general, el olimpismo, el fútbol español, el F. C. Barcelona y el deporte español- podemos concluir que el pensamiento deportivo de Manuel Vázquez Montalbán está configurado en torno a tres ejes temáticos: la crítica marxista, el barcelonismo y el análisis de las tensiones políticas y sociales del Estado español a través del fútbol. La influencia del análisis marxista en la obra deportiva montalbaniana va desde una crítica a la manipulación política del deporte durante el franquismo y la Guerra Fría a la denuncia de su mercantilización en el mundo globalizado. Respecto al barcelonismo, Manuel Vázquez Montalbán no se limita a explicitar la simple afinidad con un club de fútbol sino que se adentra en su representatividad política y social fraguada durante el franquismo. Del fútbol español analiza la atribución de un simbolismo a los clubes como una vía para canalizar los conflictos políticos y sociales latentes durante el franquismo y un instrumento que evite enfrentamientos en un Estado democrático configurado por diferentes identidades.\r\n\r\nEsta mirada propia articulada a través de estos tres ejes le permite interpretar los procesos sociales partiendo de los datos obtenidos en la observación de la práctica deportiva y, a su vez, comprender el deporte como un reflejo de la realidad política, económica y social. En esta vinculación tan estrecha entre\r\n\r\ndeporte y sociedad probablemente se halle la clave para entender su pensamiento deportivo.",
				"language": "spa",
				"libraryCatalog": "Tesis Doctorals en Xarxa",
				"numPages": 1528,
				"shortTitle": "El deporte en la vida y en la obra de Manuel Vázquez Montalbán",
				"thesisType": "Ph.D. Thesis",
				"university": "Universitat de Barcelona",
				"rights":"Open Access",
				"url": "http://hdl.handle.net/10803/393947",
				"attachments": [],
				"tags": [
					"070",
					"79",
					"Ciències de l'Educació",
					"Deportes",
					"Esports",
					"Periodisme esportiu",
					"Periodismo deportivo",
					"Sports",
					"Sports journalism",
					"Vázquez Montalbán, Manuel, 1939-2003"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://tdx.cat/handle/10803/393946",
		"items": [
			{
				"itemType": "thesis",
				"title": "Valoración nutricional de jóvenes nadadoras de natación sincronizada",
				"creators": [
					{
						"lastName": "Carrasco Marginet",
						"firstName": "Marta",
						"creatorType": "creator"
					}
				],
				"date": "2015-05-13",
				"abstractNote": "INTRODUCCIÓN: La natación sincronizada es un deporte femenino, técnico-combinatorio de componente artístico, que exige de sus practicantes grandes demandas físicas. Las jóvenes nadadoras conforman una población de riesgo, especialmente cuanto más elevados son los objetivos competitivos que deben asumir. Actualmente se desconocen tanto las necesidades nutricionales, como los hábitos alimentarios que siguen las jóvenes nadadoras en sus primeras etapas de formación hacia la élite deportiva.\r\n\r\nOBJETIVOS: Caracterizar el estado nutricional y de hidratación de un grupo de jóvenes nadadoras de máximo nivel competitivo. Proponer pautas nutricionales para la salud y la mejora del rendimiento deportivo en natación sincronizada.\r\n\r\nMÉTODOS: El estudio es descriptivo y transversal. Se han analizado 49 nadadoras durante un periodo precompetitivo: 34 de categoría infantil (13,9 ± 0,9 años) y 15 de categoría júnior (16,7 ± 0,9 años), según normativa deportiva nacional. El conjunto de variables analizadas (n=108) se agrupan en las siguientes valoraciones: nutricional (n=33), somática (n=31), hematológica y bioquímica (n=32), bioeléctrica (n=6), hídrica (n=6). Todas las variables se han expresado mediante descriptivos básicos (promedio, desviación estándar, valor mínimo y máximo). Se ha utilizado el coeficiente de Kappa y el coeficiente de Spearman para comprobar la validez y fiabilidad inter e intra observador del registro alimentario. Se ha utilizado la prueba t-student (T2 de Hotelling en el caso del análisis del vector bioeléctrico), de muestras independientes para establecer la comparación entre las dos categorías competitivas en todas las variables, y de muestras relacionadas para valorar posibles diferencias hídricas pre y post sesión de entrenamiento. Se ha utilizado la correlación bivariada para comprobar posibles relaciones entre el comportamiento del vector bioeléctrico, el peso y los diferentes compartimentos hídricos. Se ha considerado un nivel de significación de p<0,05.\r\n\r\nRESULTADOS: el registro alimentario de 24 horas realizado 7 días a la semana ha resultado válido (coeficiente Kappa r>0,75; p<0,0001; coeficiente Spearman r>0,85; p<0,0001) y fiable (coeficiente Kappa r>0,73; p<0,0001; coeficiente Spearman r>0,80; p<0,0001) inter e intra sujeto. En ambas categorías se ha registrado un gasto energético superior a la ingesta (p=0,0001). El 85,7% y el 60,0% de las nadadoras infantiles y júniores respectivamente, han registrado un aporte de hidratos de carbono por debajo del 50%. La ingesta de proteínas es superior a las recomendaciones generales (infantiles: 2,5 ± 0,6 g/kg/día; júniores: 2,2 ± 0,4 g/kg/día), situándose por debajo del 50% en proteínas de origen vegetal, y por encima en las de origen animal. El 89,8% de las nadadoras supera el 30% de la ingesta diaria recomendada para los lípidos. Ninguna llega a los requerimientos de grasas monoinsaturadas y poliinsaturadas, y se superan en las grasas saturadas. 15 nadadoras registran valores de ferritina significativamente bajos, llegando incluso a rangos entre 6 y 8 ng/mL. En ambas categorías se han caracterizado bioeléctricamente e hídricamente procesos de deshidratación moderados inducidos por una sesión tipo de entrenamiento.\r\n\r\nCONCLUSIONES: la mayoría de las jóvenes nadadoras poseen hábitos alimentarios no adecuados, ni para mantener un estado de vida saludable, ni para la práctica deportiva. Resulta necesario corregir dichos hábitos en base a una correcta educación y seguimiento\r\n\r\nnutricional. Las valoraciones somática y hematológica, así como el control bioeléctrico y consecuentemente la monitorización del estado de hidratación, deben ayudar a entrenadoras y profesionales de la salud, en el correcto cuidado de éstas jóvenes deportistas, haciendo compatible el necesario equilibrio entre su salud y la capacidad de desarrollar los máximos logros competitivos.",
				"language": "spa",
				"libraryCatalog": "Tesis Doctorals en Xarxa",
				"numPages": 266,
				"thesisType": "Ph.D. Thesis",
				"university": "Universitat de Barcelona",
				"rights":"Open Access",
				"url": "http://hdl.handle.net/10803/393946",
				"attachments": [],
				"tags": [
					"79",
					"Body composition",
					"Ciències de l'Educació",
					"Composició corporal",
					"Composición corporal",
					"Hematologia",
					"Hematology",
					"Hematología",
					"Natació sincronitzada",
					"Natación sincronizada",
					"Nutrició",
					"Nutrición",
					"Nutrition",
					"Synchronized swimming"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
