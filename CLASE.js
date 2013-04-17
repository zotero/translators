{
	"translatorID": "1dd21245-29cf-434d-b5b8-49eae0a6912a",
	"label": "CLASE",
	"creator": "Sebastian Karcher",
	"target": "^https?://132\\.248\\.9\\.1\\:",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2013-04-17 03:09:28"
}

function detectWeb(doc, url) {
	if (url.indexOf("func=full-set") != -1) return "journalArticle"
	//Items load too slowly and the translator misfires for multiples
	//	else if (url.indexOf("func=short") != -1) return "multiple";
}

function cleanAuthorstring(author) {
  	//removes author number in parentheses and e-mails
	author = author.replace(/\(\d+\)/, "").replace(/[^\s]+@[^\s]+/, "").replace(/\-\s*$/, "")
	return author
}

function scrape(doc, url) {
	var newItem = new Zotero.Item("journalArticle");
	var title = ZU.xpathText(doc, '//tr/td[@id="bold" and contains(text(), "Título")]/following-sibling::td');
	var publication = ZU.xpathText(doc, '//tr/td[@id="bold" and contains(text(), "Revista")]/following-sibling::td');
	var date = ZU.xpathText(doc, '//tr/td[@id="bold" and contains(text(), "Año de la revista")]/following-sibling::td');
	var ISSN = ZU.xpathText(doc, '//tr/td[@id="bold" and contains(text(), "ISSN")]/following-sibling::td');
	var language = ZU.xpathText(doc, '//tr/td[@id="bold" and contains(text(), "Idioma") and not(contains(text(), "resumen"))]/following-sibling::td');
	var abstract = ZU.xpathText(doc, '//tr/td[@id="bold" and contains(text(), "Resumen")]/following-sibling::td');
	var fulltext = ZU.xpathText(doc, '//tr/td[@id="bold" and contains(text(), "Texto completo")]/following-sibling::td');
	//Descripción field has pages, issue and volume
	var description = ZU.xpathText(doc, '//tr/td[@id="bold" and contains(text(), "Descripción")]/following-sibling::td');
	if (description) {
		var volume = description.match(/V([^\s]+)/);
		var issue = description.match(/N([^\s]+)/);
		var pages = description.match(/P([^\s]+)/);
	}


	//Authors and Tags can have multiple rows. In that case the td[1] remains empty we loop through them until that's no longer the case

	var author1 = ZU.xpathText(doc, '//tr/td[@id="bold" and contains(text(), "Autor")]/following-sibling::td');
	if (author1) newItem.creators.push(ZU.cleanAuthor(cleanAuthorstring(author1), "author", true))
	var authorloop = ZU.xpath(doc, '//tr[td[@id="bold" and contains(text(), "Autor")]]/following-sibling::tr/td[1]')
	var author;
	for (var i in authorloop) {
		if (authorloop[i].textContent.search(/[^\s]/) == -1) {
			author = ZU.xpathText(authorloop[i], './following-sibling::td')
			if (author.length > 0) newItem.creators.push(ZU.cleanAuthor(cleanAuthorstring(author), "author", true));
		} else {
			break
		}
	}


	var tag1 = ZU.xpathText(doc, '//tr/td[@id="bold" and contains(text(), "Palabra Clave")]/following-sibling::td');
	if (tag1) newItem.tags.push(tag1.trim())
	var tagloop = ZU.xpath(doc, '//tr[td[@id="bold" and contains(text(), "Palabra Clave")]]/following-sibling::tr/td[1]')
	var tag;
	for (var i in tagloop) {
		if (tagloop[i].textContent.search(/[^\s]/) == -1) {
			tag = ZU.xpathText(tagloop[i], './following-sibling::td').trim()
			if (tag.length > 0) newItem.tags.push(tag);
		} else {
			break
		}
	}

	if (fulltext) {
		fulltext = fulltext.trim();
		if (fulltext.search(/\.pdf/) != -1) {
			newItem.attachments.push({
				url: fulltext,
				title: "CLASE Full Text PDF",
				mimeType: "application/pdf"
			})
		} else {
			newItem.attachments.push({
				url: fulltext,
				title: "CLASE Full Text",
				mimeType: "text/html"
			})
		}
	}
	newItem.attachments.push({
		document: doc,
		title: "CLASE Record Snapshot",
		mimeType: "text/html"
	})
	newItem.title = title;
	newItem.publication = publication;
	newItem.date = date;
	if (pages) newItem.pages = pages[1];
	if (volume) newItem.volume = volume[1];
	if (issue) newItem.issue = issue[1];
	newItem.abstractNote = abstract;
	newItem.ISSN = ISSN;
	newItem.language = language;

	newItem.complete();
}


