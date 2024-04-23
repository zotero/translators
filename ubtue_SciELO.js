{
	"translatorID": "3eabecf9-663a-4774-a3e6-0790d2732eef",
	"label": "ubtue_SciELO",
	"creator": "Sebastian Karcher",
	"target": "^https?://(www\\.)?(socialscience\\.|proceedings\\.|biodiversidade\\.|caribbean\\.|comciencia\\.|inovacao\\.|search\\.)?(scielo|scielosp)\\.",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 99,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-04-23 13:39:09"
}

/*
	Translator
   Copyright (C) 2013 Sebastian Karcher

   This program is free software: you can redistribute it and/or modify
   it under the terms of the GNU Affero General Public License as published by
   the Free Software Foundation, either version 3 of the License, or
   (at your option) any later version.

   This program is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU Affero General Public License for more details.

   You should have received a copy of the GNU Affero General Public License
   along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

function detectWeb(doc,url) {
	if (url.indexOf("script=sci_issuetoc")!=-1 && getSearchResults(doc, true)) {
		return "multiple";
	}
	else if (ZU.xpathText(doc, '//meta[@name="citation_journal_title"]/@content')) {
		return "journalArticle";
	}
	else if (url.indexOf("search.")!=-1 && getSearchResults(doc, true)){
		return "multiple";
	}

}


function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows =  ZU.xpath(doc, '//td//tr/td');
	for (var i=0; i<rows.length; i++) {
		if (ZU.xpathText(rows[i], './/a[contains(@href, "sci_arttext")]') != null) {
		var href = ZU.xpathText(rows[i], './/a[contains(@href, "sci_arttext")]/@href');
		var title = ZU.trimInternal(ZU.xpathText(rows[i], './/font/b'));
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
		}
	}
	if (rows.length == 0) {
		//http://www.scielo.cl/scielo.php?script=sci_arttext&amp;
		let tds = ZU.xpath(doc, '//td//td');
		for (let t = 0; t < tds.length; t++) {
			let rows = ZU.xpath(tds[t], './/a[contains(@href, "http://www.scielo.cl/scielo.php?script=sci_arttext")]');
			for (let i = 0; i < rows.length; i++) {
				if (items[rows[i].href] == undefined) {
				items[rows[i].href] = ZU.trimInternal(ZU.xpathText(tds[t], './/B'));
				if (checkOnly) return true;
				found = true;
				}
			}
		}
	}
	return found ? items : false;
}


function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (!items) {
				return true;
			}
			var articles = [];
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, scrape);
		});
	}
	else {
		scrape(doc, url);
	}
}


function scrape(doc, url) {
	let abstracts = [];
	let abstract = ZU.xpathText(doc, '//div[@class="abstract"]/p[@class="sec"]/following-sibling::p[1]');
	abstracts.push(abstract);
	for (let abs of ZU.xpath(doc, '//div[@class="trans-abstract"]/p[@class="sec"]/following-sibling::p[1]')) {
		abstracts.push(abs.textContent);
	}
	// different xpath for abstractTwo
	let abstractTwo = ZU.xpathText(doc, "//*[contains(text(),'Resumen')]//following::font[1]");
	abstracts.push(abstractTwo);
	let transAbstractTwo = ZU.xpathText(doc, "//*[contains(text(),'Abstract')]//following::font[1]");
	abstracts.push(transAbstractTwo);
	let translator = Zotero.loadTranslator('web');
	//use Embedded Metadata
	translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
	translator.setDocument(doc);
	translator.setHandler('itemDone', function(obj, item) {
	if (item.language == undefined) {
		item.language = ZU.xpathText(doc, '//meta[@name="citation_pdf_url"]/@language');
		//meta xmlns="" name="citation_pdf_url" language="en"
	}
	let checkTitle = ZU.xpathText(doc, '//p[@class="title"]');
	if (item.ISSN == "0718-9273" && checkTitle && checkTitle!= item.title) {
		item.title = checkTitle;
		let transTitle = ZU.xpathText(doc, '//p[@class="trans-title"]');
		if (transTitle != null) item.notes.push("translatedTitle:" + ZU.trimInternal(transTitle));
	}
	let keywords = ZU.xpath(doc, '//*[contains(text(), "Keywords:")  or contains(text(), "Keywords") or contains(text(), "Key words") or contains(text(), "Key Words") or contains(text(), "Kew words")]/..');
	if (keywords && keywords.length > 0) {
		item.tags = keywords[0].textContent
					.trim()
					.replace(/\n/g, "")
					.replace(/ke[y|w]\s?words\s*:\s*/ig, "")
					.replace(/\.$/, "")
					.split(/;|,/)
					.map(function(x) { return x.trim(); })
					.map(function(y) { return y.charAt(0).toUpperCase() + y.slice(1); });
	}
	//keywords in other language
	let transKeywords = ZU.xpathText(doc, '//*[contains(text(),"Palabra claves") or contains(text(), "Palabras clave")]//..');
	if (transKeywords) {
		for (let t of transKeywords.split(/;|,/)) {
			item.tags.push(t
				.trim()
				.replace(/\.$/, "")
				.replace(/\.$|palabras?\s?claves?\s*:?\s*/i, "")
				.replace(/^\w/gi,function(m){ return m.toUpperCase();})
			);
		}
	}

	//deduplicate all keywords
	item.tags = [...new Set(item.tags.map(x => x))];
	item.attachments = [];
	let citationVolume = ZU.xpathText(doc, '//meta[@name="citation_volume"]/@content');
	if (item.ISSN == "0718-9273" && citationVolume.length == 0) {
		item.volume = item.issue;
		delete item.issue;
	}
	item.libraryCatalog = "SciELO"
	if (item.pages && item.pages.match(/^0/)) {
		item.pages = item.pages.replace(/^0/, '');
	}
	let trimmedCreators = [];
	for (let creator of item.creators) {
		found = false;
		for (let cre of trimmedCreators) {
			if (creator.firstName == cre.firstName && creator.lastName == cre.lastName) found = true;
		}
		if (!found) trimmedCreators.push(creator);
	}
	item.creators = trimmedCreators;
	let pid = url.match(/&pid=(.+?)&/);
	if (pid != null) {
		pid=pid[1];
		let xmlURL = 'http://www.scielo.org.za/scieloOrg/php/articleXML.php?pid=' + pid;
		ZU.doGet(xmlURL,
		function (text) {
			var parser = new DOMParser();
			var html = parser.parseFromString(text, "text/html");
			let abstract = ZU.xpath(html, '//abstract/p');
			if (abstract[0] != undefined) {
			abstract = abstract[0].innerHTML;
			abstracts.push(abstract.replace(/(<!--\[CDATA\[)|(\]\]-->)/g, ""));
			}
		let trimmedAbstracts = [];
		for (let abstract of abstracts) {
			if (abstract && abstract.length > 150) {
				abstract = ZU.trimInternal(abstract.replace(/^\s*(ABSTRACT:?|RESUMO:?|RESUMEN:?)/i, "").replace(/[\n\t]/g, ""));
				if (!trimmedAbstracts.includes(abstract)) trimmedAbstracts.push(abstract);
			}
		}
		if (trimmedAbstracts.length == 0) {
			for (let abs of ZU.xpath(doc, "//div[contains(h4,'Abstract')]/p")) {
				if (abs.textContent && abs.textContent.length > 400) {
					trimmedAbstracts.push(abs.textContent);
					}
				}
			}
		let abstractNr = 0;
		for (let abstract of trimmedAbstracts) {
			if (abstractNr == 0) item.abstractNote = abstract;
			else item.notes.push("abs:" + abstract);
			abstractNr += 1;
		}
		if (!item.abstractNote) {
			item.url = item.url.replace('sci_abstract', 'sci_arttext');
		}

		//ORICDs
		let authorsAndOrcids = ZU.xpath(doc, '//p[contains(@class, "author")]');
		for (let authorAndOrcid of authorsAndOrcids) {
			let orcid = ZU.xpathText(authorAndOrcid, './/span[contains(@class, "contribid")]');
			let author = ZU.xpathText(authorAndOrcid, './/span[contains(@class, "author-name")]');
			if (orcid && author) {
				item.notes.push({note: "orcid:" + orcid + ' | ' + author});
			}
		}

		item.complete();
		});
	}
	});
	translator.translate();
}




