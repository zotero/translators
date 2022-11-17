{
	"translatorID": "b2fcf7d9-e023-412e-a2bc-f06d6275da24",
	"label": "ubtue_Brill",
	"creator": "Madeesh Kannan",
	"target": "^https?://brill.com/(view|abstract)/journals/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 90,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-11-17 08:50:23"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2019 Universitätsbibliothek Tübingen.  All rights reserved.

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

	***** END LICENSE BLOCK *****
*/


function detectWeb(doc, url) {
	if (url.match(/article-.+\.xml$/)) {
		return "journalArticle";
	} else if (url.match(/issue-\d+(-\d+)?\.xml$/)) {
		return "multiple";
 	}
	return false;
}

function getSearchResults(doc) {
	let items = {};
	let found = false;
	let links = doc.querySelectorAll(".c-Typography--title");
	let usesTypography = !!links.length;
	if (!usesTypography) {
		links = doc.querySelectorAll(".c-Button--link, [target='_self']");
	}
	let text = usesTypography ?
			doc.querySelectorAll(".c-Typography--title > span") :
			doc.querySelectorAll(".c-Button--link, [target='_self']");
	for (let i = 0; i < links.length; ++i) {
		let href = links[i].href;
		let title = ZU.trimInternal(text[i].textContent);
		if (!href || !title) continue;
		if (!href.match(/article-.+\.xml$/))
			continue;

		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function postProcess(doc, item) {
	let title = ZU.xpathText(doc, '//meta[@name="citation_title"]//@content');
	if (title) item.title = title;
	let abstracts = ZU.xpath(doc, '//section[@class="abstract"]//p');
	//multiple abstracts
	if (abstracts && abstracts.length > 0) {
	// Deduplicate original results
	abstracts = [...new Set(abstracts.map(abstract => abstract.textContent))];
	item.abstractNote = abstracts[0].trim().replace(/^(Résumé\s?)/i, "");
		if (abstracts.length > 1) {
			for (let abs of abstracts.slice(1)) {
					  item.notes.push({
		 			 note: "abs:" + ZU.trimInternal(abs),
		 	  });
			}
		}
	}

	// i set 100 as limit of string length, because usually a string of a pseudoabstract has less then 150 character e.g. "abstractNote": "\"Die Vernünftigkeit des jüdischen Dogmas\" published on 05 Sep 2020 by Brill."
	if (item.abstractNote.length < 100) delete item.abstractNote;

	item.tags = ZU.xpath(doc, '//dd[contains(@class, "keywords")]//a');
	if (item.tags) {
		let allTags = item.tags.map(i => i.textContent.trim());
		//deduplicate allTags
		item.tags = Array.from(new Set(allTags.map(JSON.stringify))).map(JSON.parse);
	}
	for (let tag of ZU.xpath(doc, '//meta[@property="article:tag"]/@content')) {
		if (!item.tags.includes(tag.textContent)) item.tags.push(tag.textContent);
	}
	let reviewEntry = text(doc, '.articlecategory');
	if (reviewEntry && reviewEntry.match(/book\sreview/i)) item.tags.push('Book Review');
	// numbering issues with slash due to cataloguing rule
	if (item.issue) item.issue = item.issue.replace('-', '/');
	let date = item.date;
	//entry for scraping Berichtsjahr
	let dateEntry = ZU.xpathText(doc, '//div[@class="cover cover-image configurable-index-card-cover-image"]//@title');
	let berichtsjahr = extractBerichtsjahr(dateEntry);
	let erscheinungsjahr = extractErscheinungsjahr(date);
	if (erscheinungsjahr !== berichtsjahr) {
		item.date = extractBerichtsjahr(dateEntry);
	} else {
		item.date;
	}

	//scrape ORCID from website
	let authorSectionEntries = doc.querySelectorAll('.text-subheading span');
	for (let authorSectionEntry of authorSectionEntries) {
		let authorInfo = authorSectionEntry.querySelector('.c-Button--link');
		let orcidHref = authorSectionEntry.querySelector('.orcid');
		if (authorInfo && orcidHref) {
			let author = authorInfo.childNodes[0].textContent;
			let orcid = orcidHref.textContent.replace(/.*(\d{4}-\d+-\d+-\d+x?)$/i, '$1');
			item.notes.push({note: "orcid:" + orcid + ' | ' + author});
		}
	}
	//delete symbols in names
	for (let i in item.creators) {
		item.creators[i].lastName = item.creators[i].lastName.replace('†', '');
		item.creators[i].firstName = item.creators[i].firstName.replace('†', '');
	}
	//deduplicate
	item.notes = Array.from(new Set(item.notes.map(JSON.stringify))).map(JSON.parse);
	// mark articles as "LF" (MARC=856 |z|kostenfrei), that are published as open access
	let openAccessTag = text(doc, '.has-license span');
	if (openAccessTag && openAccessTag.match(/open\s+access/gi)) item.notes.push({note: 'LF:'});
  // mark articles as "LF" (MARC=856 |z|kostenfrei), that are free accessible e.g. conference report 10.30965/25890433-04902001
	let freeAccess = text(doc, '.color-access-free');
	if (freeAccess && freeAccess.match(/(free|freier)\s+(access|zugang)/gi)) item.notes.push('LF:');
	if (!item.itemType)	item.itemType = "journalArticle";
}

function extractErscheinungsjahr(date) {
	return date ? date.trim().match(/\d{4}/)[0] : '';
}

function extractBerichtsjahr(dateEntry) {
	let dateCandidate = dateEntry.match(/\(\s*(\d{4})\s*\):/);
	return dateCandidate.length > 1 ? dateCandidate[1] : null;
}

function invokeEmbeddedMetadataTranslator(doc, url) {
	if (doc.querySelector('body > meta')) {
	// Brill's HTML is structured incorrectly, and it causes some parsers
	// to interpret the <meta> tags as being in the body, which breaks EM.
	// We'll fix it here.
		for (let meta of doc.querySelectorAll('body > meta')) {
			doc.head.appendChild(meta);
		}
	}

	var translator = Zotero.loadTranslator("web");
	// Embedded Metadata
	translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
	translator.setDocument(doc);
	translator.setHandler("itemDone", function (t, i) {
		postProcess(doc, i);
		i.complete();
	});
	translator.translate();
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) === "multiple") {
		Zotero.selectItems(getSearchResults(doc), function (items) {
			if (!items) {
				return true;
			}
			var articles = [];
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, invokeEmbeddedMetadataTranslator);
		});
	} else
		invokeEmbeddedMetadataTranslator(doc, url);
}

	/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://brill.com/view/journals/ormo/100/2/article-p147_2.xml",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "‘Our Traditions Will Kill Us!’: Negotiating Marriage Celebrations in the Face of Legal Regulation of Tradition in Tajikistan",
				"creators": [
					{
						"firstName": "Elena",
						"lastName": "Borisova",
						"creatorType": "author"
					}
				],
				"date": "2020",
				"DOI": "10.1163/22138617-12340248",
				"ISSN": "2213-8617, 0030-5472",
				"abstractNote": "Based on extensive ethnographic research in northern Tajikistan, this article examines the implications of the law ordering traditions and rituals (tanzim), including marriage celebrations, in Tajikistan. At the centre of my analysis is the figure of a state employed ‘worker of culture’, Farkhod, whose family was affected by recent, rather militant, attempts by the state to regulate tradition. By following the story of his daughter’s wedding, I analyse how Farkhod tries to reconcile his roles of a caring father, a respectful community member, and a law-abiding citizen. I argue that the tanzim exacerbates the mismatch between the government’s attempts to impose a rigid notion of tradition and promote the idea of a certain kind of modern citizen, and people’s own understandings of being a modern and moral person having a good wedding.",
				"issue": "2",
				"language": "eng",
				"libraryCatalog": "brill.com",
				"pages": "147-171",
				"publicationTitle": "Oriente Moderno",
				"shortTitle": "‘Our Traditions Will Kill Us!’",
				"url": "https://brill.com/view/journals/ormo/100/2/article-p147_2.xml",
				"volume": "100",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Tajikistan"
					},
					{
						"tag": "law"
					},
					{
						"tag": "marriage"
					},
					{
						"tag": "modernity"
					},
					{
						"tag": "tradition"
					}
				],
				"notes": [
					{
						"note": "LF:"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://brill.com/view/journals/ormo/100/2/article-p172_3.xml",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Alignment and Alienation: The Ambivalent Modernisations of Uyghur Marriage in the 21st Century",
				"creators": [
					{
						"firstName": "Rune",
						"lastName": "Steenberg",
						"creatorType": "author"
					},
					{
						"firstName": "",
						"lastName": "Musapir",
						"creatorType": "author"
					}
				],
				"date": "2020",
				"DOI": "10.1163/22138617-12340247",
				"ISSN": "2213-8617, 0030-5472",
				"abstractNote": "Uyghur marriages in Xinjiang in the 2010s have been characterised by various, sometimes seemingly contradictory trends of modernisation, such as monetisation, simplification, emphasis on ethnic symbolism, displays of piety and the active integration of both Turkish, Western and Chinese elements. This article views these trends as complex, inter-related reactions to the region’s socio-economic transformations and political campaigns. It analyses how these transformations and campaigns affect everyday decisions at the local level. The study of marriage provides a good insight into the effects of economic and political transformations on the ground. In such studies, we argue for a distinction between trends on the level of symbolic positioning and identity display from trends on a deeper structural level pertaining to social relations, economic integration and household strategies. In the case of Uyghurs in southern Xinjiang these two levels have shown opposite trends. On a surface level of symbolic display, the relatively open years of 2010-2014 allowed for the flourishing of trends that did not follow the Party-State line, such as Islamic piety and a strengthened Uyghur ethno-national identity. Yet, on a deeper structural level these trends signified improved integration into modern Chinese society. In contrast, the increased state violence of 2015-2020 enforced a strong symbolic alignment with Chinese Communist Party (CCP) ideology but at the same time alienated the Uyghur population from this society effectively necessitating the development of forms of organisation that the CCP deems backwards and undesirable.",
				"issue": "2",
				"language": "eng",
				"libraryCatalog": "brill.com",
				"pages": "172-199",
				"publicationTitle": "Oriente Moderno",
				"shortTitle": "Alignment and Alienation",
				"url": "https://brill.com/view/journals/ormo/100/2/article-p172_3.xml",
				"volume": "100",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Uyghur"
					},
					{
						"tag": "Xinjiang"
					},
					{
						"tag": "commercialisation"
					},
					{
						"tag": "marriage"
					},
					{
						"tag": "modernisation"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://brill.com/view/journals/ormo/100/2/ormo.100.issue-2.xml",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://brill.com/view/journals/orie/49/3-4/article-p370_7.xml",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Le mal subi, le mal rendu. Une lecture anthropologique des pratiques de lamentations et de malédictions dans le shiʿisme populaire iranien",
				"creators": [
					{
						"firstName": "Sepideh",
						"lastName": "Parsapajouh",
						"creatorType": "author"
					}
				],
				"date": "2021/11/18",
				"DOI": "10.1163/18778372-12340005",
				"ISSN": "0078-6527, 1877-8372",
				"abstractNote": "Dans le shiʿisme duodécimain iranien, deux catégories de traditions populaires (comprenant rituels, pratiques et croyances) ont pris forme au cours du temps autour de la question du mal, précisément des souffrances et de la mort subies par les personnes de la famille du Prophète (ahl al-bayt). La première catégorie comprend les expressions poétiques élégiaques (marṯīya) accompagnées de pratiques reflétant la passion et la compassion pour les victimes de la mort injuste, à commencer par le troisième imam Ḥusayn. La seconde catégorie comprend de violentes expressions satiriques de malédiction adressées aux auteurs de ce mal. Cette tradition mobilise aussi la récitation de prières et de formules dévotionnelles tirées du corpus scripturaire sacré, ainsi qu’un ensemble de pratiques particulières appelées ʿUmar-košī (« le meurtre de ʿUmar »). Cet article propose d’analyser la formation et la fonction de ces deux traditions, ainsi que l’évolution de leur forme et de leur signification dans le contexte social du shiʿisme iranien contemporain. Il montrera que ces deux traditions, tout en étant cohérentes avec le double principe shiʿite de tawallāʾ (loyauté et amour pour les imams) et tabarrāʾ (dissociation et haine à l’égard de leurs adversaires), reflètent clairement l’autonomie des croyants vis-à-vis du pouvoir politique comme de l’autorité religieuse institutionnelle.",
				"issue": "3/4",
				"language": "fre",
				"libraryCatalog": "brill.com",
				"pages": "370-397",
				"publicationTitle": "Oriens",
				"url": "https://brill.com/view/journals/orie/49/3-4/article-p370_7.xml",
				"volume": "49",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Shiʿisme duodécimain"
					},
					{
						"tag": "Ziyārat ʿĀšūrā"
					},
					{
						"tag": "chant élégiaque (nawḥa)"
					},
					{
						"tag": "religion populaire"
					},
					{
						"tag": "satire (haǧw)"
					},
					{
						"tag": "élégie (marṯīya)"
					},
					{
						"tag": "ʿUmar-košī"
					}
				],
				"notes": [
					{
						"note": "abs:In Iranian Twelver Shiʿism, two categories of popular traditions (including rituals, practices and beliefs) have taken shape over time around the issue of evil, namely the harm and death suffered by the holy figures of the house of the Prophet (ahl al-bayt). The first category includes elegiac poetic expressions (marṯīya), accompanied by ritual practices reflecting passion and compassion for the victims of unjust death – notably the third imam, Ḥusayn. The second category includes violent and satirical expressions of maledictions, addressed to the authors of this evil. This tradition also involves the recitation of prayers and devotional formulas borrowed from the sacred scriptural corpus as well as particular practices called ʿUmar-košī (the murder of ʿUmar). This article offers an analysis of the formation and function of these two traditions, as well as the development of their form and meaning in the social context of contemporary Iranian Shiʿism. It shows that, by being in line with the double Shiʿi principle of tawallāʾ (loyalty and love towards the Imams) and tabarrāʾ (dissociation and hatred towards the enemies of the Imams), these two traditions clearly reflect the autonomy of the believers vis-à-vis both political power and institutional religious authority."
					},
					{
						"note": "orcid:0000-0002-3202-386X | Sepideh Parsapajouh"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://brill.com/view/journals/orie/49/3-4/orie.49.issue-3-4.xml",
		"items": "multiple"
	}
]
/** END TEST CASES **/
