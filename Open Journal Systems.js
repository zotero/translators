{
	"translatorID": "99b62ba4-065c-4e83-a5c0-d8cc0c75d388",
	"label": "Open Journal Systems",
	"creator": "Aurimas Vinckevicius",
	"target": "/article/view/",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2016-08-18 20:06:17"
}

function detectWeb(doc, url) {
	var pkpLibraries = ZU.xpath(doc, '//script[contains(@src, "/lib/pkp/js/")]');
	if ( ZU.xpathText(doc, '//a[@id="developedBy"]/@href') == 'http://pkp.sfu.ca/ojs/' ||	//some sites remove this
		pkpLibraries.length >= 10) {
		return 'journalArticle';
	}
}

function doWeb(doc, url) {
	//use Embeded Metadata
	var trans = Zotero.loadTranslator('web');
	trans.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	trans.setDocument(doc);

	trans.setHandler('itemDone', function(obj, item) {
		//abstract is supplied in DC:description, so it ends up in extra
		//abstractNote is pulled from description, which is same as title
		item.abstractNote = item.extra;
		item.extra = undefined;

		//if we still don't have abstract, we can try scraping from page
		if(!item.abstractNote) {
			item.abstractNote = ZU.xpathText(doc, '//div[@id="articleAbstract"]/div[1]');
		}
		
		//some journals link to a PDF view page in the header, not the PDF itself
		for(var i=0; i<item.attachments.length; i++) {
			if(item.attachments[i].mimeType == 'application/pdf') {
				item.attachments[i].url = item.attachments[i].url.replace(/\/article\/view\//, '/article/download/');
			}
		}

		item.complete();
	});

	trans.translate();

}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://cab.unime.it/journals/index.php/AAPP/article/view/AAPP.901A1",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "A framework of coopetitive games: Applications to the Greek crisis",
				"creators": [
					{
						"firstName": "David",
						"lastName": "Carfì",
						"creatorType": "author"
					},
					{
						"firstName": "Daniele",
						"lastName": "Schilirò",
						"creatorType": "author"
					}
				],
				"date": "2012/06/08",
				"DOI": "10.1478/AAPP.901A1",
				"ISSN": "1825-1242",
				"abstractNote": "In the present work we propose an original analytical model of coopetitive game. We shall apply this analytical model of coopetition (based on normal form game theory) to the Greek crisis, while conceiving this game theory model at a macro level. We construct two realizations of such model, trying to represent possible realistic macro-economic scenarios of the Germany-Greek strategic interaction. We shall suggest - after a deep and complete study of the two samples - feasible transferable utility solutions in a properly coopetitive perspective for the divergent interests which drive the economic policies in the euro area.",
				"issue": "1",
				"language": "en",
				"libraryCatalog": "cab.unime.it",
				"publicationTitle": "Atti della Accademia Peloritana dei Pericolanti - Classe di Scienze Fisiche, Matematiche e Naturali",
				"rights": "Copyright (c) 2015 AAPP | Physical, Mathematical, and Natural Sciences",
				"shortTitle": "A framework of coopetitive games",
				"url": "http://cab.unime.it/journals/index.php/AAPP/article/view/AAPP.901A1",
				"volume": "90",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
					}
				],
				"tags": [
					"Games and economics",
					"competition",
					"cooperation",
					"coopetition"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://journals.linguisticsociety.org/elanguage/dad/article/view/362.html",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "On Incrementality in Dialogue: Evidence from Compound Contributions",
				"creators": [
					{
						"firstName": "Christine",
						"lastName": "Howes",
						"creatorType": "author"
					},
					{
						"firstName": "Matthew",
						"lastName": "Purver",
						"creatorType": "author"
					},
					{
						"firstName": "Patrick G. T.",
						"lastName": "Healey",
						"creatorType": "author"
					},
					{
						"firstName": "Gregory",
						"lastName": "Mills",
						"creatorType": "author"
					},
					{
						"firstName": "Eleni",
						"lastName": "Gregoromichelaki",
						"creatorType": "author"
					}
				],
				"date": "2011/05/11",
				"DOI": "10.5087/d&d.v2i1.362",
				"ISSN": "2152-9620",
				"abstractNote": "Spoken contributions in dialogue often continue or complete earlier contributions by either the same or a different speaker. These compound contributions (CCs) thus provide a natural context for investigations of incremental processing in dialogue.\n\nWe present a corpus study which confirms that CCs are a key dialogue phenomenon: almost 20% of contributions fit our general definition of CCs, with nearly 3% being the cross-person case most often studied. The results suggest that processing is word-by-word incremental, as splits can occur within syntactic constituents; however, some systematic differences between same- and cross-person cases indicate important dialogue-specific pragmatic effects. An experimental study then investigates these effects by artificially introducing CCs into multi-party text dialogue. Results suggest that CCs affect peoples expectations about who will speak next and whether other participants have formed a coalition or party.\n\nTogether, these studies suggest that CCs require an incremental processing mechanism that can provide a resource for constructing linguistic constituents that span multiple contributions and multiple participants. They also suggest the need to model higher-level dialogue units that have consequences for the organisation of turn-taking and for the development of a shared context.",
				"issue": "1",
				"language": "en",
				"libraryCatalog": "journals.linguisticsociety.org",
				"pages": "279-311",
				"publicationTitle": "Dialogue & Discourse",
				"shortTitle": "On Incrementality in Dialogue",
				"url": "362.html",
				"volume": "2",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.ijdc.net/index.php/ijdc/article/view/8.2.5/",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Disciplinary differences in faculty research data management practices and perspectives",
				"creators": [
					{
						"firstName": "Katherine G.",
						"lastName": "Akers",
						"creatorType": "author"
					},
					{
						"firstName": "Jennifer",
						"lastName": "Doty",
						"creatorType": "author"
					}
				],
				"date": "19/11/2013",
				"DOI": "10.2218/ijdc.v8i2.263",
				"ISSN": "1746-8256",
				"abstractNote": "Academic librarians are increasingly engaging in data curation by providing infrastructure (e.g., institutional repositories) and offering services (e.g., data management plan consultations) to support the management of research data on their campuses. Efforts to develop these resources may benefit from a greater understanding of disciplinary differences in research data management needs. After conducting a survey of data management practices and perspectives at our research university, we categorized faculty members into four research domains—arts and humanities, social sciences, medical sciences, and basic sciences—and analyzed variations in their patterns of survey responses. We found statistically significant differences among the four research domains for nearly every survey item, revealing important disciplinary distinctions in data management actions, attitudes, and interest in support services. Serious consideration of both the similarities and dissimilarities among disciplines will help guide academic librarians and other data curation professionals in developing a range of data-management services that can be tailored to the unique needs of different scholarly researchers.",
				"issue": "2",
				"language": "en",
				"libraryCatalog": "www.ijdc.net",
				"pages": "5-26",
				"publicationTitle": "International Journal of Digital Curation",
				"rights": "Copyright for papers and articles published in this journal is retained by the authors, with first publication rights granted to the University of Edinburgh. It is a condition of publication that authors license their paper or article under a  Creative Commons Attribution Licence .",
				"url": "http://www.ijdc.net/index.php/ijdc/article/view/8.2.5",
				"volume": "8",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://acontracorriente.chass.ncsu.edu/index.php/acontracorriente/article/view/174",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "\"La Huelga de los Conventillos\", Buenos Aires, Nueva Pompeya, 1936. Un aporte a los estudios sobre género y clase",
				"creators": [
					{
						"firstName": "Verónica",
						"lastName": "Norando",
						"creatorType": "author"
					},
					{
						"firstName": "Ludmila",
						"lastName": "Scheinkman",
						"creatorType": "author"
					}
				],
				"date": "2011",
				"ISSN": "1548-7083",
				"abstractNote": "Este trabajo se propone realizar un análisis de las relaciones de género y clase a través de un estudio de caso: la “Huelga de los Conventillos” de la fábrica textil Gratry en 1936, que se extendió por más de tres meses, pasando casi inadvertida, sin embargo, para la investigación histórica. Siendo la textil una rama de industria con una mayoría de mano de obra femenina, el caso de la casa Gratry, donde el 60% de los 800 obreros eran mujeres, aparece como ejemplar para la observación de la actividad de las mujeres en conflicto. En el trabajo se analiza el rol de las trabajadoras en la huelga, su participación política, sus formas de organización y resistencia, haciendo eje en las determinaciones de género y de clase que son abordadas de manera complementaria e interrelacionada, así como el complejo entramado de tensiones y solidaridades que éstas generan. De éste modo, se pretende ahondar en la compleja conformación de una identidad obrera femenina, a la vez que se discute con aquella mirada historiográfica tradicional que ha restado importancia a la participación de la mujer en el conflicto social. Esto se realizará a través de la exploración de una serie de variables: las relaciones inter-género e inter-clase (fundamentalmente el vínculo entre las trabajadoras y la patronal masculina), inter-género e intra-clase (la relación entre trabajadoras y trabajadores), intra-género e inter-clase (los lazos entre las trabajadoras y las vecinas comerciantes del barrio), intra-género e intra-clase (relaciones de solidaridad entre trabajadoras en huelga, y de antagonismo entre huelguistas y “carneras”). Para ello se trabajó un corpus documental que incluye información de tipo cuantitativa (las estadísticas del Boletín Informativo del Departamento Nacional del Trabajo), y cualitativa: periódicos obreros –fundamentalmente El Obrero Textil, órgano gremial de la Unión Obrera Textil, Semanario de la CGT-Independencia (órgano de la Confederación General del Trabajo (CGT)-Independencia) y La Vanguardia (periódico del Partido Socialista), entre otros, y entrevistas orales a vecinas de Nueva Pompeya y familiares de trabajadoras de la fábrica Gratry. Se desarrollará una metodología cuali-cuantitativa para el cruce de estas fuentes.",
				"issue": "1",
				"itemID": "AC174",
				"libraryCatalog": "Open Journal Systems",
				"pages": "1–37",
				"publicationTitle": "A Contracorriente",
				"url": "http://acontracorriente.chass.ncsu.edu/index.php/acontracorriente/article/view/174",
				"volume": "9",
				"attachments": [
					{
						"title": "Snapshot"
					}
				],
				"tags": [
					"huelga",
					"relaciones de género",
					"trabajadores",
					"trabajadroras"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://journals.ub.uni-heidelberg.de/index.php/ip/article/view/31976/26301",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Anleitung zur Organisation von Webkonferenzen am Beispiel der “Bibcast”-Aktion zum Bibliothekskongress 2016",
				"creators": [
					{
						"firstName": "Daniel",
						"lastName": "Beucke",
						"creatorType": "author"
					},
					{
						"firstName": "Arvid",
						"lastName": "Deppe",
						"creatorType": "author"
					},
					{
						"firstName": "Tracy",
						"lastName": "Hoffmann",
						"creatorType": "author"
					},
					{
						"firstName": "Felix",
						"lastName": "Lohmeier",
						"creatorType": "author"
					},
					{
						"firstName": "Christof",
						"lastName": "Rodejohann",
						"creatorType": "author"
					},
					{
						"firstName": "Pascal Ngoc Phu",
						"lastName": "Tu",
						"creatorType": "author"
					}
				],
				"date": "2016/08/16",
				"ISSN": "2297-3249",
				"issue": "2",
				"language": "de",
				"libraryCatalog": "journals.ub.uni-heidelberg.de",
				"publicationTitle": "Informationspraxis",
				"rights": "Copyright (c) 2016 Daniel Beucke, Arvid Deppe, Tracy Hoffmann, Felix Lohmeier, Christof Rodejohann, Pascal Ngoc Phu Tu",
				"url": "http://journals.ub.uni-heidelberg.de/index.php/ip/article/view/31976",
				"volume": "2",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.mediaesthetics.org/index.php/mae/article/view/50",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "World War II in American Movie Theatres from 1942-45: On Images of Civilian and Military Casualties and the Negotiation of a Shared Experience",
				"creators": [
					{
						"firstName": "David",
						"lastName": "Gaertner",
						"creatorType": "author"
					}
				],
				"date": "2016/06/23",
				"abstractNote": "This study deals with the question of genre cinema in terms of an aesthetic experience that also accounts for a shared experience. The focus will be on the historical framework that constituted the emotional mobilization of the American public during World War II when newsreels and fictional war films were screened together as part of the staple program in movie theaters. Drawing on existing concepts of cinema and public sphere as well as on a phenomenological theory of spectator engagement this study sets out to propose a definition of the term moviegoing experience. On these grounds a historiographical account of the institutional practice of staple programming shall be explored together with a theoretical conceptualization of the spectator within in the realm of genre cinema.Diese Studie befragt das Genrekino als Modus ästhetischer Erfahrung in Hinblick auf die konkrete geteilten Erfahrung des Kinosaals. Der Fokus liegt auf den historischen Rahmenbedingen der emotionalen Mobilisierung der US-amerikanischen Öffentlichkeit während des Zweiten Weltkriegs und der gemeinsamen Vorführung von Kriegsnachrichten und fiktionalen Kriegsfilmen in Kinoprogrammen. Dabei wird auf Konzepte des Kinos als öffentlichem Raum und auf phänomenologische Theorien der Zuschaueradressierung Bezug genommen und ein integrative Definition der moviegoing experience entworfen. Dadurch ist es möglich, historiographische Schilderungen der institutionalisierten Praktiken der Kinoprogrammierung mit theoretischen Konzeptualisierungen der Zuschauererfahrung und des Genrekinos ins Verhältnis zu setzen.David Gaertner, M.A. is currently writing his dissertation on the cinematic experience of World War II and is a lecturer at the division of Film Studies at Freie Universität Berlin. From 2011 to 2014 he was research associate in the project “Staging images of war as a mediated experience of community“. He is co-editor of the book “Mobilisierung der Sinne. Der Hollywood-Kriegsfilm zwischen Genrekino und Historie” (Berlin 2013). // David Gaertner, M.A. arbeitet an einer Dissertation zur Kinoerfahrung im Zweiten Weltkrieg und lehrt am Seminar für Filmwissenschaft an der Freien Universität Berlin. 2011 bis 2014 war er wissenschaftlicher Mitarbeiter im DFG-Projekt „Inszenierungen des Bildes vom Krieg als Medialität des Gemeinschaftserlebens“. Er ist Mitherausgeber des Sammelbands “Mobilisierung der Sinne. Der Hollywood-Kriegsfilm zwischen Genrekino und Historie” (Berlin 2013).",
				"issue": "1",
				"language": "en",
				"libraryCatalog": "www.mediaesthetics.org",
				"publicationTitle": "mediaesthetics - Journal of Poetics of Audiovisual Images",
				"rights": "Copyright (c) 2016 David Gaertner",
				"shortTitle": "World War II in American Movie Theatres from 1942-45",
				"url": "http://www.mediaesthetics.org/index.php/mae/article/view/50",
				"volume": "0",
				"attachments": [
					{
						"title": "Snapshot"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://0277.ch/ojs/index.php/cdrs_0277/article/view/101",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Pricing bei wissenschaftlichen Zeitschriften",
				"creators": [
					{
						"firstName": "Raymond",
						"lastName": "Dettwiler",
						"creatorType": "author"
					}
				],
				"date": "2016/03/14",
				"DOI": "10.12685/027.7-4-1-101",
				"ISSN": "2296-0597",
				"abstractNote": "Der Artikel beschreibt die drei Preisverfahren, die im Preismanagement angewendet werden und zeigt, dass trotz neuer Preisverfahren die Preismodelle bei wissenschaftlichen Zeitschriften immer noch kostenorientiert oder wettbewerbsorientiert sind. Das nutzenorientierte Preisverfahren wartet noch auf seine Umsetzung.This article describes the three modes of pricing which have been applied by price management. Although new pricing models are existing pricing models at scientific journals remain cost oriented or competitor oriented. The value oriented pricing is still waiting for realisation.",
				"issue": "1",
				"language": "de",
				"libraryCatalog": "0277.ch",
				"publicationTitle": "027.7 Zeitschrift für Bibliothekskultur / Journal for Library Culture",
				"rights": "Copyright (c) 2016 027.7 Zeitschrift für Bibliothekskultur / Journal for Library Culture",
				"url": "http://0277.ch/ojs/index.php/cdrs_0277/article/view/101",
				"volume": "4",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.qualitative-research.net/index.php/fqs/article/view/2477",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Computer Analysis of Qualitative Data in Literature and Research Performed by Polish Sociologists",
				"creators": [
					{
						"firstName": "Jakub",
						"lastName": "Niedbalski",
						"creatorType": "author"
					},
					{
						"firstName": "Izabela",
						"lastName": "Ślęzak",
						"creatorType": "author"
					}
				],
				"date": "2016/07/28",
				"ISSN": "1438-5627",
				"abstractNote": "The application of computer-assisted qualitative data analysis software (CAQDAS) in the field of qualitative sociology is becoming more popular. However, in Polish scientific research, the use of computer software to aid qualitative data analysis is uncommon. Nevertheless, the Polish qualitative research community is turning to CAQDAS software increasingly often. One noticeable result of working with CAQDAS is an increase in methodological awareness, which is reflected in higher accuracy and precision in qualitative data analysis. Our purpose in this article is to describe the qualitative researchers' environment in Poland and to consider the use of computer-assisted qualitative data analysis. In our deliberations, we focus mainly on the social sciences, especially sociology.URN: http://nbn-resolving.de/urn:nbn:de:0114-fqs160344",
				"issue": "3",
				"language": "en",
				"libraryCatalog": "www.qualitative-research.net",
				"publicationTitle": "Forum Qualitative Sozialforschung / Forum: Qualitative Social Research",
				"rights": "Copyright (c) 2016 Jakub Niedbalski, Izabela Ślęzak",
				"url": "http://www.qualitative-research.net/index.php/fqs/article/view/2477",
				"volume": "17",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
					}
				],
				"tags": [
					"CAQDAS",
					"Polen",
					"Polish sociology",
					"Software",
					"Soziologie",
					"computer-assisted qualitative data analysis",
					"computergestützte Datenanalyse",
					"qualitative Forschung",
					"qualitative research"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://heiup.uni-heidelberg.de/journals/index.php/transcultural/article/view/23541",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "On the Threshold of the \"Land of Marvels:\" Alexandra David-Neel in Sikkim and the Making of Global Buddhism",
				"creators": [
					{
						"firstName": "Samuel",
						"lastName": "Thévoz",
						"creatorType": "author"
					}
				],
				"date": "2016/07/21",
				"DOI": "10.17885/heiup.ts.23541",
				"ISSN": "2191-6411",
				"abstractNote": "Alexandra David-Neel had already been acquainted with the Himalayas for a long time before the visits to Tibet in 1924 that would make her a mainstream figure of modern Buddhism. In fact, her encounter with Tibet and Tibetan Buddhism can be linked with Sikkim, where she arrived in 1912 after visiting India. An exploration of her Sikkim stay invites us to reconsider the self-fashioning of David-Neel’s image as an explorer of what she called the “land of marvels.” This paper highlights her construction of Sikkim as the locality that helped her create her singular vision of Tibet. Her encounters with local Buddhists in Sikkim provided her with the lofty images of a spiritual Tibet that she contributed to publicizing in the wake of the globalization of Buddhism.",
				"issue": "1",
				"language": "en",
				"libraryCatalog": "heiup.uni-heidelberg.de",
				"pages": "149-186",
				"publicationTitle": "Transcultural Studies",
				"rights": "Copyright (c) 2016 Samuel Thevoz",
				"shortTitle": "On the Threshold of the \"Land of Marvels",
				"url": "http://heiup.uni-heidelberg.de/journals/index.php/transcultural/article/view/23541",
				"volume": "0",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
					}
				],
				"tags": [
					"Alexandra David-Neel",
					"Cultural Globalization",
					"Himalayan Borderlands",
					"Modern Buddhism",
					"Tibetan Buddhism",
					"Travel Writing",
					"World Literature"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.zeitschrift-fuer-balkanologie.de/index.php/zfb/article/view/423",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Nachträge zur Bio-Bibliographie von Ármin(ius) Vámbéry [V]",
				"creators": [
					{
						"firstName": "Michael",
						"lastName": "Knüppel",
						"creatorType": "author"
					}
				],
				"date": "2016/03/18",
				"ISSN": "0044-2356",
				"abstractNote": "Der Verfasser setzt mit diesem Beitrag seine Serie, in der Ergänzungen und Korrekturen zur Bio-Bibliographie des großen ungarischen Reisenden und Entdeckers sowie Pioniers der Zentralasienforschung Á. Vámbéry (1832–1913) gegeben wurden, fort. Zudem findet sich im Anhang zum bio-bibliographischen Teil des Beitrags ein Brief Vámbérys an den Ethnologen und Geographen Richard Andree (1835–1912).",
				"issue": "2",
				"language": "de",
				"libraryCatalog": "www.zeitschrift-fuer-balkanologie.de",
				"publicationTitle": "Zeitschrift für Balkanologie",
				"rights": "Copyright (c) 2016 Harrassowitz Verlag",
				"url": "http://www.zeitschrift-fuer-balkanologie.de/index.php/zfb/article/view/423",
				"volume": "51",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://journals.ub.uni-heidelberg.de/index.php/miradas/article/view/22445",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Un desafío a la construcción de la identidad en la fotografía de Carlos Ruiz-Valarino",
				"creators": [
					{
						"firstName": "Laura Bravo",
						"lastName": "López",
						"creatorType": "author"
					}
				],
				"date": "2015/07/21",
				"DOI": "10.11588/mira.2015.0.22445",
				"ISSN": "2363-8087",
				"abstractNote": "La obra fotográfica del artista puertorriqueño Carlos Ruiz-Valarino plantea un marcado contraste con una de las tradiciones más arraigadas en la historia del arte de esta isla del Caribe, que es la representación de una identidad cultural construida a través de símbolos. Recurriendo a la parodia a través de tres géneros pictóricos, como son el paisaje, el retrato y el objeto (en el marco de la naturaleza muerta), Ruiz-Valarino cuestiona los símbolos que reiteradamente se emplean en la construcción de un concepto tan controvertido como es el de identidad, conversando para ello con la tradición iconográfica de la fotografía antropológica y etnográfica, así como la de la ilustración científica o la caricatura.",
				"issue": "0",
				"language": "es",
				"libraryCatalog": "journals.ub.uni-heidelberg.de",
				"pages": "36-49",
				"publicationTitle": "Miradas - Elektronische Zeitschrift für Iberische und Ibero-amerikanische Kunstgeschichte",
				"rights": "Copyright (c) 2015 Miradas - Elektronische Zeitschrift für Iberische und Ibero-amerikanische Kunstgeschichte",
				"url": "http://journals.ub.uni-heidelberg.de/index.php/miradas/article/view/22445",
				"volume": "2",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
					}
				],
				"tags": [
					"Fotografía",
					"Puerto Rico",
					"antropología",
					"etnografía",
					"iconografía"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://ojs.ub.uni-konstanz.de/ba/article/view/6175",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Was kann Plagiatserkennungs-Software?",
				"creators": [
					{
						"firstName": "Ansgar",
						"lastName": "Schäfer",
						"creatorType": "author"
					}
				],
				"date": "2015/05/17",
				"ISSN": "0342-9635",
				"abstractNote": "-",
				"issue": "99",
				"language": "de",
				"libraryCatalog": "ojs.ub.uni-konstanz.de",
				"publicationTitle": "Willkommen bei Bibliothek aktuell",
				"rights": "Copyright (c) 2015 Willkommen bei Bibliothek aktuell",
				"url": "https://ojs.ub.uni-konstanz.de/ba/article/view/6175",
				"volume": "0",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.querelles.de/index.php/qjb/article/view/29",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Anonymität nach dem Tod: Subjektive Deutungen anonymer Bestattung und genderbezogene Differenzen",
				"creators": [
					{
						"firstName": "Nicole",
						"lastName": "Sachmerda-Schulz",
						"creatorType": "author"
					},
					{
						"firstName": "Paul Sebastian",
						"lastName": "Ruppel",
						"creatorType": "author"
					}
				],
				"date": "2014/04/10",
				"DOI": "10.15461/29",
				"ISSN": "2191-9127",
				"abstractNote": "Anonyme Bestattungen haben in den letzten Jahrzehnten in Deutschland stark zugenommen. Damit hat sich neben traditionellen Formen der Bestattung und Grabgestaltung eine Beisetzungsform etablieren können, bei der das Grab nicht namentlich gekennzeichnet und daher für die Öffentlichkeit sowie häufig auch für Angehörige nicht auffindbar ist. Der Frage, was es bedeutet, bei der Grabwahl auf die Namensnennung und damit auf die Lokalisierung der persönlichen Grabstätte zu verzichten, wird im Beitrag anhand offener Leitfadeninterviews mit Personen, die sich für eine anonyme Bestattung entschieden haben, nachgegangen. In der Analyse der im Rahmen einer Grounded-Theory-Studie erhobenen und ausgewerteten Daten werden Aspekte deutlich, die sich zum Beispiel um Kontrollierbarkeit eigener Belange bis über den Tod hinaus, ein auf Inklusion und Exklusion abzielendes Handeln sowie scheinbar paradoxe Momente von Individualitätsstreben drehen. Zudem zeigen sich hier auffällige Differenzen zwischen Frauen und Männern: Die Präsentation bzw. Repräsentation von Weltanschauungen und Werthaltungen stellt für die Interviewpartner eine Triebfeder für die Entscheidung für eine Anonymbestattung dar. Aussagen der Interviewpartnerinnen indes verweisen darauf, dass diese Entscheidung primär einer pragmatischen und am sozialen Umfeld ausgerichteten Orientierung folgt.",
				"issue": "0",
				"language": "de",
				"libraryCatalog": "www.querelles.de",
				"publicationTitle": "QJB – Querelles. Jahrbuch für Frauen- und Geschlechterforschung",
				"rights": "Copyright (c) 2014 Nicole Sachmerda-Schulz, Paul Sebastian Ruppel",
				"shortTitle": "Anonymität nach dem Tod",
				"url": "http://www.querelles.de/index.php/qjb/article/view/29",
				"volume": "17",
				"attachments": [
					{
						"title": "Snapshot"
					}
				],
				"tags": [
					"Anonymität",
					"Bestattung",
					"Genderdifferenzen",
					"Säkularisierung",
					"Tod",
					"anonymity",
					"burial",
					"death",
					"gender difference",
					"secularisation"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.ajol.info/index.php/thrb/article/view/63347",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Knowledge, treatment seeking and preventive practices in respect of malaria among patients with HIV at the Lagos University Teaching Hospital",
				"creators": [
					{
						"firstName": "Akinwumi A.",
						"lastName": "Akinyede",
						"creatorType": "author"
					},
					{
						"firstName": "Alade",
						"lastName": "Akintonwa",
						"creatorType": "author"
					},
					{
						"firstName": "Charles",
						"lastName": "Okany",
						"creatorType": "author"
					},
					{
						"firstName": "Olufunsho",
						"lastName": "Awodele",
						"creatorType": "author"
					},
					{
						"firstName": "Duro C.",
						"lastName": "Dolapo",
						"creatorType": "author"
					},
					{
						"firstName": "Adebimpe",
						"lastName": "Adeyinka",
						"creatorType": "author"
					},
					{
						"firstName": "Ademola",
						"lastName": "Yusuf",
						"creatorType": "author"
					}
				],
				"date": "2011-01-01",
				"DOI": "10.4314/thrb.v13i4.63347",
				"ISSN": "1821-9241",
				"abstractNote": "The synergistic interaction between Human Immunodeficiency virus (HIV) disease and Malaria makes it mandatory for patients with HIV to respond appropriately in preventing and treating malaria. Such response will help to control the two diseases. This study assessed the knowledge of 495 patients attending the HIV clinic, in Lagos University Teaching Hospital, Nigeria.  Their treatment seeking, preventive practices with regards to malaria, as well as the impact of socio – demographic / socio - economic status were assessed. Out of these patients, 245 (49.5 %) used insecticide treated bed nets; this practice was not influenced by socio – demographic or socio – economic factors.  However, knowledge of the cause, knowledge of prevention of malaria, appropriate use of antimalarial drugs and seeking treatment from the right source increased with increasing level of education (p < 0.05). A greater proportion of the patients, 321 (64.9 %) utilized hospitals, pharmacy outlets or health centres when they perceived an attack of malaria. Educational intervention may result in these patients seeking treatment from the right place when an attack of malaria fever is perceived.",
				"issue": "4",
				"language": "en",
				"libraryCatalog": "www.ajol.info",
				"publicationTitle": "Tanzania Journal of Health Research",
				"rights": "Copyright for articles published in this journal is retained by the journal.",
				"url": "http://www.ajol.info/index.php/thrb/article/view/63347",
				"volume": "13",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
					}
				],
				"tags": [
					"HIV patients",
					"Nigeria",
					"knowledge",
					"malaria",
					"prevention",
					"treatment"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/