function doWeb(doc, url) {

	var articles = new Array();
	var items = {};
	if (detectWeb(doc, url) == "multiple") {
		//this currently doesn't do anything as multiple detect is disabled
		var titles = doc.evaluate('//td/strong/a[contains(@href, "func=full-set-set")]', doc, null, XPathResult.ANY_TYPE, null);
		var next_title;
		while (next_title = titles.iterateNext()) {
			items[next_title.href] = next_title.textContent;
		}

		Zotero.selectItems(items, function (items) {
			if (!items) {
				return true;
			}
			for (var i in items) {
				articles.push(i);
			}
			Z.debug(articles)
			Zotero.Utilities.processDocuments(articles, scrape);
		})
	} else {
		scrape(doc, url);
	}
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://132.248.9.1:8991/F/J5PQFH44IIKCKQBMV1TMTSRNRXDL4BX5VRM7MKSLR453CD3951-00456?func=full-set-set&set_number=164623&set_entry=000034&format=999",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Murillo de",
						"lastName": "Aragao",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"Gobierno",
					"Partidos políticos",
					"Finanzas públicas",
					"Condiciones económicas",
					"Brasil",
					"Programa de Aceleración del Crecimiento"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "CLASE Record Snapshot",
						"mimeType": "text/html"
					}
				],
				"title": "O andamento do PAC e o ambiente pre-eleitoral",
				"publication": "Conjuntura economica (Rio de Janeiro)",
				"date": "2009",
				"pages": "34-35",
				"volume": "63",
				"issue": "6",
				"ISSN": "0010-5945",
				"language": "Portugués",
				"libraryCatalog": "CLASE"
			}
		]
	},
	{
		"type": "web",
		"url": "http://132.248.9.1:8991/F/J5PQFH44IIKCKQBMV1TMTSRNRXDL4BX5VRM7MKSLR453CD3951-01032?func=full-set-set&set_number=164623&set_entry=000016&format=999",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Marcela",
						"lastName": "Román",
						"creatorType": "author"
					},
					{
						"firstName": "F. Javier",
						"lastName": "Murillo",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"Educación básica",
					"Problemas sociales",
					"América Latina",
					"Violencia escolar",
					"Desempeño escolar",
					"Indicadores socioeconómicos"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "CLASE Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "CLASE Record Snapshot",
						"mimeType": "text/html"
					}
				],
				"title": "América Latina: violencia entre estudiantes y desempeño escolar",
				"publication": "Revista de la CEPAL",
				"date": "2011",
				"pages": "37-54",
				"issue": "104",
				"abstractNote": "Se estimó la magnitud de la violencia escolar en las escuelas latinoamericanas y su incidencia en el desempeño de los estudiantes de primaria. Se analizaron características sociodemográficas del estudiante vinculadas al maltrato entre pares. Se utilizaron modelos multinivel de cuatro y tres niveles con los datos del Segundo Estudio Regional Comparativo y Explicativo (SERCE) de la Organización de las Naciones Unidas para la Educación, la Ciencia y la Cultura (UNESCO), analizándose 2.969 escuelas, 3.903 aulas y 91.223 estudiantes de 6º grado de 16 países latinoamericanos (excluido México al relacionar violencia escolar y desempeño académico). Conclusiones: la violencia interpares es un grave problema en toda la región; los estudiantes que sufrieron violencia de sus iguales alcanzaron un desempeño en lectura y matemáticas significativamente inferior al de quienes no la experimentaron; en aulas con mayores episodios de violencia física o verbal los educandos muestran peores desempeños que en aulas con menor violencia.",
				"ISSN": "0252-0257",
				"language": "Español",
				"libraryCatalog": "CLASE",
				"shortTitle": "América Latina"
			}
		]
	}
]
/** END TEST CASES **/