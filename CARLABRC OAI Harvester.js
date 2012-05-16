{
	"translatorID": "31649d9d-8f7e-4b87-8678-b3e68ee98f39",
	"label": "CARL/ABRC OAI Harvester",
	"creator": "Sebastian Karcher",
	"target": "^https?://carl-abrc-oai",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2012-05-11 06:22:36"
}

function detectWeb(doc, url) {
	if (doc.title.match("Search")) {
		return "multiple";
	} else if (doc.title.match("Browse")) {
		return "multiple";
	} else if (doc.title.match("Record")) {
		return "book";
	}
}

function associateData(newItem, dataTags, field, zoteroField) {
	if (dataTags[field]) {
		newItem[zoteroField] = dataTags[field];
	}
}

function scrape(doc, url) {
	var dataTags = new Object();
	var allAuthors = new Array();
	var newItem = new Zotero.Item("book");

	var tags = ZU.xpath(doc, '//tr[@valign="top"]/td[1]');
	var content = ZU.xpath(doc, '//tr[@valign="top"]/td[2]');
	for (var i in tags) {

		fieldTitle = tags[i].textContent;

		if (fieldTitle == "Creator") {

			var allAuthors = content[i].textContent.trim();
			var author = allAuthors.split(/[\n\t\;]+/);
			for (var i in author) {
				newItem.creators.push(ZU.cleanAuthor(author[i], "author", true));
			}
		}
		if (fieldTitle == "Contributor") {
			var allAuthors = content[i].textContent.trim();
			var author = allAuthors.split(/\s*;\s*/);
			for (var i in author) {
				newItem.creators[i] = ZU.cleanAuthor(author[i], "contributor", true);
			}
		}
		if (fieldTitle == "Date") {
			newItem.date = ZU.trimInternal(content[i].textContent).replace(/T.+/, "");
		}
		if (fieldTitle == "Subject") {
			var keywords = content[i].textContent.split(/[\n\t]+/)
			for (var j in keywords) {
				newItem.tags.push(keywords[j])
			}
		} else {
			dataTags[fieldTitle] = content[i].textContent
		}

	}
	associateData(newItem, dataTags, "Title", "title");
	associateData(newItem, dataTags, "Description", "abstractNote");
	associateData(newItem, dataTags, "Language", "language");
	newItem.url = doc.location.href;
	newItem.attachments = [{
		document: doc,
		title: "CARL-ARBRC Record",
		type: "text/html"
	}];
	newItem.complete();
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		var items = new Object();
		var articles = new Array();
		var titles = doc.evaluate('//span[@class="title"]', doc, null, XPathResult.ANY_TYPE, null);
		var links = doc.evaluate('//div[@class="recordContents"]/a', doc, null, XPathResult.ANY_TYPE, null);

		var next_title;
		while (next_title = titles.iterateNext()) {
			items[links.iterateNext().href] = next_title.textContent;
			links.iterateNext();
		}
		Zotero.selectItems(items, function (items) {
			if (!items) {
				return true;
			}
			for (var i in items) {
				articles.push(i);
			}
			Zotero.Utilities.processDocuments(articles, scrape, function () {
				Zotero.done();
			});
			Zotero.wait();
		});
	} else {
		scrape(doc, url)
	}
} 
/** BEGIN TEST CASES **/
var testCases = [{
	"type": "web",
	"url": "http://carl-abrc-oai.lib.sfu.ca/index.php/record/view/132134",
	"items": [{
		"itemType": "book",
		"creators": [{
			"lastName": "James Cisneros",
			"creatorType": "contributor"
		}, {
			"firstName": "Christian",
			"lastName": "Pageau",
			"creatorType": "author"
		}],
		"notes": [],
		"tags": ["", "Symbolique du Sud", "Impérialisme", "Néocolonialisme", "Éthique artistique", "Dictature argentine", "Tango", "Art précolombien", "Art moderne", "Amovibilité du centre", "Hétérotopie", "Symbolism of the South", "Imperialism", "Neocolonialism", "Artistic ethics", "Argentine dictatorship", "Tango", "Pre-Colombian art", "Modern art", "Moveable center", "Heterotopia", "Literature - Modern / Littérature - Moderne (UMI : 0298)", ""],
		"seeAlso": [],
		"attachments": [{
			"title": "CARL-ARBRC Record",
			"type": "text/html"
		}],
		"date": "2010-11-17",
		"title": "El Sur como espacio identitario en Torres García, Borges y Solanas",
		"abstractNote": "L’étude conceptualise la symbolique du Sud en tant qu’espace identitaire\nconstruit par une idéologie politique et une esthétique.\nLes cartes géographiques inversées (1936, 1943) de Joaquín Torres García\n(Uruguay) sont une prise de position politique qui affirme le pouvoir d’énonciation des\nartistes latino-américains de façon indépendante aux centres culturels européens. Sa\nthéorie, l’« Universalisme Constructif », propose un nouvel art pour l’Amérique latine,\ncombinant l’éthique artistique précolombienne et l’abstraction moderniste.\nDans la nouvelle « Le Sud » (1953) et l’essai « L’écrivain argentin et la\ntradition » (1951), Jorge Luis Borges (Argentine) redéfinit la littérature latino\naméricaine, marginalisée et périphérique, en tant que littérature qui a droit à toute la\nculture occidentale. Il rejette une culture qui ne serait que nationaliste.\nLe diptyque de Fernando Solanas (Argentine) formé des films Sud (1985) et\nTangos, l’exil de Gardel (1988) est étudié à partir de son manifeste « Vers un Tiers-\nCinéma » (1969), coécrit avec Octavio Getino. Dans le diptyque, le Sud est un espace\nde dénonciation des censures de la dictature et de l’impérialisme, mais aussi un espace\nde rénovation culturelle et identitaire. Dans son cinéma, Solanas utilise un produit\nculturel régional, le tango, comme outil de dénonciation politique.\nTout au long de l’étude, on utilise des notions de Michel Foucault,\n(hétérotopie) et de Walter Mignolo (le centre amovible) pour approfondir le sens de\nl’espace Sud.\n\t\t\t\t\t\n\t\t\t\t\t\t\t\t\t\t\t\t\t\t\tThis study conceptualizes the symbolism of the South as an identity space built\nby a political ideology and a local aesthetics.\nThe Uruguay artist Joaquín Torres García’s inverted maps (1936, 1943) are a\npolitical stand that asserts the enunciative power of Latin American artists who create\nindependently of the European cultural centers. His theory of “Constructive\nUniversalism\" proposes a new art for Latin America, for the South, and originating in\nthe South, by combining pre-Colombian artistic ethics and modernist abstraction.\nIn the short story \"The South\" (1953) and the essay \"The Argentine writer and\nthe tradition\" (1951), the Argentine writer Jorge Luis Borges redefines South\nAmerican literature, marginalized and peripheral, as a literature that is entitled to all\naspects of the Western culture. By doing so, he rejects a culture that would only be\nnationalist.\nWe analyze Argentine filmmaker Fernando Solanas’ cinematic diptych, which\nincludes the films South (1985) and Tangos, the Exile of Gardel (1988) in dialogue\nwith the manifesto \"Towards a Thrid Cinema\" (1969), co-written with Octavio Getino.\nThe South is seen as a space for the denunciation of the censorships imposed by the\ndictatorship and imperialism, but also as a space for the renovation of culture and\nidentity. In the two movies, Solanas uses a regional cultural product, the tango, as tool\nof political denunciation.\nThroughout the study, we use Michel Foucault's notion of “heterotopia” and\nWalter Mignolo’s concept of the “moveable center” to explore South’s multiple\nmeanings.\n\t\t\t\t\t\n\t\t\t\t\t\t\t\t\t\t\t\t\t\t\tEsta memoria conceptualiza la simbólica del Sur como un espacio identitario\nconstruido por una ideología política y una estética.\nLos mapas geográficos inversos de (1936, 1943) de Joaquín Torres García\n(Uruguay) son una postura política que afirma el poder de enunciación de los artistas\nlatinoamericanos de modo independiente con respecto a los centros culturales\neuropeos. Su teoría, el Universalismo Constructivo, propone un nuevo arte para\nAmérica Latina que combina la ética artística precolombina y la abstracción\nmodernista.\nEn el cuento “El Sur” (1953), y el ensayo “El escritor argentino y la tradición”\n(1951), Jorge Luis Borges (Argentina) vuelve a definir la literatura latinoamericana,\nmarginada y periférica, como una literatura que tiene derecho a toda la cultura\noccidental. Rechaza una cultura que sólo sería nacionalista.\nEstudiamos el díptico de Fernando Solanas (Argentina), constituido por las\npelículas Sur (1985) y Tangos, el exilio de Gardel (1988) a partir del manifiesto\n“Hacia un Tercer Cine” (1969), co-escrito con Octavio Getino. En el díptico, el Sur es\nun espacio de denuncia de las censuras de la dictadura y del imperialismo, pero\ntambién un espacio de renovación cultural e identitaria. En su cine, Solanas utiliza un\nproducto cultural regional, el tango, como instrumento de denuncia política.\nA lo largo del estudio, utilizamos nociones de Michel Foucault, (heterotopía) y\nde Walter Mignolo (movilidad del centro) para ahondar en el significado del espacio\nSur.",
		"language": "es",
		"url": "http://carl-abrc-oai.lib.sfu.ca/index.php/record/view/132134",
		"libraryCatalog": "CARL/ABRC OAI Harvester",
		"accessDate": "CURRENT_TIMESTAMP"
	}]
}, {
	"type": "web",
	"url": "http://carl-abrc-oai.lib.sfu.ca/index.php/record/view/177926",
	"items": [{
		"itemType": "book",
		"creators": [{
			"firstName": "Maria Graciela",
			"lastName": "Giordano",
			"creatorType": "author"
		}],
		"notes": [],
		"tags": ["", "Argentine fiction -- 20th century -- Political aspects.", "Argentine fiction -- 20th century -- Women authors -- History and criticism.", "Motion pictures -- Argentina.", "Motion pictures -- Political aspects -- Argentina.", ""],
		"seeAlso": [],
		"attachments": [{
			"title": "CARL-ARBRC Record",
			"type": "text/html"
		}],
		"date": "2005",
		"title": "Más allá del trauma colectivo : represión y exilio en la narrativa de mujeres y el cine argentino",
		"abstractNote": "Argentine literature at the close of the twentieth century is characterized by a marked interest in the themes of dictatorship, marginality, and exile. Given the shifting of public and private spaces in the country's recent history, a \"sinister\" space has appeared in the collective subconscious, where all that was negated, prohibited and repressed is now (re)surfacing with tremendous energy in a constant probing into the collective memory effectuated from still present traumas without closure.\n\t\t\t\t\t\n\t\t\t\t\t\t\t\t\t\t\t\t\t\t\tThe purpose of this dissertation is to analyse the \"social tics\" which flourish in various art forms, as well as in the underpinnings of Argentine society, and come from the fact that collective suffering has created a defined present which controls the past, and, inevitably, influences the future. In turn, certain themes thus emerge from subjective and fragmented spaces of enunciation where memory plays a crucial role.\n\t\t\t\t\t\n\t\t\t\t\t\t\t\t\t\t\t\t\t\t\tIn order to do this, I concentrate here on alternative cultural productions to the official propaganda produced during and after the period of dictatorship, paying special attention to women's narratives and testimonies or memoirs of repression. Finally, I undertake an analysis of certain selected cinematographic productions which, like the contemporary literature analysed here, also form part of the movement that demonstrates the need to question Argentine reality---present and past---by foregrounding collective and individual memory in opposition to the generalized trend of amnesia/anaesthesia to point up the very real danger inherent in such \"historic amnesia.\" Taken together, these works reveal the existence of a past that must be recaptured and redeemed, but which, given the existence of the negated and silenced \"sinister\" space in contemporary reality, forms only a small part of Argentine history still under construction.",
		"language": "sp",
		"url": "http://carl-abrc-oai.lib.sfu.ca/index.php/record/view/177926",
		"libraryCatalog": "CARL/ABRC OAI Harvester",
		"accessDate": "CURRENT_TIMESTAMP",
		"shortTitle": "Más allá del trauma colectivo"
	}]
}]
/** END TEST CASES **/
