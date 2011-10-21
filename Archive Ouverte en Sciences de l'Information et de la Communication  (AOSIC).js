{
	"translatorID": "dedcae51-073c-48fb-85ce-2425e97f128d",
	"label": "Archive Ouverte en Sciences de l'Information et de la Communication  (AOSIC)",
	"creator": "Michael Berkowitz",
	"target": "^https?://archivesic\\.ccsd\\.cnrs\\.fr/",
	"minVersion": "1.0.0b4.r5",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "g",
	"lastUpdated": "2011-10-21 14:38:07"
}

function detectWeb(doc, url) {
	if (doc.title.toLowerCase().match(/::\ search|::\ recherche/)) {
	//	return "multiple";
	return false;
	} else if (url.match(/sic_\d+/)) {
		return "journalArticle";
	}
}

var metaTags = {
	"DC.relation":"url",
	"DC.date":"date",
	"DC.description":"abstractNote",
	"DC.creator":"creators",
	"DC.title":"title"
}

function doWeb(doc, url) {
	var articles = new Array();
	if (detectWeb(doc, url) == "multiple") {
		var items = Zotero.Utilities.getItemArray(doc, doc, /sic_\d+\/fr\//);
		items = Zotero.selectItems(items) 
		for (var i in items) {
			articles.push(i);
		}
	} else {
		articles = [url];
	}
	Zotero.Utilities.processDocuments(articles, function(doc) {
		var xpath = '//meta[@name]';
		var data = new Object();
		var metas = doc.evaluate(xpath, doc, null, XPathResult.ANY_TYPE, null);
		var meta;
		while (meta = metas.iterateNext()) {
			if (data[meta.name]) {
				data[meta.name] = data[meta.name] + ";" + meta.content;
			} else {
				data[meta.name] = meta.content;
			}
		}
		Zotero.debug(data);
		var item = new Zotero.Item("journalArticle");
		for (var tag in metaTags) {
			if (tag == "DC.creator") {
				var authors = data['DC.creator'].split(";");
				for each (var aut in authors) {
					aut = aut.replace(/^([^,]+),\s+(.*)$/, "$2 $1");
					item.creators.push(Zotero.Utilities.cleanAuthor(aut, "author"));
				}
			} else {
				item[metaTags[tag]] = data[tag];
			}
		}
		var pdfurl = doc.evaluate('//a[contains(@href, ".pdf")]', doc, null, XPathResult.ANY_TYPE, null).iterateNext().href //.href.match(/url=([^&]+)&/)[1];
		Zotero.debug(pdfurl);
		item.attachments = [
			{url:item.url, title:"AOSIC Snapshot", mimeType:"text/html"},
			{url:pdfurl, title:"AOSIC Full Text PDF", mimeType:"application/pdf"}
		];
		item.complete();
	}, function() {Zotero.done();});
	Zotero.wait();
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://archivesic.ccsd.cnrs.fr/index.php?halsid=373380dfs3bra92v22084ahgg0&view_this_doc=sic_00205049&version=1",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Muriel",
						"lastName": "Foulonneau",
						"creatorType": "author"
					},
					{
						"firstName": "Anne-Marie",
						"lastName": "Badolato",
						"creatorType": "author"
					},
					{
						"firstName": "Wolfram",
						"lastName": "Horstmann",
						"creatorType": "author"
					},
					{
						"firstName": "Karen Van",
						"lastName": "Godtsenhoven",
						"creatorType": "author"
					},
					{
						"firstName": "Mary",
						"lastName": "Robinson",
						"creatorType": "author"
					},
					{
						"firstName": "Sophia",
						"lastName": "Jones",
						"creatorType": "author"
					},
					{
						"firstName": "Martin",
						"lastName": "Feijen",
						"creatorType": "author"
					},
					{
						"firstName": "Kasja",
						"lastName": "Weenink",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"url": "http://archivesic.ccsd.cnrs.fr/sic_00205049/en/",
						"title": "AOSIC Snapshot",
						"mimeType": "text/html"
					},
					{
						"url": "http://archivesic.ccsd.cnrs.fr/docs/00/20/50/49/PDF/foulonneaurevision2.pdf",
						"title": "AOSIC Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"url": "http://archivesic.ccsd.cnrs.fr/sic_00205049/en/",
				"date": "2007-09-28",
				"abstractNote": "Les archives institutionnelles en Europe se sont développées avec des logiques très différentes. Elles se sont structurées dans des réseaux nationaux pour partager les compétences mais aussi créer des outils et services communs. Le projet européen DRIVER (Digital Repositories Infrastructure Vision for European Research) rassemble 5 réseaux européens d'archives, en Allemagne, aux Pays-Bas, au Royaume-Uni, en Belgique et en France pour établir les bases d'une infrastructure européenne fondée sur les archives scientifiques. L'Allemagne a mis l'accent sur la promotion du libre accès et la certification d'archives institutionnelles, les Pays-Bas ont structuré un réseau efficace de collecte des documents et ont créé de nombreux services à valeur ajoutée pour tirer parti de cette masse de contenus. Le Royaume-Uni a créé un partenariat d'archives qui échange des compétences mais développe aussi de nombreux services dont bénéficient les archives britanniques et mondiales. La France a inauguré une plate-forme pluri-disciplinaire sur le modèle des archives disciplinaires telles que arXiv ou CogPrints et a intégré progressivement la problématique des archives institutionnelles avec la création d'un réseau. Enfin la Belgique tire parti du projet européen DRIVER pour inciter les établissements de recherche à créer leur propre archive. Les cultures développées dans chacun des réseaux nationaux font néanmoins apparaître des divergences sur la manière dont les archives ont été créées, mais aussi sur les acteurs qui doivent les alimenter, sur les types de documents à y intégrer, sur les stratégies à développer pour atteindre une masse critique de contenus, sur les missions qu'elles doivent remplir. Les actions visant à favoriser les dépôts par les chercheurs se sont ainsi focalisées sur des aspects différents : la création de services pour les chercheurs, les incitations auprès des établissements de recherche à créer leur propre archive, les actions dirigées vers les organismes de financement de la recherche, enfin les actions visant à mettre en valeur les bénéfices pour les chercheurs en terme de visibilité de leur production scientifique. Alors que la logique institutionnelle a permis dans certains cas d'atteindre des taux de dépôts importants dans les archives, elle se heurte à la logique des services disciplinaires basés sur la contribution par les chercheurs à un corpus collectif de type Web 2.0 qui favorise les échanges et la génération d'idées nouvelles. Cependant, les réseaux nationaux d'archives semblent converger vers des priorités et des axes de développement similaires pour l'avenir, cohérents avec l'évolution des archives disciplinaires. L'intégration des archives dans un contexte plus global, européen aujourd'hui et mondial demain permettra d'articuler des services à valeurs ajoutée basés sur des types d'archives différents, répondant à des besoins variés mais créant des corpus ouverts, sources de nouvelles pratiques scientifiques.",
				"title": "Réseaux d'archives institutionnelles en Europe: logiques de développement et convergences",
				"libraryCatalog": "Archive Ouverte en Sciences de l'Information et de la Communication  (AOSIC)",
				"accessDate": "CURRENT_TIMESTAMP",
				"shortTitle": "Réseaux d'archives institutionnelles en Europe"
			}
		]
	}
]
/** END TEST CASES **/