/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://scielo.conicyt.cl/scielo.php?script=sci_arttext&pid=S0049-34492019000400457&lng=en&nrm=iso&tlng=en",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Re-pensar el ex opere operato II: Per signa sensibilia significantur (SC 7). Quid enim?",
				"creators": [
					{
						"firstName": "Gonzalo",
						"lastName": "Guzmán",
						"creatorType": "author"
					}
				],
				"date": "12/2019",
				"DOI": "10.4067/S0049-34492019000400457",
				"ISSN": "0049-3449",
				"abstractNote": "La aproximación antropológica de Sacrosanctum concilium a la sagrada liturgia exige adentrarse en el universo del lenguaje simbólico y su proceso semiótico. Este arroja una luz importante para re-pensar el ex opere operato desprendiéndose de una visión ontológica-estática para adentrarse en la dinámica de una acción re-presentada gracias a la acción del Espíritu Santo. La reflexión semiótica del siglo pasado, especialmente en los autores estadounidenses Charles Peirce y Charles Morris, ayuda seriamente para comprender cómo los ritus et preces de la celebración litúrgica son un lugar teológico de la acción del Espíritu que posibilita el encuentro de lo humano y lo divino.",
				"issue": "4",
				"language": "es",
				"libraryCatalog": "SciELO",
				"pages": "457-474",
				"publicationTitle": "Teología y vida",
				"shortTitle": "Re-pensar el ex opere operato II",
				"url": "http://www.scielo.cl/scielo.php?script=sci_abstract&pid=S0049-34492019000400457&lng=en&nrm=iso&tlng=en",
				"volume": "60",
				"attachments": [],
				"tags": [
					{
						"tag": "Ex opere operato"
					},
					{
						"tag": "Lenguaje simbólico"
					},
					{
						"tag": "Liturgia"
					},
					{
						"tag": "Liturgy"
					},
					{
						"tag": "Performative"
					},
					{
						"tag": "Performativo"
					},
					{
						"tag": "Ritualidad"
					},
					{
						"tag": "Rituality"
					},
					{
						"tag": "Sacramentos"
					},
					{
						"tag": "Sacraments"
					},
					{
						"tag": "Semiotics"
					},
					{
						"tag": "Semiótica"
					},
					{
						"tag": "Symbolic language"
					}
				],
				"notes": [
					"abs:The anthropological approach of Sacrosanctum concilium to the sacred liturgy requires entering into the universe of symbolic language and its semiotic process. It casts an important light to re-think the ex opere operato, detaching itself from an ontological-static vision to enter into the dynamics of an action re-presented thanks to the action of the Holy Spirit. The semiotic reflection of the last century, especially in American authors Charles Peirce and Charles Morris, helps seriously to understand how the ritus et preces of the liturgical celebration are a theological place of the action of the Spirit that makes possible the encounter of the human and the divine."
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.scielo.cl/scielo.php?script=sci_arttext&pid=S0718-92732020000300151&lng=en&nrm=iso&tlng=en",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "La cultura de la paz y la tolerancia religiosa desde una perspectiva islámica",
				"creators": [
					{
						"firstName": "Abbas",
						"lastName": "Yazdani",
						"creatorType": "author"
					}
				],
				"date": "12/2020",
				"DOI": "10.4067/S0718-92732020000300151",
				"ISSN": "0718-9273",
				"abstractNote": "The subject of the culture of peace and non-violent communication is extremely important, even more so today than in the past. The contention of this paper is that Islam is a religion of tolerance, peace, and reconciliation. I shall argue that there are many principles of the culture of peace in Islam. However, this doctrine may be misunderstood in some Islamic societies due to the poor knowledge of Islamic teachings or wrong education. Therefore, we strongly need to have a true interpretation of religious teachings as well as a true approach to religious diversity to provide the culture of peace.",
				"language": "en",
				"libraryCatalog": "SciELO",
				"pages": "151-168",
				"publicationTitle": "Veritas",
				"url": "http://www.scielo.cl/scielo.php?script=sci_abstract&pid=S0718-92732020000300151&lng=en&nrm=iso&tlng=en",
				"volume": "47",
				"attachments": [],
				"tags": [
					{
						"tag": "Diversidad religiosa"
					},
					{
						"tag": "Enseñanzas religiosas"
					},
					{
						"tag": "Islam"
					},
					{
						"tag": "Paz"
					},
					{
						"tag": "Peace"
					},
					{
						"tag": "Religious diversity"
					},
					{
						"tag": "Religious teachings"
					},
					{
						"tag": "Violence"
					},
					{
						"tag": "Violencia"
					}
				],
				"notes": [
					"abs:El tema de la cultura de paz y la comunicación no violenta es sumamente importante, especialmente en la actualidad. El argumento de este artículo es que el Islam es una religión de tolerancia, paz y reconciliación. Argumentaré que hay muchos principios de la cultura de paz en el Islam. Sin embargo, esta doctrina puede malinterpretarse en algunas sociedades islámicas debido al escaso conocimiento de las enseñanzas islámicas o la educación incorrecta. Por lo tanto, necesitamos tener una verdadera interpretación de las enseñanzas religiosas, así como un verdadero enfoque de la diversidad religiosa para difundir la cultura de la paz."
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.scielo.cl/scielo.php?script=sci_arttext&pid=S0718-92732016000100002&lng=en&nrm=iso&tlng=en",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "The historical memory in the process of pastoral support to displaced persons",
				"creators": [
					{
						"firstName": "Olga Consuelo",
						"lastName": "Vélez",
						"creatorType": "author"
					},
					{
						"firstName": "Ángela María",
						"lastName": "Sierra",
						"creatorType": "author"
					},
					{
						"firstName": "Oar",
						"lastName": "Rodríguez",
						"creatorType": "author"
					},
					{
						"firstName": "Susana",
						"lastName": "Becerra",
						"creatorType": "author"
					}
				],
				"date": "03/2016",
				"DOI": "10.4067/S0718-92732016000100002",
				"ISSN": "0718-9273",
				"abstractNote": "En los procesos sociopolíticos de superación de los conflictos armados, la recuperación de la Memoria histórica está ocupando un lugar central debido al papel que está juega para una efectiva reconciliación donde la verdad, la reparación y el perdón forman parte de ese proceso. La experiencia cristiana, como comunidad de memoria tiene mucho que aportar en la medida que articule la reflexión crítica sobre qué memoria, desde dónde, desde quiénes; con el potencial liberador del Dios que se pone del lado de las víctimas y desde ellas no deja que se olvide su dolor sino que busca transformarlo. Además incorporar la perspectiva de género, permite reconocer las diferencias genéricas que influyen en la recuperación de la memoria histórica. Mostrar la relevancia de estas articulaciones, es el propósito de este artículo con la invitación a transformar la pastoral urbana que pretende acompañar a las personas en situación de desplazamiento.",
				"language": "es",
				"libraryCatalog": "SciELO",
				"pages": "33-60",
				"publicationTitle": "Veritas",
				"url": "http://www.scielo.cl/scielo.php?script=sci_abstract&pid=S0718-92732016000100002&lng=en&nrm=iso&tlng=en",
				"volume": "34",
				"attachments": [],
				"tags": [
					{
						"tag": "Desplazamiento"
					},
					{
						"tag": "Displacement"
					},
					{
						"tag": "Gender"
					},
					{
						"tag": "Género"
					},
					{
						"tag": "Memoria"
					},
					{
						"tag": "Memory"
					},
					{
						"tag": "Pastoral urbana"
					},
					{
						"tag": "Urban pastoral"
					},
					{
						"tag": "Victims"
					},
					{
						"tag": "Víctimas"
					}
				],
				"notes": [
					"abs:In socio-political processes of overcoming armed conflict, the Historical Memory is taking a central point because of the role it plays for effective reconciliation where \"truth, reparation and forgiveness\" are part of that process. Christian experience, as memory community has much to contribute to articulate the critical reflection about what memory, from where, from whom; with the liberating potential of the God who takes the side of the victims and doesn’t allow to forget them neither their pain and seeks transformation. Besides, incorporate the gender perspective, allow to recognize the gender differences and their influences in the recovery of historical memory. Show the relevance of these articulations is the purpose of this article with an invitation to transform urban pastoral in order to support displaced people."
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.scielo.cl/scielo.php?script=sci_abstract&pid=S0718-92732016000100001&lng=en&nrm=iso&tlng=es",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Entre la oscuridad y el silencio: ciegos y sordomudos en el mundo de la Biblia",
				"creators": [
					{
						"firstName": "Casas",
						"lastName": "Ramírez",
						"creatorType": "author"
					},
					{
						"firstName": "Juan",
						"lastName": "Alberto",
						"creatorType": "author"
					}
				],
				"date": "03/2016",
				"DOI": "10.4067/S0718-92732016000100001",
				"ISSN": "0718-9273",
				"abstractNote": "La condición de discapacidad es una realidad antropológica que no sólo afecta la integridad biológica de los individuos que la padecen sino también su interacción social y hasta su experiencia religiosa. Como una vía de aproximación a dicha realidad, el presente artículo propone un marco histórico-literario que permita comprender el trasfondo teológico de dos situaciones de discapacidad concretas, la ceguera y la sordera, a través de un estudio sobre tales condiciones en las tradiciones bíblicas y extra-bíblicas y en la literatura judía y greco-romana contemporánea a la redacción del Nuevo Testamento.",
				"language": "es",
				"libraryCatalog": "SciELO",
				"pages": "9-32",
				"publicationTitle": "Veritas",
				"shortTitle": "Entre la oscuridad y el silencio",
				"url": "http://www.scielo.cl/scielo.php?script=sci_abstract&pid=S0718-92732016000100001&lng=en&nrm=iso&tlng=es",
				"volume": "34",
				"attachments": [],
				"tags": [
					{
						"tag": "Antropología bíblica"
					},
					{
						"tag": "Ceguera en la Biblia"
					},
					{
						"tag": "Discapacidad en la Biblia"
					},
					{
						"tag": "Enfermedad en la Biblia"
					},
					{
						"tag": "Sordera en la Biblia curación en la Biblia"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.scielo.cl/scielo.php?script=sci_arttext&pid=S0718-92732016000100006&lng=en&nrm=iso&tlng=es",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Metaphysical presuppositions for a sound critical historiography applied to the biblical text",
				"creators": [
					{
						"firstName": "Carlos",
						"lastName": "Casanova",
						"creatorType": "author"
					}
				],
				"date": "03/2016",
				"DOI": "10.4067/S0718-92732016000100006",
				"ISSN": "0718-9273",
				"abstractNote": "Trata sobre los presupuestos metafísicos de aceptar la Biblia como Palabra de Dios. En particular, trata sobre la posibilidad de las intervenciones divinas, de los milagros y profecías. Responde al argumento de Hobbes por el determinismo, al principio de la clausura causal del mundo, a la crítica de Hume a la posibilidad de probar un milagro y a la negación de las profecías.",
				"language": "es",
				"libraryCatalog": "SciELO",
				"pages": "117-143",
				"publicationTitle": "Veritas",
				"url": "http://www.scielo.cl/scielo.php?script=sci_abstract&pid=S0718-92732016000100006&lng=en&nrm=iso&tlng=es",
				"volume": "34",
				"attachments": [],
				"tags": [
					{
						"tag": "Biblia"
					},
					{
						"tag": "Historicidad del Nuevo Testamento"
					},
					{
						"tag": "Intervenciones divinas"
					},
					{
						"tag": "Milagros"
					},
					{
						"tag": "Profecías"
					}
				],
				"notes": [
					"abs:This paper deals with the metaphysical presuppositions which underlie the acceptance of the Bible as the Word of God. In particular, it deals with the possibility of divine interventions, miracles and prophecies. It answers to the Hobbesian argument for determinism, to the principle of the causal closure of the world, to Hume’s criticism of the possibility to prove miracles and to the negation of prophecies."
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.scielo.org.za/scielo.php?script=sci_issuetoc&pid=1011-760120210002&lng=en&nrm=iso",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.scielo.cl/scielo.php?script=sci_abstract&pid=S0718-92732023000200009&lng=en&nrm=iso&tlng=en",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Ausencia y presencia de Dios después de Auschwitz a través de la visión de Emmanuel Levinas",
				"creators": [
					{
						"firstName": "Fredy",
						"lastName": "Parra",
						"creatorType": "author"
					}
				],
				"date": "08/2023",
				"DOI": "10.4067/S0718-92732023000200009",
				"ISSN": "0718-9273",
				"abstractNote": "This article investigates the presence and absence of God in and after Auschwitz in the thought of the Jewish philosopher Emmanuel Levinas (1906-1995). Analyzing especially the author's Jewish writings published in the post-Auschwitz period, after the horror of the Holocaust, it shows how God responds to the cry of the innocent and suffering by establishing an adult relationship that respects human freedom and founds an infinite responsibility. The article emphasizes the bond between God and the human being, which is mediated by the experience of fidelity to the Torah, and that God's revelation, essentially a commandment, implies unavoidable obedience. Finally, it stresses that the critical content of divine revelation is \"thou shalt not kill,\" to promote and defend the integral life of others in all circumstances, exercising responsibility and striving for authentic social justice.",
				"language": "es",
				"libraryCatalog": "SciELO",
				"pages": "9-29",
				"publicationTitle": "Veritas",
				"url": "http://www.scielo.cl/scielo.php?script=sci_abstract&pid=S0718-92732023000200009&lng=en&nrm=iso&tlng=es",
				"volume": "55",
				"attachments": [],
				"tags": [
					{
						"tag": "Ethics"
					},
					{
						"tag": "Law"
					},
					{
						"tag": "Memory"
					},
					{
						"tag": "Obedience"
					},
					{
						"tag": "Other"
					},
					{
						"tag": "Responsibility"
					},
					{
						"tag": "Revelation"
					},
					{
						"tag": "Suffering"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
